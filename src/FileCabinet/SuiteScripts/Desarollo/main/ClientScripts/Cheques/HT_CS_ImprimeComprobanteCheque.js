/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',
    'N/runtime',
    'N/record',
    'N/ui/dialog'
], (url, runtime, record, dialog) => {
  
    const IMPRESION_CERTIFICADO_SCRIPT_ID2 = "customscript_ht_sl_impresion_personaliza";
    const IMPRESION_CERTIFICADO_DEPLOYMENT_ID2 = "customdeploy_ht_sl_impresion_personaliza";
  
    const pageInit = (scriptContext) => { }


    const getSuiteletUrl = (scriptId, deploymentId) => {
        return url.resolveScript({
            scriptId: scriptId,
            deploymentId: deploymentId,
            returnExternalUrl: false
        });
    }

    const getHostDomain = () => {
        return host = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: runtime.accountId
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


const printPagotest = (vendoPayment, tipo) => {
    try {
        let params = { vendoPayment, tipo };
        let host = getHostDomain();
        let suiteletUrl = getSuiteletUrl(IMPRESION_CERTIFICADO_SCRIPT_ID2, IMPRESION_CERTIFICADO_DEPLOYMENT_ID2);
        let fullUrl = addParametersToUrl(`https://${host}${suiteletUrl}`, params);
        window.open(fullUrl, '_blank');
    } catch (error) {
        console.error("Error en la función printPagotest:", error.message);
        console.error("Tipo de error:", error.name);
        console.error("Stack Trace:", error.stack);
    }
}


    return {
        pageInit,
        printPagotest
    };
});
/********************************************************************************************************************************************************
TRACKING
/********************************************************************************************************************************************************
/* Commit:01
Version: 1.0
Date: 27/06/2022
Author: Jean Ñique
Description: Creación del script.
========================================================================================================================================================*/