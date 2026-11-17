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
            let { id, role, subsidiary } = runtime.getCurrentUser();
            if (subsidiary !== 2) {
                form = serverWidget.createForm({ title: 'No tienes permisos para ver esta página' });
                context.response.writePage(form);
                return;
            }

            form = serverWidget.createForm({ title: 'EMISIÓN DE ANEXO DE FACTURAS' });
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_ANEXO_FACTURAS.js";

            _uiMain(context, form);

            context.response.writePage(form);
        } catch (error) {
            log.error("ERROR onRequest", error);
        }
    }

    function _uiMain(context, form) {
        try {

            let idUser = runtime.getCurrentUser().id
            log.debug("idUser", idUser)
            log.debug("idUser-", typeof idUser)
            // if (idUser = 27736) {

            // if ((idUser == 20) || (idUser == 27736)) { 
            if (true) {

                // BLOQUE 1: Factura y Cliente
                let bloque1 = form.addFieldGroup({
                    id: 'custpage_bloque1',
                    label: 'EMISIÓN DE ANEXO DE FACTURAS'
                });

                let factura_venta = form.addField({
                    id: 'custpage_factura_venta',
                    type: serverWidget.FieldType.SELECT,
                    label: 'NUM. FACTURA VENTA',
                    source: "invoice",
                    container: 'custpage_bloque1'
                });

                factura_venta.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });

                let cliente = form.addField({
                    id: 'custpage_cliente',
                    type: serverWidget.FieldType.SELECT,
                    label: 'CLIENTE',
                    source: "customer",
                    container: 'custpage_bloque1'
                });

                cliente.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });
                cliente.defaultValue = context.request.parameters.cliente || null;

                // BLOQUE 2: Fechas
                let bloque2 = form.addFieldGroup({
                    id: 'custpage_bloque2',
                    label: 'FECHAS FACTURACIÓN'
                });

                let fecha_desde = form.addField({
                    id: 'custpage_fecha_desde',
                    type: serverWidget.FieldType.DATE,
                    label: 'FECHA DESDE',
                    container: 'custpage_bloque2'
                });

                fecha_desde.defaultValue = context.request.parameters.fecha_desde || null;

                fecha_desde.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });

                let fecha_hasta = form.addField({
                    id: 'custpage_fecha_hasta',
                    type: serverWidget.FieldType.DATE,
                    label: 'FECHA HASTA',
                    container: 'custpage_bloque2'
                });

                fecha_hasta.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });
                fecha_hasta.defaultValue = context.request.parameters.fecha_hasta || null;

                factura_venta.defaultValue = context.request.parameters.factura_venta || null;

                // BLOQUE 3: Resultados
                let bloque3 = form.addFieldGroup({
                    id: 'custpage_bloque3',
                    label: 'RESULTADOS'
                });

                let report = form.addField({
                    id: 'custpage_report',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'report',
                    container: 'custpage_bloque3'
                });

                report.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.STARTROW
                });

                if (!factura_venta.defaultValue && !cliente.defaultValue) {

                } else {
                    form.addButton({
                        id: 'custpage_btn_descargar',
                        label: 'Descargar Reporte',
                    }).isDisabled = true;
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
                </div>`;
                }

            } else {
                let factura_venta = form.addField({
                    id: 'custpage_factura_venta',
                    type: serverWidget.FieldType.SELECT,
                    label: 'NUM. FACTURA VENTA',
                    source: "invoice",
                });

                factura_venta.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });

                let cliente = form.addField({
                    id: 'custpage_cliente',
                    type: serverWidget.FieldType.SELECT,
                    label: 'CLIENTE',
                    source: "customer",
                });

                cliente.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });
                cliente.defaultValue = context.request.parameters.cliente || null;

                let fecha_desde = form.addField({
                    id: 'custpage_fecha_desde',
                    type: serverWidget.FieldType.DATE,
                    label: 'FECHA DESDE',
                });

                fecha_desde.defaultValue = context.request.parameters.fecha_desde || null;

                fecha_desde.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });

                let fecha_hasta = form.addField({
                    id: 'custpage_fecha_hasta',
                    type: serverWidget.FieldType.DATE,
                    label: 'FECHA HASTA',
                });

                fecha_hasta.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });
                fecha_hasta.defaultValue = context.request.parameters.fecha_hasta || null;

                factura_venta.defaultValue = context.request.parameters.factura_venta || null;

                let report = form.addField({
                    id: 'custpage_report',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'report',
                });
                report.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });

                if (!factura_venta.defaultValue) {

                } else {
                    form.addButton({
                        id: 'custpage_btn_descargar',
                        label: 'Descargar Reporte',
                    }).isDisabled = true;
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
                </div>`;
                }
            }

        } catch (error) {
            log.error("ERROR _uiMain", error);
        }
    }

    return { onRequest }

});