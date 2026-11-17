/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/format"],

    (search, record, runtime, log, file, task, config, format) => {

        /** ts_pe_ss_ple_4_1_libro_de_retenciones
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const SCRIPT_ID = 'customscript_ts_ss_le_6_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_6_1';
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

                    // Crear la búsqueda dinámica actualizada para el Libro Mayor 6.1
                    const searchLoad = search.create({
                        type: "transaction",
                        settings: [{ "name": "consolidationtype", "value": "NONE" }],
                        filters: [
                            ["memorized", "is", "F"],
                            "AND",
                            ["formulanumeric: NVL({debitamount},0) + NVL({creditamount},0)", "greaterthan", "0"],
                            "AND",
                            ["posting", "is", "T"],
                            "AND",
                            ["formulatext: NVL({account},'X')", "isnot", "X"],
                            "AND",
                            ["formulatext: CASE WHEN  {type} = 'Ejecución de orden de artículo' AND {customform} = 'PE Salida de Consumo interno' THEN '1' ELSE '0' END", "is", "0"],
                            "AND",
                            ["postingperiod", "anyof", params.filterPostingPeriod],
                            "AND",
                            ["subsidiary", "anyof", params.filterSubsidiary]
                        ],
                        columns: [
                            search.createColumn({
                                name: "formulatext",
                                formula: "CONCAT(CONCAT(SUBSTR({postingperiod},5,4), CASE WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'JAN' THEN '01' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'ENE' THEN '01' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'FEB' THEN '02' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'MAR' THEN '03' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'APR' THEN '04' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'ABR' THEN '04' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'MAY' THEN '05' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'JUN' THEN '06' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'JUL' THEN '07' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'AUG' THEN '08' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'AGO' THEN '08' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'SEP' THEN '09' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'SET' THEN '09' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'OCT' THEN '10' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'NOV' THEN '11' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'DEC' THEN '12' WHEN UPPER(SUBSTR({postingperiod},1,3)) = 'DIC' THEN '12' ELSE 'Error' END),'00')",
                                label: "1 Periodo"
                            }),
                            search.createColumn({ name: "internalid", label: "2 CUO" }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CASE   WHEN {custbody_pe_closing_journal} = 'T' THEN      'C' || SUBSTR(TO_CHAR(TO_NUMBER({internalid})),                    GREATEST(LENGTH(TO_CHAR(TO_NUMBER({internalid}))) - (8 - LENGTH(TO_CHAR({linesequencenumber}))) + 1, 1),                    8 - LENGTH(TO_CHAR({linesequencenumber})))           || TO_CHAR({linesequencenumber})             WHEN {custbody_pe_opening_journal} = 'T' THEN      'A' || SUBSTR(TO_CHAR(TO_NUMBER({internalid})),                    GREATEST(LENGTH(TO_CHAR(TO_NUMBER({internalid}))) - (8 - LENGTH(TO_CHAR({linesequencenumber}))) + 1, 1),                    8 - LENGTH(TO_CHAR({linesequencenumber})))           || TO_CHAR({linesequencenumber})             ELSE      'M' || SUBSTR(TO_CHAR(TO_NUMBER({internalid})),                    GREATEST(LENGTH(TO_CHAR(TO_NUMBER({internalid}))) - (8 - LENGTH(TO_CHAR({linesequencenumber}))) + 1, 1),                    8 - LENGTH(TO_CHAR({linesequencenumber})))           || TO_CHAR({linesequencenumber}) END",
                                label: "3 Número correlativo del asiento"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL({account.number}, '9999999999')",
                                label: "4 Código de la cuenta contable"
                            }),
                            search.createColumn({ name: "subsidiarynohierarchy", label: "5 Código de Unidad de Operación" }),
                            search.createColumn({ name: "departmentnohierarchy", label: "6 Centro de Costo" }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "{currency.symbol}",
                                label: "7 Tipo de Moneda de Origen"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "{vendor.custentity_pe_code_document_type}",
                                label: "8 Tipo de documento de identidad del emisor"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "{vendor.vatregnumber}",
                                label: "9 Número de documento de identidad del emisor"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL(NVL({custbody_pe_document_type.custrecord_pe_code_document_type},{custcol_pe_ln_document_type.custrecord_pe_code_document_type}),'00')",
                                label: "10 Tipo de Comprobante"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL({custbody_pe_serie},NVL(NVL({custbody_pe_serie_cxp},{custcol_pe_ln_serie_cxp}),'0'))",
                                label: "11 Número de Serie del comprobante de Pago"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL(NVL({custbody_pe_number},{custcol_pe_ln_number}),'0')",
                                label: "12 Número de compronbante de pago"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CONCAT('01/',TO_CHAR({trandate},'MM/YYYY'))",
                                label: "13 Fecha Contable"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "TO_CHAR({duedate},'DD/MM/YYYY')",
                                label: "14 Fecha de Vencimiento"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "TO_CHAR({trandate},'DD/MM/YYYY')",
                                label: "15 Fecha de la operación o emisión"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL(NVL({memo},{memomain}),{type})",
                                label: "16 Glosa o descripción de la naturaleza de la operación registrada de ser el caso"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "NVL({type},'')",
                                label: "17 Glosa referencial, de ser el caso"
                            }),
                            search.createColumn({
                                name: "formulacurrency",
                                formula: "NVL({debitamount},0)",
                                label: "18 Movimientos del Debe"
                            }),
                            search.createColumn({
                                name: "formulacurrency",
                                formula: "NVL({creditamount},0)",
                                label: "19 Movimiento del  Haber"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CASE WHEN {abbrev} IN ('RCPT', 'INV', 'CREDMEM') THEN '140100'  WHEN {abbrev} IN ('BILL','BILLCREDIT') AND {custbody_pe_document_type.custrecord_pe_code_document_type} IN ('91','97','98','00') THEN '080200' WHEN {abbrev}  IN ('BILL','BILLCREDIT') AND {custbody_pe_document_type.custrecord_pe_code_document_type} NOT IN ('91','97','98','00') THEN '080100' WHEN {abbrev} IN ('EXPREPT') AND {custcol_pe_ln_document_type.custrecord_pe_code_document_type} IS NOT NULL THEN '080100' END",
                                label: "20 Cod Libro"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CONCAT(TO_CHAR({trandate},'YYYYMM'),'00')",
                                label: "20.1 Campo 1"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CASE WHEN {abbrev} IN ('RCPT', 'INV', 'CREDMEM', 'BILL', 'BILLCRED') THEN TO_CHAR({internalid}) WHEN {abbrev} IN ('EXPREPT') THEN CONCAT({internalid},{linesequencenumber}) END",
                                label: "20.2 Campo 2"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "CASE WHEN {abbrev} IN ('RCPT', 'INV', 'CREDMEM', 'BILL', 'BILLCRED') THEN CONCAT('M',TO_CHAR({internalid})) WHEN {abbrev} IN ('EXPREPT') THEN CONCAT('M',CONCAT({internalid},{linesequencenumber})) END",
                                label: "20.3 Campo 3"
                            }),
                            search.createColumn({
                                name: "formulatext",
                                formula: "'1'",
                                label: "21 Indica el estado de la operación"
                            }),
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
                                // Procesar columnas del Libro Mayor 6.1
                                const column01 = result.getValue(searchLoad.columns[0]); // 1 Periodo
                                const column02 = result.getValue(searchLoad.columns[1]); // 2 CUO
                                const column03 = result.getValue(searchLoad.columns[2]); // 3 Número correlativo del asiento
                                const column04 = result.getValue(searchLoad.columns[3]); // 4 Código de la cuenta contable

                                let column05 = result.getValue(searchLoad.columns[4]); // 5 Código de Unidad de Operación
                                if (!column05 || column05 === '-None-' || column05.trim() === '') {
                                    column05 = '';
                                }

                                let column06 = result.getValue(searchLoad.columns[5]); // 6 Centro de Costo
                                if (!column06 || column06 === '-None-' || column06.trim() === '') {
                                    column06 = '';
                                }

                                const column07 = result.getValue(searchLoad.columns[6]); // 7 Tipo de Moneda de Origen

                                let column08 = result.getValue(searchLoad.columns[7]); // 8 Tipo de documento de identidad del emisor
                                if (!column08 || column08 === '-None-' || column08.trim() === '' || column08 == '00') {
                                    column08 = '';
                                }

                                let column09 = result.getValue(searchLoad.columns[8]); // 9 Número de documento de identidad del emisor
                                if (!column09 || column09 === '-None-' || column09.trim() === '') {
                                    column09 = '';
                                }

                                const column10 = result.getValue(searchLoad.columns[9]); // 10 Tipo de Comprobante
                                const column11 = result.getValue(searchLoad.columns[10]); // 11 Número de Serie del comprobante de Pago
                                const column12 = result.getValue(searchLoad.columns[11]); // 12 Número de comprobante de pago
                                const column13 = result.getValue(searchLoad.columns[12]); // 13 Fecha Contable
                                const column14 = result.getValue(searchLoad.columns[13]); // 14 Fecha de Vencimiento
                                const column15 = result.getValue(searchLoad.columns[14]); // 15 Fecha de la operación o emisión

                                let column16 = result.getValue(searchLoad.columns[15]); // 16 Glosa o descripción de la naturaleza de la operación
                                // Limpiar caracteres especiales de la glosa como en el script de referencia
                                column16 = column16.replace(/(\r\n|\n|\r)/gm, "");
                                column16 = column16.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "");

                                const column17 = result.getValue(searchLoad.columns[16]); // 17 Glosa referencial

                                // Formatear montos siguiendo la lógica del script de referencia
                                let column18 = result.getValue(searchLoad.columns[17]); // 18 Movimientos del Debe
                                column18 = parseFloat(column18).toFixed(2);
                                if (column18 <= 0) {
                                    column18 = '0.00';
                                }

                                let column19 = result.getValue(searchLoad.columns[18]); // 19 Movimiento del Haber
                                column19 = parseFloat(column19).toFixed(2);
                                if (column19 <= 0) {
                                    column19 = '0.00';
                                }

                                var column20 = result.getValue(searchLoad.columns[19]); // 20 Cod Libro
                                const column20_1 = result.getValue(searchLoad.columns[20]); // 20.1 Campo 1
                                const column20_2 = result.getValue(searchLoad.columns[21]); // 20.2 Campo 2
                                const column20_3 = result.getValue(searchLoad.columns[22]); // 20.3 Campo 3

                                // Procesar column20 siguiendo la lógica del script de referencia
                                if (column20 != '' && column20_1 != '' && column20_2 != '' && column20_3 != '') {
                                    column20 = column20 + '&' + column20_1 + '&' + column20_2 + '&' + column20_3;
                                } else {
                                    column20 = '';
                                }

                                const column21 = result.getValue(searchLoad.columns[23]); // 21 Indica el estado de la operación

                                // Añadir el registro al array json con la estructura del script de referencia
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
                        let namebase = 'LE' + fedIdNumb + periodostring + '060100' + '00' + '1' + hasinfo + '11';

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
                                params.filterFormat,
                                structuregbody,
                                folderId,
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

        // searchBook función eliminada - no se usa en este script

        const structureBody = (searchResult) => {
            try {
                log.debug('Iniciando structureBody con cantidad de registros', searchResult.length);

                // Usar map y join para mejor rendimiento en lugar de concatenación de strings
                const contentReport = searchResult.map(record => {
                    return [
                        record.c1_periodo,
                        record.c2_cuo,
                        record.c3_nro_correlativo_asiento,
                        record.c4_cod_cuenta_contable,
                        record.c5_cod_unidad_op,
                        record.c6_centro_costo,
                        record.c7_tipo_moneda,
                        record.c8_tipo_doc_entidad_emi,
                        record.c9_nro_doc_entidad_emi,
                        record.c10_tipo_comprobante,
                        record.c11_nro_serie_comprobante,
                        record.c12_nro_comprobante_pago,
                        record.c13_fecha_contable,
                        record.c14_fecha_vencimiento,
                        record.c15_fecha_op_emision,
                        record.c16_glosa_des_natu_op_reg,
                        record.c17_glosa_ref_caso,
                        record.c18_mov_debe,
                        record.c19_mov_haber,
                        record.c20_cod_libro,
                        record.c21_20_1_campo1
                    ].join('|') + '|'; // Agregar pipe final después del último campo
                }).join('\n') + '\n';

                log.debug('structureBody completado', `Total de líneas: ${searchResult.length}`);
                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
                throw new Error("Error en la estructuración del cuerpo: " + e.message);
            }
        }

        // findDuplicates función eliminada - no se usa en este script

        const createFile = (filterFormat, structuregbody, fileCabinetId, newName) => {
            let typeformat;
            const header = '1 Periodo|2 CUO|3 Número correlativo del asiento|4 Código de la cuenta contable|5 Código de Unidad de Operación|6 Centro de Costo|7 Tipo de Moneda de Origen|8 Tipo de documento de identidad del emisor' +
                '|9 Número de documento de identidad del emisor|10 Tipo de Comprobante|11 Número de Serie del comprobante de Pago|12 Número de compronbante de pago|13 Fecha Contable|14 Fecha de Vencimiento|15 Fecha de la operación o emisión' +
                '|16 Glosa o descripción de la naturaleza de la operación registrada de ser el caso|17 Glosa referencial, de ser el caso|18 Movimientos del Debe|19 Movimiento del Haber|20 Cod Libro|20.1 Campo 1|\n';
            try {
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
                    // PDF no soportado para Libro Mayor 6.1 - usar CSV o TXT
                    throw new Error('Formato PDF no soportado para Libro Mayor 6.1');
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

        return { execute }

    });
