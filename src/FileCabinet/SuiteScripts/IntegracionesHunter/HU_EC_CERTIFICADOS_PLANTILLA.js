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

define([], () => {

    function getCertificadoVenta( data ) {
        try {

            let { nombre, producto, placa, marca, modelo, color, anio, motor, chasis, bien_id, emisor } = data;
          nombre = nombre.replace("&", '&amp;');


            let content = '<?xml version="1.0"?>' +
            '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">' +
            '<pdf>' +
                '<body style="padding:0;">' +
                    '<img style="padding: 0 0 0 80px;" src="https://7451241-sb1.app.netsuite.com/core/media/media.nl?id=2553323&amp;c=7451241_SB1&amp;h=wXMh9WtNs2kfBBh5HojPSZLJTkN7B6T9aUtmIRt3PGfmvOel" width="540" height="110" />' +
                    '<div style="padding:20px 75px"><p style="margin-left:475px; border:1px solid #E0E4E5; padding:5px 25px; font-weight:bold; font-family: sans-serif;">C.V. '+ bien_id +'</p>' +
                    '<p style="margin:20px 0; font-family: sans-serif;">Certificamos que el Sr./Sra./Empresa <span style="font-weight:bold;">'+ nombre +'</span></p>' +
                    '<p style="margin:40px 0; font-family: sans-serif;">Ha contratado el siguiente producto:</p>' +
                    '<table style="border-collapse:collapse; border: 1px solid #E0E4E5; font-family: sans-serif;">' +
                        '<tr> <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">PRODUCTO</td></tr>'+'<tr> <td style="padding: 8px 100px; font-family: sans-serif;  text-align: center;">'+producto+'</td> </tr>' +
                    '</table>' +
                    '<p style="margin:20px 0; font-family: sans-serif;">*La vigencia del servicio se contará desde la instalación del equipo.</p>' +
                    '<p style="margin:20px 0; font-family: sans-serif;">Con Orden de Instalación en el vehículo:</p>' +
                    '<table style="margin: 0 auto; width:100%; font-family: sans-serif;">' +
                        '<tr> <td style="font-weight:bold;">PLACA</td> <td>'+ placa +'</td> <td style="font-weight:bold;">COLOR</td> <td>'+ color +'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">MARCA</td> <td>'+ marca +'</td> <td style="font-weight:bold;">AÑO</td> <td>'+ anio +'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">MODELO</td> <td>'+ modelo +'</td> <td style="font-weight:bold;">MOTOR</td> <td>'+ motor+'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">TIPO</td> <td>VEHICULO</td> <td style="font-weight:bold;">CHASIS</td> <td>'+ chasis+'</td> </tr>' +
                    '</table>' +
                    '<p style="text-align: center; margin:20px 0 230px 0px; font-family: sans-serif;" align="center">El presente certificado, no constituye confirmación de instalación del equipo.</p>' +
                    '<p style="margin:5px 0px; font-family: sans-serif; font-size:11px;">Los términos y condiciones del servicio pueden ser consultadas en nuestra página web</p>' +
                    '<p style="margin:5px 0 3px 0px; font-family: sans-serif; font-size:11px;">Info Emisión Docto : ' + emisor + ' - ' + fechaEcuador() +'</p></div>' +
                    '<footer> <img src="https://7451241-sb1.app.netsuite.com/core/media/media.nl?id=2553324&amp;c=7451241_SB1&amp;h=nyDb7c_Vbrp1gd5Xw7fG6xpXCsu-ZG5471YRE-LQn5v0Np0R" width="682" height="40" /> </footer>' +
                '</body>' +
            '</pdf>';

            return content;
        } catch (error) {
            log.error("ERROR getCertificadoVenta", error);
        }
    }

    function getCertificadoInstalacion( data ) {
        try {

            let { nombre, producto, fecha_instalacion, fecha_vigencia_servicio, placa, marca, modelo, color, anio, motor, chasis, bien_id, emisor} = data;
            nombre = nombre.replace("&", '&amp;');
            let content = '<?xml version="1.0"?>' +
            '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">' +
            '<pdf>' +
                '<body style="padding:0;">' +
                    '<img style="padding: 0 0 0 80px;" src="https://7451241-sb1.app.netsuite.com/core/media/media.nl?id=2553327&amp;c=7451241_SB1&amp;h=j9lIwqLaosqZrHbF5-g8Oef2LNpz_YezDL_ut3TWFeWanFiO" width="540" height="110" />' +
                    '<div style="padding:20px 75px"><p style="margin-left:460px; border:1px solid #E0E4E5; padding:5px 25px; font-weight:bold; font-family: sans-serif;">C.V. '+ bien_id +'</p>' +
                    '<p style="margin:20px 0; font-family: sans-serif;">Certificamos que el Sr./Sra./Empresa <span style="font-weight:bold;">'+ nombre +'</span></p>' +
                    '<p style="margin:40px 0; font-family: sans-serif;">Ha adquirido los siguientes sistemas</p>' +
                    '<table style="border-collapse:collapse; border: 1px solid #E0E4E5; font-family: sans-serif;">' +
                        '<tr> <td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">PRODUCTO</td><td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">FECHA DE <br/>INSTALACIÓN</td><td style="background-color: #E0E4E5; padding: 8px 10px; font-weight:bold; font-family: sans-serif;" align="center">VIGENCIA DE<br/> SERVICIO</td></tr>'+'<tr> <td style="padding: 8px; font-family: sans-serif;  text-align: center; border-right: 1px solid #E0E4E5;">'+ producto +'</td><td style="padding: 8px; font-family: sans-serif;  text-align: center; border-right: 1px solid #E0E4E5;">'+fecha_instalacion+'</td><td style="padding: 8px; font-family: sans-serif;  text-align: center;">'+fecha_vigencia_servicio+'</td> </tr>' +
                    '</table>' +
                    '<p style="margin:20px 0; font-family: sans-serif;">En el vehículo con las siguientes características:</p>' +
                    // '<p style="margin:20px 0; font-family: sans-serif;">Con Orden de Instalación en el vehículo:</p>' +
                    '<table style="margin: 0 auto 275px auto; width:100%; font-family: sans-serif;">' +
                        '<tr> <td style="font-weight:bold;">PLACA</td> <td>'+ placa +'</td> <td style="font-weight:bold;">COLOR</td> <td>'+ color +'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">MARCA</td> <td>'+ marca +'</td> <td style="font-weight:bold;">AÑO</td> <td>'+ anio +'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">MODELO</td> <td>'+ modelo +'</td> <td style="font-weight:bold;">MOTOR</td> <td>'+ motor+'</td> </tr>' +
                        '<tr> <td style="font-weight:bold;">TIPO</td> <td>VEHICULO</td> <td style="font-weight:bold;">CHASIS</td> <td>'+ chasis+'</td> </tr>' +
                    '</table>' +
                    // '<p style="text-align: center; margin:20px 0 230px 0px; font-family: sans-serif;" align="center">El presente certificado, no constituye confirmación de instalación del equipo.</p>' +
                    '<p style="margin:5px 0px; font-family: sans-serif; font-size:11px;">Los términos y condiciones del servicio pueden ser consultadas en nuestra página web</p>' +
                    '<p style="margin:5px 0 3px 0px; font-family: sans-serif; font-size:11px;">Info Emisión Docto : ' + emisor + ' - ' + fechaEcuador() +'</p></div>' +
                    '<footer> <img src="https://7451241-sb1.app.netsuite.com/core/media/media.nl?id=2553324&amp;c=7451241_SB1&amp;h=nyDb7c_Vbrp1gd5Xw7fG6xpXCsu-ZG5471YRE-LQn5v0Np0R" width="682" height="40" /> </footer>' +
                '</body>' +
            '</pdf>';

            return content;
        } catch (error) {
            log.error("ERROR getCertificadoVenta", error);
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