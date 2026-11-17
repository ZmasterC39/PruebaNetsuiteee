/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format"],

    (search, record, runtime, log, file, task, config, format) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext 
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_pe_ss_comprobante_retencion';
        const DEPLOYMENT_ID = 'customdeploy_pe_ss_comprobante_retencion';
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
                const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                const searchId = 'customsearch_pe_reporte_comprobantes_ret';//ID de mi Búsqueda guardada
                var logrecodId = 'customrecord_pe_generation_logs';
                let fedIdNumb = '';
                let hasinfo = 0;

                const params = getParams(parametros);
                log.debug('params', params);

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
                    const structuregbody = structureBody(searchbook.content);
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
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Reporte de Retenciones' });
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
    
            // log.debug('MSK', 'subsidiary = '+subsidiary)
            // log.debug('MSK', 'featureSubsidiary = '+featureSubsidiary)
            let ruc_subsidiaria = getRUC(subsidiary)
            // log.debug('MSK', 'ruc_subsidiaria = '+ruc_subsidiaria)
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
                log.debug('Count', searchResultCount)//
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let arreglo = new Array();
                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column09 = result.getValue(searchLoad.columns[8]);//Factura
                            const column10 = result.getValue(searchLoad.columns[9]);
                            const column12 = result.getValue(searchLoad.columns[11]);//Total de la transacción
                            const column13 = result.getValue(searchLoad.columns[12]);//Fecha Factura
    
                            json.push({
                                ruc: ruc_subsidiaria,
                                ret_serie: column01.split('-')[0],
                                ret_correlativo: column01.split('-')[1],
                                ret_fecha: column03,
                                ret_monto: Math.abs(parseFloat(column12)).toFixed(2),
                                ref_tipo: column09.split('-')[0]=="FA"?"01":column09.split('-')[0]=="NC"?"07":column09.split('-')[0]=="ND"?"08":"01",
                                ref_serie: column09.split('-')[1],
                                ref_numero: column09.split('-')[2],
                                ref_fecha: column13,
                                ref_valor: Number(column10).toFixed(2)
                            });
                            return true;
                        });
    
                        log.debug('Json', json);//
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
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column09 = result.getValue(searchLoad.columns[8]);//Factura
                                const column10 = result.getValue(searchLoad.columns[9]);
                                const column12 = result.getValue(searchLoad.columns[11]);//Total de la transacción
                                const column13 = result.getValue(searchLoad.columns[12]);//Fecha Factura
    
                                json.push({
                                    ruc: ruc_subsidiaria,
                                    ret_serie: (column01!=""?column01.split('-')[0]:""),
                                    ret_correlativo: (column01!=""?column01.split('-')[1]:""),
                                    ret_fecha: column03,
                                    ret_monto: Math.abs(parseFloat(column12)).toFixed(2),
                                    ref_tipo: column09.split('-')[0]=="FA"?"01":column09.split('-')[0]=="NC"?"07":column09.split('-')[0]=="ND"?"08":"01",
                                    ref_serie: column09.split('-')[1],
                                    ref_numero: column09.split('-')[2],
                                    ref_fecha: column13,
                                    ref_valor: Number(column10).toFixed(2)
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
                        contentReport + 
                        searchResult[i].ruc + '|' + 
                        searchResult[i].ret_serie + '|' + 
                        searchResult[i].ret_correlativo + '|' + 
                        searchResult[i].ret_fecha + '|' + 
                        searchResult[i].ret_monto + '|' + 
                        searchResult[i].ref_tipo + '|' + 
                        searchResult[i].ref_serie + '|' + 
                        searchResult[i].ref_numero + '|' + 
                        searchResult[i].ref_fecha + '|' + 
                        searchResult[i].ref_valor
                        // + '|' 
                        // +
                        // searchResult[i].c4_fecha + '|' + searchResult[i].c5_cuenta_contable + '|' + searchResult[i].c6_descripcion + '|' +
                        // searchResult[i].c7_suma_valor_contable + '|' + searchResult[i].c8_estado_operacion + '|' + searchResult[i].c9_ind_estado_operacion + '|' +
                        // searchResult[i].c10_anio 
                        + '|\n';
                }
    
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }
    
        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId) => {
            let typeformat;
            const header = 'N° DE RUC AGENTE DE RETENCION|SERIE|NUMERO|F. EMISIÓN|MONTO|TIPO|SERIE |NUMERO|F.EMISIÓN|VALORTOTAL|\n'
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
    
                // log.debug('MSK', 'periodname = '+periodname)
                log.debug('MSK', 'periodostring = '+periodostring)
    
                const PDT = '0626'
                const RUC = fedIdNumb
                const PERIODO = periodostring
                const PREFIJO = 'R'
                let nameReportGenerated = PDT+RUC+PERIODO+PREFIJO
                if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else {
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
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
                valorMes = valorMes.toLowerCase()
                if (valorMes.indexOf('jan') >= 0 || valorMes.indexOf('ene') >= 0) {
                    valorMes = '01';
                } else {
                    if (valorMes.indexOf('feb') >= 0) {
                        valorMes = '02';
                    } else {
                        if (valorMes.indexOf('mar') >= 0) {
                            valorMes = '03';
                        } else {
                            if (valorMes.indexOf('abr') >= 0 || valorMes.indexOf('apr') >= 0) {
                                valorMes = '04';
                            } else {
                                if (valorMes.indexOf('may') >= 0) {
                                    valorMes = '05';
                                } else {
                                    if (valorMes.indexOf('jun') >= 0) {
                                        valorMes = '06';
                                    } else {
                                        if (valorMes.indexOf('jul') >= 0) {
                                            valorMes = '07';
                                        } else {
                                            if (valorMes.indexOf('aug') >= 0 || valorMes.indexOf('ago') >= 0) {
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
                campoRegistro01 = valorAnio + valorMes;
            }
            return campoRegistro01;
        }
 
        return { execute }

    });