/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/record", "N/search", "N/log", "N/currentRecord", 'N/ui/dialog', 'N/url'],
    (record, search, log, currentRecord, dialog, url) => {

        var typeMode = '';
        function pageInit(scriptContext) {
          
        }
     
        const fieldChanged = (scriptContext) => {
            let currentRecord = scriptContext.currentRecord;
            var fieldId = scriptContext.fieldId;

            if (fieldId == 'custpage_subsidiaria' || fieldId == 'custpage_periodo' || fieldId == 'custpage_pendientes' ) {
                console.log('entro');
                let custpage_subsidiaria = currentRecord.getValue('custpage_subsidiaria');
                let custpage_periodo = currentRecord.getValue('custpage_periodo');
                let custpage_pendientes = currentRecord.getValue('custpage_pendientes');
                if (!(custpage_subsidiaria && custpage_periodo && custpage_pendientes)) return true;
                let parameters = getFiltersValue(currentRecord);
                let suiteletURL = getSuiteletURL();
                suiteletURL = addParametersToUrl(suiteletURL, parameters);
                setWindowChanged(window, false);
                window.location.href = suiteletURL;
            }
        }
        const getFiltersValue = (currentRecord) => {
            let values = {
                subsidiaria: currentRecord.getValue('custpage_subsidiaria') ,
                ubicacion: currentRecord.getValue('custpage_periodo') ,
                pendientes: currentRecord.getValue('custpage_pendientes') ,
            };
            return values;
        }
        const getFiltersValue2 = (currentRecord,id) => {
            let values = {
                id : id || -1
            };
            return values;
        }
        const getSuiteletURL = () => {
            return url.resolveScript({
                scriptId: 'customscript_ts_sl_salesorden_generate',
                deploymentId: 'customdeploy_ts_sl_salesorden_generate',
                returnExternalUrl: false
            });
        }
    
        const addParametersToUrl = (suiteletURL, parameters) => {
            for (let param in parameters) {
                if (parameters[param]) {
                    suiteletURL = `${suiteletURL}&${param}=${parameters[param]}`;
                }
            }
            return suiteletURL;
        }
    
        function button_cancelar() {
       
            var suiteletUrl = url.resolveScript({
                scriptId: 'customscript_ts_sl_prueba', // ID del Suitelet
                deploymentId: 'customdeploy_ts_sl_prueba', // ID del despliegue del Suitelet
               
            });
            
            // Redirigir al usuario a la URL del Suitelet
            window.location.href = suiteletUrl;
   

        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            button_cancelar:button_cancelar
        };

    });