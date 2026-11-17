/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/https','N/log','./UtilsGeneral/HU_EC_CONSTANTES','./UtilsGeneral/HU_EC_FUNCION'], function(https, log, _const, _funcion){

    function _put(context){
        try {

            let H_Cobertura = {};
            let Resultado = '';
            H_Cobertura.id_bien = context.id_bien
            H_Cobertura.id_os = context.id_os
            H_Cobertura.os = context.os
            H_Cobertura.origen = context.origen
            H_Cobertura.id_doc_origen = context.id_doc_origen
            H_Cobertura.id_producto = context.id_producto
            H_Cobertura.producto = context.producto
            H_Cobertura.fecha_inicio = context.fecha_inicio
            H_Cobertura.fecha_fin = context.fecha_fin
            H_Cobertura.plazo = context.plazo
            H_Cobertura.tipo_plazo = context.tipo_plazo
            H_Cobertura.id_estado = context.id_estado
            
            H_Cobertura.fecha_inicio_ant = '19000101'
            if (typeof context.fecha_inicio_ant != 'undefined') {
                if (context.fecha_inicio_ant.length != 0) {
                    H_Cobertura.fecha_inicio_ant = context.fecha_inicio_ant;
                }
            }
            
            H_Cobertura.fecha_fin_ant = '19000101'
            if (typeof context.fecha_fin_ant != 'undefined') {
                if (context.fecha_fin_ant.length != 0) {
                    H_Cobertura.fecha_fin_ant = context.fecha_fin_ant;
                }
            }

            H_Cobertura.id_estado_instalacion = context.id_estado_instalacion,
            H_Cobertura.id_ejecutiva = context.id_ejecutiva,
            H_Cobertura.id_usuario = context.id_usuario

            let loginApiToken = _funcion.loginGetToken();

            Resultado = InsertaHistoricoCoberturas(loginApiToken, H_Cobertura);

            return Resultado;

        }catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el Log de Cobertura.';
        }
    }

    function InsertaHistoricoCoberturas(token, ObjCobertura) {
        try{
                var DataToSend = {
                    "bienId": ObjCobertura.id_bien,
                    "ordenId": ObjCobertura.id_os,
                    "numeroGeneral": ObjCobertura.os,
                    "origen": ObjCobertura.origen,
                    "docOrigenId": ObjCobertura.id_doc_origen,
                    "productoId": ObjCobertura.id_producto,
                    "producto": ObjCobertura.producto,
                    "fechaInicio": ObjCobertura.fecha_inicio,
                    "fechaFin": ObjCobertura.fecha_fin,
                    "plazo": ObjCobertura.plazo,
                    "tipoPlazo": ObjCobertura.tipo_plazo,
                    "estadoId": ObjCobertura.id_estado,
                    "fechaInicioAnt": ObjCobertura.fecha_inicio_ant,
                    "fechaFinAnt": ObjCobertura.fecha_fin_ant,
                    "estadoInstalacion": ObjCobertura.id_estado_instalacion,
                    "ejecutivaId": ObjCobertura.id_ejecutiva,
                    "usuarioId": ObjCobertura.id_usuario
                };

                var headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };

                var options = {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(DataToSend)
                };

                var response = https.post({
                    url: _const.URLS.HUNTER_API_NETSUITE + '/HistoricoCobertura',
                    body: options.body,
                    headers: options.headers
                });

                if (response.code === 200) {
                    var responseBody = JSON.parse(response.body);
                    return responseBody.respuesta[0].MENSAJE;
                    
                } else {
                    log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
                    return `Status Code: ${response.code}, Response Body: ${response.body}`;
                }
          
        } catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el Log de Cobertura. (InsertaHistoricoCoberturas)';
        }
    }

    return {
        put: _put
    }    
 });
