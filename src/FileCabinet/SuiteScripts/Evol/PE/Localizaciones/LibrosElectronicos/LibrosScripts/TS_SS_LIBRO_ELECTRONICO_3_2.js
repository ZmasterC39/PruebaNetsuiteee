/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, format, render) => {

        /**
      * Defines the Scheduled script trigger point.
      * @param {Object} scriptContext 
      * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
      * @since 2015.2
      */

        const SCRIPT_ID = 'customscript_ts_ss_le_3_2';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_2';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;


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
                try {
                    const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                    const searchId = 'customsearch_pe_detalle_10_3_2'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
                    let fedIdNumb = '';
                    let hasinfo = 0;


                    const params = getParams(parametros);


                    if (featureSubsidiary) {
                        const getruc = getSubsidiaria(params.filterSubsidiary, 'ruc')
                        fedIdNumb = getruc;
                    } else {
                        const employerid = getEmployerID();
                        fedIdNumb = employerid;
                    }

                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'PROCESANDO'
                    };

                    var createrecord = updateCola(param_update_cola);

                    var searchbook = {};
                    if (params.filterFormat === 'PDF') {
                        searchbook = getTransactions(params);
                    } else {
                        searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary, params.filterAnioPeriod);
                    }
                    
                    if (searchbook.thereisinfo == 1) {
                        hasinfo = '1';
                        const transactionJSON = searchbook.content;//structureBody(searchbook.content);
                        const createfile = createFile(params, fedIdNumb, hasinfo, transactionJSON);


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
                        log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' });
                    } else {
                        param_update_cola = {
                            idCola: parametros.idCola,
                            estado: 'FINALIZADO',
                            fechaFin: new Date(),
                            mensaje: 'No hay registros'
                        };

                        updateCola(param_update_cola);


                    }
                } catch (e) {
                    log.error({ title: 'ErrorInExecute', details: e });
                    param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        fechaFin: new Date(),
                        mensaje: e.message
                    };
                    const statusProcess = updateCola(param_update_cola);

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

        const getParams = (parametros) => {
            try {

                return {
                    filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
                    filterPostingPeriod: parametros.custbody_ts_le_periodo,
                    filterFormat: parametros.salida_reporte_nombre,
                    fileCabinetId: parametros.salida_folder,
                    filterAnioPeriod: parametros.custbody_ts_le_anio_contable
                }
            } catch (e) {
                log.error({ title: 'getParams', details: e });
            }
            //log.debug('PARAMETROS', params);
        }

        const getSubsidiaria = (filterSubsidiary, pOpcion) => {
            try {
                const subLookup = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: filterSubsidiary,
                    columns: ['taxidnum', 'legalname']
                });

                if (pOpcion === 'ruc') {
                    return subLookup.taxidnum;
                } else if (pOpcion === 'razonSocial') {
                    return subLookup.legalname;
                } else {
                    return '-';
                }
            } catch (e) {
                log.error({ title: 'getSubsidiaria', details: e });
            }
        }
    
        const getEmployerID =  () => {
            const configpage =  config.load({ type: config.Type.COMPANY_INFORMATION });
            const employeeid = configpage.getValue('employerid');
            return employeeid;
        }
    
    
        const createRecord =  (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
            try {
                const recordlog = record.create({ type: logrecodId });
                if (featureSubsidiary) {
                    recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
                }
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value:  filterPostingPeriod });
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.2' });
                const recordlogid = recordlog.save();
    
                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: 'createRecord', details: e });
            }
        }
    
    
        const searchBook =  (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
            let json = new Array();
            try {
                const searchLoad = search.load({
                    id: searchId
                });
                let filters = searchLoad.filters;
    
                let periods = obtenerPeriodos(anioperiod);
                let formula = obtenerFormulaPeriodo(periods);
                let periodFilter = search.createFilter({
                    name: 'formulatext',
                    formula: formula,
                    operator: search.Operator.IS,
                    values: '1'
                });
                filters.push(periodFilter);
    
                if (featureSubsidiary) {
                    const filterTwo = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters.push(filterTwo);
                }
                const searchResultCount = searchLoad.runPaged().count;
                // const periodname = getPeriodName(period);
                // const periodostring = retornaPeriodoStringForView(periodname);
                // const PeriodoCompleto = func(periodostring.valorAnio, periodostring.valorMes);
                if (searchResultCount != 0) {
                    let pagedData = searchLoad.runPaged({ pageSize: 1000 });
    
                    pagedData.pageRanges.forEach(function (pageRange) {
                        page = pagedData.fetch({
                            index: pageRange.index
                        });
                        page.data.forEach(function (result) {
                            let columns = result.columns;
    
                            let column01 = result.getValue(columns[0]);
                            //column01 = column01.split('/');
    
                            //const PeriodoCompleto = func(column01[0], column01[1]);
                            const column02 = result.getValue(columns[1]);
                            let column03 = result.getValue(columns[2]);
                            if (column03 == '- None -') {
                                column03 = '99'
                            }
    
                            let column04 = result.getValue(columns[3]);
                            if (column04 == '- None -') {
                                column04 = '-'
                            }
    
                            let column05 = result.getValue(columns[4]);
                            if (column05 == '- None -') {
                                column05 = '-'
                            }
                            let column06 = result.getValue(columns[5]);
                            if (column06 == '') {
                                column06 = '0.00'
                            } else {
                                column06 = parseFloat(column06).toFixed(2);
                                column06 = column06;
                            }
                            let column07 = result.getValue(columns[6]);
                            if (column07 == '') {
                                column07 = '0.00'
                            } else {
                                column07 = parseFloat(column07).toFixed(2);
                                column07 = column07;
                            }
                            //ejemplo periodo 20230831
                            //si PeriodoCompleto = termina en 1231 entonces valor 8
                            let column08 = 1;
                            /*let column08 = 0;
                            if (PeriodoCompleto.substring(4, 8) == '1231') {
                                column08 = 1;
                            } else {
                                column08 = 8;
                            }*/
    
                            json.push({
                                c1_periodo: column01,//PeriodoCompleto,
                                c2_cod_cuenta_contable: column02,
                                c3_cod_entidad_financiera: column03,
                                c4_nro_cuenta_entidad_financiera: column04,
                                c5_tipo_moneda: column05,
                                c6_saldo_deudor: column06,
                                c7_saldo_acreedor: column07,
                                c8_estado_op: column08
                            });
                        });
                    });
                    return { thereisinfo: 1, content: json };
                } else {
                    return { thereisinfo: 0 }
                }
            } catch (e) {
                log.error({ title: 'searchBook', details: e });
            }
        }
    
    
        const structureBody =  (searchResult) => {
            let contentReport = '';
            try {
                for (let i in searchResult) {
                    contentReport =
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cod_cuenta_contable + '|' + searchResult[i].c3_cod_entidad_financiera + '|' +
                        searchResult[i].c4_nro_cuenta_entidad_financiera + '|' + searchResult[i].c5_tipo_moneda + '|' + searchResult[i].c6_saldo_deudor + '|' +
                        searchResult[i].c7_saldo_acreedor + '|' + searchResult[i].c8_estado_op + '|\n';
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }
    
    
        const createFile =  (params, fedIdNumb, hasinfo, transactionJSON) => {
            let typeformat;
            const header = '1 Periodo|2 Cod. Cuenta Contable|3 Cod, Entidad Financiera|4 Numero de la cuenta de la Entidad Financiera|5 Tipo de Moneda|6 Saldo Deudor|7 Saldo Acreedor|8 Indica el estado de la operacion|\n';
            try {
                let periodname = params.filterAnioPeriod;
                //let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030200' + '07' + '1' + hasinfo + '11_' + recordlogid;
                let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030200' + '07' + '1' + hasinfo + '11';
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);

                if (params.filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (params.filterFormat == 'TXT') {
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (params.filterFormat == 'PDF') {
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
    
                    // Pasar datos al template
                    log.debug('setSpecialChars(jsonAxiliar)', setSpecialChars(jsonAxiliar));
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'data',
                        data: setSpecialChars(jsonAxiliar)
                    });
                    var pdfFile = renderer.renderAsPdf();

                    // **************************************************************************************** //

                    // Guardar el PDF en el File Cabinet
                    pdfFile.name = nameReportGenerated + '.pdf';
                    pdfFile.folder = params.fileCabinetId;
                    let pdfFileId = pdfFile.save();

                    let auxFile = file.load({ id: pdfFileId });
                    var urlfile = auxFile.url;

                    return pdfFileId;
                }
                const fileObj = file.create({
                    name: nameReportGenerated,
                    fileType: typeformat,
                    contents: structuregbody,
                    encoding: file.Encoding.UTF8,
                    folder: params.fileCabinetId,
                    isOnline: true
                });
                const fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
        }
    
        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_2.ftl");
            return aux.getContents();
        };

        const getTransactions = (params) => {
            try {
                var arrResult = [];
                var _cont = 0;
            
                // FORMATO 3.24: "Anual: Libro de Invent...dos integrales - 3.24"
                var savedSearch = search.load({
                id: "customsearch_pe_libro_impreso_3_2",
                });
            
                savedSearch.filters.push(
                    search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary,
                    })
                );
            
                var startdate = format.format({
                value: new Date(params.filterAnioPeriod, 0, 1),
                type: format.Type.DATE,
                });
                var enddate = format.format({
                value: new Date(params.filterAnioPeriod, 12, 0),
                type: format.Type.DATE,
                });
            
                savedSearch.filters.push(
                search.createFilter({
                    name: "trandate",
                    operator: search.Operator.WITHIN,
                    values: [startdate, enddate],
                })
                );
            
                // savedSearch.filters.push(search.createFilter({
                //     name: 'account',
                //     operator: search.Operator.IS,
                //     values: pGloblas.pCuentaId
                // }));
            
                var pagedData = savedSearch.runPaged({
                pageSize: 1000,
                });
            
                var page, columns;
            
                pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index,
                });
            
                page.data.forEach(function (result) {
                    columns = result.columns;
                    arrAux = new Array();
                    // 0. CÓDIGO ÚNICO DE LA OPERACIÓN
                    arrAux[0] = result.getValue(columns[0]);
                    // 1. FECHA DE LA OPERACIÓN
                    arrAux[1] = result.getValue(columns[1]);
            
                    arrAux[2] = result.getValue(columns[2]);
            
                    arrAux[3] = result.getValue(columns[3]);
            
                    arrAux[4] = result.getValue(columns[4]);
            
                    arrAux[5] = result.getValue(columns[5]);
            
                    arrAux[6] = result.getValue(columns[6]);
            
                    arrAux[7] = result.getValue(columns[7]);
            
                    arrAux[8] = result.getValue(columns[8]);
            
                    arrAux[9] = result.getValue(columns[9]);
            
                    arrResult.push({
                        dato1: arrAux[0],
                        dato2: arrAux[1],
                        dato3: arrAux[2] == "- None -" ? "" : arrAux[2],
                        dato4: arrAux[3] == "- None -" ? "" : arrAux[3],
                        dato5: arrAux[4] == "- None -" ? "" : arrAux[4],
                        dato6: arrAux[5] == "- None -" ? "" : arrAux[5],
                        dato7: arrAux[6] == "" ? 0 : arrAux[6],
                        dato8: arrAux[7] == "" ? 0 : arrAux[7],
                        dato9: arrAux[8],
                        dato10: arrAux[9]
                    });
                });
                });
                if (arrResult.length > 0) {
                    //Ordenar 2 Cód. Cuenta Contable
                    arrResult.sort((a, b) => a.dato2.localeCompare(b.dato2));
                    return { thereisinfo: 1, content: arrResult }
                }
                return { thereisinfo: 0 }
            } catch (error) {
                log.error('getTransactions()', error.message);
            }
        };

        const getJsonData = (transactionJSON, params) => {
            try {
                log.debug('transactionJSON', transactionJSON);
                let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = [];
            
                var employeeName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: useID,
                columns: ["firstname", "lastname"],
                });
                var userName = employeeName.firstname + " " + employeeName.lastname;
                
                transactionJSON.forEach(item => {
                    jsonTransacion.push({
                    codigo: item.dato2,
                    denominacion: item.dato3,
                    entidadFinanciera: item.dato4,
                    numeroCuenta: item.dato5,
                    tipoMoneda: item.dato6,
                    deudor: item.dato7,
                    acreedor: item.dato8
                    });
                });
                
                let jsonAxiliar = {
                    cabecera: {
                        periodo: params.filterAnioPeriod,
                        "ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        "razonSocial": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase()
                    },
                    movements: jsonTransacion,
                    total: {
                        totalDebito: getTotalMontoJson(transactionJSON, 'dato7'),
                        totalCredito: getTotalMontoJson(transactionJSON, 'dato8')
                    }
                };
                
                jsonAxiliar.movements.forEach(item => {
                    item.deudor = numberWithCommas(item.deudor);
                    item.acreedor = numberWithCommas(item.acreedor);
                });
                
                return jsonAxiliar;
            } catch (error) {
                log.error('getJsonData()', error.message);
            }
        };

        const setSpecialChars = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key].replace(/&/g, "&amp;")
                                       .replace(/</g, "&lt;")
                                       .replace(/>/g, "&gt;")
                                       .replace(/"/g, "&quot;")
                                       .replace(/'/g, "&#039;");
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (Array.isArray(obj[key])) {
                        obj[key] = obj[key].map(item => setSpecialChars(item)); // Procesar cada elemento del array
                    } else {
                        setSpecialChars(obj[key]); // Llamada recursiva para objetos anidados
                    }
                }
            }
            return obj;
        };

        const getTotalMontoJson = (transactionJSON, campo) => {
            let total = transactionJSON.reduce((total, record) => {
                return total + (parseFloat(record[campo]) || 0); // Suma el valor, o 0 si es undefined
            }, 0); // El valor inicial es 0
            return numberWithCommas(total);
        }
    
        const setRecord =  (irecord, recordlogid, fileid, logrecodId) => {
            try {
                const fileAux = file.load({ id: fileid });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url + '&_xd=T' } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'Generated' } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: fileAux.name } });
                return recordlogid;
            } catch (e) {
                log.error({ title: 'setRecord', details: e });
            }
        }
    
    
        const setError =  (irecord, logrecodId, recordlogid, error) => {
            try {
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'ERROR: ' + error } });
            } catch (e) {
                log.error({ title: 'setError', details: e });
            }
        }
    
    
        const setVoid =  (irecord, logrecodId, recordlogid, estado) => {
            try {
                const estado = 'No hay registros';
                const report = 'Proceso finalizado';
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
            } catch (e) {
                log.error({ title: 'setVoid', details: e });
            }
        }
    
    
        // const getPeriodName = (filterPostingPeriod) => {
        //     try {
        //         const perLookup = search.lookupFields({
        //             type: search.Type.ACCOUNTING_PERIOD,
        //             id: filterPostingPeriod,
        //             columns: ['periodname']
        //         });
        //         const period = perLookup.periodname;
        //         log.debug('PERIOD', period);
        //         return period;
        //     } catch (e) {
        //         log.error({ title: 'getPeriodName', details: e });
        //     }
        // }
    
    
        const retornaPeriodoStringForView = (campoRegistro01) => {
            if (campoRegistro01 >= '') {
                var valorAnio = campoRegistro01.split(' ')[1];
                var valorMes = campoRegistro01.split(' ')[0];
                if (valorMes.indexOf('Jan') >= 0 || valorMes.indexOf('Ene') >= 0) {
                    valorMes = '01';
                } else {
                    if (valorMes.indexOf('Feb') >= 0) {
                        valorMes = '02';
                    } else {
                        if (valorMes.indexOf('Mar') >= 0) {
                            valorMes = '03';
                        } else {
                            if (valorMes.indexOf('Abr') >= 0 || valorMes.indexOf('Apr') >= 0) {
                                valorMes = '04';
                            } else {
                                if (valorMes.indexOf('May') >= 0) {
                                    valorMes = '05';
                                } else {
                                    if (valorMes.indexOf('Jun') >= 0) {
                                        valorMes = '06';
                                    } else {
                                        if (valorMes.indexOf('Jul') >= 0) {
                                            valorMes = '07';
                                        } else {
                                            if (valorMes.indexOf('Aug') >= 0 || valorMes.indexOf('Ago') >= 0) {
                                                valorMes = '08';
                                            } else {
                                                if (valorMes.indexOf('Set') >= 0 || valorMes.indexOf('Sep') >= 0) {
                                                    valorMes = '09';
                                                } else {
                                                    if (valorMes.indexOf('Oct') >= 0) {
                                                        valorMes = '10';
                                                    } else {
                                                        if (valorMes.indexOf('Nov') >= 0) {
                                                            valorMes = '11';
                                                        } else {
                                                            valorMes = '12';
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                //campoRegistro01 = valorAnio + valorMes + '30';
                var json = {
                    valorAnio: valorAnio,
                    valorMes: valorMes
                }
            }
            return json;
        }
    
    
        const func = (valorAnio, valorMes) => {
            // var date = new Date();
            var ultimoDia = new Date(valorAnio, valorMes, 0).getDate();
            var PeriodoCompleto = String(valorAnio) + String(valorMes) + String(ultimoDia)
            return PeriodoCompleto
        }

        const numberWithCommas = (x) => {
            if (x != 0) {
                let [entero, decimal] = parseFloat(x).toFixed(2).split('.');
                entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return decimal ? `${entero}.${decimal}` : entero;
            }
            let numString = parseFloat(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return numString;
        };
    
        const obtenerPeriodos = (anio) => {
            try {
                var periods = [];
                var periodResult = search.create({
                    type: "accountingperiod",
                    filters: [
                        ["isadjust", "is", "F"],
                        "AND",
                        ["isyear", "is", "F"],
                        "AND",
                        ["isquarter", "is", "F"],
                        "AND",
                        ["formulatext: TO_CHAR({startdate},'YYYY')", "is", anio]
                    ],
                    columns: ["internalid"]
                }).run().getRange(0, 1000);
    
                for (var i = 0; i < periodResult.length; i++) {
                    var id = periodResult[i].id;
                    periods.push(id);
                }
                log.error("periods", periods);
                return periods;
            } catch (error) {
                log.error("obtenerPeriodos", error)
            }
        }
    
        const obtenerFormulaPeriodo = (periods) => {
            var formula = "CASE WHEN {postingperiod.id} IN (" + periods.join(',') + ") THEN '1' ELSE '0' END";
            return formula;
        }


        return { execute }

    });