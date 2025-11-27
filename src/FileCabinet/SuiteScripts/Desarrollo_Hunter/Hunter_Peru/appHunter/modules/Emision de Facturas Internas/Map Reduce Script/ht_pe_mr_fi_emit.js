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
  const FLD_OUTFILE = 'custrecord_ht_pe_outputfile';          // JSON con resumen completo (tranids)
  const FLD_OUTFILE_FIN = 'custrecord_ht_pe_outputfile_fin';  // JSON con SOLO IDs de FIN (array plano)

  const ESTADO = { COMPLETADO:1, ERROR:2, PENDIENTE:3, PROCESANDO:4 };

  // Tipos de transacción
  const FROM_TYPE_SOURCE         = 'salesorder';
  const TO_TYPE_INTERNAL_INVOICE = 'customsale_ec_factura_interna';

  // Carpeta de salida por defecto
  const DEFAULT_OUTPUT_FOLDER_ID = 121602;

  // Email fijo (autor y receptor = 49599)
  const EMAIL_EMPLOYEE_ID = 49599;

  // Campos de vínculo / cuota en Factura Interna
  const FLD_CREATED_FROM_FI = 'custbody_ec_created_from_fac_int';
  const FLD_CUOTA_NUM       = 'custbody_ec_nro_cuota_fac_int';

  // =============================== Helpers ===============================
  function toIntSafe(v){
    return Number(String(v || '').replace(/,/g,'').trim()) || 0;
  }

  function round2(v){
    const n = Number(v) || 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function getParamAny(cs, names){
    for (let i=0;i<names.length;i++){
      const v = cs.getParameter({ name:names[i] });
      if (v !== null && v !== '' && typeof v !== 'undefined') return v;
    }
    return null;
  }

  function normalizeDate(v){
    if (!v) return null;

    // Ya es Date
    if (v instanceof Date) return v;

    const s = String(v).trim();
    if (!s) return null;

    // yyyy-mm-dd o ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // dd/mm/yyyy
    const partsSlash = s.split('/');
    if (partsSlash.length === 3){
      const [dStr, mStr, yStr] = partsSlash;
      const d = parseInt(dStr,10);
      const m = parseInt(mStr,10);
      const y = parseInt(yStr,10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)){
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }

    // Fallback genérico
    const t = Date.parse(s);
    return isNaN(t) ? null : new Date(t);
  }
   
  function yyyymmdd (d=new Date()){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}${m}${day}`;
  }

  function saveJson (obj, baseName, folderId) {
    const fid = toIntSafe(folderId);
    if (!fid) throw new Error('INVALID_OUTPUT_FOLDER: folderId=0/NaN. Revisa parámetro del deployment.');
    const f = file.create({
      name: `${baseName}_${yyyymmdd()}.json`,
      fileType: file.Type.JSON,
      contents: JSON.stringify(obj),
      folder: fid,
      isOnline: false
    });
    return f.save();
  }

  function saveJsonRaw (jsonString, baseName, folderId) {
    const fid = toIntSafe(folderId);
    if (!fid) throw new Error('INVALID_OUTPUT_FOLDER: folderId=0/NaN. Revisa parámetro del deployment.');
    const f = file.create({
      name: `${baseName}_${yyyymmdd()}.json`,
      fileType: file.Type.JSON,
      contents: jsonString,
      folder: fid,
      isOnline: false
    });
    return f.save();
  }

  function looksTransient (e) {
    const m = (e && e.message || '').toLowerCase();
    const n = (e && e.name || '').toLowerCase();
    return m.includes('record is locked') ||
           m.includes('usage') ||
           m.includes('sss_usage_limit_exceeded') ||
           m.includes('unexpected error') ||
           n.includes('sss_usage_limit_exceeded');
  }

  function setIfHasField(rec, fieldId, value){
    try{
      const fields = rec.getFields ? rec.getFields() : [];
      if (fields && fields.indexOf(fieldId) >= 0){
        rec.setValue({ fieldId, value });
      } else {
        log.debug('setIfHasFieldSkip', 'Campo no disponible en FI: '+fieldId);
      }
    }catch(e){
      log.error('setIfHasFieldError', { fieldId, err: e });
    }
  }

  function lookupTranId(type, id){
    const info = search.lookupFields({ type, id, columns: ['tranid'] });
    return (info && info.tranid) ? String(info.tranid) : '';
  }

  function chunk(arr, size){
    const out=[]; 
    for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); 
    return out;
  }

  /**
   * Devuelve un Set con los SO IDs que YA tienen al menos una FI (mainline) creada (createdfrom).
   */
  function findSoIdsWithExistingFIN(soIds){
    const set = new Set();
    if (!soIds || !soIds.length) return set;

    const batches = chunk(soIds.map(String), 1000);
    for (let b=0; b<batches.length; b++){
      const s = search.create({
        type: 'transaction',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','T'],'AND',
          ['createdfrom','anyof', batches[b]]
        ],
        columns: [ search.createColumn({ name:'createdfrom' }) ]
      });
      s.run().each(r=>{
        const cf = Number(r.getValue('createdfrom'));
        if (cf) set.add(cf);
        return true;
      });
    }
    return set;
  }

  /**
   * Suma meses manteniendo el día (lo más posible).
   * Base para las cuotas: mismos días en meses siguientes.
   */
  function addMonthsKeepDay(date, months){
    const d = new Date(date.getTime());
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) {
      // Ajuste para meses con menos días (ej: 31 → 30/28)
      d.setDate(0);
    }
    return d;
  }

  /**
   * Suma días.
   */
  function addDays(date, days){
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Obtiene info de plan de facturación para una SO:
   * - baseDate: fecha base para cuota 1 (usa trandate/startdate o override del lote)
   */
  function getBillingPlanForSO(soId, overrideTranDate){
    let baseDate = new Date();
    let soRec = null;

    const overrideDateObj = normalizeDate(overrideTranDate);
    const hasOverride = !!overrideDateObj;

    try {
      soRec = record.load({ type: FROM_TYPE_SOURCE, id: soId, isDynamic: false });

      if (!hasOverride){
        const tdVal = soRec.getValue({ fieldId:'trandate' }) || soRec.getValue({ fieldId:'startdate' });
        const td = normalizeDate(tdVal);
        if (td) baseDate = td;
      }

    } catch(e){
      log.error('getBillingPlanForSO_loadError', { soId, error:e });
    }

    if (hasOverride) {
      baseDate = overrideDateObj;
    }

    return { baseDate, soRecord: soRec };
  }

  /**
   * Lee el calendario de facturación de una línea y devuelve:
   * - numPeriods (número de cuotas)
   * - frequency (MONTHLY, QUARTERLY, etc.)
   * - repeatEvery (factor para frecuencia, p.ej. cada 1 periodo)
   * Si no hay calendario o falla la carga, retorna 1 periodo.
   */
  function getLineBillingInfo(soRecord, line, cache){
    cache = cache || {};
    const bsId = soRecord.getSublistValue({ sublistId:'item', fieldId:'billingschedule', line });
    if (!bsId) return { bsId: null, numPeriods: 1, frequency:null, repeatEvery:1 };

    const key = String(bsId);
    if (!cache[key]){
      try {
        const bs = record.load({ type:'billingschedule', id: bsId, isDynamic:false });

        const nr   = toIntSafe(bs.getValue({ fieldId:'numberremaining' }));
        const rt   = toIntSafe(bs.getValue({ fieldId:'recurrenceterms' }));
        const rpt  = toIntSafe(bs.getValue({ fieldId:'repeatcount' }));
        const freq = String(bs.getValue({ fieldId:'frequency' }) || '').toUpperCase();
        const every= toIntSafe(bs.getValue({ fieldId:'repeatevery' })) || 1;

        let periods = 1;
        if (nr > 0) {
          periods = nr;
        } else if (rt > 0) {
          periods = rt;
        } else if (rpt > 0) {
          periods = rpt;
        }

        cache[key] = {
          periods,
          frequency: freq,
          repeatEvery: every
        };

        log.debug('BillingScheduleInfo', {
          bsId,
          numberremaining:nr,
          recurrenceterms:rt,
          repeatcount:rpt,
          frequency:freq,
          repeatevery:every,
          periodsCached:periods
        });

      } catch(e){
        log.error('billingScheduleLoadError', { bsId, error:e });
        cache[key] = { periods:1, frequency:null, repeatEvery:1 };
      }
    }

    const info = cache[key] || { periods:1, frequency:null, repeatEvery:1 };
    return { 
      bsId,
      numPeriods: info.periods || 1,
      frequency: info.frequency || null,
      repeatEvery: info.repeatEvery || 1
    };
  }

  /**
   * Obtiene las líneas facturables (>0) de una SO.
   */
  function getBillableLines(soRecord){
    const lines = [];
    if (!soRecord) return lines;

    const billingCache = {};

    const lineCount = soRecord.getLineCount({ sublistId:'item' }) || 0;
    for (let i=0; i<lineCount; i++){
      const amount = Number(soRecord.getSublistValue({ sublistId:'item', fieldId:'amount', line:i })) || 0;
      if (amount <= 0) continue; // ignorar líneas en 0

      const sourceItemId   = soRecord.getSublistValue({ sublistId:'item', fieldId:'item', line:i });
      const groupedItemId  = soRecord.getSublistValue({ sublistId:'item', fieldId:'custcol_ht_so_item_agrupado', line:i });
      const itemToBill     = groupedItemId || sourceItemId;
      const billingInfo    = getLineBillingInfo(soRecord, i, billingCache);

      lines.push({
        line: i,
        amount,
        itemId: itemToBill,
        sourceItemId,
        groupedItemId,
        itemType: soRecord.getSublistValue({ sublistId:'item', fieldId:'itemtype', line:i }),
        locationId: soRecord.getSublistValue({ sublistId:'item', fieldId:'location', line:i }),
        quantity: Number(soRecord.getSublistValue({ sublistId:'item', fieldId:'quantity', line:i }) || 0),
        lineUniqueKey: soRecord.getSublistValue({ sublistId:'item', fieldId:'lineuniquekey', line:i }),
        numPeriods: billingInfo.numPeriods,
        billingScheduleId: billingInfo.bsId,
        billingFrequency: billingInfo.frequency,
        billingRepeatEvery: billingInfo.repeatEvery
      });
    }
    return lines;
  }

  /**
   * Obtiene un número de inventario con stock disponible para un ítem y ubicación.
   */
  function findInventoryNumber(itemId, locationId, requiredQty){
    let selected = null;
    if (!itemId || !locationId || requiredQty <= 0) return selected;

    try {
      const s = search.create({
        type: 'inventorynumber',
        filters: [
          ['item','anyof', itemId],'AND',
          ['location','anyof', locationId],'AND',
          ['quantityavailable','greaterthan', 0]
        ],
        columns: [
          search.createColumn({ name:'inventorynumber' }),
          search.createColumn({ name:'quantityavailable' }),
          search.createColumn({ name:'binnumber' })
        ]
      });

      s.run().each(r => {
        const qtyAvail = Number(r.getValue({ name:'quantityavailable' }) || 0);
        if (qtyAvail >= requiredQty){
          selected = {
            invNumberId: r.id,
            binNumberId: r.getValue({ name:'binnumber' }) || null
          };
          return false; // detener búsqueda
        }
        return true;
      });
    } catch (e){
      log.error('findInventoryNumberError', { itemId, locationId, requiredQty, error:e });
    }

    return selected;
  }

  /**
   * Aplica detalle de inventario a las líneas de inventario/ensamblaje.
   */
  function getInventoryDetailSubrecord(invRecord, line){
    try {
      if (invRecord.hasSublistSubrecord && invRecord.hasSublistSubrecord({ sublistId:'item', fieldId:'inventorydetail', line })) {
        return invRecord.getSublistSubrecord({ sublistId:'item', fieldId:'inventorydetail', line });
      }
    } catch (e){
      if (e.name !== 'FIELD_1_IS_NOT_A_SUBRECORD_FIELD') throw e;
    }

    try {
      return invRecord.createSublistSubrecord({ sublistId:'item', fieldId:'inventorydetail', line });
    } catch (e){
      log.error('inventoryDetailCreateError', { line, e });
      throw new Error('INVENTORY_DETAIL_FIELD_UNAVAILABLE_'+line);
    }
  }

  function applyInventoryDetail(invRecord){
    const lineCount = invRecord.getLineCount({ sublistId:'item' }) || 0;

    for (let i=0; i<lineCount; i++){
      const itemType = invRecord.getSublistValue({ sublistId:'item', fieldId:'itemtype', line:i });
      const requiresInv = (itemType === 'InvtPart' || itemType === 'Assembly' || itemType === 'serializedinventoryitem' || itemType === 'lotnumberedinventoryitem');
      if (!requiresInv) continue;

      const itemId    = invRecord.getSublistValue({ sublistId:'item', fieldId:'item', line:i });
      const locationId= invRecord.getSublistValue({ sublistId:'item', fieldId:'location', line:i });
      const quantity  = Number(invRecord.getSublistValue({ sublistId:'item', fieldId:'quantity', line:i }) || 0);

      const invDet = getInventoryDetailSubrecord(invRecord, i);

      // Limpiar líneas previas para evitar duplicados
      const detCount = invDet.getLineCount({ sublistId:'inventoryassignment' }) || 0;
      for (let d=detCount-1; d>=0; d--){
        invDet.removeLine({ sublistId:'inventoryassignment', line:d });
      }

      const invNumber = findInventoryNumber(itemId, locationId, quantity || 1);
      if (!invNumber){
        throw new Error('NO_STOCK_AVAILABLE_FOR_'+itemId);
      }

      invDet.selectNewLine({ sublistId:'inventoryassignment' });
      invDet.setCurrentSublistValue({ sublistId:'inventoryassignment', fieldId:'quantity', value: quantity || 1 });
      invDet.setCurrentSublistValue({ sublistId:'inventoryassignment', fieldId:'inventorynumber', value: invNumber.invNumberId });
      if (invNumber.binNumberId){
        invDet.setCurrentSublistValue({ sublistId:'inventoryassignment', fieldId:'binnumber', value: invNumber.binNumberId });
      }
      invDet.commitLine({ sublistId:'inventoryassignment' });
    }
  }

  // =============================== getInputData ===============================
  function getInputData () {
    const cs = runtime.getCurrentScript();

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    let   OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id_1','custscript_ht_pe_output_folder_id']));
    const RETRY_SOFT_MAX   = Math.max(0, toIntSafe(getParamAny(cs, ['custscript_ht_pe_retry_soft_max_1','custscript_ht_pe_retry_soft_max'])) || 1);

    if (!LOTE_ID) throw new Error('MISSING_PARAM: custscript_ht_pe_lote_id (o _1) vacío o 0.');
    if (!OUTPUT_FOLDER_ID) OUTPUT_FOLDER_ID = DEFAULT_OUTPUT_FOLDER_ID;

    // Marca lote como PROCESANDO
    const lote = record.load({ type: LOT_REC, id: LOTE_ID });
    lote.setValue({ fieldId: FLD_ESTADO, value: ESTADO.PROCESANDO });
    lote.save({ enableSourcing:true, ignoreMandatoryFields:true });

    // Lee parámetros de ejecución desde el lote
    const params = JSON.parse(lote.getValue(FLD_PARAMS) || '{}');
    const overrideDate = params && params.filters && params.filters.tranDateOverride || null;

    // Resuelve IDs de entrada (SO IDs)
    const soIds = resolveInputIds(params) || [];
    const totalOriginal = soIds.length;

    // Anti-duplicados: excluir SO que ya tengan alguna FI creada
    const existingSet = findSoIdsWithExistingFIN(soIds);
    const filteredIds = soIds.filter(id => !existingSet.has(id));

    log.audit('Anti-duplicados Emisión', {
      total_entrantes: totalOriginal,
      con_factura_interna: existingSet.size,
      procesar: filteredIds.length
    });

    // Actualiza TOTAL con los que realmente se procesarán (SO, no cuotas)
    record.submitFields({
      type: LOT_REC, id: LOTE_ID,
      values: { [FLD_TOTAL]: filteredIds.length }
    });

    const meta = { RETRY_SOFT_MAX, OUTPUT_FOLDER_ID, LOTE_ID, OVERRIDE_TRAN_DATE: overrideDate };
    return filteredIds.map(id => ({ id:Number(id), retry:0, meta }));
  }

  // =============================== Resolver IDs (Emisión) ===============================
  function resolveInputIds (params) {
    const source = (params && params.source || 'FILTERS').toUpperCase();

    if (source === 'JSON') {
      const fid = toIntSafe(params && params.jsonFileId || 0);
      if (!fid) return [];
      const f = file.load({ id: fid });
      return JSON.parse(f.getContents() || '[]').map(Number);
    }

    if (source === 'SAVEDSEARCH') {
      const ssid = params && params.savedSearchId;
      if (!ssid) return [];
      const s = search.load({ id: ssid });
      const out = [];
      s.run().each(r => { out.push(Number(r.id)); return true; });
      return out;
    }

    // FILTERS
    const f = params && params.filters || {};
    const filtros = [['mainline','is','T'],'AND',['type','anyof','SalesOrd']];
    if (f.desde && f.hasta) filtros.push('AND',['trandate','within',f.desde,f.hasta]);
    if (f.cliente)          filtros.push('AND',['entity','anyof', String(f.cliente)]);
    if (f.osTranId)         filtros.push('AND',['tranid','is', f.osTranId]);

    const out = [];
    search.create({ type:'salesorder', filters:filtros, columns:['internalid'] })
      .run().each(r => { out.push(Number(r.id)); return true; });
    return out;
  }

  // =============================== map (con cuotas) ===============================
  function map (ctx) {
    const item    = JSON.parse(ctx.value);
    const soId    = Number(item.id);
    const attempt = Number(item.retry) || 0;
    const maxRetry= Number(item.meta && item.meta.RETRY_SOFT_MAX || 1);

    let soTranId = '';
    try { soTranId = lookupTranId(FROM_TYPE_SOURCE, soId); } catch(e) { log.error('lookupSOTranId', { soId, e }); }

    try {
      validateSourceOrder(soId);

      const plan = getBillingPlanForSO(soId, item.meta && item.meta.OVERRIDE_TRAN_DATE || null);
      const billableLines = getBillableLines(plan && plan.soRecord);
      const defaultCuotas = 1;
      const maxCuotas = billableLines.reduce((m,l)=>{
        const n = Number(l.numPeriods || 0) || 1;
        return n > m ? n : m;
      }, defaultCuotas);

      if (!billableLines.length){
        ctx.write('err', JSON.stringify({
          sourceTranId: soTranId,
          cuota: null,
          cuotasTotal: maxCuotas,
          code:'NO_BILLABLE_LINES',
          msg:'La orden no tiene líneas con monto > 0, se omite.'
        }));
        return;
      }

      log.audit('EmisionCuotas', { 
        soId, 
        soTranId, 
        maxCuotas, 
        billableLines: billableLines.length 
      });

      for (let l=0; l<billableLines.length; l++){
        const lineInfo = billableLines[l];
        const numCuotas = Math.max(1, Number(lineInfo.numPeriods || 0) || 1);

        for (let cuota = 0; cuota < numCuotas; cuota++){
          try {
            const invId = createInternalInvoice(soId, cuota, plan, lineInfo);
            let fiTranId = '';
            try { fiTranId = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invId); } catch(e){ log.error('lookupFITranId', { invId, e }); }

            ctx.write('ok',  JSON.stringify({
              sourceTranId: soTranId,
              targetTranId: fiTranId,
              cuota: cuota+1,
              cuotasTotal: numCuotas,
              itemLine: lineInfo.line + 1,
              itemId: lineInfo.itemId,
              msg:'OK'
            }));
            ctx.write('ids', String(invId));

          } catch (e1) {
            // Soft retry por cuota
            if (looksTransient(e1) && attempt < maxRetry) {
              try {
                const invRetryId = createInternalInvoice(soId, cuota, plan, lineInfo);
                let fiTranId2 = '';
                try { fiTranId2 = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invRetryId); } catch(e2){ log.error('lookupFITranIdRetry', { invRetryId, e2 }); }

                ctx.write('ok',  JSON.stringify({
                  sourceTranId: soTranId,
                  targetTranId: fiTranId2,
                  cuota: cuota+1,
                  cuotasTotal: numCuotas,
                  itemLine: lineInfo.line + 1,
                  itemId: lineInfo.itemId,
                  msg:'OK (retry)'
                }));
                ctx.write('ids', String(invRetryId));
                continue;
              } catch(eRetry){
                ctx.write('err', JSON.stringify({
                  sourceTranId: soTranId,
                  cuota: cuota+1,
                  cuotasTotal: numCuotas,
                  itemLine: lineInfo.line + 1,
                  itemId: lineInfo.itemId,
                  code:eRetry.name||'ERR',
                  msg:eRetry.message||String(eRetry)
                }));
                continue;
              }
            }

            // Error duro en esta cuota
            ctx.write('err', JSON.stringify({
              sourceTranId: soTranId,
              cuota: cuota+1,
              cuotasTotal: numCuotas,
              itemLine: lineInfo.line + 1,
              itemId: lineInfo.itemId,
              code:e1.name||'ERR',
              msg:e1.message||String(e1)
            }));
          }
        }
      }

    } catch (e) {
      // Error antes de intentar cuotas (ej: lookup/validación)
      ctx.write('err', JSON.stringify({
        sourceTranId: soTranId || ('SO:'+soId),
        cuota: null,
        cuotasTotal: null,
        code:e.name||'ERR',
        msg:e.message||String(e)
      }));
    }
  }

  // =============================== summarize ===============================
  function summarize (summary) {
    const cs = runtime.getCurrentScript();

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    const OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id_1','custscript_ht_pe_output_folder_id'])) || DEFAULT_OUTPUT_FOLDER_ID;

    const ok=[], err=[], idsFin=[];
    summary.output.iterator().each((k,v)=>{
      if (k === 'ok')  ok.push(JSON.parse(v));
      else if (k === 'err') err.push(JSON.parse(v));
      else if (k === 'ids') {
        const n = Number(v);
        if (n) idsFin.push(n);
      }
      return true;
    });

    // JSON 1 (tranids + info de cuotas)
    let fileIdResults = null, estadoFinal = ESTADO.COMPLETADO;
    try {
      fileIdResults = saveJson(
        { ok, err, total: ok.length+err.length, finishedAt: new Date().toISOString() },
        'fi_emit_lote_'+(LOTE_ID || 'NA'),
        OUTPUT_FOLDER_ID
      );
    } catch (e) {
      estadoFinal = ESTADO.ERROR;
      log.error('saveJsonResultsError', e);
    }

    // JSON 2 (IDs FIN)
    let fileIdIdsOnly = null;
    try {
      const uniqueIds = Array.from(new Set(idsFin.filter(n => !!n)));
      fileIdIdsOnly = saveJsonRaw(
        JSON.stringify(uniqueIds),
        'fi_emit_lote_'+(LOTE_ID || 'NA')+'_ids',
        OUTPUT_FOLDER_ID
      );
    } catch (e) {
      log.error('saveJsonIdsOnlyError', e);
    }

    // Actualiza lote
    try {
      if (LOTE_ID) {
        record.submitFields({
          type: LOT_REC, id: LOTE_ID,
          values: {
            [FLD_OK]: ok.length,
            [FLD_ERR]: err.length,
            [FLD_OUTFILE]: fileIdResults,
            [FLD_OUTFILE_FIN]: fileIdIdsOnly,
            [FLD_ESTADO]: estadoFinal
          }
        });
      } else {
        log.error('submitFieldsSkip','Lote ID no presente; se omite actualización del lote.');
      }
    } catch (e) {
      log.error('submitFieldsError', e);
    }

    // Email
    try {
      const subject = 'HT PE – Emisión finalizada (Lote '+(LOTE_ID || 'NA')+')';
      const bodyLines = [
        'Total registros (cuotas): '+(ok.length+err.length),
        'OK: '+ok.length,
        'ERR: '+err.length,
        'Archivo resultados (tranid/cuota): '+(fileIdResults || '(no generado)'),
        'Archivo IDs FIN: '+(fileIdIdsOnly || '(no generado)')
      ];
      const attachments = [];
      if (fileIdResults) attachments.push(file.load({ id:fileIdResults }));
      if (fileIdIdsOnly) attachments.push(file.load({ id:fileIdIdsOnly }));
      email.send({ author: EMAIL_EMPLOYEE_ID, recipients: [EMAIL_EMPLOYEE_ID], subject, body: bodyLines.join('\n'), attachments });
    } catch(e){
      log.error('emailError', e);
    }

    if (summary.inputSummary.error) log.error('inputSummary', summary.inputSummary.error);
    summary.mapSummary.errors.iterator().each((k, e) => { log.error('mapError', 'key '+k+' error '+e); return true; });
  }

  // =============================== Reglas negocio ===============================
  function validateSourceOrder (soId) {
    const info = search.lookupFields({ type:'salesorder', id: soId, columns:['entity','status'] });
    if (!info || !info.entity || !info.entity.length) throw new Error('HARD_MISSING_CUSTOMER: La orden no tiene cliente.');
  }

  /**
   * Crea UNA Factura Interna (cuota) para la SO:
   * - Fecha según frecuencia del Billing Schedule:
   *   - MONTHLY → baseDate + cuotaIndex * 1 mes
   *   - QUARTERLY → baseDate + cuotaIndex * 3 meses
   *   - Otros → mensual por defecto
   * - Montos prorrateados = amount / numCuotas
   */
  function createInternalInvoice (soId, cuotaIndex, plan, lineInfo) {
    const inv = record.transform({
      fromType: FROM_TYPE_SOURCE,
      fromId: soId,
      toType: TO_TYPE_INTERNAL_INVOICE,
      isDynamic: false
    });

    // Mantener únicamente la línea solicitada (facturación por ítem)
    try {
      const targetKey   = lineInfo && lineInfo.lineUniqueKey ? String(lineInfo.lineUniqueKey) : null;
      const targetItem  = Number(lineInfo && lineInfo.itemId || 0);
      const targetIndex = Number(lineInfo && lineInfo.line || 0);
      const lineCount   = inv.getLineCount({ sublistId:'item' }) || 0;
      let keepIndex = -1;

      for (let i=0; i<lineCount; i++){
        const key = String(inv.getSublistValue({ sublistId:'item', fieldId:'lineuniquekey', line:i }) || '');
        const itemIdLine = Number(inv.getSublistValue({ sublistId:'item', fieldId:'item', line:i }) || 0);
        if (targetKey && key === targetKey){
          keepIndex = i; break;
        }
        if (!targetKey && targetItem && itemIdLine === targetItem){
          keepIndex = i; break;
        }
        if (!targetKey && !targetItem && i === targetIndex){
          keepIndex = i; break;
        }
      }

      if (keepIndex < 0){
        throw new Error('TARGET_LINE_NOT_FOUND');
      }

      for (let i=lineCount-1; i>=0; i--){
        if (i !== keepIndex){
          inv.removeLine({ sublistId:'item', line:i });
        }
      }
    } catch (e) {
      log.error('filterLinesByItemError', { soId, cuotaIndex, lineInfo, e });
    }

    const billedItemId  = Number(lineInfo && lineInfo.itemId || 0);
    const sourceItemId  = Number(lineInfo && lineInfo.sourceItemId || billedItemId);
    const groupedItemId = Number(lineInfo && lineInfo.groupedItemId || 0);

    // Cambia el ítem a facturar por el agrupado (no inventariable) si existe
    if (groupedItemId && groupedItemId !== sourceItemId){
      try {
        inv.setSublistValue({ sublistId:'item', fieldId:'item', line:0, value: groupedItemId });
      } catch (e){
        log.error('swapGroupedItemError', { soId, cuotaIndex, groupedItemId, sourceItemId, e });
      }
    }

    // Fecha según plan de cuotas + frecuencia del Billing Schedule
    if (plan && plan.baseDate){
      try {
        const freqRaw = (lineInfo && lineInfo.billingFrequency || '').toUpperCase();
        const every = Number(lineInfo && lineInfo.billingRepeatEvery || 0) || 1;
        let d = plan.baseDate;

        if (freqRaw === 'QUARTERLY') {
          const months = (cuotaIndex * every * 3);
          d = addMonthsKeepDay(plan.baseDate, months);
        } else if (freqRaw === 'MONTHLY' || !freqRaw) {
          const months = cuotaIndex * every;
          d = addMonthsKeepDay(plan.baseDate, months);
        } else if (freqRaw === 'WEEKLY') {
          const days = cuotaIndex * every * 7;
          d = addDays(plan.baseDate, days);
        } else if (freqRaw === 'ANNUAL' || freqRaw === 'YEARLY') {
          const months = cuotaIndex * every * 12;
          d = addMonthsKeepDay(plan.baseDate, months);
        } else {
          // Fallback: mensual
          const months = cuotaIndex * every;
          d = addMonthsKeepDay(plan.baseDate, months);
        }

        inv.setValue({ fieldId:'trandate', value:d });
      } catch(e){
        log.error('setTrandateCuotaError', { soId, cuotaIndex, e });
      }
    }

    // Montos prorrateados por número de cuotas
    try {
      const periods = Number(lineInfo && lineInfo.numPeriods || 0) || 1;
      const lineCount = inv.getLineCount({ sublistId:'item' }) || 0;
      if (lineCount !== 1){
        log.error('unexpectedLineCountAfterFilter', { soId, lineCount, lineInfo });
      }
      const targetLine = 0;
      const qty = Number(
        inv.getSublistValue({ sublistId:'item', fieldId:'quantity', line:targetLine }) ||
        (lineInfo && lineInfo.quantity) || 1
      ) || 1;

      const baseAmount = Number(lineInfo && lineInfo.amount || 0);
      if (baseAmount <= 0){
        throw new Error('LINE_AMOUNT_ZERO');
      }

      const basePerCuota = round2(baseAmount / periods);
      let amountThis = basePerCuota;
      if (cuotaIndex + 1 === periods){
        const totalPrev = round2(basePerCuota * (periods - 1));
        amountThis = round2(baseAmount - totalPrev);
      }
      const newRate = round2(amountThis / qty);

      inv.setSublistValue({ sublistId:'item', fieldId:'quantity', line:targetLine, value: qty });
      inv.setSublistValue({ sublistId:'item', fieldId:'rate', line:targetLine, value: newRate });
    } catch(e){
      log.error('adjustAmountsCuotasError', { soId, cuotaIndex, e });
    }

    // Detalle de inventario para ítems de inventario/ensamblados
    try {
      if (!groupedItemId){
        applyInventoryDetail(inv);
      }
    } catch(e){
      log.error('applyInventoryDetailError', { soId, cuotaIndex, e });
      throw e;
    }

    // Marca origen y número de cuota
    setIfHasField(inv, FLD_CREATED_FROM_FI, soId);
    setIfHasField(inv, FLD_CUOTA_NUM, cuotaIndex + 1);

    return inv.save({ enableSourcing:true, ignoreMandatoryFields:false });
  }

  // =============================== Exports ===============================
  return { getInputData, map, summarize };
});
