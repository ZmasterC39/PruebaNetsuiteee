/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = == = = = = = = = = = = =\
||
||   This script for Customer (Generación de identificador para cliente)
||
||   File Name: TS_UE_Orden_Servicio_2.js
||
||   Commit      Version     Date            ApiVersion         Enviroment       Governance points
||   01          1.0         26/01/2023      Script 2.1         SB               N/A
||
\  = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = == = = = = = = = = = = = */


/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime', 'N/redirect', 'N/ui/serverWidget', 'N/https', 'N/error'], (log, search, record, runtime, error) => {


    const afterSubmit = (context) => {
        try {
            let currentRecord = context.newRecord;
            let idRecord = currentRecord.id;
            let { role: userRol, subsidiary } = runtime.getCurrentUser();

            if (subsidiary == 2) {
                if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                    let objRecord = record.load({ type: 'calendarevent', id: idRecord, isDynamic: true });
                    var salesOrder = objRecord.getValue('transaction');
                    let fecha_recepcion = objRecord.getText('startdate');
                    let hora_recepcion = objRecord.getText('starttime');
                    getRecepcion(salesOrder, fecha_recepcion, hora_recepcion, subsidiary);
                }
            } else {
                if (context.type === context.UserEventType.CREATE) {
                    let objRecord = record.load({ type: 'calendarevent', id: idRecord, isDynamic: true });
                    if (context.type === context.UserEventType.CREATE) {
                        var salesOrder = objRecord.getValue('transaction');
                        let fecha_recepcion = objRecord.getText('startdate');
                        let hora_recepcion = objRecord.getText('starttime');
                        getRecepcion(salesOrder, fecha_recepcion, hora_recepcion, subsidiary);
                    }
                }
            }
        } catch (error) {
            log.error("Error: afterSubmit", error.stack)
        }
    }

    function getRecepcion(id, fecha_recepcion, hora_recepcion, subsidiary) {
        try {

            log.debug('getRecepcion', { id, fecha_recepcion, hora_recepcion, subsidiary });

            if (!id) {
                log.error('Error: getRecepcion', 'No se proporcionó un ID de Orden de Servicio.');
                return;
            }

            let filters = [
                ["custrecord_ht_ot_orden_servicio", "anyof", id]
            ];

            if (subsidiary == 2) {
                filters = filters.concat([
                    "AND", ["custrecord_ht_ot_subsidiary", "anyof", subsidiary],
                    "AND", ["custrecord_ht_ot_estado", "anyof", 7]
                ]);
            }

            var busqueda = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: filters,
                columns:
                    [
                        search.createColumn({
                            name: "internalid",
                            sort: search.Sort.ASC,
                            label: "ID"
                        })
                    ]
            });
            var savedsearch = busqueda.run().getRange(0, 100);
            var id = '';

            if (savedsearch.length > 0) {
                busqueda.run().each(function (result) {
                    id = result.getValue(busqueda.columns[0]);
                    if (subsidiary == 2) {
                        record.submitFields({
                            type: 'customrecord_ht_record_ordentrabajo',
                            id: id,
                            values: {
                                'custrecord_ht_ot_estado': 4,
                                'custrecord_ht_ot_fecha_recepcion': fecha_recepcion,
                                'custrecord_ht_ot_hora_recepcion': hora_recepcion
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });

                    } else {
                        record.submitFields({
                            type: 'customrecord_ht_record_ordentrabajo',
                            id: id,
                            values: {
                                'custrecord_ht_ot_estado': 4,
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                    return true;
                });
            }
        } catch (error) {
            log.error('Error en getRecepcion', error.stack);
        }
    }



    return {
        afterSubmit: afterSubmit
        //beforeLoad: beforeLoad
    }
});
/********************************************************************************************************************
TRACKING
/********************************************************************************************************************
/* Commit:01
Version: 1.0
Date: 26/01/2023
Author: Jeferson Mejia
Description: Creación del script.
===================================================================================================================*/