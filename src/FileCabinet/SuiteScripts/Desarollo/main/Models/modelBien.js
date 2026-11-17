/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search'], function (record, search) {

    function dataBien(idinternobien) {

        //cargar busqueda guardada de cliente - customsearch_data_actualiza_bien_platafo
        var savedSearch = search.load({
            id: 'customsearch_data_actualiza_bien_platafo'
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

            if (resultObject['codvehiculo'] === idinternobien) {
                resultsArray.push(resultObject);
            }

            return true;
        });

        return resultsArray;
    }

    return {
        dataBien
        // Otros métodos
    };

}); 