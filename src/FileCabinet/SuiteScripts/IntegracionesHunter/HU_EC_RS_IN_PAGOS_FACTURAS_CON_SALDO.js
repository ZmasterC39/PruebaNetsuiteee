/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log','N/search','N/query'], function(log, search, _const, query){


  function _Get_ObtienePagosFacturas(context){

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

         var busquedaPagosFacturas = search.create({
            type: "transaction",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
         [
            ["type","anyof","CustInvc","CustPymt"], 
            "AND", 
            ["subsidiary","anyof","2"], 
            "AND", 
            ["account","anyof","1425"], 
            "AND", 
            ["status","anyof","CustInvc:A"], 
            "AND", 
            ["applyingtransaction.appliedtolinkamount","greaterthanorequalto","0.01"], 
            "AND", 
            ["location","anyof","103","4","5","204","205","6","7","8","9","10","3"], 
            "AND", 
            ["formulatext: {name}","doesnotstartwith","C-PE"], 
            "AND", 
            ["formulatext: CASE                  WHEN {applyingtransaction.type} = 'Asiento'                                AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'            WHEN {applyingtransaction.type} = 'Pago'              \t\t  AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'            WHEN {applyingtransaction.type} = 'Nota de crédito'                               AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'            WHEN {applyingtransaction.type} = 'Aplicación de depósito'                        AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'            ELSE 'Ocultar' END","is","Mostrar"], 
            "AND", 
            ["trandate","notafter","lastmonth"]
         ],
         columns:
         [
            search.createColumn({name: "internalid", label: "ID interno"}),
            search.createColumn({name: "statusref", label: "Estado"}),
            search.createColumn({name: "location", label: "Oficina"}),
            search.createColumn({
               name: "category",
               join: "customerMain",
               label: "Categoría"
            }),
            search.createColumn({name: "trandate", label: "Fecha"}),
            search.createColumn({name: "duedate", label: "Fecha Vcto"}),
            search.createColumn({
               name: "formulatext",
               formula: "CASE    WHEN TO_DATE({duedate}) <= TO_DATE({today}) THEN 'VENCIDO'    ELSE 'POR VENCER'  END",
               label: "Estado Vcto"
            }),
            search.createColumn({
               name: "formulanumeric",
               formula: "ROUND(TO_NUMBER({duedate} - {today})-1, 0)",
               label: "Días Vcto"
            }),
            search.createColumn({name: "salesrep", label: "Representante de Ventas"}),
            search.createColumn({
               name: "custentity_ts_grupo_comercial",
               join: "salesRep",
               label: "Grupo Comercial"
            }),
            search.createColumn({name: "type", label: "Tipo"}),
            search.createColumn({name: "tranid", label: "Número de documento"}),
            search.createColumn({name: "entity", label: "Nombre"}),
            search.createColumn({name: "account", label: "Cuenta"}),
            search.createColumn({name: "memo", label: "Nota"}),
            search.createColumn({name: "amount", label: "Importe"}),
            search.createColumn({name: "custbodyts_ec_tipo_documento_fiscal", label: "EC - Tipo de Documento Fiscal"}),
            search.createColumn({name: "amountremaining", label: "Saldo de factura"}),
            search.createColumn({
               name: "formulatext",
               formula: "CASE  WHEN {applyingtransaction.type} IN ('Aplicación de depósito')      THEN 'TARJETA DE CRÉDITO' ELSE {applyingtransaction.paymentmethod}  END",
               label: "Método de Pago"
            }),
            search.createColumn({
               name: "type",
               join: "applyingTransaction",
               label: "Tipo"
            }),
            search.createColumn({
               name: "tranid",
               join: "applyingTransaction",
               label: "Número de documento"
            }),
            search.createColumn({
               name: "custbodyec_tipo_de_documento_retencion",
               join: "applyingTransaction",
               label: "EC - Tipo de Documento RETENCIÓN"
            }),
            search.createColumn({name: "terms", label: "Términos"}),
            search.createColumn({
               name: "trandate",
               join: "applyingTransaction",
               label: "Fecha Pago"
            }),
            search.createColumn({
               name: "custbodyts_ec_tipo_documento_fiscal",
               join: "applyingTransaction",
               label: "EC - Tipo doc fiscal"
            }),
            search.createColumn({
               name: "formulatext",
               formula: "CASE     WHEN {applyingtransaction.type} = 'Nota de crédito'         AND {applyingtransaction.custbodyec_tipo_de_documento_retencion} = '07 Comprobante de Retención' THEN 'COMPROBANTE DE RETENCION'  WHEN {applyingtransaction.type} = 'Nota de crédito'  THEN  'NOTA DE CREDITO ' WHEN {applyingtransaction.type} = 'Asiento'   THEN 'ASIENTO' ELSE 'PAGOS' END ",
               label: "Tipo de Pago"
            }),
            search.createColumn({
               name: "formulatext",
               formula: "SUBSTR(TO_CHAR({trandate}, 'MONTH'), 1, 3)",
               label: "Mes"
            }),
            search.createColumn({
               name: "appliedtotransaction",
               join: "applyingTransaction",
               label: "Aplicado a la transaccion"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Asiento','Nota de crédito','Pago','Aplicación de depósito')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}     THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Pago"
            }),
            search.createColumn({
               name: "formulatext",
               formula: "CASE         WHEN {applyingtransaction.type} = 'Asiento'                 AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'      WHEN {applyingtransaction.type} = 'Pago'                AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'      WHEN {applyingtransaction.type} = 'Nota de crédito'                AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'      WHEN {applyingtransaction.type} = 'Aplicación de depósito'            AND {applyingtransaction.appliedtotransaction} = {invoicenum} THEN 'Mostrar'      ELSE 'Ocultar' END",
               label: "Mostrar"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Aplicación de depósito')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}     THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Aplicación de Déposito"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Asiento')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}     THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Asiento"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Nota de crédito')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}    AND {applyingtransaction.custbodyec_tipo_de_documento_retencion} = '07 Comprobante de Retención'  THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Comprobante de Retención"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Nota de crédito')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}    AND {applyingtransaction.custbodyts_ec_tipo_documento_fiscal}= '04 Nota de credito'  THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Nota de Crédito"
            }),
            search.createColumn({
               name: "formulacurrency",
               formula: "CASE     WHEN {applyingtransaction.type} IN ('Pago')   AND {applyingtransaction.appliedtotransaction} = {invoicenum}     THEN {applyingtransaction.appliedtolinkamount}    ELSE 0.00 END",
               label: "Pago"
            })
         ]
         });


         let searchResult = busquedaPagosFacturas.runPaged({ pageSize: LONGITUD_PAGINA });
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
               
                  idinterno: result.getValue(busquedaPagosFacturas.columns[0]),
                  estado: result.getText(busquedaPagosFacturas.columns[1]),
                  oficina: result.getText(busquedaPagosFacturas.columns[2]),
                  categoria: result.getText(busquedaPagosFacturas.columns[3]),
                  fecha: result.getValue(busquedaPagosFacturas.columns[4]),
                  fecha_vencimiento: result.getValue(busquedaPagosFacturas.columns[5]),
                  estado_vencimiento: result.getValue(busquedaPagosFacturas.columns[6]),
                  dias_vencimiento: result.getValue(busquedaPagosFacturas.columns[7]),
                  representante_ventas: result.getText(busquedaPagosFacturas.columns[8]),
                  grupo_comercial: result.getText(busquedaPagosFacturas.columns[9]),
                  tipo_doc_orig: result.getText(busquedaPagosFacturas.columns[10]),
                  numero_doc_orig: result.getValue(busquedaPagosFacturas.columns[11]),
                  nombre_cliente: result.getText(busquedaPagosFacturas.columns[12]),
                  cuenta: result.getText(busquedaPagosFacturas.columns[13]).replace(/:/g, '-'),
                  nota: result.getValue(busquedaPagosFacturas.columns[14]).replace(/:/g, '-'),
                  importe_dog_orig: result.getValue(busquedaPagosFacturas.columns[15]),
                  tipo_doc_fiscal_orig: result.getText(busquedaPagosFacturas.columns[16]),
                  saldo_doc_orig: result.getValue(busquedaPagosFacturas.columns[17]),
                  metodo_pago: result.getValue(busquedaPagosFacturas.columns[18]),
                  tipo_doc_aplicacion: result.getText(busquedaPagosFacturas.columns[19]),
                  numero_doc_aplicacion: result.getValue(busquedaPagosFacturas.columns[20]),
                  tipo_doc_retencion: result.getText(busquedaPagosFacturas.columns[21]),
                  terminos: result.getText(busquedaPagosFacturas.columns[22]),
                  fecha_aplicacion: result.getValue(busquedaPagosFacturas.columns[23]),
                  tipo_doc_fiscal_aplicacion: result.getText(busquedaPagosFacturas.columns[24]),
                  tipo_pago: result.getValue(busquedaPagosFacturas.columns[25]),
                  mes: result.getValue(busquedaPagosFacturas.columns[26]),
                  aplicacion_transaccion: result.getText(busquedaPagosFacturas.columns[27]),
                  monto_aplicacion: (parseFloat(result.getValue(busquedaPagosFacturas.columns[28])) || 0).toFixed(2),
                  mostrar: result.getValue(busquedaPagosFacturas.columns[29]),
                  monto_aplicacion_deposito: (parseFloat(result.getValue(busquedaPagosFacturas.columns[30])) || 0).toFixed(2),
                  monto_asiento: (parseFloat(result.getValue(busquedaPagosFacturas.columns[31])) || 0).toFixed(2),
                  monto_comprobante_retencion: (parseFloat(result.getValue(busquedaPagosFacturas.columns[32])) || 0).toFixed(2),
                  monto_nota_credito: (parseFloat(result.getValue(busquedaPagosFacturas.columns[33])) || 0).toFixed(2),
                  monto_pago: (parseFloat(result.getValue(busquedaPagosFacturas.columns[34])) || 0).toFixed(2),
                  fecha_proceso: formatted,
                  cantidad_paginas: cantidadpaginas
               
             });

            });
            
         }
        
        return Resultado;

          
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (_Get_ObtienePagosFacturas) ';
      }


    }

    function formatDateToYYYYMMDD(date) {
         var year = date.getFullYear();
         var month = (date.getMonth() + 1).toString().padStart(2, '0');
         var day = date.getDate().toString().padStart(2, '0');
         //return `${year}-${month}-${day}`;
         return `${day}/${month}/${year}`;
      }


   return {
       get: _Get_ObtienePagosFacturas

   }
});