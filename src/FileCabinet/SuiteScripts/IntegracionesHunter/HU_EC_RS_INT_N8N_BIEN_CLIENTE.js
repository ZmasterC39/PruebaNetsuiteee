/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define([
    'N/log',
    'N/record',
    'N/search',
    'N/query',
    'N/runtime',
    //'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION.js', 
    'N/https', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'
], function (log, record, search, query, runtime, https, _toolkit) {
    const CREAR = 'crear';

    function _post(context) {
        try {
            log.audit('----Iniciando _post', context.aux);

            if (context.aux == "true" || context.aux == true) {
                try {
                    // log.debug("Validacion Cliente", context);

                    return JSON.stringify(context); // Retornar el contexto original en caso de error
                    const TOKEN = "G19extt1Kb9VRU2915TQtzJlENvTnGMYSwnjOeF2";

                    function realizarConsulta(endpoint, value) {
                        try {
                            let headers = {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${TOKEN}`,
                            };

                            let options = {
                                method: "GET",
                                url: `https://webservices.ec/api/${endpoint}/${value}`,
                                headers: headers,
                            };

                            let response = https.get(options);
                            log.debug("options", options)

                            let respuesta = JSON.parse(response.body);
                            log.debug("respuesta", respuesta)

                            return respuesta.data;

                        } catch (error) {
                            return {};

                        }
                    }

                    // Validar RUC
                    if (context.V_RUC == "true") {
                        let datosRUC = realizarConsulta("ruc", context.IDENTIFICACION);

                        // log.debug("--datosRUC--", datosRUC)

                        // Asignar datos del RUC al contexto
                        context.NOMBRE = datosRUC?.main?.numeroRuc || context.NOMBRE;
                        // context.DIRECCION = datosRUC.direccion || context.DIRECCION;
                        // Agregar más campos según lo que retorne la API
                    }

                    // Validar CÉDULA
                    if (context.V_CED == "true") {
                        let datosCedula = realizarConsulta("cedula", context.IDENTIFICACION);
                        // log.debug("--datosCedula--", datosCedula?.response?.nombreCompleto)

                        // Asignar datos de la cédula al contexto
                        context.NOMBRE = datosCedula?.response?.nombreCompleto || context.NOMBRE;
                        // Agregar más campos según lo que retorne la API
                    }

                    // Validar PLACA
                    if (context.V_PLA == "true") {
                        // Usar CHASIS o PLACA como fallback
                        let valorBusqueda = (context.CHASIS || context.PLACA)
                            ?.toString()
                            .replace(/[^a-zA-Z0-9]/g, '')
                            .toUpperCase();

                        if (context.PLACA == "S/P" && !context.CHASIS) {
                            return
                        }

                        if (valorBusqueda) {
                            let datosPlaca = realizarConsulta("placas", valorBusqueda);
                            // let datosPlaca = realizarConsulta("placas", "GSQ5981");

                            log.debug("--datosPlaca--", datosPlaca)

                            // Asignar datos del vehículo al contexto
                            context.MARCA = datosPlaca?.Marca || context.MARCA;
                            context.MODELO = datosPlaca?.Modelo || context.MODELO;
                            context.ANIO = datosPlaca?.Año || context.ANIO;
                            context.COLOR = datosPlaca?.Color || context.COLOR;
                            context.CHASIS = datosPlaca?.Chasis || context.CHASIS;
                            context.PLACA = datosPlaca?.Placa || context.PLACA;
                            context.MOTOR = datosPlaca?.Motor || context.MOTOR;
                            context.TIPO_VEHICULO = datosPlaca?.clase || context.TIPO_VEHICULO;
                        }
                    }

                    return JSON.stringify(context);

                } catch (error) {
                    // log.debug("Error en validación:", error);
                    return JSON.stringify(context); // Retornar el contexto original en caso de error
                }
            } else if (context.aux == "false") {
                return JSON.stringify(context); // Retornar el contexto original en caso de error
            }

            // Validación inicial de datos
            if (!context || !context.cliente) {
                // log.error('FALLO', 'No se recibió información del cliente');
                return JSON.stringify({
                    success: false,
                    idCliente: 0,
                    identificacion: null,
                    idBien: 0,
                    bien: null,
                    resultado_Cliente: "No se recibió información del cliente en el contexto",
                    resultado_Bien: "No se pudo procesar",
                    //observacion_General: ""
                });
            }

            // Crear cliente
            // log.audit('PASO 1', 'Iniciando creación de cliente');
            let resultadoCliente;

            try {
                // log.audit("context", context);
                resultadoCliente = clienteN8n(context.cliente);
                // log.debug('resultadoCliente completo', JSON.stringify(resultadoCliente));
            } catch (errorCliente) {
                // log.error('FALLO al ejecutar clienteN8n', errorCliente);
                return JSON.stringify({
                    success: false,
                    idCliente: 0,
                    identificacion: context.cliente?.entityid || null,
                    idBien: 0,
                    bien: null,
                    resultado_Cliente: `Error al procesar cliente. Detalle técnico: ${errorCliente.message}`,
                    resultado_Bien: "No se pudo procesar",
                    // observacion_General: ""
                });
            }

            // Validar resultado del cliente
            if (!resultadoCliente) {
                // log.error('FALLO', 'clienteN8n retornó null o undefined');
                return JSON.stringify({
                    success: false,
                    idCliente: 0,
                    identificacion: context.cliente?.entityid || null,
                    idBien: 0,
                    bien: null,
                    resultado_Cliente: "Error al procesar cliente",
                    resultado_Bien: "No se pudo procesar",
                    // observacion_General: ""
                });
            }

            const idCliente = resultadoCliente?.idInterno || resultadoCliente?.id || 0;
            // log.audit('PASO 2', `ID Cliente obtenido: ${idCliente}`);

            if (idCliente) {
                // Cliente procesado exitosamente
                // log.audit('PASO 3', 'Preparando creación de bien');

                // Validar que exista información del bien
                if (!context.bien) {
                    // log.error('FALLO', 'No se recibió información del bien');
                    return JSON.stringify({
                        success: false,
                        idCliente: idCliente,
                        identificacion: resultadoCliente?.identificacion || null,
                        idBien: 0,
                        bien: null,
                        resultado_Cliente: resultadoCliente?.mensaje || "Cliente procesado",
                        resultado_Bien: "No se recibió información del bien en el contexto",
                        // observacion_General: ""
                    });
                }

                let identificacionCliente;
                try {
                    identificacionCliente = limpiarIdentificacion(context.cliente.entityid);
                    // log.debug('identificacionCliente', identificacionCliente);
                } catch (errorLimpiar) {
                    // log.error('FALLO al limpiar identificación', errorLimpiar);
                    return JSON.stringify({
                        success: false,
                        idCliente: idCliente,
                        identificacion: resultadoCliente?.identificacion || null,
                        idBien: 0,
                        bien: null,
                        resultado_Cliente: resultadoCliente?.mensaje || "Cliente procesado",
                        resultado_Bien: `Error al procesar identificación. Detalle técnico: Identificacion - ${errorLimpiar.message}`,
                        // observacion_General: ""
                    });
                }

                // Crear bien
                // log.audit('PASO 4', 'Iniciando creación de bien');
                let resultadoBien2;

                try {
                    resultadoBien2 = bienN8n(context.bien, identificacionCliente);
                    // log.debug("resultadoBien2 completo", JSON.stringify(resultadoBien2));
                } catch (errorBien) {
                    // log.error('FALLO al ejecutar bienN8n', errorBien);
                    return JSON.stringify({
                        success: false,
                        idCliente: idCliente,
                        identificacion: resultadoCliente?.identificacion || null,
                        idBien: 0,
                        bien: null,
                        resultado_Cliente: resultadoCliente?.mensaje || "Cliente procesado",
                        resultado_Bien: `Error al procesar bien. Detalle técnico: ${errorBien.message}`,
                        // observacion_General: ""
                    });
                }

                // Validar resultado del bien
                if (!resultadoBien2) {
                    // log.error('FALLO', 'bienN8n retornó null o undefined');
                    return JSON.stringify({
                        success: false,
                        idCliente: idCliente,
                        identificacion: resultadoCliente?.identificacion || null,
                        idBien: 0,
                        bien: null,
                        resultado_Cliente: resultadoCliente?.mensaje || "Cliente procesado",
                        resultado_Bien: "Error al procesar bien. Detalle técnico",
                        // observacion_General: ""
                    });
                }

                let idBien = resultadoBien2?.id || 0;
                // log.debug("idBien obtenido", idBien);

                if (idBien === 0) {
                    // log.error('FALLO', `No se obtuvo ID válido del bien. Respuesta: ${JSON.stringify(resultadoBien2)}`);
                    return JSON.stringify({
                        success: false,
                        idCliente: idCliente,
                        identificacion: resultadoCliente?.identificacion || null,
                        idBien: 0,
                        bien: null,
                        resultado_Cliente: resultadoCliente?.mensaje || "Cliente procesado",
                        resultado_Bien: resultadoBien2?.mensaje || "No se pudo crear el bien.",
                        // observacion_General: ""
                    });
                }

                // Todo exitoso
                // log.audit('PROCESO EXITOSO', `Cliente: ${idCliente}, Bien: ${idBien}`);
                return JSON.stringify({
                    success: true,
                    idCliente: idCliente,
                    identificacion: resultadoCliente?.identificacion,
                    idBien: idBien,
                    bien: resultadoBien2?.nombre,
                    resultado_Cliente: resultadoCliente?.mensaje || "Procesado exitosamente",
                    resultado_Bien: resultadoBien2?.mensaje || "Procesado exitosamente",
                    // observacion_General: ""
                });

            } else {
                // No se obtuvo ID del cliente
                // log.error('FALLO', `No se obtuvo ID del cliente. Respuesta: ${JSON.stringify(resultadoCliente)}`);
                return JSON.stringify({
                    success: false,
                    idCliente: 0,
                    identificacion: resultadoCliente?.identificacion || null,
                    idBien: 0,
                    bien: null,
                    resultado_Cliente: (resultadoCliente?.mensaje || "No se pudo procesar el cliente") + ". Detalle técnico: ID retornado = 0",
                    resultado_Bien: "No se procesó el bien",
                    // observacion_General: ""
                });
            }

        } catch (error) {
            // log.error('ERROR GENERAL EN _post', error);
            return JSON.stringify({
                success: false,
                idCliente: 0,
                identificacion: null,
                idBien: 0,
                bien: null,
                resultado_Cliente: `Error al procesar la solicitud. Detalle técnico: ${error.message}`,
                resultado_Bien: "No se pudo procesar",
                // observacion_General: ""
            });
        }
    }

    ///////////////////////////////////////////////////////////////////////
    function clienteN8n(context) {
        try {
            // log.debug('Request clienteN8n', context);

            const isperson = context.isperson;
            const primernombre = (context.primernombre || '').toUpperCase();
            const segundonombre = (context.segundonombre || '').toUpperCase();
            const primerapellido = (context.primerapellido || '').toUpperCase();
            const segundoapellido = (context.segundoapellido || '').toUpperCase();
            const subsidiaria = runtime.getCurrentUser().subsidiary;

            // log.audit('Subsidiaria', subsidiaria);

            // Búsquedas iniciales
            // const busquedadocumento = consultaGeneralCliente(context.document_type, "CUSTOMRECORD_EC_DOCUMENT_TYPE", "TDOC", subsidiaria);
            const busquedapais = consultaGeneralCliente(context.pais_entidad, "CUSTOMRECORD_TS_EC_PE_PAIS", "PAIS", subsidiaria);

            const accion = context?.accion?.toLowerCase() || null;
            let respuesta;

            switch (accion) {
                case CREAR:
                    try {
                        let identificacionCliente = limpiarIdentificacion(context.entityid);
                        // log.debug("identificacionCliente", identificacionCliente);
                        let dataCliente = DatosCliente(identificacionCliente);
                        // log.debug("Cliente Encontrado", dataCliente);

                        if (dataCliente[0]?.ID_INTERNO) {
                            return {
                                id: dataCliente[0].ID_INTERNO,
                                identificacion: context.entityid,
                                mensaje: "No se Creo, Registro existente"
                            };
                        }

                        // Crear registro de cliente
                        const objRecord = record.create({
                            type: record.Type.CUSTOMER,
                            isDynamic: true
                        });
                        objRecord.setValue({ fieldId: 'subsidiary', value: subsidiaria });

                        let ejecutivaID = 468435; // Valor por defecto si no se encuentra

                        // Campos principales
                        objRecord.setValue({ fieldId: 'entityid', value: context.entityid });
                        objRecord.setValue({ fieldId: 'customform', value: context.customform });
                        objRecord.setValue({ fieldId: 'entitystatus', value: context.entitystatus });

                        if (context.salesrep) { ejecutivaID = getApiData(context.salesrep); }
                        objRecord.setValue({ fieldId: 'salesrep', value: ejecutivaID });

                        // log.audit("json", context);
                        let category = _toolkit.executeQuery("SELECT name, id FROM customercategory WHERE name LIKE ?", [`%${context.category.trim()}%`]);

                        // log.debug("category", category);
                        if (category) {
                            objRecord.setValue({ fieldId: 'category', value: category[0].id });
                        } else {
                            objRecord.setValue({ fieldId: 'category', value: 1 });
                        }

                        let localidadEjecutiva = obtenerUnDato("employee", "location", ejecutivaID)

                        log.audit("localidadEjecutiva", localidadEjecutiva);

                        let busquedaoficina = consultaGeneralCliente(localidadEjecutiva ? localidadEjecutiva.toUpperCase() : "GUAYAQUIL", "Location", "LOCT", subsidiaria);
                        if (busquedaoficina == 0) {
                            busquedaoficina = consultaGeneralCliente("GUAYAQUIL", "Location", "LOCT", subsidiaria);
                        }

                        objRecord.setValue({ fieldId: 'custentity_ht_cl_oficinacliente', value: busquedaoficina });
                        if (context.vatregnumber.length < 10) {
                            objRecord.setValue({ fieldId: 'custentity_ec_document_type', value: 3 }); // PASAPORTE
                        } else if (context.vatregnumber.length == 10) {
                            objRecord.setValue({ fieldId: 'custentity_ec_document_type', value: 2 }); // CÉDULA
                        } else if (context.vatregnumber.length == 13) {
                            objRecord.setValue({ fieldId: 'custentity_ec_document_type', value: 1 }); // RUC
                        } else {
                            throw new Error("La identificación no cumple con la longitud requerida.");
                        }
                        objRecord.setValue({ fieldId: 'vatregnumber', value: context.vatregnumber });
                        objRecord.setValue({ fieldId: 'custentity_ts_ec_tipo_persona', value: context.tipo_persona });
                        objRecord.setValue({ fieldId: 'custentityts_ec_pais_entidad', value: busquedapais });
                        objRecord.setValue({ fieldId: 'custentity_ec_obligado_contabilidad', value: "1" });

                        // BLOQUE DE DIRECCION
                        const items = context.addressbook || [];
                        // log.debug('items direccion', items);

                        for (let i in items) {
                            const busquedatipodireccion = consultaGeneralCliente(items[i].custrecord_ht_direccion_tipo, "customlist_ht_tipodireccion", "TDIR", subsidiaria);
                            const busquedaprovincia = consultaGeneralCliente(items[i].custrecord_ec_provincia, "CUSTOMRECORD_EC_RECORD_PROVINCIA", "PROV", subsidiaria);
                            const valorcanton = items[i].custrecord_ec_canton + ';' + busquedaprovincia;
                            const busquedacanton = consultaGeneralCliente(valorcanton, "CUSTOMRECORD_EC_RECORD_CANTON", "CANT", subsidiaria);
                            const valorparroquia = items[i].custrecord_ec_parroquia + ';' + busquedacanton + ';' + items[i].custrecord_ec_provincia;
                            const busquedaparroquia = consultaGeneralCliente(valorparroquia, "CUSTOMRECORD_EC_RECORD_PARROQUIA", "PARR", subsidiaria);

                            objRecord.selectNewLine({ sublistId: 'addressbook' });

                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'defaultshipping',
                                value: true
                            });

                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'defaultbilling',
                                value: true
                            });

                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'label',
                                // value: items[i].addr1
                                value: (items[i]?.addr1 || '').substring(0, 140)
                            });

                            const dire = objRecord.getCurrentSublistSubrecord({
                                sublistId: 'addressbook',
                                fieldId: 'addressbookaddress'
                            });

                            if (!items[i]?.addressee || !items[i]?.addressee) {
                                throw new Error("Verifique el Campo DIRECCION")
                            }

                            const direccion = items[i].addressee + ' ' + items[i].addr1 + ' Guayaquil' + ' Ecuador';
                            dire.setValue({ fieldId: 'addr1', value: (items[i]?.addr1 || '').substring(0, 140), ignoreFieldChange: true });
                            dire.setValue({ fieldId: 'addressee', value: (items[i]?.addressee || '').substring(0, 98), ignoreFieldChange: true });
                            dire.setValue({ fieldId: 'custrecord_ec_provincia', value: busquedaprovincia, ignoreFieldChange: false });
                            dire.setValue({ fieldId: 'custrecord_ec_canton', value: busquedacanton, ignoreFieldChange: false });
                            dire.setValue({ fieldId: 'custrecord_ec_parroquia', value: busquedaparroquia, ignoreFieldChange: false });
                            dire.setValue({ fieldId: 'custrecord_ht_direccion_tipo', value: busquedatipodireccion, ignoreFieldChange: true });
                            dire.setValue({ fieldId: 'addressbookaddress_text', value: direccion, ignoreFieldChange: true });
                            dire.setValue({ fieldId: 'custrecord_direccion_zonaciudadela', value: items[i].custrecord_direccion_zonaciudadela, ignoreFieldChange: true });

                            objRecord.commitLine({ sublistId: 'addressbook' });
                        }

                        // MAIL - Validación de valores vacíos
                        const itemsMail = context.correo || [];
                        for (let i in itemsMail) {
                            if (itemsMail[i].email && itemsMail[i].email.trim() !== '') {
                                if (itemsMail[i].principal) {
                                    objRecord.setValue({ fieldId: 'email', value: itemsMail[i].email });
                                } else {
                                    objRecord.setValue({ fieldId: 'altemail', value: itemsMail[i].email });
                                }
                            } else {
                                // log.debug('Email vacío ignorado', 'Índice: ' + i);
                            }
                        }

                        // Telefono - Validación de valores vacíos
                        let itemsTelefono = context.telefono || [];
                        // log.debug('items Telefono', itemsTelefono);

                        // Variable para controlar si se asignó al menos un teléfono principal
                        let telefonoPrincipalAsignado = false;

                        for (let i in itemsTelefono) {
                            // Validar que el teléfono no esté vacío
                            if (!itemsTelefono[i].telefono || itemsTelefono[i].telefono.trim() === '') {
                                // log.debug('Teléfono vacío ignorado', 'Índice: ' + i);
                                continue; // Saltar este teléfono y continuar con el siguiente
                            }

                            const busquedatipotelefono = consultaGeneralCliente(itemsTelefono[i].tipo, "customrecordht_registro_tipo_telefono", "TTEL", subsidiaria);

                            // Asignar teléfonos a campos principales solo si hay valor
                            if (itemsTelefono[i]?.principal && !telefonoPrincipalAsignado) {
                                objRecord.setValue({ fieldId: 'phone', value: itemsTelefono[i].telefono });
                                objRecord.setValue({ fieldId: 'homephone', value: itemsTelefono[i].telefono });
                                objRecord.setValue({ fieldId: 'mobilephone', value: itemsTelefono[i].telefono });
                                telefonoPrincipalAsignado = true;
                            } else if (!telefonoPrincipalAsignado) {
                                // Si no hay teléfono principal aún, asignar el primero disponible
                                objRecord.setValue({ fieldId: 'mobilephone', value: itemsTelefono[i].telefono });
                                objRecord.setValue({ fieldId: 'homephone', value: itemsTelefono[i].telefono });
                            }

                            // Agregar a la sublista solo si hay valor válido
                            objRecord.selectNewLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                            objRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono',
                                fieldId: 'custrecord_ht_campo_list_tipo_telefono',
                                value: busquedatipotelefono
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono',
                                fieldId: 'custrecord_ht_campo_txt_principal',
                                value: itemsTelefono[i].principal
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono',
                                fieldId: 'custrecord_ht_campo_txt_telefono',
                                value: itemsTelefono[i].telefono
                            });
                            objRecord.commitLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                        }

                        // Si no se encontró ningún teléfono válido, registrar advertencia
                        if (!telefonoPrincipalAsignado && itemsTelefono.length > 0) {
                            // log.audit('Advertencia', 'No se encontró ningún teléfono válido para asignar');
                        }

                        // Configurar nombres
                        objRecord.setValue({ fieldId: 'isperson', value: isperson, ignoreFieldChange: true });

                        let altname;
                        if (isperson == "T") {
                            altname = primernombre + ' ' + segundonombre + ' ' + primerapellido + ' ' + segundoapellido;
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_primernombre', value: primernombre });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_segundonombre', value: segundonombre });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_apellidopaterno', value: primerapellido });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_apellidomaterno', value: segundoapellido });
                            objRecord.setValue({ fieldId: 'lastname', value: primerapellido + ' ' + segundoapellido });
                            objRecord.setValue({ fieldId: 'firstname', value: primernombre + ' ' + segundonombre });
                            objRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || "" });
                            objRecord.setValue({ fieldId: 'companyname', value: altname?.toUpperCase() || "" });
                        } else {
                            altname = (context.companyname || '').replace(',', ' ');
                            objRecord.setValue({ fieldId: 'companyname', value: altname });
                            objRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || "" });
                            objRecord.setValue({ fieldId: 'firstname', value: altname });
                        }

                        objRecord.setValue({ fieldId: 'receivablesaccount', value: 1425 })

                        log.debug("objRecord", objRecord)

                        // Guardar cliente
                        const recordId = objRecord.save({ ignoreMandatoryFields: false });

                        // Crear registros de email personalizados - con validación
                        log.debug('items mail', itemsMail);
                        for (let i in itemsMail) {

                            try {
                                if (!itemsMail[i].email || itemsMail[i].email.trim() === '') {
                                    // log.debug('Email vacío, no se crea registro personalizado', 'Índice: ' + i);
                                    continue;
                                }

                                const busquedatipomail = consultaGeneralCliente(itemsMail[i].tipo, "customlist_ht_email_tipoemail", "TMAIL", subsidiaria);

                                const objRecordMail = record.create({
                                    type: 'customrecord_ht_record_correoelectronico',
                                    isDynamic: true
                                });

                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_subsidiaria', value: subsidiaria });
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_email', value: itemsMail[i].email });
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_emailprincipal', value: itemsMail[i].principal });
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_tipoemail', value: busquedatipomail });
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_ce_enlace', value: recordId });

                                log.debug("objRecordMail-----", objRecordMail);

                                objRecordMail.save({ ignoreMandatoryFields: true });

                            } catch (error) {
                                log.debug('Error al crear registro de email personalizado', error.stack);
                            }
                            // Validar que el email no esté vacío antes de crear el registro
                        }

                        log.audit('Cliente creado', recordId);

                        try {
                            crearNotaNetsuite({
                                recordId: null,
                                titulo: 'PROCESO AUT CORREO',
                                mensaje: 'CREACION',
                                recordtype: null,
                                entity: recordId
                            });
                        } catch (error) {
                            log.debug("CA", error)
                        }

                        respuesta = {
                            idInterno: recordId,
                            identificacion: context.entityid,
                            mensaje: "Creado exitosamente"
                        };

                    } catch (error) {
                        log.error('Error al crear--', error.stack);
                        respuesta = {
                            id: 0,
                            identificacion: context.entityid,
                            mensaje: "No se pudo crear: " + error.message
                        };

                        if (respuesta?.mensaje?.startsWith("No se pudo crear: Ya existe una Cliente")) {
                            let identificacionCliente = limpiarIdentificacion(context.entityid);
                            // log.debug("identificacionCliente", identificacionCliente);
                            let dataCliente = DatosCliente(identificacionCliente);
                            // log.debug("Cliente Encontrado", dataCliente);

                            respuesta = {
                                id: dataCliente[0].ID_INTERNO,
                                identificacion: context.entityid,
                                mensaje: "No se Creo, Registro existente"
                            };
                        }
                    }

                    break;
                default:
                    respuesta = { id: 0, identificacion: context.entityid, mensaje: "Verifique la acción. Debe ser 'crear'" };
                    break;
            }

            return respuesta;

        } catch (error) {
            log.error('Error en POST', error.stack);
            return JSON.stringify({
                results: {
                    id: 0,
                    identificacion: context.entityid,
                    mensaje: "Error: " + error.message
                }
            });
        }
    }

    function esNumeroString(valor) {
        return !isNaN(valor) && !isNaN(parseFloat(valor));
    }

    // (context.document_type, "CUSTOMRECORD_EC_DOCUMENT_TYPE", "TDOC", subsidiaria);
    const consultaGeneralCliente = (valor, tabla, tipo, subsidiaria) => {
        try {
            var codigocanton = "";
            var provincia = "";
            var codigoprovincia = "";
            if (tipo == 'PARR') {
                valor.split(";")
                if (valor?.includes(";") || false) {
                    let array = valor.split(";")
                    valor = array[0].toUpperCase();
                    codigocanton = array[1].toUpperCase();
                    provincia = array[2].toUpperCase();
                }
            }
            if (tipo == 'CANT') {
                valor.split(";")
                if (valor?.includes(";") || false) {
                    let array = valor.split(";")
                    valor = array[0].toUpperCase();
                    codigoprovincia = array[1].toUpperCase();
                }
            }
            valor = valor.toUpperCase();
            filtersAux = []
            let bandera = false;
            if (tipo == 'CANT' || tipo == "PROV" || tipo == "PARR") {
                valor = capitalizarPrimeraLetra(valor);
                //// log.debug(tipo, valor);
            }
            if (esNumeroString(valor)) {
                filtersAux = [["isinactive", "anyof", "F"], "AND",
                ["internalid", "anyof", valor]]
            } else {
                if (tipo == 'TDOC') {
                    bandera = true;
                    filtersAux = [["isinactive", "is", false], "AND",
                    ["name", "is", valor]]
                } else if (tipo == 'CANT') {
                    bandera = true;
                    filtersAux = [["isinactive", "anyof", "F"], "AND",
                    ["name", "is", valor], "AND",
                    ["custrecord_ec_cc_nombreprovincia", "is", codigoprovincia]
                    ]
                } else {
                    bandera = true;
                    filtersAux = [["isinactive", "anyof", "F"], "AND",
                    ["name", "is", valor]]
                }
            }
            // if (tipo=='CANT' ){
            //     // log.debug("cant.......valor.......", valor);
            //    // log.debug("cant........prov......", codigoprovincia);   
            // }  

            const busquedaSearchObj = search.create({
                type: tabla,
                filters: filtersAux,
                columns: [{ name: "internalid" },
                { name: "name" },],
            });
            const myPagedData = busquedaSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        //campo: result.getValue({ name: campo}),
                        idInternal: result.getValue({ name: "internalid" }),
                        descripcion: result.getValue({ name: "name" }),
                    });
                });
            });
            var theCount = busquedaSearchObj.runPaged().count;
            //// log.debug(tabla, respuesta);          
            if (theCount == 0) {
                //valores se envian por defecto
                if (tipo == "PAIS") {
                    bandera = false;
                }
                respuesta.push({
                    idInternal: 0,
                    descripcion: "",
                });
            }
            // if (tipo=="COLF" || tipo=="COLM" || tipo=="COLC"){
            //     //// log.debug(tabla, respuesta[0]);
            //     if (( respuesta[0]?.idInternal || "0")=="0"){
            //         bandera=true
            //     }  else {
            //         bandera=false
            //     } 
            // } 
            if (bandera) {
                //if (theCount != 1) {
                if (theCount == 0) {
                    //// log.debug(tabla, "Nuevo Registro.....");
                    respuesta = [];
                    var creardatos = record.create({ type: tabla });
                    creardatos.setValue({
                        fieldId: "name",
                        value: valor,
                    });
                    switch (tipo) {
                        //TIPO DE DOCUMENTO
                        case "TDOC":
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cod_doc_type",
                                value: "00",
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ec_country_doc_type",
                                value: "63",
                            });
                            //bandera=true;
                            break;
                        //TIPO DIRECCION
                        case "TDIR":
                            break;
                        //TIPO MAIL
                        case "TMAIL":
                            break;
                        //TIPO TELEFONO
                        case "TTEL":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_codigo_telefono",
                                value: "00",
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_descripcion_tipo_telefono",
                                value: valor,
                            });
                            break;
                        //PARROQUIA
                        case "PARR":
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_nombrecanton",
                                value: codigocanton,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_codigoparroquia",
                                value: "00",
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_nombreprovincia",
                                value: provincia,
                            });
                            break;
                        //PROVINCIA
                        case "PROV":
                            break;
                        //CANTON
                        case "CANT":
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cc_nombreprovincia",
                                value: codigoprovincia,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cc_codigocanton",
                                value: "0",
                            });
                            break;
                        default: break;
                    }
                    indice = creardatos.save();
                    // // log.debug(tabla, indice);
                    respuesta.push({
                        idInternal: indice,
                        descripcion: valor,
                    });
                    //respuesta = CrearRegistro(tabla,valor, valor2,tipo);
                    // log.debug(tabla, respuesta);
                }
            }
            return (respuesta[0]?.idInternal || "0");
        } catch (e) {
            // log.error(tabla, e);
            return 0;
        }
    };

    function capitalizarPrimeraLetra(cadena) {
        try {
            return cadena.split(' ').map(palabra => {
                return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
            }).join(' ');
        } catch (error) {
            console.error("Error al capitalizar la cadena:", error);
            return cadena; // Devuelve la cadena original en caso de error
        }
    }

    function limpiarIdentificacion(id) {
        return id.replace("C-EC-", "");
    }

    function DatosCliente(identificacion) {
        try {
            let resultado = [];

            if (identificacion == null || identificacion == "") {
                throw new Error("No se ha proporcionado el código del cliente, datosCliente");
            }

            let searchObj = search.create({
                type: "customer",
                filters: [
                    ["vatregnumber", "is", identificacion],
                ],
                columns: [
                    search.createColumn({ name: "internalid", label: "ID" }),
                    search.createColumn({ name: "altname", label: "Nombre" })
                ],

            });

            searchObj.run().each(function (result) {
                resultado.push({
                    ID_INTERNO: result.getValue({ name: "internalid" }),
                    NOMBRE_COMPLETO: result.getValue({ name: "altname" }),
                });
                return true;
            });

            if (resultado && resultado?.length > 0) {
                return resultado;
            } else {
                throw new Error("No se encontraron resultados para el cliente proporcionado");
            }

        } catch (error) {
            return [{ "ID_INTERNO": 0, "NOMBRE_COMPLETO": "" }];
        }
    }
    ///////////////////////////////////////////////////////////////////////


    ///////////////////////////////////////////////////////////////////////
    function bienN8n(context, ide) {
        try {
            log.debug('--Request bienN8n--', context);

            const vatregnumber = ide;
            const customerform = context.customerform;
            const subsidiaria = runtime.getCurrentUser().subsidiary;
            const accion = context?.accion?.toLowerCase() || null;

            // Validar acción  
            if (accion !== CREAR) {
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Acción no válida: "${accion}". Use "crear"`
                };
            }

            // 1. Buscar Cliente (debe existir y ser único)
            // log.debug('PASO 1: Buscando cliente', { vatregnumber });
            let idCliente;
            try {
                idCliente = buscarCliente(vatregnumber);
                // log.debug('Cliente encontrado', { idCliente });

                if (!idCliente || idCliente === 0) {
                    return {
                        id: 0,
                        nombre: context?.altname || "",
                        mensaje: `No se encontró cliente con identificación: ${vatregnumber}`
                    };
                }
            } catch (errorCliente) {
                // log.error('Error en buscarCliente', errorCliente);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al buscar cliente - ${errorCliente.message}`
                };
            }

            // 2. Obtener todos los catálogos
            // log.debug('PASO 2: Obteniendo catálogos básicos');
            let catalogos;
            try {
                catalogos = obtenerCatalogosBasicos(context, subsidiaria);
                // log.debug('Catálogos obtenidos', catalogos);
            } catch (errorCatalogos) {
                // log.error('Error en obtenerCatalogosBasicos', errorCatalogos);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener catálogos básicos - ${errorCatalogos.message}`
                };
            }

            // -----------------{"marca":"666","codigoMarca":"756","modelo":"22243","tipo":"74803"}

            // log.debug('PASO 3: Obteniendo marca, modelo y tipo');
            let marcaModelo;
            try {
                marcaModelo = obtenerMarcaModeloTipo(context, subsidiaria);
                log.debug('Marca/Modelo obtenidos', marcaModelo);
            } catch (errorMarca) {
                // log.error('Error en obtenerMarcaModeloTipo', errorMarca);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener marca/modelo - ${errorMarca.message}`
                };
            }

            // log.debug('PASO 4: Obteniendo características del vehículo');
            let caracteristicas;
            try {
                caracteristicas = obtenerCaracteristicasVehiculo(context, subsidiaria);
                log.debug('Características obtenidas', caracteristicas);
            } catch (errorCaract) {
                // log.error('Error en obtenerCaracteristicasVehiculo', errorCaract);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener características - ${errorCaract.message}`
                };
            }

            // log.debug('PASO 5: Obteniendo configuraciones adicionales');
            let configuraciones;
            try {
                configuraciones = obtenerConfiguracionesAdicionales(context, subsidiaria);
                log.debug('Configuraciones obtenidas', configuraciones);
            } catch (errorConfig) {
                // log.error('Error en obtenerConfiguracionesAdicionales', errorConfig);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener configuraciones. - ${errorConfig.message}`
                };
            }

            // log.debug('PASO 6: Obteniendo canales de distribución');
            let canales;
            try {
                canales = obtenerCanalesDistribucion(context, subsidiaria);
                // log.debug('Canales obtenidos', canales);
            } catch (errorCanales) {
                // log.error('Error en obtenerCanalesDistribucion', errorCanales);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener canales - ${errorCanales.message}`
                };
            }

            let convenio = "";
            try {
                convenio = obtenerDatosConvenio(context, subsidiaria);

                log.debug('Convenio antes de validación', convenio);

                if (!convenio?.convenio || convenio?.convenio === "" || convenio?.convenio == "0") {
                    convenio = false;
                }

                log.debug('Convenio obtenido', convenio);
            } catch (errorConvenio) {
                // log.error('Error en obtenerDatosConvenio', errorConvenio);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al obtener convenio - ${errorConvenio.message}`
                };
            }

            // log.debug('PASO 7: Evaluación de Registro Duplicado');
            let objBien;
            try {
                objBien = validateBien(context.placa, context.motor, context.chasis);
                // log.debug('Resultado validación duplicado', objBien);

                if (objBien && objBien.internalid) {
                    // log.audit('Registro Duplicado Encontrado', objBien);
                    return {
                        id: objBien.internalid,
                        nombre: context.altname,
                        mensaje: "No se creó, Registro Existente"
                    };
                } else {
                    // log.debug('No se encontró duplicado, continuando...');
                }
            } catch (errorValidate) {
                // log.error('Error en validateBien', errorValidate);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al validar duplicados - ${errorValidate.message}`
                };
            }

            // 3. Crear el registro de bien en NetSuite
            // log.debug('PASO 8: Creando nuevo registro de bien');
            let registroBien;
            try {
                registroBien = record.create({
                    type: "customrecord_ht_record_bienes",
                    isDynamic: true
                });
                // log.debug('Registro de bien creado en memoria');
            } catch (errorCreate) {
                // log.error('Error al crear registro en memoria', errorCreate);
                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al crear registro de bien - ${errorCreate.message}`
                };
            }

            // 4. Preparar todos los datos obtenidos para llenar el registro
            const todosLosDatos = {
                datosOriginales: context,
                idCliente: idCliente,
                idSubsidiaria: subsidiaria,
                formulario: customerform,
                catalogosBasicos: catalogos,
                datosVehiculo: {
                    marcaModelo: marcaModelo,
                    caracteristicas: caracteristicas,
                    configuraciones: configuraciones
                },
                canalesDistribucion: canales,
                datosConvenio: convenio
            };

            // log.debug('PASO 9: Estableciendo campos del bien');
            try {
                establecerCamposBien(registroBien, todosLosDatos);
                // log.debug('Campos establecidos correctamente');
            } catch (errorCampos) {
                // log.error('Error al establecer campos', errorCampos);

                // Intentar extraer el nombre del campo del error
                let campoFaltante = "desconocido";
                if (errorCampos.message && errorCampos.message.includes("field")) {
                    const match = errorCampos.message.match(/field[:\s]+([a-zA-Z0-9_]+)/i);
                    if (match) {
                        campoFaltante = match[1];
                    }
                }

                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `${errorCampos.message}`
                };
            }

            // 5. Guardar el registro en NetSuite
            // log.debug('PASO 10: Guardando el bien en la base de datos');
            let idBienCreado;
            try {
                idBienCreado = registroBien.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });

                try {
                    crearNotaNetsuite({
                        recordId: idBienCreado,
                        titulo: 'PROCESO AUT CORREO',
                        mensaje: 'CREACION',
                        recordtype: 698,
                        entity: null
                    });
                } catch (error) {
                    log.debug("CA", error)
                }

                // log.audit('Bien guardado exitosamente', { idBien: idBienCreado });
            } catch (errorSave) {
                // log.error('Error al guardar registro', errorSave);

                // Intentar extraer información del campo que falta
                let mensajeDetallado = errorSave.message;
                let campoProblematico = "desconocido";

                // Buscar patrones comunes en errores de NetSuite
                if (mensajeDetallado.includes("field") || mensajeDetallado.includes("campo")) {
                    const patterns = [
                        /field[:\s]+([a-zA-Z0-9_]+)/i,
                        /campo[:\s]+([a-zA-Z0-9_]+)/i,
                        /([a-zA-Z0-9_]+)\s+debe contener/i,
                        /([a-zA-Z0-9_]+)\s+is required/i
                    ];

                    for (let pattern of patterns) {
                        const match = mensajeDetallado.match(pattern);
                        if (match && match[1]) {
                            campoProblematico = match[1];
                            break;
                        }
                    }
                }

                return {
                    id: 0,
                    nombre: context?.altname || "",
                    mensaje: `Error al guardar bien. Campo obligatorio faltante o inválido: ${campoProblematico}. Detalle técnico: registroBien.save - ${mensajeDetallado}`
                };
            }

            return {
                id: idBienCreado,
                nombre: context.altname,
                mensaje: "Creado exitosamente"
            };

        } catch (error) {
            // log.error('ERROR GENERAL en bienN8n', error);

            return {
                id: 0,
                nombre: context?.altname || "",
                mensaje: `Error general al crear bien. Detalle técnico: ${error.message}`
            };
        }
    }

    function buscarCliente(vatregnumber) {
        const busquedaCustomer = search.create({
            type: search.Type.CUSTOMER,
            columns: ['internalid'],
            filters: ['vatregnumber', search.Operator.IS, vatregnumber]
        });

        const resultados = busquedaCustomer.run().getRange({ start: 0, end: 2 });
        const totalResultados = resultados.length;

        if (totalResultados === 0) {
            throw new Error(`Cliente no encontrado con identificación: ${vatregnumber}`);
        }

        if (totalResultados > 1) {
            throw new Error(`Se encontraron ${totalResultados} clientes con la misma identificación: ${vatregnumber}. Contacte al administrador.`);
        }

        return resultados[0].getValue('internalid');
    }

    function obtenerCatalogosBasicos(context, subsidiaria) {
        // Tipo de Bien
        let tipoBien = ConsultaGeneralBien(context.tipobien, "CUSTOMRECORD_HT_BIEN_TIPOBIEN", "TIBN", subsidiaria);
        if (tipoBien === 0) {
            tipoBien = ConsultaGeneralBien("TERRESTRE", "CUSTOMRECORD_HT_BIEN_TIPOBIEN", "TIBN", subsidiaria);
        }

        // Tipo Terrestre
        let tipoTerrestre;
        if (esNumeroString(context.tipoterrestre)) {
            tipoTerrestre = ConsultaTipoTerrestre(tipoBien, context.tipoterrestre, "", "CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE", subsidiaria);
        } else {
            tipoTerrestre = ConsultaTipoTerrestre(tipoBien, "", context.tipoterrestre, "CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE", subsidiaria);
        }

        // Estado del Bien
        let estadoBien = ConsultaGeneralBien(context.estadobien, "CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN", "ESBN", subsidiaria);
        if (estadoBien === 0) {
            estadoBien = ConsultaGeneralBien("VIGENTE", "CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN", "ESBN", subsidiaria);
        }

        // Orígenes
        const origen = ConsultaGeneralBien(context.origen, "CUSTOMLIST_HT_BN_TIPODEORIGENBIEN", "TOBN", subsidiaria);
        const origenVehiculo = ConsultaGeneralBien(context.origenvehiculo, "CUSTOMRECORD_HT_BN_TIPO_ORIGEN", "TORG", subsidiaria);


        return {
            tipoBien,
            tipoTerrestre,
            estadoBien,
            origen,
            origenVehiculo
        };
    }

    function obtenerMarcaModeloTipo(context, subsidiaria) {
        // Marca

        log.debug('AAAContext marca', context.marca);
        const marca = ConsultaGeneralBien(context.marca, "CUSTOMRECORD_HT_BIEN_MARCA", "MARC", subsidiaria);

        log.debug('Marca encontrada', marca);

        const codigoMarca = ConsultaCodMarca(context.marca, "CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria);

        log.debug('codigoMarca encontrada', { marca, codigoMarca });

        // Modelo
        let modelo;
        if (esNumeroString(context.modelo)) {
            modelo = ConsultaModelo(marca, context.modelo, "", "CUSTOMRECORD_HT_BN_MODELO", subsidiaria, codigoMarca);
        } else {
            modelo = ConsultaModelo(marca, "", context.modelo, "CUSTOMRECORD_HT_BN_MODELO", subsidiaria, codigoMarca);
        }
        log.debug('Modelo encontrado', modelo);

        // Tipo
        let tipo;
        if (esNumeroString(context.tipo)) {
            tipo = ConsultaTipoVehiculo(marca, modelo, context.tipo, "", "CUSTOMRECORD_HT_RECORD_TIPOVEHICULO", subsidiaria);
        } else {
            tipo = ConsultaTipoVehiculo(marca, modelo, "", context.tipo, "CUSTOMRECORD_HT_RECORD_TIPOVEHICULO", subsidiaria);
        }
        // log.debug('Tipo encontrado', tipo);

        return { marca, codigoMarca, modelo, tipo };
    }

    function obtenerCaracteristicasVehiculo(context, subsidiaria) {

        let transmision
        try {
            transmision = ConsultaGeneralBien(context.transmision, "CUSTOMRECORD_HT_BN_TRANSMISION", "TRAN", subsidiaria);
            if (!transmision) { transmision = "AUTOMATICA" }
        } catch (error) {
            transmision = "AUTOMATICA"
        }

        const colorCarseg = ConsultaGeneralBien(context.colorcarseg, "CUSTOMRECORD_HT_BN_COLORCARSEG", "COLC", subsidiaria);
        const colorFabricante = ConsultaGeneralBien(context.colorfabricante, "CUSTOMRECORD_HT_BN_COLORFABRICANTE", "COLF", subsidiaria);
        const colorMatricula = ConsultaGeneralBien(context.colormatricula, "CUSTOMRECORD_HT_BN_COLORMATRICULA", "COLM", subsidiaria);
        const version = ConsultaGeneralBien(context.version, "CUSTOMRECORD_HT_RECORD_VERSION", "VERS", subsidiaria);
        const tipoCabina = ConsultaGeneralBien(context.tipocabina, "CUSTOMRECORD_HT_BN_TIPOCABINA", "TCAB", subsidiaria);
        const cilindraje = ConsultaGeneralBien(context.cilindraje, "CUSTOMRECORD_HT_RECORD_CILINDRAJE", "CILI", subsidiaria);
        const traccion = ConsultaGeneralBien(context.traccion, "CUSTOMRECORD_HT_BN_TRACCION", "TRAC", subsidiaria);
        const combustible = ConsultaGeneralBien(context.combustible, "CUSTOMRECORD_HT_BN_TIPOCOMBUSTIBLE", "TCOM", subsidiaria);

        // Aire Acondicionado con valor por defecto
        let aireAcondicionado = ConsultaGeneralBien(context.aireacondicionado, "CUSTOMRECORD_HT_BIEN_AIREACONDICIONADO", "AIRE", subsidiaria);
        if (aireAcondicionado === 0) {
            aireAcondicionado = ConsultaGeneralBien("SI", "CUSTOMRECORD_HT_BIEN_AIREACONDICIONADO", "AIRE", subsidiaria);
        }

        return {
            transmision,
            colorCarseg,
            colorFabricante,
            colorMatricula,
            version,
            tipoCabina,
            cilindraje,
            traccion,
            combustible,
            aireAcondicionado
        };
    }

    function obtenerConfiguracionesAdicionales(context, subsidiaria) {
        // Tipo Flota con valor por defecto
        let tipoFlota = ConsultaGeneralBien(context.tipoflota, "CUSTOMRECORD_HT_RECORD_TIPOFLOTA", "TFLO", subsidiaria);
        if (tipoFlota === 0) {
            tipoFlota = ConsultaGeneralBien("OTROS", "CUSTOMRECORD_HT_RECORD_TIPOFLOTA", "TFLO", subsidiaria);
        }

        // Recorrido con valor por defecto
        let recorrido = ConsultaGeneralBien(context.recorrido, "CUSTOMRECORD_HT_RECORD_RECORRIDO", "RECO", subsidiaria);
        if (recorrido === 0) {
            recorrido = ConsultaGeneralBien("PERSONALES", "CUSTOMRECORD_HT_RECORD_RECORRIDO", "RECO", subsidiaria);
        }

        // Uso Vehículo con valor por defecto
        let usoVehiculo = ConsultaGeneralBien(context.usovehiculo, "CUSTOMRECORD_HT_BIEN_USOVEHICULO", "UVEH", subsidiaria);
        if (usoVehiculo === 0) {
            usoVehiculo = ConsultaGeneralBien("PERSONAL", "CUSTOMRECORD_HT_BIEN_USOVEHICULO", "UVEH", subsidiaria);
        }

        // Oficina con valor por defecto
        let oficina = ConsultaGeneralBien(context.oficina, "Location", "LOCT", subsidiaria);
        if (oficina === 0) {
            oficina = ConsultaGeneralBien("GUAYAQUIL", "Location", "LOCT", subsidiaria);
        }

        return {
            tipoFlota,
            recorrido,
            usoVehiculo,
            oficina
        };
    }

    function obtenerCanalesDistribucion(context, subsidiaria) {

        try {
            const concesionario = ConsultaCanal(2, context.concesionario, "customrecord_ht_record_canaldistribucion", subsidiaria, 914);
            const aseguradora = ConsultaCanal(1, context.aseguradora, "customrecord_ht_record_canaldistribucion", subsidiaria, 496);
            const financiera = ConsultaCanal(3, context.financiera, "customrecord_ht_record_canaldistribucion", subsidiaria, 1045);

            return {
                concesionario,
                aseguradora,
                financiera
            };

        } catch (error) {
            // log.debug("error---------------", error.stack)
        }

    }

    function obtenerDatosConvenio(context, subsidiaria) {
        let esConvenio = false;
        let convenio = null;
        // let estadoConvenio = null;

        log.debug('origenvehiculo--', context.convenio);
        convenio = ConsultaGeneralBien(context.convenio, "CUSTOMRECORD_HT_RECORD_CONVENIO", "CONV", subsidiaria);

        return {
            esConvenio,
            convenio,
            // estadoConvenio
        };
    }

    function establecerCamposBien(registroBien, datos) {

        // log.debug("establecerCamposBien--", datos.datosVehiculo)

        // Extraer los datos del objeto para mayor claridad
        const datosRequest = datos.datosOriginales;
        const idCliente = datos.idCliente;
        const idSubsidiaria = datos.idSubsidiaria;
        const formulario = datos.formulario;
        const catalogos = datos.catalogosBasicos;
        const marcaModeloTipo = datos.datosVehiculo.marcaModelo;
        const caracteristicas = datos.datosVehiculo.caracteristicas;
        const configuraciones = datos.datosVehiculo.configuraciones;
        const canales = datos.canalesDistribucion;
        const conveniodt = datos.datosConvenio;

        // Función auxiliar para establecer un campo con manejo de errores
        function setValorConLog(fieldId, value, nombreCampo) {
            try {
                // log.debug(`Estableciendo ${nombreCampo}`, { fieldId: fieldId, value: value });
                registroBien.setValue({ fieldId: fieldId, value: value });
            } catch (error) {
                log.error(`ERROR en campo ${nombreCampo}`, {
                    fieldId: fieldId,
                    value: value,
                    error: error.message
                });
                throw new Error(`Campo '${nombreCampo}' (${fieldId}) falló con valor: ${value}. Error: ${error.message}`);
            }
        }

        try {
            // === CAMPOS PRINCIPALES ===
            setValorConLog('customform', formulario, 'Formulario');
            setValorConLog('altname', datosRequest.altname, 'Nombre del Bien');
            setValorConLog('custrecord_ht_bien_propietario', idCliente, 'Propietario/Cliente');
            setValorConLog('custrecord_bn_subsidiaria', idSubsidiaria, 'Subsidiaria');

            // === CLASIFICACIÓN DEL BIEN ===
            setValorConLog('custrecord_ht_bien_tipobien', catalogos.tipoBien, 'Tipo de Bien');
            setValorConLog('custrecord_ht_bn_tipoorigen', catalogos.origen, 'Tipo de Origen');
            setValorConLog('custrecord_ht_bien_tipoterrestre', catalogos.tipoTerrestre, 'Tipo Terrestre');
            setValorConLog('custrecord_ht_bn_estadobien', catalogos.estadoBien, 'Estado del Bien');

            // === IDENTIFICACIÓN DEL VEHÍCULO ===
            setValorConLog('custrecord_ht_bien_placa', formatearPlaca(datosRequest.placa), 'Placa');

            if (datosRequest?.tipoterrestre == "MOTO") {
                setValorConLog('custrecord_ht_bien_placa', datosRequest.placa, 'Placa');
            }

            setValorConLog('custrecord_ht_bien_chasis', datosRequest.chasis, 'Chasis');
            setValorConLog('custrecord_ht_bien_motor', datosRequest.motor, 'Motor');

            // === MARCA, MODELO Y TIPO ===

            // log.debug("--------------------------", marcaModeloTipo)

            setValorConLog('custrecord_ht_bien_marca', marcaModeloTipo.marca, 'Marca');
            setValorConLog('custrecord_ht_bien_modelo', marcaModeloTipo.modelo, 'Modelo');

            // log.debug("--catalogos?.origenVehiculo--", catalogos?.origenVehiculo);
            // if (catalogos?.origenVehiculo) {
            //     setValorConLog('custrecord_ht_bn_tipori', catalogos.origenVehiculo, 'Origen Vehículo');
            // }

            setValorConLog('custrecord_ht_bien_tipo', marcaModeloTipo.tipo, 'Tipo de Vehículo');

            // === CARACTERÍSTICAS DEL VEHÍCULO ===
            setValorConLog('custrecord_ht_bien_caractadicional', datosRequest.caractadicional, 'Características Adicionales');
            setValorConLog('custrecord_ht_bien_numeropuertas', datosRequest.numeropuertas, 'Número de Puertas');
            setValorConLog('custrecord_ht_bien_transmision', caracteristicas.transmision, 'Transmisión');
            setValorConLog('custrecord_ht_bien_colorcarseg', caracteristicas.colorCarseg, 'Color Carseg');
            setValorConLog('custrecord_ht_bien_colorfabricante', caracteristicas.colorFabricante, 'Color Fabricante');
            setValorConLog('custrecord_ht_bien_colormatricula', caracteristicas.colorMatricula, 'Color Matrícula');
            setValorConLog('custrecord_bien_version', caracteristicas.version, 'Versión');
            setValorConLog('custrecord_ht_bien_tipocabina', caracteristicas.tipoCabina, 'Tipo de Cabina');

            // setValorConLog('custrecord_ht_bien_cilindraje', caracteristicas.cilindraje, 'Cilindraje');

            setValorConLog('custrecord_ht_bien_traccion', caracteristicas.traccion, 'Tracción');
            setValorConLog('custrecord_ht_bien_combustible', caracteristicas.combustible, 'Combustible');
            setValorConLog('custrecord_ht_bien_aireacondicionado', caracteristicas.aireAcondicionado, 'Aire Acondicionado');

            // === DATOS NUMÉRICOS ===
            setValorConLog('custrecord_ht_bien_kilometraje', datosRequest.kilometraje, 'Kilometraje');
            setValorConLog('custrecord_ht_bien_ano', datosRequest.anio, 'Año');
            setValorConLog('custrecord_ht_bien_avaluo', datosRequest.avaluo, 'Avalúo');
            setValorConLog('custrecord_ht_bien_tonelaje', datosRequest.tonelaje, 'Tonelaje');

            // === CONFIGURACIONES ADICIONALES ===
            setValorConLog('custrecord_ht_bien_codsysh', datosRequest.codigosys, 'Código SYS');
            setValorConLog('custrecord_ht_bien_generico', false, 'Genérico');
            setValorConLog('custrecord_ht_bien_tipoflota', configuraciones.tipoFlota, 'Tipo de Flota');
            setValorConLog('custrecord_ht_bien_clave', datosRequest.clave, 'Clave');
            setValorConLog('custrecord_ht_bien_recorrido', configuraciones.recorrido, 'Recorrido');
            setValorConLog('custrecord_ht_bien_usovehiculo', configuraciones.usoVehiculo, 'Uso del Vehículo');
            setValorConLog('custrecord_ht_bien_oficina', configuraciones.oficina, 'Oficina');

            // === CANALES DE DISTRIBUCIÓN ===

            log.debug('Canales a establecer', canales);

            setValorConLog('custrecord_ht_bien_consesionarios', canales.concesionario, 'Concesionario');
            // setValorConLog('custrecord_ht_bien_companiaseguros', 496, 'Compañía de Seguros');
            setValorConLog('custrecord_ht_bien_companiaseguros', canales.aseguradora, 'Compañía de Seguros');

            // setValorConLog('custrecord_ht_bien_financiadovehiculo', 1045, 'Financiera');
            setValorConLog('custrecord_ht_bien_financiadovehiculo', canales.financiera, 'Financiera');


            if (conveniodt) {
                try {
                    setValorConLog('custrecord_ht_bien_conveniovehiculo', conveniodt.convenio, 'Convenio');
                } catch (error) {
                    log.debug('No se estableció Convenio', error.stack);
                }
            }

            // === CONVENIO (Solo si aplica) ===
            // if (convenio.esConvenio) {
            //     setValorConLog('custrecord_ht_bien_conveniovehiculo', convenio.convenio, 'Convenio');
            //     setValorConLog('custrecord_ht_bien_estadoconvenio', convenio.estadoConvenio, 'Estado Convenio');
            // }

            // log.audit('Todos los campos establecidos correctamente', 'Total de campos configurados');

        } catch (error) {
            // Re-lanzar el error para que lo capture bienN8n
            throw error;
        }
    }

    function ConsultaCanal(TipoCanal, Criterio, tabla, subsidiaria, defecto) {
        try {
            let Resultado = [];
            let Canal = '';
            var detalle = "";
            var identificacion = Criterio;
            Criterio = Criterio.toUpperCase();
            switch (TipoCanal) {
                case 1: Canal = "Aseguradora"; break;
                case 2: Canal = "Concesionario"; break;
                case 3: Canal = "Financiera"; break;
                default: break;
            }
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    ["custrecord_ht_cd_tipocanal", "is", TipoCanal],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_ht_cd_subsidiaria", "anyof", subsidiaria]
                ],
                columns: ["internalid", "custrecord_ht_cd_ruccanaldistribucion", "custrecord_ht_cd_nombre", "name"]
            });

            if (Criterio != 0 && Criterio != '') {
                if (Criterio?.includes(";") || false) {
                    let array = Criterio.split(";")
                    identificacion = array[0].toUpperCase();
                    detalle = array[1].toUpperCase();
                }

                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_cd_ruccanaldistribucion',
                    operator: search.Operator.IS,
                    values: identificacion
                }));
            }
            let ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            for (let i in ResConsulta) {
                Resultado.push({
                    Id: ResConsulta[i].getValue("internalid"),
                    Canal: Canal,
                    RucCanal: ResConsulta[i].getValue("custrecord_ht_cd_ruccanaldistribucion"),
                    DescripcionCanal: ResConsulta[i].getValue("custrecord_ht_cd_nombre"),
                });
            }
            // if ((Resultado[0]?.Id || "0") == "0") {
            //     Resultado = [];
            //     //// log.debug(tabla, "Resultado......................");
            //     var creardatos = record.create({ type: tabla });
            //     creardatos.setValue({
            //         fieldId: "name",
            //         value: detalle,
            //     });
            //     creardatos.setValue({
            //         fieldId: "custrecord_ht_cd_nombre",
            //         value: detalle,
            //     });
            //     creardatos.setValue({
            //         fieldId: "custrecord_ht_cd_tipocanal",
            //         value: TipoCanal,
            //     });
            //     creardatos.setValue({
            //         fieldId: "custrecord_ht_cd_subsidiaria",
            //         value: "2",
            //     });
            //     creardatos.setValue({
            //         fieldId: "custrecord_ht_cd_ruccanaldistribucion",
            //         value: identificacion,
            //     });
            //     creardatos.setValue({
            //         fieldId: "custrecord_ht_cd_subsidiaria",
            //         value: subsidiaria,
            //     });
            //     indice = creardatos.save();
            //     //// log.debug(tabla, indice);
            //     Resultado.push({
            //         Id: indice,
            //         Canal: Canal,
            //         RucCanal: identificacion,
            //         DescripcionCanal: detalle,
            //     });
            //     // log.debug("customrecord_ht_record_canaldistribucion", Resultado);
            // }
            //return Resultado;
            //// log.debug("customrecord_ht_record_canaldistribucion", Resultado); 
            return Resultado[0]?.Id || defecto;
        } catch (error) {
            // log.error('error------------', error.stack);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanal)';
        }
    }

    function ConsultaTipoVehiculo(Id_Marca, Id_Modelo, codigo, descripcion, tabla, subsidiaria) {
        try {
            var Resultado = [];
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    // ["isinactive","anyof","F"], 
                    ["isinactive", "is", "F"],
                    // "AND",
                    // ["custrecord_ht_tv_subsidiaria","anyof",subsidiaria] 

                ],
                columns:
                    [
                        //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                        search.createColumn({ name: "custrecord_ht_tv_marca", label: "Id Marca" }),
                        search.createColumn({ name: "custrecord_ht_tv_modelo", label: "Id Modelo" }),
                        search.createColumn({ name: "internalid", label: "Id tipo" }),
                        search.createColumn({ name: "custrecord_ht_tv_subsidiaria", label: "subtipo" }),
                        search.createColumn({ name: "custrecord_ht_tv_descripcion", label: "tipo" })
                    ]
            });
            if (Id_Marca != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_tv_marca',
                    operator: search.Operator.IS,
                    values: Id_Marca
                }));
            }
            if (Id_Modelo != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_tv_modelo',
                    operator: search.Operator.IS,
                    values: Id_Modelo
                }));
            }
            if (codigo != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.IS,
                    values: codigo
                }));
            }
            if (descripcion != '') {
                var textodescripcion = descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_tv_descripcion',
                    operator: search.Operator.IS,
                    values: textodescripcion
                }));
            }
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            if (ResConsulta.count != 0) {
                for (let i in ResConsulta) {
                    var IdMarca = ResConsulta[i].getValue({ name: 'custrecord_ht_tv_marca' });
                    var IdModelo = ResConsulta[i].getValue({ name: 'custrecord_ht_tv_modelo' });
                    var IdTipo = ResConsulta[i].getValue({ name: 'internalid' });
                    var TipoSubsidiaria = ResConsulta[i].getValue({ name: 'custrecord_ht_tv_subsidiaria' });
                    var Tipo = ResConsulta[i].getValue({ name: 'custrecord_ht_tv_descripcion' });
                }

                Resultado.push({
                    IdMarca: IdMarca,
                    IdModelo: IdModelo,
                    Id: IdTipo,
                    Descripcion: Tipo,
                    Subsidiaria: TipoSubsidiaria
                });

            }
            if ((Resultado[0]?.Id || "0") == "0") {
                Resultado = [];
                //// log.debug(tabla, "Resultado......................");
                var creardatos = record.create({ type: tabla });
                creardatos.setValue({
                    fieldId: "name",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_marca",
                    value: Id_Marca,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_modelo",
                    value: Id_Modelo,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_codigo",
                    value: "000",
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_descripcion",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_subsidiaria",
                    value: subsidiaria,
                });
                indice = creardatos.save();
                //// log.debug(tabla, indice);
                Resultado.push({
                    IdMarca: Id_Marca,
                    IdModelo: Id_Modelo,
                    Id: indice,
                    Descripcion: descripcion,
                    Subsidiaria: subsidiaria
                });
                // log.debug(tabla, Resultado);
            }
            else {
                // log.debug('tabla...', Resultado);
                if (!esNumeroString(Resultado[0]?.Subsidiaria)) {
                    let updateRec = record.load({ type: tabla, id: Resultado[0]?.Id, isDynamic: true });
                    updateRec.setValue({ fieldId: 'custrecord_ht_tv_subsidiaria', value: subsidiaria });
                    let updaetIns = updateRec.save();
                    // log.debug('tabla...updaetIns', updaetIns)
                }
            }
            //return Resultado;
            return Resultado[0]?.Id || "0";
        } catch (error) {
            // log.error('error', error);
            //return JSON.stringify({error: error.message});
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoVehiculo)';
        }
    }

    function ConsultaModelo(Id_Marca, Id_Modelo, descripcion, tabla, subsidiaria, codMarca) {
        try {

            log.debug('ConsultaModelo--', { Id_Marca, Id_Modelo, descripcion, tabla, subsidiaria, codMarca });

            var Resultado = [];
            //let bandera=false;
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    //["isinactive","anyof","F"], 
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_ht_mod_subsidiaria", "anyof", subsidiaria]
                ],
                columns:
                    [
                        //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                        search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_MB_MARCA", label: "Id Marca" }),
                        search.createColumn({ name: "custrecord_ht_mb_marca", label: "Codigo marca" }),
                        //search.createColumn({name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_MB_MARCA", label: "Descripcion"}),
                        search.createColumn({ name: "internalid", label: "Id Modelo" }),
                        //search.createColumn({name: "custrecord_ht_mod_codigo", label: "CodigoModelo"}),
                        search.createColumn({ name: "custrecord_ht_mod_descripcion", label: "Modelo" })
                    ]
            });
            if (Id_Marca != '') {

                log.debug('Id_Marca--', Id_Marca);

                Busqueda.filters.push(search.createFilter({
                    name: 'internalid',
                    join: 'CUSTRECORD_HT_MB_MARCA',
                    operator: search.Operator.IS,
                    values: Id_Marca
                }));


            }
            if (Id_Modelo != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.IS,
                    values: Id_Modelo
                }));
            }
            // log.debug("tabla................", Busqueda);
            if (descripcion != '') {
                bandera = true;
                var textodescripcion = descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_mod_descripcion',
                    operator: search.Operator.IS,
                    values: textodescripcion
                }));
            }
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });

            log.debug('Busqueda--', Busqueda.filters);
            log.debug("ResConsulta", ResConsulta)

            if (ResConsulta != 0) {
                //// log.debug(tabla, "Resultado..........1111............");
                // log.debug(tabla, ResConsulta);
                for (let i in ResConsulta) {
                    var IdMarca = ResConsulta[i].getValue({ name: 'custrecord_ht_mb_marca' });
                    //*var CodigoMarca = ResConsulta[i].getValue({name: 'custrecord_ht_marca_codigo', join: 'CUSTRECORD_HT_MB_MARCA'});
                    //var CodigoMarca =  ResConsulta[i].getValue({name: 'custrecord_ht_mb_marca', join: 'CUSTRECORD_HT_MB_MARCA'});
                    //var Marca = ResConsulta[i].getValue({name: 'custrecord_ht_marca_descripcion', join: 'CUSTRECORD_HT_MB_MARCA'});
                    var IdModelo = ResConsulta[i].getValue({ name: 'internalid' });
                    //var CodigoModelo = ResConsulta[i].getValue({name: 'custrecord_ht_mod_codigo'});
                    var Modelo = ResConsulta[i].getValue({ name: 'custrecord_ht_mod_descripcion' });
                }
                Resultado.push({
                    IdMarca: IdMarca,
                    //CodigoMarca: CodigoMarca,
                    //Marca: Marca,
                    Id: IdModelo,
                    //Codigo: CodigoModelo,
                    Descripcion: Modelo
                });
            }
            //if (( Resultado[0]?.Id || "0")=="0")
            if (ResConsulta == 0) {
                Resultado = [];
                log.debug("Nuevo..................", "Nuevo......................");
                log.debug("tabla................", Busqueda);
                log.debug("descripcion...................", descripcion);
                log.debug("Id_Marca...................", Id_Marca);
                log.debug("codMarca...................", codMarca);
                var creardatos = record.create({ type: tabla });
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_subsidiaria",
                    value: subsidiaria,
                });
                creardatos.setValue({
                    fieldId: "name",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_descripcion",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_mb_marca",
                    value: Id_Marca,
                });
                //custrecord_ht_mod_codigo
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_codigo",
                    value: 1,
                    // value: Id_Marca,
                    //value: "000",
                });
                //custrecord_ht_cod_marca
                creardatos.setValue({
                    fieldId: "custrecord_ht_cod_marca",
                    value: codMarca,
                    // value: Id_Marca,
                });


                log.debug("creardatos--", creardatos)

                indice = creardatos.save();
                // //// log.debug(tabla, indice);

                Resultado.push({
                    IdMarca: Id_Marca,
                    Id: indice,
                    Descripcion: descripcion
                });
                log.debug(tabla, Resultado);
            }
            //return Resultado;
            return Resultado[0]?.Id || "0";
        } catch (error) {
            log.error('error', error);
            //return JSON.stringify({error: error.message});
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaModelo)';
        }


    }

    function ConsultaTipoTerrestre(Id_tipobien, codigo, descripcion, tabla, subsidiaria) {
        try {
            var Resultado = [];
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    //["isinactive","anyof","F"], 
                    ["isinactive", "is", "F"],
                ],
                columns: [
                    //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                    //*search.createColumn({ name: "custrecord_ht_tv_marca", label: "Id Marca" }),
                    search.createColumn({ name: "custrecord_ht_tt_tipobien", label: "Id Tipo Bien" }),
                    search.createColumn({ name: "internalid", label: "internalid" }),
                    search.createColumn({ name: "name", label: "name" }),
                    search.createColumn({ name: "custrecord_ht_bien_tipoterrestre_descrip", label: "tipobien" })
                ]
            });
            if (Id_tipobien != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_tt_tipobien',
                    operator: search.Operator.IS,
                    values: Id_tipobien
                }));
            }
            if (codigo != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.IS,
                    values: codigo
                }));
            }
            if (descripcion != '') {
                var textodescripcion = descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_bien_tipoterrestre_descrip',
                    operator: search.Operator.IS,
                    values: textodescripcion
                }));
            }
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            if (ResConsulta.count != 0) {
                for (let i in ResConsulta) {
                    //var IdMarca = ResConsulta[i].getValue({name: 'custrecord_ht_tv_marca'});
                    var IdBien = ResConsulta[i].getValue({ name: 'custrecord_ht_tt_tipobien' });
                    var IdTipo = ResConsulta[i].getValue({ name: 'internalid' });
                    var Tipo = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_tipoterrestre_descrip' });
                }
                Resultado.push({
                    //IdMarca: IdMarca,
                    IdBien: IdBien,
                    Id: IdTipo,
                    Descripcion: Tipo
                });
            }
            //// log.debug(tabla, Resultado);        
            return Resultado[0]?.Id || "0";
        } catch (error) {
            // log.error('error', error);
            //return JSON.stringify({error: error.message});
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoTerrestre)';
        }
    }

    const ConsultaGeneralBien = (valor, tabla, tipo, subsidiaria) => {
        try {


            log.debug("ConsultaGeneralBien", { valor, tabla, tipo, subsidiaria })
log.debug("TiposConsultaGeneralBien", {
    tipoValor: typeof valor,
    tipoTabla: typeof tabla,
    tipoTipo: typeof tipo,
    tipoSubsidiaria: typeof subsidiaria
});


            // valor.split(";")
            var valor2 = "";
            if (typeof valor === 'string' && valor?.includes(";") || false) {
                let array = valor.split(";")
                valor = array[0].toUpperCase();
                valor2 = array[1].toUpperCase();
                valor = valor.toUpperCase();
            }
            filtersAux = []
            let bandera = false;
            if (tipo == 'CILI') {
                bandera = true;

                if (typeof valor == 'number' && !isNaN(valor)) {
                    valor = valor.toString();
                }

                filtersAux = [//["isinactive","anyof","F"], 
                    ["isinactive", "is", "F"],
                    "AND",
                    ["name", "is", valor.toUpperCase()]]

                // log.debug("SSSSSSSSS", filtersAux)

            } else {
                // if (esNumeroString(valor)) {
                if (esNumeroString(valor) && tipo != 'COLC' && tipo != 'MARC') {  // Correcion 13/08/2026
                    filtersAux = [//["isinactive","anyof","F"],
                        ["isinactive", "is", "F"],
                        "AND",
                        ["internalid", "anyof", valor]]
                } else {
                    if (tipo == 'MARC') {
                        valor = valor?.trim();

                        bandera = true;
                        filtersAux = [
                            ["isinactive", "is", false],
                            "AND", ["name", "is", valor],
                            "AND", ["custrecord_ht_marca_sub", "anyof", subsidiaria]
                        ]
                        //filtersAux = [  ["name", "is", valor]]
                    } else if (tipo == 'COLC') {
                          bandera = true;
                          filtersAux = [["isinactive", "is", "F"], "AND",
                          ["name", "is", valor.toUpperCase()] ,"AND",
                          ["custrecord_ht_bn_colorcarseg_subsidiaria", "anyof", subsidiaria]]
                    } else {
                        if (tipo == 'TRAN' || tipo == "TCOM") {
                            bandera = true;
                            //// log.error('5................................', valor);
                            filtersAux = [["isinactive", "is", "F"], "AND",
                            ["name", "contains", valor]]
                            //filtersAux = [  ["name", "is", valor.toUpperCase()]]
                        } else {
                            bandera = true;
                            filtersAux = [["isinactive", "is", "F"], "AND",
                            ["name", "is", valor.toUpperCase()]]
                        }
                    }
                }
            }
            const busquedaSearchObj = search.create({
                type: tabla,
                filters: filtersAux,
                columns: [
                    { name: "internalid" },
                    { name: "name" },
                ],
            });
            const myPagedData = busquedaSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        //campo: result.getValue({ name: campo}),
                        idInternal: result.getValue({ name: "internalid" }),
                        descripcion: result.getValue({ name: "name" }),
                    });
                });
            });
            var theCount = busquedaSearchObj.runPaged().count;

            // log.debug("theCounqqqqqqqt", {
            //     theCount,
            //     tipo
            // })

            if (theCount == 0) {
                if (tipo == "ESBN" || tipo == "STBN" || tipo == "TIBN" || tipo == "LOCT" || tipo == "TRAN") {
                    bandera = false;
                }
                // if (tipo == "UVEH" || tipo == "RECO" || tipo == "TFLO" || tipo == "AIRE" || tipo == "ECNV") {
                if (tipo == "UVEH" || tipo == "RECO" || tipo == "TFLO" || tipo == "AIRE" || tipo == "ECNV" || tipo == "TCOM" || tipo == "TCAB" || tipo == "CILI" || tipo == "TRAC" || tipo == "CONV" ) {
                    bandera = false;
                }
                respuesta.push({
                    idInternal: 0,
                    descripcion: "",
                });
            } else {
                bandera = false
            }

            // log.debug("RESPUESTAAAAAA", respuesta)

            if (tipo == "COLF" || tipo == "COLM" || tipo == "COLC" || tipo == "MARC") {
                if ((respuesta[0]?.idInternal || "0") == "0") {
                    bandera = true
                } else {
                    bandera = false
                }
            }
            if (bandera) {


                if (theCount == 0) {


                    respuesta = [];
                    var creardatos = record.create({ type: tabla });
                    creardatos.setValue({
                        fieldId: "name",
                        value: valor,
                    });


                    switch (tipo) {
                        case "TORG":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipo_origen_desc",
                                value: valor2,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_tip_sub",
                                value: subsidiaria,
                            });
                            break;
                        case "TOBN":
                            break;
                        case "MARC":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_sub",
                                value: subsidiaria,
                            });
                            creardatos.setValue({
                                fieldId: "name",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_descripcion",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_codigo",
                                value: "383",
                            });


                            break;
                        //TRANSMISION
                        case "TRAN":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_descripcion",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_codigo",
                                value: "000",
                            });
                            break;
                        //VERSION
                        case "VERS":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_version_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_version_codigo",
                                value: "000",
                            });
                            break;
                        //TIPO CABINA
                        case "TCAB":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocabina_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocabina_codigo",
                                value: "000",
                            });
                            break;
                        //COLOR FABRICANTE
                        case "COLF":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorfabricante_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorfabricante_codigo",
                                value: "000",
                            });
                            break;
                        //COLOR MATRICULA
                        case "COLM":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colormatricula_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colormatricula_codigo",
                                value: "000",
                            });
                            break;
                        //COLOR CARSEG
                        case "COLC":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorcarseg_descripcion",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorcarseg_codigo",
                                value: "000",
                            });
                            break;
                        //CILINDRAJE
                        case "CILI":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_cilindraje_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_cilindraje_codigo",
                                value: "000",
                            });
                            break;
                        //TRACCION
                        case "TRAC":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_traccion_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_traccion_codigo",
                                value: "000",
                            });
                            break;
                        //TIPO COMBUSTIBLE
                        case "TCOM":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocombustible_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocombustible_codigo",
                                value: "383",
                            });
                            break;
                        //CONVENIO
                        // case "CONV":
                        //     creardatos.setValue({
                        //         fieldId: "custrecord_ht_cn_razon_social",
                        //         value: valor,
                        //     });
                        //     creardatos.setValue({
                        //         fieldId: "custrecord_ht_cn_nombreconvenio",
                        //         value: valor,
                        //     });
                        //     creardatos.setValue({
                        //         fieldId: "custrecord_ht_cn_codigo",
                        //         value: "000",
                        //     });
                        //     break;
                        default: break;
                    }


                    try {

                        indice = creardatos.save(
                            // { enableSourcing: true, ignoreMandatoryFields: true }
                        );
                    } catch (error) {
                        // log.debug("ERROR AL GUARDAR EL REGISTRO", error)
                    }

                    respuesta.push({
                        idInternal: indice,
                        descripcion: valor,
                    });

                    // log.debug("CILINDDDDDDDDDDDDDDDDDDDDD", { tabla, respuesta });
                }
            }
            log.debug(tabla, respuesta);
            return (respuesta[0]?.idInternal || "0");
        } catch (e) {
            // log.error("Error " + tabla, e.stack);
            return 0;
        }
    };

    const ConsultaCodMarca = (valor, tabla, subsidiaria) => {
        try {
            valor.split(";")
            var valor2 = "";
            if (valor?.includes(";") || false) {
                let array = valor.split(";")
                valor = array[0].toUpperCase();
                valor2 = array[1].toUpperCase();
            }
            valor = valor.toUpperCase().trim();
            filtersAux = []
            let bandera = false;

            if (esNumeroString(valor)) {
                filtersAux = [["isinactive", "is", "F"], "AND",
                ["internalid", "anyof", valor]]
            } else {
                bandera = true;
                filtersAux = [["isinactive", "is", false], "AND",
                ["name", "is", valor], "AND",
                ["custrecord_ht_marca_sub", "anyof", subsidiaria]]
            }
            const busquedaSearchObj = search.create({
                type: tabla,
                filters: filtersAux,
                columns: [
                    { name: "internalid" },
                    { name: "custrecord_ht_marca_codigo" },
                    { name: "name" },
                ],
            });

            const myPagedData = busquedaSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        //campo: result.getValue({ name: campo}),
                        idInternal: result.getValue({ name: "internalid" }),
                        codigo: result.getValue({ name: "custrecord_ht_marca_codigo" }),
                        descripcion: result.getValue({ name: "name" }),
                    });
                });
            });
            var theCount = busquedaSearchObj.runPaged().count;
            if (theCount == 0) {
                respuesta.push({
                    idInternal: 0,
                    codigo: 0,
                    descripcion: "",
                });
            }
            // log.debug("Marca.................", respuesta);
            return (respuesta[0]?.codigo || "0");
        } catch (e) {
            // log.error(tabla, e);
            return 0;
        }
    };

    const validateBien = (placa, motor, chasis) => {
        try {
            // log.debug("---", { placa, motor, chasis });

            // Construir filtros OR solo para valores que existen
            let orFilters = [];

            // Excluir placa "S/P" ya que hay muchos registros así
            if (placa && placa.toUpperCase() !== "S/P") {
                orFilters.push(["custrecord_ht_bien_placa", "is", placa.trim()]);
            }

            if (motor) {
                if (orFilters.length > 0) orFilters.push("OR");
                orFilters.push(["custrecord_ht_bien_motor", "is", motor.trim()]);
            }

            if (chasis) {
                if (orFilters.length > 0) orFilters.push("OR");
                orFilters.push(["custrecord_ht_bien_chasis", "is", chasis.trim()]);
            }

            // Si no hay valores para buscar
            if (orFilters.length === 0) {
                return {
                    internalid: 0,
                    altname: ""
                };
            }

            // Filtros principales con OR agrupados
            let filters = [
                ["custrecord_bn_subsidiaria", "anyof", "2"],
                "AND",
                ["isinactive", "is", "F"],
                "AND",
                orFilters
            ];

            let bienesSearchObj = search.create({
                type: "customrecord_ht_record_bienes",
                filters: filters,
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "altname" })
                ]
            });

            let searchResultCount = bienesSearchObj.runPaged().count;
            // log.debug("Registro Duplicado - result count", searchResultCount);

            if (searchResultCount === 0) {
                return {
                    internalid: 0,
                    altname: ""
                };
            }

            let resultado = null;
            bienesSearchObj.run().each(result => {
                resultado = {
                    internalid: result.getValue('internalid'),
                    altname: result.getValue('altname') || ""
                };
                // log.debug("Resultado encontrado", resultado);
                return false;
            });

            return resultado;

        } catch (error) {
            // log.error('Error en validateBien', error);
            return {
                internalid: 0,
                altname: ""
            };
        }
    };
    ///////////////////////////////////////////////////////////////////////

    function getApiData(representante_ventas) {
        try {

            log.audit("aqui")

            let loginApiToken = _toolkit.loginGetToken();
            let params = {
                opcion: "100",
                datSelect: "SELECT EMP.CODIGO_NS",
                // datSelect: "SELECT EMP.CODIGO_NS, *",
                datFrom: "FROM HUNTER.DBO.COM_EMPLEADO_COMISION EMP WITH(NOLOCK), GENERAL.DBO.GEN_MA_EJECUTIVO EJE WITH(NOLOCK), HUNTER.DBO.GEN_CARGO CAR WITH(NOLOCK)",
                datWhere: `WHERE EJE.CODIGO_USUARIO = EMP.CODIGO AND EMP.GEN_CARGO_ID = CAR.GEN_CARGO_ID AND EJE.CODIGO_USUARIO = '${representante_ventas}' AND EMP.CODIGO_NS is not null AND EMP.GEN_ESTADO_ID=1`
            }

            let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";

            log.debug("log Api Ejecutiva", { loginApiToken })


            let headersConsulta = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${loginApiToken}`,
            };

            let response = https.post({
                url: urlBase,
                headers: headersConsulta,
                body: JSON.stringify(params),
            });

            log.audit("log Api Ejecutiva", response)


            let data = JSON.parse(response.body);
            return data?.results[0]?.CODIGO_NS || 468435;
        } catch (error) {
            // log.error("error", error)
            return 468435;
        }
    }

    function obtenerUnDato(type, columna, id) {
        try {
            const resultado = search
                .create({
                    type: type,
                    filters: [["internalid", "is", id]],
                    columns: [columna],
                })
                .run()
                .getRange({ start: 0, end: 1 });

            return resultado.length > 0 ? resultado[0].getText(columna) : "";
        } catch (error) {
            log.debug("Error al obtenerUnDato", { error: error.message, stack: error.stack });
            return "";
        }
    }


    function asignarCategoria(context, objRecord) {

        // Crear búsqueda de customer category
        var customerCategorySearch = search.create({
            type: 'customercategory',
            filters: [
                ['name', 'contains', context.category.trim()] // equivalente a LIKE '%valor%'
            ],
            columns: ['id', 'name']
        });

        // Ejecutar búsqueda
        var categoryId = null;
        customerCategorySearch.run().each(function (result) {
            categoryId = result.getValue('id'); // tomar el primer resultado
            return false; // detener iteración después del primero
        });

        // Asignar valor al registro
        if (categoryId) {
            objRecord.setValue({ fieldId: 'category', value: categoryId });
        } else {
            objRecord.setValue({ fieldId: 'category', value: 1 }); // valor por defecto
        }

    }

    function formatearPlaca(placa) {
        if (!placa) return "S/P"; // Si es nulo o vacío

        const limpia = placa.trim();

        // Si ya contiene guion o slash, no se altera
        if (/[\/-]/.test(limpia)) return limpia;

        // Si la longitud es distinta de 7 → no válida
        if (limpia.length !== 7) return "S/P";

        // Insertar el guion después del tercer carácter
        return `${limpia.slice(0, 3)}-${limpia.slice(3)}`;
    }

    function crearNotaNetsuite({ recordId, titulo, mensaje, recordtype, entity }) {
        try {

            const noteRec = record.create({
                type: 'note',
                isDynamic: true
            });

            if (titulo) { noteRec.setValue({ fieldId: 'title', value: titulo }); }
            if (mensaje) { noteRec.setValue({ fieldId: 'note', value: mensaje }); }

            if (entity) { noteRec.setValue({ fieldId: 'entity', value: entity }); }

            if (recordId) { noteRec.setValue({ fieldId: 'record', value: recordId }); }
            if (recordtype) { noteRec.setValue({ fieldId: 'recordtype', value: recordtype }); }

            return noteRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

        } catch (error) {
            log.error('Error crearNotaSimple', error);
        }
    }

    return {
        post: _post
    }
});
