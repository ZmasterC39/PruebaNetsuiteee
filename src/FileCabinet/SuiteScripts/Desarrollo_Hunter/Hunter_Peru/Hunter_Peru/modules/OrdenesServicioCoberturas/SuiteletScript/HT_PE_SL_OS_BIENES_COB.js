/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/log'], (query, log) => {

    /**
     * Maneja las solicitudes al Suitelet
     * @param {Object} context
     */
    const onRequest = (context) => {
        if (context.request.method === 'GET') {
            try {
                log.debug({
                    title: 'Inicio de Suitelet - GET',
                    details: 'Parámetros URL: ' + JSON.stringify(context.request.parameters)
                });

                // Query SuiteQL (con alias y joins tal cual tu ejemplo).
                // Aquí uso backticks para mayor legibilidad.
                // Si NetSuite 2.1 no los admite en tu cuenta, pásalo a string concatenada.
                const suiteQL = `
SELECT 
    bienes.id                 AS "ID_Bien",
    bienes.altname           AS "Nombre_Bien",

    trans.id                 AS "ID_Orden_Servicio",
    trans.tranId             AS "Numero_Orden_Servicio",
    trans.tranDate           AS "Fecha_Orden_Servicio",
    trans.memo               AS "Nota Orden de Servicio",
    trans.custbody_fac_maf   AS "FACTURACON MAF",

    item.itemId              AS "ID_Articulo",
    item.description         AS "Descripcion_Articulo",

    cob.id                   AS "cobertura_id",
    cob.custrecord_ht_co_coberturafinal   AS "Cobertura_Final",
    cob.custrecord_ht_co_coberturainicial AS "Cobertura_Inicial"

FROM customrecord_ht_record_bienes AS bienes

JOIN customrecord_ht_osr_ordenes_serv_rela AS rel
    ON bienes.id = rel.custrecord_ht_osr_campo_relacion

JOIN transaction AS trans
    ON rel.custrecord_ht_osr_orden_servicio = trans.id

JOIN item AS item
    ON rel.custrecord_ht_osr_articulo_ori = item.id

JOIN customrecord_ht_co_cobertura AS cob
    ON bienes.id = cob.custrecord_ht_co_bien
                `;

                log.debug({ title: 'Consulta SuiteQL', details: suiteQL });

                // Ejecutar de forma paginada
                const pagedData = query.runSuiteQLPaged({
                    query: suiteQL,
                    pageSize: 1000 // Máx permitido
                });

                let results = [];

                // Recorremos cada página y acumulamos
                for (let i = 0; i < pagedData.pageRanges.length; i++) {
                    let page = pagedData.fetch({ index: i });
                    let pageResults = page.data;
                    let mappedResults = pageResults.asMappedResults();
                    results = results.concat(mappedResults);
                }

                log.debug({
                    title: 'Resultados obtenidos',
                    details: JSON.stringify(results)
                });

                // Responder en formato JSON
                context.response.write(JSON.stringify({
                    success: true,
                    data: results
                }));
            
            } catch (error) {
                log.error({
                    title: 'Error en Suitelet (GET)',
                    details: error.message
                });
                // Devolvemos error como JSON también
                context.response.write(JSON.stringify({
                    success: false,
                    message: 'Ocurrió un error: ' + error.message
                }));
            }
        } else {
            // Si llegan con POST (u otro método), retornamos un mensaje
            context.response.write(JSON.stringify({
                success: false,
                message: 'Este Suitelet solo acepta método GET.'
            }));
        }
    };

    return {
        onRequest
    };
});
