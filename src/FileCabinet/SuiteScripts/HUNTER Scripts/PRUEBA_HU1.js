/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log'], function(record, log) {

    function execute(context) {
        try {
            // ID del registro que deseas cargar
            //var recordId = 643585;
            var recordId = [
                '522249',
'523559',
'540932',
'544046',
'544064',
'549731',
'581501',
'582603',
'590631',
'611738',
'611843',
'611991',
'611993',
'612005',
'612009',
'612015',
'612024',
'612025',
'612029',
'612031',
'612139',
'612244',
'612347',
'612758',
'612773',
'612820',
'615736',
'615743',
'615750',
'615752',
'615779',
'616540',
'617345',
'618888',
'618921',
'618939',
'618948',
'618958',
'652920',
'676159',
'690587',
'690822',
'701780',
'703925'

            ];

            for (var i = 0; i < recordId.length; i++) {
                var element = recordId[i];

                var customerRecord = record.load({
                    type: 'customerpayment', //'customerdeposit'
                    id: element,
                    isDynamic: true
                });

                customerRecord.setValue({
                    fieldId: 'custbodyec_nota_cliente',
                    value: '.'
                });

                var savedRecordId = customerRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });  // Guardado sin parámetros adicionales

                log.error('PAGO: TRX modificada con ID interno :' + element);
            }

        } catch (error) {
            log.error('Error al guardar el registro', error.toString());
        }
    }

    return {
        execute: execute
    };
});
