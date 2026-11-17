/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/https',
    'N/search',
    'N/runtime',
    'N/record',
    '../UtilsGeneral/HU_EC_CONSTANTES',
    '../UtilsGeneral/HU_EC_FUNCION'
], function(https, search, runtime, record, _const, _funcion) {

    var globalFilesLink = _const.URLS.DOCUMENTOS_DIGITALIZADOS

    function afterSubmit(context) {
        try{
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                var newRecord = context.newRecord
                var customForm = newRecord.getValue('customform')
                
                // Los siguientes ID corresponden a los id de customForm mencionados
                // 102 -> "Factura de Compra"
                //if(newRecord.type === "vendorbill" && customForm === '102'){
                if(newRecord.type === "vendorbill" && customForm === '152'){  // Se Actualiza id Formulario (Factura de Compra) - DOAS 01-10-2024 
                    
                    let proveedor = newRecord.getValue('entity')
                    let idDocumento = newRecord.id
                    let proveedorInfo = proveedorNombreId(proveedor)
                    let TransaccionDoc = newRecord.getValue('tranid') //VBC 20240709
                    let FechaDoc = newRecord.getValue('trandate') //VBC 20240709                    

                    let dia = FechaDoc.getDate().toString().padStart(2, '0'); // Obtener día y asegurar que tenga dos dígitos
                    let mes = (FechaDoc.getMonth() + 1).toString().padStart(2, '0'); // Obtener mes (agregar 1 porque en JavaScript los meses van de 0 a 11) y asegurar que tenga dos dígitos
                    let anio = FechaDoc.getFullYear(); 
                  
                    let FechaDocStr =  `${dia}/${mes}/${anio}`;
                    log.debug("FechaDocStr: ", FechaDocStr);
                    
                    if(proveedorInfo.nombre && proveedorInfo.id && idDocumento){
                        let cxpSerie = newRecord.getValue('custbody_ts_ec_serie_doc_cxp')
                        let secuencial = newRecord.getValue('custbody_ts_ec_numero_preimpreso')
                        
                        if(cxpSerie && secuencial){
                            let loginApiToken = _funcion.loginGetToken()
                            if(loginApiToken){
                                let codigoDocumento = sendGetCodigoDocumento(loginApiToken, proveedorInfo.id, cxpSerie, secuencial)                            
                                if(codigoDocumento){
                                    let user = runtime.getCurrentUser();
                                    let userName = user.email?.slice(0,user.email.indexOf('@')).toUpperCase() || ''
                                    sendPostActualizaDoc(loginApiToken, codigoDocumento, proveedorInfo.id, cxpSerie, secuencial, idDocumento, userName)                          
                                }
                            }
                        }

                        let [idProvCoded, nameProvCoded, idDocCoded, NumTransaccion, FechaFac] = sendPostEncrypt(proveedorInfo.id, proveedorInfo.nombre, idDocumento, TransaccionDoc, FechaDocStr) || ["","","","",""]

                      log.debug("FechaFac: ", FechaFac);

                        // Record del diario de referencia
                        let params = `IdProveedor=${idProvCoded}&NombreProveedor=${nameProvCoded}&NumDocumento=${idDocCoded}&NumTransaccion=${NumTransaccion}&FechaDoc=${FechaFac}` //VBC &NumTransaccion=${NumTransaccion}&FechaDoc=${FechaFac}
                        let url = globalFilesLink+params
                        url = url.replace(/ /g,"%20")
                        
                        if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {
            
                            // Carga el registro nuevamente para modificarlo
                            var loadedRecord = record.load({ type: "vendorbill", id: idDocumento });
            
                            // Modificar un campo, ejemplo 'custbody_custom_field'
                            loadedRecord.setValue({ fieldId: 'custbody_link_archivos_asociados', value: url });
            
                            // Guardar los cambios
                            loadedRecord.save({  enableSourcing: true, ignoreMandatoryFields: true });
                        }
                    }
                }
            }
        }catch(error){
            log.error('Error', error);
        }
    }

    function proveedorNombreId(idProveedor){
        let searchNombreId = search.lookupFields({
            type: "vendor",
            id: idProveedor,
            columns: [
                'altname',
                'vatregnumber'
            ]
        });
        let proveedorInfo = {}
        proveedorInfo.nombre = searchNombreId.altname
        proveedorInfo.id = searchNombreId.vatregnumber
        
        return proveedorInfo
    }

    function sendGetCodigoDocumento(token, idProveedor, serie, secuencia) {

        try {
            let ref = serie+secuencia
            var queryParams = {
                opcion: encodeURIComponent('218'),
                codigo: encodeURIComponent('009'),
                proveedor: encodeURIComponent(idProveedor),
                referencia: encodeURIComponent(ref)
            };

            var queryString = Object.keys(queryParams).map(function(key) {
                return key + '=' + queryParams[key];
            }).join('&');

            var url = _const.URLS.HUNTER_API_NETSUITE + '/ConsultaDocumento' + '?' + queryString;
            var options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
        
            var response = https.get({
                url: url,
                headers: options.headers
            });

            if (response.code === 200) {
                var responseBody = JSON.parse(response.body);
                return responseBody.respuesta[0].codigo;
            } else {
                log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
                return ""
            }
        } catch (error) {
            log.error('Exception', `Error while sending request: ${error.message}`);
            return ""
        }
    }

    function sendPostActualizaDoc(token, codigoEscan, idProveedor, serie, secuencia, idDocumento, userName) {        
        try {
            let ref = serie+secuencia
            var dataToSend = {
                "opcion": "701",
                "codigo": "009",
                "proveedor": idProveedor,
                "referencia": ref,
                "codigoEscaneo": codigoEscan,
                "numeroDocumento": idDocumento+'', // idDocumento es de tipo Number, cambia a String
                "serie": serie,
                "usuario": userName
            };

            var headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            var options = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(dataToSend)
            };

            var response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + '/ActualizaDocumento',
                body: options.body,
                headers: options.headers
            });

            if (response.code === 200) {
                var responseBody = JSON.parse(response.body);
                log.debug('responseBody',responseBody.respuesta[0].mensaje)
            } else {
                log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
            }
        } catch (error) {
            log.error('Exception', `Error while sending request: ${error.message}`);
        }
    }

    function sendPostEncrypt(idProveedor, nombre, idDocumento, Transaccion, Fecha) {

        var dataToSend = {
            data: [idProveedor+"", nombre+"", idDocumento+"", Transaccion+"", Fecha+""] //VBC , Transaccion+"", Fecha+""
        };

        var headers = {
            'Content-Type': 'application/json',
        };

        var options = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(dataToSend)
        };

        try {
            var response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + '/CodificarString',
                body: options.body,
                headers: options.headers
            });

            if (response.code === 200) {
                var responseBody = JSON.parse(response.body);
                return responseBody;
            } else {
                log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
            }
        } catch (error) {
            log.error('Exception', `Error while sending request: ${error.message}`);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});
