/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
define(['N/runtime', 'N/search', 'N/ui/dialog', 'N/query', 'N/record', 'N/log', 'N/format'], function (runtime, search, dialog, query, record, log, format) {

    const Factura_Compra = 'vendorbill';
    const VENDOR_BILL = 'vendorbill';
    const BILL_CREDIT = 'vendorcredit';
    const CREDIT_MEMO = 'creditmemo'; // HU JCH 23/07/2025
    let FORM_NOTA_CREDITO = '132'; // HU JCH 23/07/2025
    var typeMode = '';
    var customer_old = '';
    var pe_number_old = '';


    function pageInit(context) {
        try {
            typeMode = context.mode;
            // console.log(typeMode)
            var currentRecord = context.currentRecord;
            var type_transaction = currentRecord.type;
            if (typeMode == 'edit') {
                customer_old = currentRecord.getValue({ fieldId: 'entity' });
                pe_number_old = currentRecord.getValue({ fieldId: 'custbody_ts_ec_numero_preimpreso' });
                serie_old = currentRecord.getValue({ fieldId: 'custbody_ts_ec_serie_doc_cxp' }); // HU EC JCH 25/03/2025
                subsidiary_old = currentRecord.getValue({ fieldId: 'subsidiary' }); // HU EC JCH 25/03/2025
            }
            let userObj = runtime.getCurrentUser();
            console.log('User', userObj.id)
        } catch (e) {
            console.log('Error en: ' + e);
        }
    }

    function saveRecord(context) {
        let userObj = runtime.getCurrentUser();
        var currentRecord = context.currentRecord;
        var sublistName = context.sublistId;
        var typeTransaction = currentRecord.type;
        var oldRecord = context.oldRecord;
        if (typeTransaction == VENDOR_BILL || typeTransaction == BILL_CREDIT) {
            let tipoDocumentoFiscal = currentRecord.getValue({ fieldId: 'custbodyts_ec_tipo_documento_fiscal' });
            if (tipoDocumentoFiscal != '10') {
              if (typeMode == 'create' || typeMode == 'copy') {
                let customer = currentRecord.getValue({ fieldId: 'entity' });
                let pe_number = currentRecord.getValue({ fieldId: 'custbody_ts_ec_numero_preimpreso' });
                let doc_fiscal = currentRecord.getValue({ fieldId: 'custbodyts_ec_tipo_documento_fiscal' });
                let doc_serie = currentRecord.getValue({ fieldId: 'custbody_ts_ec_serie_doc_cxp' }); // HU EC JCH 25/03/2025
                let subsidiary = currentRecord.getValue({ fieldId: 'subsidiary' }); // HU EC JCH 25/03/2025
                
                console.log('customer', customer);
                console.log('pe_number', pe_number);
                log.debug('customer....', customer);
                log.debug('pe_number....', pe_number);
                log.debug('doc_fiscal....', doc_fiscal);
                log.debug('doc_serie....', doc_serie);
                log.debug('subsidiary....', subsidiary);
                
                let existe = buscarFacCompra(customer, pe_number, doc_fiscal, doc_serie, subsidiary);
                console.log('Usuario', userObj.id);
                console.log(existe)
                if (existe) {
                    // if (existe || userObj.id == 4 || userObj.id == 13) {
                    //dialog.alert({ title: 'Alerta', message: 'Ya existe una Transacción de Compra con el mismo Proveedor y Numero Preimpreso.' });
                    dialog.alert({ title: 'Alerta', message: 'Ya existe una Transacción de Compra con el mismo Proveedor y Número de documento.' }); // HU EC JCH 25/03/2025
                    return false;
                }

                if (currentRecord.getValue({ fieldId: 'custbody_ts_ec_numero_preimpreso' }).length != 9 && doc_fiscal != 10 && userObj.id != 4) {
                    dialog.alert({ title: 'Alerta', message: 'El número preimpreso debe tener 9 dígitos.' });
                    return false;
                }
            } else if (typeMode == 'edit') {
                var customer = currentRecord.getValue({ fieldId: 'entity' });
                var pe_number = currentRecord.getValue({ fieldId: 'custbody_ts_ec_numero_preimpreso' });
                let doc_fiscal = currentRecord.getValue({ fieldId: 'custbodyts_ec_tipo_documento_fiscal' });
                let doc_serie = currentRecord.getValue({ fieldId: 'custbody_ts_ec_serie_doc_cxp' }); // HU EC JCH 25/03/2025
                let subsidiary = currentRecord.getValue({ fieldId: 'subsidiary' }); // HU EC JCH 25/03/2025
                
                console.log('customer', customer);
                if (customer != customer_old || pe_number != pe_number_old || doc_serie != serie_old) {
                    let existe = buscarFacCompra(customer, pe_number, doc_fiscal, doc_serie, subsidiary);
                    if (existe) {
                        //dialog.alert({ title: 'Alerta', message: 'Ya existe una Transacción de Compra con el mismo Proveedor y Numero Preimpreso.' });
                        dialog.alert({ title: 'Alerta', message: 'Ya existe una Transacción de Compra con el mismo Proveedor y Número de documento.' }); // HU EC JCH 25/03/2025
                        return false;
                    }
                }

                if (currentRecord.getValue({ fieldId: 'custbody_ts_ec_numero_preimpreso' }).length != 9 && userObj.id != 4) {
                    dialog.alert({ title: 'Alerta', message: 'El número preimpreso debe tener 9 dígitos.' });
                    return false;
                }
            }
            }
            
        }

        // JCH 23/07/2025
            if (typeTransaction == CREDIT_MEMO) {
                if (typeMode == 'create' || typeMode == 'copy') {

                    let getForm = currentRecord.getValue({ fieldId: 'customform' });
                    let subsidiary2 = currentRecord.getValue({ fieldId: 'subsidiary' });
                    let internalidcliente = currentRecord.getValue({ fieldId: 'entity' });
                    
                    if ((FORM_NOTA_CREDITO == getForm) && (subsidiary2 == 2)) {
                        log.debug('mensaje', 'Entro a validar fecha creditmemo');

                        log.debug('internalidcliente', internalidcliente);

                        // VERIFICA CLIENTE CONSUMIDOR FINAL
                        var clienteconsumidorfinal = 'N';
                        clienteconsumidorfinal  = verificaclienteconsumidorfinal(internalidcliente);

                        log.debug('clienteconsumidorfinal', clienteconsumidorfinal);

                        if (clienteconsumidorfinal == 'S') {
                            dialog.alert({ title: 'Alerta', message: 'La identificación del cliente no esta permitada para generar la Nota de Crédito.' });
                            return false;
                        }


                        var internaidfac = currentRecord.getValue({ fieldId: 'createdfrom' });
                        var creditMemoDatereg = currentRecord.getValue({ fieldId: 'trandate' });
                        
                        var objFacturaNc = search.lookupFields({
                          type: search.Type.INVOICE,
                          id: internaidfac,
                          columns: ['trandate']
                         });

                        var invoiceDate = objFacturaNc.trandate;
                        var creditMemoDate = formatDate(creditMemoDatereg);
                      
                        log.debug('invoiceDate', invoiceDate);
                        log.debug('creditMemoDate', creditMemoDate);


                        // Convertir a objetos Date
                        var partes1 = invoiceDate.split('/');
                        var partes2 = creditMemoDate.split('/');

                        var date1 = new Date(partes1[2], partes1[1] - 1, partes1[0]); // Año, Mes (0-index), Día
                        var date2 = new Date(partes2[2], partes2[1] - 1, partes2[0]);

                        // Calcular diferencia en milisegundos
                        var diffTime = date2 - date1;

                        // Convertir a días
                        var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        log.debug('diffDays', diffDays);

                        // SE COMENTA TEMPORALMENTE
                        /*
                        if ((diffDays) > 365) {

                           dialog.alert({ title: 'Alerta', message: 'La fecha de emisión de la nota de crédito no puede exceder los 12 meses desde la fecha de la factura original.' });
                           return false;

                         }
                         */

                    }

                }
                
            } // END CREDIT_MEMO

            
      
        if (userObj.id == 4) {
            console.log('Usuario', userObj.id)
            return true
        } else {
            return true
        }
        //return true;
    }

    function validateField(context) { }

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var sublistName = context.sublistId;
        var sublistFieldName = context.fieldId;
        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
            if (sublistName == 'expense') {
                try {
                    if (sublistFieldName == 'taxcode') {
                        let descriptionTaxCode = getDescriptionTaxCode();
                        let descTaxCode = descriptionTaxCode.find(element => element.id == currentRecord.getCurrentSublistValue({ sublistId: "expense", fieldId: "taxcode" }))
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_tst_desc_iva', value: descTaxCode.description, ignoreFieldChange: true });
                    }
                } catch (error) { }
            }

            if (sublistName == 'item') {
                try {
                    if (sublistFieldName == 'taxcode') {
                        let descriptionTaxCode = getDescriptionTaxCode();
                        let descTaxCode = descriptionTaxCode.find(element => element.id == currentRecord.getCurrentSublistValue({ sublistId: "item", fieldId: "taxcode" }))
                        currentRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tst_desc_iva', value: descTaxCode.description, ignoreFieldChange: true });
                    }
                } catch (error) { }
            }
        }
    }

    function postSourcing(context) { }

    function lineInit(context) {
        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            let descriptionTaxCode = getDescriptionTaxCode();
            if (sublistName === 'expense') {
                try {
                    let descTaxCode = descriptionTaxCode.find(element => element.id == currentRecord.getCurrentSublistValue({ sublistId: "expense", fieldId: "taxcode" }))
                    console.log(descTaxCode);
                    currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_tst_desc_iva', value: descTaxCode.description });
                } catch (error) {

                }
            }
        }
    }

    function validateDelete(context) { }

    function validateInsert(context) { }

    function sublistChanged(context) {
        //console.log('Init');
        if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
            var currentRecord = context.currentRecord;
            var sublistName = context.sublistId;
            // var op = context.operation;
            let descriptionTaxCode = getDescriptionTaxCode();
            if (sublistName === 'expense') {
                let descTaxCode = descriptionTaxCode.find(element => element.id == currentRecord.getCurrentSublistValue({ sublistId: "expense", fieldId: "taxcode" }))
                console.log(descTaxCode);
                currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'custcol_tst_desc_iva', value: descTaxCode.description });
            }

        }
    }

   // JCH 23/07/2025
   function verificaclienteconsumidorfinal(internalid) {
    var resultado = 'N';

    var busquedaCliente = search.create({
        type: "customer",
        filters:
        [
           ["vatregnumber","contains","9999999999"], 
           "AND", 
           ["subsidiary","anyof","2"], 
           "AND", 
           ["internalid","anyof", internalid]
        ],
        columns:
        [
           search.createColumn({name: "entityid", label: "ID"})
        ]
     });
     var myResultSetCliente = busquedaCliente.run().getRange({ start: 0, end: 1000 });
     var CountRegistro = busquedaCliente.runPaged().count;

     if ((CountRegistro) > 0) {
        resultado = 'S';
     }
   
     return resultado;
    
   }
   

   
   // JCH 23/07/2025
   function formatDate(dateObj) {
    if (!(dateObj instanceof Date)) {
        dateObj = new Date(dateObj); // en caso de que venga como string
    }

    var day = dateObj.getDate().toString().padStart(2, '0');
    var month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    var year = dateObj.getFullYear();

    return day + '/' + month + '/' + year;
     
   }

   

    // HU EC JCH 25/03/2025 custbody_ts_ec_serie_doc_cxp, subsidiary
    const buscarFacCompra = (idCustomer, preimpreso, docFiscal, serie, subsidiary) => {
        var vendorbillSearchObj = search.create({
            type: "transaction",
            filters:
                [
                    ["type", "anyof", "VendBill", "VendCred"],
                    "AND",
                    ["name", "anyof", idCustomer],
                    "AND", 
                    ["custbody_ts_ec_serie_doc_cxp","is", serie], 
                    "AND",
                    ["custbody_ts_ec_numero_preimpreso", "is", preimpreso],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["custbodyts_ec_tipo_documento_fiscal", "anyof", docFiscal],
                    "AND", 
                    ["subsidiary","anyof", subsidiary]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "ID interno" })
                ]
        });
        let objRecord = vendorbillSearchObj.run().getRange(0, 1000);
        let existe = false;
        if (objRecord.length > 0) {
            existe = true;
        }
        return existe
    }

    const getDescriptionTaxCode = () => {
        // console.log('getDescriptionTaxCode')
        let json = new Array();
        let objSearch = search.create({
            type: "salestaxitem",
            filters: [],
            columns:
                [
                    "internalid",
                    search.createColumn({ name: "name", sort: search.Sort.DESC, label: "Name" }),
                    search.createColumn({ name: "description", label: "Description" })
                ]
        });
        //var searchResultCount = salestaxitemSearchObj.runPaged().count;
        objSearch.run().each((result) => {
            json.push({ id: result.getValue('internalid'), description: result.getValue('description') })
            return true;
        });
        return json;
    }


    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        //validateField: validateField,
        fieldChanged: fieldChanged,
        //postSourcing: postSourcing,
        //lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        //sublistChanged: sublistChanged
    }
});