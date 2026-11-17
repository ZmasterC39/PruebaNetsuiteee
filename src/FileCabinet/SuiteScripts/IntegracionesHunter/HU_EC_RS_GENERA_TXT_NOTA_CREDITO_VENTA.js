/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search', 'N/query', 'N/runtime', 'N/error'], function(log, record, search, query, runtime, error) {


    const GENERATED_FILE_FOLDER_ID = "561"; //SuiteScripts > TS NET Scripts > Electronic Invoicing
    var transactionId = '';
    var userId = '';
    const SUBSIDIARIA = 2;
    const FORM_LIQUIDACION = 154; //SB:128 - PR:154
    const AMBIENTE_SIPECOM = '2'; //SB:1 - PR:2
    const AMBIENTE_SIPECOM_VENTAS = '2'; //SB:1 - PR:2
    var now = new Date(); // JCH 18/03/2026
   

    function _Get_GeneraArchivoTXT(context) {
        try {

            var linesArray = [];
            let Resultado = [];
            var mensajeerror = '';

            transactionId = context.transactionId

            var setup = getEnvirommentSetup();
            var transactionRecord = getLookUpTransactionFields(transactionId);

            //log.debug('transactionRecord', transactionRecord);

            if (!transactionRecord || Object.keys(transactionRecord).length === 0) {
                mensajeerror = 'No se encontro el registro de la nota de credito'

                Resultado.push({
                    linea: mensajeerror,
                    nombrearchivo: '',
                    resultado: 'ER'
                });

              
            } else {
              
                 if (transactionRecord.recordtype == "creditmemo") {
                    linesArray = generateCreditNoteLines(transactionId, setup);
                    var name = getFileName(transactionRecord);
                    name = "NCF" + name;
                    var fileContent = printLines(linesArray);
                    log.debug('linesArray....', linesArray);
                    log.debug('fileContent....', fileContent);
                 }
          
          
                for (var i = 0; i < linesArray.length; i++) {

                     linea = linesArray[i].join('|');
              
                     Resultado.push({
                        linea: linea,
                        nombrearchivo: name,
                        resultado: 'OK'
                        
                     });

                 }

            }

           
            return Resultado;

        } catch (error) {
            if (error.name == 'ERROR EN TRANSACCION') {
                log.error('Error-Get_GeneraArchivoTXT', error.message);
            } else {
                log.error('Error-Get_GeneraArchivoTXT', error);
            }
            
        }
    }


    function getLookUpTransactionFields(id) {
        try {
            var transactionRecord = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: id,
                subsidiary: SUBSIDIARIA,
                columns: [
                    "recordtype",
                    "custbodyts_ec_tipo_documento_fiscal.custrecordts_ec_cod_tipo_comprobante",
                    "custbody_ts_ec_serie_cxc.custrecord_ts_ec_series_impresion",
                    "custbody_ts_ec_numero_preimpreso",
                    "custbodyec_tipo_de_documento_retencion.custrecordts_ec_cod_tipo_comprobante",
                    "custbody_ec_serie_cxc_retencion.custrecord_ts_ec_series_impresion",
                    "custbody_ts_ec_preimpreso_retencion"
                ]
            });
          
            return transactionRecord;
        } catch (e) {
            log.error('Error-getLookupFieldsSearch', e);
        }
    }


    function getFileName(transactionRecord) {
        var name = "";
        name = transactionRecord["custbody_ts_ec_serie_cxc.custrecord_ts_ec_series_impresion"] + transactionRecord["custbody_ts_ec_numero_preimpreso"];
        return name.replace(/-/gi, "");
    }

    // JCH 18/03/2026 CAMBIO FECHA
    // transactionRecord.date,
    var fechaemisionncfv = formatDateToDDMMYYYY(now);
    function generateCreditNoteLines(transactionId, setup) {
        try {
            var creditNoteLines = [];
            var transactionRecord = getCreditNoteTransaction(transactionId);

            var VEline = ['VE', transactionRecord.documentTypeCode, "notaCredito", '1.0.0', ''];
            creditNoteLines.push(VEline);

            // var serie = transactionRecord.serie.split('-');
            var serie = transactionRecord.serie
            var serie0 = serie.substring(0, 3);
            var serie1 = serie.substring(3);

            var ITline = ['IT', AMBIENTE_SIPECOM_VENTAS, '1', transactionRecord.subsidiaryLegalName, "CARSEG S.A", transactionRecord.subsidiaryFederalNumber, '', transactionRecord.documentTypeCode, serie0, serie1 || "", transactionRecord.preprint, transactionRecord.subsidiaryAddress.toUpperCase(), transactionRecord.customerEmail, ''];
            creditNoteLines.push(ITline);

            var detailArray = getCreditNoteTotalAndDetails(transactionRecord);
            // logError('NC Details', detailArray);
            var total = detailArray[0][8] || "0";

            var ICline = ['IC', fechaemisionncfv, transactionRecord.subsidiaryAddress, transactionRecord.customerSpecialTaxPayer, transactionRecord.customerObligatedToAccountFor, transactionRecord.customerDocumentTypeCode,
                "", transactionRecord.customerName, transactionRecord.customerDocumentNumber, 'DOLAR', '',
                transactionRecord.documentTypeCodeRef, transactionRecord.numeroDocRef, transactionRecord.dateRef, total,
                transactionRecord.memo, "", "", "", "", "", "", "", "", "", "", ''];
            creditNoteLines.push(ICline);

            //var detailArray = getCreditNoteTotalAndDetails(transactionRecord.items);
            creditNoteLines = creditNoteLines.concat(detailArray);

            // Se quito de la validacion  porque no hay terms en nota de credito
            var IALines = getIALines(transactionRecord);
            creditNoteLines = creditNoteLines.concat(IALines);

            return creditNoteLines;
        } catch (e) {
            logError('Error-generateCreditNoteLines', e);
        }
    }

    function getCreditNoteTransaction(transactionId) {
        try {
            var transactionResult = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ["type", "anyof", "CustCred"],
                    "AND",
                    ["internalidnumber", "equalto", transactionId],
                    "AND",
                    ["formulanumeric: NVL({debitamount},0) - NVL({creditamount},0)", "notequalto", "0"],
                    "AND",
                    ["taxline", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "recordtype", label: "recordtype" }),
                    search.createColumn({ name: "line", sort: search.Sort.ASC, label: "Line ID" }),
                    search.createColumn({ name: "formulatext", formula: "to_char({trandate},'DD/MM/YYYY')", label: "date" }),
                    search.createColumn({ name: "tranid", label: "tranid" }),
                    search.createColumn({ name: "mainname", label: "customer" }),
                    search.createColumn({ name: "name", join: "CUSTBODYTS_EC_TIPO_DOCUMENTO_FISCAL", label: "documentType" }),
                    search.createColumn({ name: "custrecord_ec_cod_tipo_comprobante_fel", join: "CUSTBODYTS_EC_TIPO_DOCUMENTO_FISCAL", label: "documentTypeCode" }),
                    search.createColumn({ name: "formulatext", formula: "{custbody_ts_ec_serie_cxc}", label: "serie" }),
                    search.createColumn({ name: "custbody_ts_ec_numero_preimpreso", label: "preprint" }),
                    search.createColumn({ name: "formulatext", formula: "CASE WHEN {currency.symbol} = 'USD' THEN 'DOLAR' END", label: "currency" }),
                    search.createColumn({ name: "memo", label: "memo" }),
                    search.createColumn({ name: "total", label: "total", function: "absoluteValue" }),
                    search.createColumn({ name: "formulatext", formula: "{location}", label: "location" }),

                    search.createColumn({ name: "legalname", join: "subsidiary", label: "subsidiaryLegalName" }),
                    search.createColumn({ name: "address1", join: "subsidiary", label: "subsidiaryAddress" }),
                    search.createColumn({ name: "taxidnum", join: "subsidiary", label: "subsidiaryFederalNumber" }),
                    search.createColumn({ name: "email", join: "subsidiary", label: "subsidiaryEmail" }),

                    search.createColumn({ name: "billaddress1", label: "address" }),
                    //search.createColumn({ name: "billcity", label: "city" }),
                    search.createColumn({ name: "formulatext", formula: "NVL({billcity},{billingAddress.custrecord_ec_parroquia})", label: "city" }),
                    search.createColumn({ name: "custrecord_ec_cod_tipo_comprobante_fel", join: "custbodyts_ec_doc_type_ref", label: "documentTypeCodeRef" }),
                    search.createColumn({ name: "formulatext", formula: "CONCAT(SUBSTR({custbody_ts_ec_serie_cxc}, 1, 3) || '-' || SUBSTR({custbody_ts_ec_serie_cxc}, 4, 3),CONCAT('-',{custbodyts_ec_doc_number_ref}))", label: "numeroDocRef" }),
                    search.createColumn({ name: "formulatext", formula: "to_char({custbodyts_ec_doc_fecha_ref},'DD/MM/YYYY')", label: "dateRef" }),

                    // search.createColumn({ name: "custentityec_contribuyente_especial", join: "customerMain", label: "customerSpecialTaxPayer" }),
                    // search.createColumn({ name: "formulatext", formula: "{customerMain.custentity_ec_obligado_contabilidad}", label: "customerObligatedToAccountFor" }),
                    search.createColumn({ name: "custentityts_ec_cod_tipo_doc_identidad", join: "customerMain", label: "customerDocumentTypeCode" }),
                    search.createColumn({ name: "altname", join: "customerMain", label: "customerName" }),
                    search.createColumn({ name: "vatregnumber", join: "customerMain", label: "customerDocumentNumber" }),
                    search.createColumn({ name: "email", join: "customerMain", label: "customerEmail" }),
                    search.createColumn({ name: "phone", join: "customerMain", label: "phone" }),
                    search.createColumn({ name: "address1", join: "customerMain", label: "address1" }),
                    search.createColumn({ name: "city", join: "customerMain", label: "city1" }),
                    //search.createColumn({ name: "custrecord_ec_parroquia", join: "customerMain", label: "city" }),

                    search.createColumn({ name: "itemid", join: "custcol_ht_so_item_agrupado", label: "item.code" }),
                    search.createColumn({ name: "memo", label: "item.detail" }),
                    search.createColumn({ name: "quantity", label: "item.quantity", function: "absoluteValue" }),
                    search.createColumn({ name: "rate", label: "item.rate" }),
                    search.createColumn({ name: "amount", label: "item.amount" }),
                    search.createColumn({ name: "taxamount", label: "item.taxAmount", function: "absoluteValue" }),
                    search.createColumn({ name: "grossamount", label: "item.grossAmount", function: "absoluteValue" }),
                    search.createColumn({ name: "type", join: 'item', label: "item.type" }),
                    search.createColumn({ name: "taxcode", label: "item.taxItem" }),
                    search.createColumn({ name: "formulanumeric", formula: "{taxitem.rate}", label: "item.taxRate" }),
                    search.createColumn({ name: "custcol_ts_ec_cod_id_facturacion", label: "item.identifierCode" }),
                    search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tipo_impuesto}", label: "item.taxName" }),
                    search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tipo_impuesto_cod}", label: "item.taxCode" }),
                    search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tar_imp_codigo}", label: "item.taxRateCode" }),
                    search.createColumn({ name: "formulatext", formula: "NVL({custcol_4601_witaxline},{custcol_4601_witaxline_exp})", label: "item.isWithholdingLine" }),
                    search.createColumn({ name: "formulatext", formula: "{custcol_ht_so_item_agrupado.salesdescription}", label: "item.description" }),
                    //& <I> - dfernandez - 26/09/2024
                    search.createColumn({ name: "custrecord_ht_contribuyente_especial", join: "subsidiary", label: "customerSpecialTaxPayer" }),
                    search.createColumn({ name: "formulatext", formula: "{subsidiary.custrecord_ht_obligado_llevar_contabilid}", label: "customerObligatedToAccountFor" }),
                    //& <F> - dfernandez - 26/09/2024
                    search.createColumn({ name: "custbodyts_ec_base_rate12", label: "custbodyts_ec_base_rate12" }),
                    search.createColumn({ name: "custbody_ec_monto_iva", label: "custbody_ec_monto_iva" }),


                ]
            }).run().getRange(0, 1000);
            var transactionJson = {};
            for (var i = 0; i < transactionResult.length; i++) {
                if (i == 0) {
                    transactionJson = getMainLineFields(transactionResult[i]);
                    transactionJson.items = [];
                } else {
                    var line = transactionResult[i].getValue('line')
                    var item = getLineFieldsCreditMemo(transactionResult[i], line);
                    transactionJson.items.push(item);
                }

            }
            return transactionJson;
        } catch (e) {
            logError('Error-getCreditNoteTransaction', e);
        }
    }
    
    function getCreditNoteTotalAndDetails(transactionRecord) {
        try {
            var resultArray = [];
            var lineArray = [];
            var processedItems = {};

            // T LINE
            var total15 = 0, descuentototal = 0, impuestototal = 0, totalposicion4 = 0, subtotal12 = 0, subtotal0 = 0, subtotalNotSubject = 0, subtotalWithoutTaxation = 0, totalDescuento = 0, ICE = 0, IVA12 = 0, totalAmount = 0, tip = 0, amountToPay = 0;
            //<I> rhuaccha: 2024-09-18
            var totalDiscAmount = 0;
            var totalDiscTaxAmount = 0;
            //<F> rhuaccha: 2024-09-18

            // Procesar cada ítem en la transacción
            for (var i = 0; i < transactionRecord.items.length; i++) {
                var item = transactionRecord.items[i];

                // Check if the item has already been processed
                if (processedItems[item.code]) continue;

                if (item.isWithholdingLine == "T") continue;
                if (!item.taxCode || !item.taxRateCode) continue;

                // Mark item as processed
                processedItems[item.code] = true;

                var codigoNC = (item.code).split('_');

                // HU EC JCH 20/02/2025
                var itemDescription = '';
                
                // Crear array DE line y agregar a lineArray
                if (Number(item.amount) < 0) {
                    
                    // HU EC JCH 20/02/2025
                    itemDescription = item.description.replace(/(\r\n|\n|\r)/g, ' ');
                    var DEline = ['DE', codigoNC[0].substring(0, 15), codigoNC[0].substring(0, 15), itemDescription/*item.code.substring(0, 15)*/, item.quantity, Math.round(item.rate * 100) / 100, 0, Number(item.amount * (-1)).toFixed(2), ""];
                    //var DEline = ['DE', codigoNC[0].substring(0, 15), codigoNC[0].substring(0, 15), item.description/*item.code.substring(0, 15)*/, item.quantity, Math.round(item.rate * 100) / 100, 0, Number(item.amount * (-1)).toFixed(2), ""];
                    
                    //<I> rhuaccha: 2024-09-23
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];

                        if (isNegativeNumber(nextItem.rate)) {
                            // var lineAmountDe = Number(DEline[5]) - Math.abs(Number(nextItem.rate));
                            var lineTaxAmountDe = Number(DEline[7]) - Math.abs(Number(nextItem.amount));

                            // DEline[5] = parseFloat(lineAmountDe).toFixed(2);
                            DEline[6] = parseFloat(Math.abs(Number(nextItem.amount))).toFixed(2);
                            DEline[7] = parseFloat(lineTaxAmountDe).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-23
                    lineArray.push(DEline);
                }

                // Calcular subtotales e impuestos
                if (item.taxRateCode == '2') {
                    subtotal12 += Number(item.amount);
                    IVA12 += Number(item.taxAmount);
                }
                if (item.taxRate == '0') {
                    descuentototal += Number(item.amount) * (-1);
                }
                if (item.taxRateCode == '0') subtotal0 += Number(item.amount);
                if (item.taxRateCode == '6') subtotalNotSubject += Number(item.amount) * (-1);
                if ((item.taxRateCode == '4' || item.taxRateCode == '2') && Number(item.amount) < 0) {
                    subtotalWithoutTaxation += Number(item.amount) * (-1);
                    total15 += Number(item.taxAmount);
                } else {
                    //<I> rhuaccha: 2024-09-23
                    if (isNegativeNumber(item.rate)) {
                        totalDiscAmount += Math.abs(Number(item.amount));
                        totalDiscTaxAmount += Math.abs(Number(item.taxAmount));
                    }
                    //<F> rhuaccha: 2024-09-23
                }

                if (Number(item.amount) > 0) {
                    totalposicion4 += Number(item.amount) + Number(item.taxAmount);
                }
                impuestototal += Number(item.taxAmount);

                totalAmount += Number(item.grossAmount);

                // Crear array IM line y agregar a lineArray
                if (Number(item.amount) < 0) {
                    var IMline = ["IM", item.taxCode, item.taxRateCode, item.taxRate, Number(item.amount * (-1)).toFixed(2), Number(item.taxAmount).toFixed(2), item.taxName, ""];
                    //<I> rhuaccha: 2024-09-23
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];

                        if (isNegativeNumber(nextItem.rate)) {
                            var discAmountIm = Number(IMline[4]) - Math.abs(Number(nextItem.amount));
                            var discTaxRateIm = Number(IMline[5]) - Math.abs(Number(nextItem.taxAmount));

                            IMline[4] = parseFloat(discAmountIm).toFixed(2);
                            IMline[5] = parseFloat(discTaxRateIm).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-23
                    lineArray.push(IMline);
                }

                // Crear una línea TI para cada ítem directamente
                if (Number(item.amount) < 0) {
                    var TILine = ["TI", item.taxCode, item.taxRateCode, item.taxRate, Number(item.amount * (-1)).toFixed(2), Number(item.taxAmount).toFixed(2), item.taxName, ""];
                    //<I> rhuaccha: 2024-09-23
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];

                        if (isNegativeNumber(nextItem.rate)) {
                            var discAmountTi = Number(TILine[4]) - Math.abs(Number(nextItem.amount));
                            var discTaxRateTi = Number(TILine[5]) - Math.abs(Number(nextItem.taxAmount));

                            TILine[4] = parseFloat(discAmountTi).toFixed(2);
                            TILine[5] = parseFloat(discTaxRateTi).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-23
                    resultArray.push(TILine);
                }

                amountToPay += Number(item.grossAmount);
            }
            /**
             * Inicio Cambio JCEC 24/10/2024 - Actualizacion para la linea TI unica(Toma la primera linea como base), se actualiza los valores de la posicion 4 y 5
             * Funcional que lo solicito : Jorge Alberto Mija Lescano
             */
            //recorremos el array resultArray y solo traemos la primera linea y actualizamos los valores en la posicion 4 y 5
            var TIUniqueLine = []
            for (var i = 0; i < resultArray.length; i++) {
                if (i == 0) {
                    var item = resultArray[i];
                    item[4] = transactionRecord.custbodyts_ec_base_rate12;
                    item[5] = transactionRecord.custbody_ec_monto_iva;

                    TIUniqueLine.push(item);
                }
            }

            resultArray = TIUniqueLine;

            // Fin Cambio JCEC 24/10/2024



            // Crear array T line y agregar a resultArray
            // var TLine = ["T", subtotalWithoutTaxation.toFixed(2), descuentototal.toFixed(2), subtotalNotSubject, (subtotalWithoutTaxation + descuentototal).toFixed(2), totalposicion4, ICE, total15.toFixed(2), transactionRecord.total, tip, transactionRecord.total, ""];
            //<I> rhuaccha: 2024-09-23
            var calAmount = parseFloat(Number(subtotalWithoutTaxation) - totalDiscAmount).toFixed(2);
            var totalColumn4 = parseFloat(totalposicion4 - totalDiscTaxAmount).toFixed(2);
            var total15Column = parseFloat(total15 - totalDiscTaxAmount).toFixed(2);
            var TLine = [
                "T",
                calAmount, // subtotalWithoutTaxation.toFixed(2),
                descuentototal.toFixed(2),
                subtotalNotSubject,
                // (subtotalWithoutTaxation + descuentototal).toFixed(2),
                parseFloat(calAmount + descuentototal).toFixed(2),
                totalColumn4, // totalposicion4,
                ICE,
                total15Column, // total15.toFixed(2),
                transactionRecord.total,
                tip,
                transactionRecord.total,
                ""];
            //<F> rhuaccha: 2024-09-2
            resultArray.unshift(TLine);

            return resultArray.concat(lineArray);

        } catch (e) {
            logError('Error-getInvoiceTotalAndDetails', e);
        }
    }
            
    function getIALines(transactionRecord) {
        try {
            var IALines = [];
            if (transactionRecord.recordtype == "creditmemo") { //& NOTA DE CREDITO
                var emails = getEmails(transactionRecord.customer);
                var addr = getAddress(transactionRecord.customer);
              
                //HU EC JCH 20/02/2025
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion.replace(/(\r\n|\n|\r)/g, ' '), '']) };
                //if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
              
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
              
                 //HU EC JCH 20/02/2025
                if (transactionRecord.phone != '') {IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);} else {IALines.push(['IA', 'TELEFONO', '0', '']);}
                //IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);

              
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);

                // HU EC JCH 20/02/2025 CAMPO EMAIL se envia el el cliente si no hay detalles de EMAIL
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']); else {IALines.push(['IA', 'CORREO', transactionRecord.customerEmail, '']);}
                //if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
              
            } 
            return IALines;
        } catch (e) {
            log.error('Error-getIALines', e);
        }
    }


    function getEmails(customerId) {
        if (!customerId) return [];
        var searchResult = search.create({
            type: "customrecord_ht_record_correoelectronico",
            filters: [["custrecord_ht_ce_enlace", "anyof", customerId]],
            columns: ["custrecord_ht_email_email"]
        }).run().getRange(0, 1000);

        if (!searchResult.length) return [];
        var emails = [];
        for (var i = 0; i < searchResult.length; i++) {
            emails.push(searchResult[i].getValue("custrecord_ht_email_email"));
        }
        return emails;
    }

    function getAddress(entity) {
        var nkey = 0;
        var ciudad = '';
        var direccion = '';
        var sql = "SELECT addressbookaddress FROM customeraddressbook WHERE defaultbilling = 'T' AND entity = ?"
        var resultSet = query.runSuiteQL({ query: sql, params: [entity] });
        var results = resultSet.asMappedResults();
        if (results.length > 0) {
            nkey = results[0].addressbookaddress;
        }

        if (nkey != 0) {
            var sql2 = "SELECT country, custrecord_ec_canton as city, custrecord_ec_parroquia, addr1 as direccion FROM customerAddressbookEntityAddress WHERE nkey = ?"
            var resultSet2 = query.runSuiteQL({ query: sql2, params: [nkey] });
            var results2 = resultSet2.asMappedResults();
            if (results2.length > 0) {
                country = results2[0].country;
                if (country == 'EC') {
                    direccion = results2[0].direccion
                    if (results2[0].direccion == 'NO DEFINIDO') {
                        direccion = ''
                    } else {
                        direccion = results2[0].direccion
                    }
                    var sql3 = "SELECT name FROM customrecord_ec_record_parroquia WHERE id = ?"
                    var resultSet3 = query.runSuiteQL({ query: sql3, params: [results2[0].custrecord_ec_parroquia] });
                    var results3 = resultSet3.asMappedResults();
                    if (results3.length > 0) {
                        if (results3[0].name == 'NO DEFINIDO') {
                            ciudad = ''
                        } else {
                            ciudad = results3[0].name
                        }
                    }
                } else {
                    if (results2[0].direccion == 'NO DEFINIDO') {
                        direccion = ''
                    } else {
                        direccion = results2[0].direccion
                    }
                    if (results2[0].city == 'NO DEFINIDO') {
                        ciudad = ''
                    } else {
                        ciudad = results2[0].city
                    }
                }
            }
        }

        return {
            direccion: direccion,
            ciudad: ciudad
        }
    }

   function getMainLineFields(transactionResult) {
            try {
                var mainLineJson = new Object();
                var mainLineJsonText = new Object();
                var columns = transactionResult.columns;
                mainLineJson.internalid = transactionResult.id;
                mainLineJson.type = transactionResult.recordtype;
                columns.forEach(function (column) {
                    var column_key = column.label || column.name;
                    var isItem = column_key.indexOf("item.");
                    if (isItem == -1) {
                        mainLineJson[column_key] = transactionResult.getValue(column);
                    }
                });
                return mainLineJson;
            } catch (e) {
                logError('Error-getMainLineFields', e);
            }

        }

   function getLineFieldsCreditMemo(transactionResult, line) {
            try {
                var items = [];
                var lineJson = {}
                var columns = transactionResult.columns;
                columns.forEach(function (column) {
                    var column_key = column.label || column.name;
                    var isItem = column_key.indexOf("item.");
                    if (isItem != -1) {
                        column_key = column_key.replace("item.", "");
                        if(column_key == 'code'){
                            lineJson[column_key] = transactionResult.getValue(column) + '_' + line;
                        } else {
                            lineJson[column_key] = transactionResult.getValue(column);
                        }
                        items.push(lineJson);
                    }
                });
                return lineJson;
            } catch (e) {
                logError('Error-getLineFields', e);
            }
        }

     function printLines(linesArray) {
            try {
                var text = "";
                for (var i = 0; i < linesArray.length; i++) {
                    text = text + linesArray[i].join('|') + "\n";
                }
                return text;
            } catch (e) {
                logError('Error-printLines', e);
                return "";
            }
        }


    function getEnvirommentSetup() {
        var setup = {}
        setup.enviromment = runtime.envType == 'PRODUCTION' ? "2" : "1";
        setup.enviromment = "1";
        setup.issuanceType = 1;
    
        return setup;
    }

  
    function isNegativeNumber(value) {
        var numberValue = Number(value);
        return !isNaN(numberValue) && numberValue < 0;
    }

    // JCH 18/03/2026 CAMBIO FECHA
       function formatDateToDDMMYYYY(date) {
          var day = date.getDate();
          var month = date.getMonth() + 1;
          var year = date.getFullYear();

          // Agregar cero a la izquierda manualmente
          if (day < 10) {
             day = '0' + day;
          }

          if (month < 10) {
             month = '0' + month;
          }

          return day + '/' + month + '/' + year;
        }
   


   return {
       get: _Get_GeneraArchivoTXT

   }



});