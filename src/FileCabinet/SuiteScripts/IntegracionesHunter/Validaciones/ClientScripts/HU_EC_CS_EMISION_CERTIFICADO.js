/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 03/10/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define( ['N/log', 'N/url'], function(log, url) {

    function pageInit(context) {
        try {
            let resetter = document.getElementById('resetter');
            let markAllButton = document.getElementById('custpage_sublistmarkall');
            let unmarkAllButton = document.getElementById('custpage_sublistunmarkall');
            let seleccionado = document.getElementById('custpage_seleccionados');
            let cliente_email = document.querySelector('[data-field-name="custpage_cliente_email"]');

            if (resetter) {
                resetter.addEventListener('click', function() {
                    window.onbeforeunload = null;
                    let ruta = url.resolveScript({
                        scriptId: "customscript_hu_ec_sl_emision_certificad",
                        deploymentId: "customdeploy_hu_ec_sl_emision_certificad",
                        returnExternalUrl: false,
                    });

                    setWindowChanged(window, false);
                    window.location.href = ruta;
                });
            }

            if (markAllButton) {
                markAllButton.addEventListener('click', function() {
                    calcularImporte(context);
                });
            }

            if (unmarkAllButton) {
                unmarkAllButton.addEventListener('click', function() {
                    calcularImporte(context);
                });
            }

            if(seleccionado){
                if (seleccionado) {
                    seleccionado.removeAttribute('disabled'); // Habilita el campo
                    seleccionado.style.backgroundColor = '#fff';
                    seleccionado.style.color = '#000';
                    seleccionado.style.border = '0px solid #000';
                }
            }

            // ! *-*-*-*--*-*-*--*-*-*-*-*-*-*-*-*-*-*-*- POST *-*-*-*--*-*-*--*-*-*-*-*-*-*-*-*-*-*-*-*
            //console.log("context", resetter.value);
            if (window.attachments && Array.isArray(window.attachments) && window.attachments.length > 0) {

                async function descargarCertificados() {
                    let baseUrl = 'https://7451241.app.netsuite.com/app/site/hosting/scriptlet.nl';

                    let doc_descargados = document.getElementById('doc_descargados');

                    for (let index = 0; index < window.attachments.length; index++) {
                        const data = window.attachments[index];

                        try {
                            // Construir URL
                            let params = new URLSearchParams({
                                script: '6488',
                                deploy: '1',
                                tipo_certificado: data.tipo_certificado || '',
                                nombre: data.nombre || '',
                                producto: data.producto || '',
                                fecha_instalacion: data.fecha_instalacion || '',
                                fecha_vigencia_servicio: data.fecha_vigencia_servicio || '',
                                placa: data.placa || '',
                                marca: data.marca || '',
                                modelo: data.modelo || '',
                                color: data.color || '',
                                anio: data.anio || '',
                                motor: data.motor || '',
                                chasis: data.chasis || '',
                                bien_id: data.bien_id || '',
                                emisor: data.emisor || ''
                            });

                            let url = baseUrl + '?' + params.toString();

                            // console.log(`Descargando ${index + 1}/${window.attachments.length}: ${data.placa}`);

                            if ( doc_descargados ) {
                                doc_descargados.innerText = index + 1;
                            }

                            // Hacer fetch
                            let response = await fetch(url);

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            // Obtener el PDF como blob
                            let blob = await response.blob();

                            // Crear link de descarga
                            let downloadUrl = window.URL.createObjectURL(blob);
                            let a = document.createElement('a');
                            a.href = downloadUrl;
                            let certificado_tipo = data.tipo_certificado == '1' ? 'VTA' : 'INST';
                            a.download = `CERT${certificado_tipo}_${data.placa}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(downloadUrl);

                            // Esperar 1 segundo entre descargas
                            await new Promise(resolve => setTimeout(resolve, 1000));

                        } catch (error) {
                            console.error(`Error descargando ${data.placa}:`, error);
                        }
                    }

                    alert('Descargas completadas');
                    download = false;
                }

                // Iniciar descargas
                descargarCertificados();
            }
            return;
        } catch (error) {
            console.error("ERROR pageInit", error)
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;
            let cliente_email = document.querySelector('[data-field-name="custpage_cliente_email"]');

            if (fieldId == 'custpage_accion') {
                cliente_email.style.display = context.currentRecord.getValue({ fieldId: 'custpage_accion' }) == 2 ? 'block' : 'none';
                return; }

            if (fieldId == 'custpage_checkbox') { calcularImporte(context); return; }

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

            if (cliente) { params.cliente = cliente; }

            if (fecha_desde && fecha_hasta) {
                params.fecha_desde = fecha_desde;
                params.fecha_hasta = fecha_hasta;
            }

            if (pg) { params.pg = pg; }

            if (tipo_certificado) { params.tipo_certificado = tipo_certificado; }

            if ( cliente_correo ) { params.cliente_correo = cliente_correo; }

            window.onbeforeunload = null;
            let ruta = url.resolveScript({
                scriptId: "customscript_hu_ec_sl_emision_certificad",
                deploymentId: "customdeploy_hu_ec_sl_emision_certificad",
                params,
                returnExternalUrl: false,
            });
            setWindowChanged(window, false);
            window.location.href = ruta;
            return;

        } catch (error) {
            console.error("ERROR fieldChanged", error)
        }
    }

    function calcularImporte(context){
        try {
            let currentRecord = context.currentRecord;
            let seleccionados = 0;
            let sublistLineCount = currentRecord.getLineCount({
                sublistId: "custpage_sublist",
            });
            let totalImporte = 0;
            for (let i = 0; i < sublistLineCount; i++) {
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublist",
                    fieldId: "custpage_checkbox",
                    line: i,
                });

                if (checkboxValue === true) {
                    let importeLinea = currentRecord.getSublistValue({
                        sublistId: "custpage_sublist",
                        fieldId: "custpage_total_orden",
                        line: i,
                    });
                    totalImporte += parseFloat(importeLinea || 0);
                    seleccionados += 1;
                }
            }

            //let formatoMoneda = totalImporte.toLocaleString('es-EC', { style: 'currency', currency: 'USD' });

            // currentRecord.setValue({
            //     fieldId: "custpage_importe",
            //     value: `
            //     <p style="font-size:13px;">
            //             <span style="color:#6f6f6f;">IMPORTE:</span> ${formatoMoneda}
            //         </p>`
            // });
            currentRecord.setValue({
                fieldId: "custpage_seleccionados",
                value:  `<p style="font-size:13px;">
                        <span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> ${seleccionados} de ${sublistLineCount}
                    </p>`
            });
        } catch (error) {
            console.error("ERROR calcularImporte", error)
        }
    }

    function saveRecord(context) {
        try {
            let currentRecord = context.currentRecord;

            let accion = currentRecord.getValue({ fieldId: "custpage_accion" });
            let cliente_email = currentRecord.getValue({ fieldId: "custpage_cliente_email" });
            let sublistLineCount = currentRecord.getLineCount({
                sublistId: "custpage_sublist",
            });

            let tipo_certificado = currentRecord.getValue({ fieldId: "custpage_tipo_certificado" });

            if( tipo_certificado == 0 ) {
                alert("Es necesario seleccionar un tipo de certificado para procesar la tarea.")
                return false;
            }

            let seleccionado = 0;

            for( let i = 0; i < sublistLineCount; i++){
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublist",
                    fieldId: "custpage_checkbox",
                    line: i,
                });

                if( checkboxValue ) {
                    seleccionado++;
                }
            }

            if(accion == 0) {
                alert("Es necesario seleccionar un tipo de acción para procesar la tarea.")
                return false;
            }

            if ( accion == 2) { // Enviar por correo
                if ( !cliente_email || cliente_email.trim() === '' ) {
                    alert("Es necesario ingresar un correo electrónico para enviar los documentos generados.");
                    return false;
                }
            }

            if( seleccionado > 0){

                let mensaje = seleccionado === 1
                    ? `¿Está seguro de generar  1 documento comercial?`
                    : `¿Está seguro de generar ${seleccionado} documentos comerciales?`;

                let confirmacion = confirm(mensaje);

                if(!confirmacion){
                    return false;
                }else{
                    // const base64 = btoa(unescape(encodeURIComponent("Nuevo usuario")));
                    // console.log(base64);
                    // log.debug("base64", base64);
                    return true;
                }
            }else{
                alert('Debe seleccionar al menos un registro');
                return false;
            }

        } catch (error) {
            console.error("ERROR saveRecord", error)
        }

    }

    return { pageInit, fieldChanged, saveRecord }

});