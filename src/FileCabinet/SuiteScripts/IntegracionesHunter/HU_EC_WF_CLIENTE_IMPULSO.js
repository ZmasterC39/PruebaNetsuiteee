/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 *
 * @author Mauro F Ramos
 * @date Created at: 00/00/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 */

define(["N/log", "./UtilsGeneral/HU_EC_FUNCION", "./HU_EC_CORE_IMPULSO_PLATAFORMA",'N/runtime'], (log, _funcion, _coreimp, runtime) => {

    function onAction(context) {
        try {
            const currentUser = runtime.getCurrentUser();
            const impulsoManual = currentUser?.id || "0";
            let newRecord = context.newRecord;
            if( impulsoManual == "273" || impulsoManual =="27736" || impulsoManual == '49529'){
                if( newRecord.type == 'customrecord_ht_record_correoelectronico'){
                    _coreimp.actualizarCliente(newRecord.getValue('custrecord_ht_ce_enlace'));
                    log.debug("enlace", newRecord.getValue('custrecord_ht_ce_enlace'));
                }else if(newRecord.type == 'customer'){
                    _coreimp.actualizarCliente(newRecord.id);
                    log.debug("customer", newRecord.id);
                }
            }else{
                log.debug("currentUser", currentUser);
            }
            log.debug('context.type WorkflowActionScript', context);
        } catch (error) {
            log.debug('error', error);
        }
    }

    return {onAction};

});