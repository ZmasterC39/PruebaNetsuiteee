/**
 * Ajusta de USD 12.00 a USD 11.00 las ultimas cuotas de una lista de OS.
 * La cantidad de cuotas a ajustar es: importe configurado - 11.
 *
 * Ejemplo: OS ...1717 | 15.00 => 15 - 11 = ultimas 4 cuotas.
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {
  const FI_TYPE = 'customsale_ec_factura_interna';
  const FI_ITEM_ID = 46090;
  const FLD_CUOTA = 'custbody_ec_nro_cuota_fac_int';
  const FLD_CREATED_FROM_FI = 'custbody_ec_created_from_fac_int';
  const AMOUNT_FROM = 12;
  const AMOUNT_TO = 11;

  // Formato: ORDEN_DE_SERVICIO, tabulacion o espacios, IMPORTE_EN_DOLARES.
  const OS_TARGET_AMOUNTS_TEXT = [
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
  ].join('\n');

  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function sameAmount(a, b) {
    return Math.abs(Number(a) - Number(b)) < 0.0001;
  }

  function parseInput(text) {
    const seen = {};
    return String(text || '').split(/\r?\n/).map((line, index) => {
      const clean = String(line || '').trim();
      if (!clean || /^#|^\/\//.test(clean)) return null;
      const match = clean.match(/^(\S+)\s+\$?([\d,.]+)$/);
      if (!match) throw new Error('LINEA_INVALIDA_' + (index + 1) + ': ' + clean);

      const tranId = match[1].trim();
      const targetAmount = Number(match[2].replace(/,/g, ''));
      const quotaCount = round2(targetAmount - AMOUNT_TO);
      if (!Number.isInteger(quotaCount) || quotaCount < 1 || quotaCount > 12) {
        throw new Error('IMPORTE_INVALIDO_' + tranId + ': ' + targetAmount);
      }
      if (seen[tranId]) throw new Error('OS_DUPLICADA: ' + tranId);
      seen[tranId] = true;
      return { tranId, targetAmount, quotaCount };
    }).filter(Boolean);
  }

  function resolveSalesOrderId(tranId) {
    const ids = [];
    search.create({
      type: search.Type.SALES_ORDER,
      filters: [['mainline', 'is', 'T'], 'AND', ['tranid', 'is', tranId]],
      columns: [search.createColumn({ name: 'internalid' })]
    }).run().each(result => {
      ids.push(Number(result.getValue({ name: 'internalid' }) || result.id));
      return ids.length < 2;
    });
    if (!ids.length) throw new Error('OS_NO_ENCONTRADA: ' + tranId);
    if (ids.length > 1) throw new Error('OS_AMBIGUA: ' + tranId);
    return ids[0];
  }

  function getInputData() {
    const rows = parseInput(OS_TARGET_AMOUNTS_TEXT).map(row => Object.assign(row, {
      soId: resolveSalesOrderId(row.tranId)
    }));
    log.audit('ENTRADA_AJUSTE_CUOTAS', { ordenes: rows.length, rows });
    return rows;
  }

  function getFiQuotas(soId) {
    const byFiId = {};
    search.create({
      type: 'transaction',
      filters: [
        ['recordtype', 'is', FI_TYPE], 'AND',
        ['mainline', 'is', 'F'], 'AND',
        ['item', 'anyof', String(FI_ITEM_ID)], 'AND',
        [
          ['createdfrom', 'anyof', String(soId)], 'OR',
          [FLD_CREATED_FROM_FI, 'anyof', String(soId)]
        ]
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'tranid' }),
        search.createColumn({ name: FLD_CUOTA }),
        search.createColumn({ name: 'trandate' }),
        search.createColumn({ name: 'quantity' }),
        search.createColumn({ name: 'rate' }),
        search.createColumn({ name: 'amount' })
      ]
    }).run().each(result => {
      const id = Number(result.getValue({ name: 'internalid' }) || result.id);
      if (!byFiId[id]) {
        byFiId[id] = {
          id,
          tranId: String(result.getValue({ name: 'tranid' }) || ''),
          quota: Number(result.getValue({ name: FLD_CUOTA }) || 0),
          date: String(result.getValue({ name: 'trandate' }) || ''),
          quantity: Number(result.getValue({ name: 'quantity' }) || 1),
          rate: Number(result.getValue({ name: 'rate' }) || 0),
          amount: Number(result.getValue({ name: 'amount' }) || 0)
        };
      }
      return true;
    });

    return Object.keys(byFiId).map(id => byFiId[id]).sort((a, b) => {
      if (a.quota !== b.quota) return b.quota - a.quota;
      return b.id - a.id;
    });
  }

  function updateFi(fi) {
    const rec = record.load({ type: FI_TYPE, id: fi.id, isDynamic: false });
    const lineCount = rec.getLineCount({ sublistId: 'item' }) || 0;
    let line = -1;
    for (let i = 0; i < lineCount; i++) {
      const itemId = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }) || 0);
      if (itemId === FI_ITEM_ID) { line = i; break; }
    }
    if (line < 0) throw new Error('ITEM_NO_ENCONTRADO_EN_FI_' + fi.id);

    const quantity = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line }) || 1) || 1;
    const currentRate = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line }) || 0);
    const currentAmount = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line }) || 0);
    if (sameAmount(currentAmount, AMOUNT_TO)) return { id: fi.id, status: 'YA_ESTABA_EN_11' };
    if (!sameAmount(currentAmount, AMOUNT_FROM) && !sameAmount(currentRate * quantity, AMOUNT_FROM)) {
      throw new Error('MONTO_INESPERADO_FI_' + fi.id + ': rate=' + currentRate + ', amount=' + currentAmount);
    }

    try { rec.setSublistValue({ sublistId: 'item', fieldId: 'price', line, value: -1 }); } catch (_) {}
    rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line, value: quantity });
    rec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line, value: round2(AMOUNT_TO / quantity) });
    try { rec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line, value: AMOUNT_TO }); } catch (_) {}
    const savedId = rec.save({ enableSourcing: false, ignoreMandatoryFields: false });
    return { id: savedId, status: 'ACTUALIZADA_A_11' };
  }

  function map(context) {
    const input = JSON.parse(context.value);
    const allQuotas = getFiQuotas(input.soId);
    log.audit('FIS_ENCONTRADAS_' + input.tranId, {
      soId: input.soId,
      encontradas: allQuotas.length,
      cuotas: allQuotas.map(fi => ({
        fiId: fi.id,
        fiTranId: fi.tranId,
        cuota: fi.quota,
        rate: fi.rate,
        amount: fi.amount
      }))
    });
    if (allQuotas.length < input.quotaCount) {
      throw new Error('CUOTAS_INSUFICIENTES_' + input.tranId + ': requeridas=' + input.quotaCount + ', encontradas=' + allQuotas.length);
    }

    const selected = allQuotas.slice(0, input.quotaCount);
    // En una busqueda transaction, rate/amount pueden venir convertidos a la
    // moneda base (por ejemplo, 12 USD * 3.417 = 41.004). Por eso aqui solo
    // validamos que exista el numero de cuota. El monto en USD se valida con
    // record.load() dentro de updateFi(), antes de modificar y guardar la FI.
    const invalid = selected.filter(fi => !fi.quota);
    if (invalid.length) {
      throw new Error('VALIDACION_PREVIA_FALLIDA_' + input.tranId + ': ' + JSON.stringify(invalid));
    }

    selected.forEach(fi => {
      const result = updateFi(fi);
      context.write({
        key: input.tranId,
        value: JSON.stringify({
          soId: input.soId,
          targetAmount: input.targetAmount,
          quotaCount: input.quotaCount,
          quota: fi.quota,
          fiId: fi.id,
          fiTranId: fi.tranId,
          status: result.status
        })
      });
    });
  }

  function summarize(summary) {
    let ok = 0;
    const results = [];
    summary.output.iterator().each((key, value) => {
      ok++;
      results.push(JSON.parse(value));
      return true;
    });
    if (summary.inputSummary.error) log.error('ERROR_ENTRADA', summary.inputSummary.error);
    summary.mapSummary.errors.iterator().each((key, error) => {
      log.error('ERROR_OS_' + key, error);
      return true;
    });
    log.audit('RESUMEN_AJUSTE_ULTIMAS_CUOTAS', { cuotasProcesadas: ok, results });
  }

  return { getInputData, map, summarize };
});
