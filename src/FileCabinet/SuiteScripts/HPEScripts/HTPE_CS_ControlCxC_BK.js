/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], function(currentRecordModule) {
    
    function pageInit(scriptContext) {
        // Necesario para asociar funciones al scope global si se invocan desde botones
        window.enviarReportePost = enviarReportePost;
    }

    function enviarReportePost(tipoReporte) {
        try {
            // 🟢 Obtener la instancia del registro activo correctamente
            var rec = currentRecordModule.get();

            // 1. Validar campos obligatorios
            var fechaInicio = rec.getValue({ fieldId: 'custpage_date_from' });
            var fechaFin = rec.getValue({ fieldId: 'custpage_date_to' });
            
            if (!fechaInicio || !fechaFin) {
                alert('Por favor, defina los rangos de fecha de inicio y fin antes de generar el reporte.');
                return false;
            }

            // 🟢 2. Obtener el estado del checkbox desde la instancia 'rec'
            var isHideZero = rec.getValue({ fieldId: 'custpage_hide_zero' });
            var hideZeroVal = (isHideZero === true || isHideZero === 'T') ? 'T' : 'F';

            // 3. Asignar el tipo de reporte al campo oculto
            rec.setValue({
                fieldId: 'custpage_btn_type',
                value: tipoReporte,
                ignoreFieldChange: true
            });

            // 🟢 4. Asegurar que el estado del checkbox viaje en el submit mediante un input temporal
            var mainForm = document.forms[0] || document.getElementById('main_form');
            if (mainForm) {
                var hiddenInput = document.getElementById('custpage_hide_zero_override');
                if (!hiddenInput) {
                    hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'custpage_hide_zero_override';
                    hiddenInput.name = 'custpage_hide_zero';
                    mainForm.appendChild(hiddenInput);
                }
                // Si está desmarcado ('F'), enviamos 'F' explícitamente para que el Suitelet lo reciba
                hiddenInput.value = hideZeroVal;

                // 5. Desactivar bloqueos de confirmación al salir de la página
                if (typeof window.onbeforeunload !== 'undefined') {
                    window.onbeforeunload = null;
                }
                if (typeof NLPageHasChanged === 'function') {
                    NLPageHasChanged = function() { return false; }; 
                }
                if (typeof NS !== 'undefined' && NS.form) {
                    NS.form.isSubmitted = false;
                }

                // 6. Enviar el formulario
                mainForm.submit();
            }

        } catch (e) {
            console.error('Error al enviar el formulario POST:', e);
            alert('Ocurrió un error al procesar la solicitud: ' + e.message);
        }
    }

    return {
        pageInit: pageInit,
        enviarReportePost: enviarReportePost
    };
});