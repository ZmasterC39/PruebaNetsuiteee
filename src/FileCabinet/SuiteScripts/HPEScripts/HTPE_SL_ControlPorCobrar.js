/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/format', 'N/render', 'N/log', 'N/url', 'N/runtime', 'N/file', 'N/encode', 'N/task'], 
(serverWidget, search, format, render, log, url, runtime, file, moduloEncode, task) => {
  
    const onRequest = (scriptContext) => {
        const { request, response } = scriptContext;
        const params = request.parameters;

        let hideZeroValue = 'T';

        if (request.method === 'POST') {
           hideZeroValue = request.parameters.custpage_hide_zero ? 'T' : 'F';
        } else {
           if (request.parameters.custpage_hide_zero === 'F' || request.parameters.custpage_hide_zero === 'false') {
               hideZeroValue = 'F';
           } else if (request.parameters.custpage_hide_zero === 'T' || request.parameters.custpage_hide_zero === 'true') {
               hideZeroValue = 'T';
           }
        }

        let hoy = new Date();
        let primerDia = new Date('2025-12-01T00:00:00');

        let primerDiaString = format.format({ value: primerDia, type: format.Type.DATE });
        let hoyString = format.format({ value: hoy, type: format.Type.DATE });

        try {
            // --- SECCIÓN INTERCEPTORA DE MAP/REDUCE (POST) ---
            if (request.method === 'POST' && (params.custpage_btn_type === 'pdf_detallado' || params.custpage_btn_type === 'excel_detallado')) {
               let tipoFormato = params.custpage_btn_type === 'pdf_detallado' ? 'PDF' : 'EXCEL';

               log.debug('Iniciando M/R', 'Formato a generar: ' + tipoFormato);
  
               // 🔹 Lista de los 5 despliegues configurados en NetSuite
               const deployments = [
                   'customdeploy_htpe_mr_procesar_rep_cxc_1',
                   'customdeploy_htpe_mr_procesar_rep_cxc_2',
                   'customdeploy_htpe_mr_procesar_rep_cxc_3',
                   'customdeploy_htpe_mr_procesar_rep_cxc_4',
                   'customdeploy_htpe_mr_procesar_rep_cxc_5'
               ];

               let scriptParams = {
                   'custscript_mr_account': params.custpage_account,
                   'custscript_mr_date_from': params.custpage_date_from,
                   'custscript_mr_date_to': params.custpage_date_to,
                   'custscript_mr_client': params.custpage_client,
                   'custscript_mr_hide_zero': params.custpage_hide_zero,
                   'custscript_mr_usuario_email': runtime.getCurrentUser().id,
                   'custscript_mr_tipo_formato': tipoFormato,
                   'custscript_mr_accounting_book': params.custpage_accounting_book
               };

               let taskId = null;
               let deploymentUsado = '';

               // 🔹 Rotación entre los 5 despliegues buscando uno disponible
               for (let i = 0; i < deployments.length; i++) {
                   try {
                       let mrTask = task.create({
                           taskType: task.TaskType.MAP_REDUCE,
                           scriptId: 'customscript_htpe_mr_procesar_rep_cxc', 
                           deploymentId: deployments[i],
                           params: scriptParams
                       });

                       taskId = mrTask.submit();
                       deploymentUsado = deployments[i];
                       break; // Salir del loop tan pronto como un deployment acepte la tarea
                   } catch (e) {
                       log.audit('Deployment ocupado', 'El despliegue ' + deployments[i] + ' está en uso. Intentando el siguiente...');
                   }
               }

               let confForm = serverWidget.createForm({ title: taskId ? 'Procesamiento Iniciado' : 'Cola de Procesos Llena' });
    
               let urlRegresar = url.resolveScript({ 
                   scriptId: runtime.getCurrentScript().id, 
                   deploymentId: runtime.getCurrentScript().deploymentId 
               });

               confForm.addButton({
                   id: 'custpage_btn_regresar',
                   label: 'Volver a Criterios de Búsqueda',
                   functionName: 'redirigirACriterios'
               });

               let msgHtml = '';

               if (taskId) {
                   msgHtml = `
                       <div style="padding:20px; background-color:#d4edda; color:#155724; border:1px solid #c3e6cb; border-radius:4px; font-size:14px; font-family:sans-serif; margin-bottom: 20px;">
                           <strong style="font-size: 16px;">¡Éxito! El proceso ha sido delegado.</strong><br><br>
                           El reporte detallado en formato <strong>${tipoFormato}</strong> se está procesando en segundo plano de manera asíncrona.<br>
                           <span style="font-family: monospace; background-color: #f1f1f1; padding: 2px 6px; border-radius: 3px;">Task ID: ${taskId}</span> | 
                           <span style="font-family: monospace; background-color: #f1f1f1; padding: 2px 6px; border-radius: 3px;">Deployment: ${deploymentUsado}</span>
                           <br><br> 
                           Dueño del volumen de datos, el archivo final se guardará en el File Cabinet y llegará directamente al correo del usuario activo al finalizar la tarea. Puede regresar a la pantalla de filtros o cerrar esta pestaña con total seguridad.
                       </div>
                   `;
               } else {
                   msgHtml = `
                       <div style="padding:20px; background-color:#f8d7da; color:#721c24; border:1px solid #f5c6cb; border-radius:4px; font-size:14px; font-family:sans-serif; margin-bottom: 20px;">
                           <strong style="font-size: 16px;">Servidores Ocupados</strong><br><br>
                           Los <strong>5 despliegues de ejecución</strong> se encuentran procesando reportes actualmente.<br>
                           Por favor, espere un par de minutos a que finalice alguna de las tareas e intente de nuevo.
                       </div>
                   `;
               }

               msgHtml += `
                   <script>
                       function redirigirACriterios() {
                          window.location.href = "${urlRegresar}";
                       }
                   </script>
               `;

               confForm.addField({
                   id: 'custpage_msg',
                   type: serverWidget.FieldType.INLINEHTML,
                   label: ' '
               }).defaultValue = msgHtml;

               return response.writePage(confForm);
            }

            // --- LÓGICA DE CONSTRUCCIÓN DEL FORMULARIO (GET y POST FILTRAR) ---
            let form = serverWidget.createForm({ title: 'Reportes de Control de Por Cobrar' });

            let btnType = form.addField({ id: 'custpage_btn_type', type: serverWidget.FieldType.TEXT, label: 'Hidden' });
            btnType.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            let filterGrp = form.addFieldGroup({ id: 'filter_grp', label: 'Filtros de Búsqueda' });
            
            let accountField = form.addField({ id: 'custpage_account', type: serverWidget.FieldType.SELECT, label: 'Cuenta Contable', container: 'filter_grp' });
            accountField.addSelectOption({ value: '4896', text: '121201 FACTURAS - BOLETAS EMITIDAS EN CARTERAS MN' });
            accountField.addSelectOption({ value: '4897', text: '121202 FACTURAS - BOLETAS EMITIDAS EN CARTERAS ME' });
            if (params.custpage_account) accountField.defaultValue = params.custpage_account;

            let clientField = form.addField({ id: 'custpage_client', type: serverWidget.FieldType.SELECT, label: 'Entidad', source: 'customer', container: 'filter_grp' });
            if (params.custpage_client) clientField.defaultValue = params.custpage_client;
          
            let hideZeroField = form.addField({ id: 'custpage_hide_zero', type: serverWidget.FieldType.CHECKBOX, label: 'Omitir Saldos 0', container: 'filter_grp' });
            hideZeroField.defaultValue = hideZeroValue;

            // FILTRO DE LIBRO CONTABLE
            let bookField = form.addField({ id: 'custpage_accounting_book', type: serverWidget.FieldType.SELECT, label: 'Libro Contable', container: 'filter_grp' });
            bookField.addSelectOption({ value: '1', text: 'Primary Accounting Book (PEN)' });
            bookField.addSelectOption({ value: '2', text: 'USD GAAP (USD)' });
            if (params.custpage_accounting_book) bookField.defaultValue = params.custpage_accounting_book;

            let dateGrp = form.addFieldGroup({ id: 'date_grp', label: 'Rango de Fechas' });
            let dateFromField = form.addField({ id: 'custpage_date_from', type: serverWidget.FieldType.DATE, label: 'Fecha Inicio', container: 'date_grp' });
            dateFromField.isMandatory = true;
            dateFromField.defaultValue = params.custpage_date_from || primerDiaString;

            // Bloquea el campo pero permite que el valor viaje en el POST
            dateFromField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            let dateToField = form.addField({ id: 'custpage_date_to', type: serverWidget.FieldType.DATE, label: 'Fecha Fin', container: 'date_grp' });
            dateToField.isMandatory = true;
            dateToField.defaultValue = params.custpage_date_to || hoyString;

            form.addSubmitButton({ label: 'Filtrar Resultados' });

            form.clientScriptModulePath = './HTPE_CS_ControlCxC.js';
          
            form.addButton({ 
               id: 'custpage_btn_detallado',  
               label: 'Generar PDF Detallado', 
               functionName: 'enviarReportePost("pdf_detallado")'
            });          
          
            form.addButton({ 
               id: 'custpage_btn_excel_detallado', 
               label: 'Exportar Excel Detallado', 
               functionName: 'enviarReportePost("excel_detallado")'
            });
          
            // --- PROCESAMIENTO SÍNCRONO (SOLO CUANDO ES FILTRAR) ---
            if (request.method === 'POST') {
                if (!params.custpage_date_from || !params.custpage_date_to) {
                    throw new Error("Las fechas de inicio y fin son obligatorias.");
                }

                let accounts = params.custpage_account ? [params.custpage_account] : ['4896', '4897'];

                let mySearch = search.load({ id: 'customsearch_pe_trx_cta_cobrar' });
                mySearch.filters = [];
                mySearch.filters.push(search.createFilter({ name: 'posting', operator: search.Operator.IS, values: 'T' }));

                // Filtro por Libro Contable en la búsqueda principal
                if (params.custpage_accounting_book) {
                    mySearch.filters.push(search.createFilter({
                        name: 'accountingbook',
                        operator: search.Operator.IS,
                        values: [params.custpage_accounting_book]
                    }));
                }

                mySearch.filters.push(search.createFilter({ 
                    name: 'formuladate',
                    formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                    operator: search.Operator.WITHIN, 
                    values: [params.custpage_date_from, params.custpage_date_to] 
                }));

                mySearch.filters.push(search.createFilter({ 
                    name: 'account', 
                    operator: search.Operator.ANYOF, 
                    values: accounts
                }));

                let pagedData = mySearch.runPaged({ pageSize: 1000 });
                let finalData = [];
                const MAX_LIMIT = 4000;
                let excedido = false;

                pagedData.pageRanges.forEach((pageRange) => {
                    if (finalData.length >= MAX_LIMIT) { excedido = true; return; }
                    let page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach((res) => {
                        if (finalData.length >= MAX_LIMIT) { excedido = true; return; }
                        let totalVal = parseFloat(res.getValue(res.columns[0])) || 0;
                        if (hideZeroValue === 'T' && Math.abs(totalVal) < 0.01) return;
                        finalData.push(res);
                    });
                });

                let msgField = form.addField({ id: 'custpage_msg_display', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
                let msgHtml = '<div style="padding:10px; border-radius:4px; margin:10px 0; font-size:14px; ';
                if (excedido) {
                    msgHtml += 'background-color:#fff3cd; color:#856404; border:1px solid #ffeeba;"><strong>Atención:</strong> Se muestran los primeros ' + MAX_LIMIT + ' registros. Use filtros para acotar.</div>';
                } else {
                    msgHtml += 'background-color:#d4edda; color:#155724; border:1px solid #c3e6cb;">Total registros: <strong>' + finalData.length + '</strong></div>';
                }
                msgField.defaultValue = msgHtml;

                let sublist = form.addSublist({ id: 'custpage_data_list', type: serverWidget.SublistType.LIST, label: 'Registros' });
                sublist.addMarkAllButtons();
              
                sublist.addField({ id: 'col_cuenta', type: serverWidget.FieldType.TEXT, label: 'CUENTA' });
                sublist.addField({ id: 'col_reg', type: serverWidget.FieldType.INTEGER, label: 'Regs' });

                finalData.forEach((res, i) => {
                    let columnas = res.columns;
                    sublist.setSublistValue({ id: 'col_cuenta', line: i, value: res.getText(columnas[0]) || " " });
                    sublist.setSublistValue({ id: 'col_reg', line: i, value: res.getValue(columnas[1]) || 0 });
                 });
            }

            let resetScript = form.addField({ id: 'custpage_reset_script', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
            resetScript.defaultValue = `
            <script>
                (function() {
                    // Desbloqueo nativo de NetSuite para clicks repetidos
                    var unlockNS = function() {
                        if (typeof NS !== 'undefined' && NS.form && NS.form.isSubmitted) {
                            NS.form.isSubmitted = false;
                        }
                    };
                    window.addEventListener('click', unlockNS);
                    window.addEventListener('mouseover', unlockNS);
                    if (typeof NS !== 'undefined' && NS.form) {
                        var originalSubmit = NS.form.onSubmit;
                        NS.form.onSubmit = function() {
                            var result = originalSubmit ? originalSubmit.apply(this, arguments) : true;
                            setTimeout(unlockNS, 1000);
                            return result;
                        };
                    }

                    // Inyección de máscara visual "Loading" al hacer submit nativo o mediante los botones
                    window.addEventListener('submit', function() {
                        if (typeof Ext !== 'undefined' && Ext.getBody) {
                            Ext.getBody().mask('Procesando solicitud, por favor espere...', 'x-mask-loading');
                        }
                    });
                })();
            </script>
            `;

            response.writePage(form);

        } catch (e) {
            log.error('ERROR_GENERAL', e);
            response.write("Error: " + e.message);
        }
    };

    return { onRequest };
});