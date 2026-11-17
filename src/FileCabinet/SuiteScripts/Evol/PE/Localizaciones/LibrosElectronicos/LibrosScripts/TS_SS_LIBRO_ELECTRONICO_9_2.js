/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, format, render) => {

        /** ts_pe_ss_ple_4_1_libro_de_retenciones
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_9_2';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_9_2';
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
                    const searchId = 'customsearch_pe_libro_mayor_9_2';
                    var logrecodId = 'customrecord_ts_le_cola_ejecuciones';
                    let fedIdNumb = '';
                    let hasinfo = 0;
                    const params = getParams(parametros);  

                    if (featureSubsidiary) {
                        const getruc = getRUC(params.filterSubsidiary)
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


                    const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);

                    let transactionJSON = getTransactions(params);

                    if (searchbook.thereisinfo == 1) {
                        hasinfo = '1';
                        const structuregbody = structureBody(searchbook.content);
                        const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, '', params.filterFormat, structuregbody, params.fileCabinetId, transactionJSON, params);

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
                        idCola: params.idCola,
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
                    fileCabinetId: parametros.salida_folder
                }
            } catch (e) {
                log.error({ title: 'getParams', details: e });
            }
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

        const searchBook = (subsidiary, period, searchId, featureSubsidiary) => {
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

                const filterOne = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: period
                });

                filters.push(filterOne);

                if (featureSubsidiary) {
                    const filterTwo = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters.push(filterTwo);
                }

                const searchResultCount = searchLoad.runPaged().count;

              log.debug("SearchResultCount",searchResultCount);

                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            const column01 = result.getValue(searchLoad.columns[0]);
                          log.debug("column01",column01);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            const column06 = result.getValue(searchLoad.columns[5]);
                            const column07 = result.getValue(searchLoad.columns[6]);
                            const column08 = result.getValue(searchLoad.columns[7]);
                            const column09 = result.getValue(searchLoad.columns[8]);
                            const column10 = result.getValue(searchLoad.columns[9]);
                            const column11 = result.getValue(searchLoad.columns[10]);
                            const column12 = result.getValue(searchLoad.columns[11]);
                            const column13 = result.getValue(searchLoad.columns[12]);
                            const column14 = result.getValue(searchLoad.columns[13]);
                            const column15 = result.getValue(searchLoad.columns[14]);
                            const column16 = result.getValue(searchLoad.columns[15]);
                            const column17 = result.getValue(searchLoad.columns[16]);
                            const column18 = result.getValue(searchLoad.columns[17]);
                            let column19 = result.getValue(searchLoad.columns[18]);
                            column19 = roundTwoDecimal(column19);
                            if (column19 == 0) column19 = '0.00';
                            let column20 = result.getValue(searchLoad.columns[19]);
                            column20 = roundTwoDecimal(column20);
                            if (column20 == 0) column20 = '0.00';
                            let column21 = result.getValue(searchLoad.columns[20]);
                            column21 = roundTwoDecimal(column21);
                            if (column21 == 0) column21 = '0.00';
                        

                            json.push({
                                c1_periodo: column01,
                                c2_cuo: column02,
                                c3_correlativo: column03,
                                c4_Fecha_de_emision: column04,
                                c5_tipo_comprobante: column05,
                                c6_serie_comprobante: column06,
                                c7_nro_comprobante: column07,
                                c8_valor_Adquisiciones: column08,
                                c9_otros_conceptos: column09,
                                c10_importe_total: column10,
                                c11: column11,
                                c12: column12,
                                c13: column13,
                                c14: column14,
                                c15: column15,
                                c16: column16,
                                c17: column17,
                                c18: column18,
                                c19: column19,
                                c20: column20,
                                c21: column21
                                
                            });
                            return true;
                        });
                        return { thereisinfo: 1, content: json };
                    } else {
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
                                const column01 = searchResult.getValue(searchLoad.columns[0]);
                                const column02 = searchResult.getValue(searchLoad.columns[1]);
                                const column03 = searchResult.getValue(searchLoad.columns[2]);
                                const column04 = searchResult.getValue(searchLoad.columns[3]);
                                const column05 = searchResult.getValue(searchLoad.columns[4]);
                                const column06 = searchResult.getValue(searchLoad.columns[5]);
                                const column07 = searchResult.getValue(searchLoad.columns[6]);
                                const column08 = searchResult.getValue(searchLoad.columns[7]);
                                const column09 = searchResult.getValue(searchLoad.columns[8]);
                                const column10 = searchResult.getValue(searchLoad.columns[9]);
                                const column11 = searchResult.getValue(searchLoad.columns[10]);
                                const column12 = searchResult.getValue(searchLoad.columns[11]);
                                const column13 = searchResult.getValue(searchLoad.columns[12]);
                                const column14 = searchResult.getValue(searchLoad.columns[13]);
                                const column15 = searchResult.getValue(searchLoad.columns[14]);
                                const column16 = searchResult.getValue(searchLoad.columns[15]);
                                const column17 = searchResult.getValue(searchLoad.columns[16]);
                                const column18 = searchResult.getValue(searchLoad.columns[17]);
                                let column19 = searchResult.getValue(searchLoad.columns[18]);
                                column19 = roundTwoDecimal(column19);
                                if (column19 == 0) column19 = '0.00';
                                let column20 = searchResult.getValue(searchLoad.columns[19]);
                                column20 = roundTwoDecimal(column20);
                                if (column20 == 0) column20 = '0.00';
                                let column21 = searchResult.getValue(searchLoad.columns[20]);
                                column21 = roundTwoDecimal(column21);
                                if (column21 == 0) column21 = '0.00';
                                
                                

                                json.push({
                                    c1_periodo: column01,
                                    c2_cuo: column02,
                                    c3_correlativo: column03,
                                    c4_Fecha_de_emision: column04,
                                    c5_tipo_comprobante: column05,
                                    c6_serie_comprobante: column06,
                                    c7_nro_comprobante: column07,
                                    c8_valor_Adquisiciones: column08,
                                    c9_otros_conceptos: column09,
                                    c10_importe_total: column10,
                                    c11: column11,
                                    c12: column12,
                                    c13: column13,
                                    c14: column14,
                                    c15: column15,
                                    c16: column16,
                                    c17: column17,
                                    c18: column18,
                                    c19: column19,
                                    c20: column20,
                                    c21: column21
                                    
                                });
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
                        return { thereisinfo: 1, content: json };
                    }
                }
                else {
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
                    contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_correlativo + '|' +
                    searchResult[i].c4_Fecha_de_emision + '|' + searchResult[i].c5_tipo_comprobante + '|' + searchResult[i].c6_serie_comprobante + '|' +
                    searchResult[i].c7_nro_comprobante + '|' + searchResult[i].c8_valor_Adquisiciones + '|' + searchResult[i].c9_otros_conceptos + '|' +
                    searchResult[i].c10_importe_total + '|' + searchResult[i].c11 + '|' + searchResult[i].c12 + '|' +
                    searchResult[i].c13 + '|' + searchResult[i].c14 + '|' + searchResult[i].c15 + '|' +
                    searchResult[i].c16 + '|' + searchResult[i].c17 + '|' + searchResult[i].c18 + '|' +
                    searchResult[i].c19 + '|' + searchResult[i].c20 + '|' + searchResult[i].c21 + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, transactionJSON, params) => {
            let typeformat;
            const header = '1 Periodo|2 Codigo del catalogo utilizado|3 Tipo de Existencia|4 Codigo de la existencia|5 CUO|6 Nombre existencia|7 Codigo de la unidad de medida|'+
        '8 Fecha de Emision|9 Numero de Serie de Guia de remision|10 Numero de la guia de remision emitido por el consignador|11 Tipo de Comprobante de Pago|12 Fecha de emision del comprobante emitido por el consignador|13 Serie del Comprobante de Pago emitido por el consignador|'+
        '14 Numero del Comprobante de Pago emitido por el consignador (1)|15 Fecha de entrega o devolucion del bien|16 Numero de RUC del consignador|17 Apellidos y Nombres, Denominacion o Razon Social del consignatario|'+
        '18 Cantidad de bienes recibidos en consignacion o por devolucion del cliente|19 Cantidad de bienes devueltos al consignador|20 Cantidad de bienes vendidos por el consignatario|21 Indica el estado de la operacion|\n';
            try {

                var perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: filterPostingPeriod,
                    columns: ['periodname', 'startdate']
                });
                var periodoFinDate = format.parse({
                    type: format.Type.DATE,
                    value: perLookup.startdate
                });
                const periodostring = periodoFinDate.getFullYear() + CompletarCero(2, periodoFinDate.getMonth() + 1) + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '090200' + '00' + '1' + hasinfo + '11';
                let jsonAxiliar = getJsonData(transactionJSON,params);
                if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (filterFormat == 'TXT'){
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (filterFormat == 'PDF'){
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
                    
                    log.debug(jsonAxiliar);

                    // Pasar datos al template
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
                    log.debug(pdfFileId);

                    let auxFile = file.load({ id: pdfFileId });
                    var urlfile = auxFile.url;

                    return pdfFileId;
                }
                const fileObj = file.create({
                    name: nameReportGenerated,
                    fileType: typeformat,
                    contents: structuregbody,
                    encoding: file.Encoding.UTF8,
                    folder: fileCabinetId,
                    isOnline: true
                });
                const fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
        }    

        const getTransactions = (params) => {
            var arrResult = [];
            var _cont = 0;
            // PE - Libro Diario 9.2
            var savedSearch = search.load({ id: 'customsearch_pe_libro_impreso_9_2' });

            if (params.filterSubsidiary) {
                savedSearch.filters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary
                }));
            }

            // savedSearch.filters.push(search.createFilter({
            //     name: 'postingperiod',
            //     operator: search.Operator.IS,
            //     values: [pGloblas.pPeriod]
            // }));

            // savedSearch.columns.push(search.createColumn({
            //     name: 'formulatext',
            //     formula: "{tranid}",
            // }))

            // savedSearch.columns.push(search.createColumn({
            //     name: 'formulatext',
            //     formula: "NVL({account.displayname},'')",
            // }))

            savedSearch.filters.push(search.createFilter({
                name: 'postingperiod',
                operator: search.Operator.IS,
                values: [params.filterPostingPeriod]
            }));

            let searchResultCount = savedSearch.runPaged().count;
            log.debug("vendorbillSearchObj result count", searchResultCount);
            let pagedData = savedSearch.runPaged({ pageSize: 1000 });
            let page, columns;
            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach((result) => {
                    columns = result.columns;
                    arrAux = {};

                    // 1. PERÍODO
                    arrAux["periodoContable"] = result.getValue(columns[0]);

                    // 2. FECHA RECEPCION
                    arrAux["fechaRecepcion"] = result.getValue(columns[1]);

                    // 3. FECHA
                    arrAux["fecha"] = result.getValue(columns[2]);

                    // 4. TIPO DE EXISTENCIA
                    arrAux["tipoExistencia"] = result.getValue(columns[3]);

                    // 5. SERIE DE GUÍA DE REMISIÓN
                    arrAux["serieGuia"] = result.getValue(columns[4]);

                    // 6. NÚMERO DE GUÍA DE REMISIÓN
                    arrAux["nroGuia"] = result.getValue(columns[5]);

                    // 7. SERIE DE COMPROBANTE DE PAGO
                    arrAux["serieComprobante"] = result.getValue(columns[6]);

                    // 8. NÚMERO DE COMPROBANTE DE PAGO
                    arrAux["nroComprobante"] = result.getValue(columns[7]);

                    // 9.RUC
                    arrAux["ruc"] = result.getValue(columns[8]);

                    // 10. RAZÓN SOCIAL
                    arrAux["razonSocial"] = result.getValue(columns[9]);

                    // 11. SUM OF CANTIDAD ENTREGADA
                    arrAux["sumEntregada"] = result.getValue(columns[10]);

                    // 12. SUM OF CANTIDAD DEVUELTA
                    arrAux["sumDevuelta"] = result.getValue(columns[11]);

                    // 13. SUM OF CANTIDAD VENDIDA
                    arrAux["sumVendida"] = result.getValue(columns[12]);

                    // 14. SUM OF SALDO DE LOS BIENES EN CONSIGNACIÓN
                    arrAux["sumSaldo"] = result.getValue(columns[13]);

                    // 15. ID INTERNO
                    arrAux["idInterno"] = result.getValue(columns[14]);

                    arrResult.push(arrAux);
                });
            });
            log.debug('ResOriginal', arrResult);
            //!DATA PRUEBA - Inicio
            // for(var i=0;i<10;i++){
            //     arrAux = new Array();
            //     arrAux[0] = 'set-2023'
            //     arrAux[1] = '30/09/2023'
            //     arrAux[2] = '30/09/2023'
            //     arrAux[3] = '01'
            //     arrAux[4] = 'GR001'
            //     arrAux[5] = '12345'+i
            //     arrAux[6] = 'F123'
            //     arrAux[7] = '444'
            //     arrAux[8] = '2058678888'
            //     arrAux[9] = 'Empresa ejemplo'
            //     arrAux[10] = '123.45'
            //     arrAux[11] = '123.45'
            //     arrAux[12] = '123.45'
            //     arrAux[13] = '123.45'
            //     arrAux[14] = '1'+i
            //     arrResult.push(arrAux);
            // }
            //!DATA PRUEBA - Fin
            return arrResult;
        }

        const getJsonData = (transactions,params) => {
            let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = new Array(),
                sumEntregada = 0,
                sumDevuelta = 0,
                sumVendida = 0,
                sumSaldo = 0;

            // let employeeName = search.lookupFields({
            //     type: search.Type.EMPLOYEE,
            //     id: useID,
            //     columns: ['firstname', 'lastname']
            // });
            // let userName = employeeName.firstname + ' ' + employeeName.lastname;

            log.debug('transactions', transactions);
            for (let k in transactions) {
                let dato_sumEntregada = parseFloat(transactions[k].sumEntregada);
                let dato_sumDevuelta = parseFloat(transactions[k].sumDevuelta);
                let dato_sumVendida = parseFloat(transactions[k].sumVendida);
                let dato_sumSaldo = parseFloat(transactions[k].sumSaldo);
                let IDD = transactions[k].idInterno;
                aux = {
                    periodoContable: transactions[k].periodoContable,
                    fechaRecepcion: transactions[k].fechaRecepcion,
                    fecha: transactions[k].fecha,
                    tipoExistencia: transactions[k].tipoExistencia,
                    serieGuia: transactions[k].serieGuia,
                    nroGuia: transactions[k].nroGuia,
                    serieComprobante: transactions[k].serieComprobante,
                    nroComprobante: transactions[k].nroComprobante,
                    ruc: transactions[k].ruc,
                    razonSocial: transactions[k].razonSocial,
                    sumEntregada: numberWithCommas(roundTwoDecimals(transactions[k].sumEntregada).toFixed(2)),
                    sumDevuelta: numberWithCommas(roundTwoDecimals(transactions[k].sumDevuelta).toFixed(2)),
                    sumVendida: numberWithCommas(roundTwoDecimals(transactions[k].sumVendida).toFixed(2)),
                    sumSaldo: numberWithCommas(roundTwoDecimals(transactions[k].sumSaldo).toFixed(2)),
                    idInterno: transactions[k].idInterno
                }
                jsonTransacion.push(aux);
                sumEntregada += dato_sumEntregada;
                sumDevuelta += dato_sumDevuelta;
                sumVendida += dato_sumVendida;
                sumSaldo += dato_sumSaldo;

                hasInfo=1;
            }
            

            var dataSubsidiary = record.load({
                type: "subsidiary",
                id: params.filterSubsidiary,
              });

            let companyName = dataSubsidiary.getValue("legalname");
            let companyRuc = dataSubsidiary.getValue("federalidnumber");

            log.debug('jsonTransacion', jsonTransacion);
            let periodSearch = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: params.filterPostingPeriod,
                columns: ['periodname', "startdate"]
            });
            const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const months_nros = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
            let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
            month = months_nros[Number(periodSearch.startdate.split("/")[1]) - 1];
            year = periodSearch.startdate.split("/")[2];
            sumEntregada = parseFloat(sumEntregada.toFixed(2))
            sumDevuelta = parseFloat(sumDevuelta.toFixed(2))
            sumVendida = parseFloat(sumVendida.toFixed(2))
            sumSaldo = parseFloat(sumSaldo.toFixed(2))

            let jsonAxiliar = {
                "company": {
                    "firtsTitle": 'FORMATO 9.2: CONSG. CONSIGNATARIO',
                    "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                    "thirdTitle": companyRuc.replace(/&/g, '&amp;'),
                    "fourthTitle": companyName.replace(/&/g, '&amp;').toLocaleUpperCase(),
                },
                "total": {
                    "sumEntregada": numberWithCommas(roundTwoDecimals(sumEntregada).toFixed(2)),
                    "sumDevuelta": numberWithCommas(roundTwoDecimals(sumDevuelta).toFixed(2)),
                    "sumVendida": numberWithCommas(roundTwoDecimals(sumVendida).toFixed(2)),
                    "sumSaldo": numberWithCommas(roundTwoDecimals(sumSaldo).toFixed(2))
                },
                "movements": jsonTransacion
            };
            log.debug('jsonAxiliar 1', jsonAxiliar);
            return jsonAxiliar;
        }

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }

        const roundTwoDecimals = (value) => {
            return Math.round(value * 100) / 100;
        }

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_9_2.ftl");
            return aux.getContents();
        };

        const setSpecialChars = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key].replace(/&/g, "&amp;")
                                        .replace(/</g, "&lt;")
                                        .replace(/>/g, "&gt;")
                                        .replace(/"/g, "&quot;");
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    setSpecialChars(obj[key]); // Llamada recursiva para objetos anidados
                }
            }
            return obj;
        };

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
                    for (var i = lengthStrValor; i < tamano; i++) {
                        nuevoValor = '0' + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0, tamano);
            }
        } 

        const retornaPeriodoString = (campoRegistro01) => {
            if (campoRegistro01 >= '') {
                var valorAnio = campoRegistro01.split(' ')[1];
                var valorMes = campoRegistro01.split(' ')[0];
                if (valorMes.indexOf('Jan') >= 0 || valorMes.indexOf('ene') >= 0) {
                    valorMes = '01';
                } else {
                    if (valorMes.indexOf('feb') >= 0 || valorMes.indexOf('Feb') >= 0) {
                        valorMes = '02';
                    } else {
                        if (valorMes.indexOf('mar') >= 0 || valorMes.indexOf('Mar') >= 0) {
                            valorMes = '03';
                        } else {
                            if (valorMes.indexOf('abr') >= 0 || valorMes.indexOf('Apr') >= 0) {
                                valorMes = '04';
                            } else {
                                if (valorMes.indexOf('may') >= 0 || valorMes.indexOf('May') >= 0) {
                                    valorMes = '05';
                                } else {
                                    if (valorMes.indexOf('jun') >= 0 || valorMes.indexOf('Jun') >= 0) {
                                        valorMes = '06';
                                    } else {
                                        if (valorMes.indexOf('jul') >= 0 || valorMes.indexOf('Jul') >= 0) {
                                            valorMes = '07';
                                        } else {
                                            if (valorMes.indexOf('Aug') >= 0 || valorMes.indexOf('ago') >= 0) {
                                                valorMes = '08';
                                            } else {
                                                if (valorMes.indexOf('set') >= 0 || valorMes.indexOf('sep') >= 0) {
                                                    valorMes = '09';
                                                } else {
                                                    if (valorMes.indexOf('oct') >= 0) {
                                                        valorMes = '10';
                                                    } else {
                                                        if (valorMes.indexOf('nov') >= 0) {
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
                campoRegistro01 = valorAnio + valorMes + '00';
            }
            return campoRegistro01;
        }


        // CONVIERTE A LA FECHA EN FORMATO JSON
        function formatDate(dateString) {
            var date = dateString.split('/');
            if (Number(date[0]) < 10) date[0] = '0' + Number(date[0]);
            if (Number(date[1]) < 10) date[1] = '0' + Number(date[1]);
            return { 'anio': date[2], 'mes': date[1], 'dia': date[0] }
        }

        function convertDateFormat(dateString) {
            // Split the date into parts using "/"
            const parts = dateString.split('/');

            // Get the day, month, and year
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];

            // Add leading zeros if needed
            const formattedDay = day.length === 1 ? '0' + day : day;
            const formattedMonth = month.length === 1 ? '0' + month : month;

            // Create the new date in the desired format
            const formattedDate = `${formattedDay}/${formattedMonth}/${year}`;

            return formattedDate;
        }

        const roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }


        return { execute }

    });
