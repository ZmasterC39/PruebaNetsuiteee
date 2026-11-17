/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date 23/01/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 * @LastModifiedBy 24/01/2025
 */

define(['N/url', 'N/ui/message'] , (url, message) => {

    function pageInit(context) {
        var resetter = document.getElementById('resetter');
        var markAllButton = document.getElementById('custpage_sublistamarkall');
        var unmarkAllButton = document.getElementById('custpage_sublistaunmarkall');

        if (resetter) {
            resetter.addEventListener('click', function() {
                window.onbeforeunload = null;
                let ruta = url.resolveScript({
                    scriptId: "customscript_hu_ec_st_aprobar_os",
                    deploymentId: "customdeploy_hu_ec_st_aprobar_os",
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

        const params = new URLSearchParams(window.location.search);
        const infoParam = params.get('info');

        if (infoParam === 'true') {
            message.create({
                type: message.Type.CONFIRMATION,
                title: 'Información',
                message: '<p style="font-size: 18px;">La aprobación de venta fue exitosa.</p>',
                duration: 20000
            }).show();
        }
    }

    function saveRecord(context) {
        let currentRecord = context.currentRecord;
        let sublistLineCount = currentRecord.getLineCount({
            sublistId: "custpage_sublista",
        });

        let seleccionado;
        let cantidad_seleccionadas = 0;
        for (let i = 0; i < sublistLineCount; i++) {
            let checkboxValue = currentRecord.getSublistValue({
                sublistId: "custpage_sublista",
                fieldId: "custpage_checkbox",
                line: i,
            });

            seleccionado = checkboxValue;
            if(seleccionado){
                cantidad_seleccionadas++;
            }
        }

      if(cantidad_seleccionadas > 0){
            let confirmacion = confirm("¿Está seguro de que quiere realizar la aprobación?");
            if (!confirmacion) {
                return false;
            }
            return true;
        }else{
            alert('Debe seleccionar al menos una Orden de Servicio');
            return false;
        }
    }

    function fieldChanged(context) {
        const fieldId = context.fieldId;
        let numero_impuesto = context.currentRecord.getValue({
            fieldId: "custpage_numero_impuesto",
        });
        let fecha_desde = context.currentRecord.getText({
            fieldId: "custpage_fecha_desde",
        });
        let fecha_hasta = context.currentRecord.getText({
            fieldId: "custpage_fecha_hasta",
        });

        let pagina = context.currentRecord.getValue({
            fieldId: "custpage_pagina",
        });

        if(fieldId === 'custpage_numero_impuesto') {
            numero_impuesto = numero_impuesto.replace(/[^0-9]/g, "");
            window.onbeforeunload = null;
            let ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_st_aprobar_os",
                deploymentId: "customdeploy_hu_ec_st_aprobar_os",
                params: {
                numero_impuesto,
                fecha_desde,
                fecha_hasta,
                },
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;
            return;

        }

        if(fieldId === 'custpage_fecha_desde' || fieldId === 'custpage_fecha_hasta'){
            if(fecha_desde && fecha_hasta){
                window.onbeforeunload = null;
                let ruta = url.resolveScript({
                    scriptId: "customscript_hu_ec_st_aprobar_os",
                    deploymentId: "customdeploy_hu_ec_st_aprobar_os",
                    params: {
                    numero_impuesto,
                    fecha_desde,
                    fecha_hasta,
                    },
                    returnExternalUrl: false,
                });

                setWindowChanged(window, false);
                window.location.href = ruta;
            }
        }

        if (fieldId === 'custpage_checkbox') {
            calcularImporte(context);
        }

        if (fieldId === `custpage_pagina`){
            window.onbeforeunload = null;
            let ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_st_aprobar_os",
                deploymentId: "customdeploy_hu_ec_st_aprobar_os",
                params: {
                numero_impuesto,
                fecha_desde,
                fecha_hasta,
                pg: pagina,
                },
                returnExternalUrl: false,
            });

            setWindowChanged(window, false);
            window.location.href = ruta;
        }
    }

    function calcularImporte(context){
        let currentRecord = context.currentRecord;
        let sublistLineCount = currentRecord.getLineCount({
            sublistId: "custpage_sublista",
        });
        let totalImporte = 0;
        for (let i = 0; i < sublistLineCount; i++) {
            let checkboxValue = currentRecord.getSublistValue({
                sublistId: "custpage_sublista",
                fieldId: "custpage_checkbox",
                line: i,
            });

            if (checkboxValue === true) {
                let importeLinea = currentRecord.getSublistValue({
                    sublistId: "custpage_sublista",
                    fieldId: "custpage_total_orden",
                    line: i,
                });
                totalImporte += parseFloat(importeLinea || 0);
            }
        }
        currentRecord.setValue({
            fieldId: "custpage_importe",
            value: totalImporte.toFixed(2),
        });
    }

    return {
        pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged
    }
})