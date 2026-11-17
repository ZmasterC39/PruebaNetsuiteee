/**
 * CLIENT SCRIPT - Dynamic Broker Update
 * Actualiza el campo broker automáticamente cuando se cambia el bien seleccionado
 * Solo aplica para usuarios de subsidiaria 3
 * Valida forma de pago solo en formulario personalizado 188
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search', 'N/log', 'N/ui/message', 'N/runtime'], function(search, log, message, runtime) {
    
    function pageInit(context) {
        try {
            var currentUser = runtime.getCurrentUser();
            var userSubsidiary = currentUser.subsidiary;
            
            if (userSubsidiary != 3) {
                return;
            }
            
            var currentRecord = context.currentRecord;
            var bienId = currentRecord.getValue('custbody_ht_so_bien');
            
            if (bienId) {
                updateBrokerField(currentRecord, bienId);
            }
            
        } catch (error) {
            console.error('Error in pageInit:', error);
        }
    }
    
    function fieldChanged(context) {
        try {
            var currentUser = runtime.getCurrentUser();
            var userSubsidiary = currentUser.subsidiary;
            
            if (userSubsidiary != 3) {
                return;
            }
            
            var currentRecord = context.currentRecord;
            var fieldId = context.fieldId;
            
            if (fieldId === 'custbody_ht_so_bien') {
                var bienId = currentRecord.getValue('custbody_ht_so_bien');
                
                console.log('Bien field changed:', {
                    bienId: bienId
                });
                
                if (bienId) {
                    updateBrokerField(currentRecord, bienId);
                } else {
                    currentRecord.setValue({
                        fieldId: 'custbody_ht_os_broker',
                        value: ''
                    });
                    
                    console.log('Bien cleared - Broker field cleared');
                }
            }
            
        } catch (error) {
            console.error('Error in fieldChanged:', error);
        }
    }
    
function saveRecord(context) {
    try {
        var currentUser = runtime.getCurrentUser();
        var userSubsidiary = currentUser.subsidiary;
        
        if (userSubsidiary != 3) {
            return true;
        }
        
        var currentRecord = context.currentRecord;
        
        var customFormId = currentRecord.getValue('customform');
        console.log('Current custom form ID:', customFormId);
        
        // Solo para form 188
        if (customFormId == 188) {
            var userRole = currentUser.role;
            console.log('Current user role:', userRole);
            
            var formaPago = currentRecord.getValue('custbody_pe_os_forma_pago_sys');
            
            console.log('Validating forma de pago for custom form 188:', formaPago);
            
            if (!formaPago || formaPago === '' || formaPago === null || formaPago === undefined) {
                console.log('Validation failed: Forma de Pago is empty');
                
                alert('CAMPO OBLIGATORIO FALTANTE:\n\nEl campo "Forma de Pago" (custbody_pe_os_forma_pago_sys) es obligatorio y debe estar lleno antes de guardar.\n\nPor favor, complete este campo e intente guardar nuevamente.');
                
                try {
                    var errorMsg = message.create({
                        title: 'Campo Obligatorio Faltante',
                        message: 'El campo "Forma de Pago" es obligatorio y debe estar lleno.',
                        type: message.Type.ERROR
                    });
                    errorMsg.show({
                        duration: 10000
                    });
                } catch (msgError) {
                    console.error('Error showing NetSuite message:', msgError);
                }
                
                return false;
            }
            
            if (userRole == 1850) {
                var startDate = currentRecord.getValue('startdate');
                var endDate = currentRecord.getValue('enddate');
                
                console.log('Validating dates for role 1850:', {
                    startDate: startDate,
                    endDate: endDate
                });
                
                if (!startDate || !endDate) {
                    console.log('Validation failed: Start date or end date is empty for role 1850');
                    
                    alert('CAMPOS OBLIGATORIOS FALTANTES:\n\nFaltan los campos Fecha inicio y Fecha fin para generar la renovación.\n\nPor favor, complete estos campos e intente guardar nuevamente.');
                    
                    try {
                        var errorMsg = message.create({
                            title: 'Campos Obligatorios Faltantes',
                            message: 'Faltan los campos Fecha inicio y Fecha fin para generar la renovación.',
                            type: message.Type.ERROR
                        });
                        errorMsg.show({
                            duration: 10000
                        });
                    } catch (msgError) {
                        console.error('Error showing NetSuite message:', msgError);
                    }
                    
                    return false;
                }
            }
            
            var rolesRequireAdditionalFields = [1862, 1809, 1867, 1869, 1851];
            
            if (rolesRequireAdditionalFields.indexOf(userRole) !== -1) {
                var requiredFields = [
                    {
                        fieldId: 'custbody_canal_distribucion_sys',
                        fieldName: 'PE Canal Distribución SYS'
                    },
                    {
                        fieldId: 'custbody_ht_pe_os_leyenda',
                        fieldName: 'Leyenda'
                    },
                    {
                        fieldId: 'custbody_pe_ht_lugar_instalacion',
                        fieldName: 'Lugar Instalación'
                    },
                    {
                        fieldId: 'custbody_os_ejecutivarenovacion',
                        fieldName: 'HT Ejecutiva Renovacion'
                    }
                ];
                
                var missingFields = [];
                
                for (var i = 0; i < requiredFields.length; i++) {
                    var fieldValue = currentRecord.getValue(requiredFields[i].fieldId);
                    
                    console.log('Validating field for role ' + userRole + ':', {
                        fieldId: requiredFields[i].fieldId,
                        fieldName: requiredFields[i].fieldName,
                        value: fieldValue
                    });
                    
                    if (!fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined) {
                        missingFields.push(requiredFields[i].fieldName);
                    }
                }
                
                if (missingFields.length > 0) {
                    console.log('Validation failed: Missing required fields for role ' + userRole + ':', missingFields);
                    
                    var missingFieldsText = '';
                    if (missingFields.length === 1) {
                        missingFieldsText = 'Falta el campo: ' + missingFields[0];
                    } else if (missingFields.length === 2) {
                        missingFieldsText = 'Faltan los campos: ' + missingFields[0] + ' y ' + missingFields[1];
                    } else {
                        missingFieldsText = 'Faltan los campos: ' + missingFields.slice(0, -1).join(', ') + ' y ' + missingFields[missingFields.length - 1];
                    }
                    
                    var alertMessage = 'CAMPOS OBLIGATORIOS FALTANTES:\n\n' + missingFieldsText + '.\n\nPor favor, complete estos campos e intente guardar nuevamente.';
                    
                    alert(alertMessage);
                    
                    try {
                        var errorMsg = message.create({
                            title: 'Campos Obligatorios Faltantes',
                            message: missingFieldsText + '.',
                            type: message.Type.ERROR
                        });
                        errorMsg.show({
                            duration: 10000
                        });
                    } catch (msgError) {
                        console.error('Error showing NetSuite message:', msgError);
                    }
                    
                    return false;
                }
                
                console.log('Validation passed: All required fields are filled for role ' + userRole);
            }
            
            console.log('All validations passed for custom form 188');
        } else {
            console.log('Custom form is not 188, skipping all validations');
        }
        
        return true;
        
    } catch (error) {
        console.error('Error in saveRecord validation:', error);
        
        alert('ERROR DE VALIDACIÓN:\n\nOcurrió un error durante la validación. Por favor, verifique que todos los campos requeridos estén llenos.\n\nError: ' + error.toString());
        
        return false;
    }
}
    
    function updateBrokerField(currentRecord, bienId) {
        try {
            console.log('Updating broker field for bien:', bienId);
            
            var bienSearch = search.create({
                type: 'customrecord_ht_record_bienes',
                filters: [
                    ['internalid', 'anyof', bienId]
                ],
                columns: [
                    'custrecord_pe_broker'
                ]
            });
            
            var searchResults = bienSearch.run().getRange({
                start: 0,
                end: 1
            });
            
            if (searchResults.length > 0) {
                var brokerId = searchResults[0].getValue('custrecord_pe_broker');
                
                console.log('Broker found:', {
                    bienId: bienId,
                    brokerId: brokerId
                });
                
                if (brokerId) {
                    // Setear el broker en el campo
                    currentRecord.setValue({
                        fieldId: 'custbody_ht_os_broker',
                        value: brokerId
                    });
                    
                    console.log('Broker field updated successfully');
                    
                } else {
                    currentRecord.setValue({
                        fieldId: 'custbody_ht_os_broker',
                        value: ''
                    });
                    
                    console.log('No broker found for bien - field cleared');
                    
                    var warningMsg = message.create({
                        title: 'Sin Broker',
                        message: 'El bien seleccionado no tiene un broker asignado.',
                        type: message.Type.WARNING
                    });
                    warningMsg.show({
                        duration: 3000
                    });
                }
            } else {
                console.log('Bien not found in search results');
                
                currentRecord.setValue({
                    fieldId: 'custbody_ht_os_broker',
                    value: ''
                });
            }
            
        } catch (error) {
            console.error('Error updating broker field:', error);
            
            var errorMsg = message.create({
                title: 'Error',
                message: 'Error al actualizar el campo Broker. Por favor, contacte al administrador.',
                type: message.Type.ERROR
            });
            errorMsg.show({
                duration: 5000
            });
        }
    }
    
    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        saveRecord: saveRecord
    };
});