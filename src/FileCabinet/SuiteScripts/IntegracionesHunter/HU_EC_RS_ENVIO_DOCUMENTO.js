/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
*/

define(['N/log', 'N/sftp', 'N/https', 'N/runtime', 'N/record', 'N/render', 'N/file', 'N/email', 'N/task' ,'N/encode', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES.js'], (log, sftp, https, runtime, record, render, file, email, task, encode, _const) => {


    const _post = (requestBody) => {
        try {
            log.debug("Governance", runtime.getCurrentScript().getRemainingUsage());

            const { subsidiary, id } = runtime.getCurrentUser();
            const {
                recordType, recordId, eventType,
                correo, correo_jefa, mensaje,
                archivo_nombre, archivo_extension, archivo_contenido, archivo_header, archivo_rows,
                pdf_nombre, pdf_contenido
            } = requestBody;

            const estimacion = _get_estimacion(recordType, recordId);

            // 1. Crear seguimiento
            _crear_seguimiento(estimacion, correo, mensaje);

            // 2. Guardar archivos en NetSuite
            const archivos = _crear_archivos(estimacion, archivo_nombre, archivo_extension, archivo_contenido, archivo_header, archivo_rows, pdf_nombre, pdf_contenido);

            // 3. Generar PDF unificado
            const adjuntos = _crear_archivo_adjunto(estimacion, archivos, archivo_header, archivo_rows, archivo_nombre, archivo_extension);

            // 4. Enviar correo
            _enviar_correo_cliente(estimacion, correo, correo_jefa, adjuntos, mensaje);

            // 5. Eliminar archivos temporales
            _eliminar_archivos_creados(archivos);



            _lanzarSSDisponible(estimacion.recordId, archivo_header, archivo_rows, subsidiary, id );

            log.debug("Governance", runtime.getCurrentScript().getRemainingUsage());
            return JSON.stringify({ status: true, message: 'Proceso completado' });
            //_envio_nube(123, 456);

        } catch (error) {
            log.error("ERROR _post", error);
            return JSON.stringify({
                status: false,
                message: error
            })
        }
    }

    function _eliminar_archivos_creados(archivos) {
        try {
            if (archivos.excel?.excelFileId) {
                file.delete({ id: archivos.excel.excelFileId });
                log.debug("Archivo excel eliminado", archivos.excel.excelFileId);
            }

            if (archivos.pdf?.archivo_pdf_id) {
                file.delete({ id: archivos.pdf.archivo_pdf_id });
                log.debug("Archivo pdf eliminado", archivos.pdf.archivo_pdf_id);
            }

        } catch (error) {
            log.error("ERROR _eliminar_archivos_creados", error);
        }
    }

    function sendPostEncrypt( estimacion ) {
        let dataToSend = { data: [estimacion.recordId + ""] };

        let headers = {
        "Content-Type": "application/json",
        };

        let options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(dataToSend),
        };

            try {
            let response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + "/CodificarString",
                body: options.body,
                headers: options.headers,
            });

            if (response.code === 200) {
                let responseBody = JSON.parse(response.body);
                return responseBody;
            } else {
                log.error(
                "HTTP Error",
                `Status Code: ${response.code}, Response Body: ${response.body}`
                );
            }
        } catch (error) {
        log.error("Exception", `Error while sending request: ${error.message}`);
        }
    }

    function _enviar_correo_cliente(estimacion, correo, correo_jefa, adjuntos, mensaje) {
        try {
            let [ estimacion_id ] = sendPostEncrypt( estimacion );
            const cuerpo =
            // MENSAJE
            '<p style="margin: 0; font-size: 14px; line-height: 1.6; color: #575759;">'
                + (mensaje.length > 0
                    ? mensaje
                    : '')
                + '  </p>'
                + '<div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #575759;">'


                // HEADER
                + '<div style="background-color: #e00031; padding: 20px 24px; border-radius: 8px 8px 0 0;">'
                + '  <table style="width: 100%;">'
                + '    <tr>'
                + '      <td style="color: #ffffff; font-size: 20px; font-weight: bold;">Propuesta Econ\u00f3mica</td>'
                + '      <td style="color: #ffffff; font-size: 14px; text-align: right;"># ' + estimacion.numero_documento + '</td>'
                + '    </tr>'
                + '  </table>'
                + '</div>'

                // DATOS GENERALES
                + '<div style="background-color: #ffffff; padding: 20px 24px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">'
                + '  <table style="width: 100%; font-size: 14px;">'
                + '    <tr>'
                + '      <td style="padding: 4px 0; color: #999;">Cliente:</td>'
                + '      <td style="padding: 4px 0; font-weight: bold;">' + estimacion.clienteLimpio + '</td>'
                + '      <td style="padding: 4px 0; color: #999;">Emisi\u00f3n:</td>'
                + '      <td style="padding: 4px 0; font-weight: bold;">' + estimacion.fechaEmision + '</td>'
                + '    </tr>'
                + '    <tr>'
                + '      <td style="padding: 4px 0;"></td>'
                + '      <td style="padding: 4px 0;"></td>'
                + '      <td style="padding: 4px 0; color: #999;">Vigencia:</td>'
                + '      <td style="padding: 4px 0; font-weight: bold;">' + estimacion.fechaVencimiento + '</td>'
                + '    </tr>'
                + '  </table>'
                + '</div>'

                // TABLA DE PRODUCTOS
                + '<div style="padding: 0; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; background-color: #ffffff;">'
                + '  <table style="width:100%; border-collapse:collapse; border: 1px solid #fff;">'
                + '    <tr style="background-color: #575759;">'
                + '      <th style="border: 1px solid #fff; padding: 12px 14px; color: #fff; font-size: 12px; text-align: left; text-transform: uppercase;">Producto / Servicio</th>'
                + '      <th style="border: 1px solid #fff; padding: 12px 14px; color: #fff; font-size: 12px; text-align: center; text-transform: uppercase;">Cant.</th>'
                + '      <th style="border: 1px solid #fff; padding: 12px 14px; color: #fff; font-size: 12px; text-align: right; text-transform: uppercase;">P. Unitario</th>'
                + '      <th style="border: 1px solid #fff; padding: 12px 14px; color: #fff; font-size: 12px; text-align: right; text-transform: uppercase;">Total</th>'
                + '    </tr>'
                + estimacion.lineas.map((linea, index) => {
                        const bgRow = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
                        return '<tr style="background-color: ' + bgRow + ';">'
                            + '  <td style="border: 1px solid #fff; padding: 10px 14px; font-size: 13px; color: #575759;">'                                    + linea.descripcion  + '</td>'
                            + '  <td style="border: 1px solid #fff; padding: 10px 14px; font-size: 13px; color: #575759; text-align: center;">'                + linea.cantidad     + '</td>'
                            + '  <td style="border: 1px solid #fff; padding: 10px 14px; font-size: 13px; color: #575759; text-align: right;">$'                + linea.precio       + '</td>'
                            + '  <td style="border: 1px solid #fff; padding: 10px 14px; font-size: 13px; color: #575759; text-align: right;">$'                + linea.monto        + '</td>'
                            + '</tr>';
                    }).join('')
                + '  </table>'
                + '</div>'

                // TOTALES
                + '<div style="background-color: #fff; padding: 16px 24px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">'
                + '  <table style="width: 100%; font-size: 14px;">'
                + '    <tr>'
                + '      <td style="padding: 6px 0;"></td>'
                + '      <td style="padding: 6px 14px; text-align: right; background-color: #e00031; color: #fff; width: 120px;">SUB TOTAL</td>'
                + '      <td style="padding: 6px 14px; text-align: right; width: 100px; background-color: #fff5f5;">$' + estimacion.subtotal + '</td>'
                + '    </tr>'
                + '    <tr>'
                + '      <td style="padding: 6px 0;"></td>'
                + '      <td style="padding: 6px 14px; text-align: right; background-color: #e00031; color: #fff;">IVA</td>'
                + '      <td style="padding: 6px 14px; text-align: right; background-color: #fff5f5;">$' + estimacion.impuesto + '</td>'
                + '    </tr>'
                + '    <tr>'
                + '      <td style="padding: 6px 0;"></td>'
                + '      <td style="padding: 8px 14px; text-align: right; background-color: #e00031; color: #fff; font-weight: bold; border-radius: 4px 0 0 4px;">TOTAL</td>'
                + '      <td style="padding: 8px 14px; text-align: right; background-color: #fff5f5; color: #575759; font-weight: bold; font-size: 16px; border-radius: 0 4px 4px 0;">$' + estimacion.total + '</td>'
                + '    </tr>'
                + '  </table>'
                + '</div>'

                // BOTÓN RESPONDER
                + '<div style="padding: 24px; background-color: #ffffff; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; text-align: center;">'
                + '  <p style="margin: 0 0 12px; font-size: 14px; color: #575759;">\u00bfDesea aceptar o rechazar esta propuesta?</p>'

                + '  <a href="https://7451241.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=6858&deploy=1&compid=7451241&ns-at=AAEJ7tMQVq8nJD7qA8vnEH6R07xMZllywkM_KsXPjGJXr8hGduk&tran=' + estimacion_id + '" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: #e00031; color: #ffffff; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px;">Responder Propuesta</a>'
                + '</div>'

                // MENSAJE
                + '<div style="padding: 20px 24px; background-color: #ffffff; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">'
                + '  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #575759;">'
                + (estimacion.nota
                    ? estimacion.nota
                    : 'Adjunto encontrar\u00e1 su estimaci\u00f3n en formato PDF. Gracias por su preferencia.')
                + '  </p>'
                + '</div>'

                // FOOTER
                + '<div style="background-color: #575759; padding: 14px 24px; border-radius: 0 0 8px 8px; text-align: center;">'
                + '  <p style="margin: 0; font-size: 11px; color: #cccccc;">Este es un correo generado autom\u00e1ticamente. Para mayor detalle contacte a su ejecutivo de ventas.</p>'
                + '</div>'

                + '</div>';

            const bcc = ['mramos@carsegsa.com'];
            if (correo_jefa) {
                bcc.push(correo_jefa);
            }

            log.debug(bcc)

            email.send({
                author:      runtime.getCurrentUser().id,
                recipients:  correo,
                bcc: bcc,
                subject:    `${estimacion.numero_documento} ${estimacion.clienteLimpio}`,
                body:        cuerpo,
                attachments: adjuntos,
                relatedRecords: {
                    transactionId: estimacion.recordId
                }
            });
        } catch (error) {
            log.error("ERROR _enviar_correo_cliente", error);
        }
    }

    function _crear_archivo_adjunto(estimacion, archivos, archivo_header, archivo_rows, archivo_nombre, archivo_extension) {
        try {
            let xml = estimacion.plantilla_ftl;

            // 1. Adjuntar PDF externo si existe
            if (archivos.pdf?.url_archivo_pdf) {
                xml = xml.replace('<!--ANEXOS 1-->', `<pdf src="${archivos.pdf.url_archivo_pdf}"/>`);
            }

            // 2. Construir tabla de bienes
            let tablaArchivo = false;
            if (archivo_header && archivo_rows) {
                const columnas = archivo_header.split(',');
                const filas    = archivo_rows.split('\n').filter(r => r.trim());

                tablaArchivo =
                    '<table style=" width:90%; margin-top:10px;  margin-left:60px; border:1px solid #fff; border-collapse:collapse;">\n' +
                    '  <thead><tr>\n';

                tablaArchivo += '    <th style="color: #fff; border:1px solid #FFF; padding:15px; background-color: #575759;"><b>CÓDIGO DE VEHICULO</b></th>\n';
                tablaArchivo += '    <th style="color: #fff; border:1px solid #FFF; padding:15px; background-color: #575759;"><b> MOTOR</b></th>\n';
                tablaArchivo += '    <th style="color: #fff; border:1px solid #FFF; padding:15px; background-color: #575759;"><b> CHASIS</b></th>\n';
                tablaArchivo += '  </tr></thead>\n  <tbody>\n';

                for (let f = 0; f < filas.length; f++) {
                    const celdas = filas[f].split(',');
                    tablaArchivo += '  <tr>\n';
                    for (let j = 0; j < columnas.length; j++) {
                        tablaArchivo += '    <td style="border:1px solid #FFF; padding:15px; background-color: #f2f4f5">' + ((celdas[j] || '').trim()) + '</td>\n';
                    }
                    tablaArchivo += '  </tr>\n';
                }
                tablaArchivo += '  </tbody>\n</table>';
            }

            if ( tablaArchivo ) {
                // 3. Reemplazar bloque ANEXOS 2
                xml = xml.replace('<!--ANEXOS 2-->', `
                    <pdf>
                        <head>
                            <style type="text/css">
                                * {
                                font-family: sans-serif;
                                font-size: 10pt;
                                }
                            </style>
                            <macrolist>
                                <macro id="nlheader">
                                    <table width="100%" >
                                        <tr>
                                            <td rowspan="2" width="50%">
                                            <div width="100%" height="100%" top="-2px" left="-2" padding="0">
                                                <img src='https://7451241.app.netsuite.com/core/media/media.nl?id=230685&amp;c=7451241&amp;h=2yX0qkwvli-A_bQR6HEf3b0YxoaU2t0AZLiVeuJqatkFZRsX&amp;fcts=20240924113444&amp;whence=' />
                                            </div>
                                            </td>
                                            <td align="right" padding-right="50px" padding-top="25px" padding-bottom="0pt"><p color="#e00031" margin-top="1px" margin-bottom="1px"><b font-size="20pt">Detalle de Bienes</b> </p> </td>
                                        </tr>
                                        <tr>
                                            <td align="right" padding-right="50px" padding-top="0pt" padding-bottom="0pt"><p font-size="15pt" margin-top="1px" margin-bottom="1px"># ${estimacion.numero_documento}</p></td>
                                        </tr>
                                    </table>
                                </macro>
                                <macro id="nlfooter">
                                    <img src='https://7451241.app.netsuite.com/core/media/media.nl?id=230686&amp;c=7451241&amp;h=pQiU3aaGZWuczmqn1-bWe0DU_K9UwkGuc4C_oUAffGIa9e4a&amp;fcts=20240924113530&amp;whence=' />
                                    <p color="#575759" align="center" margin-top="10px" margin-bottom="2pt" padding-left="50px" padding-right="50px" font-size="9pt">
                                    El pago de la contraprestación aquí detallada significa que usted ha sido debidamente informado de las <a href="#" ><b font-size="8.5pt">condiciones del servicio</b></a> y que se encuentra conforme con las mismas. Para mayor detalle contacte a su ejecutivo de ventas.
                                    </p>
                                </macro>
                            </macrolist>
                        </head>
                        <body header="nlheader" header-height="150px" footer="nlfooter" footer-height="170px" padding="0" size="A4">
                            ${tablaArchivo}
                        </body>
                    </pdf>
                `);
            }


            const archivo_pdf_unificado = render.xmlToPdf({ xmlString: xml });
            archivo_pdf_unificado.name  = `${estimacion.numero_documento}.pdf`;

            //_envio_servidor(`${estimacion.numero_documento}`,archivo_pdf_unificado.getContents());

            return [archivo_pdf_unificado];

        } catch (error) {
            log.error("ERROR _crear_archivo_adjunto", error);
            return [];
        }
    }


    function _crear_archivos(estimacion, archivo_nombre, archivo_extension, archivo_contenido, archivo_header, archivo_rows, pdf_nombre, pdf_contenido) {
        try {
            const archivos = {};

            if (archivo_header && archivo_rows &&  archivo_nombre.length != 0) {
                const archivo_excel = file.create({
                    name:     `${archivo_nombre}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    fileType: (archivo_extension === 'csv') ? file.Type.CSV : file.Type.EXCEL,
                    contents: archivo_contenido,
                    encoding: file.Encoding.UTF_8,
                    folder:   18031
                });
                const excelFileId = archivo_excel.save();
                archivos.excel = { excelFileId };
                //_envio_servidor(`${estimacion.numero_documento}`, archivo_contenido);
            }

            if (pdf_contenido && pdf_nombre) {
                const archivoPdfNS = file.create({
                    name:   `${pdf_nombre}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    fileType: file.Type.PDF,
                    contents: pdf_contenido,
                    isOnline: true,
                    folder:   18031
                });
                const archivo_pdf_id = archivoPdfNS.save();

                const fileObj     = file.load({ id: archivo_pdf_id });
                const urlEscapada = fileObj.url.replace(/&/g, '&amp;');
                const url_archivo_pdf = `https://7451241-sb1.app.netsuite.com${urlEscapada}`;

                archivos.pdf = { archivo_pdf_id, url_archivo_pdf };
                //_envio_servidor(`${estimacion.numero_documento}_pdf`, pdf_contenido);
            }


            return archivos;

        } catch (error) {
            log.error("ERROR _crear_archivos", error);
            return {};
        }
    }

    function _crear_seguimiento(estimacion, correo, mensaje) {
        try {
            const seguimiento = record.create({ type: 'customrecord_ht_record_seguicliente', isDynamic: true });
            seguimiento.setValue({ fieldId: 'customform',                         value: 278 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tipocliente',       value: 1 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_estado',            value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tiposeguimiento',   value: 7 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cliente',           value: estimacion.cliente_id});
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_modocontacto',      value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_resultadogestion',  value: 19 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cmotivo',           value: 134 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_seguimiento',       value: estimacion.numero_documento + '\n' + mensaje + '\n' + 'Enviado por correo a: ' + correo });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_proximocontacto',   value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 });

            const seguimientoId = seguimiento.save();
        } catch (error) {
            log.error("ERROR _crear_seguimiento", error)
        }
    }

    function _get_estimacion(recordType, recordId) {
        try {
            const estimacion       = record.load({ type: recordType, id: recordId });
            const numero_documento = estimacion.getValue({ fieldId: 'tranid' });
            const cliente_id       = estimacion.getValue({ fieldId: 'entity' });
            const cliente          = estimacion.getText({ fieldId: 'entity' });
            const clienteLimpio    = cliente.replace(/^C-EC-\d+\s+/, '');
            const nota             = estimacion.getText({ fieldId: 'memo' });
            const fechaEmision     = estimacion.getText({ fieldId: 'trandate' });
            const fechaVencimiento = estimacion.getText({ fieldId: 'duedate' });
            const subtotal         = estimacion.getText({ fieldId: 'subtotal' });
            const impuesto         = estimacion.getText({ fieldId: 'taxtotal' });
            const total            = estimacion.getText({ fieldId: 'total' });

            const lineCount = estimacion.getLineCount({ sublistId: 'item' });
            const lineas = [];

            for (let i = 0; i < lineCount; i++) {
                lineas.push({
                    descripcion : estimacion.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }),
                    cantidad    : estimacion.getSublistValue({ sublistId: 'item', fieldId: 'quantity',    line: i }),
                    precio      : estimacion.getSublistText({ sublistId: 'item', fieldId: 'rate',        line: i }),
                    monto       : estimacion.getSublistText({ sublistId: 'item', fieldId: 'amount',      line: i }),
                });
            }

            const renderer = render.create();
            renderer.setTemplateByScriptId({ scriptId: 'CUSTTMPL_314_7451241_104' });
            renderer.addRecord({ templateName: 'record', record: estimacion });
            const plantilla_ftl_formulario = renderer.renderAsString();

            const estimacionObjeto = {
                recordType,
                recordId,
                numero_documento,
                cliente_id,
                cliente,
                clienteLimpio,
                nota,
                fechaEmision,
                fechaVencimiento,
                subtotal,
                impuesto,
                total,
                lineas,
                plantilla_ftl: plantilla_ftl_formulario
            };

            return estimacionObjeto;

        } catch (error) {
            log.error('ERROR _get_estimacion', error);
            return null;
        }
    }

    function _envio_servidor(archivo_nombre, archivo_contenido) {
        var headerObj = { 'Accept-Language': 'es-ES', 'Accept': "*/*", "Content-Type": "application/json" };
        var response = https.post({
            url: 'https://default9cdfc565b79c4e2f8ded3a3256417a.99.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/e8d1f67281254d5d85fcba5bd65ffc05/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=PThZ0CHg40Q4jaJEPIqIqZl-78_Ks-JJbHj3bYspi6Y',
            body: JSON.stringify({archivo_nombre, archivo_contenido}),
            headers: headerObj
        });
        log.debug("response", response)
    }

        // TODO: CREAR CAMPO DE REGISTRO DE ACTIVIDAD EN EL SCHEDULED SCRIPT
    function _lanzarSSDisponible(estimacion, archivo_header, archivo_rows, subsidiaria, usuario ) {
        const scriptId = 'customscript_hu_ec_ss_estimacion';
        const deployments = [
            'customdeploy_hu_ec_ss_estimacion_001',
            'customdeploy_hu_ec_ss_estimacion_002',
            'customdeploy_hu_ec_ss_estimacion_003',
            'customdeploy_hu_ec_ss_estimacion_004',
            'customdeploy_hu_ec_ss_estimacion_005',
        ];

        for (let i = 0; i < deployments.length; i++) {
            try {
                const mrTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: scriptId,
                    deploymentId: deployments[i],
                    params: {
                        custscript_estimacion: estimacion,
                        custscript_bienes_header_relacionar: archivo_header,
                        custscript_bienes_relacionar: archivo_rows,
                        custscript_subsidiaria_relacionar: subsidiaria,
                        custscript_usuario_creacion_relacion: usuario
                    }
                });

                const taskId = mrTask.submit();
                log.audit('SCHEDULED SCRIPT lanzado', `Deployment: ${deployments[i]} | Task ID: ${taskId}`);
                return {
                    success: true,
                    taskId: taskId,
                    deployment: deployments[i]
                };

            } catch (e) {
                if (e.name.includes('FAILED_TO_SUBMIT_JOB_REQUEST')) {
                    //log.debug(`Deployment ocupado: ${deployments[i]}`, e.message);
                    continue; // prueba el siguiente deployment
                } else {
                    log.error(`Error en deployment: ${deployments[i]}`, e);
                    throw e; // error inesperado
                }
            }
        }

        // Todos los deployments están ocupados
        return {
            success: false,
            message: 'El sistema ya está procesando otras tareas.\nPor favor, espera un momento y vuelve a intentarlo.'
        };
    }


    return { post: _post };

});