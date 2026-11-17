/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta al recibir una petición RESTlet
Objetivo: Realizar la consulta y reserva de ítems como SIMCARD y HT Dispositivos para el convenio CLARO-CARSEG.
Script: https://7451241.app.netsuite.com/app/common/scripting/script.nl?id=5276
Ambiente: Producción
*/

define(["N/https", "N/log", "N/search", "N/record", "N/query", 'N/runtime'], (https, log, search, record, query, runtime) => {

  const _get = (requestContext) => {

    log.debug("requestContext", requestContext)

    switch (requestContext?.opcion) {
      case "1":
        // try {
        //   // log.debug("Get 1", requestContext);
        //   return JSON.stringify(GetReserva(requestContext));
        // } catch (e) {
        //   log.debug("Error respuesta Get 1", e);
        //   return JSON.stringify({ results: [], id: 0, status: 400, message: e.message });
        // }
        try {
          return JSON.stringify(GetReserva2(requestContext));
        } catch (e) {
          log.debug("Error respuesta Get 4", e);
          return JSON.stringify({ results: [], id: 0, status: 400, message: e.message });
        }

      case "2":
        try {
          // log.debug("Get 2", requestContext);
          return JSON.stringify(GetAnular(requestContext));
        } catch (e) {
          log.debug("Error respuesta Get 2", e);
          return JSON.stringify({ results: [], id: 0, status: 400, message: e.message });
        }

      case "3":
        try {
          // log.debug("Get 2", requestContext);
          return JSON.stringify(GetUsoOrdenServicio(requestContext));
        } catch (e) {
          log.debug("Error respuesta Get 2", e);
          return JSON.stringify({ results: [], id: 0, status: 400, message: e.message });
        }

      case "4":
        try {
          return JSON.stringify(GetReserva2(requestContext));
        } catch (e) {
          log.debug("Error respuesta Get 4", e);
          return JSON.stringify({ results: [], id: 0, status: 400, message: e.message });
        }

      default:
        log.debug({ title: "default Get", details: requestContext });
        return JSON.stringify({ results: [], id: 0, status: 400, message: "Opción no válida" });
    }
  };

  // Get Reserva
  const GetReserva = (requestContext) => {
    try {
      // const ID_BODEGA = '654';           // B262 COM.GYE SMART
      // const ID_ITEM = '22059';           // 12788 Queclink GV58LAU                     Disponible 10 unidades  //! 18/11/2024
      // const ID_ITEM_SIMCARD = '43868';   // 13472 - SIMCARD PARA PRODUCTO SMARTCAR     Disponible 0 unidades   //! 18/10/2024
      // const ID_ESTADO_RESERVA = '9';     // Estado Reservado
      // const ID_ESTADO_DISPONIBLE = '5';  // Estado Disponible

      const ID_BODEGA = '654';
      const ID_ITEM_DISPOSITIVO = '22059'; // Dispositivos
      const ID_ITEM_SIMCARD = '43868'; // SimCard

      const ID_ESTADO_RESERVA_DISPOSITIVO = '9'; // Estado Reservado
      const ID_ESTADO_DISPONIBLE_DISPOSITIVO = '5'; // Estado Disponible

      const ID_ESTADO_RESERVA_SIMCARD = '6'; // Estado Reservado
      const ID_ESTADO_DISPONIBLE_SIMCARD = '7'; // Estado Disponible
      // const ID_ESTADO_DISPONIBLE_SIMCARD = '1'; // Estado Disponible


      // let reservaDispositivo = true;
      // let reservaSimCard = true;

      // Paso 1: Consultar los ítems en la bodega
      const infodispositivos = obtenerTodasLosItemsBodegaDispositivo(ID_BODEGA, ID_ITEM_DISPOSITIVO, ID_ESTADO_DISPONIBLE_DISPOSITIVO);
      const infoSimCard = obtenerTodasLosItemsBodegaSimCard(ID_BODEGA, ID_ITEM_SIMCARD, ID_ESTADO_DISPONIBLE_SIMCARD);

      if (infodispositivos.length === 1 && infoSimCard.length === 1) {
        const infoDispositivoEncontrado = obtenerInformacionDispositivo(infodispositivos[0].numero_inventario);
        const infoSimCardEncontrado = obtenerInformacionSimCard(infoSimCard[0].numero_inventario);

        if (!infoDispositivoEncontrado || !infoSimCardEncontrado) {
          return guardarLogYResponder(null, null, 400, "Error al obtener información de los ítems", requestContext);
        } else {
          const reservaDispositivo = cambiarEstadoReservado(infoDispositivoEncontrado.internalid, ID_ESTADO_RESERVA_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
          const reservaSimCard = cambiarEstadoReservado(infoSimCardEncontrado.internalid, ID_ESTADO_RESERVA_SIMCARD, 'customrecord_ht_record_detallechasersim');
          if (reservaDispositivo && reservaSimCard) {
            return guardarLogYResponder(infoDispositivoEncontrado, infoSimCardEncontrado, 200, "Proceso de Reserva Finalizado", requestContext);
          } else {

            if (reservaDispositivo) {
              cambiarEstadoReservado(infoDispositivoEncontrado.internalid, ID_ESTADO_DISPONIBLE_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
            }

            if (reservaSimCard) {
              cambiarEstadoReservado(infoSimCardEncontrado.internalid, ID_ESTADO_DISPONIBLE_DISPOSITIVO, 'customrecord_ht_record_detallechasersim');
            }

            return guardarLogYResponder(infoDispositivoEncontrado, infoSimCardEncontrado, 400, "Error al reservar los ítems", requestContext);
          }
        }

      } else {
        return guardarLogYResponder(infodispositivos[0], infoSimCard[0], 400, `Falta disponibilidad: DISPOSITIVO ${infodispositivos.length}, SIMCARD ${infoSimCard.length}`, requestContext);
      }

    } catch (error) {
      log.debug("Error GetReserva", { message: error.message, stack: error.stack });
      return guardarLogYResponder(null, null, 400, error.message, requestContext);
    }
  };

  // Get Anular
  const GetAnular = (requestContext) => {

    const ID_ESTADO_RESERVA_DISPOSITIVO = '9'; // Estado Reservado
    const ID_ESTADO_DISPONIBLE_DISPOSITIVO = '5'; // Estado Disponible

    const ID_ESTADO_RESERVA_SIMCARD = '6'; // Estado Reservado
    const ID_ESTADO_DISPONIBLE_SIMCARD = '7'; // Estado Disponible  // Antes por conflicto
    // const ID_ESTADO_CONGELADO_SIMCARD = '13'; // Estado Disponible

    const ID_ESTADO_CONGELAR_DISPOSITIVO = '21'; // Estado Reguralizacion
    const ID_ESTADO_CONGELADO2_SIMCARD = '12'; // Estado Reguralizacion

    // const anularDispositivo = true;
    // const anularSimCard = true;

    try {
      const dataLog = obtenerLogRecordSmartcar(requestContext?.id);

      if (!dataLog) {
        throw new Error("No se encontró el registro para la solicitud.");
      }

      // if (requestContext?.id == "43304") {
      //   log.debug("Caso de prueba", "ya se puede cambiar--------------- 43304 864002070043998");
      //   return {
      //     results: [
      //       { "id": "622249", "name": "SIMCARD", "value": "895930100112342209" },
      //       { "id": "574521", "name": "IMEI", "value": "864002070043998" }
      //     ],
      //     id: 43304,
      //     fecha: formatToISO8601(new Date()),
      //     status: 200,
      //     message: "Proceso de Anulación Finalizado"
      //   };

      // }


      // realizar la consulta para validar si el dispositivo y simcard existen y están en estado reservado
      let simCardRese = obtenerInformacionSimCard(dataLog?.id_simcard, ID_ESTADO_CONGELADO2_SIMCARD);
      let dispositivoRese = obtenerInformacionDispositivo(dataLog?.id_dispositivo, ID_ESTADO_CONGELAR_DISPOSITIVO);

      if (simCardRese && dispositivoRese) {
        throw new Error("El registro ya tiene una orden de servicio generada");
      }

      // if (dataLog.id_accion_smartcar == requestContext?.opcion) {
      //   // throw new Error("Ya esta anulada")
      //   throw new Error("La acción de anulación ya fue realizada anteriormente.");
      // }

      // realizar la consulta para validar si el dispositivo y simcard existen y están en estado reservado
      let simCard = obtenerInformacionSimCard(dataLog?.id_simcard, ID_ESTADO_RESERVA_SIMCARD);
      let dispositivo = obtenerInformacionDispositivo(dataLog?.id_dispositivo, ID_ESTADO_RESERVA_DISPOSITIVO);

      log.debug("Datos de Dispositivo y SimCard", { simCard, dispositivo });

      if (!simCard || !dispositivo) {
        throw new Error("El registro no cumple con las condiciones para su anulación.");
      }

      if (dataLog && parseInt(dataLog?.id_dispositivo || '0', 10) > 0 && parseInt(dataLog?.id_simcard || '0', 10) > 0) {
        const anularDispositivo = cambiarEstadoReservado(dataLog.id_dispositivo, ID_ESTADO_DISPONIBLE_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
        const anularSimCard = cambiarEstadoReservado(dataLog.id_simcard, ID_ESTADO_DISPONIBLE_SIMCARD, 'customrecord_ht_record_detallechasersim');

        if (anularDispositivo && anularSimCard) {
          return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 200, "Proceso de Anulación Finalizado", requestContext);
        } else {

          if (anularDispositivo) {
            cambiarEstadoReservado(dataLog.id_dispositivo, ID_ESTADO_RESERVA_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
          }
          if (anularSimCard) {
            cambiarEstadoReservado(dataLog.id_simcard, ID_ESTADO_RESERVA_SIMCARD, 'customrecord_ht_record_detallechasersim');
          }

          return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 400, "Error al anular los ítems - Diferencia de estados", requestContext);
        }
      } else {
        return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 400, "Error al anular los ítems", requestContext);
      }
    } catch (error) {
      return guardarLogYResponder(null, null, 400, error.message, requestContext, error);
    }
  };

  // Get Uso Orden Servicio
  const GetUsoOrdenServicio = (requestContext) => {

    const ID_ESTADO_RESERVA_DISPOSITIVO = '9'; // Estado Reservado
    const ID_ESTADO_CONGELAR_DISPOSITIVO = '21'; // Estado Reguralizacion

    const ID_ESTADO_RESERVA_SIMCARD = '6'; // Estado Reservado
    // const ID_ESTADO_DISPONIBLE_SIMCARD = '7'; // Estado Disponible  // Antes por conflicto
    const ID_ESTADO_CONGELADO_SIMCARD = '12'; // Estado Reguralizacion

    // const anularDispositivo = true;
    // const anularSimCard = true;

    try {
      const dataLog = obtenerLogRecordSmartcar(requestContext?.id);

      if (dataLog.id_accion_smartcar == requestContext?.opcion) {
        //  throw new Error("La acción de Uso Orden Servicio ya fue realizada anteriormente.");
        throw new Error("La acción 3 ya fue realizada anteriormente.");
      }

      // Realizar la consulta para validar si el dispositivo y simcard existen y están en estado reservado
      let simCard = obtenerInformacionSimCard(dataLog?.id_simcard, ID_ESTADO_RESERVA_SIMCARD);
      let dispositivo = obtenerInformacionDispositivo(dataLog?.id_dispositivo, ID_ESTADO_RESERVA_DISPOSITIVO);

      log.debug("Datos de Dispositivo y SimCard", { simCard, dispositivo });

      if (!simCard || !dispositivo) {
        // throw new Error("El registro ya se gestiono")
        throw new Error("El registro no cumple con las condiciones.");
      }

      if (dataLog && parseInt(dataLog?.id_dispositivo || '0', 10) > 0 && parseInt(dataLog?.id_simcard || '0', 10) > 0) {
        const anularDispositivo = cambiarEstadoReservado(dataLog.id_dispositivo, ID_ESTADO_CONGELAR_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
        const anularSimCard = cambiarEstadoReservado(dataLog.id_simcard, ID_ESTADO_CONGELADO_SIMCARD, 'customrecord_ht_record_detallechasersim');

        if (anularDispositivo && anularSimCard) {
          return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 200, "Uso de periféricos en OS Generada", requestContext);
        } else {

          if (anularDispositivo) {
            cambiarEstadoReservado(dataLog.id_dispositivo, ID_ESTADO_RESERVA_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
          }
          if (anularSimCard) {
            cambiarEstadoReservado(dataLog.id_simcard, ID_ESTADO_RESERVA_SIMCARD, 'customrecord_ht_record_detallechasersim');
          }

          return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 400, "Error al ejecutar los ítems - Diferencia de estados", requestContext);
        }
      } else {
        return guardarLogYResponder({ internalid: dataLog?.id_dispositivo, name: dataLog?.nombre_dispositivo }, { internalid: dataLog?.id_simcard, name: dataLog?.nombre_simcard }, 400, "Error al ejecutar los ítems", requestContext);
      }
    } catch (error) {
      return guardarLogYResponder(null, null, 400, error.message, requestContext, error);
    }

  }

  /*
   * post
   */
  const _post = (requestContext) => {

    log.debug("requestContext", requestContext)

    // return

    switch (requestContext?.accion) {
      case "SUSP":
        try {
          const ACCION_ID = 4;
          const ACCION_NOMBRE = "Notificación - Anulación";
          const NUEVO_ESTADO = 2;

          let respuesta = notificacionSmartcar(requestContext, ACCION_ID, ACCION_NOMBRE, NUEVO_ESTADO);
          return JSON.stringify(respuesta);
        } catch (e) {
          log.debug("Error respuesta post SUSP", e);
          return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 400, message: e.message });
        }

      case "REAC":
        try {
          const ACCION_ID = 5;
          const ACCION_NOMBRE = "Notificación - Reactivación";
          const NUEVO_ESTADO = 1;

          let respuesta = notificacionSmartcar(requestContext, ACCION_ID, ACCION_NOMBRE, NUEVO_ESTADO);
          return JSON.stringify(respuesta);
        } catch (e) {
          log.debug("Error respuesta post SUSP", e);
          return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 400, message: e.message });
        }

      case "DISC":
        try {
          return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 200, message: "DISCONTINUATION_SERVICE" });
        } catch (e) {
          log.debug("Error respuesta post DISC", e);
          return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 400, message: e.message });
        }

      case "CELU":
        try {

          let respuesta = actualizarCampoHTSimCard(requestContext);
          return JSON.stringify(respuesta);


        } catch (e) {
          log.debug("Error respuesta post CELU", e);
          return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 400, message: e.message });
        }

      default:
        log.debug({ title: "default post", details: requestContext });
        return JSON.stringify({ results: [], id: 0, fecha: formatToISO8601(new Date()), status: 400, message: "Opción no válida" });
    }
  };

  /*
  * Funciones
  */
  // Exponer funciones
  const obtenerTodasLosItemsBodegaDispositivo = (BODEGA, ITEM, ID_ESTADO) => {

    log.debug("obtenerTodasLosItemsBodega", { BODEGA, ITEM, ID_ESTADO });

    try {
      let sqlQuery = `
        SELECT TOP 1
            -- BUILTIN.DF(ItemBinQuantity.Item) AS ItemName, -- Descomentarlo si es necesario
            ItemBinQuantity.bin AS Deposito,
            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
            Item.description AS DESCRIPCION,
            inventorybalance.inventorynumber AS ID_INVENTARIO,
            BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario
        FROM
            ItemBinQuantity
        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
        INNER JOIN inventorybalance ON inventorybalance.item = Item.id
            AND inventorybalance.binnumber = ItemBinQuantity.bin
        INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
            ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
        WHERE
            ItemBinQuantity.bin = ?
            --AND Item.id = ?
            --AND Item.id in ('22059', '51008') 
            AND ItemBinQuantity.OnHand > 0
            AND Item.itemtype = 'InvtPart'
            AND HtDispositivo.custrecord_ht_dd_estado = ?
            AND HtDispositivo.isinactive = 'F' 
        ORDER BY
              Item.id;
            --Item.id, HtDispositivo.lastmodified;
        `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
        // params: [BODEGA, ITEM, ID_ESTADO]
        params: [BODEGA, ID_ESTADO]
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
        return results;
      }

    } catch (error) {
      log.error("Error obtenerTodasLosItemsBodega", { error: error.message, stack: error.stack });
      return [];
    }
  };

  const obtenerTodasLosItemsBodegaSimCard = (BODEGA, ITEM, ID_ESTADO) => {

    log.debug("obtenerTodasLosItemsBodegaSimCard", { BODEGA, ITEM, ID_ESTADO });

    try {
      let sqlQuery = `
        SELECT TOP 1
         -- BUILTIN.DF(ItemBinQuantity.Item) AS ItemName, -- Descomentarlo si es necesario
            ItemBinQuantity.bin AS Deposito,
            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
            Item.description AS DESCRIPCION,
            inventorybalance.inventorynumber AS ID_INVENTARIO,
            BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario
        FROM
            ItemBinQuantity
        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
        INNER JOIN inventorybalance ON inventorybalance.item = Item.id
            AND inventorybalance.binnumber = ItemBinQuantity.bin
        INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERSIM AS HtDispositivo 
        ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
        WHERE
          custrecord_ht_ds_serie IS NOT NULL
           AND ItemBinQuantity.bin = ?
           AND Item.id = ?
           AND ItemBinQuantity.OnHand > 0
           AND Item.itemtype = 'InvtPart'
           AND HtDispositivo.custrecord_ht_ds_estado =  ?
           AND HtDispositivo.isinactive = 'F' 
        ORDER BY
            Item.id;
        `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
        params: [BODEGA, ITEM, ID_ESTADO]
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
        return results;
      }

    } catch (error) {
      log.error("Error obtenerTodasLosItemsBodega", { error: error.message, stack: error.stack });
      return [];
    }
  };

  // Obtener información del dispositivo
  const obtenerInformacionDispositivo = (NUMERO_INVENTARIO, Estado) => {
    try {

      log.debug("obtenerInformacionDispositivo", { NUMERO_INVENTARIO, Estado });

      let filters;
      if (Estado) {
        filters = [
          ["internalid", "is", NUMERO_INVENTARIO],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ht_dd_estado", "is", Estado]
        ];
      } else {
        filters = [
          ["name", "is", NUMERO_INVENTARIO],
          "AND",
          ["isinactive", "is", "F"]
        ];
      }

      const searchObj = search.create({
        type: "customrecord_ht_record_detallechaserdisp",
        filters: filters,
        columns: [
          "custrecord_ht_dd_dispositivo",
          "custrecord_ht_dd_estado",
          "custrecord_ht_dd_firmware",
          "custrecord_ht_dd_imei",
          "custrecord_ht_dd_modelodispositivo",
          "custrecord_ht_dd_numero_camaras",
          "custrecord_ht_dd_script",
          "custrecord_ht_dd_servidor",
          "custrecord_ht_dd_sn",
          "custrecord_ht_dd_tipodispocha",
          "custrecord_ht_dd_tipodispositivo",
          "custrecord_ht_dd_vid",
          "externalid",
          "isinactive",
          "name",
          "internalid"
        ]
      });

      const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

      if (searchResult.length > 0) {
        const result = searchResult[0];

        if (Estado) {
          return true
        }

        return {
          custrecord_ht_dd_dispositivo: result.getValue("custrecord_ht_dd_dispositivo"),
          custrecord_ht_dd_estado: result.getValue("custrecord_ht_dd_estado"),
          custrecord_ht_dd_firmware: result.getValue("custrecord_ht_dd_firmware"),
          custrecord_ht_dd_imei: result.getValue("custrecord_ht_dd_imei"),
          custrecord_ht_dd_modelodispositivo: result.getValue("custrecord_ht_dd_modelodispositivo"),
          custrecord_ht_dd_numero_camaras: result.getValue("custrecord_ht_dd_numero_camaras"),
          custrecord_ht_dd_script: result.getValue("custrecord_ht_dd_script"),
          custrecord_ht_dd_servidor: result.getValue("custrecord_ht_dd_servidor"),
          custrecord_ht_dd_sn: result.getValue("custrecord_ht_dd_sn"),
          custrecord_ht_dd_tipodispocha: result.getValue("custrecord_ht_dd_tipodispocha"),
          custrecord_ht_dd_tipodispositivo: result.getValue("custrecord_ht_dd_tipodispositivo"),
          custrecord_ht_dd_vid: result.getValue("custrecord_ht_dd_vid"),
          externalid: result.getValue("externalid"),
          isinactive: result.getValue("isinactive"),
          name: result.getValue("name"),
          internalid: result.getValue("internalid")
        };
      } else {

        if (Estado) {
          return false
        }

        return {};
      }
    } catch (error) {
      log.error("Error en obtenerInformacionDispositivo", { error: error.message, stack: error.stack });
      return {};
    }
  };

  // Obtener información del dispositivo
  const obtenerInformacionSimCard = (NUMERO_INVENTARIO, Estado) => {
    try {

      log.debug("obtenerInformacionSimCard", { NUMERO_INVENTARIO, Estado });

      let filters

      if (Estado) {
        filters = [
          ["internalid", "is", NUMERO_INVENTARIO],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ht_ds_estado", "is", Estado]
        ]
      } else {
        filters = [
          ["name", "is", NUMERO_INVENTARIO],
          "AND",
          ["isinactive", "is", "F"]
        ]
      }

      log.debug("Filters", filters);

      const searchObj = search.create({
        type: "customrecord_ht_record_detallechasersim",
        filters: filters,
        columns: [
          "custrecord_ht_ds_simcard",
          "custrecord_ht_ds_serie",
          "custrecord_ht_ds_tiposimcard",
          "custrecord_ht_ds_operadora",
          "custrecord_ht_ds_ip",
          "custrecord_ht_ds_apn",
          "custrecord_ht_ds_numerocelsim",
          "custrecord_ht_ds_estado",
          "custrecord_ht_ds_fechacorte",
          "custrecord_ht_ds_icc",
          "custrecord_ht_ds_estado_conciliacion",
          "custrecord_ht_ds_token",
          "name",
          "internalid"
        ]
      });

      const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

      if (searchResult.length > 0) {
        const result = searchResult[0];

        if (Estado) {
          return true
        }

        return {
          custrecord_ht_ds_simcard: result.getValue("custrecord_ht_ds_simcard"),
          custrecord_ht_ds_serie: result.getValue("custrecord_ht_ds_serie"),
          custrecord_ht_ds_tiposimcard: result.getValue("custrecord_ht_ds_tiposimcard"),
          custrecord_ht_ds_operadora: result.getValue("custrecord_ht_ds_operadora"),
          custrecord_ht_ds_ip: result.getValue("custrecord_ht_ds_ip"),
          custrecord_ht_ds_apn: result.getValue("custrecord_ht_ds_apn"),
          custrecord_ht_ds_numerocelsim: result.getValue("custrecord_ht_ds_numerocelsim"),
          custrecord_ht_ds_estado: result.getValue("custrecord_ht_ds_estado"),
          custrecord_ht_ds_fechacorte: result.getValue("custrecord_ht_ds_fechacorte"),
          custrecord_ht_ds_icc: result.getValue("custrecord_ht_ds_icc"),
          custrecord_ht_ds_estado_conciliacion: result.getValue("custrecord_ht_ds_estado_conciliacion"),
          custrecord_ht_ds_token: result.getValue("custrecord_ht_ds_token"),
          name: result.getValue("name"),
          internalid: result.getValue("internalid"),
        };
      } else {
        if (Estado) {
          return false
        }
        return {};

      }
    } catch (error) {
      log.error("Error en obtenerInformacionDispositivo", { error: error.message, stack: error.stack });
      return {};
    }
  };

  // Cambiar el Estado a Reservado
  const cambiarEstadoReservado = (ID_INVENTARIO, ID_ESTADO, ENTIDAD) => {
    try {

      let value = {}
      if (ENTIDAD == "customrecord_ht_record_detallechaserdisp") {
        value = {
          custrecord_ht_dd_estado: ID_ESTADO, // Estado Reservado
        }
      } else if (ENTIDAD == "customrecord_ht_record_detallechasersim") {
        value = {
          custrecord_ht_ds_estado: ID_ESTADO, // Estado Reservado
        }
      }

      const recordId = record.submitFields({
        type: ENTIDAD,
        id: ID_INVENTARIO,
        values: value,
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true,
        },
      });

      if (recordId) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      log.error("Error en cambiarEstadoReservado", { error: error.message, stack: error.stack });
      return false;
    }
  };

  // GUARDAR LOG
  const createLogRecordSmartcar = (INFODATALOG) => {
    try {

      const logRecord = record.create({
        type: "customrecordven_smartcar_log",
        isDynamic: true,
      });

      logRecord.setValue("custrecord_id_dispositivo", INFODATALOG.id_dispositivo);
      logRecord.setValue("custrecord_nombre_dispositivo", INFODATALOG.nombre_dispositivo);
      logRecord.setValue("custrecord_id_simcard", INFODATALOG.id_simcard);
      logRecord.setValue("custrecord_nombre_simcard", INFODATALOG.nombre_simcard);
      logRecord.setValue("custrecord_id_accion_smartcar", INFODATALOG.id_accion_smartcar);
      logRecord.setValue("custrecord_accion_smartcar", INFODATALOG.accion_smartcar);
      logRecord.setValue("custrecord_solicitud_smartcar", INFODATALOG.solicitud_smartcar);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
    } catch (error) {
      log.error("Error al createLogRecordSmartcar", { error: error.message, stack: error.stack });
      return 0;
    }
  };

  // ACTUALIZAR EL LOG
  const updateLogRecordSmartcar = (IDLOG, INFOLOG) => {
    try {
      const logRecord = record.load({
        type: "customrecordven_smartcar_log",
        id: IDLOG,
        isDynamic: true,
      });

      logRecord.setValue("custrecord_traza_smartcar", INFOLOG.traza_smartcar);
      logRecord.setValue("custrecord_respuesta_api_smartcar_exito", INFOLOG.api_smartcar_exito);
      logRecord.setValue("custrecord_respuesta_api_smartcar_error", INFOLOG.api_smartcar_error);
      logRecord.setValue("custrecord_accion_smartcar", INFOLOG.accion_smartcar);
      logRecord.setValue("custrecord_id_accion_smartcar", INFOLOG.id_accion_smartcar);
      logRecord.setValue("custrecord_solicitud_smartcar", INFOLOG.solicitud_smartcar);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
    } catch (error) {
      log.error("Error al updateLogRecordSmartcar", { error: error.message, stack: error.stack });
      return 0;
    }
  };

  // Obtener Registro de Log
  const obtenerLogRecordSmartcar = (IDLOG) => {
    try {
      // search
      const searchObj = search.create({
        type: "customrecordven_smartcar_log",
        filters: [
          ["internalid", "is", IDLOG],
          "AND", ["custrecord_id_accion_smartcar", "is", 3]
        ],
        columns: [
          "custrecord_id_dispositivo",
          "custrecord_nombre_dispositivo",
          "custrecord_id_simcard",
          "custrecord_nombre_simcard",
          "custrecord_id_accion_smartcar",
          "custrecord_accion_smartcar",
          "custrecord_solicitud_smartcar",
          "custrecord_traza_smartcar",
          "custrecord_respuesta_api_smartcar_exito",
          "custrecord_respuesta_api_smartcar_error"
        ]
      });

      const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

      if (searchResult.length > 0) {
        const result = searchResult[0];
        return {
          id_dispositivo: result.getValue("custrecord_id_dispositivo"),
          nombre_dispositivo: result.getValue("custrecord_nombre_dispositivo"),
          id_simcard: result.getValue("custrecord_id_simcard"),
          nombre_simcard: result.getValue("custrecord_nombre_simcard"),
          id_accion_smartcar: result.getValue("custrecord_id_accion_smartcar"),
          accion_smartcar: result.getValue("custrecord_accion_smartcar"),
          solicitud_smartcar: result.getValue("custrecord_solicitud_smartcar"),
          traza_smartcar: result.getValue("custrecord_traza_smartcar"),
          respuesta_api_smartcar_exito: result.getValue("custrecord_respuesta_api_smartcar_exito"),
          respuesta_api_smartcar_error: result.getValue("custrecord_respuesta_api_smartcar_error")
        };
      } else {
        return 0;
      }
    } catch (error) {
      log.error("Error al obtenerLogRecordSmartcar", { error: error.message, stack: error.stack });
      return 0;
    }
  };

  // Formatear Fecha
  const formatToISO8601 = (date) => {
    try {
      if (!(date instanceof Date)) {
        throw new Error("El parámetro debe ser un objeto Date.");
      }

      // Restar 5 horas
      date.setHours(date.getHours() - 5);

      return date.toISOString();
    } catch (error) {
      log.error("Error en formatToISO8601:", error.message);
      return "2024-01-01T23:36:17.491Z";
    }
  };

  // Guardar Log y Responder
  const guardarLogYResponder = (dispositivo, simCard, status, message, requestContext, error = null) => {

    log.debug("Data Log", { dispositivo, simCard, status, message, requestContext });

    try {
      let response = {};
      const DataLog = {
        id_dispositivo: dispositivo?.internalid || 0,
        nombre_dispositivo: dispositivo?.name || "",
        id_simcard: simCard?.internalid || 0,
        nombre_simcard: simCard?.name || "",
        id_accion_smartcar: requestContext.opcion,
        accion_smartcar: requestContext.opcion == "1" ? "Reserva de Dispositivo y SimCard" : "Anulación de Reserva",
        solicitud_smartcar: requestContext
      };

      if (requestContext?.id) {
        DataLog.id = requestContext.id;
        const results = [
          { id: simCard?.internalid || 0, name: "SIMCARD", value: (simCard?.internalid ? obtenerUnDato("customrecord_ht_record_detallechasersim", "custrecord_ht_ds_serie", simCard?.internalid, "getText") : "") },
          { id: dispositivo?.internalid || 0, name: "IMEI", value: (dispositivo?.internalid ? obtenerUnDato("customrecord_ht_record_detallechaserdisp", "custrecord_ht_dd_imei", dispositivo?.internalid, "getValue") : "") }
        ];
        response = {
          results: results,
          id: DataLog.id ? parseInt(DataLog.id) : 0,
          fecha: formatToISO8601(new Date()),
          status,
          message
        };

        const logData = JSON.stringify(response);
        updateLogRecordSmartcar(DataLog.id, {
          traza_smartcar: logData,
          api_smartcar_exito: status === 200 ? logData : "",
          api_smartcar_error: status !== 200 ? logData : "",
          // accion_smartcar: requestContext.opcion == "1" ? "Reserva de Dispositivo y SimCard" : "Anulación de Reserva",
          accion_smartcar:
            requestContext.opcion == "1"
              ? "Reserva de Dispositivo y SimCard"
              : requestContext.opcion == "2"
                ? "Anulación de Reserva"
                : requestContext.opcion == "3"
                  ? "Uso de Dispositivo y SimCard"
                  : "Acción no definida",

          id_accion_smartcar: requestContext.opcion,
          solicitud_smartcar: requestContext
        });

      } else {
        const logRecord = createLogRecordSmartcar(DataLog) || "0";
        const results = [
          { id: simCard?.internalid || 0, name: "SIMCARD", value: (simCard?.internalid ? obtenerUnDato("customrecord_ht_record_detallechasersim", "custrecord_ht_ds_serie", simCard?.internalid, "getText") : "") },
          { id: dispositivo?.internalid || 0, name: "IMEI", value: (dispositivo?.internalid ? obtenerUnDato("customrecord_ht_record_detallechaserdisp", "custrecord_ht_dd_imei", dispositivo?.internalid, "getValue") : "") }
        ];

        response = {
          results,
          id: logRecord ? parseInt(logRecord) : 0,
          fecha: formatToISO8601(new Date()),
          status,
          message
        };

        const logData = JSON.stringify(response);
        updateLogRecordSmartcar(logRecord, {
          traza_smartcar: logData,
          api_smartcar_exito: status === 200 ? logData : "",
          api_smartcar_error: status !== 200 ? logData : "",
          // accion_smartcar: requestContext.opcion == "1" ? "Reserva de Dispositivo y SimCard" : "Anulación de Reserva",
          accion_smartcar:
            requestContext.opcion == "1"
              ? "Reserva de Dispositivo y SimCard"
              : requestContext.opcion == "2"
                ? "Anulación de Reserva"
                : requestContext.opcion == "3"
                  ? "Uso de Dispositivo y SimCard"
                  : "Acción no definida",

          id_accion_smartcar: requestContext.opcion,
          solicitud_smartcar: requestContext
        });
      }

      log.debug("Respuesta Log", response);
      return response;
    } catch (error) {
      log.error("Error en guardarLogYResponder", { message: error.message, stack: error.stack });
      return {
        results: [],
        id: 0,
        fecha: formatToISO8601(new Date()),
        status: 400,
        message: error.message
      };
    }
  };

  function obtenerUnDato(type, columna, id, tipo) {
    try {
      const resultado = search
        .create({
          type: type,
          filters: [["internalid", "is", id]],
          columns: [columna],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      if (tipo == "getValue") {
        return resultado.length > 0 ? resultado[0]?.getValue(columna) : "";
      } else if (tipo == "getText") {
        return resultado.length > 0 ? resultado[0]?.getText(columna) : "";
      } else {
        return ""
      }

    } catch (error) {
      return "";
    }
  }

  function obtenerCoberturasPorSimDisp(id_simcard, id_dispositivo) {
    try {

      if (!id_simcard && !id_dispositivo) {
        log.error("Parámetros inválidos", "ID no proporcionado.");
        return [];
      }

      const searchObj = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_subsidiaria", "anyof", "2"],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ht_co_bien", "noneof", "@NONE@"],
          "AND",
          ["custrecord_ht_co_numerodispositivo", "isnotempty", ""],
          "AND",
          ["custrecord_ht_co_numeroserieproducto", "noneof", "@NONE@"],
          "AND",
          ["custrecord_ht_co_numeroserieproducto.custrecord_ht_mc_seriedispositivo", "anyof", id_dispositivo],
          "AND",
          ["custrecord_ht_co_numeroserieproducto.custrecord_ht_mc_celularsimcard", "anyof", id_simcard]
        ],
        columns: [
          "custrecord_ht_co_bien",
          "custrecord_ht_co_familia_prod",
          { name: "custrecord_ht_pp_codigo", join: "custrecord_ht_co_familia_prod" },
          "custrecord_ht_co_coberturainicial",
          "custrecord_ht_co_coberturafinal",
          "internalid",
          { name: "category", join: "custrecord_ht_co_propietario" },
          "name",
          "custrecord_ht_co_propietario",
          { name: "name", join: "custrecord_ht_co_bien" },
          { name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" },
          { name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" },
          "custrecord_ht_co_producto",
          "custrecord_ht_co_subsidiaria",
          "custrecord_ht_co_estado_cobertura",
          "custrecord_ht_co_numeroserieproducto",
          "custrecord_ht_co_estado",
          { name: "displayname", join: "custrecord_ht_co_producto" },
        ]
      });

      const results = [];
      const pagedData = searchObj.runPaged({ pageSize: 100 });

      pagedData.pageRanges.forEach(pageRange => {
        const page = pagedData.fetch({ index: pageRange.index });
        page.data.forEach(result => {
          results.push({
            internalid: result.getValue({ name: "internalid" }),
            name: result.getValue({ name: "name" }),
            idbien: result.getValue({ name: "custrecord_ht_co_bien" }),
            // bienText: limpiarCaracteresEspeciales(result.getText({ name: "custrecord_ht_co_bien" })),
            id_familia_bien: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
            familia_bien: result.getValue({ name: "custrecord_ht_pp_codigo", join: "custrecord_ht_co_familia_prod" }),
            coberturaInicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturaFinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            categoria: result.getValue({ name: "category", join: "custrecord_ht_co_propietario" }),
            categoria_text: result.getText({ name: "category", join: "custrecord_ht_co_propietario" }),
            propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            // propietario_text: limpiarCaracteresEspeciales(result.getText({ name: "custrecord_ht_co_propietario" })),
            vendedor: result.getValue({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
            // vendedor_text: limpiarCaracteresEspeciales(result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" })),
            oficina: result.getValue({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
            // oficina_text: limpiarCaracteresEspeciales(result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" })),
            idProducto: result.getText({ name: "custrecord_ht_co_producto" }),
            idProducto_text: result.getValue({ name: "displayname", join: "custrecord_ht_co_producto" }),
            idSubsidiaria: result.getValue({ name: "custrecord_ht_co_subsidiaria" }),

            estadoCobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            estadoCobertura_text: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
            serieProductoCobertura: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            serieProductoCobertura_text: result.getText({ name: "custrecord_ht_co_numeroserieproducto" }),
            estadoProductoCoberura: result.getValue({ name: "custrecord_ht_co_estado" }),
            estadoProductoCoberura_text: result.getText({ name: "custrecord_ht_co_estado" }),
          });
        });
      });

      return results;
    } catch (error) {
      log.error("Error al ejecutar la búsqueda de coberturas", error);
      return [];
    }
  };

  function actualizarEstadoCobertura(recordId, estado) {
    try {
      // Cargar el registro completo
      let coberturaRecord = record.load({
        type: "customrecord_ht_co_cobertura",
        id: recordId,
        isDynamic: true
      });

      // Asignar el nuevo estado
      coberturaRecord.setValue({
        fieldId: "custrecord_ht_co_estado_cobertura",
        value: estado
      });

      // Guardar el registro (esto sí activa workflows, user events, etc.)
      let savedId = coberturaRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true
      });

      log.debug("Estado de cobertura actualizado con éxito", `ID: ${savedId}`);
      return savedId;
    } catch (error) {
      return 0
    }
  };


  /**
 * Función para suspender o anular una cobertura Smartcar
 * @param {Object} requestContext - Contexto de la solicitud con idreserva
 * @param {number} accionSmartcarId - ID de la acción a registrar en Smartcar
 * @param {string} accionSmartcarNombre - Nombre de la acción a registrar en Smartcar
 * @param {number} nuevoEstadoCobertura - Nuevo estado a aplicar a la cobertura
 * @returns {Object} - Respuesta de la operación
 */
  const notificacionSmartcar = (requestContext, accionSmartcarId, accionSmartcarNombre, nuevoEstadoCobertura) => {
    try {
      log.debug("requestContext", requestContext);

      // ------------------------------
      // 1. Extraer datos de entrada
      // ------------------------------
      const idReserva = requestContext.idreserva;

      // ------------------------------
      // 2. Obtener registro del log Smartcar
      // ------------------------------
      const registroLogSmartcar = obtenerLogRecordSmartcar(idReserva);
      const registroValido = registroLogSmartcar?.id_dispositivo && registroLogSmartcar?.id_simcard;

      if (!registroValido) {
        throw new Error("No se encontró un registro válido en Smartcar");
      }

      log.debug("registroLogSmartcar", registroLogSmartcar);

      // ------------------------------
      // 3. Variables individuales del registro
      // ------------------------------
      const dispositivoId = registroLogSmartcar.id_dispositivo;
      const dispositivoNombre = registroLogSmartcar.nombre_dispositivo;
      const simcardId = registroLogSmartcar.id_simcard;
      const simcardNombre = registroLogSmartcar.nombre_simcard;

      // ------------------------------
      // 4. Crear log inicial
      // ------------------------------
      const datosLogInicial = {
        id_dispositivo: dispositivoId,
        nombre_dispositivo: dispositivoNombre,
        id_simcard: simcardId,
        nombre_simcard: simcardNombre,
        id_accion_smartcar: accionSmartcarId,
        accion_smartcar: accionSmartcarNombre,
        solicitud_smartcar: requestContext,
      };

      log.debug("datosLogInicial", datosLogInicial);

      const idLogCreado = createLogRecordSmartcar(datosLogInicial);
      log.debug("idLogCreado", idLogCreado);

      // ------------------------------
      // 5. Buscar coberturas asociadas
      // ------------------------------
      const coberturasAsociadas = obtenerCoberturasPorSimDisp(simcardId, dispositivoId);
      log.debug("coberturasAsociadas", coberturasAsociadas);

      const idCobertura = coberturasAsociadas[0]?.internalid;

      // ------------------------------
      // 6. Actualizar cobertura
      // ------------------------------
      const resultadoActualizacion = actualizarEstadoCobertura(idCobertura, nuevoEstadoCobertura);
      log.debug("resultadoActualizacion", resultadoActualizacion);

      // ------------------------------
      // 7. Preparar resultados comunes
      // ------------------------------
      const resultadoSimcard = { id: simcardId, name: "SIMCARD", value: simcardNombre };
      const resultadoDispositivo = { id: dispositivoId, name: "IMEI", value: dispositivoNombre };
      const resultadosFinales = [resultadoSimcard, resultadoDispositivo];

      // ------------------------------
      // 8. Generar respuesta y actualizar log según el resultado
      // ------------------------------
      const fechaActual = formatToISO8601(new Date());

      if (resultadoActualizacion) {

        if (coberturasAsociadas[0]?.propietario) {

          // ! HT Seguimiento Cliente Creacion
          try {

            // Validar campos obligatorios
            if (!coberturasAsociadas[0]?.propietario || !runtime.getCurrentUser().id || !coberturasAsociadas[0]?.idbien) {
              throw new Error("Los campos 'cliente', 'empleado' y 'vehiculo' son obligatorios.");
            }

            const mensajeUs = nuevoEstadoCobertura === 1
              ? "REACTIVATION_SERVICE"
              : nuevoEstadoCobertura === 2
                ? "SUSPENSION_SERVICE"
                : "";

            // let complemento = (generarMensaje(data.dataJsonFin));

            // Mapeo de campos y valores
            const campos = [
              { fieldId: 'custrecord_ht_sc_cliente', value: coberturasAsociadas[0]?.propietario },
              { fieldId: 'custrecord_ht_sc_resultadogestion', value: 17 },
              { fieldId: 'custrecord_ht_sc_empleado', value: runtime.getCurrentUser().id },
              { fieldId: 'custrecord_ht_sc_estado', value: 2 },
              { fieldId: 'custrecord_ht_sc_modocontacto', value: 5 },
              { fieldId: 'custrecord_ht_sc_seguimiento', value: "PROCESO EXTERNO DE CLARO CON ACCION" + " " + mensajeUs + " " + "-" + " " + coberturasAsociadas[0]?.name },
              { fieldId: 'custrecord_ht_sc_tipocliente', value: 1 },
              { fieldId: 'custrecord_ht_sc_tiposeguimiento', value: 11 },
              { fieldId: 'custrecord_ht_sc_vehiculo', value: coberturasAsociadas[0]?.idbien },
              { fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 },
            ];

            let registrarSeguimientoCliente = record.create({
              type: 'customrecord_ht_record_seguicliente',
              isDynamic: true
            });

            // Insertar valores solo si existen
            campos.forEach(({ fieldId, value }) => {
              if (value !== undefined && value !== null) {
                registrarSeguimientoCliente.setValue({ fieldId, value });
              }
            });

            let idSeguimientoCliente = registrarSeguimientoCliente.save({
              enableSourcing: true,
              ignoreMandatoryFields: true
            });

            log.debug("idSeguimientoCliente", idSeguimientoCliente);
            // return { id: idSeguimientoCliente, Mensaje: "Exito" };
          } catch (error) {
            log.debug("-E-", error)
            // return {}
          }

        }


        const mensaje = nuevoEstadoCobertura === 1
          ? "REACTIVATION_SERVICE"
          : nuevoEstadoCobertura === 2
            ? "SUSPENSION_SERVICE"
            : "";

        const respuesta = {
          results: resultadosFinales,
          id: idReserva,
          fecha: fechaActual,
          mensaje: mensaje,
          status: 200,
        };

        const respuestaCopia = {
          ...respuesta,
          id_: resultadoActualizacion
        };

        const datosLogFinal = {
          traza_smartcar: respuestaCopia,
          api_smartcar_exito: respuesta,
          api_smartcar_error: "",
          id_accion_smartcar: accionSmartcarId,
          accion_smartcar: accionSmartcarNombre,
          solicitud_smartcar: requestContext,
        };

        updateLogRecordSmartcar(idLogCreado, datosLogFinal);

        return respuesta;
      } else {
        const respuestaError = {
          results: resultadosFinales,
          id: idReserva,
          fecha: fechaActual,
          mensaje: "ERROR",
          status: 400,
        };

        const respuestaCopia = {
          ...respuestaError,
          id_: resultadoActualizacion
        };

        const datosLogError = {
          traza_smartcar: respuestaCopia,
          api_smartcar_exito: "",
          api_smartcar_error: respuestaError,
          id_accion_smartcar: accionSmartcarId,
          accion_smartcar: accionSmartcarNombre,
          solicitud_smartcar: requestContext,
        };

        updateLogRecordSmartcar(idLogCreado, datosLogError);

        return respuestaError;
      }
    } catch (error) {
      log.debug("Error", error);

      return {
        results: [{ "id": "0", "name": "SIMCARD", "value": "0" }, { "id": "0", "name": "IMEI", "value": "0" }],
        id: 0,
        mensaje: "ERROR",
        fecha: formatToISO8601(new Date()),
        status: 400,
      };
    }
  };

  const actualizarCampoHTSimCard = (requestContext) => {
    try {
      log.debug("Iniciando actualizarCampoHTSimCard", requestContext);

      // Extraer parámetros
      const idReserva = requestContext.idreserva;
      const nuevoValor = requestContext.celular;

      if (!nuevoValor) {
        throw new Error("nuevoValorSimCard es requerido en requestContext");
      }

      // ===== PASO 1: Obtener y validar datos de Smartcar =====
      log.debug("PASO 1: Obteniendo registro Smartcar para idReserva:", idReserva);
      let registroSmartcar;

      try {
        registroSmartcar = obtenerLogRecordSmartcar(idReserva);
        if (!registroSmartcar?.id_dispositivo || !registroSmartcar?.id_simcard) {
          throw new Error("No se encontró registro válido en Smartcar");
        }
        log.debug("Smartcar validado:", registroSmartcar);
      } catch (smartcarError) {
        throw new Error("Error Smartcar: " + smartcarError.message);
      }

      // ===== PASO 2: Obtener y validar SIM Card =====
      log.debug("PASO 2: Obteniendo SIM Card ID:", registroSmartcar.id_simcard);
      let dataSimCard;

      try {
        dataSimCard = obtenerSimCardPorId(registroSmartcar.id_simcard);
        log.debug("SIM Card obtenida:", dataSimCard);

        // Verificar si ya tiene un número de celular
        if (dataSimCard?.custrecord_ht_ds_numerocelsim && dataSimCard.custrecord_ht_ds_numerocelsim.trim() !== "" && dataSimCard.custrecord_ht_ds_numerocelsim != "0") {
          log.debug("La SIM Card ya tiene un número asignado:", dataSimCard.custrecord_ht_ds_numerocelsim);
          throw new Error("La SIM Card ya tiene un número asignado. No se actualiza registro existente.");
        }

        log.debug("SIM Card válida para actualizar (sin número previo)");
      } catch (simError) {
        throw new Error("Error SIM Card: " + simError.message);
      }

      // ===== PASO 3: Actualizar SIM Card =====
      log.debug("PASO 3: Actualizando SIM Card con nuevo valor:", nuevoValor);
      let idSimCardActualizado;

      try {
        idSimCardActualizado = record.submitFields({
          type: "customrecord_ht_record_detallechasersim",
          id: registroSmartcar.id_simcard,
          values: {
            custrecord_ht_ds_numerocelsim: nuevoValor,
          },
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        });
        log.debug("SIM Card actualizado. ID:", idSimCardActualizado);
      } catch (updateSimError) {
        throw new Error("Error actualizando SIM Card: " + updateSimError.message);
      }

      // ===== PASO 4: Buscar registros relacionados en MantChaser =====
      log.debug("PASO 4: Buscando registros MantChaser relacionados");
      let registrosMantChaser = [];

      try {
        const datoTecnicoSearch = search.create({
          type: 'customrecord_ht_record_mantchaser',
          filters: [
            ['custrecord_ht_mc_celularsimcard', 'is', idSimCardActualizado]
          ],
          columns: [
            'custrecord_ht_mc_seriedispositivo',
            'custrecord_ht_mc_celularsimcard'
          ]
        });

        const pagedData = datoTecnicoSearch.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(pageRange => {
          const page = pagedData.fetch({ index: pageRange.index });
          page.data.forEach(result => {
            registrosMantChaser.push({
              idInterno: result.id,
              serieDispositivo: result.getValue('custrecord_ht_mc_seriedispositivo'),
              celularSimCard: result.getValue('custrecord_ht_mc_celularsimcard')
            });
          });
        });
        log.debug("Registros MantChaser encontrados:", registrosMantChaser.length);
      } catch (searchError) {
        log.debug("Error en búsqueda MantChaser:", searchError.message);
        registrosMantChaser = [];
      }

      // ===== PASO 5: Actualizar cada registro MantChaser =====
      log.debug("PASO 5: Actualizando " + registrosMantChaser.length + " registros MantChaser");
      let cantidadActualizada = 0;

      registrosMantChaser.forEach(registro => {
        try {
          record.submitFields({
            type: "customrecord_ht_record_mantchaser",
            id: registro.idInterno,
            values: {
              custrecord_ht_mc_nocelularsim: nuevoValor,
            },
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          });
          cantidadActualizada++;
          log.debug("MantChaser actualizado. ID:", registro.idInterno);
        } catch (updateError) {
          log.debug("Error actualizando MantChaser ID " + registro.idInterno + ":", updateError.message);
        }
      });
      log.debug("Registros MantChaser actualizados:", cantidadActualizada);

      // ===== RESPUESTA EXITOSA =====
      const fechaActual = formatToISO8601(new Date());
      log.debug("Proceso completado exitosamente");

      return {
        results: [],
        id: idReserva,
        fecha: fechaActual,
        status: 200,
        mensaje: `OK - SIM Card`// y ${cantidadActualizada} registros MantChaser actualizados`,
        // recordsActualizados: cantidadActualizada,
      };

    } catch (error) {
      log.debug("Error en actualizarCampoHTSimCard:", error.message);

      return {
        results: [],
        id: requestContext?.idreserva || 0,
        fecha: formatToISO8601(new Date()),
        status: 400,
        mensaje: "ERROR: " + error.message,
      };
    }
  };
  // Obtener información de la SIM Card por ID interno
  const obtenerSimCardPorId = (idInterno) => {
    try {
      log.debug("obtenerSimCardPorId", { idInterno });

      if (!idInterno) {
        log.error("Error", "El ID interno es requerido");
        return {};
      }

      const searchObj = search.create({
        type: "customrecord_ht_record_detallechasersim",
        filters: [
          ["internalid", "is", idInterno],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          "custrecord_ht_ds_simcard",
          "custrecord_ht_ds_serie",
          "custrecord_ht_ds_tiposimcard",
          "custrecord_ht_ds_operadora",
          "custrecord_ht_ds_ip",
          "custrecord_ht_ds_apn",
          "custrecord_ht_ds_numerocelsim",
          "custrecord_ht_ds_estado",
          "custrecord_ht_ds_fechacorte",
          "custrecord_ht_ds_icc",
          "custrecord_ht_ds_estado_conciliacion",
          "custrecord_ht_ds_token",
          "name",
          "internalid"
        ]
      });

      const result = searchObj.run().getRange({ start: 0, end: 1 })[0];

      if (!result) {
        log.debug("Sin resultados para el ID", idInterno);
        return {};
      }

      return {
        custrecord_ht_ds_simcard: result.getValue("custrecord_ht_ds_simcard"),
        custrecord_ht_ds_serie: result.getValue("custrecord_ht_ds_serie"),
        custrecord_ht_ds_tiposimcard: result.getValue("custrecord_ht_ds_tiposimcard"),
        custrecord_ht_ds_operadora: result.getValue("custrecord_ht_ds_operadora"),
        custrecord_ht_ds_ip: result.getValue("custrecord_ht_ds_ip"),
        custrecord_ht_ds_apn: result.getValue("custrecord_ht_ds_apn"),
        custrecord_ht_ds_numerocelsim: result.getValue("custrecord_ht_ds_numerocelsim"),
        custrecord_ht_ds_estado: result.getValue("custrecord_ht_ds_estado"),
        custrecord_ht_ds_fechacorte: result.getValue("custrecord_ht_ds_fechacorte"),
        custrecord_ht_ds_icc: result.getValue("custrecord_ht_ds_icc"),
        custrecord_ht_ds_estado_conciliacion: result.getValue("custrecord_ht_ds_estado_conciliacion"),
        custrecord_ht_ds_token: result.getValue("custrecord_ht_ds_token"),
        name: result.getValue("name"),
        internalid: result.getValue("internalid"),
      };

    } catch (error) {
      log.error("Error en obtenerSimCardPorId", { error: error.message, stack: error.stack });
      return {};
    }
  };

  // Get Reserva 2 - VARIANTE DE PRUEBA (selección aleatoria, no cambia estados, no guarda log)
  const GetReserva2 = (requestContext) => {
    try {
      const ID_BODEGA = '654';
      const ID_ITEM_DISPOSITIVO = '22059'; // Dispositivos
      const ID_ITEM_SIMCARD = '43868'; // SimCard

      const ID_ESTADO_RESERVA_DISPOSITIVO = '9'; // Estado Reservado
      const ID_ESTADO_DISPONIBLE_DISPOSITIVO = '5'; // Estado Disponible

      const ID_ESTADO_RESERVA_SIMCARD = '6'; // Estado Reservado
      const ID_ESTADO_DISPONIBLE_SIMCARD = '7'; // Estado Disponible

      const infodispositivos = obtenerTodasLosItemsBodegaDispositivo2(ID_BODEGA, ID_ITEM_DISPOSITIVO, ID_ESTADO_DISPONIBLE_DISPOSITIVO);
      const infoSimCard = obtenerTodasLosItemsBodegaSimCard2(ID_BODEGA, ID_ITEM_SIMCARD, ID_ESTADO_DISPONIBLE_SIMCARD);

      log.debug("GetReserva2 - Disponibles", {
        dispositivos: infodispositivos.length,
        simcards: infoSimCard.length
      });

      if (infodispositivos.length >= 1 && infoSimCard.length >= 1) {
        const idxDisp = Math.floor(Math.random() * infodispositivos.length);
        const idxSim = Math.floor(Math.random() * infoSimCard.length);

        const dispositivoElegido = infodispositivos[idxDisp];
        const simCardElegido = infoSimCard[idxSim];

        const infoDispositivoEncontrado = obtenerInformacionDispositivo(dispositivoElegido.numero_inventario);
        const infoSimCardEncontrado = obtenerInformacionSimCard(simCardElegido.numero_inventario);

        if (!infoDispositivoEncontrado || !infoSimCardEncontrado) {
          return guardarLogYResponder(null, null, 400, "Error al obtener información de los ítems", requestContext);
        } else {
          const reservaDispositivo = cambiarEstadoReservado(infoDispositivoEncontrado.internalid, ID_ESTADO_RESERVA_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
          const reservaSimCard = cambiarEstadoReservado(infoSimCardEncontrado.internalid, ID_ESTADO_RESERVA_SIMCARD, 'customrecord_ht_record_detallechasersim');
          if (reservaDispositivo && reservaSimCard) {
            return guardarLogYResponder(infoDispositivoEncontrado, infoSimCardEncontrado, 200, "Proceso de Reserva Finalizado", requestContext);
          } else {

            if (reservaDispositivo) {
              cambiarEstadoReservado(infoDispositivoEncontrado.internalid, ID_ESTADO_DISPONIBLE_DISPOSITIVO, 'customrecord_ht_record_detallechaserdisp');
            }

            if (reservaSimCard) {
              cambiarEstadoReservado(infoSimCardEncontrado.internalid, ID_ESTADO_DISPONIBLE_DISPOSITIVO, 'customrecord_ht_record_detallechasersim');
            }

            return guardarLogYResponder(infoDispositivoEncontrado, infoSimCardEncontrado, 400, "Error al reservar los ítems", requestContext);
          }
        }

        // log.debug("GetReserva2 - Información Encontrada", { infoDispositivoEncontrado: infoDispositivoEncontrado, infoSimCardEncontrado: infoSimCardEncontrado, "200": 200, "Proceso de Reserva Finalizado": "Proceso de Reserva Finalizado", requestContext: requestContext });
        // return {
        //   results: [
        //     {
        //       id: infoSimCardEncontrado?.internalid || 0,
        //       name: "SIMCARD",
        //       value: infoSimCardEncontrado?.custrecord_ht_ds_serie || ""
        //     },
        //     {
        //       id: infoDispositivoEncontrado?.internalid || 0,
        //       name: "IMEI",
        //       value: infoDispositivoEncontrado?.custrecord_ht_dd_imei || ""
        //     }
        //   ],
        //   id: 0,
        //   fecha: formatToISO8601(new Date()),
        //   status: 200,
        //   message: "PRUEBA GetReserva2 - Selección aleatoria (no se cambiaron estados)",
        //   debug: {
        //     totalDispositivos: infodispositivos.length,
        //     totalSimCards: infoSimCard.length,
        //     indiceDispositivo: idxDisp,
        //     indiceSimCard: idxSim,
        //     dispositivoElegido: dispositivoElegido,
        //     simCardElegido: simCardElegido
        //   }
        // };

      } else {
        return guardarLogYResponder(infodispositivos[0], infoSimCard[0], 400, `Falta disponibilidad: DISPOSITIVO ${infodispositivos.length}, SIMCARD ${infoSimCard.length}`, requestContext);
      }

    } catch (error) {
      log.debug("Error GetReserva2", { message: error.message, stack: error.stack });
      return guardarLogYResponder(null, null, 400, error.message, requestContext);
    }
  };

  // Versión 2 - devuelve múltiples filas (para selección aleatoria)
  const obtenerTodasLosItemsBodegaDispositivo2 = (BODEGA, ITEM, ID_ESTADO) => {

    log.debug("obtenerTodasLosItemsBodegaDispositivo2", { BODEGA, ITEM, ID_ESTADO });

    try {
      let sqlQuery = `
        SELECT TOP 100
            ItemBinQuantity.bin AS Deposito,
            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
            Item.description AS DESCRIPCION,
            inventorybalance.inventorynumber AS ID_INVENTARIO,
            BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario
        FROM
            ItemBinQuantity
        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
        INNER JOIN inventorybalance ON inventorybalance.item = Item.id
            AND inventorybalance.binnumber = ItemBinQuantity.bin
        INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
            ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
        WHERE
            ItemBinQuantity.bin = ?
            AND ItemBinQuantity.OnHand > 0
            AND Item.itemtype = 'InvtPart'
            AND HtDispositivo.custrecord_ht_dd_estado = ?
            AND HtDispositivo.isinactive = 'F' 
        ORDER BY
            Item.id;
        `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
        params: [BODEGA, ID_ESTADO]
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
        return results;
      }

    } catch (error) {
      log.error("Error obtenerTodasLosItemsBodegaDispositivo2", { error: error.message, stack: error.stack });
      return [];
    }
  };

  // Versión 2 - devuelve múltiples filas (para selección aleatoria)
  const obtenerTodasLosItemsBodegaSimCard2 = (BODEGA, ITEM, ID_ESTADO) => {

    log.debug("obtenerTodasLosItemsBodegaSimCard2", { BODEGA, ITEM, ID_ESTADO });

    try {
      let sqlQuery = `
        SELECT TOP 100
            ItemBinQuantity.bin AS Deposito,
            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
            Item.description AS DESCRIPCION,
            inventorybalance.inventorynumber AS ID_INVENTARIO,
            BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario
        FROM
            ItemBinQuantity
        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
        INNER JOIN inventorybalance ON inventorybalance.item = Item.id
            AND inventorybalance.binnumber = ItemBinQuantity.bin
        INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERSIM AS HtDispositivo 
            ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
        WHERE
          custrecord_ht_ds_serie IS NOT NULL
           AND ItemBinQuantity.bin = ?
           AND Item.id = ?
           AND ItemBinQuantity.OnHand > 0
           AND Item.itemtype = 'InvtPart'
           AND HtDispositivo.custrecord_ht_ds_estado =  ?
           AND HtDispositivo.isinactive = 'F' 
        ORDER BY
            Item.id;
        `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
        params: [BODEGA, ITEM, ID_ESTADO]
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
        return results;
      }

    } catch (error) {
      log.error("Error obtenerTodasLosItemsBodegaSimCard2", { error: error.message, stack: error.stack });
      return [];
    }
  };

  return {
    get: _get,
    post: _post
  };
});
