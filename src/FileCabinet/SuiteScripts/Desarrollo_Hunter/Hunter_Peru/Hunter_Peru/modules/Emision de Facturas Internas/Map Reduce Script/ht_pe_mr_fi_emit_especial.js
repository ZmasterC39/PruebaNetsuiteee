/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record','N/search','N/runtime','N/file','N/email','N/log'],
 (record, search, runtime, file, email, log) => {

  // =============================== Constantes ===============================
  const LOT_REC     = 'customrecord_ht_pe_fi_lote';
  const FLD_ESTADO  = 'custrecord_ht_pe_estado';
  const FLD_PARAMS  = 'custrecord_ht_pe_params';
  const FLD_TOTAL   = 'custrecord_ht_pe_total';
  const FLD_OK      = 'custrecord_ht_pe_ok';
  const FLD_ERR     = 'custrecord_ht_pe_err';
  const FLD_OUTFILE = 'custrecord_ht_pe_outputfile';
  const FLD_OUTFILE_FIN = 'custrecord_ht_pe_outputfile_fin';

  const ESTADO = { COMPLETADO:1, ERROR:2, PENDIENTE:3, PROCESANDO:4 };

  const FROM_TYPE_SOURCE         = 'salesorder';
  const TO_TYPE_INTERNAL_INVOICE = 'customsale_ec_factura_interna';

  const DEFAULT_OUTPUT_FOLDER_ID = 121602;
  const EMAIL_EMPLOYEE_ID = 49599;

  const FLD_CREATED_FROM_FI = 'custbody_ec_created_from_fac_int';
  const FLD_CUOTA_NUM       = 'custbody_ec_nro_cuota_fac_int';
  const FLD_COD_AGRU        = 'custbody_ht_cod_agru';
  const QUOTA_CONTROL_TYPES = { CUOTA:'CUOTA', MES:'MES' };
  const TRACE_BUILD         = 'ht_pe_mr_fi_emit_especial 2026-07-10 force-date-v3';

  // =============================== Governance / thresholds ===============================
  const USAGE_STOP_THRESHOLD = 350;
  const USAGE_SKIP_LOOKUP_THRESHOLD = 250;

  // =============================== Flujo especial por variables ===============================
  const SPECIAL_VARIABLE_FLOW = {
    enabled: true,
    variableOnlyMode: true,
    useConfiguredOrdersAsSource: true,
    runtime: {
      outputFolderId: DEFAULT_OUTPUT_FOLDER_ID,
      retrySoftMax: 1,
      tranDateOverride: null,
      useStartDate: true,
      agruPorItem: false,
      controlCuotas: false,
      mesGeneracion: null,
      generarHastaFinAnio: false,
      includeInvoiced: false
    },

    serviceCase: {
      enabled: false,
      itemIds: [47930],
      targetMonthKey: '2026-05',
      soTranIdsText: [
        // 'OS-PE-S001-XXXXXXXXXX'
      ].join('\n')
    },

    deviceCase: {
      enabled: false,
      itemIds: [46751, 46874],
      fixedAmount: 1,
      startMonthKey: '2026-05',
      soMonthsText: [
        '(1 DISP) OS-PE-S001-1102305392',
        '(3 DISP) OS-PE-S001-1102305394',
        '(3 DISP) OS-PE-S001-1102282870',
        '(3 DISP) OS-PE-S001-1102282871',
        '(4 DISP) OS-PE-S001-1102283562',
        '(4 DISP) OS-PE-S001-1102285973',
        '(5 DISP) OS-PE-S001-1102286384',
        '(5 DISP) OS-PE-S001-1102305367',
        '(5 DISP) OS-PE-S001-1102305363',
        '(5 DISP) OS-PE-S001-1102305360',
        '(5 DISP) OS-PE-S001-1102305357',
        '(5 DISP) OS-PE-S001-1102287019',
        '(5 DISP) OS-PE-S001-1102288443',
        '(6 DISP) OS-PE-S001-1102289437',
        '(6 DISP) OS-PE-S001-1102289440',
        '(6 DISP) OS-PE-S001-1102291408',
        '(8 DISP) OS-PE-S001-1102295529',
        '(8 DISP) OS-PE-S001-1102295773',
        '(9 DISP) OS-PE-S001-1102297142',
        '(10 DISP) OS-PE-S001-1102302629',
        '(10 DISP) OS-PE-S001-1102302631',
        '(10 DISP) OS-PE-S001-1102303106',
        '(11 DISP) OS-PE-S001-1102305717',
        '(11 DISP) OS-PE-S001-1102306363'
      ].join('\n')
    },

    differentialCase: {
      enabled: true,
      itemIds: [46090],
      targetItemId: 46877,
      targetMonthKey: '2026-05',
      defaultBaseAmount: 11,
      existingBaseAmountFrom: 12,
      createSingleFinPerOrder: true,
      soTargetAmountsText: [
        'OS-PE-S001-1102301757\t$17.00',
        'OS-PE-S001-1102301846\t$12.00',
        'OS-PE-S001-1102301849\t$12.00',
        'OS-PE-S001-1102301855\t$15.00',
        'OS-PE-S001-1102301859\t$12.00',
        'OS-PE-S001-1102301861\t$17.00',
        'OS-PE-S001-1102301869\t$12.00',
        'OS-PE-S001-1102301871\t$12.00',
        'OS-PE-S001-1102301873\t$16.00',
        'OS-PE-S001-1102301876\t$15.00',
        'OS-PE-S001-1102301877\t$13.00',
        'OS-PE-S001-1102301880\t$17.00',
        'OS-PE-S001-1102301881\t$13.00',
        'OS-PE-S001-1102301883\t$17.00',
        'OS-PE-S001-1102301894\t$14.00',
        'OS-PE-S001-1102301897\t$12.00',
        'OS-PE-S001-1102301899\t$16.00',
        'OS-PE-S001-1102301900\t$13.00',
        'OS-PE-S001-1102301901\t$17.00',
        'OS-PE-S001-1102301903\t$15.00',
        'OS-PE-S001-1102301905\t$15.00',
        'OS-PE-S001-1102301907\t$13.00',
        'OS-PE-S001-1102301909\t$17.00',
        'OS-PE-S001-1102301910\t$12.00',
        'OS-PE-S001-1102301911\t$16.00',
        'OS-PE-S001-1102301912\t$16.00',
        'OS-PE-S001-1102301913\t$12.00',
        'OS-PE-S001-1102301915\t$16.00',
        'OS-PE-S001-1102305771\t$20.00',
        'OS-PE-S001-1102306083\t$21.00',
        'OS-PE-S001-1102306087\t$12.00',
        'OS-PE-S001-1102306088\t$16.00',
        'OS-PE-S001-1102306090\t$16.00',
        'OS-PE-S001-1102309950\t$22.00',
        'OS-PE-S001-1102309954\t$21.00',
        'OS-PE-S001-1102309957\t$21.00',
        'OS-PE-S001-1102309964\t$21.00',
        'OS-PE-S001-1102309965\t$21.00',
        'OS-PE-S001-1102309967\t$21.00',
        'OS-PE-S001-1102309970\t$21.00',
        'OS-PE-S001-1102309973\t$21.00',
        'OS-PE-S001-1102309974\t$21.00',
        'OS-PE-S001-1102309975\t$21.00',
        'OS-PE-S001-1102309977\t$22.00',
        'OS-PE-S001-1102309978\t$22.00',
        'OS-PE-S001-1102309981\t$22.00',
        'OS-PE-S001-1102309984\t$22.00',
        'OS-PE-S001-1102309988\t$22.00',
        'OS-PE-S001-1102309989\t$22.00',
        'OS-PE-S001-1102309994\t$22.00',
        'OS-PE-S001-1102309999\t$22.00',
        'OS-PE-S001-1102310000\t$22.00',
        'OS-PE-S001-1102310001\t$22.00',
        'OS-PE-S001-1102310002\t$22.00',
        'OS-PE-S001-1102310005\t$22.00'
      ].join('\n'),
      cuotaBaseOverridesText: [
        // Sin overrides para la prueba 1.
      ].join('\n')
    }
  };

  // =============================== Helpers base ===============================
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
    if (v instanceof Date) return v;

    const s = String(v).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

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

    const t = Date.parse(s);
    return isNaN(t) ? null : new Date(t);
  }

  function fmtDate(d){
    try{
      if (!d) return '';
      const dt = (d instanceof Date) ? d : normalizeDate(d);
      if (!dt) return String(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth()+1).padStart(2,'0');
      const day = String(dt.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }catch(e){
      return String(d);
    }
  }

  function monthKeyFromDate(v){
    const dt = normalizeDate(v);
    if (!dt) return null;
    return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0');
  }

  function monthKeyToParts(monthKey){
    const s = String(monthKey || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]) };
  }

  function compareMonthKeys(a, b){
    const pa = monthKeyToParts(a);
    const pb = monthKeyToParts(b);
    if (!pa || !pb) return 0;
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.month - pb.month;
  }

  function isMonthWithinTargetScope(monthKey, targetMonthKey, generateToYearEnd){
    if (!targetMonthKey) return true;
    if (!monthKey) return false;
    if (!generateToYearEnd) return String(monthKey) === String(targetMonthKey);

    const pTarget = monthKeyToParts(targetMonthKey);
    const pMonth = monthKeyToParts(monthKey);
    if (!pTarget || !pMonth) return false;
    if (pMonth.year !== pTarget.year) return false;
    return compareMonthKeys(monthKey, targetMonthKey) >= 0;
  }

  function uniqueStrings(arr){
    const out = [];
    const seen = {};
    (arr || []).forEach(v => {
      const s = String(v || '').trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    return out;
  }

  function parseTranIdList(raw){
    return uniqueStrings(String(raw || '')
      .split(/\r?\n/)
      .map(line => String(line || '').trim())
      .filter(line => line && !/^\/\//.test(line) && !/^#/.test(line)));
  }

  function parseDispMonths(raw){
    const out = {};
    String(raw || '').split(/\r?\n/).forEach(line => {
      const clean = String(line || '').trim();
      if (!clean || /^\/\//.test(clean) || /^#/.test(clean)) return;

      const m = clean.match(/^\((\d+)\s*DISP\)\s*(.+)$/i);
      if (!m) return;

      const months = Number(m[1] || 0);
      const tranId = String(m[2] || '').trim();
      if (!tranId || months <= 0) return;
      out[tranId] = months;
    });
    return out;
  }

  function parseMoneyValue(raw){
    const clean = String(raw || '').replace(/\$/g, '').replace(/,/g, '').trim();
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  }

  function parseTargetAmounts(raw){
    const out = {};
    String(raw || '').split(/\r?\n/).forEach(line => {
      const clean = String(line || '').trim();
      if (!clean || /^\/\//.test(clean) || /^#/.test(clean)) return;

      const match = clean.match(/^(\S+)\s+\$?([\d.,]+)$/);
      if (!match) return;

      const tranId = String(match[1] || '').trim();
      const amount = parseMoneyValue(match[2]);
      if (!tranId || amount <= 0) return;
      out[tranId] = amount;
    });
    return out;
  }

  function parseQuotaBaseOverrides(raw){
    const out = {};
    String(raw || '').split(/\r?\n/).forEach(line => {
      const clean = String(line || '').trim();
      if (!clean || /^\/\//.test(clean) || /^#/.test(clean)) return;

      const match = clean.match(/^(\S+)\s*\|\s*(\d+)(?:\s*-\s*(\d+))?\s*\|\s*\$?([\d.,]+)$/);
      if (!match) return;

      const tranId = String(match[1] || '').trim();
      const startCuota = Number(match[2] || 0);
      const endCuota = Number(match[3] || match[2] || 0);
      const baseAmount = parseMoneyValue(match[4]);

      if (!tranId || startCuota <= 0 || endCuota < startCuota || baseAmount <= 0) return;
      if (!out[tranId]) out[tranId] = [];

      out[tranId].push({
        startCuota: startCuota,
        endCuota: endCuota,
        baseAmount: baseAmount
      });
    });
    return out;
  }

  function addMonthsToMonthKey(monthKey, monthsToAdd){
    const parts = monthKeyToParts(monthKey);
    if (!parts) return null;
    const dt = new Date(parts.year, parts.month - 1 + (Number(monthsToAdd) || 0), 1);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
  }

  function buildDateFromMonthKey(monthKey, seedDate){
    const parts = monthKeyToParts(monthKey);
    if (!parts) return null;

    const seed = normalizeDate(seedDate) || new Date(parts.year, parts.month - 1, 1);
    const day = seed.getDate();
    const lastDay = new Date(parts.year, parts.month, 0).getDate();
    return new Date(parts.year, parts.month - 1, Math.min(day, lastDay));
  }

  function buildSpecialFlowConfig(){
    const serviceSoTranIds = parseTranIdList(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.serviceCase && SPECIAL_VARIABLE_FLOW.serviceCase.soTranIdsText);
    const deviceMonthsByTranId = parseDispMonths(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.soMonthsText);
    const deviceSoTranIds = Object.keys(deviceMonthsByTranId || {});
    const differentialTargetAmountsByTranId = parseTargetAmounts(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.soTargetAmountsText);
    const differentialBaseOverridesByTranId = parseQuotaBaseOverrides(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.cuotaBaseOverridesText);
    const differentialSoTranIds = Object.keys(differentialTargetAmountsByTranId || {});
    const runtimeCfg = Object.assign({
      outputFolderId: DEFAULT_OUTPUT_FOLDER_ID,
      retrySoftMax: 1,
      tranDateOverride: null,
      useStartDate: false,
      agruPorItem: false,
      controlCuotas: false,
      mesGeneracion: null,
      generarHastaFinAnio: false,
      includeInvoiced: false
    }, (SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.runtime) || {});
    return {
      enabled: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.enabled),
      variableOnlyMode: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.variableOnlyMode),
      useConfiguredOrdersAsSource: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.useConfiguredOrdersAsSource),
      runtime: runtimeCfg,
      serviceCase: {
        enabled: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.serviceCase && SPECIAL_VARIABLE_FLOW.serviceCase.enabled),
        itemIds: ((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.serviceCase && SPECIAL_VARIABLE_FLOW.serviceCase.itemIds) || []).map(Number).filter(Boolean),
        targetMonthKey: (SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.serviceCase && SPECIAL_VARIABLE_FLOW.serviceCase.targetMonthKey) || null,
        soTranIds: serviceSoTranIds
      },
      deviceCase: {
        enabled: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.enabled),
        itemIds: ((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.itemIds) || []).map(Number).filter(Boolean),
        fixedAmount: Number((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.fixedAmount) || 0) || 0,
        startMonthKey: (SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.startMonthKey) || null,
        monthsByTranId: deviceMonthsByTranId,
        soTranIds: deviceSoTranIds
      },
      differentialCase: {
        enabled: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.enabled),
        itemIds: ((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.itemIds) || []).map(Number).filter(Boolean),
        targetItemId: Number((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.targetItemId) || 0) || 0,
        targetMonthKey: (SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.targetMonthKey) || null,
        defaultBaseAmount: Number((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.defaultBaseAmount) || 0) || 0,
        existingBaseAmountFrom: Number((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.existingBaseAmountFrom) || 0) || 0,
        createSingleFinPerOrder: !!(SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.createSingleFinPerOrder),
        targetAmountsByTranId: differentialTargetAmountsByTranId,
        cuotaBaseOverridesByTranId: differentialBaseOverridesByTranId,
        soTranIds: differentialSoTranIds
      },
      allSoTranIds: uniqueStrings(
        []
          .concat((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.serviceCase && SPECIAL_VARIABLE_FLOW.serviceCase.enabled) ? serviceSoTranIds : [])
          .concat((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.deviceCase && SPECIAL_VARIABLE_FLOW.deviceCase.enabled) ? deviceSoTranIds : [])
          .concat((SPECIAL_VARIABLE_FLOW && SPECIAL_VARIABLE_FLOW.differentialCase && SPECIAL_VARIABLE_FLOW.differentialCase.enabled) ? differentialSoTranIds : [])
      )
    };
  }

  const SPECIAL_FLOW_CONFIG = buildSpecialFlowConfig();

  function buildVariableOnlyParams(){
    const runtimeCfg = SPECIAL_FLOW_CONFIG.runtime || {};
    return {
      filters: {
        tranDateOverride: runtimeCfg.tranDateOverride || null,
        usarStartDate: !!runtimeCfg.useStartDate,
        agruPorItem: !!runtimeCfg.agruPorItem,
        controlCuotas: !!runtimeCfg.controlCuotas,
        mesGeneracion: runtimeCfg.mesGeneracion || null,
        generarHastaFinAnio: !!runtimeCfg.generarHastaFinAnio
      },
      technical: {
        retrySoftMax: Math.max(0, toIntSafe(runtimeCfg.retrySoftMax) || 1),
        includeInvoiced: !!runtimeCfg.includeInvoiced
      },
      outputFolderId: toIntSafe(runtimeCfg.outputFolderId) || DEFAULT_OUTPUT_FOLDER_ID
    };
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

  function saveJsonRaw (jsonString, baseName, folderId) {
    const fid = toIntSafe(folderId);
    if (!fid) throw new Error('INVALID_OUTPUT_FOLDER: folderId=0/NaN.');
    const f = file.create({
      name: `${baseName}_${yyyymmdd()}.json`,
      fileType: file.Type.JSON,
      contents: jsonString,
      folder: fid,
      isOnline: false
    });
    return f.save();
  }

  // =============================== Safe error / safe ops ===============================
  function safeToString(e){
    try{
      if (e === null) return 'null';
      if (typeof e === 'undefined') return 'undefined';
      if (typeof e === 'string') return e;

      const out = {
        type: e && e.type,
        name: e && e.name,
        message: e && e.message,
        id: e && e.id,
        details: e && e.details,
        stack: e && e.stack
      };
      try { return JSON.stringify(out); } catch(_) {}
      return String(e);
    }catch(_){
      try { return String(e); } catch(__) { return '[unstringifiable error]'; }
    }
  }

  function safeErrorInfo(e){
    const out = { name: 'ERR', message: '', stack: '' };
    try { if (e && e.name) out.name = String(e.name); } catch(_){}
    try { if (e && e.message) out.message = String(e.message); } catch(_){}
    try { if (e && e.stack) out.stack = String(e.stack); } catch(_){}
    if (!out.message) out.message = safeToString(e);
    return out;
  }

  function safeWrite(ctx, key, valueObjOrString){
    try{
      const v = (typeof valueObjOrString === 'string') ? valueObjOrString : JSON.stringify(valueObjOrString);
      ctx.write(key, v);
      return true;
    }catch(e){
      log.error('CTX_WRITE_FAILED', { key, err: safeErrorInfo(e) });
      return false;
    }
  }

  function looksTransient (e) {
    let m = '', n = '';
    try { m = String((e && e.message) || '').toLowerCase(); } catch(_){}
    try { n = String((e && e.name) || '').toLowerCase(); } catch(_){}
    return m.includes('record is locked') ||
           m.includes('usage') ||
           m.includes('sss_usage_limit_exceeded') ||
           m.includes('unexpected error') ||
           n.includes('sss_usage_limit_exceeded');
  }

  function safeSaveRecord(rec, contextObj){
    try {
      return rec.save({ enableSourcing:false, ignoreMandatoryFields:false });
    } catch (e) {
      const msg = 'SAVE_FAILED ' + safeToString(e);
      log.error('SAVE_FAILED', Object.assign({ msg }, contextObj || {}));
      throw new Error(msg);
    }
  }

  function sameCalendarDate(a, b){
    const da = normalizeDate(a);
    const db = normalizeDate(b);
    return !!(da && db &&
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate());
  }

  function forceSavedInvoiceDate(invId, expectedDate, updateStartDate){
    const expected = normalizeDate(expectedDate);
    if (!invId || !expected) return;

    let saved = record.load({
      type: TO_TYPE_INTERNAL_INVOICE,
      id: invId,
      isDynamic: false
    });
    const currentDate = saved.getValue({ fieldId:'trandate' });
    const currentStartDate = updateStartDate ? saved.getValue({ fieldId:'startdate' }) : null;

    if (!sameCalendarDate(currentDate, expected) ||
        (updateStartDate && !sameCalendarDate(currentStartDate, expected))){
      saved.setValue({ fieldId:'trandate', value:expected });
      if (updateStartDate) setIfHasField(saved, 'startdate', expected);
      saved.save({ enableSourcing:false, ignoreMandatoryFields:false });
    }

    saved = record.load({
      type: TO_TYPE_INTERNAL_INVOICE,
      id: invId,
      isDynamic: false
    });
    const verifiedDate = saved.getValue({ fieldId:'trandate' });
    if (!sameCalendarDate(verifiedDate, expected)){
      throw new Error('TRANDATE_NOT_PERSISTED expected=' + fmtDate(expected) + ' actual=' + fmtDate(verifiedDate));
    }
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
      log.error('setIfHasFieldError', { fieldId, err: safeErrorInfo(e) });
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

  function getRemainingUsage(){
    try { return runtime.getCurrentScript().getRemainingUsage(); } catch(_) { return 999999; }
  }

  function logTrace(title, details){
    try {
      let text = '';
      if (typeof details === 'string') text = details;
      else text = JSON.stringify(details);
      if (text && text.length > 3900) text = text.slice(0, 3900) + '...<truncated>';
      log.audit(title, text);
    } catch (e) {
      try { log.audit(title, safeToString(details)); } catch (_ignoreLog) {}
    }
  }

  // =============================== Reanudar / validar existentes ===============================
  function findExistingFiKeysBySO(soIds){
    const out = {};
    if (!soIds || !soIds.length) return out;

    logTrace('TRACE_EXISTING_KEYS_START', {
      soCount: soIds.length,
      soIds: soIds.slice(0, 50)
    });

    const batches = chunk(soIds.map(String), 1000);
    for (let b=0; b<batches.length; b++){
      let rowCount = 0;
      const sampleRows = [];
      const s = search.create({
        type: 'transaction',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','F'],'AND',
          ['createdfrom','anyof', batches[b]]
        ],
        columns: [
          search.createColumn({ name:'createdfrom' }),
          search.createColumn({ name:'item' }),
          search.createColumn({ name: FLD_CUOTA_NUM }),
          search.createColumn({ name:'trandate' })
        ]
      });

      s.run().each(r=>{
        rowCount++;
        const soId = Number(r.getValue({ name:'createdfrom' }) || 0);
        const itemId = Number(r.getValue({ name:'item' }) || 0);
        const cuota = Number(r.getValue({ name: FLD_CUOTA_NUM }) || 0);
        const monthKey = monthKeyFromDate(r.getValue({ name:'trandate' }));

        if (sampleRows.length < 20){
          sampleRows.push({
            soId,
            itemId,
            cuota,
            monthKey
          });
        }

        if (soId){
          if (!out[soId]) out[soId] = { cuotaKeys: new Set(), monthKeys: new Set(), cuotaNums: new Set(), monthOnlyKeys: new Set() };

          if (itemId && cuota > 0){
            out[soId].cuotaKeys.add(String(itemId) + '|' + String(cuota));
          }

          if (itemId && monthKey){
            out[soId].monthKeys.add(String(itemId) + '|' + String(monthKey));
          }

          if (cuota > 0){
            out[soId].cuotaNums.add(String(cuota));
          }

          if (monthKey){
            out[soId].monthOnlyKeys.add(String(monthKey));
          }
        }
        return true;
      });

      logTrace('TRACE_EXISTING_KEYS_BATCH', {
        batchIndex: b + 1,
        batchSize: batches[b].length,
        soIds: batches[b].slice(0, 50),
        rowCount,
        sampleRows
      });
    }

    logTrace('TRACE_EXISTING_KEYS_DONE', {
      matchedSoCount: Object.keys(out).length,
      matchedSoIds: Object.keys(out).slice(0, 50)
    });

    return out;
  }

  function collectDiagnosticSearchRows(filters){
    const rows = [];
    let totalCount = 0;
    search.create({
      type: 'transaction',
      filters: filters,
      columns: [
        search.createColumn({ name:'internalid' }),
        search.createColumn({ name:'tranid' }),
        search.createColumn({ name:'item' }),
        search.createColumn({ name:'amount' }),
        search.createColumn({ name:'rate' }),
        search.createColumn({ name:'createdfrom' }),
        search.createColumn({ name: FLD_CREATED_FROM_FI }),
        search.createColumn({ name: FLD_CUOTA_NUM }),
        search.createColumn({ name:'trandate' })
      ]
    }).run().each(r => {
      totalCount++;
      if (rows.length < 15){
        rows.push({
          id: Number(r.getValue({ name:'internalid' }) || r.id || 0),
          tranId: String(r.getValue({ name:'tranid' }) || '').trim(),
          itemId: Number(r.getValue({ name:'item' }) || 0),
          amount: Number(r.getValue({ name:'amount' }) || 0) || 0,
          rate: Number(r.getValue({ name:'rate' }) || 0) || 0,
          createdfrom: Number(r.getValue({ name:'createdfrom' }) || 0) || 0,
          bodyCreatedFrom: Number(r.getValue({ name: FLD_CREATED_FROM_FI }) || 0) || 0,
          cuotaNum: Number(r.getValue({ name: FLD_CUOTA_NUM }) || 0) || 0,
          monthKey: monthKeyFromDate(r.getValue({ name:'trandate' })) || null
        });
      }
      return true;
    });
    return { totalCount, sampleRows: rows };
  }

  function logExistingFiDiagnostics(soId){
    const diagnosticCases = [
      {
        label: 'BY_CREATEDFROM_MAINLINE_F',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','F'],'AND',
          ['createdfrom','anyof', String(soId)]
        ]
      },
      {
        label: 'BY_BODY_CREATED_FROM_MAINLINE_F',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','F'],'AND',
          [FLD_CREATED_FROM_FI,'anyof', String(soId)]
        ]
      },
      {
        label: 'BY_CREATEDFROM_NO_MAINLINE',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['createdfrom','anyof', String(soId)]
        ]
      },
      {
        label: 'BY_BODY_CREATED_FROM_NO_MAINLINE',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          [FLD_CREATED_FROM_FI,'anyof', String(soId)]
        ]
      }
    ];

    const diagnostics = [];
    for (let i=0; i<diagnosticCases.length; i++){
      const diag = diagnosticCases[i];
      try {
        const diagnosticResult = collectDiagnosticSearchRows(diag.filters);
        diagnostics.push({
          label: diag.label,
          count: diagnosticResult.totalCount || 0,
          sampleRows: diagnosticResult.sampleRows || []
        });
      } catch (e) {
        diagnostics.push({
          label: diag.label,
          error: safeErrorInfo(e)
        });
      }
    }

    logTrace('TRACE_EXISTING_FI_DIAGNOSTICS', {
      soId,
      diagnostics
    });
  }

  function getExistingFiRecordsBySO(soId){
    const out = [];
    if (!soId) return out;

    logTrace('TRACE_EXISTING_FI_SEARCH_START', { soId });

    try {
      search.create({
        type: 'transaction',
        filters: [
          ['recordtype','is', TO_TYPE_INTERNAL_INVOICE],'AND',
          ['mainline','is','F'],'AND',
          ['createdfrom','anyof', String(soId)]
        ],
        columns: [
          search.createColumn({ name:'internalid' }),
          search.createColumn({ name:'tranid' }),
          search.createColumn({ name:'item' }),
          search.createColumn({ name:'amount' }),
          search.createColumn({ name:'rate' }),
          search.createColumn({ name:'quantity' }),
          search.createColumn({ name: FLD_CUOTA_NUM }),
          search.createColumn({ name:'trandate' })
        ]
      }).run().each(r => {
        out.push({
          id: Number(r.getValue({ name:'internalid' }) || r.id || 0),
          tranId: String(r.getValue({ name:'tranid' }) || '').trim(),
          itemId: Number(r.getValue({ name:'item' }) || 0),
          amount: Number(r.getValue({ name:'amount' }) || 0) || 0,
          rate: Number(r.getValue({ name:'rate' }) || 0) || 0,
          quantity: Number(r.getValue({ name:'quantity' }) || 0) || 0,
          cuotaNum: Number(r.getValue({ name: FLD_CUOTA_NUM }) || 0) || 0,
          monthKey: monthKeyFromDate(r.getValue({ name:'trandate' })) || null
        });
        return true;
      });
    } catch (e) {
      log.error('getExistingFiRecordsBySOError', { soId, err: safeErrorInfo(e) });
    }

    logTrace('TRACE_EXISTING_FI_SEARCH_DONE', {
      soId,
      count: out.length,
      sampleRows: out.slice(0, 20)
    });

    if (!out.length) {
      logExistingFiDiagnostics(soId);
    }

    return out;
  }

  function amountsAreEqual(a, b){
    return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.0001;
  }

  function updateInternalInvoiceLineAmount(finId, itemId, targetAmount){
    const target = round2(targetAmount);
    let rec = null;

    try {
      rec = record.load({
        type: TO_TYPE_INTERNAL_INVOICE,
        id: finId,
        isDynamic: false
      });
    } catch (e) {
      log.error('updateInternalInvoiceLineAmountLoadError', { finId, itemId, targetAmount: target, err: safeErrorInfo(e) });
      throw e;
    }

    const lineCount = rec.getLineCount({ sublistId:'item' }) || 0;
    let updated = false;
    const inspectedLines = [];

    for (let i=0; i<lineCount; i++){
      const currentItemId = Number(rec.getSublistValue({ sublistId:'item', fieldId:'item', line:i }) || 0);
      const qty = Number(rec.getSublistValue({ sublistId:'item', fieldId:'quantity', line:i }) || 1) || 1;
      const currentRate = Number(rec.getSublistValue({ sublistId:'item', fieldId:'rate', line:i }) || 0) || 0;
      const currentAmount = Number(rec.getSublistValue({ sublistId:'item', fieldId:'amount', line:i }) || 0) || 0;
      const newRate = round2(target / qty);

      inspectedLines.push({
        line: i,
        currentItemId,
        qty,
        currentRate,
        currentAmount,
        targetItemId: Number(itemId || 0) || 0,
        targetAmount: target,
        candidateMatch: !(itemId && currentItemId !== Number(itemId || 0))
      });

      if (itemId && currentItemId !== Number(itemId || 0)) continue;

      if (amountsAreEqual(currentRate, newRate)) {
        updated = true;
        logTrace('TRACE_UPDATE_EXISTING_FI_SKIP_SAME_RATE', {
          finId,
          itemId,
          targetAmount: target,
          line: i,
          qty,
          currentRate,
          currentAmount
        });
        break;
      }

      try {
        rec.setSublistValue({ sublistId:'item', fieldId:'price', line:i, value:-1 });
      } catch (_ignorePrice) {}

      rec.setSublistValue({ sublistId:'item', fieldId:'quantity', line:i, value: qty });
      rec.setSublistValue({ sublistId:'item', fieldId:'rate', line:i, value: newRate });
      try {
        rec.setSublistValue({ sublistId:'item', fieldId:'amount', line:i, value: target });
      } catch (_ignoreAmount) {}
      updated = true;
      break;
    }

    logTrace('TRACE_UPDATE_EXISTING_FI_LINES', {
      finId,
      itemId,
      targetAmount: target,
      lineCount,
      updated,
      inspectedLines
    });

    if (!updated) {
      throw new Error('TARGET_FI_LINE_NOT_FOUND');
    }

    const savedId = safeSaveRecord(rec, {
      finId,
      itemId,
      targetAmount: target,
      remainingUsage: getRemainingUsage()
    });

    logTrace('TRACE_UPDATE_EXISTING_FI_SAVED', {
      finId,
      savedId,
      itemId,
      targetAmount: target
    });

    return savedId;
  }

  function adjustExistingBaseInvoicesForDifferential(soId, soTranId, specialRule, ctx){
    const sourceItemIds = ((specialRule && specialRule.sourceItemIds) || []).map(Number).filter(Boolean);
    const existingBaseAmountFrom = Number(specialRule && specialRule.existingBaseAmountFrom || 0) || 0;
    const targetBaseAmount = Number(specialRule && specialRule.defaultBaseAmount || 0) || 0;
    const differentialAmount = round2(Number(specialRule && specialRule.targetAmount || 0) - targetBaseAmount);
    const cuotasToAdjust = Math.max(0, Math.round(differentialAmount));
    if (!soId || !sourceItemIds.length || targetBaseAmount <= 0) return;
    if (cuotasToAdjust <= 0) return;

    const rawExistingRecords = getExistingFiRecordsBySO(soId);
    const filteredExistingRecords = rawExistingRecords
      .filter(recInfo => {
        const itemId = Number(recInfo && recInfo.itemId || 0) || 0;
        const amount = Number(recInfo && recInfo.amount || 0) || 0;
        const rate = Number(recInfo && recInfo.rate || 0) || 0;
        if (sourceItemIds.indexOf(itemId) < 0) return false;
        if (existingBaseAmountFrom > 0 && !amountsAreEqual(amount, existingBaseAmountFrom) && !amountsAreEqual(rate, existingBaseAmountFrom)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cuotaA = Number(a && a.cuotaNum || 0) || 0;
        const cuotaB = Number(b && b.cuotaNum || 0) || 0;
        if (cuotaA !== cuotaB) return cuotaB - cuotaA;

        const monthA = String(a && a.monthKey || '');
        const monthB = String(b && b.monthKey || '');
        if (monthA !== monthB) return monthB.localeCompare(monthA);

        return (Number(b && b.id || 0) || 0) - (Number(a && a.id || 0) || 0);
      });

    const existingRecords = filteredExistingRecords
      .sort((a, b) => {
        const cuotaA = Number(a && a.cuotaNum || 0) || 0;
        const cuotaB = Number(b && b.cuotaNum || 0) || 0;
        if (cuotaA !== cuotaB) return cuotaB - cuotaA;

        const monthA = String(a && a.monthKey || '');
        const monthB = String(b && b.monthKey || '');
        if (monthA !== monthB) return monthB.localeCompare(monthA);

        return (Number(b && b.id || 0) || 0) - (Number(a && a.id || 0) || 0);
      })
      .slice(0, cuotasToAdjust);

    logTrace('TRACE_ADJUST_EXISTING_FI_DECISION', {
      soId,
      soTranId,
      sourceItemIds,
      existingBaseAmountFrom,
      targetBaseAmount,
      targetAmount: Number(specialRule && specialRule.targetAmount || 0) || 0,
      differentialAmount,
      cuotasToAdjust,
      rawExistingCount: rawExistingRecords.length,
      rawExistingSample: rawExistingRecords.slice(0, 20),
      filteredCount: filteredExistingRecords.length,
      filteredSample: filteredExistingRecords.slice(0, 20),
      selectedCount: existingRecords.length,
      selectedSample: existingRecords.slice(0, 20)
    });

    if (!existingRecords.length) {
      logTrace('TRACE_ADJUST_EXISTING_FI_NOTHING_TO_UPDATE', {
        soId,
        soTranId,
        reason: 'NO_MATCHING_EXISTING_FIN_FOR_UPDATE'
      });
    }

    for (let i=0; i<existingRecords.length; i++){
      const recInfo = existingRecords[i] || {};
      const finId = Number(recInfo.id || 0) || 0;
      const itemId = Number(recInfo.itemId || 0) || 0;
      if (!finId) continue;

      logTrace('TRACE_ADJUST_EXISTING_FI_UPDATE_START', {
        soId,
        soTranId,
        finId,
        itemId,
        cuotaNum: recInfo.cuotaNum || null,
        monthKey: recInfo.monthKey || '',
        fromAmount: recInfo.amount || 0,
        fromRate: recInfo.rate || 0,
        toAmount: targetBaseAmount
      });

      const savedId = updateInternalInvoiceLineAmount(finId, itemId, targetBaseAmount);

      logTrace('TRACE_ADJUST_EXISTING_FI_UPDATE_DONE', {
        soId,
        soTranId,
        finId,
        savedId,
        itemId,
        cuotaNum: recInfo.cuotaNum || null,
        monthKey: recInfo.monthKey || '',
        targetBaseAmount
      });

      safeWrite(ctx, 'ok', {
        sourceTranId: soTranId,
        targetTranId: recInfo.tranId || (savedId ? lookupTranId(TO_TYPE_INTERNAL_INVOICE, savedId) : ''),
        cuota: recInfo.cuotaNum || null,
        cuotasTotal: null,
        mes: recInfo.monthKey || '',
        itemLine: null,
        itemId: String(itemId),
        codAgruIdx: null,
        msg: 'UPDATED_EXISTING_TO_' + String(targetBaseAmount)
      });
    }
  }

  // =============================== FECHAS (FIX) ===============================
  function addMonthsKeepDay(date, months){
    const base = new Date(date.getTime());
    const day = base.getDate();
    const y = base.getFullYear();
    const m = base.getMonth();
    const target = new Date(y, m + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, lastDay));
    return target;
  }

  function addDays(date, days){
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  function resolveCuotaDate(baseDate, lineInfo, cuotaIndex){
    const planDate = normalizeDate(baseDate);
    if (!planDate) return null;

    const freqRaw = String(lineInfo && lineInfo.billingFrequency || '').toUpperCase();
    const every = Number(lineInfo && lineInfo.billingRepeatEvery || 0) || 1;

    if (freqRaw === 'QUARTERLY') return addMonthsKeepDay(planDate, cuotaIndex * every * 3);
    if (freqRaw === 'MONTHLY' || !freqRaw) return addMonthsKeepDay(planDate, cuotaIndex * every);
    if (freqRaw === 'WEEKLY') return addDays(planDate, cuotaIndex * every * 7);
    if (freqRaw === 'ANNUAL' || freqRaw === 'YEARLY') return addMonthsKeepDay(planDate, cuotaIndex * every * 12);
    return addMonthsKeepDay(planDate, cuotaIndex * every);
  }

  function getPeriodsToSkip(originalBaseDate, effectiveBaseDate, lineInfo){
    const original = normalizeDate(originalBaseDate);
    const effective = normalizeDate(effectiveBaseDate);
    if (!original || !effective) return 0;
    if (effective <= original) return 0;

    const periods = Number(lineInfo && lineInfo.numPeriods || 0) || 1;
    const hasBillingSchedule = !!(lineInfo && lineInfo.billingScheduleId);

    // Si la línea no tiene billing schedule (o en la práctica solo emite 1 cuota),
    // la fecha override solo debe mover la fecha de emisión y convertirla en cuota 1.
    // No debe "consumir" periodos ni excluir la línea.
    if (!hasBillingSchedule || periods <= 1) return 0;

    const freqRaw = String(lineInfo && lineInfo.billingFrequency || '').toUpperCase();
    const every = Number(lineInfo && lineInfo.billingRepeatEvery || 0) || 1;

    const monthsDiff = ((effective.getFullYear() - original.getFullYear()) * 12) + (effective.getMonth() - original.getMonth());
    const daysDiff = Math.floor((effective.getTime() - original.getTime()) / 86400000);

    if (freqRaw === 'QUARTERLY') return Math.max(0, Math.floor(monthsDiff / (every * 3)));
    if (freqRaw === 'WEEKLY') return Math.max(0, Math.floor(daysDiff / (every * 7)));
    if (freqRaw === 'ANNUAL' || freqRaw === 'YEARLY') return Math.max(0, Math.floor(monthsDiff / (every * 12)));
    return Math.max(0, Math.floor(monthsDiff / every));
  }

  // =============================== Billing Plan ===============================
  function getBillingPlanForSO(soId, overrideTranDate, useStartDate){
    let originalBaseDate = new Date();
    let effectiveBaseDate = null;
    let soRec = null;

    const overrideDateObj = normalizeDate(overrideTranDate);
    const hasOverride = !!overrideDateObj;
    const preferredFieldId = useStartDate ? 'startdate' : 'trandate';
    const fallbackFieldId = useStartDate ? 'trandate' : 'startdate';

    try {
      soRec = record.load({ type: FROM_TYPE_SOURCE, id: soId, isDynamic: false });
      const tdVal = soRec.getValue({ fieldId: preferredFieldId }) || soRec.getValue({ fieldId: fallbackFieldId });
      const td = normalizeDate(tdVal);
      if (td) originalBaseDate = td;
    } catch(e){
      log.error('getBillingPlanForSO_loadError', { soId, err: safeErrorInfo(e) });
    }

    effectiveBaseDate = hasOverride ? overrideDateObj : originalBaseDate;
    return {
      baseDate: effectiveBaseDate,
      originalBaseDate,
      soRecord: soRec,
      hasOverride,
      overrideDate: overrideDateObj,
      useStartDate: !!useStartDate
    };
  }

  // =============================== BillingSchedule ===============================
  function getFirstNumericValue(v){
    if (v === null || typeof v === 'undefined') return null;
    const n = Number(String(v).replace(/,/g,'').trim());
    return isNaN(n) ? null : n;
  }

  function getBillingScheduleValue(bs, candidates){
    for (let i=0; i<candidates.length; i++){
      const fid = candidates[i];
      try{
        const val = bs.getValue({ fieldId: fid });
        const n = getFirstNumericValue(val);
        if (n !== null) return { fieldId: fid, value: n, raw: val };
      }catch(e){}
    }
    return { fieldId: null, value: null, raw: null };
  }

  function getLineBillingInfo(soRecord, line, cache){
    cache = cache || {};
    const bsId = soRecord.getSublistValue({ sublistId:'item', fieldId:'billingschedule', line });
    if (!bsId) return { bsId: null, numPeriods: 1, frequency:null, repeatEvery:1 };

    const key = String(bsId);
    if (!cache[key]){
      try {
        const bs = record.load({ type:'billingschedule', id: bsId, isDynamic:false });

        const nrInfo = getBillingScheduleValue(bs, ['numberremaining','numremaining','remaining','remainingperiods']);
        const rtInfo = getBillingScheduleValue(bs, ['recurrenceterms','recurringterms','terms','initialterms']);
        const rptInfo= getBillingScheduleValue(bs, ['repeatcount','repeat','count']);
        const everyInfo = getBillingScheduleValue(bs, ['repeatevery','repeatEvery','repeateverycount']);

        let freqRaw = '';
        try { freqRaw = String(bs.getValue({ fieldId:'frequency' }) || ''); } catch(e){}
        const freq = freqRaw.toUpperCase();

        const nr   = (nrInfo.value || 0);
        const rt   = (rtInfo.value || 0);
        const rpt  = (rptInfo.value || 0);
        const every= (everyInfo.value || 1) || 1;

        let periods = 1;
        if (nr > 0) periods = nr;
        else if (rt > 0) periods = rt;
        else if (rpt > 0) periods = rpt;

        cache[key] = { periods, frequency: freq, repeatEvery: every };

      } catch(e){
        log.error('billingScheduleLoadError', { bsId, err: safeErrorInfo(e) });
        cache[key] = { periods:1, frequency:null, repeatEvery:1 };
      }
    }

    const info = cache[key] || { periods:1, frequency:null, repeatEvery:1 };
    return { bsId, numPeriods: info.periods || 1, frequency: info.frequency || null, repeatEvery: info.repeatEvery || 1 };
  }

  function getBillableLines(soRecord){
    const lines = [];
    if (!soRecord) return lines;

    const billingCache = {};
    const lineCount = soRecord.getLineCount({ sublistId:'item' }) || 0;
    const mainDepartmentId = soRecord.getValue({ fieldId:'department' }) || null;

    for (let i=0; i<lineCount; i++){
      const amount = Number(soRecord.getSublistValue({ sublistId:'item', fieldId:'amount', line:i })) || 0;
      if (amount <= 0) continue;

      const sourceItemId   = soRecord.getSublistValue({ sublistId:'item', fieldId:'item', line:i });
      const groupedItemId  = soRecord.getSublistValue({ sublistId:'item', fieldId:'custcol_ht_so_item_agrupado', line:i });
      const itemToBill     = groupedItemId || sourceItemId;
      const billingInfo    = getLineBillingInfo(soRecord, i, billingCache);

      lines.push({
        line: i,
        amount,
        itemId: Number(itemToBill || 0),
        sourceItemId: Number(sourceItemId || 0),
        groupedItemId: Number(groupedItemId || 0),
        itemType: soRecord.getSublistValue({ sublistId:'item', fieldId:'itemtype', line:i }),
        locationId: soRecord.getSublistValue({ sublistId:'item', fieldId:'location', line:i }),
        quantity: Number(soRecord.getSublistValue({ sublistId:'item', fieldId:'quantity', line:i }) || 0),
        lineUniqueKey: soRecord.getSublistValue({ sublistId:'item', fieldId:'lineuniquekey', line:i }),
        numPeriods: billingInfo.numPeriods,
        billingScheduleId: billingInfo.bsId,
        billingFrequency: billingInfo.frequency,
        billingRepeatEvery: billingInfo.repeatEvery,
        mainDepartmentId: mainDepartmentId
      });
    }

    return lines;
  }

  // =============================== Inventario (igual) ===============================
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
          selected = { invNumberId: r.id, binNumberId: r.getValue({ name:'binnumber' }) || null };
          return false;
        }
        return true;
      });
    } catch (e){
      log.error('findInventoryNumberError', { itemId, locationId, requiredQty, err: safeErrorInfo(e) });
    }

    return selected;
  }

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
      log.error('inventoryDetailCreateError', { line, err: safeErrorInfo(e) });
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

  function buildTranIdFilterGroup(tranIds){
    const ids = uniqueStrings(tranIds);
    if (!ids.length) return null;
    const expr = [];
    ids.forEach((tranId, idx) => {
      if (idx > 0) expr.push('OR');
      expr.push(['tranid', 'is', tranId]);
    });
    return expr;
  }

  function resolveSalesOrderIdsFromTranIds(tranIds){
    const ids = uniqueStrings(tranIds);
    if (!ids.length) return [];

    const foundByTranId = {};
    const missingTranIds = [];

    for (let i=0; i<ids.length; i++){
      const tranId = ids[i];
      try {
        let matched = false;
        search.create({
          type: 'salesorder',
          filters: [
            ['mainline','is','T'],'AND',
            ['type','anyof','SalesOrd'],'AND',
            ['tranid','is', tranId]
          ],
          columns: [
            search.createColumn({ name:'internalid' }),
            search.createColumn({ name:'tranid' })
          ]
        }).run().each(r => {
          const foundTranId = String(r.getValue({ name:'tranid' }) || '').trim();
          const soId = Number(r.getValue({ name:'internalid' }) || r.id || 0);
          if (foundTranId && soId && !foundByTranId[foundTranId]) {
            foundByTranId[foundTranId] = soId;
          }
          matched = true;
          return false;
        });

        if (!matched) missingTranIds.push(tranId);
      } catch (e) {
        log.error('resolveSalesOrderIdsFromTranIdsError', { tranId, err: safeErrorInfo(e) });
        missingTranIds.push(tranId);
      }
    }

    if (missingTranIds.length){
      log.audit('SPECIAL_VARIABLE_SOURCE_MISSING_TRANIDS', {
        missingCount: missingTranIds.length,
        tranIds: missingTranIds
      });
    }

    return ids.map(tranId => Number(foundByTranId[tranId] || 0)).filter(Boolean);
  }

  function isSpecialSoConfigured(soTranId){
    if (!SPECIAL_FLOW_CONFIG.enabled) return false;
    const tranId = String(soTranId || '').trim();
    if (!tranId) return false;
    if (SPECIAL_FLOW_CONFIG.serviceCase.enabled && (SPECIAL_FLOW_CONFIG.serviceCase.soTranIds || []).indexOf(tranId) >= 0) return true;
    if (SPECIAL_FLOW_CONFIG.deviceCase.enabled && SPECIAL_FLOW_CONFIG.deviceCase.monthsByTranId && SPECIAL_FLOW_CONFIG.deviceCase.monthsByTranId[tranId]) return true;
    return !!(SPECIAL_FLOW_CONFIG.differentialCase.enabled && SPECIAL_FLOW_CONFIG.differentialCase.targetAmountsByTranId && SPECIAL_FLOW_CONFIG.differentialCase.targetAmountsByTranId[tranId]);
  }

  function lineHasConfiguredItem(lineInfo, itemIds){
    const validIds = (itemIds || []).map(Number).filter(Boolean);
    if (!validIds.length) return false;

    const lineIds = [
      Number(lineInfo && lineInfo.sourceItemId || 0),
      Number(lineInfo && lineInfo.groupedItemId || 0),
      Number(lineInfo && lineInfo.itemId || 0)
    ].filter(Boolean);

    for (let i=0; i<lineIds.length; i++){
      if (validIds.indexOf(lineIds[i]) >= 0) return true;
    }
    return false;
  }

  function getSpecialRuleForLine(soTranId, lineInfo){
    if (!SPECIAL_FLOW_CONFIG.enabled) return null;

    const tranId = String(soTranId || '').trim();
    if (!tranId) return null;

    const deviceMonths = Number((SPECIAL_FLOW_CONFIG.deviceCase.monthsByTranId && SPECIAL_FLOW_CONFIG.deviceCase.monthsByTranId[tranId]) || 0);
    if (SPECIAL_FLOW_CONFIG.deviceCase.enabled &&
        deviceMonths > 0 &&
        lineHasConfiguredItem(lineInfo, SPECIAL_FLOW_CONFIG.deviceCase.itemIds)){
      return {
        type: 'DEVICE_MONTHS',
        monthsCount: deviceMonths,
        fixedAmount: Number(SPECIAL_FLOW_CONFIG.deviceCase.fixedAmount || 0) || 0,
        startMonthKey: SPECIAL_FLOW_CONFIG.deviceCase.startMonthKey
      };
    }

    if (SPECIAL_FLOW_CONFIG.serviceCase.enabled &&
        (SPECIAL_FLOW_CONFIG.serviceCase.soTranIds || []).indexOf(tranId) >= 0 &&
        lineHasConfiguredItem(lineInfo, SPECIAL_FLOW_CONFIG.serviceCase.itemIds)){
      return {
        type: 'SERVICE_TARGET_MONTH',
        targetMonthKey: SPECIAL_FLOW_CONFIG.serviceCase.targetMonthKey
      };
    }

    const targetAmount = Number((SPECIAL_FLOW_CONFIG.differentialCase.targetAmountsByTranId && SPECIAL_FLOW_CONFIG.differentialCase.targetAmountsByTranId[tranId]) || 0);
    if (SPECIAL_FLOW_CONFIG.differentialCase.enabled &&
        targetAmount > 0 &&
        lineHasConfiguredItem(lineInfo, SPECIAL_FLOW_CONFIG.differentialCase.itemIds)){
      return {
        type: 'DIFFERENTIAL_AMOUNT',
        targetAmount: targetAmount,
        targetItemId: Number(SPECIAL_FLOW_CONFIG.differentialCase.targetItemId || 0) || 0,
        targetMonthKey: SPECIAL_FLOW_CONFIG.differentialCase.targetMonthKey || null,
        defaultBaseAmount: Number(SPECIAL_FLOW_CONFIG.differentialCase.defaultBaseAmount || 0) || 0,
        cuotaBaseOverrides: (SPECIAL_FLOW_CONFIG.differentialCase.cuotaBaseOverridesByTranId && SPECIAL_FLOW_CONFIG.differentialCase.cuotaBaseOverridesByTranId[tranId]) || [],
        existingBaseAmountFrom: Number(SPECIAL_FLOW_CONFIG.differentialCase.existingBaseAmountFrom || 0) || 0,
        createSingleFinPerOrder: !!SPECIAL_FLOW_CONFIG.differentialCase.createSingleFinPerOrder,
        sourceItemIds: (SPECIAL_FLOW_CONFIG.differentialCase.itemIds || []).map(Number).filter(Boolean)
      };
    }

    return null;
  }

  function getDifferentialBaseAmountForCuota(specialRule, cuotaNum){
    const defaultBaseAmount = Number(specialRule && specialRule.defaultBaseAmount || 0) || 0;
    const overrides = (specialRule && specialRule.cuotaBaseOverrides) || [];

    for (let i=0; i<overrides.length; i++){
      const rule = overrides[i] || {};
      const startCuota = Number(rule.startCuota || 0) || 0;
      const endCuota = Number(rule.endCuota || 0) || 0;
      if (cuotaNum >= startCuota && cuotaNum <= endCuota){
        return Number(rule.baseAmount || defaultBaseAmount || 0) || 0;
      }
    }

    return defaultBaseAmount;
  }

  function buildServiceExecutions(lineInfo, plan, specialRule){
    const executions = [];
    const targetMonthKey = specialRule && specialRule.targetMonthKey;
    if (!targetMonthKey) return executions;

    const originalNumCuotas = Math.max(1, Number(lineInfo && lineInfo.numPeriods || 0) || 1);
    const hasBillingSchedule = !!(lineInfo && lineInfo.billingScheduleId);

    if (hasBillingSchedule && originalNumCuotas > 1 && plan && plan.baseDate){
      for (let cuota = 0; cuota < originalNumCuotas; cuota++){
        const cuotaDate = resolveCuotaDate(plan.baseDate, lineInfo, cuota);
        const cuotaMonthKey = monthKeyFromDate(cuotaDate);
        if (String(cuotaMonthKey || '') !== String(targetMonthKey)) continue;

        executions.push({
          cuotaIndex: cuota,
          cuotaNum: cuota + 1,
          cuotaDate,
          cuotaMonthKey
        });
        break;
      }
    }

    if (!executions.length && (!hasBillingSchedule || originalNumCuotas <= 1)){
      executions.push({
        cuotaIndex: 0,
        cuotaNum: 1,
        cuotaDate: buildDateFromMonthKey(targetMonthKey, (plan && plan.baseDate) || (plan && plan.originalBaseDate)),
        cuotaMonthKey: targetMonthKey
      });
    }

    return executions;
  }

  function buildDeviceExecutions(plan, specialRule){
    const executions = [];
    const monthsCount = Number(specialRule && specialRule.monthsCount || 0);
    const startMonthKey = specialRule && specialRule.startMonthKey;
    if (monthsCount <= 0 || !startMonthKey) return executions;

    for (let i=0; i<monthsCount; i++){
      const monthKey = addMonthsToMonthKey(startMonthKey, i);
      if (!monthKey) continue;
      executions.push({
        cuotaIndex: i,
        cuotaNum: i + 1,
        cuotaDate: buildDateFromMonthKey(monthKey, (plan && plan.baseDate) || (plan && plan.originalBaseDate)),
        cuotaMonthKey: monthKey,
        fixedAmountOverride: Number(specialRule && specialRule.fixedAmount || 0) || 0,
        periodsOverride: monthsCount
      });
    }

    return executions;
  }

  function buildDifferentialExecutions(plan, lineInfo, specialRule){
    const executions = [];
    const standardExecutions = buildStandardExecutions(plan, lineInfo);
    const targetAmount = Number(specialRule && specialRule.targetAmount || 0) || 0;
    const targetItemId = Number(specialRule && specialRule.targetItemId || 0) || 0;
    const createSingleFinPerOrder = !!(specialRule && specialRule.createSingleFinPerOrder);

    if (targetAmount <= 0 || !targetItemId) return executions;

    if (createSingleFinPerOrder) {
      let baseExecution = standardExecutions[0] || {
        cuotaIndex: 0,
        cuotaNum: 1,
        effectiveCuotaIndex: 0,
        cuotaDate: (plan && plan.baseDate) || null,
        cuotaMonthKey: monthKeyFromDate((plan && plan.baseDate) || null)
      };
      const targetMonthKey = specialRule && specialRule.targetMonthKey;
      if (targetMonthKey) {
        baseExecution = Object.assign({}, baseExecution, {
          cuotaDate: buildDateFromMonthKey(
            targetMonthKey,
            baseExecution.cuotaDate || (plan && plan.baseDate) || (plan && plan.originalBaseDate)
          ),
          cuotaMonthKey: targetMonthKey
        });
      }
      const baseAmountReference = getDifferentialBaseAmountForCuota(specialRule, Number(baseExecution.cuotaNum || 1) || 1);
      const differentialAmount = round2(targetAmount - baseAmountReference);
      if (differentialAmount > 0) {
        executions.push(Object.assign({}, baseExecution, {
          cuotaIndex: 0,
          cuotaNum: 1,
          effectiveCuotaIndex: 0,
          fixedAmountOverride: differentialAmount,
          periodsOverride: 1,
          targetItemIdOverride: targetItemId,
          effectiveItemId: targetItemId,
          targetMonthlyAmount: targetAmount,
          baseAmountReference: baseAmountReference
        }));
      }
      return executions;
    }

    for (let i=0; i<standardExecutions.length; i++){
      const execution = standardExecutions[i];
      const cuotaNum = Number(execution && execution.cuotaNum || 0) || (i + 1);
      const baseAmountReference = getDifferentialBaseAmountForCuota(specialRule, cuotaNum);
      const differentialAmount = round2(targetAmount - baseAmountReference);
      if (differentialAmount <= 0) continue;

      executions.push(Object.assign({}, execution, {
        fixedAmountOverride: differentialAmount,
        periodsOverride: 1,
        targetItemIdOverride: targetItemId,
        effectiveItemId: targetItemId,
        targetMonthlyAmount: targetAmount,
        baseAmountReference: baseAmountReference
      }));
    }

    return executions;
  }

  function buildStandardExecutions(plan, lineInfo){
    const executions = [];
    const originalNumCuotas = Math.max(1, Number(lineInfo && lineInfo.numPeriods || 0) || 1);
    const periodsToSkip = getPeriodsToSkip(plan && plan.originalBaseDate, plan && plan.baseDate, lineInfo);
    const numCuotas = Math.max(0, originalNumCuotas - periodsToSkip);

    for (let cuota = 0; cuota < numCuotas; cuota++){
      const cuotaNum = cuota + 1;
      const effectiveCuotaIndex = periodsToSkip + cuota;
      const cuotaDate = resolveCuotaDate(plan && plan.baseDate, lineInfo, cuota);
      const cuotaMonthKey = monthKeyFromDate(cuotaDate);

      executions.push({
        cuotaIndex: cuota,
        cuotaNum,
        effectiveCuotaIndex,
        cuotaDate,
        cuotaMonthKey
      });
    }

    return executions;
  }

  function getExecutionItemId(lineInfo, execution){
    return Number(
      (execution && execution.effectiveItemId) ||
      (execution && execution.targetItemIdOverride) ||
      (lineInfo && lineInfo.itemId) ||
      0
    ) || 0;
  }

  // =============================== getInputData ===============================
  function getInputData () {
    const cs = runtime.getCurrentScript();

    log.audit('TRACE_SCRIPT_VERSION', TRACE_BUILD);

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    let   OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id_1','custscript_ht_pe_output_folder_id']));
    let   RETRY_SOFT_MAX   = Math.max(0, toIntSafe(getParamAny(cs, ['custscript_ht_pe_retry_soft_max_1','custscript_ht_pe_retry_soft_max'])) || 1);

    const variableOnlyMode = !LOTE_ID && SPECIAL_FLOW_CONFIG.enabled && SPECIAL_FLOW_CONFIG.variableOnlyMode;

    let params = {};
    let filters = {};
    let technical = {};

    if (variableOnlyMode) {
      const variableParams = buildVariableOnlyParams();
      params = {
        source: 'SPECIAL_VARIABLES',
        filters: variableParams.filters,
        technical: variableParams.technical
      };
      filters = params.filters || {};
      technical = params.technical || {};
      RETRY_SOFT_MAX = Math.max(0, toIntSafe(technical.retrySoftMax) || 1);
      if (!OUTPUT_FOLDER_ID) OUTPUT_FOLDER_ID = toIntSafe(variableParams.outputFolderId) || DEFAULT_OUTPUT_FOLDER_ID;

      log.audit('VARIABLE_ONLY_MODE', {
        enabled: true,
        outputFolderId: OUTPUT_FOLDER_ID,
        retrySoftMax: RETRY_SOFT_MAX,
        configuredOrders: (SPECIAL_FLOW_CONFIG.allSoTranIds || []).length
      });
    } else {
      if (!LOTE_ID) throw new Error('MISSING_PARAM: custscript_ht_pe_lote_id vacio o 0.');
      if (!OUTPUT_FOLDER_ID) OUTPUT_FOLDER_ID = DEFAULT_OUTPUT_FOLDER_ID;

      const lote = record.load({ type: LOT_REC, id: LOTE_ID });
      lote.setValue({ fieldId: FLD_ESTADO, value: ESTADO.PROCESANDO });
      lote.save({ enableSourcing:true, ignoreMandatoryFields:true });

      params = JSON.parse(lote.getValue(FLD_PARAMS) || '{}');
      filters = params && params.filters || {};
      technical = params && params.technical || {};
    }

    const overrideDate = filters.tranDateOverride || null;
    const useStartDate = !!filters.usarStartDate;
    const agruPorItem = !!filters.agruPorItem;
    const controlCuotas = !!filters.controlCuotas;
    const mesGeneracionKey = monthKeyFromDate(filters.mesGeneracion || filters.tranDateOverride || null);
    const generateToYearEnd = !!filters.generarHastaFinAnio;
    const includeInvoiced = !!technical.includeInvoiced;

    const soIds = resolveInputIds(params) || [];

    const existingMap = findExistingFiKeysBySO(soIds);

    if (LOTE_ID) {
      record.submitFields({
        type: LOT_REC, id: LOTE_ID,
        values: { [FLD_TOTAL]: soIds.length }
      });
    }

    return soIds.map(id => {
      const soId = Number(id);
      const state = existingMap[soId] || {
        cuotaKeys: new Set(),
        monthKeys: new Set(),
        cuotaNums: new Set(),
        monthOnlyKeys: new Set()
      };

      const meta = {
        RETRY_SOFT_MAX,
        OUTPUT_FOLDER_ID,
        LOTE_ID,
        OVERRIDE_TRAN_DATE: overrideDate,
        USE_START_DATE: useStartDate,
        AGRU_POR_ITEM: agruPorItem,
        CONTROL_CUOTAS: controlCuotas,
        TARGET_MONTH_KEY: mesGeneracionKey,
        GENERATE_TO_YEAR_END: generateToYearEnd,
        INCLUDE_INVOICED: includeInvoiced,
        EXISTING_KEYS: Array.from(state.cuotaKeys || []),
        EXISTING_MONTH_KEYS: Array.from(state.monthKeys || []),
        EXISTING_CUOTA_NUMS: Array.from(state.cuotaNums || []),
        EXISTING_MONTH_ONLY_KEYS: Array.from(state.monthOnlyKeys || [])
      };

      return { id: soId, retry: 0, meta };
    });
  }

  // =============================== Resolver IDs ===============================
  function resolveInputIds (params) {
    if (SPECIAL_FLOW_CONFIG.enabled && SPECIAL_FLOW_CONFIG.useConfiguredOrdersAsSource) {
      const specialIds = resolveSalesOrderIdsFromTranIds(SPECIAL_FLOW_CONFIG.allSoTranIds || []);
      log.audit('SPECIAL_VARIABLE_SOURCE', {
        enabled: true,
        configuredOrders: (SPECIAL_FLOW_CONFIG.allSoTranIds || []).length,
        resolvedOrders: specialIds.length
      });
      return specialIds;
    }

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

  // =============================== map (PRIORIZA SIN BILLING SCHEDULE) ===============================
  function map (ctx) {
    const item    = JSON.parse(ctx.value);
    const soId    = Number(item.id);
    const attempt = Number(item.retry) || 0;
    const maxRetry= Number(item.meta && item.meta.RETRY_SOFT_MAX || 1);

    const existingCuotaKeysArr = (item.meta && item.meta.EXISTING_KEYS) ? item.meta.EXISTING_KEYS : [];
    const existingMonthKeysArr = (item.meta && item.meta.EXISTING_MONTH_KEYS) ? item.meta.EXISTING_MONTH_KEYS : [];
    const existingCuotaNumsArr = (item.meta && item.meta.EXISTING_CUOTA_NUMS) ? item.meta.EXISTING_CUOTA_NUMS : [];
    const existingMonthOnlyArr = (item.meta && item.meta.EXISTING_MONTH_ONLY_KEYS) ? item.meta.EXISTING_MONTH_ONLY_KEYS : [];
    const existingCuotaKeysSet = new Set((existingCuotaKeysArr || []).map(String));
    const existingMonthKeysSet = new Set((existingMonthKeysArr || []).map(String));
    const existingCuotaNumsSet = new Set((existingCuotaNumsArr || []).map(String));
    const existingMonthOnlySet = new Set((existingMonthOnlyArr || []).map(String));

    const controlCuotas = !!(item.meta && item.meta.CONTROL_CUOTAS);
    const targetMonthKey = item.meta && item.meta.TARGET_MONTH_KEY || null;
    const generateToYearEnd = !!(item.meta && item.meta.GENERATE_TO_YEAR_END);
    const includeInvoiced = !!(item.meta && item.meta.INCLUDE_INVOICED);

    let soTranId = '';
    try { soTranId = lookupTranId(FROM_TYPE_SOURCE, soId); } catch(e) { log.error('lookupSOTranId', { soId, err: safeErrorInfo(e) }); }

    // Cache cod_agru por SO
    let soCodAgru = '';
    try {
      const soInfo = search.lookupFields({ type:'salesorder', id: soId, columns:[FLD_COD_AGRU] });
      const raw = soInfo && soInfo[FLD_COD_AGRU];
      if (Array.isArray(raw)) {
        const v0 = raw[0];
        soCodAgru = v0 && (v0.value || v0.text) ? String(v0.value || v0.text) : '';
      } else if (raw && typeof raw === 'object') {
        soCodAgru = String(raw.value || raw.text || '');
      } else {
        soCodAgru = String(raw || '');
      }
      soCodAgru = (soCodAgru || '').trim();
    } catch(e) {
      log.error('SO_COD_AGRU_LOOKUP_ERR', { soId, err: safeErrorInfo(e) });
    }

    try {
      validateSourceOrder(soId);

      const plan = getBillingPlanForSO(
        soId,
        item.meta && item.meta.OVERRIDE_TRAN_DATE || null,
        !!(item.meta && item.meta.USE_START_DATE)
      );
      const billableLines = getBillableLines(plan && plan.soRecord);

      if (!billableLines.length){
        safeWrite(ctx, 'err', { sourceTranId: soTranId, cuota:null, cuotasTotal:null, code:'NO_BILLABLE_LINES', msg:'Sin líneas > 0.' });
        return;
      }

      // ✅ PRIORIZACIÓN: primero numPeriods=1, luego >1
      const shortLines = billableLines.filter(l => (Number(l.numPeriods)||1) === 1);
      const longLines  = billableLines.filter(l => (Number(l.numPeriods)||1) > 1);
      const orderedLines = shortLines.concat(longLines);

      // Mapa itemId -> índice (si agruPorItem)
      let itemToIdx = null;
      if (item.meta && item.meta.AGRU_POR_ITEM) {
        itemToIdx = {};
        let idx = 0;
        orderedLines.forEach(li => {
          const key = String(li.itemId || '');
          if (!key) return;
          if (!itemToIdx[key]) { idx++; itemToIdx[key] = idx; }
        });
      }

      let generatedCount = 0;
      for (let l=0; l<orderedLines.length; l++){
        const lineInfo = orderedLines[l];
        const originalNumCuotas = Math.max(1, Number(lineInfo.numPeriods || 0) || 1);
        const periodsToSkip = getPeriodsToSkip(plan && plan.originalBaseDate, plan && plan.baseDate, lineInfo);
        const numCuotas = Math.max(0, originalNumCuotas - periodsToSkip);
        if (numCuotas <= 0) continue;

        for (let cuota = 0; cuota < numCuotas; cuota++){
          const cuotaNum = cuota + 1;
          const effectiveCuotaIndex = periodsToSkip + cuota;
          const itemIdKey = String(lineInfo.itemId || '');
          const legacyCuotaKey = itemIdKey + '|' + String(effectiveCuotaIndex + 1);
          const cuotaDate = resolveCuotaDate(plan && plan.baseDate, lineInfo, cuota);
          const cuotaMonthKey = monthKeyFromDate(cuotaDate);
          const monthKey = (itemIdKey && cuotaMonthKey) ? (itemIdKey + '|' + cuotaMonthKey) : '';

          if (controlCuotas) {
            if (!isMonthWithinTargetScope(cuotaMonthKey, targetMonthKey, generateToYearEnd)) continue;
            if (!includeInvoiced) {
              const controlCuotaKey = itemIdKey + '|' + String(cuotaNum);
              const controlMonthKey = (itemIdKey && cuotaMonthKey) ? (itemIdKey + '|' + cuotaMonthKey) : '';
              if (existingCuotaKeysSet.has(controlCuotaKey)) continue;
              if (controlMonthKey && existingMonthKeysSet.has(controlMonthKey)) continue;
            }
          } else {
            if (existingCuotaKeysSet.has(legacyCuotaKey)) continue;
          }

          const rem = getRemainingUsage();
          if (rem < USAGE_STOP_THRESHOLD) {
            safeWrite(ctx, 'err', {
              sourceTranId: soTranId,
              cuota: cuotaNum,
              cuotasTotal: numCuotas,
              itemLine: lineInfo.line + 1,
              itemId: String(lineInfo.itemId),
              code: 'LOW_USAGE_STOP',
              msg: 'Stop preventivo. RemainingUsage=' + rem + '. Re-ejecuta para continuar.'
            });
            return;
          }

          try {
            const idxItem = (itemToIdx && lineInfo && lineInfo.itemId) ? (itemToIdx[String(lineInfo.itemId)] || null) : null;

            const invId = createInternalInvoice(soId, cuota, plan, lineInfo, idxItem, soCodAgru, cuotaNum);
            generatedCount++;
            existingCuotaKeysSet.add(itemIdKey + '|' + String(cuotaNum));
            if (monthKey) existingMonthKeysSet.add(monthKey);

            let fiTranId = '';
            const rem2 = getRemainingUsage();
            if (invId && rem2 >= USAGE_SKIP_LOOKUP_THRESHOLD) {
              try { fiTranId = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invId); } catch(e){ log.error('lookupFITranId', { invId, err: safeErrorInfo(e) }); }
            }

            safeWrite(ctx, 'ok', {
              sourceTranId: soTranId,
              targetTranId: fiTranId,
              cuota: cuotaNum,
              cuotasTotal: numCuotas,
              mes: cuotaMonthKey || '',
              itemLine: lineInfo.line + 1,
              itemId: String(lineInfo.itemId),
              codAgruIdx: idxItem || null,
              msg:'OK'
            });

            if (invId) safeWrite(ctx, 'ids', String(invId));

          } catch (e1) {
            const ei1 = safeErrorInfo(e1);

            if (looksTransient(e1) && attempt < maxRetry) {
              try {
                const idxItem = (itemToIdx && lineInfo && lineInfo.itemId) ? (itemToIdx[String(lineInfo.itemId)] || null) : null;
                const invRetryId = createInternalInvoice(soId, cuota, plan, lineInfo, idxItem, soCodAgru, cuotaNum);
                generatedCount++;
                existingCuotaKeysSet.add(itemIdKey + '|' + String(cuotaNum));
                if (monthKey) existingMonthKeysSet.add(monthKey);

                let fiTranId2 = '';
                const rem3 = getRemainingUsage();
                if (invRetryId && rem3 >= USAGE_SKIP_LOOKUP_THRESHOLD) {
                  try { fiTranId2 = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invRetryId); } catch(e2){ log.error('lookupFITranIdRetry', { invRetryId, err: safeErrorInfo(e2) }); }
                }

                safeWrite(ctx, 'ok', {
                  sourceTranId: soTranId,
                  targetTranId: fiTranId2,
                  cuota: cuotaNum,
                  cuotasTotal: numCuotas,
                  mes: cuotaMonthKey || '',
                  itemLine: lineInfo.line + 1,
                  itemId: String(lineInfo.itemId),
                  codAgruIdx: idxItem || null,
                  msg:'OK (retry)'
                });

                if (invRetryId) safeWrite(ctx, 'ids', String(invRetryId));
                continue;

              } catch(eRetry){
                const eiR = safeErrorInfo(eRetry);
                safeWrite(ctx, 'err', {
                  sourceTranId: soTranId,
                  cuota: cuotaNum,
                  cuotasTotal: numCuotas,
                  mes: cuotaMonthKey || '',
                  itemLine: lineInfo.line + 1,
                  itemId: String(lineInfo.itemId),
                  code: eiR.name,
                  msg: eiR.message
                });
                continue;
              }
            }

            safeWrite(ctx, 'err', {
              sourceTranId: soTranId,
              cuota: cuotaNum,
              cuotasTotal: numCuotas,
              mes: cuotaMonthKey || '',
              itemLine: lineInfo.line + 1,
              itemId: String(lineInfo.itemId),
              code: ei1.name,
              msg: ei1.message
            });
          }
        }
      }
      if (controlCuotas && generatedCount === 0) {
        safeWrite(ctx, 'err', {
          sourceTranId: soTranId,
          cuota: null,
          cuotasTotal: null,
          mes: targetMonthKey || '',
          code: 'NO_TARGET_MONTH_MATCH',
          msg: 'No hay cuotas pendientes para el alcance de mes seleccionado.'
        });
        return;
      }
    } catch (e) {
      const ei = safeErrorInfo(e);
      safeWrite(ctx, 'err', { sourceTranId: soTranId || ('SO:'+soId), cuota:null, cuotasTotal:null, code: ei.name, msg: ei.message });
    }
  }

  function mapSpecialAware (ctx) {
    const item    = JSON.parse(ctx.value);
    const soId    = Number(item.id);
    const attempt = Number(item.retry) || 0;
    const maxRetry= Number(item.meta && item.meta.RETRY_SOFT_MAX || 1);

    logTrace('TRACE_MAP_START', {
      build: TRACE_BUILD,
      soId,
      attempt,
      maxRetry
    });

    const existingCuotaKeysArr = (item.meta && item.meta.EXISTING_KEYS) ? item.meta.EXISTING_KEYS : [];
    const existingMonthKeysArr = (item.meta && item.meta.EXISTING_MONTH_KEYS) ? item.meta.EXISTING_MONTH_KEYS : [];
    const existingCuotaKeysSet = new Set((existingCuotaKeysArr || []).map(String));
    const existingMonthKeysSet = new Set((existingMonthKeysArr || []).map(String));

    const controlCuotas = !!(item.meta && item.meta.CONTROL_CUOTAS);
    const targetMonthKey = item.meta && item.meta.TARGET_MONTH_KEY || null;
    const generateToYearEnd = !!(item.meta && item.meta.GENERATE_TO_YEAR_END);
    const includeInvoiced = !!(item.meta && item.meta.INCLUDE_INVOICED);

    let soTranId = '';
    try { soTranId = lookupTranId(FROM_TYPE_SOURCE, soId); } catch(e) { log.error('lookupSOTranId', { soId, err: safeErrorInfo(e) }); }

    let soCodAgru = '';
    try {
      const soInfo = search.lookupFields({ type:'salesorder', id: soId, columns:[FLD_COD_AGRU] });
      const raw = soInfo && soInfo[FLD_COD_AGRU];
      if (Array.isArray(raw)) {
        const v0 = raw[0];
        soCodAgru = v0 && (v0.value || v0.text) ? String(v0.value || v0.text) : '';
      } else if (raw && typeof raw === 'object') {
        soCodAgru = String(raw.value || raw.text || '');
      } else {
        soCodAgru = String(raw || '');
      }
      soCodAgru = (soCodAgru || '').trim();
    } catch(e) {
      log.error('SO_COD_AGRU_LOOKUP_ERR', { soId, err: safeErrorInfo(e) });
    }

    try {
      validateSourceOrder(soId);

      const specialConfiguredSo = isSpecialSoConfigured(soTranId);
      const plan = getBillingPlanForSO(
        soId,
        specialConfiguredSo ? null : (item.meta && item.meta.OVERRIDE_TRAN_DATE || null),
        !!(item.meta && item.meta.USE_START_DATE)
      );
      const billableLines = getBillableLines(plan && plan.soRecord);

      if (!billableLines.length){
        safeWrite(ctx, 'err', { sourceTranId: soTranId, cuota:null, cuotasTotal:null, code:'NO_BILLABLE_LINES', msg:'Sin lineas > 0.' });
        return;
      }

      const shortLines = billableLines.filter(l => (Number(l.numPeriods)||1) === 1);
      const longLines  = billableLines.filter(l => (Number(l.numPeriods)||1) > 1);
      const orderedLines = shortLines.concat(longLines);
      const linesToProcess = specialConfiguredSo
        ? orderedLines.filter(li => !!getSpecialRuleForLine(soTranId, li))
        : orderedLines;

      if (!linesToProcess.length){
        safeWrite(ctx, 'err', {
          sourceTranId: soTranId,
          cuota: null,
          cuotasTotal: null,
          code: specialConfiguredSo ? 'NO_SPECIAL_ITEMS' : 'NO_BILLABLE_LINES',
          msg: specialConfiguredSo
            ? 'La OS configurada no tiene lineas con los items especiales definidos.'
            : 'Sin lineas > 0.'
        });
        return;
      }

      let itemToIdx = null;
      if (item.meta && item.meta.AGRU_POR_ITEM) {
        itemToIdx = {};
        let idx = 0;
        linesToProcess.forEach(li => {
          const key = String(li.itemId || '');
          if (!key) return;
          if (!itemToIdx[key]) { idx++; itemToIdx[key] = idx; }
        });
      }

      let generatedCount = 0;
      let differentialBaseInvoicesAdjusted = false;
      for (let l=0; l<linesToProcess.length; l++){
        const lineInfo = linesToProcess[l];
        const specialRule = specialConfiguredSo ? getSpecialRuleForLine(soTranId, lineInfo) : null;

        if (specialRule && specialRule.type === 'DIFFERENTIAL_AMOUNT') {
          logTrace('TRACE_DIFFERENTIAL_RULE_MATCH', {
            soId,
            soTranId,
            line: lineInfo.line + 1,
            lineItemId: lineInfo.itemId,
            sourceItemId: lineInfo.sourceItemId,
            groupedItemId: lineInfo.groupedItemId,
            lineAmount: lineInfo.amount,
            linePeriods: lineInfo.numPeriods,
            targetAmount: specialRule.targetAmount,
            defaultBaseAmount: specialRule.defaultBaseAmount,
            existingBaseAmountFrom: specialRule.existingBaseAmountFrom,
            createSingleFinPerOrder: specialRule.createSingleFinPerOrder
          });
        }

        if (specialRule && specialRule.type === 'DIFFERENTIAL_AMOUNT' && !differentialBaseInvoicesAdjusted) {
          adjustExistingBaseInvoicesForDifferential(soId, soTranId, specialRule, ctx);
          differentialBaseInvoicesAdjusted = true;
        }

        const executions = specialRule
          ? (specialRule.type === 'DEVICE_MONTHS'
              ? buildDeviceExecutions(plan, specialRule)
              : (specialRule.type === 'DIFFERENTIAL_AMOUNT'
                  ? buildDifferentialExecutions(plan, lineInfo, specialRule)
                  : buildServiceExecutions(lineInfo, plan, specialRule)))
          : buildStandardExecutions(plan, lineInfo);

        if (!executions.length) continue;

        for (let eIdx = 0; eIdx < executions.length; eIdx++){
          const execution = executions[eIdx];
          const cuotaNum = Number(execution.cuotaNum || 0) || (eIdx + 1);
          const effectiveCuotaIndex = (typeof execution.effectiveCuotaIndex !== 'undefined')
            ? Number(execution.effectiveCuotaIndex || 0)
            : Number(execution.cuotaIndex || 0);
          const executionItemId = getExecutionItemId(lineInfo, execution);
          const itemIdKey = String(executionItemId || lineInfo.itemId || '');
          const legacyCuotaKey = itemIdKey + '|' + String(effectiveCuotaIndex + 1);
          const cuotaMonthKey = execution.cuotaMonthKey || monthKeyFromDate(execution.cuotaDate);
          const monthKey = (itemIdKey && cuotaMonthKey) ? (itemIdKey + '|' + cuotaMonthKey) : '';

          if (specialRule) {
            if (!includeInvoiced) {
              const controlCuotaKey = itemIdKey + '|' + String(cuotaNum);
              if (existingCuotaKeysSet.has(controlCuotaKey)) continue;
              if (monthKey && existingMonthKeysSet.has(monthKey)) continue;
            }
          } else if (controlCuotas) {
            if (!isMonthWithinTargetScope(cuotaMonthKey, targetMonthKey, generateToYearEnd)) continue;
            if (!includeInvoiced) {
              const controlCuotaKey = itemIdKey + '|' + String(cuotaNum);
              const controlMonthKey = (itemIdKey && cuotaMonthKey) ? (itemIdKey + '|' + cuotaMonthKey) : '';
              if (existingCuotaKeysSet.has(controlCuotaKey)) continue;
              if (controlMonthKey && existingMonthKeysSet.has(controlMonthKey)) continue;
            }
          } else {
            if (existingCuotaKeysSet.has(legacyCuotaKey)) continue;
          }

          const rem = getRemainingUsage();
          if (rem < USAGE_STOP_THRESHOLD) {
            safeWrite(ctx, 'err', {
              sourceTranId: soTranId,
              cuota: cuotaNum,
              cuotasTotal: executions.length,
              itemLine: lineInfo.line + 1,
              itemId: String(executionItemId || lineInfo.itemId),
              code: 'LOW_USAGE_STOP',
              msg: 'Stop preventivo. RemainingUsage=' + rem + '. Re-ejecuta para continuar.'
            });
            return;
          }

          try {
            const idxItem = (itemToIdx && lineInfo && lineInfo.itemId) ? (itemToIdx[String(lineInfo.itemId)] || null) : null;
            const invId = createInternalInvoice(soId, execution.cuotaIndex, plan, lineInfo, idxItem, soCodAgru, cuotaNum, {
              customDate: execution.cuotaDate || null,
              fixedAmountOverride: execution.fixedAmountOverride || null,
              periodsOverride: execution.periodsOverride || null,
              targetItemIdOverride: execution.targetItemIdOverride || null
            });
            generatedCount++;
            existingCuotaKeysSet.add(itemIdKey + '|' + String(cuotaNum));
            if (monthKey) existingMonthKeysSet.add(monthKey);

            let fiTranId = '';
            const rem2 = getRemainingUsage();
            if (invId && rem2 >= USAGE_SKIP_LOOKUP_THRESHOLD) {
              try { fiTranId = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invId); } catch(e){ log.error('lookupFITranId', { invId, err: safeErrorInfo(e) }); }
            }

            safeWrite(ctx, 'ok', {
              sourceTranId: soTranId,
              targetTranId: fiTranId,
              cuota: cuotaNum,
              cuotasTotal: executions.length,
              mes: cuotaMonthKey || '',
              itemLine: lineInfo.line + 1,
              itemId: String(executionItemId || lineInfo.itemId),
              codAgruIdx: idxItem || null,
              msg:'OK'
            });

            if (invId) safeWrite(ctx, 'ids', String(invId));

          } catch (e1) {
            const ei1 = safeErrorInfo(e1);

            if (looksTransient(e1) && attempt < maxRetry) {
              try {
                const idxItem = (itemToIdx && lineInfo && lineInfo.itemId) ? (itemToIdx[String(lineInfo.itemId)] || null) : null;
                const invRetryId = createInternalInvoice(soId, execution.cuotaIndex, plan, lineInfo, idxItem, soCodAgru, cuotaNum, {
                  customDate: execution.cuotaDate || null,
                  fixedAmountOverride: execution.fixedAmountOverride || null,
                  periodsOverride: execution.periodsOverride || null,
                  targetItemIdOverride: execution.targetItemIdOverride || null
                });
                generatedCount++;
                existingCuotaKeysSet.add(itemIdKey + '|' + String(cuotaNum));
                if (monthKey) existingMonthKeysSet.add(monthKey);

                let fiTranId2 = '';
                const rem3 = getRemainingUsage();
                if (invRetryId && rem3 >= USAGE_SKIP_LOOKUP_THRESHOLD) {
                  try { fiTranId2 = lookupTranId(TO_TYPE_INTERNAL_INVOICE, invRetryId); } catch(e2){ log.error('lookupFITranIdRetry', { invRetryId, err: safeErrorInfo(e2) }); }
                }

                safeWrite(ctx, 'ok', {
                  sourceTranId: soTranId,
                  targetTranId: fiTranId2,
                  cuota: cuotaNum,
                  cuotasTotal: executions.length,
                  mes: cuotaMonthKey || '',
                  itemLine: lineInfo.line + 1,
                  itemId: String(executionItemId || lineInfo.itemId),
                  codAgruIdx: idxItem || null,
                  msg:'OK (retry)'
                });

                if (invRetryId) safeWrite(ctx, 'ids', String(invRetryId));
                continue;

              } catch(eRetry){
                const eiR = safeErrorInfo(eRetry);
                safeWrite(ctx, 'err', {
                  sourceTranId: soTranId,
                  cuota: cuotaNum,
                  cuotasTotal: executions.length,
                  mes: cuotaMonthKey || '',
                  itemLine: lineInfo.line + 1,
                  itemId: String(executionItemId || lineInfo.itemId),
                  code: eiR.name,
                  msg: eiR.message
                });
                continue;
              }
            }

            safeWrite(ctx, 'err', {
              sourceTranId: soTranId,
              cuota: cuotaNum,
              cuotasTotal: executions.length,
              mes: cuotaMonthKey || '',
              itemLine: lineInfo.line + 1,
              itemId: String(executionItemId || lineInfo.itemId),
              code: ei1.name,
              msg: ei1.message
            });
          }
        }
      }

      if ((controlCuotas || specialConfiguredSo) && generatedCount === 0) {
        safeWrite(ctx, 'err', {
          sourceTranId: soTranId,
          cuota: null,
          cuotasTotal: null,
          mes: specialConfiguredSo ? '' : (targetMonthKey || ''),
          code: specialConfiguredSo ? 'NO_SPECIAL_GENERATION' : 'NO_TARGET_MONTH_MATCH',
          msg: specialConfiguredSo
            ? 'No hay cuotas pendientes para la configuracion especial.'
            : 'No hay cuotas pendientes para el alcance de mes seleccionado.'
        });
        return;
      }
    } catch (e) {
      const ei = safeErrorInfo(e);
      safeWrite(ctx, 'err', { sourceTranId: soTranId || ('SO:'+soId), cuota:null, cuotasTotal:null, code: ei.name, msg: ei.message });
    }
  }

  // =============================== summarize ===============================
  function summarize (summary) {
    const cs = runtime.getCurrentScript();

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    const OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id_1','custscript_ht_pe_output_folder_id'])) || DEFAULT_OUTPUT_FOLDER_ID;

    const ok=[], err=[], idsFin=[];
    summary.output.iterator().each((k,v)=>{
      try{
        if (k === 'ok')  ok.push(JSON.parse(v));
        else if (k === 'err') err.push(JSON.parse(v));
        else if (k === 'ids') {
          const n = Number(v);
          if (n) idsFin.push(n);
        }
      }catch(eParse){
        log.error('SUMMARY_PARSE_ERR', { k, v, err: safeErrorInfo(eParse) });
      }
      return true;
    });

    log.audit('SUMMARY_COUNTS', { lote: LOTE_ID || null, totalRecords: ok.length + err.length, ok: ok.length, err: err.length });

    let fileIdResults = null, estadoFinal = ESTADO.COMPLETADO;
    try {
      fileIdResults = saveJson({ ok, err, total: ok.length+err.length, finishedAt: new Date().toISOString() },
        'fi_emit_lote_'+(LOTE_ID || 'NA'), OUTPUT_FOLDER_ID);
    } catch (e) {
      estadoFinal = ESTADO.ERROR;
      log.error('saveJsonResultsError', safeErrorInfo(e));
    }

    let fileIdIdsOnly = null;
    try {
      const uniqueIds = Array.from(new Set(idsFin.filter(n => !!n)));
      fileIdIdsOnly = saveJsonRaw(JSON.stringify(uniqueIds), 'fi_emit_lote_'+(LOTE_ID || 'NA')+'_ids', OUTPUT_FOLDER_ID);
    } catch (e) {
      log.error('saveJsonIdsOnlyError', safeErrorInfo(e));
    }

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
      }
    } catch (e) {
      log.error('submitFieldsError', safeErrorInfo(e));
    }

    try {
      const subject = 'HT PE – Emisión finalizada (Lote '+(LOTE_ID || 'NA')+')';
      const bodyLines = [
        'Total registros (cuotas): '+(ok.length+err.length),
        'OK: '+ok.length,
        'ERR: '+err.length,
        'Archivo resultados: '+(fileIdResults || '(no generado)'),
        'Archivo IDs FIN: '+(fileIdIdsOnly || '(no generado)')
      ];
      const attachments = [];
      if (fileIdResults) attachments.push(file.load({ id:fileIdResults }));
      if (fileIdIdsOnly) attachments.push(file.load({ id:fileIdIdsOnly }));
      email.send({ author: EMAIL_EMPLOYEE_ID, recipients: [EMAIL_EMPLOYEE_ID], subject, body: bodyLines.join('\n'), attachments });
    } catch(e){
      log.error('emailError', safeErrorInfo(e));
    }

    if (summary.inputSummary.error) log.error('inputSummary', summary.inputSummary.error);
    summary.mapSummary.errors.iterator().each((k, e) => { log.error('mapError', 'key '+k+' error '+e); return true; });
  }

  // =============================== Reglas negocio ===============================
  function validateSourceOrder (soId) {
    const info = search.lookupFields({ type:'salesorder', id: soId, columns:['entity','status'] });
    if (!info || !info.entity || !info.entity.length) throw new Error('HARD_MISSING_CUSTOMER: La orden no tiene cliente.');
  }

  // =============================== createInternalInvoice ===============================
  function createInternalInvoice (soId, cuotaIndex, plan, lineInfo, itemSuffixIdx, soCodAgruCached, cuotaDisplayNum, options) {
    options = options || {};

    function forceSetBodyField(rec, fieldId, value){
      if (value === null || typeof value === 'undefined') return false;
      const v = String(value);
      if (!v) return false;

      try {
        rec.setValue({ fieldId, value: v });
        return true;
      } catch (e1) {
        try { setIfHasField(rec, fieldId, v); return true; } catch (e2) {
          log.error('forceSetBodyFieldError', { fieldId, e1: safeErrorInfo(e1), e2: safeErrorInfo(e2) });
          return false;
        }
      }
    }

    let inv = null;
    try {
      inv = record.transform({
        fromType: FROM_TYPE_SOURCE,
        fromId: soId,
        toType: TO_TYPE_INTERNAL_INVOICE,
        isDynamic: false
      });
    } catch (e) {
      const msg = 'TRANSFORM_FAILED ' + safeToString(e);
      log.error('TRANSFORM_FAILED', { soId, cuotaIndex: Number(cuotaDisplayNum || 0) || (cuotaIndex + 1), msg });
      throw new Error(msg);
    }

    // Mantener solo la línea solicitada
    try {
      const targetKey   = lineInfo && lineInfo.lineUniqueKey ? String(lineInfo.lineUniqueKey) : null;
      const targetItem  = Number(lineInfo && lineInfo.itemId || 0);
      const targetIndex = Number(lineInfo && lineInfo.line || 0);
      const lineCount   = inv.getLineCount({ sublistId:'item' }) || 0;
      let keepIndex = -1;

      for (let i=0; i<lineCount; i++){
        const key = String(inv.getSublistValue({ sublistId:'item', fieldId:'lineuniquekey', line:i }) || '');
        const itemIdLine = Number(inv.getSublistValue({ sublistId:'item', fieldId:'item', line:i }) || 0);

        if (targetKey && key === targetKey){ keepIndex = i; break; }
        if (!targetKey && targetItem && itemIdLine === targetItem){ keepIndex = i; break; }
        if (!targetKey && !targetItem && i === targetIndex){ keepIndex = i; break; }
      }

      if (keepIndex < 0) throw new Error('TARGET_LINE_NOT_FOUND');

      for (let i=lineCount-1; i>=0; i--){
        if (i !== keepIndex) inv.removeLine({ sublistId:'item', line:i });
      }
    } catch (e) {
      log.error('filterLinesByItemError', { soId, cuotaIndex, lineInfo, err: safeErrorInfo(e) });
    }

    const sourceItemId  = Number(lineInfo && lineInfo.sourceItemId || lineInfo.itemId || 0);
    const groupedItemId = Number(lineInfo && lineInfo.groupedItemId || 0);
    const targetItemIdOverride = Number(options.targetItemIdOverride || 0) || 0;
    const itemIdToUse = targetItemIdOverride || groupedItemId || sourceItemId;
    const itemWasSwapped = !!(itemIdToUse && itemIdToUse !== sourceItemId);

    if (itemWasSwapped){
      try { inv.setSublistValue({ sublistId:'item', fieldId:'item', line:0, value: itemIdToUse }); }
      catch (e){ log.error('swapTargetItemError', { soId, cuotaIndex, itemIdToUse, sourceItemId, err: safeErrorInfo(e) }); }
    }

    // Fecha
    if ((plan && plan.baseDate) || options.customDate){
      try {
        const d = options.customDate || resolveCuotaDate(plan.baseDate, lineInfo, cuotaIndex);
        if (d) {
          inv.setValue({ fieldId:'trandate', value:d });
          if (plan.useStartDate) setIfHasField(inv, 'startdate', d);
        }
      } catch(e){
        log.error('setTrandateCuotaError', { soId, cuotaIndex, err: safeErrorInfo(e) });
      }
    }

    // Montos
    try {
      const periods = Number(options.periodsOverride || (lineInfo && lineInfo.numPeriods) || 0) || 1;
      const targetLine = 0;

      const qty = Number(inv.getSublistValue({ sublistId:'item', fieldId:'quantity', line:targetLine }) || (lineInfo && lineInfo.quantity) || 1) || 1;
      const fixedAmountOverride = Number(options.fixedAmountOverride || 0) || 0;
      const baseAmount = fixedAmountOverride > 0 ? fixedAmountOverride : Number(lineInfo && lineInfo.amount || 0);
      if (baseAmount <= 0) throw new Error('LINE_AMOUNT_ZERO');

      let amountThis = 0;
      if (fixedAmountOverride > 0) {
        amountThis = round2(fixedAmountOverride);
      } else {
        const basePerCuota = round2(baseAmount / periods);
        amountThis = basePerCuota;
        if (cuotaIndex + 1 === periods){
          const totalPrev = round2(basePerCuota * (periods - 1));
          amountThis = round2(baseAmount - totalPrev);
        }
      }
      const newRate = round2(amountThis / qty);

      inv.setSublistValue({ sublistId:'item', fieldId:'quantity', line:targetLine, value: qty });
      inv.setSublistValue({ sublistId:'item', fieldId:'rate', line:targetLine, value: newRate });
    } catch(e){
      log.error('adjustAmountsCuotasError', { soId, cuotaIndex, err: safeErrorInfo(e) });
    }

    // Inventario
    try { if (!itemWasSwapped) applyInventoryDetail(inv); }
    catch(e){ log.error('applyInventoryDetailError', { soId, cuotaIndex, err: safeErrorInfo(e) }); throw e; }

    setIfHasField(inv, FLD_CREATED_FROM_FI, soId);
    setIfHasField(inv, FLD_CUOTA_NUM, Number(cuotaDisplayNum || 0) || (cuotaIndex + 1));

    // cod_agru
    try {
      let codAgru = (soCodAgruCached || '').trim();
      if (codAgru) {
        if (itemSuffixIdx) codAgru = codAgru + '-' + String(itemSuffixIdx);
        forceSetBodyField(inv, FLD_COD_AGRU, codAgru);
      }
    } catch (e) {
      log.error('copy_cod_agru_error', { soId, itemSuffixIdx, err: safeErrorInfo(e) });
    }

    const mainDepartmentId = lineInfo && lineInfo.mainDepartmentId;
    if (mainDepartmentId) {
      setIfHasField(inv, 'department', mainDepartmentId);
      inv.setSublistValue({ sublistId:'item', fieldId:'department', line:0, value: mainDepartmentId });
    }

    // Reaplicar al final: algunos campos sourced durante el transform pueden restaurar
    // la fecha de la orden antes del save.
    const finalTranDate = normalizeDate(options.customDate ||
      ((plan && plan.baseDate) ? resolveCuotaDate(plan.baseDate, lineInfo, cuotaIndex) : null));
    if (finalTranDate) {
      inv.setValue({ fieldId:'trandate', value:finalTranDate });
      if (plan && plan.useStartDate) setIfHasField(inv, 'startdate', finalTranDate);
    }

    const invId = safeSaveRecord(inv, {
      soId,
      cuotaIndex: Number(cuotaDisplayNum || 0) || (cuotaIndex + 1),
      computedTrandate: (function(){ try { return fmtDate(inv.getValue({ fieldId:'trandate' })); } catch(_) { return ''; } })(),
      itemId: (function(){ try { return inv.getSublistValue({ sublistId:'item', fieldId:'item', line:0 }); } catch(_) { return ''; } })(),
      remainingUsage: getRemainingUsage()
    });

    // Si un User Event/workflow de la transaccion vuelve a colocar 05/02/2026,
    // corregir el registro guardado y fallar de forma visible si NetSuite lo rechaza.
    if (finalTranDate) forceSavedInvoiceDate(invId, finalTranDate, !!(plan && plan.useStartDate));
    return invId;
  }

  // =============================== Exports ===============================
  return { getInputData, map: mapSpecialAware, summarize };
});
