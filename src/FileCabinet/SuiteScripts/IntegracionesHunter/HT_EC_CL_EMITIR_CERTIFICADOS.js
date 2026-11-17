/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/log"], function (log) {
  const pageInit = (context) => {
    log.debug("La página se ha cargado");
  };

  function openURL(bien) {
    // let url = `http://localhost:55942/Forms/ConsultaDatosNetsuite.aspx?Id=${bien}`;
    let url = `https://www.hunteronline.com.ec/WSConcesionarios/Forms/ConsultaDatosNetsuite.aspx?Id=${bien}`;
    window.open(url, "_blank");
  }

  return {
    pageInit: pageInit,
    openURL: openURL,
  };
});
