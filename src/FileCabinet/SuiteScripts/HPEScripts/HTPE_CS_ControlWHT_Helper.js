/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {
    function pageInit(scriptContext) {}

    function generarPDFLocal() {
        // Cambiamos el valor del campo oculto que creamos en el Suitelet
        document.getElementById('custpage_btn_type').value = 'pdf';
        // Quitamos la alerta de "Desea salir del sitio"
        window.onbeforeunload = null;
        // Forzamos el envío del formulario (POST)
        document.getElementById('submitter').click();
    }

    return {
        pageInit: pageInit,
        generarPDFLocal: generarPDFLocal
    };
});