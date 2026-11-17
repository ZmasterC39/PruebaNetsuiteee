/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render", "N/query"],

    (search, record, runtime, log, file, task, config, format, render, query) => {

        /** ts_pe_ss_ple_4_1_libro_de_retenciones
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_10_2';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_10_2';
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
                    const searchId = 'customsearch_ts_work_order_issue';
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


                    //const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);

                    let transactionJSON = getTransactions(params);

                    if (transactionJSON) {
                        hasinfo = '1';
                        //const structuregbody = structureBody(searchbook.content);
                        const createfile = createFile(fedIdNumb, hasinfo, transactionJSON, params);

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

                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            const column01 = result.getValue(searchLoad.columns[5]);
                            const column02 = result.getValue(searchLoad.columns[0]);
                            const column03 = result.getValue(searchLoad.columns[1]);
                            const column04 = result.getValue(searchLoad.columns[2]);
                            const column05 = result.getValue(searchLoad.columns[3]);
                            const column06 = result.getValue(searchLoad.columns[4]);
                            const column07 = result.getValue(searchLoad.columns[5]);
                            const column08 = result.getValue(searchLoad.columns[6]);
                            const column09 = result.getValue(searchLoad.columns[7]);
                            const column10 = result.getValue(searchLoad.columns[8]);
                            const column11 = result.getValue(searchLoad.columns[9]);
                            const column12 = result.getValue(searchLoad.columns[10]);
                            const column13 = result.getValue(searchLoad.columns[11]);
                            const column14 = result.getValue(searchLoad.columns[12]);
                            const column15 = result.getValue(searchLoad.columns[13]);
                            const column16 = result.getValue(searchLoad.columns[14]);
                            const column17 = result.getValue(searchLoad.columns[15]);
                            const column18 = result.getValue(searchLoad.columns[16]);
                            const column19 = result.getValue(searchLoad.columns[17]);
                            let column20 = result.getValue(searchLoad.columns[18]);
                            column20 = roundTwoDecimal(column20);
                            if (column20 == 0) column20 = '0.00';
                            let column21 = result.getValue(searchLoad.columns[19]);
                            column21 = roundTwoDecimal(column21);
                            if (column21 == 0) column21 = '0.00';
                            let column22 = result.getValue(searchLoad.columns[20]);
                            column22 = roundTwoDecimal(column22);
                            if (column22 == 0) column22 = '0.00';
                            const column23 = result.getValue(searchLoad.columns[21]);
                        

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
                                c21: column21,
                                c22: column22,
                                c23: column23
                                
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
                                const column01 = searchResult.getValue(columns[5]);
                                const column02 = searchResult.getValue(columns[0]);
                                const column03 = searchResult.getValue(columns[1]);
                                const column04 = searchResult.getValue(columns[2]);
                                const column05 = searchResult.getValue(columns[3]);
                                const column06 = searchResult.getValue(columns[4]);
                                const column07 = searchResult.getValue(columns[5]);
                                const column08 = searchResult.getValue(columns[6]);
                                const column09 = searchResult.getValue(columns[7]);
                                const column10 = searchResult.getValue(columns[8]);
                                const column11 = searchResult.getValue(columns[9]);
                                const column12 = searchResult.getValue(columns[10]);
                                const column13 = searchResult.getValue(columns[11]);
                                const column14 = searchResult.getValue(columns[12]);
                                const column15 = searchResult.getValue(columns[13]);
                                const column16 = searchResult.getValue(columns[14]);
                                const column17 = searchResult.getValue(columns[15]);
                                const column18 = searchResult.getValue(columns[16]);
                                const column19 = searchResult.getValue(columns[17]);
                                let column20 = searchResult.getValue(columns[18]);
                                column20 = roundTwoDecimal(column20);
                                if (column20 == 0) column20 = '0.00';
                                let column21 = searchResult.getValue(columns[19]);
                                column21 = roundTwoDecimal(column21);
                                if (column21 == 0) column21 = '0.00';
                                let column22 = searchResult.getValue(columns[20]);
                                column22 = roundTwoDecimal(column22);
                                if (column22 == 0) searchResult = '0.00';
                                const column23 = searchResult.getValue(columns[21]);
                                
                                

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
                                    c21: column21,
                                    c22: column22,
                                    c23: column23
                                    
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
                    searchResult[i].c19 + '|' + searchResult[i].c20 + '|' + searchResult[i].c21 + '|' +
                    searchResult[i].c22 + '|' + searchResult[i].c23 + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (fedIdNumb, hasinfo, transactionJSON, params) => {
            try {

                var perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: params.filterPostingPeriod,
                    columns: ['periodname', 'startdate']
                });/*
                var periodoFinDate = format.parse({
                    type: format.Type.DATE,
                    value: perLookup.startdate
                });*/
                const periodostring = params.filterPostingPeriod + '00' + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '100200' + '00' + '1' + hasinfo + '11';
                let jsonAxiliar = getJsonData(transactionJSON,params);
                log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
                    
                    log.debug(jsonAxiliar);
                    let jsonString = { text: JSON.stringify(setSpecialChars(jsonAxiliar)) };

                    // Pasar datos al template
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'jsonString',
                        data: jsonString
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
                
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
        }  

        const getTransactions = (params) => {
            let resultJson = getConsumosProduccion(params);
            resultJson["Materiales_Suministros_Directos"] = getMaterialesSuministrosDirectos(params);
    
            return resultJson;
        }

        const getConsumosProduccion = (scriptParameters) => {
            let consumosProduccion = {
                Mano_Obra_Directa: {},
                Otros_Costos_Directos: {},
                Materiales_Suministros_Indirectos: {},
                Mano_Obra_Indirecta: {},
                Otros_Gastos_Produccion_Indirectos: {}
            };
    
            let sql = getSQLConsumosProduccion(scriptParameters);
            log.error("sql", sql);
            let resultIterator = query.runSuiteQLPaged({
                query: sql,
                pageSize: 1000
            }).iterator();
    
          log.error("Ingreso aqui", JSON.stringify(resultIterator));
    
            resultIterator.each(function (page) {
                log.error("pageIterator", page.value);
                log.error("pageIterator data", page.value.data);
    
                var pageIterator = page.value.data.iterator();
                pageIterator.each(function (row) {
                    let result = getRowJson(row);
                    if (!result.tipoCategoria) return;
                    if (consumosProduccion[result.tipoCategoria] !== undefined) {
                        if (consumosProduccion[result.tipoCategoria][result.periodo] === undefined) {
                            consumosProduccion[result.tipoCategoria][result.periodo] = 0;
                        }
                        consumosProduccion[result.tipoCategoria][result.periodo] = roundTwoDecimal(consumosProduccion[result.tipoCategoria][result.periodo] + result.importe);
                    }
                    return true;
                });
            });
            return consumosProduccion;
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
                    ["formulatext: TO_CHAR({startdate},'YYYY')", "is", year]
                ],
                columns: ["internalid"]
            }).run().getRange(0, 1000);
    
            for (let i = 0; i < periodResult.length; i++) {
                let id = periodResult[i].getValue("internalid");
                periods.push(id);
            }
            return periods;
        }
    
        const roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }
    
        const removeAccentMark = (text) => {
            const accentMark = {
                'á': 'a',
                'é': 'e',
                'í': 'i',
                'ó': 'o',
                'ú': 'u',
                'Á': 'A',
                'É': 'E',
                'Í': 'I',
                'Ó': 'O',
                'Ú': 'U'
            };
            return text.replace(/[áéíóúÁÉÍÓÚ]/g, function (letra) { return accentMark[letra]; });
        }
    
        const getPeriodFormula = (periods) => {
            if (periods.length) {
                return "CASE WHEN {postingperiod.id} IN (" + periods.join(',') + ") THEN '1' ELSE '0' END";
            } else {
                return "'0'";
            }
        }

        const getRowJson = (row) => {
            let result = {
                nombreOperacion: row.value.getValue(1),
                cantidadCompletada: Number(row.value.getValue(4)),
                velocidadEjecucion: Number(row.value.getValue(5)),
                tipoCategoria: "",
                //tipoCategoriaCosto: row.value.getValue(6),
                nombrecategoriaCosto: removeAccentMark(row.value.getValue(7).toLowerCase()),
                importe: 0
            };
            let fechaInicioPeriodo = row.value.getValue(0).split("/");
            let idTareaOperacion = row.value.getValue(2);
            let datosOperacion = JSON.parse(row.value.getValue(3));
    
            if (datosOperacion[idTareaOperacion] !== undefined) {
                let detalleCosto = datosOperacion[idTareaOperacion];
                // 2.- Mano de Obra Directa
                if (result.nombrecategoriaCosto.includes("mano de obra directa")) {
                    result.tipoCategoria = "Mano_Obra_Directa";
                    result.importe = (result.velocidadEjecucion * result.cantidadCompletada * Number(detalleCosto.laborresources) * Number(detalleCosto.laborsetuptime)) / 60;
    
                    // 4.2.- Mano de Obra Indirecta
                } else if (result.nombrecategoriaCosto.includes("mano de obra indirecta")) {
                    result.tipoCategoria = "Mano_Obra_Indirecta";
                    result.importe = (result.velocidadEjecucion * result.cantidadCompletada * Number(detalleCosto.laborresources) * Number(detalleCosto.laborsetuptime)) / 60;
    
                    // 4.3 - Otros Gastos de Producción Indirectos 
                } else if (result.nombrecategoriaCosto.includes("otros costos")) {
                    result.tipoCategoria = "Otros_Gastos_Produccion_Indirectos";
                    result.importe = (result.velocidadEjecucion * result.cantidadCompletada * Number(detalleCosto.machineresources) * Number(detalleCosto.machinesetuptime)) / 60;
    
                    // 3.- Otros Costos Directos
                } else if (result.nombrecategoriaCosto.includes("depreciacion directa")) {
                    result.tipoCategoria = "Otros_Costos_Directos";
                    result.importe = (result.velocidadEjecucion * result.cantidadCompletada * Number(detalleCosto.machineresources) * Number(detalleCosto.machineresources)) / 60;
                }
                result.importe = roundTwoDecimal(result.importe);
            }
    
            result.periodo = `${fechaInicioPeriodo[2]}${fechaInicioPeriodo[1]}`;
            return result;
        }

        const getSQLConsumosProduccion = (scriptParameters) => {
            let periodsIds = getPeriodsIdsByYear(scriptParameters.filterPostingPeriod);
    
            let sql = "";
            sql += "SELECT ";
            sql += "ap.startdate, ";
            sql += "mot.title, ";
            sql += "mot.id, ";
            sql += "t.custbody_ts_operaciones_campos_adicion, ";
            sql += "mot.completedquantity, ";
            sql += "motcd.runrate, ";
            sql += "cc.itemcosttype, ";
            sql += "cc.name ";
            sql += "FROM transaction t ";
            sql += "INNER JOIN accountingPeriod ap ON ap.id = t.postingperiod ";
            sql += "INNER JOIN manufacturingOperationTask mot ON mot.workorder = t.custbody_ts_created_from ";
            sql += "INNER JOIN ManufacturingOperationTaskCostDetail motcd ON motcd.manufacturingoperationtask = mot.id ";
            sql += "INNER JOIN costCategory cc ON cc.id = motcd.costcategory ";
            sql += "WHERE t.custbody_ts_operaciones_campos_adicion IS NOT EMPTY AND ";
            sql += "t.custbody_ts_created_from IS NOT NULL AND ";
            sql += `t.abbrevType = 'WOCOMPL' AND ap.id IN (${periodsIds.join(',')})`;
            return sql;
        }

        const getMaterialesSuministrosDirectos = (scriptParameters) => {
            let materialesSuministrosDirectos = {};
            let savedSearch = search.load({ id: "customsearch_ts_work_order_issue" });
    
            let periodIds = getPeriodsIdsByYear(scriptParameters.filterPostingPeriod);
            let formula = getPeriodFormula(periodIds);
            let periodFilter = search.createFilter({
                //name: 'formulatext',
                name: 'formulanumeric',
                formula: formula,
                operator: search.Operator.IS,
                values: '1'
            });
            savedSearch.filters.push(periodFilter);
    
            let pagedData = savedSearch.runPaged({ pageSize: 1000 });
            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({
                    index: pageRange.index
                });
    
                page.data.forEach(function (result) {
                    let columns = result.columns;
                    let period = result.getValue(columns[0]);
                    let value = Number(result.getValue(columns[1]));
                    materialesSuministrosDirectos[period] = value;
                });
            })
            return materialesSuministrosDirectos;
        }

        const getJsonData = (finalJson, scriptParameters) => {
            let months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
            let titles = ["1- Materiales y Suministros Directos", "2- Mano de Obra Directa", "3- Otros Costos Directos", "4- Gastos de Producción Indirectos", "  4.1 - Materiales y Suministros Indirectos", "  4.2 - Mano de Obra Indirecta", "  4.3 - Otros Gastos de Producción Indirectos", "TOTAL CONSUMO EN LA PRODUCCIÓN"];
            let keys = ["Materiales_Suministros_Directos", "Mano_Obra_Directa", "Otros_Costos_Directos", "Gastos_Produccion_Indirectos", "Materiales_Suministros_Indirectos", "Mano_Obra_Indirecta", "Otros_Gastos_Produccion_Indirectos", "Total_Consumo_Produccion"];
    
            let result = [];
            let total1 = 0, total2 = 0, total3 = 0, total4 = 0, total5 = 0, total6 = 0, total7 = 0, total8 = 0, total9 = 0, total10 = 0, total11 = 0, total12 = 0;
            for (let i = 0; i < keys.length; i++) {
                let rowArray = [];
                let categoriaCosto = keys[i];
                rowArray.push(titles[i]);
                if (i + 1 != keys.length) {
                    let total = 0;
                    months.forEach((month) => {
                        let period = `${scriptParameters.filterPostingPeriod}${month}`;
                        let value = finalJson[categoriaCosto] !== undefined ? finalJson[categoriaCosto][period] || 0 : 0;
                        total = roundTwoDecimal(total + value);
                        rowArray.push(value);
                    });
                    total1 = roundTwoDecimal(total1 + rowArray[1]);
                    total2 = roundTwoDecimal(total2 + rowArray[2]);
                    total3 = roundTwoDecimal(total3 + rowArray[3]);
                    total4 = roundTwoDecimal(total4 + rowArray[4]);
                    total5 = roundTwoDecimal(total5 + rowArray[5]);
                    total6 = roundTwoDecimal(total6 + rowArray[6]);
                    total7 = roundTwoDecimal(total7 + rowArray[7]);
                    total8 = roundTwoDecimal(total8 + rowArray[8]);
                    total9 = roundTwoDecimal(total9 + rowArray[9]);
                    total10 = roundTwoDecimal(total10 + rowArray[10]);
                    total11 = roundTwoDecimal(total11 + rowArray[11]);
                    total12 = roundTwoDecimal(total12 + rowArray[12]);
                    rowArray.push(total);
                } else {
                    rowArray.push(total1);
                    rowArray.push(total2);
                    rowArray.push(total3);
                    rowArray.push(total4);
                    rowArray.push(total5);
                    rowArray.push(total6);
                    rowArray.push(total7);
                    rowArray.push(total8);
                    rowArray.push(total9);
                    rowArray.push(total10);
                    rowArray.push(total11);
                    rowArray.push(total12);
                }
                result.push(rowArray);
            }
            let indiceGastoProduccionIndirectos = 3;
            for (let i = 1; i <= months.length; i++) {
                result[indiceGastoProduccionIndirectos][i] = roundTwoDecimal(result[indiceGastoProduccionIndirectos + 1][i] +
                    result[indiceGastoProduccionIndirectos + 2][i] +
                    result[indiceGastoProduccionIndirectos + 3][i]);
            }
            

            var dataSubsidiary = record.load({
                type: "subsidiary",
                id: scriptParameters.filterSubsidiary,
              });

            let companyName = dataSubsidiary.getValue("legalname");
            let companyRuc = dataSubsidiary.getValue("federalidnumber");
    
            return {
                period: scriptParameters.year,
                ruc: companyRuc,
                legalname: companyName,
                detail: result
            }
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
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_10_2.ftl");
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
