/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 09/12/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros con contexto UI y CSV, sobre Orden de Servicio Solo Subsidaria 2.  Se reajusta cada 8 Horas
Ambiente: Produccion
*/
define([
  'N/search',
  'N/log',
  'N/record',
  'N/cache',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
  'N/query',
  'N/https',
  'N/runtime'
], function (search, log, record, cache, coberturaController, _funcion, _const, query, https, runtime) {

  const CACHE_TOKEN_MR_BIENES = {
    NAME: 'HU_EC_CACHE_TKN_MR_BIENES_DISP_S2_7451241',
    KEY: 'token_hunter_mr_bienes_disp_s2',
    TTL: 3000
  };

  function obtenerTokenCache() {
    const tokenCache = cache.getCache({
      name: CACHE_TOKEN_MR_BIENES.NAME,
      scope: cache.Scope.PROTECTED
    });

    return tokenCache.get({
      key: CACHE_TOKEN_MR_BIENES.KEY,
      loader: () => _funcion.loginGetToken(),
      ttl: CACHE_TOKEN_MR_BIENES.TTL
    });
  }

  function getInputData() {
    try {
      // return
      let rangoAjustado = obtenerRangoTiempoEcuador();
      log.debug("rangoHora", rangoAjustado);

      // let rangoAjustado = { HoraInicio: "05/08/2026 08:00", HoraFin: "05/08/2026 24:00" };
      // log.debug("rangoHora", rangoAjustado);

      // La ventana viene como "DD/MM/YYYY HH:MI" y el fin puede llegar como 24:00.
      // Normalizamos el 24:00 al inicio del día siguiente para TO_DATE.
      const horaInicioSql = normalizarFechaSql(rangoAjustado.HoraInicio);
      const horaFinSql = normalizarFechaSql(rangoAjustado.HoraFin);

      // SQL: SystemNote (estado, 709) -> dispositivo válido S2. El reduce sigue
      // resolviendo dato técnico y coberturas, por eso aquí solo devolvemos el dispositivo.
      const sql = `
        SELECT sn.recordid, sn.context
        FROM SystemNote sn
        JOIN customrecord_ht_record_detallechaserdisp d ON d.id = sn.recordid
        WHERE sn.field = 'CUSTRECORD_HT_DD_ESTADO'
          AND sn.recordtypeid = 709
          AND d.custrecordht_hdd_subsidiaria = 2
          AND d.isinactive = 'F'
          AND sn.date BETWEEN TO_DATE(?, 'DD/MM/YYYY HH24:MI') AND TO_DATE(?, 'DD/MM/YYYY HH24:MI')
        GROUP BY sn.recordid, sn.context
      `;

      const results = query.runSuiteQL({
        query: sql,
        params: [horaInicioSql, horaFinSql]
      }).asMappedResults();

      if (results.length === 0) {
        log.error("Búsqueda vacía", "No se encontraron resultados");
      }

      log.debug("--Resultados de la búsqueda--", results.length);

      // return []

      return results.map(r => ({
        id: r.recordid,
        context: r.context
      }));

    } catch (error) {
      log.error("Error en getInputData", error);
      return [];
    }
  }

  // Convierte "DD/MM/YYYY 24:00" al inicio del día siguiente "DD/MM/YYYY 00:00"
  function normalizarFechaSql(fechaHora) {
    if (!fechaHora) return fechaHora;
    const [fecha, hora] = fechaHora.split(" ");
    if (hora !== "24:00") return fechaHora;

    const [dia, mes, anio] = fecha.split("/").map(n => parseInt(n, 10));
    const d = new Date(anio, mes - 1, dia);
    d.setDate(d.getDate() + 1);

    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy} 00:00`;
  }

  function map(context) {
    try {
      // return
      const data = JSON.parse(context.value);
      if (!data.id || !data.context) {
        log.error("Datos incompletos en el registro", data);
        return;
      }

      // El getInputData ya validó dispositivo válido de subsidiaria 2.
      // El reduce resuelve dato técnico y coberturas, así que escribimos el dispositivo directo.
      context.write({ key: data.id, value: data.id });

    } catch (error) {
      log.error("Error en map", error);
      return;
    }
  }

  function reduce(context) {
    try {
      // return
      // return true; // Salta el procesamiento de reduce

      const ID_HT_Dispositivo = context.key; // ID del registro a procesar
      log.debug("ID del registro", ID_HT_Dispositivo);

      const consultaDatoTecnicoResult = consultaDatoTecnico(ID_HT_Dispositivo) || [];

      log.debug("consultaDatoTecnicoResult", consultaDatoTecnicoResult);

      // General ID Dato Tecnico - Universo
      const registrosValidos = consultaDatoTecnicoResult.filter(dato => dato.idRegistro);
      if (registrosValidos.length === 0) return;

      // Procesar cada registro
      registrosValidos.forEach(({ idRegistro }) => {
        let sendCoberura = ObtenerCoberturaDatoTecnico(idRegistro);
        EnvioLoteCobertura(sendCoberura, ID_HT_Dispositivo);
      });


      log.debug("------", "----------------");


    } catch (error) {
      log.error("Error en reduce", error);
      GenerarLogCambioEstado({}, context.key, 'F', "PD_Bienes"); // Guardar el registro en caso de error
      return;
    }
  }

  function summarize(summary) {
    try {
      // return
      return true;
    } catch (error) {
      log.error("Error en summarize", error);
      return false;
    }
  }

  // function obtenerRangoTiempoEcuador() {
  //   try {
  //     const fechaServidor = new Date();
  //     const offsetEcuador = -5 * 60; // UTC-5 en minutos

  //     // Convertir fecha del servidor a hora local de Ecuador
  //     const utc = fechaServidor.getTime() + (fechaServidor.getTimezoneOffset() * 60000);
  //     const fechaEcuador = new Date(utc + (offsetEcuador * 60000));

  //     let hora = fechaEcuador.getHours();
  //     // let hora = 1;

  //     let fechaInicio, fechaFin;

  //     if (hora >= 0 && hora < 8) {
  //       // 00:00 - 08:00 → Devuelve 16:00 - 00:00 del día anterior
  //       const anterior = new Date(fechaEcuador);
  //       anterior.setDate(anterior.getDate() - 1);

  //       fechaInicio = new Date(anterior);
  //       fechaInicio.setHours(16, 0, 0, 0);

  //       fechaFin = new Date(anterior);
  //       fechaFin.setDate(fechaFin.getDate());
  //       fechaFin.setHours(23, 59, 59, 999);

  //     } else if (hora >= 8 && hora < 16) {
  //       // 08:00 - 16:00 → Devuelve 00:00 - 08:00 del mismo día
  //       fechaInicio = new Date(fechaEcuador);
  //       fechaInicio.setHours(0, 0, 0, 0);

  //       fechaFin = new Date(fechaEcuador);
  //       fechaFin.setHours(8, 0, 0, 0);

  //     } else {
  //       // 16:00 - 24:00 → Devuelve 08:00 - 16:00 del mismo día
  //       fechaInicio = new Date(fechaEcuador);
  //       fechaInicio.setHours(8, 0, 0, 0);

  //       fechaFin = new Date(fechaEcuador);
  //       fechaFin.setHours(16, 0, 0, 0);
  //     }

  //     return {
  //       HoraInicio: formatearFechaHora(fechaInicio),
  //       HoraFin: formatearFechaHora(fechaFin)
  //     };

  //   } catch (error) {
  //     log.debug("Error en obtenerRangoTiempoEcuador", error);
  //     return {};
  //   }
  // };
  
  function obtenerRangoTiempoEcuador() {
    try {
      const fechaServidor = new Date();
      const offsetEcuador = -5 * 60; // UTC-5 en minutos

      const utc = fechaServidor.getTime() + (fechaServidor.getTimezoneOffset() * 60000);
      const fechaEcuador = new Date(utc + (offsetEcuador * 60000));

      // Fin del rango: inicio de la hora actual (minutos/seg en 0)
      const fechaFin = new Date(fechaEcuador);
      fechaFin.setMinutes(0, 0, 0);

      // Inicio del rango: una hora antes.
      // Si son las 00:xx, restar 1h cae en 23:00 del día anterior automáticamente.
      const fechaInicio = new Date(fechaFin);
      fechaInicio.setHours(fechaInicio.getHours() - 1);

      return {
        HoraInicio: formatearFechaHora(fechaInicio),
        HoraFin: formatearFechaHora(fechaFin)
      };

    } catch (error) {
      log.debug("Error en obtenerRangoTiempoEcuador", error);
      return {};
    }
  };
  
  function formatearFechaHora(fecha) {
    let dia = fecha.getDate().toString().padStart(2, "0");
    let mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    let anio = fecha.getFullYear();
    let hora = fecha.getHours().toString().padStart(2, "0");
    let minutos = fecha.getMinutes().toString().padStart(2, "0");

    if (hora == "23" && minutos == "59") {
      hora = "24";
      minutos = "00";
    }

    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
  };

  function consultaDatoTecnico(idContext) {
    try {
      let searchResult = search.create({
        type: "customrecord_ht_record_mantchaser",
        filters: [
          ["custrecord_ht_mc_seriedispositivo", "is", idContext],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "internalid" })
        ]
      }).runPaged();

      return searchResult.pageRanges.flatMap(pageRange => {
        return searchResult.fetch({ index: pageRange.index }).data.map(result => ({
          idRegistro: result.getValue({ name: "internalid" })
        }));
      });

    } catch (error) {
      log.error("Error en consultaDatoTecnico", { error: error.message, stack: error.stack });
      return [];
    }
  }

  function ObtenerCoberturaDatoTecnico(idRegistro) {
    try {
      // Validación del parámetro
      if (!idRegistro) {
        log.error("Error", "El parámetro idRegistro es obligatorio.");
        return [];
      }

      let results = [];

      // Creación de la búsqueda
      let ht_co_coberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_numeroserieproducto", "anyof", idRegistro],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", "2"]
        ],
        columns: [
          search.createColumn({ name: "internalid", sort: search.Sort.ASC }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
        ]
      });

      // Ejecutar búsqueda paginada
      let pagedData = ht_co_coberturaSearch.runPaged({ pageSize: 100 });
      log.debug("Cantidad de registros encontrados", pagedData.count);

      // Iterar sobre las páginas de resultados
      pagedData.pageRanges.forEach(pageRange => {
        let page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {

          let idRegistro = result.getValue({ name: "internalid" });
          let bien = result.getValue({ name: "custrecord_ht_co_bien" });

          results.push({
            internalID: idRegistro,
            bienID: bien
          });
        });
      });

      // Validar si se encontraron resultados
      if (results.length === 0) {
        log.error("Sin resultados", "No se encontraron registros para el idRegistro proporcionado.");
      }

      return results;

    } catch (error) {
      log.error("Error en ObtenerCoberturaDatoTecnico", { error: error.message, stack: error.stack });
      return [];
    }
  }

  function EnvioLoteCobertura(data, id_ht_dispositivo) {
    try {
      log.debug("--Lote--", data);

      for (let y = 0; y < data.length; y++) {
        const idCobertura = data[y].internalID;

        let datosParaAPIInterna = PrepararDatosParaAPIInternaConSearch(idCobertura);

        if (!datosParaAPIInterna) {
          log.error("Error en datosParaAPIInterna", "No se pudo obtener los datos necesarios para la API interna");
          return true; // Salta a la siguiente iteración
        }

        const respuestaAPIInterna = ConsumirAPIInterna2(datosParaAPIInterna, 'POST');
        respuestaAPIInterna.Empresa = "2";
        respuestaAPIInterna.Accion = "edit";

        log.debug("infCompleta", respuestaAPIInterna);

        const respuestaExterna = EnviarDatosAPIExternaCobertura(respuestaAPIInterna); // devuelve true o false
        log.debug("Respuesta", respuestaExterna);

        // Validar si la respuesta es false
        if (!respuestaExterna) {
          log.error("Error en envío", `El envío falló para la cobertura con ID: ${idCobertura}`);
          GenerarLogCambioEstado(data, idCobertura, 'F', "EnvioCobertura"); // Guardar el registro
          return false; // Detener el proceso
        }
      }

      // Si todas las respuestas son true, generar el log final
      GenerarLogCambioEstado(data, id_ht_dispositivo, 'T', "PD_HT_Dispositivo");

    } catch (error) {
      log.error("Error en EnvioLoteCobertura", error);
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

  function PrepararDatosParaAPIInternaConSearch(idRegistro) {
    try {
      if (!idRegistro) {
        log.error("Error", "El parámetro idRegistro es obligatorio.");
        return false;
      }

      // Crear la búsqueda para obtener los datos del registro
      const coberturaSearch = search.create({
        type: 'customrecord_ht_co_cobertura',
        filters: [
          ['internalid', 'is', idRegistro] // Filtrar por el ID del registro
        ],
        columns: [
          search.createColumn({ name: 'custrecord_ht_co_bien' }), // Campo: Bien
          search.createColumn({ name: 'custrecord_ht_co_familia_prod' }), // Campo: Familia del bien
          search.createColumn({ name: 'custrecord_ht_co_coberturainicial' }), // Campo: Cobertura inicial
          search.createColumn({ name: 'custrecord_ht_co_coberturafinal' }) // Campo: Cobertura final
        ]
      });

      // Ejecutar la búsqueda y obtener el primer resultado
      const result = coberturaSearch.run().getRange({ start: 0, end: 1 })[0];
      if (!result) {
        log.error("Error", `No se encontró el registro con ID: ${idRegistro}`);
        return false;
      }

      // Obtener los valores de los campos
      const idbien = result.getValue({ name: 'custrecord_ht_co_bien' });
      const id_familia_bien = result.getValue({ name: 'custrecord_ht_co_familia_prod' });
      const coberturaInicial = result.getValue({ name: 'custrecord_ht_co_coberturainicial' });
      const coberturaFinal = result.getValue({ name: 'custrecord_ht_co_coberturafinal' });

      // Calcular el resultado adicional
      const resultado = valorAdicionalPD(coberturaInicial, coberturaFinal);

      // Retornar los datos en el formato esperado
      return {
        id: idRegistro,
        idbien,
        id_familia_bien,
        TipoPlazo: resultado.Tipo_plazo,
        IdUsuario: (runtime?.getCurrentUser()?.id || 0).toString(),
        IdDocumento: 0,
        CodDocumento: "",
        Comentario: ""
      };
    } catch (error) {
      log.error("Error en prepararDatosParaAPIInternaConSearch", { error: error.message, stack: error.stack });
      return false;
    }
  }

  function ConsumirAPIInterna2(json, method) {
    try {

      if (!json) {
        return [];
      }

      let respuesta = coberturaController.makeApiRequest(
        {
          // accion: "PasoDatos",     
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
      log.debug("error", error)
      return []
    }
  }

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

  function EnviarDatosAPIExternaCobertura(data) {
    try {

      // return true

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return false;
      }

      const token = obtenerTokenCache();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const options = {
        method: "POST",
        url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
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
  }

  return {
    getInputData,
    map,
    reduce,
    summarize
  };
});