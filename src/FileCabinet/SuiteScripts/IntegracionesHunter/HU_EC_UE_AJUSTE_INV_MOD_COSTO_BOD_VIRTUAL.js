/**
 *@NApiVersion 2.1
*@NScriptType UserEventScript
*/
define(['N/log', 'N/record', 'N/search'], (log, record, search) => {

    // ACTUALIZAR COSTO ITEMS DE ALQUILER
    const beforeSubmit = (context) => {

        log.debug('beforeSubmit', 'beforeSubmit');
      
        if (context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT) {
            return;
        }

        var depvirtual = 'N';
        var newRecord = context.newRecord;

        var transaccion_relacionada = newRecord.getValue('custbody_ht_af_ejecucion_relacionada');

        log.debug('newRecord', newRecord);
        log.debug('subsidiary', newRecord.getValue('subsidiary'));


        // Solo formulario HT Ajuste de inventario
        if (newRecord.getValue('customform') !== '120' ) {
            return;
        }

 
    
        // Solo para empresa Hunter Carseg
        if (newRecord.getValue('subsidiary') !== '2' ) {
            return;
        }

        // No modificar si viene de una transaccion relacionada
        if (transaccion_relacionada !== '') {
          return;
        }

        try {
      
            var lineCount = newRecord.getLineCount({ sublistId: 'inventory' });

            for (var i = 0; i < lineCount; i++) {
            
                // Obtener subregistro 'inventorydetail'
                var invunitcost = newRecord.getSublistValue({
                   sublistId: 'inventory',
                   fieldId: 'unitcost',
                   line: i
                });

              
                var invDetail = newRecord.getSublistSubrecord({
                   sublistId: 'inventory',
                   fieldId: 'inventorydetail',
                   line: i
                });

                var assignmentCount = invDetail.getLineCount({
                   sublistId: 'inventoryassignment'
                });

                
                var cantreg = 0; // Para incrementar el numero de registros de alquiler


                for (var j = 0; j < assignmentCount; j++) {
                   // Obtener ubicación de esta asignación
                   var locationId = invDetail.getSublistValue({
                       sublistId: 'inventoryassignment',
                       fieldId: 'binnumber',
                       line: j
                    });

                   log.debug('locationId', locationId);

                   depvirtual = verificaDepositoCustodiaAlquiler(locationId);

                   log.debug('depvirtual', depvirtual);

                   if (depvirtual == 'S') {

                       log.debug('actualiza costo', 'entro');

                       cantreg ++;
                  
                    }              
                
                 }

                 if (cantreg == assignmentCount && invunitcost !== 0 ) {
                    newRecord.setSublistValue({ 
                        sublistId: 'inventory', 
                        fieldId: 'unitcost',
                        line: i,
                        value: 0.00 });
                    log.debug('resultado', 'actualizado costo');
                }

            }
       } catch (error) {
            log.error('error beforeSubmit', error);
      }

    }


    // JCH 17/09/2025 VERIFICA SI ES DEPOSITO CUSTODIA - ALQUILER
    function verificaDepositoCustodiaAlquiler(iddeposito) {
        var resultado = 'N';

        var busqueda = search.create({
            type: "bin",
            filters:
            [
                ["inactive","is","F"], 
                "AND", 
                [["custrecord_deposito_para_alquiler","is","T"],"OR",["custrecord_deposito_para_custodia","is","T"]],
                "AND", 
                ["internalid","anyof", iddeposito]
            ],
            columns:
            [
                search.createColumn({name: "internalid", label: "ID interno"}),
                search.createColumn({name: "binnumber", label: "Número de depósito"})
            ]
        });
       
         let searchResult = busqueda.run().getRange({ start: 0, end: 1 });
         if (busqueda.runPaged().count == 1) {
            resultado = 'S';
         }

         return resultado;

    }


    return {
        // beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        //afterSubmit: afterSubmit
    }


});

