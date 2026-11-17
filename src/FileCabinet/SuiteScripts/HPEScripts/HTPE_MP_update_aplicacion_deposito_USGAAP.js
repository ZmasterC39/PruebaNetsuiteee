/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * Este script fuerza el recálculo del GL Impact para una lista de transacciones.
 */
define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

    // Usa el ID de tu Saved Search aquí.
    const SAVED_SEARCH_ID = 'customsearch_upd_saldos_a_favor_usgaap'; 
    var nro_reg = 0;

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
            // Es buena práctica modificar un campo, aunque el valor sea el mismo.
            // Ejemplo: actualizar el memo o un campo personalizado no contable.
            rec.setValue({
                fieldId: 'custbody_ht_upd_mb', 
                value: true,  //rec.getValue({ fieldId: 'custbody_ht_upd_mb' }),
                ignoreFieldChange: true // Para evitar efectos secundarios en otros scripts
            });

            // 3. Guardar la transacción.
            // **Este paso fuerza el recálculo completo del GL Impact**,
            // incluyendo la re-ejecución de tu Plug-in de SuiteGL.
            const updatedId = rec.save(); 

          nro_reg ++;
                     
          log.audit('Éxito', `Transacción ${nro_reg} ID ${updatedId} reprocesada y guardada.`);

        } catch (e) {
            log.error('Error al Reprocesar', `ID: ${transactionId}, Error: ${e.name} - ${e.message}`);
        }
    };

    return {
        getInputData: getInputData,
        map: map
    };
});