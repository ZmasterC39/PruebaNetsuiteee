/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 09/12/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Busca bienes (subsidiaria 2) modificados en la última hora vía notas del sistema y envía datos a la API externa /VehiculoNS.
Ambiente: Produccion
*/
define([
    'N/search',
    'N/log',
    'N/record',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
    'N/query',
    'N/https',
    'N/cache'
], function (search, log, record, coberturaController, _funcion, _const, query, https, cache) {

    // Cache de token a nivel de instancia
    let tokenInstancia = null;

    function getInputData() {
        try {
            let rangoAjustado = obtenerRangoHoraEcuador();
            log.audit("rangoHora", rangoAjustado);

            // let rangoAjustado = { HoraInicio: "05/08/2026 08:00", HoraFin: "05/08/2026 12:00" };
            // log.debug("rangoHora", rangoAjustado);

            const sql = `
                SELECT recordid, context
                FROM (
                    SELECT sn.recordid,
                           sn.context,
                           ROW_NUMBER() OVER (PARTITION BY sn.recordid ORDER BY sn.date DESC, sn.id DESC) AS rn
                    FROM SystemNote sn
                    JOIN customrecord_ht_record_bienes bn ON bn.id = sn.recordid
                    WHERE 1=1 
                      --AND sn.context IN ('CSV', 'UIF', 'UES')
                      AND sn.recordtypeid = 698
                      AND bn.custrecord_bn_subsidiaria = 2
                      AND bn.isinactive = 'F'
                      AND sn.date >= TO_DATE(?, 'DD/MM/YYYY HH24:MI')
                      AND sn.date <  TO_DATE(?, 'DD/MM/YYYY HH24:MI')
                )
                WHERE rn = 1
            `;

            const results = query.runSuiteQL({
                query: sql,
                params: [rangoAjustado.HoraInicio, rangoAjustado.HoraFin]
            }).asMappedResults();

            if (results.length === 0) {
                log.error("Búsqueda vacía", "No se encontraron resultados");
            }

            log.debug("--Resultados de la búsqueda--", results.length);

            return results.map(r => ({
                id: r.recordid,
                context: r.context
            }));

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {
        try {
            const data = JSON.parse(context.value);
            if (!data.id || !data.context) {
                log.error("Datos incompletos en el registro", data);
                return;
            }

            // El bien ya viene validado (subsidiaria 2, activo) desde el JOIN en getInputData
            context.write({ key: data.id, value: data.context });
        } catch (error) {
            log.error("Error en map", error);
            return;
        }
    }

    function reduce(context) {
        try {
            const recordId = context.key;

            const respuestaAPIInterna = ConsumirAPIInterna2({ idvehiculo: recordId }, 'POST');

            if (Object.keys(respuestaAPIInterna).length === 0) {
                log.error("Error", "La función Api Interna devolvió un objeto vacío.");
                return;
            }

            if (respuestaAPIInterna.CodigoVehiculo && /[a-zA-Z]/.test(respuestaAPIInterna.CodigoVehiculo)) {
                respuestaAPIInterna.CodigoVehiculo = "0";
            }

            if (respuestaAPIInterna.NumPuertas && /[a-zA-Z]/.test(respuestaAPIInterna.NumPuertas)) {
                respuestaAPIInterna.NumPuertas = "0";
            }

            const respuestaExterna = EnviarDatosAPIExternaCobertura(respuestaAPIInterna);
            log.debug("Respuesta", respuestaExterna);

            if (!respuestaExterna) {
                log.error("Error en envío", `El envío falló para el bien con ID: ${recordId}`);
                GenerarLogCambioEstado(respuestaAPIInterna, recordId, 'F', "PD_Bienes");
                return false;
            } else {
                GenerarLogCambioEstado(respuestaAPIInterna, recordId, 'T', "PD_Bienes");
            }

        } catch (error) {
            log.error("Error en reduce", error);
            return;
        }
    }

    function summarize(summary) {
        try {
            return true;
        } catch (error) {
            log.error("Error en summarize", error);
            return false;
        }
    }

    function obtenerRangoHoraEcuador() {
        try {
            const fechaServidor = new Date();
            const offsetEcuador = -5 * 60; // UTC-5 en minutos

            const utc = fechaServidor.getTime() + (fechaServidor.getTimezoneOffset() * 60000);
            const fechaEcuador = new Date(utc + (offsetEcuador * 60000));

            // Fin del rango: inicio de la hora actual (minutos/seg en 0)
            const fechaFin = new Date(fechaEcuador);
            fechaFin.setMinutes(0, 0, 0);

            // Inicio del rango: una hora antes.
            // Si son las 00:xx, restar 1h cae en 23:00 del día anterior automáticamente.
            const fechaInicio = new Date(fechaFin);
            fechaInicio.setHours(fechaInicio.getHours() - 1);

            return {
                HoraInicio: formatearFechaHora(fechaInicio),
                HoraFin: formatearFechaHora(fechaFin)
            };

        } catch (error) {
            log.debug("Error en obtenerRangoHoraEcuador", error);
            return {};
        }
    }

    function formatearFechaHora(fecha) {
        let dia = fecha.getDate().toString().padStart(2, "0");
        let mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        let anio = fecha.getFullYear();
        let hora = fecha.getHours().toString().padStart(2, "0");
        let minutos = fecha.getMinutes().toString().padStart(2, "0");

        return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
    }

    function ConsumirAPIInterna2(json, method) {
        try {

            if (!json) {
                return [];
            }

            let respuesta = coberturaController.makeApiRequest(
                {
                    opcion: "PASO_VEHICULO",
                    idvehiculo: json.idvehiculo,
                },
                "customdeploy_hu_ec_rs_in_bienes",
                "customscript_hu_ec_rs_in_bienes",
                method,
                false
            );

            if (respuesta && (respuesta.status == "error")) {
                return [];
            } else {
                return respuesta;
            }
        } catch (error) {
            log.debug("error", error);
            return [];
        }
    }

    /**
     * Obtiene el token cacheado (variable de instancia + N/cache).
     */
    function obtenerTokenCacheado() {
        if (tokenInstancia) {
            return tokenInstancia;
        }

        const miCache = cache.getCache({
            name: "TOKEN_HUNTER_BIENES",
            scope: cache.Scope.PROTECTED
        });

        tokenInstancia = miCache.get({
            key: "token_hunter",
            loader: function () {
                return _funcion.loginGetToken();
            },
            ttl: 540
        });

        return tokenInstancia;
    }

    function EnviarDatosAPIExternaCobertura(data) {
        let response;
        try {
            if (data == []) {
                return false;
            }

            const token = obtenerTokenCacheado();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const options = {
                method: "POST",
                url: _const.URLS.HUNTER_API_NETSUITE + "/VehiculoNS",
                headers: headers,
                body: JSON.stringify(data),
            };

            response = https.post(options);

            let temporal = false;

            if (response && response.body != "") {
                temporal = JSON.parse(response.body);
            }

            if (temporal && temporal.statusCode === 200) {
                log.debug("Respuesta de la API externa", temporal);
                return true;
            } else {
                log.debug("Error en la respuesta de la API externa", response);
                return false;
            }
        } catch (error) {
            log.debug("error", error);
            return false;
        }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
        try {

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});