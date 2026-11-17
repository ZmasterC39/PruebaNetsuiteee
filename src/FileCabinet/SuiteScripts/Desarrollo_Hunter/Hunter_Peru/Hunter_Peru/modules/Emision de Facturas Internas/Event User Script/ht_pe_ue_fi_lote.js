/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/log'], function (serverWidget, log) {
  const LOT_REC = 'customrecord_ht_pe_fi_lote';

  const FLD_ESTADO = 'custrecord_ht_pe_estado';
  const FLD_PROCESO = 'custrecord_ht_pe_proceso';
  const FLD_PROGRESS = 'custrecord_ht_pe_fi_ejecucion';
  const FLD_PARAMS = 'custrecord_ht_pe_params';
  const FLD_TOTAL = 'custrecord_ht_pe_total';
  const FLD_OK = 'custrecord_ht_pe_ok';
  const FLD_ERR = 'custrecord_ht_pe_err';

  const VIEW_FIELDS_TO_HIDE = [
    FLD_ESTADO,
    FLD_PROCESO,
    FLD_PROGRESS,
    FLD_PARAMS,
    FLD_TOTAL,
    FLD_OK,
    FLD_ERR
  ];

  const ESTADO_INFO = {
    1: {
      label: 'Completado',
      color: '#137a55',
      softColor: '#e8f5ef',
      message: 'El lote finalizó correctamente y sus resultados ya están disponibles.'
    },
    2: {
      label: 'Finalizado con errores',
      color: '#b42318',
      softColor: '#fef0ef',
      message: 'La ejecución terminó con errores. Revisa los resultados y archivos de salida.'
    },
    3: {
      label: 'Pendiente en cola',
      color: '#7a5d00',
      softColor: '#fff6d8',
      message: 'El lote está en cola y comenzará cuando finalice el proceso anterior.'
    },
    4: {
      label: 'Procesando',
      color: '#1f5f99',
      softColor: '#eaf3fb',
      message: 'NetSuite está generando las facturas internas de este lote.'
    }
  };

  const PROCESO_INFO = {
    1: { label: 'Anulación', color: '#7146a8', softColor: '#f2edfa' },
    2: { label: 'Emisión', color: '#1f5f99', softColor: '#eaf3fb' }
  };

  function toInt(value) {
    const parsed = Number(String(value == null ? '' : value).replace(/,/g, '').trim());
    return isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed));
  }

  function toPercent(value) {
    const parsed = Number(String(value == null ? '' : value)
      .replace('%', '')
      .replace(/,/g, '')
      .trim());
    if (isNaN(parsed)) return 0;
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hideField(form, fieldId) {
    try {
      const field = form.getField({ id: fieldId });
      if (field) {
        field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
      }
    } catch (e) {
      log.debug('hideField', {
        fieldId: fieldId,
        error: (e && e.message) || String(e)
      });
    }
  }

  function getEstadoInfo(value) {
    return ESTADO_INFO[value] || {
      label: 'Estado no disponible',
      color: '#5f6b7a',
      softColor: '#eef1f4',
      message: 'No se pudo determinar el estado actual del lote.'
    };
  }

  function getProcesoInfo(value) {
    return PROCESO_INFO[value] || {
      label: 'Proceso no disponible',
      color: '#5f6b7a',
      softColor: '#eef1f4'
    };
  }

  function getStatusMessage(estadoCode, procesoCode, fallbackMessage) {
    if (estadoCode !== 4) return fallbackMessage;
    if (procesoCode === 1) {
      return 'NetSuite está anulando las facturas internas de este lote.';
    }
    return 'NetSuite está generando las facturas internas de este lote.';
  }

  function getMetricLabels(procesoCode) {
    if (procesoCode === 1) {
      return {
        total: 'Facturas objetivo',
        processed: 'Facturas anuladas',
        errors: 'Errores detectados'
      };
    }
    return {
      total: 'Órdenes fuente',
      processed: 'Facturas creadas',
      errors: 'Errores detectados'
    };
  }

  function metricHtml(label, value, modifier) {
    return '<div class="ht-fi-metric ' + modifier + '">' +
      '<div class="ht-fi-metric-label">' + escapeHtml(label) + '</div>' +
      '<div class="ht-fi-metric-value">' + escapeHtml(value) + '</div>' +
      '</div>';
  }

  function buildDashboardHtml(data) {
    const estado = data.estado;
    const proceso = data.proceso;
    const progressColor = data.estadoCode === 2 ? '#b42318' :
      (data.percent >= 100 ? '#137a55' : '#2471a3');
    const lotSuffix = data.lotId ? ' #' + escapeHtml(data.lotId) : '';

    return '<style>' +
      '#ht-pe-fi-dashboard{box-sizing:border-box;width:100%;margin:8px 0 20px;' +
        'border:1px solid #cfd8e3;border-radius:8px;background:#fff;' +
        'box-shadow:0 2px 8px rgba(31,55,80,.10);overflow:hidden;' +
        'font-family:Arial,Helvetica,sans-serif;color:#26384a}' +
      '#ht-pe-fi-dashboard *{box-sizing:border-box}' +
      '#ht-pe-fi-dashboard .ht-fi-header{display:flex;align-items:center;justify-content:space-between;' +
        'gap:24px;padding:20px 24px;background:linear-gradient(110deg,#263f63 0%,#315f8e 100%);color:#fff}' +
      '#ht-pe-fi-dashboard .ht-fi-title-wrap{display:flex;align-items:center;gap:14px;min-width:260px}' +
      '#ht-pe-fi-dashboard .ht-fi-icon{display:flex;align-items:center;justify-content:center;' +
        'width:42px;height:42px;flex:0 0 42px;border-radius:9px;background:rgba(255,255,255,.14);' +
        'border:1px solid rgba(255,255,255,.28)}' +
      '#ht-pe-fi-dashboard .ht-fi-kicker{font-size:10px;line-height:14px;font-weight:700;' +
        'letter-spacing:1.25px;color:#cfe2f5;text-transform:uppercase}' +
      '#ht-pe-fi-dashboard .ht-fi-title{margin-top:2px;font-size:20px;line-height:25px;font-weight:700}' +
      '#ht-pe-fi-dashboard .ht-fi-subtitle{margin-top:2px;font-size:12px;line-height:17px;color:#dce8f3}' +
      '#ht-pe-fi-dashboard .ht-fi-tags{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px}' +
      '#ht-pe-fi-dashboard .ht-fi-tag{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;' +
        'border-radius:16px;background:#fff;font-size:12px;line-height:16px;font-weight:700;white-space:nowrap}' +
      '#ht-pe-fi-dashboard .ht-fi-tag-label{font-size:9px;letter-spacing:.6px;text-transform:uppercase;opacity:.72}' +
      '#ht-pe-fi-dashboard .ht-fi-body{display:flex;align-items:stretch;gap:18px;padding:20px 24px}' +
      '#ht-pe-fi-dashboard .ht-fi-progress-card{flex:1 1 560px;min-width:300px;padding:17px 18px;' +
        'border:1px solid #dce3ea;border-radius:7px;background:#fbfcfd}' +
      '#ht-pe-fi-dashboard .ht-fi-progress-heading{display:flex;align-items:flex-end;' +
        'justify-content:space-between;gap:16px;margin-bottom:11px}' +
      '#ht-pe-fi-dashboard .ht-fi-progress-title{font-size:13px;line-height:18px;font-weight:700;color:#31465b}' +
      '#ht-pe-fi-dashboard .ht-fi-percent{font-size:23px;line-height:25px;font-weight:700;color:' + progressColor + '}' +
      '#ht-pe-fi-dashboard .ht-fi-track{height:13px;border:1px solid #cfd8e3;border-radius:7px;' +
        'background:#e8edf2;overflow:hidden}' +
      '#ht-pe-fi-dashboard .ht-fi-fill{height:100%;width:' + data.percent + '%;' +
        'border-radius:6px;background:' + progressColor + '}' +
      '#ht-pe-fi-dashboard .ht-fi-message{margin-top:11px;font-size:12px;line-height:18px;color:#4b5f73}' +
      '#ht-pe-fi-dashboard .ht-fi-footer{display:flex;align-items:center;justify-content:space-between;' +
        'gap:15px;margin-top:14px;padding-top:13px;border-top:1px solid #e2e8ee}' +
      '#ht-pe-fi-dashboard .ht-fi-note{font-size:11px;line-height:16px;color:#6b7785}' +
      '#ht-pe-fi-dashboard .ht-fi-refresh{min-height:29px;padding:5px 13px;border:1px solid #7d91a6;' +
        'border-radius:4px;background:#fff;color:#244a70;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '#ht-pe-fi-dashboard .ht-fi-refresh:hover{background:#edf4fa;border-color:#526f8d}' +
      '#ht-pe-fi-dashboard .ht-fi-metrics{display:flex;flex:0 1 440px;min-width:330px;gap:10px}' +
      '#ht-pe-fi-dashboard .ht-fi-metric{position:relative;flex:1 1 0;min-width:96px;padding:16px 14px;' +
        'border:1px solid #dce3ea;border-radius:7px;background:#fff;overflow:hidden}' +
      '#ht-pe-fi-dashboard .ht-fi-metric:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#5b7fa3}' +
      '#ht-pe-fi-dashboard .ht-fi-metric.ht-fi-ok:before{background:#238263}' +
      '#ht-pe-fi-dashboard .ht-fi-metric.ht-fi-error:before{background:#c7463b}' +
      '#ht-pe-fi-dashboard .ht-fi-metric-label{font-size:10px;line-height:14px;font-weight:700;' +
        'letter-spacing:.45px;color:#66788a;text-transform:uppercase}' +
      '#ht-pe-fi-dashboard .ht-fi-metric-value{margin-top:10px;font-size:25px;line-height:28px;' +
        'font-weight:700;color:#263f58}' +
      '@media(max-width:1050px){#ht-pe-fi-dashboard .ht-fi-header,#ht-pe-fi-dashboard .ht-fi-body{flex-wrap:wrap}' +
        '#ht-pe-fi-dashboard .ht-fi-tags{justify-content:flex-start}' +
        '#ht-pe-fi-dashboard .ht-fi-body{flex-wrap:wrap}' +
        '#ht-pe-fi-dashboard .ht-fi-metrics{flex-basis:100%;min-width:0}' +
        '#ht-pe-fi-dashboard .ht-fi-progress-card{min-width:0}}' +
      '@media(max-width:620px){#ht-pe-fi-dashboard .ht-fi-header,#ht-pe-fi-dashboard .ht-fi-body{padding:16px}' +
        '#ht-pe-fi-dashboard .ht-fi-footer{align-items:flex-start;flex-direction:column}' +
        '#ht-pe-fi-dashboard .ht-fi-metrics{flex-direction:column}' +
        '#ht-pe-fi-dashboard .ht-fi-metric{min-width:100%}}' +
      '</style>' +
      '<div id="ht-pe-fi-dashboard">' +
        '<div class="ht-fi-header">' +
          '<div class="ht-fi-title-wrap">' +
            '<div class="ht-fi-icon" aria-hidden="true">' +
              '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M7 3.5h7l4 4V20.5H7z" stroke="white" stroke-width="1.7" stroke-linejoin="round"/>' +
                '<path d="M14 3.5v4h4M9.5 11h6M9.5 14h6M9.5 17h4" stroke="white" stroke-width="1.7" stroke-linecap="round"/>' +
              '</svg>' +
            '</div>' +
            '<div>' +
              '<div class="ht-fi-kicker">Facturación interna</div>' +
              '<div class="ht-fi-title">Seguimiento del lote' + lotSuffix + '</div>' +
              '<div class="ht-fi-subtitle">Control de ejecución y resultados</div>' +
            '</div>' +
          '</div>' +
          '<div class="ht-fi-tags">' +
            '<span class="ht-fi-tag" style="color:' + estado.color + ';background:' + estado.softColor + '">' +
              '<span class="ht-fi-tag-label">Estado</span>' + escapeHtml(estado.label) +
            '</span>' +
            '<span class="ht-fi-tag" style="color:' + proceso.color + ';background:' + proceso.softColor + '">' +
              '<span class="ht-fi-tag-label">Proceso</span>' + escapeHtml(proceso.label) +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="ht-fi-body">' +
          '<div class="ht-fi-progress-card">' +
            '<div class="ht-fi-progress-heading">' +
              '<div class="ht-fi-progress-title">Avance de ejecución</div>' +
              '<div class="ht-fi-percent">' + data.percent + '%</div>' +
            '</div>' +
            '<div class="ht-fi-track" role="progressbar" aria-label="Avance de ejecución" ' +
              'aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + data.percent + '">' +
              '<div class="ht-fi-fill"></div>' +
            '</div>' +
            '<div class="ht-fi-message">' + escapeHtml(data.statusMessage) + '</div>' +
            '<div class="ht-fi-footer">' +
              '<div class="ht-fi-note">La información corresponde a la última carga de esta página.</div>' +
              '<button class="ht-fi-refresh" type="button" onclick="window.location.reload();return false;">' +
                'Actualizar avance' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="ht-fi-metrics">' +
            metricHtml(data.metricLabels.total, data.total, 'ht-fi-total') +
            metricHtml(data.metricLabels.processed, data.processed, 'ht-fi-ok') +
            metricHtml(data.metricLabels.errors, data.errors, 'ht-fi-error') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function addDashboard(form, html) {
    const dashboard = form.addField({
      id: 'custpage_ht_pe_fi_dashboard',
      label: 'Seguimiento del lote',
      type: serverWidget.FieldType.INLINEHTML
    });
    dashboard.defaultValue = html;

    try {
      dashboard.updateLayoutType({
        layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
      });
      dashboard.updateBreakType({
        breakType: serverWidget.FieldBreakType.STARTROW
      });
    } catch (e) {
      log.debug('dashboardLayout', (e && e.message) || String(e));
    }

    try {
      form.insertField({ field: dashboard, nextfield: 'isinactive' });
    } catch (e) {
      log.debug('dashboardInsert', (e && e.message) || String(e));
    }
  }

  function beforeLoad(scriptContext) {
    try {
      const rec = scriptContext.newRecord;
      const type = scriptContext.type;
      const userEventType = scriptContext.UserEventType;

      if (!rec || rec.type !== LOT_REC || type !== userEventType.VIEW) return;

      const form = scriptContext.form;
      const estadoCode = toInt(rec.getValue({ fieldId: FLD_ESTADO }));
      const procesoCode = toInt(rec.getValue({ fieldId: FLD_PROCESO }));
      const estado = getEstadoInfo(estadoCode);
      const storedPercent = toPercent(rec.getValue({ fieldId: FLD_PROGRESS }));
      const displayPercent = (estadoCode === 1 || estadoCode === 2) ? 100 : storedPercent;

      VIEW_FIELDS_TO_HIDE.forEach(function (fieldId) {
        hideField(form, fieldId);
      });

      addDashboard(form, buildDashboardHtml({
        lotId: rec.id || rec.getValue({ fieldId: 'name' }),
        estadoCode: estadoCode,
        estado: estado,
        proceso: getProcesoInfo(procesoCode),
        statusMessage: getStatusMessage(estadoCode, procesoCode, estado.message),
        metricLabels: getMetricLabels(procesoCode),
        percent: displayPercent,
        total: toInt(rec.getValue({ fieldId: FLD_TOTAL })),
        processed: toInt(rec.getValue({ fieldId: FLD_OK })),
        errors: toInt(rec.getValue({ fieldId: FLD_ERR }))
      }));
    } catch (e) {
      log.error('beforeLoad_error', (e && e.message) || String(e));
    }
  }

  return { beforeLoad: beforeLoad };
});
