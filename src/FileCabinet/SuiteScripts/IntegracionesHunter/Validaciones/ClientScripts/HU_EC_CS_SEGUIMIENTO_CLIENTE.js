/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 07/02/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 */
define(['N/runtime', 'N/ui/dialog','N/log'], (runtime, dialog, log ) => {

    function saveRecord(context) {
        let validate =  validateFieldHT_SC_Vehiculo(context);
        return validate;
    }

    function validateFieldHT_SC_Vehiculo(context) {
        try {
            let record = context.currentRecord;
            let user = runtime.getCurrentUser();
            let { subsidiary, role : userRol, id : userId } = user;
            log.debug("user", user);
            if(subsidiary === 2){
                // * [SANDBOX]
                // * ROLES
                //1849	EC OPERADOR CONTROL
                // * EMPLEADO
                // - -
                // ? ********************************************************** ?

                // * PRODUCCIÓN *
                // * ROLES *
                // SELECT id, name,  FROM role
                // 1856	EC JEFATURA CONTROL
                // 1849	EC OPERADOR CONTROL ✅
                // * EMPLEADO
                // 469358 E-10721568 CONTROL 5         ROL: EC OPERADOR CONTROL
                // 469150 E-10721563 CONTROL 7         ROL: EC OPERADOR CONTROL
                // 469359 E-10721569 CONTROL 6         ROL: EC OPERADOR CONTROL
                // 27336  E-00000277 Edison  E Cabero  ROL: EC OPERADOR CONTROL
                // 469256 E-10721566 CONTROL 3         ROL: EC OPERADOR CONTROL
                // 469254 E-10721565 CONTROL 2         ROL: EC OPERADOR CONTROL
                // 49529  E-00000452 Mauro F Ramos
                //let requiredForUsers  = [49529] //, 469358, 469150, 469359, 27336, 469256, 469254]
                let requiredForRol = [1849, 1856];
                // if(userId === 49529){
                //     userRol = 1856;
                // }
                if(requiredForRol.includes(userRol) ){
                    let value = record.getValue({ fieldId: 'custrecord_ht_sc_vehiculo' })[0]
                    if( value.trim().length > 0){
                        log.debug("save", "save");
                        return true;
                    } else {
                        log.debug("falta", "campo obligatorio HT SC Vehículo");
                        dialog
                            .create({
                            title: "Campo Obligatorio",
                            message: `Por favor, Introduzca un valor para el campo "<b>HT SC Vehículo</b>"`,
                            buttons: [
                                {
                                label: "Aceptar",
                                value: true,
                                },
                            ],
                            })
                            .then(function () {
                                setTimeout(function() {
                                    var field = document.querySelector('[name="custrecord_ht_sc_vehiculo_display"]');
                                    if (field) {
                                        field.focus();
                                    }
                                }, 10);
                                return;
                            })
                            .catch(function (e) {
                            log.error("Error mostrando el diálogo:", e);
                        });
                        return false;
                    }
                } else {
                    return true;
                }
            } else {
                return true;
            }
        } catch (error) {
            log.error("ERROR - validateFieldHT_SC_Vehiculo", error.stack);
        }
    }
    return { saveRecord }
});