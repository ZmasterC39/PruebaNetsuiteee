/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/format', 'N/search'], (record, log, format, search) => {
    
    // ID de la Búsqueda Guardada que contiene los registros a actualizar
    const SAVED_SEARCH_ID = 'customsearch_pe_upd_apply_saldo_cliente'; 

  // Alias de la columna de la fórmula en tu Saved Search.
    // **NOTA:** Debe ser el ALIAS EXACTO (ej. 'custcol_formato_pe').
    const FORMULA_DATE_ALIAS = 'custcol_formato_pe';
  
    // **NOTA:** La fecha ya no es fija, el valor lo traeremos de la búsqueda.
    // Esto es solo un ejemplo de cómo podrías cargar un valor.
    // En este caso, el valor a transferir será dinámico por registro.

    const execute = (scriptContext) => {

        try {
            // 1. Cargar la Búsqueda Guardada
            const transactionSearch = search.load({ id: SAVED_SEARCH_ID });

            // 2. Ejecutar y obtener las columnas para un acceso seguro
            const columns = transactionSearch.columns;

            // 3. Buscar el objeto de columna por su ALIAS para garantizar la coincidencia
            const formulaColumn = columns.find(col => col.name === FORMULA_DATE_ALIAS || col.label === FORMULA_DATE_ALIAS);
            
            if (!formulaColumn) {
                log.error('ERROR DE COLUMNA', `No se encontró la columna con alias/nombre: ${FORMULA_DATE_ALIAS} en la búsqueda guardada.`);
                return;
            }
            // 2. Ejecutar la Búsqueda e iterar
            transactionSearch.run().each(searchResult => {
                
                const currentId = searchResult.id;
                const recordType = searchResult.recordType; // Debería ser 'depositapplication'

                // =========================================================
                // PASO CLAVE: OBTENER EL VALOR DE LA COLUMNA DE LA BÚSQUEDA
                // =========================================================
                // Debes reemplazar 'custcol_formato_pe' por el nombre del campo 
                // que agregaste como columna en tu Saved Search.
              
                const valorATransferir = searchResult.getValue({
                      name: formulaColumn
                });

            
              //  const valorATransferir = '10-05-2025';
              
                log.debug('Transferencia', `Registro: ${currentId}, Valor a transferir: ${valorATransferir}`);

                try {
                    // Cargar el registro Deposit Application
                    const applicationRecord = record.load({
                        type: recordType, 
                        id: currentId,
                        isDynamic: false
                    });

                    // =========================================================
                    // PASO CLAVE: ASIGNAR EL VALOR OBTENIDO AL CAMPO DEL REGISTRO
                    // =========================================================
                    // Asume que 'custbody_pe_registro' es un campo de texto o lista.
                    // Si es un campo de FECHA, necesitarás usar N/format antes.
                    applicationRecord.setValue({
                        fieldId: 'custbody_pe_registro',
                        value: valorATransferir // <-- Usamos el valor extraído de la búsqueda
                    });
                    applicationRecord.setValue({
                        fieldId: 'custbody_ht_upd_mb', 
                        value: true,  //rec.getValue({ fieldId: 'custbody_ht_upd_mb' }),
                        ignoreFieldChange: true // Para evitar efectos secundarios en otros scripts
                    });


                    // Guardar la transacción.
                    const savedId = applicationRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });

                    log.audit('ÉXITO', `ID: ${currentId} actualizado con valor de búsqueda: ${valorATransferir}. Guardado como: ${savedId}`);

                } catch (error) {
                    log.error('ERROR DE PROCESAMIENTO', `ID: ${currentId}. Error: ${error.name || error.toString()}`);
                }
                
                return true; 
            });

        } catch (searchError) {
            log.error('ERROR DE BÚSQUEDA', `Fallo al cargar/ejecutar la búsqueda ${SAVED_SEARCH_ID}. Error: ${searchError.message}`);
        }
    };

    return { execute: execute };
});