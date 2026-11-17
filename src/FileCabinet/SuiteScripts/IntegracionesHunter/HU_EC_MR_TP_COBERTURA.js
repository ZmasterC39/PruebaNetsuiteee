/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 09/12/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros de envio de Orden de Servicios, Factura, Pagos, Orden de trabajo.
Ambiente: Produccion
*/
define([
    'N/https',
    'N/log',
    'N/record',
    'N/search',
    'N/query',
    'N/cache',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES'
], function (https, log, record, search, query, cache, coberturaController, _funcion, _const) {

    const LIMITE_ = 600;

    // Caché de token a nivel de instancia + N/cache.
    let TOKEN_CACHE = null;

    function getToken() {
        try {
            if (TOKEN_CACHE) return TOKEN_CACHE; // ya lo tenemos en esta instancia

            const tokenCache = cache.getCache({
                name: 'hunterToken',
                scope: cache.Scope.PROTECTED
            });

            // Si otra instancia ya lo dejó cacheado, lo reutilizamos.
            TOKEN_CACHE = tokenCache.get({
                key: 'token',
                loader: function () {
                    return _funcion.loginGetToken();
                },
                ttl: 540
            });

            return TOKEN_CACHE;
        } catch (e) {
            log.debug("Error obteniendo token cacheado, se pide directo", e);
            TOKEN_CACHE = _funcion.loginGetToken();
            return TOKEN_CACHE;
        }
    }

    function getInputData() {
        try {
            const sql = `
                SELECT id AS internalid,
                       custrecord_id_os,
                       custrecord_id_bien,
                       custrecord_id_origen,
                       custrecord_origen,
                       custrecord_procesado,
                       custrecord_impulso,
                       custrecord_tipoeventousuario,
                       custrecord_orden_servicio_name,
                       custrecord_subsidiaria,
                       custrecord_localidad,
                       custrecord_original_nombre
                FROM customrecord_ven_orden_servicio_log
                WHERE custrecord_procesado = 'F'
                  AND custrecord_impulso = 0
                  AND custrecord_id_os != '0'
                  AND ROWNUM <= ${LIMITE_}   
            `;

            const rows = query.runSuiteQL({ query: sql }).asMappedResults();

            const theCountFac = rows.length;
            log.debug("Número de registros encontrados", theCountFac);

            // Si no se encontraron resultados, no hay nada que procesar
            if (!rows || rows.length === 0) {
                return [];
            }

            const resultadosFormateados = rows.map(result => {
                return {
                    InternalIdDoc: result.internalid,
                    InternalOS: result.custrecord_id_os,
                    InternalBien: result.custrecord_id_bien,
                    InternalOrigen: result.custrecord_id_origen,
                    Origen: result.custrecord_origen,
                    Procesado: result.custrecord_procesado,
                    Impulso: result.custrecord_impulso,
                    TipoEventoUsuario: result.custrecord_tipoeventousuario,
                    OrdenServicioName: result.custrecord_orden_servicio_name,
                    Subsidiaria: result.custrecord_subsidiaria,
                    Localidad: result.custrecord_localidad,
                    OriginalNombre: result.custrecord_original_nombre,
                };
            });

            return resultadosFormateados;

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {
        try {
            let data = JSON.parse(context.value);

            // clave compuesta 
            const dedupeKey = [
                data.InternalOS,
                data.InternalBien,
                data.InternalOrigen,
                data.Origen,
                data.TipoEventoUsuario
            ].join('|');

            context.write({
                key: dedupeKey,
                value: data
            });

        } catch (error) {
            log.error("Error en map", error);
        }
    }

    function reduce(context) {
        // Todos los registros con la misma clave (posibles duplicados)
        let values = context.values.map(JSON.parse);
        let data = values[0]; // el primero es el que procesamos
        let responseBody = null;

        try {

            // Marcar duplicados con "I" duplicados.
            if (values.length > 1) {
                for (let i = 1; i < values.length; i++) {
                    try {
                        record.submitFields({
                            type: "customrecord_ven_orden_servicio_log",
                            id: values[i].InternalIdDoc,
                            values: { custrecord_procesado: "I" }
                        });
                        log.debug("Duplicado marcado con I", values[i].InternalIdDoc);
                    } catch (e) {
                        log.debug("Error marcando duplicado", e);
                    }
                }
            }

            responseBody = makeApiRequest(data.InternalOS, "POST");
            let response = responseBody;

            if (responseBody?.DetalleOrden?.length >= 0) {
                try {

                    // Preparar datos para enviar a la API externa
                    let DataToSend = response;

                    // Token cache
                    let token = getToken();

                    let headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };

                    if (data?.Origen) {
                        DataToSend.origen = data.Origen == "FAC" ? "FA" : data.Origen;
                    } else {
                        DataToSend.origen = "";
                    }

                    if (data?.TipoEventoUsuario) {
                        if (data.TipoEventoUsuario == "delete") {
                            if (DataToSend?.DetalleOrden?.length > 0) {
                                delete DataToSend.DetalleOrden
                            }
                            DataToSend.accion = "E";
                            DataToSend.origen = "OS";
                            DataToSend.Id_os = data.InternalOS;
                            DataToSend.Codigo_Empresa = data?.Subsidiaria || "2";
                            DataToSend.Codigo_Sucursal = data?.Localidad || "0";
                            DataToSend.Numero_General = "0";
                        } else
                            if (data?.TipoEventoUsuario == "create") {
                                DataToSend.accion = "I";
                            } else

                                DataToSend.accion = "P";

                        if (data?.TipoEventoUsuario == "edit" || data?.TipoEventoUsuario == "cancel" || data?.TipoEventoUsuario == "approve") {
                            DataToSend.accion = "U";
                        }
                    } else {
                        DataToSend.accion = "P";
                    }

                    if (data?.Origen == "MA") {
                        DataToSend.accion = "M";
                        DataToSend.origen = "MA";
                    }

                    if (data?.Origen == "PC") {
                        DataToSend.accion = "C";
                        DataToSend.origen = "PC";
                    }

                    let options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/OrdenServicioNS",
                        headers: headers,
                        body: JSON.stringify(DataToSend),
                    };

                    // Enviar datos a la API externa
                    let response2 = https.post(options);

                    let temporal = {};
                    if (response2.body != "") {
                        temporal = JSON.parse(response2.body);
                    }

                    // Validar respuesta externa y actualizar el log
                    if (response2 && temporal?.statusCode === 200) {
                        actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "T", JSON.stringify(responseBody), response2.body, 200);
                        return true;
                    } else {

                        let ExisteOS = getOrdenService(data.InternalOS)

                        if (!ExisteOS) {
                            record.submitFields({
                                type: "customrecord_ven_orden_servicio_log",
                                id: data.InternalIdDoc,
                                values: {
                                    custrecord_procesado: "F",
                                    custrecord_tipoeventousuario: "delete",
                                    custrecord_impulso: 0
                                },
                            });
                        } else {
                            actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), response2.body, 400);
                            return `Código de estado: ${response2.code}, Respuesta: ${response2.body}`;
                        }

                    }
                } catch (error) {
                    log.debug("Error en la consulta de la API error", { stack: error.stack });
                    actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), error, 400);
                }
            } else {
                log.debug("Error", "Tiempo Agotado.");
                actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), { text: "Tiempo Agotado" }, 400);
            }
        } catch (error) {
            actualizarProcesadoLog(data.InternalIdDoc, data.Impulso, "F", JSON.stringify(responseBody), error, 400);
        }
    }

    function summarize(summary) {
        try {
            return true;
        } catch (error) {
            log.error("Error en summarize", error);
        }
    }

    function makeApiRequest(idorden, method) {
        try {
            return coberturaController.makeApiRequest(
                { idorden, indice: 1 },
                "customdeploy_hu_ec_rs_pd_orden_servicio",
                "customscript_hu_ec_rs_pd_orden_servicio",
                method,
                false
            );
        } catch (error) {
            log.debug("error", error)
            return []
        }
    }

    const actualizarProcesadoLog = (internalId, Impulso, estadoProcesado, traza, api_Externo, respuesta) => {
        try {

            let valuesTem = {};

            if (respuesta == 200) {
                valuesTem = {
                    custrecord_procesado: estadoProcesado,
                    custrecord_impulso: parseInt(Impulso) + 1,
                    custrecord32: traza,
                    custrecord_respuesta_api: api_Externo,
                    custrecord_respuesta_api_exito: api_Externo,
                };
            } else {
                valuesTem = {
                    custrecord_procesado: estadoProcesado,
                    custrecord_impulso: parseInt(Impulso) + 1,
                    custrecord32: traza,
                    custrecord_respuesta_api: api_Externo,
                    custrecord_respuesta_api_error: api_Externo,
                };
            }

            record.submitFields({
                type: "customrecord_ven_orden_servicio_log",
                id: internalId,
                values: valuesTem,
            });
            log.debug("Registro actualizado", `ID: ${internalId}`);
        } catch (error) {
            log.error("Error actualizando el registro", error);
        }
    };

    // SuiteQL OS
    const getOrdenService = (id) => {
        try {
            const r = query.runSuiteQL({
                query: `
                    SELECT id
                    FROM transaction
                    WHERE id = ?
                      AND type = 'SalesOrd'
                      AND ROWNUM = 1
                `,
                params: [id]
            }).asMappedResults();

            return r.length > 0;
        } catch (e) {
            log.debug("Error en getOrdenService", e);
            return false;
        }
    };


    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});