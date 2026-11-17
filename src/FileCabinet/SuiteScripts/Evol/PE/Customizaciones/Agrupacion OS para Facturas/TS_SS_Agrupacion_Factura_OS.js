/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/search', 'N/runtime', 'N/task', 'N/file'],

    (record, log, search, runtime, task, file) => {
        const FORM_PE_FORMULARIO_FACTURA_VENTA = 183;
        const QUEUE_RECORD = 'customrecord_ts_standar_ss_cola_pe';
        const LOG_RECORD = 'customrecord_ts_log_ejec_agrup_fact_pe';
        const INPUT_FOLDER = 18054;
        const PENDIENTE = 3;

        const COLA_PENDIENTE = 'pendiente';
        const COLA_PROCESANDO_SS = 'procesando_ss';
        const COLA_PENDIENTE_MR = 'pendiente_mr';
        const COLA_PROCESANDO_MR = 'procesando_mr';
        const COLA_COMPLETADO = 'Completado';
        const COLA_ERROR = 'Error';

        const LOG_STATE_PROCESANDO = 'Procesando';
        const LOG_STATE_PENDING_POSTPROCESS = 'Pendiente postproceso';
        const LOG_STATE_PROCESSING_POSTPROCESS = 'Procesando postproceso';
        const LOG_STATE_FINALIZADO = 'Finalizado';

        const MR_SCRIPT_ID = 'customscript_ts_mr_agrupacion_factura_os';
        const MR_DEPLOYMENT_ID = 'customdeploy_ts_mr_agrupacion_factura_os';
        const MR_PARAM_FILE = 'custscript_ts_mr_agrup_fac_file';
        const MR_PARAM_LOG_ID = 'custscript_ts_mr_agrup_fac_logid';

        const SS_USAGE_REQUEUE_THRESHOLD = 700;
        const STALE_SS_ERROR_MESSAGE = 'La cola quedo en procesando_ss sin checkpoint completo. Revision manual requerida.';
        const MAX_ERROR_FIELD_LENGTH = 3900;

        const execute = () => {
            try {
                reconcileQueues();
            } catch (error) {
                log.error('reconcileQueues', error);
            }

            processNextPendingQueue();

            try {
                dispatchPendingMrQueue();
            } catch (error) {
                log.error('dispatchPendingMrQueue', error);
            }

            try {
                if (hasPendingQueue()) {
                    submitNextScheduledRun();
                }
            } catch (error) {
                log.error('submitNextScheduledRun', error);
            }
        };

        const reconcileQueues = () => {
            reconcileProcessingSsQueues();
            reconcileProcessingMrQueues();
        };

        const reconcileProcessingSsQueues = () => {
            const processingQueues = getColasByStates([COLA_PROCESANDO_SS]);

            processingQueues.forEach((colaItem) => {
                try {
                    const payloadInfo = getQueuePayload(colaItem.parametros);
                    ensureQueuePayloadMetadata(colaItem, payloadInfo);
                    normalizeSsProgress(payloadInfo.payload);

                    if (hasCheckpoint(payloadInfo.payload)) {
                        moveQueueToPendingMr(colaItem, payloadInfo.payload);
                        return;
                    }

                    if (isRecoverableSsPayload(payloadInfo.payload)) {
                        updateCola({
                            id: colaItem.id,
                            estado: COLA_PENDIENTE,
                            errores: ''
                        });
                        log.audit('reconcileProcessingSsQueues', {
                            queueId: colaItem.id,
                            estado: COLA_PENDIENTE,
                            nextGroupIndex: payloadInfo.payload.ssProgress.nextGroupIndex
                        });
                        return;
                    }

                    throw new Error(STALE_SS_ERROR_MESSAGE);
                } catch (error) {
                    handleQueueError(colaItem, error);
                }
            });
        };

        const reconcileProcessingMrQueues = () => {
            const processingQueues = getColasByStates([COLA_PROCESANDO_MR]);
            if (!processingQueues.length) {
                return;
            }

            const mrBusy = isMrDeploymentBusy();

            processingQueues.slice(1).forEach((colaItem) => {
                try {
                    moveQueueToPendingMr(colaItem);
                } catch (error) {
                    handleQueueError(colaItem, error);
                }
            });

            if (!mrBusy) {
                try {
                    moveQueueToPendingMr(processingQueues[0]);
                } catch (error) {
                    handleQueueError(processingQueues[0], error);
                }
            }
        };

        const processNextPendingQueue = () => {
            const cola = getColasByStates([COLA_PENDIENTE]);
            if (!cola.length) {
                return null;
            }

            const colaItem = cola[0];
            updateCola({ id: colaItem.id, estado: COLA_PROCESANDO_SS, errores: '' });
            log.audit('processNextPendingQueue', { queueId: colaItem.id, estado: COLA_PROCESANDO_SS });

            try {
                const payloadInfo = getQueuePayload(colaItem.parametros);
                ensureQueuePayloadMetadata(colaItem, payloadInfo);

                const parametros = payloadInfo.payload;
                const idCabLog = parametros.id_log;

                if (!idCabLog) {
                    throw new Error('No se encontro el id_log asociado a la cola.');
                }

                if (!parametros.facturaDirecta || !parametros.facturaDirecta.length) {
                    throw new Error('No hay grupos de factura directa para procesar.');
                }

                updateCabLog({
                    idCabLog: idCabLog,
                    porcentaje: '10%',
                    estado: LOG_STATE_PROCESANDO,
                    errores: ''
                });

                const resultado = generarFacturasDirectasRapido(parametros, idCabLog, colaItem, payloadInfo);

                if (!resultado.completed) {
                    updateCola({
                        id: colaItem.id,
                        estado: COLA_PENDIENTE,
                        parametros: resultado.fileId,
                        errores: ''
                    });

                    log.audit('processNextPendingQueue requeue', {
                        queueId: colaItem.id,
                        nextGroupIndex: resultado.nextGroupIndex,
                        invoiceCount: resultado.invoiceIds.length
                    });
                    return colaItem.id;
                }

                updateCola({
                    id: colaItem.id,
                    estado: COLA_PENDIENTE_MR,
                    parametros: resultado.fileId,
                    errores: ''
                });

                try {
                    updateCabLog({
                        idCabLog: idCabLog,
                        porcentaje: '70%',
                        estado: LOG_STATE_PENDING_POSTPROCESS,
                        idFacturaDirecta: resultado.invoiceIds,
                        errores: ''
                    });
                } catch (logError) {
                    log.error('processNextPendingQueue updateCabLog', logError);
                }

                log.audit('processNextPendingQueue completed', {
                    queueId: colaItem.id,
                    invoiceCount: resultado.invoiceIds.length
                });

                return colaItem.id;
            } catch (error) {
                handleQueueError(colaItem, error);
                return null;
            }
        };

        const dispatchPendingMrQueue = () => {
            const queueContext = getNextPendingMrQueue();
            if (!queueContext) {
                return false;
            }

            if (isMrDeploymentBusy()) {
                log.audit('dispatchPendingMrQueue', 'El deployment del MR sigue ocupado. La cola queda pendiente_mr.');
                return false;
            }

            const colaItem = queueContext.colaItem;

            try {
                submitPostProcessTask(colaItem.parametros, queueContext.logId);

                updateCola({
                    id: colaItem.id,
                    estado: COLA_PROCESANDO_MR,
                    errores: ''
                });

                return true;
            } catch (error) {
                if (isMrAlreadyRunningError(error)) {
                    log.audit('dispatchPendingMrQueue', `MR ocupado para la cola ${colaItem.id}, se omite submit.`);
                    return false;
                }

                handleQueueError(colaItem, error);
                return false;
            }
        };

        const moveQueueToPendingMr = (colaItem, payload = null) => {
            let payloadToUse = payload;

            if (!payloadToUse) {
                const payloadInfo = getQueuePayload(colaItem.parametros);
                ensureQueuePayloadMetadata(colaItem, payloadInfo);
                payloadToUse = payloadInfo.payload;
            }

            if (!hasCheckpoint(payloadToUse)) {
                throw new Error('No existe checkpoint completo para regresar la cola a pendiente_mr.');
            }

            updateCola({
                id: colaItem.id,
                estado: COLA_PENDIENTE_MR,
                errores: ''
            });

            if (payloadToUse.id_log) {
                try {
                    updateCabLog({
                        idCabLog: payloadToUse.id_log,
                        porcentaje: '70%',
                        estado: LOG_STATE_PENDING_POSTPROCESS,
                        idFacturaDirecta: payloadToUse.facturaDirectaid,
                        errores: ''
                    });
                } catch (logError) {
                    log.error('moveQueueToPendingMr updateCabLog', logError);
                }
            }
        };

        const generarFacturasDirectasRapido = (params, idCabLog, colaItem, payloadInfo) => {
            const progress = normalizeSsProgress(params);
            const invoiceIds = progress.invoiceIds.slice();
            const invoiceAssignments = progress.invoiceAssignments.slice();
            const salesRepCache = {};
            let lastFileId = colaItem.parametros;
            params.percentage_detraction = params.percentage_detraction || getDetractionPercentage(params.concept_detraction);

            for (let j = progress.nextGroupIndex; j < params.facturaDirecta.length; j++) {
                const grupoFactura = params.facturaDirecta[j];
                const facturaDirecta = record.create({ type: record.Type.INVOICE, isDynamic: true });

                facturaDirecta.setValue({ fieldId: 'customform', value: FORM_PE_FORMULARIO_FACTURA_VENTA });
                facturaDirecta.setValue({ fieldId: 'entity', value: grupoFactura.facturar_a });

                const headerDept = grupoFactura.items?.[0]?.departamento || null;
                const headerClass = grupoFactura.items?.[0]?.clase || null;

                if (params.agrupador) { facturaDirecta.setValue({ fieldId: 'custbody_ht_cod_agru', value: params.agrupador }); }
                facturaDirecta.setValue({ fieldId: 'trandate', value: new Date() });
                facturaDirecta.setValue({ fieldId: 'memo', value: params.glosa });
                if (headerDept) { facturaDirecta.setValue({ fieldId: 'department', value: headerDept }); }
                if (headerClass) { facturaDirecta.setValue({ fieldId: 'class', value: headerClass }); }
                facturaDirecta.setValue({ fieldId: 'location', value: params.ubicacion });
                facturaDirecta.setValue({ fieldId: 'approvalstatus', value: 2 });
                facturaDirecta.setValue({ fieldId: 'currency', value: params.currency });

                facturaDirecta.setValue({ fieldId: 'custbody_pe_document_type', value: params.tipo_doc });
                facturaDirecta.setValue({ fieldId: 'terms', value: params.terminoPago });
                facturaDirecta.setValue({ fieldId: 'custbodyec_nota_cliente', value: params.notaFactura });
                facturaDirecta.setValue({ fieldId: 'custbody_ht_status_process_group', value: PENDIENTE });

                applyPeFiscalFields(facturaDirecta, params);
                applySalesRepFromSourceSalesOrders(facturaDirecta, grupoFactura, params, salesRepCache);

                if (params.gratutita != 'F') {
                    facturaDirecta.setValue({ fieldId: 'custbody_pe_free_operation', value: true });
                    facturaDirecta.setValue({ fieldId: 'discountitem', value: 47451 });
                }

                let witaxCode = null;
                if (params.concept_detraction != 1) {
                    const currencyname = facturaDirecta.getText({ fieldId: 'currency' });
                    witaxCode = getWitaxCode(params.concept_detraction, currencyname);
                }

                for (let i = 0; i < grupoFactura.items.length; i++) {
                    const itemLinea = grupoFactura.items[i];
                    const itemId = itemLinea.item_f || itemLinea.id;
                    const lineDept = itemLinea.departamento || headerDept;
                    const lineClass = itemLinea.clase || headerClass;
                    const lineLoc = itemLinea.oficina || params.ubicacion;

                    facturaDirecta.selectNewLine({ sublistId: 'item' });
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'units', value: itemLinea.unidad });
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: itemLinea.cantidad });
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: itemLinea.price });

                    if (itemLinea.price == '-1') {
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: itemLinea.rate });
                    }

                    if (lineDept) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', value: lineDept }); }
                    if (lineClass) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: lineClass }); }
                    if (lineLoc) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: lineLoc }); }

                    if (params.concept_detraction != 1 && witaxCode) {
                        let totalLine = facturaDirecta.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' });
                        totalLine = (parseFloat(totalLine) + parseFloat(totalLine * 0.18)).toFixed(2);
                        const porcentaje = (witaxCode.percentageDetraction || '0').replace('%', '') / 100;
                        const totalRetenciones = parseFloat(totalLine) * porcentaje;

                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxapplies', value: true });
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: witaxCode.taxCodes });
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxbaseamount', value: parseFloat(totalLine) * -1 });
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxamount', value: totalRetenciones.toFixed(2) });
                    }

                    facturaDirecta.commitLine({ sublistId: 'item' });
                }

                applyPeFiscalFields(facturaDirecta, params);
                const facturaDirectaId = facturaDirecta.save();
                invoiceIds.push(facturaDirectaId);
                invoiceAssignments.push({
                    groupIndex: j,
                    facturarId: String(grupoFactura.facturar_a),
                    invoiceId: String(facturaDirectaId)
                });

                progress.nextGroupIndex = j + 1;
                progress.invoiceIds = invoiceIds.slice();
                progress.invoiceAssignments = invoiceAssignments.slice();
                params.ssProgress = progress;
                params.facturaDirectaid = progress.invoiceIds;
                params.invoiceAssignments = progress.invoiceAssignments;

                lastFileId = saveJson(
                    params,
                    getPayloadFileName(payloadInfo.fileObj, colaItem.id),
                    INPUT_FOLDER
                );
                updateCola({ id: colaItem.id, parametros: lastFileId });
                colaItem.parametros = lastFileId;

                const porcentaje = Math.max(10, Math.min(55, Math.round(((j + 1) / params.facturaDirecta.length) * 55)));
                updateCabLog({
                    idCabLog: idCabLog,
                    porcentaje: `${porcentaje}%`,
                    estado: LOG_STATE_PROCESANDO,
                    idFacturaDirecta: invoiceIds,
                    errores: ''
                });

                if (runtime.getCurrentScript().getRemainingUsage() < SS_USAGE_REQUEUE_THRESHOLD && j + 1 < params.facturaDirecta.length) {
                    return {
                        completed: false,
                        fileId: lastFileId,
                        invoiceIds: invoiceIds,
                        invoiceAssignments: invoiceAssignments,
                        nextGroupIndex: progress.nextGroupIndex
                    };
                }
            }

            return {
                completed: true,
                fileId: lastFileId,
                invoiceIds: invoiceIds,
                invoiceAssignments: invoiceAssignments,
                nextGroupIndex: progress.nextGroupIndex
            };
        };

        const applyPeFiscalFields = (invoiceRecord, params) => {
            setValueIfPresent(invoiceRecord, 'custbody_pe_document_type', params.tipo_doc);
            setValueIfPresent(invoiceRecord, 'custbody_pe_ei_forma_pago', params.forma_pago);
            setValueIfPresent(invoiceRecord, 'custbody_pe_concept_detraction', params.concept_detraction);
            setValueIfPresent(invoiceRecord, 'custbody_pe_ei_operation_type', params.tipo_operacion);
            setPercentValueIfPresent(invoiceRecord, 'custbody_pe_percentage_detraccion', params.percentage_detraction);
            setValueIfPresent(invoiceRecord, 'custbody_pe_serie', params.serie);
        };

        const applySalesRepFromSourceSalesOrders = (invoiceRecord, grupoFactura, params, salesRepCache) => {
            const salesRepId = resolveGroupSalesRep(grupoFactura, params.facturasSeleccionadas, salesRepCache);
            if (!salesRepId) {
                return;
            }

            setValueIfPresent(invoiceRecord, 'salesrep', salesRepId);
        };

        const resolveGroupSalesRep = (grupoFactura, facturasSeleccionadas, salesRepCache) => {
            const salesOrderId = getFirstGroupSourceSalesOrderId(grupoFactura, facturasSeleccionadas);
            if (!salesOrderId) {
                return null;
            }

            return getSalesOrderSalesRep(salesOrderId, salesRepCache);
        };

        const getFirstGroupSourceSalesOrderId = (grupoFactura, facturasSeleccionadas) => {
            const facturarId = String(grupoFactura?.facturar_a || '');

            for (let i = 0; i < (facturasSeleccionadas || []).length; i++) {
                const factura = facturasSeleccionadas[i];
                if (String(factura?.facturar_id || '') !== facturarId) {
                    continue;
                }

                const salesOrderId = String(factura?.creado_desde || '');
                if (salesOrderId) {
                    return salesOrderId;
                }
            }

            return null;
        };

        const getSalesOrderSalesRep = (salesOrderId, salesRepCache) => {
            const cacheKey = String(salesOrderId || '');
            if (!cacheKey) {
                return null;
            }

            if (Object.prototype.hasOwnProperty.call(salesRepCache, cacheKey)) {
                return salesRepCache[cacheKey];
            }

            try {
                const lookupResult = search.lookupFields({
                    type: search.Type.SALES_ORDER,
                    id: cacheKey,
                    columns: ['salesrep']
                });

                const salesRepField = lookupResult?.salesrep;
                const salesRepId = Array.isArray(salesRepField) && salesRepField.length
                    ? String(salesRepField[0].value || '')
                    : '';

                salesRepCache[cacheKey] = salesRepId || null;
                return salesRepCache[cacheKey];
            } catch (error) {
                log.error('getSalesOrderSalesRep', { salesOrderId: cacheKey, error: error });
                salesRepCache[cacheKey] = null;
                return null;
            }
        };

        const setValueIfPresent = (recordObj, fieldId, value) => {
            if (value === null || value === undefined || value === '') {
                return;
            }

            recordObj.setValue({
                fieldId: fieldId,
                value: value,
                ignoreFieldChange: true
            });
        };

        const setPercentValueIfPresent = (recordObj, fieldId, value) => {
            if (value === null || value === undefined || value === '') {
                return;
            }

            const percentValue = parseFloat(String(value).replace('%', ''));
            if (isNaN(percentValue)) {
                return;
            }

            recordObj.setValue({
                fieldId: fieldId,
                value: percentValue,
                ignoreFieldChange: true
            });
        };

        const submitPostProcessTask = (fileId, logId) => {
            const mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: MR_SCRIPT_ID,
                deploymentId: MR_DEPLOYMENT_ID,
                params: {
                    [MR_PARAM_FILE]: String(fileId),
                    [MR_PARAM_LOG_ID]: String(logId || '')
                }
            });

            const taskId = mrTask.submit();
            log.audit('submitPostProcessTask', `MR lanzado: ${taskId}`);
            return taskId;
        };

        const submitNextScheduledRun = () => {
            const currentScript = runtime.getCurrentScript();
            const scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: currentScript.id,
                deploymentId: currentScript.deploymentId
            });

            scriptTask.submit();
        };

        const isMrDeploymentBusy = () => {
            const instanceSearch = search.create({
                type: 'scheduledscriptinstance',
                filters: [
                    ['scriptdeployment.scriptid', 'is', MR_DEPLOYMENT_ID],
                    'AND',
                    ['enddate', 'isempty', '']
                ],
                columns: [
                    search.createColumn({ name: 'datecreated', sort: search.Sort.DESC }),
                    search.createColumn({ name: 'status' }),
                    search.createColumn({ name: 'startdate' }),
                    search.createColumn({ name: 'enddate' })
                ]
            });

            const results = instanceSearch.run().getRange({ start: 0, end: 1 });
            return !!(results && results.length);
        };

        const hasPendingQueue = () => getColasByStates([COLA_PENDIENTE]).length > 0;

        const truncateText = (value, maxLength = MAX_ERROR_FIELD_LENGTH) => {
            const text = String(value == null ? '' : value).trim();
            if (!text || text.length <= maxLength) {
                return text;
            }
            return text.slice(0, maxLength);
        };

        const normalizeErrorText = (error) => {
            if (!error) return 'Error desconocido';
            if (typeof error === 'string') {
                return error.replace(/\s+/g, ' ').trim();
            }

            const name = error.name && error.name !== 'Error' ? `${error.name}: ` : '';
            const message = error.message || error.toString();
            return `${name}${message}`.replace(/\s+/g, ' ').trim();
        };

        const getQueuePayload = (fileId) => {
            if (!fileId) {
                throw new Error('La cola no tiene archivo de parametros asociado.');
            }

            const fileObj = file.load({ id: fileId });
            const payload = JSON.parse(fileObj.getContents() || '{}');
            return { fileObj: fileObj, payload: payload };
        };

        const ensureQueuePayloadMetadata = (colaItem, payloadInfo) => {
            const payload = payloadInfo.payload || {};
            if (String(payload.queueId || '') === String(colaItem.id)) {
                return false;
            }

            payload.queueId = String(colaItem.id);

            const fileId = saveJson(
                payload,
                getPayloadFileName(payloadInfo.fileObj, colaItem.id),
                INPUT_FOLDER
            );

            updateCola({
                id: colaItem.id,
                parametros: fileId
            });

            colaItem.parametros = fileId;
            payloadInfo.payload = payload;
            return true;
        };

        const normalizeSsProgress = (payload) => {
            const grupos = Array.isArray(payload?.facturaDirecta) ? payload.facturaDirecta : [];
            const existingProgress = payload.ssProgress || {};
            const invoiceIds = Array.isArray(existingProgress.invoiceIds)
                ? existingProgress.invoiceIds.slice()
                : (Array.isArray(payload.facturaDirectaid) ? payload.facturaDirectaid.slice() : []);
            const invoiceAssignments = Array.isArray(existingProgress.invoiceAssignments)
                ? existingProgress.invoiceAssignments.slice()
                : (Array.isArray(payload.invoiceAssignments) ? payload.invoiceAssignments.slice() : []);

            let nextGroupIndex = parseInt(existingProgress.nextGroupIndex, 10);
            if (isNaN(nextGroupIndex)) {
                nextGroupIndex = Math.max(invoiceIds.length, invoiceAssignments.length);
            }
            nextGroupIndex = Math.max(0, Math.min(nextGroupIndex, grupos.length));

            payload.ssProgress = {
                nextGroupIndex: nextGroupIndex,
                invoiceIds: invoiceIds,
                invoiceAssignments: invoiceAssignments
            };
            payload.facturaDirectaid = invoiceIds;
            payload.invoiceAssignments = invoiceAssignments;

            return payload.ssProgress;
        };

        const isRecoverableSsPayload = (payload) => {
            const grupos = Array.isArray(payload?.facturaDirecta) ? payload.facturaDirecta : [];
            return grupos.length > 0 && !!payload?.id_log;
        };

        const hasCheckpoint = (payload) => {
            const grupos = Array.isArray(payload?.facturaDirecta) ? payload.facturaDirecta : [];
            const progress = normalizeSsProgress(payload || {});
            return grupos.length > 0
                && progress.nextGroupIndex >= grupos.length
                && progress.invoiceIds.length === grupos.length
                && progress.invoiceAssignments.length === grupos.length;
        };

        const getPayloadFileName = (fileObj, fallbackId) => {
            if (fileObj && fileObj.name) {
                return fileObj.name;
            }
            return `cola_${fallbackId}.json`;
        };

        const safeGetLogId = (fileId) => {
            try {
                if (!fileId) return null;
                const payloadInfo = getQueuePayload(fileId);
                return payloadInfo.payload.id_log || null;
            } catch (error) {
                log.error('safeGetLogId', error);
                return null;
            }
        };

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

        const getNextPendingMrQueue = () => {
            const pendingQueues = getColasByStates([COLA_PENDIENTE_MR]);

            for (let index = 0; index < pendingQueues.length; index++) {
                const colaItem = pendingQueues[index];

                try {
                    const payloadInfo = getQueuePayload(colaItem.parametros);
                    ensureQueuePayloadMetadata(colaItem, payloadInfo);

                    if (!hasCheckpoint(payloadInfo.payload)) {
                        throw new Error('La cola no cuenta con checkpoint completo para el postproceso.');
                    }

                    const logId = payloadInfo.payload.id_log;
                    if (!logId) {
                        throw new Error('La cola no tiene id_log asociado para el postproceso.');
                    }

                    const logInfo = getLogState(logId);
                    if (logInfo.estado === LOG_STATE_FINALIZADO) {
                        updateCola({
                            id: colaItem.id,
                            estado: COLA_COMPLETADO,
                            fechaFin: true,
                            errores: ''
                        });
                        continue;
                    }

                    if (logInfo.estado === COLA_ERROR) {
                        updateCola({
                            id: colaItem.id,
                            estado: COLA_ERROR,
                            fechaFin: true,
                            errores: logInfo.errores || 'La cola quedo con el log en estado Error.'
                        });
                        continue;
                    }

                    if (!isLogReadyForPostProcess(logInfo.estado)) {
                        log.audit('getNextPendingMrQueue', {
                            queueId: colaItem.id,
                            logId: logId,
                            logState: logInfo.estado || '(vacio)'
                        });
                        continue;
                    }

                    return {
                        colaItem: colaItem,
                        payloadInfo: payloadInfo,
                        logId: logId
                    };
                } catch (error) {
                    handleQueueError(colaItem, error);
                }
            }

            return null;
        };

        const getWitaxCode = (conceptDetraction, currencyName) => {
            try {
                const objSearch = search.create({
                    type: 'customrecord_pe_concept_detraction',
                    filters: [['internalid', 'anyof', conceptDetraction]],
                    columns: [
                        search.createColumn({ name: 'name' }),
                        search.createColumn({ name: 'custrecord_pe_code_detraccion' }),
                        search.createColumn({ name: 'custrecord_pe_percentage_detraction' }),
                        search.createColumn({ name: 'custrecord_pe_tax_codes_pen' }),
                        search.createColumn({ name: 'custrecord_pe_tax_codes_dol' })
                    ]
                });

                const searchResult = objSearch.run().getRange({ start: 0, end: 1 });
                if (!searchResult || !searchResult.length) {
                    return null;
                }

                const taxCode = currencyName == 'Soles'
                    ? searchResult[0].getValue(objSearch.columns[3])
                    : searchResult[0].getValue(objSearch.columns[4]);

                return {
                    taxCodes: taxCode,
                    percentageDetraction: searchResult[0].getValue(objSearch.columns[2])
                };
            } catch (error) {
                log.error('getWitaxCode', error);
                return null;
            }
        };

        const getDetractionPercentage = (conceptDetraction) => {
            try {
                if (!conceptDetraction) {
                    return '0.0%';
                }

                const result = search.lookupFields({
                    type: 'customrecord_pe_concept_detraction',
                    id: conceptDetraction,
                    columns: ['custrecord_pe_percentage_detraction']
                });

                return result.custrecord_pe_percentage_detraction || '0.0%';
            } catch (error) {
                log.error('getDetractionPercentage', error);
                return '0.0%';
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

        const getColasByStates = (states) => {
            if (!states || !states.length) {
                return [];
            }

            const respuesta = [];
            const colaSearch = search.create({
                type: QUEUE_RECORD,
                filters: buildStateFilters(states),
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'custrecord_ts_ss_estado_pe' }),
                    search.createColumn({ name: 'custrecord_ts_ss_fecha_inicio_pe' }),
                    search.createColumn({ name: 'custrecord_ts_ss_parametros_pe' })
                ]
            });

            colaSearch.run().each((result) => {
                respuesta.push({
                    id: result.getValue({ name: 'internalid' }),
                    estado: result.getValue({ name: 'custrecord_ts_ss_estado_pe' }),
                    fechaInicio: result.getValue({ name: 'custrecord_ts_ss_fecha_inicio_pe' }),
                    parametros: result.getValue({ name: 'custrecord_ts_ss_parametros_pe' })
                });
                return true;
            });

            respuesta.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
            return respuesta;
        };

        const buildStateFilters = (states) => {
            const filters = [];
            states.forEach((state, index) => {
                if (index > 0) {
                    filters.push('OR');
                }
                filters.push(['custrecord_ts_ss_estado_pe', 'is', state]);
            });
            return filters;
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
            if (params.parametros) {
                values.custrecord_ts_ss_parametros_pe = params.parametros;
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

        const handleQueueError = (colaItem, error) => {
            const errorMsg = truncateText(getErrorMessage(error));
            log.error('handleQueueError', { queueId: colaItem.id, error: errorMsg });

            try {
                const idCabLog = safeGetLogId(colaItem.parametros);
                if (idCabLog) {
                    updateCabLog({
                        idCabLog: idCabLog,
                        porcentaje: '100%',
                        estado: COLA_ERROR,
                        fechaFin: true,
                        errores: errorMsg
                    });
                }
            } catch (innerError) {
                log.error('handleQueueError updateCabLog', innerError);
            }

            try {
                updateCola({
                    id: colaItem.id,
                    estado: COLA_ERROR,
                    fechaFin: true,
                    errores: errorMsg
                });
            } catch (innerError) {
                log.error('handleQueueError updateCola', innerError);
            }
        };

        const saveJson = (contents, nombre, folder) => {
            const fileObj = file.create({
                name: nombre,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: folder,
                isOnline: false
            });

            return fileObj.save();
        };

        const isMrAlreadyRunningError = (error) => {
            const message = `${error?.name || ''} ${error?.message || ''}`.toUpperCase();
            return message.indexOf('MAP_REDUCE_ALREADY_RUNNING') !== -1
                || message.indexOf('ALREADY RUNNING') !== -1;
        };

        const getErrorMessage = (error) => {
            return normalizeErrorText(error);
        };

        return { execute };

    });
