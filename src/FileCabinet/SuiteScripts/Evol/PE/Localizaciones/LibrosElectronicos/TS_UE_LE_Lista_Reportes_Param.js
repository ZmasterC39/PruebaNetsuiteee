/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log'],

    (search, record, log) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

            let oldRecord = scriptContext.oldRecord; 
            let newRecord = scriptContext.newRecord;
            //creamos las validaciones para validar si existe un parametro con el mismo codigo en el reporte (campo_id_param: custrecord_ts_le_repo_id_param, campor_codigo: custrecord_ts_le_repo_cod_param)
            if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {
            
                let id_param_old = (oldRecord) ? oldRecord.getValue({ fieldId: 'custrecord_ts_le_repo_id_param' }) : null;
                let codigo_repo_new = newRecord.getValue({ fieldId: 'custrecord_ts_le_repo_cod_param' }); 
                let id_param_new = newRecord.getValue({ fieldId: 'custrecord_ts_le_repo_id_param' });

                
                log.debug('paramsValidation', {
                    id_param_old,
                    codigo_repo_new,
                    id_param_new
                }); 

                if (id_param_old != id_param_new) { 
                    let searchReporte = search.create({
                        type: 'customrecord_ts_le_lista_params',
                        filters: [
                            ['isinactive', 'is', 'F'],
                            'and',
                            ['custrecord_ts_le_repo_cod_param', 'anyof', codigo_repo_new],
                            'and',
                            ['custrecord_ts_le_repo_id_param', 'is', id_param_new]
                        ],
                        columns: [
                            search.createColumn({ name: 'internalid' }),
                            search.createColumn({ name: 'custrecord_ts_le_repo_id_param' })
                        ]
                    });

                    searchReporte.run().each(function (result) {
                        let id_param_search = result.getValue({ name: 'custrecord_ts_le_repo_id_param' });
                        if (id_param_search == id_param_new) {
                            throw 'Ya existe un parametro con el mismo codigo en el reporte: ' + id_param_new;
                        }
                    });
                }
            }

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
         

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
