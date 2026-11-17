/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _get_consulta_facturas_da_con_saldo(){
        
        let Resultado = [];

        try {
            
            var busquedaFactura = search.create({
                type: "invoice",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                [
                   ["voided","is","F"], 
                   "AND", 
                   ["mainline","is","T"], 
                   "AND", 
                   ["subsidiary","anyof","2"], 
                   "AND", 
                   ["type","anyof","CustInvc"], 
                   "AND", 
                   ["taxline","is","F"], 
                   "AND", 
                   ["memo","startswith","Facturación Debito automatico"],
                   "AND", 
                   ["amountremaining","greaterthan","0.00"]

                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "trandate", label: "Fecha"}),
                   search.createColumn({name: "location", label: "Oficina"}),
                   search.createColumn({name: "entity", label: "Nombre"}),
                   search.createColumn({name: "tranid", label: "Número de documento"}),
                   search.createColumn({name: "custbody_ts_ec_serie_cxc", label: "EC - SERIE CxC"}),
                   search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "EC - NUMERO PREIMPRESO"}),
                   search.createColumn({name: "amountpaid", label: "Importe pagado"}),
                   search.createColumn({name: "amountremaining", label: "Importe restante"}),
                   search.createColumn({name: "amount", label: "Importe"}),
                ]
             });

            let searchResult = busquedaFactura.runPaged();
            searchResult.pageRanges.forEach(function (pageRange) {
            let myPage = searchResult.fetch({ index: pageRange.index });
            myPage.data.forEach(function (result) {
            Resultado.push({
               
                internalid: result.getValue(busquedaFactura.columns[0]),// codigo factura
                trandate: result.getValue(busquedaFactura.columns[1]), // fecha factura
                location: result.getValue(busquedaFactura.columns[2]), // oficina
                entity: result.getText(busquedaFactura.columns[3]), // cliente
                tranid: result.getValue(busquedaFactura.columns[4]), // numero documento
                serie: result.getText(busquedaFactura.columns[5]), // serie
                numeropreimpreso: result.getValue(busquedaFactura.columns[6]),// numero pre impreso
                importepagado: result.getValue(busquedaFactura.columns[7]), // importe pagado
                importerestante: result.getValue(busquedaFactura.columns[8]), // importe restante
                importe: result.getValue(busquedaFactura.columns[9]) // importe
               

               });
             });
           });

           

            /*return JSON.stringify({
                results: Resultado
             });
             */

             return Resultado;


        } catch (error) {
            log.error('Error', error);
        }

    }


    return {
        get: _get_consulta_facturas_da_con_saldo,

    }
});