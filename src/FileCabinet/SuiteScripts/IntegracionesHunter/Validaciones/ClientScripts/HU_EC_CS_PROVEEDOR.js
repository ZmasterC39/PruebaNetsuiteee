/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author        Mauro F Ramos
 * @description   -
 *
*/

define(['N/log', 'N/runtime'], function (log, runtime) {

    function fieldChanged(context) {
        try {
            _formularioControl(context)
        } catch (error) {
            log.error("ERROR fieldChanged");
        }
    }

    function _formularioControl(context) {
        try {
            const { fieldId, currentRecord } = context;
            let { id, name, email, location, departament, role, roleId, roleCenter, subsidiary} = runtime.getCurrentUser();

            if ( subsidiary == 2 ) {
                currentRecord.getField({ fieldId: 'altemail' }).isDisplay = true;
                if ( currentRecord.getValue({ fieldId: 'category' }) == 7 ) {
                    currentRecord.getField({ fieldId: 'custentity_proveedor_envio_certificado' }).isDisplay = true;
                }else{
                    currentRecord.getField({ fieldId: 'custentity_proveedor_envio_certificado' }).isDisplay = false;
                    currentRecord.setValue({ fieldId: 'altemail', value: '', ignoreFieldChange: true });
                    currentRecord.setValue({ fieldId: 'custentity_proveedor_envio_certificado', value: false, ignoreFieldChange: true });
                }
            }
        } catch (error) {
            log.error("ERRRO _formularioControl", error)
        }
    }

    function saveRecord(context) {
        try {
            let { id, name, email, location, departament, role, roleId, roleCenter, subsidiary} = runtime.getCurrentUser();
            const { currentRecord } = context;
            if ( subsidiary == 2 ) {
                if ( currentRecord.getValue({ fieldId: 'custentity_proveedor_envio_certificado' }) == true ) {
                    const correo = currentRecord.getValue({ fieldId: 'altemail' });
                    if ( correo.length == 0) {
                        alert("No ha ingresado el correo electrónico para el envío de certificado")
                        return false;
                    }
                }
            }

            return true;
        } catch (error) {
            log.error("ERROR saveRecord", error);
        }
    }

    return { fieldChanged, saveRecord };

});
