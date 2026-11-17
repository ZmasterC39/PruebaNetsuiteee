/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url'], (url) => {

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;
            const currentRecord = context.currentRecord;

            const fecha_inicio = currentRecord.getText({ fieldId: 'custpage_fecha_inicio'});
            const fecha_fin = currentRecord.getText({ fieldId: 'custpage_fecha_fin'});
            const tipo_proceso = currentRecord.getValue({ fieldId: 'custpage_tipo_proceso'});

            const newParams = {}

            if( fieldId == 'custpage_fecha_inicio' || fieldId == 'custpage_fecha_fin' || fieldId == 'custpage_tipo_proceso'){
                if ( fecha_inicio && fecha_fin ){
                    newParams.fecha_inicio = fecha_inicio;
                    newParams.fecha_fin = fecha_fin;

                    if(tipo_proceso) {
                        newParams.tipo_proceso = tipo_proceso;
                    }

                    window.onbeforeunload = null;
                        const ruta = url.resolveScript({
                            scriptId: "customscript_hu_ec_sl_estado",
                            deploymentId: "customdeploy_hu_ec_sl_estado",
                            params: newParams,
                            returnExternalUrl: false,
                        });
                    setWindowChanged(window, false);
                    window.location.href = ruta;
                }
            }
        } catch (error) {
            log.error("ERROR: fieldChanged", error.stack)
        }
    }

    return { fieldChanged }
});