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
  const LOT_REC    = 'customrecord_ht_pe_fi_lote';
  const RECTYPE_ID = 3333; // rectype interno del customrecord_ht_pe_fi_lote

  const FLD_ESTADO  = 'custrecord_ht_pe_estado';
  const FLD_PROCESO = 'custrecord_ht_pe_proceso';
  const FLD_PARAMS  = 'custrecord_ht_pe_params';
  const FLD_TOTAL   = 'custrecord_ht_pe_total';

  const ESTADO = { COMPLETADO: 1, ERROR: 2, PENDIENTE: 3, PROCESANDO: 4 };
  const PROC   = { ANULACION: 1, EMISION: 2 };

  const INPUT_FOLDER_DEFAULT  = 121601; // HT PE – FI Input
  const OUTPUT_FOLDER_DEFAULT = 121602; // HT PE – FI Output

  const MR_EMIT = { script: 'customscript_ht_pe_mr_fi_emit', deploy: 'customdeploy_ht_pe_mr_fi_emit' };
  const MR_VOID = { script: 'customscript_ht_pe_mr_fi_void', deploy: 'customdeploy_ht_pe_mr_fi_void' };

  const PREV_TYPES = { SO: 'SO', FIN: 'FIN' };
  const TO_TYPE_INTERNAL_INVOICE = 'customsale_ec_factura_interna';

  // Bienes (placa)
  const BIEN_REC = 'customrecord_ht_record_bienes';
  const FLD_SO_BIEN = 'custbody_ht_so_bien';
  const FLD_BIEN_PLACA = 'custrecord_ht_bien_placa';

  // ✅ Nuevo checkbox (solo viaja en params del lote, no deployment)
  const FLD_AGRU_POR_ITEM = 'custpage_agru_por_item';
  const FLD_CONTROL_CUOTAS = 'custpage_control_cuotas';
  const FLD_USE_STARTDATE = 'custpage_usar_startdate';
  const FLD_MES_OBJ        = 'custpage_mes_generacion';
  const FLD_CONTROL_ANUAL  = 'custpage_generar_hasta_fin_anio';

  // Paginación
  const DEFAULT_PAGE_SIZE = 200;
  const PAGE_SIZES = [200, 500];

  // Export sync: límite de seguridad para no reventar Suitelet
  const EXPORT_SYNC_MAX = 1200;

  const toInt     = (v) => Number(String(v || '').replace(/,/g, '').trim()) || 0;
  const toDateStr = (v) => (v && String(v).trim()) || null;

  function normalizeDateInput(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

    const s = String(v).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    const partsSlash = s.split('/');
    if (partsSlash.length === 3) {
      const d = parseInt(partsSlash[0], 10);
      const m = parseInt(partsSlash[1], 10);
      const y = parseInt(partsSlash[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const dt = new Date(y, m - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
    }

    const t = Date.parse(s);
    return isNaN(t) ? null : new Date(t);
  }

  function toMonthKey(v) {
    const d = normalizeDateInput(v);
    if (!d) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function validateQuotaControl(filtros) {
    if (!filtros || !filtros.controlCuotas) return null;

    if (!toMonthKey(filtros.mesGeneracion)) {
      return 'Debes indicar un Mes de generación válido.';
    }

    return null;
  }

  function clamp(n, min, max) {
    n = parseInt(n, 10);
    if (isNaN(n)) n = min;
    return Math.max(min, Math.min(max, n));
  }

  function mapCurrencyCode(code) {
    const c = String(code || '');
    if (c === '1') return 'US Dollar';
    if (c === '5') return 'Soles';
    return c || '';
  }

  // ==================== Utils ====================
  function getLoteUrl(loteId) {
    try {
      return url.resolveRecord({ recordType: LOT_REC, recordId: loteId, isEditMode: false });
    } catch (e) {
      return '/app/common/custom/custrecordentry.nl?rectype=' + RECTYPE_ID + '&id=' + loteId;
    }
  }

  function linkToLote(loteId) {
    const rurl = getLoteUrl(loteId);
    return { url: rurl, label: 'Abrir Lote #' + loteId };
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /**
   * SO IDs que ya tienen FI (createdfrom).
   */
  function findSoIdsWithExistingFIN(soIds) {
    const set = new Set();
    if (!soIds || !soIds.length) return set;

    const batches = chunk(soIds.map(String), 1000);
    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: 'transaction',
        filters: [
          ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
          ['mainline', 'is', 'T'], 'AND',
          ['createdfrom', 'anyof', batches[b]]
        ],
        columns: [search.createColumn({ name: 'createdfrom' })]
      });
      s.run().each(function (r) {
        const cf = Number(r.getValue('createdfrom'));
        if (cf) set.add(cf);
        return true;
      });
    }
    return set;
  }

  /**
   * Placa por Bien
   * @returns {Object} map bienId -> placa
   */
  function getPlacaByBienIds(bienIds) {
    const map = {};
    const ids = (bienIds || []).map(Number).filter(Boolean);
    if (!ids.length) return map;

    const batches = chunk(ids.map(String), 1000);
    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: BIEN_REC,
        filters: [['internalid', 'anyof', batches[b]]],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: FLD_BIEN_PLACA })
        ]
      });

      const paged = s.runPaged({ pageSize: 1000 });
      for (let i = 0; i < paged.pageRanges.length; i++) {
        paged.fetch({ index: i }).data.forEach(r => {
          const id = Number(r.getValue({ name: 'internalid' }));
          const placa = (r.getValue({ name: FLD_BIEN_PLACA }) || '').toString();
          if (id) map[id] = placa;
        });
      }
    }
    return map;
  }

  // ==================== Items helpers ====================

  /**
   * Construye un display tipo UI: "ITEMID DisplayName"
   * (evita duplicar si itemTxt ya incluye el itemid)
   */
  function buildItemDisplay(display, itemid, itemTxt) {
    display = (display || '').toString().trim();
    itemid  = (itemid  || '').toString().trim();
    itemTxt = (itemTxt || '').toString().trim();

    let name = '';
    if (itemid && display) {
      name = itemid + ' ' + display;
    } else if (itemid && itemTxt) {
      name = itemTxt.includes(itemid) ? itemTxt : (itemid + ' ' + itemTxt);
    } else {
      name = (itemTxt || display || itemid || '').trim();
    }
    return (name || '').trim();
  }

  function buildBillingScheduleDisplay(billingScheduleTxt, billingScheduleVal) {
    return (billingScheduleTxt || billingScheduleVal || '').toString().trim();
  }

  /**
   * Items por SO (1 item por línea, y NO incluye líneas con amount = 0)
   * @returns {Object} map soId -> Array<string> (items)
   */
  // Items + calendario por SO, alineados por item visible en preview.
  function getItemPreviewDataBySoIds(soIds) {
    const map = {};
    const ids = (soIds || []).map(Number).filter(Boolean);
    if (!ids.length) return map;

    const tmp = {};
    ids.forEach(id => { tmp[id] = { rows: [], itemPos: {} }; });

    const batches = chunk(ids.map(String), 1000);

    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: 'salesorder',
        filters: [
          ['internalid', 'anyof', batches[b]], 'AND',
          ['mainline', 'is', 'F'], 'AND',
          ['taxline', 'is', 'F'], 'AND',
          ['shipping', 'is', 'F'], 'AND',
          ['item', 'noneof', '@NONE@']
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'amount' }),
          search.createColumn({ name: 'displayname', join: 'item' }),
          search.createColumn({ name: 'itemid', join: 'item' }),
          search.createColumn({ name: 'item' }),
          search.createColumn({ name: 'billingschedule' })
        ]
      });

      const paged = s.runPaged({ pageSize: 1000 });
      for (let i = 0; i < paged.pageRanges.length; i++) {
        paged.fetch({ index: i }).data.forEach(r => {
          const soId = Number(r.getValue({ name: 'internalid' }));
          if (!soId || !tmp[soId]) return;

          const amt = parseFloat(r.getValue({ name: 'amount' }) || '0') || 0;
          if (amt === 0) return;

          const display = r.getValue({ name: 'displayname', join: 'item' }) || '';
          const itemid  = r.getValue({ name: 'itemid', join: 'item' }) || '';
          const itemTxt = r.getText({ name: 'item' }) || '';
          const billingScheduleTxt = r.getText({ name: 'billingschedule' }) || '';
          const billingScheduleVal = r.getValue({ name: 'billingschedule' }) || '';

          const itemName = buildItemDisplay(display, itemid, itemTxt);
          if (!itemName) return;

          const scheduleName = buildBillingScheduleDisplay(billingScheduleTxt, billingScheduleVal);
          const pos = tmp[soId].itemPos[itemName];

          if (typeof pos === 'undefined') {
            tmp[soId].itemPos[itemName] = tmp[soId].rows.length;
            tmp[soId].rows.push({
              itemName: itemName,
              schedules: scheduleName ? [scheduleName] : [],
              scheduleSeen: scheduleName ? { [scheduleName]: true } : {}
            });
            return;
          }

          if (scheduleName) {
            const row = tmp[soId].rows[pos];
            if (!row.scheduleSeen[scheduleName]) {
              row.scheduleSeen[scheduleName] = true;
              row.schedules.push(scheduleName);
            }
          }
        });
      }
    }

    Object.keys(tmp).forEach(k => {
      const rows = tmp[k].rows || [];
      map[k] = {
        items: rows.map(row => row.itemName || ''),
        billingSchedules: rows.map(row => {
          const schedules = row.schedules || [];
          return schedules.length ? schedules.join(' / ') : ' - ';
        })
      };
    });
    return map;
  }

  // Compatibilidad: solo devuelve los items visibles del preview de SO.
  function getItemsBySoIds(soIds) {
    const map = {};
    const previewDataMap = getItemPreviewDataBySoIds(soIds);
    Object.keys(previewDataMap).forEach(k => {
      map[k] = previewDataMap[k].items || [];
    });
    return map;
  }

  /**
   * Items por FI (1 item por línea, y NO incluye líneas con amount = 0)
   * @returns {Object} map finId -> Array<string> (items)
   */
  function getItemsByFinIds(finIds) {
    const map = {};
    const ids = (finIds || []).map(Number).filter(Boolean);
    if (!ids.length) return map;

    const tmp = {};
    ids.forEach(id => { tmp[id] = { list: [], seen: {} }; });

    const batches = chunk(ids.map(String), 1000);

    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: 'transaction',
        filters: [
          ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
          ['internalid', 'anyof', batches[b]], 'AND',
          ['mainline', 'is', 'F'], 'AND',
          ['taxline', 'is', 'F'], 'AND',
          ['shipping', 'is', 'F'], 'AND',
          ['item', 'noneof', '@NONE@']
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'amount' }),
          search.createColumn({ name: 'displayname', join: 'item' }),
          search.createColumn({ name: 'itemid', join: 'item' }),
          search.createColumn({ name: 'item' })
        ]
      });

      const paged = s.runPaged({ pageSize: 1000 });
      for (let i = 0; i < paged.pageRanges.length; i++) {
        paged.fetch({ index: i }).data.forEach(r => {
          const finId = Number(r.getValue({ name: 'internalid' }));
          if (!finId || !tmp[finId]) return;

          const amt = parseFloat(r.getValue({ name: 'amount' }) || '0') || 0;
          if (amt === 0) return;

          const display = r.getValue({ name: 'displayname', join: 'item' }) || '';
          const itemid  = r.getValue({ name: 'itemid', join: 'item' }) || '';
          const itemTxt = r.getText({ name: 'item' }) || '';

          const name = buildItemDisplay(display, itemid, itemTxt);
          if (!name) return;

          if (!tmp[finId].seen[name]) {
            tmp[finId].seen[name] = true;
            tmp[finId].list.push(name);
          }
        });
      }
    }

    Object.keys(tmp).forEach(k => { map[k] = tmp[k].list; });
    return map;
  }

  // ==================== Totales ====================

  /**
   * Suma fxamount de SO por IDs (mainline T).
   */
  function sumFxAmountSOByIds(soIds) {
    const ids = (soIds || []).map(Number).filter(Boolean);
    if (!ids.length) return 0;

    let total = 0;
    const batches = chunk(ids.map(String), 1000);

    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: 'salesorder',
        filters: [
          ['internalid', 'anyof', batches[b]], 'AND',
          ['mainline', 'is', 'T']
        ],
        columns: [
          search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
        ]
      });

      const r = s.run().getRange({ start: 0, end: 1 }) || [];
      if (r.length) {
        const v = parseFloat(r[0].getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0;
        total += v;
      }
    }
    return total;
  }

  /**
   * Suma fxamount de FI (transaction) por IDs (mainline T).
   */
  function sumFxAmountFIByIds(finIds) {
    const ids = (finIds || []).map(Number).filter(Boolean);
    if (!ids.length) return 0;

    let total = 0;
    const batches = chunk(ids.map(String), 1000);

    for (let b = 0; b < batches.length; b++) {
      const s = search.create({
        type: 'transaction',
        filters: [
          ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
          ['mainline', 'is', 'T'], 'AND',
          ['internalid', 'anyof', batches[b]]
        ],
        columns: [
          search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
        ]
      });

      const r = s.run().getRange({ start: 0, end: 1 }) || [];
      if (r.length) {
        const v = parseFloat(r[0].getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0;
        total += v;
      }
    }
    return total;
  }

  /**
   * Suma fxamount de FI por filtros (mainline T).
   */
  function sumFxAmountFIByFilters(f) {
    const filters = [
      ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
      ['mainline', 'is', 'T']
    ];

    if (f.desde && f.hasta) filters.push('AND', ['trandate', 'within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND', ['entity', 'anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND', ['tranid', 'is', f.osTranId]);
    if (f.codAgru)          filters.push('AND', ['custbody_ht_cod_agru', 'is', f.codAgru]);

    const s = search.create({
      type: 'transaction',
      filters,
      columns: [
        search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
      ]
    });

    const r = s.run().getRange({ start: 0, end: 1 }) || [];
    if (!r.length) return 0;
    return parseFloat(r[0].getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0;
  }

  // ==================== Inline JS ====================
  function addInlineJS(form, lastLoteUrl) {
    const safeUrl = (lastLoteUrl || '').replace(/'/g, "\\'");
    const f = form.addField({
      id: 'custpage_inline_js',
      label: 'InlineJS',
      type: ui.FieldType.INLINEHTML
    });
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

        function SL_openLotList(){
          window.open('/app/common/custom/custrecordentrylist.nl?rectype=3328', '_blank', 'noopener,noreferrer');
        }

        function SL_getInt(id, def){
          var el = document.getElementById(id);
          if (!el) return def;
          var v = parseInt(el.value, 10);
          return isNaN(v) ? def : v;
        }

        function SL_prevPage(){
          var p = SL_getInt('custpage_page', 1);
          if (p > 1){
            document.getElementById('custpage_page').value = String(p - 1);
            SL_doPreview();
          }
        }

        function SL_nextPage(){
          var p = SL_getInt('custpage_page', 1);
          document.getElementById('custpage_page').value = String(p + 1);
          SL_doPreview();
        }

        function SL_resetPage(){
          var el = document.getElementById('custpage_page');
          if (el) el.value = '1';
        }

        function SL_bindFilterAutoPreview(){
          // filtros que reinician página y hacen preview
          var ids = [
            'custpage_prev_type',
            'custpage_desde',
            'custpage_hasta',
            'custpage_cliente',
            'custpage_os',
            'custpage_cod_agru',
            'custpage_trandate_override',
            'custpage_usar_startdate',
            'custpage_lote_id',
            'custpage_incluir_facturadas',
            'custpage_control_cuotas',
            'custpage_mes_generacion',
            'custpage_generar_hasta_fin_anio',
            'custpage_pagesize',
            'custpage_agru_por_item'
          ];
          for (var i = 0; i < ids.length; i++){
            var el = document.getElementById(ids[i]);
            if (el){
              el.onchange = function(){
                SL_resetPage();
                SL_doPreview();
              };
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

  // ==================== Preview / Fetch helpers ====================

  /**
   * Trae datos de SO por IDs (mainline T) paginado (page/pageSize).
   * Enriquecimiento (items/placa) SOLO para la página actual.
   */
  function fetchSOByIdsPaged(ids, page, pageSize) {
    const soIds = (ids || []).map(Number).filter(Boolean);
    if (!soIds.length) return [];

    const pSize = toInt(pageSize) || DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(soIds.length / pSize));
    const p = clamp(page || 1, 1, totalPages);

    const start = (p - 1) * pSize;
    const end = start + pSize;
    const take = soIds.slice(start, end);
    if (!take.length) return [];

    // Map id->pos para reordenar luego
    const pos = {};
    take.forEach((id, i) => { pos[id] = i; });

    const filters = [
      ['internalid', 'anyof', take.map(String)], 'AND',
      ['mainline', 'is', 'T'], 'AND',
      ['type', 'anyof', 'SalesOrd']
    ];

    const cols = [
      'internalid',
      'tranid',
      'trandate',
      'entity',
      'fxamount',
      'statusref',
      'custbody_ht_cod_agru',
      'currency',
      'terms',
      FLD_SO_BIEN
    ].map(n => search.createColumn({ name: n }));

    const s = search.create({
      type: 'salesorder',
      filters,
      columns: cols
    });

    const tmp = [];
    const paged = s.runPaged({ pageSize: 1000 });

    for (let i = 0; i < paged.pageRanges.length; i++) {
      paged.fetch({ index: i }).data.forEach(r => {
        tmp.push({
          tipo: 'OS',
          id: Number(r.getValue('internalid')),
          tranid: r.getValue('tranid') || '',
          trandate: r.getValue('trandate') || '',
          clienteT: r.getText('entity') || '',
          total: r.getValue('fxamount') || '',
          currencyCode: r.getValue('currency') || '',
          status: r.getValue('statusref') || '',
          codAgru: r.getValue('custbody_ht_cod_agru') || '',
          termsT: r.getText('terms') || '',
          bienId: toInt(r.getValue(FLD_SO_BIEN)) || null,
          placaT: '',
          itemsT: '',
          billingScheduleT: ' - '
        });
      });
    }

    // Reordenar según ids originales (página actual)
    tmp.sort((a, b) => (pos[a.id] ?? 999999) - (pos[b.id] ?? 999999));

    // Enriquecer: Items + Placa SOLO página
    if (tmp.length) {
      const gotIds = tmp.map(r => r.id);
      const bienIds = tmp.map(r => r.bienId).filter(Boolean);

      const previewDataMap = getItemPreviewDataBySoIds(gotIds);
      const placaMap = getPlacaByBienIds(bienIds);

      tmp.forEach(r => {
        const previewData = previewDataMap[String(r.id)] || previewDataMap[r.id] || {};
        const itemsArr = previewData.items || [];
        const billingSchedulesArr = previewData.billingSchedules || [];
        r.itemsT = Array.isArray(itemsArr) ? itemsArr.join('\n') : (itemsArr || '');
        r.billingScheduleT = Array.isArray(billingSchedulesArr)
          ? (billingSchedulesArr.length ? billingSchedulesArr.join('\n') : ' - ')
          : (billingSchedulesArr || ' - ');
        r.placaT = (r.bienId && placaMap[r.bienId]) ? placaMap[r.bienId] : '';
      });
    }

    return tmp;
  }

  /**
   * Preview de SO:
   * - IDs completos (excluyendo facturadas si aplica)
   * - totalCount y totalAmount sobre TODO
   * - rows paginado (200/500)
   */
  function previewSO(f, page, pageSize) {
    const allIds = collectSOIds(f);
    const totalCount = allIds.length;
    const totalAmount = sumFxAmountSOByIds(allIds);

    const pSize = toInt(pageSize) || DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(totalCount / pSize));
    const p = clamp(page || 1, 1, totalPages);

    const rows = fetchSOByIdsPaged(allIds, p, pSize);

    return { rows, count: totalCount, totalAmount, page: p, pageSize: pSize, totalPages };
  }

  function loadFinIdsFromLote(loteId) {
    try {
      const lote = record.load({ type: LOT_REC, id: loteId });
      const fileIdFin = toInt(lote.getValue('custrecord_ht_pe_outputfile_fin'));
      if (!fileIdFin) return [];
      const f = file.load({ id: fileIdFin });
      const parsed = JSON.parse(f.getContents() || '[]');
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.ids) ? parsed.ids : []);
      return arr.map(Number).filter(n => !!n);
    } catch (e) {
      log.error('loadFinIdsFromLote', e);
      return [];
    }
  }

  /**
   * FI por IDs (paginado):
   * - count = ids.length
   * - totalAmount = SUM fxamount por ids
   * - rows = página actual
   *
   * ✅ Enriquecer Items (líneas) + Placa (bien)
   */
  function previewFIByIdsPaged(ids, page, pageSize) {
    const finIds = (ids || []).map(Number).filter(Boolean);
    if (!finIds.length) return { rows: [], count: 0, totalAmount: 0, page: 1, pageSize: pageSize || DEFAULT_PAGE_SIZE, totalPages: 1 };

    const totalAmount = sumFxAmountFIByIds(finIds);
    const totalCount = finIds.length;

    const pSize = toInt(pageSize) || DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(totalCount / pSize));
    const p = clamp(page || 1, 1, totalPages);

    const start = (p - 1) * pSize;
    const take = finIds.slice(start, start + pSize);
    if (!take.length) return { rows: [], count: totalCount, totalAmount, page: p, pageSize: pSize, totalPages };

    const s = search.create({
      type: 'transaction',
      filters: [
        ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
        ['mainline', 'is', 'T'], 'AND',
        ['internalid', 'anyof', take.map(String)]
      ],
      columns: [
        'internalid','tranid','trandate','entity','fxamount','statusref','custbody_ht_cod_agru','currency','terms',
        FLD_SO_BIEN
      ].map(n => search.createColumn({ name: n }))
    });

    const rows = [];
    const paged = s.runPaged({ pageSize: 1000 });

    for (let i = 0; i < paged.pageRanges.length; i++) {
      paged.fetch({ index: i }).data.forEach(r => {
        rows.push({
          tipo: 'FI',
          id: Number(r.getValue('internalid')),
          tranid: r.getValue('tranid') || '',
          trandate: r.getValue('trandate') || '',
          clienteT: r.getText('entity') || '',
          total: r.getValue('fxamount') || '',
          currencyCode: r.getValue('currency') || '',
          status: r.getValue('statusref') || '',
          codAgru: r.getValue('custbody_ht_cod_agru') || '',
          termsT: r.getText('terms') || '',
          bienId: toInt(r.getValue(FLD_SO_BIEN)) || null,
          placaT: '',
          itemsT: '',
          billingScheduleT: ' - '
        });
      });
    }

    // ✅ Enriquecer FI SOLO la página: Items (líneas) + Placa
    if (rows.length) {
      const gotIds = rows.map(r => r.id);
      const bienIds = rows.map(r => r.bienId).filter(Boolean);

      const itemsMap = getItemsByFinIds(gotIds);
      const placaMap = getPlacaByBienIds(bienIds);

      rows.forEach(r => {
        const arr = itemsMap[String(r.id)] || itemsMap[r.id] || [];
        r.itemsT = Array.isArray(arr) ? arr.join('\n') : (arr || '');
        r.placaT = (r.bienId && placaMap[r.bienId]) ? placaMap[r.bienId] : '';
      });
    }

    return { rows, count: totalCount, totalAmount, page: p, pageSize: pSize, totalPages };
  }

  /**
   * FI por filtros (paginado):
   * - count = paged.count (todo)
   * - totalAmount = SUM fxamount con summary (todo)
   * - rows = página actual (200/500)
   *
   * ✅ Enriquecer Items (líneas) + Placa (bien)
   */
  function previewFIByFilters(f, page, pageSize) {
    const filters = [
      ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
      ['mainline', 'is', 'T']
    ];

    if (f.desde && f.hasta) filters.push('AND', ['trandate', 'within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND', ['entity', 'anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND', ['tranid', 'is', f.osTranId]);
    if (f.codAgru)          filters.push('AND', ['custbody_ht_cod_agru', 'is', f.codAgru]);

    const cols = [
      'internalid',
      'tranid',
      'trandate',
      'entity',
      'fxamount',
      'statusref',
      'custbody_ht_cod_agru',
      'currency',
      'terms',
      FLD_SO_BIEN
    ].map(n => search.createColumn({ name: n }));

    const s = search.create({
      type: 'transaction',
      filters,
      columns: cols
    });

    const pSize = toInt(pageSize) || DEFAULT_PAGE_SIZE;
    const paged = s.runPaged({ pageSize: pSize });

    const totalCount = paged.count;
    const totalAmount = sumFxAmountFIByFilters(f);

    const totalPages = Math.max(1, Math.ceil(totalCount / pSize));
    const p = clamp(page || 1, 1, totalPages);

    const rows = [];
    if (totalCount > 0 && paged.pageRanges.length) {
      const pageIndex = p - 1;
      if (paged.pageRanges[pageIndex]) {
        paged.fetch({ index: pageIndex }).data.forEach(r => {
          rows.push({
            tipo: 'FI',
            id: Number(r.getValue('internalid')),
            tranid: r.getValue('tranid') || '',
            trandate: r.getValue('trandate') || '',
            clienteT: r.getText('entity') || '',
            total: r.getValue('fxamount') || '',
            currencyCode: r.getValue('currency') || '',
            status: r.getValue('statusref') || '',
            codAgru: r.getValue('custbody_ht_cod_agru') || '',
            termsT: r.getText('terms') || '',
            bienId: toInt(r.getValue(FLD_SO_BIEN)) || null,
            placaT: '',
            itemsT: '',
            billingScheduleT: ' - '
          });
        });
      }
    }

    // ✅ Enriquecer FI SOLO página actual: Items + Placa
    if (rows.length) {
      const gotIds = rows.map(r => r.id);
      const bienIds = rows.map(r => r.bienId).filter(Boolean);

      const itemsMap = getItemsByFinIds(gotIds);
      const placaMap = getPlacaByBienIds(bienIds);

      rows.forEach(r => {
        const arr = itemsMap[String(r.id)] || itemsMap[r.id] || [];
        r.itemsT = Array.isArray(arr) ? arr.join('\n') : (arr || '');
        r.placaT = (r.bienId && placaMap[r.bienId]) ? placaMap[r.bienId] : '';
      });
    }

    return { rows, count: totalCount, totalAmount, page: p, pageSize: pSize, totalPages };
  }

  /**
   * Export FI por filtros (sin paginar) - puede ser pesado.
   * ✅ Incluye bien + items (como el preview)
   */
  function exportFIByFiltersAll(f) {
    const filters = [
      ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
      ['mainline', 'is', 'T']
    ];

    if (f.desde && f.hasta) filters.push('AND', ['trandate', 'within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND', ['entity', 'anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND', ['tranid', 'is', f.osTranId]);
    if (f.codAgru)          filters.push('AND', ['custbody_ht_cod_agru', 'is', f.codAgru]);

    const s = search.create({
      type: 'transaction',
      filters,
      columns: [
        'internalid',
        'tranid',
        'trandate',
        'entity',
        'fxamount',
        'statusref',
        'custbody_ht_cod_agru',
        'currency',
        'terms',
        FLD_SO_BIEN
      ].map(n => search.createColumn({ name: n }))
    });

    const rows = [];
    const paged = s.runPaged({ pageSize: 1000 });

    for (let i = 0; i < paged.pageRanges.length; i++) {
      paged.fetch({ index: i }).data.forEach(r => {
        rows.push({
          tipo: 'FI',
          id: Number(r.getValue('internalid')),
          tranid: r.getValue('tranid') || '',
          trandate: r.getValue('trandate') || '',
          clienteT: r.getText('entity') || '',
          total: r.getValue('fxamount') || '',
          currencyCode: r.getValue('currency') || '',
          status: r.getValue('statusref') || '',
          codAgru: r.getValue('custbody_ht_cod_agru') || '',
          termsT: r.getText('terms') || '',
          bienId: toInt(r.getValue(FLD_SO_BIEN)) || null,
          placaT: '',
          itemsT: '',
          billingScheduleT: ' - '
        });
      });
    }

    // Enriquecer export
    if (rows.length) {
      const gotIds = rows.map(r => r.id);
      const bienIds = rows.map(r => r.bienId).filter(Boolean);

      const itemsMap = getItemsByFinIds(gotIds);
      const placaMap = getPlacaByBienIds(bienIds);

      rows.forEach(r => {
        const arr = itemsMap[String(r.id)] || itemsMap[r.id] || [];
        r.itemsT = Array.isArray(arr) ? arr.join('\n') : (arr || '');
        r.placaT = (r.bienId && placaMap[r.bienId]) ? placaMap[r.bienId] : '';
      });
    }

    return rows;
  }

  // ==================== Recolección para Emisión ====================
  function collectSOIds(f) {
    const filters = [
      ['mainline', 'is', 'T'], 'AND',
      ['type', 'anyof', 'SalesOrd']
    ];

    if (f.desde && f.hasta) filters.push('AND', ['trandate', 'within', f.desde, f.hasta]);
    if (f.cliente)          filters.push('AND', ['entity', 'anyof', String(f.cliente)]);
    if (f.osTranId)         filters.push('AND', ['tranid', 'is', f.osTranId]);
    if (f.codAgru)          filters.push('AND', ['custbody_ht_cod_agru', 'is', f.codAgru]);

    const s = search.create({
      type: 'salesorder',
      filters,
      columns: [search.createColumn({ name: 'internalid' })]
    });

    const ids = [];
    const paged = s.runPaged({ pageSize: 1000 });
    for (let i = 0; i < paged.pageRanges.length; i++) {
      paged.fetch({ index: i }).data.forEach(r => ids.push(Number(r.id)));
    }

    // Si el control de cuotas está activo, no excluimos la OS completa aquí.
    // La validación fina por cuota/mes se hace en el Map/Reduce.
    if (f.controlCuotas) return ids;

    if (f.incluirFacturadas) return ids;

    const existing = findSoIdsWithExistingFIN(ids);
    return ids.filter(id => !existing.has(id));
  }

  function saveIdsJson(ids, folderId, baseName) {
    const fid = toInt(folderId) || INPUT_FOLDER_DEFAULT;
    const f = file.create({
      name: baseName + '_' + new Date().toISOString().slice(0, 10) + '.json',
      fileType: file.Type.JSON,
      contents: JSON.stringify(ids || []),
      folder: fid,
      isOnline: false
    });
    return f.save();
  }

  function createLote(opts) {
    const proceso    = opts.proceso;
    const jsonFileId = opts.jsonFileId;
    const filtros    = opts.filtros || {};
    const total      = opts.total || 0;

    const recLote = record.create({ type: LOT_REC, isDynamic: false });
    recLote.setValue({ fieldId: FLD_ESTADO,  value: ESTADO.PENDIENTE });
    recLote.setValue({ fieldId: FLD_PROCESO, value: proceso });
    recLote.setValue({ fieldId: FLD_TOTAL,   value: total });

    const includeInvoiced = !!filtros.incluirFacturadas;

    const params = {
      source: 'JSON',
      savedSearchId: null,
      jsonFileId: jsonFileId,
      filters: {
        desde: filtros.desde || null,
        hasta: filtros.hasta || null,
        cliente: filtros.cliente || null,
        osTranId: filtros.osTranId || null,
        codAgru: filtros.codAgru || null,
        tranDateOverride: filtros.tranDateOverride || null,
        usarStartDate: !!filtros.usarStartDate,
        agruPorItem: !!filtros.agruPorItem, // ✅ existente
        controlCuotas: !!filtros.controlCuotas,
        mesGeneracion: filtros.mesGeneracion || null,
        generarHastaFinAnio: !!filtros.generarHastaFinAnio
      },
      technical: {
        retrySoftMax: 1,
        includeInvoiced: includeInvoiced
      }
    };
    recLote.setValue({ fieldId: FLD_PARAMS, value: JSON.stringify(params) });

    return recLote.save({ enableSourcing: true, ignoreMandatoryFields: true });
  }

  function launchMR_Emit(loteId) {
    const t = task.create({ taskType: task.TaskType.MAP_REDUCE });
    t.scriptId     = MR_EMIT.script;
    t.deploymentId = MR_EMIT.deploy;
    t.params = {
      custscript_ht_pe_lote_id:   String(loteId),
      custscript_ht_pe_lote_id_1: String(loteId)
    };
    return t.submit();
  }

  function launchMR_Void(loteId) {
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
  function buildForm(opts) {
    const filtros     = opts.filtros || {};
    const previewRows = opts.previewRows || [];
    const totalCount  = opts.totalCount || 0;
    const totalAmount = opts.totalAmount || 0;
    const banner      = opts.banner || null;
    const lastLoteId  = opts.lastLoteId || null;

    const page = opts.page || 1;
    const pageSize = opts.pageSize || DEFAULT_PAGE_SIZE;
    const totalPages = opts.totalPages || 1;

    const form = ui.createForm({ title: 'HT PE – Emisión / Anulación de FI (por Lote)' });

    form.addFieldGroup({ id: 'grp_filters', label: 'Filtros' });

    const fPrevType = form.addField({
      id: 'custpage_prev_type',
      label: 'Vista previa de',
      type: ui.FieldType.SELECT,
      container: 'grp_filters'
    });
    fPrevType.addSelectOption({ value: PREV_TYPES.SO,  text: 'Órdenes de Servicio (OS)' });
    fPrevType.addSelectOption({ value: PREV_TYPES.FIN, text: 'Facturas Internas (FI)' });
    fPrevType.defaultValue = filtros.prevType || PREV_TYPES.SO;

    const fDesde = form.addField({
      id: 'custpage_desde',
      label: 'Fecha Desde',
      type: ui.FieldType.DATE,
      container: 'grp_filters'
    });
    const fHasta = form.addField({
      id: 'custpage_hasta',
      label: 'Fecha Hasta',
      type: ui.FieldType.DATE,
      container: 'grp_filters'
    });
    const fCliente = form.addField({
      id: 'custpage_cliente',
      label: 'Cliente',
      type: ui.FieldType.SELECT,
      source: 'customer',
      container: 'grp_filters'
    });
    const fTran = form.addField({
      id: 'custpage_os',
      label: (filtros.prevType === PREV_TYPES.FIN
        ? 'N° Doc FI (TranID)'
        : 'N° Orden Servicio (TranID)'),
      type: ui.FieldType.TEXT,
      container: 'grp_filters'
    });
    const fCodAgru = form.addField({
      id: 'custpage_cod_agru',
      label: 'Codigo Agrupador',
      type: ui.FieldType.TEXT,
      container: 'grp_filters'
    });
    const fTranDateOverride = form.addField({
      id: 'custpage_trandate_override',
      label: 'Fecha para Factura Interna (opcional)',
      type: ui.FieldType.DATE,
      container: 'grp_filters'
    });
    const fUseStartDate = form.addField({
      id: FLD_USE_STARTDATE,
      label: 'Usar Start Date de la OS',
      type: ui.FieldType.CHECKBOX,
      container: 'grp_filters'
    });
    const fIncl = form.addField({
      id: 'custpage_incluir_facturadas',
      label: 'Incluir OS ya facturadas (con FI)',
      type: ui.FieldType.CHECKBOX,
      container: 'grp_filters'
    });

    const fControlCuotas = form.addField({
      id: FLD_CONTROL_CUOTAS,
      label: 'Habilitar control de cuotas',
      type: ui.FieldType.CHECKBOX,
      container: 'grp_filters'
    });

    const fMesGeneracion = form.addField({
      id: FLD_MES_OBJ,
      label: 'Mes de generación (se usa mes/año)',
      type: ui.FieldType.DATE,
      container: 'grp_filters'
    });

    const fGenerarHastaFinAnio = form.addField({
      id: FLD_CONTROL_ANUAL,
      label: 'Generar hasta fin de año',
      type: ui.FieldType.CHECKBOX,
      container: 'grp_filters'
    });

    const fLoteId = form.addField({
      id: 'custpage_lote_id',
      label: 'Lote ID (para Anulación / Previsualizar FI)',
      type: ui.FieldType.INTEGER,
      container: 'grp_filters'
    });

    // ✅ Checkbox nuevo
    const fAgruPorItem = form.addField({
      id: FLD_AGRU_POR_ITEM,
      label: 'Agrupar por ítem (código agrupador por ítem)',
      type: ui.FieldType.CHECKBOX,
      container: 'grp_filters'
    });

    if (filtros.desde)            fDesde.defaultValue            = filtros.desde;
    if (filtros.hasta)            fHasta.defaultValue            = filtros.hasta;
    if (filtros.cliente)          fCliente.defaultValue          = String(filtros.cliente);
    if (filtros.osTranId)         fTran.defaultValue             = filtros.osTranId;
    if (filtros.codAgru)          fCodAgru.defaultValue          = filtros.codAgru;
    if (filtros.tranDateOverride) fTranDateOverride.defaultValue = filtros.tranDateOverride;
    if (filtros.mesGeneracion)    fMesGeneracion.defaultValue    = filtros.mesGeneracion;
    if (filtros.loteId)           fLoteId.defaultValue           = String(filtros.loteId);
    fUseStartDate.defaultValue = filtros.usarStartDate ? 'T' : 'F';
    fIncl.defaultValue = filtros.incluirFacturadas ? 'T' : 'F';
    fControlCuotas.defaultValue = filtros.controlCuotas ? 'T' : 'F';
    fGenerarHastaFinAnio.defaultValue = filtros.generarHastaFinAnio ? 'T' : 'F';
    fAgruPorItem.defaultValue = filtros.agruPorItem ? 'T' : 'F';

    form.addFieldGroup({ id: 'grp_status', label: 'Estado / Paginación' });

    const fTotal = form.addField({
      id: 'custpage_total',
      label: 'Coincidencias (total)',
      type: ui.FieldType.INTEGER,
      container: 'grp_status'
    });
    fTotal.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
    fTotal.defaultValue = String(totalCount || 0);

    const fTotalMonto = form.addField({
      id: 'custpage_total_monto',
      label: 'Total a facturar (total)',
      type: ui.FieldType.CURRENCY,
      container: 'grp_status'
    });
    fTotalMonto.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
    const ta = totalAmount || 0;
    fTotalMonto.defaultValue = ta ? String(ta.toFixed(2)) : '0.00';

    // Page Size selector
    const fPageSize = form.addField({
      id: 'custpage_pagesize',
      label: 'Filas por página',
      type: ui.FieldType.SELECT,
      container: 'grp_status'
    });
    PAGE_SIZES.forEach(sz => fPageSize.addSelectOption({ value: String(sz), text: String(sz) }));
    fPageSize.defaultValue = String(pageSize || DEFAULT_PAGE_SIZE);

    // Current page field
    const fPage = form.addField({
      id: 'custpage_page',
      label: 'Página',
      type: ui.FieldType.INTEGER,
      container: 'grp_status'
    });
    fPage.defaultValue = String(page || 1);

    const fPagesInfo = form.addField({
      id: 'custpage_pages_info',
      label: ' ',
      type: ui.FieldType.INLINEHTML,
      container: 'grp_status'
    });
    fPagesInfo.defaultValue =
      '<div style="padding-top:6px">Página <b>' + String(page) +
      '</b> de <b>' + String(totalPages) + '</b></div>';

    form.addButton({
      id: 'custpage_btn_prev',
      label: '◀ Anterior',
      functionName: 'SL_prevPage'
    });
    form.addButton({
      id: 'custpage_btn_next',
      label: 'Siguiente ▶',
      functionName: 'SL_nextPage'
    });

    let lastLoteUrl = '';
    if (lastLoteId) {
      const lk = linkToLote(lastLoteId);
      lastLoteUrl = lk.url || '';
      const fUrl = form.addField({
        id: 'custpage_last_lote_url',
        label: 'Lote',
        type: ui.FieldType.URL,
        container: 'grp_status'
      });
      fUrl.defaultValue = lastLoteUrl;
      fUrl.linkText = lk.label;

      form.addButton({
        id: 'custpage_btn_open_lote',
        label: 'Abrir Lote #' + lastLoteId,
        functionName: 'SL_openLastLote'
      });
    }

    const sl = form.addSublist({
      id: 'custpage_preview',
      label: 'Vista previa',
      type: ui.SublistType.LIST
    });

    sl.addField({ id: 'col_tipo',    label: 'Tipo',           type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_tranid',  label: 'N° Doc',         type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_fecha',   label: 'Fecha',          type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_cliente', label: 'Cliente',        type: ui.FieldType.TEXT });

    sl.addField({ id: 'col_placa',   label: 'Placa',                     type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_terms',   label: 'Terms',                     type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_items',   label: 'Items',                     type: ui.FieldType.TEXTAREA });
    sl.addField({ id: 'col_cal_fac', label: 'Calendario de facturacion', type: ui.FieldType.TEXTAREA });

    sl.addField({ id: 'col_importe', label: 'Importe',        type: ui.FieldType.CURRENCY });
    sl.addField({ id: 'col_moneda',  label: 'Moneda',         type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_codagru', label: 'Cod. Agrupador', type: ui.FieldType.TEXT });
    sl.addField({ id: 'col_estado',  label: 'Estado',         type: ui.FieldType.TEXT });

    (previewRows || []).forEach((r, i) => {
      sl.setSublistValue({ id: 'col_tipo',    line: i, value: r.tipo || ' ' });
      sl.setSublistValue({ id: 'col_tranid',  line: i, value: r.tranid || ' ' });
      sl.setSublistValue({ id: 'col_fecha',   line: i, value: r.trandate || ' ' });
      sl.setSublistValue({ id: 'col_cliente', line: i, value: r.clienteT || ' ' });

      if (r.placaT) sl.setSublistValue({ id: 'col_placa', line: i, value: r.placaT });
      if (r.termsT) sl.setSublistValue({ id: 'col_terms', line: i, value: r.termsT });
      if (r.itemsT) sl.setSublistValue({ id: 'col_items', line: i, value: r.itemsT });
      if (r.billingScheduleT) sl.setSublistValue({ id: 'col_cal_fac', line: i, value: r.billingScheduleT });

      if (r.total != null && r.total !== '') {
        sl.setSublistValue({ id: 'col_importe', line: i, value: String(r.total) });
      }

      if (r.currencyCode) {
        sl.setSublistValue({
          id: 'col_moneda',
          line: i,
          value: mapCurrencyCode(r.currencyCode)
        });
      }

      if (r.codAgru) {
        sl.setSublistValue({ id: 'col_codagru', line: i, value: r.codAgru });
      }

      sl.setSublistValue({ id: 'col_estado', line: i, value: r.status || ' ' });
    });

    const fAction = form.addField({
      id: 'custpage_action',
      label: 'Acción',
      type: ui.FieldType.TEXT
    });
    fAction.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

    form.addButton({ id: 'custpage_btn_preview', label: 'Vista previa', functionName: 'SL_doPreview' });
    form.addButton({ id: 'custpage_btn_emit', label: 'Crear facturas internas', functionName: 'SL_doEmit' });
    form.addButton({ id: 'custpage_btn_void', label: 'Anular por Lote', functionName: 'SL_doVoid' });
    form.addButton({ id: 'custpage_btn_export', label: 'Exportar CSV', functionName: 'SL_doExport' });
    form.addButton({ id: 'custpage_btn_lot_list', label: 'Lista de Lotes', functionName: 'SL_openLotList' });

    addInlineJS(form, lastLoteUrl);

    if (banner) {
      form.addPageInitMessage({
        type: banner.type || message.Type.INFORMATION,
        title: banner.title || '',
        message: banner.message || ''
      });
    }

    return form;
  }

  // ==================== Main ====================
  function onRequest(ctx) {
    const req = ctx.request;
    const p   = req.parameters || {};

    // paginación (no son filtros de negocio, pero viajan igual en el submit)
    const page = toInt(p.custpage_page) || 1;
    const pageSize = toInt(p.custpage_pagesize) || DEFAULT_PAGE_SIZE;

    const filtros = {
      prevType: p.custpage_prev_type || PREV_TYPES.SO,
      desde: p.custpage_desde || null,
      hasta: p.custpage_hasta || null,
      cliente: toInt(p.custpage_cliente) || null,
      osTranId: p.custpage_os || null,
      codAgru: (p.custpage_cod_agru || '').trim() || null,
      tranDateOverride: toDateStr(p.custpage_trandate_override),
      usarStartDate: (p[FLD_USE_STARTDATE] === 'T'),
      loteId: toInt(p.custpage_lote_id) || null,
      incluirFacturadas: (p.custpage_incluir_facturadas === 'T'),
      controlCuotas: (p[FLD_CONTROL_CUOTAS] === 'T'),
      mesGeneracion: toDateStr(p[FLD_MES_OBJ]),
      generarHastaFinAnio: (p[FLD_CONTROL_ANUAL] === 'T'),
      agruPorItem: (p.custpage_agru_por_item === 'T') // ✅ nuevo
    };

    let banner      = null;
    let previewRows = [];
    let totalCount  = 0;
    let totalAmount = 0;
    let lastLoteId  = null;

    let pageMeta = { page: page, pageSize: pageSize, totalPages: 1 };

    function buildPreviewCurrent() {
      if (filtros.prevType === PREV_TYPES.FIN) {
        if (filtros.loteId) {
          const ids = loadFinIdsFromLote(filtros.loteId);
          const res = previewFIByIdsPaged(ids, pageMeta.page, pageMeta.pageSize);
          previewRows = res.rows;
          totalCount  = res.count;
          totalAmount = res.totalAmount || 0;
          pageMeta = { page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
        } else {
          const res = previewFIByFilters(filtros, pageMeta.page, pageMeta.pageSize);
          previewRows = res.rows;
          totalCount  = res.count;
          totalAmount = res.totalAmount || 0;
          pageMeta = { page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
        }
      } else {
        const res = previewSO(filtros, pageMeta.page, pageMeta.pageSize);
        previewRows = res.rows;
        totalCount  = res.count;
        totalAmount = res.totalAmount || 0;
        pageMeta = { page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
      }
    }

    function renderForm() {
      const form = buildForm({
        filtros,
        previewRows,
        totalCount,
        totalAmount,
        banner,
        lastLoteId,
        page: pageMeta.page,
        pageSize: pageMeta.pageSize,
        totalPages: pageMeta.totalPages
      });
      ctx.response.writePage(form);
    }

    if (req.method === 'GET') {
      renderForm();
      return;
    }

    const action = (p.custpage_action || 'preview').toLowerCase();

    try {
      if (action === 'preview') {
        buildPreviewCurrent();
        banner = {
          type: message.Type.INFORMATION,
          title: 'Vista previa',
          message: 'Coincidencias totales: ' + totalCount
        };
      }

      else if (action === 'emit') {
        const quotaControlError = validateQuotaControl(filtros);
        if (quotaControlError) {
          banner = {
            type: message.Type.WARNING,
            title: 'Control de cuotas incompleto',
            message: quotaControlError
          };
          buildPreviewCurrent();
          renderForm();
          return;
        }

        const ids = collectSOIds(filtros);
        if (!ids.length) {
          banner = {
            type: message.Type.WARNING,
            title: 'Sin resultados',
            message: 'No se encontraron Órdenes de Servicio con esos filtros (según opción de incluir facturadas).'
          };
          previewRows = [];
          totalCount  = 0;
          totalAmount = 0;
          renderForm();
          return;
        }

        const sourceJsonId = saveIdsJson(ids, INPUT_FOLDER_DEFAULT, 'fi_emit_source_ids');

        const loteId = createLote({
          proceso: PROC.EMISION,
          jsonFileId: sourceJsonId,
          filtros,
          total: ids.length
        });
        lastLoteId = loteId;

        try {
          launchMR_Emit(loteId);
          banner = {
            type: message.Type.CONFIRMATION,
            title: 'Proceso iniciado',
            message: 'Lote #' + loteId + ' creado y en proceso.'
          };
        } catch (e) {
          log.error('launchMR_Emit', e);
          banner = {
            type: message.Type.ERROR,
            title: 'Error al lanzar Map/Reduce de Emisión',
            message: (e && e.message) || String(e)
          };
        }

        buildPreviewCurrent();
      }

      else if (action === 'void') {
        const loteId = filtros.loteId;
        if (!loteId) {
          banner = {
            type: message.Type.WARNING,
            title: 'Falta Lote',
            message: 'Indica un Lote ID para ejecutar la Anulación.'
          };
          previewRows = [];
          totalCount  = 0;
          totalAmount = 0;
          renderForm();
          return;
        }

        lastLoteId = loteId;

        try {
          launchMR_Void(loteId);
          banner = {
            type: message.Type.CONFIRMATION,
            title: 'Anulación enviada',
            message: 'Se inició la anulación para el Lote #' + loteId + '.'
          };
        } catch (e) {
          log.error('launchMR_Void', e);
          banner = {
            type: message.Type.ERROR,
            title: 'Error al lanzar Map/Reduce de Anulación',
            message: (e && e.message) || String(e)
          };
        }

        filtros.prevType = PREV_TYPES.FIN;

        const ids = loadFinIdsFromLote(loteId);
        const res = previewFIByIdsPaged(ids, 1, pageMeta.pageSize); // al void, reset page 1
        pageMeta.page = 1;

        previewRows = res.rows;
        totalCount  = res.count;
        totalAmount = res.totalAmount || 0;
        pageMeta = { page: res.page, pageSize: res.pageSize, totalPages: res.totalPages };
      }

      else if (action === 'export') {
        buildPreviewCurrent(); // para tener totalCount actualizado

        if (totalCount > EXPORT_SYNC_MAX) {
          banner = {
            type: message.Type.WARNING,
            title: 'Export demasiado grande',
            message:
              'Tienes ' + totalCount + ' registros. El export directo en Suitelet puede agotarse. ' +
              'Reduce filtros o implementa export en segundo plano (Map/Reduce) para generar el CSV en File Cabinet.'
          };
          renderForm();
          return;
        }

        let rows = [];

        if (filtros.prevType === PREV_TYPES.FIN) {
          if (filtros.loteId) {
            const ids = loadFinIdsFromLote(filtros.loteId);

            const finIds = (ids || []).map(Number).filter(Boolean);
            const batches = chunk(finIds.map(String), 1000);

            for (let b = 0; b < batches.length; b++) {
              const s = search.create({
                type: 'transaction',
                filters: [
                  ['recordtype', 'is', TO_TYPE_INTERNAL_INVOICE], 'AND',
                  ['mainline', 'is', 'T'], 'AND',
                  ['internalid', 'anyof', batches[b]]
                ],
                columns: [
                  'internalid','tranid','trandate','entity','fxamount','statusref','custbody_ht_cod_agru','currency','terms',
                  FLD_SO_BIEN
                ].map(n => search.createColumn({ name: n }))
              });

              const paged = s.runPaged({ pageSize: 1000 });
              for (let i = 0; i < paged.pageRanges.length; i++) {
                paged.fetch({ index: i }).data.forEach(r => {
                  rows.push({
                    tipo: 'FI',
                    id: Number(r.getValue('internalid')),
                    tranid: r.getValue('tranid') || '',
                    trandate: r.getValue('trandate') || '',
                    clienteT: r.getText('entity') || '',
                    total: r.getValue('fxamount') || '',
                    currencyCode: r.getValue('currency') || '',
                    status: r.getValue('statusref') || '',
                    codAgru: r.getValue('custbody_ht_cod_agru') || '',
                    termsT: r.getText('terms') || '',
                    bienId: toInt(r.getValue(FLD_SO_BIEN)) || null,
                    placaT: '',
                    itemsT: '',
                    billingScheduleT: ' - '
                  });
                });
              }
            }

            if (rows.length) {
              const gotIds = rows.map(r => r.id);
              const bienIds = rows.map(r => r.bienId).filter(Boolean);

              const itemsMap = getItemsByFinIds(gotIds);
              const placaMap = getPlacaByBienIds(bienIds);

              rows.forEach(r => {
                const arr = itemsMap[String(r.id)] || itemsMap[r.id] || [];
                r.itemsT = Array.isArray(arr) ? arr.join('\n') : (arr || '');
                r.placaT = (r.bienId && placaMap[r.bienId]) ? placaMap[r.bienId] : '';
              });
            }
          } else {
            rows = exportFIByFiltersAll(filtros);
          }
        } else {
          const ids = collectSOIds(filtros);
          const allIds = (ids || []).map(Number).filter(Boolean);
          const batches = chunk(allIds, 1000);

          for (let b = 0; b < batches.length; b++) {
            const part = fetchSOByIdsPaged(batches[b], 1, batches[b].length);
            rows = rows.concat(part);
          }
        }

        const header = [
          'Tipo',
          'N° Doc',
          'Fecha',
          'Cliente',
          'Placa',
          'Terms',
          'Items',
          'Calendario de facturacion',
          'Importe',
          'Moneda',
          'Cod Agrupador',
          'Estado'
        ];

        function csvEscape(v) {
          const s = (v == null ? '' : String(v));
          if (s.indexOf('"') >= 0 || s.indexOf(',') >= 0 || s.indexOf('\n') >= 0) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        }

        const body = [
          header.join(','),
          ...rows.map(r => [
            csvEscape(r.tipo || ''),
            csvEscape(r.tranid || ''),
            csvEscape(r.trandate || ''),
            csvEscape(r.clienteT || ''),
            csvEscape(r.placaT || ''),
            csvEscape(r.termsT || ''),
            csvEscape(r.itemsT || ''),
            csvEscape(r.billingScheduleT || ''),
            csvEscape(r.total || ''),
            csvEscape(mapCurrencyCode(r.currencyCode) || ''),
            csvEscape(r.codAgru || ''),
            csvEscape(r.status || '')
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

    } catch (e) {
      log.error('SuiteletError', e);
      banner = {
        type: message.Type.ERROR,
        title: 'Error',
        message: (e && e.message) || String(e)
      };
    }

    renderForm();
  }

  return { onRequest };
});
