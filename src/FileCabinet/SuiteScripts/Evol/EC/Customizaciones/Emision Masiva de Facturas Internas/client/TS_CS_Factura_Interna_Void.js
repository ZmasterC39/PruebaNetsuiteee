/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/currentRecord', 'N/ui/dialog', 'N/https', "N/search", 'N/runtime'],
    (url, currentRecord, dialog, https, search, runtime) => {

        let curRec = currentRecord.get();

        const pageInit = (scriptContext) => { }

        const fieldChanged = (scriptContext) => {
            let currentRecord = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            let line = scriptContext.line;

            if (fieldId == 'custpage_pageid') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt
                        }
                    });
                } else {
                    dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
                }
            }

            if (fieldId == 'custpage_field_fecha_desde' || fieldId == 'custpage_field_fecha_hasta') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let paramOrdenServicio = curRec.getValue('custpage_field_orden_servicio');
                    let paramNroCuota = curRec.getValue('custpage_field_nrocuota');
                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt,
                            paramOrdenServicio: paramOrdenServicio,
                            paramNroCuota: paramNroCuota,
                        }
                    });
                }
            }

            if (fieldId == 'custpage_field_nrocuota') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let paramOrdenServicio = curRec.getValue('custpage_field_orden_servicio');
                    let paramNroCuota = curRec.getValue('custpage_field_nrocuota');
                    let paramTxtPlazo = curRec.getText('custpage_col_plazo');
                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt,
                            paramOrdenServicio: paramOrdenServicio,
                            paramNroCuota: paramNroCuota,
                        }
                    });
                }
                // else {
                //     dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
                // }
            }

            if (fieldId == 'custpage_field_cliente') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let paramOrdenServicio = curRec.getValue('custpage_field_orden_servicio');
                    let paramNroCuota = curRec.getValue('custpage_field_nrocuota');
                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt,
                            paramOrdenServicio: paramOrdenServicio,
                            paramNroCuota: paramNroCuota,
                        }
                    });
                }
                // else {
                //     dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
                // }
            }

            if (fieldId == 'custpage_field_orden_servicio') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let paramOrdenServicio = curRec.getValue('custpage_field_orden_servicio');
                    let paramNroCuota = curRec.getValue('custpage_field_nrocuota');
                    let paramValidar = curRec.getValue('custpage_col_validar');

                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt,
                            paramOrdenServicio: paramOrdenServicio,
                            paramNroCuota: paramNroCuota,
                            paramValidar: paramValidar
                        }
                    });

                }



                // else {
                //     dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
                // }
            }

            if (fieldId == 'custpage_col_validar') {
                let paramDesde = curRec.getValue('custpage_field_fecha_desde');
                let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
                if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                    let paramCliente = curRec.getValue('custpage_field_cliente');
                    let paramClientetxt = curRec.getText('custpage_field_cliente');
                    let paramOrdenServicio = curRec.getValue('custpage_field_orden_servicio');
                    let paramNroCuota = curRec.getValue('custpage_field_nrocuota');
                    let paramValidar = curRec.getValue('custpage_col_validar');

                    let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                    pageId = parseInt(pageId.split('_')[1]);
                    window.onbeforeunload = null;
                    document.location = url.resolveScript({
                        scriptId: getParameterFromURL('script'),
                        deploymentId: getParameterFromURL('deploy'),
                        params: {
                            page: pageId,
                            paramCargarLista: 'cargarLista',
                            paramDesde: paramDesde,
                            paramHasta: paramHasta,
                            paramCliente: paramCliente,
                            paramClientetxt: paramClientetxt,
                            paramOrdenServicio: paramOrdenServicio,
                            paramNroCuota: paramNroCuota,
                            paramValidar: paramValidar
                        }
                    });
                }



                // else {
                //     dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
                // }
            }

            return true;
        }

        const saveRecord = (scriptContext) => {

            let currentRecord = scriptContext.currentRecord;

            // Obtener valores
            let desde = currentRecord.getValue('custpage_field_fecha_desde');
            let hasta = currentRecord.getValue('custpage_field_fecha_hasta');
            let orden = currentRecord.getValue('custpage_field_orden_servicio');
            let nroCuota = currentRecord.getValue('custpage_field_nrocuota');
            let txtPlazo = currentRecord.getText('custpage_col_plazo');
            let txtPeriodo = currentRecord.getText('custpage_col_tipoperiodo');
            let aplicaReverso = currentRecord.getValue('custpage_col_validar');

            // console.log('aplicaReverso', aplicaReverso);

            if (aplicaReverso) {

                let sublistLineCount = currentRecord.getLineCount({
                    sublistId: "sublist",
                });

                let cantidad_seleccionadas = 0;

                for (let i = 0; i < sublistLineCount; i++) {
                    let checkboxValue = currentRecord.getSublistValue({
                        sublistId: "sublist",
                        fieldId: "sublist_field_seleccion",
                        line: i,
                    });

                    if (checkboxValue) {
                        cantidad_seleccionadas++;
                    }
                }

                // No puede seleccionar todas
                if (cantidad_seleccionadas === sublistLineCount) {
                    dialog.alert({
                        title: 'Información',
                        message: 'No puede seleccionar todas las Fin para el proceso parcial, debe dejar al menos una sin seleccionar'
                    });
                    return false;
                }


                if (!orden || !txtPlazo || !txtPeriodo) {
                    dialog.alert({
                        title: 'Información',
                        message: 'Debe ingresar Plazo, Periodo y Orden de Servicio antes de procesar Anulacion por Orden de Servicio.'
                    });
                    return false;
                }

                if (!txtPlazo || txtPlazo <= 0) {
                    alert('El Plazo debe ser mayor a 0.');
                    return false;
                }

                // Validar periodo seleccionado
                if (txtPeriodo == '- Seleccione -') {
                    alert('Debe seleccionar un Tipo de Periodo.');
                    return false;
                }

                let fieldId = currentRecord.getValue('custpage_field_orden_servicio');

                // dialog.alert({
                //     title: 'Información',
                //     message: fieldId
                // });

                let infItems = obtenerLosItemsDeUnaOS(fieldId)
                // console.log('infItems', infItems);

                let validarReverso = validarPlazoYPeriodo(infItems, txtPlazo, txtPeriodo);
                // console.log('validarReverso', validarReverso);

                if (!validarReverso) {
                    dialog.alert({
                        title: 'Información',
                        message: 'El plazo ingresado es mayor al plazo máximo permitido.'
                    });
                    return false;
                }

                // Validar selección en sublista
                if (verifySelectedSublist(currentRecord, 'sublist', 'sublist_field_seleccion')) {
                    dialog.alert({
                        title: 'Información',
                        message: 'No tiene Facturas Internas Seleccionadas.'
                    });
                    return false;
                }

                if (validarReverso) {
                    let vresumen = resumerReverso(infItems, txtPlazo, txtPeriodo);

                    if (!vresumen) {
                        return false;
                    }

                    let dataJsonFin = obtenerFacturasSeleccionadas(currentRecord);

                    let jsonLogs = {
                        accion: "LogsFacInternaVoid",
                        os: orden,
                        dataJsonItems: infItems,
                        validarReverso: validarReverso,
                        plazo: txtPlazo,
                        periodo: txtPeriodo,
                        dataJsonFin: dataJsonFin,
                        idUsuario: runtime.getCurrentUser().id,
                        bien: infItems.length > 0 ? infItems[0].bien : null,
                        cliente: infItems.length > 0 ? infItems[0].entity : null,
                    };

                    // Enviar logs a un endpoint externo para análisis
                    ConsumirAPIInterna650(jsonLogs);

                    // console.log('jsonLogs', jsonLogs);

                } else {
                    dialog.alert({
                        title: 'Información',
                        message: 'Los ítems de la Orden de Servicio no tienen el mismo plazo y periodo, no se puede aplicar el proceso de reverso.'
                    });
                    return false;
                }

                return true;
                // return false; // Temporal para evitar que se ejecute el proceso mientras se hacen pruebas con los valores obtenidos

            } else {
                if (verifySelectedSublist(currentRecord, 'sublist', 'sublist_field_seleccion')) {
                    dialog.alert({ title: 'Información', message: 'No tiene Facturas Internas Seleccionadas.' });
                    return false;
                }
                return true;
            }

        };

        const viewResults = () => {
            let paramDesde = curRec.getValue('custpage_field_fecha_desde');
            let paramHasta = curRec.getValue('custpage_field_fecha_hasta');
            if (paramDesde.toString().length > 0 && paramHasta.toString().length > 0) {
                let paramCliente = curRec.getValue('custpage_field_cliente');
                let paramClientetxt = curRec.getText('custpage_field_cliente');
                let pageId = curRec.getValue({ fieldId: 'custpage_pageid' });
                pageId = parseInt(pageId.split('_')[1]);
                window.onbeforeunload = null;
                document.location = url.resolveScript({
                    scriptId: getParameterFromURL('script'),
                    deploymentId: getParameterFromURL('deploy'),
                    params: {
                        page: pageId,
                        paramCargarLista: 'cargarLista',
                        paramDesde: paramDesde,
                        paramHasta: paramHasta,
                        paramCliente: paramCliente,
                        paramClientetxt: paramClientetxt
                    }
                });
            } else {
                dialog.alert({ title: 'Información', message: 'Se debe ingresar ambas fechas.' });
            }
        }

        const cleanFilters = () => {
            let suiteletURL = getSuiteletURL();
            setWindowChanged(window, false);
            window.location.href = suiteletURL;
        }

        const createFacturaInterna = (recordId) => {
            https.requestSuitelet({
                scriptId: "customscript_ts_sl_factura_interna_singl",
                deploymentId: "customdeploy_ts_sl_factura_interna_singl",
                urlParams: {
                    recordId: recordId
                }
            });
            location.reload();
        }

        const getParameterFromURL = (param) => {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return (false);
        }

        const verifySelectedSublist = (currentRecord, sublistId, fieldId) => {
            let lines = currentRecord.getLineCount(sublistId);
            if (lines <= 0) return true;
            for (let line = 0; line < lines; line++) {
                let check = currentRecord.getSublistValue({ sublistId, fieldId, line });
                if (check) return false;
            }
            return true;
        }

        const roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }

        const getSuiteletURL = () => {
            return url.resolveScript({
                scriptId: 'customscript_ts_sl_factura_interna_bulk',
                deploymentId: 'customdeploy_ts_sl_factura_interna_bulk',
                returnExternalUrl: false
            });
        }

        /*
        * Funciones de apoyo
        */
        function obtenerLosItemsDeUnaOS(IdOs) {
            try {

                let results = [];
                let itemsUnicos = {};

                // Obtener líneas de la OS
                let soSearch = search.create({
                    type: search.Type.SALES_ORDER,
                    filters: [
                        ["tranid", "is", IdOs],
                        "AND",
                        ["subsidiary", "anyof", "2"],
                        "AND",
                        ["item.internalid", "noneof", "@NONE@"],
                        "AND",
                        ["item.type", "noneof", "TaxItem"]
                    ],
                    columns: [
                        "internalid",
                        "item",
                        "custcol_ht_os_und_tiempo_cobertura",
                        "custcol_ht_os_tiempo_cobertura",
                        "custbody_ht_so_bien",
                        "entity"
                    ]
                });

                let soData = soSearch.run().getRange({ start: 0, end: 100 });

                soData.forEach(r => {

                    let itemId = r.getValue("item");

                    if (itemId) itemsUnicos[itemId] = true;

                    results.push({
                        internalidOs: r.getValue("internalid"),
                        bien: r.getValue("custbody_ht_so_bien"),
                        iditem: itemId,
                        TipoPlazo: r.getValue("custcol_ht_os_und_tiempo_cobertura"),
                        Plazo: r.getValue("custcol_ht_os_tiempo_cobertura"),
                        Fam: "",
                        IdFam: "",
                        entity: r.getValue("entity"),
                    });
                });

                // Si hay items, obtener FAM en bloque
                let itemIds = Object.keys(itemsUnicos);

                if (itemIds.length > 0) {

                    let famMap = {};

                    let famSearch = search.create({
                        type: "customrecord_ht_pp_main_param_prod",
                        filters: [
                            ["custrecord_ht_pp_parametrizacionid", "anyof", itemIds],
                            "AND",
                            ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", "FAM"]
                        ],
                        columns: [
                            "custrecord_ht_pp_parametrizacionid",
                            search.createColumn({
                                name: "custrecord_ht_pp_codigo",
                                join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR"
                            }),
                            search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" })
                        ]
                    });

                    let famData = famSearch.run().getRange({ start: 0, end: 100 });

                    famData.forEach(f => {

                        let itemId = f.getValue("custrecord_ht_pp_parametrizacionid");

                        let valor = f.getValue({
                            name: "custrecord_ht_pp_codigo",
                            join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR"
                        });

                        let param = f.getValue("custrecord_ht_pp_parametrizacion_valor");

                        if (itemId && !famMap[itemId]) {
                            famMap[itemId] = {
                                valor: valor || "",
                                param: param || ""
                            };
                        }
                    });

                    // Asignar FAM y Param en memoria
                    results.forEach(r => {
                        if (famMap[r.iditem]) {
                            r.Fam = famMap[r.iditem].valor;
                            r.IdFam = famMap[r.iditem].param;
                        }
                    });
                }

                return results;

            } catch (error) {
                log.debug("error obtenerLosItemsDeUnaOS", error);
                return [];
            }
        }

        function validarPlazoYPeriodo(data, plazo, periodo) {

            if (!data || data.length === 0) {
                return false;
            }

            const equivalencias = {
                "AÑO": 1,
                "ANO": 1,
                "MES": 2,
                "DIA": 3,
                "DÍA": 3
            };

            const periodoIngresado = equivalencias[periodo.toUpperCase()];
            const plazoIngresado = parseInt(plazo, 10);

            const plazoRef = parseInt(data[0].Plazo, 10);
            const periodoRef = parseInt(data[0].TipoPlazo, 10);

            const validacion1 = data.every(item =>
                parseInt(item.Plazo, 10) === plazoRef &&
                parseInt(item.TipoPlazo, 10) === periodoRef
            );

            const validacion2 = data.every(item => {
                const itemPlazo = parseInt(item.Plazo, 10);
                const itemPeriodo = parseInt(item.TipoPlazo, 10);

                if (periodoIngresado === 1) {
                    return itemPeriodo === 1 && itemPlazo > plazoIngresado;
                }

                if (periodoIngresado === 2) {
                    return (itemPeriodo === 1 && itemPlazo * 12 > plazoIngresado) ||
                        (itemPeriodo === 2 && itemPlazo > plazoIngresado);
                }

                if (periodoIngresado === 3) {
                    return (itemPeriodo === 1 && itemPlazo * 365 > plazoIngresado) ||
                        (itemPeriodo === 2 && itemPlazo * 30 > plazoIngresado) ||
                        (itemPeriodo === 3 && itemPlazo > plazoIngresado);
                }

                return false;
            });

            return validacion1 && validacion2;
        }

        function resumerReverso(data, plazo, periodo) {

            let cantidadItems = data.length;
            // console.log('Cantidad de items en la OS:', cantidadItems);

            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                // console.log(`Item ${i}: Plazo - ${item.Plazo}, Periodo - ${item.TipoPlazo}, FAM - ${item.Fam}, Bien - ${item.bien}, idFam - ${item.IdFam}`);

                let infCobertura = consultaCoberturaPorVehiculoYFamilia(item.bien, item.Fam, item.internalidOs);

                // console.log(`Información de cobertura para item ${i}:`, infCobertura);

                let fechaInicial = infCobertura ? infCobertura.coberturainicial : false;
                let fechaReferencia = infCobertura ? infCobertura.coberturafinal : false;

                if (!fechaReferencia) return false;

                const [d, m, y] = fechaReferencia.split("/");
                let fechaOriginal = new Date(`${y}-${m}-${d}T00:00:00`);

                let dateFinal = new Date(fechaOriginal.getTime());
                let plazoTotal = plazo;

                // console.log(`-- dateFinal -item ${i}:`, typeof dateFinal);
                // console.log(`-- dateFinal -item ${i}:`, dateFinal);

                // console.log(`-- plazoTotal - item ${i}:`, typeof plazoTotal);
                // console.log(`-- plazoTotal - item ${i}:`, plazoTotal);

                // console.log(`-- periodo - item ${i}:`, typeof periodo);
                // console.log(`-- periodo - item ${i}:`, periodo);

                let equivalencias = {
                    "AÑO": "1",
                    "ANO": "1",
                    "MES": "2",
                    "DIA": "3",
                    "DÍA": "3"
                };

                let enteroPeriodo = equivalencias[periodo?.toUpperCase()] || null;

                // console.log(`-- enteroPeriodo - item ${i}:`, typeof enteroPeriodo);
                // console.log(`-- enteroPeriodo - item ${i}:`, enteroPeriodo);

                switch (enteroPeriodo) {
                    case "1": // AÑOS
                        dateFinal.setFullYear(dateFinal.getFullYear() - Math.round(plazoTotal));
                        break;
                    case "2": // MESES
                        dateFinal.setMonth(dateFinal.getMonth() - Math.round(plazoTotal));
                        break;
                    case "3": // DÍAS
                        const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
                        dateFinal = new Date(fechaOriginal.getTime() - (Math.round(plazoTotal) * MILISEGUNDOS_POR_DIA));
                        break;
                }

                // Ajustar 29 de febrero en años no bisiestos
                if (dateFinal.getUTCMonth() === 1 && dateFinal.getUTCDate() === 29) {
                    const anio = dateFinal.getUTCFullYear();
                    const esBisiesto = (anio % 4 === 0 && anio % 100 !== 0) || (anio % 400 === 0);
                    if (!esBisiesto) {
                        dateFinal.setUTCDate(28);
                    }
                }

                const formatearFecha = (f) => {
                    const fecha = new Date(f);
                    const dd = String(fecha.getDate()).padStart(2, '0');
                    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
                    const yyyy = fecha.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                };

                // log.debug(`Fecha recalculada para reverso del item ${i}:`, formatearFecha(dateFinal));
                // console.log('-----------------------------------');
                // Todos los datos 

                let fechaFinalFormateada = formatearFecha(dateFinal);
                let plazoFinal = diferenciaFechas(fechaInicial, fechaFinalFormateada, enteroPeriodo);
                let validacionFechas = validarFechas(fechaInicial, fechaFinalFormateada);

                if (!validacionFechas) {
                    dialog.alert({
                        title: 'Información',
                        message: `La fecha final calculada para el reverso (${fechaFinalFormateada}) no puede ser anterior a la fecha inicial de la cobertura (${fechaInicial}). Por favor revise los datos ingresados.`
                    });
                    return false;
                }

                let dataReverso = {
                    idbien: item.bien,
                    familia: item.Fam,
                    accion: "Update",
                    fechaInicio: fechaInicial,
                    tipocobertura: plazoFinal ? plazoFinal : item.Plazo,
                    unidadcobertu: enteroPeriodo == '1' ? "AÑOS" : enteroPeriodo == '2' ? "MESES" : "DIAS",
                    fechafin: fechaFinalFormateada,
                    idOrdenServicio: item.internalidOs,
                    concepto: "21",
                    codVehiculo: "",
                    condicionalReverso: true,
                };

                // console.log("Datos para reverso:", dataReverso);

                // Enviar a ConsumirAPIInternaAfectarCobertura
                ConsumirAPIInterna650(dataReverso);

                // console.log('-----------------------------------');
                return true;
            }

        }

        function validarFechas(fechaInicial, fechaFinal) {
            try {
                // Convertir de dd/mm/yyyy a Date
                const [d1, m1, y1] = fechaInicial.split('/');
                const [d2, m2, y2] = fechaFinal.split('/');

                const fInicial = new Date(y1, m1 - 1, d1);
                const fFinal = new Date(y2, m2 - 1, d2);

                // Validación
                return fFinal > fInicial;

            } catch (error) {
                console.error("Error en validarFechas:", error);
                return false;
            }
        }

        function consultaCoberturaPorVehiculoYFamilia(IdVehiculo, familiaCodigo, IdOsRelacionado) {
            try {

                // Validar que se reciban los parámetros necesarios
                if (!IdVehiculo || !familiaCodigo || !IdOsRelacionado) {
                    log.error("consultaCoberturaPorVehiculoYFamilia", "Faltan parámetros necesarios");
                    return null;
                }

                // 1. Buscar el ID de la familia según el código recibido
                let familiaSearch = search.create({
                    type: "customrecord_ht_cr_pp_valores",
                    filters: [
                        ["custrecord_ht_pp_codigo", "is", familiaCodigo],
                        "AND",
                        ["custrecord33", "anyof", "2"]
                    ],
                    columns: [search.createColumn({ name: "internalid" })],
                });

                let familiaResult = familiaSearch.run().getRange({ start: 0, end: 1 });


                // No encontró la familia con ese código
                if (familiaResult.length === 0) {
                    return null;
                }

                let idFamilia = familiaResult[0].getValue({ name: "internalid" });

                // 2. Buscar la cobertura usando IdVehiculo y idFamilia
                let coberturaSearch = search.create({
                    type: "customrecord_ht_co_cobertura",
                    filters: [
                        ["custrecord_ht_co_bien", "anyof", IdVehiculo],
                        "AND",
                        ["custrecord_ht_co_familia_prod", "anyof", idFamilia],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "name" }),
                        search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
                        search.createColumn({ name: "custrecord_ht_co_bien" }),
                        search.createColumn({ name: "custrecord_ht_co_producto" }),
                        search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                        search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                        search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
                        search.createColumn({ name: "custrecord_ht_co_plazo" }),
                        search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                        search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
                        search.createColumn({ name: "custrecord_ht_co_propietario" }),
                        search.createColumn({ name: "custrecord_ht_co_estado" }),
                    ],
                });

                let coberturaResult = coberturaSearch.run().getRange({ start: 0, end: 1 });

                if (coberturaResult.length === 0) {
                    // No encontró cobertura para ese vehículo y familia
                    return null;
                }

                let result = coberturaResult[0];

                let IdCobertura = result.getValue({ name: "internalid" });

                if (!IdCobertura) {
                    // No encontró ID de cobertura
                    return null;
                }

                // Construimos el objeto con la info de cobertura
                return {
                    id: result.getValue({ name: "internalid" }),
                    name: result.getValue({ name: "name" }),
                    clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
                    bien: result.getValue({ name: "custrecord_ht_co_bien" }),
                    producto: result.getValue({ name: "custrecord_ht_co_producto" }),
                    coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                    coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                    numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
                    plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
                    estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
                    numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
                    clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
                    estado_dispositivo: result.getValue({ name: "custrecord_ht_co_estado" }),
                    detalles: [],
                    validacionReno: true
                };

            } catch (error) {
                console.log("Error consultaCoberturaPorVehiculoYFamilia", error);
                return null;
            }
        }

        function diferenciaFechas(fechaA, fechaB, tipoPeriodo) {
            try {
                // Convertir de dd/mm/yyyy a Date
                const [d1, m1, y1] = fechaA.split('/');
                const [d2, m2, y2] = fechaB.split('/');

                const fA = new Date(y1, m1 - 1, d1);
                const fB = new Date(y2, m2 - 1, d2);

                let diferencia = 0;

                if (tipoPeriodo === "1") { // AÑOS
                    diferencia = fB.getFullYear() - fA.getFullYear();

                } else if (tipoPeriodo === "2") { // MESES
                    diferencia = (fB.getFullYear() - fA.getFullYear()) * 12 +
                        (fB.getMonth() - fA.getMonth());

                } else if (tipoPeriodo === "3") { // DIAS
                    const msPorDia = 1000 * 60 * 60 * 24;
                    diferencia = Math.floor((fB - fA) / msPorDia);
                }

                return diferencia;

            } catch (error) {
                console.error("Error en diferenciaFechas:", error);
                return 0;
            }
        }

        function ConsumirAPIInterna650(json) {
            try {
                const restletUrl = url.resolveScript({
                    scriptId: 'customscript_hu_ec_rs_in_coberturas',
                    deploymentId: 'customdeploy_hu_ec_rs_in_coberturas',
                    returnExternalUrl: false
                });

                const data = json;

                // Usamos XMLHttpRequest en modo asíncrono
                const xhr = new XMLHttpRequest();
                xhr.open("POST", restletUrl, true); // true = async
                xhr.setRequestHeader("Content-Type", "application/json");
                // alert("Solicitud enviada, el correo se procesará en breve");

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            console.log("Respuesta Restlet:", xhr.responseText);
                            // alert("Correo Enviado");
                        } else {
                            console.error("Error al llamar Restlet:", xhr.statusText);
                            // alert("Error al enviar correo");
                        }
                    }
                };

                xhr.send(JSON.stringify(data));

            } catch (error) {
                console.error("Error general:", error);
                // alert("Error inesperado");
            }
        }

        const obtenerFacturasSeleccionadas = (currentRecord) => {

            let lineCount = currentRecord.getLineCount({ sublistId: 'sublist' });
            let resultados = [];

            for (let i = 0; i < lineCount; i++) {

                let seleccionado = currentRecord.getSublistValue({
                    sublistId: 'sublist',
                    fieldId: 'sublist_field_seleccion',
                    line: i
                });

                if (seleccionado) {

                    resultados.push({
                        internalid: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_internalid',
                            line: i
                        }),
                        nrodoc: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_nrodoc',
                            line: i
                        }),
                        orden: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_orden',
                            line: i
                        }),
                        fecha: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_fecha',
                            line: i
                        }),
                        cliente: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_cliente',
                            line: i
                        }),
                        estado: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_estado',
                            line: i
                        }),
                        cuota: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_cuota',
                            line: i
                        }),
                        importe: currentRecord.getSublistValue({
                            sublistId: 'sublist',
                            fieldId: 'sublist_field_importe',
                            line: i
                        })
                    });

                }
            }

            return resultados;
        };

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            viewResults: viewResults,
            cleanFilters: cleanFilters,
            createFacturaInterna: createFacturaInterna
        };

    });
