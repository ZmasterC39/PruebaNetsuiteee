/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/url', 'N/log'], (url, log) =>{
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
                    scriptId: "customscript_hu_ec_sl_emision_masiva_fin",
                    deploymentId: "customdeploy_hu_ec_sl_emision_fin",
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
            log.error("ERROR pageInit", error);
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;
            const currentRecord = context.currentRecord;

            const cliente = currentRecord.getValue({ fieldId: 'custpage_cliente' }) || false;
            const fecha_inicio = currentRecord.getText({ fieldId: 'custpage_fecha_inicio' }) || false;
            const fecha_fin = currentRecord.getText({ fieldId: 'custpage_fecha_fin' }) || false;

            const newParams = {};

            if( fieldId == 'custpage_checkbox'){
                calcularImporte(context)
            }

            if(fieldId == 'custpage_cliente' || fieldId == 'custpage_fecha_inicio' || fieldId == 'custpage_fecha_fin'){
                if(cliente  && fecha_inicio && fecha_fin){
                    newParams.cliente = cliente;
                    newParams.fecha_inicio = fecha_inicio;
                    newParams.fecha_fin = fecha_fin;

                    window.onbeforeunload = null;
                    const ruta = url.resolveScript({
                        scriptId: "customscript_hu_ec_sl_emision_fin",
                        deploymentId: "customdeploy_hu_ec_sl_emision_fin",
                        params: newParams,
                        returnExternalUrl: false,
                    });
                    setWindowChanged(window, false);
                    window.location.href = ruta;
                }
            }
        } catch (error) {
            log.error("ERROR fieldChanged", error);
        }
    }

    function saveRecord(context) {
        try {
            let currentRecord = context.currentRecord;
            let cliente = currentRecord.getValue({ fieldId: 'custpage_cliente'});
            let fecha_inicio = currentRecord.getValue({ fieldId: 'custpage_fecha_inicio'});
            let fecha_fin = currentRecord.getValue({ fieldId: 'custpage_fecha_fin'});

            if( !cliente || !fecha_inicio || !fecha_fin){
                alert("Se requiere información en campos obligatorios");
                return false;
            }

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
                    ? `¿Está seguro de realizar la emisión de Factura Interna de 1 Orden de servicio?`
                    : `¿Está seguro de realizar la emisión de Factura Interna de ${seleccionado} Ordenes de servicio?`;

                let confirmacion = confirm(mensaje);

                if(!confirmacion){
                    return false;
                }else{
                    return true;
                }
            }else{
                alert('Debe seleccionar al menos una Factura Interna');
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
                        fieldId: "custpage_importe",
                        line: i,
                    });
                    totalImporte += parseFloat(importeLinea || 0);
                    seleccionados += 1;
                }
            }

            let formatoMoneda = totalImporte.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

            currentRecord.setValue({
                fieldId: "custpage_importe2",
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

    function estado(params) {
        window.onbeforeunload = null;
        const ruta = url.resolveScript({
            scriptId: "customscript_hu_ec_sl_estado",
            deploymentId: "customdeploy_hu_ec_sl_estado",
            params: {
                tipo_proceso: '2',
            },
            returnExternalUrl: false,
        });
        setWindowChanged(window, false);
        window.location.href = ruta;
    }

    return {pageInit, fieldChanged, saveRecord, estado}

});