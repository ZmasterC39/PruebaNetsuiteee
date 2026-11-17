/**
 *  Client Script – "Crear Orden de Servicio" (validaciones + autocompletado + logs)
 *  SIN "Ejecutiva de Gestión". Agregado: recálculo de Precio Unitario e IGV
 *  desde "Total con Impuestos" en la sublista.
 *  -------------------------------------------------------------------------------
 *  @NApiVersion 2.1
 *  @NScriptType ClientScript
 */
define(['N/currentRecord','N/record','N/ui/dialog','N/url','N/runtime'], (currentRecord, record, dialog, url, runtime) => {

  /* ===== DEBUG / TELEMETRÍA ===== */
  const DEBUG = {
    ENABLE: true,
    SHOW_DIALOG_ON_CHANGE: false,
    TAG: '[HT-CS]'
  };
  const dbgBuf = [];
  function dbg(tag, msg, data) {
    if (!DEBUG.ENABLE) return;
    const line = `${DEBUG.TAG} [${tag}] ${msg}`;
    try { console.log(line, (typeof data !== 'undefined' ? data : '')); } catch(_){}
    dbgBuf.push({ tag, msg, data });
  }
  async function dbgFlushDialog(title='Debug Oficina/Departamento') {
    if (!DEBUG.ENABLE || !DEBUG.SHOW_DIALOG_ON_CHANGE) return;
    try {
      const body = dbgBuf.map((r, i) => {
        const json = (typeof r.data !== 'undefined') ? ` → ${JSON.stringify(r.data)}` : '';
        return `${i+1}. [${r.tag}] ${r.msg}${json}`;
      }).join('<br/>');
      if (body) await dialog.alert({ title, message: body });
    } catch(_){}
    dbgBuf.length = 0;
  }

  // ========= Configuración de validaciones =========
  const CFG = {
    REQUIRE_BIEN               : false,
    REQUIRE_DEPT_OFFICE_HEADER : true,
    REQUIRE_DEPT_OFFICE_LINES  : true,
    REQUIRE_TIME_UNIT_IF_TIME  : true
  };

  // ========= Autocompletado / proyección a líneas =========
  const AUTO = {
    ENABLE_PROPAGATE_ON_PAGEINIT   : true,
    ENABLE_PROPAGATE_ON_CHANGE     : true,
    ENABLE_DEFAULT_ON_LINEINIT     : true,
    FORCE_OVERRIDE_LINES           : true
  };

  // ========= Mapa Oficina → Departamento =========
  const OFFICE_TO_DEPT = { '415': 299, '416': 299, '417': 331, '418': 315, '419': 283 };

  // ========= IDs de campos y sublista =========
  const FLD_OFI_MAIN  = 'custrecord_ht_pe_po_oficina';
  const FLD_DEP_MAIN  = 'custrecord_ht_pe_po_departamento';

  const SUB_ID        = 'recmachcustrecord_ht_pe_po_detalle_articulo';
  const FLD_OFI_LINE  = 'custrecord_ht_pe_po_oficina1';
  const FLD_DEP_LINE  = 'custrecord_ht_pe_po_departamento1';

  // ---- NUEVO: campos de montos en la sublista ----
  const FLD_QTY_LINE     = 'custrecord_ht_pe_po_cantidad';
  const FLD_TOTAL_INC    = 'custrecord_ht_pe_po_total_impuestos';   // Total con Impuestos
  const FLD_RATE_LINE    = 'custrecord_ht_pe_po_tasa_impuesto';     // Porcentaje
  const FLD_UNIT_PRICE   = 'custrecord_ht_pe_po_precio_unitario';   // Unitario (sin IGV)
  const FLD_TAX_AMOUNT   = 'custrecord_ht_pe_po_importe_impuestos'; // Importe IGV

  // ========= Render del mensaje =========
  const RENDER_MODE = 'html';
  const LB = '\n';
  const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const li  = (s) => `<li>${esc(s)}</li>`;
  const sec = (title, items) => items.length
      ? `<div><strong>${esc(title)}:</strong></div><ul style="margin:4px 0 8px 18px;">${items.map(li).join('')}</ul>`
      : '';

  function formatMessage(falt) {
    const titulo = 'Antes de crear la Orden de Servicio, completa:';
    if (RENDER_MODE === 'html') {
      return [
        `<div style="line-height:1.35">`,
          `<div>${esc(titulo)}</div>`,
          sec('Cabecera',     falt.cabecera),
          sec('Ejecutivas',   falt.ejecutivas),
          sec('OS (cabecera)',falt.osCabecera),
          sec('Líneas',       falt.lineas),
          sec('Otros',        falt.otros),
        `</div>`
      ].join('');
    }
    const bulletizeTxt = (items) => items.map(s => `• ${s}`).join(LB);
    const sectionTxt   = (title, items) => items.length ? `${title}:${LB}${bulletizeTxt(items)}${LB}` : '';
    return [
      titulo, LB, LB,
      sectionTxt('Cabecera',     falt.cabecera),
      sectionTxt('Ejecutivas',   falt.ejecutivas),
      sectionTxt('OS (cabecera)',falt.osCabecera),
      sectionTxt('Líneas',       falt.lineas),
      sectionTxt('Otros',        falt.otros)
    ].join('');
  }

  // ========= Helpers de autocompletado =========
  function computeDeptFromOffice(ofiId) {
    if (ofiId === null || ofiId === '' || typeof ofiId === 'undefined') return null;
    const key = String(ofiId);
    return Object.prototype.hasOwnProperty.call(OFFICE_TO_DEPT, key) ? OFFICE_TO_DEPT[key] : null;
  }

  /** Setea depto en cabecera si hay mapeo y devuelve {ofi, dep, mapped} */
  function setMainDeptIfMapped(rec) {
    const ofi = rec.getValue(FLD_OFI_MAIN);
    const depMapped = computeDeptFromOffice(ofi);
    const depBefore = rec.getValue(FLD_DEP_MAIN);
    if (depMapped && depBefore !== depMapped) {
      rec.setValue({ fieldId: FLD_DEP_MAIN, value: depMapped, ignoreFieldChange: true });
      dbg('setMainDeptIfMapped', `Departamento main actualizado por mapa`, { oficina: ofi, depMapped, depBefore });
    } else {
      dbg('setMainDeptIfMapped', `Departamento main SIN cambios`, { oficina: ofi, depMapped, depBefore });
    }
    return { ofi, dep: depMapped || rec.getValue(FLD_DEP_MAIN) || null, mapped: !!depMapped };
  }

  /** Replica main (ofi/dep) a TODAS las líneas; retorna contadores */
  function propagateDeptOfficeToAllLines(rec, ofi, dep, forceOverride) {
    const n = rec.getLineCount({ sublistId: SUB_ID }) || 0;
    let updOfi = 0, updDep = 0, untouched = 0;

    for (let i = 0; i < n; i++) {
      rec.selectLine({ sublistId: SUB_ID, line: i });

      const curOfi = rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE });
      const curDep = rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE });

      let changed = false;
      if ((forceOverride || !curOfi) && ofi) {
        rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, value: ofi, ignoreFieldChange: true });
        updOfi++; changed = true;
      }
      if ((forceOverride || !curDep) && dep) {
        rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, value: dep, ignoreFieldChange: true });
        updDep++; changed = true;
      }
      if (!changed) untouched++;
      rec.commitLine({ sublistId: SUB_ID });
    }

    const stats = { total: n, updatedOficina: updOfi, updatedDepartamento: updDep, sinCambios: untouched, forceOverride: !!forceOverride };
    dbg('propagate', 'Resultado de réplica a líneas', stats);
    return stats;
  }

  /** Cuando entras a una línea nueva, pone por defecto ofi/dep main */
  function defaultDeptOfficeOnCurrentLine(rec) {
    const ofi = rec.getValue(FLD_OFI_MAIN) || null;
    const dep = rec.getValue(FLD_DEP_MAIN) || computeDeptFromOffice(ofi) || null;
    if (ofi) rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, value: ofi, ignoreFieldChange: true });
    if (dep) rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, value: dep, ignoreFieldChange: true });
    dbg('lineInit', 'Default en línea actual', { ofi, dep });
  }

  /* ===================== NUEVO: Recalcular montos UI ==================== */
  const nvlNum   = (v, d=0) => (isFinite(parseFloat(v)) ? parseFloat(v) : d);
  const round2   = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const rate01   = (r) => { r = nvlNum(r,0); return (r > 1 ? r/100 : r); };

  function recalcCurrentLineFromTotal(rec) {
    const totalInc = nvlNum(rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_TOTAL_INC }), 0);
    if (!totalInc) return;

    const qty  = Math.max(1, nvlNum(rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_QTY_LINE }), 1));
    let rate   = rate01(rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_RATE_LINE }));

    const unit = round2( totalInc / qty / (1 + rate) );
    const igv  = round2( totalInc - (unit * qty) );

    rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_UNIT_PRICE, value: unit, ignoreFieldChange: true });
    rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_TAX_AMOUNT, value: igv,  ignoreFieldChange: true });

    dbg('recalcLine', 'Recalculado desde Total con Impuestos', { totalInc, qty, rate, unit, igv });
  }

  function recalcAllLinesFromTotal(rec) {
    const n = rec.getLineCount({ sublistId: SUB_ID }) || 0;
    for (let i = 0; i < n; i++) {
      rec.selectLine({ sublistId: SUB_ID, line: i });
      recalcCurrentLineFromTotal(rec);
      rec.commitLine({ sublistId: SUB_ID });
    }
    dbg('recalcAll', 'Todas las líneas recalculadas desde Total con Impuestos', { lineas: n });
  }

  // ========= Eventos del Client Script =========
  const pageInit = () => {
    const rec = currentRecord.get();
    const user = runtime.getCurrentUser();
    const n = rec.getLineCount({ sublistId: SUB_ID }) || 0;
    const ofi0 = rec.getValue(FLD_OFI_MAIN);
    const dep0 = rec.getValue(FLD_DEP_MAIN);
    dbg('pageInit', 'Entrada al formulario', { user: { id: user.id, name: user.name }, ofi0, dep0, nLineas: n });

    if (AUTO.ENABLE_PROPAGATE_ON_PAGEINIT) {
      const { ofi, dep, mapped } = setMainDeptIfMapped(rec);
      if (ofi || dep) {
        const stats = propagateDeptOfficeToAllLines(rec, ofi, dep, false);
        dbg('pageInit', 'Post-propagación inicial', { ofi, dep, mapped, stats });
      }
    }

    // **Opcional**: si quieres recalcular todas las líneas al abrir:
    // recalcAllLinesFromTotal(rec);
  };

  function fieldChanged(ctx) {
    const rec = ctx.currentRecord;

    // Recalcular montos cuando cambie total/cantidad/tasa en la sublista
    if (ctx.sublistId === SUB_ID &&
        [FLD_TOTAL_INC, FLD_QTY_LINE, FLD_RATE_LINE].indexOf(ctx.fieldId) > -1) {
      recalcCurrentLineFromTotal(rec);
      return;
    }

    if (ctx.fieldId === FLD_OFI_MAIN) {
      const ofiBefore = ctx.previousValue;
      const ofiAfter  = rec.getValue(FLD_OFI_MAIN);
      dbg('fieldChanged', 'Cambio en Oficina (main)', { ofiBefore, ofiAfter });

      const { ofi, dep, mapped } = setMainDeptIfMapped(rec);
      if (AUTO.ENABLE_PROPAGATE_ON_CHANGE) {
        const stats = propagateDeptOfficeToAllLines(rec, ofi, dep, AUTO.FORCE_OVERRIDE_LINES);
        dbg('fieldChanged', 'Réplica tras cambio de Oficina', { ofi, dep, mapped, stats });
      }
      dbgFlushDialog('Debug: Cambio de Oficina');
    }
  }

  function lineInit(ctx) {
    if (ctx.sublistId !== SUB_ID) return;
    if (AUTO.ENABLE_DEFAULT_ON_LINEINIT) {
      const rec = ctx.currentRecord;
      dbg('lineInit', 'Entrando a línea', { linea: rec.getCurrentSublistIndex ? rec.getCurrentSublistIndex({ sublistId: SUB_ID }) : 'N/A' });
      defaultDeptOfficeOnCurrentLine(rec);
    }
  }

  function validateLine(ctx) {
    if (ctx.sublistId !== SUB_ID) return true;
    const rec = ctx.currentRecord;

    // Asegurar ofi/dep
    const ofiLine = rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE });
    const depLine = rec.getCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE });
    if (!ofiLine || !depLine) {
      const ofi = rec.getValue(FLD_OFI_MAIN);
      let dep   = rec.getValue(FLD_DEP_MAIN) || computeDeptFromOffice(ofi);
      if (ofi && !ofiLine) rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, value: ofi, ignoreFieldChange: true });
      if (dep && !depLine) rec.setCurrentSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, value: dep, ignoreFieldChange: true });
    }

    // **Recalcular antes de commit** para garantizar consistencia
    recalcCurrentLineFromTotal(rec);
    return true;
  }

  // ======= Refuerzo final: al guardar, sincronizar todo y recalcular =======
  function saveRecord(_ctx) {
    const rec = currentRecord.get();
    const { ofi, dep, mapped } = setMainDeptIfMapped(rec);
    const stats = propagateDeptOfficeToAllLines(rec, ofi, dep, true);
    recalcAllLinesFromTotal(rec);
    dbg('saveRecord', 'Sincronización previa a guardar', { ofi, dep, mapped, stats });
    dbgFlushDialog('Debug: Guardar registro');
    return true;
  }

  // ========= Acción principal (crear OS) =========
  const crearOS = async () => {
    try {
      const preId = currentRecord.get().id;
      const pre   = record.load({ type:'customrecord_ht_pe_preordenes', id: preId, isDynamic:false });
      dbg('crearOS', 'Iniciando creación de OS', { preId });

      // —— Cabecera (fuente) ——
      const cliente     = pre.getValue('custrecord_ht_pe_po_cliente_preorden');
      const bienId      = pre.getValue('custrecord_ht_pe_po_vehiculo_bien');
      const depto       = pre.getValue('custrecord_ht_pe_po_departamento');
      const clase       = pre.getValue('custrecord_ht_pe_po_clase');
      const oficina     = pre.getValue('custrecord_ht_pe_po_oficina');
      const subsidiar   = pre.getValue('custrecord_ht_pe_po_subsidiaria');
      const moneda      = pre.getValue('custrecord_ht_pe_po_moneda');

      const canalSYS    = pre.getValue('custrecord_ht_pe_po_canal_distribucion');
      const leyenda     = pre.getValue('custrecord_ht_pe_po_leyenda');
      const vendedor    = pre.getValue('custrecord_ht_pe_po_vendedor');
      const convenio    = pre.getValue('custrecord_ht_pe_po_convenio');
      const condiciones = pre.getValue('custrecord_ht_pe_po_condiciones');
      const formaPago   = pre.getValue('custrecord_ht_pe_po_forma_pago');
      const facturarA   = pre.getValue('custrecord_ht_pe_po_facturar_a');

      const ejeRef      = pre.getValue('custrecord_ht_pe_po_ejecutiva_ref');
      const ejeRen      = pre.getValue('custrecord_ht_pe_po_renovacion');
      const ejeVent     = pre.getValue('custrecord_ht_pe_pe_representante_ventas')
      const ejeCamp     = pre.getValue('custrecord_ht_pe_po_ejecutivo_campo');

      const lugarInstOS = pre.getValue('custrecord_ht_pe_po_lugar_instalacion_os');

      const concesPre   = pre.getValue('custrecord_ht_pe_po_consecionario');
      const asegPre     = pre.getValue('custrecord_ht_pe_po_aseguradora');
      const finanPre    = pre.getValue('custrecord_ht_pe_po_financiera');
      const brokerPre   = pre.getValue('custrecord_pe_broker');

      const nLines = pre.getLineCount({ sublistId: SUB_ID }) || 0;
      dbg('crearOS', 'Cabecera cargada', { cliente, bienId, depto, clase, oficina, subsidiar, moneda, nLines });

      // ========= VALIDACIONES =========
      const falt = { cabecera: [], ejecutivas: [], lineas: [], otros: [], osCabecera: [] };
      if (!cliente)    falt.cabecera.push('Cliente');
      if (!subsidiar)  falt.cabecera.push('Subsidiaria');
      if (!moneda)     falt.cabecera.push('Moneda');

      if (!formaPago)   falt.cabecera.push('Forma de pago');
      if (!facturarA)   falt.cabecera.push('Facturar a');
      if (!condiciones) falt.cabecera.push('Condiciones / Términos');
      if (!leyenda)     falt.cabecera.push('Leyenda');

      if (CFG.REQUIRE_DEPT_OFFICE_HEADER) {
        if (!depto)   falt.cabecera.push('Departamento');
        if (!clase)   falt.cabecera.push('Clase');
        if (!oficina) falt.cabecera.push('Oficina');
      }

      if (!ejeRef)   falt.ejecutivas.push('HT Ejecutiva de Referencia');
      if (!ejeRen)   falt.ejecutivas.push('HT Ejecutiva de Renovación');

      if (!lugarInstOS) falt.osCabecera.push('Lugar de instalación (OS)');

      if (CFG.REQUIRE_BIEN && !bienId) falt.cabecera.push('Bien');
      if (!nLines || nLines === 0)     falt.otros.push('Al menos una línea de artículo');

      // Fallback Bien (para campos OS)
      let concesBien='', asegBien='', finanBien='', brokerBien='';
      if (bienId) {
        const bien = record.load({ type:'customrecord_ht_record_bienes', id:bienId, isDynamic:false });
        concesBien = bien.getValue('custrecord_ht_bien_consesionarios');
        asegBien   = bien.getValue('custrecord_ht_bien_companiaseguros');
        finanBien  = bien.getValue('custrecord_ht_bien_financiadovehiculo');
        brokerBien = bien.getValue('custrecord_pe_broker');
        dbg('crearOS', 'Fallback desde Bien', { concesBien, asegBien, finanBien, brokerBien });
      }
      const concesFinal = concesPre || concesBien || null;
      const asegFinal   = asegPre   || asegBien   || null;
      const finanFinal  = finanPre  || finanBien  || null;
      const brokerFinal = brokerPre || brokerBien || null;

      if (!concesFinal) falt.cabecera.push('Concesionario');
      if (!asegFinal)   falt.cabecera.push('Aseguradora');
      if (!finanFinal)  falt.cabecera.push('Financiera');
      if (!brokerFinal) falt.cabecera.push('Broker');

      if (falt.cabecera.length || falt.ejecutivas.length || falt.osCabecera.length || falt.lineas.length || falt.otros.length) {
        const message = formatMessage(falt);
        dbg('crearOS', 'Validaciones fallidas', falt);
        await dialog.alert({ title: 'Faltan datos para convertir a OS', message });
        return;
      }

      // ========= Crear Sales Order =========
      const so = record.create({ type: record.Type.SALES_ORDER, isDynamic:true });
      if (subsidiar) so.setValue({ fieldId:'subsidiary', value: subsidiar });
      so.setValue({ fieldId:'entity', value: cliente });
      so.setValue({ fieldId: 'custbody_ht_pe_os_preorden', value: preId });

      if (moneda) { try { so.setValue({ fieldId:'currency', value: moneda }); } catch (e) { dbg('crearOS', 'No se pudo setear currency', { error: e.message }); } }

      if (bienId)       so.setValue({ fieldId:'custbody_ht_so_bien', value: bienId });
      if (depto)        so.setValue({ fieldId:'department',  value: depto   });
      if (clase)        so.setValue({ fieldId:'class',       value: clase   });
      if (oficina)      so.setValue({ fieldId:'location',    value: oficina });

      if (canalSYS)     so.setValue({ fieldId:'custbody_canal_distribucion_sys', value: canalSYS });
      if (leyenda)      so.setValue({ fieldId:'custbody_ht_pe_os_leyenda',        value: leyenda  });
      if (vendedor)     so.setValue({ fieldId:'custbody_ht_pe_os_vendedor',       value: vendedor });
      if (convenio)     so.setValue({ fieldId:'custbody_pe_os_convenio',          value: convenio });
      if (condiciones)  so.setValue({ fieldId:'terms',                            value: condiciones });
      if (formaPago)    so.setValue({ fieldId:'custbody_pe_os_forma_pago_sys',    value: formaPago });
      if (facturarA)    so.setValue({ fieldId:'custbody_ht_facturar_a',           value: facturarA });

      if (ejeRen)       so.setValue({ fieldId:'custbody_os_ejecutivarenovacion',    value: ejeRen });
      if (ejeRef)       so.setValue({ fieldId:'custbody_ht_os_ejecutivareferencia', value: ejeRef });
      if (ejeCamp)      so.setValue({ fieldId:'custbody_ht_os_ejecutivocampo',      value: ejeCamp });
      if (ejeVent)      so.setValue({ fieldId:'salesrep', value: ejeVent });


      if (lugarInstOS)  so.setValue({ fieldId:'custbody_pe_ht_lugar_instalacion', value: lugarInstOS });

      if (concesFinal)  so.setValue({ fieldId:'custbody_ht_os_concesionario',   value: concesFinal });
      if (asegFinal)    so.setValue({ fieldId:'custbody_ht_os_companiaseguros', value: asegFinal   });
      if (finanFinal)   so.setValue({ fieldId:'custbody_ht_os_bancofinanciera', value: finanFinal  });
      if (brokerFinal)  so.setValue({ fieldId:'custbody_ht_os_broker',          value: brokerFinal });

      // Líneas
      for (let i = 0; i < nLines; i++) {
        const itemId   = pre.getSublistValue({ sublistId: SUB_ID, fieldId:'custrecord_ht_pe_articulos_po',       line:i });
        const qty      = pre.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_QTY_LINE,        line:i }) || 1;
        const rate     = pre.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_UNIT_PRICE,      line:i }) || 0;

        const tiempo   = Number(pre.getSublistValue({ sublistId: SUB_ID, fieldId:'custrecord_ht_pe_po_tiempo_cobertura', line:i }) || 0);
        const undTmpId = pre.getSublistValue({ sublistId: SUB_ID, fieldId:'custrecord_und_tiempo_cobertura',     line:i });

        let depL       = pre.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_DEP_LINE, line:i }) || depto || computeDeptFromOffice(oficina) || null;
        let ofiL       = pre.getSublistValue({ sublistId: SUB_ID, fieldId: FLD_OFI_LINE, line:i }) || oficina || null;

        so.selectNewLine({ sublistId:'item' });
        so.setCurrentSublistValue({ sublistId:'item', fieldId:'item',     value:itemId });
        so.setCurrentSublistValue({ sublistId:'item', fieldId:'quantity', value:qty   });
        so.setCurrentSublistValue({ sublistId:'item', fieldId:'rate',     value:rate  });

        if (tiempo > 0)  so.setCurrentSublistValue({ sublistId:'item', fieldId:'custcol_ht_os_tiempo_cobertura',     value: tiempo });
        if (undTmpId)    so.setCurrentSublistValue({ sublistId:'item', fieldId:'custcol_ht_os_und_tiempo_cobertura', value: undTmpId });

        if (cliente)     so.setCurrentSublistValue({ sublistId:'item', fieldId:'custcol_ht_os_cliente_monitoreo',    value: cliente });

        if (depL)        so.setCurrentSublistValue({ sublistId:'item', fieldId:'department', value: depL });
        if (ofiL)        so.setCurrentSublistValue({ sublistId:'item', fieldId:'location',   value: ofiL });

        so.commitLine({ sublistId:'item' });
      }

      const soId = so.save({ enableSourcing:true });
      dbg('crearOS', 'OS creada', { soId });

      record.submitFields({
        type : 'customrecord_ht_pe_preordenes',
        id   : preId,
        values : { custrecord_ht_pe_po_os_relacionada : soId }
      });

      await dialog.alert({ title:'Orden de Servicio creada', message:`Se generó la OS #${soId}` });
      window.location.href = url.resolveRecord({ recordType: record.Type.SALES_ORDER, recordId: soId });

    } catch (e) {
      dbg('crearOS', 'Error creando OS', { error: e && e.message ? e.message : String(e) });
      try { console.error(e); } catch(_){}
      dialog.alert({ title:'Error al crear OS', message:e.message || String(e) });
    }
  };

  return { pageInit, fieldChanged, lineInit, validateLine, saveRecord, crearOS };
});
