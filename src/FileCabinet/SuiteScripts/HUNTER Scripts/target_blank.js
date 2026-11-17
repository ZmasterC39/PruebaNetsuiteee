/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget'], function(serverWidget) {
    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = serverWidget.createForm({
                title: 'Resultados de Facturación VS Presupuesto'
            });

            form.clientScriptModulePath = './path/to/client_script.js';

            // Agregar elementos al formulario según tu lógica
            form.addField({
                id: 'custpage_mes',
                type: serverWidget.FieldType.SELECT,
                label: 'Mes'
            }).addSelectOption({ value: '12', text: 'Diciembre' });

            context.response.writePage(form);
        }
    }

    return {
        onRequest: onRequest
    };
});
