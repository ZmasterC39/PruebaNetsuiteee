/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _get(context) {
        try {
            let iddocument = context.iddocument;
            let objRecord = record.load({ type: record.Type.CUSTOMER_PAYMENT, id: iddocument, isDynamic: true });
            //let objRecord = record.load({ type: record.Type.VENDOR, id: iddocument, isDynamic: true });

           //let companyname = objRecord.getValue({ fieldId: 'entityid' });
  
            return {
                customerpayment: objRecord
               
            }
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _post(context) {
        try {

            
            // FIELDS
            let customer = context.customer; // codigo cliente
            //let aracct = context.aracct; // cuenta contable de cliente
            let trandate  = context.trandate; // fecha de transacción
            let subsidiary = context.subsidiary
            let location = context.location; // Ciudad
            let department = context.department; // departmento
            let clase = context.class; // class
            let custbody_ec_report_type = context.custbody_ec_report_type
            let custbody_ec_number_er = context.custbody_ec_number_er
            let paymentoption = context.paymentoption // tipo de pago
            let custbody2_banco = context.custbody2 // Banco
            //let usepaymentoption = context.usepaymentoption // usar opcion de pago: valor true - false
            let applied = context.applied // valor aplicado
            //let origtotal = context.origtotal // valor aplicado
            let payment = context.payment // pago
            let aracct  = context.aracct // cuenta acreedora - cuenta de Cliente
            let account = context.account; // cuenta deudora - cuenta de DA/Retención 
            //let total = context.total // total
            let memo = context.memo // comentario
            let custbodyts_ec_doc_serie_ref = context.custbodyts_ec_doc_serie_ref;
            let custbodyts_ec_doc_number_ref = context.custbodyts_ec_doc_number_ref;
        

            // sublists
            // Apply : documento a aplicar
            let customform = 129;
            let currency  = 1; // codigo moneda
            let exchangerate = 1.00; // tipo de cambio
            let amount = Number.parseFloat( context.apply[0].amount).toFixed(2); // valor de pago
            let internalid  = context.apply[0].internalid;    // codigo de factura netsuite
            let apply  = context.apply[0].apply; // aplicar
            let custbodyts_ec_tipo_documento_ref = 16; // 18 Documentos autorizados utilizados en ventas excepto N/C N/D
            let custbodyts_ec_doc_type_ref = 16; // 18 Documentos autorizados utilizados en ventas excepto N/C N/D

            
            
            log.debug('customer........', customer);
            log.debug('currency........', currency);
            log.debug('exchangerate........', exchangerate);
            log.debug('trandate........', trandate);
            log.debug('subsidiary........', subsidiary);
            log.debug('location........', location);
            log.debug('class........', clase);
            log.debug('department........', department);
            log.debug('custbody_ec_report_type........', custbody_ec_report_type);
            log.debug('custbody_ec_number_er........', custbody_ec_number_er);
            log.debug('paymentoption........', paymentoption);
            log.debug('custbody2_banco........', custbody2_banco);
            log.debug('applied........', applied);
            log.debug('aracct........', aracct);
            log.debug('account........', account);
            log.debug('memo........', memo);

            let response = [{
             status: "ER",
             message: "ERROR",
             idPago: 0,
             idDocumento: ""
            }];


            // OBTENER INTERNAL ID DE CLIENTE
            // var internalidcliente
            var busquedaCliente = search.create({
                type: search.Type.CUSTOMER,
                columns: ['entityid', 'altname','internalid'],
                filters: ['vatregnumber', search.Operator.IS, customer]
            });
            var myResultSetCliente = busquedaCliente.run().getRange({start: 0, end: 1});
            var theCountCli = busquedaCliente.runPaged().count;
            if (theCountCli != 1) {
                log.debug('Busqueda.Error no se encontró el Cliente........', myResultSetCliente);
                //return 'ERROR:' + '100'; //El Cliente no se encuentra registrado

                response = [{
                          status: "ER",
                          message: "ERROR: El Cliente no se encuentra registrado",
                          idPago: 0,
                          idDocumento: custbodyts_ec_doc_serie_ref+''+custbodyts_ec_doc_number_ref
                        }];

                 return { results: response };
              
            } else {
                //Obtiene el ID
                var internalidcliente = myResultSetCliente[0].getValue(busquedaCliente.columns[2]);
            }

            log.debug('internalidcliente....', internalidcliente);
            log.debug('custbodyts_ec_doc_serie_ref....', custbodyts_ec_doc_serie_ref);
          

          

            // BUSQUEDA DE SERIE DE FACTURA
            var busquedaSeriefactura = search.create({
                type: "customrecordts_ec_series_impresion",
                filters:
                [
                   ["custrecord_ts_ec_tipo_documento","anyof",custbodyts_ec_tipo_documento_ref], 
                   "AND", 
                   ["isinactive","is","F"], 
                   "AND", 
                   ["custrecord_ts_ec_series_impresion","startswith",custbodyts_ec_doc_serie_ref]
                ],
                columns:
                [
                   search.createColumn({
                      name: "name",
                      sort: search.Sort.ASC,
                      label: "Nombre"
                   }),
                   search.createColumn({name: "custrecord_ts_ec_series_impresion", label: "Serie de Impresión"}),
                   search.createColumn({name: "custrecord_ts_ec_localidad_serie", label: "EC - Localidad por Serie"}),
                   search.createColumn({name: "internalid", label: "ID interno"})
                ]
             });
             var myResultSetSeriefactura = busquedaSeriefactura.run().getRange({start: 0, end: 1});
             var theCountSerie = busquedaSeriefactura.runPaged().count;
             if (theCountSerie != 1) {
                log.debug('Busqueda.Error no se encontró la serie de la factura........', myResultSetSeriefactura); 
                //return 'ERROR:' + '200'; //No se encontro la serie de la factura

                response = [{
                          status: "ER",
                          message: "ERROR: No se encontro la serie de la factura",
                          idPago: 0,
                          idDocumento: custbodyts_ec_doc_serie_ref+''+custbodyts_ec_doc_number_ref
                        }];

                 return { results: response };
               
             } else {
                //Obtiene el ID
                log.debug('myResultSetSeriefactura....', myResultSetSeriefactura[0]);
                var internalidseriefactura = myResultSetSeriefactura[0].getValue(busquedaSeriefactura.columns[3]);
               

             }

            //internalidseriefactura = 140; // Guayaquil
            //internalidseriefactura = 288; // Sto. Domingo
            //internalidseriefactura = 264; // Ambato
            //internalidseriefactura = 272; // Machala
            //internalidseriefactura = 284; // Ibarra
            //internalidseriefactura = 352; // Gye vernaza
            //internalidseriefactura = 256; // Quito

            log.debug('internalidseriefactura....', internalidseriefactura);
          

            // OBTIENE EL ID INTERNO DE LA FACTURA
            var busquedaFactura = search.create({
                type: "invoice",
                filters:
                [
                   ["type","anyof","CustInvc"], 
                   "AND", 
                   ["taxline","is","F"], 
                   "AND", 
                   ["mainline","is","T"], 
                   "AND", 
                   ["voided","is","F"], 
                   "AND", 
                   ["entity","anyof", internalidcliente],
                   "AND",
                   ["custbodyts_ec_tipo_documento_fiscal","anyof", custbodyts_ec_doc_type_ref],
                   "AND",
                   ["custbody_ts_ec_serie_cxc","anyof", internalidseriefactura],
                   "AND",
                   ["custbody_ts_ec_numero_preimpreso","is", custbodyts_ec_doc_number_ref]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "trandate", label: "Fecha"}),
                   search.createColumn({name: "location", label: "Oficina"}), 
                   search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "EC - NUMERO PREIMPRESO"}),
                   search.createColumn({
                      name: "internalid",
                      join: "customerMain",
                      label: "idinternocliente"
                   }),
                   search.createColumn({name: "amount", label: "Importe"}),
                   search.createColumn({name: "amountpaid", label: "Importe pagado"}),
                   search.createColumn({name: "amountremaining", label: "Importe restante"}),
                   search.createColumn({name: "department", label: "Departamento"}), 
                   search.createColumn({name: "class", label: "Clase"}),
                   search.createColumn({
                      name: "name",
                      join: "CUSTBODY_TS_EC_SERIE_CXC",
                      label: "Nombre"
                   }),
                   search.createColumn({
                      name: "internalid",
                      join: "CUSTBODY_TS_EC_SERIE_CXC",
                      label: "ID interno"
                   })
                ]
             });
             var myResultSetFactura = busquedaFactura.run().getRange({start: 0, end: 1});
             var theCountFac = busquedaFactura.runPaged().count;
             if (theCountFac != 1) {
                log.debug('Busqueda.Error no se encontró la factura........', myResultSetFactura);
                //return 'ERROR:' + '300'; //La factura no se encuentra registrada

                response = [{
                          status: "ER",
                          message: "ERROR: La factura no se encuentra registrada",
                          idPago: 0,
                          idDocumento: custbodyts_ec_doc_serie_ref+''+custbodyts_ec_doc_number_ref
                        }];

                 return { results: response };

             } else {
                //Obtiene el ID
                var internalidfactura = myResultSetFactura[0].getValue(busquedaFactura.columns[0]);
                var internalidoficina = myResultSetFactura[0].getValue(busquedaFactura.columns[2]);
                internalid = internalidfactura;

            }

            log.debug('internalid....', internalid);

    
            //CREATE RECORD
            let objRecord = record.create({ type: record.Type.CUSTOMER_PAYMENT, isDynamic: true });

            objRecord.setValue({ fieldId: 'customform', value: customform });
            objRecord.setValue({ fieldId: 'customer', value: internalidcliente });
            objRecord.setValue({ fieldId: 'trandate', value: new Date(context.trandate) });
            objRecord.setValue({ fieldId: 'currency', value: currency });
            objRecord.setValue({ fieldId: 'exchangeRate', value: exchangerate });// campos de Netsuite
            objRecord.setValue({ fieldId: 'aracct', value: aracct });// campos de Netsuite
            objRecord.setValue({ fieldId: 'memo', value: memo });            
            objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });
            objRecord.setValue({ fieldId: 'department', value: department });
            objRecord.setValue({ fieldId: 'class', value: clase });
            objRecord.setValue({ fieldId: 'location', value: location });
            objRecord.setValue({ fieldId: 'custbody_ec_report_type', value: custbody_ec_report_type }); // Caja
            objRecord.setValue({ fieldId: 'custbody_ec_number_er', value: custbody_ec_number_er });// Usuario de caja
            objRecord.setValue({ fieldId: 'applied', value: applied });
            objRecord.setValue({ fieldId: 'payment', value: payment });
            objRecord.setValue({ fieldId: 'paymentoption', value: paymentoption }); // Metodo de pago
            objRecord.setValue({ fieldId: 'custbody2', value: custbody2_banco });// Banco
            if (account.length > 0) {
                
                let undepfunds = false; // Valor F para enviar el valor en campo account
                let ispaymethundepfunds = true; // Valor T para enviar el valor en campo account
                log.debug('undepfunds....', undepfunds);
                //objRecord.setValue({ fieldId: 'undepfunds', value: undepfunds });// campos de Netsuite
                objRecord.setValue({ fieldId: 'ispaymethundepfunds', value: ispaymethundepfunds });// cuenta deudora
                objRecord.setValue({ fieldId: 'account', value: account });// cuenta deudora
                
                
            }
            
            //objRecord.setValue({ fieldId: 'usepaymentoption', value: usepaymentoption }); 
            //objRecord.setValue({ fieldId: 'origtotal', value: origtotal }); 
        

            // Números de registro
            var apLine = objRecord.getLineCount({
                sublistId: "apply",
            });
            //log.debug('apLine....', apLine);

            let items = context.apply; // declaracion del arreglo del for
            //log.debug('items..1....', items);

            if(apLine > 0){
                for (var i = 0; i < apLine; i++) {

                    var refnum = objRecord.getSublistValue({

                        sublistId: 'apply',

                        fieldId: 'internalid',

                        line: i

                    });

                    var saldofact = objRecord.getSublistValue({

                        sublistId: 'apply',

                        fieldId: 'due',

                        line: i

                    });

                    //log.debug("internalid", internalid)
                    //log.debug("total", amount)
                    //log.debug("refnum", refnum)
                    //log.debug("saldo documento", saldofact)


                    //  Validar saldo de factura
                    if (refnum == internalid && saldofact < amount){
                        /*log.error({
                            title: 'Error: Documento no tiene saldo para aplicar', 
                            details: 'Documento: ' + internalid
                        });
                          return
                        */

                        log.error({
                            title: 'Error: Documento no tiene saldo para aplicar', 
                            details: 'Documento: ' + internalid
                        });

                        response = [{
                          status: "ER",
                          message: "ERROR: Documento no tiene saldo para aplicar",
                          idPago: 0,
                          idDocumento: custbodyts_ec_doc_serie_ref+''+custbodyts_ec_doc_number_ref
                        }];

                        return { results: response };
                        
                    }

                    // Aplicar documento de la lista
                    // si el código de factura es igual al internalId del documento
                    // si el documento tiene saldo
                    if (refnum == internalid && saldofact >= amount) {

                        //log.debug("factura", internalid)
                        //log.debug("total", amount)

                        var lnNum = objRecord.selectLine({

                            sublistId: 'apply',

                            line: i

                        });

                        
                        // Aplicar documento
                        objRecord.setCurrentSublistValue({

                            sublistId: 'apply',

                            fieldId: 'apply',

                            value: true

                        });
                    
                        // Valor de aplicación
                        objRecord.setCurrentSublistValue({

                            sublistId: 'apply',

                            fieldId: 'amount',

                            value: amount

                        });
                        

                        objRecord.commitLine({

                            sublistId: 'apply'

                        });

                    }

                }
            }

            
            let recordId = objRecord.save({ enableSourcing: false, ignoreMandatoryFields: false });
            //log.debug('Result', recordId);
            //return recordId;

            if (recordId > 0) {
                 response = [{
                      status: "OK",
                      message: "Pago generado correctamente",
                      idPago: recordId,
                      idDocumento: custbodyts_ec_doc_serie_ref+''+custbodyts_ec_doc_number_ref
                 }];
            }
            
            //Respuesta.
            return { results: response };

          
          
        } catch (error) {
            log.error('Error', error);
            
        }


    }


    return {
        get: _get,
        post: _post
        //put: _put,
        //delete: _delete
    }
});