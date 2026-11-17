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

            if (!fechaInicio || !fechaFin) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fechaInicio, fechaFin'
                };
            }

            const sql = `
SELECT 
    NVL(ven.name, 'SIN VENDEDOR') AS vendedor,
    c.altname AS cliente,
    c.custentity_pe_document_number AS dni,
    c.phone AS telefono,
    NVL(mod.name, '') AS modelo,
    NVL(mar.name, '') AS marca,
    b.custrecord_ht_bien_placa AS placa,
    b.custrecord_ht_bien_motor AS motor,
    b.custrecord_ht_bien_chasis AS chasis,
    TO_CHAR(b.custrecord_ht_bien_ano) AS anio,
    NVL(col.name, '') AS color,
    CASE 
        WHEN ot.custrecord_ht_ot_estado = '2' THEN 'INSTALADO'
        ELSE 'DESINSTALADO'
    END AS estado_dispositivo,
    os.memo AS numero_os,
    CASE 
        WHEN ot.custrecord_ht_ot_estado = '2'
        THEN TO_CHAR(ot.custrecord_ht_ot_fechatrabajoasignacion, 'DD/MM/YYYY')
        ELSE ''
    END AS fecha_instalacion,
    NVL(eje.firstname || ' ' || eje.lastname, '') AS ejecutiva,
    pro.itemid as item,
    pro.displayname as producto,
    d_os.creditforeignamount AS precio_sin_igv,
    d_os.custcol_ht_os_tiempo_cobertura AS plazo,

    /* COMISIÓN */
    CASE 
        WHEN pro.itemid = 'PE-6873' AND cob.custrecord_ht_co_plazo = '12' 
             AND d_os.creditforeignamount BETWEEN 186.44 AND 200.00
        THEN 41.44 + (d_os.creditforeignamount - 186.44)

        WHEN pro.itemid = 'PE-7072' AND cob.custrecord_ht_co_plazo = '24' 
             AND d_os.creditforeignamount BETWEEN 309.32 AND 320.00
        THEN 49.32 + (d_os.creditforeignamount - 309.32)

        WHEN pro.itemid = 'PE-7073' AND cob.custrecord_ht_co_plazo = '36' 
             AND d_os.creditforeignamount BETWEEN 440.68 AND 450.00
        THEN 60.68 + (d_os.creditforeignamount - 440.68)

        WHEN pro.itemid = 'PE-7074' AND cob.custrecord_ht_co_plazo = '48' 
             AND d_os.creditforeignamount BETWEEN 576.27 AND 600.00
        THEN 76.27 + (d_os.creditforeignamount - 576.27)

        WHEN pro.itemid = 'PE-7075' AND cob.custrecord_ht_co_plazo = '60' 
             AND d_os.creditforeignamount BETWEEN 711.86 AND 750.00
        THEN 91.86 + (d_os.creditforeignamount - 711.86)

        ELSE 0
    END AS comision_sin_igv

FROM transaction os
LEFT JOIN transactionline d_os 
    ON d_os.transaction = os.id 
    AND d_os.quantitybackordered='1'
LEFT JOIN customrecord_ht_record_ordentrabajo ot 
    ON ot.custrecord_ht_ot_orden_servicio = os.id
LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b 
    ON os.custbody_ht_so_bien = b.id
LEFT JOIN customrecord_ht_record_tipovehiculo tip 
    ON tip.id = b.custrecord_ht_bien_tipo
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
LEFT JOIN customer c  
    ON c.id = os.entity
LEFT JOIN customrecord_pe_ht_os_vendedor ven 
    ON ven.custrecord_ht_pe_id_vendedor = os.custbody_ht_pe_os_vendedor
LEFT JOIN employee eje 
    ON eje.id = os.custbody_ht_os_ejecutiva_backoffice

WHERE 
    os.type = 'SalesOrd'
    AND os.custbody_ts_ec_subsidiaria_pais = 174
    AND os.prevdate BETWEEN 
    TO_DATE(?, 'DD/MM/YYYY') 
    AND TO_DATE(?, 'DD/MM/YYYY')
    AND os.status <> 'SalesOrd:C'
    AND b.custrecord_ht_bn_estadobien = '11'
    AND conc.custrecord_ht_cd_ruccanaldistribucion='20347764664'
    AND pro.itemid IN (
        'PE-6873','PE-7072','PE-7073','PE-7074','PE-7075',
        'PE-7270','PE-7323','PE-7325','PE-7326','PE-7352'
    )
ORDER BY vendedor
`;

            const resultSet = query.runSuiteQL({
                query: sql,
                params: [fechaInicio, fechaFin]
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

