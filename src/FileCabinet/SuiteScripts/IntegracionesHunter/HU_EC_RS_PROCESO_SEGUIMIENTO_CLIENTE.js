/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(["N/log", "N/search", 'N/record', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], (log, search, record, coberturaController) => {

  const _post = (requestBody) => {
    log.debug("POST request received", requestBody);
    try {
      const data = PostSeguimiento(requestBody);
      log.debug("Respuesta Post 1", data);
      return JSON.stringify(data);
    } catch (e) {
      log.debug("Error respuesta Post 1", e);
      return JSON.stringify({ "results": [{"CODIGO":"400","DESCRIPCION":"Error al generar seguimiento", "ID": 0}] });
    }
  };

  const PostSeguimiento = (requestBody) => {
     try {
        log.debug("PostSeguimiento", requestBody);

        let dataPrueba = coberturaController.GenerarSeguimientoCliente(requestBody);
       
        if (dataPrueba.id > 0) {
          return { "results": [{"CODIGO":"200","DESCRIPCION":"Seguimiento generado correctamente", "ID": dataPrueba.id}] };
        } else {
          let Descripcion = dataPrueba?.Mensaje ? dataPrueba?.Mensaje.replace(/[,:]/g, "") : "Error al generar seguimiento"; // Ajuste Caracteres
          return { "results": [{"CODIGO":"400","DESCRIPCION":Descripcion || "Error al generar seguimiento", "ID": 0}] };
        }
        
      } catch (error) {
        log.debug("Error PostSeguimiento", { error: error.message, stack: error.stack });
        return { "results": [{"CODIGO":"400","DESCRIPCION":"Error al generar seguimiento", "ID": 0}] };
      }
  };

  return {
    post: _post,
  };
});