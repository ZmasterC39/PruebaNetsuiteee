/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], function(log, record, search, coberturaController) {

    function _postActualizaSimcard(context) {
        try {


            let fechacorte  = context.fechacorte;
            let icc = context.icc;
            let estadosimcard = context.estadosimcard; // 3 CORTADA
            let subsidiaria = context.subsidiaria;; // ECUADOR
            let idActualiza = 0;

            let response = [{
                status: "ER",
                message: "ERROR",
                idinternal: 0,
                icc: '',
                seguimiento: 0
               }];

            var busquedaSimcard = search.create({
                type: "customrecord_ht_record_detallechasersim",
                filters:
                [
                   ["custrecord_ht_ds_icc","startswith",icc]
                ],
                columns:
                [
                   search.createColumn({name: "custrecord_ht_ds_icc", label: "ICC"}),
                   search.createColumn({name: "internalid", label: "ID interno"})
                ]
             });
             var myResultSetSimcard = busquedaSimcard.run().getRange({ start: 0, end: 1000 });
             var CountSimcard = busquedaSimcard.runPaged().count;
             log.debug('CountSimcard.........', CountSimcard);
             if (CountSimcard != 1) {
                log.debug('Busqueda.Error no se encontró el ICC ........', myResultSetSimcard);

                response = [{
                    status: "ER",
                    message: "ERROR:100",
                    idinternal: 0,
                    icc: icc,
                    seguimiento: 0
                  }];
                return { results: response };

            } else {
                //Obtiene el ID
                var simcardicc = myResultSetSimcard[0].getValue(busquedaSimcard.columns[0]);
                var internalidsimcard = myResultSetSimcard[0].getValue(busquedaSimcard.columns[1]);
            }


           log.debug('internalidsimcard.........', internalidsimcard);


            if (internalidsimcard != 0 && simcardicc == icc) {
                let objSimcard = record.load({ type: 'customrecord_ht_record_detallechasersim', id: internalidsimcard, isDynamic: true }); //abre tabla
                log.debug('objSimcard.........', objSimcard);

                objSimcard.setValue({fieldId: 'custrecord_ht_ds_estado', value: estadosimcard, ignoreFieldChange: true});
                objSimcard.setValue({fieldId: 'custrecord_ht_ds_fechacorte', value: new Date(fechacorte), ignoreFieldChange: true});
                objSimcard.setValue({fieldId: 'custrecord_ht_ds_subsidiaria', value: subsidiaria, ignoreFieldChange: true});
                
                idActualiza = 0;
                idActualiza = objSimcard.save({ enableSourcing: false, ignoreMandatoryFields: false });

                log.debug('internalidsimcard.........', idActualiza);

                // Generar seguimiento de cliente
                let dataPrueba = coberturaController.GenerarSeguimientoCliente(
                    context
                );

                if (idActualiza > 0) {
                    response = [{
                         status: "OK",
                         message: "Registro actualizado correctamente",
                         idinternal: idActualiza,
                         icc: simcardicc,
                         seguimiento: dataPrueba.id
                    }];
                }
                //Respuesta.
                return { results: response };
                
            }
       
        } catch (e) {
            log.error('Error', {e: e.error, stack: e.stack});
            throw e; // Lanza el error para que se registre
        }

    }


    return {
        post: _postActualizaSimcard
      
    }
});