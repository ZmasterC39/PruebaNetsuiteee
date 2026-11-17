/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * HT PE - Carga de series en Órdenes de Compra (botón en la OC)
 *
 * En la vista de la Orden de Compra agrega el botón "Cargar series", que lleva al
 * Suitelet HT_PE_SL_CARGA_SERIES_OC. Solo se muestra si:
 *   - el usuario pertenece a la subsidiaria SUBSIDIARY_ID, y
 *   - la OC está en "Approved by Supervisor/Pending Receipt" (orderstatus B / statusRef pendingReceipt).
 */
define(['N/runtime', 'N/url', 'N/log'], (runtime, url, log) => {

    const SUBSIDIARY_ID = 3;
    const SL_SCRIPT_ID = 'customscript_ht_pe_sl_carga_series_oc';
    const SL_DEPLOY_ID = 'customdeploy_ht_pe_sl_carga_series_oc';

    const beforeLoad = (ctx) => {
        try {
            if (ctx.type !== ctx.UserEventType.VIEW) return;
            if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) return;
            if (String(runtime.getCurrentUser().subsidiary) !== String(SUBSIDIARY_ID)) return;

            const rec = ctx.newRecord;
            const pendingReceipt = rec.getValue({ fieldId: 'orderstatus' }) === 'B' ||
                rec.getValue({ fieldId: 'statusRef' }) === 'pendingReceipt';
            if (!pendingReceipt) return;

            const slUrl = url.resolveScript({ scriptId: SL_SCRIPT_ID, deploymentId: SL_DEPLOY_ID });
            ctx.form.addButton({
                id: 'custpage_ht_pe_btn_carga_series',
                label: 'Cargar series',
                functionName: "window.open('" + slUrl + "','_blank')"
            });
        } catch (e) {
            log.error('HT_PE_UE_CARGA_SERIES_OC beforeLoad', (e.name ? e.name + ': ' : '') + e.message);
        }
    };

    return { beforeLoad };
});
