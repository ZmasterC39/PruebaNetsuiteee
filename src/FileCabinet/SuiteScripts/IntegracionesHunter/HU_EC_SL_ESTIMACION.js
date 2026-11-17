/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 28/05/2026 - Last modified: 14/04/2026
 * @description
 *
 * @version 1.1
 * @notes
 *
*/
define(['N/runtime', 'N/log', 'N/ui/serverWidget', 'N/query', 'N/record', 'N/email', 'N/redirect', 'N/https',
    'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js',
], function (runtime, log, serverWidget, query, record, email, redirect, https, _toolkit) {

    function onRequest(context) {

        try {
            const { request } = context;
            const id_transaction_encriptado = request.parameters.tran || request.parameters['custpage_estimacion'];


            const id_transaction = getPostEncrypt(id_transaction_encriptado)

            const estimacion = _get_estimacion('estimate', id_transaction);

            const form = serverWidget.createForm({ title: ' '});

            if ( request.method == 'GET' ) {
                switch (estimacion.estado) {
                    case 10: _uiMain(estimacion, form, id_transaction_encriptado ); break; // Sin respuesta del usuario
                    case 12: _clienteAcepto(estimacion, form); break; // Cliente acepto
                    case 8: _clienteRechazo(estimacion, form); break; // Cliente rechazo
                }
            }else if (request.method === 'POST') {
                let accion =  request.parameters['custpage_accion'];
                const motivo = request.parameters['custpage_motivo_rechazo']
                            .replace(/_/g, ' ')
                            .toUpperCase() || ''
                const transaccion = record.load({ type: 'estimate', id: id_transaction });
                switch (accion) {
                    case 'accept':
                        transaccion.setValue({ fieldId: 'entitystatus', value: 12 }); // Compra
                        //transaction.setValue({ fieldId: 'probability', value: 100 });
                        transaccion.save({ enableSourcing: false, ignoreMandatoryFields: false });

                        _enviarCorreoCliente(estimacion, estimacion.correo_enviado_ultima_vez, 'accept', motivo);
                        _enviarCorreoEjecutiva(estimacion, 'accept', estimacion.ejecutiva_id, motivo);
                        _generarSeguimiento(estimacion, `Estimación: ${estimacion.numero_documento}, aceptada por ${estimacion.clienteLimpio }.`, );

                    break;

                    case 'reject':
                        transaccion.setValue({ fieldId: 'entitystatus', value: 8 }); // En discución (alinear con el GET)
                        //transaction.setValue({ fieldId: 'probability', value: 0 });
                        transaccion.save({ enableSourcing: false, ignoreMandatoryFields: false });

                        _enviarCorreoCliente(estimacion, estimacion.correo_enviado_ultima_vez, 'reject', motivo);
                        _enviarCorreoEjecutiva(estimacion, 'reject', estimacion.ejecutiva_id, motivo);
                        _generarSeguimiento(estimacion,`Estimación: ${estimacion.numero_documento}, rechazado por cliente ${estimacion.clienteLimpio }\nMotivo:${motivo}` );

                    break;
                }

                redirect.toSuitelet({
                    scriptId: 'customscript_hu_ec_sl_estimacion',
                    deploymentId: 'customdeploy_hu_ec_sl_estimacion',
                    isExternal: true,
                    parameters: { tran: id_transaction_encriptado},
                });
            }
            context.response.writePage(form);

        } catch (error) {
            log.error("ERROR onRequest", error.stack);
        }
    }

    function getPostEncrypt( id_transaction ) {
        let dataToSend = { data: [id_transaction + ""] };

        try {
            let response = https.post({
                url:"https://www.hunteronline.com.ec:2023/ApiNetsuite/DecodificarString",
                body: JSON.stringify(dataToSend),
                headers: { "Content-Type": "application/json" },
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

    function _get_estimacion(recordType, recordId) {
        try {
            const estimacion                = record.load({ type: recordType, id: recordId });
            const numero_documento          = estimacion.getValue({ fieldId: 'tranid' });
            const cliente_id                = estimacion.getValue({ fieldId: 'entity' });
            const cliente                   = estimacion.getText({ fieldId: 'entity' });
            const correo_jefa               = estimacion.getValue({ fieldId: 'custbody_correo_jefatura' }) ? estimacion.getText({ fieldId: 'custbody_correo_jefatura' }) : false;
            const clienteLimpio             = cliente.replace(/^C-EC-\d+\s+/, '');
            const ejecutiva_id              = estimacion.getValue({ fieldId: 'salesrep' }) || '';
            const ejecutiva                 = estimacion.getText({ fieldId: 'salesrep' }) || '';
            const ejecutivaLimpio           = ejecutiva.replace(/^[A-Z]+-\d+\s+/, '');
            const estado                    = Number(estimacion.getValue({ fieldId: 'entitystatus' }));
            const probabilidad              = estimacion.getValue({ fieldId: 'probability' });
            const representante_ventas_id   = estimacion.getValue({ fieldId: 'salesrep' });
            const nota                      = estimacion.getText({ fieldId: 'memo' });
            const fechaEmision              = estimacion.getText({ fieldId: 'trandate' });
            const fechaVencimiento          = estimacion.getText({ fieldId: 'duedate' });
            const subtotal                  = estimacion.getText({ fieldId: 'subtotal' });
            const impuesto                  = estimacion.getText({ fieldId: 'taxtotal' });
            const total                     = estimacion.getText({ fieldId: 'total' });
            const correo_enviado_ultima_vez                 = estimacion.getValue({ fieldId: 'custbody_correo_ultima_vez_enviado' })
            const simbolo_moneda            = estimacion.getText({ fieldId: 'currencysymbol' })


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

            const estimacionObjeto = {
                recordType,
                recordId,
                numero_documento,
                cliente_id,
                cliente,
                clienteLimpio,
                ejecutiva_id,
                ejecutiva,
                ejecutivaLimpio,
                nota,
                fechaEmision,
                fechaVencimiento,
                estado,
                subtotal,
                impuesto,
                total,
                correo_enviado_ultima_vez,
                lineas,
                simbolo_moneda,
            };

            return estimacionObjeto;

        } catch (error) {
            log.error('ERROR _get_estimacion', error);
            return null;
        }
    }

    function _generarSeguimiento(estimacion, motivo) {
        try {
            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* CREAR SEGUIMIENTO + adjuntar archivos *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            const seguimiento = record.create({ type: 'customrecord_ht_record_seguicliente', isDynamic: true });
            seguimiento.setValue({ fieldId: 'customform',                         value: 278 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_empleado',          value: estimacion.ejecutiva_id });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tipocliente',       value: 1 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_estado',            value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tiposeguimiento',   value: 7 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cliente',           value: estimacion.cliente_id });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_modocontacto',      value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_resultadogestion',  value: 19 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cmotivo',           value: 134 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_seguimiento',       value: motivo});
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_proximocontacto',   value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 });

            const seguimientoId = seguimiento.save();
        } catch (error) {
            log.error("ERROR _generarSeguimiento", error);
        }
    }

    function _enviarCorreoEjecutiva(transaction, accion,representante_ventas_id, motivo  ) {
        try {

            let empleado = record.load({ type: record.Type.EMPLOYEE, id: representante_ventas_id });
            correo = empleado.getValue({ fieldId: 'email' });
            if (!correo) {
                log.audit('_enviarCorreoCliente', 'Cliente sin correo. No se notifica. Estimaci\u00f3n ' + numEstimacion);
                return;
            }

            // salesrep puede ser el ID interno de un empleado o, por defecto, un correo
            let destinatario = correo;
            let asunto;
            if ( accion == 'accept') {
                asunto = `🟢 Cotización Aceptada ${transaction.numero_documento} ${transaction.clienteLimpio}`
            }else{
                asunto = `🔴 Cotización Rechazada ${transaction.numero_documento} ${transaction.clienteLimpio}`
            }

            let cuerpo_mensaje = _cuerpoCorreoEjecutiva(transaction, accion, motivo);

            const bcc = ['mramos@carsegsa.com'];
            if (transaction.correo_jefa) {
                bcc.push(transaction.correo_jefa);
            }

            log.debug(bcc)
            email.send({
                author:     449,
                recipients: destinatario,
                subject:    asunto,
                bcc:        bcc,
                body:       cuerpo_mensaje,
                relatedRecords: { transactionId: transaction.recordId }
            });
        } catch (error) {
            log.error("ERROR _enviarCorreoEjecutiva", error);
        }
    }

    function _cuerpoCorreoEjecutiva(estimacion, accion, motivoTexto) {
        try {
            let aceptado    = (accion === 'accept');
            let accent      = aceptado ? '#1e8e3e' : '#e00031';
            let accentSoft  = aceptado ? '#e9f6ec' : '#fff5f5';
            let fechaAccion = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
            let urlNetsuite = `https://7451241.app.netsuite.com/app/accounting/transactions/transaction.nl?id=${estimacion.recordId}`;

            let titulo    = aceptado ? '¡El cliente aceptó la propuesta!' : 'El cliente rechazó la propuesta';
            let iconoSvg  = aceptado ? '✅' : '❌';
            let subtitulo = aceptado
                ? 'Se ha registrado correctamente la aceptación de la cotización. Te notificamos para que puedas continuar con el proceso.'
                : 'Se ha registrado correctamente el rechazo de la cotización. Te notificamos para que puedas hacer seguimiento.';

            let resumenExtra = aceptado
                ? ''
                : `<tr>
                    <td style="padding:10px 16px; font-size:13px; color:#999; border-bottom:1px solid #f0f0f0; width:40%;">Motivo del rechazo</td>
                    <td style="padding:10px 16px; font-size:13px; font-weight:700; border-bottom:1px solid #f0f0f0; background:#fff5f5; color:#e00031;">${motivoTexto || 'No especificado'}</td>
                </tr>`;

            return `
            <div style="border-radius:8px; border:1px solid #e0e0e0; overflow:hidden; font-family:Arial,sans-serif; max-width:620px; margin:0 auto; color:#575759;">

                <table style="width:100%; background-color:#e00031;">
                    <tr>
                        <td style="color:#ffffff; font-size:20px; font-weight:bold; padding:16px 20px;">Propuesta Económica</td>
                        <td style="color:#ffffff; font-size:14px; text-align:right; padding:16px 20px;"># ${estimacion.numero_documento}</td>
                    </tr>
                </table>

                <div style="padding:24px 20px;">

                    <div style="text-align:center; margin-bottom:20px;">
                        <p style="font-size:40px; margin:0 0 8px;">${iconoSvg}</p>
                        <p style="font-size:18px; font-weight:700; color:${accent}; margin:0 0 6px;">${titulo}</p>
                        <p style="font-size:13px; color:#888; margin:0;">${subtitulo}</p>
                    </div>

                    <div style="border:1px solid #f0f0f0; border-radius:8px; overflow:hidden; margin-bottom:24px;">
                        <div style="background:#fafafa; padding:10px 16px; font-size:11px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid #f0f0f0;">
                            Datos de la cotización
                        </div>
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="padding:10px 16px; font-size:13px; color:#999; border-bottom:1px solid #f0f0f0; width:40%;">Cliente</td>
                                <td style="padding:10px 16px; font-size:13px; font-weight:700; border-bottom:1px solid #f0f0f0;">${estimacion.clienteLimpio}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px 16px; font-size:13px; color:#999; border-bottom:1px solid #f0f0f0;">Cotización</td>
                                <td style="padding:10px 16px; font-size:13px; font-weight:700; border-bottom:1px solid #f0f0f0;">${estimacion.numero_documento}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px 16px; font-size:13px; color:#999; border-bottom:1px solid #f0f0f0;">Fecha de ${aceptado ? 'aceptación' : 'rechazo'}</td>
                                <td style="padding:10px 16px; font-size:13px; font-weight:700; border-bottom:1px solid #f0f0f0;">${fechaAccion}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px 16px; font-size:13px; color:#999; border-bottom:1px solid #f0f0f0;">Valor</td>
                                <td style="padding:10px 16px; font-size:13px; font-weight:700; border-bottom:1px solid #f0f0f0;">${estimacion.simbolo_moneda || 'USD'} ${estimacion.total}</td>
                            </tr>
                            ${resumenExtra}
                        </table>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                        <a href="${urlNetsuite}" target="_blank"
                            style="display:inline-block; padding:12px 28px; background-color:${accent}; color:#ffffff; font-size:14px; font-weight:bold; text-decoration:none; border-radius:6px;">
                            Ver cotización en NetSuite
                        </a>
                    </div>

                </div>

                <div style="background-color:#575759; padding:14px 24px; text-align:center;">
                    <p style="margin:0; font-size:11px; color:#cccccc;">Este correo fue generado automáticamente.</p>
                </div>

            </div>`;

        } catch (error) {
            log.error('ERROR _cuerpoCorreoEjecutiva', error);
            return '';
        }
    }

    function _cuerpoCorreoCliente(estimacion, accion, motivoTexto) {
        try {
            let aceptado   = (accion === 'accept');
            let accent     = aceptado ? '#1e8e3e' : '#e00031';
            let accentSoft = aceptado ? '#e9f6ec' : '#fff5f5';
            let iconoSvg  = aceptado ? '✅' : '❌';
            let titulo = aceptado ? '¡Propuesta Aceptada!' : 'Propuesta Rechazada';
            let fechaAccion = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });

            let empleado = record.load({ type: 'employee', id: estimacion.ejecutiva_id });
            let correo   = empleado.getValue({ fieldId: 'email' }) || '-';
            let telefono = empleado.getValue({ fieldId: 'phone' }) || '-';

            // ── CUERPO según acción ──
            let mensajePrincipal = aceptado
                ? `<p style="margin:0 0 10px;">Nos complace confirmar que hemos recibido correctamente la aceptación de su cotización. Agradecemos la confianza depositada y la oportunidad de acompañarlo en este proyecto.</p>`
                : `<p style="margin:0 0 10px;">Le confirmamos que hemos registrado correctamente el rechazo de la Cotización <b>${estimacion.numero_documento}</b>.</p>`;

            let mensajeCierre = aceptado
                ? `<p style="margin:0 0 10px;">Adjunto a este correo encontrará una copia de la cotización aceptada para su referencia.</p>
                <p style="margin:0 0 10px;">Nuestro equipo comercial iniciará el proceso correspondiente para continuar con la contratación y demás actividades necesarias.</p>
                <p style="margin:0 0 30px;">Agradecemos nuevamente su preferencia.</p>`
                : `<p style="margin:0 0 10px;">Agradecemos el tiempo dedicado a evaluar nuestra propuesta comercial.</p>
                <p style="margin:0 0 10px;">Su opinión es muy importante para nosotros y nos ayudará a mejorar continuamente nuestros productos y servicios.</p>
                <p style="margin:0 0 10px;">Si desea revisar nuevamente esta propuesta, realizar ajustes o recibir una nueva cotización, estaremos gustosos de atenderle.</p>
                <p style="margin:0 0 30px;">Esperamos tener la oportunidad de servirle en una próxima ocasión.</p>`;

            // ── RESUMEN: el ítem que cambia según acción ──
            let resumenExtra = aceptado
                ? `<li><b>Monto total:</b> ${estimacion.simbolo_moneda || 'USD'} ${estimacion.total}</li>`
                : `<li><b>Motivo:</b> ${motivoTexto || ''}</li>`;

            return `
            <style>
                .cot-status-icon {
                    width:72px; height:72px; border-radius:50%;
                    display:flex; align-items:center; justify-content:center;
                    margin:0 auto 18px; background:${accentSoft}; color:${accent};
                }
                .cot-status-title { font-size:20px; font-weight:700; color:${accent}; margin-bottom:10px; letter-spacing:-.01em; }
            </style>

            <div style="border-radius:8px; border:1px solid #9999995b; overflow:hidden; font-family:Arial,sans-serif; max-width:620px; margin:0 auto; color:#575759;">

                <table style="width:100%; background-color:#e00031; padding:20px 24px;">
                    <tr>
                        <td style="color:#ffffff; font-size:20px; font-weight:bold; padding:16px 20px;">Propuesta Económica</td>
                        <td style="color:#ffffff; font-size:14px; text-align:right; padding:16px 20px;"># ${estimacion.numero_documento}</td>
                    </tr>
                </table>

                <div style="padding:20px;">

                    <p style="margin:0 0 10px;">Estimado(a) <b>${estimacion.clienteLimpio}</b>,</p>
                    <p style="margin:0 0 16px;">Reciba un cordial saludo.</p>

                    ${mensajePrincipal}

                    <p style="margin:14px 0 6px; font-weight:700; color:#333;">Resumen de la Cotización</p>
                    <ul style="margin:0 0 16px; padding-left:20px; line-height:1.8;">
                        <li><b>Número de Cotización:</b> ${estimacion.numero_documento}</li>
                        <li><b>Fecha de emisión:</b> ${estimacion.fechaEmision}</li>
                        <li><b>Fecha de ${aceptado ? 'aceptación' : 'rechazo'}:</b> ${fechaAccion}</li>
                        <li><b>Cliente:</b> ${estimacion.clienteLimpio}</li>
                        ${resumenExtra}
                    </ul>

                    <div>
                        <p style="font-size:50px">${iconoSvg}</p>
                        <div class="cot-status-title">${titulo}</div>
                    </div>

                    ${mensajeCierre}

                    <table style="width:100%; border-collapse:collapse; margin-top:16px;">
                        <tr>
                            <td style="vertical-align:middle; padding-right:24px;">
                                <table style="border-collapse:collapse;">
                                    <tr>
                                        <td style="vertical-align:middle;">
                                            <div style="font-size:11px; color:#999; font-weight:600;">Ejecutiva comercial</div>
                                            <div style="font-size:13px; color:#333; font-weight:700;">${estimacion.ejecutivaLimpio}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td style="vertical-align:middle; padding-right:24px;">
                                <table style="border-collapse:collapse;">
                                    <tr>
                                        <td style="vertical-align:middle;">
                                            <div style="font-size:11px; color:#999; font-weight:600;">Correo</div>
                                            <div style="font-size:13px; color:#333; font-weight:700;">${correo}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td style="vertical-align:middle;">
                                <table style="border-collapse:collapse;">
                                    <tr>
                                        <td style="vertical-align:middle;">
                                            <div style="font-size:11px; color:#999; font-weight:600;">Teléfono</div>
                                            <div style="font-size:13px; color:#333; font-weight:700;">${telefono}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                </div>

                <div style="background-color:#575759; padding:14px 24px; text-align:center;">
                    <p style="margin:0; font-size:11px; color:#cccccc;">Este es un correo generado automáticamente. Para mayor detalle contacte a su ejecutivo de ventas.</p>
                </div>

            </div>`;

        } catch (error) {
            log.error('ERROR _cuerpoCorreoCliente', error);
            return '';
        }
    }

    function _enviarCorreoCliente(transaction, correo_enviado_ultima_vez, accion, motivo) {
        try {
            let correo        = correo_enviado_ultima_vez;

            // Fallback: si la transacción no trae correo, lo tomamos del cliente
            if (!correo) {
                let clienteId = transaction.getValue({ fieldId: 'entity' });
                if (clienteId) {
                    let cust = record.load({ type: record.Type.CUSTOMER, id: clienteId });
                    correo = cust.getValue({ fieldId: 'email' });
                }
            }
            if (!correo) {
                log.audit('_enviarCorreoCliente', 'Cliente sin correo. No se notifica. Estimaci\u00f3n ' + transaction.numero_documento);
                return;
            }

            let cuerpo_mensaje = _cuerpoCorreoCliente(transaction, accion, motivo );

            email.send({
                author:     449,
                recipients: correo,
                subject: transaction.numero_documento + ' ' + transaction.clienteLimpio,
                body:       cuerpo_mensaje,
                relatedRecords: { transactionId: transaction.recordId }
            });
        } catch (error) {
            log.error("ERROR _enviarCorreoCliente", error);
        }
    }

    function _clienteAcepto(transaction, form) {
        try {
            let info = form.addField({
                id: 'custpage_estado_info',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Estado'
            });
            info.defaultValue = _statusCardHTML(transaction, 'accept');
        } catch (error) {
            log.error("ERROR _clienteAcepto", error);
        }
    }

    function _clienteRechazo(transaction, form) {
        try {
            let info = form.addField({
                id: 'custpage_estado_info',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Estado'
            });
            info.defaultValue = _statusCardHTML(transaction, 'reject');
        } catch (error) {
            log.error("ERROR _clienteRechazo", error);
        }
    }

    function _statusCardHTML(estimacion, tipo) {
        let aceptado   = (tipo === 'accept');
        let accent     = aceptado ? '#1e8e3e' : '#e00031';
        let accentSoft = aceptado ? '#e9f6ec' : '#fff5f5';
        let iconoSvg   = aceptado
            ? '<polyline points="20 6 9 17 4 12"/>'
            : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
        let titulo  = aceptado ? '\u00a1Propuesta Aceptada!' : 'Propuesta Rechazada';
        let mensaje = aceptado
            ? 'Usted ya acept\u00f3 la estimaci\u00f3n <b>' + estimacion.numero_documento + '</b>. No se requiere ninguna acci\u00f3n adicional; nuestra ejecutiva de ventas se pondr\u00e1 en contacto para continuar con el proceso.'
            : 'Usted ha rechazado la estimaci\u00f3n <b>' + estimacion.numero_documento + '</b>. Si desea generar una nueva propuesta, por favor p\u00f3ngase en contacto con su ejecutiva de ventas.';

        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
            .cot-wrap, .cot-wrap * { margin:0; padding:0; box-sizing:border-box; }
            .cot-wrap {
                font-family:'DM Sans','Segoe UI',sans-serif;
                max-width:820px; margin:24px auto; color:#575759;
                -webkit-font-smoothing:antialiased;
            }
            .cot-card {
                background:#fff; border-radius:12px; overflow:hidden;
                box-shadow:0 1px 4px rgba(0,0,0,.06),0 8px 28px rgba(0,0,0,.05);
            }
            .cot-header {
                background-color:#e00031; padding:24px 28px; color:#fff;
                position:relative; overflow:hidden;
            }
            .cot-header::after {
                content:''; position:absolute; top:-50px; right:-50px;
                width:180px; height:180px; border-radius:50%;
                background:rgba(255,255,255,.08); pointer-events:none;
            }
            .cot-header-top { display:flex; justify-content:space-between; align-items:flex-start; }
            .cot-header-title { font-size:22px; font-weight:700; letter-spacing:-.02em; }
            .cot-header-num {
                background:rgba(255,255,255,.18); backdrop-filter:blur(4px);
                padding:5px 12px; border-radius:8px;
                font-size:12px; font-weight:600; letter-spacing:.04em;
            }
            .cot-header-sub { font-size:13px; opacity:.8; margin-top:6px; }
            .cot-info-bar {
                display:flex; flex-wrap:wrap; gap:0;
                background:#fff5f5; border-bottom:1px solid #fce4ec;
            }
            .cot-info-item { flex:1 1 50%; padding:14px 28px; border-bottom:1px solid #fce4ec; }
            .cot-info-label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#999; font-weight:600; margin-bottom:2px; }
            .cot-info-value { font-size:14px; font-weight:600; color:#333; }
            .cot-status { padding:40px 28px; text-align:center; }
            .cot-status-icon {
                width:72px; height:72px; border-radius:50%;
                display:flex; align-items:center; justify-content:center;
                margin:0 auto 18px; background:${accentSoft}; color:${accent};
            }
            .cot-status-title { font-size:20px; font-weight:700; color:${accent}; margin-bottom:10px; letter-spacing:-.01em; }
            .cot-status-msg { font-size:14px; line-height:1.65; color:#575759; max-width:560px; margin:0 auto; }
            .cot-footer-bar {
                background:#575759; padding:14px 28px;
                border-radius:0 0 12px 12px; text-align:center; font-size:11px; color:#ccc;
            }
            .cot-footer-text { text-align:center; font-size:13px; color:#bdbdbd; margin-top:16px; }
            @media(max-width:600px){
                .cot-wrap { margin:12px 8px; }
                .cot-info-item { flex:1 1 100%; }
            }
        </style>

        <div class="cot-wrap">
            <div class="cot-card">
                <div class="cot-header">
                    <div class="cot-header-top">
                        <div>
                            <div class="cot-header-title">Propuesta Econ\u00f3mica</div>
                            <div class="cot-header-sub">` + estimacion.nota + `</div>
                        </div>
                        <div class="cot-header-num">` + estimacion.numero_documento + `</div>
                    </div>
                </div>

                <div class="cot-info-bar">
                    <div class="cot-info-item">
                        <div class="cot-info-label">Cliente</div>
                        <div class="cot-info-value">` + estimacion.clienteLimpio + `</div>
                    </div>
                    <div class="cot-info-item">
                        <div class="cot-info-label">Emisi\u00f3n</div>
                        <div class="cot-info-value">` + estimacion.fechaEmision + `</div>
                    </div>
                    <div class="cot-info-item">
                        <div class="cot-info-label">Vigencia</div>
                        <div class="cot-info-value">` + estimacion.fechaVencimiento + `</div>
                    </div>
                    <div class="cot-info-item">
                        <div class="cot-info-label">Ejecutiva</div>
                        <div class="cot-info-value">` + estimacion.ejecutivaLimpio + `</div>
                    </div>
                </div>

                <div class="cot-status">
                    <div class="cot-status-icon">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` + iconoSvg + `</svg>
                    </div>
                    <div class="cot-status-title">` + titulo + `</div>
                    <div class="cot-status-msg">` + mensaje + `</div>
                </div>

                <div class="cot-footer-bar">Este es un documento generado autom\u00e1ticamente. Para mayor detalle contacte a su ejecutivo de ventas.</div>
            </div>
            <div class="cot-footer-text">\u00bfTienes dudas? Comun\u00edcate con tu asesora comercial.</div>
        </div>`;
    }

    function _uiMain(estimacion, form, id_transaction_encriptado) {
        try {

            let accionField = form.addField({ id: 'custpage_accion', type: serverWidget.FieldType.TEXT, label: 'Accion' });
            accionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            let motivoField = form.addField({ id: 'custpage_motivo_rechazo', type: serverWidget.FieldType.TEXT, label: 'Motivo Rechazo' });
            motivoField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // Tu campo de estimación (ya lo tienes)
            let estimacionField = form.addField({ id: 'custpage_estimacion', type: serverWidget.FieldType.TEXT, label: 'Estimacion' });
            estimacionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
            estimacionField.defaultValue = id_transaction_encriptado;

            let seleccionados = form.addField({ id: 'custpage_informacion', type: serverWidget.FieldType.INLINEHTML, label: 'Seleccionados' });

            // ═══ LÍNEAS DE ARTÍCULOS ═══
            let itemsHTML = '';
            estimacion.lineas.forEach((element, i) => {
                let bgRow = (i % 2 === 0) ? '#ffffff' : '#f9f9f9';
                itemsHTML += ''
                    + '<tr style="background-color:' + bgRow + ';">'
                    + '  <td style="padding:12px 16px; font-size:13px; color:#575759; border-bottom:1px solid #f0f0f0;">' + element.descripcion + '</td>'
                    + '  <td style="padding:12px 16px; font-size:13px; color:#575759; text-align:right; border-bottom:1px solid #f0f0f0;">' + element.cantidad + '</td>'
                    + '  <td style="padding:12px 16px; font-size:13px; color:#575759; text-align:right; border-bottom:1px solid #f0f0f0;">$' + element.precio + '</td>'
                    + '  <td style="padding:12px 16px; font-size:13px; color:#575759; text-align:right; border-bottom:1px solid #f0f0f0; font-weight:700;">$' + element.monto + '</td>'
                    + '</tr>';
            });

            seleccionados.defaultValue = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
                .cot-wrap, .cot-wrap * { margin:0; padding:0; box-sizing:border-box; }
                .cot-wrap {
                    font-family:'DM Sans','Segoe UI',sans-serif;
                    max-width:820px; margin:24px auto; color:#575759;
                    -webkit-font-smoothing:antialiased;
                }
                .cot-card {
                    background:#fff; border-radius:12px; overflow:hidden;
                    box-shadow:0 1px 4px rgba(0,0,0,.06),0 8px 28px rgba(0,0,0,.05);
                }
                .cot-header {
                    background-color:#e00031; padding:24px 28px; color:#fff;
                    position:relative; overflow:hidden;
                }
                .cot-header::after {
                    content:''; position:absolute; top:-50px; right:-50px;
                    width:180px; height:180px; border-radius:50%;
                    background:rgba(255,255,255,.08); pointer-events:none;
                }
                .cot-header-top { display:flex; justify-content:space-between; align-items:flex-start; }
                .cot-header-title { font-size:22px; font-weight:700; letter-spacing:-.02em; }
                .cot-header-num {
                    background:rgba(255,255,255,.18); backdrop-filter:blur(4px);
                    padding:5px 12px; border-radius:8px;
                    font-size:12px; font-weight:600; letter-spacing:.04em;
                }
                .cot-header-sub { font-size:13px; opacity:.8; margin-top:6px; }
                .cot-info-bar {
                    display:flex; flex-wrap:wrap; gap:0;
                    background:#fff5f5; border-bottom:1px solid #fce4ec;
                }
                .cot-info-item { flex:1 1 50%; padding:14px 28px; border-bottom:1px solid #fce4ec; }
                .cot-info-label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#999; font-weight:600; margin-bottom:2px; }
                .cot-info-value { font-size:14px; font-weight:600; color:#333; }
                .cot-section { padding:20px 28px; }
                .cot-section-title {
                    display:flex; align-items:center; gap:8px;
                    font-size:12px; font-weight:700; color:#575759;
                    text-transform:uppercase; letter-spacing:.07em; margin-bottom:12px;
                }
                .cot-section-title svg { color:#e00031; }
                .cot-vehicles { display:flex; flex-direction:column; gap:8px; }
                .cot-vehicle {
                    display:flex; align-items:center; gap:14px;
                    padding:12px 16px; border-radius:10px;
                    border:1px solid #f0f0f0; background:#fafafa;
                }
                .cot-plate {
                    font-size:12px; font-weight:700; color:#e00031;
                    background:#fff5f5; padding:6px 10px; border-radius:8px;
                    letter-spacing:.04em; white-space:nowrap;
                }
                .cot-table { width:100%; border-collapse:collapse; }
                .cot-table thead tr { background:#575759; }
                .cot-table th {
                    padding:12px 16px; color:#fff; font-size:11px;
                    text-transform:uppercase; letter-spacing:.06em; font-weight:700; text-align:left;
                }
                .cot-table th:nth-child(2), .cot-table th:nth-child(3), .cot-table th:nth-child(4) { text-align:right; }
                .cot-totals { padding:16px 28px; background:#fff; display:flex; justify-content:flex-end; }
                .cot-totals table { width:50%; border-collapse:collapse; }
                .cot-total-label {
                    padding:6px 16px; text-align:right;
                    color: #e00031; font-size:12px;
                    font-weight:600; text-transform:uppercase; letter-spacing:.04em;
                }
                .cot-total-value {
                    padding:6px 16px; text-align:right;
                    background:#fff5f5; font-weight:700; font-size:14px; color:#333; width:120px;
                }
                .cot-total-grand .cot-total-label { font-size:13px; }
                .cot-total-grand .cot-total-value { font-size:18px; color:#e00031; }
                .cot-divider { height:1px; background:#f0f0f0; margin:0 28px; }
                .cot-actions { display:flex; gap:12px; padding:20px 28px 24px; justify-content:flex-end; }
                .cot-btn {
                    display:inline-flex; align-items:center; gap:8px;
                    padding:12px 24px; border-radius:10px;
                    font-size:14px; font-weight:600; cursor:pointer;
                    font-family:'DM Sans','Segoe UI',sans-serif;
                    border:none; outline:none; transition:all .2s ease;
                }
                .cot-btn-reject { border:1.5px solid #e0e0e0; background:transparent; color:#757575; }
                .cot-btn-reject:hover { background:#fff5f5; border-color:#e00031; color:#e00031; }
                .cot-btn-accept {
                    background:#e00031; color:#fff; font-weight:700;
                    padding:12px 28px; box-shadow:0 3px 10px rgba(224,0,49,.28);
                }
                .cot-btn-accept:hover { background:#b8002a; transform:translateY(-1px); }
                .cot-btn:disabled { opacity:.45; cursor:not-allowed; pointer-events:none; }
                .cot-footer-bar {
                    background:#575759; padding:14px 28px;
                    border-radius:0 0 12px 12px; text-align:center; font-size:11px; color:#ccc;
                }
                .cot-footer-text { text-align:center; font-size:13px; color:#bdbdbd; margin-top:16px; }
                .cot-overlay {
                    position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(4px);
                    display:none; align-items:center; justify-content:center; z-index:99999; padding:16px;
                }
                .cot-overlay.is-open { display:flex; }
                .cot-modal {
                    background:#fff; width:100%; max-width:520px; max-height:90vh;
                    border-radius:16px; overflow:hidden; display:flex; flex-direction:column;
                    box-shadow:0 20px 60px rgba(0,0,0,.18); animation:cotUp .25s ease-out;
                }
                @keyframes cotUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                .cot-modal-header { color:#fff; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; }
                .cot-modal-header h2 { margin:0; font-size:17px; font-weight:700; }
                .cot-modal-close { background:none; border:none; color:rgba(255,255,255,.8); font-size:26px; line-height:1; cursor:pointer; padding:0 4px; }
                .cot-modal-close:hover { color:#fff; }
                .cot-modal-body { padding:20px 22px 5px 22px; overflow-y:auto; flex:1 1 auto; font-size:14px; line-height:1.65; color:#555; }
                .cot-modal-footer { padding:1px 22px; display:flex; flex-direction:column; gap:1px; align-items: center; }
                .cot-check { display:flex; align-items:center; gap:10px; font-size:14px; color:#424242; cursor:pointer; user-select:none; }
                .cot-check input[type="checkbox"] { width:18px; height:18px; accent-color:#e00031; cursor:pointer; }
                .cot-modal-actions { display:flex; justify-content:flex-end; padding: 0px 20px 10px 0px; gap: 5px;}
                .cot-reasons { display:flex; flex-direction:column; gap:6px; }
                .cot-reason {
                    display:flex; align-items:center; gap:12px;
                    padding:12px 16px; border-radius:10px;
                    border:1.5px solid #f0f0f0; background:#fafafa;
                    cursor:pointer; transition:all .2s; font-size:14px; color:#424242; user-select:none;
                }
                .cot-reason:hover { border-color:#e0e0e0; background:#f5f5f5; }
                .cot-reason.selected { border-color:#e00031; background:#fff5f5; color:#e00031; }
                .cot-reason input[type="radio"] { width:18px; height:18px; accent-color:#e00031; cursor:pointer; }
                .cot-reason-text { flex:1; font-weight:500; }
                .cot-reason-icon { font-size:18px; }
                .cot-spinner { width:40px; height:40px; border:3px solid #f0f0f0; border-top-color:#e00031; border-radius:50%; animation:cotSpin .8s linear infinite; }
                @keyframes cotSpin { to{transform:rotate(360deg)} }
                @media(max-width:600px){
                    .cot-wrap { margin:12px 8px; }
                    .cot-info-item { flex:1 1 100%; }
                    .cot-actions { flex-direction:column-reverse; }
                    .cot-btn { width:100%; justify-content:center; }
                    .cot-modal-actions { flex-direction:column-reverse; }
                    .cot-modal-actions .cot-btn { width:100%; justify-content:center; }
                }

                .cot-modal-terms { max-width: 695px; }
                .cot-modal-intro { color: #575759; font-size: 14px; margin-bottom: 18px; }
                .cot-terms-grid {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
                }
                .cot-terms-box {
                    border: 1px solid #e8e8e8; border-radius: 10px;
                    background: #e9e4e42d; padding: 16px 18px;
                }
                .cot-terms-box-title {
                    font-size: 14px; font-weight: 700; color: #212121;
                    letter-spacing: .06em; margin-bottom: 12px;
                }
                .cot-terms-box p { font-size: 12.5px; color: #575759; line-height: 1.55; }
                .cot-terms-sub { margin-bottom: 12px; }
                .cot-terms-sub:last-child { margin-bottom: 0; }
                .cot-terms-sub-title { font-size: 12.5px; font-weight: 700; margin-bottom: 4px; }
                .cot-check span { line-height: 1.5; }
                .cot-btn-full { width: 100%; justify-content: center; }
                .cot-modal-actions-stack { flex-direction: column; gap: 10px; }
                .cot-terms-link {
                    font-size: 12px; color: #999; margin-top: 2px;
                    display: flex; align-items: flex-start; gap: 5px;
                    text-align: left;
                }
                .cot-terms-link svg {
                    flex-shrink: 0;
                    display: block;
                    margin-top: 2px; /* ajusta el ícono al centro óptico de la primera línea de texto */
                }
                .cot-terms-link span {
                    line-height: 18px; /* mismo alto que usamos para calcular el margin-top del svg */
                }
                .cot-terms-link a { color: #255599; text-decoration: none; }
                .cot-terms-link a:hover { text-decoration: underline; }

                .text-margin { margin: 0px !important ;}
            </style>

            <div class="cot-wrap" id="cotWrap">
                <div class="cot-card" id="cotCard">

                    <div class="cot-header">
                        <div class="cot-header-top">
                            <div>
                                <div class="cot-header-title">Propuesta Económica</div>
                                <div class="cot-header-sub">` + estimacion.nota + `</div>
                            </div>
                            <div class="cot-header-num">` + estimacion.numero_documento + `</div>
                        </div>
                    </div>

                    <div class="cot-info-bar">
                        <div class="cot-info-item">
                            <div class="cot-info-label">Cliente</div>
                            <div class="cot-info-value">` + estimacion.clienteLimpio + `</div>
                        </div>
                        <div class="cot-info-item">
                            <div class="cot-info-label">Emisión</div>
                            <div class="cot-info-value">` + estimacion.fechaEmision + `</div>
                        </div>
                        <div class="cot-info-item">
                            <div class="cot-info-label">Vigencia</div>
                            <div class="cot-info-value">` + estimacion.fechaVencimiento + `</div>
                        </div>
                        <div class="cot-info-item">
                            <div class="cot-info-label">Ejecutiva</div>
                            <div class="cot-info-value">` + estimacion.ejecutivaLimpio + `</div>
                        </div>
                    </div>

                    <div style="padding:10px 0px 0px 28px;">
                        <div class="cot-section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            Detalle del Producto / Servicio
                        </div>
                    </div>
                    <div style="padding:0 28px 16px;">
                        <table class="cot-table" style="border-radius:10px; overflow:hidden;">
                            <thead>
                                <tr>
                                    <th>Producto / Servicio</th>
                                    <th>Cant.</th>
                                    <th>P. Unitario</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>` + itemsHTML + `</tbody>
                        </table>
                    </div>

                    <div class="cot-totals">
                        <table>
                            <tr>
                                <td></td>
                                <td class="cot-total-label">Sub Total</td>
                                <td class="cot-total-value">$` + estimacion.subtotal + `</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td class="cot-total-label">IVA</td>
                                <td class="cot-total-value">$` + estimacion.impuesto + `</td>
                            </tr>
                            <tr class="cot-total-grand">
                                <td></td>
                                <td class="cot-total-label">Total</td>
                                <td class="cot-total-value">$` + estimacion.total + `</td>
                            </tr>
                        </table>
                    </div>

                    <div class="cot-divider"></div>

                    <div class="cot-actions">
                        <button type="button" class="cot-btn cot-btn-reject" onclick="cotAbrirRechazo()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Rechazar
                        </button>
                        <button type="button" class="cot-btn cot-btn-accept" onclick="cotAbrirTerminos()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Aceptar Propuesta
                        </button>
                    </div>

                    <div class="cot-footer-bar">Este es un documento generado automáticamente. Para mayor detalle contacte a su ejecutivo de ventas.</div>
                </div>

                <div class="cot-footer-text">¿Tienes dudas? Comunícate con tu asesora comercial.</div>

                <div id="cotModalTerminos" class="cot-overlay" role="dialog" aria-modal="true" aria-hidden="true">
                    <div class="cot-modal cot-modal-terms" onclick="event.stopPropagation()">
                        <div class="cot-modal-header" style="background:#e00031;">
                            <h2>Términos y Protección de Datos Personales</h2>
                            <button type="button" class="cot-modal-close" onclick="cotCerrarModal('cotModalTerminos')">&times;</button>
                        </div>
                        <div class="cot-modal-body">
                            <p class="cot-modal-intro">Para continuar con su solicitud de cotización, es necesario que revise y acepte los Términos y Condiciones del servicio y el tratamiento de sus datos personales.</p>

                            <div class="cot-terms-grid">
                                <div class="cot-terms-box">
                                    <div class="cot-terms-box-title">Términos y Condiciones del Servicio</div>
                                    <p>Al aceptar esta estimación, usted confirma que ha revisado los bienes e ítems detallados y está de acuerdo con las condiciones del servicio.</p>
                                    <p>Le recomendamos leer cuidadosamente los términos y condiciones antes de continuar con su solicitud.</p>
                                </div>
                                <div class="cot-terms-box">
                                    <div class="cot-terms-box-title">Protección de Datos Personales</div>
                                    <div class="cot-terms-sub">
                                        <div class="cot-terms-sub-title">Finalidades del tratamiento</div>
                                        <p class="text-margin">Sus datos personales serán utilizados para gestionar cotizaciones, comunicaciones, asesorías, obligaciones legales, envío de información y otras finalidades relacionadas con la prestación del servicio.</p>
                                    </div>
                                    <div class="cot-terms-sub">
                                        <div class="cot-terms-sub-title">Seguridad de la información</div>
                                        <p class="text-margin">Aplicamos medidas técnicas, organizativas, administrativas y legales para proteger sus datos personales y garantizar su confidencialidad, integridad y disponibilidad, de conformidad con la LOPDP y la normativa aplicable.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="cot-modal-footer">
                            <label class="cot-check">
                                <input type="checkbox" id="cotAceptoCheck" onchange="cotToggleAceptar()">
                                <span><b>He leído, comprendido y acepto</b> los Términos y Condiciones, así como el tratamiento de mis datos personales conforme a la <b>Política de Privacidad vigente</b>.</span>
                            </label>
                            <p class="cot-terms-link">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3z"/></svg>
                                <span><a href="https://www.hunter.com.ec/documentos/HUNTER_Proteccion_Datos_Personales.pdf" target="_blank">Consulte la política de tratamiento de Datos Personales de Carro Seguro CARSEGSA S.A.</a></span>
                            </p>
                        </div>
                            <div class="cot-modal-actions">
                                <button type="button" class="cot-btn cot-btn-reject" onclick="cotCerrarModal('cotModalTerminos')">Cancelar</button>
                                <button type="button" class="cot-btn cot-btn-accept" id="cotConfirmarBtn" disabled onclick="cotSubmit('accept', '')">
                                    Continuar
                                </button>
                            </div>
                    </div>
                </div>

                <div id="cotModalRechazo" class="cot-overlay" role="dialog" aria-modal="true" aria-hidden="true">
                    <div class="cot-modal" onclick="event.stopPropagation()">
                        <div class="cot-modal-header" style="background:#575759;">
                            <h2>¿Por qué rechazas la propuesta?</h2>
                            <button type="button" class="cot-modal-close" onclick="cotCerrarModal('cotModalRechazo')">&times;</button>
                        </div>
                        <div class="cot-modal-body">
                            <p style="margin-bottom:18px;color:#888;font-size:13px;">Tu respuesta nos ayuda a mejorar. Selecciona el motivo principal:</p>
                            <div class="cot-reasons">
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="precio_alto" data-id="1">
                                    <span class="cot-reason-text">Precio elevado</span>
                                    <span class="cot-reason-icon">💰</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="mejor_oferta_de_la_competencia" data-id="2">
                                    <span class="cot-reason-text">Mejor oferta de la competencia</span>
                                    <span class="cot-reason-icon">📉</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="no_cumple_mis_necesidades" data-id="3">
                                    <span class="cot-reason-text">No cumple mis necesidades</span>
                                    <span class="cot-reason-icon">🚫</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="compre_con_otro_proveedor" data-id="4">
                                    <span class="cot-reason-text">Compré con otro proveedor</span>
                                    <span class="cot-reason-icon">🤝</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="forma_pago_no_conveniente" data-id="5">
                                    <span class="cot-reason-text">Forma de pago no conveniente</span>
                                    <span class="cot-reason-icon">💳</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="decision_pospuesta" data-id="6">
                                    <span class="cot-reason-text">Decisión pospuesta</span>
                                    <span class="cot-reason-icon">⏸️</span>
                                </label>
                                <label class="cot-reason" onclick="cotSelectReason(this)">
                                    <input type="radio" name="cot_motivo" value="informacion_insuficiente" data-id="7">
                                    <span class="cot-reason-text">Información insuficiente</span>
                                    <span class="cot-reason-icon">❓</span>
                                </label>
                                
                            </div>
                        </div>
                        <div class="cot-modal-footer">
                            <div class="cot-modal-actions">
                                <button type="button" class="cot-btn cot-btn-reject" onclick="cotCerrarModal('cotModalRechazo')">Volver</button>
                                <button type="button" class="cot-btn" id="cotRechazarBtn" disabled
                                    style="background:#e00031;color:#fff;font-weight:700;box-shadow:0 3px 10px rgba(224,0,49,.28);"
                                    onclick="cotSubmitRechazo()">
                                    Confirmar rechazo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="cotLoading" class="cot-overlay" style="z-index:100000;">
                    <div style="text-align:center;">
                        <div class="cot-spinner" style="margin:0 auto 16px;"></div>
                        <div style="color:#fff;font-size:14px;font-weight:500;">Procesando tu respuesta...</div>
                    </div>
                </div>

            </div>

            <script>
            (function() {
                window.cotAbrirTerminos = function() {
                    var chk = document.getElementById('cotAceptoCheck');
                    var btn = document.getElementById('cotConfirmarBtn');
                    if (chk) chk.checked = false;
                    if (btn) btn.disabled = true;
                    cotAbrirModal('cotModalTerminos');
                };
                window.cotAbrirRechazo = function() {
                    var reasons = document.querySelectorAll('.cot-reason');
                    for (var i = 0; i < reasons.length; i++) {
                        reasons[i].classList.remove('selected');
                        reasons[i].querySelector('input').checked = false;
                    }
                    document.getElementById('cotRechazarBtn').disabled = true;
                    cotAbrirModal('cotModalRechazo');
                };
                function cotAbrirModal(id) {
                    var m = document.getElementById(id);
                    m.classList.add('is-open');
                    m.setAttribute('aria-hidden','false');
                    document.body.style.overflow = 'hidden';
                }
                window.cotCerrarModal = function(id) {
                    var m = document.getElementById(id);
                    m.classList.remove('is-open');
                    m.setAttribute('aria-hidden','true');
                    document.body.style.overflow = '';
                };
                window.cotToggleAceptar = function() {
                    document.getElementById('cotConfirmarBtn').disabled = !document.getElementById('cotAceptoCheck').checked;
                };
                window.cotSelectReason = function(el) {
                    var all = document.querySelectorAll('.cot-reason');
                    for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
                    el.classList.add('selected');
                    el.querySelector('input').checked = true;
                    document.getElementById('cotRechazarBtn').disabled = false;
                };
                window.cotSubmitRechazo = function() {
                    var selected = document.querySelector('input[name="cot_motivo"]:checked');
                    cotSubmit('reject', selected ? selected.value : '');
                };
                window.cotSubmit = function(accion, motivo) {
                    cotCerrarModal('cotModalTerminos');
                    cotCerrarModal('cotModalRechazo');
                    document.getElementById('cotLoading').classList.add('is-open');
                    document.body.style.overflow = 'hidden';
                    var accionInput = document.getElementById('custpage_accion');
                    var motivoInput = document.getElementById('custpage_motivo_rechazo');
                    if (accionInput) accionInput.value = accion;
                    if (motivoInput) motivoInput.value = motivo;
                    var mainForm = document.getElementById('main_form') || document.forms[0];
                    if (mainForm) mainForm.submit();
                };
                document.addEventListener('keydown', function(e) {
                    if (e.key !== 'Escape') return;
                    ['cotModalTerminos','cotModalRechazo'].forEach(function(id) {
                        var m = document.getElementById(id);
                        if (m && m.classList.contains('is-open')) cotCerrarModal(id);
                    });
                });
                document.querySelectorAll('.cot-overlay').forEach(function(el) {
                    el.addEventListener('click', function(e) {
                        if (e.target === this && this.id !== 'cotLoading') cotCerrarModal(this.id);
                    });
                });
            })();
            </script>`;

        } catch (error) {
            log.error("ERROR _uiMain", error);
        }
    }

    return { onRequest };

});