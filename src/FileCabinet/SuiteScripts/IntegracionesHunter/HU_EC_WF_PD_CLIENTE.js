/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define([
  'N/log',
  'N/search',
  'N/record',
  'N/https',
  'N/query',
  'N/file',
  'N/runtime',
  'N/ui/serverWidget',
  "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
  "./UtilsGeneral/HU_EC_FUNCION",
  "./UtilsGeneral/HU_EC_CONSTANTES"
],
  (log, search, record, https, query, file, runtime, serverWidget, coberturaController, _funcion, _const) => {

    const onAction = (context) => {
      try {
        // log.debug("context", context);

        // VALIDAR EL CAMPO subsidiary SI ES DOS CONTINUAR SI NO DETENER
        if (context?.newRecord?.getValue('subsidiary') != "2" || context?.newRecord?.getValue('subsidiary') != 2) {
          log.debug("Error", "No se ejecuta desde la subsidiaria 2");
          return true;
        }

        // log.debug("Se ejecuto desde un WorkflowActionScript")
        const infoUsuario = validarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;

        // Caso #1
        let ID_Cliente = context?.newRecord?.id || false;
        let identificacion = context?.newRecord?.getValue('vatregnumber') || false;

        let json = {
          ID_Cliente,
          identificacion
        }

        if (!json.ID_Cliente || !json.identificacion) {
          log.debug("Error", "No se encontraron datos en el cliente");
          return true;
        }

        let respuestaAPIInterna = consumirAPIInterna(json, 'POST');
        log.debug("respuestaAPIInterna", respuestaAPIInterna);
        if (respuestaAPIInterna) {
          enviarDatosAPIExterna(respuestaAPIInterna);
        }

      } catch (error) {
        log.debug('error', error);
      }
    }

    /*
    * Funciones Adicionales
    */
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

    function consumirAPIInterna(json, method) {
      try {
        if (!json) { return []; }

        let respuesta = coberturaController.makeApiRequest(
          {
            opcion: "MIGRA_CLIENTE",
            identificacion: json.identificacion,
          },
          "customdeploy_hu_ec_rs_in_cliente",
          "customscript_hu_ec_rs_in_cliente",
          method,
          false
        );

        if (respuesta && (respuesta.status == "error")) {
          return [];
        } else {
          return respuesta;
        }
      } catch (error) {
        log.debug("error", error)
        return [];
      }
    }

    function enviarDatosAPIExterna(data) {
      try {

        log.debug("aaaa", runtime.getCurrentUser().id)
        // if (runtime.getCurrentUser().id == 26) {

          if (data == [] || data == {} || !data) {
            return false;
          }

          const token = _funcion.loginGetToken();
          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };
          log.debug("data", data)
        
          // data.Usuario = runtime.getCurrentUser().id
          data.Usuario = runtime.getCurrentUser().id.toString();


          const options = {
            method: "POST",
            url: _const.URLS.HUNTER_API_NETSUITE + "/Cliente/RegistrarCliente",
            headers: headers,
            body: JSON.stringify(data),
          };

          log.debug("Opciones de la API externa", options);

          const response = https.post(options);

          let temporal = false

          if (response && response.body != "") {
            temporal = JSON.parse(response.body);
          }

          if (temporal && temporal.statusCode === 200) {
            log.debug("Respuesta de la API externa", temporal);
            return true;
          } else {
            log.debug("Error en la respuesta de la API externa", response);
            GenerarLogCambioEstado(data, data?.Id_ns_cliente || 0, 'F'); // Guardar el registro
            return false;
          }
        // } else {
        //   throw new Error("Error Controlado");
        // }

      } catch (error) {
        GenerarLogCambioEstado(data, data?.Id_ns_cliente || 0, 'F'); // Guardar el registro
        log.debug("error", error)
        return false;
      }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado) {
      try {

        let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "PD_Cliente" });
        objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
        objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
        objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
        objRecord.save();

      } catch (error) {
        log.error('Error en generarLogCambioEstado', error);
      }
    }

    return {
      onAction: onAction
    };
  });
