/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record','N/search','N/runtime','N/file','N/email','N/log'],
 (record, search, runtime, file, email, log) => {

  // =============================== Constantes ===============================
  const LOT_REC     = 'customrecord_ht_pe_fi_lote';
  const FLD_ESTADO  = 'custrecord_ht_pe_estado';
  const FLD_PROCESO = 'custrecord_ht_pe_proceso';
  const FLD_PARAMS  = 'custrecord_ht_pe_params';
  const FLD_TOTAL   = 'custrecord_ht_pe_total';
  const FLD_OK      = 'custrecord_ht_pe_ok';
  const FLD_ERR     = 'custrecord_ht_pe_err';
  const FLD_OUTFILE = 'custrecord_ht_pe_outputfile';        // JSON resultados (ok/err)
  const FLD_OUTFILE_FIN = 'custrecord_ht_pe_outputfile_fin'; // JSON con IDs de FI emitidas (array plano)

  const ESTADO = { COMPLETADO:1, ERROR:2, PENDIENTE:3, PROCESANDO:4 };

  // Custom transaction de "Factura Interna"
  const TO_TYPE_INTERNAL_INVOICE = 'customsale_ec_factura_interna';

  // Carpeta de salida por defecto
  const DEFAULT_OUTPUT_FOLDER_ID = 121602;

  // Email fijo
  const EMAIL_EMPLOYEE_ID = 49599;

  // =============================== Helpers ===============================
  const isSandbox = () => (runtime.accountId || '').toUpperCase().indexOf('_SB') >= 0;

  function toIntSafe(v){ return Number(String(v || '').replace(/,/g,'').trim()) || 0; }

  function getParamAny(cs, names){
    for (let i=0;i<names.length;i++){
      const v = cs.getParameter({ name:names[i] });
      if (v !== null && v !== '' && typeof v !== 'undefined') return v;
    }
    return null;
  }

  function yyyymmdd (d=new Date()){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}${m}${day}`;
  }

  function saveJson (obj, baseName, folderId) {
    const fid = toIntSafe(folderId);
    if (!fid) throw new Error('INVALID_OUTPUT_FOLDER: folderId=0/NaN.');
    const f = file.create({
      name: `${baseName}_${yyyymmdd()}.json`,
      fileType: file.Type.JSON,
      contents: JSON.stringify(obj),
      folder: fid,
      isOnline: false
    });
    return f.save();
  }

  function looksTransient (e) {
    const m = (e?.message||'').toLowerCase();
    const n = (e?.name||'').toLowerCase();
    return m.includes('record is locked') ||
           m.includes('usage') ||
           m.includes('sss_usage_limit_exceeded') ||
           m.includes('unexpected error') ||
           n.includes('sss_usage_limit_exceeded');
  }

  function normalizeVoidMode(modeRaw){
    const m = (modeRaw || 'AUTO').toString().trim().toUpperCase();
    if (m === 'AUTO') return isSandbox() ? 'DELETE' : 'VOID';
    if (['DELETE','VOID','CANCEL'].indexOf(m) >= 0) return m;
    return isSandbox() ? 'DELETE' : 'VOID';
  }

  // =============================== getInputData ===============================
  function getInputData () {
    const cs = runtime.getCurrentScript();

    // 1) Lote ID (acepta ambos nombres de parámetro)
    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    let   OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id','custscript_ht_pe_output_folder_id_1']));
    const RETRY_SOFT_MAX   = Math.max(0, toIntSafe(getParamAny(cs, ['custscript_ht_pe_retry_soft_max','custscript_ht_pe_retry_soft_max_1'])) || 1);
    const VOID_MODE        = normalizeVoidMode(getParamAny(cs, ['custscript_ht_pe_void_mode']));

    if (!LOTE_ID) {
      // Mensaje claro para cuando el Suitelet (o el deployment) no envían el parámetro correcto
      throw new Error('MISSING_PARAM: custscript_ht_pe_lote_id (o _1) no recibido por el MR VOID.');
    }
    if (!OUTPUT_FOLDER_ID) OUTPUT_FOLDER_ID = DEFAULT_OUTPUT_FOLDER_ID;

    // 2) Carga del lote y marca PROCESANDO
    const lote = record.load({ type: LOT_REC, id: LOTE_ID });
    lote.setValue({ fieldId: FLD_ESTADO, value: ESTADO.PROCESANDO });
    lote.save({ enableSourcing:true, ignoreMandatoryFields:true });

    // 3) Fuente PRINCIPAL: archivo del campo custrecord_ht_pe_outputfile_fin
    let ids = [];
    const fileIdFin = toIntSafe(lote.getValue(FLD_OUTFILE_FIN));
    if (fileIdFin) {
      try {
        const f = file.load({ id: fileIdFin });
        const content = f.getContents() || '[]';
        const parsed  = JSON.parse(content);
        // Debe ser un array plano tipo [2963202]
        if (Array.isArray(parsed)) {
          ids = parsed.map(Number).filter(n => !!n);
        } else if (parsed && Array.isArray(parsed.ids)) {
          // Compatibilidad por si viniera con { ids: [...] }
          ids = parsed.ids.map(Number).filter(n => !!n);
        }
      } catch (e) {
        log.error('read_outfile_fin_error', { fileIdFin, e });
        // si falla, caemos a la compatibilidad antigua
      }
    }

    // 4) Compatibilidad antigua (si no hubo OUTFILE_FIN o fue inválido): usar params del lote
    if (!ids.length) {
      try {
        const params = JSON.parse(lote.getValue(FLD_PARAMS) || '{}');
        ids = resolveInputIdsFallback(params);
      } catch (e) {
        log.error('params_fallback_error', e);
      }
    }

    // 5) Actualiza TOTAL
    try {
      record.submitFields({
        type: LOT_REC, id: LOTE_ID,
        values: { [FLD_TOTAL]: ids.length }
      });
    } catch (e) {
      log.error('submit_total_error', e);
    }

    const meta = { RETRY_SOFT_MAX, OUTPUT_FOLDER_ID, VOID_MODE, LOTE_ID };
    return ids.map(id => ({ id:Number(id), retry:0, meta }));
  }

  // =============================== Resolver IDs (Compatibilidad) ===============================
  function resolveInputIdsFallback (params) {
    const source = (params?.source || '').toUpperCase();

    // JSON genérico del parámetro del lote (usado antiguamente)
    if (source === 'JSON') {
      const fid = toIntSafe(params?.jsonFileId || 0);
      if (!fid) return [];
      const f = file.load({ id: fid });
      const parsed = JSON.parse(f.getContents() || '[]');
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.ids) ? parsed.ids : []);
      return arr.map(Number).filter(n => !!n);
    }

    // Saved Search
    if (source === 'SAVEDSEARCH') {
      const ssid = params?.savedSearchId;
      if (!ssid) return [];
      const s = search.load({ id: ssid });
      const out = [];
      s.run().each(r => { out.push(Number(r.id)); return true; });
      return out;
    }

    // Filtros (fallback final) — no recomendado para VOID, pero lo dejamos por compatibilidad
    const f = params?.filters || {};
    const filtros = [['recordtype','is',TO_TYPE_INTERNAL_INVOICE],'AND',['mainline','is','T']];
    if (f.desde && f.hasta) filtros.push('AND',['trandate','within',f.desde,f.hasta]);
    if (f.cliente)          filtros.push('AND',['entity','anyof', String(f.cliente)]);
    if (f.osTranId)         filtros.push('AND',['tranid','is', f.osTranId]);

    const out = [];
    search.create({ type:'transaction', filters:filtros, columns:['internalid'] })
      .run().each(r => { out.push(Number(r.id)); return true; });
    return out;
  }

  // =============================== map ===============================
  function map (ctx) {
    const item     = JSON.parse(ctx.value);
    const invId    = Number(item.id);
    const attempt  = Number(item.retry) || 0;
    const maxRetry = Number(item.meta?.RETRY_SOFT_MAX || 1);
    const mode     = item.meta?.VOID_MODE || 'VOID';

    try {
      const res = voidInternalInvoice(invId, mode);
      ctx.write('ok', JSON.stringify({ invoiceId:invId, action:res.action, msg:'OK' }));
    } catch (e) {
      if (looksTransient(e) && attempt < maxRetry) {
        try {
          const res = voidInternalInvoice(invId, mode);
          ctx.write('ok', JSON.stringify({ invoiceId:invId, action:res.action, msg:'OK (retry)' }));
          return;
        } catch (e2) {
          ctx.write('err', JSON.stringify({ invoiceId:invId, code:e2.name||'ERR', msg:e2.message||String(e2) }));
          return;
        }
      }
      ctx.write('err', JSON.stringify({ invoiceId:invId, code:e.name||'ERR', msg:e.message||String(e) }));
    }
  }

  // =============================== summarize ===============================
  function summarize (summary) {
    const cs = runtime.getCurrentScript();

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    const OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id','custscript_ht_pe_output_folder_id_1'])) || DEFAULT_OUTPUT_FOLDER_ID;

    const ok = [], err = [];
    summary.output.iterator().each((k,v)=>{
      (k === 'ok' ? ok : err).push(JSON.parse(v));
      return true;
    });

    // Genera archivo de resultados
    let fileId = null, estadoFinal = ESTADO.COMPLETADO;
    try {
      fileId = saveJson(
        { ok, err, total: ok.length + err.length, finishedAt: new Date().toISOString() },
        `fi_void_lote_${LOTE_ID || 'NA'}`,
        OUTPUT_FOLDER_ID
      );
    } catch (e) {
      estadoFinal = ESTADO.ERROR;
      log.error('saveJsonError', e);
    }

    if (!LOTE_ID) {
      log.error('summarizeSkip','Se omite update/email porque Lote ID no fue enviado.');
      return;
    }

    // Actualiza el lote
    try {
      record.submitFields({
        type: LOT_REC, id: LOTE_ID,
        values: {
          [FLD_OK]: ok.length,
          [FLD_ERR]: err.length,
          [FLD_OUTFILE]: fileId || null,
          [FLD_ESTADO]: estadoFinal
        }
      });
    } catch (e) {
      log.error('submitFieldsError', e);
    }

    // Email (autor y receptor 49599)
    try {
      const subject = `HT PE – Anulación finalizada (Lote ${LOTE_ID})`;
      const body    = `Total: ${ok.length+err.length}\nOK: ${ok.length}\nERR: ${err.length}\nArchivo: ${fileId || '(no generado)'}`;
      const attachments = fileId ? [ file.load({ id:fileId }) ] : [];
      email.send({ author: EMAIL_EMPLOYEE_ID, recipients: [EMAIL_EMPLOYEE_ID], subject, body, attachments });
    } catch(e){
      log.error('emailError', e);
    }

    if (summary.inputSummary.error) log.error('inputSummary', summary.inputSummary.error);
    summary.mapSummary.errors.iterator().each((k, e) => { log.error('mapError', `key ${k} error ${e}`); return true; });
  }

  // =============================== Lógica de anulación ===============================
  function voidInternalInvoice (invId, mode) {
    const rec = record.load({ type: TO_TYPE_INTERNAL_INVOICE, id: invId });

    switch (mode) {
      case 'DELETE': {
        record.delete({ type: TO_TYPE_INTERNAL_INVOICE, id: invId });
        return { action:'DELETE' };
      }
      case 'CANCEL': {
        // Mantener no soportado (a menos que tu transacción soporte transición de estado)
        throw new Error('CANCEL_NOT_SUPPORTED: Este tipo no soporta cambio de estado por script.');
      }
      case 'VOID':
      default: {
        // Intento de “void” por campo si existiese
        const fields = rec.getFields() || [];
        if (fields.indexOf('void') >= 0) {
          rec.setValue({ fieldId: 'void', value: true });
          rec.save({ enableSourcing:true, ignoreMandatoryFields:false });
          return { action:'VOID' };
        }
        // Fallback en sandbox
        if (isSandbox()) {
          record.delete({ type: TO_TYPE_INTERNAL_INVOICE, id: invId });
          return { action:'DELETE_FALLBACK' };
        }
        throw new Error('VOID_NOT_SUPPORTED: No existe campo "void" y no se permite DELETE en producción.');
      }
    }
  }

  // =============================== Exports ===============================
  return { getInputData, map, summarize };
});
