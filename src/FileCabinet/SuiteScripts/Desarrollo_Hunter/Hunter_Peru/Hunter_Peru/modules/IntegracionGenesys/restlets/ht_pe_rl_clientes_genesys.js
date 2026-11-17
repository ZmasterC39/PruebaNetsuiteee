/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/query', 'N/log', 'N/runtime'], function (query, log, runtime) {

    var CLAVE_ESPERADA = 'GeneSysCloud#$537';

    function post(context) {
        var codigocliente;
        var clave;
        var currentUserId;

        try {
            clave = context && context.clave;
            codigocliente = context && context.codigocliente;
            currentUserId = runtime.getCurrentUser().id;

            // LOG DE ENTRADA
            log.audit({
                title: 'GENESYS_RESTLET_REQUEST',
                details: {
                    userId: currentUserId,
                    codigocliente: codigocliente,
                    claveRecibida: clave ? '***' : null,
                    rawBody: context
                }
            });

            // 1) Validar clave
            if (clave !== CLAVE_ESPERADA) {
                log.audit({
                    title: 'GENESYS_RESTLET_RESPONSE',
                    details: {
                        codigocliente: codigocliente,
                        resultado: 'CLAVE_INVALIDA'
                    }
                });
                return {
                    results: [],
                    ERROR: 'CLAVE_INVALIDA'
                };
            }

            // 2) Validar parámetro obligatorio
            if (!codigocliente) {
                log.audit({
                    title: 'GENESYS_RESTLET_RESPONSE',
                    details: {
                        codigocliente: codigocliente,
                        resultado: 'FALTA_CODIGOCLIENTE'
                    }
                });
                return {
                    results: [],
                    ERROR: 'FALTA_CODIGOCLIENTE'
                };
            }

            // 3) SuiteQL
            var sql =
                "SELECT " +
                    "altname, " +
                    "custentity_pe_document_number " +
                "FROM " +
                    "customer " +
                "WHERE " +
                    "custentity_pe_document_number = ?";

            var resultSet = query.runSuiteQL({
                query: sql,
                params: [codigocliente]
            });

            var rows = resultSet.asMappedResults();

            if (!rows || rows.length === 0) {
                log.audit({
                    title: 'GENESYS_RESTLET_RESPONSE',
                    details: {
                        codigocliente: codigocliente,
                        resultado: 'NO_ENCONTRADO'
                    }
                });
                return {
                    results: [],
                    ERROR: 'NO_ENCONTRADO'
                };
            }

            var nombre = rows[0].altname;

            // LOG DE SALIDA OK
            log.audit({
                title: 'GENESYS_RESTLET_RESPONSE',
                details: {
                    codigocliente: codigocliente,
                    nombreRetornado: nombre
                }
            });

            // 👉 Formato solicitado
            return {
                results: [
                    {
                        NOMBRE_COMPLETO: nombre || ''
                    }
                ]
            };

        } catch (e) {
            log.error({
                title: 'GENESYS_RESTLET_ERROR',
                details: {
                    codigocliente: codigocliente,
                    error: e
                }
            });

            return {
                results: [],
                ERROR: 'ERROR_INTERNO'
            };
        }
    }

    return {
        post: post
    };
});
