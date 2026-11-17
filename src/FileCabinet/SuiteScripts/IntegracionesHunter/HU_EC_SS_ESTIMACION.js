/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 * @author Mauro F Ramos
 * @date Created at: 1/07/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
*/

define(['N/runtime', 'N/record', 'N/task','N/file', 'N/log', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], function (runtime, record, task, file, log, _toolkit) {

    function rescheduleCurrentScript() {
        log.debug("rescheduleCurrentScript")
        let scheduledScriptTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT
        });
        scheduledScriptTask.scriptId = runtime.getCurrentScript().id;
        scheduledScriptTask.deploymentId = runtime.getCurrentScript().deploymentId;
        scheduledScriptTask.params = {
            custscript_estimacion : runtime.getCurrentScript().getParameter({ name: 'custscript_estimacion' }),
            custscript_bienes_header_relacionar : runtime.getCurrentScript().getParameter({ name: 'custscript_bienes_header_relacionar' }),
            custscript_bienes_relacionar : runtime.getCurrentScript().getParameter({ name: 'custscript_bienes_relacionar' }),
            custscript_subsidiaria_relacionar : runtime.getCurrentScript().getParameter({ name: 'custscript_subsidiaria_relacionar' }),
            custscript_usuario_creacion_relacion : runtime.getCurrentScript().getParameter({ name: 'custscript_usuario_creacion_relacion' }),
        };

        return scheduledScriptTask.submit();
    }

    function execute(context) {
        try {
            const estimacion = runtime.getCurrentScript().getParameter({ name: 'custscript_estimacion' });
            const bienes_header = runtime.getCurrentScript().getParameter({ name: 'custscript_bienes_header_relacionar' });
            const bienes = runtime.getCurrentScript().getParameter({ name: 'custscript_bienes_relacionar' });
            const subsidiaria = runtime.getCurrentScript().getParameter({ name: 'custscript_subsidiaria_relacionar' });
            const usuario = runtime.getCurrentScript().getParameter({ name: 'custscript_usuario_creacion_relacion' });

            let bienes_id_enviados = []

            if ( bienes != null ) {
                bienes_id_enviados = [...new Set(
                bienes
                    .split(/\s+/)                  // Separa por uno o más espacios
                    .map(row => row.split(',')[0])
                    .filter(Boolean)
                )];
            }

            let query = `SELECT id, custrecord_re_transaccion as transaccion_id, custrecord_relacion_bien AS bien, custrecord_relacion_subsidiaria as subsidiaria, custrecord_relacion_transaccion AS relacion_transaccion, isinactive  FROM customrecord_relacion_transaccion WHERE custrecord_re_transaccion = ? AND custrecord_relacion_transaccion IS NULL`;

            let registros_existentes = _toolkit.executeQuery(query, [Number(estimacion)]);

            if ( registros_existentes ) {
                _relacion_core(registros_existentes, bienes_id_enviados, estimacion, subsidiaria, usuario);
            }


        } catch (error) {
            log.error("ERROR execute", error);
        }
    }

    function _relacion_core(registros_existentes, bienes_id_enviados, estimacion, subsidiaria, usuario) {
        try {

            // Si existen registros previos → inactivar TODOS antes de recrear
            if (registros_existentes && registros_existentes.length > 0) {
                log.debug("Estimación con registros previos", "Se inactivan todos y se recrean");
                registros_existentes.forEach(function (reg) {
                    _inactivarRelacion(reg.id);
                });
            } else {
                log.debug("Estimación es nueva", "Se crean las relaciones de todos los bienes enviados");
            }

            // En ambos casos: crear la relación de cada bien enviado
            if (bienes_id_enviados.length > 0 ) {
            bienes_id_enviados.forEach(function (bien_id) {
                _crearRelacion(estimacion, bien_id, subsidiaria, usuario);
            });
            }
        } catch (error) {
            log.error("ERROR _relacion_core", error);
        }
    }

    /**
     * Crear nueva relación
     */
    function _crearRelacion(estimacion, bien_id, subsidiaria, usuario) {
        try {
            const relacion = record.create({
                type: 'customrecord_relacion_transaccion',
                isDynamic: true
            });

            relacion.setValue({ fieldId: 'custrecord_re_transaccion', value: Number(estimacion) });
            relacion.setValue({ fieldId: 'custrecord_relacion_bien', value: Number(bien_id) });
            relacion.setValue({ fieldId: 'custrecord_relacion_subsidiaria', value: Number(subsidiaria) });
            relacion.setValue({ fieldId: 'owner', value: Number(usuario) });

            const relacionId = relacion.save();
            log.debug("Relación creada", { bien_id, relacionId });
        } catch (error) {
            log.error("ERROR _crearRelacion", error);
        }
    }

    /**
     * Inactivar relación (cambiar isinactive a true)
     */
    function _inactivarRelacion(recordId) {
        try {
            const relacion = record.load({
                type: 'customrecord_relacion_transaccion',
                id: recordId,
                isDynamic: true
            });

            relacion.setValue({ fieldId: 'isinactive', value: true });
            const relacionId = relacion.save();
            log.debug("Relación inactivada", { recordId, relacionId });
        } catch (error) {
            log.error("ERROR _inactivarRelacion", error);
        }
    }

    return { execute };

});