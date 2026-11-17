/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros pendientes de procesamiento y envía los datos a un API externo.
Script: https://7451241.app.netsuite.com/app/common/scripting/script.nl?id=4849&whence=
Ambiente: Produccion.
Nombre
HU_EC_SS_PD_TRANSACCIONES_REINTENTO
*/

define([
  "N/https",
  "N/log",
  "N/record",
  "N/search",
  "N/cache",
  "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
  "./UtilsGeneral/HU_EC_FUNCION",
  "./UtilsGeneral/HU_EC_CONSTANTES"
], function (https, log, record, search, cache, coberturaController, _funcion, _const) {

  const CACHE_TOKEN_SS_OS_REINTENTO = {
    NAME: 'HU_EC_CACHE_TKN_SS_OS_REINTENTO_7451241',
    KEY: 'token_hunter_ss_os_reintento',
    TTL: 3000
  };

  function obtenerTokenCache() {
    const tokenCache = cache.getCache({
      name: CACHE_TOKEN_SS_OS_REINTENTO.NAME,
      scope: cache.Scope.PROTECTED
    });

    return tokenCache.get({
      key: CACHE_TOKEN_SS_OS_REINTENTO.KEY,
      loader: () => _funcion.loginGetToken(),
      ttl: CACHE_TOKEN_SS_OS_REINTENTO.TTL
    });
  }

  function execute() {
    try {
      // return
      // let itemOTResult = [];
      // Crear búsqueda para obtener registros pendientes de procesamiento
      const busquedaSegmentoCobertura = search.create({
        type: "customrecord_ven_orden_servicio_log",
        filters: [
          ["custrecord_procesado", "is", "F"],
          "AND", ["custrecord_impulso", "greaterthan", "0"],
          "AND", ["custrecord_impulso", "lessthan", "4"],
          "AND", ["custrecord_id_os", "isnotempty", ""],
          // "AND", ["custrecord_respuesta_api","is","{text=Un item no posee ADP.}"]
        ],
        columns: [
          "internalid",
          "custrecord_id_os",
          "custrecord_id_bien",
          "custrecord_id_origen",
          "custrecord_origen",
          "custrecord_procesado",
          "custrecord_impulso",
          "custrecord_tipoeventousuario",
          "custrecord_orden_servicio_name",
          "custrecord_subsidiaria",
          "custrecord_localidad",
          "custrecord_original_nombre",
          "created",
        ].map((name) => search.createColumn({ name })),
      });

      const myResultParaCobertura = busquedaSegmentoCobertura.run().getRange({ start: 0, end: 100 });
      const theCountFac = busquedaSegmentoCobertura.runPaged().count;

      log.debug("Número de registros encontrados", theCountFac);

      // Procesar cada resultado de la búsqueda
      myResultParaCobertura.forEach((result, index) => {
        const data = {
          InternalIdDoc: result.getValue(busquedaSegmentoCobertura.columns[0]),
          InternalOS: result.getValue(busquedaSegmentoCobertura.columns[1]),
          InternalBien: result.getValue(busquedaSegmentoCobertura.columns[2]),
          InternalOrigen: result.getValue(busquedaSegmentoCobertura.columns[3]),
          Origen: result.getValue(busquedaSegmentoCobertura.columns[4]),
          Procesado: result.getValue(busquedaSegmentoCobertura.columns[5]),
          Impulso: result.getValue(busquedaSegmentoCobertura.columns[6]),
          TipoEventoUsuario: result.getValue(busquedaSegmentoCobertura.columns[7]),
          OrdenServicioName: result.getValue(busquedaSegmentoCobertura.columns[8]),
          Subsidiaria: result.getValue(busquedaSegmentoCobertura.columns[9]),
          Localidad: result.getValue(busquedaSegmentoCobertura.columns[10]),
          OriginalNombre: result.getValue(busquedaSegmentoCobertura.columns[11]),
          Created: result.getValue(busquedaSegmentoCobertura.columns[12]),
        };

        log.debug(`Procesando registro ${index + 1}`, data);

        try {
          // Consulta a la API para obtener detalles de la orden de servicio
          let response = {};
          if (data?.Origen == "OT" && data?.InternalOS && data?.TipoEventoUsuario != "delete") {

            // busqueda para obtener el item de la OT
            // let itemOT = search.create({
            //   type: "customrecord_ht_record_ordentrabajo",
            //   filters: [
            //     ["custrecord_ht_ot_orden_servicio", "is", data.InternalOS],
            //   ],
            //   columns: [
            //     search.createColumn({ name: "custrecord_ht_ot_item", label: "Item" }),
            //     search.createColumn({ name: "custrecord_ht_ot_estado", label: "Estado" }),
            //     search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "Fecha de Trabajo Asignación" }),
            //   ],
            // });
            // let myPagedDataItemOT = itemOT.runPaged();
            // itemOTResult = myPagedDataItemOT.fetch({ index: 0 }).data;

            //log.debug("----itemOTId------", itemOTId);

            response = coberturaController.makeApiRequest(
              //  { idorden: data.InternalOS, indice: 1, iditem: itemOTId },
              { idorden: data.InternalOS, indice: 1 },
              "customdeploy_hu_ec_rs_pd_orden_servicio",
              "customscript_hu_ec_rs_pd_orden_servicio",
              "POST",
              false
            );
          } else {
            response = coberturaController.makeApiRequest(
              { idorden: data.InternalOS, indice: 1 },
              "customdeploy_hu_ec_rs_pd_orden_servicio",
              "customscript_hu_ec_rs_pd_orden_servicio",
              "POST",
              false
            );
          }

          let responseBody = response;
          // log.debug("Respuesta de la API", responseBody);

          // Validar la respuesta de la API y actualizar el registro de log
          if (responseBody?.DetalleOrden?.length >= 0) {
            try {

              // log.debug("-----", data);

              // Preparar datos para enviar a la API externa
              let DataToSend = response;
              let token = obtenerTokenCache();

              // log.debug("token", token)

              let headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              };

              if (data?.Origen) {
                DataToSend.origen = data.Origen == "FAC" ? "FA" : data.Origen;
              } else {
                DataToSend.origen = "";
              }

              if (data?.TipoEventoUsuario) {
                // if(data.TipoEventoUsuario == "delete"){
                if (data.TipoEventoUsuario == "delete" && data?.Origen == "OS") {

                  if (DataToSend?.DetalleOrden?.length > 0) {
                    delete DataToSend.DetalleOrden
                  }
                  DataToSend.accion = "E";
                  DataToSend.origen = "OS";
                  DataToSend.Id_os = data.InternalOS;
                  DataToSend.Codigo_Empresa = data?.Subsidiaria || "2";
                  DataToSend.Codigo_Sucursal = data?.Localidad || "0";
                  // DataToSend.Numero_General = data?.OrdenServicioName || "0";
                  DataToSend.Numero_General = "0";
                } else
                  if (data?.TipoEventoUsuario == "create") {
                    DataToSend.accion = "I";
                  } else

                    DataToSend.accion = "P";

                if (data?.TipoEventoUsuario == "edit" || data?.TipoEventoUsuario == "cancel" || data?.TipoEventoUsuario == "approve" || (data?.TipoEventoUsuario == "delete" && data?.Origen != "OS")) {
                  DataToSend.accion = "U";
                }
              } else {
                DataToSend.accion = "P";
              }

              if (data?.Origen == "MA") {
                DataToSend.accion = "M";
                DataToSend.origen = "MA";
              }

              if (data?.Origen == "PC") {
                DataToSend.accion = "C";
                DataToSend.origen = "PC";
              }

              // if(data?.Origen == "OT" && data?.InternalOS && data?.TipoEventoUsuario != "delete"){
              //   // let OsNombre = getOrdenService(data.InternalOS);
              //   if(data.InternalOS){

              //       log.debug("----itemOTResult------", itemOTResult);


              //      // Encuentra el item trabajado y actualiza si esta chequeado
              //     for(let i = 0; i < DataToSend.DetalleOrden.length; i++){

              //       for(let j = 0; j < itemOTResult.length; j++){

              //         if(DataToSend.DetalleOrden[i].IdItem == itemOTResult[j].getValue({ name: "custrecord_ht_ot_item", label: "Item" }) && itemOTResult[j].getValue({ name: "custrecord_ht_ot_estado", label: "Estado" }) == "2"){
              //           DataToSend.DetalleOrden[i].Chequeado = "T";
              //           DataToSend.DetalleOrden[i].Id_OT = itemOTResult[j].id;
              //           DataToSend.DetalleOrden[i].Fecha_Chequeo = itemOTResult[j].getValue({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "Fecha de Trabajo Asignación" }) ? itemOTResult[j].getValue({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "Fecha de Trabajo Asignación" }).split(" ")[0] : "01/01/1900";
              //         }
              //       }
              //     }
              //   }
              // }

              let options = {
                method: "POST",
                url: _const.URLS.HUNTER_API_NETSUITE + "/OrdenServicioNS",
                headers: headers,
                body: JSON.stringify(DataToSend),
              };

              // log.debug("options", options)

              // Enviar datos a la API externa
              let response2 = https.post(options);


              let temporal = {};

              if (response2.body != "") {
                temporal = JSON.parse(response2.body);
              }

              if (response2 && temporal?.statusCode === 200) {
                actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "T", JSON.stringify(responseBody), response2.body, 200);
                return true;
              } else {
                log.error("Error HTTP", `Código de estado: ${response2.code}, Respuesta: ${response2.body}`);
                actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), response2.body, 400);
                return `Código de estado: ${response2.code}, Respuesta: ${response2.body}`;
              }
            } catch (error) {
              log.debug("Error en la consulta de la API error", error);
              actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), error, 400);
            }
          } else {
            log.debug("Error", "Tiempo Agotado.");

            if (responseBody?.DetalleOrden == []) {
              record.submitFields({
                type: "customrecord_ven_orden_servicio_log",
                id: result.getValue({ name: "internalid" }),
                values: {
                  custrecord_procesado: "F",
                  tipoEventoUsuario: "delete",
                  custrecord_impulso: 0
                },
              });
            }

            actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), { text: "Tiempo Agotado" }, 400);
          }

        } catch (error) {
          log.debug("Error en la consulta de la API", error);
          actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", error, {}, 400);
        }
      });

    } catch (error) {
      log.error("Error en la ejecución del script", error);
    }
  }

  /**
   * Actualiza el registro de log de la orden de servicio.
   * @param {number} internalId - ID interno del registro.
   * @param {number} Impulso - Valor de impulso que se incrementará.
   * @param {string} estadoProcesado - Estado de procesamiento ("T" para true, "F" para false).
   */
  const actualizarProcesadoLog = (internalId, Impulso, estadoProcesado, traza, api_Externo, respuesta) => {
    try {

      let valuesTem = {};

      if (respuesta == 200) {
        valuesTem = {
          custrecord_procesado: estadoProcesado,
          custrecord_impulso: parseInt(Impulso) + 1,
          custrecord32: traza,
          custrecord_respuesta_api: api_Externo,
          custrecord_respuesta_api_exito: api_Externo,
        };
      } else {
        valuesTem = {
          custrecord_procesado: estadoProcesado,
          custrecord_impulso: parseInt(Impulso) + 1,
          custrecord32: traza,
          custrecord_respuesta_api: api_Externo,
          custrecord_respuesta_api_error: api_Externo,
        };
      }

      record.submitFields({
        type: "customrecord_ven_orden_servicio_log",
        id: internalId,
        values: valuesTem,
      });
      // log.debug("Registro actualizado", `ID: ${internalId}`);
    } catch (error) {
      log.error("Error actualizando el registro", error);
    }
  };

  return {
    execute: execute,
  };
});
