/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/runtime'], (record, log, runtime) => {
    const RECORD_TYPE = 'customsale_ec_factura_interna';
    const SUBLIST_ID = 'item';
    const FIELD_ID = 'custcol_ht_fac_agru';
    const INTERNAL_IDS = [
3890460,
3890460,
3890462,
3890462,
3890464,
3890464,
3890466,
3890466,
3890468,
3890468,
3890470,
3890470,
3890472,
3890472,
3890474,
3890474,
3890477,
3890477,
3890478,
3890478,
3894911,
3894911,
3894913,
3894913,
3894915,
3894915,
3894917,
3894917,
3894919,
3894919,
3894921,
3894921,
3894923,
3894923,
3894925,
3894925,
3894927,
3894927,
3894929,
3894929,
3894931,
3894931,
3894933,
3894933,
3894935,
3894935,
3894937,
3894937,
3894939,
3894939,
3894941,
3894941,
3894943,
3894943,
3894945,
3894945,
3894947,
3894947,
3894949,
3894949,
3894951,
3894951,
3895058,
3895058,
3895060,
3895060,
3895062,
3895062,
3895064,
3895064,
3895066,
3895066,
3895068,
3895068,
3895070,
3895070,
3895072,
3895072,
3895074,
3895074,
3895076,
3895076,
3895078,
3895078,
3895080,
3895080
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

        if (currentValue === '' || currentValue === null || currentValue === undefined) {
            return false;
        }

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