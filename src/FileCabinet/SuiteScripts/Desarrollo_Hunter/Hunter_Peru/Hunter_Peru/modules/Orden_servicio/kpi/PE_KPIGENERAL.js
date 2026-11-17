/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 *
 * @description RESTlet para obtener datos de ventas desde búsqueda guardada
 *              Retorna todos los registros para ser procesados en el frontend
 */
define(['N/search', 'N/log', 'N/currency', 'N/format'], 
function (search, log, currency, format) {

    /**
     * Handler para peticiones GET
     * Retorna todos los datos de la búsqueda guardada
     */
    function doGet(context) {
        var resultsArray = [];
        var tipoCambioCache = {}; 

        try {
            log.debug('Inicio de búsqueda', 'Cargando customsearch_pe_registro_de_ventas_14__2');

            var registroVentasSearch = search.load({
                id: 'customsearch_pe_registro_de_ventas_14__2' 
            });

            var pagedData = registroVentasSearch.runPaged({ pageSize: 1000 });

            log.debug('Número total de resultados', pagedData.count);

            pagedData.pageRanges.forEach(function(pageRange) {
                var currentPage = pagedData.fetch({ index: pageRange.index });

                currentPage.data.forEach(function(result) {
                    var fechaEmisionRaw = result.getValue(result.columns[3]) || '';
                    var fechaEmision = null;
                    
                    if (fechaEmisionRaw) {
                        try {
                            fechaEmision = format.parse({
                                value: fechaEmisionRaw,
                                type: format.Type.DATE
                            });
                        } catch (e) {
                            log.error({ title: 'Error convirtiendo fecha_emision', details: e });
                        }
                    }

                    var tipoCambioUsdPen = '0.00';
                    if (fechaEmision) {
                        var fechaKey = fechaEmision.toISOString().split('T')[0];
                        if (!tipoCambioCache[fechaKey]) {
                            try {
                                tipoCambioCache[fechaKey] = currency.exchangeRate({
                                    source: 'USD',
                                    target: 'PEN',
                                    date: fechaEmision
                                }).toFixed(4);
                            } catch (e) {
                                log.error({ title: 'Error obteniendo tipo de cambio', details: e });
                            }
                        }
                        tipoCambioUsdPen = tipoCambioCache[fechaKey] || '0.00';
                    }

                    resultsArray.push({
                        periodo: result.getValue(result.columns[0]) || '',
                        cuo: result.getValue(result.columns[1]) || '',
                        correlativo: result.getValue(result.columns[2]) || '',
                        fecha_emision: fechaEmisionRaw,
                        fecha_vencimiento: result.getValue(result.columns[4]) || '',
                        tipo_comprobante: result.getValue(result.columns[5]) || '',
                        serie_comprobante: result.getValue(result.columns[6]) || '',
                        numero_comprobante: result.getValue(result.columns[7]) || '',
                        opcion_no_credito_fiscal: result.getValue(result.columns[8]) || '',
                        tipo_documento_cliente: result.getValue(result.columns[9]) || '',
                        ruc_cliente: result.getValue(result.columns[10]) || '',
                        cliente: result.getValue(result.columns[11]) || '',
                        x_pe: result.getValue(result.columns[12]) || '0.00',
                        s_pe: result.getValue(result.columns[13]) || '0.00',
                        desc: result.getValue(result.columns[14]) || '0.00',
                        igv: result.getValue(result.columns[15]) || '0.00',
                        igv_descuento_pe: result.getValue(result.columns[16]) || '0.00',
                        e_pe: result.getValue(result.columns[17]) || '0.00',
                        inaf_pe: result.getValue(result.columns[18]) || '0.00',
                        s_un_pe: result.getValue(result.columns[19]) || '0.00',
                        i_un_pe: result.getValue(result.columns[20]) || '0.00',
                        formula_moneda: result.getValue(result.columns[21]) || '',
                        otros: result.getValue(result.columns[23]) || '0.00',
                        total: result.getValue(result.columns[24]) || '0.00',
                        moneda: result.getValue(result.columns[25]) || '',
                        tipo_cambio: result.getValue(result.columns[26]) || '',
                        fecha_doc_ref: result.getValue(result.columns[27]) || '',
                        td_doc_ref: result.getValue(result.columns[28]) || '',
                        serie_doc_ref: result.getValue(result.columns[29]) || '',
                        num_doc_ref: result.getValue(result.columns[30]) || '',
                        identificador_contrato: result.getValue(result.columns[31]) || '',
                        inconsistencia_tc: result.getValue(result.columns[32]) || '',
                        medio_pago: result.getValue(result.columns[33]) || '',
                        estado: result.getValue(result.columns[34]) || '',
                        periodo_inicial: result.getValue(result.columns[35]) || '',
                        periodo_final: result.getValue(result.columns[36]) || '',
                        meses_anteriores: result.getValue(result.columns[37]) || '',
                        es_rectificacion: result.getValue(result.columns[38]) || '',
                        tipo_transaccion: result.getValue(result.columns[39]) || '',
                        memo: result.getValue(result.columns[40]) || '',
                        descuento_exonerado: result.getValue(result.columns[41]) || '0.00',
                        descuento_pe: result.getValue(result.columns[42]) || '0.00',
                        descuento_x_pe: result.getValue(result.columns[43]) || '0.00',
                        descuento_inaf_pe: result.getValue(result.columns[44]) || '0.00',
                        snop_pe: result.getValue(result.columns[45]) || '0.00',
                        snoc_pe: result.getValue(result.columns[46]) || '0.00',
                        ie_pe: result.getValue(result.columns[47]) || '0.00',
                        inoc_pe: result.getValue(result.columns[48]) || '0.00',
                        ordenamiento: result.getValue(result.columns[49]) || '',
                        tipo_cambio_usd: tipoCambioUsdPen,
                        departamento: result.getValue(result.columns[51]) || ''
                    });
                });
            });

            log.debug('Búsqueda completada', { total_registros: resultsArray.length });

            return JSON.stringify(resultsArray);

        } catch (error) {
            log.error('Error al cargar el reporte', error);
            return JSON.stringify({ 
                error: 'Hubo un error al cargar los datos: ' + error.message,
                stack: error.stack
            });
        }
    }

    return {
        get: doGet
    };
});