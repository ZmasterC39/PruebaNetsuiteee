/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(context) {
        var resultsArray = [];

        try {
            var registroComprasSearch = search.load({
                id: 'customsearch_pe_registro_de_compra_8_2_2' 
            });

            var pagedData = registroComprasSearch.runPaged({ pageSize: 1000 });
            log.debug('Número total de resultados', pagedData.count);

            // Definir el mapeo de columnas a propiedades
            var fieldsMap = [
                {name: 'periodo', default: ''},
                {name: 'cuo', default: ''},
                {name: 'correlativo', default: ''},
                {name: 'fecha_emision_doc', default: ''},
                {name: 'tipo_comprobante', default: ''},
                {name: 'serie_comprobante', default: ''},
                {name: 'numero_comprobante', default: ''},
                {name: 'valor_adquisiciones', default: '0.00'},
                {name: 'otros_conceptos', default: '0.00'},
                {name: 'importe_total_adq', default: '0.00'},
                {name: 'tipo_comp_sust_credito', default: ''},
                {name: 'serie_comp_pago_doc', default: ''},
                {name: 'anio_emision_dua_dsi', default: ''},
                {name: 'nro_orden_no_domiciliado', default: ''},
                {name: 'monto_ret_igv', default: '0.00'},
                {name: 'codigo_moneda', default: ''},
                {name: 'tipo_cambio', default: ''},
                {name: 'pais_residencia_no_dom', default: ''},
                {name: 'razon_social_no_dom', default: ''},
                {name: 'domicilio_extranjero_no_dom', default: ''},
                {name: 'num_id_no_dom', default: ''},
                {name: 'num_id_fiscal_benef_efectivo', default: ''},
                {name: 'proveedor', default: ''},
                {name: 'pais_residencia_benef_ef', default: ''},
                {name: 'vinculo_contrib_res_ext', default: ''},
                {name: 'renta_bruta', default: '0.00'},
                {name: 'deduccion_costo', default: '0.00'},
                {name: 'renta_neta', default: '0.00'},
                {name: 'tasa_retencion', default: ''},
                {name: 'impuesto_retenido', default: '0.00'},
                {name: 'convenios_doble_imposicion', default: ''},
                {name: 'exoneracion_aplicada', default: ''},
                {name: 'tipo_renta', default: ''},
                {name: 'modalidad_serv_no_dom', default: ''},
                {name: 'aplicacion_art_76', default: ''},
                {name: 'estado_anotacion', default: ''},
                {name: 'periodo_b', default: ''},
                {name: 'periodo_inicial', default: ''},
                {name: 'periodo_final', default: ''},
                {name: 'numero_documento', default: ''},
                {name: 'nota', default: ''},
                {name: 'imp_original', default: '0.00'},
                {name: 'archivos_adjuntos', default: ''},
                {name: 'tasa_impuesto_real', default: '0'},
                {name: 'cantidad_file', default: '1'},
            ];

            pagedData.pageRanges.forEach(function(pageRange) {
                var currentPage = pagedData.fetch({ index: pageRange.index });
                currentPage.data.forEach(function(result) {
                    var resultObj = {};
                    for (var i = 0; i < fieldsMap.length; i++) {
                        var field = fieldsMap[i];
                        var value = result.getValue(result.columns[i]) || field.default;
                        resultObj[field.name] = value;
                    }
                    resultsArray.push(resultObj);
                });
            });

        } catch (error) {
            log.error('Error al cargar el reporte', error);
            return JSON.stringify({ error: 'Hubo un error al cargar los datos: ' + error.message });
        }

        return JSON.stringify(resultsArray);
    }

    return {
        get: doGet
    };
});
