/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 03/10/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define(['N/log', 'N/ui/serverWidget', 'N/runtime', 'N/search', 'N/email', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], function (log, serverWidget, runtime, search, email, _toolkit) {
    function onRequest(context) {
        let form;
        try {
            let { role, subsidiary } = runtime.getCurrentUser();
            if ( subsidiary !== 2 ) {
                form = serverWidget.createForm({ title: 'No tienes permisos para ver esta página'})
                context.response.writePage( form );
                return;
            }
            form = serverWidget.createForm({title: `Solicitud de aprobación de Orden de Servicio`});
            form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_NOTIFICACION_APROBACION_OS.js';
            _uiMain(context, form);
            _uiSublist(context, form);
            if (context.request.method == 'POST') {
                _envioSolicitud(context);
            }
            context.response.writePage(form);

        } catch (error) {
            log.error("ERROR onRequest", error);
        }
    }

    function _envioSolicitud(context) {
        let pendiente_venta = [];
        let pendiente_cartera = [];
        let region;

        let jefe_ejecutiva = _toolkit.getJefeEjecutiva(context.request.parameters['custpage_ejecutiva_ref']);
        jefe_ejecutiva = jefe_ejecutiva.MAIL_JEFE2.length > 0 ? jefe_ejecutiva.MAIL_JEFE2 : jefe_ejecutiva.MAIL_JEFE;

        try {
            let lineCount = context.request.getLineCount({
                group: 'custpage_sublist'
            });
            for( let index = 0; index < lineCount; index++){
                let trandId = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_checkbox',
                    line: index
                });

                let id = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_id',
                    line: index,
                });
                let fecha = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_fecha',
                    line: index,
                });
                let oficina = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_oficina',
                    line: index,
                });
                let orden_servicio  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_numero_documento',
                    line: index,
                });
                let ejecutiva  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_ejecutiva',
                    line: index,
                });
                let nombre  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_nombre',
                    line: index,
                });
                let facturar_a  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_facturar_a',
                    line: index,
                });
                let bien  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_bien',
                    line: index,
                });
                let subtotal  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_subtotal',
                    line: index,
                });
                let total  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_total_orden',
                    line: index,
                });
                let apr_venta  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_apr_venta',
                    line: index,
                });
                let apr_cartera  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_apr_cartera',
                    line: index,
                });
                let plazo  = context.request.getSublistValue({
                    group: 'custpage_sublist',
                    name: 'custpage_plazo',
                    line: index,
                });
                region  = context.request.parameters['custpage_region'];

                if( trandId == 'T'){
                    if ( apr_venta == 'PENDIENTE DE APROBACIÓN' ) {
                        // Correo representante de venta
                        pendiente_venta.push({ id, fecha, oficina, orden_servicio, ejecutiva, nombre, facturar_a, bien, subtotal, total, apr_venta, apr_cartera, plazo});
                    }

                    if ( apr_cartera == 'PENDIENTE DE APROBACIÓN' ) {
                        pendiente_cartera.push({ id, fecha, oficina, orden_servicio, ejecutiva, nombre, facturar_a, bien, subtotal, total, apr_venta, apr_cartera, plazo});
                    }
                }
            }


            let entorno = '';
            if (runtime.envType === runtime.EnvType.SANDBOX) {
                entorno = 'https://7451241-sb1.app.netsuite.com';
            } else if (runtime.envType === runtime.EnvType.PRODUCTION) {
                entorno = 'https://7451241.app.netsuite.com';
            }
            let url = `${entorno}/app/accounting/transactions/transaction.nl?id=`;

            if (pendiente_venta.length > 0) {
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: [jefe_ejecutiva],
                    bcc: ['mramos@carsegsa.com'],
                    subject: 'Solicitud de aprobación de Orden de Servicio Venta',
                    body: buildTable(url, pendiente_venta, 'VENTA'),
                });
            }
            let correo_grupo = '';
            if (pendiente_cartera.length > 0) {
                if (region == 'COSTA'){
                    correo_grupo = 'cobranzasgye@carsegsa.com'
                }else if (region == 'SIERRA'){
                    correo_grupo = 'cobranzasuio@carsegsa.com'
                }else{
                    email.send({
                        author: runtime.getCurrentUser().id,
                        recipients: [runtime.getCurrentUser().email],
                        bcc: ['mramos@carsegsa.com'],
                        subject: 'Solicitud de aprobación de Orden de Servicio Cartera - Fallida',
                        body: 'No se ha podido identificar la región para el envio de correo de aprobación de cartera.',
                    });
                    return;
                }
                email.send({
                    author: runtime.getCurrentUser().id,
                    recipients: [correo_grupo],
                    bcc: ['mramos@carsegsa.com'],
                    subject: 'Solicitud de aprobación de Orden de Servicio Cartera',
                    body: buildTable(url, pendiente_cartera, 'CARTERA'),
                });
            }
        } catch (error) {
            log.error("ERROR _envioSolicitud", error);
        }
    }

    function buildTable(url, rows, tipo) {
        if (!rows.length) return '';
        let tableRows = rows.map(item => `
            <tr>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.fecha}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.oficina}</td>
                <td style="padding: 10px; border: 1px solid #dddddd;"><a href="${url}${item.id}" style="color: #000000; text-decoration: none; font-weight: bold;" target="_blank">${item.orden_servicio}</a></td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.ejecutiva}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.nombre}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.facturar_a}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.bien}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.subtotal}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">${item.total}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none;">${item.plazo}</td>
            </tr>

        `).join('');
        return `
            <table border="1" cellpadding="0" cellspacing="0" width="95%" style="margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border: 2px solid #ccc;">
                <!-- HEADER - LOGOS -->
                <tr>
                    <td style="padding: 20px 0 0 20px; background-color: #fff;">
                        <img src="https://www.hunter.com.ec/images/logo.png" alt="Logo Principal" style="display: inline-block; max-width: 100px; height: auto; margin-bottom: 10px;">

                        <img src="https://www.aafd.org/wp-content/uploads/2024/11/NetSuite-logo-half-light.jpg" alt="Logo Área Control" style="display: inline-block; max-width: 80px; height: auto;">
                    </td>
                </tr>
                <!-- TÍTULO -->
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f8f8f8; border-bottom: 2px solid #DE022E; border-top: 2px solid #DE022E;">
                        <h1 style="margin: 0; color: #DE022E; font-size: 20px; font-weight: bold;">Solicitud de aprobación de Orden de Servicio ${tipo}</h1>
                    </td>
                </tr>

                <!-- CONTENIDO -->
                <tr style="border-bottom: 0px solid #fff">
                <td style="padding: 10px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 5px; margin-bottom: 5px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">FECHA</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">OFICINA</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">ORDEN DE SERVICIO</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">EJECUTIVA REF.</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">CLIENTE</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">FACTURAR A</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">BIEN</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">SUBTOTAL</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">TOTAL</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">PLAZO</td>
                    </tr>
                    ${tableRows}
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                        <p style="margin: 0 0 10px 0;">Este es un mensaje automático. Por favor, no responda a este correo electrónico.</p>
                    </td>
                </tr>
            </table>
        `;
    }

    function _get_ordenes_servicio(context){
        try {
            let tipo = context.request.parameters.tipo || '0'
            let cliente = context.request.parameters.cliente
            let orden = context.request.parameters.orden
            let fecha_desde = context.request.parameters.fecha_desde
            let fecha_hasta = context.request.parameters.fecha_hasta
            let ejecutiva_ref = context.request.parameters.ejecutiva_ref
            let results = [];
            let filters = [
                ["status","anyof","SalesOrd:A"],
                "AND",
                ["customform","anyof","142"],
                "AND",
                ["subsidiary","anyof","2"],
                "AND",
                ["mainline","is","T"],
                "AND", 
                ["memorized","is","F"]

            ];

            if( tipo == '0') {
                filters.push("AND", ["custbody_ht_os_aprobacionventa", "anyof", '2']);
                filters.push("AND", ["custbody_ht_os_aprobacioncartera", "anyof", '2']);
            }else if(tipo == '1') {
                filters.push("AND", ["custbody_ht_os_aprobacionventa", "anyof", '2']);
                filters.push("AND", ["custbody_ht_os_aprobacioncartera", "anyof", '1']);
            }else if( tipo == '2') {
                filters.push("AND", ["custbody_ht_os_aprobacionventa", "anyof", '1']);
                filters.push("AND", ["custbody_ht_os_aprobacioncartera", "anyof", '2']);
            }

            if(cliente){
                filters.push("AND");
                filters.push(["entity", "anyof", cliente]);
            }

            if( ejecutiva_ref){
                filters.push("AND");
                filters.push(["custbody_ht_os_ejecutivareferencia","anyof", ejecutiva_ref ]);
            }

            if (fecha_desde && fecha_hasta) {
                filters.push("AND");
                filters.push(["trandate", "within", `${fecha_desde}`, `${fecha_hasta}`]);
            }else{
                filters.push("AND");
                filters.push(["trandate","within","thisyear"]);
            }

            if ( orden ) {
                filters.push("AND");
                filters.push(["internalid","anyof",orden]);
            }

            let idSearchObj = search.create({
                type: "transaction",
                filters,
                columns:[
                    search.createColumn({ name: "internalid", label: "id" }),
                    search.createColumn({name: "trandate", label: "fecha"}),
                    search.createColumn({name: "location", label: "oficina"}),
                    search.createColumn({name: "tranid", label: "numero_documento"}),
                    search.createColumn({name: "custbody_ht_os_aprobacionventa", label: "apr_venta"}),
                    search.createColumn({name: "custbody_ht_os_aprobacioncartera", label: "apr_cartera"}),
                    search.createColumn({name: "entity", label: "nombre"}),
                    search.createColumn({name: "custbody_ht_facturar_a", label: "HT Facturar a"}),
                    search.createColumn({
                        name: "altname",
                        join: "CUSTBODY_HT_SO_BIEN",
                        label: "Nombre"
                    }),
                    search.createColumn({name: "salesrep", label: "representante_ventas"}),
                    search.createColumn({name: "memomain", label: "nota"}),
                    search.createColumn({name: "netamountnotax", label: "Importe (neto de impuestos)"}),
                    search.createColumn({name: "amount", label: "total_orden"}),
                    search.createColumn({
                        name: "custentity_ec_document_type",
                        join: "customerMain",
                        label: "documento"
                    }),
                    search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "numero_documento_cliente"
                    }),
                    search.createColumn({name: "terms", label: "nota"}),
                    search.createColumn({name: "custbody_ht_os_ejecutivareferencia", label: "HT Ejecutiva de referencia"}),
                ]
            });

            let searchResult = idSearchObj.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count;
            let data = []
            if ( totalRecords > 0 ) {
                let firstPage = searchResult.fetch({index: 0});
                let invoicesMap = {};
                firstPage.data.forEach(result => {
                    data.push( {
                        id: result.getValue({name: "internalid"}),
                        fecha: result.getValue({name: "trandate"}),
                        oficina: result.getText({name: "location"}),
                        numero_documento: result.getValue({name: "tranid"}),
                        ejecutiva: result.getText({name: "custbody_ht_os_ejecutivareferencia"}),
                        apr_venta: result.getText({name: "custbody_ht_os_aprobacionventa"}),
                        apr_cartera: result.getText({name: "custbody_ht_os_aprobacioncartera"}),
                        nombre: result.getText({name: "entity"}),
                        facturar_a: result.getText({name: "custbody_ht_facturar_a"}),
                        bien: result.getValue({name: "altname", join: "CUSTBODY_HT_SO_BIEN"}),
                        entity_id: result.getValue({name: "entity"}),
                        representante_ventas: result.getText({name: "salesrep"}),
                        nota: result.getValue({name: "memomain"}),
                        subtotal: result.getValue({name: "netamountnotax"}),
                        total_orden: result.getValue({name: "amount"}),
                        documento: result.getText({name: "custentity_ec_document_type", join: "customerMain"}),
                        numero_documento_cliente: result.getValue({name: "vatregnumber", join: "customerMain"}),
                        plazo: result.getText({name: "terms"}),
                    } );
                });

                results = results.concat( Object.values(invoicesMap));

                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000);
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {};

                    page.data.forEach(result => {
                        data.push( {
                            id: result.getValue({name: "internalid"}),
                            fecha: result.getValue({name: "trandate"}),
                            oficina: result.getText({name: "location"}),
                            numero_documento: result.getValue({name: "tranid"}),
                            ejecutiva: result.getText({name: "custbody_ht_os_ejecutivareferencia"}),
                            apr_venta: result.getText({name: "custbody_ht_os_aprobacionventa"}),
                            apr_cartera: result.getText({name: "custbody_ht_os_aprobacioncartera"}),
                            nombre: result.getText({name: "entity"}),
                            facturar_a: result.getText({name: "custbody_ht_facturar_a"}),
                            bien: result.getValue({name: "altname", join: "CUSTBODY_HT_SO_BIEN"}),
                            representante_ventas: result.getText({name: "salesrep"}),
                            nota: result.getValue({name: "memomain"}),
                            subtotal: result.getValue({name: "netamountnotax"}),
                            total_orden: result.getValue({name: "amount"}),
                            documento: result.getText({name: "custentity_ec_document_type", join: "customerMain"}),
                            numero_documento_cliente: result.getValue({name: "vatregnumber", join: "customerMain"}),
                            plazo: result.getText({name: "terms"}),
                            //region: result.getText({name: "custrecord_custrecord_oficina_region", join: "location"}),
                        } );
                    });
                    results = results.concat( Object.values(remainingInvoicesMap));
                }
            }

            return data;
        } catch (error) {
            log.error("<p style='color:red; font-weight:700;'>ERROR _get_ordenes_servicio</p>", error);
        }

    }


    function _uiSublist(context, form) {
        try {
            form.addSubmitButton({
                label: 'Notificar'
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

            let regsitros = _get_ordenes_servicio(context);

            sublist.addField({ id: 'custpage_checkbox', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar' });
            let os_id = sublist.addField({ id: 'custpage_id', type: serverWidget.FieldType.TEXT, label: 'id' });
            os_id.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sublist.addField({ id: 'custpage_oficina', type: serverWidget.FieldType.TEXT, label: 'Oficina' });
            sublist.addField({ id: 'custpage_fecha', type: serverWidget.FieldType.TEXT, label: 'Fecha' });
            sublist.addField({ id: 'custpage_numero_documento', type: serverWidget.FieldType.TEXT, label: 'Número de Orden' });
            sublist.addField({ id: 'custpage_ejecutiva', type: serverWidget.FieldType.TEXT, label: 'Ejecutiva Ref.' });
            sublist.addField({ id: 'custpage_numero_documento_cliente', type: serverWidget.FieldType.TEXT, label: 'Número de documento' });
            sublist.addField({ id: 'custpage_nombre', type: serverWidget.FieldType.TEXT, label: 'Nombre' });
            sublist.addField({ id: 'custpage_facturar_a', type: serverWidget.FieldType.TEXT, label: 'Facturar a' });
            sublist.addField({ id: 'custpage_bien', type: serverWidget.FieldType.TEXT, label: 'Bien' });
            sublist.addField({ id: 'custpage_representante_ventas', type: serverWidget.FieldType.TEXT, label: 'Representante de Ventas' });
            sublist.addField({ id: 'custpage_subtotal', type: serverWidget.FieldType.TEXT, label: 'Subtotal' });
            sublist.addField({ id: 'custpage_total_orden', type: serverWidget.FieldType.TEXT, label: 'Total de Orden' });
            sublist.addField({ id: 'custpage_apr_venta', type: serverWidget.FieldType.TEXT, label: 'Apr. Venta' });
            sublist.addField({ id: 'custpage_apr_cartera', type: serverWidget.FieldType.TEXT, label: 'Apr. Cartera' });
            sublist.addField({ id: 'custpage_plazo', type: serverWidget.FieldType.TEXT, label: 'Plazo' });

            regsitros.forEach((item, index) => {
                Object.keys(item).forEach((key) => {
                    sublist.setSublistValue({
                        id: `custpage_${key}`,
                        line: index,
                        value: item[key] || " "
                    });
                });
            });
        } catch (error) {
        }
    }

    function _uiMain(context, form){
        try {
            form.addFieldGroup({
                id: 'custpage_filtros',
                label: 'Filtros'
            });

            let ejecutiva_ref =  form.addField({
                id: 'custpage_ejecutiva_ref',
                type: serverWidget.FieldType.SELECT,
                source: 'employee',
                label: 'Ejecutiva de Referencia',
                container: 'custpage_filtros'
            });
            ejecutiva_ref.defaultValue = context.request.parameters.ejecutiva_ref || '';
            ejecutiva_ref.isMandatory = true;
            let region =  form.addField({
                id: 'custpage_region',
                type: serverWidget.FieldType.SELECT,
                source: 'customrecord_catopc',
                label: 'Region',
                container: 'custpage_filtros'
            });
            region.defaultValue = context.request.parameters.region || '';
            region.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });
            let orden =  form.addField({
                id: 'custpage_orden',
                type: serverWidget.FieldType.SELECT,
                source: 'salesorder',
                label: 'Orden de Servicio',
                container: 'custpage_filtros'
            });
            orden.defaultValue = context.request.parameters.orden || '';

            let cliente =  form.addField({
                id: 'custpage_cliente',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Cliente',
                container: 'custpage_filtros'
            });
            cliente.defaultValue = context.request.parameters.cliente || '';

            let tipo = form.addField({
                id: 'custpage_tipo',
                type: serverWidget.FieldType.SELECT,
                label: 'Tipo',
                container: 'custpage_filtros',
            });

            // tipo.updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.HIDDEN
            // });


            tipo.addSelectOption({
                value: '0',
                text: 'APROBACIÓN VENTA - CARTERA'
            });
            tipo.addSelectOption({
                value: '1',
                text: 'APROBACIÓN VENTA'
            });
            tipo.addSelectOption({
                value: '2',
                text: 'APROBACIÓN CARTERA'
            });

            tipo.defaultValue = context.request.parameters.tipo || '0';

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

            let importeField = form.addField({
                id: 'custpage_importe',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Importe'
            });
            importeField.defaultValue = `
                <p style="font-size:13px;">
                    <span style="color:#6f6f6f;">IMPORTE: </span> $0.0
                </p>
            `;
            importeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

        } catch (error) {
            log.error("ERROR _uiMain", error);
        }
    }

    return { onRequest }
})