/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@returns {string}
 */
define(['N/record', 'N/log', 'N/search'], function (record, log, search) {

    function _get(context) {
        try {
            // Crear un registro vacío de tipo customerdeposit
            var customerDepositRecord = record.create({
                type: record.Type.CUSTOMER_DEPOSIT,
                isDynamic: true
            });

            // Crear un objeto para almacenar los campos y valores predeterminados
            var bodyFields = {};
            var fieldNames = customerDepositRecord.getFields();

            // Iterar sobre todos los campos del registro y obtener su valor predeterminado
            fieldNames.forEach(function (fieldName) {
                bodyFields[fieldName] = customerDepositRecord.getValue({ fieldId: fieldName });
            });

            // Devolver el objeto con los campos y sus valores
            return {
                success: true,
                fields: bodyFields
            };

        } catch (e) {
            log.error('Error en el Restlet', e.message);
            return {
                success: false,
                message: 'Error: ' + e.message
            };
        }
    }

    function _post(requestBody) {

        var response = {
            success: false,
            missingFields: [],
            message: ''
        };

        try {
          
            if (requestBody.op === 'SFC') { //SFC = SALDO A FAVOR DEL CLIENTE
                //response.message = 'Opcion valida';
                //response.success = true;

                function searchEmployeeByentityid(entityidEmployee) {
                    // Verificar si se envió el entityid
                    if (!entityidEmployee) {
                        return {
                            found: false,
                            message: 'No se envio el campo entityidEmployee',
                            email: null,
                            internalId: null
                        };
                    }

                    var userSearch = search.create({
                        type: search.Type.EMPLOYEE,
                        filters: [
                            ['entityid', 'is', entityidEmployee]
                        ],
                        columns: ['email', 'entityid', 'internalid']
                    });

                    var found = false;
                    var email = null;
                    var internalId = null;

                    userSearch.run().each(function (result) {
                        found = true;
                        email = result.getValue('email');
                        internalId = result.getValue('internalid');
                        return false;
                    });

                    // Retornar el resultado
                    if (found) {
                        return {
                            found: true,
                            message: 'Employee found',
                            email: email,
                            internalId: internalId
                        };
                    } else {
                        return {
                            found: false,
                            message: 'Employee no found',
                            email: null,
                            internalId: null
                        };
                    }
                }

                function searchClientByentityid(entityidClient) {
                    // Verificar si se envió el entityid
                    if (!entityidClient) {
                        return {
                            found: false,
                            message: 'No se envió el campo entityidClient',
                            internalId: null
                        };
                    }
                
                    var customerSearch = search.create({
                        type: search.Type.CUSTOMER,
                        filters: [
                            ['entityid', 'is', entityidClient]
                        ],
                        columns: ['internalid']
                    });
                
                    var internalId = null;
                    var found = false;
                
                    customerSearch.run().each(function(result) {
                        found = true;
                        internalId = result.getValue('internalid');
                        return false; // Detener después del primer resultado
                    });
                
                    // Retornar el resultado
                    if (found) {
                        return {
                            found: true,
                            message: 'Client found',
                            internalId: internalId
                        };
                    } else {
                        return {
                            found: false,
                            message: 'Client no found',
                            internalId: null
                        };
                    }
                }

                var searchEmployeeByentityidRes = searchEmployeeByentityid(requestBody.entityidEmployee);
                if (searchEmployeeByentityidRes.found) {
     
                    var searchClientByentityidRes = searchClientByentityid(requestBody.entityidClient);
                    if (searchClientByentityidRes.found) {
                        
                        var customerDeposit = record.create({
                            type: record.Type.CUSTOMER_DEPOSIT,
                            isDynamic: true
                        });

                        let trandateStr = requestBody.trandate; 
                        let [day, month, year] = trandateStr.split('/');
                        let formattedDate = new Date(year, month - 1, day); 
                        //let formattedDateString = formattedDate.toISOString().split('T')[0];
                
                        // Asignar valores de campos obligatorios
                        customerDeposit.setValue({ fieldId: 'customform', value: 187 });
                        customerDeposit.setValue({ fieldId: 'customer', value: searchClientByentityidRes.internalId });
                        customerDeposit.setValue({ fieldId: 'payment', value: requestBody.payment });
                        customerDeposit.setValue({ fieldId: 'currency', value: requestBody.currency });
                        customerDeposit.setValue({ fieldId: 'trandate', value: formattedDate });
                        customerDeposit.setValue({ fieldId: 'memo', value: requestBody.memo });

                        //valores de usuario
                        customerDeposit.setValue({ fieldId: 'custbodyec_empeado_proveduria', value: searchEmployeeByentityidRes.internalId });
                        //customerDeposit.setValue({ fieldId: 'nluser', value: searchEmployeeByentityidRes.internalId });
                        //customerDeposit.setValue({ fieldId: 'paymenteventupdatedby', value: searchEmployeeByentityidRes.email });
            
                        customerDeposit.setValue({ fieldId: 'department', value: requestBody.departmentId });
                        customerDeposit.setValue({ fieldId: 'class', value: requestBody.classId });
                        customerDeposit.setValue({ fieldId: 'location', value: requestBody.locationId });
                        customerDeposit.setValue({ fieldId: 'paymentoption', value: requestBody.paymentoption });
                        customerDeposit.setValue({ fieldId: 'postingperiod', value: requestBody.postingperiod });
                        customerDeposit.setValue({ fieldId: 'custbody_htpe_nro_operacion', value: requestBody.nro_ope });
                        customerDeposit.setValue({ fieldId: 'custbodyht_pago_emisor', value: requestBody.emisor });
                        customerDeposit.setValue({ fieldId: 'custbody_pe_registro', value: requestBody.pe_registro });
                        // Guardar el deposito
                        var depositId = customerDeposit.save();

                        var depositSearch = search.create({
                            type: search.Type.CUSTOMER_DEPOSIT,
                            filters: [
                                ['internalid', 'is', depositId]
                            ],
                            columns: ['tranid']
                        });

                        var deposittranid
                        //capturar valor 
                        depositSearch.run().each(function(result) {
                            deposittranid = result.getValue('tranid');
                            return false; // Detener despues del primer resultado xd
                        });
            
                        response.success = true;
                        response.message = 'Depósito creado con ID: ' + deposittranid
            
                        var updatedDeposit = record.load({
                            type: record.Type.CUSTOMER_DEPOSIT,
                            id: depositId,
                            isDynamic: true
                        });
                        
                        // Actualizar el tipo de cambio (esto es comun en ambos casos)
                        updatedDeposit.setValue({ fieldId: 'exchangerate', value: requestBody.exchangerate });

                        // T = Cuenta sin fondos, F = Cuenta con fondos
                        if (requestBody.undepfunds === "T") {
                            updatedDeposit.setValue({ fieldId: 'undepfunds', value: "T" });
                        } else {
                            updatedDeposit.setValue({ fieldId: 'undepfunds', value: "F" });
                            updatedDeposit.setValue({ fieldId: 'account', value: requestBody.account });
                        }
                        // Guardar la actualización
                        updatedDeposit.save();

                    } else {
                        response.success = false;
                        response.message = searchClientByentityidRes.message;
                    }
              
                } else {
                    //log.debug('Usuario no found', results.message);
                    response.success = false;
                    response.message = searchEmployeeByentityidRes.message;
                    
                }
  
            } else if (requestBody.op === "") {
                response.message = 'Operación no válida';
            } else {
                response.message = 'Operación no válida';
            }


        } catch (e) {
            log.error('Error creando depósito', e.message);

            // Manejar errores de campos obligatorios
            var errorMessage = e.message;
            var missingFieldsMatch = errorMessage.match(/Introduzca valores para: (.*)/);
            if (missingFieldsMatch && missingFieldsMatch[1]) {
                var missingFields = missingFieldsMatch[1].split(',').map(function (field) {
                    return field.trim();
                });
                response.missingFields = missingFields;
                response.message = 'Faltan valores para los campos obligatorios.';
            } else {
                response.message = 'Error inesperado: ' + errorMessage;
            }
        }

        return JSON.stringify(response);
    }


    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});