/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log','N/search','N/query'], function(log, search, _const, query){


   function _Get_ObtieneFacturas(context){

     let Resultado = [];
     const LONGITUD_PAGINA = 50;
     var  PaginaId = context.indice;

     var now = new Date();
     var formatted = formatDateToYYYYMMDD(now);
     log.debug('formatted.........', formatted);


      try{

         // FILTRO
         // ["trandate","notafter","thismonth"]
         // ["trandate","notafter","lastmonth"]

         var busquedaFacturas = search.create({
            type: "invoice",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["mainline","is","T"], 
               "AND", 
               ["amountremaining","greaterthan","0.00"], 
               "AND", 
               ["type","anyof","CustInvc"], 
               "AND", 
               ["subsidiary","anyof","2"], 
               "AND", 
               ["trandate","within",""]
            ],
            columns:
            [
               search.createColumn({name: "location", label: "OFICINA"}),
               search.createColumn({name: "custtype", label: "Categoría de cliente"}),
               search.createColumn({
                  name: "custentity_ts_grupo_comercial",
                  join: "salesRep",
                  label: "Grupo Comercial"
               }),
               search.createColumn({
                  name: "vatregnumber",
                  join: "customerMain",
                  label: "IDENTIFICACION"
               }),
               search.createColumn({
                  name: "altname",
                  join: "customerMain",
                  label: "NOMBRE"
               }),
               search.createColumn({name: "trandate", label: "FECHA INICIO"}),
               search.createColumn({name: "duedate", label: "FECHA VENCIMIENTO"}),
               search.createColumn({
                  name: "formulanumeric",
                  formula: "ROUND(TO_NUMBER({duedate} - {today})-1, 0)",
                  label: "DIAS: VENCIDOS (-) POR VENCER (+)"
               }),
               search.createColumn({
                  name: "formulatext",
                  formula: "CASE   WHEN ({duedate} >= {today})  THEN 'POR VENCER' ELSE 'VENCIDO' END",
                  label: "ESTADO VCTO"
               }),
               search.createColumn({name: "type", label: "Tipo"}),
               search.createColumn({name: "tranid", label: "Número de documento"}),
               search.createColumn({name: "salesrep", label: "Representante de ventas"}),
               search.createColumn({name: "statusref", label: "Estado"}),
               search.createColumn({name: "memo", label: "GLOSA"}),
               search.createColumn({name: "custbodyec_nota_cliente", label: "NOTA FACTURA"}),
               search.createColumn({name: "amount", label: "MONTO"}),
               search.createColumn({name: "amountpaid", label: "ABONO"}),
               search.createColumn({name: "amountremaining", label: "SALDO"}),
               search.createColumn({
                  name: "custrecord_ht_bien_placa",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "PLACA"
               }),
               search.createColumn({name: "custbody_ht_facturar_a", label: "FACTURAR A"}),
               search.createColumn({name: "custbody_ht_os_concesionario", label: "CONCESIONARIO"}),
               search.createColumn({name: "custbody_ht_os_bancofinanciera", label: "FINANCIERA"}),
               search.createColumn({name: "custbody_ht_os_convenio", label: "CONVENIO"}),
               search.createColumn({
                  name: "custrecord_ht_bn_estadobien",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "ESTADO"
               }),
               search.createColumn({
                  name: "custrecord_ht_bien_chasis",
                  join: "CUSTBODY_HT_SO_BIEN",
                  label: "CHASIS"
               }),
               search.createColumn({name: "billaddress", label: "Dirección de facturación"}),
               search.createColumn({name: "custbody_ht_os_telefonocliente", label: "TELEFONO"}),
               search.createColumn({name: "terms", label: "Términos"}),
               search.createColumn({name: "internalid", label: "ID interno"}),
               search.createColumn({name: "trandate", label: "Fecha"})
              
            ]
         });

       
         let searchResult = busquedaFacturas.runPaged({ pageSize: LONGITUD_PAGINA });
         log.debug('searchResultcount', searchResult.count);

         let cantidadpaginas = searchResult.pageRanges.length
         let conteoPagina = Math.ceil(searchResult.count / LONGITUD_PAGINA);

         log.debug('conteoPagina', conteoPagina);
         log.debug('cantidad de paginas', cantidadpaginas);

         if (!PaginaId || PaginaId == '' || PaginaId < 0) {
            PaginaId = 0;
         }


         if (searchResult.count != 0 && PaginaId < conteoPagina) {
            let BusquedaResultado = searchResult.fetch({ index: PaginaId });
            BusquedaResultado.data.forEach(function (result) {

               Resultado.push({

               oficina: result.getText(busquedaFacturas.columns[0]),
               categoria_cliente: result.getText(busquedaFacturas.columns[1]),
               grupo_comercial: result.getText(busquedaFacturas.columns[2]),
               identificacion_cliente: result.getValue(busquedaFacturas.columns[3]),
               nombre_cliente: result.getValue(busquedaFacturas.columns[4]),
               fecha_inicio: result.getValue(busquedaFacturas.columns[5]),
               fecha_vencimiento: result.getValue(busquedaFacturas.columns[6]),
               dias_vencidos_por_vencer: result.getValue(busquedaFacturas.columns[7]),
               estado_vencimiento: result.getValue(busquedaFacturas.columns[8]),
               tipo: result.getText(busquedaFacturas.columns[9]),
               numero_documento: result.getValue(busquedaFacturas.columns[10]),
               representante_ventas: result.getText(busquedaFacturas.columns[11]),
               estado: result.getText(busquedaFacturas.columns[12]),
               glosa: limpiarCaracteresEspeciales(result.getValue(busquedaFacturas.columns[13])),
               //glosa: result.getValue(busquedaFacturas.columns[13]).replace(/\//g, '-'), //Reemplazar todas las apariciones de /
               //glosa: '',
               //nota_factura: result.getValue(busquedaFacturas.columns[14]).replace(/:/g, '-'),
               //nota_factura: result.getValue(busquedaFacturas.columns[14]).replace(/\//g, '-'), //Reemplazar todas las apariciones de /
               //nota_factura: '',
               nota_factura: limpiarCaracteresEspeciales(result.getValue(busquedaFacturas.columns[14])),
               monto: (parseFloat(result.getValue(busquedaFacturas.columns[15])) || 0).toFixed(2),
               abono: (parseFloat(result.getValue(busquedaFacturas.columns[16])) || 0).toFixed(2),
               saldo: (parseFloat(result.getValue(busquedaFacturas.columns[17])) || 0).toFixed(2),
               placa: limpiarCaracteresEspeciales(result.getValue(busquedaFacturas.columns[18])),
               facturar_a: result.getText(busquedaFacturas.columns[19]),
               concesionario: result.getText(busquedaFacturas.columns[20]),
               financiera: limpiarCaracteresEspeciales(result.getValue(busquedaFacturas.columns[21])),
               convenio: result.getText(busquedaFacturas.columns[22]),
               estado_bien: result.getText(busquedaFacturas.columns[23]),
               chasis: result.getValue(busquedaFacturas.columns[24]),
               //direccion_facturacion: result.getValue(busquedaFacturas.columns[25]).replace(/\//g, '-'),
               direccion_facturacion: limpiarCaracteresEspeciales(result.getValue(busquedaFacturas.columns[25])),
               //direccion_facturacion: '',
               telefono_cliente: result.getValue(busquedaFacturas.columns[26]),
               terminos: result.getText(busquedaFacturas.columns[27]),
               id_interno: result.getValue(busquedaFacturas.columns[28]),
               fecha: result.getValue(busquedaFacturas.columns[29]),
               creado_desde: '',
               fecha_proceso: formatted,
               cantidad_paginas: cantidadpaginas,
               pagina_id: PaginaId,
               

             });

          });

        }


        /*return JSON.stringify({
                results: Resultado
             });
             */

         return Resultado;

         
          
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (_Get_ObtieneOrdenesServicio) ';
      }


      function formatDateToYYYYMMDD(date) {
         var year = date.getFullYear();
         var month = (date.getMonth() + 1).toString().padStart(2, '0');
         var day = date.getDate().toString().padStart(2, '0');
         //return `${year}-${month}-${day}`;
         return `${day}/${month}/${year}`;
      }


      /**
      * Elimina o reemplaza caracteres especiales de una cadena.
      * @param {string} input - La cadena original.
      * @returns {string} - La cadena saneada.
      */
     function limpiarCaracteresEspeciales(input) {
          if (!input) return '';

          // Reemplazar caracteres especiales comunes
         return input
        .replace(/[^\w\s\-@.]/gi, '') // Elimina caracteres especiales excepto letras, números, guiones, espacios, @ y .
        .replace(/\s+/g, ' ')         // Reduce múltiples espacios a uno solo
        .trim();                      // Elimina espacios al inicio y final
      }



    }


   return {
       get: _Get_ObtieneFacturas

   }
});