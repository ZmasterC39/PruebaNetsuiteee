/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  'N/ui/serverWidget',
  'N/ui/message',
  'N/search',
  'N/file',
  'N/record',
  'N/url',
  'N/task',
  'N/log'
], function (ui, message, search, file, record, url, task, log) {

  // ==================== Constantes ====================
  const LOT_REC   = 'customrecord_ht_pe_fi_lote';
  const RECTYPE_ID = 3333; // rectype interno del customrecord_ht_pe_fi_lote

  const FLD_ESTADO  = 'custrecord_ht_pe_estado';
  const FLD_PROCESO = 'custrecord_ht_pe_proceso';
  const FLD_PARAMS  = 'custrecord_ht_pe_params';
  const FLD_TOTAL   = 'custrecord_ht_pe_total';

  const ESTADO = { COMPLETADO:1, ERROR:2, PENDIENTE:3, PROCESANDO:4 };
  const PROC   = { ANULACION:1, EMISION:2 };

  const INPUT_FOLDER_DEFAULT  = 121601; // HT PE – FI Input
  const OUTPUT_FOLDER_DEFAULT = 121602; // HT PE – FI Output

  const MR_EMIT = { script:'customscript_ht_pe_mr_fi_emit',  deploy:'customdeploy_ht_pe_mr_fi_emit' };
  const MR_VOID = { script:'customscript_ht_pe_mr_fi_void',  deploy:'customdeploy_ht_pe_mr_fi_void' };

  const PREV_TYPES = { SO:'SO', FIN:'FIN' };
  const TO_TYPE_INTERNAL_INVOICE = 'customsale_ec_factura_interna';

  const toInt = (v)=> Number(String(v||'').replace(/,/g,'').trim())||0;
  const toDateStr = (v)=> (v && String(v).trim()) || null;

  // ==================== Utils ====================
  function getLoteUrl(loteId){
    try{
      return url.resolveRecord({ recordType: LOT_REC, recordId: loteId, isEditMode:false });
    }catch(e){
      return '/app/common/custom/custrecordentry.nl?rectype='+RECTYPE_ID+'&id='+loteId;
    }
  }

  function linkToLote(loteId){
    const rurl = getLoteUrl(loteId);
    return { url: rurl, label: `Abrir Lote #${loteId}` };
  }

  function chunk(arr, size){
    const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out;
  }

  /**
   * Devuelve un Set con SO IDs que ya tienen al menos una FI (createdfrom).
   * Usado tanto en preview como en generación para ocultar/evitar OS ya facturadas cuando así se requiera.
   */
  function findSoIdsWithExistingFIN(soIds){
    const set = new Set();
    if (!soIds || !soIds.length) return set;

    const batches = chunk(soIds.map(String), 1000);
    for (let b=0; b<batches.length; b++){
      const s = search.create({
        type:'transaction',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','T'],'AND',
          ['createdfrom','anyof', batches[b]]
        ],
        columns: [ search.createColumn({ name:'createdfrom' }) ]
      });
      s.run().each(function(r){
        const cf = Number(r.getValue('createdfrom'));
        if (cf) set.add(cf);
        return true;
      });
    }
    return set;
  }

  function addInlineJS(form, lastLoteUrl){
    const safeUrl = (lastLoteUrl||'').replace(/'/g, "\\'");
    const f = form.addField({ id:'custpage_inline_js', label:'InlineJS', type: ui.FieldType.INLINEHTML });
    f.defaultValue = `
      <script>
        var SL_LAST_LOTE_URL = '${safeUrl}';

        function SL_setAndSubmit(action){
          var fld = document.getElementById('custpage_action');
          if (fld) fld.value = action;
          var frm = document.forms[0];
          if (frm) frm.submit();
        }

        function SL_doPreview(){ SL_setAndSubmit('preview'); }
        function SL_doEmit(){ SL_setAndSubmit('emit'); }
        function SL_doVoid(){ SL_setAndSubmit('void'); }
        function SL_doExport(){ SL_setAndSubmit('export'); }

        function SL_openLastLote(){
          if (SL_LAST_LOTE_URL) {
            window.open(SL_LAST_LOTE_URL, '_blank', 'noopener,noreferrer');
          }
        }

        // NUEVO: abrir lista de lotes en nueva ventana
        function SL_openLotList(){
          window.open('/app/common/custom/custrecordentrylist.nl?rectype=3328', '_blank', 'noopener,noreferrer');
        }

        function SL_bindFilterAutoPreview(){
          var ids = [
            'custpage_prev_type',
            'custpage_desde',
            'custpage_hasta',
            'custpage_cliente',
            'custpage_os',
            'custpage_cuota',
            'custpage_cod_agru',
            'custpage_trandate_override',
            'custpage_lote_id',
            'custpage_incluir_facturadas'
          ];
          for (var i=0; i<ids.length; i++){
            var el = document.getElementById(ids[i]);
            if (el){
              el.onchange = function(){ SL_doPreview(); };
            }
          }
        }

        if (window.addEventListener){
          window.addEventListener('load', SL_bindFilterAutoPreview);
        } else if (window.attachEvent){
          window.attachEvent('onload', SL_bindFilterAutoPreview);
        } else {
          SL_bindFilterAutoPreview();
        }
      </script>
    `;
  }

  // ==================== Vista previa ====================
  function previewSO(f){
    const filters = [['mainline','is','T'],'AND',['type','anyof','SalesOrd']];
    if (f.desde && f.hasta) filters.push('AND',['trandate','within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND',['entity','anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND',['tranid','is', f.osTranId]);
    if (f.cuota)            filters.push('AND',['custbody_ec_nro_cuota_fac_int','equalto', String(f.cuota)]);
    if (f.codAgru)          filters.push('AND',['custbody_ht_cod_agru','is', f.codAgru]);

    const cols = [
      'internalid','tranid','trandate','entity','total','statusref',
      'custbody_ht_cod_agru','fxamount'          // <- agregamos moneda
    ].map(n=>search.createColumn({name:n}));

    const s = search.create({ type:'salesorder', filters, columns: cols });

    const rows=[]; 
    const paged=s.runPaged({pageSize:200}); 
    const countPaged=paged.count;

    if (countPaged>0){
      paged.fetch({index:0}).data.forEach(r=>{
        rows.push({
          tipo:'SO',
          id:Number(r.getValue('internalid')),
          tranid:r.getValue('tranid')||'',
          trandate:r.getValue('trandate')||'',
          clienteT:r.getText('entity')||'',
          total:r.getValue('fxamount')||'',
          status:r.getValue('statusref')||'',
          codAgru:r.getValue('custbody_ht_cod_agru')||'',
          //currencyName:r.getValue('currencyname')||''
        });
      });
    }

    // Si el checkbox NO está marcado → excluir OS con FI
    if (!f.incluirFacturadas){
      const soIds = rows.map(r=>r.id);
      const existing = findSoIdsWithExistingFIN(soIds);
      const filteredRows = rows.filter(r => !existing.has(r.id));

      log.debug('previewSO_filterExisting', {
        totalEncontradas: rows.length,
        conFI: existing.size,
        mostradas: filteredRows.length
      });

      return { rows: filteredRows, count: countPaged }; // count = total en búsqueda
    }

    // Si está marcado, mostrar todo
    log.debug('previewSO_incluirFacturadas', {
      totalEncontradas: rows.length,
      incluirFacturadas: true
    });

    return { rows, count: countPaged };
  }

  function loadFinIdsFromLote(loteId){
    try{
      const lote = record.load({ type: LOT_REC, id: loteId });
      const fileIdFin = toInt(lote.getValue('custrecord_ht_pe_outputfile_fin'));
      if (!fileIdFin) return [];
      const f = file.load({ id:fileIdFin });
      const parsed = JSON.parse(f.getContents()||'[]');
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.ids)? parsed.ids : []);
      return arr.map(Number).filter(n=>!!n);
    }catch(e){
      log.error('loadFinIdsFromLote', e);
      return [];
    }
  }

  function previewFIByIds(ids){
    if (!ids.length) return { rows:[], count:0 };
    const s = search.create({
      type:'transaction',
      filters: [
        ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
        ['internalid','anyof', ids.map(String)]
      ],
      columns: [
        'internalid','tranid','trandate','entity','total','statusref',
        'custbody_ht_cod_agru','fxamount'//'currencyname'         // moneda aquí también
      ].map(n=>search.createColumn({name:n}))
    });
    const rows=[]; const paged=s.runPaged({pageSize:1000}); let total=0;
    for (let i=0;i<paged.pageRanges.length;i++){
      paged.fetch({index:i}).data.forEach(r=>{
        rows.push({
          tipo:'FIN',
          id:Number(r.getValue('internalid')),
          tranid:r.getValue('tranid')||'',
          trandate:r.getValue('trandate')||'',
          clienteT:r.getText('entity')||'',
          total:r.getValue('fxamount')||'',
          status:r.getValue('statusref')||'',
          codAgru:r.getValue('custbody_ht_cod_agru')||'',
          //currencyName:r.getValue('currencyname')||''
        });
        total++;
      });
    }
    return { rows, count: total };
  }

  function previewFIByFilters(f){
    const filters = [['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',['mainline','is','T']];
    if (f.desde && f.hasta) filters.push('AND',['trandate','within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND',['entity','anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND',['tranid','is', f.osTranId]);
    if (f.codAgru)          filters.push('AND',['custbody_ht_cod_agru','is', f.codAgru]);

    const cols = [
      'internalid','tranid','trandate','entity','total','statusref',
      'custbody_ht_cod_agru','fxamount'//,'currencyname'
    ].map(n=>search.createColumn({name:n}));

    const s = search.create({ type:'transaction', filters, columns: cols });

    const rows=[]; 
    const paged=s.runPaged({pageSize:200}); 
    const countPaged=paged.count;

    if (countPaged>0){
      paged.fetch({index:0}).data.forEach(r=>{
        rows.push({
          tipo:'FIN',
          id:Number(r.getValue('internalid')),
          tranid:r.getValue('tranid')||'',
          trandate:r.getValue('trandate')||'',
          clienteT:r.getText('entity')||'',
          total:r.getValue('fxamount')||'',
          status:r.getValue('statusref')||'',
          codAgru:r.getValue('custbody_ht_cod_agru')||'',
          //currencyName:r.getValue('currencyname')||''
        });
      });
    }
    return { rows, count: countPaged };
  }

  // ==================== Recolección para Emisión ====================
  function collectSOIds(f){
    const filters = [['mainline','is','T'],'AND',['type','anyof','SalesOrd']];
    if (f.desde && f.hasta) filters.push('AND',['trandate','within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND',['entity','anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND',['tranid','is', f.osTranId]);
    if (f.cuota)            filters.push('AND',['custbody_ec_nro_cuota_fac_int','equalto', String(f.cuota)]);
    if (f.codAgru)          filters.push('AND',['custbody_ht_cod_agru','is', f.codAgru]);

    const s = search.create({ type:'salesorder', filters, columns:[search.createColumn({name:'internalid'})] });
    const ids=[]; const paged=s.runPaged({pageSize:1000});
    for (let i=0;i<paged.pageRanges.length;i++){
      paged.fetch({index:i}).data.forEach(r=>ids.push(Number(r.id)));
    }

    // Si el checkbox está marcado → no filtramos OS ya facturadas
    if (f.incluirFacturadas){
      log.audit('collectSOIds_incluirFacturadas', {
        total: ids.length,
        paraGenerar: ids.length
      });
      return ids;
    }

    // Comportamiento normal: filtrar OS que ya tienen FI
    const existing = findSoIdsWithExistingFIN(ids);
    const filteredIds = ids.filter(id => !existing.has(id));

    log.audit('collectSOIds_filterExisting', {
      total: ids.length,
      conFI: existing.size,
      paraGenerar: filteredIds.length
    });

    return filteredIds;
  }

  function saveIdsJson(ids, folderId, baseName){
    const fid = toInt(folderId)||INPUT_FOLDER_DEFAULT;
    const f = file.create({
      name: `${baseName}_${new Date().toISOString().slice(0,10)}.json`,
      fileType: file.Type.JSON,
      contents: JSON.stringify(ids||[]),
      folder: fid, isOnline:false
    });
    return f.save();
  }

  function createLote({ proceso, jsonFileId, filtros, total }){
    const recLote = record.create({ type:LOT_REC, isDynamic:false });
    recLote.setValue({ fieldId:FLD_ESTADO,  value:ESTADO.PENDIENTE });
    recLote.setValue({ fieldId:FLD_PROCESO, value:proceso });
    recLote.setValue({ fieldId:FLD_TOTAL,   value:total });

    const includeInvoiced = !!(filtros && filtros.incluirFacturadas);

    const params = {
      source:'JSON',
      savedSearchId:null,
      jsonFileId: jsonFileId,
      filters:{
        desde:filtros.desde||null, hasta:filtros.hasta||null, cliente:filtros.cliente||null,
        osTranId:filtros.osTranId||null, cuota:filtros.cuota||null, codAgru:filtros.codAgru||null,
        tranDateOverride:filtros.tranDateOverride||null
      },
      technical:{ retrySoftMax:1, includeInvoiced: includeInvoiced }
    };
    recLote.setValue({ fieldId:FLD_PARAMS, value: JSON.stringify(params) });
    return recLote.save({ enableSourcing:true, ignoreMandatoryFields:true });
  }

  function launchMR_Emit(loteId){
    const t = task.create({ taskType: task.TaskType.MAP_REDUCE });
    t.scriptId     = MR_EMIT.script;
    t.deploymentId = MR_EMIT.deploy;
    t.params = {
      custscript_ht_pe_lote_id:   String(loteId),
      custscript_ht_pe_lote_id_1: String(loteId)
    };
    return t.submit();
  }

  function launchMR_Void(loteId){
    const t = task.create({ taskType: task.TaskType.MAP_REDUCE });
    t.scriptId     = MR_VOID.script;
    t.deploymentId = MR_VOID.deploy;
    t.params = {
      custscript_ht_pe_lote_id:   String(loteId),
      custscript_ht_pe_lote_id_1: String(loteId),
      custscript_ht_pe_void_mode: 'DELETE'
    };
    return t.submit();
  }

  // ==================== UI ====================
  function buildForm({ filtros, previewRows, totalCount, totalAmount, banner, lastLoteId }){
    const form = ui.createForm({ title:'HT PE – Emisión / Anulación de FI (por Lote)' });

    form.addField({
      id:'custpage_json_upload',
      label:'Subir JSON de IDs (opcional)',
      type: ui.FieldType.FILE
    });

    form.addFieldGroup({ id:'grp_filters', label:'Filtros' });

    const fPrevType = form.addField({
      id:'custpage_prev_type',
      label:'Vista previa de',
      type: ui.FieldType.SELECT,
      container:'grp_filters'
    });
    fPrevType.addSelectOption({ value: PREV_TYPES.SO,  text:'Órdenes de Servicio (SO)' });
    fPrevType.addSelectOption({ value: PREV_TYPES.FIN, text:'Facturas Internas (FIN)' });
    fPrevType.defaultValue = (filtros.prevType || PREV_TYPES.SO);

    const fDesde   = form.addField({ id:'custpage_desde',    label:'Fecha Desde', type:ui.FieldType.DATE,    container:'grp_filters' });
    const fHasta   = form.addField({ id:'custpage_hasta',    label:'Fecha Hasta', type:ui.FieldType.DATE,    container:'grp_filters' });
    const fCliente = form.addField({ id:'custpage_cliente',  label:'Cliente',     type:ui.FieldType.SELECT,  source:'customer', container:'grp_filters' });
    const fTran    = form.addField({
      id:'custpage_os',
      label:(filtros.prevType===PREV_TYPES.FIN?'N° Doc FIN (TranID)':'N° Orden Servicio (TranID)'),
      type:ui.FieldType.TEXT,
      container:'grp_filters'
    });
    const fCuota   = form.addField({ id:'custpage_cuota',    label:'N° Cuota (opcional)', type:ui.FieldType.INTEGER, container:'grp_filters' });
    const fCodAgru = form.addField({ id:'custpage_cod_agru', label:'Codigo Agrupador', type:ui.FieldType.TEXT, container:'grp_filters' });

    const fTranDateOverride = form.addField({
      id:'custpage_trandate_override',
      label:'Fecha para Factura Interna (opcional)',
      type: ui.FieldType.DATE,
      container:'grp_filters'
    });

    const fIncl    = form.addField({
      id:'custpage_incluir_facturadas',
      label:'Incluir OS ya facturadas (con FI)',
      type: ui.FieldType.CHECKBOX,
      container:'grp_filters'
    });
    fIncl.defaultValue = filtros.incluirFacturadas ? 'T' : 'F';

    const fLoteId  = form.addField({ id:'custpage_lote_id',  label:'Lote ID (para Anulación / Previsualizar FIN)', type:ui.FieldType.INTEGER, container:'grp_filters' });

    if (filtros?.desde)    fDesde.defaultValue   = filtros.desde;
    if (filtros?.hasta)    fHasta.defaultValue   = filtros.hasta;
    if (filtros?.cliente)  fCliente.defaultValue = String(filtros.cliente);
    if (filtros?.osTranId) fTran.defaultValue    = filtros.osTranId;
    if (filtros?.cuota)    fCuota.defaultValue   = String(filtros.cuota);
    if (filtros?.codAgru)  fCodAgru.defaultValue = filtros.codAgru;
    if (filtros?.loteId)   fLoteId.defaultValue  = String(filtros.loteId);
    if (filtros?.tranDateOverride) fTranDateOverride.defaultValue = filtros.tranDateOverride;

    form.addFieldGroup({ id:'grp_status', label:'Estado' });

    const fTotal = form.addField({ id:'custpage_total', label:'Coincidencias (vista previa)', type:ui.FieldType.INTEGER, container:'grp_status' });
    fTotal.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
    fTotal.defaultValue = String(totalCount||0);

    const fTotalMonto = form.addField({ id:'custpage_total_monto', label:'Total a facturar', type:ui.FieldType.CURRENCY, container:'grp_status' });
    fTotalMonto.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
    const ta = (totalAmount || 0);
    fTotalMonto.defaultValue = ta ? String(ta.toFixed(2)) : '0.00';

    let lastLoteUrl = '';
    if (lastLoteId){
      const lk = linkToLote(lastLoteId);
      lastLoteUrl = lk.url || '';
      const fUrl = form.addField({ id:'custpage_last_lote_url', label:'Lote', type: ui.FieldType.URL, container:'grp_status' });
      fUrl.defaultValue = lastLoteUrl;
      fUrl.linkText = lk.label;

      form.addButton({ id:'custpage_btn_open_lote', label:`Abrir Lote #${lastLoteId}`, functionName:'SL_openLastLote' });
    }

    const sl = form.addSublist({ id:'custpage_preview', label:'Vista previa (máx. 200)', type: ui.SublistType.LIST });
    sl.addField({ id:'col_tipo',    label:'Tipo',           type:ui.FieldType.TEXT });
    sl.addField({ id:'col_id',      label:'ID Interno',     type:ui.FieldType.TEXT });
    sl.addField({ id:'col_tranid',  label:'N° Doc',         type:ui.FieldType.TEXT });
    sl.addField({ id:'col_fecha',   label:'Fecha',          type:ui.FieldType.TEXT });
    sl.addField({ id:'col_cliente', label:'Cliente',        type:ui.FieldType.TEXT });
    sl.addField({ id:'col_importe', label:'Importe',        type:ui.FieldType.CURRENCY });
    sl.addField({ id:'col_moneda',  label:'Moneda',         type:ui.FieldType.TEXT });   // NUEVA COLUMNA
    sl.addField({ id:'col_codagru', label:'Cod. Agrupador', type:ui.FieldType.TEXT });
    sl.addField({ id:'col_estado',  label:'Estado',         type:ui.FieldType.TEXT });

    (previewRows||[]).slice(0,200).forEach((r,i)=>{
      sl.setSublistValue({ id:'col_tipo',    line:i, value:r.tipo||' ' });
      sl.setSublistValue({ id:'col_id',      line:i, value:String(r.id) });
      sl.setSublistValue({ id:'col_tranid',  line:i, value:r.tranid||' ' });
      sl.setSublistValue({ id:'col_fecha',   line:i, value:r.trandate||' ' });
      sl.setSublistValue({ id:'col_cliente', line:i, value:r.clienteT||' ' });
      if (r.total!=null && r.total!=='') sl.setSublistValue({ id:'col_importe', line:i, value:String(r.total) });
      //if (r.currencyName) sl.setSublistValue({ id:'col_moneda', line:i, value:r.currencyName });
      if (r.codAgru) sl.setSublistValue({ id:'col_codagru', line:i, value:r.codAgru });
      sl.setSublistValue({ id:'col_estado',  line:i, value:r.status||' ' });
    });

    const fAction = form.addField({ id:'custpage_action', label:'Acción', type: ui.FieldType.TEXT });
    fAction.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

    // Botones
    form.addButton({ id:'custpage_btn_preview', label:'Vista previa',           functionName:'SL_doPreview' });   // NUEVO
    form.addButton({ id:'custpage_btn_emit',    label:'Crear facturas internas', functionName:'SL_doEmit' });
    form.addButton({ id:'custpage_btn_void',    label:'Anular por Lote',         functionName:'SL_doVoid' });
    form.addButton({ id:'custpage_btn_export',  label:'Exportar CSV',            functionName:'SL_doExport' });
    form.addButton({ id:'custpage_btn_lot_list',label:'Lista de Lotes',          functionName:'SL_openLotList' }); // NUEVO (abre nueva ventana)

    addInlineJS(form, lastLoteUrl);

    if (banner){
      form.addPageInitMessage({
        type: banner.type || message.Type.INFORMATION,
        title: banner.title || '',
        message: banner.message || ''
      });
    }

    return form;
  }

  // ==================== Main ====================
  function onRequest(ctx){
    const req = ctx.request;
    const p   = req.parameters;

    const filtros = {
      prevType: p.custpage_prev_type || PREV_TYPES.SO,
      desde: p.custpage_desde || null,
      hasta: p.custpage_hasta || null,
      cliente: toInt(p.custpage_cliente) || null,
      osTranId: p.custpage_os || null,
      cuota: toInt(p.custpage_cuota) || null,
      codAgru: (p.custpage_cod_agru||'').trim() || null,
      tranDateOverride: toDateStr(p.custpage_trandate_override),
      loteId: toInt(p.custpage_lote_id) || null,
      incluirFacturadas: (p.custpage_incluir_facturadas === 'T')
    };

    let banner = null;
    let previewRows = [];
    let totalCount = 0;
    let lastLoteId = null;

    function buildPreviewCurrent(){
      if (filtros.prevType === PREV_TYPES.FIN){
        if (filtros.loteId){
          const ids = loadFinIdsFromLote(filtros.loteId);
          const res = ids.length ? previewFIByIds(ids) : previewFIByFilters(filtros);
          previewRows = res.rows; totalCount = res.count;
        } else {
          const res = previewFIByFilters(filtros);
          previewRows = res.rows; totalCount = res.count;
        }
      } else {
        const res = previewSO(filtros);
        previewRows = res.rows; totalCount = res.count;
      }
    }

    function renderForm(){
      const totalAmount = (previewRows || []).reduce((acc, r)=>{
        const v = Number(r.total||0);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      const form = buildForm({ filtros, previewRows, totalCount, totalAmount, banner, lastLoteId });
      ctx.response.writePage(form);
    }

    if (req.method === 'GET'){
      renderForm();
      return;
    }

    const action = (p.custpage_action||'preview').toLowerCase();

    try{
      if (action === 'preview'){
        buildPreviewCurrent();
        banner = { type: message.Type.INFORMATION, title:'Vista previa', message:`Coincidencias: ${totalCount}` };
      }

      else if (action === 'emit'){
        let sourceJsonId = null;
        const upload = req.files ? req.files['custpage_json_upload'] : null;

        if (upload && upload.filename){
          upload.folder = INPUT_FOLDER_DEFAULT;
          if (!/\.json$/i.test(upload.name||upload.filename)){
            upload.name = (upload.filename||'ids') + '.json';
          }
          sourceJsonId = upload.save();
        } else {
          const ids = collectSOIds(filtros);
          if (!ids.length){
            banner = { type: message.Type.WARNING, title:'Sin resultados', message:'No se encontraron Órdenes de Servicio con esos filtros (según opción de incluir facturadas).' };
            previewRows = [];
            totalCount  = 0;
            renderForm();
            return;
          }
          sourceJsonId = saveIdsJson(ids, INPUT_FOLDER_DEFAULT, 'fi_emit_source_ids');
        }

        const loteId = createLote({ proceso:PROC.EMISION, jsonFileId: sourceJsonId, filtros, total:0 });
        lastLoteId = loteId;

        try { launchMR_Emit(loteId); } catch(e){ log.error('launchMR_Emit', e); }

        banner = { type: message.Type.CONFIRMATION, title:'Proceso iniciado', message:`Lote #${loteId} creado y en proceso.` };
        buildPreviewCurrent();
      }

      else if (action === 'void'){
        const loteId = filtros.loteId;
        if (!loteId){
          banner = { type: message.Type.WARNING, title:'Falta Lote', message:'Indica un Lote ID para ejecutar la Anulación.' };
          previewRows = [];
          totalCount  = 0;
          renderForm();
          return;
        }

        try { launchMR_Void(loteId); } catch(e){ log.error('launchMR_Void', e); }
        lastLoteId = loteId;

        banner = { type: message.Type.CONFIRMATION, title:'Anulación enviada', message:`Se inició la anulación para el Lote #${loteId}.` };

        filtros.prevType = PREV_TYPES.FIN;
        const ids = loadFinIdsFromLote(loteId);
        const res = ids.length ? previewFIByIds(ids) : { rows:[], count:0 };
        previewRows = res.rows; totalCount = res.count;
      }

      else if (action === 'export'){
        buildPreviewCurrent();
        const rows = (previewRows||[]).slice(0,200);
        const header = ['Tipo','ID','N° Doc','Fecha','Cliente','Importe','Moneda','Cod Agrupador','Estado'];

        function csvEscape(v){
          const s = (v==null?'':String(v));
          if (s.indexOf('"')>=0 || s.indexOf(',')>=0 || s.indexOf('\n')>=0) return '"' + s.replace(/"/g,'""') + '"';
          return s;
        }

        const body = [
          header.join(','),
          ...rows.map(r => [
            csvEscape(r.tipo||''),
            csvEscape(r.id||''),
            csvEscape(r.tranid||''),
            csvEscape(r.trandate||''),
            csvEscape(r.clienteT||''),
            csvEscape(r.total||''),
            //csvEscape(r.currencyName||''),
            csvEscape(r.codAgru||''),
            csvEscape(r.status||'')
          ].join(','))
        ].join('\n');

        const csv = file.create({
          name: 'preview.csv',
          fileType: file.Type.CSV,
          contents: body
        });
        ctx.response.writeFile(csv, true);
        return;
      }

    }catch(e){
      log.error('SuiteletError', e);
      banner = { type: message.Type.ERROR, title:'Error', message: (e.message||String(e)) };
    }

    renderForm();
  }

  return { onRequest };
});
