        /**
         * @NApiVersion 2.1
         * @NScriptType Suitelet
         *
         * @author Mauro F Ramos
         * @date Created at: 15/11/2025 - Last modified:
         * @description
         *
         * @version 1.0
         * @notes - Ninguna -
         *
        */

        define(['N/runtime', 'N/log', 'N/ui/serverWidget', 'N/search', 'N/render', 'N/email', 'N/query','SuiteScripts/IntegracionesHunter/HU_EC_CERTIFICADOS_PLANTILLA.js'], function (runtime, log, serverWidget, search, render, email, query, _plantilla, ) {

            const LONGITUD_PAGINA = 50;

            function onRequest(context) {
                try {
                    let {role: userRol, subsidiary,email : userEmail} = runtime.getCurrentUser();
                    let orden_servicio_seleccionadas = new Array();
                    if( subsidiary !== 2){
                        form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                        context.response.writePage(form);
                        return;
                    }

                    form = serverWidget.createForm({ title: 'EMISIÓN MASIVA DE DOCTOS. COMERCIALES - COPIA'});
                    form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_EMISION_CERTIFICADO_copy.js";
                    if( context.request.method == 'POST'){
                        _post(context, form, userEmail);
                        context.response.writePage(form);
                        return ;
                    }
                    _uiMain(context, form);
                    _uiSublist(context, form);

                    context.response.writePage(form);

                } catch (error) {
                    log.error("ERROR onRequest", error);
                }
            }

            function _post(context, form, userEmail) {
                try {
                    let accion = context.request.parameters['custpage_accion'] || "";
                    let tipo_certificado = context.request.parameters['custpage_tipo_certificado'] || "";
                    let cliente_email = context.request.parameters['custpage_cliente_email'] || "";
                    log.debug("custpage_cliente_email", cliente_email);

                    if ( accion == '1') {
                        // DESCARGAR
                        _descargar(tipo_certificado, context, form, userEmail);

                    }else if ( accion == '2') {
                        //_enviarCorreo(tipo_certificado, context, form, userEmail);
                    }

                    let inicio = form.addField({
                        id: 'custpage_inicio',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Seleccionados'
                    });
                    inicio.defaultValue = `<div style="margin-top:10px;"><a style="font-size:17px; background-color:#006AFF; cursor:pointer; text-decoration:none; padding:8px 10px; border-radius: 3px; color:#fff; font-weight:700; " href="https://7451241.app.netsuite.com/app/site/hosting/scriptlet.nl?script=6487&deploy=1" id= "ir_inicio">Ir al inicio</a></div>`;
                } catch (error) {
                    log.error("ERROR _POST", error)
                }
            }

            function _descargar(tipo_certificado, context, form, userEmail) {
                try {
                    let descarga = form.addField({
                        id: 'custpage_descarga',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Seleccionados'
                    });

                    let lineCount = context.request.getLineCount({group: 'custpage_sublist' })
                    log.debug("lineCount", lineCount)
                    let attachments = [];
                    let seleccionado;
                    let htmlContent;

                    for (let i = 0; i < lineCount; i++) {
                        let data = {};

                        seleccionado = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_checkbox', line: i });

                        if ( seleccionado == 'T' ) {
                            data.tipo_certificado = tipo_certificado;
                            data.nombre = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_cliente', line: i });
                            data.producto = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_descripcion', line: i });
                            data.fecha_instalacion = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_fecha_instalacion', line: i }) || 'VENTA';
                            data.fecha_vigencia_servicio = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_fecha_vigencia_servicio', line: i }) || 'VENTA';
                            data.placa = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_placa', line: i });
                            data.marca = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_marca', line: i });
                            data.modelo = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_modelo', line: i });
                            data.color = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_color_carseg', line: i });
                            data.anio = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_anio', line: i });
                            data.motor = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_motor', line: i });
                            data.chasis = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_chasis', line: i });
                            data.bien_id = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_codigo_vehiculo', line: i });
                            data.emisor = userEmail.split('@')[0].toUpperCase();
                            // if ( tipo_certificado == '1') {
                            //     htmlContent = _plantilla.getCertificadoVenta( data );
                            // }else if ( tipo_certificado == '2') {
                            //     htmlContent = _plantilla.getCertificadoInstalacion( data );
                            // }
                            attachments.push(data);
                            // let pdfRenderer = render.create();
                            // pdfRenderer.templateContent = htmlContent;
                            // let pdfFile = pdfRenderer.renderAsPdf();
                            // pdfFile.name = `cert_${data.bien_id}.pdf`;
                            // attachments.push(pdfFile);
                            //log.debug('PDF creado _enviarCertificadoInstalacion' + (i + 1), 'Governance restante: ' + runtime.getCurrentScript().getRemainingUsage());
                            //descarga.defaultValue = `<iframe   width="100%" height="90%" src="https://7451241.app.netsuite.com/app/site/hosting/scriptlet.nl?script=6488&deploy=1&tipo_certificado=${tipo_certificado}&nombre=${data.nombre}&producto=${data.producto}&fecha_instalacion=${data.fecha_instalacion}&fecha_vigencia_servicio=${data.fecha_vigencia_servicio}&placa${data.placa}&marca=${data.marca}&modelo=${data.modelo}&color=${data.color}&anio=${data.anio}&motor=${data.motor}&chasis${data.chasis}&bien_id=${data.bien_id}&emisor=${data.emisor}" title="Descarga"></iframe>`;
                        }
                    }
                    let jsonData = JSON.stringify(attachments);
                    descarga.defaultValue = `<script type="text/javascript">
                        var attachments = ${jsonData};
                        //console.log('Datos cargados:', attachments);
                    </script>`;
                    let items = form.addField({
                        id: 'custpage_items',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'items'
                    });
                    items.defaultValue = `<div id="flag_post"></div>`;
                    form.addField({
                        id: 'custpage_cantidad_descarga',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Cantidad descarga'
                    }).defaultValue = '<div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; font-size:18px;">' +
                    '<strong>Iniciando:</strong> <span id ="doc_descargados">0</span>/' + attachments.length + ' documento(s) descargados.' +
                    '</div>';
                    //descarga.defaultValue = `<div id= "flag_post" data-info=${JSON.stringify(attachments)}></div>`;
                } catch (error) {
                    log.error("ERROR _descargarCertificado", error);
                }
            }

            function _enviarCorreo(tipo_certificado, context, form, userEmail) {
                try {
                    let lineCount = context.request.getLineCount({group: 'custpage_sublist' })
                    let attachments = [];
                    let seleccionado;
                    let data = {};
                    let htmlContent;
                    let tipo_certificado_label = tipo_certificado == '1' ? 'VTA' : 'INST';
                    let recipient = context.request.parameters['custpage_cliente_email'] || "";
                    let cliente_num;
                    for (let i = 0; i < lineCount; i++) {

                        seleccionado = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_checkbox', line: i });

                        if ( seleccionado == 'T' ) {
                            data.nombre = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_cliente', line: i });
                            data.producto = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_descripcion', line: i });
                            data.fecha_instalacion = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_fecha_instalacion', line: i }) || 'VENTA';
                            data.fecha_vigencia_servicio = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_fecha_vigencia_servicio', line: i }) || 'VENTA';
                            data.placa = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_placa', line: i });
                            data.marca = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_marca', line: i });
                            data.modelo = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_modelo', line: i });
                            data.color = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_color_carseg', line: i });
                            data.anio = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_anio', line: i });
                            data.motor = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_motor', line: i });
                            data.chasis = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_chasis', line: i });
                            data.bien_id = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_codigo_vehiculo', line: i });
                            data.emisor = userEmail.split('@')[0].toUpperCase();
                            cliente_num = context.request.getSublistValue({ group: 'custpage_sublist', name: 'custpage_cliente_num', line: i });

                            if ( tipo_certificado == '1') {
                                htmlContent = _plantilla.getCertificadoVenta( data );
                            }else if ( tipo_certificado == '2') {
                                htmlContent = _plantilla.getCertificadoInstalacion( data );
                            }
                            let pdfRenderer = render.create();
                            pdfRenderer.templateContent = htmlContent;
                            let pdfFile = pdfRenderer.renderAsPdf();
                            pdfFile.name = `CER${tipo_certificado_label}_${data.placa}.pdf`;
                            attachments.push(pdfFile);
                            log.debug('PDF creado _enviarCertificadoInstalacion' + (i + 1), 'Governance restante: ' + runtime.getCurrentScript().getRemainingUsage());
                        }
                    }

                    email.send({
                        author: runtime.getCurrentUser().id,
                        recipients: recipient,
                        bcc: ['mramos@carsegsa.com', 'ns_user_integracion@carsegsa.com'],
                        subject: `Certificados Generados Cliente: ${cliente_num || data?.nombre }`,
                        body: `Archivos generados por emisión masiva de doctos. comerciales.<br> Adjunto encontrarás los ${attachments.length} documentos solicitados.`,
                        attachments: attachments
                    });

                    // Mostrar mensaje de éxito
                    let script = form.addField({
                        id: 'custpage_script',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'items'
                    });
                    script.defaultValue = `<script type="text/javascript"></script>`;
                    let div = form.addField({
                        id: 'custpage_items',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'items'
                    });
                    div.defaultValue = `<div"></div>`;
                    form.addField({
                        id: 'custpage_mensaje',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Mensaje'
                    }).defaultValue = '<div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; font-size:18px;">' +
                    '<strong>¡Envío en progreso! .</strong> ' + attachments.length + ' documento(s) se enviarán por correo en unos instantes. Por favor, espere un momento.' +
                    '</div>';

                    log.debug('PDF creado _enviarCertificadoInstalacion', 'Governance restante: ' + runtime.getCurrentScript().getRemainingUsage());
                } catch (error) {
                    log.error("ERROR _enviarCertificadoInstalacion", error);
                }
            }

            function _uiSublist(context, form) {
                try {

                    let tipo_certificado = context.request.parameters.tipo_certificado || "";
                    let cliente_email_enviar = "";

                    form.addSubmitButton({
                        label: 'Procesar'
                    });

                    form.addResetButton({
                        label: 'Cancelar'
                    });

                    let sublist = form.addSublist({
                        id: 'custpage_sublist',
                        type: serverWidget.SublistType.LIST,
                        label: `Resultados`
                    });

                    sublist.addMarkAllButtons();
                    // if ( tipo_certificado == 1 ) {
                        // let resultados = _get_ordenes_servicio_facturadas(context, form);

                    // } else if ( tipo_certificado == 2 ) {
                        let resultados = _get_ordenes_servicio_coberturas(context, form);
                        if ( resultados ) {
                            // Definir campos primero
                            const campos = [
                                { id: 'checkbox', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar', hidden: false },
                                { id: 'orden_servicio_id', type: serverWidget.FieldType.TEXT, label: 'ID Orden', hidden: true },
                                { id: 'orden_servicio', type: serverWidget.FieldType.TEXT, label: 'Orden Servicio', hidden: false },
                                { id: 'fecha', type: serverWidget.FieldType.TEXT, label: 'Fecha OS', hidden: false },
                                { id: 'cliente_id', type: serverWidget.FieldType.TEXT, label: 'Cliente ID', hidden: true },
                                { id: 'cliente_correo', type: serverWidget.FieldType.TEXT, label: 'Cliente correo', hidden: true },
                                { id: 'cliente', type: serverWidget.FieldType.TEXT, label: 'Cliente', hidden: false },
                                { id: 'cliente_num', type: serverWidget.FieldType.TEXT, label: 'Cliente Num.', hidden: true },
                                { id: 'codigo_vehiculo', type: serverWidget.FieldType.TEXT, label: 'Cod. Vehiculo', hidden: true },
                                { id: 'bien', type: serverWidget.FieldType.TEXT, label: 'Vehiculo', hidden: false },
                                { id: 'placa', type: serverWidget.FieldType.TEXT, label: 'Placa', hidden: true },
                                { id: 'marca', type: serverWidget.FieldType.TEXT, label: 'Marca', hidden: true },
                                { id: 'modelo', type: serverWidget.FieldType.TEXT, label: 'Modelo', hidden: true },
                                { id: 'tipo', type: serverWidget.FieldType.TEXT, label: 'Tipo', hidden: true },
                                { id: 'color_carseg', type: serverWidget.FieldType.TEXT, label: 'Color Carseg', hidden: true },
                                { id: 'anio', type: serverWidget.FieldType.TEXT, label: 'Año', hidden: true },
                                { id: 'motor', type: serverWidget.FieldType.TEXT, label: 'Motor', hidden: true },
                                { id: 'chasis', type: serverWidget.FieldType.TEXT, label: 'Chasis', hidden: true },
                                { id: 'cobertura_id', type: serverWidget.FieldType.TEXT, label: 'Cobertura ID', hidden: true },
                                { id: 'cobertura', type: serverWidget.FieldType.TEXT, label: 'Cobertura', hidden: false },
                                { id: 'fecha_instalacion', type: serverWidget.FieldType.TEXT, label: 'Fecha instalación', hidden: false },
                                { id: 'fecha_vigencia_servicio', type: serverWidget.FieldType.TEXT, label: 'Fecha vigencia servicio', hidden: false },
                                { id: 'producto_id', type: serverWidget.FieldType.TEXT, label: 'Producto ID', hidden: true },
                                { id: 'producto', type: serverWidget.FieldType.TEXT, label: 'Producto', hidden: true },
                                { id: 'name', type: serverWidget.FieldType.TEXT, label: 'Nombre producto', hidden: true },
                                { id: 'descripcion', type: serverWidget.FieldType.TEXT, label: 'Descripcion producto', hidden: false },
                                { id: 'param_valor', type: serverWidget.FieldType.TEXT, label: 'Param. Valor', hidden: true },
                                { id: 'estado_cobertura_id', type: serverWidget.FieldType.TEXT, label: 'Estado Cob. ID', hidden: true },
                                { id: 'estado_cobertura', type: serverWidget.FieldType.TEXT, label: 'Estado Cobertura', hidden: false },
                                { id: 'estado_instalacion_id', type: serverWidget.FieldType.TEXT, label: 'Estado Ins. Cob ID', hidden: true },
                                { id: 'estado_instalacion', type: serverWidget.FieldType.TEXT, label: 'Estado Instación', hidden: false },
                            ];

                            // Crear campos
                            campos.forEach(campo => {
                                const field = sublist.addField({
                                    id: `custpage_${campo.id}`,
                                    type: campo.type,
                                    label: campo.label
                                });

                                if (campo.hidden && runtime.getCurrentUser().role != 1894) {
                                    field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                                }
                            });

                            // Llenar datos
                            resultados.data.forEach((item, index) => {
                                Object.keys(item).forEach((key) => {
                                    let value = item[key];

                                    if (value == null || value == undefined) {
                                        value = ' ';
                                    } else if (typeof value === 'number') {
                                        value = value.toString();
                                    }

                                    sublist.setSublistValue({
                                        id: `custpage_${key}`,
                                        line: index,
                                        value: value || " "
                                    });

                                    if (key === 'cliente_correo' && value) {
                                        cliente_email_enviar = value;
                                    }
                                });
                            });
                            let cliente_email = form.addField({
                                id: 'custpage_cliente_email',
                                type: serverWidget.FieldType.EMAIL,
                                label: 'Se envia a:',
                            }).updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTCOL
                    });
                            cliente_email.defaultValue = context.request.parameters.cliente_correo || cliente_email_enviar;
                        }
                    // }

                } catch (error) {
                    log.error("ERROR _uiSublist", error);
                }
            }

            function _get_ordenes_servicio_coberturas( context, form ) {
                try {
                    var page = parseInt(context.request.parameters.pg || 1);
                    var pageSize = parseInt(LONGITUD_PAGINA);

                    // Validar parámetros
                    if (page < 1) page = 1;
                    if (pageSize < 1 || pageSize > LONGITUD_PAGINA) pageSize = LONGITUD_PAGINA;

                    let sql = `SELECT DISTINCT t.id AS orden_servicio_id, t.tranid AS orden_servicio, t.trandate AS fecha, t.entity AS cliente_id, cu.entitytitle AS cliente, cu.entitytitle AS cliente_num, cu.email AS cliente_correo, b.name AS codigo_vehiculo, b.altname AS bien, b.custrecord_ht_bien_placa AS placa, m.name AS marca, mo.name AS modelo, ti.name AS tipo, col.name AS color_carseg, b.custrecord_ht_bien_ano AS anio, b.custrecord_ht_bien_motor AS motor, b.custrecord_ht_bien_chasis AS chasis, co.id AS cobertura_id, co.name AS cobertura, co.custrecord_ht_co_coberturainicial AS fecha_instalacion, co.custrecord_ht_co_coberturafinal AS fecha_vigencia_servicio, co.custrecord_ht_co_producto AS producto_id, i.displayname AS producto, v.name, v.custrecord_ht_pp_descripcion AS descripcion,  p.custrecord_ht_pp_parametrizacion_valor AS param_valor, co.custrecord_ht_co_estado_cobertura AS estado_cobertura_id, ec.name AS estado_cobertura, co.custrecord_ht_co_estado AS estado_instalacion_id, mc.name AS estado_instalacion
                    FROM transaction t INNER JOIN customer cu ON cu.id = t.entity ${ context.request.parameters.empresa_matriz ? 'AND cu.topLevelParent = ' + context.request.parameters.empresa_matriz : ''} LEFT JOIN customrecord_ht_ct_cobertura_transaction ct ON ct.custrecord_ht_ct_orden_servicio = t.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = t.custbody_ht_so_bien
                    LEFT JOIN customrecord_ht_co_cobertura co ON ct.custrecord_ht_ct_transacciones = co.id
                    LEFT JOIN item i ON i.id = co.custrecord_ht_co_producto
                    LEFT JOIN customrecord_ht_pp_main_param_prod p ON p.custrecord_ht_pp_parametrizacionid = i.id AND p.custrecord_ht_pp_parametrizacion_valor = 317
                    LEFT JOIN customrecord_ht_cr_pp_valores v ON v.id = co.custrecord_ht_co_familia_prod
                    LEFT JOIN customlist_ht_estado_cobertura ec ON ec.id = co.custrecord_ht_co_estado_cobertura
                    LEFT JOIN customlist_ht_mc_estado mc ON mc.id = co.custrecord_ht_co_estado
                    INNER JOIN customrecord_ht_bien_marca m ON m.id = b.custrecord_ht_bien_marca
                    INNER JOIN customrecord_ht_bn_modelo mo ON mo.id = b.custrecord_ht_bien_modelo
                    INNER JOIN customrecord_ht_record_tipovehiculo ti ON ti.id = b.custrecord_ht_bien_tipo
                    INNER JOIN customrecord_ht_bn_colorcarseg col ON col.id = custrecord_ht_bien_colorcarseg
                    WHERE t.recordtype = 'salesorder' AND co.id IS NOT NULL AND co.custrecord_ht_co_estado IS NOT NULL AND co.custrecord_ht_co_estado = 1`;

                    if ( !context.request.parameters.empresa_matriz && !context.request.parameters.cliente) {
                        return;
                    }

                    if (context.request.parameters.cliente) {
                        sql += `AND t.entity = ${context.request.parameters.cliente}`
                    }

                    if ( context.request.parameters.fecha_desde && context.request.parameters.fecha_hasta ) {
                        sql += ` AND t.trandate BETWEEN TO_DATE('${context.request.parameters.fecha_desde}', 'DD/MM/YYYY') AND TO_DATE('${context.request.parameters.fecha_hasta}', 'DD/MM/YYYY') `;
                    }

                    log.debug("sql", sql)
                    // Usar runSuiteQLPaged para paginación
                    var pagedData = query.runSuiteQLPaged({
                        query: sql,
                        pageSize: pageSize
                    });

                    var totalRecords = pagedData.count;
                    var totalPages = pagedData.pageRanges.length;

                    // Validar que la página solicitada existe
                    // Si piden una página mayor a las disponibles, limitar a la última
                    if (page > totalPages && totalPages > 0) {
                        page = totalPages;
                    } else if (totalPages === 0) {
                        // Si no hay páginas, devolver respuesta vacía
                        return {
                            success: true,
                            data: [],
                            pagination: {
                                page: 0,
                                pageSize: pageSize,
                                totalRecords: 0,
                                totalPages: 0,
                                hasNextPage: false,
                                hasPreviousPage: false
                            }
                        };
                    }

                    // Obtener la página específica
                    // pageIndex es 0-based, así que page 1 = index 0
                    var pageIndex = page - 1;
                    var pageData = pagedData.fetch({ index: pageIndex });
                    var results = [];

                    // Iterar usando el iterator
                    var iterator = pageData.data.iterator();
                    iterator.each(function (result) {
                        results.push(result.value.asMap());
                        return true; // continuar iterando
                    });

                    let paginaField = form.getField({ id: 'custpage_pagina' });
                    for (let index = 0; index < totalPages; index++) {
                        paginaField.addSelectOption({
                            value: index + 1,
                            text: index + 1
                        });
                    }
                    paginaField.defaultValue = page;

                    return {
                        success: true,
                        data: results,
                        pagination: {
                            page: page,
                            pageSize: pageSize,
                            totalRecords: totalRecords,
                            totalPages: totalPages,
                            hasNextPage: page < totalPages,
                            hasPreviousPage: page > 1
                        }
                    };

                } catch (e) {
                    log.error("_get_ordenes_servicio_coberturas", e);
                    return {
                        success: false,
                        error: e.message,
                        details: e.stack
                    };
                }
            }

            function _uiMain(context, form){
                try {
                    form.addFieldGroup({
                        id: 'custpage_filtros',
                        label: 'Filtros'
                    });

                    let empresa_matriz =  form.addField({
                        id: 'custpage_empresa_matriz',
                        type: serverWidget.FieldType.SELECT,
                        source: 'customer',
                        label: 'Empresa Matriz',
                        container: 'custpage_filtros'
                    });
                    empresa_matriz.defaultValue = context.request.parameters.empresa_matriz || '';

                    let cliente =  form.addField({
                        id: 'custpage_cliente',
                        type: serverWidget.FieldType.SELECT,
                        source: 'customer',
                        label: 'Cliente',
                        container: 'custpage_filtros'
                    });
                    cliente.defaultValue = context.request.parameters.cliente || '';
                    //cliente.isMandatory = true;

                    let tipo_certificado = form.addField({
                        id: 'custpage_tipo_certificado',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Tipo de certificado',
                        container: 'custpage_filtros',
                    });

                    tipo_certificado.addSelectOption({
                        value: '0',
                        text: '- Seleccionar -'
                    });
                    tipo_certificado.addSelectOption({
                        value: '1',
                        text: 'Certificado de Venta'
                    });
                    tipo_certificado.addSelectOption({
                        value: '2',
                        text: 'Certificado de Instalación'
                    });
                    tipo_certificado.isMandatory = true;

                    tipo_certificado.defaultValue = context.request.parameters.tipo_certificado || '0';

                    let tipo = form.addField({
                        id: 'custpage_accion',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Tipo de envio',
                        container: 'custpage_filtros',
                    });

                    tipo.addSelectOption({
                        value: '1',
                        text: 'Descargar'
                    });
                    tipo.addSelectOption({
                        value: '2',
                        text: 'Enviar por correo'
                    });

                    tipo.defaultValue = context.request.parameters.tipo || '2';

                    let fecha_desde = form.addField({
                        id: 'custpage_fecha_desde',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Inicio',
                        container: 'custpage_filtros'
                    });
                    fecha_desde.defaultValue = context.request.parameters.fecha_desde || '';
                    //fecha_desde.isMandatory = true;
                    fecha_desde.updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTCOL
                    });

                    let fecha_hasta = form.addField({
                        id: 'custpage_fecha_hasta',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha Fin',
                        container: 'custpage_filtros'
                    });
                    fecha_hasta.defaultValue = context.request.parameters.fecha_hasta || '';
                    // fecha_hasta.isMandatory = true;

                    let fecha = form.addField({
                        id: 'custpage_fecha',
                        type: serverWidget.FieldType.DATE,
                        label: 'Fecha',
                        container: 'custpage_filtros'
                    });

                    fecha.defaultValue = new Date();
                    fecha.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });

                    let seleccionados = form.addField({
                        id: 'custpage_seleccionados',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Seleccionados'
                    });
                    seleccionados.defaultValue = `
                        <p style="font-size:13px;">
                            <span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> 0
                        </p>
                    `;
                    seleccionados.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                    let disenio = form.addField({
                        id: 'custpage_disenio',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Seleccionados'
                    });

                    disenio.defaultValue = `
                        <style>
                            .date-group-border {
                                border: 1px solid #cccccc !important;
                                border-radius: 2.5px;
                                padding: 10px;
                                position: relative;
                                margin-top: 10px;
                                width: fit-content;
                            }
                            .date-group-legend {
                                position: absolute;
                                top: -10px;
                                left: 50%;
                                transform: translateX(-50%);
                                background-color: white;
                                padding: 0 8px;
                                font-size: 12px;
                                color: #666;
                                font-weight: 500;
                            }
                        </style>
                        <script>
                            setTimeout(function() {
                                // Seleccionar ambos campos
                                let fechaDesde = document.querySelector('[data-field-name="custpage_fecha_desde"]');
                                let fechaHasta = document.querySelector('[data-field-name="custpage_fecha_hasta"]');

                                if (fechaDesde && fechaHasta) {
                                    // Crear un contenedor wrapper
                                    let wrapper = document.createElement('div');
                                    wrapper.className = 'date-group-border';

                                    let legend = document.createElement('span');
                                    legend.className = 'date-group-legend';
                                    legend.textContent = 'Orden de servicio';



                                    // Insertar el wrapper antes del primer campo
                                    fechaDesde.parentNode.insertBefore(wrapper, fechaDesde);
                                    wrapper.appendChild(legend);

                                    // Mover ambos campos dentro del wrapper
                                    wrapper.appendChild(fechaDesde);
                                    wrapper.appendChild(fechaHasta);
                                }
                            }, 10);
                        </script>
                    `;
                    disenio.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    form.addField({
                        id: 'custpage_pagina',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Página'
                    }).updateBreakType({
                        breakType: serverWidget.FieldBreakType.STARTCOL
                    });

                } catch (error) {
                    log.error("ERROR _uiMain", error);
                }
            }

            return { onRequest}

        });