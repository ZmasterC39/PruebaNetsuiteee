/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], 
    (record, search, log, runtime) => {

    /**
     * Definition of the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context
     * @since 2015.2
     */
    const execute = (scriptContext) => {
        
        // Modo test - cambiar a false para ejecutar actualizaciones reales
        const TEST_MODE = false;
        
        // Lista de tranid a procesar (inicialmente solo uno para prueba)
        const invoiceList = ['PE-BV-BE03-00126395',
'PE-BV-BE03-00126396',
'PE-BV-BE03-00126397',
'PE-BV-BE03-00126398',
'PE-BV-BE03-00126399',
'PE-BV-BE03-00126400',
'PE-BV-BE03-00126401',
'PE-BV-BE03-00126402',
'PE-BV-BE03-00126403',
'PE-BV-BE03-00126404',
'PE-BV-BE03-00126405',
'PE-BV-BE03-00126406',
'PE-BV-BE03-00126407',
'PE-BV-BE03-00126408',
'PE-BV-BE03-00126409',
'PE-BV-BE03-00126410',
'PE-BV-BE03-00126411',
'PE-BV-BE03-00126412',
'PE-BV-BE03-00126413',
'PE-BV-BE03-00126414',
'PE-BV-BE03-00126415',
'PE-BV-BE03-00126416',
'PE-BV-BE03-00126417',
'PE-BV-BE03-00126418',
'PE-BV-BE03-00126419',
'PE-BV-BE03-00126420',
'PE-BV-BE03-00126421',
'PE-BV-BE03-00126422',
'PE-BV-BE03-00126423',
'PE-BV-BE03-00126424',
'PE-BV-BE03-00126425',
'PE-BV-BE03-00126426',
'PE-BV-BE03-00126427',
'PE-BV-BE03-00126428',
'PE-BV-BE03-00126429',
'PE-BV-BE03-00126430',
'PE-BV-BE03-00126431',
'PE-BV-BE03-00126432',
'PE-BV-BE03-00126433',
'PE-BV-BE03-00126434',
'PE-BV-BE03-00126435',
'PE-BV-BE03-00126436',
'PE-BV-BE03-00126437',
'PE-BV-BE03-00126438',
'PE-BV-BE03-00126439',
'PE-BV-BE03-00126440',
'PE-BV-BE03-00126441',
'PE-BV-BE03-00126442',
'PE-BV-BE03-00126443',
'PE-BV-BE03-00126444',
'PE-BV-BE03-00126445',
'PE-BV-BE03-00126446',
'PE-BV-BE03-00126447',
'PE-BV-BE03-00126448',
'PE-BV-BE03-00126449',
'PE-BV-BE03-00126450',
'PE-BV-BE03-00126451',
'PE-BV-BE03-00126452',
'PE-BV-BE03-00126453',
'PE-BV-BE03-00126454',
'PE-BV-BE03-00126455',
'PE-BV-BE03-00126456',
'PE-BV-BE03-00126457',
'PE-BV-BE03-00126458',
'PE-BV-BE03-00126459',
'PE-BV-BE03-00126460',
'PE-BV-BE03-00126461',
'PE-BV-BE03-00126462',
'PE-BV-BE03-00126463',
'PE-BV-BE03-00126464',
'PE-BV-BE03-00126465',
'PE-BV-BE03-00126466',
'PE-BV-BE03-00126467',
'PE-BV-BE03-00126468',
'PE-BV-BE03-00126469',
'PE-BV-BE03-00126470',
'PE-BV-BE03-00126471',
'PE-BV-BE03-00126472',
'PE-BV-BE03-00126473',
'PE-BV-BE03-00126474',
'PE-BV-BE03-00126475',
'PE-BV-BE03-00126476',
'PE-BV-BE03-00126477',
'PE-BV-BE03-00126478',
'PE-BV-BE03-00126479',
'PE-BV-BE03-00126480',
'PE-BV-BE03-00126481',
'PE-BV-BE03-00126482',
'PE-BV-BE03-00126483'];
        
        // Valores a actualizar
        const updateValues = {
            trandate: '30/07/2025',
            custbody_pe_concept_detraction: '1',
            custbody_pe_ei_operation_type: '21'
        };
        
        log.audit({
            title: 'Script Iniciado',
            details: `Modo: ${TEST_MODE ? 'TEST' : 'PRODUCCIÓN'} | Facturas a procesar: ${invoiceList.length}`
        });
        
        // Procesar cada factura
        invoiceList.forEach((tranId, index) => {
            try {
                log.audit({
                    title: `Procesando Factura ${index + 1}/${invoiceList.length}`,
                    details: `TranID: ${tranId}`
                });
                
                // Buscar el ID interno de la factura por tranid
                const invoiceSearch = search.create({
                    type: search.Type.INVOICE,
                    filters: [
                        ['tranid', 'is', tranId],
                        'AND',
                        ['mainline', 'is', 'T']
                    ],
                    columns: ['internalid']
                });
                
                let internalId = null;
                invoiceSearch.run().each((result) => {
                    internalId = result.getValue('internalid');
                    return false; // Solo necesitamos el primer resultado
                });
                
                if (!internalId) {
                    log.error({
                        title: 'Factura No Encontrada',
                        details: `No se encontró factura con TranID: ${tranId}`
                    });
                    return; // Continuar con la siguiente factura
                }
                
                log.audit({
                    title: 'Factura Encontrada',
                    details: `TranID: ${tranId} | Internal ID: ${internalId}`
                });
                
                if (TEST_MODE) {
                    // En modo test, solo cargar y mostrar valores actuales
                    const invoiceRecord = record.load({
                        type: record.Type.INVOICE,
                        id: internalId,
                        isDynamic: false
                    });
                    
                    // Obtener valores actuales
                    const currentValues = {
                        trandate: invoiceRecord.getValue('trandate'),
                        custbody_pe_concept_detraction: invoiceRecord.getValue('custbody_pe_concept_detraction'),
                        custbody_pe_ei_operation_type: invoiceRecord.getValue('custbody_pe_ei_operation_type')
                    };
                    
                    log.audit({
                        title: 'TEST MODE - Valores Actuales',
                        details: {
                            tranId: tranId,
                            internalId: internalId,
                            valoresActuales: currentValues,
                            valoresNuevos: updateValues
                        }
                    });
                    
                    log.audit({
                        title: 'TEST MODE - Cambios a Realizar',
                        details: {
                            trandate: `${currentValues.trandate} → ${updateValues.trandate}`,
                            custbody_pe_concept_detraction: `${currentValues.custbody_pe_concept_detraction} → ${updateValues.custbody_pe_concept_detraction}`,
                            custbody_pe_ei_operation_type: `${currentValues.custbody_pe_ei_operation_type} → ${updateValues.custbody_pe_ei_operation_type}`
                        }
                    });
                    
                } else {
                    // Modo producción - actualizar valores
                    const invoiceRecord = record.load({
                        type: record.Type.INVOICE,
                        id: internalId,
                        isDynamic: false
                    });
                    
                    // Guardar valores anteriores para el log
                    const previousValues = {
                        trandate: invoiceRecord.getValue('trandate'),
                        custbody_pe_concept_detraction: invoiceRecord.getValue('custbody_pe_concept_detraction'),
                        custbody_pe_ei_operation_type: invoiceRecord.getValue('custbody_pe_ei_operation_type')
                    };
                    
                    // Actualizar valores
                    // Convertir fecha string a objeto Date
                    const dateParts = updateValues.trandate.split('/');
                    const newDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                    
                    invoiceRecord.setValue({
                        fieldId: 'trandate',
                        value: newDate
                    });
                    
                    invoiceRecord.setValue({
                        fieldId: 'custbody_pe_concept_detraction',
                        value: updateValues.custbody_pe_concept_detraction
                    });
                    
                    invoiceRecord.setValue({
                        fieldId: 'custbody_pe_ei_operation_type',
                        value: updateValues.custbody_pe_ei_operation_type
                    });
                    
                    // Guardar el registro
                    const savedId = invoiceRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                    
                    log.audit({
                        title: 'Factura Actualizada',
                        details: {
                            tranId: tranId,
                            internalId: savedId,
                            valoresAnteriores: previousValues,
                            valoresNuevos: updateValues
                        }
                    });
                }
                
            } catch (error) {
                log.error({
                    title: 'Error al Procesar Factura',
                    details: {
                        tranId: tranId,
                        error: error.toString(),
                        stack: error.stack
                    }
                });
            }
        });
        
        // Verificar uso de gobernanza
        const scriptObj = runtime.getCurrentScript();
        log.audit({
            title: 'Script Finalizado',
            details: `Unidades de gobernanza restantes: ${scriptObj.getRemainingUsage()}`
        });
    }

    return {
        execute: execute
    };
});

/**
 * INSTRUCCIONES DE USO:
 * 
 * 1. Cambiar TEST_MODE a true/false según necesites:
 *    - true: Solo imprime en log lo que haría sin hacer cambios
 *    - false: Ejecuta las actualizaciones reales
 * 
 * 2. Para agregar más facturas, modificar el array invoiceList:
 *    const invoiceList = [
 *        'PE-BV-BE03-00125892',
 *        'PE-BV-BE03-00125893',
 *        'PE-BV-BE03-00125894'
 *    ];
 * 
 * 3. Los campos que se actualizarán son:
 *    - trandate: Fecha de transacción (30/07/2025)
 *    - custbody_pe_concept_detraction: Concepto de detracción (1)
 *    - custbody_pe_ei_operation_type: Tipo de operación (21)
 * 
 * 4. El script registra en el log:
 *    - Inicio y fin del proceso
 *    - Cada factura procesada
 *    - Valores anteriores y nuevos
 *    - Cualquier error encontrado
 *    - Uso de gobernanza
 */