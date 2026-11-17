/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 21/11/2025 - Last modified:
 * @description Se llama desde el Suitelet, este carga el archivo en memoria y lo envia al navegador para su descarga.
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define ( ['N/log', 'N/render', 'SuiteScripts/IntegracionesHunter/HU_EC_CERTIFICADOS_PLANTILLA.js'], function (log, render, _plantilla) {
    function onRequest ( context ) {
        try {
            let data = {}
            let params = context.request.parameters;
            log.debug("Params recibidos en descarga", params);
            let tipo_certificado = params.tipo_certificado;
            let htmlContent;
            data.nombre = params.nombre;
            data.producto = params.producto;
            data.fecha_instalacion = params.fecha_instalacion;
            data.fecha_vigencia_servicio = params.fecha_vigencia_servicio;
            data.placa = params.placa;
            data.marca = params.marca;
            data.modelo = params.modelo;
            data.color = params.color;
            data.anio = params.anio;
            data.motor = params.motor;
            data.chasis = params.chasis;
            data.bien_id = params.bien_id;
            data.emisor = params.emisor;

            if ( tipo_certificado == '1') {
                htmlContent = _plantilla.getCertificadoVenta( data );
            }else if ( tipo_certificado == '2') {
                htmlContent = _plantilla.getCertificadoInstalacion( data );
            }
            let tipo_certificado_label = tipo_certificado == '1' ? 'VTA' : 'INST';
            let pdfRenderer = render.create();
            pdfRenderer.templateContent = htmlContent;
            let pdfFile = pdfRenderer.renderAsPdf();
            pdfFile.name = `CERT${tipo_certificado_label}_${data.placa}.pdf`;

            context.response.writeFile({
                file: pdfFile,
                isInline: false // Forzar descarga
            });


        } catch (error) {
            log.error("ERROR onRequest", error);
        }
    }

    return {onRequest}
});