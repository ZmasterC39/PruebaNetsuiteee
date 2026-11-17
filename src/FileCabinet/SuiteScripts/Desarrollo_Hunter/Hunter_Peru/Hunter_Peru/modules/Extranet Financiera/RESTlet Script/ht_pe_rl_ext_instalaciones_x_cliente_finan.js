/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], (query, log) => {

    function post(body) {
        try {

            const params = (typeof body === 'string') ? JSON.parse(body) : body;

            const tipoBusqueda = params.tipoBusqueda;   // 0=RUC, 1=Cliente, 2=Placa, 3=Motor, 4=Chasis
            const criterio = params.criterio || '';
            const tipoCanal = params.tipoCanal;         // ASE, BRO, CON, OTR
            const ruc = params.ruc || '';

            if (!tipoBusqueda && tipoBusqueda !== 0) {
                return { success: false, message: "Debe enviar tipoBusqueda" };
            }

            // SQL BASE
            let sql = `
SELECT 
    distinct
    os.memo AS numero_os,
    NVL(ot.custrecord_ht_ot_fechatrabajoasignacion, '') AS fecha_ot,
    b.custrecord_ht_bien_placa AS placa,
    NVL(mar.name, '') AS marca,
    NVL(mod.name, '') AS modelo,
    NVL(tip.name, '') AS tipo_vehiculo,
    NVL(col.name, '') AS color,
    TO_CHAR(b.custrecord_ht_bien_ano) AS anio,
    b.custrecord_ht_bien_motor AS motor,
    b.custrecord_ht_bien_chasis AS chasis,
    pro.displayname AS producto,
    cob.custrecord_ht_co_coberturainicial AS fecha_inicio,
    cob.custrecord_ht_co_coberturafinal AS fecha_fin,
    NVL(ase.name, '9980000000005 SIN ASEGURADORA') AS compania_seguros,
    NVL(conc.name, '9980000000006 SIN CONCESIONARIO') AS concesionario,
    NVL(fina.name, '9980000000004 SIN FINANCIERA') AS financiera,
    NVL(bro.name, '9980000000003 SIN BROKER') AS broker,
    c.altname AS cliente,
    (CASE WHEN ot.custrecord_ht_ot_estado='2' THEN 'SI' ELSE 'NO' END) AS instalado
FROM 
    transaction os
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
  AND pro.displayname LIKE '%DISP%'
  AND os.status <> 'SalesOrd:C'
  AND b.custrecord_ht_bn_estadobien = '11'
`;

            let paramsList = [];

            if (criterio) {
                switch (String(tipoBusqueda)) {
                    case "0": // RUC
                        sql += " AND c.vatregnumber LIKE ? ";
                        paramsList.push(`%${criterio}%`);
                        break;

                    case "1": // Cliente
                        sql += " AND c.altname LIKE ? ";
                        paramsList.push(`%${criterio}%`);
                        break;

                    case "2": // Placa
                        sql += " AND b.custrecord_ht_bien_placa LIKE ? ";
                        paramsList.push(`%${criterio}%`);
                        break;

                    case "3": // Motor
                        sql += " AND b.custrecord_ht_bien_motor LIKE ? ";
                        paramsList.push(`%${criterio}%`);
                        break;

                    case "4": // Chasis
                        sql += " AND b.custrecord_ht_bien_chasis LIKE ? ";
                        paramsList.push(`%${criterio}%`);
                        break;
                }
            }

            if (tipoCanal && ruc) {
                switch (tipoCanal) {
                    case "ASE":
                        sql += " AND ase.custrecord_ht_cd_ruccanaldistribucion = ? ";
                        break;
                    case "BRO":
                        sql += " AND bro.custrecord_ht_cd_ruccanaldistribucion = ? ";
                        break;
                    case "CON":
                        sql += " AND conc.custrecord_ht_cd_ruccanaldistribucion = ? ";
                        break;
                    case "OTR":
                        sql += " AND fina.custrecord_ht_cd_ruccanaldistribucion = ? ";
                        break;
                }
                paramsList.push(ruc);
            }

            sql += " ORDER BY os.memo ";

            log.debug("SQL ejecutado", sql);
            log.debug("Parámetros", paramsList);

            const result = query.runSuiteQL({
                query: sql,
                params: paramsList
            }).asMappedResults();

            return {
                success: true,
                total: result.length,
                data: result
            };

        } catch (e) {
            log.error("Error RESTlet", e);
            return { success: false, message: e.message };
        }
    }

    return { post };
});