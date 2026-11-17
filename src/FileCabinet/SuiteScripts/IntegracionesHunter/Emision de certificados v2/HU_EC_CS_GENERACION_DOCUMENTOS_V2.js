/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 14/04/2026 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define( ['N/url'], function(url) {
    function pageInit(context) {
        try {
            let resetter = document.getElementById('resetter');

            if (resetter) {
                resetter.addEventListener('click', function() {
                    window.onbeforeunload = null;
                    let ruta = url.resolveScript({
                        scriptId: "customscript_hu_ec_sl_gen_doc_v2",
                        deploymentId: "customdeploy_hu_ec_sl_gen_doc_v2",
                        returnExternalUrl: false,
                    });

                    setWindowChanged(window, false);
                    window.location.href = ruta;
                });
            }


            // ! DESCARGA DE CERTIFICADOS;
            if (window.attachments && window.attachments.length > 0) {
                let attachments = JSON.parse(window.attachments);
                async function descargarCertificados() {
                    let doc_descargados = document.getElementById('doc_descargados');
                    const baseUrl = 'https://7451241.app.netsuite.com/app/site/hosting/scriptlet.nl?script=6852&deploy=1';
                    const chunkSize = 3;
                    let contador = 0;

                    for (let i = 0; i < attachments.length; i += chunkSize) {
                        const chunk = attachments.slice(i, i + chunkSize);

                        await Promise.all(chunk.map(async (data) => {
                            try {
                                let bodyData = {
                                    ...data,
                                    tipo_certificado: window.tipo_certificado,
                                    emisor: window.emisor,
                                };

                                contador++;
                                if (doc_descargados) {
                                    doc_descargados.innerText = `${contador}`;
                                }


                                let res = await fetch(baseUrl , {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(bodyData)
                                });

                                let blob = await res.blob();
                                let urlBlob = URL.createObjectURL(blob);

                                let a = document.createElement('a');
                                a.href = urlBlob

                                let tipo = window.tipo_certificado == '1' ? 'VTA' : 'INST';
                                a.download = `CERT${tipo}_${data.placa}.pdf`;
                                a.style.display = 'none';
                                document.body.appendChild(a);

                                a.click();

                                // limpiar
                                document.body.removeChild(a);
                                URL.revokeObjectURL(urlBlob);
                            } catch (error) {
                                console.error(error);
                            }
                        }));
                        await new Promise(r => setTimeout(r, 500));
                    }
                }
                descargarCertificados();
            }
        } catch (error) {
            console.error("ERROR pageInit", error)
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;

            if (fieldId == 'custpage_tipo_certificado' || fieldId == 'custpage_destinatario' || fieldId == 'custpage_object') { return; }
            if ( fieldId == 'custpage_accion' ) {
                if ( context.currentRecord.getValue({ fieldId: 'custpage_accion' }) == 1 ) { // DESCARGAR
                    context.currentRecord.setValue({ fieldId: 'custpage_destinatario', value: '', ignoreFieldChange: true });
                    context.currentRecord.getField({ fieldId: 'custpage_destinatario' }).isDisplay = false;
                }else if ( context.currentRecord.getValue({ fieldId: 'custpage_accion' }) == 2 ) { // ENVIAR POR CORREO
                    context.currentRecord.getField({ fieldId: 'custpage_destinatario' }).isDisplay = true;
                }
                return;
            }

            let empresa_matriz = context.currentRecord.getValue({ fieldId: 'custpage_empresa_matriz' });
            let cliente = context.currentRecord.getValue({ fieldId: 'custpage_cliente' });
            let tipo_certificado = context.currentRecord.getValue({ fieldId: 'custpage_tipo_certificado' });
            let cliente_correo = context.currentRecord.getValue({ fieldId: 'custpage_cliente_email' });
            let fecha_desde = context.currentRecord.getText({ fieldId: 'custpage_fecha_desde' });
            let fecha_hasta = context.currentRecord.getText({ fieldId: 'custpage_fecha_hasta' });
            let pg = context.currentRecord.getValue({ fieldId: 'custpage_pagina' });

            if (fieldId == 'custpage_fecha_desde' || fieldId == 'custpage_fecha_hasta') {
                if (!fecha_desde || !fecha_hasta) {
                    return;
                }
            }

            let params = {};

            if (empresa_matriz) { params.empresa_matriz = empresa_matriz; }
            if (cliente) { params.cliente = cliente; }

            if (fecha_desde && fecha_hasta) {
                params.fecha_desde = fecha_desde;
                params.fecha_hasta = fecha_hasta;
            }

            if (pg) { params.pg = pg; }

            window.onbeforeunload = null;
            let ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_sl_gen_doc_v2",
                deploymentId: "customdeploy_hu_ec_sl_gen_doc_v2",
                params,
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;
            return;

        } catch (error) {
            console.error("ERROR fieldChanged ", error)
        }
    }
    function saveRecord(context) {
        try {
            let currentRecord = context.currentRecord;
            if ( currentRecord.getValue({ fieldId: 'custpage_tipo_certificado'}) == 0) { alert("Seleccione un tipo de certificado válido"); return; }
            if ( !currentRecord?.getValue({ fieldId: 'custpage_object'}) ) { alert("Debe seleccionar al menos 1 registro"); return; }
            let registros_procesar = JSON.parse(currentRecord.getValue({ fieldId: 'custpage_object'})) || [];

            return true;

        } catch (error) {
            console.error("ERROR saveRecord ",error)
        }
    }

    return { pageInit, fieldChanged, saveRecord};
})