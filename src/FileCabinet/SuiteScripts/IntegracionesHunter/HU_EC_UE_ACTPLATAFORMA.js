/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/log", 'N/runtime', "SuiteScripts/IntegracionesHunter/HU_EC_CORE_IMPULSO_PLATAFORMA", 'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
], (log, runtime, _coreimp, _platformControllerLatam) => {
  // beforeLoad
  function beforeLoad(context) {
      try {
        let usuario = runtime.getCurrentUser();
        if(context.type === context.UserEventType.VIEW){
          // MRAMOS
          // 1894 EC - DesarrolloTI
          if([1894].includes(usuario.role)){
          let campos_sensibles;
          let record = context.newRecord;
          let tipo_bien = record.getValue({ fieldId: 'custrecord_ht_bien_tipobien' });
          let sub_tipo_bien = record.getValue({ fieldId: 'custrecord_ht_bien_tipoterrestre' });
          log.debug("tipo_bien", tipo_bien);
          if (tipo_bien == 1 && (sub_tipo_bien == 1 || 30)) {
            campos_sensibles = {
              BIENES: [
                { fieldId: 'custrecord_ht_bien_placa', nextTo: 'custrecord_ht_bien_placa', position: 'NONE' },
                { fieldId: 'custrecord_ht_bien_chasis', nextTo: 'custrecord_ht_bien_chasis', position: 'NONE' },
                { fieldId: 'custrecord_ht_bien_propietario', nextTo: 'custrecord_ht_bien_propietario', position: 'STARTCOL' },
              ]
            };
          }
          _coreimp.ofuscarCampos(context, campos_sensibles.BIENES);
         }
        }
      } catch (error) {
        log.error("Error en beforeLoad", error);
      }
    }
  //afterSubmit
  function afterSubmit(context) {
    try {
      const newRecord = context.newRecord;
      const idBien = newRecord.id;
      let { subsidiary } = runtime.getCurrentUser();

      if (context.type === context.UserEventType.EDIT) {
        //context.type === context.UserEventType.XEDIT
        _coreimp.actualizarBien(idBien);
        //_platformControllerLatam.envioPXvehiculo(idBien, subsidiary);
      } else {
        return;
      }
    } catch (error) {
      log.error("error", error);
    }
  }

  return {
    beforeLoad,
    afterSubmit: afterSubmit,
  };
});
