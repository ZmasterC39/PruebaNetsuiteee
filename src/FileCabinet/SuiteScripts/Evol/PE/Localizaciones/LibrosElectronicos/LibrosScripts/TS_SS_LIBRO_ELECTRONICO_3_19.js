/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/search", "N/record", "N/runtime", "N/log", "N/file", "N/task", "N/config", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, format, render) => {

        /**
    * Defines the Scheduled script trigger point.
    * @param {Object} scriptContext 
    * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
    * @since 2015.2
    */

        const SCRIPT_ID = 'customscript_ts_ss_le_3_19';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_19';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;
        var pGloblas = {};

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
                    const searchId = 'customsearch_pe_detalle_3_19'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
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
                recordlog.setValue({ fieldId: "custrecord_pe_period_log", value: null });
                recordlog.setValue({ fieldId: "custrecord_pe_status_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_report_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_book_log", value: "Inventario y Balance 3.19" });
                const recordlogid = recordlog.save();

                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: "createRecord", details: e });
            }
        };

        const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
            let json = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            try {
                const searchLoad = search.load({
                    id: searchId,
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
                        name: "subsidiary",
                        operator: search.Operator.ANYOF,
                        values: subsidiary,
                    });
                    filters.push(filterTwo);
                }

                const searchResultCount = searchLoad.runPaged().count;

                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            log.debug("result", result);
                            let column01 = result.getValue(searchLoad.columns[0]);
                            let column02 = result.getValue(searchLoad.columns[1]);
                            let column03 = result.getValue(searchLoad.columns[2]);
                            let column04 = result.getValue(searchLoad.columns[3]);
                            if (column04 != 0) {
                                column04 = parseFloat(column04).toFixed(2);
                               // column04 = numberWithCommas(column04);
                            } else {
                                column04 = '0.00'
                            }
                            let column05 = result.getValue(searchLoad.columns[4]);
                            if (column05 != 0) {
                                column05 = parseFloat(column05).toFixed(2);
                               // column05 = numberWithCommas(column05);
                            } else {
                                column05 = '0.00'
                            }

                            let column06 = result.getValue(searchLoad.columns[5]);
                            if (column06 != 0) {
                                column06 = parseFloat(column06).toFixed(2);
                               // column06 = numberWithCommas(column06);
                            } else {
                                column06 = '0.00'
                            }

                            let column07 = result.getValue(searchLoad.columns[6]);
                            if (column07 != 0) {
                                column07 = parseFloat(column07).toFixed(2);
                               // column07 = numberWithCommas(column07);
                            } else {
                                column07 = '0.00'
                            }

                            let column08 = result.getValue(searchLoad.columns[7]);
                            if (column08 != 0) {
                                column08 = parseFloat(column08).toFixed(2);
                               // column08 = numberWithCommas(column08);
                            } else {
                                column08 = '0.00'
                            }

                            let column09 = result.getValue(searchLoad.columns[8]);
                            if (column09 != 0) {
                                column09 = parseFloat(column09).toFixed(2);
                               // column09 = numberWithCommas(column09);
                            } else {
                                column09 = '0.00'
                            }
                            let column10 = result.getValue(searchLoad.columns[9]);
                            if (column10 != 0) {
                                column10 = parseFloat(column10).toFixed(2);
                               // column10 = numberWithCommas(column10);
                            } else {
                                column10 = '0.00'
                            }
                            let column11 = result.getValue(searchLoad.columns[10]);
                            if (column11 != 0) {
                                column11 = parseFloat(column11).toFixed(2);
                               // column11 = numberWithCommas(column11);
                            } else {
                                column11 = '0.00'
                            }
                            let column12 = result.getValue(searchLoad.columns[11]);
                            if (column12 != 0) {
                                column12 = parseFloat(column12).toFixed(2);
                               // column12 = numberWithCommas(column12);
                            } else {
                                column12 = '0.00'
                            }
                            let column13 = result.getValue(searchLoad.columns[12]);
                            if (column13 != 0) {
                                column13 = parseFloat(column13).toFixed(2);
                               // column13 = numberWithCommas(column13);
                            } else {
                                column13 = '0.00'
                            }
                            let column14 = result.getValue(searchLoad.columns[13]);
                            if (column14 != 0) {
                                column14 = parseFloat(column14).toFixed(2);
                               // column14 = numberWithCommas(column14);
                            } else {
                                column14 = '0.00'
                            }
                            let column15 = result.getValue(searchLoad.columns[14]);
                            if (column15 != 0) {
                                column15 = parseFloat(column15).toFixed(2);
                               // column15 = numberWithCommas(column15);
                            } else {
                                column15 = '0.00'
                            }

                            let column16 = result.getValue(searchLoad.columns[15]);

                            let periodo = result.getValue(searchLoad.columns[0]);
                            //let anioperiod = periodo.split("/")[0];
                            let column17 = result.getValue(searchLoad.columns[16]);
                            // let column06 = result.getValue(searchLoad.columns[5]);
                            // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                            // column06 = column06.replace(/[\/\\|]/g, ""); //campos libres

                            if (column17 == anioperiod) {
                                json.push({
                                    c1_column01: column01,
                                    c2_column02: column02,
                                    c3_column03: column03,
                                    c4_column04: column04,
                                    c5_column05: column05,
                                    c6_column06: column06,
                                    c7_column07: column07,
                                    c8_column08: column08,
                                    c9_column09: column09,
                                    c10_column10: column10,
                                    c11_column11: column11,
                                    c12_column12: column12,
                                    c13_column13: column13,
                                    c14_column14: column14,
                                    c15_column15: column15,
                                    c16_column16: column16,

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
                                let column01 = result.getValue(searchLoad.columns[0]);
                                let column02 = result.getValue(searchLoad.columns[1]);
                                let column03 = result.getValue(searchLoad.columns[2]);
                                let column04 = result.getValue(searchLoad.columns[3]);
                                if (column04 != 0) {
                                    column04 = parseFloat(column04).toFixed(2);
                                  // column04 = numberWithCommas(column04);
                                } else {
                                    column04 = '0.00'
                                }
                                let column05 = result.getValue(searchLoad.columns[4]);
                                if (column05 != 0) {
                                    column05 = parseFloat(column05).toFixed(2);
                                   // column05 = numberWithCommas(column05);
                                } else {
                                    column05 = '0.00'
                                }

                                let column06 = result.getValue(searchLoad.columns[5]);
                                if (column06 != 0) {
                                    column06 = parseFloat(column06).toFixed(2);
                                   // column06 = numberWithCommas(column06);
                                } else {
                                    column06 = '0.00'
                                }

                                let column07 = result.getValue(searchLoad.columns[6]);
                                if (column07 != 0) {
                                    column07 = parseFloat(column07).toFixed(2);
                                   // column07 = numberWithCommas(column07);
                                } else {
                                    column07 = '0.00'
                                }

                                let column08 = result.getValue(searchLoad.columns[7]);
                                if (column08 != 0) {
                                    column08 = parseFloat(column08).toFixed(2);
                                   // column08 = numberWithCommas(column08);
                                } else {
                                    column08 = '0.00'
                                }

                                let column09 = result.getValue(searchLoad.columns[8]);
                                if (column09 != 0) {
                                    column09 = parseFloat(column09).toFixed(2);
                                  //  column09 = numberWithCommas(column09);
                                } else {
                                    column09 = '0.00'
                                }
                                let column10 = result.getValue(searchLoad.columns[9]);
                                if (column10 != 0) {
                                    column10 = parseFloat(column10).toFixed(2);
                                   // column10 = numberWithCommas(column10);
                                } else {
                                    column10 = '0.00'
                                }
                                let column11 = result.getValue(searchLoad.columns[10]);
                                if (column11 != 0) {
                                    column11 = parseFloat(column11).toFixed(2);
                                   // column11 = numberWithCommas(column11);
                                } else {
                                    column11 = '0.00'
                                }
                                let column12 = result.getValue(searchLoad.columns[11]);
                                if (column12 != 0) {
                                    column12 = parseFloat(column12).toFixed(2);
                                  //  column12 = numberWithCommas(column12);
                                } else {
                                    column12 = '0.00'
                                }
                                let column13 = result.getValue(searchLoad.columns[12]);
                                if (column13 != 0) {
                                    column13 = parseFloat(column13).toFixed(2);
                                   // column13 = numberWithCommas(column13);
                                } else {
                                    column13 = '0.00'
                                }
                                let column14 = result.getValue(searchLoad.columns[13]);
                                if (column14 != 0) {
                                    column14 = parseFloat(column14).toFixed(2);
                                   // column14 = numberWithCommas(column14);
                                } else {
                                    column14 = '0.00'
                                }
                                let column15 = result.getValue(searchLoad.columns[14]);
                                if (column15 != 0) {
                                    column15 = parseFloat(column15).toFixed(2);
                                   // column15 = numberWithCommas(column15);
                                } else {
                                    column15 = '0.00'
                                }

                                let column16 = result.getValue(searchLoad.columns[15]);

                                let periodo = result.getValue(searchLoad.columns[0]);
                                let column17 = result.getValue(searchLoad.columns[16]);
                                //let anioperiod = periodo.split("/")[0];

                                // let column06 = result.getValue(searchLoad.columns[5]);
                                // column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                                // column06 = column06.replace(/[\/\\|]/g, ""); //campos libres

                                if (column17 == anioperiod) {
                                    json.push({
                                        c1_column01: column01,
                                        c2_column02: column02,
                                        c3_column03: column03,
                                        c4_column04: column04,
                                        c5_column05: column05,
                                        c6_column06: column06,
                                        c7_column07: column07,
                                        c8_column08: column08,
                                        c9_column09: column09,
                                        c10_column10: column10,
                                        c11_column11: column11,
                                        c12_column12: column12,
                                        c13_column13: column13,
                                        c14_column14: column14,
                                        c15_column15: column15,
                                        c16_column16: column16,

                                    });
                                }
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }

                        return { thereisinfo: 1, content: json };
                    }
                } else {
                    return { thereisinfo: 0 };
                }
            } catch (e) {
                log.error({ title: "searchBook", details: e });
            }
        };

        const structureBody = (searchResult) => {
            let contentReport = "";
            try {
                for (let i in searchResult) {
                    contentReport = contentReport + searchResult[i].c1_column01 + "|" + searchResult[i].c2_column02 + "|" + searchResult[i].c3_column03 + "|" + searchResult[i].c4_column04 + "|" + searchResult[i].c5_column05 + "|" + searchResult[i].c6_column06 + "|" + searchResult[i].c7_column07 + "|" + searchResult[i].c8_column08 + "|" + searchResult[i].c9_column09 + "|" + searchResult[i].c10_column10 + "|" + searchResult[i].c11_column11 + "|" + searchResult[i].c12_column12 + "|" + searchResult[i].c13_column13 + "|" + searchResult[i].c14_column14 + "|" + searchResult[i].c15_column15 + "|" + searchResult[i].c16_column16 + "|\n";
                }
                return contentReport;
            } catch (e) {
                log.error({ title: "structureBody", details: e });
            }
        };

        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId, filterAnioPeriod) => {
            let typeformat;
            const header = "1. PERIODO|2 CODIGO DE CATALOGO|3 CODIGO DEL RUBRO|4. CAPITAL|5. ESTADO DE LA OPERACION|5. ACCIONES DE INVERSION|6. CAPITAL ADICIONAL|7. RESULTADOS NO REALIZADOS|8. RESERVAS LEGALES|9. OTRAS RESERVAS|10. RESULTADOS ACUMULADOS|11. DIFERENCIAS DE CONVERSION|12. AJUSTES AL PATRIMONIO|13. RESULTADO NETO DEL EJERCICIO|14. EXCEDENTE DE REVALUACION|15. RESULTADO DEL EJERCICIO|16. ESTADO DE LA OPERACION|\n";

            try {
                let periodname = filterAnioPeriod;
                let nameReportGenerated = "LE" + fedIdNumb + periodname + "1231031900" + "07" + "1" + hasinfo + "11";
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);
                if (params.filterFormat == "CSV") {
                    nameReportGenerated = nameReportGenerated + ".csv";
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, " ");
                    structuregbody = structuregbody.replace(/[|]/gi, ",");
                    typeformat = file.Type.CSV;
                } else if (params.filterFormat == 'TXT')  {
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
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
          };

        const getTransactions = (params) => {
            try {
            var arrResult = [];
            var _cont = 0;
        
            var savedSearch = search.load({
              id: "customsearch_pe_319_lib_invbal",
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
        
                // 1. saldo
                arrAux[2] = result.getValue(columns[2]);
        
    
                arrResult.push({
                   // key: _cont++,
                   // resultTransactions: {
                        dato1: arrAux[0],
                        dato2: arrAux[1],
                        dato3: arrAux[2]
                 //   }

                });

                
              });
            });
            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult }
            }
            return { thereisinfo: 0 }

                } catch (error) {
                    log.error('getTransactions()', error.message);
                }
          };

          const getJsonData = (transactions, params) => {
            try {

                var cuentas = [
                    "1. Efecto acumulado de los cambios en las políticas contables y la corrección de errores sustanciales",
                    "2. Distribuciones o asignaciones de utilidades efectuadas en el período",
                    "3. Dividendos y participaciones acordados durante el período",
                    "4. Nuevos aportes de accionistas",
                    "5. Movimiento de prima en la colocación de aportes y donaciones",
                    "6. Incrementos o disminuciones por fusiones o escisiones",
                    "7. Revaluación de activos",
                    "8. Capitalización de partidas patrimoniales",
                    "9. Redención de Acciones de Inversión o reducción de capital",
                    "10. Utilidad (pérdida) Neta del ejercicio",
                    "11. Otros incrementos o disminuciones de las partidas patrimoniales",
                  ];
                  var row1Column1 = ["4D0126", "4D0127"];
                  var row2Column3 = ["4D0134"];
                  var row3Column2 = ["4D0104", "4D0204"];
                  var row4Column3 = ["4D0132", "4D0133", "4D0232"];
                  var row11Column2 = ["4D0105", "4D0205"];
                  var row11Column6 = ["4D0135", "4D0114", "4D0112", "4D0212", "4D0233", "4D0214", "4D0235", "4D0234"];
                   
            let userTemp = runtime.getCurrentUser(),
              useID = userTemp.id,
              jsonTransacion = {},
              saldo = 0;
        
            /*var employeeName = search.lookupFields({
              type: search.Type.EMPLOYEE,
              id: useID,
              columns: ["firstname", "lastname"],
            });
            var userName = employeeName.firstname + " " + employeeName.lastname;
            */
        
            log.debug("transactions", transactions);
        
            var total1 = 0; // 4D0126 + 4D0127
            var total2 = 0; // 4D0134
            var total3 = 0; // 4D0104 + 4D0204
            var total4 = 0; // 4D0132 + 4D0133 + 4D0232
            var total5 = 0; // 4D0105 + 4D0205
            var total6 = 0; // 4D0135 + 4D0114 + 4D0112 + 4D0212 + 4D0233 + 4D0214 + 4D0235 + 4D0234
            var lastYear = 0; // 4D0101
        
            let IDD = 0;
        
            for (var k in transactions) {
              let dato_2 = transactions[k].dato2;
              let dato_3 = parseFloat(transactions[k].dato3);
              log.debug("dato_2", dato_2);
              //if dato_2  is in row1Column1
              if (row1Column1.includes(dato_2)) {
                total1 += dato_3;
              }
              if (row2Column3.includes(dato_2)) {
                total2 += dato_3;
              }
              if (row3Column2.includes(dato_2)) {
                total3 += dato_3;
              }
              if (row4Column3.includes(dato_2)) {
                total4 += dato_3;
              }
              if (row11Column2.includes(dato_2)) {
                total5 += dato_3;
              }
              if (row11Column6.includes(dato_2)) {
                total6 += dato_3;
              }
              if (dato_2 == "4D0101") {
                lastYear += dato_3;
              }
            }
        
            log.debug("jsonTransacion", jsonTransacion);
           /* let periodSearch = search.lookupFields({
              type: search.Type.ACCOUNTING_PERIOD,
              id: pGloblas.pPeriod,
              columns: ["periodname"],
            });*/
        
            let totalv2 = Number(total3) + Number(total5) + Number(lastYear);
            let totalv3 = Number(total2) + Number(total4);
            let pos8 = Number(total5) + Number(total6);
            let pos8_b = Number(lastYear) + Number(total2);
            let totalFinal = Number(total1) + Number(pos8_b) + Number(total3) + Number(total4) + Number(pos8);
        
            let jsonCompany = {
              company: {
                firtsTitle: "FORMATO 3.19 : LIBRO DE INVENTARIOS Y BALANCES - ESTADO DE CAMBIOS EN EL PATRIMONIO NETO DEL 01.01 AL 31.12",
                secondTitle: params.filterAnioPeriod,
                thirdTitle: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                fourthTitle: getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase()
              },
              account: {
                title1: "SALDOS AL 31 DE DICIEMBRE DE " + params.filterAnioPeriod,
                title2: "SALDOS AL 31 DE DICIEMBRE DE " + params.filterAnioPeriod,
              },
              lastYear: {
                totalCapital: numberWithCommas(lastYear.toFixed(2)),
              },
              vTotals: {
                totalv1: numberWithCommas(total1.toFixed(2)),
                totalv2: numberWithCommas(totalv2.toFixed(2)),
                totalv3: numberWithCommas(totalv3.toFixed(2)),
                totalv4: "0.00",
                totalv5: "0.00",
                totalv6: numberWithCommas(total6.toFixed(2)),
                totalv7: "0.00",
                totalv8: numberWithCommas(totalFinal.toFixed(2)),
              },
              movements: {
                1: {
                  desc: cuentas[0],
                  pos1: numberWithCommas(total1.toFixed(2)),
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: numberWithCommas(total1.toFixed(2)),
                },
                2: {
                  desc: cuentas[1],
                  pos1: "0.00",
                  pos2: numberWithCommas(lastYear.toFixed(2)),
                  pos3: numberWithCommas(total2.toFixed(2)),
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: numberWithCommas(pos8_b.toFixed(2)),
                },
                3: {
                  desc: cuentas[2],
                  pos1: "0.00",
                  pos2: numberWithCommas(total3.toFixed(2)),
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: numberWithCommas(total3.toFixed(2)),
                },
                4: {
                  desc: cuentas[3],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: numberWithCommas(total4.toFixed(2)),
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: numberWithCommas(total4.toFixed(2)),
                },
                5: {
                  desc: cuentas[4],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                6: {
                  desc: cuentas[5],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                7: {
                  desc: cuentas[6],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                8: {
                  desc: cuentas[7],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                9: {
                  desc: cuentas[8],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                10: {
                  desc: cuentas[9],
                  pos1: "0.00",
                  pos2: "0.00",
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: "0.00",
                  pos7: "0.00",
                  pos8: "0.00",
                },
                11: {
                  desc: cuentas[10],
                  pos1: "0.00",
                  pos2: numberWithCommas(total5.toFixed(2)),
                  pos3: "0.00",
                  pos4: "0.00",
                  pos5: "0.00",
                  pos6: numberWithCommas(total6.toFixed(2)),
                  pos7: "0.00",
                  pos8: numberWithCommas(pos8.toFixed(2)),
                },
              },
            };
        
            return jsonCompany;
        } catch (e) {
            log.error({ title: 'getJsonData', details: e });
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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_19.ftl");
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
