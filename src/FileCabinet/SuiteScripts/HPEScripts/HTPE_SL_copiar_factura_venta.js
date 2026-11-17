/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect', 'N/format', 'N/search', 'N/runtime', 'N/log'],
    (serverWidget, record, redirect, format, search, runtime, log) => {

        // =================================================================
        // IDs DE CUENTAS Y CAMPOS PERSONALIZADOS (¡VERIFICAR ESTOS VALORES!)
        // =================================================================
        const CUENTA_CR_MN = '4896'; // Crédito: 121201 Cuentas por Cobrar (Soles)
        const CUENTA_CR_ME = '4897'; // Crédito: 121202 Cuentas por Cobrar (Dólares)
        const CUENTA_DB_MN = '6825'; // Débito: 123103 Letras por Cobrar (Soles)
        const CUENTA_DB_ME = '6826'; // Débito: 123104 Letras por Cobrar (Dólares)
        
        const PE_DIARIO_VALOR_CXC = '7'; // ID del valor 'Cuentas por cobrar'
        const PE_FACTURA_RELACIONADA_COL_FIELD = 'custcol_fact_venta_relacionada'; // Campo PE Factura de Venta Relacionada
        const PE_TIPO_DIARIO_FIELD = 'custbody_pe_tipo_de_diario'; // Campo PE Tipo de Diario

        // --- Mapeo de Cuentas (ESTO YA NO SE USA, ELIMINADO PARA ESTE CASO DE USO) ---
        // const CURRENCY_ACCOUNT_MAP = { ... }; 
        // --------------------------------------------------------------------------

        function onRequest(context) {
            if (context.request.method === 'GET') {
                handleGet(context);
            } else {
                handlePost(context);
            }
        }

        /**
         * Maneja la petición GET: Muestra el formulario al usuario.
         */
        function handleGet(context) {
            const request = context.request;
            const originalId = request.parameters.originalId;
            const recordType = request.parameters.recordType;

            if (!originalId || !recordType) {
                 context.response.write('<html><body><h1>Error</h1><p>ID o Tipo de registro de la Factura no proporcionados.</p><script>window.close();</script></body></html>');
                 return;
            }

            // --- Cargar la factura para obtener detalles ---
            let originalCurrencyText = 'N/A';
            let originalCurrencyId = null;
            let originalTranId = 'N/A';

            try {
                const invoice = record.load({ type: recordType, id: originalId, isDynamic: false });
                originalCurrencyText = invoice.getText({ fieldId: 'currency' }) || 'No definida';
                originalCurrencyId = invoice.getValue({ fieldId: 'currency' });
                originalTranId = invoice.getValue({ fieldId: 'tranid' });

            } catch (e) {
                log.error({ title: 'ERROR al cargar Factura (GET)', details: `ID: ${originalId}, Error: ${e.message}` });
                context.response.write(`<html><body><h1>Error de Carga</h1><p>No se pudo cargar la Factura (${originalId}). Revise los logs del Suitelet.</p><script>window.close();</script></body></html>`);
                return;
            }


            const form = serverWidget.createForm({ title: `Canje de Letra para Factura: ${originalTranId}` });

            // Añadir campo informativo
            form.addFieldGroup({ id: 'custgrp_info', label: 'Información Original' });
            
            const currencyDisplayField = form.addField({
                id: 'custpage_original_currency_display',
                type: serverWidget.FieldType.TEXT,
                label: 'Moneda de la Factura',
                container: 'custgrp_info'
            });
            currencyDisplayField.defaultValue = originalCurrencyText;
            currencyDisplayField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
            
            // 1. Campos Ocultos para POST
            form.addField({ id: 'custpage_original_id', type: serverWidget.FieldType.TEXT, label: 'Original ID' })
                .defaultValue = originalId;
            form.addField({ id: 'custpage_record_type', type: serverWidget.FieldType.TEXT, label: 'Record Type' })
                .defaultValue = recordType;
            form.addField({ id: 'custpage_original_currency_id', type: serverWidget.FieldType.TEXT, label: 'Currency ID (Hidden)' })
                .defaultValue = originalCurrencyId;
            
            // 2. Campo para ingresar la Nueva Fecha (Obligatorio)
            form.addFieldGroup({ id: 'custgrp_date', label: 'Fecha de Contabilización' });
            const newDateTField = form.addField({
                id: 'custpage_new_trandate',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha del Asiento',
                container: 'custgrp_date'
            });
            newDateTField.isMandatory = true;
            newDateTField.defaultValue = format.format({
                value: new Date(),
                type: format.Type.DATE
            });

            form.addSubmitButton({ label: 'Generar Asiento' });
            form.addButton({ id: 'custpage_cancel', label: 'Cancelar', functionName: 'window.close()' });

            context.response.writePage(form);
        }

        /**
         * Maneja la petición POST: Crea el Asiento de Diario de Canje de Letra.
         */
        function handlePost(context) {
            const request = context.request;
            
            // Obtener los valores del formulario
            const originalId = request.parameters.custpage_original_id;
            const recordType = request.parameters.custpage_record_type;
            const newDateString = request.parameters.custpage_new_trandate;
            const originalCurrencyId = request.parameters.custpage_original_currency_id;
            
            try {
                // 1. Cargar la Factura de Venta Original
                const invoice = record.load({ type: recordType, id: originalId, isDynamic: false });

                // 2. Obtener datos clave de la factura
                const invoiceTotal = invoice.getValue({ fieldId: 'total' });
                const invoiceDocumentNumber = invoice.getValue({ fieldId: 'tranid' });
                const invoiceEntityId = invoice.getValue({ fieldId: 'entity' }); // Cliente

                // Obtener Segmentación (usa campos del cuerpo, o de la primera línea si los del cuerpo están vacíos)
                const invoiceDepartment = invoice.getValue({ fieldId: 'department' }) || invoice.getSublistValue({ sublistId: 'item', fieldId: 'department', line: 0 });
                const invoiceClass = invoice.getValue({ fieldId: 'class' }) || invoice.getSublistValue({ sublistId: 'item', fieldId: 'class', line: 0 });
                const invoiceLocation = invoice.getValue({ fieldId: 'location' }) || invoice.getSublistValue({ sublistId: 'item', fieldId: 'location', line: 0 });

                // 3. Determinar Cuentas por Moneda
                // --- CORRECCIÓN CRÍTICA: Usar runtime.getCurrentUser() para preferencias ---
                const currentUser = runtime.getCurrentUser();
                const baseCurrencyId = currentUser.getPreference({ name: 'BASE_CURRENCY_ID' }); 
                // --------------------------------------------------------------------------

                // Corregimos la comparación para manejar null/undefined de forma segura
                // Aseguramos que ambas variables existan antes de llamar a toString()
                const baseCurrencyStr = baseCurrencyId ? baseCurrencyId.toString() : '';
                const originalCurrencyStr = originalCurrencyId ? originalCurrencyId.toString() : '';

                const isBaseCurrency = (originalCurrencyStr === baseCurrencyStr);

                const cuentaCredito = isBaseCurrency ? CUENTA_CR_MN : CUENTA_CR_ME;
                const cuentaDebito = isBaseCurrency ? CUENTA_DB_MN : CUENTA_DB_ME;
                
                log.debug('Cuentas Seleccionadas', `MN/ME: ${isBaseCurrency ? 'MN' : 'ME'}. Débito: ${cuentaDebito}, Crédito: ${cuentaCredito}`);

                // 4. Crear el Asiento de Diario
                const journalEntry = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true
                });

                // 5. Configurar encabezado
                const postingDate = format.parse({ value: newDateString, type: format.Type.DATE });
                journalEntry.setValue({ fieldId: 'trandate', value: postingDate });
                journalEntry.setValue({ fieldId: 'currency', value: originalCurrencyId });

                log.error({ title: 'originalId', details: `originalId ${originalId}` });

                 
                // Campos Personalizados
                journalEntry.setValue({ fieldId: PE_TIPO_DIARIO_FIELD, value: PE_DIARIO_VALOR_CXC }); 
                const memoText = `Canje de letra de la Factura ${invoiceDocumentNumber}`;

                // >>>>>>>>>> CORRECCIÓN AQUÍ: Establecer el Memo en el Encabezado <<<<<<<<<<
                journalEntry.setValue({ 
                    fieldId: 'memo', 
                    value: memoText 
                });
                
                // 6. Línea de DÉBITO (Letras por Cobrar: 123103/123104)
                journalEntry.selectNewLine({ sublistId: 'line' });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: cuentaDebito });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: invoiceTotal });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: invoiceEntityId }); // Cliente
                
                // Segmentación
                if (invoiceDepartment) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: invoiceDepartment });
                if (invoiceClass) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: invoiceClass });
                if (invoiceLocation) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: invoiceLocation });

                // *** ASIGNACIÓN DEL CAMPO DE COLUMNA AQUÍ ***
                journalEntry.setCurrentSublistValue({ 
                     sublistId: 'line', 
                     fieldId: PE_FACTURA_RELACIONADA_COL_FIELD, 
                     value: originalId // ID Interno de la factura
                });
              
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memoText });
                journalEntry.commitLine({ sublistId: 'line' });

                // 7. Línea de CRÉDITO (Cuentas por Cobrar: 121201/121202)
                journalEntry.selectNewLine({ sublistId: 'line' });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: cuentaCredito });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: invoiceTotal });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: invoiceEntityId }); // Cliente
                
                // Segmentación
                if (invoiceDepartment) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: invoiceDepartment });
                if (invoiceClass) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: invoiceClass });
                if (invoiceLocation) journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: invoiceLocation });
                
                // *** ASIGNACIÓN DEL CAMPO DE COLUMNA AQUÍ ***
                journalEntry.setCurrentSublistValue({ 
                     sublistId: 'line', 
                     fieldId: PE_FACTURA_RELACIONADA_COL_FIELD, 
                     value: originalId // ID Interno de la factura
                });
              
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: memoText });
                journalEntry.commitLine({ sublistId: 'line' });


                // 8. Guardar y Redirigir
                const journalId = journalEntry.save();
                log.error({ title: 'ÉXITO', details: `Asiento ${journalId} (Canje Letra) creado para Factura ${originalId}` });

                //const redirectUrl = `/app/accounting/transactions/journalentry.nl?id=${journalId}&e=T`;

                const redirectUrl = `/app/accounting/transactions/transaction.nl?id=${journalId}&e=T`;

                // *** CORRECCIÓN: Usar setTimeout para evitar "asiento no existe" ***
                context.response.write(`
                    <html><body>
                    <script>
                        // Función para cerrar y redirigir con seguridad
                        function closeAndRedirect() {
                            if (window.opener && !window.opener.closed) {
                                // Redirige la ventana original al nuevo asiento
                                window.opener.location.href = '${redirectUrl}';
                            }
                            // Cierra la ventana emergente
                            window.close();
                        }
                        
                        // Esperamos 500ms para que NetSuite termine de procesar la transacción
                        setTimeout(closeAndRedirect, 2000); 
                    </script>
                    </body></html>
                `);
              
            } catch (e) {
                log.error({ title: 'Error al crear asiento (POST)', details: e.toString() });
                context.response.write(`<html><body><h1>Error al Crear Asiento</h1><p>Ocurrió un error: ${e.message}</p><script>window.opener.location.reload(); window.close();</script></body></html>`);
            }
        }

        return {
            onRequest
        };
    }
);