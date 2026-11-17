/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
*/
define(['N/currentRecord', 'N/search'], function (currentRecord, search) {

    let typeMode = "";

    function pageInit(context) {
        typeMode = context.mode;
        var currentRecord = context.currentRecord;
        console.log("typeMode", typeMode);
        try {
            if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
                var selectField = currentRecord.getField('custbody_ts_related_transaction');
                selectField.isDisplay = false;
            }
        } catch (error) {
            console.log('error pageInit', error);
        }
    }

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var FieldName = context.fieldId;
        try {
            if (typeMode == 'create' || typeMode == 'copy' || typeMode == 'edit') {
                if (FieldName == 'custpage_lista_transaccion') {
                    var id_transaccion = currentRecord.getValue('custpage_lista_transaccion');
                    currentRecord.setValue('custbody_ts_related_transaction', id_transaccion);
                }
                if (FieldName == 'custbody_ts_op') {
                    var idBeneficiario = currentRecord.getValue('custbody_ts_op');
                    console.log('idBeneficiario', idBeneficiario)

                    var selectField = currentRecord.getField('custpage_lista_transaccion');
                    selectField.removeSelectOption({
                        value: null,
                    });
                    selectField.insertSelectOption({
                        value: '',
                        text: ''
                    });
                    cargarTransacciones(selectField, idBeneficiario);
                    currentRecord.setValue('custbody_ts_related_transaction', '');
                }
            }
        } catch (error) {
            console.log('error fieldChanged', error);
        }
    }

    function cargarTransacciones(selectField, id) {
        try {
            var searchResult = search.create({
                type: "transaction",
                filters:
                    [
                        ["type", "anyof", "VendBill", "PurchOrd"],
                        "AND",
                        ["status", "anyof", "VendBill:A", "PurchOrd:F", "PurchOrd:E", "PurchOrd:D", "PurchOrd:B"],
                        "AND",
                        ["paymenthold", "is", "F"],
                        "AND",
                        ["approvalstatus", "anyof", "2"],
                        "AND",
                        ["name", "anyof", id],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "ID interno" }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "{tranid}",
                            label: "Fórmula (texto)"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "{type}",
                            label: "Fórmula (texto)"
                        })
                    ]
            });

            var searchResultCount = searchResult.runPaged().count;

            console.log('searchResultCount', searchResultCount)
            console.log('selectField', selectField)
            var pagedData = searchResult.runPaged({
                pageSize: 1000,
            });

            var page, columns;

            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index,
                });

                page.data.forEach(function (result) {
                    columns = result.columns;
                    let id = result.getValue(columns[0]);
                    let text = result.getValue(columns[1]);
                    let tipo = result.getValue(columns[2]);
                    selectField.insertSelectOption({
                        value: id,
                        text: tipo + ' #' + text
                    });
                })

            })

        } catch (e) {
            log.error('cargarTransacciones', e);
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    }
});

