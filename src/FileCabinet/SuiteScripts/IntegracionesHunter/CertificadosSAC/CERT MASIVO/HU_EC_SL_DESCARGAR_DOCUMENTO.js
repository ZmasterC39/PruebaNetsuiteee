/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 16/04/2026 - Last modified:
 * @description Se llama desde el Suitelet, este carga el archivo en memoria y lo envia al navegador para su descarga.
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/


define ( ['N/log', 'N/render', 'SuiteScripts/IntegracionesHunter/CertificadosSAC/CERT MASIVO/HU_EC_DOCUMENTOS_PLANTILLA.js'], function (log, render, _plantilla) {
    function onRequest ( context ) {
        try {
            let params = {};
            if (context.request.method === 'POST') {
                params = JSON.parse(context.request.body || '{}');
            }
            let tipo_certificado = params.tipo_certificado;
            log.debug("params", params)

            if ( tipo_certificado == '1') {
                htmlContent = _plantilla.getCertificadoVenta( params );
            }else if ( tipo_certificado == '2') {
                htmlContent = _plantilla.getCertificadoInstalacion( params );
            }
            let tipo_certificado_label = tipo_certificado == '1' ? 'VTA' : 'INST';
            let pdfRenderer = render.create();
            pdfRenderer.templateContent = htmlContent;
            let pdfFile = pdfRenderer.renderAsPdf();
            pdfFile.name = `CERT${tipo_certificado_label}_${params.placa}.pdf`;

            context.response.writeFile({ file: pdfFile, isInline: false });

        } catch (error) {
            log.error("ERROR onRequest", error);
        }
    }

    return {onRequest}
});