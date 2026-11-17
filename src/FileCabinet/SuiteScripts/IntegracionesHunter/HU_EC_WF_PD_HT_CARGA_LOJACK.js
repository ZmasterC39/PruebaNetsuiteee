/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(['N/log', 'N/search', 'N/record', 'N/https', 'N/query', 'N/file', 'N/runtime', 'N/ui/serverWidget',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
],
  (log, search, record, https, query, file, runtime, serverWidget, coberturaController, _funcion, _const) => {

    const onAction = (context) => {
      try {
        log.debug("context", context);
        // log.debug("Log", "Se ejecutó desde un WorkflowActionScript");
        var rec = context.newRecord;

        const infoUsuario = validarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;

        const ID_HT_CARGA_LOJACK = context.newRecord.id;
        const consultaDatoTecnicoResult = consultaDatoTecnico(ID_HT_CARGA_LOJACK) || [];

        log.debug("consultaDatoTecnicoResult", consultaDatoTecnicoResult);

        // General ID Dato Tecnico - Universo
        const registrosValidos = consultaDatoTecnicoResult.filter(dato => dato.idRegistro);
        if (registrosValidos.length === 0) return;

        // Procesar cada registro
        registrosValidos.forEach(({ idRegistro }) => {

          // Actualizar DT a Cobertura // NEW
          actualizarDetalleLojack(idRegistro, rec)
          
          let sendCoberura = ObtenerCoberturaDatoTecnico(idRegistro);
          EnvioLoteCobertura(sendCoberura, ID_HT_CARGA_LOJACK);
        });

      } catch (error) {
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

    function consultaDatoTecnico(idContext) {
      try {
        let searchResult = search.create({
          type: "customrecord_ht_record_mantchaser",
          filters: [
            ["custrecord_ht_mc_seriedispositivolojack", "is", idContext],
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
            GenerarLogCambioEstado(data, id_ht_dispositivo, 'F', "PD_HT_Carga_Lojack"); // Guardar el registro
            return false; // Detener el proceso
          }
        }

        // Si todas las respuestas son true, generar el log final
        GenerarLogCambioEstado(data, id_ht_dispositivo, 'T', "PD_HT_Carga_Sim_Card");

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

    // NEW
    function actualizarDetalleLojack(idDetalle, recMaster) {
      try {
        var valores = {
          custrecord_ht_cl_dt_lojack: recMaster.getValue('custrecord_ht_cl_lojack'),
          custrecord_ht_mc_codigoactivacion: recMaster.getValue('custrecord_ht_cl_activacion'),
          custrecord_ht_mc_codigorespuesta: recMaster.getValue('custrecord_ht_cl_respuesta'),
          custrecord_ht_mc_estadolojack: recMaster.getValue('custrecord_ht_cl_estado'),
        };

        record.submitFields({
          type: 'customrecord_ht_record_mantchaser',
          id: idDetalle,
          values: valores,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true
          }
        });

        log.debug('Detalle actualizado', idDetalle);

      } catch (e) {
        log.error('Error actualizando detalle', e.stack);
      }
    }

    return {
      onAction: onAction
    };
  });