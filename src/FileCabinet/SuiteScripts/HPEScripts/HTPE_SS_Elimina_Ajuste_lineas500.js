/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/runtime', 'N/task', 'N/log'], (record, runtime, task, log) => {

    const execute = (context) => {
        const ADJUSTMENT_ID = 1576641; // <--- Coloca el ID de tu ajuste aquí
        const BATCH_SIZE = 500; 

        try {
            let objRecord = record.load({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: ADJUSTMENT_ID,
                isDynamic: false
            });

            let totalLines = objRecord.getLineCount({ sublistId: 'inventory' });
            log.audit('Estado', `Líneas restantes: ${totalLines}`);

            if (totalLines === 0) {
                record.delete({ type: record.Type.INVENTORY_ADJUSTMENT, id: ADJUSTMENT_ID });
                log.audit('FIN', `Registro ${ADJUSTMENT_ID} eliminado totalmente.`);
                return;
            }

            // Borrar un bloque de líneas
            let linesToDelete = Math.min(totalLines, BATCH_SIZE);
            for (let i = 0; i < linesToDelete; i++) {
                // Siempre borramos la línea 0 porque al borrar, la de abajo sube
                objRecord.removeLine({ sublistId: 'inventory', 
                line: (totalLines - 1) - i });
                //line: 0 });
                log.audit('Loop', `Registro ${i} registro.`);
            }

            //  objRecord.save();

            // GUARDADO FORZADO
            // ignoreMandatoryFields ayuda a evitar errores de validación que detienen el grabado
            let savedId = objRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });          
            // RE-PROGRAMACIÓN AUTOMÁTICA
            // Si después de guardar aún quedan líneas, el script se vuelve a llamar
/*            let scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId
            });
            scriptTask.submit();
 */           
            log.audit('Re-programación', `Bloque eliminado. Quedan ${totalLines - linesToDelete} líneas. Reiniciando script...`);

        } catch (e) {
            log.error('Error en proceso', e.message);
        }
    };

    return { execute };
});