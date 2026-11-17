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

            form.getField('altemail').updateDisplayType({ displayType: 'NORMAL'})
            if ( type == context.UserEventType.CREATE ) {
                form.getField('custentity_proveedor_envio_certificado').updateDisplayType({ displayType: 'NODISPLAY'})
            } else {
                if ( subsidiary == 2 && newRecord.getValue('category') == '7' ) {
                    form.getField('custentity_proveedor_envio_certificado').updateDisplayType({ displayType: 'NORMAL'})
                }else{
                    form.getField('custentity_proveedor_envio_certificado').updateDisplayType({ displayType: 'NODISPLAY'})
                }
            }
        } catch (error) {
            log.error("ERRRO _formularioControl", error)
        }
    }

    return { beforeLoad };

});
