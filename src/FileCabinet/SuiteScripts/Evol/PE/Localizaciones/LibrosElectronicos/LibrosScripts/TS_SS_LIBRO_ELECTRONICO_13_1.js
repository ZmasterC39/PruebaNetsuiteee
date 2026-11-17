/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format", "N/render", 'N/compress'],

    (search, record, runtime, log, file, task, config, format, render, compress) => {

        /** ts_pe_ss_ple_4_1_libro_de_retenciones
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_13_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_13_1';
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
                throw new Error("Error en la ejecucion del script: " + error.message);
            }

            /*  log.debug('Hola', 'Hola Mundo!');
             return true; */
        }

        const main = (parametros, scriptContext) => {
            try {
                /**
                 * Zona de desarrollo
                 */
                try {
                    const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
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

                    updateCola(param_update_cola);

                    // Crear la búsqueda dinámica directamente en el main, como en el libro 6.1
                    const searchLoad = search.create({
                        type: "transaction",
                        settings: [{ "name": "consolidationtype", "value": "NONE" }],
                        filters: [
                            ["posting", "is", "T"],
                            "AND",
                            ["item.type", "anyof", "InvtPart", "Assembly"],
                            "AND",
                            ["voided", "is", "F"],
                            "AND",
                            ["formulanumeric: CASE WHEN substr({account.number},1,2) IN ('20', '21',  '24', '25', '26') THEN 1 ELSE 0 END", "equalto", "1"],
                            "AND",
                            ["postingperiod", "anyof", params.filterPostingPeriod],
                            "AND",
                            ["subsidiary", "anyof", params.filterSubsidiary]
                        ],
                        columns: [
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "CONCAT(SUBSTR(TO_CHAR({trandate} , 'YYYYMMDD'),1,6),'00')",
                                label: "1 Período"
                            }),
                            search.createColumn({
                                name: "internalid",
                                summary: "GROUP",
                                label: "2 CUO"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "CASE WHEN {custbody_pe_closing_journal} = 'T' THEN CONCAT(CONCAT('C', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) WHEN {custbody_pe_opening_journal} = 'T' THEN CONCAT(CONCAT('A', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) ELSE CONCAT(CONCAT('M', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) END",
                                label: "3 Correlativo"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "'9999'",
                                label: "4 Código del catálogo utilizado"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "{item.custitem_pe_cod_inventory_catalog}",
                                label: "5 Código del catálogo utilizado"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "{item.custitem_pe_cod_existence_type}",
                                label: "6 Tipo de Existencia"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "NVL({item.name},'0000')",
                                label: "7 Código Propio de Existencia en el campo 5"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "''",
                                label: "8 Código del catálogo utilizado"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "''",
                                label: "9 Código Propio de Existencia en el campo 8"
                            }),
                            search.createColumn({
                                name: "formuladate",
                                summary: "GROUP",
                                formula: "{trandate}",
                                label: "10 Fecha de Emisión"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "NVL(NVL({custbody_pe_document_type.custrecord_pe_code_document_type},{custcol_pe_ln_document_type.custrecord_pe_code_document_type}),'00')",
                                label: "11 Tipo de Documento"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "case when {type} in ('Recepción de artículo', 'Item Receipt') then NVL({custbody_pe_serie_cxp},'0000') else NVL({custbody_pe_serie.custrecord_pe_serie_impresion},'0000') end",
                                label: "12 Número de Serie del Documento"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "case when NVL(NVL({custbody_pe_document_type.custrecord_pe_code_document_type},{custcol_pe_ln_document_type.custrecord_pe_code_document_type}),'00') = '09' and length(NVL({custbody_pe_number},'0')) > 8 then substr(NVL({custbody_pe_number},'0'),-8) else NVL({custbody_pe_number},'0') end",
                                label: "13 Número del Documento"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "CASE WHEN {custbody_sj_tipo_de_despacho} = 'Recojo' THEN '99' WHEN {type} in ('Traslado de inventario', 'Inventory transfer', 'Ajuste de inventario', 'Inventory adjustment', 'Hoja de trabajo de inventario') THEN '21' ELSE NVL({custbody_pe_operation_type.custrecord_pe_code_operation_type},'09') END",
                                label: "14 Código de Operación"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "NVL({item.purchasedescription}, {item.displayname})",
                                label: "15 Descripción de la Exisrencia"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "{item.custitem_pe_cod_measure_unit}",
                                label: "16 Código de la unidad de medida"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "{item.custitem_pe_cod_valuation_method}",
                                label: "17 Código del Método de valuación"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom},0) >=0 THEN NVL({quantityuom}, 0) ELSE 0 END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom},0) <= 0 THEN 0 WHEN NVL({debitamount},0) <= 0 THEN 0 ELSE round(({debitamount}/{quantityuom}),8) END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom},0) >=0 THEN NVL({debitamount},0) ELSE 0 END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "case when nvl({quantityuom}, 0) < 0 then abs({quantityuom}) else 0 end",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom}, 0) >= 0 THEN '0.00' when NVL({creditamount}, 0) = 0 then '0.00' else TO_CHAR({creditamount}/ABS({quantityuom}), '9999999990.00') END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom},0) < 0 and NVL({creditamount},0) > 0 THEN ({creditamount}) ELSE 0 END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "abs(NVL({quantityuom},0))",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "CASE WHEN NVL({quantityuom},0) <=0 THEN 0 WHEN NVL({debitamount},0) = 0 then 0 else ({debitamount}/{quantityuom}) END",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulanumeric",
                                summary: "SUM",
                                formula: "NVL(NVL(({debitamount}),({creditamount})*(-1)),0)",
                                label: "Fórmula (numérica)"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                summary: "GROUP",
                                formula: "'1'",
                                label: "27 Indica el estado de la operación"
                            })
                        ]
                    });

                    // Ejecutar la búsqueda paginada y obtener resultados
                    let pagedData = searchLoad.runPaged({ pageSize: 1000 });
                    let json = [];

                    log.audit('DATOS ORIGINALES', {
                        totalRegistros: pagedData.count,
                        totalPaginas: pagedData.pageRanges.length
                    });

                    if (pagedData.count > 0) {
                        // Procesar cada página de resultados
                        pagedData.pageRanges.forEach(pageRange => {
                            let page = pagedData.fetch(pageRange.index);

                            page.data.forEach(result => {
                                const column01 = result.getValue(searchLoad.columns[0]);
                                const column02 = result.getValue(searchLoad.columns[1]);
                                const column03 = result.getValue(searchLoad.columns[2]);
                                const column04 = result.getValue(searchLoad.columns[3]);

                                let column05 = result.getValue(searchLoad.columns[4]);
                                let auxcolumn05 = column05.replace(/\s/g, '');
                                if (auxcolumn05 == '-None-') {
                                    column05 = '';
                                }

                                let column06 = result.getValue(searchLoad.columns[5]);
                                let auxcolumn06 = column06.replace(/\s/g, '');
                                if (auxcolumn06 == '-None-') {
                                    column06 = '';
                                }

                                const column07 = result.getValue(searchLoad.columns[6]);

                                let column08 = result.getValue(searchLoad.columns[7]);
                                let auxcolumn08 = column08.replace(/\s/g, '');
                                if (auxcolumn08 == '-None-') {
                                    column08 = '';
                                }

                                let column09 = result.getValue(searchLoad.columns[8]);
                                let auxcolumn09 = column09.replace(/\s/g, '');
                                if (auxcolumn09 == '-None-') {
                                    column09 = '';
                                }

                                let column10 = result.getValue(searchLoad.columns[9]);
                                column10 = convertDateFormat(column10);

                                const column11 = result.getValue(searchLoad.columns[10]);

                                let column12 = result.getValue(searchLoad.columns[11]);
                                if (column12 == '00') {
                                    column12 = '0';
                                }

                                let column13 = result.getValue(searchLoad.columns[12]);
                                column13 = parseInt(column13);

                                let column14 = result.getValue(searchLoad.columns[13]);
                                let auxcolumn14 = column14.replace(/\s/g, '');
                                if (auxcolumn14 == '-None-' || auxcolumn14.indexOf('ERROR:') >= 0) {
                                    column14 = '';
                                }

                                let column15 = result.getValue(searchLoad.columns[14]);
                                let auxcolumn15 = column15.replace(/\s/g, '');
                                if (auxcolumn15 == '-None-') {
                                    column15 = '';
                                }

                                let column16 = result.getValue(searchLoad.columns[15]);
                                let auxcolumn16 = column16.replace(/\s/g, '');
                                if (auxcolumn16 == '-None-') {
                                    column16 = '';
                                }

                                let column17 = result.getValue(searchLoad.columns[16]);
                                let auxcolumn17 = column17.replace(/\s/g, '');
                                if (auxcolumn17 == '-None-') {
                                    column17 = '';
                                }

                                let column18 = result.getValue(searchLoad.columns[17]);
                                if (column18 == '0') {
                                    column18 = '0.00';
                                } else {
                                    column18 = parseFloat(column18).toFixed(8).toString();
                                    column18 = quitarCerosDerecha(column18);
                                }

                                let column19 = result.getValue(searchLoad.columns[18]);
                                if (column19 == '0') {
                                    column19 = '0.00';
                                } else {
                                    column19 = parseFloat(column19).toFixed(8).toString();
                                    column19 = quitarCerosDerecha(column19);
                                }

                                let column20 = result.getValue(searchLoad.columns[19]).toString();
                                let auxcolumn20 = column20.replace(/\s/g, '');
                                if (column20 == '0' || auxcolumn20 == '') {
                                    column20 = '0.00';
                                } else {
                                    column20 = parseFloat(column20).toFixed(8).toString();
                                    column20 = quitarCerosDerecha(column20);
                                }

                                let column21 = result.getValue(searchLoad.columns[20]);
                                if (column21 == '0') {
                                    column21 = '0.00';
                                } else {
                                    column21 = parseFloat(column21).toFixed(8).toString();
                                    column21 = quitarCerosDerecha(column21);
                                }

                                let column22 = result.getValue(searchLoad.columns[21]);
                                let auxcolumn22 = column22.indexOf('ERROR:');
                                if (column22 == '0' || column22.indexOf('ERROR:') >= 0) {
                                    column22 = '0.00';
                                } else {
                                    column22 = parseFloat(column22).toFixed(8).toString();
                                    column22 = quitarCerosDerecha(column22);
                                }

                                let column23 = result.getValue(searchLoad.columns[22]);
                                if (column23 == '0') {
                                    column23 = '0.00';
                                } else {
                                    column23 = parseFloat(column23).toFixed(8).toString();
                                    column23 = quitarCerosDerecha(column23);
                                }

                                let column24 = result.getValue(searchLoad.columns[23]);
                                if (column24 == '0') {
                                    column24 = '0.00';
                                } else {
                                    column24 = parseFloat(column24).toFixed(8).toString();
                                    column24 = quitarCerosDerecha(column24);
                                }

                                let column25 = result.getValue(searchLoad.columns[24]);
                                if (column25 == '0') {
                                    column25 = '0.00';
                                } else {
                                    column25 = parseFloat(column25).toFixed(8).toString();
                                    column25 = quitarCerosDerecha(column25);
                                }

                                let column26 = result.getValue(searchLoad.columns[25]);
                                if (column26 == '0') {
                                    column26 = '0.00';
                                } else {
                                    column26 = parseFloat(column26).toFixed(2);
                                }

                                const column27 = result.getValue(searchLoad.columns[26]);

                                // Añadir el registro al array json
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
                                    c21_20_1_campo1: column21,
                                    c22_20_2_campo2: column22,
                                    c23_20_3_campo3: column23,
                                    c24_account: column24,
                                    c25_cost_unit: column25,
                                    c26_cost_total: column26,
                                    c27_estado_operacion: column27
                                });
                            });
                        });

                        hasinfo = '1';

                        // Creamos el folder donde se guardan las ejecuciones
                        let folder = record.create({
                            type: 'folder',
                            isDynamic: true
                        });

                        let folderName = 'Ejecucion del' + ' - ' + new Date().toISOString();

                        folder.setValue({
                            fieldId: 'name',
                            value: folderName
                        });

                        folder.setValue({
                            fieldId: 'parent',
                            value: params.fileCabinetId
                        });

                        let folderId = folder.save();

                        let urlFolderSalida = `<a href="/app/common/media/mediaitemfolders.nl?folder=${folderId}" target="_blank" ><img src="/images/nav/mediatypes/folder.gif?v=2025.1&amp;v=2025.1" alt="" width="20px" height="15px" border="0px" style="margin-bottom:-2px;">${folderName}</a>`;

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

                        log.audit('REGISTROS A PROCESAR', {
                            totalRegistros: json.length
                        });

                        // Dividimos los archivos en grupos
                        let group = 25000;
                        let total = json.length;
                        let totalGroups = Math.ceil(total / group);

                        log.audit('DIVISIÓN EN GRUPOS', {
                            totalRegistrosUnicos: total,
                            tamañoGrupo: group,
                            totalGrupos: totalGroups
                        });

                        let start = 0;
                        let end = group;
                        let partData = new Array();
                        let namebase = 'LE' + fedIdNumb + periodostring + '130100' + '00' + '1' + hasinfo + '11';

                        // Proceso para dividir los datos en grupos y generar los archivos
                        for (let i = 0; i < totalGroups; i++) {
                            end = Math.min(start + group, total);

                            let groupData = json.slice(start, end);
                            partData.push(groupData);

                            log.audit(`Procesando grupo ${i + 1} de ${totalGroups}`, {
                                registrosEnGrupo: groupData.length,
                                inicio: start,
                                fin: end
                            });

                            // Actualizar progreso
                            updateCola({
                                idCola: parametros.idCola,
                                estado: 'PROCESANDO',
                                mensaje: `Procesando grupo ${i + 1} de ${totalGroups} (${Math.round((i + 1) / totalGroups * 100)}%)`
                            });

                            let structuregbody = structureBody(groupData);
                            let newName = namebase + '_' + i;

                            // Crear el archivo para este grupo
                            let createfile = createFile(
                                params.filterPostingPeriod,
                                fedIdNumb,
                                hasinfo,
                                '',
                                params.filterFormat,
                                structuregbody,
                                folderId,
                                [], // transactionJSON (vacío ya que procesamos los datos directamente)
                                params,
                                newName
                            );

                            updateCola({
                                idCola: parametros.idCola,
                                estado: 'PROCESANDO',
                                urlArchivo: urlFolderSalida,
                                mensaje: `Archivo generado ${newName} (${i + 1}/${totalGroups})`
                            });

                            start = end;
                        }

                        // Marcar proceso como completado
                        param_update_cola = {
                            idCola: parametros.idCola,
                            estado: 'FINALIZADO',
                            fechaFin: new Date(),
                            urlArchivo: urlFolderSalida,
                            mensaje: `Proceso completado. Total registros: ${json.length}`
                        };

                        const statusProcess = updateCola(param_update_cola);
                        log.debug({ title: 'FinalResponse', details: 'Estado del proceso: ' + statusProcess + ' OK!!' });

                    } else {
                        param_update_cola = {
                            idCola: parametros.idCola,
                            estado: 'FINALIZADO',
                            fechaFin: new Date(),
                            mensaje: 'No hay registros para procesar'
                        };

                        updateCola(param_update_cola);
                    }
                } catch (e) {
                    log.error({ title: 'ErrorInExecute', details: e });

                    // Mensaje de error detallado
                    let errorMessage = `Error en la ejecución: ${e.message}`;
                    if (e.stack) {
                        log.error('Stack trace', e.stack);
                        errorMessage += ` [Línea: ${e.stack.split('\n')[1] || 'desconocida'}]`;
                    }

                    param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        fechaFin: new Date(),
                        mensaje: errorMessage
                    };

                    updateCola(param_update_cola);
                    throw new Error("Error en la ejecución del script: " + e.message);
                }
            } catch (error) {
                log.error('Error en main', error);
                try {
                    let param_update_cola = {
                        idCola: parametros.idCola,
                        estado: 'ERROR',
                        mensaje: error.message,
                        fechaFin: new Date()
                    }
                    updateCola(param_update_cola);
                } catch (error) {
                    log.error('Error en param_update_cola de main', error);
                }
            }
        }

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

        // const searchBook = (subsidiary, period, featureSubsidiary) => {
        //     try {
        //         log.audit('Inicio de searchBook con búsqueda dinámica', {
        //             subsidiary: subsidiary,
        //             period: period,
        //             featureSubsidiary: featureSubsidiary
        //         });

        //         // ENFOQUE ALTERNATIVO: Crear una búsqueda desde cero con todos los filtros necesarios
        //         // En lugar de modificar filtros existentes, definimos todos directamente

        //         // Primero definimos los filtros base
        //         let filters = [
        //             ["posting", "is", "T"],
        //             "AND",
        //             ["item.type", "anyof", "InvtPart", "Assembly"],
        //             "AND",
        //             ["voided", "is", "F"],
        //             "AND",
        //             ["formulanumeric: CASE WHEN substr({account.number},1,2) IN ('20', '21',  '24', '25', '26') THEN 1 ELSE 0 END", "equalto", "1"],
        //             "AND",
        //             ["postingperiod", "anyof", period]
        //         ];

        //         // Agregamos el filtro de subsidiaria si corresponde
        //         if (featureSubsidiary) {
        //             filters.push("AND");
        //             filters.push(["subsidiary", "anyof", subsidiary]);
        //         }

        //         // Crear la búsqueda con todos los filtros definidos
        //         const transactionSearchObj = search.create({
        //             type: "transaction",
        //             settings: [{ "name": "consolidationtype", "value": "NONE" }],
        //             filters: filters,
        //             columns: [
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "CONCAT(SUBSTR(TO_CHAR({trandate} , 'YYYYMMDD'),1,6),'00')",
        //                     label: "1 Período"
        //                 }),
        //                 search.createColumn({
        //                     name: "internalid",
        //                     summary: "GROUP",
        //                     label: "2 CUO"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "CASE WHEN {custbody_pe_closing_journal} = 'T' THEN CONCAT(CONCAT('C', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) WHEN {custbody_pe_opening_journal} = 'T' THEN CONCAT(CONCAT('A', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) ELSE CONCAT(CONCAT('M', {internalid}), LPAD(TO_CHAR({linesequencenumber}), 2, '0')) END",
        //                     label: "3 Correlativo"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "'9999'",
        //                     label: "4 Código del catálogo utilizado"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "{item.custitem_pe_cod_inventory_catalog}",
        //                     label: "5 Código del catálogo utilizado"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "{item.custitem_pe_cod_existence_type}",
        //                     label: "6 Tipo de Existencia"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "NVL({item.name},'0000')",
        //                     label: "7 Código Propio de Existencia en el campo 5"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "''",
        //                     label: "8 Código del catálogo utilizado"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "''",
        //                     label: "9 Código Propio de Existencia en el campo 8"
        //                 }),
        //                 search.createColumn({
        //                     name: "formuladate",
        //                     summary: "GROUP",
        //                     formula: "{trandate}",
        //                     label: "10 Fecha de Emisión"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "NVL(NVL({custbody_pe_document_type.custrecord_pe_code_document_type},{custcol_pe_ln_document_type.custrecord_pe_code_document_type}),'00')",
        //                     label: "11 Tipo de Documento"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "case when {type} in ('Recepción de artículo', 'Item Receipt') then NVL({custbody_pe_serie_cxp},'0000') else NVL({custbody_pe_serie.custrecord_pe_serie_impresion},'0000') end",
        //                     label: "12 Número de Serie del Documento"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "case when NVL(NVL({custbody_pe_document_type.custrecord_pe_code_document_type},{custcol_pe_ln_document_type.custrecord_pe_code_document_type}),'00') = '09' and length(NVL({custbody_pe_number},'0')) > 8 then substr(NVL({custbody_pe_number},'0'),-8) else NVL({custbody_pe_number},'0') end",
        //                     label: "13 Número del Documento"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "CASE WHEN {custbody_sj_tipo_de_despacho} = 'Recojo' THEN '99' WHEN {type} in ('Traslado de inventario', 'Inventory transfer', 'Ajuste de inventario', 'Inventory adjustment', 'Hoja de trabajo de inventario') THEN '21' ELSE NVL({custbody_pe_operation_type.custrecord_pe_code_operation_type},'09') END",
        //                     label: "14 Código de Operación"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "NVL({item.purchasedescription}, {item.displayname})",
        //                     label: "15 Descripción de la Exisrencia"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "{item.custitem_pe_cod_measure_unit}",
        //                     label: "16 Código de la unidad de medida"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "{item.custitem_pe_cod_valuation_method}",
        //                     label: "17 Código del Método de valuación"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom},0) >=0 THEN NVL({quantityuom}, 0) ELSE 0 END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom},0) <= 0 THEN 0 WHEN NVL({debitamount},0) <= 0 THEN 0 ELSE round(({debitamount}/{quantityuom}),8) END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom},0) >=0 THEN NVL({debitamount},0) ELSE 0 END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "case when nvl({quantityuom}, 0) < 0 then abs({quantityuom}) else 0 end",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom}, 0) >= 0 THEN '0.00' when NVL({creditamount}, 0) = 0 then '0.00' else TO_CHAR({creditamount}/ABS({quantityuom}), '9999999990.00') END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom},0) < 0 and NVL({creditamount},0) > 0 THEN ({creditamount}) ELSE 0 END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "abs(NVL({quantityuom},0))",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "CASE WHEN NVL({quantityuom},0) <=0 THEN 0 WHEN NVL({debitamount},0) = 0 then 0 else ({debitamount}/{quantityuom}) END",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulanumeric",
        //                     summary: "SUM",
        //                     formula: "NVL(NVL(({debitamount}),({creditamount})*(-1)),0)",
        //                     label: "Fórmula (numérica)"
        //                 }),
        //                 search.createColumn({
        //                     name: "formulatext",
        //                     summary: "GROUP",
        //                     formula: "'1'",
        //                     label: "27 Indica el estado de la operación"
        //                 })
        //             ]
        //         });

        //         // Log para diagnóstico
        //         log.debug('Filtros aplicados', JSON.stringify(filters));

        //         // Ejecutamos la búsqueda paginada
        //         let pagedData = transactionSearchObj.runPaged({ pageSize: 1000 });

        //         log.audit('DATOS ORIGINALES', {
        //             totalRegistros: pagedData.count,
        //             totalPaginas: pagedData.pageRanges.length
        //         });

        //         // Verificamos si la cantidad de registros es cercana a lo esperado
        //         if (pagedData.count < 160000) { // Umbral aproximado
        //             log.audit('La cantidad de registros es menor a lo esperado', {
        //                 obtenidos: pagedData.count,
        //                 esperados: 169856,
        //                 diferencia: 169856 - pagedData.count
        //             });
        //         }

        //         // Usamos un Map para deduplicación basada en clave compuesta
        //         let uniqueRecordsMap = new Map();
        //         let processedCount = 0;
        //         let duplicatesCount = 0;

        //         if (pagedData.count > 0) {
        //             for (let i = 0; i < pagedData.pageRanges.length; i++) {
        //                 log.debug('Procesando página', (i + 1) + ' de ' + pagedData.pageRanges.length);
        //                 let page = pagedData.fetch(i);

        //                 let pageRecordsCount = 0;
        //                 let pageDuplicatesCount = 0;

        //                 for (let j = 0; j < page.data.length; j++) {
        //                     let result = page.data[j];
        //                     processedCount++;
        //                     pageRecordsCount++;

        //                     // Extraemos los valores clave para deduplicación
        //                     const cuo = result.getValue(transactionSearchObj.columns[1]);
        //                     const correlativoId = result.getValue(transactionSearchObj.columns[2]);
        //                     const uniqueKey = `${cuo}_${correlativoId}`;

        //                     // Si este registro ya existe, es un duplicado
        //                     if (uniqueRecordsMap.has(uniqueKey)) {
        //                         duplicatesCount++;
        //                         pageDuplicatesCount++;

        //                         // Solo registramos algunos duplicados para no llenar los logs
        //                         if (duplicatesCount <= 10) {
        //                             log.debug('Duplicado detectado', {
        //                                 clave: uniqueKey,
        //                                 pagina: i + 1,
        //                                 posicion: j + 1,
        //                                 valorCuo: cuo,
        //                                 valorCorrelativo: correlativoId
        //                             });
        //                         }

        //                         continue; // Saltamos este registro duplicado
        //                     }

        //                     try {
        //                         // Función auxiliar para obtener valores de columnas de forma segura
        //                         const safeGetValue = (columnIndex, defaultValue = '') => {
        //                             try {
        //                                 const value = result.getValue(transactionSearchObj.columns[columnIndex]);
        //                                 return (value !== null && value !== undefined) ? value : defaultValue;
        //                             } catch (e) {
        //                                 log.error(`Error obteniendo valor de columna ${columnIndex}`, e);
        //                                 return defaultValue;
        //                             }
        //                         };

        //                         // Función para formatear valores numéricos
        //                         const formatNumber = (value, defaultValue = '0.00', decimals = 8) => {
        //                             try {
        //                                 if (value === null || value === undefined || value === '' || value === '0') {
        //                                     return defaultValue;
        //                                 }

        //                                 const floatValue = parseFloat(value);
        //                                 if (isNaN(floatValue)) {
        //                                     return defaultValue;
        //                                 }

        //                                 const formatted = floatValue.toFixed(decimals).toString();
        //                                 return quitarCerosDerecha(formatted);
        //                             } catch (e) {
        //                                 return defaultValue;
        //                             }
        //                         };

        //                         // Obtener valores con manejo seguro
        //                         const column01 = safeGetValue(0, '');
        //                         const column02 = cuo || '';
        //                         const column03 = correlativoId || '';
        //                         const column04 = safeGetValue(3, '');

        //                         let column05 = safeGetValue(4, '');
        //                         if (column05 === '-None-' || column05.trim() === '') {
        //                             column05 = '';
        //                         }

        //                         let column06 = safeGetValue(5, '');
        //                         if (column06 === '-None-' || column06.trim() === '') {
        //                             column06 = '';
        //                         }

        //                         const column07 = safeGetValue(6, '');

        //                         let column08 = safeGetValue(7, '');
        //                         if (column08 === '-None-' || column08.trim() === '') {
        //                             column08 = '';
        //                         }

        //                         let column09 = safeGetValue(8, '');
        //                         if (column09 === '-None-' || column09.trim() === '') {
        //                             column09 = '';
        //                         }

        //                         let column10 = safeGetValue(9, '');
        //                         try {
        //                             if (column10 && typeof column10 === 'string') {
        //                                 column10 = convertDateFormat(column10);
        //                             }
        //                         } catch (e) {
        //                             log.error('Error en convertir formato de fecha', e);
        //                         }

        //                         const column11 = safeGetValue(10, '');

        //                         let column12 = safeGetValue(11, '');
        //                         if (column12 === '00') {
        //                             column12 = '0';
        //                         }

        //                         let column13 = safeGetValue(12, '0');
        //                         try {
        //                             if (column13 && !isNaN(column13)) {
        //                                 column13 = parseInt(column13);
        //                             } else {
        //                                 column13 = 0;
        //                             }
        //                         } catch (e) {
        //                             column13 = 0;
        //                         }

        //                         let column14 = safeGetValue(13, '');
        //                         if (column14 === '-None-' || (typeof column14 === 'string' && column14.indexOf('ERROR:') >= 0)) {
        //                             column14 = '';
        //                         }

        //                         let column15 = safeGetValue(14, '');
        //                         if (column15 === '-None-' || column15.trim() === '') {
        //                             column15 = '';
        //                         }

        //                         let column16 = safeGetValue(15, '');
        //                         if (column16 === '-None-' || column16.trim() === '') {
        //                             column16 = '';
        //                         }

        //                         let column17 = safeGetValue(16, '');
        //                         if (column17 === '-None-' || column17.trim() === '') {
        //                             column17 = '';
        //                         }

        //                         // Procesar las columnas numéricas
        //                         const column18 = formatNumber(safeGetValue(17, '0'));
        //                         const column19 = formatNumber(safeGetValue(18, '0'));
        //                         const column20 = formatNumber(safeGetValue(19, '0'));
        //                         const column21 = formatNumber(safeGetValue(20, '0'));

        //                         let column22 = safeGetValue(21, '0');
        //                         if (column22 === '0' || (typeof column22 === 'string' && column22.indexOf('ERROR:') >= 0)) {
        //                             column22 = '0.00';
        //                         } else {
        //                             column22 = formatNumber(column22);
        //                         }

        //                         const column23 = formatNumber(safeGetValue(22, '0'));
        //                         const column24 = formatNumber(safeGetValue(23, '0'));
        //                         const column25 = formatNumber(safeGetValue(24, '0'));

        //                         // Para column26 usamos 2 decimales
        //                         let column26 = safeGetValue(25, '0');
        //                         if (column26 === '0' || column26 === '') {
        //                             column26 = '0.00';
        //                         } else {
        //                             try {
        //                                 column26 = parseFloat(column26).toFixed(2).toString();
        //                             } catch (e) {
        //                                 column26 = '0.00';
        //                             }
        //                         }

        //                         const column27 = safeGetValue(26, '1');

        //                         // Crear el objeto de registro
        //                         const jsonRecord = {
        //                             c1_periodo: column01,
        //                             c2_cuo: column02,
        //                             c3_nro_correlativo_asiento: column03,
        //                             c4_cod_cuenta_contable: column04,
        //                             c5_cod_unidad_op: column05,
        //                             c6_centro_costo: column06,
        //                             c7_tipo_moneda: column07,
        //                             c8_tipo_doc_entidad_emi: column08,
        //                             c9_nro_doc_entidad_emi: column09,
        //                             c10_tipo_comprobante: column10,
        //                             c11_nro_serie_comprobante: column11,
        //                             c12_nro_comprobante_pago: column12,
        //                             c13_fecha_contable: column13,
        //                             c14_fecha_vencimiento: column14,
        //                             c15_fecha_op_emision: column15,
        //                             c16_glosa_des_natu_op_reg: column16,
        //                             c17_glosa_ref_caso: column17,
        //                             c18_mov_debe: column18,
        //                             c19_mov_haber: column19,
        //                             c20_cod_libro: column20,
        //                             c21_20_1_campo1: column21,
        //                             c22_20_2_campo2: column22,
        //                             c23_20_3_campo3: column23,
        //                             c24_account: column24,
        //                             c25_cost_unit: column25,
        //                             c26_cost_total: column26,
        //                             c27_estado_operacion: column27
        //                         };

        //                         // Guardar en el mapa usando la clave compuesta
        //                         uniqueRecordsMap.set(uniqueKey, jsonRecord);
        //                     } catch (columnError) {
        //                         log.error('Error al procesar columnas', {
        //                             error: columnError.message,
        //                             registro: j,
        //                             pagina: i
        //                         });
        //                         // Continuamos con el siguiente registro
        //                     }
        //                 }

        //                 // Reportar progreso después de cada página
        //                 log.debug('Resumen página ' + (i + 1), {
        //                     totalEnPagina: pageRecordsCount,
        //                     duplicadosEnPagina: pageDuplicatesCount,
        //                     acumuladosProcesados: processedCount,
        //                     acumuladosUnicos: uniqueRecordsMap.size,
        //                     acumuladosDuplicados: duplicatesCount
        //                 });
        //             }

        //             // Convertir el mapa en un array
        //             const uniqueRecords = Array.from(uniqueRecordsMap.values());

        //             // Logging final 
        //             log.audit('RESULTADO DE DEDUPLICACIÓN', {
        //                 registrosOriginales: pagedData.count,
        //                 registrosProcesados: processedCount,
        //                 registrosUnicos: uniqueRecords.length,
        //                 duplicadosEncontrados: duplicatesCount,
        //                 porcentajeDuplicados: ((duplicatesCount / processedCount) * 100).toFixed(2) + '%',
        //                 diferenciaConEsperado: uniqueRecords.length - 169856
        //             });

        //             // Verificación contra el objetivo esperado
        //             if (uniqueRecords.length !== 169856) {
        //                 log.audit('DIFERENCIA EN CONTEOS ⚠️', {
        //                     registrosObtenidos: uniqueRecords.length,
        //                     registrosEsperados: 169856,
        //                     diferencia: uniqueRecords.length - 169856
        //                 });
        //             }

        //             if (uniqueRecords.length > 0) {
        //                 return { thereisinfo: 1, content: uniqueRecords };
        //             } else {
        //                 return { thereisinfo: 0 }
        //             }
        //         } else {
        //             return { thereisinfo: 0 }
        //         }
        //     } catch (e) {
        //         log.error({ title: 'Error en searchBook', details: e });
        //         throw new Error("Error en la búsqueda del libro: " + e.message);
        //     }
        // }

        const structureBody = (searchResult) => {
            let contentReport = '';
            try {
                log.debug('Iniciando structureBody con cantidad de registros', searchResult.length);

                for (let i in searchResult) {
                    // Construir la cadena de contenido sin verificar duplicados
                    contentReport =
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cuo + '|' + searchResult[i].c3_nro_correlativo_asiento + '|' +
                        searchResult[i].c4_cod_cuenta_contable + '|' + searchResult[i].c5_cod_unidad_op + '|' + searchResult[i].c6_centro_costo + '|' +
                        searchResult[i].c7_tipo_moneda + '|' + searchResult[i].c8_tipo_doc_entidad_emi + '|' + searchResult[i].c9_nro_doc_entidad_emi + '|' +
                        searchResult[i].c10_tipo_comprobante + '|' + searchResult[i].c11_nro_serie_comprobante + '|' + searchResult[i].c12_nro_comprobante_pago + '|' +
                        searchResult[i].c13_fecha_contable + '|' + searchResult[i].c14_fecha_vencimiento + '|' + searchResult[i].c15_fecha_op_emision + '|' +
                        searchResult[i].c16_glosa_des_natu_op_reg + '|' + searchResult[i].c17_glosa_ref_caso + '|' + searchResult[i].c18_mov_debe + '|' +
                        searchResult[i].c19_mov_haber + '|' + searchResult[i].c20_cod_libro + '|' + searchResult[i].c21_20_1_campo1 + '|' + searchResult[i].c22_20_2_campo2 +
                        '|' + searchResult[i].c23_20_3_campo3 + '|' + searchResult[i].c24_account + '|' + searchResult[i].c25_cost_unit + '|'
                        + searchResult[i].c26_cost_total + '|' + searchResult[i].c27_estado_operacion + '|\n';

                    // Registrar progreso cada 10,000 registros para monitorizar el rendimiento
                    if (i > 0 && i % 10000 === 0) {
                        log.debug('Progreso de structureBody', `Procesados ${i} de ${searchResult.length} registros`);
                    }
                }

                log.debug('structureBody completado', `Total de líneas: ${searchResult.length}`);
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
                throw new Error("Error en la estructuración del cuerpo: " + e.message);
            }
        }

        const findDuplicates = (searchResult) => {
            let countMap = {};
            let duplicates = [];

            try {
                for (let i in searchResult) {
                    const key = searchResult[i].c2_cuo + '_' + searchResult[i].c3_nro_correlativo_asiento;

                    if (countMap[key]) {
                        countMap[key]++;
                        if (countMap[key] === 2) {
                            // Only add to duplicates list the first time we find a duplicate
                            duplicates.push({
                                key: key,
                                record: searchResult[i]
                            });
                        }
                    } else {
                        countMap[key] = 1;
                    }
                }

                log.debug('Duplicate entries found', duplicates.length);
                if (duplicates.length > 0) {
                    log.debug('First few duplicates', duplicates.slice(0, 3));
                }

                return duplicates;
            } catch (e) {
                log.error({ title: 'findDuplicates', details: e });
                return [];
            }
        }

        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, transactionJSON, params, newName) => {
            let typeformat;
            const header = '1 Periodo|2 CUO|3 Correlativo|4 Codigo del catalogo utilizado|5 Codigo del catalogo utilizado|6 Tipo de Existencia|7 Codigo Propio de Existencia en el campo 5|8 Código del catálogo utilizado' +
                '|9 Codigo Propio de Existencia en el campo 8|10 Fecha de Emision|11 Tipo de Documento|12 Numero de Serie del Documento|13 Numero del Documento|14 Codigo de Operacion|15 Descripcion de la Existencia' +
                '|16 Codigo de la unidad de medida|17 Codigo del Metodo de valuacion|18 Cantidad de unidades fisicas|19 Costo unitario del bien Ingresado|20 Costo total del bien ingresado|21 Cantidad de unidades fisicas del bien retirado|22 Costo unitario del bien retirado|23 Costo total del bien retirado|24 Cantidad de unidades fisicas del saldo final|25 Costo unitario del saldo final|26 Costo total del saldo final|27 Indica el estado de la operacion|\n';
            try {

                /*     var perLookup = search.lookupFields({
                        type: search.Type.ACCOUNTING_PERIOD,
                        id: filterPostingPeriod,
                        columns: ['periodname', 'startdate']
                    });
                    var periodoFinDate = format.parse({
                        type: format.Type.DATE,
                        value: perLookup.startdate
                    });
                    const periodostring = periodoFinDate.getFullYear() + CompletarCero(2, periodoFinDate.getMonth() + 1) + '00'; */
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                // let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '130100' + '00' + '1' + hasinfo + '11';
                let jsonAxiliar = getJsonData(transactionJSON, params);
                if (filterFormat == 'CSV') {
                    newName = newName + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (filterFormat == 'TXT') {
                    newName = newName + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (filterFormat == 'PDF') {
                    // log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet

                    // log.debug(jsonAxiliar);

                    // Pasar datos al template
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'data',
                        data: setSpecialChars(jsonAxiliar)
                    });
                    var pdfFile = renderer.renderAsPdf();

                    // **************************************************************************************** //

                    // Guardar el PDF en el File Cabinet
                    pdfFile.name = newName + '.pdf';
                    pdfFile.folder = params.fileCabinetId;
                    let pdfFileId = pdfFile.save();
                    // log.debug(pdfFileId);

                    let auxFile = file.load({ id: pdfFileId });
                    var urlfile = auxFile.url;

                    return pdfFile;
                }
                const fileObj = file.create({
                    name: newName,
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
                throw new Error("Error al crear el archivo: " + e.message);

            }
        }

        const getTransactions = (params) => {
            var arrResult = [];
            var _cont = 0;

            // PE - Libro Diario 12.1
            var savedSearch = search.load({ id: 'customsearch_pe_libro_impreso_13_1' });

            if (params.filterSubsidiary) {
                savedSearch.filters.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary
                }));
            }

            savedSearch.filters.push(search.createFilter({
                name: 'postingperiod',
                operator: search.Operator.IS,
                values: [params.filterPostingPeriod]
            }));

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
            var pagedData = savedSearch.runPaged({ pageSize: 1000 });
            var page, columns;
            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach((result) => {
                    columns = result.columns;
                    arrAux = {};

                    // log.debug('result', result);

                    // 1. PERÍODO
                    arrAux["columna01"] = result.getValue(columns[0]);

                    // 2. CUO
                    arrAux["columna02"] = result.getValue(columns[1]);

                    // 3. CORRELATIVO
                    arrAux["columna03"] = result.getValue(columns[2]);

                    // 4. CÓDIGO DEL CATÁLOGO UTILIZADO
                    arrAux["columna04"] = result.getValue(columns[3]);

                    // 5. CÓDIGO DEL CATÁLOGO UTILIZADO 2
                    arrAux["columna05"] = result.getValue(columns[4]);

                    // 6.  TIPO DE EXISTENCIA
                    arrAux["columna06"] = result.getValue(columns[5]);

                    // 7. CÓDIGO PROPIO DE EXISTENCIA EN EL CAMPO 5
                    arrAux["columna07"] = result.getValue(columns[6]);

                    // 8. CÓDIGO DEL CATÁLOGO UTILIZADO 3
                    arrAux["columna08"] = result.getValue(columns[7]);

                    // 9. CÓDIGO PROPIO DE EXISTENCIA EN EL CAMPO 8
                    arrAux["columna09"] = result.getValue(columns[8]);

                    // 10. FECHA DE EMISIÓN
                    arrAux["columna10"] = result.getValue(columns[9]);

                    // 11. TIPO DE DOCUMENTO
                    arrAux["columna11"] = result.getValue(columns[10]);

                    // 12. NÚMERO DE SERIE DEL DOCUMENTO
                    arrAux["columna12"] = result.getValue(columns[11]);

                    // 13. NÚMERO DEL DOCUMENTO
                    arrAux["columna13"] = result.getValue(columns[12]);

                    // 14. CÓDIGO DE OPERACIÓN
                    arrAux["columna14"] = result.getValue(columns[13]);

                    arrResult.push(arrAux);
                });
            });
            // log.debug('ResOriginal', arrResult);
            return arrResult;
        }

        const getJsonData = (transactions, params) => {
            let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = new Array(),
                cantidadUnidFisicas = 0,
                costoUnitBienIng = 0,
                costoTotalBienIng = 0,
                cantUnidFisicasBnRe = 0,
                costUnitBienRet = 0,
                costTotalBienRet = 0,
                cantUnidFisicasSalFinal = 0,
                costUnitSalFinal = 0,
                costTotalSalFinal = 0;

            var employeeName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: useID,
                columns: ['firstname', 'lastname']
            });
            var userName = employeeName.firstname + ' ' + employeeName.lastname;
            // log.debug('transactions', transactions);
            let counter = 0;
            for (let k in transactions) {
                // log.debug('transactions[k]', transactions[k]);
                let dato_cantidadUnidFisicas = parseFloat(transactions[k].columna06).toFixed(2);
                let dato_costoUnitBienIng = parseFloat(transactions[k].columna07).toFixed(2);
                let dato_costoTotalBienIng = parseFloat(transactions[k].columna08).toFixed(2);
                let dato_cantUnidFisicasBnRe = parseFloat(transactions[k].columna09).toFixed(2);
                let dato_costUnitBienRet = parseFloat(transactions[k].columna10).toFixed(2);
                let dato_costTotalBienRet = parseFloat(transactions[k].columna11).toFixed(2);
                let dato_cantUnidFisicasSalFinal = parseFloat(transactions[k].columna12).toFixed(2);
                let dato_costUnitSalFinal = parseFloat(transactions[k].columna13).toFixed(2);
                let dato_costTotalSalFinal = parseFloat(transactions[k].columna14).toFixed(2);

                let IDD = counter++;

                aux = {
                    columna01: transactions[k].columna01,
                    columna02: transactions[k].columna02,
                    columna03: transactions[k].columna03,
                    columna04: transactions[k].columna04,
                    columna05: transactions[k].columna05,
                    columna06: numberWithCommas(dato_cantidadUnidFisicas),
                    columna07: numberWithCommas(dato_costoUnitBienIng),
                    columna08: numberWithCommas(dato_costoTotalBienIng),
                    columna09: numberWithCommas(dato_cantUnidFisicasBnRe),
                    columna10: numberWithCommas(dato_costUnitBienRet),
                    columna11: numberWithCommas(dato_costTotalBienRet),
                    columna12: numberWithCommas(dato_cantUnidFisicasSalFinal),
                    columna13: numberWithCommas(dato_costUnitSalFinal),
                    columna14: numberWithCommas(dato_costTotalSalFinal),

                }
                jsonTransacion.push(aux);

                cantidadUnidFisicas += dato_cantidadUnidFisicas;
                costoUnitBienIng += dato_costoUnitBienIng;
                costoTotalBienIng += dato_costoTotalBienIng;
                cantUnidFisicasBnRe += dato_cantUnidFisicasBnRe;
                costUnitBienRet += dato_costUnitBienRet;
                costTotalBienRet += dato_costTotalBienRet;
                cantUnidFisicasSalFinal += dato_cantUnidFisicasSalFinal;
                costUnitSalFinal += dato_costUnitSalFinal;
                costTotalSalFinal += dato_costTotalSalFinal;
            }

            // log.debug('jsonTransacion', jsonTransacion);
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
            let monthName = months[Number(periodSearch.startdate.split("/")[1]) - 1];
            year = periodSearch.startdate.split("/")[2];
            cantidadUnidFisicas = parseFloat(cantidadUnidFisicas).toFixed(2);
            costoUnitBienIng = parseFloat(costoUnitBienIng).toFixed(2);
            costoTotalBienIng = parseFloat(costoTotalBienIng).toFixed(2);
            cantUnidFisicasBnRe = parseFloat(cantUnidFisicasBnRe).toFixed(2);
            costUnitBienRet = parseFloat(costUnitBienRet).toFixed(2);
            costTotalBienRet = parseFloat(costTotalBienRet).toFixed(2);
            cantUnidFisicasSalFinal = parseFloat(cantUnidFisicasSalFinal).toFixed(2);
            costUnitSalFinal = parseFloat(costUnitSalFinal).toFixed(2);
            //add 2 decimals

            costTotalSalFinal = parseFloat(costTotalSalFinal).toFixed(2);

            var jsonAxiliar = {
                "company": {
                    "firtsTitle": 'FORMATO 13.1: "REGISTRO DE INVENTARIO PERMANENTE VALORIZADO - DETALLE DEL INVENTARIO VALORIZADO"',
                    "secondTitle": monthName.toLocaleUpperCase() + ' ' + year,
                    "thirdTitle": companyRuc.replace(/&/g, '&amp;'),
                    "fourthTitle": companyName.replace(/&/g, '&amp;').toLocaleUpperCase(),
                },
                "total": {
                    "cantidadUnidFisicas": numberWithCommas(cantidadUnidFisicas),
                    "costoUnitBienIng": numberWithCommas(costoUnitBienIng),
                    "costoTotalBienIng": numberWithCommas(costoTotalBienIng),
                    "cantUnidFisicasBnRe": numberWithCommas(cantUnidFisicasBnRe),
                    "costUnitBienRet": numberWithCommas(costUnitBienRet),
                    "costTotalBienRet": numberWithCommas(costTotalBienRet),
                    "cantUnidFisicasSalFinal": numberWithCommas(cantUnidFisicasSalFinal),
                    "costUnitSalFinal": numberWithCommas(costUnitSalFinal),
                    "costTotalSalFinal": numberWithCommas(costTotalSalFinal)
                },
                "movements": jsonTransacion
            };
            return jsonAxiliar;
        }

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_13_1.ftl");
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

        const numberWithCommas = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
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

        function quitarCerosDerecha(numeroStr) {
            /**
             * Esta función elimina los ceros a la derecha de un número en formato de cadena.
             * Si el número termina en un punto decimal, también lo elimina.
             *
             * @param {string} numeroStr - Número en formato de cadena (por ejemplo, "-0.83000000").
             * @return {string} - Cadena con los ceros a la derecha eliminados.
             */
            try {
                // Validamos que la entrada sea un número válido
                if (isNaN(numeroStr)) {
                    return "Entrada no válida";
                }
                // Usamos regex para eliminar ceros a la derecha y el punto decimal si es necesario
                return numeroStr.replace(/(\.\d*?[1-9])0+$/g, '$1').replace(/\.0+$/, '');
            } catch (error) {
                // Si ocurre un error inesperado, devolvemos un mensaje de error
                return "Entrada no válida";
            }
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
