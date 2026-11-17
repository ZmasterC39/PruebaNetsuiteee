/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/url', 'N/runtime', 'N/file', 'N/log', 'N/cache'],
  (serverWidget, search, url, runtime, file, log, cache) => {

  const FIXED_SUBSIDIARY_ID = '3';
  const FILE_URL_CACHE = {};

  // =========================
  // Helpers
  // =========================
  const cleanStr = (v) => (v === null || v === undefined) ? '' : String(v);
  const trim     = (v) => cleanStr(v).trim();
  const toInt    = (v, def) => { const n = parseInt(cleanStr(v), 10); return Number.isFinite(n) ? n : def; };

  const uniq = (arr) => {
    const seen = {}; const out = [];
    (arr || []).forEach((v) => {
      const s = cleanStr(v).trim();
      if (s && !seen[s]) { seen[s] = true; out.push(s); }
    });
    return out;
  };

  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  const csvCell = (v) => `"${String(cleanStr(v)).replace(/"/g, '""')}"`;

  const setLineValue = (sublist, id, line, val, maxLen = 300) => {
    let s = cleanStr(val);
    if (!s) return;
    sublist.setSublistValue({ id, line, value: s.length > maxLen ? s.substring(0, maxLen) : s });
  };

  const forEachPaged = (searchObj, callback) => {
    const paged = searchObj.runPaged({ pageSize: 1000 });
    for (let p = 0; p < paged.pageRanges.length; p++) {
      const page = paged.fetch({ index: p });
      for (let i = 0; i < page.data.length; i++) callback(page.data[i]);
    }
  };

  const isNumericId = (v) => /^\d+$/.test(cleanStr(v).trim());

  const getFileUrlSafe = (fileId) => {
    try {
      const id = cleanStr(fileId).trim();
      if (!id) return '';
      if (FILE_URL_CACHE[id]) return FILE_URL_CACHE[id];
      const f = file.load({ id });
      const u = (f && f.url) ? cleanStr(f.url) : '';
      FILE_URL_CACHE[id] = u;
      return u;
    } catch (e) { return ''; }
  };

  // =========================
  // Parser lista OS tranid
  // =========================
  const parseTranIdList = (raw) => {
    const s = cleanStr(raw);
    if (!s) return [];
    const tokens = s.split(/[\s,;]+/g).map(x => x.trim()).filter(Boolean);
    return uniq(tokens);
  };

  // =========================
  // Cache token helpers (NO llamar cache.getCache aquí)
  // =========================
  const makeToken = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const loadOsTextFromToken = (listCache, token) => {
    const t = trim(token);
    if (!t) return '';
    try {
      return listCache.get({ key: t, loader: () => '' }) || '';
    } catch (_e) {
      return '';
    }
  };

  const storeOsTextAndGetToken = (listCache, text) => {
    const payload = cleanStr(text);
    if (!payload) return '';
    const token = makeToken();
    // TTL 6 horas
    listCache.put({ key: token, value: payload, ttl: 6 * 60 * 60 });
    return token;
  };

  // ============================================================
  // Resolver lista de OS tranid => internalid (Sales Order)
  // ============================================================
  const getSalesOrderIdsByTranIds = (osTranIds) => {
    const list = uniq(osTranIds || []);
    if (!list.length) return { soIds: [] };

    const soIds = [];

    const buildTranIdOrFilter = (chunk) => {
      const innerOr = [];
      for (let i = 0; i < chunk.length; i++) {
        if (i) innerOr.push('OR');
        innerOr.push(['tranid', 'is', chunk[i]]);
      }
      return innerOr;
    };

    for (const chunk of chunkArray(list, 50)) {
      const s = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ['mainline', 'is', 'T'], 'AND',
          ['subsidiary', 'anyof', FIXED_SUBSIDIARY_ID], 'AND',
          buildTranIdOrFilter(chunk)
        ],
        columns: [ search.createColumn({ name: 'internalid' }) ]
      });

      forEachPaged(s, (r) => {
        const id = cleanStr(r.getValue({ name: 'internalid' }));
        if (id) soIds.push(id);
      });
    }

    return { soIds: uniq(soIds) };
  };

  // ============================================================
  // Búsqueda principal: INVOICE (sin filtro por fecha)
  // ============================================================
  const createInvoiceSearch = (soIds) => {
    const filters = [
      ['mainline', 'is', 'T'], 'AND',
      ['subsidiary', 'anyof', FIXED_SUBSIDIARY_ID], 'AND',
      ['createdfrom', 'anyof', soIds]
    ];

    return search.create({
      type: search.Type.INVOICE,
      filters,
      columns: [
        search.createColumn({ name: 'createdfrom', sort: search.Sort.ASC }),
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'tranid' }),
        search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
        search.createColumn({ name: 'fxamount' }),
        search.createColumn({ name: 'custbody_pe_serie' }),
        search.createColumn({ name: 'custbody_pe_number' }),
        search.createColumn({ name: 'custbody_pe_ei_printed_pdf' }),
        search.createColumn({ name: 'altname',                       join: 'customerMain' }),
        search.createColumn({ name: 'custentity_pe_document_number', join: 'customerMain' }),
        search.createColumn({ name: 'custentity_pe_document_type',   join: 'customerMain' })
      ]
    });
  };

  const buildInvoicePdfUrl = (invId, pdfFileId) => {
    const fid = cleanStr(pdfFileId);
    if (fid && isNumericId(fid)) {
      const u = getFileUrlSafe(fid);
      if (u) return u;
    }
    const id = cleanStr(invId);
    if (id && isNumericId(id)) {
      return url.resolveRecord({ recordType: 'invoice', recordId: id, isEditMode: false });
    }
    return '';
  };

  // ============================================================
  // UI helpers
  // ============================================================
  const pickParamsForLinks = (params) => ({
    custpage_pagesize: cleanStr(params.custpage_pagesize) || '50',
    custpage_page:     cleanStr(params.custpage_page)     || '0',
    custpage_token:    cleanStr(params.custpage_token)    || ''
  });

  const addExportButton = (form) => {
    const fldAction = form.addField({ id: 'custpage_action', type: serverWidget.FieldType.TEXT, label: ' ' });
    fldAction.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    fldAction.defaultValue = '';

    form.addButton({ id: 'custpage_btn_export', label: 'Exportar a CSV', functionName: 'custpage_export_csv' });

    const fld = form.addField({ id: 'custpage_export_js', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
    fld.defaultValue = `
      <script>
        function custpage_export_csv(){
          try{
            var f = document.forms && document.forms[0];
            if (!f) return;
            var act = document.getElementById('custpage_action');
            if (!act){
              act = document.createElement('input');
              act.type = 'hidden'; act.name = 'custpage_action'; act.id = 'custpage_action';
              f.appendChild(act);
            }
            act.value = 'export';
            f.submit();
          }catch(_e){}
        }
      </script>`;
  };

  const buildPagingHtml = ({ params, total, pageIndex, pageSize, totalPages, shown }) => {
    const cs         = runtime.getCurrentScript();
    const baseParams = pickParamsForLinks(params);

    const makeHref = (page) => url.resolveScript({
      scriptId: cs.id, deploymentId: cs.deploymentId,
      params: { ...baseParams, custpage_page: String(page) }
    });

    const start    = total === 0 ? 0 : pageIndex * pageSize + 1;
    const end      = total === 0 ? 0 : pageIndex * pageSize + shown;
    const firstIdx = 0;
    const lastIdx  = Math.max(0, totalPages - 1);

    const disabled = (txt) => `<span style="opacity:.45;cursor:not-allowed;">${txt}</span>`;
    const a = (txt, page, dis) => dis ? disabled(txt) : `<a href="${makeHref(page)}" style="text-decoration:none;">${txt}</a>`;

    return `
      <div style="margin:10px 0;padding:10px;border:1px solid #ddd;border-radius:8px;">
        <div style="margin-bottom:6px;">
          Mostrando <b>${start}</b>–<b>${end}</b> de <b>${total}</b>
          &nbsp;|&nbsp; Página <b>${totalPages === 0 ? 0 : pageIndex + 1}</b> de <b>${totalPages}</b>
          &nbsp;|&nbsp; Tamaño: <b>${pageSize}</b>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          ${a('⏮ Primera',   firstIdx,      pageIndex <= 0       || totalPages === 0)}
          ${a('◀ Anterior',  pageIndex - 1, pageIndex <= 0       || totalPages === 0)}
          ${a('Siguiente ▶', pageIndex + 1, pageIndex >= lastIdx || totalPages === 0)}
          ${a('Última ⏭',    lastIdx,       pageIndex >= lastIdx || totalPages === 0)}
        </div>
      </div>`;
  };

  const buildForm = (params) => {
    const form = serverWidget.createForm({ title: 'Reporte Facturas por Órdenes (createdfrom)' });

    const fldPage = form.addField({ id: 'custpage_page', type: serverWidget.FieldType.INTEGER, label: ' ' });
    fldPage.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const fldToken = form.addField({ id: 'custpage_token', type: serverWidget.FieldType.TEXT, label: ' ' });
    fldToken.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const fldPageSize = form.addField({ id: 'custpage_pagesize', type: serverWidget.FieldType.SELECT, label: 'Tamaño página' });
    ['50','100','200','500'].forEach((v) => fldPageSize.addSelectOption({ value: v, text: v }));

    form.addField({
      id: 'custpage_os_tranid',
      type: serverWidget.FieldType.LONGTEXT,
      label: 'Órdenes de servicio (tranid) — pega lista (filtra por createdfrom)'
    });

    form.getField({ id: 'custpage_os_tranid' }).defaultValue = cleanStr(params.custpage_os_tranid) || '';
    fldToken.defaultValue = cleanStr(params.custpage_token) || '';
    fldPageSize.defaultValue = cleanStr(params.custpage_pagesize) || '50';
    fldPage.defaultValue = String(toInt(params.custpage_page, 0));

    form.addSubmitButton({ label: 'Buscar' });
    addExportButton(form);

    const fldCount = form.addField({ id: 'custpage_count', type: serverWidget.FieldType.INTEGER, label: 'Recuento' });
    fldCount.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

    const fldPaging = form.addField({ id: 'custpage_paging', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
    const fldWarn   = form.addField({ id: 'custpage_warn',   type: serverWidget.FieldType.INLINEHTML, label: ' ' });

    const sublist = form.addSublist({ id: 'custpage_results', type: serverWidget.SublistType.LIST, label: 'Detalle' });

    sublist.addField({ id: 'custpage_inv_view',       type: serverWidget.FieldType.URL,  label: 'Ver Factura' });
    sublist.addField({ id: 'custpage_so_tranid',      type: serverWidget.FieldType.TEXT, label: 'Orden de servicio' });
    sublist.addField({ id: 'custpage_inv_internalid', type: serverWidget.FieldType.TEXT, label: 'ID INTERNO FV' });
    sublist.addField({ id: 'custpage_inv_tranid',     type: serverWidget.FieldType.TEXT, label: 'Factura' });
    sublist.addField({ id: 'custpage_inv_date',   type: serverWidget.FieldType.TEXT, label: 'Fecha Factura' });
    sublist.addField({ id: 'custpage_inv_monto',  type: serverWidget.FieldType.TEXT, label: 'Monto' });
    sublist.addField({ id: 'custpage_inv_serie',  type: serverWidget.FieldType.TEXT, label: 'Serie' });
    sublist.addField({ id: 'custpage_inv_penum',  type: serverWidget.FieldType.TEXT, label: 'PE Número' });
    sublist.addField({ id: 'custpage_cust_name',  type: serverWidget.FieldType.TEXT, label: 'Cliente:Nombre' });
    sublist.addField({ id: 'custpage_cust_doc',   type: serverWidget.FieldType.TEXT, label: 'Cliente:Nro de documento' });
    sublist.addField({ id: 'custpage_cust_rucdni',type: serverWidget.FieldType.TEXT, label: 'RUC o DNI' });
    sublist.addField({ id: 'custpage_inv_pdf',    type: serverWidget.FieldType.URL,  label: 'PDF Factura' });

    const invView = sublist.getField({ id: 'custpage_inv_view' });
    if (invView) invView.linkText = 'Ver';

    const invPdf = sublist.getField({ id: 'custpage_inv_pdf' });
    if (invPdf) invPdf.linkText = 'Ver PDF';

    return { form, sublist, fldCount, fldWarn, fldPaging, fldToken };
  };

  // ============================================================
  // Run paged + fill
  // ============================================================
  const runSearchAndFill = (listCache, params, sublist) => {
    const pageSize = Math.min(Math.max(toInt(params.custpage_pagesize, 50), 1), 1000);
    let pageIndex  = Math.max(toInt(params.custpage_page, 0), 0);

    let token = trim(params.custpage_token);
    let osText = token ? loadOsTextFromToken(listCache, token) : '';

    if (!osText) {
      osText = cleanStr(params.custpage_os_tranid);
      if (osText) token = storeOsTextAndGetToken(listCache, osText);
    }

    const osList = parseTranIdList(osText);
    if (!osList.length) {
      return { total: 0, pageIndex: 0, pageSize, totalPages: 0, shown: 0,
        warn: 'Pega una lista de Órdenes de Servicio (tranid) para filtrar por createdfrom.', token };
    }

    const { soIds } = getSalesOrderIdsByTranIds(osList);
    if (!soIds.length) {
      return { total: 0, pageIndex: 0, pageSize, totalPages: 0, shown: 0,
        warn: 'No se encontraron Órdenes de Servicio para la lista pegada.', token };
    }

    const invSearch  = createInvoiceSearch(soIds);
    const paged      = invSearch.runPaged({ pageSize });
    const total      = paged.count;
    const totalPages = paged.pageRanges.length;

    if (totalPages === 0) return { total, pageIndex: 0, pageSize, totalPages: 0, shown: 0, warn: '', token };
    if (pageIndex > totalPages - 1) pageIndex = totalPages - 1;

    const page = paged.fetch({ index: pageIndex });

    let line = 0;
    for (let i = 0; i < page.data.length; i++) {
      const r = page.data[i];

      const soTran = cleanStr(r.getText({ name: 'createdfrom' })) || cleanStr(r.getValue({ name: 'createdfrom' }));
      const invId      = cleanStr(r.getValue({ name: 'internalid' }));
      const invTranId  = cleanStr(r.getValue({ name: 'tranid' }));
      const invDateVal = r.getValue({ name: 'trandate' });
      const invDateStr = invDateVal instanceof Date ? String(invDateVal) : cleanStr(invDateVal);
      const monto = cleanStr(r.getValue({ name: 'fxamount' }));
      const serie = cleanStr(r.getText({ name: 'custbody_pe_serie' })) || cleanStr(r.getValue({ name: 'custbody_pe_serie' }));
      const peNum = cleanStr(r.getValue({ name: 'custbody_pe_number' }));
      const custName = cleanStr(r.getValue({ name: 'altname', join: 'customerMain' }));
      const custDoc  = cleanStr(r.getValue({ name: 'custentity_pe_document_number', join: 'customerMain' }));
      const rucDni   = cleanStr(r.getText({ name: 'custentity_pe_document_type', join: 'customerMain' })) ||
                       cleanStr(r.getValue({ name: 'custentity_pe_document_type', join: 'customerMain' }));

      const invUrl = invId ? url.resolveRecord({ recordType: 'invoice', recordId: invId, isEditMode: false }) : '';
      const pdfFileId = cleanStr(r.getValue({ name: 'custbody_pe_ei_printed_pdf' }));
      const pdfUrl    = buildInvoicePdfUrl(invId, pdfFileId);

      setLineValue(sublist, 'custpage_inv_view',       line, invUrl, 4000);
      setLineValue(sublist, 'custpage_so_tranid',      line, soTran, 4000);
      setLineValue(sublist, 'custpage_inv_internalid', line, invId);
      setLineValue(sublist, 'custpage_inv_tranid',     line, invTranId);
      setLineValue(sublist, 'custpage_inv_date',    line, invDateStr, 100);
      setLineValue(sublist, 'custpage_inv_monto',   line, monto);
      setLineValue(sublist, 'custpage_inv_serie',   line, serie);
      setLineValue(sublist, 'custpage_inv_penum',   line, peNum);
      setLineValue(sublist, 'custpage_cust_name',   line, custName);
      setLineValue(sublist, 'custpage_cust_doc',    line, custDoc);
      setLineValue(sublist, 'custpage_cust_rucdni', line, rucDni);
      setLineValue(sublist, 'custpage_inv_pdf',     line, pdfUrl, 4000);

      line++;
    }

    return { total, pageIndex, pageSize, totalPages, shown: line, warn: '', token };
  };

  // ============================================================
  // Export CSV (solo detallado, SIN PDF)
  // ============================================================
  const exportCsv = (listCache, context, params) => {
    try {
      const token = trim(params.custpage_token);
      const osText = token ? loadOsTextFromToken(listCache, token) : cleanStr(params.custpage_os_tranid);

      const osList = parseTranIdList(osText);
      if (!osList.length) {
        context.response.addHeader({ name: 'Content-Type', value: 'text/plain; charset=UTF-8' });
        context.response.write('Pega una lista de Órdenes de Servicio (tranid) para filtrar por createdfrom.');
        return;
      }

      const { soIds } = getSalesOrderIdsByTranIds(osList);
      if (!soIds.length) {
        context.response.addHeader({ name: 'Content-Type', value: 'text/plain; charset=UTF-8' });
        context.response.write('No se encontraron Órdenes de Servicio para la lista pegada.');
        return;
      }

      const invSearch = createInvoiceSearch(soIds);
      const paged     = invSearch.runPaged({ pageSize: 1000 });

      const headers = [
        'Orden de servicio',
        'ID INTERNO FV',
        'Factura',
        'Fecha Factura',
        'Monto',
        'Serie',
        'PE Número',
        'Cliente:Nombre',
        'Cliente:Nro de documento',
        'RUC o DNI'
      ];

      const lines = ['\ufeff' + headers.map(csvCell).join(',')];

      for (let p = 0; p < paged.pageRanges.length; p++) {
        const page = paged.fetch({ index: p });
        for (let i = 0; i < page.data.length; i++) {
          const r = page.data[i];

          const soTran = cleanStr(r.getText({ name: 'createdfrom' })) || cleanStr(r.getValue({ name: 'createdfrom' }));
          const invId      = cleanStr(r.getValue({ name: 'internalid' }));
          const invTranId  = cleanStr(r.getValue({ name: 'tranid' }));
          const invDateVal = r.getValue({ name: 'trandate' });
          const invDateStr = invDateVal instanceof Date ? String(invDateVal) : cleanStr(invDateVal);
          const monto = cleanStr(r.getValue({ name: 'fxamount' }));
          const serie = cleanStr(r.getText({ name: 'custbody_pe_serie' })) || cleanStr(r.getValue({ name: 'custbody_pe_serie' }));
          const peNum = cleanStr(r.getValue({ name: 'custbody_pe_number' }));
          const custName = cleanStr(r.getValue({ name: 'altname', join: 'customerMain' }));
          const custDoc  = cleanStr(r.getValue({ name: 'custentity_pe_document_number', join: 'customerMain' }));
          const rucDni   = cleanStr(r.getText({ name: 'custentity_pe_document_type', join: 'customerMain' })) ||
                           cleanStr(r.getValue({ name: 'custentity_pe_document_type', join: 'customerMain' }));

          lines.push([ soTran, invId, invTranId, invDateStr, monto, serie, peNum, custName, custDoc, rucDni ].map(csvCell).join(','));
        }
      }

      const csv = lines.join('\n');
      context.response.addHeader({ name: 'Content-Type',        value: 'text/csv; charset=UTF-8' });
      context.response.addHeader({ name: 'Content-Disposition', value: 'attachment; filename="reporte_facturas_por_os.csv"' });
      context.response.write(csv);

    } catch (e) {
      log.error({ title: 'ERROR EXPORT CSV', details: e });
      context.response.addHeader({ name: 'Content-Type', value: 'text/plain; charset=UTF-8' });
      context.response.write(
        'Error al exportar.\n\nDetalle:\n' +
        (e && (e.name || e.type) ? `name/type: ${e.name || e.type}\n` : '') +
        (e && e.message          ? `message: ${e.message}\n`          : '') +
        (e && e.stack            ? `stack:\n${e.stack}\n`             : `raw:\n${String(e)}\n`)
      );
    }
  };

  // ============================================================
  // onRequest
  // ============================================================
  const onRequest = (context) => {
    // ✅ Crear cache AQUÍ (ya dentro del runtime)
    const listCache = cache.getCache({ name: 'OS_LIST_CACHE' });

    const params = context.request.parameters || {};
    const action = trim(params.custpage_action);

    if (action === 'export') { exportCsv(listCache, context, params); return; }

    const { form, sublist, fldCount, fldWarn, fldPaging, fldToken } = buildForm(params);

    try {
      const result = runSearchAndFill(listCache, params, sublist);

      if (fldToken) fldToken.defaultValue = cleanStr(result.token) || cleanStr(params.custpage_token) || '';

      fldCount.defaultValue  = String(result.total);
      fldPaging.defaultValue = buildPagingHtml({
        params: { ...params, custpage_token: cleanStr(result.token) || cleanStr(params.custpage_token) || '' },
        total: result.total,
        pageIndex: result.pageIndex,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        shown: result.shown
      });

      fldWarn.defaultValue = result.warn
        ? `<div style="margin-top:8px;padding:8px;border:1px solid #b00;border-radius:6px;">${cleanStr(result.warn)}</div>`
        : '';

    } catch (e) {
      fldCount.defaultValue  = '0';
      fldPaging.defaultValue = '';
      fldWarn.defaultValue   = `<div style="margin-top:8px;padding:8px;border:1px solid #b00;border-radius:6px;">
        Error al generar el reporte: ${cleanStr(e && e.message ? e.message : e)}
      </div>`;
    }

    context.response.writePage(form);
  };

  return { onRequest };
});