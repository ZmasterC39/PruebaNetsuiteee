/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/log'], (url, log) => { // <<< 1. AÑADIR N/log aquí

    const SUBSIDIARIA_AUTOSAFE_ID = '3';
    
    function beforeLoad(scriptContext) {
        if (scriptContext.type === scriptContext.UserEventType.VIEW) {
            
            const currentRecord = scriptContext.newRecord;

            // 1. OBTENER EL ID DE SUBSIDIARIA
            const subsidiaryId = currentRecord.getValue({ fieldId: 'subsidiary' }); // Obtener el ID de la subsidiaria
            const form = scriptContext.form;
          
            // 2. LOGGING DEL SUBSIDIRIA ACTUAL
            log.debug({ // <<< 2. USAR log.debug para mostrar el ID
                title: 'DEBUG UE - SUBSIDIRIA ACTUAL',
                details: 'ID de Subsidiaria: ' + subsidiaryId
            });
          
            // 3. APLICAR LA CONDICIÓN
            if (subsidiaryId.toString() === SUBSIDIARIA_AUTOSAFE_ID) {
                
                const recordId = currentRecord.id;
                const recordType = currentRecord.type;
                
                const clientScriptModulePath = './HTPE_CS_copiar_factura_venta.js'; 

                form.clientScriptModulePath = clientScriptModulePath;

                form.addButton({
                    id: 'custpage_copy_journal',
                    label: 'Asiento Aplica Letra',
                    functionName: `copiarAsiento(${recordId}, '${recordType}')` 
                });
            }
        }
    }
    return {
        beforeLoad
    };
});