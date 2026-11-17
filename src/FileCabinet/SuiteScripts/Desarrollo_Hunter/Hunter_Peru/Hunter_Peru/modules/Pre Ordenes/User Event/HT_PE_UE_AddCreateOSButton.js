/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @Description Banner, botón "Crear OS", mapeo Oficina→Departamento
 *              y LOG solo para la CONVERSIÓN PRE→SO. Agregado: recálculo
 *              de Precio Unitario e Importe de Impuestos desde "Total con Impuestos".
 */
define(['N/ui/serverWidget', 'N/record', 'N/log', 'N/ui/message', 'N/runtime'],
  (ui, record, log, message, runtime) => {

  /* ====================== CONFIG MENSAJE SUPERIOR ====================== */
  const PAGE_MSG_ENABLED  = true;
  const PAGE_MSG_TYPE     = message.Type.INFORMATION;
  const PAGE_MSG_TITLE    = 'Aviso';
  const PAGE_MSG_BODY     = 'Ingresa solo la <b>Oficina</b> en cabecera. El <b>Departamento</b> se asignará automáticamente y se replicará a cada línea del artículo.';
  const PAGE_MSG_DURATION = 0;

  /* =================== CONFIG MAPEOS / PROPAGACIÓN ===================== */
  const SUB_ID       = 'recmachcustrecord_ht_pe_po_detalle_articulo';
  const FLD_OFI_MAIN = 'custrecord_ht_pe_po_oficina';
  const FLD_DEP_MAIN = 'custrecord_ht_pe_po_departamento';
  const FLD_OFI_LINE = 'custrecord_ht_pe_po_oficina1';
  const FLD_DEP_LINE = 'custrecord_ht_pe_po_departamento1';
  const FLD_OS_REL   = 'custrecord_ht_pe_po_os_relacionada';

  // ---- NUEVO: IDs de montos en la sublista ----
  const FLD_QTY_LINE     = 'custrecord_ht_pe_po_cantidad';
  const FLD_TOTAL_INC    = 'custrecord_ht_pe_po_total_impuestos';   // Total con Impuestos (bruto)
  const FLD_RATE_LINE    = 'custrecord_ht_pe_po_tasa_impuesto';     // Porcentaje
  const FLD_UNIT_PRICE   = 'custrecord_ht_pe_po_precio_unitario';   // Unitario (sin IGV)
  const FLD_TAX_AMOUNT   = 'custrecord_ht_pe_po_importe_impuestos'; // Importe IGV

  // Forzar sobre-escritura en líneas al guardar
  const FORCE_OVERRIDE_LINES = true;

  // Mapa Oficina → Departamento
  const OFFICE_TO_DEPT = {
    '415': 299, // MIRAFLORES
    '416': 299, // SURQUILLO
    '417': 331, // TRUJILLO
    '418': 315, // PIURA
    '419': 283  // AREQUIPA
  };

  /* ============================== HELPERS ============================== */
  const nvlNum   = (v, d=0) => (isFinite(parseFloat(v)) ? parseFloat(v) : d);
  const round2   = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const rate01   = (r) => { r = nvlNum(r,0); return (r > 1 ? r/100 : r); };

  function mapDept(ofi) {
    if (ofi === null || ofi === '' || typeof ofi === 'undefined') return null;
    const key = String(ofi);
    return Object.prototype.hasOwnProperty.call(OFFICE_TO_DEPT, key) ? OFFICE_TO_DEPT[key] : null;
  }

  function applyOfficeDeptOnNewRecord(newRec) {
    // Cabecera
    const ofi = newRec.getValue(FLD_OFI_MAIN);
    const depBefore = newRec.getValue(FLD_DEP_MAIN);
    const depMapped = mapDept(ofi);
    if (depMapped && depBefore !== depMapped) {
      newRec.setValue({ fieldId: FLD_DEP_MAIN, value: depMapped });
    }
    const dep = newRec.getValue(FLD_DEP_MAIN);

    // Líneas
    const n = newRec.getLineCount({ sublistId: SUB_ID }) || 0;
    for (let i = 0; i < n; i++) {
      const curOfi = newRec.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, line: i });
      const curDep = newRec.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, line: i });

      if ((FORCE_OVERRIDE_LINES || !curOfi) && ofi) {
        newRec.setSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, line: i, value: ofi });
      }
      if ((FORCE_OVERRIDE_LINES || !curDep) && dep) {
        newRec.setSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, line: i, value: dep });
      }
    }
  }

  /** ====== NUEVO: Recalcular montos desde "Total con Impuestos" ====== */
  function recalcAmountsFromTotal(newRec) {
    const n = newRec.getLineCount({ sublistId: SUB_ID }) || 0;
    for (let i = 0; i < n; i++) {
      const totalInc = nvlNum(newRec.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_TOTAL_INC, line: i }), 0);
      if (!totalInc) continue; // nada que calcular

      const qty  = Math.max(1, nvlNum(newRec.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_QTY_LINE,  line: i }), 1));
      let rate   = rate01(newRec.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_RATE_LINE,   line: i }));

      const unit = round2( totalInc / qty / (1 + rate) );
      const igv  = round2( totalInc - (unit * qty) );

      newRec.setSublistValue({ sublistId: SUB_ID, fieldId: FLD_UNIT_PRICE, line: i, value: unit });
      newRec.setSublistValue({ sublistId: SUB_ID, fieldId: FLD_TAX_AMOUNT, line: i, value: igv  });
      // (Opcional) si deseas dejar siempre la tasa en 18% por defecto:
      // if (!nvlNum(newRec.getSublistValue({sublistId:SUB_ID, fieldId:FLD_RATE_LINE, line:i}), 0)) {
      //   newRec.setSublistValue({ sublistId: SUB_ID, fieldId: FLD_RATE_LINE, line: i, value: 18 });
      // }
    }
  }

  /* ============================ beforeLoad ============================= */
  const beforeLoad = (ctx) => {

    /* Tooltip en sublista: “Precio Unitario” → indicar que se edita “Total con Impuestos” */
try {
  var sub = form.getSublist({ id: SUB_ID });
  if (sub) {
    var fldUnit = sub.getField({ id: FLD_UNIT_PRICE });
    if (fldUnit && typeof fldUnit.updateHelpText === 'function') {
      fldUnit.updateHelpText({
        help:
          'Este valor se recalcula automáticamente desde «Total con Impuestos». ' +
          'Para modificarlo, edita el campo «Total con Impuestos» (custrecord_ht_pe_po_total_impuestos).',
        showOnHover: true
      });
    }
  }
} catch (e) {
  log.debug({ title: 'Tooltip Precio Unitario', details: e.message || String(e) });
}

    try {
      if (ctx.type !== ctx.UserEventType.VIEW && ctx.type !== ctx.UserEventType.EDIT) return;

      const form = ctx.form;

      // Botón para el Client Script
      form.addButton({
        id: 'custpage_btn_crear_os',
        label: 'Crear Orden de Servicio',
        functionName: 'crearOS'
      });

      // Enlaza tu Client Script (ajusta el File ID si cambia)
      form.clientScriptFileId = 1625161;

      if (PAGE_MSG_ENABLED) {
        form.addPageInitMessage({
          type: PAGE_MSG_TYPE, title: PAGE_MSG_TITLE, message: PAGE_MSG_BODY, duration: PAGE_MSG_DURATION
        });
      }
    } catch (e) {
      log.error({ title: 'UE beforeLoad error', details: `${e.name || 'Error'}: ${e.message}` });
    }
  };

  /* ============================ beforeSubmit =========================== */
  const beforeSubmit = (ctx) => {
    try {
      if (![ctx.UserEventType.CREATE, ctx.UserEventType.EDIT, ctx.UserEventType.COPY].includes(ctx.type)) return;

      // 1) Propagación Oficina→Departamento
      applyOfficeDeptOnNewRecord(ctx.newRecord);

      // 2) **Recalcular unitario e IGV** desde "Total con Impuestos"
      recalcAmountsFromTotal(ctx.newRecord);

    } catch (e) {
      log.error({ title: 'UE beforeSubmit error', details: `${e.name || 'Error'}: ${e.message}` });
    }
  };

  /* ============================= afterSubmit =========================== */
  const afterSubmit = (ctx) => {
    try {
      const preId = ctx.newRecord.id;
      if (!preId) return;

      const usuario = runtime.getCurrentUser();
      const osIdNew = ctx.newRecord.getValue(FLD_OS_REL);
      const osIdOld = (ctx.oldRecord && ctx.oldRecord.getValue(FLD_OS_REL)) || null;

      // Solo log si hubo conversión real en este guardado
      if (osIdNew && osIdNew !== osIdOld) {
        // Carga Pre-Orden para detalles
        const pre = record.load({ type: 'customrecord_ht_pe_preordenes', id: preId, isDynamic: false });

        const preName   = pre.getValue('name');
        const preClient = { id: pre.getValue('custrecord_ht_pe_po_cliente_preorden'), text: pre.getText('custrecord_ht_pe_po_cliente_preorden') };
        const preOfi    = { id: pre.getValue(FLD_OFI_MAIN), text: pre.getText(FLD_OFI_MAIN) };
        const preDept   = { id: pre.getValue(FLD_DEP_MAIN), text: pre.getText(FLD_DEP_MAIN) };

        // Carga Orden de Servicio para resumen
        let soSummary = { id: osIdNew };
        try {
          const so = record.load({ type: record.Type.SALES_ORDER, id: osIdNew, isDynamic: false });
          soSummary = {
            id      : osIdNew,
            tranid  : so.getValue('tranid'),
            status  : (function(){ try { return so.getText('status'); } catch(_) { try { return so.getText('orderstatus'); } catch(__){ return null; } } })(),
            entity  : { id: so.getValue('entity'),    text: so.getText('entity') },
            total   : so.getValue('total'),
            currency: { id: so.getValue('currency'),  text: so.getText('currency') },
            dept    : { id: so.getValue('department'),text: so.getText('department') },
            loc     : { id: so.getValue('location'),  text: so.getText('location') }
          };
        } catch (e) {
          soSummary = { id: osIdNew, errorLoadingSO: e.message || String(e) };
        }

        const payload = {
          evento    : 'CONVERSION_PRE_A_SO',
          timestamp : new Date().toISOString(),
          usuario   : { id: usuario.id, name: usuario.name },
          preorden  : {
            id   : preId,
            name : preName,
            cliente: preClient,
            oficina: preOfi,
            departamento: preDept
          },
          salesorder: soSummary
        };

        log.audit({ title: `Conversión PRE→SO — PRE ${preId} → SO ${osIdNew}`, details: JSON.stringify(payload) });
      }
    } catch (e) {
      log.error({ title: 'UE afterSubmit error', details: `${e.name || 'Error'}: ${e.message}` });
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
