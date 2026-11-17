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

        const SCRIPT_ID = 'customscript_ts_ss_le_8_2';
        const DEPLOYMENT_ID = 'customdeploy_ts_ss_le_8_2';
        const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;


         /** FECHA ACTUAL*/
         var now = new Date();

         // Obtén la hora UTC actual
         var utcHour = now.getUTCHours();
         var utcMinute = now.getUTCMinutes();
         var utcSecond = now.getUTCSeconds();
 
         // Ajuste para la zona horaria de Perú (GMT-5)
         var peruOffset = -5;  // Perú está en GMT-5
         var adjustedHour = utcHour + peruOffset;
 
         // Crea un nuevo objeto de fecha ajustado
         var adjustedTime = new Date(now);
         adjustedTime.setUTCHours(adjustedHour, utcMinute, utcSecond, 0);
 
         // Obtén los componentes de la fecha ajustada
         var day = adjustedTime.getUTCDate().toString().padStart(2, '0');
         var month = (adjustedTime.getUTCMonth() + 1).toString().padStart(2, '0');
         var year = adjustedTime.getUTCFullYear();
         var hours = adjustedTime.getUTCHours().toString().padStart(2, '0');
         var minutes = adjustedTime.getUTCMinutes().toString().padStart(2, '0');
         var seconds = adjustedTime.getUTCSeconds().toString().padStart(2, '0');

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
                    const searchId = 'customsearch_pe_registro_de_compra_8_2';
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
                            if (column08 == '.00') {
                                column08 = '0.00'
                            }
                            let column09 = result.getValue(searchLoad.columns[8]);
                            if (column09 == '.00') {
                                column09 = '0.00'
                            }
                            let column10 = result.getValue(searchLoad.columns[9]);
                            if (column10 == '.00' || column10.startsWith('.')) {  // Agregar el startsWith aquí
                                column10 = '0' + column10;
                            }
                            let column11 = result.getValue(searchLoad.columns[10]);
                            if (column11 == '- None -') {
                                column11 = ''
                            }
                            let column12 = result.getValue(searchLoad.columns[11]);
                            if (column12 == '- None -') {
                                column12 = ''
                            }
                            let column13 = result.getValue(searchLoad.columns[12]);
                            if (column13 == '- None -') {
                                column13 = ''
                            }
                            let column14 = result.getValue(searchLoad.columns[13]);
                            if (column14 == '- None -') {
                                column14 = ''
                            }
                            let column15 = result.getValue(searchLoad.columns[14]);
                            if (column15 == '.00') {
                                column15 = '0.00'
                            }
                            const column16 = result.getValue(searchLoad.columns[15]);
                            let column17 = result.getValue(searchLoad.columns[16]);
                            column17 = parseFloat(column17).toFixed(3);
                            const column18 = result.getValue(searchLoad.columns[17]);
                            const column19 = result.getValue(searchLoad.columns[18]);
                            const column20 = result.getValue(searchLoad.columns[19]);
                            const column21 = result.getValue(searchLoad.columns[20]);
                            const column22 = result.getValue(searchLoad.columns[21]);
                            const column23 = result.getValue(searchLoad.columns[22]);
                            const column24 = result.getValue(searchLoad.columns[23]);
                            const column25 = result.getValue(searchLoad.columns[24]);
                            let column26 = result.getValue(searchLoad.columns[25]);
                            if (column26 == '.00') {
                                column26 = '0.00'
                            }
                            let column27 = result.getValue(searchLoad.columns[26]);
                            if (column27 == '.00') {
                                column27 = '0.00'
                            }
                            let column28 = result.getValue(searchLoad.columns[27]);
                            if (column28 == '.00') {
                                column28 = '0.00'
                            }
                            let column29 = result.getValue(searchLoad.columns[28]);
                            if (column29 != '') {
                                column29 = parseFloat(column29).toFixed(2);
                            }
                            let column30 = result.getValue(searchLoad.columns[29]);
                            if (column30 == '.00') {
                                column30 = '0.00'
                            }
                            if (column30 != '') {
                                column30 = parseFloat(column30).toFixed(2);
                            }
                            let column31 = result.getValue(searchLoad.columns[30]);
                            if (column31 == '- None -') {
                                column31 = ''
                            }
                            let column32 = result.getValue(searchLoad.columns[31]);
                            if (column32 == '- None -') {
                                column32 = ''
                            }
                            let column33 = result.getValue(searchLoad.columns[32]);
                            if (column33 == '- None -') {
                                column33 = ''
                            }
                            let column34 = result.getValue(searchLoad.columns[33]);
                            if (column34 == '- None -') {
                                column34 = ''
                            }
                            let column35 = result.getValue(searchLoad.columns[34]);
                            if (column35 == '- None -') {
                                column35 = ''
                            }
                            const column36 = result.getValue(searchLoad.columns[35]);
                            const column37 = result.getValue(searchLoad.columns[36]);
                            const column38 = result.getValue(searchLoad.columns[37]);
                            const column39 = result.getValue(searchLoad.columns[38]);
                            const column40 = result.getValue(searchLoad.columns[39]);

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
                                c11_tipo_comprobante_credito: column11,
                                c12_serie_comp_Dua: column12,
                                c13_año_emision_dua: column13,
                                c14_nro_orden: column14,
                                c15_monto_retención: column15,
                                c16_cod_moneda: column16,
                                c17_tipo_Cambio: column17,
                                c18_pais_residencia: column18,
                                c19_apellidos_nombres: column19,
                                c20_domicilio_extranjero: column20,
                                c21_numero_ident: column21,
                                c22_numero_ident_fiscal: column22,
                                c23_apellidos_nombres_proveedor: column23,
                                c24_pais_residencia: column24,
                                c25_vicunlo: column25,
                                c26_renta_bruta: column26,
                                c27_Deduccion_costo: column27,
                                c28_renta_neta: column28,
                                c29_tasa_retención: column29,
                                c30_impuesto_retenido: column30,
                                c31_convenio: column31,
                                c32_exoneracion_aplicada: column32,
                                c33_tipo_renta: column33,
                                c34_modalidad_servicio: column34,
                                c35_aplicacion_penultimo: column35,
                                c36_estado_oportunidad: column36,
                                c37_periodo: column37,
                                c38_periodo_inicial: column38,
                                c39_periodo_final: column39,
                                c40_fecha_vencimiento: column40
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
                                if (column08 == '.00') {
                                    column08 = '0.00'
                                }
                                let column09 = searchResult[j].getValue(searchLoad.columns[8]);
                                if (column09 == '.00') {
                                    column09 = '0.00'
                                }
                                let column10 = searchResult[j].getValue(searchLoad.columns[9]);
                                if (column10 == '.00' || column10.startsWith('.')) {  // Agregar el startsWith aquí
                                    column10 = '0' + column10;
                                }
                                let column11 = searchResult[j].getValue(searchLoad.columns[10]);
                                if (column11 == '- None -') {
                                    column11 = ''
                                }
                                let column12 = searchResult[j].getValue(searchLoad.columns[11]);
                                if (column12 == '- None -') {
                                    column12 = ''
                                }
                                let column13 = searchResult[j].getValue(searchLoad.columns[12]);
                                if (column13 == '- None -') {
                                    column13 = ''
                                }
                                let column14 = searchResult[j].getValue(searchLoad.columns[13]);
                                if (column14 == '- None -') {
                                    column14 = ''
                                }
                                let column15 = searchResult[j].getValue(searchLoad.columns[14]);
                                if (column15 == '.00') {
                                    column15 = '0.00'
                                }
                                const column16 = searchResult[j].getValue(searchLoad.columns[15]);
                                let column17 = searchResult[j].getValue(searchLoad.columns[16]);
                                column17 = parseFloat(column17).toFixed(3);

                                const column18 = searchResult[j].getValue(searchLoad.columns[17]);
                                const column19 = searchResult[j].getValue(searchLoad.columns[18]);
                                const column20 = searchResult[j].getValue(searchLoad.columns[19]);
                                const column21 = searchResult[j].getValue(searchLoad.columns[20]);
                                const column22 = searchResult[j].getValue(searchLoad.columns[21]);
                                const column23 = searchResult[j].getValue(searchLoad.columns[22]);
                                const column24 = searchResult[j].getValue(searchLoad.columns[23]);
                                const column25 = searchResult[j].getValue(searchLoad.columns[24]);
                                const column26 = searchResult[j].getValue(searchLoad.columns[25]);
                                let column27 = searchResult[j].getValue(searchLoad.columns[26]);
                                if (column27 == '.00') {
                                    column27 = '0.00'
                                }
                                const column28 = searchResult[j].getValue(searchLoad.columns[27]);
                                let column29 = searchResult[j].getValue(searchLoad.columns[28]);
                                column29 = parseFloat(column29).toFixed(2);
                                const column30 = searchResult[j].getValue(searchLoad.columns[29]);
                                const column31 = searchResult[j].getValue(searchLoad.columns[30]);
                                const column32 = searchResult[j].getValue(searchLoad.columns[31]);
                                const column33 = searchResult[j].getValue(searchLoad.columns[32]);
                                const column34 = searchResult[j].getValue(searchLoad.columns[33]);
                                const column35 = searchResult[j].getValue(searchLoad.columns[34]);
                                const column36 = searchResult[j].getValue(searchLoad.columns[35]);
                                const column37 = result[j].getValue(searchLoad.columns[36]);
                                const column38 = result[j].getValue(searchLoad.columns[37]);
                                const column39 = result[j].getValue(searchLoad.columns[38]);
                                const column40 = result[j].getValue(searchLoad.columns[39]);

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
                                    c11_tipo_comprobante_credito: column11,
                                    c12_serie_comp_Dua: column12,
                                    c13_año_emision_dua: column13,
                                    c14_nro_orden: column14,
                                    c15_monto_retención: column15,
                                    c16_cod_moneda: column16,
                                    c17_tipo_Cambio: column17,
                                    c18_pais_residencia: column18,
                                    c19_apellidos_nombres: column19,
                                    c20_domicilio_extranjero: column20,
                                    c21_numero_ident: column21,
                                    c22_numero_ident_fiscal: column22,
                                    c23_apellidos_nombres_proveedor: column23,
                                    c24_pais_residencia: column24,
                                    c25_vicunlo: column25,
                                    c26_renta_bruta: column26,
                                    c27_Deduccion_costo: column27,
                                    c28_renta_neta: column28,
                                    c29_tasa_retención: column29,
                                    c30_impuesto_retenido: column30,
                                    c31_convenio: column31,
                                    c32_exoneracion_aplicada: column32,
                                    c33_tipo_renta: column33,
                                    c34_modalidad_servicio: column34,
                                    c35_aplicacion_penultimo: column35,
                                    c36_estado_oportunidad: column36,
                                    c37_periodo: column37,
                                    c38_perido_inicial: column38,
                                    c39_perido_final: column39,
                                    c40_fecha_vencimiento: column40
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
                    searchResult[i].c10_importe_total + '|' + searchResult[i].c11_tipo_comprobante_credito + '|' + searchResult[i].c12_serie_comp_Dua + '|' +
                    searchResult[i].c13_año_emision_dua + '|' + searchResult[i].c14_nro_orden + '|' + searchResult[i].c15_monto_retención + '|' + searchResult[i].c16_cod_moneda + '|' +
                    searchResult[i].c17_tipo_Cambio + '|' + searchResult[i].c18_pais_residencia + '|' + searchResult[i].c19_apellidos_nombres + '|' + searchResult[i].c20_domicilio_extranjero + '|' + searchResult[i].c21_numero_ident + '|' +
                    searchResult[i].c22_numero_ident_fiscal + '|' + searchResult[i].c23_apellidos_nombres_proveedor + '|' + searchResult[i].c24_pais_residencia + '|' +
                    searchResult[i].c25_vicunlo + '|' + searchResult[i].c26_renta_bruta + '|' + searchResult[i].c27_Deduccion_costo + '|' + searchResult[i].c28_renta_neta + '|' +
                    searchResult[i].c29_tasa_retención + '|' + searchResult[i].c30_impuesto_retenido + '|' + searchResult[i].c31_convenio + '|' + searchResult[i].c32_exoneracion_aplicada + '|' +
                    searchResult[i].c33_tipo_renta + '|' + searchResult[i].c34_modalidad_servicio + '|' + searchResult[i].c35_aplicacion_penultimo + '|' + searchResult[i].c36_estado_oportunidad + '|' + searchResult[i].c37_periodo+ '|' + searchResult[i].c38_perido_inicial+'|' + searchResult[i].c39_perido_final + '|\n';
                }

                return contentReport;
            } catch (e) {
                log.error({ title: 'structureBody', details: e });
            }
        } 

        const createFile = (params, fedIdNumb, hasinfo, recordlogid, filterFormat, transactionJSON, fileCabinetId) => {
            let typeformat;
            const header = '1 PERIODO,2 CUO,3 CORRELATIVO,4 FECHA DE EMISION DEL COMP DE PAGO O DOC,'+                        
            '5 TIPO DE COMP DE PAGO O DOC,'+
            '6 SERIE DEL COMP DE PAGO O DOC,'+
            '7 NRO DEL COMP DE PAGO O DOC,' +
            '8 VALOR DE ADQUISICIONES,'+
            '9 OTROS CONCEPTOS, TRIBUTOS Y CARGOS QUE NO FORMEN PARTE DE LA BASE IMPONIBLE,'+
            '10 IMPORTE TOTAL DE LAS ADQUISICIONES REGISTRADAS SEGÚN COMPROBANTES DE PAGO,'+
            '11 TIPO DE COMPROBANTE DE PAGO QUE SUSTENTA EL CRÉDITO FISCAL,'+
            '12 SERIE COMPROBANTE DE PAGO O DOC (DUA) (DSI),'+
            '13 AÑO DE EMISIÓN DE LA DUA O DSI,'+
            '14 NÚMERO DE ORDEN FISICO O VIRTUAL DEL NO DOMICIALILADO (DUA) (DSI),'+
            '15 Monto de Retención del IGV,'+
            '16 Codigo de Moneda,'+
            '17 Tipo de Cambio,'+
            '18 Pais de la Residencia del No Domiciliado,'+
            '19 Apellidos y Nombres o Razón Social del No Domiciliado,'+
            '20. Domicilio en el Extranjero del No Domiciliado,'+
            '21 Número de Identificación del No Domiciliado,'+
            '22 Nro de identificación Fiscal del Beneficiario efectivo de los pagos,'+
            '23 Ap y Nom denominación o Razón Social del Proveedor,'+
            '24 País de Residencia del Beneficiario efectivos de los pagos,'+
            '25 Vínculo Contrib. y Res. Extranj.,'+
            '26 Renta Bruta,'+
            '27 Deducción / Costo de Enajenación de Bienes de Capital,'+
            '28 Renta Neta,'+
            '29 Tasa de Retención,'+
            '30 Impuesto Retenido,'+
            '31 Convenios para evitar la doble Imposición,'+
            '32 Exoneración Aplicada,'+
            '33 Tipo de Renta,'+
            '34 Modalidad del Servicio Prestado por el No Domiciliado,'+
            '35 Aplicación del Penúltimo párrafo del Art 76° de la Ley de Impuesto a la Renta,'+
            '36 Estado que identifica la Oportunidad de la Anotación o Indicación,'+
            '37 Periodo,'+
            '38 Periodo Inicial,'+
            '39 Periodo Final,'+
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

                let nameReportGenerated = 'LE' + fedIdNumb + periodostring + '080200' + '00' + '1' + hasinfo + '11';
                let structuregbody = structureBody(transactionJSON);
                let jsonAxiliar = getJsonData(transactionJSON, params);
                
                if (params.filterFormat == 'CSV') {
                    nameReportGenerated = nameReportGenerated + '.csv';
                    structuregbody = header + structuregbody;
                    structuregbody = structuregbody.replace(/[,]/gi, ' ');
                    structuregbody = structuregbody.replace(/[|]/gi, ',');
                    typeformat = file.Type.CSV;
                } else if (params.filterFormat == 'TXT')  {
                    nameReportGenerated = nameReportGenerated + '.txt';
                    typeformat = file.Type.PLAINTEXT;
                } else if (params.filterFormat == 'PDF') {
                    log.debug('jsonAxiliar YWH', jsonAxiliar);
                    // Generar el contenido PDF
                    var renderer = render.create();
                    renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet
                    
                    // Uso de la función
                    var idioma = obtenerIdiomaDeSesion();
                    log.debug('idioma', idioma);
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

        const getTemplate = () => {
            var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_8_2_pdf.ftl");
            return aux.getContents();
        };

        function getJsonData(transactionJSON, params) {
            let currentUser = runtime.getCurrentUser();
            let userName = currentUser.name;
            try {
    
                let jsonAxiliar = {
                    head: {
                        titulo: 'FORMATO 8.2: REGISTRO DE COMPRAS NO DOMICILIADOS',
                        periodo: getPeriodName(params.filterPostingPeriod),
                        ruc: getSubsidiaria(params.filterSubsidiary, 'ruc'),
                        razonSocial: getSubsidiaria(params.filterSubsidiary, 'razonSocial'),
                        fechaHora: getDateActual(),
                        usuario: userName,
                        idioma: obtenerIdiomaDeSesion()
                    },
                    body: transactionJSON
                };    
                return jsonAxiliar;
            } catch (error) {
                log.error('Error (getJsonData)', error.message);
            }
        };

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

        const getDateActual = () => {
            try {
                return [day.toString().padStart(2, '0'), month.toString().padStart(2, '0'), year].join('/')
                        + ' ' +
                        [hours.toString().padStart(2, '0'),minutes.toString().padStart(2, '0'),seconds.toString().padStart(2, '0')].join(':');
            } catch (error) {
                log.error('Error(getDateActual)', error.message);
                return '-';
            }
        }

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

        const numberWithCommas = (x) => {
            if (x != 0) {
                let [entero, decimal] = parseFloat(x).toFixed(2).split('.');
                entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                return decimal ? `${entero}.${decimal}` : entero;
            }
            let numString = parseFloat(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return (numString === '0.00') ? '0.00' : numString;
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
