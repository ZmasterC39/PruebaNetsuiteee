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
  "N/file",
  "N/url"
], (serverWidget, record, log, search, task, runtime, redirect, file, url) => {

  // === Config ===
  const INPUT_FOLDER_ID = 18054;
  const RECORD_COLA = "customrecord_ts_standar_ss_cola_maf_mov";
  const TIPO_GENERADOR_DEFAULT = "MAF";

  const COLA_PENDIENTE = "pendiente";

  // =========================
  // Entry
  // =========================
  const onRequest = (scriptContext) => {
    const request = scriptContext.request;
    const response = scriptContext.response;

    try {
      if (request.method === "POST") {
        handlePost(scriptContext);
        return;
      }

      const params = parseContextParams(request.parameters.custscript_ts_context);

      // 🔒 Forzar USD (siempre)
      const usdCurrencyId = getUsdCurrencyId();
      params.currency = usdCurrencyId; // lo sobreescribe siempre

      const tipoGenerador = TIPO_GENERADOR_DEFAULT;
      const form = buildForm({
        formTitle: `Agrupación de Facturas ${tipoGenerador} (USD)`,
        usdCurrencyId
      });

      setDefaults(form, params, usdCurrencyId);
      buildLocalizacionFields(form, params);

      if (params.flag === "searchFacturaFin") {
        fillSublistMAF(form, params, usdCurrencyId);
      } else {
        buildSublistMAF(form, { empty: true });
      }

      if (request.parameters.status === "submitted") {
        const msg = form.addField({
          id: "custpage_msg",
          type: serverWidget.FieldType.INLINEHTML,
          label: " "
        });
        const taskId = request.parameters.taskid || "";
        msg.defaultValue = `
          <div style="padding:10px;border:1px solid #3a87ad;background:#d9edf7;color:#31708f;border-radius:6px;">
            Proceso enviado a Map/Reduce. ${taskId ? ("Task ID: <b>" + taskId + "</b>") : ""}
          </div>`;
      }

      response.writePage(form);

    } catch (e) {
      log.error("Suitelet onRequest", e);
      response.write(`Error: ${e.message || e}`);
    }
  };

  // =========================
  // Form
  // =========================
  function buildForm({ formTitle, usdCurrencyId }) {
    const form = serverWidget.createForm({ title: formTitle });

    form.clientScriptModulePath = "./HT_PE_TS_CS_MAF_FACTURACION.js";

    form.addSubmitButton({ label: "Crear Factura Directa (MAF)" });
    form.addButton({
      id: "custpage_btn_calcular_importe",
      label: "Calcular Importe",
      functionName: "calcularImporte"
    });

    form.addFieldGroup({ id: "seccion_busqueda", label: "Búsqueda (MAF) - Montos en USD" });

    form.addField({
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

    // 🔒 Moneda fija USD
    const currency = form.addField({
      id: "currency",
      type: serverWidget.FieldType.SELECT,
      source: "currency",
      label: "Moneda (Fija)",
      container: "seccion_busqueda"
    });
    currency.isMandatory = true;
    currency.defaultValue = String(usdCurrencyId || "");
    currency.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    // UI helper
    const usdTag = form.addField({
      id: "custpage_usd_tag",
      type: serverWidget.FieldType.INLINEHTML,
      label: " "
    });
    usdTag.defaultValue = `<div style="margin-top:6px;color:#555;"><b>Nota:</b> Los totales se calculan y muestran en <b>USD</b>.</div>`;

    const tipo_doc = form.addField({
      id: "tipo_doc",
      type: serverWidget.FieldType.SELECT,
      source: "customrecord_pe_fiscal_document_type",
      label: "PE Tipo de Documento",
      container: "seccion_busqueda"
    });
    tipo_doc.isMandatory = true;

    const account = form.addField({
      id: "account",
      type: serverWidget.FieldType.SELECT,
      label: "Cuenta AR",
      container: "seccion_busqueda"
    });
    account.isMandatory = true;
    populateARAccounts(account);

    const tipo_generado = form.addField({
      id: "tipo_generado",
      type: serverWidget.FieldType.TEXT,
      label: "tipo_generado",
      container: "seccion_busqueda"
    });
    tipo_generado.defaultValue = TIPO_GENERADOR_DEFAULT;
    tipo_generado.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const agrupador = form.addField({
      id: "agrupador",
      type: serverWidget.FieldType.TEXT,
      label: "Agrupador",
      container: "seccion_busqueda"
    });
    agrupador.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const referencia = form.addField({
      id: "referencia",
      type: serverWidget.FieldType.TEXT,
      label: "Referencia",
      container: "seccion_busqueda"
    });
    referencia.isMandatory = true;

    const glosa = form.addField({
      id: "glosa",
      type: serverWidget.FieldType.TEXT,
      label: "Glosa",
      container: "seccion_busqueda"
    });
    glosa.isMandatory = true;

    form.addField({
      id: "nota_factura",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Nota de Factura",
      container: "seccion_busqueda"
    });

    // Totales (USD)
    const importeTotal = form.addField({
      id: "importe_total",
      type: serverWidget.FieldType.CURRENCY,
      label: "Base imponible (USD)",
      container: "seccion_busqueda"
    });
    importeTotal.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    const igv = form.addField({
      id: "igv",
      type: serverWidget.FieldType.CURRENCY,
      label: "IGV (USD)",
      container: "seccion_busqueda"
    });
    igv.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    const totalbody = form.addField({
      id: "totalbody",
      type: serverWidget.FieldType.CURRENCY,
      label: "Total (USD)",
      container: "seccion_busqueda"
    });
    totalbody.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    form.addField({
      id: "custpage_csv_file",
      type: serverWidget.FieldType.FILE,
      label: "Importar CSV"
    });

    // Resultados
    form.addFieldGroup({ id: "seccion_resultados", label: "Resultados" });

    const totalLines = form.addField({
      id: "custpage_count_total",
      type: serverWidget.FieldType.INTEGER,
      label: "Total líneas",
      container: "seccion_resultados"
    });
    totalLines.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    const selectedLines = form.addField({
      id: "custpage_count_selected",
      type: serverWidget.FieldType.INTEGER,
      label: "Seleccionadas",
      container: "seccion_resultados"
    });
    selectedLines.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

    return form;
  }

  // =========================
  // Localización + Series
  // =========================
  function buildLocalizacionFields(form, params) {
    const seccionlocalizacion = form.addFieldGroup({
      id: "seccion_localizacion",
      label: "PE Localización (MAF)"
    });

    const ubicacion = form.addField({
      id: "ubicacion",
      type: serverWidget.FieldType.SELECT,
      label: "Oficina",
      container: "seccion_localizacion"
    });
    ubicacion.isMandatory = true;
    ubicacion.addSelectOption({ value: "", text: "" });
    populateLocations(ubicacion);

    const serie = form.addField({
      id: "serie",
      type: serverWidget.FieldType.SELECT,
      label: "Serie",
      container: "seccion_localizacion"
    });
    serie.isMandatory = true;
    serie.addSelectOption({ value: "", text: "" });

    const forma_pago = form.addField({
      id: "forma_pago",
      type: serverWidget.FieldType.SELECT,
      source: "customlist_pe_fel_forma_pago",
      label: "PE EI Forma de Pago",
      container: "seccion_localizacion"
    });
    forma_pago.isMandatory = true;

    const tipo_operacion = form.addField({
      id: "tipo_operacion",
      type: serverWidget.FieldType.SELECT,
      source: "customrecord_pe_tipo_facturacion",
      label: "PE EI Tipo de Operación",
      container: "seccion_localizacion"
    });
    tipo_operacion.isMandatory = true;
    tipo_operacion.defaultValue = params.tipo_operacion || "";

    const concept_detraction = form.addField({
      id: "concept_detraction",
      type: serverWidget.FieldType.SELECT,
      source: "customrecord_pe_concept_detraction",
      label: "PE Concept Detraction",
      container: "seccion_localizacion"
    });
    concept_detraction.isMandatory = true;

    const terminoPago = form.addField({
      id: "termino_pago",
      type: serverWidget.FieldType.SELECT,
      source: "term",
      label: "Término de Pago",
      container: "seccion_localizacion"
    });
    terminoPago.isMandatory = true;

    const gratutita = form.addField({
      id: "gratutita",
      type: serverWidget.FieldType.CHECKBOX,
      label: "PE Transferencia gratuita",
      container: "seccion_localizacion"
    });

    // defaults
    ubicacion.defaultValue = params.ubicacion || "";
    forma_pago.defaultValue = params.forma_pago || "";
    concept_detraction.defaultValue = params.concept_detraction || "";
    terminoPago.defaultValue = params.termino_pago || "";
    gratutita.defaultValue = params.gratutita || "F";

    if (params.ubicacion && params.tipo_doc) {
      populateSeries(serie, params.ubicacion, params.tipo_doc);
      serie.defaultValue = params.serie || "";
    } else {
      serie.defaultValue = params.serie || "";
    }
  }

  function populateLocations(field) {
    const s = search.create({
      type: "location",
      filters: [["subsidiary", "anyof", "3"]],
      columns: ["internalid", "name"]
    });

    s.run().each((r) => {
      field.addSelectOption({
        value: r.getValue({ name: "internalid" }),
        text: r.getValue({ name: "name" })
      });
      return true;
    });
  }

  function populateSeries(field, locationId, tipoDocId) {
    const s = search.create({
      type: "customrecord_pe_serie",
      filters: [
        ["custrecord_pe_location", "anyof", locationId],
        "AND",
        ["custrecord_pe_tipo_documento_serie", "anyof", tipoDocId],
        "AND",
        ["isinactive", "is", "F"]
      ],
      columns: [
        search.createColumn({ name: "internalid" }),
        search.createColumn({ name: "custrecord_pe_serie_impresion" })
      ]
    });

    s.run().each((r) => {
      field.addSelectOption({
        value: r.getValue({ name: "internalid" }),
        text: r.getValue({ name: "custrecord_pe_serie_impresion" })
      });
      return true;
    });
  }

  function populateARAccounts(accountField) {
    accountField.addSelectOption({ value: "", text: "" });

    const s = search.create({
      type: "account",
      filters: [["type", "anyof", "AcctRec"]],
      columns: [search.createColumn({ name: "displayname" })]
    });

    s.run().each((r) => {
      accountField.addSelectOption({
        value: r.id,
        text: r.getValue({ name: "displayname" }) || r.id
      });
      return true;
    });
  }

  // =========================
  // Sublista MAF
  // =========================
  function buildSublistMAF(form, opts = {}) {
    const sublista = form.addSublist({
      id: "sublista",
      type: serverWidget.SublistType.LIST,
      label: "Órdenes de Servicio (MAF) - USD"
    });

    sublista.addMarkAllButtons();
    sublista.addField({ id: "check", type: serverWidget.FieldType.CHECKBOX, label: "Seleccionar" });

    sublista.addField({ id: "id", type: serverWidget.FieldType.TEXT, label: "SO Internal ID" });
    sublista.addField({ id: "numero", type: serverWidget.FieldType.TEXT, label: "Número SO" });
    sublista.addField({ id: "fecha", type: serverWidget.FieldType.TEXT, label: "Fecha" });
    sublista.addField({ id: "cliente_txt", type: serverWidget.FieldType.TEXT, label: "Cliente" });
    sublista.addField({ id: "facturar_a_txt", type: serverWidget.FieldType.TEXT, label: "Facturar a" });
    sublista.addField({ id: "moneda", type: serverWidget.FieldType.TEXT, label: "Moneda" });
    sublista.addField({ id: "orden_itemsname", type: serverWidget.FieldType.TEXT, label: "Artículo" });

    // ✅ CURRENCY (mejor presentación)
    sublista.addField({ id: "monto", type: serverWidget.FieldType.CURRENCY, label: "Base imponible (USD)" });
    sublista.addField({ id: "impuestos", type: serverWidget.FieldType.CURRENCY, label: "IGV (USD)" });
    sublista.addField({ id: "totalline", type: serverWidget.FieldType.CURRENCY, label: "Total (USD)" });

    // hidden keys
    const lineKeyField = sublista.addField({ id: "linekey", type: serverWidget.FieldType.TEXT, label: "lineuniquekey" });
    lineKeyField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const lineNumField = sublista.addField({ id: "linenum", type: serverWidget.FieldType.TEXT, label: "line" });
    lineNumField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    const facturarAIdField = sublista.addField({ id: "facturar_a_id", type: serverWidget.FieldType.TEXT, label: "facturar_a_id" });
    facturarAIdField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

    if (opts.empty) return sublista;
    return sublista;
  }

  function fillSublistMAF(form, params, usdCurrencyId) {
    const sublista = buildSublistMAF(form);

    const results = getSalesOrderLinesMAF({
      cliente: params.cliente,
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      usdCurrencyId,
      tipoDoc: params.tipo_doc
    });

    // contadores
    try {
      const fTotal = form.getField({ id: "custpage_count_total" });
      if (fTotal) fTotal.defaultValue = String(results.length);
      const fSel = form.getField({ id: "custpage_count_selected" });
      if (fSel) fSel.defaultValue = "0";
    } catch (e) {}

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      sublista.setSublistValue({ id: "check", line: i, value: "F" });

      safeSet(sublista, "id", i, String(r.soId));
      safeSet(sublista, "numero", i, r.tranid || "");
      safeSet(sublista, "fecha", i, r.trandate || "");
      safeSet(sublista, "cliente_txt", i, r.entityText || "");
      safeSet(sublista, "facturar_a_txt", i, r.facturarAText || "");
      safeSet(sublista, "moneda", i, r.currencySymbol || "USD");
      safeSet(sublista, "orden_itemsname", i, r.itemDisplayName || "");

      safeSet(sublista, "linekey", i, String(r.lineUniqueKey || ""));
      safeSet(sublista, "linenum", i, String(r.lineNum || ""));
      safeSet(sublista, "facturar_a_id", i, String(r.facturarAId || ""));

      // ✅ FXAMOUNT ya viene en USD porque filtramos currency=USD
      const monto = Number(r.fxamount || 0);
      const igv = monto * 0.18;
      const total = monto + igv;

      safeSet(sublista, "monto", i, monto.toFixed(2));
      safeSet(sublista, "impuestos", i, igv.toFixed(2));
      safeSet(sublista, "totalline", i, total.toFixed(2));
    }
  }

  // =========================
  // Search MAF (líneas) - USD
  // =========================
  function getSalesOrderLinesMAF({ cliente, fechaInicio, fechaFin, usdCurrencyId, tipoDoc }) {
    const res = [];
    if (!fechaInicio || !fechaFin || !usdCurrencyId) return res;

    const d1 = normalizeDateForWithin(fechaInicio);
    const d2 = normalizeDateForWithin(fechaFin);

    const filters = [
      ["type", "anyof", "SalesOrd"],
      "AND",
      ["mainline", "is", "F"],
      "AND",
      ["taxline", "is", "F"],
      "AND",
      ["trandate", "within", d1, d2],
      "AND",
      ["currency", "anyof", String(usdCurrencyId)], // ✅ SIEMPRE USD
      "AND",
      ["item", "noneof", "@NONE@"],
      "AND",
      ["custbody_fac_maf", "is", "T"],
      "AND",
      ["amount", "notequalto", "0"],
      "AND",
      ["custcol_ht_fac_agru", "isempty", ""]
    ];

    if (cliente) {
      filters.push("AND", ["entity", "anyof", cliente]);
    }

    if (tipoDoc) {
      filters.push("AND",
        [
          ["custbody_ht_facturar_a.custentity_pe_code_document_type", "startswith", (Number(tipoDoc) === 50 ? "6" : "1")],
          "OR",
          ["custbody_ht_facturar_a.custentity_pe_code_document_type", "startswith", (Number(tipoDoc) === 50 ? "6" : "4")],
          "OR",
          ["custbody_ht_facturar_a.custentity_pe_code_document_type", "startswith", (Number(tipoDoc) === 50 ? "6" : "7")]
        ]
      );
    }

    const s = search.create({
      type: "transaction",
      filters,
      columns: [
        search.createColumn({ name: "internalid" }),
        search.createColumn({ name: "tranid" }),
        search.createColumn({ name: "trandate" }),
        search.createColumn({ name: "entity" }),

        // ✅ CLAVE: fxamount (moneda de transacción)
        search.createColumn({ name: "fxamount" }),

        search.createColumn({ name: "symbol", join: "Currency" }),
        search.createColumn({ name: "custbody_ht_facturar_a" }),
        search.createColumn({ name: "item" }),
        search.createColumn({ name: "displayname", join: "item" }),
        search.createColumn({ name: "line" }),
        search.createColumn({ name: "lineuniquekey" })
      ]
    });

    const paged = s.runPaged({ pageSize: 1000 });
    paged.pageRanges.forEach((pr) => {
      const page = paged.fetch({ index: pr.index });
      page.data.forEach((r) => {
        res.push({
          soId: r.getValue({ name: "internalid" }),
          tranid: r.getValue({ name: "tranid" }),
          trandate: r.getValue({ name: "trandate" }),
          entityText: r.getText({ name: "entity" }),

          fxamount: r.getValue({ name: "fxamount" }),

          currencySymbol: r.getValue({ name: "symbol", join: "Currency" }),
          facturarAId: r.getValue({ name: "custbody_ht_facturar_a" }),
          facturarAText: r.getText({ name: "custbody_ht_facturar_a" }),
          itemId: r.getValue({ name: "item" }),
          itemDisplayName: r.getValue({ name: "displayname", join: "item" }),
          lineNum: r.getValue({ name: "line" }),
          lineUniqueKey: r.getValue({ name: "lineuniquekey" })
        });
      });
    });

    return res;
  }

  // =========================
  // Helpers
  // =========================
  function normalizeDateForWithin(dateVal) {
    const d = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  function safeSet(sublist, id, line, value) {
    if (value === undefined || value === null || value === "") return;
    try {
      sublist.setSublistValue({ id, line, value: String(value) });
    } catch (e) {
      log.debug("safeSet skip", { id, line });
    }
  }

  function parseContextParams(raw) {
    try {
      if (!raw) return { flag: "" };
      const obj = JSON.parse(raw);
      return obj || { flag: "" };
    } catch (e) {
      return { flag: "" };
    }
  }

  function setDefaults(form, params, usdCurrencyId) {
    const setIf = (id, val) => {
      const f = form.getField({ id });
      if (f && val !== undefined && val !== null && val !== "") f.defaultValue = val;
    };

    setIf("cliente", params.cliente);
    setIf("fecha_inicio", params.fechaInicio ? new Date(params.fechaInicio) : "");
    setIf("fecha_fin", params.fechaFin ? new Date(params.fechaFin) : "");
    setIf("account", params.account);
    setIf("tipo_doc", params.tipo_doc);

    setIf("ubicacion", params.ubicacion);
    setIf("serie", params.serie);
    setIf("termino_pago", params.termino_pago);
    setIf("forma_pago", params.forma_pago);
    setIf("concept_detraction", params.concept_detraction);
    setIf("gratutita", params.gratutita);

    setIf("referencia", params.referencia);
    setIf("glosa", params.glosa);
    setIf("nota_factura", params.nota_factura);

    // 🔒 Moneda fija USD
    try {
      const fCur = form.getField({ id: "currency" });
      if (fCur) fCur.defaultValue = String(usdCurrencyId || "");
    } catch (e) {}

    setIf("importe_total", params.importe_total);
    setIf("igv", params.igv);
    setIf("totalbody", params.totalbody);
  }

  // =========================
  // POST
  // =========================
  function handlePost(scriptContext) {
    const request = scriptContext.request;

    try {
      const usdCurrencyId = getUsdCurrencyId();

      const cliente = request.parameters.cliente;
      const fechaInicio = request.parameters.fecha_inicio;
      const fechaFin = request.parameters.fecha_fin;
      const account = request.parameters.account;
      const glosa = request.parameters.glosa;
      const referencia = request.parameters.referencia;
      const nota_factura = request.parameters.nota_factura;

      const tipo_doc = request.parameters.tipo_doc;
      const termino_pago = request.parameters.termino_pago;
      const ubicacion = request.parameters.ubicacion;
      const serie = request.parameters.serie;
      const forma_pago = request.parameters.forma_pago;
      const tipo_operacion = request.parameters.tipo_operacion;
      const concept_detraction = request.parameters.concept_detraction;
      const gratutita = request.parameters.gratutita;

      if (!tipo_operacion) {
        throw new Error("Debe seleccionar PE EI Tipo de Operación.");
      }

      const facturaDirecta = [];
      const lineCount = request.getLineCount({ group: "sublista" }) || 0;

      for (let i = 0; i < lineCount; i++) {
        const checked = request.getSublistValue({ group: "sublista", name: "check", line: i });
        if (checked !== "T") continue;

        const soId = request.getSublistValue({ group: "sublista", name: "id", line: i });
        const linekey = request.getSublistValue({ group: "sublista", name: "linekey", line: i });
        const linenum = request.getSublistValue({ group: "sublista", name: "linenum", line: i });
        const facturarAId = request.getSublistValue({ group: "sublista", name: "facturar_a_id", line: i });

        const idNum = Number(soId);
        if (!idNum) continue;
        if (!linekey && !linenum) continue;

        facturaDirecta.push({
          id: idNum,
          linekey: linekey || "",
          linea: linenum || "",
          cliente: facturarAId || ""
        });
      }

      if (!facturaDirecta.length) {
        throw new Error("No se detectaron líneas seleccionadas para procesar.");
      }

      const currentUser = runtime.getCurrentUser();

      const id_log = createCabLog({
        cliente,
        agrupador: "",
        usuario: currentUser.id
      });

      const recordColaId = agregarCola({ usuario: currentUser.id });

      const payload = {
        tipo_generado: TIPO_GENERADOR_DEFAULT,
        cliente,
        fechaInicio,
        fechaFin,
        currency: String(usdCurrencyId), // 🔒 USD siempre
        account,
        glosa,
        referencia,
        nota_factura,

        tipo_doc,
        terminoPago: termino_pago,
        ubicacion,
        serie,
        forma_pago,
        tipo_operacion,
        concept_detraction,
        gratutita,

        id_log,
        cola_id: recordColaId,
        facturaDirecta
      };

      const fileId = saveJson(payload, recordColaId, INPUT_FOLDER_ID);

      record.submitFields({
        type: RECORD_COLA,
        id: recordColaId,
        values: { custrecord_ts_ss_parametros_mm: fileId }
      });

      const mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: "customscript_ts_mr_maf_facturacion",
        deploymentId: "customdeploy_ts_mr_maf_facturacion",
        params: {
          custscript_ts_mr_maf_cola_id: String(recordColaId),
          custscript_ts_mr_maf_file_id: String(fileId)
        }
      });

      const mrTaskId = mrTask.submit();
      log.debug("MR Task submitted", mrTaskId);

      const backUrl = url.resolveScript({
        scriptId: "customscript_ht_pe_ts_sl_maf_facturacion",
        deploymentId: "customdeploy_ht_pe_ts_sl_maf_facturacion",
        params: { status: "submitted", taskid: mrTaskId }
      });

      redirect.redirect({ url: backUrl });

    } catch (e) {
      log.error("Suitelet POST", e);
      throw e;
    }
  }

  // =========================
  // Cola + Log + JSON
  // =========================
  function agregarCola(params) {
    const colaRec = record.create({ type: RECORD_COLA, isDynamic: true });
    colaRec.setValue({ fieldId: "name", value: "MAF Facturación MR (USD)" });
    colaRec.setValue({ fieldId: "custrecord_ts_ss_estado_mm", value: COLA_PENDIENTE });
    colaRec.setValue({ fieldId: "custrecord_ts_ss_creado_por_mm", value: params.usuario });
    colaRec.setValue({ fieldId: "custrecord_ts_ss_fecha_inicio_mm", value: new Date() });
    return colaRec.save();
  }

  function createCabLog(params) {
    const cabLog = record.create({ type: "customrecord_ts_log_ejec_agrup_fact_mm", isDynamic: true });
    cabLog.setValue({ fieldId: "name", value: "MAF Facturación MR (USD)" });
    cabLog.setValue({ fieldId: "custrecord_ts_estado_mm", value: "pendiente" });
    cabLog.setValue({ fieldId: "custrecord_ts_porcentaje_mm", value: "0%" });
    cabLog.setValue({ fieldId: "custrecord_ts_cliente_mm", value: params.cliente });
    cabLog.setValue({ fieldId: "custrecord_ts_agrupador_mm", value: params.agrupador || "" });
    cabLog.setValue({ fieldId: "custrecord_ts_fecha_inicio_mm", value: new Date() });
    if (params.usuario) cabLog.setValue({ fieldId: "custrecord_ts_creado_por_mm", value: params.usuario });
    return cabLog.save();
  }

  function saveJson(contents, colaId, folder) {
    const name = `lote${colaId}_${sysDate()}.json`;
    const fileObj = file.create({
      name,
      fileType: file.Type.JSON,
      contents: JSON.stringify(contents),
      folder,
      isOnline: false
    });
    return fileObj.save();
  }

  function sysDate() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}${mm}${yyyy}`;
  }

  /**
   * ✅ Detecta el currency USD en tu cuenta
   * (evita hardcodear internalid)
   */
  function getUsdCurrencyId() {
    // intentamos por name / symbol / currency code
    const s = search.create({
      type: "currency",
      filters: [
        ["name", "contains", "US Dollar"],
        "OR",
        ["name", "contains", "Dólar"],
        "OR",
        ["symbol", "is", "USD"],
        "OR",
        ["name", "contains", "USD"]
      ],
      columns: [
        search.createColumn({ name: "internalid" }),
        search.createColumn({ name: "name" }),
        search.createColumn({ name: "symbol" })
      ]
    });

    let found = null;
    s.run().each((r) => {
      found = r.getValue({ name: "internalid" });
      const nm = r.getValue({ name: "name" });
      const sym = r.getValue({ name: "symbol" });
      log.debug("USD currency match", { found, nm, sym });
      return false;
    });

    if (!found) {
      throw new Error("No se pudo detectar la moneda USD en el registro Currency. Ajusta getUsdCurrencyId().");
    }
    return String(found);
  }

  return { onRequest };
});
