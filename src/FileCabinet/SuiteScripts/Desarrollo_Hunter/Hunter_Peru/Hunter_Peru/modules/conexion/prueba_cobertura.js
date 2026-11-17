/**
 *
 *  - 671733 → Producto 28797, Familia 446
 *  - 665900 → Producto 38598, Familia 304
 *  - 672750 → Producto 22766, Familia 457
 *
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log'], (record, log) => {

    const TEST_MODE = false;  

    // Tabla de registros a actualizar
    const COBERTURAS = [
        //{ id: 671733, producto: 28797, familia: 446 },
        { id: 665900, producto: 38598, familia: 304 },
        { id: 672750, producto: 22766, familia: 457 }
    ];

    const NEW_SUBSIDIARIA = 2;

    const execute = () => {
        try {
            COBERTURAS.forEach(cob => {
                let logData = {
                    internalId: cob.id,
                    producto_nuevo: cob.producto,
                    familia_nueva: cob.familia,
                    subsidiaria_nueva: NEW_SUBSIDIARIA,
                    modo: TEST_MODE ? 'SOLO LOG (TEST)' : 'ACTUALIZACIÓN REAL'
                };

                if (TEST_MODE) {
                    log.audit('Simulación de actualización', logData);
                } else {
                    // ✅ Actualización real
                    record.submitFields({
                        type: 'customrecord_ht_co_cobertura',
                        id: cob.id,
                        values: {
                            custrecord_ht_co_producto: cob.producto,
                            custrecord_ht_co_familia_prod: cob.familia,
                            custrecord_ht_co_subsidiaria: NEW_SUBSIDIARIA
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });

                    log.audit('Registro actualizado', logData);
                }
            });

        } catch (e) {
            log.error('Error en Scheduled Script', e.message);
        }
    };

    return { execute };
});
