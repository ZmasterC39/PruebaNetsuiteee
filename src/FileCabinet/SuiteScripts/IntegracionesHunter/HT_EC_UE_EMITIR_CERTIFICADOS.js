/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/https",
  "N/ui/serverWidget",
  "N/runtime",
  "N/log",
  "../../../UtilsGeneral/HU_EC_CONSTANTES",
  "../../../UtilsGeneral/HU_EC_FUNCION",
], (https, serverWidget, runtime, log, _const, _funcion) => {
  const beforeLoad = (scriptContext) => {
    try {
      let objRecord = scriptContext.newRecord;
      var id = objRecord.id;
      var type = objRecord.type;
      let idBien = objRecord.getValue("custrecord_ht_co_bien");
      let [bien] = sendPostEncrypt(idBien);

      log.debug("idBien", idBien);
      log.debug("bien", bien);

      scriptContext.form.addButton({
        id: "custpage_print_button_pop",
        label: "Certificados SAC",
        functionName: `openURL('${bien}')`,
      });

      scriptContext.form.clientScriptModulePath =
        "SuiteScripts/IntegracionesHunter/Plantillas/TipoRegistro/CoberturaDeDispositivos/HT_EC_CL_COBERTURA_DISPOSITIVOS.js";
    } catch (e) {
      log.debug("ERROR", e);
    }
  };

  function sendPostEncrypt(bien) {
    var dataToSend = {
      data: [bien + ""], //VBC , Transaccion+"", Fecha+""
    };

    var headers = {
      "Content-Type": "application/json",
    };

    var options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(dataToSend),
    };

    try {
      var response = https.post({
        url: _const.URLS.HUNTER_API_NETSUITE + "/CodificarString",
        body: options.body,
        headers: options.headers,
      });

      if (response.code === 200) {
        var responseBody = JSON.parse(response.body);
        return responseBody;
      } else {
        log.error(
          "HTTP Error",
          `Status Code: ${response.code}, Response Body: ${response.body}`
        );
      }
    } catch (error) {
      log.error("Exception", `Error while sending request: ${error.message}`);
    }
  }

  return { beforeLoad };
});
