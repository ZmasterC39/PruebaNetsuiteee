/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(["N/https","N/log", "N/search", 'N/record', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',"./UtilsGeneral/HU_EC_FUNCION", "./UtilsGeneral/HU_EC_CONSTANTES"], (https,log, search, record, coberturaController,_funcion, _const) => {

  const _post = (requestBody) => {

    log.debug("POST request received", requestBody);

    const { opcion = "0", esConvenio = false  } = requestBody || {};
  
    switch (opcion) {
      case 1:
        try {
          const data = PostCaso1(requestBody);
          log.debug("Respuesta Post 1", data);
          return JSON.stringify(data);
  
        } catch (e) {
          log.debug("Error respuesta Post 1", e);
          return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
        }
      default:
        log.debug({ title: "default Post", details: requestBody });
        return JSON.stringify({ results: [] });
        }
  };

  const PostCaso1 = (requestBody) => {
    const familiasdisponibles = coberturaController.obtenerTodasFamiliasProducto();
    const procesosComunes = { "010": Proceso_Cambio_Propietario_010 };

    const gruposdefamilia = familiasdisponibles.reduce((handlers, family) => {
      handlers[family] = { ...procesosComunes };
      return handlers;
    }, {});

    const respuesta = [];
    const manejarError = (mensaje) => {
      respuesta.push({
        Cobertura_ID: 0,
        DetalleCobertura_ID: 0,
        Mensaje: mensaje,
      });
    };

    try {
      const dataResult = coberturaController.obtenerItemParametrizadoPorBien( requestBody.idOrdenServicio, requestBody.idbien );

      log.debug("dataResult", dataResult);

      if (dataResult.length === 0) {
        manejarError("No se encontraron datos para el bien especificado.");
        return {
          results: respuesta,
          status: "Error",
          message: "No se encontraron datos",
        };
      }
 
      const procesarItem = (item, requestBody, gruposdefamilia, respuesta) => {
        const family = item.valor;
        const json = gruposdefamilia[family] ? CoreFamilia(item, requestBody, family, gruposdefamilia) : null;

        // Caso solo 010
        if (json?.results?.length > 0) {
          json.results.forEach((item) => {
            respuesta.push(item);
          });
          return;
        }
        
        // Caso 001, 004
        return json
          ? respuesta.push(coberturaController.Genera_Actualiza_Cobertura(json))
          : manejarError(`No se pudo generar la cobertura para la familia: ${family}`);
      };

      dataResult.forEach((item) => {
        gruposdefamilia[item.valor]
          ? procesarItem(item, requestBody, gruposdefamilia, respuesta)
          : manejarError(`No se encontró un manejador para la familia: ${item.valor}`);
      });

      return { results: respuesta, status: "Proceso Finalizado" };
    } catch (error) {
      log.debug("Error PostCaso1", error);
      manejarError(error.message);
      return { results: respuesta, status: "Error", message: error.message };
    }
  };

  function CoreFamilia(item, requestBody, familia, gruposdefamilia) {
    try {

      let coreRespuesta; 
      let listaAdp = coberturaController.ObtenerAdpItems(item);
      log.debug("listaAdp: ", listaAdp);
      const proceso = coberturaController.DeterminarProceso(listaAdp);
      log.debug("proceso: ", proceso);

        switch (proceso) {
          case 4:
            coreRespuesta = Proceso_Cambio_Propietario_010(item, familia, requestBody, gruposdefamilia);
            break;
          default:
            log.debug("Error", "No se encontró un proceso adecuado para los valores de adp proporcionados.");
            coreRespuesta = null;
            break;
        }

        return coreRespuesta;
    } catch (error) {
      log.debug("Error CoreFamily", error);
      return null;
    }
  };

  function Proceso_Cambio_Propietario_010(item, familia, requestBody, gruposdefamilia) {
    
    let dataCobertura = [];

    try {
      log.debug("ProcesoCambioPropietario", { item, familia, requestBody });
      
      // Buscar el ítem correspondiente al cambio de propietario
      const cambioPropietarioItem = item.items.find((subItem) => subItem.type === "Service" && subItem.pps === "S" && subItem.adp === "010");

      if(cambioPropietarioItem){        
        let infoCoberturaEncontrada = coberturaController.obtenerCoberturaVehiculoFamilia(cambioPropietarioItem.idbien, cambioPropietarioItem.valorfamilia)
        let respuesta = EstructurarJSON(cambioPropietarioItem, cambioPropietarioItem, requestBody, {adp : cambioPropietarioItem?.adp, concepto: 15, cobertura: infoCoberturaEncontrada?.id, fecha: null });

        return respuesta;
      }
    } catch (error) {
      dataCobertura.push({
        Cobertura_ID: 0,
        DetalleCobertura_ID: 0,
        Mensaje: error.message
      });

      return { results: dataCobertura, status: "Error", message: error.message };
    }
  }; // ! Prueba

  /*
  * Importante Eventos retorna un JSON
  * */
  function EstructurarJSON(emsambleItem, servicioItem, requestBody, infodinamic) {
      try {
        const obtenerDetallesItem = (item) => coberturaController.obtenerInformacionItemOs(item.internalidOs, item.iditem, item.valorfamilia);
        const IdentificaEstadoCobertura = (item) => item.pps === "N" ? 3 : 1;
        const fechaAccion = (fecha) => `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  
        let detallesServicio, detalleEnsamble, EstadoCobertura, EstadoInstalacion, infoOS, infoOT, cobertura, Ensamble, json = {};
    
        switch (infodinamic.adp) {
          case "001":
            EstadoCobertura = IdentificaEstadoCobertura(servicioItem);
            EstadoInstalacion = 1;
    
            detalleEnsamble = obtenerDetallesItem(emsambleItem);
            detallesServicio = obtenerDetallesItem(servicioItem);
    
            if (!detallesServicio || (detallesServicio?.quantity === 0 && detallesServicio?.unidadTiempo === 0)) {
              throw new Error("El ítem de servicio no posee unidad ni tiempo, Verifique.");
            }
    
            infoOS = coberturaController.obtenerNombreOS(detallesServicio.idOS);
            infoOT = coberturaController.obtenerOrdenesdeTrabajoXordenServicio(parseInt(detallesServicio.idOS), detalleEnsamble.items);
            Ensamble = coberturaController.validarExistenciaEnsamblajeParaOT(infoOT[0]?.id);
            cobertura = coberturaController.CalcularCobertura(detallesServicio.quantity, parseInt(detallesServicio.unidadTiempo), infoOS?.trandate);
    
            log.debug("infoOT", infoOT);

            if (infoOT[0]?.estado === "7" || (infoOT[0]?.estado === "4" && !Ensamble) || infoOT[0]?.estado == "" ) {
              cobertura = coberturaController.CalcularCobertura(0, 0, "01/01/1900");
              EstadoCobertura = 3;
              EstadoInstalacion = detallesServicio.quantity = "";
            }
    
            // if(false){
            if (infoOT?.length > 0 || requestBody?.esConvenio) {
              json = CrearJson(detalleEnsamble, detallesServicio, infoOT[0], cobertura, EstadoInstalacion, EstadoCobertura, requestBody, infodinamic);
            } else {
              log.debug("Error", "No se encontraron órdenes de trabajo para la orden de servicio.");
            }
            break;
    
          case "004":
            EstadoCobertura = IdentificaEstadoCobertura(servicioItem);
            EstadoInstalacion = 1;
    
            detallesServicio = obtenerDetallesItem(servicioItem);
            infoOS = coberturaController.obtenerNombreOS(detallesServicio.idOS);
            infoOT = coberturaController.obtenerOrdenesdeTrabajoXordenServicio(false, false, requestBody?.idbien);
  
            let fechaHoy = new Date();
            const fechaCobertura = coberturaController.CompararFechas(infodinamic.fecha, infoOS.trandate) ? fechaAccion(fechaHoy) : infodinamic.fecha;
            cobertura = coberturaController.CalcularCobertura(detallesServicio.quantity, parseInt(detallesServicio.unidadTiempo), fechaCobertura);
    
            if (infoOT?.length > 0) {
            // if (false) {
              json = CrearJson(detallesServicio, detallesServicio, infoOT[0], cobertura, EstadoInstalacion, EstadoCobertura, requestBody, infodinamic);
            } else {
              log.debug("Error", "No se encontraron órdenes de trabajo.");
            }
            break;
    
          case "010":
            EstadoCobertura = IdentificaEstadoCobertura(servicioItem);
            EstadoInstalacion = 1;
    
            detallesServicio = obtenerDetallesItem(servicioItem);
            infoOS = coberturaController.obtenerNombreOS(detallesServicio.idOS);
            infoOT = coberturaController.obtenerOrdenesdeTrabajoXordenServicio(false, false, requestBody?.idbien);
  
            const fechaCobertura010 = infoOS?.trandate;
            cobertura = coberturaController.CalcularCobertura(detallesServicio.quantity, parseInt(detallesServicio.unidadTiempo), fechaCobertura010);
    
            // Nuevo propietario
            detallesServicio.cliente = detallesServicio?.clienteItem ? detallesServicio?.clienteItem : detallesServicio?.cliente;

            if (infoOT?.length > 0) {
            // if (false) {
              json = CrearJson(detallesServicio, detallesServicio, infoOT[0], cobertura, EstadoInstalacion, EstadoCobertura, requestBody, infodinamic);
            } else {
              log.debug("Error", "No se encontraron órdenes de trabajo.");
            }
            break;

          default:
            log.debug("Error", "Tipo de operación no soportada.");
            break;
        }
    
        return json;
    
      } catch (error) {
        log.debug("Error generarJson", error);
        return {};
      }
  };

  function CrearJson(detallesItem, detallesItemInst, infoOT, cobertura, EstadoInstalacion, EstadoCobertura, requestBody, infodinamic) {

     const esConvenio = requestBody.esConvenio;
     const esAdp004 = infodinamic.adp === "004";
     const ValorDefinido = (valor, defecto = "") => valor ?? defecto; 

     return {
         bien: ValorDefinido(requestBody.idbien),
         propietario: ValorDefinido(detallesItem?.cliente),
         start: esConvenio ? "01/01/1900" : ValorDefinido(cobertura?.coberturaInicial),
         plazo: esConvenio ? 0 : ValorDefinido(detallesItemInst?.quantity),
         end: esConvenio ? "01/01/1900" : ValorDefinido(cobertura?.coberturaFinal),
         estado: esConvenio ? null : ValorDefinido(EstadoInstalacion),
         concepto: esConvenio ? 12 : ValorDefinido(infodinamic.concepto),
         producto: esAdp004 ? null : ValorDefinido(detallesItem?.items), 
         salesorder: ValorDefinido(detallesItemInst?.idOS),
         serieproducto: esAdp004 ? null : ValorDefinido(infoOT?.serieProductoAsignacion),
         ordentrabajo: esAdp004 ? null : ValorDefinido(infoOT?.id),
         monitoreo: "",
         cobertura: ValorDefinido(infodinamic.cobertura),
         ttr: ValorDefinido(detallesItemInst?.ttr),
         estadoCobertura: ValorDefinido(EstadoCobertura),
         t_PPS: true,
         modeloDispositivo: esAdp004 ? null : ValorDefinido(infoOT?.modelo),
         unidadDispositivo: esAdp004 ? null : ValorDefinido(infoOT?.unidad),
         vidDispositivo: esAdp004 ? null : ValorDefinido(infoOT?.vid)
     };
  };

  return {
    post: _post,
  };
});