/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * Este script fuerza el recálculo del GL Impact para una lista de transacciones.
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    // Usa el ID de tu Saved Search aquí.
    const SAVED_SEARCH_ID = 'customsearch_deposito_usgaap';

    const getInputData = () => {
        try {
            // Usa search.load() para cargar la búsqueda guardada.
            const transactionSearch = search.load({
                id: SAVED_SEARCH_ID
            });
            
            return transactionSearch;

        } catch (e) {
            log.error({
                title: 'Error SSS_MISSING_REQD_ARGUMENT (Saved Search)',
                details: `Verifica que la Búsqueda Guardada con ID: ${SAVED_SEARCH_ID} exista y sea accesible. Error: ${e.message}`
            });
            throw e;
        }
    };

    // La función que procesa cada transacción
    // ESTA FUNCIÓN AHORA ESTÁ DENTRO DEL ÁMBITO CORRECTO
    const map = (scriptContext) => {
        const searchResult = JSON.parse(scriptContext.value);
        const transactionId = searchResult.id;
        const transactionType = searchResult.recordType;
        
        try {
            log.audit('Procesando Transacción', `Tipo: ${transactionType}, ID: ${transactionId}`);

            // 1. Cargar la transacción en modo de edición
            const rec = record.load({
                type: transactionType,
                id: transactionId,
                isDynamic: false
            });

            // 2. Establecer un campo de bajo impacto para forzar el motor GL a ejecutarse.
            rec.setValue({
                fieldId: 'custbody_ht_upd_mb',
                value: true, 
                ignoreFieldChange: true 
            });

            // 3. Guardar la transacción. Esto fuerza el recálculo.
            const updatedId = rec.save(); 
            
            log.audit('Éxito', `Transacción ID ${updatedId} reprocesada y guardada.`);

        } catch (e) {
            log.error('Error al Reprocesar', `ID: ${transactionId}, Error: ${e.name} - ${e.message}`);
        }
    };

    // EL OBJETO DE RETORNO AHORA ESTÁ DENTRO DEL ÁMBITO CORRECTO
    return {
        getInputData: getInputData,
        map: map
    };
});