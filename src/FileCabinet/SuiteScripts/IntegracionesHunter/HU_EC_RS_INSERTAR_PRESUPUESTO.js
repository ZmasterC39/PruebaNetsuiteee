/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/search", "N/record", "N/query"], (
  log,
  search,
  record,
  query
) => {
  const _post = (requestBody) => {
    try {
      switch (requestBody.opcion) {
        case "1":
          log.debug("requestBody", requestBody);
          let result_id = insertarRegistro(requestBody);
          log.debug("result_id", result_id);
          return { result: [{ id: result_id }] };
        case "2":
          // busqueda guarda a mi entidad
          let eliminado = eliminarRegistro(requestBody);
          log.debug("eliminado", eliminado);
          return eliminado;
      }
    } catch (e) {
      log.error("Error en get", e);
    }
  };

  const insertarRegistro = (requestBody) => {
    try {
      const logRecord = record.create({
        type: "customrecord_presupuesto_netsuite",
        isDynamic: true,
      });

      logRecord.setValue(
        "custrecord_codigo_sucursal_net",
        requestBody.codigo_sucursal
      );
      logRecord.setValue("custrecord_sucursal_net", requestBody.sucursal);
      logRecord.setValue("custrecord_transaccion_net", requestBody.transaccion);
      logRecord.setValue("custrecord_valor_net", requestBody.valor);
      logRecord.setValue(
        "custrecord_division_presupuesto_net",
        requestBody.division_presupuesto
      );
      logRecord.setValue("custrecord_operacion_net", requestBody.operacion);
      logRecord.setValue("custrecord_region_net", requestBody.region);
      logRecord.setValue("custrecord_anio_net", requestBody.anio);
      logRecord.setValue("custrecord_mes_net", requestBody.mes);
      logRecord.setValue("custrecord_trimestre_net", requestBody.trimestre);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
    } catch (error) {
      log.error("Error al crearRegistroPresupuestoNetsuite", {
        error: error.message,
        stack: error.stack,
      });
      return 0;
    }
  };

  const eliminarRegistro = (requestBody) => {
    try {
      let { anio, mes } = requestBody;
      log.debug("a m ", anio + " - " + mes);
      var searchObj = search.create({
        type: "customrecord_presupuesto_netsuite",
        filters: [
          ["custrecord_anio_net", "equalto", anio],
          "AND",
          ["custrecord_mes_net", "equalto", mes],
        ],
        columns: [search.createColumn({ name: "id", label: "ID" })],
      });

      var results = [];
      searchObj.run().each(function (result) {
        // Procesar cada resultado y almacenar la información relevante
        results.push({
          recordid: result.getValue({ name: "id" }), // Obtener el valor del campo 'recordid'
        });
        return true; // Continuar iterando sobre los resultados
      });

      for (var i = 0; i < results.length; i++) {
        record.delete({
          type: "customrecord_presupuesto_netsuite",
          id: results[i].recordid,
          isDynamic: true,
        });
      }

      // Devolver los resultados en formato JSON
      return {
        eliminado: true,
        anio,
        mes,
        data: results,
      };
    } catch (error) {
      log.debug("error", error);
    }
  };

  return {
    post: _post,
  };
});
