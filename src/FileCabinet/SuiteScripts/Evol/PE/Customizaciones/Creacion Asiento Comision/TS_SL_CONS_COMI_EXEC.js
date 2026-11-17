/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget', 'N/query', 'N/redirect', 'N/format', 'N/url'],

    (log, record, search, runtime, serverWidget, query, redirect, format, url) => {
        /**
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const onRequest = (scriptContext) => {
            try {
                let scriptId = 'customscript_ts_sl_cons_comi_exec';
                let deploymentId = 'customdeploy_ts_sl_cons_comi_exec';
                let resultFlag = scriptContext.request.parameters.resultFlag;
                log.debug('resultFlag', resultFlag);
                let form;
                if (resultFlag == '1') {
                    let recordLoad = record.load({
                        type: 'customrecord_ts_asient_comis_ejec',
                        id: scriptContext.request.parameters.recId
                    });
                    form = serverWidget.createForm({
                        title: 'Resultado de Ejecución de Comisiones'
                    });
                    form.clientScriptModulePath = './TS_CS_CONS_COMI_EXEC.js';

                    let sublistResult = form.addSublist({
                        id: 'custpage_sublist',
                        type: serverWidget.SublistType.LIST,
                        label: 'Asientos de Comisiones',
                    });

                    sublistResult.addField({
                        id: 'custpage_nro_deposito',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Nro Deposito'
                    });

                    sublistResult.addField({
                        id: 'custpage_monto_deposito',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Monto Deposito'
                    });

                    sublistResult.addField({
                        id: 'custpage_fecha_deposito',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Fecha Deposito'
                    });
                    sublistResult.addField({
                        id: 'custpage_nro_asiento',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Nro Asiento',
                        source: 'transaction'
                    });
                    sublistResult.addField(
                        {
                            id: 'custpage_estado',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Estado'
                        }
                    )
                    sublistResult.addField({
                        id: 'custpage_mensaje',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Mensaje'
                    });

                    let depositos = recordLoad.getValue('custrecord_ts_asient_comis_ejec_proc_dat');
                    depositos = JSON.parse(depositos);

                    let AsientosOk = recordLoad.getValue('custrecord_ts_asient_comis_ejec_asien_cr');
                    if (AsientosOk) {
                        AsientosOk = JSON.parse(AsientosOk);
                    } else {
                        AsientosOk = [];
                    }
                    let AsientosError = recordLoad.getValue('custrecord_ts_asient_comis_ejec_asie_err');
                    if (AsientosError) {
                        AsientosError = JSON.parse(AsientosError);
                    } else {
                        AsientosError = [];
                    }


                     for (let i = 0; i < depositos.dataDepositos.length ; i++) {
                         let deposito = depositos.dataDepositos[i];
                        /*deposito = {
                            nro_linea: 3,
                            deposit_id: 442619,
                            deposit_number: "DP-00000031",
                            deposit_date: "17/03/2025",
                            deposit_currency: 5,
                            deposit_currency_name: "Soles",
                            deposit_amount: 17,
                            account_id: 5356,
                            account_name: "ANTICIPOS A PROVEEDORES : ANTICIPOS A PROVEEDORES MN",
                            payment_method: "REMESA EN TRANSITO VISA NET MN",
                            nota_linea: "comisiones",
                            department: null,
                            location: 416,
                            class: null,
                            department_name: null,
                            class_name: null,
                            location_name: "SURQUILLO",
                            subsidiary:3
                            } */

                        sublistResult.setSublistValue({ 
                            id: 'custpage_nro_deposito',
                            line: i,
                            value: deposito.deposit_number
                        });

                        sublistResult.setSublistValue({
                            id: 'custpage_monto_deposito',
                            line: i,
                            value: deposito.deposit_amount
                        });

                        sublistResult.setSublistValue({
                            id: 'custpage_fecha_deposito',
                            line: i,
                            value: deposito.deposit_date
                        });

                        if(AsientosOk.length > 0){
                            let asiento = AsientosOk.find( asiento => asiento.id == deposito.deposit_id);
                            if(asiento){
                                sublistResult.setSublistValue({
                                    id: 'custpage_nro_asiento',
                                    line: i,
                                    value: asiento.asientoComisionId
                                });
                                sublistResult.setSublistValue({
                                    id: 'custpage_estado',
                                    line: i,
                                    value: 'OK'
                                });
                            }
                        }

                        if(AsientosError.length > 0){
                            let asiento = AsientosError.find( asiento => asiento.id == deposito.deposit_id);
                            if(asiento){
                                sublistResult.setSublistValue({
                                    id: 'custpage_estado',
                                    line: i,
                                    value: 'ERROR'
                                });
                                sublistResult.setSublistValue({
                                    id: 'custpage_mensaje',
                                    line: i,
                                    value: asiento.error.message
                                });
                            }
                        }

                     }

                } else {
                    // Bloque ELSE MODIFICADO (Vista de Historial/Filtros)
                    form = serverWidget.createForm({
                        title: 'Ejecución de Comisiones'
                    });
                    form.clientScriptModulePath = './TS_CS_CONS_COMI_EXEC.js';

                    // 🛠️ MODIFICACIÓN 1: Añadir botón de Envío (Submit)
                    form.addSubmitButton({
                        label: 'Aplicar Filtros'
                    });

                    form.addFieldGroup({
                        id: 'custpage_group_filters',
                        label: 'Filtros'
                    });


                    let FechaDesde = form.addField({
                        id: 'custpage_desde',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Desde',
                        container: 'custpage_group_filters'
                    });
                    // Se elimina el valor por defecto aquí y se coloca dentro de la lógica if/else anidada
                    // FechaDesde.defaultValue = new Date();                  

                    let FechaHasta = form.addField({
                        id: 'custpage_hasta',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Hasta',
                        container: 'custpage_group_filters'
                    });
                    // Se elimina el valor por defecto aquí y se coloca dentro de la lógica if/else anidada
                    // FechaHasta.defaultValue = new Date();
                  
                    var sublist = form.addSublist({
                        id: 'custpage_sublist',
                        type: serverWidget.SublistType.LIST,
                        label: 'Asientos de Comisiones',
                    });

                    sublist.addField({
                        id: 'custpage_nro_linea',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Nro Linea'
                    });

                    sublist.addField({
                        id: 'custpage_fecha_inicio',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Fecha Inicio'
                    });

                    sublist.addField({
                        id: 'custpage_fecha_fin',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Fecha Fin'
                    });

                    sublist.addField(
                        {
                            id: 'custpage_estado',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Estado'
                        }
                    )

                    sublist.addField({
                        id: 'custpage_mensaje',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Mensaje'
                    });

                    sublist.addField({
                        id: 'custpage_resultado',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Resultado'
                    });

                    // 🛠️ MODIFICACIÓN 2: Se ELIMINA el botón de refresco de la sublista.
                    // sublist.addRefreshButton();
                 
                    let desde = scriptContext.request.parameters.desde;
                    let hasta = scriptContext.request.parameters.hasta;
                    var searchEjecucions;
                    if (desde && hasta) {
                        log.debug('ENTRO', 'ENTRO');

                        FechaDesde.defaultValue = desde;
                        FechaHasta.defaultValue = hasta;

                        searchEjecucions = search.create(
                            {
                                type: 'customrecord_ts_asient_comis_ejec',
                                filters:
                                    [
                                        ['isinactive', 'is', 'F'],
                                        "AND",
                                        ["custrecord_ts_asient_comis_ejec_fec_ini", "within", desde, hasta]
                                    ],
                                columns:
                                    [
                                        search.createColumn({
                                            name: 'internalid',
                                            sort: search.Sort.DESC
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_fec_ini'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_fec_fin'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_mesj'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_estado'
                                        })
                                    ]
                            }
                        )
                    } else {
                        // 🛠️ MODIFICACIÓN 3: Lógica para 'ENTRO else' (primera carga/sin filtros)
                        log.debug('ENTRO else', 'ENTRO else');

                        // Establece la fecha de hoy como valor por defecto y la mantiene visible en los campos
                        let today = format.format({value: new Date(), type: format.Type.DATE});
                        FechaDesde.defaultValue = today;
                        FechaHasta.defaultValue = today;
                      
                        searchEjecucions = search.create(
                            {
                                type: 'customrecord_ts_asient_comis_ejec',
                                filters:
                                    [
                                        ['isinactive', 'is', 'F'],
                                        "AND",
                                        ["custrecord_ts_asient_comis_ejec_fec_ini", "within", 'today']

                                    ],
                                columns:
                                    [
                                        search.createColumn({
                                            name: 'internalid',
                                            sort: search.Sort.DESC
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_fec_ini'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_fec_fin'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_mesj'
                                        }),
                                        search.createColumn({
                                            name: 'custrecord_ts_asient_comis_ejec_estado'
                                        })
                                    ]
                            }
                        )
                    }

                    let datos = [];
                    searchEjecucions.run().each(function (result) {
                        datos.push({
                            internalid: result.getValue('internalid'),
                            custpage_nro_linea: result.getValue('custrecord_ts_asient_comis_ejec_fec_ini'),
                            custpage_fecha_inicio: result.getValue('custrecord_ts_asient_comis_ejec_fec_ini'),
                            custpage_fecha_fin: result.getValue('custrecord_ts_asient_comis_ejec_fec_fin'),
                            custpage_mensaje: result.getValue('custrecord_ts_asient_comis_ejec_mesj'),
                            custpage_estado: result.getValue('custrecord_ts_asient_comis_ejec_estado'),
                        });
                        return true;
                    });



                    for (let i = 0; i < datos.length; i++) {
                        sublist.setSublistValue({
                            id: 'custpage_nro_linea',
                            line: i,
                            value: i + 1
                        });
                        if (datos[i].custpage_fecha_inicio) {
                            sublist.setSublistValue({
                                id: 'custpage_fecha_inicio',
                                line: i,
                                value: datos[i].custpage_fecha_inicio
                            });
                        }

                        if (datos[i].custpage_fecha_fin) {
                            sublist.setSublistValue({
                                id: 'custpage_fecha_fin',
                                line: i,
                                value: datos[i].custpage_fecha_fin
                            });
                        }

                        if (datos[i].custpage_estado) {
                            sublist.setSublistValue({
                                id: 'custpage_estado',
                                line: i,
                                value: datos[i].custpage_estado
                            });
                        }

                        if (datos[i].custpage_mensaje) {
                            sublist.setSublistValue({
                                id: 'custpage_mensaje',
                                line: i,
                                value: datos[i].custpage_mensaje
                            });
                        }



                        let link = url.resolveScript({
                            scriptId: scriptId,
                            deploymentId: deploymentId,
                            params: {
                                recId: datos[i].internalid,
                                resultFlag: 1
                            }
                        });

                        sublist.setSublistValue({
                            id: 'custpage_resultado',
                            line: i,
                            value: '<a href="' + link + '">Ver Resultado</a>'
                        });
                    }
                }
                scriptContext.response.writePage(form);


            } catch (error) {
                log.error({
                    title: 'Error',
                    details: error
                });
            }
        }

        return { onRequest }

    });
