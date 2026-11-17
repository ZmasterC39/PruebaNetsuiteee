/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/log'], function (search, log) {

    function doGet(context) {
        var resultsArray = [];

        try {
            var registroVentasSearch = search.load({
                id: 'customsearch_pe_libro_mayor_6_1_3'
            });

            var pagedData = registroVentasSearch.runPaged({
                pageSize: 1000
            });

            log.debug('Número total de resultados', pagedData.count);

            for (var i = 0; i < pagedData.pageRanges.length; i++) {
                var currentPage = pagedData.fetch({ index: i });

                for (var j = 0; j < currentPage.data.length; j++) {
                    var result = currentPage.data[j];
                    var resultObj = {};

                    // Iteramos dinámicamente sobre las columnas y asignamos valores
                    result.columns.forEach(function (column, index) {
                        var columnLabel = column.label ?
                            column.label.replace(/\s+/g, '_').toLowerCase() : 'col_' + index;

                        resultObj[columnLabel] = result.getValue(column) || '';
                    });

                    resultsArray.push(resultObj);
                }
            }

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
