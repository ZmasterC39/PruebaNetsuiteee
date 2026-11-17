/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/log', 'N/runtime'], function(log, runtime) {

  function fieldChanged(context) {
    try {
      let fieldId = context.fieldId;
      let record = context.currentRecord;
      if( fieldId == 'account'){
        record.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: record.getValue({ fieldId: 'memo' }) });
      }
    } catch (error) {
      log.debug("ERROR fieldChanged", error);
    }
  }

    return { fieldChanged };

});