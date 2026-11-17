/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url'],

    function (url) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

            try {
                let currentRecord = scriptContext.currentRecord;
                console.log('JCEC', scriptContext);
                if (scriptContext.fieldId == 'custpage_fecha_desde' || scriptContext.fieldId == 'custpage_fecha_hasta' || scriptContext.fieldId == 'custpage_reportes_tab') {


                    let params_filter = {
                        fecha_desde: (currentRecord.getValue({ fieldId: 'custpage_fecha_desde' })) ? currentRecord.getValue({ fieldId: 'custpage_fecha_desde' }) : new Date(),
                        fecha_hasta: (currentRecord.getValue({ fieldId: 'custpage_fecha_hasta' })) ? currentRecord.getValue({ fieldId: 'custpage_fecha_hasta' }) : new Date(),
                        reporte: currentRecord.getText({ fieldId: 'custpage_reportes_tab' })
                    }
                 

                    let reporte_param = currentRecord.getValue({ fieldId: 'custpage_cbo_reportes' });
                    let ruta = '';
                    if (reporte_param) {

                        let params_report = {
                            reporte: currentRecord.getValue({
                                fieldId: 'custpage_cbo_reportes'
                            })
                        }

                        ruta = url.resolveScript({
                            scriptId: 'customscript_ts_sl_le_libros_electro',
                            deploymentId: 'customdeploy_ts_sl_le_libros_electro',
                            params: {
                                custscript_ts_sl_le_params_filtro: JSON.stringify(params_filter),
                                custscript_ts_sl_le_params: JSON.stringify(params_report)
                            },
                            returnExternalUrl: false
                        });

                    } else {
                        ruta = url.resolveScript({
                            scriptId: 'customscript_ts_sl_le_libros_electro',
                            deploymentId: 'customdeploy_ts_sl_le_libros_electro',
                            params: {
                                custscript_ts_sl_le_params_filtro: JSON.stringify(params_filter)
                            },
                            returnExternalUrl: false
                        });
                    }

                    setWindowChanged(window, false);
                    window.location.href = ruta;
                }

                //validamos si el cambio custpage_cbo_reportes a cambiado
                if (scriptContext.fieldId == 'custpage_cbo_reportes') {
                    //obtenemos el valor seleccionado
                    if (currentRecord.getValue({ fieldId: 'custpage_cbo_reportes' }) != '') {
                        let reporte = currentRecord.getValue({
                            fieldId: 'custpage_cbo_reportes'
                        });

                        let params = {
                            reporte: reporte
                        }

                        console.log(params);

                        params = JSON.stringify(params);
                        //Llamamos al Suitelet
                        window.onbeforeunload = null;
                        let ruta = url.resolveScript({
                            scriptId: 'customscript_ts_sl_le_libros_electro',
                            deploymentId: 'customdeploy_ts_sl_le_libros_electro',
                            params: {
                                custscript_ts_sl_le_params: params
                            },
                            returnExternalUrl: false
                        });

                        setWindowChanged(window, false);
                        window.location.href = ruta;
                    }
                } else {
                    let parametros = currentRecord.getValue({ fieldId: 'custpage_parametros_buscados' });
                    parametros = JSON.parse(parametros);
                    //recorremos los parametros y tomamos el valor de cada uno y lo guardamos en el objeto params_select
                    let params_select = {
                        parametros: {},
                        reporte: {},
                        etiquetas: []
                    };
                    parametros.forEach(parametro => {
                        if (parametro.tipo_param == 'SELECT') {


                            params_select.parametros[parametro.id_param] = currentRecord.getValue({ fieldId: parametro.id_param });
                            //agregamos el valor del texto
                            params_select.etiquetas.push({
                                etiqueta: parametro.name_param,
                                valor: currentRecord.getText({ fieldId: parametro.id_param })
                            });
                        } else {
                            params_select.parametros[parametro.id_param] = currentRecord.getValue({ fieldId: parametro.id_param });
                            //agregamos el valor del texto
                            params_select.etiquetas.push({
                                etiqueta: parametro.name_param,
                                valor: currentRecord.getValue({ fieldId: parametro.id_param })
                            });
                        }

                    });

                    //añadimos el tipo de salida del reporte 
                    let salida_reporte = currentRecord.getValue({ fieldId: 'custpage_salidas' });

                    let salida_reporte_nombre = currentRecord.getText({ fieldId: 'custpage_salidas' });

                    //añadimos el reporte
                    let reporte = currentRecord.getValue({ fieldId: 'custpage_cbo_reportes' });

                    let reporte_nombre = currentRecord.getText({ fieldId: 'custpage_cbo_reportes' });
                    params_select.parametros.salida_reporte_nombre = salida_reporte_nombre;

                    params_select.reporte = {
                        id_reporte: reporte,
                        nombre_reporte: reporte_nombre,
                        salida: salida_reporte,
                        salida_nombre: salida_reporte_nombre
                    };
                    params_select = JSON.stringify(params_select);
                    //lo guardamos en el campo hidden
                    try {
                        currentRecord.setValue({ fieldId: 'custpage_parametros_select', value: params_select });
                    } catch (error) {
                        console.error('Error al insertar Parametros', error);
                    }
                }


            } catch (error) {
                console.error(error);
            }
        }


        const getEjecuciones = (params) => {
            try {
                let respuesta = [];

                let customrecord_ts_le_ejecucionesSearchObj = search.create({
                    type: "customrecord_ts_le_cola_ejecuciones",
                    // filters:
                    //     [
                    //         ["custrecord_ts_le_cola_fecha_inicio", "within", "17/02/2025 12:00 am", "17/02/2025 11:59 pm"]
                    //     ],
                    columns:
                        [
                            search.createColumn({ name: "custrecord_ts_le_cola_reporte" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_salida" }),
                            search.createColumn({ name: "custrecord_ts_le_estado_ejecu" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_fecha_inicio", sort: search.Sort.DESC }),
                            search.createColumn({ name: "custrecord_ts_le_cola_fecha_fin" }),
                            search.createColumn({ name: "custrecord_ts_le_usuario_cola" }),
                            search.createColumn({ name: "custrecord_ts_le_url_archivo" }),
                            search.createColumn({ name: "custrecord_ts_le_estado_mens" }),
                            search.createColumn({ name: "custrecord_ts_le_cola_param" }),



                        ]

                });
                let fecha_desde = new Date();
                fecha_desde = fecha_desde.toISOString();
                fecha_desde = fecha_desde.split('T');
                fecha_desde = fecha_desde[0].split('-');
                fecha_desde = fecha_desde[2] + '/' + fecha_desde[1] + '/' + fecha_desde[0] + ' 12:00 am';
                if (params.fecha_desde) {
                    //le damos formato a la fecha desde y hasta 17/02/2025 12:00 am
                    fecha_desde = params.fecha_desde.toISOString();
                    fecha_desde = fecha_desde.split('T');
                    fecha_desde = fecha_desde[0].split('-');
                    fecha_desde = fecha_desde[2] + '/' + fecha_desde[1] + '/' + fecha_desde[0] + ' 12:00 am';
                }

                let fecha_hasta = new Date();
                fecha_hasta = fecha_hasta.toISOString();
                fecha_hasta = fecha_hasta.split('T');
                fecha_hasta = fecha_hasta[0].split('-');
                fecha_hasta = fecha_hasta[2] + '/' + fecha_hasta[1] + '/' + fecha_hasta[0] + ' 11:59 pm';

                if (params.fecha_hasta) {
                    fecha_hasta = params.fecha_hasta.toISOString();
                    fecha_hasta = fecha_hasta.split('T');
                    fecha_hasta = fecha_hasta[0].split('-');
                    fecha_hasta = fecha_hasta[2] + '/' + fecha_hasta[1] + '/' + fecha_hasta[0] + ' 11:59 pm';
                }

                customrecord_ts_le_ejecucionesSearchObj.filters.push(search.createFilter({
                    name: 'custrecord_ts_le_cola_fecha_inicio',
                    operator: search.Operator.WITHIN,
                    // values: ["17/02/2025 12:00 am", "17/02/2025 11:59 pm"]
                    values: [fecha_desde, fecha_hasta]
                }));

                //paginamos la busqueda
                let pagedData = customrecord_ts_le_ejecucionesSearchObj.runPaged({
                    pageSize: 1000
                });

                if (pagedData.count > 0) {
                    let pageIndex = 0;

                    // Iterar a través de cada página
                    do {
                        // Obtener la página actual
                        let currentPage = pagedData.fetch({ index: pageIndex });
                        currentPage.data.forEach(function (result) {
                            respuesta.push({
                                reporte: result.getValue({ name: 'custrecord_ts_le_cola_reporte' }),
                                salida: result.getValue({ name: 'custrecord_ts_le_cola_salida' }),
                                estado: result.getValue({ name: 'custrecord_ts_le_estado_ejecu' }),
                                fecha_inicio: result.getValue({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                                fecha_fin: result.getValue({ name: 'custrecord_ts_le_cola_fecha_fin' }),
                                usuario: result.getText({ name: 'custrecord_ts_le_usuario_cola' }),
                                url_archivo: result.getValue({ name: 'custrecord_ts_le_url_archivo' }),
                                mensaje: result.getValue({ name: 'custrecord_ts_le_estado_mens' }),
                                reporte_params: result.getValue({ name: 'custrecord_ts_le_cola_param' }),
                            });
                        });
                        pageIndex++;
                    } while (pageIndex < pagedData.pageRanges.length)
                }

                return respuesta;

            } catch (error) {
                log.error('Error al obtener las ejecuciones', error);

            }
        }


        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            /* postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord */
        };

    });
