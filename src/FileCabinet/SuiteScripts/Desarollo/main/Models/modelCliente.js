/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search'], function (record, search) {

    function dataCliente(clienteIdInterno) {

        //cargar busqueda guardada de cliente - customsearch_data_upd_cliente_pltfm
        var savedSearch = search.load({
            id: 'customsearch_data_upd_cliente_pltfm'
        });

        var searchResults = savedSearch.run();

        var resultsArray = [];

        searchResults.each(function (result) {
            var resultObject = {};

            // Acceder a los valores por el campo "label"
            result.columns.forEach(function (column) {
                var label = column.label;
                var value = result.getValue(column);

                resultObject[label] = value;
            });

            if (resultObject['idinternocliente'] === clienteIdInterno) {
                resultsArray.push(resultObject);
            }

            return true;
        });

        return resultsArray;
    }

    return {
        dataCliente
        // Otros métodos
    };

}); 