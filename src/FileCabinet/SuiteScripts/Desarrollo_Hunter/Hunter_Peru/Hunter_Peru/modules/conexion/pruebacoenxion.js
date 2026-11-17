/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {
    const RECORD_TYPE = 'customsale_ec_factura_interna';
    const SUBLIST_ID = 'item';
    const FIELD_ID = 'custcol_ht_fac_agru';
    const INTERNAL_IDS = [
       3908006,
3908008,
3908009,
3908016,
3908018,
3908019,
3908026,
3908028,
3908029,
3908036,
3908038,
3908039,
3908046,
3908048,
3908049,
3908056,
3908058,
3908059,
3908068,
3908069,
3908078,
3908079,
3908088,
3908089,
3908098,
3908099,
3917453,
3917454,
3917464,
3917465,
3917475,
3917476,
3917486,
3917487,
3917497,
3917498,
3917508,
3917509,
3917519,
3917520,
3917530,
3917531,
3917844,
3917845,
3917855,
3917856,
3917866,
3917867,
3917877,
3917878,
3917888,
3917889,
3917899,
3917900,
3917910,
3917911,
3917921,
3917922,
3917932,
3917933,
3918049,
3918050,
3918060,
3918061,
5277320,
5277321,
5277804,
5277805,
5277816,
5277817,
5277828,
5277829,
5277840,
5277841,
5277852,
5277853,
5277864,
5277865,
5277876,
5277877,
5277888,
5277889,
5277908,
5277909,
5277920,
5277921,
5277932,
5277933,
5277944,
5277945,
5277956,
5277957


    ];

    function safeGetSublistValue(rec, line) {
        try {
            return rec.getSublistValue({
                sublistId: SUBLIST_ID,
                fieldId: FIELD_ID,
                line: line
            });
        } catch (e) {
            return null;
        }
    }

    function safeGetSublistText(rec, line) {
        try {
            return rec.getSublistText({
                sublistId: SUBLIST_ID,
                fieldId: FIELD_ID,
                line: line
            });
        } catch (e) {
            return null;
        }
    }

    function clearLineField(rec, line) {
        const currentValue = safeGetSublistValue(rec, line);
        const currentText = safeGetSublistText(rec, line);

        // Si ya está vacío, no hacemos nada
        if (currentValue === '' || currentValue === null || currentValue === undefined) {
            return false;
        }

        // Intento 1: como value vacío
        try {
            rec.setSublistValue({
                sublistId: SUBLIST_ID,
                fieldId: FIELD_ID,
                line: line,
                value: ''
            });

            log.debug({
                title: 'Línea limpiada con setSublistValue',
                details: {
                    line: line + 1,
                    previousValue: currentValue,
                    previousText: currentText
                }
            });

            return true;
        } catch (e1) {
            // Intento 2: como text vacío, útil si fuera un campo tipo lista/select
            try {
                rec.setSublistText({
                    sublistId: SUBLIST_ID,
                    fieldId: FIELD_ID,
                    line: line,
                    text: ''
                });

                log.debug({
                    title: 'Línea limpiada con setSublistText',
                    details: {
                        line: line + 1,
                        previousValue: currentValue,
                        previousText: currentText
                    }
                });

                return true;
            } catch (e2) {
                throw new Error(
                    'No se pudo limpiar la línea ' + (line + 1) +
                    '. Valor actual=' + currentValue +
                    ', Texto actual=' + currentText +
                    ', Error setSublistValue=' + e1.message +
                    ', Error setSublistText=' + e2.message
                );
            }
        }
    }

    function processRecord(recordId) {
        log.audit({
            title: 'Procesando factura interna',
            details: {
                recordType: RECORD_TYPE,
                id: recordId
            }
        });

        const rec = record.load({
            type: RECORD_TYPE,
            id: recordId,
            isDynamic: false
        });

        const lineCount = rec.getLineCount({
            sublistId: SUBLIST_ID
        });

        log.debug({
            title: 'Cantidad de líneas',
            details: {
                id: recordId,
                lineCount: lineCount
            }
        });

        let changedLines = 0;

        for (let i = 0; i < lineCount; i++) {
            const wasChanged = clearLineField(rec, i);
            if (wasChanged) {
                changedLines++;
            }
        }

        if (changedLines > 0) {
            const savedId = rec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

            log.audit({
                title: 'Factura actualizada',
                details: {
                    id: savedId,
                    changedLines: changedLines
                }
            });
        } else {
            log.audit({
                title: 'Sin cambios',
                details: {
                    id: recordId,
                    message: 'Todas las líneas ya estaban vacías en ' + FIELD_ID
                }
            });
        }
    }

    function execute(context) {
        log.audit({
            title: 'Inicio Scheduled Script',
            details: {
                totalIds: INTERNAL_IDS.length,
                remainingUsage: runtime.getCurrentScript().getRemainingUsage()
            }
        });

        if (!INTERNAL_IDS || !INTERNAL_IDS.length) {
            log.audit({
                title: 'Nada que procesar',
                details: 'La lista INTERNAL_IDS está vacía.'
            });
            return;
        }

        for (let i = 0; i < INTERNAL_IDS.length; i++) {
            const recordId = INTERNAL_IDS[i];

            try {
                const remaining = runtime.getCurrentScript().getRemainingUsage();

                if (remaining < 200) {
                    log.error({
                        title: 'Uso insuficiente para continuar',
                        details: {
                            remainingUsage: remaining,
                            lastProcessedIndex: i - 1,
                            pendingFromIndex: i
                        }
                    });
                    break;
                }

                processRecord(recordId);
            } catch (e) {
                log.error({
                    title: 'Error procesando ID ' + recordId,
                    details: {
                        name: e.name,
                        message: e.message,
                        stack: e.stack
                    }
                });
            }
        }

        log.audit({
            title: 'Fin Scheduled Script',
            details: {
                remainingUsage: runtime.getCurrentScript().getRemainingUsage()
            }
        });
    }

    return { execute };
});