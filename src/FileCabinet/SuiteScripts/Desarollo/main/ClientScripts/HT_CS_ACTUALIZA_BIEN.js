/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/query', 'N/log', 'N/currentRecord', 'N/ui/dialog', 'N/https', 'N/url', 'N/runtime', '../Routes/routeCliente',], function (query, log, currentRecord, dialog, https, url, runtime, routeCliente) {

    let typeMode = "";

    function pageInit(context) {

    }


    function saveRecord(context) {

        console.log('proceso de actualizacion en plataforma')

        try {
            // Obtiene el registro actual que se está actualizando
            var currentRecord = context.currentRecord;
            // Obtiene el valor de un campo específico
            var idBien = currentRecord.getValue({
                fieldId: 'id'
            });

            console.log('idBien', idBien);


        } catch (error) {

        }

    }

    return {
        pageInit: pageInit,
        //saveRecord: saveRecord
    }
});
