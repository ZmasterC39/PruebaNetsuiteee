/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 * @author Mauro F Ramos
 * @date Created at: 16/07/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
*/

define(['N/runtime', 'N/record', 'N/task','N/file', 'N/log','SuiteScripts/IntegracionesHunter/HU_EC_CORE_FIN.js'], function (runtime, record, task, file, log, _fin) {

  function rescheduleCurrentScript() {
    log.debug("rescheduleCurrentScript")
    let scheduledScriptTask = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT
    });
    scheduledScriptTask.scriptId = runtime.getCurrentScript().id;
    scheduledScriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
    scheduledScriptTask.params = {
      custscript_file_os_generar_fin : runtime.getCurrentScript().getParameter({ name: 'custscript_file_os_generar_fin' }),
      custscript_gfin_registro_actividad : runtime.getCurrentScript().getParameter({ name: 'custscript_gfin_registro_actividad' })
    };

    return scheduledScriptTask.submit();
  }

  function execute (context) {
    try {

      log.debug("context", context)

      const script = runtime.getCurrentScript();
      let gobernanza = script.getRemainingUsage();
      const fileId = runtime.getCurrentScript().getParameter({ name: 'custscript_file_os_generar_fin' });
      const registro_actividad = runtime.getCurrentScript().getParameter({ name: 'custscript_gfin_registro_actividad' });
      let fileObj = file.load({ id: fileId });
      log.debug("Archivo a procesar", fileObj)
      let fileJson = JSON.parse(fileObj.getContents());
      let orden_servicio_seleccionadas = fileJson.orden_servicio_seleccionadas;
      let procesar = fileJson.procesar;
      let total = fileJson.total;
      let procesadas = fileJson.procesadas;
      let errores = fileJson.errores;
      let errores_detalles = fileJson.errores_detalles;
      let elementos = orden_servicio_seleccionadas.length;
      let flag = false;
      if(!procesar){
        return;
      }
      while (gobernanza > 1000 || elementos > 0) {
        let procesando = orden_servicio_seleccionadas.shift();
        log.debug(`${runtime.getCurrentScript().deploymentId}`, `Procesando ${procesando} - Gobernanza ${script.getRemainingUsage()} - Restantes [${orden_servicio_seleccionadas}]`);
        let tarea = _fin.create(procesando);
        ++procesadas;
        log.debug("tarea", tarea)
        if(tarea.error) {
          --procesadas;
          ++errores;
          errores_detalles += `${tarea.message} `;
        }
        --elementos;
        let registro_actividad_detalle = `Procesadas: ${procesadas} de ${total}`;
        record.submitFields({
            type: 'customrecord_registro_actividad',
            id: registro_actividad,
            values: {
              custrecord_registro_actividad_detalle: registro_actividad_detalle,
            }
          });
        if(elementos === 0 ){
          log.debug(`Todos los elementos se han procesado, no hay necesidad de reimpulsar el ScheduledScript`);
          if(errores > 0){
            registro_actividad_detalle += `<br>Errores: ${errores_detalles}`;
          }
          record.submitFields({
            type: 'customrecord_registro_actividad',
            id: registro_actividad,
            values: {
              custrecord_registro_actividad_estado: '3',
              custrecord_registro_actividad_detalle: registro_actividad_detalle,
              custrecord_registro_actividad_fecha_fin: new Date()
            }
          });
          file.delete({ id: fileId });
          break;
        } else if(script.getRemainingUsage() < 1000){
          log.debug(`Re-lanzar el ScheduledScript ${runtime.getCurrentScript().deploymentId}`, `por procesar ${elementos} : [${orden_servicio_seleccionadas}]`);
          let newContent = {procesar:true,orden_servicio_seleccionadas:orden_servicio_seleccionadas, total, procesadas, errores, errores_detalles}
          let nuevoArchivo = file.create({
            name: fileObj.name,
            fileType: fileObj.fileType,
            contents: JSON.stringify(newContent), // contenido modificado
            folder: fileObj.folder
          });
          nuevoArchivo.save({ replace: true, fileId: fileId });
          flag = true;
          break;
        }
      }

      if (flag){
        rescheduleCurrentScript();
      }
    } catch (error) {
        log.error("ERROR execute", error)
    }
  }

  return { execute };

});