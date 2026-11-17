/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/config', 'N/email', 'N/file', 'N/https', 'N/log', 'N/query', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/encode'],
    /**
 * @param{config} config
 * @param{email} email
 * @param{file} file
 * @param{https} https
 * @param{log} log
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */
    (config, email, file, https, log, query, record, runtime, search, task, encode) => {
        var script = runtime.getCurrentScript();
        var remainingUsage = script.getRemainingUsage();
        const URL_BASE = 'ose.efact.pe' //sb-" + URL_BASE + " pr: ose.efact.pe
        const FOLDERID = 1

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            let custbody_psg_ei_status = "8"; //Fallo de Envío
            var array = [13, 13, 'employee'];
            let getcredentials = openCredentials(array);
            log.debug('getcredentials', getcredentials);
            var headers1 = [];
            headers1['Accept'] = '*/*';
            headers1['Content-Type'] = 'application/json';
            headers1['Authorization'] = 'Basic Y2xpZW50OnNlY3JldA==';

            let sql = "SELECT COUNT(tr.id) as cantidad " +
                "FROM customrecord_psg_ei_audit_trail at " +
                "INNER JOIN transaction tr ON at.custrecord_psg_ei_audit_transaction= tr.id " +
                "WHERE tr.custbody_psg_ei_status = ? " +
                "AND INSTR(LOWER(at.custrecord_psg_ei_audit_details), LOWER('En proceso.')) > 0 " +
                "AND tr.custbody_pe_ei_recovery_confirmation IS NOT NULL"
            let results = query.runSuiteQL({ query: sql, params: [custbody_psg_ei_status] }).asMappedResults();
            log.debug('results[0].cantidad', results[0].cantidad);

            if (results[0].cantidad > 0) {
                let sql2 = "SELECT at.custrecord_psg_ei_audit_transaction, at.custrecord_psg_ei_audit_details, tr.custbody_pe_ei_recovery_confirmation " +
                    "FROM customrecord_psg_ei_audit_trail at " +
                    "INNER JOIN transaction tr ON at.custrecord_psg_ei_audit_transaction= tr.id " +
                    "WHERE tr.custbody_psg_ei_status = ? " +
                    "AND INSTR(LOWER(at.custrecord_psg_ei_audit_details), LOWER('En proceso.')) > 0 " +
                    "AND tr.custbody_pe_ei_recovery_confirmation IS NOT NULL"
                let results2 = query.runSuiteQL({ query: sql2, params: [custbody_psg_ei_status] }).asMappedResults();
                log.debug('results2', results2.length)
                for (let index = 0; index < results2.length; index++) {
                    const element = results2[index];
                    let internalId = element.custrecord_psg_ei_audit_transaction
                    var request = getIdentifyDocument(internalId);
                    log.debug('request', request)
                    var respAsset = https.post({
                        url: "https://" + URL_BASE + "/api-efact-ose/oauth/token?username=" + getcredentials.username + "&password=" + getcredentials.password + "&grant_type=password",
                        headers: headers1
                    });
                    var reponse = JSON.parse(respAsset.body);
                    log.debug('reponse', reponse);
                    var tiket = '';
                    var newtikect = getSentDocument(request.filename, reponse.access_token);
                    newtikect = JSON.parse(newtikect.pdf);
                    log.debug('newtikect', newtikect);
                    if (newtikect.tickets) {
                        tiket = newtikect.tickets[0];
                        var getpdf = getDocumentPDF(tiket, reponse.access_token);
                        log.debug('getpdf', getpdf);
                        var filepdf = generateFilePDF(request.filename, getpdf.pdf);
                    }
                    log.debug('filepdf', filepdf)

                    if (filepdf) {
                        var estatus = recuperarArchivos(tiket, reponse.access_token, request.filename, internalId, request.recordType, 1);
                        log.debug('status', estatus)
                    }
                }
            }
        }


        function getIdentifyDocument(internalid) {

            var searchLoad = search.create({
                type: "transaction",
                filters:
                    [
                        [["type", "anyof", "CustCred"], "OR", ["type", "anyof", "CustInvc"], "OR", ["type", "anyof", "ItemShip"], "OR", ["type", "anyof", "VendCred"], "OR", ["type", "anyof", "CashSale"]],
                        "AND",
                        ["internalid", "anyof", internalid]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_pe_code_document_type", join: "custbody_pe_document_type", label: "document" }),
                        search.createColumn({ name: "formulatext", formula: "CONCAT({custbody_pe_serie}, CONCAT('-', {custbody_pe_number}))", label: "numeracion" }),
                        search.createColumn({ name: "formulanumeric", formula: "TO_NUMBER({custbody_pe_number})", label: "correlativo" }),
                        search.createColumn({ name: "custbody_pe_serie", label: "serie" }),
                        search.createColumn({ name: "custbody_pe_serie_cxp", label: "serie2" }),
                        search.createColumn({ name: "internalid", join: "customer", label: "emailrec" }),
                        search.createColumn({ name: "legalname", join: "subsidiary", label: "emisname" }),
                        search.createColumn({ name: "custbody_pe_document_type", label: "typedoc" }),
                        search.createColumn({ name: "taxidnum", join: "subsidiary", label: "rucemi" }),
                        search.createColumn({ name: "custbody_pe_ei_printed_xml_req", label: "request" }),
                        search.createColumn({ name: "custrecord_pe_serie_impresion", join: "CUSTBODY_PE_SERIE", label: "SerieImpresion" }),
                        search.createColumn({ name: "recordType", label: "TipoRegistro" })
                    ]
            });

            var searchResult = searchLoad.run().getRange({ start: 0, end: 1 });
            var typedoccode = searchResult[0].getValue(searchLoad.columns[0]);
            var numbering = searchResult[0].getValue(searchLoad.columns[1]);
            var correlativo = searchResult[0].getValue(searchLoad.columns[2]);
            // var serie = searchResult[0].getText({ name: "custbody_pe_serie", label: "serie" });
            var serie = searchResult[0].getValue({ name: "custrecord_pe_serie_impresion", join: "CUSTBODY_PE_SERIE", label: "SerieImpresion" });
            if (!serie) {
                serie = searchResult[0].getValue({ name: "custbody_pe_serie_cxp", label: "serie2" });
            }
            var emailrec = searchResult[0].getValue({ name: "internalid", join: "customer", label: "emailrec" });
            var emisname = searchResult[0].getValue({ name: "legalname", join: "subsidiary", label: "emisname" });
            var typedoc = searchResult[0].getText({ name: "custbody_pe_document_type", label: "typedoc" });
            var rucemi = searchResult[0].getValue({ name: "taxidnum", join: "subsidiary", label: "rucemi" });
            var request = searchResult[0].getValue({ name: "custbody_pe_ei_printed_xml_req", label: "request" });
            var recordType = searchResult[0].getValue({ name: "recordType", label: "TipoRegistro" });
            var filename = rucemi + '-' + typedoccode + '-' + serie + '-' + correlativo;

            //logStatus(documentid, JSON.parse(request));
            return {
                typedoccode: typedoccode,
                numbering: numbering,
                correlativo: correlativo,
                serie: serie,
                emailrec: emailrec,
                emisname: emisname,
                typedoc: typedoc,
                filename: filename,
                request: request,
                recordType: recordType
            }

        }

        function openCredentials(array) {
            try {
                var accountSearch = search.create({
                    type: array[2],
                    filters: [
                        search.createFilter({ name: "internalid", operator: search.Operator.IS, values: [array[0]] })
                    ],
                    columns: ["subsidiary"]
                });

                var searchResult = accountSearch.run().getRange({ start: 0, end: 1 });

                var accountSearchs = search.create({
                    type: 'customrecord_pe_ei_enable_features',
                    filters: [
                        search.createFilter({ name: "custrecord_pe_ei_subsidiary", operator: search.Operator.IS, values: [searchResult[0].getValue({ name: "subsidiary" })] })
                    ],
                    columns: ["internalid"]
                });

                var searchResults = accountSearchs.run().getRange({ start: 0, end: 1 });

                var credentials = search.lookupFields({
                    type: 'customrecord_pe_ei_enable_features',
                    id: searchResults[0].getValue({ name: "internalid" }),
                    columns: ['custrecord_pe_ei_url_ws', 'custrecord_pe_ei_user', 'custrecord_pe_ei_password', 'custrecord_pe_ei_employ_copy']
                });

                return {
                    wsurl: credentials.custrecord_pe_ei_url_ws,
                    username: credentials.custrecord_pe_ei_user,
                    password: credentials.custrecord_pe_ei_password
                }
            } catch (e) {
                //logError(array[0], array[1], 'Error-openCredentials', e.message);
            }
        }

        function getSentDocument(documento, token) {
            var headers1 = new Array();
            try {
                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: "https://" + URL_BASE + "/api-efact-ose/v1/ticket/" + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response-https://" + URL_BASE + "/api-efact-ose/v1/ticket/', response);
                return { pdf: response.body }
            } catch (error) {
                return error;
            }
        }

        function recuperarArchivos(tiket, access_token, filename, internalId, tranType) {
            var access_token = access_token;
            var tiket = tiket;
            var filename = filename;
            var tranType = tranType;
            var internalId = internalId;
            remainingUsage = script.getRemainingUsage();
            var getpdf = getDocumentPDF(tiket, access_token);
            var filepdf = generateFilePDF(filename, getpdf.pdf);
            if (remainingUsage < 100) {
                return {
                    success: false,
                    message: 'Se alcanzo el límite de intentos, No se puede recuperar los archivos : ' + JSON.stringify(getpdf)
                };
            }
            var getxml = getDocumentXML(tiket, access_token);
            var getcdr = getDocumentCDR(tiket, access_token);

            var filexml = generateFileXML(filename, getxml.pdf);
            log.debug('filexml', filexml);
            var filecdr = generateFileCDR(filename, getcdr.pdf);
            log.debug('filecdr', filecdr);
            var recordSet = setRecord(tranType, internalId, filepdf, filexml, filecdr);
            return recordSet;
        }

        function setRecord(recordtype, internalid, urlpdf, urlxml, urlcdr) {
            var recordload = '';
            try {
                if (recordtype == 'invoice') {
                    recordload = record.load({ type: record.Type.INVOICE, id: internalid, isDynamic: true })
                } else if (recordtype == 'creditmemo') {
                    recordload = record.load({ type: record.Type.CREDIT_MEMO, id: internalid });
                } else if (recordtype == 'vendorcredit') {
                    recordload = record.load({ type: 'vendorcredit', id: internalid });
                } else if (recordtype == 'itemfulfillment') {
                    recordload = record.load({ type: 'itemfulfillment', id: internalid });
                }
                else if (recordtype == 'cashsale') {
                    recordload = record.load({ type: 'cashsale', id: internalid });
                }
                recordload.setValue('custbody_pe_ei_printed_xml_res', urlxml);
                recordload.setValue('custbody_pe_ei_printed_cdr_res', urlcdr);
                recordload.setValue('custbody_pe_ei_printed_pdf', urlpdf);
                recordload.setValue('custbody_pe_ei_recovery_confirmation', false);
                //recordload.setValue('custbody_pe_ei_printed_pdf_codificado', encodepdf);
                recordload.save({ ignoreMandatoryFields: true });
                return recordload;
            } catch (error) {

                //logError(array[0], array[1], 'Error-setRecord', e.message);
            }
        }

        function getDocumentPDF(documento, token) {
            var headers1 = new Array();
            try {
                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: "https://" + URL_BASE + "/api-efact-ose/v1/pdf/" + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response-pdf', response);
                return { pdf: response.body }
            } catch (error) {
                return error;
            }
        }

        function getDocumentXML(documento, token) {
            var headers1 = new Array();
            try {

                headers1['Accept'] = '*/*';

                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: "https://" + URL_BASE + "/api-efact-ose/v1/xml/" + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response-getDocumentXML', response);
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

        function getDocumentCDR(documento, token) {
            var headers1 = new Array();
            try {

                headers1['Accept'] = '*/*';
                headers1['Authorization'] = 'Bearer ' + token;
                var response = https.get({
                    url: "https://" + URL_BASE + "/api-efact-ose/v1/cdr/" + documento,
                    body: '',
                    headers: headers1
                });
                log.debug('response-getDocumentCDR', response);
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

        function generateFilePDF(namefile, content) {
            try {
                var fileObj = file.create({
                    name: namefile + '.pdf',
                    fileType: file.Type.PDF,
                    contents: content,
                    folder: 387324,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (error) {
                return false;
                // logStatus(internalId, error);
                //logError(array[0], array[1], 'Error-generateFilePDF', e.message);
            }
        }

        function generateFileXML(namefile, content) {
            try {
                var xml = base64Decoded(content);
                var fileObj = file.create({
                    name: namefile + '.xml',
                    fileType: file.Type.XMLDOC,
                    contents: xml,
                    folder: 387324,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (e) {
                //logError(array[0], array[1], 'Error-generateFileXML', e.message);
            }
        }

        function generateFileCDR(namefile, content) {
            try {
                var cdr = base64Decoded(content);
                var fileObj = file.create({
                    name: namefile + '-CDR.xml',
                    fileType: file.Type.XMLDOC,
                    contents: cdr,
                    folder: 387324,
                    isOnline: true
                });
                var fileid = fileObj.save();
                return fileid;
            } catch (e) {
                //logError(array[0], array[1], 'Error-generateFileCDR', e.message);
            }
        }

        function base64Decoded(content) {
            var base64decoded = encode.convert({
                string: content,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.UTF_8
            });
            return base64decoded;
        }

        return { execute }

    }); 
