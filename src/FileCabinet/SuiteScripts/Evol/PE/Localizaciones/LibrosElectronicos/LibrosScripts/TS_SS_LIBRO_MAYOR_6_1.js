/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", 'N/render'],

    (search, record, runtime, log, file, task, config, format, render) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_libro_mayor_6_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_libro_mayor_6_1';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT; 

        var companyName = '';
        var companyRuc = '';
        var companyLogo = '';
        var companyDV = '';
        var hasInfo = "";
        var year = "";
        var month = "";
        var featureSubsidiary = null;
        const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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
                featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                const params = getParams(parametros);
                getSubdiary(params.filterSubsidiary);
                getPeriod(params.filterPostingPeriod);
                //
                const searchId = 'customsearch_pe_libro_mayor_6_1';
                var logrecodId = 'customrecord_pe_generation_logs';
                let fedIdNumb = '';
                let hasinfo = 0;
                
                log.debug('params',params);

                let param_update_cola = {
                    idCola: parametros.idCola,
                    estado: 'PROCESANDO'
                };

                if (featureSubsidiary) {
                    const getruc = getRUC(params.filterSubsidiary)
                    fedIdNumb = getruc;
                } else {
                    const employerid = getEmployerID();
                    fedIdNumb = employerid;
                }

                //var createrecord = createRecord(logrecodId, featureSubsidiary, params.filterSubsidiary, params.filterPostingPeriod);
                const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);

                if (searchbook.thereisinfo == 1) {
                    hasinfo = '1';
                    const structuregbody = searchbook.content;//structureBody(searchbook.content);
                    const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, parametros.idCola, params.filterFormat, structuregbody, params.fileCabinetId);
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
                    //const statusProcess = setRecord(createrecord.irecord, createrecord.recordlogid, createfile, logrecodId);
                    //log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' });
                } else {
                    param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'FINALIZADO',
                        fechaFin: new Date(),
                        mensaje: 'No hay registros'
                    };
                    //setVoid(createrecord.irecord, logrecodId, createrecord.recordlogid);
                    //log.debug({ title: 'FinalResponse', details: 'No hay registros para la solicitud: ' + createrecord.recordlogid });
                }
                updateCola(param_update_cola);
                log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + param_update_cola.estado });
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
                    idCola: parametros.idCola
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
    
    
        const createRecord = (logrecodId, featureSubsidiary, filterSubsidiary, filterPostingPeriod) => {
            try {
                const recordlog = record.create({ type: logrecodId });
                if (featureSubsidiary) {
                    recordlog.setValue({ fieldId: 'custrecord_pe_subsidiary_log', value: filterSubsidiary });
                }
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: filterPostingPeriod });
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Libro Mayor 6.1' });
                const recordlogid = recordlog.save();
    
                return { recordlogid: recordlogid, irecord: record };
            } catch (e) {
                log.error({ title: 'createRecord', details: e });
            }
        }
    
        const searchBook = (subsidiary, period, searchId, featureSubsidiary) => {
            let json = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            let flag = ''
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
                //log.debug('Count', searchResultCount)
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let arreglo = new Array();
                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            const column06 = result.getValue(searchLoad.columns[5]);
                            const column07 = result.getValue(searchLoad.columns[6]);
                            let column08 = result.getValue(searchLoad.columns[7]);
                            if (column08 == '00') {
                                column08 = ''
                            }
                            const column09 = result.getValue(searchLoad.columns[8]);
                            const column10 = result.getValue(searchLoad.columns[9]);
                            const column11 = result.getValue(searchLoad.columns[10]);
                            const column12 = result.getValue(searchLoad.columns[11]);
                            const column13 = result.getValue(searchLoad.columns[12]);
                            const column14 = result.getValue(searchLoad.columns[13]);
                            const column15 = result.getValue(searchLoad.columns[14]);
                            let column16 = result.getValue(searchLoad.columns[15]);
                            column16 = column16.replace(/(\r\n|\n|\r)/gm, "");
                            column16 = column16.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "");
                            const column17 = result.getValue(searchLoad.columns[16]);
                            let column18 = result.getValue(searchLoad.columns[17]);
                            column18 = parseFloat(column18).toFixed(2);
                            if (column18 <= 0) {
                                column18 = '0.00';
                            }
                            let column19 = result.getValue(searchLoad.columns[18]);
                            column19 = parseFloat(column19).toFixed(2);
                            if (column19 <= 0) {
                                column19 = '0.00';
                            }
                            var column20 = result.getValue(searchLoad.columns[19]);
                            const column20_1 = result.getValue(searchLoad.columns[20]);
                            const column20_2 = result.getValue(searchLoad.columns[21]);
                            const column20_3 = result.getValue(searchLoad.columns[22]);
    
                            if (column20 != '' && column20_1 != '' && column20_2 != '' && column20_3 != '') {
                                column20 = column20 + '&' + column20_1 + '&' + column20_2 + '&' + column20_3;
                                // arreglo.push(column20_1, column20_2, column20_3);
                                // for (let i = 0; i < arreglo.length; i++) {
                                //     column20 += '&' + arreglo[i];
                                // }
                            } else {
                                column20 = '';
                            }
    
                            const column21 = result.getValue(searchLoad.columns[23]);
                            // const column22 = result.getValue(searchLoad.columns[25]);
                            // const column22 = result.getValue(searchLoad.columns[26]);
                            // const column23 = result.getValue(searchLoad.columns[27]);
                            // const column24 = result.getValue(searchLoad.columns[28]);
                            // const column25 = result.getValue(searchLoad.columns[29]);
    
                            json.push({
                                c1_periodo: column01,
                                c2_cuo: column02,
                                c3_nro_correlativo_asiento: column03,
                                c4_cod_cuenta_contable: column04,
                                c5_cod_unidad_op: column05,
                                c6_centro_costo: column06,
                                c7_tipo_moneda: column07,
                                c8_tipo_doc_entidad_emi: column08,
                                c9_nro_doc_entidad_emi: column09,
                                c10_tipo_comprobante: column10,
                                c11_nro_serie_comprobante: column11,
                                c12_nro_comprobante_pago: column12,
                                c13_fecha_contable: column13,
                                c14_fecha_vencimiento: column14,
                                c15_fecha_op_emision: column15,
                                c16_glosa_des_natu_op_reg: column16,
                                c17_glosa_ref_caso: column17,
                                c18_mov_debe: column18,
                                c19_mov_haber: column19,
                                c20_cod_libro: column20,
                                c20_1: column20_1,
                                c21_20_1_campo1: column21
                                // c22_20_2_campo2: column22,
                                // c23_20_3_campo3: column23,
                                // c24_account: column24,
                                // c25_21_estado_op: column25
                            });
                            return true;
                        });
    
                        //log.debug('Json', json);
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
                                let arreglo = new Array();
                                const column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                const column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                const column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                const column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                const column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                const column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                const column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                const column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                const column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                const column15 = searchResult[j].getValue(searchLoad.columns[14]);
                                let column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                column16 = column16.replace(/(\r\n|\n|\r)/gm, "");
                                column16 = column16.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "");
                                const column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                let column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                column18 = parseFloat(column18).toFixed(2);
                                if (column18 <= 0) {
                                    column18 = '0.00';
                                }
                                let column19 = searchResult[j].getValue(searchLoad.columns[18]);
                                column19 = parseFloat(column19).toFixed(2);
                                if (column19 <= 0) {
                                    column19 = '0.00';
                                }
                                var column20 = searchResult[j].getValue(searchLoad.columns[19]);
                                const column20_1 = searchResult[j].getValue(searchLoad.columns[20]);
                                const column20_2 = searchResult[j].getValue(searchLoad.columns[21]);
                                const column20_3 = searchResult[j].getValue(searchLoad.columns[22]);
    
                                if (column20 != '' && column20_1 != '' && column20_2 != '' && column20_3 != '') {
                                    column20 = column20 + '&' + column20_1 + '&' + column20_2 + '&' + column20_3;
                                    // arreglo.push(column20_1, column20_2, column20_3);
                                    // for (let i = 0; i < arreglo.length; i++) {
                                    //     column20 += '&' + arreglo[i];
                                    // }
                                } else {
                                    column20 = '';
                                }
    
                                const column21 = searchResult[j].getValue(searchLoad.columns[23]);
                                // const column22 = result.getValue(searchLoad.columns[25]);
                                // const column22 = result.getValue(searchLoad.columns[26]);
                                // const column23 = result.getValue(searchLoad.columns[27]);
                                // const column24 = result.getValue(searchLoad.columns[28]);
                                // const column25 = result.getValue(searchLoad.columns[29]);
    
                                json.push({
                                    c1_periodo: column01,
                                    c2_cuo: column02,
                                    c3_nro_correlativo_asiento: column03,
                                    c4_cod_cuenta_contable: column04,
                                    c5_cod_unidad_op: column05,
                                    c6_centro_costo: column06,
                                    c7_tipo_moneda: column07,
                                    c8_tipo_doc_entidad_emi: column08,
                                    c9_nro_doc_entidad_emi: column09,
                                    c10_tipo_comprobante: column10,
                                    c11_nro_serie_comprobante: column11,
                                    c12_nro_comprobante_pago: column12,
                                    c13_fecha_contable: column13,
                                    c14_fecha_vencimiento: column14,
                                    c15_fecha_op_emision: column15,
                                    c16_glosa_des_natu_op_reg: column16,
                                    c17_glosa_ref_caso: column17,
                                    c18_mov_debe: column18,
                                    c19_mov_haber: column19,
                                    c20_cod_libro: column20,
                                    c20_1: column20_1,
                                    c21_20_1_campo1: column21
                                    // c22_20_2_campo2: column22,
                                    // c23_20_3_campo3: column23,
                                    // c24_account: column24,
                                    // c25_21_estado_op: column25
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
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_nro_correlativo_asiento + '|' +
                        searchResult[i].c4_cod_cuenta_contable + '|' + searchResult[i].c5_cod_unidad_op + '|' + searchResult[i].c6_centro_costo + '|' +
                        searchResult[i].c7_tipo_moneda + '|' + searchResult[i].c8_tipo_doc_entidad_emi + '|' + searchResult[i].c9_nro_doc_entidad_emi + '|' +
                        searchResult[i].c10_tipo_comprobante + '|' + searchResult[i].c11_nro_serie_comprobante + '|' + searchResult[i].c12_nro_comprobante_pago + '|' +
                        searchResult[i].c13_fecha_contable + '|' + searchResult[i].c14_fecha_vencimiento + '|' + searchResult[i].c15_fecha_op_emision + '|' +
                        searchResult[i].c16_glosa_des_natu_op_reg + '|' + searchResult[i].c17_glosa_ref_caso + '|' + searchResult[i].c18_mov_debe + '|' +
                        searchResult[i].c19_mov_haber + '|' + searchResult[i].c20_cod_libro + '|' + searchResult[i].c21_20_1_campo1 + '|\n';
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }
    
    
        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId) => {
            let typeformat;
            const header = '1 Periodo|2 CUO|3 Número correlativo del asiento|4 Código de la cuenta contable|5 Código de Unidad de Operación|6 Centro de Costo|7 Tipo de Moneda de Origen|8 Tipo de documento de identidad del emisor' +
                '|9 Número de documento de identidad del emisor|10 Tipo de Comprobante|11 Número de Serie del comprobante de Pago|12 Número de compronbante de pago|13 Fecha Contable|14 Fecha de Vencimiento|15 Fecha de la operación o emisión|Glosa referencial' +
                '|16 Glosa o descripción de la naturaleza de la operación registrada de ser el caso|17 Glosa referencial, de ser el caso|18 Movimientos del Debe|19 Movimiento del Haber|20 Cod Libro|20.1 Campo 1|20.2 Campo 2|20.3 Campo 3|Account|21 Indica el estado de la operación|\n';
            var structuregbody_ = structureBody(structuregbody);
            var jsonAxiliar;
            var fileId = null;
            try {
                
                var perLookup = search.lookupFields({
                     type: search.Type.ACCOUNTING_PERIOD,
                     id: filterPostingPeriod,
                     columns: ['periodname','startdate']
                 });
                 
                 var periodoFinDate = format.parse({
                    type: format.Type.DATE,
                    value: perLookup.startdate
                });
                const periodostring  = periodoFinDate.getFullYear() + CompletarCero(2,periodoFinDate.getMonth() + 1) + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);
                
                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '060100' + '00' + '1' + hasinfo + '11';
                if (filterFormat == 'PDF') {
                    jsonAxiliar = getJsonData(structuregbody, filterPostingPeriod);
                    log.debug('jsonAxiliar', jsonAxiliar);
                    var renderer = render.create();
                    renderer.templateContent = getTemplate();
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: "input",
                        data: {
                            data: JSON.stringify(jsonAxiliar)
                        }
                    });
                    stringXML = renderer.renderAsPdf();
                    fileId = saveFile(stringXML, recordlogid);
                    log.debug('Termino');
                    return fileId;
                } else if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody_ = header + structuregbody_;
                    structuregbody_ = structuregbody_.replace(/[,]/gi, ' ');
                    structuregbody_ = structuregbody_.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (filterFormat == 'TXT') {
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                }
                const fileObj = file.create({
                    name: nameReportGenerated,
                    fileType: typeformat,
                    contents: structuregbody_,
                    encoding: file.Encoding.UTF8,
                    folder: fileCabinetId,
                    isOnline: true
                });
                fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
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
    
    
        const setVoid = (irecord, logrecodId, recordlogid) => {
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
    
        function CompletarCero(tamano, valor) {
            var strValor = valor + '';
            var lengthStrValor = strValor.length;
            var nuevoValor = valor + '';
    
            if (lengthStrValor <= tamano) {
                if (tamano != lengthStrValor) {
                    for (var i = lengthStrValor; i < tamano; i++){
                        nuevoValor = '0' + nuevoValor;
                    }
                }
                return nuevoValor;
            } else {
                return nuevoValor.substring(0,tamano);
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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_MAYOR_6_1.ftl");
            return aux.getContents();
        }

        const getFileName = (recordlogid) => {
            return `LE${companyRuc}${year}${month}00060100001${hasInfo}11_${recordlogid}.pdf`;
        }

        const getJsonData = (transactions, filterPostingPeriod) => {
            log.debug('YWH', transactions);
            let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = {},
                movDebe = 0,
                movHaber = 0;
    
            var employeeName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: useID,
                columns: ['firstname', 'lastname']
            });
    
            for (let k in transactions) {
                let dato_movDebe = parseFloat(transactions[k].c18_mov_debe);
                let dato_movHaber = parseFloat(transactions[k].c19_mov_haber);
    
                let IDD = transactions[k].c2_cuo;
                jsonTransacion[IDD] = {
                    periodoContable: transactions[k].c1_periodo,
                    cuo: transactions[k].c2_cuo,
                    numAsiento: transactions[k].c3_nro_correlativo_asiento,
                    codCuenta: transactions[k].c4_cod_cuenta_contable,
                    codOp: transactions[k].c5_cod_unidad_op,
                    ceco: transactions[k].c6_centro_costo,
                    tipoMoneda: transactions[k].c7_tipo_moneda,
                    tipoDocIdentidad: transactions[k].c8_tipo_doc_entidad_emi,
                    numDocIdentidad: transactions[k].c9_nro_doc_entidad_emi,
                    tipoComprob: transactions[k].c10_tipo_comprobante,
                    serieComprob: transactions[k].c11_nro_serie_comprobante,
                    comprobPago: transactions[k].c12_nro_comprobante_pago,
                    fecha: transactions[k].c13_fecha_contable,
                    dueDate: transactions[k].c14_fecha_vencimiento,
                    fechaOp: transactions[k].c15_fecha_op_emision,
                    glosaDesc: transactions[k].c16_glosa_des_natu_op_reg,
                    glosaRef: transactions[k].c17_glosa_ref_caso,
                    movDebe: numberWithCommas(roundTwoDecimals(Number(transactions[k].c18_mov_debe)).toFixed(2)),
                    movHaber: numberWithCommas(roundTwoDecimals(Number(transactions[k].c19_mov_haber)).toFixed(2)),
                    codLibro: transactions[k].c20_cod_libro,
                    codLibro2: transactions[k].c20_1,
                    estadoOp: transactions[k].c21_20_1_campo1
                }
                movDebe += dato_movDebe;
                movHaber += dato_movHaber;
            }
    
            let periodSearch = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: filterPostingPeriod,
                columns: ['periodname', "startdate"]
            });
            let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
            let year = periodSearch.startdate.split("/")[2];
            movDebe = parseFloat(movDebe)
            movHaber = parseFloat(movHaber)
    
            var jsonAxiliar = {
                "company": {
                    "firtsTitle": 'FORMATO 6.1: INVT. PERMANENTE',
                    "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                    "thirdTitle": companyRuc.replace(/&/g, '&amp;'),
                    "fourthTitle": companyName.replace(/&/g, '&amp;').toLocaleUpperCase(),
                },
                "total": {
                    "movDebe": movDebe,
                    "movHaber": movHaber,
                },
                "movements": jsonTransacion
            };
            return jsonAxiliar;
        }

        const saveFile = (stringValue, recordlogid) => {
            var fileAuxliar = stringValue;
            var urlfile = '';
    
            nameReport = getFileName(recordlogid);
    
            var folderID = getFolderId();
    
            fileAuxliar.name = nameReport;
            fileAuxliar.folder = folderID;
    
            var fileID = fileAuxliar.save();

            return fileID;/*
    
            let auxFile = file.load({ id: fileID });
            urlfile += auxFile.url;
            libPe.loadLog(pGloblas.pRecordID, nameReport, urlfile)*/
    
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

        function getFolderId() {
            var carpeta = 'LibrosScripts';
            //var descCarpeta = 'PDFSAVE';
            try {
                var resultSet = search.create({
                    type: 'folder',                
                    filters: [
                        ['name', 'is', carpeta]/*,
                        'AND',
                        ['description', 'is', descCarpeta]*/
                    ],
                    columns: ['internalid']
                });
                var objResult = resultSet.run().getRange(0, 50);
                return objResult[0].getValue('internalid');            
            } catch (error) {
                log.debug('FOLDER', 'No existe la carpeta <<' + carpeta + '>>');// o no tiene la descripción <<' + descCarpeta + '>>.');
                return 0;
            }
        }

        const getSubdiary = (filterSubsidiary) => {
        
            if (featureSubsidiary) {
                var dataSubsidiary = record.load({
                    type: 'subsidiary',
                    id: filterSubsidiary
                });
                companyName = dataSubsidiary.getValue('legalname');
                companyRuc = dataSubsidiary.getValue('federalidnumber');
            } else {
                companyName = config.getFieldValue('legalname');
                companyRuc = ''
            }
        }

        const getPeriod = (filterPostingPeriod) => {
            var periodRecord = search.lookupFields({
                type: "accountingperiod",
                id: filterPostingPeriod,
                columns: ["startdate"]
            });
            var firstDate = format.parse({
                value: periodRecord.startdate,
                type: format.Type.DATE
            });
            month = firstDate.getMonth() + 1;
            month = month < 10 ? `0${month}` : month;
            year = firstDate.getFullYear();
        }
 
        return { execute }

    });