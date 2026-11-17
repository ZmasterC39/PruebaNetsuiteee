/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/file', 'N/log', 'N/search'],
  (record, runtime, file, log, search) => {

    const FORM_PE_FORMULARIO_FACTURA_VENTA = 183;
    const PENDIENTE = 3;

    const RECORD_COLA = 'customrecord_ts_standar_ss_cola_maf_mov';
    const RECORD_LOG_CAB = 'customrecord_ts_log_ejec_agrup_fact_mm';

    const DEFAULT_DEPARTMENT_ID = 299;
    const DEFAULT_CLASS_ID = 76;
    const FORCE_DEFAULT_DEPT_CLASS = false;

    const FIELD_LINE_INVOICE = 'custcol_ht_fac_agru';
    const FIELD_LINE_DATE = 'custcol_ht_fec_fact';

    const FIELD_PE_DOC_TYPE = 'custbody_pe_document_type';
    const FIELD_PE_SERIE = 'custbody_pe_serie';
    const FIELD_PE_NUMBER = 'custbody_pe_number';
    const FIELD_PE_EI_OPERATION_TYPE = 'custbody_pe_ei_operation_type';
    const FIELD_EI_STATUS = 'custbody_psg_ei_status';

    const EI_STATUS_PARA_GENERACION = 1;

    const SERIE_REC_TYPE = 'customrecord_pe_serie';
    const SERIE_FIELD_INICIO = 'custrecord_pe_inicio';
    const SERIE_FIELD_IMP = 'custrecord_pe_serie_impresion';

    const FISCAL_REC_TYPE = 'customrecord_pe_fiscal_document_type';
    const FISCAL_FIELD_PREFIX = 'custrecord_pe_prefix';

    const CORRELATIVE_LEN = 8;
    const RESERVE_RETRIES = 5;

    const SET_TRANID = true;
    const USE_SUBSIDIARY_PREFIX = true;
    const INCLUDE_FISCAL_PREFIX = true;

    function getInputData() {
      const script = runtime.getCurrentScript();
      const colaId = script.getParameter({ name: 'custscript_ts_mr_maf_cola_id' });
      const fileId = script.getParameter({ name: 'custscript_ts_mr_maf_file_id' });

      if (!colaId || !fileId) {
        throw new Error(`Faltan parámetros. colaId=${colaId}, fileId=${fileId}`);
      }

      const payload = JSON.parse(file.load({ id: fileId }).getContents() || '{}');
      if (!payload.facturaDirecta || !payload.facturaDirecta.length) {
        throw new Error('El JSON no contiene facturaDirecta[]');
      }
      if (!payload.serie) {
        throw new Error('El JSON no contiene la serie PE requerida para reservar correlativos.');
      }
      if (!payload.tipo_operacion) {
        throw new Error('El JSON no contiene PE EI Tipo de Operación.');
      }

      safeSubmitFields(RECORD_COLA, colaId, {
        custrecord_ts_ss_estado_mm: 'procesando',
        custrecord_ts_ss_fecha_inicio_mm: new Date()
      });

      if (payload.id_log) {
        updateCabLog(payload.id_log, {
          porcentaje: '0%',
          estado: 'Procesando',
          errores: ''
        });
      }

      const reservation = reserveSerieBlock({
        serieId: payload.serie,
        fiscalDocTypeId: payload.tipo_doc,
        count: payload.facturaDirecta.length
      });

      safeSubmitFields(RECORD_COLA, colaId, {
        custrecord_ts_ss_estado_mm: `procesando - correlativos reservados desde ${reservation.start} hasta ${reservation.next - 1}`
      });

      return payload.facturaDirecta.map((line, idx) => {
        const assigned = reservation.assignments[idx];
        if (!assigned) {
          throw new Error(`No existe correlativo reservado para la posición ${idx}.`);
        }

        return {
          idx,
          colaId,
          fileId,
          id_log: payload.id_log,

          tipo_generado: payload.tipo_generado || 'MAF',
          currency: payload.currency,
          account: payload.account,
          glosa: payload.glosa,
          referencia: payload.referencia,
          nota_factura: payload.nota_factura,

          tipo_doc: payload.tipo_doc,
          terminoPago: payload.terminoPago,
          ubicacion: payload.ubicacion,
          serie: payload.serie,
          forma_pago: payload.forma_pago,
          tipo_operacion: payload.tipo_operacion,
          concept_detraction: payload.concept_detraction,
          gratutita: payload.gratutita,

          soId: Number(line.id),
          linekey: line.linekey || '',
          linea: line.linea || '',
          entityInvoice: line.cliente || '',

          reservedCorrelativeInt: assigned.correlativeInt,
          reservedPeNumber: assigned.correlative,
          reservedNumberingBase: assigned.numberingBase
        };
      });
    }

    function map(context) {
      const row = JSON.parse(context.value);

      try {
        const invoiceId = crearInvoiceMAF_FAST(row);

        context.write({
          key: String(row.soId),
          value: JSON.stringify({
            ok: true,
            soId: row.soId,
            invoiceId,
            linekey: row.linekey || '',
            linea: row.linea || ''
          })
        });
      } catch (e) {
        log.error('MAP error', { soId: row.soId, err: (e && e.message) ? e.message : String(e) });

        context.write({
          key: String(row.soId || `ERR_${row.idx}`),
          value: JSON.stringify({
            ok: false,
            soId: row.soId,
            error: (e && (e.message || JSON.stringify(e))) || String(e),
            linekey: row.linekey || '',
            linea: row.linea || ''
          })
        });
      }
    }

    function reduce(context) {
      const soId = Number(context.key);
      const items = context.values.map(v => JSON.parse(v));

      const successItems = items.filter(x => x.ok && x.invoiceId);
      const errors = items
        .filter(x => !x.ok)
        .map(x => ({ soId: x.soId, error: x.error }));

      if (successItems.length && soId) {
        try {
          markSalesOrderLines(soId, successItems);
        } catch (e) {
          errors.push({
            soId,
            error: `Error marcando Sales Order ${soId}: ${(e && e.message) ? e.message : String(e)}`
          });
        }
      }

      context.write({
        key: context.key,
        value: JSON.stringify({
          okCount: successItems.length,
          errCount: errors.length,
          invoices: successItems.map(x => x.invoiceId),
          errors
        })
      });
    }

    function summarize(summary) {
      const script = runtime.getCurrentScript();
      const colaId = script.getParameter({ name: 'custscript_ts_mr_maf_cola_id' });
      const fileId = script.getParameter({ name: 'custscript_ts_mr_maf_file_id' });

      let payload = {};
      try {
        payload = JSON.parse(file.load({ id: fileId }).getContents() || '{}');
      } catch (e) {}

      const id_log = payload.id_log;

      let totalOk = 0;
      let totalErr = 0;
      let invoicesAll = [];
      let errorsAll = [];

      summary.output.iterator().each((key, value) => {
        const r = JSON.parse(value);
        totalOk += (r.okCount || 0);
        totalErr += (r.errCount || 0);
        invoicesAll = invoicesAll.concat(r.invoices || []);
        errorsAll = errorsAll.concat(r.errors || []);
        return true;
      });

      if (summary.inputSummary && summary.inputSummary.error) {
        errorsAll.push({ soId: '', error: String(summary.inputSummary.error) });
      }
      summary.mapSummary.errors.iterator().each((k, e) => {
        errorsAll.push({ soId: k, error: String(e) });
        return true;
      });
      summary.reduceSummary.errors.iterator().each((k, e) => {
        errorsAll.push({ soId: k, error: String(e) });
        return true;
      });

      totalErr = errorsAll.length;
      const statusFinal = totalErr > 0 ? 'Finalizado con errores' : 'Finalizado';

      if (id_log) {
        updateCabLog(id_log, {
          porcentaje: '100%',
          estado: statusFinal,
          fechaFin: true,
          errores: totalErr ? JSON.stringify(errorsAll).slice(0, 3900) : 'OK',
          idFacturaDirecta: invoicesAll
        });
      }

      if (colaId) {
        safeSubmitFields(RECORD_COLA, colaId, {
          custrecord_ts_ss_estado_mm: totalErr ? 'Finalizado con errores' : 'Completado',
          custrecord_ts_ss_error_mm: totalErr ? JSON.stringify(errorsAll).slice(0, 3900) : ''
        });
      }

      log.audit('MR1 resumen', {
        colaId,
        id_log,
        totalOk,
        totalErr,
        invoicesAllCount: invoicesAll.length
      });
    }

    function crearInvoiceMAF_FAST(p) {
      if (!p.soId) throw new Error('soId vacío');
      if (!p.linekey && !p.linea) throw new Error('No hay linekey ni linea');
      if (!p.entityInvoice) throw new Error('entityInvoice vacío');
      if (!p.reservedPeNumber || !p.reservedNumberingBase) {
        throw new Error(`No hay numeración reservada para la SO ${p.soId}`);
      }
      if (!p.tipo_operacion) {
        throw new Error('PE EI Tipo de Operación vacío.');
      }

      const soSeg = FORCE_DEFAULT_DEPT_CLASS
        ? { department: DEFAULT_DEPARTMENT_ID, class: DEFAULT_CLASS_ID }
        : getSoDeptClass(p.soId);

      const deptId = soSeg.department || DEFAULT_DEPARTMENT_ID;
      const classId = soSeg.class || DEFAULT_CLASS_ID;

      const inv = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: p.soId,
        toType: record.Type.INVOICE,
        isDynamic: false
      });

      const keepByKey = !!p.linekey;
      const keepKey = String(p.linekey || '');
      const keepLine = String(p.linea || '');

      const count = inv.getLineCount({ sublistId: 'item' });
      for (let i = count - 1; i >= 0; i--) {
        const lk = String(inv.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i }) || '');
        const ln = String(inv.getSublistValue({ sublistId: 'item', fieldId: 'line', line: i }) || '');
        const match = keepByKey ? (lk === keepKey) : (ln === keepLine);
        if (!match) {
          inv.removeLine({ sublistId: 'item', line: i });
        }
      }

      if (!inv.getLineCount({ sublistId: 'item' })) {
        throw new Error(`La transformada de la SO ${p.soId} no dejó líneas para facturar.`);
      }

      inv.setValue({ fieldId: 'customform', value: FORM_PE_FORMULARIO_FACTURA_VENTA });
      inv.setValue({ fieldId: 'entity', value: p.entityInvoice });
      inv.setValue({ fieldId: 'trandate', value: new Date() });
      inv.setValue({ fieldId: 'approvalstatus', value: 2 });

      if (p.account) inv.setValue({ fieldId: 'account', value: p.account });
      if (p.currency) inv.setValue({ fieldId: 'currency', value: p.currency });
      if (p.glosa) inv.setValue({ fieldId: 'memo', value: p.glosa });

      if (p.ubicacion) inv.setValue({ fieldId: 'location', value: p.ubicacion });
      if (p.tipo_doc) inv.setValue({ fieldId: FIELD_PE_DOC_TYPE, value: p.tipo_doc });
      if (p.terminoPago) inv.setValue({ fieldId: 'terms', value: p.terminoPago });
      if (p.nota_factura) inv.setValue({ fieldId: 'custbodyec_nota_cliente', value: p.nota_factura });
      inv.setValue({ fieldId: 'custbody_ht_status_process_group', value: PENDIENTE });
      if (p.serie) inv.setValue({ fieldId: FIELD_PE_SERIE, value: p.serie });
      if (p.forma_pago) inv.setValue({ fieldId: 'custbody_pe_ei_forma_pago', value: p.forma_pago });
      if (p.concept_detraction) inv.setValue({ fieldId: 'custbody_pe_concept_detraction', value: p.concept_detraction });
      inv.setValue({ fieldId: FIELD_PE_EI_OPERATION_TYPE, value: Number(p.tipo_operacion) });

      if (p.gratutita && p.gratutita !== 'F') {
        inv.setValue({ fieldId: 'custbody_pe_free_operation', value: true });
        inv.setValue({ fieldId: 'discountitem', value: 43898 });
      }

      inv.setValue({ fieldId: FIELD_PE_NUMBER, value: p.reservedPeNumber });

      if (SET_TRANID) {
        const subsidiaryId = Number(inv.getValue({ fieldId: 'subsidiary' }) || 0);
        inv.setValue({
          fieldId: 'tranid',
          value: buildTransactionTranId(p.reservedNumberingBase, subsidiaryId)
        });
      }

      applyDeptClassToInvoice(inv, deptId, classId);

      if (Number(inv.getValue({ fieldId: 'subsidiary' }) || 0) === 3) {
        inv.setValue({ fieldId: FIELD_EI_STATUS, value: EI_STATUS_PARA_GENERACION });
      }

      return inv.save({ ignoreMandatoryFields: true });
    }

    function markSalesOrderLines(soId, successItems) {
      const byKey = new Set();
      const byLine = new Set();

      successItems.forEach((x) => {
        if (x.linekey) {
          byKey.add(String(x.linekey));
        } else if (x.linea) {
          byLine.add(String(x.linea));
        }
      });

      const so = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: false });
      const count = so.getLineCount({ sublistId: 'item' });
      const now = new Date();

      for (let ln = 0; ln < count; ln++) {
        const lk = String(so.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: ln }) || '');
        const li = String(so.getSublistValue({ sublistId: 'item', fieldId: 'line', line: ln }) || '');

        const match = byKey.size > 0 ? byKey.has(lk) : byLine.has(li);
        if (!match) {
          continue;
        }

        const found = successItems.find(x =>
          (x.linekey && String(x.linekey) === lk) ||
          (!x.linekey && String(x.linea) === li)
        );

        const invId = found ? Number(found.invoiceId) : 0;
        if (invId) {
          so.setSublistValue({
            sublistId: 'item',
            fieldId: FIELD_LINE_INVOICE,
            line: ln,
            value: invId
          });
        }
        so.setSublistValue({
          sublistId: 'item',
          fieldId: FIELD_LINE_DATE,
          line: ln,
          value: now
        });
      }

      so.save({ ignoreMandatoryFields: true });
    }

    function reserveSerieBlock({ serieId, fiscalDocTypeId, count }) {
      if (!serieId) {
        throw new Error('No se indicó la serie para reservar correlativos.');
      }
      if (!count || count < 1) {
        return { start: 0, next: 0, assignments: [] };
      }

      const fiscalPrefix = INCLUDE_FISCAL_PREFIX ? getFiscalPrefix(fiscalDocTypeId) : '';

      for (let attempt = 1; attempt <= RESERVE_RETRIES; attempt++) {
        const serieRec = record.load({ type: SERIE_REC_TYPE, id: serieId, isDynamic: false });
        const inicio = Number(serieRec.getValue({ fieldId: SERIE_FIELD_INICIO }) || 0);
        const serieImpRaw = String(serieRec.getValue({ fieldId: SERIE_FIELD_IMP }) || '').trim();

        if (!inicio) throw new Error(`Serie ${serieId} con inicio vacío/0`);
        if (!serieImpRaw) throw new Error(`Serie ${serieId} sin serie impresión`);

        const nextInicio = inicio + count;
        serieRec.setValue({ fieldId: SERIE_FIELD_INICIO, value: nextInicio });

        try {
          serieRec.save({ enableSourcing: false, ignoreMandatoryFields: true });

          const serieImpr = fiscalPrefix ? `${fiscalPrefix}-${serieImpRaw}` : serieImpRaw;
          const assignments = [];

          for (let offset = 0; offset < count; offset++) {
            const correlativeInt = inicio + offset;
            const correlative = padLeft(String(correlativeInt), CORRELATIVE_LEN, '0');

            assignments.push({
              correlativeInt,
              correlative,
              numberingBase: `${serieImpr}-${correlative}`
            });
          }

          return {
            start: inicio,
            next: nextInicio,
            assignments
          };
        } catch (e) {
          if (isConcurrentChangeError(e) && attempt < RESERVE_RETRIES) {
            log.audit('reserveSerieBlock retry', {
              serieId,
              attempt,
              message: (e && e.message) ? e.message : String(e)
            });
            continue;
          }
          throw e;
        }
      }

      throw new Error(`No se pudo reservar correlativos para la serie ${serieId}.`);
    }

    function buildTransactionTranId(numberingBase, subsidiaryId) {
      let tranidFinal = String(numberingBase || '').trim();

      if (SET_TRANID && USE_SUBSIDIARY_PREFIX && subsidiaryId) {
        const subPrefixRaw = getSubsidiaryPrefix(subsidiaryId);
        const subClean = String(subPrefixRaw || '').trim().replace(/-+$/g, '');
        const numClean = tranidFinal.replace(/^-+/g, '');
        tranidFinal = subClean ? `${subClean}-${numClean}` : numClean;
      }

      return tranidFinal;
    }

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

    function getSoDeptClass(soId) {
      try {
        const r = search.lookupFields({
          type: record.Type.SALES_ORDER,
          id: soId,
          columns: ['department', 'class']
        });

        const dept = pickSelectValue(r.department);
        const clazz = pickSelectValue(r.class);

        return {
          department: dept ? Number(dept) : null,
          class: clazz ? Number(clazz) : null
        };
      } catch (e) {
        log.debug('getSoDeptClass lookup falló', { soId, error: String(e) });
        return { department: null, class: null };
      }
    }

    function applyDeptClassToInvoice(invRec, deptId, classId) {
      if (deptId) invRec.setValue({ fieldId: 'department', value: deptId });
      if (classId) invRec.setValue({ fieldId: 'class', value: classId });

      const lineCount = invRec.getLineCount({ sublistId: 'item' });
      for (let i = 0; i < lineCount; i++) {
        if (deptId) invRec.setSublistValue({ sublistId: 'item', fieldId: 'department', line: i, value: deptId });
        if (classId) invRec.setSublistValue({ sublistId: 'item', fieldId: 'class', line: i, value: classId });
      }
    }

    function updateCabLog(idCabLog, params) {
      try {
        const cabLog = record.load({ type: RECORD_LOG_CAB, id: idCabLog });
        if (params.porcentaje) cabLog.setValue({ fieldId: 'custrecord_ts_porcentaje_mm', value: params.porcentaje });
        if (params.errores !== undefined) cabLog.setValue({ fieldId: 'custrecord_ts_error_mm', value: params.errores });
        if (params.estado) cabLog.setValue({ fieldId: 'custrecord_ts_estado_mm', value: params.estado });
        if (params.fechaFin) cabLog.setValue({ fieldId: 'custrecord_ts_fecha_fin_mm', value: new Date() });
        if (params.idFacturaDirecta) cabLog.setValue({ fieldId: 'custrecord_ts_fact_direct_mm', value: params.idFacturaDirecta });
        cabLog.save();
      } catch (e) {
        log.error('updateCabLog error', e);
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
        log.error('submitFields error', { type, id, error: e });
      }
    }

    function isConcurrentChangeError(error) {
      const msg = String((error && error.name) || '') + ' ' + String((error && error.message) || error || '');
      return msg.indexOf('RCRD_HAS_BEEN_CHANGED') !== -1 || msg.toLowerCase().indexOf('has been changed') !== -1;
    }

    function padLeft(str, len, ch) {
      str = String(str);
      while (str.length < len) str = ch + str;
      return str;
    }

    function pickSelectValue(v) {
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
