/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log','N/search','N/record'], function(log, search, record){

    var idItemDev = '';
    var descVentaItemDev = '';

    function _post_Genera_Registro_Nota_Credito(context) {
        
        try {
            
            let facturaid = context.facturaid; // internal id factura netsuite
            let memo = context.memo; // glosa
            let causal = context.causal; // causal 14 REVERSO FACTURAS POR DEBITO BANCARIO

            let subsidiary= 2; // Ecuador: Carseg
          
            let response = [{
                status: "ER",
                message: "ERROR",
                idnotacredito: 0,
                iddocumento: ""
             }];

            
            log.debug('facturaid....', facturaid);
            log.debug('memo nota credito....', memo);
            log.debug('causal....', causal);

            // Transform invoice to credit memo
            var creditMemo = record.transform({
                fromType: record.Type.INVOICE,
                fromId: facturaid,
                toType: record.Type.CREDIT_MEMO,
                isDynamic: true
            });


            log.debug('creditMemo....', creditMemo);

            var memo2 = creditMemo.getValue({ fieldId: 'memo' });
            var memoda = 'Facturación Debito automatico';
          

            // Campos modificar
            creditMemo.setValue('trandate' , new Date());
            //creditMemo.setValue('memo', memo);
            creditMemo.setValue('custbodyec_causal', causal);
            
        
            // Actualizar items de devolucion
            var itemCount = creditMemo.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < itemCount; i++) {

                var item_venta = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                var quantity = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i});
                var rate = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i});
                var amount = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
                var location = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'location', line: i});
                var taxcode = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'taxcode', line: i});
                var tax1amt = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'tax1amt', line: i});
                var clase = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'class', line: i});
                var department = creditMemo.getSublistValue({sublistId: 'item', fieldId: 'department', line: i});
                

                // OBTENER ITEM DE DEVOLUCION
                getItemDevolucion(item_venta);
                log.debug('idItemDev', idItemDev);
                log.debug('descVentaItemDev', descVentaItemDev);
                log.debug('idItemDev.length', idItemDev.length);
                log.debug('indexOf', memo2.indexOf(memoda));
              

                // No se encontro el item de devolucion de reverso
                if (idItemDev.length == 0) {
                    response = [{
                        status: "ER",
                        message: "ERROR:100",
                        idnotacredito: 0,
                        iddocumento: ""
                    }];

                    return { results: response };
                }

              
                // Actualizar items de devolucion
                if (idItemDev.length > 0) {

                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: idItemDev });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: descVentaItemDev });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: quantity });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: amount });


                    // factura de debito automatico no tienen lleno este campo, lo llenamos
                    //if (memo2.indexOf(memoda) !== -1) {
                    //creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: amount});
                    //log.debug('indexOf', memo2.indexOf(memoda));
                    //}

                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: amount });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'taxcode', value: taxcode });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: location });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'class', value: clase });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'department', value: department });
                    creditMemo.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcol_ht_so_item_agrupado', value: item_venta });

                  
                    
                 }
            }
          
           

           let recordId = creditMemo.save({ enableSourcing: false, ignoreMandatoryFields: false });
          

           log.debug('recordId....', recordId);

           if (recordId > 0) {

                var objCreditmemo = record.load({
                    type: record.Type.CREDIT_MEMO,
                    id: recordId,
                    isDynamic: false
                });
        
                var iddocumento = objCreditmemo.getValue('tranid');
                objCreditmemo.setValue({fieldId: 'memo', value: memo, ignoreFieldChange: true});
                objCreditmemo.setValue({fieldId: 'custbodyec_nota_cliente', value: memo, ignoreFieldChange: true});
                objCreditmemo.setValue({fieldId: 'custbody_ei_xml_response', value: '', ignoreFieldChange: true});
                objCreditmemo.setValue({fieldId: 'custbody_ei_pdf_response', value: '', ignoreFieldChange: true});
                objCreditmemo.save({ enableSourcing: false, ignoreMandatoryFields: false });
             
                log.debug('iddocumento....', iddocumento);

             
                // ACTUALIZAR ESTADO DE FACTURA
                // campo custbody_estado_operativo, Custbody_usuario_anulacion, custbody_fecha_hora_anulacion
                // 2 REVERSADO TOTAL - 3 REVERSADO PARCIALMENTE
                /*var objFactura = record.load({
                    type: record.Type.INVOICE,
                    id: facturaid,
                    isDynamic: true
                });
            
                let estado_ope = objFactura.getValue({ fieldId: 'custbody_estado_operativo' });

                log.debug('facturaid....', facturaid);
                log.debug('estado_ope....', estado_ope);

                
                if (estado_ope && estado_ope.length > 0) {
                    log.debug('estado_ope....', estado_ope.count);
              
                    // 2 REVERSADO TOTAL
                    // 449 OPERAD
                    record.submitFields({
                       type: record.Type.INVOICE,
                       id: facturaid,
                       values: {
                           custbody_estado_operativo: "2",
                           custbody_usuario_anulacion: "449",
                           custbody_fecha_hora_anulacion: new Date()
                        },
                       options: {
                           enableSourcing: false,
                           ignoreMandatoryFields: true
                       }
                     });
                  }
                  */
                
   
                response = [{
                    status: "OK",
                    message: "Registro generado correctamente",
                    idnotacredito: recordId,
                    iddocumento : iddocumento
                }];

           }
          
          
           //Respuesta.
           return { results: response };


        } catch (e) {
            log.error('Error', {e: e.error, stack: e.stack});
            throw e; // Lanza el error para que se registre
        }
    }

    
    // OBTIENE ITEM DE DEVOLUCION NC
    function getItemDevolucion(itemVenta) {
        try {

                var busquedaItemDev = search.create({
                    type: "item",
                    filters:
                    [
                    ["type","anyof","Service"],
                    "AND", 
                    ["custitem_ec_item_agrupado","noneof","@NONE@"],  
                    "AND", 
                    ["custitem_ht_accion_contable","anyof","2"],
                    "AND",
                    ["custitem_ec_item_agrupado.internalid","anyof",itemVenta],
                    "AND", 
                    ["isinactive","is","F"]
                    ],
                    columns:
                    [
                    search.createColumn({name: "internalid", label: "ID interno"}),
                    search.createColumn({name: "itemid", label: "Nombre con item"}),
                    search.createColumn({name: "displayname", label: "Nombre para mostrar"}),
                    search.createColumn({name: "salesdescription", label: "Descripción para la venta"}),
                    search.createColumn({name: "custitem_ec_item_agrupado", label: "ITEM AGRUPADO"}),
                    search.createColumn({
                        name: "displayname",
                        join: "CUSTITEM_EC_ITEM_AGRUPADO",
                        label: "ITEM AGRUPADO NOMBRE"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTITEM_EC_ITEM_AGRUPADO",
                        label: "ITEM AGRUPADO ID INTERNO"
                    })
                    ]
                });


                var myResultSetItemDev = busquedaItemDev.run().getRange({ start: 0, end: 1000 });
                var CountItemDev = busquedaItemDev.runPaged().count;
                log.debug('CountItemDev.........', CountItemDev);
                if (CountItemDev == 1) {

                    idItemDev = myResultSetItemDev[0].getValue(busquedaItemDev.columns[0]);
                    descVentaItemDev = myResultSetItemDev[0].getValue(busquedaItemDev.columns[3]);
              
                }


            } catch (e) {
                logError('Error-getItemDevolucion', e);
            }
        }



    return {
        post: _post_Genera_Registro_Nota_Credito
        
    }
});