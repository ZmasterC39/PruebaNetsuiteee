/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(['N/record', 'N/ui/serverWidget', 'N/search' ,'N/format'], function (record, serverWidget, search,format) {

    const onAction = (context) => {
      try {
                var currentRecord = context.newRecord;
        let bien = currentRecord.getValue('custbody_ht_so_bien');
        var recordId = context.newRecord.id;

        var customrecord_ht_co_coberturaSearchObj = search.create({
            type: "customrecord_ht_co_cobertura",
            filters:
                [
                    ["custrecord_ht_co_bien", "anyof", bien],
                    "AND",
                    ["custrecord_ht_ct_transacciones.custrecord_ht_ct_concepto", "anyof", "8"],
                    "AND",
                    ["custrecord_ht_ct_transacciones.custrecord_ht_ct_orden_servicio", "anyof", recordId]
                ],
            columns:
                [
                    search.createColumn({name: "internalid", label: "Internal ID"}),
                    search.createColumn({ name: "custrecord_ht_co_plazo", label: "HT CO Plazo" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
                    search.createColumn({
                        name: "custrecord_ht_ct_orden_servicio",
                        join: "CUSTRECORD_HT_CT_TRANSACCIONES",
                        label: "Orden Servicio"
                    }),
                    search.createColumn({
                        name: "custrecord_ht_ct_concepto",
                        join: "CUSTRECORD_HT_CT_TRANSACCIONES",
                        label: "Concepto"
                    }),
                    search.createColumn({name: "custrecord_ht_ct_fecha_inicial",join: "CUSTRECORD_HT_CT_TRANSACCIONES",label: "Fecha Inicial"}),
                    search.createColumn({name: "custrecord_ht_ct_fecha_final",join: "CUSTRECORD_HT_CT_TRANSACCIONES",label: "Fecha Final"})
                ]
        });
        
        customrecord_ht_co_coberturaSearchObj.run().each(function (result) {
            var id = result.getValue({name: "internalid", label: "Internal ID"});
            var fechaInicio = result.getValue({name: "custrecord_ht_ct_fecha_inicial",join: "CUSTRECORD_HT_CT_TRANSACCIONES",label: "Fecha Inicial"});
            var fechaFin = result.getValue({name: "custrecord_ht_ct_fecha_final",join: "CUSTRECORD_HT_CT_TRANSACCIONES",label: "Fecha Final"});
            var meses = calcularDiferenciaMeses(fechaInicio,fechaFin);
            var plazo = result.getValue({ name: "custrecord_ht_co_plazo", label: "HT CO Plazo" });
            var cobertura = result.getValue({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" });
            var plazoFinal = parseInt(plazo)- parseInt(meses);
            var coberturaFinal = restarMeses(cobertura,meses);
            coberturaFinal = format.format({
                value: coberturaFinal,
                type: format.Type.DATE 
            });
            log.debug('id',id);
            log.debug('coberturaFinal',coberturaFinal);
            log.debug('plazoFinal',plazoFinal);
          log.debug('fechaInicio',fechaInicio);
          log.debug('fechaFin',fechaFin);
          
          log.debug('meses',meses);
            let otUpdate = record.submitFields({ type: 'customrecord_ht_co_cobertura', id: id, values: { 'custrecord_ht_co_plazo': plazoFinal,'custrecord_ht_co_coberturafinal': coberturaFinal } });
           
              /*objRecord.getValue({
                fieldId: "custrecord_ht_co_plazo",
                value: plazoFinal,
              });
              objRecord.getValue({
                fieldId: "custrecord_ht_co_coberturafinal",
                value: coberturaFinal,
              });*/

              log.debug('coberturaFinal',coberturaFinal);
              //objRecord.save();
            
        });
      } catch (error) {
        log.debug('error',error);
      }


    }
    function restarMeses(fecha, cantidadMeses) {
        const nuevaFecha = new Date(fecha); // Crea una copia de la fecha original
        nuevaFecha.setMonth(nuevaFecha.getMonth() - cantidadMeses); // Resta los meses
        return nuevaFecha;
    }
    function calcularDiferenciaMeses(fechaInicio, fechaFin) {
        const inicio = fechaInicio.split('/').reverse().join('-');
        const fin = fechaFin.split('/').reverse().join('-');

        const fecha1 = new Date(inicio);
        const fecha2 = new Date(fin);

        const anios = fecha2.getFullYear() - fecha1.getFullYear();
       const meses = fecha2.getMonth() - fecha1.getMonth();

        return anios * 12 + meses;
    }
    return {
        onAction: onAction
    };
});
