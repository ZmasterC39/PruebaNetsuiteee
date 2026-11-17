/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author        Mauro F Ramos
 * @description   -
 *
*/

define(['N/runtime', 'N/log'], function (runtime, log) {

    function fieldChanged(context) {
      try {
        let { name, id, subsidiary, role } = runtime.getCurrentUser();

        /**
         * ID ROLES
         * 1811	EC - Administrador
         * 1894	EC Desarrollo TI
         *  DEPARTAMENTO DE SOPORTE AL CLIENTE (Perfil de ejecutiva)
         *      1663	EC SAC
         *      1617	EC EJECUTIVO COMERCIAL
        */
        if ( subsidiary == 2 && [1894, 1663, 1617].includes(role) ) {
          _formularioPerfilEjecutiva(context, subsidiary, id);
        }
      } catch (error) {
        log.error("ERROR fieldChanged", error)
      }
    }

    function _formularioPerfilEjecutiva(context, subsidiary, id) {
      try {
        const { currentRecord } = context;

        let customform = currentRecord.getValue({fieldId: 'customform' });
        let profile = currentRecord.getValue({fieldId: 'profile' });

        if ( customform == 296 && profile != 4 ) {
          //currentRecord.setValue({ fieldId: 'profile', value: 4 });
        }

      } catch (error) {
        log.error("ERROR _formularioPerfilEjecutiva", error);
      }
    }

  return { fieldChanged };

});
