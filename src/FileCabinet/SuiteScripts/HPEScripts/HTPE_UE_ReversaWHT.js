/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

        var invRec = context.newRecord;
        var invId = invRec.id;

        try {
            // --- CONFIGURACIÓN ---
            var CAMPO_EN_FACTURA = 'custbody_asiento_relacionado_wht';
            var ID_FORMULARIO_PE = 163;
            var VALOR_TIPO_ASIENTO_PE = 23; // Ajustar este ID interno según el valor de "Reversa WHT" en tu lista
          
            var applyWht = invRec.getValue('custbody_4601_appliesto');
            if (applyWht !== true && applyWht !== 'T') return;

            // Fecha de la Factura
            var tranDate = invRec.getValue('trandate'); // <--- Obtención de la Fecha

            // Obtener Segmentos de la Factura
            var dept = invRec.getValue('department');
            var classId = invRec.getValue('class');
            var location = invRec.getValue('location');
           
            // 1. Calcular monto actual de detracción
            var totalWht = 0;
            var lineCount = invRec.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lineCount; i++) {
                totalWht += parseFloat(invRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_4601_witaxamount',
                    line: i
                }) || 0);
            }

            if (totalWht > 0) {
                var currency = invRec.getValue('currency');
                var entityId = invRec.getValue('entity');
                var subsId = invRec.getValue('subsidiary');
                var jeIdExistente = invRec.getValue(CAMPO_EN_FACTURA);

                var jeRec;
                if (jeIdExistente) {
                    log.audit('ACTUALIZANDO', 'Cargando asiento ID: ' + jeIdExistente);
                    jeRec = record.load({
                        type: record.Type.JOURNAL_ENTRY,
                        id: jeIdExistente,
                        isDynamic: true
                    });
                    // Borrar líneas existentes
                    var lineas = jeRec.getLineCount({ sublistId: 'line' });
                    for (var j = lineas - 1; j >= 0; j--) {
                        jeRec.removeLine({ sublistId: 'line', line: j, ignoreRecalc: true });
                    }
                } else {
                    log.audit('CREANDO', 'Nuevo asiento para factura: ' + invId);
                    jeRec = record.create({
                        type: record.Type.JOURNAL_ENTRY,
                        isDynamic: true
                    });
                    jeRec.setValue('customform', ID_FORMULARIO_PE);
                }

                var accAR  = (currency == '1') ? 4897 : 4896;  
                var accDet = (currency == '1') ? 6302 : 6303;

                jeRec.setValue('subsidiary', subsId);
                jeRec.setValue('trandate', tranDate); // <--- Seteo de la Fecha de la Factura
                jeRec.setValue('currency', currency);
                // Campo de Tipo de Asiento PE (Asegúrate de que el ID del campo sea correcto)
                jeRec.setValue('custbody_pe_tipo_de_diario', VALOR_TIPO_ASIENTO_PE);
                var memoCabecera = 'Asiento Detracción - Factura Ref: ' + invRec.getValue('tranid');
                jeRec.setValue('memo', 'Asiento Detracción - Factura Ref: ' + invRec.getValue('tranid'));
                jeRec.setValue('custbody_ht_factura_de_referencia', invId);

                // Línea AR
                jeRec.selectNewLine({ sublistId: 'line' });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accAR });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: totalWht.toFixed(2) });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entityId });
                // Seteo del MEMO en la línea (Detalle)
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memoCabecera });
                // Segmentos en línea
                if (dept) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept });
                if (classId) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: classId });
                if (location) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                jeRec.commitLine({ sublistId: 'line' });

                // Línea Detracción
                jeRec.selectNewLine({ sublistId: 'line' });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: accDet });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: totalWht.toFixed(2) });
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entityId });
                // Seteo del MEMO en la línea (Detalle)
                jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memoCabecera });
                // Segmentos en línea
                if (dept) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept });
                if (classId) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: classId });
                if (location) jeRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: location });
                jeRec.commitLine({ sublistId: 'line' });

                var jeIdSaved = jeRec.save({ ignoreMandatoryFields: true });

                // Sincronizar con la factura si es nuevo
                if (!jeIdExistente) {
                    var valuesObj = {};
                    valuesObj[CAMPO_EN_FACTURA] = jeIdSaved;
                    
                    record.submitFields({
                        type: record.Type.INVOICE,
                        id: invId,
                        values: valuesObj,
                        options: { ignoreMandatoryFields: true }
                    });
                }
                log.audit('ÉXITO', 'Asiento procesado ID: ' + jeIdSaved);
            }
        } catch (e) {
            log.error('ERROR', e.name + ': ' + e.message);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});