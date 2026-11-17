/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["N/record", "N/search", "N/log", "N/format"], function (record, search, log, format) {

  //Pagos Mixtos
  /* ────────── UTIL ────────── */
  function formatDateToDDMMYYYY(date) {
    if (!date) return "";
    var d = date.getDate().toString().padStart(2, "0");
    var m = (date.getMonth() + 1).toString().padStart(2, "0");
    var y = date.getFullYear();
    return d + "/" + m + "/" + y;
  }
  function round2(n){ return Math.round(parseFloat(n || 0) * 100) / 100; }

  /* ────────── EVENTOS PRINCIPALES ────────── */
  function pageInit(context) {
    try {
      habilitarCamposMoneda(context.currentRecord);
    } catch (e) {
      log.error("pageInit error", e);
    }
  }

  function fieldChanged(context) {
    try {
      var currentRec = context.currentRecord;
      var fieldId    = context.fieldId;
      var sublistId  = context.sublistId;

      /* 1. Cambio de banco / cuenta  */
      if (!sublistId && fieldId === "custpage_banco") {
        resetImportes(currentRec);
        cargarMonedaDesdeBanco(currentRec);
        calcularTipoCambio(currentRec);
        habilitarCamposMoneda(currentRec);
        recalcularImportes(currentRec, null);      // autocompleta espejo
        recalcularSaldoRestante(currentRec);       // saldo en moneda cabecera
      }

      /* 2. Autocompletar sublista */
      if (
        sublistId === "custpage_sublist_registros_hijos" &&
        fieldId   === "custpage_salesorde_tranid"
      ) {
        autocompletarSublista(currentRec, sublistId);
        recalcularSaldoRestante(currentRec);
      }

      /* 3. Cambio de moneda o fecha de operación */
      if (
        fieldId === "custpage_moneda" ||
        fieldId === "custpage_fecha_operacion"
      ) {
        calcularTipoCambio(currentRec);
        habilitarCamposMoneda(currentRec);
        recalcularImportes(currentRec, null);
        recalcularSaldoRestante(currentRec);
      }

      /* 4. Cambio de tipo de cambio */
      if (fieldId === "custpage_tipo_cambio") {
        recalcularImportes(currentRec, null);
        recalcularSaldoRestante(currentRec);
      }

      /* 5. Cambio manual de importes */
      if (
        fieldId === "custpage_importe_soles" ||
        fieldId === "custpage_importe_dolares"
      ) {
        recalcularImportes(currentRec, fieldId);
        recalcularSaldoRestante(currentRec);
      }

      /* 6. Cambio en la sublista: saldo asociado o TC */
      if (
        sublistId === "custpage_sublist_registros_hijos" &&
        (fieldId === "custpage_child_saldo_confirmacion" ||
         fieldId === "custpage_child_tipo_cambio"        ||
         fieldId === "custpage_child_moneda")
      ) {
        recalcularSaldoRestante(currentRec);
      }

    } catch (e) {
      log.error("fieldChanged error", e);
    }
  }

  function sublistChanged(context) {
    if (context.sublistId === "custpage_sublist_registros_hijos") {
      recalcularSaldoRestante(context.currentRecord);
    }
  }

  /* ────────── FUNCIONES AUXILIARES ────────── */

  function habilitarCamposMoneda(currentRec) {
    var moneda = currentRec.getValue({ fieldId: "custpage_moneda" });
    var fSoles   = currentRec.getField({ fieldId: "custpage_importe_soles"   });
    var fDolares = currentRec.getField({ fieldId: "custpage_importe_dolares" });
    if (moneda === "5") {          // Soles (PEN)
      if (fSoles)   fSoles.isDisabled   = false;
      if (fDolares) fDolares.isDisabled = true;
    } else if (moneda === "1") {   // US Dollar (USD)
      if (fSoles)   fSoles.isDisabled   = true;
      if (fDolares) fDolares.isDisabled = false;
    } else {                       // Otra / vacío
      if (fSoles)   fSoles.isDisabled   = false;
      if (fDolares) fDolares.isDisabled = false;
    }
  }

  function resetImportes(currentRec) {
    currentRec.setValue({ fieldId: "custpage_importe_soles",   value: "" });
    currentRec.setValue({ fieldId: "custpage_importe_dolares", value: "" });
  }

  function cargarMonedaDesdeBanco(currentRec) {
    var bankId = currentRec.getValue({ fieldId: "custpage_banco" });
    if (!bankId) return;
    try {
      var bankRec = record.load({ type: record.Type.ACCOUNT, id: bankId });
      var currencyValue = bankRec.getValue({ fieldId: "currency" });
      if (currencyValue) {
        currentRec.setValue({ fieldId: "custpage_moneda", value: currencyValue });
        calcularTipoCambio(currentRec);
        habilitarCamposMoneda(currentRec);
      }
    } catch (e) {
      log.error("Error al cargar el banco", e);
    }
  }

  function autocompletarSublista(currentRec, sublistId) {
    var tranId = currentRec.getCurrentSublistValue({
      sublistId: sublistId,
      fieldId: "custpage_salesorde_tranid"
    });
    if (!tranId) return;

    var lookup = search.lookupFields({
      type: "transaction",
      id: tranId,
      columns: ["entity", "currency", "exchangerate", "fxamount", "trandate", "tranid"]
    });

    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_internalid", value: tranId });
    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_cliente",    value: lookup.entity   ? lookup.entity[0].text   : "" });
    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_moneda",     value: lookup.currency ? lookup.currency[0].text : "" });
    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_tipo_cambio",value: lookup.exchangerate || "" });
    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_importe",    value: lookup.fxamount   || "" });
    currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_os_ref",     value: lookup.tranid     || "" });

    var dateString = lookup.trandate;
    if (dateString) {
      var soloFecha = dateString.split(" ")[0];
      var partes = soloFecha.split("/");
      if (partes.length === 3) {
        var jsDate = new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
        currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_child_fecha", value: jsDate });
      }
    }
  }

function calcularTipoCambio(currentRec) {
    var selFecha = currentRec.getValue({ fieldId: "custpage_fecha_operacion" });
    if (!selFecha) {
      currentRec.setValue({ fieldId: "custpage_tipo_cambio", value: "" });
      return;
    }

    // OJO: verifica que estos IDs sean correctos en TU cuenta
    var PEN_ID = "5";
    var USD_ID = "1";

    // Formato de fecha correcto según preferencias de la cuenta
    var formattedDate = format.format({
      value: new Date(selFecha),
      type: format.Type.DATE
    });

    // 1) Intento A: base=PEN, tran=USD  => exchangerate esperado = PEN por 1 USD (lo que tú quieres)
    var ratePENperUSD = buscarRate(PEN_ID, USD_ID, formattedDate);

    // 2) Si no existe o vino invertido por configuración, intento B: base=USD, tran=PEN
    //    exchangerate ahí suele ser USD por 1 PEN, entonces invertimos para obtener PEN por 1 USD
    if (!ratePENperUSD) {
      var rateUSDperPEN = buscarRate(USD_ID, PEN_ID, formattedDate);
      if (rateUSDperPEN) {
        var inv = 1 / parseFloat(rateUSDperPEN);
        ratePENperUSD = inv ? inv : "";
      }
    }

    currentRec.setValue({
      fieldId: "custpage_tipo_cambio",
      value: ratePENperUSD ? parseFloat(ratePENperUSD).toFixed(9) : ""
    });
  }

  function buscarRate(baseId, tranId, formattedDate) {
    var sObj = search.create({
      type: "currencyrate",
      filters: [
        ["basecurrency", "anyof", baseId],
        "AND",
        ["transactioncurrency", "anyof", tranId],
        "AND",
        ["effectivedate", "onorbefore", formattedDate]
      ],
      columns: [
        search.createColumn({ name: "effectivedate", sort: search.Sort.DESC }),
        "exchangerate"
      ]
    });

    var res = sObj.run().getRange({ start: 0, end: 1 });
    return (res && res.length) ? res[0].getValue({ name: "exchangerate" }) : "";
  }


  /* ────── LÓGICA DE IMPORTES CABECERA ────── */
  function recalcularImportes(currentRec, changedFieldId) {
    var moneda = currentRec.getValue({ fieldId: "custpage_moneda" }); // "5" PEN, "1" USD
    var tc     = parseFloat(currentRec.getValue({ fieldId: "custpage_tipo_cambio" }) || 0);
    if (!tc) return;

    var soles   = parseFloat(currentRec.getValue({ fieldId: "custpage_importe_soles"   }) || 0);
    var dolares = parseFloat(currentRec.getValue({ fieldId: "custpage_importe_dolares" }) || 0);

    // llamado general: rellena el vacío con el espejo
    if (changedFieldId === null) {
      if (moneda === "5") { // PEN cabecera
        if (soles && !dolares) currentRec.setValue({ fieldId: "custpage_importe_dolares", value: (soles / tc).toFixed(2) });
        if (dolares && !soles) currentRec.setValue({ fieldId: "custpage_importe_soles",   value: (dolares * tc).toFixed(2) });
      } else if (moneda === "1") { // USD cabecera
        if (dolares && !soles) currentRec.setValue({ fieldId: "custpage_importe_soles",   value: (dolares * tc).toFixed(2) });
        if (soles && !dolares) currentRec.setValue({ fieldId: "custpage_importe_dolares", value: (soles / tc).toFixed(2) });
      }
      return;
    }

    // cambios explícitos
    if (moneda === "5" && changedFieldId === "custpage_importe_soles") {
      currentRec.setValue({ fieldId: "custpage_importe_dolares", value: (soles / tc).toFixed(2) });
    }
    if (moneda === "1" && changedFieldId === "custpage_importe_dolares") {
      currentRec.setValue({ fieldId: "custpage_importe_soles",   value: (dolares * tc).toFixed(2) });
    }
  }

  /* ────── NUEVO: SIEMPRE DESCUENTA EN MONEDA DE CABECERA ────── */
  function recalcularSaldoRestante(currentRec) {
    var monedaCab    = currentRec.getValue({ fieldId: "custpage_moneda" }); // "5" PEN, "1" USD
    var totalSoles   = parseFloat(currentRec.getValue({ fieldId: "custpage_importe_soles"   }) || 0);
    var totalDolares = parseFloat(currentRec.getValue({ fieldId: "custpage_importe_dolares" }) || 0);
    var tcCab        = parseFloat(currentRec.getValue({ fieldId: "custpage_tipo_cambio"     }) || 0);

    var sumaCabecera = 0;
    var count = currentRec.getLineCount({ sublistId: "custpage_sublist_registros_hijos" });

    for (var i = 0; i < count; i++) {
      var childMoneda = currentRec.getSublistValue({
        sublistId: "custpage_sublist_registros_hijos",
        fieldId: "custpage_child_moneda",
        line: i
      });
      var saldo = parseFloat(currentRec.getSublistValue({
        sublistId: "custpage_sublist_registros_hijos",
        fieldId: "custpage_child_saldo_confirmacion",
        line: i
      }) || 0);
      var tcLinea = parseFloat(currentRec.getSublistValue({
        sublistId: "custpage_sublist_registros_hijos",
        fieldId: "custpage_child_tipo_cambio",
        line: i
      }) || 0);

      var tc = tcLinea || tcCab; // prioridad: línea, luego cabecera
      // Si no hay TC y se requiere convertir, no sumamos esa línea
      if (!tc && childMoneda && monedaCab &&
          ((monedaCab === "5" && childMoneda === "US Dollar") ||
           (monedaCab === "1" && childMoneda === "Soles"))) {
        continue;
      }

      var aporte = 0;
      if (monedaCab === "5") { // Cabecera PEN
        aporte = (childMoneda === "US Dollar") ? saldo * tc : saldo;
      } else if (monedaCab === "1") { // Cabecera USD
        aporte = (childMoneda === "Soles") ? (tc ? saldo / tc : 0) : saldo;
      } else {
        aporte = saldo; // otras monedas: sin conversión (ajustar si aplica)
      }
      sumaCabecera = round2(sumaCabecera + aporte);
    }

    var saldoRestante = 0;
    if (monedaCab === "5")  saldoRestante = round2(totalSoles   - sumaCabecera);
    if (monedaCab === "1")  saldoRestante = round2(totalDolares - sumaCabecera);

    currentRec.setValue({ fieldId: "custpage_saldo_restante", value: saldoRestante });
  }

  /* ────────── EXPORTS ────────── */
  return {
    pageInit:       pageInit,
    fieldChanged:   fieldChanged,
    sublistChanged: sublistChanged
  };
});
