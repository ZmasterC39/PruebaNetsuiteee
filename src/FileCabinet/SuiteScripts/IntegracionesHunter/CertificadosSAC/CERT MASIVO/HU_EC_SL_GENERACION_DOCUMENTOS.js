/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 14/04/2026 - Last modified: 14/04/2026
 * @description Emisión masiva de documentos comerciales
 *
 * @version 1.1
 * @notes
*/

define(['N/runtime', 'N/log', 'N/query', 'N/ui/serverWidget', 'N/render', 'N/email', 'SuiteScripts/IntegracionesHunter/CertificadosSAC/CERT MASIVO/HU_EC_DOCUMENTOS_PLANTILLA.js', 'N/record'], function (runtime, log, query, serverWidget, render, email, _plantilla, record) {

    const LONGITUD_PAGINA = 50;

    function onRequest(context) {
        try {
            const { subsidiary, email: userEmail } = runtime.getCurrentUser();

            if (subsidiary !== 2) {
                const form = serverWidget.createForm({ title: 'No tienes permisos para ver esta página' });
                context.response.writePage(form);
                return;
            }

            const form = serverWidget.createForm({ title: 'EMISIÓN MASIVA DE DOCTOS. COMERCIALES' });
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/CertificadosSAC/CERT MASIVO/HU_EC_CS_GENERACION_DOCUMENTOS.js";
            // if( context.request.method == 'POST'){
            //     _post(context, form, userEmail);
            //     context.response.writePage(form);
            //     return ;
            // }

            if (context.request.method == 'POST') {
                let custpage_object = context.request.parameters['custpage_object']

                let tipo_certificado = context.request.parameters['custpage_tipo_certificado'];
                // 1 VENTA
                // 2 INSTALACION
                let accion = context.request.parameters['custpage_accion'];

                if (accion == 1) {
                    // 1 DESCARGAR
                    _descargar(custpage_object, tipo_certificado, form);
                } else if (accion == 2) {
                    // 2 CORREO
                    _enviarCorreo(context, custpage_object, tipo_certificado, form, userEmail);
                }

                context.response.writePage(form);
                return;
            }

            _uiMain(context, form);
            _uiLista(context, form);

            context.response.writePage(form);
        } catch (error) {
            log.error('ERROR onRequest', error);
        }
    }

    function _enviarCorreo(context, custpage_object, tipo_certificado, form, userEmail) {
        try {
            const seleccionados = JSON.parse(custpage_object)
            log.debug("params", context.request.parameters);
            let pdf;
            let attachments = [];
            let recipient = context.request.parameters['custpage_cliente_email'] || "";
            let custpage_destinatario = context.request.parameters['custpage_destinatario'] || "";
            let cliente_nombre = context.request.parameters['custpage_empresa_matriz_display'] || context.request.parameters['custpage_cliente_display'];

            let emprese_matriz_id = context.request.parameters['custpage_empresa_matriz'];
            let cliente_id = context.request.parameters['custpage_cliente'];

            // Obtener el correo por el id del cliente o empresa matriz, si no se ingresó un destinatario manualmente
            if (cliente_id) {
                let clienteRecord = record.load({ type: record.Type.CUSTOMER, id: cliente_id });
                recipient = clienteRecord.getValue({ fieldId: 'email' }) || recipient;
            } else if (emprese_matriz_id) {
                let empresaMatrizRecord = record.load({ type: record.Type.CUSTOMER, id: emprese_matriz_id });
                recipient = empresaMatrizRecord.getValue({ fieldId: 'email' }) || recipient;
            }

            for (let i = 0; i < seleccionados.length; i++) {
                if (tipo_certificado == 1) {
                    pdf = _plantilla.getCertificadoVenta(seleccionados[i]);
                } else if (tipo_certificado == 2) {
                    pdf = _plantilla.getCertificadoInstalacion(seleccionados[i]);
                }

                let pdfRenderer = render.create();
                pdfRenderer.templateContent = pdf;
                let pdfFile = pdfRenderer.renderAsPdf();
                let tipo_certificado_label = tipo_certificado == '1' ? 'VTA' : 'INST';
                pdfFile.name = `CER${tipo_certificado_label}_${seleccionados[i].placa}.pdf`;
                attachments.push(pdfFile);
            }


            let recipients = "";
            if (custpage_destinatario) {
                recipients = custpage_destinatario
            } else if (recipient) {
                log.debug("Recipient final", recipient);
                // recipients = userEmail
                recipients = recipient
            }

            log.debug("Recipients-", recipients);

            email.send({
                author: runtime.getCurrentUser().id,
                // recipients: 'mramos@carsegsa.com',
                recipients: recipients,
                bcc: ['mramos@carsegsa.com', 'daristega@carsegsa.com' ],
                subject: `Certificados Generados Cliente: ${cliente_nombre.replace("C-EC-", "")}`,
                body: `Archivos generados por emisión masiva de doctos. comerciales.<br> Adjunto encontrarás los ${attachments.length} documentos solicitados.`,
                attachments: attachments
            });
            form.addField({
                id: 'custpage_mensaje',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Mensaje'
            }).defaultValue = '<div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; font-size:18px;">' +
            '<strong>¡Envío en progreso! .</strong> ' + attachments.length + ' documento(s) se enviarán por correo en unos instantes. Por favor, espere un momento.' +
                '</div>';
        } catch (error) {
            log.error("ERROR _enviarCorreo", error)
        }
    }

    function _descargar(custpage_object, tipo_certificado, form) {
        try {
            let json_custpage_object = JSON.stringify(custpage_object)
            form.addField({
                id: 'custpage_descarga',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'descarga'
            }).defaultValue = `
            <script type="text/javascript">
                window.attachments = ${json_custpage_object};
                window.tipo_certificado = ${tipo_certificado};
            </script>
            `;

            form.addField({
                id: 'custpage_cantidad_descarga',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Cantidad descarga'
            }).defaultValue = '<div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 10px 0; font-size:18px;">' +
            '<strong>Iniciando:</strong> <span id ="doc_descargados">0</span>/' + JSON.parse(custpage_object).length + ' documento(s) descargados.' +
                '</div>';
        } catch (e) {
            log.error('ERROR descargar', e);
        }
    }

    function _uiLista(context, form) {
        try {
            const resultados = _get_ordenes_servicio_coberturas(context, form);

            log.debug("resultados", resultados);

            const field = form.addField({
                id: 'custpage_resultados_lista',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Resultados'
            });

            field.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW });

            if (resultados?.data?.length == 0) {
                field.defaultValue = `
                <div> <p>No se han encontrado resultados</p> </div>
                `;
                return
            };

            field.defaultValue = `
            <style>
                .table { width:100%; border-collapse:collapse; font-size:12px;}
                .table th { background:#eee; padding:6px; text-align:left;}
                .table td { padding:6px; border-top:1px solid #ddd;}

                .parent-row { background:#f4f6f8;}
                .parent-row:hover { background:#e9ecef; }

                .child-row { background:#fff; }
                .child-row:hover { background:#fafafa; }

                .toggle { cursor:pointer; font-size:12px; }

                .pagination { margin-top:10px;}
                .btn { padding:4px 8px; cursor:pointer; border:1px solid #ccc; background:#fff;}
            </style>

            <div style="margin: 10px 0px">
                <button class="uir-button" onclick="toggleAllAuto(this)">Seleccionar todo</button>
                <button class="uir-button" onclick="toggleExpandAll(this)">Expandir todo</button>
            </div>

            <div id="agrupado"></div>

            <script type="text/javascript">

            const data = ${JSON.stringify(resultados?.data || [])};
            const pagination = ${JSON.stringify(resultados?.pagination || {})};

            function toggleAllAuto(btn){
                if(event) event.preventDefault();
                let allParents = document.querySelectorAll('.parent-row input[type="checkbox"]');
                let allChecked = Array.from(allParents).every(ch => ch.checked);

                let newState = !allChecked;

                toggleAll(newState);

                btn.textContent = newState ? 'Desmarcar todo' : 'Seleccionar todo';
            }

            /* ===============================
            🔹 SELECT / DESELECT ALL
            =============================== */
            function toggleAll(state){

                // Padres
                document.querySelectorAll('.parent-row input[type="checkbox"]')
                    .forEach(parent=>{
                        parent.checked = state;
                        parent.indeterminate = false;
                    });

                // Hijos
                document.querySelectorAll('.child-row input[type="checkbox"]')
                    .forEach(child=>{
                        child.checked = state;
                    });

                countSelected();
            }

            function countSelected(){
                // SOLO hijos
                let total = document.querySelectorAll('.child-row input[type="checkbox"]:checked').length;

                document.querySelector('[id*="custpage_seleccionados"]').innerHTML = '<p style="font-size:13px;"><span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> ' + total + '</p>';

                let result = [];
                document.querySelectorAll('.parent-row').forEach(parentRow => {
                    let parentCheckbox = parentRow.querySelector('input[type="checkbox"]');
                    let index = parentRow.dataset.index;

                    let children = document.querySelectorAll('.child-' + index);
                    let selectedChildren = [];

                    children.forEach(childRow => {
                        let checkbox = childRow.querySelector('input[type="checkbox"]');
                        if(checkbox.checked){
                            selectedChildren.push({
                                cobertura_id: childRow.dataset.cobertura_id,
                                cobertura: childRow.dataset.cobertura,
                                fecha_instalacion: childRow.dataset.fecha_instalacion,
                                fecha_vigencia_servicio: childRow.dataset.fecha_vigencia_servicio,
                                producto_id: childRow.dataset.producto_id,
                                descripcion: childRow.dataset.descripcion,
                                estado_cobertura_id: childRow.dataset.estado_cobertura_id,
                                estado_cobertura: childRow.dataset.estado_cobertura,
                                estado_instalacion_id: childRow.dataset.estado_instalacion_id,
                                estado_instalacion: childRow.dataset.estado_instalacion,
                            });
                        }
                    });

                    if(selectedChildren.length > 0 || parentCheckbox.checked){
                        result.push({
                            orden_servicio_id: parentRow.dataset.orden_servicio_id,
                            orden_servicio: parentRow.dataset.orden_servicio,
                            fecha: parentRow.dataset.fecha,
                            cliente_id: parentRow.dataset.cliente_id,
                            cliente: parentRow.dataset.cliente,
                            cliente_num: parentRow.dataset.cliente_num,
                            cliente_correo: parentRow.dataset.cliente_correo,
                            codigo_vehiculo: parentRow.dataset.codigo_vehiculo,
                            bien: parentRow.dataset.bien,
                            placa: parentRow.dataset.placa,
                            marca: parentRow.dataset.marca,
                            modelo: parentRow.dataset.modelo,
                            tipo: parentRow.dataset.tipo,
                            color_carseg: parentRow.dataset.color_carseg,
                            anio: parentRow.dataset.anio,
                            motor: parentRow.dataset.motor,
                            chasis: parentRow.dataset.chasis,
                            estado: parentCheckbox.indeterminate ? 'parcial' : 'completo',
                            items: selectedChildren,
                            usuario: ${JSON.stringify(runtime.getCurrentUser())}
                        });
                    }

                });

                var registros_procesar = result;
                document.querySelector("#custpage_object").value = JSON.stringify(registros_procesar, null, 2);

            }

            /* ===============================
            🔹 GROUP DATA
            =============================== */
            function groupData(){
                let grouped = new Map();

                data.forEach(r=>{
                    if(!grouped.has(r.orden_servicio_id)){
                        grouped.set(r.orden_servicio_id, {
                            ...r,
                            detalle:[]
                        });
                    }
                    grouped.get(r.orden_servicio_id).detalle.push(r);
                });

                return Array.from(grouped.values());
            }

            /* ===============================
            🔹 RENDER TREE
            =============================== */
            function render(){
                let grouped = groupData();

                let html = '<table class="table">';
                html += '<thead>';
                html += '<tr>';
                html += '<th style="width:30px;"></th>';
                html += '<th style="width:30px;"></th>';
                html += '<th style="display: none;">ORDEN DE SERVICIO ID</th><th>ORDEN DE SERIVICIO</th><th>FECHA ORDEN DE SERVICIO</th><th style="display: none;">CLIENTE ID</th><th>CLIENTE</th><th>CLIENTE NUM. DOC</th><th>CLIENTE CORREO</th> <th style="display: none;">CODIGO BIEN</th> <th>BIEN</th><th>PLACA</th><th>MARCA</th><th>MODELO</th><th>TIPO</th><th>COLOR CARSEG</th><th>ANIO</th><th>MOTOR</th><th>CHASIS</th>';
                html += '</tr>';
                html += '</thead><tbody>';

                grouped.forEach((g, index)=>{

                    html += \`
                    <tr class="parent-row" data-index="\${index}" data-orden_servicio_id="\${g.orden_servicio_id}" data-orden_servicio="\${g.orden_servicio}" data-fecha="\${g.fecha}" data-cliente_id="\${g.cliente_id}" data-cliente="\${g.cliente}" data-cliente_num="\${g.cliente_num}" data-cliente_correo="\${g.cliente_correo.toLowerCase()}" data-codigo_vehiculo="\${g.codigo_vehiculo}" data-bien="\${g.bien}" data-placa="\${g.placa}" data-marca="\${g.marca}" data-modelo="\${g.modelo}" data-tipo="\${g.tipo}" data-color_carseg="\${g.color_carseg}" data-anio="\${g.anio}" data-motor="\${g.motor}" data-chasis="\${g.chasis}">
                        <td><span class="toggle" onclick="toggleRow(\${index})">+</span></td>
                        <td><input type="checkbox" onchange="toggleChildren(this, \${index})"></td>
                        <td style="display: none;">\${g.orden_servicio_id}</td>
                        <td >\${g.orden_servicio}</td>
                        <td>\${g.fecha}</td>
                        <td style="display: none;">\${g.cliente_id}</td>
                        <td>\${g.cliente}</td>
                        <td>\${g.cliente_num}</td>
                        <td>\${g.cliente_correo.toLowerCase()}</td>
                        <td style="display: none;">\${g.codigo_vehiculo}</td>
                        <td>\${g.bien}</td>
                        <td>\${g.placa}</td>
                        <td>\${g.marca}</td>
                        <td>\${g.modelo}</td>
                        <td>\${g.tipo}</td>
                        <td>\${g.color_carseg}</td>
                        <td>\${g.anio}</td>
                        <td>\${g.motor}</td>
                        <td>\${g.chasis}</td>
                    </tr>\`;

                    g.detalle.forEach(d=>{
                        html += \`
                        <tr class="child-row child-\${index}"
                            data-cobertura_id="\${d.cobertura_id}"
                            data-cobertura="\${d.cobertura}"
                            data-fecha_instalacion="\${d.fecha_instalacion}"
                            data-fecha_vigencia_servicio="\${d.fecha_vigencia_servicio}"
                            data-producto_id="\${d.producto_id}"
                            data-producto="\${d.producto}"
                            data-descripcion="\${d.descripcion}"
                            data-param_valor="\${d.param_valor}"
                            data-estado_cobertura_id="\${d.estado_cobertura_id}"
                            data-estado_cobertura="\${d.estado_cobertura}"
                            data-estado_instalacion_id="\${d.estado_instalacion_id}"
                            data-estado_instalacion="\${d.estado_instalacion}" style="display:none;">
                            <td colspan="2"></td>
                            <td style="padding-left:20px;">
                                <input type="checkbox" onchange="updateParent(\${index})">
                            </td>
                            <td style="display: none;">\${d.cobertura_id}</td>
                            <td>\${d.cobertura}</td>
                            <td>\${d.descripcion}</td>
                            <td>\${d.producto}</td>
                            <td>\${d.fecha_instalacion}</td>
                            <td>\${d.fecha_vigencia_servicio}</td>
                            <td style="display: none;">\${d.producto_id}</td>
                            <td style="display: none;">\${d.param_valor}</td>
                            <td style="display: none;">\${d.estado_cobertura_id}</td>
                            <td>\${d.estado_cobertura}</td>
                            <td style="display: none;">\${d.estado_instalacion_id}</td>
                            <td>\${d.estado_instalacion}</td>
                        </tr>\`;
                    });

                });

                html += '</tbody></table>';

                document.getElementById('agrupado').innerHTML = html;
            }

            /* ===============================
            🔹 EXPAND / COLLAPSE
            =============================== */
            function toggleRow(index){
                let rows = document.querySelectorAll('.child-' + index);
                let toggle = document.querySelector('[data-index="'+index+'"] .toggle');

                let isHidden = rows[0].style.display === 'none';

                rows.forEach(r=>{
                    r.style.display = isHidden ? '' : 'none';
                });

                toggle.textContent = isHidden ? '-' : '+';
            }

            function toggleExpandAll(btn){
                if(event) event.preventDefault();
                let allGroups = document.querySelectorAll('.parent-row');
                let firstChildGroup = document.querySelector('.child-row');

                if(!firstChildGroup) return;

                // Detectar estado actual (si el primero está oculto)
                let isHidden = firstChildGroup.style.display === 'none';

                allGroups.forEach((parentRow, index)=>{
                    let children = document.querySelectorAll('.child-' + index);
                    let toggle = parentRow.querySelector('.toggle');

                    children.forEach(r=>{
                        r.style.display = isHidden ? '' : 'none';
                    });

                    if(toggle){
                        toggle.textContent = isHidden ? '-' : '+';
                    }
                });

                btn.textContent = isHidden ? 'Contraer todo' : 'Expandir todo';
            }

            /* ===============================
            🔹 PADRE → HIJOS
            =============================== */
            function toggleChildren(parent, index){
                document.querySelectorAll('.child-' + index + ' input[type="checkbox"]')
                    .forEach(ch => ch.checked = parent.checked);

                parent.indeterminate = false;
                countSelected();
            }

            /* ===============================
            🔹 HIJOS → PADRE
            =============================== */
            function updateParent(index){

                let children = document.querySelectorAll('.child-' + index + ' input[type="checkbox"]');
                let parent = document.querySelector('[data-index="'+index+'"] input[type="checkbox"]');

                let total = children.length;
                let checked = 0;

                children.forEach(ch=>{
                    if(ch.checked) checked++;
                });

                if(checked === 0){
                    parent.checked = false;
                    parent.indeterminate = false;
                }
                else if(checked === total){
                    parent.checked = true;
                    parent.indeterminate = false;
                }
                else{
                    parent.checked = false;
                    parent.indeterminate = true;
                }

                countSelected();
            }

            /* ===============================
            🔹 PAGINACIÓN
            =============================== */
            function changePage(step){
                let url = new URL(window.location.href);
                let current = parseInt(url.searchParams.get('pg') || 1);
                url.searchParams.set('pg', current + step);
                window.location.href = url.toString();
            }

            function renderPagination(){
                document.getElementById('pageInfo').innerText =
                    'Página ' + pagination.page + ' de ' + pagination.totalPages;
            }

            function buildSelectedData(){

                let result = [];

                document.querySelectorAll('.parent-row').forEach((parentRow, index)=>{

                    let parentCheckbox = parentRow.querySelector('input[type="checkbox"]');
                    let children = document.querySelectorAll('.child-' + index);

                    let selectedChildren = [];

                    children.forEach(childRow => {

                        let checkbox = childRow.querySelector('input[type="checkbox"]');

                        if(checkbox.checked){

                            let tds = childRow.querySelectorAll('td');

                            selectedChildren.push({
                                cobertura_id: tds[3].innerText.trim(),
                                producto_id: tds[7].innerText.trim()
                            });
                        }
                    });

                    if(selectedChildren.length > 0){

                        let tdsParent = parentRow.querySelectorAll('td');

                        result.push({
                            orden_servicio_id: tdsParent[2].innerText.trim(),
                            cliente_id: tdsParent[5].innerText.trim(),
                            items: selectedChildren
                        });
                    }

                });

                return result;
            }

            /* ===============================
            🔹 INIT
            =============================== */
            render();
            renderPagination(); 
      

            </script>
            `;

            //       <div class="pagination"> 205
            //     <button class="btn" onclick="changePage(-1)">Anterior</button>
            //     <span id="pageInfo"></span>
            //     <button class="btn" onclick="changePage(1)">Siguiente</button>
            // </div>

            form.addSubmitButton({
                label: 'Procesar'
            });

            form.addResetButton({
                label: 'Cancelar'
            });

            const objeto_procesar = form.addField({
                id: 'custpage_object',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Objeto a procesar',
            });
            objeto_procesar.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // Se llena el RICHTEXT, con la información seleccioada de la tabla, en forma de objeto

            //objeto_procesar.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW });
        } catch (error) {
            log.error("ERROR _uiLista", error)
        }
    }

    function _uiMain(context, form) {
        try {
            const params = context.request.parameters;

            form.addFieldGroup({ id: 'custpage_filtros', label: 'Filtros' });

            const empresa_matriz = form.addField({
                id: 'custpage_empresa_matriz',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Empresa matriz',
                container: 'custpage_filtros'
            });

            empresa_matriz.defaultValue = params.empresa_matriz || '';

            const cliente = form.addField({
                id: 'custpage_cliente',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Cliente',
                container: 'custpage_filtros'
            });
            cliente.defaultValue = params.cliente || '';

            const tipo_certificado = form.addField({
                id: 'custpage_tipo_certificado',
                type: serverWidget.FieldType.SELECT,
                label: 'Tipo de certificado',
                container: 'custpage_filtros'
            });
            tipo_certificado.addSelectOption({ value: '0', text: '- Seleccionar -' });
            tipo_certificado.addSelectOption({ value: '1', text: 'Certificado de Venta' });
            tipo_certificado.addSelectOption({ value: '2', text: 'Certificado de Instalación' });
            tipo_certificado.isMandatory = true;
            tipo_certificado.defaultValue = params.tipo_certificado || '0';

            const tipo = form.addField({
                id: 'custpage_accion',
                type: serverWidget.FieldType.SELECT,
                label: 'Tipo de envío',
                container: 'custpage_filtros'
            });
            tipo.addSelectOption({ value: '1', text: 'Descargar' });
            tipo.addSelectOption({ value: '2', text: 'Enviar por correo' });
            tipo.defaultValue = params.tipo || '2';

            form.addField({
                id: 'custpage_destinatario',
                type: serverWidget.FieldType.EMAIL,
                label: 'Destinatario',
                container: 'custpage_filtros'
            });

            const fecha_desde = form.addField({
                id: 'custpage_fecha_desde',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Inicio',
                container: 'custpage_filtros'
            });
            fecha_desde.defaultValue = params.fecha_desde || '';
            fecha_desde.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

            const fecha_hasta = form.addField({
                id: 'custpage_fecha_hasta',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Fin',
                container: 'custpage_filtros'
            });
            fecha_hasta.defaultValue = params.fecha_hasta || '';

            const fecha = form.addField({
                id: 'custpage_fecha',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha',
                container: 'custpage_filtros'
            });
            fecha.defaultValue = new Date();
            fecha.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const seleccionados = form.addField({
                id: 'custpage_seleccionados',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Seleccionados'
            });
            seleccionados.defaultValue = `<p style="font-size:13px;"><span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> 0</p>`;
            seleccionados.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            const disenio = form.addField({
                id: 'custpage_disenio',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Diseño'
            });
            disenio.defaultValue = _getDisenioHTML();

            form.addField({
                id: 'custpage_pagina',
                type: serverWidget.FieldType.SELECT,
                label: 'Página'
            }).updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

        } catch (error) {
            log.error('ERROR _uiMain', error);
        }
    }

    function _get_ordenes_servicio_coberturas(context, form) {
        try {
            const { empresa_matriz, cliente, fecha_desde, fecha_hasta, pg } = context.request.parameters;

            // Se requiere al menos uno de los dos filtros principales
            if (!empresa_matriz && !cliente) return { success: false, data: [] };

            const pageSize = Math.max(1, parseInt(LONGITUD_PAGINA));
            let page = Math.max(1, parseInt(pg || 1));
            const params = [];

            // Filtro empresa_matriz va en el JOIN para no romper la lógica de INNER
            const whereEmpresMatriz = empresa_matriz
                ? `AND cu.parent= ?`
                : '';
            if (empresa_matriz) params.push(parseInt(empresa_matriz));

            // Filtros dinámicos en WHERE
            const whereCliente = cliente
                ? `AND cu.id = ?`
                : '';
            if (cliente) params.push(parseInt(cliente));

            const whereFechas = (fecha_desde && fecha_hasta)
                ? `AND t.trandate BETWEEN TO_DATE(?, 'DD/MM/YYYY') AND TO_DATE(?, 'DD/MM/YYYY')`
                : '';
            if (fecha_desde && fecha_hasta) params.push(fecha_desde, fecha_hasta);

            const sql = `
                SELECT DISTINCT
                    t.id                                        AS orden_servicio_id,
                    t.tranid                                    AS orden_servicio,
                    t.trandate                                  AS fecha,
                    t.entity                                    AS cliente_id,
                    REGEXP_REPLACE(cu.entitytitle, '^[A-Z]-[A-Z]+-[0-9]+\s*', '') AS cliente,
                    REGEXP_SUBSTR(cu.entitytitle, '[0-9]+')     AS cliente_num,
                    cu.email                                    AS cliente_correo,
                    b.name                                      AS codigo_vehiculo,
                    b.altname                                   AS bien,
                    b.custrecord_ht_bien_placa                  AS placa,
                    m.name                                      AS marca,
                    mo.name                                     AS modelo,
                    ti.name                                     AS tipo,
                    col.name                                    AS color_carseg,
                    b.custrecord_ht_bien_ano                    AS anio,
                    b.custrecord_ht_bien_motor                  AS motor,
                    b.custrecord_ht_bien_chasis                 AS chasis,
                    co.id                                       AS cobertura_id,
                    co.name                                     AS cobertura,
                    co.custrecord_ht_co_coberturainicial        AS fecha_instalacion,
                    co.custrecord_ht_co_coberturafinal          AS fecha_vigencia_servicio,
                    co.custrecord_ht_co_producto                AS producto_id,
                    i.displayname                               AS producto,
                    v.name,
                    v.custrecord_ht_pp_descripcion              AS descripcion,
                    p.custrecord_ht_pp_parametrizacion_valor    AS param_valor,
                    co.custrecord_ht_co_estado_cobertura        AS estado_cobertura_id,
                    ec.name                                     AS estado_cobertura,
                    co.custrecord_ht_co_estado                  AS estado_instalacion_id,
                    mc.name                                     AS estado_instalacion
                FROM transaction t
                INNER JOIN customer                                 cu  ON cu.id  = t.entity
                LEFT  JOIN customrecord_ht_ct_cobertura_transaction ct  ON ct.custrecord_ht_ct_orden_servicio = t.id
                LEFT  JOIN customrecord_ht_record_bienes             b  ON b.id  = t.custbody_ht_so_bien
                LEFT  JOIN customrecord_ht_co_cobertura             co  ON ct.custrecord_ht_ct_transacciones = co.id
                LEFT  JOIN item                                      i  ON i.id  = co.custrecord_ht_co_producto
                LEFT  JOIN customrecord_ht_pp_main_param_prod        p  ON p.custrecord_ht_pp_parametrizacionid = i.id AND p.custrecord_ht_pp_parametrizacion_valor = 317
                LEFT  JOIN customrecord_ht_cr_pp_valores             v  ON v.id  = co.custrecord_ht_co_familia_prod
                LEFT  JOIN customlist_ht_estado_cobertura           ec  ON ec.id = co.custrecord_ht_co_estado_cobertura
                LEFT  JOIN customlist_ht_mc_estado                  mc  ON mc.id = co.custrecord_ht_co_estado
                INNER JOIN customrecord_ht_bien_marca                m  ON m.id  = b.custrecord_ht_bien_marca
                INNER JOIN customrecord_ht_bn_modelo                mo  ON mo.id = b.custrecord_ht_bien_modelo
                INNER JOIN customrecord_ht_record_tipovehiculo      ti  ON ti.id = b.custrecord_ht_bien_tipo
                INNER JOIN customrecord_ht_bn_colorcarseg          col  ON col.id = b.custrecord_ht_bien_colorcarseg
                WHERE t.recordtype = 'salesorder'
                AND co.id IS NOT NULL
                AND co.custrecord_ht_co_estado = 1
                ${whereEmpresMatriz}
                ${whereCliente}
                ${whereFechas}
                ORDER BY t.entity, b.custrecord_ht_bien_placa,  t.trandate DESC`;

            const pagedData = query.runSuiteQLPaged({ query: sql, params, pageSize });
            const totalPages = pagedData.pageRanges.length;
            const totalRecords = pagedData.count;

            if (totalPages === 0) return _emptyResponse(pageSize);

            page = Math.min(page, totalPages);

            const results = pagedData
                .fetch({ index: page - 1 })
                .data
                .asMappedResults();

            _populatePageField(form, totalPages, page);

            return {
                success: true,
                data: results,
                pagination: {
                    page,
                    pageSize,
                    totalRecords,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };

        } catch (e) {
            log.error('ERROR _get_ordenes_servicio_coberturas', e);
            return { success: false, data: [], error: e.message, details: e.stack };
        }
    }

    function _emptyResponse(pageSize) {
        return {
            success: true,
            data: [],
            pagination: {
                page: 0, pageSize,
                totalRecords: 0, totalPages: 0,
                hasNextPage: false, hasPreviousPage: false
            }
        };
    }

    function _populatePageField(form, totalPages, currentPage) {
        const field = form.getField({ id: 'custpage_pagina' });
        for (let i = 1; i <= totalPages; i++) {
            field.addSelectOption({ value: i, text: String(i) });
        }
        field.defaultValue = currentPage;
    }

    function _getDisenioHTML() {
        return `
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
                setTimeout(function () {
                    const fechaDesde = document.querySelector('[data-field-name="custpage_fecha_desde"]');
                    const fechaHasta = document.querySelector('[data-field-name="custpage_fecha_hasta"]');
                    if (!fechaDesde || !fechaHasta) return;

                    const wrapper = document.createElement('div');
                    wrapper.className = 'date-group-border';

                    const legend = document.createElement('span');
                    legend.className = 'date-group-legend';
                    legend.textContent = 'Orden de servicio';

                    fechaDesde.parentNode.insertBefore(wrapper, fechaDesde);
                    wrapper.appendChild(legend);
                    wrapper.appendChild(fechaDesde);
                    wrapper.appendChild(fechaHasta);
                }, 10);
            </script>`;
    }

    return { onRequest };

});