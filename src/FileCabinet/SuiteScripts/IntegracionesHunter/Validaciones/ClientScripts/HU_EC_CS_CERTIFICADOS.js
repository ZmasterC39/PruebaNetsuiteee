/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * @author Mauro F Ramos
 * @date 23/01/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 * @LastModifiedBy 24/01/2025
 */

define(['N/url', 'N/https', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES', 'N/ui/message', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', 'N/record'] , (url, https, _const, message, coberturaController, record) => {

    function pageInit(context){
        let resetter = document.getElementById('resetter');

        if( resetter ){
            resetter.addEventListener('click', function() {
                window.onbeforeunload = null;
                let ruta = url.resolveScript({
                    scriptId: "customscript_hu_ec_st_certificados",
                    deploymentId: "customdeploy_hu_ec_st_certificados",
                    returnExternalUrl: false,
                });

                setWindowChanged(window, false);
                window.location.href = ruta;
            });
        }
    }

    function fieldChanged(context) {
        try {
            const fieldId = context.fieldId;
            let currentRecord = context.currentRecord;

            const currentUrl = new URL(window.location.href);
            const currentParams = Object.fromEntries(currentUrl.searchParams.entries());

            let os = currentRecord.getValue({ fieldId: "custpage_os" });
            const cliente = currentRecord.getValue({ fieldId: "custpage_cliente" });
            const fecha_desde = currentRecord.getText({ fieldId: "custpage_fecha_desde" });
            const fecha_hasta = currentRecord.getText({ fieldId: "custpage_fecha_hasta" });
            const cmbCertificado = currentRecord.getText({ fieldId: "custpage_cmb_certificado" });

            const newParams = {...currentParams};

            switch(fieldId) {
                case 'custpage_os':
                    os = [...os].filter(c => !isNaN(c)).join('');
                    newParams.os = os;
                    break;
                case 'custpage_cliente':
                    if (cliente) {
                        newParams.cliente = cliente;
                    } else {
                        delete newParams.cliente;
                    }
                    break;
                case 'custpage_fecha_desde':
                case 'custpage_fecha_hasta':
                    if (fecha_desde && fecha_hasta) {
                        newParams.fecha_desde = fecha_desde;
                        newParams.fecha_hasta = fecha_hasta;
                    } else {
                        delete newParams.fecha_desde;
                        delete newParams.fecha_hasta;
                    }
                    break;
                case 'custpage_checkbox':
                    llenarTipo(context);
                    break;
            }
            // Solo actualizar si hay cambios relevantes
            if (JSON.stringify(currentParams) !== JSON.stringify(newParams)) {
                window.onbeforeunload = null;
                const ruta = url.resolveScript({
                    scriptId: "customscript_hu_ec_st_certificados",
                    deploymentId: "customdeploy_hu_ec_st_certificados",
                    params: newParams,
                    returnExternalUrl: false,
                });
                setWindowChanged(window, false);
                window.location.href = ruta;
            }
        } catch (error) {
            log.debug('Error en fieldChanged', error.stack);
        }
    }

    function OrdenEstaFacturada(IdOrdenServicio) { //VBC 20250407
        try {
              let Facturado = 'N';

              let OrdenServicio = record.load({ type: 'salesorder', id: IdOrdenServicio, isDynamic: true });
              let LineasDetalle = 0;

              let EsFacturaInterna = OrdenServicio.getValue({fieldId: 'custbody_ec_estado_factura_interna'});

              if (EsFacturaInterna == 2){
                 LineasDetalle = OrdenServicio.getLineCount({ sublistId: "transformations" });

                 if (LineasDetalle > 0) {
                    Facturado = 'Factura Interna';
                    LineasDetalle = 0;
                 }
              }

              LineasDetalle = OrdenServicio.getLineCount({ sublistId: "links" });
              if (LineasDetalle > 0) {
                 for (let i = 0; i < LineasDetalle; i++) {
                    TipoItem = OrdenServicio.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                    Estado = OrdenServicio.getSublistValue({ sublistId: 'links', fieldId: 'status', line: i });
                    if (TipoItem == 'Factura de venta') {
                       if (Facturado == 'N' ) { //SI HAY FACTURA INTERNA NO DEBERIA HABER FACTURA DE VENTA
                          Facturado = 'Factura de Venta';
                       } else {
                          Facturado = 'N';
                       }
                    }
                 }
              }

              return Facturado;

        } catch (error) {
           log.error('error', { error: error.message, stack: error.stack });
           return 'id:400, No se encontraron resultados. Error Controlado. (OrdenEstaFacturada)';
        }
    }

    function llenarTipo(context) {
        try {
            let currentRecord = context.currentRecord;
            let currentLine = context.line; // Obtiene la línea actualmente modificada
            let sublistLineCount = currentRecord.getLineCount({
                sublistId: "custpage_sublista",
            });
            let certificado_instalacion = true;
            let certificado_venta = true;

            let seleccionados = 0;

            for (let i = 0; i < sublistLineCount; i++) {
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublista",
                    fieldId: "custpage_checkbox",
                    line: i,
                });
                if(checkboxValue){
                    seleccionados += 1;
                }
            }

            if(seleccionados > 1){
                message.create({
                    type: message.Type.ERROR,
                    title: 'Información',
                    message: 'Por favor, seleccione solo un registro para generar el certificado.',
                    duration: 10000
                }).show();

                currentRecord.setValue({
                    fieldId: "custpage_cmb_certificado",
                    value: `
                    <div style="margin: 10px 0px">
                        <span style=" font-size:13px; color:#6f6f6f;">CERTIFICADOS DISPONIBLES</span>
                        <br>
                        <select style="width: 280px; padding: 5px;">
                            <option value="">-- Seleccione un certificado --</option>
                        </select>
                    </div>
                    `
                });
                return;
            }

            if(seleccionados == 0){
                currentRecord.setValue({
                    fieldId: "custpage_cmb_certificado",
                    value: `
                    <div style="margin: 10px 0px">
                        <span style=" font-size:13px; color:#6f6f6f;">CERTIFICADOS DISPONIBLES</span>
                        <br>
                        <select style="width: 280px; padding: 5px;">
                            <option value="">-- Seleccione un certificado --</option>
                        </select>
                    </div>
                    `
                });
                return;
            }

            let idBien;
            let idCobertura;
            let idFam;
            let senderName;
            let email;

            for (let i = 0; i < sublistLineCount; i++) {
                let checkboxValue = currentRecord.getSublistValue({
                    sublistId: "custpage_sublista",
                    fieldId: "custpage_checkbox",
                    line: i,
                });
                if(checkboxValue){
                    let estado_ot = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_custrecord_ht_ot_estado",
                        line: i,
                    });

                    if(estado_ot !== "C - CHEQUEADO"){
                        certificado_instalacion = false;
                    }

                    os_id = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_id",
                        line: i,
                    });

                    let respuestaAPIInterna = OrdenEstaFacturada(os_id);// consumirAPIInterna({ entidad : "ES_FACTURADO", idorden: `${os_id}`}, 'POST');

                    if(respuestaAPIInterna == 'N'){
                        certificado_venta = false;
                    }
                    idBien = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_custbody_ht_so_bien",
                        line: i,
                    });
                    idCobertura = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_cobertura_id",
                        line: i,
                    });
                    idFam = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_fam",
                        line: i,
                    });
                    senderName = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_email",
                        line: i,
                    });
                    email = currentRecord.getSublistValue({
                        sublistId: "custpage_sublista",
                        fieldId: "custpage_sendername",
                        line: i,
                    });
                }
            }

            let baseUrl = 'http://localhost:55942/Forms/ConsultaDatosNetsuite.aspx';
            baseUrl = 'https://www.hunteronline.com.ec/WSConcesionarios/Forms/ConsultaDatosNetsuite.aspx'
            let params = ``;
            let fullUrl = ``;
            let data;
            let opciones = []
            if(certificado_venta){
                data = sendPostEncrypt(idBien, idFam, senderName, email);
                params = `Id=${data[0]}&cobertura=${data[1]}&name=${data[2]}&usuario=${data[3]}&cmbo=C`;
                fullUrl = `${baseUrl}?${params}`;
                opciones.push(`<option value="${fullUrl}">Certificado de Venta</option>`)
            }
            if(certificado_instalacion){
                data = sendPostEncrypt(idBien, idCobertura, senderName, email);
                params = `Id=${data[0]}&cobertura=${data[1]}&name=${data[2]}&usuario=${data[3]}&cmbo=I`;
                fullUrl = `${baseUrl}?${params}`;
                opciones.push(`<option value="${fullUrl}">Certificado de Instalación</option>`)
            }

            if( !certificado_venta && !certificado_instalacion){
                message.create({
                    type: message.Type.ERROR,
                    title: 'Información',
                    message: 'No existe certificado para el registro seleccionado.',
                    duration: 10000
                }).show();
            }

            currentRecord.setValue({
                fieldId: "custpage_cmb_certificado",
                value: `
                <div style="margin: 10px 0px">
                    <span style="font-size:13px; color:#6f6f6f;">CERTIFICADOS DISPONIBLES</span>
                    <br>
                    <select id="certificadoSelect" style="width: 280px; padding: 5px;">
                        <option value="">-- Seleccione un certificado --</option>
                        ${opciones.join('')}
                    </select>
                </div>
                `
            });
            const width = 1050; // Ancho de la ventana
            const height = 435; // Alto de la ventana

            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            const select = document.getElementById("certificadoSelect");
            let previousValue = '';

            select.addEventListener("focus", function() {
                // Guardar el valor actual cuando el select recibe foco
                previousValue = this.value;
            });
            document.getElementById("certificadoSelect").addEventListener("change", function() {
                if (this.value) {
                    window.open(
                        this.value,
                        "_blank",
                        `width=${925},height=${880},top=${top},left=${left}`
                    );
                    // Restablecer al valor anterior después de un breve retraso
                    setTimeout(() => {
                        this.value = previousValue;
                    }, 100);
                }
            });

        } catch (error) {
            console.log("error", error)
        }
    }

    function sendPostEncrypt(idBien, idCobertura, senderName, email) {
        try {
        var dataToSend = {
        data: [idBien + "", idCobertura + "", senderName + "", email + ""],
        };
        var headers = {
        "Content-Type": "application/json",
        };
        var options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(dataToSend),
        };

        var response = https.post({
            url: _const.URLS.HUNTER_API_NETSUITE + "/CodificarString",
            body: options.body,
            headers: options.headers,
        });
        if (response && response.code === 200) {
            var responseBody = JSON.parse(response.body);
            return responseBody;
        } else {
            log.error(
            "HTTP Error",
            `Status Code: ${response.code}, Response Body: ${response.body}`
            );
            return false
        }
        } catch (error) {
        log.debug("ERROR sendPostEncrypt", error);
        console.log(error)
        return false
        }
    }
    return{ fieldChanged, pageInit }
});