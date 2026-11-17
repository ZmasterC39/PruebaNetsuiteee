/**
 * @NApiVersion 2.x
 * @NScriptType Portlet
 */
define(['N/search'], function(search) {
    
    function render(params) {
        var portlet = params.portlet;
        portlet.title = 'Resumen Indicadores por Cliente - TI';
        
        try {
            var mySearch = search.load({ id: 'customsearch5492' });
            var results = mySearch.run().getRange({ start: 0, end: 1000 });

            var activos = 0;
            var coberturas = 0;

            results.forEach(function(result) {
                activos += parseInt(result.getValue({ name: 'formulanumeric1' })) || 0;
                coberturas += parseInt(result.getValue({ name: 'formulanumeric2' })) || 0;
            });

            var html = '<table style="width:100%"><tr><th>Descripción</th><th>Valor</th></tr>';
            html += '<tr><td>Número de Bienes</td><td>' + results.length + '</td></tr>';
            html += '<tr><td>Bienes Activos</td><td>' + activos + '</td></tr>';
            html += '<tr><td>Coberturas</td><td>' + coberturas + '</td></tr>';
            html += '</table>';

            portlet.html = html;
        } catch (e) {
            portlet.html = '<p style="color:red;">Error al generar el portlet: ' + e.message + '</p>';
        }
    }

    return {
        render: render
    };
});
