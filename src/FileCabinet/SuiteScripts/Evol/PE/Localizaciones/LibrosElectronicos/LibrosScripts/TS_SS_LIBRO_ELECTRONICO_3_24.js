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

        const SCRIPT_ID = 'customscript_ts_ss_le_3_24';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_24';
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
                    const searchId = 'customsearch_detalle_3_24'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
                    let fedIdNumb = '';
                    let hasinfo = 0;


                    const params = getParams(parametros);


                    if (featureSubsidiary) {
                        const getruc = getRUC(params.filterSubsidiary);
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
                        hasinfo = "1";
                        //const structuregbody = structureBody(searchbook.content);
                        const transactionJSON = searchbook.content;
                        const createfile = createFile(params, fedIdNumb, hasinfo, '', params.filterFormat, transactionJSON, params.fileCabinetId, params.filterAnioPeriod);
                

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

        const getRUC = (filterSubsidiary) => {
            try {
                const subLookup = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: filterSubsidiary,
                    columns: ['taxidnum']
                });
                const ruc = subLookup.taxidnum;
                return ruc;
            } catch (e) {
                log.error({ title: 'getRUC', details: e });
            }
        }
    
    
        const getEmployerID = () => {
            const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
            const employeeid = configpage.getValue('employerid');
            return employeeid;
        }
    
    
        const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
            try {
                const recordlog = record.create({ type: logrecodId });
                if (featureSubsidiary) {
                    recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
                }
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: filterPostingPeriod });
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.25' });
                const recordlogid = recordlog.save();
    
                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: 'createRecord', details: e });
            }
        }
    
    
        const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
            let json = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            try {
    
                const searchLoad = search.load({
                    id: searchId
                });
    
                let filters = searchLoad.filters;
    
                // const filterOne = search.createFilter({
                //     name: 'postingperiod',
                //     operator: search.Operator.ANYOF,
                //     values: period
                // });
    
                // filters.push(filterOne);
    
                if (featureSubsidiary) {
                    const filterTwo = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters.push(filterTwo);
                }

                log.debug('searchBook', 'llego aqui 1');
    
                const searchResultCount = searchLoad.runPaged().count;
                
                log.debug('searchBook', 'llego aqui 1.5');
    
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        log.debug('searchBook', 'llego aqui 2');

                        searchLoad.run().each((result) => {
                            let column01 = result.getValue(searchLoad.columns[0]);
                        column01 = column01.split('/');
                        const PeriodoCompleto = func(column01[0], column01[1]);
                        const column02 = result.getValue(searchLoad.columns[1]);
                        const column03 = result.getValue(searchLoad.columns[2]);
                        let column04 = result.getValue(searchLoad.columns[3]);
                        column04 = parseFloat(column04).toFixed(2);
                        const column05 = result.getValue(searchLoad.columns[4]);
                        let column06 = result.getValue(searchLoad.columns[5]);
                        column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                        column06 = column06.replace(/[\/\\|]/g, "");
                        let column07 = result.getValue(searchLoad.columns[5]);
    
                                if (column07 == anioperiod) {
                                    json.push({
                                        c1_periodo: PeriodoCompleto,
                                        c2_cod_catalogo: column02,
                                        c3_cod_rubro: column03,
                                        c4_saldo_rubro: column04,
                                        c5_estado_operacion: column05,
                                        c6_campos_libres: column06
                                    });
                                }
                            return true;
    
                        });
    
                        return { thereisinfo: 1, content: json };
    
                    } else {
                        log.debug('searchBook', 'llego aqui 2');
                        division = searchResultCount / 1000;
                        laps = Math.round(division);
                        if (division > laps) {
                            laps = laps + 1
                        }
                        for (let i = 1; i <= laps; i++) {
                            if (i != laps) {
                                searchResult = searchLoad.run().getRange({ start: start, end: end });
                            } else {
                                searchResult = searchLoad.run().getRange({ start: start, end: searchResultCount });
                            }
                            for (let j in searchResult) {
                                let column01 = result.getValue(searchLoad.columns[0]);
                                column01 = column01.split('/');
                                const PeriodoCompleto = func(column01[0], column01[1]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                let column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                column04 = parseFloat(column04).toFixed(2);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                                column06 = column06.replace(/[\/\\|]/g, "");
                                let column07 = searchResult[j].getValue(searchLoad.columns[6]);

                                if (column07 == anioperiod) {
                                json.push({
                                    c1_periodo: PeriodoCompleto,
                                    c2_cod_catalogo: column02,
                                    c3_cod_rubro: column03,
                                    c4_saldo_rubro: column04,
                                    c5_estado_operacion: column05,
                                    c6_campos_libres: column06
                                });
                            }
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
    
                        return { thereisinfo: 1, content: json };
                    }
                } else {
                    return { thereisinfo: 0 }
                }
            } catch (e) {
                log.error({ title: 'searchBook', details: e });
            }
        }
    
    
        const structureBody = (searchResult) => {
            let contentReport = '';
            try {
                for (let i in searchResult) {
                    contentReport =
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cod_catalogo + '|' + searchResult[i].c3_cod_rubro + '|' +
                        searchResult[i].c4_saldo_rubro + '|' + searchResult[i].c5_estado_operacion + '|' + searchResult[i].c6_campos_libres + '|\n';
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }
    
    
        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId,filterAnioPeriod) => {
            let typeformat;
            const header = '1 Periodo|2 Codigo de catalogo|3 Codigo de rubro|4 Saldo rubro|5 Estado de operacion|6 Campos Libres|\n';
            try {
                let periodname = filterAnioPeriod ;
                //let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231032500' + '07' + '1' + hasinfo + '11_' + recordlogid;
              let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231032400' + '07' + '1' + hasinfo + '11';
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
                        alias: 'input',
                        data: {
                            data: JSON.stringify(setSpecialChars(jsonAxiliar)),
                          }
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
    
    
        const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
            try {
                const fileAux = file.load({ id: fileid });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'Generated' } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: fileAux.name } });
                return recordlogid;
            } catch (e) {
                log.error({ title: 'setRecord', details: e });
            }
        }
    
    
        const setError = (irecord, logrecodId, recordlogid, error) => {
            try {
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: 'ERROR: ' + error } });
            } catch (e) {
                log.error({ title: 'setError', details: e });
            }
        }
    
    
        const setVoid = (irecord, logrecodId, recordlogid) => {
            try {
                const estado = 'No hay registros';
                const report = 'Proceso finalizado';
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
            } catch (e) {
                log.error({ title: 'setVoid', details: e });
            }
        }
    
    
        const getPeriodName = (filterPostingPeriod) => {
            try {
                const perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: filterPostingPeriod,
                    columns: ['periodname']
                });
                const period = perLookup.periodname;
                return period;
            } catch (e) {
                log.error({ title: 'getPeriodName', details: e });
            }
        }
    
        function CompletarCero(tamano, valor) {
            var strValor = valor + '';
            var lengthStrValor = strValor.length;
            var nuevoValor = valor + '';
    
            if (lengthStrValor <= tamano) {
                if (tamano != lengthStrValor) {
                    for (var i = lengthStrValor; i < tamano; i++){
                        nuevoValor = '0' + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0,tamano);
            }
        }
    
    
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

        const getTransactions = (params) => {
            // log.debug('MSK', 'getTransactions - Inicio');
            try {
            var arrResult = [];
            var _cont = 0;
    
            // FORMATO 3.24: "Anual: Libro de Invent...dos integrales - 3.24" 
            var savedSearch = search.load({
                id: 'customsearch_pe_libro_impreso_3_24'
            });
    
            // log.debug(' pGloblas.pSubsidiary', pGloblas.pSubsidiary)
           
                savedSearch.filters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary
                }));
            
    
            var startdate = format.format({
                value: new Date(params.filterAnioPeriod, 0, 1),
                type: format.Type.DATE
            });
            var enddate = format.format({
                value: new Date(params.filterAnioPeriod, 12, 0),
                type: format.Type.DATE
            });
    
            savedSearch.filters.push(search.createFilter({
                name: 'trandate',
                operator: search.Operator.WITHIN,
                values: [startdate, enddate]
            }));
    
           // let searchResultCount = savedSearch.runPaged().count;
           // log.debug("transactionSearchObj result count", searchResultCount);
    
            // savedSearch.filters.push(search.createFilter({
            //     name: 'postingperiod',
            //     operator: search.Operator.IS,
            //     values: [pGloblas.pPeriod]
            // }));
    
            // savedSearch.filters.push(search.createFilter({
            //     name: 'account',
            //     operator: search.Operator.IS,
            //     values: pGloblas.pCuentaId
            // }));
    
            var pagedData = savedSearch.runPaged({ pageSize: 1000 });
    
            var page, columns;
            let contador = 0
            pagedData.pageRanges.forEach((pageRange) => {
                page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach((result) => {
                    columns = result.columns;
                    log.debug('contador+++++++++++++++++++', contador);
                    // log.debug('result mirame', result);
                    arrAux = new Array();
    
                                // 0. CÓDIGO ÚNICO DE LA OPERACIÓN
                            arrAux[0] = result.getValue(columns[0]);

                            // 1. FECHA DE LA OPERACIÓN	
                            arrAux[1] = result.getValue(columns[1]);

                            // 2. MEDIO DE PAGO	
                            arrAux[2] = result.getValue(columns[2]);

                            // 3. DESCRIPCIÓN DE LA OPERACIÓN
                            arrAux[3] = result.getValue(columns[3]);
                    contador++
                    arrResult.push({
                        
                        dato1: arrAux[0],
                        dato2: arrAux[1],
                        dato3: arrAux[2],
                        dato4: arrAux[3],
                       
     
                     });

                });
            });

            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult }
            }
            return { thereisinfo: 0 }
            
            //!DATA PRUEBA - Inicio
            /* for(var i=0;i<10;i++){
                 arrAux = new Array();
                 arrAux[0] = '2023/09'
                 arrAux[1] = '09'
                 arrAux[2] = '5D010'+i
                 arrAux[3] = '-120148.56'
                 arrResult.push(arrAux);
             }*/
            //!DATA PRUEBA - Fin
           

        } catch (error) {
            log.error('getTransactions()', error.message);
        }
        }

        const getJsonData = (transactions,params) => {
            // log.debug('MSK', 'getJsonData - Inicio');
            let userTemp = runtime.getCurrentUser(), useID = userTemp.id, jsonTransacion = {}, totalDebito = 0, totalCredito = 0, saldoDebito = 0, saldoCredito = 0, saldo = 0;
            
    
            // log.debug('transactions', transactions);
    
            for (var k in transactions) {
                let IDD = transactions[k].dato1;
    
                if (!jsonTransacion[IDD]) {
                    let dato_4 = parseFloat(transactions[k].dato4);
                    log.debug('dato_4', dato_4);
    
                    // let debitoFormat = numberWithCommas(transactions[k].debito);
                    // log.debug('debitoFormat', debitoFormat);
                    jsonTransacion[IDD] = {
                        dato1: transactions[k].dato1,
                        dato2: transactions[k].dato2,
                        dato3: transactions[k].dato3,
                        dato4: dato_4,
                    }
                    saldo += dato_4;
                    // totalCredito = totalCredito + Number(transactions[k].credito);
                }
            }
    
            // if (totalDebito > totalCredito) {
            //     saldoDebito = totalDebito - totalCredito
            // } else {
            //     saldoCredito = totalCredito - totalDebito
            // }
    
            // log.debug('jsonTransacion', jsonTransacion);
            /*let periodSearch = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: pGloblas.pPeriod,
                columns: ['periodname']
            });
    
            let periodname_completo = ""
            switch (periodSearch.periodname.substring(0, 3)) {
                case "Ene":
                    periodname_completo = periodSearch.periodname.replace("Ene", "Enero")
                    break;
                case "Feb":
                    periodname_completo = periodSearch.periodname.replace("Feb", "Febrero")
                    break;
                case "Mar":
                    periodname_completo = periodSearch.periodname.replace("Mar", "Marzo")
                    break;
                case "Abr":
                    periodname_completo = periodSearch.periodname.replace("Abr", "Abril")
                    break;
                case "May":
                    periodname_completo = periodSearch.periodname.replace("May", "Mayo")
                    break;
                case "Jun":
                    periodname_completo = periodSearch.periodname.replace("Jun", "Junio")
                    break;
                case "Jul":
                    periodname_completo = periodSearch.periodname.replace("Jul", "Julio")
                    break;
                case "Ago":
                    periodname_completo = periodSearch.periodname.replace("Ago", "Agosto")
                    break;
                case "Set":
                    periodname_completo = periodSearch.periodname.replace("Set", "Setiembre")
                    break;
                case "Oct":
                    periodname_completo = periodSearch.periodname.replace("Oct", "Octubre")
                    break;
                case "Nov":
                    periodname_completo = periodSearch.periodname.replace("Nov", "Noviembre")
                    break;
                case "Dic":
                    periodname_completo = periodSearch.periodname.replace("Dic", "Diciembre")
                    break;
                default:
                    periodname_completo = periodSearch.periodname
                    break;
            }*/
    
            // let accountSearch = search.lookupFields({
            //     type: "account",
            //     id: pGloblas.pCuentaId,
            //     columns: ['custrecord_pe_bank', 'custrecord_pe_bank_account', 'description']
            // });
            // log.debug('accountSearch', accountSearch);
    
            let jsonAxiliar = {
                "company": {
                    "firtTitle": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
                    "secondTitle": 'Expresado en Moneda Nacional',
                    "thirdTitle": 'FORMATO 3.24 - ' + params.filterAnioPeriod,
                },
                "cabecera": {
                    "año": params.filterAnioPeriod,
                    "ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                    "razonSocial": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
                    //"entidadFinanciera": accountSearch.custrecord_pe_bank[0].text,
                    //"codigoCuentaCorriente": accountSearch.description,
                },
                "total": {
                    // "totalDebito": totalDebito.toFixed(2),
                    // "totalCredito": totalCredito.toFixed(2),
                    // "saldoDebito": saldoDebito.toFixed(2),
                    "saldo": numberWithCommas(saldo)
                },
                "movements": jsonTransacion
    
            };
    
            // log.debug('MSK - jsonAxiliar', jsonAxiliar);
            return jsonAxiliar;
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

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_24_pdf.ftl");
            return aux.getContents();
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
    
    

        return {execute}

    });
