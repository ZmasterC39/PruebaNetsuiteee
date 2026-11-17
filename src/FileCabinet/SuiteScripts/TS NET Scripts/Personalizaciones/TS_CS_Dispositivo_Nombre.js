/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(['N/search', 'N/currentRecord', 'N/ui/message', 'N/url'], (search, currentRecord, message, url) => {
    let typeMode = '';

    const pageInit = (context) => {
        typeMode = context.mode; //!Importante, no borrar.
    }

    const fieldChanged = (context) => {
        var sublistFieldName = context.fieldId;
        console.log ('entra');
        const objRecord = currentRecord.get();
        console.log('objRecord',objRecord);
        console.log('typeMode',typeMode);

        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
           if (sublistFieldName == 'custrecord_ht_dd_item') {
            var serie = objRecord.getText('custrecord_ht_dd_item');
            //if (objRecord.getValue('name').length != 0) {
              objRecord.setText({
                fieldId: 'name',
                text: serie,
                ignoreFieldChange: true
            });
            //}
           }
            
        }
    }

    return {
        pageInit: pageInit,
        // saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        //sublistChanged: sublistChanged
    }
});
