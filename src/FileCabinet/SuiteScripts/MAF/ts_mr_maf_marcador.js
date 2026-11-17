/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * MR2: (1) NUMERA correlativos PE (y opcionalmente tranid) para Invoices creadas por MR1
 *      (2) MARCA líneas del Sales Order (custcol_ht_fac_agru / custcol_ht_fec_fact)
 *
 * Entrada: resultFile JSON generado por MR1 con:
 * {
 *   colaId: "...",
 *   id_log: "...",
 *   createdAt: "...",
 *   markItems: [
 *     { soId, invoiceId, linekey, linea }
 *   ]
 * }
 *
 * NOTAS IMPORTANTES (por tus errores previos):
 * - NO usa SuiteQL UPDATE (tu entorno lo bloquea). Usa la MISMA lógica del UE original:
 *   lee custrecord_pe_inicio y al final actualiza custrecord_pe_inicio con submitFields.
 * - Para evitar duplicados: reduce agrupa por SERIE => 1 hilo por serie (numeración secuencial por key).
 * - Corrige el doble guion en tranid: normaliza tranprefix quitando guiones finales antes de concatenar.
 */
define(['N/record', 'N/runtime', 'N/file', 'N/log', 'N/search'],
  (record, runtime, file, log, search) => {

    // =========================
    // CONFIG
    // =========================
    const RECORD_COLA = 'customrecord_ts_standar_ss_cola_maf_mov';

    // Campos a marcar en SO (lógica original)
    const FIELD_LINE_INVOICE = 'custcol_ht_fac_agru';
    const FIELD_LINE_DATE = 'custcol_ht_fec_fact';

    // Campos PE en Invoice
    const FIELD_PE_DOC_TYPE = 'custbody_pe_document_type';
    const FIELD_PE_SERIE = 'custbody_pe_serie';
    const FIELD_PE_NUMBER = 'custbody_pe_number';

    // Serie PE (customrecord_pe_serie)
    const SERIE_REC_TYPE = 'customrecord_pe_serie';
    const SERIE_FIELD_INICIO = 'custrecord_pe_inicio';
    const SERIE_FIELD_IMP = 'custrecord_pe_serie_impresion';

    // Fiscal doc type (customrecord_pe_fiscal_document_type)
    const FISCAL_REC_TYPE = 'customrecord_pe_fiscal_document_type';
    const FISCAL_FIELD_PREFIX = 'custrecord_pe_prefix';

    // Correlativo con ceros
    const CORRELATIVE_LEN = 8;

    // Formato tranid (ajustable)
    const SET_TRANID = true;
    const USE_SUBSIDIARY_PREFIX = true;          // usa subsidiary.tranprefix
    const INCLUDE_FISCAL_PREFIX = true;          // prefix + '-' + serieImp

    // =========================
    // INPUT
    // =========================
    function getInputData() {
      const script = runtime.getCurrentScript();
      const resultFileId = script.getParameter({ name: 'custscript_ts_mr_maf_result_file_id1' });
      const colaId = script.getParameter({ name: 'custscript_ts_mr_maf_cola_id1' });

      if (!resultFileId) throw new Error('Falta custscript_ts_mr_maf_result_file_id1');

      let data = {};
      try {
        data = JSON.parse(file.load({ id: resultFileId }).getContents() || '{}');
      } catch (e) {
        throw new Error('No se pudo leer resultFile JSON: ' + String(e));
      }

      const markItems = Array.isArray(data.markItems) ? data.markItems : [];
      if (!markItems.length) return [];

      if (colaId) {
        safeSubmitFields(RECORD_COLA, colaId, {
          custrecord_ts_ss_estado_mm: 'MR2: Numerando correlativos (lógica UE) y marcando SO'
        });
      }

      return markItems;
    }

    // =========================
    // MAP: agrupa por SERIE para numerar secuencialmente
    // =========================
    function map(context) {
      const r = JSON.parse(context.value || '{}');
      if (!r.invoiceId || !r.soId) return;

      const invoiceId = Number(r.invoiceId);
      if (!invoiceId) return;

      // lookup invoice para sacar serie y data necesaria
      const inv = search.lookupFields({
        type: search.Type.INVOICE,
        id: invoiceId,
        columns: ['subsidiary', FIELD_PE_DOC_TYPE, FIELD_PE_SERIE, FIELD_PE_NUMBER]
      });

      const serieId = pickSelectId(inv[FIELD_PE_SERIE]);
      if (!serieId) {
        // Sin serie no podemos numerar; lo mandamos como error a reduce "0"
        context.write({
          key: '0',
          value: JSON.stringify({ ok: false, invoiceId, soId: r.soId, error: `Invoice ${invoiceId} sin custbody_pe_serie` })
        });
        return;
      }

      // Si ya está numerada, igual haremos el marcado SO, pero no renumeramos
      const peNum = getScalar(inv[FIELD_PE_NUMBER]);

      context.write({
        key: String(serieId), // reduce por serie
        value: JSON.stringify({
          ok: true,
          serieId: Number(serieId),
          invoiceId,
          alreadyNumbered: !!peNum,
          subsidiaryId: Number(pickSelectId(inv.subsidiary) || 0),
          fiscalDocTypeId: Number(pickSelectId(inv[FIELD_PE_DOC_TYPE]) || 0),

          // data marcado SO (lógica original)
          soId: Number(r.soId),
          linekey: r.linekey || '',
          linea: r.linea || ''
        })
      });
    }

    // =========================
    // REDUCE: numera 1 serie en 1 hilo (sin duplicados en esa serie)
    // =========================
    function reduce(context) {
      const serieId = Number(context.key);

      // Grupo de errores (key 0) o serie inválida
      if (!serieId) {
        context.values.forEach(v => log.error('MR2 item sin serie', JSON.parse(v)));
        context.write({ key: context.key, value: JSON.stringify({ ok: false, serieId: 0, errorCount: context.values.length }) });
        return;
      }

      const items = context.values.map(v => JSON.parse(v));
      const toNumber = items.filter(x => x.ok && !x.alreadyNumbered);

      try {
        // 1) Cargar serie 1 sola vez
        const serieRec = record.load({ type: SERIE_REC_TYPE, id: serieId, isDynamic: false });
        let inicio = Number(serieRec.getValue({ fieldId: SERIE_FIELD_INICIO }) || 0);
        const serieImpRaw = String(serieRec.getValue({ fieldId: SERIE_FIELD_IMP }) || '');

        if (!inicio) throw new Error(`Serie ${serieId} con inicio vacío/0`);
        if (!serieImpRaw) throw new Error(`Serie ${serieId} sin serie impresión`);

        // caches para no lookup repetido
        const fiscalPrefixCache = new Map(); // fiscalDocTypeId -> prefix
        const subPrefixCache = new Map();    // subsidiaryId -> tranprefix

        // 2) Numerar secuencialmente (misma lógica UE: this_number=inicio, luego inicio++)
        for (let i = 0; i < toNumber.length; i++) {
          const it = toNumber[i];

          const corrInt = inicio; // número actual
          inicio = inicio + 1;    // siguiente para el próximo

          const correlative = padLeft(String(corrInt), CORRELATIVE_LEN, '0');

          // fiscal prefix
          let fiscalPrefix = '';
          if (INCLUDE_FISCAL_PREFIX && it.fiscalDocTypeId) {
            if (!fiscalPrefixCache.has(it.fiscalDocTypeId)) {
              fiscalPrefixCache.set(it.fiscalDocTypeId, getFiscalPrefix(it.fiscalDocTypeId));
            }
            fiscalPrefix = fiscalPrefixCache.get(it.fiscalDocTypeId) || '';
          }

          const serieImpr = fiscalPrefix ? `${fiscalPrefix}-${serieImpRaw}` : serieImpRaw;
          const numbering = `${serieImpr}-${correlative}`; // ej: BV-BE03-00137032

          // 3) Armar tranid final con FIX de doble guion
          let tranidFinal = numbering;
          if (SET_TRANID && USE_SUBSIDIARY_PREFIX && it.subsidiaryId) {
            if (!subPrefixCache.has(it.subsidiaryId)) {
              subPrefixCache.set(it.subsidiaryId, getSubsidiaryPrefix(it.subsidiaryId));
            }
            const subPrefixRaw = subPrefixCache.get(it.subsidiaryId) || '';

            // FIX: quitar guiones finales del tranprefix para evitar "PE--BV..."
            const subClean = String(subPrefixRaw).trim().replace(/-+$/g, '');
            const numClean = String(numbering).trim().replace(/^-+/g, '');

            tranidFinal = subClean ? `${subClean}-${numClean}` : numClean;
          }

          // 4) actualizar invoice
          const values = {};
          values[FIELD_PE_NUMBER] = correlative;
          values[FIELD_PE_SERIE] = serieId;
          if (SET_TRANID) values.tranid = tranidFinal;

          record.submitFields({
            type: record.Type.INVOICE,
            id: it.invoiceId,
            values,
            options: { enableSourcing: false, ignoreMandatoryFields: true }
          });
        }

        // 5) Persistir el nuevo inicio al final (como tu UE)
        record.submitFields({
          type: SERIE_REC_TYPE,
          id: serieId,
          values: { [SERIE_FIELD_INICIO]: inicio },
          options: { enableSourcing: false, ignoreMandatoryFields: true }
        });

        // 6) Marcar SOs (lógica original) - agrupamos por soId para cargar 1 vez cada SO
        const bySo = new Map();
        for (const it of items) {
          if (!it.soId) continue;
          const k = String(it.soId);
          if (!bySo.has(k)) bySo.set(k, []);
          bySo.get(k).push(it);
        }

        const now = new Date();
        for (const [soKey, list] of bySo.entries()) {
          const soId = Number(soKey);
          if (!soId) continue;

          const byKey = new Set();
          const byLine = new Set();
          for (const x of list) {
            if (x.linekey) byKey.add(String(x.linekey));
            else if (x.linea) byLine.add(String(x.linea));
          }

          const so = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: false });
          const count = so.getLineCount({ sublistId: 'item' });

          for (let ln = 0; ln < count; ln++) {
            const lk = String(so.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: ln }) || '');
            const li = String(so.getSublistValue({ sublistId: 'item', fieldId: 'line', line: ln }) || '');

            const match = (byKey.size > 0) ? byKey.has(lk) : byLine.has(li);
            if (!match) continue;

            const found = list.find(x =>
              (x.linekey && String(x.linekey) === lk) ||
              (!x.linekey && String(x.linea) === li)
            );

            const invId = found ? Number(found.invoiceId) : 0;
            if (invId) {
              so.setSublistValue({ sublistId: 'item', fieldId: FIELD_LINE_INVOICE, line: ln, value: invId });
            }
            so.setSublistValue({ sublistId: 'item', fieldId: FIELD_LINE_DATE, line: ln, value: now });
          }

          so.save({ ignoreMandatoryFields: true });
        }

        context.write({
          key: context.key,
          value: JSON.stringify({
            ok: true,
            serieId,
            invoicesTotal: items.length,
            numberedNow: toNumber.length
          })
        });

      } catch (e) {
        log.error('MR2 reduce error', { serieId, error: String(e) });
        context.write({
          key: context.key,
          value: JSON.stringify({
            ok: false,
            serieId,
            error: (e && e.message) ? e.message : String(e)
          })
        });
      }
    }

    // =========================
    // SUMMARIZE
    // =========================
    function summarize(summary) {
      const script = runtime.getCurrentScript();
      const colaId = script.getParameter({ name: 'custscript_ts_mr_maf_cola_id1' });

      let ok = 0, err = 0;
      const errors = [];

      summary.output.iterator().each((k, v) => {
        const r = JSON.parse(v);
        if (r.ok) ok++;
        else { err++; errors.push(r); }
        return true;
      });

      if (summary.inputSummary && summary.inputSummary.error) {
        err++;
        errors.push({ error: String(summary.inputSummary.error) });
      }
      summary.mapSummary.errors.iterator().each((k, e) => {
        err++; errors.push({ key: k, error: String(e) });
        return true;
      });
      summary.reduceSummary.errors.iterator().each((k, e) => {
        err++; errors.push({ key: k, error: String(e) });
        return true;
      });

      if (colaId) {
        safeSubmitFields(RECORD_COLA, colaId, {
          custrecord_ts_ss_estado_mm: err ? 'MR2: Marcado/Numerado con errores' : 'MR2: Completado',
          custrecord_ts_ss_error_mm: err ? JSON.stringify(errors).slice(0, 3900) : ''
        });
      }

      log.audit('MR2 resumen', { colaId, okKeys: ok, errKeys: err });
    }

    // =========================
    // Helpers lookups
    // =========================
    function getFiscalPrefix(fiscalDocTypeId) {
      if (!fiscalDocTypeId) return '';
      try {
        const r = search.lookupFields({
          type: FISCAL_REC_TYPE,
          id: fiscalDocTypeId,
          columns: [FISCAL_FIELD_PREFIX]
        });
        return String(getScalar(r[FISCAL_FIELD_PREFIX]) || '');
      } catch (e) {
        log.error('getFiscalPrefix error', { fiscalDocTypeId, error: String(e) });
        return '';
      }
    }

    function getSubsidiaryPrefix(subsidiaryId) {
      if (!subsidiaryId) return '';
      try {
        const r = search.lookupFields({
          type: search.Type.SUBSIDIARY,
          id: subsidiaryId,
          columns: ['tranprefix']
        });
        return String(getScalar(r.tranprefix) || '');
      } catch (e) {
        log.error('getSubsidiaryPrefix error', { subsidiaryId, error: String(e) });
        return '';
      }
    }

    function safeSubmitFields(type, id, values) {
      try {
        record.submitFields({
          type,
          id,
          values,
          options: { enableSourcing: false, ignoreMandatoryFields: true }
        });
      } catch (e) {
        log.error('submitFields error', { type, id, error: String(e) });
      }
    }

    function padLeft(str, len, ch) {
      str = String(str);
      while (str.length < len) str = ch + str;
      return str;
    }

    function pickSelectId(v) {
      if (v == null) return null;
      if (Array.isArray(v)) return (v[0] && v[0].value) ? v[0].value : null;
      if (typeof v === 'object') return v.value || null;
      return v;
    }

    function getScalar(v) {
      if (v == null) return '';
      if (Array.isArray(v)) {
        if (!v.length) return '';
        return v[0].value || v[0].text || '';
      }
      if (typeof v === 'object') return v.value || v.text || '';
      return v;
    }

    return { getInputData, map, reduce, summarize };
  });