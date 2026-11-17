/**
 * MR: Completar TC USD->PEN en custbody_ht_pe_os_usd por TRANDATE
 * Solo Subsidiaria 3
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/currency', 'N/record', 'N/log', 'N/format'], (search, currency, record, log, format) => {

  // ======= CONFIG (variables) =======
  const TEST_MODE = false;                 // true => solo log (NO actualiza)
  const ONLY_SUBSIDIARY_ID = '3';

  const USD_CURRENCY_ID = '1';            // Ajusta si USD no es 1
  const PEN_CURRENCY_ID = '5';            // Ajusta si PEN no es 5

  const FLD_TC_USD_TO_PEN = 'custbody_ht_pe_os_usd';
  const ONLY_IF_EMPTY = true;             // true => solo completa si el campo está vacío

  const MONTH_START = '2026-01';          // inclusive (YYYY-MM)
  const MONTH_END   = '2026-01';          // inclusive (YYYY-MM)
  // ==================================

  function monthToDateRange(monthStr) {
    const m = /^(\d{4})-(\d{2})$/.exec(monthStr);
    if (!m) throw new Error('Mes inválido (usa YYYY-MM): ' + monthStr);

    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;

    const start = new Date(y, mo, 1);
    const end = new Date(y, mo + 1, 1); // exclusive
    return { start, end };
  }

  function buildRangeByMonths(startMonth, endMonth) {
    const r1 = monthToDateRange(startMonth);
    const r2 = monthToDateRange(endMonth);
    return { start: r1.start, end: r2.end }; // inclusive start, exclusive end
  }

  function getInputData() {
    const range = buildRangeByMonths(MONTH_START, MONTH_END);
    const dateFrom = format.format({ value: range.start, type: format.Type.DATE });
    const dateToEx = format.format({ value: range.end, type: format.Type.DATE });

    // ✅ Usamos TRANDATE (fecha de la operación)
    const filters = [
      ['type', 'anyof', 'SalesOrd'], 'AND',
      ['mainline', 'is', 'T'], 'AND',
      ['subsidiary', 'anyof', ONLY_SUBSIDIARY_ID], 'AND',
      ['trandate', 'onorafter', dateFrom], 'AND',
      ['trandate', 'before', dateToEx]
    ];

    if (ONLY_IF_EMPTY) {
      filters.push('AND', [FLD_TC_USD_TO_PEN, 'isempty', '']);
    }

    const s = search.create({
      type: search.Type.SALES_ORDER,
      filters,
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'trandate' }),
        search.createColumn({ name: 'subsidiary' }),
        search.createColumn({ name: FLD_TC_USD_TO_PEN })
      ]
    });

    log.audit({
      title: 'MR InputData',
      details: JSON.stringify({
        TEST_MODE,
        ONLY_IF_EMPTY,
        ONLY_SUBSIDIARY_ID,
        MONTH_START,
        MONTH_END,
        date_from: dateFrom,
        date_to_exclusive: dateToEx
      })
    });

    return s;
  }

  function map(context) {
    const row = JSON.parse(context.value);

    const soId = row.id;
    const trandateStr = row.values.trandate; // normalmente string tipo "16/01/2026"
    const subsidiaryVal = row.values.subsidiary && row.values.subsidiary.value ? row.values.subsidiary.value : row.values.subsidiary;
    const currentVal = row.values[FLD_TC_USD_TO_PEN];

    context.write({
      key: String(soId),
      value: JSON.stringify({
        soId,
        trandateStr,
        subsidiaryVal,
        currentVal
      })
    });
  }

  function reduce(context) {
    const soId = context.key;
    const payload = JSON.parse(context.values[0]);

    // Doble seguridad (aunque ya viene filtrado por subsidiary)
    if (String(payload.subsidiaryVal) !== ONLY_SUBSIDIARY_ID) {
      log.debug({ title: 'reduce: skip subsidiaria', details: `SO=${soId} sub=${payload.subsidiaryVal}` });
      return;
    }

    // Parse de TRANDATE (DATE)
    let trandateObj;
    try {
      trandateObj = format.parse({ value: payload.trandateStr, type: format.Type.DATE });
    } catch (e) {
      // fallback
      trandateObj = new Date(payload.trandateStr);
    }

    if (!trandateObj || isNaN(trandateObj.getTime())) {
      log.error({ title: 'reduce: trandate inválido', details: `SO=${soId} trandate=${payload.trandateStr}` });
      return;
    }

    // ✅ Tipo de cambio nativo NetSuite: USD -> PEN en la fecha TRANDATE
    const rate = currency.exchangeRate({
      source: USD_CURRENCY_ID,
      target: PEN_CURRENCY_ID,
      date: trandateObj
    });

    if (!rate || Number(rate) <= 0) {
      log.error({ title: 'reduce: rate inválido', details: `SO=${soId} trandate=${payload.trandateStr} rate=${rate}` });
      return;
    }

    if (TEST_MODE) {
      log.audit({
        title: 'TEST_MODE: NO UPDATE',
        details: `SO=${soId} set ${FLD_TC_USD_TO_PEN}=${rate} (USD->PEN) usando trandate=${payload.trandateStr}`
      });
      return;
    }

    record.submitFields({
      type: record.Type.SALES_ORDER,
      id: soId,
      values: { [FLD_TC_USD_TO_PEN]: Number(rate) },
      options: { enableSourcing: false, ignoreMandatoryFields: true }
    });

    log.audit({
      title: 'UPDATED',
      details: `SO=${soId} set ${FLD_TC_USD_TO_PEN}=${rate} (USD->PEN) trandate=${payload.trandateStr}`
    });
  }

  function summarize(summary) {
    log.audit({ title: 'MR Summary', details: `TEST_MODE=${TEST_MODE} | ONLY_IF_EMPTY=${ONLY_IF_EMPTY}` });

    if (summary.inputSummary && summary.inputSummary.error) {
      log.error({ title: 'Input Error', details: summary.inputSummary.error });
    }

    summary.mapSummary.errors.iterator().each((k, e) => {
      log.error({ title: `Map Error SO=${k}`, details: e });
      return true;
    });

    summary.reduceSummary.errors.iterator().each((k, e) => {
      log.error({ title: `Reduce Error SO=${k}`, details: e });
      return true;
    });

    log.audit({
      title: 'Usage/Concurrency/Yields',
      details: JSON.stringify({
        usage: summary.usage,
        concurrency: summary.concurrency,
        yields: summary.yields
      })
    });
  }

  return { getInputData, map, reduce, summarize };
});
