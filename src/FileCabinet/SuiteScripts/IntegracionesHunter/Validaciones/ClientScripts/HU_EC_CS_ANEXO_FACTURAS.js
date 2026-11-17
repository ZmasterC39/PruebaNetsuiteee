/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
*/

define(['N/url', 'N/query', 'N/log', 'N/search', 'N/runtime', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], (url, query, log, search, runtime, _toolkit) => {


    // function pageInit(context) {
    //     try {
    //         const currentRecord = context.currentRecord;
    //         let { id, subsidiary, role } = runtime.getCurrentUser();

    //         let idUser = runtime.getCurrentUser().id
    //         log.debug("idUser", idUser)

    //         if (idUser = 27736) {

    //             const currentUrl = new URL(window.location.href);
    //             const currentParams = Object.fromEntries(currentUrl.searchParams.entries());
    //             console.log(currentParams)

    //             if (
    //                 (currentParams.factura_venta && currentParams.factura_venta.trim() !== '') ||
    //                 (currentParams.cliente && currentParams.cliente.trim() !== '')
    //             ) {

    //                 // Construir la query dinámicamente
    //                 let whereConditions = [];

    //                 // Si tiene factura_venta, agregar esa condición
    //                 if (currentParams.factura_venta && currentParams.factura_venta.trim() !== '') {
    //                     whereConditions.push(`fv.id = ${currentParams.factura_venta}`);
    //                 }

    //                 // Si tiene cliente, agregar esa condición
    //                 if (currentParams.cliente && currentParams.cliente.trim() !== '') {
    //                     whereConditions.push(`fv.entity = ${currentParams.cliente}`);
    //                 }

    //                 // Unir las condiciones con AND
    //                 let whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    //                 // Query con WHERE dinámico
    //                 let query = `SELECT 
    //                     -- r.created, 
    //                     -- r.custrecord_nro_factura_interna AS factura_interna_id, 
    //                     -- fi.tranid AS num_factura_interna, 
    //                     -- fv.tranid AS num_factura_venta, 
    //                     -- b.altname , 
    //                     -- tb.name AS tipo_bien, 
    //                     -- sb.name AS subtipo_bien, 
    //                     -- bm.name AS marca, 
    //                     -- bmo.name AS modelo, 
    //                     -- b.custrecord_ht_bien_chasis, 
    //                     -- b.custrecord_ht_bien_motor, 
    //                     -- b.custrecord_ht_bien_placa, 
    //                     -- fi.foreigntotal AS importe

    //                     r.created, 
    //                     r.custrecord_nro_factura_interna AS factura_interna_id, 
    //                     fi.tranid AS num_factura_interna, 
    //                     fv.tranid AS num_factura_venta, 
    //                     BUILTIN.DF(fv.entity) AS entity,
    //                     SUBSTR(BUILTIN.DF(fv.entity), 6, INSTR(BUILTIN.DF(fv.entity), ' ') - 6) AS codigo_ruc,
    //                     SUBSTR(BUILTIN.DF(fv.entity), INSTR(BUILTIN.DF(fv.entity), ' ') + 1) AS nombre_empresa,
    //                     b.altname, 
    //                     tb.name AS tipo_bien, 
    //                     sb.name AS subtipo_bien, 
    //                     bm.name AS marca, 
    //                     bmo.name AS modelo, 
    //                     b.custrecord_ht_bien_chasis, 
    //                     b.custrecord_ht_bien_motor, 
    //                     b.custrecord_ht_bien_placa, 
    //                     fi.foreigntotal AS importe 

    //                     FROM customrecord_ht_fact_internas_asociadas r
    //                     LEFT JOIN transaction fi ON fi.id = r.custrecord_nro_factura_interna
    //                     LEFT JOIN transaction fv ON fv.id = r.custrecord_nro_factura
    //                     LEFT JOIN transaction os ON os.id = r.custrecord_orden_servicio
    //                     LEFT JOIN customrecord_ht_record_bienes b ON b.id = os.custbody_ht_so_bien
    //                     LEFT JOIN customrecord_ht_bien_tipobien tb ON tb.id = b.custrecord_ht_bien_tipobien
    //                     LEFT JOIN customrecord_ht_bien_marca bm ON bm.id = b.custrecord_ht_bien_marca
    //                     LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
    //                     LEFT JOIN customrecord_ht_bien_tipoterrestre sb ON sb.id = b.custrecord_ht_bien_tipoterrestre
    //                     ${whereClause}`;

    //                 console.log('Query generada:', query);

    //                 //3551277
    //                 //2677182

    //                 let resultados = _toolkit.executeQuery(query, []);

    //                 if (!resultados) {
    //                     currentRecord.setValue({
    //                         fieldId: 'custpage_report',
    //                         value: 'Sin resultados'
    //                     });

    //                     return;
    //                 }

    //                 console.log("Resultados obtenidos:", resultados);

    //                 // ! ███████████████████ Generar HTML ███████████████████
    //                 let html = '<style>' +
    //                     ':root { --primary: #0070d2; --primary-dark: #005fb2; --success: #10b981; --gray-50: #fafafa; --gray-100: #f5f5f5; --gray-200: #e5e5e5; --gray-300: #d4d4d4; --gray-600: #525252; --gray-700: #404040; --gray-900: #171717; }' +
    //                     '.report-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 5px; }' +
    //                     'table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12px; margin-top: 10px; }' +
    //                     'thead { position: sticky; top: 0; z-index: 100; }' +
    //                     'th { background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%); color: var(--gray-900); padding: 12px 10px; text-align: left; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--gray-300); white-space: nowrap; border-right: 1px solid var(--gray-200); }' +
    //                     'th:last-child { border-right: none; }' +
    //                     '.row { padding: 10px; border-bottom: 1px solid var(--gray-200); vertical-align: middle; color: var(--gray-900); border-right: 1px solid var(--gray-100); }' +
    //                     'td:last-child { border-right: none; }' +
    //                     'tbody tr { transition: background-color 0.15s ease; }' +
    //                     'tbody tr:hover { background-color: var(--gray-50); }' +
    //                     'tbody tr:nth-child(even) { background-color: #fafafa; }' +
    //                     'tbody tr:last-child td { border-bottom: none; }' +
    //                     '.text-right { text-align: right; }' +
    //                     '.text-center { text-align: center; }' +
    //                     '.text-mono { font-family: "Courier New", Consolas, monospace; font-size: 13px; }' +
    //                     '.amount { font-weight: 600; color: var(--success); }' +
    //                     '.factura-id { font-weight: 600; color: var(--primary); }' +
    //                     '.placa-badge { font-weight: 700; color: var(--gray-900); background: var(--gray-100); padding: 4px 8px; border-radius: 4px; display: inline-block; }' +
    //                     '.fecha { color: var(--gray-600); font-size: 13px; }' +
    //                     '.vehiculo-desc { color: var(--gray-700); font-size: 13px; line-height: 1.4; }' +
    //                     '.total-row { background-color: var(--gray-100) !important; font-weight: 700; border-top: 2px solid var(--gray-300); }' +
    //                     '.total-row td { padding-top: 12px; font-size: 13px; }' +
    //                     '.summary-section { margin-top: 20px; padding: 15px; background-color: var(--gray-50); border-radius: 6px; font-size: 13px; }' +
    //                     '.summary-item { display: flex; justify-content: space-between; padding: 6px 0; color: var(--gray-700); }' +
    //                     '.summary-item.total { font-weight: 700; font-size: 13px; border-top: 2px solid var(--gray-300); padding-top: 10px; margin-top: 8px; color: var(--gray-900); }' +
    //                     '</style>';

    //                 html += '<div class="report-wrapper">';
    //                 html += '<table>';
    //                 html += '<thead><tr>' +
    //                     '<th>Fecha Creación</th>' +
    //                     '<th>Núm. Factura Venta</th>' +
    //                     '<th>Nombre</th>' +
    //                     '<th>Identificación</th>' +

    //                     '<th class="text-center">ID Factura Interna</th>' +
    //                     '<th>Núm. Factura Interna</th>' +
    //                     '<th>Descripción del Bien</th>' +
    //                     '<th>Tipo de bien</th>' +
    //                     '<th>Subtipo de bien</th>' +
    //                     '<th>Marca</th>' +
    //                     '<th>Modelo</th>' +
    //                     '<th>Chasis</th>' +
    //                     '<th>Motor</th>' +
    //                     '<th class="text-center">Placa</th>' +
    //                     '<th class="text-right">Importe</th>' +
    //                     '</tr></thead>';
    //                 html += '<tbody>';

    //                 let totalImporte = 0;
    //                 let totalRegistros = 0;
    //                 let facturaVenta = '';

    //                 // Procesar cada resultado
    //                 resultados.forEach(function (row) {
    //                     totalRegistros++;
    //                     let importe = parseFloat(row.importe) || 0;
    //                     totalImporte += importe;

    //                     if (!facturaVenta && row.num_factura_venta) {
    //                         facturaVenta = row.num_factura_venta;
    //                     }

    //                     // Parsear la descripción del vehículo del campo altname
    //                     let altname = row.altname || '';
    //                     let descripcionVehiculo = altname
    //                         .replace(/PLC\.:[^\s]+\s*/gi, '')
    //                         .replace(/MOT\.:[^\s]+\s*/gi, '')
    //                         .replace(/CHA\.:[^\s]+\s*/gi, '')
    //                         .replace(/MAR\.:/gi, '')
    //                         .replace(/TIP\.:/gi, '-')
    //                         .replace(/MOD\.:/gi, '')
    //                         .replace(/COL\.:/gi, '-')
    //                         .replace(/\s+/g, ' ')
    //                         .trim();

    //                     html += '<tr>';
    //                     html += '<td><span class="fecha">' + (row.created || '-') + '</span></td>';
    //                     html += '<td class="row">' + (row.num_factura_venta || '-') + '</td>';
    //                     html += '<td class="row">' + (row.nombre_empresa || '-') + '</td>';
    //                     html += '<td class="row">' + (row.codigo_ruc || '-') + '</td>';

    //                     html += '<td class="row text-center">' + (row.factura_interna_id || '-') + '</td>';
    //                     html += '<td class="row"><span class="factura-id">' + (row.num_factura_interna || '-') + '</span></td>';
    //                     html += '<td class="row"><span class="vehiculo-desc">' + (descripcionVehiculo || '-') + '</span></td>';
    //                     html += '<td class="row"><span class="vehiculo-desc">' + (row.tipo_bien || '-') + '</span></td>';
    //                     html += '<td class="row"><span class="vehiculo-desc">' + (row.subtipo_bien || '-') + '</span></td>';
    //                     html += '<td class="row"><span class="vehiculo-desc">' + (row.marca || '-') + '</span></td>';
    //                     html += '<td class="row"><span class="vehiculo-desc">' + (row.modelo || '-') + '</span></td>';
    //                     html += '<td class="row text-mono">' + (row.custrecord_ht_bien_chasis || '-') + '</td>';
    //                     html += '<td class="row text-mono">' + (row.custrecord_ht_bien_motor || '-') + '</td>';
    //                     html += '<td class="row text-center">' + (row.custrecord_ht_bien_placa || '-') + '</td>';
    //                     html += '<td class="row text-right"><span class="amount">$' + importe.toFixed(2) + '</span></td>';
    //                     html += '</tr>';
    //                 });
    //                 html += '</tbody></table>';
    //                 html += '</div>'; // Cierra report-wrapper

    //                 // Establecer el HTML en el campo
    //                 currentRecord.setValue({
    //                     fieldId: 'custpage_report',
    //                     value: html
    //                 });

    //                 console.log("Resultados cargados:", totalRegistros, "registros");

    //                 // Función para descargar Excel

    //                 window.descargarExcel = function () {
    //                     try {
    //                         var table = document.querySelector(".report-wrapper table") || document.querySelector("table");
    //                         if (!table) {
    //                             alert("No se encontró la tabla para descargar");
    //                             return;
    //                         }

    //                         var html = table.outerHTML;
    //                         var blob = new Blob(['\ufeff', html], {
    //                             type: "application/vnd.ms-excel"
    //                         });

    //                         var url = URL.createObjectURL(blob);
    //                         var link = document.createElement("a");
    //                         link.href = url;

    //                         var fecha = new Date().toISOString().slice(0, 10);
    //                         var random = Math.floor(Math.random() * 1000);
    //                         link.download = "RPT_ANEXO_FACTURAS_" + id + "_" + fecha + "_" + random + ".xls";

    //                         document.body.appendChild(link);
    //                         link.click();
    //                         document.body.removeChild(link);
    //                         URL.revokeObjectURL(url);

    //                     } catch (e) {
    //                         alert("Error al descargar: " + e.message);
    //                     }
    //                 };

    //                 // Configurar botón de descarga y estilos
    //                 currentRecord.getField({ fieldId: 'custpage_btn_descargar' }).isDisabled = false;
    //                 let btn_descargar = document.querySelector("#custpage_btn_descargar");
    //                 let uir_table = document.querySelector(".uir-tab-fields");
    //                 let uir_table_wrapper = document.querySelector(".uir-table-fields-wrapper");

    //                 if (uir_table && uir_table_wrapper) {
    //                     uir_table.style.padding = "0px";
    //                     uir_table_wrapper.style.padding = "0px";
    //                 }

    //                 if (btn_descargar) {
    //                     //btn_descargar.disabled = false;
    //                     btn_descargar.addEventListener('click', window.descargarExcel);
    //                 }


    //             }

    //         } else {

    //             const currentUrl = new URL(window.location.href);
    //             const currentParams = Object.fromEntries(currentUrl.searchParams.entries());
    //             console.log(currentParams)
    //             if (!currentParams.factura_venta) return;

    //             // Query para obtener las facturas internas asociadas
    //             let query = `SELECT r.created, r.custrecord_nro_factura_interna AS factura_interna_id, fi.tranid AS num_factura_interna, fv.tranid AS num_factura_venta, b.altname , tb.name AS tipo_bien, sb.name AS subtipo_bien, bm.name AS marca, bmo.name AS modelo, b.custrecord_ht_bien_chasis, b.custrecord_ht_bien_motor, b.custrecord_ht_bien_placa, fi.foreigntotal AS importe
    //             FROM customrecord_ht_fact_internas_asociadas r
    //             LEFT JOIN transaction fi ON fi.id = r.custrecord_nro_factura_interna
    //             LEFT JOIN transaction fv ON fv.id = r.custrecord_nro_factura
    //             LEFT JOIN transaction os ON os.id = r.custrecord_orden_servicio
    //             LEFT JOIN customrecord_ht_record_bienes b ON b.id = os.custbody_ht_so_bien
    //             LEFT JOIN customrecord_ht_bien_tipobien tb ON tb.id = b.custrecord_ht_bien_tipobien
    //             LEFT JOIN customrecord_ht_bien_marca bm ON bm.id = b.custrecord_ht_bien_marca
    //             LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
    //             LEFT JOIN customrecord_ht_bien_tipoterrestre sb ON sb.id = b.custrecord_ht_bien_tipoterrestre
    //             WHERE fv.id=  ${currentParams.factura_venta}`;

    //             //3551277
    //             //2677182

    //             let resultados = _toolkit.executeQuery(query, []);

    //             if (!resultados) {
    //                 currentRecord.setValue({
    //                     fieldId: 'custpage_report',
    //                     value: 'Sin resultados'
    //                 });

    //                 return;
    //             }

    //             console.log("Resultados obtenidos:", resultados);

    //             // ! ███████████████████ Generar HTML ███████████████████
    //             let html = '<style>' +
    //                 ':root { --primary: #0070d2; --primary-dark: #005fb2; --success: #10b981; --gray-50: #fafafa; --gray-100: #f5f5f5; --gray-200: #e5e5e5; --gray-300: #d4d4d4; --gray-600: #525252; --gray-700: #404040; --gray-900: #171717; }' +
    //                 '.report-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 5px; }' +
    //                 'table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12px; margin-top: 10px; }' +
    //                 'thead { position: sticky; top: 0; z-index: 100; }' +
    //                 'th { background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%); color: var(--gray-900); padding: 12px 10px; text-align: left; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--gray-300); white-space: nowrap; border-right: 1px solid var(--gray-200); }' +
    //                 'th:last-child { border-right: none; }' +
    //                 '.row { padding: 10px; border-bottom: 1px solid var(--gray-200); vertical-align: middle; color: var(--gray-900); border-right: 1px solid var(--gray-100); }' +
    //                 'td:last-child { border-right: none; }' +
    //                 'tbody tr { transition: background-color 0.15s ease; }' +
    //                 'tbody tr:hover { background-color: var(--gray-50); }' +
    //                 'tbody tr:nth-child(even) { background-color: #fafafa; }' +
    //                 'tbody tr:last-child td { border-bottom: none; }' +
    //                 '.text-right { text-align: right; }' +
    //                 '.text-center { text-align: center; }' +
    //                 '.text-mono { font-family: "Courier New", Consolas, monospace; font-size: 13px; }' +
    //                 '.amount { font-weight: 600; color: var(--success); }' +
    //                 '.factura-id { font-weight: 600; color: var(--primary); }' +
    //                 '.placa-badge { font-weight: 700; color: var(--gray-900); background: var(--gray-100); padding: 4px 8px; border-radius: 4px; display: inline-block; }' +
    //                 '.fecha { color: var(--gray-600); font-size: 13px; }' +
    //                 '.vehiculo-desc { color: var(--gray-700); font-size: 13px; line-height: 1.4; }' +
    //                 '.total-row { background-color: var(--gray-100) !important; font-weight: 700; border-top: 2px solid var(--gray-300); }' +
    //                 '.total-row td { padding-top: 12px; font-size: 13px; }' +
    //                 '.summary-section { margin-top: 20px; padding: 15px; background-color: var(--gray-50); border-radius: 6px; font-size: 13px; }' +
    //                 '.summary-item { display: flex; justify-content: space-between; padding: 6px 0; color: var(--gray-700); }' +
    //                 '.summary-item.total { font-weight: 700; font-size: 13px; border-top: 2px solid var(--gray-300); padding-top: 10px; margin-top: 8px; color: var(--gray-900); }' +
    //                 '</style>';

    //             html += '<div class="report-wrapper">';
    //             html += '<table>';
    //             html += '<thead><tr>' +
    //                 //'<th>Fecha Creación</th>' +
    //                 '<th class="text-center">ID Factura Interna</th>' +
    //                 '<th>Núm. Factura Interna</th>' +
    //                 '<th>Núm. Factura Venta</th>' +
    //                 '<th>Descripción del Bien</th>' +
    //                 '<th>Tipo de bien</th>' +
    //                 '<th>Subtipo de bien</th>' +
    //                 '<th>Marca</th>' +
    //                 '<th>Modelo</th>' +
    //                 '<th>Chasis</th>' +
    //                 '<th>Motor</th>' +
    //                 '<th class="text-center">Placa</th>' +
    //                 '<th class="text-right">Importe</th>' +
    //                 '</tr></thead>';
    //             html += '<tbody>';

    //             let totalImporte = 0;
    //             let totalRegistros = 0;
    //             let facturaVenta = '';

    //             // Procesar cada resultado
    //             resultados.forEach(function (row) {
    //                 totalRegistros++;
    //                 let importe = parseFloat(row.importe) || 0;
    //                 totalImporte += importe;

    //                 if (!facturaVenta && row.num_factura_venta) {
    //                     facturaVenta = row.num_factura_venta;
    //                 }

    //                 // Parsear la descripción del vehículo del campo altname
    //                 let altname = row.altname || '';
    //                 let descripcionVehiculo = altname
    //                     .replace(/PLC\.:[^\s]+\s*/gi, '')
    //                     .replace(/MOT\.:[^\s]+\s*/gi, '')
    //                     .replace(/CHA\.:[^\s]+\s*/gi, '')
    //                     .replace(/MAR\.:/gi, '')
    //                     .replace(/TIP\.:/gi, '-')
    //                     .replace(/MOD\.:/gi, '')
    //                     .replace(/COL\.:/gi, '-')
    //                     .replace(/\s+/g, ' ')
    //                     .trim();

    //                 html += '<tr>';
    //                 //html += '<td><span class="fecha">' + (row.created || '-') + '</span></td>';
    //                 html += '<td class="row text-center">' + (row.factura_interna_id || '-') + '</td>';
    //                 html += '<td class="row"><span class="factura-id">' + (row.num_factura_interna || '-') + '</span></td>';
    //                 html += '<td class="row">' + (row.num_factura_venta || '-') + '</td>';
    //                 html += '<td class="row"><span class="vehiculo-desc">' + (descripcionVehiculo || '-') + '</span></td>';
    //                 html += '<td class="row"><span class="vehiculo-desc">' + (row.tipo_bien || '-') + '</span></td>';
    //                 html += '<td class="row"><span class="vehiculo-desc">' + (row.subtipo_bien || '-') + '</span></td>';
    //                 html += '<td class="row"><span class="vehiculo-desc">' + (row.marca || '-') + '</span></td>';
    //                 html += '<td class="row"><span class="vehiculo-desc">' + (row.modelo || '-') + '</span></td>';
    //                 html += '<td class="row text-mono">' + (row.custrecord_ht_bien_chasis || '-') + '</td>';
    //                 html += '<td class="row text-mono">' + (row.custrecord_ht_bien_motor || '-') + '</td>';
    //                 html += '<td class="row text-center">' + (row.custrecord_ht_bien_placa || '-') + '</td>';
    //                 html += '<td class="row text-right"><span class="amount">$' + importe.toFixed(2) + '</span></td>';
    //                 html += '</tr>';
    //             });
    //             html += '</tbody></table>';
    //             html += '</div>'; // Cierra report-wrapper

    //             // Establecer el HTML en el campo
    //             currentRecord.setValue({
    //                 fieldId: 'custpage_report',
    //                 value: html
    //             });

    //             console.log("Resultados cargados:", totalRegistros, "registros");

    //             // Función para descargar Excel

    //             window.descargarExcel = function () {
    //                 try {
    //                     var table = document.querySelector(".report-wrapper table") || document.querySelector("table");
    //                     if (!table) {
    //                         alert("No se encontró la tabla para descargar");
    //                         return;
    //                     }

    //                     var html = table.outerHTML;
    //                     var blob = new Blob(['\ufeff', html], {
    //                         type: "application/vnd.ms-excel"
    //                     });

    //                     var url = URL.createObjectURL(blob);
    //                     var link = document.createElement("a");
    //                     link.href = url;

    //                     var fecha = new Date().toISOString().slice(0, 10);
    //                     var random = Math.floor(Math.random() * 1000);
    //                     link.download = "RPT_ANEXO_FACTURAS_" + id + "_" + fecha + "_" + random + ".xls";

    //                     document.body.appendChild(link);
    //                     link.click();
    //                     document.body.removeChild(link);
    //                     URL.revokeObjectURL(url);

    //                 } catch (e) {
    //                     alert("Error al descargar: " + e.message);
    //                 }
    //             };

    //             // Configurar botón de descarga y estilos
    //             currentRecord.getField({ fieldId: 'custpage_btn_descargar' }).isDisabled = false;
    //             let btn_descargar = document.querySelector("#custpage_btn_descargar");
    //             let uir_table = document.querySelector(".uir-tab-fields");
    //             let uir_table_wrapper = document.querySelector(".uir-table-fields-wrapper");

    //             if (uir_table && uir_table_wrapper) {
    //                 uir_table.style.padding = "0px";
    //                 uir_table_wrapper.style.padding = "0px";
    //             }

    //             if (btn_descargar) {
    //                 //btn_descargar.disabled = false;
    //                 btn_descargar.addEventListener('click', window.descargarExcel);
    //             }
    //         }

    //     } catch (error) {
    //         log.error("ERROR pageInit", error.stack);
    //         console.error("Error en pageInit:", error.stack);
    //         alert('Error al cargar el reporte: ' + error.stack);
    //     }
    // }

    function pageInit(context) {
        try {
            const currentRecord = context.currentRecord;
            let { id, subsidiary, role } = runtime.getCurrentUser();

            let idUser = runtime.getCurrentUser().id
            log.debug("idUser", idUser)

            // if ((idUser == 20) || (idUser == 27736)) {
            if (true) {
                const currentUrl = new URL(window.location.href);
                const currentParams = Object.fromEntries(currentUrl.searchParams.entries());
                console.log(currentParams)

                if (
                    (currentParams.factura_venta && currentParams.factura_venta.trim() !== '') ||
                    (currentParams.cliente && currentParams.cliente.trim() !== '') ||
                    (currentParams.fecha_desde && currentParams.fecha_hasta)
                ) {

                    // Construir la query dinámicamente
                    let whereConditions = [];

                    // Si tiene factura_venta, agregar esa condición
                    if (currentParams.factura_venta && currentParams.factura_venta.trim() !== '') {
                        whereConditions.push(`fv.id = ${currentParams.factura_venta}`);
                    }

                    // Si tiene cliente, agregar esa condición
                    if (currentParams.cliente && currentParams.cliente.trim() !== '') {
                        whereConditions.push(`fv.entity = ${currentParams.cliente}`);
                    }

                    // NUEVO: filtro por fechas (solo si ambas existen)
                    if (
                        currentParams.fecha_desde &&
                        currentParams.fecha_hasta &&
                        currentParams.fecha_desde.trim() !== '' &&
                        currentParams.fecha_hasta.trim() !== ''
                    ) {

                        // función para convertir dd/MM/yyyy -> yyyy-MM-dd
                        const formatDate = (fecha) => {
                            const [day, month, year] = fecha.split('/');
                            return `${year}-${month}-${day}`;
                        };

                        const fechaDesde = formatDate(currentParams.fecha_desde);
                        const fechaHasta = formatDate(currentParams.fecha_hasta);

                        whereConditions.push(`
                                                r.created BETWEEN DATE '${fechaDesde}' AND DATE '${fechaHasta}'
                                            `);
                    }

                    // Unir las condiciones con AND
                    let whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

                    // Query con WHERE dinámico
                    let query = `SELECT 
                        -- r.created, 
                        -- r.custrecord_nro_factura_interna AS factura_interna_id, 
                        -- fi.tranid AS num_factura_interna, 
                        -- fv.tranid AS num_factura_venta, 
                        -- b.altname , 
                        -- tb.name AS tipo_bien, 
                        -- sb.name AS subtipo_bien, 
                        -- bm.name AS marca, 
                        -- bmo.name AS modelo, 
                        -- b.custrecord_ht_bien_chasis, 
                        -- b.custrecord_ht_bien_motor, 
                        -- b.custrecord_ht_bien_placa, 
                        -- fi.foreigntotal AS importe

                        r.created, 
                        r.custrecord_nro_factura_interna AS factura_interna_id, 
                        fi.tranid AS num_factura_interna, 
                        fv.tranid AS num_factura_venta, 
                        BUILTIN.DF(fv.entity) AS entity,
                        SUBSTR(BUILTIN.DF(fv.entity), 6, INSTR(BUILTIN.DF(fv.entity), ' ') - 6) AS codigo_ruc,
                        SUBSTR(BUILTIN.DF(fv.entity), INSTR(BUILTIN.DF(fv.entity), ' ') + 1) AS nombre_empresa,
                        b.altname, 
                        tb.name AS tipo_bien, 
                        sb.name AS subtipo_bien, 
                        bm.name AS marca, 
                        bmo.name AS modelo, 
                        b.custrecord_ht_bien_chasis, 
                        b.custrecord_ht_bien_motor, 
                        b.custrecord_ht_bien_placa, 
                        fi.foreigntotal AS importe 

                        FROM customrecord_ht_fact_internas_asociadas r
                        LEFT JOIN transaction fi ON fi.id = r.custrecord_nro_factura_interna
                        LEFT JOIN transaction fv ON fv.id = r.custrecord_nro_factura
                        LEFT JOIN transaction os ON os.id = r.custrecord_orden_servicio
                        LEFT JOIN customrecord_ht_record_bienes b ON b.id = os.custbody_ht_so_bien
                        LEFT JOIN customrecord_ht_bien_tipobien tb ON tb.id = b.custrecord_ht_bien_tipobien
                        LEFT JOIN customrecord_ht_bien_marca bm ON bm.id = b.custrecord_ht_bien_marca
                        LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
                        LEFT JOIN customrecord_ht_bien_tipoterrestre sb ON sb.id = b.custrecord_ht_bien_tipoterrestre
                        ${whereClause}`;

                    console.log('Query generada:', query);

                    //3551277
                    //2677182

                    let resultados = _toolkit.executeQuery(query, []);

                    if (!resultados) {
                        currentRecord.setValue({
                            fieldId: 'custpage_report',
                            value: 'Sin resultados'
                        });

                        return;
                    }

                    console.log("Resultados obtenidos:", resultados);

                    // ! ███████████████████ Generar HTML ███████████████████
                    let html = '<style>' +
                        ':root { --primary: #0070d2; --primary-dark: #005fb2; --success: #10b981; --gray-50: #fafafa; --gray-100: #f5f5f5; --gray-200: #e5e5e5; --gray-300: #d4d4d4; --gray-600: #525252; --gray-700: #404040; --gray-900: #171717; }' +
                        '.report-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 5px; }' +
                        'table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12px; margin-top: 10px; }' +
                        'thead { position: sticky; top: 0; z-index: 100; }' +
                        'th { background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%); color: var(--gray-900); padding: 12px 10px; text-align: left; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--gray-300); white-space: nowrap; border-right: 1px solid var(--gray-200); }' +
                        'th:last-child { border-right: none; }' +
                        '.row { padding: 10px; border-bottom: 1px solid var(--gray-200); vertical-align: middle; color: var(--gray-900); border-right: 1px solid var(--gray-100); }' +
                        'td:last-child { border-right: none; }' +
                        'tbody tr { transition: background-color 0.15s ease; }' +
                        'tbody tr:hover { background-color: var(--gray-50); }' +
                        'tbody tr:nth-child(even) { background-color: #fafafa; }' +
                        'tbody tr:last-child td { border-bottom: none; }' +
                        '.text-right { text-align: right; }' +
                        '.text-center { text-align: center; }' +
                        '.text-mono { font-family: "Courier New", Consolas, monospace; font-size: 13px; }' +
                        '.amount { font-weight: 600; color: var(--success); }' +
                        '.factura-id { font-weight: 600; color: var(--primary); }' +
                        '.placa-badge { font-weight: 700; color: var(--gray-900); background: var(--gray-100); padding: 4px 8px; border-radius: 4px; display: inline-block; }' +
                        '.fecha { color: var(--gray-600); font-size: 13px; }' +
                        '.vehiculo-desc { color: var(--gray-700); font-size: 13px; line-height: 1.4; }' +
                        '.total-row { background-color: var(--gray-100) !important; font-weight: 700; border-top: 2px solid var(--gray-300); }' +
                        '.total-row td { padding-top: 12px; font-size: 13px; }' +
                        '.summary-section { margin-top: 20px; padding: 15px; background-color: var(--gray-50); border-radius: 6px; font-size: 13px; }' +
                        '.summary-item { display: flex; justify-content: space-between; padding: 6px 0; color: var(--gray-700); }' +
                        '.summary-item.total { font-weight: 700; font-size: 13px; border-top: 2px solid var(--gray-300); padding-top: 10px; margin-top: 8px; color: var(--gray-900); }' +
                        '</style>';

                    html += '<div class="report-wrapper">';
                    html += '<table>';
                    html += '<thead><tr>' +
                        '<th>Fecha Creación</th>' +
                        '<th>Núm. Factura Venta</th>' +
                        '<th>Nombre</th>' +
                        '<th>Identificación</th>' +

                        '<th class="text-center">ID Factura Interna</th>' +
                        '<th>Núm. Factura Interna</th>' +
                        '<th>Descripción del Bien</th>' +
                        '<th>Tipo de bien</th>' +
                        '<th>Subtipo de bien</th>' +
                        '<th>Marca</th>' +
                        '<th>Modelo</th>' +
                        '<th>Chasis</th>' +
                        '<th>Motor</th>' +
                        '<th class="text-center">Placa</th>' +
                        '<th class="text-right">Importe</th>' +
                        '</tr></thead>';
                    html += '<tbody>';

                    let totalImporte = 0;
                    let totalRegistros = 0;
                    let facturaVenta = '';

                    // Procesar cada resultado
                    resultados.forEach(function (row) {
                        totalRegistros++;
                        let importe = parseFloat(row.importe) || 0;
                        totalImporte += importe;

                        if (!facturaVenta && row.num_factura_venta) {
                            facturaVenta = row.num_factura_venta;
                        }

                        // Parsear la descripción del vehículo del campo altname
                        let altname = row.altname || '';
                        let descripcionVehiculo = altname
                            .replace(/PLC\.:[^\s]+\s*/gi, '')
                            .replace(/MOT\.:[^\s]+\s*/gi, '')
                            .replace(/CHA\.:[^\s]+\s*/gi, '')
                            .replace(/MAR\.:/gi, '')
                            .replace(/TIP\.:/gi, '-')
                            .replace(/MOD\.:/gi, '')
                            .replace(/COL\.:/gi, '-')
                            .replace(/\s+/g, ' ')
                            .trim();

                        html += '<tr>';
                        html += '<td><span class="fecha">' + (row.created || '-') + '</span></td>';
                        html += '<td class="row">' + (row.num_factura_venta || '-') + '</td>';
                        html += '<td class="row">' + (row.nombre_empresa || '-') + '</td>';
                        html += '<td class="row">' + (row.codigo_ruc || '-') + '</td>';

                        html += '<td class="row text-center">' + (row.factura_interna_id || '-') + '</td>';
                        html += '<td class="row"><span class="factura-id">' + (row.num_factura_interna || '-') + '</span></td>';
                        html += '<td class="row"><span class="vehiculo-desc">' + (descripcionVehiculo || '-') + '</span></td>';
                        html += '<td class="row"><span class="vehiculo-desc">' + (row.tipo_bien || '-') + '</span></td>';
                        html += '<td class="row"><span class="vehiculo-desc">' + (row.subtipo_bien || '-') + '</span></td>';
                        html += '<td class="row"><span class="vehiculo-desc">' + (row.marca || '-') + '</span></td>';
                        html += '<td class="row"><span class="vehiculo-desc">' + (row.modelo || '-') + '</span></td>';
                        html += '<td class="row text-mono">' + (row.custrecord_ht_bien_chasis || '-') + '</td>';
                        html += '<td class="row text-mono">' + (row.custrecord_ht_bien_motor || '-') + '</td>';
                        html += '<td class="row text-center">' + (row.custrecord_ht_bien_placa || '-') + '</td>';
                        html += '<td class="row text-right"><span class="amount">$' + importe.toFixed(2) + '</span></td>';
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                    html += '</div>'; // Cierra report-wrapper

                    // Establecer el HTML en el campo
                    currentRecord.setValue({
                        fieldId: 'custpage_report',
                        value: html
                    });

                    console.log("Resultados cargados:", totalRegistros, "registros");

                    // Función para descargar Excel

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
                            link.download = "RPT_ANEXO_FACTURAS_" + id + "_" + fecha + "_" + random + ".xls";

                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                        } catch (e) {
                            alert("Error al descargar: " + e.message);
                        }
                    };

                    // Configurar botón de descarga y estilos
                    currentRecord.getField({ fieldId: 'custpage_btn_descargar' }).isDisabled = false;
                    let btn_descargar = document.querySelector("#custpage_btn_descargar");
                    let uir_table = document.querySelector(".uir-tab-fields");
                    let uir_table_wrapper = document.querySelector(".uir-table-fields-wrapper");

                    if (uir_table && uir_table_wrapper) {
                        uir_table.style.padding = "0px";
                        uir_table_wrapper.style.padding = "0px";
                    }

                    if (btn_descargar) {
                        //btn_descargar.disabled = false;
                        btn_descargar.addEventListener('click', window.descargarExcel);
                    }


                }

            } else {

                const currentUrl = new URL(window.location.href);
                const currentParams = Object.fromEntries(currentUrl.searchParams.entries());
                console.log(currentParams)
                if (!currentParams.factura_venta) return;

                // Query para obtener las facturas internas asociadas
                let query = `SELECT r.created, r.custrecord_nro_factura_interna AS factura_interna_id, fi.tranid AS num_factura_interna, fv.tranid AS num_factura_venta, b.altname , tb.name AS tipo_bien, sb.name AS subtipo_bien, bm.name AS marca, bmo.name AS modelo, b.custrecord_ht_bien_chasis, b.custrecord_ht_bien_motor, b.custrecord_ht_bien_placa, fi.foreigntotal AS importe
                FROM customrecord_ht_fact_internas_asociadas r
                LEFT JOIN transaction fi ON fi.id = r.custrecord_nro_factura_interna
                LEFT JOIN transaction fv ON fv.id = r.custrecord_nro_factura
                LEFT JOIN transaction os ON os.id = r.custrecord_orden_servicio
                LEFT JOIN customrecord_ht_record_bienes b ON b.id = os.custbody_ht_so_bien
                LEFT JOIN customrecord_ht_bien_tipobien tb ON tb.id = b.custrecord_ht_bien_tipobien
                LEFT JOIN customrecord_ht_bien_marca bm ON bm.id = b.custrecord_ht_bien_marca
                LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
                LEFT JOIN customrecord_ht_bien_tipoterrestre sb ON sb.id = b.custrecord_ht_bien_tipoterrestre
                WHERE fv.id=  ${currentParams.factura_venta}`;

                //3551277
                //2677182

                let resultados = _toolkit.executeQuery(query, []);

                if (!resultados) {
                    currentRecord.setValue({
                        fieldId: 'custpage_report',
                        value: 'Sin resultados'
                    });

                    return;
                }

                console.log("Resultados obtenidos:", resultados);

                // ! ███████████████████ Generar HTML ███████████████████
                let html = '<style>' +
                    ':root { --primary: #0070d2; --primary-dark: #005fb2; --success: #10b981; --gray-50: #fafafa; --gray-100: #f5f5f5; --gray-200: #e5e5e5; --gray-300: #d4d4d4; --gray-600: #525252; --gray-700: #404040; --gray-900: #171717; }' +
                    '.report-wrapper { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 5px; }' +
                    'table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 12px; margin-top: 10px; }' +
                    'thead { position: sticky; top: 0; z-index: 100; }' +
                    'th { background: linear-gradient(180deg, #ffffff 0%, var(--gray-50) 100%); color: var(--gray-900); padding: 12px 10px; text-align: left; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--gray-300); white-space: nowrap; border-right: 1px solid var(--gray-200); }' +
                    'th:last-child { border-right: none; }' +
                    '.row { padding: 10px; border-bottom: 1px solid var(--gray-200); vertical-align: middle; color: var(--gray-900); border-right: 1px solid var(--gray-100); }' +
                    'td:last-child { border-right: none; }' +
                    'tbody tr { transition: background-color 0.15s ease; }' +
                    'tbody tr:hover { background-color: var(--gray-50); }' +
                    'tbody tr:nth-child(even) { background-color: #fafafa; }' +
                    'tbody tr:last-child td { border-bottom: none; }' +
                    '.text-right { text-align: right; }' +
                    '.text-center { text-align: center; }' +
                    '.text-mono { font-family: "Courier New", Consolas, monospace; font-size: 13px; }' +
                    '.amount { font-weight: 600; color: var(--success); }' +
                    '.factura-id { font-weight: 600; color: var(--primary); }' +
                    '.placa-badge { font-weight: 700; color: var(--gray-900); background: var(--gray-100); padding: 4px 8px; border-radius: 4px; display: inline-block; }' +
                    '.fecha { color: var(--gray-600); font-size: 13px; }' +
                    '.vehiculo-desc { color: var(--gray-700); font-size: 13px; line-height: 1.4; }' +
                    '.total-row { background-color: var(--gray-100) !important; font-weight: 700; border-top: 2px solid var(--gray-300); }' +
                    '.total-row td { padding-top: 12px; font-size: 13px; }' +
                    '.summary-section { margin-top: 20px; padding: 15px; background-color: var(--gray-50); border-radius: 6px; font-size: 13px; }' +
                    '.summary-item { display: flex; justify-content: space-between; padding: 6px 0; color: var(--gray-700); }' +
                    '.summary-item.total { font-weight: 700; font-size: 13px; border-top: 2px solid var(--gray-300); padding-top: 10px; margin-top: 8px; color: var(--gray-900); }' +
                    '</style>';

                html += '<div class="report-wrapper">';
                html += '<table>';
                html += '<thead><tr>' +
                    //'<th>Fecha Creación</th>' +
                    '<th class="text-center">ID Factura Interna</th>' +
                    '<th>Núm. Factura Interna</th>' +
                    '<th>Núm. Factura Venta</th>' +
                    '<th>Descripción del Bien</th>' +
                    '<th>Tipo de bien</th>' +
                    '<th>Subtipo de bien</th>' +
                    '<th>Marca</th>' +
                    '<th>Modelo</th>' +
                    '<th>Chasis</th>' +
                    '<th>Motor</th>' +
                    '<th class="text-center">Placa</th>' +
                    '<th class="text-right">Importe</th>' +
                    '</tr></thead>';
                html += '<tbody>';

                let totalImporte = 0;
                let totalRegistros = 0;
                let facturaVenta = '';

                // Procesar cada resultado
                resultados.forEach(function (row) {
                    totalRegistros++;
                    let importe = parseFloat(row.importe) || 0;
                    totalImporte += importe;

                    if (!facturaVenta && row.num_factura_venta) {
                        facturaVenta = row.num_factura_venta;
                    }

                    // Parsear la descripción del vehículo del campo altname
                    let altname = row.altname || '';
                    let descripcionVehiculo = altname
                        .replace(/PLC\.:[^\s]+\s*/gi, '')
                        .replace(/MOT\.:[^\s]+\s*/gi, '')
                        .replace(/CHA\.:[^\s]+\s*/gi, '')
                        .replace(/MAR\.:/gi, '')
                        .replace(/TIP\.:/gi, '-')
                        .replace(/MOD\.:/gi, '')
                        .replace(/COL\.:/gi, '-')
                        .replace(/\s+/g, ' ')
                        .trim();

                    html += '<tr>';
                    //html += '<td><span class="fecha">' + (row.created || '-') + '</span></td>';
                    html += '<td class="row text-center">' + (row.factura_interna_id || '-') + '</td>';
                    html += '<td class="row"><span class="factura-id">' + (row.num_factura_interna || '-') + '</span></td>';
                    html += '<td class="row">' + (row.num_factura_venta || '-') + '</td>';
                    html += '<td class="row"><span class="vehiculo-desc">' + (descripcionVehiculo || '-') + '</span></td>';
                    html += '<td class="row"><span class="vehiculo-desc">' + (row.tipo_bien || '-') + '</span></td>';
                    html += '<td class="row"><span class="vehiculo-desc">' + (row.subtipo_bien || '-') + '</span></td>';
                    html += '<td class="row"><span class="vehiculo-desc">' + (row.marca || '-') + '</span></td>';
                    html += '<td class="row"><span class="vehiculo-desc">' + (row.modelo || '-') + '</span></td>';
                    html += '<td class="row text-mono">' + (row.custrecord_ht_bien_chasis || '-') + '</td>';
                    html += '<td class="row text-mono">' + (row.custrecord_ht_bien_motor || '-') + '</td>';
                    html += '<td class="row text-center">' + (row.custrecord_ht_bien_placa || '-') + '</td>';
                    html += '<td class="row text-right"><span class="amount">$' + importe.toFixed(2) + '</span></td>';
                    html += '</tr>';
                });
                html += '</tbody></table>';
                html += '</div>'; // Cierra report-wrapper

                // Establecer el HTML en el campo
                currentRecord.setValue({
                    fieldId: 'custpage_report',
                    value: html
                });

                console.log("Resultados cargados:", totalRegistros, "registros");

                // Función para descargar Excel

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
                        link.download = "RPT_ANEXO_FACTURAS_" + id + "_" + fecha + "_" + random + ".xls";

                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                    } catch (e) {
                        alert("Error al descargar: " + e.message);
                    }
                };

                // Configurar botón de descarga y estilos
                currentRecord.getField({ fieldId: 'custpage_btn_descargar' }).isDisabled = false;
                let btn_descargar = document.querySelector("#custpage_btn_descargar");
                let uir_table = document.querySelector(".uir-tab-fields");
                let uir_table_wrapper = document.querySelector(".uir-table-fields-wrapper");

                if (uir_table && uir_table_wrapper) {
                    uir_table.style.padding = "0px";
                    uir_table_wrapper.style.padding = "0px";
                }

                if (btn_descargar) {
                    //btn_descargar.disabled = false;
                    btn_descargar.addEventListener('click', window.descargarExcel);
                }
            }

        } catch (error) {
            log.error("ERROR pageInit", error.stack);
            console.error("Error en pageInit:", error.stack);
            alert('Error al cargar el reporte: ' + error.stack);
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;
            let currentRecord = context.currentRecord;

            let factura_venta = currentRecord.getValue({ fieldId: "custpage_factura_venta" });
            let cliente = currentRecord.getValue({ fieldId: "custpage_cliente" });
            let fecha_desde = currentRecord.getText({ fieldId: "custpage_fecha_desde" });
            let fecha_hasta = currentRecord.getText({ fieldId: "custpage_fecha_hasta" });

            const newParams = {}

            if (factura_venta) newParams.factura_venta = factura_venta;
            if (cliente) newParams.cliente = cliente;
            if (fecha_desde && fecha_hasta) {
                newParams.fecha_desde = fecha_desde;
                newParams.fecha_hasta = fecha_hasta;
            }

            if ((fecha_desde && !fecha_hasta) || (!fecha_desde && fecha_hasta)) {
                return;
            }

            window.onbeforeunload = null;
            const ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_sl_anexo_facturas",
                deploymentId: "customdeploy_hu_ec_sl_anexo_facturas",
                params: newParams,
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;

        } catch (error) {
            log.error("ERROR fieldChanged", error);
            console.error(error);
        }
    }


    return { pageInit, fieldChanged };

});