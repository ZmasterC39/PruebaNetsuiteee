/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log','N/record','N/search','N/query'], function(log, record, search, _const, query){


   function _Get_ObtieneOrdenesServicio(context){

     let Resultado = [];

      try{

         var busquedaOrdenes = search.create({
            type: "salesorder",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["voided","is","F"], 
               "AND", 
               ["subsidiary","anyof","2"], 
               "AND", 
               ["type","anyof","SalesOrd"], 
               "AND", 
               ["customermain.internalid","anyof","47445"], 
               "AND", 
               ["item.description","isnotempty",""], 
               "AND", 
               ["taxline","is","F"], 
               "AND", 
               ["item.type","noneof","Discount"], 
               "AND", 
               ["account.type","noneof","OthCurrAsset"]
               
            ],
            columns:
            [
               search.createColumn({name: "location", label: "OFICINA"}),
               search.createColumn({name: "tranid", label: "Número de documento"}),
               search.createColumn({name: "trandate", label: "Fecha"}),
               search.createColumn({name: "custbody_ht_so_bien", label: "Bien"}),
               search.createColumn({
                  name: "created",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "BIEN FECHA CREACION"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_placa",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "PLACA"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_chasis",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "CHASIS"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_motor",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "MOTOR"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_marca",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "MARCA"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_modelo",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "MODELO"
               }),
               search.createColumn({name: "amount", label: "Importe"}),
               search.createColumn({name: "memo", label: "Nota"}),
               search.createColumn({name: "custbody_ht_os_ejecutivareferencia", label: "EJECUTIVA REFERENCIA"}),
               search.createColumn({name: "statusref", label: "Estado"}),
               search.createColumn({name: "createdby", label: "Creado por"}),
               search.createColumn({
                  name: "itemid",
                  join: "item",
                  label: "CODIGO ITEM"
               }),
               search.createColumn({
                  name: "salesdescription",
                  join: "item",
                  label: "DESRIPCION ITEM"
               }),
               search.createColumn({
                  name: "internalid",
                  join: "item",
                  label: "ID INTERNO ITEM"
               }),
               search.createColumn({name: "custbody_ht_os_trabajado", label: "HT OS Trabajado"}),
               search.createColumn({name: "custbody_ht_os_consideracion", label: "INFORMACION DE DIRECCION DE TRABAJO "}),
               search.createColumn({name: "internalid", label: "ID interno"})
            ]
         });

         let searchResult = busquedaOrdenes.runPaged();
         searchResult.pageRanges.forEach(function (pageRange) {
         let myPage = searchResult.fetch({ index: pageRange.index });
         myPage.data.forEach(function (result) {
            Resultado.push({
               
               oficina: result.getText(busquedaOrdenes.columns[0]),
               numerodocumento: result.getValue(busquedaOrdenes.columns[1]),
               fecha: result.getValue(busquedaOrdenes.columns[2]),
               bien: result.getText(busquedaOrdenes.columns[3]),
               bienfechacreacion: result.getValue(busquedaOrdenes.columns[4]),
               placa: result.getValue(busquedaOrdenes.columns[5]),
               chasis: result.getValue(busquedaOrdenes.columns[6]),
               motor: result.getValue(busquedaOrdenes.columns[7]),
               marca: result.getText(busquedaOrdenes.columns[8]),
               modelo: result.getText(busquedaOrdenes.columns[9]),
               importe: result.getValue(busquedaOrdenes.columns[10]),
               nota: result.getValue(busquedaOrdenes.columns[11]),
               ejecutivareferencia: result.getText(busquedaOrdenes.columns[12]),
               estado: result.getText(busquedaOrdenes.columns[13]),
               creadopor: result.getText(busquedaOrdenes.columns[14]),
               codigoitem: result.getValue(busquedaOrdenes.columns[15]),
               descripcionitem: result.getValue(busquedaOrdenes.columns[16]),
               idinternoitem: result.getValue(busquedaOrdenes.columns[17]),
               ostrabajado: result.getValue(busquedaOrdenes.columns[18]),
               infdirecciontrabajo: result.getValue(busquedaOrdenes.columns[19]),
               idinternoos: result.getValue(busquedaOrdenes.columns[20])


             });
           });
         });


        /*return JSON.stringify({
                results: Resultado
             });
             */

        return Resultado;

         
          
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (_Get_ObtieneOrdenesServicio) ';
      }


    }


   return {
       get: _Get_ObtieneOrdenesServicio

   }
});