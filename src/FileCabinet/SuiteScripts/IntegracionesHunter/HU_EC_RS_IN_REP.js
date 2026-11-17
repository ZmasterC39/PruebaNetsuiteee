/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search', 'N/query'], function (log, record, search, query) {

    function _get(context) {
        try {
            let ResultadoConsulta = null;
            let OpcionConsulta = context.tipodocumento;
            let FechaIni = context?.fechaini;
            let FechaFin = context?.fechafin;

            if (OpcionConsulta != "VENTAS") {
                if (typeof context.fechaini != 'undefined') {
                    if (context.fechaini.length != 0) {
                        FechaIni = context.fechaini;
                    }
                }

                if (typeof context.fechafin != 'undefined') {
                    if (context.fechafin.length != 0) {
                        FechaFin = context.fechafin;
                    }
                }
            }

            switch (OpcionConsulta) {
                case "ORDENES":
                    ResultadoConsulta = ConsultaOrdenes(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "FACTURAS":
                    log.debug("FAC", context)
                    ResultadoConsulta = ConsultaFacturas(FechaIni, FechaFin);
                    return ResultadoConsulta;

                case "NCR":
                    ResultadoConsulta = ConsultaNCR(FechaIni, FechaFin);
                    break;

                case "CONSOLIDADO2":
                    ResultadoConsulta = ConsultaConsolidado2(FechaIni, FechaFin);
                    break;

                case "VENTAS":
                    ResultadoConsulta = ConsultaLibro500(context);
                    break;

                case "VENTAS2":
                    ResultadoConsulta = ConsultaLibro5002(context);
                    break;

                default:
                    return 'id:400, tipo de documento no valido';
            }

            return ResultadoConsulta;
        } catch (error) {
            log.error('error', { error: error.message, stack: error.stack });
            return 'id:400, No se encontraron resultados.';
        }
    }

    function ConsultaOrdenes(fecha_ini, fecha_fin) {

        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let serviceOrderSearch = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "3"],
                    "AND", ["memorized", "is", "F"],
                    "AND", ["posting", "any", ""],
                    "AND", ["voided", "is", "F"],
                    // "AND", ["trandate","within","thismonth"], 
                    "AND", ["mainline", "is", "T"],
                    "AND", ["custbody_itr_doc_number", "doesnotstartwith", "OSP"],
                    "AND", ["tranid", "doesnotcontain", "OSP"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),

                    // Información adicional
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacionventa" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacioncartera" }),
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                    search.createColumn({ name: "salesrep" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutivareferencia" }),
                    search.createColumn({ name: "opportunity" }),
                    search.createColumn({ name: "subsidiary" }),
                    search.createColumn({ name: "department" }),
                    search.createColumn({ name: "class" }),
                    search.createColumn({ name: "location" }),
                    search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario" }),
                    search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                    search.createColumn({ name: "custbody_ht_os_vendcanaldistribucion" }),
                    search.createColumn({ name: "custbody_ht_facturar_a" }),
                    search.createColumn({ name: "custbody_ht_os_trabajado" })
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = serviceOrderSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaOrdenes", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let ordersMap = {};


                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidOs = result.getValue({ name: "internalid" });

                    // Si la orden no está en el mapa, inicializar el objeto
                    if (!ordersMap[internalidOs]) {
                        ordersMap[internalidOs] = {
                            // Información principal
                            internalidOs: internalidOs,
                            id_bien: result.getValue({ name: "custbody_ht_so_bien" }),
                            bien: result.getText({ name: "custbody_ht_so_bien" }),
                            tranid: result.getValue({ name: "tranid" }),
                            trandate: result.getValue({ name: "trandate" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            memo: (result.getValue({ name: "memo" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_os_aprobacionventa: result.getValue({ name: "custbody_ht_os_aprobacionventa" }),
                            custbody_ht_os_aprobacionventa: result.getText({ name: "custbody_ht_os_aprobacionventa" }),
                            id_custbody_ht_os_aprobacioncartera: result.getValue({ name: "custbody_ht_os_aprobacioncartera" }),
                            custbody_ht_os_aprobacioncartera: result.getText({ name: "custbody_ht_os_aprobacioncartera" }),

                            // Valores Orden de servicio (Sales Order)
                            subtotal: (parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2),
                            taxtotal: result.getValue({ name: "taxtotal" }),
                            total: result.getValue({ name: "total" }),

                            // Información de ventas
                            id_custbody_ht_os_ejecutiva_backoffice: result.getValue({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                            custbody_ht_os_ejecutiva_backoffice: result.getText({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                            id_salesrep: result.getValue({ name: "salesrep" }),
                            salesrep: result.getText({ name: "salesrep" }),
                            id_custbody_ht_os_ejecutivareferencia: result.getValue({ name: "custbody_ht_os_ejecutivareferencia" }),
                            custbody_ht_os_ejecutivareferencia: result.getText({ name: "custbody_ht_os_ejecutivareferencia" }),
                            opportunity: result.getValue({ name: "opportunity" }),

                            // Clasificacion 
                            id_subsidiary: result.getValue({ name: "subsidiary" }),
                            subsidiary: result.getText({ name: "subsidiary" }),
                            id_department: result.getValue({ name: "department" }),
                            department: result.getText({ name: "department" }),
                            id_class: result.getValue({ name: "class" }),
                            class: result.getText({ name: "class" }),
                            id_location: result.getValue({ name: "location" }),
                            location: result.getText({ name: "location" }),

                            // Canal de distribucion
                            id_custbody_ht_os_companiaseguros: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                            custbody_ht_os_companiaseguros: result.getText({ name: "custbody_ht_os_companiaseguros" }),
                            id_custbody_ht_os_concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                            custbody_ht_os_concesionario: result.getText({ name: "custbody_ht_os_concesionario" }),
                            id_custbody_ht_os_bancofinanciera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                            custbody_ht_os_bancofinanciera: result.getText({ name: "custbody_ht_os_bancofinanciera" }),
                            id_custbody_ht_os_vendcanaldistribucion: result.getValue({ name: "custbody_ht_os_vendcanaldistribucion" }),
                            custbody_ht_os_vendcanaldistribucion: result.getText({ name: "custbody_ht_os_vendcanaldistribucion" }),

                            // Información Adicional
                            id_custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                            custbody_ht_facturar_a: (result.getText({ name: "custbody_ht_facturar_a" }) || '').replace(/,/g, ' '),
                            custbody_ht_os_trabajado: (result.getValue({ name: "custbody_ht_os_trabajado" }) || '').replace(/,/g, ' '),

                        };
                    }
                });

                // Convertir el mapa de órdenes en un array
                results = results.concat(Object.values(ordersMap));
            });

            return results;
        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaFacturas(fecha_ini, fecha_fin) {
        try {

            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de facturas
            let invoiceSearch = search.create({
                type: "transaction",
                filters: [
                    // vendbill, CustInvc
                    // "AND", ["internalid", "anyof", 3928366]
                    // "AND",  ["trandate","within","thismonth"]
                    ["type", "anyof", "CustInvc"],
                    "AND", ["trandate", "within", fecha_ini, fecha_fin],
                    "AND", ["subsidiary", "anyof", "3"],
                    "AND", ["mainline", "is", "F"],            // 15-01-2026 Se comenta para traer todas las líneas de la factura
                    // "AND", ["memorized", "is", "F"],
                    // "AND", ["posting", "any", ""],
                    // "AND", ["voided", "is", "F"],
                ],
                columns: [
                    // Información principal
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "custbody_ht_facturar_a" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "duedate" }),
                    search.createColumn({ name: "custbody_ht_ec_fech_ven_fin" }),
                    search.createColumn({ name: "startdate" }),
                    search.createColumn({ name: "enddate" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "custbody_ht_os_convenio" }),
                    search.createColumn({ name: "custbody_ec_estado_de_autorizaci" }),
                    search.createColumn({ name: "location" }),
                    search.createColumn({ name: "exchangerate" }),


                    // Resumen de la factura
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),

                    // Información de ventas
                    search.createColumn({ name: "createdfrom" }),
                    search.createColumn({ name: "opportunity" }),
                    search.createColumn({ name: "salesrep" }),

                    // Clasificación
                    search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    search.createColumn({ name: "custbody_ts_ec_serie_cxc" }),
                    search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    search.createColumn({ name: "custbody_ts_ec_metodo_pago" }),
                    search.createColumn({ name: "custbody_base_niva" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    search.createColumn({ name: "custbody_ec_monto_iva" }),
                    search.createColumn({ name: "custcol_4601_witaxamount" }),
                    search.createColumn({ name: "custbody_ec_mon_comp" }),
                    // search.createColumn({ name: "custbody_ec_monto_iva" }),
                    // search.createColumn({ name: "custcol_4601_witaxamount" }),
                    // search.createColumn({ name: "custbody_ec_mon_comp" }),
                    search.createColumn({ name: "custbody_ec_tip_emi" }),
                    search.createColumn({ name: "custbody_ec_ncomprobantes" }),
                    search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),

                    // Canal de Distribución
                    search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario" }),
                    search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                    search.createColumn({ name: "custbodyec_nota_cliente" }),

                    // Información de facturación
                    search.createColumn({ name: "terms" }),
                    // search.createColumn({ name: "billaddress" }),

                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            log.debug("count ConsultaFacturas", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalidInvoice = result.getValue({ name: "internalid" });

                    let val1 = result.getValue({ name: "exchangerate" }) || false;
                    let val2 = result.getValue({ name: "custcol_4601_witaxamount" }) || false;

                    // log.debug("Valores", { val1, val2 });
                    // log.debug("Tipos", { tv1: typeof val1, tv2: typeof val2 });

                    let resultado = "0.00";

                    if (val1 && val2) {
                        // Convertir a números
                        let num1 = parseFloat(val1);
                        let num2 = parseFloat(val2);

                        // Multiplicar
                        let mul = num1 * num2;

                        // Limitar a 4 dígitos máximo (redondeando)
                        // Por ejemplo: 12345 => 1234, 12.3456 => 12.34
                        // Aquí lo redondeamos a 4 cifras significativas
                        resultado = Number(mul.toPrecision(4)).toFixed(2);

                    }
                    log.debug("Resultado", resultado);

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalidInvoice]) {
                        invoicesMap[internalidInvoice] = {
                            // Información principal
                            internalidInvoice: internalidInvoice,
                            tranid: result.getValue({ name: "tranid" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_so_bien: result.getValue({ name: "custbody_ht_so_bien" }),
                            custbody_ht_so_bien: result.getText({ name: "custbody_ht_so_bien" }),
                            id_custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                            custbody_ht_facturar_a: (result.getText({ name: "custbody_ht_facturar_a" }) || '').replace(/,/g, ' '),
                            trandate: result.getValue({ name: "trandate" }),
                            id_postingperiod: result.getValue({ name: "postingperiod" }),
                            postingperiod: result.getText({ name: "postingperiod" }),
                            duedate: result.getValue({ name: "duedate" }),
                            custbody_ht_ec_fech_ven_fin: result.getValue({ name: "custbody_ht_ec_fech_ven_fin" }),
                            startdate: result.getValue({ name: "startdate" }),
                            enddate: result.getValue({ name: "enddate" }),
                            memo: (result.getValue({ name: "memo" }) || '').replace(/,/g, ' '),
                            id_custbody_ht_os_convenio: result.getValue({ name: "custbody_ht_os_convenio" }),
                            custbody_ht_os_convenio: result.getText({ name: "custbody_ht_os_convenio" }),
                            custbody_ec_estado_de_autorizaci: result.getValue({ name: "custbody_ec_estado_de_autorizaci" }),
                            location: result.getText({ name: "location" }),
                            exchangerate: result.getValue({ name: "exchangerate" }),

                            // Resumen de la factura
                            subtotal: (((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)) || "0").replace(/-/g, ' '),
                            taxtotal: (result.getValue({ name: "taxtotal" }) || "0").replace(/-/g, ' '),
                            total: (result.getValue({ name: "total" }) || "0").replace(/-/g, ' '),

                            // Información de ventas
                            id_createdfrom: result.getValue({ name: "createdfrom" }),
                            createdfrom: result.getText({ name: "createdfrom" }),
                            opportunity: result.getValue({ name: "opportunity" }),
                            id_salesrep: result.getValue({ name: "salesrep" }),
                            salesrep: result.getText({ name: "salesrep" }),

                            // Clasificacion 
                            id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            custbody_ts_ec_serie_cxc: result.getValue({ name: "custbody_ts_ec_serie_cxc" }),
                            custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            custbodyts_ec_tipo_trans: result.getText({ name: "custbodyts_ec_tipo_trans" }),
                            id_custbody_ts_ec_metodo_pago: result.getValue({ name: "custbody_ts_ec_metodo_pago" }),
                            custbody_ts_ec_metodo_pago: result.getText({ name: "custbody_ts_ec_metodo_pago" }),
                            custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),
                            custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),


                            // custbody_ec_tip_compensaciones: result.getValue({ name: "custcol_4601_witaxamount" }),
                            // custbody_ec_mon_comp: result.getValue({ name: "custbody_ec_mon_comp" }),
                            // custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            custbody_ec_tip_compensaciones: result.getValue({ name: "custcol_4601_witaxamount" }),
                            custbody_ec_mon_comp: resultado, // result.getValue({ name: "custbody_ec_mon_comp" }),
                            id_custbody_ec_tip_emi: result.getValue({ name: "custbody_ec_tip_emi" }),
                            custbody_ec_tip_emi: result.getText({ name: "custbody_ec_tip_emi" }),
                            custbody_ec_ncomprobantes: result.getValue({ name: "custbody_ec_ncomprobantes" }),
                            custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),

                            // Canal de distribucion
                            id_custbody_ht_os_companiaseguros: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                            custbody_ht_os_companiaseguros: result.getText({ name: "custbody_ht_os_companiaseguros" }),
                            id_custbody_ht_os_concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                            custbody_ht_os_concesionario: result.getText({ name: "custbody_ht_os_concesionario" }),
                            id_custbody_ht_os_bancofinanciera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                            custbody_ht_os_bancofinanciera: result.getText({ name: "custbody_ht_os_bancofinanciera" }),
                            // custbodyec_nota_cliente: (result.getValue({ name: "custbodyec_nota_cliente" }) || '').replace(/,/g, ' '),
                            custbodyec_nota_cliente: result.getValue({ name: "custbodyec_nota_cliente" })
                                ? result.getValue({ name: "custbodyec_nota_cliente" })
                                    .replace(/,/g, ' ')
                                    .substring(0, 500)
                                : null,


                            // Información de facturación
                            id_terms: result.getValue({ name: "terms" }),
                            terms: result.getText({ name: "terms" }),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));
            });


            // try {
            //     let preciototal = 0;

            //     for (let i = 0; i < results.length; i++) {
            //         preciototal += parseFloat(results[i].subtotal);
            //     }

            //     log.debug("preciototal", preciototal);

            // } catch (error) {
            //     log.error("error", { message: error.message, stack: error.stack });
            // }



            // log.debug("results", results);

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaNCR(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let NotaCreditoSearch = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "CustCred"],
                        "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "any", ""],
                        "AND", ["voided", "is", "F"],
                        "AND", ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["mainline", "is", "T"],
                        "AND", ["subsidiary", "anyof", "3"],
                    ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "transactionnumber" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "entity" }),
                    search.createColumn({ name: "account" }),
                    search.createColumn({ name: "currency" }),
                    search.createColumn({ name: "taxtotal" }),
                    search.createColumn({ name: "total" }),
                    search.createColumn({ name: "exchangerate" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "duedate" }),
                    search.createColumn({ name: "memo" }),
                    search.createColumn({ name: "createdfrom" }),

                    search.createColumn({ name: "subsidiary" }),
                    search.createColumn({ name: "department" }),
                    search.createColumn({ name: "class" }),
                    search.createColumn({ name: "location" }),

                    search.createColumn({ name: "custbody_ts_ec_subsidiaria_pais" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                    search.createColumn({ name: "custbody_ts_ec_serie_doc_cxp" }),
                    search.createColumn({ name: "custbody_ts_ec_numero_preimpreso" }),
                    search.createColumn({ name: "custbody_ts_ec_sustento_comprobante" }),
                    search.createColumn({ name: "custbodyts_ec_tipo_trans" }),
                    search.createColumn({ name: "custbody_ec_desc_tip_iva" }),
                    search.createColumn({ name: "custbody_base_niva" }),
                    search.createColumn({ name: "custbody_ts_ec_bimp_exe" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate0" }),
                    search.createColumn({ name: "custbodyts_ec_base_rate12" }),
                    search.createColumn({ name: "custbody_ec_monto_iva" }),
                    search.createColumn({ name: "custbody_ts_ec_monto_letras" }),
                    search.createColumn({ name: "custbodyts_ec_num_autorizacion" }),
                    search.createColumn({ name: "custbody_ec_fecha_autorizacion" }),
                    search.createColumn({ name: "custbody_ts_pago_residente" }),
                    search.createColumn({ name: "custbody_ts_ec_ice_monto" }),
                    search.createColumn({ name: "custbodyts_ec_doc_type_ref" }),
                    search.createColumn({ name: "custbody_diario_relacionado" }),
                    search.createColumn({ name: "custbodyts_ec_doc_serie_ref" }),
                    search.createColumn({ name: "custbodyts_ec_doc_number_ref" }),
                    search.createColumn({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                    search.createColumn({ name: "custbody_ec_comentario" }),
                    search.createColumn({ name: "custbodyec_causal" }),

                    search.createColumn({ name: "salesrep", label: "Representante de ventas" }),

                ]
            });

            // Ejecutar la búsqueda paginada
            let searchResult = NotaCreditoSearch.runPaged({ pageSize: 1000 });
            // log.debug("count ConsultaNCR", { count: searchResult.count, fecha_ini: fecha_ini, fecha_fin: fecha_fin });

            // Procesar los resultados por página

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                let invoicesMap = {};

                // Procesar cada resultado
                myPage.data.forEach(function (result) {
                    let internalid = result.getValue({ name: "internalid" });

                    // Si la factura no está en el mapa, inicializar el objeto
                    if (!invoicesMap[internalid]) {
                        invoicesMap[internalid] = {
                            // Información principal
                            internalid: internalid,
                            transactionnumber: result.getValue({ name: "transactionnumber" }),
                            tranid: result.getValue({ name: "tranid" }),
                            id_entity: result.getValue({ name: "entity" }),
                            entity_text: (result.getText({ name: "entity" }) || '').replace(/,/g, ' '),
                            id_account: result.getValue({ name: "account" }),
                            id_currency: result.getValue({ name: "currency" }),
                            exchangerate: result.getValue({ name: "exchangerate" }),
                            trandate: result.getValue({ name: "trandate" }),
                            id_postingperiod: result.getValue({ name: "postingperiod" }),
                            postingperiod_text: result.getText({ name: "postingperiod" }),
                            id_createdfrom: result.getValue({ name: "createdfrom" }),
                            createdfrom: result.getText({ name: "createdfrom" }),

                            // Montos
                            subtotal: ((parseFloat(result.getValue({ name: "total" }) || "0") - parseFloat(result.getValue({ name: "taxtotal" }) || "0")).toFixed(2)),
                            taxtotal: result.getValue({ name: "taxtotal" }),
                            total: result.getValue({ name: "total" }),

                            // Classificación      
                            id_subsidiary: result.getValue({ name: "subsidiary" }),
                            id_department: result.getText({ name: "department" }),
                            id_class: result.getText({ name: "class" }),
                            id_location: result.getText({ name: "location" }),

                            // EC Localización
                            id_custbody_ts_ec_subsidiaria_pais: result.getValue({ name: "custbody_ts_ec_subsidiaria_pais" }),
                            id_custbodyts_ec_tipo_documento_fiscal: result.getValue({ name: "custbodyts_ec_tipo_documento_fiscal" }),
                            custbody_ts_ec_serie_doc_cxp: result.getValue({ name: "custbody_ts_ec_serie_doc_cxp" }),
                            custbody_ts_ec_numero_preimpreso: result.getValue({ name: "custbody_ts_ec_numero_preimpreso" }),
                            id_custbody_ts_ec_sustento_comprobante: result.getValue({ name: "custbody_ts_ec_sustento_comprobante" }),
                            id_custbodyts_ec_tipo_trans: result.getValue({ name: "custbodyts_ec_tipo_trans" }),
                            id_custbody_ec_desc_tip_iva: result.getValue({ name: "custbody_ec_desc_tip_iva" }),
                            custbody_base_niva: result.getValue({ name: "custbody_base_niva" }),
                            custbody_ts_ec_bimp_exe: result.getValue({ name: "custbody_ts_ec_bimp_exe" }),
                            custbodyts_ec_base_rate0: result.getValue({ name: "custbodyts_ec_base_rate0" }),
                            custbodyts_ec_base_rate12: result.getValue({ name: "custbodyts_ec_base_rate12" }),
                            custbody_ec_monto_iva: result.getValue({ name: "custbody_ec_monto_iva" }),
                            custbodyts_ec_num_autorizacion: result.getValue({ name: "custbodyts_ec_num_autorizacion" }),
                            custbody_ec_fecha_autorizacion: result.getValue({ name: "custbody_ec_fecha_autorizacion" }),
                            id_custbody_ts_pago_residente: result.getValue({ name: "custbody_ts_pago_residente" }),
                            custbody_ts_ec_ice_monto: result.getValue({ name: "custbody_ts_ec_ice_monto" }),

                            // EC Documento de Referencia
                            id_custbodyts_ec_doc_type_ref: result.getValue({ name: "custbodyts_ec_doc_type_ref" }),
                            id_custbody_diario_relacionado: result.getValue({ name: "custbody_diario_relacionado" }),
                            custbodyts_ec_doc_serie_ref: result.getValue({ name: "custbodyts_ec_doc_serie_ref" }),
                            custbodyts_ec_doc_number_ref: result.getValue({ name: "custbodyts_ec_doc_number_ref" }),
                            custbody_ts_ec_folio_fiscal_ref: result.getValue({ name: "custbody_ts_ec_folio_fiscal_ref" }),
                            idcausal: result.getValue({ name: "custbodyec_causal" }),
                            causalText: (result.getText({ name: "custbodyec_causal" }) || '').replace(/,/g, '/'),

                            // Adiconal
                            ID_EJECUTIVA_DE_VENTAS: result.getValue("salesrep") || "",
                            EJECUTIVA_DE_VENTAS: (result.getText("salesrep") || "").replace(/[^a-zA-Z0-9\s]/g, ""),

                        };
                    }
                });

                // Convertir el mapa de facturas en un array
                results = results.concat(Object.values(invoicesMap));

                // // suma del subtotal
                // let totalSubtotal = 0;
                // let totalTaxtotal = 0;
                // let totalTotal = 0;

                // for (let i = 0; i < results.length; i++) {
                //     totalSubtotal += parseFloat(results[i].subtotal);
                //     totalTaxtotal += parseFloat(results[i].taxtotal);
                //     totalTotal += parseFloat(results[i].total);
                // }

                // log.debug("totalSubtotal", totalSubtotal);
                // log.debug("totalTaxtotal", totalTaxtotal);
                // log.debug("totalTotal", totalTotal);

            });

            return results;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaConsolidado2(fecha_ini, fecha_fin) {
        try {
            // Validar las fechas
            let fechaIniValida = validarFecha(fecha_ini);
            let fechaFinValida = validarFecha(fecha_fin);

            if (!fechaIniValida.valido || !fechaFinValida.valido) {
                log.error("error", { message: "Fechas inválidas", fecha_ini: fecha_ini, message_fecha_ini: fechaFinValida.mensaje, fecha_fin: fecha_fin, message_fecha_fin: fechaFinValida.mensaje });
                return [];
            }

            fecha_ini = fecha_ini.replace(/-/g, "/");
            fecha_fin = fecha_fin.replace(/-/g, "/");

            let results = [];

            // Crear la búsqueda de órdenes de servicio (Sales Orders)
            let invoiceSearch = search.create({
                type: "transaction",
                filters:
                    [
                        // ["type", "anyof", ["Journal", "CustInvc", "CustCred"]],
                        // "AND",
                        ["trandate", "within", fecha_ini, fecha_fin],
                        "AND", ["subsidiary", "anyof", "3"],
                        // "AND", ["mainline", "is", "T"],
                        // "AND", ["memorized", "is", "F"],
                        "AND", ["posting", "is", "T"],
                        // "AND", ["voided", "is", "F"],
                        "AND",
                        [
                            [["account.number", "startswith", "4"]],
                            "OR", [["account.number", "startswith", "5"]],
                            "OR", [["account.number", "startswith", "6"]],
                            "OR", [["account.number", "startswith", "7"]]
                        ],
                    ],
                columns: [
                    search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
                    search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
                    search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
                    search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
                    search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
                    search.createColumn({ name: "number", join: "account", label: "Número" }),
                    search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
                    search.createColumn({ name: "account", label: "Cuenta" }),
                    search.createColumn({ name: "description", join: "account", label: "Descripción" }),
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "type", label: "Tipo" }),
                    search.createColumn({ name: "debitamount", label: "Debito" }),
                    search.createColumn({ name: "creditamount", label: "Credito" }),
                    search.createColumn({ name: "grossamount", label: "Diferencia" }),
                    search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
                    search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "postingperiod" }),
                    search.createColumn({ name: "exchangerate" }),
                ]
            });


            // let results = []; // Array donde almacenar los resultados completos

            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            log.debug("Total de registros en la búsqueda", totalRecords);

            let dataaaa = []

            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados

                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {

                    dataaaa.push({

                        ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                        Empresa: result.getText("subsidiary"),
                        ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                        Oficina: result.getValue({ name: "name", join: "location" }),
                        ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                        Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                        Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                        Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                        ID_Cuenta_Netsuite: result.getValue("account"),
                        Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                        ID_Transaccion: result.getValue({ name: "internalid" }),
                        Numero_Transaccion: result.getValue("transactionnumber"),
                        Debito: parseNumber(result.getValue("debitamount")),
                        Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                        importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                        Fecha_Movimiento: result.getValue("trandate"),
                        Tipo: result.getText("type"),
                        NDocumento: result.getValue("tranid"),
                        id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                        periodoDePublicacion: result.getText({ name: "postingperiod" }),
                        exchangerate: result.getValue({ name: "exchangerate" }),

                    })
                });

                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));

                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar

                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados

                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {

                        dataaaa.push({
                            ID_EMPRESA: result.getValue({ name: "internalid", join: "subsidiary" }),
                            Empresa: result.getText("subsidiary"),
                            ID_oficina: result.getValue({ name: "internalid", join: "location" }),
                            Oficina: result.getValue({ name: "name", join: "location" }),
                            ID_Sucursal: result.getValue({ name: "externalid", join: "location" }),
                            Sucursal: result.getValue({ name: "namenohierarchy", join: "location" }),
                            Grupo_Cuenta: result.getValue({ name: "number", join: "account" }),
                            Numero_Cuenta: result.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" }),
                            ID_Cuenta_Netsuite: result.getValue("account"),
                            Descripcion_Cuenta: result.getValue({ name: "description", join: "account" }),
                            ID_Transaccion: result.getValue({ name: "internalid" }),
                            Numero_Transaccion: result.getValue("transactionnumber"),
                            Debito: parseNumber(result.getValue("debitamount")),
                            Credito: Number((parseFloat(result.getValue("creditamount") || 0) * -1).toFixed(2)),
                            importe: Number((parseFloat(result.getValue("debitamount") || 0) - parseFloat(result.getValue("creditamount") || 0)).toFixed(2)),
                            Fecha_Movimiento: result.getValue("trandate"),
                            Tipo: result.getText("type"),
                            NDocumento: result.getValue("tranid"),
                            id_periodoDePublicacion: result.getValue({ name: "postingperiod" }),
                            periodoDePublicacion: result.getText({ name: "postingperiod" }),
                            exchangerate: result.getValue({ name: "exchangerate" }),

                        })

                    });

                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            log.debug("Número total de registros dataaa", dataaaa.length);

            return dataaaa;

        } catch (error) {
            log.debug("error", { message: error.message, stack: error.stack });
            return [];
        }
    }

    function ConsultaLibro500(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            let fechaInicio = requestBody.fechaini || '01-01-2025';
            let fechaFin = requestBody.fechafin || '31-12-2026';

            fechaInicio = formatearFechaSQL(fechaInicio);
            fechaFin = formatearFechaSQL(fechaFin);

            log.debug("ConsultaLibro500 - requestBody", requestBody);

            var sql = `
                    SELECT 
                      salesInvoiced.subsidiary AS subsidiary, 
                      transactionLine_SUB.accountingbook AS accountingbook, 
                      CASE WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '01' THEN '01 Ene' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '02' THEN '02 Feb' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '03' THEN '03 Mar' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '04' THEN '04 Abr' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '05' THEN '05 May' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '06' THEN '06 Jun' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '07' THEN '07 Jul' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '08' THEN '08 Ago' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '09' THEN '09 Set' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '10' THEN '10 Oct' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '11' THEN '11 Nov' WHEN SUBSTR(
                        TO_CHAR(
                          accountingPeriod.enddate, 'DD-MM-YYYY'
                        ), 
                        4, 
                        2
                      ) = '12' THEN '12 Dic' ELSE ' ' END AS formula_4, 
                      salesInvoiced.postingperiod AS postingperiod, 
                      accountingPeriod.enddate AS enddate, 
                      salesInvoiced."ACCOUNT" AS "ACCOUNT", 
                      salesInvoiced."TRANSACTION" AS "TRANSACCION", 
                      salesInvoiced.entity AS entity, 
                      salesInvoiced."TYPE" AS "TIPO", 
                      "TRANSACTION".tranid AS tranid, 
                      salesInvoiced.department AS department, 
                      salesInvoiced.item AS item, 
                      "TRANSACTION".currency AS currency, 
                      salesInvoiced.amount AS amount, 
                      CASE WHEN BUILTIN.DF(
                        transactionLine_SUB.accountingbook
                      ) = 'Primary Accounting Book' THEN BUILTIN.CONSOLIDATE(
                        transactionLine_SUB.amount, 'LEDGER', 
                        'DEFAULT', 'DEFAULT', 2, 227, 'DEFAULT'
                      ) * -1 ELSE 0 END AS formula_2, 
                      CASE WHEN BUILTIN.DF(
                        transactionLine_SUB.accountingbook
                      ) = 'USD GAAP' THEN BUILTIN.CONSOLIDATE(
                        transactionLine_SUB.amount, 'LEDGER', 
                        'DEFAULT', 'DEFAULT', 2, 227, 'DEFAULT'
                      ) * -1 ELSE 0 END AS formula_3, 
                      transactionLine_SUB.amount AS amount_1, 
                      salesInvoiced.itemcount AS itemCount, 
                      salesInvoiced."LOCATION" AS "LOCALIDAD", 
                      salesInvoiced.employee AS employee, 
                      employee.firstname AS firstname, 
                      employee.lastname AS lastname, 
                      salesInvoiced."CLASS" AS "CLASS",  
                      --item.cseg1 AS itemitemCSEG1, 
                      --NVL(TO_CHAR(item.cseg1), 'VACIO') AS itemitemCSEG1,
                      --salesInvoiced."department" AS itemitemCSEG1,
                      BUILTIN.DF(salesInvoiced."department") AS itemitemCSEG1,

                      --item.cseg5 AS itemitemCSEG5,
                      NVL(TO_CHAR(item.cseg5), 'VACIO') AS itemitemCSEG5,

                      --item.cseg6 AS itemitemCSEG6, 
                      NVL(TO_CHAR(item.cseg6), 'VACIO') AS itemitemCSEG6,
                      salesInvoiced.trandate AS trandate 
                    FROM 
                      salesInvoiced, 
                      "ACCOUNT", 
                      employee, 
                      item, 
                      accountingPeriod, 
                      "TRANSACTION", 
                      (
                        SELECT 
                          transactionLine.uniquekey AS uniquekey, 
                          transactionLine.uniquekey AS uniquekey_join, 
                          TransactionAccountingLine.accountingbook AS accountingbook, 
                          TransactionAccountingLine.amount AS amount 
                        FROM 
                          transactionLine, 
                          TransactionAccountingLine 
                        WHERE 
                          transactionLine."TRANSACTION" = TransactionAccountingLine."TRANSACTION" 
                          AND transactionLine."ID" = TransactionAccountingLine.transactionline
                      ) transactionLine_SUB 
                    WHERE 
                      (
                        (
                          (
                            (
                              (
                                (
                                  salesInvoiced."ACCOUNT" = "ACCOUNT"."ID" 
                                  AND salesInvoiced.employee = employee."ID"(+)
                                ) 
                                AND salesInvoiced.item = item."ID"(+)
                              ) 
                              AND salesInvoiced.postingperiod = accountingPeriod."ID"(+)
                            ) 
                            AND salesInvoiced."TRANSACTION" = "TRANSACTION"."ID"(+)
                          ) 
                          AND salesInvoiced.uniquekey = transactionLine_SUB.uniquekey(+)
                        )
                      ) 
                      AND (
                        (
                          salesInvoiced.subsidiary IN ('3') --AND accountingPeriod.isposting = ? 
                          AND "ACCOUNT".accttype IN ('Income')
                            AND salesInvoiced.trandate BETWEEN TO_DATE('${fechaInicio}', 'YYYY-MM-DD HH24:MI:SS') AND TO_DATE('${fechaFin}', 'YYYY-MM-DD HH24:MI:SS')
                        )
                      )
                        ORDER BY salesInvoiced."TRANSACTION"
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
                // return [];
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    results.push(result.value.asMap());
                    count++;
                }
                return count < recordsInThisPage; // Detener iteración cuando alcancemos el límite
            });

            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };
            // return results
        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
            // return [];
        }
    }

      function ConsultaLibro5002(requestBody) {
        try {
            var page = parseInt(requestBody.page || 1);
            var pageSize = parseInt(requestBody.pageSize || 1000);

            let fechaInicio = requestBody.fechaini || '01-01-2025';
            let fechaFin = requestBody.fechafin || '31-12-2026';

            fechaInicio = formatearFechaSQL(fechaInicio);
            fechaFin = formatearFechaSQL(fechaFin);

            log.debug("ConsultaLibro500 - requestBody", requestBody);

            var sql = `
SELECT 
  salesInvoiced.subsidiary AS subsidiary,
  transactionLine_SUB.accountingbook AS accountingbook,
  CASE 
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '01' THEN '01 Ene'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '02' THEN '02 Feb'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '03' THEN '03 Mar'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '04' THEN '04 Abr'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '05' THEN '05 May'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '06' THEN '06 Jun'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '07' THEN '07 Jul'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '08' THEN '08 Ago'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '09' THEN '09 Set'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '10' THEN '10 Oct'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '11' THEN '11 Nov'
    WHEN SUBSTR(TO_CHAR(accountingPeriod.enddate, 'DD-MM-YYYY'), 4, 2) = '12' THEN '12 Dic'
    ELSE ' ' 
  END AS formula_4,
  salesInvoiced.postingperiod AS postingperiod,
  accountingPeriod.enddate AS enddate,
  salesInvoiced."ACCOUNT" AS "ACCOUNT",
  salesInvoiced."TRANSACTION" AS "TRANSACCION",
  salesInvoiced.entity AS entity,
  salesInvoiced."TYPE" AS "TIPO",
  "TRANSACTION".tranid AS tranid,
  salesInvoiced.department AS department,
  salesInvoiced.item AS item,
  "TRANSACTION".currency AS currency,
  salesInvoiced.amount AS amount,
  CASE 
    WHEN BUILTIN.DF(transactionLine_SUB.accountingbook) = 'Primary Accounting Book' 
      THEN BUILTIN.CONSOLIDATE(transactionLine_SUB.amount, 'LEDGER', 'DEFAULT', 'DEFAULT', 2, 227, 'DEFAULT') * -1 
    ELSE 0 
  END AS formula_2,
  CASE 
    WHEN BUILTIN.DF(transactionLine_SUB.accountingbook) = 'USD GAAP' 
      THEN BUILTIN.CONSOLIDATE(transactionLine_SUB.amount, 'LEDGER', 'DEFAULT', 'DEFAULT', 2, 227, 'DEFAULT') * -1 
    ELSE 0 
  END AS formula_3,
  transactionLine_SUB.amount AS amount_1,
  salesInvoiced.itemcount AS itemCount,
  salesInvoiced."LOCATION" AS "LOCALIDAD",
  salesInvoiced.employee AS employee,
  employee.firstname AS firstname,
  employee.lastname AS lastname,
  salesInvoiced."CLASS" AS "CLASS",
  BUILTIN.DF(salesInvoiced."department") AS itemitemCSEG1,
  NVL(TO_CHAR(item.cseg5), 'VACIO') AS itemitemCSEG5,
  NVL(TO_CHAR(item.cseg6), 'VACIO') AS itemitemCSEG6,
  salesInvoiced.trandate AS trandate
FROM 
  salesInvoiced,
  "ACCOUNT",
  employee,
  item,
  accountingPeriod,
  "TRANSACTION",
  (
    SELECT 
      transactionLine.uniquekey AS uniquekey,
      transactionLine.uniquekey AS uniquekey_join,
      TransactionAccountingLine.accountingbook AS accountingbook,
      TransactionAccountingLine.amount AS amount
    FROM 
      transactionLine,
      TransactionAccountingLine
    WHERE 
      transactionLine."TRANSACTION" = TransactionAccountingLine."TRANSACTION"
      AND transactionLine."ID" = TransactionAccountingLine.transactionline
  ) transactionLine_SUB
WHERE 
  (
    (
      (
        (
          (
            salesInvoiced."ACCOUNT" = "ACCOUNT"."ID"
            AND salesInvoiced.employee = employee."ID"(+)
          )
          AND salesInvoiced.item = item."ID"(+)
        )
        AND salesInvoiced.postingperiod = accountingPeriod."ID"(+)
      )
      AND salesInvoiced."TRANSACTION" = "TRANSACTION"."ID"(+)
    )
    AND salesInvoiced.uniquekey = transactionLine_SUB.uniquekey(+)
  )
  AND (
    salesInvoiced.subsidiary IN ('3')
    AND "ACCOUNT".accttype IN ('Income')
    AND salesInvoiced.trandate BETWEEN TO_DATE('${fechaInicio}', 'YYYY-MM-DD HH24:MI:SS') AND TO_DATE('${fechaFin}', 'YYYY-MM-DD HH24:MI:SS')
  )
ORDER BY salesInvoiced."TRANSACTION"
                `;

            var pagedData = query.runSuiteQLPaged({
                query: sql,
                pageSize: pageSize
            });

            var totalRecords = pagedData.count;
            var totalPages = pagedData.pageRanges.length;

            if (page > totalPages && totalPages > 0) {
                page = totalPages;
            } else if (totalPages === 0) {
                return {
                    success: true,
                    data: [],
                    pagination: {
                        page: 0,
                        pageSize: pageSize,
                        totalRecords: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    }
                };
                // return [];
            }

            var pageIndex = page - 1;
            var pageData = pagedData.fetch({ index: pageIndex });
            var results = [];

            // Calcular cuántos registros deberían estar en esta página
            var recordsInThisPage = pageSize;
            if (page === totalPages) {
                recordsInThisPage = totalRecords - (pageSize * (totalPages - 1));
            }

            var iterator = pageData.data.iterator();
            var count = 0;
            iterator.each(function (result) {
                if (count < recordsInThisPage) {
                    results.push(result.value.asMap());
                    count++;
                }
                return count < recordsInThisPage; // Detener iteración cuando alcancemos el límite
            });

            return {
                success: true,
                data: results,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalRecords: totalRecords,
                    totalPages: totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };
            // return results
        } catch (e) {
            return {
                success: false,
                error: e.message,
                details: e.stack
            };
            // return [];
        }
    }

  
    function _post(context) {
        try {
            return

        } catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el registro. Error controlado.';
        }
    }

    function _put() {
        //put
    }

    function _delete() {
        //delete
    }

    /**
     * Funciones adicionales
     */
    const validarFecha = (fecha) => {
        const regex = /^\d{2}-\d{2}-\d{4}$/;
        const mensajeFormatoCorrecto = "El formato correcto es dd-mm-yyyy.";

        // Verifica si la fecha cumple con el formato dd-mm-yyyy
        if (!regex.test(fecha)) {
            return {
                valido: false,
                mensaje: `La fecha ${fecha} no cumple con el formato correcto. ${mensajeFormatoCorrecto}`
            };
        }

        // Divide la fecha en día, mes y año
        const [dia, mes, año] = fecha.split('-').map(Number);
        const fechaObjeto = new Date(año, mes - 1, dia);

        // Verifica si la fecha es válida
        if (fechaObjeto.getFullYear() !== año || fechaObjeto.getMonth() !== mes - 1 || fechaObjeto.getDate() !== dia) {
            return {
                valido: false,
                mensaje: `La fecha ${fecha} no es una fecha válida. ${mensajeFormatoCorrecto}`
            };
        }

        // La fecha es válida
        return {
            valido: true,
            mensaje: `La fecha ${fecha} es válida.`
        };
    };

    function parseNumber(input) {
        if (input === "") {
            return 0;
        }

        let number = Number(input);

        if (isNaN(number)) {
            return 0;
        }

        return number;
    }


    function formatearFechaSQL(fecha) {
        // fecha viene como "DD-MM-YYYY"
        const [dd, mm, yyyy] = fecha.split('-');
        return `${yyyy}-${mm}-${dd}`;
    }


    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }

});