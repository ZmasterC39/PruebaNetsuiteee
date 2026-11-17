/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'], function(record) {

    const beforeSubmit = (scriptContext) => {

       try {
           const eventType = scriptContext.type;
      
           if (eventType !== scriptContext.UserEventType.CREATE && eventType !== scriptContext.UserEventType.EDIT) {
                return;
           }

           var journalRec = scriptContext.newRecord;
           //log.debug('journalRec', journalRec);
           //log.debug('subsidiary', journalRec.getValue({ fieldId: 'subsidiary' }));


           if (journalRec.getValue({ fieldId: 'subsidiary' }) === '2' && journalRec.getValue({ fieldId: 'customform' }) === '131'){
          
             // Obtener la Glosa del encabezado (Memo)
             var headerMemo = journalRec.getValue({ fieldId: 'memo' });
             var lineCount = journalRec.getLineCount({ sublistId: 'line' });

             log.debug('journalRec', journalRec);
             log.debug('headerMemo', headerMemo);
             log.debug('lineCount', lineCount);

             for (var i = 0; i < lineCount; i++) {

                // Obtener nota actual del registro de detalle
                var notaActual = journalRec.getSublistValue({
                     sublistId: 'line',
                     fieldId: 'memo',
                     line: i
                });
               

                // Se modifica solo si la glosa del detalle es diferente a la de la cabecera
                if (notaActual !== headerMemo) {

                   log.debug('modificado', 'modifico glosa detalle');

                   // Escribir la glosa en el campo nota de cada línea
                   journalRec.setSublistValue({
                      sublistId: 'line',
                      fieldId: 'memo', // este es el campo "Nota" en las líneas
                      line: i,
                      value: headerMemo
                   });

                 }
               
               
              }
          
           }


       } catch (error) {
            // Captura y registra cualquier error que ocurra
            log.error({
                title: 'Error en beforeSubmit - Copiar Glosa a Nota',
                details: error
            });
        }

        
    }

    return {
        beforeSubmit: beforeSubmit
    };

});
