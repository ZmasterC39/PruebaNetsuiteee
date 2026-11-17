/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {
    const RECORD_TYPE = 'customsale_ec_factura_interna';
    const SUBLIST_ID = 'item';
    const FIELD_ID = 'custcol_ht_fac_agru';
    const INTERNAL_IDS = [
        5702662,
5702664,
5702666,
5702615,
5702619,
5702623,
5702627,
5702631,
5702635,
5702639,
5702643,
5702647,
5702651,
5702654,
5702658,
5702660,
5702644,
5702648,
5702652,
5702656,
5702616,
5702620,
5702624,
5702628,
5702632,
5702636,
5702640

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