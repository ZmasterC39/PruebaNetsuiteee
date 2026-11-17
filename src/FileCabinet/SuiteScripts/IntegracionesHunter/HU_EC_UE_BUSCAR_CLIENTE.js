/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * AUTOR: Mauro F Ramos
 * FECHA: 13/01/2025
 * DESCRIPCION: Creación de un botón para buscar información de un cliente,
 * Por medio del uso de la API más datos
 */
define(["N/log"], function (log) {
  function beforeLoad(context) {
    try {
      if (context.type === context.UserEventType.CREATE) {
        var form = context.form;
        form.addButton({
          id: "custpage_search_client",
          label: "Buscar Cliente",
          functionName: `buscarCliente`,
        });
        form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_CLIENTE.js";
        }
    } catch (error) {
      log.debug("ERROR ", error);
    }
  }
  return {
    beforeLoad: beforeLoad,
  };
});
