/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/format', 'N/render', 'N/log', 'N/url', 'N/runtime', 'N/file', 'N/encode'], 
(serverWidget, search, format, render, log, url, runtime, file, moduloEncode) => {
  
    const onRequest = (scriptContext) => {
        const { request, response } = scriptContext;
        const params = request.parameters;

        let hideZeroValue = 'T'; // Por defecto la primera vez

        if (request.method === 'POST') {
           // Si es POST (Botón Filtrar), el navegador NO envía el campo si está desmarcado
           hideZeroValue = request.parameters.custpage_hide_zero ? 'T' : 'F';
        } else {
           // Si es GET (Carga de URL), validamos estrictamente qué dice el parámetro
           if (request.parameters.custpage_hide_zero === 'F' || request.parameters.custpage_hide_zero === 'false') {
               hideZeroValue = 'F';
           } else if (request.parameters.custpage_hide_zero === 'T' || request.parameters.custpage_hide_zero === 'true') {
               hideZeroValue = 'T';
           }
        }

        // --- LÓGICA DE FECHAS POR DEFECTO ---
        let hoy = new Date();
        // Primer día del mes actual
        //let primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        let primerDia = new Date('2025-12-01T00:00:00');

        // Formatear a string según la preferencia del usuario/empresa
        let primerDiaString = format.format({ value: primerDia, type: format.Type.DATE });
        let hoyString = format.format({ value: hoy, type: format.Type.DATE });
        //params.custpage_hide_zero === 'T'
        try {
            
            // Lógica de detección en el POST
       /*     if (request.method === 'POST') {
                if (params.custpage_btn_type === 'pdf') return generarPDF(request, response);
                if (params.custpage_btn_type === 'pdf_detallado') return generarPDFDetallado(request, response);
            }  */
          
            // 2. Construir el Formulario
            let form = serverWidget.createForm({ title: 'Reportes de Control de Por Pagar Diversas' });

            let btnType = form.addField({ id: 'custpage_btn_type', type: serverWidget.FieldType.TEXT, label: 'Hidden' });
            btnType.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // --- SECCIÓN DE FILTROS ---
            let filterGrp = form.addFieldGroup({ id: 'filter_grp', label: 'Filtros de Búsqueda' });
            
            let accountField = form.addField({ id: 'custpage_account', type: serverWidget.FieldType.SELECT, label: 'Cuenta Contable', container: 'filter_grp' });
            //accountField.addSelectOption({ value: '', text: '- Todas (469901 / 469902) -' });
            accountField.addSelectOption({ value: '6703', text: '469901 CUENTAS POR PAGAR DIVERSAS MN' });
            accountField.addSelectOption({ value: '6704', text: '469902 CUENTAS POR PAGAR DIVERSAS ME' });
            if (params.custpage_account) accountField.defaultValue = params.custpage_account;

/*            let clientField = form.addField({ id: 'custpage_client', type: serverWidget.FieldType.SELECT, label: 'Entidad', source: 'employee', container: 'filter_grp' });
            if (params.custpage_client) clientField.defaultValue = params.custpage_client;
*/
          
            // 1. Crear el campo de selección para el filtro
            const entityFilter = form.addField({
                id: 'custpage_client',
                type: serverWidget.FieldType.SELECT,
                label: 'A-PE-ENTIDAD',
                container: 'filter_grp'
            });
            entityFilter.addSelectOption({ value: ' ', text: '- Seleccione una Entidad -' });

            try {
                // 2. Buscamos en TRANSACCIONES para extraer los valores únicos de esa columna personalizada
                const entitySearch = search.create({
                     type: search.Type.ENTITY,
                     filters: [
                           ['isinactive', 'is', 'F'], // Opcional: transacciones no inactivas si aplica
                           'AND',
                           ['transaction.custcol_pe_entidad', 'noneof', '@NONE@']                     ],
                columns: [
                     // Agrupamos (summary) para que NetSuite elimine duplicados directamente en la base de datos
                     search.createColumn({ name: 'internalid' }),
                     search.createColumn({ name: 'entityid', sort: search.Sort.ASC }), 
                     search.createColumn({ name: 'altname' })                     ]
                 });

                 // Paginación manual para obtener hasta 4,000 registros únicos
                 let allResults = []; 
                 let startIndex = 0;
                 let endIndex = 1000;
                 const maxRecords = 4000;

                 while (startIndex < maxRecords) {
                     let pageResults = entitySearch.run().getRange({ start: startIndex, end: endIndex });
                     if (!pageResults || pageResults.length === 0) break;
        
                     allResults = allResults.concat(pageResults);        
                     if (pageResults.length < 1000) break; 

                     startIndex += 1000;
                     endIndex += 1000;
                 }

                 // 3. Poblar el campo del Suitelet con los resultados agrupados
                 allResults.forEach(result => {
                     const internalId = result.getValue({ name: 'internalid' });
                     const entityIdText = result.getValue({ name: 'entityid' }); 
                     const entityName = result.getValue({ name: 'altname' });    
      
                     const displayName = entityName ? entityName : entityIdText;
      
                     entityFilter.addSelectOption({
                        value: internalId, 
                        text: `${entityIdText} - ${displayName}`
                     });
                 });

            } catch (e) {
            log.error({ title: 'Error cargando entidades desde custcol_pe_entidad', details: e });
            }  
          
            // let hideZeroField = form.addField({ id: 'custpage_hide_zero', type: serverWidget.FieldType.CHECKBOX, label: 'Omitir Saldos 0', container: 'filter_grp' });
            // hideZeroField.defaultValue = params.custpage_hide_zero || 'T';
            
            let hideZeroField = form.addField({ id: 'custpage_hide_zero', type: serverWidget.FieldType.CHECKBOX, label: 'Omitir Saldos 0', container: 'filter_grp' });
            hideZeroField.defaultValue = params.custpage_hide_zero;

            let dateGrp = form.addFieldGroup({ id: 'date_grp', label: 'Rango de Fechas' });
            let dateFromField = form.addField({ id: 'custpage_date_from', type: serverWidget.FieldType.DATE, label: 'Fecha Inicio', container: 'date_grp' });
            dateFromField.isMandatory = true; // Obligatorio
            // Prioridad: 1. Parámetro de URL/POST, 2. Primer día del mes
            dateFromField.defaultValue = params.custpage_date_from || primerDiaString;
            if (params.custpage_date_from) dateFromField.defaultValue = params.custpage_date_from;

            let dateToField = form.addField({ id: 'custpage_date_to', type: serverWidget.FieldType.DATE, label: 'Fecha Fin', container: 'date_grp' });
            dateToField.isMandatory = true; // Obligatorio
            // Prioridad: 1. Parámetro de URL/POST, 2. Fecha de hoy
            dateToField.defaultValue = params.custpage_date_to || hoyString;
            if (params.custpage_date_to) dateToField.defaultValue = params.custpage_date_to;

            // --- BOTONES ---
            form.addSubmitButton({ label: 'Filtrar Resultados' });

            let scriptUrl = url.resolveScript({ 
                scriptId: runtime.getCurrentScript().id, 
                deploymentId: runtime.getCurrentScript().deploymentId
            });


            // Botón 1: Resumen General
/* 
            form.addButton({ 
              id: 'custpage_btn_resumen', 
              label: 'Generar PDF Resumen', 
              functionName: `(function(){ 
                 var lineCount = nlapiGetLineItemCount('custpage_data_list');
                 var selectedCount = 0;
                 for (var i = 1; i <= lineCount; i++) {
                     if (nlapiGetLineItemValue('custpage_data_list', 'col_select', i) == 'T') { selectedCount++; }
                 }
                 if (selectedCount === 0) { alert('Debe seleccionar al menos un registro.'); return false; }

                 // --- LA SOLUCIÓN AQUÍ ---
                 if (typeof NS !== 'undefined' && NS.form) {
                    NS.form.isSubmitted = false; // Desbloquea el formulario para permitir un nuevo envío
                 }
                 
                 document.getElementById("custpage_btn_type").value = "pdf"; 
                 var formHtml = document.getElementById('main_form');
                 //var oldTarget = formHtml.target;
                 
                 formHtml.target = '_blank'; 

                 //formHtml.submit();

                 // Evitamos que NetSuite piense que la página se cerró
                 //var originalBeforeUnload = window.onbeforeunload;
                 window.onbeforeunload = null; 
                 document.getElementById("submitter").click(); 

                 //  setTimeout(function(){ formHtml.target = oldTarget; }, 500);
              
                 // IMPORTANTE: Restaurar el estado después de un breve delay
                 setTimeout(function(){ 
                    //formHtml.target = oldTarget; 
                    //window.onbeforeunload = originalBeforeUnload;
                    if (typeof NS !== 'undefined' && NS.form) {
                       NS.form.isSubmitted = false; 
                    }
                 }, 1500);
               })()`
            });

            // Botón 2: Detallado
            form.addButton({ 
              id: 'custpage_btn_detallado', 
              label: 'Generar PDF Detallado', 
              functionName: `(function(){ 
                 var lineCount = nlapiGetLineItemCount('custpage_data_list');
                 var selectedCount = 0;
                 //if (window.NS && NS.form) { NS.form.isSubmitted = false; }
                 // 1. Desbloqueo total de banderas de NetSuite
                 if (typeof NS !== 'undefined' && NS.form) {
                     NS.form.isSubmitted = false;
                 }
                 document.getElementById("custpage_btn_type").value = "pdf_detallado"; // Nueva acción
                 var formHtml = document.getElementById('main_form');
                 //var oldTarget = formHtml.target;
                 
                 formHtml.target = '_blank';

                 // 3. ENVIAR DIRECTAMENTE EL FORMULARIO (Evita el bloqueo del botón "Submit")
                 //formHtml.submit();
                 
                 window.onbeforeunload = null; 
                 document.getElementById("submitter").click(); 
        
                 //setTimeout(function(){ formHtml.target = oldTarget; }, 500);

                 // IMPORTANTE: Restaurar el estado después de un breve delay
                 setTimeout(function(){ 
                    //formHtml.target = oldTarget; 
                    //window.onbeforeunload = originalBeforeUnload;
                    if (typeof NS !== 'undefined' && NS.form) {
                       NS.form.isSubmitted = false; 
                    }
                 }, 1500);
                 
              })()`
            });          
          
// Botón 3: Excel Detallado
form.addButton({ 
    id: 'custpage_btn_excel_detallado', 
    label: 'Exportar Excel Detallado', 
    functionName: `(function(){ 
        var lineCount = nlapiGetLineItemCount('custpage_data_list');
        var selectedCount = 0;
        if (typeof NS !== 'undefined' && NS.form) { NS.form.isSubmitted = false; }
        document.getElementById("custpage_btn_type").value = "excel_detallado"; 
        var formHtml = document.getElementById('main_form');
        //var oldTarget = formHtml.target;
        
        formHtml.target = '_blank'; 
        window.onbeforeunload = null; 
        document.getElementById("submitter").click(); 

        setTimeout(function(){ 
            //formHtml.target = oldTarget; 
            if (typeof NS !== 'undefined' && NS.form) { NS.form.isSubmitted = false; }
        }, 1500);
    })()`
});
*/

          // 1. Vincular el archivo cliente que acabas de subir
          // Opción A: Por ruta relativa
          form.clientScriptModulePath = './HTPE_CS_ControlPrestamoPersonal.js';
          
          // Botón 2: Detallado
          form.addButton({ 
             id: 'custpage_btn_detallado',  
             label: 'Generar PDF Detallado', 
             functionName: 'enviarReportePost("pdf_detallado")'
          });          
          
          // Botón 3: Excel Detallado
          form.addButton({ 
             id: 'custpage_btn_excel_detallado', 
             label: 'Exportar Excel Detallado', 
             functionName: 'enviarReportePost("excel_detallado")'
          });
          
            // --- LÓGICA DE PROCESAMIENTO ---
            if (request.method === 'POST') {

                // NUEVA LÍNEA:
//                if (params.custpage_btn_type === 'excel_detallado') return generarExcelDetallado(request, response);

                // 1. INTERCEPTAR EXPORTACIONES DIRECTAS (Tienen prioridad absoluta y abortan el flujo del formulario)
                if (params.custpage_btn_type === 'excel_detallado') {
                   return generarExcelDetallado(request, response);
                }
    
                if (params.custpage_btn_type === 'pdf_detallado') {
                   return generarPDFDetallado(request, response); // Asegúrate de tener tu función mapeada aquí
                }
              
                if (!params.custpage_date_from || !params.custpage_date_to) {
                    throw new Error("Las fechas de inicio y fin son obligatorias.");
                }

                let accounts = params.custpage_account ? [params.custpage_account] : ['6819', '6820', '1837']; // IDs de tus cuentas 122

                let mySearch = search.load({ id: 'customsearch_pe_trx_cta_pagar_diversas' });
                mySearch.filters = [];
                mySearch.filters.push(
                       search.createFilter({
                              name: 'posting',
                              operator: search.Operator.IS,
                              values: 'T'
                       }));

               if (params.custpage_date_from && params.custpage_date_to) {
                   mySearch.filters.push(
                       search.createFilter({ 
                              name: 'formuladate',
                              formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                              operator: search.Operator.WITHIN, 
                              values: [params.custpage_date_from, params.custpage_date_to] 
                       }));
               }
                if (params.custpage_account) {
                    mySearch.filters.push(
                           search.createFilter({ 
                                 name: 'account', 
                                 operator: search.Operator.ANYOF, 
                                 values: params.custpage_account 
                           }));
                }
                else
                {
                    mySearch.filters.push(
                           search.createFilter({ 
                                 name: 'account', 
                                 operator: search.Operator.ANYOF, 
                                 values: accounts
                           }));
                }

                // Paginación para manejar más de 1000 registros
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
                        if (params.custpage_hide_zero === 'T' && Math.abs(totalVal) < 0.01) return;
                        finalData.push(res);
                    });
                });

                // Alerta de cantidad en pantalla
                let msgField = form.addField({ id: 'custpage_msg_display', type: serverWidget.FieldType.INLINEHTML, label: ' ' });
                let msgHtml = '<div style="padding:10px; border-radius:4px; margin:10px 0; font-size:14px; ';
                if (excedido) {
                    msgHtml += 'background-color:#fff3cd; color:#856404; border:1px solid #ffeeba;"><strong>Atención:</strong> Se muestran los primeros ' + MAX_LIMIT + ' registros. Use filtros para acotar.</div>';
                } else {
                    msgHtml += 'background-color:#d4edda; color:#155724; border:1px solid #c3e6cb;">Total registros: <strong>' + finalData.length + '</strong></div>';
                }
                msgField.defaultValue = msgHtml;

                // Sublista
                let sublist = form.addSublist({ id: 'custpage_data_list', type: serverWidget.SublistType.LIST, label: 'Registros' });
                sublist.addMarkAllButtons();
              
                sublist.addField({ id: 'col_cuenta', type: serverWidget.FieldType.TEXT, label: 'CUENTA' });
                sublist.addField({ id: 'col_reg', type: serverWidget.FieldType.INTEGER, label: 'Regs' });

                // 2. Llenar la sublista recorriendo finalData
                // Usamos el segundo parámetro del forEach para obtener el índice de la línea (i)
                finalData.forEach((res, i) => {
                    // Obtenemos las columnas de la búsqueda para extraer los valores
                    let columnas = res.columns;

                    sublist.setSublistValue({ 
                        id: 'col_cuenta', 
                        line: i, 
                        value: res.getText(columnas[0]) || " " 
                    });

                    sublist.setSublistValue({ 
                        id: 'col_reg', 
                        line: i, 
                        value: res.getValue(columnas[1]) || 0 
                    });
                 });
            }

            // --- AGREGAR EL RESET SCRIPT AQUÍ ---
            let resetScript = form.addField({
                id: 'custpage_reset_script',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
             });

            /* resetScript.defaultValue = `
             <script>
             // Esta función se ejecuta en el navegador del usuario
             // Desbloquea el flag de NetSuite cada vez que el usuario hace un clic
             window.addEventListener('mousedown', function() {
                if (typeof NS !== 'undefined' && NS.form) {
                   NS.form.isSubmitted = false;
                }
              });
              </script>
              `;*/

resetScript.defaultValue = `
<script>
    (function() {
        // Desbloqueo continuo cada vez que el mouse se mueve o hace click
        var unlockNS = function() {
            if (typeof NS !== 'undefined' && NS.form && NS.form.isSubmitted) {
                NS.form.isSubmitted = false;
            }
        };
        window.addEventListener('click', unlockNS);
        window.addEventListener('mouseover', unlockNS);
        
        // Sobrescribir la función nativa de NetSuite que bloquea el form
        if (typeof NS !== 'undefined' && NS.form) {
            var originalSubmit = NS.form.onSubmit;
            NS.form.onSubmit = function() {
                var result = originalSubmit ? originalSubmit.apply(this, arguments) : true;
                // Forzamos el desbloqueo después de un segundo de haber enviado
                setTimeout(unlockNS, 1000);
                return result;
            };
        }
    })();
</script>
`;

              // Finalmente, envías el formulario a la respuesta
     
            response.writePage(form);

        } catch (e) {
            log.error('ERROR_GENERAL', e);
            response.write("Error: " + e.message);
        }
    };

    function generarPDF(request, response) {
        const params = request.parameters;
        const [saldosInicialesMap,saldosInicialesMapUSD] = obtenerSaldosPorCuenta(params); // Obtenemos el mapa de saldos { "Cuenta A": 100, "Cuenta B": 200 }
        const ID_LOGO_CABINET = '2240'; 
        let logoUrl = '';

        try {
            // Cargamos el archivo para obtener su URL interna de NetSuite
            const logoFile = file.load({ id: ID_LOGO_CABINET });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
        
            // Unimos el dominio con la URL relativa del archivo
            logoUrl = 'https://' + domain + logoFile.url;

            // --- VISUALIZAR EN EL LOG ---
            log.debug({
                title: 'URL del Logo para PDF',
                details: logoUrl
            });

         } catch (err) {
            log.error('Error cargando logo', err);
         }

         const escapeXml = (str) => {
            if (!str) return "";
            return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        };
      
        let totalReg = 0;
        let lineCount = request.getLineCount({ group: 'custpage_data_list' });
        let rowIndexGlobal = 1; // Correlativo para la columna #
        let dataPorCuenta = {};
        let granTotalMovimientos = 0;
      
        for (let i = 0; i < lineCount; i++) {
            let sel = request.getSublistValue({ group: 'custpage_data_list', name: 'col_select', line: i });
            if (sel === 'T' || sel === true) {
                totalReg++;
                let cta = escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_cuenta', line: i }));
                if (!dataPorCuenta[cta]) dataPorCuenta[cta] = { lineas: [], tMN: 0, tME: 0, tT: 0 };

                let valMN = parseFloat(request.getSublistValue({ group: 'custpage_data_list', name: 'col_mn', line: i })) || 0;
                let valME = parseFloat(request.getSublistValue({ group: 'custpage_data_list', name: 'col_me', line: i })) || 0;
                let valT = parseFloat(request.getSublistValue({ group: 'custpage_data_list', name: 'col_total', line: i })) || 0;

                dataPorCuenta[cta].lineas.push({
                    idx: rowIndexGlobal++, // Guardamos el número de fila
                    cli: escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_empleado', line: i })),
                    mon: escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_moneda', line: i })),
                    mn: valMN.toFixed(2), 
                    me: valME.toFixed(2), 
                    tot: valT.toFixed(2)
                });
                dataPorCuenta[cta].tMN += valMN; 
                dataPorCuenta[cta].tME += valME; 
                dataPorCuenta[cta].tT += valT;
                granTotalMovimientos += valT;
            }
        }

        let xmlStr = '<?xml version="1.0" encoding="UTF-8"?>';
        xmlStr += '<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xmlStr += '<pdf><head>';
        xmlStr += '<macrolist>';
        xmlStr += '  <macro id="myheader">';
        xmlStr += '    <table style="border:none;"><tr>';
        xmlStr += '      <td style="border:none; width:30%; align:left;"><img src="' + escapeXml(logoUrl) + '" style="width:120px; height:60px;"/></td>';
        xmlStr += '      <td style="border:none; width:40%; align:center;"><p style="font-size:14pt; font-weight:bold;">Reporte Cuentas por Pagar</p><p style="font-size:9pt;">Seleccionados: ' + totalReg + '</p></td>';
        xmlStr += '      <td style="border:none; width:30%; align:right;"><p style="font-size:8pt;">Fecha: ' + new Date().toLocaleDateString() + '</p></td>';
        xmlStr += '    </tr></table>';
        xmlStr += '  </macro>';
        xmlStr += '  <macro id="myfooter"><table style="border:none; width:100%;"><tr><td align="right" style="font-size:8pt;">Página <pagenumber/> de <totalpages/></td></tr></table></macro>';
        xmlStr += '</macrolist>';
        xmlStr += '<style>';
        xmlStr += 'body { font-family: sans-serif; font-size: 8pt; color: #333; }';
        xmlStr += 'table { width: 100%; border-collapse: collapse; margin-top: 10px; }';
        xmlStr += 'th { color: #ff0000; font-weight: bold; padding: 5px; border: 0.5pt solid #333; font-size: 7pt; background-color: #ffffff; }';
        xmlStr += 'td { border: 0.5pt solid #cccccc; padding: 4px; font-size: 8pt; }';
        xmlStr += '.cta-row { background-color: #f2f2f2; font-weight: bold; color: #003366; }';
        xmlStr += '.total-row { background-color: #e6f2ff; font-weight: bold; }';
        xmlStr += '</style></head>';
        xmlStr += '<body size="letter" header="myheader" header-height="1.2in" footer="myfooter" footer-height="0.5in" padding="0.5in">';

        for (let cta in dataPorCuenta) {
            // Obtenemos el saldo inicial específico de ESTA cuenta
            let saldoInicialDeEstaCuenta = saldosInicialesMap[cta] || 0;
            let saldoFinalDeEstaCuenta = saldoInicialDeEstaCuenta + dataPorCuenta[cta].tT;
                      
            log.debug({
                title: 'Saldo inicial',
                details: saldoInicialDeEstaCuenta
            });
          
            //xmlStr += '<table><thead><tr class="cta-row"><td colspan="5" style="font-size:11pt; padding:8px;">CUENTA: ' + cta + '</td></tr>';
            
            xmlStr += '<table><thead>';
            xmlStr += '<tr class="cta-row">';
            xmlStr += '<td colspan="2" style="font-size:10pt; padding:8px;">CUENTA: ' + cta + '</td>';
            xmlStr += '<td align="right" colspan="3">Saldo Inicial AL ' + params.custpage_date_from + ':</td>';
            xmlStr += '<td align="right">' + formatNumberPE(saldoInicialDeEstaCuenta.toFixed(2)) + '</td></tr>';
            
            xmlStr += '<tr>';
            xmlStr += '<th align="center" width="5%">#</th>';
            xmlStr += '<th align="center" width="43%">empleado</th>';
            xmlStr += '<th align="center" width="12%">MON</th>';
            xmlStr += '<th align="center" width="13%">SALDO MN</th>';
            xmlStr += '<th align="center" width="13%">SALDO ME</th>';
            xmlStr += '<th align="center" width="14%">TOTAL</th></tr>';
            xmlStr += '</thead>';
          
             dataPorCuenta[cta].lineas.forEach(l => {
                xmlStr += '<tr>';
                xmlStr += '<td align="center">' + l.idx + '</td>';
                xmlStr += '<td>' + l.cli + '</td>';
                xmlStr += '<td align="center">' + l.mon + '</td>';
                xmlStr += '<td align="right">' + formatNumberPE(l.mn) + '</td>';
                xmlStr += '<td align="right">' + formatNumberPE(l.me) + '</td>';
                xmlStr += '<td align="right">' + formatNumberPE(l.tot) + '</td></tr>';
             //   xmlStr += '<tr><td align="center">' + l.idx + '</td><td>' + l.cli + '</td><td align="center">' + l.mon + '</td><td align="right">' + l.ini + '</td><td align="right">' + l.mn + '</td><td align="right">' + l.me + '</td><td align="right">' + l.tot + '</td></tr>';
            });
          
            // Totales Finales
            //let saldoFinalCuenta = saldoInicialCabecera + dataPorCuenta[cta].tMov;

            log.debug({
                title: 'Saldo Final',
                details: saldoFinalDeEstaCuenta
            });
  

            xmlStr += '<tr class="total-row">';
            xmlStr += '<td colspan="3" align="right">SUBTOTAL:</td>';
            xmlStr += '<td align="right">' + formatNumberPE(dataPorCuenta[cta].tMN.toFixed(2)) + '</td>';
            xmlStr += '<td align="right">' + formatNumberPE(dataPorCuenta[cta].tME.toFixed(2)) + '</td>';
            xmlStr += '<td align="right">' + formatNumberPE(dataPorCuenta[cta].tT.toFixed(2)) + '</td></tr>';
            xmlStr += '<tr class="total-row">';
            xmlStr += '<td colspan="5" align="right">TOTAL:</td>';
            xmlStr += '<td align="right">'+ formatNumberPE(saldoFinalDeEstaCuenta.toFixed(2)) + '</td></tr></table>';
        }
        xmlStr += '</body></pdf>';
        response.renderPdf({ xmlString: xmlStr });
    }


function generarPDFDetallado(request, response) {
    try {
       // Obtiene el dominio actual de la aplicación (ej: 123456.app.netsuite.com)
        const domainSystem = url.resolveDomain({
              hostType: url.HostType.APPLICATION
        });
        const params = request.parameters;
        const lineCount = request.getLineCount({ group: 'custpage_data_list' });
        const ID_LOGO_CABINET = '2240'; 
        let logoUrl = '';

        const [saldosInicialesMap, saldosInicialesMapUSD] = obtenerSaldosPorCuenta(params); // Obtenemos el mapa de saldos { "Cuenta A": 100, "Cuenta B": 200 }

        try {
            // Cargamos el archivo para obtener su URL interna de NetSuite
            const logoFile = file.load({ id: ID_LOGO_CABINET });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
        
            // Unimos el dominio con la URL relativa del archivo
            logoUrl = 'https://' + domain + logoFile.url;

            // --- VISUALIZAR EN EL LOG ---
            /*log.debug({
                title: 'URL del Logo para PDF Detallado',
                details: logoUrl
            });*/

         } catch (err) {
            log.error('Error cargando logo', err);
         }

         const escapeXml = (str) => {
            if (!str) return "";
            return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
         };
   
         // 2. Búsqueda Única (Optimización de Gobernanza)
         let dataAgrupada = {}; 
 
         const [saldosIniciales, saldosInicialesUSD]  = obtenerSaldosInicialesxCtaxCli(params);

         // --- VISUALIZAR EN EL LOG ---
         /* log.audit({
               title: 'saldosIniciales',
               details: saldosIniciales 
            });*/

         // 4. MOVIMIENTOS DEL PERIODO
         let dSearch = search.load({ id: 'customsearch_pe_pagar_diversa__4699_2' });
         dSearch.filters = [];     
         // -----------------------------------------------------------------
         // REGLA DE ORO: Limpiar y redefinir el ordenamiento nativo en columnas 
         // para evitar que NetSuite rompa los filtros por conflicto de Sort.
         // -----------------------------------------------------------------
         let nuevasColumnas = [];   
         dSearch.columns.forEach(function(col) {
            // Clonamos la columna desactivando cualquier ordenamiento previo de la búsqueda guardada
            let configCol = {
                name: col.name,
                join: col.join || null,
                summary: col.summary || null
            };

            // Forzamos el SORT ASCENDENTE únicamente en los 3 niveles internos requeridos
            if (col.name === 'custcol_pe_entidad' && col.join === 'transaction') {
                // Nueva columna agregada al ordenamiento
                configCol.sort = search.Sort.ASC;
            } else if (col.name === 'custcol1' && col.join === 'transaction') {
                configCol.sort = search.Sort.ASC;
            } else if (col.name === 'trandate' && col.join === 'transaction') {
                configCol.sort = search.Sort.ASC;
            }

            nuevasColumnas.push(search.createColumn(configCol));
         });
         dSearch.columns = nuevasColumnas; 

         // --- ASIGNACIÓN DE FILTROS ---
         if (params.custpage_account && params.custpage_account.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'account', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_account 
             }));
         }

         if (params.custpage_date_from && params.custpage_date_to) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'formuladate',
                  formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                  operator: search.Operator.WITHIN, 
                  values: [params.custpage_date_from, params.custpage_date_to] 
             }));
         }

         // Filtro de Posting
         dSearch.filters.push(search.createFilter({ 
              name: 'posting', 
              operator: search.Operator.IS, // Corregido WITHIN por IS para campos Booleanos nativos
              values: ['T'] 
         }));

         // Filtro de Clientes/Entidades seleccionadas

         // 1. Convertimos a string y eliminamos los espacios en blanco
         var clienteId = params.custpage_client ? params.custpage_client.toString().trim() : '';
         // 2. Evaluamos si quedó un valor real (si era ' ', ahora será '')
         if (clienteId !== '') {
            dSearch.filters.push(search.createFilter({ 
                name: 'custcol_pe_entidad', 
                join: 'transaction',   
                operator: search.Operator.ANYOF, 
                values: clienteId // Pasamos el ID limpio
            }));
         }
         /*if (params.custpage_client && params.custpage_client.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'custcol_pe_entidad', 
                  join: 'transaction',   
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_client // Corregido: Se pasa el array directo, sin envolverlo en corchetes otra vez
              }));
         }*/
      
         log.audit({
              title: 'Filtros Aplicados',
              details: 'params.custpage_account: ' + params.custpage_account + ' | params.custpage_date_from: ' + params.custpage_date_from + ' | params.custpage_date_to: ' + params.custpage_date_to + ' | params.custpage_client: ' + params.custpage_client + ' | params.custpage_hide_zero: ' + params.custpage_hide_zero
         });
          
         // Orden crucial para el quiebre
         let colAccount = search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC });
         let colPeEntidad = search.createColumn({ name: 'custcol_pe_entidad', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC });
         let colCustCol1 = search.createColumn({ name: 'custcol1', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC });
         let colTranDate = search.createColumn({ name: 'trandate', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC });
         let colTranId = search.createColumn({ name: 'tranid', join: 'transaction', summary: search.Summary.GROUP });
         let colType = search.createColumn({ name: 'type', join: 'transaction', summary: search.Summary.GROUP });
         let colCurrency = search.createColumn({ name: 'currency', join: 'transaction', summary: search.Summary.GROUP });   
         let colDebitMn = search.createColumn({
              name: 'formulanumericdebitmn',
              formula: "CASE WHEN {accountingbookid} = '1' THEN {debitamount} ELSE 0 END", 
              summary: search.Summary.SUM
         });
         let colCreditMn = search.createColumn({
              name: 'formulanumericcreditmn',
              formula: "CASE WHEN {accountingbookid} = '1' THEN {creditamount} ELSE 0 END", 
              summary: search.Summary.SUM
         });
         let colAmtMn = search.createColumn({
              name: 'formulanumeric1',
              formula: "CASE WHEN {accountingbookid} = '1' THEN {amount} ELSE 0 END", 
              summary: search.Summary.SUM
          });
          let colDebitMe = search.createColumn({
              name: 'formulanumericdebitme',
              formula: "CASE WHEN {accountingbookid} = '2' THEN {debitamount} ELSE 0 END", 
              summary: search.Summary.SUM
          });
          let colCreditMe = search.createColumn({
              name: 'formulanumericcreditme',
              formula: "CASE WHEN {accountingbookid} = '2' THEN {creditamount} ELSE 0 END", 
              summary: search.Summary.SUM
          });
          // AGREGAMOS LA FÓRMULA AQUÍ
          let colAmtMe = search.createColumn({
              name: 'formulanumeric2',
              formula: "CASE WHEN {accountingbookid} = '2' THEN {amount} ELSE 0 END", 
              summary: search.Summary.SUM
          });   
          let colMemo = search.createColumn({ name: 'memo',  join: 'transaction', summary: search.Summary.GROUP });
          let colInternalId = search.createColumn({ name: 'internalid', join: 'transaction', summary: search.Summary.GROUP });

          // Asignar el arreglo ordenado a la búsqueda
          dSearch.columns = [
              colAccount, colPeEntidad, colCustCol1, 
              colTranDate, colTranId, colType, colCurrency, colDebitMn, colCreditMn, 
              colAmtMn, colDebitMe, colCreditMe, colAmtMe, colMemo, colInternalId
          ];
      
          let tree = {};
          let counttree = 0;
          let cacheEntidades = {}; // Para no hacer búsquedas repetidas del mismo cliente y optimizar rendimiento
      
          // 1. Ejecutar la búsqueda de forma paginada (1000 registros por página)
          let pagedDataMovs = dSearch.runPaged({ pageSize: 1000 });

          pagedDataMovs.pageRanges.forEach((pageRange) => {
             let page = pagedDataMovs.fetch({ index: pageRange.index })
        
             page.data.forEach((res) => {
                counttree++;
                let cta = res.getText(colAccount);

                // =================================================================
                // ESTRATEGIA DEFECTO: EXTRACCIÓN Y BÚSQUEDA DINÁMICA DE LA ENTIDAD
                // =================================================================
                let entidadIdInterno = res.getValue(colPeEntidad) || ""; // Usamos el ID como llave única
                let entidadNombreStandard = res.getText(colPeEntidad);
                let entidadAltName = "";
                let entidadCodigoReal = ""; // Variable para guardar el código (E-PE-...)

                if (entidadIdInterno !== "") {
                   // Si el nombre comercial no está en memoria Caché, lo buscamos una sola vez en NetSuite
                   if (!cacheEntidades[entidadIdInterno]) {
                      try {
                          let lookupEntidad = search.lookupFields({
                             type: 'entity', // 'entity' sirve para clientes, proveedores y empleados
                             id: entidadIdInterno,
                             columns: ['altname', 'entityid']
                          });
                          cacheEntidades[entidadIdInterno] = {
                             altname: lookupEntidad.altname || "",
                             entityid: lookupEntidad.entityid || ""
                          };
                      } catch (errLookup) {
                          cacheEntidades[entidadIdInterno] = { altname: "", entityid: "" };
                      }
                }
                entidadAltName = cacheEntidades[entidadIdInterno].altname;
                entidadCodigoReal = cacheEntidades[entidadIdInterno].entityid; // 👈 CAPTURAMOS EL CÓDIGO REAL
             }

               
             // El nombre real que mostraremos en la fila gris del PDF
             let empleadoNombreFormateado = entidadAltName ? entidadAltName : (entidadNombreStandard ? entidadNombreStandard : entidadIdInterno);
             // let cli = entidadNombreStandard || "OTROS";
             // Asignación final sin errores de campo: usa AltName si existe, sino recurre a respaldos planos
             //let empleado = entidadAltName ? entidadAltName : (entidadNombreStandard ? entidadNombreStandard : entidadIdInterno);             // --- VISUALIZAR EN EL LOG ---
             /*log.audit({
                title: 'Movimientos',
                details:  'cli: ' + cli + ' | empleado: ' + empleado 
               });*/
             // =================================================================  
            
             //let cli = res.getText({ 
             //    name: 'custcol_pe_entidad', 
             //    join: 'transaction', 
             //    summary: search.Summary.GROUP 
             //}) || "OTROS"; // Valor por defecto para las que no tienen empleado
            
             // Extraer el valor de la fórmula
             let docRef = res.getValue(colCustCol1) || "S/R"; // S/R = Sin Referencia
             let doc = res.getValue(colTranId) || "S/N"; 

             // Declaramos estas variables aquí para poder usarlas abajo
             let fec = res.getValue(colTranDate);
             let tip = res.getText(colType);
             let mon = res.getText(colCurrency);
             let debitamtmn = parseFloat(res.getValue(colDebitMn)) || 0;
             let creditamtmn = parseFloat(res.getValue(colCreditMn)) || 0;
             let amt = parseFloat(res.getValue(colAmtMn)) || 0;
             let debitamtme = parseFloat(res.getValue(colDebitMe)) || 0;
             let creditamtme = parseFloat(res.getValue(colCreditMe)) || 0;
             let amtUSD = parseFloat(res.getValue(colAmtMe)) || 0;
    
             let mem = res.getValue(colMemo);
             let tranIdInterno = res.getValue(colInternalId);

             // --- VISUALIZAR EN EL LOG ---
             /*log.audit({
                 title: 'Movimientos',
                 details: 'counttree: ' + counttree + ' | cta: ' + cta + ' | empleadoNombreFormateado: ' + empleadoNombreFormateado + ' | docRef: ' + docRef + ' | doc: ' + doc + ' | fec: ' + fec + ' | tip: ' + tip + ' | mon: ' + mon + ' | amt:' + amt + ' | mem: ' + mem
               });*/
          
             if (!tree[cta]) tree[cta] = {};
             if (!tree[cta][entidadIdInterno]) {
                tree[cta][entidadIdInterno] = { 
                     nombreMostrar: empleadoNombreFormateado, // 👈 Guardamos el Nombre Comercial / Razón Social aquí
                     entityIdReal: entidadCodigoReal, // 👈 SOLUCIÓN CRUCIAL: Ahora el ordenamiento del XML sí tendrá de dónde leer
                     movimientos: {}, 
                     totalAmt: 0,    // <--- ACUMULADOR NUEVO
                     totalAmtUSD: 0  // <--- ACUMULADOR NUEVO
                 };
             }
          
             if (!tree[cta][entidadIdInterno].movimientos[docRef]) {
                 tree[cta][entidadIdInterno].movimientos[docRef] = [];
             }

             tree[cta][entidadIdInterno].movimientos[docRef].push({
                 doc: doc,
                 fec: fec,
                 tip: tip,
                 mon: mon,
                 debitamtmn: debitamtmn,
                 creditamtmn: creditamtmn,
                 amt: amt,
                 debitamtme: debitamtme,
                 creditamtme: creditamtme,
                 amtUSD: amtUSD,
                 mem: mem,
                 idInterno: tranIdInterno
             });

             // SUMAMOS AQUÍ MISMO (Solo una vez)
             tree[cta][entidadIdInterno].totalAmt += amt;
             tree[cta][entidadIdInterno].totalAmtUSD += amtUSD;
             //return true;
         });
         // --- VISUALIZAR EN EL LOG ---
         /*log.audit({
              title: 'LOG counttree 1',
              details: counttree
             });*/
         });
      
         // --- CORRECCIÓN: Si no viene o es diferente de 'T', asegúrate de que sea 'F' ---
         //var checkFiltrar = (params.custpage_hide_zero === 'T') ? 'T' : 'F';

         // 1. Capturamos lo que viene del parámetro
         var paramHideZero = request.parameters.custpage_hide_zero;
         var checkFiltrar = false;
         if (paramHideZero === 'T' || paramHideZero === true || paramHideZero === 'true') {
            checkFiltrar = true;
         }
         // --- LOG DE CONTROL PARA VERIFICAR ---
         log.audit({
             title: 'Control de Checkbox Desmarcado',
             details: 'Valor crudo: ' + paramHideZero + ' | Resultado lógico (checkFiltrar): ' + checkFiltrar
         });
         //var checkFiltrar = (request.parameters.custpage_hide_zero === 'T');
      
         // 5. GENERACIÓN XML
         const esc = (s) => s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "") : "";
         let countrecord = 0;
         let xml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
         xml += '<pdf><head><macrolist><macro id="h"><table style="width:100%;"><tr>';
         xml += '<td width="30%">' + (logoUrl ? '<img src="' + esc(logoUrl) + '" style="width:100px;height:45px;"/>' : '') + '</td>';
         xml += '<td width="40%" align="center" style="font-size:12pt;"><b>CUENTAS POR PAGAR DIVERSAS</b></td>';
         xml += '<td width="30%" align="right" style="font-size:7pt;">' + esc(params.custpage_date_from) + ' al ' + esc(params.custpage_date_to) + '</td>';
         xml += '</tr></table></macro></macrolist>';
         xml += '<style>body{font-family:sans-serif;font-size:7pt;} table{width:100%;border-collapse:collapse;margin-top:5px;table-layout:fixed;} .cta{background-color:#1a252f;color:white;font-weight:bold;padding:4px;} .cli{background-color:#d5dbdb;font-weight:bold;padding:3px;} th{background-color:#566573;color:white;font-weight:bold;} td{border:0.1pt solid #bdc3c7;padding:2px; vertical-align: middle;}</style></head>';
         //xml += '<body size="letter-landscape" header="h" header-height="0.8in" padding="0.4in">';
         xml += '<body size="letter" header="h" header-height="0.8in" padding="0.4in">';

         // Justo antes de empezar el bucle: for (let cKey in tree)
         let treeKeys = Object.keys(tree);
         if (treeKeys.length === 0) {
            xml += '<table style="width:100%; margin-top:20px;">';
            xml += '<tr><td align="center" style="font-size:12pt; border:none;">No se encontraron movimientos de Cuentas por Pagar Diversas para los criterios seleccionados.</td></tr>';
            xml += '</table>';
         } else {
            // 1. ORDENAR EL NIVEL 1: CUENTAS
            let cuentasOrdenadas = Object.keys(tree).sort();
            cuentasOrdenadas.forEach(function(cKey) {
               //for (let cKey in tree) {
               let mCta = 0;
               let mCtaUSD = 0;
               let saldoInicialDeEstaCuenta = saldosInicialesMap[cKey] || 0;
               let saldoInicialDeEstaCuentaUSD = saldosInicialesMapUSD[cKey] || 0;

               // 💡 SOLUCIÓN: Definimos isMonedaNacional en el nivel de CUENTA para que sea accesible abajo
               let isMonedaNacional = cKey.indexOf('469901') !== -1;
              
               // --- NIVEL 1: CUENTA ---
               xml += '<table style="margin-top:15px; border:1pt solid black;">';
               xml += '<tr class="cta">';
               xml += '<td width="70%">CUENTA: ' + esc(cKey) + '</td>';
               xml += '<td width="18%" align="right">SALDO INICIAL: </td>';
               if (isMonedaNacional) {
                  xml += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuenta) + '</td>';
               } else {
                  xml += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuentaUSD) + '</td>';
               }
               xml += '</tr>';
               xml += '</table>';
          
               // =================================================================
               // 2. ORDENAR EL NIVEL 2: ID DE ENTIDAD REAL (Efecto P-PE-0001)
               // =================================================================
               let clientesOrdenados = Object.keys(tree[cKey]).sort(function(a, b) {
                   let idA = (tree[cKey][a].entityIdReal || a).toString().toUpperCase();
                   let idB = (tree[cKey][b].entityIdReal || b).toString().toUpperCase();
                   return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
               });

               // Iteramos de forma controlada y ordenada por el código de entidad
               clientesOrdenados.forEach(function(lKey) {
                   let empleadoData = tree[cKey][lKey];

                   empleadoData.totalAmt = parseFloat(empleadoData.totalAmt.toFixed(2));
                   empleadoData.totalAmtUSD = parseFloat(empleadoData.totalAmtUSD.toFixed(2));
                 
                   // --- VISUALIZAR EN EL LOG ---
                   /*log.audit({
                      title: 'Validar CERO TOTAL',
                      details: 'lkey : ' + lKey + ' | checkFiltrar: ' + checkFiltrar + ' | params.custpage_hide_zero: ' + params.custpage_hide_zero +  ' | empleadoData.totalAmt: ' + empleadoData.totalAmt + ' | empleadoData.totalAmtUSD: ' + empleadoData.totalAmtUSD 
                   });*/
   
                   // 💡 NUEVA VALIDACIÓN: Si el total acumulado de movimientos del cliente es cero, lo ignoramos por completo
                   if (checkFiltrar === true) {
                       if (isMonedaNacional && empleadoData.totalAmt === 0) {
                           return; 
                       } else if (!isMonedaNacional && empleadoData.totalAmtUSD === 0) {
                           return; 
                       }
                   }
                 
                   let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
                   let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
        
                   let mCli = 0;
                   let mCliUSD = 0;
                   let mSaldo = sCliIni;
                   let mSaldoUSD = sCliIniUSD;

  
                   countrecord++;

                   let codigoEntidadReal = empleadoData.entityIdReal || lKey; 
                   let nombreComercialEmpleado = empleadoData.nombreMostrar || lKey; 
        
                   // --- NIVEL 2: empleado / cliente ---
                   xml += '<table style="margin-top:5px;">';
                   xml += '<tr class="cli">';
                   xml += '<td width="70%" colspan="8">' + countrecord + ' - ' + esc(codigoEntidadReal) + ' - ' + esc(nombreComercialEmpleado) + ' :</td>';
                   /*xml += '<td width="18%" align="right">SALDO INICIAL: </td>';
                   xml += '<td width="12%" align="right">' + formatNumberPE(isMonedaNacional ? sCliIni : sCliIniUSD) + '</td>';*/
                   xml += '</tr>';
                   xml += '</table>';
              
                   xml += '<table style="margin-top:5px;">';
                   xml += '<tr>';
                   xml += '<th width="9%" align="center">DocRef</th>';
                   xml += '<th width="8%" align="center">Fecha</th>';
                   xml += '<th width="10%" align="center">Tipo</th>';
                   xml += '<th width="12%" align="center">Documento</th>';
                   xml += '<th width="22%" align="center">Glosa</th>';

                   if (isMonedaNacional) {
                      xml += '<th width="9%" align="center">DebitoMN</th>';
                      xml += '<th width="9%" align="center">CreditoMN</th>';
                      xml += '<th width="9%" align="center">Monto</th>';
                   } else {
                      xml += '<th width="9%" align="center">DebitoME</th>';
                      xml += '<th width="9%" align="center">CreditoME</th>';
                      xml += '<th width="9%" align="center">Monto USD</th>';
                   }
                   xml += '<th width="12%" align="center">Saldo</th>';
                   xml += '</tr>';

                   // =================================================================
                   // 3, 4 y 5. ORDENAR INTERNAMENTE: CUSTCOL1 (dKey), NRO LINEA, FECHA
                   // =================================================================
                   // Como dKey es la propiedad del objeto movimientos mapeada desde colCustCol1,
                   // extraer las llaves y ordenarlas asegura que Custcol1 vaya en orden Ascendente.
                   let docRefsOrdenados = Object.keys(empleadoData.movimientos).sort();

                   docRefsOrdenados.forEach(function(dKey) {
                      // for (let dKey in empleadoData.movimientos) {
                      let movs = empleadoData.movimientos[dKey];
           
                      let mDoc = 0;
                      let mDocUSD = 0;
                      let mDebitoMN = 0;
                      let mCreditoMN = 0;
                      let mDebitoME = 0;
                      let mCreditoME = 0;

                      // 1. Pre-cálculo de montos para validar el quiebre por documento
                      movs.forEach(m => {
                          mDoc += (m.amt || 0);
                          mDocUSD += (m.amtUSD || 0); 
                          mDebitoMN += (m.debitamtmn || 0);
                          mCreditoMN +=  (m.creditamtmn || 0);
                          mDebitoME += (m.debitamtme || 0);
                          mCreditoME +=  (m.creditamtme || 0);
                      });

                      mDoc = parseFloat(mDoc.toFixed(2));
                      mDocUSD = parseFloat(mDocUSD.toFixed(2));

                      // --- VISUALIZAR EN EL LOG ---
                      /*log.audit({
                          title: 'Validar CERO doc',
                          details: 'lkey : ' + lKey + '| dKey :' + dKey + ' | checkFiltrar: ' + checkFiltrar + ' | params.custpage_hide_zero: ' + params.custpage_hide_zero +  ' | mDoc: ' + mDoc + ' | mDocUSD: ' + mDocUSD 
                       });*/
                      let ocultarDocumento = false;
                      // 👇 NUEVA VALIDACIÓN: Quiebre por Documento dKey en CERO 👇
                      if (checkFiltrar === true) {
                         if (isMonedaNacional && mDoc === 0) {
                            ocultarDocumento = true; // Flag activado, pero NO hacemos return aún para no romper saldos
                         } 
                         else if (!isMonedaNacional && mDocUSD === 0) {
                            ocultarDocumento = true; //return; // Salta este documento dKey
                         }
                      }

                      // 2. Si el documento NO es cero (o no se filtra), acumulamos en el cliente y dibujamos el XML
                      //docRefsOrdenados.forEach(function(dummy) {}); // (Solo de referencia visual del flujo)
                     // 💡 SOLUCIÓN MAESTRA: Solo pintamos si NO debe ocultarse
                     if (!ocultarDocumento) {
                       movs.forEach(m => {
                          // Sumas para totales superiores
                          mCli += (m.amt || 0);
                          mCliUSD += (m.amtUSD || 0);
                          mCta += (m.amt || 0);
                          mCtaUSD += (m.amtUSD || 0);
        
                          mSaldo += (m.amt || 0);
                          mSaldoUSD +=  (m.amtUSD || 0);

                          // Construimos la URL interna de NetSuite para ver la transacción
                          // El parámetro 'id' es el internalid del registro
                          let linkTransaccion = 'https://' + domainSystem + '/app/accounting/transactions/transaction.nl?id=' + m.idInterno;

                          xml += '<tr>';
                          xml += '<td>' + esc(dKey) + '</td>';
                          xml += '<td align="center">' + esc(m.fec) + '</td>';
                          xml += '<td>' + esc(m.tip) + '</td>';
                          // --- AQUÍ ESTÁ EL ENLACE ---
                          // Añadimos estilos para que el usuario sepa que es un link (azul y subrayado)
                          xml += '<td><a href="' + esc(linkTransaccion) + '" style="color: #1a5276; text-decoration: underline;">' + esc(m.doc) + '</a></td>';
                          xml += '<td>' + esc(m.mem) + '</td>';

                          if (isMonedaNacional) {
                             xml += '<td align="right">' + formatNumberPE(m.debitamtmn) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(m.creditamtmn) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(m.amt) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(mSaldo) + '</td>';
                          } else {
                             xml += '<td align="right">' + formatNumberPE(m.debitamtme) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(m.creditamtme) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(m.amtUSD) + '</td>';
                             xml += '<td align="right">' + formatNumberPE(mSaldoUSD) + '</td>';
                          }
                         xml += '</tr>';
                      });
          
                       // --- FILA SUB-TOTAL POR DOC REF ---
                       xml += '<tr style="background-color:#f9f9f9; font-weight:bold;">';
                       xml += '<td colspan="5" align="right">Subtotal Doc ' + esc(dKey) + ':</td>';
                       if (isMonedaNacional) {
                          xml += '<td align="right">' + formatNumberPE(mDebitoMN) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mCreditoMN) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mDoc) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mSaldo) + '</td>';
                       } else {
                          xml += '<td align="right">' + formatNumberPE(mDebitoME) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mCreditoME) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mDocUSD) + '</td>';
                          xml += '<td align="right">' + formatNumberPE(mSaldoUSD) + '</td>';
                       }
                       xml += '</tr>';
                     }
                   }); // Fin del forEach docRefsOrdenados

                   // --- FILAS TOTALES DEL EMPLEADO / CLIENTE ---
                   xml += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="8" align="right">TOTAL MOVIMIENTOS - ' + countrecord + ' - ' + esc(codigoEntidadReal) + ' - ' + esc(nombreComercialEmpleado) + ': </td>';
                   xml += '<td align="right">' + formatNumberPE(isMonedaNacional ? mCli : mCliUSD) + '</td></tr>';
    
                   /*xml += '<tr style="background-color:#d4efdf;font-weight:bold;"><td colspan="8" align="right">SALDO FINAL:</td>';
                   xml += '<td align="right">' + formatNumberPE(isMonedaNacional ? (sCliIni + mCli) : (sCliIniUSD + mCliUSD)) + '</td></tr>';*/
                   xml += '</table>';
               }); // Fin del forEach clientesOrdenados
          
               // Resumen Final de la Cuenta (Asegurando 5 columnas para consistencia si es necesario, o tabla aparte limpia)
               xml += '<table style="margin-top:10px; border:1.5pt solid #1a252f;">';
               xml += '<tr style="font-weight:bold;background-color:#fcf3cf;"><td width="88%" align="right">TOTAL MOVIMIENTOS CUENTA ' + esc(cKey) + ':</td>';
               xml += '<td width="12%" align="right">' + formatNumberPE(isMonedaNacional ? mCta : mCtaUSD) + '</td></tr>';
  
               xml += '<tr style="font-weight:bold;background-color:#d5f5e3;"><td align="right">SALDO FINAL CUENTA ' + esc(cKey) + ':</td>';
               xml += '<td align="right">' + formatNumberPE(isMonedaNacional ? (saldoInicialDeEstaCuenta + mCta) : (saldoInicialDeEstaCuentaUSD + mCtaUSD))+ '</td></tr>';
               xml += '</table>';
          
          }); // Fin de cuentasOrdenados
    
      }
      xml += '</body></pdf>';
      
      response.renderPdf({ xmlString: xml });
  
   } catch (e) {
       log.error('Error Crítico en PDF Detallado', e);
        response.write("Ocurrió un error al generar el PDF: " + e.message);
   }
}

  
    /**
    * Calcula la suma de importes antes de la fecha de inicio para cada empleado
    */
    function obtenerSaldosIniciales(params) {
        let saldos = {};
        let initialSearch = search.load({ id: '_pe_prestamos_personal_141' });
        initialSearch.filters = [];

        // Filtro: Todo lo anterior a la fecha de inicio
        initialSearch.filters.push(search.createFilter({ 
            name: 'trandate', 
            operator: search.Operator.BEFORE, 
            values: params.custpage_date_from 
        }));

        if (params.custpage_account) initialSearch.filters.push(search.createFilter({ name: 'account', operator: search.Operator.ANYOF, values: params.custpage_account }));

        initialSearch.run().each(res => {
            let empleado = res.getValue(res.columns[1]);
            let monto = parseFloat(res.getValue(res.columns[5])) || 0;
            if (!saldos[empleado]) saldos[empleado] = 0;
            saldos[empleado] += monto;
            return true;
        });
        return saldos;
    }


    /**
    * Calcula la suma de importes antes de la fecha de inicio para cada empleado
    */
    function obtenerSaldosInicialesxCtaxCli(params) {
        let saldosCli = {};
        let saldosCliUSD = {};
      
        let accounts = params.custpage_account ? [params.custpage_account] : ['6703', '6704']; // IDs de tus cuentas 14110X

        // --- VISUALIZAR EN EL LOG ---
        /*log.audit({
            title: 'pidsClientes',
            details: pidsClientes
            });*/

      try {
        let mySearch = search.load({ id: 'customsearch_pe_pagar_diversa_x_cli' });
        mySearch.filters = [];

        // 1. Filtro de Cuenta
        if (params.custpage_account) {
            mySearch.filters.push(search.createFilter({
                name: 'account',
                operator: search.Operator.ANYOF,
                values: params.custpage_account 
            }));
        }
        else {
            mySearch.filters.push(search.createFilter({
                name: 'account',
                operator: search.Operator.ANYOF,
                values: accounts // Asumiendo que 'accounts' ya es un array de IDs
            })); 
        }

        // 2. Filtro de Posting
        mySearch.filters.push(search.createFilter({
            name: 'posting',
            join: 'transaction',
            operator: search.Operator.IS,
            values: 'T'
        }));

       // 3. Filtro de Fecha
        mySearch.filters.push(search.createFilter({
            name: 'formuladate',
            formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
            operator: search.Operator.BEFORE,
            values: params.custpage_date_from
        }));

        // --- VISUALIZAR EN EL LOG ---
        /*log.audit({
            title: 'Filtro de Entidad',
            details: 'params.custpage_client' + params.custpage_client
        });*/
          
        // 4. Lógica de Filtro de Clientes (Apuntando correctamente a través del Join de Transacción)
        if (params.custpage_client && params.custpage_client.trim() !== '') {
           mySearch.filters.push(search.createFilter({
               name: 'custcol_pe_entidad', 
               join: 'transaction', // <-- Indispensable para Multilibro
               operator: search.Operator.ANYOF,
               values: [params.custpage_client] 
            }));}
        /*} else {
            mySearch.filters.push(search.createFilter({
               name: 'custcol_pe_entidad',
               join: 'transaction', 
               operator: search.Operator.NONEOF,
               values: ['@NONE@']
            }));
        }*/

        // 5. Definimos las columnas (esto sobrescribirá las columnas de la búsqueda guardada)
        mySearch.columns = [
            search.createColumn({
               name: 'account',
               summary: search.Summary.GROUP
            }),
            search.createColumn({
               name: 'custcol_pe_entidad',
               join: 'transaction',
               summary: search.Summary.GROUP
            }),
           search.createColumn({
                name: 'formulanumeric1',
                formula: "CASE WHEN {accountingbookid} = '1' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric2',
                formula: "CASE WHEN {accountingbookid} = '2' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            })
        ];      

        nReg = 0;
        mySearch.run().each(res => {
        nReg ++;
        let cuenta = res.getText({ name: 'account', summary: search.Summary.GROUP });

        // El ID interno se obtiene con getValue sobre 'entity'
        let empleadoId = res.getValue({ name: 'custcol_pe_entidad', join: 'transaction', summary: search.Summary.GROUP });
        let empleado = res.getText({ name: 'custcol_pe_entidad', join: 'transaction', summary: search.Summary.GROUP });
        if (!empleado || empleado.trim() === '') {
            empleado = empleadoId ? empleadoId : 'Sin Entidad';
        }        
        let monto = parseFloat(res.getValue({ name: 'formulanumeric1', summary: search.Summary.SUM })) || 0;
        let montoUSD = parseFloat(res.getValue({ name: 'formulanumeric2', summary: search.Summary.SUM })) || 0;
 
          // --- VISUALIZAR EN EL LOG ---
          /* log.audit({
            title: 'Saldo Procesado',
            details: nReg + ' | Cuenta: ' + cuenta + ' | empleadoId: ' + empleadoId +' | empleado: ' + empleado + ' | Monto: ' + monto + ' | Monto USD: ' + montoUSD
           });*/
           
            // --- SOLUCIÓN AL ERROR 'UNDEFINED' ---
            if (!saldosCli[cuenta]) {
               saldosCli[cuenta] = {}; // Inicializamos el primer nivel (Cuenta)
            }

            if (!saldosCliUSD[cuenta]) {
               saldosCliUSD[cuenta] = {}; // Inicializamos el primer nivel (Cuenta)
            }
        
            if (!saldosCli[cuenta][empleado]) {
               saldosCli[cuenta][empleado] = 0; // Inicializamos el segundo nivel (empleado)
            }

            if (!saldosCliUSD[cuenta][empleado]) {
               saldosCliUSD[cuenta][empleado] = 0; // Inicializamos el segundo nivel (empleado)
            }
 
            saldosCli[cuenta][empleado] += monto;
            saldosCliUSD[cuenta][empleado] += montoUSD;

             // --- VISUALIZAR EN EL LOG ---
             /*   log.audit({
                   title: 'saldos[cuenta][empleado]',
                   details: saldos[cuenta][empleado]
                });*/
            
            return true;
        });
        return [saldosCli, saldosCliUSD];
     } catch (e) {
        log.error('Error en búsqueda de saldos', e.message);
        return [{}, {}]; // Si la búsqueda falla por cualquier motivo, devolvemos vacío para no romper el PDF
    }
  }

  
    function obtenerSaldosPorCuenta(params) {
        let saldosCuentas = {};
        let saldosCuentasUSD = {};
        let accounts = params.custpage_account ? [params.custpage_account] : ['6703', '6704']; // IDs de tus cuentas 4699X

        let mySearch = search.load({ id: 'customsearch_pe_saldos_por_pagar_diversa' });
        mySearch.filters = [];

        // 1. Filtro de Cuenta
        mySearch.filters.push(search.createFilter({
            name: 'account',
            operator: search.Operator.ANYOF,
            values: accounts // Asumiendo que 'accounts' ya es un array de IDs
            //values: ['CUENTAS POR PAGAR DIVERSAS MN', 'CUENTAS POR PAGAR DIVERSAS ME']
        }));

        // 2. Filtro de Posting
        mySearch.filters.push(search.createFilter({
            name: 'posting',
            operator: search.Operator.IS,
            values: 'T'
        }));

        // 3. Filtro de Fecha
       mySearch.filters.push(search.createFilter({
            name: 'formuladate',
            formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
            operator: search.Operator.BEFORE,
            values: params.custpage_date_from
        }));

         // 4. Definimos las columnas (esto sobrescribirá las columnas de la búsqueda guardada)
        mySearch.columns = [
            search.createColumn({
               name: 'account',
               summary: search.Summary.GROUP
            }),
            search.createColumn({
                name: 'formulanumeric1',
                formula: "CASE WHEN {accountingbookid} = '1' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric2',
                formula: "CASE WHEN {accountingbookid} = '2' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            })
        ];      
     
     mySearch.run().each(res => {
        let accountName = res.getText({ name: 'account', summary: search.Summary.GROUP });
        let monto = parseFloat(res.getValue({ name: 'formulanumeric1', summary: search.Summary.SUM })) || 0;
        let montoUSD = parseFloat(res.getValue({ name: 'formulanumeric2', summary: search.Summary.SUM })) || 0;
       
        // --- VISUALIZAR EN EL LOG ---
        /*log.audit({
            title: 'Saldos CTA',
            details: accountName + ' | ' + monto + ' | ' + montoUSD
            });*/
        saldosCuentas[accountName] = monto || 0;
        saldosCuentasUSD[accountName] = montoUSD || 0;
        return true;
    });

  return [saldosCuentas, saldosCuentasUSD];
}

/**
 * Formatea un valor numérico con separador de miles (comas) y 2 decimales.
 * @param {number|string} valor - El número a formatear.
 * @returns {string} El valor formateado (ej: "1,250.00").
 */
function formatNumberPE(valor) {
    let num = parseFloat(valor) || 0;
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}
  

function generarExcelDetallado(request, response) {
    try {
        const params = request.parameters;
        const lineCount = request.getLineCount({ group: 'custpage_data_list' });
        const [saldosInicialesMap, saldosInicialesMapUSD] = obtenerSaldosPorCuenta(params);

        // 2. Búsqueda Única (Optimización de Gobernanza)
        let dataAgrupada = {}; 

        const [saldosIniciales, saldosInicialesUSD]  = obtenerSaldosInicialesxCtaxCli(params);

        // 4. MOVIMIENTOS DEL PERIODO
        let dSearch = search.load({ id: 'customsearch_pe_pagar_diversa__4699_2' });

        // 1. Definimos los filtros que SIEMPRE deben cumplirse (AND)
        dSearch.filters = [];
      
        // -----------------------------------------------------------------
        // REGLA DE ORO: Limpiar y redefinir el ordenamiento nativo en columnas 
        // para evitar que NetSuite rompa los filtros por conflicto de Sort.
        // -----------------------------------------------------------------
        let nuevasColumnas = [];   
        dSearch.columns.forEach(function(col) {
           // Clonamos la columna desactivando cualquier ordenamiento previo de la búsqueda guardada
           let configCol = {
               name: col.name,
               join: col.join || null,
               summary: col.summary || null
           };

           // Forzamos el SORT ASCENDENTE únicamente en los 3 niveles internos requeridos
           if (col.name === 'custcol_pe_entidad' && col.join === 'transaction') {
               // Nueva columna agregada al ordenamiento
               configCol.sort = search.Sort.ASC;
           } else if (col.name === 'custcol1' && col.join === 'transaction') {
               configCol.sort = search.Sort.ASC;
           } else if (col.name === 'trandate' && col.join === 'transaction') {
               configCol.sort = search.Sort.ASC;
           }

           nuevasColumnas.push(search.createColumn(configCol));
        });
        dSearch.columns = nuevasColumnas; 

        // --- ASIGNACIÓN DE FILTROS ---
        if (params.custpage_account && params.custpage_account.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'account', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_account 
             }));
        }

        if (params.custpage_date_from && params.custpage_date_to) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'formuladate',
                  formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                  operator: search.Operator.WITHIN, 
                  values: [params.custpage_date_from, params.custpage_date_to] 
             }));
        }

        // Filtro de Posting
        dSearch.filters.push(search.createFilter({ 
            name: 'posting', 
            operator: search.Operator.IS, // Corregido WITHIN por IS para campos Booleanos nativos
            values: ['T'] 
        }));

        // Filtro de Clientes/Entidades seleccionadas
        // 1. Convertimos a string y eliminamos los espacios en blanco
        var clienteId = params.custpage_client ? params.custpage_client.toString().trim() : '';
        // 2. Evaluamos si quedó un valor real (si era ' ', ahora será '')
        if (clienteId !== '') {
           dSearch.filters.push(search.createFilter({ 
               name: 'custcol_pe_entidad', 
               join: 'transaction',   
               operator: search.Operator.ANYOF, 
               values: clienteId // Pasamos el ID limpio
           }));
        }

        log.audit({
             title: 'Filtros Aplicados',
             details: 'params.custpage_account: ' + params.custpage_account + ' | params.custpage_date_from: ' + params.custpage_date_from + ' | params.custpage_date_to: ' + params.custpage_date_to + ' | params.custpage_client: ' + params.custpage_client + ' | params.custpage_hide_zero: ' + params.custpage_hide_zero
        });


        // Orden crucial para el quiebre
            let colAccount = search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC  });
            let colPeEntidad = search.createColumn({ name: 'custcol_pe_entidad', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC  });
            let colCustCol1 = search.createColumn({ name: 'custcol1', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC });
            let colTranDate = search.createColumn({ name: 'trandate', join: 'transaction', summary: search.Summary.GROUP, sort: search.Sort.ASC });
            let colTranId = search.createColumn({ name: 'tranid', join: 'transaction', summary: search.Summary.GROUP });
            let colType = search.createColumn({ name: 'type', join: 'transaction', summary: search.Summary.GROUP });
            let colCurrency = search.createColumn({ name: 'currency', join: 'transaction', summary: search.Summary.GROUP });   
            let colDebitMn = search.createColumn({
                name: 'formulanumericdebitmn',
                formula: "CASE WHEN {accountingbookid} = '1' THEN {debitamount} ELSE 0 END", 
                summary: search.Summary.SUM
            });
            let colCreditMn = search.createColumn({
                name: 'formulanumericcreditmn',
                formula: "CASE WHEN {accountingbookid} = '1' THEN {creditamount} ELSE 0 END", 
                summary: search.Summary.SUM
            });
            let colAmtMn = search.createColumn({
                name: 'formulanumeric1',
                formula: "CASE WHEN {accountingbookid} = '1' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            });
            let colDebitMe = search.createColumn({
                name: 'formulanumericdebitme',
                formula: "CASE WHEN {accountingbookid} = '2' THEN {debitamount} ELSE 0 END", 
                summary: search.Summary.SUM
            });
            let colCreditMe = search.createColumn({
                name: 'formulanumericcreditme',
                formula: "CASE WHEN {accountingbookid} = '2' THEN {creditamount} ELSE 0 END", 
                summary: search.Summary.SUM
            });
            // AGREGAMOS LA FÓRMULA AQUÍ
            let colAmtMe = search.createColumn({
                name: 'formulanumeric2',
                formula: "CASE WHEN {accountingbookid} = '2' THEN {amount} ELSE 0 END", 
                summary: search.Summary.SUM
            });   
            let colMemo = search.createColumn({ name: 'memo',  join: 'transaction', summary: search.Summary.GROUP });
            let colInternalId = search.createColumn({ name: 'internalid', join: 'transaction', summary: search.Summary.GROUP });

            // Asignar el arreglo ordenado a la búsqueda
            dSearch.columns = [
                colAccount, colPeEntidad, colCustCol1, 
                colTranDate, colTranId, colType, colCurrency, colDebitMn, colCreditMn, 
                colAmtMn, colDebitMe, colCreditMe, colAmtMe, colMemo, colInternalId
            ];
      

            let tree = {};
            let counttree = 0;
            let cacheEntidades = {}; // Para no hacer búsquedas repetidas del mismo cliente y optimizar rendimiento
     
            // 1. Ejecutar la búsqueda de forma paginada (1000 registros por página)
            let pagedDataMovs = dSearch.runPaged({ pageSize: 1000 });

            pagedDataMovs.pageRanges.forEach((pageRange) => {
            let page = pagedDataMovs.fetch({ index: pageRange.index })
        
                page.data.forEach((res) => {
                   counttree++;

                   let cta = res.getText(colAccount);
                   // =================================================================
                   // ESTRATEGIA DEFECTO: EXTRACCIÓN Y BÚSQUEDA DINÁMICA DE LA ENTIDAD
                   // =================================================================
                   let entidadIdInterno = res.getValue(colPeEntidad);
                   let entidadNombreStandard = res.getText(colPeEntidad);
                   let entidadAltName = "";
                   let entidadCodigoReal = ""; // Variable para guardar el código (E-PE-...)

                   if (entidadIdInterno) {
                      // Si el nombre comercial no está en memoria Caché, lo buscamos una sola vez en NetSuite
                      if (!cacheEntidades[entidadIdInterno]) {
                         try {
                             let lookupEntidad = search.lookupFields({
                                 type: 'entity', // 'entity' sirve para clientes, proveedores y empleados
                                 id: entidadIdInterno,
                                 columns: ['altname', 'entityid']
                             });
                             cacheEntidades[entidadIdInterno] = {
                                 altname: lookupEntidad.altname || "",
                                 entityid: lookupEntidad.entityid || ""
                             };
                          } catch (errLookup) {
                             cacheEntidades[entidadIdInterno] = { altname: "", entityid: "" };
                          }
                      }
                      entidadAltName = cacheEntidades[entidadIdInterno].altname;
                      entidadCodigoReal = cacheEntidades[entidadIdInterno].entityid; // 👈 CAPTURAMOS EL CÓDIGO REAL
                   }

                   // El nombre real que mostraremos en la fila gris del PDF
                   let empleadoNombreFormateado = entidadAltName ? entidadAltName : (entidadNombreStandard ? entidadNombreStandard : entidadIdInterno);
                   //let cli = entidadNombreStandard || "OTROS";
                   // Asignación final sin errores de campo: usa AltName si existe, sino recurre a respaldos planos
                   // let empleado = entidadAltName ? entidadAltName : (entidadNombreStandard ? entidadNombreStandard : entidadIdInterno);             // --- VISUALIZAR EN EL LOG ---
                   /*log.audit({
                      title: 'Movimientos',
                      details:  'cli: ' + cli + ' | empleado: ' + empleado 
                   });*/
                   // =================================================================  

                   // Extraer el valor de la fórmula
                   let docRef = res.getValue(colCustCol1) || "S/R"; // S/R = Sin Referencia
                   //let docReflinea = res.getValue(colPeNroLinea) || "0";
                   let doc = res.getValue(colTranId) || "S/N"; 

                   // Declaramos estas variables aquí para poder usarlas abajo
                   let fec = res.getValue(colTranDate);
                   let tip = res.getText(colType);
                   let mon = res.getText(colCurrency);
                   let debitamtmn = parseFloat(res.getValue(colDebitMn)) || 0;
                   let creditamtmn = parseFloat(res.getValue(colCreditMn)) || 0;
                   let amt = parseFloat(res.getValue(colAmtMn)) || 0;
                   let debitamtme = parseFloat(res.getValue(colDebitMe)) || 0;
                   let creditamtme = parseFloat(res.getValue(colCreditMe)) || 0;
                   let amtUSD = parseFloat(res.getValue(colAmtMe)) || 0;
    
                   let mem = res.getValue(colMemo);
                   let tranIdInterno = res.getValue(colInternalId);

                    // --- VISUALIZAR EN EL LOG ---
                    /*log.audit({
                        title: 'Movimientos',
                        details: 'counttree: ' + counttree + ' | cta: ' + cta + ' | cli: ' + cli + ' | empleado: ' + empleado + ' | docRef: ' + docRef + ' | doc: ' + doc + ' | fec: ' + fec + ' | tip: ' + tip + ' | mon: ' + mon + ' | amt:' + amt + ' | mem: ' + mem
                    });*/
          
                    if (!tree[cta]) tree[cta] = {};
                    if (!tree[cta][entidadIdInterno]) {
                       tree[cta][entidadIdInterno] = { 
                           nombreMostrar: empleadoNombreFormateado, // 👈 Guardamos el Nombre Comercial / Razón Social aquí
                           entityIdReal: entidadCodigoReal, // 👈 SOLUCIÓN CRUCIAL: Ahora el ordenamiento del XML sí tendrá de dónde leer
                           movimientos: {}, 
                           totalAmt: 0,    // <--- ACUMULADOR NUEVO
                           totalAmtUSD: 0  // <--- ACUMULADOR NUEVO
                       };
                    }
          
                    if (!tree[cta][entidadIdInterno].movimientos[docRef]) {
                       tree[cta][entidadIdInterno].movimientos[docRef] = [];
                    }

                    tree[cta][entidadIdInterno].movimientos[docRef].push({
                        doc: doc,
                        fec: fec,
                        tip: tip,
                        mon: mon,
                        debitamtmn: debitamtmn,
                        creditamtmn: creditamtmn,
                        amt: amt,
                        debitamtme: debitamtme,
                        creditamtme: creditamtme,
                        amtUSD: amtUSD,
                        mem: mem,
                        idInterno: tranIdInterno
                    });

                    // SUMAMOS AQUÍ MISMO (Solo una vez)
                    tree[cta][entidadIdInterno].totalAmt += amt;
                    tree[cta][entidadIdInterno].totalAmtUSD += amtUSD;
                    return true;
                });
                // --- VISUALIZAR EN EL LOG ---
                /*log.audit({
                      title: 'LOG counttree 1',
                      details: counttree
                });*/
            });

            // 1. Capturamos lo que viene del parámetro
            var paramHideZero = request.parameters.custpage_hide_zero;
            var checkFiltrar = false;
            if (paramHideZero === 'T' || paramHideZero === true || paramHideZero === 'true') {
                checkFiltrar = true;
            }
            // --- LOG DE CONTROL PARA VERIFICAR ---
            log.audit({
                title: 'Control de Checkbox Desmarcado',
                details: 'Valor crudo: ' + paramHideZero + ' | Resultado lógico (checkFiltrar): ' + checkFiltrar
            });

            // --- CONSTRUCCIÓN DEL CONTENIDO EXCEL ---
            let countrecord = 0;
            let xls = '<html><head><meta charset="UTF-8"></head><body>';
            xls += '<table border="1">';

            // Justo antes de empezar el bucle: for (let cKey in tree)
            let treeKeys = Object.keys(tree);
            if (treeKeys.length === 0) {
               xls += '<table style="width:100%; margin-top:20px;">';
               xls += '<tr><td align="center" style="font-size:12pt; border:none;">No se encontraron movimientos de cuentas por pagar diversas para los criterios seleccionados.</td></tr>';
            xls += '</table>';
            } else {
               // 1. ORDENAR EL NIVEL 1: CUENTAS
               let cuentasOrdenadas = Object.keys(tree).sort();
               cuentasOrdenadas.forEach(function(cKey) {
                  //for (let cKey in tree) {
                  let mCta = 0;
                  let mCtaUSD = 0;
                  let saldoInicialDeEstaCuenta = saldosInicialesMap[cKey] || 0;
                  let saldoInicialDeEstaCuentaUSD = saldosInicialesMapUSD[cKey] || 0;

                  // 💡 SOLUCIÓN: Definimos isMonedaNacional en el nivel de CUENTA para que sea accesible abajo
                  let isMonedaNacional = cKey.indexOf('469901') !== -1;
                  // Fila de Cuenta
                  xls += `<tr style="background-color: #1a252f; color: white; font-weight: bold;">
                        <td colspan="6">CUENTA: ${cKey}</td>`;
                  xls += `<td  colspan="2">Saldo Inicial : </td>`;
                  if (isMonedaNacional) {
                      xls += `<td>${saldoInicialDeEstaCuenta}</td>`;
                  } else {
                      xls += `<td>${saldoInicialDeEstaCuentaUSD}</td>`;
                  }
                  xls += `</tr>`;
         
                  // =================================================================
                  // 2. ORDENAR EL NIVEL 2: ID DE ENTIDAD REAL (Efecto P-PE-0001)
                  // =================================================================
                 let clientesOrdenados = Object.keys(tree[cKey]).sort(function(a, b) {
                     let idA = (tree[cKey][a].entityIdReal || a).toString().toUpperCase();
                     let idB = (tree[cKey][b].entityIdReal || b).toString().toUpperCase();
                     return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
               });

               // Iteramos de forma controlada y ordenada por el código de entidad
               clientesOrdenados.forEach(function(lKey) {        
//                 for (let lKey in tree[cKey]) {

                   let empleadoData = tree[cKey][lKey];
              
                   empleadoData.totalAmt = parseFloat(empleadoData.totalAmt.toFixed(2));
                   empleadoData.totalAmtUSD = parseFloat(empleadoData.totalAmtUSD.toFixed(2));

                   // 💡 NUEVA VALIDACIÓN: Si el total acumulado de movimientos del cliente es cero, lo ignoramos por completo
                   if (checkFiltrar === true) {
                       if (isMonedaNacional && empleadoData.totalAmt === 0) {
                          return; 
                       } else if (!isMonedaNacional && empleadoData.totalAmtUSD === 0) {
                          return; 
                       }
                   }

                   let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
                   let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
                   let mCli = 0;
                   let mCliUSD = 0;
                   let mSaldo = sCliIni;
                   let mSaldoUSD = sCliIniUSD;
           
                   // --- VISUALIZAR EN EL LOG ---
                   /*log.audit({
                       title: 'Validar CERO',
                       details: 'lkey : ' + lKey + ' | mValida : ' + mValida + ' | mValidaUSD: ' + mValidaUSD 
                   });*/
    
                   // VALIDACIÓN INSTANTÁNEA: Ya no recorres nada, solo lees la propiedad
                   //if (params.custpage_hide_zero === 'T' &&mValida === 0 && mValidaUSD === 0) {
                   //   return;   //continue; // Salta al siguiente empleado sin procesar nada
                   //}

                   // --- VISUALIZAR EN EL LOG ---
                   /*log.audit({
                       title: 'Validar CERO',
                       details: 'lkey : ' + lKey + ' | checkFiltrar: ' + checkFiltrar + ' | params.custpage_hide_zero: ' + params.custpage_hide_zero +  ' | empleadoData.totalAmt: ' + empleadoData.totalAmt + ' | mValida : ' + mValida + ' | empleadoData.totalAmtUSD: ' + empleadoData.totalAmtUSD + ' |mValidaUSD: ' + mValidaUSD 
                   });*/
                 
            //  }
       
                   countrecord++;

                   let codigoEntidadReal = empleadoData.entityIdReal || lKey; // Trae P-PE-0001
                   // 👇 SOLUCIÓN: Extraemos el Nombre Comercial guardado en el objeto del árbol 👇
                   let nombreComercialEmpleado = empleadoData.nombreMostrar || lKey; 
                   // Fila de empleado
                   xls += `<tr style="background-color: #d5dbdb; font-weight: bold;">
                              <td colspan="9">${countrecord} - ${codigoEntidadReal} - ${nombreComercialEmpleado}</td>`;
                   /*            <td colspan="2">Saldo Inicial</td>`;
                   if (isMonedaNacional) {
                      xls += `<td align="right">${sCliIni}</td>`;
                   } else {
                      xls += `<td align="right">${sCliIniUSD}</td>`;
                   }*/
                   xls += `</tr>`;

                   // Encabezados de Columnas
                   xls += `<tr style="background-color: #566573; color: white;">
                              <th>DocRef</th><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Glosa</th>`;
                   if (isMonedaNacional) {
                      xls += `<th>DebitoMN</th>`;
                      xls += `<th>CreditoMN</th>`;
                      xls += `<th>Monto</th>`;
                   } else {
                      xls += `<th>DebitoME</th>`;
                      xls += `<th>CreditoME</th>`;
                      xls += `<th>Monto USD</th>`;
                   }
                   xls += `<th width="12%" align="center">Saldo</th>`;
                   xls += `</tr>`;

                   // =================================================================
                   // 3, 4 y 5. ORDENAR INTERNAMENTE: CUSTCOL1 (dKey), NRO LINEA, FECHA
                   // =================================================================
                   // Como dKey es la propiedad del objeto movimientos mapeada desde colCustCol1,
                   // extraer las llaves y ordenarlas asegura que Custcol1 vaya en orden Ascendente.
                   let docRefsOrdenados = Object.keys(empleadoData.movimientos).sort(); 

                   docRefsOrdenados.forEach(function(dKey) {
                      // for (let dKey in empleadoData.movimientos) {
                      let movs = empleadoData.movimientos[dKey];
           
                      let mDoc = 0;
                      let mDocUSD = 0;
                      let mDebitoMN = 0;
                      let mCreditoMN = 0;
                      let mDebitoME = 0;
                      let mCreditoME = 0;

                      // 1. Pre-cálculo de montos para validar el quiebre por documento
                      movs.forEach(m => {
                          mDoc += (m.amt || 0);
                          mDocUSD += (m.amtUSD || 0); 
                          mDebitoMN += (m.debitamtmn || 0);
                          mCreditoMN +=  (m.creditamtmn || 0);
                          mDebitoME += (m.debitamtme || 0);
                          mCreditoME +=  (m.creditamtme || 0);
                      });

                      mDoc = parseFloat(mDoc.toFixed(2));
                      mDocUSD = parseFloat(mDocUSD.toFixed(2));
                  
                      let ocultarDocumento = false;
                      // 👇 NUEVA VALIDACIÓN: Quiebre por Documento dKey en CERO 👇
                      if (checkFiltrar === true) {
                         if (isMonedaNacional && mDoc === 0) {
                             ocultarDocumento = true; // Flag activado, pero NO hacemos return aún para no romper saldos
                         } 
                         else if (!isMonedaNacional && mDocUSD === 0) {
                             ocultarDocumento = true; //return; // Salta este documento dKey
                         } 
                      }

                      if (!ocultarDocumento) {
                         movs.forEach(m => {
                            mCli += (m.amt || 0);
                            mCliUSD += (m.amtUSD || 0);
                            mCta += (m.amt || 0);
                            mCtaUSD += (m.amtUSD || 0);
                             
                            mSaldo += (m.amt || 0);
                            mSaldoUSD +=  (m.amtUSD || 0);
              
                            xls += `<tr>
                                       <td>${dKey}</td><td>${m.fec}</td><td>${m.tip}</td><td>${m.doc}</td><td>${m.mem}</td>`;
                            if (isMonedaNacional) {
                               xls += `<td>${m.debitamtmn}</td>`;
                               xls += `<td>${m.creditamtmn}</td>`;
                               xls += `<td>${m.amt}</td>`;
                               xls += `<td>${mSaldo}</td>`;
                            } else {
                               xls += `<td>${m.debitamtme}</td>`;
                               xls += `<td>${m.creditamtme}</td>`;
                               xls += `<td>${m.amtUSD}</td>`;
                               xls += `<td>${mSaldoUSD}</td>`;
                            }
                            xls += `</tr>`;
                        });

                     xls += `<tr>
                           <th colspan="5" align="right">Subtotal Doc: ${dKey} </th>`;
                     if (isMonedaNacional) {
                        xls += `<td>${mDebitoMN}</td>`;
                        xls += `<td>${mCreditoMN}</td>`;
                        xls += `<td>${mDoc}</td>`;
                        xls += `<td>${mSaldo}</td>`;
                     } else {
                        xls += `<td>${mDebitoME}</td>`;
                        xls += `<td>${mCreditoME}</td>`;
                        xls += `<td>${mDocUSD}</td>`;
                        xls += `<td>${mSaldoUSD}</td>`;
                     }

                     xls += `</tr>`;
                   } 
               }); // Fin del forEach docRefsOrdenados

               // Resumen empleado
               xls += `<tr style="background-color: #566573; color: white;"><td colspan="8" align="right">TOTAL MOVIMIENTOS - ${countrecord} - ${codigoEntidadReal} - ${nombreComercialEmpleado}: </td>`;
               if (isMonedaNacional) {       
                  xls += `<td>${mCli}</td></tr>`;
               } else {
                  xls += `<td>${mCliUSD}</td></tr>`;
               }
               let mTotalCli = sCliIni + mCli;7
               let mTotalCliUSD = sCliIniUSD + mCliUSD ;

               /*xls += `<tr style="background-color:#d4efdf;font-weight:bold;"><td colspan="8" align="right">SALDO FINAL:</td>`;
               if (isMonedaNacional) {      
                  xls += `<td>${mTotalCli}</td></tr>`;
               } else {
                  xls += `<td>${mTotalCliUSD}</td></tr>`;
               }*/
           }); // Fin del forEach clientesOrdenados
          
           // Resumen Final de la Cuenta (Asegurando 5 columnas para consistencia si es necesario, o tabla aparte limpia)
           xls += `<tr style="background-color: #1a252f; color: white; font-weight: bold;"><td colspan="8" align="right">TOTAL MOVIMIENTOS CUENTA ${cKey}:</td>`;
           if (isMonedaNacional) {        
               xls += `<td>${mCta}</td></tr>`;
           } else {
               xls += `<td>${mCtaUSD}</td></tr>`;
           }

           let mTotalCta = saldoInicialDeEstaCuenta + mCta ;
           let mTotalCtaUSD = saldoInicialDeEstaCuentaUSD + mCtaUSD ;

           xls += `<tr style="font-weight:bold;background-color:#d5f5e3;"><td colspan="8" align="right">SALDO FINAL CUENTA ${cKey} :</td>`;
           if (isMonedaNacional) {         
              xls += `<td>${mTotalCta}</td></tr>`;
           } else {
              xls += `<td>${mTotalCtaUSD}</td></tr>`;
           }
 
        }); // Fin de cuentasOrdeasdos
  
        xls += '</table>';
        xls +='</body></html>';
}

        if (!xls) xls = '<html><body><table><tr><td>Sin datos</td></tr></table></body></html>';

        // CONVERSIÓN A BASE64
        var base64Content = moduloEncode.convert({
            string: xls,
            inputEncoding: 'UTF_8',  // Usar string directo
            outputEncoding: 'BASE_64' // Usar string directo
        });

        // CREAR EL ARCHIVO
        var excelFile = file.create({
            name: 'Reporte_Detallado.xls',
            fileType: file.Type.EXCEL,
            contents: base64Content
        });
        // HEADERS
        response.addHeader({
            name: 'Content-Type',
            value: 'application/vnd.ms-excel'
        });
        response.addHeader({
            name: 'Content-Disposition',
            value: 'attachment; filename="Reporte_Detallado.xls"'
        });

        response.writeFile({
            file: excelFile,
            isInline: false
        });
      
        } catch (e) {
            log.error('Error Excel Detallado', e);
            response.write("Error: " + e.message);
        }
    }
     
    return { onRequest };
});