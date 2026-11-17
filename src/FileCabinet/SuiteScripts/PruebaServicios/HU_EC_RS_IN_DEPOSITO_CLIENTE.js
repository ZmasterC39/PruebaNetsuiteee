/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/file', 'N/search'], function(log, record, file, search) {

       function _get(busqueda) {
        try {
            
            log.debug('Request', busqueda);

            let objRecord = record.load({ type: record.Type.CUSTOMER_DEPOSIT, id: busqueda.busqueda });
            log.debug('Busqueda.........', objRecord);
            
            let payment = objRecord.getValue({ fieldId: 'payment' });
            let trandate = objRecord.getValue({ fieldId: 'trandate' });
            let memo = objRecord.getValue({ fieldId: 'memo' });
            let customer = objRecord.getValue({ fieldId: 'customer' });
            let internalid = objRecord.getValue({ fieldId: 'internalid' });
            let customerdeposit = objRecord.getValue({ fieldId: 'customerdeposit' });
            return {
                objRecord: objRecord

            }
        } catch (error) {
            log.error('Error-GET', error)
        }

    }

    function _post(context) {
        try {


            //REQUEST
            log.debug('Request POST', context);
            let currency = '1'
            let exchangerate = '1';
            let subsidiary= 2; // Carseg Ecuador
            //let undepfunds = 'F';
            let undepFunds = context.undepFunds; // pago que será depositado en una cuenta bancaria
            let account = context.account;
            let customerform = 198; // Codigo del formulario
            let vatregnumber = context.customer;
            let payment = context.payment;
            let checknumber = context.checknumber;
            let meno = context.meno;
            let paymentoption = context.paymentoption;
            let department = context.department;
            let location = context.location;
            let usuario = context.usuario;
            let custbody_ec_origen_ingreso = context.custbody_ec_origen_ingreso; // origen de ingreso HT - HUNTER
            //let idbanco = context.idbanco;
            let custbody_ec_cuotas_dif = context.custbody_ec_cuotas_dif
            let custbody_ec_diferido = context.custbody_ec_diferido
            let custbody_ht_pago_ntarjeta = context.custbody_ht_pago_ntarjeta
            let custbody_ht_pago_voucher = context.custbody_ht_pago_voucher
            let custbodyec_recaps = context.custbodyec_recaps
            let custbodyht_pago_emisor = context.custbodyht_pago_emisor
            let custbody_ec_comentario = context.custbody_ec_comentario
            

           // consulta de internalId de CLIENTE
            var busquedaCustomer = search.create({
                type: search.Type.CUSTOMER,
                columns: ['entityid', 'altname','internalid'],
                filters: ['vatregnumber', search.Operator.IS, vatregnumber]
            });

           var myResultSet = busquedaCustomer.run().getRange({start: 0, end: 1});;
  	       log.debug('Busqueda.........', myResultSet);     
           //log.debug('Usuario Ingreso.........', usuario);

           var theCount = busquedaCustomer.runPaged().count;
          log.debug('Busqueda.........', theCount);   
           if (theCount != 1) {
                log.debug('Busqueda.Error no se encontró el Cliente........', myResultSet);    
            } else {
                 //consulta de customer el id
                var customer = myResultSet[0].getValue(busquedaCustomer.columns[2]);
                //log.debug('customer........', customer);

                // CREATION ORDER RECORD
                let objRecord = record.create({ type: record.Type.CUSTOMER_DEPOSIT});

                //PRIMARY INFORMATION
                objRecord.setValue({ fieldId: 'customform', value: customerform });
                objRecord.setValue({ fieldId: 'customer', value: customer }); // CLIENTE
                objRecord.setValue({ fieldId: 'payment', value: payment });  // VALOR DEL DEPOSITO
                objRecord.setValue({ fieldId: 'currency', value: currency }); // TIPO DE MONEDA
                objRecord.setValue({ fieldId: 'exchangerate', value: exchangerate }); // TIPO DE CAMBIO DE MONEDA
                objRecord.setValue({ fieldId: 'trandate', value: new Date(context.fecha) }) // FECHA DE LA TRANSACCION

                objRecord.setValue({ fieldId: 'memo', value: meno }); // NOTA PARA IDENTIFICAR LA TRANSACCION DEL DEPOSITO
                objRecord.setValue({ fieldId: 'paymentoption', value: paymentoption }); // METODO DE PAGO
                /*objRecord.setValue({ fieldId: 'undepFunds', value: undepFunds }); // debe ser valor FALSO para registrar el campo account
                if (undepFunds == false){
                  // debe ser valor FALSO para registrar el campo account
                  //Si recibe un pago mediante tarjeta de crédito, enviar el campo account
                  objRecord.setValue({ fieldId: 'account', value: account }); // cuenta deudora referente a la tarjeta de credito
                }
                */
                
                objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary }); // EMPRESA
                objRecord.setValue({ fieldId: 'department', value: department }); // DEPARTAMENTO
                objRecord.setValue({ fieldId: 'location', value: location }); // OFICINA
                objRecord.setValue({ fieldId: 'custbody_ec_origen_ingreso', value: custbody_ec_origen_ingreso });// origen de ingreso HT - Hunter
                objRecord.setValue({ fieldId: 'custbody_ec_comentario', value: custbody_ec_comentario });// comentario HT - Hunter
             

                // DATOS DE TARJETA
                objRecord.setValue({ fieldId: 'custbody_ec_cuotas_dif', value: custbody_ec_cuotas_dif });// cuota
                objRecord.setValue({ fieldId: 'custbody_ec_diferido', value: custbody_ec_diferido });// Valor true/false diferido
                objRecord.setValue({ fieldId: 'custbody_ht_pago_ntarjeta', value: custbody_ht_pago_ntarjeta });// numero de tarjeta
                objRecord.setValue({ fieldId: 'custbody_ht_pago_voucher', value: custbody_ht_pago_voucher });// origen de ingreso HT - Hunter
                objRecord.setValue({ fieldId: 'custbodyec_recaps', value: custbodyec_recaps });// Numero recap
                objRecord.setValue({ fieldId: 'custbodyht_pago_emisor', value: custbodyht_pago_emisor });// Emisor
             

                // BUSQUEDA DE BANCO
                // YA NO APARECE ESTE CAMPO EN EL BANCO
                /*var busquedaBanco = search.create({
                    type: "customrecord1204",
                    filters:
                        [
                           ["internalidnumber","equalto",idbanco]
                        ],
                    columns:
                        [
                           search.createColumn({
                              name: "name",
                              sort: search.Sort.ASC,
                              label: "Nombre"
                           })
                        ]
                });       
                
                var myResultSetbanco = busquedaBanco.run().getRange({start: 0, end: 1});;
                var theCount = busquedaBanco.runPaged().count;

                //log.debug('banco', theCount);
                
                if (theCount != 1) {
                    log.debug('Busqueda.Error no se encontró el banco........', myResultSetbanco);    
                } else {
                    objRecord.setValue({ fieldId: 'custbody2', value: idbanco });
                }

                */

                
                // VERIFICAR EL BANCO
                /*var busquedaBanco = search.create({
                    type: search.Type.customrecord1204,
                    columns: ['name'],
                    filters: ['internalidnumber', search.Operator.equalto, idbanco]
                });

                var myResultSetbanco = busquedaBanco.run().getRange({start: 0, end: 1});;
                var theCount = busquedaBanco.runPaged().count;
                */

                // GUARDAR EL REGISTRO
                let recordId = objRecord.save({ ignoreMandatoryFields: false });
                log.debug('Deposito', recordId);

                
             log.debug("Respuesta", recordId)
                return recordId;
            
            }


        } catch (error) {
            log.error('Error', error);
        }
    }

    return {
        get: _get,
        post: _post
        
    }
});