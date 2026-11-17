/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/file', 'N/search'], function (log, record, file, search) {

    function _get(context) {
        try {

            var resService

            log.debug('option', context.option);
            log.debug('customer', context.customer);
            //var parametro1 = context.request.parameters.option;


            if (context.option == 'depositos_by_cliente') {

                //buscar en la lista de cliente por codigo cliente
                var busquedaCustomer = search.create({
                    type: search.Type.CUSTOMER,
                    columns: ['entityid', 'altname', 'internalid'],
                    filters: ['entityid', search.Operator.IS, context.customer]
                });

                var resultSet = busquedaCustomer.run();
                var results = resultSet.getRange({ start: 0, end: 1 }); // Obtén la primera fila

                if (results && results.length > 0) {
                    // El cliente fue encontrado, results[0] contiene la información
                    var cliente = results[0];
                    var entityId = cliente.getValue('entityid');
                    var altName = cliente.getValue('altname');
                    var internalId = cliente.getValue('internalid');

                    // Haz algo con la información recuperada
                    log.debug('Cliente encontrado:', 'ID Interno: ' + internalId + ', Nombre: ' + altName + ', Email: ' + entityId);

                    var busquedaDepositosClientes = search.create({
                        type: search.Type.CUSTOMER_DEPOSIT,
                        columns: ['trandate', 'customer', 'amount'], // Utiliza nombres de columnas válidos para CUSTOMER_DEPOSIT
                        filters: []
                    });

                    // Ejecutar la búsqueda
                    var resultSet = busquedaDepositosClientes.run();

                    // Iterar sobre los resultados
                    resultSet.each(function (result) {
                        // Obtener valores de las columnas
                        var trandate = result.getValue('trandate');
                        var customer = result.getValue('customer');
                        var amount = result.getValue('amount');

                        //var collectedamount = result.getValue('collectedamount');
                        /*var customerId = result.getValue('customer');
                        var memo = result.getValue('memo');
                        var paymentMethod = result.getValue('paymentmethod');
                        var status = result.getValue('status');
                        */
                        // Hacer algo con la información recuperada
                        //log.debug('Depósito de Cliente encontrado:', 'Fecha: ' + trandate + ',  Cliente: ' + customerId + ', Memo: ' + memo + ', Método de Pago: ' + paymentMethod + ', Estado: ' + status);

                        log.debug('Depósito de Cliente encontrado:', 'Fecha: ' + trandate);
                        log.debug('Depósito de Cliente encontrado:', 'customer: ' + customer);
                        log.debug('Depósito de Cliente encontrado:', 'amount: ' + amount);

                        // Devolver true para continuar recorriendo los resultados
                        return true;
                    });

                    // Si no se encuentran resultados, puedes devolver un mensaje o realizar alguna acción
                    if (!resultSet.length) {
                        log.debug('No se encontraron depósitos de clientes.');
                    }

                } else {
                    resService = 'El cliente' + context.customer + ' no fue encontrado'
                    // El cliente no fue encontrado
                    log.debug('Cliente no encontrado', 'No se encontró un cliente con el ID ' + context.customer);
                }


            }

            // let fileObj = file.create({
            //     name: 'PruebaPcordova.txt',
            //     fileType: file.Type.PLAINTEXT,
            //     contents: 'Hello World\nHello World ! 1'
            // })

            // fileObj.encoding = file.encoding.MAC_ROMAN
            // fileObj.folder = 30

            // let idfile = fileObj.save();

            // let miEjecucion = task.create({
            //     taskType: task.TaskType.SCHEDULED_SCRIPT,
            //     scriptId: 'customscript_ns_ss_orden_venta',
            //     deploymentId: 'customdeploy_ns_ss_orden_venta'
            // });
            // let miRespuesta = miEjecucion.submit();
            // log.debug('Respuesta', miRespuesta);

            //log.debug('Request', context.id);
            // let customer = "12881";
            // let objRecord = record.load({ type: record.Type.CUSTOMER_DEPOSIT, customer: customer, isDynamic: true });

            /*let objRecord = record.load({ type: record.Type.CUSTOMER_DEPOSIT, id: '108917'});
            log.debug('Busqueda.........', objRecord);*/
            //let objRecord = record.load({ type: record.Type.CUSTOMER, id: idcustomer, isDynamic: true });

            /*let payment = objRecord.getValue({ fieldId: 'payment' });
            let trandate = objRecord.getValue({ fieldId: 'trandate' });
            let memo = objRecord.getValue({ fieldId: 'memo' });
            let customer = objRecord.getValue({ fieldId: 'customer' });
            let internalid = objRecord.getValue({ fieldId: 'internalid' });
            let customerdeposit = objRecord.getValue({ fieldId: 'customerdeposit' });
            */
            return {
                result: resService
            }
        } catch (error) {
            log.error('Error-GET', error)
        }

    }

    function _post(context) {
        try {


            //REQUEST
            log.debug('Request', context);
            //let customerform = '67';
            //let customer = '171596';
            //let payment = '100';
            let currency = '1'
            let exchangerate = '1';
            let subsidiary = '2';
            //const start = Date.now();
            //let postingperiod='117';
            //let meno='Prueba de recibo';
            //let paymentoption='1';
            let undepfunds = 'T';
            //let trandate ='12/06/2022'; //mes-dia-año
            let customerform = context.customerform; // 198 producccion
            //let customer = context.customer;
            let vatregnumber = context.customer;
            let payment = context.payment;
            let checknumber = context.checknumber
            //const start = Date.now();
            //let postingperiod='117';
            let meno = context.meno;
            let paymentoption = context.paymentoption;
            let department = context.department
            let clases = context.clase
            let location = context.location
            let usuario = context.usuario
            //let undepfunds='T';
            //let trandate ='12/06/2022'; //mes-dia-año

            // consulta de internalId
            var busquedaCustomer = search.create({
                type: search.Type.CUSTOMER,
                columns: ['entityid', 'altname', 'internalid'],
                filters: ['internalid', 'is', vatregnumber]
            });
            var myResultSet = busquedaCustomer.run().getRange({ start: 0, end: 1 });;
            log.debug('Busqueda.........', myResultSet);
            log.debug('Usuario Ingreso.........', usuario);
            var theCount = busquedaCustomer.runPaged().count;
            if (theCount != 1) {
                log.debug('Busqueda.Error........', myResultSet);
            } else {
                //consulta de customer el id
                var customer = myResultSet[0].getValue(busquedaCustomer.columns[2]);
                log.debug('customer........', customer);
                // CREATION ORDER RECORD
                let objRecord = record.create({ type: record.Type.CUSTOMER_DEPOSIT });

                //PRIMARY INFORMATION
                objRecord.setValue({ fieldId: 'customform', value: customerform });
                objRecord.setValue({ fieldId: 'customer', value: customer });
                objRecord.setValue({ fieldId: 'payment', value: payment });
                objRecord.setValue({ fieldId: 'currency', value: currency });
                objRecord.setValue({ fieldId: 'exchangerate', value: exchangerate });
                objRecord.setValue({ fieldId: 'trandate', value: new Date(context.fecha) })
                // objRecord.setValue({ fieldId: 'postingperiod', value: postingperiod });
                objRecord.setValue({ fieldId: 'memo', value: meno });
                objRecord.setValue({ fieldId: 'paymentoption', value: paymentoption });
                //objRecord.setValue({ fieldId: 'paymentinstrumenttype', value: paymentoption });
                //objRecord.setValue({ fieldId: 'paymentmethodtypeid', value: paymentoption });
                objRecord.setValue({ fieldId: 'undepfunds', value: undepfunds });

                objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });
                objRecord.setValue({ fieldId: 'department', value: department });
                objRecord.setValue({ fieldId: 'class', value: clases });
                objRecord.setValue({ fieldId: 'location', value: location });
                if (paymentoption == '2') {

                    objRecord.setValue({ fieldId: 'checknumber', value: checknumber });
                }
                let recordId = objRecord.save({ ignoreMandatoryFields: false });
                log.debug('paymentoption', paymentoption);
                log.debug('Recibo', recordId);

            }

            return "Grabado..........";

        } catch (error) {
            log.error('Error', error);
        }
    }

    function _put(context) {
        try {
            log.debug('Result', 'Hola Mundo..put.');
        } catch (error) {
            log.error('Error', error);
        }

    }

    function _delete(context) {
        try {
            log.debug('Result', 'Hola Mundo..delete.');
        } catch (error) {
            log.error('Error', error);
        }

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});