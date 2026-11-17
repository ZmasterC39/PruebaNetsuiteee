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
        
        try {
            const customerform='146';
            const currency = '1';
            const exchangerate ='1';
            const start = Date.now();
            const generatetranidonsave='T';
            //INFORMACION PRINCIPAL

            let depositdate= start;
            let memo = context.memo;
            let customer= context.idCliente;
            let deposit= context.idDepositoCliente;   
            let banco = context.idBanco;
            
            //CLASIFICACION
            let subsidiary= 2;// Ecuador: Carseg
            let department = context.department;
            let location = context.location;
            //let aracct= context.cuenta
            let usuario = context.usuario;
          

            //APPLY
            let valor =  Number.parseFloat(context.valor).toFixed(2);
            let idFactura = context.idFactura;
            let cuenta ='1425';
           

            //let amount = Number.parseFloat( context.apply[0].amount).toFixed(2); // valor de pago
            //let doc = context.apply[0].doc; // codigo de factura netsuite
            //let internalid  = context.apply[0].internalid;    // codigo de factura netsuite
            //let apply     = context.apply[0].apply; // aplicar

            //CUSTOM
             
            //var objRecord = record.transform({
            //fromType: record.Type.CUSTOMER_DEPOSIT,
            //fromId: deposit,
            //toType: record.Type.DEPOSIT_APPLICATION,  
            //});

          //code snippet to apply a customer deposit to an open invoice
            var rcdDepositApplication = record.transform({	
	                fromType: record.Type.CUSTOMER_DEPOSIT,
	                fromId:deposit,
	                toType: record.Type.DEPOSIT_APPLICATION,
	                isDynamic: true 
            });

            rcdDepositApplication.setValue('trandate' , new Date());
            rcdDepositApplication.setValue('memo'     , memo);
            rcdDepositApplication.setValue('custbody2' , banco );
          
            //loop the lines and find the InvoiceId (code not shown) to apply funds: assumption is that we are applying
            //the total amount due
            var nbrLines = rcdDepositApplication.getLineCount({ sublistId: 'apply' });
            for (var ix = 0; ix < nbrLines; ix++){
	              var sublistInvoiceId = rcdDepositApplication.getSublistValue({ sublistId:'apply' ,fieldId:'internalid' ,line:ix });
	              if ( sublistInvoiceId == idFactura ){
		               var SublistDue = rcdDepositApplication.getSublistValue({ sublistId:'apply' ,fieldId:'due' ,line:ix });
		               rcdDepositApplication.selectLine({ sublistId:'apply' ,line:ix });
		               rcdDepositApplication.setCurrentSublistValue({ sublistId:'apply' ,fieldId:'amount' ,value:SublistDue ,ignoreFieldChange:false});
		               rcdDepositApplication.setCurrentSublistValue({ sublistId:'apply' ,fieldId:'apply'  ,value:true       ,ignoreFieldChange:false});
	                 }
            }
           let recordId = rcdDepositApplication.save();
           log.debug('Record....', recordId); 
           return recordId;  
          
          /*
            // CREATION ORDER RECORD
            //let objRecord = record.create({ type: record.Type.DEPOSIT_APPLICATION, isDynamic: true });

            let objRecord = record.create({ type: record.Type.DEPOSIT_APPLICATION, isDynamic: true });

            //INFORMACION PRINCIPAL
            objRecord.setValue({ fieldId: 'customform', value: customerform });
            objRecord.setValue({ fieldId: 'trandate', value:  new Date(start) }) // FECHA DE LA TRANSACCION
            objRecord.setValue({ fieldId: 'customer', value: customer }); // CLIENTE 
            objRecord.setValue({ fieldId: 'currency', value: currency }); // TIPO DE MONEDA
            objRecord.setValue({ fieldId: 'exchangerate', value: exchangerate }); // TIPO DE CAMBIO DE MONEDA
            objRecord.setValue({ fieldId: 'memo', value: memo }); // NOTA PARA IDENTIFICAR TRANSACCION DE APLICACION DE DEPOSITO
            objRecord.setValue({ fieldId: 'aracct', value: cuenta });
            objRecord.setValue({ fieldId: 'deposit', value: deposit });
                         
            //LOCALIZACION
            objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary }); // EMPRESA
            objRecord.setValue({ fieldId: 'department', value: department }); // DEPARTAMENTO
            objRecord.setValue({ fieldId: 'location', value: location }); // OFICINA

            objRecord.setValue({ fieldId: 'custbody2', value: banco }); // BANCO
            
            var numLines = objRecord.getLineCount({
                sublistId: 'apply'
            });
          
           log.debug('objRecord....', objRecord);  
            log.debug('apLine....', numLines);
          log.debug('SUBLISTAS......', objRecord.getSublists());
          
                        objRecord.selectLine({
                            sublistId: 'apply',
                            line: 1
                        });
                       log.debug('line....', 1);
                       log.debug('Apply....', objRecord.getCurrentSublistValue({sublistId: 'apply', fieldId: 'apply' }));
                        // Aplicar documento
                        objRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true
                        
                        });
                        
                        objRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                           fieldId: 'amount',
                           value: 5    
                        
                        });   
                      
                        objRecord.commitLine({
                            sublistId: 'apply'
                        });      
          

          /*  if(numLines > 0){
                for (var i = 0; i < numLines; i++) {
                   var refnum = objRecord.getSublistValue({sublistId: 'apply', fieldId: 'internalid',line: i });
                   log.debug('refnum....', refnum);
                  
                    var saldofact = objRecord.getSublistValue({sublistId: 'apply', fieldId: 'due', line: i });
                    log.debug('saldofact....', saldofact);
                  
                    //  Validar saldo de factura
                    if (refnum == idFactura && saldofact < valor){
                        log.error({
                            title: 'Error: Documento no tiene saldo para aplicar', 
                            details: 'Documento: ' + internalid
                        });
                        return
                    } 
                  
                    // Aplicar documento de la lista
                    // si el codigo de factura es igual al internalId del documento                    
                    if (refnum == idFactura && saldofact >= valor) { 
                        objRecord.selectLine({
                            sublistId: 'apply',
                            line: i
                        });
                       log.debug('line....', i);
                        
                        // Aplicar documento
                        objRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true                    
                        });
                        
                        objRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: valor                  
                        });   
                      
                        objRecord.commitLine({
                            sublistId: 'apply'
                        });      
                        break;                            
                    }
                }           
       
            }
*/
          /*
           // GUARDAR EL REGISTRO
          let recordId = objRecord.save({enableSourcing: false, ignoreMandatoryFields: false } );
          log.debug('Result', recordId);
          return recordId;  
          */

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