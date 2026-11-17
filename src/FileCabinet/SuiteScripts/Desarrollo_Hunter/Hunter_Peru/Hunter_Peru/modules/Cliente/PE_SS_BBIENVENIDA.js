/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/error', 'N/search', 'N/email', 'N/file', 'N/runtime', 'N/query'],
    function (record, log, error, search, email, file, runtime, query) {

        /**
         * Función que se ejecuta cuando se inicia el script programado
         * @param {Object} context - Contexto de ejecución
         */
        function execute(context) {
            try {
                // Obtener el ID del registro temporal desde los parámetros
                var tempRecordId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_temp_record_id'
                });

                log.debug({
                    title: 'Iniciando procesamiento',
                    details: 'Registro temporal ID: ' + tempRecordId
                });

                // Cargar el registro temporal
                var tempRecord = record.load({
                    type: 'customrecord_pe_temp_data_process',
                    id: tempRecordId,
                    isDynamic: true
                });

                // Actualizar estado a "procesando"
                tempRecord.setValue({
                    fieldId: 'custrecord_pe_temp_status',
                    value: 'processing'
                });

                tempRecord.save();

                // Obtener los datos JSON
                var dataJson = tempRecord.getValue({
                    fieldId: 'custrecord_pe_temp_data_json'
                });

                var data = JSON.parse(dataJson);

                // Procesar los registros
                var results = processBulkInsert(data.records);

                // Enviar correo con resultados
                sendResultsEmail(results, data.emailRecipients);

                // Actualizar estado del registro temporal a "completado"
                tempRecord = record.load({
                    type: 'customrecord_pe_temp_data_process',
                    id: tempRecordId,
                    isDynamic: true
                });

                tempRecord.setValue({
                    fieldId: 'custrecord_pe_temp_status',
                    value: 'completed'
                });

                tempRecord.setValue({
                    fieldId: 'custrecord_pe_temp_result_summary',
                    value: JSON.stringify(results.summary)
                });

                tempRecord.save();

                log.debug({
                    title: 'Procesamiento completado',
                    details: 'Total: ' + results.summary.total + ', Éxitos: ' + results.summary.success +
                        ', Duplicados: ' + results.summary.duplicates + ', Errores: ' + results.summary.error
                });

            } catch (e) {
                log.error({
                    title: 'Error en ejecución programada',
                    details: e.message
                });

                // Actualizar estado del registro temporal a "error"
                if (tempRecordId) {
                    try {
                        var tempRecord = record.load({
                            type: 'customrecord_pe_temp_data_process',
                            id: tempRecordId,
                            isDynamic: true
                        });

                        tempRecord.setValue({
                            fieldId: 'custrecord_pe_temp_status',
                            value: 'error'
                        });

                        tempRecord.setValue({
                            fieldId: 'custrecord_pe_temp_error_msg',
                            value: e.message
                        });

                        tempRecord.save();
                    } catch (loadError) {
                        log.error({
                            title: 'Error al actualizar registro temporal',
                            details: loadError.message
                        });
                    }
                }
            }
        }

        /**
         * Verifica si un registro es duplicado usando SuiteQL para optimizar la búsqueda
         * @param {Object} recordData - Datos del registro a verificar
         * @returns {Object} Resultado de la verificación
         */
        function checkDuplicate(recordData) {
            try {
                // Obtener la fecha de hace 3 días
                var threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

                // Formatear fecha para SuiteQL (YYYY-MM-DD)
                var formattedDate = threeDaysAgo.toISOString().split('T')[0];

                // Consulta SuiteQL para verificar duplicados
                var sqlQuery = `
                    SELECT id
                    FROM customrecord_pe_ht_gestion_bienvenida
                    WHERE custrecord_pe_gb_bien = ?
                    AND custrecord_pe_gb_cliente = ?
                    AND custrecord_pe_gb_os = ?
                    AND to_char(created, 'YYYY-MM-DD') >= ?
                    LIMIT 1
                `;

                // Ejecutar consulta
                var queryResults = query.runSuiteQL({
                    query: sqlQuery,
                    params: [
                        recordData.custrecord_pe_gb_bien,
                        recordData.custrecord_pe_gb_cliente,
                        recordData.custrecord_pe_gb_os,
                        formattedDate
                    ]
                });

                // Obtener resultados como objeto
                var results = queryResults.asMappedResults();

                // Si hay resultados, hay un duplicado
                if (results && results.length > 0) {
                    return {
                        isDuplicate: true,
                        duplicateId: results[0].id
                    };
                }

                return {
                    isDuplicate: false
                };
            } catch (e) {
                log.error({
                    title: 'Error verificando duplicados con SuiteQL',
                    details: e.message
                });

                // Fallback a búsqueda estándar si SuiteQL falla
                try {
                    // Obtener la fecha de hace 3 días
                    var threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

                    // Crear búsqueda para verificar duplicados
                    var searchObj = search.create({
                        type: 'customrecord_pe_ht_gestion_bienvenida',
                        filters: [
                            ['custrecord_pe_gb_bien', 'is', recordData.custrecord_pe_gb_bien],
                            'AND',
                            ['custrecord_pe_gb_cliente', 'is', recordData.custrecord_pe_gb_cliente],
                            'AND',
                            ['custrecord_pe_gb_os', 'is', recordData.custrecord_pe_gb_os],
                            'AND',
                            ['created', 'onorafter', threeDaysAgo]
                        ],
                        columns: ['internalid']
                    });

                    // Ejecutar la búsqueda
                    var searchResult = searchObj.run().getRange({
                        start: 0,
                        end: 1
                    });

                    // Si hay resultados, hay un duplicado
                    if (searchResult && searchResult.length > 0) {
                        return {
                            isDuplicate: true,
                            duplicateId: searchResult[0].getValue('internalid')
                        };
                    }

                    return {
                        isDuplicate: false
                    };
                } catch (searchError) {
                    log.error({
                        title: 'Error en búsqueda de respaldo',
                        details: searchError.message
                    });

                    return {
                        isDuplicate: false,
                        error: e.message + " | " + searchError.message
                    };
                }
            }
        }

        /**
         * Procesa una inserción individual
         * @param {Object} recordData - Datos del registro a insertar
         * @returns {Object} Resultado de la operación
         */
        function processSingleInsert(recordData) {
            try {
                // Verificar duplicado
                var duplicateCheck = checkDuplicate(recordData);

                if (duplicateCheck.isDuplicate) {
                    return {
                        success: false,
                        isDuplicate: true,
                        message: 'Registro duplicado encontrado con ID: ' + duplicateCheck.duplicateId,
                        duplicateId: duplicateCheck.duplicateId,
                        data: recordData
                    };
                }

                // Crear nuevo registro
                var newRecord = record.create({
                    type: 'customrecord_pe_ht_gestion_bienvenida',
                    isDynamic: true
                });

                // Mapear los campos
                if (recordData.custrecord_pe_gb_bien) {
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_bien',
                        value: recordData.custrecord_pe_gb_bien
                    });
                }

                if (recordData.custrecord_pe_gb_cliente) {
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_cliente',
                        value: recordData.custrecord_pe_gb_cliente
                    });
                }

                if (recordData.custrecord_pe_gb_os) {
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_os',
                        value: recordData.custrecord_pe_gb_os
                    });
                }

                if (recordData.custrecord_pe_gb_os_auxiliar) {
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_os_auxiliar',
                        value: recordData.custrecord_pe_gb_os_auxiliar
                    });
                }

                if (recordData.custrecord_pe_gb_usr_carga) {
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_usr_carga',
                        value: recordData.custrecord_pe_gb_usr_carga
                    });
                }

                // Guardar el registro
                var recordId = newRecord.save();

                return {
                    success: true,
                    recordId: recordId,
                    message: 'Registro creado exitosamente',
                    data: recordData
                };
            } catch (e) {
                log.error({
                    title: 'Error en inserción individual',
                    details: e.message
                });

                return {
                    success: false,
                    message: 'Error al crear registro: ' + e.message,
                    code: e.name,
                    data: recordData
                };
            }
        }

        /**
         * Procesa inserciones masivas de forma optimizada
         * @param {Array} recordsArray - Array con los datos de los registros
         * @returns {Object} Resultados de la operación
         */
        function processBulkInsert(recordsArray) {
            var results = [];
            var successCount = 0;
            var errorCount = 0;
            var duplicateCount = 0;

            // Eliminar campo emailRecipients si existe en el array
            var cleanRecordsArray = [];
            for (var i = 0; i < recordsArray.length; i++) {
                var record = recordsArray[i];
                if (record.hasOwnProperty('emailRecipients')) {
                    continue; // Saltar este elemento si es el objeto de destinatarios
                }
                cleanRecordsArray.push(record);
            }

            // Procesar cada registro en el lote
            for (var i = 0; i < cleanRecordsArray.length; i++) {
                try {
                    var recordResult = processSingleInsert(cleanRecordsArray[i]);

                    if (recordResult.success) {
                        successCount++;
                    } else if (recordResult.isDuplicate) {
                        duplicateCount++;
                    } else {
                        errorCount++;
                    }

                    // Agregar detalles al resultado
                    results.push({
                        index: i,
                        success: recordResult.success,
                        isDuplicate: recordResult.isDuplicate || false,
                        recordId: recordResult.recordId || null,
                        duplicateId: recordResult.duplicateId || null,
                        message: recordResult.message,
                        data: cleanRecordsArray[i]
                    });

                } catch (e) {
                    results.push({
                        index: i,
                        success: false,
                        message: 'Error al procesar registro: ' + e.message,
                        data: cleanRecordsArray[i]
                    });
                    errorCount++;
                }
            }

            // Devolver resultado final
            return {
                success: errorCount === 0,
                summary: {
                    total: cleanRecordsArray.length,
                    success: successCount,
                    error: errorCount,
                    duplicates: duplicateCount
                },
                details: results
            };
        }

        /**
         * Genera un archivo CSV con los resultados y envía un correo
         * @param {Object} results - Resultados de las operaciones
         * @param {Array} recipients - Destinatarios del correo
         */
        function sendResultsEmail(results, recipients) {
            try {
                // Generar contenido CSV
                var csvContent = 'Índice,Estado,ID Generado,Mensaje,Bien,Cliente,OS,OS Auxiliar,Usuario Carga\n';

                // Agregar cada registro al CSV
                for (var i = 0; i < results.details.length; i++) {
                    var detail = results.details[i];
                    var index = (detail.index !== undefined ? detail.index + 1 : i + 1);
                    var estado = detail.success ? 'ÉXITO' : (detail.isDuplicate ? 'DUPLICADO' : 'ERROR');
                    var recordId = detail.success ? detail.recordId : (detail.isDuplicate ? detail.duplicateId : '');
                    var message = detail.message ? detail.message.replace(/,/g, ' ') : ''; // Reemplazar comas para no afectar el CSV

                    // Datos del registro
                    var data = detail.data || {};
                    var bien = data.custrecord_pe_gb_bien || '';
                    var cliente = data.custrecord_pe_gb_cliente || '';
                    var os = data.custrecord_pe_gb_os || '';
                    var osAuxiliar = data.custrecord_pe_gb_os_auxiliar || '';
                    var usrCarga = data.custrecord_pe_gb_usr_carga || '';

                    // Crear línea CSV
                    csvContent += index + ',' + estado + ',' + recordId + ',' + message + ',' +
                        bien + ',' + cliente + ',' + os + ',' + osAuxiliar + ',' + usrCarga + '\n';
                }

                // Crear archivo CSV
                var fileObj = file.create({
                    name: 'Resultados_Insercion_' + new Date().getTime() + '.csv',
                    fileType: file.Type.CSV,
                    contents: csvContent
                });

                // Obtener fecha y hora actual
                var now = new Date();
                var dateTimeStr = now.toLocaleString();

                // Crear el cuerpo del correo
                var emailBody = '<h2>Reporte de Inserción de Registros</h2>';
                emailBody += '<p><strong>Fecha y hora:</strong> ' + dateTimeStr + '</p>';
                emailBody += '<p><strong>Total de registros:</strong> ' + results.summary.total + '</p>';
                emailBody += '<p><strong>Registros exitosos:</strong> ' + results.summary.success + '</p>';
                emailBody += '<p><strong>Registros duplicados:</strong> ' + results.summary.duplicates + '</p>';
                emailBody += '<p><strong>Registros con error:</strong> ' + results.summary.error + '</p>';
                emailBody += '<p>Se adjunta archivo CSV con los detalles.</p>';

                // Enviar correo
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: recipients,
                    subject: 'Reporte de Inserción en Gestión Bienvenida: ' + results.summary.success + ' éxitos, ' +
                        results.summary.duplicates + ' duplicados, ' + results.summary.error + ' errores',
                    body: emailBody,
                    attachments: [fileObj]
                });

                log.debug({
                    title: 'Correo enviado',
                    details: 'Destinatarios: ' + recipients.join(', ')
                });

                return true;
            } catch (e) {
                log.error({
                    title: 'Error al enviar correo',
                    details: e.message
                });
                return false;
            }
        }

        return {
            execute: execute
        };
    });