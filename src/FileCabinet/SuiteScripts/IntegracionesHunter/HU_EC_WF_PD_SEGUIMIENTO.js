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
        log.debug("INICIO",)
        // VALIDAR EL CAMPO subsidiary SI ES DOS CONTINUAR SI NO DETENER
        if (context?.newRecord?.getValue('custrecord_subsidiaria_seguimiento') != "2" || context?.newRecord?.getValue('custrecord_subsidiaria_seguimiento') != 2) {
          log.debug("Error", "No se ejecuta desde la subsidiaria 2");
          return true;
        }

        // log.debug("Se ejecuto desde un WorkflowActionScript")
        const infoUsuario = validarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;
        // if (infoUsuario.id != 27736) return true;

        // Caso #1
        let ID_SEGUIMIENTO = context?.newRecord?.id || false;

        let json = {
          ID_SEGUIMIENTO,
        }
        log.debug("ID_SEGUIMIENTO", ID_SEGUIMIENTO)
        if (!json.ID_SEGUIMIENTO) {
          log.debug("Error", "No se encontraron datos del seguimiento");
          return true;
        }

        let respuestaAPIInterna = consumirAPIInterna(json, 'POST');
        log.debug("respuestaAPIInterna", respuestaAPIInterna);
        if (respuestaAPIInterna) {
          enviarDatosAPIExterna(respuestaAPIInterna, ID_SEGUIMIENTO);
        }else{
          log.debug("Error", "No se encontraron datos del seguimiento en la API interna");
          // crear registro como error 
          GenerarLogCambioEstado(json, ID_SEGUIMIENTO || 0, 'F'); // Guardar el registro
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
            opcion: "SEG",
            idcliente: "",
            idbien: "",
            idseguimiento: json.ID_SEGUIMIENTO,
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

    function enviarDatosAPIExterna(data, idSeguimiento) {
      try {

          // // log.debug("Error en la respuesta de la API externa", response);
          // GenerarLogCambioEstado(data, idSeguimiento || 0, 'F'); // Guardar el registro
          // return false;
        
        data = data[0] || {}

        log.debug("USUARIO EJEC", runtime.getCurrentUser().id)
        // if (runtime.getCurrentUser().id == 26) {

        if (
          !data ||
          (Array.isArray(data) && data.length === 0) ||
          (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0)
        ) {
          return false;
        }

        log.debug("Data--", data)
        // Aqui esta pasado el data {}

        data.Id_Bien = data?.Id_Bien === "" ? "0" : data?.Id_Bien;

        const token = _funcion.loginGetToken();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // data.Usuario = runtime.getCurrentUser().id
        data.Usuario = runtime.getCurrentUser().id.toString();
        log.debug("data final", data)

        // return true;

        const options = {
          method: "POST",
          url: _const.URLS.HUNTER_API_NETSUITE + "/Seguimiento/SeguimientoSys",
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
          GenerarLogCambioEstado(data, idSeguimiento || 0, 'T'); // Guardar el registro
          return true;
        } else {
          log.debug("Error en la respuesta de la API externa", response);
          GenerarLogCambioEstado(data, idSeguimiento || 0, 'F'); // Guardar el registro
          return false;
        }

      } catch (error) {
        GenerarLogCambioEstado(data, idSeguimiento || 0, 'F'); // Guardar el registro
        log.debug("error", error)
        return false;
      }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado) {
      try {

        let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "PD_SEGUIMIENTO" });
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
