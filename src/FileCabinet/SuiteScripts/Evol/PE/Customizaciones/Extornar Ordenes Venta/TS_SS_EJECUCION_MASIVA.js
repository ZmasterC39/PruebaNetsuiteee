/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/log', 'N/search', 'N/file', 'N/task'], function (record, log, search, file, task) {

    function getInputData() {

        try {
            let cola = getCola('pendiente');

            if (cola.length > 0) {

                let fileObjContent = file.load({ id: cola[0].parametros });
                let parametros = JSON.parse(fileObjContent.getContents());
                var inputList = [];
                parametros.salesorderarray.forEach(function (id) {
                    if (id) {
                        inputList.push({ type: 'update', id: id });
                    }
                });
                parametros.internas.forEach(function (id) {
                    if (id) {
                        inputList.push({ type: 'delete_so', id: id });
                    }
                });
                parametros.agrupadas.forEach(function (id) {
                    if (id) {
                        inputList.push({ type: 'delete_inv', id: id });
                    }
                });
                let recordId = record.submitFields({
                    type: "customrecord_ts_log_ejec_ext_fac",
                    id: cola[0].id,
                    values: { custrecord_ts_estado_ext: "procesando", custrecord_ts_porcentaje_ext: '10%' },
                });
                log.debug('inputList', inputList);
                return inputList;
            }
        } catch (error) {
            log.error('execute', error);
        }



    }
    const getCola = (estatus) => {
        try {
            let respuesta = new Array();
            var customrecord_ts_standar_ss_colaSearchObj = search.create({
                type: "customrecord_ts_log_ejec_ext_fac",
                filters:
                    [
                        ["custrecord_ts_estado_ext", "is", estatus]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalId", label: "internalId" }),
                        search.createColumn({ name: "custrecord_ts_fecha_inicio_ext", label: "Fecha_Inicio" }),
                        search.createColumn({ name: "custrecord_ts_ss_parametros_ext", label: "Parametros" })
                    ]
            });
            var searchResultCount = customrecord_ts_standar_ss_colaSearchObj.runPaged().count;

            customrecord_ts_standar_ss_colaSearchObj.run().each(function (result) {
                respuesta.push({
                    id: result.getValue({ name: 'internalId' }),
                    ejecucionesPendientes: searchResultCount,
                    fechaInicio: result.getValue({ name: 'custrecord_ts_fecha_inicio_ext' }),
                    parametros: result.getValue({ name: 'custrecord_ts_ss_parametros_ext' })
                });
                return true;
            });
            //Ordenamos la cola por fecha de inicio
            respuesta.sort((a, b) => {
                return new Date(a.fechaInicio) - new Date(b.fechaInicio);
            });

            return respuesta;
        } catch (e) {
            log.error('getCola Error', e);
        }
    }
    function map(context) {
        var item = JSON.parse(context.value);
        context.write({
            key: item.type,
            value: item.id
        });
    }

    function reduce(context) {
        var type = context.key;
        var ids = context.values;
        ids.forEach(function (id) {
            try {
                switch (type) {
                    case 'update':
                        record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: id,
                            values: {
                                custbody_ec_estado_factura_interna: 1
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }

                        });
                        break;

                    case 'delete_so':
                        record.delete({
                            type: 'customsale_ec_factura_interna',
                            id: id
                        });
                        break;

                    case 'delete_inv':
                        record.delete({
                            type: record.Type.INVOICE,
                            id: id
                        });
                        break;
                }
            } catch (e) {
                procesando
                let cola = getCola('procesando');

                if (cola.length > 0) {
                    let recordId = record.submitFields({
                        type: "customrecord_ts_log_ejec_ext_fac",
                        id: cola[0].id,
                        values: { custrecord_ts_estado_ext: "Error", custrecord_ts_porcentaje_ext: '100%', custrecord_ts_error_ext: e.message, custrecord_ts_fecha_fin_ext: new Date() },
                    });
                }
                log.error('Error con ID: ' + id, e.message);
            }
        });
    }
    function summarize(summary) {
        try {
            let cola = getCola('procesando');
            if (Array.isArray(cola) && cola.length > 0) {
                let recordId = record.submitFields({
                    type: "customrecord_ts_log_ejec_ext_fac",
                    id: cola[0].id,
                    values: { custrecord_ts_estado_ext: "Finalizado", custrecord_ts_porcentaje_ext: '100%', custrecord_ts_fecha_fin_ext: new Date() },
                });
            }
            let colapendiente = getCola('pendiente');
            if (Array.isArray(colapendiente) && colapendiente.length > 0) {
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_ts_ss_ejecucion_masiva',
                    deploymentId: 'customdeploy_ts_ss_ejecucion_masiva2'
                });
                var taskId = mrTask.submit();
            }

        } catch (e) {
            log.error('Error al relanzar el M/R', e.message);
        }


    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});