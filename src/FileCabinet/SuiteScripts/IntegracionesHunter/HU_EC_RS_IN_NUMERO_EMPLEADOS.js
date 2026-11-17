/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _get_consulta_numero_empleados(){
        
        let Resultado = [];

        try {
            
            var busquedaempleado = search.create({
                type: "customrecord_num_empleados_carseg",
                filters:
                [
                ],
                columns:
                [
                   search.createColumn({name: "custrecord_ht_num_anio", label: "EC - ANIO"}),
                   search.createColumn({name: "custrecord_ht_num_mes", label: "EC - MES"}),
                   search.createColumn({name: "custrecord_ht_num_empleados", label: "EC - NUMERO EMPLEADOS"})
                ]
             });
             
            var myResultSetEmpleado = busquedaempleado.run().getRange({ start: 0, end: 1000 });
            //Var theCountFac = busquedaFactura.runPaged().count;
            //log.debug('theCountFac.........', theCountFac);

            for (let i in myResultSetEmpleado) {

                anio = myResultSetEmpleado[i].getText(busquedaempleado.columns[0]); // Anio
                mes = myResultSetEmpleado[i].getValue(busquedaempleado.columns[1]); // Mes
                mesdes = myResultSetEmpleado[i].getText(busquedaempleado.columns[1]); // Mes
                numeroemp = myResultSetEmpleado[i].getValue(busquedaempleado.columns[2]);// Numero empleado
                
                               
                Resultado.push({
                    anio: anio,
                    mes: mes,
                    mesdes: mesdes,
                    numeroemp: numeroemp,
                        
                });

            }


             return Resultado;


        } catch (error) {
            log.error('Error', error);
        }

    }


    return {
        get: _get_consulta_numero_empleados,

    }
});