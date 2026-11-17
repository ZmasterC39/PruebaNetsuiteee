/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros pendientes de procesamiento y envía los datos a un API externo.
Ambiente: Producción
*/

define([
    'N/log',
    'N/search',
    'N/query',
    "N/record",
    'N/cache',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION",
    "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
    "N/https",
    "N/runtime",
    "N/format",
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
    'N/file'
], function (log, search, query, record, cache, coberturaController, _funcion, _const, https, runtime, format, _platformController, file) {

    const CACHE_TOKEN_SS_SEGUIMIENTO = {
        NAME: 'HU_EC_CACHE_TKN_SS_SEGUIMIENTO_COBE_7451241',
        KEY: 'token_hunter_ss_seguimiento_cobe',
        TTL: 3000
    };

    function obtenerTokenCache() {
        const tokenCache = cache.getCache({
            name: CACHE_TOKEN_SS_SEGUIMIENTO.NAME,
            scope: cache.Scope.PROTECTED
        });

        return tokenCache.get({
            key: CACHE_TOKEN_SS_SEGUIMIENTO.KEY,
            loader: () => _funcion.loginGetToken(),
            ttl: CACHE_TOKEN_SS_SEGUIMIENTO.TTL
        });
    }

    function execute() {
        try {
            const ids = obtenerIdsAgrupados();
            const total = ids.length;

            log.audit("Inicio de ejecución", `Total de IDs a procesar: ${total}`);

            ids.forEach((idRegistro, index) => {
                log.audit("Procesando registro", `${index + 1} de ${total} | ID: ${idRegistro}`);

                const dataProcess = obtenerDetallesPorId(idRegistro);

                if (!dataProcess) {
                    log.debug("Sin datos", `No se encontró información para ID ${idRegistro}`);
                    return true;
                }

                const { proceso, idRegistro: ID_COBERTURA, id: id_proceso_cobe, traza } = dataProcess;
                log.debug("Proceso detectado", { proceso, ID_COBERTURA });

                switch (proceso) {
                    case "EnvioCobertura":
                        try {

                            let htCoberturaDispositivoRecord;
                            let usuarioModifico = null;

                            try {

                                log.debug("ID_COBERTURA", ID_COBERTURA);

                                const idFiltro = Array.isArray(ID_COBERTURA)
                                    ? ID_COBERTURA
                                    : [ID_COBERTURA];

                                const busqueda = search.create({
                                    type: "customrecord_ht_co_cobertura",
                                    filters: [
                                        ["internalid", "anyof", idFiltro]
                                    ],
                                    columns: [
                                        "internalid",
                                        "custrecord_ht_co_bien",
                                        "custrecord_ht_co_familia_prod",
                                        "custrecord_ht_co_coberturainicial",
                                        "custrecord_ht_co_coberturafinal",
                                        "custrecord_ht_co_subsidiaria",
                                        "lastmodifiedby"
                                    ]
                                });

                                const resultado = busqueda.run().getRange({ start: 0, end: 1 });

                                log.debug("RESULTADO LENGTH", resultado.length);

                                if (resultado.length > 0) {

                                    const row = resultado[0];
                                    log.debug("ROW", row);

                                    // Mock de record compatible con getValue
                                    htCoberturaDispositivoRecord = {
                                        getValue: (field) => {

                                            // Soportar ambos formatos:
                                            // getValue("campo")  o  getValue({ fieldId: "campo" })
                                            let fieldId = typeof field === "string"
                                                ? field
                                                : field.fieldId;

                                            const val = row.getValue({ name: fieldId });

                                            if (Array.isArray(val)) {
                                                return val.length ? val[0].value : null;
                                            }

                                            return val;
                                        }
                                    };

                                    // Obtener usuario que modificó
                                    const valUser = row.getValue({ name: "lastmodifiedby" });
                                    usuarioModifico = Array.isArray(valUser) ? valUser[0].value : valUser;

                                    log.debug("Usuario que modificó", usuarioModifico);

                                } else {
                                    throw "NOT_FOUND";
                                }

                            } catch (loadError) {

                                log.debug("ERROR EN BUSQUEDA", loadError);

                                // Si el registro no existe en NetSuite, se procesa como eliminación

                                let trazaObj = {};
                                if (traza) {
                                    traza
                                        .replace(/[{}]/g, "")
                                        .split(",")
                                        .forEach(par => {
                                            const [key, value] = par.split("=");
                                            if (key && value) trazaObj[key.trim()] = value.trim();
                                        });
                                }

                                const respuestaCasoDelete = {
                                    IdCobertura: ID_COBERTURA,
                                    Accion: "delete",
                                    IdBien: trazaObj.bienCobe || null
                                };

                                log.debug("Enviando eliminación a API externa", respuestaCasoDelete);

                                const estatus = GeneralEnviarDatosAPIExterna(respuestaCasoDelete, "EnvioCobertura");

                                log.debug("Estatus de eliminación", estatus);

                                return true;
                            }

                            const datosParaAPIInterna = GeneralPrepararDatosParaApiInterna(
                                htCoberturaDispositivoRecord,
                                usuarioModifico,
                                "EnvioCobertura"
                            );
                            datosParaAPIInterna.Id = ID_COBERTURA

                            if (isCoberturaInactiva(ID_COBERTURA)) {
                                AumentarValorCampo(id_proceso_cobe, "custrecord_impulso_log_pro_general", true, "Cobertura Inactiva", true);
                            }

                            const respuestaAPIInterna = GeneralConsumirApiInterna(datosParaAPIInterna, "POST", "EnvioCobertura");

                            respuestaAPIInterna.Empresa = "2";
                            respuestaAPIInterna.Accion = "edit";

                            log.debug("Datos preparados para API externa", respuestaAPIInterna);

                            const estatus = GeneralEnviarDatosAPIExterna(
                                respuestaAPIInterna,
                                "EnvioCobertura",
                                id_proceso_cobe
                            );

                            log.debug("Estatus de envío API externa", estatus);
                        } catch (innerError) {
                            log.error("Error procesando EnvioCobertura", {
                                idRegistro,
                                mensaje: innerError.message,
                                stack: innerError.stack
                            });
                        }
                        break;

                    default:
                        break;
                }
            });

            return true;

        } catch (error) {
            log.error("Error general en la ejecución del script", {
                mensaje: error.message,
                stack: error.stack
            });
            return false;
        }
    }


    /*
   * Funciones Adicionales
   */
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

    function GeneralPrepararDatosParaApiInterna(record, idUsuario, accion) {

        try {
            switch (accion) {

                case "EnvioCobertura":
                    const internalid = record.getValue("internalid");
                    const idbien = record.getValue("custrecord_ht_co_bien");
                    const id_familia_bien = record.getValue("custrecord_ht_co_familia_prod");
                    const coberturaInicial = record.getValue("custrecord_ht_co_coberturainicial");
                    const coberturaFinal = record.getValue("custrecord_ht_co_coberturafinal");
                    const subsidiary = record.getValue("custrecord_ht_co_subsidiaria");
                    const resultado = valorAdicionalPD(coberturaInicial, coberturaFinal);
                    let idcobe = record.getValue("custrecord_ht_co_subsidiaria");

                    if (subsidiary && subsidiary != 2 && subsidiary != "2") { return false; }

                    return {
                        internalid,
                        idbien,
                        id_familia_bien,
                        TipoPlazo: resultado.Tipo_plazo,
                        IdUsuario: idUsuario,
                        IdDocumento: 0,
                        CodDocumento: "",
                        Comentario: ""
                    };

                default:
                    return false; // Si no se reconoce el caso, retornar false
            }

        } catch (error) {
            log.debug("Error al preparar datos para API interna", error);
            return false;
        }

    }

    function GeneralConsumirApiInterna(json, method, accion) {
        try {
            let respuesta = false

            switch (accion) {
                case "EnvioCobertura":

                    if (!json) { return []; }

                    respuesta = coberturaController.makeApiRequest(
                        {
                            // accion: "PasoDatos",     
                            accion: "PasoDatos_N",
                            // idvehiculo: json.idbien,
                            // idgrupoproducto: json.id_familia_bien,
                            IdCobertura: json.Id
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
                default:
                    return false; // Si no se reconoce el caso, retornar false
            }
        } catch (error) {
            log.debug("error", error.stack)
            return []
        }
    }

    function GeneralEnviarDatosAPIExterna(data, accion, idRegistro) {
        try {
            let token;
            let headers;
            let options;
            let response;
            let temporal;

            switch (accion) {
                case "EnvioCobertura":
                    // log.debug("Caso Envió Cobertura", "Enviando datos a la API externa para Envió Cobertura");
                    if (data == []) {
                        return false;
                    }

                    token = obtenerTokenCache();
                    headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };
                
                    let valor
                    // Opción 1: Con if/else
                    if (data.Ubicacion) {
                        valor = data.Ubicacion.replace('.', '');
                        data.Ubicacion = valor;
                    } else {
                        data.Ubicacion = "";
                    }

                    options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
                        headers: headers,
                        body: JSON.stringify(data),
                    };

                    log.debug("--Opciones de la API externa--", options);
                    response = https.post(options);

                    temporal = false

                    if (response && response.body != "") {
                        temporal = JSON.parse(response.body);
                    }

                    if (temporal && temporal.statusCode === 200) {
                        // log.debug("Respuesta de la API externa", temporal);

                        let respuestssss = AumentarValorCampo(idRegistro, "custrecord_impulso_log_pro_general", true, temporal)

                        // log.debug("--data--", data)

                        if (data?.IdCobertura) {
                            ControlRegistroEnvio(data?.IdCobertura, "T")
                        }

                        return true;
                    } else {

                        if (temporal && temporal?.result == "NO SE ENCONTRÓ BIEN CREADO") {

                            GenerarLogCambioEstado(data, data.IdBien, 'F', "PD_Bienes");
                            GenerarLogCambioEstado(data, data.IdClienteNs, 'F', "PD_Cliente");
                        }
                        log.debug("Error en la respuesta de la API externa", response);
                        AumentarValorCampo(idRegistro, "custrecord_impulso_log_pro_general", false, temporal) // ! Solo Aumenta Impulso 

                        ControlRegistroEnvio(data?.IdCobertura, "F")


                        return false;
                    }

                default:
                    // log.debug("Caso no reconocido", "No se reconoce el caso para enviar datos a la API externa");
                    return false; // Si no se reconoce el caso, retornar false
            }


        } catch (error) {
            log.debug("error", error.stack)
            return false;
        }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, proceso) {
        try {

            if (!context || !registroID || !EstadoProcesado || !proceso) { return; }

            // Verifica si el registro ya existe
            const existingSearch = search.create({
                type: 'customrecord_log_proceso_general',
                filters: [
                    ['custrecordlog_proceso_general_proceso', 'is', proceso],
                    'AND',
                    ['custrecordid_registro_proc_general', 'is', registroID],
                    'AND',
                    ["custrecord_producto_lpc", "startswith", "F"]
                ],
                columns: ['internalid']
            });

            const existingResult = existingSearch.run().getRange({ start: 0, end: 1 });

            if (existingResult.length > 0) {
                // log.debug("Registro ya existe", `El registro con ID ${registroID} y proceso ${proceso} ya existe.`);
                return; // Si el registro ya existe, no se crea uno nuevo
            } else {
                let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
                objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: proceso });
                objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
                objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
                objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
                objRecord.save();
            }

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error.stack);
        }
    }

    function AumentarValorCampo(idRegistro, campo, status, respuesta, Manual = false) {
        try {
            if (!idRegistro || !campo) return false;

            // Cargar el registro completo
            const rec = record.load({
                type: 'customrecord_log_proceso_general',
                id: idRegistro,
                isDynamic: true
            });

            // Obtener el valor actual y sumarle 1
            const valorActual = rec.getValue({ fieldId: campo }) || "0";
            let nuevoValor = (parseInt(valorActual, 10) + 1).toString();


            if (status) {
                nuevoValor = 4
                rec.setValue({ fieldId: "custrecord_producto_lpc", value: "T" });

                if (Manual) {
                    rec.setValue({ fieldId: "custrecord_producto_lpc", value: "M" });
                }

                rec.setValue({ fieldId: campo, value: 4 });
                rec.setValue({ fieldId: "custrecord_log_proceso_general_rat", value: respuesta });
            } else {
                rec.setValue({ fieldId: campo, value: nuevoValor });
                rec.setValue({ fieldId: "custrecord_log_proceso_general_raf", value: respuesta });
            }

            
            const idGuardado = rec.save();
            log.debug("idGuardado", idGuardado)
            return true;
        } catch (error) {
            log.error("Error en AumentarValorCampo", error.stack);
            return false;
        }
    }

    function ControlRegistroEnvio(idRegistro, estado) {
        try {
            const logSearch = search.create({
                type: "customrecord_log_proceso_general",
                filters: [
                    ["custrecordlog_proceso_general_proceso", "startswith", "EnvioCobertura"], "AND",
                    ["custrecordid_registro_proc_general", "startswith", idRegistro], "AND",
                    ["custrecord_producto_lpc", "startswith", "F"], 'AND',
                    ['custrecord_log_proceso_general_traza', 'doesnotstartwith', '"01"'],
                ],
                columns: ["id", "custrecord_producto_lpc"]
            });

            const pagedData = logSearch.runPaged({ pageSize: 1000 });
            let contador = 0;

            pagedData.pageRanges.forEach(pageRange => {
                const page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(result => {
                    const recordId = result.id;

                    record.submitFields({
                        type: "customrecord_log_proceso_general",
                        id: recordId,
                        values: {
                            custrecord_producto_lpc: estado
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    contador++;
                });
            });

        } catch (e) {
            log.error("Error al actualizar registros", e);
        }
    }

    function obtenerIdsAgrupados() {
        const searchObj = search.create({
            type: "customrecord_log_proceso_general",
            filters: [
                [
                    ['custrecordlog_proceso_general_proceso', 'startswith', 'EnvioCobertura'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_impulso_log_pro_general', 'lessthan', '4'],
                    'AND',
                    ['custrecord_producto_lpc', 'startswith', 'F'],
                ]
            ],
            columns: [
                search.createColumn({
                    name: "custrecordid_registro_proc_general",
                    summary: search.Summary.GROUP,
                    label: "ID Registro General"
                })
            ]
        });

        const ids = [];

        const results = searchObj.run().getRange({ start: 0, end: 110 });

        for (let i = 0; i < results.length; i++) {
            const idRegistro = results[i].getValue({
                name: "custrecordid_registro_proc_general",
                summary: search.Summary.GROUP
            });
            ids.push(idRegistro);
        }

        return ids;
    }

    function obtenerDetallesPorId(idRegistro) {
        try {
            if (!idRegistro) { return null; }

            const searchObj = search.create({
                type: "customrecord_log_proceso_general",
                filters: [
                    ["custrecordid_registro_proc_general", "is", idRegistro],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ['custrecordlog_proceso_general_proceso', 'startswith', 'EnvioCobertura']
                ],
                columns: [
                    search.createColumn({ name: "id", sort: search.Sort.DESC, label: "ID" }),
                    search.createColumn({ name: "owner", label: "Propietario" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_producto_lpc", label: "Producto" }),
                    search.createColumn({ name: "custrecordlog_proceso_general_proceso", label: "Proceso" }),
                    search.createColumn({ name: "custrecordid_registro_proc_general", label: "ID Registro" }),
                    search.createColumn({ name: "custrecord_log_proceso_general_traza", label: "Traza" }),
                    search.createColumn({ name: "custrecord_impulso_log_pro_general", label: "Impulso" })
                ]
            });

            const results = searchObj.run().getRange({ start: 0, end: 1 });

            if (!results || results.length === 0) { return null; }

            const result = results[0];
            const detalle = {
                id: result.getValue("id"),
                propietario: result.getText("owner"),
                fecha: result.getValue("created"),
                producto: result.getValue("custrecord_producto_lpc"),
                proceso: result.getValue("custrecordlog_proceso_general_proceso"),
                idRegistro: result.getValue("custrecordid_registro_proc_general"),
                traza: result.getValue("custrecord_log_proceso_general_traza"),
                impulso: result.getValue("custrecord_impulso_log_pro_general")
            };

            return detalle;

        } catch (error) {
            log.error("Error en obtenerDetallesPorId", error.stack);
            return null;
        }
    }

    /**
    * Valida si un registro de cobertura está inactivo
    * @param {string|number} recordId
    * @returns {boolean} true = inactivo | false = activo o error
    */
    function isCoberturaInactiva(recordId) {
        try {
            if (!recordId) return false;

            var searchObj = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["internalid", "anyof", recordId],
                    "AND",
                    ["isinactive", "is", "T"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" })
                ]
            });

            var result = searchObj.run().getRange({ start: 0, end: 1 });

            return result && result.length > 0;

        } catch (e) {
            log.error({
                title: 'Error validando cobertura inactiva',
                details: e
            });
            // En caso de error, no bloquea procesos
            return false;
        }
    }

    return {
        execute: execute,
    };
});