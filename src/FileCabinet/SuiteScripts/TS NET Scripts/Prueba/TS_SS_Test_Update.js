/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
    'N/https',
    'N/search',
    'N/runtime',
    'N/record',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'
], function (https, search, runtime, record, _const, _funcion, _toolkit) {

    var globalFilesLink = _const.URLS.DOCUMENTOS_DIGITALIZADOS

    function execute(context) {

        try {

               let apiData  = getApiData();
            // let apiData = [
            //     { "NUMERO_DOCUMENTO": 4456748 },
            //     { "NUMERO_DOCUMENTO": 4518225 },
            // ]

            // log.debug("Data obtenida de la API", apiData)
            let n_documentoOri = apiData.map(d => String(d.NUMERO_DOCUMENTO));

            let n_documento = []


            if (n_documentoOri.length > 0) {
                n_documento = n_documentoOri.slice(0, 180);
            } else {
                return log.debug("No se encontraron documentos para procesar en la API");
            }

            // iterar sobre los números de documento encontrados
            for (let i = 0; i < n_documento.length; i++) {

                // log.debug('---Iteración', '-----Procesando documento con número: ' + n_documento[i]);
                let usage = runtime.getCurrentScript().getRemainingUsage();
                // log.debug('Uso de gobernanza restante--', { usage });

                let numeroDocumento = n_documento[i];
                // log.debug('Número de Documento', numeroDocumento);

                let newRecord = record.load({
                    type: record.Type.VENDOR_BILL,
                    id: numeroDocumento, // Reemplaza con el ID de la factura de proveedor que deseas cargar
                    isDynamic: true,
                });

                let customForm = newRecord.getValue('customform')

                if (newRecord.type === "vendorbill" && customForm === '152') {  // Se Actualiza id Formulario (Factura de Compra) - DOAS 01-10-2024 

                    let proveedor = newRecord.getValue('entity')
                    let idDocumento = newRecord.id
                    let proveedorInfo = proveedorNombreId(proveedor)
                    let TransaccionDoc = newRecord.getValue('tranid') //VBC 20240709
                    let FechaDoc = newRecord.getValue('trandate') //VBC 20240709                    

                    let dia = FechaDoc.getDate().toString().padStart(2, '0'); // Obtener día y asegurar que tenga dos dígitos
                    let mes = (FechaDoc.getMonth() + 1).toString().padStart(2, '0'); // Obtener mes (agregar 1 porque en JavaScript los meses van de 0 a 11) y asegurar que tenga dos dígitos
                    let anio = FechaDoc.getFullYear();

                    let location = newRecord.getValue('location')
                    let custbody_link_archivos_asociados = newRecord.getValue('custbody_link_archivos_asociados')

                    if (custbody_link_archivos_asociados) {
                        // log.debug('El campo custbody_link_archivos_asociados ya tiene un valor, no se actualizará para el documento con ID: ' + idDocumento);
                        continue; // Saltar a la siguiente iteración del bucle
                    }

                    let FechaDocStr = `${dia}/${mes}/${anio}`;
                    // log.debug("FechaDocStr: ", FechaDocStr);

                    // log.debug('Proveedor Info', proveedorInfo);

                    if (proveedorInfo.nombre && proveedorInfo.id && idDocumento) {


                        let cxpSerie = newRecord.getValue('custbody_ts_ec_serie_doc_cxp')
                        let secuencial = newRecord.getValue('custbody_ts_ec_numero_preimpreso')

                        // log.debug('cxpSerie', cxpSerie);
                        // log.debug('secuencial', secuencial);

                        if (cxpSerie && secuencial) {
                            let loginApiToken = _funcion.loginGetToken()
                            if (loginApiToken) {
                                let codigoDocumento = sendGetCodigoDocumento(loginApiToken, proveedorInfo.id, cxpSerie, secuencial)
                                if (codigoDocumento) {
                                    let user = runtime.getCurrentUser();
                                    let userName = user.email?.slice(0, user.email.indexOf('@')).toUpperCase() || ''
                                    sendPostActualizaDoc(loginApiToken, codigoDocumento, proveedorInfo.id, cxpSerie, secuencial, idDocumento, userName)
                                }
                            }
                        }

                        let [idProvCoded, nameProvCoded, idDocCoded, NumTransaccion, FechaFac] = sendPostEncrypt(proveedorInfo.id, proveedorInfo.nombre, idDocumento, TransaccionDoc, FechaDocStr) || ["", "", "", "", ""]

                        // log.debug("FechaFac: ", FechaFac);

                        // Record del diario de referencia
                        let params = `IdProveedor=${idProvCoded}&NombreProveedor=${nameProvCoded}&NumDocumento=${idDocCoded}&NumTransaccion=${NumTransaccion}&FechaDoc=${FechaFac}` //VBC &NumTransaccion=${NumTransaccion}&FechaDoc=${FechaFac}
                        let url = globalFilesLink + params
                        url = url.replace(/ /g, "%20")

                        // log.debug("URL para archivos asociados: ", url);

                        try {
                            // log.debug('Intentando actualizar el campo custbody_link_archivos_asociados con URL', url);

                            record.submitFields({
                                type: 'vendorbill', // o "vendorbill"
                                id: idDocumento,
                                values: {
                                    custbody_link_archivos_asociados: url
                                },
                                options: {
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                }
                            });

                        } catch (error) {
                            log.error('Error al actualizar el campo en el registro', error);

                        }

                    }
                }
            }

        } catch (error) {
            log.error('Error', error);
        }
    }

    function proveedorNombreId(idProveedor) {
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
            let ref = serie + secuencia
            var queryParams = {
                opcion: encodeURIComponent('218'),
                codigo: encodeURIComponent('009'),
                proveedor: encodeURIComponent(idProveedor),
                referencia: encodeURIComponent(ref)
            };

            var queryString = Object.keys(queryParams).map(function (key) {
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
            let ref = serie + secuencia
            var dataToSend = {
                "opcion": "701",
                "codigo": "009",
                "proveedor": idProveedor,
                "referencia": ref,
                "codigoEscaneo": codigoEscan,
                "numeroDocumento": idDocumento + '', // idDocumento es de tipo Number, cambia a String
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
                // log.debug('responseBody', responseBody.respuesta[0].mensaje)
            } else {
                log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
            }
        } catch (error) {
            log.error('Exception', `Error while sending request: ${error.message}`);
        }
    }

    function sendPostEncrypt(idProveedor, nombre, idDocumento, Transaccion, Fecha) {

        var dataToSend = {
            data: [idProveedor + "", nombre + "", idDocumento + "", Transaccion + "", Fecha + ""] //VBC , Transaccion+"", Fecha+""
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

    function getApiData() {
        try {

            let loginApiToken = _toolkit.loginGetToken();
            let params = {
                opcion: "100",
                datSelect: "SELECT A.NUMERO_DOCUMENTO",
                // datSelect: "SELECT EMP.CODIGO_NS, *",
                datFrom: "FROM Financiero.dbo.CXP_MO_DIGITALIZACION_DOCUMENTO_PRE_IMPRESO A WITH(NOLOCK)",
                datWhere: `WHERE CONVERT(VARCHAR, A.FECHA_INGRESO, 112) = CONVERT(VARCHAR, GETDATE(), 112) AND A.CODIGO_PROCESO in ('004','009') AND A.NUMERO_DOCUMENTO <> 0`
            }

            let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";



            let headersConsulta = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${loginApiToken}`,
            };

            let response = https.post({
                url: urlBase,
                headers: headersConsulta,
                body: JSON.stringify(params),
            });



            let data = JSON.parse(response.body);
            return data?.results || [];
        } catch (error) {
            // log.error("error", error)
            return [];
        }
    }


    return {
        execute: execute
    };
});