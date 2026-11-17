/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/search", "N/record", "N/runtime", "N/log", "N/file", "N/task", "N/config","N/format", "N/render"],
    
    (search, record, runtime, log, file, task, config,format,render) => {
        /**
    * Defines the Scheduled script trigger point.
    * @param {Object} scriptContext 
    * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
    * @since 2015.2
    */

        const SCRIPT_ID = 'customscript_ts_ss_le_3_18';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_18';
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
                    const searchId = 'customsearch_pe_detalle_3_18'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
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
                        //const structuregbody = structureBody(searchbook.content,params.filterAnioPeriod);
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
                    columns: ["taxidnum"],
                });
                const ruc = subLookup.taxidnum;
                return ruc;
            } catch (e) {
                log.error({ title: "getRUC", details: e });
            }
        };
    
        const getEmployerID = () => {
            const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
            const employeeid = configpage.getValue("employerid");
            return employeeid;
        };
    
        const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
            try {
                const recordlog = record.create({ type: logrecodId });
                if (featureSubsidiary) {
                    recordlog.setValue({ fieldId: "custrecord_pe_subsidiary_log", value: filterSubsidiary });
                }
                recordlog.setValue({ fieldId: "custrecord_pe_period_log", value: filterPostingPeriod });
                recordlog.setValue({ fieldId: "custrecord_pe_status_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_report_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_book_log", value: "Inventario y Balance 3.18" });
                const recordlogid = recordlog.save();
    
                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: "createRecord", details: e });
            }
        };
    
        const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
            let json = {};
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            try {
                let searchLoad = search.load({
                    id: searchId,
                });
    
                let filters = searchLoad.filters;
    
                // const filterOne = search.createFilter({
                //     name: 'postingperiod',
                //     operator: search.Operator.ANYOF,
                //     values: period
                // });
    
                // filters.push(filterOne);
                log.error("anioperiod", anioperiod);
                let periodIds = getPeriodsIdsByYear(anioperiod);
                let formula = getPeriodFormula(periodIds);
                let periodFilter = search.createFilter({
                    name: 'formulatext',
                    formula: formula,
                    operator: search.Operator.IS,
                    values: '1'
                });
                searchLoad.filters.push(periodFilter);
    
                if (featureSubsidiary) {
                    const filterTwo = search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.ANYOF,
                        values: subsidiary,
                    });
                    filters.push(filterTwo);
                }
    
                const searchResultCount = searchLoad.runPaged().count;
    
                if (searchResultCount != 0) {
                    /*if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            // log.debug("result", result);
                            let periodo = result.getValue(searchLoad.columns[0]);
                            let anioperiod = periodo.split("/")[0];
                            // log.debug("anioperiod", anioperiod);
                            // log.debug("pGloblas.anioCon", pGloblas.anioCon);
                            let codigo_catalogo = result.getValue(searchLoad.columns[1]);
                            let codigo_rubro = result.getValue(searchLoad.columns[2]);
                            let saldo_rubro = result.getValue(searchLoad.columns[3]);
                            saldo_rubro = numberWithCommas(saldo_rubro);
                            let estado_operacion = result.getValue(searchLoad.columns[4]);
    
                            // let column06 = result.getValue(searchLoad.columns[5]);
                            // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                            // column06 = column06.replace(/[\/\\|]/g, ""); //campos libres
    
                            if (pGloblas.anioCon == anioperiod) {
                                json.push({
                                    c1_periodo: periodo,
                                    c2_codigo_catalogo: codigo_catalogo,
                                    c3_codigo_rubro: codigo_rubro,
                                    c4_saldo_rubro: saldo_rubro,
                                    c5_estado_operacion: estado_operacion,
                                });
                            }
                            return true;
                        });
    
                        return { thereisinfo: 1, content: json };
                    } else {
                        division = searchResultCount / 1000;
                        laps = Math.round(division);
                        if (division > laps) {
                            laps = laps + 1;
                        }
                        for (let i = 1; i <= laps; i++) {
                            if (i != laps) {
                                searchResult = searchLoad.run().getRange({ start: start, end: end });
                            } else {
                                searchResult = searchLoad.run().getRange({ start: start, end: searchResultCount });
                            }
                            for (let j in searchResult) {
                                let periodo = result.getValue(searchLoad.columns[0]);
                                let anioperiod = periodo.split("/")[0];
                                log.debug("anioperiod", anioperiod);
                                log.debug("pGloblas.anioCon", pGloblas.anioCon);
                                let codigo_catalogo = result.getValue(searchLoad.columns[1]);
                                let codigo_rubro = result.getValue(searchLoad.columns[2]);
                                let saldo_rubro = result.getValue(searchLoad.columns[3]);
                                saldo_rubro = numberWithCommas(saldo_rubro);
                                let estado_operacion = result.getValue(searchLoad.columns[4]);
    
                                // let column06 = result.getValue(searchLoad.columns[5]);
                                // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                                // column06 = column06.replace(/[\/\\|]/g, ""); //campos libres
    
                                if (pGloblas.anioCon == anioperiod) {
                                    json.push({
                                        c1_periodo: periodo,
                                        c2_codigo_catalogo: codigo_catalogo,
                                        c3_codigo_rubro: codigo_rubro,
                                        c4_saldo_rubro: saldo_rubro,
                                        c5_estado_operacion: estado_operacion,
                                    });
                                }
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
    
                        return { thereisinfo: 1, content: json };
                    }*/
                    let pagedData = searchLoad.runPaged({ pageSize: 1000 });
                    pagedData.pageRanges.forEach(function (pageRange) {
                        let page = pagedData.fetch({ index: pageRange.index });
                        page.data.forEach(function (result) {
                            let columns = result.columns;
                            let c1_periodo = result.getValue(columns[0]);
                            let c2_cod_catalogo = result.getValue(columns[1]);
                            let c3_cod_rubro = result.getValue(columns[2]);
                            let c4_saldo_rubro = Number(result.getValue(columns[3]));
                            let c5_estado_operacion = result.getValue(columns[4]);
                            /*json[c3_cod_rubro] = {
                                c1_periodo: c1_periodo,
                                c2_cod_catalogo: c2_cod_catalogo,
                                c3_cod_rubro: c3_cod_rubro,
                                c4_saldo_rubro: c4_saldo_rubro,
                                c5_estado_operacion: c5_estado_operacion
                            };*/
                            json[c3_cod_rubro] = c4_saldo_rubro;
    
                            /*let codigoGastoAdministrativo = result.getValue(columns[0]).replace('- None -', '');
                            let codigoGastoVentas = result.getValue(columns[1]).replace('- None -', '');
                            let codigo = result.getValue(columns[2]).replace('- None -', '');
                            let sumaGastoAdministrativo = Number(result.getValue(columns[3]));
                            let sumaGastoVentas = Number(result.getValue(columns[4]));
                            let suma = Number(result.getValue(columns[5]));
                            let idCodigo = codigo || codigoGastoAdministrativo || codigoGastoVentas;
                            let saldo = suma || sumaGastoAdministrativo || sumaGastoVentas;*/
                        });
                    });
                    return { thereisinfo: 1, content: json };
    
                } else {
                    return { thereisinfo: 0 };
                }
            } catch (e) {
                log.error({ title: "searchBook", details: e });
            }
        };
    
        const structureBody = (codeListJson, anio) => {
            let dataSctructure = [
                { "3D0101": ["3D0101"] },
                { "3D0112": ["3D0112"] },
                { "3D0110": ["3D0110"] },
                { "3D0117": ["3D0117"] },
                { "3D0104": ["3D0104"] },
    
                { "3D0109": ["3D0109"] },
                { "3D0118": ["3D0118"] },
                { "3D0105": ["3D0105"] },
                { "3D0119": ["3D0119"] },
                { "3D0108": ["3D0108"] },
                { "3D0121": ["3D0121"] },
                { "3D0103": ["3D0103"] },
                { "3D0107": ["3D0107"] },
                { "3D0111": ["3D0111"] },
                { "3D0116": ["3D0116"] },
                { "3D0120": ["3D0120"] },
                { "3D0122": ["3D0122"] },
                { "3D01ST": ["3D0109", "3D0118", "3D0105", "3D0119", "3D0108", "3D0121", "3D0103", "3D0107", "3D0111", "3D0116", "3D0120", "3D0122"] },		
    
                { "3D0220": ["3D0220"] },
                { "3D0218": ["3D0218"] },
                { "3D0209": ["3D0209"] },
                { "3D0201": ["3D0201"] },
                { "3D0221": ["3D0221"] },
                { "3D0222": ["3D0222"] },
                { "3D0202": ["3D0202"] },
                { "3D0203": ["3D0203"] },
                { "3D0223": ["3D0223"] },
                { "3D0231": ["3D0231"] },
                { "3D0210": ["3D0210"] },
                { "3D0211": ["3D0211"] },
    
                { "3D0225": ["3D0225"] },
                { "3D0232": ["3D0232"] },
                { "3D0212": ["3D0212"] },
                { "3D0205": ["3D0205"] },
                { "3D0226": ["3D0226"] },
                { "3D0219": ["3D0219"] },
                { "3D0227": ["3D0227"] },
                { "3D0206": ["3D0206"] },
                { "3D0207": ["3D0207"] },
                { "3D0229": ["3D0229"] },
                { "3D0233": ["3D0233"] },
                { "3D0234": ["3D0234"] },
                { "3D02ST": ["3D0220", "3D0218", "3D0209", "3D0201", "3D0221", "3D0222", "3D0202", "3D0203", "3D0223", "3D0231", "3D0210", "3D0211", "3D0225", "3D0232", "3D0212", "3D0205", "3D0226", "3D0219", "3D0227", "3D0206", "3D0207", "3D0229", "3D0233", "3D0234"] },
    
                { "3D0325": ["3D0325"] },
                { "3D0319": ["3D0319"] },
                { "3D0326": ["3D0326"] },
                { "3D0327": ["3D0327"] },
                { "3D0328": ["3D0328"] },
                { "3D0329": ["3D0329"] },
    
                { "3D0330": ["3D0330"] },
                { "3D0322": ["3D0322"] },
                { "3D0321": ["3D0321"] },
                { "3D0331": ["3D0331"] },
                { "3D0310": ["3D0310"] },
                { "3D0323": ["3D0323"] },
                { "3D0311": ["3D0311"] },
                { "3D0305": ["3D0305"] },
                { "3D0332": ["3D0332"] },
                { "3D0333": ["3D0333"] },
                { "3D03ST": ["3D0330", "3D0322", "3D0321", "3D0331", "3D0310", "3D0323", "3D0311", "3D0305", "3D0332", "3D0333"] },
                
                { "3D0401": ["3D0401"] },
                { "3D0404": ["3D0404"] },
                { "3D0405": ["3D0405"] },
                { "3D0402": ["3D0402"] },
                { "3D04ST": ["3D0401", "3D0404", "3D0405", "3D0402"] },
            ];
    
            let fileContent = "";
    
            dataSctructure.forEach(structure => {
                for (let mainCode in structure) {
                    let codes = structure[mainCode];
                    let amount = 0;
                    for (let i = 0; i < codes.length; i++) {
                        if (codeListJson[codes[i]] === undefined) continue;
                        amount = roundTwoDecimal(amount + (codeListJson[codes[i]] || 0));
                    }
                    codeListJson[mainCode] = amount;
                    let periodo = `${anio}1231`;
                    let codigoCatalogo = '09';
                    let rubro = mainCode;
                    let saldo = amount;
                    let estadoOperacion = "1";
                    fileContent = `${fileContent}${periodo}|${codigoCatalogo}|${rubro}|${saldo}|${estadoOperacion}|\n`;
                }
            });
    
            return fileContent;
    
    
            /*
            let contentReport = "";
            try {
                for (let i in searchResult) {
                    contentReport = contentReport + searchResult[i].c1_periodo + "|" + searchResult[i].c2_codigo_catalogo + "|" + searchResult[i].c3_codigo_rubro + "|" + searchResult[i].c4_saldo_rubro + "|" + searchResult[i].c5_estado_operacion + "|\n";
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: "structureBody", details: e });
            }*/
        };
    
        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId, filterAnioPeriod) => {
            let typeformat;
            const header = "1. PERIODO|2 CODIGO DE CATALOGO|3 CODIGO DEL RUBRO |4. SALDO DEL RUBRO CONTABLE |5. ESTADO DE LA OPERACION |\n";
            try {
                let periodname = params.filterAnioPeriod;
                let nameReportGenerated = "LE" + fedIdNumb + periodname + "1231031800" + "07" + "1" + hasinfo + "11";//"_" + recordlogid;
                let structuregbody = structureBody(transactionJSON,params.filterAnioPeriod);
                let jsonAxiliar ;
                if (params.filterFormat == "PDF") {
                var orderedjson = orderByCode(transactionJSON);
                log.debug("orderedjson", orderedjson);
                var sumado = sumarPorDato7(orderedjson);
                log.debug("sumado", sumado);
                var jsonSalida = pasarValores(sumado);
                log.debug("jsonSalida", jsonSalida);
                jsonAxiliar = getJsonData(transactionJSON, jsonSalida,params);
                }
                if (params.filterFormat == "CSV") {
                    nameReportGenerated = nameReportGenerated + ".csv";
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, " ");
                    structuregbody = structuregbody.replace(/[|]/gi, ",");
                    typeformat = file.Type.CSV;
                } else if (params.filterFormat == 'TXT') {
                    nameReportGenerated = nameReportGenerated + ".txt";
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
                    isOnline: true,
                });
                const fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: "createFile", details: e });
            }
        };
    
        const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
            try {
                const fileAux = file.load({ id: fileid });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: "Generated" } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: fileAux.name } });
                return recordlogid;
            } catch (e) {
                log.error({ title: "setRecord", details: e });
            }
        };
    
        const setError = (irecord, logrecodId, recordlogid, error) => {
            try {
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: "ERROR: " + error } });
            } catch (e) {
                log.error({ title: "setError", details: e });
            }
        };
    
        const setVoid = (irecord, logrecodId, recordlogid) => {
            try {
                const estado = "No hay registros";
                const report = "Proceso finalizado";
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_status_log: estado } });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_report_log: report } });
            } catch (e) {
                log.error({ title: "setVoid", details: e });
            }
        };
    
        const getPeriodName = (filterPostingPeriod) => {
            try {
                const perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: filterPostingPeriod,
                    columns: ["periodname"],
                });
                const period = perLookup.periodname;
                return period;
            } catch (e) {
                log.error({ title: "getPeriodName", details: e });
            }
        };
    
        const retornaPeriodoStringForView = (campoRegistro01) => {
            if (campoRegistro01 >= "") {
                var valorAnio = campoRegistro01.split(" ")[1];
                var valorMes = campoRegistro01.split(" ")[0];
                if (valorMes.indexOf("Jan") >= 0 || valorMes.indexOf("Ene") >= 0) {
                    valorMes = "01";
                } else {
                    if (valorMes.indexOf("Feb") >= 0) {
                        valorMes = "02";
                    } else {
                        if (valorMes.indexOf("Mar") >= 0) {
                            valorMes = "03";
                        } else {
                            if (valorMes.indexOf("Abr") >= 0 || valorMes.indexOf("Apr") >= 0) {
                                valorMes = "04";
                            } else {
                                if (valorMes.indexOf("May") >= 0) {
                                    valorMes = "05";
                                } else {
                                    if (valorMes.indexOf("Jun") >= 0) {
                                        valorMes = "06";
                                    } else {
                                        if (valorMes.indexOf("Jul") >= 0) {
                                            valorMes = "07";
                                        } else {
                                            if (valorMes.indexOf("Aug") >= 0 || valorMes.indexOf("Ago") >= 0) {
                                                valorMes = "08";
                                            } else {
                                                if (valorMes.indexOf("Set") >= 0 || valorMes.indexOf("Sep") >= 0) {
                                                    valorMes = "09";
                                                } else {
                                                    if (valorMes.indexOf("Oct") >= 0) {
                                                        valorMes = "10";
                                                    } else {
                                                        if (valorMes.indexOf("Nov") >= 0) {
                                                            valorMes = "11";
                                                        } else {
                                                            valorMes = "12";
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
                    valorMes: valorMes,
                };
            }
            return json;
        };
    
        const func = (valorAnio, valorMes) => {
            // var date = new Date();
            var ultimoDia = new Date(valorAnio, valorMes, 0).getDate();
            var PeriodoCompleto = String(valorAnio) + String(valorMes) + String(ultimoDia);
            return PeriodoCompleto;
        };
    
        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        };
        const numberWithCommas2 = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
          };
    
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
                    ["formulatext: TO_CHAR({startdate},'YYYY')", "is", year],
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
        
            // FORMATO 3.18 Libro Inventario y Balance
            var savedSearch = search.load({
              id: "customsearch_pe_libro_impreso_3_18",
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
            
        
        
            var pagedData = savedSearch.runPaged({
              pageSize: 1000,
            });
        
            var page, columns;
            let count = 0;
            pagedData.pageRanges.forEach(function (pageRange) {
              page = pagedData.fetch({
                index: pageRange.index,
              });
        
              page.data.forEach(function (result) {
                count++;
                columns = result.columns;
                arrAux = new Array();
        
                let code = result.getValue(columns[2]);
                // code = processText(code);
        
        
                // 0. TIPO
                arrAux[0] = result.getValue(columns[0]);
        
                // 1. CODIGO 2
                arrAux[1] = result.getValue(columns[1]);
        
                // 2. codigo 1
                arrAux[2] = result.getValue(columns[2]);
        
                // 3. MONTO
                arrAux[3] = result.getValue(columns[3]);
        
                // 3. codigo item
                arrAux[4] = result.getValue(columns[4]);
        
                //2 KEY
                arrAux[5] = result.getValue(columns[1]).toUpperCase();
        
                //
                arrAux[6] = result.getValue(columns[2]).toUpperCase();
        

                arrResult.push({
                    ///key: _cont++,
                   /// resultTransactions: {dato1: arrAux[0],
                    dato2: arrAux[1],
                    dato3: arrAux[2],
                    dato4: arrAux[3],
                    dato5: arrAux[4],
                    dato6: arrAux[5],
                    dato7: arrAux[6]
                   // }

                });
              });
            });
            log.debug("count", count);
            log.debug("arrResult", arrResult);
            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult };
              }
              return { thereisinfo: 0 };

            } catch (error) {
                log.error('getTransactions()', error.message);
            }
          };

          const orderByCode = (jsonData) => {
            const grupos = {};
        
            for (const key in jsonData) {
              const dato = jsonData[key];
              const dato6 = dato.dato6;
        
              if (!grupos[dato6]) {
                grupos[dato6] = [];
              }
        
              grupos[dato6].push(dato);
            }
        
            return grupos;
          };

          function sumarPorDato7(gruposPorDato6) {
            const resultado = {};
        
            for (const dato6 in gruposPorDato6) {
              const datosDato6 = gruposPorDato6[dato6];
              resultado[dato6] = {};
        
              for (const dato of datosDato6) {
                const dato7 = dato.dato7;
        
                if (!resultado[dato6][dato7]) {
                  resultado[dato6][dato7] = 0;
                }
        
                resultado[dato6][dato7] += parseFloat(dato.dato4);
              }
            }
        
            return resultado;
          };

          function pasarValores(jsonEntrada) {
            try {
            
            let t1 = jsonEntrada["ACTIVIDADES DE OPERACIÓN"]["COBRANZA POR APORTES Y DEMÁS SERVICIOS"];
            let t2 = jsonEntrada["ACTIVIDADES DE OPERACIÓN"]["PAGOS A PROVEEDORES POR EL SUMINISTRO DE BIENES Y SERVICIOS"];
            let t3 = jsonEntrada["ACTIVIDADES DE OPERACIÓN"]["PAGOS DE REMUNERACIONES Y BENEFICIOS SOCIALES"];
            let t4 = jsonEntrada["ACTIVIDADES DE INVERSIÓN"]["PAGOS POR COMPRA DE ACTIVOS INTANGIBLES"];
            let t5 = jsonEntrada["ACTIVIDADES DE INVERSIÓN"]["COMPRA DE PROPIEDADES, PLANTA Y EQUIPO"];
            let t6 = jsonEntrada["ACTIVIDADES DE INVERSIÓN"]["PAGOS POR COMPRA DE ACTIVOS INTANGIBLES"];
            let t7 = jsonEntrada["ACTIVIDADES DE FINANCIAMIENTO"]["AMORTIZACIÓN O PAGO DE OTROS PASIVOS FINANCIEROS"];
        
            let total1 = t1 - t2 - t3;
            let total2 = -t4 - t5 - t6;
            let total3 = -t7;
            let total4 = total1 + total2 + total3;
            let total5 = total4 + t7;
        
            const jsonSalida = {
              operacion: {
                operacion01: numberWithCommas2(t1.toFixed(2)),
                operacion02: "0.00",
                operacion03: "0.00",
                operacion04: "0.00",
                operacion05: numberWithCommas2(t2.toFixed(2)),
                operacion06: numberWithCommas2(t3.toFixed(2)),
                operacion07: "0.00",
                operacion08: "0.00",
                operacion09: "0.00",
              },
              inversion: {
                inversion01: "0.00",
                inversion02: "0.00",
                inversion03: "0.00",
                inversion04: "0.00",
                inversion05: numberWithCommas2(t4.toFixed(2)),
                inversion06: numberWithCommas2(t5.toFixed(2)),
                inversion07: numberWithCommas2(t6.toFixed(2)),
                inversion08: "0.00",
              },
              financiamiento: {
                financiamiento01: "0.00",
                financiamiento02: "0.00",
                financiamiento03: "0.00",
                financiamiento04: numberWithCommas2(t7.toFixed(2)),
                financiamiento05: "0.00",
                financiamiento06: "0.00",
              },
              totals: {
                total01: numberWithCommas2(total1.toFixed(2)),
                total02: numberWithCommas2(total2.toFixed(2)),
                total03: numberWithCommas2(total3.toFixed(2)),
                total04: numberWithCommas2(total4.toFixed(2)),
                total05: numberWithCommas2(total5.toFixed(2)),
              },
            };
        
            return jsonSalida;

            } catch (e) {
                log.error({ title: 'pasarValores', details: e });
            }
          };

        
          const getJsonData = (transactions, jsonSumado,params) => {
            try {
            let userTemp = runtime.getCurrentUser(),
              useID = userTemp.id,
              jsonTransacion = {},
              jsonFinal = [],
              totalLine1 = 0,
              totalLine2 = 0,
              totalLine3 = 0,
              saldo = 0;
        
              /*
            var employeeName = search.lookupFields({
              type: search.Type.EMPLOYEE,
              id: useID,
              columns: ["firstname", "lastname"],
            });
            var userName = employeeName.firstname + " " + employeeName.lastname;*/
        
            log.debug("transactions", transactions);
        
            // for (var k in transactions) {
            //     let IDD = transactions[k].dato1;
            //     if (!jsonTransacion[IDD]) {
            //         let dato_3 = parseFloat(transactions[k].dato3);
            //         log.debug('dato_3', dato_3);
        
            //         jsonTransacion[IDD] = {
            //             dato1: transactions[k].dato1,
            //             dato2: transactions[k].dato2,
            //             dato3: dato_3,
            //         }
            //         saldo += dato_3;
            //     }
            // }
        
            log.debug("jsonTransacion", jsonTransacion);
            /*let periodSearch = search.lookupFields({
              type: search.Type.ACCOUNTING_PERIOD,
              id: pGloblas.pPeriod,
              columns: ["periodname"],
            });*/
            saldo = saldo.toFixed(2);
            let jsonCompany = {
              company: {
                firtsTitle: 'FORMATO 3.18: "LIBRO DE INVENTARIOS Y BALANCES - ESTADO DE FLUJOS DE EFECTIVO"',
                secondTitle: params.filterAnioPeriod,
                thirdTitle: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                fourthTitle: getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
              },
              totals: {
                dato3: Number(saldo),
              },
              movements: jsonSumado,
            };
        
            return jsonCompany;

            } catch (error) {
                log.error('getJsonData()', error.message);
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
        };

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_18.ftl");
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
    
        const roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }
    
    
        return {execute}

    });
