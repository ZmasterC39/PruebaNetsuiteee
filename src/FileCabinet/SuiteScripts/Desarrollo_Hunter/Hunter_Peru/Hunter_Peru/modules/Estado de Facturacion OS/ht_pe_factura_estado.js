/**
 * Estado Facturación OS - Subsidiaria 3
 * - Rango: 01/01/2026 a 13/01/2026
 * - Billing docs: Invoice + Cash Sale
 * - Detracción/WHT: suma de vuelta líneas custcol_4601_witaxline = T (fallback por record.load si es necesario)
 * - Debug selectivo por SO/TranID incluso si NO cambia
 *
 * NUEVO:
 * - Si OS tiene custbody_ht_factura_directa -> validar por LINEAS (item agrupado + rate + qty)
 * - Si la factura directa es agrupadora -> buscar facturas internas asociadas (customrecord_ht_fact_internas_asociadas)
 *
 * CAMBIO SOLICITADO:
 * - Si el resultado es FACTURACION_PENDIENTE (2), tratarlo como FACTURADO (1)
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/format'], (search, record, log, format) => {

  /* ===================== CONFIG ===================== */
  const CONFIG = {
    SUBSIDIARY_ID: '3',
    FIELD_STATUS_OS: 'custbody_estado_facturacion_os',

    STATUS: {
      FACTURADO: '1',
      FACTURACION_PENDIENTE: '2',
      NO_FACTURADO: '3'
    },

    TEST_MODE: false,

    DATE_FROM: new Date(2026, 0, 31),
    DATE_TO: new Date(2026, 0, 31),

    FX_TOTAL_TOLERANCE: 0.01,
    BASE_TOTAL_TOLERANCE: 0.05,

    // Si el search no trae invoices por alguna razón, hace un search puntual por SO
    FALLBACK_FIND_DOCS_WHEN_ZERO: true,

    // Si no cuadra por búsquedas (WHT/detracción), carga invoice/cashsale y recalcula
    FALLBACK_LOAD_DOCS_ON_MISMATCH: true,
    FALLBACK_LOAD_DOCS_MAX: 6, // por SO

    // Override por flags del SO (solo se usa como extra)
    USE_BILLING_FLAGS_AS_OVERRIDE: true,

    // ======= NUEVO: FACTURA DIRECTA + FACTURA INTERNA ASOCIADA =======
    DIRECT_INVOICE_OVERRIDE_ENABLED: true,
    FIELD_DIRECT_INVOICE: 'custbody_ht_factura_directa',   // en SO
    FIELD_ITEM_AGRUPADO: 'custcol_ht_so_item_agrupado',    // en líneas de SO

    // tolerancias para comparación por líneas
    LINE_RATE_TOL: 0.01,
    LINE_QTY_TOL: 0.0001,

    // custom record: invoice -> facturas internas
    CUSTOMREC_FACT_INT_ASOC: 'customrecord_ht_fact_internas_asociadas',
    CR_FIELD_FACTURA: 'custrecord_nro_factura',
    CR_FIELD_FACTURA_INTERNA: 'custrecord_nro_factura_interna',

    // tipo transacción Factura Interna
    INTERNAL_INVOICE_REC_TYPE: 'customsale_ec_factura_interna',

    // ======= DETALLE (solo cambios) =======
    LOG_CHANGED_DETAILS: true,
    LOG_CHANGED_DETAILS_MAX: 30,
    DETAIL_INCLUDE_DOC_BREAKDOWN: false,
    DETAIL_DOCS_MAX: 8,

    // ======= DEBUG (aunque no cambie) =======
    DEBUG_SO_IDS: [],                 // ejemplo: ['3773208']
    DEBUG_TRANIDS: [],                // ejemplo: ['OS-PE-S001-1102297167']
    DEBUG_LOG_EVEN_IF_NOCHANGE: true, // si coincide con debug ids, loguea aunque no cambie
    DEBUG_INCLUDE_DOCS: true
  };

  let DETAIL_LOGGED = 0;

  /* ===================== Helpers ===================== */
  const fmtDate = (d) => format.format({ value: d, type: format.Type.DATE });

  const toNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const abs = (n) => Math.abs(toNumber(n));

  function withinTol(a, b, tol) {
    return abs(toNumber(a) - toNumber(b)) <= tol;
  }

  function getAllResults(searchObj) {
    const out = [];
    const paged = searchObj.runPaged({ pageSize: 1000 });
    paged.pageRanges.forEach((pr) => {
      const page = paged.fetch({ index: pr.index });
      page.data.forEach((r) => out.push(r));
    });
    return out;
  }

  function isTruthy(val) {
    return val === true || val === 'T' || val === 'true';
  }

  function shouldDebug(soId, tranid) {
    if (CONFIG.DEBUG_SO_IDS && CONFIG.DEBUG_SO_IDS.length && CONFIG.DEBUG_SO_IDS.indexOf(String(soId)) !== -1) return true;
    if (CONFIG.DEBUG_TRANIDS && CONFIG.DEBUG_TRANIDS.length && CONFIG.DEBUG_TRANIDS.indexOf(String(tranid)) !== -1) return true;
    return false;
  }

  function loadSOFlagsAndTotal(soId) {
    const soRec = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: false });
    return {
      totalFx: toNumber(soRec.getValue('total')),
      balance: toNumber(soRec.getValue('balance')),
      unbilled: toNumber(soRec.getValue('unbilledorders')),
      currencyId: String(soRec.getValue('currency') || ''),
      exchangerate: toNumber(soRec.getValue('exchangerate')) || 1
    };
  }

  function nsTypeToRecordType(docType) {
    const t = String(docType || '');
    if (t === 'CustInvc' || t === 'invoice') return record.Type.INVOICE;
    if (t === 'CashSale' || t === 'cashsale') return record.Type.CASH_SALE;
    return null;
  }

  /**
   * Carga invoice/cashsale y calcula:
   * - totalFx (tal cual)
   * - whtFx: suma abs(amount) de líneas custcol_4601_witaxline = T
   * - grossFx = totalFx + whtFx
   * - grossBase = grossFx * exchangerate (aprox)
   */
  function computeGrossByLoadingDoc(docType, docId) {
    const recType = nsTypeToRecordType(docType);
    if (!recType) return null;

    const rec = record.load({ type: recType, id: docId, isDynamic: false });

    const totalFx = toNumber(rec.getValue('total'));
    const exch = toNumber(rec.getValue('exchangerate')) || 1;

    let whtFx = 0;

    const sublistId = 'item';
    const lineCount = rec.getLineCount({ sublistId });

    for (let i = 0; i < lineCount; i++) {
      let isWhtLine = false;
      try {
        const flag = rec.getSublistValue({ sublistId, fieldId: 'custcol_4601_witaxline', line: i });
        isWhtLine = isTruthy(flag);
      } catch (e) {
        isWhtLine = false;
      }
      if (!isWhtLine) continue;

      const amt = toNumber(rec.getSublistValue({ sublistId, fieldId: 'amount', line: i }));
      whtFx += abs(amt);
    }

    const grossFx = totalFx + whtFx;
    const grossBase = grossFx * exch;

    return {
      totalFx: Number(totalFx.toFixed(2)),
      whtFx: Number(whtFx.toFixed(2)),
      grossFx: Number(grossFx.toFixed(2)),
      exchangerate: exch,
      grossBase: Number(grossBase.toFixed(2))
    };
  }

  function findBillingDocsForSO(soId) {
    // búsqueda puntual por createdfrom = soId
    let s;
    try {
      s = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'CustInvc', 'CashSale'],
          'AND', ['voided', 'is', 'F'],
          'AND', ['createdfrom', 'anyof', String(soId)]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' }),
          search.createColumn({ name: 'fxamount' })
        ]
      });
    } catch (e) {
      s = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'CustInvc', 'CashSale'],
          'AND', ['voided', 'is', 'F'],
          'AND', ['createdfrom', 'anyof', String(soId)]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' })
        ]
      });
    }

    const rows = getAllResults(s);
    return rows.map(r => ({
      docId: String(r.getValue({ name: 'internalid' }) || ''),
      docType: String(r.getValue({ name: 'type' }) || ''),
      docTranid: String(r.getValue({ name: 'tranid' }) || ''),
      currencyId: String(r.getValue({ name: 'currency' }) || ''),
      totalBase: toNumber(r.getValue({ name: 'total' })),
      totalFx: toNumber(r.getValue({ name: 'fxamount' }))
    })).filter(x => x.docId);
  }

  function computeNewStatus(params) {
    const {
      billedCount,
      soTotalFx,
      soTotalBase,
      billedGrossFx,
      billedGrossBase,
      fxComparable,
      soId
    } = params;

    if (!billedCount || billedCount <= 0) {
      return { newStatusId: CONFIG.STATUS.NO_FACTURADO, reason: 'no_billing_docs' };
    }

    if (fxComparable && soTotalFx > 0 && billedGrossFx > 0) {
      if (withinTol(billedGrossFx, soTotalFx, CONFIG.FX_TOTAL_TOLERANCE)) {
        return { newStatusId: CONFIG.STATUS.FACTURADO, reason: `fx_match tol=${CONFIG.FX_TOTAL_TOLERANCE}` };
      }

      if (CONFIG.USE_BILLING_FLAGS_AS_OVERRIDE) {
        try {
          const flags = loadSOFlagsAndTotal(soId);
          if (withinTol(flags.balance, 0, CONFIG.BASE_TOTAL_TOLERANCE) && withinTol(flags.unbilled, 0, CONFIG.BASE_TOTAL_TOLERANCE)) {
            return { newStatusId: CONFIG.STATUS.FACTURADO, reason: 'billing_flags(balance=0,unbilled=0)' };
          }
        } catch (e) {}
      }

      return {
        newStatusId: CONFIG.STATUS.FACTURACION_PENDIENTE,
        reason: `fx_pending diff=${(soTotalFx - billedGrossFx).toFixed(2)}`
      };
    }

    if (withinTol(billedGrossBase, soTotalBase, CONFIG.BASE_TOTAL_TOLERANCE)) {
      return { newStatusId: CONFIG.STATUS.FACTURADO, reason: `base_match tol=${CONFIG.BASE_TOTAL_TOLERANCE}` };
    }

    if (CONFIG.USE_BILLING_FLAGS_AS_OVERRIDE) {
      try {
        const flags = loadSOFlagsAndTotal(soId);
        if (withinTol(flags.balance, 0, CONFIG.BASE_TOTAL_TOLERANCE) && withinTol(flags.unbilled, 0, CONFIG.BASE_TOTAL_TOLERANCE)) {
          return { newStatusId: CONFIG.STATUS.FACTURADO, reason: 'billing_flags(balance=0,unbilled=0)' };
        }
      } catch (e) {}
    }

    return {
      newStatusId: CONFIG.STATUS.FACTURACION_PENDIENTE,
      reason: `base_pending diff=${(soTotalBase - billedGrossBase).toFixed(2)}`
    };
  }

  /* ===================== NUEVO: Helpers Factura Directa / Line Match ===================== */

  function getTxnMainlineById(txnId) {
    if (!txnId) return null;

    const s = search.create({
      type: search.Type.TRANSACTION,
      filters: [
        ['mainline', 'is', 'T'],
        'AND', ['internalid', 'anyof', String(txnId)],
        'AND', ['voided', 'is', 'F']
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'type' }),
        search.createColumn({ name: 'tranid' }),
        search.createColumn({ name: 'currency' }),
        search.createColumn({ name: 'total' }),
        search.createColumn({ name: 'fxamount' })
      ]
    });

    const rows = getAllResults(s);
    if (!rows || !rows.length) return null;

    const r = rows[0];
    return {
      docId: String(r.getValue({ name: 'internalid' }) || ''),
      docType: String(r.getValue({ name: 'type' }) || ''),
      docTranid: String(r.getValue({ name: 'tranid' }) || ''),
      currencyId: String(r.getValue({ name: 'currency' }) || ''),
      totalBase: toNumber(r.getValue({ name: 'total' })),
      totalFx: toNumber(r.getValue({ name: 'fxamount' }))
    };
  }

  function getWhtSumForDoc(docId) {
    if (!docId) return { whtBase: 0, whtFx: 0 };

    const s = search.create({
      type: search.Type.TRANSACTION,
      filters: [
        ['mainline', 'is', 'F'],
        'AND', ['taxline', 'is', 'F'],
        'AND', ['shipping', 'is', 'F'],
        'AND', ['voided', 'is', 'F'],
        'AND', ['internalid', 'anyof', String(docId)],
        'AND', ['custcol_4601_witaxline', 'is', 'T']
      ],
      columns: [
        search.createColumn({ name: 'amount' }),
        search.createColumn({ name: 'fxamount' })
      ]
    });

    const rows = getAllResults(s);

    let whtBase = 0;
    let whtFx = 0;

    for (let i = 0; i < rows.length; i++) {
      whtBase += toNumber(rows[i].getValue({ name: 'amount' }));
      whtFx += toNumber(rows[i].getValue({ name: 'fxamount' }));
    }

    return { whtBase, whtFx };
  }

  function loadSORequirements(soId) {
    const soRec = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: false });

    const req = []; // [{itemId, rate, qty}]
    const sublistId = 'item';
    const lineCount = soRec.getLineCount({ sublistId });

    for (let i = 0; i < lineCount; i++) {
      const itemAgr = soRec.getSublistValue({ sublistId, fieldId: CONFIG.FIELD_ITEM_AGRUPADO, line: i });
      const itemId = String(itemAgr || soRec.getSublistValue({ sublistId, fieldId: 'item', line: i }) || '');

      const rate = toNumber(soRec.getSublistValue({ sublistId, fieldId: 'rate', line: i }));
      const qty = toNumber(soRec.getSublistValue({ sublistId, fieldId: 'quantity', line: i }));

      if (!itemId || qty <= 0) continue;
      req.push({ itemId, rate, qty });
    }

    return req;
  }

  function buildTxnAvailability(txnRec) {
    const avail = {}; // key: itemId|rateRounded -> qtySum
    const sublistId = 'item';
    const lineCount = txnRec.getLineCount({ sublistId });

    for (let i = 0; i < lineCount; i++) {
      const itemId = String(txnRec.getSublistValue({ sublistId, fieldId: 'item', line: i }) || '');
      const rate = toNumber(txnRec.getSublistValue({ sublistId, fieldId: 'rate', line: i }));
      const qty = toNumber(txnRec.getSublistValue({ sublistId, fieldId: 'quantity', line: i }));

      if (!itemId || qty <= 0) continue;

      const key = `${itemId}|${Number(rate.toFixed(2))}`;
      avail[key] = (avail[key] || 0) + qty;
    }

    return avail;
  }

  function requirementsCovered(req, avail) {
    if (!req || !req.length) return { ok: false, reason: 'so_no_lines' };

    for (let r = 0; r < req.length; r++) {
      const needed = req[r];
      const rateKey = Number(toNumber(needed.rate).toFixed(2));

      let foundQty = 0;

      // exacto item|rate
      const exactKey = `${needed.itemId}|${rateKey}`;
      if (avail[exactKey]) foundQty = avail[exactKey];

      // sumar rates cercanos si falta
      if (foundQty + CONFIG.LINE_QTY_TOL < needed.qty) {
        const prefix = `${needed.itemId}|`;
        const keys = Object.keys(avail);

        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (k.indexOf(prefix) !== 0) continue;

          const kRate = toNumber(k.split('|')[1]);
          if (withinTol(kRate, needed.rate, CONFIG.LINE_RATE_TOL)) {
            foundQty += avail[k];
          }
        }
      }

      if (foundQty + CONFIG.LINE_QTY_TOL < needed.qty) {
        return { ok: false, reason: `line_not_covered item=${needed.itemId} needQty=${needed.qty} gotQty=${foundQty}` };
      }
    }

    return { ok: true, reason: 'item_rate_qty_match' };
  }

  function matchSOToTxnByLines(soReq, txnType, txnId) {
    if (!txnType || !txnId) return { ok: false, reason: 'missing_txn' };

    let txnRec;
    try {
      txnRec = record.load({ type: txnType, id: txnId, isDynamic: false });
    } catch (e) {
      return { ok: false, reason: 'txn_load_failed' };
    }

    const avail = buildTxnAvailability(txnRec);
    return requirementsCovered(soReq, avail);
  }

  function getInternalInvoicesFromSalesInvoice(invoiceId) {
    if (!invoiceId) return [];

    const s = search.create({
      type: CONFIG.CUSTOMREC_FACT_INT_ASOC,
      filters: [
        [CONFIG.CR_FIELD_FACTURA, 'anyof', String(invoiceId)]
      ],
      columns: [
        search.createColumn({ name: CONFIG.CR_FIELD_FACTURA_INTERNA })
      ]
    });

    const rows = getAllResults(s);

    const uniq = {};
    for (let i = 0; i < rows.length; i++) {
      const id = String(rows[i].getValue({ name: CONFIG.CR_FIELD_FACTURA_INTERNA }) || '');
      if (id) uniq[id] = true;
    }
    return Object.keys(uniq);
  }

  function internalInvoiceMatchesSO(soId, soReq, internalInvoiceId) {
    if (!soId || !internalInvoiceId) return { ok: false, reason: 'missing_params' };

    let rec;
    try {
      rec = record.load({ type: CONFIG.INTERNAL_INVOICE_REC_TYPE, id: internalInvoiceId, isDynamic: false });
    } catch (e) {
      return { ok: false, reason: 'internal_load_failed' };
    }

    const createdfrom = String(rec.getValue('createdfrom') || '');
    const createdFromFacInt = String(rec.getValue('custbody_ec_created_from_fac_int') || '');

    const linked = (createdfrom === String(soId)) || (createdFromFacInt === String(soId));
    if (!linked) return { ok: false, reason: 'not_linked_to_so' };

    // compare por líneas usando el mismo rec cargado (sin volver a cargar)
    const avail = buildTxnAvailability(rec);
    const cmp = requirementsCovered(soReq, avail);
    if (!cmp.ok) return { ok: false, reason: `linked_but_no_match_${cmp.reason}` };

    return { ok: true, reason: `internal_ok_${cmp.reason}` };
  }

  /* ===================== getInputData ===================== */
  function getInputData() {
    const from = fmtDate(CONFIG.DATE_FROM);
    const to = fmtDate(CONFIG.DATE_TO);

    // 1) Sales Orders (mainline)
    let soSearch;
    try {
      soSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'SalesOrd'],
          'AND', ['subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['trandate', 'within', from, to]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' }),
          search.createColumn({ name: 'fxamount' }),
          search.createColumn({ name: CONFIG.FIELD_STATUS_OS }),
          search.createColumn({ name: CONFIG.FIELD_DIRECT_INVOICE }) // NUEVO
        ]
      });
    } catch (e) {
      soSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'SalesOrd'],
          'AND', ['subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['trandate', 'within', from, to]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' }),
          search.createColumn({ name: CONFIG.FIELD_STATUS_OS }),
          search.createColumn({ name: CONFIG.FIELD_DIRECT_INVOICE }) // NUEVO
        ]
      });
    }
    const soRows = getAllResults(soSearch);

    // 2) Billing Docs MAINLINE (Invoice + CashSale) por createdfrom SO (del rango)
    let billMainSearch;
    try {
      billMainSearch = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'CustInvc', 'CashSale'],
          'AND', ['voided', 'is', 'F'],
          'AND', ['createdfrom', 'noneof', '@NONE@'],
          'AND', ['createdfrom.type', 'anyof', 'SalesOrd'],
          'AND', ['createdfrom.subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['createdfrom.trandate', 'within', from, to]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' }),
          search.createColumn({ name: 'fxamount' }),
          search.createColumn({ name: 'createdfrom' })
        ]
      });
    } catch (e) {
      billMainSearch = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'T'],
          'AND', ['type', 'anyof', 'CustInvc', 'CashSale'],
          'AND', ['voided', 'is', 'F'],
          'AND', ['createdfrom', 'noneof', '@NONE@'],
          'AND', ['createdfrom.type', 'anyof', 'SalesOrd'],
          'AND', ['createdfrom.subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['createdfrom.trandate', 'within', from, to]
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'tranid' }),
          search.createColumn({ name: 'currency' }),
          search.createColumn({ name: 'total' }),
          search.createColumn({ name: 'createdfrom' })
        ]
      });
    }
    const billMainRows = getAllResults(billMainSearch);

    // 3) WHT/Detracción (líneas): custcol_4601_witaxline = T
    let whtLineSearch;
    try {
      whtLineSearch = search.create({
        type: search.Type.TRANSACTION,
        filters: [
          ['mainline', 'is', 'F'],
          'AND', ['taxline', 'is', 'F'],
          'AND', ['shipping', 'is', 'F'],
          'AND', ['type', 'anyof', 'CustInvc', 'CashSale'],
          'AND', ['voided', 'is', 'F'],
          'AND', ['createdfrom', 'noneof', '@NONE@'],
          'AND', ['createdfrom.type', 'anyof', 'SalesOrd'],
          'AND', ['createdfrom.subsidiary', 'anyof', CONFIG.SUBSIDIARY_ID],
          'AND', ['createdfrom.trandate', 'within', from, to],
          'AND', ['custcol_4601_witaxline', 'is', 'T']
        ],
        columns: [
          search.createColumn({ name: 'internalid' }),   // docId
          search.createColumn({ name: 'createdfrom' }),  // soId
          search.createColumn({ name: 'amount' }),
          search.createColumn({ name: 'fxamount' })
        ]
      });
    } catch (e) {
      whtLineSearch = null;
    }
    const whtLineRows = whtLineSearch ? getAllResults(whtLineSearch) : [];

    // 4) input combinado
    const input = [];

    for (let i = 0; i < soRows.length; i++) {
      const r = soRows[i];
      input.push({
        kind: 'SO',
        soId: String(r.getValue({ name: 'internalid' }) || ''),
        tranid: String(r.getValue({ name: 'tranid' }) || ''),
        currencyId: String(r.getValue({ name: 'currency' }) || ''),
        soTotalBase: toNumber(r.getValue({ name: 'total' })),     // base (normalmente)
        soTotalFx: toNumber(r.getValue({ name: 'fxamount' })),    // fx (normalmente)
        currentStatusId: String(r.getValue({ name: CONFIG.FIELD_STATUS_OS }) || ''),
        directInvoiceId: String(r.getValue({ name: CONFIG.FIELD_DIRECT_INVOICE }) || '') // NUEVO
      });
    }

    for (let j = 0; j < billMainRows.length; j++) {
      const r = billMainRows[j];
      input.push({
        kind: 'BILL_DOC',
        soId: String(r.getValue({ name: 'createdfrom' }) || ''),
        docId: String(r.getValue({ name: 'internalid' }) || ''),
        docType: String(r.getValue({ name: 'type' }) || ''),
        docTranid: String(r.getValue({ name: 'tranid' }) || ''),
        currencyId: String(r.getValue({ name: 'currency' }) || ''),
        totalBase: toNumber(r.getValue({ name: 'total' })),
        totalFx: toNumber(r.getValue({ name: 'fxamount' }))
      });
    }

    for (let k = 0; k < whtLineRows.length; k++) {
      const r = whtLineRows[k];
      input.push({
        kind: 'WHT_LINE',
        soId: String(r.getValue({ name: 'createdfrom' }) || ''),
        docId: String(r.getValue({ name: 'internalid' }) || ''),
        whtBase: toNumber(r.getValue({ name: 'amount' })),
        whtFx: toNumber(r.getValue({ name: 'fxamount' }))
      });
    }

    return input;
  }

  /* ===================== map ===================== */
  function map(context) {
    let v = context.value;
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) {}
    }
    if (!v || !v.soId) return;

    context.write({
      key: String(v.soId),
      value: JSON.stringify(v)
    });
  }

  /* ===================== reduce ===================== */
  function reduce(context) {
    const soId = String(context.key);
    const values = context.values || [];

    let soData = null;

    const docMap = {}; // docId -> {totalBase,totalFx,currencyId,whtBase,whtFx,docType,docTranid,hasWhtLines}
    let currencyMismatch = false;

    for (let i = 0; i < values.length; i++) {
      let obj;
      try { obj = JSON.parse(values[i]); } catch (e) { continue; }
      if (!obj) continue;

      if (obj.kind === 'SO') {
        soData = obj;
        continue;
      }

      if (obj.kind === 'BILL_DOC') {
        const docId = String(obj.docId || '');
        if (!docId) continue;
        if (!docMap[docId]) docMap[docId] = { whtBase: 0, whtFx: 0, hasWhtLines: false };

        docMap[docId].docType = obj.docType || '';
        docMap[docId].docTranid = obj.docTranid || '';
        docMap[docId].currencyId = String(obj.currencyId || '');
        docMap[docId].totalBase = toNumber(obj.totalBase);
        docMap[docId].totalFx = toNumber(obj.totalFx);
        continue;
      }

      if (obj.kind === 'WHT_LINE') {
        const docId = String(obj.docId || '');
        if (!docId) continue;
        if (!docMap[docId]) docMap[docId] = { whtBase: 0, whtFx: 0, hasWhtLines: false };

        docMap[docId].whtBase = toNumber(docMap[docId].whtBase) + toNumber(obj.whtBase);
        docMap[docId].whtFx = toNumber(docMap[docId].whtFx) + toNumber(obj.whtFx);
        docMap[docId].hasWhtLines = true;
      }
    }

    if (!soData) return;

    const tranid = soData.tranid || '';
    const debugThis = shouldDebug(soId, tranid);

    let soTotalBase = toNumber(soData.soTotalBase);
    let soTotalFx = toNumber(soData.soTotalFx);
    const soCurrencyId = String(soData.currencyId || '');
    const currentStatusId = soData.currentStatusId ? String(soData.currentStatusId) : '';

    const directInvoiceId = String(soData.directInvoiceId || ''); // NUEVO

    // si soTotalFx viene vacío, lo cargamos
    if (!soTotalFx || soTotalFx === 0) {
      try {
        const flags = loadSOFlagsAndTotal(soId);
        soTotalFx = flags.totalFx;
        // soTotalBase lo dejamos como viene del search (base)
      } catch (e) {}
    }

    // NUEVO: si hay Factura Directa, y no está en docMap (porque no viene por createdfrom), agréguela
    if (CONFIG.DIRECT_INVOICE_OVERRIDE_ENABLED && directInvoiceId) {
      if (!docMap[directInvoiceId]) {
        const txn = getTxnMainlineById(directInvoiceId);
        if (txn && txn.docId) {
          docMap[txn.docId] = docMap[txn.docId] || { whtBase: 0, whtFx: 0, hasWhtLines: false };
          docMap[txn.docId].docType = txn.docType || '';
          docMap[txn.docId].docTranid = txn.docTranid || '';
          docMap[txn.docId].currencyId = String(txn.currencyId || '');
          docMap[txn.docId].totalBase = toNumber(txn.totalBase);
          docMap[txn.docId].totalFx = toNumber(txn.totalFx);

          // WHT para esa factura directa (sin depender de createdfrom)
          try {
            const w = getWhtSumForDoc(txn.docId);
            docMap[txn.docId].whtBase = toNumber(w.whtBase);
            docMap[txn.docId].whtFx = toNumber(w.whtFx);
            docMap[txn.docId].hasWhtLines = (abs(w.whtBase) > 0 || abs(w.whtFx) > 0);
          } catch (e) {}
        }
      }
    }

    // Si no encontró docs por el search global, intenta búsqueda puntual por createdfrom=soId
    if (CONFIG.FALLBACK_FIND_DOCS_WHEN_ZERO) {
      if (Object.keys(docMap).length === 0) {
        const found = findBillingDocsForSO(soId);
        for (let x = 0; x < found.length; x++) {
          const d = found[x];
          if (!docMap[d.docId]) docMap[d.docId] = { whtBase: 0, whtFx: 0, hasWhtLines: false };
          docMap[d.docId].docType = d.docType || '';
          docMap[d.docId].docTranid = d.docTranid || '';
          docMap[d.docId].currencyId = d.currencyId || '';
          docMap[d.docId].totalBase = toNumber(d.totalBase);
          docMap[d.docId].totalFx = toNumber(d.totalFx);
        }
      }
    }

    const docIds = Object.keys(docMap);
    const billedCount = docIds.length;

    let billedGrossBase = 0;
    let billedGrossFx = 0;

    const docBreakdown = [];

    for (let d = 0; d < docIds.length; d++) {
      const docId = docIds[d];
      const doc = docMap[docId] || {};

      if (soCurrencyId && doc.currencyId && String(doc.currencyId) !== String(soCurrencyId)) {
        currencyMismatch = true;
      }

      const totalBase = toNumber(doc.totalBase);
      const totalFx = toNumber(doc.totalFx);

      const whtBase = toNumber(doc.whtBase); // suele ser negativo
      const whtFx = toNumber(doc.whtFx);     // suele ser negativo

      const grossBase = (totalBase - whtBase);
      const grossFx = (totalFx - whtFx);

      billedGrossBase += grossBase;
      billedGrossFx += grossFx;

      if ((CONFIG.DETAIL_INCLUDE_DOC_BREAKDOWN || (debugThis && CONFIG.DEBUG_INCLUDE_DOCS)) && docBreakdown.length < CONFIG.DETAIL_DOCS_MAX) {
        docBreakdown.push({
          id: docId,
          type: doc.docType || null,
          tranid: doc.docTranid || null,
          currency: doc.currencyId || null,
          total_base: Number(totalBase.toFixed(2)),
          wht_base: Number(whtBase.toFixed(2)),
          gross_base: Number(grossBase.toFixed(2)),
          total_fx: Number(totalFx.toFixed(2)),
          wht_fx: Number(whtFx.toFixed(2)),
          gross_fx: Number(grossFx.toFixed(2)),
          hasWhtLines: !!doc.hasWhtLines
        });
      }
    }

    const fxComparable = !currencyMismatch && soTotalFx > 0 && billedGrossFx > 0;

    let decision = computeNewStatus({
      soId,
      billedCount,
      soTotalFx,
      soTotalBase,
      billedGrossFx: Number(billedGrossFx.toFixed(2)),
      billedGrossBase: Number(billedGrossBase.toFixed(2)),
      fxComparable
    });

    // ======= FALLBACK LOAD DOCS (para WHT/detracción o mismatch) =======
    if (CONFIG.FALLBACK_LOAD_DOCS_ON_MISMATCH && billedCount > 0) {
      const isAlreadyFacturado = String(decision.newStatusId) === String(CONFIG.STATUS.FACTURADO);

      // solo si NO quedó facturado todavía
      if (!isAlreadyFacturado) {
        let sumGrossFx2 = 0;
        let sumGrossBase2 = 0;

        const toLoad = docIds.slice(0, CONFIG.FALLBACK_LOAD_DOCS_MAX);

        let loadedAny = false;
        const loadedDocs = [];

        for (let i = 0; i < toLoad.length; i++) {
          const docId = toLoad[i];
          const doc = docMap[docId] || {};
          const docType = doc.docType;

          try {
            const calc = computeGrossByLoadingDoc(docType, docId);
            if (calc) {
              loadedAny = true;
              sumGrossFx2 += toNumber(calc.grossFx);
              sumGrossBase2 += toNumber(calc.grossBase);

              if (debugThis && CONFIG.DEBUG_INCLUDE_DOCS) {
                loadedDocs.push({
                  docId,
                  docType,
                  docTranid: doc.docTranid || null,
                  grossFx: calc.grossFx,
                  whtFx: calc.whtFx,
                  totalFx: calc.totalFx,
                  exchangerate: calc.exchangerate
                });
              }
            }
          } catch (e) {}
        }

        if (loadedAny) {
          const matchFx2 = (soTotalFx > 0) && withinTol(sumGrossFx2, soTotalFx, CONFIG.FX_TOTAL_TOLERANCE);
          const matchBase2 = (soTotalBase > 0) && withinTol(sumGrossBase2, soTotalBase, Math.max(CONFIG.BASE_TOTAL_TOLERANCE, 0.2));

          if (matchFx2 || matchBase2) {
            decision = { newStatusId: CONFIG.STATUS.FACTURADO, reason: matchFx2 ? 'fallback_load_docs_fx_match' : 'fallback_load_docs_base_match' };
          }

          if (debugThis && CONFIG.DEBUG_INCLUDE_DOCS) {
            // adjunta datos del fallback para debug
            docBreakdown.push({
              fallback_loaded_docs: loadedDocs,
              sumGrossFx2: Number(sumGrossFx2.toFixed(2)),
              sumGrossBase2: Number(sumGrossBase2.toFixed(2))
            });
          }
        }
      }
    }

    // ======= NUEVO OVERRIDE: FACTURA DIRECTA por LINEAS (y facturas internas asociadas) =======
    if (CONFIG.DIRECT_INVOICE_OVERRIDE_ENABLED && directInvoiceId) {
      const isAlreadyFacturado = String(decision.newStatusId) === String(CONFIG.STATUS.FACTURADO);

      if (!isAlreadyFacturado) {
        let soReq = null;
        try {
          soReq = loadSORequirements(soId);
        } catch (e) {
          soReq = null;
        }

        if (soReq && soReq.length) {
          // A) match contra la factura directa (Invoice/CashSale)
          let directDocType = null;
          let directDocNsType = null;

          try {
            const txn = getTxnMainlineById(directInvoiceId);
            if (txn && txn.docType) directDocNsType = txn.docType;
          } catch (e) {}

          directDocType = nsTypeToRecordType(directDocNsType) || record.Type.INVOICE;

          const cmpDirect = matchSOToTxnByLines(soReq, directDocType, directInvoiceId);

          if (cmpDirect.ok) {
            decision = { newStatusId: CONFIG.STATUS.FACTURADO, reason: `direct_invoice_lines_${cmpDirect.reason}` };
          } else {
            // B) invoice agrupadora -> buscar Facturas Internas asociadas y validar cuál corresponde
            let internalIds = [];
            try {
              internalIds = getInternalInvoicesFromSalesInvoice(directInvoiceId);
            } catch (e) {
              internalIds = [];
            }

            let matchedInternal = null;

            for (let i = 0; i < internalIds.length; i++) {
              const internalId = internalIds[i];
              const res = internalInvoiceMatchesSO(soId, soReq, internalId);
              if (res.ok) {
                matchedInternal = { internalId, reason: res.reason };
                break;
              }
            }

            if (matchedInternal) {
              decision = {
                newStatusId: CONFIG.STATUS.FACTURADO,
                reason: `direct_invoice_internal_${matchedInternal.reason}_id=${matchedInternal.internalId}`
              };
            } else if (debugThis && CONFIG.DEBUG_LOG_EVEN_IF_NOCHANGE) {
              // solo para debug: por qué no hizo match
              docBreakdown.push({
                direct_invoice_no_match: {
                  directInvoiceId,
                  directDocType: String(directDocType || ''),
                  directNsType: String(directDocNsType || ''),
                  directReason: cmpDirect.reason,
                  internalCandidates: internalIds
                }
              });
            }
          }
        } else if (debugThis && CONFIG.DEBUG_LOG_EVEN_IF_NOCHANGE) {
          docBreakdown.push({ direct_invoice_no_so_lines: true, directInvoiceId });
        }
      }
    }

    // ======= CAMBIO SOLICITADO: si el resultado es PENDIENTE (2), tratarlo como FACTURADO (1) =======
    if (String(decision.newStatusId) === String(CONFIG.STATUS.FACTURACION_PENDIENTE)) {
      decision.newStatusId = CONFIG.STATUS.FACTURADO;
      decision.reason = `pending_as_facturado|${decision.reason || ''}`;
    }

    const newStatusId = decision.newStatusId;
    const reason = decision.reason;

    // Contadores
    context.write({ key: 'TOTAL', value: '1' });

    // ======= DEBUG aunque NO cambie =======
    if (debugThis && CONFIG.DEBUG_LOG_EVEN_IF_NOCHANGE) {
      log.audit({
        title: 'DEBUG_SO_EVAL',
        details: JSON.stringify({
          soId,
          tranid,
          currentStatusId: currentStatusId || null,
          computedNewStatusId: newStatusId,
          reason,
          soCurrencyId,
          soTotalFx: Number(toNumber(soTotalFx).toFixed(2)),
          soTotalBase: Number(toNumber(soTotalBase).toFixed(2)),
          billedCount,
          billedGrossFx: Number(billedGrossFx.toFixed(2)),
          billedGrossBase: Number(billedGrossBase.toFixed(2)),
          currencyMismatch,
          fxComparable,
          directInvoiceId: directInvoiceId || null, // NUEVO (debug)
          docs: CONFIG.DEBUG_INCLUDE_DOCS ? docBreakdown : undefined
        })
      });
    }

    if (String(newStatusId) === String(currentStatusId || '')) {
      context.write({ key: 'NOCHANGE', value: '1' });
      return;
    }

    context.write({ key: 'CHANGED', value: '1' });
    context.write({ key: `TRANS_${currentStatusId || 'null'}_${newStatusId}`, value: '1' });

    // ======= DETALLE SOLO PARA CAMBIOS =======
    if (CONFIG.LOG_CHANGED_DETAILS && DETAIL_LOGGED < CONFIG.LOG_CHANGED_DETAILS_MAX) {
      const payload = {
        soId,
        tranid,
        currency: soCurrencyId || null,
        currentStatusId: currentStatusId || null,
        newStatusId,
        reason,
        soTotalFx: Number(toNumber(soTotalFx).toFixed(2)),
        soTotalBase: Number(toNumber(soTotalBase).toFixed(2)),
        billedCount,
        billedGrossFx: Number(billedGrossFx.toFixed(2)),
        billedGrossBase: Number(billedGrossBase.toFixed(2)),
        currencyMismatch,
        fxComparable,
        directInvoiceId: directInvoiceId || null, // NUEVO (detalle)
        docs: CONFIG.DETAIL_INCLUDE_DOC_BREAKDOWN ? docBreakdown : undefined
      };

      log.audit({
        title: CONFIG.TEST_MODE ? 'TEST_MODE_WOULD_UPDATE' : 'UPDATED_STATUS',
        details: JSON.stringify(payload)
      });
      DETAIL_LOGGED += 1;
    }

    if (CONFIG.TEST_MODE) {
      context.write({ key: 'WOULD_UPDATE', value: '1' });
      return;
    }

    record.submitFields({
      type: record.Type.SALES_ORDER,
      id: soId,
      values: { [CONFIG.FIELD_STATUS_OS]: newStatusId },
      options: { enableSourcing: false, ignoreMandatoryFields: true }
    });

    context.write({ key: 'UPDATED', value: '1' });
  }

  /* ===================== summarize ===================== */
  function summarize(summary) {
    const stats = {
      TEST_MODE: CONFIG.TEST_MODE,
      dateRange: { from: fmtDate(CONFIG.DATE_FROM), to: fmtDate(CONFIG.DATE_TO) },
      processed: 0,
      noChange: 0,
      changed: 0,
      wouldUpdate: 0,
      updated: 0,
      transitions: {},
      usage: summary.usage,
      concurrency: summary.concurrency,
      yields: summary.yields,
      errors: []
    };

    if (summary.inputSummary && summary.inputSummary.error) {
      stats.errors.push({ stage: 'input', error: summary.inputSummary.error });
    }

    summary.mapSummary.errors.iterator().each((key, err) => {
      stats.errors.push({ stage: 'map', key, error: err });
      return true;
    });

    summary.reduceSummary.errors.iterator().each((key, err) => {
      stats.errors.push({ stage: 'reduce', key, error: err });
      return true;
    });

    const totalsByKey = {};
    summary.output.iterator().each((key, value) => {
      const k = String(key);
      totalsByKey[k] = (totalsByKey[k] || 0) + toNumber(value);
      return true;
    });

    stats.processed = totalsByKey.TOTAL || 0;
    stats.noChange = totalsByKey.NOCHANGE || 0;
    stats.changed = totalsByKey.CHANGED || 0;
    stats.wouldUpdate = totalsByKey.WOULD_UPDATE || 0;
    stats.updated = totalsByKey.UPDATED || 0;

    Object.keys(totalsByKey).forEach((k) => {
      if (k.indexOf('TRANS_') === 0) stats.transitions[k] = totalsByKey[k];
    });

    log.audit({ title: 'TEST_MODE_SUMMARY', details: JSON.stringify(stats) });
  }

  return { getInputData, map, reduce, summarize };
});
