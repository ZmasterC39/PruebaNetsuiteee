/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/render"],

    (search, record, runtime, log, file, task, config, render) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_3_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_1';
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
                    const searchId = 'customsearch_pe_detalle_3_1'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1
                    var logrecodId = 'customrecord_pe_generation_logs';
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
                        //(params.filterPostingPeriod, fedIdNumb, hasinfo, '', params.filterFormat, structuregbody, params.fileCabinetId,params.filterAnioPeriod);

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
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null }); //filterPostingPeriod
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.1' });
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


                const searchResultCount = searchLoad.runPaged().count;
                // const periodname = getPeriodName(period);
                // const periodostring = retornaPeriodoStringForView(periodname);
                // const PeriodoCompleto = func(periodostring.valorAnio, periodostring.valorMes);            

                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let column01 = result.getValue(searchLoad.columns[0]);
                            column01 = column01.split('/');
                            const PeriodoCompleto = func(column01[0], column01[1]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            let column03 = result.getValue(searchLoad.columns[2]);
                            column03 = column03.replace("- None -", "");
                            let column04 = result.getValue(searchLoad.columns[3]);
                            column04 = parseFloat(column04).toFixed(2);
                            //column04 = numberWithCommas(column04);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            let column06 = result.getValue(searchLoad.columns[5]);
                            // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                            // column06 = column06.replace(/[\/\\|]/g, "");
                            //log.debug('COL06', column06 + ' - ' + anioperiod);
                            if (column06 == anioperiod) {
                                json.push({
                                    c1_periodo: column01,//PeriodoCompleto
                                    c2_cod_catalogo: column02,
                                    c3_cod_rubro: column03,
                                    c4_saldo_rubro: column04,
                                    c5_estado_operacion: column05
                                    // c6_campos_libres: column06

                                });
                            }
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
                                let column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                column03 = column03.replace("- None -", "");
                                let column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                column04 = parseFloat(column04).toFixed(2);
                                //column04 = numberWithCommas(column04);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                                // column06 = column06.replace(/[\/\\|]/g, "");
                                //log.debug('COL06', column06);
                                if (column06 == anioperiod) {
                                    json.push({
                                        c1_periodo: column01,//PeriodoCompleto
                                        c2_cod_catalogo: column02,
                                        c3_cod_rubro: column03,
                                        c4_saldo_rubro: column04,
                                        c5_estado_operacion: column05
                                        // c6_campos_libres: column06
                                    });
                                }
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
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cod_catalogo + '|' + searchResult[i].c3_cod_rubro + '|' +
                        searchResult[i].c4_saldo_rubro + '|' + searchResult[i].c5_estado_operacion + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }


        const createFile = (params, fedIdNumb, hasinfo, transactionJSON) => {
            let typeformat;
            const header = '1 Periodo|2 Codigo de catalogo|3 Codigo de rubro|4 Saldo rubro|5 Estado de operacion|6 Campos libres| \n';
            try {
                let periodname = params.filterAnioPeriod;

                let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030100' + '07' + '1' + hasinfo + '11';//_' + recordlogid;
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
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_1.ftl");
            return aux.getContents();
        };

        const getTransactions = (params) => {
            // log.debug('MSK', 'getTransactions - Inicio');
            var arrResult = [];
            var _cont = 0;
      
            // FORMATO 3.24: "Anual: Libro de Invent...dos integrales - 3.24" 
            var savedSearch = search.load({
                id: 'customsearch_pe_libro_impreso_3_1'
            });
            
            savedSearch.filters.push(search.createFilter({
                name: 'subsidiary',
                operator: search.Operator.IS,
                values: params.filterSubsidiary
            }));
      
            var pagedData = savedSearch.runPaged({
                pageSize: 1000
            });
      
            var page, columns;
      
            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index
                });
      
                page.data.forEach(function (result) {
                    columns = result.columns;
                    // log.debug('result mirame', result);
                    arrAux = new Array();
                    // 0. CÓDIGO ÚNICO DE LA OPERACIÓN
                    arrAux[0] = result.getValue(columns[0]);
                    // 1. FECHA DE LA OPERACIÓN	
                    arrAux[1] = result.getValue(columns[1]);
      
                    // NOMBRE CODIGO 3.1
                    arrAux[2] = result.getValue(columns[2]);
                    // NOMBRE CODIGO 3.1
                    arrAux[3] = result.getValue(columns[3]);
      
                    arrResult.push({dato1: arrAux[0], dato2: arrAux[1], dato_descripcion: arrAux[2], dato_descripcion2: arrAux[3]});
                });
            });
            log.debug('MSK', arrResult);
            log.debug('MSK length', arrResult.length);
            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult }
            }
            return { thereisinfo: 0 }
        }

        const getJsonData = (transactions, params) => {
            try {
                // log.debug('MSK', 'getJsonData - Inicio');
                let userTemp = runtime.getCurrentUser(), useID = userTemp.id, jsonTransacion = {}, totalDebito = 0, totalCredito = 0, saldoDebito = 0, saldoCredito = 0, saldo = 0;
                log.debug('PASO 1', '1');
                var employeeName = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: useID,
                    columns: ['firstname', 'lastname']
                });
                
                var userName = employeeName.firstname + ' ' + employeeName.lastname;
                
                // log.debug('transactions', transactions);
        
                var activo = {}
                activo.efectivo=0;
                activo.cpc_comerciales_terceros=0;
                activo.cpc_personal_accionistas=0;
                activo.cpc_diversas=0;
                activo.servicios_otros_contratados=0;
                activo.existenias=0;
                activo.anticipios_otorgados=0;
                activo.TOTAL_ACTIVO_CORRIENTE=0;
                activo.estimacion_cuentas_cobranza=0;
                activo.inversiones_mobiliarias=0;
                activo.activos_adquiridos=0;
                activo.propiedades_planta_equipo=0;
                activo.intangibles=0;
                activo.depreciacion=0;
                activo.TOTAL_ACTIVO_NO_CORRIENTE=0;
                activo.TOTAL_ACTIVO=0;
                var pasivo = {}
                pasivo.sobregiro_bancario=0;
                pasivo.cpp_comerciales_terceros=0;
                pasivo.tributos=0;
                pasivo.remuneraciones=0;
                pasivo.cpp_diversas=0;
                pasivo.otras_proviciones=0;
                pasivo.anticipos_recibidos=0;
                pasivo.obligaciones_financieras=0;
                pasivo.TOTAL_PASIVO_CORRIENTE=0;
                pasivo.obligaciones_financieras2=0;
                pasivo.ingresos_diferidos=0;
                pasivo.TOTAL_PASIVO_NO_CORRIENTE=0;
                pasivo.capital=0;
                pasivo.capital_adicional=0;
                pasivo.resultados_Acumulados=0;
                pasivo.determinacion_resultado=0;
                pasivo.TOTAL_PATRIMONIO_NETO=0;
                pasivo.TOTAL_PASIVO_PATRIMONIO_NETO=0;
        
                for (var k in transactions) {
                    let IDD = transactions[k].dato1;
                    if (!jsonTransacion[IDD]) {
                        let dato_2 = parseFloat(transactions[k].dato2);
                        log.debug('dato_4', dato_2);
                        // let debitoFormat = numberWithCommas(transactions[k].debito);
                        // log.debug('debitoFormat', debitoFormat);
                        jsonTransacion[IDD] = {
                            dato1: transactions[k].dato1,
                            dato2: dato_2,
                        }
                        saldo += dato_2;
                        // totalCredito = totalCredito + Number(transactions[k].credito);
        
                        log.debug('MSK-valor',transactions[k].dato_descripcion2)
                        switch(transactions[k].dato_descripcion2){
                        // case "Capital Adicional":
                        //     activo.efectivo += dato_2;
                        //     break;
                        // case "1D0109TEMP":
                        //     activo.cpc_comerciales_terceros += dato_2;
                        //     break;
                        case "Efectivo y equivalentes de efectivo":
                            activo.efectivo += dato_2;
                            break;
                        case "Cuentas por cobrar comerciales - Terceros":
                            activo.cpc_comerciales_terceros += dato_2;
                            break;
                        case "Cuentas por cobrar al personal, a los accionistas (socios), directores y gerentes":
                            activo.cpc_personal_accionistas += dato_2;
                            break;
                        case "Cuentas por cobrar diversas - Terceros":
                            activo.cpc_diversas += dato_2;
                            break;
                        case "Servicios y otros contratados por anticipados":
                            activo.servicios_otros_contratados += dato_2;
                            break;
                        case "Existencias":
                            activo.existenias += dato_2;
                            break;
                        case "Anticipos Otorgados":
                            activo.anticipios_otorgados += dato_2;
                            break;
                        case "Estimacion de cuentas de cobranza dudosa":
                            activo.estimacion_cuentas_cobranza += dato_2;
                            break;
                        case "Inversiones Mobiliarias":
                            activo.inversiones_mobiliarias += dato_2;
                            break;
                        case "Activos Adquiridos en Arrendamiento":
                            activo.activos_adquiridos += dato_2;
                            break;
                        case "Propiedades, Planta y Equipo":
                            activo.propiedades_planta_equipo += dato_2;
                            break;
                        case "Intangibles":
                            activo.intangibles += dato_2;
                            break;
                        case "Sobregiro Bancario":
                            pasivo.sobregiro_bancario += dato_2;
                            break;
                        case "Cuentas por pagar comerciales - Terceros":
                            pasivo.cpp_comerciales_terceros += dato_2;
                            break;
                        case "Tributos, contraprestaciones y aportes al sistema de pensiones y de salud por pagar":
                            pasivo.tributos += dato_2;
                            break;
                        case "Remuneraciones y participaciones por pagar":
                            pasivo.remuneraciones += dato_2;
                            break;
                        case "Cuentas por pagar diversas - Terceros":
                            pasivo.cpp_diversas += dato_2;
                            break;
                        case "Otras provisiones":
                            pasivo.otras_proviciones += dato_2;
                            break;
                        case "Anticipos recibidos":
                            pasivo.anticipos_recibidos += dato_2;
                            break;
                        case "Obligaciones Financieras":
                            pasivo.obligaciones_financieras += dato_2;
                            break;
                        case "Obligaciones Financieras":
                            pasivo.obligaciones_financieras2 += dato_2;
                            break;
                        case "Ingresos Diferidos":
                            pasivo.ingresos_diferidos += dato_2;
                            break;
                        case "Capital":
                            pasivo.capital += dato_2;
                            break;
                        case "Capital Adicional":
                            pasivo.capital_adicional += dato_2;
                            break;
                        case "Resultados acumulados":
                            pasivo.resultados_Acumulados += dato_2;
                            break;
                        case "Determinación del resultado del ejercicio":
                            pasivo.determinacion_resultado += dato_2;
                            break;
                        }
                    }
                }
                activo.TOTAL_ACTIVO_CORRIENTE=activo.efectivo+
                                            activo.cpc_comerciales_terceros+
                                            activo.cpc_personal_accionistas+
                                            activo.cpc_diversas+
                                            activo.servicios_otros_contratados+
                                            activo.existenias+
                                            activo.anticipios_otorgados
        
                activo.TOTAL_ACTIVO_NO_CORRIENTE=activo.estimacion_cuentas_cobranza+
                                            activo.inversiones_mobiliarias+
                                            activo.activos_adquiridos+
                                            activo.propiedades_planta_equipo+
                                            activo.intangibles+
                                            activo.depreciacion
        
                activo.TOTAL_ACTIVO=activo.TOTAL_ACTIVO_CORRIENTE+activo.TOTAL_ACTIVO_NO_CORRIENTE
                
                pasivo.TOTAL_PASIVO_CORRIENTE=pasivo.sobregiro_bancario+
                                            pasivo.cpp_comerciales_terceros+
                                            pasivo.tributos+
                                            pasivo.remuneraciones+
                                            pasivo.cpp_diversas+
                                            pasivo.otras_proviciones+
                                            pasivo.anticipos_recibidos+
                                            pasivo.obligaciones_financieras
        
                
                pasivo.TOTAL_PASIVO_NO_CORRIENTE= pasivo.obligaciones_financieras2+
                                                pasivo.ingresos_diferidos
        
                pasivo.TOTAL_PATRIMONIO_NETO=pasivo.capital+
                                                pasivo.capital_adicional+
                                                pasivo.resultados_Acumulados+
                                                pasivo.determinacion_resultado
                
                pasivo.TOTAL_PASIVO_PATRIMONIO_NETO=pasivo.TOTAL_PASIVO_CORRIENTE+pasivo.TOTAL_PASIVO_NO_CORRIENTE+pasivo.TOTAL_PATRIMONIO_NETO
        
                //formato
                activo.efectivo=numberWithCommas(roundTwoDecimals(activo.efectivo).toFixed(2));
                activo.cpc_comerciales_terceros=numberWithCommas(roundTwoDecimals(activo.cpc_comerciales_terceros).toFixed(2));
                activo.cpc_personal_accionistas=numberWithCommas(roundTwoDecimals(activo.cpc_personal_accionistas).toFixed(2));
                activo.cpc_diversas=numberWithCommas(roundTwoDecimals(activo.cpc_diversas).toFixed(2));
                activo.servicios_otros_contratados=numberWithCommas(roundTwoDecimals(activo.servicios_otros_contratados).toFixed(2));
                activo.existenias=numberWithCommas(roundTwoDecimals(activo.existenias).toFixed(2));
                activo.anticipios_otorgados=numberWithCommas(roundTwoDecimals(activo.anticipios_otorgados).toFixed(2));
                activo.TOTAL_ACTIVO_CORRIENTE=numberWithCommas(roundTwoDecimals(activo.TOTAL_ACTIVO_CORRIENTE).toFixed(2));
                activo.estimacion_cuentas_cobranza=numberWithCommas(roundTwoDecimals(activo.estimacion_cuentas_cobranza).toFixed(2));
                activo.inversiones_mobiliarias=numberWithCommas(roundTwoDecimals(activo.inversiones_mobiliarias).toFixed(2));
                activo.activos_adquiridos=numberWithCommas(roundTwoDecimals(activo.activos_adquiridos).toFixed(2));
                activo.propiedades_planta_equipo=numberWithCommas(roundTwoDecimals(activo.propiedades_planta_equipo).toFixed(2));
                activo.intangibles=numberWithCommas(roundTwoDecimals(activo.intangibles).toFixed(2));
                activo.depreciacion=numberWithCommas(roundTwoDecimals(activo.depreciacion).toFixed(2));
                activo.TOTAL_ACTIVO_NO_CORRIENTE=numberWithCommas(roundTwoDecimals(activo.TOTAL_ACTIVO_NO_CORRIENTE).toFixed(2));
                activo.TOTAL_ACTIVO=numberWithCommas(roundTwoDecimals(activo.TOTAL_ACTIVO).toFixed(2));
                pasivo.sobregiro_bancario=numberWithCommas(roundTwoDecimals(pasivo.sobregiro_bancario).toFixed(2));
                pasivo.cpp_comerciales_terceros=numberWithCommas(roundTwoDecimals(pasivo.cpp_comerciales_terceros).toFixed(2));
                pasivo.tributos=numberWithCommas(roundTwoDecimals(pasivo.tributos).toFixed(2));
                pasivo.remuneraciones=numberWithCommas(roundTwoDecimals(pasivo.remuneraciones).toFixed(2));
                pasivo.cpp_diversas=numberWithCommas(roundTwoDecimals(pasivo.cpp_diversas).toFixed(2));
                pasivo.otras_proviciones=numberWithCommas(roundTwoDecimals(pasivo.otras_proviciones).toFixed(2));
                pasivo.anticipos_recibidos=numberWithCommas(roundTwoDecimals(pasivo.anticipos_recibidos).toFixed(2));
                pasivo.obligaciones_financieras=numberWithCommas(roundTwoDecimals(pasivo.obligaciones_financieras).toFixed(2));
                pasivo.TOTAL_PASIVO_CORRIENTE=numberWithCommas(roundTwoDecimals(pasivo.TOTAL_PASIVO_CORRIENTE).toFixed(2));
                pasivo.obligaciones_financieras2=numberWithCommas(roundTwoDecimals(pasivo.obligaciones_financieras2).toFixed(2));
                pasivo.ingresos_diferidos=numberWithCommas(roundTwoDecimals(pasivo.ingresos_diferidos).toFixed(2));
                pasivo.TOTAL_PASIVO_NO_CORRIENTE=numberWithCommas(roundTwoDecimals(pasivo.TOTAL_PASIVO_NO_CORRIENTE).toFixed(2));
                pasivo.capital=numberWithCommas(roundTwoDecimals(pasivo.capital).toFixed(2));
                pasivo.capital_adicional=numberWithCommas(roundTwoDecimals(pasivo.capital_adicional).toFixed(2));
                pasivo.resultados_Acumulados=numberWithCommas(roundTwoDecimals(pasivo.resultados_Acumulados).toFixed(2));
                pasivo.determinacion_resultado=numberWithCommas(roundTwoDecimals(pasivo.determinacion_resultado).toFixed(2));
                pasivo.TOTAL_PATRIMONIO_NETO=numberWithCommas(roundTwoDecimals(pasivo.TOTAL_PATRIMONIO_NETO).toFixed(2));
                pasivo.TOTAL_PASIVO_PATRIMONIO_NETO=numberWithCommas(roundTwoDecimals(pasivo.TOTAL_PASIVO_PATRIMONIO_NETO).toFixed(2));
        
                // log.debug('jsonTransacion', jsonTransacion);
                let periodSearch = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: params.filterAnioPeriod,
                    columns: ['periodname']
                });
                saldo = saldo.toFixed(2);
                let jsonAxiliar = {
                    "cabecera": {
                        "anio": params.filterAnioPeriod,
                        "ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        "razonSocial": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase()
                        //"entidadFinanciera": accountSearch.custrecord_pe_bank[0].text,
                        //"codigoCuentaCorriente": accountSearch.description,
                    },
                    "activo": activo,
                    "pasivo": pasivo
        
                };
                // log.debug('MSK - jsonAxiliar', jsonAxiliar);
                return jsonAxiliar;
            } catch (error) {
                log.error('getJsonData()', error.message);
            }
            
        }

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


        const setVoid = (irecord, logrecodId, recordlogid, estado) => {
            try {
                const estado = 'No hay registros';
                const report = 'Proceso finalizado';
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
            } catch (e) {
                log.error({ title: 'setVoid', details: e });
            }
        }


        // const getPeriodName = (filterAnioPeriod) => {
        //     try {
        //         const perLookup = search.lookupFields({
        //             type: search.Type.ACCOUNTING_PERIOD,
        //             id: filterAnioPeriod,
        //             columns: ['periodname']
        //         });
        //         const period = perLookup.periodname;
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
                campoRegistro01 = {
                    valorAnio: valorAnio,
                    valorMes: valorMes
                }
            }
            return campoRegistro01;
        }


        const func = (valorAnio, valorMes) => {
            // var date = new Date();
            var ultimoDia = new Date(valorAnio, valorMes, 0).getDate();
            var PeriodoCompleto = String(valorAnio) + String(valorMes) + String(ultimoDia)
            return PeriodoCompleto
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

        return { execute }

    });