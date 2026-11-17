/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log', 'N/search', 'N/email', 'N/file', 'N/runtime', 'N/query'], function (record, log, search, email, file, runtime, query) {

    /**
    * Obtiene los datos del parámetro de entrada - Versión actualizada
    * Modificado para aceptar diferentes estructuras de datos
    */
    function getInputData(context) {
        try {
            // Obtener el parámetro
            var scriptObj = runtime.getCurrentScript();
            var paramsString = scriptObj.getParameter({ name: 'custscript_pe_input_data' });

            log.debug({
                title: 'Parámetros recibidos en getInputData (raw)',
                details: paramsString || 'null o undefined'
            });

            if (!paramsString) {
                log.error({
                    title: 'No se recibieron datos',
                    details: 'El parámetro custscript_pe_input_data está vacío'
                });
                return [];
            }

            // Intentar parsear el JSON con manejo de errores mejorado
            var inputData;
            try {
                inputData = JSON.parse(paramsString);
            } catch (parseError) {
                log.error({
                    title: 'Error al parsear JSON',
                    details: parseError.message + '\nDatos recibidos: ' + paramsString
                });
                return [{
                    isErrorPlaceholder: true,
                    error: 'Error al parsear JSON: ' + parseError.message
                }];
            }

            log.debug({
                title: 'Datos parseados',
                details: JSON.stringify(inputData)
            });

            // Validar la estructura de datos con más detalle
            if (!inputData) {
                return [{
                    isErrorPlaceholder: true,
                    error: 'Los datos JSON parseados son null o undefined'
                }];
            }

            if (!inputData.records) {
                log.error({
                    title: 'Estructura incorrecta',
                    details: 'No se encontró el campo "records" en los datos: ' + JSON.stringify(inputData)
                });
                return [{
                    isErrorPlaceholder: true,
                    error: 'No se encontró el campo "records" en los datos'
                }];
            }

            if (!Array.isArray(inputData.records)) {
                log.error({
                    title: 'Estructura incorrecta',
                    details: '"records" no es un array: ' + typeof inputData.records
                });
                return [{
                    isErrorPlaceholder: true,
                    error: '"records" no es un array sino un ' + typeof inputData.records
                }];
            }

            if (inputData.records.length === 0) {
                log.error({
                    title: 'Sin registros',
                    details: 'El array "records" está vacío'
                });
                return [{
                    isErrorPlaceholder: true,
                    error: 'El array "records" está vacío'
                }];
            }

            log.debug({
                title: 'Records encontrados',
                details: inputData.records.length
            });

            // Añadir información adicional a cada registro
            return inputData.records.map(function (record, index) {
                return {
                    recordData: record,
                    index: index,
                    emailRecipients: inputData.emailRecipients || [],
                    isMassiveLoad: true // Siempre procesar como carga masiva para enviar correo
                };
            });
        } catch (e) {
            log.error({
                title: 'Error fatal en getInputData',
                details: e.message + '\n' + e.stack
            });

            return [{
                isErrorPlaceholder: true,
                error: e.message
            }];
        }
    }

    /**
     * Obtiene los datos de la orden de servicio usando SuiteQL
     * @param {String} orderId - ID de la orden de servicio
     * @returns {Object} Datos de la orden o null si no se encuentra
     */
    function getServiceOrderData(orderId) {
        try {
            var sqlQuery = `
                SELECT 
                    so.entity as custrecord_pe_gb_cliente,
                    so.custbody_ht_so_bien as custrecord_pe_gb_bien,
                    so.tranid as custrecord_pe_gb_os_auxiliar
                FROM 
                    transaction so
                WHERE
                    so.id = ?
            `;

            var queryResults = query.runSuiteQL({
                query: sqlQuery,
                params: [orderId]
            });

            var results = queryResults.asMappedResults();

            if (results && results.length > 0) {
                return results[0];
            } else {
                return null;
            }
        } catch (e) {
            log.error({
                title: 'Error al obtener datos de orden de servicio',
                details: 'Order ID: ' + orderId + ', Error: ' + e.message
            });
            return null;
        }
    }

    /**
     * Verifica si un registro ya existe basado en custrecord_pe_gb_os
     * @param {String} orderId - ID de la orden de servicio
     * @returns {Object} Resultado de la verificación
     */
    function checkExistingRecord(orderId) {
        try {
            var searchObj = search.create({
                type: 'customrecord_pe_ht_gestion_bienvenida',
                filters: [
                    ['custrecord_pe_gb_os', 'is', orderId]
                ],
                columns: ['internalid']
            });

            var searchResult = searchObj.run().getRange({
                start: 0,
                end: 1
            });

            if (searchResult && searchResult.length > 0) {
                return {
                    exists: true,
                    recordId: searchResult[0].getValue('internalid')
                };
            } else {
                return {
                    exists: false
                };
            }
        } catch (e) {
            log.error({
                title: 'Error verificando registro existente',
                details: e.message
            });
            return {
                exists: false,
                error: e.message
            };
        }
    }

    /**
     * Procesa cada registro en la fase de Map
     * @param {Object} context - Contexto de ejecución
     */
    function map(context) {
        try {
            var recordData = JSON.parse(context.value);

            log.debug({
                title: 'Datos recibidos en map',
                details: JSON.stringify(recordData)
            });

            // Si es un placeholder de error, solo registrar y continuar
            if (recordData.isErrorPlaceholder) {
                context.write({
                    key: 'error_placeholder',
                    value: JSON.stringify({
                        success: false,
                        message: 'Error en getInputData: ' + recordData.error,
                        emailRecipients: recordData.emailRecipients || []
                    })
                });
                return;
            }

            // Procesar el registro
            var data = recordData.recordData;
            var emailRecipients = recordData.emailRecipients || [];

            // Validar campos requeridos
            if (!data.custrecord_pe_gb_os) {
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: false,
                        message: 'Error: No se proporcionó custrecord_pe_gb_os',
                        data: data,
                        index: recordData.index,
                        emailRecipients: emailRecipients,
                        operation: 'validation_error'
                    })
                });
                return;
            }

            // Variables para los documentos e IDs de empleados
            var usrCargaDoc = data.custrecord_pe_gb_usr_carga || '';
            var ejeAsignadoDoc = data.custrecord_pe_gb_eje_asignado || '';
            var usrCargaOrigin = data.custrecord_pe_gb_usr_carga;
            var ejeAsignadoOrigin = data.custrecord_pe_gb_eje_asignado;
            var usrCargaId = null;
            var ejeAsignadoId = null;
            var errorMsg = '';

            // Buscar ID de usuario de carga
            if (usrCargaDoc) {
                usrCargaId = getEmployebyDocument(usrCargaDoc);
                if (!usrCargaId) {
                    errorMsg = 'Error: No se encontró empleado con documento ' + usrCargaDoc + ' para Usuario de Carga';
                }
            } else {
                errorMsg = 'Error: No se proporcionó número de documento para Usuario de Carga';
            }

            // Si hay error en usuario de carga, reportar y terminar
            if (errorMsg) {
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: false,
                        message: errorMsg,
                        data: data,
                        index: recordData.index,
                        emailRecipients: emailRecipients,
                        usrCargaDoc: usrCargaOrigin,
                        ejeAsignadoDoc: ejeAsignadoOrigin,
                        operation: 'employee_error'
                    })
                });
                return;
            }

            // Buscar ID de ejecutivo asignado
            if (ejeAsignadoDoc) {
                ejeAsignadoId = getEmployebyDocument(ejeAsignadoDoc);
                if (!ejeAsignadoId) {
                    errorMsg = 'Error: No se encontró empleado con documento ' + ejeAsignadoDoc + ' para Ejecutivo Asignado';
                }
            } else {
                errorMsg = 'Error: No se proporcionó número de documento para Ejecutivo Asignado';
            }

            // Si hay error en ejecutivo asignado, reportar y terminar
            if (errorMsg) {
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: false,
                        message: errorMsg,
                        data: data,
                        index: recordData.index,
                        emailRecipients: emailRecipients,
                        usrCargaDoc: usrCargaDoc,
                        ejeAsignadoDoc: ejeAsignadoOrigin,
                        usrCargaId: usrCargaOrigin,
                        operation: 'employee_error'
                    })
                });
                return;
            }

            // Obtener datos de la orden de servicio
            var serviceOrderData = getServiceOrderData(data.custrecord_pe_gb_os);
            if (!serviceOrderData) {
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: false,
                        message: 'Error: No se encontró la orden de servicio con ID ' + data.custrecord_pe_gb_os,
                        data: data,
                        index: recordData.index,
                        emailRecipients: emailRecipients,
                        usrCargaDoc: usrCargaDoc,
                        ejeAsignadoDoc: ejeAsignadoOrigin,
                        operation: 'service_order_error'
                    })
                });
                return;
            }

            // Verificar si el registro ya existe
            var existingRecord = checkExistingRecord(data.custrecord_pe_gb_os);

            try {
                var recordId;
                var operation;
                var message;

                if (existingRecord.exists) {
                    // ACTUALIZAR registro existente
                    var updateRecord = record.load({
                        type: 'customrecord_pe_ht_gestion_bienvenida',
                        id: existingRecord.recordId,
                        isDynamic: true
                    });

                    // Actualizar solo los campos permitidos
                    updateRecord.setValue({
                        fieldId: 'custrecord_pe_gb_cliente',
                        value: serviceOrderData.custrecord_pe_gb_cliente
                    });
                    updateRecord.setValue({
                        fieldId: 'custrecord_pe_gb_bien',
                        value: serviceOrderData.custrecord_pe_gb_bien
                    });
                    updateRecord.setValue({
                        fieldId: 'custrecord_pe_gb_os_auxiliar',
                        value: serviceOrderData.custrecord_pe_gb_os_auxiliar
                    });
                    updateRecord.setValue({
                        fieldId: 'custrecord_pe_gb_eje_asignado',
                        value: ejeAsignadoId
                    });
                    // También actualizar usuario de carga
                    updateRecord.setValue({
                        fieldId: 'custrecord_pe_gb_usr_carga',
                        value: usrCargaId
                    });

                    recordId = updateRecord.save();
                    operation = 'update';
                    message = 'Registro actualizado con éxito';

                } else {
                    // CREAR nuevo registro
                    var newRecord = record.create({
                        type: 'customrecord_pe_ht_gestion_bienvenida',
                        isDynamic: true
                    });

                    // Asignar todos los valores al registro
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_os',
                        value: data.custrecord_pe_gb_os
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_cliente',
                        value: serviceOrderData.custrecord_pe_gb_cliente
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_bien',
                        value: serviceOrderData.custrecord_pe_gb_bien
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_os_auxiliar',
                        value: serviceOrderData.custrecord_pe_gb_os_auxiliar
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_usr_carga',
                        value: usrCargaId
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_pe_gb_eje_asignado',
                        value: ejeAsignadoId
                    });

                    // Asignar cualquier otro campo que esté en los datos originales
                    for (var fieldId in data) {
                        if (data.hasOwnProperty(fieldId) && 
                            fieldId !== 'custrecord_pe_gb_os' &&
                            fieldId !== 'custrecord_pe_gb_cliente' &&
                            fieldId !== 'custrecord_pe_gb_bien' &&
                            fieldId !== 'custrecord_pe_gb_os_auxiliar' &&
                            fieldId !== 'custrecord_pe_gb_usr_carga' &&
                            fieldId !== 'custrecord_pe_gb_eje_asignado' &&
                            fieldId !== 'emailRecipients') {
                            newRecord.setValue({
                                fieldId: fieldId,
                                value: data[fieldId]
                            });
                        }
                    }

                    recordId = newRecord.save();
                    operation = 'create';
                    message = 'Registro creado con éxito';
                }

                log.debug({
                    title: 'Operación completada',
                    details: operation + ' - ID: ' + recordId + ' - OS: ' + data.custrecord_pe_gb_os
                });

                // Reportar éxito
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: true,
                        recordId: recordId,
                        operation: operation,
                        message: message,
                        data: {
                            custrecord_pe_gb_os: data.custrecord_pe_gb_os,
                            custrecord_pe_gb_cliente: serviceOrderData.custrecord_pe_gb_cliente,
                            custrecord_pe_gb_bien: serviceOrderData.custrecord_pe_gb_bien,
                            custrecord_pe_gb_os_auxiliar: serviceOrderData.custrecord_pe_gb_os_auxiliar
                        },
                        usrCargaId: usrCargaId,
                        ejeAsignadoId: ejeAsignadoId,
                        usrCargaDoc: usrCargaOrigin,
                        ejeAsignadoDoc: ejeAsignadoOrigin,
                        index: recordData.index,
                        emailRecipients: emailRecipients
                    })
                });

            } catch (recordError) {
                // Reportar error al crear/actualizar el registro
                context.write({
                    key: 'result_' + recordData.index,
                    value: JSON.stringify({
                        success: false,
                        message: 'Error al ' + (existingRecord.exists ? 'actualizar' : 'crear') + ' el registro: ' + recordError.message,
                        data: data,
                        usrCargaDoc: usrCargaDoc,
                        ejeAsignadoDoc: ejeAsignadoOrigin,
                        index: recordData.index,
                        emailRecipients: emailRecipients,
                        operation: existingRecord.exists ? 'update_error' : 'create_error'
                    })
                });
            }

        } catch (e) {
            log.error({
                title: 'Error en map',
                details: e.message
            });

            // Error general: escribir al contexto con estado de error
            context.write({
                key: 'error_unknown',
                value: JSON.stringify({
                    success: false,
                    message: 'Error durante el procesamiento: ' + e.message,
                    operation: 'unknown_error'
                })
            });
        }
    }

    /**
     * Procesa los resultados finales en la fase de Reduce
     * @param {Object} context - Contexto de ejecución
     */
    function reduce(context) {
        try {
            var values = context.values;
            var results = [];
            var emailRecipients = [];

            // Procesar todos los resultados
            for (var i = 0; i < values.length; i++) {
                var resultObj = JSON.parse(values[i]);
                results.push(resultObj);

                // Capturar los destinatarios de correo si existen
                if (resultObj.emailRecipients && resultObj.emailRecipients.length > 0) {
                    // Agregar nuevos destinatarios que no estén ya en la lista
                    resultObj.emailRecipients.forEach(function (recipient) {
                        if (emailRecipients.indexOf(recipient) === -1) {
                            emailRecipients.push(recipient);
                        }
                    });
                }
            }

            // Guardar los resultados y destinatarios para la fase de summarize
            context.write({
                key: 'results',
                value: JSON.stringify({
                    details: results,
                    emailRecipients: emailRecipients
                })
            });

            // Agregar un registro adicional para asegurar que hay datos
            context.write({
                key: 'status',
                value: JSON.stringify({
                    processed: true,
                    timestamp: new Date().getTime()
                })
            });
        } catch (e) {
            log.error({
                title: 'Error en reduce',
                details: e.message
            });

            // Asegurar que siempre haya algún resultado
            context.write({
                key: 'error_in_reduce',
                value: JSON.stringify({
                    success: false,
                    message: 'Error en reduce: ' + e.message,
                    operation: 'reduce_error'
                })
            });
        }
    }

    /**
     * Finaliza el proceso y envía el correo con los resultados
     * @param {Object} context - Contexto de ejecución
     */
    function summarize(context) {
        try {
            // Obtener los resultados
            var resultsData = [];
            var emailRecipients = [];
            var hasProcessedData = false;
            var allResults = []; // Acumulador para todos los resultados

            // Recopilar todos los resultados
            context.output.iterator().each(function (key, value) {
                if (key === 'results') {
                    var data = JSON.parse(value);
                    resultsData = data.details || [];
                    allResults = allResults.concat(resultsData);

                    // Agregar destinatarios de correo sin duplicados
                    if (data.emailRecipients && Array.isArray(data.emailRecipients)) {
                        data.emailRecipients.forEach(function (recipient) {
                            if (emailRecipients.indexOf(recipient) === -1) {
                                emailRecipients.push(recipient);
                            }
                        });
                    }

                    hasProcessedData = true;
                } else if (key === 'status') {
                    hasProcessedData = JSON.parse(value).processed || false;
                } else if (key === 'error_in_reduce' || key === 'error_unknown' || key === 'error_placeholder') {
                    // Capturar errores para incluirlos en el informe
                    var errorData = JSON.parse(value);
                    allResults.push(errorData);

                    // Agregar destinatarios de correo del error, si existen
                    if (errorData.emailRecipients && Array.isArray(errorData.emailRecipients)) {
                        errorData.emailRecipients.forEach(function (recipient) {
                            if (emailRecipients.indexOf(recipient) === -1) {
                                emailRecipients.push(recipient);
                            }
                        });
                    }

                    hasProcessedData = true;
                }
                return true;
            });

            // Si no hay resultados, crear un resultado por defecto
            if (!hasProcessedData || allResults.length === 0) {
                log.warn({
                    title: 'No hay resultados para procesar en summarize',
                    details: 'Creando un informe con información limitada'
                });

                allResults = [{
                    success: false,
                    message: 'No se procesaron datos. Posible problema en las fases map o reduce.',
                    operation: 'no_data'
                }];
            }

            // Contadores
            var successCount = 0;
            var errorCount = 0;
            var createCount = 0;
            var updateCount = 0;
            var employeeErrorCount = 0;
            var serviceOrderErrorCount = 0;
            var otherErrorCount = 0;

            // Contar resultados por tipo
            for (var i = 0; i < allResults.length; i++) {
                var result = allResults[i];
                if (result.success) {
                    successCount++;
                    if (result.operation === 'create') {
                        createCount++;
                    } else if (result.operation === 'update') {
                        updateCount++;
                    }
                } else {
                    errorCount++;
                    if (result.operation === 'employee_error') {
                        employeeErrorCount++;
                    } else if (result.operation === 'service_order_error') {
                        serviceOrderErrorCount++;
                    } else {
                        otherErrorCount++;
                    }
                }
            }

            // Preparar el resumen
            var summary = {
                total: allResults.length,
                success: successCount,
                error: errorCount,
                created: createCount,
                updated: updateCount,
                employeeErrors: employeeErrorCount,
                serviceOrderErrors: serviceOrderErrorCount,
                otherErrors: otherErrorCount
            };

            // Si no hay destinatarios en el contexto, intentar obtenerlos del parámetro de entrada
            if (!emailRecipients || emailRecipients.length === 0) {
                try {
                    var scriptObj = runtime.getCurrentScript();
                    var inputDataStr = scriptObj.getParameter({ name: 'custscript_pe_input_data' });

                    if (inputDataStr) {
                        var inputData = JSON.parse(inputDataStr);
                        if (inputData.emailRecipients && Array.isArray(inputData.emailRecipients)) {
                            emailRecipients = inputData.emailRecipients;
                        }
                    }
                } catch (e) {
                    log.error({
                        title: 'Error al obtener destinatarios de correo',
                        details: e.message
                    });
                }
            }

            if (!emailRecipients || emailRecipients.length === 0) {
                emailRecipients = ["grupodesarrollo@hunter.com.pe"];

                log.debug({
                    title: 'Usando destinatarios por defecto',
                    details: JSON.stringify(emailRecipients)
                });
            }

            log.debug({
                title: 'Destinatarios de correo',
                details: JSON.stringify(emailRecipients)
            });

            // SIEMPRE enviar correo
            var emailSent = sendResultsEmail({
                summary: summary,
                details: allResults
            }, emailRecipients);

            log.debug({
                title: 'Procesamiento completado con envío de correo',
                details: 'Total: ' + summary.total + ', Éxitos: ' + summary.success +
                    ', Creados: ' + summary.created + ', Actualizados: ' + summary.updated +
                    ', Errores: ' + summary.error + ', Correo enviado: ' + emailSent
            });

        } catch (e) {
            log.error({
                title: 'Error en summarize',
                details: e.message + '\n' + e.stack
            });

            // Intentar enviar un correo de error como último recurso
            try {
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: ["grupodesarrollo@hunter.com.pe"],
                    subject: 'ERROR CRÍTICO en proceso de Gestión Bienvenida',
                    body: 'Se ha producido un error en la fase summarize: ' + e.message + '\n\n' + e.stack
                });
            } catch (emailError) {
                log.error({
                    title: 'Error al enviar correo de error',
                    details: emailError.message
                });
            }
        }
    }

    function getEmployebyDocument(document) {
        try {
            var searchObj = search.create({
                type: 'employee',
                filters: [
                    ['custentity_pe_document_number', 'is', document]
                ],
                columns: ['internalid']
            });

            var searchResult = searchObj.run().getRange({
                start: 0,
                end: 1
            });

            if (searchResult && searchResult.length > 0) {
                return searchResult[0].getValue('internalid');
            } else {
                return null;
            }
        } catch (e) {
            log.error({
                title: 'Error al buscar empleado por documento',
                details: e.message
            });
            return null;
        }
    }

    /**
     * Genera un archivo CSV con los resultados y envía un correo
     * @param {Object} results - Resultados de las operaciones
     * @param {Array} recipients - Destinatarios del correo
     * @returns {Boolean} Éxito del envío
     */
    function sendResultsEmail(results, recipients) {
        try {
            // Generar contenido CSV con campos modificados
            var csvContent = 'Índice,Estado,Operación,ID Generado,Mensaje,OS ID,OS Auxiliar,Cliente,Bien,Usuario Carga Doc,Ejecutivo Asignado Doc,Fecha Procesamiento\n';

            var now = new Date();

            // Restar 5 horas para convertir UTC → Lima (UTC-5)
            var limaDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));

            // Formatear a 'YYYY-MM-DD HH:mm:ss'
            function formatDateToString(date) {
                var yyyy = date.getFullYear();
                var mm = String(date.getMonth() + 1).padStart(2, '0');
                var dd = String(date.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            var dateTimeStr = formatDateToString(limaDate);
            log.debug('Fecha/Hora Lima', dateTimeStr);

            // Agregar cada registro al CSV con información mejorada
            for (var i = 0; i < results.details.length; i++) {
                var detail = results.details[i];
                var index = (detail.index !== undefined ? detail.index + 1 : i + 1);
                var estado = detail.success ? 'EXITO' : 'ERROR';
                var operacion = detail.operation || 'unknown';
                var recordId = detail.success ? detail.recordId : '';
                var message = detail.message ? detail.message.replace(/,/g, ' ') : '';

                // Datos del registro
                var data = detail.data || {};
                var osId = data.custrecord_pe_gb_os || '';
                var osAuxiliar = data.custrecord_pe_gb_os_auxiliar || '';
                var cliente = data.custrecord_pe_gb_cliente || '';
                var bien = data.custrecord_pe_gb_bien || '';

                // Información de Usuario Carga y Ejecutivo Asignado (solo documentos, no IDs)
                var usrCargaDoc = detail.usrCargaDoc || '';
                var ejeAsignadoDoc = detail.ejeAsignadoDoc || '';

                // Fecha procesamiento
                var fechaProceso = dateTimeStr;

                // Crear línea CSV
                csvContent += index + ',' + estado + ',' + operacion + ',' + recordId + ',' + message + ',' +
                    osId + ',' + osAuxiliar + ',' + cliente + ',' + bien + ',' +
                    usrCargaDoc + ',' + ejeAsignadoDoc + ',' + fechaProceso + '\n';
            }

            // Crear archivo CSV con BOM para Excel
            var bomPrefix = '\ufeff'; // BOM para UTF-8
            var fileObj = file.create({
                name: 'Resultados_Gestion_Bienvenida_' + now.getTime() + '.csv',
                fileType: file.Type.CSV,
                contents: bomPrefix + csvContent
            });

            // Crear el cuerpo del correo con información más detallada
            var emailBody = '<h2>Reporte de Gestión de Bienvenida - Creación y Actualización</h2>';
            emailBody += '<p><strong>Fecha y hora:</strong> ' + now.toLocaleString() + '</p>';
            emailBody += '<h3>Resumen:</h3>';
            emailBody += '<table border="1" cellpadding="4" style="border-collapse: collapse;">';
            emailBody += '<tr style="background-color: #f2f2f2;"><th>Tipo</th><th>Cantidad</th></tr>';
            emailBody += '<tr><td>Total de registros procesados</td><td align="center">' + results.summary.total + '</td></tr>';
            emailBody += '<tr><td>Registros exitosos</td><td align="center" style="color: green;">' + results.summary.success + '</td></tr>';
            emailBody += '<tr><td>&nbsp;&nbsp;- Registros creados</td><td align="center" style="color: blue;">' + results.summary.created + '</td></tr>';
            emailBody += '<tr><td>&nbsp;&nbsp;- Registros actualizados</td><td align="center" style="color: blue;">' + results.summary.updated + '</td></tr>';
            emailBody += '<tr><td>Errores totales</td><td align="center" style="color: red;">' + results.summary.error + '</td></tr>';
            emailBody += '<tr><td>&nbsp;&nbsp;- Errores por empleado no encontrado</td><td align="center" style="color: red;">' + results.summary.employeeErrors + '</td></tr>';
            emailBody += '<tr><td>&nbsp;&nbsp;- Errores por orden de servicio no encontrada</td><td align="center" style="color: red;">' + results.summary.serviceOrderErrors + '</td></tr>';
            emailBody += '<tr><td>&nbsp;&nbsp;- Otros errores</td><td align="center" style="color: red;">' + results.summary.otherErrors + '</td></tr>';
            emailBody += '</table>';

            emailBody += '<h3>Notas:</h3>';
            emailBody += '<ul>';
            emailBody += '<li><strong>Creación:</strong> Se crea un nuevo registro cuando no existe ningún registro con el mismo custrecord_pe_gb_os.</li>';
            emailBody += '<li><strong>Actualización:</strong> Se actualiza un registro existente cuando ya existe un registro con el mismo custrecord_pe_gb_os.</li>';
            emailBody += '<li><strong>Campos actualizados:</strong> custrecord_pe_gb_cliente, custrecord_pe_gb_bien, custrecord_pe_gb_os_auxiliar, custrecord_pe_gb_eje_asignado, custrecord_pe_gb_usr_carga.</li>';
            emailBody += '<li><strong>Datos de orden:</strong> Los campos de cliente, bien y OS auxiliar se obtienen automáticamente de la orden de servicio.</li>';
            emailBody += '<li><strong>Validación de empleados:</strong> Se verifica la existencia del empleado por documento antes de procesar el registro.</li>';
            emailBody += '</ul>';

            emailBody += '<p>Se adjunta archivo CSV con los detalles completos de todas las operaciones realizadas.</p>';

            // Determinar el asunto del correo
            var subject = 'Reporte Gestion Bienvenida: ';
            if (results.summary.success > 0) {
                subject += results.summary.success + ' exitos (' + results.summary.created + ' creados, ' + results.summary.updated + ' actualizados)';
            }
            if (results.summary.error > 0) {
                if (results.summary.success > 0) subject += ', ';
                subject += results.summary.error + ' errores';
            }

            // Enviar correo con asunto más descriptivo
            email.send({
                author: runtime.getCurrentUser().id,
                recipients: recipients,
                subject: subject,
                body: emailBody,
                attachments: [fileObj]
            });

            log.audit({
                title: 'Correo enviado',
                details: 'Destinatarios: ' + recipients.join(', ') +
                    ', Exitos: ' + results.summary.success +
                    ', Creados: ' + results.summary.created +
                    ', Actualizados: ' + results.summary.updated +
                    ', Errores: ' + results.summary.error
            });

            return true;
        } catch (e) {
            log.error({
                title: 'Error al enviar correo',
                details: e.message + '\n' + e.stack
            });

            // Intento de envío de correo de emergencia
            try {
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: ["grupodesarrollo@hunter.com.pe"],
                    subject: 'ERROR al generar reporte de Gestión Bienvenida',
                    body: 'Se produjo un error al generar el reporte: ' + e.message
                });
            } catch (emailError) {
                log.error({
                    title: 'Error en correo de emergencia',
                    details: emailError.message
                });
            }

            return false;
        }
    }

    // Exportar las funciones del Map/Reduce
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});