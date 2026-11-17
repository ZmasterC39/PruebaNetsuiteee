/**
 * HT – Alerta de Vencimiento (Restlet)
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {

    /**
     * POST – cuerpo esperado: { "DIAS_ANTICIPACION": <número> }
     */
    function doPost (body) {
        try {
            /* -----------------------------------------------------------
             * 1. Validamos y normalizamos el parámetro
             * --------------------------------------------------------- */
            var dias = Number(body.DIAS_ANTICIPACION);
            if (isNaN(dias) || dias < 0) {
                throw Error('DIAS_ANTICIPACION debe ser un número positivo');
            }
            var diasMasUno = dias + 1;

            /* -----------------------------------------------------------
             * 2. SuiteQL optimizado
             *    – rango [>= fecha + días  y  < fecha + días+1]
             *    – sin TRUNC(columna) ⇒ índice usable
             *    – runSuiteQL (no paged) ⇒ un solo viaje a BD
             * --------------------------------------------------------- */
            var sql = `
                SELECT
                      trans.id                     AS "ID_Orden_Servicio"
                    , trans.tranId                 AS "Numero_Orden_Servicio"
                    , trans.tranDate               AS "Fecha_Orden_Servicio"
                    , trans.memo                   AS "Nota Orden de Servicio"

                    , bienes.id                    AS "ID_Bien"
                    , bienes.altname               AS "Nombre_Bien"
                    , bienes.custrecord_ht_bien_placa       AS "Placa_Bien"
                    , bienes.custrecord_ht_bien_marca       AS "Marca_Bien"
                    , bienes.custrecord_ht_bien_modelo      AS "Modelo_Bien"
                    , bienes.custrecord_ht_bien_ano         AS "Año_Bien"
                    , bienes.custrecord_ht_bien_codsysh     AS "Cod_SysHunter"
                    , bienes.custrecord_bn_subsidiaria      AS "Subsidiaria_Bien"

                    , item.itemId                  AS "ID_Articulo"
                    , item.description             AS "Descripcion_Articulo"

                    , cob.id                       AS "Cobertura_ID"
                    , cob.custrecord_ht_co_coberturafinal   AS "Cobertura_Final"
                    , cob.custrecord_ht_co_coberturainicial AS "Cobertura_Inicial"

                    , cust.id                      AS "ID_Cliente"
                    , cust.entityid                AS "Cliente_EntityId"
                    , cust.altname                 AS "Cliente_AltName"
                    , cust.email                   AS "Cliente_Email"

                FROM customrecord_ht_record_bienes       bienes
                JOIN customrecord_ht_co_cobertura         cob
                     ON bienes.id = cob.custrecord_ht_co_bien
                JOIN customer                             cust
                     ON bienes.custrecord_ht_bien_propietario = cust.id
                LEFT JOIN customrecord_ht_osr_ordenes_serv_rela rel
                     ON bienes.id = rel.custrecord_ht_osr_campo_relacion
                LEFT JOIN transaction                      trans
                     ON rel.custrecord_ht_osr_orden_servicio = trans.id
                LEFT JOIN item                             item
                     ON rel.custrecord_ht_osr_articulo_ori   = item.id

                WHERE cob.custrecord_ht_co_coberturafinal >= TRUNC(SYSDATE) + ?
                  AND cob.custrecord_ht_co_coberturafinal <  TRUNC(SYSDATE) + ?
                  AND bienes.custrecord_bn_subsidiaria     = 3
            `;

            /* params = números ⇒ SuiteQL feliz                               */
            var resultados = query.runSuiteQL({
                query  : sql,
                params : [ dias, diasMasUno ]
            }).asMappedResults();

            log.audit({
                title  : 'Alerta Vencimiento',
                details: 'Filas devueltas: ' + resultados.length
            });

            return {
                success      : true,
                diasAnticipacion: dias,
                totalRecords : resultados.length,
                data         : resultados
            };

        } catch (e) {
            log.error({ title: 'Fallo Restlet', details: e });
            return { success: false, error: e.message };
        }
    }

    return { post: doPost };
});
