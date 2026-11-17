/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author        Mauro F Ramos
 * @description   -
 *
*/

define(['N/log', 'N/runtime'], function (log, runtime) {

    function beforeLoad(context) {
        try {
            _formularioControl(context);
        } catch (error) {
            log.error("ERRRO beforeLoad", error)
        }
    }


    function _formularioControl(context) {
        try {
            let { name, id, subsidiary, role } = runtime.getCurrentUser();
            let  {form, newRecord, type } = context;

            if ( subsidiary != 2 ) {
                form.getField('custrecord_ht_cd_correo_certificados').updateDisplayType({ displayType: 'NODISPLAY'})
                form.getField('custrecord_ht_cd_envio_certificado').updateDisplayType({ displayType: 'NODISPLAY'})
            }
        } catch (error) {
            log.error("ERRRO _formularioControl", error)
        }
    }


  return { beforeLoad };

});
