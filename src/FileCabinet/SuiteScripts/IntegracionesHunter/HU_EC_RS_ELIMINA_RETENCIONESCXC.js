/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    // facturas anuladas
    function _delete_anula_retencionescxc()
    {
      
        let InternalIdDoc = 0;
        let NumDocumento = '';
        let usrOperad = '';        
        let Resultado = [];

        try{

            var busquedaRetencion = search.create({
                type: "creditmemo",
                settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                [
                   ["voided","is","F"], 
                   "AND", 
                   ["mainline","is","T"], 
                   "AND", 
                   ["subsidiary","anyof","2"], 
                   "AND", 
                   ["type","anyof","CustCred"], 
                   "AND", 
                   ["datecreated","within","01/03/2024 0:00","04/12/2024 23:59"], 
                   "AND", 
                   ["custbodyec_tipo_de_documento_retencion","anyof","11"], 
                   "AND", 
                   ["createdby","anyof","449"]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "tranid", label: "Número de documento"}),
                   search.createColumn({name: "createdby", label: "Creado por"})
                ]
             });
             

            var myResultSetRetencion = busquedaRetencion.run().getRange({ start: 0, end: 1000 });
            var theCountRet = busquedaRetencion.runPaged().count;
            log.debug('theCountRet.........', theCountRet);

            for (let i in myResultSetRetencion) {

                InternalIdDoc = 0;
                NumDocumento = '';
                usrOperad = '';
                
                InternalIdDoc = myResultSetRetencion[i].getValue(busquedaRetencion.columns[0]);// Numero interno del documento
                NumDocumento = myResultSetRetencion[i].getValue(busquedaRetencion.columns[1]);// Numero de documento
                usrOperad = myResultSetRetencion[i].getValue(busquedaRetencion.columns[2]);// Usuario Operad

                //log.debug('InternalIdDoc: ',InternalIdDoc);
                //log.debug('NumDocumento: ',NumDocumento);
                //log.debug('usrOperad: ',usrOperad);

                
                if (usrOperad == '449') { // REGISTRO OPERAD

                    
                   let deleteRetencion = record.delete({
                        type: 'creditmemo',
                        id: InternalIdDoc,
                        isDynamic: true,
                      });
                      

                    Resultado.push({
                        internalIdDoc: InternalIdDoc,
                        numDocumento: NumDocumento
                               
                    });
            

                    log.debug("Se elimino el registro ", deleteRetencion);
    
                      
                }
                


            }

             return JSON.stringify({
                results: Resultado
             });

        }
        catch(error){

            log.error('error', error);
            return JSON.stringify({
                results: 'id:100, No se encontraron resultados. Error controlado (Eliminaretenciones).'
            });
            
        }
    }
   
    return {
        //get: _get,
        delete: _delete_anula_retencionescxc,
        
        
    }
});
