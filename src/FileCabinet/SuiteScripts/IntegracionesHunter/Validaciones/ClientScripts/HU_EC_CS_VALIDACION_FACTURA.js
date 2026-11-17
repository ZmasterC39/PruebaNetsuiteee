/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], function() {
    
    function fieldChanged(context) {
        // Valido para vendorbill
        var currentRecord = context.currentRecord;
        var fieldId = 'custbody_ts_ec_numero_preimpreso';
        var fieldValue = currentRecord.getValue({fieldId: fieldId});
        if (/^\d+$/.test(fieldValue)) {
            var newValue = fieldValue.padStart(9, '0');
            currentRecord.setValue({
                fieldId: fieldId,
                value: newValue,
                ignoreFieldChange: true
            });
        }
    }

    return {
        fieldChanged: fieldChanged
    };
});