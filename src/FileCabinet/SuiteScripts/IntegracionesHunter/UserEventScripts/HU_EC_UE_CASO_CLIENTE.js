/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author        Mauro F Ramos
 * @description   -
 *
*/

define(['N/runtime', 'N/log'], function ( runtime, log ) {

    function beforeLoad(context) {
        try {
            let { name, id, subsidiary, role } = runtime.getCurrentUser();

            /**
             * ID ROLES
             * 1811	EC - Administrador
             * 1894	EC Desarrollo TI
             *  DEPARTAMENTO DE SOPORTE AL CLIENTE (Perfil de ejecutiva)
             *      1663	EC SAC
             *      1617	EC EJECUTIVO COMERCIAL
             *  DEPARTAMENTO DE SOPORTE AL CLIENTE (Perfil de soporte al cliente)
             *      1843	EC EJECUTIVO CALLCENTER
            */
            if ( subsidiary == 2 && [1894, 1663, 1617].includes(role) ) {
                _formularioPerfilEjecutiva(context, subsidiary, id);
            }else if ( subsidiary == 2 && [1843].includes(role) ) {
                _formularioPerfilSoporteCliente(context, subsidiary, id);
            }
        } catch (error) {
            log.error("ERROR beforeLoad", error)
        }
    }

    function _formularioPerfilSoporteCliente(context, subsidiary, id) {
        const FORMULARIO_DESEADO = 298

        try {
            let  {form, newRecord, type } = context;

            if ( type == context.UserEventType.VIEW ) return; 

            let formulario_personalizado = newRecord.getValue('customform');

            if ( formulario_personalizado != 298) {
                const field = form.addField({ id: 'custpage_form_redirect', type: 'inlinehtml', label: 'form redirect' });
                field.defaultValue = `
                    <script>
                        (function() {
                            var url = window.location.href;
                            var target = ${FORMULARIO_DESEADO};
                            var re = /([?&])cf=\\d+/;
                            var newUrl;
                            if (re.test(url)) {
                                newUrl = url.replace(re, '$1cf=' + target);
                            } else {
                                var sep = url.indexOf('?') === -1 ? '?' : '&';
                                newUrl = url + sep + 'cf=' + target;
                            }
                            if (newUrl !== url) {
                                window.location.replace(newUrl);
                            }
                        })();
                    </script>
                `;
            }

            form.getField('custeventcustevent_ht_ec_solicitante').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('customform')?.updateDisplayType({ displayType: 'NODISPLAY'})
                form.getField('profile').updateDisplayType({ displayType: 'DISABLED'});
            // form.getField('custeventcustevent_ht_solicitante_ec').updateDisplayType({ displayType: 'DISABLED'});
                form.getField('subsidiary').updateDisplayType({ displayType: 'DISABLED'}).defaultValue = subsidiary;
          
            if ( type == context.UserEventType.CREATE ||  type == context.UserEventType.COPY) {
                //form.getField('profile').defaultValue = 4; // TODO: MODIFICAR por el destinado para producción
            }
        } catch (error) {
            log.error("ERROR _formularioPerfilSoporteCliente", error.stack);
        }
    }



    function _formularioPerfilEjecutiva(context, subsidiary, id) {
        try {
            const FORMULARIO_DESEADO = 298

            let  {form, newRecord, type } = context;
            if ( type == context.UserEventType.VIEW ) return; 

            let formulario_personalizado = newRecord.getValue('customform');

            if ( formulario_personalizado != 298) {
                const field = form.addField({ id: 'custpage_form_redirect', type: 'inlinehtml', label: 'form redirect' });
                field.defaultValue = `
                    <script>
                        (function() {
                            var url = window.location.href;
                            var target = ${FORMULARIO_DESEADO};
                            var re = /([?&])cf=\\d+/;
                            var newUrl;
                            if (re.test(url)) {
                                newUrl = url.replace(re, '$1cf=' + target);
                            } else {
                                var sep = url.indexOf('?') === -1 ? '?' : '&';
                                newUrl = url + sep + 'cf=' + target;
                            }
                            if (newUrl !== url) {
                                window.location.replace(newUrl);
                            }
                        })();
                    </script>
                `;
            }

            form.getField('customform').updateDisplayType({ displayType: 'NODISPLAY'})
            form.getField('assigned').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('profile').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('status').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('custeventcustevent_ht_ec_solicitante').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('custevent_ht_categoria_soporte').updateDisplayType({ displayType: 'DISABLED'});
            form.getField('custevent_ht_subcategoria_soporte').updateDisplayType({ displayType: 'DISABLED'});
            if ( type == context.UserEventType.CREATE ||  type == context.UserEventType.COPY) {
                //form.getField('profile').defaultValue = 4; // TODO: MODIFICAR por el destinado para producción
                form.getField('subsidiary').updateDisplayType({ displayType: 'DISABLED'}).defaultValue = subsidiary;
                form.getField('status').defaultValue = 1; // NO INICIADO
                form.getField('custeventcustevent_ht_ec_solicitante').defaultValue = id; // usuario actual que solicita el caso de soporte cliente
            }
        } catch (error) {
            log.error("ERROR _formularioPerfilEjecutiva", error.stack);
        }
    }

    return { beforeLoad };

});
