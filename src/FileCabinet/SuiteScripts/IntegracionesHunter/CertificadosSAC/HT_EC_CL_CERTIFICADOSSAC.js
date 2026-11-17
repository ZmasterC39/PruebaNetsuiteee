/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/log", "N/record"], function (log, record) {
  const pageInit = (context) => {
    log.debug("La página se ha cargado");
  };

  function openURL(bien, cobertura, name, correo) {
    let url = `https://www.hunteronline.com.ec/WSConcesionarios/Forms/ConsultaDatosNetsuite.aspx?Id=${bien}&cobertura=${cobertura}&name=${name}&usuario=${correo}`;
    //url = `http://localhost:55942/Forms/ConsultaDatosNetsuite.aspx?Id=${bien}&cobertura=${cobertura}&name=${name}`;
    const width = 1050; // Ancho de la ventana
    const height = 435; // Alto de la ventana

    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      url,
      "_blank",
      `width=${width},height=${475},top=${top},left=${left}`
    );
  }

  function impulsoPX(internalid, subsidiaria) {
    try {
      console.log("-internalid-", internalid)
      console.log("-subsidiaria-", subsidiaria)
      crearRegistroImpulso(internalid, "ImpulsoDirecto");     
      return true;
    } catch (e) {
      log.error("Error al IMPULSO PX", e);
    }
  }

  const crearRegistroImpulso = (cobertura, plataforma) => {
    try {
      let objRecord = record.create({ type: 'customrecord_log_proceso_general' });
      objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: cobertura });
      objRecord.setValue({ fieldId: 'custrecord_impulso_log_pro_general', value: 0 });
      objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: plataforma});
      return objRecord.save();
    } catch (error) {
      console.log('Error al crear el registro de traza', error);
      return null;
    }
  };
  
  return {
    pageInit: pageInit,
    openURL: openURL,
    impulsoPX: impulsoPX,
  };
});
