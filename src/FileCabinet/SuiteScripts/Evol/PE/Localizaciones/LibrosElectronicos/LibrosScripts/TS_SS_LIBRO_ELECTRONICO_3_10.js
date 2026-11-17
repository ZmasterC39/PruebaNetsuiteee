/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/search", "N/record", "N/runtime", "N/log", "N/file", "N/task", "N/config", "./PE_LIB_Libros.js", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, libPe, format, render) => {

        /**
    * Defines the Scheduled script trigger point.
    * @param {Object} scriptContext 
    * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
    * @since 2015.2
    */

        const SCRIPT_ID = 'customscript_ts_ss_le_3_10';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_10';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;


        const execute = (scriptContext) => {
            try {
                let getCola = getPendientes();
                if (getCola.length > 0) {
                    let params = getCola[0].param;
                    params = JSON.parse(params);
                    let idCola = getCola[0].id;
                    params.parametros.idCola = idCola;
                    log.debug('Main', 'Main');
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
                    const searchId = 'customsearch_pe_detalle_42_3_12_2'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
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
                recordlog.setValue({ fieldId: "custrecord_pe_period_log", value: null });//filterPostingPeriod
                recordlog.setValue({ fieldId: "custrecord_pe_status_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_report_log", value: "Procesando..." });
                recordlog.setValue({ fieldId: "custrecord_pe_book_log", value: "Inventario y Balance 3.11" });
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
                            let periodo = result.getValue(searchLoad.columns[0]);
                            let cuo = result.getValue(searchLoad.columns[1]);
                            let correlativo = result.getValue(searchLoad.columns[2]);
                            let tipo_doc_proveedor = result.getValue(searchLoad.columns[3]);
                            //reemplazar espacios vacios            
                            tipo_doc_proveedor = tipo_doc_proveedor.replace(/\s/g, "");
                            log.debug("tipo_doc_proveedor", tipo_doc_proveedor);
                            tipo_doc_proveedor = tipo_doc_proveedor == "-None-" ? "" : tipo_doc_proveedor;
                            let nro_doc_proveedor = result.getValue(searchLoad.columns[4]);
                            nro_doc_proveedor = nro_doc_proveedor.replace(/\s/g, "");;
                            nro_doc_proveedor = nro_doc_proveedor == "-None-" ? "" : nro_doc_proveedor;

                            let fecha_emision = result.getValue(searchLoad.columns[5]);
                            let nombre_razonSocial = result.getValue(searchLoad.columns[6]);
                            let nombreRZ = nombre_razonSocial.replace(/\s/g, "");;
                            nombre_razonSocial = nombreRZ == "-None-" ? "" : nombre_razonSocial;
                            let monto_cuenta = result.getValue(searchLoad.columns[7]);
                            //monto_cuenta = numberWithCommas(monto_cuenta);
                            let estado_operacion = result.getValue(searchLoad.columns[8]);
                            let cuenta_contable = result.getValue(searchLoad.columns[9]);
                            let anio = result.getValue(searchLoad.columns[10]);
                            let idPersona = result.getValue(searchLoad.columns[11]);
                            let nomCuenta = result.getValue(searchLoad.columns[12]);

                            log.debug('idPersona', idPersona);
                            let nombre = nomCuenta;
                            let numTrabajador = cuenta_contable;
                            let codigoTipoDocumento = '0';

                            if (idPersona != '0') {
                                let entidad = getCustomer(idPersona);
                                if (entidad[0] == null) {
                                    entidad = getProveedor(idPersona);
                                }
                                if (entidad[0] == null) {
                                    entidad = getemployee(idPersona);
                                }

                                let company = entidad[0];
                                numTrabajador = entidad[1];
                                let isPerson = entidad[2];
                                let altname = entidad[3];
                                codigoTipoDocumento = entidad[4];

                                if (company == null) company = '';
                                if (numTrabajador == null) numTrabajador = '';
                                if (isPerson == null) isPerson = '';
                                if (altname == null) altname = '';
                                if (codigoTipoDocumento == null) codigoTipoDocumento = '';

                                if (isPerson == false) {
                                    nombre = company;
                                } else if (isPerson == true) {
                                    nombre = altname;
                                }
                            }
                            nombre = nombre.replace(/(\r\n|\n|\r)/gm, "");
                            nombre = nombre.replace(/[\/\\|]/g, "");
                            log.debug('anioperiod', anioperiod)
                            log.debug('anio', anio)
                            if (anio == anioperiod) {
                                json.push({
                                    c1_periodo: periodo,
                                    c2_cuo: cuo,
                                    c3_correlativo: correlativo,
                                    c4_tipo_doc_proveedor: codigoTipoDocumento,
                                    c5_nro_doc_proveedor: numTrabajador,
                                    c6_fecha_emision: fecha_emision,
                                    c7_nombre_razonSocial: nombre,
                                    c8_monto_cuenta: monto_cuenta,
                                    c9_estado_operacion: estado_operacion,
                                    c10_cuenta_contable: cuenta_contable,
                                    c11_anio: anio,
                                    c12_cod_trabajador: numTrabajador
                                });
                            }
                            return true;
                        });

                        if (json.length > 0) {
                            return { thereisinfo: 1, content: json };
                        } else {
                            return { thereisinfo: 0 }
                        }
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
                                let cuo = result.getValue(searchLoad.columns[1]);
                                let correlativo = result.getValue(searchLoad.columns[2]);
                                let tipo_doc_proveedor = result.getValue(searchLoad.columns[3]);
                                //reemplazar espacios vacios
                                tipo_doc_proveedor = tipo_doc_proveedor.replace(/\s/g, "");
                                tipo_doc_proveedor = tipo_doc_proveedor == "-None-" ? "" : tipo_doc_proveedor;

                                let nro_doc_proveedor = result.getValue(searchLoad.columns[4]);
                                nro_doc_proveedor = nro_doc_proveedor.replace(/\s/g, "");;
                                nro_doc_proveedor = nro_doc_proveedor == "-None-" ? "" : nro_doc_proveedor;

                                let fecha_emision = result.getValue(searchLoad.columns[5]);
                                let nombre_razonSocial = result.getValue(searchLoad.columns[6]);
                                let nombreRZ = nombre_razonSocial.replace(/\s/g, "");;
                                nombre_razonSocial = nombreRZ == "-None-" ? "" : nombre_razonSocial;
                                let monto_cuenta = result.getValue(searchLoad.columns[7]);
                                //monto_cuenta = numberWithCommas(monto_cuenta);
                                let estado_operacion = result.getValue(searchLoad.columns[8]);
                                let cuenta_contable = result.getValue(searchLoad.columns[9]);
                                let anio = result.getValue(searchLoad.columns[10]);
                                let idPersona = result.getValue(searchLoad.columns[11]);
                                let nomCuenta = result.getValue(searchLoad.columns[12]);

                                let nombre = nomCuenta;
                                let numTrabajador = cuenta_contable;
                                let codigoTipoDocumento = '0';

                                if (idPersona != '0') {
                                    let entidad = getCustomer(idPersona);
                                    if (entidad[0] == null) {
                                        entidad = getProveedor(idPersona);
                                    }
                                    if (entidad[0] == null) {
                                        entidad = getemployee(idPersona);
                                    }

                                    let company = entidad[0];
                                    numTrabajador = entidad[1];
                                    let isPerson = entidad[2];
                                    let altname = entidad[3];
                                    codigoTipoDocumento = entidad[4];

                                    if (company == null) company = '';
                                    if (numTrabajador == null) numTrabajador = '';
                                    if (isPerson == null) isPerson = '';
                                    if (altname == null) altname = '';
                                    if (codigoTipoDocumento == null) codigoTipoDocumento = '';

                                    if (isPerson == false) {
                                        nombre = company;
                                    } else if (isPerson == true) {
                                        nombre = altname;
                                    }
                                }
                                nombre = nombre.replace(/(\r\n|\n|\r)/gm, "");
                                nombre = nombre.replace(/[\/\\|]/g, "");


                                if (anio == anioperiod) {
                                    json.push({
                                        c1_periodo: periodo,
                                        c2_cuo: cuo,
                                        c3_correlativo: correlativo,
                                        c4_tipo_doc_proveedor: codigoTipoDocumento,
                                        c5_nro_doc_proveedor: numTrabajador,
                                        c6_fecha_emision: fecha_emision,
                                        c7_nombre_razonSocial: nombre,
                                        c8_monto_cuenta: monto_cuenta,
                                        c9_estado_operacion: estado_operacion,
                                        c10_cuenta_contable: cuenta_contable,
                                        c11_anio: anio,
                                        c12_cod_trabajador: numTrabajador
                                    });
                                }
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }

                        if (json.length > 0) {
                            return { thereisinfo: 1, content: json };
                        } else {
                            return { thereisinfo: 0 }
                        }
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
                    contentReport = contentReport + searchResult[i].c1_periodo + "|" + searchResult[i].c2_cuo + "|" + searchResult[i].c3_correlativo + "|" + searchResult[i].c10_cuenta_contable + "|" + searchResult[i].c4_tipo_doc_proveedor + "|" + searchResult[i].c5_nro_doc_proveedor + "|" + searchResult[i].c12_cod_trabajador + "|" + searchResult[i].c7_nombre_razonSocial + "|" + searchResult[i].c8_monto_cuenta + "|" + searchResult[i].c9_estado_operacion + "|\n";
                }

                return contentReport;
            } catch (e) {
                log.error({ title: "structureBody", details: e });
            }
        };

        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId, filterAnioPeriod) => {
            let typeformat;
            const header = "1 Periodo|2 CUO|3 CORRELATIVO |4 Codigo Cuenta  |5 Tipo Documento |6 Nro Documento |7 Codigo Trabajador | 8 Apellidos Nombres RazonSocial | 9 Monto | 10 Estado Operacion |\n";
            try {
                let periodname = filterAnioPeriod;
                let nameReportGenerated = "LE" + fedIdNumb + periodname + "1231031000" + "07" + "1" + hasinfo + "11";//_" + recordlogid;
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
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }

        const getProveedor = (id) => {
            id = Number(id);
            try {
                var arr = [];
                let vendor = search.lookupFields({
                    type: "vendor",
                    id: id,
                    columns: [
                        "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type',
                    ]
                });
                arr[0] = vendor.companyname;
                arr[1] = vendor.vatregnumber;
                arr[2] = vendor.isperson;
                arr[3] = vendor.altname;
                arr[4] = vendor.custentity_pe_code_document_type;
                return arr;
            } catch (error) {
                log.error('error-getProveedor', error);
            }
        }

        const getCustomer = (id) => {
            id = Number(id);
            try {
                var arr = [];
                let customer = search.lookupFields({
                    type: "customer",
                    id: id,
                    columns: [
                        "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type'
                    ]
                });
                arr[0] = customer.companyname;
                arr[1] = customer.vatregnumber;
                arr[2] = customer.isperson;
                arr[3] = customer.altname;
                arr[4] = customer.custentity_pe_code_document_type;
                return arr;
            } catch (error) {
                log.error('error-getCustomer', error);
            }
        }

        const getemployee = (id) => {
            id = Number(id);
            try {
                var arr = [];
                let employee = search.lookupFields({
                    type: "employee",
                    id: id,
                    columns: [
                        "altname", 'custentity_pe_document_number', 'custentity_pe_code_document_type'
                    ]
                });
                arr[0] = '';
                arr[1] = employee.custentity_pe_document_number;
                arr[2] = true;
                arr[3] = employee.altname;
                arr[4] = employee.custentity_pe_code_document_type;
                return arr;
            } catch (error) {
                log.error('error-getemployee', error);
            }
        }

        const getTransactions = (params) => {
            
            try {
            var arrResult = [];
            var _cont = 0;
        
            // FORMATO 3.10: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 40"
            var savedSearch = search.load({
              id: "customsearch_pe_libro_impreso_3_10",
            });
        
            // log.debug(" pGloblas.pSubsidiary", pGloblas.pSubsidiary);

              savedSearch.filters.push(
                search.createFilter({
                  name: "subsidiary",
                  operator: search.Operator.IS,
                  values: params.filterSubsidiary,
                })
              );
            
        
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
        
            var pagedData = savedSearch.runPaged({
              pageSize: 1000,
            });
        
            var page, columns;
        
            pagedData.pageRanges.forEach((pageRange) => {
              page = pagedData.fetch({
                index: pageRange.index,
              });
        
              page.data.forEach((result) => {
                columns = result.columns;
                arrAux = new Array();
        
                log.debug("result", result);
        
                // 0. CÓDIGO
                arrAux[0] = result.getValue(columns[0]);
        
                // 1. DENOMINACIÓN
                arrAux[1] = result.getValue(columns[1]);
        
                // 2. SALDO FINAL
                arrAux[2] = result.getValue(columns[2]);
        
                //3. fecha
                arrAux[3] = result.getText(columns[3]);
        
                
                arrResult.push({
                        
                    codigo: arrAux[0],
                    denominacion: arrAux[1],
                    saldoFinal: arrAux[2]
                   
 
                 });
                // }
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

          const getJsonData = (transactions,params) => {
            
            try {
            let userTemp = runtime.getCurrentUser(),
              useID = userTemp.id,
              jsonTransacion = {},
              totalAmount = 0;
        
        
            // log.debug("transactions", transactions);
            let counter = 0;
            for (var k in transactions) {
              log.debug("transactions[k]", transactions[k]);
              let IDD = transactions[k].denominacion;
              if (!jsonTransacion[counter]) {
                let saldoFinal = Number(transactions[k].saldoFinal).toFixed(2);
                saldoFinal = numberWithCommas(saldoFinal);
        
                jsonTransacion[counter] = {
                  codigo: transactions[k].codigo,
                  denominacion: transactions[k].denominacion.replace(/&/g, "&amp;").toLocaleUpperCase(),
                  saldoFinal: saldoFinal,
                };
                totalAmount = totalAmount + Number(transactions[k].saldoFinal);
                counter++;
              }
            }
        
            // log.debug("jsonTransacion", jsonTransacion);
        
        
            let jsonAxiliar = {
              company: {
                formato: 'FORMATO 3.10: LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 40 - TRIBUTOS POR PAGAR',
                ejercicio: "EJERCICIO: " + params.filterAnioPeriod,
                ruc: "RUC: " + getSubsidiaria(params.filterSubsidiary, 'ruc'),
                name: "RAZÓN SOCIAL: " + getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
                // firtTitle: companyName.replace(/&/g, "&amp;"),
                // secondTitle: "Expresado en Moneda Nacional",
                // thirdTitle: "COMPROBANTES DE RETENCION - " + periodSearch.periodname,
              },
              total: {
                total: totalAmount.toFixed(2),
              },
              movements: jsonTransacion,
            };
        
            return jsonAxiliar;

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
        };

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_10_pdf.ftl");
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
