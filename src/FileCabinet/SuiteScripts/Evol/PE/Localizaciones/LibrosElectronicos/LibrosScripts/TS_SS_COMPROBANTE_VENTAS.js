/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", 'N/compress'],

    (search, record, runtime, log, file, task, config, compress) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_comprobante_ventas';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_comprobante_ventas';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

        /** PARAMETROS */
        var pGloblas = {};
        var searchId = "customsearch_comprobantes_ventas_sunat";
        var parameterId = "custscript_pe_comprobantes_ventas_params";

        /** DATOS DE LA SUBSIDIARIA */
        var companyName = "";
        var companyRuc = "";
        var year = "";
        var month = "";
        var day = "";

        var featureSubsidiary = null;
        var createfile;

        const execute = (scriptContext) => {
            try {
                let getCola = getPendientes();
                log.debug('getCola ', getCola);
                var script = runtime.getCurrentScript();
                var dataArray = JSON.parse(script.getParameter({ name: 'custscript_data_array' }) || '[]');
                log.debug('dataArray', dataArray.length);
                if (getCola.length > 0) {
                    let params = getCola[0].param;
                    params = JSON.parse(params);
                    let idCola = getCola[0].id;
                    params.parametros.idCola = idCola;
                    main(params.parametros, scriptContext);
                    try {
                        let scriptTask = task.create({
                            taskType: TIPO_SCRIPT,
                            scriptId: SCRIPT_ID,
                            deploymentId: DEPLOYMENT_ID
                        });
                        let scriptTaskId = scriptTask.submit();
                    } catch (error) {
                        log.error('Error', error);
                    }

                }

            } catch (error) {
                log.error('Error', error);
            }
        }

        const main = (parametros, scriptContext) => {
            log.debug('Iniciando main', 'Función main iniciada');
            log.debug('parametros recibidos', parametros);
            log.debug('parametros type', typeof parametros);
            try {

                /**
                 * Zona de desarrollo
                 */
                log.debug('parametros.idCola', parametros ? parametros.idCola : 'parametros es null');
                const params = getParams(parametros);
                log.debug('params después de getParams', params);
                featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                log.debug('featureSubsidiary', featureSubsidiary);

                var script = runtime.getCurrentScript();
                log.debug('script en main', script != null ? 'Existe' : 'No existe');
                var dataArrayStr = script.getParameter({ name: 'custscript_data_array' });
                log.debug('dataArrayStr en main', dataArrayStr);
                var dataArray = JSON.parse(script.getParameter({ name: 'custscript_data_array' }) || '[]');
                log.debug('dataArray en main', dataArray);
                log.debug('dataArray type en main', typeof dataArray);
                log.debug('dataArray es array en main', Array.isArray(dataArray));

                if (dataArray) {
                    log.debug('dataArray exists', 'Sí existe');
                    if (Array.isArray(dataArray)) {
                        log.debug('dataArray es un array', 'Sí es un array');
                        log.debug('dataArray.length', dataArray.length);

                        if (dataArray.length) {
                            log.debug('Entrando a ejecutarcreacion', 'dataArray tiene elementos');
                            ejecutarcreacion(dataArray, params, parametros.idCola, script);
                            return true;
                        }
                    } else {
                        log.error('dataArray no es un array', typeof dataArray);
                    }
                } else {
                    log.error('dataArray es undefined o null', dataArray);
                }

                if (dataArray.length) {
                    ejecutarcreacion(dataArray, params, parametros.idCola, script);
                    return true;
                }
                const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);
                log.debug('searchbook', searchbook.content.length);
                log.debug('params', params);
                //----------------------------------------------------//
                //log.debug("Entro al summarize");
                //getParameters();
                getSubdiary(params.filterSubsidiary);

                let param_update_cola = {
                    idCola: parametros.idCola,
                    estado: 'PROCESANDO'
                };

                var createrecord = updateCola(param_update_cola);

                year = new Date().getFullYear();
                month = CompletarCero(2, new Date().getMonth() + 1);
                day = CompletarCero(2, new Date().getDate());

                var jsonAxiliar = getJsonData(searchbook.content);
                // log.debug("jsonAxiliar", jsonAxiliar);

                if (searchbook.thereisinfo == 1) {

                    // log.debug("mirame de nuevo", JSON.stringify(jsonAxiliar.movements));

                    var data = jsonAxiliar.movements;
                    var groups = [];
                    var currentGroup = {};

                    for (var key in data) {
                        currentGroup[key] = data[key];
                        if (Object.keys(currentGroup).length === 100) {
                            groups.push(currentGroup);
                            currentGroup = {};
                        }
                    }

                    // Añade el último grupo si no contiene 100 elementos
                    if (Object.keys(currentGroup).length > 0) {
                        groups.push(currentGroup);
                    }

                    ejecutarcreacion(groups, params, parametros.idCola, script);
                    /*  let fileAux = file.load({
                         id: createfile
                     });
 
                     param_update_cola = {
                         idCola: parametros.idCola,
                         estado: 'FINALIZADO',
                         fechaFin: new Date(),
                         mensaje: 'Cantidad de Registros: ' + searchbook.content.length,
                         urlArchivo: fileAux.url,
                         nombreArchivo: fileAux.name
                     };
 
                     const statusProcess = updateCola(param_update_cola); */

                    return true;
                } else {
                    param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'FINALIZADO',
                        fechaFin: new Date(),
                        mensaje: 'No hay registros'
                    };
                    var createrecord = updateCola(param_update_cola);
                }
                /**
                 * Zona de desarrollo
                 */

            } catch (error) {
                log.error('main Error', error);
                try {
                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        mensaje: error.message,
                        fechaFin: new Date()
                    }
                    updateCola(param_update_cola);
                } catch (error) {
                    log.error('main param_update_cola Error', error);
                }
            }
        }
        function ejecutarcreacion(groups, params, idcola, script) {
            var idfiles = [];
            let gzippedFile = compress.createArchiver();
            let Name0 = getFileName(0);
            for (var i = 0; i < groups.length; i++) {

                let counter = i + 1;
                counter = ("0000" + counter).slice(-4);
                let structureBodyData = structureBody(groups[i]);
                createfile = saveFile(structureBodyData, counter, params);
                gzippedFile.add(
                    {
                        file: createfile
                    }
                )
                /*let fileAux = file.load({
                    id: createfile
                });
                idfiles.push(fileAux);

                if (i != 0) {
                    let new_line_cola = record.copy(
                        {
                            type: 'customrecord_ts_le_cola_ejecuciones',
                            id: idcola
                        }
                    )
                    let id_new_line_cola = new_line_cola.save();
                    let newName = fileAux.name + ' - ' + (i + 1);

                    param_update_cola = {
                        idCola: id_new_line_cola,
                        estado: 'FINALIZADO',
                        fechaFin: new Date(),
                        mensaje: 'Parte : ' + (i + 1) + ' de ' + groups.length,
                        urlArchivo: fileAux.url,
                        nombreArchivo: newName
                    };
                    let statusProcess = updateCola(param_update_cola);

                } else {
                    param_update_cola = {
                        idCola: idcola,
                        estado: 'FINALIZADO',
                        fechaFin: new Date(),
                        mensaje: 'Parte : ' + (i + 1) + ' de ' + groups.length,
                        urlArchivo: fileAux.url,
                        nombreArchivo: fileAux.name
                    };
                    let statusProcess = updateCola(param_update_cola);
                }*/
                var remainingUsage = script.getRemainingUsage();
                if (remainingUsage < 100) {
                    log.debug('total ', idfiles);
                    log.debug('Ejecución detenida', 'Capacidad baja: ' + remainingUsage);

                    reprogramarScript(groups.slice(i));
                    return;
                }

            }
            let varzipFile = gzippedFile.archive({
                name: Name0 + '.zip'
            });

            varzipFile.folder = params.fileCabinetId;
            var zipFile = varzipFile.save();
            let cargarFile = file.load({
                id: zipFile
            });
            param_update_cola = {
                idCola: idcola,
                estado: 'FINALIZADO',
                fechaFin: new Date(),
                mensaje: 'PROCESADO TERMINADO',
                urlArchivo: cargarFile.url,
                nombreArchivo: cargarFile.name
            };
            let statusProcess = updateCola(param_update_cola);

        }
        function reprogramarScript(remainingData) {

            log.debug('remainingData', remainingData);
            var scriptTask = task.create({
                taskType: TIPO_SCRIPT,
                scriptId: SCRIPT_ID,
                deploymentId: DEPLOYMENT_ID,
                params: {
                    custscript_data_array: JSON.stringify(remainingData)
                }
            });

            var taskId = scriptTask.submit();

        }

        /**
         * 
         * @param {Object} params
         * Estados: (1) PENDIENTE, (2) PROCESANDO, (3) ERROR, (4) FINALIZADO
         */
        const updateCola = (params) => {
            try {
                let cola = record.load({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    id: params.idCola
                });

                if (params.estado) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_estado_ejecu', value: params.estado });
                }
                if (params.fechaFin) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_cola_fecha_fin', value: params.fechaFin });
                }
                if (params.mensaje) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_estado_mens', value: params.mensaje });
                }
                if (params.urlArchivo) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_url_archivo', value: params.urlArchivo });
                }
                if (params.nombreArchivo) {
                    cola.setValue({ fieldId: 'custrecord_ts_le_nombre_archivo', value: params.nombreArchivo });
                }


                cola.save();
            } catch (error) {
                log.error('updateCola Error', error);
            }
        }

        const getPendientes = () => {
            try {
                let cola = [];

                let searchCola = search.create({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custrecord_ts_le_estado_ejecu', 'is', 'PENDIENTE'],
                        'AND',
                        ['custrecord_ts_le_cola_script_id', 'is', SCRIPT_ID],
                        'AND',
                        ['custrecord_ts_le_cola_id_deploy', 'is', DEPLOYMENT_ID]
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_param' }),
                    ]

                });

                searchCola.run().each(function (result) {
                    let obj = {
                        id: result.getValue({ name: 'internalid' }),
                        fechaInicio: result.getValue({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        param: result.getValue({ name: 'custrecord_ts_le_cola_param' })
                    }

                    cola.push(obj);
                    return true;
                });

                //ordenamos la cola por fecha de inicio 
                cola.sort((a, b) => {
                    return new Date(a.fechaInicio) - new Date(b.fechaInicio);
                });


                return cola;


            } catch (error) {
                log.error('Error', error);
            }
        }

        const searchBook = (subsidiary, period, searchId, featureSubsidiary) => {
            try {
                log.debug('Iniciando searchBook', 'subsidiary: ' + subsidiary + ', period: ' + period);
                var arrResult = [];
                var _cont = 0;

                var savedSearch = search.load({ id: searchId });
                log.debug('savedSearch cargado', savedSearch != null ? 'Sí' : 'No');

                if (featureSubsidiary) {
                    savedSearch.filters.push(
                        search.createFilter({
                            name: "subsidiary",
                            operator: search.Operator.IS,
                            values: subsidiary,
                        })
                    );
                }

                savedSearch.filters.push(
                    search.createFilter({
                        name: "postingperiod",
                        operator: search.Operator.ANYOF,
                        values: period,
                    })
                );

                // Add filter to exclude transactions with memo "VOID"
                savedSearch.filters.push(
                    search.createFilter({
                        name: "memo",
                        operator: search.Operator.ISNOT,
                        values: "VOID"
                    })
                );

                let searchResultCount = savedSearch.runPaged().count;
                log.debug("searchResultCount", searchResultCount);
                // log.debug("searchResultCount", searchResultCount);

                var pagedData = savedSearch.runPaged({ pageSize: 1000 });
                var page, columns;

                if (pagedData.pageRanges.length > 0) {
                    pagedData.pageRanges.forEach(function (pageRange) {
                        page = pagedData.fetch({ index: pageRange.index });

                        page.data.forEach(function (result) {
                            columns = result.columns;
                            arrAux = new Array();
                            // log.debug("result", result);

                            arrAux[0] = result.getValue(columns[0]);
                            arrAux[1] = result.getValue(columns[1]);
                            arrAux[2] = result.getValue(columns[2]);
                            arrAux[3] = result.getValue(columns[3]);
                            arrAux[4] = result.getValue(columns[4]);
                            arrAux[5] = result.getValue(columns[5]);
                            if (result.getValue(columns[1]) === '07') {
                                arrAux[5] = Math.abs(parseFloat(arrAux[5]));
                            }
                            arrResult.push(
                                {
                                    column01: arrAux[0],
                                    column02: arrAux[1],
                                    column03: arrAux[2],
                                    column04: arrAux[3],
                                    column05: arrAux[4],
                                    column06: Number(arrAux[5]).toFixed(2)
                                }
                            );
                        });
                    });
                    return { thereisinfo: 1, content: arrResult };
                }
                if (arrResult.length > 0) {
                    log.debug('arrResult tiene datos', arrResult.length);
                    return { thereisinfo: 1, content: arrResult };
                }

                log.debug('No hay resultados en searchBook', 'Devolviendo thereisinfo: 0');
                return { thereisinfo: 0, content: [] }; // Añadir array vacío

                //return { thereisinfo: 0 }


            } catch (e) {
                log.error({ title: 'Error en searchBook', details: e });
                log.error('Error stack en searchBook', e.stack);
                return { thereisinfo: 0, content: [] };
            }
        }

        const getParams = (parametros) => {
            try {
                return {
                    filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
                    filterPostingPeriod: parametros.custbody_ts_le_periodo,
                    filterFormat: parametros.salida_reporte_nombre,
                    fileCabinetId: parametros.salida_folder
                }
            } catch (e) {
                log.error({ title: 'getParams', details: e });
            }
        }

        function divisionRedondeoArriba(dividendo, divisor) {
            if (divisor === 0) {
                throw new Error("El divisor no puede ser cero.");
            }

            var resultado = dividendo / divisor;
            var enteroResultado = parseInt(resultado); // Obtén la parte entera

            if (resultado > 0 && resultado !== enteroResultado) {
                return enteroResultado + 1;
            } else if (resultado < 0 && resultado !== enteroResultado) {
                return enteroResultado; // Si el resultado es negativo, no se redondea hacia arriba
            } else {
                return enteroResultado; // Si no hay fracción decimal, no se redondea
            }
        }

        const getJsonData = (transactions) => {
            let userTemp = runtime.getCurrentUser(),
                jsonTransacion = {};

            for (var k in transactions) {
                // log.debug("kkkkkkkk", k);
                // log.debug("transactions[k]", transactions[k]);

                jsonTransacion[k] = {
                    column01: transactions[k].column01,
                    column02: transactions[k].column02,
                    column03: transactions[k].column03,
                    column04: transactions[k].column04,
                    column05: transactions[k].column05,
                    column06: transactions[k].column06,
                    // column06: Number(transactions[k].column06).toFixed(2),
                };

            }


            var jsonAxiliar = {
                movements: jsonTransacion
            };

            return jsonAxiliar;
        };

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
        };

        const getFileName = (counter) => {
            return `${companyRuc}${year}${month}${day}${counter}.txt`;
        };

        const saveFile = (structuregbody, counter, params) => {

            let structureBody = structuregbody.replace(/\r?\n$/, '');

            let nameReport = getFileName(counter);
            var folderID = params.fileCabinetId;//libPe.callFolder();

            const fileObj = file.create({
                name: nameReport,
                fileType: file.Type.PLAINTEXT,
                contents: structureBody,
                encoding: file.Encoding.UTF8,
                folder: folderID,
                isOnline: true,
            });
            // const fileId = fileObj.save();

            return fileObj;

            /*var urlfile = file.load({
                id: fileId,
            }).url;
        
            log.debug("urlfile", urlfile);
            libPe.loadLog(recordID, nameReport, urlfile);*/
        };

        const getSubdiary = (pSubsidiary) => {
            if (featureSubsidiary) {
                var dataSubsidiary = record.load({
                    type: "subsidiary",
                    id: pSubsidiary,
                });
                companyName = dataSubsidiary.getValue("legalname");
                companyRuc = dataSubsidiary.getValue("federalidnumber");
            } else {
                companyName = config.getFieldValue("legalname");
                companyRuc = "";
            }
        };

        const isObjEmpty = (obj) => {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) return false;
            }

            return true;
        };

        function CompletarCero(tamano, valor) {
            var strValor = valor + "";
            var lengthStrValor = strValor.length;
            var nuevoValor = valor + "";

            if (lengthStrValor <= tamano) {
                if (tamano != lengthStrValor) {
                    for (var i = lengthStrValor; i < tamano; i++) {
                        nuevoValor = "0" + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0, tamano);
            }
        }

        const structureBody = (searchResult) => {
            let contentReport = "";
            try {
                let searchResultCount = searchResult.length;
                for (let i in searchResult) {
                    contentReport =
                        contentReport +
                        searchResult[i].column01 +
                        "|" +
                        searchResult[i].column02 +
                        "|" +
                        searchResult[i].column03 +
                        "|" +
                        searchResult[i].column04 +
                        "|" +
                        searchResult[i].column05 +
                        "|" +
                        searchResult[i].column06;
                    if (parseInt(i) !== searchResultCount - 1) {
                        contentReport = contentReport + "\n";
                    }
                }
                return contentReport;
            } catch (e) {
                log.error({ title: "structureBody", details: e });
            }
        };

        return { execute }

    });