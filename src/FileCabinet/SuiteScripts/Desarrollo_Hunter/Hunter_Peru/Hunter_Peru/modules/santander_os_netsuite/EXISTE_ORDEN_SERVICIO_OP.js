/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query', 'N/log'], (query, log) => {

    const get = () => {

        try {

            //const codigoOperacion = String(
                //requestParams.codigo_operacion || ''
            //).trim();

            //if (!codigoOperacion) {
              //  return {
                //    status: 'error',
                  //  message: 'Debe enviar codigo_operacion'
                //};
           // }

            const sql = `
               SELECT
    o.codigo_operacion operacion,
    o.recuento_ordenes os_netsuite,
    m.recuento_memo os_syshunter,
    m.memos_concat memos
FROM (
    SELECT
        cab.custbody_pe_os_cod_operacion AS codigo_operacion,
        COUNT(DISTINCT cab.tranid) AS recuento_ordenes
    FROM transaction cab
    WHERE cab.type = 'SalesOrd'
        AND cab.trandate > TO_DATE('2025-12-31', 'YYYY-MM-DD')
        AND cab.custbody_ht_os_bancofinanciera = 19749
    GROUP BY cab.custbody_pe_os_cod_operacion
) o
INNER JOIN (
    SELECT
        codigo_operacion,
        SUM(
            CASE
                WHEN memo IS NOT NULL
                 AND LENGTH(TRIM(memo)) > 0
                THEN 1
                ELSE 0
            END
        ) AS recuento_memo,
        LISTAGG(memo, ',') WITHIN GROUP (ORDER BY memo) AS memos_concat
    FROM (
        SELECT DISTINCT
            cab.custbody_pe_os_cod_operacion AS codigo_operacion,
            TRIM(cab.memo) AS memo
        FROM transaction cab
        WHERE cab.type = 'SalesOrd'
            AND cab.trandate > TO_DATE('2025-12-31', 'YYYY-MM-DD')
            AND cab.custbody_ht_os_bancofinanciera = 19749
    ) x
    GROUP BY codigo_operacion
) m
ON o.codigo_operacion = m.codigo_operacion
ORDER BY o.codigo_operacion
            `;

            const results = query.runSuiteQL({
                query: sql
                //,params: [codigoOperacion, codigoOperacion]
            }).asMappedResults();

            return {
                status: 'success',
                total: results.length,
                data: results.map(r => ({
                    operacion: r.operacion || '',
                    os_netsuite: Number(r.os_netsuite || 0),
                    os_syshunter: Number(r.os_syshunter || 0),
                    memos: r.memos || ''
                }))
            };

        } catch (e) {

            log.error({
                title: 'ERROR CONSULTANDO OPERACIONES',
                details: e
            });

            return {
                status: 'error',
                message: e.message || e.toString()
            };
        }
    };

    return {
        get
    };

});