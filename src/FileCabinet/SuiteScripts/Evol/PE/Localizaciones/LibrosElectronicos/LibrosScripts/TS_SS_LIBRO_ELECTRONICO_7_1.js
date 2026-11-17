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

        const SCRIPT_ID = 'customscript_ts_ss_le_7_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_7_1';
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
                    const searchId = 'customsearch_pe_reporte_7_1';
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

        const searchBook = (subsidiary, anioperiod, searchId, featureSubsidiary) => {
            log.debug("anioperiod", anioperiod);
            let json = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            let flag = ''
            try {
                const searchLoad = search.load({ id: searchId });

                let filters = searchLoad.filters;

                // const filterOne = search.createFilter({
                //     name: 'postingperiod',
                //     operator: search.Operator.ANYOF,
                //     values: period
                // });

                // filters.push(filterOne);

                if (featureSubsidiary) {
                    const filterTwo = search.createFilter({
                        name: 'custrecord_deprhistsubsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters.push(filterTwo);
                }
                const searchResultCount = searchLoad.runPaged().count;
                //const periodname = getPeriodName(period);
                log.debug('Count - MSK', "cantidad: " + searchResultCount)
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
                            const column08 = result.getValue(searchLoad.columns[7]);
                            const column09 = result.getValue(searchLoad.columns[8]);
                            const column10 = result.getValue(searchLoad.columns[9]);
                            const column11 = result.getValue(searchLoad.columns[10]);
                            const column12 = result.getValue(searchLoad.columns[11]);
                            const column13 = result.getValue(searchLoad.columns[12]);
                            const column14 = result.getValue(searchLoad.columns[13]);
                            const column15 = result.getValue(searchLoad.columns[14]);
                            const column16 = result.getValue(searchLoad.columns[15]);
                            const column17 = result.getValue(searchLoad.columns[16]);
                            const column18 = result.getValue(searchLoad.columns[17]);
                            const column19 = result.getValue(searchLoad.columns[18]);
                            const column20 = result.getValue(searchLoad.columns[19]);
                            const column21 = result.getValue(searchLoad.columns[20]);
                            const column22 = result.getValue(searchLoad.columns[21]);
                            const column23 = result.getValue(searchLoad.columns[22]);
                            const column24 = result.getValue(searchLoad.columns[23]);
                            const column25 = result.getValue(searchLoad.columns[24]);
                            const column26 = result.getValue(searchLoad.columns[25]);
                            const column27 = result.getValue(searchLoad.columns[26]);
                            const column28 = result.getValue(searchLoad.columns[27]);
                            const column29 = result.getValue(searchLoad.columns[28]);
                            const column30 = result.getValue(searchLoad.columns[29]);
                            const column31 = result.getValue(searchLoad.columns[30]);
                            const column32 = result.getValue(searchLoad.columns[31]);
                            const column33 = result.getValue(searchLoad.columns[32]);
                            const column34 = result.getValue(searchLoad.columns[33]);
                            const column35 = result.getValue(searchLoad.columns[34]);
                            const column36 = result.getValue(searchLoad.columns[35]);
                            const column37 = result.getValue(searchLoad.columns[36]);

                            log.debug('MSK', 'column06 = ' + column06 + ', column07 = ' + column07 + ', column08 = ' + column08 + ', column09 = ' + column09)

                            if (column01 == anioperiod + "0000") {
                                json.push({
                                    c1_: column01,
                                    c2_: column02,
                                    c3_: column03,
                                    c4_: column04,
                                    c5_: column05,
                                    c6_: (column06 == "- None -" ? "" : column06),
                                    c7_: (column07 == "- None -" ? "" : column07),
                                    c8_: column08,
                                    c9_: (column09 == "- None -" ? "" : column09),
                                    c10_: column10,
                                    c11_: column11,
                                    c12_: column12,
                                    c13_: column13,
                                    c14_: column14,

                                    c15_: (column15 == ".00" ? "0.00" : column15),
                                    c16_: (column16 == ".00" ? "0.00" : column16),
                                    c17_: (column17 == ".00" ? "0.00" : numberWithCommas(column17)),
                                    c18_: (column18 == ".00" ? "0.00" : (column18)),
                                    c19_: (column19 == ".00" ? "0.00" : (column19)),
                                    c20_: (column20 == ".00" ? "0.00" : (column20)),
                                    c21_: (column21 == ".00" ? "0.00" : numberWithCommas(column21)),
                                    c22_: (column22 == ".00" ? "0.00" : numberWithCommas(column22)),
                                    c23_: (column23 == ".00" ? "0.00" : numberWithCommas(column23)),

                                    c24_: column24,
                                    c25_: column25,
                                    c26_: column26,
                                    c27_: column27,

                                    c28_: (column28 == ".00" ? "0.00" : column28),
                                    c29_: (parseFloat(column29 == ".00" ? "0.00" : column29).toFixed(2)),
                                    c30_: (parseFloat(column30 == ".00" ? "0.00" : column30).toFixed(2)),
                                    c31_: (column31 == ".00" ? "0.00" : column31),

                                    c32_: (column32 == ".00" ? "0.00" : numberWithCommas(column32)),
                                    c33_: (column33 == ".00" ? "0.00" : numberWithCommas(column33)),
                                    c34_: (column34 == ".00" ? "0.00" : numberWithCommas(column34)),
                                    c35_: (column35 == ".00" ? "0.00" : numberWithCommas(column35)),
                                    c36_: (column36 == ".00" ? "0.00" : numberWithCommas(column36)),
                                    c37_: column37
                                });
                            }

                            return true;
                        });

                        log.debug('Json', json);
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
                                const column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                const column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                const column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                const column19 = searchResult[j].getValue(searchLoad.columns[18]);
                                const column20 = searchResult[j].getValue(searchLoad.columns[19]);
                                const column21 = searchResult[j].getValue(searchLoad.columns[20]);
                                const column22 = searchResult[j].getValue(searchLoad.columns[21]);
                                const column23 = searchResult[j].getValue(searchLoad.columns[22]);
                                const column24 = searchResult[j].getValue(searchLoad.columns[23]);
                                const column25 = searchResult[j].getValue(searchLoad.columns[24]);
                                const column26 = searchResult[j].getValue(searchLoad.columns[25]);
                                const column27 = searchResult[j].getValue(searchLoad.columns[26]);
                                const column28 = searchResult[j].getValue(searchLoad.columns[27]);
                                const column29 = searchResult[j].getValue(searchLoad.columns[28]);
                                const column30 = searchResult[j].getValue(searchLoad.columns[29]);
                                const column31 = searchResult[j].getValue(searchLoad.columns[30]);
                                const column32 = searchResult[j].getValue(searchLoad.columns[31]);
                                const column33 = searchResult[j].getValue(searchLoad.columns[32]);
                                const column34 = searchResult[j].getValue(searchLoad.columns[33]);
                                const column35 = searchResult[j].getValue(searchLoad.columns[34]);
                                const column36 = searchResult[j].getValue(searchLoad.columns[35]);
                                const column37 = searchResult[j].getValue(searchLoad.columns[36]);
                                // log.debug('MSK','anioperiod-2 = '+anioperiod+', column01-2 = '+column01)
                                if (column01 == anioperiod + "0000") {
                                    json.push({
                                        c1_: column01,
                                        c2_: column02,
                                        c3_: column03,
                                        c4_: column04,
                                        c5_: column05,
                                        c6_: (column06 == "- None -" ? "" : column06),
                                        c7_: (column07 == "- None -" ? "" : column07),
                                        c8_: column08,
                                        c9_: (column09 == "- None -" ? "" : column09),
                                        c10_: column10,
                                        c11_: column11,
                                        c12_: column12,
                                        c13_: column13,
                                        c14_: column14,

                                        c15_: (column15 == ".00" ? "0.00" : column15),
                                        c16_: (column16 == ".00" ? "0.00" : column16),
                                        c17_: (column17 == ".00" ? "0.00" : numberWithCommas(column17)),
                                        c18_: (column18 == ".00" ? "0.00" : (column18)),
                                        c19_: (column19 == ".00" ? "0.00" : (column19)),
                                        c20_: (column20 == ".00" ? "0.00" : (column20)),
                                        c21_: (column21 == ".00" ? "0.00" : numberWithCommas(column21)),
                                        c22_: (column22 == ".00" ? "0.00" : numberWithCommas(column22)),
                                        c23_: (column23 == ".00" ? "0.00" : numberWithCommas(column23)),

                                        c24_: column24,
                                        c25_: column25,
                                        c26_: column26,
                                        c27_: column27,

                                        c28_: (column28 == ".00" ? "0.00" : column28),
                                        c29_: (parseFloat(column29 == ".00" ? "0.00" : column29).toFixed(2)),
                                        c30_: (parseFloat(column30 == ".00" ? "0.00" : column30).toFixed(2)),
                                        c31_: (column31 == ".00" ? "0.00" : column31),

                                        c32_: (column32 == ".00" ? "0.00" : numberWithCommas(column32)),
                                        c33_: (column33 == ".00" ? "0.00" : numberWithCommas(column33)),
                                        c34_: (column34 == ".00" ? "0.00" : numberWithCommas(column34)),
                                        c35_: (column35 == ".00" ? "0.00" : numberWithCommas(column35)),
                                        c36_: (column36 == ".00" ? "0.00" : numberWithCommas(column36)),
                                        c37_: column37
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
                } else {
                    return { thereisinfo: 0 }
                }
            } catch (e) {
                log.debug('MSK', 'traza error:' + e)
                log.error({ title: 'searchBook', details: e });
            }
        }

        const structureBody = (searchResult) => {
            let contentReport = '';
            try {
                for (let i in searchResult) {
                    contentReport =
                        contentReport +
                        searchResult[i].c1_ + '|' +
                        searchResult[i].c2_ + '|' +
                        searchResult[i].c3_ + '|' +
                        searchResult[i].c4_ + '|' +
                        searchResult[i].c5_ + '|' +
                        searchResult[i].c6_ + '|' +
                        searchResult[i].c7_ + '|' +
                        searchResult[i].c8_ + '|' +
                        searchResult[i].c9_ + '|' +
                        searchResult[i].c10_ + '|' +
                        searchResult[i].c11_ + '|' +
                        searchResult[i].c12_ + '|' +
                        searchResult[i].c13_ + '|' +
                        searchResult[i].c14_ + '|' +
                        searchResult[i].c15_ + '|' +
                        searchResult[i].c16_ + '|' +
                        searchResult[i].c17_ + '|' +
                        searchResult[i].c18_ + '|' +
                        searchResult[i].c19_ + '|' +
                        searchResult[i].c20_ + '|' +
                        searchResult[i].c21_ + '|' +
                        searchResult[i].c22_ + '|' +
                        searchResult[i].c23_ + '|' +
                        searchResult[i].c24_ + '|' +
                        searchResult[i].c25_ + '|' +
                        searchResult[i].c26_ + '|' +
                        searchResult[i].c27_ + '|' +
                        searchResult[i].c28_ + '|' +
                        searchResult[i].c29_ + '|' +
                        searchResult[i].c30_ + '|' +
                        searchResult[i].c31_ + '|' +
                        searchResult[i].c32_ + '|' +
                        searchResult[i].c33_ + '|' +
                        searchResult[i].c34_ + '|' +
                        searchResult[i].c35_ + '|' +
                        searchResult[i].c36_ + '|' +
                        searchResult[i].c37_ + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }

        const createFile = (filterPostingPeriod, fedIdNumb, hasinfo, recordlogid, filterFormat, structuregbody, fileCabinetId, transactionJSON, params) => {
            let typeformat;
            const header = '1 PERIODO'
                + '|2 CUO'
                + '|3 CORRELATIVO'
                + '|4 CODIGO DE CATALOGO UTILIZADO'
                + '|5 CODIGO PROPIO DEL ACTIVO FIJO CORRESPONDIENTE AL CATALOGO SENALADO EN EL CAMPO 4'
                + '|6 CODIGO DE CATALOGO UTILIZADO'
                + '|7 CODIGO DE EXISTENCIA CORRESPONDIENTE AL CATALOGO SENALADO EN EL CAMPO 6'
                + '|8 CODIGO DEL TIPO DE ACTIVO FIJO (VALIDAR CON PARAMETRO TABLA 18)'
                + '|9 CODIGO DE LA CUENTA CONTABLE DEL ACTIVO FIJO'
                + '|10 ESTADO DEL ACTIVO FIJO (VALIDAR CON PARAMETRO TABLA 19)'
                + '|11 DESCRIPCION DEL ACTIVO FIJO'
                + '|12 MARCA DEL ACTIVO FIJO'
                + '|13 MODELO DEL ACTIVO FIJO'
                + '|14 NUMERO DE SERIE Y/O PLACA DEL ACTIVO FIJO'
                + '|15 IMPORTE DEL SALDO INICIAL DEL ACTIVO FIJO '
                + '|16 ADQUISICION'
                + '|17 IMPORTE DE LAS MEJORAS DEL ACTIVO FIJO'
                + '|18 IMPORTE DE LOS RETIROS Y/O BAJAS DEL ACTIVO FIJO'
                + '|19 IMPORTE POR OTROS AJUSTES EN EL VALOR DEL ACTIVO FIJO'
                + '|20 VALOR DE LA REVALUACION VOLUNTARIA EFECTUADA'
                + '|21 VALOR DE LA REVALUACION EFECTUADA POR REORGANIZACION DE SOCIEDADES'
                + '|22 VALOR DE OTRAS REVALUACIONES EFECTUADA'
                + '|23 IMPORTE DEL VALOR DEL AJUSTE POR INFLACION DEL ACTIVO FIJO'
                + '|24 FECHA DE ADQUISICION DEL ACTIVO FIJO'
                + '|25 FECHA DE INICIO DEL USO DEL ACTIVO FIJO'
                + '|26 CODIGO DEL MÉTODO APLICADO EN EL CALCULO DE LA DEPRECIACION'
                + '|27 NUMERO DE DOCUMENTO DE AUTORIZACION PARA CAMBIAR EL MÉTODO DE LA DEPRECIACION'
                + '|FORMULA (NUMÉRICA)'
                + '|29 DEPRECIACION ACUMULADA AL CIERRE DEL EJERCICIO ANTERIOR.'
                + '|30 VALOR DE LA DEPRECIACION DEL EJERCICIO SIN CONSIDERAR LA REVALUACION'
                + '|31 VALOR DE LA DEPRECIACION DEL EJERCICIO RELACIONADA CON LOS RETIROS Y/O BAJAS DEL ACTIVO FIJO'
                + '|32 VALOR DE LA DEPRECIACION RELACIONADA CON OTROS AJUSTES'
                + '|33 VALOR DE LA DEPRECIACION DE LA REVALUACION VOLUNTARIA EFECTUADA'
                + '|34 VALOR DE LA DEPRECIACION DE LA REVALUACION EFECTUADA POR REORGANIZACION DE SOCIEDADES'
                + '|35 VALOR DE LA DEPRECIACION DE OTRAS REVALUACIONES EFECTUADAS'
                + '|36 VALOR DEL AJUSTE POR INFLACION DE LA DEPRECIACION'
                + '|37 INDICA EL ESTADO DE LA OPERACION'
                + '|\n';
            try {
                /*
                                var perLookup = search.lookupFields({
                                    type: search.Type.ACCOUNTING_PERIOD,
                                    id: filterPostingPeriod,
                                    columns: ['periodname', 'startdate']
                                });
                                var periodoFinDate = format.parse({
                                    type: format.Type.DATE,
                                    value: perLookup.startdate
                                });*/
                var periodoFinDate = params.filterPostingPeriod;
                const periodostring = periodoFinDate + '00' + '00';
                // const periodname = getPeriodName(filterPostingPeriod);
                // const periodostring = retornaPeriodoString(periodname);

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '070100' + '00' + '1111';
                let jsonAxiliar = getJsonData(transactionJSON, params);
                if (filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (filterFormat == 'TXT') {
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (filterFormat == 'PDF') {
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
            log.debug('MSK', 'getTransactions - Inicio');
            var arrResult = [];
            var _cont = 0;

            // FORMATO 7.1: "Registro de Activos Fijos 7.1"
            var savedSearch = search.load({ id: 'customsearch_pe_reporte_7_1' });

            log.debug('pGloblas.pSubsidiary', params.filterSubsidiary)
            if (params.filterSubsidiary) {
                savedSearch.filters.push(search.createFilter({
                    name: 'custrecord_deprhistsubsidiary',
                    operator: search.Operator.IS,
                    values: params.filterSubsidiary
                }));
            }
            /*
            savedSearch.filters.push(search.createFilter({
            name: 'postingperiod',
            operator: search.Operator.IS,
            values: [params.filterPostingPeriod]
            }));*/

            savedSearch.filters.push(search.createFilter({
                name: 'formulatext',
                formula: "CONCAT(SUBSTR({custrecord_deprhistdate},7,4), '0000')",
                operator: search.Operator.IS,
                values: params.filterPostingPeriod + '0000'
            }));


            // savedSearch.filters.push(search.createFilter({
            //     name: 'account',
            //     operator: search.Operator.IS,
            //     values: pGloblas.pCuentaId
            // }));

            // Agregar filtro para el año 2023
            // savedSearch.filters.push(search.createFilter({
            //     name: 'postingperiod',
            //     operator: search.Operator.WITHIN,
            //     values: ['startofyear', 'endofyear', 'FY'+pGloblas.pAnio]
            // }));
            // savedSearch.filters.push(search.createFilter({
            //     name: 'periodname',
            //     join: 'accountingPeriod',
            //     operator: search.Operator.CONTAINS,
            //     values: pGloblas.pAnio
            // }));

            log.debug('MSK', 'pGloblas.pAnio =>')
            log.debug('MSK', 'antes del pagedData')

            var pagedData = savedSearch.runPaged({ pageSize: 1000 });
            log.debug('MSK', 'despues del pagedData')

            var page, columns;

            var cont = 0
            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index
                });

                page.data.forEach(function (result) {
                    columns = result.columns;
                    arrAux = {};
                    cont++

                    //TEMPORAL
                    //if(cont<100)
                    {
                        arrAux["col_01_periodo"] = result.getValue(columns[0]);

                        arrAux["col_02_cuo"] = result.getValue(columns[1]);

                        arrAux["col_03_correltivo"] = result.getValue(columns[2]);

                        arrAux["col_04_codCatUtilizado"] = result.getValue(columns[3]);

                        arrAux["col_05_codPropioActivo"] = result.getValue(columns[4]);

                        arrAux["col_06_codCatUtil"] = result.getValue(columns[5]);

                        arrAux["col_07_codExistencia"] = result.getValue(columns[6]);

                        arrAux["col_08"] = result.getValue(columns[7]);

                        arrAux["col_09"] = result.getValue(columns[8]);

                        arrAux["col_10"] = result.getValue(columns[9]);
                        arrAux["col_11"] = result.getValue(columns[10]);
                        arrAux["col_12"] = result.getValue(columns[11]);
                        arrAux["col_13"] = result.getValue(columns[12]);
                        arrAux["col_14"] = result.getValue(columns[13]);
                        arrAux["col_15"] = result.getValue(columns[14]);
                        arrAux["col_16"] = result.getValue(columns[15]);
                        arrAux["col_17"] = result.getValue(columns[16]);
                        arrAux["col_18"] = result.getValue(columns[17]);
                        arrAux["col_19"] = result.getValue(columns[18]);
                        arrAux["col_20"] = result.getValue(columns[19]);
                        arrAux["col_21"] = result.getValue(columns[20]);
                        arrAux["col_22"] = result.getValue(columns[21]);
                        arrAux["col_23"] = result.getValue(columns[22]);
                        arrAux["col_24"] = result.getValue(columns[23]);
                        arrAux["col_25"] = result.getValue(columns[24]);
                        arrAux["col_26"] = result.getValue(columns[25]);
                        arrAux["col_27"] = result.getValue(columns[26]);
                        arrAux["col_28"] = result.getValue(columns[27]);
                        arrAux["col_29"] = result.getValue(columns[28]);
                        arrAux["col_30"] = result.getValue(columns[29]);
                        arrAux["col_31"] = result.getValue(columns[30]);
                        arrAux["col_32"] = result.getValue(columns[31]);
                        arrAux["col_33"] = result.getValue(columns[32]);
                        arrAux["col_34"] = result.getValue(columns[33]);
                        arrAux["col_35"] = result.getValue(columns[34]);
                        arrAux["col_36"] = result.getValue(columns[35]);
                        arrAux["col_37"] = result.getValue(columns[36]);

                        arrResult.push(arrAux);
                    }

                });
            });
            log.debug('MSK', 'cont = ' + cont)
            log.debug('MSK', 'getTransactions - Fin');
            return arrResult;
        }

        const getJsonData = (transactions, params) => {
            //log.debug('MSK', 'getJsonData - Inicio');
            let userTemp = runtime.getCurrentUser(),
                useID = userTemp.id,
                jsonTransacion = new Array();
            let totalMonto_15 = 0;
            let totalMonto_16 = 0;
            let totalMonto_17 = 0;
            let totalMonto_18 = 0;
            let totalMonto_19 = 0;
            let totalMonto_20 = 0;
            let totalMonto_21 = 0;
            let totalMonto_22 = 0;
            let totalMonto_23 = 0;
            let totalMonto_28 = 0;
            let totalMonto_29 = 0;
            let totalMonto_30 = 0;
            let totalMonto_35 = 0;

            var employeeName = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: useID,
                columns: ['firstname', 'lastname']
            });
            var userName = employeeName.firstname + ' ' + employeeName.lastname;

            //log.debug('transactions', transactions);

            for (var k in transactions) {
                let IDD = transactions[k].col_02_cuo;
                aux = {
                    col_01_periodo: transactions[k].col_01_periodo,
                    col_02_cuo: transactions[k].col_02_cuo,
                    col_03_correltivo: transactions[k].col_03_correltivo,
                    col_04_codCatUtilizado: transactions[k].col_04_codCatUtilizado,
                    col_05_codPropioActivo: transactions[k].col_05_codPropioActivo,
                    col_06_codCatUtil: transactions[k].col_06_codCatUtil,
                    col_07_codExistencia: transactions[k].col_07_codExistencia,
                    col_08: transactions[k].col_08,
                    col_09: transactions[k].col_09,
                    col_10: transactions[k].col_10,
                    col_11: transactions[k].col_11,
                    col_12: transactions[k].col_12,
                    col_13: transactions[k].col_13,
                    col_14: transactions[k].col_14,
                    col_15: numberWithCommas(roundTwoDecimals(transactions[k].col_15).toFixed(2)),
                    col_16: numberWithCommas(roundTwoDecimals(transactions[k].col_16).toFixed(2)),
                    col_17: numberWithCommas(roundTwoDecimals(transactions[k].col_17).toFixed(2)),
                    col_18: numberWithCommas(roundTwoDecimals(transactions[k].col_18).toFixed(2)),
                    col_19: numberWithCommas(roundTwoDecimals(transactions[k].col_19).toFixed(2)),
                    col_20: numberWithCommas(roundTwoDecimals(transactions[k].col_20).toFixed(2)),
                    col_21: numberWithCommas(roundTwoDecimals(transactions[k].col_21).toFixed(2)),
                    col_22: numberWithCommas(roundTwoDecimals(transactions[k].col_22).toFixed(2)),
                    col_23: numberWithCommas(roundTwoDecimals(transactions[k].col_23).toFixed(2)),
                    col_24: transactions[k].col_24,
                    col_25: transactions[k].col_25,
                    col_26: transactions[k].col_26,
                    col_27: transactions[k].col_27,
                    col_28: numberWithCommas(roundTwoDecimals(transactions[k].col_28).toFixed(2)),
                    col_29: numberWithCommas(roundTwoDecimals(transactions[k].col_29).toFixed(2)),
                    col_30: numberWithCommas(roundTwoDecimals(transactions[k].col_30).toFixed(2)),
                    col_31: transactions[k].col_31,
                    col_32: transactions[k].col_32,
                    col_33: transactions[k].col_33,
                    col_34: transactions[k].col_34,
                    col_35: transactions[k].col_35,
                    col_36: transactions[k].col_36,
                    col_37: transactions[k].col_37
                }
                jsonTransacion.push(aux);
                totalMonto_15 = totalMonto_15 + Number(transactions[k].col_15);
                totalMonto_16 = totalMonto_16 + Number(transactions[k].col_16);
                totalMonto_17 = totalMonto_17 + Number(transactions[k].col_17);
                totalMonto_18 = totalMonto_18 + Number(transactions[k].col_18);
                totalMonto_19 = totalMonto_19 + Number(transactions[k].col_19);
                totalMonto_20 = totalMonto_20 + Number(transactions[k].col_20);
                totalMonto_21 = totalMonto_21 + Number(transactions[k].col_21);
                totalMonto_22 = totalMonto_22 + Number(transactions[k].col_22);
                totalMonto_23 = totalMonto_23 + Number(transactions[k].col_23);
                totalMonto_28 = totalMonto_28 + Number(transactions[k].col_28);
                totalMonto_29 = totalMonto_29 + Number(transactions[k].col_29);
                totalMonto_30 = totalMonto_30 + Number(transactions[k].col_30);
                totalMonto_35 = totalMonto_35 + Number(transactions[k].col_35);

                hasInfo = 1;

            }


            var dataSubsidiary = record.load({
                type: "subsidiary",
                id: params.filterSubsidiary,
            });

            let companyName = dataSubsidiary.getValue("legalname");
            let companyRuc = dataSubsidiary.getValue("federalidnumber");

            log.debug('jsonTransacion', jsonTransacion);
            //totalMonto_15 = numberFormat(totalMonto_15);

            // let periodSearch = search.lookupFields({
            //     type: search.Type.ACCOUNTING_PERIOD,
            //     id: pGloblas.pPeriod,
            //     columns: ['periodname']
            // });
            // let accountSearch = search.lookupFields({
            //     type: "account",
            //     id: pGloblas.pCuentaId,
            //     columns: ['custrecord_pe_bank','custrecord_pe_bank_account']
            // });
            //year = pGloblas.pAnio
            year = "2024"

            let jsonAxiliar = {
                "company": {
                    "firtTitle": companyName.replace(/&/g, '&amp;'),
                    "secondTitle": 'Expresado en Moneda Nacional',
                    "thirdTitle": 'FORMATO 7.1: "REGISTRO DE ACTIVOS FIJOS - DETALLE DE LOS ACTIVOS FIJOS" - ' + year,
                },
                "cabecera": {
                    "Anio": year,
                    "ruc": companyRuc,
                    "razonSocial": companyName.replace(/&/g, '&amp;').toUpperCase(),
                    // "entidadFinanciera":accountSearch.custrecord_pe_bank[0].text,
                    // "codigoCuentaCorriente":accountSearch.custrecord_pe_bank_account
                },
                "total": {
                    "totalMonto_15": numberWithCommas(roundTwoDecimals(totalMonto_15).toFixed(2)),
                    "totalMonto_16": numberWithCommas(roundTwoDecimals(totalMonto_16).toFixed(2)),
                    "totalMonto_17": numberWithCommas(roundTwoDecimals(totalMonto_17).toFixed(2)),
                    "totalMonto_18": numberWithCommas(roundTwoDecimals(totalMonto_18).toFixed(2)),
                    "totalMonto_19": numberWithCommas(roundTwoDecimals(totalMonto_19).toFixed(2)),
                    "totalMonto_20": numberWithCommas(roundTwoDecimals(totalMonto_20).toFixed(2)),
                    "totalMonto_21": numberWithCommas(roundTwoDecimals(totalMonto_21).toFixed(2)),
                    "totalMonto_22": numberWithCommas(roundTwoDecimals(totalMonto_22).toFixed(2)),
                    "totalMonto_23": numberWithCommas(roundTwoDecimals(totalMonto_23).toFixed(2)),
                    "totalMonto_28": numberWithCommas(roundTwoDecimals(totalMonto_28).toFixed(2)),
                    "totalMonto_29": numberWithCommas(roundTwoDecimals(totalMonto_29).toFixed(2)),
                    "totalMonto_30": numberWithCommas(roundTwoDecimals(totalMonto_30).toFixed(2)),
                    "totalMonto_35": numberWithCommas(roundTwoDecimals(totalMonto_35).toFixed(2)),
                },
                "movements": jsonTransacion

            };

            //log.debug('MSK - jsonAxiliar', jsonAxiliar);
            return jsonAxiliar;
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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_7_1.ftl");
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
