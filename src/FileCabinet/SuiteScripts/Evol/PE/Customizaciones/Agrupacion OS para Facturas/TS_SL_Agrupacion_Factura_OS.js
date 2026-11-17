/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    "N/ui/serverWidget",
    "N/record",
    "N/log",
    "N/search",
    "N/task",
    "N/runtime",
    "N/redirect",
    "N/file"
], (serverWidget, record, log, search, task, runtime, redirect, file) => {
    const INPUT_FOLDER = 18054;
    const RECORD_COLA = "customrecord_ts_standar_ss_cola_pe";
    const SUBSIDIARY_ID = "3";
    const DEFAULT_LOCATION_ID = "416";
    const SUITELET_SCRIPT_ID = "customscript__ts_sl_agrup_factura_os_pe";
    const SUITELET_DEPLOYMENT_ID = "customdeploy_ts_sl_agrup_factura_os_pe";
    const STATUS_SUITELET_ID = 5900;
    const STATUS_DEPLOYMENT_ID = 1;

    const AR_ACCOUNT_BY_CURRENCY = {
        "1": "4897",
        "5": "4896"
    };

    const onRequest = (scriptContext) => {
        try {
            if (scriptContext.request.method === "POST") {
                handlePost(scriptContext);
                return;
            }

            renderForm(scriptContext);
        } catch (e) {
            log.error("onRequest", e);
            scriptContext.response.write(`Error: ${e.message || e}`);
        }
    };

    const renderForm = (scriptContext) => {
        const request = scriptContext.request;
        const params = parseContextParams(request.parameters.custscript_ts_context);

        const form = serverWidget.createForm({
            title: "Agrupacion de Facturas para Factura Directa"
        });

        form.clientScriptModulePath = "./TS_CS_Agrupacion_Factura_OS.js";
        form.enctype = "multipart/form-data";

        form.addSubmitButton({ label: "Crear Factura Directa" });
        form.addButton({
            id: "custpage_btn_calcular_importe",
            label: "Calcular Importe",
            functionName: "calcularImporte"
        });

        form.addFieldGroup({
            id: "seccion_busqueda",
            label: "Busqueda de Facturas Internas"
        });

        const cliente = form.addField({
            id: "cliente",
            type: serverWidget.FieldType.SELECT,
            source: "customer",
            label: "Cliente",
            container: "seccion_busqueda"
        });

        const fechaInicio = form.addField({
            id: "fecha_inicio",
            type: serverWidget.FieldType.DATE,
            label: "Fecha de Inicio",
            container: "seccion_busqueda"
        });
        fechaInicio.isMandatory = true;

        const fechaFin = form.addField({
            id: "fecha_fin",
            type: serverWidget.FieldType.DATE,
            label: "Fecha de Fin",
            container: "seccion_busqueda"
        });
        fechaFin.isMandatory = true;

        const currency = form.addField({
            id: "currency",
            type: serverWidget.FieldType.SELECT,
            source: "currency",
            label: "Moneda",
            container: "seccion_busqueda"
        });
        currency.isMandatory = true;

        const tipoDoc = form.addField({
            id: "tipo_doc",
            type: serverWidget.FieldType.SELECT,
            source: "customrecord_pe_fiscal_document_type",
            label: "PE Tipo de Documento",
            container: "seccion_busqueda"
        });
        tipoDoc.isMandatory = true;

        const tipoOS = form.addField({
            id: "tipo_os",
            type: serverWidget.FieldType.SELECT,
            label: "Tipo de Orden de Servicio",
            container: "seccion_busqueda"
        });
        tipoOS.addSelectOption({ value: "1", text: "Total" });
        tipoOS.addSelectOption({ value: "2", text: "Linea" });
        tipoOS.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

        const account = form.addField({
            id: "account",
            type: serverWidget.FieldType.SELECT,
            label: "Cuenta AR",
            container: "seccion_busqueda"
        });
        account.isMandatory = true;
        account.addSelectOption({ value: "", text: "" });

        addSelectOptionsFromSearch(account, {
            type: "account",
            filters: [["type", "anyof", "AcctRec"]],
            columns: [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "displayname" })
            ],
            value: "internalid",
            text: "displayname"
        });

        const agrupador = form.addField({
            id: "agrupador",
            type: serverWidget.FieldType.TEXT,
            label: "Agrupador",
            container: "seccion_busqueda"
        });

        const referencia = form.addField({
            id: "referencia",
            type: serverWidget.FieldType.TEXT,
            label: "Referencia",
            container: "seccion_busqueda"
        });

        const glosa = form.addField({
            id: "glosa",
            type: serverWidget.FieldType.TEXT,
            label: "Glosa",
            container: "seccion_busqueda"
        });
        glosa.maxLength = 1000;

        const facturarA = form.addField({
            id: "facturara",
            type: serverWidget.FieldType.SELECT,
            source: "customer",
            label: "Facturar A",
            container: "seccion_busqueda"
        });

        const articulo = form.addField({
            id: "articulo",
            type: serverWidget.FieldType.SELECT,
            source: "item",
            label: "Articulo",
            container: "seccion_busqueda"
        });

        const notaFactura = form.addField({
            id: "nota_factura",
            type: serverWidget.FieldType.LONGTEXT,
            label: "Nota de Factura",
            container: "seccion_busqueda"
        });

        const importeTotal = form.addField({
            id: "importe_total",
            type: serverWidget.FieldType.CURRENCY,
            label: "Base imponible",
            container: "seccion_busqueda"
        });
        importeTotal.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

        const igv = form.addField({
            id: "igv",
            type: serverWidget.FieldType.CURRENCY,
            label: "IGV",
            container: "seccion_busqueda"
        });
        igv.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

        const totalBody = form.addField({
            id: "totalbody",
            type: serverWidget.FieldType.CURRENCY,
            label: "Total",
            container: "seccion_busqueda"
        });
        totalBody.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

        const totalRegistros = form.addField({
            id: "total_registros",
            type: serverWidget.FieldType.INTEGER,
            label: "Total de registros",
            container: "seccion_busqueda"
        });
        totalRegistros.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

        const totalSeleccionados = form.addField({
            id: "total_seleccionados",
            type: serverWidget.FieldType.INTEGER,
            label: "Seleccionados",
            container: "seccion_busqueda"
        });
        totalSeleccionados.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

        const currencyId = params.currency ? String(params.currency) : "";
        const accountDefault = params.account
            ? String(params.account)
            : getDefaultArAccount(currencyId);

        setFieldDefault(cliente, params.cliente);
        setFieldDefault(fechaInicio, params.fechaInicio, parseDateForField);
        setFieldDefault(fechaFin, params.fechaFin, parseDateForField);
        setFieldDefault(tipoOS, params.tipoOS || "1");
        setFieldDefault(currency, currencyId);
        setFieldDefault(account, accountDefault);
        setFieldDefault(agrupador, params.agrupador);
        setFieldDefault(glosa, params.glosa);
        setFieldDefault(referencia, params.referencia);
        setFieldDefault(facturarA, params.facturara);
        setFieldDefault(articulo, params.articulo);
        setFieldDefault(notaFactura, params.nota_factura);
        setFieldDefault(tipoDoc, params.tipo_doc);
        totalRegistros.defaultValue = "0";
        totalSeleccionados.defaultValue = "0";

        if (params.flag === "searchFacturaFin") {
            const csvFileField = form.addField({
                id: "custpage_csv_fin",
                type: serverWidget.FieldType.FILE,
                label: "Cargar CSV de facturas internas"
            });
            csvFileField.setHelpText({
                help: "El CSV debe contener una columna llamada 'Id interno', 'Internal ID' o similar. Si no tiene cabecera, se usara la primera columna."
            });

            form.addFieldGroup({
                id: "seccion_localizacion",
                label: "PE Localizacion"
            });

            const ubicacion = form.addField({
                id: "ubicacion",
                type: serverWidget.FieldType.SELECT,
                label: "Oficina",
                container: "seccion_localizacion"
            });
            ubicacion.isMandatory = true;
            ubicacion.addSelectOption({ value: "", text: "" });

            const serie = form.addField({
                id: "serie",
                type: serverWidget.FieldType.SELECT,
                label: "Serie",
                container: "seccion_localizacion"
            });

            const formaPago = form.addField({
                id: "forma_pago",
                type: serverWidget.FieldType.SELECT,
                source: "customlist_pe_fel_forma_pago",
                label: "PE EI Forma de Pago",
                container: "seccion_localizacion"
            });
            formaPago.isMandatory = true;

            const tipoOperacion = form.addField({
                id: "tipo_operacion",
                type: serverWidget.FieldType.SELECT,
                source: "customrecord_pe_tipo_facturacion",
                label: "PE EI Tipo de Operacion",
                container: "seccion_localizacion"
            });
            tipoOperacion.isMandatory = true;

            const conceptDetraction = form.addField({
                id: "concept_detraction",
                type: serverWidget.FieldType.SELECT,
                source: "customrecord_pe_concept_detraction",
                label: "PE Concept Detraction",
                container: "seccion_localizacion"
            });
            conceptDetraction.isMandatory = true;

            const terminoPago = form.addField({
                id: "termino_pago",
                type: serverWidget.FieldType.SELECT,
                source: "term",
                label: "Termino de Pago",
                container: "seccion_localizacion"
            });
            terminoPago.isMandatory = true;

            const gratutita = form.addField({
                id: "gratutita",
                type: serverWidget.FieldType.CHECKBOX,
                label: "PE Transferencia gratuita",
                container: "seccion_localizacion"
            });

            addSelectOptionsFromSearch(ubicacion, {
                type: "location",
                filters: [["subsidiary", "anyof", SUBSIDIARY_ID]],
                columns: ["internalid", "name"],
                value: "internalid",
                text: "name"
            });

            const ubicacionDefault =
                params.ubicacion && String(params.ubicacion).trim() !== ""
                    ? String(params.ubicacion)
                    : DEFAULT_LOCATION_ID;

            if (ubicacionDefault && params.tipo_doc) {
                addSelectOptionsFromSearch(serie, {
                    type: "customrecord_pe_serie",
                    filters: [
                        ["custrecord_pe_location", "anyof", ubicacionDefault],
                        "AND",
                        ["custrecord_pe_tipo_documento_serie", "anyof", params.tipo_doc],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "custrecord_pe_serie_impresion" })
                    ],
                    value: "internalid",
                    text: "custrecord_pe_serie_impresion"
                });
            }

            const facturasFIN = getFacturasFIN(
                params.cliente,
                params.fechaInicio,
                params.fechaFin,
                params.tipoOS || "1",
                params.agrupador || "",
                "GET",
                params.currency,
                params.facturara,
                params.articulo,
                params.tipo_doc
            );

            const terminoPagoDefault =
                params.termino_pago && String(params.termino_pago).trim() !== ""
                    ? String(params.termino_pago)
                    : facturasFIN.length > 0 && facturasFIN[0].terms_id
                        ? String(facturasFIN[0].terms_id)
                        : "";

            const formaPagoDefault = terminoPagoDefault
                ? String(terminoPagoDefault) === "4" ? "1" : "2"
                : params.forma_pago && String(params.forma_pago).trim() !== ""
                    ? String(params.forma_pago)
                    : "";

            setFieldDefault(ubicacion, ubicacionDefault);
            setFieldDefault(serie, params.serie);
            setFieldDefault(formaPago, formaPagoDefault);
            setFieldDefault(tipoOperacion, params.tipo_operacion);
            setFieldDefault(conceptDetraction, params.concept_detraction);
            setFieldDefault(terminoPago, terminoPagoDefault);
            gratutita.defaultValue = params.gratutita ? String(params.gratutita) : "F";

            importeTotal.defaultValue = "0.00";
            igv.defaultValue = "0.00";
            totalBody.defaultValue = "0.00";
            totalRegistros.defaultValue = String(facturasFIN.length);
            totalSeleccionados.defaultValue = "0";

            form.addFieldGroup({
                id: "seccion_resultados",
                label: "Resultados de la Busqueda"
            });

            const sublista = form.addSublist({
                id: "sublista",
                type: serverWidget.SublistType.LIST,
                label: "Facturas Internas"
            });

            sublista.addMarkAllButtons();
            sublista.addField({ id: "check", type: serverWidget.FieldType.CHECKBOX, label: "Seleccionar" });
            sublista.addField({ id: "id", type: serverWidget.FieldType.TEXT, label: "ID" });
            sublista.addField({ id: "numero", type: serverWidget.FieldType.TEXT, label: "Numero" });
            sublista.addField({ id: "agrupador", type: serverWidget.FieldType.TEXT, label: "Agrupador" });
            sublista.addField({ id: "orden_servicio", type: serverWidget.FieldType.TEXT, label: "Orden de Servicio" });
            sublista.addField({ id: "placa", type: serverWidget.FieldType.TEXT, label: "Placa" });
            sublista.addField({ id: "orden_itemsname", type: serverWidget.FieldType.TEXT, label: "Items" });
            sublista.addField({ id: "terminos", type: serverWidget.FieldType.TEXT, label: "Terminos" });
            sublista.addField({ id: "nro_cuota", type: serverWidget.FieldType.TEXT, label: "Numero de Cuota" });
            sublista.addField({ id: "fecha", type: serverWidget.FieldType.TEXT, label: "Fecha" });
            sublista.addField({ id: "cliente", type: serverWidget.FieldType.TEXT, label: "Cliente" });
            sublista.addField({ id: "facturar", type: serverWidget.FieldType.TEXT, label: "Facturar A" });
            sublista.addField({ id: "pe_nota", type: serverWidget.FieldType.TEXT, label: "PE Nota" });
            sublista.addField({ id: "moneda", type: serverWidget.FieldType.TEXT, label: "Moneda" });
            sublista.addField({ id: "monto", type: serverWidget.FieldType.TEXT, label: "Base imponible" });
            sublista.addField({ id: "impuestos", type: serverWidget.FieldType.TEXT, label: "Impuestos" });
            sublista.addField({ id: "totalline", type: serverWidget.FieldType.TEXT, label: "Total" });
            const lineUniqueKeyField = sublista.addField({
                id: "lineuniquekey",
                type: serverWidget.FieldType.TEXT,
                label: "Llave Linea"
            });
            lineUniqueKeyField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

            for (let i = 0; i < facturasFIN.length; i++) {
                const factura = facturasFIN[i];
                const monto = parseNumber(factura.monto);
                const impuestosLinea = monto * 0.18;
                const totalLinea = impuestosLinea + monto;

                sublista.setSublistValue({ id: "check", line: i, value: "F" });
                safeSetSublistValue(sublista, "id", i, factura.id);
                safeSetSublistValue(sublista, "numero", i, factura.numero);
                safeSetSublistValue(sublista, "agrupador", i, factura.memo);
                safeSetSublistValue(sublista, "orden_servicio", i, factura.creado_desde_text);
                safeSetSublistValue(sublista, "placa", i, factura.placa);
                safeSetSublistValue(sublista, "orden_itemsname", i, factura.itemsName);
                safeSetSublistValue(sublista, "terminos", i, factura.terminos);
                safeSetSublistValue(sublista, "nro_cuota", i, factura.nro_cuota);
                safeSetSublistValue(sublista, "fecha", i, factura.fecha);
                safeSetSublistValue(sublista, "cliente", i, factura.cliente);
                safeSetSublistValue(sublista, "facturar", i, factura.facturar_a);
                safeSetSublistValue(sublista, "pe_nota", i, factura.pe_nota);
                safeSetSublistValue(sublista, "moneda", i, factura.currencyName);
                safeSetSublistValue(sublista, "monto", i, factura.monto || "0");
                safeSetSublistValue(sublista, "lineuniquekey", i, factura.lineuniquekey);

                sublista.setSublistValue({ id: "impuestos", line: i, value: impuestosLinea.toFixed(2) });
                sublista.setSublistValue({ id: "totalline", line: i, value: totalLinea.toFixed(2) });
            }
        }

        scriptContext.response.writePage(form);
    };

    const handlePost = (scriptContext) => {
        const request = scriptContext.request;

        try {
            const cliente = request.parameters.cliente || "";
            const fechaInicio = request.parameters.fecha_inicio || "";
            const tipoOS = request.parameters.tipo_os || "1";
            const fechaFin = request.parameters.fecha_fin || "";
            const currency = request.parameters.currency || "";
            const account = request.parameters.account || "";
            const agrupador = request.parameters.agrupador || "";
            const terminoPago = request.parameters.termino_pago || "";
            const glosa = request.parameters.glosa || "";
            const referencia = request.parameters.referencia || "";
            const facturara = request.parameters.facturara || "";
            const articulo = request.parameters.articulo || "";
            const ubicacion = request.parameters.ubicacion || "";
            const serie = request.parameters.serie || "";
            const notaFactura = request.parameters.nota_factura || "";
            const tipoDoc = request.parameters.tipo_doc || "";
            const formaPago = request.parameters.forma_pago || "";
            const tipoOperacion = request.parameters.tipo_operacion || "";
            const conceptDetraction = request.parameters.concept_detraction || "";
            const gratutita = request.parameters.gratutita || "F";

            const lineCount = request.getLineCount({ group: "sublista" }) || 0;
            const selectedRows = [];
            let selectedWithoutLineKey = 0;

            for (let i = 0; i < lineCount; i++) {
                const checked = request.getSublistValue({
                    group: "sublista",
                    name: "check",
                    line: i
                });

                if (checked !== "T") continue;

                const invoiceId = request.getSublistValue({
                    group: "sublista",
                    name: "id",
                    line: i
                });
                const lineUniqueKey = request.getSublistValue({
                    group: "sublista",
                    name: "lineuniquekey",
                    line: i
                });

                if (invoiceId && lineUniqueKey) {
                    selectedRows.push({
                        id: String(invoiceId),
                        lineuniquekey: String(lineUniqueKey)
                    });
                } else if (invoiceId) {
                    selectedWithoutLineKey++;
                }
            }

            if (selectedWithoutLineKey) {
                throw new Error("No se recibieron identificadores de linea para una o mas FIN seleccionadas.");
            }

            if (!selectedRows.length) {
                redirect.toSuitelet({
                    scriptId: SUITELET_SCRIPT_ID,
                    deploymentId: SUITELET_DEPLOYMENT_ID
                });
                return;
            }

            const selectedIds = new Set(selectedRows.map((row) => row.id));
            const selectedLineKeys = new Set(selectedRows.map((row) => row.lineuniquekey));
            const selectedIdList = Array.from(selectedIds);
            const selectedLineKeyList = Array.from(selectedLineKeys);

            const facturas = getSelectedFacturasLineasFIN(selectedIdList, selectedLineKeyList);

            if (!facturas.length) {
                throw new Error("No se encontraron lineas FIN seleccionadas para procesar.");
            }

            const datosFacturasSeleccionas = buildFacturasSeleccionadasFromLines(facturas);
            const primeraFactura = datosFacturasSeleccionas.length > 0 ? datosFacturasSeleccionas[0] : null;
            const ejecutivaBackoffice =
                primeraFactura && primeraFactura.ejecutiva_backoffice
                    ? primeraFactura.ejecutiva_backoffice
                    : "";

            const gruposMap = {};

            facturas.forEach((entry) => {
                const claveGrupo = String(entry.custbody_ht_facturar_a || "");
                let grupo = gruposMap[claveGrupo];

                if (!grupo) {
                    grupo = {
                        facturar_a: entry.custbody_ht_facturar_a,
                        bien: entry.bien,
                        aseguradora: entry.aseguradora,
                        concesionario: entry.concesionario,
                        financiera: entry.financiera,
                        ejecutiva_backoffice: ejecutivaBackoffice,
                        items: [],
                        _itemsMap: {}
                    };
                    gruposMap[claveGrupo] = grupo;
                }

                const item = {
                    id: entry.item,
                    item_f: entry.item_f,
                    nombre: entry.nombreItem,
                    unidad: entry.unidad,
                    cantidad: parseNumber(entry.cantidad),
                    price: entry.price,
                    rate: entry.rate,
                    departamento: entry.departamento,
                    clase: entry.clase,
                    oficina: entry.oficina,
                    sourceLines: [{
                        facturaInternaId: String(entry.id),
                        lineuniquekey: String(entry.lineuniquekey)
                    }]
                };

                const itemKey = [
                    item.id,
                    item.item_f,
                    item.unidad,
                    item.price,
                    item.rate,
                    item.departamento,
                    item.clase,
                    item.oficina
                ].join("|");

                const itemExistente = grupo._itemsMap[itemKey];

                if (itemExistente) {
                    itemExistente.cantidad += item.cantidad;
                    itemExistente.sourceLines = itemExistente.sourceLines.concat(item.sourceLines);
                } else {
                    grupo._itemsMap[itemKey] = item;
                    grupo.items.push(item);
                }
            });

            const facturaDirecta = Object.keys(gruposMap).map((key) => {
                const { _itemsMap, ...grupo } = gruposMap[key];
                return grupo;
            });

            const currentUser = runtime.getCurrentUser();

            const idLog = createCabLog({
                cliente: cliente,
                agrupador: agrupador,
                usuario: currentUser.id
            });

            const porcentajeDetraccion = getDetractionPercentage(conceptDetraction);
            const tsParams = {
                cliente: cliente,
                fechaInicio: fechaInicio,
                tipoOS: tipoOS,
                fechaFin: fechaFin,
                agrupador: agrupador,
                referencia: referencia,
                terminoPago: terminoPago,
                usuario: currentUser.id,
                id_log: idLog,
                glosa: glosa,
                ubicacion: ubicacion,
                serie: serie,
                account: account,
                notaFactura: notaFactura,
                facturasSeleccionadas: datosFacturasSeleccionas,
                facturaDirecta: facturaDirecta,
                tipo_doc: tipoDoc,
                forma_pago: formaPago,
                tipo_operacion: tipoOperacion,
                concept_detraction: conceptDetraction,
                percentage_detraction: porcentajeDetraccion,
                gratutita: gratutita,
                currency: currency,
                ejecutivaBackoffice: ejecutivaBackoffice
            };

            const recordColaId = agregarCola(tsParams);
            tsParams.queueId = String(recordColaId);
            const fileId = saveJson(tsParams, recordColaId, INPUT_FOLDER);

            record.submitFields({
                type: RECORD_COLA,
                id: recordColaId,
                values: { custrecord_ts_ss_parametros_pe: fileId }
            });

            try {
                const scriptTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: "customscript_ts_ss_agrupacion_factura_pe",
                    deploymentId: "customdeploy_ts_ss_agrupacion_factura_pe",
                    params: {
                        custscriptts_ss_agrup_fac_par_pe: JSON.stringify(tsParams),
                        custscript_ts_ss_agrup_fac_slect_fact_pe: "t"
                    }
                });
                scriptTask.submit();
            } catch (error) {
                log.error("handlePost task", error);
            }

            redirect.toSuitelet({
                scriptId: STATUS_SUITELET_ID,
                deploymentId: STATUS_DEPLOYMENT_ID
            });
        } catch (error) {
            log.error("handlePost", error);
            throw error;
        }
    };

    const parseContextParams = (rawContext) => {
        try {
            if (!rawContext) return { flag: "" };
            const parsed = JSON.parse(rawContext);
            return parsed || { flag: "" };
        } catch (e) {
            log.error("parseContextParams", e);
            return { flag: "" };
        }
    };

    const getDefaultArAccount = (currencyId) => {
        return AR_ACCOUNT_BY_CURRENCY[String(currencyId || "")] || "";
    };

    const pad2 = (value) => (Number(value) < 10 ? `0${Number(value)}` : String(value));

    const setFieldDefault = (field, value, transform) => {
        if (value === null || value === undefined || value === "") return;
        field.defaultValue = transform ? transform(value) : String(value);
    };

    const runPagedSearch = (searchObj, onResult) => {
        const pagedData = searchObj.runPaged({ pageSize: 1000 });

        for (let pageIndex = 0; pageIndex < pagedData.pageRanges.length; pageIndex++) {
            const currentPage = pagedData.fetch({ index: pageIndex });
            currentPage.data.forEach(onResult);
        }

        return pagedData.count;
    };

    const addSelectOptionsFromSearch = (field, config) => {
        search.create({
            type: config.type,
            filters: config.filters,
            columns: config.columns
        })
            .run()
            .each((result) => {
                field.addSelectOption({
                    value: result.getValue(config.value),
                    text: result.getValue(config.text)
                });
                return true;
            });
    };

    const safeSetSublistValue = (sublist, id, line, value) => {
        if (value === null || value === undefined || value === "") return;

        sublist.setSublistValue({
            id,
            line,
            value: String(value)
        });
    };

    const chunkArray = (list = [], size = 1000) => {
        const chunks = [];

        for (let i = 0; i < list.length; i += size) {
            chunks.push(list.slice(i, i + size));
        }

        return chunks;
    };

    const buildItemDisplayFromSearch = (result) => {
        const itemText =
            result.getText({ name: "item" }) ||
            result.getValue({ name: "displayname", join: "item" }) ||
            result.getValue({ name: "itemid", join: "item" }) ||
            "";

        const descriptionText =
            result.getValue({ name: "memo" }) ||
            "";

        return `${itemText}${descriptionText ? ` ${descriptionText}` : ""}`.trim();
    };

    const buildFacturarADocTypeFilter = (tipodocValue) => {
        const prefixes = String(tipodocValue || "") === "50" ? ["6"] : ["1", "4", "7"];

        if (prefixes.length === 1) {
            return ["custbody_ht_facturar_a.custentity_pe_code_document_type", "startswith", prefixes[0]];
        }

        return prefixes.reduce((expression, prefix, index) => {
            const condition = ["custbody_ht_facturar_a.custentity_pe_code_document_type", "startswith", prefix];

            if (!index) return [condition];

            expression.push("OR", condition);
            return expression;
        }, []);
    };

    const buildFacturaFinFilters = ({
        cliente,
        fechaInicio,
        fechaFin,
        agrupador,
        currency,
        facturaa,
        articulo,
        tipodocValue,
        includeOnlyUngroupedLines,
        includeOnlyItemLines
    }) => {
        const filters = [
            ["type", "anyof", "CuTrSale112"],
            "AND",
            ["status", "noneof", "CuTrSale112:V"],
            "AND",
            ["trandate", "within", fechaInicio, fechaFin],
            "AND",
            ["currency", "anyof", currency],
            "AND",
            ["memomain", "isnot", "VOID"],
            "AND",
            ["item", "noneof", "@NONE@"],
            "AND",
            ["subsidiary", "anyof", SUBSIDIARY_ID],
            "AND",
            buildFacturarADocTypeFilter(tipodocValue)
        ];

        if (includeOnlyUngroupedLines) {
            filters.push("AND", ["amount", "notequalto", 0]);
            filters.push("AND", ["custcol_ht_fac_agru", "isempty", ""]);
        }

        if (includeOnlyItemLines) {
            filters.push("AND", ["taxline", "is", "F"]);
            filters.push("AND", ["item.type", "noneof", "TaxItem"]);
        }

        if (cliente) filters.push("AND", ["entity", "anyof", cliente]);
        if (agrupador) filters.push("AND", ["custbody_ht_cod_agru", "contains", agrupador]);
        if (facturaa) filters.push("AND", ["custbody_ht_facturar_a", "anyof", facturaa]);
        if (articulo) filters.push("AND", ["item", "anyof", articulo]);

        return filters;
    };

    const formatDateForSearch = (dateValue) => {
        if (!dateValue) return "";

        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            return `${pad2(dateValue.getDate())}/${pad2(dateValue.getMonth() + 1)}/${dateValue.getFullYear()}`;
        }

        const rawValue = String(dateValue).trim();
        const localDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (localDateMatch) {
            return `${pad2(localDateMatch[1])}/${pad2(localDateMatch[2])}/${localDateMatch[3]}`;
        }

        const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDateMatch) {
            return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
        }

        const date = new Date(rawValue);
        if (isNaN(date.getTime())) return "";
        return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
    };

    const parseDateForField = (dateValue) => {
        if (!dateValue) return "";

        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            return dateValue;
        }

        const rawValue = String(dateValue).trim();
        const localDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (localDateMatch) {
            return new Date(
                parseInt(localDateMatch[3], 10),
                parseInt(localDateMatch[2], 10) - 1,
                parseInt(localDateMatch[1], 10)
            );
        }

        const isoDateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDateMatch) {
            return new Date(
                parseInt(isoDateMatch[1], 10),
                parseInt(isoDateMatch[2], 10) - 1,
                parseInt(isoDateMatch[3], 10)
            );
        }

        const date = new Date(rawValue);
        return isNaN(date.getTime()) ? "" : date;
    };

    const getBienesData = (bienIds = []) => {
        try {
            const respuesta = {};
            const ids = [...new Set((bienIds || []).filter(Boolean).map(String))];
            if (!ids.length) return respuesta;

            chunkArray(ids, 1000).forEach((chunk) => {
                search.create({
                    type: "customrecord_ht_record_bienes",
                    filters: [["internalid", "anyof", chunk]],
                    columns: [
                        search.createColumn({ name: "internalid" }),
                        search.createColumn({ name: "custrecord_ht_bien_placa" })
                    ]
                })
                    .run()
                    .each((result) => {
                        const bienId = String(result.getValue({ name: "internalid" }));
                        respuesta[bienId] = {
                            placa: result.getValue({ name: "custrecord_ht_bien_placa" }) || ""
                        };
                        return true;
                    });
            });

            return respuesta;
        } catch (e) {
            log.error("getBienesData", e);
            return {};
        }
    };

    const getFacturasFIN = (cliente, fechaInicio, fechaFin, tipoOS, agrupador, flag, currency, facturaa, articulo, tipodocValue, invoiceIds = [], selectedLineKeys = []) => {
        try {
            let respuesta = [];
            const selectedLineKeyMap = {};
            (selectedLineKeys || []).forEach((lineKey) => {
                selectedLineKeyMap[String(lineKey)] = true;
            });

            const newfechaInicio = flag === "GET" ? formatDateForSearch(fechaInicio) : fechaInicio;
            const newfechaFin = flag === "GET" ? formatDateForSearch(fechaFin) : fechaFin;

            const baseFilters = buildFacturaFinFilters({
                cliente,
                fechaInicio: newfechaInicio,
                fechaFin: newfechaFin,
                agrupador,
                currency,
                facturaa,
                articulo,
                tipodocValue,
                includeOnlyUngroupedLines: true,
                includeOnlyItemLines: false
            });

            const columns = [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "tranid" }),
                search.createColumn({ name: "trandate" }),
                search.createColumn({ name: "entity" }),
                search.createColumn({ name: "amount" }),
                search.createColumn({ name: "fxgrossamount" }),
                search.createColumn({ name: "approvalstatus" }),
                search.createColumn({ name: "custbody_ht_cod_agru" }),
                search.createColumn({ name: "custbody_ec_nro_cuota_fac_int" }),
                search.createColumn({ name: "custbody_ec_created_from_fac_int" }),
                search.createColumn({ name: "custbody_ht_facturar_a" }),
                search.createColumn({ name: "memomain" }),
                search.createColumn({ name: "memo" }),
                search.createColumn({ name: "item" }),
                search.createColumn({ name: "itemid", join: "item" }),
                search.createColumn({ name: "displayname", join: "item" }),
                search.createColumn({ name: "lineuniquekey" }),
                search.createColumn({ name: "symbol", join: "Currency", label: "Symbol" }),
                search.createColumn({ name: "custbody_ht_so_bien" }),
                search.createColumn({ name: "terms" }),
                search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice" })
            ];

            const searchChunks = invoiceIds.length ? chunkArray(invoiceIds, 1000) : [null];

            searchChunks.forEach((idChunk) => {
                const filters = idChunk
                    ? baseFilters.concat(["AND", ["internalid", "anyof", idChunk]])
                    : baseFilters;

                runPagedSearch(search.create({
                    type: "transaction",
                    filters,
                    columns
                }), (result) => {
                    const lineUniqueKey = String(result.getValue({ name: "lineuniquekey" }) || "");
                    if (selectedLineKeys && selectedLineKeys.length && !selectedLineKeyMap[lineUniqueKey]) {
                        return;
                    }

                    const bienId = result.getValue({ name: "custbody_ht_so_bien" });
                    const transId = String(result.getValue({ name: "internalid" }) || "");

                    respuesta.push({
                        id: transId,
                        numero: result.getValue({ name: "tranid" }),
                        fecha: result.getValue({ name: "trandate" }),
                        cliente: result.getText({ name: "entity" }),
                        monto: result.getValue({ name: "fxgrossamount" }),
                        estado: result.getText({ name: "approvalstatus" }),
                        memo: result.getValue({ name: "custbody_ht_cod_agru" }),
                        nro_cuota: result.getValue({ name: "custbody_ec_nro_cuota_fac_int" }),
                        creado_desde: result.getValue({ name: "custbody_ec_created_from_fac_int" }),
                        creado_desde_text: result.getText({ name: "custbody_ec_created_from_fac_int" }),
                        items: result.getValue({ name: "item" }),
                        itemsName: buildItemDisplayFromSearch(result),
                        currencyName: result.getValue({ name: "symbol", join: "Currency", label: "Symbol" }),
                        facturar_a: result.getText({ name: "custbody_ht_facturar_a" }),
                        pe_nota: result.getValue({ name: "memomain" }) || "",
                        facturar_id: result.getValue({ name: "custbody_ht_facturar_a" }),
                        bien_id: bienId || "",
                        placa: "",
                        terms_id: result.getValue({ name: "terms" }) || "",
                        terminos: result.getText({ name: "terms" }) || "",
                        ejecutiva_backoffice: result.getValue({ name: "custbody_ht_os_ejecutiva_backoffice" }) || "",
                        lineuniquekey: lineUniqueKey
                    });
                });
            });

            const bienIds = [...new Set(respuesta.map((r) => r.bien_id).filter(Boolean))];
            const bienesMap = getBienesData(bienIds);

            respuesta = respuesta.map((r) => ({
                ...r,
                placa: r.bien_id && bienesMap[String(r.bien_id)]
                    ? bienesMap[String(r.bien_id)].placa || ""
                    : ""
            }));

            return respuesta;
        } catch (e) {
            log.error("getFacturasFIN", e);
            return [];
        }
    };

    const getFacturasLineasFIN = (cliente, fechaInicio, fechaFin, tipoOS, agrupador, currency, facturaa, articulo, tipodocValue, invoiceIds = [], selectedLineKeys = []) => {
        try {
            const respuesta = [];
            const selectedLineKeyMap = {};
            (selectedLineKeys || []).forEach((lineKey) => {
                selectedLineKeyMap[String(lineKey)] = true;
            });

            const baseFilters = buildFacturaFinFilters({
                cliente,
                fechaInicio,
                fechaFin,
                agrupador,
                currency,
                facturaa,
                articulo,
                tipodocValue,
                includeOnlyUngroupedLines: false,
                includeOnlyItemLines: true
            });

            const columns = [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "tranid" }),
                search.createColumn({ name: "custbody_ht_so_bien" }),
                search.createColumn({ name: "department" }),
                search.createColumn({ name: "class" }),
                search.createColumn({ name: "location" }),
                search.createColumn({ name: "custbody_ht_facturar_a" }),
                search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                search.createColumn({ name: "custbody_ht_os_concesionario" }),
                search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                search.createColumn({ name: "item" }),
                search.createColumn({ name: "custitem_ec_item_agrupado", join: "item" }),
                search.createColumn({ name: "itemid", join: "item" }),
                search.createColumn({ name: "quantityuom" }),
                search.createColumn({ name: "unitid" }),
                search.createColumn({ name: "taxcode" }),
                search.createColumn({ name: "pricelevel" }),
                search.createColumn({ name: "displayname", join: "item" }),
                search.createColumn({ name: "rate" }),
                search.createColumn({ name: "fxrate" }),
                search.createColumn({ name: "lineuniquekey" })
            ];

            const runSearch = (filtersToRun) => {
                runPagedSearch(search.create({
                    type: "transaction",
                    filters: filtersToRun,
                    columns
                }), (result) => {
                    const lineUniqueKey = String(result.getValue({ name: "lineuniquekey" }) || "");
                    if (selectedLineKeys && selectedLineKeys.length && !selectedLineKeyMap[lineUniqueKey]) {
                        return;
                    }

                    respuesta.push({
                        id: result.getValue({ name: "internalid" }),
                        numero: result.getValue({ name: "tranid" }),
                        bien: result.getValue({ name: "custbody_ht_so_bien" }),
                        departamento: result.getValue({ name: "department" }),
                        clase: result.getValue({ name: "class" }),
                        oficina: result.getValue({ name: "location" }),
                        aseguradora: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                        concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                        financiera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                        item: result.getValue({ name: "item" }),
                        item_f: result.getValue({ name: "custitem_ec_item_agrupado", join: "item" }),
                        nombreItem: result.getValue({ name: "itemid", join: "item" }),
                        cantidad: result.getValue({ name: "quantityuom" }),
                        unidad: result.getValue({ name: "unitid" }),
                        taxcode: result.getValue({ name: "taxcode" }),
                        price: result.getValue({ name: "pricelevel" }),
                        rate: result.getValue({ name: "fxrate" }),
                        custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                        itemsName: result.getValue({ name: "displayname", join: "item" }),
                        lineuniquekey: lineUniqueKey
                    });
                });
            };

            if (invoiceIds && invoiceIds.length > 0) {
                chunkArray(invoiceIds, 1000).forEach((chunkIds) => {
                    const filtersWithIds = baseFilters.concat(["AND", ["internalid", "anyof", chunkIds]]);
                    runSearch(filtersWithIds);
                });
            } else {
                runSearch(baseFilters);
            }

            return respuesta;
        } catch (error) {
            log.error("getFacturasLineasFIN", error);
            return [];
        }
    };

    const getSelectedFacturasLineasFIN = (invoiceIds = [], selectedLineKeys = []) => {
        try {
            const respuesta = [];
            const selectedLineKeyMap = {};
            (selectedLineKeys || []).forEach((lineKey) => {
                selectedLineKeyMap[String(lineKey)] = true;
            });

            const columns = [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "tranid" }),
                search.createColumn({ name: "custbody_ht_so_bien" }),
                search.createColumn({ name: "department" }),
                search.createColumn({ name: "class" }),
                search.createColumn({ name: "location" }),
                search.createColumn({ name: "custbody_ht_facturar_a" }),
                search.createColumn({ name: "custbody_ht_os_companiaseguros" }),
                search.createColumn({ name: "custbody_ht_os_concesionario" }),
                search.createColumn({ name: "custbody_ht_os_bancofinanciera" }),
                search.createColumn({ name: "custbody_ec_nro_cuota_fac_int" }),
                search.createColumn({ name: "custbody_ec_created_from_fac_int" }),
                search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice" }),
                search.createColumn({ name: "memomain" }),
                search.createColumn({ name: "item" }),
                search.createColumn({ name: "custitem_ec_item_agrupado", join: "item" }),
                search.createColumn({ name: "itemid", join: "item" }),
                search.createColumn({ name: "quantityuom" }),
                search.createColumn({ name: "unitid" }),
                search.createColumn({ name: "taxcode" }),
                search.createColumn({ name: "pricelevel" }),
                search.createColumn({ name: "displayname", join: "item" }),
                search.createColumn({ name: "memo" }),
                search.createColumn({ name: "rate" }),
                search.createColumn({ name: "fxrate" }),
                search.createColumn({ name: "lineuniquekey" }),
                search.createColumn({ name: "symbol", join: "Currency", label: "Symbol" })
            ];

            chunkArray(invoiceIds, 1000).forEach((chunkIds) => {
                const selectedSearch = search.create({
                    type: "transaction",
                    filters: [
                        ["type", "anyof", "CuTrSale112"],
                        "AND",
                        ["internalid", "anyof", chunkIds],
                        "AND",
                        ["item", "noneof", "@NONE@"],
                        "AND",
                        ["taxline", "is", "F"]
                    ],
                    columns
                });

                selectedSearch.run().each((result) => {
                    const lineUniqueKey = String(result.getValue({ name: "lineuniquekey" }) || "");
                    if (selectedLineKeys && selectedLineKeys.length && !selectedLineKeyMap[lineUniqueKey]) {
                        return true;
                    }

                    respuesta.push({
                        id: result.getValue({ name: "internalid" }),
                        numero: result.getValue({ name: "tranid" }),
                        bien: result.getValue({ name: "custbody_ht_so_bien" }),
                        departamento: result.getValue({ name: "department" }),
                        clase: result.getValue({ name: "class" }),
                        oficina: result.getValue({ name: "location" }),
                        aseguradora: result.getValue({ name: "custbody_ht_os_companiaseguros" }),
                        concesionario: result.getValue({ name: "custbody_ht_os_concesionario" }),
                        financiera: result.getValue({ name: "custbody_ht_os_bancofinanciera" }),
                        nro_cuota: result.getValue({ name: "custbody_ec_nro_cuota_fac_int" }),
                        creado_desde: result.getValue({ name: "custbody_ec_created_from_fac_int" }),
                        item: result.getValue({ name: "item" }),
                        item_f: result.getValue({ name: "custitem_ec_item_agrupado", join: "item" }),
                        nombreItem: result.getValue({ name: "itemid", join: "item" }),
                        cantidad: result.getValue({ name: "quantityuom" }),
                        unidad: result.getValue({ name: "unitid" }),
                        taxcode: result.getValue({ name: "taxcode" }),
                        price: result.getValue({ name: "pricelevel" }),
                        rate: result.getValue({ name: "fxrate" }),
                        custbody_ht_facturar_a: result.getValue({ name: "custbody_ht_facturar_a" }),
                        facturar_a_text: result.getText({ name: "custbody_ht_facturar_a" }),
                        itemsName: buildItemDisplayFromSearch(result),
                        pe_nota: result.getValue({ name: "memomain" }) || "",
                        currencyName: result.getValue({ name: "symbol", join: "Currency", label: "Symbol" }),
                        ejecutiva_backoffice: result.getValue({ name: "custbody_ht_os_ejecutiva_backoffice" }) || "",
                        lineuniquekey: lineUniqueKey
                    });
                    return true;
                });
            });

            return respuesta;
        } catch (error) {
            log.error("getSelectedFacturasLineasFIN", error);
            return [];
        }
    };

    const buildFacturasSeleccionadasFromLines = (lineas = []) => {
        const byLine = {};

        (lineas || []).forEach((linea) => {
            const key = `${linea.id}|${linea.lineuniquekey}`;
            if (byLine[key]) {
                return;
            }

            byLine[key] = {
                id: String(linea.id || ""),
                nro_cuota: linea.nro_cuota || "",
                creado_desde: linea.creado_desde || "",
                items: linea.item || "",
                itemsName: linea.itemsName || "",
                currencyName: linea.currencyName || "",
                facturar_a: linea.facturar_a_text || "",
                pe_nota: linea.pe_nota || "",
                facturar_id: linea.custbody_ht_facturar_a || "",
                lineuniquekey: String(linea.lineuniquekey || ""),
                ejecutiva_backoffice: linea.ejecutiva_backoffice || ""
            };
        });

        return Object.keys(byLine).map((key) => byLine[key]);
    };

    const getDetractionPercentage = (conceptDetractionId) => {
        try {
            if (!conceptDetractionId) {
                return "0.0%";
            }

            const result = search.lookupFields({
                type: "customrecord_pe_concept_detraction",
                id: conceptDetractionId,
                columns: ["custrecord_pe_percentage_detraction"]
            });

            return result.custrecord_pe_percentage_detraction || "0.0%";
        } catch (error) {
            log.error("getDetractionPercentage", error);
            return "0.0%";
        }
    };

    const agregarCola = (params) => {
        try {
            const createCola = record.create({
                type: RECORD_COLA,
                isDynamic: true
            });
            createCola.setValue({ fieldId: "name", value: "Agrupacion Factura OS" });
            createCola.setValue({ fieldId: "custrecord_ts_ss_estado_pe", value: "pendiente" });
            createCola.setValue({ fieldId: "custrecord_ts_ss_creado_por_pe", value: params.usuario });
            createCola.setValue({ fieldId: "custrecord_ts_ss_fecha_inicio_pe", value: new Date() });
            return createCola.save();
        } catch (e) {
            log.error("agregarCola", e);
        }
    };

    const createCabLog = (params) => {
        try {
            const cabLog = record.create({
                type: "customrecord_ts_log_ejec_agrup_fact_pe",
                isDynamic: true
            });
            cabLog.setValue({ fieldId: "name", value: "Agrupacion de Facturas" });
            cabLog.setValue({ fieldId: "custrecord_ts_estado_pe", value: "pendiente" });
            cabLog.setValue({ fieldId: "custrecord_ts_porcentaje_pe", value: "0%" });
            cabLog.setValue({ fieldId: "custrecord_ts_cliente_pe", value: params.cliente });
            cabLog.setValue({ fieldId: "custrecord_ts_agrupador_pe", value: params.agrupador });
            cabLog.setValue({ fieldId: "custrecord_ts_fecha_inicio_pe", value: new Date() });

            if (params.usuario) {
                cabLog.setValue({ fieldId: "custrecord_ts_creado_por_pe", value: params.usuario });
            }

            cabLog.save();
            return cabLog.id;
        } catch (error) {
            log.error("createCabLog", error);
        }
    };

    const saveJson = (contents, nombre, folder) => {
        const fecha = sysDate();
        const fileObj = file.create({
            name: `lote${nombre}_${fecha}.json`,
            fileType: file.Type.JSON,
            contents: JSON.stringify(contents),
            folder: folder,
            isOnline: false
        });
        return fileObj.save();
    };

    const sysDate = () => {
        const date = new Date();
        const tdate = pad2(date.getDate());
        const month = pad2(date.getMonth() + 1);
        const year = date.getFullYear();
        return `${tdate}${month}${year}`;
    };

    const parseNumber = (value) => {
        const parsed = parseFloat(String(value == null ? "" : value).replace(/,/g, ""));
        return isNaN(parsed) ? 0 : parsed;
    };

    return { onRequest };
});
