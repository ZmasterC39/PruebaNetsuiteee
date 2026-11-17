/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect', 'N/format'],
    (serverWidget, record, redirect, format) => {

        // Constante para el tipo de registro Cuenta de NetSuite (usada para los campos SELECT)
        const ACCOUNT_RECORD_TYPE = 'account';

        // --- Mapeo de Cuentas por Moneda (¡IMPORTANTE! EDITAR ESTOS VALORES CON LOS ID REALES) ---
        // La clave del objeto debe ser el ID INTERNO del registro de Moneda (Currency ID).
        // El valor contiene un array de objetos (RULES), donde cada objeto define una regla completa de sustitución.
        // CADA REGLA ES ANALIZADA INDEPENDIENTEMENTE DENTRO DEL ASIENTO.
        const CURRENCY_ACCOUNT_MAP = {
            // Ejemplo 1: Moneda ID '1' (ej: USD)
            '1': { 
                RULES: [
                    // Regla de sustitución 1 para Moneda '1'
                    {
                        ORIGIN_ACCOUNT: 6820,     // ID de la cuenta que debe ser reemplazada (ejemplo)
                        DEBIT_TARGET_ACCOUNT: 6820, // ID de la cuenta para líneas de DÉBITO
                        CREDIT_TARGET_ACCOUNT: 4897 // ID de la cuenta para líneas de CRÉDITO
                    },
                    // Si tuviera una segunda cuenta de origen a sustituir en USD, la agregaría aquí:
                    
                    {
                        ORIGIN_ACCOUNT: 53,
                        DEBIT_TARGET_ACCOUNT: 6820,
                        CREDIT_TARGET_ACCOUNT: 4897
                    }
                    
                ]
            },
            
            // Moneda ID '5' (¡AJUSTAR CUENTAS REALES!)
            '5': { 
                RULES: [
                    // Regla de sustitución 1 para Moneda '5'
                    {
                        ORIGIN_ACCOUNT: 6819, // Cuenta de Origen a sustituir
                        DEBIT_TARGET_ACCOUNT: 6819, // Nueva cuenta para DÉBITO
                        CREDIT_TARGET_ACCOUNT: 4896 // Nueva cuenta para CRÉDITO
                    },
                    // Regla de sustitución 2 para Moneda '5' - Ejemplo: Si la cuenta 7000 también debe ser reemplazada.
                    {
                        ORIGIN_ACCOUNT: 53, 
                        DEBIT_TARGET_ACCOUNT: 6819, 
                        CREDIT_TARGET_ACCOUNT: 4896 
                    },
                     // Agregue tantas reglas de sustitución como necesite para esta moneda...
                ]
            },
            // Añadir más pares de Moneda/Cuentas según sea necesario...
        };
        // --- FIN Mapeo de Cuentas ---

        function onRequest(context) {
            if (context.request.method === 'GET') {
                // --- Petición GET: Mostrar el formulario de entrada de datos ---
                handleGet(context);
            } else {
                // --- Petición POST: Procesar la copia y modificación ---
                handlePost(context);
            }
        }

        /**
         * Maneja la petición GET: Muestra el formulario al usuario.
         */
        function handleGet(context) {
            const request = context.request;
            // Parámetros pasados desde el Client Script
            const originalId = request.parameters.originalId;
            const recordType = request.parameters.recordType;

            // --- Cargar el registro original para obtener la Moneda ID y el texto de referencia ---
            let originalCurrencyText = 'N/A';
            let originalCurrencyId = null; 

            try {
                const originalJournal = record.load({
                    type: recordType,
                    id: originalId,
                    isDynamic: false
                });
                // Obtener el texto y el ID de la moneda
                originalCurrencyText = originalJournal.getText({ fieldId: 'currency' }) || 'No definida';
                originalCurrencyId = originalJournal.getValue({ fieldId: 'currency' });

            } catch (e) {
                log.error({ title: 'ERROR al cargar registro original', details: e.message });
                // En caso de error, mostramos un mensaje en la UI
                context.response.write('<html><body><h1>Error de Carga</h1><p>No se pudo cargar el asiento original. Revise los logs del Suitelet.</p><script>window.close();</script></body></html>');
                return;
            }


            const form = serverWidget.createForm({
                title: 'Opciones de Asiento de Anticipo'
            });

            // Añadir un botón para cerrar la ventana
            form.addButton({
                id: 'custpage_close',
                label: 'Cancelar',
                functionName: 'window.close()'
            });

            // Grupos de Campos para organización visual
            form.addFieldGroup({ id: 'custgrp_date', label: 'Fecha de Contabilización' });
            form.addFieldGroup({ id: 'custgrp_info', label: 'Información Original' });

            // --- Campo de Moneda Original (Display Field) ---
            const currencyDisplayField = form.addField({
                id: 'custpage_original_currency_display',
                type: serverWidget.FieldType.TEXT,
                label: 'Moneda del Asiento Original',
                container: 'custgrp_info'
            });
            currencyDisplayField.defaultValue = originalCurrencyText;
            
            // Establecer el tipo de visualización como DISABLED para que no se pueda modificar
            currencyDisplayField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });
            
            // 1. Campos Ocultos para pasar el ID original, Tipo de Registro y MONEDA ID a la petición POST
            form.addField({
                id: 'custpage_original_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Original ID',
                container: 'custgrp_info'
            }).defaultValue = originalId;

            form.addField({
                id: 'custpage_record_type',
                type: serverWidget.FieldType.TEXT,
                label: 'Record Type',
                container: 'custgrp_info'
            }).defaultValue = recordType;

           
            // NUEVO CAMPO OCULTO: Pasar el ID de la Moneda para usarlo en la lógica POST
            form.addField({
                id: 'custpage_original_currency_id',
                type: serverWidget.FieldType.TEXT,
                label: 'Currency ID (Hidden)',
                container: 'custgrp_info'
            }).defaultValue = originalCurrencyId;
            
            // 2. Campo para ingresar la Nueva Fecha (Obligatorio)
            const newDateTField = form.addField({
                id: 'custpage_new_trandate',
                type: serverWidget.FieldType.DATE,
                label: 'Nueva Fecha de Asiento',
                container: 'custgrp_date'
            });
            newDateTField.isMandatory = true;
            
            // Establecer la fecha de hoy como valor por defecto
            newDateTField.defaultValue = format.format({
                value: new Date(),
                type: format.Type.DATE
            });

            form.addSubmitButton({
                label: 'Asiento Letra' 
            });

            context.response.writePage(form);
        }

        /**
         * Maneja la petición POST: Realiza la copia, sustituye las cuentas y redirige.
         */
        function handlePost(context) {
            const request = context.request;
            // Obtener los valores del formulario
            const originalId = request.parameters.custpage_original_id;
            const recordType = request.parameters.custpage_record_type;
            const newDateString = request.parameters.custpage_new_trandate;
            const originalCurrencyId = request.parameters.custpage_original_currency_id; // Obtener ID de la moneda
            
            const originalIdNum = parseInt(originalId);
            
            // --- 0. Determinar Reglas de Sustitución según la Moneda ---
            let substitutionRules; // Array para almacenar todas las reglas de la moneda

            const currencyConfig = CURRENCY_ACCOUNT_MAP[originalCurrencyId];
            log.debug('Moneda Original', `Moneda ID: ${originalCurrencyId}`);

            if (currencyConfig && currencyConfig.RULES && currencyConfig.RULES.length > 0) {
                substitutionRules = currencyConfig.RULES;
                log.debug('Reglas Determinadas', `Moneda ID: ${originalCurrencyId}. Reglas encontradas: ${substitutionRules.length}`);
            } else {
                // Si la moneda no está mapeada, lanzamos un error explícito
                throw new Error(`Error de Configuración: La moneda ID (${originalCurrencyId}) no tiene reglas de sustitución definidas en el Suitelet (CURRENCY_ACCOUNT_MAP.RULES).`);
            }
            // ----------------------------------------------------
            
            try {
                // 1. Crear una copia del registro original
                const newJournal = record.copy({
                    type: recordType,
                    id: originalIdNum
                });

                // 2. Setear la nueva fecha
                const newDate = format.parse({
                    value: newDateString,
                    type: format.Type.DATE 
                });
                newJournal.setValue({
                    fieldId: 'trandate',
                    value: newDate
                });
                
                // 3. Modificar el Memo para referencia
                const originalMemo = newJournal.getValue({ fieldId: 'memo' }) || '';
                newJournal.setValue({
                    fieldId: 'memo',
                    value: `ANTICIPO CXC - ${originalMemo}` 
                });

                // 4. Iterar las líneas y aplicar las reglas de sustitución
                const lineCount = newJournal.getLineCount({ sublistId: 'line' });

                for (let i = 0; i < lineCount; i++) {
                    const currentAccount = newJournal.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        line: i
                    });

                    log.debug('Procesando Línea', `Línea ${i}: Cuenta actual: ${currentAccount}`);

                    // Buscar una regla que coincida con la cuenta actual
                    const matchingRule = substitutionRules.find(rule => {
                        // Convertimos el ID numérico de la regla a String para compararlo con el valor de sublista (que es String)
                        const originAccountString = String(rule.ORIGIN_ACCOUNT);
                        return currentAccount === originAccountString;
                    });
                    
                    if (matchingRule) { 
                        // Regla encontrada, ahora determinamos si es Débito o Crédito
                        log.debug('Regla Aplicable', `Línea ${i}: Regla encontrada para cuenta ${matchingRule.ORIGIN_ACCOUNT}`);

                        const debitAmount = newJournal.getSublistValue({
                            sublistId: 'line',
                            fieldId: 'debit',
                            line: i
                        });

                        const creditAmount = newJournal.getSublistValue({
                            sublistId: 'line',
                            fieldId: 'credit',
                            line: i
                        });
                        
                        let targetAccountForLine = null;

                        if (parseFloat(creditAmount) > 0) {
                            // La línea es un Crédito
                            targetAccountForLine = matchingRule.CREDIT_TARGET_ACCOUNT;
                            log.debug('Sustitución', `Línea ${i}: Crédito detectado. Reemplazando ${currentAccount} con ${targetAccountForLine}`);
                        } else if (parseFloat(debitAmount) > 0) {
                            // La línea es un Débito
                            targetAccountForLine = matchingRule.DEBIT_TARGET_ACCOUNT;
                            log.debug('Sustitución', `Línea ${i}: Débito detectado. Reemplazando ${currentAccount} con ${targetAccountForLine}`);
                        }

                        if (targetAccountForLine) {
                             newJournal.setSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                line: i,
                                value: targetAccountForLine 
                            });
                        }
                    }
                    // Si no hay regla coincidente, la cuenta original de la línea se mantiene.
                }

                // 5. Guardar el nuevo registro
                const newRecordId = newJournal.save();

                // 6. Redirigir al usuario
                context.response.write('<html><body><h1>Copia Exitosa</h1><p>El asiento ha sido copiado y modificado. Redirigiendo...</p><script>window.opener.location = "/app/accounting/transactions/journal.nl?id=' + newRecordId + '&e=T"; window.close();</script></body></html>');

            } catch (e) {
                // Registrar el error en los logs de ejecución
                log.error({ title: 'Error al procesar la copia', details: e.message });
                // En caso de error, mostrar un mensaje al usuario
                context.response.write('<html><body><h1>Error al Copiar Asiento</h1><p>Ocurrió un error al procesar la copia: ' + e.message + '</p><script>window.opener.location.reload(); window.close();</script></body></html>');
            }
        }

        return {
            onRequest
        };
    }
);
