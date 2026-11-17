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
        let primerDia = new Date('2025-12-01T00:00:00');

        let primerDiaString = format.format({ value: primerDia, type: format.Type.DATE });
        let hoyString = format.format({ value: hoy, type: format.Type.DATE });
      
        try {
            if (request.method === 'POST') {
                if (params.custpage_btn_type === 'pdf') return generarPDF(request, response);
                if (params.custpage_btn_type === 'pdf_detallado') return generarPDFDetallado(request, response);
                if (params.custpage_btn_type === 'excel_detallado') return generarExcelDetallado(request, response);
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

            // FILTRO DE LIBRO CONTABLE
            let bookField = form.addField({ id: 'custpage_accounting_book', type: serverWidget.FieldType.SELECT, label: 'Libro Contable', container: 'filter_grp' });
            bookField.addSelectOption({ value: '1', text: 'Primary Accounting Book (PEN)' });
            bookField.addSelectOption({ value: '2', text: 'USD GAAP (USD)' });
            if (params.custpage_accounting_book) bookField.defaultValue = params.custpage_accounting_book;

            let dateGrp = form.addFieldGroup({ id: 'date_grp', label: 'Rango de Fechas' });
            let dateFromField = form.addField({ id: 'custpage_date_from', type: serverWidget.FieldType.DATE, label: 'Fecha Inicio', container: 'date_grp' });
            dateFromField.isMandatory = true;
            dateFromField.defaultValue = params.custpage_date_from || primerDiaString;
            if (params.custpage_date_from) dateFromField.defaultValue = params.custpage_date_from;

            let dateToField = form.addField({ id: 'custpage_date_to', type: serverWidget.FieldType.DATE, label: 'Fecha Fin', container: 'date_grp' });
            dateToField.isMandatory = true;
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

                 if (typeof NS !== 'undefined' && NS.form) {
                    NS.form.isSubmitted = false;
                 }
                 document.getElementById("custpage_btn_type").value = "pdf"; 
                 var formHtml = document.getElementById('main_form');
                 var oldTarget = formHtml.target;
                 
                 formHtml.target = '_blank'; 
                 var originalBeforeUnload = window.onbeforeunload;
                 window.onbeforeunload = null; 
                 
                 document.getElementById("submitter").click(); 

                 setTimeout(function(){ 
                    formHtml.target = oldTarget; 
                    if (typeof NS !== 'undefined' && NS.form) {
                       NS.form.isSubmitted = false; 
                    }
                 }, 1000);
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

                 if (typeof NS !== 'undefined' && NS.form) {
                     NS.form.isSubmitted = false;
                 }
                 document.getElementById("custpage_btn_type").value = "pdf_detallado";
                 var formHtml = document.getElementById('main_form');
                 var oldTarget = formHtml.target;
                 
                 formHtml.target = '_blank';
                 window.onbeforeunload = null; 
                 document.getElementById("submitter").click(); 
        
                setTimeout(function(){ 
                    formHtml.target = oldTarget; 
                    if (typeof NS !== 'undefined' && NS.form) {
                       NS.form.isSubmitted = false; 
                    }
                 }, 1000);
                 
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
                    var oldTarget = formHtml.target;
                    
                    formHtml.target = '_blank'; 
                    window.onbeforeunload = null; 
                    document.getElementById("submitter").click(); 

                    setTimeout(function(){ 
                        formHtml.target = oldTarget; 
                        if (typeof NS !== 'undefined' && NS.form) { NS.form.isSubmitted = false; }
                    }, 1000);
                })()`
            });
          
            // --- LÓGICA DE PROCESAMIENTO ---
            if (request.method === 'POST') {
                if (!params.custpage_date_from || !params.custpage_date_to) {
                    throw new Error("Las fechas de inicio y fin son obligatorias.");
                }

                let saldosIniciales = obtenerSaldosIniciales(params);

                let filters = [
                    ['posting', 'is', 'T'],
                    'AND',
                    ['voided', 'is', 'F'],
                    'AND',
                    ['taxline', 'is', 'F']
                ];

                if (params.custpage_date_from && params.custpage_date_to) {
                    filters.push('AND', ['trandate', 'within', params.custpage_date_from, params.custpage_date_to]);
                }
                if (params.custpage_client) {
                    filters.push('AND', ['entity', 'anyof', params.custpage_client]);
                }
                if (params.custpage_account) {
                    filters.push('AND', ['account', 'anyof', params.custpage_account]);
                } else {
                    filters.push('AND', ['account', 'anyof', ['6303', '6302']]);
                }

                let mySearch = search.create({
                    type: search.Type.TRANSACTION,
                    filters: filters,
                    columns: [
                        search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                        search.createColumn({ name: 'entity', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                        search.createColumn({ name: 'currency', summary: search.Summary.GROUP }),
                        search.createColumn({
                            name: 'formulanumeric',
                            formula: "CASE WHEN {currency} = 'PEN' THEN {amount} ELSE 0 END",
                            summary: search.Summary.SUM
                        }),
                        search.createColumn({
                            name: 'formulanumeric',
                            formula: "CASE WHEN {currency} != 'PEN' THEN {amount} ELSE 0 END",
                            summary: search.Summary.SUM
                        }),
                        search.createColumn({ name: 'amount', summary: search.Summary.SUM }),
                        search.createColumn({
                            name: 'formulanumeric',
                            formula: "ROUND(MAX({today}) - MAX({trandate}))",
                            summary: search.Summary.MAX
                        })
                    ]
                });

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

                sublist.addField({ id: 'col_select', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar' });
                sublist.addField({ id: 'col_index', type: serverWidget.FieldType.TEXT, label: '#' });
                sublist.addField({ id: 'col_cuenta', type: serverWidget.FieldType.TEXT, label: 'CUENTA' });
                sublist.addField({ id: 'col_cliente', type: serverWidget.FieldType.TEXT, label: 'CLIENTE' });
                sublist.addField({ id: 'col_cliente_id', type: serverWidget.FieldType.TEXT, label: 'ID Cliente' });
                sublist.addField({ id: 'col_saldo_ini', type: serverWidget.FieldType.CURRENCY, label: 'SALDO INICIAL' });
                sublist.addField({ id: 'col_moneda', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                sublist.addField({ id: 'col_mn', type: serverWidget.FieldType.CURRENCY, label: 'SALDO MN' });
                sublist.addField({ id: 'col_me', type: serverWidget.FieldType.CURRENCY, label: 'SALDO ME' });
                sublist.addField({ id: 'col_total', type: serverWidget.FieldType.CURRENCY, label: 'TOTAL' });
                sublist.addField({ id: 'col_dias', type: serverWidget.FieldType.INTEGER, label: 'DÍAS' });

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

                log.audit({
                    title: 'nombresSinId',
                    details: nombresSinId
                });

                let mapaIdsRecuperados = {};

                if (nombresSinId.length > 0) {
                   let searchFilters = [];
                   for (let i = 0; i < nombresSinId.length; i++) {
                       searchFilters.push(['entityid', 'is', nombresSinId[i]]);
                       if (i < nombresSinId.length - 1) {
                          searchFilters.push('OR');
                       }
                  } 

                 search.create({
                    type: search.Type.ENTITY,
                    filters: searchFilters,
                    columns: ['internalid', 'entityid']
                 }).run().each(function(result) {
                    let name = result.getValue('entityid');
                    mapaIdsRecuperados[name] = result.id;
                    return true;
                    });
                 }

                 log.audit({
                     title: 'mapaIdsRecuperados',
                     details: mapaIdsRecuperados
                 });

                finalData.forEach((res, i) => {
                    let cols = res.columns;
                    let clientText = res.getText(cols[1]);
                    let rawClientId = res.getValue(cols[1]);

                    if (!rawClientId && clientText) {
                       for (let codigo in mapaIdsRecuperados) {
                          if (codigo.indexOf(clientText) !== -1 || clientText.indexOf(codigo) !== -1) {
                             rawClientId = mapaIdsRecuperados[codigo];
                             break; 
                          }
                       }
                    }
                 
                    let clientId = rawClientId ? rawClientId.toString() : (mapaIdsRecuperados[clientText] || null);

                    let sInicial = 0; 
                    if (clientId && saldosIniciales[clientId]) {
                       sInicial = parseFloat(saldosIniciales[clientId]) || 0;
                    }

                    let movPeriodo = parseFloat(res.getValue(res.columns[5])) || 0;

                    sublist.setSublistValue({ id: 'col_index', line: i, value: (i + 1).toString() });
                    sublist.setSublistValue({ id: 'col_cuenta', line: i, value: res.getText(cols[0]) || " " });
                    sublist.setSublistValue({ id: 'col_cliente', line: i, value: res.getText(cols[1]) || " " });

                    sublist.setSublistValue({ 
                         id: 'col_cliente_id', 
                         line: i, 
                        value: clientId ? clientId.toString() : " " 
                    });

                    sublist.setSublistValue({ id: 'col_moneda', line: i, value: res.getText(cols[2]) || " " });
                    sublist.setSublistValue({ id: 'col_saldo_ini', line: i, value: sInicial.toString() });
                    sublist.setSublistValue({ id: 'col_mn', line: i, value: (res.getValue(cols[3]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_me', line: i, value: (res.getValue(cols[4]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_total', line: i, value: (res.getValue(cols[5]) || 0).toString() });
                    sublist.setSublistValue({ id: 'col_dias', line: i, value: parseInt(res.getValue(cols[6])) || 0 });
                });
            }

            let resetScript = form.addField({
                id: 'custpage_reset_script',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
             });

             resetScript.defaultValue = `
             <script>
             window.addEventListener('mousedown', function() {
                if (typeof NS !== 'undefined' && NS.form) {
                   NS.form.isSubmitted = false;
                }
              });
              </script>
              `;

            response.writePage(form);

        } catch (e) {
            log.error('ERROR_GENERAL', e);
            response.write("Error: " + e.message);
        }
    };

    function generarPDF(request, response) {
        const params = request.parameters;
        const [saldosInicialesMap,saldosInicialesMapUSD] = obtenerSaldosPorCuenta(params);
        const ID_LOGO_CABINET = '2240'; 
        let logoUrl = '';

        try {
            const logoFile = file.load({ id: ID_LOGO_CABINET });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;

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
        let rowIndexGlobal = 1;
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
                    idx: rowIndexGlobal++,
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
            let saldoInicialDeEstaCuenta = saldosInicialesMap[cta] || 0;
            let saldoFinalDeEstaCuenta = saldoInicialDeEstaCuenta + dataPorCuenta[cta].tT;
                      
            log.debug({
                title: 'Saldo inicial',
                details: saldoInicialDeEstaCuenta
            });
            
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
            });

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
        const params = request.parameters || {};
        const lineCount = request.getLineCount({ group: 'custpage_data_list' }) || 0;
        const ID_LOGO_CABINET = '2240'; 
        let logoUrl = '';

        let saldosInicialesMap = {}, saldosInicialesMapUSD = {};
        try {
            let resSaldos = obtenerSaldosPorCuenta(params);
            if (resSaldos && resSaldos.length >= 2) {
                saldosInicialesMap = resSaldos[0] || {};
                saldosInicialesMapUSD = resSaldos[1] || {};
            }
        } catch (eSaldos) {
            log.error('Error al obtenerSaldosPorCuenta', eSaldos);
        }

        try {
            const logoFile = file.load({ id: ID_LOGO_CABINET });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;
        } catch (err) {
            log.error('Error cargando logo', err);
        }

        const esc = (s) => {
            if (s === null || s === undefined) return "";
            return s.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
        };

        let idsClientes = [];
        for (let i = 0; i < lineCount; i++) {
            let sel = request.getSublistValue({ group: 'custpage_data_list', name: 'col_select', line: i });
            if (sel === 'T' || sel === true) {
                let cId = request.getSublistValue({ group: 'custpage_data_list', name: 'col_cliente_id', line: i });
                if (cId) idsClientes.push(cId.toString().trim());
            }
        }

        let saldosIniciales = {}, saldosInicialesUSD = {};
        try {
            let resCli = obtenerSaldosInicialesxCtaxCli(params, idsClientes);
            if (resCli && resCli.length >= 2) {
                saldosIniciales = resCli[0] || {};
                saldosInicialesUSD = resCli[1] || {};
            }
        } catch (eCli) {
            log.error('Error en obtenerSaldosInicialesxCtaxCli', eCli);
        }

        let selectedBook = params.custpage_accounting_book || '1';
        let omitirCero = (params.custpage_hide_zero === 'T');
      
        let filtersDetallado = [
            ['posting', 'is', 'T'],
            'AND',
            ['voided', 'is', 'F'],
            'AND',
            ['taxline', 'is', 'F'],
            'AND',
            ['accountingtransaction.accountingbook', 'anyof', selectedBook]
        ];

        if (params.custpage_account) {
            filtersDetallado.push('AND', ['account', 'anyof', params.custpage_account]);
        }
        if (params.custpage_client) {
            filtersDetallado.push('AND', ['entity', 'anyof', params.custpage_client]);
        } else if (idsClientes.length > 0) {
            filtersDetallado.push('AND', ['entity', 'anyof', idsClientes]);
        }
        if (params.custpage_date_from && params.custpage_date_to) {
            filtersDetallado.push('AND', ['trandate', 'within', params.custpage_date_from, params.custpage_date_to]);
        }

        let dSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: filtersDetallado,
            columns: [
                search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                search.createColumn({ name: 'entity', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
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
                search.createColumn({
                    name: 'formulanumeric',
                    formula: `CASE WHEN {accountingtransaction.accountingbookid} = '${selectedBook}' THEN {accountingtransaction.amount} ELSE 0 END`, 
                    summary: search.Summary.GROUP
                }),
                search.createColumn({ name: 'memo', summary: search.Summary.GROUP })
            ]
        });

        let tree = {};
        let pagedPdfDetallado = dSearch.runPaged({ pageSize: 1000 });
        pagedPdfDetallado.pageRanges.forEach((pageRange) => {
            let page = pagedPdfDetallado.fetch({ index: pageRange.index });
            page.data.forEach((res) => {
                let cta = res.getText({ name: 'account', summary: search.Summary.GROUP }) || "SIN CUENTA";
                let cli = res.getText({ name: 'entity', summary: search.Summary.GROUP }) || "SIN CLIENTE";
                let docRef = res.getValue({ name: 'formulatext', summary: search.Summary.GROUP }) || "S/R";
                let doc = res.getValue({ name: 'tranid', summary: search.Summary.GROUP }) || "S/N"; 
                let fec = res.getValue({ name: 'trandate', summary: search.Summary.GROUP }) || "";
                let tip = res.getText({ name: 'type', summary: search.Summary.GROUP }) || "";
                let mon = res.getText({ name: 'currency', summary: search.Summary.GROUP }) || "";
                let fxamt = parseFloat(res.getValue({ name: 'fxamount', summary: search.Summary.GROUP })) || 0;
                let amt = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.GROUP })) || 0;
                let amtUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.GROUP })) || 0;
                let mem = res.getValue({ name: 'memo', summary: search.Summary.GROUP }) || "";

                if (!tree[cta]) tree[cta] = {};
                if (!tree[cta][cli]) tree[cta][cli] = {};
                if (!tree[cta][cli][docRef]) tree[cta][cli][docRef] = [];

                tree[cta][cli][docRef].push({ doc, fec, tip, mon, fxamt, amt, amtUSD, mem });
            });
        });

        let nombreLibro = (String(selectedBook) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";
      
        let xml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xml += '<pdf><head><macrolist><macro id="h"><table style="width:100%;"><tr>';
        xml += '<td width="30%">' + (logoUrl ? '<img src="' + esc(logoUrl) + '" style="width:100px;height:45px;"/>' : '') + '</td>';
        xml += '<td width="40%" align="center" style="font-size:12pt;"><b>DETALLE DE DETRACCIONES</b></td>';
        xml += '<td width="30%" align="right" style="font-size:7pt;">' + esc(params.custpage_date_from) + ' al ' + esc(params.custpage_date_to) + '<br/>Libro: ' + esc(nombreLibro) + '</td>';
        xml += '</tr></table></macro></macrolist>';
        xml += '<style>body{font-family:sans-serif;font-size:7pt;} table{width:100%;border-collapse:collapse;margin-top:5px;table-layout:fixed;} .cta{background-color:#1a252f;color:white;font-weight:bold;padding:4px;} .cli{background-color:#d5dbdb;font-weight:bold;padding:3px;} th{background-color:#566573;color:white;font-weight:bold;} td{border:0.1pt solid #bdc3c7;padding:2px; vertical-align: middle;}</style></head>';
        xml += '<body size="letter" header="h" header-height="0.8in" padding="0.4in">';

        let countrecord = 0;

        for (let cKey in tree) {
            let mCta = 0, mCtaUSD = 0;
            let saldoInicialDeEstaCuenta = saldosInicialesMap[cKey] || 0;
            let saldoInicialDeEstaCuentaUSD = saldosInicialesMapUSD[cKey] || 0;

            let htmlCuenta = '<table style="margin-top:15px; border:1pt solid black;">';
            htmlCuenta += '<tr class="cta">';
            htmlCuenta += '<td width="64%">CUENTA: ' + esc(cKey) + '</td>';
            htmlCuenta += '<td width="24%" align="right">SALDO INICIAL: </td>';
            if (selectedBook === '1') {
                htmlCuenta += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuenta) + '</td>';   
            } else {
                htmlCuenta += '<td width="12%" align="right">' + formatNumberPE(saldoInicialDeEstaCuentaUSD) + '</td>';
            }
            htmlCuenta += '</tr></table>';

            let clientesHTML = '';

            for (let lKey in tree[cKey]) {
                let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
                let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
                let mCli = 0, mCliUSD = 0;

                let docsHTML = '';

                for (let dKey in tree[cKey][lKey]) {
                    let movs = tree[cKey][lKey][dKey];
                    let mDocFx = 0, mDoc = 0, mDocUSD = 0;
                    let movsFilas = '';

                    movs.forEach(m => {
                        mDocFx += (m.fxamt || 0);
                        mDoc += (m.amt || 0);
                        mDocUSD += (m.amtUSD || 0);

                        movsFilas += '<tr>';
                        movsFilas += '<td align="center">' + esc(m.fec) + '</td>';
                        movsFilas += '<td>' + esc(m.tip) + '</td>';
                        movsFilas += '<td>' + esc(m.doc) + '</td>';
                        movsFilas += '<td>' + esc(m.mem) + '</td>';
                        movsFilas += '<td align="center">' + esc(m.mon) + '</td>';
                        movsFilas += '<td align="right">' + formatNumberPE(m.fxamt) + '</td>';
                        if (selectedBook === '1') {
                           movsFilas += '<td align="right">' + formatNumberPE(m.amt) + '</td>';
                        } else {
                           movsFilas += '<td align="right">' + formatNumberPE(m.amtUSD) + '</td>';
                        }
                        movsFilas += '</tr>';
                    });

                    let subtotalEval = (selectedBook === '1') ? mDoc : mDocUSD;
                    if (omitirCero && Math.abs(subtotalEval) < 0.01) {
                        continue;
                    }

                    mCli += mDoc;
                    mCliUSD += mDocUSD;

                    if (movs.length > 0) {
                        docsHTML += movsFilas;
                        docsHTML += '<tr style="background-color:#f9f9f9; font-weight:bold;">';
                        docsHTML += '<td colspan="6" align="right">Subtotal Doc ' + esc(dKey) + ':</td>';
                        if (selectedBook === '1') {                        
                           docsHTML += '<td align="right">' + formatNumberPE(mDoc) + '</td>';
                        } else {
                           docsHTML += '<td align="right">' + formatNumberPE(mDocUSD) + '</td>';
                        }
                        docsHTML += '</tr>';
                    }
                }

                let movsEval = (selectedBook === '1') ? mCli : mCliUSD;
                let sCliIniEval = (selectedBook === '1') ? sCliIni : sCliIniUSD;
                let saldoFinalCliEval = sCliIniEval + movsEval;

                if (omitirCero && (Math.abs(movsEval) < 0.01 || Math.abs(saldoFinalCliEval) < 0.01)) {
                    continue;
                }

                mCta += mCli;
                mCtaUSD += mCliUSD;
                countrecord++;

                let clienteBlock = '<table style="margin-top:5px;">';
                clienteBlock += '<tr class="cli">';
                clienteBlock += '<td width="50%" colspan="5">' + countrecord + ' CLIENTE: ' + esc(lKey) + '</td>';
                clienteBlock += '<td width="38%" align="right">SALDO INICIAL CLIENTE: </td>';
                if (selectedBook === '1') {
                   clienteBlock += '<td width="12%" align="right">' + formatNumberPE(sCliIni) + '</td>';
                } else { 
                   clienteBlock += '<td width="12%" align="right">' + formatNumberPE(sCliIniUSD) + '</td>';
                }
                clienteBlock += '</tr></table>';

                clienteBlock += '<table style="margin-top:2px;"><thead><tr>';
                clienteBlock += '<th width="12%" align="center">Fecha</th>';
                clienteBlock += '<th width="12%" align="center">Tipo</th>';
                clienteBlock += '<th width="18%" align="center">Documento</th>';
                clienteBlock += '<th width="26%" align="center">Glosa</th>';
                clienteBlock += '<th width="8%" align="center">Mon</th>';
                clienteBlock += '<th width="12%" align="center">Monto Fx</th>';
                if (selectedBook === '1') {
                   clienteBlock += '<th width="12%" align="center">Monto PEN</th>';
                } else {
                   clienteBlock += '<th width="12%" align="center">Monto USD</th>';
                }
                clienteBlock += '</tr></thead><tbody>';

                clienteBlock += docsHTML;

                clienteBlock += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="6" align="right">TOTAL MOVIMIENTOS:</td>';
                if (selectedBook === '1') {
                   clienteBlock += '<td align="right">' + formatNumberPE(mCli) + '</td>';
                } else {
                   clienteBlock += '<td align="right">' + formatNumberPE(mCliUSD) + '</td>';
                }
                clienteBlock += '</tr>';

                clienteBlock += '<tr style="background-color:#d4efdf;font-weight:bold;"><td colspan="6" align="right">SALDO FINAL CLIENTE:</td>';
                if (selectedBook === '1') {                
                   clienteBlock += '<td align="right">' + formatNumberPE(sCliIni + mCli) + '</td>';
                } else {
                   clienteBlock += '<td align="right">' + formatNumberPE(sCliIniUSD + mCliUSD) + '</td>';
                }
                clienteBlock += '</tr>';
                clienteBlock += '</tbody></table>';

                clientesHTML += clienteBlock;
            }

            if (clientesHTML !== '') {
                xml += htmlCuenta + clientesHTML;

                xml += '<table style="margin-top:10px; border:1.5pt solid #1a252f;">';
                xml += '<tr style="font-weight:bold;background-color:#fcf3cf;"><td width="88%" align="right">TOTAL MOVIMIENTOS CUENTA ' + esc(cKey) + ':</td>';
                if (selectedBook === '1') {            
                   xml += '<td width="12%" align="right">' + formatNumberPE(mCta) + '</td>';
                } else {
                   xml += '<td width="12%" align="right">' + formatNumberPE(mCtaUSD) + '</td>';
                }             
                xml += '</tr>';

                xml += '<tr style="font-weight:bold;background-color:#d5f5e3;"><td align="right">SALDO FINAL CUENTA ' + esc(cKey) + ':</td>';
                if (selectedBook === '1') {
                   xml += '<td align="right">' + formatNumberPE(saldoInicialDeEstaCuenta + mCta) + '</td>';
                } else {
                   xml += '<td align="right">' + formatNumberPE(saldoInicialDeEstaCuentaUSD + mCtaUSD) + '</td>';
                }
                xml += '</tr>';

                xml += '</table>';
            }
        }

        xml += '</body></pdf>';

        response.renderPdf({ xmlString: xml });

    } catch (e) {
        log.error('Error Fatal en PDF Detallado', e);
        response.write("<h3>Ocurrió un error al procesar la solicitud:</h3><pre>" + e.message + "\n" + e.stack + "</pre>");
    }
}

    function obtenerSaldosIniciales(params) {
        let saldos = {};
        let filters = [
            ['posting', 'is', 'T'],
            'AND',
            ['voided', 'is', 'F'],
            'AND',
            ['taxline', 'is', 'F']
        ];

        if (params.custpage_date_from) {
            filters.push('AND', ['trandate', 'before', params.custpage_date_from]);
        }
        if (params.custpage_account) {
            filters.push('AND', ['account', 'anyof', params.custpage_account]);
        } else {
            filters.push('AND', ['account', 'anyof', ['6303', '6302']]);
        }

        let initialSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: filters,
            columns: [
                search.createColumn({ name: 'account', summary: search.Summary.GROUP }),
                search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                search.createColumn({ name: 'currency', summary: search.Summary.GROUP }),
                search.createColumn({
                    name: 'formulanumeric',
                    formula: "CASE WHEN {currency} = 'PEN' THEN {amount} ELSE 0 END",
                    summary: search.Summary.SUM
                }),
                search.createColumn({
                    name: 'formulanumeric',
                    formula: "CASE WHEN {currency} != 'PEN' THEN {amount} ELSE 0 END",
                    summary: search.Summary.SUM
                }),
                search.createColumn({ name: 'amount', summary: search.Summary.SUM }),
                search.createColumn({
                    name: 'formulanumeric',
                    formula: "ROUND(MAX({today}) - MAX({trandate}))",
                    summary: search.Summary.MAX
                })
            ]
        });

        let pagedSaldos = initialSearch.runPaged({ pageSize: 1000 });
        pagedSaldos.pageRanges.forEach((pageRange) => {
            let page = pagedSaldos.fetch({ index: pageRange.index });
            page.data.forEach((res) => {
                let cliente = res.getValue(res.columns[1]);
                let monto = parseFloat(res.getValue(res.columns[5])) || 0;
                if (!saldos[cliente]) saldos[cliente] = 0;
                saldos[cliente] += monto;
            });
        });

        return saldos;
    }

function obtenerSaldosInicialesxCtaxCli(params, idsClientes) {
    let saldosPEN = {};
    let saldosUSD = {};

    try {
        let hasClientParam = params && params.custpage_client;
        let hasSelectedClients = idsClientes && Array.isArray(idsClientes) && idsClientes.length > 0;

        if (!hasClientParam && !hasSelectedClients) {
            return [saldosPEN, saldosUSD];
        }

        let searchFilters = [
            ['posting', 'is', 'T'],
            'AND',
            ['voided', 'is', 'F'],
            'AND',
            ['taxline', 'is', 'F']
        ];

        if (params && params.custpage_date_from) {
            searchFilters.push('AND', ['trandate', 'before', params.custpage_date_from]);
        }

        if (params && params.custpage_account) {
            searchFilters.push('AND', ['account', 'anyof', params.custpage_account]);
        }

        if (hasClientParam) {
            searchFilters.push('AND', ['entity', 'anyof', params.custpage_client]);
        } else if (hasSelectedClients) {
            searchFilters.push('AND', ['entity', 'anyof', idsClientes]);
        }

        let sInit = search.create({
            type: search.Type.TRANSACTION,
            filters: searchFilters,
            columns: [
                search.createColumn({ name: 'account', summary: search.Summary.GROUP }),
                search.createColumn({ name: 'entity', summary: search.Summary.GROUP }),
                search.createColumn({ name: 'amount', summary: search.Summary.SUM }),
                search.createColumn({ name: 'fxamount', summary: search.Summary.SUM })
            ]
        });

        let pagedInit = sInit.runPaged({ pageSize: 1000 });
        pagedInit.pageRanges.forEach((pageRange) => {
            let page = pagedInit.fetch({ index: pageRange.index });
            page.data.forEach((res) => {
                let cta = res.getText({ name: 'account', summary: search.Summary.GROUP }) || "SIN CUENTA";
                let cli = res.getText({ name: 'entity', summary: search.Summary.GROUP }) || "SIN CLIENTE";
                let amt = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.SUM })) || 0;
                let amtUSD = parseFloat(res.getValue({ name: 'fxamount', summary: search.Summary.SUM })) || 0;

                if (!saldosPEN[cta]) saldosPEN[cta] = {};
                if (!saldosUSD[cta]) saldosUSD[cta] = {};

                saldosPEN[cta][cli] = (saldosPEN[cta][cli] || 0) + amt;
                saldosUSD[cta][cli] = (saldosUSD[cta][cli] || 0) + amtUSD;
            });
        });

    } catch (e) {
        log.error('Error prevenido en obtenerSaldosInicialesxCtaxCli', e);
    }

    return [saldosPEN, saldosUSD];
}
  
    function obtenerSaldosPorCuenta(params) {
        let saldosCuentas = {};
        let saldosCuentasUSD = {};
        let accounts = params.custpage_account ? [params.custpage_account] : ['6303', '6302'];

        let selectedBook = (params && params.custpage_accounting_book) ? params.custpage_accounting_book : '1';

        let mySearch = search.create({
            type: search.Type.TRANSACTION,
            filters: [
                ['account', 'anyof', accounts],
                'AND',
                ['posting', 'is', 'T'],
                'AND',
                ['trandate', 'before', params.custpage_date_from],
                'AND',
                ['accountingtransaction.accountingbook', 'anyof', selectedBook]
            ],
            columns: [
                search.createColumn({
                   name: 'account',
                   summary: search.Summary.GROUP
                }),
                search.createColumn({
                   name: 'amount',
                   summary: search.Summary.SUM
                }),
                search.createColumn({
                   name: 'formulanumeric',
                   formula: `CASE WHEN {accountingtransaction.accountingbookid} = '${selectedBook}' THEN {accountingtransaction.amount} ELSE 0 END`, 
                    summary: search.Summary.SUM
                })
            ]
        });
     
        let pagedAccountSaldos = mySearch.runPaged({ pageSize: 1000 });
        pagedAccountSaldos.pageRanges.forEach((pageRange) => {
            let page = pagedAccountSaldos.fetch({ index: pageRange.index });
            page.data.forEach((res) => {
                let accountName = res.getText({ name: 'account', summary: search.Summary.GROUP });
                let monto = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.SUM })) || 0;
                let montoUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.SUM })) || 0;
               
                log.audit({
                    title: 'Saldos',
                    details: monto + ' | ' + montoUSD
                });

                saldosCuentas[accountName] = monto;
                saldosCuentasUSD[accountName] = montoUSD;
            });
        });

        return [saldosCuentas, saldosCuentasUSD];
    }

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
        let selectedBook = params.custpage_accounting_book || '1';
        let omitirCero = (params.custpage_hide_zero === 'T');
        let date_from = params.custpage_date_from;
        let date_to = params.custpage_date_to;

        let filtersExcel = [
            ['posting', 'is', 'T'],
            'AND',
            ['voided', 'is', 'F'],
            'AND',
            ['taxline', 'is', 'F'],
            'AND',
            ['accountingtransaction.accountingbook', 'anyof', selectedBook]
        ];

        if (params.custpage_account && params.custpage_account.length > 0) {
            filtersExcel.push('AND', ['account', 'anyof', params.custpage_account]);
        }

        if (params.custpage_client && params.custpage_client.length > 0) {
            filtersExcel.push('AND', ['entity', 'anyof', params.custpage_client]);
        } else if (idsClientes.length > 0) {
            filtersExcel.push('AND', ['entity', 'anyof', idsClientes]);
        }
      
        if (params.custpage_date_from && params.custpage_date_to) {
            filtersExcel.push('AND', ['trandate', 'within', params.custpage_date_from, params.custpage_date_to]);
        }

        let dSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: filtersExcel,
            columns: [
                search.createColumn({ name: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
                search.createColumn({ name: 'entity', summary: search.Summary.GROUP, sort: search.Sort.ASC }),
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
                search.createColumn({
                    name: 'formulanumeric',
                    formula: `CASE WHEN {accountingtransaction.accountingbookid} = '${selectedBook}' THEN {accountingtransaction.amount} ELSE 0 END`, 
                    summary: search.Summary.GROUP
                }),
                search.createColumn({ name: 'memo', summary: search.Summary.GROUP })
            ]
        });

        let tree = {};
        let counttree = 0;

        let pagedExcel = dSearch.runPaged({ pageSize: 1000 });
        pagedExcel.pageRanges.forEach((pageRange) => {
            let page = pagedExcel.fetch({ index: pageRange.index });
            page.data.forEach((res) => {
                counttree++;

                let cta = res.getText({ name: 'account', summary: search.Summary.GROUP });
                let cli = res.getText({ name: 'entity', summary: search.Summary.GROUP });
                let docRef = res.getValue({
                    name: 'formulatext', summary: search.Summary.GROUP
                }) || "S/R";
                let doc = res.getValue({ name: 'tranid', summary: search.Summary.GROUP }) || "S/N"; 

                let fec = res.getValue({ name: 'trandate', summary: search.Summary.GROUP });
                let tip = res.getText({ name: 'type', summary: search.Summary.GROUP });
                let mon = res.getText({ name: 'currency', summary: search.Summary.GROUP });
                let fxamt = parseFloat(res.getValue({ name: 'fxamount', summary: search.Summary.GROUP })) || 0;
                let amt = parseFloat(res.getValue({ name: 'amount', summary: search.Summary.GROUP })) || 0;
                let amtUSD = parseFloat(res.getValue({ name: 'formulanumeric', summary: search.Summary.GROUP })) || 0;
                let mem = res.getValue({ name: 'memo', summary: search.Summary.GROUP });

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
            });
        });

        log.audit({
           title: 'counttree',
           details: counttree
        });

        const escapeXmlStr = (str) => {
            if (str === null || str === undefined) return "";
            return str.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        let nombreLibro = (String(selectedBook) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";

        // CONSTRUCCIÓN DE EXCEL XML (SpreadsheetML) optimizado para grandes volúmenes
        let countrecord = 0;
        let xmlExcel = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xmlExcel += '<?mso-application progid="Excel.Sheet"?>\n';
        xmlExcel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
        xmlExcel += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
        xmlExcel += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
        xmlExcel += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
        xmlExcel += 'xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        
        xmlExcel += '<Styles>\n';
        xmlExcel += ' <Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Calibri" ss:Size="11"/></Style>\n';
        xmlExcel += ' <Style ss:ID="HeaderCta"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#1A252F" ss:Pattern="Solid"/></Style>\n';
        xmlExcel += ' <Style ss:ID="HeaderCli"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#D5DBDB" ss:Pattern="Solid"/></Style>\n';
        xmlExcel += ' <Style ss:ID="HeaderTable"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#566573" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>\n';
        xmlExcel += ' <Style ss:ID="SubtotalRow"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F2F4F4" ss:Pattern="Solid"/></Style>\n';
        xmlExcel += ' <Style ss:ID="TotalCliRow"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#EBF5FB" ss:Pattern="Solid"/></Style>\n';
        xmlExcel += ' <Style ss:ID="FinalCliRow"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#D4EFDF" ss:Pattern="Solid"/></Style>\n';
        xmlExcel += ' <Style ss:ID="NumFormat"><NumberFormat ss:Format="#,##0.00"/></Style>\n';
        xmlExcel += ' <Style ss:ID="NumFormatBold"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/></Style>\n';
        xmlExcel += '</Styles>\n';

        xmlExcel += '<Worksheet ss:Name="Detalle Detracciones">\n<Table>\n';

        xmlExcel += '<Column ss:Width="80"/>\n<Column ss:Width="90"/>\n<Column ss:Width="120"/>\n<Column ss:Width="200"/>\n<Column ss:Width="70"/>\n<Column ss:Width="90"/>\n<Column ss:Width="90"/>\n<Column ss:Width="90"/>\n';
        
        for (let cKey in tree) {
            let mCta = 0, mCtaUSD = 0;   
            let saldoInicialDeEstaCuenta = saldosInicialesMap[cKey] || 0;
            let saldoInicialDeEstaCuentaUSD = saldosInicialesMapUSD[cKey] || 0;

            let ctaRowsXml = '';

            ctaRowsXml += `<Row ss:StyleID="HeaderCta">
                <Cell ss:MergeAcross="4"><Data ss:Type="String">DETALLE DE DETRACCIONES ${date_from} - ${date_to}</Data></Cell>
                <Cell ss:MergeAcross="1"><Data ss:Type="String">${nombreLibro}</Data></Cell></Row>\n
                <Row ss:StyleID="HeaderCta">
                <Cell ss:MergeAcross="4"><Data ss:Type="String">CUENTA: ${escapeXmlStr(cKey)}</Data></Cell>
                <Cell><Data ss:Type="String">Saldo Inicial</Data></Cell>`;

            if (selectedBook === '1') {
                ctaRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${saldoInicialDeEstaCuenta}</Data></Cell>\n`;
            } else {
                ctaRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${saldoInicialDeEstaCuentaUSD}</Data></Cell>\n`;
            }
            ctaRowsXml += `</Row>\n`; 
            
            let clientesRowsXml = '';

            for (let lKey in tree[cKey]) {
                let sCliIni = (saldosIniciales[cKey] && saldosIniciales[cKey][lKey]) ? saldosIniciales[cKey][lKey] : 0;
                let sCliIniUSD = (saldosInicialesUSD[cKey] && saldosInicialesUSD[cKey][lKey]) ? saldosInicialesUSD[cKey][lKey] : 0;
                let mCli = 0, mCliUSD = 0;

                let docsRowsXml = '';

                for (let dKey in tree[cKey][lKey]) {
                    let mDocFx = 0, mDoc = 0, mDocUSD = 0;
                    let movsRowsXml = '';

                    tree[cKey][lKey][dKey].forEach(m => {
                        mDocFx += (m.fxamt || 0);
                        mDoc += (m.amt || 0);
                        mDocUSD += (m.amtUSD || 0);
                      
                        movsRowsXml += `<Row>
                            <Cell><Data ss:Type="String">${escapeXmlStr(m.fec)}</Data></Cell>
                            <Cell><Data ss:Type="String">${escapeXmlStr(m.tip)}</Data></Cell>
                            <Cell><Data ss:Type="String">${escapeXmlStr(m.doc)}</Data></Cell>
                            <Cell><Data ss:Type="String">${escapeXmlStr(m.mem)}</Data></Cell>
                            <Cell><Data ss:Type="String">${escapeXmlStr(m.mon)}</Data></Cell>
                            <Cell ss:StyleID="NumFormat"><Data ss:Type="Number">${m.fxamt}</Data></Cell>`;
                        if (selectedBook === '1') {
                             movsRowsXml += `<Cell ss:StyleID="NumFormat"><Data ss:Type="Number">${m.amt}</Data></Cell>`;
                        } else {
                             movsRowsXml += `<Cell ss:StyleID="NumFormat"><Data ss:Type="Number">${m.amtUSD}</Data></Cell>`;
                        }
                        movsRowsXml += `</Row>\n`;
                    });

                    let subtotalEval = (selectedBook === '1') ? mDoc : mDocUSD;
                    if (omitirCero && Math.abs(subtotalEval) < 0.01) {
                        continue;
                    }

                    mCli += mDoc;
                    mCliUSD += mDocUSD;

                    docsRowsXml += movsRowsXml;
                    docsRowsXml += `<Row ss:StyleID="SubtotalRow">
                        <Cell ss:MergeAcross="5"><Data ss:Type="String">Subtotal Doc: ${escapeXmlStr(dKey)}</Data></Cell>`;
                        //<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mDocFx}</Data></Cell>
                    if (selectedBook === '1') {
                        docsRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mDoc}</Data></Cell>`;
                    } else {
                        docsRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mDocUSD}</Data></Cell>`;
                    }
                    docsRowsXml += `</Row>\n`;
                }

                let movsEval = (selectedBook === '1') ? mCli : mCliUSD;
                let sCliIniEval = (selectedBook === '1') ? sCliIni : sCliIniUSD;
                let saldoFinalCliEval = sCliIniEval + movsEval;

                if (omitirCero && (Math.abs(movsEval) < 0.01 || Math.abs(saldoFinalCliEval) < 0.01)) {
                    continue;
                }

                mCta += mCli;
                mCtaUSD += mCliUSD;
                countrecord++;

                clientesRowsXml += `<Row ss:StyleID="HeaderCli">
                    <Cell ss:MergeAcross="4"><Data ss:Type="String">${countrecord} CLIENTE: ${escapeXmlStr(lKey)}</Data></Cell>
                    <Cell><Data ss:Type="String">Saldo Inicial</Data></Cell>`;
                if (selectedBook === '1') {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${sCliIni}</Data></Cell>`;
                } else {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${sCliIniUSD}</Data></Cell>`;
                }
                clientesRowsXml += `</Row>\n`;

                clientesRowsXml += `<Row ss:StyleID="HeaderTable">
                    <Cell><Data ss:Type="String">Fecha</Data></Cell>
                    <Cell><Data ss:Type="String">Tipo</Data></Cell>
                    <Cell><Data ss:Type="String">Documento</Data></Cell>
                    <Cell><Data ss:Type="String">Glosa</Data></Cell>
                    <Cell><Data ss:Type="String">Moneda</Data></Cell>
                    <Cell><Data ss:Type="String">Monto Fx</Data></Cell>`;
                if (selectedBook === '1') {
                    clientesRowsXml += `<Cell><Data ss:Type="String">Monto MN</Data></Cell>`;
                } else {
                    clientesRowsXml += `<Cell><Data ss:Type="String">Monto USD</Data></Cell>`;
                }
                clientesRowsXml += `</Row>\n`;

                clientesRowsXml += docsRowsXml;

                clientesRowsXml += `<Row ss:StyleID="TotalCliRow">
                    <Cell ss:MergeAcross="5"><Data ss:Type="String">Total de Movimiento</Data></Cell>`;
                if (selectedBook === '1') {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mCli}</Data></Cell>`;
                } else {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mCliUSD}</Data></Cell>`;
                }
                clientesRowsXml += `</Row>\n`;

                let mTotalCli = sCliIni + mCli;
                let mTotalCliUSD = sCliIniUSD + mCliUSD;
                
                clientesRowsXml += `<Row ss:StyleID="FinalCliRow"> 
                    <Cell ss:MergeAcross="5"><Data ss:Type="String">Saldo Final Cliente:</Data></Cell>`;
                if (selectedBook === '1') {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mTotalCli}</Data></Cell>`;
                } else {
                    clientesRowsXml += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mTotalCliUSD}</Data></Cell>`;
                }
                clientesRowsXml += `</Row>\n`;
            }

            if (clientesRowsXml !== '') {
                xmlExcel += ctaRowsXml + clientesRowsXml;

                let mTotalCta = saldoInicialDeEstaCuenta + mCta;
                let mTotalCtaUSD = saldoInicialDeEstaCuentaUSD + mCtaUSD;

                xmlExcel += `<Row ss:StyleID="HeaderCta">
                    <Cell ss:MergeAcross="5"><Data ss:Type="String">Total de Movimiento Cuenta: ${escapeXmlStr(cKey)}</Data></Cell>`;
                if (selectedBook === '1') {
                    xmlExcel += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mCta}</Data></Cell>`;
                } else {
                    xmlExcel += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mCtaUSD}</Data></Cell>`;
                }
                xmlExcel += `</Row>\n`;

                log.audit({
                   title: 'LOG Cuenta',
                   details: cKey + ' | ' + saldoInicialDeEstaCuenta + ' | ' + saldoInicialDeEstaCuentaUSD + ' | ' + mCta + ' | ' + mCtaUSD + ' | ' + mTotalCta + ' | ' + mTotalCtaUSD
                }); 
              
                xmlExcel += `<Row ss:StyleID="HeaderCta">
                    <Cell ss:MergeAcross="5"><Data ss:Type="String">Saldo Final Cuenta: ${escapeXmlStr(cKey)}</Data></Cell>`;
                if (selectedBook === '1') {
                    xmlExcel += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mTotalCta}</Data></Cell>`;
                } else {
                    xmlExcel += `<Cell ss:StyleID="NumFormatBold"><Data ss:Type="Number">${mTotalCtaUSD}</Data></Cell>`;
                }
                xmlExcel += `</Row>\n<Row></Row>\n`;
            }
        }

        xmlExcel += '</Table>\n</Worksheet>\n</Workbook>';

        let base64Encoded = moduloEncode.convert({
            string: xmlExcel,
            inputEncoding: moduloEncode.Encoding.UTF_8,
            outputEncoding: moduloEncode.Encoding.BASE_64
        });

        let excelFile = file.create({
            name: 'Reporte_Detallado.xls',
            fileType: file.Type.EXCEL,
            contents: base64Encoded
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