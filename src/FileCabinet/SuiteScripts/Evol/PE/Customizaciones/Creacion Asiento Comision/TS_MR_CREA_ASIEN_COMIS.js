/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime', 'N/format'],

    (log, record, search, runtime, format) => {

        // =========================================================================
        // CONSTANTES PARA MEJORAR LEGIBILIDAD
        // =========================================================================
        const ESTADOS = {
            PENDIENTE: 'PENDIENTE',
            PROCESANDO: 'PROCESANDO', // No se usa en la refactorización, pero se mantiene por coherencia
            FINALIZADO: 'FINALIZADO',
            ERROR: 'ERROR',
            ERROR_GLOBAL: 'ERROR GLOBAL'
        };
        const REC_EJECUCION_TYPE = 'customrecord_ts_asient_comis_ejec';
        const FIELD_ESTADO = 'custrecord_ts_asient_comis_ejec_estado';
        const FIELD_FEC_FIN = 'custrecord_ts_asient_comis_ejec_fec_fin';
        const FIELD_ASIENTOS_CR = 'custrecord_ts_asient_comis_ejec_asien_cr';
        const FIELD_ASIENTOS_ERR = 'custrecord_ts_asient_comis_ejec_asie_err';

        // =========================================================================
        // INPUT DATA (Ahora lee los registros de ejecución y prepara la data)
        // =========================================================================
        const getInputData = (inputContext) => {
            let datosParaMap = []; // Array que contendrá los depósitos individuales
            
            try {
                // CAMBIO APLICADO: Obtener el parámetro de script para filtrar un ID de ejecución específico
                const currentScript = runtime.getCurrentScript();
                const targetExecId = currentScript.getParameter({ name: 'custscript_ts_mr_exec_id' }); // Asegúrate de crear este Script Parameter en el registro del script si aplica

                let filters = [
                    ['isinactive', 'is', 'F'],
                    "AND",
                    [FIELD_ESTADO, "is", ESTADOS.PENDIENTE]
                ];

                // CAMBIO APLICADO: Si se especificó un ID de ejecución vía parámetro, se fuerza el filtro para no procesar pendientes antiguos
                if (targetExecId) {
                    filters.push("AND", ['internalid', 'is', targetExecId]);
                }
              
                // 1. Buscar registros de ejecución pendientes
                let execComisiones = search.create({
                    type: REC_EJECUCION_TYPE,
                    filters: filters,
                    columns:
                        [
                            search.createColumn({ name: 'internalid' }),
                            search.createColumn({ name: 'custrecord_ts_asient_comis_ejec_proc_dat' }) // Contiene el JSON con los depósitos
                        ]
                });

                // 2. Iterar sobre los registros de ejecución encontrados
                execComisiones.run().each(function (result) {
                    const recUpdateId = result.getValue('internalid');
                    const procDatString = result.getValue('custrecord_ts_asient_comis_ejec_proc_dat');

                    if (procDatString) {
                        try {
                            const infoCrearAsiento = JSON.parse(procDatString);
                            
                            if (infoCrearAsiento && Array.isArray(infoCrearAsiento.dataDepositos)) {

                                // CAMBIO APLICADO: Cambiar inmediatamente el estado del registro de ejecución a 'PROCESANDO'
                                // para evitar que reintentos del motor de NetSuite o ejecuciones paralelas vuelvan a tomar este registro.
                                record.submitFields({
                                    type: REC_EJECUCION_TYPE,
                                    id: recUpdateId,
                                    values: {
                                        [FIELD_ESTADO]: ESTADOS.PROCESANDO
                                    }
                                });
                                
                                // 3. ITERACIÓN CLAVE: Distribuir CADA DEPÓSITO como una unidad de trabajo
                                infoCrearAsiento.dataDepositos.forEach(deposito => {
                                    // Adjuntar la data del paymentMethod y el ID de ejecución a cada depósito
                                    deposito.paymentMethod = infoCrearAsiento.paymentMethod;
                                    deposito.recUpdateId = recUpdateId;
                                    
                                    // Agregar el objeto de depósito completo al array que será enviado a MAP
                                    datosParaMap.push(deposito);
                                });
                            }
                        } catch (e) {
                            log.error({
                                title: 'Error al parsear proc_dat para ID: ' + recUpdateId,
                                details: e.toString()
                            });
                            
                            // CAMBIO APLICADO: Marcar como ERROR el registro de ejecución si su JSON vino corrupto
                            record.submitFields({
                                type: REC_EJECUCION_TYPE,
                                id: recUpdateId,
                                values: {
                                    [FIELD_ESTADO]: ESTADOS.ERROR,
                                    [FIELD_ASIENTOS_ERR]: 'JSON de entrada inválido: ' + e.toString()
                                }
                            });
                        }
                    }
                    return true;
                });
                
                log.audit('getInputData', 'Depósitos a procesar (unidades de Map): ' + datosParaMap.length);
                return datosParaMap; // El array de depósitos individuales
            } catch (error) {
                log.error({
                    title: 'Error en getInputData',
                    details: error.toString() + ' Stack: ' + error.stack
                });
                return [];
            }
        }

        // =========================================================================
        // MAP (Solo Emite: Agrupa por ID de Ejecución)
        // =========================================================================
        const map = (mapContext) => {
            try {
                // mapContext.value es un depósito individual (ya es un objeto de InputData)
                const deposito = JSON.parse(mapContext.value); 
                const recUpdateId = deposito.recUpdateId;
                
                // Emite el depósito, usando el ID del registro de ejecución principal como CLAVE
                // para que la etapa REDUCE reciba todos los depósitos asociados a una ejecución juntos.
                mapContext.write({
                    key: recUpdateId,
                    value: JSON.stringify(deposito) // Objeto Depósito
                });
                
            } catch (error) {
                // Este error indica un problema en un depósito individual que no pudo ser parseado/emitido
                log.error({
                    title: 'Error en Map al emitir depósito',
                    details: error.toString() + ' Stack: ' + error.stack
                });
            }
        }

        // =========================================================================
        // REDUCE (CLAVE: Crea Asiento y Actualiza Depósito)
        // =========================================================================
        const reduce = (reduceContext) => {
            // reduceContext.values es un array de strings JSON, cada uno representa un depósito
            const recUpdateId = reduceContext.key; 
            let AsientosCreados = [];
            let DepositoError = [];

            // El límite de uso se reinicia en cada contexto de Reduce.
            for (let i = 0; i < reduceContext.values.length; i++) {
                let deposito = JSON.parse(reduceContext.values[i]);
                let asientoComisionId = null;

                try {
                    // --- CREACIÓN DEL ASIENTO DE DIARIO ---
                    let asientoComision = record.create({
                        type: record.Type.JOURNAL_ENTRY,
                        isDynamic: false
                    });
                    
                    // 1. Campos de Encabezado
                    let infoCrearAsiento = { paymentMethod: deposito.paymentMethod }; // Información de cuentas
                    
                    asientoComision.setValue({ fieldId: 'subsidiary', value: deposito.subsidiary });
                    asientoComision.setValue({ fieldId: 'currency', value: deposito.deposit_currency });

                    let tranDate = format.parse({
                        value: deposito.deposit_date,
                        type: format.Type.DATE
                    });
                    asientoComision.setValue({ fieldId: 'trandate', value: tranDate });
                    asientoComision.setValue({ fieldId: 'memo', value: 'Asiento de Comision - ' + deposito.deposit_number });
                    asientoComision.setValue({ fieldId: 'custbody_pe_tipo_de_diario', value: 22 });
                  

                    // 2. Línea 0 de DEBITO
                    let lineIndex = 0; 
                    let debitAccount = (deposito.deposit_currency_name == 'Soles')
                        ? infoCrearAsiento.paymentMethod.custrecord_ht_cta_cxp_ancipo_mn
                        : infoCrearAsiento.paymentMethod.custrecord_ht_cta_cxp_ancipo_me;
                        
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'account', line: lineIndex, value: debitAccount });
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'debit', line: lineIndex, value: deposito.deposit_amount });
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: lineIndex, value: infoCrearAsiento.paymentMethod.custrecord_ht_proveedor });
                    
                    if (deposito.department) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'department', line: lineIndex, value: deposito.department });
                    if (deposito.location) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'location', line: lineIndex, value: deposito.location });
                    if (deposito.class) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'class', line: lineIndex, value: deposito.class });
                    if (deposito.nota_linea) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: lineIndex, value: deposito.nota_linea });
                    
                    // 3. Línea 1 de CREDITO
                    lineIndex = 1; 
                    let creditAccount = (deposito.deposit_currency_name == 'Soles')
                        ? infoCrearAsiento.paymentMethod.custrecord_ht_cta_pte_ancipo_mn
                        : infoCrearAsiento.paymentMethod.custrecord_ht_cta_pte_ancipo_me;
                        
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'account', line: lineIndex, value: creditAccount });
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'credit', line: lineIndex, value: deposito.deposit_amount });
                    asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'entity', line: lineIndex, value: infoCrearAsiento.paymentMethod.custrecord_ht_proveedor });
                    
                    // Segmentación (repetida para la línea de crédito)
                    if (deposito.department) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'department', line: lineIndex, value: deposito.department });
                    if (deposito.location) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'location', line: lineIndex, value: deposito.location });
                    if (deposito.class) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'class', line: lineIndex, value: deposito.class });
                    if (deposito.nota_linea) asientoComision.setSublistValue({ sublistId: 'line', fieldId: 'memo', line: lineIndex, value: deposito.nota_linea });

                    // 4. Guardar el asiento
                    asientoComisionId = asientoComision.save({ ignoreMandatoryFields: false });

                    // 5. Actualizar el depósito para vincular el asiento (Operación de E/S adicional)
                    record.submitFields({
                        type: 'deposit',
                        id: deposito.deposit_id,
                        values: {
                            custbody_ht_asiento_comision_ref: asientoComisionId
                        }
                    });

                    AsientosCreados.push({
                        asientoComisionId: asientoComisionId,
                        id: deposito.deposit_id,
                        number: deposito.deposit_number
                    });

                } catch (error) {
                    // Error al crear el asiento para un depósito específico
                    log.error({
                        title: `Error en Reduce al crear asiento para depósito ${deposito.deposit_number} (ID: ${deposito.deposit_id})`,
                        details: error.toString() + ' Stack: ' + error.stack
                    });
                    DepositoError.push({
                        id: deposito.deposit_id,
                        number: deposito.deposit_number,
                        error: error.toString()
                    });
                }
            } // Fin del bucle for de reduceContext.values

            // Emitir los resultados para ser consolidados en la etapa Summarize
            reduceContext.write({
                key: recUpdateId,
                value: JSON.stringify({
                    creados: AsientosCreados,
                    errores: DepositoError
                })
            });
        }

        // =========================================================================
        // SUMMARIZE (Consolida Resultados y Actualiza Registro de Ejecución)
        // =========================================================================
        /*const summarize = (summaryContext) => {
            let totalAsientosCreados = [];
            let totalDepositosError = [];
            let recUpdateId = null;

            // 1. Consolidar resultados de la etapa Reduce
            summaryContext.output.iterator().each(function (key, value) {
                // 'key' es el recUpdateId del registro de ejecución
                recUpdateId = key; 
                let result = JSON.parse(value);
                
                if (result.creados) {
                    totalAsientosCreados = totalAsientosCreados.concat(result.creados);
                }
                if (result.errores) {
                    totalDepositosError = totalDepositosError.concat(result.errores);
                }
                return true;
            });

            // 2. Actualizar el Registro de Ejecución (Final)
            if (recUpdateId) {
                let finalValues = {};
                finalValues[FIELD_FEC_FIN] = new Date();
                finalValues[FIELD_ASIENTOS_CR] = JSON.stringify(totalAsientosCreados);
                
                if (totalDepositosError.length > 0) {
                    finalValues[FIELD_ESTADO] = ESTADOS.ERROR;
                    finalValues[FIELD_ASIENTOS_ERR] = JSON.stringify(totalDepositosError);
                } else {
                    finalValues[FIELD_ESTADO] = ESTADOS.FINALIZADO;
                }

                try {
                    record.submitFields({
                        type: REC_EJECUCION_TYPE,
                        id: recUpdateId,
                        values: finalValues
                    });
                    log.audit('Actualización Final', 'Registro de Ejecución ' + recUpdateId + ' actualizado a ' + finalValues[FIELD_ESTADO]);

                } catch (error) {
                    log.error('Error en Summarize al actualizar el registro de ejecución', error.toString());
                }
            }

            // 3. Manejo de Errores Globales
            if (summaryContext.inputSummary.error) {
                log.error('Input Error', summaryContext.inputSummary.error);
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error({
                    title: 'Error no manejado en Map Key: ' + key,
                    details: error
                });
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error({
                    title: 'Error no manejado en Reduce Key: ' + key,
                    details: error
                });
                return true;
            });

            log.audit({
                title: 'Map/Reduce Terminado',
                details: 'Tiempo de ejecución: ' + summaryContext.seconds + ' segundos. Unidades consumidas: ' + summaryContext.usage
            });
        }*/


        // =========================================================================
        // SUMMARIZE (Consolida Resultados y Actualiza Registro de Ejecución)
        // =========================================================================
        const summarize = (summaryContext) => {
            // CAMBIO APLICADO: Se cambió la consolidación a un mapa por ID de Ejecución
            // para soportar correctamente los updates si hubiesen múltiples registros procesados.
            let ejecucionesMap = {};

            summaryContext.output.iterator().each(function (key, value) {
                let recUpdateId = key; 
                let result = JSON.parse(value);
                
                if (!ejecucionesMap[recUpdateId]) {
                    ejecucionesMap[recUpdateId] = { creados: [], errores: [] };
                }

                if (result.creados) {
                    ejecucionesMap[recUpdateId].creados = ejecucionesMap[recUpdateId].creados.concat(result.creados);
                }
                if (result.errores) {
                    ejecucionesMap[recUpdateId].errores = ejecucionesMap[recUpdateId].errores.concat(result.errores);
                }
                return true;
            });

            // CAMBIO APLICADO: Iterar sobre cada ID de ejecución para cerrar individualmente cada registro
            Object.keys(ejecucionesMap).forEach(recUpdateId => {
                let finalValues = {};
                let ejecucionData = ejecucionesMap[recUpdateId];
                
                finalValues[FIELD_FEC_FIN] = new Date();
                finalValues[FIELD_ASIENTOS_CR] = JSON.stringify(ejecucionData.creados);
                
                if (ejecucionData.errores.length > 0) {
                    finalValues[FIELD_ESTADO] = ESTADOS.ERROR;
                    finalValues[FIELD_ASIENTOS_ERR] = JSON.stringify(ejecucionData.errores);
                } else {
                    finalValues[FIELD_ESTADO] = ESTADOS.FINALIZADO;
                }

                try {
                    record.submitFields({
                        type: REC_EJECUCION_TYPE,
                        id: recUpdateId,
                        values: finalValues
                    });
                    log.audit('Actualización Final', 'Registro de Ejecución ' + recUpdateId + ' actualizado a ' + finalValues[FIELD_ESTADO]);

                } catch (error) {
                    log.error('Error en Summarize al actualizar el registro de ejecución ID: ' + recUpdateId, error.toString());
                }
            });

            // Manejo de Errores Globales
            if (summaryContext.inputSummary.error) {
                log.error('Input Error', summaryContext.inputSummary.error);
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error({
                    title: 'Error no manejado en Map Key: ' + key,
                    details: error
                });
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error({
                    title: 'Error no manejado en Reduce Key: ' + key,
                    details: error
                });
                return true;
            });

            log.audit({
                title: 'Map/Reduce Terminado',
                details: 'Tiempo de ejecución: ' + summaryContext.seconds + ' segundos. Unidades consumidas: ' + summaryContext.usage
            });
        }

        return { getInputData, map, reduce, summarize }
    });