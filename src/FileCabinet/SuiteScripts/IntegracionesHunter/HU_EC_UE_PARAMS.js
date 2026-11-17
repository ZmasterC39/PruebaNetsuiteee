/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/log',
    'N/search',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    "./UtilsGeneral/HU_EC_FUNCION",
    "./UtilsGeneral/HU_EC_CONSTANTES",
    "N/runtime",
    "N/record",
    'N/https'
], function (log, search, coberturaController, _funcion, _const, runtime, record, https) {

    function beforeLoad(context) {
        var rec = context.newRecord;
        if (rec.type !== 'customrecord_ht_pp_main_param_prod') return;

        var currentUser = runtime.getCurrentUser();
        log.debug("--", currentUser)
        if (currentUser.subsidiary === 2) return;

        if (context.type === context.UserEventType.VIEW || context.type === context.UserEventType.EDIT || context.type === context.UserEventType.CREATE) {
            var form = context.form;
            var fldClasificacion = form.getField({ id: 'custrecord_ht_pp_clasificacion' });
            var fldParametrizacionId = form.getField({ id: 'custrecord_ht_pp_plataforma' });
            if (fldClasificacion) fldClasificacion.updateDisplayType({ displayType: 'HIDDEN' });
            if (fldParametrizacionId) fldParametrizacionId.updateDisplayType({ displayType: 'HIDDEN' });
        }
    }
  
    function beforeSubmit(context) {
    }

    function afterSubmit(context) {
      
        const infoUsuario = validarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;

        let UserId = runtime.getCurrentUser().id;

        // if(UserId != 26){
        //     log.debug("Usuario no permitido", "El script solo se ejecuta para el usuario con ID 26. Usuario actual: " + UserId);
        //     return
        // }

        var type = context.type;
        var oldRec = context.oldRecord || null;
        var newRec = context.newRecord || null;

        let registro = newRec?.type || oldRec?.type || 'unknown';

        log.debug("registro", registro)

        switch (registro) {

            case "customrecord_ht_pp_main_param_prod":

                /* ========= CREATE ========= */
                if (type === context.UserEventType.CREATE) {

                    var itemId = newRec.getValue('custrecord_ht_pp_parametrizacionid');
                    var evento = construirEvento('CREATE_PARAMETRO', itemId, UserId);

                    log.audit({ title: 'PARAMETRO CREADO', details: evento });
                    return;
                }

                /* ========= DELETE ========= */
                if (type === context.UserEventType.DELETE) {

                    var itemOld = oldRec.getValue('custrecord_ht_pp_parametrizacionid');
                    var eventoDel = construirEvento('DELETE_PARAMETRO', itemOld, UserId);

                    log.audit({ title: 'PARAMETRO ELIMINADO', details: eventoDel });
                    return;
                }

                /* ========= EDIT ========= */
                if (type === context.UserEventType.EDIT) {

                    var oldItem = oldRec.getValue('custrecord_ht_pp_parametrizacionid');
                    var newItem = newRec.getValue('custrecord_ht_pp_parametrizacionid');

                    /* === DESVINCULACIÓN DEL ITEM === */
                    if (oldItem && !newItem) {

                        var eventoDes = construirEvento('DESVINCULACION_ITEM_PARAMETRO', oldItem, UserId);

                        log.audit({
                            title: 'PARAMETRIZACION ELIMINADA DEL ITEM',
                            details: eventoDes
                        });
                        return;
                    }

                    /* === MODIFICACIÓN === */
                    var cambios = detectarCambios(oldRec, newRec);

                    if (cambios.length) {
                        var eventoEdit = construirEvento('EDIT_PARAMETRO', newItem, UserId);

                        log.audit({
                            title: 'PARAMETRO MODIFICADO',
                            details: eventoEdit
                        });
                    }


                    // NUEVO //
                    log.debug("+++++++newRec+++++++++", newRec);

                    let valothtplataforma = newRec.getValue('custrecord_ht_pp_plataforma');

                    if (valothtplataforma) {
                        log.debug("valothtplataforma", valothtplataforma)
                    }

                    // NUEVO //


                }

                break;
            case "serializedinventoryitem":
            case "inventoryitem":
            case "noninventoryitem":
            case "discountitem":
            case "serializedassemblyitem":
            case "serviceitem":
            case "assemblyitem":    

                /* ========= CREATE ========= */
                if (type === context.UserEventType.CREATE) {

                    var itemId = newRec.getValue('id');
                    var evento = construirEvento('CREATE_ITEM', itemId, UserId);

                    log.audit({ title: 'ITEM CREADO', details: evento });
                    return;
                }

                /* ========= DELETE ========= */
                if (type === context.UserEventType.DELETE) {

                    var itemOld = oldRec.getValue('id');
                    var eventoDel = construirEvento('DELETE_ITEM', itemOld, UserId);

                    log.audit({ title: 'ITEM ELIMINADO', details: eventoDel });
                    return;
                }

                /* ========= EDIT ========= */
                if (type === context.UserEventType.EDIT) {

                    log.debug("2?")

                    var oldItem = oldRec.getValue('id');
                    var newItem = newRec.getValue('id');

                    /* === MODIFICACIÓN === */

                    var eventoEdit = construirEvento('EDIT_ITEM', newItem, UserId);

                    log.audit({
                        title: 'ITEM MODIFICADO',
                        details: eventoEdit
                    });

                }

                break;
        }

    }

    /* =========================
     * UTILIDADES
     * ========================= */
    function detectarCambios(oldRec, newRec) {

        var fields = [
            'custrecord_ht_pp_parametrizacion_valor',
            'isinactive'
        ];

        var cambios = [];

        fields.forEach(function (f) {
            var oldVal = oldRec.getValue(f);
            var newVal = newRec.getValue(f);

            if (oldVal !== newVal) {
                cambios.push({
                    campo: f,
                    antes: oldVal,
                    despues: newVal
                });
            }
        });
        return cambios;
    }

    function construirEvento(accion, itemId, userId) {

        try {
            var inf_item = consumirApiInterna(itemId, 'POST');
            log.debug("inf_item", inf_item)
            inf_item.accion = accion ? accion : 'SIN_ACCION';
            inf_item.usuario = userId ? userId : 0;

            if (inf_item?.Detalleitems?.length === 0) return;
          
            // Consumir Api Externa
            EnviarDatosAPIExternaItems(inf_item, itemId);


            return {
                inf_item,
            };

        } catch (error) {
            log.error("Error en construirEvento", error);
            return
        }

    }

    function consumirApiInterna(itemIdentificado, method) {
        try {

            log.debug("consumirApiInterna", {
                itemIdentificado: itemIdentificado,
                method: method
            })

            if (!itemIdentificado) { return []; }

            let respuesta = coberturaController.makeApiRequest(
                {
                    "entidad": "ITEM",
                    "iditemns": itemIdentificado,
                    "iditemsh": "0"
                },
                "customdeploy_hu_ec_rs_in_catalogo",
                "customscript_hu_ec_rs_in_catalogo",
                method,
                false
            );

            log.debug("respuesta----", respuesta)

            if (respuesta && (respuesta.status == "error") || String(respuesta.status).includes("SyntaxError") || String(respuesta.status).includes("Unexpected token")) {
                return [];
            } else {
                return respuesta;
            }
        } catch (error) {
            log.debug("error", error)
            return []
        }
    }

    function EnviarDatosAPIExternaItems(data, itemId) {
        try {
            if (data == [] || data == {} || !data) {
                return false;
            }

            const token = _funcion.loginGetToken();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const options = {
                method: "POST",
                url: _const.URLS.HUNTER_API_NETSUITE + "/ParametrosNS",
                headers: headers,
                body: JSON.stringify(data),
            };

            log.debug("Opciones de la API externa", options);

            const response = https.post(options);

            let temporal = false

            if (response && response.body != "") {
                temporal = JSON.parse(response.body);
            }

            log.debug("Respuesta de la API externa", temporal);


            if (temporal && temporal.statusCode === 200) {
                log.debug("Respuesta de la API externa", temporal);
                // Exito
                GenerarLogCambioEstado(data, itemId || 0, 'T', "PD_Dato_Item"); // Guardar el registro
                return true;
            } else {
                log.debug("Error en la respuesta de la API externa", response);
                GenerarLogCambioEstado(data, itemId || 0, 'F', "PD_Dato_Item"); // Guardar el registro
                return false;
            }
        } catch (error) {
            log.debug("error", error)
            GenerarLogCambioEstado(data, itemId || 0, 'F', "PD_Dato_Item"); // Guardar el registro
            return false;
        }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
        try {

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    }

    function validarEjecucion(datos) {
        if (datos.subsidiary === 2) {
            return {
                permiso: true,
                id: datos.id,
                nombre: datos.name || ""
            };
        }
        return {
            permiso: false,
            id: "",
            nombre: ""
        };
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});