/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/log'], function (ui, search, log) {

    function onRequest(context) {

        var request  = context.request;
        var response = context.response;

        /* -------------------------------------------------------------
         * 1.  Formulario y filtros
         * ----------------------------------------------------------- */
        var form = ui.createForm({ title: 'Reporte analítico por Cuenta y Cliente' });

        // Cuenta contable
        var cuentaField = form.addField({
            id:    'custpage_cuenta',
            type:  ui.FieldType.SELECT,
            label: 'Cuenta contable',
            source:'account'
        });
        cuentaField.isMandatory = false;

        // Cliente
        var clienteField = form.addField({
            id:    'custpage_cliente',
            type:  ui.FieldType.SELECT,
            label: 'Cliente',
            source:'customer'
        });
        clienteField.isMandatory = false;

        var cuentaSel  = request.parameters.custpage_cuenta  || '';
        var clienteSel = request.parameters.custpage_cliente || '';

        cuentaField.defaultValue  = cuentaSel;
        clienteField.defaultValue = clienteSel;

        form.addSubmitButton({ label:'Filtrar' });

        /* -------------------------------------------------------------
         * 2.  Búsqueda y tabla HTML
         * ----------------------------------------------------------- */
        if (request.method === 'GET' && (cuentaSel || clienteSel)) {

            var filtros = [['mainline','is','F']];          // líneas con monto
            if (cuentaSel)  filtros.push('AND',['account','anyof',cuentaSel]);
            if (clienteSel) filtros.push('AND',['entity','anyof', clienteSel]);

            // ---- Depuración ----
            log.debug('Filtros', JSON.stringify(filtros));

            var tranSearch = search.create({
                type:  search.Type.TRANSACTION,
                filters: filtros,
                columns:[
                    'account',
                    'entity',
                    search.createColumn({
                        name:    'formulatext',
                        formula: '{entity.vatregnumber}',
                        label:   'ruc_formula'
                    }),
                    'tranid',
                    'trandate',
                    'type',
                    search.createColumn({ name:'amount', sort:search.Sort.DESC })
                ]
            });

            var results = tranSearch.run().getRange({ start:0, end:1000 });

            log.debug('Filas encontradas', results.length);

            /* ---------- Construir tabla HTML ---------- */
            var html  = '<style>table{width:100%;border-collapse:collapse;font-size:12px}'
                      + 'th,td{border:1px solid #ccc;padding:4px}th{background:#f2f2f2}</style>';
            html += '<table><thead><tr>'
                  + '<th>Cuenta</th><th>Cliente</th><th>RUC</th>'
                  + '<th>Documento</th><th>Fecha</th><th>Tipo</th><th>Monto</th>'
                  + '</tr></thead><tbody>';

            results.forEach(function(r){
                html += '<tr>'
                      + '<td>'+ (r.getText('account') || '') +'</td>'
                      + '<td>'+ (r.getText('entity')  || '') +'</td>'
                      + '<td>'+ (r.getValue({name:'formulatext'}) || '') +'</td>'
                      + '<td>'+ (r.getValue('tranid') || '') +'</td>'
                      + '<td>'+ (r.getValue('trandate') || '') +'</td>'
                      + '<td>'+ (r.getText('type') || '') +'</td>'
                      + '<td style="text-align:right">'+ (r.getValue('amount') || '0.00') +'</td>'
                      + '</tr>';
            });

            if (results.length === 0){
                html += '<tr><td colspan="7" style="text-align:center">'
                      + 'No se encontraron transacciones para los filtros seleccionados.'
                      + '</td></tr>';
            }

            html += '</tbody></table>';

            var htmlField = form.addField({
                id:   'custpage_html',
                type: ui.FieldType.INLINEHTML,
                label:'&nbsp;'
            });
            htmlField.defaultValue = html;
        }

        response.writePage(form);
    }
    return { onRequest:onRequest };
});
