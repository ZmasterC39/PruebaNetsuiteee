/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/url'], function (url) {

  // Envía logs del cliente al Suitelet (Execution Log nativo)
  function reportToServer(payload) {
    try {
      var u = url.resolveScript({
        scriptId: 'customscript_pe_sl_detracciones_gen',
        deploymentId: 'customdeploy_pe_sl_detracciones_gen',
        params: { clientlog: JSON.stringify(payload) }
      });
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(u, blob);
      } else {
        // GET sin CORS para no bloquear la UI
        fetch(u, { method: 'GET', mode: 'no-cors' });
      }
    } catch (e) {
      // no romper UI
    }
  }

  // Captura errores globales
  window.addEventListener('error', function (ev) {
    reportToServer({
      type: 'window.error',
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      href: location.href
    });
  });

  // Promesas no manejadas
  window.addEventListener('unhandledrejection', function (ev) {
    reportToServer({
      type: 'unhandledrejection',
      reason: (ev.reason && (ev.reason.message || ev.reason.toString())) || 'unknown',
      href: location.href
    });
  });

  function fieldChanged(context) {
    // Evitar manipulación directa del DOM aquí
  }

  function cancelarDetraccion() {
    try {
      // Regresa al Suitelet base (ajusta script/deploy si fuese otro)
      location.href = location.href.split('?')[0] + '?script=6454&deploy=1';
    } catch (e) { /* noop */ }
  }

  function saveRecord(context) {
    try {
      var currentRecord = context.currentRecord;
      var montoTotal = currentRecord.getValue({ fieldId: 'custpagetotal' });
      if (montoTotal != null && montoTotal !== '') {
        return confirm('¿Estás seguro de realizar el pago de ' + montoTotal + ' por detracciones?');
      }
      return true;
    } catch (e) {
      reportToServer({ type: 'saveRecord.catch', message: e.message, href: location.href });
      alert('Ocurrió un error al validar el pago.');
      return false;
    }
  }

  return {
    saveRecord: saveRecord,
    fieldChanged: fieldChanged,
    cancelarDetraccion: cancelarDetraccion
  };
});