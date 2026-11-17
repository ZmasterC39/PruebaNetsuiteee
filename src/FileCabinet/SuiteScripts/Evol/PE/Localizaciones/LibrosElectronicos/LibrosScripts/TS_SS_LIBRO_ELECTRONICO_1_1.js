/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, format, render) => {

        /** ts_pe_ss_ple_1_1_caja_y_banco
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_1_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_1_1';
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
                    const searchId = 'customsearch_pe_detalle_de_cyb_1_1';
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
                        const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, '', params.filterFormat, structuregbody, params.fileCabinetId, transactionJSON,params);

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
                    fileCabinetId: 457
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
            let dateFormat = 'DD/MM/YYYY';
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

                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            let column06 = result.getValue(searchLoad.columns[5]);
                            if (column06 == '- None -') {
                                column06 = ''
                            }
                            /*
                            if (column06 != "- None -") {                                  
                            let filters = [search.createFilter({ name: "name", operator: search.Operator.CONTAINS, values: column06 })];
                            let columns = [search.createColumn({ name: "internalid" })];
                    
                            let mysearch = search.create({
                                type: "department",
                                filters: filters,
                                columns: columns,
                            });
                            var searchResults = mysearch.run();
                            var firstResult = searchResults.getRange({ start: 0, end: 1 })[0];
    
                            let internalId = firstResult.getValue({ name: "internalid" });
                            column06 = internalId;
    
                            } else {
                            // log.debug({ title: 'firstResult', details: firstResult });
                            column06 = "0";
                            }
                            */

                            const column07 = result.getValue(searchLoad.columns[6]);
                            const column08 = result.getValue(searchLoad.columns[7]);
                            let column09 = result.getValue(searchLoad.columns[8]);
                            const column10 = result.getValue(searchLoad.columns[9]);
                            let column11 = result.getValue(searchLoad.columns[10]);
                            if (column11 != '- None -') {
                                column11 = convertDateFormat(column11);
                            }

                            let column12 = result.getValue(searchLoad.columns[11]);
                            if (column12 == '- None -') {
                                column12 = ''
                            }

                            let column13 = result.getValue(searchLoad.columns[12]);
                            // if (column13 != '- None -') {
                            //   const formattedDate13 = format.format({
                            //     value:  new Date(column13),
                            //     type: format.Type.DATE,
                            //     format: dateFormat
                            //   });
                            //   column13 = formattedDate13;
                            // }                    
                            const column14 = result.getValue(searchLoad.columns[13]);
                            let column15 = result.getValue(searchLoad.columns[14]);
                            if (column15 == '- None -') {
                                column15 = ''
                            }
                            let column16 = result.getValue(searchLoad.columns[15]);
                            column16 = parseFloat(column16).toFixed(2);
                            let column17 = result.getValue(searchLoad.columns[16]);
                            column17 = parseFloat(column17).toFixed(2);
                            var column18 = result.getValue(searchLoad.columns[17]);
                            const column18_2 = result.getValue(searchLoad.columns[18]);
                            const column18_3 = result.getValue(searchLoad.columns[19]);

                            if (column18 != '- None -' && column18_2 != '- None -' && column18_3 != '- None -') {
                                column18 = column18 + '&' + column18_2 + '&' + column18_3;

                            } else {
                                column18 = '';
                            }
                            column18 = '';
                            var column19 = result.getValue(searchLoad.columns[20]);
                            var periodoEmision = formatDate(column13)['anio'] + formatDate(column13)['mes'] + '00';
                            if (column01 == periodoEmision) {
                                column19 = '1';
                            } else {
                                column19 = '8';
                            }

                            json.push({
                                c1_periodo: column01,
                                c2_cuo: column02,
                                c3_correlativo: column03,
                                c4_cod_entidad: column04,
                                c5_cod_cta_bancaria: column05,
                                c6_fecha_op: column06,
                                c7_medio_de_pago: column07,
                                c8_descripcion: column08,
                                c9_tipo_doc_beneficiario: column09,
                                c10_nro_doc: column10,
                                c11_nombre_ruc: column11,
                                c12_nro_tran_banciaria: column12,
                                c13_debito: column13,
                                c14_credito: column14,
                                c15_estado_op: column15,
                                c16_movimiento_debe: column16,
                                c17_suma_haber: column17,
                                c18_dato_estructurado: column18,
                                c19_indica_estado: column19
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
                                const column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                if (column06 == '- None -') {
                                    column06 = ''
                                }
                                const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                const column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                const column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                const column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                let column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                if (column11 != '- None -') {
                                    column11 = convertDateFormat(column11);
                                }

                                let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                if (column12 = '- None -') {
                                    column12 = ''
                                }
                                const column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                const column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                let column15 = searchResult[j].getValue(searchLoad.columns[14]);
                                if (column15 = '- None -') {
                                    column15 = ''
                                }
                                let column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                if (column16 == '' || column16 == ' ') {
                                    column16 = '0.00'
                                }
                                let column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                column17 = parseFloat(column17).toFixed(2);
                                var column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                const column18_2 = searchResult[j].getValue(searchLoad.columns[18]);
                                const column18_3 = searchResult[j].getValue(searchLoad.columns[19]);

                                if (column18 != '- None -' && column18_2 != '- None -' && column18_3 != '- None -') {
                                    column18 = column18 + '&' + column18_2 + '&' + column18_3;

                                } else {
                                    column18 = '';
                                }
                                column18 = '';
                                var column19 = searchResult[j].getValue(searchLoad.columns[20]);
                                var periodoEmision = formatDate(column13)['anio'] + formatDate(column13)['mes'] + '00';
                                if (column01 == periodoEmision) {
                                    column19 = '1';
                                } else {
                                    column19 = '8';
                                }

                                json.push({
                                    c1_periodo: column01,
                                    c2_cuo: column02,
                                    c3_correlativo: column03,
                                    c4_cod_entidad: column04,
                                    c5_cod_cta_bancaria: column05,
                                    c6_fecha_op: column06,
                                    c7_medio_de_pago: column07,
                                    c8_descripcion: column08,
                                    c9_tipo_doc_beneficiario: column09,
                                    c10_nro_doc: column10,
                                    c11_nombre_ruc: column11,
                                    c12_nro_tran_banciaria: column12,
                                    c13_debito: column13,
                                    c14_credito: column14,
                                    c15_estado_op: column15,
                                    c16_movimiento_debe: column16,
                                    c17_suma_haber: column17,
                                    c18_dato_estructurado: column18,
                                    c19_indica_estado: column19
                                });
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
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_correlativo + '|' +
                        searchResult[i].c4_cod_entidad + '|' + searchResult[i].c5_cod_cta_bancaria + '|' + searchResult[i].c6_fecha_op + '|' +
                        searchResult[i].c7_medio_de_pago + '|' + searchResult[i].c8_descripcion + '|' + searchResult[i].c9_tipo_doc_beneficiario + '|' +
                        searchResult[i].c10_nro_doc + '|' + searchResult[i].c11_nombre_ruc + '|' + searchResult[i].c12_nro_tran_banciaria + '|' +
                        searchResult[i].c13_debito + '|' + searchResult[i].c14_credito + '|' + searchResult[i].c15_estado_op + '|' + searchResult[i].c16_movimiento_debe
                        + '|' + searchResult[i].c17_suma_haber + '|' + searchResult[i].c18_dato_estructurado + '|' + searchResult[i].c19_indica_estado + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, transactionJSON,params) => {
            let typeformat;
            const header = '1 Periodo|2 Cuo|3 correlativo |4 codigo de idenetidad|5 codigo cuenta bancaria|6 fecha|\n';
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

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '010100' + '00' + '1' + hasinfo + '11';
                let jsonAxiliar = getJsonData(transactionJSON,params);
                if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if(params.filterFormat == 'TXT'){
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if(params.filterFormat == 'PDF'){
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

        const roundTwoDecimals = (value) => {
            return Math.round(value * 100) / 100;
          };

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
          };

        const getTransactions = (params) => {
            // log.debug('MSK', 'getTransactions - Inicio');
            var arrResult = [];
            var _cont = 0;
        
            // FORMATO 1.1: "LIBRO CAJA Y BANCOS - DETALLE DE LOS MOVIMIENTOS DEL EFECTIVO"
            var savedSearch = search.load({
              id: "customsearch_pe_libro_impreso_1_1",
            });
        
            if (params.filterSubsidiary) {
              savedSearch.filters.push(
                search.createFilter({
                  name: "subsidiary",
                  operator: search.Operator.IS,
                  values: params.filterSubsidiary,
                })
              );
            }
        
            savedSearch.filters.push(
              search.createFilter({
                name: "postingperiod",
                operator: search.Operator.IS,
                values: params.filterPostingPeriod,
              })
            );
        
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
                objAux = {}
        
                // 0. CÓDIGO ÚNICO DE LA OPERACIÓN
                objAux.codUniOperacion = result.getValue(columns[0]);
        
                // 1. FECHA DE LA OPERACIÓN
                objAux.fechaOperacion = result.getValue(columns[1]);
        
                // 2. DESCRIPCIÓN DE LA OPERACIÓN
                objAux.desOperacion = result.getValue(columns[2]) == "- None -" ? "" : result.getValue(columns[2]);
        
                // 3. CÓDIGO CUENTA CONTABLE ASOCIADA
                objAux.numeroCuenta = result.getValue(columns[3]);
        
                // 4. DENOMINACIÓN CUENTA CONTABLE ASOCIADA
                objAux.denominacion = result.getValue(columns[4]);
        
                // 5. SALDO DEUDOR
                objAux.debito = result.getValue(columns[5]);
        
                // 6. SALDO ACREEDOR
                objAux.credito = result.getValue(columns[6]);
        
                arrResult.push(objAux);
              });
            });
            // log.debug('MSK', 'getTransactions - Fin');
            return arrResult;
          };
        
        const getJsonData = (transactions,params) => {
            // log.debug('MSK', 'getJsonData - Inicio');
            let userTemp = runtime.getCurrentUser(),
              jsonTransacionvine = new Array(),
              useID = userTemp.id,
              jsonTransacion = new Array(),
              totalDebito = 0;
            totalCredito = 0;
            saldoDebito = 0;
            saldoCredito = 0;
        
            var employeeName = search.lookupFields({
              type: search.Type.EMPLOYEE,
              id: useID,
              columns: ["firstname", "lastname"],
            });
            var userName = employeeName.firstname + " " + employeeName.lastname;
        
            log.debug('transactions', transactions);
            var cantidadLinea = 0;
            var montovienedebito = 0;
            var montovieneCredito = 0;
            var cantidadFor = 0;
            var cantidadAnterio = 0;
            for (var k in transactions) {
              let IDD = transactions[k].codUniOperacion;
              cantidadLinea = cantidadLinea + 1;
                let creditoFormat = numberWithCommas(transactions[k].credito);
                log.debug("credito", creditoFormat);
        
                let debitoFormat = numberWithCommas(transactions[k].debito);
                log.debug("debitoFormat", debitoFormat);
        
                aux = {
                  number: cantidadFor,
                  codUniOperacion: transactions[k].codUniOperacion,
                  fechaOperacion: transactions[k].fechaOperacion,
                  desOperacion: limitarLongitudCadena(transactions[k].desOperacion, 56),
                  numeroCuenta: transactions[k].numeroCuenta,
                  denominacion: limitarLongitudCadena(transactions[k].denominacion, 44),
                  debito: debitoFormat,
                  credito: creditoFormat,
                };
                jsonTransacion.push(aux);
                cantidadFor = cantidadFor + 1;
                totalDebito = totalDebito + Number(transactions[k].debito);
                totalCredito = totalCredito + Number(transactions[k].credito);
              
              if (cantidadLinea <= 28) {
                montovienedebito = Number(montovienedebito) + Number(transactions[k].debito);
                montovieneCredito = Number(montovieneCredito) + Number(transactions[k].credito);
                cantidadAnterio = cantidadLinea;
              } else {
                jsonTransacionvine.push({
                  montovienedebito: numberWithCommas(montovienedebito.toFixed(2)),
                  montovieneCredito: numberWithCommas(montovieneCredito.toFixed(2)),
                  cantidadFor: cantidadFor - 1,
                });
        
                cantidadLinea = 0;
                cantidadLinea = cantidadLinea + 1;
                montovienedebito = Number(montovienedebito) + Number(transactions[k].debito);
                montovieneCredito = Number(montovieneCredito) + Number(transactions[k].credito);
              }
            }
        
            if (totalDebito > totalCredito) {
              saldoDebito = totalDebito - totalCredito;
              saldoDebito = numberWithCommas(roundTwoDecimals(saldoDebito));
              saldoCredito = "0.00";
            } else {
              saldoCredito = totalCredito - totalDebito;
              saldoCredito = numberWithCommas(roundTwoDecimals(saldoCredito));
              saldoDebito = "0.00";
            }
            let periodSearch = search.lookupFields({
              type: search.Type.ACCOUNTING_PERIOD,
              id: params.filterPostingPeriod,
              columns: ["periodname"],
            });

            var dataSubsidiary = record.load({
                type: "subsidiary",
                id: params.filterSubsidiary,
              });

            let companyName = dataSubsidiary.getValue("legalname");
            let companyRuc = dataSubsidiary.getValue("federalidnumber");

            log.debug("Test",periodSearch);
        
            let periodname_completo = "";
            switch (periodSearch.periodname.substring(0, 3)) {
              case "Ene":
                periodname_completo = periodSearch.periodname.replace("Ene", "Enero");
                break;
              case "Feb":
                periodname_completo = periodSearch.periodname.replace("Feb", "Febrero");
                break;
              case "Mar":
                periodname_completo = periodSearch.periodname.replace("Mar", "Marzo");
                break;
              case "Abr":
                periodname_completo = periodSearch.periodname.replace("Abr", "Abril");
                break;
              case "may":
                periodname_completo = periodSearch.periodname.replace("may", "Mayo");
                break;
              case "Jun":
                periodname_completo = periodSearch.periodname.replace("Jun", "Junio");
                break;
              case "Jul":
                periodname_completo = periodSearch.periodname.replace("Jul", "Julio");
                break;
              case "Ago":
                periodname_completo = periodSearch.periodname.replace("Ago", "Agosto");
                break;
              case "Sep":
                periodname_completo = periodSearch.periodname.replace("Sep", "Setiembre");
                break;
              case "Oct":
                periodname_completo = periodSearch.periodname.replace("Oct", "Octubre");
                break;
              case "Nov":
                periodname_completo = periodSearch.periodname.replace("Nov", "Noviembre");
                break;
              case "Dic":
                periodname_completo = periodSearch.periodname.replace("Dic", "Diciembre");
                break;
              default:
                periodname_completo = periodSearch.periodname;
                break;
            }

            let jsonAxiliar = {
              company: {
                firtTitle: companyName.replace(/&/g, "&amp;"),
                secondTitle: "Expresado en Moneda Nacional",
                thirdTitle: "FORMATO 1.1 - " + periodname_completo,
              },
              cabecera: {
                periodo: periodname_completo,
                ruc: companyRuc,
                razonSocial: companyName.replace(/&/g, "&amp;").toUpperCase(),
              },
              total: {
                totalDebito: numberWithCommas(roundTwoDecimals(totalDebito).toFixed(2)),
                totalCredito: numberWithCommas(roundTwoDecimals(totalCredito).toFixed(2)),
                saldoDebito: saldoDebito,
                saldoCredito: saldoCredito,
              },
              movements: jsonTransacion,
              jsonTransacionvine: jsonTransacionvine,
            };
        
            // log.debug('MSK - jsonAxiliar', jsonAxiliar);
            return jsonAxiliar;
          };

          function limitarLongitudCadena(cadena, maximo) {
            if (cadena.length > maximo) {
              return cadena.slice(0, maximo); // Recorta la cadena al máximo especificado
            } else {
              return cadena; // La cadena es igual o más corta que el máximo, no se modifica
            }
          }

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_1_1.ftl");
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


        return { execute }

    });
