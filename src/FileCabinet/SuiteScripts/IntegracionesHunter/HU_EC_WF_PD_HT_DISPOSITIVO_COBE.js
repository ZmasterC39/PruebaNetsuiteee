/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(['N/log', 'N/search', 'N/record', 'N/https', 'N/query', 'N/file', 'N/runtime', 'N/cache', 'N/ui/serverWidget',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
], (log, search, record, https, query, file, runtime, cache, serverWidget, coberturaController, _funcion, _const) => {

  const CACHE_TOKEN_COBERTURA = {
    NAME: 'HU_EC_CACHE_TOKEN_COBERTURA',
    KEY: 'token_hunter_cobertura',
    TTL: 3000
  };

  const onAction = (context) => {
    try {
      const { type, newRecord } = context || {};
      log.debug('Context Type', type || 'Sin tipo');

      if (!newRecord) {
        log.error('Error', 'No se encontró el newRecord en el contexto');
        return false;
      }

      const infoUsuario = validarEjecucion(runtime.getCurrentUser());
      if (!infoUsuario.permiso) return true;

      const datosParaAPIInterna = prepararDatosParaAPIInterna(newRecord, infoUsuario.id);
      const respuestaAPIInterna = consumirAPIInterna2(datosParaAPIInterna);

      respuestaAPIInterna.Empresa = "2";
      respuestaAPIInterna.Accion = type;
      log.audit('Generar Log', `Cobertura ID: ${newRecord.id}`);

      if (esDia5() && esOperadorSistema(infoUsuario.id)) {
        GenerarLogOffline({ IdCobertura: newRecord.id || 0, Accion: type, data: respuestaAPIInterna, response: null }, 'EnvioCobertura', "F", 0);
        return true;
      }

      return enviarDatosAPIExterna(respuestaAPIInterna, newRecord.id, type);

    } catch (error) {
      log.error('Error en onAction', error.message || error);
      GenerarLogOffline({ IdCobertura: context?.newRecord?.id || 0, error: error.message || String(error) }, 'EnvioCobertura', "F", 0);
      return false;
    }
  };

  /*
  * Funciones Adicionales
  */
  function esDia5() {
    return new Date().getDate() === 5;
  }

  function esOperadorSistema(idUsuario) {
    return Number(idUsuario) === 449;
  }

  function obtenerTokenCache() {
    const tokenCache = cache.getCache({
      name: CACHE_TOKEN_COBERTURA.NAME,
      scope: cache.Scope.PROTECTED
    });

    return tokenCache.get({
      key: CACHE_TOKEN_COBERTURA.KEY,
      loader: () => _funcion.loginGetToken(),
      ttl: CACHE_TOKEN_COBERTURA.TTL
    });
  }

  // Funciones de apoyo 
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

  function valorAdicionalPD(fechaInicio, fechaFin) {
    try {
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

  function prepararDatosParaAPIInterna(record, idUsuario) {
    try {
      const id = record.id
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
        id,
        idbien,
        id_familia_bien,
        TipoPlazo: resultado.Tipo_plazo,
        IdUsuario: idUsuario,
        IdDocumento: 0,
        CodDocumento: "",
        Comentario: ""
      };
    } catch (error) {
      return false;
    }
  }

  function consumirAPIInterna2(json, method) {
    try {
      if (!json) {
        return [];
      }

      log.debug("json", json)
      
      let respuesta = coberturaController.makeApiRequest(
        {
          accion: "PasoDatos_N",
          // idvehiculo: json.idbien,
          // idgrupoproducto: json.id_familia_bien
          IdCobertura: json.id
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
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  function GenerarLogOffline(data = {}, proceso, producto = "F", impulso = 0) {
    try {
      const logRecord = record.create({
        type: 'customrecord_log_proceso_general',
        isDynamic: true
      });

      const campos = {
        custrecordlog_proceso_general_proceso: proceso,
        custrecord_log_proceso_general_traza: JSON.stringify(data, null, 2),
        custrecordid_registro_proc_general: data?.IdCobertura || 0,
        custrecord_producto_lpc: producto,
        custrecord_impulso_log_pro_general: impulso
      };

      for (const [campo, valor] of Object.entries(campos)) {
        logRecord.setValue({ fieldId: campo, value: valor });
      }

      const id = logRecord.save();
      log.debug("Log creado correctamente", { id, proceso });
      return id;

    } catch (error) {
      log.error("Error en GenerarLogOffline", error);
      return false;
    }
  }

  function enviarDatosAPIExterna(data, idCobertura, accion) {
    try {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        GenerarLogOffline({ IdCobertura: idCobertura || 0, Accion: accion, motivo: "Sin datos para enviar" }, 'EnvioCobertura', "F", 0);
        return false;
      }

      const token = obtenerTokenCache();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      log.debug("data", data)
      
      const options = {
        method: "POST",
        url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
        headers: headers,
        body: JSON.stringify(data),
      };

      const response = https.post(options);

      let temporal = false;

      if (response && response.body != "") {
        temporal = JSON.parse(response.body);
      }

      if (temporal && temporal.statusCode === 200) {
        log.debug("Respuesta de la API externa", temporal);
        GenerarLogOffline({ IdCobertura: idCobertura || 0, Accion: accion, data, response: temporal }, 'EnvioCobertura', "T", 4);
        return true;
      } else {
        GenerarLogOffline({ IdCobertura: idCobertura || 0, Accion: accion, data, response: response?.body || null }, 'EnvioCobertura', "F", 0);
        log.debug("Error en la respuesta de la API externa", response);
        return false;
      }
    } catch (error) {
      GenerarLogOffline({ IdCobertura: idCobertura || 0, Accion: accion, error: error.message || String(error) }, 'EnvioCobertura', "F", 0);
      log.error("Error al enviar datos a la API externa", error);
      return false;
    }
  }

  return {
    onAction: onAction
  };
});