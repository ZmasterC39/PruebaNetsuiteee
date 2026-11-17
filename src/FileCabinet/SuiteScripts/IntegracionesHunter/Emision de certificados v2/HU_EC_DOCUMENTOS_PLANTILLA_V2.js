/**
 * @NpiVersion 2.1
 *
 * @author Mauro F Ramos
 * @date 29/10/2025
 * @description Contiene las plantillas PDF para la generacion de Certificados
 *
 * @version 1.0
 * @notes - Ninguna -
 * @LastModifiedBy 29/10/2025
 *
*/

define(['N/log', 'N/https', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES'], (log, https, _const) => {

    function escapeXml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Obtiene el emisor: usa el ya calculado (flujo GET) o lo calcula desde 'usuario' (flujo POST)
    function resolverEmisor(params) {
        if (params.emisor) return params.emisor;
        if (params.usuario && params.usuario.email) {
            return params.usuario.email.split('@')[0].toUpperCase();
        }
        return '';
    }

    // Obtiene el valor del QR: reutiliza el ya generado (flujo GET) o lo genera llamando a la API (flujo POST)
    function resolverQrPayload(params) {
        if (params._qrValue) {
            // Ya viene codificado desde el Suitelet (reconstrucción para GET)
            return params._qrValue;
        }
        let encrypted = sendPostEncrypt(params);
        if (!encrypted || !encrypted[0]) {
            log.error("resolverQrPayload", "No se pudo generar el payload del QR");
            return '';
        }
        return encodeURIComponent(encrypted[0]);
    }

    function getCertificadoVenta( params ) {
        try {

            let { codigo_vehiculo, cliente, cliente_num, placa, marca, modelo, tipo, color, color_carseg, anio, motor, chasis, items } = params;

            let qrPayload = resolverQrPayload(params);
            let emisor = escapeXml(resolverEmisor(params));

            cliente = escapeXml(cliente);
            let placaSafe = escapeXml(placa);
            let marcaSafe = escapeXml(marca);
            let modeloSafe = escapeXml(modelo);
            let colorSafe = escapeXml(color || color_carseg);
            let motorSafe = escapeXml(motor);
            let chasisSafe = escapeXml(chasis);
            let codigoVehiculoSafe = escapeXml(codigo_vehiculo);
            let clienteNumSafe = escapeXml(cliente_num);

            let itemsRows = (items || []).map(item =>
            `<tr>
                <td style="padding: 8px 100px; font-family: sans-serif; text-align: center; border: 1px solid #E0E4E5;">${escapeXml(item.descripcion)}</td>
            </tr>`
            ).join('');

            let content = `<?xml version="1.0"?>
            <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
            <pdf>
                <head>
                    <macrolist>
                        <macro id="nlfooter">
                            <footer>
                                <p style="margin: 5px 75px 3px 75px; font-family: sans-serif; font-size: 11px;">Los términos y condiciones del servicio pueden ser consultadas en nuestra página web</p>
                                <p style="margin: 5px 75px 3px 75px; font-family: sans-serif; font-size: 11px;">Info Emisión Docto: ${emisor} - ${fechaEcuador()}</p>
                                <img src="https://7451241.app.netsuite.com/core/media/media.nl?id=4109206&amp;c=7451241&amp;h=7o4joRnOHQWfmGkEvTx55mQ27l-MM937nzJvUiX2uYsnKyKs" width="682" height="40" />
                            </footer>
                        </macro>
                    </macrolist>
                </head>
                <body style="padding: 0; margin-bottom: 80px;" footer="nlfooter" footer-height="20pt">
                    <img style="padding: 0 0 0 80px;" src="https://7451241.app.netsuite.com/core/media/media.nl?id=4109204&amp;c=7451241&amp;h=HQMbfYZtQs0NNgHLJu31jUlCayyuFDaLei5oCOteoDRtEQvJ" width="550" height="110" />
                    <div style="padding: 20px 75px;">
                        <p align="right">
                            <span style="border: 1px solid #E0E4E5; padding: 5px 10px; font-weight: bold; font-family: sans-serif;">C.V. ${codigoVehiculoSafe}</span>
                        </p>
                        <p style="margin: 20px 0; font-family: sans-serif;">Certificamos que el Sr./Sra./Empresa <span style="font-weight: bold;">${cliente} - ${clienteNumSafe}</span></p>
                        <p style="margin: 20px 0; font-family: sans-serif;">Ha contratado el siguiente producto:</p>
                        <table style="border-collapse: collapse; border: 1px solid #E0E4E5; font-family: sans-serif; text-align: center;">
                            <tr>
                                <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight: bold; font-family: sans-serif; text-align: center;">PRODUCTO</td>
                            </tr>
                            ${itemsRows}
                        </table>
                        <p style="margin: 20px 0; font-family: sans-serif;">*La vigencia del servicio se contará desde la instalación del equipo.</p>
                        <p style="margin: 20px 0; font-family: sans-serif;">Con Orden de Instalación en el vehículo:</p>
                        <table style="margin: 0 auto; width: 100%; font-family: sans-serif;">
                        <tr>
                            <td style="font-weight: bold;">PLACA</td>
                            <td>${placaSafe}</td>
                            <td style="width: 40px;"></td>
                            <td style="font-weight: bold;">COLOR</td>
                            <td>${colorSafe}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">MARCA</td>
                            <td>${marcaSafe}</td>
                            <td style="width: 40px;"></td>
                            <td style="font-weight: bold;">AÑO</td>
                            <td>${anio}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">MODELO</td>
                            <td>${modeloSafe}</td>
                            <td style="width: 40px;"></td>
                            <td style="font-weight: bold;">MOTOR</td>
                            <td>${motorSafe}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">TIPO</td>
                            <td>VEHICULO</td>
                            <td style="width: 40px;"></td>
                            <td style="font-weight: bold;">CHASIS</td>
                            <td>${chasisSafe}</td>
                        </tr>
                        </table>
                        <p style="text-align: center; margin: 20px 0; font-family: sans-serif;">El presente certificado, no constituye confirmación de instalación del equipo.</p>
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="text-align:center; vertical-align:middle;">
                                    <img src="https://7451241.app.netsuite.com/core/media/media.nl?id=4912785&amp;c=7451241&amp;h=1PqEDQ6vUwGlICGN2VdX29oblNvc2_yTijUYVlS1aXnA8thf" width="200" height="80" style="display:block; margin:0 auto;" />
                                </td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <barcode codetype="qrcode" showtext="false" height="150" width="150" value="https://7451241.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=6852&amp;deploy=1&amp;compid=7451241&amp;ns-at=AAEJ7tMQrsIyuMs8p0xhlyynsNZ-I39zMiH45alxMZLH7zrU3oc&amp;q=${qrPayload}" style="display:block; margin:0 auto;" />
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center; vertical-align:middle;">
                                    <p style="text-align:center; margin:5px 0 0 0;"><b>FIRMA AUTORIZADA</b></p>
                                </td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <p style="text-align:center; margin:5px 0 0 0;"><b>VERIFICAR CERTIFICADO</b></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </body>
            </pdf>`;

            return content;
        } catch (error) {
            log.error("ERROR getCertificadoVenta", error);
        }
    }

    function getCertificadoInstalacion( params ) {
        try {

            let { codigo_vehiculo, cliente, cliente_num, placa, marca, modelo, tipo, color, color_carseg, anio, motor, chasis, items } = params;

            let emisor = escapeXml(resolverEmisor(params));
            cliente = escapeXml(cliente);
            let qrPayload = resolverQrPayload(params);

            let placaSafe = escapeXml(placa);
            let marcaSafe = escapeXml(marca);
            let modeloSafe = escapeXml(modelo);
            let colorSafe = escapeXml(color || color_carseg);
            let motorSafe = escapeXml(motor);
            let chasisSafe = escapeXml(chasis);
            let codigoVehiculoSafe = escapeXml(codigo_vehiculo);
            let clienteNumSafe = escapeXml(cliente_num);

            let itemsRows = (items || []).map(item =>
                `<tr>
                    <td style="padding: 8px 10px; font-family: sans-serif; text-align: center; border: 1px solid #E0E4E5;">${escapeXml(item.descripcion)}</td>
                    <td style="padding: 8px 10px; font-family: sans-serif; text-align: center; border: 1px solid #E0E4E5;">${escapeXml(item.fecha_instalacion)}</td>
                    <td style="padding: 8px 10px; font-family: sans-serif; text-align: center; border: 1px solid #E0E4E5;">${escapeXml(item.fecha_vigencia_servicio)}</td>
                </tr>`
            ).join('');

            let content =`<?xml version="1.0"?>
            <!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
            <pdf>
                <head>
                    <macrolist>
                        <macro id="nlfooter">
                            <footer>
                                <p style="margin: 5px 75px 3px 75px; font-family: sans-serif; font-size: 11px;">Los términos y condiciones del servicio pueden ser consultadas en nuestra página web</p>
                                <p style="margin: 5px 75px 3px 75px; font-family: sans-serif; font-size: 11px;">Info Emisión Docto: ${emisor} - ${fechaEcuador()}</p>
                                <img src="https://7451241.app.netsuite.com/core/media/media.nl?id=4109206&amp;c=7451241&amp;h=7o4joRnOHQWfmGkEvTx55mQ27l-MM937nzJvUiX2uYsnKyKs" width="682" height="40" />
                            </footer>
                        </macro>
                    </macrolist>
                </head>
                <body style="padding: 0; margin-bottom: 80px;" footer="nlfooter" footer-height="20pt">
                    <img style="padding: 0 0 0 80px;" src="https://7451241.app.netsuite.com/core/media/media.nl?id=4109205&amp;c=7451241&amp;h=PntmB_L-fX_NP0Nlz9sPonKLf7AQQ2A45GngAfOxkCuR6ctf" width="540" height="110" />
                    <div style="padding:20px 75px">
                        <p align="right">
                            <span style="border: 1px solid #E0E4E5; padding: 5px 10px; font-weight: bold; font-family: sans-serif;">C.V. ${codigoVehiculoSafe}</span>
                        </p>
                        <p style="margin:20px 0; font-family: sans-serif;">Certificamos que el Sr./Sra./Empresa <span style="font-weight:bold;">${cliente} - ${clienteNumSafe} </span></p>
                        <p style="margin:40px 0; font-family: sans-serif;">Ha adquirido los siguientes sistemas</p>
                        <table style="border-collapse:collapse; border: 1px solid #E0E4E5; font-family: sans-serif;">
                            <tr>
                                <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">PRODUCTO</td>
                                <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">FECHA DE INSTALACIÓN</td>
                                <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">VIGENCIA DE SERVICIO</td>
                            </tr>
                            ${itemsRows}
                        </table>
                        <p style="margin:20px 0; font-family: sans-serif;">En el vehículo con las siguientes características:</p>
                        <table style="margin: 0 auto 10px auto; width:100%; font-family: sans-serif;">
                            <tr>
                                <td style="font-weight:bold;">PLACA</td>
                                <td>${placaSafe}</td>
                                <td style="width: 40px;"></td>
                                <td style="font-weight:bold;">COLOR</td>
                                <td>${colorSafe}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:bold;">MARCA</td>
                                <td>${marcaSafe}</td>
                                <td style="width: 40px;"></td>
                                <td style="font-weight:bold;">AÑO</td>
                                <td>${anio}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:bold;">MODELO</td>
                                <td>${modeloSafe}</td>
                                <td style="width: 40px;"></td>
                                <td style="font-weight:bold;">MOTOR</td>
                                <td>${motorSafe}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:bold;">TIPO</td>
                                <td>VEHICULO</td>
                                <td style="width: 40px;"></td>
                                <td style="font-weight:bold;">CHASIS</td>
                                <td>${chasisSafe}</td>
                            </tr>
                        </table>
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="text-align:center; vertical-align:middle;">
                                    <img src="https://7451241.app.netsuite.com/core/media/media.nl?id=4912785&amp;c=7451241&amp;h=1PqEDQ6vUwGlICGN2VdX29oblNvc2_yTijUYVlS1aXnA8thf" width="200" height="80" style="display:block; margin:0 auto;" />
                                </td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <barcode codetype="qrcode" showtext="false" height="150" width="150" value="https://7451241.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=6852&amp;deploy=1&amp;compid=7451241&amp;ns-at=AAEJ7tMQrsIyuMs8p0xhlyynsNZ-I39zMiH45alxMZLH7zrU3oc&amp;q=${qrPayload}" style="display:block; margin:0 auto;" />
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center; vertical-align:middle;">
                                    <p style="text-align:center; margin:5px 0 0 0;"><b>FIRMA AUTORIZADA</b></p>
                                </td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <p style="text-align:center; margin:5px 0 0 0;"><b>VERIFICAR CERTIFICADO</b></p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </body>
            </pdf>`;

            return content;
        } catch (error) {
            log.error("ERROR getCertificadoInstalacion", error);
        }
    }

    function sendPostEncrypt(params) {
        try {
            let { codigo_vehiculo, cliente, cliente_num, placa, marca, modelo, tipo, color, color_carseg, anio, motor, chasis, tipo_certificado, items, usuario } = params;

            const itemsFiltrados = (items || []).map(item => ({
                fecha_instalacion: item.fecha_instalacion,
                fecha_vigencia_servicio: item.fecha_vigencia_servicio,
                descripcion: item.descripcion,
            }));

            var dataToSend = {
                data: [`${codigo_vehiculo},${cliente},${cliente_num},${placa},${marca},${modelo},${tipo},${color || color_carseg},${anio},${motor},${chasis},${usuario.email.split('@')[0].toUpperCase()},${tipo_certificado},${JSON.stringify(itemsFiltrados)}`],
            };

            var headers = {
                "Content-Type": "application/json",
            };
            var options = {
                method: "POST",
                headers: headers,
                body: JSON.stringify(dataToSend),
            };

            var response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + "/CodificarString",
                body: options.body,
                headers: options.headers,
            });
            if (response && response.code === 200) {
                var responseBody = JSON.parse(response.body);
                log.debug("JSON.stringify(dataToSend)", JSON.stringify(dataToSend));
                log.debug("responseBody", responseBody);

                return responseBody;
            } else {
                log.error(
                "HTTP Error",
                `Status Code: ${response.code}, Response Body: ${response.body}`
                );
                return false
            }
        } catch (error) {
            log.debug("ERROR sendPostEncrypt", error);
            return false
        }
    }

    function fechaEcuador() {
        let fechaActualidad = new Date();
        let opciones = { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false};
        let fechaEcuador = new Intl.DateTimeFormat("es-EC", opciones).format(fechaActualidad);
        return fechaEcuador;
    }

    return { getCertificadoVenta, getCertificadoInstalacion }
});