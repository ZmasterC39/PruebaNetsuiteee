/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/log", "N/url", "N/search"], function (log, url, search) {
  var data;
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {
    data = scriptContext;
    let ubicacion = scriptContext.currentRecord.getValue({
      fieldId: "ubicacion",
    });

  }

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {
    try {
      let cliente = scriptContext.currentRecord.getValue({ fieldId: "cliente" });
      let fechaInicio = scriptContext.currentRecord.getValue({ fieldId: "fecha_inicio" });
      let fechaFin = scriptContext.currentRecord.getValue({ fieldId: "fecha_fin" });
      let agrupador = scriptContext.currentRecord.getValue({ fieldId: "agrupador" });

      let params = {
        flag: "searchFacturaFin",
        cliente: cliente,
        fechaInicio: fechaInicio != "" ? new Date(fechaInicio) : "",
        fechaFin: fechaFin != "" ? new Date(fechaFin) : "",
        agrupador: agrupador,
      };

      //Validamos que esten llenos los campos obligatorios
      if (params.fechaInicio != "" && params.fechaFin != "" && scriptContext.fieldId != "check") {
        params = JSON.stringify(params);
        window.onbeforeunload = null;
        let ruta = url.resolveScript({
          scriptId: "customscript_ts_sl_extornar_facturas",
          deploymentId: "customdeploy_ts_sl_extornar_facturas",
          params: {
            custscript_ts_context: params,
          },
          returnExternalUrl: false,
        });

        setWindowChanged(window, false);
        window.location.href = ruta;




      }
    } catch (e) {
      console.log("Error", e.message);
    }
  }

  /**
   * Function para calcular el importe total
   *
   */

  function calcularImporte() {
    try {
      var status = true;
      var mensaje = "Se Puede Extornar orden Venta";
      let scriptContext = data;
      let sublistLineCount = scriptContext.currentRecord.getLineCount({ sublistId: "sublista", });
      var salesorderarray = [];

      for (let i = 0; i < sublistLineCount; i++) {
        let isSelected = scriptContext.currentRecord.getSublistValue({ sublistId: "sublista", fieldId: "check", line: i, });
        if (isSelected) {
          let id = scriptContext.currentRecord.getSublistValue({ sublistId: "sublista", fieldId: "id", line: i, });
          salesorderarray.push(id);
        }
      }

      var transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ "name": "consolidationtype", "value": "NONE" }],
        filters:
          [
            ["type", "anyof", "CuTrSale112"],
            "AND",
            ["custbody_ec_created_from_fac_int", "anyof", salesorderarray]
          ],
        columns:
          [
            search.createColumn({ name: "custbody_ht_factura_directa", label: "HT Factura Directa Agrupada" }),
            search.createColumn({ name: "custcol_ht_fac_agru", label: "HT Factura Agrupada" }),
          ]
      });
      var facturaAgrupada = [];
      transactionSearchObj.run().each(function (result) {
        facturaAgrupada.push(result.getValue({ name: "custbody_ht_factura_directa" }));
        facturaAgrupada.push(result.getValue({ name: "custcol_ht_fac_agru", label: "HT Factura Agrupada" }));
        return true;
      });
      const dataArr = new Set(facturaAgrupada.filter(val => val && val.trim() !== ''));
      const results = [...dataArr];
      if (results.length) {
        var estadorelacionado = validarFactura(results);
        if (estadorelacionado) {
          var transactionSearchObjs = search.create({
            type: search.Type.INVOICE,
            filters:
              [["internalid", "anyof", results]],
            columns:
              [
                search.createColumn({ name: "statusref" }),
                search.createColumn({ name: "custbody_psg_ei_status" }),
              ]
          });
          transactionSearchObjs.run().each(function (result) {
            var statusref = result.getValue({ name: "statusref" });
            var custbody_psg_ei_status = result.getValue({ name: "custbody_psg_ei_status" });
            if (statusref != "open" && custbody_psg_ei_status != '7') {
              mensaje = "La factura Agrupada ya fue Emitido o tiene un pago relacionado";
              status = false;
              return false;
            }
            return true;
          });

        } else {
          mensaje = "Tiene un documento Relacionado";
          status = false
        }
      }
      alert(mensaje);
      return status;
    } catch (error) {
      console.log(error);
      return true;
    }


  }

  function validarFactura(invoiceId) {
    const results = search.create({
      type: search.Type.TRANSACTION,
      filters: [
        ['createdfrom.internalid', 'anyof', invoiceId],
        'AND',
        ['mainline', 'is', 'T']
      ],
      columns: ['internalid']
    }).run().getRange({ start: 0, end: 1 });

    return results.length === 0;
  }
  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {

    let sublistLineCount = scriptContext.currentRecord.getLineCount({ sublistId: "sublista" });

    let sublistValida = false;
    for (let i = 0; i < sublistLineCount; i++) {
      let isSelected = scriptContext.currentRecord.getSublistValue({
        sublistId: "sublista",
        fieldId: "check",
        line: i,
      });

      if (isSelected) {
        sublistValida = true;
        break;
      }
    }

    if (!sublistValida) {
      alert("Debe seleccionar al menos un registro");
      return false;
    }

    var estado = calcularImporte();
    return estado;
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    calcularImporte: calcularImporte,
    /*  postSourcing: postSourcing,
             sublistChanged: sublistChanged,
             lineInit: lineInit,
             validateField: validateField,
             validateLine: validateLine,
             validateInsert: validateInsert,
             validateDelete: validateDelete,*/
    saveRecord: saveRecord,
  };
});
