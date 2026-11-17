/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/compress"],

    (search, record, runtime, log, file, task, config, compress) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_comprobante_compras';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_comprobante_compras';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

        /** PARAMETROS */
        var pGloblas = {};
        var searchId = "customsearch_comprobantes_compras_sunat";
        var searchId2 = "customsearch_compr_compras_sunat_er";
        var parameterId = "custscript_pe_comprobantes_compras_param";
        const documentType = ["01", "03", "07", "08", "R1", "R7", "04", "23"];
        const linesPerFile = 100;

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
            try {

                /**
                 * Zona de desarrollo
                 */
                const params = getParams(parametros);
                featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, searchId2, featureSubsidiary);
                log.debug('searchbook', searchbook);
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
                log.debug("year", year);
                month = CompletarCero(2, new Date().getMonth() + 1);
                log.debug("month", month);
                day = CompletarCero(2, new Date().getDate());
                log.debug("day", day);

                var jsonAxiliar = getJsonData(searchbook.content);
                // log.debug("jsonAxiliar", jsonAxiliar);

                if (searchbook.thereisinfo == 1) {

                    // log.debug("mirame de nuevo", JSON.stringify(jsonAxiliar.movements));
                    let uniqueEntries = {};
                    let result = {};
                    var data = jsonAxiliar.movements;
                    Object.keys(data).forEach(key => {
                        let item = data[key];

                        // 🔹 Generamos una clave única basada en columnas clave
                        let uniqueKey = `${item.column01}-${item.column03}-${item.column04}`;

                        if (!uniqueEntries[uniqueKey]) {
                            uniqueEntries[uniqueKey] = item;
                        }
                    });

                    // 🔹 Reconstruimos la estructura original con índices consecutivos
                    let index = 0;
                    Object.values(uniqueEntries).forEach(item => {
                        result[index++] = item;
                    });


                    let arrGroups = splitIntoGroups(result, linesPerFile);
                    let zipFileData = compress.createArchiver();
                    let getName = getFileName(0);

                    for (var i = 0; i < arrGroups.length; i++) {
                        let recordId = '';//libPe.createLog(pGloblas.pSubsidiary, pGloblas.pPeriodo, "Comprobantes de Compras");
                        let counter = i + 1;
                        counter = ("0000" + counter).slice(-4);
                        let content = structureContent(arrGroups[i]);
                        createfile = saveFile(content, counter, recordId, params);

                        zipFileData.add(
                            {
                                file: createfile
                            }
                        )
                    }

                    let zipFile = zipFileData.archive({
                        name: getName + '.zip'
                    });

                    zipFile.folder = params.fileCabinetId;
                    let zipId = zipFile.save();
                    log.debug('zipFile', zipFile);

                    let zipFileId = file.load({
                        id: zipId
                    });

                    param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'FINALIZADO',
                        fechaFin: new Date(),
                        mensaje: 'Archivo generado correctamente',
                        urlArchivo: zipFileId.url,
                        nombreArchivo: zipFileId.name
                    };

                    updateCola(param_update_cola);

                    let scriptObj = runtime.getCurrentScript();
                    log.debug('Remaining governance units: ' + scriptObj.getRemainingUsage());

                    /* 
                           let fileAux = file.load({
                            id: createfile
                        });
                         if (i == 0) {
                            param_update_cola = {
                                idCola: parametros.idCola,
                                estado: 'FINALIZADO',
                                fechaFin: new Date(),
                                mensaje: 'Parte : ' + (i + 1) + ' de ' + arrGroups.length,
                                urlArchivo: fileAux.url,
                                nombreArchivo: fileAux.name
                            };

                            let statusProcess = updateCola(param_update_cola);
                        } else {
                            let new_line_cola = record.copy({
                                type: 'customrecord_ts_le_cola_ejecuciones',
                                id: parametros.idCola
                            });

                            let id_new_line_cola = new_line_cola.save();

                            let newName = fileAux.name.split('.')[0] + '_' + i + '.' + fileAux.name.split('.')[1];

                            param_update_cola = {
                                idCola: id_new_line_cola,
                                estado: 'FINALIZADO',
                                fechaFin: new Date(),
                                mensaje: 'Parte : ' + (i + 1) + ' de ' + arrGroups.length,
                                urlArchivo: fileAux.url,
                                nombreArchivo: newName
                            };

                            let statusProcess = updateCola(param_update_cola);
                        }
                    */

                    /* arrGroups.forEach(function (group, index) {
                        let recordId = '';//libPe.createLog(pGloblas.pSubsidiary, pGloblas.pPeriodo, "Comprobantes de Compras");
                        let counter = index + 1;
                        counter = ("0000" + counter).slice(-4);
                        let content = structureContent(group);
                        createfile = saveFile(content, counter, recordId, params);
                    }); */


                    /*     log.debug('1. ingresó', createfile);
                        let fileAux = file.load({ 
                            id: createfile
                        }); 
                        
                        param_update_cola = {
                            idCola: parametros.idCola,
                            estado: 'FINALIZADO',
                            fechaFin: new Date(),
                            urlArchivo: fileAux.url,
                            nombreArchivo: fileAux.name 
                        };
                        
                        const statusProcess = updateCola(param_update_cola);
                        log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' }); */

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

        const searchBook = (subsidiary, period, searchId, searchId2, featureSubsidiary) => {
            try {
                var arrResult = [];
                var _cont = 0;

                var savedSearch = search.load({ id: searchId });

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

                let searchResultCount = savedSearch.runPaged().count;
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
                            //Validamos si el monto empieza con . para agregar un 0
                            if (arrAux[5].startsWith(".")) {
                                arrAux[5] = "0" + arrAux[5];
                            }
                            arrAux[6] = result.getValue(columns[6]);
                            arrResult.push(
                                {
                                    column01: arrAux[0],
                                    column02: arrAux[1],
                                    column03: arrAux[2],
                                    column04: arrAux[3],
                                    column05: arrAux[4],
                                    column06: arrAux[5],
                                    column07: arrAux[6],
                                }
                            );
                        });
                    });

                }


                let searchload2 = search.load({ id: searchId2 });

                if (featureSubsidiary) {
                    searchload2.filters.push(
                        search.createFilter({
                            name: "subsidiary",
                            operator: search.Operator.IS,
                            values: subsidiary,
                        })
                    );
                }

                searchload2.filters.push(
                    search.createFilter({
                        name: "postingperiod",
                        operator: search.Operator.ANYOF,
                        values: period,
                    })
                );


                let searchResultCount2 = searchload2.runPaged().count;
                // log.debug("searchResultCount2", searchResultCount2);

                var pagedData2 = searchload2.runPaged({ pageSize: 1000 });
                var page2, columns2;
                if (pagedData2.pageRanges.length > 0) {
                    pagedData2.pageRanges.forEach(function (pageRange) {
                        page2 = pagedData2.fetch({ index: pageRange.index });
                        page2.data.forEach(function (result) {
                            columns2 = result.columns;
                            arrAux = new Array();
                            // log.debug("result", result);
                            arrAux[0] = result.getValue(columns2[0]);
                            arrAux[1] = result.getValue(columns2[1]);
                            arrAux[2] = result.getValue(columns2[2]);
                            arrAux[3] = result.getValue(columns2[3]);
                            arrAux[4] = result.getValue(columns2[4]);
                            arrAux[5] = result.getValue(columns2[5]);
                            //Validamos si el monto empieza con . para agregar un 0


                            if (arrAux[5].startsWith(".")) {
                                arrAux[5] = "0" + arrAux[5];
                            }
                            arrAux[6] = result.getValue(columns2[6]);
                            arrResult.push(
                                {
                                    column01: arrAux[0],
                                    column02: arrAux[1],
                                    column03: arrAux[2],
                                    column04: arrAux[3],
                                    column05: arrAux[4],
                                    column06: arrAux[5],
                                    column07: arrAux[6],
                                }
                            );
                        });
                    });
                }

                if (arrResult.length > 0) {
                    return { thereisinfo: 1, content: arrResult };
                } else {
                    return { thereisinfo: 0 };
                }

            } catch (e) {
                log.error({ title: 'searchBook', details: e });
            }
        }

        //<I> rhuaccha: 2024-05-08
        function splitIntoGroups(datos, groupSize) {
            try {
                var groups = [];
                var currentGroup = [];
                Object.keys(datos).forEach(function (key) {
                    currentGroup.push(datos[key]);
                    // Si el tamaño del grupo se alcanza, agregar el grupo al arreglo de grupos y reiniciar el grupo actual
                    if (currentGroup.length === groupSize) {
                        groups.push(currentGroup);
                        currentGroup = [];
                    }

                });
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                return groups;
            } catch (error) {
                console.log(error);
            }
        };

        const structureContent = (group) => {
            let contentReport = "";
            try {
                // Iterar sobre cada registro dentro del grupo
                group.forEach(function (record, index) {
                    var montos = record.column07 == 1 ? '0.00' : (Number(record.column06) === 0 ? '0.00' : record.column06);
                    contentReport +=
                        record.column01 + "|" +
                        record.column02 + "|" +
                        record.column03 + "|" +
                        record.column04 + "|" +
                        record.column05 + "|" +
                        montos;
                    if (index < group.length - 1) {
                        contentReport += "\n";
                    }
                });

                return contentReport;
            } catch (e) {
                log.error({ title: "structureContent", details: e.message });
                return "";
            }
        };
        //<F> rhuaccha: 2024-05-08

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
                    column07: transactions[k].column07,
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
            return `${companyRuc}${year}${month}${day}${counter}`;
        };

        const saveFile = (structuregbody, counter, recordID, params) => {

            // log.debug("structuregbody dentro del save", structuregbody);
            let structureBody = structuregbody.replace(/\r?\n$/, '');

            let nameReport = getFileName(counter) + ".txt";
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
                //log.debug(pGloblas.pSubsidiary, pGloblas.pSubsidiary);
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

        const getParameters = () => {
            pGloblas = objContext.getParameter(parameterId); // || {};
            pGloblas = JSON.parse(pGloblas);
            // log.debug("previo", pGloblas);
            // pGloblas = {
            //   recordID: 0,
            //   reportID: 62,
            //   subsidiary: 3,
            //   periodCon: 116,
            //   anioCon: "2023",
            //   format: "TXT",
            //   startDate: "01/11/2023",
            //   endDate: "07/11/2023"
            // };

            pGloblas = {//periodCon
                pSubsidiary: pGloblas.subsidiary,
                pFormat: pGloblas.format,
                pPeriodo: pGloblas.periodCon,
            };
            log.debug("XDDD", pGloblas);

            featureSubsidiary = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
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
                // log.debug("searchResult", searchResult);
                for (let i in searchResult) {
                    var montos = searchResult[i].column07 == 1 ? '0.00' : (Number(searchResult[i].column06) === 0 ? '0.00' : searchResult[i].column06);
                    // log.debug("searchResult[" + i + "]", searchResult[i]);
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
                        montos;
                    if (parseInt(i) != searchResultCount - 1) {
                        contentReport += "\n";
                    }
                }
                return contentReport;
            } catch (e) {
                log.error({ title: "structureBody", details: e });
            }
        };

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

        return { execute }

    });