/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/search",
  "N/record",
  "N/ui/message",
  "N/log",
  "N/runtime",
  "N/email"
], function (serverWidget, search, record, message, log, runtime, email) {
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
  function onRequest(context) {
    var req = context.request;
    var recId =
      req.parameters.custparam_id || req.parameters.custpage_hidden_recid || "";
    var mode = req.parameters.mode || "";
    if (req.method === "GET") {
      var form = crearFormulario(serverWidget, recId, mode);
      if (recId && mode === "edit") {
        cargarDatosCabecera(form, recId);
        cargarSublista(form, recId);
      }
      context.response.writePage(form);
    } else {
      var msgs = [];
      if (!recId) msgs.push("No se recibió un ID de registro existente.");
      var cliente = req.parameters.custpage_cliente || "";
      var clienteDepRef = req.parameters.custpage_cliente_dep_ref || "";
      var impSoles = req.parameters.custpage_importe_soles || "";
      var impDolares = req.parameters.custpage_importe_dolares || "";
      var observa = req.parameters.custpage_observaciones || "";
      var banco = req.parameters.custpage_banco || "";
      var operacion = req.parameters.custpage_operacion || "";
      var moneda = req.parameters.custpage_moneda || "";
      var fechaOp = req.parameters.custpage_fecha_operacion || "";
      var tcambio = req.parameters.custpage_tipo_cambio || "";
      var saldoRest = req.parameters.custpage_saldo_restante || "";
      if (!cliente) msgs.push('Falta "Cliente".');
      if (!banco) msgs.push('Falta "Banco".');
      if (!operacion) msgs.push('Falta "Operación".');
      if (!moneda) msgs.push('Falta "Moneda".');
      if (msgs.length) {
        var fErr = crearFormulario(serverWidget, recId, mode);
        fErr.addPageInitMessage({
          type: message.Type.ERROR,
          title: "Errores",
          message: msgs.join("\n")
        });
        context.response.writePage(fErr);
        return;
      }
      record.submitFields({
        type: "customrecord_pe_confirmacion_deposito",
        id: recId,
        values: {
          custrecord_pe_cliente_confirm: cliente,
          custrecord_pe_cliente_dep_ref_confirm: clienteDepRef,
          custrecord_pe_importe_soles_confirm: impSoles,
          custrecord_pe_importe_dolares_confirm: impDolares,
          custrecord_pe_observacion_confirm: observa,
          custrecord_pe_banco_confirm: banco,
          custrecord_pe_operacion_confirm: operacion,
          custrecord_pe_moneda_confirm: moneda,
          custrecord_pe_fecha_operacion_confirm: parseDateDDMMYYYY(fechaOp),
          custrecord_pe_tipo_cambio_confirm: tcambio,
          custrecord_pe_saldo_restante_confirm: saldoRest,
          custrecord_pe_estado_confirm: 2,
          custrecord_pe_fecha_confirm: new Date()
        },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });
      var submittedChildIds = [];
      var lineCount = req.getLineCount({
        group: "custpage_sublist_registros_hijos"
      });
      for (var i = 0; i < lineCount; i++) {
        var cIdTmp = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_recordid",
          line: i
        });
        if (cIdTmp) submittedChildIds.push(cIdTmp);
      }
      var subSearch = search.create({
        type: "customrecord_pe_confirmacion_deposito_os",
        filters: [["custrecord_pe_detalle_confirm", "is", recId]],
        columns: ["internalid"]
      });
      var existing = subSearch.run().getRange({ start: 0, end: 1000 });
      var existingIds = existing.map(function (r) {
        return r.getValue("internalid");
      });
      var idsToDelete = existingIds.filter(function (id) {
        return submittedChildIds.indexOf(id) === -1;
      });
      idsToDelete.forEach(function (id) {
        record.delete({
          type: "customrecord_pe_confirmacion_deposito_os",
          id: id
        });
      });
      for (var i = 0; i < lineCount; i++) {
        var childId = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_recordid",
          line: i
        });
        var tranId = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_salesorde_tranid",
          line: i
        });
        if (!tranId) continue;
        var valImporte = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_importe",
          line: i
        });
        var valMoneda = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_moneda",
          line: i
        });
        var valClienteOs = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_cliente",
          line: i
        });
        var valSaldoConf = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_saldo_confirmacion",
          line: i
        });
        var valTcambioOs = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_tipo_cambio",
          line: i
        });
        var valFechaString = req.getSublistValue({
          group: "custpage_sublist_registros_hijos",
          name: "custpage_child_fecha",
          line: i
        });
        var valFecha = valFechaString ? parseDateDDMMYYYY(valFechaString) : null;
        if (!childId) {
          var childRec = record.create({
            type: "customrecord_pe_confirmacion_deposito_os",
            isDynamic: true
          });
          childRec.setValue({
            fieldId: "custrecord_pe_detalle_confirm",
            value: recId
          });
          childRec.setValue({
            fieldId: "name",
            value: tranId || "Nuevo"
          });
          childRec.setValue({
            fieldId: "custrecord_pe_os_detalle_confirm",
            value: tranId
          });
          childRec.setValue({
            fieldId: "custrecord_pe_importe_detalle_confirm",
            value: parseFloat(valImporte || 0)
          });
          childRec.setValue({
            fieldId: "custrecord_pe_moneda_detalle_confirm",
            value: valMoneda
          });
          childRec.setValue({
            fieldId: "custrecord_pe_cliente_detalle_confirm",
            value: valClienteOs
          });
          childRec.setValue({
            fieldId: "custrecord_pe_saldo_detalle_confirm",
            value: parseFloat(valSaldoConf || 0)
          });
          childRec.setValue({
            fieldId: "custrecord_pe_tipo_cambio_detalle_confir",
            value: parseFloat(valTcambioOs || 0)
          });
          childRec.setValue({
            fieldId: "custrecord_pe_fecha_detalle_confirm",
            value: valFecha
          });
          childRec.save();
        } else {
          record.submitFields({
            type: "customrecord_pe_confirmacion_deposito_os",
            id: childId,
            values: {
              custrecord_pe_os_detalle_confirm: tranId,
              custrecord_pe_importe_detalle_confirm: parseFloat(valImporte || 0),
              custrecord_pe_moneda_detalle_confirm: valMoneda,
              custrecord_pe_cliente_detalle_confirm: valClienteOs,
              custrecord_pe_saldo_detalle_confirm: parseFloat(valSaldoConf || 0),
              custrecord_pe_tipo_cambio_detalle_confir: parseFloat(
                valTcambioOs || 0
              ),
              custrecord_pe_fecha_detalle_confirm: valFecha
            },
            options: { ignoreMandatoryFields: true }
          });
        }
      }
      var cf = search.lookupFields({
        type: "customrecord_pe_confirmacion_deposito",
        id: recId,
        columns: ["custrecord_pe_ejecutiva_finanzas_confirm", "name"]
      });
      var fid =
        cf.custrecord_pe_ejecutiva_finanzas_confirm &&
          cf.custrecord_pe_ejecutiva_finanzas_confirm.length
          ? cf.custrecord_pe_ejecutiva_finanzas_confirm[0].value
          : "";
      if (fid) {
        var fe = search.lookupFields({
          type: "employee",
          id: fid,
          columns: ["email"]
        });
        var fEmail = fe.email;
        if (fEmail) {
          var s = search.create({
            type: "customrecord_pe_confirmacion_deposito_os",
            filters: [["custrecord_pe_detalle_confirm", "is", recId]],
            columns: ["custrecord_pe_os_detalle_confirm"]
          });
          var rr = s.run().getRange({ start: 0, end: 1000 });
          var osArr = [];
          for (var i = 0; i < rr.length; i++) {
            osArr.push(rr[i].getValue("custrecord_pe_os_detalle_confirm"));
          }
          var b =
            "Se cambió el estado a Relacionado para el registro: " +
            (cf.name || recId) +
            ". Órdenes asociadas: " +
            osArr.join(", ") +
            ". Se levantaron las observaciones.";
          email.send({
            author: runtime.getCurrentUser().id,
            recipients: [fEmail],
            subject: "Cambio de Estado a Relacionado",
            body: b
          });
        }
      }
      var formOk = crearFormulario(serverWidget, recId, mode);
      formOk.addPageInitMessage({
        type: message.Type.CONFIRMATION,
        title: "Actualización exitosa",
        message: "El registro y subregistros han sido actualizados."
      });
      context.response.writePage(formOk);
    }
  }
  function cargarDatosCabecera(form, recId) {
    var lr = search.lookupFields({
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
    asignarValorCampo(
      form,
      "custpage_cliente",
      lr.custrecord_pe_cliente_confirm
    );
    asignarValorCampo(
      form,
      "custpage_importe_soles",
      lr.custrecord_pe_importe_soles_confirm
    );
    asignarValorCampo(
      form,
      "custpage_importe_dolares",
      lr.custrecord_pe_importe_dolares_confirm
    );
    asignarValorCampo(
      form,
      "custpage_observaciones",
      lr.custrecord_pe_observacion_confirm
    );
    asignarValorCampo(form, "custpage_banco", lr.custrecord_pe_banco_confirm);
    asignarValorCampo(
      form,
      "custpage_operacion",
      lr.custrecord_pe_operacion_confirm
    );
    asignarValorCampo(form, "custpage_moneda", lr.custrecord_pe_moneda_confirm);
    asignarValorCampo(
      form,
      "custpage_fecha_operacion",
      lr.custrecord_pe_fecha_operacion_confirm
    );
    asignarValorCampo(
      form,
      "custpage_tipo_cambio",
      lr.custrecord_pe_tipo_cambio_confirm
    );
    asignarValorCampo(
      form,
      "custpage_saldo_restante",
      lr.custrecord_pe_saldo_restante_confirm
    );
    asignarValorCampo(form, "custpage_cliente_dep_ref", lr.custrecord_pe_cliente_dep_ref_confirm);
  }
  function cargarSublista(form, recId) {
    var sublist = form.getSublist({ id: "custpage_sublist_registros_hijos" });
    var subSearch = search.create({
      type: "customrecord_pe_confirmacion_deposito_os",
      filters: [["custrecord_pe_detalle_confirm", "is", recId]],
      columns: [
        "internalid",
        "custrecord_pe_os_detalle_confirm",
        "custrecord_pe_importe_detalle_confirm",
        "custrecord_pe_moneda_detalle_confirm",
        "custrecord_pe_cliente_detalle_confirm",
        "custrecord_pe_saldo_detalle_confirm",
        "custrecord_pe_tipo_cambio_detalle_confir",
        "custrecord_pe_fecha_detalle_confirm",
        "custrecord_pe_os_ref_detalle_confirm"
      ]
    });
    var res = subSearch.run().getRange({ start: 0, end: 1000 });
    for (var i = 0; i < res.length; i++) {
      sublist.setSublistValue({
        id: "custpage_child_recordid",
        line: i,
        value: res[i].getValue("internalid") || ""
      });
      sublist.setSublistValue({
        id: "custpage_salesorde_tranid",
        line: i,
        value: res[i].getValue("custrecord_pe_os_detalle_confirm") || ""
      });

      sublist.setSublistValue({
        id: "custpage_child_importe",
        line: i,
        value: res[i].getValue("custrecord_pe_importe_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_moneda",
        line: i,
        value: res[i].getValue("custrecord_pe_moneda_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_cliente",
        line: i,
        value: res[i].getValue("custrecord_pe_cliente_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_saldo_confirmacion",
        line: i,
        value: res[i].getValue("custrecord_pe_saldo_detalle_confirm") || ""
      });
      sublist.setSublistValue({
        id: "custpage_child_tipo_cambio",
        line: i,
        value: res[i].getValue("custrecord_pe_tipo_cambio_detalle_confir") || ""
      });
      var fCh = res[i].getValue("custrecord_pe_fecha_detalle_confirm");
      if (fCh) {
        sublist.setSublistValue({
          id: "custpage_child_fecha",
          line: i,
          value: fCh
        });
      }
      //sublist.setSublistValue({ id: "custpage_child_os_ref", line: i, value: res[i].getValue("custrecord_pe_os_ref_detalle_confirm") });
     var osRef = res[i].getValue("custrecord_pe_os_ref_detalle_confirm");
if (osRef) {
  sublist.setSublistValue({
    id: "custpage_child_os_ref",
    line: i,
    value: osRef
  });
}
    }
  }
  function crearFormulario(serverWidget, recId, mode) {
    var formTitle = "Editar Abono";
    if (recId && mode === "edit") formTitle += " | ID:" + recId;
    var form = serverWidget.createForm({ title: formTitle });
    var fldHidden = form.addField({
      id: "custpage_hidden_recid",
      type: serverWidget.FieldType.TEXT,
      label: "Hidden Rec ID"
    });
    fldHidden.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN
    });
    fldHidden.defaultValue = recId || "";
    form.addFieldGroup({ id: "grp_principales", label: "Datos Principales" });
    form.addFieldGroup({ id: "grp_montos", label: "Montos y Fechas" });
    form.addFieldGroup({ id: "grp_obs", label: "Observaciones y Saldo" });
    form.addField({
      id: "custpage_cliente",
      type: serverWidget.FieldType.SELECT,
      label: "Cliente",
      source: "customer",
      container: "grp_principales"
    });
    form.addField({
      id: "custpage_banco",
      type: serverWidget.FieldType.SELECT,
      label: "Banco",
      source: "account",
      container: "grp_principales"
    });
    var fldMon = form.addField({
      id: "custpage_moneda",
      type: serverWidget.FieldType.SELECT,
      label: "Moneda",
      source: "currency",
      container: "grp_principales"
    });
    fldMon.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    });
    form.addField({
      id: "custpage_operacion",
      type: serverWidget.FieldType.TEXT,
      label: "Operación",
      container: "grp_principales"
    });
    form.addField({
      id: "custpage_cliente_dep_ref",
      type: serverWidget.FieldType.TEXT,
      label: "Cliente Depositante Referencial",
      container: "grp_principales"
    });
    var fldFechaOp = form.addField({
      id: "custpage_fecha_operacion",
      type: serverWidget.FieldType.DATE,
      label: "Fecha Operación",
      container: "grp_montos"
    });
    var fldTC = form.addField({
      id: "custpage_tipo_cambio",
      type: serverWidget.FieldType.TEXT,
      label: "Tipo de Cambio",
      container: "grp_montos"
    });
    fldTC.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.DISABLED
    });
    form.addField({
      id: "custpage_importe_soles",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe en Soles",
      container: "grp_montos"
    });
    form.addField({
      id: "custpage_importe_dolares",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe en Dólares",
      container: "grp_montos"
    });
    form.addField({
      id: "custpage_observaciones",
      type: serverWidget.FieldType.TEXTAREA,
      label: "Observaciones",
      container: "grp_obs"
    });
    form.addField({
      id: "custpage_saldo_restante",
      type: serverWidget.FieldType.CURRENCY,
      label: "Saldo Restante",
      container: "grp_obs"
    });
    
    
    var sublist = form.addSublist({
      id: "custpage_sublist_registros_hijos",
      label: "Subregistros",
      type: serverWidget.SublistType.INLINEEDITOR
    });
    sublist
      .addField({
        id: "custpage_child_recordid",
        type: serverWidget.FieldType.TEXT,
        label: "ID Subregistro"
      })
      .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
    sublist.addField({
      id: "custpage_salesorde_tranid",
      label: "Orden de Servicio",
      type: serverWidget.FieldType.SELECT,
      source: "transaction"
    });

    sublist.addField({
      id: "custpage_child_importe",
      type: serverWidget.FieldType.TEXT,
      label: "Importe"
    });
    sublist.addField({
      id: "custpage_child_moneda",
      type: serverWidget.FieldType.TEXT,
      label: "Moneda"
    });
    sublist.addField({
      id: "custpage_child_cliente",
      type: serverWidget.FieldType.TEXT,
      label: "Cliente OS"
    });
    sublist.addField({
      id: "custpage_child_saldo_confirmacion",
      type: serverWidget.FieldType.CURRENCY,
      label: "Importe Asociado al Deposito"
    });
    sublist.addField({
      id: "custpage_child_tipo_cambio",
      type: serverWidget.FieldType.FLOAT,
      label: "Tipo de Cambio OS"
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
    form.addSubmitButton({ label: "Actualizar" });
    form.clientScriptModulePath =
      "SuiteScripts/Desarrollo_Hunter/Hunter_Peru/appHunter/modules/PE_Deposit_confirm/ClientScript/HU_PE_CS_AutoFillSublist_DepositConfirmation.js";
    return form;
  }
  function asignarValorCampo(form, fieldId, valor) {
    var f = form.getField({ id: fieldId });
    if (!f) return;
    if (Array.isArray(valor) && valor.length) {
      f.defaultValue = valor[0].value;
    } else if (typeof valor === "string") {
      f.defaultValue = valor;
    } else {
      f.defaultValue = valor || "";
    }
  }
  return { onRequest: onRequest };
});
