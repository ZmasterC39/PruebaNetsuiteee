/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/log", "./HU_EC_CORE_IMPULSO_PLATAFORMA.js"], (log, _coreimp) => {
  const _post = (requestBody) => {
    try {
      let idBien = requestBody.idBien;
      return _coreimp.actualizarBien(idBien);
    } catch (error) {
      log.error("error", error);
    }
  };

  return {
    post: _post,
  };
});
