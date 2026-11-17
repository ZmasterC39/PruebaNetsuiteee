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

            // SQL base
            let sql = `
SELECT 
  os.status,
  os.memo AS numero_os,
  ot.custrecord_ht_ot_fechatrabajoasignacion AS fecha_ot,
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
  c.altname AS cliente
FROM transaction os
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
    AND pro.displayname LIKE '%DISP%'
    AND os.status <> 'SalesOrd:C'
    AND ot.custrecord_ht_ot_estado = '2'
`;

            // Filtro dinámico según canal
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

            log.debug("SQL Ejecutado", sql);
            log.debug("Params", paramList);

            const resultSet = query.runSuiteQL({
                query: sql,
                params: paramList
            });

            const data = resultSet.asMappedResults();

            return {
                //success: true,
                //cantidad: data.length,
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
