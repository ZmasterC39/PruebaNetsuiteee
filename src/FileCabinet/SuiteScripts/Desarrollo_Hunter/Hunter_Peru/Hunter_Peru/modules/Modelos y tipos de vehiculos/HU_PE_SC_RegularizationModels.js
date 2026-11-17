/**
 *  @NApiVersion 2.1
 *  @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], (record, search, log, runtime) => {

    const DRY_RUN         = true;
    const SUBSIDIARIA_ID  = 3;
    //const DRY_RUN         = true;
    //const SUBSIDIARIA_ID  = 2;
    const BATCH_LIMIT     = 1_000;
    const PAGE_SIZE       = 1_000;
    const MIN_USAGE_LEFT  = 300;

    const shouldYield = () => runtime.getCurrentScript().getRemainingUsage() < MIN_USAGE_LEFT;

    function execute () {

        /* Cache de marcas */
        const brandMap = {};
        search.create({
            type: 'customrecord_ht_bien_marca',
            filters: [['custrecord_ht_marca_sub', 'is', SUBSIDIARIA_ID]],
            columns:['internalid','custrecord_ht_marca_codigo']
            //-columns:['internalid','custrecord_ht_marca_codigo','name']
        })
        .run()
        .each(r=>{
           brandMap[r.getValue('custrecord_ht_marca_codigo')] = r.getValue('internalid');
           //-brandMap[r.getValue('internalid')] = r.getValue('internalid');
            return true;
        });

        /* Búsqueda paginada de modelos */
        const paged = search.create({
            type:'customrecord_ht_bn_modelo',
            //-filters:[['custrecord_ht_mod_subsidiaria','noneof',3]],
            filters: [['custrecord_ht_mod_subsidiaria', 'is', SUBSIDIARIA_ID]],
            columns:['internalid','custrecord_ht_cod_marca','custrecord_ht_mb_marca']
        }).runPaged({pageSize:PAGE_SIZE});

        let revisados = 0;
        let corregidos = 0;

        pageLoop:
        for (let p = 0; p < paged.pageRanges.length; p++){
            const page = paged.fetch({index:p});
            for (const r of page.data){

                if (corregidos >= BATCH_LIMIT) break pageLoop;
                revisados++;
              
                const modelId     = r.getValue('internalid');
                const codigoMarca = r.getValue('custrecord_ht_cod_marca');
                const marcaActual = r.getValue('custrecord_ht_mb_marca');
                //-const marcaActual = r.getText('custrecord_ht_mb_marca');
                const marcaNueva  = brandMap[codigoMarca];
                //-const marcaNueva  = brandMap[marcaActual];

               //-if (marcaActual != marcaNueva) {
               //-     log.audit(
               //-         'DRY_RUN............... – Corrección',
               //-         `Subsidiaria ${SUBSIDIARIA_ID} | Modelo ${modelId} | Marca ${marcaActual || 'null'} → ${marcaNueva}`
               //-     );
              //-  }


              
                if (!marcaNueva || marcaActual === marcaNueva) continue;

                if (DRY_RUN){
                    log.audit(
                        'DRY_RUN – Corrección',
                        `Subsidiaria ${SUBSIDIARIA_ID} | Modelo ${modelId} | Marca ${marcaActual || 'null'} → ${marcaNueva}`
                    );
                }else{
                    try{
                        record.submitFields({
                            type:'customrecord_ht_bn_modelo',
                            id:modelId,
                            values:{custrecord_ht_mb_marca:marcaNueva},
                            options:{ignoreMandatoryFields:true,enablesourcing:false}
                        });
                        log.audit(
                            'Corrección',
                            `Subsidiaria ${SUBSIDIARIA_ID} | Modelo ${modelId} | Marca ${marcaActual || 'null'} → ${marcaNueva}`
                        );
                    }catch(e){
                        log.error(`Error al guardar modelo ${modelId}`, e.message);
                    }
                }

                corregidos++;

                if (shouldYield()){
                    const y = runtime.getCurrentScript().yield();
                    if (y.status === runtime.YieldStatus.FAILURE){
                        throw Error(`Yield falló: ${y.reason}`);
                    }
                }
            }
        }

        /* Resumen final (sólo cantidades) */
        log.audit('Resumen', `Revisados: ${revisados} | Modificados: ${corregidos}`);
    }

    return {execute};
});
