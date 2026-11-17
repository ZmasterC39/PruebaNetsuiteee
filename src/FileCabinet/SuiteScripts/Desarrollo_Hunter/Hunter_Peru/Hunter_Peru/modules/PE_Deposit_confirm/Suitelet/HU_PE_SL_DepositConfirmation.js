/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/record",
  "N/redirect",
  "N/ui/message",
  "N/search"
], function (serverWidget, record, redirect, message, search) {

  // ------------------- Utils -------------------
  function parseDateDDMMYYYY(dateString) {
    if (!dateString) return null;
    var parts = dateString.split("/");
    if (parts.length !== 3) return null;
    return new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
  }
  function round2(n) {
    return Math.round(parseFloat(n || 0) * 100) / 100;
  }
  function toFloat(x){ return parseFloat(x || 0); }

  // ------------------- Entry -------------------
  function onRequest(context) {
    var req = context.request;
    var recId = req.parameters.custparam_id || "";
    var mode = req.parameters.mode || "";

    if (req.method === "GET") {
      var form = crearFormulario(serverWidget);
      if (recId && mode === "edit") {
        cargarDatosPrincipales(form, recId);
        cargarSublista(form, recId);
      }
      context.response.writePage(form);
    } else {
      procesarYGuardar(context, recId);
    }
  }

  // -------------------------------------------------------------
  // CREAR FORMULARIO
  // -------------------------------------------------------------
  function crearFormulario(serverWidget) {
    var form = serverWidget.createForm({ title: "Validación de Depósitos" });

    form.addFieldGroup({
      id: "custpage_fg_principales",
      label: "Datos Principales"
    });
    form.addFieldGroup({ id: "custpage_fg_montos", label: "Montos y Fechas" });
    form.addFieldGroup({ id: "custpage_fg_obs", label: "Observaciones y Saldo" });

    // Datos principales
    form.addField({
      id: "custpage_cliente",
      type: serverWidget.FieldType.SELECT,
      label: "Cliente",
      source: "customer",
      container: "custpage_fg_principales"
    });

    form.addField({
      id: "custpage_banco",
      type: serverWidget.FieldType.SELECT,
      label: "Banco",
      container: "custpage_fg_principales"
    });
    cargarOpcionesBanco(form.getField({ id: "custpage_banco" }));

    var fldMoneda = form.addField({
      id: "custpage_moneda",
      type: serverWidget.FieldType.SELECT,
      label: "Moneda",
      source: "currency",
      container: "custpage_fg_principales"
    });
    fldMoneda.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    });

    form.addField({
      id: "custpage_operacion",
      type: serverWidget.FieldType.TEXT,
      label: "Nro Operación",
      container: "custpage_fg_principales"
    });

    // Campo libre para Cliente Depositante Referencial (obligatorio)
    var ClienteRef1 = form.addField({
      id: "custpage_cliente_dep_ref",
      type: serverWidget.FieldType.TEXT,
      label: "Cliente Depositante Referencial",
      container: "custpage_fg_principales"
    });
    ClienteRef1.isMandatory = true;

    // Montos y fechas
    form.addField({
      id: "custpage_fecha_operacion",
      type: serverWidget.FieldType.DATE,
      label: "Fecha Operación",
      container: "custpage_fg_montos"
    });
    var fTC = form.addField({
      id: "custpage_tipo_cambio",
      type: serverWidget.FieldType.TEXT,
      label: "Tipo de Cambio",
      container: "custpage_fg_montos"
    });
    fTC.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    });
    form.addField({
      id: "custpage_importe_soles",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe en Soles",
      container: "custpage_fg_montos"
    });
    form.addField({
      id: "custpage_importe_dolares",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe en Dólares",
      container: "custpage_fg_montos"
    });

    // Observaciones y saldo
    form.addField({
      id: "custpage_observaciones",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Observaciones",
      container: "custpage_fg_obs"
    });
    form.addField({
      id: "custpage_saldo_restante",
      type: serverWidget.FieldType.CURRENCY,
      label: "Saldo Restante",
      container: "custpage_fg_obs"
    });

    // Archivos
    var fldFile1 = form.addField({
      id: "custpage_attach_file_1",
      type: serverWidget.FieldType.FILE,
      label: "Archivo 1"
    });
    fldFile1.isMandatory = true;
    form.addField({
      id: "custpage_attach_file_2",
      type: serverWidget.FieldType.FILE,
      label: "Archivo 2"
    });
    form.addField({
      id: "custpage_attach_file_3",
      type: serverWidget.FieldType.FILE,
      label: "Archivo 3"
    });

    // Sublista de registros hijos
    var sublist = form.addSublist({
      id: "custpage_sublist_registros_hijos",
      type: serverWidget.SublistType.INLINEEDITOR,
      label: "Registros Hijos"
    });
    sublist
      .addField({
        id: "custpage_child_recordid",
        type: serverWidget.FieldType.TEXT,
        label: "ID subregistro"
      })
      .updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
    sublist.addField({
      id: "custpage_salesorde_tranid",
      label: "Orden de Servicio",
      type: serverWidget.FieldType.SELECT,
      source: "transaction"
    });
    sublist.addField({
      id: "custpage_child_internalid",
      type: serverWidget.FieldType.TEXT,
      label: "ID Interno (Tran)"
    });
    sublist.addField({
      id: "custpage_child_cliente",
      type: serverWidget.FieldType.TEXT,
      label: "Cliente"
    });
    sublist.addField({
      id: "custpage_child_moneda",
      type: serverWidget.FieldType.TEXT,
      label: "Moneda"
    });
    sublist.addField({
      id: "custpage_child_tipo_cambio",
      type: serverWidget.FieldType.FLOAT,
      label: "Tipo de Cambio"
    });
    sublist.addField({
      id: "custpage_child_importe",
      type: serverWidget.FieldType.TEXT,
      label: "Importe"
    });
    sublist.addField({
      id: "custpage_child_saldo_confirmacion",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe Asociado al Deposito"
    });
    sublist.addField({
      id: "custpage_child_fecha",
      type: serverWidget.FieldType.DATE,
      label: "Fecha"
    });
    sublist.addField({
      id: "custpage_child_os_ref",
      type: serverWidget.FieldType.TEXT,
      label: "Orden de Servicio Ref"
    });

    form.addSubmitButton({ label: "Guardar" });

    form.clientScriptModulePath =
      "SuiteScripts/Desarrollo_Hunter/Hunter_Peru/appHunter/modules/PE_Deposit_confirm/ClientScript/HU_PE_CS_AutoFillSublist_DepositConfirmation.js";
    return form;
  }

  // -------------------------------------------------------------
  // GET: Cargar datos
  // -------------------------------------------------------------
  function cargarDatosPrincipales(form, recId) {
    var lookup = search.lookupFields({
      type: "customrecord_pe_confirmacion_deposito",
      id: recId,
      columns: [
        "custrecord_pe_cliente_confirm",
        "custrecord_pe_importe_soles_confirm",
        "custrecord_pe_importe_dolares_confirm",
        "custrecord_pe_observacion_confirm",
        "custrecord_pe_banco_confirm",
        "custrecord_pe_operacion_confirm",
        "custrecord_pe_moneda_confirm",
        "custrecord_pe_fecha_operacion_confirm",
        "custrecord_pe_tipo_cambio_confirm",
        "custrecord_pe_saldo_restante_confirm",
        "custrecord_pe_cliente_dep_ref_confirm"
      ]
    });

    form.getField({ id: "custpage_cliente" }).defaultValue =
      lookup.custrecord_pe_cliente_confirm.length
        ? lookup.custrecord_pe_cliente_confirm[0].value
        : "";
    form.getField({ id: "custpage_importe_soles" }).defaultValue =
      lookup.custrecord_pe_importe_soles_confirm || "";
    form.getField({ id: "custpage_importe_dolares" }).defaultValue =
      lookup.custrecord_pe_importe_dolares_confirm || "";
    form.getField({ id: "custpage_observaciones" }).defaultValue =
      lookup.custrecord_pe_observacion_confirm || "";
    form.getField({ id: "custpage_banco" }).defaultValue =
      lookup.custrecord_pe_banco_confirm.length
        ? lookup.custrecord_pe_banco_confirm[0].value
        : "";
    form.getField({ id: "custpage_operacion" }).defaultValue =
      lookup.custrecord_pe_operacion_confirm || "";
    form.getField({ id: "custpage_moneda" }).defaultValue =
      lookup.custrecord_pe_moneda_confirm.length
        ? lookup.custrecord_pe_moneda_confirm[0].value
        : "";

    if (lookup.custrecord_pe_fecha_operacion_confirm) {
      form.getField({ id: "custpage_fecha_operacion" }).defaultValue =
        lookup.custrecord_pe_fecha_operacion_confirm;
    }
    form.getField({ id: "custpage_tipo_cambio" }).defaultValue =
      lookup.custrecord_pe_tipo_cambio_confirm || "";
    form.getField({ id: "custpage_saldo_restante" }).defaultValue =
      lookup.custrecord_pe_saldo_restante_confirm || "";
    form.getField({ id: "custpage_cliente_dep_ref" }).defaultValue =
      lookup.custrecord_pe_cliente_dep_ref_confirm || "";
  }

  function cargarSublista(form, recId) {
    var sublist = form.getSublist({ id: "custpage_sublist_registros_hijos" });
    var sObj = search.create({
      type: "customrecord_pe_confirmacion_deposito_os",
      filters: [["custrecord_pe_detalle_confirm", "is", recId]],
      columns: [
        "internalid",
        "custrecord_pe_os_detalle_confirm",
        "custrecord_pe_internalid_det_confirm",
        "custrecord_pe_importe_detalle_confirm",
        "custrecord_pe_moneda_detalle_confirm",
        "custrecord_pe_cliente_detalle_confirm",
        "custrecord_pe_saldo_detalle_confirm",
        "custrecord_pe_tipo_cambio_detalle_confir",
        "custrecord_pe_fecha_detalle_confirm"
      ]
    });
    var r = sObj.run().getRange({ start: 0, end: 1000 });
    for (var i = 0; i < r.length; i++) {
      sublist.setSublistValue({
        id: "custpage_child_recordid",
        line: i,
        value: r[i].getValue("internalid") || ""
      });
      sublist.setSublistValue({
        id: "custpage_salesorde_tranid",
        line: i,
        value: r[i].getValue("custrecord_pe_os_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_internalid",
        line: i,
        value: r[i].getValue("custrecord_pe_internalid_det_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_importe",
        line: i,
        value: r[i].getValue("custrecord_pe_importe_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_moneda",
        line: i,
        value: r[i].getValue("custrecord_pe_moneda_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_cliente",
        line: i,
        value: r[i].getValue("custrecord_pe_cliente_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_saldo_confirmacion",
        line: i,
        value: r[i].getValue("custrecord_pe_saldo_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_tipo_cambio",
        line: i,
        value: r[i].getValue("custrecord_pe_tipo_cambio_detalle_confir") || ""
      });
      var childFecha = r[i].getValue("custrecord_pe_fecha_detalle_confirm");
      if (childFecha) {
        sublist.setSublistValue({
          id: "custpage_child_fecha",
          line: i,
          value: childFecha
        });
      }
    }
  }

  // -------------------------------------------------------------
  // POST: Guardar
  // -------------------------------------------------------------
  function procesarYGuardar(context, recId) {
    var req = context.request;
    var c = req.parameters.custpage_cliente;

    var sol = round2(req.parameters.custpage_importe_soles);
    var dol = round2(req.parameters.custpage_importe_dolares);
    var obs = req.parameters.custpage_observaciones;
    var bco = req.parameters.custpage_banco;
    var ope = req.parameters.custpage_operacion;
    var mon = req.parameters.custpage_moneda; // "5" = PEN, "1" = USD
    var fOp = req.parameters.custpage_fecha_operacion;
    var tCam = req.parameters.custpage_tipo_cambio;
    var sRest = parseFloat(req.parameters.custpage_saldo_restante || 0);
    var clienteDepRef = req.parameters.custpage_cliente_dep_ref || "";

    var lineCount = req.getLineCount({
      group: "custpage_sublist_registros_hijos"
    });

    // ---------------- Suma siempre en moneda de CABECERA ----------------
    var tCabecera = 0; // total de líneas convertido a moneda de la cabecera
    var ordenesMap = {};
    var msgError = [];

    for (var i = 0; i < lineCount; i++) {
      var cMon = req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_child_moneda",
        line: i
      });

      var sConf = round2(req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_child_saldo_confirmacion",
        line: i
      }));

      var tcLinea = toFloat(req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_child_tipo_cambio",
        line: i
      }));
      var tcCab = toFloat(tCam);
      var tc = tcLinea || tcCab; // prioridad: línea > cabecera

      // Validar TC si es requerido por conversión
      if (!tc && cMon && mon) {
        var requiereConversion =
          (mon === "5" && cMon === "US Dollar") ||
          (mon === "1" && cMon === "Soles");
        if (requiereConversion) {
          msgError.push("Falta tipo de cambio para convertir la línea " + (i + 1));
        }
      }

      // Convertir a moneda de cabecera
      var aporte = 0;
      if (mon === "5") { // Cabecera PEN
        aporte = (cMon === "US Dollar") ? sConf * tc : sConf;
      } else if (mon === "1") { // Cabecera USD
        aporte = (cMon === "Soles") ? (tc ? sConf / tc : 0) : sConf;
      } else {
        // Si usas otras monedas, puedes ampliar aquí
        aporte = sConf;
      }
      tCabecera = round2(tCabecera + aporte);

      // Detección de duplicados OS
      var tId = req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_salesorde_tranid",
        line: i
      });
      if (tId) {
        ordenesMap[tId] = ordenesMap[tId] ? ordenesMap[tId] + 1 : 1;
      }
    }

    // ---------------- Validaciones base ----------------
    if (!c) msgError.push("Cliente obligatorio.");
    if (!bco) msgError.push("Banco obligatorio.");
    if (!ope) msgError.push("Operación obligatoria.");
    if (!mon) msgError.push("Moneda obligatoria.");
    if (!fOp) msgError.push("Fecha Operación obligatoria.");

    // Duplicados
    for (var j in ordenesMap) {
      if (ordenesMap[j] > 1)
        msgError.push("Orden de Servicio " + j + " duplicada.");
    }

    // Al menos 1 OS
    var validOS = 0;
    for (var x = 0; x < lineCount; x++) {
      var checkTran = req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_salesorde_tranid",
        line: x
      });
      if (checkTran) validOS++;
    }
    if (validOS < 1) msgError.push("Se requiere al menos 1 Orden de Servicio.");

    // ---------------- Comparación con cabecera ----------------
    if (mon === "5") { // PEN
      if (tCabecera > sol) {
        msgError.push(
          "El total aplicado (" + tCabecera.toFixed(2) + " PEN) excede el Importe en Soles (" + round2(sol).toFixed(2) + " PEN)."
        );
      }
    } else if (mon === "1") { // USD
      if (tCabecera > dol) {
        msgError.push(
          "El total aplicado (" + tCabecera.toFixed(2) + " USD) excede el Importe en Dólares (" + round2(dol).toFixed(2) + " USD)."
        );
      }
    }

    // ---------------- Enviar errores si hay ----------------
    if (msgError.length > 0) {
      var formErr = crearFormulario(serverWidget);
      formErr.getField({ id: "custpage_cliente" }).defaultValue = c;
      formErr.getField({ id: "custpage_importe_soles" }).defaultValue = sol;
      formErr.getField({ id: "custpage_importe_dolares" }).defaultValue = dol;
      formErr.getField({ id: "custpage_observaciones" }).defaultValue = obs;
      formErr.getField({ id: "custpage_banco" }).defaultValue = bco;
      formErr.getField({ id: "custpage_operacion" }).defaultValue = ope;
      formErr.getField({ id: "custpage_moneda" }).defaultValue = mon;
      formErr.getField({ id: "custpage_fecha_operacion" }).defaultValue = fOp;
      formErr.getField({ id: "custpage_tipo_cambio" }).defaultValue = tCam;
      formErr.getField({ id: "custpage_saldo_restante" }).defaultValue = sRest;
      formErr.getField({ id: "custpage_cliente_dep_ref" }).defaultValue = clienteDepRef;

      formErr.addPageInitMessage({
        type: message.Type.ERROR,
        title: "Validaciones",
        message: msgError.join("\n")
      });
      reconstruirSublista(formErr, req, lineCount);
      context.response.writePage(formErr);
      return;
    }

    // ---------------- Guardado ----------------
    var fechaOpDate = fOp ? parseDateDDMMYYYY(fOp) : null;
    var parentId = guardarRegistroPrincipal(
      recId, c, sol, dol, obs, bco, ope, mon, fechaOpDate, tCam, sRest, clienteDepRef
    );

    guardarArchivos(req, parentId);
    guardarHijos(req, parentId);

    var fOk = crearFormulario(serverWidget);
    var mensajeExito =
      'Registro guardado correctamente.\n' +
      'ID: CD-PE-00' + parentId;

    fOk.addPageInitMessage({
      type: message.Type.CONFIRMATION,
      title: 'Éxito',
      message: mensajeExito
    });
    limpiarSublista(fOk, lineCount);
    context.response.writePage(fOk);
  }

  function reconstruirSublista(form, req, lineCount) {
    var s = form.getSublist({ id: "custpage_sublist_registros_hijos" });
    for (var i = 0; i < lineCount; i++) {
      var fields = [
        "custpage_child_recordid",
        "custpage_salesorde_tranid",
        "custpage_child_internalid",
        "custpage_child_cliente",
        "custpage_child_moneda",
        "custpage_child_tipo_cambio",
        "custpage_child_importe",
        "custpage_child_saldo_confirmacion",
        "custpage_child_fecha",
        "custpage_child_os_ref"
      ];
      fields.forEach(function (fld) {
        try {
          s.setSublistValue({
            id: fld,
            line: i,
            value:
              req.getSublistValue({
                group: "custpage_sublist_registros_hijos",
                name: fld,
                line: i
              }) || ""
          });
        } catch (e) {}
      });
    }
  }

  function guardarRegistroPrincipal(
    recId,
    cliente,
    impSoles,
    impDolares,
    observa,
    banco,
    operacion,
    moneda,
    fechaOpDate,
    tcambio,
    saldoRestante,
    clienteDepRef
  ) {
    var parentId;
    if (!recId) {
      var rec = record.create({
        type: "customrecord_pe_confirmacion_deposito",
        isDynamic: true
      });
      rec.setValue({ fieldId: "custrecord_pe_cliente_confirm", value: cliente });
      rec.setValue({ fieldId: "custrecord_pe_importe_soles_confirm", value: impSoles });
      rec.setValue({ fieldId: "custrecord_pe_importe_dolares_confirm", value: impDolares });
      rec.setValue({ fieldId: "custrecord_pe_observacion_confirm", value: observa });
      rec.setValue({ fieldId: "custrecord_pe_banco_confirm", value: banco });
      rec.setValue({ fieldId: "custrecord_pe_operacion_confirm", value: operacion });
      rec.setValue({ fieldId: "custrecord_pe_moneda_confirm", value: moneda });
      if (fechaOpDate) {
        rec.setValue({ fieldId: "custrecord_pe_fecha_operacion_confirm", value: fechaOpDate });
      }
      rec.setValue({ fieldId: "custrecord_pe_tipo_cambio_confirm", value: toFloat(tcambio) });
      rec.setValue({ fieldId: "custrecord_pe_estado_confirm", value: 2 });
      rec.setValue({ fieldId: "custrecord_pe_saldo_restante_confirm", value: saldoRestante });
      rec.setValue({ fieldId: "custrecord_pe_cliente_dep_ref_confirm", value: clienteDepRef });
      parentId = rec.save({ ignoreMandatoryFields: true });
    } else {
      var valuesToUpdate = {
        custrecord_pe_cliente_confirm: cliente,
        custrecord_pe_importe_soles_confirm: impSoles,
        custrecord_pe_importe_dolares_confirm: impDolares,
        custrecord_pe_observacion_confirm: observa,
        custrecord_pe_banco_confirm: banco,
        custrecord_pe_operacion_confirm: parseInt(operacion, 10),
        custrecord_pe_moneda_confirm: moneda,
        custrecord_pe_fecha_operacion_confirm: fechaOpDate,
        custrecord_pe_tipo_cambio_confirm: toFloat(tcambio),
        custrecord_pe_estado_confirm: 2,
        custrecord_pe_saldo_restante_confirm: saldoRestante,
        custrecord_pe_cliente_dep_ref_confirm: clienteDepRef
      };
      record.submitFields({
        type: "customrecord_pe_confirmacion_deposito",
        id: recId,
        values: valuesToUpdate,
        options: { ignoreMandatoryFields: true }
      });
      parentId = recId;
    }
    return parentId;
  }

  function guardarArchivos(req, parentId) {
    var ff = [
      "custpage_attach_file_1",
      "custpage_attach_file_2",
      "custpage_attach_file_3"
    ];
    var foldId = 38021; // Ajusta a tu folder
    ff.forEach(function (f) {
      var fileObj = req.files[f];
      if (fileObj) {
        fileObj.folder = foldId;
        var savedId = fileObj.save();
        record.attach({
          record: { type: "file", id: savedId },
          to: { type: "customrecord_pe_confirmacion_deposito", id: parentId }
        });
      }
    });
  }

  function guardarHijos(req, parentId) {
    var lineCount = req.getLineCount({
      group: "custpage_sublist_registros_hijos",
    });
    for (var z = 0; z < lineCount; z++) {
      var exId =
        req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_recordid",
          line: z
        }) || "";
      var tran = req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_salesorde_tranid",
        line: z
      });
      if (!tran) continue;

      var soTranIdText = "";
      try {
        var soRec = record.load({
          type: record.Type.SALES_ORDER,
          id: tran
        });
        soTranIdText = soRec.getValue("tranid") || "";
      } catch (e) {}

      var cFechaStr = req.getSublistValue({
        group: "custpage_sublist_registros_hijos",
        name: "custpage_child_fecha",
        line: z
      });
      var cFecha = cFechaStr ? parseDateDDMMYYYY(cFechaStr) : null;

      var vals = {
        custrecord_pe_os_detalle_confirm: tran,
        custrecord_pe_internalid_det_confirm: req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_internalid",
          line: z
        }),
        custrecord_pe_importe_detalle_confirm: toFloat(
          req.getSublistValue({
            group: "custpage_sublist_registros_hijos",
            name: "custpage_child_importe",
            line: z
          })
        ),
        custrecord_pe_moneda_detalle_confirm: req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_moneda",
          line: z
        }),
        custrecord_pe_cliente_detalle_confirm: req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_cliente",
          line: z
        }),
        // Redondeo consistente
        custrecord_pe_saldo_detalle_confirm: round2(
          req.getSublistValue({
            group: "custpage_sublist_registros_hijos",
            name: "custpage_child_saldo_confirmacion",
            line: z
          })
        ),
        custrecord_pe_tipo_cambio_detalle_confir: toFloat(
          req.getSublistValue({
            group: "custpage_sublist_registros_hijos",
            name: "custpage_child_tipo_cambio",
            line: z
          })
        ),
        custrecord_pe_fecha_detalle_confirm: cFecha,
        custrecord_pe_os_ref_detalle_confirm: soTranIdText
      };

      if (exId) {
        record.submitFields({
          type: "customrecord_pe_confirmacion_deposito_os",
          id: exId,
          values: vals,
          options: { ignoreMandatoryFields: true }
        });
      } else {
        var ch = record.create({
          type: "customrecord_pe_confirmacion_deposito_os",
          isDynamic: true
        });
        ch.setValue({ fieldId: "custrecord_pe_detalle_confirm", value: parentId });
        for (var k in vals) {
          ch.setValue({ fieldId: k, value: vals[k] });
        }
        ch.save({ ignoreMandatoryFields: true });
      }
    }
  }

  function limpiarSublista(form, subCount) {
    var s = form.getSublist({ id: "custpage_sublist_registros_hijos" });
    for (var i = 0; i < subCount; i++) {
      try {
        [
          "custpage_child_recordid",
          "custpage_salesorde_tranid",
          "custpage_child_internalid",
          "custpage_child_cliente",
          "custpage_child_moneda",
          "custpage_child_tipo_cambio",
          "custpage_child_importe",
          "custpage_child_saldo_confirmacion",
          "custpage_child_fecha",
          "custpage_child_os_ref"
        ].forEach(function(id) {
          s.setSublistValue({ id: id, line: i, value: "" });
        });
      } catch (e) {
        break;
      }
    }
  }

  /**
   * Carga lista de bancos (ejemplo).
   * Nota: ajusta el search a tu customrecord de cuentas/bancos
   */
  function cargarOpcionesBanco(fieldBanco) {
    var sr = search.create({
      type: "customrecord_pe_cuentas_confirm",
      filters: [],
      columns: [
        "custrecord_pe_list_cuenta_confirm",
        "custrecord_pe_list_nombre_confirm"
      ]
    });
    var rr = sr.run().getRange({ start: 0, end: 1000 });
    fieldBanco.addSelectOption({ value: "", text: "" });
    rr.forEach(function(r) {
      var accId = r.getValue("custrecord_pe_list_cuenta_confirm");
      var accName = r.getValue("custrecord_pe_list_nombre_confirm") || "";
      fieldBanco.addSelectOption({ value: accId, text: accName });
    });
  }

  return { onRequest: onRequest };
});
