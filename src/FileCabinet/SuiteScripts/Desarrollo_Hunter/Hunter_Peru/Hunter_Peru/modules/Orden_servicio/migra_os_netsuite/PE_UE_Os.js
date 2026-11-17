/** 
 * USER EVENT SCRIPT - Role-Based Field Visibility & Subsidiary Field Locking 
 * Los campos especificados solo se muestran para roles: 1862, 1809, 1867, 1850 
 * Los campos custbody_ht_os_concesionario, custbody_ht_os_companiaseguros y custbody_ht_os_bancofinanciera 
 * se bloquean para usuarios de subsidiaria 3 
 * El campo custbody_ht_os_broker se llena desde customrecord_ht_record_bienes y se bloquea 
 * @NApiVersion 2.1 
 * @NScriptType UserEventScript 
 */ 
define(['N/task', 'N/log', 'N/record', 'N/runtime', 'N/ui/serverWidget', 'N/search'], function(task, log, record, runtime, serverWidget, search) { 
    function beforeLoad(context) { 
        try { 
            var currentUser = runtime.getCurrentUser(); 
            var userRole = currentUser.role; 
            var userSubsidiary = currentUser.subsidiary; 

            //se adiciona 1850 rol back office renovaciones
            //pruebas con Johnathan Tello 1864, 1866
            var authorizedRoles = [1862, 1809, 1867, 1869, 1851, 1850, 1864, 1866, 1887,1914,1915,1891]; 

            var userRoleNum = parseInt(userRole, 10); 
            log.audit('Role Check Debug', { 
                userRole: userRole, 
                userRoleOriginalType: typeof userRole, 
                userRoleNum: userRoleNum, 
                userSubsidiary: userSubsidiary, 
                authorizedRoles: authorizedRoles 
            }); 

            var isAuthorized = authorizedRoles.indexOf(userRoleNum) !== -1; 
            log.audit('Authorization Result', { 
                userRole: userRole, 
                userRoleNum: userRoleNum, 
                userSubsidiary: userSubsidiary, 
                isAuthorized: isAuthorized, 
                action: isAuthorized ? 'Show fields' : 'Hide fields' 
            }); 

            var form = context.form; 

            if (!isAuthorized) { 
                var fieldsToHide = [ 
                    'custbody_pe_os_forma_pago_sys', 
                    'custbody_os_api_sent', 
                    'custbody_os_api_failed', 
                    'custbody_os_api_sent_date', 
                    'custbody_os_api_last_attempt', 
                    'custbody_os_api_attempts', 
                    'custbody_os_api_last_response', 
                    'custbody_canal_distribucion_sys', 
                    'custbody_pe_os_convenio' 
                ]; 

                var hiddenCount = 0; 

                fieldsToHide.forEach(function(fieldId) { 
                    try { 
                        var field = form.getField({ id: fieldId }); 
                        if (field) { 
                            field.updateDisplayType({ 
                                displayType: serverWidget.FieldDisplayType.HIDDEN 
                            }); 
                            hiddenCount++; 
                            log.debug('Field Hidden', { 
                                fieldId: fieldId, 
                                userRole: userRoleNum, 
                                reason: 'Role not authorized' 
                            }); 
                        } else { 
                            log.debug('Field Not Found', { 
                                fieldId: fieldId, 
                                note: 'Field does not exist on this record type' 
                            }); 
                        } 
                    } catch (fieldError) { 
                        log.error('Error hiding field', { 
                            fieldId: fieldId, 
                            error: fieldError.toString() 
                        }); 
                    } 
                }); 

                log.audit('Fields Hidden Summary', { 
                    userRole: userRoleNum, 
                    authorizedRoles: authorizedRoles, 
                    totalFieldsToHide: fieldsToHide.length, 
                    actualFieldsHidden: hiddenCount, 
                    recordType: context.newRecord.type, 
                    recordMode: context.type 
                }); 
            } 

            // logica personalizada para usuarios de subsidiaria 3 
            if (userSubsidiary == 3) { 
                // bloqueo de campos para usuarios de subsidiaria 3 
                var fieldsToLock = [ 
                    'custbody_ht_os_concesionario', 
                    'custbody_ht_os_companiaseguros', 
                    //'custbody_ht_os_bancofinanciera', 
                    'custbody_ht_os_ejecutiva_backoffice' 
                ]; 

                var lockedCount = 0; 

                fieldsToLock.forEach(function(fieldId) { 
                    try { 
                        var field = form.getField({ id: fieldId }); 
                        if (field) { 
                            field.updateDisplayType({ 
                                displayType: serverWidget.FieldDisplayType.INLINE 
                            }); 
                            lockedCount++; 
                            log.debug('Field Locked', { 
                                fieldId: fieldId, 
                                userSubsidiary: userSubsidiary, 
                                reason: 'User from subsidiary 3' 
                            }); 
                        } else { 
                            log.debug('Field Not Found for Locking', { 
                                fieldId: fieldId, 
                                note: 'Field does not exist on this record type' 
                            }); 
                        } 
                    } catch (fieldError) { 
                        log.error('Error locking field', { 
                            fieldId: fieldId, 
                            error: fieldError.toString() 
                        }); 
                    } 
                }); 

                log.audit('Fields Locked Summary', { 
                    userSubsidiary: userSubsidiary, 
                    totalFieldsToLock: fieldsToLock.length, 
                    actualFieldsLocked: lockedCount, 
                    recordType: context.newRecord.type, 
                    recordMode: context.type 
                }); 

                // llenar y bloquear el campo broker basado en el bien seleccionado 
                handleBrokerField(context, form); 
            } 
        } catch (error) { 
            log.error('Error in beforeLoad', { 
                error: error.toString(), 
                stack: error.stack, 
                userRole: runtime.getCurrentUser().role, 
                userSubsidiary: runtime.getCurrentUser().subsidiary 
            }); 
        } 
    } 

    function handleBrokerField(context, form) { 
        try { 
            var newRecord = context.newRecord; 
            var bienId = newRecord.getValue('custbody_ht_so_bien'); 

            log.debug('Handling Broker Field', { 
                recordId: newRecord.id, 
                bienId: bienId, 
                mode: context.type 
            }); 

            // Bloquear el campo broker ya que se maneja automáticamente 
            var brokerField = form.getField({ id: 'custbody_ht_os_broker' }); 
            if (brokerField) { 
                brokerField.updateDisplayType({ 
                    displayType: serverWidget.FieldDisplayType.INLINE 
                }); 

                log.debug('Broker Field Locked', { 
                    reason: 'Field is managed automatically via Client Script' 
                }); 
            } 

            // Si hay un bien seleccionado, buscar y llenar el broker 
            if (bienId) { 
                var brokerValue = getBrokerFromBien(bienId); 

                if (brokerValue) { 
                    // Actualizar el valor del campo en el registro 
                    newRecord.setValue({ 
                        fieldId: 'custbody_ht_os_broker', 
                        value: brokerValue 
                    }); 

                    log.audit('Broker Field Updated', { 
                        recordId: newRecord.id, 
                        bienId: bienId, 
                        brokerValue: brokerValue, 
                        action: 'Broker field populated from bien record' 
                    }); 
                } else { 
                    log.debug('No Broker Found in Bien', { 
                        bienId: bienId, 
                        message: 'No broker value found in bien record' 
                    }); 
                } 
            } else { 
                log.debug('No Bien Selected', { 
                    message: 'custbody_ht_so_bien is empty' 
                }); 
            } 
        } catch (error) { 
            log.error('Error handling broker field', { 
                error: error.toString(), 
                stack: error.stack, 
                recordId: context.newRecord.id || 'unknown' 
            }); 
        } 
    } 

    function afterSubmit(context) { 
        var startTime = Date.now(); 

        try { 
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) { 
                return; 
            } 

            var recordId = context.newRecord.id; 
            var recordType = context.newRecord.type; 

            log.debug('User Event Started', { 
                recordId: recordId, 
                recordType: recordType, 
                eventType: context.type, 
                timestamp: new Date().toISOString() 
            }); 

            if (isAlreadySent(recordId)) { 
                log.audit('Already Sent - Skipping', { 
                    recordId: recordId, 
                    message: 'Record already processed successfully' 
                }); 
                return; 
            } 

            var mapReduceTask = task.create({ 
                taskType: task.TaskType.MAP_REDUCE, 
                scriptId: 'customscript_os_sync_mr', 
                deploymentId: 'customdeploy_os_sync_mr', 
                params: { 
                    'custscript_target_record_id': recordId 
                } 
            }); 

            var taskId = mapReduceTask.submit(); 

            log.audit('Map/Reduce Queued Successfully', { 
                recordId: recordId, 
                eventType: context.type, 
                taskId: taskId, 
                executionTimeMs: Date.now() - startTime 
            }); 
        } catch (error) { 
            log.error('User Event Error - Record Still Saved', { 
                recordId: context.newRecord.id || 'unknown', 
                eventType: context.type, 
                error: error.toString(), 
                stack: error.stack, 
                executionTimeMs: Date.now() - startTime 
            }); 
        } 
    } 

    function getBrokerFromBien(bienId) { 
        try { 
            // Primero buscar el broker ID desde el bien 
            var bienSearch = search.create({ 
                type: 'customrecord_ht_record_bienes', 
                filters: [ 
                    ['internalid', 'anyof', bienId] 
                ], 
                columns: [ 
                    'custrecord_pe_broker' 
                ] 
            }); 

            var bienResults = bienSearch.run().getRange({ 
                start: 0, 
                end: 1 
            }); 

            if (bienResults.length > 0) { 
                var brokerId = bienResults[0].getValue('custrecord_pe_broker'); 

                log.debug('Broker ID Found in Bien', { 
                    bienId: bienId, 
                    brokerId: brokerId 
                }); 

                if (!brokerId) { 
                    log.debug('No Broker ID', 'custrecord_pe_broker is empty in bien record'); 
                    return null; 
                } 

                // Retornar el ID del broker directamente para campos de tipo lista 
                log.audit('Returning Broker ID', { 
                    bienId: bienId, 
                    brokerId: brokerId, 
                    note: 'Using broker ID for list field' 
                }); 

                return brokerId; 
            } 

            return null; 
        } catch (error) { 
            log.error('Error getting broker from bien', { 
                bienId: bienId, 
                error: error.toString(), 
                stack: error.stack 
            }); 
            return null; 
        } 
    } 

    function isAlreadySent(recordId) { 
        try { 
            var orderRecord = record.load({ 
                type: 'salesorder', 
                id: recordId, 
                isDynamic: false 
            }); 

            return orderRecord.getValue('custbody_os_api_sent') === true; 
        } catch (error) { 
            log.debug('Error checking sent status', { 
                recordId: recordId, 
                error: error.toString() 
            }); 
            return false; 
        } 
    } 

    return { 
        beforeLoad: beforeLoad, 
        afterSubmit: afterSubmit 
    }; 
}); 
