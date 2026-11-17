/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NTitle Carga XML SUNAT
 */
define(['N/ui/serverWidget', 'N/file', 'N/xml', 'N/log', 'N/search'],
    (serverWidget, file, xml, log, search) => {

        // Define los Namespaces comunes de la SUNAT UBL 2.1
        const NAMESPACES = {
            'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
            'sac': 'urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1',
            'tns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', // Se ajusta dinámicamente
        };

        const RUC_FIELD_ID = 'vatregnumber'; // Generalmente 'vatregnumber' o 'custentity_pe_ruc'

        // -------------------------------------------------------------------------
        // --- Lógica de Extracción de Datos Comunes ---
        // -------------------------------------------------------------------------

        function selectValue(xmlDocument, xpathExpr) {
            try {
                let selectedNodes = xml.XPath.select({ node: xmlDocument, xpath: xpathExpr, namespaces: NAMESPACES });
                if (selectedNodes.length > 0) {
                    if (selectedNodes[0].nodeType === xml.NodeType.ATTRIBUTE) {
                        return selectedNodes[0].value;
                    }
                    return selectedNodes[0].textContent;
                }
            } catch (xpathError) {
                log.error('Error ejecutando XPath: ' + xpathExpr, xpathError.message);
            }
            return null;
        }

        function setDynamicNamespace(xmlDocument) {
            if (!xmlDocument || !xmlDocument.documentElement) return;
            
            let rootNodeName = xmlDocument.documentElement.nodeName || '';
            let rootName = rootNodeName.substring(rootNodeName.lastIndexOf(':') + 1); 

            let newTnsUri = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'; // Por defecto Invoice
            if (rootName === 'CreditNote') {
                newTnsUri = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';
            } else if (rootName === 'DebitNote') {
                newTnsUri = 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2';
            }

            NAMESPACES.tns = newTnsUri;
            log.audit('Namespace Dinámico Seteado', `Raíz: ${rootName} | URI: ${newTnsUri}`);
        }

        function extractSunatData(xmlDocument) {
            // Se prueban rutas absolutas e indexadas por si el XML viene con variaciones estructurales
            const fullDocId = selectValue(xmlDocument, '/tns:Invoice/cbc:ID') || 
                      selectValue(xmlDocument, '/tns:CreditNote/cbc:ID') || 
                      selectValue(xmlDocument, '/tns:DebitNote/cbc:ID') || 
                      selectValue(xmlDocument, '//*[local-name()="ID" and parent::*[local-name()="Invoice" or local-name()="CreditNote" or local-name()="DebitNote"]]') ||
                      selectValue(xmlDocument, '//*[local-name()="ID"]'); 

            const serie = fullDocId ? fullDocId.split('-')[0] : null;
            const numero = fullDocId ? fullDocId.split('-')[1] : null;            

            // 2. EXTRAER EL RUC DEL PROVEEDOR (EMISOR)
            const ruc = selectValue(xmlDocument, '//cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID') || 
                        selectValue(xmlDocument, '//*[local-name()="AccountingSupplierParty"]//*[local-name()="PartyIdentification"]/*[local-name()="ID"]');
    
            // 3. EXTRAER LA FECHA DE EMISIÓN
            const fechaEmisionStr = selectValue(xmlDocument, '//cbc:IssueDate') || 
                                    selectValue(xmlDocument, '//*[local-name()="IssueDate"]');

            // 4. EXTRAER EL IMPORTE TOTAL
            let importeTotalStr = selectValue(xmlDocument, '//cac:LegalMonetaryTotal/cbc:PayableAmount') || 
                                  selectValue(xmlDocument, '//cac:RequestedMonetaryTotal/cbc:PayableAmount') || // Para Notas de Crédito/Débito
                                  selectValue(xmlDocument, '//*[local-name()="PayableAmount"]');
    
             const importeTotal = importeTotalStr ? parseFloat(importeTotalStr) : 0;

             // 5. EXTRAER LA MONEDA ISO (PEN o USD) - ¡Aquí está la clave!
             // Primero intentamos leer el tag global de la cabecera (Forma más segura para SUNAT)
             let monedaIso = selectValue(xmlDocument, '//cbc:DocumentCurrencyCode') || 
                             selectValue(xmlDocument, '//*[local-name()="DocumentCurrencyCode"]');

             // Si no lo encuentra en la cabecera, lo extrae como atributo del monto total 
            if (!monedaIso) {
                monedaIso = selectValue(xmlDocument, '//cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID') || 
                            selectValue(xmlDocument, '//cac:RequestedMonetaryTotal/cbc:PayableAmount/@currencyID') ||
                            selectValue(xmlDocument, '//*[local-name()="PayableAmount"]/@currencyID');
            }

            log.audit('Campos', `RUC: ${ruc} | fullDocId: ${fullDocId} | serie: ${serie} | numero: ${numero} | fechaEmisionStr: ${fechaEmisionStr} | importeTotalStr ${importeTotalStr} | monedaIso: ${monedaIso}`);
      

            return {
                ruc: ruc ? ruc.trim() : null,
                fechaEmisionStr: fechaEmisionStr,
                importeTotal: importeTotal,
                monedaIso: monedaIso,
                serie: serie,
                numero: numero
            };
        }

        // -------------------------------------------------------------------------
        // --- Lógica del Suitelet ---
        // -------------------------------------------------------------------------

        function onRequest(scriptContext) {
            const request = scriptContext.request;
            const response = scriptContext.response;

            if (request.method === 'GET') {
                const form = serverWidget.createForm({ title: 'Cargar XML de Factura SUNAT' });
                
                form.addField({ id: 'custpage_recordtype', type: serverWidget.FieldType.TEXT, label: 'Record Type' })
                    .updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN })
                    .defaultValue = request.parameters.recordtype || 'vendorbill'; 
                
                const fileField = form.addField({ id: 'custpage_xml_file', type: serverWidget.FieldType.FILE, label: 'Seleccionar Archivo XML' });
                fileField.isMandatory = true;

                form.addSubmitButton({ label: 'Procesar XML' });
                response.writePage(form);

            } else if (request.method === 'POST') {
                let xmlFile = request.files.custpage_xml_file;

                if (!xmlFile) {
                     return response.write('Error: No se encontró el archivo subido.');
                }
                
                let fileId = null;
                let vendorId = null; 
                let parsedData = {};

                try {
                    // Guardado temporal
                    xmlFile.folder = -15; 
                    fileId = xmlFile.save();

                    const savedFile = file.load({ id: fileId });
                    let xmlContent = savedFile.getContents();

                    if (!xmlContent || xmlContent.trim().length === 0) {
                        throw new Error('El archivo XML está vacío.');
                    }

                    // 🔥 SANITIZACIÓN CRÍTICA DEL TEXTO XML 🔥
                    // Elimina cualquier caracter previo al inicio real del documento XML (quita el BOM de raíz y basura)
                    const xmlStartIndex = xmlContent.indexOf('<?xml');
                    if (xmlStartIndex > 0) {
                        xmlContent = xmlContent.substring(xmlStartIndex);
                    } else if (xmlStartIndex === -1 && xmlContent.indexOf('<') > 0) {
                        // Por si no trae declaración <?xml pero sí inicia con nodos
                        xmlContent = xmlContent.substring(xmlContent.indexOf('<'));
                    }

                    log.audit('XML Content Sanitizado', `Chars: ${xmlContent.length} | Start: ${xmlContent.substring(0, 60)}`);
                  
                    // Parsear el XML
                    const xmlDocument = xml.Parser.fromString({ text: xmlContent });

                    if (!xmlDocument || !xmlDocument.documentElement) {
                        throw new Error('NetSuite no pudo construir el árbol DOM del XML.');
                    }
      
                    setDynamicNamespace(xmlDocument);
                    parsedData = extractSunatData(xmlDocument);
                    
                    // Validar si pudimos extraer la información base
                    if (!parsedData.ruc) {
                        throw new Error('No se pudo extraer el RUC desde el XML. Verifica que sea un formato UBL válido de SUNAT.');
                    }

                    // Buscar Proveedor por RUC
                    vendorId = findVendorIdByRuc(parsedData.ruc);
                    if (!vendorId) {
                        throw new Error(`Proveedor no encontrado en NetSuite con el RUC: ${parsedData.ruc}`);
                    }

                    const currencyInternalId = findCurrencyIdByIso(parsedData.monedaIso);

                    log.audit(`SUNAT`, `vendorId: ${vendorId} | parsedData.fechaEmisionStr: ${parsedData.fechaEmisionStr} | total: ${parsedData.importeTotal} | currencyInternalId: ${currencyInternalId} | parsedData.serie: ${parsedData.serie} | parsedData.numero: ${parsedData.numero}`);

                    const payload = JSON.stringify({
                        vendorId: vendorId,
                        dateStr: parsedData.fechaEmisionStr,
                        total: parsedData.importeTotal,
                        monedaId: currencyInternalId,
                        tipo_doc: "50",
                        serie: parsedData.serie,
                        numero: parsedData.numero
                    });

                    log.audit(`JASON`, `payload: ${payload}`);
                    
 let clientScript = `
    <script>
        const PAYLOAD = ${payload};
        try {
            // 1. Guardamos la data en el almacenamiento local
            localStorage.setItem('sunat_xml_data_hunter', JSON.stringify(PAYLOAD));
            localStorage.setItem('sunat_xml_pending_hunter', 'true');
            
            const opener = window.opener;
            if (opener && !opener.closed) {
                // 2. Accedemos al objeto RequireJS de la ventana padre de NetSuite
                const nsCurrentRecord = opener.require('N/currentRecord');
                if (nsCurrentRecord) {
                    const parentRecord = nsCurrentRecord.get();
                    
                    // 3. Seteamos el proveedor directamente en la pantalla principal.
                    // Esto disparará de forma limpia los scripts de Hunter sin cambiar de URL.
                    parentRecord.setValue({
                        fieldId: 'entity',
                        value: PAYLOAD.vendorId,
                        ignoreFieldChange: false 
                    });
                }
            }
        } catch (e) {
            console.error('Error inyectando proveedor desde el Suitelet:', e);
        } finally {
            // Cerramos el pop-up del Suitelet
            window.close();
        }
    </script>
`;
                    
                    
                    safelyDeleteFile(fileId);
                    response.write(`<!DOCTYPE html><html><head><title>OK</title></head><body>${clientScript}</body></html>`);

                } catch (e) {
                    safelyDeleteFile(fileId);
                    log.error({ title: `Error de Procesamiento XML`, details: e.message, stack: e.stack });
                    
                    response.write(`
                        <h1>Error al Procesar XML</h1>
                        <p>Ocurrió un error de mapeo: <b>${e.message}</b></p>
                        <p><b>Información Capturada:</b></p>
                        <ul>
                            <li><b>RUC en XML:</b> ${parsedData.ruc || 'No detectado'}</li>
                            <li><b>Serie-Número:</b> ${parsedData.serie || ''}-${parsedData.numero || ''}</li>
                            <li><b>Moneda ISO:</b> ${parsedData.monedaIso || 'No detectada'}</li>
                        </ul>
                        <p>Asegúrate de que estás subiendo el archivo <b>.xml</b> extraído y que corresponda a una factura válida.</p>
                    `);
                }
            }
        }


      
        function safelyDeleteFile(id) {
            if (!id) return;
            try {
                file.delete({ id: id });
            } catch (err) {
                log.error('Error borrando archivo temporal ID: ' + id, err.message);
            }
        }

        function findVendorIdByRuc(ruc) {
             if (!ruc) return null;
             let vendorSearch = search.create({
                 type: search.Type.VENDOR,
                 filters: [
                     search.createFilter({ name: RUC_FIELD_ID, operator: search.Operator.IS, values: ruc })
                 ],
                 columns: ['internalid']
             });
             let searchResult = vendorSearch.run().getRange({ start: 0, end: 1 });
             return (searchResult && searchResult.length > 0) ? searchResult[0].id : null;
        }

        function findCurrencyIdByIso(isoCode) {
            if (!isoCode) return null;
            let currencySearch = search.create({
                type: search.Type.CURRENCY,
                filters: [
                    search.createFilter({ name: 'symbol', operator: search.Operator.IS, values: isoCode })
                ],
                columns: ['internalid']
            });
            let result = currencySearch.run().getRange({ start: 0, end: 1 });
            return (result && result.length > 0) ? result[0].id : null;
        }

        return {
            onRequest: onRequest
        };
});