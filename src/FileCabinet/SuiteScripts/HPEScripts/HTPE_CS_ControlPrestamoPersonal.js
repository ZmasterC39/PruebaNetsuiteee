/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], function(currentRecord) {
    function pageInit(context) {
        // Obligatorio por API, se deja vacío
    }

    function enviarReportePost(tipoReporte) {
        try {
            var formHtml = document.getElementById('main_form');
            if (!formHtml) return;

            // 1. Obtenemos el registro en vivo desde la UI usando la API nativa
            var rec = currentRecord.get();
            var isChecked = rec.getValue({ fieldId: 'custpage_hide_zero' });
            
            // Determinamos con total certeza el valor string que debe viajar ('T' o 'F')
            var hideZeroParam = (isChecked === true || isChecked === 'T' || isChecked === 'true') ? 'T' : 'F';
            
            console.log("Forzando envío del parámetro real -> custpage_hide_zero = " + hideZeroParam);

            // 💡 EL TRUCO DEFINITIVO PARA CONTROLAR EL SUBMIT:
            // Eliminamos cualquier input oculto previo que NetSuite use para sabotear el valor
            var existingInput = document.getElementById('forced_hide_zero');
            if (existingInput) {
                existingInput.parentNode.removeChild(existingInput);
            }

            // Creamos nuestro propio input oculto 'limpio' y lo metemos al formulario
            var hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'forced_hide_zero';
            hiddenInput.name = 'custpage_hide_zero'; // Mismo ID del parámetro que lee el Suitelet
            hiddenInput.value = hideZeroParam;
            formHtml.appendChild(hiddenInput);

            // 1. Guardar los valores originales del formulario nativo
            var oldTarget = formHtml.target;
            var oldBeforeUnload = window.onbeforeunload;

            // 2. Asignar el tipo de reporte al campo oculto que ya existe en el formulario
            var btnTypeField = document.getElementById('custpage_btn_type');
            if (btnTypeField) {
                btnTypeField.value = tipoReporte;
            }

            // 3. Crear un nombre único para la nueva pestaña
            var targetName = 'NSPDF_Excel_Window_' + new Date().getTime();
            
            // 4. EL TRUCO DEFINITIVO: Abrir una pestaña vacía usando los permisos del navegador
            window.open('', targetName);

            // 5. Redireccionar el formulario real de NetSuite hacia esa nueva pestaña vacía
            formHtml.target = targetName;
            window.onbeforeunload = null;

            // 6. Enviar el formulario real (Lleva TODOS los parámetros nativos requeridos por NetSuite)
            formHtml.submit();

            // 7. RESTAURACIÓN INMEDIATA: Dejar el formulario original idéntico a como estaba
            formHtml.target = oldTarget;
            window.onbeforeunload = oldBeforeUnload;

            // 8. Romper la bandera de bloqueo de NetSuite para que la pantalla origen siga viva
            if (typeof NS !== 'undefined' && NS.form) {
                NS.form.isSubmitted = false;
            }

        } catch (error) {
            console.error("Error al procesar el envío:", error);
            alert("Error en el navegador: " + error.message);
        }
    }

    return {
        pageInit: pageInit,
        enviarReportePost: enviarReportePost
    };
});