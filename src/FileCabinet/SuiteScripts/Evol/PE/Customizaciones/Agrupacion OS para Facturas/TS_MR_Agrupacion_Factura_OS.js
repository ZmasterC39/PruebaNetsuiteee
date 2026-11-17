/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/log', 'N/search', 'N/runtime', 'N/file', 'N/task'],
  (record, log, search, runtime, file, task) => {
    const LOG_RECORD = 'customrecord_ts_log_ejec_agrup_fact_pe';
    const QUEUE_RECORD = 'customrecord_ts_standar_ss_cola_pe';

    const PARAM_FILE = 'custscript_ts_mr_agrup_fac_file';
    const PARAM_LOG_ID = 'custscript_ts_mr_agrup_fac_logid';

    const SS_SCRIPT_ID = 'customscript_ts_ss_agrupacion_factura_pe';
    const SS_DEPLOYMENT_ID = 'customdeploy_ts_ss_agrupacion_factura_pe';
    const MR_SCRIPT_ID = 'customscript_ts_mr_agrupacion_factura_os';
    const MR_DEPLOYMENT_ID = 'customdeploy_ts_mr_agrupacion_factura_os';

    const COLA_PENDIENTE = 'pendiente';
    const COLA_PENDIENTE_MR = 'pendiente_mr';
    const COLA_PROCESANDO_MR = 'procesando_mr';
    const COLA_COMPLETADO = 'Completado';
    const COLA_ERROR = 'Error';

    const LOG_STATE_PENDING_POSTPROCESS = 'Pendiente postproceso';
    const LOG_STATE_PROCESSING_POSTPROCESS = 'Procesando postproceso';
    const LOG_STATE_FINALIZADO = 'Finalizado';

    const MAX_ERROR_FIELD_LENGTH = 3900;

    const getInputData = () => {
      const script = runtime.getCurrentScript();
      const fileId = script.getParameter({ name: PARAM_FILE });
      const logId = script.getParameter({ name: PARAM_LOG_ID });

      if (!fileId) {
        throw new Error('Falta parametro de archivo de entrada.');
      }

      const params = getPayloadFromFile(fileId);
      const idCabLog = logId || params.id_log;

      if (!idCabLog) {
        throw new Error('Falta el log de cabecera para el postproceso.');
      }

      if (params.queueId) {
        updateCola({
          id: params.queueId,
          estado: COLA_PROCESANDO_MR,
          errores: ''
        });
      }

      updateCabLog({
        idCabLog: idCabLog,
        porcentaje: '70%',
        estado: LOG_STATE_PROCESSING_POSTPROCESS,
        idFacturaDirecta: params.facturaDirectaid,
        errores: ''
      });

      const invoiceAssignments = buildInvoiceAssignments(params);
      return agruparTrabajosPorFacturaInterna(params.facturasSeleccionadas || [], invoiceAssignments);
    };

    const map = (context) => {
      const trabajo = JSON.parse(context.value);
      try {
        procesarFacturaInterna(trabajo);
      } catch (error) {
        log.error('map', { trabajo: trabajo, error: error });
        throw error;
      }
    };

    const procesarFacturaInterna = (trabajo) => {
      const facturaInterna = record.load({
        type: 'customsale_ec_factura_interna',
        id: trabajo.facturaInternaId,
        isDynamic: true
      });

      const facturarAActual = facturaInterna.getValue({ fieldId: 'custbody_ht_facturar_a' });
      if (String(facturarAActual || '') !== String(trabajo.facturarId || '')) {
        log.audit('procesarFacturaInterna', `Se omite FIN ${trabajo.facturaInternaId}: Facturar A no coincide.`);
        return;
      }

      facturaInterna.setValue({
        fieldId: 'custbody_ht_factura_directa',
        value: trabajo.invoiceId
      });

      const lineasSeleccionadas = new Set((trabajo.selectedLineKeys || []).map(String));
      const itemsSeleccionados = new Set((trabajo.selectedItems || []).map(String));
      const linkCount = facturaInterna.getLineCount({ sublistId: 'item' });
      let lineasMarcadas = 0;

      for (let line = 0; line < linkCount; line++) {
        const itemId = facturaInterna.getSublistValue({ sublistId: 'item', fieldId: 'item', line: line });
        const lineUniqueKey = facturaInterna.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: line });
        const debeMarcarLinea = lineasSeleccionadas.size
          ? lineasSeleccionadas.has(String(lineUniqueKey || ''))
          : itemsSeleccionados.has(String(itemId));

        if (!debeMarcarLinea) {
          continue;
        }

        facturaInterna.selectLine({ sublistId: 'item', line: line });
        facturaInterna.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'custcol_ht_fac_agru',
          value: trabajo.invoiceId
        });
        facturaInterna.commitLine({ sublistId: 'item' });
        lineasMarcadas++;
      }

      if (lineasSeleccionadas.size && !lineasMarcadas) {
        throw new Error(`No se encontro ninguna linea seleccionada para FIN ${trabajo.facturaInternaId}.`);
      }

      facturaInterna.save({ ignoreMandatoryFields: true });

      if (trabajo.creadoDesdeId) {
        try {
          record.submitFields({
            type: record.Type.SALES_ORDER,
            id: trabajo.creadoDesdeId,
            values: {
              custbody_ht_factura_directa: trabajo.invoiceId,
              custbody_estado_facturacion_os: 1
            }
          });
        } catch (error) {
          log.error('submitFields salesorder', {
            salesOrderId: trabajo.creadoDesdeId,
            invoiceId: trabajo.invoiceId,
            error: error
          });
        }
      }

      ensureFacturaAsociada(trabajo);

      if (trabajo.creadoDesdeId) {
        linkSalesOrderInvoice(trabajo.creadoDesdeId, trabajo.invoiceId);
      }
    };

    const buildInvoiceAssignments = (params) => {
      if (Array.isArray(params.invoiceAssignments) && params.invoiceAssignments.length) {
        return params.invoiceAssignments;
      }

      if (params.ssProgress && Array.isArray(params.ssProgress.invoiceAssignments) && params.ssProgress.invoiceAssignments.length) {
        return params.ssProgress.invoiceAssignments;
      }

      const facturaIds = Array.isArray(params.facturaDirectaid) ? params.facturaDirectaid : [];
      const grupos = Array.isArray(params.facturaDirecta) ? params.facturaDirecta : [];

      return grupos
        .map((grupo, index) => ({
          facturarId: String(grupo.facturar_a),
          invoiceId: facturaIds[index] ? String(facturaIds[index]) : ''
        }))
        .filter((entry) => entry.facturarId && entry.invoiceId);
    };

    const agruparTrabajosPorFacturaInterna = (facturasSeleccionadas, invoiceAssignments) => {
      const assignmentMap = {};
      invoiceAssignments.forEach((entry) => {
        assignmentMap[String(entry.facturarId)] = String(entry.invoiceId);
      });

      const grouped = {};

      facturasSeleccionadas.forEach((factura) => {
        const facturaInternaId = String(factura.id || '');
        const facturarId = String(factura.facturar_id || '');
        const invoiceId = assignmentMap[facturarId];

        if (!facturaInternaId || !invoiceId) {
          return;
        }

        if (!grouped[facturaInternaId]) {
          grouped[facturaInternaId] = {
            facturaInternaId: facturaInternaId,
            creadoDesdeId: factura.creado_desde || '',
            facturarId: facturarId,
            invoiceId: invoiceId,
            selectedItems: [],
            selectedLineKeys: []
          };
        }

        const itemId = String(factura.items || '');
        if (itemId && grouped[facturaInternaId].selectedItems.indexOf(itemId) === -1) {
          grouped[facturaInternaId].selectedItems.push(itemId);
        }
        const lineUniqueKey = String(factura.lineuniquekey || '');
        if (lineUniqueKey && grouped[facturaInternaId].selectedLineKeys.indexOf(lineUniqueKey) === -1) {
          grouped[facturaInternaId].selectedLineKeys.push(lineUniqueKey);
        }
      });

      return Object.keys(grouped).map((key) => grouped[key]);
    };

    const ensureFacturaAsociada = (trabajo) => {
      const existing = search.create({
        type: 'customrecord_ht_fact_internas_asociadas',
        filters: [
          ['custrecord_nro_factura', 'anyof', trabajo.invoiceId],
          'AND',
          ['custrecord_nro_factura_interna', 'anyof', trabajo.facturaInternaId]
        ],
        columns: [search.createColumn({ name: 'internalid' })]
      }).run().getRange({ start: 0, end: 1 });

      if (existing && existing.length) {
        return;
      }

      const nuevoRegistro = record.create({ type: 'customrecord_ht_fact_internas_asociadas', isDynamic: true });
      nuevoRegistro.setValue({ fieldId: 'custrecord_nro_factura', value: trabajo.invoiceId });
      nuevoRegistro.setValue({ fieldId: 'custrecord_nro_factura_interna', value: trabajo.facturaInternaId });
      if (trabajo.creadoDesdeId) {
        nuevoRegistro.setValue({ fieldId: 'custrecord_orden_servicio', value: trabajo.creadoDesdeId });
      }
      nuevoRegistro.save({ enableSourcing: false, ignoreMandatoryFields: false });
    };

    const linkSalesOrderInvoice = (salesOrderId, invoiceId) => {
      try {
        const existing = search.create({
          type: 'customrecord_ht_pe_os_inv',
          filters: [
            ['custrecord_ht_pe_os_inv', 'anyof', salesOrderId],
            'AND',
            ['custrecord_ht_pe_inv_os', 'anyof', invoiceId]
          ],
          columns: [search.createColumn({ name: 'internalid' })]
        }).run().getRange({ start: 0, end: 1 });

        if (existing && existing.length) {
          return;
        }

        const linkRecord = record.create({ type: 'customrecord_ht_pe_os_inv', isDynamic: true });
        linkRecord.setValue({ fieldId: 'custrecord_ht_pe_os_inv', value: salesOrderId });
        linkRecord.setValue({ fieldId: 'custrecord_ht_pe_inv_os', value: invoiceId });
        linkRecord.save();
      } catch (error) {
        log.error('linkSalesOrderInvoice', { salesOrderId: salesOrderId, invoiceId: invoiceId, error: error });
        throw error;
      }
    };

    const updateCabLog = (params) => {
      const values = {
        custrecord_ts_porcentaje_pe: params.porcentaje,
        custrecord_ts_error_pe: truncateText(params.errores || '')
      };

      if (params.estado) {
        values.custrecord_ts_estado_pe = params.estado;
      }
      if (params.fechaFin) {
        values.custrecord_ts_fecha_fin_pe = new Date();
      }
      if (Object.prototype.hasOwnProperty.call(params, 'idFacturaDirecta')) {
        values.custrecord_ts_fact_direct_pe = params.idFacturaDirecta || '';
      }

      record.submitFields({
        type: LOG_RECORD,
        id: params.idCabLog,
        values: values
      });
    };

    const updateCola = (params) => {
      const values = {};

      if (params.estado) {
        values.custrecord_ts_ss_estado_pe = params.estado;
      }
      if (params.fechaFin) {
        values.custrecord_ts_ss_fecha_fin_pe = new Date();
      }
      if (Object.prototype.hasOwnProperty.call(params, 'errores')) {
        values.custrecord_ts_ss_error_pe = truncateText(params.errores || '');
      }

      if (!Object.keys(values).length) {
        return;
      }

      record.submitFields({
        type: QUEUE_RECORD,
        id: params.id,
        values: values
      });
    };

    const getPayloadFromFile = (fileId) => {
      const fileObj = file.load({ id: fileId });
      return JSON.parse(fileObj.getContents() || '{}');
    };

    const getQueueContext = (fileId) => {
      try {
        const payload = getPayloadFromFile(fileId);
        return {
          queueId: payload.queueId ? String(payload.queueId) : '',
          payload: payload
        };
      } catch (error) {
        log.error('getQueueContext', error);
        return { queueId: '', payload: {} };
      }
    };

    const truncateText = (value, maxLength = MAX_ERROR_FIELD_LENGTH) => {
      const text = String(value == null ? '' : value).trim();
      if (!text || text.length <= maxLength) {
        return text;
      }
      return text.slice(0, maxLength);
    };

    const normalizeErrorText = (error) => {
      if (!error) {
        return 'Error desconocido';
      }

      if (typeof error === 'string') {
        return error.replace(/\s+/g, ' ').trim();
      }

      const name = error.name && error.name !== 'Error' ? `${error.name}: ` : '';
      const message = error.message || error.toString() || JSON.stringify(error);
      return `${name}${message}`.replace(/\s+/g, ' ').trim();
    };

    const buildErrorMessage = (errors) => {
      const counts = {};
      const orderedMessages = [];

      (errors || []).forEach((error) => {
        const normalized = truncateText(normalizeErrorText(error), MAX_ERROR_FIELD_LENGTH);
        if (!normalized) {
          return;
        }

        if (!Object.prototype.hasOwnProperty.call(counts, normalized)) {
          counts[normalized] = 0;
          orderedMessages.push(normalized);
        }
        counts[normalized] += 1;
      });

      const collapsed = orderedMessages.map((message) => (
        counts[message] > 1 ? `[x${counts[message]}] ${message}` : message
      ));

      return truncateText(collapsed.join(' | '), MAX_ERROR_FIELD_LENGTH) || 'Error desconocido';
    };

    const getQueuesByStates = (states) => {
      if (!states || !states.length) {
        return [];
      }

      const filters = [];
      states.forEach((state, index) => {
        if (index > 0) {
          filters.push('OR');
        }
        filters.push(['custrecord_ts_ss_estado_pe', 'is', state]);
      });

      const queueSearch = search.create({
        type: QUEUE_RECORD,
        filters: filters,
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'custrecord_ts_ss_estado_pe' }),
          search.createColumn({ name: 'custrecord_ts_ss_fecha_inicio_pe' }),
          search.createColumn({ name: 'custrecord_ts_ss_parametros_pe' })
        ]
      });

      const results = [];
      queueSearch.run().each((result) => {
        results.push({
          id: String(result.getValue({ name: 'internalid' }) || ''),
          estado: result.getValue({ name: 'custrecord_ts_ss_estado_pe' }) || '',
          fechaInicio: result.getValue({ name: 'custrecord_ts_ss_fecha_inicio_pe' }) || '',
          parametros: result.getValue({ name: 'custrecord_ts_ss_parametros_pe' }) || ''
        });
        return true;
      });

      results.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
      return results;
    };

    const hasPendingInvoiceQueue = () => getQueuesByStates([COLA_PENDIENTE]).length > 0;

    const getLogState = (logId) => {
      if (!logId) {
        return { estado: '', errores: '' };
      }

      try {
        const lookup = search.lookupFields({
          type: LOG_RECORD,
          id: logId,
          columns: ['custrecord_ts_estado_pe', 'custrecord_ts_error_pe']
        });

        return {
          estado: lookup.custrecord_ts_estado_pe || '',
          errores: lookup.custrecord_ts_error_pe || ''
        };
      } catch (error) {
        log.error('getLogState', { logId: logId, error: error });
        return { estado: '', errores: '' };
      }
    };

    const isLogReadyForPostProcess = (estado) => (
      estado === LOG_STATE_PENDING_POSTPROCESS || estado === LOG_STATE_PROCESSING_POSTPROCESS
    );

    const hasPostProcessCheckpoint = (payload) => {
      const grupos = Array.isArray(payload?.facturaDirecta) ? payload.facturaDirecta : [];
      const facturaIds = Array.isArray(payload?.facturaDirectaid)
        ? payload.facturaDirectaid
        : (Array.isArray(payload?.ssProgress?.invoiceIds) ? payload.ssProgress.invoiceIds : []);
      const invoiceAssignments = buildInvoiceAssignments(payload || {});

      return grupos.length > 0
        && facturaIds.length === grupos.length
        && invoiceAssignments.length === grupos.length;
    };

    const markQueueAsError = (queueItem, payload, errorMessage) => {
      updateCola({
        id: queueItem.id,
        estado: COLA_ERROR,
        fechaFin: true,
        errores: errorMessage
      });

      if (payload && payload.id_log) {
        updateCabLog({
          idCabLog: payload.id_log,
          porcentaje: '100%',
          estado: COLA_ERROR,
          fechaFin: true,
          idFacturaDirecta: payload.facturaDirectaid,
          errores: errorMessage
        });
      }
    };

    const reconcileQueueWithLogState = (queueItem, payload) => {
      const logId = payload && payload.id_log ? String(payload.id_log) : '';
      const logInfo = getLogState(logId);

      if (logInfo.estado === LOG_STATE_FINALIZADO) {
        updateCola({
          id: queueItem.id,
          estado: COLA_COMPLETADO,
          fechaFin: true,
          errores: ''
        });
        return null;
      }

      if (logInfo.estado === COLA_ERROR) {
        updateCola({
          id: queueItem.id,
          estado: COLA_ERROR,
          fechaFin: true,
          errores: logInfo.errores || 'La cola quedo con el log en estado Error.'
        });
        return null;
      }

      if (!isLogReadyForPostProcess(logInfo.estado)) {
        log.audit('reconcileQueueWithLogState', {
          queueId: queueItem.id,
          logId: logId,
          logState: logInfo.estado || '(vacio)'
        });
        return null;
      }

      if (!hasPostProcessCheckpoint(payload)) {
        const errorMessage = 'La cola no cuenta con checkpoint completo para el postproceso.';
        markQueueAsError(queueItem, payload, errorMessage);
        return null;
      }

      return {
        queueItem: queueItem,
        payload: payload,
        logId: logId
      };
    };

    const findNextPendingMrQueue = (excludeQueueId) => {
      const pendingQueues = getQueuesByStates([COLA_PENDIENTE_MR]);

      for (let index = 0; index < pendingQueues.length; index++) {
        const queueItem = pendingQueues[index];
        if (!queueItem.id || String(queueItem.id) === String(excludeQueueId || '')) {
          continue;
        }
        if (!queueItem.parametros) {
          log.error('findNextPendingMrQueue', `La cola ${queueItem.id} no tiene archivo de parametros.`);
          continue;
        }

        try {
          const payload = getPayloadFromFile(queueItem.parametros);
          const resolvedQueue = reconcileQueueWithLogState(queueItem, payload);
          if (resolvedQueue) {
            return resolvedQueue;
          }
        } catch (error) {
          log.error('findNextPendingMrQueue', { queueId: queueItem.id, error: error });
        }
      }

      return null;
    };

    const submitScheduledDispatcher = () => {
      const scriptTask = task.create({
        taskType: task.TaskType.SCHEDULED_SCRIPT,
        scriptId: SS_SCRIPT_ID,
        deploymentId: SS_DEPLOYMENT_ID
      });

      scriptTask.submit();
    };

    const submitPostProcessTask = (fileId, logId) => {
      const mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: MR_SCRIPT_ID,
        deploymentId: MR_DEPLOYMENT_ID,
        params: {
          [PARAM_FILE]: String(fileId),
          [PARAM_LOG_ID]: String(logId || '')
        }
      });

      return mrTask.submit();
    };

    const isMrAlreadyRunningError = (error) => {
      const message = `${error?.name || ''} ${error?.message || ''}`.toUpperCase();
      return message.indexOf('MAP_REDUCE_ALREADY_RUNNING') !== -1
        || message.indexOf('ALREADY RUNNING') !== -1;
    };

    const dispatchNextPendingMrQueue = (excludeQueueId) => {
      const nextQueue = findNextPendingMrQueue(excludeQueueId);
      if (!nextQueue) {
        return { submitted: false, requiresDispatcherFallback: false };
      }

      try {
        const taskId = submitPostProcessTask(nextQueue.queueItem.parametros, nextQueue.logId);
        updateCola({
          id: nextQueue.queueItem.id,
          estado: COLA_PROCESANDO_MR,
          errores: ''
        });

        if (nextQueue.logId) {
          updateCabLog({
            idCabLog: nextQueue.logId,
            porcentaje: '70%',
            estado: LOG_STATE_PROCESSING_POSTPROCESS,
            idFacturaDirecta: nextQueue.payload.facturaDirectaid,
            errores: ''
          });
        }

        log.audit('dispatchNextPendingMrQueue', {
          queueId: nextQueue.queueItem.id,
          logId: nextQueue.logId,
          taskId: taskId
        });

        return { submitted: true, requiresDispatcherFallback: false };
      } catch (error) {
        log.error('dispatchNextPendingMrQueue', {
          queueId: nextQueue.queueItem.id,
          logId: nextQueue.logId,
          error: error
        });

        return {
          submitted: false,
          requiresDispatcherFallback: isMrAlreadyRunningError(error)
        };
      }
    };

    const summarize = (summary) => {
      const script = runtime.getCurrentScript();
      const fileId = script.getParameter({ name: PARAM_FILE });
      const queueContext = getQueueContext(fileId);
      const logId = script.getParameter({ name: PARAM_LOG_ID }) || queueContext.payload.id_log;

      let hasErrors = false;
      const errores = [];

      if (summary.inputSummary.error) {
        hasErrors = true;
        errores.push(summary.inputSummary.error);
        log.error('inputSummary', summary.inputSummary.error);
      }

      summary.mapSummary.errors.iterator().each((key, error) => {
        hasErrors = true;
        errores.push(error);
        log.error('mapSummary', { key: key, error: error });
        return true;
      });

      const errorMessage = hasErrors ? buildErrorMessage(errores) : 'OK';

      if (logId) {
        updateCabLog({
          idCabLog: logId,
          porcentaje: '100%',
          estado: hasErrors ? COLA_ERROR : LOG_STATE_FINALIZADO,
          fechaFin: true,
          idFacturaDirecta: queueContext.payload.facturaDirectaid,
          errores: errorMessage
        });
      }

      if (queueContext.queueId) {
        updateCola({
          id: queueContext.queueId,
          estado: hasErrors ? COLA_ERROR : COLA_COMPLETADO,
          fechaFin: true,
          errores: hasErrors ? errorMessage : ''
        });
      }

      try {
        const nextMrResult = dispatchNextPendingMrQueue(queueContext.queueId);
        if (!nextMrResult.submitted && (nextMrResult.requiresDispatcherFallback || hasPendingInvoiceQueue())) {
          submitScheduledDispatcher();
        }
      } catch (error) {
        log.error('summarize dispatchPendingWork', error);
      }

      log.audit('MR End', JSON.stringify({
        seconds: summary.seconds,
        usage: summary.usage,
        yields: summary.yields,
        hasErrors: hasErrors
      }));
    };

    return { getInputData, map, summarize };
  });
