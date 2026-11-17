/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget'], function(serverWidget) {
 
    function render(params) {
        var portlet = params.portlet;
        portlet.title = 'Portlet Personalizado SIMCARD';
 
        const html = `
                <iframe src="/app/site/hosting/scriptlet.nl?script=6227&deploy=1"
                    width="100%" height="400" frameborder="0">
                </iframe>
            `;
            portlet.html = html;
 
        portlet.html = html;
    }
 
    return {
        render: render
    };
});
 