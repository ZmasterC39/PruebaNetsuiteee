    /**
     * @NApiVersion 2.1
     * @NScriptType Suitelet
     *
     * @author Mauro F Ramos
     * @date 23/01/2025
     * @description
     *
     * @version 1.0
     * @notes - Ninguna -
     * @LastModifiedBy 24/01/2025
     */

    define(['N/ui/serverWidget', 'N/runtime', 'N/log'], function (serverWidget, runtime, log) {

        function onRequest(context) {
            let form;

            try {
                let {id, role, subsidiary} = runtime.getCurrentUser();
                if( subsidiary !== 2 ) {
                    form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                    context.response.writePage(form);
                    return;
                }

                form = serverWidget.createForm({title: 'Factura - Orden de Servicio - Ejecución de orden de artículo - Débito'});
                form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_REPORT.js";

                form.addButton({
                    id : 'custpage_btn_descargar',
                    label : 'Descargar Reporte',
                }).isDisabled = true;

                let report = form.addField({
                    id: 'custpage_report',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'report',
                    });

                    report.defaultValue = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 14px; padding: 5px;">
                        <div style="margin-bottom: 20px;">
                            <svg width="50" height="50" viewBox="0 0 50 50" style="animation: spin 1s linear infinite;">
                                <circle cx="25" cy="25" r="20" fill="none" stroke="#3b82f6" stroke-width="4" stroke-dasharray="31.4 31.4" stroke-linecap="round">
                                    <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 25 25"
                                        to="360 25 25"
                                        dur="1s"
                                        repeatCount="indefinite"/>
                                </circle>
                            </svg>
                        </div>
                        <strong style="color: #1f2937; margin-bottom: 8px;">Cargando resultados</strong>
                        <p style="color: #6b7280; margin: 0;">Por favor espere un momento...</p>
                        <style>
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        </style>
                    </div>
                `;

                context.response.writePage(form);


            } catch (error) {
            }
        }

        return { onRequest: onRequest };
    });