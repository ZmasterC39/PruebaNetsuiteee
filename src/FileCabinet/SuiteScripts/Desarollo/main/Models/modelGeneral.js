/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    //Identifica que tipo de plataforma ira
    /*Esta funcion ayuda a identificar si el cliente tiene producto ami, px o ambos
    se excluye Lojack*/
    function getIdentificaPlataforma(clienteIdInterno) {

        log.debug('modelGeneral-clienteIdInterno', clienteIdInterno);

        // Busqueda guardada - customsearch_hu_identifica_plataforma
        var savedSearch = search.load({
            id: 'customsearch_hu_identifica_plataforma'
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

    function getCoberturaById(idinterno) {

        log.debug('modelGeneral-getCoberturaById', idinterno);

        var cobertura = {
            "idinterno": "",
            "codbien": "",
            "propietario": "",
            "codproducto": "",
            "coberturaini": "",
            "coberturafin": "",
            "coberturaestado": "",
            "estado": "",
            "descripcionproducto": "",
            "idinternocliente": "",
            "familiaproducto": ""
        }

        // Busqueda guardada - customsearch_hu_identifica_plataforma
        var savedSearch = search.load({
            id: 'customsearch_hu_identifica_plataforma'
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

            if (resultObject['idinterno'] === idinterno) {

                cobertura.idinterno = resultObject['idinterno']
                cobertura.codbien = resultObject['codbien']
                cobertura.propietario = resultObject['propietario']
                cobertura.codproducto = resultObject['codproducto']
                cobertura.coberturaini = resultObject['coberturaini']
                cobertura.coberturafin = resultObject['coberturafin']
                cobertura.coberturaestado = resultObject['coberturaestado']
                cobertura.estado = resultObject['estado']
                cobertura.descripcionproducto = resultObject['descripcionproducto']
                cobertura.idinternocliente = resultObject['idinternocliente']
                cobertura.familiaproducto = resultObject['familiaproducto']

            }

            return true;
        });

        return cobertura;

    }

    // funcion para retornar los datos segun la seriedispositivo en el chaser
    function getDataDispositivo(seriedispositivo) {

        var dataChaser = {
            "idmarcadispositivo": "",
            "marcadispositivo": "",
            "idmodelodispositivo": "",
            "modelodispositivo": "",
            "serieSim": "",
            "direccionMacSim": ""
        }

        var savedSearch = search.load({
            id: 'customsearch_data_dispositivo_chaser'
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

            if (resultObject['seriedispositivo'] === seriedispositivo) {
                //resultsArray.push(resultObject);

                log.debug({ title: 'resultObject', details: resultObject })

                dataChaser.idmarcadispositivo = resultObject['idMarcaDispositivo']
                dataChaser.marcadispositivo = resultObject['marcaDispositivo']
                dataChaser.idmodelodispositivo = resultObject['idModeloDispositivo']
                dataChaser.modelodispositivo = resultObject['modeloDispositivo']
                dataChaser.serieSim = resultObject['serieSim']
                dataChaser.direccionMacSim = resultObject['direccionMacSim']
            }

            return true;
        });

        return dataChaser

    }

    // funcion para retornar la descripcion y el codigo de la familia
    function getFamiliaProducto(desc) {

        var familiaProducto = {
            "descripcionfamilia": "",
            "codigofamilia": "",
            "estadofamilia": ""
        }

        var savedSearch = search.load({
            id: 'customsearch_data_familia_producto'
        });

        var searchResults = savedSearch.run();

        searchResults.each(function (result) {
            var resultObject = {};

            // Acceder a los valores por el campo "label"
            result.columns.forEach(function (column) {
                var label = column.label;
                var value = result.getValue(column);

                resultObject[label] = value;
            });

            if (resultObject['codinterno'] === desc) {
                familiaProducto.descripcionfamilia = resultObject['descripcionfamilia']
                familiaProducto.codigofamilia = resultObject['codigofamilia'],
                familiaProducto.estadofamilia = resultObject['estadofamilia']
            }

            return true;
        });

        return familiaProducto

    }


    function getCodSYSEmpleados() {
/*
        var empleado = {
            "idempleado": "",
            "codigo_syshunter": ""
        }

        var savedSearch = search.load({
            id: 'customsearch_cs_cod_empleado_sys'
        });

        var searchResults = savedSearch.run();

        var resultObject = {}

        var result = []

        searchResults.each(function (result) {

            // Acceder a los valores por el campo "label"
            
            result.columns.forEach(function (column) {
                var label = column.label;
                var value = result.getValue(column);

                resultObject[label] = value;

                result.push(resultObject)
                
            });
            


            return true;
        });

        return result
      */
    }


    return {
        getIdentificaPlataforma,
        getCoberturaById,
        getDataDispositivo,
        getFamiliaProducto,
        getCodSYSEmpleados
        // Otros métodos
    };

}); 
