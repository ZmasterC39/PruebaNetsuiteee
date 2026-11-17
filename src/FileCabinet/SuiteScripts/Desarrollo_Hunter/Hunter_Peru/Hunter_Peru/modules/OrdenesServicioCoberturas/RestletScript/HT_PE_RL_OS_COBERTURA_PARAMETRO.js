/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log'], function(query, log) {

    function doGet(requestParams) {
        try {
   
            log.debug('Parametros de entrada', JSON.stringify(requestParams));

          
            var sqlQuery = `
                SELECT
                    bienes.id AS "ID_Bien",
                    bienes.altname AS "Nombre_Bien",

                    trans.id AS "ID_Orden_Servicio",
                    trans.tranId AS "Numero_Orden_Servicio",
                    trans.tranDate AS "Fecha_Orden_Servicio",
                    trans.memo AS "Nota Orden de Servicio",
                    trans.custbody_fac_maf AS "Facturacion MAF",
                    trans.billingAccount AS "Importe Total",
                    trans.exchangerate AS "Tipo de cambio",

                    item.itemId AS "ID_Articulo",
                    item.description AS "Descripcion_Articulo",

                    cob.id AS "cobertura_id",
                    cob.custrecord_ht_co_coberturafinal   AS "Cobertura_Final",
                    cob.custrecord_ht_co_coberturainicial AS "Cobertura_Inicial",

                    param.name AS "Parametro_Familia_Prod",
                    sub.id AS "Subsidiary_ID"

                FROM customrecord_ht_record_bienes AS bienes
                JOIN customrecord_ht_osr_ordenes_serv_rela AS rel
                    ON bienes.id = rel.custrecord_ht_osr_campo_relacion
                JOIN transaction AS trans
                    ON rel.custrecord_ht_osr_orden_servicio = trans.id
                JOIN item AS item
                    ON rel.custrecord_ht_osr_articulo_ori = item.id
                JOIN customrecord_ht_co_cobertura AS cob
                    ON bienes.id = cob.custrecord_ht_co_bien
                JOIN customrecord_ht_cr_pp_valores AS param
                    ON cob.custrecord_ht_co_familia_prod = param.id
                JOIN subsidiary AS sub
                    ON bienes.custrecord_bn_subsidiaria = sub.id

                WHERE bienes.id = '991009'
                AND sub.id     =  3;
            `;

      
            var pagedData = query.runSuiteQLPaged({
                query: sqlQuery,
                pageSize: 1000 
            });

            var allResults = [];
            
            for (var i = 0; i < pagedData.pageRanges.length; i++) {
                var page = pagedData.fetch({ index: i });
                var pageData = page.data.asMappedResults();
                // Concatenamos cada bloque de 1000 (o menos) al array final
                allResults = allResults.concat(pageData);
            }

            
            log.debug('Cantidad total de registros', allResults.length);

            
            return JSON.stringify({
                success: true,
                totalRecords: allResults.length,
                data: allResults
            });

        } catch (e) {
            log.error('Error en el Restlet', e);
            return JSON.stringify({
                success: false,
                error: e.message
            });
        }
    }

    
    return {
        get: doGet
    };
});
