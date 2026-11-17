/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 11/02/2025
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Busca coberturas (subsidiaria 2) modificadas en la última hora vía notas del sistema y envía datos a un API externo.
Script: MapReduceScript
Ambiente: Producción
*/
define([
    "N/https",
    "N/log",
    "N/record",
    "N/search",
    "N/query",
    "N/cache",
    "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
    "./UtilsGeneral/HU_EC_FUNCION",
    "./UtilsGeneral/HU_EC_CONSTANTES"
], function (https, log, record, search, query, cache, coberturaController, _funcion, _const) {

    // Cache de token a nivel de instancia
    let tokenInstancia = null;

    function getInputData() {
        try {
            let rangoAjustado = obtenerRangoHoraEcuador();
            log.debug("rangoHora", rangoAjustado);

            const sql = `
                SELECT recordid, lastuser, bien, familia, cobinicial, cobfinal
                FROM (
                    SELECT sn.recordid,
                           sn.name AS lastuser,
                           co.custrecord_ht_co_bien AS bien,
                           co.custrecord_ht_co_familia_prod AS familia,
                           co.custrecord_ht_co_coberturainicial AS cobinicial,
                           co.custrecord_ht_co_coberturafinal AS cobfinal,
                           ROW_NUMBER() OVER (PARTITION BY sn.recordid ORDER BY sn.date DESC, sn.id DESC) AS rn
                    FROM SystemNote sn
                    JOIN customrecord_ht_co_cobertura co ON co.id = sn.recordid
                    WHERE sn.recordtypeid = 677
                      AND co.custrecord_ht_co_subsidiaria = 2
                      AND co.isinactive = 'F'
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
                user: r.lastuser,
                bien: r.bien,
                familia: r.familia,
                cobinicial: r.cobinicial,
                cobfinal: r.cobfinal
            }));

        } catch (error) {
            log.error("Error en getInputData", error);
            return;
        }
    }

    function map(context) {
        try {
            const data = JSON.parse(context.value);

            if (!data.id) {
                log.error("Datos incompletos en el registro", data);
                return;
            }

            log.debug("Procesando registro", { recordId: data.id, contextType: data.user });

            const plazo = valorAdicionalPD(data.cobinicial, data.cobfinal);

            const datosParaAPIInterna = {
                idCobertura: data.id,
                idbien: data.bien,
                id_familia_bien: data.familia,
                TipoPlazo: plazo.Tipo_plazo,
                IdUsuario: data.user,
                IdDocumento: 0,
                CodDocumento: "",
                Comentario: ""
            };

            const respuestaAPIInterna = consumirAPIInterna2(datosParaAPIInterna);
            respuestaAPIInterna.Empresa = "2";
            respuestaAPIInterna.Accion = "edit";

            log.debug("infCompleta", respuestaAPIInterna);
            enviarDatosAPIExterna(respuestaAPIInterna);
        } catch (error) {
            log.error("Error en map", error);
        }
    }

    function reduce(context) {
        try {
            return true;
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
        }
    }

    /**
     * Funciones Auxiliares
     */
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

    function valorAdicionalPD(fechaInicio, fechaFin) {
        try {
            if (!fechaInicio || !fechaFin) {
                return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
            }

            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);

            const diferenciaAnios = fin.getFullYear() - inicio.getFullYear();
            const diferenciaMeses = diferenciaAnios * 12 + (fin.getMonth() - inicio.getMonth());
            const diferenciaTiempo = fin - inicio;
            const diferenciaDias = diferenciaTiempo / (1000 * 60 * 60 * 24);

            if (diferenciaMeses % 12 === 0 && diferenciaMeses >= 12) {
                return { id_plazo: 1, Tipo_plazo: "AÑOS", Diferencia: diferenciaMeses / 12 };
            } else if (diferenciaMeses > 0) {
                return { id_plazo: 2, Tipo_plazo: "MESES", Diferencia: diferenciaMeses };
            } else {
                return { id_plazo: 3, Tipo_plazo: "DÍAS", Diferencia: Math.floor(diferenciaDias) };
            }
        } catch (error) {
            return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
        }
    }

    function consumirAPIInterna2(json, method) {
        try {

            if (!json) { return []; }

            let respuesta = coberturaController.makeApiRequest(
                {
                    accion: "PasoDatos_N",
                    IdCobertura: json.idCobertura
                },
                "customdeploy_hu_ec_rs_in_coberturas",
                "customscript_hu_ec_rs_in_coberturas",
                method,
                false
            );

            if (respuesta && (respuesta.status == "error")) {
                return [];
            } else {
                respuesta.TipoPlazo = json?.TipoPlazo || "";
                respuesta.IdUsuario = json?.IdUsuario || 0;
                respuesta.IdDocumento = json?.IdDocumento || 0;
                respuesta.CodDocumento = json?.CodDocumento || "";
                respuesta.Comentario = json?.Comentario || "";

                return respuesta;
            }
        } catch (error) {
            log.debug("error", error);
            return [];
        }
    }

    /**
     * Obtiene el token cacheado. Primero revisa la variable de instancia;
     * si no existe, lo lee de N/cache (con loader que hace login solo si expiró).
     */
    function obtenerTokenCacheado() {
        if (tokenInstancia) {
            return tokenInstancia;
        }

        const miCache = cache.getCache({
            name: "TOKEN_HUNTER_COBERTURA",
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

    function enviarDatosAPIExterna(data) {
        let response;
        try {
            if (data == [] || data == {} || !data) {
                return false;
            }

            const token = obtenerTokenCacheado();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const options = {
                method: "POST",
                url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
                headers: headers,
                body: JSON.stringify(data),
            };

            response = https.post(options);

            let temporal = false;

            if (response && response.body != "") {
                temporal = JSON.parse(response.body);
            }

            log.debug("Respuesta de la API externa", temporal);
            if (temporal && temporal.statusCode === 200) {
                generarLogCambioEstado(data, response, "T", 4);
                return true;
            } else {
                generarLogCambioEstado(data, response, "F", 0);
                return false;
            }
        } catch (error) {
            generarLogCambioEstado(data, response ? response : "", "F", 0);
            log.debug("error", error);
            return false;
        }
    }

    function generarLogCambioEstado(context, resultadoComercial, bool, num) {
        try {

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "EnvioCobertura" });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: context });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: context?.IdCobertura || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: bool });
            objRecord.setValue({ fieldId: 'custrecord_impulso_log_pro_general', value: num });

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