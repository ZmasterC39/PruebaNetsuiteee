/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 03/10/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define( ['N/log', 'N/url', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], function(log, url, _toolkit) {

    function pageInit(context) {
        try {
            let resetter = document.getElementById('resetter');
            let markAllButton = document.getElementById('custpage_sublistmarkall');
            let unmarkAllButton = document.getElementById('custpage_sublistunmarkall');
            let seleccionado = document.getElementById('custpage_seleccionados');

            if (resetter) {
            resetter.addEventListener('click', function() {
                window.onbeforeunload = null;
                let ruta = url.resolveScript({
                    scriptId: "customscript_hu_ec_sl_notificacion_aprob",
                    deploymentId: "customdeploy_hu_ec_sl_notificacion_aprob",
                    returnExternalUrl: false,
                });

                setWindowChanged(window, false);
                window.location.href = ruta;
            });
            }

            if (markAllButton) {
                markAllButton.addEventListener('click', function() {
                    calcularImporte(context);
                });
            }

            if (unmarkAllButton) {
                unmarkAllButton.addEventListener('click', function() {
                    calcularImporte(context);
                });
            }

            if(seleccionado){
                if (seleccionado) {
                    seleccionado.removeAttribute('disabled'); // Habilita el campo
                    seleccionado.style.backgroundColor = '#fff';
                    seleccionado.style.color = '#000';
                    seleccionado.style.border = '0px solid #000';
                }
            }
        } catch (error) {
            log.debug("ERROR pageInit", error);
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;

            if ( fieldId == 'custpage_checkbox') {
                calcularImporte(context);
                return;
            }

            let cliente = context.currentRecord.getValue({
                fieldId: "custpage_cliente",
            });
            let ejecutiva_ref = context.currentRecord.getValue({
                fieldId: "custpage_ejecutiva_ref",
            });
            let orden = context.currentRecord.getValue({
                fieldId: "custpage_orden",
            });
            let tipo = context.currentRecord.getValue({
                fieldId: "custpage_tipo",
            });
            let fecha_desde = context.currentRecord.getText({
                fieldId: "custpage_fecha_desde",
            });
            let fecha_hasta = context.currentRecord.getText({
                fieldId: "custpage_fecha_hasta",
            });

            const newParams = {};

            if(cliente) {
                newParams.cliente = cliente;
            }
            if(ejecutiva_ref) {
                newParams.ejecutiva_ref = ejecutiva_ref;
                let result = _toolkit.executeQuery('SELECT TOP 1 e.location, l.custrecord_oficina_region AS region  FROM employee e INNER JOIN location l ON e.location = l.id WHERE e.id = ?', [ejecutiva_ref]);
                newParams.region = result[0]?.region;
            }
            if(orden) {
                newParams.orden = orden;
                let result = _toolkit.executeQuery('SELECT TOP 1 t.entity AS entity, t.custbody_ht_os_ejecutivareferencia AS ejref, e.location. l.custrecord_oficina_region AS region FROM transaction t  INNER JOIN employee e ON t.custbody_ht_os_ejecutivareferencia  = e.id   INNER JOIN location l ON e.location = l.id WHERE t.id = ? ', [orden]);
                newParams.ejecutiva_ref = result[0]?.ejref;
                newParams.cliente = result[0]?.entity;
                newParams.region = result[0]?.region;
            }

            if (tipo) {
                newParams.tipo = tipo;
            }

            if( fecha_desde && fecha_hasta ) {
                newParams.fecha_desde = fecha_desde;
                newParams.fecha_hasta = fecha_hasta;
            }

            if( (fecha_desde && !fecha_hasta) || (!fecha_desde && fecha_hasta) ) {
                return;
            }
            window.onbeforeunload = null;
            const ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_sl_notificacion_aprob",
                deploymentId: "customdeploy_hu_ec_sl_notificacion_aprob",
                params: newParams,
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;
        } catch (error) {
            console.log("error", error);
            log.error("ERROR fieldChanged", error);
        }
    }

    function saveRecord(context) {
        try {
            let currentRecord = context.currentRecord;
            let pendiente_aprovacion_venta = []
            let pendiente_aprovacion_cartera = []
            let sublistLineCount = currentRecord.getLineCount({
                sublistId: "custpage_sublist",
            });
            let seleccionado = 0;
            for( let i = 0; i < sublistLineCount; i++){
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublist",
                    fieldId: "custpage_checkbox",
                    line: i,
                });

                if( checkboxValue ) {
                    seleccionado++;
                }
            }

            if( seleccionado > 0){
                let mensaje = seleccionado === 1
                    ? `¿Está seguro de solicitar aprobación de 1 Orden de servicio?`
                    : `¿Está seguro de solicitar aprobación de ${seleccionado} Ordenes de servicio?`;

                let confirmacion = confirm(mensaje);

                if(!confirmacion){
                    return false;
                }else{
                    return true;
                }
            }else{
                alert('Debe seleccionar al menos una Orden de Servicio.');
                return false;
            }
        } catch (error) {
            log.error("ERROR saveRecord", error);
        }
    }

    function calcularImporte(context){
        try {
            let currentRecord = context.currentRecord;
            let seleccionados = 0;
            let sublistLineCount = currentRecord.getLineCount({
                sublistId: "custpage_sublist",
            });
            let totalImporte = 0;
            for (let i = 0; i < sublistLineCount; i++) {
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublist",
                    fieldId: "custpage_checkbox",
                    line: i,
                });

                if (checkboxValue === true) {
                    let importeLinea = currentRecord.getSublistValue({
                        sublistId: "custpage_sublist",
                        fieldId: "custpage_total_orden",
                        line: i,
                    });
                    totalImporte += parseFloat(importeLinea || 0);
                    seleccionados += 1;
                }
            }

            let formatoMoneda = totalImporte.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

            currentRecord.setValue({
                fieldId: "custpage_importe",
                value: `
                <p style="font-size:13px;">
                        <span style="color:#6f6f6f;">IMPORTE:</span> ${formatoMoneda}
                    </p>`
            });
            currentRecord.setValue({
                fieldId: "custpage_seleccionados",
                value:  `<p style="font-size:13px;">
                        <span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> ${seleccionados} de ${sublistLineCount}
                    </p>`
            });
        } catch (error) {
            log.error("ERROR calcularImporte", error)
        }
    }

    return { pageInit, fieldChanged, saveRecord }
});