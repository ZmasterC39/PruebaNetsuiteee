/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    "N/ui/serverWidget",
    "N/record",
    "N/log",
    "N/search",
    "N/format",
    "N/task",
    "N/runtime",
    "N/url",
    "N/redirect",
    "N/file",
],
    (serverWidget, record, log, search, format, task, runtime, url, redirect, file) => {
        //Configuraciones para la creacion de la factura directa PE
        const inputfiles = 18054; // antes: 22928;
        const onRequest = (scriptContext) => {
            try {
                //Creacion del formulario para transaccionar varias ordenes de servicio
                let form = serverWidget.createForm({ title: "Extornar Ordenes de Venta", });
                //Asignacion de un script para el formulario
                form.clientScriptModulePath = "./TS_CS_Extornar_Factura.js";
                //Obtenemos los parametros de la URL
                let params = { flag: "" };
                if (scriptContext.request.parameters.custscript_ts_context) {
                    params = scriptContext.request.parameters.custscript_ts_context;
                    params = JSON.parse(params);
                }
                log.debug('params', params);
                //Agregamos el submit boton del formulario
                form.addSubmitButton({ label: "Procesar" });
                form.addButton({
                    id: "custpage_btn_calcular_importe",
                    label: "Validar Ordenes Venta",
                    functionName: "calcularImporte",
                });
                //Creacion de la seccion de busqueda
                let seccionBusqueda = form.addFieldGroup({
                    id: "seccion_busqueda",
                    label: "Busqueda de Ordenes de Servicio",
                });
                //Creacion de campo de busqueda los agrupamos en una sola columna

                //cliente

                let fechaInicio = form.addField({ id: "fecha_inicio", type: serverWidget.FieldType.DATE, label: "Fecha de Inicio", container: "seccion_busqueda" });
                fechaInicio.isMandatory = true;
                let fechaFin = form.addField({ id: "fecha_fin", type: serverWidget.FieldType.DATE, label: "Fecha de Fin", container: "seccion_busqueda" });
                fechaFin.isMandatory = true;
                let cliente = form.addField({ id: "cliente", type: serverWidget.FieldType.SELECT, source: "customer", label: "Cliente", container: "seccion_busqueda" });
                let agrupador = form.addField({ id: "agrupador", type: serverWidget.FieldType.TEXT, label: "Agrupador", container: "seccion_busqueda", });

                //Agrupador



                //Creacion de la seccion de resultados
                form.addFieldGroup({
                    id: "seccion_resultados",
                    label: "Resultados de la Busqueda",
                });
                //Creacion de la sublista
                let sublista = form.addSublist({
                    id: "sublista",
                    type: serverWidget.SublistType.LIST,
                    label: "Facturas Internas",
                    tab: "tab1",
                });
                if (params.flag == "searchFacturaFin") {

                    cliente.defaultValue = params.cliente;
                    fechaInicio.defaultValue = new Date(params.fechaInicio);
                    fechaFin.defaultValue = new Date(params.fechaFin);
                    agrupador.defaultValue = params.agrupador;
                    let facturasFIN = getFacturasFIN(params.cliente, new Date(params.fechaInicio), new Date(params.fechaFin), params.agrupador);
                    log.debug('facturasFIN', facturasFIN);
                    const unique = [];
                    const seenIds = new Set();

                    for (const item of facturasFIN) {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            unique.push(item);
                        }
                    }
                    log.debug('unique', unique);
                    sublista.addMarkAllButtons();
                    sublista.addField({ id: "check", type: serverWidget.FieldType.CHECKBOX, label: "Seleccionar", });
                    sublista.addField({ id: "id", type: serverWidget.FieldType.TEXT, label: "ID", });
                    sublista.addField({ id: "numero", type: serverWidget.FieldType.TEXT, label: "Numero", });
                    sublista.addField({ id: "agrupador", type: serverWidget.FieldType.TEXT, label: "Agrupador", });
                    sublista.addField({ id: "fecha", type: serverWidget.FieldType.TEXT, label: "Fecha", });
                    sublista.addField({ id: "cliente", type: serverWidget.FieldType.TEXT, label: "Cliente", });
                    sublista.addField({ id: "moneda", type: serverWidget.FieldType.TEXT, label: "Moneda", });

                    for (i = 0; i < unique.length; i++) {
                        sublista.setSublistValue({ id: "check", line: i, value: "F" });
                        sublista.setSublistValue({
                            id: "id",
                            line: i,
                            value: unique[i].id,
                        });
                        sublista.setSublistValue({
                            id: "numero",
                            line: i,
                            value: unique[i].numero,
                        });
                        if (unique[i].memo) {
                            sublista.setSublistValue({
                                id: "agrupador",
                                line: i,
                                value: unique[i].memo,
                            });
                        }

                        sublista.setSublistValue({
                            id: "fecha",
                            line: i,
                            value: unique[i].fecha,
                        });
                        sublista.setSublistValue({
                            id: "cliente",
                            line: i,
                            value: unique[i].cliente,
                        });
                        sublista.setSublistValue({
                            id: "moneda",
                            line: i,
                            value: unique[i].currencyName,
                        });

                    }
                }
                scriptContext.response.writePage(form);
                //Creamos la factura directa cuando se envia el formulario
                if (scriptContext.request.method === "POST") {
                    try {

                        var status = true;
                        var mensaje = "Se Puede Extornar orden Venta";
                        let labelsString = scriptContext.request.parameters.sublistalabels;
                        // Extraer los nombres de los campos
                        let fieldNames = labelsString.split("\u0001");
                        // Cadena de texto con los datos (ejemplo de datos proporcionados anteriormente)
                        let dataString = scriptContext.request.parameters.sublistadata;
                        // Dividir la cadena en registros individuales y filtrar registros vacíos
                        let records = dataString.split("\u0002").filter((record) => record);
                        //filtramos solo los registros que empiezan con T
                        records = records.filter((record) => record.startsWith("T"));
                        // Convertir cada registro en un objeto y agregarlo a un array
                        let datosseleccionados = records.map((record) => {
                            let fields = record.split("\u0001");
                            // Crear un objeto para cada registro, asignando cada campo a su nombre correspondiente
                            let recordObj = fieldNames.reduce((obj, fieldName, index) => {
                                if (index > 0) {
                                    // Ignorar el primer campo 'Seleccionar'
                                    //nos saltamos el primer campo que es el checkbox
                                    obj[fieldName] = fields[index];
                                }
                                return obj;
                            }, {});
                            return recordObj;
                        });
                        var salesorderarray = [];
                        var facturainternas = [];
                        var facturasagrupadas = [];
                        for (const factura of datosseleccionados) {
                            salesorderarray.push(factura.ID);
                        }
                        var transactionSearchObj = search.create({
                            type: "transaction",
                            settings: [{ "name": "consolidationtype", "value": "NONE" }],
                            filters:
                                [
                                    ["type", "anyof", "CuTrSale112"],
                                    "AND",
                                    ["custbody_ec_created_from_fac_int", "anyof", salesorderarray]
                                ],
                            columns:
                                [
                                    search.createColumn({ name: "custbody_ht_factura_directa", label: "HT Factura Directa Agrupada" }),
                                    search.createColumn({ name: "internalid" }),
                                    search.createColumn({ name: "custcol_ht_fac_agru", label: "HT Factura Agrupada" }),
                                ]
                        });
                        var pagedResults = transactionSearchObj.runPaged({
                            pageSize: 1000
                        });
                        pagedResults.pageRanges.forEach(function (pageRange) {
                            var page = pagedResults.fetch({ index: pageRange.index });
                            page.data.forEach(function (result) {
                                facturasagrupadas.push(result.getValue({ name: "custbody_ht_factura_directa" }));
                                facturasagrupadas.push(result.getValue({ name: "custcol_ht_fac_agru" }));
                                facturainternas.push(result.getValue({ name: "internalid" }));

                            });
                        });
                        const dataArrint = new Set(facturainternas);
                        let resultsint = [...dataArrint];
               
                        const dataArrAgru = new Set(facturasagrupadas.filter(val => val && val.trim() !== ''));
                        let resultsagru = [...dataArrAgru];

                        if (resultsagru.length) {
                            var estadorelacionado = validarFactura(resultsagru);
                            if (estadorelacionado) {
                                var transactionSearchObjs = search.create({
                                    type: search.Type.INVOICE,
                                    filters:
                                        [["internalid", "anyof", resultsagru]],
                                    columns:
                                        [
                                            search.createColumn({ name: "statusref" }),
                                            search.createColumn({ name: "custbody_psg_ei_status" }),
                                        ]
                                });
                                transactionSearchObjs.run().each(function (result) {
                                    var statusref = result.getValue({ name: "statusref" });
                                    var custbody_psg_ei_status = result.getValue({ name: "custbody_psg_ei_status" });
                                    if (statusref != "open" && custbody_psg_ei_status != '7') {
                                        mensaje = "La factura Agrupada ya fue Emitido o tiene un pago relacionado";
                                        status = false;
                                        return false;
                                    }
                                    return true;
                                });

                            } else {
                                mensaje = "Tiene un documento Relacionado";
                                status = false
                            }
                        }
                        log.debug('salesorderarray', salesorderarray);
                        log.debug('resultsint', resultsint);
                        log.debug('resultsagru', resultsagru);
                        log.debug('status', status);
                        let currentUser = runtime.getCurrentUser();
                        let id_log = createCabLog({ usuario: currentUser.id });
                        if (status) {
                            let ts_ss_agrup_fac_params = {
                                salesorderarray: salesorderarray,
                                internas: resultsint,
                                agrupadas: resultsagru,
                            };
                            let fileid = saveJson(
                                ts_ss_agrup_fac_params,
                                id_log,
                                inputfiles
                            );
                            log.debug("fileid", fileid);
                            let recordId = record.submitFields({
                                type: "customrecord_ts_log_ejec_ext_fac",
                                id: id_log,
                                values: { custrecord_ts_ss_parametros_ext: fileid },
                            });
                            log.debug("recordId", recordId);
                            try {

                                let scriptTask = task.create({
                                    taskType: task.TaskType.MAP_REDUCE,
                                    scriptId: "customscript_ts_ss_ejecucion_masiva",
                                    deploymentId: "customdeploy_ts_ss_ejecucion_masiva",

                                });
                                let scriptTaskId = scriptTask.submit();

                            } catch (error) {
                                log.error("onRequest POST Task", error);
                            }
                            //Nos redirigimos a la pagina de resultados


                        } else {
                            let recordId = record.submitFields({
                                type: "customrecord_ts_log_ejec_ext_fac",
                                id: id_log,
                                values: { custrecord_ts_porcentaje_ext: '100%', custrecord_ts_estado_ext: 'FALLIDO', custrecord_ts_error_ext: mensaje, custrecord_ts_fecha_fin_ext: new Date() },
                            });
                        }
                        redirect.toSuitelet({ scriptId: 6067, deploymentId: 1 });
                    } catch (error) {
                        log.error("onRequest POST", error);
                    }
                }
            } catch (e) {
                log.error("onRequest", e);
            }
        };
        function validarFactura(invoiceId) {
            const results = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['createdfrom.internalid', 'anyof', invoiceId],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            return results.length === 0;
        }

        const getFacturasFIN = (cliente, fechaInicio, fechaFin, agrupador) => {
            try {
                let respuesta = new Array();
                let agrup = agrupador != "" ? agrupador : "%";
                let newfechaInicio;
                let newfechaFin;

                //ejemplo de como formatear la fecha "2024-08-11T05:00:00.000Z" a "11/08/2024"
                newfechaInicio = fechaInicio.toISOString().split("T")[0].split("-").reverse().join("/");
                newfechaFin = fechaFin.toISOString().split("T")[0].split("-").reverse().join("/");


                let searchFacturasFIN;
                var filters = [
                    ["type", "anyof", "CuTrSale112"],
                    "AND",
                    ["status", "noneof", "CuTrSale112:V"],
                    "AND",
                    ["CUSTBODY_EC_CREATED_FROM_FAC_INT.trandate", "within", newfechaInicio, newfechaFin],
                    "AND",
                    ["amount", "notequalto", 0],
                    "AND",
                    ["memomain", "isnot", "VOID"],
                    "AND",
                    ["CUSTBODY_EC_CREATED_FROM_FAC_INT.taxline", "is", "F"],
                    "AND",
                    ["mainline", "is", "T"]
                ]
                if (cliente && cliente !== "") {
                    filters.push("AND", ["entity", "anyof", cliente]);
                }
                if (agrupador && agrupador !== "") {
                    filters.push("AND", ["CUSTBODY_EC_CREATED_FROM_FAC_INT.custbody_ht_cod_agru", "contains", agrup]);
                }


                searchFacturasFIN = search.create({
                    type: "transaction",
                    filters: filters,
                    columns: [
                        search.createColumn({ name: "internalid", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                        search.createColumn({ name: "tranid", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                        search.createColumn({ name: "trandate", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                        search.createColumn({ name: "entity", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                        search.createColumn({ name: "custbody_ht_cod_agru", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                        search.createColumn({ name: "symbol", join: "Currency", label: "Symbol" })
                    ],
                });


                let pagedData = searchFacturasFIN.runPaged({ pageSize: 1000 });
                // Verificar si hay al menos una página de resultados

                if (pagedData.count > 0) {
                    let pageIndex = 0;
                    // Iterar a través de cada página
                    do {
                        // Obtener la página actual
                        let currentPage = pagedData.fetch({ index: pageIndex });
                        currentPage.data.forEach(function (result) {
                            respuesta.push({
                                id: result.getValue({ name: "internalid", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                numero: result.getValue({ name: "tranid", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                fecha: result.getValue({ name: "trandate", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                cliente: result.getText({ name: "entity", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                clienteid: result.getValue({ name: "entity", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                memo: result.getValue({ name: "custbody_ht_cod_agru", join: "CUSTBODY_EC_CREATED_FROM_FAC_INT" }),
                                currencyName: result.getValue({ name: "symbol", join: "Currency", label: "Symbol" }),

                            });
                        });
                        pageIndex++;
                    } while (pageIndex < pagedData.pageRanges.length);
                }
                return respuesta;
            } catch (e) {
                log.error("getOrdenesServicio", e);
            }
        };


        const createCabLog = (params) => {
            try {
                let cabLog = record.create({
                    type: "customrecord_ts_log_ejec_ext_fac",
                    isDynamic: true,
                });
                cabLog.setValue({ fieldId: "name", value: "Agrupacion de Facturas" });
                cabLog.setValue({ fieldId: "custrecord_ts_estado_ext", value: "pendiente" });
                cabLog.setValue({ fieldId: "custrecord_ts_porcentaje_ext", value: "0%" });
                cabLog.setValue({
                    fieldId: "custrecord_ts_fecha_inicio_ext",
                    value: new Date(),
                });
                if (params.usuario) {
                    cabLog.setValue({
                        fieldId: "custrecord_ts_creado_por_ext",
                        value: params.usuario,
                    });
                }
                cabLog.save();
                return cabLog.id;
            } catch (error) {
                log.error("createCabLog", error);
            }
        };
        const saveJson = (contents, nombre, folder) => {

            let fecha = sysDate();
            let fileObj = file.create({
                name: `lote${nombre}_${fecha}.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: folder,
                isOnline: false,
            });
            return fileObj.save();
        };
        const sysDate = () => {
            let date = new Date();
            var tdate = date.getDate();
            tdate = Number(tdate) < 10 ? `0${tdate}` : tdate;
            var month = date.getMonth() + 1;
            month = Number(month) < 10 ? `0${month}` : month;
            var year = date.getFullYear();
            return (currentDate = `${tdate}${month}${year}`);
        };
        return { onRequest };
    });
