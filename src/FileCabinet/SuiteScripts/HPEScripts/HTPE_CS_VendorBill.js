/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog'], (currentRecord, dialog) => {

    // =========================================================================
    // ESTRATEGIA: Monitoreo Asíncrono Inmediato (Fuera del ciclo estricto de NetSuite)
    // =========================================================================
    const ejecutarEscuchaPersistente = () => {
        const isPending = localStorage.getItem('sunat_xml_pending_hunter');
        
        if (isPending === 'true') {
            let intentos = 0;
            const maxIntentos = 20; // 10 segundos de escucha activa (500ms * 20)

            const monitorFormulario = setInterval(() => {
                intentos++;
                try {
                    const record = currentRecord.get();
                    if (!record) return;

                    const currentVendor = record.getValue({ fieldId: 'entity' });
                    const datosSunat = JSON.parse(localStorage.getItem('sunat_xml_data_hunter'));

                    if (!datosSunat) {
                        clearInterval(monitorFormulario);
                        return;
                    }

                    // En cuanto el proveedor de la URL sea pintado con éxito en el DOM por NetSuite
                    if (currentVendor && currentVendor == datosSunat.vendorId) {
                        
                        clearInterval(monitorFormulario);
                        localStorage.removeItem('sunat_xml_pending_hunter');

                        // Espera de estabilidad para asegurar que el formulario responda a escrituras
                        setTimeout(() => {
                            try {
                                // 1. Asignamos la Fecha
                                if (datosSunat.dateStr) {
                                    const parts = datosSunat.dateStr.split('-');
                                    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                                    record.setValue({ fieldId: 'trandate', value: dateObj });
                                }

                                // 2. Asignamos la Moneda
                                if (datosSunat.monedaId) {
                                    record.setValue({ fieldId: 'currency', value: datosSunat.monedaId });
                                }

                                // 3. Asignamos el Tipo de Documento SUNAT (Factura = "50")
                                if (datosSunat.tipo_doc) {
                                    record.setValue({ fieldId: 'custbody_pe_document_type', value: datosSunat.tipo_doc });
                                }

                                // 4. Fijamos de forma persistente la Serie y el Número
                                record.setValue({ fieldId: 'custbody_pe_serie_cxp', value: datosSunat.serie, ignoreFieldChange: true });
                                record.setValue({ fieldId: 'custbody_pe_number', value: datosSunat.numero, ignoreFieldChange: true });

                                // Limpieza total de la memoria del navegador
                                localStorage.removeItem('sunat_xml_data_hunter');

                                dialog.alert({
                                    title: 'XML Procesado con Éxito',
                                    message: 'Los datos de la SUNAT se han acoplado correctamente a la cabecera.'
                                });

                            } catch (errorInyeccion) {
                                console.error('Error inyectando datos del XML:', errorInyeccion);
                            }
                        }, 500);
                    }
                } catch (e) {
                    console.log('Esperando inicialización del contexto de registro...');
                }

                if (intentos >= maxIntentos) {
                    clearInterval(monitorFormulario);
                    localStorage.removeItem('sunat_xml_pending_hunter');
                    console.warn('Se excedió el tiempo límite de espera del formulario.');
                }

            }, 500);
        }
    };

    // Lanzamos el demonio de inmediato en cuanto el archivo es interpretado por el navegador
    ejecutarEscuchaPersistente();

    const pageInit = (scriptContext) => {
        // Se mantiene expuesto por requerimiento estructural de NetSuite,
        // pero la lógica corre en paralelo para evitar bloqueos del ciclo de vida.
    };

    const abrirSuiteletXml = () => {
        try {
            const record = currentRecord.get();
            const suiteletUrl = record.getValue({ fieldId: 'custpage_suitelet_url_holder' });

            if (suiteletUrl) {
                window.open(suiteletUrl, 'Cargar XML SUNAT', 'width=700,height=500,resizable=yes,scrollbars=yes');
            } else {
                dialog.alert({
                    title: 'Error',
                    message: 'No se pudo recuperar la URL de redirección del Suitelet.'
                });
            }
        } catch (e) {
            console.error('Error al abrir la ventana emergente:', e);
        }
    };

    return {
        pageInit: pageInit,
        abrirSuiteletXml: abrirSuiteletXml
    };
});