/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
 define(['N/query', 'N/log'], function (query, log) {
    function doPost(requestBody) { 
        try {
            log.debug({
                title: 'Inicio de doPost',
                details: 'Iniciando el Restlet'
            });

            //obtener la info del vehiculo
            var tipoConsulta = requestBody.tipoConsulta;
            if (!tipoConsulta) {
                throw new Error('Falta el codigo de vehiculo.');
            }

            //para el caso de los modelos
            var marca = requestBody.marca;

            if(tipoConsulta == "Modelo" && !marca){
                throw new Error('Falta la marca del vehiculo.');
            }

            var modelo = requestBody.modelo;
            if(tipoConsulta == "Tipo" && !marca && !modelo){
                throw new Error('Falta la marca y modelo del vehiculo.');
            }


            var sqlQuery
            if(tipoConsulta == "ColorAutosafe"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BN_COLORCARSEG.id as "ID", ' +
                            'CUSTOMRECORD_HT_BN_COLORCARSEG.name as "ColorAutosafe" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BN_COLORCARSEG ' +
                            'WHERE ' +
                            'CUSTOMRECORD_HT_BN_COLORCARSEG.custrecord_ht_bn_colorcarseg_subsidiaria  = 3';
            }else if(tipoConsulta == "ColorFabricante"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BN_COLORFABRICANTE.id as "ID", ' +
                            'CUSTOMRECORD_HT_BN_COLORFABRICANTE.name as "ColorFabricante" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BN_COLORFABRICANTE ';
            }else if(tipoConsulta == "ColorMatricula"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BN_COLORMATRICULA.id as "ID", ' +
                            'CUSTOMRECORD_HT_BN_COLORMATRICULA.name as "colorplaca" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BN_COLORMATRICULA ';
            }else if(tipoConsulta == "Marca"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BIEN_MARCA.id as "ID", ' +
                            'CUSTOMRECORD_HT_BIEN_MARCA.name as "Marca" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BIEN_MARCA ' +
                            'WHERE ' +
                            'CUSTOMRECORD_HT_BIEN_MARCA.custrecord_ht_marca_sub = 3'+
                            'order by CUSTOMRECORD_HT_BIEN_MARCA.id asc';
            }else if(tipoConsulta == "Modelo"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BN_MODELO.id as "ID", ' +
                            'CUSTOMRECORD_HT_BN_MODELO.name as "Modelo" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BN_MODELO ' +
                            'WHERE ' +
                            'CUSTOMRECORD_HT_BN_MODELO.custrecord_ht_mod_subsidiaria  = 3 and ' +
                            'CUSTOMRECORD_HT_BN_MODELO.custrecord_ht_mb_marca = ?'+
                            'order by CUSTOMRECORD_HT_BN_MODELO.id asc';
            }else if(tipoConsulta == "Tipo"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.id as "ID", ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.name as "Tipo" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO ' +
                            'WHERE ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.custrecord_ht_tv_subsidiaria = 3 and ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.custrecord_ht_tv_modelo = ? and '+
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.custrecord_ht_tv_marca = ? '+
                            'order by CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.id asc';
            }else if(tipoConsulta == "Recorrido"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_RECORD_RECORRIDO.id as "ID", ' +
                            'CUSTOMRECORD_HT_RECORD_RECORRIDO.altname as "Recorrido" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_RECORD_RECORRIDO ';
            }else if(tipoConsulta == "UsoVehiculo"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BIEN_USOVEHICULO.id as "ID", ' +
                            'CUSTOMRECORD_HT_BIEN_USOVEHICULO.altname as "UsoVehiculo" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BIEN_USOVEHICULO ';
            }else if(tipoConsulta == "TipoFlota"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOFLOTA.id as "ID", ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOFLOTA.altname as "tipoFlota" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOFLOTA '+
                            'order by CUSTOMRECORD_HT_RECORD_TIPOFLOTA.id asc';
            }else if(tipoConsulta == "LugarInst"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BIEN_TIPOBIEN.id as "ID", ' +
                            'CUSTOMRECORD_HT_BIEN_TIPOBIEN.name  as "LugarInst" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BIEN_TIPOBIEN '+
                            'order by CUSTOMRECORD_HT_BIEN_TIPOBIEN.id asc';
            }else if(tipoConsulta == "EstadoBien"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN.id as "ID", ' +
                            'CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN.name  as "EstadoBien" ' +
                            'FROM ' +
                            'CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN '+
                            'order by CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN.id asc';
            }else if(tipoConsulta == "Transmision"){
                sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_BN_TRANSMISION.id as "ID", ' +
                            'CUSTOMRECORD_HT_BN_TRANSMISION.custrecord_ht_bn_descripcion   as "Transmision" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_BN_TRANSMISION '+
                            'WHERE ' +
                            'CUSTOMRECORD_HT_BN_TRANSMISION.custrecord34 = 3 ' +
                            'order by CUSTOMRECORD_HT_BN_TRANSMISION.id asc';
            }else{
                throw new Error('Validar el tipo de consulta.');
            }
            
            log.debug({
                title: 'Consulta SQL',
                details: 'Ejecutando el tipo de consulta: ' + tipoConsulta
            });

            if(tipoConsulta == "Modelo"){
                var pagedData = query.runSuiteQLPaged({
                    query: sqlQuery,
                    params: [marca],
                    pageSize: 1000
                });
            }else if (tipoConsulta == "Tipo"){
                var pagedData = query.runSuiteQLPaged({
                    query: sqlQuery,
                    params: [modelo, marca],
                    pageSize: 1000
                });
            }else{
                var pagedData = query.runSuiteQLPaged({
                    query: sqlQuery,
                    pageSize: 1000
                });
            }
            

            var results = [];

            for (var i = 0; i < pagedData.pageRanges.length; i++) {
                var page = pagedData.fetch({ index: i });
                var pageResults = page.data;
                var mappedResults = pageResults.asMappedResults();
                results = results.concat(mappedResults);
            }

            log.debug({
                title: 'Resultados Obtenidos',
                details: 'Resultados Mapeados: ' + JSON.stringify(results)
            });

            return {
                success: true,
                data: results
            };

        } catch (e) {
            log.error({
                title: 'Error en doPost',
                details: e.message
            });
            return {
                success: false,
                message: 'Ocurrió un error: ' + e.message
            };
        }
    }
    return {
        post: doPost
    };
});
