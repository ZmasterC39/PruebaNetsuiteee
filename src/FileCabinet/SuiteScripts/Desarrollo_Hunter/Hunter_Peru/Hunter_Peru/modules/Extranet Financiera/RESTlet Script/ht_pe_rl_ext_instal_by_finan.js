/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], (query, log) => {

    function post(body) {
        try {

            const params = (typeof body === 'string') ? JSON.parse(body) : body;

            const fechaInicio = params.fechaInicio;
            const fechaFin    = params.fechaFin;

            if (!fechaInicio || !fechaFin) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fechaInicio, fechaFin'
                };
            }

            let sql = `
SELECT DISTINCT
    b.custrecord_ht_bien_codsysh        AS codigo_vehiculo,
    os.memo                             AS numero_os,
    b.custrecord_ht_bien_placa          AS placa,
    b.custrecord_ht_bien_motor AS MOTOR,
    b.custrecord_ht_bien_chasis AS CHASIS,
    NVL(mar.name, '')                   AS marca,
    NVL(mod.name, '')                   AS modelo,
    CASE
                    WHEN ot.custrecord_ht_ot_estado = '2' THEN 'TRABAJADO'
                    WHEN ot.custrecord_ht_ot_estado = '4' THEN 'PROCESO DE TRABAJO'
                    WHEN ot.custrecord_ht_ot_estado = '8' THEN 'ENTREGADO'
                    WHEN ot.custrecord_ht_ot_estado = '9' THEN 'CERRADO'
                    ELSE 'SIN PROGRAMAR'
    END AS estado_instalacion,
    c.altname as CLIENTE,
    direc.custrecord_pe_departamento    AS departamento,
    /* ========= FECHA FIN (ÚLTIMO PRODUCTO) ========= */
    CASE
        WHEN (pro.displayname LIKE '%REINST%'
           OR pro.displayname LIKE '%DISP%')
         AND ot.custrecord_ht_ot_estado = '2'
        THEN ADD_MONTHS(
                ot.custrecord_ht_ot_fechatrabajoasignacion,
                cob.custrecord_ht_co_plazo
             )
        ELSE cob.custrecord_ht_co_coberturafinal
    END AS fecha_fin,
    cob.created                         AS fecha_instalacion,
    pro.displayname                     AS producto

FROM transaction os

LEFT JOIN transactionline tl
    ON tl.transaction = os.id
   AND tl.mainline = 'F'

LEFT JOIN customrecord_ht_record_ordentrabajo ot
    ON ot.custrecord_ht_ot_orden_servicio = os.id

LEFT JOIN customrecord_ht_record_bienes b
    ON os.custbody_ht_so_bien = b.id

LEFT JOIN customrecord_ht_record_tipovehiculo tip
    ON tip.id = b.custrecord_ht_bien_tipo

LEFT JOIN customrecord_ht_bn_modelo mod
    ON mod.id = b.custrecord_ht_bien_modelo

LEFT JOIN customrecord_ht_bien_marca mar
    ON mar.id = b.custrecord_ht_bien_marca

LEFT JOIN item pro
    ON pro.id = ot.custrecord_ht_ot_item

/* ========= SOLO ÚLTIMA COBERTURA ========= */
LEFT JOIN (
    SELECT
        custrecord_ht_co_bien,
        MAX(created) AS max_created
    FROM customrecord_ht_co_cobertura
    GROUP BY custrecord_ht_co_bien
) last_cob
    ON last_cob.custrecord_ht_co_bien = b.id

LEFT JOIN customrecord_ht_co_cobertura cob
    ON cob.custrecord_ht_co_bien = b.id
   AND cob.created = last_cob.max_created

LEFT JOIN customer c
    ON c.id = os.entity

LEFT JOIN customrecord_ht_record_canaldistribucion fina
ON fina.id = b.custrecord_ht_bien_financiadovehiculo

LEFT JOIN entityaddress direc
    ON direc.recordowner = c.id
   AND direc.country = 'PE'

WHERE os.type = 'SalesOrd'
  AND os.custbody_ts_ec_subsidiaria_pais = 174
    AND os.prevdate BETWEEN ? AND ?
    AND pro.displayname LIKE '%DISP%'
    AND fina.custrecord_ht_cd_ruccanaldistribucion = '20604093091'
`;

            const paramsList = [
                fechaInicio,
                fechaFin
            ];

            log.debug('SQL Ejecutado', sql);
            log.debug('Parámetros', paramsList);

            const resultSet = query.runSuiteQL({
                query: sql,
                params: paramsList
            });

            return {
                data: resultSet.asMappedResults()
            };

        } catch (e) {
            log.error('Error RESTlet', e);
            return {
                success: false,
                message: e.message
            };
        }
    }

    return { post };
});