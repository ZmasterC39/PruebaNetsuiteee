/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/query', 'N/log', 'N/currentRecord', 'N/ui/dialog', 'N/https'], function (query, log, currentRecord, dialog, https) {

    function pageInit(context) {
      alert('alerta test')
      
        return true;
    }

    function saveRecord(context) {
      
        log.debug({ 'title': 'context', 'details': context });

        return true;

    }


    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    }
});
