/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], (query, log) => {

    function post(body) {
        try {

            const params = (typeof body === 'string') ? JSON.parse(body) : body;

            const fechaInicio = params.fechaInicio;   // YYYY-MM-DD
            const fechaFin = params.fechaFin;         // YYYY-MM-DD
            const ruc = params.ruc;                   // RUC canal
            const tipoCanal = params.tipoCanal;       // ASE | BRO | CON | OTR
            const chequeo = params.chequeo;           // S | N

            if (!fechaInicio || !fechaFin || !ruc || !tipoCanal || !chequeo) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fechaInicio, fechaFin, ruc, tipoCanal, chequeo'
                };
            }

            let sql = `
SELECT
    x.*,
    NVL(y.cantidad_chequeos, 0) AS cant_cheq,
    Ultimo_chequeo
FROM
(
    SELECT DISTINCT
        os.memo AS numero_os,
        ot.custrecord_ht_ot_fechatrabajoasignacion AS fecha_ot,
        b.custrecord_ht_bien_placa AS placa,
        NVL(mar.name, '') AS marca,
        NVL(mod.name, '') AS modelo,
        NVL(col.name, '') AS color,
        TO_CHAR(b.custrecord_ht_bien_ano) AS anio,
        b.custrecord_ht_bien_motor AS motor,
        b.custrecord_ht_bien_chasis AS chasis,
        pro.displayname AS producto,

        NVL(TO_CHAR(ase.name), '9980000000005 SIN ASEGURADORA') AS compania_seguros,
        NVL(TO_CHAR(conc.name), '9980000000006 SIN CONCESIONARIO') AS concesionario,
        NVL(TO_CHAR(fina.name), '9980000000004 SIN FINANCIERA') AS financiera,
        NVL(TO_CHAR(bro.name), '9980000000003 SIN BROKER') AS broker,

        c.altname AS cliente,
        b.custrecord_ht_bien_codsysh AS codigo_bien
    FROM transaction os
    LEFT JOIN customrecord_ht_record_ordentrabajo ot
        ON ot.custrecord_ht_ot_orden_servicio = os.id
    LEFT JOIN customrecord_ht_record_bienes b
        ON os.custbody_ht_so_bien = b.id
    LEFT JOIN customrecord_ht_bn_modelo mod
        ON mod.id = b.custrecord_ht_bien_modelo
    LEFT JOIN customrecord_ht_bien_marca mar
        ON mar.id = b.custrecord_ht_bien_marca
    LEFT JOIN customrecord_ht_bn_colorcarseg col
        ON col.id = b.custrecord_ht_bien_colorcarseg
    LEFT JOIN item pro
        ON pro.id = ot.custrecord_ht_ot_item
    LEFT JOIN customrecord_ht_co_cobertura cob
        ON cob.custrecord_ht_co_bien = b.id
    LEFT JOIN customrecord_ht_record_canaldistribucion conc
        ON conc.id = b.custrecord_ht_bien_consesionarios
    LEFT JOIN customrecord_ht_record_canaldistribucion fina
        ON fina.id = b.custrecord_ht_bien_financiadovehiculo
    LEFT JOIN customrecord_ht_record_canaldistribucion ase
        ON ase.id = b.custrecord_ht_bien_companiaseguros
    LEFT JOIN customrecord_ht_record_canaldistribucion bro
        ON bro.id = b.custrecord_pe_broker
    LEFT JOIN customer c
        ON c.id = os.entity
    WHERE
        os.type = 'SalesOrd'
        AND os.custbody_ts_ec_subsidiaria_pais = 174
        AND ot.custrecord_ht_ot_fechatrabajoasignacion BETWEEN ? AND ?
        AND (pro.displayname LIKE '%DISP%' OR pro.displayname LIKE '%REINST%')
        AND b.custrecord_ht_bn_estadobien = '11'
        AND os.status <> 'SalesOrd:C'
`;

            const paramList = [fechaInicio, fechaFin];

            /* 🔹 FILTRO POR TIPO DE CANAL */
            switch (tipoCanal) {
                case 'ASE':
                    sql += " AND ase.custrecord_ht_cd_ruccanaldistribucion = ? ";
                    break;
                case 'BRO':
                    sql += " AND bro.custrecord_ht_cd_ruccanaldistribucion = ? ";
                    break;
                case 'CON':
                    sql += " AND conc.custrecord_ht_cd_ruccanaldistribucion = ? ";
                    break;
                case 'OTR':
                    sql += " AND fina.custrecord_ht_cd_ruccanaldistribucion = ? ";
                    break;
                default:
                    return { success: false, message: 'tipoCanal inválido' };
            }

            paramList.push(ruc);

            sql += `
) x
LEFT JOIN
(
    SELECT
        b.custrecord_ht_bien_codsysh AS codigo_bien,
        ot.custrecord_ht_ot_fechatrabajoasignacion as Ultimo_chequeo,
        COUNT(*) AS cantidad_chequeos
    FROM transaction os
    LEFT JOIN customrecord_ht_record_ordentrabajo ot
        ON ot.custrecord_ht_ot_orden_servicio = os.id
    LEFT JOIN item pro
        ON pro.id = ot.custrecord_ht_ot_item
    LEFT JOIN customrecord_ht_record_bienes b
        ON os.custbody_ht_so_bien = b.id
    WHERE pro.displayname LIKE '%CHEQ%'
    GROUP BY b.custrecord_ht_bien_codsysh, ot.custrecord_ht_ot_fechatrabajoasignacion
) y
    ON x.codigo_bien = y.codigo_bien
WHERE
(
    (? = 'S' AND NVL(y.cantidad_chequeos, 0) > 0)
 OR (? = 'N' AND NVL(y.cantidad_chequeos, 0) = 0)
)
ORDER BY x.numero_os
`;

            paramList.push(chequeo);
            paramList.push(chequeo);

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
