/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], function(currentRecord) {
    
    function pageInit(scriptContext) {
        // Necesario para registrar el Client Script en el Suitelet
    }

/*    function enviarReportePost(tipoBoton) {
        var rec = currentRecord.get();
        
        // 1. Asignamos el valor ('pdf_detallado' o 'excel_detallado') al campo oculto
        rec.setValue({
            fieldId: 'custpage_btn_type',
            value: tipoBoton,
            ignoreFieldChange: true
        });

        // 2. Buscamos el formulario nativo de NetSuite y lo enviamos
        var form = document.forms[0]; // O document.getElementById('main_form')
        if (form) {
            // Desbloqueamos el flag de envío de NetSuite por si acaso
            if (typeof NS !== 'undefined' && NS.form) {
                NS.form.isSubmitted = false;
            }
            form.submit();
        }
    }
*/
    function enviarReportePost(tipoReporte) {
    // 1. Validar que los campos mandatorios tengan datos antes de continuar
    // (Asegura que viajen los parámetros al Map/Reduce)
    var fechaInicio = nlapiGetFieldValue('custpage_date_from');
    var fechaFin = nlapiGetFieldValue('custpage_date_to');
    
    if (!fechaInicio || !fechaFin) {
        alert('Por favor, defina los rangos de fecha de inicio y fin antes de generar el reporte.');
        return false;
    }

    // 2. Romper y desactivar la alerta nativa de NetSuite de "Cambios no guardados"
    if (typeof window.onbeforeunload !== 'undefined') {
        window.onbeforeunload = null;
    }
    if (typeof NLPageHasChanged === 'function') {
        // Engañamos al sistema diciéndole que la página no tiene cambios pendientes
        NLPageHasChanged = function() { return false; }; 
    }
    window.NS = window.NS || {};
    if (window.NS.form) {
        window.NS.form.isSubmitted = false; // Desbloquea doble envío accidental
    }

    // 3. Asignar el tipo de botón al campo oculto y enviar el formulario de forma limpia
    nlapiSetFieldValue('custpage_btn_type', tipoReporte);
    
    // Disparar el click del botón de envío oculto nativo de NetSuite
    var submitButton = document.getElementById('submitter') || document.getElementById('btn_multibutton_submitter');
    if (submitButton) {
        submitButton.click();
    } else {
        document.forms[0].submit(); // Fallback si no encuentra el botón de envío visual
    }
}

    return {
        pageInit: pageInit,
        enviarReportePost: enviarReportePost
    };
});