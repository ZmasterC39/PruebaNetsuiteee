/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/url', 'N/query', 'N/log', 'N/search', 'N/runtime'], (url, query, log, search, runtime) => {


    function pageInit(context) {
        try {
            const currentRecord = context.currentRecord;
            let {id, subsidiary, role} = runtime.getCurrentUser();

            // ! ███████████████████ Primera búsqueda: Facturas de venta ███████████████████
            var transactionSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                [
                    ["customform","anyof","101"],
                    "AND",
                    ["trandate","within","thismonth"],
                    "AND",
                    ["subsidiary","anyof","2"],
                    "AND",
                    ["createdfrom","noneof","@NONE@"],
                    "AND",
                    ["accounttype","anyof","Income","COGS","Expense","OthIncome","OthExpense","AcctRec"]
                ],
                columns:
                [
                    search.createColumn({name: "mainline"}),
                    search.createColumn({name: "trandate"}),
                    search.createColumn({name: "tranid"}),
                    search.createColumn({name: "location"}),
                    search.createColumn({name: "entity"}),
                    search.createColumn({name: "internalid",join: "item"}),
                    search.createColumn({name: "displayname", join: "item"}),
                    search.createColumn({name: "amount"}),
                    search.createColumn({name: "createdfrom"})
                ]
            });

            let facturar_creado_desde = [];
            let facturasPorOS = {};

            let pagedData = transactionSearchObj.runPaged({ pageSize: 1000 });

            pagedData.pageRanges.forEach(function(pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function(result) {
                    let createdfrom_id = result.getValue({ name: 'createdfrom' });
                    let createdfrom_text = result.getText({ name: 'createdfrom' });

                    if (!facturasPorOS[createdfrom_id]) {
                        facturasPorOS[createdfrom_id] = {
                            os_id: createdfrom_id,
                            os_nombre: createdfrom_text,
                            factura_id: '',
                            factura_fecha: '',
                            cliente: '',
                            ubicacion: '',
                            items: {},
                            ejecuciones: {}
                        };
                        facturar_creado_desde.push(createdfrom_id);
                    }

                    let mainline = result.getValue({ name: 'mainline' });
                    let tranid = result.getValue({ name: 'tranid' });
                    let trandate = result.getValue({ name: 'trandate' });
                    let entity = result.getText({ name: 'entity' });
                    let location = result.getText({ name: 'location' }) || result.getValue({ name: 'location' });

                    if (!facturasPorOS[createdfrom_id].factura_id && tranid) {
                        facturasPorOS[createdfrom_id].factura_id = tranid;
                    }
                    if (!facturasPorOS[createdfrom_id].factura_fecha && trandate) {
                        facturasPorOS[createdfrom_id].factura_fecha = trandate;
                    }
                    if (!facturasPorOS[createdfrom_id].cliente && entity) {
                        facturasPorOS[createdfrom_id].cliente = entity;
                    }
                    if (!facturasPorOS[createdfrom_id].ubicacion && location) {
                        facturasPorOS[createdfrom_id].ubicacion = location;
                    }

                    if (mainline !== 'T') {
                        let itemId = result.getValue({ name: 'internalid', join: 'item' });
                        let itemName = result.getValue({ name: 'displayname', join: 'item' });
                        let amount = result.getValue({ name: 'amount' });
                        
                        if (itemId && itemName) {
                            if (!facturasPorOS[createdfrom_id].items[itemId]) {
                                facturasPorOS[createdfrom_id].items[itemId] = {
                                    item_id: itemId,
                                    item_nombre: itemName,
                                    precio: amount || '0'
                                };
                            }
                        }
                    }
                });
            });


            // ! ███████████████████ Segunda búsqueda: Formulario de Ejecución ███████████████████
            var secondSearchObj = search.create({
                type: "transaction",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                [
                    ["customform","anyof","194"],
                    "AND",
                    ["subsidiary","anyof","2"],
                    "AND",
                    ["createdfrom","anyof",facturar_creado_desde]
                ],
                columns:
                [
                    search.createColumn({name: "mainline"}),
                    search.createColumn({name: "createdby"}),
                    search.createColumn({name: "lastmodifieddate"}),
                    search.createColumn({name: "location"}),
                    search.createColumn({name: "createdfrom"}),
                    search.createColumn({name: "tranid"}),
                    search.createColumn({name: "displayname", join: "item"}),
                    search.createColumn({name: "internalid", join: "item"}),
                    search.createColumn({name: "account"}),
                    search.createColumn({name: "debitamount"})
                ]
            });

            let pagedData2 = secondSearchObj.runPaged({ pageSize: 1000 });

            pagedData2.pageRanges.forEach(function(pageRange) {
                let page = pagedData2.fetch({ index: pageRange.index });

                page.data.forEach(function(result) {
                    let createdfrom_id = result.getValue({ name: 'createdfrom' });
                    let account = result.getText({ name: 'account' }) || result.getValue({ name: 'account' });
                    let mainline = result.getValue({ name: 'mainline' });
                    let itemId = result.getValue({ name: 'internalid', join: 'item' });

                    if (facturasPorOS[createdfrom_id] && mainline !== 'T' && account && account.toString().charAt(0) === '5') {
                        let debit = result.getValue({ name: 'debitamount' });
                        if (debit && itemId) {
                            if (!facturasPorOS[createdfrom_id].ejecuciones[itemId]) {
                                facturasPorOS[createdfrom_id].ejecuciones[itemId] = [];
                            }
                            facturasPorOS[createdfrom_id].ejecuciones[itemId].push({
                                tranid: result.getValue({ name: 'tranid' }),
                                createdby: result.getText({ name: 'createdby' }),
                                lastmodifieddate: result.getValue({ name: 'lastmodifieddate' }),
                                location: result.getText({ name: 'location' }),
                                item_id: itemId,
                                item: result.getValue({ name: 'displayname', join: 'item' }),
                                cuenta: account,
                                debito: debit
                            });
                        }
                    }
                });
            });

            // ! ███████████████████ Generar HTML - MATCHING POR ITEM ID ███████████████████
            let html = '<style>' +
                ':root { --primary: #0070d2; --primary-dark: #005fb2; --success: #10b981; --gray-50: #fafafa; --gray-100: #f5f5f5; --gray-200: #e5e5e5; --gray-300: #d4d4d4; --gray-600: #525252; --gray-700: #404040; --gray-900: #171717; }' +
                '.report-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }' +
                'table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12px; }' +
                'thead { position: sticky; top: 0; z-index: 100; }' +
                'th { background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%); color: var(--gray-900); padding: 12px 16px; text-align: left; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--gray-300); white-space: nowrap; }' +
                'td { padding: 10px 16px; border-bottom: 1px solid var(--gray-200); vertical-align: top; color: var(--gray-900); }' +
                'tbody tr .report-row{ transition: background-color 0.15s ease; }' +
                'tbody tr .report-row:hover { background-color: var(--gray-50); }' +
                'tbody tr:last-child td { border-bottom: none; }' +
                '.text-right { text-align: right; }' +
                '.text-mono { font-family: "Courier New", Consolas, monospace; }' +
                '.amount { font-weight: 600; color: var(--success); }' +
                '.factura-id { font-weight: 600; color: var(--primary); }' +
                '.fecha { color: var(--gray-600); font-size: 12px; }' +
                '</style>';

            html += '<div class="report-wrapper">';
            html += '<table>';
            html += '<thead><tr>' +
                '<th>Factura</th>' +
                '<th>Fecha</th>' +
                '<th>Cliente</th>' +
                '<th>Ubicación</th>' +
                '<th>Orden Servicio</th>' +
                '<th>Item id</th>' +
                '<th>Item Factura</th>' +
                '<th class="text-right">Precio Factura</th>' +
                '<th>Ejecución</th>' +
                '<th>Usuario ingreso</th>' +
                '<th>Auditoria ingreso</th>' +
                '<th>Bodega</th>' +
                '<th>Item Ejecución</th>' +
                '<th>Cuenta (5###)</th>' +
                '<th class="text-right">Débito</th>' +
                '</tr></thead>';
            html += '<tbody>';

            // Ordenar por fecha (más reciente primero)
            let osOrdenados = Object.keys(facturasPorOS).sort(function(a, b) {
                let fechaA = facturasPorOS[a].factura_fecha || '';
                let fechaB = facturasPorOS[b].factura_fecha || '';
                return fechaB.localeCompare(fechaA);
            });

            // UNA FILA POR CADA ITEM_ID (matching entre factura y ejecución)
            osOrdenados.forEach(function(os_id) {
                let grupo = facturasPorOS[os_id];

                // Obtener todos los item_ids únicos (de factura y ejecución)
                let todosLosItemIds = {};
                
                Object.keys(grupo.items).forEach(function(itemId) {
                    todosLosItemIds[itemId] = true;
                });
                
                Object.keys(grupo.ejecuciones).forEach(function(itemId) {
                    todosLosItemIds[itemId] = true;
                });

                let itemIds = Object.keys(todosLosItemIds);

                if (itemIds.length === 0) {
                    // Si no hay items, mostrar una fila vacía
                    html += '<tr class="report-row">';
                    html += '<td><span class="factura-id">' + (grupo.factura_id || '-') + '</span></td>';
                    html += '<td><span class="fecha">' + (grupo.factura_fecha || '-') + '</span></td>';
                    html += '<td>' + (grupo.cliente || '-') + '</td>';
                    html += '<td>' + (grupo.ubicacion || '-') + '</td>';
                    html += '<td><strong>' + (grupo.os_nombre || '-') + '</strong></td>';
                    html += '<td>-</td><td>-</td><td class="text-right">-</td>';
                    html += '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td class="text-right">-</td>';
                    html += '</tr>';
                } else {
                    // Procesar cada item_id
                    itemIds.forEach(function(itemId) {
                        let itemFactura = grupo.items[itemId];
                        let ejecucionesItem = grupo.ejecuciones[itemId] || [];

                        // Si hay ejecuciones, crear una fila por cada ejecución
                        // Si no hay ejecuciones, crear una fila solo con info de factura
                        let numFilas = Math.max(ejecucionesItem.length, 1);

                        for (let i = 0; i < numFilas; i++) {
                            html += '<tr class="report-row">';

                            // Datos de la factura/OS (se repiten en cada fila)
                            html += '<td><span class="factura-id">' + (grupo.factura_id || '-') + '</span></td>';
                            html += '<td><span class="fecha">' + (grupo.factura_fecha || '-') + '</span></td>';
                            html += '<td>' + (grupo.cliente || '-') + '</td>';
                            html += '<td>' + (grupo.ubicacion || '-') + '</td>';
                            html += '<td><strong>' + (grupo.os_nombre || '-') + '</strong></td>';

                            // Item ID y datos de factura (solo en primera fila de este item)
                            if (i === 0) {
                                html += '<td>' + (itemId || '-') + '</td>';
                                if (itemFactura) {
                                    html += '<td>' + (itemFactura.item_nombre || '-') + '</td>';
                                    html += '<td class="text-right"><span class="amount">' + parseFloat(itemFactura.precio).toFixed(2) + '</span></td>';
                                } else {
                                    html += '<td>-</td>';
                                    html += '<td class="text-right">-</td>';
                                }
                            } else {
                                // Filas adicionales de ejecución: repetir item_id pero dejar factura vacía
                                html += '<td>' + (itemId || '-') + '</td>';
                                html += '<td>-</td>';
                                html += '<td class="text-right">-</td>';
                            }

                            // Ejecución correspondiente
                            if (ejecucionesItem[i]) {
                                let ej = ejecucionesItem[i];
                                html += '<td>' + (ej.tranid || '-') + '</td>';
                                html += '<td>' + (ej.createdby || '-') + '</td>';
                                html += '<td>' + (ej.lastmodifieddate || '-') + '</td>';
                                html += '<td>' + (ej.location || '-') + '</td>';
                                html += '<td>' + (ej.item || '-') + '</td>';
                                html += '<td class="text-mono">' + (ej.cuenta || '-') + '</td>';
                                html += '<td class="text-right"><span class="amount">' + parseFloat(ej.debito).toFixed(2) + '</span></td>';
                            } else {
                                html += '<td>-</td>';
                                html += '<td>-</td>';
                                html += '<td>-</td>';
                                html += '<td>-</td>';
                                html += '<td>-</td>';
                                html += '<td class="text-right">-</td>';
                            }

                            html += '</tr>';
                        }
                    });
                }
            });

            html += '</tbody></table></div>';

            currentRecord.setValue({
                fieldId: 'custpage_report',
                value: html
            });

            window.descargarExcel = function () {
                try {
                    var table = document.querySelector(".report-wrapper table") || document.querySelector("table");
                    if (!table) {
                        alert("No se encontró la tabla para descargar");
                        return;
                    }

                    var html = table.outerHTML;
                    var blob = new Blob(['\ufeff', html], {
                        type: "application/vnd.ms-excel"
                    });

                    var url = URL.createObjectURL(blob);
                    var link = document.createElement("a");
                    link.href = url;

                    var fecha = new Date().toISOString().slice(0, 10);
                    var random = Math.floor(Math.random() * 1000);
                    link.download = "Reporte_Facturacion_" + id + "_" +fecha + "_" +random +".xls";

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                } catch (e) {
                    alert("Error al descargar: " + e.message);
                }
            };

            currentRecord.setValue({
                fieldId: 'custpage_report',
                value: html
            });

            let btn_descargar = document.querySelector("#custpage_btn_descargar");
            let uir_table = document.querySelector(".uir-tab-fields");
            let uir_table_grapper = document.querySelector(".uir-table-fields-wrapper");

            if (uir_table && uir_table_grapper) {
                uir_table.style.padding = "0px";
                uir_table_grapper.style.padding = "0px";
            }

            if (btn_descargar) {
                btn_descargar.disabled = false;
                btn_descargar.addEventListener('click', window.descargarExcel);
            }

        } catch (error) {
            console.error("Error in pageInit:", error.message);
            alert('Error loading report: ' + error.message);
        }
    }

    return { pageInit };

});