/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log', 'N/task'], (search, record, log, task) => {

    const USUARIO_ID = 27736;

    const execute = (context) => {
        try {
            // 1️⃣ Obtener todos los mensajes que ya están en la cola
            const mensajesExistentesSearch = search.create({
                type: 'customrecord_log_proceso_general',
                filters: [
                    ['owner', 'anyof', USUARIO_ID]
                ],
                columns: ['custrecordid_registro_proc_general']
            }).run().getRange({ start: 0, end: 1000 });

            const mensajesExistentesIds = mensajesExistentesSearch.map(m => m.getValue('custrecordid_registro_proc_general'));

            // 2️⃣ Buscar solo los mensajes nuevos que no estén en la cola
            const messageSearch = search.create({
                type: 'message',
                filters: [
                    ['recipient', 'anyof', USUARIO_ID],
                    'AND',
                    ['internalid', 'noneof', mensajesExistentesIds]
                ],
                columns: ['internalid', 'subject', 'attachments']
            });

            const mensajesNuevos = [];
            messageSearch.run().each(r => {

                log.debug('Mensaje nuevo encontrado', r);

                mensajesNuevos.push({
                    id: r.id,
                    subject: r.getValue('subject'),
                    attachments: r.getValue('attachments') ? r.getValue('attachments').split(',') : []
                });
                return true;
            });

            if (mensajesNuevos.length === 0) {
                log.debug('No hay mensajes nuevos', 'Termina ejecución');
                return;
            }

            // 3️⃣ Crear registros en la cola si no existen
            mensajesNuevos.forEach(msg => {
                const nuevoRegistro = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
                nuevoRegistro.setValue({ fieldId: 'owner', value: USUARIO_ID });
                nuevoRegistro.setValue({ fieldId: 'custrecordid_registro_proc_general', value: msg.id });
                nuevoRegistro.setValue({ fieldId: 'custrecord_producto_lpc', value: 'CREADO' });
                nuevoRegistro.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: 'CORREO' });
                nuevoRegistro.setValue({ 
                    fieldId: 'custrecord_log_proceso_general_traza', 
                    value: msg.attachments.length > 0 ? msg.attachments.join(',') : '' 
                });
                nuevoRegistro.save();
                log.debug('Registro creado en cola', msg.id);
            });

            // 4️⃣ Verificar si hay algún registro PROCESADO
            const enEjecucion = search.create({
                type: 'customrecord_log_proceso_general',
                filters: [['custrecord_producto_lpc', 'is', 'PROCESADO']],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });

            if (enEjecucion.length > 0) {
                log.debug('Map/Reduce ocupado', 'Ya hay un registro en PROCESADO');
                return;
            }

            // 5️⃣ Tomar un registro CREADO para enviar al Map/Reduce
            const registroSearch = search.create({
                type: 'customrecord_log_proceso_general',
                filters: [['custrecord_producto_lpc', 'is', 'CREADO']],
                columns: ['internalid']
            });

            let registroId = null;
            registroSearch.run().each(r => {
                registroId = r.id;
                return false; // solo el primero
            });

            if (!registroId) return;

            // Cambiar estado a PROCESADO
            const registro = record.load({ type: 'customrecord_log_proceso_general', id: registroId, isDynamic: true });
            registro.setValue({ fieldId: 'custrecord_producto_lpc', value: 'PROCESADO' });
            registro.save();

            log.debug('Registro enviado a Map/Reduce', registroId);

            // 6️⃣ Lanzar Map/Reduce (descomenta cuando esté listo)
            // const mrTask = task.create({
            //     taskType: task.TaskType.MAP_REDUCE,
            //     scriptId: 'customscript_mr_procesar_correo',
            //     deploymentId: 'customdeploy_mr_procesar_correo',
            //     params: { custscript_registro_cola_id: registroId }
            // });
            // mrTask.submit();

        } catch (e) {
            log.error('Error Scheduled Script', e.message);
        }
    };

    return { execute };
});
