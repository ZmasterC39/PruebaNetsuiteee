/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', 'N/currentRecord', 'N/url', 'N/https', 'N/ui/message'], function (coberturaController, currentRecord, url, https, message) {

    let subtabActiva = "sublist_disp";

    function pageInit(context) {

        // Detectamos clicks en las subtabs
        const subtabs = document.querySelectorAll('a.formsubtabtext');
        subtabs.forEach(tab => {
            tab.addEventListener('click', () => {
                subtabActiva = tab.getAttribute('data-nsps-id'); // "sublist_disp" o "sublist_sim"
                console.log('Subtab activa:', subtabActiva);
            });
        });
    }

    // Función que llamará el botón
    function exportSegunSubtab() {
        window.onbeforeunload = null;
        if (subtabActiva === 'sublist_disp') {
            _exportXLS('dispositivo');
        } else if (subtabActiva === 'sublist_sim') {
            _exportXLS('sim');
        } else {
            alert('Selecciona una subtab antes de exportar.');
        }
    }

    // Función que llamará el botón
    function exportSegunSubtab2() {
        window.onbeforeunload = null;
        if (subtabActiva === 'sublist_disp') {
            ConsumirAPIInterna2(
                {
                    "accion": "dispositivo",
                    "bin": '654',
                    "item": '22059',
                }, 'POST');
        } else if (subtabActiva === 'sublist_sim') {
            ConsumirAPIInterna2(
                {
                    "accion": "sim",
                    "bin": '654',
                    "item": '22059',
                }, 'POST');

        } else {
            alert('Selecciona una subtab antes de exportar.');
        }
    }

    // Botón para refrescar
    function refrescarPagina() {
        window.location.reload(); // recarga el Suitelet completo
    }

    function _exportXLS(tipo) {
        const url = window.location.href;
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'tipo';
        input.value = tipo;
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }

    function ConsumirAPIInterna2(json) {
        try {
            const restletUrl = url.resolveScript({
                scriptId: 'customscript_hu_ec_rs_rp_smart_on_deman',
                deploymentId: 'customdeploy_hu_ec_rs_rp_smart_on_deman',
                returnExternalUrl: false
            });

            const data = json;

            // Usamos XMLHttpRequest en modo asíncrono
            const xhr = new XMLHttpRequest();
            xhr.open("POST", restletUrl, true); // true = async
            xhr.setRequestHeader("Content-Type", "application/json");
            alert("Solicitud enviada, el correo se procesará en breve");

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log("Respuesta Restlet:", xhr.responseText);
                        alert("Correo Enviado");
                    } else {
                        console.error("Error al llamar Restlet:", xhr.statusText);
                        alert("Error al enviar correo");
                    }
                }
            };

            xhr.send(JSON.stringify(data));

        } catch (error) {
            console.error("Error general:", error);
            alert("Error inesperado");
        }
    }

    return {
        pageInit: pageInit,
        exportSegunSubtab: exportSegunSubtab,
        exportSegunSubtab2: exportSegunSubtab2,
        refrescarPagina: refrescarPagina
    };
});
