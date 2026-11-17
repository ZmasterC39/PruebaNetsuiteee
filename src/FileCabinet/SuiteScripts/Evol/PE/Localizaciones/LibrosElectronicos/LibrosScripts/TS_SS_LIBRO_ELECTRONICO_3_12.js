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

        const SCRIPT_ID = 'customscript_ts_ss_le_3_12';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_12';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

        const entityCache = {
            vendor: {},
            customer: {},
            employee: {}
        };

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
                log.debug('JCEC', 'Inicio de proceso');
                try {
                    const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                    const searchId = 'customsearch_pe_detalle_42_3_12'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
                    let fedIdNumb = '';
                    let hasinfo = 0;


                    const params = getParams(parametros);


                    if (featureSubsidiary) {
                        const getruc = getSubsidiaria(params.filterSubsidiary, 'ruc');
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

                    // Reemplaza la sección correspondiente en la función main
                    if (searchbook && searchbook.thereisinfo === 1) {
                        hasinfo = "1";
                        const transactionJSON = searchbook.content;
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
                //recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: filterPostingPeriod });
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null });
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.12' });
                const recordlogid = recordlog.save();

                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: 'createRecord', details: e });
            }
        }


        const searchBook = (subsidiary, period, searchId, featureSubsidiary, anioperiod) => {
            let json = [];
            try {
                const searchLoad = search.load({ id: searchId });

                if (featureSubsidiary && subsidiary) {
                    searchLoad.filters.push(search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    }));
                }

                // Usar SearchPagedData para procesar grandes conjuntos de datos
                const pagedData = searchLoad.runPaged({ pageSize: 1000 });
                const searchResultCount = pagedData.count;

                if (searchResultCount === 0) {
                    return { thereisinfo: 0 };
                }

                // Procesar por páginas en lugar de todo a la vez
                pagedData.pageRanges.forEach(function (pageRange) {
                    const page = pagedData.fetch({ index: pageRange.index });

                    page.data.forEach(function (result) {
                        try {
                            const column01 = result.getValue(searchLoad.columns[0]) || '';
                            const column02 = (result.getValue(searchLoad.columns[1]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
                            const column03 = result.getValue(searchLoad.columns[2]) || '';
                            const column04 = result.getValue(searchLoad.columns[3]) === '- None -' ? '0' : result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]) === '- None -' ? '00000000000' : result.getValue(searchLoad.columns[4]);
                            const column06 = result.getValue(searchLoad.columns[5]) || '';
                            const column07 = (result.getValue(searchLoad.columns[6]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "") === '- None -' ? 'Otros' : (result.getValue(searchLoad.columns[6]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");

                            // Asegurar que column08 sea un número válido
                            let column08 = 0;
                            try {
                                column08 = parseFloat(result.getValue(searchLoad.columns[7]) || 0);
                            } catch (e) {
                                column08 = 0;
                            }

                            const column09 = result.getValue(searchLoad.columns[8]) || '';
                            const column10 = (result.getValue(searchLoad.columns[9]) || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");
                            const column11 = result.getValue(searchLoad.columns[10]) || '';
                            const column12 = result.getValue(searchLoad.columns[11]) || '0';
                            const column13 = result.getValue(searchLoad.columns[12]) || '';

                            let nombre = column13;
                            let numTrabajador = column10;
                            let codigoTipoDocumento = '0';

                            // Procesamiento de entidad más eficiente
                            if (column12 !== '0') {
                                // Buscar primero en cliente
                                let entidad = getCustomer(column12);

                                // Si no es cliente, buscar en proveedor
                                if (!entidad || entidad[0] === null) {
                                    entidad = getProveedor(column12);
                                }

                                // Si no es proveedor, buscar en empleado
                                if (!entidad || entidad[0] === null) {
                                    entidad = getemployee(column12);
                                }

                                if (entidad && entidad.length >= 5) {
                                    nombre = entidad[2] === true ? (entidad[3] || nombre) : (entidad[0] || nombre);
                                    numTrabajador = entidad[1] || numTrabajador;
                                    codigoTipoDocumento = entidad[4] || '0';
                                }
                            }

                            nombre = (nombre || '').replace(/(\r\n|\n|\r)/gm, "").replace(/[\/\\|]/g, "");

                            if (column11 == anioperiod) {
                                json.push({
                                    c1_periodo: column01,
                                    c2_cuo: column02,
                                    c3_correlativo: column03,
                                    c4_tipo_doc_proveedor: codigoTipoDocumento,
                                    c5_nro_doc_proveedor: numTrabajador,
                                    c6_fecha_comp_pago_op: column06,
                                    c7_nombres_o_razon_social: nombre,
                                    c8_monto_cuenta_pagar_proveedor: column08,
                                    c9_estado_op: column09,
                                    c10_cuenta_contable: column10,
                                });
                            }
                        } catch (rowError) {
                            // Ignorar errores en filas individuales para continuar con el proceso
                            log.error('Error procesando fila', rowError);
                        }
                    });
                });

                return { thereisinfo: json.length > 0 ? 1 : 0, content: json };

            } catch (e) {
                log.error({ title: 'searchBook', details: e });
                return { thereisinfo: 0 };
            }
        }


        const structureBody = (searchResult) => {
            let contentReport = '';
            try {
                for (let i in searchResult) {
                    contentReport =
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_correlativo + '|' +
                        searchResult[i].c4_tipo_doc_proveedor + '|' + searchResult[i].c5_nro_doc_proveedor + '|' + searchResult[i].c6_fecha_comp_pago_op + '|' +
                        searchResult[i].c7_nombres_o_razon_social + '|' + searchResult[i].c8_monto_cuenta_pagar_proveedor + '|' + searchResult[i].c9_estado_op + '|' +
                        searchResult[i].c10_cuenta_contable + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }


        const createFile = (params, fedIdNumb, hasinfo, transactionJSON) => {
            let typeformat;
            const header = '1 Periodo|2 CUO|3 Correlativo|4 Tipo de Documento de Identidad del proveedor|5 Numero de Documento de Identidad del proveedor|6 Fecha de emision del Comprobante de Pago o Fecha de inicio de la operacion|' +
                '7 Apellidos y Nombres, Denominacion o Razón Social del proveedor|8 Monto de cada cuenta por pagar al proveedor|9 Indica el estado de la operacion|10 Cuenta Contable|\n';
            try {
                let periodname = params.filterAnioPeriod;

                //let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231031200' + '07' + '1' + hasinfo + '11_' + recordlogid;
                let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231031200' + '07' + '1' + hasinfo + '11';
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);
                //jsonAxiliar = setSpecialChars(jsonAxiliar);

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
                            data: JSON.stringify(jsonAxiliar)
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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_12.ftl");
            return aux.getContents();
        };

        const getTransactions = (params) => {
            try {
                var arrResult = [];
                var _cont = 0;

                // FORMATO 3.12: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 42 - PROVEEDORES"
                var savedSearch = search.load({
                    id: "customsearch_pe_libro_impreso_3_12",
                });

                log.debug(" params.filterSubsidiary", params.filterSubsidiary);
                savedSearch.filters.push(
                    search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.IS,
                        values: params.filterSubsidiary
                    })
                );

                var startdate = format.format({
                    value: new Date(params.filterAnioPeriod, 0, 1),
                    type: format.Type.DATE
                });
                var enddate = format.format({
                    value: new Date(params.filterAnioPeriod, 11, 31),
                    type: format.Type.DATE
                });

                savedSearch.filters.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.WITHIN,
                    values: [startdate, enddate]
                }));

                // savedSearch.filters.push(
                //   search.createFilter({
                //     name: "postingperiod",
                //     operator: search.Operator.IS,
                //     values: [params.filterAnioPeriod],
                //   })
                // );

                var pagedData = savedSearch.runPaged({
                    pageSize: 1000,
                });

                var page, columns;

                pagedData.pageRanges.forEach(function (pageRange) {
                    page = pagedData.fetch({
                        index: pageRange.index,
                    });

                    var correlativo = 0;
                    page.data.forEach(function (result) {
                        columns = result.columns;
                        arrAux = new Array();
                        correlativo++;

                        // log.debug("result", result);

                        // 0. DNI:  TIPO (TABLA 2) - PROVEEDOR
                        arrAux[0] = result.getValue(columns[0]);

                        // 1. DNI: NÚMERO - PROVEEDOR
                        arrAux[1] = result.getValue(columns[1]);

                        // 2. APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL - PROVEEDOR
                        arrAux[2] = result.getValue(columns[2]);

                        //3. FECHA DE EMISIÓN DEL COMPROBANTE DE PAGO
                        arrAux[3] = result.getValue(columns[3]);

                        //4. NRO. DE COMPROBANTE
                        arrAux[4] = result.getValue(columns[4]);

                        //5. MONTO DE LA CUENTA POR PAGAR
                        arrAux[5] = result.getValue(columns[5]);

                        let year = arrAux[3].split("/")[2];

                        // log.debug("year", year);
                        // log.debug("params.filterAnioPeriod", params.filterAnioPeriod);

                        if (year == params.filterAnioPeriod) {
                            arrResult.push({
                                key: correlativo,
                                tipoDNIProveedor: arrAux[0],
                                numDNIProveedor: arrAux[1],
                                nombresProveedor: arrAux[2],
                                fechaEmision: arrAux[3],
                                nroComprobante: arrAux[4],
                                monto: arrAux[5]
                            });
                        }
                    });
                });
                /*//!DATA PRUEBA - Inicio
                for(var i=0;i<30;i++){
                    arrAux = new Array();
                    arrAux[0] = '1'
                    arrAux[1] = '7187996'+i
                    arrAux[2] = 'PEDRO MATEO JUAN'
                    arrAux[3] = '16/06/2023'
                    arrAux[4] = 'F001-00000054'
                    arrAux[5] = '494.42'
                    arrResult.push(arrAux);
                }
                //!DATA PRUEBA - Fin*/
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
                let userTemp = runtime.getCurrentUser(),
                    useID = userTemp.id,
                    jsonTransacion = {},
                    jsonTransacionvine = new Array(),
                    totalAmount = 0;

                var employeeName = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: useID,
                    columns: ["firstname", "lastname"],
                });
                var userName = employeeName.firstname + " " + employeeName.lastname;
                var cantidadLinea = 0;
                var montoviene = 0;
                var cantidadFor = 0;
                var cantidadAnterio = 0;

                log.debug("transactions", transactions);

                for (var k in transactions) {
                    let IDD = transactions[k].key;
                    cantidadLinea = cantidadLinea + 1;
                    if (!jsonTransacion[IDD]) {
                        let monto = parseFloat(transactions[k].monto).toFixed(2);
                        jsonTransacion[IDD] = {
                            number: cantidadFor,
                            tipoDNIProveedor: transactions[k].tipoDNIProveedor,
                            numDNIProveedor: transactions[k].numDNIProveedor,
                            nombresProveedor: transactions[k].nombresProveedor.replace(/&/g, "&amp;").toLocaleUpperCase(),
                            fechaEmision: transactions[k].fechaEmision,
                            nroComprobante: transactions[k].nroComprobante,
                            monto: numberWithCommas(monto),
                        };
                        cantidadFor = cantidadFor + 1;
                        totalAmount = totalAmount + Number(transactions[k].monto);
                    }
                    if (cantidadLinea <= 25) {
                        montoviene = Number(montoviene) + Number(transactions[k].monto);
                        cantidadAnterio = cantidadLinea;
                    } else {

                        jsonTransacionvine.push({
                            montoviene: numberWithCommas(montoviene.toFixed(2)),
                            cantidadFor: cantidadFor - 1
                        });


                        cantidadLinea = 0;
                        cantidadLinea = cantidadLinea + 1;
                        montoviene = Number(montoviene) + Number(transactions[k].monto);
                    }
                }

                log.debug("jsonTransacion", jsonTransacion);

                /*let periodSearch = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: params.filterAnioPeriod,
                columns: ["periodname"],
                });
            
                let periodname = periodSearch.periodname.split(" ");*/

                let jsonAxiliar = {
                    company: {
                        formato: 'FORMATO 3.12: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 42 - PROVEEDORES"',
                        ejercicio: "EJERCICIO: " + params.filterAnioPeriod,
                        ruc: "RUC: " + getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        name: "RAZÓN SOCIAL: " + getSubsidiaria(params.filterSubsidiary, 'razonSocial').replace(/&/g, "&amp;").toLocaleUpperCase(),
                    },
                    total: {
                        total: totalAmount,
                    },
                    movements: jsonTransacion,
                    "jsonTransacionvine": jsonTransacionvine
                };

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
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }

        const getProveedor = (id) => {
            try {
                id = Number(id) || 0;

                // Si ya está en caché, retornar directamente
                if (entityCache.vendor[id]) {
                    return entityCache.vendor[id];
                }

                var arr = [null, null, null, null, null];

                if (id > 0) {
                    let vendor = search.lookupFields({
                        type: "vendor",
                        id: id,
                        columns: [
                            "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type',
                        ]
                    });

                    arr[0] = vendor.companyname || '';
                    arr[1] = vendor.vatregnumber || '';
                    arr[2] = vendor.isperson || false;
                    arr[3] = vendor.altname || '';
                    arr[4] = vendor.custentity_pe_code_document_type || '0';

                    // Guardar en caché
                    entityCache.vendor[id] = arr;
                }

                return arr;
            } catch (error) {
                log.error('error-getProveedor', error);
                return [null, null, null, null, null];
            }
        }

        const getCustomer = (id) => {
            try {
                id = Number(id) || 0;

                // Si ya está en caché, retornar directamente
                if (entityCache.customer[id]) {
                    return entityCache.customer[id];
                }

                var arr = [null, null, null, null, null];

                if (id > 0) {
                    let customer = search.lookupFields({
                        type: "customer",
                        id: id,
                        columns: [
                            "companyname", 'vatregnumber', 'isperson', 'altname', 'custentity_pe_code_document_type'
                        ]
                    });

                    arr[0] = customer.companyname || '';
                    arr[1] = customer.vatregnumber || '';
                    arr[2] = customer.isperson || false;
                    arr[3] = customer.altname || '';
                    arr[4] = customer.custentity_pe_code_document_type || '0';

                    // Guardar en caché
                    entityCache.customer[id] = arr;
                }

                return arr;
            } catch (error) {
                log.error('error-getCustomer', error);
                return [null, null, null, null, null];
            }
        }

        const getemployee = (id) => {
            try {
                id = Number(id) || 0;

                // Si ya está en caché, retornar directamente
                if (entityCache.employee[id]) {
                    return entityCache.employee[id];
                }

                var arr = [null, null, null, null, null];

                if (id > 0) {
                    let employee = search.lookupFields({
                        type: "employee",
                        id: id,
                        columns: [
                            "altname", 'custentity_pe_document_number', 'custentity_pe_code_document_type'
                        ]
                    });

                    arr[0] = '';
                    arr[1] = employee.custentity_pe_document_number || '';
                    arr[2] = true;
                    arr[3] = employee.altname || '';
                    arr[4] = employee.custentity_pe_code_document_type || '0';

                    // Guardar en caché
                    entityCache.employee[id] = arr;
                }

                return arr;
            } catch (error) {
                log.error('error-getemployee', error);
                return [null, null, null, null, null];
            }
        }


        return { execute }

    });
