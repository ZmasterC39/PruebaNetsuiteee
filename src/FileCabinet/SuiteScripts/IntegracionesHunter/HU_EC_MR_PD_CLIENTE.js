/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 09/12/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros con contexto UIF, CSV y UES sobre clientes de Subsidiaria 2 mediante SuiteQL. Se reajusta cada 8 Horas
Ambiente: Produccion
*/
define([
    'N/search',
    'N/log',
    'N/record',
    'N/cache',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
    'N/query',
    'N/https'
], function (search, log, record, cache, coberturaController, _funcion, _const, query, https) {

    const CACHE_TOKEN_CLIENTE = {
        NAME: 'HU_EC_CACHE_TOKEN_CLIENTE',
        KEY: 'token_hunter_cliente',
        TTL: 3000
    };

    function obtenerTokenCache() {
        const tokenCache = cache.getCache({
            name: CACHE_TOKEN_CLIENTE.NAME,
            scope: cache.Scope.PROTECTED
        });

        return tokenCache.get({
            key: CACHE_TOKEN_CLIENTE.KEY,
            loader: () => _funcion.loginGetToken(),
            ttl: CACHE_TOKEN_CLIENTE.TTL
        });
    }

    function getInputData() {
        try {
            let rangoAjustado = obtenerRangoTiempoEcuador();
            log.audit("rangoHora", rangoAjustado);
            
            // let rangoAjustado = { HoraInicio: "30/07/2026 08:00", HoraFin: "30/07/2026 16:00" };
            // log.debug("rangoHora", rangoAjustado);

            const sql = `
                SELECT recordid, context, vatregnumber
                FROM (
                    SELECT sn.recordid, sn.context, c.vatregnumber,
                           ROW_NUMBER() OVER (PARTITION BY sn.recordid ORDER BY sn.date DESC, sn.id DESC) AS rn
                    FROM SystemNote sn
                    JOIN customer c ON c.id = sn.recordid
                    WHERE 1=1 
                      --AND sn.context IN ('UIF', 'CSV', 'UES')
                      AND sn.recordtypeid = -9
                      AND c.subsidiary = 2
                      AND c.isinactive = 'F'
                      AND c.vatregnumber IS NOT NULL
                      AND sn.date BETWEEN TO_DATE(?, 'DD/MM/YYYY HH24:MI') AND TO_DATE(?, 'DD/MM/YYYY HH24:MI')
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
                context: r.context,
                dni: r.vatregnumber
            }));

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {
        try {
            const data = JSON.parse(context.value);

          log.debug("--data--", data)
          
            if (!data.id || !data.dni) {
                log.error("Datos incompletos en el registro", data);
                return;
            }
            context.write({ key: data.id, value: data.dni });
        } catch (error) {
            log.error("Error en map", error);
        }
    }

    function reduce(context) {
        try {
            const recordId = context.key;
            log.debug("ID del registro", recordId);
            let DNI = context.values[0];

            // return // prueba

            const respuestaAPIInterna = ConsumirAPIInterna2({ identificacion: DNI }, 'POST');

            if (Object.keys(respuestaAPIInterna).length === 0) {
                log.error("Error", "La función Api Interna devolvió un objeto vacío.");
                return;
            }

            const respuestaExterna = EnviarDatosAPIExternaCobertura(respuestaAPIInterna);
            log.debug("Respuesta", respuestaExterna);

            if (!respuestaExterna) {
                log.error("Error en envío", `El envío falló para el CLIENTE con ID: ${recordId}`);
                GenerarLogCambioEstado(respuestaAPIInterna, recordId, 'F', "PD_Cliente");
                return false;
            } else {
                GenerarLogCambioEstado(respuestaAPIInterna, recordId, 'T', "PD_Cliente");
            }

            log.debug("------", "----------------");

        } catch (error) {
            log.error("Error en reduce", error);
            GenerarLogCambioEstado({}, context.key, 'F', "PD_Cliente");
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

    function obtenerRangoTiempoEcuador() {
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
            log.debug("Error en obtenerRangoTiempoEcuador", error);
            return {};
        }
    };

    function formatearFechaHora(fecha) {
        let dia = fecha.getDate().toString().padStart(2, "0");
        let mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        let anio = fecha.getFullYear();
        let hora = fecha.getHours().toString().padStart(2, "0");
        let minutos = fecha.getMinutes().toString().padStart(2, "0");

        return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
    };

    function ConsumirAPIInterna2(json, method) {
        try {
            if (!json) { return []; }

            log.debug("Datos para la API interna", json);

            let respuesta = coberturaController.makeApiRequest(
                {
                    opcion: "MIGRA_CLIENTE",
                    identificacion: json.identificacion,
                },
                "customdeploy_hu_ec_rs_in_cliente",
                "customscript_hu_ec_rs_in_cliente",
                method,
                false
            );

            if (respuesta && (respuesta.status == "error")) {
                return [];
            } else {
                return respuesta;
            }
        } catch (error) {
            log.debug("error", error)
            return [];
        }
    };

    function EnviarDatosAPIExternaCobertura(data) {
        try {
            if (data == [] || data == {} || !data) {
                return false;
            }

            const token = obtenerTokenCache();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const options = {
                method: "POST",
                url: _const.URLS.HUNTER_API_NETSUITE + "/Cliente/RegistrarCliente",
                headers: headers,
                body: JSON.stringify(data),
            };

            log.debug("Opciones de la API externa", options);

            const response = https.post(options);

            let temporal = false

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
            log.debug("error", error)
            return false;
        }
    };

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
        try {
            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "PD_Cliente" });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});