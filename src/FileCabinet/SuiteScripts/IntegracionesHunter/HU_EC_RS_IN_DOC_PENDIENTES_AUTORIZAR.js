/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log','N/search','N/format'], function(log, search,format){


   function _Get_DocumentosAutorizar(context){

     let Resultado = [];
     var now = new Date();
     var formatted = formatDateToYYYYMMDD(now);

     log.debug('formatted.........', formatted);
     
      try{
         // Obtiene documentos pendientes de autorizar
         // Facturas(18) y Notas de credito(04) de ventas
         // Estado de documento Para generación, Fallo de envío
         // Estado aprobado
         // No se considera facturas de Debito automatico
         // custbody_psg_ei_status 7 enviado
         var busquedaDocAutorizar = search.create({
            type: "transaction",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["type","anyof","CustInvc","CustCred"], 
               "AND", 
               ["custbodyts_ec_num_autorizacion","isempty",""], 
               "AND", 
               ["mainline","is","T"], 
               "AND", 
               ["custbodyts_ec_tipo_documento_fiscal","anyof","16","1"],
               "AND", 
               ["voided","is","F"], 
               "AND", 
               ["subsidiary","anyof","2"],
               "AND", 
               ["memo","doesnotstartwith","Facturación Debito automatico"],
               "AND", 
               ["trandate","after","lastmonth"], 
               "AND", 
               ["custbody_psg_ei_status","anyof","8","1"]
            ],
            columns:
            [
               search.createColumn({name: "type", label: "TIPO DOCUMENTO"}),
               search.createColumn({name: "trandate", label: "FEC. DOCUMENTO"}),
               search.createColumn({name: "location", label: "Oficina"}),
               search.createColumn({name: "tranid", label: "NUM. DOCUMENTO"}),
               search.createColumn({name: "custbody_ts_ec_serie_cxc", label: "NUM. SERIE DOCUMENTO"}),
               search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "NUM. PREIMPRESO"}),
               search.createColumn({name: "entity", label: "CLIENTE"}),
               search.createColumn({name: "custbody_psg_ei_status", label: "ESTADO DOC. ELECTRONICO"}),
               search.createColumn({
               name: "custrecordts_ec_cod_tipo_comprobante",
               join: "CUSTBODYTS_EC_TIPO_DOCUMENTO_FISCAL",
               label: "COD. TIPO DOC. FISCAL"
               }),
              search.createColumn({name: "internalid", label: "ID INTERNO"}),
              search.createColumn({name: "approvalstatus", label: "ESTADO DE APROBACION"}), //1,3,11 no considerar
            ]
         });

         let searchResult = busquedaDocAutorizar.runPaged();
         searchResult.pageRanges.forEach(function (pageRange) {
         let myPage = searchResult.fetch({ index: pageRange.index });
         myPage.data.forEach(function (result) {
           
          
              Resultado.push({
               
               tipodocumento: result.getText(busquedaDocAutorizar.columns[0]),
               fechadocumento: result.getValue(busquedaDocAutorizar.columns[1]),
               oficina: result.getText(busquedaDocAutorizar.columns[2]),
               numerodocumento: result.getValue(busquedaDocAutorizar.columns[3]),
               seriedocumento: result.getText(busquedaDocAutorizar.columns[4]),
               numeropreimpreso: result.getValue(busquedaDocAutorizar.columns[5]),
               cliente: result.getText(busquedaDocAutorizar.columns[6]),
               estadodocelectro: result.getText(busquedaDocAutorizar.columns[7]),
               estadodocelectrocod: result.getValue(busquedaDocAutorizar.columns[7]),
               coddocfiscal: result.getValue(busquedaDocAutorizar.columns[8]),
               internalid: result.getValue(busquedaDocAutorizar.columns[9]),
               fechaproceso: formatted,
               estadoaprobacion: result.getValue(busquedaDocAutorizar.columns[10]),

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
         return 'id:400, No se encontraron resultados. Error controlado. (_Get_DocumentosAutorizar) ';
      }


     function formatDateToYYYYMMDD(date) {
           var year = date.getFullYear();
           var month = (date.getMonth() + 1).toString().padStart(2, '0');
           var day = date.getDate().toString().padStart(2, '0');
           //return `${year}-${month}-${day}`;
           return `${day}/${month}/${year}`;
     }

   

  }


   return {
       get: _Get_DocumentosAutorizar

   }
});