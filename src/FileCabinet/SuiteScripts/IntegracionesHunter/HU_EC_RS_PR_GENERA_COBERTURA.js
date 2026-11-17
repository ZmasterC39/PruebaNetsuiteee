/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(["N/log", "N/search", 'N/record', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], (log, search, record, coberturaController) => {

    const _post = (requestBody) => {
            if (!requestBody.ADP && requestBody.esConvenio == true){
                try {
                    const data = InstalacionConvenio(requestBody);
                    log.debug("InstalacionConvenio", data);
                    return JSON.stringify(data);
            
                  } catch (e) {
                    log.debug("Error respuesta InstalacionConvenio", e);
                    return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
                  }          
            } else {
                try{
                    var ADP = "";
                    //traigo la orden consultada para verificar si existe un item que mueva cobertura PPS
                    const dataResult = coberturaController.obtenerItemParametrizadoPorBien_V2(requestBody.idOrdenServicio, requestBody.idbien, requestBody.Empresa );
                    if (dataResult.flatMap(entry => entry.items).find(item => item.pps === "S")){
                        // traigo los ítems 
                        let ArrOrdenes = coberturaController.obtenerItemParametrizadoPorBien_V2(null, requestBody.idbien, requestBody.Empresa, dataResult[0].fechaOs);
                        let FamiliaProd = dataResult[0].valor;
                        const ArrOSxFamilia = ArrOrdenes[0].items.filter(item => item.familiaGrupo === FamiliaProd)
                        return ArrOSxFamilia;

                    }

                } catch (e) {
                    log.debug("Error respuesta Post 2", e);
                    return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
                }
            }

               /* switch (requestBody.ADP) {
                    case "001":
                        try {
                            const data = Instalacion001(requestBody);
                            log.debug("Instalacion001", data);
                            return JSON.stringify(data);
                    
                          } catch (e) {
                            log.debug("Error respuesta Instalacion001", e);
                            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
                          }
                    case "004":
                        try {
                            const data = Renovacion004(requestBody);
                            log.debug("Renovacion004", data);
                            return JSON.stringify(data);
                    
                          } catch (e) {
                            log.debug("Error respuesta Renovacion004", e);
                            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
                          }
                    case "010":
                        try {
                            const data = CambioPropietario010(requestBody);
                            log.debug("CambioPropietario010", data);
                            return JSON.stringify(data);
                    
                          } catch (e) {
                            log.debug("Error respuesta CambioPropietario010", e);
                            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
                          }

                }
            } */

    }

    /*
    const Instalacion001 = (requestBody) => {
        log.debug("Accion: ","Instalacion 001");

        return { results: respuesta, status: "Proceso Finalizado" };
    }


    const InstalacionConvenio = (requestBody) => {
        log.debug("Accion: ","InstalacionConvenio");

        return { results: respuesta, status: "Proceso Finalizado" };
    }


    const Renovacion004 = (requestBody) => {
        log.debug("Accion: ","Renovacion004");

        return { results: respuesta, status: "Proceso Finalizado" };
    }


    const CambioPropietario010 = (requestBody) => {
        log.debug("Accion: ","CambioPropietario010");

        return { results: respuesta, status: "Proceso Finalizado" };
    }*/
  
    return {
        post: _post,
      };

});