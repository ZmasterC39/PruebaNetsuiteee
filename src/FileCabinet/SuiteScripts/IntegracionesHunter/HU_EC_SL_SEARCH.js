/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
*/
define(['N/ui/serverWidget', 'N/runtime', 'N/log'], function(serverWidget, runtime, log) {
    function onRequest(context) {
        let form;
        try {
            let {id, role, subsidiary} = runtime.getCurrentUser();
            // if( subsidiary !== 2) {
            //   form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
            //   context.response.writePage(form);
            //   return;
            // }

            form = serverWidget.createForm({title: 'Buscar en archivos'});
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_SEARCH.js";

            _uiMain(context, form);
            context.response.writePage(form);

        } catch (error) {
            context.response.write(`<p>${error}</p>`);
        }
    }

    function _uiMain(context, form) {
        try {
            form.addField({ id: 'custpage_criterio', type: serverWidget.FieldType.TEXT, label: 'Criterio de Búsqueda' });

            const detalle = form.addField({ id: 'custpage_detalle', type: serverWidget.FieldType.INLINEHTML, label: 'Resultados'});

            detalle.defaultValue = `
                <div style="min-height: 500px; width:199%; font-size: 14px; padding: 10px;">
                <strong>Sin resultados</strong><br>
                </div>
            `;
            detalle.defaultValue =
                `
                <style>
                    .hu-search-container {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 16px;
                        min-height: 500px;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .search-hint {
                        background:#f0f6ff; border:1px solid #cfe0ff; border-radius:8px;
                        padding:14px 16px; color:#1c3d6b; font-size:14px; line-height:1.5;
                    }
                </style>
                <div class="hu-search-container">
                    <div class="search-hint">
                        <p>🔎 Escribe una palabra o fragmento de código que quieres encontrar en todos los archivos del sistema</p>
                    </div>
                </div>`;
            detalle.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW });
        } catch (error) {

        }

    }

    return { onRequest };
});