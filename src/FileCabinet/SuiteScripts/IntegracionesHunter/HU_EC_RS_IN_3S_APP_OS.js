/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/query", "N/log", "N/search", "N/record", "N/email"], (
  query,
  log,
  search,
  record,
  email
) => {
  const _get = (requestParams) => {
    try {
      let opcion = requestParams.opcion;

      switch (opcion) {
        case "1":
          // log.debug({ title: "1", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let data = Caso1(id); // Proceso anterior

            if (data.length == 0) {
              throw "No se encontraron resultados";
            }

            // log.debug({ title: "respuesta 1", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 1", e);
            return JSON.stringify({ results: [respuestaGlobales("1")] });
          }

        case "2":
          // log.debug({ title: "2", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let idorservicio = getOrdenService(id);
            let data = Caso2(idorservicio);
            log.debug("Datos 2", {
              "idorservicio": id,
              "orservicio": idorservicio,
              "respuesta 2": data
            })
            // log.debug({ title: "respuesta 2", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 2", e);
            return JSON.stringify({ results: [respuestaGlobales("2")] });
          }

        case "3":
          // log.debug({ title: "3", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let idorservicio = getOrdenService(id, true);
            let data = Caso3(idorservicio);
            log.debug("Datos 3", {
              "idorservicio": id,
              "orservicio": idorservicio,
              "respuesta 3": data
            })
            // log.debug({ title: "respuesta 3", details: data });
            return JSON.stringify({ results: data });

          } catch (e) {
            log.error("Error respuesta 3", e);
            return JSON.stringify({ results: [respuestaGlobales("3")] });
          }

        case "4":
          //log.debug({ title: "4", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let idorservicio = getOrdenService(id);
            //log.debug({ title: "respuesta 4", details: idorservicio });

            // if (requestParams.aux == "S") {  // ! Cambio DOAS 11/05/2026
            actualizarOrdenTrabajo(id);    // ! Cambio DOAS 11/05/2026
            // }

            let data = Caso4(idorservicio);
            log.debug("Datos Dispositivo", {
              "idorservicio": id,
              "orservicio": idorservicio,
              "respuesta 4": data
            })
            //log.debug({ title: "respuesta 4", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 4", e);
            return JSON.stringify({ results: [respuestaGlobales("4")] });
          }

        case "5":
          // log.debug({ title: "5", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let codigo = requestParams.dispositivo;

            let idorservicio = getOrdenService(id);
            let data = Caso5(idorservicio, codigo);

            log.debug("Datos 5", {
              "idorservicio": id,
              "orservicio": idorservicio,
              "dispositivo": codigo,
              "respuesta 5": data
            })

            // log.debug({ title: "respuesta 5", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 5", e);
            return JSON.stringify({ results: [respuestaGlobales("1")] });
          }

        case "6":
          // log.debug({ title: "6", details: requestParams });

          try {
            let data = Caso6();

            // log.debug({ title: "respuesta 6", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 6", e);
            return JSON.stringify({ results: [respuestaGlobales("4")] });
          }

        case "7":
          // log.debug({ title: "7", details: requestParams });

          try {
            let data = Caso7();

            // log.debug({ title: "respuesta 7", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 6", e);
            return JSON.stringify({ results: [respuestaGlobales("4")] });
          }

        case "8":
          // log.debug({ title: "8", details: requestParams });

          try {
            let data = Caso8();

            // log.debug({ title: "respuesta 8", details: data });

            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 6", e);
            return JSON.stringify({ results: [respuestaGlobales("4")] });
          }

        // NEW CASES
        case "9":
          // log.debug({ title: "9", details: requestParams });

          try {
            let id = requestParams.idordenservicio;
            let data = Caso9(id); // Proceso anterior

            if (data.length == 0) {
              throw "No se encontraron resultados";
            }

            // log.debug({ title: "respuesta 9", details: data });
            return JSON.stringify({ results: data });
          } catch (e) {
            log.error("Error respuesta 9", e);
            return JSON.stringify({ results: [respuestaGlobales("9")] });
          }

        case "10":                                                        // !Consulta De Recepciones  
          log.debug({ title: "10", details: requestParams });

          try {
            let data = requestParams;
            let respuesta = Caso10(data);


            //let dataOrden = Caso1(respuesta[0].idos);
            // log.debug("dataOrden", dataOrden);

            log.debug("Datos 10", {
              "respuesta": respuesta
            })

            return JSON.stringify({ results: respuesta });
          } catch (e) {
            log.error("Error respuesta 10", e);
            return JSON.stringify({ results: [] });
          }

        case "11":                                                        // !Eliminacion de Recepciones
          log.debug({ title: "11", details: requestParams });
          try {
            let id = requestParams.idrecepcion;
            let respuesta = Caso11(id);
            return JSON.stringify({ results: respuesta });
          } catch (e) {
            log.error("Error respuesta 11", e);
            return JSON.stringify({ results: [] });
          }

        default:
          return JSON.stringify({ results: [] });
      }

    } catch (error) {
      log.debug({ title: "Error", details: error }); // TODO: Log de errores.
      return JSON.stringify({ results: [] });
    }
  };

  /*
   * Funciones de búsqueda General.
   */
  // Proceso anterior
  const Caso1 = (id) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "custbody_ht_so_bien", label: "Bien" },
          { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "location" },
          { name: "internalid", join: "location", label: "ID location" },
          { name: "altname", join: "customerMain", label: "Name" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "memo", label: "Nota" },
          { name: "custbody_ht_os_correocliente", label: "email" },
          {
            name: "formulatext",
            formula: "{entity.id}",
            label: "Fórmula (texto)",
          },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          {
            name: "formulatext",
            formula: "{entity}",
            label: "Fórmula (texto)",
          },
          { name: "name", join: "location", label: "ID location" },
          { name: "subsidiary", label: "Subsidiaria" },
          { name: "custbody_ht_os_concesionario", label: "Concesionario" },
          { name: "trandate", label: "Fecha de la transacción" },
          { name: "internalid" },
          { name: "custbody_ht_os_consideracion", label: "Consideración" },
          { name: "entity" },
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      let datavehiculo;
      let datacliente;
      let dataturno;

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          // 1. Obtener el ID del vehículo
          let idvehiculo = result.getValue({
            name: "internalid",
            join: "CUSTBODY_HT_SO_BIEN",
            label: "Nombre",
          });

          // 2. Obtener el ID del cliente
          let idcliente = result.getValue({ name: "entity" });

          // 3. Obtener los datos del vehículo
          datavehiculo = getVehiculo(idvehiculo);

          // 4. Obtener los datos del cliente
          datacliente = getCliente(idcliente);

          // 5. Obtener los datos del turno
          dataturno = buscarTarea(id);

          respuesta.push({
            idordenservicio: result.getValue({ name: "internalid" }),
            ordenservicio: result.getValue({ name: "tranid" }),
            ubicacion: result.getText({ name: "location" }),
            contacto: datacliente?.cliente || "", // SN
            fuerataller: "N", // OT
            fueraciudad: "N", // OT
            comentario: result.getValue({
              name: "custbody_ht_os_consideracion",
            }),
            idvehiculo: result.getValue({
              name: "internalid",
              join: "CUSTBODY_HT_SO_BIEN",
            }),
            vehiculo: result
              .getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" })
              .slice(0, 110),
            codigoVehiculo: datavehiculo?.vehiculo || "",
            motor: datavehiculo?.motor || "",
            placa: datavehiculo?.placa || "",
            chasis: datavehiculo?.chasis || "",
            marca: datavehiculo?.marca || "",
            modelo: datavehiculo?.modelo || "",
            color: datavehiculo?.color || "",
            anio: datavehiculo?.anio || "",
            cbu: "",
            idcliente: idcliente,
            cliente: datacliente?.cliente || "",
            identificacion: datacliente?.identificacion || "",
            direccion:
              datacliente?.direccion
                ?.replace(/\n+/g, " ")
                .replace(/\s{2,}/g, " ")
                .trim() || "",
            telefono: datacliente?.telefono || "",
            switch1: "0",
            switch2: "0",
            puntoventa: result.getText({
              name: "location",
            }),
            turnoprogramado: dataturno?.idTarea ? "S" : "N",
            atendido: "N",
            strimagen: "NO",
          });
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  function Caso2(id) {
    let dataturno;

    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
    ];

    try {
      let ordenservicio = id;
      let valoractaent = "NO";  // DOAS - 17/02/2025

      // Si el parámetro id no es nulo, se agrega a los filtros
      if (ordenservicio && ordenservicio?.trim() !== "") {
        filter.push("AND", [
          "custrecord_ht_ot_orden_serivicio_txt",
          "contains",
          ordenservicio,
        ]);
        filter.push("AND", [          // DOAS - 12/03/2025
          ["custrecord_ht_ot_estado", "anyof", "4"]
        ]);
        // try {
        //   let idorservicio = getOrdenService(ordenservicio);
        //   if(idorservicio && idorservicio.length > 0){
        //     filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio ])
        //   }else{
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   }
        // } catch (error) {
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   // log.debug("--", error)
        // }

        // filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "4"]); // TODO: Eliminar esta linea para pruebas (Estado SOLO procesando)
      }

      // log.debug("filter", filter);

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          createColumn("custrecord_ht_ot_cliente_id", null, "GROUP", "Cliente"),
          createColumn("internalid", "CUSTRECORD_HT_OT_ORDEN_SERVICIO", "GROUP", "ID interno"),
          createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
          createColumn("custrecord_ht_ot_imei", null, "GROUP", "IMEI"),
          createColumn("internalid", null, "GROUP", "Internal ID"),
          createColumn("name", null, "GROUP", "ID", "ASC"),
          createColumn("altname", "CUSTRECORD_HT_OT_CLIENTE_ID", "GROUP", "Name"),
          createColumn("custrecord_ht_ot_vehiculo", null, "GROUP", "HT OT ID Vehículo"),
          createColumn("custrecord_ht_ot_orden_serivicio_txt", null, "GROUP", "HT OT Orden de Servicio TXT"),
          createColumn("altname", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Name"),
          createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
          createColumn("custrecord_ht_ot_fechatrabajoasignacion", null, "GROUP", "Fecha de Trabajo"),
          createColumn("custrecord_ht_ot_horatrabajoasignacion", null, "GROUP", "Hora de Trabajo"),
          createColumn("custrecord_ht_ot_ubicacion", null, "GROUP", "Ubicación"),
          createColumn("custrecord_ht_ot_observacion", null, "GROUP", "Comentario Técnico"),
          createColumn("custrecordht_ot_tipo_agrupacion", null, "GROUP", "Producto"),
          createColumn("custrecord_ht_ot_serieproductoasignacion", null, "GROUP", "Serie Producto"),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [];

      // count
      // log.debug("myPagedData.count", myPagedData.count);

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Obtener el ID del cliente
          let clienteid = result.getValue({
            name: "custrecord_ht_ot_cliente_id",
            summary: "GROUP",
            label: "Cliente",
          });

          // 2. Obtener el nombre del cliente
          let lookupFieldsvatregnumber = "";
          try {
            lookupFieldsvatregnumber = search.lookupFields({
              type: "customer",
              id: clienteid,
              columns: ["vatregnumber"],
            });
            lookupFieldsvatregnumber = lookupFieldsvatregnumber.vatregnumber
              .length
              ? lookupFieldsvatregnumber.vatregnumber
              : "";
          } catch (error) { }

          // 3. Obtener el ID Orden de Servicio
          let idOrdenServic = getValueOrEmpty(result, {
            name: "internalid",
            join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
            summary: "GROUP",
          });

          // 4. Obtener datos de la orden de servicio
          let DataOrdenService = getBuscarOrdenServiceAnt(idOrdenServic);

          // 5. Obtener la fecha de la orden de servicio
          let fecha = DataOrdenService[11] || "";

          // 6. Obtener Turno de la orden de trabajo
          dataturno = buscarTarea(idOrdenServic);

          // 7. Obtener el ID del item
          let newitem = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });

          // 8. Obtener información del item
          let dataitem = obteneritemRelacionado(newitem);
          let dataitemparam = obtenerParametrosItems(newitem);
          let accion = dataitemparam[0].valor?.slice(0, 3) || "";

          log.debug("accion---", accion);

          // 9. Informacion de la etiqueta PMS
          // obtenerParametroClasificacion(newitem, "157")[0]?.valor || "";
          let PMS =
            obtenerParametroClasificacion(newitem, "164")[0]?.valor || "";


          // log.debug("PMS---", PMS);

          // 10. Validar si el dispositivo esta disponible
          let disp = "";
          // if (accion == ("001" || "003" || "002" || "006")) {
          //   disp = "S";                                    
          if (["001", "003", "002", "006"].includes(accion)) {  // Nuevo ajuste 18/02/2025
            disp = "S";                                         // ! Cambio Galo 04/10/2024
          } else if (accion == "006") {                         // ! Cambio Galo 04/10/2024
            disp = "S";
          } else if (accion == "011" && PMS == "S - SI") {
            disp = "R";
          } else if (PMS == "S - SI") {
            disp = "R";
          } else {
            disp = "N";
          }

          // log.debug("disp---", disp);

          // 11. Obtener el tipo de dispositivo
          let tipodispositivo = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_imei",
            summary: "GROUP",
          })
            ? "002"
            : "001";

          if (accion == "002") {
            valoractaent = "S";
          }

          results.push({
            idordentrabajo: getValueOrEmpty(result, {
              name: "internalid",
              summary: "GROUP",
            }),
            ordentrabajo: getValueOrEmpty(result, {
              name: "name",
              summary: "GROUP",
            }),
            idcliente: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_cliente_id",
              summary: "GROUP",
            }),
            cliente: getValueOrEmpty(result, {
              name: "altname",
              join: "CUSTRECORD_HT_OT_CLIENTE_ID",
              summary: "GROUP",
            }),
            idvehiculo: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_vehiculo",
              summary: "GROUP",
            }),
            vehiculo: getValueOrEmpty(result, {
              name: "altname",
              join: "CUSTRECORD_HT_OT_VEHICULO",
              summary: "GROUP",
            }),
            codigoestado:
              getTextOrEmpty(result, {
                name: "custrecord_ht_ot_estado",
                summary: "GROUP",
              })
                .split("-")[0]
                .trim() || "",
            estadoOT:
              getTextOrEmpty(result, {
                name: "custrecord_ht_ot_estado",
                summary: "GROUP",
              }) || "",
            realizado: "", // SD
            fecha: obtenerFechaFormateadaRegistro(fecha),
            idordenservicio: idOrdenServic,
            ordenservicio: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_orden_serivicio_txt",
              summary: "GROUP",
            }),
            fechatrabajo: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_fechatrabajoasignacion",
              summary: "GROUP",
            }),
            horatrabajo: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_horatrabajoasignacion",
              summary: "GROUP",
            }), // SD
            novedades: "", // SD
            ubicacion: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_ubicacion",
              summary: "GROUP",
            }), // SD
            observaciones: getValueOrEmpty(result, {
              name: "custrecord_ht_ot_observacion",
              summary: "GROUP",
            }),
            item: getTextOrEmpty(result, {
              name: "custrecord_ht_ot_item",
              summary: "GROUP",
            }),
            producto: dataitem[0]?.displayname || "",
            transaccionitem:
              dataitemparam[0]?.valor?.split("-")[0].trim() || "",
            grupo: getTextOrEmpty(result, {
              name: "custrecordht_ot_tipo_agrupacion",
              summary: "GROUP",
            }),
            dispositivo: getTextOrEmpty(result, {
              name: "custrecord_ht_ot_serieproductoasignacion",
              summary: "GROUP",
            }), // SD
            tipodispositivo: tipodispositivo,
            disp: disp,
            idturno: dataturno.idTarea,
            turno: dataturno.titulo,
            actaent: valoractaent,
            accion: accion,
          });
        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo..", { e: e.error, stack: e.stack });
      return [];
    }
  }

  function Caso3(data) {
    try {

      if (data?.nservicios == null || data?.nservicios == "") {
        throw "No se encontraron resultados";
      }

      let dataitems = obtenerItemParametrizadoPorBien(data.idordenservicio);
      let assemblyItem = null;

      dataitems.some((item) => {
        assemblyItem = item.items.find((subItem) => subItem.type === "Assembly" && subItem.pps === "N" && subItem.adp === "001");
        return assemblyItem !== undefined;
      });

      const nservicios = data.nservicios.split(',').map(Number);

      const filter = [
        ["internalid", "anyof", nservicios],
      ];
      const mySearch = search.create({
        type: "customrecord_ht_servicios",
        filters: filter,
        columns: [
          createColumn("name", null, null, "name"),
          createColumn("custrecord_ht_sv_command", null, null, "Comando"),
        ],
      });

      let results = [];

      let myPagedData = mySearch.runPaged();
      myPagedData.pageRanges.forEach(function (pageRange) {
        let myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {

          const cadena = getValueOrEmpty(result, { name: "name" });
          const parteUno = cadena.split('-')[0].trim();
          const parteDos = cadena.split('-')[1].trim();

          results.push({
            idservicio: parteUno,
            nombreservicio: parteDos,
            servicioami: getTextOrEmpty(result, { name: "custrecord_ht_sv_command" }),
            grupo: assemblyItem?.familiaGrupo || "",
            nombregrupo: assemblyItem?.displayname || "",
          });
        });
      });

      // throw "Error Controlado";
      return results;

    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo..1.", e);
      return [];
    }
  }

  function Caso4(id) {
    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
    ];
    try {
      let ordenservicio = id;

      if (ordenservicio && ordenservicio.trim() !== "") {
        filter.push("AND", [
          "custrecord_ht_ot_orden_serivicio_txt",
          "contains",
          ordenservicio,
        ]);

        // try {
        //   let idorservicio = getOrdenService(ordenservicio);
        //   if(idorservicio && idorservicio.length > 0){
        //     filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio ])
        //   }else{
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   }
        // } catch (error) {
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   // log.debug("--", error)
        // }

        filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "4"]); // todo: PRUEBA
      }

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          // custrecord_ht_ot_serieproductoasignacion
          createColumn(
            "custrecord_ht_ot_serieproductoasignacion",
            null,
            "GROUP",
            "Serie Producto"
          ),
          // custrecordht_ot_tipo_agrupacion
          createColumn(
            "custrecordht_ot_tipo_agrupacion",
            null,
            "GROUP",
            "Tipo Agrupación"
          ),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [
        {
          codigo: 0,
          descripcion: "NINGUN",
        },
      ];

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Obtener el ID del producto
          let producto =
            getTextOrEmpty(result, {
              name: "custrecord_ht_ot_serieproductoasignacion",
              summary: "GROUP",
            }) || "";

          let idproducto = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_serieproductoasignacion",
            summary: "GROUP",
          }) || "";

          // 2. Obtener el tipo de agrupación
          let tipoagrupacion =
            getTextOrEmpty(result, {
              name: "custrecordht_ot_tipo_agrupacion",
              summary: "GROUP",
            }) || "";

          // 3. Obtener el código del producto
          let codigoNetsuite = producto;
          // // log.debug("codigoNetsuite", codigoNetsuite);
          // // log.debug("idproducto", idproducto);

          let ddatacodigo = obtenerInformacionDispositivo(producto, false);
          // // log.debug("ddatacodigo--", ddatacodigo[0].serieDispositivoLojack);
          // // log.debug("codigoNetsuite", codigoNetsuite);
          let validacionlojack = ddatacodigo[0]?.serieDispositivoLojack || "";

          // log.debug("validacionlojack--", validacionlojack);

          // 4. Validar el tipo de agrupación
          let aux = tipoagrupacion.slice(0, 3); // !LOJ, MON, OTS

          //  // log.debug("--------", aux);
          //  // log.debug("--------", validacionlojack);

          if (aux != "LOJ") {
            if (aux == "OPE" && validacionlojack) {
              aux = "LOJ";
            } else if (aux == "OTS" && validacionlojack) {
              aux = "LOJ";
            } else if (aux == "OTS" && !validacionlojack) {
              aux = "MON";
            } else {
              aux = "MON";
            }
          }

          if (aux && codigoNetsuite != "") {
            results.push({
              codigo: codigoNetsuite,
              descripcion: aux + " - " + codigoNetsuite,
            });
          }
        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo..2..", e);
      return [];
    }
  }

  function Caso5(id, codigo) {
    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
    ];

    try {
      let ordenservicio = id;

      // Si el parámetro id no es nulo, se agrega a los filtros
      if (ordenservicio && ordenservicio.trim() !== "") {
        filter.push("AND", [
          "custrecord_ht_ot_orden_serivicio_txt",
          "contains",
          ordenservicio,
        ]);

        // try {
        //   let idorservicio = getOrdenService(ordenservicio);
        //   if(idorservicio && idorservicio.length > 0){
        //     filter.push("AND", ["custrecord_ht_ot_orden_servicio", "anyof", idorservicio ])
        //   }else{
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   }
        // } catch (error) {
        //   filter.push("AND", ["custrecord_ht_ot_orden_serivicio_txt", "contains", ordenservicio]);
        //   // log.debug("--", error)
        // }

        filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "4"]); // todo: PRUEBA
      }

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          createColumn(
            "custrecord_ht_ot_serieproductoasignacion",
            null,
            "GROUP",
            "Serie Producto"
          ),
          createColumn(
            "custrecordht_ot_tipo_agrupacion",
            null,
            "GROUP",
            "Tipo Agrupación"
          ),
          createColumn(
            "custrecord_ht_ot_ubicacion",
            null,
            "GROUP",
            "Ubicación"
          ),
          createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
          createColumn("name", null, "GROUP", "ID"),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [];

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Obtener el nombre del producto
          let nombre =
            getTextOrEmpty(result, {
              name: "custrecord_ht_ot_serieproductoasignacion",
              summary: "GROUP",
            }) || "";

          // 2. Obtener el ID del dispositivo, obtenido en el scriptcontext
          let codigoNetsuite = nombre;

          // 3. Obtener ID del dispositivo
          let idDispositivo =
            getValueOrEmpty(result, {
              name: "custrecord_ht_ot_serieproductoasignacion",
              summary: "GROUP",
            }) || 0;

          // log.debug("idDispositivo", idDispositivo);

          let idItem = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });

          // log.debug("idItem", idItem);


          let datavalidacion = obtenerParametrizacionItem(idItem, [130]);
          // log.debug("datavalidacion", datavalidacion);

          let validacionFam = datavalidacion[0]?.Valor || "";


          // log.debug("idDispositivo----", idDispositivo);

          // 4. Obtener la información del dispositivo
          let dataDispositivo = obtenerInformacionDispositivo(idDispositivo, true);

          // log.debug("dataDispositivo------", dataDispositivo);

          // 5. Obtener el tipo de agrupación
          let identificacionTag =
            getTextOrEmpty(result, {
              name: "custrecordht_ot_tipo_agrupacion",
              summary: "GROUP",
            }) || "";

          // 6. Obtener el tipo de agrupación TAG
          // let numberIdentificacion = "";
          // if (identificacionTag.slice(0, 3) != "LOJ") {
          //   numberIdentificacion = "002";
          // } else if (identificacionTag.slice(0, 3) == "LOJ") {
          //   numberIdentificacion = "001";
          // }

          // let numberIdentificacion = "";
          // if (validacionFam != "HU") {
          //   numberIdentificacion = "002";
          // } else if (validacionFam == "HU") {
          //   numberIdentificacion = "001";
          // }

          // // 7. Validar si el código del producto es igual al código del dispositivo
          // if (codigo == codigoNetsuite) {
          //   // 8. Respuesta si el tipo de agrupación es diferente a LOJ
          //   if (validacionFam != "HU") {
          //     numberIdentificacion = "002";

          //     results.push({
          //       tipo: numberIdentificacion,
          //       serie: codigoNetsuite || "",
          //       vid: dataDispositivo[0]?.vid || "",
          //       ip: dataDispositivo[0]?.ip || "",
          //       codigo: dataDispositivo[0]?.serieDispositivo || "",
          //       operador: dataDispositivo[0]?.operadora || "",
          //       simcard: dataDispositivo[0]?.celularSIMCARD || "",
          //       celular: dataDispositivo[0]?.noCelularSIM || "",
          //       modelo: dataDispositivo[0]?.modelo || "",
          //       unidad: dataDispositivo[0]?.unidad || "",
          //       imei: dataDispositivo[0]?.imei || "",
          //       activacion: "",
          //       respuesta: "",
          //       ordentrabajo:
          //         getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
          //         "0", //
          //       ubicacion:
          //         getValueOrEmpty(result, {
          //           name: "custrecord_ht_ot_ubicacion",
          //           summary: "GROUP",
          //         }) || "",
          //       servidor: dataDispositivo[0]?.servidor || "",
          //       firmware: dataDispositivo[0]?.firmware || "",
          //       script: dataDispositivo[0]?.script || "",
          //       apn: dataDispositivo[0]?.apn || "",
          //     });

          //     // 9. Respuesta si el tipo de agrupación es igual a LOJ
          //   } else if (validacionFam == "HU") {
          //     numberIdentificacion = "001";
          //     results.push({
          //       tipo: numberIdentificacion,
          //       serie: codigoNetsuite || "",
          //       vid: "",
          //       ip: "",
          //       codigo: dataDispositivo[0]?.serieDispositivo || "",
          //       operador: "",
          //       simcard: "",
          //       celular: "",
          //       modelo: "",
          //       unidad: "",
          //       imei: "",
          //       activacion: dataDispositivo[0]?.codigoActivacion || "",
          //       respuesta: dataDispositivo[0]?.codigoRespuesta || "",
          //       ordentrabajo:
          //         getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
          //         "0", //
          //       ubicacion:
          //         getValueOrEmpty(result, {
          //           name: "custrecord_ht_ot_ubicacion",
          //           summary: "GROUP",
          //         }) || "",
          //       servidor: "",
          //       firmware: "",
          //       script: "",
          //       apn: "",
          //     });
          //   }
          // }


          // Nueva Logica 
          if (codigo == codigoNetsuite) {
            if (identificacionTag != null && (identificacionTag.slice(0, 3) == "LOJ" || identificacionTag.slice(0, 3) == "MON")) {
              if (identificacionTag.slice(0, 3) == "LOJ") {
                numberIdentificacion = "001";
                results.push({
                  tipo: numberIdentificacion,
                  serie: codigoNetsuite || "",
                  vid: "",
                  ip: "",
                  codigo: dataDispositivo[0]?.serieDispositivo || "",
                  operador: "",
                  simcard: "",
                  celular: "",
                  modelo: "",
                  unidad: "",
                  imei: "",
                  activacion: dataDispositivo[0]?.codigoActivacion || "",
                  respuesta: dataDispositivo[0]?.codigoRespuesta || "",
                  ordentrabajo:
                    getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
                    "0", //
                  ubicacion:
                    getValueOrEmpty(result, {
                      name: "custrecord_ht_ot_ubicacion",
                      summary: "GROUP",
                    }) || "",
                  servidor: "",
                  firmware: "",
                  script: "",
                  apn: "",
                });

              } else if (identificacionTag.slice(0, 3) == "MON") {
                numberIdentificacion = "002";

                results.push({
                  tipo: numberIdentificacion,
                  serie: codigoNetsuite || "",
                  vid: dataDispositivo[0]?.vid || "",
                  ip: dataDispositivo[0]?.ip || "",
                  codigo: dataDispositivo[0]?.serieDispositivo || "",
                  operador: dataDispositivo[0]?.operadora || "",
                  simcard: dataDispositivo[0]?.celularSIMCARD || "",
                  celular: dataDispositivo[0]?.noCelularSIM || "",
                  modelo: dataDispositivo[0]?.modelo || "",
                  unidad: dataDispositivo[0]?.unidad || "",
                  imei: dataDispositivo[0]?.imei || "",
                  activacion: "",
                  respuesta: "",
                  ordentrabajo:
                    getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
                    "0", //
                  ubicacion:
                    getValueOrEmpty(result, {
                      name: "custrecord_ht_ot_ubicacion",
                      summary: "GROUP",
                    }) || "",
                  servidor: dataDispositivo[0]?.servidor || "",
                  firmware: dataDispositivo[0]?.firmware || "",
                  script: dataDispositivo[0]?.script || "",
                  apn: dataDispositivo[0]?.apn || "",
                });


              }
            } else {
              if (validacionFam == "HU" || validacionFam == "TM") {
                numberIdentificacion = "001";
                results.push({
                  tipo: numberIdentificacion,
                  serie: codigoNetsuite || "",
                  vid: "",
                  ip: "",
                  codigo: dataDispositivo[0]?.serieDispositivo || "",
                  operador: "",
                  simcard: "",
                  celular: "",
                  modelo: "",
                  unidad: "",
                  imei: "",
                  activacion: dataDispositivo[0]?.codigoActivacion || "",
                  respuesta: dataDispositivo[0]?.codigoRespuesta || "",
                  ordentrabajo:
                    getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
                    "0", //
                  ubicacion:
                    getValueOrEmpty(result, {
                      name: "custrecord_ht_ot_ubicacion",
                      summary: "GROUP",
                    }) || "",
                  servidor: "",
                  firmware: "",
                  script: "",
                  apn: "",
                });
              }
              else
                if (validacionFam != "HU") {
                  numberIdentificacion = "002";

                  results.push({
                    tipo: numberIdentificacion,
                    serie: codigoNetsuite || "",
                    vid: dataDispositivo[0]?.vid || "",
                    ip: dataDispositivo[0]?.ip || "",
                    codigo: dataDispositivo[0]?.serieDispositivo || "",
                    operador: dataDispositivo[0]?.operadora || "",
                    simcard: dataDispositivo[0]?.celularSIMCARD || "",
                    celular: dataDispositivo[0]?.noCelularSIM || "",
                    modelo: dataDispositivo[0]?.modelo || "",
                    unidad: dataDispositivo[0]?.unidad || "",
                    imei: dataDispositivo[0]?.imei || "",
                    activacion: "",
                    respuesta: "",
                    ordentrabajo:
                      getValueOrEmpty(result, { name: "name", summary: "GROUP" }) ||
                      "0", //
                    ubicacion:
                      getValueOrEmpty(result, {
                        name: "custrecord_ht_ot_ubicacion",
                        summary: "GROUP",
                      }) || "",
                    servidor: dataDispositivo[0]?.servidor || "",
                    firmware: dataDispositivo[0]?.firmware || "",
                    script: dataDispositivo[0]?.script || "",
                    apn: dataDispositivo[0]?.apn || "",
                  });

                  // 9. Respuesta si el tipo de agrupación es igual a LOJ
                }
            }
          }
          // Fin Nueva Logica

        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo..3...", e);
      return [];
    }
  }

  function Caso6() {
    try {
      const vehicleSearchObj = search.create({
        type: "CUSTOMLIST_HT_OT_MOTIVOS",
        columns: [{ name: "internalid" }, { name: "name" }],
      });

      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [
        {
          codigo: "0",
          descripcion: "Ninguna",
        },
      ];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        // Recorrer los resultados y agregarlos al arreglo de respuesta
        myPage.data.forEach(function (result) {
          respuesta.push({
            codigo: result.getValue({ name: "internalid" }),
            descripcion: result.getValue({ name: "name" }),
          });
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en Caso6", e);
      return [
        {
          codigo: "0",
          descripcion: "Ninguna",
        },
      ];
    }
  }

  function Caso7() {
    try {
      const vehicleSearchObj = search.create({
        type: "CUSTOMLIST_HT_MC_ESTADO",
        filters: [["custrecord_sub", "anyof", 2]],
        columns: [
          { name: "internalid" },
          { name: "name" }
        ],
      });

      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        // Recorrer los resultados y agregarlos al arreglo de respuesta
        myPage.data.forEach(function (result) {
          respuesta.push({
            codigo: result.getValue({ name: "internalid" }),
            descripcion: result.getValue({ name: "name" }),
          });
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en Caso7", e);
      return [
        {
          codigo: "0",
          descripcion: "Ninguna",
        },
      ];
    }
  }

  function Caso8() {
    try {
      const vehicleSearchObj = search.create({
        type: "CUSTOMLIST_HT_OT_ESTADOORDENTRABAJO",
        columns: [{ name: "internalid" }, { name: "name" }],
      });

      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          // Recorrer los resultados y agregarlos al arreglo de respuesta
          respuesta.push({
            codigo: result.getValue({ name: "internalid" }),
            descripcion: result.getValue({ name: "name" }),
          });
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en Caso8", e);
      return [
        {
          codigo: "0",
          descripcion: "Ninguna",
        },
      ];
    }
  }

  const Caso9 = (id) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "entity" },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "name", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "internalid" },
          { name: "tranid", label: "Num. Pedido" },
          // custbody_ht_os_ejecutiva_backoffice
          { name: "custbody_ht_os_ejecutiva_backoffice" },
          // custbody_ht_os_ejecutivareferencia
          { name: "custbody_ht_os_ejecutivareferencia" },
          // salesrep
          { name: "salesrep" },
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      let datacliente;
      let datavehiculo;


      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          // 1. Obtener el ID del cliente
          let idcliente = result.getValue({ name: "entity" });

          // 2. Obtener los datos del cliente
          datacliente = getCliente(idcliente);

          // 3. idvehiculo
          let idvehiculo = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" });

          // 4. Obtener los datos del vehículo
          let vehiculo = result.getValue({ name: "name", join: "CUSTBODY_HT_SO_BIEN" }).slice(0, 110);

          // 5. idordenservicio
          let idordenservicio = result.getValue({ name: "internalid" });

          // 6. ordenservicio
          let ordenservicio = result.getValue({ name: "tranid" });

          // 7. idejecutiva
          let idejecutiva = result.getValue({ name: "custbody_ht_os_ejecutiva_backoffice" });

          // 8. ejecutiva
          let ejecutiva = result.getText({ name: "custbody_ht_os_ejecutiva_backoffice" });

          // 9. correoejecutiva
          let correoejecutiva = obtenerCorreo("employee", idejecutiva);

          // 10. idreferencia
          let idreferencia = result.getValue({ name: "custbody_ht_os_ejecutivareferencia" });

          // 11. referencia
          let referencia = result.getText({ name: "custbody_ht_os_ejecutivareferencia" });

          // 12. correoreferecia
          let correoreferecia = obtenerCorreo("employee", idreferencia);

          // 13. idRenovacion
          let idRenovacion = result.getValue({ name: "salesrep" });

          // 14. renovacion
          let renovacion = result.getText({ name: "salesrep" });

          // 15. correorenovacion
          let correorenovacion = obtenerCorreo("employee", idRenovacion);

          // 16. Obtener los datos del vehículo
          datavehiculo = getVehiculo(idvehiculo);

          respuesta.push({
            idcliente: idcliente,
            nombre: datacliente?.cliente || "",
            identificacion: datacliente?.identificacion || "",
            idvehiculo: idvehiculo,
            codigobien: vehiculo,
            chasis: datavehiculo?.chasis || "",
            motor: datavehiculo?.motor || "",
            marca: datavehiculo?.marca || "",
            modelo: datavehiculo?.modelo || "",
            idordenservicio: idordenservicio,
            codigoos: ordenservicio,
            idejecutiva: idejecutiva,
            ejecutiva: ejecutiva,
            correoejecutiva: correoejecutiva,
            idreferencia: idreferencia,
            referencia: referencia,
            correoreferecia: correoreferecia,
            idRenovacion: idRenovacion,
            renovacion: renovacion,
            correorenovacion: correorenovacion,
          });
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  function Caso10(object) {
    try {
      let dataConsultaOrden = "";
      let filtro = []
      let resultsArray = [];
      if (object.orden) {
        let dataorden = obtenerItemParametrizadoPorOrden(object.orden);
        // validarOrdenesTrabajoChequeadas(dataorden[0].internalidOs);
        log.debug("dataorden", dataorden[0].internalidOs);
        dataConsultaOrden = dataorden[0].internalidOs;
        filtro = [
          ["transaction.subsidiary", "anyof", "2"],
          "AND",
          ["transaction.internalid", "anyof", dataConsultaOrden]
        ]
      } else {
        if (!object.desde || !object.hasta) {
          return [];
        }
        let newdesde = object.desde.replace(/-/g, "/");
        let newhasta = object.hasta.replace(/-/g, "/");
        filtro = [
          ["createddate", "within", newdesde, newhasta],
          "AND",
          ["transaction.subsidiary", "anyof", "2"]
        ]
      }
      const calendareventSearchObj = search.create({
        type: "calendarevent",
        filters: filtro,
        columns: [
          // internalid
          search.createColumn({ name: "internalid", label: "ID" }),
          search.createColumn({ name: "title", label: "Evento" }),
          search.createColumn({ name: "startdate", label: "Fecha de inicio" }),
          search.createColumn({ name: "starttime", label: "Hora de inicio" }),
          search.createColumn({ name: "endtime", label: "Hora de finalización" }),
          search.createColumn({ name: "owner", label: "Propietario" }),
          search.createColumn({ name: "status", label: "Estado" }),
          search.createColumn({ name: "markdone", label: "Marcar" }),
          search.createColumn({ name: "transaction", label: "transaction" })
        ]
      });
      calendareventSearchObj.run().each((result) => {
        resultsArray.push({
          internalid: result.getValue({ name: 'internalid' }),
          nombre_recepcion: limpiarTexto(result.getValue({ name: 'title' })),
          fecha_inicio: result.getValue({ name: 'startdate' }),
          hora_inicio: result.getValue({ name: 'starttime' }),
          hora_fin: result.getValue({ name: 'endtime' }),
          idos: result.getValue({ name: 'transaction' }),
          os: (limpiarTexto(result.getText({ name: 'transaction' })) || "")
            .split(" ")[3] || "",
          idusuario: result.getValue({ name: 'owner' }),
          usuario: result.getText({ name: 'owner' }),
          estado: result.getText({ name: 'status' }),
          completado: result.getValue({ name: 'markdone' }),
          origen: result.getValue({ name: 'owner' }) === "449" ? "TABLET" : "NETSUITE",
          mensaje: validarOrdenesTrabajoChequeadasGrid(result.getValue({ name: 'transaction' }))
          //mensaje:""
        });
        return true;
      });
      resultsArray = resultsArray.filter(ObjectoFiltro => {
        ///+log.debug("ObjectoFiltro", ObjectoFiltro);
        if (ObjectoFiltro.mensaje) {
          return true;
        }
        return false;
      });
      if (resultsArray.length == 0) {
        resultsArray.push({
          internalid: "",
          nombre_recepcion: "",
          fecha_inicio: "",
          hora_inicio: "",
          hora_fin: "",
          idos: "",
          os: "",
          idusuario: "",
          usuario: "",
          estado: "",
          completado: "",
          origen: "",
          mensaje: "No existen Datos para los filtros seleccionados"
        });
      }
      return resultsArray;
    } catch (error) {
      log.error("Error en Caso10", error);
      const resultsArray = [];
      resultsArray.push({
        internalid: "",
        nombre_recepcion: "",
        fecha_inicio: "",
        hora_inicio: "",
        hora_fin: "",
        idos: "",
        os: "",
        idusuario: "",
        usuario: "",
        estado: "",
        completado: "",
        origen: "",
        mensaje: error.message
      });
      return resultsArray;
    }
  }

  function Caso11(id) {
    try {
      // Validar que el ID sea válido
      if (!id) {
        throw new Error("ID de recepción es requerido");
      }

      // Obtener el ID de la orden de servicio asociada
      const idOS = obtenerIdOrdenServicioRecepcion(id);

      if (!idOS) {
        throw new Error("No se encontró orden de servicio asociada a esta recepción");
      }

      // Validar que no existan órdenes de trabajo bloqueadas
      validarOrdenesTrabajoChequeadas(idOS);

      // Validar que la OS no tenga ensable asociada, en caso tenga, no permitir eliminar la recepción
      tieneAlMenosUnEnsamble(idOS)

      // Actualiza órdenes de trabajo a estado Venta
      actualizarOrdenesTrabajo(idOS)

      // Proceder con la eliminación
      record.delete({
        type: "calendarevent",
        id: id
      });

      log.audit("Eliminación exitosa", `Recepción ${id} eliminada correctamente`);
      return {
        id: id,
        success: true,
        message: "Recepción eliminada correctamente.",
      };

    } catch (error) {
      log.error("Error al eliminar recepción", error.toString());
      return {
        id: id,
        success: false,
        message: error.message || "Error al eliminar la recepción.",
      };
    }
  }

  /**
   * Obtiene el ID de la orden de servicio desde un evento de calendario
   * @param {number} idCalendarEvent - ID del evento de calendario (recepción)
   * @returns {number|null} ID de la orden de servicio o null si no existe
   */
  function obtenerIdOrdenServicioRecepcion(idCalendarEvent) {
    const search_result = search.create({
      type: "calendarevent",
      filters: [
        ["internalid", "anyof", idCalendarEvent],
        "AND",
        ["transaction.subsidiary", "anyof", "2"]
      ],
      columns: [
        search.createColumn({ name: "transaction", label: "transaction" })
      ]
    }).run().getRange({ start: 0, end: 1 }); // Obtener solo el primer resultado

    return search_result.length > 0
      ? search_result[0].getValue({ name: "transaction" })
      : null;
  }

  /**
   * Valida que no existan órdenes de trabajo asociadas en estado "Chequeado"
   * @param {number} idOS - ID de la orden de servicio
   * @throws {Error} Si existe una orden de trabajo bloqueada
   */
  function validarOrdenesTrabajoChequeadas(idOS) {
    const result = search.create({
      type: "customrecord_ht_record_ordentrabajo",
      filters: [
        ["custrecord_ht_ot_orden_servicio", "is", idOS],
        "AND",
        ["custrecord_ht_ot_estado", "anyof", "2"] // Estado Chequeado
      ],
      columns: ["custrecord_ht_ot_estado"]
    }).run().getRange({ start: 0, end: 1 }); // Verificar solo si existe al menos uno

    if (result.length > 0) {
      throw new Error(
        "No se puede eliminar la recepción porque tiene órdenes de trabajo en estado Chequeado."
      );
    }
  }

  function validarOrdenesTrabajoChequeadasGrid(idOS) {
    const result = search.create({
      type: "customrecord_ht_record_ordentrabajo",
      filters: [
        ["custrecord_ht_ot_orden_servicio", "is", idOS],
        "AND",
        ["custrecord_ht_ot_estado", "anyof", "2"] // Estado Chequeado
      ],
      columns: ["custrecord_ht_ot_estado"]
    }).run().getRange({ start: 0, end: 1 }); // Verificar solo si existe al menos uno

    if (result.length > 0) {
      return (false);
    }

    return (true);
  }

  function actualizarOrdenesTrabajo(idOS) {

    // Buqueda de todas las ot de la OS
    var resultados = search.create({
      type: "customrecord_ht_record_ordentrabajo",
      filters: [
        ["custrecord_ht_ot_orden_servicio", "is", idOS],
        "AND",
        ["custrecord_ht_ot_estado", "noneof", "2"]
      ],
      columns: ["internalid"]
    }).run().getRange({ start: 0, end: 20 });

    resultados.forEach(function (result) {
      var idOT = result.getValue({ name: "internalid" });
      // Itera y actualiza cada OT a Estado Venta
      record.submitFields({
        type: "customrecord_ht_record_ordentrabajo",
        id: idOT,
        values: {
          custrecord_ht_ot_estado: 7
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true
        }
      });
    });
  }

  function limpiarTexto(texto) {
    return (texto || "")
      .replace(/^\s+|\s+$/g, "")      // elimina espacios y tabs al inicio/fin (más fuerte que trim)
      .replace(/\s+/g, " ")           // reemplaza múltiples espacios/tabs por uno solo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/error/gi, "Err")
      .replace(/["'[\]{},:#]/g, "");
  }

  /*
   * Funciones de búsqueda
   */
  const getVehiculo = (id) => {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [["internalid", "anyof", id]],
        columns: [
          { name: "name" },
          { name: "custrecord_ht_bien_motor" },
          { name: "custrecord_ht_bien_placa" },
          { name: "custrecord_ht_bien_chasis" },
          { name: "custrecord_ht_bien_marca" },
          { name: "custrecord_ht_bien_modelo" },
          { name: "custrecord_ht_bien_colorcarseg" },
          { name: "custrecord_ht_bien_ano" },
        ],
      });

      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          respuesta.push({
            idvehiculo: result.getValue({ name: "internalid" }),
            vehiculo: result.getValue({ name: "name" }),
            motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
            placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
            chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            marca: result.getText({ name: "custrecord_ht_bien_marca" }),
            modelo: result.getText({ name: "custrecord_ht_bien_modelo" }),
            color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
          });
        });
      });

      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculo", e);
      return [];
    }
  };

  const getCliente = (id) => {
    try {
      const customerSearchObj = search.create({
        type: "customer",
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({ name: "entityid", label: "ID" }),
          search.createColumn({ name: "altname", label: "Nombre" }),
          search.createColumn({ name: "email", label: "Correo electrónico" }),
          search.createColumn({ name: "phone", label: "Teléfono" }),
          search.createColumn({
            name: "custentity_ts_ec_tipo_persona",
            label: "EC - Tipo de persona",
          }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({
            name: "shipaddress",
            label: "Dirección de envío",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{vatregnumber}",
            label: "Fórmula (texto)",
          }),
        ],
      });

      const myPagedData = customerSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          respuesta.push({
            idcliente: result.getValue({ name: "internalid" }),
            cliente: result.getValue({ name: "altname" }),
            identificacion: result.getValue({ name: "formulatext" }),
            direccion: result.getValue({ name: "shipaddress" }),
            telefono: result.getValue({ name: "phone" }),
            tipopersona: result.getValue({
              name: "custentity_ts_ec_tipo_persona",
            }),
            email: result.getValue({ name: "email" }),
          });
        });
      });

      return respuesta[0];
    } catch (e) {
      log.error("Error en getCliente", e);
      return [];
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
          ["type", "anyof", "Task"],
        ],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "startdate", label: "Fecha" }),
          search.createColumn({ name: "custevent_ht_tr_hora", label: "Hora" }),
          search.createColumn({
            name: "custevent_ht_turno_creado_por",
            label: "Creado Por",
          }),
          search.createColumn({ name: "title", label: "Título" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            idTarea: result.getValue({
              name: "internalid",
              label: "ID interno",
            }),
            fecha: result.getValue({ name: "startdate", label: "Fecha" }),
            hora: result.getValue({
              name: "custevent_ht_tr_hora",
              label: "Hora",
            }),
            creadoPor: result.getValue({
              name: "custevent_ht_turno_creado_por",
              label: "Creado Por",
            }),
            titulo: result.getValue({ name: "title", label: "Título" }),
          });
        });
      });
      return results?.length > 0 ? results[0] : "";
    } catch (error) {
      // log.debug("error", error);
      return "";
    }
  }

  const getBuscarOrdenServiceAnt = (id) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "custbody_ht_so_bien", label: "Bien" },
          { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "location" },
          { name: "internalid", join: "location", label: "ID location" },
          { name: "altname", join: "customerMain", label: "Name" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "memo", label: "Nota" },
          { name: "custbody_ht_os_correocliente", label: "email" },
          {
            name: "formulatext",
            formula: "{entity.id}",
            label: "Fórmula (texto)",
          },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          {
            name: "formulatext",
            formula: "{entity}",
            label: "Fórmula (texto)",
          },
          { name: "name", join: "location", label: "ID location" },
          { name: "subsidiary", label: "Subsidiaria" },
          { name: "custbody_ht_os_concesionario", label: "Concesionario" },
          { name: "trandate", label: "Fecha de la transacción" },
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
          const nrodocPropietario = result
            ?.getValue(columns[10])
            .split(" ")[0]
            .split("-")[2];
          const subsidiaryid = result.getValue(columns[12]);
          const memo = result.getValue(columns[6]);
          const location = result.getValue(columns[2]);
          const nOS = result.getValue(columns[5]);
          const concesionario = result.getText(columns[13]);
          const fecha = result.getValue(columns[14]);

          respuesta = [
            codigo,
            nombre,
            idbien,
            nrodocPropietario,
            name,
            subsidiary,
            subsidiaryid,
            memo,
            location,
            nOS,
            concesionario,
            fecha,
          ];
        });
      });

      return respuesta;
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  const getOrdenService = (id, info = false) => {
    try {
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["internalid", "anyof", id],
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

      // log.debug("respuesta", respuesta);

      if (info) {
        return respuesta[0];
      } else {
        return respuesta[0]?.ordenservicio;
      }

    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

  const obteneritemRelacionado = (id) => {
    let results = [];
    try {
      var customerSearchObj = search.create({
        type: "item",
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({
            name: "salesdescription",
            label: "Descripción",
          }),
          search.createColumn({
            name: "displayname",
            label: "Nombre de pantalla",
          }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            idItem: result.getValue({
              name: "internalid",
              label: "ID interno",
            }),
            descripcionItem: result.getValue({
              name: "salesdescription",
              label: "Descripción",
            }),
            displayname: result.getValue({
              name: "displayname",
              label: "Nombre de pantalla",
            }),
          });
        });
      });

      return results;
    } catch (error) {
      // log.debug("error", error);
      return results;
    }
  };

  const obtenerParametrosItems = (id) => {
    let results = [];
    try {
      var customerSearchObj = search.create({
        type: "customrecord_ht_pp_main_param_prod",
        filters: [
          [
            //["custrecord_ht_pp_parametrizacion_rela", "anyof", "118", "104", "157"], 
            ["custrecord_ht_pp_parametrizacion_rela", "anyof", "109", "188", "184", "111"],  // ! Cambio Galo 04/10/2024
            "AND",
            ["custrecord_ht_pp_parametrizacionid", "anyof", id],
          ],
        ],
        columns: [
          search.createColumn({ name: "custrecord_ht_pp_parametrizacionid" }),
          // search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela" }),
          search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", sort: search.Sort.ASC }),
          search.createColumn({ name: "custrecord_ht_pp_aplicacion" }),
          search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" }),
          search.createColumn({ name: "internalid" })
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

      // log.debug("-----", results);

      return results;
    } catch (error) {
      // log.debug("error", error);
      return results;
    }
  };

  const obtenerInformacionDispositivo = (id, condicion) => {
    let results = [];
    try {

      let filter = [];

      if (condicion) {
        filter = [["internalid", "is", id]];
      } else {
        filter = [["name", "is", id]];
      }

      var customerSearchObj = search.create({
        type: "customrecord_ht_record_mantchaser",
        filters: filter,
        columns: [
          search.createColumn({ name: "name", label: "Nombre" }),
          search.createColumn({ name: "scriptid", label: "ID de script" }),
          search.createColumn({
            name: "custrecord_ht_mc_enlace",
            label: "Enlace",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_ubicacion",
            label: "Ubicación",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_seriedispositivo",
            label: "Serie Dispositivo",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_modelo",
            label: "Modelo",
          }),
          search.createColumn({ name: "custrecord_ht_mc_imei", label: "IMEI" }),
          search.createColumn({
            name: "custrecord_ht_mc_firmware",
            label: "Firmware",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_script",
            label: "Script",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_servidor",
            label: "Servidor",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_tipodispositivo",
            label: "Tipo Dispositivo",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_unidad",
            label: "Unidad",
          }),
          search.createColumn({ name: "custrecord_ht_mc_vid" }),
          search.createColumn({
            name: "custrecord_ht_mc_macaddress",
            label: "MAC Address",
          }),
          search.createColumn({ name: "custrecord_ht_mc_sn", label: "SN" }),
          search.createColumn({
            name: "custrecord_ht_mc_estadolodispositivo",
            label: "Estado Dispositivo",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_celularsimcard",
            label: "Celular SIMCARD",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_operadora",
            label: "Operadora",
          }),
          search.createColumn({ name: "custrecord_ht_mc_ip", label: "IP" }),
          search.createColumn({ name: "custrecord_ht_mc_apn", label: "APN" }),
          search.createColumn({
            name: "custrecord_ht_mc_nocelularsim",
            label: "No. Celular SIM",
          }),
          search.createColumn({ name: "custrecord_ht_mc_icc", label: "ICC" }),
          search.createColumn({
            name: "custrecord_ht_mc_estadosimcard",
            label: "Estado SIMCARD",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_seriedispositivolojack",
            label: "Serie Dispositivo Lojack",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_codigoactivacion",
            label: "Código de Activación",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_codigorespuesta",
            label: "Código de Respuesta",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_estadolojack",
            label: "Estado Lojack",
          }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          let nombreModelo = obtenerNombreDispositivo(
            result.getValue({ name: "custrecord_ht_mc_modelo" })
          );
          let nombreScript = obtenerNombreScript(
            result.getValue({ name: "custrecord_ht_mc_script" })
          );

          results.push({
            nombre: result.getValue({ name: "name", label: "Nombre" }),
            idScript: result.getValue({
              name: "scriptid",
              label: "ID de script",
            }),
            enlace: result.getValue({
              name: "custrecord_ht_mc_enlace",
              label: "Enlace",
            }),
            ubicacion: result.getValue({
              name: "custrecord_ht_mc_ubicacion",
              label: "Ubicación",
            }),
            serieDispositivo: result.getValue({
              name: "custrecord_ht_mc_seriedispositivo",
              label: "Serie Dispositivo",
            }),
            modelo: nombreModelo || "",
            imei: result.getValue({
              name: "custrecord_ht_mc_imei",
              label: "IMEI",
            }),
            firmware: result.getText({
              name: "custrecord_ht_mc_firmware",
              label: "Firmware",
            }),
            script: nombreScript || "",
            servidor: result.getText({
              name: "custrecord_ht_mc_servidor",
              label: "Servidor",
            }),
            tipoDispositivo: result.getValue({
              name: "custrecord_ht_mc_tipodispositivo",
              label: "Tipo Dispositivo",
            }),
            unidad: result.getText({
              name: "custrecord_ht_mc_unidad",
              label: "Unidad",
            }),
            vid: result.getValue({ name: "custrecord_ht_mc_vid" }),
            macAddress: result.getValue({
              name: "custrecord_ht_mc_macaddress",
              label: "MAC Address",
            }),
            sn: result.getValue({ name: "custrecord_ht_mc_sn", label: "SN" }),
            estadoDispositivo: result.getValue({
              name: "custrecord_ht_mc_estadolodispositivo",
              label: "Estado Dispositivo",
            }),
            celularSIMCARD: result.getText({
              name: "custrecord_ht_mc_celularsimcard",
              label: "Celular SIMCARD",
            }),
            operadora: result.getText({
              name: "custrecord_ht_mc_operadora",
              label: "Operadora",
            }),
            ip: result.getValue({ name: "custrecord_ht_mc_ip", label: "IP" }),
            apn: result.getValue({
              name: "custrecord_ht_mc_apn",
              label: "APN",
            }),
            noCelularSIM: result.getValue({
              name: "custrecord_ht_mc_nocelularsim",
              label: "No. Celular SIM",
            }),
            icc: result.getValue({
              name: "custrecord_ht_mc_icc",
              label: "ICC",
            }),
            estadoSIMCARD: result.getValue({
              name: "custrecord_ht_mc_estadosimcard",
              label: "Estado SIMCARD",
            }),
            serieDispositivoLojack: result.getValue({
              name: "custrecord_ht_mc_seriedispositivolojack",
              label: "Serie Dispositivo Lojack",
            }),
            codigoActivacion: result.getValue({
              name: "custrecord_ht_mc_codigoactivacion",
              label: "Código de Activación",
            }),
            codigoRespuesta: result.getValue({
              name: "custrecord_ht_mc_codigorespuesta",
              label: "Código de Respuesta",
            }),
            estadoLojack: result.getValue({
              name: "custrecord_ht_mc_estadolojack",
              label: "Estado Lojack",
            }),
          });
        });
      });

      return results;
    } catch (error) {
      // log.debug("error", error);
      return results;
    }
  };

  /**
   * TODO: Funciones auxiliares.
   */

  function respuestaGlobales(opcion) {
    switch (opcion) {
      case "1":
        return {
          idordenservicio: "",
          ordenservicio: "",
          ubicacion: "",
          contacto: "",
          fuerataller: "",
          fueraciudad: "",
          comentario: "",
          idvehiculo: "",
          codigoVehiculo: "",
          vehiculo: "",
          motor: "",
          placa: "",
          chasis: "",
          marca: "",
          modelo: "",
          color: "",
          anio: "",
          cbu: "",
          idcliente: "",
          cliente: "",
          identificacion: "",
          direccion: "",
          telefono: "",
          switch1: "0",
          switch2: "0",
          puntoventa: "",
          turnoprogramado: "N",
          atendido: "N",
          strimagen: "NO",
        };
        break;
      case "2":
        return {
          idordentrabajo: "",
          ordentrabajo: "",
          idcliente: "",
          cliente: "",
          idvehiculo: "",
          vehiculo: "",
          codigoestado: "",
          descripcion: "",
          realizado: "",
          fecha: "",
          idordenservicio: "",
          ordenservicio: "",
          fechahoratrabajo: "",
          novedades: "",
          ubicacion: "",
          observaciones: "",
          item: "",
          ubicacion: "",
          consultorioOT: "",
          estadoOT: "",
          transaccionitem: "",
          producto: "",
          dispositivo: "",
          tipodispositivo: "",
          disp: "S",
          idturno: "",
          turno: "",
          actaent: "NO",
          accion: "001",
        };
        break;

      case "3":
        return {
          idservicio: "",
          nombreservicio: "",
          servicioami: "",
          //chequeo: "",
          grupo: "",
          nombregrupo: "",
          //cobertura: "",
        };
        break;

      case "4":
        return {
          codigo: "",
          descripcion: "",
        };
        break;

      case "5":
        return {
          tipo: "",
          serie: "",
          vid: "",
          ip: "0",
          codigo: "",
          operador: "",
          simcard: "0",
          celular: "",
          modelo: "",
          unidad: "",
          imei: "",
          activacion: "",
          respuesta: "",
          ordentrabajo: "0",
          ubicacion: "",
          servidor: "",
          firmware: "",
          script: "",
          apn: "",
        };
        break;

      case "9":
        return {
          idcliente: "",
          cliente: "",
          identificacion: "",
          idvehiculo: "",
          vehiculo: "",
          idordenservicio: "",
          ordenservicio: "",
          idEjecutiva: "",
          ejecutiva: "",
          correoejecutiva: "",
          idReferencia: "",
          referencia: "",
          correoreferecia: "",
          idRenovacion: "",
          renovacion: "",
          correorenovacion: "",
        };
        break;
    }
  }

  function createColumn(name, join = null, summary = null, label, sort) {
    if (sort == "ASC") {
      return search.createColumn({
        name: name,
        join: join,
        summary: summary,
        label: label,
        sort: "ASC",
      });
    } else {
      return search.createColumn({
        name: name,
        join: join,
        summary: summary,
        label: label,
      });
    }
  }

  function getValueOrEmpty(result, column) {
    const value = result.getValue(column);
    return value === "- None -" ? "" : value;
  }

  function getTextOrEmpty(result, column) {
    const value = result.getText(column);
    return value === "- None -" ? "" : value;
  }

  function obtenerFechaFormateadaRegistro(fecha) {
    const meses = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];
    try {
      const [dia, mes, año] = fecha
        .split("/")
        .map((parte, indice) =>
          indice === 1 ? parseInt(parte, 10) - 1 : parseInt(parte, 10)
        );
      const fechaObj = new Date(Date.UTC(año, mes, dia, 10, 1, 47, 579));
      return `${fechaObj.getUTCDate()} ${meses[fechaObj.getUTCMonth()]
        } ${fechaObj.getUTCFullYear()}`;
    } catch (error) {
      const hoy = new Date();
      return `${hoy.getDate()} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
    }
  }

  const obtenerParametroClasificacion = (id, caso) => {
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
      // log.debug("error", error);
      return results;
    }
  };

  // TODO: Obtener nombre del modelo del dispositivo.
  const obtenerNombreDispositivo = (id) => {
    try {
      let obtenerNombreModelo = search.create({
        type: "customrecord_ht_dd_modelodispositivo",
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({
            name: "custrecord_ht_dd_modelodispositivo_descr",
            label: "Nombre",
          }),
        ],
      });

      let results = [];
      let searchResult = obtenerNombreModelo.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            modelo: result.getValue({
              name: "custrecord_ht_dd_modelodispositivo_descr",
              label: "Nombre",
            }),
          });
        });
      });
      return results[0]?.modelo;
    } catch (e) {
      return "";
    }
  };

  // TODO: Obtener nombre del script del dispositivo.
  const obtenerNombreScript = (id) => {
    try {
      let obtenerNombreModelo = search.create({
        type: "customrecord_ht_mc_script",
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({
            name: "custrecord_ht_mc_script_descrip",
            label: "Nombre",
          }),
        ],
      });

      let results = [];
      let searchResult = obtenerNombreModelo.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            modelo: result.getValue({
              name: "custrecord_ht_mc_script_descrip",
              label: "Nombre",
            }),
          });
        });
      });
      return results[0]?.modelo;
    } catch (e) {
      return "";
    }

  };

  // TODO: Obtener nombre del script del dispositivo.
  const obtenerCorreo = (tabla, id) => {
    try {
      let obtenerNombreModelo = search.create({
        type: tabla,
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({
            name: "email",
            label: "correo",
          }),
        ],
      });

      let results = [];
      let searchResult = obtenerNombreModelo.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            correo: result.getValue({
              name: "email",
              label: "correo",
            }),
          });
        });
      });
      return results[0]?.correo;
    } catch (error) {
      return "";
    }

  };

  const obtenerItemParametrizadoPorBien = (IdOs) => {
    let results = [];

    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["internalid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", "2"], // Subsidiaria.
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          // "AND",
          // ["custbody_ht_so_bien", "anyof", IdVehiculo],
          "AND",
          // TaxItem
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "item" }),
          search.createColumn({ name: "rate" }),
          search.createColumn({ name: "displayname", join: "item" }),
          search.createColumn({ name: "internalid", join: "item" }),
          search.createColumn({ name: "type", join: "item" }),
          search.createColumn({ name: "custbody_ht_so_bien" }),
        ],
      });

      let searchResult = serviceOrderSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          let infoparametros = "";
          item = result.getValue({ name: "item" });
          infoparametros = obtenerParametrizacionItem(
            item,
            // [7, 2, 6, 75, 34, 36]
            [113, 104, 118, 107, 109, 153]
          );

          results.push({
            internalidOs: result.getValue({ name: "internalid" }),
            iditem: item,
            infoparametros: infoparametros,
            price: result.getValue({ name: "rate" }),
            displayname: result.getValue({ name: "displayname", join: "item" }),
            internalidItem: result.getValue({ name: "internalid", join: "item" }),
            type: result.getValue({ name: "type", join: "item" }),
            bien: result.getValue({ name: "custbody_ht_so_bien" }),
          });
        });
      });

      //// log.debug("results", results);

      // Clasificar items
      if (results.length > 0) {
        let clasificacion = ClasificarItems(results);
        return clasificacion;
      }

      return [];
    } catch (error) {
      // log.debug("error", error);
      return [];
    }
  };

  const obtenerItemParametrizadoPorOrden = (IdOs) => {
    let results = [];
    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          // ["internalid", "is", IdOs],
          ["tranid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", "2"], // Subsidiaria.
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["item.type", "noneof", "TaxItem"]
        ],
        columns: [
          search.createColumn({ name: "internalid", summary: "GROUP" }),
          search.createColumn({ name: "custbody_ht_so_bien", summary: "GROUP" }),
          search.createColumn({ name: "entity", summary: "GROUP" })

        ],
      });
      let searchResult = serviceOrderSearch.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          results.push({
            internalidOs: result.getValue({ name: "internalid", summary: "GROUP" }),
            cliente: result.getValue({ name: "entity", summary: "GROUP" }),
            bien: result.getValue({ name: "custbody_ht_so_bien", summary: "GROUP" }),
          });
        });
      });
      return results;
    } catch (error) {
      // log.debug("error", error);
      return [];
    }
  };

  const obtenerParametrizacionItem = (items, busquedaParametro) => {
    try {
      let data = [];
      let parametrosOpcionales;

      let filtro = [
        ["custrecord_ht_pp_aplicacion", "is", "T"],
        "AND",
        ["custrecord_ht_pp_parametrizacionid", "anyof", items],
      ];

      if (busquedaParametro !== undefined) {
        parametrosOpcionales = busquedaParametro?.toString();
        filtro.push("AND", [
          "custrecord_ht_pp_parametrizacion_rela",
          "anyof",
          parametrosOpcionales.split(","),
        ]);
      }

      let busqueda = search.create({
        type: "customrecord_ht_pp_main_param_prod",
        filters: filtro,
        columns: [
          search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
          search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
          search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
          search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
        ],
      });

      let resultCount = busqueda.runPaged().count;

      if (resultCount > 0) {
        let pageData = busqueda.runPaged({ pageSize: 1000 });
        pageData.pageRanges.forEach((pageRange) => {
          let page = pageData.fetch({ index: pageRange.index });
          page.data.forEach((result) => {
            let columns = result.columns;
            let parametrizacion = {
              Param: result.getValue(columns[2]) || "",
              ParamId: result.getValue(columns[0]) || "",
              Valor: result.getValue(columns[3]) || "",
              ValorText: result.getText(columns[1]) || "",
              ValorId: result.getValue(columns[1]) || "",
            };
            data.push(parametrizacion);
          });
        });
      }

      return data;
    } catch (error) {
      log.error("Error en obtenerParametrizacionItem", error);
      return [];
    }
  };

  const ClasificarItems = (data) => {
    try {
      const defaultClassification = {
        etiqueta: "SINCONTEMPLAR",
        valor: "SCTR",
        familia: "SCTR-SINCONTEMPLAR",
        items: [],
      };

      const classification = [];

      data.forEach((item) => {
        const infoparametros = item.infoparametros || [];
        const ppsParam = infoparametros.find((param) => param.Param === "PPS");
        const famParam = infoparametros.find((param) => param.Param === "FAM");
        const adpParam = infoparametros.find((param) => param.Param === "ADP");
        const ttrParam = infoparametros.find((param) => param.Param === "TTR");

        const pps = ppsParam ? ppsParam.Valor : "N";
        const idpps = ppsParam ? ppsParam.ParamId : 0;
        const adp = adpParam ? adpParam.Valor : "001";
        const etiqueta = famParam
          ? famParam.Param
          : defaultClassification.etiqueta;
        const valor = famParam ? famParam.Valor : defaultClassification.valor;
        const familia = famParam
          ? famParam.ValorText
          : defaultClassification.familia;
        const idfamilia = famParam ? famParam.ParamId : 0;
        const valorTTR = ttrParam ? ttrParam.ValorId : 0;
        const valorfamilia = famParam
          ? famParam.ValorId
          : defaultClassification.familia;

        const familiaGrupo = famParam ? famParam.Valor : defaultClassification.familia;


        let group = classification.find(
          (group) => group.etiqueta === etiqueta && group.valor === valor
        );

        if (!group) {
          group = {
            etiqueta,
            valor,
            familia,
            items: [],
          };
          classification.push(group);
        }

        group.items.push({
          idbien: item.bien,
          internalidOs: item.internalidOs,
          iditem: item.iditem,
          displayname: item.displayname,
          type: item.type,
          pps,
          adp,
          idfamilia,
          idpps,
          valorTTR,
          valorfamilia,
          familiaGrupo
        });
      });

      return classification;
    } catch (error) {
      console.error("Error al clasificar los items:", error);
      return [];
    }
  };

  const actualizarOrdenTrabajo = (id) => {
    try {

      // Buscar todas las OT que tiene la orden de servicio y Actualizar el campo estadolodispositivo a "Enviado a Taller" (valor 2)
      let workOrderSearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: [
          ["custrecord_ht_ot_orden_servicio", "anyof", id],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_ot_serieproductoasignacion" }),
          search.createColumn({ name: "custrecord_ht_ot_vehiculo" }),
          search.createColumn({ name: "custrecord_ht_ot_item" }),
          search.createColumn({ name: "custrecord_ht_ot_itemrelacionado" })
        ],
      });

      let searchResult = workOrderSearch.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {

        let myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {

          let idOT = result.getValue({ name: "internalid" });
          let item = result.getValue({ name: "custrecord_ht_ot_item" });
          let itemRelacionado = result.getValue({ name: "custrecord_ht_ot_itemrelacionado" });
          let ot_vehiculo = result.getValue({ name: "custrecord_ht_ot_vehiculo" });
          let ot_serieproductoasignacion = result.getValue({ name: "custrecord_ht_ot_serieproductoasignacion" });

          let itemSelecionado = itemRelacionado ? itemRelacionado : item;
          let parametrosItem = obtenerParametrizacionItem(itemSelecionado, [130]); // Obtener FAM
          let familiaIdentificada = parametrosItem[0].ValorId || "";

          if (familiaIdentificada && ot_vehiculo) {
            let infCobertura = consultaCoberturaGeneral(ot_vehiculo, familiaIdentificada);
            log.debug("infCobertura 11/05/2026", infCobertura);

            if (infCobertura.length > 0 && !ot_serieproductoasignacion && infCobertura[0]?.numeroserieproducto) {

              try {
                record.submitFields({
                  type: "customrecord_ht_record_ordentrabajo",
                  id: idOT,
                  values: {
                    custrecord_ht_ot_serieproductoasignacion: infCobertura[0]?.numeroserieproducto || "",
                  },
                });
                log.debug("Orden de trabajo actualizada con la serie del producto asignado", { idOT, serie: infCobertura[0].numeroserieproducto });
              } catch (error) {
                log.error("Error al actualizar la orden de trabajo con la serie del producto asignado", { idOT, error });
              }

            }

          }

        });
      });

    } catch (error) {
      log.error("Error al actualizar la orden de trabajo", error);
    }

  };


  function consultaCoberturaGeneral(IdVehiculo, idfamilia) {

    if (!IdVehiculo || !idfamilia) {
      throw new Error("No se encontró la cobertura, falta información");
    }

    let results = [];

    let filtro = [
      ["custrecord_ht_co_bien", "anyof", IdVehiculo],
      "AND",
      ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
      "AND",
      ["isinactive", "is", "F"],
      "AND",
      ["custrecord_ht_co_estado_cobertura", "noneof", "5"],
      "AND",
      ["custrecord_ht_co_subsidiaria", "anyof", 2]
    ];

    try {

      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: filtro,
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
          search.createColumn({ name: "custrecord_ht_co_estado" })
        ]
      });

      let searchResult = CoberturaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {

        let myPage = searchResult.fetch({
          index: pageRange.index
        });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
            clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
            bien: result.getValue({ name: "custrecord_ht_co_bien" }),
            producto: result.getValue({ name: "custrecord_ht_co_producto" }),
            coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            estado_dispositivo: result.getValue({ name: "custrecord_ht_co_estado" }),
            propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            familia: result.getValue({ name: "custrecord_ht_co_familia_prod" })
          });

        });

      });

      return results;

    } catch (error) {
      log.debug("error", error);
      throw error;
    }
  }


  function tieneAlMenosUnEnsamble(id) {

    if (!id) {
      return;
    }

    let sqlQuery = `
      SELECT DISTINCT
          B.id AS ensamble_id
      FROM Transaction SO

      INNER JOIN NextTransactionLineLink L1
          ON L1.PreviousDoc = SO.id

      INNER JOIN Transaction WO
          ON WO.id = L1.NextDoc
         AND WO.type = 'WorkOrd'

      INNER JOIN NextTransactionLineLink L2
          ON L2.PreviousDoc = WO.id

      INNER JOIN Transaction B
          ON B.id = L2.NextDoc
         AND B.type = 'Build'

      WHERE SO.id = ?
  `;

    let resultSet = query.runSuiteQL({
      query: sqlQuery,
      params: [id]
    });

    let results = resultSet.asMappedResults();

    if (results.length > 0) {
      throw new Error(
        "No se puede continuar porque la Orden de Servicio ya tiene un Ensamble generado."
      );
    }
  }

  return {
    get: _get,
  };
});
