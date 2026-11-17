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

        const SCRIPT_ID = 'customscript_ts_ss_le_3_7';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_3_7';
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
                    const searchId = 'customsearch_pe_detalle_30_3_7'; // PE - Libro de Inventario y Balances - Detalle del Saldo de la Cuenta 20 - 3.7
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
                    const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary, params.filterAnioPeriod);

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
    
        const getPeriodId = () => {
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
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null });//periodId
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.7' });
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
    
    
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
    
                            let column01 = result.getValue(searchLoad.columns[0]);
                            //column01 = column01.split('/');
                            //const PeriodoCompleto = func(column01[0], column01[1]);
                            let column02 = result.getValue(searchLoad.columns[1]);
                            if (column02 == '- None -' || column02 != '1' || column02 != '3') {
                                column02 = '9'
                            }
                            let column03 = result.getValue(searchLoad.columns[2]);
                            if (column03 == '- None -') {
                                column03 = '99'
                            }
                            let column04 = result.getValue(searchLoad.columns[3]);
                            if (column04 == '- None -') {
                                column04 = ''
                            }
                            let column05 = result.getValue(searchLoad.columns[4]);
                            if (column05 == '- None -') {
                                column05 = ''
                            }
                            let column06 = result.getValue(searchLoad.columns[5]);
                            if (column06 == '- None -') {
                                column06 = ''
                            }
                            let column07 = result.getValue(searchLoad.columns[6]);
                            if (column07 == '- None -') {
                                column07 = ''
                            }
                            column07 = column07.replace(/(\r\n|\n|\r)/gm, "");
                            column07 = column07.replace(/[\/\\|]/g, "");
                            let column08 = result.getValue(searchLoad.columns[7]);
                            if (column08 == '- None -') {
                                //column08 = 'VACIO'
                                column08 = ''
                            }
                            let column09 = result.getValue(searchLoad.columns[8]);
                            if (column09 == '- None -') {
                                column09 = '9'
                            }
                            let column10 = result.getValue(searchLoad.columns[9]);
                            column10 = parseFloat(column10).toFixed(8);
    
                            let column11 = result.getValue(searchLoad.columns[10]);
                            column11 = parseFloat(column11).toFixed(8);
    
                            let column12 = result.getValue(searchLoad.columns[11]);
                            column12 = parseFloat(column12).toFixed(2);
    
                            const column13 = result.getValue(searchLoad.columns[12]);
                            let column14 = result.getValue(searchLoad.columns[13]);
                            column14 = column14.replace(/(\r\n|\n|\r)/gm, "");
                            column14 = column14.replace(/[\/\\|]/g, "");
                            let column15 = result.getValue(searchLoad.columns[14]);
                            if (column15 == anioperiod) {
                                json.push({
                                    c1_periodo: column01,
                                    c2_cod_catalogo: column02,
                                    c3_tipo_existencia: column03,
                                    c4_cod_propio_existencia: column04,
                                    c5_cod_catalogo_utilizado: column05,
                                    c6_cod_existencia_campo5: column06,
                                    c7_desc_existencia: column07,
                                    c8_cod_unid_meddida_existencia: column08,
                                    c9_cod_metod_valuacion_utilizado: column09,
                                    c10_cant_existencia: column10,
                                    c11_costo_unitario_existencia: column11,
                                    c12_costo_total: column12,
                                    c13_estado_op: column13,
                                    c14_cuenta_contable: column14
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
                                let column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                //column01 = column01.split('/');
                                //const PeriodoCompleto = func(column01[0], column01[1]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                let column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                if (column04 == '- None -') {
                                    column04 = ''
                                }
                                let column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                if (column05 == '- None -') {
                                    column05 = ''
                                }
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                if (column06 == '- None -') {
                                    column06 = ''
                                }
                                let column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                if (column07 == '- None -') {
                                    column07 = ''
                                }
                                column07 = column07.replace(/(\r\n|\n|\r)/gm, "");
                                column07 = column07.replace(/[\/\\|]/g, "");
                                const column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                const column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                let column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                column10 = parseFloat(column10).toFixed(8);
                                let column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                column11 = parseFloat(column11).toFixed(8);
                                let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                column12 = parseFloat(column12).toFixed(2);
                                const column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                let column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                column14 = column14.replace(/(\r\n|\n|\r)/gm, "");
                                column14 = column14.replace(/[\/\\|]/g, "");
                                let column15 = searchResult[j].getValue(searchLoad.columns[14]);
    
                                if (column15 == anioperiod) {
                                    json.push({
                                        c1_periodo: column01,
                                        c2_cod_catalogo: column02,
                                        c3_tipo_existencia: column03,
                                        c4_cod_propio_existencia: column04,
                                        c5_cod_catalogo_utilizado: column05,
                                        c6_cod_existencia_campo5: column06,
                                        c7_desc_existencia: column07,
                                        c8_cod_unid_meddida_existencia: column08,
                                        c9_cod_metod_valuacion_utilizado: column09,
                                        c10_cant_existencia: column10,
                                        c11_costo_unitario_existencia: column11,
                                        c12_costo_total: column12,
                                        c13_estado_op: column13,
                                        c14_cuenta_contable: column14
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
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cod_catalogo + '|' + searchResult[i].c3_tipo_existencia + '|' +
                        searchResult[i].c4_cod_propio_existencia + '|' + searchResult[i].c5_cod_catalogo_utilizado + '|' + searchResult[i].c6_cod_existencia_campo5 + '|' +
                        searchResult[i].c7_desc_existencia + '|' + searchResult[i].c8_cod_unid_meddida_existencia + '|' + searchResult[i].c9_cod_metod_valuacion_utilizado + '|' +
                        searchResult[i].c10_cant_existencia + '|' + searchResult[i].c11_costo_unitario_existencia + '|' + searchResult[i].c12_costo_total + '|' +
                        searchResult[i].c13_estado_op + '|\n';
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }
    
    
        const createFile = (params, fedIdNumb, hasinfo, transactionJSON) => {
            let typeformat;
            const header = '1 Periodo|2 Codigo de Catalogo|3 Tipo de Existencia|4 Codigo Propio de la Existencia|5 Codigo del catalogo utilizado|6 Codigo de Existencia correspondiente al catalogo señalado en el campo 5.|' +
                '7 Descripcion de la existencia|8 Codigo de la Unidad de medida de la existencia|9 Codigo del método de valuación utilizado|10 Cantidad de la existencia|11 Costo unitario de la existencia|' +
                '12 Costo total|13 Indica el estado de la operacion|\n';
            try {
    
                let periodname = params.filterAnioPeriod;
                let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231030700' + '07' + '1' + hasinfo + '11';//_' + recordlogid;
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
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'data',
                        data: jsonAxiliar
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
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_7.ftl");
            return aux.getContents();
        };

        const getJsonData = (transactions, params) => {
            try {
                var arrayGeneral = new Array();
                var arraySecundario = new Array();
                var VAnVIENE = new Array();
                let totalMonto = 0;
                var cantidadLinea = 0;
                var montoviene = 0;
                var cantidadFor = 0;
                var cantidadAnterio = 0;
                for (var i = 0; i < transactions.length; i++) {
                    var resultado1 = divisionRedondeoArriba(transactions[i].c7_desc_existencia.length, 65);
                    cantidadLinea = cantidadLinea + resultado1 + 1;
                    if (cantidadLinea <= 25) {
                        montoviene = Number(montoviene) + Number(transactions[i].c12_costo_total);
                        arraySecundario.push(
                            transactions[i]
                        );
                    } else {
        
                        arrayGeneral.push(arraySecundario)
                        VAnVIENE.push(numberWithCommas(montoviene.toFixed(2)));
        
                        arraySecundario = [];
                        cantidadLinea = 0;
                        cantidadLinea = cantidadLinea + resultado1 + 1;
                        montoviene = Number(montoviene) + Number(transactions[i].c12_costo_total);
                    }
                    totalMonto = totalMonto + Number(transactions[i].c12_costo_total);
        
                }
                log.debug('totalMonto1', totalMonto);
                totalMonto =  roundTwoDecimal(totalMonto) == 0 ? '0.00' : roundTwoDecimal(totalMonto);
                log.debug('totalMonto2', totalMonto);
                var AgregarelVAN = '';
                arrayGeneral = setSpecialChars(arrayGeneral);
                for (var i = 0; i < arrayGeneral.length; i++) {
                    AgregarelVAN += '<table style="font-family: Verdana, Arial, Helvetica, sans-serif; width:100%" >';
                    AgregarelVAN += '<thead>';
                    AgregarelVAN += ' <tr>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">CÓDIGO DE EXISTENCIA</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">TIPO DE EXISTENCIA</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">DESCRIPCIÓN</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">UNIDAD DE MEDIDA</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">CANTIDAD</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">COSTO UNITARIO</td>';
                    AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">COSTO TOTAL</td>';
                    AgregarelVAN += '</tr>';
                    AgregarelVAN += '</thead>';
                    AgregarelVAN += '<tbody>';
                    if (i != 0) {
                        AgregarelVAN += '<tr>';
                        AgregarelVAN += '<td align = "center"></td>';
                        AgregarelVAN += '<td align = "center"></td>';
                        AgregarelVAN += '<td align = "left"></td>';
                        AgregarelVAN += '<td align = "left"></td>';
                        AgregarelVAN += '<td align = "center">VIENE</td>';
                        AgregarelVAN += '<td align = "right"></td>';
                        AgregarelVAN += '<td align = "right">' + VAnVIENE[i - 1] + '</td>';
                        AgregarelVAN += '</tr>';
                    }
                    for (var k = 0; k < arrayGeneral[i].length; k++) {
                        AgregarelVAN += '<tr>';
                        AgregarelVAN += '<td align = "center">' + arrayGeneral[i][k].c2_cod_catalogo + '</td>';
                        AgregarelVAN += '<td align = "center">' + arrayGeneral[i][k].c3_tipo_existencia + '</td>';
                        AgregarelVAN += '<td align = "left"><p style="width:300px;margin-top: 0;margin-bottom: 0;hyphens: auto;word-wrap: break-word;word-break: break-all;"> ' + setSpecialChars(arrayGeneral[i][k].c7_desc_existencia) + '</p></td>';
                    AgregarelVAN += '<td align = "left">' + arrayGeneral[i][k].c8_cod_unid_meddida_existencia + '</td>';
                    let cantidad1 = arrayGeneral[i][k].c10_cant_existencia;
                    cantidad1 = parseFloat(cantidad1).toFixed(2);
                    cantidad1 = numberWithCommas(cantidad1);
                    AgregarelVAN += '<td align = "center">' + cantidad1 + '</td>';
                    let costoUnitario1 = arrayGeneral[i][k].c11_costo_unitario_existencia;
                    costoUnitario1 = parseFloat(costoUnitario1).toFixed(2);
                    costoUnitario1 = numberWithCommas(costoUnitario1);
                    AgregarelVAN += '<td align = "right">' + costoUnitario1 + '</td>';
                    let costoTotal1 = arrayGeneral[i][k].c12_costo_total;
                    costoTotal1 = parseFloat(costoTotal1).toFixed(2);
                    costoTotal1 = numberWithCommas(costoTotal1);
                        AgregarelVAN += '<td align = "right">' + costoTotal1 + '</td>';
                        AgregarelVAN += '</tr>';
                    }
                    AgregarelVAN += '<tr>';
                    AgregarelVAN += '<td align = "center"></td>';
                    AgregarelVAN += '<td align = "center"></td>';
                    AgregarelVAN += '<td align = "left"></td>';
                    AgregarelVAN += '<td align = "left"></td>';
                    AgregarelVAN += '<td align = "center">VAN</td>';
                    AgregarelVAN += '<td align = "right"></td>';
                    AgregarelVAN += '<td align = "right">' + VAnVIENE[i] + '</td>';
                    AgregarelVAN += '</tr>';
                    AgregarelVAN += '</tbody>';
                    AgregarelVAN += '</table>';
                    AgregarelVAN += '<div style="page-break-before: always;"></div>';
        
                }
                AgregarelVAN += '<table style="font-family: Verdana, Arial, Helvetica, sans-serif; width:100%" >';
                AgregarelVAN += '<thead>';
                AgregarelVAN += ' <tr>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">CÓDIGO DE EXISTENCIA</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">TIPO DE EXISTENCIA</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">DESCRIPCIÓN</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">UNIDAD DE MEDIDA</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">CANTIDAD</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">COSTO UNITARIO</td>';
                AgregarelVAN += '<td align = "center" style= "border: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">COSTO TOTAL</td>';
                AgregarelVAN += '</tr>';
                AgregarelVAN += '</thead>';
                AgregarelVAN += '<tbody>';
        
                if (i != 0){
                    AgregarelVAN += '<tr>';
                    AgregarelVAN += '<td align = "center"></td>';
                    AgregarelVAN += '<td align = "center"></td>';
                    AgregarelVAN += '<td align = "left"></td>';
                    AgregarelVAN += '<td align = "left"></td>';
                    AgregarelVAN += '<td align = "center">VIENE</td>';
                    AgregarelVAN += '<td align = "right"></td>';
                    AgregarelVAN += '<td align = "right">' + VAnVIENE[VAnVIENE.length - 1] + '</td>';
                    AgregarelVAN += '</tr>';
                }
                
                for (var k = 0; k < arraySecundario.length; k++) {
                    AgregarelVAN += '<tr>';
                    AgregarelVAN += '<td align = "center">' + arraySecundario[k].c2_cod_catalogo + '</td>';
                    AgregarelVAN += '<td align = "center">' + arraySecundario[k].c3_tipo_existencia + '</td>';
                    AgregarelVAN += '<td align = "left"><p style="width:300px;margin-top: 0;margin-bottom: 0;hyphens: auto;word-wrap: break-word;word-break: break-all;"> ' + arraySecundario[k].c7_desc_existencia + '</p></td>';
                AgregarelVAN += '<td align = "left">' + arraySecundario[k].c8_cod_unid_meddida_existencia + '</td>';
                let cantidad = numberWithCommas(parseFloat(arraySecundario[k].c10_cant_existencia).toFixed(2));
                AgregarelVAN += '<td align = "center">' + cantidad+ '</td>';
                let costoUnitario = numberWithCommas(parseFloat(arraySecundario[k].c11_costo_unitario_existencia).toFixed(2));
                AgregarelVAN += '<td align = "right">' + costoUnitario + '</td>';
                let costoTotal = numberWithCommas(parseFloat(arraySecundario[k].c12_costo_total).toFixed(2));
                    AgregarelVAN += '<td align = "right">' + costoTotal + '</td>';
                    AgregarelVAN += '</tr>';
                }
                AgregarelVAN += '<tr>';
                AgregarelVAN += '<td  align="center" style="border-top:1px solid black"></td>';
                AgregarelVAN += '<td align="center" style="border-top:1px solid black"></td>';
                AgregarelVAN += '<td  align="center" style="border-top:1px solid black"></td>';
                AgregarelVAN += '<td  align="center" style="border-top:1px solid black"></td>';
                AgregarelVAN += '<td  align="center" style="border-top:1px solid black"></td>';
                AgregarelVAN += ' <td  align="center" style="border:1px solid black; font-weight:bold;font-size: 11px;">SALDO TOTAL</td>';
                AgregarelVAN += '<td  align="right" style="border:1px solid black; font-weight:bold;font-size: 11px;">' + totalMonto  + '</td>';
                AgregarelVAN += '</tr>';
        
                AgregarelVAN += '</tbody>';
                AgregarelVAN += '</table>';
                log.debug('AgregarelVAN', AgregarelVAN);
                let jsonAxiliar = {
                    "cabecera": {
                        "Anio": params.filterAnioPeriod,
                        "ruc": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        "razonSocial": 'asdasd',//getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
                        "metodo": "1 Promedio Ponderado"
                    },
                    "AgregarelVAN": AgregarelVAN
                };        
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

        function divisionRedondeoArriba(dividendo, divisor) {
            if (divisor === 0) {
                throw new Error("El divisor no puede ser cero.");
            }
    
            var resultado = dividendo / divisor;
            var enteroResultado = parseInt(resultado); // Obtén la parte entera
    
            if (resultado > 0 && resultado !== enteroResultado) {
                return enteroResultado + 1;
            } else if (resultado < 0 && resultado !== enteroResultado) {
                return enteroResultado; // Si el resultado es negativo, no se redondea hacia arriba
            } else {
                return enteroResultado; // Si no hay fracción decimal, no se redondea
            }
        }

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
    
        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }

        return { execute }

    });
