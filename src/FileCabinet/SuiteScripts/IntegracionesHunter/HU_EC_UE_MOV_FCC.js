/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/log', 'N/record', 'N/runtime', 'N/search', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', "N/format", "N/query"], (log, record, runtime, search, coberturaController, format, query) => {

    /**
     * Cache 
     */
    const cache = {
        unDato: new Map(),
        familia: new Map(),
        cobertura: new Map(),
        cortesia: new Map(),
        fechaSql: new Map(),
        parametrizacion: new Map(),
        clear() {
            this.unDato.clear();
            this.familia.clear();
            this.cobertura.clear();
            this.cortesia.clear();
            this.fechaSql.clear();
            this.parametrizacion.clear();
        }
    };


    const ADP = {
        RENOVACION: "004",
        INSTALACION_SIN_OT: "008",
        RENOVACION_VAR: "009",
        INSTALACION: "015",
        COMPLEMENTO: "001"
    };
    const ADP_INSTALACION = [ADP.INSTALACION, ADP.INSTALACION_SIN_OT];
    const ADP_PROCESABLES = [ADP.RENOVACION, ADP.RENOVACION_VAR, ADP.INSTALACION_SIN_OT, ADP.INSTALACION];
    const ADP_PROCESABLES_RENO = [ADP.RENOVACION, ADP.RENOVACION_VAR];  // 07/07/2026 DOAS- Solo renovaciones extienden cobertura, no instalaciones.

    // Etiquetas para ID_TIPO_PLAZO: "1"=años, "2"=meses, "3"=días.
    const PLAZO_LABELS = { "1": "AÑO", "2": "MESES", "3": "DIA" };

    // ADP → concepto del detalle de cobertura: 8=renovación, 16=instalación, 17=default.
    const CONCEPTO_COBERTURA_MAP = { "004": 8, "009": 8, "015": 16 };

    // Control de acceso por rol (beforeLoad / beforeSubmit).
    // 3=Administrador, 1894=EC Desarrollo TI, 1785=EC Gerente Cartera, 1811=EC Administrador, 1015=otro
    const ROLES_PERMITIDOS = [3, 1894, 1785, 1811, 1015];
    const CAMPOS_RESTRINGIDOS = [
        'custbody_ht_os_ejecutiva_backoffice',
        'salesrep',
        'custbody_ht_os_ejecutivareferencia'
    ];

    const beforeLoad = (context) => {
        bloquearCamposPorRol(context);
    };

    const beforeSubmit = (context) => { 
        try {
            cache.clear();
            const newRecord = context.newRecord;
            const recordType = newRecord.type;

            switch (recordType) {
                case "salesorder": {
                    validarEdicionCampos(context);

                    const subsidiary = newRecord.getValue("subsidiary") || "0";
                    if (subsidiary != "2") {
                        break;
                    }

                    if (esOrdenAnulada(newRecord)) {
                        log.debug("beforeSubmit salesorder anulada, reverso", { idOS: newRecord.id });
                        procesoReversoPersonalizado(newRecord);
                    }
                    break;
                }

                case "invoice":
                    validarEdicionCampos(context);
                    break;
            }
        } catch (error) {
            log.error('Error en beforeSubmit', { error: error.message, stack: error.stack });
        }
    };

    const afterSubmit = (context) => {  
        try {
            cache.clear();

            const newRecord = context.newRecord;
            const recordType = newRecord.type;
            const idOS = newRecord.id;
            let bien = newRecord.getValue("custbody_ht_so_bien");

            log.debug("afterSubmit", { recordType, idOS, eventType: context.type });

            switch (recordType) {

                case "salesorder": {
                    const subsidiary = newRecord.getValue("subsidiary") || "0";

                    if (esOSDebitoAutomatico(idOS)) {
                        log.debug("salesorder skip - OS de Débito Automático", { idOS });
                        break;
                    }

                    if (context.type === context.UserEventType.CREATE) {
                        crearRegistroLogMCC(bien, idOS, subsidiary, recordType);

                        const ApVenta = newRecord.getValue("custbody_ht_os_aprobacionventa");     // 1 - Aprobado, 3 - Rechazado, 2 - Pendiente
                        const ApCartera = newRecord.getValue("custbody_ht_os_aprobacioncartera"); // 1 - Aprobado, 3 - Rechazado, 2 - Pendiente

                        if (subsidiary == "2" && bien && !esOrdenAnulada(newRecord) && esCortesiaOS(idOS) && ApVenta == "1" && ApCartera == "1") {
                            log.debug("Cortesía: generando cobertura en CREATE", { idOS, bien });

                            const dataGlobalSobreItems = obtenerLosItemsDeUnaOS(idOS, bien);
                            const infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);

                            if (infItemsProceso.cumplen) {
                                const grupos = procesarYAgruparFamilias(infItemsProceso.cumplen);
                                procesarCoberturaFamilias({
                                    grupos,
                                    idTransaccion: idOS,
                                    idOrdenServicio: idOS,
                                    recordType,
                                    modoFacturaAgrupada: false
                                });
                            } else {
                                log.debug("Cortesía: sin items elegibles", infItemsProceso.noCumplen);
                            }
                        }

                        return;
                    }

                    if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT) {
                        const estadoFacturaInterna = newRecord.getValue("custbody_ec_estado_factura_interna");
                        let Subsidiaria = newRecord.getValue("subsidiary");
                        let ApVenta = newRecord.getValue("custbody_ht_os_aprobacionventa");     // 1 - Aprobado, 3 - Rechazado, 2 - Pendiente
                        let ApCartera = newRecord.getValue("custbody_ht_os_aprobacioncartera"); // 1 - Aprobado, 3 - Rechazado, 2 - Pendiente

                    
                        log.debug("afterSubmit salesorder EDIT/XEDIT", { idOS, bien, estadoFacturaInterna, Subsidiaria, ApVenta, ApCartera });


                        if (estadoFacturaInterna == "2" && Subsidiaria == "2" && idOS && bien) {
                            crearRegistroLogMCC(bien, idOS, Subsidiaria, recordType);

                            log.debug("Factura interna emitida, procesando cobertura", { idOS, bien });

                            const dataGlobalSobreItems = obtenerLosItemsDeUnaOS(idOS, bien);
                            const infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);

                         
                            const cumplenSinInstalacion = (infItemsProceso.cumplen || []).filter(item => {
                                const adp = item.infoparametros.find(p => p.Param === "ADP");
                                return !ADP_INSTALACION.includes(adp?.Valor);
                            });

                            if (cumplenSinInstalacion.length) {
                                const grupos = procesarYAgruparFamilias(cumplenSinInstalacion);
                                const ok = procesarCoberturaFamilias({
                                    grupos,
                                    idTransaccion: idOS,
                                    idOrdenServicio: idOS,
                                    recordType,
                                    modoFacturaAgrupada: true
                                });
                                if (!ok) return;
                            } else {
                                log.debug("Factura interna: sin items elegibles (ADP instalación excluidos)", {
                                    cumplen: infItemsProceso.cumplen?.length || 0,
                                    noCumplen: infItemsProceso.noCumplen?.length || 0
                                });
                            }

                            return;
                        }

                        if (subsidiary == "2" && bien && !esOrdenAnulada(newRecord) && esCortesiaOS(idOS) && estadoFacturaInterna != 2 && ApVenta == "1" && ApCartera == "1") {
                            log.debug("Cortesía: generando cobertura en CREATE", { idOS, bien });

                            const dataGlobalSobreItems = obtenerLosItemsDeUnaOS(idOS, bien);

                            log.debug("Cortesía: dataGlobalSobreItems", { idOS, bien, dataGlobalSobreItems });

                            const infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);

                            log.debug("Cortesía: infItemsProceso", { idOS, bien, cumplen: infItemsProceso.cumplen?.length || 0, noCumplen: infItemsProceso.noCumplen?.length || 0 });

                            if (infItemsProceso.cumplen) {
                                const grupos = procesarYAgruparFamilias(infItemsProceso.cumplen);
                                procesarCoberturaFamilias({
                                    grupos,
                                    idTransaccion: idOS,
                                    idOrdenServicio: idOS,
                                    recordType,
                                    modoFacturaAgrupada: false,
                                    cortesia: true
                                });
                            } else {
                                log.debug("Cortesía: sin items elegibles", infItemsProceso.noCumplen);
                            }

                            return;
                        }


                    }
                    break;
                }

                case "invoice": {
                    const subsidiary = newRecord.getValue("subsidiary");
                    if (subsidiary != "2") break;

                    const createdFrom = newRecord.getValue("createdfrom");
                    const id_factura = newRecord.id;

                    // Anulacion de Factura
                    // if (context.type === context.UserEventType.EDIT && esFacturaAnulada(newRecord)) {
                    //     log.debug("AAAA", { id_factura, createdFrom });

                    //     if (!createdFrom) {
                    //         log.debug("Factura anulada sin OS origen - no se puede reversar", { id_factura });
                    //         break;
                    //     }

                    //     try {
                    //         procesoReversoPersonalizado(null, createdFrom, id_factura);
                    //     } catch (error) {
                    //         log.error('Error en reverso por factura anulada', error?.stack || error?.message || error);
                    //     }
                    //     break;
                    // }

                    //  Creacion de Factura 
                    if (context.type !== context.UserEventType.CREATE) break;

                    if (!bien && createdFrom) {
                        bien = obtenerUnDato("transaction", "custbody_ht_so_bien", createdFrom);
                    }

                    if (!bien || !createdFrom) {
                        log.debug("Factura skip - no posee bien o OS origen", { id_factura, bien, createdFrom });
                        return;
                    }

                    if (esOSDebitoAutomatico(createdFrom)) {
                        log.debug("Factura skip - OS origen de Débito Automático", { id_factura, createdFrom });
                        break;
                    }

                    const dataGlobalSobreItems = obtenerLosItemsDeUnaOS(createdFrom, bien);
                    const infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);

                    if (infItemsProceso?.cumplen && infItemsProceso.cumplen.length < 8) {
                        crearRegistroLogMCC(bien, createdFrom, subsidiary, recordType, id_factura);
                    }

                    if (infItemsProceso.cumplen) {
                        const grupos = procesarYAgruparFamilias(infItemsProceso.cumplen);
                        log.debug("invoice CREATE, grupos", {
                            createdFrom, bien, id_factura,
                            cantidad: grupos.length,
                            familias: grupos.map(g => ({ familia: g.familia, adps: g.data.map(d => d.adp) }))
                        });

                        
                        const gruposProcesables = grupos.filter(g => {
                            const familiaConsulta = consultaFamiliaNetsuite(g.familia);
                            if (!familiaConsulta?.id) return true;
                            if (osTieneCoberturaActiva(createdFrom, bien, familiaConsulta.id)) {
                                log.debug("cobertura ya activa", { createdFrom, bien, familia: g.familia, idFamilia: familiaConsulta.id, id_factura });
                                return false;
                            }
                            return true;
                        });

                        log.debug("gruposProcesables tras filtro osTieneCoberturaActiva", {
                            createdFrom, bien, id_factura,
                            familiasProcesables: gruposProcesables.map(g => g.familia),
                            familiasDescartadas: grupos.filter(g => !gruposProcesables.includes(g)).map(g => g.familia)
                        });

                        if (gruposProcesables.length === 0) {
                            log.debug("Factura skip - todas las familias del bien ya tienen cobertura activa", { createdFrom, bien, id_factura });
                            break;
                        }

                        procesarCoberturaFamilias({
                            grupos: gruposProcesables,
                            idTransaccion: idOS,
                            idOrdenServicio: createdFrom,
                            recordType,
                            modoFacturaAgrupada: false
                        });
                    } else {
                        log.debug("Factura: sin items elegibles", infItemsProceso.noCumplen);
                    }
                    break;
                }

                case "creditmemo":
                    try {
                        if (context.type !== context.UserEventType.CREATE) break;

                        const createdFromNC1 = obtenerUnDato("transaction", "createdfrom", newRecord.id);
                        const createdFromNC2 = newRecord.getValue({ fieldId: 'createdfrom' });
                        const factura_ventaid = createdFromNC1 || createdFromNC2;
                        const subsidiaryNC = obtenerUnDato("transaction", "subsidiary", factura_ventaid) || "3";

                        if (!(subsidiaryNC == "2" || subsidiaryNC == 2 && factura_ventaid)) break;

                        log.debug("creditmemo CREATE", { idNC: newRecord.id, factura_ventaid });

                        const objFactura = search.lookupFields({
                            type: search.Type.INVOICE,
                            id: factura_ventaid,
                            columns: ['amount']
                        });
                        let monto_fac = Math.abs(objFactura.amount);

                        let monto_ncr = 0;
                        const transactionSearchObj = search.create({
                            type: "transaction",
                            settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
                            filters: [
                                ["mainline", "is", "T"],
                                "AND",
                                ["customform", "anyof", "132"],
                                "AND",
                                ["createdfrom.internalid", "anyof", `${factura_ventaid}`],
                                "AND",
                                ["subsidiary", "anyof", "2"]
                            ],
                            columns: [search.createColumn({ name: "amount", summary: "SUM", label: "Importe" })]
                        });

                        transactionSearchObj.run().each((result) => {
                            monto_ncr = result.getValue({ name: 'amount', summary: 'SUM' });
                            return true;
                        });
                        monto_ncr = Math.abs(monto_ncr);

                        log.debug("creditmemo: montos NC vs Factura", { monto_ncr, monto_fac });

                        if (monto_ncr === monto_fac) {
                            const idOs_Fac_Not = obtenerUnDato("transaction", "createdfrom", factura_ventaid);

                            let facturasVinculadas = obtenerDocumentos(idOs_Fac_Not, 2);  // 07/08/2026

                            if (!facturasVinculadas || facturasVinculadas?.cantidad === 0) {
                                if (idOs_Fac_Not) {
                                    log.debug("creditmemo total, reverso", { idOS: idOs_Fac_Not, factura_ventaid });
                                    procesoReversoPersonalizado(null, idOs_Fac_Not, factura_ventaid);
                                }
                            } else {
                                log.debug("creditmemo total, reverso no ejecutado por multiples facturas vinculadas a la os", { idOS: idOs_Fac_Not, factura_ventaid, facturasVinculadas });
                            }

                        }
                    } catch (error) {
                        log.error('Error en creditmemo CREATE---', { error: error.message, stack: error.stack });
                    }
                    break;

                case "customsale_ec_factura_interna":
                    try {
                        const objRecord = context.newRecord;
                        if (!objRecord?.id) return;

                        const creadoDesde = obtenerUnDato("transaction", "custbody_ec_created_from_fac_int", objRecord.id);
                        const subsidiary_FI2 = obtenerUnDato("transaction", "subsidiary", creadoDesde) || "3";

                        if (!(subsidiary_FI2 == "2" || subsidiary_FI2 == 2 && creadoDesde)) return;

                        if (typeof objRecord.getValue({ fieldId: 'void' }) === 'undefined') break;

                        log.debug('Factura Interna anulada', { id: objRecord.id, creadoDesde });

                        if (!(creadoDesde?.length > 0)) break;

                        const transactionSearchObj = search.create({
                            type: "transaction",
                            filters: [
                                ["type", "anyof", "CuTrSale112"],
                                "AND",
                                ["custbody_ec_created_from_fac_int", "anyof", creadoDesde],
                                "AND",
                                ["status", "anyof", "CuTrSale112:C"],
                                "AND",
                                ["memomain", "isnot", "VOID"],
                                "AND",
                                ["subsidiary", "anyof", "2"]
                            ],
                            columns: [search.createColumn({ name: "tranid", label: "Document Number" })]
                        });
                        const searchResultCount = transactionSearchObj.runPaged().count;

                        dataSeguimientoAnulacion(objRecord.id);

                        if (searchResultCount == 0) {
                            try {
                                log.debug("Factura interna anulada, reverso (sin otras facturas activas)", { creadoDesde });
                                procesoReversoPersonalizado(null, creadoDesde);
                            } catch (error) {
                                log.error('Error en reverso por factura interna anulada', error);
                            }
                        } else {
                            log.debug("Factura interna anulada: existen otras facturas activas, no se reversa", { creadoDesde, otrasActivas: searchResultCount });
                        }
                    } catch (error) {
                        log.error('Error en factura interna', { error: error.message, stack: error.stack });
                    }
                    break;

            }

        } catch (error) {
            log.error('Error en afterSubmit', { error: error.message, stack: error.stack });
        }

    };


    /*
    * Funciones de apoyo
    */
    function obtenerLosItemsDeUnaOS(IdOs, IdVehiculo) {
        try {
            const serviceOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ["internalid", "is", IdOs],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    "AND",
                    ["custbody_ht_so_bien", "anyof", IdVehiculo],
                    "AND",
                    ["item.type", "noneof", "TaxItem"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura" }),
                    search.createColumn({ name: "custcol_ht_os_tiempo_cobertura" }),
                    search.createColumn({ name: "rate" }),
                    search.createColumn({ name: "displayname", join: "item" }),
                    search.createColumn({ name: "internalid", join: "item" }),
                    search.createColumn({ name: "type", join: "item" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "terms" }),
                    search.createColumn({ name: "status" }),
                    search.createColumn({ name: "custbody_ht_ec_promocion_da" }),
                    search.createColumn({ name: "total" }),
                ],
            });

            const results = [];
            const searchResult = serviceOrderSearch.runPaged();
            searchResult.pageRanges.forEach((pageRange) => {
                const myPage = searchResult.fetch({ index: pageRange.index });
                myPage.data.forEach((result) => {
                    const iditem = result.getValue({ name: "item" });
                    results.push({
                        internalidOs: result.getValue({ name: "internalid" }),
                        bien: result.getValue({ name: "custbody_ht_so_bien" }),
                        iditem,
                        TipoPlazo: result.getValue({ name: "custcol_ht_os_und_tiempo_cobertura" }),
                        Plazo: result.getValue({ name: "custcol_ht_os_tiempo_cobertura" }),
                        infoparametros: obtenerParametrizacionItem(iditem, ['ADP', 'PPS', 'FAM']),
                        fechaOs: result.getValue({ name: "trandate" }),
                        status: result.getValue({ name: "status" }),
                        CambProp: result.getValue({ name: "custbody_ht_ec_promocion_da" }),
                        valor: result.getValue({ name: "total" }),
                        terms: result.getValue({ name: "terms" })
                    });
                });
            });
            return results;
        } catch (error) {
            log.error("Error en obtenerLosItemsDeUnaOS", error.stack);
            return [];
        }
    }

    function obtenerParametrizacionItem(items, busquedaParametro) {
        try {
            const cacheKey = `param|${items}|${busquedaParametro.join(',')}`;
            if (cache.parametrizacion.has(cacheKey)) return cache.parametrizacion.get(cacheKey);

            const codesFilter = busquedaParametro.reduce((acc, code, i) => {
                if (i > 0) acc.push("OR");
                acc.push(["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", code]);
                return acc;
            }, []);

            const busqueda = search.create({
                type: "customrecord_ht_pp_main_param_prod",
                filters: [
                    ["custrecord_ht_pp_parametrizacionid", "is", items],
                    "AND",
                    codesFilter
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
                    search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
                    search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
                ],
            });

            const data = [];
            busqueda.run().getRange({ start: 0, end: busquedaParametro.length }).forEach(result => {
                const columns = result.columns;
                data.push({
                    Param: result.getValue(columns[2]) || "",
                    ParamId: result.getValue(columns[0]) || "",
                    Valor: result.getValue(columns[3]) || "",
                    ValorText: result.getText(columns[1]) || "",
                    ValorId: result.getValue(columns[1]) || "",
                });
            });

            cache.parametrizacion.set(cacheKey, data);
            return data;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return [];
        }
    }

    function consultaCoberturaMovFcc(IdVehiculo, idfamilia) {
        const cacheKey = `${IdVehiculo}|${idfamilia}`;
        if (cache.cobertura.has(cacheKey)) return cache.cobertura.get(cacheKey);

        try {
            const CoberturaSearch = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["custrecord_ht_co_bien", "anyof", IdVehiculo],
                    "AND",
                    ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
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

            const results = [];
            const searchResult = CoberturaSearch.runPaged();
            searchResult.pageRanges.forEach((pageRange) => {
                const myPage = searchResult.fetch({ index: pageRange.index });
                myPage.data.forEach((result) => {
                    results.push({
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
                    });
                });
            });

            cache.cobertura.set(cacheKey, results[0]);
            return results[0];
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return [];
        }
    }

    function filtraDatosQueCumplaParametros(data) {
        try {

            log.debug("filtraDatosQueCumplaParametros - data recibida", { data: data });

            const cumplen = [];
            const noCumplen = [];

            data.forEach((item) => {

                try { // Captura errores individuales para no interrumpir el proceso completo // 26/06/2026
                    let infTerms = item.terms;
                    // Solo no cumple si la OS tiene valor 0 y el termino es "81"
                    if (!infTerms || (infTerms === "81" && (parseFloat(item.valor) || 0) === 0)) {
                        log.error("--AJUSTE", { infTerms, valor: item.valor });
                        noCumplen.push(item);
                        return;
                    }
                } catch (error) {
                    log.error("--Error al evaluar terms y valor", { error: error.message, item });
                }

                const parametros = item.infoparametros;

                if (parametros.length !== 3) {
                    noCumplen.push(item);
                    return;
                }

                const adp = parametros.find((param) => param.Param === "ADP");
                const pps = parametros.find((param) => param.Param === "PPS");
                const fam = parametros.find((param) => param.Param === "FAM");

                if (!adp || !pps || !fam) {
                    noCumplen.push(item);
                    return;
                }

                const cumpleAdp = ADP_PROCESABLES.includes(adp.Valor);
                const cumplePps = pps.Valor === "S";
                const cumpleFam = fam.Valor !== "";

                if (cumpleAdp && cumplePps && cumpleFam) {
                    cumplen.push(item);
                } else {
                    noCumplen.push(item);
                }
            });

            return { cumplen, noCumplen };
        } catch (error) {
            log.error("Error en filtrarDatos", error.message);
            return { cumplen: [], noCumplen: [] };
        }
    }

    function calcularCoberturaPersonalizado(itemResult, infoCoberturaEncontrada, requestBody, auxFecha = false) {

        try {

            if (itemResult.tiempo == "0" && itemResult.unidad == "4") {
                const diferenciaDias = calcularDiferenciaDias(
                    infoCoberturaEncontrada.coberturaInicial,
                    infoCoberturaEncontrada.coberturaFinal
                );

                return {
                    fechaInicoCalculada: infoCoberturaEncontrada.coberturaInicial,
                    fechaFinCalculada: convertirFechaIso(infoCoberturaEncontrada.coberturaFinal),
                    plazoCalculado: (diferenciaDias || "")
                }
            }


            const fechaAccion = (fecha) => `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;

            const esReverso = requestBody.esReverso == "Si";

            let fechaBase = esReverso ? infoCoberturaEncontrada.coberturaInicial : infoCoberturaEncontrada.coberturaFinal;

            if (requestBody.fechaOS && requestBody.esReverso == "No") {
                fechaBase = coberturaController.CompararFechas(fechaBase, requestBody.fechaOS) ? fechaAccion(new Date()) : fechaBase;
            }

            if (auxFecha) {
                fechaBase = coberturaController.CompararFechas(auxFecha, infoCoberturaEncontrada.coberturaFinal) ? infoCoberturaEncontrada.coberturaFinal : auxFecha;
            }

            const coberturaCalculada = coberturaController.CalcularCobertura(
                parseInt(itemResult.tiempo),
                parseInt(itemResult.unidad),
                fechaBase,
                esReverso
            );

            const diferenciaDias = calcularDiferenciaDias(coberturaCalculada.coberturaInicial, coberturaCalculada.coberturaFinal);

            return {
                fechaInicoCalculada: coberturaCalculada?.coberturaInicial || "",
                fechaFinCalculada: coberturaCalculada?.coberturaFinal || "",
                plazoCalculado: diferenciaDias || ""
            };
        }
        catch (error) {
            log.error("Error en calcularCoberturaPersonalizado", { error: error.message, itemResult });
            return {
                fechaInicoCalculada: "",
                fechaFinCalculada: "",
                plazoCalculado: ""
            }
        }

    }

    function calcularDiferenciaDias(inicioCobertura, finCobertura) {
        const MS_POR_DIA = 24 * 60 * 60 * 1000;
        return (new Date(finCobertura) - new Date(inicioCobertura)) / MS_POR_DIA;
    }

    function formatoFechaCalculo(fecha) {
        try {
            return fecha.split("T")[0].split("-").reverse().join("/");
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return fecha
        }
    }

    function createLogRecordFechaCobertura(INFODATALOG) {
        try {
            if (!INFODATALOG?.ID_OS) {
                throw new Error("Error por falta de data");
            }

            if (!INFODATALOG?.ID_FAC) {
                for (const estado of ["T", "F", "X"]) {
                    const existe = verificarExistenciaRegistros({
                        ID_OS: INFODATALOG.ID_OS,
                        PROCESADO: estado,
                        FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO
                    });
                    if (existe) return 0;
                }
            } else {
               
                const existente = obtenerRegistrosLogCobertura({
                    ID_BIEN: INFODATALOG.ID_BIEN,
                    ID_OS: INFODATALOG.ID_OS,
                    ID_FAMILIA_PRODUCTO: INFODATALOG.ID_FAMILIA_PRODUCTO,
                    PARAMETRIZACION_APD: INFODATALOG.PARAMETRIZACION_APD,
                    CORTESIA: INFODATALOG.CORTESIA || "F"
                });
                if (existente) {
                    record.submitFields({
                        type: "customrecord_log_movimiento_fecha_cobert",
                        id: existente.ID_INTERNO,
                        values: { custrecord_id_fac_mov_fcc: INFODATALOG.ID_FAC },
                        options: { enableSourcing: false, ignoreMandatoryFields: true }
                    });
                    log.debug("createLogRecordFechaCobertura - factura enlazada a registro existente", existente.ID_INTERNO);
                    return parseInt(existente.ID_INTERNO);
                }
            }

            const logRecord = record.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                isDynamic: true,
            });

            logRecord.setValue("custrecord_id_bien_mov_fcc", INFODATALOG.ID_BIEN);
            logRecord.setValue("custrecord_id_os_mov_fcc", INFODATALOG.ID_OS);
            logRecord.setValue("custrecord_fecha_os_mov_fcc", INFODATALOG.FECHA_OS ? new Date(...(INFODATALOG.FECHA_OS.split("/").reverse().map((v, i) => i === 1 ? v - 1 : +v))) : "");
            logRecord.setValue("custrecord_id_fac_mov_fcc", INFODATALOG.ID_FAC);
            logRecord.setValue("custrecord_fecha_fac_mov_fcc", INFODATALOG.FECHA_FAC);
            logRecord.setValue("custrecord_id_familia_producto_mov_fcc", INFODATALOG.ID_FAMILIA_PRODUCTO);
            logRecord.setValue("custrecord_familia_producto_mov_fcc", INFODATALOG.FAMILIA_PRODUCTO);
            logRecord.setValue("custrecord_unidad_mov_fcc", INFODATALOG.UNIDAD);
            logRecord.setValue("custrecord_id_tipo_plazo_mov_fcc", INFODATALOG.ID_TIPO_PLAZO);
            logRecord.setValue("custrecord_tipo_plazo_mov_fcc", INFODATALOG.TIPO_PLAZO);

            logRecord.setValue("custrecord_fecha_inicio_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_INICIO_ACTUAL)));
            logRecord.setValue("custrecord_fecha_fin_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_FIN_ACTUAL)));
            logRecord.setValue("custrecord_id_estado_cobe_act_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_ACTUAL);
            logRecord.setValue("custrecord_estado_cobertura_act_mov_fcc", INFODATALOG.ESTADO_COBERTURA_ACTUAL);
            logRecord.setValue("custrecordid_estado_disp_act_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_ACTUAL);
            logRecord.setValue("custrecord_estado_dispositivo_act_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_ACTUAL);

            logRecord.setValue("custrecord_fecha_inicio_cal_mov_fcc", new Date(INFODATALOG.FECHA_INICIO_CALCULADO));
            logRecord.setValue("custrecord_fecha_fin_cal_mov_fcc", new Date(INFODATALOG.FECHA_FIN_CALCULADO));
            logRecord.setValue("custrecord_id_estado_cobe_cal_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_CALCULADO);
            logRecord.setValue("custrecord_estado_cobertura_cal_mov_fcc", INFODATALOG.ESTADO_COBERTURA_CALCULADO);
            logRecord.setValue("custrecordid_estado_disp_cal_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_CALCULADO);
            logRecord.setValue("custrecord_estado_dispositivo_cal_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_CALCULADO);

            logRecord.setValue("custrecordcustrecord_fecha_inicio_mod_mo", INFODATALOG.FECHA_INICIO_MODIFICADO ? new Date(INFODATALOG.FECHA_INICIO_MODIFICADO) : null);
            logRecord.setValue("custrecordcustrecord_fecha_fin_mod_mov_f", INFODATALOG.FECHA_FIN_MODIFICADO ? new Date(INFODATALOG.FECHA_FIN_MODIFICADO) : null);
            logRecord.setValue("custrecord_id_estado_cobe_mod_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_MODIFICADO);
            logRecord.setValue("custrecord_estado_cobertura_mod_mov_fcc", INFODATALOG.ESTADO_COBERTURA_MODIFICADO);
            logRecord.setValue("custrecord_estado_disp_mod_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_MODIFICADO);
            logRecord.setValue("custrecord_estado_dispositivo_mod_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_MODIFICADO);

            logRecord.setValue("custrecord_cortesia_mov_fcc", INFODATALOG.CORTESIA);
            logRecord.setValue("custrecord_procesado_mov_fcc", INFODATALOG.PROCESADO);
            logRecord.setValue("custrecord_fecha_procesado_mov_fcc", INFODATALOG.FECHA_PROCESADO);
            logRecord.setValue("custrecordid_origen_mov_fcc", INFODATALOG.ID_ORIGEN);
            logRecord.setValue("custrecord_origen_mov_fcc", INFODATALOG.ORIGEN);
            logRecord.setValue("custrecord_parametrizacion_apd_mov_fcc", INFODATALOG.PARAMETRIZACION_APD);

            return logRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true,
            });
        } catch (error) {
            log.error("Error al createLogRecordFechaCobertura", { error: error.message, stack: error.stack });
            return 0;
        }
    }

    function convertirFechaIso(fecha) {
        try {
            const [dia, mes, año] = fecha.split("/").map(Number);
            return new Date(Date.UTC(año, mes - 1, dia, 22, 0, 0)).toISOString();
        } catch (error) {
            log.error("Error al convertirFechaIso", { error: error.message, fecha });
            return fecha;
        }
    }

    function validarInfParaGenerarCobertura(DataCobertura, DataOrdenService) {
        if (!DataCobertura || typeof DataCobertura !== "object") return false;

        const control = DataOrdenService ? DataOrdenService.adp : "";

        switch (control) {
            case "004":
            case "009":
                return DataCobertura.estado_cobertura != 4;

            case "015":
            case "008":
                return true;

            default:
                log.debug("validarInfParaGenerarCobertura: ADP no contemplado", { adp: control });
                return false;
        }
    }

    function esCortesiaOS(IdOs) {
        if (!IdOs || IdOs == 0) return true;
        if (cache.cortesia.has(IdOs)) return cache.cortesia.get(IdOs);

        try {
            const serviceOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ["internalid", "is", IdOs],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    "AND",
                    ["item.type", "noneof", "TaxItem"],
                ],
                columns: [search.createColumn({ name: "total" })],
            });

            const searchResult = serviceOrderSearch.run().getRange({ start: 0, end: 1 });
            const resultado = searchResult.length > 0 && searchResult[0].getValue({ name: "total" }) == ".00";
            cache.cortesia.set(IdOs, resultado);
            return resultado;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return false;
        }
    }

  
     // OJO customform=142, terms=48, status != 'C'.
    function esOSDebitoAutomatico(osId) {
        if (!osId) return false;

        try {
            const result = query.runSuiteQL({
                query: `
                    SELECT A.id
                    FROM transaction A
                    WHERE A.recordtype = 'salesorder'
                      AND A.customform = 142
                      AND A.status != 'C'
                      AND A.terms = 48
                      AND A.id = ?`,
                params: [osId]
            });
            return result.asMappedResults().length > 0;
        } catch (error) {
            log.error("Error en esOSDebitoAutomatico", { osId, error: error.message, stack: error.stack });
            return false;
        }
    }

    function determinarEstadoCobertura(control, DataOrdenService, dataGestion) {
        try {
            const Nconvenio = validarNumero(obtenerUnDato("transaction", "custbody_ht_os_convenio", dataGestion.ID_OS) || 0);
            const ItemAdp = determinarAdp(DataOrdenService);

            switch (ItemAdp) {
                case "004":
                case "009":
                    // ! Renovacion
                    return evaluarFecha(dataGestion.FECHA_FIN_CALCULADO);

                case "015":
                case "008":
                    // ! Instalacion (008 = sin OT)
                    if ((dataGestion && dataGestion.FECHA_INICIO_CALCULADO == dataGestion.FECHA_FIN_CALCULADO) || Nconvenio > 0) {
                        return { Dispositivo: "", Cobertura: 3 };
                    }
                    return { Dispositivo: 1, Cobertura: 1 };

                default:
                    return { Dispositivo: "", Cobertura: "" };
            }
        } catch (error) {
            log.error("error", error);
            return { Dispositivo: "", Cobertura: "" };
        }
    }

    function evaluarFecha(fechaEntrada) {
        try {
            const fecha = new Date(fechaEntrada);

            const fechaActual = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" });
            const fechaActualEcuador = new Date(fechaActual);

            if (fecha < fechaActualEcuador) {
                return { Dispositivo: "", Cobertura: 3 };
            } else {
                return { Dispositivo: 1, Cobertura: 1 };
            }
        } catch (error) {
            log.error("Error en evaluarFecha", { error: error.message, stack: error.stack });
            return { Dispositivo: "", Cobertura: "" };
        }
    }

    function obtenerUnDato(type, columna, id) {
        if (!type || !columna || !id) return "";

        const cacheKey = `${type}|${columna}|${id}`;
        if (cache.unDato.has(cacheKey)) return cache.unDato.get(cacheKey);

        try {
            const resultado = search
                .create({
                    type: type,
                    filters: [["internalid", "is", id]],
                    columns: [columna],
                })
                .run()
                .getRange({ start: 0, end: 1 });

            const valor = resultado.length > 0 ? resultado[0].getValue(columna) : "";
            cache.unDato.set(cacheKey, valor);
            return valor;
        } catch (error) {
            log.error("Error al obtenerUnDato", { error: error.message, type, columna, id });
            return "";
        }
    }

    function obtenerSignificadoPlazo(tiempo) {
        return PLAZO_LABELS[tiempo] || "";
    }

    function consultaFamiliaNetsuite(familia) {
        if (cache.familia.has(familia)) return cache.familia.get(familia);

        try {
            const FamiliaSearch = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [
                    ["custrecord_ht_pp_codigo", "is", familia],
                    'AND',
                    ['custrecord33', 'anyof', '2']
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo" }),
                ],
            });

            const results = [];
            const searchResult = FamiliaSearch.runPaged();
            searchResult.pageRanges.forEach((pageRange) => {
                const myPage = searchResult.fetch({ index: pageRange.index });
                myPage.data.forEach((result) => {
                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        codigo: result.getValue({ name: "custrecord_ht_pp_codigo" }),
                    });
                });
            });

            cache.familia.set(familia, results[0]);
            return results[0];
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return [];
        }
    }

    function verificarExistenciaRegistros(filtros) {
        try {
            const filtrosDinamicos = [];
            const agregarFiltro = (campo, operador, valor) => {
                if (valor === undefined || valor === null || valor === "") return;
                if (filtrosDinamicos.length > 0) filtrosDinamicos.push("AND");
                filtrosDinamicos.push([campo, operador, valor]);
            };

            agregarFiltro("custrecord_id_os_mov_fcc", "equalto", filtros.ID_OS);
            agregarFiltro("custrecord_procesado_mov_fcc", "startswith", filtros.PROCESADO);
            agregarFiltro("custrecord_familia_producto_mov_fcc", "startswith", filtros.FAMILIA_PRODUCTO);
            agregarFiltro("custrecord_id_bien_mov_fcc", "anyof", filtros.ID_BIEN);
            agregarFiltro("custrecord_id_familia_producto_mov_fcc", "anyof", filtros.ID_FAMILIA_PRODUCTO);
            agregarFiltro("custrecord_id_tipo_plazo_mov_fcc", "equalto", filtros.ID_TIPO_PLAZO);
            agregarFiltro("custrecord_unidad_mov_fcc", "startswith", filtros.UNIDAD);
            agregarFiltro("custrecord_tipo_plazo_mov_fcc", "startswith", filtros.TIPO_PLAZO);
            agregarFiltro("custrecord_cortesia_mov_fcc", "startswith", filtros.CORTESIA);
            agregarFiltro("custrecordid_origen_mov_fcc", "startswith", filtros.ID_ORIGEN);
            agregarFiltro("custrecord_origen_mov_fcc", "startswith", filtros.ORIGEN);
            agregarFiltro("custrecord_parametrizacion_apd_mov_fcc", "startswith", filtros.PARAMETRIZACION_APD);
            agregarFiltro("custrecord_fecha_os_mov_fcc", "within", filtros.FECHA_OS);
            agregarFiltro("custrecord_fecha_inicio_actual_mov_fcc", "within", filtros.FECHA_INICIO_ACTUAL);
            agregarFiltro("custrecord_fecha_fin_actual_mov_fcc", "within", filtros.FECHA_FIN_ACTUAL);
            agregarFiltro("custrecord_fecha_inicio_cal_mov_fcc", "within", convertirFechaFormato(filtros.FECHA_INICIO_CALCULADO));
            agregarFiltro("custrecord_fecha_fin_cal_mov_fcc", "within", convertirFechaFormato(filtros.FECHA_FIN_CALCULADO));
            agregarFiltro("custrecord_id_estado_cobe_cal_mov_fcc", "equalto", filtros.ID_ESTADO_COBERTURA_CALCULADO);

            if (filtrosDinamicos.length === 0) return false;

            filtrosDinamicos.push("AND", ["isinactive", "is", false]);

            const searchResultCount = search.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                filters: filtrosDinamicos,
                columns: []
            }).runPaged().count;

            return searchResultCount > 0;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return false;
        }
    }

    function convertirFechaFormato(fechaISO) {
        if (!fechaISO) return "";
        const fecha = new Date(fechaISO);
        if (isNaN(fecha)) return "Fecha no válida";

        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const año = fecha.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    function obtenerRegistrosLogCobertura(filtros) {
        log.debug("obtenerRegistrosLogCobertura - filtros recibidos", { filtros });
     
        const customrecordLogMovimientoSearchObj = search.create({
            type: "customrecord_log_movimiento_fecha_cobert",
            filters: [
                ["custrecord_id_bien_mov_fcc", "anyof", filtros.ID_BIEN],
                "AND",
                ["custrecord_id_os_mov_fcc", "equalto", filtros.ID_OS],
                "AND",
                ["custrecord_id_familia_producto_mov_fcc", "anyof", filtros.ID_FAMILIA_PRODUCTO],
                "AND",
                ["custrecord_parametrizacion_apd_mov_fcc", "startswith", filtros.PARAMETRIZACION_APD],
                "AND",
                ["custrecord_cortesia_mov_fcc", "startswith", filtros.CORTESIA || "F"],
                "AND",
                ["custrecord_procesado_mov_fcc", "startswith", "F"],
                "AND",
                ["isinactive", "is", "F"]
            ],
            columns: [
                search.createColumn({ name: "internalid", label: "ID_INTERNO", sort: search.Sort.DESC }),
                search.createColumn({ name: "custrecord_id_bien_mov_fcc", label: "ID_BIEN" }),
                search.createColumn({ name: "custrecord_id_os_mov_fcc", label: "ID_OS" }),
                search.createColumn({ name: "custrecord_fecha_os_mov_fcc", label: "FECHA_OS" }),
                search.createColumn({ name: "custrecord_id_familia_producto_mov_fcc", label: "ID_FAMILIA_PRODUCTO" }),
                search.createColumn({ name: "custrecord_familia_producto_mov_fcc", label: "FAMILIA_PRODUCTO" }),
                search.createColumn({ name: "custrecord_id_tipo_plazo_mov_fcc", label: "ID_TIPO_PLAZO" }),
                search.createColumn({ name: "custrecord_unidad_mov_fcc", label: "UNIDAD" }),
                search.createColumn({ name: "custrecord_tipo_plazo_mov_fcc", label: "TIPO_PLAZO" }),
                search.createColumn({ name: "custrecord_fecha_inicio_actual_mov_fcc", label: "FECHA_INICIO_ACTUAL" }),
                search.createColumn({ name: "custrecord_fecha_fin_actual_mov_fcc", label: "FECHA_FIN_ACTUAL" }),
                search.createColumn({ name: "custrecord_id_estado_cobe_act_mov_fcc", label: "ID_ESTADO_COBERTURA_ACTUAL" }),
                search.createColumn({ name: "custrecordid_estado_disp_act_mov_fcc", label: "ID_ESTADO_DISPOSITIVO_ACTUAL" }),
                search.createColumn({ name: "custrecord_fecha_inicio_cal_mov_fcc", label: "FECHA_INICIO_CALCULADO" }),
                search.createColumn({ name: "custrecord_fecha_fin_cal_mov_fcc", label: "FECHA_FIN_CALCULADO" }),
                search.createColumn({ name: "custrecord_id_estado_cobe_cal_mov_fcc", label: "ID_ESTADO_COBERTURA_CALCULADO" }),
                search.createColumn({ name: "custrecordid_estado_disp_cal_mov_fcc", label: "ID_ESTADO_DISPOSITIVO_CALCULADO" }),
                search.createColumn({ name: "custrecord_cortesia_mov_fcc", label: "CORTESIA" }),
                search.createColumn({ name: "custrecord_procesado_mov_fcc", label: "PROCESADO" }),
                search.createColumn({ name: "custrecord_parametrizacion_apd_mov_fcc", label: "PARAMETRIZACION_APD" })
            ]
        });

        const resultados = [];
        const pagedData = customrecordLogMovimientoSearchObj.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach((pageRange) => {
            const pagina = pagedData.fetch({ index: pageRange.index });
            pagina.data.forEach((resultado) => {
                const registro = {};
                customrecordLogMovimientoSearchObj.columns.forEach((columna) => {
                    registro[columna.label] = resultado.getValue(columna) || "";
                });
                resultados.push(registro);
            });
        });

        return resultados.length > 0 ? resultados[0] : false;
    }

    function validarCamposObjetos(objMenor, objMayor) {
        if (typeof objMayor.UNIDAD === "number") {
            objMayor.UNIDAD = objMayor.UNIDAD.toString();
        }

        for (const clave in objMenor) {
            if (clave === "ID_INTERNO") continue;
            if (!objMenor.hasOwnProperty(clave)) continue;
            if (!objMayor.hasOwnProperty(clave) || objMenor[clave] !== objMayor[clave]) {
                return false;
            }
        }
        return true;
    }

    function transformarSiEsNumero(valor) {
        return typeof valor === "number" ? valor.toString() : valor;
    }

    function determinarConceptoCobertura(DataOrdenService) {
        return CONCEPTO_COBERTURA_MAP[DataOrdenService.PARAMETRIZACION_APD] ?? 17;
    }

    function calcularPlazoFechas(fechaIniStr, fechaFinStr, idTipoPlazo) {
        try {
            if (!fechaIniStr || !fechaFinStr) return 0;
            const parseFecha = s => {
                const [d, m, y] = s.split('/');
                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            };
            const ini = parseFecha(fechaIniStr);
            const fin = parseFecha(fechaFinStr);
            const tipo = String(idTipoPlazo);
            if (tipo === "1") return fin.getFullYear() - ini.getFullYear();
            if (tipo === "2") return (fin.getFullYear() - ini.getFullYear()) * 12 + (fin.getMonth() - ini.getMonth());
            if (tipo === "3") return Math.round((fin - ini) / 86400000);
            return 0;
        } catch (e) {
            log.error("Error calcularPlazoFechas", e);
            return 0;
        }
    }

    function obtenerFechaFinActualDesdeLog(idOS, idBien, idFamilia) {
        try {
            const cacheKey = `fechaFinLog|${idOS}|${idBien}|${idFamilia}`;
            if (cache.unDato.has(cacheKey)) return cache.unDato.get(cacheKey);

            const results = search.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                filters: [
                    ["custrecord_id_os_mov_fcc", "equalto", idOS],
                    "AND",
                    ["custrecord_id_bien_mov_fcc", "anyof", idBien],
                    "AND",
                    ["custrecord_familia_producto_mov_fcc", "startswith", idFamilia],
                    "AND",
                    ["custrecord_procesado_mov_fcc", "startswith", "X"],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_fecha_fin_actual_mov_fcc", label: "FECHA_FIN_ACTUAL",
                        sort: search.Sort.DESC
                    }),
                    search.createColumn({ name: "custrecord_fecha_fin_cal_mov_fcc", label: "FECHA_FIN_CALCULADO" })
                ]
            }).run().getRange({ start: 0, end: 1 });

            const resultado = results.length > 0
                ? {
                    fechaFinActual: results[0].getValue({ name: "custrecord_fecha_fin_actual_mov_fcc" }) || null,
                    fechaFinCalculada: results[0].getValue({ name: "custrecord_fecha_fin_cal_mov_fcc" }) || null
                }
                : null;

            cache.unDato.set(cacheKey, resultado);
            return resultado;
        } catch (e) {
            log.error("Error obtenerFechaFinActualDesdeLog", e);
            return null;
        }
    }

    function armarData(registro) {
        try {
            const plazoReal = calcularPlazoFechas(
                registro.FECHA_INICIO_CALCULADO,
                registro.FECHA_FIN_CALCULADO,
                registro.ID_TIPO_PLAZO
            );
            return {
                idbien: registro.ID_BIEN,
                familia: registro.FAMILIA_PRODUCTO,
                accion: "Update",
                fechaInicio: registro.FECHA_INICIO_CALCULADO,
                tipocobertura: transformarSiEsNumero(plazoReal || registro.UNIDAD),
                unidadcobertu: registro.TIPO_PLAZO,
                fechafin: registro.FECHA_FIN_CALCULADO,
                idOrdenServicio: registro.ID_OS,
                concepto: transformarSiEsNumero(determinarConceptoCobertura(registro)),
                codVehiculo: ""
            };
        } catch (error) {
            log.error("Error al armarData", { error: error.message, registro });
            return {
                idbien: "", familia: "", accion: "", fechaInicio: "", tipocobertura: "",
                unidadcobertu: "", fechafin: "", idOrdenServicio: "", concepto: "", codVehiculo: ""
            };
        }
    }

    function actualizarProcesadoLogCobertura(id_factura, fecha_factura, internalId, Mensaje, Estado) {
        try {
            const hoy = obtenerFechaEcuador();
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: {
                    custrecord_id_fac_mov_fcc: id_factura,
                    custrecord_fecha_fac_mov_fcc: fecha_factura || hoy,
                    custrecord_procesado_mov_fcc: Estado,
                    custrecord_fecha_procesado_mov_fcc: hoy,
                    custrecord_info_mov_fcc: Mensaje || ""
                },
            });
            log.debug("Log MCC actualizado", { internalId, Estado, Mensaje });
        } catch (error) {
            log.error("Error actualizando log MCC", { internalId, error });
        }
    }

    function actualizarLogCoberturaFecha(Fecha_A, Fecha_B, internalId) {
        try {
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: {
                    custrecord_fecha_inicio_cal_mov_fcc: Fecha_A,
                    custrecord_fecha_fin_cal_mov_fcc: Fecha_B
                },
            });
        } catch (error) {
            log.error("Error actualizando fecha log MCC", { internalId, error });
        }
    }

    function procesarCoberturaDirecto(dataParaCoberturaJson, idTransaccion, dataRegistro, ajuste) {
        try {
            log.debug("procesarCoberturaDirecto, inicio", {
                idTransaccion,
                familia: dataParaCoberturaJson.familia,
                idbien: dataParaCoberturaJson.idbien,
                idOrdenServicio: dataParaCoberturaJson.idOrdenServicio,
                accion: dataParaCoberturaJson.accion,
                concepto: dataParaCoberturaJson.concepto,
                fechaInicio: dataParaCoberturaJson.fechaInicio,
                fechafin: dataParaCoberturaJson.fechafin,
                idLogMcc: dataRegistro?.ID_INTERNO
            });
            let infDetalleCobe = infoDetalleCobertura(dataParaCoberturaJson.idOrdenServicio, dataParaCoberturaJson.familia);
            let fecha_Transaccion = obtenerFechaEcuador();

            // Conceptos en customrecord_ht_ct_cobertura_transaction:
            //   8   Renovacion        (ADP 004/009)
            //   16  Instalacion s/OT  (ADP 008/015 sin cobertura)
            //   17           
            //   20  Reverso

            let countCreaciones = 0;
            let countReversos = 0;
            for (let i = 0; i < infDetalleCobe.length; i++) {
                const concepto = infDetalleCobe[i].concepto;
                if (concepto == 8 || concepto == 16 || concepto == 17) countCreaciones++;
                if (concepto == 20) countReversos++;
            }
            log.debug("conteoConceptosCobertura", {
                idOS: dataParaCoberturaJson.idOrdenServicio,
                familia: dataParaCoberturaJson.familia,
                countCreaciones,
                countReversos,
                yaTieneActiva: countCreaciones > countReversos
            });
            if (countCreaciones <= countReversos) {
                infDetalleCobe = [];
            }

            if (infDetalleCobe.length > 0) {


                let familiaConsulta = consultaFamiliaNetsuite(dataRegistro?.FAMILIA_PRODUCTO);
                let InfCoberturaEncontrada = consultaCoberturaMovFcc(dataRegistro?.ID_BIEN, familiaConsulta.id);

                if (dataRegistro.FECHA_FIN_CALCULADO == (InfCoberturaEncontrada?.coberturafinal || "")) {

                    if (ajuste == "T") {
                        actualizarProcesadoLogCobertura(0, "", dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio, Calculo de Fecha Correcto", "T");
                    } else {
                        fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                        actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio, Calculo de Fecha Correcto", "T");
                    }
                } else {
                    if (ajuste == "T") {
                        actualizarProcesadoLogCobertura(0, "", dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio", "T");
                    } else {
                        fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                        actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio", "T");
                    }
                }

                try {

                    let InfCoberturaEncontradaPasoFinal = consultaCoberturaMovFcc(dataParaCoberturaJson.idbien, familiaConsulta.id);
                    if (dataRegistro.ID_INTERNO && InfCoberturaEncontradaPasoFinal?.name && InfCoberturaEncontradaPasoFinal?.id) {
                        actualizarinfoCoberturaAfectada(dataRegistro.ID_INTERNO, InfCoberturaEncontradaPasoFinal.name, InfCoberturaEncontradaPasoFinal.id);
                    }
                } catch (error) {
                    log.error("Error al ActualizarinfoCoberturaAfectada", error);
                }
                return true

            } else {

                if (dataParaCoberturaJson?.accion && dataParaCoberturaJson?.accion !== "") {
                    try {
                        log.debug("API request, cobertura", dataParaCoberturaJson);

                        function validarFechas(dataParaCoberturaJson) {
                            const [diaInicio, mesInicio, anioInicio] = dataParaCoberturaJson.fechaInicio.split('/');
                            const [diaFin, mesFin, anioFin] = dataParaCoberturaJson.fechafin.split('/');

                            const fechaInicio = new Date(`${anioInicio}-${mesInicio}-${diaInicio}`);
                            const fechaFin = new Date(`${anioFin}-${mesFin}-${diaFin}`);

                            if (fechaInicio >= fechaFin) {
                                return true;
                            }
                        }

                        try {
                            if (validarFechas(dataParaCoberturaJson)) {
                                log.error("Cobertura: fecha inicio >= fecha fin", { dataParaCoberturaJson });
                                return false;
                            }
                        } catch (error) {
                            log.error("Error en validarFechas", { error: error.message, dataParaCoberturaJson });
                        }


                        // API post
                        let infCobertura = coberturaController.makeApiRequest(
                            dataParaCoberturaJson,
                            "customdeploy_hu_ec_rs_in_coberturas",
                            "customscript_hu_ec_rs_in_coberturas",
                            "POST",
                            false
                        );

                        log.debug("API response ← cobertura", infCobertura);

                        if ((dataRegistro.FECHA_INICIO_CALCULADO != dataParaCoberturaJson.fechaInicio) || (dataRegistro.FECHA_FIN_CALCULADO != dataParaCoberturaJson.fechafin)) {
                            actualizarLogCoberturaFecha(dataParaCoberturaJson.fechaInicio, dataParaCoberturaJson.fechafin, dataRegistro.ID_INTERNO);
                        }

                        // respuesta 
                        if (
                            infCobertura &&
                            (infCobertura?.results[0]?.Cobertura_ID !== 0 && infCobertura?.results[0]?.Cobertura_ID !== "0")
                        ) {

                            // Obtener la fecha de la factura y actualizar el log
                            fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                            let estadoFacturainterna = obtenerUnDato("transaction", "custbody_ec_estado_factura_interna", idTransaccion);

                            // ! agregar caso por factura agrupada desde os
                            let fechaFactura = obtenerLogRegistro(idTransaccion);

                            if (idTransaccion && fechaFactura && estadoFacturainterna == "2") {
                                actualizarProcesadoLogCobertura(idTransaccion, fechaFactura, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Factura interna", "X");
                            } else {
                                actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Normal", "X");
                            }

                            try {
                                let familiaConsulta = consultaFamiliaNetsuite(dataParaCoberturaJson.familia);
                                let InfCoberturaEncontradaPasoFinal = consultaCoberturaMovFcc(dataParaCoberturaJson.idbien, familiaConsulta.id);

                                if (dataRegistro.ID_INTERNO && InfCoberturaEncontradaPasoFinal?.name && InfCoberturaEncontradaPasoFinal?.id) {
                                    actualizarinfoCoberturaAfectada(dataRegistro.ID_INTERNO, InfCoberturaEncontradaPasoFinal.name, InfCoberturaEncontradaPasoFinal.id);
                                }
                            } catch (error) {
                                log.error("Error al ActualizarinfoCoberturaAfectada", error);
                            }


                        } else {
                            actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Conflicto en la Cobertura", "F");
                            return true;
                        }
                    } catch (error) {
                        log.error("Error en petición API cobertura", { error: error?.message || error, idOS: dataParaCoberturaJson.idOrdenServicio });
                    }
                }
            }
        } catch (error) {
            log.error("Error en procesarCoberturaDirecto", error);
        }
    }

    function infoDetalleCobertura(IdOs, familia) {

        if (!IdOs && !familia) {
            return [];
        }

        let familiaConsulta = consultaFamiliaNetsuite(familia);

        let results = [];
        try {
            let serviceOrderSearch = search.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                filters: [
                    ["custrecord_ht_ct_orden_servicio", "is", IdOs],
                    "AND",
                    ["custrecord_ht_ct_transacciones.custrecord_ht_co_familia_prod", "anyof", familiaConsulta.id]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "created" }),
                    search.createColumn({ name: "custrecord_ht_ct_transacciones" }),
                    search.createColumn({ name: "custrecord_ht_ct_orden_servicio" }),
                    search.createColumn({ name: "custrecord_ht_ct_orden_trabajo" }),
                    search.createColumn({ name: "custrecord_ht_ct_concepto" }),
                    search.createColumn({ name: "custrecord_ht_ct_fecha_inicial" }),
                    search.createColumn({ name: "custrecord_ht_ct_fecha_final" }),
                ],
            });

            let searchResult = serviceOrderSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    results.push({
                        id_detalleCobertura: result.getValue({ name: "internalid" }),
                        created: result.getValue({ name: "created" }),
                        idCobertura: result.getValue({ name: "custrecord_ht_ct_transacciones" }),
                        idordenServicio: result.getValue({ name: "custrecord_ht_ct_orden_servicio" }),
                        idordenTrabajo: result.getValue({ name: "custrecord_ht_ct_orden_trabajo" }),
                        concepto: result.getValue({ name: "custrecord_ht_ct_concepto" }),
                        fechaInicial: result.getValue({ name: "custrecord_ht_ct_fecha_inicial" }),
                        fechaFinal: result.getValue({ name: "custrecord_ht_ct_fecha_final" }),
                    });
                });
            });

            return results;
        } catch (error) {
            log.error("Error en infoDetalleCobertura", error);
            return [];
        }
    }

    function obtenerFechaEcuador() {
        const fechaAjustada = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' })
        );
        return format.format({ value: fechaAjustada, type: format.Type.DATE });
    }

    /**
     * Suma o resta una cantidad de años, meses o días a una fecha en formato DD/MM/YYYY usando SuiteQL.
     * NEW
     * @param {string} fechaStr  Fecha en formato DD/MM/YYYY
     * @param {number} cantidad  Entero (positivo = sumar, negativo = restar)
     * @param {string} unidad    "AÑOS" | "ANIOS" | "MESES" | "DIAS"
     * @returns {string}         Fecha resultante en DD/MM/YYYY (o la entrada si falla)
     */
    function sumarFechaSuiteQL(fechaStr, cantidad, unidad) {
        try {
            if (!fechaStr || cantidad === undefined || cantidad === null) return fechaStr;
            if (cantidad === 0) return fechaStr;

            const unidadNorm = String(unidad || "").toUpperCase();
            const cacheKey = `${fechaStr}|${cantidad}|${unidadNorm}`;
            if (cache.fechaSql.has(cacheKey)) return cache.fechaSql.get(cacheKey);

            const partes = fechaStr.split('/');
            if (partes.length !== 3) {
                log.error("sumarFechaSuiteQL formato invalido", fechaStr);
                return fechaStr;
            }
            const [dia, mes, anio] = partes;
            const fechaSQL = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

            let sql;
            if (unidadNorm === "AÑOS" || unidadNorm === "ANIOS" || unidadNorm === "AÑO" || unidadNorm === "ANIO") {
                // 1 año = 12 meses. ADD_MONTHS de Oracle preserva el día y maneja bisiestos.
                sql = `SELECT TO_CHAR(ADD_MONTHS(TO_DATE('${fechaSQL}', 'YYYY-MM-DD'), ${cantidad * 12}), 'DD/MM/YYYY') AS resultado FROM DUAL`;
            } else if (unidadNorm === "MESES" || unidadNorm === "MES") {
                sql = `SELECT TO_CHAR(ADD_MONTHS(TO_DATE('${fechaSQL}', 'YYYY-MM-DD'), ${cantidad}), 'DD/MM/YYYY') AS resultado FROM DUAL`;
            } else if (unidadNorm === "DIAS" || unidadNorm === "DIA") {
                sql = `SELECT TO_CHAR(TO_DATE('${fechaSQL}', 'YYYY-MM-DD') + (${cantidad}), 'DD/MM/YYYY') AS resultado FROM DUAL`;
            } else {
                log.error("sumarFechaSuiteQL unidad no soportada", unidad);
                return fechaStr;
            }

            const resultSet = query.runSuiteQL({ query: sql });
            const filas = resultSet.asMappedResults();
            const resultado = (filas.length > 0 && filas[0].resultado) ? filas[0].resultado : fechaStr;

            cache.fechaSql.set(cacheKey, resultado);
            return resultado;
        } catch (error) {
            log.error("Error en sumarFechaSuiteQL", { error: error.message, stack: error.stack });
            return fechaStr;
        }
    }

    function existeAdp(inputData, codigo) {
        if (!inputData || !Array.isArray(inputData.data)) {
            throw new Error('El formato de datos no es válido o no incluye un array "data".');
        }
        return inputData.data.some(item => item.adp === codigo);
    }

    function validarNumero(cadena) {
        const numero = parseInt(cadena, 10);
        return !isNaN(numero) && numero >= 0 ? numero : 0;
    }

    function consultaOtTrabajadas(idOS, familia) {
        try {
            const itemOT = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: [
                    ["custrecord_ht_ot_orden_servicio", "is", idOS],
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_ot_item", label: "Item" }),
                    search.createColumn({ name: "custrecord_ht_ot_estado", label: "Estado" }),
                    search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "Fecha de Trabajo Asignación" }),
                ],
            });

            const resultados = [];
            const pagedData = itemOT.runPaged({ pageSize: 10 });

            pagedData.pageRanges.forEach((pageRange) => {
                const pagina = pagedData.fetch({ index: pageRange.index });
                pagina.data.forEach((resultado) => {
                    const item = resultado.getValue({ name: "custrecord_ht_ot_item" });
                    const infoparametros = obtenerParametrizacionItem(item, ['FAM']);

                    const registro = {
                        Item: infoparametros[0]?.Valor || "",
                        Estado: resultado.getValue({ name: "custrecord_ht_ot_estado" }),
                        FechaTrabajoAsignacion: resultado.getValue({ name: "custrecord_ht_ot_fechatrabajoasignacion" }),
                    };

                    if (registro.Item == familia) {
                        resultados.push(registro);
                    }

                });
            });

            return resultados;
        } catch (error) {
            log.error("Error en ConsultaOTTrabajadas", error);
            return [];
        }
    }

    function tieneOrdenesTrabajadas(data) {
        try {
            return data.every(item => item.Estado === "2");
        } catch (error) {
            log.error("Error en verificarEstado:", error);
            return false;
        }
    }

    function determinarAdp(datos) {
        const tieneInstalacion = datos.some(item => item.adp === ADP.INSTALACION);
        return tieneInstalacion ? ADP.INSTALACION : (datos[0]?.adp || "");
    }

    function actualizarinfoCoberturaAfectada(internalId, NombreCobertura, IdCobertura) {
        try {
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: {
                    custrecord_nombre_cobertura_mov_fcc: NombreCobertura,
                    custrecord_id_cobertura_mov_fcc: IdCobertura,
                },
            });
        } catch (error) {
            log.error("Error en actualizarinfoCoberturaAfectada", { internalId, error });
        }
    }

    function crearCoberturaSinOt(Infdata) {
        try {
            let newCobertura = record.create({
                type: "customrecord_ht_co_cobertura",
                isDynamic: true,
            });

            const fields = {
                bien: "custrecord_ht_co_bien",
                producto: "custrecord_ht_co_producto",
                estado: "custrecord_ht_co_estado_cobertura",
                fechaInicio: "custrecord_ht_co_coberturainicial",
                plazo: "custrecord_ht_co_plazo",
                fechaFinal: "custrecord_ht_co_coberturafinal",
                familia: "custrecord_ht_co_familia_prod",
            };

            for (const [key, fieldId] of Object.entries(fields)) {
                if (Infdata[key]) {
                    newCobertura.setValue({
                        fieldId: fieldId,
                        value: Infdata[key],
                    });
                }
            }

            newCobertura.setValue({
                fieldId: "custrecord_ht_co_estado",
                value: 1,
            });

            newCobertura.setValue({
                fieldId: "custrecord_ht_co_subsidiaria",
                value: 2,
            });

            let newCoberturaId = newCobertura.save();

            log.debug("crearCoberturaSinOt creada", { id: newCoberturaId, bien: Infdata.bien, familia: Infdata.familia });

            try { cache.cobertura.delete(`${Infdata.bien}|${Infdata.familia}`); } catch (e) { }

            return newCoberturaId;
        } catch (error) {
            log.error("Error-CrearCoberturaSinOt", error);
        }
    }

    function crearDetalleCoberturaSinOt(infData) {
        try {
            let newDetalleCobertura = record.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                isDynamic: true,
            });

            const fields = {
                IdCobertura: "custrecord_ht_ct_transacciones",
                IdOrdenServicio: "custrecord_ht_ct_orden_servicio",
                concepto: "custrecord_ht_ct_concepto",
                fechaInicio: "custrecord_ht_ct_fecha_inicial",
                fechaFinal: "custrecord_ht_ct_fecha_final",
            };

            for (const [key, fieldId] of Object.entries(fields)) {
                if (infData[key]) {
                    newDetalleCobertura.setValue({
                        fieldId: fieldId,
                        value: infData[key],
                    });
                }
            }


            let newDetalleCoberturaId = newDetalleCobertura.save();

            log.debug("crearDetalleCoberturaSinOt creado", { id: newDetalleCoberturaId, IdOrdenServicio: infData.IdOrdenServicio });

            return newDetalleCoberturaId;
        } catch (error) {
            log.error("Error-CrearHTDetalleCobertura", error);
        }
    }

    function casoCoberturaSinOt(dataRegistro, GenerarCoberturaSinOt, idItem) {
        try {
            log.debug("casoCoberturaSinOt, entrada", {
                idLogMcc: dataRegistro?.ID_INTERNO,
                familia: dataRegistro?.FAMILIA_PRODUCTO,
                PARAMETRIZACION_APD: dataRegistro?.PARAMETRIZACION_APD,
                GenerarCoberturaSinOt, idItem,
                fechaIni: dataRegistro?.FECHA_INICIO_CALCULADO,
                fechaFin: dataRegistro?.FECHA_FIN_CALCULADO
            });
            if (dataRegistro.PARAMETRIZACION_APD == ADP.INSTALACION_SIN_OT && GenerarCoberturaSinOt && idItem != 0) {

                let fechaIni = new Date(convertirFechaIso(dataRegistro.FECHA_INICIO_CALCULADO));
                let fechaFin = new Date(convertirFechaIso(dataRegistro.FECHA_FIN_CALCULADO));

                const diferenciaDias = calcularDiferenciaDias(fechaIni, fechaFin);

                const dataParaCobertura = {
                    bien: dataRegistro.ID_BIEN,
                    producto: idItem,
                    estado: dataRegistro.ID_ESTADO_COBERTURA_CALCULADO,
                    fechaInicio: fechaIni,
                    plazo: diferenciaDias,
                    fechaFinal: fechaFin,
                    familia: dataRegistro.ID_FAMILIA_PRODUCTO,
                };

                const idcobeGenerada = crearCoberturaSinOt(dataParaCobertura);

                const dataParaCobertura2 = {
                    IdCobertura: idcobeGenerada,
                    IdOrdenServicio: dataRegistro.ID_OS,
                    concepto: 16,
                    fechaInicio: fechaIni,
                    fechaFinal: fechaFin,
                };

                crearDetalleCoberturaSinOt(dataParaCobertura2);
            }

        } catch (error) {
            return false;
        }
    }

    function obtenerLogRegistro(id) {
        try {
            const cacheKey = `logReg|${id}`;
            if (cache.unDato.has(cacheKey)) return cache.unDato.get(cacheKey);

            const serviceOrderSearch = search.create({
                type: "systemnote",
                filters: [
                    ['recordid', 'equalto', id],
                    'AND',
                    ['field', 'anyof', 'CUSTBODY_EC_ESTADO_FACTURA_INTERNA'],
                    'AND',
                    ['newvalue', 'startswith', 'Facturado'],
                ],
                columns: [
                    search.createColumn({ name: "date", label: "fecha", sort: search.Sort.DESC }),
                ],
            });

            const results = serviceOrderSearch.run().getRange({ start: 0, end: 1 });
            const resultado = results.length > 0 ? results[0].getValue({ name: "date" }).split(" ")[0] : false;

            log.debug("obtenerLogRegistro, resultado", { id, resultado });
            cache.unDato.set(cacheKey, resultado);
            return resultado;
        } catch (error) {
            log.error("Error en ObtenerLogRegistro", { id, error });
            return false;
        }
    }

    function procesarYAgruparFamilias(data) {
        try {
            return data.reduce((acumulador, item) => {
                const ParametroFam = item.infoparametros.find(param => param.Param === "FAM");
                const ParametroAdp = item.infoparametros.find(param => param.Param === "ADP");

                const itemTransformado = {
                    idbien: item.bien,
                    familia: ParametroFam ? ParametroFam.Valor : "",
                    adp: ParametroAdp ? ParametroAdp.Valor : "",
                    idOrdenServicio: item.internalidOs,
                    iditem: item.iditem,
                    tipoPlazo: item.TipoPlazo,
                    plazo: item.Plazo,
                    fechaOs: item.fechaOs,
                    esCortesiaOS: esCortesiaOS(item.internalidOs),
                    terms: item.terms
                };

                if (!itemTransformado.familia) {
                    return acumulador;
                }

                const familiaExistente = acumulador.find(grupo => grupo.familia === itemTransformado.familia);

                if (familiaExistente) {
                    familiaExistente.data.push(itemTransformado);
                } else {
                    acumulador.push({
                        familia: itemTransformado.familia,
                        bien: itemTransformado.idbien,
                        cortesia: itemTransformado.esCortesiaOS,
                        data: [itemTransformado],
                    });
                }

                return acumulador;
            }, []);
        } catch (error) {
            throw new Error(`Error al procesar y agrupar familias: ${error.message}`);
        }
    }

    function procesarCoberturaFamilias({ grupos, idTransaccion, idOrdenServicio, recordType, modoFacturaAgrupada, cortesia = false }) {
        log.debug("A", {
            idTransaccion, idOrdenServicio, recordType, modoFacturaAgrupada, cortesia,
            cantidadGrupos: grupos.length,
            familias: grupos.map(g => g.familia)
        });
        for (let i = 0; i < grupos.length; i++) {
            const grupo = grupos[i];
            const EsInstalacionRenovacion = existeAdp(grupo, ADP.INSTALACION);
            const EsAdp008 = existeAdp(grupo, ADP.INSTALACION_SIN_OT);
            let GenerarCoberturaSinOt = false;
            let acumuladorPlazo = 0;
            let itemCasoAdp008 = 0;
            let fechaControlInicial;
            let fechaControl;
            let InfCoberturaEncontrada;
            let dataCalculada = {};

            log.debug("b", {
                familia: grupo.familia, bien: grupo.bien,
                EsInstalacionRenovacion, EsAdp008,
                items: grupo.data.map(d => ({ adp: d.adp, iditem: d.iditem, plazo: d.plazo, tipoPlazo: d.tipoPlazo }))
            });

            for (let y = 0; y < grupo.data.length; y++) {
                const item = grupo.data[y];
                const familiaConsulta = consultaFamiliaNetsuite(item.familia);

                InfCoberturaEncontrada = consultaCoberturaMovFcc(item.idbien, familiaConsulta.id);

                log.debug("c", {
                    familia: grupo.familia, idbien: item.idbien, idFamilia: familiaConsulta?.id,
                    adpItem: item.adp,
                    encontrada: !!InfCoberturaEncontrada,
                    idCobertura: InfCoberturaEncontrada?.id,
                    estado_cobertura: InfCoberturaEncontrada?.estado_cobertura,
                    coberturainicial: InfCoberturaEncontrada?.coberturainicial,
                    coberturafinal: InfCoberturaEncontrada?.coberturafinal
                });

                aplicarOverrideAdpInstalacion(item, InfCoberturaEncontrada);

                // ! Caso Instalacion y Renovacion
                if ((EsInstalacionRenovacion || EsAdp008) && !InfCoberturaEncontrada) {
                    if (grupo.familia == "CS"
                        && InfCoberturaEncontrada
                        && InfCoberturaEncontrada.coberturainicial
                        && InfCoberturaEncontrada.coberturafinal) {
                        InfCoberturaEncontrada = {
                            coberturainicial: InfCoberturaEncontrada.coberturainicial,
                            coberturafinal: InfCoberturaEncontrada.coberturafinal,
                            estado_cobertura: InfCoberturaEncontrada.estado_cobertura,
                            estado_dispositivo: InfCoberturaEncontrada.estado_dispositivo
                        };
                    } else {
                        if (EsAdp008 && !InfCoberturaEncontrada) {
                            GenerarCoberturaSinOt = true;
                            itemCasoAdp008 = item.iditem;
                        }
                        InfCoberturaEncontrada = {
                            coberturainicial: obtenerFechaEcuador(),
                            coberturafinal: obtenerFechaEcuador(),
                            estado_cobertura: "1",
                            estado_dispositivo: "1"
                        };
                    }
                }

                const validacion = validarInfParaGenerarCobertura(InfCoberturaEncontrada, item);
                if (!InfCoberturaEncontrada || !validacion) {
                    log.debug("d", {
                        familia: grupo.familia, idbien: item.idbien, adpItem: item.adp,
                        tieneCobertura: !!InfCoberturaEncontrada,
                        estado_cobertura: InfCoberturaEncontrada?.estado_cobertura,
                        validacion
                    });
                    continue;
                }

                // Renovación (004/009): 
                // Instalación (015/008):
                if (y == 0) fechaControlInicial = InfCoberturaEncontrada.coberturainicial;

                const coberturainicial = InfCoberturaEncontrada.coberturainicial || "";
                const coberturafinal = fechaControl || (InfCoberturaEncontrada.coberturafinal || "01/01/1900");
                const estadoCobertura = InfCoberturaEncontrada.estado_cobertura || 0;
                const estadoDispositivo = InfCoberturaEncontrada.estado_dispositivo || 0;

                const parametrosTiempo = { tiempo: item.plazo, unidad: item.tipoPlazo };
                const parametrosCobertura = { coberturaInicial: coberturainicial, coberturaFinal: coberturafinal };
                const opcionesAdicionales = {
                    esReverso: "No",
                    fechaOS: obtenerUnDato("transaction", "trandate", idOrdenServicio),
                };

                let fechaFacturaAgrupada;
                if (modoFacturaAgrupada) {
                    fechaFacturaAgrupada = obtenerLogRegistro(idOrdenServicio);
                    if (!fechaFacturaAgrupada) {
                        log.debug("e", {
                            idOrdenServicio, familia: grupo.familia, idbien: item.idbien
                        });
                        return false;
                    }
                    if (validarFechasControlFacAgru(coberturafinal, fechaFacturaAgrupada?.date)) {
                        fechaFacturaAgrupada.date = coberturafinal;
                    }
                }

                const resultadoCalculo = calcularCoberturaPersonalizado(
                    parametrosTiempo,
                    parametrosCobertura,
                    opcionesAdicionales,
                    fechaFacturaAgrupada
                );

                if (resultadoCalculo) fechaControl = formatoFechaCalculo(resultadoCalculo.fechaFinCalculada);
                acumuladorPlazo += validarNumero(item.plazo);

                dataCalculada = {
                    ID_BIEN: item.idbien,
                    ID_OS: item.idOrdenServicio,
                    FECHA_OS: item.fechaOs,
                    ID_FAC: "",
                    FECHA_FAC: "",
                    FAMILIA_PRODUCTO: item.familia,
                    ID_FAMILIA_PRODUCTO: item.familia ? consultaFamiliaNetsuite(item.familia).id : null,
                    UNIDAD: acumuladorPlazo,
                    ID_TIPO_PLAZO: item.tipoPlazo,
                    TIPO_PLAZO: item.tipoPlazo ? obtenerSignificadoPlazo(item.tipoPlazo) : "",
                    FECHA_INICIO_ACTUAL: InfCoberturaEncontrada.coberturainicial,
                    FECHA_FIN_ACTUAL: InfCoberturaEncontrada.coberturafinal,
                    ID_ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                    ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                    ID_ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                    ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                    FECHA_INICIO_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaInicoCalculada),
                    FECHA_FIN_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaFinCalculada),
                    ID_ESTADO_COBERTURA_CALCULADO: "",
                    ESTADO_COBERTURA_CALCULADO: "",
                    ID_ESTADO_DISPOSITIVO_CALCULADO: "",
                    ESTADO_DISPOSITIVO_CALCULADO: "",
                    FECHA_INICIO_MODIFICADO: "",
                    FECHA_FIN_MODIFICADO: "",
                    ID_ESTADO_COBERTURA_MODIFICADO: "",
                    ESTADO_COBERTURA_MODIFICADO: "",
                    ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
                    ESTADO_DISPOSITIVO_MODIFICADO: "",
                    CORTESIA: item.esCortesiaOS ? "T" : "F",
                    PROCESADO: "F",
                    FECHA_PROCESADO: "",
                    ID_ORIGEN: recordType == "salesorder" ? 1 : 2,
                    ORIGEN: recordType,
                    PARAMETRIZACION_APD: EsInstalacionRenovacion ? ADP.INSTALACION : (item.adp || "")
                };
            }

            const aplicarEstados = () => {
                if (dataCalculada.ID_ESTADO_COBERTURA_CALCULADO == "" && dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO == "") {
                    const estados = determinarEstadoCobertura(InfCoberturaEncontrada, grupo.data, dataCalculada);
                    dataCalculada.ID_ESTADO_COBERTURA_CALCULADO = transformarSiEsNumero(estados.Cobertura);
                    dataCalculada.ESTADO_COBERTURA_CALCULADO = estados.Cobertura;
                    dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO = transformarSiEsNumero(estados.Dispositivo);
                    dataCalculada.ESTADO_DISPOSITIVO_CALCULADO = estados.Dispositivo;
                }
            };
            const aplicarFechaInicial = () => {
                if (fechaControlInicial) dataCalculada.FECHA_INICIO_CALCULADO = fechaControlInicial;
            };
            if (modoFacturaAgrupada) {
                aplicarFechaInicial();
                aplicarEstados();
            } else {
                aplicarEstados();
                aplicarFechaInicial();
            }

            if (!dataCalculada?.ID_OS) continue;

            log.debug("dataCalculada por familia", dataCalculada);

            if (cortesia) {
                dataCalculada.CORTESIA = "F";
            }

            const dataRegistro = obtenerRegistrosLogCobertura(dataCalculada);
            if (!dataRegistro) {
                log.debug("Log MCC en 'F' no encontrado, ya procesado, skip", { idOS: dataCalculada.ID_OS, familia: dataCalculada.FAMILIA_PRODUCTO });
                continue;
            }

            if (EsInstalacionRenovacion) {
                const InfOrderTrabajo = consultaOtTrabajadas(dataRegistro.ID_OS, dataRegistro.FAMILIA_PRODUCTO);
                if ((InfOrderTrabajo.length < 1 || !tieneOrdenesTrabajadas(InfOrderTrabajo))
                    && dataRegistro.PARAMETRIZACION_APD == ADP.INSTALACION
                    && dataRegistro.FAMILIA_PRODUCTO != "CS") {
                    log.debug("ADP=015 sin OT trabajada, skip", { idOS: dataRegistro.ID_OS, familia: dataRegistro.FAMILIA_PRODUCTO, ots: InfOrderTrabajo });
                    continue;
                }
            }

            if (EsAdp008 && GenerarCoberturaSinOt) {
                const fecha_Transaccion = obtenerFechaEcuador();
                log.debug("casoCoberturaSinOt", {
                    familia: grupo.familia, idTransaccion, idItem: itemCasoAdp008
                });
                actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Cobertura Sin OT", "X");
                casoCoberturaSinOt(dataRegistro, GenerarCoberturaSinOt, itemCasoAdp008);
            }

            const validarCamposObjetosInf = validarCamposObjetos(dataRegistro, dataCalculada);
            const dataParaCoberturaJson = validarCamposObjetosInf
                ? armarData(dataRegistro)
                : armarData(dataCalculada);

            log.debug("procesarCoberturaDirecto", {
                familia: grupo.familia, idTransaccion,
                accion: dataParaCoberturaJson.accion,
                concepto: dataParaCoberturaJson.concepto,
                fechaInicio: dataParaCoberturaJson.fechaInicio,
                fechafin: dataParaCoberturaJson.fechafin,
                usoDataRegistro: validarCamposObjetosInf
            });

            procesarCoberturaDirecto(dataParaCoberturaJson, idTransaccion, dataRegistro, "F");
        }
        log.debug("sss", { idTransaccion, idOrdenServicio });
        return true;
    }

    function validarFechasControlFacAgru(a, b) {
        try {
            if (a === "" || b === "") {
                return false;
            }

            const [diaInicio, mesInicio, anioInicio] = a.split('/');
            const [diaFin, mesFin, anioFin] = b.split('/');

            const fechaInicio = new Date(`${anioInicio}-${mesInicio}-${diaInicio}`);
            const fechaFin = new Date(`${anioFin}-${mesFin}-${diaFin}`);

            if (fechaInicio >= fechaFin) {
                return true;
            }
            return false;

        } catch (error) {
            return false;
        }
    }

    // 06/02/2025
    function crearRegistroLogMCC(bien, idOS, subsidiary, recordType, ID_FAC) {
        if (bien && idOS && (subsidiary == "2" || subsidiary == 2)) {
            let ObtenerLosItemsDeLaOS = obtenerLosItemsDeUnaOS(idOS, bien);
            let infItemParaProceso = filtraDatosQueCumplaParametros(ObtenerLosItemsDeLaOS);

            if (ObtenerLosItemsDeLaOS && infItemParaProceso && infItemParaProceso.cumplen) {
                let DataParabuscarCobertura = procesarYAgruparFamilias(infItemParaProceso.cumplen);

                for (let i = 0; i < DataParabuscarCobertura.length; i++) {
                    let InfCoberturaEncontrada;
                    let DataInternaPorFamilia = DataParabuscarCobertura[i];

                    let fechaControlInicial;
                    let fechaControl;
                    let dataRegistro = {};
                    let EsInstalacionRenovacion = existeAdp(DataInternaPorFamilia, ADP.INSTALACION);
                    let familiaConsulta;
                    let EsAdp008 = existeAdp(DataInternaPorFamilia, ADP.INSTALACION_SIN_OT);
                    let GenerarCoberturaSinOt = false;
                    let itemCasoAdp008 = 0;
                    let acumuladorPlazo = 0;

                    for (let y = 0; y < DataInternaPorFamilia.data.length; y++) {
                        familiaConsulta = consultaFamiliaNetsuite(DataInternaPorFamilia.data[y].familia);
                        InfCoberturaEncontrada = consultaCoberturaMovFcc(DataInternaPorFamilia.data[y].idbien, familiaConsulta.id);

                        aplicarOverrideAdpInstalacion(DataInternaPorFamilia.data[y], InfCoberturaEncontrada);

                        if ((EsInstalacionRenovacion || EsAdp008) && !InfCoberturaEncontrada) {
                            if (DataInternaPorFamilia.familia == "CS" && InfCoberturaEncontrada && InfCoberturaEncontrada.coberturainicial && InfCoberturaEncontrada.coberturafinal) {
                                InfCoberturaEncontrada = {
                                    coberturainicial: InfCoberturaEncontrada.coberturainicial,
                                    coberturafinal: InfCoberturaEncontrada.coberturafinal,
                                    estado_cobertura: InfCoberturaEncontrada.estado_cobertura,
                                    estado_dispositivo: InfCoberturaEncontrada.estado_dispositivo
                                };
                            } else {
                                if (EsAdp008 && !InfCoberturaEncontrada) {
                                    GenerarCoberturaSinOt = true;
                                    itemCasoAdp008 = DataInternaPorFamilia.data[y].iditem;
                                }
                                InfCoberturaEncontrada = {
                                    coberturainicial: obtenerFechaEcuador(),
                                    coberturafinal: obtenerFechaEcuador(),
                                    estado_cobertura: "1",
                                    estado_dispositivo: "1"
                                };
                            }
                        }

                        let validacion = validarInfParaGenerarCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data[y]);

                        if (InfCoberturaEncontrada && validacion) {
 
                            if (y == 0) { fechaControlInicial = InfCoberturaEncontrada.coberturainicial; }

                            const coberturainicial = InfCoberturaEncontrada.coberturainicial || "";
                            const coberturafinal = fechaControl ? fechaControl : (InfCoberturaEncontrada.coberturafinal || "01/01/1900");
                            const estadoCobertura = InfCoberturaEncontrada.estado_cobertura || 0;
                            const estadoDispositivo = InfCoberturaEncontrada.estado_dispositivo || 0;

                            const parametrosTiempo = {
                                tiempo: DataInternaPorFamilia.data[y].plazo,
                                unidad: DataInternaPorFamilia.data[y].tipoPlazo,
                            };

                            const parametrosCobertura = {
                                coberturaInicial: coberturainicial,
                                coberturaFinal: coberturafinal,
                            };

                            const opcionesAdicionales = {
                                esReverso: "No",
                                fechaOS: obtenerUnDato("transaction", "trandate", idOS),
                            };

                            const resultadoCalculo = calcularCoberturaPersonalizado(
                                parametrosTiempo,
                                parametrosCobertura,
                                opcionesAdicionales
                            );

                            if (resultadoCalculo) { fechaControl = formatoFechaCalculo(resultadoCalculo.fechaFinCalculada); }

                            acumuladorPlazo = acumuladorPlazo + validarNumero(DataInternaPorFamilia.data[y].plazo);

                            dataRegistro = {
                                ID_BIEN: DataInternaPorFamilia.data[y].idbien,
                                ID_OS: DataInternaPorFamilia.data[y].idOrdenServicio,
                                FECHA_OS: DataInternaPorFamilia.data[y].fechaOs,
                                ID_FAC: "",
                                FECHA_FAC: "",
                                FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia,
                                ID_FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia ? consultaFamiliaNetsuite(DataInternaPorFamilia.data[y].familia).id : null,
                                UNIDAD: acumuladorPlazo,
                                ID_TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo,
                                TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo ? obtenerSignificadoPlazo(DataInternaPorFamilia.data[y].tipoPlazo) : "",
                                FECHA_INICIO_ACTUAL: InfCoberturaEncontrada.coberturainicial,
                                FECHA_FIN_ACTUAL: InfCoberturaEncontrada.coberturafinal,
                                ID_ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                                ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                                ID_ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                                ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                                FECHA_INICIO_CALCULADO: resultadoCalculo.fechaInicoCalculada,
                                FECHA_FIN_CALCULADO: resultadoCalculo.fechaFinCalculada,
                                ID_ESTADO_COBERTURA_CALCULADO: "",
                                ESTADO_COBERTURA_CALCULADO: "",
                                ID_ESTADO_DISPOSITIVO_CALCULADO: "",
                                ESTADO_DISPOSITIVO_CALCULADO: "",
                                FECHA_INICIO_MODIFICADO: "",
                                FECHA_FIN_MODIFICADO: "",
                                ID_ESTADO_COBERTURA_MODIFICADO: "",
                                ESTADO_COBERTURA_MODIFICADO: "",
                                ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
                                ESTADO_DISPOSITIVO_MODIFICADO: "",
                                CORTESIA: DataInternaPorFamilia.data[y].esCortesiaOS ? "T" : "F",
                                PROCESADO: "F",
                                FECHA_PROCESADO: "",
                                ID_ORIGEN: recordType == "salesorder" ? 1 : 2,
                                ORIGEN: recordType,
                                PARAMETRIZACION_APD: (EsInstalacionRenovacion) ? ADP.INSTALACION : DataInternaPorFamilia.data[y].adp ? DataInternaPorFamilia.data[y].adp : ""
                            };

                            if (ID_FAC) {
                                dataRegistro.ID_FAC = ID_FAC;
                            }

                        }
                    }

                    if (fechaControlInicial) {
                        dataRegistro.FECHA_INICIO_CALCULADO = convertirFechaIso(fechaControlInicial);
                    }

                    if (dataRegistro.FECHA_FIN_CALCULADO == "01/01/1900" || dataRegistro.FECHA_FIN_CALCULADO == "1900-01-01T22:00:00.000Z") {
                        dataRegistro.FECHA_FIN_CALCULADO = dataRegistro.FECHA_INICIO_CALCULADO;
                    }

                    if (dataRegistro.ID_ESTADO_COBERTURA_CALCULADO == "" && dataRegistro.ID_ESTADO_DISPOSITIVO_CALCULADO == "") {
                        const EstadosGeneralesCobe = determinarEstadoCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data, dataRegistro);

                        dataRegistro.ID_ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura;
                        dataRegistro.ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura;
                        dataRegistro.ID_ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo;
                        dataRegistro.ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo;
                    }

                    const registroCreado = createLogRecordFechaCobertura(dataRegistro);
                    log.debug("Log MCC creado", {
                        idLog: registroCreado,
                        idOS: dataRegistro.ID_OS,
                        bien: dataRegistro.ID_BIEN,
                        familia: dataRegistro.FAMILIA_PRODUCTO,
                        ADP: dataRegistro.PARAMETRIZACION_APD
                    });
                }
            }
        }
    }

    //23/06/2025
    function procesoReversoPersonalizado(newRecord, IdOS, factura_ventaid) {
        try {
            log.debug("ProcesoReversoPersonalizado: inicio", { IdOS, factura_ventaid, fromRecord: !!newRecord });

            if (!newRecord) {
                if (!IdOS) {
                    log.error("ProcesoReversoPersonalizado", "No se proporcionó registro ni IdOS");
                    return [];
                }

                newRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: IdOS,
                    isDynamic: true
                });

                if (!newRecord) {
                    log.error("ProcesoReversoPersonalizado", `No se pudo cargar la OS ${IdOS}`);
                    return [];
                }

            }

            const idRecord = newRecord.id;
            const bien = newRecord.getValue("custbody_ht_so_bien");

            if (esOSDebitoAutomatico(idRecord)) {
                log.debug("ProcesoReversoPersonalizado return - OS de Débito Automático", { idRecord, factura_ventaid });
                return [];
            }

            const resultados = [];
            const resultPaged = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ["internalid", "is", idRecord],
                    "AND", ["subsidiary", "anyof", "2"],
                    "AND", ["item.internalid", "noneof", "@NONE@"],
                    "AND", ["custbody_ht_so_bien", "anyof", bien],
                    "AND", ["item.type", "noneof", "TaxItem"]
                ],
                columns: [
                    "internalid", "item", "custcol_ht_os_und_tiempo_cobertura", "custcol_ht_os_tiempo_cobertura",
                    "rate", search.createColumn({ name: "displayname", join: "item" }),
                    search.createColumn({ name: "internalid", join: "item" }),
                    search.createColumn({ name: "type", join: "item" }),
                    "custbody_ht_so_bien"
                ]
            }).runPaged();


            resultPaged.pageRanges.forEach(rango => {
                const pagina = resultPaged.fetch({ index: rango.index });
                pagina.data.forEach(result => {
                    const item = result.getValue("item");

                    const cacheKeyParam = `param|${item}|ADP,FAM`;
                    let paramRows;
                    if (cache.parametrizacion.has(cacheKeyParam)) {
                        paramRows = cache.parametrizacion.get(cacheKeyParam);
                    } else {
                        paramRows = search.create({
                            type: "customrecord_ht_pp_main_param_prod",
                            filters: [
                                ["custrecord_ht_pp_parametrizacionid", "is", item],
                                "AND",
                                [
                                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", "ADP"],
                                    "OR",
                                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", "FAM"]
                                ]
                            ],
                            columns: [
                                search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela" }),
                                search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" }),
                                search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA" }),
                                search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR" })
                            ]
                        }).run().getRange({ start: 0, end: 2 });
                        cache.parametrizacion.set(cacheKeyParam, paramRows);
                    }

                    const parametros = ["ADP", "FAM", "TRM"].map(param => {
                        const r = paramRows.find(row => row.getValue(row.columns[2]) === param);
                        if (r) {
                            const c = r.columns;
                            return {
                                Param: param,
                                ParamId: r.getValue(c[0]),
                                Valor: r.getValue(c[3]),
                                ValorText: r.getText(c[1]),
                                ValorId: r.getValue(c[1])
                            };
                        } else {
                            return { Param: param, ParamId: "", Valor: "", ValorText: "", ValorId: "" };
                        }
                    });

                    const adp = parametros.find(p => p.Param === "ADP");
                    const fam = parametros.find(p => p.Param === "FAM");
                    const trm = parametros.find(p => p.Param === "TRM");
                    log.debug("ProcesoReversoPersonalizado: parámetros encontrados", { item, adp, fam, trm });

                    // Incluye renovaciones (004/009).
                    if (ADP_PROCESABLES_RENO.includes(adp?.Valor) && fam?.Valor) {
                        resultados.push({
                            familia: fam.Valor,
                            adp: adp.Valor,
                            bien: result.getValue("custbody_ht_so_bien"),
                            internalidOs: result.getValue("internalid"),
                            iditem: item,
                            tipoPlazo: result.getValue("custcol_ht_os_und_tiempo_cobertura"),
                            plazo: result.getValue("custcol_ht_os_tiempo_cobertura"),
                            parametros
                        });
                    }
                });
            });

            if (resultados.length === 0) {
                log.debug("ProcesoReversoPersonalizado: sin items reversables", { idOS: idRecord });
                return [];
            }

            // Agrupar por familia
            const agrupados = {};
            resultados.forEach(r => {
                if (!agrupados[r.familia]) {
                    agrupados[r.familia] = { familia: r.familia, bien: r.bien, data: [] };
                }
                agrupados[r.familia].data.push(r);
            });

            const salida = [];

            Object.values(agrupados).forEach(grupo => {

                // "1" = años, "2" = meses, "3" = días
                const prioridad = { "1": 1, "2": 2, "3": 3 };
                let menorTipo = "1";
                grupo.data.forEach(i => {
                    if (prioridad[i.tipoPlazo] > prioridad[menorTipo]) {
                        menorTipo = i.tipoPlazo;
                    }
                });

                // Calcular plazo total según el menor tipo de plazo
                let plazoTotal = 0;
                grupo.data.forEach(i => {
                    let p = Number(i.plazo || 0);
                    switch (menorTipo) {
                        case "1":
                            // Si el menor plazo es en AÑOS, convertir todos los valores a años
                            if (i.tipoPlazo === "2") p /= 12;       // meses a años
                            else if (i.tipoPlazo === "3") p /= 360; // días a años
                            break;
                        case "2":
                            // Si el menor plazo es en MESES, convertir todos los valores a meses
                            if (i.tipoPlazo === "1") p *= 12;       // años a meses
                            else if (i.tipoPlazo === "3") p /= 30;  // días a meses
                            break;
                        case "3":
                            // Si el menor plazo es en DÍAS, convertir todos los valores a días
                            if (i.tipoPlazo === "1") p *= 360;      // años a días
                            else if (i.tipoPlazo === "2") p *= 30;  // meses a días
                            break;
                    }
                    plazoTotal += p;
                });

                const base = grupo.data[grupo.data.length - 1];
                const datosPlazo = {
                    idbien: base.bien,
                    familia: base.familia,
                    adp: base.adp,
                    idOrdenServicio: base.internalidOs,
                    iditem: base.iditem,
                    tipoPlazo: menorTipo,
                    plazo: String(Math.round(plazoTotal))
                };

                const bienId = base.bien;
                const familiaId = base.familia;
                let idOSEvaluar = base.internalidOs;
                let infCobertura = consultaCoberturaPorVehiculoYFamilia(bienId, familiaId, idOSEvaluar);

                let fechaReferencia = infCobertura ? infCobertura.coberturafinal : false;
                let fechaInicial = infCobertura ? infCobertura.coberturainicial : false;

                if (!fechaReferencia) return [];

                const unidadResta = menorTipo === "1" ? "AÑOS" : menorTipo === "2" ? "MESES" : "DIAS";
                let fechaFinalStr;
                if (infCobertura?.validacionReno === true) {
                    const logData = obtenerFechaFinActualDesdeLog(idOSEvaluar, bienId, familiaId);
                    log.debug("Reverso: caso caducado, consulta log MCC", { logData, fechaReferencia, idOSEvaluar, bienId, familiaId });
                    
                    if (logData && logData.fechaFinCalculada === fechaReferencia) {
                        fechaFinalStr = logData.fechaFinActual;
                    } else {
                        fechaFinalStr = sumarFechaSuiteQL(fechaReferencia, -Math.round(plazoTotal), unidadResta);
                    }

                } else {
                    fechaFinalStr = sumarFechaSuiteQL(fechaReferencia, -Math.round(plazoTotal), unidadResta);
                }

                salida.push({
                    idbien: datosPlazo.idbien,
                    familia: datosPlazo.familia,
                    accion: "Update",
                    fechaInicio: fechaInicial,
                    tipocobertura: transformarSiEsNumero(calcularPlazoFechas(fechaInicial, fechaFinalStr, menorTipo) || datosPlazo.plazo),
                    unidadcobertu: menorTipo === "1" ? "AÑOS" : menorTipo === "2" ? "MESES" : "DIAS",
                    fechafin: fechaFinalStr,
                    idOrdenServicio: datosPlazo.idOrdenServicio,
                    concepto: "20",
                    codVehiculo: "",
                    condicionalReverso: infCobertura?.validacionReno || false,
                });
            });

            log.debug("Reverso: salida calculada", salida);

            if (salida && salida?.length > 0) {
                for (let i = 0; i < salida.length; i++) {
                    if (salida[i]?.condicionalReverso == true) {
 
                        const nuevaSalida = salida[i];

                        try {
                            log.debug("API request, reverso cobertura", nuevaSalida);

                            const infCoberturaReve = coberturaController.makeApiRequest(
                                nuevaSalida,
                                "customdeploy_hu_ec_rs_in_coberturas",
                                "customscript_hu_ec_rs_in_coberturas",
                                "POST",
                                false
                            );

                            log.debug("API response, reverso cobertura", infCoberturaReve);
                            const idOSMCC = nuevaSalida?.idOrdenServicio;

                            if (idOSMCC && factura_ventaid) {
                                inactivarRegistrosPorOrdenServicio(idOSMCC, factura_ventaid);
                            } else {
                                inactivarRegistrosPorOrdenServicio(idOSMCC, idOSMCC);
                            }
                        } catch (error) {
                            log.error("Error al procesar la reversión de cobertura", error?.stack || error?.message || error);
                        }

                    }
                }
            }



        } catch (error) {
            log.error("Error en ProcesoReverso", error?.stack || error?.message || error);
            return [];
        }
    }

    function consultaCoberturaPorVehiculoYFamilia(IdVehiculo, familiaCodigo, IdOsRelacionado) {
        try {

            if (!IdVehiculo || !familiaCodigo || !IdOsRelacionado) {
                log.error("consultaCoberturaPorVehiculoYFamilia", { motivo: "Faltan parámetros", IdVehiculo, familiaCodigo, IdOsRelacionado });
                return null;
            }

            function puedeReversarPorOrdenServicio(idOrdenServicio, objeto) {
                const detalles = objeto || [];

                const relacionados = detalles.filter(d => d.ordenServicio == idOrdenServicio);

                const cantidadConcepto8 = relacionados.filter(d => String(d.concepto) === "8").length;
                const cantidadConcepto16 = relacionados.filter(d => String(d.concepto) === "16").length; // ADP 008 sin OT
                const cantidadConcepto20 = relacionados.filter(d => String(d.concepto) === "20").length;

                // Si hay exactamente un detalle con concepto 8 (renovación) o 16 (instalación sin OT / ADP 008)
                if (relacionados.length === 1 && (cantidadConcepto8 === 1 || cantidadConcepto16 === 1)) {
                    return true;
                }

                // Si hay más conceptos 8 que 20, falta un par de reverso
                if (cantidadConcepto8 > cantidadConcepto20) {
                    return true;
                }

                // Si hay más conceptos 16 que 20, falta reversar la instalación sin OT (ADP 008)
                if (cantidadConcepto16 > cantidadConcepto20) {
                    return true;
                }

                // En cualquier otro caso, no se puede reversar
                return false;
            }


            //Buscar familia 
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

            if (familiaResult.length === 0) return null;

            let idFamilia = familiaResult[0].getValue({ name: "internalid" });

            // Buscar cobertura 
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

            // Detalles de la cobertura
            let detalleSearch = search.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                filters: [
                    ["custrecord_ht_ct_transacciones", "anyof", IdCobertura],
                    "AND",
                    ["custrecord_ht_ct_orden_servicio", "anyof", IdOsRelacionado],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    "internalid",
                    "name",
                    "created",
                    "custrecord_ht_ct_concepto",
                    "custrecord_ht_ct_fecha_inicial",
                    "custrecord_ht_ct_fecha_final",
                    "custrecord_ht_ct_orden_servicio",
                    "custrecord_ht_ct_transacciones"
                ].map(campo => search.createColumn({ name: campo })),
            });

            let detalles = detalleSearch.run().getRange({ start: 0, end: 10 }) || [];

            let detallesFormateados = detalles.map(det => ({
                id: det.getValue({ name: "internalid" }),
                nombre: det.getValue({ name: "name" }),
                creado: det.getValue({ name: "created" }),
                concepto: det.getValue({ name: "custrecord_ht_ct_concepto" }),
                fechaInicial: det.getValue({ name: "custrecord_ht_ct_fecha_inicial" }),
                fechaFinal: det.getValue({ name: "custrecord_ht_ct_fecha_final" }),
                ordenServicio: det.getValue({ name: "custrecord_ht_ct_orden_servicio" }),
                transacciones: det.getValue({ name: "custrecord_ht_ct_transacciones" })
            }))

            let validacionReno = puedeReversarPorOrdenServicio(IdOsRelacionado, detallesFormateados);

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
                detalles: detallesFormateados,
                validacionReno: validacionReno
            };

        } catch (error) {
            log.error("Error consultaCoberturaPorVehiculoYFamilia", error);
            return null;
        }
    }

    function esOrdenAnulada(newRecord) {
        try {
            const totalOS = newRecord.getValue({ fieldId: 'total' });
            const estadoVoid = newRecord.getValue({ fieldId: 'void' }) || '';


            return totalOS == 0 && estadoVoid == "VoidAnular";
        } catch (error) {
            log.error('Error en esOrdenAnulada()', error);
            return false;
        }
    }

 
    function esFacturaAnulada(newRecord) {
        try {
            const estadoVoid = newRecord.getValue({ fieldId: 'void' });
            const status = newRecord.getValue({ fieldId: 'status' }) || '';
            const statusRef = newRecord.getValue({ fieldId: 'statusRef' }) || '';


            const voidStr = String(estadoVoid || '').toLowerCase();
            const statusStr = String(status).toLowerCase();
            const statusRefStr = String(statusRef).toLowerCase();

            return voidStr.indexOf('void') >= 0 || voidStr.indexOf('anul') >= 0
                || statusStr.indexOf('void') >= 0 || statusStr.indexOf('anul') >= 0
                || statusRefStr === 'voided';
        } catch (error) {
            log.error('Error en esFacturaAnulada()', error);
            return false;
        }
    }


    function osTieneCoberturaActiva(idOS, idBien, idFamilia) {
        try {
            if (!idOS || !idBien) return false;

            const filters = [
                ["custrecord_ht_ct_orden_servicio", "is", idOS],
                "AND",
                ["custrecord_ht_ct_transacciones.custrecord_ht_co_bien", "anyof", idBien],
                "AND",
                ["isinactive", "is", "F"]
            ];
            if (idFamilia) {
                filters.push("AND", ["custrecord_ht_ct_transacciones.custrecord_ht_co_familia_prod", "anyof", idFamilia]);
            }

            const det = search.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                filters: filters,
                columns: [search.createColumn({ name: "custrecord_ht_ct_concepto" })]
            });

            let creaciones = 0;
            let reversos = 0;
            det.run().each((r) => {
                const c = r.getValue({ name: "custrecord_ht_ct_concepto" });
                if (c == 8 || c == 16 || c == 17) creaciones++;
                if (c == 20) reversos++;
                return true;
            });

            log.debug("osTieneCoberturaActiva", { idOS, idBien, idFamilia: idFamilia || null, creaciones, reversos });
            return creaciones > reversos;
        } catch (error) {
            log.error('Error en osTieneCoberturaActiva', error);
            return false;
        }
    }

    function inactivarRegistrosPorOrdenServicio(idOrdenServicio, factura_ventaid) {
        try {
            const searchObj = search.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                filters: [
                    ["custrecord_id_os_mov_fcc", "equalto", idOrdenServicio],
                    "AND",
                    ["custrecord_id_fac_mov_fcc", "equalto", factura_ventaid],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: ["internalid"]
            });

            const resultados = searchObj.run().getRange({ start: 0, end: 1000 });
            if (!resultados || resultados.length === 0) return 0;

            resultados.forEach(result => {
                record.submitFields({
                    type: "customrecord_log_movimiento_fecha_cobert",
                    id: result.getValue({ name: "internalid" }),
                    values: { isinactive: true },
                    options: { enableSourcing: false, ignoreMandatoryFields: true }
                });
            });

            return resultados.length;
        } catch (error) {
            log.error('Error inactivarRegistrosPorOrdenServicio', error);
            return 0;
        }
    }

    function dataSeguimientoAnulacion(internalIdOS) {
        if (!internalIdOS) return;

        const busqueda = search.create({
            type: "transaction",
            filters: [
                ["internalid", "anyof", internalIdOS],
                "AND", ["mainline", "is", "T"]
            ],
            columns: [
                search.createColumn({ name: "entity" }),
                search.createColumn({ name: "custbody_ht_so_bien" }),
                search.createColumn({ name: "tranid" })
            ]
        });

        const resultSet = busqueda.run().getRange({ start: 0, end: 1 });
        let resultado = null;
        if (resultSet && resultSet.length > 0) {
            const r = resultSet[0];
            resultado = {
                entity: r.getValue({ name: "entity" }),
                id_bien: r.getValue({ name: "custbody_ht_so_bien" }),
                id_tranid: r.getValue({ name: "tranid" })
            };
        }

        try {
            if (!resultado.entity || !resultado.id_bien) {
                throw new Error("Los campos 'cliente', 'empleado' y 'vehiculo' son obligatorios.");
            }

            const campos = [
                { fieldId: 'custrecord_ht_sc_cliente', value: resultado.entity },
                { fieldId: 'custrecord_ht_sc_resultadogestion', value: 17 },
                { fieldId: 'custrecord_ht_sc_empleado', value: runtime.getCurrentUser().id },
                { fieldId: 'custrecord_ht_sc_estado', value: 2 },
                { fieldId: 'custrecord_ht_sc_modocontacto', value: 5 },
                { fieldId: 'custrecord_ht_sc_seguimiento', value: "Fin Anulada " + resultado.id_tranid },
                { fieldId: 'custrecord_ht_sc_tipocliente', value: 1 },
                { fieldId: 'custrecord_ht_sc_tiposeguimiento', value: 4 },
                { fieldId: 'custrecord_ht_sc_vehiculo', value: resultado.id_bien },
                { fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 },
            ];

            const registrarSeguimientoCliente = record.create({
                type: 'customrecord_ht_record_seguicliente',
                isDynamic: true
            });

            campos.forEach(({ fieldId, value }) => {
                if (value !== undefined && value !== null) {
                    registrarSeguimientoCliente.setValue({ fieldId, value });
                }
            });

            const idSeguimientoCliente = registrarSeguimientoCliente.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug("Seguimiento de anulación creado", { internalIdOS, idSeguimientoCliente });
        } catch (error) {
            log.error("Error en dataSeguimientoAnulacion", { internalIdOS, error });
        }
    }

    const bloquearCamposPorRol = (context) => {
        try {
            if (context.type !== context.UserEventType.EDIT && context.type !== context.UserEventType.VIEW) return;

            const rec = context.newRecord;
            if (!['salesorder', 'invoice'].includes(rec.type)) return;
            if (rec.getValue({ fieldId: 'subsidiary' }) != 2) return;

            const rolActual = runtime.getCurrentUser().role;
            // log.debug("rolActual", rolActual)
            if (ROLES_PERMITIDOS.includes(rolActual)) return;

            const form = context.form;
            CAMPOS_RESTRINGIDOS.forEach(idCampo => {
                const campo = form.getField({ id: idCampo });
                if (campo) campo.updateDisplayType({ displayType: 'disabled' });
            });
        } catch (error) {
            log.error('Error bloquearCamposPorRol', error);
        }
    };

    const validarEdicionCampos = (context) => {
        try {
            if (context.type === context.UserEventType.CREATE) return;

            const newRec = context.newRecord;
            const oldRec = context.oldRecord;

            if (newRec.getValue({ fieldId: 'subsidiary' }) != 2) return;

            const rolActual = runtime.getCurrentUser().role;

            for (const campo of CAMPOS_RESTRINGIDOS) {
                const valorNuevo = newRec.getValue({ fieldId: campo });
                const valorViejo = oldRec.getValue({ fieldId: campo });

                if (valorNuevo !== valorViejo && !ROLES_PERMITIDOS.includes(rolActual)) {
                    log.error("validarEdicionCampos: edición no permitida", { rolActual, campo });
                    throw `No tienes permiso para modificar el campo: ${campo}`;
                }
            }

        } catch (error) {
            log.error("Error en validarEdicionCampos", error);
            throw error;
        }
    };

    // NUEVO
    // Si el item está parametrizado como instalación (008/015) pero ya existe
    // cobertura para el bien/familia, semánticamente es una renovación: se
    // sobreescribe el ADP a 004 para que el flujo lo trate como tal.
    // Muta `item.adp` y devuelve true si aplicó override.
    function aplicarOverrideAdpInstalacion(item, infCobertura) {
        if (infCobertura && ADP_INSTALACION.includes(item.adp)) {
            log.debug("ADP override ------ renovación", {
                iditem: item.iditem,
                familia: item.familia,
                adpOriginal: item.adp,
                razon: "Cobertura ya existe para el bien/familia"
            });
            item.adp = ADP.RENOVACION;
            return true;
        }
        return false;
    }

    function obtenerDocumentos(createdFromId, subsidiaryId) {

        log.debug("obtenerDocumentos", { createdFromId, subsidiaryId });

        if(!createdFromId || !subsidiaryId) {
            log.error("obtenerDocumentos", "Faltan parámetros: createdFromId o subsidiaryId");
            return { cantidad: 0, documentos: [] };
        }

        const resultado = { cantidad: 0, documentos: [] };
        try {
            const transactionSearchObj = search.create({
                type: "transaction",
                filters:
                    [
                        ["subsidiary", "anyof", subsidiaryId],
                        "AND",
                        ["createdfrom", "anyof", createdFromId],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["status", "anyof", "CustInvc:A", "VendBill:A"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "tranid", label: "Número de documento" })
                    ]
            });

            resultado.cantidad = transactionSearchObj.runPaged().count;

            transactionSearchObj.run().each((result) => {
                resultado.documentos.push(result.getValue({ name: "tranid" }));
                return true;
            });

            log.debug("Cantidad", resultado.cantidad);
            log.debug("Documentos", resultado.documentos);

            log.debug("Cantidad", typeof resultado.cantidad);
            log.debug("Documentos", typeof resultado.documentos);

            return resultado;
        } catch (error) {
            log.error("Error en obtenerDocumentos", error);
            return { cantidad: 0, documentos: [] };
        }

    }

    return {
        beforeLoad,
        beforeSubmit,
        afterSubmit,
    };
});