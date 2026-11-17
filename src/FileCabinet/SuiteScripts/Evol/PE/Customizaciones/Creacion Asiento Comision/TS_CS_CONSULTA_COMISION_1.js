/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord'], (currentRecord) => {
    
    // El ID de la sublista que queremos manipular
    const SUBLIST_ID = 'custpage_sublist'; 
    // El ID del campo checkbox dentro de esa sublista
    const CHECKBOX_FIELD_ID = 'custpage_select'; 

    const pageInit = (scriptContext) => {
        // Inicialización opcional si es necesaria
        console.log('Client Script TS_CS_CONSULTA_COMISION_1.js loaded.');
    };

    /**
     * Función llamada por el botón "Marcar Todos".
     * Itera sobre todas las líneas de la sublista y marca el checkbox.
     */
    const markAll = () => {
        try {
            let currentRec = currentRecord.get();
            let lineCount = currentRec.getLineCount({ sublistId: SUBLIST_ID });

            for (let i = 0; i < lineCount; i++) {
                currentRec.selectLine({ sublistId: SUBLIST_ID, line: i });
                currentRec.setCurrentSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: CHECKBOX_FIELD_ID,
                    value: true // Marcar
                });
                currentRec.commitLine({ sublistId: SUBLIST_ID });
            }
            alert(`Se marcaron ${lineCount} líneas.`);
        } catch (e) {
            console.error('Error al marcar todas las líneas:', e);
        }
    };
    
    /**
     * Función llamada por el botón "Desmarcar Todos".
     * Itera sobre todas las líneas de la sublista y desmarca el checkbox.
     */
    const unmarkAll = () => {
        try {
            let currentRec = currentRecord.get();
            let lineCount = currentRec.getLineCount({ sublistId: SUBLIST_ID });

            for (let i = 0; i < lineCount; i++) {
                currentRec.selectLine({ sublistId: SUBLIST_ID, line: i });
                currentRec.setCurrentSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: CHECKBOX_FIELD_ID,
                    value: false // Desmarcar
                });
                currentRec.commitLine({ sublistId: SUBLIST_ID });
            }
            alert(`Se desmarcaron ${lineCount} líneas.`);
        } catch (e) {
            console.error('Error al desmarcar todas las líneas:', e);
        }
    };

    return {
        pageInit: pageInit,
        markAll: markAll,
        unmarkAll: unmarkAll
    };
});