/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/search", "N/record", "N/email"], (
  log,
  search,
  record,
  email
) => {
  const HT_ORDEN_TRABAJO_RECORD = "customrecord_ht_record_ordentrabajo";
  let CHEQUEADO = "4";
  let comentario = "";
  let novedad = false;
  let validador;

  const _post = (scriptContext) => {

    log.debug("POST request received", scriptContext);

    try {
      if (scriptContext?.estadotrabajo) {

        let condicional = scriptContext.estadotrabajo;

        if (condicional == "B" || condicional == "I") {
          CHEQUEADO = "2";
          validador = true;
        } else if (condicional == "F") {
          comentario = scriptContext?.comentario;
          novedad = true;
          validador = false;
        } else {
          validador = false;
        }

      }

      comentario = scriptContext?.comentario;

      let fecha = new Date(scriptContext.fecha);
      fecha.setHours(fecha.getHours() + 2);

      let openRecord = record.load({
        type: HT_ORDEN_TRABAJO_RECORD,
        id: scriptContext.idordentrabajo,
        isDynamic: true,
      });

      let fieldsToUpdate;

      if (comentario == "" || (comentario == null && validador == true)) {
        fieldsToUpdate = {
          custrecord_ht_ot_tecnicoasignacion: scriptContext.idtecnico,
          custrecord_ht_ot_fechatrabajoasignacion: fecha,
          custrecord_ht_ot_horatrabajoasignacion: fecha,
          custrecord_ht_ot_fecha_asignacion: fecha,
          custrecord_ht_ot_ubicacion: scriptContext.ubicacion,
          custrecord_ht_ot_estadochaser: scriptContext.estadodispositivo,
          custrecord_ht_ot_connovedad: novedad,
          //galvar 03-07-2026
          custrecord_ht_ot_usuariochequea: scriptContext.idtecnico,
        };
      } else if (
        comentario != "" ||
        (comentario != null && validador == true)
      ) {
        fieldsToUpdate = {
          custrecord_ht_ot_tecnicoasignacion: scriptContext.idtecnico,
          custrecord_ht_ot_fechatrabajoasignacion: fecha,
          custrecord_ht_ot_horatrabajoasignacion: fecha,
          custrecord_ht_ot_fecha_asignacion: fecha,
          custrecord_ht_ot_ubicacion: scriptContext.ubicacion,
          custrecord_ht_ot_estadochaser: scriptContext.estadodispositivo,
          custrecord_ht_ot_observacion: comentario,
          custrecord_ht_ot_connovedad: novedad,
          //galvar 03-07-2026
          custrecord_ht_ot_usuariochequea: scriptContext.idtecnico,
        };
      } else {
        fieldsToUpdate = {
          custrecord_ht_ot_observacion: comentario,
          custrecord_ht_ot_connovedad: novedad,
        };
      }

      // Validar si todos los campos requeridos tienen valor
      // if (scriptContext.servicio && scriptContext.servcomentario) { // 19/12/2025
      if (scriptContext.servcomentario) { // 19/12/2025

        // Obtener valores y textos de los campos necesarios
        const serviciosCommands = openRecord.getValue({ fieldId: 'custrecord_ht_ot_servicios_commands' });
        const serviciosCommandsText = openRecord.getText({ fieldId: 'custrecord_ht_ot_servicios_commands' });

        // Cadena recibida desde el contexto
        const cadenaRecibida = scriptContext.servcomentario;

        // Extraer los números de la cadena recibida
        const numerosEncontrados = cadenaRecibida.match(/\d{3}/g) || [];

        // Filtrar servicios y valores paralelos
        const serviciosFiltrados = serviciosCommandsText.filter((servicio, index) => {
          const numeroServicio = servicio.match(/\d{3}/)?.[0];
          return !numerosEncontrados.includes(numeroServicio);
        });

        const valoresFiltrados = serviciosCommands.filter((valor, index) => {
          const numeroServicio = serviciosCommandsText[index].match(/\d{3}/)?.[0];
          return !numerosEncontrados.includes(numeroServicio);
        });

        // Resultado final
        const resultado = {
          serviciosFiltrados,
          valoresFiltrados
        };
        // log.debug("--Resultado--", resultado);
        // Actualizar campos con los resultados filtrados
        fieldsToUpdate.custrecord_ht_ot_servicios_commands = resultado.valoresFiltrados;
        fieldsToUpdate.custrecord_ht_ot_numero_puertas = scriptContext?.sensors || 0;
      }

      for (const [fieldId, value] of Object.entries(fieldsToUpdate)) {
        if (value || value === false || value === "") {
          openRecord.setValue({ fieldId, value });
        }
      }

      if (!scriptContext.serie && !validarSerie(scriptContext)) {
        return JSON.stringify({
          results: [{ id: 0, mensaje: "Serie Incorrecta" }],
        });
      }

      openRecord.setValue({
        fieldId: "custrecord_ht_ot_estado",
        value: CHEQUEADO,
      });

      // openRecord.setValue({                   // Test
      //   fieldId: "custrecord_ht_ot_subsidiary",
      //   value: "2",
      // });

      log.debug("Open Record OT", openRecord);
      let idOT = openRecord.save();
      log.debug("results", [{ id: idOT, mensaje: "ORDEN ACTUALIZADA CON EXITO" }]);
      return JSON.stringify({
        results: [{ id: idOT, mensaje: "ORDEN ACTUALIZADA CON EXITO" }],
      });
    } catch (error) {
      log.debug("Error al procesar la orden de trabajo", { error: error.message, stack: error.stack, errorG: error });
      return JSON.stringify({
        results: [{ id: 0, mensaje: "Error al procesar la orden de trabajo" + "-" + error.message }],
      });
    }
  };

  const validarSerie = (scriptContext) => {
    try {
      let data = ValidarOrdenTrabajo(scriptContext.idordentrabajo);
      if (data === scriptContext.serie) {
        log.debug("Serie Correcta", data);
        return true;
      } else {
        log.debug("Serie Incorrecta", data);
        return false;
      }
    } catch (error) {
      log.error("Error al validar la orden de trabajo", error);
      return false;
    }
  };

  const ValidarOrdenTrabajo = (idOrdenTrabajo) => {
    let openRecord = record.load({
      type: HT_ORDEN_TRABAJO_RECORD,
      id: idOrdenTrabajo,
      isDynamic: true,
    });
    return openRecord.getText({
      fieldId: "custrecord_ht_ot_serieproductoasignacion",
    });
  };

  return { post: _post };
});
