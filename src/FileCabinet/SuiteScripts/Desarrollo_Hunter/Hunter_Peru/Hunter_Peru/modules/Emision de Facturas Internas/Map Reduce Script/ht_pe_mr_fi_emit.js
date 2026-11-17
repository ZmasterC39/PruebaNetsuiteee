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

  // Campo estándar de propietario/creador del custom record.
  // Si en tu cuenta usan otro campo personalizado, reemplazar 'owner' por el custrecord correspondiente.
  const FLD_LOTE_OWNER = 'owner';

  const FLD_CREATED_FROM_FI = 'custbody_ec_created_from_fac_int';
  const FLD_CUOTA_NUM       = 'custbody_ec_nro_cuota_fac_int';
  const FLD_COD_AGRU        = 'custbody_ht_cod_agru';
  const QUOTA_CONTROL_TYPES = { CUOTA:'CUOTA', MES:'MES' };

  // =============================== Governance / thresholds ===============================
  const USAGE_STOP_THRESHOLD = 350;
  const USAGE_SKIP_LOOKUP_THRESHOLD = 250;

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

  // =============================== Helpers correo ===============================
  function getLoteCreatorEmployeeId(loteId){
    try {
      if (!loteId) return null;

      // 'owner' no es columna válida en lookupFields para custom records; se lee desde el registro.
      const loteRec = record.load({ type: LOT_REC, id: loteId, isDynamic: false });
      const rawOwner = loteRec.getValue({ fieldId: FLD_LOTE_OWNER });

      if (Array.isArray(rawOwner) && rawOwner.length) {
        return Number(rawOwner[0].value) || null;
      }

      if (rawOwner && typeof rawOwner === 'object') {
        return Number(rawOwner.value) || null;
      }

      return Number(rawOwner) || null;

    } catch(e){
      log.error('getLoteCreatorEmployeeIdError', {
        loteId,
        err: safeErrorInfo(e)
      });
      return null;
    }
  }

  function uniqueRecipients(arr){
    return Array.from(
      new Set(
        (arr || [])
          .map(Number)
          .filter(n => !!n)
      )
    );
  }

  // =============================== Reanudar / validar existentes ===============================
  function findExistingFiKeysBySO(soIds){
    const out = {};
    if (!soIds || !soIds.length) return out;

    const batches = chunk(soIds.map(String), 1000);
    for (let b=0; b<batches.length; b++){
      const s = search.create({
        type: TO_TYPE_INTERNAL_INVOICE,
        filters: [
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
        const soId = Number(r.getValue({ name:'createdfrom' }) || 0);
        const itemId = Number(r.getValue({ name:'item' }) || 0);
        const cuota = Number(r.getValue({ name: FLD_CUOTA_NUM }) || 0);
        const monthKey = monthKeyFromDate(r.getValue({ name:'trandate' }));

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
    }

    return out;
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

  // =============================== Inventario ===============================
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

  // =============================== getInputData ===============================
  function getInputData () {
    const cs = runtime.getCurrentScript();

    const LOTE_ID          = toIntSafe(getParamAny(cs, ['custscript_ht_pe_lote_id','custscript_ht_pe_lote_id_1']));
    let   OUTPUT_FOLDER_ID = toIntSafe(getParamAny(cs, ['custscript_ht_pe_output_folder_id_1','custscript_ht_pe_output_folder_id']));
    const RETRY_SOFT_MAX   = Math.max(0, toIntSafe(getParamAny(cs, ['custscript_ht_pe_retry_soft_max_1','custscript_ht_pe_retry_soft_max'])) || 1);

    if (!LOTE_ID) throw new Error('MISSING_PARAM: custscript_ht_pe_lote_id vacío o 0.');
    if (!OUTPUT_FOLDER_ID) OUTPUT_FOLDER_ID = DEFAULT_OUTPUT_FOLDER_ID;

    const lote = record.load({ type: LOT_REC, id: LOTE_ID });
    lote.setValue({ fieldId: FLD_ESTADO, value: ESTADO.PROCESANDO });
    lote.save({ enableSourcing:true, ignoreMandatoryFields:true });

    const params = JSON.parse(lote.getValue(FLD_PARAMS) || '{}');
    const filters = params && params.filters || {};
    const technical = params && params.technical || {};

    const overrideDate = filters.tranDateOverride || null;
    const useStartDate = !!filters.usarStartDate;
    const agruPorItem = !!filters.agruPorItem;
    const controlCuotas = !!filters.controlCuotas;
    const mesGeneracionKey = monthKeyFromDate(filters.mesGeneracion || filters.tranDateOverride || null);
    const generateToYearEnd = !!filters.generarHastaFinAnio;
    const includeInvoiced = !!technical.includeInvoiced;

    const soIds = resolveInputIds(params) || [];

    const existingMap = findExistingFiKeysBySO(soIds);

    record.submitFields({
      type: LOT_REC, id: LOTE_ID,
      values: { [FLD_TOTAL]: soIds.length }
    });

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

  // =============================== map ===============================
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

      const shortLines = billableLines.filter(l => (Number(l.numPeriods)||1) === 1);
      const longLines  = billableLines.filter(l => (Number(l.numPeriods)||1) > 1);
      const orderedLines = shortLines.concat(longLines);

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
        // Con fecha override se genera el plan completo desde esa fecha (no se saltan periodos transcurridos).
        const periodsToSkip = 0;
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

      const loteCreatorEmployeeId = getLoteCreatorEmployeeId(LOTE_ID);

      const recipients = uniqueRecipients([
        EMAIL_EMPLOYEE_ID,
        loteCreatorEmployeeId
      ]);

      if (!recipients.length) {
        throw new Error('NO_EMAIL_RECIPIENTS: No se pudo determinar destinatarios para el correo.');
      }

      log.audit('EMAIL_RECIPIENTS', {
        lote: LOTE_ID || null,
        emailEmployeeId: EMAIL_EMPLOYEE_ID,
        loteCreatorEmployeeId,
        recipients
      });

      email.send({
        author: EMAIL_EMPLOYEE_ID,
        recipients,
        subject,
        body: bodyLines.join('\n'),
        attachments
      });

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
  function createInternalInvoice (soId, cuotaIndex, plan, lineInfo, itemSuffixIdx, soCodAgruCached, cuotaDisplayNum) {
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

    if (groupedItemId && groupedItemId !== sourceItemId){
      try { inv.setSublistValue({ sublistId:'item', fieldId:'item', line:0, value: groupedItemId }); }
      catch (e){ log.error('swapGroupedItemError', { soId, cuotaIndex, groupedItemId, sourceItemId, err: safeErrorInfo(e) }); }
    }

    if (plan && plan.baseDate){
      try {
        const d = resolveCuotaDate(plan.baseDate, lineInfo, cuotaIndex);
        if (d) {
          inv.setValue({ fieldId:'trandate', value:d });
          if (plan.useStartDate) setIfHasField(inv, 'startdate', d);
        }
      } catch(e){
        log.error('setTrandateCuotaError', { soId, cuotaIndex, err: safeErrorInfo(e) });
      }
    }

    try {
      const periods = Number(lineInfo && lineInfo.numPeriods || 0) || 1;
      const targetLine = 0;

      const qty = Number(inv.getSublistValue({ sublistId:'item', fieldId:'quantity', line:targetLine }) || (lineInfo && lineInfo.quantity) || 1) || 1;
      const baseAmount = Number(lineInfo && lineInfo.amount || 0);
      if (baseAmount <= 0) throw new Error('LINE_AMOUNT_ZERO');

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
      log.error('adjustAmountsCuotasError', { soId, cuotaIndex, err: safeErrorInfo(e) });
    }

    try { if (!groupedItemId) applyInventoryDetail(inv); }
    catch(e){ log.error('applyInventoryDetailError', { soId, cuotaIndex, err: safeErrorInfo(e) }); throw e; }

    setIfHasField(inv, FLD_CREATED_FROM_FI, soId);
    setIfHasField(inv, FLD_CUOTA_NUM, Number(cuotaDisplayNum || 0) || (cuotaIndex + 1));

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

    return safeSaveRecord(inv, {
      soId,
      cuotaIndex: Number(cuotaDisplayNum || 0) || (cuotaIndex + 1),
      computedTrandate: (function(){ try { return fmtDate(inv.getValue({ fieldId:'trandate' })); } catch(_) { return ''; } })(),
      itemId: (function(){ try { return inv.getSublistValue({ sublistId:'item', fieldId:'item', line:0 }); } catch(_) { return ''; } })(),
      remainingUsage: getRemainingUsage()
    });
  }

  // =============================== Exports ===============================
  return { getInputData, map, summarize };
});