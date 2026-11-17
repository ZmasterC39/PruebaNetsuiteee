/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _postActualizaDatosAutorizacion(context) {
        try {


            let internalid = context.internalid;
            let serie = context.serie;
            let numeropreimpreso = context.numeropreimpreso;
            let tipodocumento = context.tipodocumento; // FAC - NCF
            let numeroautorizacion = context.numeroautorizacion;
            let fechaautorizacion = context.fechaautorizacion;
            let estadoautorizacion = context.estadoautorizacion;
            let pdfresponse = context.pdfresponse;
            let xmlresponse = context.xmlresponse;
            let idActualiza = 0;
            let objdocumento;

            let response = [{
                status: "ER",
                message: "ERROR",
                idinternal: 0,
                serie: '',
                numeropreimpreso: 0,
                tipodocumento: 0
               }];

            // TIPO DOCUMENTO FACTURA
            // NO SE CONSIDERA FACTURAS DE DEBITO AUTOMATICO
            if (tipodocumento == 'FAC') {

                var busquedaDocumento = search.create({
                    type: "invoice",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters:
                    [
                    ["type","anyof","CustInvc"], 
                    "AND", 
                    ["taxline","is","F"],
                    "AND", 
                    ["subsidiary","anyof","2"], 
                    "AND", 
                    ["mainline","is","T"], 
                    "AND", 
                    ["voided","is","F"],
                    "AND", 
                    ["memo","doesnotstartwith","Facturación Debito automatico"],
                    "AND", 
                    ["internalid","anyof", internalid]
                    ],
                    columns:
                    [
                    search.createColumn({name: "internalid", label: "Idinterno"}),
                    search.createColumn({name: "custbody_ts_ec_serie_cxc", label: "Serie"}),
                    search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "Numero preimpreso"}),
                    ]
                });
            }

            // TIPO DOCUMENTO FACTURA
            if (tipodocumento == 'NCF') {
                var busquedaDocumento = search.create({
                    type: "creditmemo",
                    settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters:
                    [
                       ["voided","is","F"], 
                       "AND", 
                       ["mainline","is","T"], 
                       "AND", 
                       ["type","anyof","CustCred"], 
                       "AND", 
                       ["taxline","is","F"],
                       "AND", 
                       ["subsidiary","anyof","2"], 
                       "AND", 
                       ["internalid","anyof", internalid]
                       ],
  
                    columns:
                    [
                    search.createColumn({name: "internalid", label: "Idinterno"}),
                    search.createColumn({name: "custbody_ts_ec_serie_cxc", label: "Serie"}),
                    search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "Numero preimpreso"}),
                    ]
                 });
            }


            var myResultSetDocumento = busquedaDocumento.run().getRange({ start: 0, end: 1000 });
            var CountDocumento = busquedaDocumento.runPaged().count;
            log.debug('CountDocumento.........', CountDocumento);
            if (CountDocumento != 1) {
                log.debug('Busqueda.Error no se encontro el numero de documento ........', myResultSetDocumento);

                response = [{
                    status: "ER",
                    message: "ERROR:100",
                    idinternal: internalid,
                    serie: serie,
                    numeropreimpreso: numeropreimpreso,
                    tipodocumento: tipodocumento
                }];
                return { results: response };     

            } else {//Obtiene el ID
                var internaliddoc= myResultSetDocumento[0].getValue(busquedaDocumento.columns[0]);
                var seriedoc = myResultSetDocumento[0].getValue(busquedaDocumento.columns[1]);
                var numeropreimpresodoc = myResultSetDocumento[0].getValue(busquedaDocumento.columns[2]);
                    
            }
                

           log.debug('internaliddoc.........', internaliddoc);
           log.debug('seriedoc.........', seriedoc);
           log.debug('numeropreimpresodoc.........', numeropreimpresodoc);


            if (internaliddoc != 0 && numeropreimpresodoc == numeropreimpreso) {

                if (tipodocumento == 'FAC'){
                    objdocumento = record.load({ type: 'invoice', id: internalid, isDynamic: true }); //abre tabla
                    //log.debug('objfactura.........', objdocumento);
                }

                if (tipodocumento == 'NCF'){
                    objdocumento = record.load({ type: 'creditmemo', id: internalid, isDynamic: true }); //abre tabla
                    //log.debug('objfactura.........', objdocumento);
                }

               log.debug('objdocumento.........', objdocumento);


                objdocumento.setValue({fieldId: 'custbody_ec_fecha_autorizacion', value: new Date(context.fechaautorizacion) });
                objdocumento.setValue({fieldId: 'custbodyts_ec_num_autorizacion', value: numeroautorizacion });
                objdocumento.setValue({fieldId: 'custbody_ec_estado_de_autorizaci', value: estadoautorizacion });
                objdocumento.setValue({fieldId: 'custbody_ei_xml_response', value: xmlresponse });
                objdocumento.setValue({fieldId: 'custbody_ei_pdf_response', value: pdfresponse });
            
                idActualiza = 0;
                idActualiza = objdocumento.save({ enableSourcing: false, ignoreMandatoryFields: false });


                if (idActualiza > 0) {
                    response = [{
                         status: "OK",
                         message: "Registro actualizado correctamente",
                         idinternal: idActualiza,
                         serie: serie,
                         numeropreimpreso: numeropreimpreso,
                         tipodocumento: tipodocumento
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
        post: _postActualizaDatosAutorizacion
      
    }
});