/**
 * @NApiVersion 2.1
 */

define(['../Models/modelGeneral', 'N/record', 'N/https', 'N/log'], function (modelGeneral, record, https, log) {

    function getIdentificaPlataforma(clienteIdInterno) {

        var searchResults = modelGeneral.getIdentificaPlataforma(clienteIdInterno);
        log.debug('searchResults', searchResults);
        return searchResults;

    }

    function getCodSYSEmpleados() {

        var searchResults = modelGeneral.getCodSYSEmpleados();
        log.debug('searchResults', searchResults);
        return searchResults;
        
    }

    return {
        getIdentificaPlataforma,
        getCodSYSEmpleados
    };
});