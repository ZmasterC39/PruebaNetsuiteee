/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/runtime', 'N/log'], function (record, runtime, log) {

    // =========================================================
    // CONFIGURACION GENERAL - TODO SE CONTROLA DESDE AQUI
    // =========================================================

    // Internal ID del Billing Schedule a asignar
    const BILLING_SCHEDULE_ID = 26;

    // Lista fija de internal IDs de Sales Orders a procesar
    const SALES_ORDER_IDS = [
      1324504,
1770969,
1785536,
1849409,
1849405,
1903405,
1903430,
1903418,
1931185,
1891155,
1877239,
2633539,
2573404,
2573705,
4428248,
4430360,
4424077,
4431008,
4430982,
4428870,
4429885,
4431026,
4429838,
4430249,
4429924,
4430728,
4429169,
4424092,
4429899,
4429844,
4429215,
4424088,
4429145,
4430950,
4429871,
2790176,
2819190,
2857457,
2849406,
3082667,
2906651,
3013342,
3102921,
3102906,
4258746,
4258878,
4259051,
4258900,
4266454,
4278225,
4261551,
4267754,
4259545,
4260019,
4266368,
4260150,
4258590,
4260266,
4259677,
4261404,
4261677,
3220076,

     ];

    // true  = solo actualiza lineas de tipo Service
    // false = actualiza todas las lineas del sublist item
    const ONLY_SERVICE_LINES = false;

    // true  = reemplaza aunque la linea ya tenga billingschedule
    // false = solo asigna si la linea no tiene billingschedule
    const OVERWRITE_EXISTING = true;

    // true  = guarda detalles de cada linea en el log
    // false = deja solo resumen por orden
    const LOG_LINE_DETAIL = false;

    function execute(context) {
        const scriptObj = runtime.getCurrentScript();

        log.audit({
            title: 'INICIO SCRIPT',
            details: {
                scriptId: scriptObj.id,
                deploymentId: scriptObj.deploymentId,
                billingScheduleId: BILLING_SCHEDULE_ID,
                salesOrderCount: SALES_ORDER_IDS.length,
                onlyServiceLines: ONLY_SERVICE_LINES,
                overwriteExisting: OVERWRITE_EXISTING,
                logLineDetail: LOG_LINE_DETAIL
            }
        });

        let processedOrders = 0;
        let updatedOrders = 0;
        let skippedOrders = 0;
        let failedOrders = 0;

        for (let i = 0; i < SALES_ORDER_IDS.length; i++) {
            const salesOrderId = SALES_ORDER_IDS[i];

            try {
                const result = processSalesOrder(salesOrderId);

                processedOrders++;

                if (result.updatedLines > 0) {
                    updatedOrders++;
                } else {
                    skippedOrders++;
                }

                log.audit({
                    title: 'RESULTADO SO ' + salesOrderId,
                    details: {
                        salesOrderId: result.salesOrderId,
                        savedId: result.savedId,
                        tranId: result.tranId,
                        entity: result.entity,
                        statusRef: result.statusRef,
                        lineCount: result.lineCount,
                        updatedLines: result.updatedLines,
                        skippedLines: result.skippedLines,
                        errorLines: result.errorLines
                    }
                });

                if (LOG_LINE_DETAIL && result.lineResults && result.lineResults.length) {
                    log.debug({
                        title: 'DETALLE LINEAS SO ' + salesOrderId,
                        details: result.lineResults
                    });
                }

            } catch (e) {
                failedOrders++;

                log.error({
                    title: 'ERROR PROCESANDO SO ' + salesOrderId,
                    details: {
                        salesOrderId: salesOrderId,
                        name: e.name,
                        message: e.message,
                        stack: e.stack
                    }
                });
            }
        }

        log.audit({
            title: 'FIN SCRIPT',
            details: {
                totalOrdersConfigured: SALES_ORDER_IDS.length,
                processedOrders: processedOrders,
                updatedOrders: updatedOrders,
                skippedOrders: skippedOrders,
                failedOrders: failedOrders
            }
        });
    }

    function processSalesOrder(salesOrderId) {
        const soRec = record.load({
            type: record.Type.SALES_ORDER,
            id: salesOrderId,
            isDynamic: false
        });

        const tranId = safeGetValue(soRec, 'tranid');
        const entity = safeGetText(soRec, 'entity') || safeGetValue(soRec, 'entity');
        const statusRef = safeGetValue(soRec, 'statusRef');

        const lineCount = soRec.getLineCount({
            sublistId: 'item'
        });

        let updatedLines = 0;
        let skippedLines = 0;
        let errorLines = 0;
        const lineResults = [];

        for (let line = 0; line < lineCount; line++) {
            try {
                const itemId = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: line
                });

                const itemText = tryGetSublistText(soRec, 'item', 'item', line);

                const itemType = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemtype',
                    line: line
                });

                const isClosed = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'isclosed',
                    line: line
                });

                const currentBillingSchedule = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'billingschedule',
                    line: line
                });

                const currentBillingScheduleText = tryGetSublistText(
                    soRec,
                    'item',
                    'billingschedule',
                    line
                );

                const quantity = safeGetSublistValue(soRec, 'item', 'quantity', line);
                const rate = safeGetSublistValue(soRec, 'item', 'rate', line);
                const amount = safeGetSublistValue(soRec, 'item', 'amount', line);

                if (isClosed === true || isClosed === 'T') {
                    skippedLines++;
                    lineResults.push(buildLineLog({
                        line: line,
                        itemId: itemId,
                        itemText: itemText,
                        itemType: itemType,
                        quantity: quantity,
                        rate: rate,
                        amount: amount,
                        currentBillingSchedule: currentBillingSchedule,
                        currentBillingScheduleText: currentBillingScheduleText,
                        result: 'SKIPPED_LINE_CLOSED'
                    }));
                    continue;
                }

                if (ONLY_SERVICE_LINES && itemType !== 'Service') {
                    skippedLines++;
                    lineResults.push(buildLineLog({
                        line: line,
                        itemId: itemId,
                        itemText: itemText,
                        itemType: itemType,
                        quantity: quantity,
                        rate: rate,
                        amount: amount,
                        currentBillingSchedule: currentBillingSchedule,
                        currentBillingScheduleText: currentBillingScheduleText,
                        result: 'SKIPPED_NOT_SERVICE'
                    }));
                    continue;
                }

                if (!OVERWRITE_EXISTING && currentBillingSchedule) {
                    skippedLines++;
                    lineResults.push(buildLineLog({
                        line: line,
                        itemId: itemId,
                        itemText: itemText,
                        itemType: itemType,
                        quantity: quantity,
                        rate: rate,
                        amount: amount,
                        currentBillingSchedule: currentBillingSchedule,
                        currentBillingScheduleText: currentBillingScheduleText,
                        result: 'SKIPPED_ALREADY_HAS_BS'
                    }));
                    continue;
                }

                if (Number(currentBillingSchedule || 0) === Number(BILLING_SCHEDULE_ID)) {
                    skippedLines++;
                    lineResults.push(buildLineLog({
                        line: line,
                        itemId: itemId,
                        itemText: itemText,
                        itemType: itemType,
                        quantity: quantity,
                        rate: rate,
                        amount: amount,
                        currentBillingSchedule: currentBillingSchedule,
                        currentBillingScheduleText: currentBillingScheduleText,
                        result: 'SKIPPED_SAME_BS'
                    }));
                    continue;
                }

                soRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'billingschedule',
                    line: line,
                    value: BILLING_SCHEDULE_ID
                });

                updatedLines++;

                lineResults.push(buildLineLog({
                    line: line,
                    itemId: itemId,
                    itemText: itemText,
                    itemType: itemType,
                    quantity: quantity,
                    rate: rate,
                    amount: amount,
                    currentBillingSchedule: currentBillingSchedule,
                    currentBillingScheduleText: currentBillingScheduleText,
                    result: 'UPDATED'
                }));

            } catch (lineError) {
                errorLines++;

                lineResults.push({
                    line: line,
                    result: 'ERROR',
                    errorName: lineError.name,
                    errorMessage: lineError.message
                });

                log.error({
                    title: 'ERROR EN LINEA ' + line + ' DE SO ' + salesOrderId,
                    details: {
                        salesOrderId: salesOrderId,
                        line: line,
                        name: lineError.name,
                        message: lineError.message,
                        stack: lineError.stack
                    }
                });
            }
        }

        let savedId = null;

        if (updatedLines > 0) {
            savedId = soRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
        }

        return {
            salesOrderId: salesOrderId,
            savedId: savedId,
            tranId: tranId,
            entity: entity,
            statusRef: statusRef,
            lineCount: lineCount,
            updatedLines: updatedLines,
            skippedLines: skippedLines,
            errorLines: errorLines,
            lineResults: lineResults
        };
    }

    function buildLineLog(data) {
        return {
            line: data.line,
            itemId: data.itemId,
            itemText: data.itemText,
            itemType: data.itemType,
            quantity: data.quantity,
            rate: data.rate,
            amount: data.amount,
            currentBillingSchedule: data.currentBillingSchedule,
            currentBillingScheduleText: data.currentBillingScheduleText,
            newBillingSchedule: BILLING_SCHEDULE_ID,
            result: data.result
        };
    }

    function safeGetValue(rec, fieldId) {
        try {
            return rec.getValue({
                fieldId: fieldId
            });
        } catch (e) {
            return null;
        }
    }

    function safeGetText(rec, fieldId) {
        try {
            return rec.getText({
                fieldId: fieldId
            });
        } catch (e) {
            return null;
        }
    }

    function safeGetSublistValue(rec, sublistId, fieldId, line) {
        try {
            return rec.getSublistValue({
                sublistId: sublistId,
                fieldId: fieldId,
                line: line
            });
        } catch (e) {
            return null;
        }
    }

    function tryGetSublistText(rec, sublistId, fieldId, line) {
        try {
            return rec.getSublistText({
                sublistId: sublistId,
                fieldId: fieldId,
                line: line
            });
        } catch (e) {
            return null;
        }
    }

    return {
        execute: execute
    };
});