/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query'], (query) => {

    function post(params) {

        let whereExtra = '';
        let sqlParams = [];

        if (params.tipo === 'FECHA') {
            whereExtra = ' AND os.prevdate BETWEEN ? AND ? ';
            sqlParams.push(params.fechaInicio, params.fechaFin);
        }

        if (params.tipo === 'PLACA') {
            whereExtra = ' AND b.custrecord_ht_bien_placa = ? ';
            sqlParams.push(params.dato);
        }

        if (params.tipo === 'CHASIS') {
            whereExtra = ' AND b.custrecord_ht_bien_chasis = ? ';
            sqlParams.push(params.dato);
        }

        if (params.tipo === 'MOTOR') {
            whereExtra = ' AND b.custrecord_ht_bien_motor = ? ';
            sqlParams.push(params.dato);
        }

        const sql = `
            ${/* === QUERY BASE === */''}
            SELECT DISTINCT
                b.custrecord_ht_bien_codsysh AS codigo_vehiculo,
                b.custrecord_ht_bien_placa AS placa,
                c.altname AS cliente,
                b.custrecord_ht_bien_motor AS motor,
                b.custrecord_ht_bien_chasis AS chasis,
                pro.displayname AS producto,
                CASE
                    WHEN ot.custrecord_ht_ot_estado = '2' THEN 'TRABAJADO'
                    WHEN ot.custrecord_ht_ot_estado = '4' THEN 'PROCESO DE TRABAJO'
                    WHEN ot.custrecord_ht_ot_estado = '8' THEN 'ENTREGADO'
                    WHEN ot.custrecord_ht_ot_estado = '9' THEN 'CERRADO'
                    ELSE 'SIN PROGRAMAR'
                END AS estado_ot,
                cob.created AS fecha_instalacion,
                os.prevdate AS fecha_os,
                CASE
                    WHEN (pro.displayname LIKE '%REINST%' OR pro.displayname LIKE '%DISP%')
                     AND ot.custrecord_ht_ot_estado = '2'
                    THEN ot.custrecord_ht_ot_fechatrabajoasignacion
                    ELSE cob.custrecord_ht_co_coberturainicial
                END AS fecha_inicio,
                CASE
                    WHEN (pro.displayname LIKE '%REINST%' OR pro.displayname LIKE '%DISP%')
                     AND ot.custrecord_ht_ot_estado = '2'
                    THEN ADD_MONTHS(
                        ot.custrecord_ht_ot_fechatrabajoasignacion,
                        cob.custrecord_ht_co_plazo
                    )
                    ELSE cob.custrecord_ht_co_coberturafinal
                END AS fecha_fin
            FROM transaction os
            LEFT JOIN transactionline tl ON tl.transaction = os.id AND tl.mainline = 'F'
            LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = os.id
            LEFT JOIN customrecord_ht_record_bienes b ON os.custbody_ht_so_bien = b.id
            LEFT JOIN item pro ON pro.id = ot.custrecord_ht_ot_item
            LEFT JOIN (
                SELECT custrecord_ht_co_bien, MAX(created) AS max_created
                FROM customrecord_ht_co_cobertura
                GROUP BY custrecord_ht_co_bien
            ) last_cob ON last_cob.custrecord_ht_co_bien = b.id
            LEFT JOIN customrecord_ht_co_cobertura cob
                ON cob.custrecord_ht_co_bien = b.id
               AND cob.created = last_cob.max_created
            LEFT JOIN customer c ON c.id = os.entity
            WHERE os.type = 'SalesOrd'
              AND os.custbody_ts_ec_subsidiaria_pais = 174
              AND tl.creditforeignamount <> 0
              ${whereExtra}
        `;

        return query.runSuiteQL({
            query: sql,
            params: sqlParams
        }).asMappedResults();
    }

    return { post };
});
