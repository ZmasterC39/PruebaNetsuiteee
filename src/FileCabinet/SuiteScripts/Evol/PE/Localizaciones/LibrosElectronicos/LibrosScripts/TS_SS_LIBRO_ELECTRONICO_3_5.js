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

        const SCRIPT_ID = 'customscript_ts_ss_le_3_5';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_5';
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
                    const searchId = 'customsearch_pe_detalle_16_3_5';
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

    const getPeriodId = (textAnio) => {
        let startDate = new Date();
        let firstDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        firstDate = format.format({
            value: firstDate,
            type: format.Type.DATE
        });
        let resultSearch = search.create({
            type: "accountingperiod",
            filters: [
                ["isadjust", "is", "F"],
                "AND",
                ["isquarter", "is", "F"],
                "AND",
                ["isyear", "is", "F"],
                "AND",
                ["startdate", "on", firstDate]
            ],
            columns: [
                search.createColumn({
                    name: "internalid"
                })
            ]
        }).run().getRange(0, 1);
        if (resultSearch.length) return resultSearch[0].id;
        return "";
    }

    const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
        try {
            const recordlog = record.create({ type: logrecodId });
            if (featureSubsidiary) {
                recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
            }
            var periodId = getPeriodId(filterPostingPeriod);
            recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null }); //periodId
            recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
            recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
            recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.5' });
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
            var startdate = format.format({
                value: new Date(anioperiod, 0, 1),
                type: format.Type.DATE
            });
            var enddate = format.format({
                value: new Date(anioperiod, 12, 0),
                type: format.Type.DATE
            });
            searchLoad.filters.push(search.createFilter({
                name: 'trandate',
                operator: search.Operator.WITHIN,
                values: [startdate, enddate]
            }));
            const searchResultCount = searchLoad.runPaged().count;

            if (searchResultCount != 0) {
                if (searchResultCount <= 4000) {
                    searchLoad.run().each((result) => {
                        let column01 = result.getValue(searchLoad.columns[0]);
                        //column01 = column01.split('/');
                        //const PeriodoCompleto = func(column01[0], column01[1]);
                        let column02 = result.getValue(searchLoad.columns[1]);
                        column02 = column02.replace(/(\r\n|\n|\r)/gm, "");
                        column02 = column02.replace(/[\/\\|]/g, "");
                        let column03 = result.getValue(searchLoad.columns[2]);
                        if (column03 == '- None -') {
                            column03 = '99'
                        }
                        const column04 = result.getValue(searchLoad.columns[3]);
                        let column05 = result.getValue(searchLoad.columns[4]);
                        if (column05 == '- None -') {
                            column05 = '00000000'
                        }
                        let column06 = result.getValue(searchLoad.columns[5]);
                        column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                        column06 = column06.replace(/[\/\\|]/g, "");
                        if (column06 == ' ' || column06 == '') {
                            column06 = 'VACÍO'
                        }
                        const column07 = result.getValue(searchLoad.columns[6]);
                        let column08 = result.getValue(searchLoad.columns[7]);
                        column08 = parseFloat(column08).toFixed(2);
                        const column09 = result.getValue(searchLoad.columns[8]);
                        let column10 = result.getValue(searchLoad.columns[9]);

                        let column11 = result.getValue(searchLoad.columns[10]);
                        let column12 = result.getValue(searchLoad.columns[11]);
                        let column13 = result.getValue(searchLoad.columns[12]);

                        let nombre = column13;
                        let numTrabajador = column12;
                        let codigoTipoDocumento = '0';

                        if (column11 != '0') {
                            let entidad = getCustomer(column11);
                            if (entidad[0] == null) {
                                entidad = getProveedor(column11);
                            }
                            if (entidad[0] == null) {
                                entidad = getemployee(column11);
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

                        if (column10 == anioperiod) {
                            json.push({
                                c1_periodo: column01,
                                c2_cuo: column02,
                                c3_correlativo: column03,
                                c4_tipo_doc_tercero: codigoTipoDocumento,
                                c5_nro_doc_tercero: numTrabajador,
                                c6_nombres_o_razon_social: nombre,
                                c7_fecha_op: column07,
                                c8_monto_cuenta_por_cobrar_tercero: column08,
                                c9_estado_op: column09
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
                            let column02 = searchResult[j].getValue(searchLoad.columns[1]);
                            column02 = column02.replace(/(\r\n|\n|\r)/gm, "");
                            column02 = column02.replace(/[\/\\|]/g, "");
                            let column03 = searchResult[j].getValue(searchLoad.columns[2]);
                            if (column03 == '- None -') {
                                column03 = '99'
                            }
                            const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                            let column05 = searchResult[j].getValue(searchLoad.columns[4]);
                            if (column05 == '- None -') {
                                column05 = '00000000'
                            }
                            let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                            column06 = column06.replace(/(\r\n|\n|\r)/gm, "");
                            column06 = column06.replace(/[\/\\|]/g, "");
                            if (column06 == ' ' || column06 == '') {
                                column06 = 'VACÍO'
                            }
                            const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                            let column08 = searchResult[j].getValue(searchLoad.columns[7]);
                            column08 = parseFloat(column08).toFixed(2);
                            const column09 = searchResult[j].getValue(searchLoad.columns[8]);
                            let column10 = searchResult[j].getValue(searchLoad.columns[10]);

                            let column11 = result[j].getValue(searchLoad.columns[10]);
                            let column12 = result[j].getValue(searchLoad.columns[11]);
                            let column13 = result[j].getValue(searchLoad.columns[12]);

                            let nombre = column13;
                            let numTrabajador = column12;
                            let codigoTipoDocumento = '0';

                            if (column11 != '0') {
                                let entidad = getCustomer(column11);
                                if (entidad[0] == null) {
                                    entidad = getProveedor(column11);
                                }
                                if (entidad[0] == null) {
                                    entidad = getemployee(column11);
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
                                if (codigoTipoDocumento == null) codigoTipoDocumento = '0';

                                if (isPerson == false) {
                                    nombre = company;
                                } else if (isPerson == true) {
                                    nombre = altname;
                                }
                            }
                            nombre = nombre.replace(/(\r\n|\n|\r)/gm, "");
                            nombre = nombre.replace(/[\/\\|]/g, "");

                            if (column10 == anioperiod) {
                                json.push({
                                    c1_periodo: PeriodoCompleto,
                                    c2_cuo: column02,
                                    c3_correlativo: column03,
                                    c4_tipo_doc_tercero: codigoTipoDocumento,
                                    c5_nro_doc_tercero: numTrabajador,
                                    c6_nombres_o_razon_social: nombre,
                                    c7_fecha_op: column07,
                                    c8_monto_cuenta_por_cobrar_tercero: column08,
                                    c9_estado_op: column09
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
                    searchResult[i].c4_tipo_doc_tercero + '|' + searchResult[i].c5_nro_doc_tercero + '|' + searchResult[i].c6_nombres_o_razon_social + '|' +
                    searchResult[i].c7_fecha_op + '|' + searchResult[i].c8_monto_cuenta_por_cobrar_tercero + '|' + searchResult[i].c9_estado_op + '|\n';
            }

            return contentReport;
        } catch (e) {
            log.error({ title: 'structureBody', details: e });
        }
    }


    const createFile = (params, fedIdNumb, hasinfo, transactionJSON) => {
        let typeformat;
        const header = '1 Período|2 CUO|3 Correlativo|4 Tipo de Documento de Identidad del tercero|5 Número de Documento de Identidad del tercero|6 Apellidos y Nombres, Denominación o Razón Social de terceros|' +
            '7 Fecha de emisión del Comprobante de Pago o Fecha de inicio de la operación|8 Monto de cada cuenta por cobrar del tercero|9 Indica el estado de la operación|10 Cód. Cuenta Contable|\n';
        try {
            log.debug('params', params);
            let periodname = params.filterAnioPeriod;
            let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030500' + '07' + '1' + hasinfo + '11';//_' + recordlogid;
            let structuregbody = structureBody(transactionJSON);
            let jsonAxiliar = getJsonData(transactionJSON, params);
            jsonAxiliar = setSpecialChars(jsonAxiliar);

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
        var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_5.ftl");
        return aux.getContents();
    };

    const getTransactions = (params) => {
        try {
            log.debug('MSK', 'getTransactions - Inicio');
            var arrResult = [];
            var _cont = 0;

            // FORMATO 3.5: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 16"
            var savedSearch = search.load({
                id: 'customsearch_pe_libro_impreso_3_5'
            });

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
                    arrAux = new Array();
                    // 0. ID INTERNO
                    arrAux[0] = result.getValue(columns[0]);
                    // 1. TIPO DOCUMENTO DE IDENTIDAD
                    arrAux[1] = result.getValue(columns[1]);
                    // 2. NÚMERO DOCUMENTO DE IDENTIDAD
                    arrAux[2] = result.getValue(columns[2]);
                    // 3. APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL
                    arrAux[3] = result.getValue(columns[3]);
                    // 4. MONTO DE LA CUENTA POR COBRAR
                    arrAux[4] = result.getValue(columns[4]);
                    // 5. FECHA DE INICIO DE LA OPERACIÓN
                    arrAux[5] = result.getValue(columns[5]);
                    /*// 6. PERIODO
                    arrAux[6] = result.getValue(columns[6]);
                    // 7. PERIODO nombre
                    arrAux[7] = result.getValue(columns[7]);
                    let IDEntidad = result.getValue(columns[8]);
                    let NumeroCuenta = '';
                    NumeroCuenta = result.getValue(columns[9]);
                    let NameCuenta = result.getValue(columns[10]);
                    let nombre = NameCuenta;
                    let numTrabajador = NumeroCuenta;
                    let codigoTipoDocumento = '0';
                    if(IDEntidad != '0'){
                        let entidad = getCustomer(IDEntidad);
                        if (entidad[0] == null) {
                            entidad = getProveedor(IDEntidad);
                        }
                        if (entidad[0] == null) {
                            entidad = getemployee(IDEntidad);
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
                    arrAux[1] = codigoTipoDocumento;
                    arrAux[2] = numTrabajador;
                    arrAux[3] = nombre;
                    if(arrAux[7].indexOf(params.filterAnioPeriod) !== -1)
                    {*/
                        arrResult.push({
                            idInterno: arrAux[0],
                            tipoDocumento: arrAux[1],
                            numeroDocumento: arrAux[2],
                            razonSocial: (arrAux[3]=="- None -"?"":arrAux[3]),
                            montoCtaCobrar: arrAux[4],
                            fechaInicio: arrAux[5]
                        });
                    //}

                });
            });

            //!DATA PRUEBA - Inicio
            // for(var i=0;i<50;i++){
            //     arrAux = new Array();
            //     arrAux[0] = (123+i)
            //     arrAux[1] = '6'
            //     arrAux[2] = '20100029741'
            //     arrAux[3] = 'A. BERIO Y CIA S.A.C.'
            //     arrAux[4] = '14320.00'
            //     arrAux[5] = '11/08/2023'
            //     arrAux[6] = 'Ago 2023'
            //     arrAux[7] = 'Ago 2023'
            //     arrResult.push(arrAux);
            // }
            //!DATA PRUEBA - Fin
            
            if (arrResult.length > 0) {
                return { thereisinfo: 1, content: arrResult }
            }
            return { thereisinfo: 0 }
        } catch (error) {
            log.debug('getTransactions()', error.message);
        }
    }

    const getJsonData = (transactions, params) => {
        log.debug('MSK', 'getJsonData - Inicio');
        let userTemp = runtime.getCurrentUser(),
            useID = userTemp.id,
            jsonTransacion = {},
            jsonTransacionvine = new Array(),
            totalMonto = 0;

        var employeeName = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: useID,
            columns: ['firstname', 'lastname']
        });
        var userName = employeeName.firstname + ' ' + employeeName.lastname;
        var cantidadLinea = 0 ;
        var montoviene = 0 ;
        var cantidadFor = 0;
        var cantidadAnterio=0;

        log.debug('transactions', transactions);

        for (var k in transactions) {
            let IDD = transactions[k].idInterno;
            cantidadLinea = cantidadLinea + 1;
            if (!jsonTransacion[IDD]) {
                jsonTransacion[IDD] = {
                    number :cantidadFor,
                    idInterno: transactions[k].idInterno,
                    tipoDocumento: transactions[k].tipoDocumento,
                    numeroDocumento: transactions[k].numeroDocumento,
                    razonSocial: transactions[k].razonSocial,
                    montoCtaCobrar: Number(transactions[k].montoCtaCobrar),
                    fechaInicio: transactions[k].fechaInicio,
                }
                cantidadFor = cantidadFor+1;
                totalMonto = totalMonto + Number(transactions[k].montoCtaCobrar);
            }
            if(cantidadLinea <= 26){
                montoviene = Number(montoviene) +Number(transactions[k].montoCtaCobrar);
                cantidadAnterio = cantidadLinea;
            }else{
                
                jsonTransacionvine.push({
                    montoviene : roundTwoDecimal(montoviene.toFixed(2)),
                    cantidadFor :cantidadFor-1
                });
                
                
                cantidadLinea = 0;
                cantidadLinea = cantidadLinea + 1;
                montoviene = Number(montoviene) +Number(transactions[k].montoCtaCobrar);
            }
        }

        log.debug('jsonTransacion', jsonTransacion);

        let jsonAxiliar = {
            "cabecera": {
                "Anio": params.filterAnioPeriod,
                "ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                "razonSocial": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase()
            },
            "total": {
                "totalMonto": roundTwoDecimal(totalMonto)
            },
            "movements": jsonTransacion,
            "jsonTransacionvine": jsonTransacionvine
        };

        log.debug('MSK - jsonAxiliar', jsonAxiliar);
        return jsonAxiliar;
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

    const roundTwoDecimal = (value) => {
        return Math.round(Number(value) * 100) / 100;
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

        return { execute }

    });
