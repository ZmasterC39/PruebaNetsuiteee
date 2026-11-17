/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros pendientes de procesamiento y envía los datos a un API externo.
Ambiente: Producción
*/

define([
  'N/log',
  'N/search',
  'N/query',
  "N/record",
  'N/cache',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION",
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
  "N/https",
  "N/runtime",
  "N/format",
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
  'N/file'
], function (log, search, query, record, cache, coberturaController, _funcion, _const, https, runtime, format, _platformController, file) {

  const CACHE_TOKEN_SS_PROC_GENERAL = {
    NAME: 'HU_EC_CACHE_TKN_SS_PROC_GENERAL_7451241',
    KEY: 'token_hunter_ss_proc_general',
    TTL: 3000
  };

  function obtenerTokenCache() {
    const tokenCache = cache.getCache({
      name: CACHE_TOKEN_SS_PROC_GENERAL.NAME,
      scope: cache.Scope.PROTECTED
    });

    return tokenCache.get({
      key: CACHE_TOKEN_SS_PROC_GENERAL.KEY,
      loader: () => _funcion.loginGetToken(),
      ttl: CACHE_TOKEN_SS_PROC_GENERAL.TTL
    });
  }

  function execute() {

    try {
      // return 
      // Crear la búsqueda del registro
      const searchObj = search.create({
        type: "customrecord_log_proceso_general",
        filters: [
          // ["custrecordlog_proceso_general_proceso", "startswith", "EnvioCobertura"],
          // "AND",
          // ["isinactive", "is", "F"],
          // "OR", [
          ["custrecordlog_proceso_general_proceso", "is", "PD_Cliente"],   //19
          "AND",                                                           //19
          ["custrecord_producto_lpc", "startswith", "F"],                  //19
          // ],
          "OR", [
            ["custrecordlog_proceso_general_proceso", "is", "PD_Bienes"],
            "AND",
            ["custrecord_producto_lpc", "startswith", "F"]
          ]
        ],
        columns: [
          search.createColumn({ name: "id", label: "ID", sort: search.Sort.DESC }),
          search.createColumn({ name: "owner", label: "Propietario" }),
          search.createColumn({ name: "created", label: "Fecha de creación" }),
          search.createColumn({ name: "custrecord_producto_lpc", label: "PROCESADO" }),
          search.createColumn({ name: "custrecordlog_proceso_general_proceso", label: "Proceso" }),
          search.createColumn({ name: "custrecordid_registro_proc_general", label: "id_registro" }),
          search.createColumn({ name: "custrecord_log_proceso_general_traza", label: "Traza" })
        ]
      });

      const myResultParaCobertura = searchObj.run().getRange({ start: 0, end: 100 });
      const theCountFac = searchObj.runPaged().count;

      log.debug("Número de registros encontrados", theCountFac);


      // Procesar cada resultado de la búsqueda
      myResultParaCobertura.forEach((result, index) => {
        log.debug(`Procesando registro`, `${index + 1}`);
        let Proceso = result.getValue({ name: "custrecordlog_proceso_general_proceso" });

        log.debug("Proceso", "---------" + Proceso + "---------");

        switch (Proceso) {

          case "PD_Bienes":
            log.debug("Caso PD_Bienes", "Procesando PD_Bienes");

            try {

              const ID_BIEN = result.getValue({ name: "custrecordid_registro_proc_general" });
              log.debug("ID_BIEN", ID_BIEN);
              if (!ID_BIEN) { return }


              const htBienesRecord = record.load({ type: "customrecord_ht_record_bienes", id: ID_BIEN, isDynamic: true });
              if (!htBienesRecord) {
                // Delete
                const id = result.getValue({ name: "id" });
                record.delete({
                  type: 'customrecord_log_proceso_general',
                  id: id
                });
                log.debug("Registro eliminado", `Registro con ID ${id} eliminado correctamente.`);
                return; // Detener la ejecución si no se encuentra el registro
              }

              // Consumir la API interna
              const respuestaAPIInterna = GeneralConsumirApiInterna({ idvehiculo: ID_BIEN }, 'POST', "PD_Bienes");
              log.debug("Respuesta de la API interna", respuestaAPIInterna);

              // si el campo de respuestaApiInterna.CodigoVehiculo contiene una letra colocar por defecto 0
              if (respuestaAPIInterna.CodigoVehiculo && /[a-zA-Z]/.test(respuestaAPIInterna.CodigoVehiculo)) {
                respuestaAPIInterna.CodigoVehiculo = "0";
              }

              if (respuestaAPIInterna.NumPuertas && /[a-zA-Z]/.test(respuestaAPIInterna.NumPuertas)) {
                respuestaAPIInterna.NumPuertas = "0";
              }

              // Validar si la respuesta es un objeto vacío
              if (!respuestaAPIInterna || Object.keys(respuestaAPIInterna).length === 0) {
                log.error("Error", `La función API Interna devolvió un objeto vacío para el bien con ID: ${ID_BIEN}`);
                return; // Detener la ejecución para este registro
              }

              // Enviar datos a la API externa
              const respuestaExterna = GeneralEnviarDatosAPIExterna(respuestaAPIInterna, "PD_Bienes");
              log.debug("Respuesta de la API externa", respuestaExterna);

              // Validar la respuesta de la API externa
              if (!respuestaExterna) {
                log.error("Error en envío", `El envío falló para el bien con ID: ${ID_BIEN}`);
                return; // Detener la ejecución para este registro
              }

              // Guardar el registro con estado exitoso
              GenerarLogCambioEstado(respuestaAPIInterna, ID_BIEN, 'T', "PD_Bienes");

              const id = result.getValue({ name: "id" });

              record.submitFields({
                type: 'customrecord_log_proceso_general',
                id: id,
                values: {
                  custrecord_producto_lpc: 'T'
                }
              });

              log.debug("Registro actualizado", `Registro con ID ${id} actualizado correctamente.`);

            } catch (error) {
              log.error("Error al cargar registro", error.stack);
            }
            break;


          case "PD_Cliente":
            log.debug("Caso PD_Cliente", "Procesando PD_Cliente");

            try {
              const ID_Cliente = result.getValue({ name: "custrecordid_registro_proc_general" });
              let oriUsuario = result.getValue({ name: "owner", label: "Propietario" })

              if (!ID_Cliente) { return }

              const htClienteRecord = record.load({ type: "customer", id: ID_Cliente, isDynamic: true });
              if (!htClienteRecord) {
                // Delete
                const id = result.getValue({ name: "id" });
                record.delete({
                  type: 'customrecord_log_proceso_general',
                  id: id
                });
                log.debug("Registro eliminado", `Registro con ID ${id} eliminado correctamente.`);
                return; // Detener la ejecución si no se encuentra el registro
              }

              let identificacion = htClienteRecord.getValue("vatregnumber") || false;
              let json = {
                ID_Cliente,
                identificacion
              }

              if (!json.ID_Cliente || !json.identificacion) {
                log.debug("Error", "No se encontraron datos en el cliente");
                return true;
              }

              let respuestaAPIInterna = GeneralConsumirApiInterna(json, 'POST', "PD_Cliente");
              // log.debug("respuestaAPIInterna", respuestaAPIInterna);

              // Validar la respuesta de la API Interna
              if (!respuestaAPIInterna) {
                log.error("Error en envío", `El envío falló para el Cliente con ID: ${ID_Cliente}`);
                return; // Detener la ejecución para este registro
              }

              // Validar si la respuesta es un objeto vacío
              if (!respuestaAPIInterna || Object.keys(respuestaAPIInterna).length === 0) {
                log.error("Error", `La función API Interna devolvió un objeto vacío para el bien con ID: ${ID_Cliente}`);
                return; // Detener la ejecución para este registro
              }

              respuestaAPIInterna.Usuario = oriUsuario?.toString() == "-4" ? "449" : oriUsuario?.toString();

              log.debug("AAA", respuestaAPIInterna)
              
              // Enviar datos a la API externa
              const respuestaExterna = GeneralEnviarDatosAPIExterna(respuestaAPIInterna, "PD_Cliente");
              // log.debug("Respuesta de la API externa", respuestaExterna);

              // Validar la respuesta de la API externa
              if (!respuestaExterna) {
                log.error("Error en envío", `El envío falló para el CLIENTE con ID: ${ID_Cliente}`);
                return; // Detener la ejecución para este registro
              }

              // Guardar el registro con estado exitoso
              GenerarLogCambioEstado(respuestaAPIInterna, ID_Cliente, 'T', "PD_Cliente");

              // Eliminar el registro de la tabla customrecord_log_proceso_general
              const id = result.getValue({ name: "id" });

              record.submitFields({
                type: 'customrecord_log_proceso_general',
                id: id,
                values: {
                  custrecord_producto_lpc: 'T'
                }
              });

              log.debug("Registro actualizado", `Registro con ID ${id} actualizado correctamente.`);

            } catch (innerError) {
              log.error("Error procesando registro", { error: innerError.message, stack: innerError.stack });
            }
            break;
          default:
            break;
        }
      });

    } catch (error) {
      log.error("Error en la ejecución del script", error);
      return true
    }
  }

  /*
 * Funciones Adicionales
 */
  function valorAdicionalPD(fechaInicio, fechaFin) {
    try {
      log.debug("fechas", { fechaInicio, fechaFin });

      if (!fechaInicio || !fechaFin) {
        return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
      }

      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      const diferenciaAnios = fin.getFullYear() - inicio.getFullYear();
      const diferenciaMeses = diferenciaAnios * 12 + (fin.getMonth() - inicio.getMonth());
      const diferenciaTiempo = fin - inicio;
      const diferenciaDias = diferenciaTiempo / (1000 * 60 * 60 * 24);

      if (diferenciaMeses % 12 === 0 && diferenciaMeses >= 12) {
        return { id_plazo: 1, Tipo_plazo: "AÑOS", Diferencia: diferenciaMeses / 12 };
      } else if (diferenciaMeses > 0) {
        return { id_plazo: 2, Tipo_plazo: "MESES", Diferencia: diferenciaMeses };
      } else {
        return { id_plazo: 3, Tipo_plazo: "DÍAS", Diferencia: Math.floor(diferenciaDias) };
      }
    } catch (error) {
      return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
    }
  }

  function GeneralPrepararDatosParaApiInterna(record, idUsuario, accion) {

    try {
      switch (accion) {

        case "EnvioCobertura":
          log.debug("Caso Envió Cobertura", "Preparando datos para Envió Cobertura");

          const idbien = record.getValue("custrecord_ht_co_bien");
          const id_familia_bien = record.getValue("custrecord_ht_co_familia_prod");
          const coberturaInicial = record.getValue("custrecord_ht_co_coberturainicial");
          const coberturaFinal = record.getValue("custrecord_ht_co_coberturafinal");
          const subsidiary = record.getValue("custrecord_ht_co_subsidiaria");
          const resultado = valorAdicionalPD(coberturaInicial, coberturaFinal);

          if (subsidiary && (subsidiary != 2 || subsidiary != "2")) {
            return false;
          }

          return {
            idbien,
            id_familia_bien,
            TipoPlazo: resultado.Tipo_plazo,
            IdUsuario: idUsuario,
            IdDocumento: 0,
            CodDocumento: "",
            Comentario: ""
          };

        case "PD_Cliente":
          log.debug("Caso PD_Cliente", "Preparando datos para PD_Cliente");
          break;
        case "PD_Bienes":
          log.debug("Caso PD_Bienes", "Preparando datos para PD_Bienes");
          break;
        default:
          return false; // Si no se reconoce el caso, retornar false
      }

    } catch (error) {
      log.debug("Error al preparar datos para API interna", error);
      return false;
    }

  }

  function GeneralConsumirApiInterna(json, method, accion) {
    try {

      // log.debug("--Caso--", { json, method, accion });

      let respuesta = false
      switch (accion) {


        case "EnvioCobertura":

          if (!json) {
            return [];
          }

          respuesta = coberturaController.makeApiRequest(
            {
              // accion: "PasoDatos",     
              accion: "PasoDatos_N",
              // idvehiculo: json.idbien,
              // idgrupoproducto: json.id_familia_bien
            },
            "customdeploy_hu_ec_rs_in_coberturas",
            "customscript_hu_ec_rs_in_coberturas",
            method,
            false
          );

          if (respuesta && (respuesta.status == "error")) {
            return [];
          } else {
            respuesta.TipoPlazo = json?.TipoPlazo || "";
            respuesta.IdUsuario = json?.IdUsuario || 0;
            respuesta.IdDocumento = json?.IdDocumento || 0;
            respuesta.CodDocumento = json?.CodDocumento || "";
            respuesta.Comentario = json?.Comentario || "";

            return respuesta;
          }

        case "PD_Bienes":

          if (!json) { return []; }
          respuesta = coberturaController.makeApiRequest(
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

        case "PD_Cliente":
          // log.debug("Caso PD_Cliente", "Consumir API Interna para PD_Cliente");
          if (!json) { return []; }

          respuesta = coberturaController.makeApiRequest(
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
        default:
          return false; // Si no se reconoce el caso, retornar false
      }
    } catch (error) {
      log.debug("error", error)
      return []
    }
  }

  function GeneralEnviarDatosAPIExterna(data, accion) {
    try {
      let token;
      let headers;
      let options;
      let response;
      let temporal;

      switch (accion) {
        case "EnvioCobertura":
          log.debug("Caso Envió Cobertura", "Enviando datos a la API externa para Envió Cobertura");
          if (data == []) {
            return false;
          }

          token = obtenerTokenCache();
          headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };

          options = {
            method: "POST",
            url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
            headers: headers,
            body: JSON.stringify(data),
          };

          log.debug("--Opciones de la API externa--", options);
          response = https.post(options);

          temporal = false

          if (response && response.body != "") {
            temporal = JSON.parse(response.body);
          }

          if (temporal && temporal.statusCode === 200) {
            log.debug("Respuesta de la API externa", temporal);
            return true;
          } else {
            // log.debug("inf----------", { data, response, temporal });

            if (temporal && temporal?.result == "NO SE ENCONTRÓ BIEN CREADO") {

              GenerarLogCambioEstado(data, data.IdBien, 'F', "PD_Bienes");
              GenerarLogCambioEstado(data, data.IdClienteNs, 'F', "PD_Cliente");
            }

            log.debug("Error en la respuesta de la API externa", response);
            return false;
          }

        case "PD_Bienes":
          log.debug("---A----", data)

          // return true
          if (data == []) {
            return false;
          }

          token = obtenerTokenCache();
          headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };

          options = {
            method: "POST",
            url: _const.URLS.HUNTER_API_NETSUITE + "/VehiculoNS",
            headers: headers,
            body: JSON.stringify(data),
          };

          log.debug("Opciones de la API externa", options);
          response = https.post(options);
          temporal = false

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
          break;

        case "PD_Cliente":
          // log.debug("Caso PD_Cliente", "Enviando datos a la API externa para PD_Cliente");

          if (data == [] || data == {} || !data) {
            return false;
          }

          token = obtenerTokenCache();
          headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };

          options = {
            method: "POST",
            url: _const.URLS.HUNTER_API_NETSUITE + "/Cliente/RegistrarCliente",
            headers: headers,
            body: JSON.stringify(data),
          };

          log.debug("Opciones de la API externa", options);

          response = https.post(options);

          temporal = false

          if (response && response.body != "") {
            temporal = JSON.parse(response.body);
          }

          if (temporal && temporal.statusCode === 200) {
            log.debug("Respuesta de la API externa", temporal);
            return true;
          } else {
            log.debug("Error en la respuesta de la API externa", response);
            // GenerarLogCambioEstado(data, data?.Id_ns_cliente || 0, 'F'); // Guardar el registro
            return false;
          }

          break;
        default:
          log.debug("Caso no reconocido", "No se reconoce el caso para enviar datos a la API externa");
          return false; // Si no se reconoce el caso, retornar false
      }


    } catch (error) {
      log.debug("error", error)
      return false;
    }
  }

  function GenerarLogCambioEstado(context, registroID, EstadoProcesado, proceso) {
    try {

      log.debug("GenerarLogCambioEstado", { context, registroID, EstadoProcesado, proceso });
      if (!context || !registroID || !EstadoProcesado || !proceso) {
        log.error("Error en GenerarLogCambioEstado", "Faltan parámetros necesarios");
        return;
      }
      // Verifica si el registro ya existe
      const existingSearch = search.create({
        type: 'customrecord_log_proceso_general',
        filters: [
          ['custrecordlog_proceso_general_proceso', 'is', proceso],
          'AND',
          ['custrecordid_registro_proc_general', 'is', registroID],
          'AND',
          ["custrecord_producto_lpc", "startswith", EstadoProcesado]
        ],
        columns: ['internalid']
      });

      const existingResult = existingSearch.run().getRange({ start: 0, end: 1 });

      log.debug("existingResult", existingResult)

      if (existingResult.length > 0) {
        log.debug("Registro ya existe", `El registro con ID ${registroID} y proceso ${proceso} ya existe.`);
        let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: proceso });
        objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
        objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
        objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
        objRecord.save();
        return; // Si el registro ya existe, no se crea uno nuevo
      } else {
        let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: proceso });
        objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
        objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
        objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
        objRecord.save();

        // log.debug("objRecord", objRecord)

      }

    } catch (error) {
      log.error('Error en generarLogCambioEstado', error);
    }
  }

  return {
    execute: execute,
  };
});