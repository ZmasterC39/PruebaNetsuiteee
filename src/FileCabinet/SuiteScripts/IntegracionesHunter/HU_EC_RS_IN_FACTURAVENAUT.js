/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(["N/log", "N/search", "N/record", "N/config", "N/query"], (
    log,
    search,
    record,
    config,
    query
) => {
    const LONGITUD_PAGINA = 50;
    var TAX_ITEM_NS_EC = ""; //SB:16514 / PR:24128

    const _post = (requestBody) => {
        try {
            log.debug("requestBody", requestBody);
            const data = buildData(requestBody);
            log.debug("data", data);
            return JSON.stringify(data);
        } catch (e) {
            log.error("Error respuesta Post 1", e);
            return JSON.stringify({ results: respuestaGlobales("2") });
        }
    };

    const buildData = (requestBody) => {
        // Respuesta por defecto.
        let response = [{
            status: "ER",
            message: "ERROR",
            idFactura: 0,
            idDocumento: "",
            idCliente: "",
            cliente: ""
        }];

        // Validar si existe la orden de servicio.
        //if (existeOrdenServicio(requestBody?.idOrdenServicio)) {
        // Crear factura.
        const idFactura = crearFactura(requestBody);

        // const idFactura = crearFacturaDirecta(requestBody.idOrdenServicio);

        // Validar si se creó la factura.
        if (idFactura) {
            let objFactura = record.load({ type: record.Type.INVOICE, id: idFactura, isDynamic: true });
            let iddocumento = objFactura.getValue({ fieldId: 'tranid' });
            let cliente = objFactura.getValue({ fieldId: 'entityname' });
            let idCliente = objFactura.getValue({ fieldId: 'vatregnum' });

            response = [{
                status: "OK",
                message: "Factura creada correctamente",
                idFactura: idFactura,
                idDocumento: iddocumento,
                idCliente: idCliente,
                cliente: cliente
            }];
        }
        //}
        // Respuesta.
        return { results: response };
    };

    /**
     * TODO: Funciones Crear Registro.
     */
    const crearFactura = (scriptContext) => {
        (scriptContext.tipoDocumento = "16"), // 4 - 01 Factura , 16 - 18 18 Documentos autorizados utilizados en ventas excepto N/C N/D
            (scriptContext.ubicacionId = "5"),
            (scriptContext.prefijo = "FA"),
            (scriptContext.documentoReferencia = "");
        (scriptContext.metodoPago = "4");

        try {
            let jsonDetail = new Array();
            let tipoDocumento = scriptContext.tipoDocumento;
            let ubicacionId = scriptContext.ubicacionId;
            let prefijo = scriptContext.prefijo;
            let documentoReferencia = scriptContext.documentoReferencia;
            let tipoIdTransaccioncli = scriptContext.tipoIdTransaccioncli;

            // Codigo de Evol
            //**BLOQUE DE CONFIGURACIÓN DE AMBIENTE ======================================================================== */
            let varEnviroment = configEnviroment();
            //log.debug('Configuracion de variable', varEnviroment);
            TAX_ITEM_NS_EC = varEnviroment.tax_item_ns_ec;
            //**============================================================================================================ */

            let dataSerie = ObtenerDataSerie(
                tipoDocumento,
                ubicacionId,
                prefijo,
                documentoReferencia
            );
            let serie_cxc = dataSerie.impresionSerie;
            let correlative = GenerarNumeroFactura(
                dataSerie.numeroSerie,
                dataSerie.internalSerie,
                dataSerie.impresionSerie,
                "beforeSubmit"
            );

            log.debug("correlative", correlative);

            // Periodo Actual
            let OPA = obtenerPeriodoActual();

            // JCH 12/08/2024
            // Data Orden De Servicio.
            var datosOS = false;
            if ((scriptContext.idOrdenServicio != '') && (scriptContext.idOrdenServicio != '0')) {
                let DataOS = ObtenerDataOrdenServicio(scriptContext.idOrdenServicio);

                if (DataOS != null) {
                    datosOS = true;
                }

                //log.debug("DataOS", DataOS);

            }


            // JCH 12/08/2024
            // no existen datos de orden de servicio
            if (datosOS == false) {

                var placa = scriptContext.placa;
                var codvehiculo = scriptContext.codvehiculo;
                var identCliente = scriptContext.identificacion;
                var memo = 'Facturación Debito automatico' + ' OS. ' + scriptContext.idOrdenServicio + ' VEH. ' + codvehiculo;
                var subsidiary = 2; // Ecuador
                var department = "17"; // Financiero
                var location = scriptContext.oficina; // Guayaquil
                var formaPago = scriptContext.formaPago; // Debito automatico
                var clase = scriptContext.clase;
                var sustentoComprobante = 6; // 01 Crédito Tributario para declaración de IVA (servicios y bienes distintos de inventarios y activos fijos)
                
              
                log.debug("placa", placa);

                // OBTENER INTERNAL ID DE CLIENTE
                // var internalidcliente
                var busquedaCliente = search.create({
                    type: "customer",
                    filters:
                        [
                            ["vatregnumber", search.Operator.IS, identCliente]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "entityid", label: "ID" }),
                            search.createColumn({ name: "altname", label: "Nombre" }),
                            search.createColumn({ name: "internalid", label: "internalid" }),
                            search.createColumn({
                                name: "internalid",
                                join: "salesRep",
                                label: "ID interno"
                            }),
                            search.createColumn({
                                name: "internalid",
                                join: "CUSTENTITY_EC_DOCUMENT_TYPE",
                                label: "ID interno"
                            })
                        ]
                });
                var myResultSetCliente = busquedaCliente.run().getRange({ start: 0, end: 1 });
                var theCountCli = busquedaCliente.runPaged().count;
                if (theCountCli != 1) {
                    log.debug('Busqueda.Error no se encontró el Cliente........', myResultSetCliente);
                    return 'ERROR:' + '100'; //El Cliente no se encuentra registrado
                } else {
                    //Obtiene el ID
                    var internalidcliente = myResultSetCliente[0].getValue(busquedaCliente.columns[2]);
                    var salesRepCliente = myResultSetCliente[0].getValue(busquedaCliente.columns[3]);
                    var tipoDocCliente = myResultSetCliente[0].getValue(busquedaCliente.columns[4]);
                }

                log.debug("internalidcliente", internalidcliente);
                log.debug("salesRepCliente", salesRepCliente);
                log.debug("tipoDocCliente", tipoDocCliente);

                var tipoIdTransaccion = '';

                // Definir Tipo Ident. Transaccion
                /*if (tipoDocCliente == '2') { // Cedula
                      tipoIdTransaccion = '4' // COMPRA - CEDULA
                  }else if(custbodyts_ec_doc_serie_ref == "3") { // Pasaporte
                      tipoIdTransaccion = '9' // COMPRA - PASAPORTE / IDENTIFICACIÓN TRIBUTARIA DEL EXTERIOR
                  }else if(custbodyts_ec_doc_serie_ref == "1") {// RUC
                      tipoIdTransaccion = '15' // COMPRA - RUC
                  }else if(custbodyts_ec_doc_serie_ref == "5") { // Identificacion del exterior
                      tipoIdTransaccion = '9' // COMPRA - PASAPORTE / IDENTIFICACIÓN TRIBUTARIA DEL EXTERIOR
                  }else if(custbodyts_ec_doc_serie_ref == "4") {// Venta consumidor final
                      tipoIdTransaccion = '8' // VENTA - Consumidor Final
                  }else {
                      tipoIdTransaccion = ''
                  )
                  */


                // JCH 12/08/2024
                switch (tipoDocCliente) {
                    case 2: // Cedula
                        tipoIdTransaccion = '5'; // VENTA - CEDULA
                        break;
                    case 3: // Pasaporte
                        tipoIdTransaccion = '11'; // VENTA - PASAPORTE / IDENTIFICACIÓN TRIBUTARIA DEL EXTERIOR
                        break;
                    case 1: // RUC
                        tipoIdTransaccion = '17'; // VENTA - RUC
                        break;
                    case 5: // Identificacion del exterior
                        tipoIdTransaccion = '11';  // VENTA - PASAPORTE / IDENTIFICACIÓN TRIBUTARIA DEL EXTERIOR
                        break;
                    case 4: // Venta consumidor final
                        tipoIdTransaccion = '8'; // VENTA - Consumidor Final
                        break;
                    default:
                        tipoIdTransaccion = '5'; // VENTA - CEDULA
                        break;
                }


               tipoIdTransaccion = tipoIdTransaccioncli;


                // log.debug("internalidcliente", internalidcliente);
                // log.debug("salesRepCliente", salesRepCliente);
                // log.debug("tipoDocCliente", tipoDocCliente);
                // log.debug("tipoIdTransaccion", tipoIdTransaccion);
                // log.debug("sustentoComprobante", sustentoComprobante);
                // log.debug("department", department);



                // OBTENER INTERNAL ID DE VEHICULO
                var internalidBien = ''
                /*var busquedaBien = search.create({
                    type: "customrecord_ht_record_bienes",
                    filters:
                        [
                            ["custrecord_ht_bien_codsysh", "is", codvehiculo],
                        ],
                    columns:
                        [
                            search.createColumn({ name: "internalid", label: "ID interno" })

                        ]
                });
                var myResultSetBien = busquedaBien.run().getRange({ start: 0, end: 1 });
                var theCountBien = busquedaBien.runPaged().count;
                if (theCountBien != 1) {
                    log.debug('Busqueda.Error no se encontró el registro del Bien........', myResultSetBien);
                    return 'ERROR:' + '200'; //El Bien no se encuentra registrado
                } else {
                    //Obtiene el ID
                    internalidBien = myResultSetBien[0].getValue(busquedaBien.columns[0]);
                }
                */

                log.debug("internalidBien", internalidBien);

            }

            tipoIdTransaccion = tipoIdTransaccioncli;

            log.debug("location", location);
            log.debug("tipoIdTransaccion", tipoIdTransaccion);

            const serviceOrder = new Factura(
                "101",
                correlative.numeroFacturaVenta,
                internalidcliente,
                internalidBien,
                internalidcliente,
                "2", // approvalstatus
                new Date(ObtenerFechaFactura()),
                obtenerIdPeriodoContable(OPA),
                "",
                "",
                "",
                memo,
                "",
                "",
                "",
                "",
                "",
                "", // Representante de ventas
                subsidiary,
                department,
                clase, //Clase
                location,
                "63",
                tipoDocumento,
                1, //  custbody_ts_ec_serie_cxc
                correlative.secuencialFactura,
                sustentoComprobante,
                tipoIdTransaccion, // Tipo Ident. Transaccion
                scriptContext.metodoPago,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "496", //DataOS.aseguradora SIN ASEGURADORA CONFIRMAR,
                "914", //DataOS.concesionario SIN CONCESIONARIO CONFIRMAR,
                "1045", //DataOS.bancofinanciera SIN FINANCIERA,
                memo,
                formaPago,
                correlative.numeroFacturaVenta
            );

            let items = scriptContext?.items;
            for (let i in items) {
                let taxes = getTaxes(items[i].codigoImpuesto);
                let detail = new Detail(
                    items[i].item,
                    items[i].nivelPrecio,
                    taxes.taxcode,
                    taxes.taxrate,
                    items[i].cantidad,
                    items[i].centroCosto,
                    items[i].clase,
                    items[i].ubicacion,
                    items[i].unidad,
                    items[i].descripcion,
                    items[i].importe,
                    items[i].importeBruto,
                    items[i].monto,
                    items[i].importeImpuesto,
                    items[i].clienteNuevo,
                    items[i].clienteMonitoreo,
                    items[i].codigoOrigen,
                    items[i].dispositivoCustodia,
                    items[i].transmision,
                    items[i].undcobertura
                );
                jsonDetail.push(detail.detail());
            }
            log.debug("objHeader", serviceOrder.header());
            log.debug("objDetail", jsonDetail);

            let respuesta = createInvoice(serviceOrder.header(), jsonDetail);


            // CAMBIAR FECHA DOC
            /*
            if (respuesta) {
                 try {
                     // Actualizar la fecha al 05/11/2024
                     let objRecord = record.load({ type: record.Type.INVOICE, id: respuesta, isDynamic: true });
                     objRecord.setValue({ fieldId: 'trandate', value: new Date('2026/09/05') });
                     objRecord.save({ ignoreMandatoryFields: true });
                 } catch (e) {
                     log.error("Error en Actualizar Fecha", e);
                 }
             }
             */

            log.debug("Metodo personalizado", respuesta);
            return respuesta;
        } catch (e) {
            log.error("Error en crearFactura", e);
            return "";
        }
    };

    /*
     * Funciones de búsqueda
     */
    const getClientesIdNombre = (nombre) => {
        try {
            const SearchObj = search.create({
                type: "customer",
                filters: [
                    ["firstname", "startswith", nombre],
                    "AND",
                    ["isdefaultshipping", "is", "T"],
                ],
                columns: ["internalid"],
            });

            // Ejecutar la búsqueda y devolver los resultados mapeados.
            return SearchObj.run().getRange({ start: 0, end: 10 }).map(result => result.getValue({ name: "internalid" }));
        } catch (e) {
            // En caso de error, registrar el error y devolver un array vacío.
            log.error("Error en getCliente", e);
            return [];
        }
    };

    const existeOrdenServicio = (transaction) => {
        try {
            const objSearch = search.load({ id: "customsearch_ht_transaction_search" });

            const filters = [
                { name: "type", operator: search.Operator.ANYOF, values: "SalesOrd" },
                { name: "internalid", operator: search.Operator.ANYOF, values: transaction },
                { name: "status", operator: search.Operator.NONEOF, values: ["SalesOrd:C", "SalesOrd:H", "SalesOrd:D", "SalesOrd:G"] },
                { name: "mainline", operator: search.Operator.IS, values: "T" }
            ];

            objSearch.filters.push(...filters.map(filter => search.createFilter(filter)));

            return objSearch.runPaged().count >= 1;
        } catch (e) {
            log.error("Error en existeOrdenServicio", e);
            return false;
        }
    };

    /**
     * TODO: Funciones auxiliares.
     */
    function respuestaGlobales(opcion) {
        const responses = {
            "2": [{ status: "ER", message: "ERROR", idFactura: 0, idDocumento: "", idCliente: "", cliente: "" }],
        };
        return responses[opcion] || null;
    }

    function createColumn(name, join = null, summary = null, label, sort) {
        const columnConfig = { name, join, summary, label };
        if (sort === "ASC") columnConfig.sort = "ASC";
        return search.createColumn(columnConfig);
    }

    function getValueOrEmpty(result, column) {
        // Función que obtiene el valor de un campo de búsqueda de un resultado de búsqueda.
        const value = result.getValue(column);
        // Si el valor es igual a "- None -", se devuelve una cadena vacía en su lugar.
        return value === "- None -" ? "" : value;
    }

    function getTextOrEmpty(result, column) {
        // Función que obtiene el valor de un campo de texto de un resultado de búsqueda.
        const value = result.getText(column);
        // Si el valor es igual a "- None -", se devuelve una cadena vacía en su lugar.
        return value === "- None -" ? "" : value;
    }

    // Crear Factura Directa.
    const crearFacturaDirecta = (idServiceOrder) => {
        /**
           * El fragmento de código proporcionado realiza una transformación de registros en NetSuite. Aquí está el desglose de lo que hace:
           * Transforma un registro: Utiliza el método transform del objeto record para crear un nuevo registro (en este caso, una factura) a partir de un registro existente (en este caso, una orden de venta).
           
          * Parámetros del método transform:
             - fromType: El tipo de registro desde el cual se está transformando. Aquí se especifica record.Type.SALES_ORDER, lo que indica que el registro original es una orden de venta.
             - fromId: El ID del registro original que se va a transformar. serviceOrder es una variable que contiene el ID de la orden de venta específica que se está transformando en una factura.
             - toType: El tipo de registro al cual se está transformando. Aquí se especifica record.Type.INVOICE, lo que indica que el resultado de la transformación será una factura.
             - isDynamic: Un booleano que indica si el nuevo registro se crea en modo dinámico. Cuando se establece en true, permite la manipulación del registro transformado de manera dinámica antes de guardarlo, como establecer valores de campos adicionales.
             - En resumen, este código toma una orden de venta existente en NetSuite, identificada por serviceOrder, y crea una nueva factura basada en ella. El proceso se realiza en modo dinámico, lo que permite hacer cambios adicionales en la factura antes de guardarla en el sistema.
           */

        try {
            // Metodo transform. (Orden de Servicio a Factura).
            const recTransform = record
                .transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: idServiceOrder,
                    toType: record.Type.INVOICE,
                    isDynamic: true,
                })
                //.setValue("custbodyts_ec_tipo_documento_fiscal", 16) // Tipo de Documento Fiscal.
                .setValue("department", 6) // Departamento.
                .setValue("class", 6) // clase
                .setValue("customform", 142) // Formulario de Factura. // 142 o 101

            // .setValue("custbodycustbody_ht_os_created_from_sa", false) // Creado desde SA.
            // .setValue("custbodyts_ec_tipo_trans", 5) // Tipo de Transacción.
            // .setValue("version", 6) // Aprobación de Cartera.
            // .setValue("custbody_ts_ec_numero_preimpreso", "000000001") // Numero Preimpreso.
            // .setValue("custbody_ts_ec_serie_cxc", null) // Serie CXC.

            //.setValue("custbodyts_ec_tipo_documento_fiscal", 4) // Tipo de Documento Fiscal.
            //.setValue("custbody_ts_ec_sustento_comprobante", 6) // Sustento Comprobante.
            //.setValue("custcurrep", 13) // Subsidiaria Pais.

            //  Guardar factura.
            const respuesta = recTransform.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
            });
            return respuesta;
        } catch (e) {
            log.error("Error en crearFactura", e);
            return "";
        }
    };

    // Funciones de Serie de Impresión.
    const ObtenerDataSerie = (
        tipoDocumento,
        ubicacion,
        prefijo,
        documentoref = 0
    ) => {
        let serieResult = {
            internalSerie: "",
            numeroSerie: "",
            impresionSerie: "",
        };

        try {
            const searchLoad = search.create({
                type: "customrecordts_ec_series_impresion",
                filters: [
                    ["custrecord_ts_ec_tipo_documento", "anyof", tipoDocumento],
                    "AND",
                    ["custrecord_ts_ec_localidad_serie", "anyof", ubicacion],
                ],
                columns: [
                    { name: "internalid", sort: search.Sort.ASC },
                    "custrecord_ts_ec_rango_inicial",
                    "custrecord_ts_ec_series_impresion",
                    search.createColumn({
                        name: "custrecordts_ec_iniciales_tip_comprob",
                        join: "custrecord_ts_ec_tipo_documento",
                        label: "Status",
                    }),
                ],
            });

            const searchResult = searchLoad.run().getRange({ start: 0, end: 1 });

            if (searchResult.length) {
                const [result] = searchResult;
                const internalSerie = result.getValue(searchLoad.columns[0]);
                const numeroSerie = parseInt(result.getValue(searchLoad.columns[1]));
                const impresionSerie = `${result.getValue(
                    searchLoad.columns[3]
                )}-${result.getValue(searchLoad.columns[2])}`;

                return { internalSerie, numeroSerie, impresionSerie };
            }
        } catch (error) {
            log.error({ title: "getPeSerie", details: error });
        }

        return serieResult;
    };

    // Funciones de Correlativo.
    const GenerarNumeroFactura = (
        numeroSerie,
        internalSerieID,
        impresionSerie,
        accion
    ) => {
        let this_number = numeroSerie + 1; // Incrementa el número inicial en 1.

        // Si la función es 'afterSubmit', actualiza el rango inicial en el registro.
        if (accion === "afterSubmit") {
            log.error("generateCorrelative", {
                return_pe_inicio: numeroSerie,
                serieid: internalSerieID,
                serieimpr: impresionSerie,
            });
            log.error("afterSubmit", this_number);
            record.submitFields({
                type: "customrecordts_ec_series_impresion",
                id: internalSerieID,
                values: { custrecord_ts_ec_rango_inicial: this_number },
            });
        }

        // Determina la cantidad de ceros necesarios para completar el número a 9 dígitos.
        let ceros = "0".repeat(Math.max(0, 8 - this_number.toString().length));

        // Combina los ceros con el número para formar el correlativo.
        let secuencialFactura = ceros + this_number;
        // Combina la serie de impresión con el correlativo y elimina los guiones del número final.
        let numeroFacturaVenta = (impresionSerie + "-" + secuencialFactura).replace(
            /-/g,
            ""
        );

        // Retorna el objeto con el correlativo y el número final.
        return {
            secuencialFactura,
            numeroFacturaVenta,
        };
    };

    // Funciones de Impuestos.
    const configEnviroment = () => {
        const companyInfo = config.load({ type: config.Type.COMPANY_INFORMATION });
        const companyId = companyInfo.getValue({ fieldId: "companyid" });
        const isSandbox = companyId.includes("SB");

        return {
            tax_item_ns_ec: isSandbox ? "16514" : "24128",
        };
    };

    // Funciones de Facturación.
    function obtenerPeriodoActual() {
        const fechaActual = new Date();
        const mes = fechaActual
            .toLocaleString("en", { month: "short" })
            .toLowerCase();
        const año = fechaActual.getFullYear();
        return `${mes} ${año}`;
    }

    /**
     * Función para obtener el ID del período contable.
     *
     * @param {string} periodo - El nombre del período contable (ej. "jul 2024").
     * @returns {number|null} - El ID del período contable o null si no se encuentra.
     */
    function obtenerIdPeriodoContable(periodo) {
        try {
            const periodSearch = search.create({
                type: "accountingperiod",
                filters: [["periodname", "contains", periodo]],
                columns: ["internalid"],
            });

            const resultSet = periodSearch.run();
            const results = resultSet.getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                return results[0].getValue("internalid");
            } else {
                return "";
            }
        } catch (e) {
            log.error("Error en obtenerIdPeriodoContable", e);
            return "";
        }
    }

    function ObtenerFechaFactura() {
        const fechaActual = new Date();
        const dia = String(fechaActual.getDate()).padStart(2, "0");
        const mes = String(fechaActual.getMonth() + 1).padStart(2, "0"); // Los meses en JavaScript son 0-indexados
        const año = fechaActual.getFullYear();
        return `${año}/${mes}/${dia}`;
    }

    // * NUEVO CÓDIGO
    const getTaxes = (tax) => {
        let lookUpTaxCode = search.lookupFields({
            type: search.Type.SALES_TAX_ITEM,
            id: tax,
            columns: ["internalid", "rate"],
        });
        let taxcode = lookUpTaxCode.internalid[0].value;
        let taxrate = lookUpTaxCode.rate;
        taxrate = taxrate.replace("%", "");
        return { taxcode: taxcode, taxrate: taxrate };
    };

    // Data de la OS
    const ObtenerDataOrdenServicio = (id) => {
        log.debug("id", id);
        try {
            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["internalid", "anyof", id],
                    "AND",
                    ["mainline", "is", "T"],
                ],
                columns: [
                    createColumn("internalid", null, null, "ID Interno"),
                    createColumn("tranid", null, null, "Num. Pedido"),
                    createColumn("entity", null, null, "Cliente"),
                    createColumn("custbody_ht_so_bien", null, null, "Bien"),
                    createColumn("memo", null, null, "Memo"),
                    createColumn("salesrep", null, null, "Sales Rep"),
                    createColumn("subsidiary", null, null, "Subsidiary"),
                    createColumn("department", null, null, "Department"),
                    createColumn("class", null, null, "Class"),
                    createColumn("location", null, null, "Location"),
                    // createColumn("custbody_ts_ec_localidad", null, null, "EC Localidad"),
                    createColumn(
                        "custbody_ht_os_companiaseguros",
                        null,
                        null,
                        "Canal de Distribución"
                    ),
                    createColumn(
                        "custbody_ht_os_concesionario",
                        null,
                        null,
                        "Concesionario"
                    ),
                    createColumn(
                        "custbody_ht_os_bancofinanciera",
                        null,
                        null,
                        "Banco/Financiera"
                    ),
                    createColumn("custbodyec_nota_cliente", null, null, "Nota Cliente"),
                ],
            });

            const myPagedData = salesorderSearchObj.runPaged();

            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    let id = getValueOrEmpty(result, { name: "internalid" });
                    let numPedido = getValueOrEmpty(result, { name: "tranid" });
                    let cliente = getValueOrEmpty(result, { name: "entity" });
                    let bien = getValueOrEmpty(result, { name: "custbody_ht_so_bien" });
                    let memo = getValueOrEmpty(result, { name: "memo" });
                    let salesrep = getValueOrEmpty(result, { name: "salesrep" });
                    let subsidiary = getValueOrEmpty(result, { name: "subsidiary" });
                    let department = getValueOrEmpty(result, { name: "department" });
                    let clase = getValueOrEmpty(result, { name: "class" });
                    let location = getValueOrEmpty(result, { name: "location" });
                    let aseguradora = getValueOrEmpty(result, {
                        name: "custbody_ht_os_companiaseguros",
                    });
                    let concesionario = getValueOrEmpty(result, {
                        name: "custbody_ht_os_concesionario",
                    });
                    let bancofinanciera = getValueOrEmpty(result, {
                        name: "custbody_ht_os_bancofinanciera",
                    });
                    let notacliente = getValueOrEmpty(result, {
                        name: "custbodyec_nota_cliente",
                    });

                    respuesta.push({
                        idordenservicio: id,
                        ordenservicio: numPedido,
                        cliente: cliente,
                        bien: bien,
                        memo: memo,
                        salesrep: salesrep,
                        subsidiary: subsidiary,
                        department: department,
                        clase: clase,
                        location: location,
                        aseguradora: aseguradora,
                        concesionario: concesionario,
                        bancofinanciera: bancofinanciera,
                        notacliente: notacliente,
                    });
                });
            });

            return respuesta[0];
        } catch (e) {
            log.error("Error en BuscarOS", e);
            return [];
        }
    };

    // Todo: Funciones de Facturación. (Update Factura)
    class Factura {
        constructor(
            customform,
            tranid,
            entity,
            custbody_ht_so_bien,
            custbody_ht_facturar_a,
            approvalstatus,
            trandate, //
            postingperiod,
            duedate,  //
            startdate, //
            enddate,   //
            memo,
            custbody_ht_os_convenio,
            custbody_ec_estado_de_autorizaci,
            custbody_ht_cod_agru,
            createdfrom,
            opportunity,
            salesrep,
            subsidiary,
            department,
            clase,
            location,
            custbody_ts_ec_subsidiaria_pais,
            custbodyts_ec_tipo_documento_fiscal,
            custbody_ts_ec_serie_cxc,
            custbody_ts_ec_numero_preimpreso,
            custbody_ts_ec_sustento_comprobante,
            custbodyts_ec_tipo_trans,
            custbody_ts_ec_metodo_pago,
            custbody_base_niva,
            custbody_base_niva0,
            custbody_base_niva12,
            custbody_ts_ec_ice_monto,
            custbody_ec_monto_iva,
            custbody_ec_desc_tip_iva,
            custbody_ec_iva_re,
            custbody_ec_ren_re,
            custbody_ec_tip_compensaciones,
            custbody_ec_mon_comp,
            custbody_ec_tip_emi,
            custbody_ec_ncomprobantes,
            custbody_ht_os_companiaseguros,
            custbody_ht_os_concesionario,
            custbody_ht_os_bancofinanciera,
            custbodyec_nota_cliente,
            terms,
            initialtranid
        ) {
            this.fields = {
                customform,
                tranid,
                entity,
                custbody_ht_so_bien,
                custbody_ht_facturar_a,
                approvalstatus,
                trandate,
                postingperiod,
                duedate,
                startdate,
                enddate,
                memo,
                custbody_ht_os_convenio,
                custbody_ec_estado_de_autorizaci,
                custbody_ht_cod_agru,
                createdfrom,
                opportunity,
                salesrep,
                subsidiary,
                department,
                class: clase, // 'class' is a reserved keyword in JS
                location,
                custbody_ts_ec_subsidiaria_pais,
                custbodyts_ec_tipo_documento_fiscal,
                custbody_ts_ec_serie_cxc,
                custbody_ts_ec_numero_preimpreso,
                custbody_ts_ec_sustento_comprobante,
                custbodyts_ec_tipo_trans,
                custbody_ts_ec_metodo_pago,
                custbody_base_niva,
                custbody_base_niva0,
                custbody_base_niva12,
                custbody_ts_ec_ice_monto,
                custbody_ec_monto_iva,
                custbody_ec_desc_tip_iva,
                custbody_ec_iva_re,
                custbody_ec_ren_re,
                custbody_ec_tip_compensaciones,
                custbody_ec_mon_comp,
                custbody_ec_tip_emi,
                custbody_ec_ncomprobantes,
                custbody_ht_os_companiaseguros,
                custbody_ht_os_concesionario,
                custbody_ht_os_bancofinanciera,
                custbodyec_nota_cliente,
                terms,
                initialtranid,
            };
        }

        header() {
            return Object.entries(this.fields)
                .filter(([_, value]) => value != null && value.length > 0)
                .map(([key, value]) => ({ field: key, value }));
        }
    }

    class Detail {
        constructor(
            item,
            price,
            taxcode,
            taxrate1,
            quantity,
            department,
            clase,
            location,
            units,
            description,
            rate,
            grossamt,
            amount,
            tax1amt,
            customer,
            customermon,
            codorigen,
            dispcustodia,
            transmission,
            undcoverage
        ) {
            this.fields = {
                item,
                price,
                taxcode,
                taxrate1,
                quantity,
                department,
                clase,
                location,
                units,
                description,
                rate,
                grossamt: Number.parseFloat(grossamt).toFixed(2),
                amount: parseFloat(rate) * parseFloat(quantity),
                tax1amt,
                customer,
                customermon,
                codorigen,
                dispcustodia,
                transmission,
                undcoverage,
            };
        }

        detail() {
            return Object.entries(this.fields)
                .filter(([_, value]) => value != null && value.length > 0)
                .map(([key, value]) => ({ field: key, value }));
        }
    }

    // Funciones de Facturación. (Create Invoice)
    const createInvoice = (requestHeader, requestDetail) => {

        // log.debug("requestHeader", requestHeader);
        // log.debug("requestDetail", requestDetail);

        let objRecord = record.create({
            type: record.Type.INVOICE,
            isDynamic: true,
        });

        // Set header values
        requestHeader.forEach((header) => {
            objRecord.setValue({ fieldId: header.field, value: header.value });
        });

        // Set detail values
        requestDetail.forEach((detail) => {
            objRecord.selectNewLine({ sublistId: "item" });
            detail.forEach((item) => {
                // log.debug("Detail", `${item.field} - ${item.value}`);
                objRecord.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: item.field,
                    value: item.value,
                    ignoreFieldChange: false,
                });
            });
            objRecord.commitLine({ sublistId: "item" });
        });

        // Save record and return response
        let response = objRecord.save({ ignoreMandatoryFields: true });
        return response;
    };

    return {
        post: _post,
    };
});


