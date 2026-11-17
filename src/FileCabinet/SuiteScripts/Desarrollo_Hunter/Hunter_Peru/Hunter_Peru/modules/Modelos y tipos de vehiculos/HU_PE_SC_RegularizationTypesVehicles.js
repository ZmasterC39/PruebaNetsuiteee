/**
 * Regulariza Marca y Modelo en Tipo de Vehículo (Subsidiaria 3)
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], (record, search, log, runtime) => {

    /*──────── CONFIGURACIÓN ────────*/
    const DRY_RUN        = true;      // true: solo log – false: graba
    const SUBSIDIARIA_ID = 3;         // subsidiaria a tratar
    const BATCH_LIMIT    = 1_000;         // correcciones por corrida
    const PAGE_SIZE      = 1_000;     // filas por página de búsqueda
    const MIN_USAGE_LEFT = 300;       // umbral para yield()

    /*──────── UTIL ────────*/
    const shouldYield = () =>
        runtime.getCurrentScript().getRemainingUsage() < MIN_USAGE_LEFT;

    /*──────── EXECUTE ────────*/
    function execute () {

        log.audit('Inicio',
            `DRY_RUN=${DRY_RUN} | BATCH_LIMIT=${BATCH_LIMIT} | Subsidiaria=${SUBSIDIARIA_ID}`);

        /* 1) Cache de MARCAS (paginado) */
        const brandMap   = {};
        const brandPaged = search.create({
            type: 'customrecord_ht_bien_marca',
            filters: [['custrecord_ht_marca_sub', 'is', SUBSIDIARIA_ID]],
            columns: ['internalid', 'custrecord_ht_marca_codigo']
        }).runPaged({ pageSize: PAGE_SIZE });

        brandPaged.pageRanges.forEach(pr => {
            const page = brandPaged.fetch({ index: pr.index });
            page.data.forEach(r => {
                brandMap[r.getValue('custrecord_ht_marca_codigo')] =
                    r.getValue('internalid');
            });
        });

        /* 2) Cache de MODELOS (paginado, clave codMarca|codModelo) */
        const modelMap   = {};
        const modelPaged = search.create({
            type: 'customrecord_ht_bn_modelo',
            filters: [['custrecord_ht_mod_subsidiaria', 'is', SUBSIDIARIA_ID]],
            columns: [
                'internalid',
                'custrecord_ht_mod_codigo',
                'custrecord_ht_cod_marca'
            ]
        }).runPaged({ pageSize: PAGE_SIZE });

        modelPaged.pageRanges.forEach(pr => {
            const page = modelPaged.fetch({ index: pr.index });
            page.data.forEach(r => {
                const key = `${r.getValue('custrecord_ht_cod_marca')}|` +
                            `${r.getValue('custrecord_ht_mod_codigo')}`;
                modelMap[key] = r.getValue('internalid');
            });
        });

        /* 3) Búsqueda paginada de Tipos de Vehículo */
        const tvPaged = search.create({
            type: 'customrecord_ht_record_tipovehiculo',
            filters: [['custrecord_ht_tv_subsidiaria', 'is', SUBSIDIARIA_ID]],
            columns: [
                'internalid',
                'custrecord_ht_tv_cod_marca',
                'custrecord_ht_tv_cod_modelo',
                'custrecord_ht_tv_marca',
                'custrecord_ht_tv_modelo'
            ]
        }).runPaged({ pageSize: PAGE_SIZE });

        let revisados  = 0;
        let corregidos = 0;

        outer:
        for (const pr of tvPaged.pageRanges) {

            const page = tvPaged.fetch({ index: pr.index });

            for (const r of page.data) {

                if (corregidos >= BATCH_LIMIT) break outer;

                revisados++;

                const tvId      = r.getValue('internalid');
                const codMarca  = r.getValue('custrecord_ht_tv_cod_marca');
                const codModelo = r.getValue('custrecord_ht_tv_cod_modelo');

                const marcaActualId  = r.getValue('custrecord_ht_tv_marca')  || 'null';
                const modeloActualId = r.getValue('custrecord_ht_tv_modelo') || 'null';

                const marcaNuevaId  = brandMap[codMarca] || null;
                const modeloNuevaId = modelMap[`${codMarca}|${codModelo}`] || null;

                /* Validaciones */
                if (!marcaNuevaId) {
                    log.error('Marca no encontrada',
                        `Sub ${SUBSIDIARIA_ID} | TV ${tvId} | CodMarca=${codMarca}`);
                    continue;
                }
                if (!modeloNuevaId) {
                    log.error('Modelo no encontrado',
                        `Sub ${SUBSIDIARIA_ID} | TV ${tvId} | CodMarca=${codMarca} | CodModelo=${codModelo}`);
                    continue;
                }

                /* ¿Hay cambios? */
                const cambios = [];
                if (marcaActualId !== marcaNuevaId) {
                    cambios.push(`Marca ${marcaActualId}→${marcaNuevaId}`);
                }
                if (modeloActualId !== modeloNuevaId) {
                    cambios.push(`Modelo ${modeloActualId}→${modeloNuevaId}`);
                }
                if (!cambios.length) continue;   // ya correcto

                log.audit(
                    DRY_RUN ? 'DRY_RUN – Cambio detectado' : 'Corrección',
                    `Sub ${SUBSIDIARIA_ID} | TV ${tvId} | ${cambios.join(' | ')}`
                );

                /* Guardar */
                if (!DRY_RUN) {
                    try {
                        record.submitFields({
                            type: 'customrecord_ht_record_tipovehiculo',
                            id:   tvId,
                            values: {
                                custrecord_ht_tv_marca  : marcaNuevaId,
                                custrecord_ht_tv_modelo : modeloNuevaId
                            },
                            options: {
                                ignoreMandatoryFields: true,
                                enablesourcing: false
                            }
                        });
                    } catch (e) {
                        log.error(`Error al guardar TV ${tvId}`, e.message);
                    }
                }

                corregidos++;

                /* Yield defensivo */
                if (shouldYield()) {
                    const y = runtime.getCurrentScript().yield();
                    if (y.status === runtime.YieldStatus.FAILURE) {
                        throw Error(`Yield falló: ${y.reason}`);
                    }
                }
            }
        }

        /* 4) Resumen final */
        log.audit('Resumen', `Revisados: ${revisados} | Modificados: ${corregidos}`);
    }

    return { execute };
});
