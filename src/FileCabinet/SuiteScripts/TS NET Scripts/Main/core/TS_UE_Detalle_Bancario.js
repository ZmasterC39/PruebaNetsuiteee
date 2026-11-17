/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(['N/search', 'N/record', 'N/runtime', 'N/task'], function (search, record, runtime, task) {

    const CUSTOMER = 'customer';
    const VENDOR = 'vendor';

    function beforeLoad(context) {
        
        try {
        } catch (e) {
            log.error('Error en beforeLoad', e);
        }
    }

    function beforeSubmit(context) {
        
        try{
            const eventType = context.type;
            const objRecord = context.newRecord;
            var recordId = objRecord.id;
            var entityIndicator = '';
            log.debug('eventType',eventType)
            if(eventType == context.UserEventType.COPY || eventType == context.UserEventType.CREATE || eventType == context.UserEventType.EDIT){
                let idProvee = objRecord.getValue('custrecord_2663_parent_vendor');
                let idFormaPago = objRecord.getValue('custrecord_entity_ec_forma_pago');
                
                var Search = search.lookupFields({
                    type: 'customrecord_epayment_fpago',
                    id: Number(idFormaPago),
                    columns: ['name']
                });

                let nombreFormaPago = Search.name;

                record.submitFields({
                    type: 'vendor',
                    id: Number(idProvee),
                    values: {
                        'custentity_forma_p_e': nombreFormaPago
                    }
                });
            }
        }catch (e) {
            log.error('Error en beforeSubmit', e);
        }
    }

    function afterSubmit(context) {
        try {
            
        } catch (e) {
            log.error('Error afterSubmit', e);

        }
    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});