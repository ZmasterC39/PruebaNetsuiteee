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
  const _get = (requestParams) => {
    try {
      let opcion = requestParams.opcion;

      switch (opcion) {
        case "1":
          log.debug({ title: "Caso 1", details: requestParams });

          try {
            let condicion = requestParams?.ordenservicio || "";

            if (condicion) {
              let data = ConsultaCaso1(condicion);

              log.debug({ title: "respuesta 1", details: data });
              return JSON.stringify({ results: data });
            } else {
              let idOS = requestParams.idordenservicio;
              let idorservicio = getOrdenService(idOS);
              let data = ConsultaCaso1(idorservicio);

              log.debug({ title: "respuesta 1", details: data });
              return JSON.stringify({ results: data });
            }
          } catch (e) {
            log.error("Error respuesta 1", e);
            return JSON.stringify({ results: [respuestaGlobales("1")] });
          }

        case "2":
          log.debug({ title: "Caso 2", details: requestParams });

          try {
            let condicion = requestParams?.ordenservicio || "";

            if (condicion) {
              let data = ConsultaCaso2(condicion);

              log.debug({ title: "respuesta 2", details: data });
              return JSON.stringify({ results: data });
            } else {
              let idOS = requestParams.idordenservicio;
              let idorservicio = getOrdenService(idOS);
              let data = ConsultaCaso2(idorservicio);

              log.debug({ title: "respuesta 2", details: data });
              return JSON.stringify({ results: data });
            }
          } catch (e) {
            log.error("Error respuesta 2", e);
            return JSON.stringify({ results: [respuestaGlobales("2")] });
          }

        case "3":
          log.debug({ title: "Caso 3", details: requestParams });

          try {
            let condicion = requestParams?.ordenservicio || "";
            if (condicion) {
              let data = ConsultaCaso3(condicion);

              log.debug({ title: "respuesta 3", details: data });
              return JSON.stringify({ results: data });
            } else {
              let idOS = requestParams.idordenservicio;
              let idorservicio = getOrdenService(idOS);
              let data = ConsultaCaso3(idorservicio);

              log.debug({ title: "respuesta 3", details: data });
              return JSON.stringify({ results: data });
            }
          } catch (e) {
            log.error("Error respuesta 3", e);
            return JSON.stringify({ results: [respuestaGlobales("3")] });
          }

        default:
          return JSON.stringify({ results: [] });
      }
    } catch (error) {
      // TODO: Log de errores.
      log.debug({ title: "Error", details: error });
      return JSON.stringify({ results: [] });
    }
  };

  /*
   * Funciones de búsqueda General.
   */
  function ConsultaCaso1(id) {
    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
    ];
    try {
      let ordenservicio = id;

      if (ordenservicio && ordenservicio?.trim() !== "") {
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
        //   log.debug("--", error)
        // }

      }
      filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "2"]); // TODO: Solo estado Chequeado

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          createColumn(
            "internalid",
            "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
            "GROUP",
            "ID interno"
          ),
          createColumn(
            "custrecord_ht_ot_orden_serivicio_txt",
            null,
            "GROUP",
            "HT OT Orden de Servicio TXT"
          ),
          createColumn(
            "custrecord_ht_ot_fechatrabajoasignacion",
            null,
            "GROUP",
            "Fecha de Trabajo"
          ),
          createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
          createColumn(
            "custrecord_ht_ot_tecnicoasignacion",
            null,
            "GROUP",
            "Técnico"
          ),
          createColumn("internalid", null, "GROUP", "Internal ID"),
          createColumn("name", null, "GROUP", "ID", "ASC"),
          createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [];

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Obtener ID de la orden de servicio.
          let idOrdenServic = getValueOrEmpty(result, {
            name: "internalid",
            join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
            summary: "GROUP",
          });

          // 2. Orden de servicio.
          let ordenServicio = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_orden_serivicio_txt",
            summary: "GROUP",
          });

          // 3. Fecha del Trabajo.
          let fecha = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_fechatrabajoasignacion",
            summary: "GROUP",
          });

          // 4. Grupo de Trabajo.
          let newitem = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });
          // obtenerParametrosItems(newitem, "107")[0]?.valor || 0;

          let grupoTrabajo =
            obtenerParametrosItems(newitem, "130")[0]?.valor || 0;

          // 5. Item
          let item = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });

          // 6. Descripción del Item
          let dataitem = obteneritemRelacionado(newitem);

          // 7. Usuario de Chequeo
          let idusuarioChequeo = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_tecnicoasignacion",
            summary: "GROUP",
          });

          let usuarioChequeo = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_tecnicoasignacion",
            summary: "GROUP",
          });

          // 8. Usuario de Instalación
          let usuarioInstalacion = "";

          // 9. ID de la Orden de Trabajo
          let idOrdenTrabajo = getValueOrEmpty(result, {
            name: "internalid",
            summary: "GROUP",
          });

          // 10. Orden de Trabajo
          let ordentrabajo = getValueOrEmpty(result, {
            name: "name",
            summary: "GROUP",
          });

          // 11. Estado de la Orden de Trabajo
          let estadoOT = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_estado",
            summary: "GROUP",
          });

          // 12. Acción
          // let dataitemparam = obtenerParametrosItems(newitem, "104");
          let dataitemparam = obtenerParametrosItems(newitem, "109");

          // 13. TAG
          let accion = dataitemparam[0]?.valor?.slice(0, 3) || "";
          // let TAG = obtenerParametrosItems(newitem, "116")[0]?.valor || "";
          let TAG = obtenerParametrosItems(newitem, "179")[0]?.valor || "";

          // TODO: Validar si el TAG es diferente a LOJACK
          if (TAG !== "LOJ - LOJACK") {
            results.push({
              idordenservicio: idOrdenServic,
              ordenservicio: ordenServicio.replace("OS", "") || "",
              fecha: obtenerFechaFormateadaRegistro(fecha),
              grupoTrabajo: grupoTrabajo.split("-")[0].trim() || "",
              item: item,
              descripcion: dataitem[0]?.displayname || "",
              idusuariochequeo: idusuarioChequeo,
              usuariochequeo: usuarioChequeo,
              usuarioinstalacion: usuarioInstalacion,
              idordentrabajo: idOrdenTrabajo,
              ordentrabajo: ordentrabajo,
              estadoOT: estadoOT.split("-")[0].trim() || "",
              accion: accion,
            });
          }
        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo", e);
      return [];
    }
  }

  function ConsultaCaso2(id) {
    let primeraOT = null;

    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
      'AND',
      ['custrecord_ht_ot_ordenfabricacion', 'noneof', '@NONE@'],
    ];
    try {
      let ordenservicio = id;

      if (ordenservicio && ordenservicio?.trim() !== "") {
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
        //   log.debug("--", error)
        // }

      }
      filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "2"]); // TODO: Solo estado Chequeado

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          createColumn(
            "internalid",
            "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
            "GROUP",
            "ID interno"
          ),
          createColumn(
            "custrecord_ht_ot_orden_serivicio_txt",
            null,
            "GROUP",
            "HT OT Orden de Servicio TXT"
          ),
          createColumn(
            "custrecord_ht_ot_fechatrabajoasignacion",
            null,
            "GROUP",
            "Fecha de Trabajo"
          ),
          createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
          createColumn(
            "custrecord_ht_ot_tecnicoasignacion",
            null,
            "GROUP",
            "Técnico"
          ),
          createColumn("internalid", null, "GROUP", "Internal ID"),
          createColumn("name", null, "GROUP", "ID", "ASC"),
          createColumn("custrecord_ht_ot_estado", null, "GROUP", "Estado OT"),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [];

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Tipo de Trabajo.
          let newitem = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });
          // let trabajo = obtenerParametrosItems(newitem, "118")[0]?.valor || "";
          let trabajo = obtenerParametrosItems(newitem, "188")[0]?.valor || "";

          // 2. Item
          let item = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });

          // 3. Descripción del Item
          let dataitem = obteneritemRelacionado(newitem);

          // 4. Grupo de Trabajo.
          // let grupoTrabajo =
          //   obtenerParametrosItems(newitem, "107")[0]?.valor || "";

          let grupoTrabajo =
            obtenerParametrosItems(newitem, "130")[0]?.valor || "";

          // 5. ID de la Orden de Trabajo
          let idOrdenTrabajo = getValueOrEmpty(result, {
            name: "internalid",
            summary: "GROUP",
          });

          // 6. Orden de Trabajo
          let ordentrabajo = getValueOrEmpty(result, {
            name: "name",
            summary: "GROUP",
          });

          // 7. Estado de la Orden de Trabajo
          let estadoOT = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_estado",
            summary: "GROUP",
          });

          // 8. Acción
          // let accion =
          //   obtenerParametrosItems(newitem, "104")[0]?.valor?.slice(0, 3) || "";

          let accion =
            obtenerParametrosItems(newitem, "109")[0]?.valor?.slice(0, 3) || "";

          // 9. TAG
          // let TAG = obtenerParametrosItems(newitem, "116")[0]?.valor || "";
          let TAG = obtenerParametrosItems(newitem, "179")[0]?.valor || "";


          // TODO: Validar si el TAG es diferente a LOJACK, solo monitoreo
          // if (TAG !== "LOJ - LOJACK") {
          //   repositorio().etiqueta_parametros.forEach(function (dataAux) {
          //     results.push({
          //       secuencial: dataAux.secuencial,
          //       item: item,
          //       descripcion: dataitem[0]?.displayname || "",
          //       trabajo: trabajo?.split("-")[0].trim() || "",
          //       idordentrabajo: idOrdenTrabajo,
          //       ordentrabajo: ordentrabajo,
          //       sucursal: "001",
          //       par: dataAux.parametro,
          //       cal: "001",
          //       grupoTrabajo: grupoTrabajo?.split("-")[0].trim() || "",
          //       estado: estadoOT?.split("-")[0].trim() || "",
          //       accion: accion,
          //       tpar: dataAux.tpa,
          //     });
          //   });
          // }

          // TODO: Validar si el TAG es diferente a LOJACK, solo monitoreo
          if (TAG !== "LOJ - LOJACK") {

            // Guardar la primera OT encontrada
            if (!primeraOT) {
              primeraOT = ordentrabajo;
            }

            // Ignorar otras OT diferentes
            if (primeraOT !== ordentrabajo) {
              return;
            }

            repositorio().etiqueta_parametros.forEach(function (dataAux) {

              // ajuste 01/07/2026 - Se considera Isntalacion y Chequeo
              // if (accion == "001" || accion == "006") {
                results.push({
                  secuencial: dataAux.secuencial,
                  item: item,
                  descripcion: dataitem[0]?.displayname || "",
                  trabajo: trabajo?.split("-")[0].trim() || "",
                  idordentrabajo: idOrdenTrabajo,
                  ordentrabajo: ordentrabajo,
                  sucursal: "001",
                  par: dataAux.parametro,
                  cal: "001",
                  grupoTrabajo: grupoTrabajo?.split("-")[0].trim() || "",
                  estado: estadoOT?.split("-")[0].trim() || "",
                  accion: accion,
                  tpar: dataAux.tpa,
                });

              // }

            });
          }

        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo", e);
      return [];
    }
  }

  function ConsultaCaso3(id) {
    const filter = [
      ["custrecord_ht_ot_orden_servicio.class", "noneof", "@NONE@"],
      "AND",
      ["custrecord_ht_ot_orden_servicio.department", "noneof", "@NONE@"],
    ];
    try {
      let ordenservicio = id;

      if (ordenservicio && ordenservicio?.trim() !== "") {
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
        //   log.debug("--", error)
        // }

      }
      filter.push("AND", ["custrecord_ht_ot_estado", "anyof", "2"]); // TODO: Solo estado Chequeado

      const mySearch = search.create({
        type: "customrecord_ht_record_ordentrabajo",
        filters: filter,
        columns: [
          createColumn("custrecord_ht_ot_cliente_id", null, "GROUP", "Cliente"),
          createColumn("custrecord_ht_ot_vehiculo", null, "GROUP", "Vehículo"),
          createColumn("altname", "CUSTRECORD_HT_OT_VEHICULO", "GROUP", "Vehículo"),
          createColumn("custrecord_ht_ot_serieproductoasignacion", null, "GROUP", "Serie Producto"),
          createColumn("custrecord_ht_ot_item", null, "GROUP", "Item"),
        ],
      });

      let myPagedData = mySearch.runPaged();

      let results = [];

      myPagedData.pageRanges.forEach(function (pageRange) {
        var myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // 1. Item (id interno)
          let newitem = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_item",
            summary: "GROUP",
          });

          // 2. Cliente (id interno)
          let idCliente = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_cliente_id",
            summary: "GROUP",
          });

          // 3. Vehículo (id interno)
          let idvehiculo = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_vehiculo",
            summary: "GROUP",
          });

          // 4. Vehículo (Nombre)
          let vehiculo = getValueOrEmpty(result, {
            name: "altname",
            join: "CUSTRECORD_HT_OT_VEHICULO",
            summary: "GROUP",
          });

          // 5. Obtener información del cliente.
          let datacliente = getCliente(idCliente);

          // 6. Informacion de la etiqueta TAG.
          // let TAG = obtenerParametrosItems(newitem, "116")[0]?.valor || "";
          let TAG = obtenerParametrosItems(newitem, "179")[0]?.valor || "";

          // 7. Informacion de la etiqueta FAM
          // let FAM = obtenerParametrosItems(newitem, "107")[0]?.valor || "";
          let FAM = obtenerParametrosItems(newitem, "130")[0]?.valor || "";

          // 8. Informacion de la etiqueta TTR
          // let TTR = obtenerParametrosItems(newitem, "118")[0]?.valor || "";
          let TTR = obtenerParametrosItems(newitem, "188")[0]?.valor || "";

          let PHV = obtenerParametrosItems(newitem, "158")[0]?.valor || "N - NO";

          log.debug({ title: "PHV", details: PHV });



          // 9. Serie del Producto
          let iddispositivo = getValueOrEmpty(result, {
            name: "custrecord_ht_ot_serieproductoasignacion",
            summary: "GROUP",
          });

          // 10. Nombre del Producto
          let dispositivoname = getTextOrEmpty(result, {
            name: "custrecord_ht_ot_serieproductoasignacion",
            summary: "GROUP",
          });

          // 11. Obtener información del Dispositivo.
          let dataDispositivo

          // TODO: Validar si el TAG es diferente a LOJACK, solo monitoreo
          if (TAG !== "LOJ - LOJACK") {

            if (TAG !== "OPE - BLOQUEO DE OPERACIONES (SIN FAMILIA)") {

              if (PHV === "S - SI") {
                dataDispositivo = obtenerInformacionDispositivo(iddispositivo);
                results.push({
                  idcliente: idCliente,
                  identificacion: datacliente?.identificacion || "",
                  cliente: datacliente?.cliente || "",
                  codigovehiculo: idvehiculo,
                  vehiculo: vehiculo,
                  producto: FAM.split("-")[1].trim(),
                  tipotrabajo: TTR.split("-")[0].trim(),
                  trabajo: FAM.split("-")[0].trim(),
                  idserie: iddispositivo,
                  serie: dispositivoname,
                  idmodelo: dataDispositivo[0]?.idmodelo || "",
                  modelo: dataDispositivo[0]?.modelo || "",
                  idmarca: dataDispositivo[0]?.idunidad || "", // Marca (Validar)
                  marca: dataDispositivo[0]?.unidad || "",
                  vid: dataDispositivo[0]?.vid || "",
                  ami: "N",
                  script: dataDispositivo[0]?.script || "",
                });

              }

            }
          }
        });
      });

      return results;
    } catch (e) {
      log.error("Error en ObtenerOrdenTrabajo", e);
      return [];
    }
  }

  /*
   * Funciones de búsqueda
   */

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

  const getOrdenService = (id) => {
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
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
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
          });
        });
      });

      return respuesta[0]?.ordenservicio;
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
      log.debug("error", error);
      return results;
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

  const obtenerInformacionDispositivo = (id) => {
    let results = [];
    if (!id) return results
    try {
      var customerSearchObj = search.create({
        type: "customrecord_ht_record_mantchaser",
        filters: [["internalid", "anyof", id]],
        columns: [
          search.createColumn({
            name: "custrecord_ht_mc_modelo",
            label: "Modelo",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_script",
            label: "Script",
          }),
          search.createColumn({
            name: "custrecord_ht_mc_unidad",
            label: "Unidad",
          }),
          search.createColumn({ name: "custrecord_ht_mc_vid" }),
        ],
      });

      var searchResult = customerSearchObj.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          let nombreModelo = obtenerNombreDispositivo((result.getValue({ name: "custrecord_ht_mc_modelo" })) || 0);
          let nombreScript = obtenerNombreScript(result.getValue({ name: "custrecord_ht_mc_script" }));

          results.push({
            idmodelo: result.getValue({
              name: "custrecord_ht_mc_modelo",
              label: "Modelo",
            }),
            idunidad: result.getValue({
              name: "custrecord_ht_mc_unidad",
              label: "Unidad",
            }),
            unidad: result.getText({
              name: "custrecord_ht_mc_unidad",
              label: "Unidad",
            }),
            vid: result.getValue({ name: "custrecord_ht_mc_vid" }),
            modelo: nombreModelo || "",
            script: nombreScript || "",
          });
        });
      });

      return results;
    } catch (error) {
      log.debug("error", error);
      return results;
    }
  };

  // TODO: Obtener nombre del modelo del dispositivo.
  const obtenerNombreDispositivo = (id) => {
    let obtenerNombreModelo = search.create({
      type: "customrecord_ht_dd_modelodispositivo",
      filters: [["internalid", "anyof", id]],
      columns: [
        search.createColumn({ name: "custrecord_ht_dd_modelodispositivo_descr", label: "Nombre" }),
      ],
    });

    let results = [];
    let searchResult = obtenerNombreModelo.runPaged();

    searchResult.pageRanges.forEach(function (pageRange) {
      var myPage = searchResult.fetch({ index: pageRange.index });

      myPage.data.forEach(function (result) {
        results.push({
          modelo: result.getValue({ name: "custrecord_ht_dd_modelodispositivo_descr", label: "Nombre" }),
        });
      });
    });
    return results[0]?.modelo;
  };

  // TODO: Obtener nombre del script del dispositivo.
  const obtenerNombreScript = (id) => {
    let obtenerNombreModelo = search.create({
      type: "customrecord_ht_mc_script",
      filters: [["internalid", "anyof", id]],
      columns: [
        search.createColumn({ name: "custrecord_ht_mc_script_descrip", label: "Nombre" }),
      ],
    });

    let results = [];
    let searchResult = obtenerNombreModelo.runPaged();

    searchResult.pageRanges.forEach(function (pageRange) {
      var myPage = searchResult.fetch({ index: pageRange.index });

      myPage.data.forEach(function (result) {
        results.push({
          modelo: result.getValue({ name: "custrecord_ht_mc_script_descrip", label: "Nombre" }),
        });
      });
    });
    return results[0]?.modelo;
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
          fechaChequeo: "",
          grupoTrabajo: "",
          item: "",
          descripcion: "",
          usuarioChequeo: "",
          usuarioInstalacion: "",
          idordentrabajo: "",
          ordentrabajo: "",
          estadoOT: "",
          accion: "",
        };
        break;
      case "2":
        return {
          secuencial: "",
          item: "",
          descripcion: "",
          trabajo: "",
          idordentrabajo: "",
          ordentrabajo: "",
          sucursal: "",
          par: "",
          cal: "",
          grupoTrabajo: "",
          estado: "",
          accion: "",
          tpar: "",
        };
        break;

      case "3":
        return {
          idcliente: "",
          identificacion: "",
          cliente: "",
          codigovehiculo: "",
          vehiculo: "",
          producto: "", // TAG
          tipotrabajo: "", // CLO
          idserie: "", //
          serie: "", // Serie Dispositivo
          idmodelo: "", // Modelo
          modelo: "", // Modelo
          idmarca: "", // Marca
          marca: "", // Marca
          vid: "", // VID
          ami: "",
        };
        break;
    }
  };

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
  };

  function getValueOrEmpty(result, column) {
    const value = result.getValue(column);
    return value === "- None -" ? "" : value;
  };

  function getTextOrEmpty(result, column) {
    const value = result.getText(column);
    return value === "- None -" ? "" : value;
  };

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
  };

  function repositorio() {
    const etiqueta_repositorio = [
      {
        Tag: "FAM - FAMILIA DE PRODUCTOS",
        IdTag: "75",
        valor: "HU - HUNTER-RASTREO",
      },
      {
        Tag: "GOC - GERERA SOLICITUD DE PAG. COMISIONES ",
        IdTag: "30",
        valor: "S - SI",
      },
      {
        Tag: "GOT - GENERA SOLICITUD DE TRABAJO",
        IdTag: "32",
        valor: "S - SI",
      },
      {
        Tag: "PCD - PIDE CODIGO DE ORIGEN",
        IdTag: "51",
        valor: "N - NO",
      },
      {
        Tag: "PHV - PRODUCTO HABILITADO PARA LA VENTA",
        IdTag: "57",
        valor: "S - SI",
      },
      {
        Tag: "PNB - PIDE NUMBER BOX",
        IdTag: "64",
        valor: "S - SI",
      },
      {
        Tag: "PPC - PRODUCTO PERMITIDO COTIZADOR",
        IdTag: "65",
        valor: "S - SI",
      },
      {
        Tag: "TAG - TIPO DE AGRUPACION DE PRODUCTO",
        IdTag: "103",
        valor: "LOJ - LOJACK",
      },
      {
        Tag: "TCH - TIPO DE CHEQUEO O/T",
        IdTag: "5",
        valor: "001 - CHEQUEO H. LOJACK",
      },
      {
        Tag: "TMI - TIPO DE MOVIMIENTO DE INVENTARIO",
        IdTag: "80",
        valor: "004 - EGRESO",
      },
      {
        Tag: "ADP - ACCION DEL PRODUCTO",
        IdTag: "2",
        valor: "001 - INST. DISPOSITIVO",
      },
      {
        Tag: "CPR - CONVERSION DE PRODUCTO-UPGRADE",
        IdTag: "24",
        valor: "N - NO",
      },
      {
        Tag: "GOF - GENERA SOLICITUD DE FACTURACION",
        IdTag: "31",
        valor: "S - SI",
      },
      {
        Tag: "PED - PIDE ESTADO DISPOSITIVO",
        IdTag: "54",
        valor: "N - NO",
      },
      {
        Tag: "UDP - UTILIZA PARALIZADOR",
        IdTag: "85",
        valor: "S - SI",
      },
      {
        Tag: "CPI - CONTROL DE PRODUCTOS INSTALADOS",
        IdTag: "23",
        valor: "S - SI",
      },
      {
        Tag: "RLP - REVISION DE NIVEL DE PRECIOS",
        IdTag: "101",
        valor: "S - SI",
      },
      {
        Tag: "VBI - VALIDACION DE BIEN INGRESADO",
        IdTag: "102",
        valor: "S - SI",
      },
      {
        Tag: "TTR - TIPO TRANSACCION",
        IdTag: "6",
        valor: "IHL - INSTALACIÓN HUNTER LOJACK",
      },
    ];

    const etiqueta_parametros = [
      {
        secuencial: "001",
        parametro: "001 - ADECUADO TIEMPO DE TRABAJO",
        tpa: "TEC",
      },
      {
        secuencial: "002",
        parametro: "002 - APROPIADA SELECCIÓN DE CABLES",
        tpa: "TEC",
      },
      {
        secuencial: "003",
        parametro: "003 - ADECUADA CONEXIÓN DE CABLES",
        tpa: "TEC",
      },
      {
        secuencial: "004",
        parametro: "004 - CORRECTA COLOCACIÓN DE DE PARTES Y PIEZAS",
        tpa: "PRO",
      },
      {
        secuencial: "005",
        parametro: "005 - OPTIMA SEÑAL DE LOS PUNTOS",
        tpa: "PRO",
      },
      {
        secuencial: "007",
        parametro: "007 - SISTEMA DE RESPALDO EN BUEN ESTADO",
        tpa: "PRO",
      },
      {
        secuencial: "008",
        parametro: "008 - ADECUADA FRECUENCIA DE REPORTE",
        tpa: "PRO",
      },
      {
        secuencial: "009",
        parametro: "009 - CORRECTA UBICACION DE GPS",
        tpa: "PRO",
      },
      {
        secuencial: "010",
        parametro: "010 - ADECUADO FUNCIONAMIENTO DE SERVICIOS Y FUNCIONES",
        tpa: "PRO",
      },
      {
        secuencial: "011",
        parametro: "011 - APROPIADA INSTALACIÓN DE CABLEADO",
        tpa: "TEC",
      },
    ];

    return {
      etiqueta_repositorio,
      etiqueta_parametros,
    };
  };

  return {
    get: _get,
  };
});