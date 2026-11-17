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
                //log.error('getLookUpTransactionFields','No se encontro el registro de la factura');
                //throw error.create({ name: "ERROR EN TRANSACCION", message: 'No se encontro el registro de la factura', notifyOff: false });
                mensajeerror = 'No se encontro el registro de la factura'

                Resultado.push({
                    linea: mensajeerror,
                    nombrearchivo: '',
                    resultado: 'ER'
                });

              
            } else {
              
                 if (transactionRecord.recordtype == "invoice" && (transactionRecord["custbodyts_ec_tipo_documento_fiscal.custrecordts_ec_cod_tipo_comprobante"] == "01" || transactionRecord["custbodyts_ec_tipo_documento_fiscal.custrecordts_ec_cod_tipo_comprobante"] == "18")) {
                
                    linesArray = generateInvoiceLines(transactionId, setup);
                    var name = getFileName(transactionRecord);
                    name = "FAC" + name;
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
    var fechaemisionfacv = formatDateToDDMMYYYY(now);
    function generateInvoiceLines(transactionId, setup) {
                //*Activo
                try {
                    var invoiceLines = [];
                    var transactionRecord = getInvoiceTransaction(transactionId);
                    //logError('transactionRecordObject', JSON.stringify(transactionRecord));
                    if (transactionRecord.estadoAprobacion != 'Aprobado') {
                        throw error.create({ name: "ERROR DE APROBACION", message: 'La factura no esta APROBADA', notifyOff: false });
                    }
                    var VEline = ['VE', transactionRecord.documentTypeCode, "FACTURA", '1.0.0', ''];
                    invoiceLines.push(VEline);

                    var serie = transactionRecord.serie.split('');
                    var ITline = [
                        'IT',
                        // setup.enviromment,
                        AMBIENTE_SIPECOM_VENTAS,
                        '1',
                        transactionRecord.subsidiaryLegalName,
                        "CARSEG S.A",
                        transactionRecord.subsidiaryFederalNumber,
                        '',
                        transactionRecord.documentTypeCode,
                        serie[0] + '' + serie[1] + '' + serie[2],
                        serie[3] + '' + serie[4] + '' + serie[5] || "",
                        transactionRecord.preprint,
                        transactionRecord.subsidiaryAddress.toUpperCase(),
                        transactionRecord.customerEmail,
                        ''
                    ];
                    invoiceLines.push(ITline);

                    var altname = ''
                    var posicionDosPuntos = transactionRecord.customerName.indexOf(":");
                    if (posicionDosPuntos !== -1) {
                        altname = transactionRecord.customerName.substring(posicionDosPuntos + 1).trim();
                    } else {
                        altname = transactionRecord.customerName
                    }
                    var ICline = ['IC', fechaemisionfacv, transactionRecord.subsidiaryAddress, transactionRecord.customerSpecialTaxPayer, transactionRecord.customerObligatedToAccountFor, transactionRecord.customerDocumentTypeCode,
                        "", altname, transactionRecord.customerDocumentNumber, 'DOLAR' , '', '', '', '',
                        '0', "", "", "", "", "", "", "", "", "", "", "", transactionRecord.address, ''];
                    invoiceLines.push(ICline);

                    var detailArray = getInvoiceTotalAndDetails(transactionRecord); getBillDetailLines
                    invoiceLines = invoiceLines.concat(detailArray);

                    var IALines = getIALines(transactionRecord);
                    invoiceLines = invoiceLines.concat(IALines);

                    if (transactionRecord.metodoPago.length > 0) {
                        var PALines = getPALines(transactionRecord);
                        invoiceLines.push(PALines);
                    }

                    return invoiceLines;
                } catch (e) {
                    if (e.name == 'ERROR DE APROBACION') {
                        //la factura no esta aprobada
                        log.error('Error-generateInvoiceLines', e.message);
                    } else {
                        log.error('Error-generateInvoiceLines', e);
                    }
                }
            }

    function getInvoiceTransaction(transactionId) {
                try {
                    var transactionResult = search.create({
                        type: search.Type.TRANSACTION,
                        filters: [
                            ["type", "anyof", "CustInvc"],
                            "AND",
                            ["internalidnumber", "equalto", transactionId],
                            "AND",
                            [["custbody_ht_guia_remision", "anyof", "@NONE@"], "OR", ["custbody_ht_guia_remision.mainline", "is", "T"]],
                            "AND",
                            ["formulanumeric: NVL({debitamount},0) - NVL({creditamount},0)", "notequalto", "0"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["subsidiary","anyof","2"]
                        ],
                        columns: [
                            search.createColumn({ name: "recordtype", label: "recordtype" }),
                            search.createColumn({ name: "line", sort: search.Sort.ASC, label: "Line ID" }),
                            search.createColumn({ name: "mainline", label: "mainline" }),
                            search.createColumn({ name: "tranid", label: "tranid" }),
                            search.createColumn({ name: "mainname", label: "customer" }),
                            search.createColumn({ name: "name", join: "CUSTBODYTS_EC_TIPO_DOCUMENTO_FISCAL", label: "documentType" }),
                            search.createColumn({ name: "custrecord_ec_cod_tipo_comprobante_fel", join: "CUSTBODYTS_EC_TIPO_DOCUMENTO_FISCAL", label: "documentTypeCode" }),
                            search.createColumn({ name: "formulatext", formula: "{custbody_ts_ec_serie_cxc.custrecord_ts_ec_series_impresion}", label: "serie" }),
                            search.createColumn({ name: "custbody_ts_ec_numero_preimpreso", label: "preprint" }),
                            search.createColumn({ name: "total", label: "total", function: "absoluteValue" }),
                            search.createColumn({ name: "formulatext", formula: "{location}", label: "location" }),
                            search.createColumn({ name: "formulatext", formula: "{custbody_ts_ec_metodo_pago.custrecord_ts_ec_clave}", label: "paymentMethod" }),
    
                            search.createColumn({ name: "formulatext", formula: "to_char({trandate},'DD/MM/YYYY')", label: "date" }),
                            search.createColumn({ name: "formulatext", formula: "to_char({duedate},'DD/MM/YYYY')", label: "duedate" }),
                            search.createColumn({ name: "terms", label: "terms" }),
                            //Inicio - dfernandez 28/08/2024
                            search.createColumn({ name: "custbody_ht_ec_nro_cuotas", label: "checkNroCuotas" }),
                            search.createColumn({ name: "formulatext", formula: "to_char({custbody_ht_ec_fech_ven_fin},'DD/MM/YYYY')", label: "duedateforcuote" }),
                            //Fin - dfernandez 28/08/2024
    
                            search.createColumn({ name: "formulatext", formula: "CASE WHEN {currency.symbol} = 'USD' THEN 'DOLAR' END", label: "currency" }),
                            search.createColumn({ name: "formulatext", formula: "to_char({accountingperiod.startdate},'MM/YYYY')", label: "period" }),
    
                            search.createColumn({ name: "name", join: "subsidiary", label: "subsidiaryName" }),
                            search.createColumn({ name: "legalname", join: "subsidiary", label: "subsidiaryLegalName" }),
                            search.createColumn({ name: "address1", join: "subsidiary", label: "subsidiaryAddress" }),
                            search.createColumn({ name: "taxidnum", join: "subsidiary", label: "subsidiaryFederalNumber" }),
                            search.createColumn({ name: "email", join: "subsidiary", label: "subsidiaryEmail" }),
    
                            //search.createColumn({ name: "custentityec_contribuyente_especial", join: "customerMain", label: "customerSpecialTaxPayer" }),
                            //search.createColumn({ name: "formulatext", formula: "{customerMain.custentity_ec_obligado_contabilidad}", label: "customerObligatedToAccountFor" }),
                            search.createColumn({ name: "custentityts_ec_cod_tipo_doc_identidad", join: "customerMain", label: "customerDocumentTypeCode" }),
                            search.createColumn({ name: "altname", join: "customerMain", label: "customerName" }),
                            search.createColumn({ name: "vatregnumber", join: "customerMain", label: "customerDocumentNumber" }),
                            search.createColumn({ name: "email", join: "customerMain", label: "customerEmail" }),
                            search.createColumn({ name: "phone", join: "customerMain", label: "phone" }),
    
                            search.createColumn({ name: "billaddress1", label: "address" }),
                            //search.createColumn({ name: "billcity", label: "city" }),
                            search.createColumn({ name: "formulatext", formula: "NVL({billcity},{billingAddress.custrecord_ec_parroquia})", label: "city" }),
                            search.createColumn({ name: "custbody_ec_direccion_partida", join: "custbody_ht_guia_remision", label: "itemFulfillmentStartAddress" }),
                            search.createColumn({ name: "custbody_ec_numero_ide_destinatario", join: "custbody_ht_guia_remision", label: "itemFulfillmentAddresseDocumentNumber" }),
                            search.createColumn({ name: "custbody_ec_gr_identificaciontranspor", join: "custbody_ht_guia_remision", label: "itemFulfillmentCarrierDocumentType" }),
                            search.createColumn({ name: "custbody_ec_direccion_partida", join: "custbody_ht_guia_remision", label: "itemFulfillmentCarrierAddress" }),
                            search.createColumn({ name: "custbody_ec_gr_razonsocialtranspor", join: "custbody_ht_guia_remision", label: "itemFulfillmentCarrierLegalName" }),
                            search.createColumn({ name: "custbody_ec_ruc_transportista", join: "custbody_ht_guia_remision", label: "itemFulfillmentCarrierRuc" }),
                            search.createColumn({ name: "custbody_ec_gr_placatranspor", join: "custbody_ht_guia_remision", label: "itemFulfillmentCarrierPlate" }),
                            search.createColumn({ name: "tranid", join: "custbody_ht_guia_remision", label: "itemFulfillment" }),
                            search.createColumn({ name: "formulatext", formula: "to_char({custbody_ht_guia_remision.custbody_ec_gr_fechainiciotransporte}, 'DD/MM/YYYY')", label: "itemFulfillmentTransportStartDate" }),
                            search.createColumn({ name: "formulatext", formula: "to_char({custbody_ht_guia_remision.custbody_ec_gr_fechafintransporte}, 'DD/MM/YYYY')", label: "itemFulfillmentTransportEndDate" }),
    
                            search.createColumn({ name: "itemid", join: "item", label: "item.code" }),
                            search.createColumn({ name: "memo", label: "item.detail" }),
                            //search.createColumn({ name: "quantity", label: "item.quantity" }),
                            search.createColumn({ name: "quantityuom", label: "item.quantity" }),
                            //search.createColumn({ name: "rate", label: "item.rate" }),
                            // search.createColumn({ name: "formulacurrency", formula: "{amount}/{quantityuom}", label: "item.rate" }),
                            //<I> rhuaccha: 2024-09-19
                            // search.createColumn({ name: "formulacurrency", formula: "{amount}/{quantityuom}", label: "item.rate" }),
                            search.createColumn({ name: "formulacurrency", formula: "CASE WHEN {quantityuom} = 0 THEN {amount}/1 ELSE {amount}/{quantityuom} END", label: "item.rate" }),
                            //<F> rhuaccha: 2024-09-19
                            search.createColumn({ name: "amount", label: "item.amount"/*, function: "absoluteValue"*/ }),
                            search.createColumn({ name: "taxamount", label: "item.taxAmount"/*, function: "absoluteValue" */ }),
                            search.createColumn({ name: "grossamount", label: "item.grossAmount", function: "absoluteValue" }),
                            search.createColumn({ name: "type", join: 'item', label: "item.type" }),
                            search.createColumn({ name: "taxcode", label: "item.taxItem" }),
                            search.createColumn({ name: "formulanumeric", formula: "{taxitem.rate}", label: "item.taxRate" }),
                            search.createColumn({ name: "custcol_ts_ec_cod_id_facturacion", label: "item.identifierCode" }),
                            search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tipo_impuesto}", label: "item.taxName" }),
                            search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tipo_impuesto_cod}", label: "item.taxCode" }),
                            search.createColumn({ name: "formulatext", formula: "{taxitem.custrecord_ts_ec_tar_imp_codigo}", label: "item.taxRateCode" }),
                            search.createColumn({ name: "formulatext", formula: "NVL({custcol_4601_witaxline},{custcol_4601_witaxline_exp})", label: "item.isWithholdingLine" }),
                            /*search.createColumn({ name: "discountitem", label: "discountItem"}),
                            search.createColumn({ name: "discountrate", label: "discountRate"})*/
                            //& <I> - dfernandez - 26/09/2024
                            search.createColumn({ name: "custrecord_ht_contribuyente_especial", join: "subsidiary", label: "customerSpecialTaxPayer" }),
                            search.createColumn({ name: "formulatext", formula: "{subsidiary.custrecord_ht_obligado_llevar_contabilid}", label: "customerObligatedToAccountFor" }),
                            //& <F> - dfernandez - 26/09/2024
                            //& <I> - dfernandez - 15/10/2024
                            search.createColumn({ name: "custbodyec_nota_cliente", label: "notaCliente" }),
                            search.createColumn({ name: "formulatext", formula: "{custbody_ts_ec_metodo_pago}", label: "metodoPago" }),
                            //& <F> - dfernandez - 15/10/2024
                            //& <I> - EdwinDelacru - 24/10/2024
                            search.createColumn({ name: "formulatext", formula: "{approvalstatus}", label: "estadoAprobacion" }),
                            search.createColumn({ name: "formulanumeric", formula: "{entity.id}", label: "entidad" }),
                            //& <F> - EdwinDelacru - 24/10/2024
                        ]
                    }).run().getRange(0, 1000);
                    var transactionJson = {};
                    for (var i = 0; i < transactionResult.length; i++) {
                        if (i == 0) {
                            transactionJson = getMainLineFields(transactionResult[i]);
                            transactionJson.items = [];
                        } else {
                            var item = getLineFields(transactionResult[i]);
                            transactionJson.items.push(item);
                        }
    
                    }
                    return transactionJson;
                } catch (e) {
                    log.error('Error-getInvoiceTransaction', e);
                }
    }

    
    function getInvoiceTotalAndDetails(transactionRecord) {
        try {
            var resultArray = [];
            var lineArray = [];
            var lineTIline = new Array();
            const groupedData = new Object();
            var finalResult = new Array();

            // Inicializar totales
            var total15 = 0, descuentototal = 0, impuestototal = 0, totalposicion4 = 0, subtotal12 = 0, subtotal0 = 0, subtotalNotSubject = 0, subtotalWithoutTaxation = 0, totalDescuento = 0, ICE = 0, IVA12 = 0, totalAmount = 0, tip = 0, amountToPay = 0;
            //<I> rhuaccha: 2024-09-18
            var totalDiscAmount = 0;
            var totalDiscTaxAmount = 0;
            //<F> rhuaccha: 2024-09-18

            var itemDesc = ''; // HU EC JCH 20/02/2025

            // Procesar cada ítem en la transacción
            for (var i = 0; i < transactionRecord.items.length; i++) {
                var item = transactionRecord.items[i];
                if (item.isWithholdingLine == "T") continue;
                if (!item.taxCode || !item.taxRateCode) continue;
                // Crear array DE line y agregar a lineArray
                if (Number(item.amount) > 0) {

                    // HU EC JCH 20/02/2025
                    itemDesc =  item.detail.replace(/(\r\n|\n|\r)/g, ' ');
                    var DEline = ['DE', item.code.substring(0, 15), item.code.substring(0, 15), itemDesc, item.quantity, Math.round(item.rate * 100) / 100, 0, item.amount, ""];
                    //var DEline = ['DE', item.code.substring(0, 15), item.code.substring(0, 15), item.detail, item.quantity, Math.round(item.rate * 100) / 100, 0, item.amount, ""];
                  
                    //<I> rhuaccha: 2024-09-18
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];
                        if (isNegativeNumber(nextItem.amount)) {
                            // var lineAmountDe = Number(DEline[5]) - Math.abs(Number(nextItem.rate));
                            var lineTaxAmountDe = Number(DEline[7]) - Math.abs(Number(nextItem.amount));
                            // DEline[5] = parseFloat(lineAmountDe).toFixed(2);
                            DEline[6] = parseFloat(Math.abs(Number(nextItem.amount))).toFixed(2);
                            DEline[7] = parseFloat(lineTaxAmountDe).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-18
                    lineArray.push(DEline);
                }
                // Calcular subtotales e impuestos
                if (item.taxRateCode == '2') {
                    subtotal12 += Number(item.amount);
                    IVA12 += Number(item.taxAmount);
                }
                if (item.taxRateCode == '0') subtotal0 += Number(item.amount);
                if (item.taxRateCode == '6') subtotalNotSubject += Number(item.amount);
                if (item.taxRate == '0') {
                    descuentototal += Number(item.amount);
                }
                if (item.taxRateCode == '4' && Number(item.amount) > 0) {
                    subtotalWithoutTaxation += Number(item.amount);
                    total15 += Number(item.taxAmount);
                } else {
                    //<I> rhuaccha: 2024-09-18: Discount
                    if (isNegativeNumber(item.amount)) {
                        totalDiscAmount += Math.abs(Number(item.amount));
                        totalDiscTaxAmount += Math.abs(Number(item.taxAmount));
                    }
                    //<F> rhuaccha: 2024-09-18
                }
                if (Number(item.amount) < 0) {
                    totalposicion4 += Number(item.amount) * (-1) + Number(item.taxAmount) * (-1);
                }
                impuestototal += Number(item.taxAmount);
                totalAmount += Number(item.grossAmount);

                // Crear array IM line y agregar a lineArray
                if (Number(item.amount) > 0) {
                    var IMline = ["IM", item.taxCode, item.taxRateCode, item.taxRate, item.amount, Number(item.taxAmount).toFixed(2), item.taxName, "",];
                    //<I> rhuaccha: 2024-09-18
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];

                        if (isNegativeNumber(nextItem.amount)) {
                            var discAmountIm = Number(IMline[4]) - Math.abs(Number(nextItem.amount));
                            var discTaxRateIm = Number(IMline[5]) - Math.abs(Number(nextItem.taxAmount));

                            IMline[4] = parseFloat(discAmountIm).toFixed(2);
                            IMline[5] = parseFloat(discTaxRateIm).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-18
                    lineArray.push(IMline);
                }
                // Crear una línea TI para cada ítem directamente
                if (Number(item.amount) > 0) {
                    var TILine = ["TI", item.taxCode, item.taxRateCode, item.amount, item.taxRate, Number(item.taxAmount).toFixed(2), item.taxName, ""];
                    //<I> rhuaccha: 2024-09-18
                    if (i + 1 < transactionRecord.items.length) {
                        var nextItem = transactionRecord.items[i + 1];

                        if (isNegativeNumber(nextItem.amount)) {
                            var discAmountTi = Number(TILine[3]) - Math.abs(Number(nextItem.amount));
                            var discTaxRateTi = Number(TILine[5]) - Math.abs(Number(nextItem.taxAmount));

                            TILine[3] = parseFloat(discAmountTi).toFixed(2);
                            TILine[5] = parseFloat(discTaxRateTi).toFixed(2);
                        }

                    }
                    //<F> rhuaccha: 2024-09-18
                    lineTIline.push(TILine)
                }
                amountToPay += Number(item.grossAmount);
            }
            // Procesamos cada línea
            lineTIline.forEach(function (line) {
                const key = line[4];
                if (!groupedData[key]) {
                    groupedData[key] = {
                        prefix: line[0],
                        field1: parseInt(line[1], 10),
                        field2: parseInt(line[2], 10),
                        total: parseFloat(line[3]),
                        field4: key,
                        field5: parseFloat(line[5]),
                        suffix: line[6]
                    };
                } else {
                    groupedData[key].field1 = parseInt(line[1], 10);
                    groupedData[key].field2 = parseInt(line[2], 10);
                    groupedData[key].total += parseFloat(line[3]);
                    groupedData[key].field5 += parseFloat(line[5]);
                }
            });
            //<I> Add Consulta si tiene en sus lineas una taza del 15% para TI - JChaveza 25.10.2024
            var tieneTasaImpuest15 = false;
            for (var key in groupedData) {
                var item = groupedData[key];
                if (item.field4 == 15) {
                    tieneTasaImpuest15 = true;
                    break;
                }
            } //<F>

            for (var key in groupedData) {
                var item = groupedData[key];
                //<I> Add condition IF - JChaveza 25.10.2024
                if (item.field4 == 15) {
                    finalResult.push(item.prefix + "|" + item.field1 + "|" + item.field2 + "|" + item.total.toFixed(2) + "|" + item.field4 + "|" + item.field5.toFixed(2) + "|" + item.suffix + "|");
                }
                if (item.field4 == 0 && tieneTasaImpuest15 == false) {
                    finalResult.push(item.prefix + "|" + item.field1 + "|" + item.field2 + "|" + item.total.toFixed(2) + "|" + item.field4 + "|" + item.field5.toFixed(2) + "|" + item.suffix + "|");
                }
                //<F>
            }
            resultArray.push(finalResult);

            //<I> rhuaccha: 2024-09-18
            var calAmount = parseFloat(Number(subtotalWithoutTaxation) - totalDiscAmount).toFixed(2);
            var totalColumn4 = parseFloat(totalposicion4 - totalDiscTaxAmount).toFixed(2);
            var total15Column = parseFloat(total15 - totalDiscTaxAmount).toFixed(2);
            //<F> rhuaccha: 2024-09-18

            // Crear array T line y agregar a resultArray
            // var TLine = ["T", subtotalWithoutTaxation.toFixed(2), descuentototal.toFixed(2), subtotalNotSubject, (subtotalWithoutTaxation + descuentototal).toFixed(2)/*subtotalWithoutTaxation*/, totalposicion4.toFixed(2), ICE, total15.toFixed(2), transactionRecord.total, tip, transactionRecord.total, ""];
            //<I> rhuaccha: 2024-09-18
            var TLine = [
                "T",
                calAmount,
                descuentototal.toFixed(2),
                subtotalNotSubject,
                parseFloat(Number(calAmount) + descuentototal).toFixed(2),//Add Number() JChaveza 25.10.2024
                totalColumn4, // 20.00
                ICE,
                total15Column, // 45.00
                transactionRecord.total,
                tip,
                transactionRecord.total,
                ""];
            //<F> rhuaccha: 2024-09-18
            resultArray.unshift(TLine);

            // Combinar y retornar el array de resultados
            return resultArray.concat(lineArray);
        } catch (e) {
            log.error('Error-getInvoiceTotalAndDetails', e);
        }
    }

            

    function getIALines(transactionRecord) {
        try {
            var IALines = [];
            if (transactionRecord.recordtype == "invoice" && (transactionRecord.documentTypeCode == "01" || transactionRecord.documentTypeCode == "18")) { //& FACTURA Y DOCUMENTO 18
                var emails = getEmails(transactionRecord.customer);
                var addr = getAddress(transactionRecord.customer);
              
                // HU EC JCH 20/02/2024
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion.replace(/(\r\n|\n|\r)/g, ' '), '']) };
                //if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
              
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
              
                // HU EC JCH 20/02/2025
                //IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);
                if (transactionRecord.phone != '') {IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);} else {IALines.push(['IA', 'TELEFONO', '0', '']);}
              
                // HU EC JCH 20/02/2024
                var notafactura = '';
                notafactura = transactionRecord.notaCliente.replace(/(\r\n|\n|\r)/g, ' ');// Quitar saltos de lineas
                notafactura = notafactura.replace(/[^\x00-\x7F]/g, ''); //Función para eliminar caracteres no alfanuméricos, incluyendo caracteres chinos.
                if (transactionRecord.notaCliente) { IALines.push(['IA', 'OBSERVACION', notafactura , '']) };
                //if (transactionRecord.notaCliente) { IALines.push(['IA', 'OBSERVACION', transactionRecord.notaCliente, '']) };

              
                //Inicio - dfernandez 28/08/2024
                //logError('transactionRecordObject', JSON.stringify(transactionRecord));
                transactionRecord.checkNroCuotas == true ? IALines.push(['IA', 'VENCIMIENTO', transactionRecord.duedateforcuote, '']) : IALines.push(['IA', 'VENCIMIENTO', transactionRecord.duedate, '']);
                //Fin - dfernandez 28/08/2024
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);
              
                // HU EC JCH 20/02/2025 CAMPO EMAIL se envia el cliente si no hay detalles de EMAIL
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']); else {IALines.push(['IA', 'CORREO', transactionRecord.customerEmail, '']);}
                //if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
              
                if (transactionRecord.metodoPago.length > 0) {
                    var terms = getTerms(transactionRecord.terms);
                    IALines.push(['IA', 'PLAZO', terms.daysuntilnetdue + ' ' + terms.time, '']);
                }
            } else if (transactionRecord.recordtype == "itemfulfillment") { //& GUIA DE REMISIÓN
                var emails = getEmails(transactionRecord.customer);
                var addr = getAddress(transactionRecord.customer);
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
                IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);
                IALines.push(['IA', 'VENCIMIENTO', transactionRecord.duedate, '']);
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
            } else if (transactionRecord.recordtype == "creditmemo") { //& NOTA DE CREDITO
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
              
            } else if (transactionRecord.recordtype == "invoice" && transactionRecord.documentTypeCode == "05") { //& NOTA DE DEBITO
                var emails = getEmails(transactionRecord.customer);
                var addr = getAddress(transactionRecord.customer);
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
                IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
            } else if (transactionRecord.recordtype == "vendorbill" && transactionRecord.documentTypeCode == "03") { //& LIQUIDACION DE COMPRA
                var emails = getEmails(transactionRecord.vendor);
                var addr = getAddress(transactionRecord.vendor);
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
                IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
            } else if (transactionRecord.recordtype == "vendorbill" && transactionRecord.documentTypeCode == "07") { //& COMPROBANTE DE RETENCION
                var emails = getEmails(transactionRecord.vendor);
                var addr = getAddress(transactionRecord.vendor);
                if (addr.direccion) { IALines.push(['IA', 'DIRECCION', addr.direccion, '']) };
                if (addr.ciudad) { IALines.push(['IA', 'CIUDAD', addr.ciudad, '']) }
                IALines.push(['IA', 'TELEFONO', transactionRecord.phone, '']);
                IALines.push(['IA', 'EMISION', transactionRecord.location, '']);
                if (emails.length) IALines.push(['IA', 'CORREO', emails.join(','), '']);
            }
            return IALines;
        } catch (e) {
            log.error('Error-getIALines', e);
        }
    }

   function getBillDetailLines(transactionRecord) {
            try {
                //logError('Track0', transactionRecord.items)
                var hash = {};
                var array = transactionRecord.items;
                array = array.filter(function (current) {
                    var exists = !hash[current.line];
                    hash[current.line] = true;
                    return exists;
                });

                var resultArray = [];
                var lineArray = [];

                var subtotal12 = 0, subtotal0 = 0, subtotalNotSubject = 0, subtotalWithoutTaxation = 0, totalDescuento = 0, ICE = 0, IVA12 = 0, totalAmount = 0, tip = 0, amountToPay = 0;
                //var TLine = ["T", subtotal12, subtotal0, subtotalNotSubject, subtotalWithoutTaxation, totalDescuento, ICE, IVA12, totalAmount, tip, amountToPay, ""];

                var TILineJson = {}
                //logError('Track4', array)
                for (var i = 0; i < array.length; i++) {
                    var item = array[i];

                    if (item.isWithholdingLine == "T" || !item.taxCode) continue;
                    //logError('Track1', item)
                    //logError('Track', [{ account: item.account }])

                    var DEline = ['DE', item.code.substring(0, 15) ? item.code.substring(0, 15) : item.account.substring(0, 15), item.code.substring(0, 15), item.detail, item.quantity ? item.quantity : 1, item.rate ? item.rate : item.amount, 0, item.amount, ""];
                    //var DEline = ['DE', item.code.substring(0, 15), item.code.substring(0, 15), item.detail, item.quantity, item.rate, 0, item.amount, ""];
                    if (item.taxCode)
                        lineArray.push(DEline);

                    if (item.taxRateCode == '2') {
                        subtotal12 += Number(item.amount);
                        IVA12 += Number(item.taxAmount);
                    }
                    if (item.taxRateCode == '0') subtotal0 += Number(item.amount);
                    if (item.taxRateCode == '6') subtotalNotSubject += Number(item.amount);
                    subtotalWithoutTaxation += Number(item.amount);
                    totalAmount += Number(item.grossAmount);

                    var IMline = ["IM", item.taxCode, item.taxRateCode, item.taxRate, item.amount, parseFloat(item.taxAmount), item.taxName, ""];
                    if (item.taxCode)
                        lineArray.push(IMline);

                    amountToPay += Number(item.grossAmount);
                }

                for (var i = 0; i < array.length; i++) {
                    var item = array[i];
                    if (item.isWithholdingLine == "T" || !item.taxCode) continue;
                    //if (item.taxName == "IVA") continue;
                    //logError('Track3', [{ account: item.account }])
                    // TI LINE
                    var TIKey = item.taxCode + "|" + item.taxRateCode;
                    if (TILineJson[TIKey] === undefined) {
                        TILineJson[TIKey] = [Number(item.amount), item.taxRate, Number(item.taxAmount), item.taxName];
                    } else {
                        TILineJson[TIKey][0] = TILineJson[TIKey][0] + Number(item.amount);
                        TILineJson[TIKey][2] = TILineJson[TIKey][2] + Number(item.taxAmount);
                    }
                }

                //var TLine = ["T", subtotal12, subtotal0, subtotalNotSubject, subtotalWithoutTaxation, totalDescuento, ICE, IVA12, (totalAmount + IVA12), tip, transactionRecord.total, ""];
                var TLine = ["T", subtotal12, subtotal0, subtotalNotSubject, subtotalWithoutTaxation.toFixed(2), totalDescuento, ICE, IVA12, Math.abs(Number((totalAmount + IVA12).toFixed(2))), tip, Math.abs(Number((totalAmount + IVA12).toFixed(2))), ""];
                resultArray.push(TLine);
                //logError('Track2', TILineJson)
                for (var key in TILineJson) {
                    var invoicingTax = key.split("|");
                    var TILine = ["TI", invoicingTax[0], invoicingTax[1], TILineJson[key][0], TILineJson[key][1], TILineJson[key][2], TILineJson[key][3], ""];
                    resultArray.push(TILine);
                }
                return resultArray.concat(lineArray);
            } catch (e) {
                logError('Error-getBillDetailLines', e);
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

    function getTerms(termsId) {
        try {
            if (!termsId) return { daysuntilnetdue: "", time: "" };
            var termRecord = search.lookupFields({
                type: search.Type.TERM,
                id: termsId,
                columns: ["daysuntilnetdue"]
            });
            termRecord.time = "días";
            return termRecord;
        } catch (e) {
            log.error('Error-getTerms', e);
        }
    }
    
    function getPALines(transactionRecord) {
        try {
            var PALines = ["PA", transactionRecord.paymentMethod, transactionRecord.total, "", "", ""];
            if (transactionRecord.terms) {
                var terms = getTerms(transactionRecord.terms);

                // HU EC JCH 20/02/2025
                if (terms.daysuntilnetdue != '') {PALines[3] = terms.daysuntilnetdue;} else {PALines[3] = '0';}
                //PALines[3] = terms.daysuntilnetdue;
              
                PALines[4] = terms.time;
            }
            return PALines;
        } catch (e) {
            log.error('Error-getPALines', e);
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

   function getLineFields(transactionResult) {
            try {
                var items = [];
                var lineJson = {}
                var columns = transactionResult.columns;
                columns.forEach(function (column) {
                    var column_key = column.label || column.name;
                    var isItem = column_key.indexOf("item.");
                    if (isItem != -1) {
                        column_key = column_key.replace("item.", "");
                        lineJson[column_key] = transactionResult.getValue(column);
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