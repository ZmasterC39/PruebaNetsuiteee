/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], (query, log) => {

    function post(body) {
        try {
            const params = (typeof body === 'string') ? JSON.parse(body) : body;

            const fechaInicio = params.fechaInicio;
            const fechaFin = params.fechaFin;
            const financiera = params.financiera;

            if (!fechaInicio || !fechaFin || !financiera) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fechaInicio, fechaFin, financiera'
                };
            }

            let sql = `
SELECT distinct
    x.placa,
    x.producto,
    x.tipo,
    x.marca,
    x.motor,
    x.modelo,
    x.departamento,
    x.estado_os,
    x.fecha_os,
    x.fecha_fin,
    y.fecha_ultimo_chequeo,
    x.codigo_bien,
    z.fecha_instalacion,
    x.chasis,
    x.estado_instalacion,
    x.cliente,
    x.numero_os
FROM (
    SELECT
        b.custrecord_ht_bien_placa AS placa,
        pro.displayname AS producto,
        CASE
            WHEN pro.displayname LIKE '%RENOV%' THEN 'RENOVACION'
            ELSE 'INSTALACION'
        END AS tipo,
        NVL(mar.name, '') AS marca,
        b.custrecord_ht_bien_motor AS motor,
        NVL(mod.name, '') AS modelo,
        direc.custrecord_pe_departamento AS departamento,
        CASE
            WHEN cob.custrecord_ht_co_coberturafinal < os.prevdate
                THEN 'ANULADO'
            ELSE 'ACTIVO'
        END AS estado_os,
        CASE
            WHEN cob.custrecord_ht_co_estado_cobertura = '1'
                THEN 'INSTALADO'
            ELSE 'DESINSTALADO'
        END AS estado_instalacion,
        os.prevdate AS fecha_os,
        cob.custrecord_ht_co_coberturafinal AS fecha_fin,
        b.custrecord_ht_bien_codsysh AS codigo_bien,
        b.custrecord_ht_bien_chasis AS chasis,
        c.altname AS cliente,
        os.memo AS numero_os
    FROM transaction os
    LEFT JOIN customrecord_ht_record_ordentrabajo ot
        ON ot.custrecord_ht_ot_orden_servicio = os.id
    LEFT JOIN customrecord_ht_record_bienes b
        ON os.custbody_ht_so_bien = b.id
    LEFT JOIN customrecord_ht_bn_modelo mod
        ON mod.id = b.custrecord_ht_bien_modelo
    LEFT JOIN customrecord_ht_bien_marca mar
        ON mar.id = b.custrecord_ht_bien_marca
    LEFT JOIN item pro
        ON pro.id = ot.custrecord_ht_ot_item
    LEFT JOIN customrecord_ht_co_cobertura cob
        ON cob.custrecord_ht_co_bien = b.id
    LEFT JOIN customer c
        ON c.id = os.entity
    LEFT JOIN customrecord_ht_record_canaldistribucion fina
        ON fina.id = b.custrecord_ht_bien_financiadovehiculo
    LEFT JOIN entityaddress direc
        ON direc.recordowner = c.id
        AND direc.country = 'PE'
    WHERE
        os.type = 'SalesOrd'
        AND os.custbody_ts_ec_subsidiaria_pais = 174
        AND os.prevdate BETWEEN ? AND ?
        AND (
            pro.displayname LIKE '%DISP%'
            OR pro.displayname LIKE '%REINST%'
            OR pro.displayname LIKE '%RENOV%'
        )
        AND fina.custrecord_ht_cd_ruccanaldistribucion = ?
        AND os.status <> 'SalesOrd:C'
) x
LEFT JOIN (
    SELECT
        b.custrecord_ht_bien_codsysh AS codigo_bien,
        MAX(ot.custrecord_ht_ot_fechatrabajoasignacion) AS fecha_ultimo_chequeo
    FROM transaction os
    LEFT JOIN customrecord_ht_record_ordentrabajo ot
        ON ot.custrecord_ht_ot_orden_servicio = os.id
    LEFT JOIN item pro
        ON pro.id = ot.custrecord_ht_ot_item
    LEFT JOIN customrecord_ht_record_bienes b
        ON os.custbody_ht_so_bien = b.id
    WHERE pro.displayname LIKE '%CHEQ%'
    GROUP BY b.custrecord_ht_bien_codsysh
) y
    ON y.codigo_bien = x.codigo_bien
LEFT JOIN (
    SELECT
        b.custrecord_ht_bien_codsysh AS codigo_bien,
        MAX(
            CASE
                WHEN ot.custrecord_ht_ot_estado = '2'
                THEN ot.custrecord_ht_ot_fechatrabajoasignacion
                ELSE NULL
            END
        ) AS fecha_instalacion
    FROM transaction os
    LEFT JOIN customrecord_ht_record_ordentrabajo ot
        ON ot.custrecord_ht_ot_orden_servicio = os.id
    LEFT JOIN item pro
        ON pro.id = ot.custrecord_ht_ot_item
    LEFT JOIN customrecord_ht_record_bienes b
        ON os.custbody_ht_so_bien = b.id
    WHERE pro.displayname LIKE '%DISP%'
    GROUP BY b.custrecord_ht_bien_codsysh
) z
    ON z.codigo_bien = x.codigo_bien
`;

            const paramList = [fechaInicio, fechaFin, financiera];

            log.debug('SQL Ejecutado', sql);
            log.debug('Parámetros', paramList);

            const resultSet = query.runSuiteQL({
                query: sql,
                params: paramList
            });

            return {
                success: true,
                cantidad: resultSet.results.length,
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

