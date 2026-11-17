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
            const tipoCanal = params.tipoCanal;   // 'ASE', 'BRO', 'CON', 'OTR'
            const ruc = params.ruc;

            if (!fechaInicio || !fechaFin || !tipoCanal || !ruc) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fechaInicio, fechaFin, tipoCanal, ruc'
                };
            }

            // SQL BASE
            let sql = `
SELECT 
    pro.displayname AS producto,
    COUNT(os.typebaseddocumentnumber) AS cant,
    SUM(NVL(os.totalcostestimate, 0) + NVL(os.estgrossprofit, 0)) AS total_os
FROM 
    transaction os
LEFT JOIN customrecord_ht_record_ordentrabajo ot 
    ON ot.custrecord_ht_ot_orden_servicio = os.id
LEFT JOIN customrecord_ht_record_bienes b 
    ON os.custbody_ht_so_bien = b.id
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
WHERE 
    os.type = 'SalesOrd'
    AND os.custbody_ts_ec_subsidiaria_pais = 174
    AND ot.custrecord_ht_ot_fechatrabajoasignacion BETWEEN ? AND ?
    AND pro.displayname LIKE '%DISP%'
    AND os.status <> 'SalesOrd:C'
    AND b.custrecord_ht_bn_estadobien = '11'
`;

            // FILTRO DINÁMICO POR CANAL
            let paramList = [fechaInicio, fechaFin];

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
                    return { success: false, message: "tipoCanal inválido" };
            }

            paramList.push(ruc);

            // GROUP BY
            sql += ` GROUP BY pro.displayname `;

            log.debug("SQL Ejecutado", sql);
            log.debug("Params", paramList);

            const resultSet = query.runSuiteQL({
                query: sql,
                params: paramList
            });

            const data = resultSet.asMappedResults();

            return {
                success: true,
                cantidad_registros: data.length,
                data: data
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

