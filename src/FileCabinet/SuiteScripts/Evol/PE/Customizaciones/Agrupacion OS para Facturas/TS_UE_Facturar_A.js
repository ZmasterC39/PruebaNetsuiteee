/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/search'], function (log, search) {

    function beforeSubmit(context) {
        log.audit({
            title: 'UE Factura Interna',
            details: 'Se ejecutó beforeSubmit. Tipo evento: ' + context.type
        });

        if (context.type === context.UserEventType.CREATE || 
            context.type === context.UserEventType.COPY || 
            context.type === context.UserEventType.EDIT) {
            const objRecord = context.newRecord;
            if (objRecord.type === 'customsale_ec_factura_interna') {

               // 1. OBTENER EL ID (variable posiblemente vacía)
               let referenceOrdenservicioId = objRecord.getValue('custbody_ec_created_from_fac_int');

               // 2. AÑADIR LA VERIFICACIÓN CONDICIONAL AQUÍ
               if (referenceOrdenservicioId) { 
                
                // Si el ID EXISTE, realiza la búsqueda.
                const result = search.lookupFields({
                    type: 'salesorder',
                    id: referenceOrdenservicioId,
                    columns: ['entity', 'custbody_ht_facturar_a' , 'custbody_ht_cod_agru']
                });

                let facturar_a;
                if (result.custbody_ht_facturar_a && result.custbody_ht_facturar_a.length) {
                    facturar_a = result.custbody_ht_facturar_a[0].value
                } else if (result.entity && result.entity.length) {
                    // Nota: También agregué una verificación para result.entity en caso de que esté vacío.
                    facturar_a = result.entity[0].value
                }

                 // Establecer el campo 'Facturar A' en la factura
                    if (facturar_a) {
                        objRecord.setValue({ 
                            fieldId: 'custbody_ht_facturar_a', 
                            value: facturar_a, 
                            ignoreFieldChange: true 
                        });
                    }
/*
                    // 3. Asignar 'custbody_ht_cod_agru' (Asegurando la extracción del valor del array)
                    if (result.custbody_ht_cod_agru && result.custbody_ht_cod_agru.length) {
                        objRecord.setValue({ 
                            fieldId: 'custbody_ht_cod_agru', 
                            value: result.custbody_ht_cod_agru[0].value, // <--- CAMBIO APLICADO
                            ignoreFieldChange: true 
                        });
                    }
*/            
               /*
               let referenceOrdenservicioId = objRecord.getValue('custbody_ec_created_from_fac_int');

                const result = search.lookupFields({
                    type: 'salesorder',
                    id: referenceOrdenservicioId,
                    columns: ['entity', 'custbody_ht_facturar_a' , 'custbody_ht_cod_agru']
                });
                var facturar_a;
                if (result.custbody_ht_facturar_a.length) {
                    facturar_a = result.custbody_ht_facturar_a[0].value
                } else {
                    facturar_a = result.entity[0].value
                }
                

                objRecord.setValue({ fieldId: 'custbody_ht_facturar_a', value: facturar_a, ignoreFieldChange: true });
              objRecord.setValue({ fieldId: 'custbody_ht_cod_agru', value: result.custbody_ht_cod_agru, ignoreFieldChange: true });
              */
               }
            }
        }
    }

    return {
        beforeSubmit
    };
});