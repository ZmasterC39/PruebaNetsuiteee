/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @param {string} altname -
 * @returns {string} 
 */
define(['N/search', 'N/log', 'N/record'], function (search, log, record) {

    function _get() {
        try {
            var resultado = null;

            let data = query.runSuiteQL({
                query: `
            select
            *
            from
            employee
            `
            });

            let res = data.asMappedResults();

            if (res.length > 0) {
                resultado = res;
            } else {
                resultado = { error: 'no data' };
            }

            return JSON.stringify({
                results: resultado
            });
        } catch (error) {
            log.error('error', error);
            return JSON.stringify({
                error: error.message
            });
        }
    }

    function _post(context) {

        try {
          
            log.debug('context recibido', context);
          
            var response = {
                missingFields: []
            };

            //if (!context.idconversacion) response.missingFields.push('idconversacion');
            //if (!context.idcontacto) response.missingFields.push('idcontacto');
            //if (!context.idtipificacion) response.missingFields.push('idtipificacion');
            if (!context.tipoSeguimiento) response.missingFields.push('tipoSeguimiento');

            const tipoSeguimiento = context.tipoSeguimiento;

            if (tipoSeguimiento === 'genesys') {
                if (!context.idconversacion) response.missingFields.push('idconversacion');
                if (!context.idcontacto) response.missingFields.push('idcontacto');
                if (!context.idtipificacion) response.missingFields.push('idtipificacion');
                if (!context.Canal) response.missingFields.push('Canal');

            } else {

                if (!context.cliente) response.missingFields.push('cliente');
                if (!context.vehiculo) response.missingFields.push('vehiculo');
                if (!context.seguimiento) response.missingFields.push('seguimiento');
                if (!context.ejecutivo) response.missingFields.push('ejecutivo');
                if (!context.modocontacto) response.missingFields.push('modocontacto');
                if (!context.formaproximocontacto) response.missingFields.push('formaproximocontacto');
                if (!context.fechapromesa) response.missingFields.push('fechapromesa');
                if (!context.fechaproximo) response.missingFields.push('fechaproximo');
                if (!context.fechaContacto) response.missingFields.push('fechaContacto');
                if (!context.telefonoalterno) response.missingFields.push('telefonoalterno');
                if (!context.TelefonoContactado) response.missingFields.push('TelefonoContactado');
                //if (!context.subsidiaria) response.missingFields.push('subsidiaria');
                //if (!context.tipoCliente) response.missingFields.push('tipoCliente');
                if (!context.resultadogestion) response.missingFields.push('resultadogestion');
                if (!context.motivo) response.missingFields.push('motivo');

                //custrecord_ht_sc_resultadogestion
                //custrecord_ht_sc_cmotivo
            }

            let trandateStr1
            let trandateStr2
            let trandateStr3

            let formattedDatefcontacto
            let formattedDatefprox
            let formattedDatefpromesa 

            trandateStr1 = context.fechaContacto;
            let [day, month, year] = trandateStr1.split('/');
            formattedDatefcontacto = new Date(`${year}/${month}/${day}`);

            if (formattedDatefcontacto.toString() === 'Invalid Date') {
                return {
                    status: '400',
                    errorCode: 'FECHA_CONTACTO_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechaContacto
                };
            }

            trandateStr2 = context.fechaproximo;
            [day, month, year] = trandateStr2.split('/');
            formattedDatefprox = new Date(`${year}/${month}/${day}`);

            if (formattedDatefprox.toString() === 'Invalid Date') {
                return {
                    status: '400',
                    errorCode: 'FECHA_PROXIMO_CONTACTO_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechaproximo
                };
            }

            trandateStr3 = context.fechapromesa;
            [day, month, year] = trandateStr3.split('/');
            formattedDatefpromesa = new Date(`${year}/${month}/${day}`);

            if (formattedDatefpromesa.toString() === 'Invalid Date') {
                return {
                    status: '400',
                    errorCode: 'FECHA_PROMESA_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechapromesa
                };
            }

            if (response.missingFields.length > 0) {
                return {
                    status: '202',
                    errorCode: 'MISSING_FIELDS',
                    message: 'Faltan valores para los campos obligatorios.',
                    missingFields: response.missingFields
                }
            }

            //buscar cliente
            var customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: [
                    ['entityid', 'contains', context.cliente]
                ],
                columns: ['internalid']
            });

            var customersearchResult = customerSearch.run().getRange({ start: 0, end: 1 });

            if (customersearchResult.length === 0) {
                return {
                    status: '400',
                    errorCode: 'CUSTOMER_NOT_FOUND',
                    message: 'No se encontro ningun cliente con el id proporcionado: ' + context.cliente
                };
            }

            log.debug('customersearchResult', customersearchResult);

            //buscar empleado
            var employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [
                    ['email', 'is', context.ejecutivo]
                ],
                columns: ['internalid']
            });

            var employeesearchResult = employeeSearch.run().getRange({ start: 0, end: 1 });

            if (employeesearchResult.length === 0) {
                return {
                    status: '400',
                    errorCode: 'EMPLOYEE_NOT_FOUND',
                    message: 'No se encontro ningun empleado con el id proporcionado: ' + context.ejecutivo
                };
            }

            log.debug('employeesearchResult', employeesearchResult);

            //buscar vehiculo
            var vehicleSearch = search.create({
                type: 'customrecord_ht_record_bienes',
                filters: [
                    ['internalid', 'is', context.vehiculo]
                ],
                columns: ['internalid']
            });

            var vehiclesearchResult = vehicleSearch.run().getRange({ start: 0, end: 1 });

            if (vehiclesearchResult.length === 0) {
                return {
                    status: '400',
                    errorCode: 'VEHICLE_NOT_FOUND',
                    message: 'No se encontro ningun vehiculo con el id proporcionado: ' + context.vehiculo
                };
            }

            log.debug('vehiclesearchResult', vehiclesearchResult);

            var seguimientoCliente = record.create({
                type: 'customrecord_ht_record_seguicliente',
                isDynamic: true
            });

            //buscar id resultadogestion y id motivo
            var homologGenesysSearch = search.create({
                type: 'customrecordcustomrecord_ht_homologacion',
                filters: [
                    ['custrecord_genesys_cod_conclusion', 'is', context.idtipificacion || '']
                ],
                columns: ['custrecord_genesys_resultado_gestion', 'custrecord_genesys_motivo']
            });

            var homologGenesysSearchResult = homologGenesysSearch.run().getRange({ start: 0, end: 1 });

            if (homologGenesysSearchResult.length === 0 && tipoSeguimiento === 'genesys') {
                return {
                    status: '400',
                    errorCode: 'TIPIFICACION_NOT_FOUND',
                    message: 'No se encontro ninguna tipificacion con el id proporcionado: ' + context.idtipificacion
                };
            }

            log.debug('homologGenesysSearchResult', homologGenesysSearchResult);

            var seguimientoCliente = record.create({
                type: 'customrecord_ht_record_seguicliente',
                isDynamic: true
            });

            /*let dateStr = context.trandate;
            let [day, month, year] = dateStr.split('/');
            let formattedDate = new Date(year, month - 1, day);*/

            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_cliente', value: customersearchResult[0].getValue('internalid') });
            //obtener valores solo si tipo seguimiento es genesys, si no enviar vacio
            seguimientoCliente.setValue({
                fieldId: 'custrecord_ht_sc_resultadogestion',
                value: tipoSeguimiento === 'genesys' ? homologGenesysSearchResult[0].getValue('custrecord_genesys_resultado_gestion') || '' : context.resultadogestion
            });
            seguimientoCliente.setValue({
                fieldId: 'custrecord_ht_sc_cmotivo',
                value: tipoSeguimiento === 'genesys' ? homologGenesysSearchResult[0].getValue('custrecord_genesys_motivo') || '' : context.motivo
            });

            //seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_cmotivo', value: homologGenesysSearchResult[0].getValue('custrecord_genesys_motivo') || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_empleado', value: employeesearchResult[0].getValue('internalid') });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_estado', value: "2" }); //ejecutado por defecto al ser registro exitoso
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechacontacto', value: formattedDatefcontacto });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechapproximocontacto', value: formattedDatefprox });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechapromesa', value: formattedDatefpromesa });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_modocontacto', value: context.modocontacto });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_proximocontacto', value: context.formaproximocontacto });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_seguimiento', value: context.seguimiento });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_tipocliente', value: context.tipoCliente || '2' }); //cliente autosafe 2, cliente carseg 1 (autosafe por defecto)
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_tiposeguimiento', value: "1" }); //seguimiento en ventas por defecto
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_vehiculo', value: vehiclesearchResult[0].getValue('internalid') });
            seguimientoCliente.setValue({ fieldId: 'custrecord_subsidiaria_seguimiento', value: context.subsidiaria || '3' }); //subsidiaria autosafe 3 carseg 2 subsidiaria empresa 1 (autosafe por defecto)
            //campos adicionales para genesys
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_idconversacion_genesys', value: context.idconversacion || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_idcontacto_genesys', value: context.idcontacto || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_idtipificacion_genesys', value: context.idtipificacion || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_canal', value: context.Canal || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_telefono_alterno', value: context.telefonoalterno || '' });
            seguimientoCliente.setValue({ fieldId: 'custrecord_ht_telefono_contacto', value: context.TelefonoContactado || '' });

            var idSeguimientoCliente = seguimientoCliente.save();

            log.debug('idSeguimientoCliente-aqui', seguimientoCliente);

            //validar si idSeguimientoCliente incluye custrecord_ht_sc_cmotivo

            if (!idSeguimientoCliente) {
                return {
                    status: '500',
                    errorCode: 'SAVE_ERROR',
                    message: 'No se pudo guardar el seguimiento'
                };
            } else {
                return {
                    status: '200',
                    message: 'Seguimiento guardado correctamente'
                };
            }

        } catch (e) {
            log.error('Error creando registro seguimiento', e.message);

            // Manejar errores de campos obligatorios
            var errorMessage = e.message;
            var missingFieldsMatch = errorMessage.match(/Introduzca valores para: (.*)/);
            if (missingFieldsMatch && missingFieldsMatch[1]) {
                var missingFields = missingFieldsMatch[1].split(',').map(function (field) {
                    return field.trim();
                });
                return {
                    status: '202',
                    message: 'Faltan valores para los campos obligatorios.',
                    missingFields: missingFields
                };
            }
            if (e.message.includes('custrecord_ht_sc_resultadogestion')) {
                return {
                    status: '400',
                    errorCode: 'RESULTADO_GESTION_NOT_FOUND',
                    message: 'No se encontro ningun resultado de gestion con el id proporcionado: ' + context.resultadogestion
                };
            } else if (e.message.includes('custrecord_ht_sc_cmotivo')) {
                return {
                    status: '400',
                    errorCode: 'MOTIVO_NOT_FOUND',
                    message: 'No se encontro ningun motivo con el id proporcionado: ' + context.motivo
                };
            } else if (e.message.includes('custrecord_ht_sc_modocontacto')) {
                return {
                    status: '400',
                    errorCode: 'MODO_CONTACTO_NOT_FOUND',
                    message: 'No se encontro ningun modo contacto con el id proporcionado: ' + context.modocontacto
                }
            } else if (e.message.includes('custrecord_ht_sc_proximocontacto')) {
                return {
                    status: '400',
                    errorCode: 'MODO_PROXIMO_CONTACTO_NOT_FOUND',
                    message: 'No se encontro ningun modo proximo contacto con el id proporcionado: ' + context.formaproximocontacto
                }
            } else if (e.message.includes('custrecord_ht_sc_fechacontacto')) {
                return {
                    status: '400',
                    errorCode: 'FECHA_CONTACTO_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechaContacto
                }
            } else if (e.message.includes('custrecord_ht_sc_fechapproximocontacto')) {
                return {
                    status: '400',
                    errorCode: 'FECHA_PROXIMO_CONTACTO_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechaproximo
                }
            } else if (e.message.includes('custrecord_ht_sc_fechapromesa')) {
                return {
                    status: '400',
                    errorCode: 'FECHA_PROMESA_ERROR',
                    message: 'Error en el fomato, debe ser dd/mm/yyyy. Valor proporcionado: ' + context.fechapromesa
                }
            } else {
                return {
                    status: '500',
                    errorCod: 'ERROR_NO_CONTROLADO',
                    message: 'Error interno'
                };
            }
        }



    }

    function _put(context) {
        // Implementa tu lógica PUT si es necesario
    }

    function _delete(context) {
        // Implementa tu lógica DELETE si es necesario
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});