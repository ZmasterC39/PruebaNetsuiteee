/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(
  ['N/log', 'N/search', 'N/record', 'N/https', 'N/query', 'N/file', 'N/runtime', 'N/ui/serverWidget',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
  ], (log, search, record, https, query, file, runtime, serverWidget, coberturaController, _funcion, _const) => {

    const onAction = (context) => {
      try {

        // GenerarLogCambioEstado(context, context.newRecord.id, 'F', "PD_Bienes");
        // return
        
        // log.debug("context", context);
        // log.debug("Log", "Se ejecutó desde un WorkflowActionScript");

        const infoUsuario = validarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;

        const ID_BIEN = context.newRecord.id;

        const respuestaAPIInterna = ConsumirAPIInterna2({ idvehiculo: ID_BIEN }, 'POST');
        // log.debug("infCompleta", respuestaAPIInterna);

        // Validar si la respuesta es un objeto vacío
        if (Object.keys(respuestaAPIInterna).length === 0) {
          log.error("Error", "La función Api Interna devolvió un objeto vacío.");
          return; // Detener la ejecución
        }

        if (respuestaAPIInterna.CodigoVehiculo && /[a-zA-Z]/.test(respuestaAPIInterna.CodigoVehiculo)) {
          respuestaAPIInterna.CodigoVehiculo = "0";
        }

        // log.debug("respuestaAPIInterna.NumPuertas--", respuestaAPIInterna.NumPuertas)
        
        if (respuestaAPIInterna.NumPuertas && /[a-zA-Z]/.test(respuestaAPIInterna.NumPuertas)) {
          respuestaAPIInterna.NumPuertas = "0";
        }

        // log.debug("respuestaAPIInterna.NumPuertas--2", respuestaAPIInterna.NumPuertas)
        
        
        // let respuestaExterna = false
        const respuestaExterna = EnviarDatosAPIExternaCobertura(respuestaAPIInterna); // devuelve true o false
        log.debug("Respuesta", respuestaExterna);

        // Validar si la respuesta es false
        if (!respuestaExterna) {
          log.error("Error en envío", `El envío falló para el bien con ID: ${ID_BIEN}`);
          GenerarLogCambioEstado(respuestaAPIInterna, ID_BIEN, 'F', "PD_Bienes"); // Guardar el registro
          return false; // Detener el proceso
        } else {
          GenerarLogCambioEstado(respuestaAPIInterna, ID_BIEN, 'T', "PD_Bienes");
        }

      } catch (error) {
        GenerarLogCambioEstado(context, context.newRecord.id, 'F', "PD_Bienes");
        log.error("Error en onAction", error);
      }
    };

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
    };

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
    };

    function ConsumirAPIInterna2(json, method) {
      try {

        if (!json) {
          return [];
        }

        let respuesta = coberturaController.makeApiRequest(
          {
            opcion: "PASO_VEHICULO",
            idvehiculo: json.idvehiculo,
          },
          "customdeploy_hu_ec_rs_in_bienes",
          "customscript_hu_ec_rs_in_bienes",
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
        return []
      }
    };

    function EnviarDatosAPIExternaCobertura(data) {
      try {

        log.debug("---A----", data)

        // return true

        if (data == []) {
          return false;
        }

        const token = _funcion.loginGetToken();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const options = {
          method: "POST",
          url: _const.URLS.HUNTER_API_NETSUITE + "/VehiculoNS",
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

          // generarLogCambioEstado(data, response);

          log.debug("Error en la respuesta de la API externa", response);
          return false;
        }
      } catch (error) {
        log.debug("error", error)
        return false;
      }
    };

    return {
      onAction: onAction
    };
  });