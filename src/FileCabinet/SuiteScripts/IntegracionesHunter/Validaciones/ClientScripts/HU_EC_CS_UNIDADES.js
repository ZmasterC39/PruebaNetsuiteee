/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
*/

define(['N/url', 'N/query', 'N/log', 'N/search', 'N/runtime', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], (url, query, log, search, runtime, _toolkit) => {

    function pageInit(context) {
        try {
            const currentRecord = context.currentRecord;
            let {id, subsidiary, role} = runtime.getCurrentUser();
            const currentUrl = new URL(window.location.href);
            const currentParams = Object.fromEntries(currentUrl.searchParams.entries());
            console.log(currentParams)
            if ( !currentParams.cliente ) return;

            let filtros = []

            let query = `SELECT c.vatregnumber AS cliente, c.altname AS nombre_propietario, ot.name AS orden_de_trabajo, ote.name AS estado_trabajo, b.custrecord_ht_bien_codsysh AS cod_bien_syshunter, b.name AS bien_id, val.name AS familia_producto, ot.custrecord_ht_ot_fechatrabajoasignacion AS fecha_trabajo, cc.name AS concesionario, er.firstname as ejecutiva_referencia, eg.firstname AS ejecutiva_gestion, i.displayname AS nombre_producto, cs.name AS seguro, cf.name AS financiera, b.custrecord_ht_bien_placa AS placa, b.custrecord_ht_bien_chasis AS chasis, b.custrecord_ht_bien_motor AS motor, tb.name AS tipo_bien, bm.name AS marcar, b.custrecord_ht_bien_ano AS anio_bien, bc.name AS color, mad.name AS marca_dispositivo, md.name as modelo_dispositivo, op.name AS operadora_sim_card FROM customrecord_ht_record_ordentrabajo ot
            LEFT JOIN customer c ON c.id = ot.custrecord_ht_ot_cliente_id
            LEFT JOIN customlist_ht_ot_estadoordentrabajo ote ON ote.id = ot.custrecord_ht_ot_estado
            LEFT JOIN item i ON i.id = ot.custrecord_ht_ot_item
            LEFT JOIN customrecord_ht_pp_main_param_prod param ON param.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item AND param.custrecord_ht_pp_parametrizacion_rela = 130
            LEFT JOIN customrecord_ht_cr_pp_valores val ON val.id = param.custrecord_ht_pp_parametrizacion_valor
            LEFT JOIN customrecord_ht_record_bienes b ON b.id = ot.custrecord_ht_ot_vehiculo
            LEFT JOIN  transaction os ON os.id = ot.custrecord_ht_ot_orden_servicio
            LEFT JOIN employee er ON er.id = os.custbody_ht_os_ejecutivareferencia
            LEFT JOIN employee eg ON eg.id = os.custbody_ht_os_ejecutiva_backoffice
            LEFT JOIN customrecord_ht_record_canaldistribucion cc ON cc.id = b.custrecord_ht_bien_consesionarios
            LEFT JOIN customrecord_ht_record_canaldistribucion cs ON cs.id = b.custrecord_ht_bien_companiaseguros
            LEFT JOIN customrecord_ht_record_canaldistribucion cf ON cf.id = b.custrecord_ht_bien_financiadovehiculo
            LEFT JOIN customrecord_ht_bien_tipobien tb ON tb.id = b.custrecord_ht_bien_tipobien
            LEFT JOIN customrecord_ht_bien_marca bm ON bm.id = b.custrecord_ht_bien_marca
            LEFT JOIN customrecord_ht_bn_colorcarseg bc ON bc.id = b.custrecord_ht_bien_colorcarseg
            LEFT JOIN customrecord_ht_co_cobertura co ON co.custrecord_ht_co_bien = b.id
            LEFT JOIN customrecord_ht_record_mantchaser dt ON dt.id = co.custrecord_ht_co_numeroserieproducto
            LEFT JOIN customrecord_ht_dd_modelodispositivo md ON md.id = dt.custrecord_ht_mc_modelo
            LEFT JOIN customrecord_ht_dd_tipodispositivo mad ON mad.id = dt.custrecord_ht_mc_unidad
            LEFT JOIN customrecord_ht_cs_operadora op ON op.id = dt.custrecord_ht_mc_operadora
            WHERE ot.custrecord_ht_ot_cliente_id = ?`;

            filtros.push(currentParams.cliente)

            if ( currentParams.estado_trabajo) {
                query = query + " AND ote.id = ?"
                filtros.push(currentParams.estado_trabajo)
            }

            if (currentParams.fecha_desde && currentParams.fecha_hasta) {
                query = query + ` AND ot.custrecord_ht_ot_fechatrabajoasignacion BETWEEN TO_DATE('${currentParams.fecha_desde}', 'DD/MM/YYYY') AND TO_DATE('${currentParams.fecha_hasta}', 'DD/MM/YYYY')`;
            }

            let resultados = _toolkit.executeQuery(query, filtros);

            if ( !resultados ) {
                currentRecord.setValue({
                    fieldId: 'custpage_report',
                    value: 'Sin resultados'
                });

                return;
            }

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
            '.informacion tr { transition: background-color 0.15s ease; }' +
            '.informacion tr:hover { background-color: var(--gray-50); }' +
            '.informacion tr:nth-child(even) { background-color: #fafafa; }' +
            '.informacion tr:last-child td { border-bottom: none; }' +
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
            '<th class="text-center">Cliente id</th>' +
            '<th>Nombre propietario</th>' +
            '<th>Orden de trabajo</th>' +
            '<th>Estado trabajo</th>' +
            '<th>Cod. bien syshunter</th>' +
            '<th>Bien id</th>' +
            '<th>Familia producto</th>' +
            '<th>Fecha trabajo</th>' +
            '<th>Concesionario</th>' +
            '<th>Ejecutiva referencia</th>' +
            '<th>Ejecutiva gestion</th>' +
            '<th class="text-center">Nombre producto</th>' +
            '<th class="text-right">Seguro</th>' +
            '<th class="text-right">Financiera</th>' +
            '<th class="text-right">Placa</th>' +
            '<th class="text-right">Chasis</th>' +
            '<th class="text-right">Motor</th>' +
            '<th class="text-right">Tipo bien</th>' +
            '<th class="text-right">Marca</th>' +
            '<th class="text-right">Año bien</th>' +
            '<th class="text-right">Color</th>' +
            '<th class="text-right">Marca dispositivo</th>' +
            '<th class="text-right">Modelo dispositivo</th>' +
            '<th class="text-right">Operadora sim card</th>' +
            '</tr></thead>';
        html += '<tbody class="informacion">';

            let totalRegistros = 0;

            resultados.forEach( function(row) {
                totalRegistros++;

                html += '<tr>';
                //html += '<td><span class="fecha">' + (row.created || '-') + '</span></td>';
                html += '<td class="row text-center">' + (row.cliente || '-') + '</td>';
                html += '<td class="row"><span class="factura-id">' + (row.nombre_propietario || '-') + '</span></td>';
                html += '<td class="row" >' + (row.orden_de_trabajo || '-') + '</td>';
                html += '<td class="row" >' + (row.estado_trabajo || '-') + '</td>';
                html += '<td class="row" ><span class="vehiculo-desc">' + (row.cod_bien_syshunter || '-') + '</span></td>';
                html += '<td class="row" ><span class="vehiculo-desc">' + (row.bien_id || '-') + '</span></td>';
                html += '<td class="row" ><span class="vehiculo-desc">' + (row.familia_producto || '-') + '</span></td>';
                html += '<td class="row" ><span class="vehiculo-desc">' + (row.fecha_trabajo || '-') + '</span></td>';
                html += '<td class="row" ><span class="vehiculo-desc">' + (row.concesionario || '-') + '</span></td>';
                html += '<td class="row text-mono">' + (row.ejecutiva_referencia || '-') + '</td>';
                html += '<td class="row text-mono">' + (row.ejecutiva_gestion || '-') + '</td>';
                html += '<td class="row text-center">' + (row.nombre_producto || '-') + '</td>';
                html += '<td class="row text-center">' + (row.seguro || '-') + '</td>';
                html += '<td class="row text-center">' + (row.financiera || '-') + '</td>';
                html += '<td class="row text-center">' + (row.placa || '-') + '</td>';
                html += '<td class="row text-center">' + (row.chasis || '-') + '</td>';
                html += '<td class="row text-center">' + (row.motor || '-') + '</td>';
                html += '<td class="row text-center">' + (row.tipo_bien || '-') + '</td>';
                html += '<td class="row text-center">' + (row.marcar || '-') + '</td>';
                html += '<td class="row text-center">' + (row.anio_bien || '-') + '</td>';
                html += '<td class="row text-center">' + (row.color || '-') + '</td>';
                html += '<td class="row text-center">' + (row.marca_dispositivo || '-') + '</td>';
                html += '<td class="row text-center">' + (row.modelo_dispositivo || '-') + '</td>';
                html += '<td class="row text-center">' + (row.operadora_sim_card || '-') + '</td>';
                //html += '<td class="text-right"><span class="amount">$' + importe.toFixed(2) + '</span></td>';
                html += '</tr>';
            })

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
                    link.download = "RPT_ANEXO_FACTURAS_" + id + "_" + fecha + "_" + random + ".xls";

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                } catch (e) {
                    alert("Error al descargar: " + e.message);
                }
            };

            currentRecord.getField({ fieldId: 'custpage_btn_descargar' }).isDisabled = false;
            let btn_descargar = document.querySelector("#custpage_btn_descargar");
            if (btn_descargar) {
                //btn_descargar.disabled = false;
                btn_descargar.addEventListener('click', window.descargarExcel);
            }

        } catch (error) {
            console.log("ERROR pageInit", error)
        }
    }

    function fieldChanged(context) {
        try {
            let currentRecord = context.currentRecord;
            let cliente = currentRecord.getValue({ fieldId: "custpage_cliente" });
            let estado_trabajo = currentRecord.getValue({ fieldId: "custpage_ot_estado" });
            let fecha_desde = currentRecord.getText({ fieldId: "custpage_fecha_desde" });
            let fecha_hasta = currentRecord.getText({ fieldId: "custpage_fecha_hasta" });

            const newParams = {}

            if ( cliente ) newParams.cliente = cliente;
            if ( estado_trabajo ) newParams.estado_trabajo = estado_trabajo;
            if( fecha_desde && fecha_hasta ) {
                newParams.fecha_desde = fecha_desde;
                newParams.fecha_hasta = fecha_hasta;
            }

            if( (fecha_desde && !fecha_hasta) || (!fecha_desde && fecha_hasta) ) {
                return;
            }

            window.onbeforeunload = null;
            const ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_sl_unidades",
                deploymentId: "customdeploy_hu_ec_sl_unidades",
                params: newParams,
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;
        } catch (error) {
            console.log("ERROR fieldChanged", error)
        }
    }


    return { pageInit, fieldChanged}
});