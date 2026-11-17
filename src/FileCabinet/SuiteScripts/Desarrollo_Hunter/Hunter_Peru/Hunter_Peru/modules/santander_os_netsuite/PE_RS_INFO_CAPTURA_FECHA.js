/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */

define(['N/query', 'N/log'], function (query, log) {

    function post(context) {
        const startTime = new Date().getTime();

        try {

            if (!context.canal) {
                return error('CANAL_REQUERIDO', 'El campo "canal" es requerido');
            }

            if (!context.doc) {
                return error('DOC_REQUERIDO', 'El campo "doc" es requerido');
            }

            if (!context.filtro || typeof context.filtro !== 'object') {
                return error('FILTRO_REQUERIDO', 'El campo "filtro" es requerido');
            }

            const canal = context.canal.toLowerCase().trim();
            const doc = context.doc;
            const filtro = context.filtro;

            if (canal !== 'fin' && canal !== 'cli') {
                return error('CANAL_INVALIDO', 'Canal debe ser fin o cli');
            }

            if (!filtro.fecha_desde || !filtro.fecha_hasta) {
                return error('RANGO_FECHAS_REQUERIDO', 'Debe enviar fechas DD/MM/YYYY');
            }

            return consultar(context, canal, doc, filtro, startTime);

        } catch (e) {
            log.error('ERROR_POST', e);
            return error('ERROR_SERVIDOR', e.message, startTime);
        }
    }


  
                    

  
    function consultar(context, canal, doc, filtro, startTime) {

        try {

            let sql = `
                SELECT
                    b.id,
                    NVL(b.id, '') AS codigo_vh_ns,
                    NVL(b.custrecord_ht_bien_codsysh, '') AS codigo_vh_sys_hunter,
                    NVL(c.custentity_pe_document_number, '') AS codigo_cliente,
                    NVL(c.altname, '') AS nombres_cliente,
                    NVL(b.custrecord_ht_bien_placa, '') AS placa,
                    NVL(b.custrecord_ht_bien_motor, '') AS motor,
                    NVL(b.custrecord_ht_bien_chasis, '') AS chasis,
                    NVL(bma.name, '') AS marca,
                    NVL(bmo.name, '') AS modelo,
                    NVL(tv.name, '') AS tipo_vehiculo,
                    NVL(fina.custrecord_ht_cd_ruccanaldistribucion, '') AS financiera,
                    NVL(cons.custrecord_ht_cd_ruccanaldistribucion, '') AS concesionario,
                    NVL(ase.custrecord_ht_cd_ruccanaldistribucion, '') AS aseguradora,
                    NVL(bro.custrecord_ht_cd_ruccanaldistribucion, '') AS broker,

                    NVL((
    SELECT LISTAGG(NVL(t.memo, ''), ' | ')
    WITHIN GROUP (ORDER BY t.id DESC)
    FROM transaction t
    INNER JOIN transactionline tl ON tl.transaction = t.id
    INNER JOIN item i ON i.id = tl.item
    WHERE t.custbody_ht_so_bien = b.id
      AND t.type = 'SalesOrd'
      AND t.tranid NOT LIKE 'OS-PE-M00%'
      AND t.custbody_ht_os_bancofinanciera = 19749
      AND (
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM transaction t2
                    INNER JOIN transactionline tl2 ON tl2.transaction = t2.id
                    INNER JOIN item i2 ON i2.id = tl2.item
                    WHERE t2.custbody_ht_so_bien = b.id
                      AND t2.type = 'SalesOrd'
                      AND t2.tranid NOT LIKE 'OS-PE-M00%'
                      AND t2.custbody_ht_os_bancofinanciera = 19749
                      AND i2.displayname LIKE '%REINST%'
                )
                THEN CASE
                        WHEN i.displayname LIKE '%REINST%' THEN 1
                        ELSE 0
                     END
                ELSE CASE
                        WHEN i.displayname LIKE '%DISPOS%' THEN 1
                        ELSE 0
                     END
            END = 1
      )
), '') AS memo,
                    
                    NVL((
                       SELECT LISTAGG(NVL(t.tranid, ''), ' | ')
       WITHIN GROUP (ORDER BY t.id DESC)
FROM transaction t
INNER JOIN transactionline tl ON tl.transaction = t.id
INNER JOIN item i ON i.id = tl.item
WHERE t.custbody_ht_so_bien = b.id
  AND t.type = 'SalesOrd'
  AND t.tranid NOT LIKE 'OS-PE-M00%'
  AND t.custbody_ht_os_bancofinanciera = 19749
  AND (
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM transaction t2
                INNER JOIN transactionline tl2 ON tl2.transaction = t2.id
                INNER JOIN item i2 ON i2.id = tl2.item
                WHERE t2.custbody_ht_so_bien = b.id
                  AND t2.type = 'SalesOrd'
                  AND t2.tranid NOT LIKE 'OS-PE-M00%'
                  AND t2.custbody_ht_os_bancofinanciera = 19749
                  AND i2.displayname LIKE '%REINST%'
            )
            THEN CASE
                    WHEN i.displayname LIKE '%REINST%' THEN 1
                    ELSE 0
                 END
            ELSE CASE
                    WHEN i.displayname LIKE '%DISPOS%' THEN 1
                    ELSE 0
                 END
        END = 1
      )
                    ), '') AS TRAN_ID
                    
                FROM customrecord_ht_record_bienes b
                LEFT JOIN customer c ON c.id = b.custrecord_ht_bien_propietario
                LEFT JOIN customrecord_ht_bien_marca bma ON bma.id = b.custrecord_ht_bien_marca
                LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
                LEFT JOIN customrecord_ht_record_tipovehiculo tv ON tv.id = b.custrecord_ht_bien_tipo
                LEFT JOIN customrecord_ht_record_canaldistribucion fina ON fina.id = b.custrecord_ht_bien_financiadovehiculo
                LEFT JOIN customrecord_ht_record_canaldistribucion cons ON cons.id = b.custrecord_ht_bien_consesionarios
                LEFT JOIN customrecord_ht_record_canaldistribucion ase ON ase.id = b.custrecord_ht_bien_companiaseguros
                LEFT JOIN customrecord_ht_record_canaldistribucion bro ON bro.id = b.custrecord_pe_broker
                WHERE 1=1
            `;
//and ABS(t.total)>0
          //and t.custbody_ht_os_bancofinanciera=19749
          
            const params = [];

            // FILTRO CANAL
            if (canal === 'fin') {

                const r = query.runSuiteQL({
                    query: `
                        SELECT id
                        FROM customrecord_ht_record_canaldistribucion
                        WHERE custrecord_ht_cd_ruccanaldistribucion = ?
                        AND custrecord_ht_cd_tipocanal = '3'
                    `,
                    params: [doc]
                });

                if (!r.results.length) {
                    return error('FINANCIERA_NO_ENCONTRADA', 'No existe financiera');
                }

                sql += ' AND b.custrecord_ht_bien_financiadovehiculo = ?';
                params.push(r.results[0].values[0]);

            } else {

                const r = query.runSuiteQL({
                    query: `
                        SELECT id
                        FROM customer
                        WHERE custentity_pe_document_number = ?
                    `,
                    params: [doc]
                });

                if (!r.results.length) {
                    return error('CLIENTE_NO_ENCONTRADO', 'No existe cliente');
                }

                sql += ' AND b.custrecord_ht_bien_propietario = ?';
                params.push(r.results[0].values[0]);
            }

            // FILTRO FECHAS
            sql += `
                AND b.id IN (
                   SELECT t.custbody_ht_so_bien
                     FROM transaction t 
                       INNER JOIN transactionline tl ON tl.transaction = t.id 
                       INNER JOIN item i ON i.id = tl.item 
                       WHERE TO_CHAR(t.trandate, 'YYYYMMDD') >= ?
                    AND TO_CHAR(t.trandate, 'YYYYMMDD') <= ? AND t.type = 'SalesOrd' AND t.tranid NOT LIKE 'OS-PE-M00%' AND t.custbody_ht_os_bancofinanciera = 19749 AND (i.displayname LIKE '%DISPOS%' OR i.displayname LIKE '%REINST%')

                     
                )
            `;

            params.push(convertFecha(filtro.fecha_desde));
            params.push(convertFecha(filtro.fecha_hasta));

            const result = query.runSuiteQL({
                query: sql,
                params: params
            });

            const registros = [];

            if (result.results.length) {
                result.results.forEach(r => {
                    registros.push({
                        codigo_vh_ns: r.values[1],
                        codigo_vh_sys_hunter: r.values[2],
                        n_documento: r.values[3],
                        nombres_cliente: r.values[4],
                        placa: r.values[5],
                        motor: r.values[6],
                        serie: r.values[7],
                        marca: r.values[8],
                        modelo: r.values[9],
                        tipo_vehiculo: r.values[10],
                        financiera: r.values[11],
                        concesionario: r.values[12],
                        aseguradora: r.values[13],
                        broker: r.values[14],
                        memo: r.values[15],
                      nro_os_ns: r.values[16]
                    });
                });
            }

            return {
                success: true,
                code: 'OK',
                data: {
                    total: registros.length,
                    registros: registros
                },
                duracion: (new Date().getTime() - startTime) + 'ms'
            };

        } catch (e) {
            log.error('ERROR_CONSULTA', e);
            return error('ERROR_CONSULTA', e.message, startTime);
        }
    }

    function convertFecha(fecha) {
        const p = fecha.split('/');
        return p[2] + p[1] + p[0];
    }

    function error(code, msg, startTime) {
        return {
            success: false,
            code: code,
            message: msg,
            duracion: startTime ? (new Date().getTime() - startTime) + 'ms' : '0ms'
        };
    }

    return { post: post };
});