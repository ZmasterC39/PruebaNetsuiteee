/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime', 'N/search', 'N/file', 'N/https', './umploadparts.js'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{file} file
 * @param{https} https
 */
    (log, record, runtime, search, file, https, multiPartUpload_1) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */

        const FOLDER_NAME = 'archivosAnulacion'
        const RECORD_COLLELATIVO_ANULACION = 'customrecord_pe_anu_correlativo';
        const RECORD_PE_EI_LOG_OF_DOCUMENTS = 'customrecord_pe_ei_log_documents';
        const CUSTOM_RECORD_EI_ENABLED_FEATURES = 'customrecord_pe_ei_enable_features';
        const ESTADO_ENVIO_ENVIADO = 7;
        const ESTADO_ENVIO_ENVIANDO = 10
        let recordId;
        let subsidiary;
        var url_ticket = '';
        var url_document = '';
        const STATUS_ERROR = false;
        const beforeLoad = (scriptContext) => { }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            if (scriptContext.type === scriptContext.UserEventType.EDIT &&
                typeof scriptContext.newRecord.getValue({ fieldId: 'void' }) != 'undefined'
            ) {
                var newRecord = scriptContext.newRecord;
                newRecord.setValue({
                    fieldId: 'custbody_pe_ei_anulacion_json_request',
                    value: ''
                });
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let send = new Array();
            log.debug('Init', 'Init');
            /*log.debug('typeof scriptContext.newRecord.getValue({ fieldId: void })', typeof scriptContext.newRecord.getValue({ fieldId: 'void' }))
            log.debug('scriptContext.UserEventType.EDIT', scriptContext.UserEventType.EDIT)
            log.debug('scriptContext.newRecord.getValue({ fieldId: custbody_pe_ei_anulacion_json_request }).length', scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_anulacion_json_request' }).length)
            log.debug('scriptContext.newRecord.getValue({ fieldId: custbody_psg_ei_status })', scriptContext.newRecord.getValue({ fieldId: 'custbody_psg_ei_status' }))*/
            try {
                //<I> rhuaccha: 2024-08-12
                /*log.debug({
                    title: 'Parametros de anulación',
                    details: JSON.stringify({
                        internalId: scriptContext.newRecord.id,
                        typeMode: scriptContext.type,
                        voided: scriptContext.newRecord.getValue({ fieldId: 'void' }),
                        request: scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_anulacion_json_request' }),
                        xml: scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_xml_res' }),
                        cdr: scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_cdr_res' }),
                        pdf: scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_pdf' })
                    })
                });*/
                let details = getTransactionDetails(scriptContext.newRecord.id);
                // log.debug('Detalle por Lookup' , JSON.stringify(details));
                if (details.status === false) {
                    log.debug({
                        title: 'No se recupero el detalle',
                        details: result.message
                    });
                }
                //<F> rhuaccha: 2024-08-12

                //if (scriptContext.type === scriptContext.UserEventType.EDIT && typeof scriptContext.newRecord.getValue({ fieldId: 'void' }) != 'undefined' && scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_anulacion_json_request' }).length == 0 && scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_xml_res' }).length > 0 && scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_cdr_res' }).length > 0 && scriptContext.newRecord.getValue({ fieldId: 'custbody_pe_ei_printed_pdf' }).length > 0) {
               if (scriptContext.type === scriptContext.UserEventType.EDIT &
                    //scriptContext.newRecord.id === 119482 && //Para pruebas locales
                    typeof scriptContext.newRecord.getValue({ fieldId: 'void' }) != 'undefined' &&
                    // details.data.jsonAnulacion.length == 0 && //Comentado por JChaveza 2025-01-29
                    details.data.xmlResponse.length > 0 &&
                    details.data.cdrResponse.length > 0 &&
                    details.data.pdfResponse.length > 0
                ) {
                    const objRecord = scriptContext.oldRecord;
                    recordId = objRecord.id;
                    log.debug('recordId', recordId);

                    let searchLoad = search.create({
                        type: "transaction",
                        settings: [{ "name": "consolidationtype", "value": "NONE" }],
                        filters:
                            [
                                ["type", "anyof", "CustInvc", "CustCred"],
                                "AND",
                                ["internalid", "anyof", recordId],
                                "AND",
                                ["mainline", "is", "T"],
                                "AND",
                                ["taxline", "is", "F"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "formulatext", formula: "'2.0'", label: "0 UBLVersionID" }),
                                search.createColumn({ name: "formulatext", formula: "'1.1'", label: "1 CustomizationID" }),
                                search.createColumn({ name: "formulatext", formula: "CASE {custbody_pe_document_type.custrecord_pe_code_document_type} WHEN '01' THEN 'RA' WHEN '03' THEN 'RC' ELSE 'NA' END", label: "2 ID" }),
                                search.createColumn({ name: "trandate", label: "3 ReferenceDate" }),
                                search.createColumn({ name: "custbody_pe_document_type", label: "4 DocumentType" }),
                                search.createColumn({ name: "formulatext", formula: "'IDSignature'", label: "5 ID" }),
                                search.createColumn({ name: "taxidnum", join: "subsidiary", label: "6 PartyIdentification" }),
                                search.createColumn({ name: "subsidiarynohierarchy", label: "7 PartyName" }),
                                search.createColumn({ name: "formulatext", formula: "'IDSignature'", label: "8 URI" }),
                                search.createColumn({ name: "taxidnum", join: "subsidiary", label: "9 CustomerAssignedAccountID" }),
                                search.createColumn({ name: "formulatext", formula: "'6'", label: "10 AdditionalAccountID" }),
                                search.createColumn({ name: "zip", join: "subsidiary", label: "11 ID" }),
                                search.createColumn({ name: "address1", join: "subsidiary", label: "12 StreetName" }),
                                search.createColumn({ name: "city", join: "subsidiary", label: "13 CityName" }),
                                search.createColumn({ name: "country", join: "subsidiary", label: "14 Country" }),
                                search.createColumn({ name: "subsidiarynohierarchy", label: "15 RegistrationName" }),
                                search.createColumn({ name: "formulatext", formula: "'1'", label: "16 LineID" }),
                                search.createColumn({ name: "custrecord_pe_code_document_type", join: "CUSTBODY_PE_DOCUMENT_TYPE", label: "17 DocumentTypeCode" }),
                                search.createColumn({ name: "custrecord_pe_serie_impresion", join: "CUSTBODY_PE_SERIE", label: "18 DocumentSerialID" }),
                                search.createColumn({ name: "custbody_pe_number", label: "19 DocumentNumberID" }),
                                search.createColumn({ name: "memomain", label: "20 VoidReasonDescription" }),

                                search.createColumn({ name: "total", label: "21 Importe Total" }),
                                search.createColumn({ name: "currency", label: "22 Moneda" }),
                                search.createColumn({ name: "exchangerate", label: "23 Tipo de Cambio" }),
                                search.createColumn({ name: "custentity_pe_code_document_type", join: "customer", label: "24 DocumentTypeCode" }),
                                search.createColumn({ name: "custentity_pe_document_number", join: "customer", label: "25 DocumentTypeCode" }),
                                search.createColumn({ name: "subsidiary", label: "26 subsidiary" }),
                            ]
                    });
                    let searchResultCount = searchLoad.runPaged().count;
                    log.debug("transactionSearchObj result count", searchResultCount);
                    const searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
                    log.debug("transactionSearchObj result run", searchResult);
                    let dates = getDateFormatNow();
                    subsidiary = searchResult[0].getValue(searchLoad.columns[7]);
                    let identificadorDocumento = `${searchResult[0].getValue(searchLoad.columns[2])}-${dates.dateFormatID}-${getCorrelativoAnulacion(dates.dateFormatID, searchResult[0].getValue(searchLoad.columns[4]), searchResult[0].getValue(searchLoad.columns[26]))}`
                    log.debug("identificadorDocumento", identificadorDocumento);
                    let addressSubsidiary = getAddressSubsidiary(subsidiary);
                    let voidMessage = 'Anulación'; //<I> rhuaccha: 2024-08-26

                    var key = 'NA';
                    var tipoDocumento = searchResult[0].getValue(searchLoad.columns[17]);
                    var tc = searchResult[0].getValue(searchLoad.columns[23]);
                    if (tipoDocumento === '01') { //Factura,Factura de venta
                        key = 'VoidedDocuments';
                    } else if (tipoDocumento === '03') { //Boleta de Venta
                        key = 'SummaryDocuments';
                    }
                    var keyLine = key + 'Line';

                    let trama = {
                        "_D": "urn:sunat:names:specification:ubl:peru:schema:xsd:" + key + "-1",
                        "_A": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
                        "_B": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
                        "_E": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
                        "_SUNAT": "urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1",
                        [key]: [
                            {
                                "UBLVersionID": [
                                    {
                                        "_": searchResult[0].getValue(searchLoad.columns[0])
                                    }
                                ],
                                "CustomizationID": [
                                    {
                                        "_": searchResult[0].getValue(searchLoad.columns[1])
                                    }
                                ],
                                "ID": [
                                    {
                                        "_": identificadorDocumento
                                    }
                                ],
                                "ReferenceDate": [
                                    {
                                        "_": getDateFormat(searchResult[0].getValue(searchLoad.columns[3]))
                                    }
                                ],
                                "IssueDate": [
                                    {
                                        "_": dates.dateFormatIssueDate
                                    }
                                ],
                                "Signature": [
                                    {
                                        "ID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[5])
                                            }
                                        ],
                                        "SignatoryParty": [
                                            {
                                                "PartyIdentification": [
                                                    {
                                                        "ID": [
                                                            {
                                                                "_": searchResult[0].getValue(searchLoad.columns[6])
                                                            }
                                                        ]
                                                    }
                                                ],
                                                "PartyName": [
                                                    {
                                                        "Name": [
                                                            {
                                                                "_": searchResult[0].getText(searchLoad.columns[7])
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ],
                                        "DigitalSignatureAttachment": [
                                            {
                                                "ExternalReference": [
                                                    {
                                                        "URI": [
                                                            {
                                                                "_": searchResult[0].getValue(searchLoad.columns[8])
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ],
                                "AccountingSupplierParty": [
                                    {
                                        "CustomerAssignedAccountID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[9])
                                            }
                                        ],
                                        "AdditionalAccountID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[10])
                                            }
                                        ],
                                        "Party": [
                                            {
                                                "PostalAddress": [
                                                    {
                                                        "ID": [
                                                            {
                                                                "_": addressSubsidiary.codUbigeo
                                                            }
                                                        ],
                                                        "StreetName": [
                                                            {
                                                                "_": searchResult[0].getValue(searchLoad.columns[12])
                                                            }
                                                        ],
                                                        "CityName": [
                                                            {
                                                                "_": searchResult[0].getValue(searchLoad.columns[13])
                                                            }
                                                        ],
                                                        "CountrySubentity": [
                                                            {
                                                                "_": addressSubsidiary.departamento
                                                            }
                                                        ],
                                                        "District": [
                                                            {
                                                                "_": addressSubsidiary.distrito
                                                            }
                                                        ],
                                                        "Country": [
                                                            {
                                                                "IdentificationCode": [
                                                                    {
                                                                        "_": searchResult[0].getValue(searchLoad.columns[14])
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ],
                                                "PartyLegalEntity": [
                                                    {
                                                        "RegistrationName": [
                                                            {
                                                                "_": searchResult[0].getText(searchLoad.columns[15])
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ],
                                [keyLine]: [
                                    {
                                        "LineID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[16])
                                            }
                                        ],
                                        "DocumentTypeCode": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[17])
                                            }
                                        ],
                                        "DocumentSerialID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[18])
                                            }
                                        ],
                                        "DocumentNumberID": [
                                            {
                                                "_": searchResult[0].getValue(searchLoad.columns[19])
                                            }
                                        ],
                                        "VoidReasonDescription": [
                                            {
                                                // "_": searchResult[0].getValue(searchLoad.columns[20])
                                                "_": voidMessage //<I> rhuaccha: 2024-08-26
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }

                    if (tipoDocumento === '03') { //Boleta de Venta

                        var lineCount = objRecord.getLineCount({ sublistId: 'item' });
                        var totImporteBruto = 0;
                        var totImpuestos = 0;
                        var totImporte = 0;

                        //Halla totales
                        for (var i = 0; i < lineCount; i++) {
                            let importeBrutoLine = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: i });
                            totImporteBruto += parseFloat(importeBrutoLine || 0);
                            //--
                            let impuestosLine = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: i });
                            totImpuestos += parseFloat(impuestosLine || 0);
                            //--
                            let importeLine = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
                            totImporte += parseFloat(importeLine || 0);
                        }
                        totImporteBruto = Number(totImporteBruto).toFixed(2);
                        totImpuestos = Number(totImpuestos).toFixed(2);
                        totImporte = Number(totImporte).toFixed(2);

                        //Extrae datos por filas - Completar lógica*
                        var taxCode = false;
                        var afecIgv = false;
                        var tax = 0;
                        var freeOperation = objRecord.getValue({ fieldId: 'custbody_pe_free_operation' });

                        // Borrar el contenido del nodo `keyLine`
                        trama[key][0][keyLine] = [];


                        //Reset
                        taxCode = false;
                        afecIgv = false;
                        tax = 0;

                        taxCode = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'taxcode_display', line: 0 });
                        log.debug('freeOperation', freeOperation);
                        log.debug('taxCode', taxCode);
                        if (freeOperation) {
                            taxCode = '05'; //Gratuito
                            afecIgv = '1000'
                        } else if (taxCode) {


                            if (taxCode === 'IGV_PE:S-PE') {
                                taxCode = '01';
                                afecIgv = '1000'
                            } else if (taxCode === 'E-PE') {
                                taxCode = '02';
                            } else if (taxCode === 'Inaf-PE') {
                                taxCode = '03';
                            } else if (taxCode === 'X-PE') {
                                taxCode = '04';
                            }
                        }
                        //--                            

                        tax = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: 0 });
                        tax = Number(tax).toFixed(2);

                        //Generamos nodo SummaryDocumentsLine dinamicamente



                        //End for
                        trama[key][0][keyLine].push({
                            "LineID": [
                                {
                                    "_": 1
                                }
                            ],
                            "DocumentTypeCode": [
                                {
                                    "_": searchResult[0].getValue(searchLoad.columns[17])
                                }
                            ],
                            "ID": [
                                {
                                    "_": searchResult[0].getValue(searchLoad.columns[18]) + '-' + searchResult[0].getValue(searchLoad.columns[19])
                                }
                            ],
                            "AccountingCustomerParty": [
                                {
                                    "CustomerAssignedAccountID": [
                                        {
                                            "_": searchResult[0].getValue(searchLoad.columns[25])
                                        }
                                    ],
                                    "AdditionalAccountID": [
                                        {
                                            "_": searchResult[0].getValue(searchLoad.columns[24])
                                        }
                                    ]
                                }
                            ],
                            "Status": [
                                {
                                    "ConditionCode": [
                                        {
                                            "_": "3"//Anulación
                                        }
                                    ]
                                }
                            ],
                            "TotalAmount": [
                                {
                                    "_": freeOperation ? '0.00' : totImporteBruto,
                                    "currencyID": searchResult[0].getText(searchLoad.columns[22])
                                }
                            ],
                            "BillingPayment": [
                                {
                                    "PaidAmount": [
                                        {
                                            "_": totImporte,
                                            "currencyID": searchResult[0].getText(searchLoad.columns[22])
                                        }
                                    ],
                                    "InstructionID": [
                                        {
                                            "_": taxCode
                                        }
                                    ]
                                }
                            ],
                            "TaxTotal": [
                                {
                                    "TaxAmount": [
                                        {
                                            "_": freeOperation ? '0.00' : totImpuestos,//Total de impuestos
                                            "currencyID": searchResult[0].getText(searchLoad.columns[22])
                                        }
                                    ],
                                    "TaxSubtotal": [
                                        {
                                            "TaxAmount": [
                                                {
                                                    "_": freeOperation ? '0.00' : totImpuestos,
                                                    "currencyID": searchResult[0].getText(searchLoad.columns[22]),
                                                }
                                            ],
                                            "TaxCategory": [
                                                {
                                                    "TaxScheme": [
                                                        {
                                                            "ID": [
                                                                {
                                                                    "_": afecIgv,

                                                                }
                                                            ],
                                                            "Name": [
                                                                {
                                                                    "_": 'IGV'
                                                                }
                                                            ],
                                                            "TaxTypeCode": [
                                                                {
                                                                    "_": 'VAT'
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ],
                                }
                            ]
                        });

                    }//End if Boleta


                    log.debug("transactionSearchObj JSON", trama);
                    let filename = `${searchResult[0].getValue(searchLoad.columns[6])}-${identificadorDocumento}`
                    let archivoAnulacion = saveJson(trama, filename);
                    log.debug("archivoAnulacion JSON", archivoAnulacion);
                    let updateTransaction = record.submitFields({ type: objRecord.type, id: recordId, values: { custbody_pe_ei_anulacion_json_request: archivoAnulacion } })
                    log.debug('updateTransaction', updateTransaction);

                    //*BLOQUE DE ENVIO DE DOCUMENTO
                    var internalId = objRecord.id;
                    var userId = runtime.getCurrentUser().id;
                    var tranType = objRecord.type;
                    var array = [internalId, userId, tranType];
                    var getcredentials = getCredentials(array);
                    log.debug('getcredentials', getcredentials);
                    url_document = getcredentials.wsdocument;


                    log.debug('getcredentials', getcredentials);
                    var headers1 = new Array();
                    headers1['Accept'] = '*/*';
                    headers1['Content-Type'] = 'application/json';
                    headers1['Authorization'] = 'Basic Y2xpZW50OnNlY3JldA==';

                    var respAsset = https.post({
                        url: getcredentials.wsurl + "?username=" + getcredentials.username + "&password=" + getcredentials.password + "&grant_type=password",
                        headers: headers1
                    });


                    let reponse = JSON.parse(respAsset.body);
                    log.debug('reponse', reponse);
                    let tiket = '';
                    // let newtikect = getSentDocument(filename, reponse.access_token);
                    // newtikect = JSON.parse(newtikect.pdf);
                    // log.debug('track2', newtikect);
                    // if (newtikect.tickets) {
                    //     tiket = newtikect.tickets[0];
                    //     log.debug('tiket', tiket);
                    // } else {
                    send = sendDocument(filename, archivoAnulacion, reponse.access_token);
                    log.debug('send', send);
                    sleep(15000);
                    tiket = send.description;
                    log.debug('tiket', tiket);
                    logError(recordId, 'Documento de Anulación Enviado', tiket, subsidiary);
                    // }
                }
            } catch (error) {
                log.error('Error afterSubmit', error);
                logError(recordId, 'Error en Envío de Documento de Anulación', error, subsidiary);
            }
        }

        const getDateFormatNow = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return {
                dateFormatID: `${year}${month}${day}`,
                dateFormatIssueDate: `${year}-${month}-${day}`
            };
        }

        const getDateFormat = (fecha) => {
            const partes = fecha.split('/');
            const day = partes[0];
            const month = partes[1];
            const year = partes[2];
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        const getAddressSubsidiary = (subsidiary) => {
            var searchLoad = search.create({
                type: "subsidiary",
                filters:
                    [
                        ["internalid", "anyof", subsidiary]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_pe_cod_ubigeo", join: "address", label: "PE Cod Ubigeo" }),
                        search.createColumn({ name: "custrecord_pe_departamento", join: "address", label: "PE Departamento" }),
                        search.createColumn({ name: "custrecord_pe_distrito", join: "address", label: "PE Distrito" })
                    ]
            });
            const searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
            return {
                codUbigeo: searchResult[0].getValue(searchLoad.columns[0]),
                departamento: searchResult[0].getValue(searchLoad.columns[1]),
                distrito: searchResult[0].getValue(searchLoad.columns[2])
            }
        }

        const getCorrelativoAnulacion = (nameDateCorrelative, documentType, sub) => {
            let correlativo = 1;
            let searchLoad = search.create({
                type: RECORD_COLLELATIVO_ANULACION,
                filters:
                    [
                        ["custrecord_pe_namecorrelativo", "is", nameDateCorrelative],
                        "AND",
                        ["custrecord_tipo_documento", "anyof", documentType],
                        "AND",
                        ["custrecord_pe_anu_subsidiaria", "anyof", sub]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_number_correlativo", label: "Number" }),
                        'internalid'
                    ]
            });
            let searchResultCount = searchLoad.runPaged().count;
            log.debug("getCorrelativoAnulacion result count", searchResultCount);
            if (searchResultCount > 0) {
                const searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
                correlativo = parseInt(searchResult[0].getValue(searchLoad.columns[0])) + 1;
                record.submitFields({ type: RECORD_COLLELATIVO_ANULACION, id: searchResult[0].getValue(searchLoad.columns[1]), values: { custrecord_number_correlativo: correlativo } })
            } else {
                let recordCreate = record.create({ type: RECORD_COLLELATIVO_ANULACION, isDynamic: true });
                recordCreate.setValue('custrecord_pe_namecorrelativo', nameDateCorrelative);
                recordCreate.setValue('custrecord_number_correlativo', correlativo);
                recordCreate.setValue('custrecord_tipo_documento', documentType);
                recordCreate.setValue('custrecord_pe_anu_subsidiaria', sub);

                recordCreate.save();
            }

            return correlativo;
        }

        const getFolderId = () => {
            let folderid;
            let folderSearchObj = search.create({
                type: "folder",
                filters: [["name", "is", FOLDER_NAME]],
                columns: [search.createColumn({ name: "internalid", label: "Internal ID" })]
            });
            let searchResultCount = folderSearchObj.runPaged().count;
            // log.debug("folderSearchObj result count", searchResultCount);
            folderSearchObj.run().each((result) => {
                folderid = result.getValue({ name: "internalid", label: "Internal ID" });
            });
            return folderid;
        }

        const saveJson = (contents, nombre) => {
            //let name = new Date();
            let fileObj = file.create({
                name: `${nombre}.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: getFolderId(FOLDER_NAME),
                isOnline: false
            });
            return fileObj.save();
        }

        const logError = (internalId, docStatus, response, subsidiary) => {
            let logError = record.create({ type: RECORD_PE_EI_LOG_OF_DOCUMENTS });
            logError.setValue('custrecord_pe_ei_log_related_transact_pe', internalId);
            logError.setValue('custrecord_pe_ei_log_subsidiary_pe', subsidiary);
            logError.setValue('custrecord_pe_ei_log_employee_pe', runtime.getCurrentUser().id);
            logError.setValue('custrecord_pe_ei_log_status_pe', docStatus);
            logError.setValue('custrecord_pe_ei_log_response_pe', JSON.stringify(response));
            logError.save();
        }
        function getCredentials(array) {
            try {
                var accountSearch = search.create({
                    type: array[2],
                    filters: [
                        search.createFilter({
                            name: "internalid", operator: search.Operator.IS, values: [array[0]]
                        })
                    ],
                    columns: ["subsidiary"]
                });
                var searchResult = accountSearch.run().getRange({ start: 0, end: 1 });

                var credentials = search.create({
                    type: CUSTOM_RECORD_EI_ENABLED_FEATURES,
                    filters: [search.createFilter({ name: "custrecord_pe_ei_subsidiary", operator: search.Operator.IS, values: [searchResult[0].getValue({ name: "subsidiary" })] })],
                    columns: [
                        "internalid",
                        "custrecord_pe_ei_user",
                        "custrecord_pe_ei_password",
                        "custrecord_pe_ei_employ_copy",
                        "custrecord_pe_ei_url_ws",
                        "custrecord_pe_ei_url_get_ticket",
                        "custrecord_pe_ei_url_post_document",
                        "custrecord_pe_ei_url_get_pdf",
                        "custrecord_pe_ei_url_get_xml",
                        "custrecord_pe_ei_url_get_cdr"
                    ]
                });

                var searchResults = credentials.run().getRange({ start: 0, end: 1 });
                // var credentials = search.lookupFields({
                //     type: CUSTOM_RECORD_EI_ENABLED_FEATURES,
                //     id: searchResults[0].getValue({ name: "internalid" }),
                //     columns: ['custrecord_pe_ei_url_ws', 'custrecord_pe_ei_user', 'custrecord_pe_ei_password', 'custrecord_pe_ei_employ_copy']
                // });

                return {
                    username: searchResults[0].getValue({ name: "custrecord_pe_ei_user" }),
                    password: searchResults[0].getValue({ name: "custrecord_pe_ei_password" }),
                    wsurl: searchResults[0].getValue({ name: "custrecord_pe_ei_url_ws" }),
                    wsticket: searchResults[0].getValue({ name: "custrecord_pe_ei_url_get_ticket" }),
                    wsdocument: searchResults[0].getValue({ name: "custrecord_pe_ei_url_post_document" }),
                    wspdf: searchResults[0].getValue({ name: "custrecord_pe_ei_url_get_pdf" }),
                    wsxml: searchResults[0].getValue({ name: "custrecord_pe_ei_url_get_xml" }),
                    wscdr: searchResults[0].getValue({ name: "custrecord_pe_ei_url_get_cdr" })
                }
            } catch (e) {
                //logError(array[0], array[1], 'Error-openCredentials', e.message);
            }
        }



        function normalizeCredentials(credentials) {
            var normalizedCredentials = {};
            Object.keys(credentials).forEach(function (key) {
                // Convertir a camelCase los nombres de cada campo
                var normalizedKey = key
                    .toLowerCase()
                    .split(' ')
                    .map(function (word, index) {
                        return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
                    })
                    .join('');
                normalizedCredentials[normalizedKey] = credentials[key];
            });

            return normalizedCredentials;
        }

        const getSentDocument = (documento, token) => {
            var headers1 = new Array();
            try {

                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: url_ticket + documento,
                    body: '',
                    headers: headers1
                });
                //var body = JSON.parse(response.body);
                //logStatus(internalId, 'Debug3 ' + JSON.stringify(pdf));
                return {
                    pdf: response.body
                }
            } catch (error) {
                return error;
                //logError(array[0], array[1], 'Error-getDocumentPDF', JSON.stringify(e));
            }
        }

        const sendDocument = (filename, request, access_token) => {
            try {
                var files = [
                    { name: filename, value: file.load({ id: request }) } // file cabinet ids; you can use dynamic files
                ];
                var headers = new Array();
                headers['Accept'] = '*/*';
                headers['Authorization'] = 'Bearer ' + access_token;
                var resp = multiPartUpload_1.uploadParts(url_document, headers, files);
                resp = JSON.parse(resp.body);
                return resp;
            } catch (error) {
                log.debug('Error-sendDocument', sendDocument)
                //logError(array[0], array[1], 'Error-sendDocument', JSON.stringify(e));
            }
        }

        const sleep = (milliseconds) => {
            var start = new Date().getTime();
            for (var i = 0; i < 1e7; i++) {
                if ((new Date().getTime() - start) > milliseconds) {
                    break;
                }
            }
        }

        //<I> rhuaccha: 2024-08-12
        const getTransactionDetails = (internalId) => {
            let response = {
                status: false,
                message: 'INIT',
                data: {}
            };
            try {
                let lookup = search.lookupFields({
                    type: search.Type.TRANSACTION,
                    id: internalId,
                    columns: [
                        'custbody_pe_ei_anulacion_json_request',
                        'custbody_pe_ei_printed_xml_res',
                        'custbody_pe_ei_printed_cdr_res',
                        'custbody_pe_ei_printed_pdf'
                    ]
                });

                if (lookup) {
                    response.status = true;
                    response.message = 'Proceso completado correctamente';

                    response.data = {
                        jsonAnulacion: (lookup.custbody_pe_ei_anulacion_json_request && lookup.custbody_pe_ei_anulacion_json_request.length > 0)
                            ? lookup.custbody_pe_ei_anulacion_json_request[0].value : '',

                        xmlResponse: (lookup.custbody_pe_ei_printed_xml_res && lookup.custbody_pe_ei_printed_xml_res.length > 0)
                            ? lookup.custbody_pe_ei_printed_xml_res[0].value : '',

                        cdrResponse: (lookup.custbody_pe_ei_printed_cdr_res && lookup.custbody_pe_ei_printed_cdr_res.length > 0)
                            ? lookup.custbody_pe_ei_printed_cdr_res[0].value : '',

                        pdfResponse: (lookup.custbody_pe_ei_printed_pdf && lookup.custbody_pe_ei_printed_pdf.length > 0)
                            ? lookup.custbody_pe_ei_printed_pdf[0].value : ''
                    };
                }
            } catch (error) {
                log.debug({
                    title: 'Error getTransactionDetails',
                    details: 'Error : ' + error.message
                });
                response.status = false;
                response.message = 'Error : ' + error.message;
            }
            return response;
        }
        //<F> rhuaccha: 2024-08-12

        return { /*beforeLoad,*/ beforeSubmit, afterSubmit }

    });