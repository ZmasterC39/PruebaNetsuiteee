// Client Script: HU_PE_CS_DepositConfirmDenied.js
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/url'], function(currentRecord, url) {
  var SUB = 'custpage_tbl_saldo';

  function parseDateString(ds) {
    if (!ds) return null;
    if (ds instanceof Date) return ds;
    if (typeof ds === 'string') {
      var parts = ds.indexOf('-') > -1 ? ds.split('-') : ds.split('/');
      if (parts.length === 3) {
        var p0 = parseInt(parts[0],10),
            p1 = parseInt(parts[1],10),
            p2 = parseInt(parts[2],10);
        return p0 > 31 ? new Date(p0, p1 - 1, p2) : new Date(p2, p1 - 1, p0);
      }
    }
    return null;
  }

  function toYMD(d) {
    if (!d) return '';
    var dt = (d instanceof Date) ? d : parseDateString(d);
    if (!dt || isNaN(dt.getTime())) return '';
    var y = dt.getFullYear();
    var m = (dt.getMonth()+1).toString().padStart(2,'0');
    var da = dt.getDate().toString().padStart(2,'0');
    return y + '-' + m + '-' + da;
  }

  function _readQuery() {
    var q = {};
    var href = window.location.href;
    var i = href.indexOf('?');
    if (i === -1) return q;
    href.substring(i+1).split('&').forEach(function(p){
      if (!p) return;
      var kv = p.split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      if (k) q[k] = v;
    });
    return q;
  }

  function _redirectWithFilters() {
    var rec = currentRecord.get();

    var id  = rec.getValue({ fieldId: 'custpage_recid' }) || '';
    var acc = rec.getValue({ fieldId: 'custpage_accion' }) || '';

    var f_cli   = rec.getValue({ fieldId: 'custpage_cliente_dep' }) || '';
    var f_doc   = rec.getValue({ fieldId: 'custpage_filt_doc' }) || '';
    var f_tran  = rec.getValue({ fieldId: 'custpage_filt_tran' }) || '';
    var f_monto = rec.getValue({ fieldId: 'custpage_filt_monto' }) || '';
    var f_banco = rec.getValue({ fieldId: 'custpage_filt_banco' }) || '';
    var f_memo  = rec.getValue({ fieldId: 'custpage_filt_memo' }) || '';

    // NUEVO: filtro asiento (tranid)
    var f_asiento = rec.getValue({ fieldId: 'custpage_filt_asiento' }) || '';

    var rawDesde = rec.getValue({ fieldId: 'custpage_filt_desde' }) || '';
    var rawHasta = rec.getValue({ fieldId: 'custpage_filt_hasta' }) || '';
    var f_desde  = toYMD(rawDesde);
    var f_hasta  = toYMD(rawHasta);

    var base = window.location.href.split('?')[0];
    var q = _readQuery();
    q.custparam_id = id;
    q.accion = acc;
    q.f_cli = f_cli;
    q.f_doc = f_doc;
    q.f_tran = f_tran;
    q.f_monto = f_monto;
    q.f_banco = f_banco;
    q.f_memo = f_memo;
    q.f_desde = f_desde;
    q.f_hasta = f_hasta;

    // NUEVO: pasar asiento
    q.f_asiento = f_asiento;

    try { console.log('[HU_PE_CS_DepositConfirmDenied] Redirect with filters:', JSON.stringify(q)); } catch (e) {}

    var qs = Object.keys(q).map(function(k){
      return encodeURIComponent(k) + '=' + encodeURIComponent(q[k] || '');
    }).join('&');

    window.location.href = base + '?' + qs;
  }

  function _someFilterFilled(rec) {
    var ids = [
      'custpage_cliente_dep','custpage_filt_doc','custpage_filt_tran',
      'custpage_filt_monto','custpage_filt_banco','custpage_filt_memo',
      'custpage_filt_desde','custpage_filt_hasta',
      'custpage_filt_asiento' // NUEVO
    ];
    for (var i=0;i<ids.length;i++){
      var v = rec.getValue({ fieldId: ids[i] });
      if (v) return true;
    }
    return false;
  }

  function fieldChanged(ctx) {
    var rec = currentRecord.get();

    // Redirigir cuando cambia Cliente o cualquier filtro
    if (!ctx.sublistId &&
        (ctx.fieldId === 'custpage_cliente_dep' ||
         ctx.fieldId.indexOf('custpage_filt_') === 0)) {
      if (_someFilterFilled(rec)) {
        _redirectWithFilters();
      }
      return;
    }

    if (ctx.sublistId === SUB && ctx.fieldId === 'custpage_sel') {
      var ln   = ctx.line;
      var sel  = rec.getCurrentSublistValue({ sublistId: SUB, fieldId: 'custpage_sel' });
      var used = rec.getSublistValue({ sublistId: SUB, fieldId: 'custpage_sf_used', line: ln });

      // Normalizar el valor del checkbox "Usado"
      var isUsed = (used === true || used === 'T' || used === 'true' || used === 1);

      if (sel && isUsed) {
        alert('Este registro ya está vinculado a otra confirmación. No puede reutilizarse.');
        rec.setCurrentSublistValue({
          sublistId: SUB, fieldId: 'custpage_sel', value: false, ignoreFieldChange: true
        });
        return;
      }

      var id = rec.getSublistValue({ sublistId: SUB, fieldId: 'custpage_sf_id', line: ln });
      var tipo = rec.getSublistValue({ sublistId: SUB, fieldId: 'custpage_sf_tipo', line: ln });

      // Selección exclusiva: si es JOURNAL -> custpage_asiento_id, si no -> custpage_saldofavor_id
      if (sel) {
        if (tipo === 'JOURNAL') {
          rec.setValue({ fieldId: 'custpage_asiento_id', value: id });
          rec.setValue({ fieldId: 'custpage_saldofavor_id', value: '' });
        } else {
          rec.setValue({ fieldId: 'custpage_saldofavor_id', value: id });
          rec.setValue({ fieldId: 'custpage_asiento_id', value: '' });
        }
      } else {
        // si deselecciona, limpiar ambos por seguridad
        rec.setValue({ fieldId: 'custpage_saldofavor_id', value: '' });
        rec.setValue({ fieldId: 'custpage_asiento_id', value: '' });
      }

      if (sel) {
        var count = rec.getLineCount({ sublistId: SUB });
        for (var i = 0; i < count; i++) {
          if (i !== ln) {
            rec.setSublistValue({ sublistId: SUB, fieldId: 'custpage_sel', line: i, value: false });
          }
        }
      }
    }
  }

  function saveRecord(ctx) {
    var rec = currentRecord.get();
    var acc = rec.getValue({ fieldId: 'custpage_accion' }) || '';

    var saldoId   = rec.getValue({ fieldId: 'custpage_saldofavor_id' });
    var asientoId = rec.getValue({ fieldId: 'custpage_asiento_id' });

    if (acc === 'confirm' && !saldoId && !asientoId) {
      alert('Debe seleccionar un Saldo a Favor o un Asiento antes de guardar.');
      return false;
    }
    return true;
  }

  function openSaldoFavorTab() {
    var rec = currentRecord.get();
    var id  = rec.getValue({ fieldId: 'custpage_saldofavor_id' });
    if (!id) {
      alert('Seleccione un saldo a favor');
      return;
    }
    window.open(
      url.resolveRecord({ recordType: 'customerdeposit', recordId: id, isEditMode: false }),
      '_blank'
    );
  }

  return {
    fieldChanged:      fieldChanged,
    saveRecord:        saveRecord,
    openSaldoFavorTab: openSaldoFavorTab
  };
});
