/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/runtime', 'N/task'], function (serverWidget, search, record, runtime, task) {

    function beforeLoad(context) {
        const eventType = context.type;
        try {
            var objRecord = context.newRecord;
            log.error('eventType', eventType)
            if (eventType == 'edit' || eventType == 'copy' || eventType == 'create') {

                var plantilla = context.form;

                var selectField = plantilla.addField({
                    id: 'custpage_lista_transaccion',
                    type: serverWidget.FieldType.SELECT,
                    label: 'TRANSACCIÓN RELACIONADA'
                });

                plantilla.insertField({
                    field : selectField,
                    nextfield : 'custbody_ts_related_transaction'
                });

                selectField.addSelectOption({
                    value: '',
                    text: ''
                });

                var idBeneficiario = objRecord.getValue('custbody_ts_op');

                if (idBeneficiario != null && idBeneficiario != '') {
                    cargarTransacciones(selectField, idBeneficiario);
                }

                var idTransaccion = objRecord.getValue('custbody_ts_related_transaction')

                log.error('idTransaccion',idTransaccion)
                if (idTransaccion != null && idTransaccion != '') {
                    objRecord.setValue('custpage_lista_transaccion',idTransaccion)
                }

            }
        } catch (e) {
            log.error('Error en beforeLoad', e);
        }
    }

    function beforeSubmit(context) {
        try {

        } catch (e) {
            log.error('Error en beforeSubmit', e);
        }
    }

    function afterSubmit(context) {
        const eventType = context.type;
        const oldObjRecord = context.oldRecord;
        try {

        } catch (e) {
            log.error('Error en afterSubmit', e);
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
                        ["mainline","is","T"]
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

            log.error('searchResultCount',searchResultCount)
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
                    selectField.addSelectOption({
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
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});