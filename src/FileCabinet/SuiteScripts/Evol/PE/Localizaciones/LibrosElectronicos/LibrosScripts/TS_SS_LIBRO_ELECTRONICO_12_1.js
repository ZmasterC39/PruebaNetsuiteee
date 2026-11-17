/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render"],

    (search, record, runtime, log, file, task, config, format, render) => {

        /** ts_pe_ss_ple_4_1_libro_de_retenciones
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_12_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_12_1';
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
                    const searchId = 'customsearch_pe_ripv_2';
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


                    const searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);

                    let transactionJSON = getTransactions(params);

                    if (searchbook.thereisinfo == 1) {
                        hasinfo = '1';
                        const structuregbody = structureBody(searchbook.content);
                        const createfile = createFile(params.filterPostingPeriod, fedIdNumb, hasinfo, '', params.filterFormat, structuregbody, params.fileCabinetId, transactionJSON, params);

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
                            log.debug({ title: 'result', details: result });

                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            let column05 = result.getValue(searchLoad.columns[4]);
                            let auxcolumn05 = column05.replace(/\s/g, '');
                            if (auxcolumn05 == '-None-' || column05.indexOf('ERROR:') >= 0) {
                                column05 = ''
                            }
                            let column06 = result.getValue(searchLoad.columns[5]);
                            let auxcolumn06 = column06.replace(/\s/g, '');
                            if (auxcolumn06 == '-None-') {
                                column06 = ''
                            }
                            const column07 = result.getValue(searchLoad.columns[6]);
                            let column08 = result.getValue(searchLoad.columns[7]);
                            let auxcolumn08 = column08.replace(/\s/g, '');
                            if (auxcolumn08 == '-None-') {
                                column08 = ''
                            }
                            let column09 = result.getValue(searchLoad.columns[8]);
                            let auxcolumn09 = column09.replace(/\s/g, '');
                            if (auxcolumn09 == '-None-') {
                                column09 = ''
                            }
                            let column10 = result.getValue(searchLoad.columns[9]);
                            column10 = convertDateFormat(column10);
                            const column11 = result.getValue(searchLoad.columns[10]);
                            const column12 = result.getValue(searchLoad.columns[11]);

                            let column13 = result.getValue(searchLoad.columns[12]);
                            column13 = parseInt(column13);
                            let column14 = result.getValue(searchLoad.columns[13]);
                            let auxcolumn14 = column14.replace(/\s/g, '');
                            if (auxcolumn14 == '-None-' || column14.indexOf('ERROR:') >= 0) {
                                column14 = ''
                            }
                            let column15 = result.getValue(searchLoad.columns[14]);
                            let auxcolumn15 = column15.replace(/\s/g, '');
                            if (auxcolumn15 == '-None-' || auxcolumn15.indexOf('ERROR:') >= 0) {
                                column15 = ''
                            }
                            let column16 = result.getValue(searchLoad.columns[15]);
                            let auxcolumn16 = column16.replace(/\s/g, '');
                            if (auxcolumn16 == '-None-' || auxcolumn16.indexOf('ERROR:') >= 0) {
                                column16 = ''
                            }
                            let column17 = result.getValue(searchLoad.columns[16]);
                            if (column17 == '0') {
                                column17 = '0.00'
                            }
                            let column18 = result.getValue(searchLoad.columns[17]);
                            if (column18 == '0') {
                                column18 = '0.00'
                            }
                            let column19 = result.getValue(searchLoad.columns[18]);
                            if (column19 == '0') {
                                column19 = '0.00'
                            }


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
                                c19_mov_haber: column19
                            });
                            return true;
                        });
                        return { thereisinfo: 1, content: json };
                    } else {
                        log.error('entro 2','entro 2')
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
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                let column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                let auxcolumn05 = column05.replace(/\s/g, '');
                                if (auxcolumn05 == '-None-' || column05.indexOf('ERROR:') >= 0) {
                                    column05 = ''
                                }
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                let auxcolumn06 = column06.replace(/\s/g, '');
                                if (auxcolumn06 == '-None-') {
                                    column06 = ''
                                }
                                const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                let column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                let auxcolumn08 = column08.replace(/\s/g, '');
                                if (auxcolumn08 == '-None-') {
                                    column08 = ''
                                }
                                let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                let auxcolumn09 = column09.replace(/\s/g, '');
                                if (auxcolumn09 == '-None-') {
                                    column09 = ''
                                }
                                let column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                column10 = convertDateFormat(column10);

                                const column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                if (column12 == '00') {
                                    column12 = '0'
                                }
                                const column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                let column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                let auxcolumn14 = column14.replace(/\s/g, '');
                                if (auxcolumn14 == '-None-' || auxcolumn14.indexOf('ERROR:') >= 0) {
                                    column14 = ''
                                }
                                const column15 = searchResult[j].getValue(searchLoad.columns[14]);
                                const column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                const column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                let column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                if (column18 == '0') {
                                    column18 = '0.00'
                                }
                                let column19 = searchResult[j].getValue(searchLoad.columns[18]);
                                if (column19 == '0') {
                                    column19 = '0.00'
                                }

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
                                    c19_mov_haber: column19
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
                    contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_nro_correlativo_asiento + '|' +
                    searchResult[i].c4_cod_cuenta_contable + '|' + searchResult[i].c5_cod_unidad_op + '|' + searchResult[i].c6_centro_costo + '|' +
                    searchResult[i].c7_tipo_moneda + '|' + searchResult[i].c8_tipo_doc_entidad_emi + '|' + searchResult[i].c9_nro_doc_entidad_emi + '|' +
                    searchResult[i].c10_tipo_comprobante + '|' + searchResult[i].c11_nro_serie_comprobante + '|' + searchResult[i].c12_nro_comprobante_pago + '|' +
                    searchResult[i].c13_fecha_contable + '|' + searchResult[i].c14_fecha_vencimiento + '|' + searchResult[i].c15_fecha_op_emision + '|' +
                    searchResult[i].c16_glosa_des_natu_op_reg + '|' + searchResult[i].c17_glosa_ref_caso + '|' + searchResult[i].c18_mov_debe + '|' +
                    searchResult[i].c19_mov_haber + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, transactionJSON, params) => {
            let typeformat;
            const header = '1 Periodo|2 CUO|3 Correlativo|4 Codigo del catalogo utilizado|5 Codigo del catalogo utilizado|6 Tipo de Existencia|7 Código Propio de Existencia en el campo 5|8 Codigo del catalogo utilizado' +
            '|9 Código Propio de Existencia en el campo 8|10 Fecha de Emision|11 Tipo de Documento|12 Numero de Serie del Documento|13 Numero del Documento|14 Codigo de Operación|15 Descripción de la Existencia' +
            '|16 Codigo de la unidad de medida|17 Entradas de las unidades fisicas|18 Salidas de las unidades fisicas|19 Indica el estado de la operacion|\n';
            try {

                var perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: filterPostingPeriod,
                    columns: ['periodname', 'startdate']
                });
                var periodoFinDate = format.parse({
                    type: format.Type.DATE,
                    value: perLookup.startdate
                });
                const periodostring = periodoFinDate.getFullYear() + CompletarCero(2, periodoFinDate.getMonth() + 1) + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '120100' + '00' + '1' + hasinfo + '11';
                let jsonAxiliar = getJsonData(transactionJSON,params);
                if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (filterFormat == 'TXT'){
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (filterFormat == 'PDF'){
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
                    
                    log.debug(jsonAxiliar);

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
                    log.debug(pdfFileId);

                    let auxFile = file.load({ id: pdfFileId });
                    var urlfile = auxFile.url;

                    return pdfFileId;
                }
                const fileObj = file.create({
                    name: nameReportGenerated,
                    fileType: typeformat,
                    contents: structuregbody,
                    encoding: file.Encoding.UTF8,
                    folder: fileCabinetId,
                    isOnline: true
                });
                const fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
        }

        const getTransactions = (params) => {
            var arrResult = [];
            var _cont = 0;
    
            // PE - Libro Diario 12.1
            var savedSearch = search.load({ id: 'customsearchpe_ripv_2_2' });
    
            if (params.filterSubsidiary) {
                savedSearch.filters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary
                }));
            }
    
            // savedSearch.filters.push(search.createFilter({
            //     name: 'postingperiod',
            //     operator: search.Operator.IS,
            //     values: [pGloblas.pPeriod]
            // }));
    
            // savedSearch.columns.push(search.createColumn({
            //     name: 'formulatext',
            //     formula: "{tranid}",
            // }))
    
            // savedSearch.columns.push(search.createColumn({
            //     name: 'formulatext',
            //     formula: "NVL({account.displayname},'')",
            // }))
    
            // let searchResultCount = savedSearch.runPaged().count;
            // log.debug("vendorbillSearchObj result count", searchResultCount);
    
            savedSearch.filters.push(search.createFilter({
                name: 'postingperiod',
                operator: search.Operator.IS,
                values: [params.filterPostingPeriod]
            }));
    
    
            var pagedData = savedSearch.runPaged({ pageSize: 1000 });
            var page, columns;
            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach((result) => {
                    columns = result.columns;
                    arrAux = {};
    
                    // 1. PERÍODO
                    arrAux["periodoContable"] = result.getValue(columns[0]);
    
                    // 2. CUO
                    arrAux["cuo"] = result.getValue(columns[1]);
    
                    // 3. CORRELATIVO
                    arrAux["correlativo"] = result.getValue(columns[2]);
    
                    // 4. CÓDIGO DEL CATÁLOGO UTILIZADO
                    arrAux["codigoCatalogo"] = result.getValue(columns[3]);
    
                    // 5. CÓDIGO DEL CATÁLOGO UTILIZADO 2
                    arrAux["codigoCatalogo2"] = result.getValue(columns[4]);
    
                    // 6.  TIPO DE EXISTENCIA
                    arrAux["tipoExistencia"] = result.getValue(columns[5]);
    
                    // 7. CÓDIGO PROPIO DE EXISTENCIA EN EL CAMPO 5
                    arrAux["propioExistencia"] = result.getValue(columns[6]);
    
                    // 8. CÓDIGO DEL CATÁLOGO UTILIZADO 3
                    arrAux["codigoCatalogo3"] = result.getValue(columns[7]);
    
                    // 9. CÓDIGO PROPIO DE EXISTENCIA EN EL CAMPO 8
                    arrAux["propioExistencia2"] = result.getValue(columns[8]);
    
                    // 10. FECHA DE EMISIÓN
                    arrAux["fechaEmision"] = result.getValue(columns[9]);
    
                    // 11. TIPO DE DOCUMENTO
                    arrAux["tipoDocumento"] = result.getValue(columns[10]);
    
                    // 12. NÚMERO DE SERIE DEL DOCUMENTO
                    arrAux["serieDocumento"] = result.getValue(columns[11]);
    
                    // 13. NÚMERO DEL DOCUMENTO
                    arrAux["nroDocumento"] = result.getValue(columns[12]);
    
                    // 14. CÓDIGO DE OPERACIÓN
                    arrAux["codOperacion"] = result.getValue(columns[13]);
                    //arrAux[13] = "Revisar búsqueda";
    
                    // 15. DESCRIPCIÓN DE LA EXISTENCIA
                    arrAux["descExistencia"] = result.getValue(columns[14]);
    
                    // 16. CÓDIGO DE LA UNIDAD DE MEDIDA
                    arrAux["unidMedida"] = result.getValue(columns[15]);
    
                    // 17. ENTRADAS DE LAS UNIDADES FÍSICAS TOTAL
                    arrAux["entradasUnidFisicas"] = result.getValue(columns[16]);
    
                    // 18. SALIDAS DE LAS UNIDADES FÍSICAS TOTAL
                    arrAux["salidaUnidFisicas"] = result.getValue(columns[17]);
    
                    // 19. INDICA EL ESTADO DE LA OPERACIÓN
                    arrAux["estadoOp"] = result.getValue(columns[18]);
    
                    arrResult.push(arrAux);
                });
            });
            return arrResult;
        }

        const getJsonData = (transactions,params) => {
            let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = new Array(),
                entradasUnidFisicas = 0,
                salidaUnidFisicas = 0;
    
            var employeeName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: useID,
                columns: ['firstname', 'lastname']
            });
            var userName = employeeName.firstname + ' ' + employeeName.lastname;
    
            log.debug('transactions', transactions);
    
            for (let k in transactions) {
                let dato_entradasUnidFisicas = parseFloat(transactions[k].entradasUnidFisicas);
                let dato_salidaUnidFisicas = parseFloat(transactions[k].salidaUnidFisicas);
                let IDD = transactions[k].cuo;
                aux = {
                    periodoContable: transactions[k].periodoContable,
                    cuo: transactions[k].cuo,
                    correlativo: transactions[k].correlativo,
                    codigoCatalogo: transactions[k].codigoCatalogo,
                    codigoCatalogo2: transactions[k].codigoCatalogo2,
                    tipoExistencia: transactions[k].tipoExistencia,
                    propioExistencia: transactions[k].propioExistencia,
                    codigoCatalogo3: transactions[k].codigoCatalogo3,
                    propioExistencia2: transactions[k].propioExistencia2,
                    fechaEmision: transactions[k].fechaEmision,
                    tipoDocumento: transactions[k].tipoDocumento,
                    serieDocumento: transactions[k].serieDocumento,
                    nroDocumento: transactions[k].nroDocumento,
                    codOperacion: transactions[k].codOperacion,
                    descExistencia: transactions[k].descExistencia,
                    unidMedida: transactions[k].unidMedida,
                    estadoOp: transactions[k].estadoOp,
                    entradasUnidFisicas: numberWithCommas(roundTwoDecimals(parseFloat(transactions[k].entradasUnidFisicas)).toFixed(2)),
                    salidaUnidFisicas: numberWithCommas(roundTwoDecimals(parseFloat(transactions[k].salidaUnidFisicas)).toFixed(2)),
                    saldoFinal: numberWithCommas(roundTwoDecimals(parseFloat(transactions[k].saldoFinal)).toFixed(2))
                }
                jsonTransacion.push(aux);
                entradasUnidFisicas += dato_entradasUnidFisicas;
                salidaUnidFisicas += dato_salidaUnidFisicas;
    
                hasInfo=1;
            }
    
            log.debug('jsonTransacion', jsonTransacion);
            let periodSearch = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: params.filterPostingPeriod,
                columns: ['periodname', "startdate"]
            });
            

            var dataSubsidiary = record.load({
                type: "subsidiary",
                id: params.filterSubsidiary,
              });

            let companyName = dataSubsidiary.getValue("legalname");
            let companyRuc = dataSubsidiary.getValue("federalidnumber");

            const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const months_nros = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

            let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
            let month = months_nros[Number(periodSearch.startdate.split("/")[1]) - 1];
            year = periodSearch.startdate.split("/")[2];
            entradasUnidFisicas = parseFloat(entradasUnidFisicas.toFixed(2))
            salidaUnidFisicas = parseFloat(salidaUnidFisicas.toFixed(2))
    
            var jsonAxiliar = {
                "company": {
                    "firtsTitle": 'FORMATO 12.1: INVT. PERMANENTE',
                    "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                    "thirdTitle": companyRuc.replace(/&/g, '&amp;'),
                    "fourthTitle": companyName.replace(/&/g, '&amp;').toLocaleUpperCase(),
                },
                "total":{
                    "entradasUnidFisicas": numberWithCommas(roundTwoDecimals(entradasUnidFisicas).toFixed(2)),
                    "salidaUnidFisicas": numberWithCommas(roundTwoDecimals(salidaUnidFisicas).toFixed(2))
                },
                "movements": jsonTransacion
            };
            log.debug('jsonAxiliar 1', jsonAxiliar);
            return jsonAxiliar;
        }

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_12_1.ftl");
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

        const isObjEmpty = (obj) => {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) return false;
            }
            return true;
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
