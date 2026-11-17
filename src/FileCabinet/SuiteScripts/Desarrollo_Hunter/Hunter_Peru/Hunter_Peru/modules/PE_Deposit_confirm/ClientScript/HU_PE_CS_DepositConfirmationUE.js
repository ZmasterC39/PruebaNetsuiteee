/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define([
  "N/log",
  "N/currentRecord",
  "N/email",
  "N/runtime",
  "N/ui/dialog",
  "N/record",
  "N/search",
  "N/url"
], function (
  log,
  currentRecord,
  email,
  runtime,
  dialog,
  record,
  search,
  url
) {

  var ESTADO_PENDIENTE = 1;
  var ESTADO_RELACIONADO = 2;
  var ESTADO_DENEGADO = 3;
  var ESTADO_REVALIDADO = 4;
  var ESTADO_CONFIRMADO = 5;
  var ESTADO_PORVALIDAR = 6;

  /*
   * Debe existir también en el Client Script.
   * Las variables del User Event no se comparten
   * con el navegador.
   */
  var ROLES_EDIT_RELACION = [
    1867,
    1862,
    1850,
    1866,
    1864,
    1869,
    1851,
    1887
  ];

  function pageInit(context) {
    try {
      var rec = currentRecord.get();

      if (context.mode === "edit") {
        var estado = Number(
          rec.getValue({
            fieldId:
              "custrecord_pe_estado_confirm"
          })
        ) || 0;

        var userRole = Number(
          runtime.getCurrentUser().role
        ) || 0;

        var fields = rec.getFields();

        var editable =
          estado === ESTADO_PENDIENTE ||
          estado === ESTADO_DENEGADO ||
          (
            estado === ESTADO_RELACIONADO &&
            ROLES_EDIT_RELACION.indexOf(
              userRole
            ) > -1
          );

        fields.forEach(function (fieldId) {
          var fieldObject = rec.getField({
            fieldId: fieldId
          });

          if (!fieldObject) {
            return;
          }

          if (
            fieldId ===
              "custrecord_pe_observacione_deneg_confirm" ||
            fieldId ===
              "custrecord_pe_motivo_cancelacion_confirm"
          ) {
            fieldObject.isDisabled = false;
          } else {
            fieldObject.isDisabled = !editable;
          }
        });
      }
    } catch (e) {
      log.error({
        title: "pageInit",
        details: e
      });

      dialog.alert({
        title: "Error",
        message: e.message
      });
    }
  }

  function fieldChanged(context) {
    try {
      if (
        context.fieldId !==
        "custrecord_pe_saldo_favor_confirm"
      ) {
        return;
      }

      var rec = currentRecord.get();

      var idSF = rec.getValue({
        fieldId:
          "custrecord_pe_saldo_favor_confirm"
      });

      if (!idSF) {
        return;
      }

      var data = search.lookupFields({
        type: "transaction",
        id: idSF,
        columns: [
          "memo",
          "custbody_pe_saldoafavor"
        ]
      });

      var memo = data.memo || "";
      var saldoFav =
        data.custbody_pe_saldoafavor || 0;

      dialog.alert({
        title:
          "Información de Saldo a Favor",
        message:
          "Saldo a favor: " +
          saldoFav +
          "\nMemo: " +
          memo
      });
    } catch (e) {
      log.error({
        title: "fieldChanged",
        details: e
      });

      dialog.alert({
        title: "Error",
        message: e.message
      });
    }
  }

  function setEstadoPorValidar() {
    actualizarEstado(
      ESTADO_PORVALIDAR
    );
  }

  function setEstadoRevalidado() {
    actualizarEstado(
      ESTADO_REVALIDADO
    );
  }

  function actualizarEstado(estadoId) {
    try {
      var rec = currentRecord.get();
      var rId = rec.id;
      var rType = rec.type;

      if (!rId) {
        return;
      }

      var usrId =
        runtime.getCurrentUser().id;

      record.submitFields({
        type: rType,
        id: rId,
        values: {
          custrecord_pe_estado_confirm:
            estadoId,
          custrecord_pe_ejecutiva_finanzas_confirm:
            usrId
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true
        }
      });

      /*
       * El correo de RELACIONADO -> POR VALIDAR
       * ya no se envía desde el Client Script.
       *
       * Lo procesa el afterSubmit del User Event,
       * validando la transición real y evitando
       * duplicados.
       */

      if (
        estadoId === ESTADO_REVALIDADO
      ) {
        enviarCorreoEstado(
          rId,
          "REVALIDADO"
        );
      }

      if (
        estadoId === ESTADO_CONFIRMADO
      ) {
        enviarCorreoEstado(
          rId,
          "CONFIRMADO"
        );
      }

      dialog.alert({
        title: "Éxito",
        message: "Estado actualizado."
      }).then(function () {
        location.reload();
      });
    } catch (e) {
      log.error({
        title: "actualizarEstado",
        details: e
      });

      dialog.alert({
        title: "Error",
        message: e.message
      });
    }
  }

  function enviarCorreoEstado(
    regId,
    estadoTexto
  ) {
    try {
      var dep = search.lookupFields({
        type:
          "customrecord_pe_confirmacion_deposito",
        id: regId,
        columns: [
          "custrecord_pe_ejecutivo_venta_confirm",
          "name",
          "custrecord_pe_ejecutiva_finanzas_confirm"
        ]
      });

      var empId =
        dep.custrecord_pe_ejecutivo_venta_confirm &&
        dep.custrecord_pe_ejecutivo_venta_confirm
          .length > 0
          ? dep
              .custrecord_pe_ejecutivo_venta_confirm[0]
              .value
          : "";

      var nombre =
        dep.name ||
        ("ID: " + regId);

      var ejFinanzasId =
        dep.custrecord_pe_ejecutiva_finanzas_confirm &&
        dep.custrecord_pe_ejecutiva_finanzas_confirm
          .length > 0
          ? dep
              .custrecord_pe_ejecutiva_finanzas_confirm[0]
              .value
          : "";

      var ejFinanzasEmail = "";

      if (ejFinanzasId) {
        var fData = search.lookupFields({
          type: record.Type.EMPLOYEE,
          id: ejFinanzasId,
          columns: ["email"]
        });

        ejFinanzasEmail =
          fData.email || "";
      }

      var empEmail = "";

      if (empId) {
        var empData = search.lookupFields({
          type: record.Type.EMPLOYEE,
          id: empId,
          columns: ["email"]
        });

        empEmail =
          empData.email || "";
      }

      var userId =
        runtime.getCurrentUser().id;

      var userData =
        search.lookupFields({
          type: record.Type.EMPLOYEE,
          id: userId,
          columns: ["email"]
        });

      var userEmail =
        userData.email || "";

      var ordenesServicio =
        getOrdenesServicio(regId);

      var bodyOS =
        ordenesServicio.length > 0
          ? "\nÓrdenes de servicio:\n  - " +
            ordenesServicio.join("\n  - ")
          : "\nÓrdenes de servicio: " +
            "No registradas";

      var subject =
        "Notificación de Estado: " +
        estadoTexto;

      var body =
        "Estimado/a,\n\n" +
        "El registro '" +
        nombre +
        "' cambió a: " +
        estadoTexto +
        "." +
        bodyOS +
        "\n\nSaludos cordiales";

      var recipients =
        uniqueRecipients([
          "mheredia@hunter.com.pe",
          "fdelatorre@hunter.com.pe",
          empEmail
        ]);

      var cc = uniqueRecipients([
        userEmail,
        ejFinanzasEmail
      ], recipients);

      email.send({
        author: userId,
        recipients: recipients,
        cc: cc,
        subject: subject,
        body: body
      });
    } catch (e) {
      log.error({
        title: "enviarCorreoEstado",
        details: e
      });

      dialog.alert({
        title: "Error",
        message: e.message
      });
    }
  }

  function getOrdenesServicio(regId) {
    var osList = [];
    var osEncontradas = {};

    search.create({
      type:
        "customrecord_pe_confirmacion_deposito_os",
      filters: [
        [
          "custrecord_pe_detalle_confirm",
          "anyof",
          regId
        ]
      ],
      columns: [
        "custrecord_pe_os_detalle_confirm"
      ]
    }).run().each(function (result) {
      var osText =
        result.getText({
          name:
            "custrecord_pe_os_detalle_confirm"
        }) ||
        result.getValue({
          name:
            "custrecord_pe_os_detalle_confirm"
        }) ||
        "";

      osText =
        String(osText).trim();

      if (
        osText &&
        !osEncontradas[osText]
      ) {
        osEncontradas[osText] = true;
        osList.push(osText);
      }

      return true;
    });

    return osList;
  }

  function goToSuiteletView(
    suiteletUrl
  ) {
    window.location = suiteletUrl;
  }

  function goToSuiteletEdit(
    suiteletUrl
  ) {
    window.location = suiteletUrl;
  }

  function goToSuitelet(accion) {
    var rec = currentRecord.get();
    var recId = rec.id;

    if (!recId) {
      return;
    }

    var suiteletUrl =
      url.resolveScript({
        scriptId:
          "customscript_hu_pe_sl_depositconfirmdeni",
        deploymentId:
          "customdeploy_hu_pe_sl_depositconfirmden",
        returnExternalUrl: false,
        params: {
          custparam_id: recId,
          accion: accion
        }
      });

    window.location = suiteletUrl;
  }

  function setRegistroAnulado() {
    try {
      var rec = currentRecord.get();
      var rId = rec.id;
      var rType = rec.type;

      if (!rId) {
        return;
      }

      record.submitFields({
        type: rType,
        id: rId,
        values: {
          isinactive: true
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true
        }
      });

      dialog.alert({
        title: "Registro anulado",
        message:
          "El registro fue marcado como inactivo."
      }).then(function () {
        location.reload();
      });
    } catch (e) {
      log.error({
        title: "setRegistroAnulado",
        details: e
      });

      dialog.alert({
        title: "Error",
        message: e.message
      });
    }
  }

  function uniqueRecipients(
    values,
    excludedValues
  ) {
    var result = [];
    var seen = {};

    (excludedValues || []).forEach(
      function (value) {
        if (
          value !== null &&
          value !== undefined &&
          value !== ""
        ) {
          seen[
            String(value).toLowerCase()
          ] = true;
        }
      }
    );

    (values || []).forEach(
      function (value) {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }

        var key =
          String(value).toLowerCase();

        if (!seen[key]) {
          seen[key] = true;
          result.push(value);
        }
      }
    );

    return result;
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    setEstadoPorValidar:
      setEstadoPorValidar,
    setEstadoRevalidado:
      setEstadoRevalidado,
    goToSuiteletView:
      goToSuiteletView,
    goToSuiteletEdit:
      goToSuiteletEdit,
    setRegistroAnulado:
      setRegistroAnulado,
    goToSuitelet:
      goToSuitelet
  };
});