/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/search", 'N/record', 'N/email', "N/query"], (log, search, record, email, query) => {

  /**
   * TODO: Const Globales.
   */
  const HT_ORDEN_TRABAJO_RECORD = "customrecord_ht_record_ordentrabajo";
  const VENTA = 7;
  const PROCESANDO = 4;
  const PRUEBACHEQUEADA = 2;

  // TODO: Acciones
  const RECEPCION = 'recepcion';
  const ACTUALIZAR = 'actualizar';

  const _get = (scriptContext) => {
    try {
      const filter = [["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"], "AND", ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"], "AND", ["custrecord_ht_ot_orden_servicio.custbody_ht_os_aprobacionventa", "anyof", "1"], "AND", ["custrecord_ht_ot_orden_servicio.custbody_ht_os_aprobacioncartera", "anyof", "1"]];

      // TODO: Busqueda Asignacion
      if (scriptContext.accion === "asignacion") {

        log.debug("Caso asignacion", scriptContext);

        // Validar si se debe agregar el filtro de estado de la OT
        if (scriptContext?.ordenservicio) { scriptContext.ordenservicio = asegurarPrefijoOS(scriptContext?.ordenservicio); }

        const { desde, hasta, ordenservicio, idtaller, identificacion } = scriptContext;

        if (scriptContext?.ordenservicio == "OS") {
          return JSON.stringify({ results: [] });
        }

        // TODO: filtros de la OT
        if (desde && hasta) {
          let newdesde = desde.replace(/-/g, "/");
          let newhasta = hasta.replace(/-/g, "/");
          filter.push("AND", ["custrecord_ht_ot_orden_servicio.trandate", "within", newdesde, newhasta]);
        }

        if (ordenservicio && ordenservicio.trim() !== "") {
          // filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);    
          try {
            let idorservicio = getOrdenService(ordenservicio);
            if (idorservicio && idorservicio.length > 0) {
              filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio])
            } else {
              filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            }
          } catch (error) {
            filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            log.debug("--", error)
          }
        }

        if (idtaller && idtaller.trim() !== "") {
          filter.push("AND", ["custrecord_ht_ot_taller", "anyof", idtaller]);
        }

        if (identificacion && identificacion !== 0 && identificacion.trim() !== "") {
          const identificacionResult = buscarPorIdentificacion(identificacion);

          if (identificacionResult && identificacionResult.length > 0) {
            filter.push("AND", ["custrecord_ht_ot_cliente_id", "anyof", identificacionResult]);
          }
        }

        // if (scriptContext.recepcionada === "false") {filter.push("AND", ["custrecord_ht_ot_estado", "anyof", VENTA, PROCESANDO]);} // ! Cambio Venta 10/09/2024
        if (scriptContext.recepcionada == ("false" || false)) { filter.push("AND", ["custrecord_ht_ot_estado", "anyof", VENTA]); }

        // TODO: Busqueda de la OT
        const mySearch = search.create({
          type: HT_ORDEN_TRABAJO_RECORD,
          filters: filter,
          columns: [
            createColumn("internalid", null, "GROUP", "Internal ID"),
            createColumn("internalid", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "ID interno"),
            createColumn("custrecord_ht_ot_orden_serivicio_txt", null, "GROUP", "HT OT Orden de Servicio TXT"),
            createColumn("name", null, "GROUP", "ID", "ASC"),
            createColumn("custrecord_ht_ot_cliente_id", null, "GROUP", "Cliente"),
            createColumn("custrecord_ht_ot_vehiculo", null, "GROUP", "HT OT ID Vehículo"),
            createColumn("custrecord_ht_ot_taller", null, "GROUP", "Taller"),
            createColumn("custrecord_ht_ot_comentariofinalizacion", null, "GROUP", "Comentario"),
            createColumn("custrecord_ht_ot_observacion", null, "GROUP", "Comentario Técnico"),
            createColumn("custrecord_ht_ot_tecnicoasignacion", null, "GROUP", "Técnico"),
            createColumn("custrecord_ht_ot_fueraciudad", null, "GROUP", "Fuera Ciudad"),
            createColumn("custrecord_ht_ot_fuerataller", null, "GROUP", "Fuera taller"),
            createColumn("custrecordht_ot_tipo_agrupacion", null, "GROUP", "Producto"),
            createColumn("custrecord_ht_ot_tipo_trabajo", null, "GROUP", "Tipo Trabajo"),
            createColumn("altname", "CUSTRECORD_HT_OT_CLIENTE_ID", "GROUP", "Name"),
            createColumn("altname", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Name"),
            createColumn("custbody_ht_os_consideracion", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "Consideracion"),
            createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
            createColumn("custrecord_ht_ot_direccioncliente", null, "GROUP", "Dirección del Cliente"),
            createColumn("custrecord_ht_ot_correocliente", null, "GROUP", "Correo del Cliente"),
            createColumn("custrecord_ht_ot_telefonocliente", null, "GROUP", "Teléfono del Cliente"),
            createColumn("custrecord_ht_ot_motor", null, "GROUP", "Motor"),
            createColumn("custrecord_ht_ot_chasis", null, "GROUP", "Chasis"),
            createColumn("custrecord_ht_ot_placa", null, "GROUP", "Placa"),
            createColumn("custrecord_ht_ot_color", null, "GROUP", "Color"),
            createColumn("custrecord_ht_ot_marca", null, "GROUP", "Marca"),
            createColumn("custrecord_ht_ot_modelobien", null, "GROUP", "Modelo"),
            createColumn("custrecord_ht_ot_version", null, "GROUP", "Versión"),
            createColumn("custrecord_ht_bien_ano", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Anio"),
            createColumn("custrecord_ht_ot_item", null, "GROUP", "Marca"),
          ],
        });

        // TODO: Obtener valores de la busqueda de la OT
        let myPagedData = mySearch.runPaged();

        let results = [];

        myPagedData.pageRanges.forEach(function (pageRange) {
          var myPage = myPagedData.fetch({ index: pageRange.index });
          myPage.data.forEach(function (result) {

            // 1. Obtener el id del cliente
            let clienteid = result.getValue({ name: "custrecord_ht_ot_cliente_id", summary: "GROUP", label: "Cliente" });

            // 2. Obtener la identificacion del cliente
            let lookupFieldsvatregnumber = "";
            try {
              lookupFieldsvatregnumber = search.lookupFields({ type: "customer", id: clienteid, columns: ["vatregnumber"] });
              lookupFieldsvatregnumber = lookupFieldsvatregnumber.vatregnumber.length ? lookupFieldsvatregnumber.vatregnumber : "";
            } catch (error) { }

            // 3. Obtener el id de la orden de servicio
            let idOrdenServic = getValueOrEmpty(result, { name: "internalid", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP" });

            // 4. Obtener los datos de la orden de servicio
            let DataOrdenService = getBuscarOrdenService(idOrdenServic);

            // 5. Obtener lugar de la sucursal
            let location = DataOrdenService[4] || "";

            // 6. Obtener Subsidiaria
            let subsidiary = DataOrdenService[5] || "";

            // 7. Obtener bien (Vehiculo)
            let bien = DataOrdenService[0] || "";

            // 8. Obtener la subsidiaria id
            let subsidiaryid = DataOrdenService[6] || "";

            // 9. Obtener el memo
            let memo = DataOrdenService[7] || "";

            // 10. Obtener la ubicacion de la sucursal
            let locationid = DataOrdenService[8] || "";

            // 11. Obtener el id del item
            let idItem = getValueOrEmpty(result, { name: "custrecord_ht_ot_item", summary: "GROUP" });

            // Informacion de la etiqueta TTR
            // let TTR = obtenerParametrosItems(idItem, "118")[0]?.valor || "";
            let TTR = obtenerParametrosItems(idItem, "188")[0]?.valor || "";

            // let TTR = obtenerParametrosItems(idItem, "118")[0]?.valor || "";
            let FAM = obtenerParametrosItems(idItem, "130")[0]?.valor ? obtenerParametrosItems(idItem, "130")[0]?.valor.split(" - ")[0] : "";

            // 12. Obtener informacion del item
            let dataItem = obtenerItemRelacionado(idItem);

            // 13. Obtener el id del taller
            let idTaller = getValueOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP" });

            // 14. Obtener la ciudad del taller
            let ciudadtaller = buscarPorTaller(idTaller) || "Guayaquil";

            // 4. Obtener turno 
            let tallerTarea = buscarTarea(idOrdenServic);

            if (tallerTarea) {
              results.push({
                idOrdenTrabajo: getValueOrEmpty(result, { name: "internalid", summary: "GROUP" }),
                idOrdenServicio: idOrdenServic,
                ordenservicio: getValueOrEmpty(result, { name: "custrecord_ht_ot_orden_serivicio_txt", summary: "GROUP" }),
                ordenTrabajo: getValueOrEmpty(result, { name: "name", summary: "GROUP" }),
                estadoOT: getTextOrEmpty(result, { name: "custrecord_ht_ot_estado", summary: "GROUP" }),
                sucursal: location,
                sucursalid: locationid,
                idCliente: getValueOrEmpty(result, { name: "custrecord_ht_ot_cliente_id", summary: "GROUP" }),
                identificacion: lookupFieldsvatregnumber,
                cliente: getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }) ? getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }).replace(/"/g, "") : "",
                direccion: getValueOrEmpty(result, { name: "custrecord_ht_ot_direccioncliente", summary: "GROUP" }),
                correo: getValueOrEmpty(result, { name: "custrecord_ht_ot_correocliente", summary: "GROUP" }),
                telefono: getValueOrEmpty(result, { name: "custrecord_ht_ot_telefonocliente", summary: "GROUP" }),
                idVehiculo: getValueOrEmpty(result, { name: "custrecord_ht_ot_vehiculo", summary: "GROUP" }),
                vehiculo: (getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_VEHICULO", summary: "GROUP" }))?.slice(0, 110) || "",
                motor: getValueOrEmpty(result, { name: "custrecord_ht_ot_motor", summary: "GROUP" }),
                chasis: getValueOrEmpty(result, { name: "custrecord_ht_ot_chasis", summary: "GROUP" }),
                placa: getValueOrEmpty(result, { name: "custrecord_ht_ot_placa", summary: "GROUP" }),
                color: getTextOrEmpty(result, { name: "custrecord_ht_ot_color", summary: "GROUP" }),
                marca: getTextOrEmpty(result, { name: "custrecord_ht_ot_marca", summary: "GROUP" }),
                modelo: getTextOrEmpty(result, { name: "custrecord_ht_ot_modelobien", summary: "GROUP" }),
                version: getValueOrEmpty(result, { name: "custrecord_ht_ot_version", summary: "GROUP" }),
                anioVehiculo: getValueOrEmpty(result, { name: "custrecord_ht_bien_ano", join: "CUSTRECORD_HT_OT_VEHICULO", summary: "GROUP" }),
                idTaller: idTaller,
                Taller: getTextOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP", label: "Taller" }) || "SIN ASIGNAR",
                ciudad: ciudadtaller,
                comentarioOS: memo,
                observacion: getValueOrEmpty(result, { name: "custrecord_ht_ot_observacion", summary: "GROUP" }),
                idtecnico: getValueOrEmpty(result, { name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", }),
                tecnico: getTextOrEmpty(result, { name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", }),
                fueraCiudad: getValueOrEmpty(result, { name: "custrecord_ht_ot_fueraciudad", summary: "GROUP", }),
                fueraTaller: getValueOrEmpty(result, { name: "custrecord_ht_ot_fuerataller", summary: "GROUP", }),
                tipoTrabajo: TTR,
                producto: getTextOrEmpty(result, { name: "custrecordht_ot_tipo_agrupacion", summary: "GROUP" }),
                consideracion: getValueOrEmpty(result, { name: "custbody_ht_os_consideracion", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP", }),
                codigoVehiculo: bien,
                empresa: subsidiary,
                empresaid: subsidiaryid == "2" ? "001" : "",
                lugar: ciudadtaller + ", " + obtenerFechaFormateada(),
                categoria: "",
                item: dataItem[0]?.nombreItem || "",
                fecha: obtenerFechaFormateada(),
                auditoria: generarFechaActual(),
                familia: FAM,
              });
            } else {
              log.debug("Info", "Sin turno la siguiente os " + idOrdenServic)
              results = [];
            }


          });
        });

        // TODO: Log de resultados
        log.debug("Caso asignacion fin", results);

        return JSON.stringify({ results: results });
      } // Fin de la busqueda asignacion

      // TODO: Busqueda Supervisor
      if (scriptContext.opcion === "1") {

        log.debug("Caso supervisor", scriptContext);

        // Validacion y correcion del prefijo de la OT
        if (scriptContext?.ordenservicio) {
          scriptContext.ordenservicio = asegurarPrefijoOS(scriptContext?.ordenservicio);
        }

        const { desde, hasta, ordenservicio, idtaller, recepcionada } = scriptContext;

        // TODO: filtros de la OT
        if (ordenservicio && ordenservicio.trim() !== "" && ordenservicio != "OS0") {
          try {
            log.debug("ordenservicio", ordenservicio);
            let idorservicio = getOrdenService(ordenservicio);
            log.debug("id orden servicio", idorservicio);
            if (idorservicio && idorservicio.length > 0) {
              filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio])
            } else {
              filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            }
          } catch (error) {
            filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            log.debug("--", error)
          }

          if (recepcionada == "false") {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", VENTA, PROCESANDO]);
          } else {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PROCESANDO]);
          }
        } else {
          if (desde && hasta) {
            let newdesde = desde.replace(/-/g, "/");
            let newhasta = hasta.replace(/-/g, "/");
            filter.push("AND", ["custrecord_ht_ot_orden_servicio.trandate", "within", newdesde, newhasta]);
          }

          if (idtaller && idtaller.trim() !== "") {
            filter.push("AND", ["custrecord_ht_ot_taller", "anyof", idtaller]);
          }

          log.debug("recepcionada", recepcionada);

          if (recepcionada == "false") {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", VENTA, PROCESANDO]);
          } else {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PROCESANDO]);
          }
        }

        log.debug("Filtros", filter);

        // TODO: Busqueda de la OT
        const mySearch = search.create({
          type: HT_ORDEN_TRABAJO_RECORD,
          filters: filter,
          columns: [
            createColumn("custrecord_ht_ot_cliente_id", null, "GROUP", "Cliente"),
            createColumn("internalid", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "ID interno"),
            createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
            createColumn("custrecord_ht_ot_taller", null, "GROUP", "Taller"),
            createColumn("custrecord_ht_ot_fueraciudad", null, "GROUP", "Fuera Ciudad"),
            createColumn("custrecord_ht_ot_fuerataller", null, "GROUP", "Fuera taller"),
            createColumn("custrecord_ht_ot_vehiculo", null, "GROUP", "HT OT ID Vehículo"),
            createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
            createColumn("custrecord_ht_ot_orden_serivicio_txt", null, "GROUP", "HT OT Orden de Servicio TXT"),
            createColumn("altname", "CUSTRECORD_HT_OT_CLIENTE_ID", "GROUP", "Name"),
            createColumn("internalid", null, "GROUP", "Internal ID"),
            createColumn("name", null, "GROUP", "ID", "ASC"),
            createColumn("altname", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Name"),
            createColumn("custrecordht_ot_tipo_agrupacion", null, "GROUP", "Producto"),
            createColumn("custrecord_ht_ot_tecnicoasignacion", null, "GROUP", "Técnico"),
            createColumn("custbody_ht_os_consideracion", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "Consideracion"),
            createColumn("custrecord_ht_ot_observacion", null, "GROUP", "Comentario Técnico"),
            createColumn("status", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "status"),
          ],
        });

        let results = [];

        // TODO: Obtener valores de la busqueda de la OT
        let myPagedData = mySearch.runPaged();
        myPagedData.pageRanges.forEach(function (pageRange) {
          var myPage = myPagedData.fetch({ index: pageRange.index });
          myPage.data.forEach(function (result) {

            // 1. Obtener el id del cliente
            let clienteid = result.getValue({ name: "custrecord_ht_ot_cliente_id", summary: "GROUP", label: "Cliente" });

            // 2. Obtener la identificacion del cliente
            let lookupFieldsvatregnumber = "";
            try {
              lookupFieldsvatregnumber = search.lookupFields({ type: "customer", id: clienteid, columns: ["vatregnumber"] });
              lookupFieldsvatregnumber = lookupFieldsvatregnumber.vatregnumber.length ? lookupFieldsvatregnumber.vatregnumber : "";
            } catch (error) { }

            // 3. Obtener el id de la orden de servicio
            let idOrdenServic = getValueOrEmpty(result, { name: "internalid", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP" });

            // 4. Obtener los datos de la orden de servicio
            let tallerTarea = buscarTarea(idOrdenServic);

            // ! Doas - 19/03/2026  // OS en estado cerrado no debe de ver supervisor ya que signa y no se visualiza
            let estadoOS = result.getText({ name: "status", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP", label: "Estado" });

            //log.debug("--estadoOT", estadoOS)

            // 5. Validar si la OT tiene una tarea asignada
            if (tallerTarea && estadoOS != "Cerrada" && estadoOS != "Cancelada") {

              // 6. Obtener los datos de la orden de servicio
              let DataOrdenService = getBuscarOrdenService(idOrdenServic);

              // 7. Obtener Item de la orden de servicio
              let newitem = getValueOrEmpty(result, {
                name: "custrecord_ht_ot_item",
                summary: "GROUP",
              });
              // let ADP = obtenerParametrosItems(newitem, "104")[0]?.valor || "";
              let ADP = obtenerParametrosItems(newitem, "109")[0]?.valor || "";

              // 8. Obtener bien (Vehiculo)
              let bien = DataOrdenService[0] || "";

              // 9. Obtener concesionario
              let concesionario = DataOrdenService[10] || "";

              // 10. Obtener fecha de la orden de servicio
              let fecha = DataOrdenService[11] || "";

              // 11. Obtener el id del taller
              let idTaller = getValueOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP" });

              // 12. Obtener la ciudad del taller
              let ciudadtaller = buscarPorTaller(idTaller);

              // 13. Obtener si esta fuera de la ciudad o del taller
              let fueraCiudadNew = getValueOrEmpty(result, { name: "custrecord_ht_ot_fueraciudad", summary: "GROUP" });
              let fueraTallerNew = getValueOrEmpty(result, { name: "custrecord_ht_ot_fuerataller", summary: "GROUP" });

              // 15. Obtener el id del item
              let idItem = getValueOrEmpty(result, { name: "custrecord_ht_ot_item", summary: "GROUP" });

              // let TTR = obtenerParametrosItems(idItem, "118")[0]?.valor || "";
              let TTR = obtenerParametrosItems(idItem, "188")[0]?.valor || "";

              // let TTR = obtenerParametrosItems(idItem, "118")[0]?.valor || "";
              let FAM = obtenerParametrosItems(idItem, "130")[0]?.valor ? obtenerParametrosItems(idItem, "130")[0]?.valor.split(" - ")[0] : "";

              results.push({
                idVehiculo: getValueOrEmpty(result, { name: "custrecord_ht_ot_vehiculo", summary: "GROUP" }),
                idOrdenServicio: idOrdenServic,
                estadoOT: getTextOrEmpty(result, { name: "custrecord_ht_ot_estado", summary: "GROUP" }),
                ordenservicio: getValueOrEmpty(result, { name: "custrecord_ht_ot_orden_serivicio_txt", summary: "GROUP" }),
                idCliente: getValueOrEmpty(result, { name: "custrecord_ht_ot_cliente_id", summary: "GROUP" }),
                identificacion: lookupFieldsvatregnumber,
                cliente: getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }) ? getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }).replace(/"/g, "") : "",
                idOrdenTrabajo: getValueOrEmpty(result, { name: "internalid", summary: "GROUP" }),
                ordenTrabajo: getValueOrEmpty(result, { name: "name", summary: "GROUP" }),
                tipoTrabajo: ADP,
                codigoVehiculo: bien,
                vehiculo: (getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_VEHICULO", summary: "GROUP" }))?.slice(0, 110) || "",
                idTurno: tallerTarea?.idTarea || "",
                turno: tallerTarea?.titulo || "",
                horaTurno: tallerTarea?.hora || "",
                fecha: obtenerFechaFormateadaRegistro(fecha),
                idTaller: idTaller,
                Taller: getTextOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP", label: "Taller" }) || "SIN ASIGNAR",
                ciudad: ciudadtaller,
                producto: TTR,
                idtecnico: result.getValue({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }) || "0",
                tecnico: result.getText({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }) == '- None -' ? 'SIN ASIGNAR' : result.getText({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }),
                grupo: "",
                fueraCiudad: fueraCiudadNew ? "S" : "N",
                fueraTaller: fueraTallerNew ? "S" : "N",
                consideracion: getValueOrEmpty(result, { name: "custbody_ht_os_consideracion", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP", }),
                comentario: result.getValue({ name: "custrecord_ht_ot_observacion", summary: "GROUP" }) == '- None -' ? '' : result.getValue({ name: "custrecord_ht_ot_observacion", summary: "GROUP" }),
                motivo: "",
                concesionario: concesionario,
                familia: FAM,
              });
            }
          });
        });

        // TODO: Log de resultados
        log.debug("Caso supervisor fin", results);

        return JSON.stringify({ results: results });
      } // Fin de la busqueda supervisor

      // TODO: Busqueda Empleado
      if (scriptContext.opcion === "2") {

        log.error("Caso empleado", scriptContext);

        if (scriptContext?.ordenservicio) { scriptContext.ordenservicio = asegurarPrefijoOS(scriptContext?.ordenservicio) }

        const { desde, hasta, ordenservicio, idtaller, recepcionada, idtecnico } = scriptContext;

        // TODO: filtros de la OT
        if (ordenservicio && ordenservicio.trim() !== "" && ordenservicio != "OS0" && ordenservicio != "0") {
          //filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
          try {
            let idorservicio = getOrdenService(ordenservicio);
            if (idorservicio && idorservicio.length > 0) {
              filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio])
            } else {
              filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            }
          } catch (error) {
            filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
            log.debug("--", error)
          }


          if (true) {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PROCESANDO]);
            //filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PRUEBACHEQUEADA, PROCESANDO]);
          }
        } else {
          if (desde && hasta) {
            let newdesde = desde.replace(/-/g, "/");
            let newhasta = hasta.replace(/-/g, "/");
            filter.push("AND", ["custrecord_ht_ot_orden_servicio.trandate", "within", newdesde, newhasta]);
          }
          if (idtaller && idtaller.trim() !== "") {
            filter.push("AND", ["custrecord_ht_ot_taller", "anyof", idtaller]);
          }
          if (true) {
            filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PROCESANDO]);
            //filter.push("AND", ["custrecord_ht_ot_estado", "anyof", PRUEBACHEQUEADA, PROCESANDO]);
          }
          if (idtecnico && idtecnico.trim() !== "") {
            //custrecord_ht_ot_tecnicoasignacion
            filter.push("AND", ["custrecord_ht_ot_tecnicoasignacion", "anyof", idtecnico]);
          }
        }

        // TODO: Busqueda de la OT
        const mySearch = search.create({
          type: HT_ORDEN_TRABAJO_RECORD,
          filters: filter,
          columns: [
            createColumn("custrecord_ht_ot_cliente_id", null, "GROUP", "Cliente"),
            createColumn("internalid", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "ID interno"),
            createColumn("status", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "status"),
            createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
            createColumn("custrecord_ht_ot_taller", null, "GROUP", "Taller"),
            createColumn("custrecord_ht_ot_item", null, "GROUP", "Marca"),
            createColumn("custrecord_ht_ot_orden_serivicio_txt", null, "GROUP", "HT OT Orden de Servicio TXT"),
            createColumn("altname", "CUSTRECORD_HT_OT_CLIENTE_ID", "GROUP", "Name"),
            createColumn("internalid", null, "GROUP", "Internal ID"),
            createColumn("name", null, "GROUP", "ID", "ASC"),
            createColumn("custrecord_ht_ot_vehiculo", null, "GROUP", "HT OT ID Vehículo"),
            createColumn("altname", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Name"),
            createColumn("custrecordht_ot_tipo_agrupacion", null, "GROUP", "Producto"),
            createColumn("custrecord_ht_ot_tecnicoasignacion", null, "GROUP", "Técnico"),
            createColumn("custrecord_ht_ot_observacion", null, "GROUP", "Comentario Técnico"),
          ],
        });

        let results = [];
        let myPagedData = mySearch.runPaged();
        myPagedData.pageRanges.forEach(function (pageRange) {
          var myPage = myPagedData.fetch({ index: pageRange.index });
          myPage.data.forEach(function (result) {

            // 1. Obtener el id del cliente
            let clienteid = result.getValue({ name: "custrecord_ht_ot_cliente_id", summary: "GROUP", label: "Cliente" });

            // 2. Obtener la identificacion del cliente
            let lookupFieldsvatregnumber = "";
            try {
              lookupFieldsvatregnumber = search.lookupFields({ type: "customer", id: clienteid, columns: ["vatregnumber"] });
              lookupFieldsvatregnumber = lookupFieldsvatregnumber.vatregnumber.length ? lookupFieldsvatregnumber.vatregnumber : "";
            } catch (error) { }

            // 3. Obtener el id de la orden de servicio
            let idOrdenServic = getValueOrEmpty(result, { name: "internalid", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP" });

            // 4. Obtener los datos del taller
            //let tallerTarea = buscarTarea(idOrdenServic);
            let tallerTarea = true;
            // 5. Obtener el estado de la orden de servicio
            let estadoOS = result.getText({ name: "status", join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO", summary: "GROUP", label: "Estado" });

            // 6. Obtener el estado de la orden de trabajo
            let estadoOT = getTextOrEmpty(result, { name: "custrecord_ht_ot_estado", summary: "GROUP" });

            // 7. Validar si la OT esta recepcionada
            let recepcionado = false;
            if (estadoOT == "O - PROCESANDO") {

              // recepcionado = true;
              try {
                let recepcionTablet = validarProcesoRecepcionTable(idOrdenServic);
                log.debug("-----------------recepcionTablet", recepcionTablet);
                recepcionado = recepcionTablet ? true : false;
              } catch (error) {
                log.debug("-----------------Error validando recepcion en tablet", error.stack);
              }

            }

            // 8. Validar si la OT tiene una tarea asignada
            if (tallerTarea && estadoOS != "Cerrada" && estadoOS != "Cancelada") {

              // 9. Obtener los datos de la orden de servicio
              let DataOrdenService = getBuscarOrdenService(idOrdenServic);

              // 10. Obtener bien (Vehiculo)
              let bien = DataOrdenService[0] || "";

              // 11. Obtener concesionario
              let concesionario = DataOrdenService[10] || "";

              // 12. Obtener fecha de la orden de servicio
              let fecha = DataOrdenService[11] || "";

              // 13. Obtener el id del taller
              let idTaller = getValueOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP" });

              // 14. Obtener la ciudad del taller
              let ciudadtaller = buscarPorTaller(idTaller);

              // 15. Obtener el id del item
              let idItem = getValueOrEmpty(result, { name: "custrecord_ht_ot_item", summary: "GROUP" });

              // 16. Informacion de la etiqueta ADP
              // let ADP = obtenerParametrosItems(idItem, "104")[0]?.valor || "";
              let ADP = obtenerParametrosItems(idItem, "109")[0]?.valor || "";

              // let TTR = obtenerParametrosItems(idItem, "118")[0]?.valor || "";
              let TTR = obtenerParametrosItems(idItem, "188")[0]?.valor || "";

              let FAM = obtenerParametrosItems(idItem, "130")[0]?.valor ? obtenerParametrosItems(idItem, "130")[0]?.valor.split(" - ")[0] : "";

              results.push({
                idOrdenServicio: idOrdenServic,
                ordenservicio: getValueOrEmpty(result, { name: "custrecord_ht_ot_orden_serivicio_txt", summary: "GROUP" }),
                estadoOS: estadoOS,
                idCliente: getValueOrEmpty(result, { name: "custrecord_ht_ot_cliente_id", summary: "GROUP" }),
                identificacion: lookupFieldsvatregnumber,
                cliente: getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }) ? getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_CLIENTE_ID", summary: "GROUP" }).replace(/"/g, "") : "",
                idOrdenTrabajo: getValueOrEmpty(result, { name: "internalid", summary: "GROUP" }),
                ordenTrabajo: getValueOrEmpty(result, { name: "name", summary: "GROUP" }),
                estadoOT: estadoOT,
                tipoTrabajo: ADP,
                idVehiculo: getValueOrEmpty(result, { name: "custrecord_ht_ot_vehiculo", summary: "GROUP" }),
                codigoVehiculo: bien,
                vehiculo: (getValueOrEmpty(result, { name: "altname", join: "CUSTRECORD_HT_OT_VEHICULO", summary: "GROUP" }))?.slice(0, 110) || "",
                idTurno: tallerTarea?.idTarea || "",
                turno: tallerTarea?.titulo || "",
                horaTurno: tallerTarea?.hora || "",
                fecha: obtenerFechaFormateadaRegistro(fecha),
                idTaller: idTaller,
                Taller: getTextOrEmpty(result, { name: "custrecord_ht_ot_taller", summary: "GROUP", label: "Taller" }) || "SIN ASIGNAR",
                ciudad: ciudadtaller,
                producto: TTR,
                idtecnico: result.getValue({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }),
                tecnico: result.getText({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }) == '- None -' ? 'SIN ASIGNAR' : result.getText({ name: "custrecord_ht_ot_tecnicoasignacion", summary: "GROUP", label: "Técnico" }),
                concesionario: concesionario,
                estado: "",
                motivo: "",
                comentario: result.getValue({ name: "custrecord_ht_ot_observacion", summary: "GROUP" }) == '- None -' ? '' : result.getValue({ name: "custrecord_ht_ot_observacion", summary: "GROUP" }),
                recepcionado: recepcionado,
                familia: FAM,
              });
            }
          });
        });

        // TODO: Log de resultados
        log.debug("Caso empleado fin", results);

        return JSON.stringify({ results: results });
      } // Fin de la busqueda empleado

      return JSON.stringify({ results: [] });
    } catch (error) {
      log.debug("Response error", { error: error.message, stack: error.stack });  // TODO: Log error
      return JSON.stringify({ results: [] });
    }
  };

  const _post = (scriptContext) => {

    let accion = "";
    let respuesta = { id: 0, mensaje: "Error" };
    try {
      accion = scriptContext?.accion?.toLowerCase() || null;

      switch (accion) {
        // TODO: Recepcion
        case RECEPCION:
          log.debug("Recepcion-", scriptContext);

          // Validar si la orden de servicio existe
          let dataOS = getBuscarOrdenService(scriptContext.idOrdenServicio);

          if (dataOS.length === 0) {
            respuesta = { id: 0, mensaje: "No se encontró la orden de servicio" };
            break;
          }

          log.debug("Recepcion-DataOS", dataOS);

          if (dataOS[12] != "1" || dataOS[13] != "1") {
            respuesta = { id: 0, mensaje: "No se puede recepcionar la orden de servicio, verificar estado de aprobación y cartera" };
            break;
          }

          // TODO: Obtener el numero de la orden de servicio
          let numeroOS = dataOS[9];

          // TODO: Generar Evento de Recepción
          let accesoriosEstado = { "RADIO": false, "PERILLAS": false, "TAPA COMB.": false, "ALFOMBRA DE PISO": false, "AIRE ACOND.": false, "BRAZOS Y PLUMAS": false, "MASCARILLAS": false, "CENICERO": false, "CHICOTES": false, "LUCES PARQUEO": false, "TOPES DE PUERTAS": false, "VIDRIOS Y SEGUROS": false, "MOQUETAS": false, "MANUAL RADIO": false, "PALANCA": false, "ENCENDEDOR": false, "ESPEJO INTERIOR": false, "ESPEJO EXT.": false, "VENT./CALEF": false, "TAPA CUBOS": false, "PARLANTES": false, "ANTENA": false, "MANUAL CARRO": false, "LLANTA DE EMERG.": false, "LUCES Y FAROS": false, "MICAS DE LUCES": false, "CABECERA": false, "HERRAMIENTAS": false, "GATA": false, "LLAVE RUEDA": false };

          for (let accesorio of scriptContext.accesorios) {
            if (accesoriosEstado.hasOwnProperty(accesorio.attribute)) {
              accesoriosEstado[accesorio.attribute] = true;
            }
          }

          // ! Se agrega validacion si la recpecion tiene un turno.
          let tallerTarea = buscarTarea(scriptContext.idOrdenServicio);
          if (!tallerTarea) {
            log.debug("Recepcion-fin", 0);
            respuesta = { id: 0, mensaje: "No se encontró el turno de la orden de servicio" };
            break;
          }

          // TODO: Crear el evento de recepcion
          let openRecord = record.create({ type: record.Type.CALENDAR_EVENT, isDynamic: true })

          const fieldsToSet = [
            { fieldId: "organizer", value: scriptContext.recepcionador },
            { fieldId: "custevent_ht_turno_creado_por", value: scriptContext.tecnico },
            { fieldId: "title", value: "Recep: " + numeroOS },
            { fieldId: "startdate", value: new Date() },
            { fieldId: "timedevent", value: false },
            { fieldId: "custevent_ht_rc_nombreentrega", value: scriptContext?.entregaa },
            { fieldId: "custevent_ht_rc_nombrerecibe", value: scriptContext?.recibea },
            { fieldId: "custevent_ht_rc_correorecepcion", value: scriptContext?.correo },
            { fieldId: "message", value: scriptContext?.comentario },
            { fieldId: 'company', value: scriptContext?.customer },
            { fieldId: 'transaction', value: scriptContext?.idOrdenServicio },
            { fieldId: 'custevent_ht_rc_radio', value: accesoriosEstado.RADIO },
            { fieldId: 'custevent_ht_rc_perillas', value: accesoriosEstado.PERILLAS },
            { fieldId: 'custevent_ht_rc_tapacombustible', value: accesoriosEstado["TAPA COMB."] },
            { fieldId: 'custevent_ht_rc_alfombrapiso', value: accesoriosEstado["ALFOMBRA DE PISO"] },
            { fieldId: 'custevent_ht_rc_aireacondicionado', value: accesoriosEstado["AIRE ACOND."] },
            { fieldId: 'custevent_ht_rc_brazosplumas', value: accesoriosEstado["BRAZOS Y PLUMAS"] },
            { fieldId: 'custevent_ht_rc_mascarillas', value: accesoriosEstado.MASCARILLAS },
            { fieldId: 'custevent_ht_rc_cenicero', value: accesoriosEstado.CENICERO },
            { fieldId: 'custevent_ht_rc_chicotes', value: accesoriosEstado.CHICOTES },
            { fieldId: 'custevent_ht_rc_lucesparqueo', value: accesoriosEstado["LUCES PARQUEO"] },
            { fieldId: 'custevent_ht_rc_topespuertas', value: accesoriosEstado["TOPES DE PUERTAS"] },
            { fieldId: 'custevent_ht_rc_vidriosyseguros', value: accesoriosEstado["VIDRIOS Y SEGUROS"] },
            { fieldId: 'custevent_ht_rc_moquetas', value: accesoriosEstado.MOQUETAS },
            { fieldId: 'custevent_ht_rc_manualradio', value: accesoriosEstado["MANUAL RADIO"] },
            { fieldId: 'custevent_ht_rc_palanca', value: accesoriosEstado.PALANCA },
            { fieldId: 'custevent_ht_rc_encededor', value: accesoriosEstado.ENCENDEDOR },
            { fieldId: 'custevent_ht_rc_espejointerior', value: accesoriosEstado["ESPEJO INTERIOR"] },
            { fieldId: 'custevent_ht_rc_espejoexterior', value: accesoriosEstado["ESPEJO EXT."] },
            { fieldId: 'custevent_ht_rc_ventcalef', value: accesoriosEstado["VENT./CALEF"] },
            { fieldId: 'custevent_ht_rc_tapacubos', value: accesoriosEstado["TAPA CUBOS"] },
            { fieldId: 'custevent_ht_rc_parlantes', value: accesoriosEstado.PARLANTES },
            { fieldId: 'custevent_ht_rc_antena', value: accesoriosEstado.ANTENA },
            { fieldId: 'custevent_ht_rc_manualcarro', value: accesoriosEstado["MANUAL CARRO"] },
            { fieldId: 'custevent_ht_rc_llantaemergencia', value: accesoriosEstado["LLANTA DE EMERG."] },
            { fieldId: 'custevent_ht_rc_lucesyfaros', value: accesoriosEstado["LUCES Y FAROS"] },
            { fieldId: 'custevent_ht_rc_micasdeluces', value: accesoriosEstado["MICAS DE LUCES"] },
            { fieldId: 'custevent_ht_rc_cabecera', value: accesoriosEstado.CABECERA },
            { fieldId: 'custevent_ht_rc_herramientas', value: accesoriosEstado.HERRAMIENTAS },
            { fieldId: 'custevent_ht_rc_gata', value: accesoriosEstado.GATA },
            { fieldId: 'custevent_ht_rc_llaverueda', value: accesoriosEstado["LLAVE RUEDA"] },
            { fieldId: 'custevent_ht_rc_odometro', value: scriptContext?.odometro },
            { fieldId: 'custevent_ht_rc_cantidadllaves', value: scriptContext?.cantidadllaves },
            //  { fieldId: 'custevent_ht_rc_fechaentrega', value: new Date(scriptContext.fechaentrega) },
            { fieldId: 'custevent_ht_rc_novedades', value: scriptContext?.novedades },
            { fieldId: 'custevent_ht_rc_combustible', value: scriptContext?.combustible },
            { fieldId: 'custevent_ht_rc_cantidadcontroles', value: scriptContext?.cantidadcontroles },
            { fieldId: 'custevent_ht_rc_horaentrega', value: scriptContext?.horaentrega },
            { fieldId: 'accesslevel', value: 'PUBLIC' }
          ];

          fieldsToSet.forEach(({ fieldId, value }) => setFieldValueIfDefined(openRecord, fieldId, value));

          // TODO: Guardar el evento de recepción
          let idEvento = openRecord.save({
            enableSourcing: false,
            ignoreMandatoryFields: true
          });
          if (idEvento) {
            log.debug("Recepcion-fin", idEvento);
            respuesta = { id: idEvento, mensaje: "Exito" };
          } else {
            log.debug("Recepcion-fin", 0);
            respuesta = { id: 0, mensaje: "Error" };
          }
          break;

        // TODO: Actualizar
        case ACTUALIZAR:
          log.debug("Actualizar", scriptContext);

          if (scriptContext && scriptContext.idordentrabajo && scriptContext.idtecnico) {
            try {
              let openRecord = record.load({ type: HT_ORDEN_TRABAJO_RECORD, id: scriptContext.idordentrabajo, isDynamic: true });
              openRecord.setValue({ fieldId: "custrecord_ht_ot_tecnicoasignacion", value: scriptContext.idtecnico });
              openRecord.setValue("custrecord_ht_ot_supervisorasignacion", scriptContext.idsupervisor);
              openRecord.setValue("custrecord_ht_ot_fueraciudad", scriptContext?.fueraciudad == "S" ? true : false);
              openRecord.setValue("custrecord_ht_ot_fuerataller", scriptContext?.fuerataller == "S" ? true : false);

              let idOT = openRecord.save();
              log.debug("Actualizar fin", idOT);
              respuesta = { id: idOT, mensaje: "Exito" };
            } catch (error) {
              log.error("Error al procesar la orden de trabajo", error);
              respuesta = { id: 0, mensaje: "Error al procesar la orden de trabajo" };
            }
          } else {
            log.error("Error: idordentrabajo o idtecnico no proporcionado");
            respuesta = { id: 0, mensaje: "Error: idordentrabajo o o idtecnico no proporcionado" };
          }
          break;

        // TODO: Default
        default:
          respuesta = { id: 0, mensaje: "Verifique la accion" };
          break;
      }

      return JSON.stringify({ results: [respuesta] });
    } catch (e) {
      log.error("Error en POST", e);
      return JSON.stringify({ results: [respuesta] });
    }
  };

  /**
   * TODO: Funciones de busqueda.
   */
  const getBuscarOrdenService = (id) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [["type", "anyof", "SalesOrd"], "AND", ["internalid", "anyof", id], "AND", ["mainline", "is", "T"]],
        columns: [
          { name: "custbody_ht_so_bien", label: "Bien" },
          { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "location" },
          { name: "internalid", join: "location", label: "ID location" },
          { name: "altname", join: "customerMain", label: "Name" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "memo", label: "Nota" },
          { name: "custbody_ht_os_correocliente", label: "email" },
          { name: "formulatext", formula: "{entity.id}", label: "Fórmula (texto)" },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "formulatext", formula: "{entity}", label: "Fórmula (texto)" },
          { name: "name", join: "location", label: "ID location" },
          { name: "subsidiary", label: "Subsidiaria" },
          { name: "custbody_ht_os_concesionario", label: "Concesionario" },
          { name: "trandate", label: "Fecha de la transacción" },
          { name: "custbody_ht_os_aprobacionventa", label: "Aprobación Venta" },
          { name: "custbody_ht_os_aprobacioncartera", label: "Aprobación Cartera" }
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach((result) => {
          const columns = result.columns;
          const codigo = result.getText(columns[0]);
          const nombre = result.getValue(columns[1]);
          const idbien = result.getValue(columns[9]);
          const name = result.getValue(columns[11]);
          const subsidiary = result.getText(columns[12]).split(":")[1].trim();
          const nrodocPropietario = result?.getValue(columns[10]).split(" ")[0].split("-")[2];
          const subsidiaryid = result.getValue(columns[12])
          const memo = result.getValue(columns[6]);
          const location = result.getValue(columns[2]);
          const nOS = result.getValue(columns[5]);
          const concesionario = result.getText(columns[13]);
          const fecha = result.getValue(columns[14]);
          const aprobacionVenta = result.getValue(columns[15]);
          const aprobacionCartera = result.getValue(columns[16]);

          respuesta = [codigo, nombre, idbien, nrodocPropietario, name, subsidiary, subsidiaryid, memo, location, nOS, concesionario, fecha, aprobacionVenta, aprobacionCartera];
          // respuesta = [codigo, nombre, idbien, nrodocPropietario, name, subsidiary, subsidiaryid, memo, location, nOS, concesionario, fecha];

        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  function buscarPorIdentificacion(identificacion) {
    try {
      let results = [];

      var customerSearchObj = search.create({
        type: "customer",
        filters: [
          // ["formulatext: {vatregnumber}", "startswith", identificacion],
          ["formulatext: {vatregnumber}", "is", identificacion],
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            identificacion: result.getValue({
              name: "internalid",
              label: "ID interno",
            }),
          });
        });
      });

      return results.length > 0 ? results[0].identificacion : "";
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  function buscarPorTaller(idTaller) {
    try {
      if (!idTaller) {
        return "";
      }
      let results = [];

      var customerSearchObj = search.create({
        type: "customrecord_ht_tt_tallertablet",
        filters: [["internalid", "anyof", idTaller]],
        columns: [
          search.createColumn({
            name: "custrecord_ht_tt_oficina",
            label: "HT Oficina",
          }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            ciudad: result.getText({
              name: "custrecord_ht_tt_oficina",
              label: "HT Oficina",
            }),
          });
        });
      });
      return results.length > 0 ? results[0].ciudad : "";
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  function buscarItems(idTansaccion) {

    let filtro = [
      ["transaction.internalid", "anyof", idTansaccion],
    ]

    try {
      let results = [];

      var customerSearchObj = search.create({
        type: "item",
        filters: filtro,
        columns: [
          search.createColumn({
            name: "salesdescription",
            label: "Descripción",
          }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({
            name: "salesdescription",
            label: "Descripción",
          }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            descripcionItem: result.getValue({
              name: "salesdescription",
              label: "Descripción",
            }),
            idItem: result.getValue({
              name: "internalid",
              label: "ID interno",
            }),
            descripcion: result.getValue({
              name: "salesdescription",
              label: "Descripción",
            }),
          });
        });
      });
      return results.length > 0 ? results : "";
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  function parametrizacionItems(listaItems) {
    try {
      if (!listaItems) {
        return "";
      };
      let results = [];

      listaItems.forEach(function (item) {

        var customerSearchObj = search.create({
          type: "customrecord_ht_pp_main_param_prod",
          // filters: [["custrecord_ht_pp_parametrizacionid", "anyof", item.idItem],     "AND",  ["custrecord_ht_pp_parametrizacion_rela","anyof","104"]  ],
          filters: [["custrecord_ht_pp_parametrizacionid", "anyof", item.idItem], "AND", ["custrecord_ht_pp_parametrizacion_rela", "anyof", "109"]],
          columns: [search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" })],
        });

        var searchResult = customerSearchObj.runPaged();

        searchResult.pageRanges.forEach(function (pageRange) {
          var myPage = searchResult.fetch({ index: pageRange.index });

          myPage.data.forEach(function (result) {
            results.push({ valor: result.getText({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }) });
          });
        });
      });
      return results.length > 0 ? results : "";
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  function buscarTarea(idTansaccion) {
    try {
      let results = [];
      var customerSearchObj = search.create({
        type: "activity",
        filters: [
          ["transaction.internalid", "anyof", idTansaccion],
          "AND",
          ["type", "anyof", "Task"]
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "startdate", label: "Fecha" }),
          search.createColumn({ name: "custevent_ht_tr_hora", label: "Hora" }),
          search.createColumn({ name: "custevent_ht_turno_creado_por", label: "Creado Por" }),
          search.createColumn({ name: "title", label: "Título" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            idTarea: result.getValue({ name: "internalid", label: "ID interno" }),
            fecha: result.getValue({ name: "startdate", label: "Fecha" }),
            hora: result.getValue({ name: "custevent_ht_tr_hora", label: "Hora" }),
            creadoPor: result.getValue({ name: "custevent_ht_turno_creado_por", label: "Creado Por" }),
            titulo: result.getValue({ name: "title", label: "Título" }),
          });
        });
      });

      return results?.length > 0 ? results[0] : "";
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  const obtenerItemRelacionado = (id) => {
    let results = [];
    try {
      var customerSearchObj = search.create({
        type: "item",
        filters: [
          ["internalid", "anyof", id],
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "salesdescription", label: "Descripción", }),
          // displayname
          search.createColumn({ name: "displayname", label: "Nombre" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            idItem: result.getValue({ name: "internalid", label: "ID interno", }),
            descripcionItem: result.getValue({ name: "salesdescription", label: "Descripción" }),
            nombreItem: result.getValue({ name: "displayname", label: "Nombre" }),
          });
        });
      });

      return results;

    } catch (error) {
      log.debug("error", error);
      return results;
    }
  };


  /**
   * TODO: Funciones auxiliares.
   */
  function createColumn(name, join = null, summary = null, label, sort) {
    if (sort == "ASC") {
      return search.createColumn({ name: name, join: join, summary: summary, label: label, sort: "ASC" });
    } else {
      return search.createColumn({ name: name, join: join, summary: summary, label: label });
    }
  };

  function getValueOrEmpty(result, column) {
    try {
      const value = result.getValue(column);
      return value === "- None -" ? "" : value;
    } catch (error) {
      log.debug("error", error);
      return "";
    }
  };

  function getTextOrEmpty(result, column) {
    const value = result.getText(column);
    return value === "- None -" ? "" : value;
  };

  function generarFechaActual() {
    // Obtener la fecha y hora actual
    const ahora = new Date();

    ahora.setHours(ahora.getHours() + 2);

    // Formatear la fecha en el formato deseado: yyyy-mm-dd
    const fecha =
      ahora.getDate().toString().padStart(2, "0") +
      "/" +
      (ahora.getMonth() + 1).toString().padStart(2, "0") +
      "/" +
      ahora.getFullYear().toString();

    // Formatear la hora en el formato deseado: hh:mm:ss:ms
    const hora =
      ahora.getHours().toString().padStart(2, "0") +
      ":" +
      ahora.getMinutes().toString().padStart(2, "0") +
      ":" +
      ahora.getSeconds().toString().padStart(2, "0") +
      ":" +
      ahora.getMilliseconds().toString().padStart(3, "0");

    // Devolver la cadena formateada
    return `[TABLET].[${fecha}].[${hora}]`;
  };

  function obtenerFechaFormateada() {
    // Obtener la fecha actual
    const hoy = new Date();
    // Crear un array con los nombres de los meses en español
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    // Obtener el día, mes y año
    const dia = hoy.getDate();
    const mes = meses[hoy.getMonth()];
    const año = hoy.getFullYear();

    // Formatear la fecha
    return `${dia} ${mes} ${año}`;
  };

  function concatenarParametrizacionItems(listaItems) {
    // Extrae los valores de 'descripcionItem' y los une con comas
    try {
      return listaItems.filter((item) => item.valor.startsWith("00")).map((item) => item.valor).join(", ");
    } catch (error) {
      return "";
    }
  };

  function asegurarPrefijoOS(ordenservicio) {
    // Intenta agregar "OS" si no está presente, de lo contrario retorna la cadena original o "" si hay un error
    try {
      return ordenservicio.startsWith("OS") ? ordenservicio : "OS" + ordenservicio;
    } catch (e) {
      return "";
    }
  };

  function setFieldValueIfDefined(openRecord, fieldId, value) {
    openRecord.setValue({ fieldId: fieldId, value: value });
  };

  function obtenerFechaFormateadaRegistro(fecha) {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    try {
      const [dia, mes, año] = fecha.split("/").map((parte, indice) => indice === 1 ? parseInt(parte, 10) - 1 : parseInt(parte, 10));
      const fechaObj = new Date(Date.UTC(año, mes, dia, 10, 1, 47, 579));
      return `${fechaObj.getUTCDate()} ${meses[fechaObj.getUTCMonth()]} ${fechaObj.getUTCFullYear()}`;
    } catch (error) {
      const hoy = new Date();
      return `${hoy.getDate()} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
    }
  };

  const obtenerParametrosItems = (id, caso) => {
    let results = [];
    try {
      var customerSearchObj = search.create({
        type: "customrecord_ht_pp_main_param_prod",
        filters: [
          [
            ["custrecord_ht_pp_parametrizacionid", "anyof", id],
            "AND",
            ["custrecord_ht_pp_parametrizacion_rela", "anyof", caso],

          ],
        ],
        columns: [
          search.createColumn({ name: "custrecord_ht_pp_parametrizacionid" }),
          search.createColumn({
            name: "custrecord_ht_pp_parametrizacion_rela",
          }),
          search.createColumn({ name: "custrecord_ht_pp_aplicacion" }),
          search.createColumn({
            name: "custrecord_ht_pp_parametrizacion_valor",
          }),
          search.createColumn({ name: "internalid" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            idItem: result.getText({
              name: "custrecord_ht_pp_parametrizacionid",
            }),
            idRelacion: result.getText({
              name: "custrecord_ht_pp_parametrizacion_rela",
            }),
            aplicacion: result.getValue({
              name: "custrecord_ht_pp_aplicacion",
            }),
            valor: result.getText({
              name: "custrecord_ht_pp_parametrizacion_valor",
            }),
            internalid: result.getText({ name: "internalid" }),
          });
        });
      });

      return results;
    } catch (error) {
      log.debug("error", error);
      return results;
    }
  };

  const getOrdenService = (tranid, info = false) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["tranid", "is", tranid],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "internalid" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "custbody_ht_os_servicios" },
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          respuesta.push({
            idordenservicio: result.getValue({ name: "internalid" }),
            ordenservicio: result.getValue({
              name: "tranid",
              label: "Num. Pedido",
            }),
            nservicios: result.getValue({
              name: "custbody_ht_os_servicios",
            }),
          });
        });
      });

      if (info) {
        return respuesta[0];
      } else {
        return respuesta[0]?.idordenservicio;
      }

    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  function validarProcesoRecepcionTable(transactionId) {
    try {

      if (!transactionId) {
        return false;
      }

      var sql = `
            SELECT 
                id,
                owner
            FROM calendarevent
            WHERE transaction = ?
            ORDER BY lastmodifieddate DESC
            FETCH FIRST 1 ROW ONLY
        `;

      var resultSet = query.runSuiteQL({
        query: sql,
        params: [transactionId]
      });

      var results = resultSet.asMappedResults();

      if (!results || results.length === 0) {
        return false;
      }

      return Number(results[0].owner) == 449; // User - Operador del Sistema

    } catch (e) {
      log.error('Error validando último evento de calendario', e);
      return false;
    }
  }


  return {
    get: _get,
    post: _post,
  };
});