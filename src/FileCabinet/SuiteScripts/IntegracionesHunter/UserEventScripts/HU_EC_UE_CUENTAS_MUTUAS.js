/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/transaction', 'N/search', 'N/record'], function(transaction, search, record) {
    function beforeSubmit(context) {
        try{
            if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
                var newRecord = context.newRecord
                var customForm = newRecord.getValue('customform')
                var subsidiaria = newRecord.getValue('subsidiary')
                var trandate  = newRecord.getValue('trandate')
                var glosa  = newRecord.getValue('memo')
                var approvalStatus = newRecord.getValue('approvalstatus')
                var diarioRelacionado = newRecord.getValue('custbody_diario_relacionado')

                // 128 es el ID correspondiente a la factura con customForm de tipo "Liquidación Compra"
                if (newRecord.type === 'vendorbill' && (customForm === '152' || customForm === '154')) {

                    var cuentasAll = []
                    var cuentasGastos = []
                    var cuentasMutuas = []

                    //Las facturas tienen las lineas de detalle como "expense"
                    var recordLineCount = newRecord.getLineCount({ sublistId: 'expense' });
                    for (let i = 0; i < recordLineCount; i++) {
                        let account = newRecord.getSublistValue({ sublistId: 'expense', fieldId: 'account', line: i });
                        let amount = newRecord.getSublistValue({ sublistId: 'expense', fieldId: 'amount', line: i });
                        let memo = newRecord.getSublistValue({ sublistId: 'expense', fieldId: 'memo', line: i });
                        let department = newRecord.getSublistValue({ sublistId: 'expense', fieldId: 'department', line: i });
                        let clase = newRecord.getSublistValue({ sublistId: 'expense', fieldId: 'class', line: i }); // 04-07-2024

                        
                        cuentasAll.push(account) // Para la búsqueda de cuentas de gastos

                        let searchAccount = search.lookupFields({
                            type: "account",
                            id: account,
                            columns: [
                                'custrecord_ec_localidad_cuenta',
                                'custrecord_ec_cuenta_mutua' // Es True o False
                            ]
                        });

                        let accountLocation = searchAccount.custrecord_ec_localidad_cuenta?.length ? searchAccount.custrecord_ec_localidad_cuenta[0].value : ""
                        if(searchAccount.custrecord_ec_cuenta_mutua){
                            cuentasMutuas.push({
                                account,
                                amount,
                                memo,
                                department,
                                clase, // 04-07-2024
                                accountLocation
                            })
                        }                        

                    }

                    // Revisión de cuentas de gastos en contraste de las cuentas en lineas de transacción
                    let expensecategorySearchObj = search.create({
                        type: "expensecategory",
                        filters:
                        [
                            ["externalid","anyof", cuentasAll]
                        ],
                        columns:
                        [
                            search.createColumn({name: "externalid", label: "ID externo"})
                        ]
                    });
                    let expenseCategoryList = expensecategorySearchObj.run()
                    expenseCategoryList.each( resConsulta => {
                        cuentasGastos.push(resConsulta.getValue({name: "externalid"}))
                        return true;
                    })

                    if(cuentasMutuas.length && cuentasGastos.length === 1){

                        if(!diarioRelacionado){
                            var journalEntry = record.create({
                                type: record.Type.JOURNAL_ENTRY,
                                isDynamic: true
                            });
        
                            journalEntry.setValue({ fieldId: 'customform', value: '131' })
                            journalEntry.setValue({ fieldId: 'memo', value: glosa })
                            journalEntry.setValue({ fieldId: 'trandate', value: trandate })
                            journalEntry.setValue({ fieldId: 'subsidiary', value: subsidiaria })
                        }else{
                            var journalEntry = record.load({
                                type: record.Type.JOURNAL_ENTRY,
                                id: diarioRelacionado,
                                isDynamic: true
                            });
                            let lineCount = journalEntry.getLineCount({ sublistId: 'line' });
                            for (let i = lineCount - 1; i >= 0; i--) {
                                journalEntry.removeLine({ sublistId: 'line', line: i }); // Eliminar las líneas existentes
                            }
                        }
                        

                        if(approvalStatus == "2"){
                            journalEntry.setValue({ fieldId: 'approved', value: true })
                        }else{
                            journalEntry.setValue({ fieldId: 'approved', value: false })
                        }
    
                        for (let i = 0; i < cuentasMutuas.length; i++) {
                            // Añadir la línea de débito (Cuenta de gasto)
                            journalEntry.selectNewLine({ sublistId: 'line' });                            
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: cuentasGastos[0] });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: cuentasMutuas[i].amount });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: cuentasMutuas[i].memo });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: cuentasMutuas[i].department });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: cuentasMutuas[i].clase }); // 04-07-2024
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: cuentasMutuas[i].accountLocation });
                            journalEntry.commitLine({ sublistId: 'line' });
        
                            // Añadir la línea de crédito (Cuentas Mutuas)
                            journalEntry.selectNewLine({ sublistId: 'line' });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: cuentasMutuas[i].account });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: cuentasMutuas[i].amount });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: cuentasMutuas[i].memo });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: cuentasMutuas[i].department });
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'class', value: cuentasMutuas[i].clase }); // 04-07-2024
                            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: cuentasMutuas[i].accountLocation });
                            journalEntry.commitLine({ sublistId: 'line' });
                        }
                        journalEntry.save();
                        if(!diarioRelacionado){
                            newRecord.setValue({fieldId: 'custbody_diario_relacionado', value: journalEntry.id });
                        }                        
                    }

                    // Caso: Usuario borra cuentas mutuas - hay un asiento contable relacionado
                    if(diarioRelacionado && (!cuentasMutuas.length || cuentasGastos.length != 1)){
                        transaction.void({
                            type: transaction.Type.JOURNAL_ENTRY,
                            id: diarioRelacionado
                        });                        
                        newRecord.setValue({fieldId: 'custbody_diario_relacionado', value: '' });                        
                    }
                }
            }
        }catch(error){
            log.error('Error', error);
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
