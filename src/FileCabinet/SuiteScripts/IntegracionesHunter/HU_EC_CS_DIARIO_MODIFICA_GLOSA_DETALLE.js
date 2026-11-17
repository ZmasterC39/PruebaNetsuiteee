/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord'], function(currentRecord) {

    // validateLine se ejecuta cuando el usuario sale de la línea.
    // lineInit se ejecuta al entrar a la línea, por ejemplo, al crear una nueva o editar una existente.

    function validateLine(context) {

        try {
            var currentRec = context.currentRecord;

            log.debug('currentRec', currentRec);

            if (currentRec.getValue({ fieldId: 'subsidiary' }) === '2' && currentRec.getValue({ fieldId: 'customform' }) === '131') {

                if (context.sublistId === 'line') {
                     var glosa = currentRec.getValue({ fieldId: 'memo' });

                     log.debug('glosa', glosa);

                     // Solo establecer si es diferente del memo cabacera
                    var notaActual = currentRec.getCurrentSublistValue({
                         sublistId: 'line',
                         fieldId: 'memo'
                    });

                   if (notaActual !== glosa) {
                        currentRec.setCurrentSublistValue({
                          sublistId: 'line',
                          fieldId: 'memo',
                          value: glosa || ''
                          });
                    }
                }
          
            }

         return true;
          

      } catch (error) {
            log.error('error validateLine', error);
            return true; // Retornar true para no bloquear al usuario
      }
          
    }

    function lineInit(context) {

        try {
      
             var currentRec = context.currentRecord;

             if (currentRec.getValue({ fieldId: 'subsidiary' }) === '2') {

                   if (context.sublistId === 'line') {
                         var glosa = currentRec.getValue({ fieldId: 'memo' });

                         var notaActual = currentRec.getCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'memo'
                          });

                          if (notaActual !== glosa) {
                               currentRec.setCurrentSublistValue({
                               sublistId: 'line',
                               fieldId: 'memo',
                               value: glosa || ''
                              });
                          }
                    }

               }

         } catch (e) {
            log.error('error lineInit', error);
        }

    }

    return {
        validateLine: validateLine,
        lineInit: lineInit
    };

});
