/**
 * Recalcula Estado Facturación OS (Subsidiaria 3) al crear/editar Factura de Venta
 *
 * OBJETIVO (como tu Map/Reduce + manteniendo extras UE):
 * ✅ SOLO Subsidiaria 3
 * ✅ Estado SOLO 2 valores: FACTURADO (1) o NO_FACTURADO (3)  -> NUNCA usa "2"
 * ✅ Considera TODOS los caminos (MR-style):
 *   A) Invoice.createdfrom = SalesOrd (SO directo)
 *   B) Cadena: Invoice -> Factura Interna (customsale_ec_factura_interna) -> SO
 *      - Invoice se vincula a internas por customrecord_ht_fact_internas_asociadas (registro puente)
 *      - Interna apunta a SO por custbody_ec_created_from_fac_int (o createdfrom)
 *   C) SO.custbody_ht_factura_directa = Invoice (aunque no esté en links)
 *   D) Docs de facturación del SO: invoices por createdfrom + incluye factura directa + internas asociadas
 * ✅ WHT/detracción: suma líneas custcol_4601_witaxline al total (gross)
 * ✅ FIX: en SO usa amountremaining (NO balance)
 *
 * EXTRA UE (no tocar):
 * + "Facturación Directa" -> al CREAR o EDITAR Invoice, crea vínculo OS-INV en customrecord_ht_pe_os_inv
 *   - SOLO si Invoice.createdfrom existe y es SalesOrd
 *   - Evita duplicados
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  /* ===================== CONFIG ===================== */
  const CONFIG = {
    SUBSIDIARY_ID: '3',

    FIELD_STATUS_OS: 'custbody_estado_facturacion_os',
    STATUS: {
      FACTURADO: '1',
      NO_FACTURADO: '3'
    },

    INCLUDE_CASH_SALE: false,

    FX_TOTAL_TOLERANCE: 0.01,
    BASE_TOTAL_TOLERANCE: 0.05,

    // Campos
    SO_DIRECT_INVOICE_FIELD: 'custbody_ht_factura_directa',
    INTERNAL_INVOICE_RECORDTYPE: 'customsale_ec_factura_interna',
    INTERNAL_INVOICE_SO_FIELD: 'custbody_ec_created_from_fac_int',

    // WHT
    WHT_LINE_FLAG: 'custcol_4601_witaxline',

    // Registro puente Invoice -> Internas
    CUSTOMREC_FACT_INT_ASOC: 'customrecord_ht_fact_internas_asociadas',
    CR_FIELD_FACTURA: 'custrecord_nro_factura',
    CR_FIELD_FACTURA_INTERNA: 'custrecord_nro_factura_interna',

    /* ===================== EXTRA: vínculo Facturación Directa ===================== */
    LINK_RECORDTYPE: 'customrecord_ht_pe_os_inv',
    LINK_FIELD_OS: 'custrecord_ht_pe_os_inv',   // Sales Order / OS
    LINK_FIELD_INV: 'custrecord_ht_pe_inv_os',  // Invoice
    AVOID_DUPLICATE_LINK: true,
    DEBUG_LINK: true,

    DEBUG: false
  };

  /* ===================== Helpers ===================== */
  const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const abs = (n) => Math.abs(toNumber(n));
  const isTruthy = (val) => val === true || val === 'T' || val === 'true';
  const withinTol = (a, b, tol) => abs(toNumber(a) - toNumber(b)) <= tol;

  function getAllResults(searchObj) {
    const out = [];
    const paged = searchObj.runPaged({ pageSize: 1000 });
    paged.pageRanges.forEach((pr) => {
      const page = paged.fetch({ index: pr.index });
      page.data.forEach((r) => out.push(r));
    });
    return out;
  }

  function nsTypeToRecordType(typeStr) {
    const t = String(typeStr || '');
    if (t === 'CustInvc' || t === 'invoice' || t === 'custinvc') return record.Type.INVOICE;
    if (t === 'CashSale' || t === 'cashsale') return record.Type.CASH_SALE;
    if (t === 'SalesOrd' || t === 'salesorder' || t === 'salesord') return record.Type.SALES_ORDER;
    return null;
  }

  function safeTypeFromTxnSearch(internalId) {
    try {
      const s = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['internalid', 'anyof', String(internalId)]
        ],
        columns: [search.createColumn({ name: 'type' })]
      });
      const rows = getAllResults(s);
      if (rows && rows.length) return String(rows[0].getValue({ name: 'type' }) || '');
    } catch (e) {}
    return '';
  }

  function safeTxnSubsidiary(internalId) {
    if (!internalId) return '';
    try {
      const s = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['internalid', 'anyof', String(internalId)]
        ],
        columns: [search.createColumn({ name: 'subsidiary' })]
      });
      const rows = getAllResults(s);
      if (rows && rows.length) return String(rows[0].getValue({ name: 'subsidiary' }) || '');
    } catch (e) {}
    return '';
  }

  function isTxnInSub3(internalId) {
    const sub = safeTxnSubsidiary(internalId);
    return !sub ? false : String(sub) === String(CONFIG.SUBSIDIARY_ID);
  }

  /* ===================== Invoice/CashSale Gross (con WHT) ===================== */
  function computeGrossByLoadingDoc(recType, docId) {
    const rec = record.load({ type: recType, id: docId, isDynamic: false });

    // ✅ SOLO subsidiaria 3 (si campo existe)
    try {
      const sub = String(rec.getValue('subsidiary') || '');
      if (sub && String(sub) !== String(CONFIG.SUBSIDIARY_ID)) return null;
    } catch (e) {}

    try {
      const voided = rec.getValue('voided');
      if (isTruthy(voided)) return null;
    } catch (e) {}

    const totalFx = toNumber(rec.getValue('total'));
    const exch = toNumber(rec.getValue('exchangerate')) || 1;

    let whtFx = 0;
    const sublistId = 'item';
    const lineCount = rec.getLineCount({ sublistId });

    for (let i = 0; i < lineCount; i++) {
      let isWhtLine = false;
      try {
        isWhtLine = isTruthy(rec.getSublistValue({ sublistId, fieldId: CONFIG.WHT_LINE_FLAG, line: i }));
      } catch (e) {}
      if (!isWhtLine) continue;

      const amt = toNumber(rec.getSublistValue({ sublistId, fieldId: 'amount', line: i }));
      whtFx += abs(amt);
    }

    const grossFx = totalFx + whtFx;
    const grossBase = grossFx * exch;

    return {
      grossFx: Number(grossFx.toFixed(2)),
      grossBase: Number(grossBase.toFixed(2)),
      exchangerate: exch
    };
  }

  /* ===================== Bridge: Invoice -> Internas ===================== */
  function getInternalInvoiceIdsFromInvoice(invoiceId) {
    const out = {};
    if (!invoiceId) return [];

    try {
      const s = search.create({
        type: CONFIG.CUSTOMREC_FACT_INT_ASOC,
        filters: [[CONFIG.CR_FIELD_FACTURA, 'anyof', String(invoiceId)]],
        columns: [search.createColumn({ name: CONFIG.CR_FIELD_FACTURA_INTERNA })]
      });

      const rows = getAllResults(s);
      rows.forEach(r => {
        const id = String(r.getValue({ name: CONFIG.CR_FIELD_FACTURA_INTERNA }) || '');
        if (id) out[id] = true;
      });
    } catch (e) {}

    return Object.keys(out);
  }

  function getSOIdFromInternalInvoice(internalId) {
    if (!internalId) return '';
    try {
      const fi = record.load({ type: CONFIG.INTERNAL_INVOICE_RECORDTYPE, id: internalId, isDynamic: false });

      // ✅ SOLO sub 3 si existe campo
      try {
        const sub = String(fi.getValue('subsidiary') || '');
        if (sub && String(sub) !== String(CONFIG.SUBSIDIARY_ID)) return '';
      } catch (e) {}

      const so1 = String(fi.getValue(CONFIG.INTERNAL_INVOICE_SO_FIELD) || '');
      const so2 = String(fi.getValue('createdfrom') || '');
      return so1 || so2 || '';
    } catch (e) {
      return '';
    }
  }

  /* ===================== Resolver SOs desde Invoice/CashSale (sin depender solo de createdfrom) ===================== */
  function findSOIdsByDirectInvoice(txnId) {
    const out = [];
    try {
      const s = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', [CONFIG.SO_DIRECT_INVOICE_FIELD, 'anyof', String(txnId)]
        ],
        columns: [search.createColumn({ name: 'internalid' })]
      });
      const rows = getAllResults(s);
      rows.forEach(r => {
        const id = String(r.getValue({ name: 'internalid' }) || '');
        if (id) out.push(id);
      });
    } catch (e) {}
    return out;
  }

  function resolveSOIdsFromTxn(txnRec) {
    const soIds = {};
    const txnId = String(txnRec.id || '');
    if (!txnId) return [];

    // ✅ 0) Solo procesar si la transacción es sub 3
    // (esto evita que dispare recálculo por docs de otras subsidiarias)
    try {
      const txnSub = String(txnRec.getValue('subsidiary') || '');
      if (txnSub && String(txnSub) !== String(CONFIG.SUBSIDIARY_ID)) return [];
    } catch (e) {}

    // ✅ A) createdfrom -> SalesOrd (si existe)
    let createdFrom = '';
    try { createdFrom = String(txnRec.getValue('createdfrom') || ''); } catch (e) {}
    if (createdFrom) {
      const fromType = safeTypeFromTxnSearch(createdFrom);
      if (fromType === 'SalesOrd') {
        soIds[String(createdFrom)] = true;
      }
    }

    // ✅ B) SOs que tengan este invoice como factura directa (custbody_ht_factura_directa)
    const byDirect = findSOIdsByDirectInvoice(txnId);
    byDirect.forEach(id => { soIds[String(id)] = true; });

    // ✅ C) Internas asociadas al Invoice -> SO (custbody_ec_created_from_fac_int / createdfrom)
    const internalIds = getInternalInvoiceIdsFromInvoice(txnId);
    for (let i = 0; i < internalIds.length; i++) {
      const soId = getSOIdFromInternalInvoice(internalIds[i]);
      if (soId) soIds[String(soId)] = true;
    }

    return Object.keys(soIds);
  }

  /* ===================== Cargar SO / Montos ===================== */
  function loadSOInfo(soId) {
    const soRec = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: false });

    const subsidiary = String(soRec.getValue('subsidiary') || '');
    const currencyId = String(soRec.getValue('currency') || '');
    const exchangerate = toNumber(soRec.getValue('exchangerate')) || 1;

    const soTotalFx = toNumber(soRec.getValue('total'));
    const soTotalBase = soTotalFx * exchangerate;

    const amountRemaining = toNumber(soRec.getValue('amountremaining')); // ✅ FIX
    const unbilled = toNumber(soRec.getValue('unbilledorders'));

    const directInvoiceId = String(soRec.getValue(CONFIG.SO_DIRECT_INVOICE_FIELD) || '');
    const currentStatusId = String(soRec.getValue(CONFIG.FIELD_STATUS_OS) || '');

    return {
      soRec,
      subsidiary,
      currencyId,
      exchangerate,
      soTotalFx: Number(soTotalFx.toFixed(2)),
      soTotalBase: Number(soTotalBase.toFixed(2)),
      amountRemaining: Number(amountRemaining.toFixed(2)),
      unbilled: Number(unbilled.toFixed(2)),
      directInvoiceId,
      currentStatusId
    };
  }

  /* ===================== Buscar docs de facturación (Invoice/CashSale) + directInvoice + internas asociadas ===================== */
  function findBillingDocsForSO(soId, directInvoiceId) {
    const types = CONFIG.INCLUDE_CASH_SALE ? ['CustInvc', 'CashSale'] : ['CustInvc'];
    const docs = [];
    const seen = {};

    // 1) Facturas (y cash sales) por createdfrom = SO
    try {
      const s = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof'].concat(types),
          'AND', ['voided', 'is', 'F'],
          'AND', ['subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['createdfrom', 'anyof', String(soId)]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' })
        ]
      });

      const rows = getAllResults(s);
      rows.forEach(r => {
        const id = String(r.getValue({ name: 'internalid' }) || '');
        if (!id || seen[id]) return;
        seen[id] = true;
        docs.push({ id, nsType: String(r.getValue({ name: 'type' }) || '') });
      });
    } catch (e) {}

    // 2) Incluir factura directa (SO.custbody_ht_factura_directa)
    const di = String(directInvoiceId || '');
    if (di && !seen[di] && isTxnInSub3(di)) {
      seen[di] = true;
      docs.push({ id: di, nsType: 'CustInvc' });
    }

    // 3) Incluir internas asociadas a la factura directa (por puente) -> cuentan como facturación
    if (di && isTxnInSub3(di)) {
      const internalIds = getInternalInvoiceIdsFromInvoice(di);
      internalIds.forEach(internalId => {
        if (!internalId || seen[internalId]) return;
        // la interna es custom transaction (no Transaction type estándar), la procesamos aparte
        seen[internalId] = true;
        docs.push({ id: internalId, nsType: 'INTERNAL' });
      });
    }

    return docs;
  }

  /* ===================== Decidir estado (SOLO Facturado / No facturado) ===================== */
  function decideStatusForSO(soId) {
    const soInfo = loadSOInfo(soId);
    if (String(soInfo.subsidiary) !== String(CONFIG.SUBSIDIARY_ID)) return null;

    const docs = findBillingDocsForSO(soId, soInfo.directInvoiceId);

    if (!docs.length) {
      return {
        currentStatusId: soInfo.currentStatusId,
        newStatusId: CONFIG.STATUS.NO_FACTURADO,
        reason: 'no_billing_docs',
        meta: { docsCount: 0 }
      };
    }

    let billedGrossFx = 0;
    let billedGrossBase = 0;

    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];

      // A) Invoice/CashSale: gross por load + WHT
      if (d.nsType !== 'INTERNAL') {
        const recType = nsTypeToRecordType(d.nsType) || record.Type.INVOICE;
        const calc = computeGrossByLoadingDoc(recType, d.id);
        if (!calc) continue;
        billedGrossFx += toNumber(calc.grossFx);
        billedGrossBase += toNumber(calc.grossBase);
        continue;
      }

      // B) Interna: suma como facturación (también puede tener WHT flag si aplica en líneas)
      //    Como es custom transaction, la cargamos con record.load del recordtype customsale_ec_factura_interna
      try {
        const fi = record.load({ type: CONFIG.INTERNAL_INVOICE_RECORDTYPE, id: d.id, isDynamic: false });

        // ✅ solo sub 3 si existe
        try {
          const sub = String(fi.getValue('subsidiary') || '');
          if (sub && String(sub) !== String(CONFIG.SUBSIDIARY_ID)) continue;
        } catch (e) {}

        // voided (si existe)
        try {
          const voided = fi.getValue('voided');
          if (isTruthy(voided)) continue;
        } catch (e) {}

        const totalFx = toNumber(fi.getValue('total'));
        const exch = toNumber(fi.getValue('exchangerate')) || 1;

        let whtFx = 0;
        const sublistId = 'item';
        const lineCount = fi.getLineCount({ sublistId });
        for (let ln = 0; ln < lineCount; ln++) {
          let isWhtLine = false;
          try {
            isWhtLine = isTruthy(fi.getSublistValue({ sublistId, fieldId: CONFIG.WHT_LINE_FLAG, line: ln }));
          } catch (e) {}
          if (!isWhtLine) continue;

          const amt = toNumber(fi.getSublistValue({ sublistId, fieldId: 'amount', line: ln }));
          whtFx += abs(amt);
        }

        const grossFx = totalFx + whtFx;
        const grossBase = grossFx * exch;

        billedGrossFx += toNumber(grossFx);
        billedGrossBase += toNumber(grossBase);

      } catch (e) {
        // si falla, no rompemos
      }
    }

    billedGrossFx = Number(billedGrossFx.toFixed(2));
    billedGrossBase = Number(billedGrossBase.toFixed(2));

    // ✅ Criterios de FACTURADO:
    // - Match por FX contra total SO
    // - O flags de SO (amountremaining/unbilled) en 0 (tolerancia)
    // - O match base (fallback)
    let facturado = false;
    let reason = 'no_match';

    if (soInfo.soTotalFx > 0 && billedGrossFx > 0 && withinTol(billedGrossFx, soInfo.soTotalFx, CONFIG.FX_TOTAL_TOLERANCE)) {
      facturado = true;
      reason = `fx_match tol=${CONFIG.FX_TOTAL_TOLERANCE}`;
    } else if (
      withinTol(soInfo.amountRemaining, 0, CONFIG.BASE_TOTAL_TOLERANCE) &&
      withinTol(soInfo.unbilled, 0, CONFIG.BASE_TOTAL_TOLERANCE)
    ) {
      facturado = true;
      reason = 'flags(amountremaining=0,unbilled=0)';
    } else if (soInfo.soTotalBase > 0 && billedGrossBase > 0 && withinTol(billedGrossBase, soInfo.soTotalBase, CONFIG.BASE_TOTAL_TOLERANCE)) {
      facturado = true;
      reason = `base_match tol=${CONFIG.BASE_TOTAL_TOLERANCE}`;
    } else {
      // 🔥 REGLA que pediste: no existe estado "2". Si no matchea, queda NO_FACTURADO.
      facturado = false;
      reason = 'no_match=>no_facturado';
    }

    return {
      currentStatusId: soInfo.currentStatusId,
      newStatusId: facturado ? CONFIG.STATUS.FACTURADO : CONFIG.STATUS.NO_FACTURADO,
      reason,
      meta: { docsCount: docs.length, billedGrossFx, billedGrossBase, directInvoiceId: soInfo.directInvoiceId || null }
    };
  }

  /* ===================== EXTRA UE: vínculo OS-INV ===================== */
  function linkAlreadyExists(soId, invId) {
    try {
      const s = search.create({
        type: CONFIG.LINK_RECORDTYPE,
        filters: [
          [CONFIG.LINK_FIELD_OS, 'anyof', String(soId)],
          'AND',
          [CONFIG.LINK_FIELD_INV, 'anyof', String(invId)]
        ],
        columns: [search.createColumn({ name: 'internalid' })]
      });
      const rows = getAllResults(s);
      return !!(rows && rows.length);
    } catch (e) {
      return false;
    }
  }

  function createLinkRecord(soId, invId) {
    const rec = record.create({ type: CONFIG.LINK_RECORDTYPE, isDynamic: false });
    rec.setValue({ fieldId: CONFIG.LINK_FIELD_OS, value: String(soId) });
    rec.setValue({ fieldId: CONFIG.LINK_FIELD_INV, value: String(invId) });
    return rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
  }

  function createDirectBillingLinkFromInvoice(txnRec, ueType, userEventTypeEnum) {
    // ✅ CREATE y EDIT
    if (ueType !== userEventTypeEnum.CREATE && ueType !== userEventTypeEnum.EDIT) {
      if (CONFIG.DEBUG_LINK) log.audit({ title: 'FD_SKIP_TYPE', details: JSON.stringify({ ueType }) });
      return;
    }

    const invId = String(txnRec.id || '');
    if (!invId) return;

    // (Mantengo tu comportamiento: SOLO con createdfrom y que sea SalesOrd)
    let createdFrom = '';
    try { createdFrom = String(txnRec.getValue('createdfrom') || ''); } catch (e) {}
    if (!createdFrom) {
      if (CONFIG.DEBUG_LINK) log.audit({ title: 'FD_SKIP_NO_CREATEDFROM', details: JSON.stringify({ invId }) });
      return;
    }

    const fromType = safeTypeFromTxnSearch(createdFrom);
    if (fromType !== 'SalesOrd') {
      if (CONFIG.DEBUG_LINK) log.audit({ title: 'FD_SKIP_FROM_NOT_SO', details: JSON.stringify({ invId, createdFrom, fromType }) });
      return;
    }

    // ✅ solo si invoice es sub 3 (por consistencia)
    try {
      const sub = String(txnRec.getValue('subsidiary') || '');
      if (sub && String(sub) !== String(CONFIG.SUBSIDIARY_ID)) {
        if (CONFIG.DEBUG_LINK) log.audit({ title: 'FD_SKIP_WRONG_SUB', details: JSON.stringify({ invId, sub }) });
        return;
      }
    } catch (e) {}

    if (CONFIG.AVOID_DUPLICATE_LINK && linkAlreadyExists(createdFrom, invId)) {
      if (CONFIG.DEBUG_LINK) log.audit({ title: 'FD_SKIP_DUPLICATE', details: JSON.stringify({ invId, soId: createdFrom }) });
      return;
    }

    const linkId = createLinkRecord(createdFrom, invId);

    log.audit({
      title: 'FD_LINK_CREATED',
      details: JSON.stringify({ invId, soId: createdFrom, linkId, ueType })
    });
  }

  /* ===================== UE ===================== */
  function afterSubmit(context) {
    const type = context.type;
    if (type === context.UserEventType.DELETE) return;

    const txnRec = context.newRecord;
    const txnType = String(txnRec.type || '');
    const txnId = String(txnRec.id || '');

    if (txnType !== record.Type.INVOICE &&
        txnType !== record.Type.CASH_SALE &&
        txnType !== 'invoice' &&
        txnType !== 'cashsale') {
      return;
    }

    // ✅ SOLO Transacciones sub 3
    try {
      const sub = String(txnRec.getValue('subsidiary') || '');
      if (sub && String(sub) !== String(CONFIG.SUBSIDIARY_ID)) return;
    } catch (e) {}

    // EXTRA: vínculo OS-INV (no lo altero)
    try {
      createDirectBillingLinkFromInvoice(txnRec, type, context.UserEventType);
    } catch (e) {
      log.error({
        title: 'FD_LINK_FAILED',
        details: JSON.stringify({ txnId, txnType, error: (e && e.message) ? e.message : String(e) })
      });
    }

    // Recalcular estado OS (considerando internas asociadas aunque Invoice NO tenga createdfrom)
    const soIds = resolveSOIdsFromTxn(txnRec);

    if (!soIds.length) {
      if (CONFIG.DEBUG) log.audit({ title: 'RECALC_SKIP_NO_SO', details: JSON.stringify({ txnId, txnType }) });
      return;
    }

    for (let i = 0; i < soIds.length; i++) {
      const soId = String(soIds[i]);
      try {
        const decision = decideStatusForSO(soId);
        if (!decision) continue;

        const { currentStatusId, newStatusId, reason, meta } = decision;

        if (String(currentStatusId || '') === String(newStatusId || '')) {
          if (CONFIG.DEBUG) {
            log.audit({
              title: 'RECALC_NOCHANGE',
              details: JSON.stringify({ soId, txnId, txnType, currentStatusId, newStatusId, reason, meta })
            });
          }
          continue;
        }

        record.submitFields({
          type: record.Type.SALES_ORDER,
          id: soId,
          values: { [CONFIG.FIELD_STATUS_OS]: newStatusId },
          options: { enableSourcing: false, ignoreMandatoryFields: true }
        });

        log.audit({
          title: 'RECALC_UPDATED',
          details: JSON.stringify({ soId, txnId, txnType, currentStatusId, newStatusId, reason, meta })
        });

      } catch (e) {
        log.error({
          title: 'RECALC_SO_FAILED',
          details: JSON.stringify({ soId, txnId, error: (e && e.message) ? e.message : String(e) })
        });
      }
    }
  }

  return { afterSubmit };
});
