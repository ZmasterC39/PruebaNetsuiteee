/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log','N/search','N/record'], function(log, search,record){
    function _get(context){
        return 'Oracle Netsuite Connected - Release 2024.1';
    }

    function _put() {
        //put
    }

    function _post(context) {
        //post
        try {
            const TRANSFER = 'transfer';
            let fromaccount = context.cuentaDesde;
            let toaccount = context.cuentaHasta;
            let fromamount = context.valor;
            let location = context.ubicacion;
            let memo = context.memo;
            let subsidiary = '2';


             // CREATION ORDER RECORD
             //let objRecord = record.create({type: 'transfer'});
             //let objRecord = record.create({ type: record.Type.transfer, isDynamic: true });
             let objRecord =record.create({ type: TRANSFER});
           
             objRecord.setValue({ fieldId: 'trandate', value:  new Date() }); // FECHA DE LA TRANSACCION
             objRecord.setValue({ fieldId: 'fromaccount', value:  context.cuentaDesde }); // DESDE LA CUENTA
             objRecord.setValue({ fieldId: 'toaccount', value:  context.cuentaHasta }); // A LA CUENTA
             objRecord.setValue({ fieldId: 'fromamount', value:  context.valor }); // A LA CUENTA
             objRecord.setValue({ fieldId: 'toamount', value:  context.valor }); // A LA CUENTA
             objRecord.setValue({ fieldId: 'memo', value:  context.memo }); // MEMO
             objRecord.setValue({ fieldId: 'subsidiary', value:  subsidiary }); // SUBSIDARY
             objRecord.setValue({ fieldId: 'location', value:  context.location }); // UBICACION
             
            // GUARDAR EL REGISTRO
            let recordId = objRecord.save();
            log.debug('Result', recordId);
            return recordId;  
        } catch (error) {
            log.error('Error', error);
        }
    }

   

    return {
        get: _get,
        post: _post,
        put: _put
        
    }
});