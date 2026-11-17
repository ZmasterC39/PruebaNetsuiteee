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

        const SCRIPT_ID = 'customscript_ts_ss_le_3_20';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_20';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;


        var currentScript = runtime.getCurrentScript();
        const SEARCH_ID = 'customsearch_pe_320_lib_invbal';
        const MAX_FILE_SIZE = 9700000;
        const MAX_REMAINING_USAGE = 200;
        const MAX_PAGINATION_SIZE = 1000;


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
                    log.error("Inicio [execute]", "");
                    let environmentFeatures = getEnvironmentFeatures();
                    let scriptParameters = getScriptParameters(parametros); 
                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'PROCESANDO'
                    }; 
                    var createrecord = updateCola(param_update_cola);
                    
                    if (scriptParameters.format === 'PDF') {
                    const   searchbook = getTransactions(scriptParameters);
                    const transactionJSON = searchbook.content;
                    log.debug('transactionJSON', transactionJSON);
                    let jsonAxiliar = getJsonData(transactionJSON, scriptParameters);
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    
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
                    let auxiliaryRecords = getAuxiliaryRecords(environmentFeatures, scriptParameters);

                    let fileName = getFileName(scriptParameters, auxiliaryRecords, 1);
                    // Guardar el PDF en el File Cabinet
                    pdfFile.name = fileName + '.pdf';
                    pdfFile.folder = scriptParameters.folderId;
                    let pdfFileId = pdfFile.save();

                    let auxFile = file.load({ id: pdfFileId });
                    var urlfile = auxFile.url;

                    let fileAux = file.load({
                        id: pdfFileId
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
                    let auxiliaryRecords = getAuxiliaryRecords(environmentFeatures, scriptParameters);

                    let transactionsJson = getTransactionData(scriptParameters, environmentFeatures, auxiliaryRecords);
                    log.error("transactionsJson", transactionsJson);
                    let dataContent = generateFileContent(transactionsJson, auxiliaryRecords, scriptParameters);
                    saveFile(dataContent, scriptParameters, environmentFeatures, auxiliaryRecords, 1, parametros.idCola);
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

        const getScriptParameters = (parametros) => {
            let scriptParameters = {};

            scriptParameters.subsidiaryId = parametros.custbody_ts_le_subsidiaria;
            scriptParameters.periodId = parametros.custbody_ts_le_periodo;
            scriptParameters.format = parametros.salida_reporte_nombre;
            scriptParameters.folderId = parametros.salida_folder;
            scriptParameters.year = parametros.custbody_ts_le_anio_contable; 

            log.error("scriptParameters", scriptParameters);

            return scriptParameters;
        }

        const getEnvironmentFeatures = () => {
            let features = {};
            features.hasSubsidiaries = runtime.isFeatureInEffect({
                feature: "SUBSIDIARIES"
            });
            return features;
        }


        const createLogRecord = (scriptParameters, hasSubsidiariesFeature) => {
            try {
                let recordlog = record.create({ type: "customrecord_pe_generation_logs" });
                if (hasSubsidiariesFeature) {
                    recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: scriptParameters.subsidiaryId });
                }
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: scriptParameters.periodId });
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.20' });
                let recordlogid = recordlog.save();

                return recordlogid;
            } catch (e) {
                log.error({ title: 'createRecord', details: e });
            }
        }

        const getAuxiliaryRecords = (environmentFeatures, scriptParameters) => {
            let auxiliaryFields = {};

            auxiliaryFields.subsidiary = getSubsidiaryRecord(environmentFeatures.hasSubsidiaries, scriptParameters.subsidiaryId);

            auxiliaryFields.period = getPeriodRecord(scriptParameters.periodId);

            return auxiliaryFields;
        }

        const getSubsidiaryRecord = (hasSubsidiariesFeature, subsidiaryId) => {
            let subsidiaryRecord = {
                taxidnum: "",
                name: "",
                legalname: ""
            };
            try {
                if (hasSubsidiariesFeature) {
                    if (!subsidiaryId) return subsidiaryRecord;
                    let subsidiarySearch = search.lookupFields({
                        type: search.Type.SUBSIDIARY,
                        id: subsidiaryId,
                        columns: ["taxidnum", "name", "legalname"]
                    });
                    subsidiaryRecord.taxidnum = subsidiarySearch.taxidnum;
                    subsidiaryRecord.name = subsidiarySearch.name;
                    subsidiaryRecord.legalname = subsidiarySearch.legalname;
                } else {
                    let company = config.load({
                        type: config.Type.COMPANY_INFORMATION
                    });
                    subsidiaryRecord.taxidnum = company.getValue("employerid");
                    subsidiaryRecord.name = "";
                    subsidiaryRecord.legalname = "";
                }
            } catch (error) {
                log.error("An error was found in [getSubsidiaryRecord]", error);
            }
            return subsidiaryRecord;
        }

        const getPeriodRecord = (periodId) => {
            let periodRecord = {
                startDate: "",
                endDate: "",
                year: "",
            };
            try {
                var periodSearch = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: periodId,
                    columns: ['startdate', 'enddate']
                });
                let startDate = format.parse({
                    value: periodSearch.startdate,
                    type: format.Type.DATE
                });
                var periodYear = startDate.getFullYear();
                var month = startDate.getMonth() + 1;
                var periodEndDate = new Date(periodYear, 11, 31);
                periodRecord.year = periodYear;
                periodRecord.month = `${month < 10 ? '0' : ''}${month}`;
                periodRecord.endDate = periodSearch.enddate;
                periodRecord.startDate = periodSearch.startdate;
            } catch (error) {
                log.error("An error was found in [getPeriodRecord]", error);
            }
            return periodRecord;
        }

        const generateFileContent = (codeListJson, auxiliaryRecords, scriptParameters) => {
            let dataSctructure = [
                { "2D01ST": ["2D01ST"] },
                { "2D0201": ["2D0201"] },
                { "2D02ST": ["2D01ST", "2D0201"] },
                { "2D0302": ["2D0302"] },
                { "2D0301": ["2D0301"] },
                { "2D0407": ["2D0407"] },
                { "2D0403": ["2D0403"] },
                { "2D0404": ["2D0404"] },
                { "2D0412": ["2D0412"] },
                { "2D03ST": ["2D02ST", "2D0302", "2D0301", "2D0407", "2D0403", "2D0404", "2D0412"] },
                { "2D0401": ["2D0401"] },
                { "2D0402": ["2D0402"] },
                { "2D0410": ["2D0410"] },
                { "2D0414": ["2D0414"] },
                { "2D0411": ["2D0411"] },
                { "2D0413": ["2D0413"] },
                { "2D04ST": ["2D03ST", "2D0401", "2D0402", "2D0410", "2D0414", "2D0411", "2D0413"] },
                { "2D0502": ["2D0502"] },
                { "2D0503": ["2D0503"] },
                { "2D0504": ["2D0504"] },
                { "2D07ST": ["2D04ST", "2D0502", "2D0503", "2D0504"] }
            ];
            let fileContent = "";

            dataSctructure.forEach(structure => {
                for (let mainCode in structure) {
                    let codes = structure[mainCode];
                    let amount = 0;
                    for (let i = 0; i < codes.length; i++) {
                        amount = roundTwoDecimal(amount + (codeListJson[codes[i]] || 0));
                    }
                    codeListJson[mainCode] = amount;
                    let periodo = `${scriptParameters.year}1231`;
                    let codigoCatalogo = '09';
                    let rubro = mainCode;
                    let saldo = amount;
                    let estadoOperacion = "1";
                    fileContent = `${fileContent}${periodo}|${codigoCatalogo}|${rubro}|${saldo}|${estadoOperacion}|\n`;
                }
            });
            log.error("fileContent", fileContent);
            return fileContent;
        }

        const getTransactionData = (scriptParameters, environmentFeatures, auxiliaryRecords) => {
            let savedSearch = search.load({ id: SEARCH_ID })

            let periodIds = getPeriodsIdsByYear(scriptParameters.year);
            let formula = getPeriodFormula(periodIds);
            let periodFilter = search.createFilter({
                name: 'formulatext',
                formula: formula,
                operator: search.Operator.IS,
                values: '1'
            });
            savedSearch.filters.push(periodFilter);

            let resultDataJson = {};
            let pagedData = savedSearch.runPaged({ pageSize: 1000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let codigoGastoAdministrativo = result.getValue(columns[0]).replace('- None -', '');
                    let codigoGastoVentas = result.getValue(columns[1]).replace('- None -', '');
                    let codigo = result.getValue(columns[2]).replace('- None -', '');
                    let sumaGastoAdministrativo = Number(result.getValue(columns[3]));
                    let sumaGastoVentas = Number(result.getValue(columns[4]));
                    let suma = Number(result.getValue(columns[5]));
                    let idCodigo = codigo || codigoGastoAdministrativo || codigoGastoVentas;
                    let saldo = suma || sumaGastoAdministrativo || sumaGastoVentas;

                    if (!idCodigo) return;
                    resultDataJson[idCodigo] = saldo;
                });
            });
            return resultDataJson;
        }

        const saveFile = (fileContent, scriptParameters, environmentFeatures, auxiliaryRecords, hasInfo, idCola) => {
            let fileName = getFileName(scriptParameters, auxiliaryRecords, hasInfo);
            let fileType = "";
            let header = "";
            if (scriptParameters.format == 'CSV') {
                fileName = fileName + '.csv';
                fileContent = header + fileContent;
                fileContent = fileContent.replace(/[,]/gi, ' ');
                fileContent = fileContent.replace(/[|]/gi, ',');
                fileType = file.Type.CSV;
            } else {
                fileName = fileName + '.txt';
                fileType = file.Type.PLAINTEXT;
            }
            let txtFile = file.create({
                name: fileName,
                fileType: fileType,
                contents: fileContent,
                encoding: file.Encoding.UTF8,
                folder: scriptParameters.folderId
            });

            let fileId = txtFile.save();
            let loadedFile = file.load({ id: fileId });


              
            param_update_cola = {
                idCola: idCola,
                estado: 'FINALIZADO',
                fechaFin: new Date(),
                urlArchivo:  `${loadedFile.url}&_xd=T`,
                nombreArchivo: fileName
            };

            const statusProcess = updateCola(param_update_cola); 
             
        }

        const getFileName = (scriptParameters, auxiliaryRecords, hasInfo) => {
            return `LE${auxiliaryRecords.subsidiary.taxidnum}${scriptParameters.year}1231032000071${hasInfo}11`;
        }

        const roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }

        const getPeriodsIdsByYear = (year) => {
            let periods = [];
            let periodResult = search.create({
                type: "accountingperiod",
                filters: [
                    ["isadjust", "is", "F"],
                    "AND",
                    ["isyear", "is", "F"],
                    "AND",
                    ["isquarter", "is", "F"],
                    "AND",
                    ["formulanumeric: TO_NUMBER(TO_CHAR({startdate},'YYYY'))", "is", year],
                ],
                columns: ["internalid"]
            }).run().getRange(0, 1000);
            for (let i = 0; i < periodResult.length; i++) {
                let id = periodResult[i].getValue("internalid");
                periods.push(id);
            }
            return periods;
        }

        const getPeriodFormula = (periods) => {
            if (periods.length) {
                return "CASE WHEN {postingperiod.id} IN (" + periods.join(',') + ") THEN '1' ELSE '0' END";
            } else {
                return "'0'";
            }
        }

        const getTransactions = (params) => {
            
            try {
            var arrResult = [];
            var _cont = 0;
        
            // PE - Libro de Inventario y Balances - Estado de Resultados - 3.20
            var savedSearch = search.load({
              id: "customsearch_pe_libro_impreso_3_20",
            });
        

              savedSearch.filters.push(
                search.createFilter({
                  name: "subsidiary",
                  operator: search.Operator.IS,
                  values: params.subsidiaryId,
                })
              );
        
              var startdate = format.format({
                value: new Date(params.year, 0, 1),
                type: format.Type.DATE,
                });
                var enddate = format.format({
                value: new Date(params.year, 12, 0),
                type: format.Type.DATE,
                });
            
                savedSearch.filters.push(
                search.createFilter({
                    name: "trandate",
                    operator: search.Operator.WITHIN,
                    values: [startdate, enddate],
                })
                );
        
            year = params.year
        
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
        
                // 0. CODIGO
                arrAux[0] = result.getValue(columns[0]);
        
                // 1. MONTO
                arrAux[1] = result.getValue(columns[1]);
        
                // 1. MONTO
                arrAux[2] = result.getValue(columns[2]);
        
                // 1. MONTO
                arrAux[3] = result.getValue(columns[3]);
        
                // NOMBRE CODIGO 3.20
                arrAux[4] = result.getValue(columns[6]);
        
                /*arrResult.push({
                    key: _cont++,
                    resultTransactions: {
                        dato1: arrAux[0],
                        dato2: arrAux[1],
                        dato3: arrAux[2],
                        dato4: arrAux[3],
                        dato_descripcion: arrAux[4],
                    }

                });*/
                arrResult.push({
                        dato1: arrAux[0],
                        dato2: arrAux[1],
                        dato3: arrAux[2],
                        dato4: arrAux[3],
                        dato_descripcion: arrAux[4],
                    

                });

                
              });
            });
            log.debug("arrResult", arrResult);
            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult }
            }
            return { thereisinfo: 0 }
            
        } catch (error) {
            log.error('getTransactions()', error.message);
        }
          };

        
          const getJsonData = (transactions,params) => {
            try {
            let userTemp = runtime.getCurrentUser(),
              useID = userTemp.id,
              jsonTransacion = {},
              jsonFinal = [],
              saldo = 0;
        
           /* var employeeName = search.lookupFields({
              type: search.Type.EMPLOYEE,
              id: useID,
              columns: ["firstname", "lastname"],
            });
            var userName = employeeName.firstname + " " + employeeName.lastname;
            */
        
            log.debug("jsonTransacion", jsonTransacion);
        
            var cont = 0;
        
            var totales = {};
            totales.ventas_netas_ingresos_operacionales = 0;
            totales.otros_ingresos_operacionales = 0;
            totales.total_ingresos_brutos = 0;
            totales.costo_de_ventas = 0;
            totales.utilidad_bruta = 0;
        
            totales.gastos_de_administracion = 0;
            totales.gastos_de_venta = 0;
            totales.depreciacion_y_amortizacion = 0;
            totales.utilidad_operativa = 0;
        
            totales.ingresos_financieros = 0;
            totales.gastos_financieros = 0;
            totales.otros_ingresos_de_gestion = 0;
            totales.perdida_por_diferencia_de_cambio = 0;
            totales.ganancia_por_diferencia_de_cambio = 0;
            totales.otros_gastos = 0;
            totales.resultados_por_exposicion_a_la_inflacion = 0;
        
            totales.impuesto_a_la_renta_y_partidas_extraordinaria = 0;
            totales.participaciones = 0;
            totales.impuesto_a_la_renta = 0;
        
            totales.resultados_antes_de_partidas_extraordinarias = 0;
            totales.ingresos_extraordinarios = 0;
            totales.gastos_extraordinarios = 0;
        
            totales.resultado_antes_de_interes_minoritario = 0;
            totales.interes_minoritario = 0;
        
            totales.utilidad_perdida_neta_del_ejercicio = 0;
            for (var k in transactions) {
              hasInfo = 1;
        
              cont++;
              let IDD = cont;
        
              if (!jsonTransacion[IDD]) {
                let dato_4 = parseFloat(transactions[k].dato4);
                
        
                // let debitoFormat = numberWithCommas(transactions[k].debito);
                // log.debug('debitoFormat', debitoFormat);
                jsonTransacion[IDD] = {
                  dato1: transactions[k].dato1,
                  dato2: transactions[k].dato2,
                  dato3: transactions[k].dato3,
                  dato4: dato_4,
                };
                saldo += dato_4;
                // totalCredito = totalCredito + Number(transactions[k].credito);
        
                switch (transactions[k].dato_descripcion) {
                  case "Ventas Netas (ingresos operacionales)":
                    totales.ventas_netas_ingresos_operacionales += dato_4;
                    break;
                  case "Otros Ingresos Operacionales":
                    totales.otros_ingresos_operacionales += dato_4;
                    break;
                  case "Costo de ventas":
                    totales.costo_de_ventas += dato_4;
                    break;
                  case "Gastos de Administración":
                    totales.gastos_de_administracion += dato_4;
                    break;
                  case "Gastos de Venta":
                    totales.gastos_de_venta += dato_4;
                    break;
                  case "Depreciación y Amortización":
                    totales.depreciacion_y_amortizacion += dato_4;
                    break;
                  case "Ingresos Financieros":
                    totales.ingresos_financieros += dato_4;
                    break;
                  case "Gastos Financieros":
                    totales.gastos_financieros += dato_4;
                    break;
                  case "Otros ingresos de gestión":
                    totales.otros_ingresos_de_gestion += dato_4;
                    break;
                  case "Perdida por Diferencia de Cambio":
                    totales.perdida_por_diferencia_de_cambio += dato_4;
                    break;
                  case "Ganancia por Diferencia de Cambio":
                    totales.ganancia_por_diferencia_de_cambio += dato_4;
                    break;
                  case "Otros Gastos":
                    totales.otros_gastos += dato_4;
                    break;
                  case "Resultados por Exposición a la Inflación":
                    totales.resultados_por_exposicion_a_la_inflacion += dato_4;
                    break;
                  case "Participaciones":
                    totales.participaciones += dato_4;
                    break;
                  case "Impuesto a la Renta":
                    totales.impuesto_a_la_renta += dato_4;
                    break;
                  case "Ingresos Extraordinarios":
                    totales.ingresos_extraordinarios += dato_4;
                    break;
                  case "Gastos Extraordinarios":
                    totales.gastos_extraordinarios += dato_4;
                    break;
                  case "Interés Minoritario":
                    totales.interes_minoritario += dato_4;
                    break;
                }
              }
            }
        
            totales.total_ingresos_brutos = totales.ventas_netas_ingresos_operacionales + totales.otros_ingresos_operacionales;
            totales.utilidad_bruta = totales.costo_de_ventas;
            totales.utilidad_operativa = totales.gastos_de_administracion + totales.gastos_de_venta + totales.depreciacion_y_amortizacion;
        
            totales.impuesto_a_la_renta_y_partidas_extraordinaria = totales.participaciones + totales.impuesto_a_la_renta;
            totales.resultados_antes_de_partidas_extraordinarias = totales.ingresos_extraordinarios + totales.gastos_extraordinarios;
            totales.resultado_antes_de_interes_minoritario = totales.interes_minoritario;
        
            totales.utilidad_perdida_neta_del_ejercicio = totales.resultado_antes_de_interes_minoritario;
        
            //formato
            totales.ventas_netas_ingresos_operacionales = numberWithCommas(roundTwoDecimals(totales.ventas_netas_ingresos_operacionales).toFixed(2));
            totales.otros_ingresos_operacionales = numberWithCommas(roundTwoDecimals(totales.otros_ingresos_operacionales).toFixed(2));
            totales.total_ingresos_brutos = numberWithCommas(roundTwoDecimals(totales.total_ingresos_brutos).toFixed(2));
            totales.costo_de_ventas = numberWithCommas(roundTwoDecimals(totales.costo_de_ventas).toFixed(2));
            totales.utilidad_bruta = numberWithCommas(roundTwoDecimals(totales.utilidad_bruta).toFixed(2));
            totales.gastos_de_administracion = numberWithCommas(roundTwoDecimals(totales.gastos_de_administracion).toFixed(2));
            totales.gastos_de_venta = numberWithCommas(roundTwoDecimals(totales.gastos_de_venta).toFixed(2));
            totales.depreciacion_y_amortizacion = numberWithCommas(roundTwoDecimals(totales.depreciacion_y_amortizacion).toFixed(2));
            totales.utilidad_operativa = numberWithCommas(roundTwoDecimals(totales.utilidad_operativa).toFixed(2));
            totales.ingresos_financieros = numberWithCommas(roundTwoDecimals(totales.ingresos_financieros).toFixed(2));
            totales.gastos_financieros = numberWithCommas(roundTwoDecimals(totales.gastos_financieros).toFixed(2));
            totales.otros_ingresos_de_gestion = numberWithCommas(roundTwoDecimals(totales.otros_ingresos_de_gestion).toFixed(2));
            totales.perdida_por_diferencia_de_cambio = numberWithCommas(roundTwoDecimals(totales.perdida_por_diferencia_de_cambio).toFixed(2));
            totales.ganancia_por_diferencia_de_cambio = numberWithCommas(roundTwoDecimals(totales.ganancia_por_diferencia_de_cambio).toFixed(2));
            totales.otros_gastos = numberWithCommas(roundTwoDecimals(totales.otros_gastos).toFixed(2));
            totales.resultados_por_exposicion_a_la_inflacion = numberWithCommas(roundTwoDecimals(totales.resultados_por_exposicion_a_la_inflacion).toFixed(2));
            totales.impuesto_a_la_renta_y_partidas_extraordinaria = numberWithCommas(roundTwoDecimals(totales.impuesto_a_la_renta_y_partidas_extraordinaria).toFixed(2));
            totales.participaciones = numberWithCommas(roundTwoDecimals(totales.participaciones).toFixed(2));
            totales.impuesto_a_la_renta = numberWithCommas(roundTwoDecimals(totales.impuesto_a_la_renta).toFixed(2));
            totales.resultados_antes_de_partidas_extraordinarias = numberWithCommas(roundTwoDecimals(totales.resultados_antes_de_partidas_extraordinarias).toFixed(2));
            totales.ingresos_extraordinarios = numberWithCommas(roundTwoDecimals(totales.ingresos_extraordinarios).toFixed(2));
            totales.gastos_extraordinarios = numberWithCommas(roundTwoDecimals(totales.gastos_extraordinarios).toFixed(2));
            totales.resultado_antes_de_interes_minoritario = numberWithCommas(roundTwoDecimals(totales.resultado_antes_de_interes_minoritario).toFixed(2));
            totales.interes_minoritario = numberWithCommas(roundTwoDecimals(totales.interes_minoritario).toFixed(2));
            totales.utilidad_perdida_neta_del_ejercicio = numberWithCommas(roundTwoDecimals(totales.utilidad_perdida_neta_del_ejercicio).toFixed(2));
        
            /*let periodSearch = search.lookupFields({
              type: search.Type.ACCOUNTING_PERIOD,
              id: pGloblas.pPeriod,
              columns: ["periodname"],
            });
        
            year = periodSearch.periodname.split(" ")[1];*/
        
            let jsonCompany = {
              company: {
                firtsTitle: 'FORMATO 3.20: LIBRO DE INVENTARIOS Y BALANCES - ESTADO DE GANANCIAS Y PÉRDIDAS POR FUNCIÓN DEL 01.01 AL 31.12',
                secondTitle: params.year,
                thirdTitle: getSubsidiaria(params.subsidiaryId, 'ruc'),
                fourthTitle: getSubsidiaria(params.subsidiaryId, 'razonSocial').toUpperCase()
              },
              totals: {
                dato4: Number(saldo).toFixed(2),
              },
              movements: jsonTransacion,
              totales: totales,
            };
        
            return jsonCompany;

        } catch (e) {
            log.error({ title: "getJsonData", details: e });
        }
          };

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


        const roundTwoDecimals = (value) => {
            return Math.round(value * 100) / 100;
          };


          const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
          };

          const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_20_pdf.ftl");
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

        return { execute }

    });
