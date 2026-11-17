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

        const SCRIPT_ID = 'customscript_ts_ss_le_4_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_4_1';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

        const execute = (scriptContext) => {
            log.audit('DIAGNÓSTICO DE PERMISOS - INICIO', {
                usuario: {
                    id: runtime.getCurrentUser().id,
                    nombre: runtime.getCurrentUser().name,
                    rol: runtime.getCurrentUser().role
                },
                fecha: new Date().toISOString(),
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId
            });

            try {
                const permisosVerificados = {
                    COLA_EJECUCIONES: runtime.getCurrentUser().getPermission({
                        name: 'ADMI_CUSTOM_RECORD',
                        recordType: 'customrecord_ts_le_cola_ejecuciones'
                    }),
                    SCHEDULED_SCRIPT: runtime.getCurrentUser().getPermission({
                        name: 'ADMI_SCHEDULEDSCRIPT'
                    }),
                    FILE_CABINET: runtime.getCurrentUser().getPermission({
                        name: 'LIST_FILECABINET'
                    })
                };
                
                // Convertir niveles numéricos a texto
                const permisosTexto = {};
                for (const [key, value] of Object.entries(permisosVerificados)) {
                    let nivelTexto;
                    switch(value) {
                        case 0: nivelTexto = "NINGUNO"; break;
                        case 1: nivelTexto = "VER"; break;
                        case 2: nivelTexto = "CREAR"; break;
                        case 3: nivelTexto = "EDITAR"; break;
                        case 4: nivelTexto = "COMPLETO"; break;
                        default: nivelTexto = "DESCONOCIDO";
                    }
                    permisosTexto[key] = {
                        nivel: value,
                        descripcion: nivelTexto
                    };
                }
                
                log.audit('PERMISOS VERIFICADOS', permisosTexto);
            } catch (e) {
                log.error('ERROR AL VERIFICAR PERMISOS', e);
            }
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
                    const searchId = 'customsearch_pe_lbro_de_retenciones_4_1';
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

                    var searchbook = {};
                    if (params.filterFormat === 'PDF') {
                        searchbook = getTransactions(params);
                    } else {
                     searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId, featureSubsidiary);
                    }

                    if (searchbook.thereisinfo == 1) {
                        hasinfo = '1';
                        //const structuregbody = structureBody(searchbook.content);
                        const transactionJSON = searchbook.content;
                        const createfile = createFile(params, fedIdNumb, hasinfo, '', params.filterFormat, transactionJSON, params.fileCabinetId);

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

        const searchBook1 = (subsidiary, period, searchId, featureSubsidiary) => {
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
                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            const column06 = result.getValue(searchLoad.columns[5]);
                            const column07 = result.getValue(searchLoad.columns[6]);
                            const column08 = result.getValue(searchLoad.columns[7]);
                            let column09 = result.getValue(searchLoad.columns[8]);
                        
                            const column10 = result.getValue(searchLoad.columns[9]);
                        

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
                                c10_importe_total: column10
                                
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
                                const column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                const column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                const column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                            
                                const column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                
                                

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
                            const column01 = result.getValue(searchLoad.columns[0]);
                            const column02 = result.getValue(searchLoad.columns[1]);
                            const column03 = result.getValue(searchLoad.columns[2]);
                            const column04 = result.getValue(searchLoad.columns[3]);
                            const column05 = result.getValue(searchLoad.columns[4]);
                            const column06 = result.getValue(searchLoad.columns[5]);
                            const column07 = result.getValue(searchLoad.columns[6]);
                            let column08 = result.getValue(searchLoad.columns[7]);
                            if (column08 <= 0) {
                                column08 = '0.00'
                            }

                            let column09 = result.getValue(searchLoad.columns[8]);
                            if (column09 >= 0) {
                                column09 = '0.00'
                            }
                          
                            const column10 = result.getValue(searchLoad.columns[9]);
                           
    
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
                                c10_importe_total: column10
                                
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
                                const column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                const column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                const column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                const column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                const column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                const column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                const column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                let column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                if (column08 <= 0) {
                                    column08 = '0.00'
                                }
                                let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                if (column09 >= 0) {
                                    column09 = '0.00'
                                }
                                const column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                
                                
    
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
                    searchResult[i].c10_importe_total + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId) => {
            let typeformat;
            const header = '1 PERIODO,2 CUO,3 CORRELATIVO,4 FECHA DE EMISION DEL COMP DE PAGO O DOC,'+
                        '5 Tipo de Documento de identidad del Proveedor,'+
                        '6 Numero de RUC del Proveedor o Numero de documento de identidad,'+
                        '7 Apellidos y nombres  denominacion o razón social de proveedor,' +
                        '8 Monto Bruto,'+
                        '9 Retencion efectuada,'+
                        '10 Indicador de la Operacion'+
                        '\n';
            try {

                var perLookup = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: params.filterPostingPeriod,
                    columns: ['periodname', 'startdate']
                });
                var periodoFinDate = format.parse({
                    type: format.Type.DATE,
                    value: perLookup.startdate
                });
                const periodostring = periodoFinDate.getFullYear() + CompletarCero(2, periodoFinDate.getMonth() + 1) + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '040100' + '00' + '1' + hasinfo + '11';
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);
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
                    isOnline: true
                });
                const fileId = fileObj.save();
                return fileId;
            } catch (e) {
                log.error({ title: 'createFile', details: e });
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

        const getTransactions = (params) => {
            try {
            var arrResult = [];
            var _cont = 0;
        
            // FORMATO 4.1: LIBRO DE RETENCIONES INCISOS E) Y F) DEL ART. 34° DE LA LEY DEL IMPUESTO A LA RENTA
            var savedSearch = search.load({
              id: "customsearch_pe_libro_impreso_4_1",
            });
        
            log.debug(" pGloblas.pSubsidiary", params.filterSubsidiary);
            
              savedSearch.filters.push(
                search.createFilter({
                  name: "subsidiary",
                  operator: search.Operator.IS,
                  values: params.filterSubsidiary,
                })
              );
            
        
            savedSearch.filters.push(
              search.createFilter({
                name: "postingperiod",
                operator: search.Operator.IS,
                values: [params.filterPostingPeriod],
              })
            );
        
            //log.debug('FilterPeriod', pGloblas.pPeriod);
        
            // let searchResultCount = savedSearch.runPaged().count;
            // log.debug("vendorbillSearchObj result count", searchResultCount);
            var pagedData = savedSearch.runPaged({ pageSize: 1000 });
            var page, columns;
        
            pagedData.pageRanges.forEach(function (pageRange) {
              page = pagedData.fetch({ index: pageRange.index });
              page.data.forEach(function (result) {
                columns = result.columns;
                arrAux = new Array();
        
                // 0. N° DE DOCUMENTO DE IDENTIDAD
                arrAux[0] = result.getValue(columns[0]);
        
                // 1. APELLIDOS Y NOMBRES
                arrAux[1] = result.getValue(columns[1]);
        
                // 2. NÚMERO DE DOCUMENTO
                arrAux[2] = result.getValue(columns[2]);
        
                // 3. FECHA DE RETENCIÓN
                arrAux[3] = result.getValue(columns[3]);
        
                // 4. MONEDA
                arrAux[4] = result.getText(columns[4]);
        
                // 5. IMPORTE
                arrAux[5] = result.getValue(columns[5]);
        
                // 6. TIPO DE CAMBIO
                arrAux[6] = result.getValue(columns[6]);
        
                // 7. MONTO SOLES
                arrAux[7] = result.getValue(columns[7]);
        
                // 8. TIPO IMPOSITIVO
                arrAux[8] = Number(result.getValue(columns[8]));
        
                // 9. MONTO RET
                arrAux[9] = result.getValue(columns[9]);
        
                // 10. SALDO
                arrAux[10] = result.getValue(columns[10]);
        
                // 11. CONST RET
                arrAux[11] = result.getValue(columns[11]);
        
                // 12. EMISION RET
                arrAux[12] = result.getValue(columns[12]);
        
                // 12. TIPO DOCUMENTO
                arrAux[13] = result.getValue(columns[13]);
        
                arrResult.push({
                    numberDoc: arrAux[0],
                    name: arrAux[1],
                    numerTran: arrAux[2],
                    date: arrAux[3],
                    currency: arrAux[4],
                    import: arrAux[5],
                    exchange: arrAux[6],
                    amount: arrAux[7],
                    typeImp: arrAux[8],
                    amountRet: arrAux[9],
                    balance: arrAux[10],
                    constRet: arrAux[11],
                    emisionRet: arrAux[12],
                    tipoDocumento: arrAux[13]
                    

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


          const getJsonData = (transactions,params) => {
            try {

            const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const months_nros = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
            var month = "";
            var year = "";
            var hasInfo = 0;
            
            let userTemp = runtime.getCurrentUser(),
              useID = userTemp.id,
              jsonTransacion = {},
              totalAmount = 0;
        
            /*var employeeName = search.lookupFields({
              type: search.Type.EMPLOYEE,
              id: useID,
              columns: ["firstname", "lastname"],
            });
            var userName = employeeName.firstname + " " + employeeName.lastname;*/
        
            log.debug("transactions", transactions);
        
            var total_amount = 0;
            var total_amountRet = 0;
            var total_balance = 0;
            for (var k in transactions) {
              let IDD = transactions[k].numerTran;
              if (!jsonTransacion[IDD]) {
                let exchange = Number(transactions[k].exchange).toFixed(3);
                let balance = Number(transactions[k].balance).toFixed(2);
                let amountRet = Number(transactions[k].amountRet).toFixed(2);
        
                jsonTransacion[IDD] = {
                  numberDoc: transactions[k].numberDoc,
                  name: transactions[k].name,
                  numerTran: transactions[k].numerTran,
                  date: transactions[k].date,
                  currency: transactions[k].currency,
                  import: transactions[k].import,
                  exchange: exchange,
                  amount: roundTwoDecimals(transactions[k].amount).toFixed(2),//numberWithCommas(roundTwoDecimals(transactions[k].amount).toFixed(2)),
                  typeImp: transactions[k].typeImp,
                  amountRet: roundTwoDecimals(amountRet).toFixed(2),//numberWithCommas(roundTwoDecimals(amountRet).toFixed(2)),
                  balance: roundTwoDecimals(balance).toFixed(2),//numberWithCommas(roundTwoDecimals(balance).toFixed(2)),
                  constRet: transactions[k].constRet,
                  emisionRet: transactions[k].emisionRet,
                  tipoDocumento: transactions[k].tipoDocumento,
                };
                total_amount = total_amount + Number(transactions[k].amount);
                total_amountRet = total_amountRet + Number(transactions[k].amountRet);
                total_balance = total_balance + Number(transactions[k].balance);
              }
              hasInfo = 1;
            }
        
            //log.debug('jsonTransacion', jsonTransacion);
            let periodSearch = search.lookupFields({
              type: search.Type.ACCOUNTING_PERIOD,
              id: params.filterPostingPeriod,
              columns: ["periodname", "startdate"],
            });
        
            let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
            month = months_nros[Number(periodSearch.startdate.split("/")[1]) - 1];
            year = periodSearch.startdate.split("/")[2];
        
            let jsonAxiliar = {
              company: {
                firtsTitle: "FORMATO 12.1: INVT. PERMANENTE",
                secondTitle: monthName.toLocaleUpperCase() + " " + year,
                thirdTitle: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                fourthTitle: getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
              },
              total: {
                total: totalAmount.toFixed(2),
                total_amount: numberWithCommas(roundTwoDecimals(total_amount).toFixed(2)),
                total_amountRet: numberWithCommas(roundTwoDecimals(total_amountRet).toFixed(2)),
                total_balance: numberWithCommas(roundTwoDecimals(total_balance).toFixed(2)),
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

        const roundTwoDecimals = (value) => {
            return Math.round(value * 100) / 100;
          };
        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
            return x;
          };

          const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_4_1_pdf.ftl");
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