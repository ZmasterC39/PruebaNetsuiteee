/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *gato
 */
define(['N/search', 'N/log', 'N/record'], function (search, log, record) {

    function getCustomerAltname(context) {
        try {
            var customerId = context.codigocliente;
            if (!customerId) {
                return {
                    status: '202',
                    message: 'El campo codigocliente es obligatorio'
                };
            }

            var customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: [
                    ['entityid', 'is', 'C-PE-' + customerId]
                ],
                columns: [
                    'altname'
                ]
            });

            var resultSet = customerSearch.run();
            var results = resultSet.getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                return {
                    status: '200',
                    result: [
                        {
                            NOMBRE_COMPLETO: results[0].getValue('altname')
                        }
                    ]
                };
            } else {
                return {
                    status: '404',
                    message: 'Cliente no encontrado'
                };
            }

        } catch (e) {
            log.error({
                title: 'Error retrieving customer altname',
                details: e.message
            });

            return {
                status: '500',
                message: 'Error interno'
            };
        }
    }

    function getCustomerPhones(context) {
        try {
            var customerId = context.codigocliente;
            if (!customerId) {
                return {
                    status: '202',
                    message: 'El campo codigocliente es obligatorio'
                };
            }

            var customerSearch = search.create({
                type: search.Type.CUSTOMER,
                filters: [
                    ['entityid', 'is', 'C-PE-' + customerId]
                ],
                columns: [
                    'phone'
                ]
            });

            var resultSet = customerSearch.run();
            var results = resultSet.getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                return {
                    status: '200',
                    result: [
                        {
                            CODIGO: '004',
                            TIPO: 'CELULAR',
                            TELEFONO: results[0].getValue('phone') && results[0].getValue('phone').startsWith('+51')
                                ? results[0].getValue('phone').replace('+51', '')
                                : results[0].getValue('phone')
                        }
                    ]
                };
            } else {
                return {
                    status: '404',
                    message: 'Cliente no encontrado'
                };
            }

        } catch (e) {
            log.error({
                title: 'Error retrieving customer phones',
                details: e.message
            });

            return {
                status: '500',
                message: 'Error interno'
            };
        }
    }


    /*function _post(context) {
        if (context.op === 'WS_Cliente_Datos') {
            return getCustomerAltname(context);
        } if (context.op === 'WS_Cliente_Telefono') {
            return getCustomerPhones(context);
        }
    }*/

      function getRecorrido(params) {

        const rec = record.load({
    type: 'customrecord_ht_record_recorrido',
    id: 1 // usa un ID real
});

const fields = rec.getFields(); // devuelve TODOS los campos

let result = {};

fields.forEach(f => {
    result[f] = rec.getValue(f);
});

log.debug("Campos y valores:", result);
    }

function _post(context) {
  getRecorrido()
}
    

    return {
        post: _post
    }
});
