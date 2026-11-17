/**
 * @NApiVersion 2.x
 * @NScriptType Portlet
 */
define(function() {
    function render(params) {
        // URL completa del Suitelet proporcionada
        var suiteletUrl = 'https://7451241.app.netsuite.com/app/site/hosting/scriptlet.nl?script=5495&deploy=1';

        // Configura el portlet
        params.portlet.title = 'Mi Suitelet Personalizado'; // Título del portlet
        params.portlet.html = '<iframe src="' + suiteletUrl + '" width="100%" height="400px" frameborder="0"></iframe>';
    }

    return {
        render: render
    };
});

