/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define([
  "N/ui/serverWidget",
  "N/runtime",
  "N/url",
  "N/search",
  "N/email",
  "N/log"
], function (serverWidget, runtime, url, search, email, log) {

  var RECORD_TYPE = "customrecord_pe_confirmacion_deposito";

  var ESTADO_PENDIENTE = 1;
  var ESTADO_RELACIONADO = 2;
  var ESTADO_DENEGADO = 3;
  var ESTADO_REVALIDADO = 4;
  var ESTADO_CONFIRMADO = 5;
  var ESTADO_POR_VALIDAR = 6;

  // Roles que podrán editar solo cuando el estado sea “Relacionado”.
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

  // Roles que NO podrán cambiar estado.
  var ROLES_SIN_CAMBIO_ESTADO = [
    1867,
    1862,
    1850,
    1866,
    1864,
    1869,
    1851,
    1887
  ];

  function beforeLoad(context) {
    if (
      context.type !== context.UserEventType.VIEW &&
      context.type !== context.UserEventType.EDIT &&
      context.type !== context.UserEventType.CREATE
    ) {
      return;
    }

    var form = context.form;
    var rec = context.newRecord;

    var estado = Number(rec.getValue({
      fieldId: "custrecord_pe_estado_confirm"
    })) || 0;

    var estados = {};

    estados[ESTADO_PENDIENTE] = "Pendiente";
    estados[ESTADO_RELACIONADO] = "Relacionado";
    estados[ESTADO_DENEGADO] = "Denegado";
    estados[ESTADO_REVALIDADO] = "Revalidado";
    estados[ESTADO_CONFIRMADO] = "Confirmado";
    estados[ESTADO_POR_VALIDAR] = "Por Validar";

    var userObj = runtime.getCurrentUser();
    var userDepartment = Number(userObj.department) || 0;
    var userRole = Number(userObj.role) || 0;
    var recId = rec.id;

    /*──────────────── BOTÓN EDIT ────────────────*/

    var puedeEditar =
      userRole === 1809 ||
      userRole === 1797 ||
      (
        estado === ESTADO_RELACIONADO &&
        ROLES_EDIT_RELACION.indexOf(userRole) > -1
      );

    if (!puedeEditar) {
      var editButton = form.getButton({
        id: "edit"
      });

      if (editButton) {
        form.removeButton({
          id: "edit"
        });
      }
    }

    /*──────────────── CABECERA DE ESTADO ─────────*/

    form.title = "Confirmación de Depósitos";

    var estadoTexto =
      estados[estado] ||
      String(estado || "SIN ESTADO");

    var headerField = form.addField({
      id: "custpage_estado_header",
      type: serverWidget.FieldType.INLINEHTML,
      label: "Estado"
    });

    headerField.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
    });

    var badgeStyle = [
      "display:inline-block",
      "font-size:18px",
      "font-weight:bold",
      "color:#333",
      "background-color:#ebedef",
      "border:1px solid #d0d0d0",
      "border-radius:4px",
      "padding:3px 8px",
      "margin-bottom:6px"
    ].join(";");

    headerField.defaultValue =
      "<div style='" + badgeStyle + "'>" +
      escapeHtml(String(estadoTexto).toUpperCase()) +
      "</div>";

    /*──────────────── BOTONES DE ESTADO ─────────*/

    var esRolRestringido =
      ROLES_SIN_CAMBIO_ESTADO.indexOf(userRole) > -1;

    /*
     * Los botones que procesan el registro solo se muestran
     * cuando el registro ya existe.
     */
    if (recId) {
      if (
        !esRolRestringido &&
        estado !== ESTADO_DENEGADO &&
        estado !== ESTADO_CONFIRMADO &&
        estado !== ESTADO_REVALIDADO
      ) {
        form.addButton({
          id: "custpage_btn_porvalidar",
          label: "Por Validar",
          functionName: "setEstadoPorValidar"
        });

        form.addButton({
          id: "custpage_btn_confirm",
          label: "Confirmar",
          functionName: 'goToSuitelet("confirm")'
        });

        form.addButton({
          id: "custpage_btn_denegar",
          label: "Denegar",
          functionName: 'goToSuitelet("denegar")'
        });
      } else if (
        estado === ESTADO_CONFIRMADO &&
        !esRolRestringido
      ) {
        form.addButton({
          id: "custpage_btn_revalidado",
          label: "Revalidado",
          functionName: "setEstadoRevalidado"
        });
      } else if (
        estado === ESTADO_REVALIDADO &&
        !esRolRestringido
      ) {
        form.addButton({
          id: "custpage_btn_denegar",
          label: "Denegar",
          functionName: 'goToSuitelet("denegar")'
        });

        form.addButton({
          id: "custpage_btn_confirm",
          label: "Confirmar",
          functionName: 'goToSuitelet("confirm")'
        });

        form.addButton({
          id: "custpage_btn_porvalidar",
          label: "Por Validar",
          functionName: "setEstadoPorValidar"
        });
      }

      /*──────────────── BOTÓN ANULAR ────────────────*/

      form.addButton({
        id: "custpage_btn_anulado",
        label: "Anular",
        functionName: "setRegistroAnulado"
      });
    }

    /*──────────────── URLs a Suitelets ───────────*/

    if (
      recId &&
      (
        userDepartment === 300 ||
        userDepartment === 245 ||
        userDepartment === 299 ||
        userDepartment === 331 ||
        userDepartment === 298
      )
    ) {
      var suiteletUrlView = url.resolveScript({
        scriptId: "customscript_hu_pe_sl_depositconfirm",
        deploymentId: "customdeploy_hu_pe_sl_depositconfim",
        returnExternalUrl: false,
        params: {
          custparam_id: recId,
          mode: "view"
        }
      });

      form.addButton({
        id: "custpage_btn_suitelet_view",
        label: "Crear Abono",
        functionName:
          "goToSuiteletView('" + suiteletUrlView + "')"
      });

      if (estado === ESTADO_DENEGADO) {
        var suiteletUrlEdit = url.resolveScript({
          scriptId: "customscript_hu_pe_sl_depositconfirmedit",
          deploymentId: "customdeploy_hu_pe_sl_depositconfirmedit",
          returnExternalUrl: false,
          params: {
            custparam_id: recId,
            mode: "edit"
          }
        });

        form.addButton({
          id: "custpage_btn_suitelet_edit",
          label: "Editar Abono",
          functionName:
            "goToSuiteletEdit('" + suiteletUrlEdit + "')"
        });
      }
    }

    form.clientScriptModulePath =
      "SuiteScripts/Desarrollo_Hunter/Hunter_Peru/" +
      "appHunter/modules/PE_Deposit_confirm/ClientScript/" +
      "HU_PE_CS_DepositConfirmationUE.js";

    /*────────────── RESTRICCIÓN DE CAMPOS ──────────────*/

    var debeBloquear =
      runtime.executionContext !==
        runtime.ContextType.SUITELET &&
      !(
        userDepartment === 245 ||
        userRole === 1809 ||
        userRole === 1797 ||
        (
          estado === ESTADO_RELACIONADO &&
          ROLES_EDIT_RELACION.indexOf(userRole) > -1
        )
      );

    if (debeBloquear) {
      var disableField = form.addField({
        id: "custpage_disablefields",
        type: serverWidget.FieldType.INLINEHTML,
        label: "deshabilitar campos"
      });

      disableField.defaultValue =
        "<script>" +
        "document.addEventListener(" +
        "'DOMContentLoaded'," +
        "function(){" +
        "var e=document.querySelectorAll(" +
        "'input:not([type=button]):not([type=submit])," +
        " select, textarea'" +
        ");" +
        "e.forEach(function(x){" +
        "x.disabled=true;" +
        "});" +
        "});" +
        "</script>";
    }
  }

  function beforeSubmit(context) {
    if (
      context.type === context.UserEventType.CREATE ||
      context.type === context.UserEventType.EDIT
    ) {
      context.newRecord.setValue({
        fieldId: "custrecord_pe_fecha_confirm",
        value: new Date()
      });
    }
  }

  /**
   * El correo se procesa en servidor.
   *
   * Se envía exclusivamente en la transición:
   * RELACIONADO (2) -> POR VALIDAR (6).
   */
  function afterSubmit(context) {
    try {
      if (!context.oldRecord || !context.newRecord) {
        return;
      }

      var estadoAnterior = Number(
        context.oldRecord.getValue({
          fieldId: "custrecord_pe_estado_confirm"
        })
      ) || 0;

      var estadoNuevo = Number(
        context.newRecord.getValue({
          fieldId: "custrecord_pe_estado_confirm"
        })
      ) || 0;

      if (
        estadoAnterior !== ESTADO_RELACIONADO ||
        estadoNuevo !== ESTADO_POR_VALIDAR
      ) {
        return;
      }

      enviarCorreoRelacionadoAPorValidar(
        context.newRecord.id
      );
    } catch (e) {
      /*
       * No se vuelve a lanzar el error porque el registro
       * ya fue guardado.
       */
      log.error({
        title:
          "afterSubmit - correo Relacionado a Por Validar",
        details: e
      });
    }
  }

  function enviarCorreoRelacionadoAPorValidar(recId) {
    var status = "POR VALIDAR";

    var deposito = search.lookupFields({
      type: RECORD_TYPE,
      id: recId,
      columns: [
        "name",
        "custrecord_pe_ejecutivo_venta_confirm",
        "custrecord_pe_ejecutiva_finanzas_confirm",
        "custrecord_pe_motivo_cancelacion_confirm",
        "custrecord_pe_observacione_deneg_confirm"
      ]
    });

    var name =
      normalizeLookupText(deposito.name) ||
      ("ID: " + recId);

    var fin = getLookupId(
      deposito.custrecord_pe_ejecutiva_finanzas_confirm
    );

    var ven = getLookupId(
      deposito.custrecord_pe_ejecutivo_venta_confirm
    );

    var motivo = normalizeLookupText(
      deposito.custrecord_pe_motivo_cancelacion_confirm
    ) || "No registrado";

    var obs = normalizeLookupText(
      deposito.custrecord_pe_observacione_deneg_confirm
    ) || "No registrada";

    var so = getOrdenesServicio(recId);

    var detalleOrdenes = so.length > 0
      ? so.map(function (x) {
          return "- " + x + "\n";
        }).join("")
      : "- No registradas\n";

    var body =
      "Estimado(a),\n\n" +
      "El registro \"" +
      name +
      "\" cambió de estado a: " +
      status +
      ".\n\n" +
      "Órdenes de servicio:\n" +
      detalleOrdenes +
      "\nMotivo de cancelación: " +
      motivo +
      "\nObservación de estado: " +
      obs +
      "\n\nSaludos cordiales";

    /*
     * Si no existe ejecutiva de finanzas,
     * el grupo de finanzas será el destinatario principal.
     */
    var recipients = fin
      ? [fin]
      : ["grupofinanzas@hunter.com.pe"];

    var cc = uniqueRecipients([
      ven,
      "grupofinanzas@hunter.com.pe",
      "grupotesoreria@hunter.com.pe",
      "fdelatorre@hunter.com.pe",
      "mheredia@hunter.com.pe"
    ], recipients);

    email.send({
      author: runtime.getCurrentUser().id,
      recipients: recipients,
      cc: cc,
      subject:
        "Depósito " + name + " - " + status,
      body: body
    });

    log.audit({
      title: "MAIL",
      details:
        "Enviado | Accion=" +
        status +
        " | Transicion=RELACIONADO->POR VALIDAR" +
        " | recId=" +
        recId
    });
  }

  function getOrdenesServicio(recId) {
    var osList = [];
    var osEncontradas = {};

    search.create({
      type: "customrecord_pe_confirmacion_deposito_os",
      filters: [
        [
          "custrecord_pe_detalle_confirm",
          "anyof",
          recId
        ]
      ],
      columns: [
        "custrecord_pe_os_detalle_confirm"
      ]
    }).run().each(function (result) {
      var osText =
        result.getText({
          name: "custrecord_pe_os_detalle_confirm"
        }) ||
        result.getValue({
          name: "custrecord_pe_os_detalle_confirm"
        }) ||
        "";

      osText = String(osText).trim();

      if (osText && !osEncontradas[osText]) {
        osEncontradas[osText] = true;
        osList.push(osText);
      }

      return true;
    });

    return osList;
  }

  function getLookupId(value) {
    if (
      Array.isArray(value) &&
      value.length > 0
    ) {
      return value[0].value || "";
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return value.value || "";
    }

    return value || "";
  }

  function normalizeLookupText(value) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "";
      }

      return value.map(function (item) {
        if (
          item &&
          typeof item === "object"
        ) {
          return (
            item.text ||
            item.value ||
            ""
          );
        }

        return item || "";
      }).filter(function (item) {
        return item !== "";
      }).join(", ");
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return (
        value.text ||
        value.value ||
        ""
      );
    }

    return value === null ||
      value === undefined
      ? ""
      : String(value);
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    beforeLoad: beforeLoad,
    beforeSubmit: beforeSubmit,
    afterSubmit: afterSubmit
  };
});