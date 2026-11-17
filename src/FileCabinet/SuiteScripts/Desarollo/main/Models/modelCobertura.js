/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function dataCobertura(idcobertura) {

        var dataCobertura = {
            "codVehiculo": "",
            "placaVehiculo": "",
            "idMarcaVehiculo": "",
            "marcaVehiculo": "",
            "idModeloVehiculo": "",
            "modeloVehiculo": "",
            "chasisVehiculo": "",
            "motorVehiculo": "",
            "colorVehiculo": "",
            "tipoVehiculo": "",
            "familiaProdructo": "",
            "serieDispositivo": "",
            "vidDispositivo": "",
            "modeloDispositivo": "",
            "imeiDispositivo": "",
            "numeroCelularSim": "",
            "operadoraSim": "",
            "idcobertura": "",
            "aniovehiculo": "",
            "idVehiculo": "",
            "estadoCobertura": ""
        }

        //cargar busqueda guardada de cobertura - customsearch_data_actualiza_estado_plata
        var savedSearch = search.load({
            id: 'customsearch_data_actualiza_estado_plata'
        });

        var searchResults = savedSearch.run();

        //var resultsArray = [];

        searchResults.each(function (result) {
            var resultObject = {};

            // Acceder a los valores por el campo "label"
            result.columns.forEach(function (column) {
                var label = column.label;
                var value = result.getValue(column);

                resultObject[label] = value;
            });

            if (resultObject['idcobertura'] === idcobertura) {
                log.debug('resultObject-dataCobertura', resultObject);

                dataCobertura.codVehiculo = resultObject['codVehiculo'];
                dataCobertura.placaVehiculo = resultObject['placaVehiculo'];
                dataCobertura.idMarcaVehiculo = resultObject['idMarcaVehiculo'];
                dataCobertura.marcaVehiculo = resultObject['marcaVehiculo'];
                dataCobertura.idModeloVehiculo = resultObject['idModeloVehiculo'];
                dataCobertura.modeloVehiculo = resultObject['modeloVehiculo'];
                dataCobertura.chasisVehiculo = resultObject['chasisVehiculo'];
                dataCobertura.motorVehiculo = resultObject['motorVehiculo'];
                dataCobertura.colorVehiculo = resultObject['colorVehiculo'];
                dataCobertura.tipoVehiculo = resultObject['tipoVehiculo'];
                dataCobertura.familiaProdructo = resultObject['familiaProdructo'];
                dataCobertura.serieDispositivo = resultObject['serieDispositivo'];
                dataCobertura.vidDispositivo = resultObject['vidDispositivo'];
                dataCobertura.modeloDispositivo = resultObject['modeloDispositivo'];
                dataCobertura.imeiDispositivo = resultObject['imeiDispositivo'];
                dataCobertura.numeroCelularSim = resultObject['numeroCelularSim'];
                dataCobertura.operadoraSim = resultObject['operadoraSim'];
                dataCobertura.idcobertura = resultObject['idcobertura'];
                dataCobertura.aniovehiculo = resultObject['aniovehiculo'];
                dataCobertura.idVehiculo = resultObject['idVehiculo'];
                dataCobertura.estadoCobertura = resultObject['estadoCobertura'];

            }

            return true;
        });

        return dataCobertura;
    }

    return {
        dataCobertura
        // Otros métodos
    };

});