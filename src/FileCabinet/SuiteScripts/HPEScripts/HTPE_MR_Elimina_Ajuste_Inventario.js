/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/log'], (record, log) => {
    const getInputData = () => [1572887, 1576641];

    const map = (context) => {
        const recordId = context.value;
        try {
            // Intentamos primero cambiar el valor de las líneas a 0 
            // para que el motor de costeo no sufra tanto, o simplemente 
            // intentamos moverlo de fecha a un lugar "vacío"
            record.submitFields({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: recordId,
                values: {
                    'memo': 'PENDIENTE DE BORRADO - LIMPIEZA SISTEMA'
                    ///'trandate': new Date('01/01/2000') // Mover a una fecha antigua
                }
            });
            
            log.audit('Paso 1 completado', `Registro ${recordId} movido a fecha antigua.`);

            // Una vez movido a una fecha sin movimiento, el borrado es más ligero
            record.delete({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: recordId
            });
            
            log.audit('Paso 2 completado', `Registro ${recordId} borrado.`);
        } catch (e) {
            log.error('Error persistente', `ID ${recordId}: ${e.message}`);
        }
    };

    return { getInputData, map };
});