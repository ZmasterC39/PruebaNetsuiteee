/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/currency', 'N/log'], (currentRecord, currency, log) => {

  // ======= CONFIG =======
  const ONLY_SUBSIDIARY_ID = '3';
  const FLD_TC_USD_TO_PEN = 'custbody_ht_pe_os_usd';
  const USD_CURRENCY_ID = '1';  // ajusta si USD no es 1
  const PEN_CURRENCY_ID = '5';  // ajusta si PEN no es 5 (en tu data parece 5)
  // ======================

  function isEmpty(v) {
    return v === null || v === undefined || v === '';
  }

  function fillRateIfNeeded(trigger) {
    try {
      const rec = currentRecord.get();
      const mode = rec.getValue({ fieldId: 'entryformquerystring' }) || ''; // a veces no sirve para modo
      // En client, mejor usar window.nlapiGetContext? pero en 2.1 no siempre.
      // Así que nos guiamos por que el registro NO tiene id aún:
      const internalId = rec.id;

      // Solo CREATE (cuando aún no hay id)
      if (internalId) return;

      const subsidiaryId = String(rec.getValue({ fieldId: 'subsidiary' }) || '');
      if (subsidiaryId !== ONLY_SUBSIDIARY_ID) return;

      const existing = rec.getValue({ fieldId: FLD_TC_USD_TO_PEN });
      if (!isEmpty(existing)) {
        log.debug({ title: `[CS ${trigger}] Omitido`, details: `${FLD_TC_USD_TO_PEN} ya tiene valor: ${existing}` });
        return;
      }

      // Usamos trandate (en create suele ser “hoy”, pero si el usuario lo cambia, recalcula)
      const trandate = rec.getValue({ fieldId: 'trandate' });
      if (!trandate) {
        log.debug({ title: `[CS ${trigger}] Skip`, details: 'Sin trandate' });
        return;
      }

      const rate = currency.exchangeRate({
        source: USD_CURRENCY_ID,
        target: PEN_CURRENCY_ID,
        date: trandate
      });

      if (!rate || Number(rate) <= 0) {
        log.error({ title: `[CS ${trigger}] Rate inválido`, details: `USD->PEN date=${trandate} rate=${rate}` });
        return;
      }

      rec.setValue({ fieldId: FLD_TC_USD_TO_PEN, value: Number(rate) });

      log.audit({
        title: `[CS ${trigger}] TC seteado`,
        details: `USD(${USD_CURRENCY_ID})->PEN(${PEN_CURRENCY_ID}) date=${trandate} rate=${rate}`
      });

    } catch (e) {
      log.error({ title: `[CS ${trigger}] Error`, details: e && (e.message || e) });
    }
  }

  function pageInit(ctx) {
    fillRateIfNeeded('pageInit');
  }

  function fieldChanged(ctx) {
    if (ctx.fieldId === 'trandate') {
      fillRateIfNeeded('fieldChanged:trandate');
    }
  }

  return { pageInit, fieldChanged };
});
