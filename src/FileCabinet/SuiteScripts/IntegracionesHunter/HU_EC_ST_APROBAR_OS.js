    /**
     * @NApiVersion 2.1
     * @NScriptType Suitelet
     *
     * @author Mauro F Ramos
     * @date 23/01/2025
     * @description
     *
     * @version 1.0
     * @notes - Ninguna -
     * @LastModifiedBy 24/01/2025
     */
    define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/redirect', 'N/runtime', 'N/log'], function (serverWidget, search, record, redirect, runtime, log) {

        let id = [];
        let seleccionado = [];
        let locations = [];

        const LONGITUD_PAGINA = 100;

        function onRequest(context) {
            try {
                let {role: userRol, subsidiary} = runtime.getCurrentUser();
                if( subsidiary !== 2){
                    let form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                    context.response.writePage(form);
                    return;
                }
                let form = serverWidget.createForm({title: 'Aprobación de Venta de Orden de Servicio'});
                form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_APROBAR_OS.js';
                _uiMain(context, form);
                let numero_impuesto = context.request.parameters.numero_impuesto;
                let fecha_desde = context.request.parameters.fecha_desde;
                let fecha_hasta = context.request.parameters.fecha_hasta;
                let pg = context.request.parameters.pg || 0;
              
                if (numero_impuesto || fecha_hasta) {
                    _uiSublist(form, 1, numero_impuesto, fecha_desde, fecha_hasta, pg);
                } else {
                    _uiSublist(form, 0, 0, 0, 0, pg);
                }
                if (context.request.method === 'POST') {
                    // Obtener la cantidad de líneas en la sublista
                    let lineCount = context.request.getLineCount({
                        group: 'custpage_sublista'
                    });
                    // Iterar sobre las líneas de la sublista
                    for (let index = 0; index < lineCount; index++) {
                        let tranInternalId = context.request.getSublistValue({
                            group: 'custpage_sublista',
                            name: 'custpage_checkbox',
                            line: index
                        });

                        let  numero_orden= context.request.getSublistValue({
                            group: 'custpage_sublista',
                            name: 'custpage_numero_documento',
                            line: index
                        });
                      
                        let  apr_venta = context.request.getSublistValue({
                            group: 'custpage_sublista',
                            name: 'custpage_apr_venta',
                            line: index
                        });

                        let  apr_cartera = context.request.getSublistValue({
                            group: 'custpage_sublista',
                            name: 'custpage_apr_cartera',
                            line: index
                        });

                        let  id = context.request.getSublistValue({
                            group: 'custpage_sublista',
                            name: 'custpage_id',
                            line: index
                        });

                        if(tranInternalId === 'T') {
                            seleccionado.push({
                                id,
                                tranInternalId,
                                numero_orden,
                                index,
                            });

                            let aprov;
                          if( apr_venta === 'PENDIENTE DE APROBACIÓN' && apr_cartera === 'APROBADO' ){
                            // let updateRec record.load({ type: record.Type.SALES_ORDER, id: 3767540 });
                            // updateRec.setValue({ fieldId: 'custbody_ht_os_aprobacionventa', value: 1 });
                            // updateRec.setValue({ fieldId: 'orderstatus', value: 'B' });
                            // let updaetIns = updateRec.save();
                                aprov = record.submitFields({
                                    type: 'salesorder',
                                    values: {
                                        custbody_ht_os_aprobacionventa: 1,
                                        orderstatus: 'B',
                                    },
                                    id,
                                });
                            }else {
                                aprov = record.submitFields({
                                    type: 'salesorder',
                                    values: {
                                        custbody_ht_os_aprobacionventa: 1,
                                    },
                                    id,
                                });
                            }

                            
                        }
                    } // FOR
                    log.debug("aprobados", seleccionado);
                    redirect.toSuitelet({
                        scriptId: 'customscript_hu_ec_st_aprobar_os',
                        deploymentId: 'customdeploy_hu_ec_st_aprobar_os',
                        parameters: {}
                    });
                }
                context.response.writePage(form);
            } catch (e) {
                context.response.write({
                    output: 'Error: ' + e.message
                });
            }
        }

        function _uiSublist (form, estado, numero_de_impuesto, fecha_desde, fecha_hasta, pg) {
            let sublist = form.addSublist({
                id: 'custpage_sublista',
                type: serverWidget.SublistType.LIST,
                label: "Busqueda"
            });

            sublist.addMarkAllButtons();

            let filters = [
                ["customform","anyof","142"],
                "AND",
                ["custbody_ht_os_aprobacionventa","anyof","2"],
                "AND",
                ["custbody_ht_os_aprobacioncartera","anyof","1","2"],
                "AND",
                ["status","anyof","SalesOrd:A"],
                //"AND",
                //["item.custitem_ht_at_solicitaaprobacion", "is", "T"],
                "AND",
                ["subsidiary","anyof","2"]
            ];

            if(numero_de_impuesto){
                filters.push("AND");
                filters.push(["customermain.vatregnumber", "startswith", `${numero_de_impuesto}`]);
            }

            if (fecha_desde && fecha_hasta) {
                filters.push("AND");
                filters.push(["trandate", "within", `${fecha_desde}`, `${fecha_hasta}`]);
            }


            let idSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters,
                columns:
                [
                    // search.createColumn({name: "trandate", label: "fecha"}),
                    search.createColumn({name: "tranid", label: "numero_de_documento"}),
                    // search.createColumn({name: "internalid", label: "id_interno"}),
                    // search.createColumn({name: "entity", label: "nombre"}),
                    // search.createColumn({name: "memo", label: "nota"}),
                    // search.createColumn({name: "amount", label: "importe"}),
                    // search.createColumn({name: "ordertype", label: "tipo de orden"})
                ]
            });

            let ResultadoConsulta = idSearchObj.runPaged({ pageSize: LONGITUD_PAGINA });
            let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            let indice = pg;
            if (!indice || indice == "" || indice < 0) {
                indice = 0;
                } else if (indice > conteoPagina) {
                indice = conteoPagina;
            }

            if( ResultadoConsulta.count == 0) return;
            let ResPagina = ResultadoConsulta.fetch({ index: indice });
            ResPagina.data.forEach(function (pageRange) {
                id.push(`${pageRange.id}`);
            });
            let paginaField = form.getField({ id: 'custpage_pagina' });
            for (let index = 0; index < conteoPagina; index++) {
                paginaField.addSelectOption({
                    value: index,
                    text: index + 1
                });
            }
            paginaField.defaultValue = pg || 0;

            if(id.length > 0){
                // Búsqueda final
                var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                    [
                       ["customform","anyof","142"],
                       "AND",
                       ["mainline","is","T"],
                       "AND",
                       ["subsidiary","anyof","2"],
                       "AND",
                       ["internalid","anyof", id],
                    ],
                columns:
                    [
                       search.createColumn({name: "location", label: "oficina"}),
                       search.createColumn({name: "trandate", label: "fecha"}),
                       search.createColumn({name: "tranid", label: "numero_documento"}),
                       search.createColumn({name: "custbody_ht_os_aprobacionventa", label: "apr_venta"}),
                       search.createColumn({name: "custbody_ht_os_aprobacioncartera", label: "apr_cartera"}),
                       search.createColumn({name: "entity", label: "nombre"}),
                       search.createColumn({name: "salesrep", label: "representante_ventas"}),
                       search.createColumn({name: "memomain", label: "nota"}),
                       search.createColumn({name: "amount", label: "total_orden"}),
                       search.createColumn({
                          name: "custentity_ec_document_type",
                          join: "customerMain",
                          label: "documento"
                       }),
                       search.createColumn({
                          name: "vatregnumber",
                          join: "customerMain",
                          label: "numero_documento_cliente"
                       })
                    ]
                });

                let resultSet = transactionSearchObj.run();
                let results = resultSet.getRange({ start: 0, end: 1000 });

                // Transformar los resultados
                let data =  (transformedData = results.map((result) => {
                    var rowData = {};
                    rowData['id'] = result.id;
                    transactionSearchObj.columns.forEach((column) => {
                    var value = result.getText(column) || result.getValue(column);
                    rowData[column.label] = value.toString();
                    });
                    return rowData;
                }));

                sublist.addField({
                    id: 'custpage_checkbox',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Seleccionar'
                });

                // Agregar columna oculta para el id
                let hiddenIdField = sublist.addField({
                    id: 'custpage_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Internal ID'
                });

                // Hacer el campo invisible
                hiddenIdField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                // Agregar columnas para los datos
                sublist.addField({
                    id: 'custpage_oficina',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Oficina'
                });
                sublist.addField({
                    id: 'custpage_fecha',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Fecha'
                });
                sublist.addField({
                    id: 'custpage_numero_documento',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Número de Orden'
                });
                sublist.addField({
                    id: 'custpage_apr_venta',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Apr. Venta'
                });
                sublist.addField({
                    id: 'custpage_apr_cartera',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Apr. Cartera'
                });
                sublist.addField({
                    id: 'custpage_nombre',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Nombre'
                });
                sublist.addField({
                    id: 'custpage_representante_ventas',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Representante de Ventas'
                });
                sublist.addField({
                    id: 'custpage_nota',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Nota'
                });
                sublist.addField({
                    id: 'custpage_total_orden',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Total de Orden'
                });
                sublist.addField({
                    id: 'custpage_documento',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Documento'
                });
                sublist.addField({
                    id: 'custpage_numero_documento_cliente',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Número de documento'
                });

                // Rellenar la sublista con datos
                data.forEach((item, index) => {
                    Object.keys(item).forEach((key) => {
                        sublist.setSublistValue({
                            id: `custpage_${key}`,
                            line: index,
                            value: item[key] || " "
                        });
                    });
                });
            }
        }

        //  Crea los botones y campos principales del formulario
        function _uiMain(context, form) {
            form.addSubmitButton({
                label: 'Enviar'
            });

            form.addResetButton({
                label: 'Cancelar'
            });

            let numero_de_impuesto =  form.addField({
                id: 'custpage_numero_impuesto',
                type: serverWidget.FieldType.TEXT,
                label: 'Número de identificación del cliente',
            });
            numero_de_impuesto.defaultValue = context.request.parameters.numero_impuesto || null;

            let fecha_desde = form.addField({
                id: 'custpage_fecha_desde',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Desde',
            });
            fecha_desde.defaultValue = context.request.parameters.fecha_desde || null;

            let fecha_hasta = form.addField({
                id: 'custpage_fecha_hasta',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Hasta',
            });
            fecha_hasta.defaultValue = context.request.parameters.fecha_hasta || null;

            form.addField({
                id: 'custpage_inline_html',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'INLINEHTML'
            });
            form.addField({
                id: 'custpage_inline_html1',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'INLINEHTML'
            });
            let importeField = form.addField({
                id: 'custpage_importe',
                type: serverWidget.FieldType.CURRENCY,
                label: 'Importe'
            });
            form.addField({
                id: 'custpage_pagina',
                type: serverWidget.FieldType.SELECT,
                label: 'Página'
            });

            importeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
        }

        return {
            onRequest: onRequest
        };
    });
