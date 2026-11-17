/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @author Mauro F Ramos
 * @date Created at: 10/11/2025
 * @description Extrae las notas del sistema de las órdenes de servicio aprobadas del día y las procesa para
 * enviar notificaciones.
 *
*/

define(['N/log', 'N/search'], function(log, search) {

   function getInputData(context) {
      try {
         var systemnoteSearchObj = search.create({
            type: "systemnote",
            filters:
            [
               ["field","anyof","CUSTBODY_HT_OS_APROBACIONVENTA","CUSTBODY_HT_OS_APROBACIONCARTERA"],
               "AND",
               ["date","within","today"],
               "AND",
               ["recordtype","anyof","-30"],
               "AND",
               ["formulatext: {record}","startswith","Orden de Servicio"],
            ],
            columns:
            [
               search.createColumn({name: "recordid", label: "ID de registro"}),
               search.createColumn({name: "record", label: "Registro"}),
               search.createColumn({name: "name", label: "Definido por"}),
               search.createColumn({name: "date", label: "Fecha"}),
               search.createColumn({name: "context", label: "Contexto"}),
               search.createColumn({name: "type", label: "Tipo"}),
               search.createColumn({name: "field", label: "Campo"}),
               search.createColumn({name: "oldvalue", label: "Valor anterior"}),
               search.createColumn({name: "newvalue", label: "Nuevo valor"}),
               search.createColumn({name: "role", label: "Rol"}),
               search.createColumn({name: "type", label: "Tipo"}),
               search.createColumn({name: "recordtype", label: "Tipo de registro"}),
               search.createColumn({
                  name: "subsidiary",
                  join: "user",
                  label: "Subsidiaria"
               })
            ]
         });

         systemnoteSearchObj.run().each(function(result){
            log.debug("result", {
               id: result.getValue({name: "recordid"}),
               registro: result.getValue({name: "record"}),
               usuario: result.getText({name: "name"}),
               fecha: result.getValue({name: "date"}),
               campo: result.getText({name: "field"}),
               valor_anterior: result.getValue({name: "oldvalue"}),
               nuevo_valor: result.getValue({name: "newvalue"})
            });

            return true;
         });

         return [];


      } catch (error) {
         log.error("ERROR getInputData", error);
      }
   }

   function map(context) {
      try {
         return true;
      } catch (error) {
         return true;
      }
   }

   function reduce(context) {
      try {
         return true;
      } catch (error) {
         return true;
      }
   }

   function summarize(summary) {
      try {
         log.debug("summary", summary);
      } catch (error) {
         return true;
      }
   }

   return { getInputData, map, reduce, summarize}

});