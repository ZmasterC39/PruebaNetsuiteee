/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config", "N/render"],

    (search, record, runtime, log, file, task, config, render) => {
        /**
    * Defines the Scheduled script trigger point.
    * @param {Object} scriptContext 
    * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
    * @since 2015.2
    */

        const SCRIPT_ID = 'customscript_ts_ss_le_balance_mensual';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_balance_mensual';
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
                const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                const searchId = 'customsearch_pe_bc_mensual'; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1 
                let fedIdNumb = '';
                let hasinfo = 0;
        
                const params = getParams(parametros);
        
                if (featureSubsidiary) {
                    const getruc = getRUC(params.filterSubsidiary);
                    fedIdNumb = getruc;
                    let periodoFecha = getPeriodName(params.filterPostingPeriod);
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
        
                log.debug({ title: 'Resultados de la búsqueda', details: JSON.stringify(searchbook) });
        
                if (searchbook.thereisinfo == 1) {
                    hasinfo = "1";
                    const transactionJSON = searchbook.content;
                    const createfile = createFile(params, fedIdNumb, hasinfo, params.filterFormat, transactionJSON, params.fileCabinetId, params.filterAnioPeriod);
        
                    // Asegúrate de que el ID del archivo se pasa correctamente
                    if (createfile) {
                        log.debug({ title: 'ID del archivo creado', details: createfile });
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
                        log.error({ title: 'Error', details: 'No se pudo crear el archivo' });
                    }
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
                const params = {
                    filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
                    filterPostingPeriod: parametros.custbody_ts_le_periodo,
                    filterFormat: parametros.salida_reporte_nombre,
                    fileCabinetId: parametros.salida_folder,
                    filterAnioPeriod: parametros.custbody_ts_le_anio_contable
                };
                log.debug({ title: 'Parámetros Capturados', details: JSON.stringify(params) });
                return params;
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
                recordlog.setValue({ fieldId: 'custrecord_pe_period_log', value: null });//filterPostingPeriod
                recordlog.setValue({ fieldId: 'custrecord_pe_status_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_report_log', value: "Procesando..." });
                recordlog.setValue({ fieldId: 'custrecord_pe_book_log', value: 'Inventario y Balance 3.17' });
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
                //Periodo
                const searchResultCount = searchLoad.runPaged().count;
                const periodname = getPeriodName(period);
                const periodostring = retornaPeriodoStringForView(periodname);
                const PeriodoCompleto = func(periodostring.valorAnio, periodostring.valorMes);
                log.debug('PERIODO', PeriodoCompleto);
 
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let column01 = result.getValue(searchLoad.columns[0]);
                            //column01 = column01.split('/');
                            //const PeriodoCompleto = func(column01[0], column01[1]);
                            let column02 = result.getValue(searchLoad.columns[1]);
                            if (column02 == '- None -') {
                                column02 = ''
                            }
                            let column03 = result.getValue(searchLoad.columns[2]);
                            column03 = parseFloat(column03).toFixed(2);
                            column03 = (column03);
                            if (column03 <= 0) {
                                column03 = '0.00';
                            }
                            let column04 = result.getValue(searchLoad.columns[3]);
                            column04 = parseFloat(column04).toFixed(2);
                            column04 = (column04);

                            if (column04 <= 0) {
                                column04 = '0.00'

                            }
                            let column05 = result.getValue(searchLoad.columns[4]);
                            column05 = parseFloat(column05).toFixed(2);
                            column05 = (column05);
                            if (column05 <= 0) {
                                column05 = '0.00'
                            }
                            let column06 = result.getValue(searchLoad.columns[5]);
                            column06 = parseFloat(column06).toFixed(2);
                            column06 = (column06);
                            if (column06 <= 0) {
                                column06 = '0.00'
                            }
                            let column07 = result.getValue(searchLoad.columns[6]);
                            column07 = parseFloat(column07).toFixed(2);
                            column07 = (column07);
                            if (column07 <= 0) {
                                column07 = '0.00'
                            }
                            let column08 = result.getValue(searchLoad.columns[7]);
                            column08 = parseFloat(column08).toFixed(2);
                            column08 = (column08);
                            if (column08 <= 0) {
                                column08 = '0.00'
                            }
                            let column09 = result.getValue(searchLoad.columns[8]);
                            column09 = parseFloat(column09).toFixed(2);
                            column09 = (column09);
                            if (column09 <= 0) {
                                column09 = '0.00'
                            }
                            let column10 = result.getValue(searchLoad.columns[9]);
                            column10 = parseFloat(column10).toFixed(2);
                            column10 = (column10);
                            if (column10 <= 0) {
                                column10 = '0.00'
                            }
                            let column11 = result.getValue(searchLoad.columns[10]);
                            column11 = parseFloat(column11).toFixed(2);
                            column11 = (column11);
                            if (column11 <= 0) {
                                column11 = '0.00'
                            }
                            let column12 = result.getValue(searchLoad.columns[11]);
                            column12 = parseFloat(column12).toFixed(2);
                            column12 = (column12);
                            if (column12 <= 0) {
                                column12 = '0.00'
                            }
                            let column13 = result.getValue(searchLoad.columns[12]);
                            column13 = parseFloat(column13).toFixed(2);
                            column13 = (column13);
                            if (column13 <= 0) {
                                column13 = '0.00'
                            }
                            let column14 = result.getValue(searchLoad.columns[13]);
                            column14 = parseFloat(column14).toFixed(2);
                            column14 = (column14);
                            if (column14 <= 0) {
                                column14 = '0.00'
                            }
                            let column15 = result.getValue(searchLoad.columns[14]);
                            column15 = parseFloat(column15).toFixed(2);
                            column15 = (column15);
                            if (column15 <= 0) {
                                column15 = '0.00'
                            }
                            let column16 = result.getValue(searchLoad.columns[15]);
                            column16 = parseFloat(column16).toFixed(2);
                            column16 = (column16);

                            if (column16 <= 0) {
                                column16 = '0.00'
                            }
                            let column17 = result.getValue(searchLoad.columns[16]);
                            column17 = parseFloat(column17).toFixed(2);
                            column17 = (column17);
                            if (column17 <= 0) {
                                column17 = '0.00'
                            }
                            let column18 = result.getValue(searchLoad.columns[17]);
                            column18 = parseFloat(column18).toFixed(2);
                            column18 = (column18);
                            if (column18 <= 0) {
                                column18 = '0.00'
                            }
                            const column19 = result.getValue(searchLoad.columns[18]);
                            let column20 = result.getValue(searchLoad.columns[19]);
                            //Campos PDF
                            let column21 = result.getValue(searchLoad.columns[20]);
                            let column22 = result.getValue(searchLoad.columns[2]);
                            column22 = parseFloat(column22).toFixed(2);
                            column22 = (column22);
                            let column23 = result.getValue(searchLoad.columns[3]);
                            column23 = parseFloat(column23).toFixed(2);
                            column23 = (column23);
                            let column24 = result.getValue(searchLoad.columns[4]);
                            column24 = parseFloat(column24).toFixed(2);
                            column24 = (column24);
                            let column25 = result.getValue(searchLoad.columns[5]);
                            column25 = parseFloat(column25).toFixed(2);
                            column25 = (column25);
                            let column26 = result.getValue(searchLoad.columns[6]);
                            column26 = parseFloat(column26).toFixed(2);
                            column26 = (column26);
                            let column27 = result.getValue(searchLoad.columns[7]);
                            column27 = parseFloat(column27).toFixed(2);
                            column27 = (column27);
                            let column28 = result.getValue(searchLoad.columns[12]);
                            column28 = parseFloat(column28).toFixed(2);
                            column28 = (column28);
                            let column29 = result.getValue(searchLoad.columns[13]);
                            column29 = parseFloat(column29).toFixed(2);
                            column29 = (column29);
                            let column30 = result.getValue(searchLoad.columns[14]);
                            column30 = parseFloat(column30).toFixed(2);
                            column30 = (column30);
                            let column31 = result.getValue(searchLoad.columns[15]);
                            column31 = parseFloat(column31).toFixed(2);
                            column31 = (column31);


                            
                                json.push({
                                    c1_periodo: column01,
                                    c2_cod_cuenta: column02,
                                    c3_saldos_inic_debe: column03,
                                    c4_saldos_inic_haber: column04,
                                    c5_mov_ejercicio_debe: column05,
                                    c6_mov_ejercicio_haber: column06,
                                    c7_sum_mayor_debe: column07,
                                    c8_sum_mayor_haber: column08,
                                    c9_saldo_deudor: column09,
                                    c10_saldo_acreedor: column10,
                                    c11_transf_Debe: column11,
                                    c12_transf_haber: column12,
                                    c13_cuent_balanc_Activo: column13,
                                    c14_cuent_balanc_Pasivo: column14,
                                    c15_result_natura_perdida: column15,
                                    c16_result_natura_ganancia: column16,
                                    c17_adiciones: column17,
                                    c18_deducciones: column18,
                                    c19_estado_ope: column19,
                                    //campos PDF
                                    c20_desc_cuenta: column21,
                                    col01: column22,
                                    col02: column23,
                                    col03: column24,
                                    col04: column25,
                                    col05: column26,
                                    col06: column27,
                                    col07: column28,
                                    col08: column29,
                                    col09: column30,
                                    col10: column31


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

                                let column01 = searchResult[j].getValue(searchLoad.columns[0]);
                                //column01 = column01.split('/');
                                //const PeriodoCompleto = func(column01[0], column01[1]);

                                let column02 = searchResult[j].getValue(searchLoad.columns[1]);
                                if (column02 == '- None -') {
                                    column02 = ''
                                }
                                let column03 = searchResult[j].getValue(searchLoad.columns[2]);
                                column03 = parseFloat(column03).toFixed(2);
                                column03 = (column03);
                                if (column03 <= 0) {
                                    column03 = '0.00'
                                }
                                let column04 = searchResult[j].getValue(searchLoad.columns[3]);
                                column04 = parseFloat(column04).toFixed(2);
                                column04 = (column04);
                                if (column04 <= 0) {
                                    column04 = '0.00'
                                }
                                let column05 = searchResult[j].getValue(searchLoad.columns[4]);
                                column05 = parseFloat(column05).toFixed(2);
                                column05 = (column05);
                                if (column05 <= 0) {
                                    column05 = '0.00'
                                }
                                let column06 = searchResult[j].getValue(searchLoad.columns[5]);
                                column06 = parseFloat(column06).toFixed(2);
                                column06 = (column06);
                                if (column06 <= 0) {
                                    column06 = '0.00'
                                }
                                let column07 = searchResult[j].getValue(searchLoad.columns[6]);
                                column07 = parseFloat(column07).toFixed(2);
                                column07 = (column07);
                                if (column07 <= 0) {
                                    column07 = '0.00'
                                }
                                let column08 = searchResult[j].getValue(searchLoad.columns[7]);
                                column08 = parseFloat(column08).toFixed(2);
                                column08 = (column08);
                                if (column08 <= 0) {
                                    column08 = '0.00'
                                }
                                let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                column09 = parseFloat(column09).toFixed(2);
                                column09 = (column09);
                                if (column09 <= 0) {
                                    column09 = '0.00'
                                }
                                let column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                column10 = parseFloat(column10).toFixed(2);
                                column10 = (column10);
                                if (column10 <= 0) {
                                    column10 = '0.00'
                                }
                                let column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                column11 = parseFloat(column11).toFixed(2);
                                column11 = (column11);
                                if (column11 <= 0) {
                                    column11 = '0.00'
                                }
                                let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                column12 = parseFloat(column12).toFixed(2);
                                column12 = (column12);
                                if (column12 <= 0) {
                                    column12 = '0.00'
                                }
                                let column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                column13 = parseFloat(column13).toFixed(2);
                                column13 = (column13);
                                if (column13 <= 0) {
                                    column13 = '0.00'
                                }
                                let column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                column14 = parseFloat(column14).toFixed(2);
                                column14 = (column14);
                                if (column14 <= 0) {
                                    column14 = '0.00'
                                }
                                let column15 = searchResult[j].getValue(searchLoad.columns[14]);
                                column15 = parseFloat(column15).toFixed(2);
                                column15 = (column15);
                                if (column15 <= 0) {
                                    column15 = '0.00'
                                }
                                let column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                column16 = parseFloat(column16).toFixed(2);
                                column16 = (column16);
                                if (column16 <= 0) {
                                    column16 = '0.00'
                                }
                                let column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                column17 = parseFloat(column17).toFixed(2);
                                column17 = (column17);
                                if (column17 <= 0) {
                                    column17 = '0.00'
                                }
                                let column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                column18 = parseFloat(column18).toFixed(2);
                                column18 = (column18);
                                if (column18 <= 0) {
                                    column18 = '0.00'
                                }
                                const column19 = searchResult[j].getValue(searchLoad.columns[18]);
                                let column20 = searchResult[j].getValue(searchLoad.columns[19]);
                                //CAMPOS PDF
                                let column21 = searchResult[j].getValue(searchLoad.columns[20]);
                                let column22 = searchResult[j].getValue(searchLoad.columns[2]);
                                column22 = parseFloat(column22).toFixed(2);
                                column22 = (column22);
                                let column23 = searchResult[j].getValue(searchLoad.columns[3]);
                                column23 = parseFloat(column23).toFixed(2);
                                column23 = (column23);
                                let column24 = searchResult[j].getValue(searchLoad.columns[4]);
                                column24 = parseFloat(column24).toFixed(2);
                                column24 = (column24);
                                let column25 = searchResult[j].getValue(searchLoad.columns[5]);
                                column25 = parseFloat(column25).toFixed(2);
                                column25 = (column25);
                                let column26 = searchResult[j].getValue(searchLoad.columns[6]);
                                column26 = parseFloat(column26).toFixed(2);
                                column26 = (column26);
                                let column27 = searchResult[j].getValue(searchLoad.columns[7]);
                                column27 = parseFloat(column27).toFixed(2);
                                column27 = (column27);
                                let column28 = searchResult[j].getValue(searchLoad.columns[12]);
                                column28 = parseFloat(column28).toFixed(2);
                                column28 = (column28);
                                let column29 = searchResult[j].getValue(searchLoad.columns[13]);
                                column29 = parseFloat(column29).toFixed(2);
                                column29 = (column29);
                                let column30 = searchResult[j].getValue(searchLoad.columns[14]);
                                column30 = parseFloat(column30).toFixed(2);
                                column30 = (column30);
                                let column31 = searchResult[j].getValue(searchLoad.columns[15]);
                                column31 = parseFloat(column31).toFixed(2);
                                column31 = (column31);

                                if (column20 == anioperiod) {
                                    json.push({
                                        c1_periodo: column01,
                                        c2_cod_cuenta: column02,
                                        c3_saldos_inic_debe: column03,
                                        c4_saldos_inic_haber: column04,
                                        c5_mov_ejercicio_debe: column05,
                                        c6_mov_ejercicio_haber: column06,
                                        c7_sum_mayor_debe: column07,
                                        c8_sum_mayor_haber: column08,
                                        c9_saldo_deudor: column09,
                                        c10_saldo_acreedor: column10,
                                        c11_transf_Debe: column11,
                                        c12_transf_haber: column12,
                                        c13_cuent_balanc_Activo: column13,
                                        c14_cuent_balanc_Pasivo: column14,
                                        c15_result_natura_perdida: column15,
                                        c16_result_natura_ganancia: column16,
                                        c17_adiciones: column17,
                                        c18_deducciones: column18,
                                        c19_estado_ope: column19,
                                        //campos PDF
                                        c20_desc_cuenta: column21,
                                        col01: column22,
                                        col02: column23,
                                        col03: column24,
                                        col04: column25,
                                        col05: column26,
                                        col06: column27,
                                        col07: column28,
                                        col08: column29,
                                        col09: column30,
                                        col10: column31
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
                        contentReport + searchResult[i].c1_periodo + '|' + searchResult[i].c2_cod_cuenta + '|' + searchResult[i].c3_saldos_inic_debe + '|' +
                        searchResult[i].c4_saldos_inic_haber + '|' + searchResult[i].c5_mov_ejercicio_debe + '|' + searchResult[i].c6_mov_ejercicio_haber + '|' +
                        searchResult[i].c7_sum_mayor_debe + '|' + searchResult[i].c8_sum_mayor_haber + '|' + searchResult[i].c9_saldo_deudor + '|' +
                        searchResult[i].c10_saldo_acreedor + '|' + searchResult[i].c11_transf_Debe + '|' + searchResult[i].c12_transf_haber + '|' +
                        searchResult[i].c13_cuent_balanc_Activo + '|' + searchResult[i].c14_cuent_balanc_Pasivo + '|'
                        + searchResult[i].c15_result_natura_perdida + '|' + searchResult[i].c16_result_natura_ganancia + '|' + searchResult[i].c17_adiciones + '|'
                        + searchResult[i].c18_deducciones + '|' + searchResult[i].c19_estado_ope + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        }


        const createFile = (params, fedIdNumb, hasinfo, filterFormat, transactionJSON, fileCabinetId, filterAnioPeriod) => {
            try {
                let periodname = getPeriodName(params.filterPostingPeriod);
                let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231031700' + '07' + '1' + hasinfo + '11';
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);
        
                log.debug({ title: 'Formato de salida', details: filterFormat });
                log.debug({ title: 'Datos JSON', details: JSON.stringify(transactionJSON) });
        
                if (filterFormat == 'PDF') {
                    nameReportGenerated = nameReportGenerated + '.pdf';
                    const typeformat = file.Type.PDF;
        
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
        
                    // Pasar datos al template
                    renderer.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: 'data',
                        data: setSpecialChars(jsonAxiliar)
                    });
                    var pdfFile = renderer.renderAsPdf();
        
                    // Guardar el PDF en el File Cabinet
                    pdfFile.name = nameReportGenerated + '.pdf';
                    pdfFile.folder = params.fileCabinetId;
                    let pdfFileId = pdfFile.save();
                    log.debug({ title: 'Archivo PDF creado', details: 'ID del archivo: ' + pdfFileId });
        
                    return pdfFileId;
                } else if (filterFormat == 'EXCEL') {
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    let xmlString = printStyleExcel();

                    xmlString += '<Worksheet ss:Name="Reporte Presupuestal">';
                    xmlString += "<Table>";

                    xmlString += '<Column  ss:AutoFitWidth="0" ss:Width="150"/>';
                    xmlString += '<Column ss:AutoFitWidth="0" ss:Width="250"/>';
                    xmlString += '<Column ss:AutoFitWidth="0" ss:Width="100"/>';
                    xmlString += '<Column ss:AutoFitWidth="0" ss:Width="100"/>';
                    xmlString += '<Column ss:StyleID="s98"   ss:Width="150" ss:AutoFitWidth="0" ss:Span="12"/>';

                    xmlString += "<Row/>";
                    xmlString += "<Row/>";

                    xmlString += "<Row>";
                    xmlString += '<Cell  ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">' + jsonAxiliar.head.firtsTitle + ' </Data></Cell>';
                    xmlString += "</Row>";
                    xmlString += "<Row>";
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String">EJERCICIO O PERIODO :</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String"> ' + jsonAxiliar.head.secondTitle + '</Data></Cell>';
                    xmlString += "</Row>";
                    xmlString += "<Row>";
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String">RUC :</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String"> ' + jsonAxiliar.head.thirdTitle + '</Data></Cell>';
                    xmlString += "</Row>";
                    xmlString += "<Row>";
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String"> RAZÓN SOCIAL :</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s82"><Data ss:Type="String">' + jsonAxiliar.head.fourthTitle + ' </Data></Cell>';
                    xmlString += "</Row>";

                    xmlString += "<Row/>";

                    xmlString += "<Row>";
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">CUENTA Y SUBCUENTA CONTABLE</Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">SALDOS INICIALES </Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">MOVIMIENTOS </Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">SALDOS FINALES </Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">SALDOS FINALES DEL BALANCE GENERAL </Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">SALDOS FINALES DEL ESTADO DE PERDIDAS Y GANANCIAS POR NATURALEZA </Data></Cell>';
                    xmlString += '<Cell  ss:MergeAcross="1"  ss:StyleID="s84"><Data ss:Type="String">SALDOS FINALES DEL ESTADO DE PERDIDAS Y GANANCIAS POR FUNCION </Data></Cell>';
                    xmlString += "</Row>";


                    for (let index = 0; index < jsonAxiliar.body.length; index++) {
                       
                        xmlString += "<Row>";
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].c2_cod_cuenta+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String"> '+jsonAxiliar.body[index].c20_desc_cuenta+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col01+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col02+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col03+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col04+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col05+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col06+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col07+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col08+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col09+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col10+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col09+' </Data></Cell>';
                        xmlString += '<Cell   ss:StyleID="s84"><Data ss:Type="String">'+jsonAxiliar.body[index].col10+' </Data></Cell>';
                        xmlString += "</Row>";

                    }

                    xmlString += "<Row>";
                    xmlString += '<Cell ss:MergeAcross="1"   ss:StyleID="s85"><Data ss:Type="String"> TOTAL</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol01+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol02+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol03+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol04+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol05+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol06+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol07+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol08+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol09+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol10+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol09+'</Data></Cell>';
                    xmlString += '<Cell   ss:StyleID="s85"><Data ss:Type="String"> '+jsonAxiliar.footer.totalcol10+'</Data></Cell>';
                    xmlString += "</Row>";
                    xmlString += "</Table></Worksheet></Workbook>";
                    var fileOb = file.create({
                        name: nameReportGenerated + '.xls',
                        fileType: file.Type.PLAINTEXT,
                        contents: xmlString,
                        folder: params.fileCabinetId
                    });
                    log.debug('fileOb', fileOb);
                    const fileId = fileOb.save();
                    return fileId;
                }
        
            } catch (e) {
                log.error({ title: 'createFile', details: e });
            }
            return null; // Asegúrate de devolver null si no se pudo crear el archivo
        }


        
        const printStyleExcel = () => {
            let strExcel = "";

            strExcel +=
                '<?xml version="1.0" encoding="UTF-8" ?><?mso-application progid="Excel.Sheet"?>';
            //strExcel += '<?mso-application progid="Excel.Sheet"?>';
            strExcel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
            strExcel += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
            strExcel += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
            strExcel += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
            //Estilos de Celdas
            strExcel += "<Styles>";
            strExcel += '<Style ss:ID="Default" ss:Name="Normal">';
            strExcel += '<Alignment ss:Vertical="Bottom"/>';
            strExcel += "<Borders/>";
            strExcel +=
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>';
            strExcel += "<Interior/>";
            strExcel += "<NumberFormat/>";
            strExcel += "<Protection/>";
            strExcel += "</Style>";
            

            strExcel += '<Style ss:ID="s82">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += "</Borders>";

            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s83">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Interior ss:Color="#c7c7c7" ss:Pattern="Solid"/>';
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s84">';
            strExcel += '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

            strExcel += '<Style ss:ID="s85">';
            strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>';
            strExcel += "<Borders>";
            strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Right" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += '<Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3"/>';
            strExcel += "</Borders>";
            strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#000000" ss:Bold="1"/>';
            strExcel += "</Style>";

        

            
            strExcel += '<Style ss:ID="s98">';
            strExcel += '<NumberFormat ss:Format="Fixed"/>';
            strExcel += "</Style>";
            
            strExcel += "</Styles>";

            return strExcel;
        };


        const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
            try {
                const fileAux = file.load({ id: fileid });
                irecord.submitFields({ type: logrecodId, id: recordlogid, values: { custrecord_pe_file_cabinet_log: fileAux.url + '&_xd=T' } });
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

        function getJsonData(transactionJSON, params) {
            let currentUser = runtime.getCurrentUser();
            let userName = currentUser.name;
            try {
    
                let jsonAxiliar = {
                    head: {
                        firtsTitle: 'FORMATO 3.17 : "LIBRO DE INVENTARIOS Y BALANCES - BALANCE DE COMPROBACIÓN',
                        secondTitle: getPeriodName(params.filterPostingPeriod),
                        thirdTitle: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        fourthTitle: getSubsidiaria(params.filterSubsidiary, 'razonSocial')
                    },
                    body: transactionJSON,
                    footer : {
                        totalcol01: getTotalMontoJson(transactionJSON, 'col01'),
                        totalcol02: getTotalMontoJson(transactionJSON, 'col02'),
                        totalcol03: getTotalMontoJson(transactionJSON, 'col03'),
                        totalcol04: getTotalMontoJson(transactionJSON, 'col04'),
                        totalcol05: getTotalMontoJson(transactionJSON, 'col05'),
                        totalcol06: getTotalMontoJson(transactionJSON, 'col06'),
                        totalcol07: getTotalMontoJson(transactionJSON, 'col07'),
                        totalcol08: getTotalMontoJson(transactionJSON, 'col08'),
                        totalcol09: getTotalMontoJson(transactionJSON, 'col09'),
                        totalcol10: getTotalMontoJson(transactionJSON, 'col10'),
                    }
                };    
                return jsonAxiliar;
            } catch (error) {
                log.error('Error (getJsonData)', error.message);
            }
        };

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_17_pdf.ftl");
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

        const getTotalMontoJson = (transactionJSON, campo) => {
            let total = transactionJSON.reduce((total, record) => {
                return total + (parseFloat(record[campo]) || 0); // Suma el valor, o 0 si es undefined
            }, 0); // El valor inicial es 0
            return numberWithCommas(total);
        }

        const numberWithCommas = (x) => {
            if (x != 0) {
                let [entero, decimal] = parseFloat(x).toFixed(2).split('.');
                entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return decimal ? `${entero}.${decimal}` : entero;
            }
            let numString = parseFloat(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return numString;
        };

        const numberWithCommas2 = (x) => {
            x = x.toString();
            var pattern = /(-?\d+)(\d{3})/;
            while (pattern.test(x))
                x = x.replace(pattern, "$1,$2");
            return x;
        }
        return { execute }

    });
