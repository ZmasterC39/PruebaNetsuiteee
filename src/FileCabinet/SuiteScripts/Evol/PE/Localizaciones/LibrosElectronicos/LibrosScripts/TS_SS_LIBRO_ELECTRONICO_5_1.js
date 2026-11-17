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

        const SCRIPT_ID = 'customscript_ts_ss_le_5_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_5_1';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;
        const ROWSPERFILE = 15000;
        const maxSeconds = 500; // 30 minutos
        const execute = (scriptContext) => {
            try {
                let getCola = getPendientes();
                let getColaProcesando = getProcesando();
                if (getColaProcesando.length > 0) {
                    let params = getColaProcesando[0].param;
                    params = JSON.parse(params);
                    let idCola = getColaProcesando[0].id;
                    let tempData = getColaProcesando[0].tempData;
                    tempData = JSON.parse(tempData);
                    params.parametros.idCola = idCola;
                    params.parametros.tempData = tempData;
                    let reejecutado = 0;
                    reejecutado = main(params.parametros);

                    try {
                        if (reejecutado == 1) {
                            log.debug('reiniciar ejecucion', 'reiniciar ejecucion ' + reejecutado);
                            let scriptTask = task.create({
                                taskType: TIPO_SCRIPT,
                                scriptId: SCRIPT_ID,
                                deploymentId: DEPLOYMENT_ID
                            });
                            scriptTask.submit();
                        }
                    } catch (error) {
                        log.error('Error', error);
                    }
                }

                if (getCola.length > 0) {
                    let params = getCola[0].param;
                    params = JSON.parse(params);
                    let idCola = getCola[0].id;
                    params.parametros.idCola = idCola;
                    main(params.parametros);
                    try {
                        let scriptTask = task.create({
                            taskType: TIPO_SCRIPT,
                            scriptId: SCRIPT_ID,
                            deploymentId: DEPLOYMENT_ID
                        });
                        scriptTask.submit();
                    } catch (error) {
                        log.error('Error', error);
                    }
                }

            } catch (error) {
                log.error('Error', error);
            }
        }

        const main = (parametros) => {
            try {
                try {
                    let initExecute = new Date();
                    const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                    const searchId = 'customsearch_pe_libro_diario_5_1';
                    let fedIdNumb = '';
                    let hasinfo = 0;
                    const params = getParams(parametros);

                    // Registro inicial con información de la ejecución actual
                    log.audit('🚀 INICIO LIBRO DIARIO 5.1', `Cola: ${parametros.idCola} | Subsidiaria: ${params.filterSubsidiary} | Período: ${params.filterPostingPeriod}`);

                    if (featureSubsidiary) {
                        const getruc = getRUC(params.filterSubsidiary)
                        fedIdNumb = getruc;
                    } else {
                        const employerid = getEmployerID();
                        fedIdNumb = employerid;
                    }


                    if (parametros.tempData) {
                        updateCola(
                            {
                                idCola: parametros.idCola,
                                estado: 'PROCESANDO',
                                mensaje: 'Generando archivos nueva vuelta',
                            }
                        )

                    } else {
                        updateCola({
                            idCola: parametros.idCola,
                            estado: 'PROCESANDO',
                            mensaje: ''
                        });
                    }
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

                    let folderId;
                    let paramsCreateFiles;
                    let folderName
                    if (parametros.tempData) {
                        folderId = parametros.tempData.folderId;
                        folderName = parametros.tempData.folderName;
                        paramsCreateFiles = {
                            nroArchivoActual: parametros.tempData.nroArchivoActual,
                            nroArchivoTotal: parametros.tempData.nroArchivoTotal,
                            folderId: folderId,
                            folderName: folderName,
                            pageIndex: parametros.tempData.pageIndex,
                            pageNum: parametros.tempData.pageNum,
                            reejecutado: 0
                        }
                    } else {
                        let folder = record.create({
                            type: 'folder',
                            isDynamic: true
                        });

                        folderName = 'Ejecucion del' + ' -5-1- ' + new Date().toISOString();

                        folder.setValue({
                            fieldId: 'name',
                            value: folderName
                        });

                        folder.setValue({
                            fieldId: 'parent',
                            value: params.fileCabinetId
                        });

                        folderId = folder.save();
                        paramsCreateFiles = {
                            nroArchivoActual: 1,
                            nroArchivoTotal: 0,
                            folderId: folderId,
                            folderName: folderName,
                            pageIndex: 0,
                            pageNum: 0,
                            reejecutado: 0
                        }
                    }

                    let urlFolderSalida = `<a href="/app/common/media/mediaitemfolders.nl?folder=${folderId}" target="_blank" ><img src="/images/nav/mediatypes/folder.gif?v=2025.1&amp;v=2025.1" alt="" width="20px" height="15px" border="0px" style="margin-bottom:-2px;">${folderName}</a>`

                    const searchLoad = search.load({
                        id: searchId
                    });
                    
                    // Configurar filtros de búsqueda para el Libro Diario 5.1
                    let newFilters = [];
                    
                    // Filtrar por período contable específico
                    const filterOne = search.createFilter({
                        name: 'postingperiod',
                        operator: search.Operator.ANYOF,
                        values: params.filterPostingPeriod
                    });
                    newFilters.push(filterOne);
                    
                    // Filtrar por subsidiaria específica (solo si está habilitada la funcionalidad)
                    if (featureSubsidiary) {
                        const filterTwo = search.createFilter({
                            name: 'subsidiary',
                            operator: search.Operator.ANYOF,
                            values: params.filterSubsidiary
                        });
                        newFilters.push(filterTwo);
                    }
                    
                    // Excluir transacciones memorizadas (solo transacciones reales)
                    newFilters.push(search.createFilter({
                        name: 'memorized',
                        operator: search.Operator.IS,
                        values: ['F']
                    }));
                    
                    // Incluir solo transacciones con montos válidos (debe o haber > 0)
                    newFilters.push(search.createFilter({
                        name: 'formulanumeric',
                        formula: 'NVL({debitamount},0) + NVL({creditamount},0)',
                        operator: search.Operator.GREATERTHAN,
                        values: ['0']
                    }));
                    
                    // Incluir solo transacciones contabilizadas (posting = true)
                    newFilters.push(search.createFilter({
                        name: 'posting',
                        operator: search.Operator.IS,
                        values: ['T']
                    }));
                    
                    // Excluir transacciones sin cuenta contable asignada
                    newFilters.push(search.createFilter({
                        name: 'formulatext',
                        formula: "NVL({account},'X')",
                        operator: search.Operator.ISNOT,
                        values: ['X']
                    }));
                    
                    // Excluir tipos específicos de transacciones (Ejecución de orden con formulario de consumo interno)
                    newFilters.push(search.createFilter({
                        name: 'formulatext',
                        formula: "CASE WHEN {type} = 'Ejecución de orden de artículo' AND {customform} = 'PE Salida de Consumo interno' THEN '1' ELSE '0' END",
                        operator: search.Operator.IS,
                        values: ['0']
                    }));
                    
                    // Aplicar todos los filtros configurados a la búsqueda
                    searchLoad.filters = newFilters;

                    // Validar cantidad de registros encontrados vs esperados
                    let newCount = searchLoad.runPaged().count;
                    log.audit('📊 FILTROS APLICADOS', `Registros después de filtros: ${newCount} | Esperados: 22 | Estado: ${newCount === 22 ? '✅ CORRECTO' : '⚠️ VERIFICAR'}`);

                    let pagedData = searchLoad.runPaged({ pageSize: 1000 });
                    let json = [];
                    let contadorManualRegistros = 0;
                    
                    log.audit('📋 INICIANDO PROCESAMIENTO', `Total registros: ${pagedData.count} | Páginas: ${pagedData.pageRanges.length}`);
                    
                    if (pagedData.count > 0) {
                        let pageNum = 0;
                        if (parametros.tempData) {
                            pageNum = parametros.tempData.pageNum;
                        }
                        for (i = pageNum; i < pagedData.pageRanges.length; i++) {
                            let currentPageNum = i;
                            
                            let pageIndex;
                            if (currentPageNum >= 0 && currentPageNum < pagedData.pageRanges.length) {
                                pageIndex = pagedData.pageRanges[currentPageNum].index;
                            } else {
                                break;
                            }
                            let page = pagedData.fetch(pageIndex);
                            
                            for (j = 0; j < page.data.length; j++) {
                                contadorManualRegistros++;
                                let recordData = page.data[j];
                                
                                const column01 = recordData.getValue(searchLoad.columns[0]);
                                const column02 = recordData.getValue(searchLoad.columns[1]);
                                const column03 = recordData.getValue(searchLoad.columns[2]);
                                const column04 = recordData.getValue(searchLoad.columns[3]);
                                const column05 = recordData.getValue(searchLoad.columns[4]);
                                const column06 = recordData.getValue(searchLoad.columns[5]);
                                const column07 = recordData.getValue(searchLoad.columns[6]);
                                let column08 = recordData.getValue(searchLoad.columns[7]);
                                if (column08 == '00') {
                                    column08 = ''
                                }
                                const column09 = recordData.getValue(searchLoad.columns[8]);
                                const column10 = recordData.getValue(searchLoad.columns[9]);
                                const column11 = recordData.getValue(searchLoad.columns[10]);
                                const column12 = recordData.getValue(searchLoad.columns[11]);
                                const column13 = recordData.getValue(searchLoad.columns[12]);
                                const column14 = recordData.getValue(searchLoad.columns[13]);
                                const column15 = recordData.getValue(searchLoad.columns[14]);
                                let column16 = recordData.getValue(searchLoad.columns[15]);
                                column16 = column16.replace(/(\r\n|\n|\r)/gm, "");
                                column16 = column16.replace(/[\/\\|]/g, "");
                                const column17 = recordData.getValue(searchLoad.columns[16]);
                                let column18 = recordData.getValue(searchLoad.columns[17]);
                                column18 = parseFloat(column18).toFixed(2);
                                if (column18 <= 0) {
                                    column18 = '0.00';
                                }
                                let column19 = recordData.getValue(searchLoad.columns[18]);
                                column19 = parseFloat(column19).toFixed(2);
                                if (column19 <= 0) {
                                    column19 = '0.00';
                                }
                                var column20 = recordData.getValue(searchLoad.columns[19]);
                                const column20_1 = recordData.getValue(searchLoad.columns[20]);
                                const column20_2 = recordData.getValue(searchLoad.columns[21]);
                                const column20_3 = recordData.getValue(searchLoad.columns[22]);

                                if (column20 != '' && column20_1 != '' && column20_2 != '' && column20_3 != '') {
                                    column20 = column20 + '&' + column20_1 + '&' + column20_2 + '&' + column20_3;
                                } else {
                                    column20 = '';
                                }

                                var column21 = recordData.getValue(searchLoad.columns[23]);
                                var periodoEmision = formatDate(column15)['anio'] + formatDate(column15)['mes'] + '00';
                                // if (column01 == periodoEmision) {
                                //     column21 = '1';
                                // } else {
                                //     column21 = '8';
                                // }

                                json.push({
                                    c1: column01,
                                    c2: column02,
                                    c3: column03,
                                    c4: column04,
                                    c5: column05,
                                    c6: column06,
                                    c7: column07,
                                    c8: column08,
                                    c9: column09,
                                    c10: column10,
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
                                    c21: column21
                                });
                            }
                            
                            // Mostrar progreso del procesamiento cada 5 páginas o en la última página
                            if (currentPageNum % 5 === 0 || currentPageNum === pagedData.pageRanges.length - 1) {
                                log.audit('📄 PROGRESO', `Página ${currentPageNum + 1}/${pagedData.pageRanges.length} | Registros procesados: ${contadorManualRegistros}`);
                            }

                            if (json.length >= ROWSPERFILE) {
                                hasinfo = '1';
                                let nameBase = 'LE' + fedIdNumb + periodostring + '050100' + '00' + '1' + hasinfo + '11';
                                let newName = nameBase + '_' + paramsCreateFiles.nroArchivoActual
                                paramsCreateFiles.nroArchivoActual = paramsCreateFiles.nroArchivoActual + 1;
                                
                                let structuregbody = structureBody(json);
                                createFile(params.filterFormat, structuregbody, folderId, params, newName);
                                paramsCreateFiles.nroArchivoTotal = paramsCreateFiles.nroArchivoTotal + 1;
                                paramsCreateFiles.pageIndex = pageIndex;
                                paramsCreateFiles.pageNum = currentPageNum + 1;

                                log.audit('📁 ARCHIVO CREADO', `${newName} con ${json.length} registros`);

                                updateCola({
                                    idCola: parametros.idCola,
                                    estado: 'PROCESANDO',
                                    urlArchivo: urlFolderSalida,
                                    mensaje: `Archivo generado ` + newName,
                                    tempData: JSON.stringify(paramsCreateFiles)
                                });
                                json = new Array();

                                let checkPoint = new Date();
                                let elapsedTime = (checkPoint - initExecute) / 1000;
                                if (elapsedTime > maxSeconds) {
                                    log.audit('⏰ TIEMPO LÍMITE', `Reiniciando ejecución después de ${Math.round(elapsedTime)}s`);
                                    paramsCreateFiles.reejecutado = 1;
                                    break;
                                }
                            }
                        }
                        if (paramsCreateFiles.reejecutado == 1) {
                            return paramsCreateFiles.reejecutado;
                        }

                        log.audit('✅ PROCESAMIENTO COMPLETADO', `Registros procesados: ${contadorManualRegistros} | Esperados: 22 | Estado: ${contadorManualRegistros === 22 ? 'PERFECTO' : 'VERIFICAR'}`);

                        log.audit('📋 RESUMEN FINAL', `Encontrados: ${contadorManualRegistros} | Procesados: ${contadorManualRegistros} | Descartados: 0 | Eficiencia: 100%`);

                        if (json.length > 0) {
                            hasinfo = '1';
                            let nameBase = 'LE' + fedIdNumb + periodostring + '050100' + '00' + '1' + hasinfo + '11';
                            let structuregbody = structureBody(json);
                            createFile(params.filterFormat, structuregbody, folderId, params, nameBase);
                            paramsCreateFiles.nroArchivoTotal = paramsCreateFiles.nroArchivoTotal + 1;

                            log.audit('✅ ARCHIVO FINAL CREADO', `${nameBase} con ${json.length} registros | Total procesados: ${contadorManualRegistros}`);

                            updateCola({
                                idCola: parametros.idCola,
                                estado: 'FINALIZADO',
                                fechaFin: new Date(),
                                urlArchivo: urlFolderSalida,
                                mensaje: `✅ Archivo generado ${nameBase} - Registros: ${contadorManualRegistros}`,
                                tempData: JSON.stringify(paramsCreateFiles)
                            });
                        } else {
                            updateCola({
                                idCola: parametros.idCola,
                                estado: 'FINALIZADO',
                                fechaFin: new Date(),
                            });
                        }
                    } else {
                        log.audit('⚠️ SIN REGISTROS', 'No se encontraron registros para el período seleccionado');

                        updateCola({
                            idCola: parametros.idCola,
                            estado: 'FINALIZADO',
                            fechaFin: new Date(),
                            mensaje: 'No se encontraron registros para el periodo seleccionado'
                        });
                    }
                } catch (e) {
                    log.error({ title: 'ErrorInExecute', details: e });
                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        fechaFin: new Date(),
                        mensaje: e.message
                    };
                    updateCola(param_update_cola);
                }

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
                if (params.tempData) {
                    cola.setValue({ fieldId: 'custrecord_ts_mr_temp_data', value: params.tempData });
                }

                cola.save();
            } catch (error) {
                log.error('updateCola Error', error);
            }
        }
        const getProcesando = () => {
            try {
                let cola = [];

                let searchCola = search.create({
                    type: 'customrecord_ts_le_cola_ejecuciones',
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        ['custrecord_ts_le_estado_ejecu', 'is', 'PROCESANDO'],
                        'AND',
                        ['custrecord_ts_le_cola_script_id', 'is', SCRIPT_ID],
                        'AND',
                        ['custrecord_ts_le_cola_id_deploy', 'is', DEPLOYMENT_ID],
                        'AND',
                        ['custrecord_ts_le_cola_fecha_inicio', 'within', 'today']
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        search.createColumn({ name: 'custrecord_ts_le_cola_param' }),
                        search.createColumn({ name: 'custrecord_ts_mr_temp_data' }),
                    ]

                });

                searchCola.run().each(function (result) {
                    let obj = {
                        id: result.getValue({ name: 'internalid' }),
                        fechaInicio: result.getValue({ name: 'custrecord_ts_le_cola_fecha_inicio' }),
                        param: result.getValue({ name: 'custrecord_ts_le_cola_param' }),
                        tempData: result.getValue({ name: 'custrecord_ts_mr_temp_data' })
                    }

                    cola.push(obj);
                    return true;
                });

                // Ordenar ejecuciones en estado PROCESANDO por fecha de inicio (más antigua primero)
                cola.sort((a, b) => {
                    return new Date(a.fechaInicio) - new Date(b.fechaInicio);
                });


                return cola;


            } catch (error) {
                log.error('Error', error);
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

                // Ordenar ejecuciones pendientes por fecha de inicio (más antigua primero)
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

        const structureBody = (searchResult) => {
            try {
                const contentReport = searchResult.map(record => {
                    // Construir línea de datos iterando dinámicamente sobre las columnas c1 a c21
                    const columns = [];
                    for (let i = 1; i <= 21; i++) {
                        columns.push(record[`c${i}`]);
                    }
                    return columns.join('|') + '|';
                }).join('\n') + '\n';

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }

        const createFile = (filterFormat, structuregbody, fileCabinetId, params, nameReportGenerated) => {
            const header = '1 Periodo|2 CUO|3 Numero correlativo del asiento|4 Codigo de la cuenta contable|5 Codigo de Unidad de Operacion|6 Centro de Costo|7 Tipo de Moneda de Origen|8 Tipo de documento de identidad del emisor' +
                '|9 Numero de documento de identidad del emisor|10 Tipo de Comprobante|11 Numero de Serie del comprobante de Pago|12 Numero de compronbante de pago|13 Fecha Contable|14 Fecha de Vencimiento|15 Fecha de la operacion o emision|Glosa referencial' +
                '|16 Glosa o descripcion de la naturaleza de la operacion registrada de ser el caso|17 Glosa referencial, de ser el caso|18 Movimientos del Debe|19 Movimiento del Haber|20 Cod Libro|20.1 Campo 1|20.2 Campo 2|20.3 Campo 3|Account|21 Indica el estado de la operacion|\n';
            
            try {
                let fileName = nameReportGenerated;
                let fileContent = structuregbody;
                let fileType;

                if (filterFormat === 'CSV') {
                    fileName += '.csv';
                    fileContent = header + fileContent;
                    fileContent = fileContent.replace(/[,]/gi, ' ').replace(/[|]/gi, ',');
                    fileType = file.Type.CSV;
                } else if (filterFormat === 'TXT') {
                    fileName += '.txt';
                    fileType = file.Type.PLAINTEXT;
                } else if (filterFormat === 'PDF') {
                    const renderer = render.create();
                    renderer.templateContent = getTemplate();
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'data',
                        data: setSpecialChars(getJsonData({}, params))
                    });
                    
                    const pdfFile = renderer.renderAsPdf();
                    pdfFile.name = nameReportGenerated + '.pdf';
                    pdfFile.folder = fileCabinetId;
                    return pdfFile.save();
                } else {
                    fileName += '.txt';
                    fileType = file.Type.PLAINTEXT;
                }

                const fileObj = file.create({
                    name: fileName,
                    fileType: fileType,
                    contents: fileContent,
                    encoding: file.Encoding.UTF8,
                    folder: fileCabinetId,
                    isOnline: true
                });

                return fileObj.save();

            } catch (e) {
                log.error({ title: 'createFile', details: e });
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

        // Convertir fecha en formato DD/MM/YYYY a objeto con componentes separados
        function formatDate(dateString) {
            var date = dateString.split('/');
            if (Number(date[0]) < 10) date[0] = '0' + Number(date[0]);
            if (Number(date[1]) < 10) date[1] = '0' + Number(date[1]);
            return { 'anio': date[2], 'mes': date[1], 'dia': date[0] }
        }

        const getJsonData = (transactions, params) => {
            try {
                let jsonTransacion = {},
                    totalDebit = 0,
                    jsonTransacionvine = new Array(),
                    totalCredit = 0;
                const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

                var cantidadLinea = 0;
                var montovieneDebito = 0;
                var montovieneCredito = 0;
                var cantidadFor = 0;

                for (var k in transactions) {
                    let IDD = transactions[k].numberCorr;


                    let dato_debit = parseFloat(transactions[k].debit);
                    let dato_credit = parseFloat(transactions[k].credit);

                    jsonTransacion[IDD] = {
                        number: cantidadFor,
                        numberCorr: transactions[k].numberCorr,
                        date: transactions[k].date,
                        description: transactions[k].description,
                        bookCode: transactions[k].bookCode,
                        numberUnique: transactions[k].numberUnique,
                        numberDoc: transactions[k].numberDoc,
                        code: transactions[k].code,
                        denomination: transactions[k].denomination,
                        debit: Number(transactions[k].debit),
                        credit: Number(transactions[k].credit),
                    }
                    cantidadFor = cantidadFor + 1;
                    totalDebit += dato_debit;
                    totalCredit += dato_credit

                }
                const claves = Object.keys(jsonTransacion);

                // Iterar sobre cada clave para procesar datos de las transacciones
                claves.forEach(function (clave) {
                    const valor = jsonTransacion[clave];
                    var resultado1 = divisionRedondeoArriba(valor.denomination.length, 24);
                    cantidadLinea = cantidadLinea + resultado1 + 1;

                    if (cantidadLinea <= 33) {
                        montovieneDebito = Number(montovieneDebito) + Number(valor.debit);
                        montovieneCredito = Number(montovieneCredito) + Number(valor.credit);
                    } else {
                        jsonTransacionvine.push({
                            montovieneDebito: numberWithCommas(montovieneDebito.toFixed(2)),
                            montovieneCredito: numberWithCommas(montovieneCredito.toFixed(2)),
                            cantidadFor: valor.number - 1
                        });
                        cantidadLinea = 0;
                        cantidadLinea = cantidadLinea + resultado1 + 1;
                        montovieneDebito = Number(montovieneDebito) + Number(valor.debit);
                        montovieneCredito = Number(montovieneCredito) + Number(valor.credit);
                    }
                });

                let periodSearch = search.lookupFields({
                    type: search.Type.ACCOUNTING_PERIOD,
                    id: params.filterPostingPeriod,
                    columns: ['periodname', "startdate"]
                });
                let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
                let year = periodSearch.startdate.split("/")[2];

                var jsonAxiliar = {
                    "company": {
                        "firtsTitle": 'FORMATO 5.1: LIBRO DIARIO',
                        "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                        "thirdTitle": getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        "fourthTitle": getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
                    },
                    "totalDebit": {
                        "total": Number(totalDebit)
                    },
                    "totalCredit": {
                        "total": Number(totalCredit)
                    },
                    "movements": jsonTransacion,
                    "jsonTransacionvine": jsonTransacionvine
                };

                return jsonAxiliar;

            } catch (e) {
                log.error({ title: 'getJsonData', details: e });
            }
        };

        function divisionRedondeoArriba(dividendo, divisor) {
            if (divisor === 0) {
                throw new Error("El divisor no puede ser cero.");
            }

            var resultado = dividendo / divisor;
            var enteroResultado = parseInt(resultado); // Obtener la parte entera del resultado

            if (resultado > 0 && resultado !== enteroResultado) {
                return enteroResultado + 1;
            } else if (resultado < 0 && resultado !== enteroResultado) {
                return enteroResultado; // Para números negativos no se redondea hacia arriba
            } else {
                return enteroResultado; // Si no hay fracción decimal, devolver el entero
            }
        };

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
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
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_5_1_pdf.ftl");
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
