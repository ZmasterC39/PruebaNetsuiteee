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


define ( ['N/log', 'N/render', 'SuiteScripts/IntegracionesHunter/Emision de certificados v2/HU_EC_DOCUMENTOS_PLANTILLA_V2.js', 'N/https', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES'], function (log, render, _plantilla, https, _const) {

    function onRequest ( context ) {
        try {
            let params = {};
            switch (context.request.method) {
                case 'POST':
                    params = JSON.parse(context.request.body || '{}');
                    log.debug("POST", params);
                    context.response.writeFile({ file: _generarDescarga(params), isInline: false });
                    break;

                case 'GET':
                    let qParam = context.request.parameters.q;
                    log.debug("GET q", qParam);

                    if (!qParam) {
                        context.response.write("Certificado no válido: falta parámetro.");
                        return;
                    }

                    let decoded = sendPostEncrypt(qParam);
                    log.debug("decoded", decoded);

                    if (!decoded || !decoded[0]) {
                        context.response.write("No se pudo procesar el certificado.");
                        return;
                    }

                    let paramsGet = parseParamsGet(decoded[0]);
                    // Reutilizamos el mismo QR ya generado (codificado para URL), en vez de re-encriptar
                    paramsGet._qrValue = encodeURIComponent(qParam);
                    log.debug("paramsGet reconstruido", paramsGet);

                    let pdfFile = _generarDescarga(paramsGet);

                    if (!pdfFile) {
                        context.response.write("No se pudo generar el certificado.");
                        return;
                    }

                    context.response.writeFile({ file: pdfFile, isInline: true }); // se ve en el navegador
                    break;

                default:
                    break;
            }

        } catch (error) {
            log.error("ERROR onRequest", error.stack);
        }
    }

    function sendPostEncrypt(params) {
        try {
            var headers = {
            "Content-Type": "application/json",
            };
            var options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify({data:[params]}),
            };

            var response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + "/DecodificarString",
                body: options.body,
                headers: options.headers,
            });
            if (response && response.code === 200) {
                var responseBody = JSON.parse(response.body);
                return responseBody;
            } else {
                log.error(
                "HTTP Error",
                `Status Code: ${response.code}, Response Body: ${response.body}`
                );
                return false
            }
        } catch (error) {
            log.debug("ERROR sendPostEncrypt", error.stack);
            return false
        }
    }

    function _generarDescarga(params) {
        try {

            let tipo_certificado = params.tipo_certificado;
            let htmlContent;

            if ( tipo_certificado == '1') {
                htmlContent = _plantilla.getCertificadoVenta( params );
            }else if ( tipo_certificado == '2') {
                htmlContent = _plantilla.getCertificadoInstalacion( params );
            } else {
                log.error("tipo_certificado no reconocido", tipo_certificado);
                return null;
            }

            let tipo_certificado_label = tipo_certificado == '1' ? 'VTA' : 'INST';
            let pdfRenderer = render.create();
            pdfRenderer.templateContent = htmlContent;
            let pdfFile = pdfRenderer.renderAsPdf();
            pdfFile.name = `CERT${tipo_certificado_label}_${params.placa}.pdf`;
            return pdfFile;
        } catch (error) {
            log.error("ERROR _generarDescarga", error.stack);
            return null;
        }
    }

    function parseParamsGet(str) {
        const idxCorchete = str.indexOf('[');

        // Todo antes del '[' son los campos planos
        const partePlana = str.substring(0, idxCorchete);
        // Todo desde el '[' hasta el final es el JSON de items
        const parteItems = str.substring(idxCorchete);

        // Separamos los campos planos por coma, y limpiamos espacios
        const campos = partePlana.split(',').map(c => c.trim());

        // El último elemento puede quedar vacío (por la coma antes del '[')
        if (campos[campos.length - 1] === '') campos.pop();

        const [
            codigo_vehiculo,
            cliente,
            cliente_num,
            placa,
            marca,
            modelo,
            tipo,
            color,
            anio,
            motor,
            chasis,
            emisor,
            tipo_certificado,
        ] = campos;

        const items = JSON.parse(parteItems);

        return {
            codigo_vehiculo,
            cliente,
            cliente_num,
            placa,
            marca,
            modelo,
            tipo,
            color,
            color_carseg: color, // fallback, ya que el template usa color || color_carseg
            anio,
            motor,
            chasis,
            items,
            emisor, // ya viene calculado, no el objeto usuario completo
            tipo_certificado
        };
    }


    return {onRequest}
});