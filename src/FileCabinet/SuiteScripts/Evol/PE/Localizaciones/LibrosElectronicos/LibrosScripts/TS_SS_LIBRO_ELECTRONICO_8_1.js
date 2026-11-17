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

        const SCRIPT_ID = 'customscript_ts_ss_le_8_1';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_8_1';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

        const execute = (scriptContext) => {
            try {
                let getCola = getPendientes();
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
                        let scriptTaskId = scriptTask.submit();
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

                /**
                 * Zona de desarrollo
                 */
                try {
                    const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
                    const searchId1 = 'customsearch_pe_registro_de_compra_8_1';
                    const searchId2 = 'customsearch_pe_reg_compras_8_1_er';
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
                    var searchbook = {};
                    if (params.filterFormat === 'PDF') {
                        searchbook = searchBookPDF(params.filterSubsidiary, params.filterPostingPeriod, searchId1, searchId2, featureSubsidiary);
                    } else {
                        searchbook = searchBook(params.filterSubsidiary, params.filterPostingPeriod, searchId1, searchId2, featureSubsidiary);
                    }


                    if (searchbook.thereisinfo == 1) {
                        hasinfo = '1';
                        const transactionJSON = searchbook.content;//structureBody(searchbook.content);
                        const createfile = createFile(params, fedIdNumb, hasinfo, params.filterFormat, transactionJSON, params.fileCabinetId);


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

        const searchBook = (subsidiary, period, searchId1, searchId2, featureSubsidiary) => {
            let json = new Array();
            let json2 = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            try {

                const searchLoad = search.load({
                    id: searchId1
                });

                let filters = searchLoad.filters;

                // Elimina filtros problemáticos
                filters = filters.filter(filter =>
                    !(filter.name === 'periodname' &&
                        filter.join === 'accountingperiod')
                );

                const filterOne = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: period
                });

                filters.push(filterOne);
                searchLoad.filters = filters;

                const searchResultCount = searchLoad.runPaged().count;
                log.audit('SEARCH 1 - Cantidad de registros encontrados', searchResultCount);
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let llave = result.getValue(searchLoad.columns[45]);
                            if (llave === '- None -' || llave === null || llave === undefined) {
                                log.audit('SEARCH 1 - Llave NONE encontrada', { llave: llave, search: 'SEARCH 1' });
                            }
                            let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                            let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                            let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                            let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                            let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                            let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                            let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                            let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                            if (campoRegistro08 == '- None -') {
                                campoRegistro08 = '';
                            }
                            let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                            let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                            let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                            let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                            if (campoRegistro12 == '- None -') {
                                campoRegistro12 = ''
                            }
                            let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                            let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                            campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                            let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                            campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                            let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                            campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                            let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                            if (campoRegistro17 == '.00') {
                                campoRegistro17 = '0.00'
                            }
                            let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                            if (campoRegistro18 == '.00') {
                                campoRegistro18 = '0.00'
                            }
                            let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                            if (campoRegistro19 == '.00') {
                                campoRegistro19 = '0.00'
                            }
                            let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                            if (campoRegistro20 == '.00') {
                                campoRegistro20 = '0.00'
                            }
                            let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                            if (campoRegistro21 == '.00') {
                                campoRegistro21 = '0.00'
                            }
                            let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                            if (campoRegistro22 == '.00') {
                                campoRegistro22 = '0.00'
                            } else if (campoRegistro22 == '0') {
                                campoRegistro22 = '0.00'
                            }

                            let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                            if (campoRegistro23 == '.00') {
                                campoRegistro23 = '0.00'
                            }
                            let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                            if (campoRegistro24 == '.00') {
                                campoRegistro24 = '0.00'
                            }
                            let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                            let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                            if (campoRegistro26 == '1.00') {
                                campoRegistro26 = '1.000'
                            }
                            campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                            let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                            if (campoRegistro27 == '- None -') {
                                campoRegistro27 = '';
                            }
                            let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                            if (campoRegistro28 == '- None -') {
                                campoRegistro28 = '';
                            }
                            let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                            if (campoRegistro29 == '- None -') {
                                campoRegistro29 = '';
                            }
                            let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                            if (campoRegistro30 == '- None -') {
                                campoRegistro30 = '';
                            }
                            let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                            if (campoRegistro31 == '- None -') {
                                campoRegistro31 = '';
                            }
                            let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                            if (campoRegistro32 == '- None -') {
                                campoRegistro32 = '';
                            }
                            let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                            if (campoRegistro33 == '- None -') {
                                campoRegistro33 = '';
                            }
                            let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                            if (campoRegistro34 == '- None -') {
                                campoRegistro34 = '';
                            }
                            let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                            if (campoRegistro35 == '- None -') {
                                campoRegistro35 = '';
                            }
                            let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                            if (campoRegistro36 == '- None -') {
                                campoRegistro36 = '';
                            }
                            let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                            if (campoRegistro37 == '- None -') {
                                campoRegistro37 = '';
                            }
                            let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                            let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                            if (campoRegistro39 == '- None -') {
                                campoRegistro39 = '';
                            }
                            let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                            let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                            if (campoRegistro41 == '- None -') {
                                campoRegistro41 = '';
                            }
                            let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                            if (campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                            let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                            // Obtener año y mes del periodo (columna 1)
                            let periodoAnio = parseInt(campoRegistro01.substring(0, 4));
                            let periodoMes = parseInt(campoRegistro01.substring(4, 6));

                            // Obtener año y mes de la fecha de emisión (columna 4)
                            let fechaEmision = formatDate(campoRegistro04);
                            let emisionAnio = parseInt(fechaEmision.anio);
                            let emisionMes = parseInt(fechaEmision.mes);

                            // Calcular diferencia en meses
                            let diferenciaEnMeses = (periodoAnio - emisionAnio) * 12 + (periodoMes - emisionMes);
                            if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '1';
                            } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '0';
                            } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '6';
                            } else if (diferenciaEnMeses >= 13) {
                                campoRegistro42 = '7';
                            } else if (campoRegistro06 == '05') {
                                campoRegistro42 = '1';
                            }
                            else {
                                campoRegistro42 = '0';
                            }
                            let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                            let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                            let campoRegistro45 = result.getValue(searchLoad.columns[44]);


                            json.push({
                                llave: llave,
                                campoRegistro01: campoRegistro01,
                                campoRegistro02: campoRegistro02,
                                campoRegistro03: campoRegistro03,
                                campoRegistro04: campoRegistro04,
                                campoRegistro05: campoRegistro05,
                                campoRegistro06: campoRegistro06,
                                campoRegistro07: campoRegistro07,
                                campoRegistro08: campoRegistro08,
                                campoRegistro09: campoRegistro09,
                                campoRegistro10: campoRegistro10,
                                campoRegistro11: campoRegistro11,
                                campoRegistro12: campoRegistro12,
                                campoRegistro13: campoRegistro13,
                                campoRegistro14: campoRegistro14,
                                campoRegistro15: campoRegistro15,
                                campoRegistro16: campoRegistro16,
                                campoRegistro17: campoRegistro17,
                                campoRegistro18: campoRegistro18,
                                campoRegistro19: campoRegistro19,
                                campoRegistro20: campoRegistro20,
                                campoRegistro21: campoRegistro21,
                                campoRegistro22: campoRegistro22,
                                campoRegistro23: campoRegistro23,
                                campoRegistro24: campoRegistro24,
                                campoRegistro25: campoRegistro25,
                                campoRegistro26: campoRegistro26,
                                campoRegistro27: campoRegistro27,
                                campoRegistro28: campoRegistro28,
                                campoRegistro29: campoRegistro29,
                                campoRegistro30: campoRegistro30,
                                campoRegistro31: campoRegistro31,
                                campoRegistro32: campoRegistro32,
                                campoRegistro33: campoRegistro33,
                                campoRegistro34: campoRegistro34,
                                campoRegistro35: campoRegistro35,
                                campoRegistro36: campoRegistro36,
                                campoRegistro37: campoRegistro37,
                                campoRegistro38: campoRegistro38,
                                campoRegistro39: campoRegistro39,
                                campoRegistro40: campoRegistro40,
                                campoRegistro41: campoRegistro41,
                                campoRegistro42: campoRegistro42,
                                campoRegistro43: campoRegistro43,
                                campoRegistro44: campoRegistro44,
                                campoRegistro45: campoRegistro45

                            });
                            return true;
                        });
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
                                let llave = result.getValue(searchLoad.columns[45]);
                                let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                                let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                                let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                                let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                                let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                                let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                                let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                                let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                                if (campoRegistro08 == '- None -') {
                                    campoRegistro08 = '';
                                }
                                let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                                let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                                let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                                let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                                if (campoRegistro12 == '- None -') {
                                    campoRegistro12 = ''
                                }
                                let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                                let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                                campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                                let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                                campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                                let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                                campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                                let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                                if (campoRegistro17 == '.00') {
                                    campoRegistro17 = '0.00'
                                }
                                let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                                if (campoRegistro18 == '.00') {
                                    campoRegistro18 = '0.00'
                                }
                                let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                                if (campoRegistro19 == '.00') {
                                    campoRegistro19 = '0.00'
                                }
                                let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                                if (campoRegistro20 == '.00') {
                                    campoRegistro20 = '0.00'
                                }
                                let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                                if (campoRegistro21 == '.00') {
                                    campoRegistro21 = '0.00'
                                }
                                let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                                if (campoRegistro22 == '.00') {
                                    campoRegistro22 = '0.00'
                                } else if (campoRegistro22 == '0') {
                                    campoRegistro22 = '0.00'
                                }

                                let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                                if (campoRegistro23 == '.00') {
                                    campoRegistro23 = '0.00'
                                }
                                let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                                if (campoRegistro24 == '.00') {
                                    campoRegistro24 = '0.00'
                                }
                                let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                                let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                                if (campoRegistro26 == '1.00') {
                                    campoRegistro26 = '1.000'
                                }
                                campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                                let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                                if (campoRegistro27 == '- None -') {
                                    campoRegistro27 = '';
                                }
                                let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                                if (campoRegistro28 == '- None -') {
                                    campoRegistro28 = '';
                                }
                                let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                                if (campoRegistro29 == '- None -') {
                                    campoRegistro29 = '';
                                }
                                let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                                if (campoRegistro30 == '- None -') {
                                    campoRegistro30 = '';
                                }
                                let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                                if (campoRegistro31 == '- None -') {
                                    campoRegistro31 = '';
                                }
                                let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                                if (campoRegistro32 == '- None -') {
                                    campoRegistro32 = '';
                                }
                                let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                                if (campoRegistro33 == '- None -') {
                                    campoRegistro33 = '';
                                }
                                let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                                if (campoRegistro34 == '- None -') {
                                    campoRegistro34 = '';
                                }
                                let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                                if (campoRegistro35 == '- None -') {
                                    campoRegistro35 = '';
                                }
                                let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                                if (campoRegistro36 == '- None -') {
                                    campoRegistro36 = '';
                                }
                                let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                                if (campoRegistro37 == '- None -') {
                                    campoRegistro37 = '';
                                }
                                let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                                let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                                if (campoRegistro39 == '- None -') {
                                    campoRegistro39 = '';
                                }
                                let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                                let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                                if (campoRegistro41 == '- None -') {
                                    campoRegistro41 = '';
                                }
                                let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                                if (campoRegistro42 == '- None -') {
                                    campoRegistro42 = '';
                                }
                                let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                                // Obtener año y mes del periodo (columna 1)
                                let periodoAnio = parseInt(campoRegistro01.substring(0, 4));
                                let periodoMes = parseInt(campoRegistro01.substring(4, 6));

                                // Obtener año y mes de la fecha de emisión (columna 4)
                                let fechaEmision = formatDate(campoRegistro04);
                                let emisionAnio = parseInt(fechaEmision.anio);
                                let emisionMes = parseInt(fechaEmision.mes);

                                // Calcular diferencia en meses
                                let diferenciaEnMeses = (periodoAnio - emisionAnio) * 12 + (periodoMes - emisionMes);
                                if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '1';
                                } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                    || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                    || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                    || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                    || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                    || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                    || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                    && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '0';
                                } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                    || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '6';
                                } else if (diferenciaEnMeses >= 13) {
                                    campoRegistro42 = '7';
                                } else if (campoRegistro06 == '05') {
                                    campoRegistro42 = '1';
                                }
                                else {
                                    campoRegistro42 = '0';
                                }
                                let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                                let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                                let campoRegistro45 = result.getValue(searchLoad.columns[44]);

                                json.push({
                                    llave: llave,
                                    campoRegistro01: campoRegistro01,
                                    campoRegistro02: campoRegistro02,
                                    campoRegistro03: campoRegistro03,
                                    campoRegistro04: campoRegistro04,
                                    campoRegistro05: campoRegistro05,
                                    campoRegistro06: campoRegistro06,
                                    campoRegistro07: campoRegistro07,
                                    campoRegistro08: campoRegistro08,
                                    campoRegistro09: campoRegistro09,
                                    campoRegistro10: campoRegistro10,
                                    campoRegistro11: campoRegistro11,
                                    campoRegistro12: campoRegistro12,
                                    campoRegistro13: campoRegistro13,
                                    campoRegistro14: campoRegistro14,
                                    campoRegistro15: campoRegistro15,
                                    campoRegistro16: campoRegistro16,
                                    campoRegistro17: campoRegistro17,
                                    campoRegistro18: campoRegistro18,
                                    campoRegistro19: campoRegistro19,
                                    campoRegistro20: campoRegistro20,
                                    campoRegistro21: campoRegistro21,
                                    campoRegistro22: campoRegistro22,
                                    campoRegistro23: campoRegistro23,
                                    campoRegistro24: campoRegistro24,
                                    campoRegistro25: campoRegistro25,
                                    campoRegistro26: campoRegistro26,
                                    campoRegistro27: campoRegistro27,
                                    campoRegistro28: campoRegistro28,
                                    campoRegistro29: campoRegistro29,
                                    campoRegistro30: campoRegistro30,
                                    campoRegistro31: campoRegistro31,
                                    campoRegistro32: campoRegistro32,
                                    campoRegistro33: campoRegistro33,
                                    campoRegistro34: campoRegistro34,
                                    campoRegistro35: campoRegistro35,
                                    campoRegistro36: campoRegistro36,
                                    campoRegistro37: campoRegistro37,
                                    campoRegistro38: campoRegistro38,
                                    campoRegistro39: campoRegistro39,
                                    campoRegistro40: campoRegistro40,
                                    campoRegistro41: campoRegistro41,
                                    campoRegistro42: campoRegistro42,
                                    campoRegistro43: campoRegistro43,
                                    campoRegistro44: campoRegistro44,
                                    campoRegistro45: campoRegistro45

                                });
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
                    }
                }

                const searchLoad2 = search.load({
                    id: searchId2
                });

                let filters2 = searchLoad2.filters;

                const filterThree = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: period
                });

                filters2.push(filterThree);

                if (featureSubsidiary) {
                    const filterFour = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters2.push(filterFour);
                }

                searchLoad2.filters = filters2;
                const searchResultCount2 = searchLoad2.runPaged().count;
                log.audit('SEARCH 2 - Cantidad de registros encontrados', searchResultCount2);

                if (searchResultCount2 != 0) {
                    if (searchResultCount2 <= 4000) {
                        searchLoad2.run().each((result) => {
                            let llave = result.getValue(searchLoad2.columns[48]);
                            if (llave === '- None -' || llave === null || llave === undefined) {
                                log.audit('SEARCH 2 - Llave NONE encontrada', { llave: llave, search: 'SEARCH 2' });
                            }
                            let campoRegistro01 = result.getValue(searchLoad2.columns[0]);
                            let campoRegistro02 = result.getValue(searchLoad2.columns[1]);
                            let campoRegistro03 = result.getValue(searchLoad2.columns[2]);
                            let campoRegistro04 = result.getValue(searchLoad2.columns[3]);
                            let campoRegistro05 = result.getValue(searchLoad2.columns[4]);
                            let campoRegistro06 = result.getValue(searchLoad2.columns[5]);
                            let campoRegistro07 = result.getValue(searchLoad2.columns[6]);
                            let campoRegistro08 = result.getValue(searchLoad2.columns[7]);
                            if (campoRegistro08 == '- None -') {
                                campoRegistro08 = '';
                            }
                            let campoRegistro09 = result.getValue(searchLoad2.columns[8]);
                            let campoRegistro10 = result.getValue(searchLoad2.columns[9]);
                            let campoRegistro11 = result.getValue(searchLoad2.columns[10]);
                            let campoRegistro12 = result.getValue(searchLoad2.columns[11]);
                            if (campoRegistro12 == '- None -') {
                                campoRegistro12 = ''
                            }
                            let campoRegistro13 = result.getValue(searchLoad2.columns[12]);
                            let campoRegistro14 = result.getValue(searchLoad2.columns[13]);
                            campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                            let campoRegistro15 = result.getValue(searchLoad2.columns[14]);
                            campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                            let campoRegistro16 = result.getValue(searchLoad2.columns[15]);
                            campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                            let campoRegistro17 = result.getValue(searchLoad2.columns[16]);
                            if (campoRegistro17 == '.00') {
                                campoRegistro17 = '0.00'
                            }
                            let campoRegistro18 = result.getValue(searchLoad2.columns[17]);
                            if (campoRegistro18 == '.00') {
                                campoRegistro18 = '0.00'
                            }
                            let campoRegistro19 = result.getValue(searchLoad2.columns[18]);
                            if (campoRegistro19 == '.00') {
                                campoRegistro19 = '0.00'
                            }
                            let campoRegistro20 = result.getValue(searchLoad2.columns[19]);
                            if (campoRegistro20 == '.00') {
                                campoRegistro20 = '0.00'
                            }
                            let campoRegistro21 = result.getValue(searchLoad2.columns[20]);
                            if (campoRegistro21 == '.00') {
                                campoRegistro21 = '0.00'
                            }
                            let campoRegistro22 = result.getValue(searchLoad2.columns[21]);
                            if (campoRegistro22 == '.00') {
                                campoRegistro22 = '0.00'
                            } else if (campoRegistro22 == '0') {
                                campoRegistro22 = '0.00'
                            }

                            let campoRegistro23 = result.getValue(searchLoad2.columns[22]);
                            if (campoRegistro23 == '.00') {
                                campoRegistro23 = '0.00'
                            }
                            let campoRegistro24 = result.getValue(searchLoad2.columns[23]);
                            if (campoRegistro24 == '.00') {
                                campoRegistro24 = '0.00'
                            }
                            let campoRegistro25 = result.getValue(searchLoad2.columns[24]);
                            let campoRegistro26 = result.getValue(searchLoad2.columns[25]);
                            if (campoRegistro26 == '1.00') {
                                campoRegistro26 = '1.000'
                            }
                            campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                            let campoRegistro27 = result.getValue(searchLoad2.columns[26]);
                            if (campoRegistro27 == '- None -') {
                                campoRegistro27 = '';
                            }
                            let campoRegistro28 = result.getValue(searchLoad2.columns[27]);
                            if (campoRegistro28 == '- None -') {
                                campoRegistro28 = '';
                            }
                            let campoRegistro29 = result.getValue(searchLoad2.columns[28]);
                            if (campoRegistro29 == '- None -') {
                                campoRegistro29 = '';
                            }
                            let campoRegistro30 = result.getValue(searchLoad2.columns[29]);
                            if (campoRegistro30 == '- None -') {
                                campoRegistro30 = '';
                            }
                            let campoRegistro31 = result.getValue(searchLoad2.columns[30]);
                            if (campoRegistro31 == '- None -') {
                                campoRegistro31 = '';
                            }
                            let campoRegistro32 = result.getValue(searchLoad2.columns[31]);
                            if (campoRegistro32 == '- None -') {
                                campoRegistro32 = '';
                            }
                            let campoRegistro33 = result.getValue(searchLoad2.columns[32]);
                            if (campoRegistro33 == '- None -') {
                                campoRegistro33 = '';
                            }
                            let campoRegistro34 = result.getValue(searchLoad2.columns[33]);
                            if (campoRegistro34 == '- None -') {
                                campoRegistro34 = '';
                            }
                            let campoRegistro35 = result.getValue(searchLoad2.columns[34]);
                            if (campoRegistro35 == '- None -') {
                                campoRegistro35 = '';
                            }
                            let campoRegistro36 = result.getValue(searchLoad2.columns[35]);
                            if (campoRegistro36 == '- None -') {
                                campoRegistro36 = '';
                            }
                            let campoRegistro37 = result.getValue(searchLoad2.columns[36]);
                            if (campoRegistro37 == '- None -') {
                                campoRegistro37 = '';
                            }
                            let campoRegistro38 = result.getValue(searchLoad2.columns[37]);
                            let campoRegistro39 = result.getValue(searchLoad2.columns[38]);
                            let campoRegistro40 = result.getValue(searchLoad2.columns[39]);
                            let campoRegistro41 = result.getValue(searchLoad2.columns[40]);
                            if (campoRegistro41 == '- None -') {
                                campoRegistro41 = '';
                            }
                            let campoRegistro42 = result.getValue(searchLoad2.columns[41]);
                            if (campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                            let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                            if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '1';
                            } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '0';
                            } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '6';
                            } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '0';// antes era 7 correguir 
                            } else if (campoRegistro06 == '05') {
                                campoRegistro42 = '1';
                            } else {
                                campoRegistro42 = '0';
                            }
                            let campoRegistro43 = result.getValue(searchLoad2.columns[42]);
                            let campoRegistro44 = result.getValue(searchLoad2.columns[43]);
                            let campoRegistro45 = result.getValue(searchLoad2.columns[44]);


                            json.push({
                                llave: llave,
                                campoRegistro01: campoRegistro01,
                                campoRegistro02: campoRegistro02,
                                campoRegistro03: campoRegistro03,
                                campoRegistro04: campoRegistro04,
                                campoRegistro05: campoRegistro05,
                                campoRegistro06: campoRegistro06,
                                campoRegistro07: campoRegistro07,
                                campoRegistro08: campoRegistro08,
                                campoRegistro09: campoRegistro09,
                                campoRegistro10: campoRegistro10,
                                campoRegistro11: campoRegistro11,
                                campoRegistro12: campoRegistro12,
                                campoRegistro13: campoRegistro13,
                                campoRegistro14: campoRegistro14,
                                campoRegistro15: campoRegistro15,
                                campoRegistro16: campoRegistro16,
                                campoRegistro17: campoRegistro17,
                                campoRegistro18: campoRegistro18,
                                campoRegistro19: campoRegistro19,
                                campoRegistro20: campoRegistro20,
                                campoRegistro21: campoRegistro21,
                                campoRegistro22: campoRegistro22,
                                campoRegistro23: campoRegistro23,
                                campoRegistro24: campoRegistro24,
                                campoRegistro25: campoRegistro25,
                                campoRegistro26: campoRegistro26,
                                campoRegistro27: campoRegistro27,
                                campoRegistro28: campoRegistro28,
                                campoRegistro29: campoRegistro29,
                                campoRegistro30: campoRegistro30,
                                campoRegistro31: campoRegistro31,
                                campoRegistro32: campoRegistro32,
                                campoRegistro33: campoRegistro33,
                                campoRegistro34: campoRegistro34,
                                campoRegistro35: campoRegistro35,
                                campoRegistro36: campoRegistro36,
                                campoRegistro37: campoRegistro37,
                                campoRegistro38: campoRegistro38,
                                campoRegistro39: campoRegistro39,
                                campoRegistro40: campoRegistro40,
                                campoRegistro41: campoRegistro41,
                                campoRegistro42: campoRegistro42,
                                campoRegistro43: campoRegistro43,
                                campoRegistro44: campoRegistro44,
                                campoRegistro45: campoRegistro45

                            });
                            return true;
                        });
                    } else {
                        division = searchResultCount2 / 1000;
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
                                let llave = result.getValue(searchLoad.columns[48]);
                                let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                                let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                                let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                                let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                                let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                                let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                                let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                                let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                                if (campoRegistro08 == '- None -') {
                                    campoRegistro08 = '';
                                }
                                let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                                let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                                let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                                let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                                if (campoRegistro12 == '- None -') {
                                    campoRegistro12 = ''
                                }
                                let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                                let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                                campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                                let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                                campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                                let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                                campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                                let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                                if (campoRegistro17 == '.00') {
                                    campoRegistro17 = '0.00'
                                }
                                let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                                if (campoRegistro18 == '.00') {
                                    campoRegistro18 = '0.00'
                                }
                                let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                                if (campoRegistro19 == '.00') {
                                    campoRegistro19 = '0.00'
                                }
                                let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                                if (campoRegistro20 == '.00') {
                                    campoRegistro20 = '0.00'
                                }
                                let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                                if (campoRegistro21 == '.00') {
                                    campoRegistro21 = '0.00'
                                }
                                let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                                if (campoRegistro22 == '.00') {
                                    campoRegistro22 = '0.00'
                                } else if (campoRegistro22 == '0') {
                                    campoRegistro22 = '0.00'
                                }

                                let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                                if (campoRegistro23 == '.00') {
                                    campoRegistro23 = '0.00'
                                }
                                let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                                if (campoRegistro24 == '.00') {
                                    campoRegistro24 = '0.00'
                                }
                                let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                                let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                                if (campoRegistro26 == '1.00') {
                                    campoRegistro26 = '1.000'
                                }
                                campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                                let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                                if (campoRegistro27 == '- None -') {
                                    campoRegistro27 = '';
                                }
                                let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                                if (campoRegistro28 == '- None -') {
                                    campoRegistro28 = '';
                                }
                                let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                                if (campoRegistro29 == '- None -') {
                                    campoRegistro29 = '';
                                }
                                let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                                if (campoRegistro30 == '- None -') {
                                    campoRegistro30 = '';
                                }
                                let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                                if (campoRegistro31 == '- None -') {
                                    campoRegistro31 = '';
                                }
                                let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                                if (campoRegistro32 == '- None -') {
                                    campoRegistro32 = '';
                                }
                                let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                                if (campoRegistro33 == '- None -') {
                                    campoRegistro33 = '';
                                }
                                let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                                if (campoRegistro34 == '- None -') {
                                    campoRegistro34 = '';
                                }
                                let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                                if (campoRegistro35 == '- None -') {
                                    campoRegistro35 = '';
                                }
                                let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                                if (campoRegistro36 == '- None -') {
                                    campoRegistro36 = '';
                                }
                                let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                                if (campoRegistro37 == '- None -') {
                                    campoRegistro37 = '';
                                }
                                let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                                let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                                let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                                let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                                if (campoRegistro41 == '- None -') {
                                    campoRegistro41 = '';
                                }
                                let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                                if (campoRegistro42 == '- None -') {
                                    campoRegistro42 = '';
                                }
                                let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                                if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '1';
                                } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                    || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                    || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                    || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                    || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                    || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                    || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                    && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '0';
                                } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                    || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '6';
                                } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                    && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '7';
                                } else if (campoRegistro06 == '05') {
                                    campoRegistro42 = '1';
                                }
                                let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                                let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                                let campoRegistro45 = result.getValue(searchLoad.columns[44]);

                                json.push({
                                    llave: llave,
                                    campoRegistro01: campoRegistro01,
                                    campoRegistro02: campoRegistro02,
                                    campoRegistro03: campoRegistro03,
                                    campoRegistro04: campoRegistro04,
                                    campoRegistro05: campoRegistro05,
                                    campoRegistro06: campoRegistro06,
                                    campoRegistro07: campoRegistro07,
                                    campoRegistro08: campoRegistro08,
                                    campoRegistro09: campoRegistro09,
                                    campoRegistro10: campoRegistro10,
                                    campoRegistro11: campoRegistro11,
                                    campoRegistro12: campoRegistro12,
                                    campoRegistro13: campoRegistro13,
                                    campoRegistro14: campoRegistro14,
                                    campoRegistro15: campoRegistro15,
                                    campoRegistro16: campoRegistro16,
                                    campoRegistro17: campoRegistro17,
                                    campoRegistro18: campoRegistro18,
                                    campoRegistro19: campoRegistro19,
                                    campoRegistro20: campoRegistro20,
                                    campoRegistro21: campoRegistro21,
                                    campoRegistro22: campoRegistro22,
                                    campoRegistro23: campoRegistro23,
                                    campoRegistro24: campoRegistro24,
                                    campoRegistro25: campoRegistro25,
                                    campoRegistro26: campoRegistro26,
                                    campoRegistro27: campoRegistro27,
                                    campoRegistro28: campoRegistro28,
                                    campoRegistro29: campoRegistro29,
                                    campoRegistro30: campoRegistro30,
                                    campoRegistro31: campoRegistro31,
                                    campoRegistro32: campoRegistro32,
                                    campoRegistro33: campoRegistro33,
                                    campoRegistro34: campoRegistro34,
                                    campoRegistro35: campoRegistro35,
                                    campoRegistro36: campoRegistro36,
                                    campoRegistro37: campoRegistro37,
                                    campoRegistro38: campoRegistro38,
                                    campoRegistro39: campoRegistro39,
                                    campoRegistro40: campoRegistro40,
                                    campoRegistro41: campoRegistro41,
                                    campoRegistro42: campoRegistro42,
                                    campoRegistro43: campoRegistro43,
                                    campoRegistro44: campoRegistro44,
                                    campoRegistro45: campoRegistro45

                                });
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
                    }
                }

                if (searchResultCount > 0 || searchResultCount2 > 0) {
                    const groupedData = json.reduce((acc, curr) => {
                        const key = curr.llave;
                        if (!acc[key]) {
                            acc[key] = {
                                campoRegistro01: curr.campoRegistro01,
                                campoRegistro02: curr.campoRegistro02,
                                campoRegistro03: curr.campoRegistro03,
                                campoRegistro04: curr.campoRegistro04,
                                campoRegistro05: curr.campoRegistro05,
                                campoRegistro06: curr.campoRegistro06,
                                campoRegistro07: curr.campoRegistro07,
                                campoRegistro08: curr.campoRegistro08,
                                campoRegistro09: curr.campoRegistro09,
                                campoRegistro10: curr.campoRegistro10,
                                campoRegistro11: curr.campoRegistro11,
                                campoRegistro12: curr.campoRegistro12,
                                campoRegistro13: curr.campoRegistro13,
                                campoRegistro14: 0,
                                campoRegistro15: 0,
                                campoRegistro16: 0,
                                campoRegistro17: 0,
                                campoRegistro18: 0,
                                campoRegistro19: 0,
                                campoRegistro20: 0,
                                campoRegistro21: 0,
                                campoRegistro22: 0.00,
                                campoRegistro23: 0,
                                campoRegistro24: 0,
                                campoRegistro25: curr.campoRegistro25,
                                campoRegistro26: curr.campoRegistro26,
                                campoRegistro27: curr.campoRegistro27,
                                campoRegistro28: curr.campoRegistro28,
                                campoRegistro29: curr.campoRegistro29,
                                campoRegistro30: curr.campoRegistro30,
                                campoRegistro31: curr.campoRegistro31,
                                campoRegistro32: curr.campoRegistro32,
                                campoRegistro33: curr.campoRegistro33,
                                campoRegistro34: curr.campoRegistro34,
                                campoRegistro35: curr.campoRegistro35,
                                campoRegistro36: curr.campoRegistro36,
                                campoRegistro37: curr.campoRegistro37,
                                campoRegistro38: curr.campoRegistro38,
                                campoRegistro39: curr.campoRegistro39,
                                campoRegistro40: curr.campoRegistro40,
                                campoRegistro41: curr.campoRegistro41,
                                campoRegistro42: curr.campoRegistro42,
                                campoRegistro43: curr.campoRegistro43,
                                campoRegistro44: curr.campoRegistro44,
                                campoRegistro45: curr.campoRegistro45
                            };
                        }

                        acc[key].campoRegistro14 += parseFloat(curr.campoRegistro14);
                        acc[key].campoRegistro15 += parseFloat(curr.campoRegistro15);
                        acc[key].campoRegistro16 += parseFloat(curr.campoRegistro16);
                        acc[key].campoRegistro17 += parseFloat(curr.campoRegistro17);
                        acc[key].campoRegistro18 += parseFloat(curr.campoRegistro18);
                        acc[key].campoRegistro19 += parseFloat(curr.campoRegistro19);
                        acc[key].campoRegistro20 += parseFloat(curr.campoRegistro20);
                        acc[key].campoRegistro21 += parseFloat(curr.campoRegistro21);

                        //acc[key].campoRegistro22 += parseFloat(curr.campoRegistro22);
                        acc[key].campoRegistro22 = curr.campoRegistro22;

                        acc[key].campoRegistro23 += parseFloat(curr.campoRegistro23);
                        acc[key].campoRegistro24 += parseFloat(curr.campoRegistro24);
                        acc[key].campoRegistro24 = parseFloat(acc[key].campoRegistro24.toFixed(2));

                        return acc;
                    }, {});
                    let array = Object.values(groupedData);
                    //return { thereisinfo: 1, content: array };

                    for (let i = 0; i < array.length; i++) {

                        json2.push({
                            campoRegistro01: array[i].campoRegistro01,
                            campoRegistro02: array[i].campoRegistro02,
                            campoRegistro03: array[i].campoRegistro03,
                            campoRegistro04: array[i].campoRegistro04,
                            campoRegistro05: array[i].campoRegistro05,
                            campoRegistro06: array[i].campoRegistro06,
                            campoRegistro07: array[i].campoRegistro07,
                            campoRegistro08: array[i].campoRegistro08,
                            campoRegistro09: array[i].campoRegistro09,
                            campoRegistro10: array[i].campoRegistro10,
                            campoRegistro11: array[i].campoRegistro11,
                            campoRegistro12: array[i].campoRegistro12,
                            campoRegistro13: array[i].campoRegistro13,
                            campoRegistro14: array[i].campoRegistro14,
                            campoRegistro15: array[i].campoRegistro15,
                            campoRegistro16: array[i].campoRegistro16,
                            campoRegistro17: array[i].campoRegistro17,
                            campoRegistro18: array[i].campoRegistro18,
                            campoRegistro19: array[i].campoRegistro19,
                            campoRegistro20: array[i].campoRegistro20,
                            campoRegistro21: array[i].campoRegistro21,
                            campoRegistro22: array[i].campoRegistro22,
                            campoRegistro23: array[i].campoRegistro23,
                            campoRegistro24: array[i].campoRegistro24,
                            campoRegistro25: array[i].campoRegistro25,
                            campoRegistro26: array[i].campoRegistro26,
                            campoRegistro27: array[i].campoRegistro27,
                            campoRegistro28: array[i].campoRegistro28,
                            campoRegistro29: array[i].campoRegistro29,
                            campoRegistro30: array[i].campoRegistro30,
                            campoRegistro31: array[i].campoRegistro31,
                            campoRegistro32: array[i].campoRegistro32,
                            campoRegistro33: array[i].campoRegistro33,
                            campoRegistro34: array[i].campoRegistro34,
                            campoRegistro35: array[i].campoRegistro35,
                            campoRegistro36: array[i].campoRegistro36,
                            campoRegistro37: array[i].campoRegistro37,
                            campoRegistro38: array[i].campoRegistro38,
                            campoRegistro39: array[i].campoRegistro39,
                            campoRegistro40: array[i].campoRegistro40,
                            campoRegistro41: array[i].campoRegistro41,
                            campoRegistro42: array[i].campoRegistro42,
                            campoRegistro43: array[i].campoRegistro43,
                            campoRegistro44: array[i].campoRegistro44,
                            campoRegistro45: array[i].campoRegistro45

                        });

                    }

                    return { thereisinfo: 1, content: json2 };
                }
                else return { thereisinfo: 0 };
            } catch (e) {
                log.error('Error en searchBook', {
                    message: error.message,
                    stack: error.stack
                });
                throw error;
            }
        }

        const searchBookPDF = (subsidiary, period, searchId1, searchId2, featureSubsidiary) => {
            let json = new Array();
            let json2 = new Array();
            var searchResult;
            let division = 0.0;
            let laps = 0.0;
            let start = 0;
            let end = 1000;
            try {

                const searchLoad = search.load({
                    id: searchId1
                });

                let filters = searchLoad.filters;

                // Elimina filtros problemáticos
                filters = filters.filter(filter =>
                    !(filter.name === 'periodname' &&
                        filter.join === 'accountingperiod')
                );

                const filterOne = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: period
                });

                filters.push(filterOne);

                searchLoad.filters = filters;

                const searchResultCount = searchLoad.runPaged().count;
                if (searchResultCount != 0) {
                    if (searchResultCount <= 4000) {
                        searchLoad.run().each((result) => {
                            let llave = result.getValue(searchLoad.columns[48]);
                            let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                            let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                            let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                            let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                            let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                            let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                            let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                            let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                            if (campoRegistro08 == '- None -') {
                                campoRegistro08 = '';
                            }
                            let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                            let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                            let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                            let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                            if (campoRegistro12 == '- None -') {
                                campoRegistro12 = ''
                            }
                            let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                            let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                            campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                            let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                            campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                            let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                            campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                            let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                            if (campoRegistro17 == '.00') {
                                campoRegistro17 = '0.00'
                            }
                            let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                            if (campoRegistro18 == '.00') {
                                campoRegistro18 = '0.00'
                            }
                            let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                            if (campoRegistro19 == '.00') {
                                campoRegistro19 = '0.00'
                            }
                            let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                            if (campoRegistro20 == '.00') {
                                campoRegistro20 = '0.00'
                            }
                            let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                            if (campoRegistro21 == '.00') {
                                campoRegistro21 = '0.00'
                            }
                            let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                            if (campoRegistro22 == '.00') {
                                campoRegistro22 = '0.00'
                            } else if (campoRegistro22 == '0') {
                                campoRegistro22 = '0.00'
                            }

                            let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                            if (campoRegistro23 == '.00') {
                                campoRegistro23 = '0.00'
                            }
                            let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                            if (campoRegistro24 == '.00') {
                                campoRegistro24 = '0.00'
                            }
                            let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                            let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                            if (campoRegistro26 == '1.00') {
                                campoRegistro26 = '1.000'
                            }
                            campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                            let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                            if (campoRegistro27 == '- None -') {
                                campoRegistro27 = '';
                            }
                            let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                            if (campoRegistro28 == '- None -') {
                                campoRegistro28 = '';
                            }
                            let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                            if (campoRegistro29 == '- None -') {
                                campoRegistro29 = '';
                            }
                            let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                            if (campoRegistro30 == '- None -') {
                                campoRegistro30 = '';
                            }
                            let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                            if (campoRegistro31 == '- None -') {
                                campoRegistro31 = '';
                            }
                            let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                            if (campoRegistro32 == '- None -') {
                                campoRegistro32 = '';
                            }
                            let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                            if (campoRegistro33 == '- None -') {
                                campoRegistro33 = '';
                            }
                            let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                            if (campoRegistro34 == '- None -') {
                                campoRegistro34 = '';
                            }
                            let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                            if (campoRegistro35 == '- None -') {
                                campoRegistro35 = '';
                            }
                            let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                            if (campoRegistro36 == '- None -') {
                                campoRegistro36 = '';
                            }
                            let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                            if (campoRegistro37 == '- None -') {
                                campoRegistro37 = '';
                            }
                            let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                            let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                            let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                            let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                            if (campoRegistro41 == '- None -') {
                                campoRegistro41 = '';
                            }
                            let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                            if(campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                            let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                            if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '1';
                            } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '0';
                            } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '6';
                            } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '7';
                            } else if (campoRegistro06 == '05') {
                                campoRegistro42 = '1';
                            }
                            let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                            let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                            let campoRegistro45 = result.getValue(searchLoad.columns[44]);


                            json.push({
                                llave: llave,
                                campoRegistro01: campoRegistro01,
                                campoRegistro02: campoRegistro02,
                                campoRegistro03: campoRegistro03,
                                campoRegistro04: campoRegistro04,
                                campoRegistro05: campoRegistro05,
                                campoRegistro06: campoRegistro06,
                                campoRegistro07: campoRegistro07,
                                campoRegistro08: campoRegistro08,
                                campoRegistro09: campoRegistro09,
                                campoRegistro10: campoRegistro10,
                                campoRegistro11: campoRegistro11,
                                campoRegistro12: campoRegistro12,
                                campoRegistro13: campoRegistro13,
                                campoRegistro14: campoRegistro14,
                                campoRegistro15: campoRegistro15,
                                campoRegistro16: campoRegistro16,
                                campoRegistro17: campoRegistro17,
                                campoRegistro18: campoRegistro18,
                                campoRegistro19: campoRegistro19,
                                campoRegistro20: campoRegistro20,
                                campoRegistro21: campoRegistro21,
                                campoRegistro22: campoRegistro22,
                                campoRegistro23: campoRegistro23,
                                campoRegistro24: campoRegistro24,
                                campoRegistro25: campoRegistro25,
                                campoRegistro26: campoRegistro26,
                                campoRegistro27: campoRegistro27,
                                campoRegistro28: campoRegistro28,
                                campoRegistro29: campoRegistro29,
                                campoRegistro30: campoRegistro30,
                                campoRegistro31: campoRegistro31,
                                campoRegistro32: campoRegistro32,
                                campoRegistro33: campoRegistro33,
                                campoRegistro34: campoRegistro34,
                                campoRegistro35: campoRegistro35,
                                campoRegistro36: campoRegistro36,
                                campoRegistro37: campoRegistro37,
                                campoRegistro38: campoRegistro38,
                                campoRegistro39: campoRegistro39,
                                campoRegistro40: campoRegistro40,
                                campoRegistro41: campoRegistro41,
                                campoRegistro42: campoRegistro42,
                                campoRegistro43: campoRegistro43,
                                campoRegistro44: campoRegistro44,
                                campoRegistro45: campoRegistro45

                            });
                            return true;
                        });
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
                                let llave = result.getValue(searchLoad.columns[48]);
                                let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                                let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                                let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                                let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                                let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                                let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                                let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                                let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                                if (campoRegistro08 == '- None -') {
                                    campoRegistro08 = '';
                                }
                                let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                                let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                                let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                                let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                                if (campoRegistro12 == '- None -') {
                                    campoRegistro12 = ''
                                }
                                let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                                let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                                campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                                let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                                campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                                let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                                campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                                let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                                if (campoRegistro17 == '.00') {
                                    campoRegistro17 = '0.00'
                                }
                                let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                                if (campoRegistro18 == '.00') {
                                    campoRegistro18 = '0.00'
                                }
                                let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                                if (campoRegistro19 == '.00') {
                                    campoRegistro19 = '0.00'
                                }
                                let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                                if (campoRegistro20 == '.00') {
                                    campoRegistro20 = '0.00'
                                }
                                let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                                if (campoRegistro21 == '.00') {
                                    campoRegistro21 = '0.00'
                                }
                                let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                                if (campoRegistro22 == '.00') {
                                    campoRegistro22 = '0.00'
                                } else if (campoRegistro22 == '0') {
                                    campoRegistro22 = '0.00'
                                }

                                let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                                if (campoRegistro23 == '.00') {
                                    campoRegistro23 = '0.00'
                                }
                                let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                                if (campoRegistro24 == '.00') {
                                    campoRegistro24 = '0.00'
                                }
                                let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                                let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                                if (campoRegistro26 == '1.00') {
                                    campoRegistro26 = '1.000'
                                }
                                campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                                let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                                if (campoRegistro27 == '- None -') {
                                    campoRegistro27 = '';
                                }
                                let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                                if (campoRegistro28 == '- None -') {
                                    campoRegistro28 = '';
                                }
                                let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                                if (campoRegistro29 == '- None -') {
                                    campoRegistro29 = '';
                                }
                                let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                                if (campoRegistro30 == '- None -') {
                                    campoRegistro30 = '';
                                }
                                let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                                if (campoRegistro31 == '- None -') {
                                    campoRegistro31 = '';
                                }
                                let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                                if (campoRegistro32 == '- None -') {
                                    campoRegistro32 = '';
                                }
                                let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                                if (campoRegistro33 == '- None -') {
                                    campoRegistro33 = '';
                                }
                                let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                                if (campoRegistro34 == '- None -') {
                                    campoRegistro34 = '';
                                }
                                let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                                if (campoRegistro35 == '- None -') {
                                    campoRegistro35 = '';
                                }
                                let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                                if (campoRegistro36 == '- None -') {
                                    campoRegistro36 = '';
                                }
                                let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                                if (campoRegistro37 == '- None -') {
                                    campoRegistro37 = '';
                                }
                                let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                                let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                                let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                                let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                                let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                                if(campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                                if (campoRegistro41 == '- None -') {
                                    campoRegistro41 = '';
                                }
                                let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                                if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '1';
                                } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                    || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                    || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                    || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                    || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                    || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                    || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                    && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '0';
                                } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                    || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '6';
                                } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                    && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '7';
                                } else if (campoRegistro06 == '05') {
                                    campoRegistro42 = '1';
                                }
                                let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                                let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                                let campoRegistro45 = result.getValue(searchLoad.columns[44]);

                                json.push({
                                    llave: llave,
                                    campoRegistro01: campoRegistro01,
                                    campoRegistro02: campoRegistro02,
                                    campoRegistro03: campoRegistro03,
                                    campoRegistro04: campoRegistro04,
                                    campoRegistro05: campoRegistro05,
                                    campoRegistro06: campoRegistro06,
                                    campoRegistro07: campoRegistro07,
                                    campoRegistro08: campoRegistro08,
                                    campoRegistro09: campoRegistro09,
                                    campoRegistro10: campoRegistro10,
                                    campoRegistro11: campoRegistro11,
                                    campoRegistro12: campoRegistro12,
                                    campoRegistro13: campoRegistro13,
                                    campoRegistro14: campoRegistro14,
                                    campoRegistro15: campoRegistro15,
                                    campoRegistro16: campoRegistro16,
                                    campoRegistro17: campoRegistro17,
                                    campoRegistro18: campoRegistro18,
                                    campoRegistro19: campoRegistro19,
                                    campoRegistro20: campoRegistro20,
                                    campoRegistro21: campoRegistro21,
                                    campoRegistro22: campoRegistro22,
                                    campoRegistro23: campoRegistro23,
                                    campoRegistro24: campoRegistro24,
                                    campoRegistro25: campoRegistro25,
                                    campoRegistro26: campoRegistro26,
                                    campoRegistro27: campoRegistro27,
                                    campoRegistro28: campoRegistro28,
                                    campoRegistro29: campoRegistro29,
                                    campoRegistro30: campoRegistro30,
                                    campoRegistro31: campoRegistro31,
                                    campoRegistro32: campoRegistro32,
                                    campoRegistro33: campoRegistro33,
                                    campoRegistro34: campoRegistro34,
                                    campoRegistro35: campoRegistro35,
                                    campoRegistro36: campoRegistro36,
                                    campoRegistro37: campoRegistro37,
                                    campoRegistro38: campoRegistro38,
                                    campoRegistro39: campoRegistro39,
                                    campoRegistro40: campoRegistro40,
                                    campoRegistro41: campoRegistro41,
                                    campoRegistro42: campoRegistro42,
                                    campoRegistro43: campoRegistro43,
                                    campoRegistro44: campoRegistro44,
                                    campoRegistro45: campoRegistro45

                                });
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
                    }
                }

                log.debug('json', json);

                const searchLoad2 = search.load({
                    id: searchId2
                });

                let filters2 = searchLoad2.filters;

                const filterThree = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: period
                });

                filters2.push(filterThree);

                if (featureSubsidiary) {
                    const filterFour = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiary
                    });
                    filters2.push(filterFour);
                }

                searchLoad2.filters = filters2;

                if (searchResultCount2 != 0) {
                    if (searchResultCount2 <= 4000) {
                        searchLoad2.run().each((result) => {
                            let llave = result.getValue(searchLoad2.columns[46]);
                            let campoRegistro01 = result.getValue(searchLoad2.columns[0]);
                            let campoRegistro02 = result.getValue(searchLoad2.columns[1]);
                            let campoRegistro03 = result.getValue(searchLoad2.columns[2]);
                            let campoRegistro04 = result.getValue(searchLoad2.columns[3]);
                            let campoRegistro05 = result.getValue(searchLoad2.columns[4]);
                            let campoRegistro06 = result.getValue(searchLoad2.columns[5]);
                            let campoRegistro07 = result.getValue(searchLoad2.columns[6]);
                            let campoRegistro08 = result.getValue(searchLoad2.columns[7]);
                            if (campoRegistro08 == '- None -') {
                                campoRegistro08 = '';
                            }
                            let campoRegistro09 = result.getValue(searchLoad2.columns[8]);
                            let campoRegistro10 = result.getValue(searchLoad2.columns[9]);
                            let campoRegistro11 = result.getValue(searchLoad2.columns[10]);
                            let campoRegistro12 = result.getValue(searchLoad2.columns[11]);
                            if (campoRegistro12 == '- None -') {
                                campoRegistro12 = ''
                            }
                            let campoRegistro13 = result.getValue(searchLoad2.columns[12]);
                            let campoRegistro14 = result.getValue(searchLoad2.columns[13]);
                            campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                            let campoRegistro15 = result.getValue(searchLoad2.columns[14]);
                            campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                            let campoRegistro16 = result.getValue(searchLoad2.columns[15]);
                            campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                            let campoRegistro17 = result.getValue(searchLoad2.columns[16]);
                            if (campoRegistro17 == '.00') {
                                campoRegistro17 = '0.00'
                            }
                            let campoRegistro18 = result.getValue(searchLoad2.columns[17]);
                            if (campoRegistro18 == '.00') {
                                campoRegistro18 = '0.00'
                            }
                            let campoRegistro19 = result.getValue(searchLoad2.columns[18]);
                            if (campoRegistro19 == '.00') {
                                campoRegistro19 = '0.00'
                            }
                            let campoRegistro20 = result.getValue(searchLoad2.columns[19]);
                            if (campoRegistro20 == '.00') {
                                campoRegistro20 = '0.00'
                            }
                            let campoRegistro21 = result.getValue(searchLoad2.columns[20]);
                            if (campoRegistro21 == '.00') {
                                campoRegistro21 = '0.00'
                            }
                            let campoRegistro22 = result.getValue(searchLoad2.columns[21]);
                            if (campoRegistro22 == '.00') {
                                campoRegistro22 = '0.00'
                            } else if (campoRegistro22 == '0') {
                                campoRegistro22 = '0.00'
                            }

                            let campoRegistro23 = result.getValue(searchLoad2.columns[22]);
                            if (campoRegistro23 == '.00') {
                                campoRegistro23 = '0.00'
                            }
                            let campoRegistro24 = result.getValue(searchLoad2.columns[23]);
                            if (campoRegistro24 == '.00') {
                                campoRegistro24 = '0.00'
                            }
                            let campoRegistro25 = result.getValue(searchLoad2.columns[24]);
                            let campoRegistro26 = result.getValue(searchLoad2.columns[25]);
                            if (campoRegistro26 == '1.00') {
                                campoRegistro26 = '1.000'
                            }
                            campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                            let campoRegistro27 = result.getValue(searchLoad2.columns[26]);
                            if (campoRegistro27 == '- None -') {
                                campoRegistro27 = '';
                            }
                            let campoRegistro28 = result.getValue(searchLoad2.columns[27]);
                            if (campoRegistro28 == '- None -') {
                                campoRegistro28 = '';
                            }
                            let campoRegistro29 = result.getValue(searchLoad2.columns[28]);
                            if (campoRegistro29 == '- None -') {
                                campoRegistro29 = '';
                            }
                            let campoRegistro30 = result.getValue(searchLoad2.columns[29]);
                            if (campoRegistro30 == '- None -') {
                                campoRegistro30 = '';
                            }
                            let campoRegistro31 = result.getValue(searchLoad2.columns[30]);
                            if (campoRegistro31 == '- None -') {
                                campoRegistro31 = '';
                            }
                            let campoRegistro32 = result.getValue(searchLoad2.columns[31]);
                            if (campoRegistro32 == '- None -') {
                                campoRegistro32 = '';
                            }
                            let campoRegistro33 = result.getValue(searchLoad2.columns[32]);
                            if (campoRegistro33 == '- None -') {
                                campoRegistro33 = '';
                            }
                            let campoRegistro34 = result.getValue(searchLoad2.columns[33]);
                            if (campoRegistro34 == '- None -') {
                                campoRegistro34 = '';
                            }
                            let campoRegistro35 = result.getValue(searchLoad2.columns[34]);
                            if (campoRegistro35 == '- None -') {
                                campoRegistro35 = '';
                            }
                            let campoRegistro36 = result.getValue(searchLoad2.columns[35]);
                            if (campoRegistro36 == '- None -') {
                                campoRegistro36 = '';
                            }
                            let campoRegistro37 = result.getValue(searchLoad2.columns[36]);
                            if (campoRegistro37 == '- None -') {
                                campoRegistro37 = '';
                            }
                            let campoRegistro38 = result.getValue(searchLoad2.columns[37]);
                            let campoRegistro39 = result.getValue(searchLoad2.columns[38]);
                            let campoRegistro40 = result.getValue(searchLoad2.columns[39]);
                            let campoRegistro41 = result.getValue(searchLoad2.columns[40]);
                            if (campoRegistro41 == '- None -') {
                                campoRegistro41 = '';
                            }
                            let campoRegistro42 = result.getValue(searchLoad2.columns[41]);
                            if(campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                            let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                            if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '1';
                            } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                && (campoRegistro01 == periodoEmision)) {
                                campoRegistro42 = '0';
                            } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '6';
                            } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                && (campoRegistro01 != periodoEmision)) {
                                campoRegistro42 = '7';
                            } else if (campoRegistro06 == '05') {
                                campoRegistro42 = '1';
                            }
                            let campoRegistro43 = result.getValue(searchLoad2.columns[42]);
                            let campoRegistro44 = result.getValue(searchLoad2.columns[43]);
                            let campoRegistro45 = result.getValue(searchLoad2.columns[44]);


                            json.push({
                                llave: llave,
                                campoRegistro01: campoRegistro01,
                                campoRegistro02: campoRegistro02,
                                campoRegistro03: campoRegistro03,
                                campoRegistro04: campoRegistro04,
                                campoRegistro05: campoRegistro05,
                                campoRegistro06: campoRegistro06,
                                campoRegistro07: campoRegistro07,
                                campoRegistro08: campoRegistro08,
                                campoRegistro09: campoRegistro09,
                                campoRegistro10: campoRegistro10,
                                campoRegistro11: campoRegistro11,
                                campoRegistro12: campoRegistro12,
                                campoRegistro13: campoRegistro13,
                                campoRegistro14: campoRegistro14,
                                campoRegistro15: campoRegistro15,
                                campoRegistro16: campoRegistro16,
                                campoRegistro17: campoRegistro17,
                                campoRegistro18: campoRegistro18,
                                campoRegistro19: campoRegistro19,
                                campoRegistro20: campoRegistro20,
                                campoRegistro21: campoRegistro21,
                                campoRegistro22: campoRegistro22,
                                campoRegistro23: campoRegistro23,
                                campoRegistro24: campoRegistro24,
                                campoRegistro25: campoRegistro25,
                                campoRegistro26: campoRegistro26,
                                campoRegistro27: campoRegistro27,
                                campoRegistro28: campoRegistro28,
                                campoRegistro29: campoRegistro29,
                                campoRegistro30: campoRegistro30,
                                campoRegistro31: campoRegistro31,
                                campoRegistro32: campoRegistro32,
                                campoRegistro33: campoRegistro33,
                                campoRegistro34: campoRegistro34,
                                campoRegistro35: campoRegistro35,
                                campoRegistro36: campoRegistro36,
                                campoRegistro37: campoRegistro37,
                                campoRegistro38: campoRegistro38,
                                campoRegistro39: campoRegistro39,
                                campoRegistro40: campoRegistro40,
                                campoRegistro41: campoRegistro41,
                                campoRegistro42: campoRegistro42,
                                campoRegistro43: campoRegistro43,
                                campoRegistro44: campoRegistro44,
                                campoRegistro45: campoRegistro45

                            });
                            return true;
                        });
                    } else {
                        division = searchResultCount2 / 1000;
                        laps = Math.round(division);
                        if (division > laps) {
                            laps = laps + 1
                        }
                        for (let i = 1; i <= laps; i++) {
                            if (i != laps) {
                                searchResult = searchLoad2.run().getRange({ start: start, end: end });
                            } else {
                                searchResult = searchLoad2.run().getRange({ start: start, end: searchResultCount2 });
                            }
                            for (let j in searchResult) {
                                let llave = result.getValue(searchLoad2.columns[46]);
                                let campoRegistro01 = result.getValue(searchLoad.columns[0]);
                                let campoRegistro02 = result.getValue(searchLoad.columns[1]);
                                let campoRegistro03 = result.getValue(searchLoad.columns[2]);
                                let campoRegistro04 = result.getValue(searchLoad.columns[3]);
                                let campoRegistro05 = result.getValue(searchLoad.columns[4]);
                                let campoRegistro06 = result.getValue(searchLoad.columns[5]);
                                let campoRegistro07 = result.getValue(searchLoad.columns[6]);
                                let campoRegistro08 = result.getValue(searchLoad.columns[7]);
                                if (campoRegistro08 == '- None -') {
                                    campoRegistro08 = '';
                                }
                                let campoRegistro09 = result.getValue(searchLoad.columns[8]);
                                let campoRegistro10 = result.getValue(searchLoad.columns[9]);
                                let campoRegistro11 = result.getValue(searchLoad.columns[10]);
                                let campoRegistro12 = result.getValue(searchLoad.columns[11]);
                                if (campoRegistro12 == '- None -') {
                                    campoRegistro12 = ''
                                }
                                let campoRegistro13 = result.getValue(searchLoad.columns[12]);
                                let campoRegistro14 = result.getValue(searchLoad.columns[13]);
                                campoRegistro14 = parseFloat(campoRegistro14).toFixed(2);

                                let campoRegistro15 = result.getValue(searchLoad.columns[14]);
                                campoRegistro15 = parseFloat(campoRegistro15).toFixed(2);

                                let campoRegistro16 = result.getValue(searchLoad.columns[15]);
                                campoRegistro16 = parseFloat(campoRegistro16).toFixed(2);

                                let campoRegistro17 = result.getValue(searchLoad.columns[16]);
                                if (campoRegistro17 == '.00') {
                                    campoRegistro17 = '0.00'
                                }
                                let campoRegistro18 = result.getValue(searchLoad.columns[17]);
                                if (campoRegistro18 == '.00') {
                                    campoRegistro18 = '0.00'
                                }
                                let campoRegistro19 = result.getValue(searchLoad.columns[18]);
                                if (campoRegistro19 == '.00') {
                                    campoRegistro19 = '0.00'
                                }
                                let campoRegistro20 = result.getValue(searchLoad.columns[19]);
                                if (campoRegistro20 == '.00') {
                                    campoRegistro20 = '0.00'
                                }
                                let campoRegistro21 = result.getValue(searchLoad.columns[20]);
                                if (campoRegistro21 == '.00') {
                                    campoRegistro21 = '0.00'
                                }
                                let campoRegistro22 = result.getValue(searchLoad.columns[21]);
                                if (campoRegistro22 == '.00') {
                                    campoRegistro22 = '0.00'
                                } else if (campoRegistro22 == '0') {
                                    campoRegistro22 = '0.00'
                                }

                                let campoRegistro23 = result.getValue(searchLoad.columns[22]);
                                if (campoRegistro23 == '.00') {
                                    campoRegistro23 = '0.00'
                                }
                                let campoRegistro24 = result.getValue(searchLoad.columns[23]);
                                if (campoRegistro24 == '.00') {
                                    campoRegistro24 = '0.00'
                                }
                                let campoRegistro25 = result.getValue(searchLoad.columns[24]);
                                let campoRegistro26 = result.getValue(searchLoad.columns[25]);
                                if (campoRegistro26 == '1.00') {
                                    campoRegistro26 = '1.000'
                                }
                                campoRegistro26 = parseFloat(campoRegistro26).toFixed(3);

                                let campoRegistro27 = result.getValue(searchLoad.columns[26]);
                                if (campoRegistro27 == '- None -') {
                                    campoRegistro27 = '';
                                }
                                let campoRegistro28 = result.getValue(searchLoad.columns[27]);
                                if (campoRegistro28 == '- None -') {
                                    campoRegistro28 = '';
                                }
                                let campoRegistro29 = result.getValue(searchLoad.columns[28]);
                                if (campoRegistro29 == '- None -') {
                                    campoRegistro29 = '';
                                }
                                let campoRegistro30 = result.getValue(searchLoad.columns[29]);
                                if (campoRegistro30 == '- None -') {
                                    campoRegistro30 = '';
                                }
                                let campoRegistro31 = result.getValue(searchLoad.columns[30]);
                                if (campoRegistro31 == '- None -') {
                                    campoRegistro31 = '';
                                }
                                let campoRegistro32 = result.getValue(searchLoad.columns[31]);
                                if (campoRegistro32 == '- None -') {
                                    campoRegistro32 = '';
                                }
                                let campoRegistro33 = result.getValue(searchLoad.columns[32]);
                                if (campoRegistro33 == '- None -') {
                                    campoRegistro33 = '';
                                }
                                let campoRegistro34 = result.getValue(searchLoad.columns[33]);
                                if (campoRegistro34 == '- None -') {
                                    campoRegistro34 = '';
                                }
                                let campoRegistro35 = result.getValue(searchLoad.columns[34]);
                                if (campoRegistro35 == '- None -') {
                                    campoRegistro35 = '';
                                }
                                let campoRegistro36 = result.getValue(searchLoad.columns[35]);
                                if (campoRegistro36 == '- None -') {
                                    campoRegistro36 = '';
                                }
                                let campoRegistro37 = result.getValue(searchLoad.columns[36]);
                                if (campoRegistro37 == '- None -') {
                                    campoRegistro37 = '';
                                }
                                let campoRegistro38 = result.getValue(searchLoad.columns[37]);
                                let campoRegistro39 = result.getValue(searchLoad.columns[38]);
                                let campoRegistro40 = result.getValue(searchLoad.columns[39]);
                                let campoRegistro41 = result.getValue(searchLoad.columns[40]);
                                if (campoRegistro41 == '- None -') {
                                    campoRegistro41 = '';
                                }
                                let campoRegistro42 = result.getValue(searchLoad.columns[41]);
                                if(campoRegistro42 == '- None -') {
                                campoRegistro42 = '';
                            }
                                let periodoEmision = formatDate(campoRegistro04)['anio'] + formatDate(campoRegistro04)['mes'] + '00';
                                if ((campoRegistro06 == '01' || campoRegistro06 == '14') && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '1';
                                } else if ((campoRegistro06 == '00' || campoRegistro06 == '02' || campoRegistro06 == '03' || campoRegistro06 == '04'
                                    || campoRegistro06 == '09' || campoRegistro06 == '10' || campoRegistro06 == '11' || campoRegistro06 == '15'
                                    || campoRegistro06 == '16' || campoRegistro06 == '17' || campoRegistro06 == '18' || campoRegistro06 == '20' || campoRegistro06 == '21'
                                    || campoRegistro06 == '22' || campoRegistro06 == '24' || campoRegistro06 == '27' || campoRegistro06 == '33' || campoRegistro06 == '34'
                                    || campoRegistro06 == '35' || campoRegistro06 == '40' || campoRegistro06 == '41' || campoRegistro06 == '42' || campoRegistro06 == '44'
                                    || campoRegistro06 == '45' || campoRegistro06 == '52' || campoRegistro06 == '53' || campoRegistro06 == '54' || campoRegistro06 == '91'
                                    || campoRegistro06 == '96' || campoRegistro06 == '97' || campoRegistro06 == '98' || campoRegistro06 == '30')
                                    && (campoRegistro01 == periodoEmision)) {
                                    campoRegistro42 = '0';
                                } else if ((campoRegistro06 == '01' || campoRegistro06 == '07' || campoRegistro06 == '14' || campoRegistro06 == '08' || campoRegistro06 == '50'
                                    || campoRegistro06 == '05') && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '6';
                                } else if ((campoRegistro06 != '01' || campoRegistro06 != '07' || campoRegistro06 != '14' || campoRegistro06 != '10' || campoRegistro06 != '03')
                                    && (campoRegistro01 != periodoEmision)) {
                                    campoRegistro42 = '7';
                                } else if (campoRegistro06 == '05') {
                                    campoRegistro42 = '1';
                                }
                                let campoRegistro43 = result.getValue(searchLoad.columns[42]);
                                let campoRegistro44 = result.getValue(searchLoad.columns[43]);
                                let campoRegistro45 = result.getValue(searchLoad.columns[44]);

                                json.push({
                                    llave: llave,
                                    campoRegistro01: campoRegistro01,
                                    campoRegistro02: campoRegistro02,
                                    campoRegistro03: campoRegistro03,
                                    campoRegistro04: campoRegistro04,
                                    campoRegistro05: campoRegistro05,
                                    campoRegistro06: campoRegistro06,
                                    campoRegistro07: campoRegistro07,
                                    campoRegistro08: campoRegistro08,
                                    campoRegistro09: campoRegistro09,
                                    campoRegistro10: campoRegistro10,
                                    campoRegistro11: campoRegistro11,
                                    campoRegistro12: campoRegistro12,
                                    campoRegistro13: campoRegistro13,
                                    campoRegistro14: campoRegistro14,
                                    campoRegistro15: campoRegistro15,
                                    campoRegistro16: campoRegistro16,
                                    campoRegistro17: campoRegistro17,
                                    campoRegistro18: campoRegistro18,
                                    campoRegistro19: campoRegistro19,
                                    campoRegistro20: campoRegistro20,
                                    campoRegistro21: campoRegistro21,
                                    campoRegistro22: campoRegistro22,
                                    campoRegistro23: campoRegistro23,
                                    campoRegistro24: campoRegistro24,
                                    campoRegistro25: campoRegistro25,
                                    campoRegistro26: campoRegistro26,
                                    campoRegistro27: campoRegistro27,
                                    campoRegistro28: campoRegistro28,
                                    campoRegistro29: campoRegistro29,
                                    campoRegistro30: campoRegistro30,
                                    campoRegistro31: campoRegistro31,
                                    campoRegistro32: campoRegistro32,
                                    campoRegistro33: campoRegistro33,
                                    campoRegistro34: campoRegistro34,
                                    campoRegistro35: campoRegistro35,
                                    campoRegistro36: campoRegistro36,
                                    campoRegistro37: campoRegistro37,
                                    campoRegistro38: campoRegistro38,
                                    campoRegistro39: campoRegistro39,
                                    campoRegistro40: campoRegistro40,
                                    campoRegistro41: campoRegistro41,
                                    campoRegistro42: campoRegistro42,
                                    campoRegistro43: campoRegistro43,
                                    campoRegistro44: campoRegistro44,
                                    campoRegistro45: campoRegistro45

                                });
                            }
                            start = start + 1000;
                            end = end + 1000;
                        }
                    }
                }

                if (searchResultCount > 0 || searchResultCount2 > 0) {
                    const groupedData = json.reduce((acc, curr) => {
                        const key = curr.llave;
                        if (!acc[key]) {
                            acc[key] = {
                                campoRegistro01: curr.campoRegistro01,
                                campoRegistro02: curr.campoRegistro02,
                                campoRegistro03: curr.campoRegistro03,
                                campoRegistro04: curr.campoRegistro04,
                                campoRegistro05: curr.campoRegistro05,
                                campoRegistro06: curr.campoRegistro06,
                                campoRegistro07: curr.campoRegistro07,
                                campoRegistro08: curr.campoRegistro08,
                                campoRegistro09: curr.campoRegistro09,
                                campoRegistro10: curr.campoRegistro10,
                                campoRegistro11: curr.campoRegistro11,
                                campoRegistro12: curr.campoRegistro12,
                                campoRegistro13: curr.campoRegistro13,
                                campoRegistro14: 0,
                                campoRegistro15: 0,
                                campoRegistro16: 0,
                                campoRegistro17: 0,
                                campoRegistro18: 0,
                                campoRegistro19: 0,
                                campoRegistro20: 0,
                                campoRegistro21: 0,
                                campoRegistro22: 0.00,
                                campoRegistro23: 0,
                                campoRegistro24: 0,
                                campoRegistro25: curr.campoRegistro25,
                                campoRegistro26: curr.campoRegistro26,
                                campoRegistro27: curr.campoRegistro27,
                                campoRegistro28: curr.campoRegistro28,
                                campoRegistro29: curr.campoRegistro29,
                                campoRegistro30: curr.campoRegistro30,
                                campoRegistro31: curr.campoRegistro31,
                                campoRegistro32: curr.campoRegistro32,
                                campoRegistro33: curr.campoRegistro33,
                                campoRegistro34: curr.campoRegistro34,
                                campoRegistro35: curr.campoRegistro35,
                                campoRegistro36: curr.campoRegistro36,
                                campoRegistro37: curr.campoRegistro37,
                                campoRegistro38: curr.campoRegistro38,
                                campoRegistro39: curr.campoRegistro39,
                                campoRegistro40: curr.campoRegistro40,
                                campoRegistro41: curr.campoRegistro41,
                                campoRegistro42: curr.campoRegistro42,
                                campoRegistro43: curr.campoRegistro43,
                                campoRegistro44: curr.campoRegistro44,
                                campoRegistro45: curr.campoRegistro45
                            };
                        }

                        acc[key].campoRegistro14 += parseFloat(curr.campoRegistro14);
                        acc[key].campoRegistro15 += parseFloat(curr.campoRegistro15);
                        acc[key].campoRegistro16 += parseFloat(curr.campoRegistro16);
                        acc[key].campoRegistro17 += parseFloat(curr.campoRegistro17);
                        acc[key].campoRegistro18 += parseFloat(curr.campoRegistro18);
                        acc[key].campoRegistro19 += parseFloat(curr.campoRegistro19);
                        acc[key].campoRegistro20 += parseFloat(curr.campoRegistro20);
                        acc[key].campoRegistro21 += parseFloat(curr.campoRegistro21);

                        //acc[key].campoRegistro22 += parseFloat(curr.campoRegistro22);
                        acc[key].campoRegistro22 = curr.campoRegistro22;

                        acc[key].campoRegistro23 += parseFloat(curr.campoRegistro23);
                        acc[key].campoRegistro24 += parseFloat(curr.campoRegistro24);
                        acc[key].campoRegistro24 = parseFloat(acc[key].campoRegistro24.toFixed(2));

                        return acc;
                    }, {});
                    let array = Object.values(groupedData);
                    //return { thereisinfo: 1, content: array };

                    for (let i = 0; i < array.length; i++) {

                        json2.push({
                            campoRegistro01: array[i].campoRegistro01,
                            campoRegistro02: array[i].campoRegistro02,
                            campoRegistro03: array[i].campoRegistro03,
                            campoRegistro04: array[i].campoRegistro04,
                            campoRegistro05: array[i].campoRegistro05,
                            campoRegistro06: array[i].campoRegistro06,
                            campoRegistro07: array[i].campoRegistro07,
                            campoRegistro08: array[i].campoRegistro08,
                            campoRegistro09: array[i].campoRegistro09,
                            campoRegistro10: array[i].campoRegistro10,
                            campoRegistro11: array[i].campoRegistro11,
                            campoRegistro12: array[i].campoRegistro12,
                            campoRegistro13: array[i].campoRegistro13,
                            campoRegistro14: array[i].campoRegistro14,
                            campoRegistro15: array[i].campoRegistro15,
                            campoRegistro16: array[i].campoRegistro16,
                            campoRegistro17: array[i].campoRegistro17,
                            campoRegistro18: array[i].campoRegistro18,
                            campoRegistro19: array[i].campoRegistro19,
                            campoRegistro20: array[i].campoRegistro20,
                            campoRegistro21: array[i].campoRegistro21,
                            campoRegistro22: array[i].campoRegistro22,
                            campoRegistro23: array[i].campoRegistro23,
                            campoRegistro24: array[i].campoRegistro24,
                            campoRegistro25: array[i].campoRegistro25,
                            campoRegistro26: array[i].campoRegistro26,
                            campoRegistro27: array[i].campoRegistro27,
                            campoRegistro28: array[i].campoRegistro28,
                            campoRegistro29: array[i].campoRegistro29,
                            campoRegistro30: array[i].campoRegistro30,
                            campoRegistro31: array[i].campoRegistro31,
                            campoRegistro32: array[i].campoRegistro32,
                            campoRegistro33: array[i].campoRegistro33,
                            campoRegistro34: array[i].campoRegistro34,
                            campoRegistro35: array[i].campoRegistro35,
                            campoRegistro36: array[i].campoRegistro36,
                            campoRegistro37: array[i].campoRegistro37,
                            campoRegistro38: array[i].campoRegistro38,
                            campoRegistro39: array[i].campoRegistro39,
                            campoRegistro40: array[i].campoRegistro40,
                            campoRegistro41: array[i].campoRegistro41,
                            campoRegistro42: array[i].campoRegistro42,
                            campoRegistro43: array[i].campoRegistro43,
                            campoRegistro44: array[i].campoRegistro44,
                            campoRegistro45: array[i].campoRegistro45

                        });

                    }

                    return { thereisinfo: 1, content: json2 };
                }
                else return { thereisinfo: 0 };
            } catch (e) {
                log.error('Error en searchBook', {
                    message: error.message,
                    stack: error.stack
                });
                throw error;
            }
        }


        const structureBody = (searchResult) => {
            try {
                return searchResult.map(record => {
                    return [
                        record.campoRegistro01, record.campoRegistro02, record.campoRegistro03,
                        record.campoRegistro04, record.campoRegistro05, record.campoRegistro06, record.campoRegistro07,
                        record.campoRegistro08, record.campoRegistro09, record.campoRegistro10, record.campoRegistro11,
                        record.campoRegistro12, record.campoRegistro13, record.campoRegistro14, record.campoRegistro15,
                        record.campoRegistro16, record.campoRegistro17, record.campoRegistro18, record.campoRegistro19,
                        record.campoRegistro20, record.campoRegistro21, record.campoRegistro22, record.campoRegistro23,
                        record.campoRegistro24, record.campoRegistro25, record.campoRegistro26, record.campoRegistro27,
                        record.campoRegistro28, record.campoRegistro29, record.campoRegistro30, record.campoRegistro31,
                        record.campoRegistro32, record.campoRegistro33, record.campoRegistro34, record.campoRegistro35,
                        record.campoRegistro36, record.campoRegistro37, record.campoRegistro38, record.campoRegistro39,
                        record.campoRegistro40, record.campoRegistro41, record.campoRegistro42, record.campoRegistro43,
                        record.campoRegistro44, record.campoRegistro45
                    ].join('|') + '|';
                }).join('\n');
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
                return '';
            }
        }

        const createFile = (params, fedIdNumb, hasinfo, filterFormat, transactionJSON, fileCabinetId) => {
            let typeformat;
            const header = 'Periodo,' +
                'Numero correlativo del mes o Codigo unico de la Operacion (CUO),' +
                'Numero correlativo del asiento contable,' +
                'Fecha de emision del comprobante de pago o documento,' +
                'Fecha de Vencimiento o Fecha de Pago,' +
                'Tipo de Comprobante de Pago o Documento,' +
                'Serie del comprobante de pago o documento,' +
                'Emision de la DUA o DSI,' +
                'Numero del comprobante de pago o documento,' +
                'En caso de optar por anotar el importe total de las operaciones diarias ,' +
                'Tipo de Documento de Identidad del proveedor,' +
                'Numero de RUC del proveedor o numero de documento de Identidad,' +
                'Apellidos y nombres denominacion o razon social  del proveedor,' +
                'Base imponible de las adquisiciones gravadas que dan derecho a credito fiscal,' +
                'Monto del Impuesto General a las Ventas,' +
                'Base imponible de las adquisiciones gravadas que dan derecho a credito fiscal,' +
                'Monto del Impuesto General a las Ventas,' +
                'Base imponible de las adquisiciones gravadas que no dan derecho a credito fiscal ,' +
                'Monto del Impuesto General a las Ventas,' +
                'Valor de las adquisiciones no gravadas,' +
                'Monto del Impuesto Selectivo al Consumo,' +
                'Impuesto al Consumo de las Bolsas de Plastico,' +
                'Otros conceptos tributos y cargos que no formen parte de la base imponible,' +
                'Importe total de las adquisiciones registradas segun comprobante de pago,' +
                'Codigo  de la Moneda,' +
                'Tipo de cambio,' +
                'Fecha de emision del comprobante de pago que se modifica,' +
                'Tipo de comprobante de pago que se modifica,' +
                'Numero de serie del comprobante de pago que se modifica,' +
                'Codigo de la dependencia Aduanera de la Declaracion unica de Aduanas (DUA),' +
                'Numero del comprobante de pago que se modifica,' +
                'Fecha de emision de la Constancia de Deposito de Detraccion,' +
                'Numero de la Constancia de Deposito de Detraccion,' +
                'Marca del comprobante de pago sujeto a retencion,' +
                'Clasificacion de los bienes y servicios adquiridos,' +
                'Identificacion del Contrato o del proyecto en el caso de los Operadores de las sociedades irregulares,' +
                'Error tipo 1,' +
                'Error tipo 2,' +
                'Error tipo 3,' +
                'Error tipo 4,' +
                'Indicador de Comprobantes de pago cancelados con medios de pago,' +
                'Estado que identifica la oportunidad de la anotacion o indicacion si esta corresponde a un ajuste\n';
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
                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '080100' + '00' + '1' + hasinfo + '11';

                // Log antes de procesar structureBody y getJsonData
                log.debug('Antes de procesar', {
                    registrosOriginales: transactionJSON.length
                });
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);

                // Log después de procesar
                log.debug('Después de procesar', {
                    registrosTXT: structuregbody.split('\n').filter(line => line.trim() !== '').length,
                    registrosPDF: jsonAxiliar.body.length,
                    diferencia: structuregbody.split('\n').filter(line => line.trim() !== '').length - jsonAxiliar.body.length
                });

                if (params.filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (params.filterFormat == 'TXT') {
                    log.debug('Análisis TXT', {
                        totalLineas: structuregbody.split('\n').filter(line => line.trim() !== '').length,
                        muestraLineas: structuregbody.split('\n').slice(0, 3)
                    });
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (params.filterFormat == 'PDF') {
                    log.debug('Análisis PDF', {
                        totalRegistros: jsonAxiliar.body.length,
                        muestraRegistros: jsonAxiliar.body.slice(0, 3)
                    });
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet

                    // Log antes de renderizar PDF
                    log.debug('Datos antes de renderizar PDF', {
                        totalRegistros: jsonAxiliar.body.length,
                        head: jsonAxiliar.head,
                        muestraBody: jsonAxiliar.body.slice(0, 3),
                        footer: jsonAxiliar.footer
                    });

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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_8_1_pdf.ftl");
            return aux.getContents();
        };

        function getJsonData(transactionJSON, params) {
            let currentUser = runtime.getCurrentUser();
            let userName = currentUser.name;
            try {

                // Log inicial
                log.debug('Entrada getJsonData', {
                    totalRegistros: transactionJSON.length
                });

                let jsonAxiliar = {
                    head: {
                        titulo: 'FORMATO 8.1: REGISTRO DE COMPRAS',
                        periodo: getPeriodName(params.filterPostingPeriod),
                        ruc: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        razonSocial: getSubsidiaria(params.filterSubsidiary, 'razonSocial'),
                        fechaHora: getDateActual(),
                        usuario: userName,
                        idioma: obtenerIdiomaDeSesion()
                    },
                    body: transactionJSON,
                    footer: {
                        T_campoRegistro14: getTotalMontoJson(transactionJSON, 'campoRegistro14'),
                        T_campoRegistro15: getTotalMontoJson(transactionJSON, 'campoRegistro15'),
                        T_campoRegistro16: getTotalMontoJson(transactionJSON, 'campoRegistro16'),
                        T_campoRegistro17: getTotalMontoJson(transactionJSON, 'campoRegistro17'),
                        T_campoRegistro18: getTotalMontoJson(transactionJSON, 'campoRegistro18'),
                        T_campoRegistro19: getTotalMontoJson(transactionJSON, 'campoRegistro19'),
                        T_campoRegistro20: getTotalMontoJson(transactionJSON, 'campoRegistro20'),
                        T_campoRegistro21: getTotalMontoJson(transactionJSON, 'campoRegistro21'),
                        T_campoRegistro23: getTotalMontoJson(transactionJSON, 'campoRegistro23'),
                        T_campoRegistro24: getTotalMontoJson(transactionJSON, 'campoRegistro24')
                    }
                };

                // Verificar los datos antes del formateo
                log.debug('Antes de formateo', {
                    totalRegistros: jsonAxiliar.body.length
                });

                jsonAxiliar.body.forEach(item => {
                    try {
                        item.campoRegistro14 = numberWithCommas(item.campoRegistro14);
                        item.campoRegistro15 = numberWithCommas(item.campoRegistro15);
                        item.campoRegistro16 = numberWithCommas(item.campoRegistro16);
                        item.campoRegistro17 = numberWithCommas(item.campoRegistro17);
                        item.campoRegistro18 = numberWithCommas(item.campoRegistro18);
                        item.campoRegistro19 = numberWithCommas(item.campoRegistro19);
                        item.campoRegistro20 = numberWithCommas(item.campoRegistro20);
                        item.campoRegistro21 = numberWithCommas(item.campoRegistro21);
                        item.campoRegistro23 = numberWithCommas(item.campoRegistro23);
                        item.campoRegistro24 = numberWithCommas(item.campoRegistro24);
                    } catch (e) {
                        log.error('Error en formateo de registro', {
                            registro: item,
                            error: e.message
                        });
                    }

                });

                // Log final
                log.debug('Salida getJsonData', {
                    totalRegistros: jsonAxiliar.body.length,
                    muestra: jsonAxiliar.body.slice(0, 3)
                });

                return jsonAxiliar;
            } catch (error) {
                log.error('Error (getJsonData)', error.message);
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
        }

        const getDateActual = () => {
            try {
                const now = new Date();
                const day = now.getDate();
                const month = now.getMonth() + 1;
                const year = now.getFullYear();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();

                return [day.toString().padStart(2, '0'), month.toString().padStart(2, '0'), year].join('/')
                    + ' ' +
                    [hours.toString().padStart(2, '0'), minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')].join(':');
            } catch (error) {
                log.error('Error(getDateActual)', error.message);
                return '-';
            }
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
            if (x != 0) {
                let [entero, decimal] = parseFloat(x).toFixed(2).split('.');
                entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return decimal ? `${entero}.${decimal}` : entero;
            }
            let numString = parseFloat(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return (numString === '0.00') ? '0.00' : numString;
        };

        function obtenerIdiomaDeSesion() {
            // Obtener el contexto de la sesión
            var idiomaSesion = runtime.getCurrentUser().getPreference('language');

            // Verificar si se obtuvo el idioma correctamente
            if (idiomaSesion) {
                return idiomaSesion;
            } else {
                return 'Idioma no disponible';
            }
        };

        // Función auxiliar para manejar tipo de cambio y evitar NaN
        const procesarTipoCambio = (valor) => {
            if (valor == '1.00') {
                valor = '1.000'
            }
            // Validar antes de parseFloat para evitar NaN
            if (valor == null || valor == undefined || valor == '' || valor == '- None -') {
                return '';
            } else {
                return parseFloat(valor).toFixed(3);
            }
        };


        // CONVIERTE A LA FECHA EN FORMATO JSON
        function formatDate(dateString) {
            var date = dateString.split('/');
            if (Number(date[0]) < 10) date[0] = '0' + Number(date[0]);
            if (Number(date[1]) < 10) date[1] = '0' + Number(date[1]);
            return { 'anio': date[2], 'mes': date[1], 'dia': date[0] }
        }

        const getTotalMontoJson = (transactionJSON, campo) => {
            let total = transactionJSON.reduce((total, record) => {
                return total + (parseFloat(record[campo]) || 0); // Suma el valor, o 0 si es undefined
            }, 0); // El valor inicial es 0
            return numberWithCommas(total);
        }



        return { execute }

    });
