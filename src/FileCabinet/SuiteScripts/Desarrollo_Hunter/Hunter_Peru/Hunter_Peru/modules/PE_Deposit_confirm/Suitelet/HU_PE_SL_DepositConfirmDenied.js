/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define([
  'N/ui/serverWidget',
  'N/record',
  'N/search',
  'N/runtime',
  'N/email',
  'N/format',
  'N/error',
  'N/log',
  'N/ui/message'
], function(ui, record, search, runtime, email, format, error, log, message) {

  function onRequest(ctx) {
    var req = ctx.request;
    if (req.method === 'GET') {
      var id  = req.parameters.custparam_id || '';
      var act = (req.parameters.accion || '').toLowerCase();

      // EXISTENTE
      var cli = req.parameters.f_cli || '';
      var errBanner = req.parameters.errBanner || '';

      // NUEVO: leer filtros opcionales (incluye asiento)
      var filt = {
        account:  req.parameters.f_banco   || '',
        tranid:   req.parameters.f_tran    || '',
        memo:     req.parameters.f_memo    || '',
        desde:    req.parameters.f_desde   || '',
        hasta:    req.parameters.f_hasta   || '',
        asiento:  req.parameters.f_asiento || '' // <-- NUEVO
      };

      log.debug({
        title: 'GET params recibidos',
        details: JSON.stringify({ id: id, accion: act, cli: cli, errBanner: errBanner, filtros: filt })
      });
      return buildForm(ctx.response, id, act, cli, errBanner, filt);

    } else {
      var idp = req.parameters.custpage_recid;
      if (!idp) throw error.create({ name: 'MISSING_ID', message: 'No se recibió el ID de registro para actualizar' });
      return processPost(ctx, idp);
    }
  }

  function buildForm(resp, id, act, cli, errBanner, filtros) {
    filtros = filtros || {};
    var form = ui.createForm({ title: 'Confirmación de Depósitos (' + act.toUpperCase() + ')' });

    // Mensajes superiores nativos
    if (errBanner) {
      _addPageMessage(form, message.Type.ERROR, 'No se pudo guardar', errBanner);
    } else {
      _addPageMessage(form, message.Type.INFORMATION, 'Seleccionar / Filtrar',
        'Seleccione un cliente y/o use los filtros para listar los depósitos o asientos.');
    }

    form.addField({ id: 'custpage_recid', type: ui.FieldType.TEXT, label: 'ID' })
        .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
        .defaultValue = id;

    form.addField({ id: 'custpage_accion', type: ui.FieldType.TEXT, label: 'Acción' })
        .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
        .defaultValue = act;

    var depRec = record.load({ type: 'customrecord_pe_confirmacion_deposito', id: id });

    if (act === 'confirm') {
      form.addFieldGroup({ id: 'custpage_grp_filt', label: 'Filtros' });

      form.addField({
        id: 'custpage_cliente_dep', type: ui.FieldType.SELECT, label: 'Cliente Depositante', source: 'customer', container: 'custpage_grp_filt'
      }).defaultValue = (cli || depRec.getValue('custrecord_pe_cliente_dep_confirm') || '');

      form.addField({ id: 'custpage_cliente_dep_ref', type: ui.FieldType.TEXT, label: 'Cliente Depositante Referencial' })
          .defaultValue = depRec.getValue('custrecord_pe_cliente_dep_ref_confirm') || '';

      var fOperacionRef = form.addField({
        id: 'custpage_operacion_ref',
        type: ui.FieldType.TEXT,
        label: 'Número de Operación'
      });
      fOperacionRef.defaultValue = depRec.getValue('custrecord_pe_operacion_confirm') || '';
      fOperacionRef.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });

      var fAccount = form.addField({
        id: 'custpage_filt_banco', type: ui.FieldType.SELECT, label: 'Cuenta (Account)', source: 'account', container: 'custpage_grp_filt'
      });
      if (filtros.account) fAccount.defaultValue = filtros.account;

      var fTran = form.addField({
        id: 'custpage_filt_tran', type: ui.FieldType.TEXT, label: 'Número (TranID)', container: 'custpage_grp_filt'
      });
      if (filtros.tranid) fTran.defaultValue = filtros.tranid;

      // NUEVO: filtro por Asiento (Journal Entry) TranID
      var fAsiento = form.addField({
        id: 'custpage_filt_asiento', type: ui.FieldType.TEXT, label: 'Asiento (Journal) - TranID', container: 'custpage_grp_filt'
      });
      if (filtros.asiento) fAsiento.defaultValue = filtros.asiento;

      var fMemo = form.addField({
        id: 'custpage_filt_memo', type: ui.FieldType.TEXT, label: 'Memo / Nota', container: 'custpage_grp_filt'
      });
      if (filtros.memo) fMemo.defaultValue = filtros.memo;

      var fDesde = form.addField({
        id: 'custpage_filt_desde', type: ui.FieldType.DATE, label: 'Desde (Fecha)', container: 'custpage_grp_filt'
      });
      if (filtros.desde) {
        var d1 = _coerceParamToDate(filtros.desde);
        if (d1) fDesde.defaultValue = format.format({ value: d1, type: format.Type.DATE });
      }

      var fHasta = form.addField({
        id: 'custpage_filt_hasta', type: ui.FieldType.DATE, label: 'Hasta (Fecha)', container: 'custpage_grp_filt'
      });
      if (filtros.hasta) {
        var d2 = _coerceParamToDate(filtros.hasta);
        if (d2) fHasta.defaultValue = format.format({ value: d2, type: format.Type.DATE });
      }

      // Selección (saldo / asiento)
      form.addField({ id: 'custpage_saldofavor_id', type: ui.FieldType.TEXT, label: 'SaldoFavID' })
          .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

      // NUEVO: hidden para asiento
      form.addField({ id: 'custpage_asiento_id', type: ui.FieldType.TEXT, label: 'AsientoID' })
          .updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

      var tbl = form.addSublist({
        id: 'custpage_tbl_saldo',
        type: ui.SublistType.INLINEEDITOR,
        label: 'Saldos a Favor / Asientos'
      });

      // ✅ ORDEN SOLICITADO: doc -> operación -> memo
      [
        'sel:CHECKBOX',
        'sf_id:TEXT',
        'sf_tran:TEXT',
        'sf_monto:CURRENCY',
        'sf_fecha:TEXT',
        'sf_banco:TEXT',
        'sf_doc:TEXT',
        'sf_operacion:TEXT',
        'sf_memo:TEXT',
        'sf_used:CHECKBOX',
        'sf_usedtxt:TEXT',
        'sf_tipo:TEXT' // <-- NUEVO (hidden) DEPOSIT / JOURNAL
      ].forEach(function(def) {
        var a = def.split(':');
        var lbl =
          (a[0] === 'sel') ? 'Sel.' :
          (a[0] === 'sf_used') ? 'Usado' :
          (a[0] === 'sf_operacion') ? 'Operación' :
          (a[0] === 'sf_tipo') ? 'Tipo' :
          a[0].replace('sf_', '');

        var fld = tbl.addField({ id: 'custpage_' + a[0], type: ui.FieldType[a[1]], label: lbl });

        if (a[0] === 'sf_id')   fld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        if (a[0] === 'sf_tipo') fld.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

        if (a[0] === 'sf_used') {
          fld.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
          fld.defaultValue = 'F';
        }
      });

      var selectedCli = (cli || depRec.getValue('custrecord_pe_cliente_dep_confirm') || '');

      var selSaldo   = depRec.getValue('custrecord_pe_saldo_favor_confirm') || '';
      var selAsiento = depRec.getValue('custrecord_pe_asiento_confirm')     || '';

      var algoParaBuscar = !!(
        selectedCli || filtros.account || filtros.tranid || filtros.memo || filtros.desde || filtros.hasta || filtros.asiento
      );

      if (algoParaBuscar) {
        // PRIORIDAD: si hay filtro de asiento, listar asientos; si no, listar depósitos (flujo regular)
        if (filtros.asiento) {
          fillTableWithJournals(
            tbl,
            filtros.asiento,
            selAsiento,
            filtros
          );
        } else {
          fillTableWithDeposits(
            tbl,
            selectedCli,
            selSaldo,
            filtros
          );
        }
      } else {
        log.debug({ title: 'Lista vacía inicial', details: 'Sin filtros/cliente → no se ejecuta búsqueda.' });
      }

    } else {
      form.addField({ id: 'custpage_motivo', type: ui.FieldType.LONGTEXT, label: 'Motivo Cancelación' });
      form.addField({ id: 'custpage_observ', type: ui.FieldType.LONGTEXT, label: 'Observación' });
    }

    form.clientScriptModulePath = 'SuiteScripts/Desarrollo_Hunter/Hunter_Peru/appHunter/modules/PE_Deposit_confirm/ClientScript/HU_PE_CS_DepositConfirmDenied.js';

    form.addSubmitButton({ label: 'Guardar' });
    resp.writePage(form);
  }

  function _addPageMessage(form, type, title, text) {
    try {
      var msg = message.create({ type: type, title: title, message: text });
      form.addPageInitMessage({ message: msg });
    } catch (e) {
      log.error({ title: 'addPageInitMessage failed', details: (e && e.message) || e });
    }
  }

  function _coerceParamToDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

    var mIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (mIso) {
      var d1 = new Date(parseInt(mIso[1],10), parseInt(mIso[2],10)-1, parseInt(mIso[3],10));
      return isNaN(d1.getTime()) ? null : d1;
    }
    var mLat = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (mLat) {
      var d2 = new Date(parseInt(mLat[3],10), parseInt(mLat[2],10)-1, parseInt(mLat[1],10));
      return isNaN(d2.getTime()) ? null : d2;
    }
    var d3 = new Date(v);
    if (!isNaN(d3.getTime())) return d3;

    try {
      var d4 = format.parse({ value: v, type: format.Type.DATE });
      if (d4 && !isNaN(d4.getTime())) return d4;
    } catch (e) {
      log.error({ title: 'Error parseando fecha', details: v + ' -> ' + (e && e.message) });
    }
    return null;
  }

  function fillTableWithDeposits(tbl, cli, selId, filtros) {
    filtros = filtros || {};
    var filters = [['mainline','is','T']];

    if (cli)               { filters.push('AND', ['entity','anyof', cli]); }
    if (filtros.account)   { filters.push('AND', ['account','anyof', filtros.account]); }
    if (filtros.tranid)    { filters.push('AND', ['tranid','contains', filtros.tranid]); }
    if (filtros.memo)      { filters.push('AND', ['memo','contains',  filtros.memo]); }

    var dDesde = _coerceParamToDate(filtros.desde);
    var dHasta = _coerceParamToDate(filtros.hasta);
    if (dDesde) { filters.push('AND', ['trandate','onorafter',  format.format({ value: dDesde, type: format.Type.DATE })]); }
    if (dHasta) { filters.push('AND', ['trandate','onorbefore', format.format({ value: dHasta, type: format.Type.DATE })]); }

    var rs = search.create({
      type: search.Type.CUSTOMER_DEPOSIT,
      filters: filters,
      columns: [
        'internalid',
        'tranid',
        'custbody_htpe_nro_operacion',
        'fxamount',
        'trandate',
        'memo',
        search.createColumn({ name: 'name', join: 'account' }),
        search.createColumn({ name: 'custentity_pe_document_number', join: 'customer' })
      ]
    }).run().getRange({ start: 0, end: 1000 });

    var depIds = [];
    rs.forEach(function(r){
      var rid = r.getValue('internalid');
      if (rid) depIds.push(rid);
    });

    var usados = {};
    if (depIds.length) {
      search.create({
        type: 'customrecord_pe_confirmacion_deposito',
        filters: [
          ['custrecord_pe_saldo_favor_confirm','anyof', depIds], 'AND',
          ['isinactive','is','F']
        ],
        columns: ['custrecord_pe_saldo_favor_confirm']
      }).run().each(function(r){
        var depId = r.getValue('custrecord_pe_saldo_favor_confirm');
        if (depId) usados[String(depId)] = true;
        return true;
      });
    }

    rs.forEach(function(r, i) {
      var rid = r.getValue('internalid') || '';
      if (!rid) return;

      var tran      = r.getValue('tranid') || '';
      var operacion = r.getValue('custbody_htpe_nro_operacion') || '';
      var monto     = r.getValue('fxamount');
      var fecha     = r.getValue('trandate') || '';
      var banco     = r.getValue({ name:'name', join:'account' }) || '';
      var memo      = r.getValue('memo') || '';
      var doc       = r.getValue({ name:'custentity_pe_document_number', join:'customer' }) || '';

      var isUsed = !!usados[String(rid)];

      tbl.setSublistValue({ id: 'custpage_sf_id', line: i, value: rid });
      tbl.setSublistValue({ id: 'custpage_sf_tipo', line: i, value: 'DEPOSIT' });

      if (tran) tbl.setSublistValue({ id: 'custpage_sf_tran', line: i, value: tran });

      if (monto !== '' && monto !== null) {
        tbl.setSublistValue({ id: 'custpage_sf_monto', line: i, value: String(monto) });
      }

      if (fecha) {
        var d = _coerceParamToDate(fecha);
        var out = d ? format.format({ value: d, type: format.Type.DATE }) : fecha;
        tbl.setSublistValue({ id: 'custpage_sf_fecha', line: i, value: out });
      }

      if (banco) tbl.setSublistValue({ id: 'custpage_sf_banco', line: i, value: banco });

      if (doc)       tbl.setSublistValue({ id: 'custpage_sf_doc',       line: i, value: doc });
      if (operacion) tbl.setSublistValue({ id: 'custpage_sf_operacion', line: i, value: operacion });
      if (memo)      tbl.setSublistValue({ id: 'custpage_sf_memo',      line: i, value: memo });

      tbl.setSublistValue({ id: 'custpage_sf_used', line: i, value: isUsed ? 'T' : 'F' });
      try { tbl.setSublistValue({ id: 'custpage_sf_usedtxt', line: i, value: isUsed ? 'Sí' : 'No' }); } catch(e){}

      if (selId && selId.toString() === rid.toString() && !isUsed) {
        tbl.setSublistValue({ id: 'custpage_sel', line: i, value: 'T' });
      }
    });
  }

  // NUEVO: listar asientos (journal entry) por tranid
  function fillTableWithJournals(tbl, asientoTranId, selAsientoId, filtros) {
    filtros = filtros || {};
    var filters = [['mainline','is','T']];

    if (asientoTranId) { filters.push('AND', ['tranid','contains', asientoTranId]); }
    if (filtros.memo)  { filters.push('AND', ['memo','contains', filtros.memo]); }

    var dDesde = _coerceParamToDate(filtros.desde);
    var dHasta = _coerceParamToDate(filtros.hasta);
    if (dDesde) { filters.push('AND', ['trandate','onorafter',  format.format({ value: dDesde, type: format.Type.DATE })]); }
    if (dHasta) { filters.push('AND', ['trandate','onorbefore', format.format({ value: dHasta, type: format.Type.DATE })]); }

    var rs = search.create({
      type: search.Type.JOURNAL_ENTRY,
      filters: filters,
      columns: [
        'internalid',
        'tranid',
        'trandate',
        'memo',
        'fxamount'
      ]
    }).run().getRange({ start: 0, end: 1000 });

    var jeIds = [];
    rs.forEach(function(r){
      var rid = r.getValue('internalid');
      if (rid) jeIds.push(rid);
    });

    // usados por asiento
    var usados = {};
    if (jeIds.length) {
      search.create({
        type: 'customrecord_pe_confirmacion_deposito',
        filters: [
          ['custrecord_pe_asiento_confirm','anyof', jeIds], 'AND',
          ['isinactive','is','F']
        ],
        columns: ['custrecord_pe_asiento_confirm']
      }).run().each(function(r){
        var jeId = r.getValue('custrecord_pe_asiento_confirm');
        if (jeId) usados[String(jeId)] = true;
        return true;
      });
    }

    rs.forEach(function(r, i) {
      var rid = r.getValue('internalid') || '';
      if (!rid) return;

      var tran  = r.getValue('tranid') || '';
      var fecha = r.getValue('trandate') || '';
      var memo  = r.getValue('memo') || '';
      var monto = r.getValue('fxamount');

      var isUsed = !!usados[String(rid)];

      tbl.setSublistValue({ id: 'custpage_sf_id', line: i, value: rid });
      tbl.setSublistValue({ id: 'custpage_sf_tipo', line: i, value: 'JOURNAL' });

      if (tran) tbl.setSublistValue({ id: 'custpage_sf_tran', line: i, value: tran });

      // monto (puede ser 0 en JE, igual se muestra)
      if (monto !== '' && monto !== null && monto !== undefined) {
        try { tbl.setSublistValue({ id: 'custpage_sf_monto', line: i, value: String(monto) }); } catch(e){}
      }

      if (fecha) {
        var d = _coerceParamToDate(fecha);
        var out = d ? format.format({ value: d, type: format.Type.DATE }) : fecha;
        tbl.setSublistValue({ id: 'custpage_sf_fecha', line: i, value: out });
      }

      // banco/doc/operacion no aplican: se dejan vacíos
      if (memo) tbl.setSublistValue({ id: 'custpage_sf_memo', line: i, value: memo });

      tbl.setSublistValue({ id: 'custpage_sf_used', line: i, value: isUsed ? 'T' : 'F' });
      try { tbl.setSublistValue({ id: 'custpage_sf_usedtxt', line: i, value: isUsed ? 'Sí' : 'No' }); } catch(e){}

      if (selAsientoId && selAsientoId.toString() === rid.toString() && !isUsed) {
        tbl.setSublistValue({ id: 'custpage_sel', line: i, value: 'T' });
      }
    });
  }

  function processPost(ctx, id) {
    var req  = ctx.request;
    var resp = ctx.response;

    var uid = runtime.getCurrentUser().id;
    var acc = req.parameters.custpage_accion;
    var cli = req.parameters.custpage_cliente_dep || '';

    var saldoId   = (req.parameters.custpage_saldofavor_id || '').toString().trim();
    var asientoId = (req.parameters.custpage_asiento_id   || '').toString().trim();

    log.debug({
      title: 'processPost() - Intento de guardar',
      details: JSON.stringify({
        id: id,
        accion: acc,
        pick_saldo: saldoId,
        pick_asiento: asientoId,
        cli: cli
      })
    });

    var vals = { custrecord_pe_cliente_dep_confirm: cli };

    if (acc === 'confirm') {
      // Requerir uno u otro
      if (!saldoId && !asientoId) {
        var banner0 = 'Debe seleccionar un Saldo a Favor (Customer Deposit) o un Asiento (Journal Entry) para confirmar.';
        return buildForm(resp, id, 'confirm', cli, banner0, {
          account: req.parameters.custpage_filt_banco || '',
          tranid:  req.parameters.custpage_filt_tran  || '',
          memo:    req.parameters.custpage_filt_memo  || '',
          desde:   req.parameters.custpage_filt_desde || '',
          hasta:   req.parameters.custpage_filt_hasta || '',
          asiento: req.parameters.custpage_filt_asiento || ''
        });
      }

      // Si viene asiento, validar duplicado por asiento
      if (asientoId) {
        var dupJe = search.create({
          type: 'customrecord_pe_confirmacion_deposito',
          filters: [
            search.createFilter({ name: 'custrecord_pe_asiento_confirm', operator: search.Operator.ANYOF, values: [asientoId] }),
            search.createFilter({ name: 'internalid', operator: search.Operator.NONEOF, values: [id] }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
          ],
          columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        log.debug({
          title: 'Validación asiento ya vinculado',
          details: 'asientoId=' + asientoId + ' | duplicado=' + (dupJe && dupJe.length ? dupJe[0].id : 'NO')
        });

        if (dupJe && dupJe.length) {
          var bannerDupJe = 'El asiento seleccionado ya está vinculado a la confirmación interna <b> CD-PE-00' + dupJe[0].id +
                            '</b>. No puede reutilizarse en otra confirmación.';
          return buildForm(resp, id, 'confirm', cli, bannerDupJe, {
            account: req.parameters.custpage_filt_banco || '',
            tranid:  req.parameters.custpage_filt_tran  || '',
            memo:    req.parameters.custpage_filt_memo  || '',
            desde:   req.parameters.custpage_filt_desde || '',
            hasta:   req.parameters.custpage_filt_hasta || '',
            asiento: req.parameters.custpage_filt_asiento || ''
          });
        }

        vals.custrecord_pe_asiento_confirm          = asientoId;
        vals.custrecord_pe_saldo_favor_confirm      = ''; // limpiar saldo si aplica

      } else {
        // flujo regular por saldo (sin cambiar)
        var dup = search.create({
          type: 'customrecord_pe_confirmacion_deposito',
          filters: [
            search.createFilter({ name: 'custrecord_pe_saldo_favor_confirm', operator: search.Operator.ANYOF, values: [saldoId] }),
            search.createFilter({ name: 'internalid', operator: search.Operator.NONEOF, values: [id] }),
            search.createFilter({ name: 'isinactive', operator: search.Operator.IS, values: 'F' })
          ],
          columns: ['internalid']
        }).run().getRange({ start: 0, end: 1 });

        log.debug({
          title: 'Validación saldo ya vinculado',
          details: 'saldoId=' + saldoId + ' | duplicado=' + (dup && dup.length ? dup[0].id : 'NO')
        });

        if (dup && dup.length) {
          var bannerDup = 'El depósito seleccionado ya está vinculado a la confirmación interna <b> CD-PE-00' + dup[0].id +
                          '</b>. No puede reutilizarse en otra confirmación.';
          return buildForm(resp, id, 'confirm', cli, bannerDup, {
            account: req.parameters.custpage_filt_banco || '',
            tranid:  req.parameters.custpage_filt_tran  || '',
            memo:    req.parameters.custpage_filt_memo  || '',
            desde:   req.parameters.custpage_filt_desde || '',
            hasta:   req.parameters.custpage_filt_hasta || '',
            asiento: req.parameters.custpage_filt_asiento || ''
          });
        }

        vals.custrecord_pe_saldo_favor_confirm      = saldoId;
        vals.custrecord_pe_asiento_confirm          = ''; // limpiar asiento si aplica
      }

      vals.custrecord_pe_cliente_dep_ref_confirm    = req.parameters.custpage_cliente_dep_ref || '';
      vals.custrecord_pe_estado_confirm             = 5;
      vals.custrecord_pe_fecha_confirm              = new Date();
      vals.custrecord_pe_ejecutiva_finanzas_confirm = uid;

    } else {
      vals.custrecord_pe_motivo_cancelacion_confirm = req.parameters.custpage_motivo || '';
      vals.custrecord_pe_observacione_deneg_confirm = req.parameters.custpage_observ || '';
      vals.custrecord_pe_cliente_dep_ref_confirm    = req.parameters.custpage_cliente_dep_ref || '';
      vals.custrecord_pe_estado_confirm             = 3;
      vals.custrecord_pe_fecha_confirm              = new Date();
      vals.custrecord_pe_ejecutiva_finanzas_confirm = uid;
    }

    log.debug({ title: 'submitFields() values', details: JSON.stringify(vals) });

    record.submitFields({
      type: 'customrecord_pe_confirmacion_deposito',
      id: id,
      values: vals,
      options: { ignoreMandatoryFields: true }
    });

    sendMail(id, acc === 'confirm' ? 'CONFIRMADO' : 'DENEGADO');

    var form = ui.createForm({ title: 'Confirmación de Depósitos' });
    _addPageMessage(form, message.Type.CONFIRMATION, 'Guardado', 'Los cambios fueron guardados correctamente.');
    form.addField({ id: 'custpage_dummy', type: ui.FieldType.INLINEHTML, label: ' ' })
        .defaultValue = '<script>setTimeout(function(){window.location=' +
        JSON.stringify('/app/common/custom/custrecordentry.nl?rectype=3054&id=' + id) +
        ';},800);</script>';
    resp.writePage(form);
  }

  function sendMail(recId, status) {
    var dep = record.load({ type: 'customrecord_pe_confirmacion_deposito', id: recId });
    var name = dep.getValue('name');

    var so = search.create({
      type: 'customrecord_pe_confirmacion_deposito_os',
      filters: [['custrecord_pe_detalle_confirm', 'is', recId]],
      columns: [search.createColumn({ name: 'custrecord_pe_os_ref_detalle_confirm' })]
    }).run().getRange({ start: 0, end: 1000 })
      .map(function(r) { return r.getValue('custrecord_pe_os_ref_detalle_confirm'); });

    var saldoId   = dep.getValue('custrecord_pe_saldo_favor_confirm') || '';
    var asientoId = dep.getValue('custrecord_pe_asiento_confirm')     || '';

    var refTranId = '';
    var refLabel  = '';

    if (asientoId) {
      // Asiento
      try {
        refTranId = record.load({ type: 'journalentry', id: asientoId }).getValue('tranid') || '';
      } catch (e) {
        refTranId = '';
      }
      refLabel = 'Asiento';
    } else if (saldoId) {
      // Saldo a favor (flujo original)
      try {
        refTranId = record.load({ type: 'customerdeposit', id: saldoId }).getValue('tranid') || '';
      } catch (e2) {
        refTranId = '';
      }
      refLabel = 'Saldo a favor';
    }

    var motivo = dep.getValue('custrecord_pe_motivo_cancelacion_confirm') || '';
    var obs    = dep.getValue('custrecord_pe_observacione_deneg_confirm') || '';
    var fin    = dep.getValue('custrecord_pe_ejecutiva_finanzas_confirm');
    var ven    = dep.getValue('custrecord_pe_ejecutivo_venta_confirm');

    var body = 'Estimado(a),\n\nEl registro "' + name + '" cambió de estado a: ' + status + '.\n\n' +
               'Órdenes de servicio:\n' + so.map(function(x){ return '- ' + x + '\n'; }).join('') +
               (status === 'CONFIRMADO'
                 ? '\n' + refLabel + ': ' + refTranId + '\n\n'
                 : '\nMotivo de cancelación: ' + motivo + '\nObservación de estado: ' + obs + '\n\n') +
               'Saludos cordiales';

    email.send({
      author: runtime.getCurrentUser().id,
      recipients: [fin],
      cc: [ven, 'grupofinanzas@hunter.com.pe', 'grupotesoreria@hunter.com.pe','fdelatorre@hunter.com.pe','mheredia@hunter.com.pe'],
      subject: 'Depósito ' + name + ' - ' + status,
      body: body
    });

    log.audit({
      title: 'MAIL',
      details: 'Enviado | Accion=' + status + ' | recId=' + recId
    });
  }

  return { onRequest: onRequest };
});
