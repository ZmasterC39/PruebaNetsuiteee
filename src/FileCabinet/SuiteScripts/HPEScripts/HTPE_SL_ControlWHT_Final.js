/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/format', 'N/render', 'N/log', 'N/url', 'N/runtime', 'N/file', 'N/encode'], 
(serverWidget, search, format, render, log, url, runtime, file, moduloEncode) => {
  
    const onRequest = (scriptContext) => {
        const { request, response } = scriptContext;
        const params = request.parameters;

        // --- LÓGICA DE FECHAS POR DEFECTO ---
        let hoy = new Date();
        // Primer día del mes actual
        let primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        // Formatear a string según la preferencia del usuario/empresa
        let primerDiaString = format.format({ value: primerDia, type: format.Type.DATE });
        let hoyString = format.format({ value: hoy, type: format.Type.DATE });
      
        try {
            
            // 1. Detectar si la petición es para generar el PDF
/*           if (request.method === 'POST' && params.custpage_btn_type === 'pdf' ) {
                return generarPDF(request, response);
            } 
*/
            // 1. Detectar si la petición es para el PDF Detallado
/*            if (request.method === 'POST' && params.custpage_btn_type === 'pdf_detallado') {
               return generarPDFDetallado(request, response);
            }
*/
            // Lógica de detección en el POST
            if (request.method === 'POST') {
                if (params.custpage_btn_type === 'pdf') return generarPDF(request, response);
                if (params.custpage_btn_type === 'pdf_detallado') return generarPDFDetallado(request, response);
            }
          
            // 2. Construir el Formulario
            let form = serverWidget.createForm({ title: 'Control Detracciones' });

            let btnType = form.addField({ id: 'custpage_btn_type', type: serverWidget.FieldType.TEXT, label: 'Hidden' });
            btnType.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            // --- SECCIÓN DE FILTROS ---
            let filterGrp = form.addFieldGroup({ id: 'filter_grp', label: 'Filtros de Búsqueda' });
            
            let accountField = form.addField({ id: 'custpage_account', type: serverWidget.FieldType.SELECT, label: 'Cuenta Contable', container: 'filter_grp' });
            accountField.addSelectOption({ value: '', text: '- Todas (122003 / 122004) -' });
            accountField.addSelectOption({ value: '6303', text: '122003 DETRACCIONES POR COBRAR MN' });
            accountField.addSelectOption({ value: '6302', text: '122004 DETRACCIONES POR COBRAR ME' });
            if (params.custpage_account) accountField.defaultValue = params.custpage_account;

            let clientField = form.addField({ id: 'custpage_client', type: serverWidget.FieldType.SELECT, label: 'Cliente', source: 'customer', container: 'filter_grp' });
            if (params.custpage_client) clientField.defaultValue = params.custpage_client;

            let hideZeroField = form.addField({ id: 'custpage_hide_zero', type: serverWidget.FieldType.CHECKBOX, label: 'Omitir Saldos 0', container: 'filter_grp' });
            hideZeroField.defaultValue = params.custpage_hide_zero || 'F';

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
                 for (var i = 1; i <= lineCount; i++) {
                     if (nlapiGetLineItemValue('custpage_data_list', 'col_select', i) == 'T') { selectedCount++; }
                 }
                 if (selectedCount === 0) { alert('Debe seleccionar al menos un cliente.'); return false; }

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
        for (var i = 1; i <= lineCount; i++) {
            if (nlapiGetLineItemValue('custpage_data_list', 'col_select', i) == 'T') { selectedCount++; }
        }
        if (selectedCount === 0) { alert('Debe seleccionar al menos un registro.'); return false; }

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
          
            // --- LÓGICA DE PROCESAMIENTO ---
            if (request.method === 'POST') {

                // NUEVA LÍNEA:
                if (params.custpage_btn_type === 'excel_detallado') return generarExcelDetallado(request, response);
              
                if (!params.custpage_date_from || !params.custpage_date_to) {
                    throw new Error("Las fechas de inicio y fin son obligatorias.");
                }

                // 1. Obtener Saldo Inicial (Movimientos antes de Fecha Inicio)
                let saldosIniciales = obtenerSaldosIniciales(params);

                let mySearch = search.load({ id: 'customsearch_pe_control_de_detrac_122' });

                mySearch.filters.push(search.createFilter({ name: 'trandate', operator: search.Operator.WITHIN, values: [params.custpage_date_from, params.custpage_date_to] }));
                
                if (params.custpage_client) mySearch.filters.push(search.createFilter({ name: 'entity', operator: search.Operator.ANYOF, values: params.custpage_client }));
                if (params.custpage_account) mySearch.filters.push(search.createFilter({ name: 'account', operator: search.Operator.ANYOF, values: params.custpage_account }));
                if (params.custpage_date_from && params.custpage_date_to) {
                    mySearch.filters.push(search.createFilter({ name: 'trandate', operator: search.Operator.WITHIN, values: [params.custpage_date_from, params.custpage_date_to] }));
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
                        let totalVal = parseFloat(res.getValue(res.columns[5])) || 0;
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

                // CAMBIO 1: Columna oculta para persistir el ID del Cliente <<--- CAMBIO AQUÍ
                //let colCliId = sublist.addField({ id: 'col_cliente_id', type: serverWidget.FieldType.TEXT, label: 'ID Cliente' });
                //colCliId.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN }); 

                // --- VISUALIZAR EN EL LOG ---
                //log.audit({
                //    title: 'colCliId',
                //    details: colCliId
                //});
              
                sublist.addField({ id: 'col_select', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar' });
                sublist.addField({ id: 'col_index', type: serverWidget.FieldType.TEXT, label: '#' });
                sublist.addField({ id: 'col_cuenta', type: serverWidget.FieldType.TEXT, label: 'CUENTA' });
                sublist.addField({ id: 'col_cliente', type: serverWidget.FieldType.TEXT, label: 'CLIENTE' });
                sublist.addField({ id: 'col_cliente_id', type: serverWidget.FieldType.TEXT, label: 'ID Cliente' });
                // CAMBIO 1: Columna oculta para persistir el ID del Cliente <<--- CAMBIO AQUÍ
                //let colCliId = sublist.addField({ id: 'col_cliente_id', type: serverWidget.FieldType.TEXT, label: 'ID Cliente' });
                //colCliId.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN }); 
                sublist.addField({ id: 'col_saldo_ini', type: serverWidget.FieldType.CURRENCY, label: 'SALDO INICIAL' });
                sublist.addField({ id: 'col_moneda', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                sublist.addField({ id: 'col_mn', type: serverWidget.FieldType.CURRENCY, label: 'SALDO MN' });
                sublist.addField({ id: 'col_me', type: serverWidget.FieldType.CURRENCY, label: 'SALDO ME' });
                sublist.addField({ id: 'col_total', type: serverWidget.FieldType.CURRENCY, label: 'TOTAL' });
                sublist.addField({ id: 'col_dias', type: serverWidget.FieldType.INTEGER, label: 'DÍAS' });

                // --- 1. IDENTIFICAR CLIENTES QUE NO TIENEN ID ---
                let nombresSinId = [];
                finalData.forEach(res => {
                   let clientId = res.getValue(res.columns[1]);
                   let clientText = res.getText(res.columns[1]);
                   if (!clientId && clientText) {
                      if (nombresSinId.indexOf(clientText) === -1) {
                          nombresSinId.push(clientText);
                      }
                   }
                });

                // --- VISUALIZAR EN EL LOG ---
                log.audit({
                title: 'nombresSinId',
                details: nombresSinId
                });

                // --- 2. RECUPERAR IDS EN UNA SOLA BÚSQUEDA (BULK) ---
                let mapaIdsRecuperados = {};

                if (nombresSinId.length > 0) {
                   // Construimos el filtro dinámico: ['entityid', 'is', 'Nombre1'], 'OR', ['entityid', 'is', 'Nombre2']...
                   let searchFilters = [];
                   for (let i = 0; i < nombresSinId.length; i++) {
                       searchFilters.push(['entityid', 'is', nombresSinId[i]]);
                       if (i < nombresSinId.length - 1) {
                          searchFilters.push('OR');
                       }
                  } 

                 // Ejecutamos la búsqueda corregida
                 search.create({
                    type: search.Type.ENTITY,
                    filters: searchFilters,
                    columns: ['internalid', 'entityid']
                 }).run().each(function(result) {
                    // Guardamos en el mapa: Nombre -> ID
                    let name = result.getValue('entityid');
                    mapaIdsRecuperados[name] = result.id;
                    return true;
                    });
                 }

                 // --- VISUALIZAR EN EL LOG ---
                 log.audit({
                 title: 'mapaIdsRecuperados',
                 details: mapaIdsRecuperados
                 });

                finalData.forEach((res, i) => {
                    let cols = res.columns;
                    let clientText = res.getText(cols[1]);
                    let rawClientId = res.getValue(cols[1]);

                    // --- LÓGICA DE RECUPERACIÓN ---
                    // Si el ID es nulo, buscamos si el texto incompleto coincide con alguna llave de nuestro mapa
                    if (!rawClientId && clientText) {
                       // Buscamos si el "clientText" está contenido dentro de alguna llave del mapa maestro
                       // O si alguna llave del mapa está contenida en el texto (por si viene con basura)
                       for (let codigo in mapaIdsRecuperados) {
                          if (codigo.indexOf(clientText) !== -1 || clientText.indexOf(codigo) !== -1) {
                             rawClientId = mapaIdsRecuperados[codigo];
                             break; 
                          }
                       }
                    }
/*
                    // --- VISUALIZAR EN EL LOG ---
                    log.audit({
                    title: 'clientText',
                    details: clientText
                    });
                    // --- VISUALIZAR EN EL LOG ---
                    log.audit({
                    title: 'rawClientId',
                    details: rawClientId
                    });
                    // --- VISUALIZAR EN EL LOG ---
                    log.audit({
                    title: 'mapaIdsRecuperados[clientText]',
                    details: mapaIdsRecuperados[clientText]
                    });
 */                 
                    // Rescate de ID: Si es nulo en la búsqueda, usamos el mapa
                    let clientId = rawClientId ? rawClientId.toString() : (mapaIdsRecuperados[clientText] || null);

                    // Obtener Saldo Inicial con el ID recuperado
                    let sInicial = 0; 
                    if (clientId && saldosIniciales[clientId]) {
                       sInicial = parseFloat(saldosIniciales[clientId]) || 0;
                    }
                  
                    /*
                    let clientId = res.getValue(res.columns[1]);
                                    
                    let sInicial = saldosIniciales[clientId] || 0;
                    */

                    let movPeriodo = parseFloat(res.getValue(res.columns[5])) || 0;

                    sublist.setSublistValue({ id: 'col_index', line: i, value: (i + 1).toString() });

                    sublist.setSublistValue({ id: 'col_cuenta', line: i, value: res.getText(cols[0]) || " " });
                    sublist.setSublistValue({ id: 'col_cliente', line: i, value: res.getText(cols[1]) || " " });

                    // El ID ahora siempre tendrá valor si se encontró en el sistema
                    sublist.setSublistValue({ 
                         id: 'col_cliente_id', 
                         line: i, 
                        value: clientId ? clientId.toString() : " " 
                    });
                  
                    //sublist.setSublistValue({ id: 'col_cliente_id', line: i, value: clientId.toString() || " " });

                    sublist.setSublistValue({ id: 'col_moneda', line: i, value: res.getText(cols[2]) || " " });
                    sublist.setSublistValue({ id: 'col_saldo_ini', line: i, value: sInicial.toString() });
                    sublist.setSublistValue({ id: 'col_mn', line: i, value: (res.getValue(cols[3]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_me', line: i, value: (res.getValue(cols[4]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_total', line: i, value: (res.getValue(cols[5]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_dias', line: i, value: parseInt(res.getValue(cols[6])) || 0 });
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
                    cli: escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_cliente', line: i })),
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
        xmlStr += '      <td style="border:none; width:40%; align:center;"><p style="font-size:14pt; font-weight:bold;">Reporte de Detracciones</p><p style="font-size:9pt;">Seleccionados: ' + totalReg + '</p></td>';
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
            xmlStr += '<th align="center" width="43%">CLIENTE</th>';
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
        
        // 1. Recolectar IDs con Validación de Nulidad
        let idsClientes = [];
        let totalReg = 0;

        for (let i = 0; i < lineCount; i++) {
            let sel = request.getSublistValue({ group: 'custpage_data_list', name: 'col_select', line: i });
            if (sel === 'T' || sel === true) {
                totalReg++;

                // Usamos fetch de valores con fallback para evitar errores de .trim()}
                let cId = escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_cliente_id', line: i }) || "");
                let cta = escapeXml(request.getSublistValue({ group: 'custpage_data_list', name: 'col_cuenta', line: i }));
     
                 //  if (cId) {
                      idsClientes.push(cId.toString().trim());
                  // }
                    
                }
        }

        //if (idsClientes.length === 0) return response.write("Error: No se pudo recuperar el ID del cliente seleccionado.");

        // --- VISUALIZAR EN EL LOG ---
        log.audit({
           title: 'idsClientes.length ',
           details: idsClientes.length 
           });
      
        // 2. Búsqueda Única (Optimización de Gobernanza)
        let dataAgrupada = {}; 

        // --- VISUALIZAR EN EL LOG ---
        log.audit({
            title: 'idsClientes',
            details: idsClientes
            });

        const [saldosIniciales, saldosInicialesUSD]  = obtenerSaldosInicialesxCtaxCli(params, idsClientes);
      
        // --- VISUALIZAR EN EL LOG ---
        log.audit({
            title: 'saldosIniciales',
            details: saldosIniciales
            });

        // 4. MOVIMIENTOS DEL PERIODO
        let dSearch = search.load({ id: 'customsearch_pe_control_de_detrac_122_2' });

        if (params.custpage_account && params.custpage_account.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'account', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_account }));
        }

        if (params.custpage_client && params.custpage_client.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'entity', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_client }));
        }
        else {
              dSearch.filters.push(search.createFilter({ 
                  name: 'entity', 
                  operator: search.Operator.ANYOF, 
                  values: idsClientes }));
        }
      
        if (params.custpage_date_from && params.custpage_date_to) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'trandate', 
                  operator: search.Operator.WITHIN, 
                  values: [params.custpage_date_from, params.custpage_date_to] }));
        }

      dSearch.filters.push(search.createFilter({ 
            name: 'posting', 
            operator: search.Operator.WITHIN, 
            values: ['T'] }));

      dSearch.filters.push(search.createFilter({ 
            name: 'voided', 
            operator: search.Operator.WITHIN, 
            values: ['F'] }));

      dSearch.filters.push(search.createFilter({ 
            name: 'taxline', 
            operator: search.Operator.WITHIN, 
            values: ['F'] }));

      dSearch.filters.push(search.createFilter({
            name: 'accountingbook',          // El nombre del campo
            join: 'accountingtransaction',   // El join va en una propiedad aparte
            operator: search.Operator.ANYOF, // ANYOF es mejor para IDs
            values: '2'                      // ID del libro
        }));

      
        // Orden crucial para el quiebre
        dSearch.columns = [
            search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            search.createColumn({ name: 'entity', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulatext',
                formula: "CASE WHEN {type} = 'Asiento' THEN {custbody_ht_factura_de_referencia.number} WHEN {type} = 'Journal' THEN {custbody_ht_factura_de_referencia.number} ELSE {number} END", 
                summary: search.Summary.GROUP,
                sort: search.Sort.ASC
            }),
            search.createColumn({ name: 'tranid', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            search.createColumn({ name: 'trandate', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'type', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'currency', summary: search.Summary.GROUP }),   
            search.createColumn({ name: 'fxamount', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'amount', summary: search.Summary.GROUP }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric',
                formula: "CASE WHEN {accountingtransaction.accountingbookid} = '2' THEN {accountingtransaction.amount} ELSE 0 END", 
                summary: search.Summary.GROUP
            }),
            search.createColumn({ name: 'memo', summary: search.Summary.GROUP })
        ];

        let tree = {};
        let counttree = 0;
      
        dSearch.run().each(res => {
            counttree++;

            let cta = res.getText({ name: 'account', summary: search.Summary.GROUP });
            let cli = res.getText({ name: 'entity', summary: search.Summary.GROUP });
            // Extraer el valor de la fórmula
            let docRef = res.getValue({
                name: 'formulatext', summary: search.Summary.GROUP
            }) || "S/R"; // S/R = Sin Referencia
            let doc = res.getValue({ name: 'tranid', summary: search.Summary.GROUP }) || "S/N"; 

            // Declaramos estas variables aquí para poder usarlas abajo
            let fec = res.getValue({ name: 'trandate', summary: search.Summary.GROUP });
            let tip = res.getText({ name: 'type', summary: search.Summary.GROUP });
            let mon = res.getText({ name: 'currency', summary: search.Summary.GROUP });
            let fxamt = parseFloat(res.getValue({ name: 'fxamount', summary: search.Summary.GROUP })) || 0;
            let amt = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.GROUP })) || 0;
            let amtUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.GROUP })) || 0;
            let mem = res.getValue({ name: 'memo', summary: search.Summary.GROUP });
     
            // --- VISUALIZAR EN EL LOG ---
            /*log.audit({
               title: 'Movimientos',
               details: 'counttree: ' + counttree + ' | cta: ' + cta + ' | cli: ' + cli + ' | docRef: ' + docRef + ' | doc: ' + doc + ' | fec: ' + fec + ' | tip: ' + tip + ' | mon: ' + mon + ' | fxamt:' + fxamt + ' | amt:' + amt + ' | mem: ' + mem
               });*/
          
            if (!tree[cta]) tree[cta] = {};
            if (!tree[cta][cli]) tree[cta][cli] = {};
            if (!tree[cta][cli][docRef]) tree[cta][cli][docRef] = [];

            tree[cta][cli][docRef].push({
                doc: doc,
                fec: fec,
                tip: tip,
                mon: mon,
                fxamt: fxamt,
                amt: amt,
                amtUSD: amtUSD,
                mem: mem
            });
            return true;
        });
        // --- VISUALIZAR EN EL LOG ---
            log.audit({
               title: 'counttree',
               details: counttree
               });

        // 5. GENERACIÓN XML

      
        const esc = (s) => s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "") : "";
        let countrecord = 0;
        let xml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xml += '<pdf><head><macrolist><macro id="h"><table style="width:100%;"><tr>';
        xml += '<td width="30%">' + (logoUrl ? '<img src="' + esc(logoUrl) + '" style="width:100px;height:45px;"/>' : '') + '</td>';
        xml += '<td width="40%" align="center" style="font-size:12pt;"><b>DETALLE DE DETRACCIONES</b></td>';
        xml += '<td width="30%" align="right" style="font-size:7pt;">' + esc(params.custpage_date_from) + ' al ' + esc(params.custpage_date_to) + '</td>';
        xml += '</tr></table></macro></macrolist>';
        xml += '<style>body{font-family:sans-serif;font-size:7pt;} table{width:100%;border-collapse:collapse;margin-top:5px;table-layout:fixed;} .cta{background-color:#1a252f;color:white;font-weight:bold;padding:4px;} .cli{background-color:#d5dbdb;font-weight:bold;padding:3px;} th{background-color:#566573;color:white;font-weight:bold;} td{border:0.1pt solid #bdc3c7;padding:2px; vertical-align: middle;}</style></head>';
        //xml += '<body size="letter-landscape" header="h" header-height="0.8in" padding="0.4in">';
        xml += '<body size="letter" header="h" header-height="0.8in" padding="0.4in">';

        for (let cKey in tree) {
            let mCta = 0;
            let mCtaUSD = 0;
            let saldoInicialDeEstaCuenta = saldosInicialesMap[cKey] || 0;
            let saldoInicialDeEstaCuentaUSD = saldosInicialesMapUSD[cKey] || 0;
      
            // --- NIVEL 1: CUENTA ---
            xml += '<table style="margin-top:15px; border:1pt solid black;">';
            xml += '<tr class="cta">';
            xml += '<td width="64%">CUENTA: ' + esc(cKey) + '</td>';
            xml += '<td width="12%" align="right">SALDO INICIAL: </td>';
            xml += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuenta) + '</td>';
            xml += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuentaUSD) + '</td>';
            xml += '</tr>';
            xml += '</table>';

   
 
      for (let lKey in tree[cKey]) {
        let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
        let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
        let mCli = 0;
        let mCliUSD = 0;

        let mCli1 = 0;
        let mCliUSD1 = 0;

        if (params.custpage_hide_zero === 'T') {

             
           for (let dKey in tree[cKey][lKey]) {
               let movsCli = tree[cKey][lKey][dKey];
             
                movsCli.forEach(m => {
                   mCli1 += (m.amt || 0);
                   mCliUSD1 += (m.amtUSD || 0);
                });  
            }
            //--- VISUALIZAR EN EL LOG ---
            log.audit({
                title: 'CLIENTE = 0',
                details: 'lKey: '+ lKey + ' | mCli1: ' + mCli1 + ' | mCliUSD1: ' + mCliUSD1
            });
         }
        else {
          mCli1 = 1;
          mCliUSD1 = 1;
        }
      

  if (mCli1 != 0 || mCliUSD1 != 0 ){
        countrecord++;
        //--- VISUALIZAR EN EL LOG ---
        /*log.audit({
            title: 'CLIENTE',
            details: 'sCliIni: ' + sCliIni + ' | mCli: ' + mCli + 'sCliIniUSD: ' + sCliIniUSD + ' | mCliUSD: ' + mCliUSD
            });*/
        // --- NIVEL 2: CLIENTE ---
        xml += '<table style="margin-top:5px;">';
        xml += '<tr class="cli">';
        xml += '<td width="50%" colspan="5">' + countrecord + ' CLIENTE: ' + esc(lKey) + ':</td>';
        xml += '<td width="26%" align="right">SALDO INICIAL CLIENTE: </td>';
        xml += '<td width="12%" align="right">' + formatNumberPE(sCliIni) + '</td>'
        xml += '<td width="12%" align="right">' + formatNumberPE(sCliIniUSD) + '</td>';
        xml += '</tr>';
        xml += '</table>';
        xml += '<table style="margin-top:5px;">';
        xml += '<tr>';
        xml += '<th width="8%" align="center">Fecha</th>';
        xml += '<th width="8%" align="center">Tipo</th>';
        xml += '<th width="15%" align="center">Documento</th>';
        xml += '<th width="25%" align="center">Glosa</th>';
        xml += '<th width="8%" align="center">Mon</th>';
        xml += '<th width="12%" align="center">Monto Fx</th>';
        xml += '<th width="12%" align="center">Monto</th>';
        xml += '<th width="12%" align="center">Monto USD</th>';
        xml += '</tr>';
      
        for (let dKey in tree[cKey][lKey]) {
            let movs = tree[cKey][lKey][dKey];
            let movs1 = tree[cKey][lKey][dKey];

            let mDoc = 0;
            let mDocUSD = 0;
            let mDocFx = 0;

            let mDocCli = 0;
            let mDocCliUSD = 0;

          if (params.custpage_hide_zero === 'T') {

            movs.forEach(m => {
                mDocCli += (m.amt || 0);
                mDocCliUSD += (m.amtUSD || 0);
               
              //--- VISUALIZAR EN EL LOG ---
              log.audit({
                title: 'MOVIMIENTOS',
                details: 'cKey:' + cKey + ' | lKey: '+ lKey + ' | dKey: '+ dKey + ' | mCli: ' + mCli + ' | mDoc: ' + mDoc + ' | mDocUSD: ' + mDocUSD + ' | mDocFx: ' + mDocFx + ' | mDocCli : '+ mDocCli + ' | mDocCliUSD : '+ mDocCliUSD
                });
            });
          }
            else {
              mDocCli = 1
              mDocCliUSD = 1
            }

        if (mDocCli != 0 || mDocCliUSD != 0) {

            movs1.forEach(m => {
                mDocFx += (m.fxamt || 0);
                mDoc += (m.amt || 0);
                mCli += (m.amt || 0);
                mCta += (m.amt || 0);
                mDocUSD += (m.amtUSD || 0);
                mCliUSD += (m.amtUSD || 0);
                mCtaUSD += (m.amtUSD || 0);

              //--- VISUALIZAR EN EL LOG ---
              log.audit({
                title: 'MOVIMIENTOS',
                details: 'cKey:' + cKey + ' | lKey: '+ lKey + ' | dKey: '+ dKey + ' | mCli: ' + mCli + ' | mDoc: ' + mDoc + ' | mDocFx: ' + mDocFx 
                });
                xml += '<tr>';
                //xml += '<td>' + esc(dKey) + '</td>';
                xml += '<td align="center">' + esc(m.fec) + '</td>';
                xml += '<td>' + esc(m.tip) + '</td>';
                xml += '<td>' + esc(m.doc) + '</td>';
                xml += '<td>' + esc(m.mem) + '</td>';
                xml += '<td align="center">' + esc(m.mon) + '</td>';
                xml += '<td align="right">' + formatNumberPE(m.fxamt) + '</td>';
                xml += '<td align="right">' + formatNumberPE(m.amt) + '</td>';
                xml += '<td align="right">' + formatNumberPE(m.amtUSD) + '</td>';
                xml += '</tr>';
             });
 
             if (movs1.length > 0) {
                xml += '<tr style="background-color:#f9f9f9; font-weight:bold;">';
                xml += '<td colspan="5" align="right">Subtotal Doc ' + esc(dKey) + ':</td>';
                xml += '<td align="right">' + formatNumberPE(mDocFx) + '</td>';
                xml += '<td align="right">' + formatNumberPE(mDoc) + '</td>';
                xml += '<td align="right">' + formatNumberPE(mDocUSD) + '</td>';
                xml += '<td></td></tr>';
             }
           }
        }

        // Resumen Cliente
        xml += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="6" align="right">TOTAL MOVIMIENTOS:</td>';
        xml += '<td align="right">' + formatNumberPE(mCli) + '</td>';
        xml += '<td align="right">' + formatNumberPE(mCliUSD) + '</td></tr>';
        xml += '<tr style="background-color:#d4efdf;font-weight:bold;"><td colspan="6" align="right">SALDO FINAL CLIENTE:</td>';
        xml += '<td align="right">' + formatNumberPE(sCliIni + mCli) + '</td>';
        xml += '<td align="right">' + formatNumberPE(sCliIniUSD + mCliUSD) + '</td></tr>';
        xml += '</table>';
   }
 }
    // Resumen Final de la Cuenta (Asegurando 5 columnas para consistencia si es necesario, o tabla aparte limpia)
    xml += '<table style="margin-top:10px; border:1.5pt solid #1a252f;">';
    xml += '<tr style="font-weight:bold;background-color:#fcf3cf;"><td width="76%" align="right">TOTAL MOVIMIENTOS CUENTA ' + esc(cKey) + ':</td>';
    xml += '<td width="12%" align="right">' + formatNumberPE(mCta) + '</td>';
    xml += '<td width="12%" align="right">' + formatNumberPE(mCtaUSD) + '</td></tr>';
    xml += '<tr style="font-weight:bold;background-color:#d5f5e3;"><td align="right">SALDO FINAL CUENTA ' + esc(cKey) + ':</td>';
    xml += '<td align="right">' + formatNumberPE(saldoInicialDeEstaCuenta + mCta) + '</td>';
    xml += '<td align="right">' + formatNumberPE(saldoInicialDeEstaCuentaUSD + mCtaUSD) + '</td></tr>';
    xml += '</table>';
}

xml += '</body></pdf>';
      
response.renderPdf({ xmlString: xml });
  
    } catch (e) {
        log.error('Error Crítico en PDF Detallado', e);
        response.write("Ocurrió un error al generar el PDF: " + e.message);
    }
}

  
    /**
    * Calcula la suma de importes antes de la fecha de inicio para cada cliente
    */
    function obtenerSaldosIniciales(params) {
        let saldos = {};
        let initialSearch = search.load({ id: 'customsearch_pe_control_de_detrac_122' });
        
        // Filtro: Todo lo anterior a la fecha de inicio
        initialSearch.filters.push(search.createFilter({ 
            name: 'trandate', 
            operator: search.Operator.BEFORE, 
            values: params.custpage_date_from 
        }));

        if (params.custpage_account) initialSearch.filters.push(search.createFilter({ name: 'account', operator: search.Operator.ANYOF, values: params.custpage_account }));

        initialSearch.run().each(res => {
            let cliente = res.getValue(res.columns[1]);
            let monto = parseFloat(res.getValue(res.columns[5])) || 0;
            if (!saldos[cliente]) saldos[cliente] = 0;
            saldos[cliente] += monto;
            return true;
        });
        return saldos;
    }


    /**
    * Calcula la suma de importes antes de la fecha de inicio para cada cliente
    */
    function obtenerSaldosInicialesxCtaxCli(params, pidsClientes) {
        let saldosCli = {};
        let saldosCliUSD = {};
      
        // Verificación de seguridad para los IDs de clientes
        // if (!pidsClientes || pidsClientes.length === 0) return saldos;
     
        let accounts = params.custpage_account ? [params.custpage_account] : ['6303', '6302']; // IDs de tus cuentas 122

        // --- VISUALIZAR EN EL LOG ---
        log.audit({
            title: 'pidsClientes',
            details: pidsClientes
            });

        let mySearch = search.load({ id: 'customsearch_pe_saldos_cta_cli_wht' });

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
            operator: search.Operator.IS,
            values: 'T'
        }));

       // 3. Filtro de Fecha
        mySearch.filters.push(search.createFilter({
            name: 'trandate',
            operator: search.Operator.BEFORE,
            values: params.custpage_date_from
        }));
      
        // 4. Filtro de Multi-Book (CORRECCIÓN IMPORTANTE)
        mySearch.filters.push(search.createFilter({
            name: 'accountingbook',          // El nombre del campo
            join: 'accountingtransaction',   // El join va en una propiedad aparte
            operator: search.Operator.ANYOF, // ANYOF es mejor para IDs
            values: '2'                      // ID del libro
        }));

       // 5. Filtro de Clientes
       // Si pidsClientes tampoco está vacío, lo agregamos también
       if (pidsClientes && pidsClientes.length > 0) {
            mySearch.filters.push(search.createFilter({
                name: 'entity',
                operator: search.Operator.ANYOF,
                values: pidsClientes
            }));
       }
       else {
            mySearch.filters.push(search.createFilter({
                name: 'entity',
                operator: search.Operator.ANYOF,
                values: params.custpage_client
            }));
       }

        // 6. Definimos las columnas (esto sobrescribirá las columnas de la búsqueda guardada)
        mySearch.columns = [
            search.createColumn({
               name: 'account',
               summary: search.Summary.GROUP
            }),
            search.createColumn({
               name: 'entity',
               summary: search.Summary.GROUP
            }),
            search.createColumn({
               name: 'amount',
               summary: search.Summary.SUM
            }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric',
                formula: "CASE WHEN {accountingtransaction.accountingbookid} = '2' THEN {accountingtransaction.amount} ELSE 0 END", 
                summary: search.Summary.SUM
            })
        ];      

        mySearch.run().each(res => {
        let cuenta = res.getText({ name: 'account', summary: search.Summary.GROUP });

        // El ID interno se obtiene con getValue sobre 'entity'
        let clienteId = res.getValue({ name: 'entity', summary: search.Summary.GROUP });
        let cliente = res.getText({ name: 'entity', summary: search.Summary.GROUP });
        
        let monto = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.SUM })) || 0;
        let montoUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.SUM })) || 0;
 
      
      /*      
        var filters = [
            ['trandate', 'before', params.custpage_date_from],
            'AND',
            ['posting', 'is', 'T']
        ];

       if (params.custpage_account) {
          // El código se ejecuta si NO está vacío
          log.debug('Status', 'La cuenta tiene el valor: ' + params.custpage_account);
          // Si hay cuenta, la agregamos al array de filtros
          filters.push('AND');
          filters.push(['account', 'anyof', params.custpage_account]);
       }
       else {
          // Si NO hay cuenta, la agregamos al array de filtros
          filters.push('AND');
          filters.push(['account', 'anyof', accounts]);
  
       }

       // Si pidsClientes tampoco está vacío, lo agregamos también
       if (pidsClientes && pidsClientes.length > 0) {
          filters.push('AND');
          filters.push(['entity', 'anyof', pidsClientes]);
      }

       let initialSearch = search.create({
           type: search.Type.TRANSACTION,
           filters: filters,
           columns: [
               search.createColumn({ name: 'account', summary: search.Summary.GROUP }),
               search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
               search.createColumn({ name: 'amount', summary: search.Summary.SUM })
            ]
       });
           
        initialSearch.run().each(res => {
           let cuenta = res.getText({ name: 'account', summary: search.Summary.GROUP });

           // El ID interno se obtiene con getValue sobre 'entity'
           let clienteId = res.getValue({ name: 'entity', summary: search.Summary.GROUP });
           let cliente = res.getText({ name: 'entity', summary: search.Summary.GROUP });
        
           let monto = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.SUM })) || 0;
*/
           // --- VISUALIZAR EN EL LOG ---
           log.audit({
            title: 'Saldo Procesado',
            details: 'Cuenta: ' + cuenta + ' | clienteId: ' + clienteId +' | Cliente: ' + cliente + ' | Monto: ' + monto + ' | Monto USD: ' + montoUSD
           });
           
            // --- SOLUCIÓN AL ERROR 'UNDEFINED' ---
            if (!saldosCli[cuenta]) {
               saldosCli[cuenta] = {}; // Inicializamos el primer nivel (Cuenta)
            }

            if (!saldosCliUSD[cuenta]) {
               saldosCliUSD[cuenta] = {}; // Inicializamos el primer nivel (Cuenta)
            }
        
            if (!saldosCli[cuenta][cliente]) {
               saldosCli[cuenta][cliente] = 0; // Inicializamos el segundo nivel (Cliente)
            }

            if (!saldosCliUSD[cuenta][cliente]) {
               saldosCliUSD[cuenta][cliente] = 0; // Inicializamos el segundo nivel (Cliente)
            }
 
            saldosCli[cuenta][cliente] += monto;
            saldosCliUSD[cuenta][cliente] += montoUSD;

             // --- VISUALIZAR EN EL LOG ---
             /*   log.audit({
                   title: 'saldos[cuenta][cliente]',
                   details: saldos[cuenta][cliente]
                });*/
            
            return true;
        });
        return [saldosCli, saldosCliUSD];
    }

  
    function obtenerSaldosPorCuenta(params) {
        let saldosCuentas = {};
        let saldosCuentasUSD = {};
        let accounts = params.custpage_account ? [params.custpage_account] : ['6303', '6302']; // IDs de tus cuentas 122

        let mySearch = search.load({ id: 'customsearch_pe_saldos_cta_wht' });

        // 1. Filtro de Cuenta
        mySearch.filters.push(search.createFilter({
            name: 'account',
            operator: search.Operator.ANYOF,
            values: accounts // Asumiendo que 'accounts' ya es un array de IDs
        }));

        // 2. Filtro de Posting
        mySearch.filters.push(search.createFilter({
            name: 'posting',
            operator: search.Operator.IS,
            values: 'T'
        }));

        // 3. Filtro de Fecha
        mySearch.filters.push(search.createFilter({
            name: 'trandate',
            operator: search.Operator.BEFORE,
            values: params.custpage_date_from
        }));

        // 4. Filtro de Multi-Book (CORRECCIÓN IMPORTANTE)
        mySearch.filters.push(search.createFilter({
            name: 'accountingbook',          // El nombre del campo
            join: 'accountingtransaction',   // El join va en una propiedad aparte
            operator: search.Operator.ANYOF, // ANYOF es mejor para IDs
            values: '2'                      // ID del libro
        }));

        // 5. Definimos las columnas (esto sobrescribirá las columnas de la búsqueda guardada)
        mySearch.columns = [
            search.createColumn({
               name: 'account',
               summary: search.Summary.GROUP
            }),
            search.createColumn({
               name: 'amount',
               summary: search.Summary.SUM
            }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric',
                formula: "CASE WHEN {accountingtransaction.accountingbookid} = '2' THEN {accountingtransaction.amount} ELSE 0 END", 
                summary: search.Summary.SUM
            })
        ];      
     
     mySearch.run().each(res => {
        let accountName = res.getText({ name: 'account', summary: search.Summary.GROUP });
        let monto = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.SUM })) || 0;
        let montoUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.SUM })) || 0;
       
        // --- VISUALIZAR EN EL LOG ---
        log.audit({
            title: 'Saldos',
            details: monto + ' | ' + montoUSD
            });
        saldosCuentas[accountName] = monto;
        saldosCuentasUSD[accountName] = montoUSD;
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

        let idsClientes = [];
        for (let i = 0; i < lineCount; i++) {
            let sel = request.getSublistValue({ group: 'custpage_data_list', name: 'col_select', line: i });
            if (sel === 'T' || sel === true) {
                let cId = request.getSublistValue({ group: 'custpage_data_list', name: 'col_cliente_id', line: i }) || "";
                idsClientes.push(cId.toString().trim());
            }
        }

        const [saldosIniciales, saldosInicialesUSD] = obtenerSaldosInicialesxCtaxCli(params, idsClientes);

        // --- BÚSQUEDA DE MOVIMIENTOS (Igual a la del PDF Detallado) ---
      //  let dSearch = search.load({ id: 'customsearch_pe_control_de_detrac_122_2' });
        // ... (Aquí debe ir la misma configuración de filtros y columnas que usas en generarPDFDetallado) ...
        // Nota: Por brevedad, asumo que dSearch ya tiene los filtros aplicados arriba.
        
        // let tree = {}; // Estructura de datos igual a generarPDFDetallado
        // [Copia aquí el ciclo dSearch.run().each de tu función generarPDFDetallado]
      
        // 4. MOVIMIENTOS DEL PERIODO
        let dSearch = search.load({ id: 'customsearch_pe_control_de_detrac_122_2' });

        if (params.custpage_account && params.custpage_account.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'account', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_account }));
        }

        if (params.custpage_client && params.custpage_client.length > 0) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'entity', 
                  operator: search.Operator.ANYOF, 
                  values: params.custpage_client }));
        }
        else {
              dSearch.filters.push(search.createFilter({ 
                  name: 'entity', 
                  operator: search.Operator.ANYOF, 
                  values: idsClientes }));
        }
      
        if (params.custpage_date_from && params.custpage_date_to) {
             dSearch.filters.push(search.createFilter({ 
                  name: 'trandate', 
                  operator: search.Operator.WITHIN, 
                  values: [params.custpage_date_from, params.custpage_date_to] }));
        }

      dSearch.filters.push(search.createFilter({ 
            name: 'posting', 
            operator: search.Operator.WITHIN, 
            values: ['T'] }));

      dSearch.filters.push(search.createFilter({ 
            name: 'voided', 
            operator: search.Operator.WITHIN, 
            values: ['F'] }));

      dSearch.filters.push(search.createFilter({ 
            name: 'taxline', 
            operator: search.Operator.WITHIN, 
            values: ['F'] }));

      dSearch.filters.push(search.createFilter({
            name: 'accountingbook',          // El nombre del campo
            join: 'accountingtransaction',   // El join va en una propiedad aparte
            operator: search.Operator.ANYOF, // ANYOF es mejor para IDs
            values: '2'                      // ID del libro
        }));

      
        // Orden crucial para el quiebre
        dSearch.columns = [
            search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            search.createColumn({ name: 'entity', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulatext',
                formula: "CASE WHEN {type} = 'Asiento' THEN {custbody_ht_factura_de_referencia.number} WHEN {type} = 'Journal' THEN {custbody_ht_factura_de_referencia.number} ELSE {number} END", 
                summary: search.Summary.GROUP,
                sort: search.Sort.ASC
            }),
            search.createColumn({ name: 'tranid', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
            search.createColumn({ name: 'trandate', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'type', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'currency', summary: search.Summary.GROUP }),   
            search.createColumn({ name: 'fxamount', summary: search.Summary.GROUP }),
            search.createColumn({ name: 'amount', summary: search.Summary.GROUP }),
            // AGREGAMOS LA FÓRMULA AQUÍ
            search.createColumn({
                name: 'formulanumeric',
                formula: "CASE WHEN {accountingtransaction.accountingbookid} = '2' THEN {accountingtransaction.amount} ELSE 0 END", 
                summary: search.Summary.GROUP
            }),
            search.createColumn({ name: 'memo', summary: search.Summary.GROUP })
        ];

        let tree = {};
        let counttree = 0;
      
        dSearch.run().each(res => {
            counttree++;

            let cta = res.getText({ name: 'account', summary: search.Summary.GROUP });
            let cli = res.getText({ name: 'entity', summary: search.Summary.GROUP });
            // Extraer el valor de la fórmula
            let docRef = res.getValue({
                name: 'formulatext', summary: search.Summary.GROUP
            }) || "S/R"; // S/R = Sin Referencia
            let doc = res.getValue({ name: 'tranid', summary: search.Summary.GROUP }) || "S/N"; 

            // Declaramos estas variables aquí para poder usarlas abajo
            let fec = res.getValue({ name: 'trandate', summary: search.Summary.GROUP });
            let tip = res.getText({ name: 'type', summary: search.Summary.GROUP });
            let mon = res.getText({ name: 'currency', summary: search.Summary.GROUP });
            let fxamt = parseFloat(res.getValue({ name: 'fxamount', summary: search.Summary.GROUP })) || 0;
            let amt = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.GROUP })) || 0;
            let amtUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.GROUP })) || 0;
            let mem = res.getValue({ name: 'memo', summary: search.Summary.GROUP });
     
            // --- VISUALIZAR EN EL LOG ---
            /*log.audit({
               title: 'Movimientos',
               details: 'counttree: ' + counttree + ' | cta: ' + cta + ' | cli: ' + cli + ' | docRef: ' + docRef + ' | doc: ' + doc + ' | fec: ' + fec + ' | tip: ' + tip + ' | mon: ' + mon + ' | fxamt:' + fxamt + ' | amt:' + amt + ' | mem: ' + mem
               });*/
          
            if (!tree[cta]) tree[cta] = {};
            if (!tree[cta][cli]) tree[cta][cli] = {};
            if (!tree[cta][cli][docRef]) tree[cta][cli][docRef] = [];

            tree[cta][cli][docRef].push({
                doc: doc,
                fec: fec,
                tip: tip,
                mon: mon,
                fxamt: fxamt,
                amt: amt,
                amtUSD: amtUSD,
                mem: mem
            });
            return true;
        });

      
        // --- VISUALIZAR EN EL LOG ---
            log.audit({
               title: 'counttree',
               details: counttree
               });
           
      // --- CONSTRUCCIÓN DEL CONTENIDO EXCEL ---
        let countrecord = 0;
        let xls = '<html><head><meta charset="UTF-8"></head><body>';
        xls += '<table border="1">';
        
        for (let cKey in tree) {
            let mCta = 0;
            let mCtaUSD = 0;

            // Fila de Cuenta
            xls += `<tr style="background-color: #1a252f; color: white; font-weight: bold;">
                        <td colspan="5">CUENTA: ${cKey}</td>
                        <td>Saldo Inicial </td><td>${saldosInicialesMap[cKey] || 0}</td>
                        <td>${saldosInicialesMapUSD[cKey] || 0}</td>
                    </tr>`;
            
            for (let lKey in tree[cKey]) {
                let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
                let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
                let mCli = 0;
                let mCliUSD = 0;

                countrecord++;

                // Fila de Cliente
                xls += `<tr style="background-color: #d5dbdb; font-weight: bold;">
                            <td colspan="5">${countrecord} CLIENTE: ${lKey}</td>
                            <td>Saldo Inicial</td><td>${sCliIni}</td>
                            <td>${sCliIniUSD}</td>
                        </tr>`;

                // Encabezados de Columnas
                xls += `<tr style="background-color: #566573; color: white;">
                            <th>Fecha</th><th>Tipo</th><th>Documento</th><th>Glosa</th><th>Moneda</th>
                            <th>Monto Fx</th><th>Monto MN</th><th>Monto USD</th>
                        </tr>`;

                for (let dKey in tree[cKey][lKey]) {
                    let mDocFx = 0;
                    let mDoc = 0;
                    let mDocUSD = 0;

                    tree[cKey][lKey][dKey].forEach(m => {
                        mDocFx += (m.fxamt || 0);
                        mDoc += (m.amt || 0);
                        mDocUSD += (m.amtUSD || 0);
                      
                        mCta += (m.amt || 0);
                        mCtaUSD += (m.amtUSD || 0);
                        mCli += (m.amt || 0);
                        mCliUSD += (m.amtUSD || 0);
     
                        xls += `<tr>
                                    <td>${m.fec}</td><td>${m.tip}</td><td>${m.doc}</td><td>${m.mem}</td><td>${m.mon}</td>
                                    <td>${m.fxamt}</td><td>${m.amt}</td><td>${m.amtUSD}</td>
                                </tr>`;
                    });

                  xls += `<tr>
                        <th colspan="5" align="right">Subtotal Doc: ${dKey} </th>
                        <th align="right">${mDocFx}</th>
                        <th align="right">${mDoc}</th>
                        <th align="right">${mDocUSD}</th>
                        </tr>`;
                  
                }
                xls += `<tr style="background-color: #566573; color: white;">
                        <th colspan="6">Total de Movimiento</th>
                        <th align="right">${mCli}</th>
                        <th align="right">${mCliUSD}</th>
                        </tr>`;
                let mTotalCli = sCliIni + mCli;
                let mTotalCliUSD = sCliIniUSD + mCliUSD;
                
                xls += `<tr style="background-color: #d5dbdb; font-weight: bold;"> 
                       <th colspan="6" align="right">Saldo Final Cliente:</th>
                       <th align="right">${mTotalCli}</th>
                       <th align="right">${mTotalCliUSD}</th>
                       </tr>`;
            }

          
          let mTotalCta = saldosInicialesMap[cKey] + mCta;
          let mTotalCtaUSD = saldosInicialesMapUSD[cKey] + mCtaUSD;
          
          xls += `<tr style="background-color: #1a252f; color: white; font-weight: bold;">
                        <th colspan="6" align="right">Total de Movimiento Cuenta:  ${cKey} </th>
                        <th align="right">${mCta}</th>
                        <th align="right">${mCtaUSD}</th>
                        </tr>`;
          
          xls += `<tr style="background-color: #1a252f; color: white; font-weight: bold;">
                        <th colspan="6" align="right">Saldo Final Cuenta:  ${cKey} </th>
                        <th align="right">${mTotalCta}</th>
                        <th align="right">${mTotalCtaUSD}</th>
                        </tr>`;
          
          xls += '<tr></tr>';
        }
        xls += '</table></body></html>';

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