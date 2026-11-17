/**
* @NApiVersion 2.1
* @NScriptType Restlet
* @NModuleScope Public
*/
define(['N/query', 'N/search', 'N/log', 'N/error', 'N/format', './kpi/produccionOS.js'], function (query, search, log, error, format, kpi) {

    // En produccionOS.js, añade más logs
    function _post(context) {
        if (context.action === 'v1') {
            try {
                // Asegurar que los parámetros correctos se pasen a la función
                const response = kpi.post({
                    startDate: context.startDate,
                    endDate: context.endDate,
                    showDetails: context.showDetails
                });

                log.debug('Respuesta de funcPrincipal', response);

                return response || {
                    success: false,
                    error: 'No data found or invalid response'
                };
            } catch (e) {
                log.error('Error en _post', e);
                return {
                    success: false,
                    error: e.message || 'Error desconocido'
                };
            }
        }

        return {
            success: false,
            error: 'Invalid action'
        };
    }

    return {
        post: _post
    };
});