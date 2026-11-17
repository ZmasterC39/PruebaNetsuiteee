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
            var CodigoVehiculo = requestBody.CodigoVehiculo;
            if (!CodigoVehiculo) {
                throw new Error('Falta el codigo de vehiculo.');
            }

            var sqlQuery = 'SELECT ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_codsysh as "CODIGO_VEHICULO", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.name AS "BIEN", ' +
                            'TIPODEBIEN.id as "LugarInst", ' +
                            'ESTADOBIEN.id as "ESTADOBIEN", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_placa as "PLACA", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_motor as "MOTOR", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_chasis as "CHASIS", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_tipoflota AS "TIPOFLOTA", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_clave AS "CLAVE", ' +
                            'RECORRIDO.custrecord30 AS "codigoRecorrido", ' +
                            'RECORRIDO.altname AS "RECORRIDO", ' +
                            'CUSTOMRECORD_HT_BIEN_MARCA.id as "MARCA", ' +
                            'CUSTOMRECORD_HT_BN_MODELO.id as "MODELO", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_usovehiculo as "usovehiculo", ' +
                            'CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.name as "TIPO", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_caractadicional as "CARACTERISTICA_ADICIONAL", ' +
                            'CUSTOMRECORD_HT_BN_TRANSMISION.id as "TRANSMISION",' +
                            'CUSTOMRECORD_HT_BN_COLORCARSEG.id AS "ColorAutosafe",' +
                            'CUSTOMRECORD_HT_BN_COLORFABRICANTE.id AS "ColorFabricante",' +
                            'CUSTOMRECORD_HT_BN_COLORMATRICULA.id as "ColorPlaca",' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_kilometraje AS "Kilometraje", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_ano AS "Anio", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_avaluo AS "Avaluo", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_tonelaje AS "Tonelaje", ' +
                            'CUSTOMRECORD_HT_CO_COBERTURA.custrecord_ht_co_coberturainicial AS "FechaInicioCobertura", ' +
                            'CUSTOMRECORD_HT_CO_COBERTURA.custrecord_ht_co_coberturafinal AS "FechaFinCobertura", ' +
                            'MONTHS_BETWEEN( CUSTOMRECORD_HT_CO_COBERTURA.custrecord_ht_co_coberturafinal, CUSTOMRECORD_HT_CO_COBERTURA.custrecord_ht_co_coberturainicial) AS "MesesCobertura", ' +
                            'Customer.fullname as "Propietario", ' +
                            'Customer.fullname as "Conductor", ' +
                            'ASE.name as "Aseguradora", ' +
                            'CONCE.name as "Concesionario", ' +
                            'FINAN.name as "Financiera", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_oficina as "Oficina", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_observacion as "Observacion", ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_bn_subsidiaria as "Subsidiaria" ' +
                            'FROM ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES ' +
                            'INNER JOIN  Customer ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_propietario = Customer.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_CO_COBERTURA on CUSTOMRECORD_HT_CO_COBERTURA.custrecord_ht_co_bien = CUSTOMRECORD_HT_RECORD_BIENES.id ' +
                            'INNER JOIN CUSTOMRECORD_HT_BN_COLORCARSEG ON  CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_colorcarseg = CUSTOMRECORD_HT_BN_COLORCARSEG.id ' +
                            'INNER JOIN CUSTOMRECORD_HT_BN_COLORFABRICANTE ON  CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_colorfabricante = CUSTOMRECORD_HT_BN_COLORFABRICANTE.id ' +
                            'INNER JOIN CUSTOMRECORD_HT_BN_COLORMATRICULA ON  CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_colormatricula = CUSTOMRECORD_HT_BN_COLORMATRICULA.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_BIEN_MARCA ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_marca = CUSTOMRECORD_HT_BIEN_MARCA.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_BN_MODELO ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_modelo = CUSTOMRECORD_HT_BN_MODELO.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_RECORD_TIPOVEHICULO ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_tipo = CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.id ' +
                            'INNER JOIN CUSTOMRECORD_HT_BN_TRANSMISION ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_transmision = CUSTOMRECORD_HT_BN_TRANSMISION.id ' +
                            'INNER JOIN CUSTOMRECORD_HT_BIEN_USOVEHICULO ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_usovehiculo = CUSTOMRECORD_HT_BIEN_USOVEHICULO.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_RECORD_CANALDISTRIBUCION FINAN ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_financiadovehiculo = FINAN.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_RECORD_CANALDISTRIBUCION ASE ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_companiaseguros = ASE.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_RECORD_CANALDISTRIBUCION CONCE ON CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_consesionarios = CONCE.id ' +
                            'LEFT JOIN CUSTOMRECORD_HT_RECORD_RECORRIDO RECORRIDO ON RECORRIDO.id = CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_recorrido ' +
                            'LEFT JOIN CUSTOMRECORD_HT_BIEN_TIPOBIEN TIPODEBIEN ON TIPODEBIEN.id = CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_tipobien ' +
                            'LEFT JOIN CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN ESTADOBIEN ON ESTADOBIEN.id = CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bn_estadobien ' +
                            'WHERE ' +
                            'CUSTOMRECORD_HT_RECORD_BIENES.custrecord_ht_bien_codsysh  = ?';

            log.debug({
                title: 'Consulta SQL',
                details: 'Ejecutando la consulta: ' + sqlQuery + ' con cv: ' + CodigoVehiculo
            });


            var pagedData = query.runSuiteQLPaged({
                query: sqlQuery,
                params: [CodigoVehiculo],
                pageSize: 1000
            });

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
            return JSON.stringify({
                success: false,
                message: 'Ocurrió un error: ' + e.message
            });
        }
    }
    return {
        post: doPost
    };
});
