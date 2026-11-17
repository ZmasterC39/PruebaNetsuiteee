/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
*/

define(['N/record', 'N/runtime', 'N/render', 'N/file', 'N/search'], function(record, runtime, render, file, search) {

    const onRequest = (context) => {
        let parameters = context.request.parameters;

        let usuario = runtime.getCurrentUser();

        if(usuario.subsidiary == 2){
            _generarPDF(parameters, context);
        }
    };
    function _generarPDF(parameters, context) {
        let {type, id} = parameters;
        let TEMPLATE_PDF = 'SuiteScripts/IntegracionesHunter/Plantillas/TipoRegistro/Caso/HU_EC_FTL_CASO.ftl';
        let caso = getDataCaso(id)
        log.debug("caso",caso)
        let mensajes = getDataForTemplate(id);
        log.debug("mensajes", mensajes);
        let jsonTemplate = {info: caso, mensajes: mensajes};
        renderPDF(type, id, jsonTemplate, context, TEMPLATE_PDF);
    }

    function getDataForTemplate(id) {
        var supportcaseSearchObj = search.create({
            type: "supportcase",
            filters: [
                ["internalid", "anyof", id]
            ],
            columns: [
                search.createColumn({
                    name: "author",
                    join: "messages",
                    label: "USUARIO"
                }),
                search.createColumn({
                    name: "messagedate",
                    join: "messages",
                    label: "Fecha",
                    sort: search.Sort.ASC
                }),
                search.createColumn({
                    name: "message",
                    join: "messages",
                    label: "Mensaje"
                }),
            ]
        });
        var resultData = [];
        supportcaseSearchObj.run().each(function(result) {
            var author = result.getText({ name: "author", join: "messages" });
            var messagedate = result.getValue({ name: "messagedate", join: "messages" });
            var message = result.getValue({ name: "message", join: "messages" });
            // Agregar el resultado al arreglo
            message = message.replace("&", ' ');

            //log.debug("author", author.split(" ")[0]);
            // SELECT UPPER(SUBSTR(email, 1, INSTR(email, '@') - 1)) AS email_usuario  FROM employee WHERE entityid = 'E-00000452'

            resultData.push({
                author: author,
                messagedate: messagedate,
                message: message
            });
            return true;
        });
        return resultData;
    }

    function getDataCaso(id) {
        var supportcaseSearchObj = search.create({
            type: "supportcase",
            filters: [
                ["internalid", "anyof", id]
            ],
            columns: [
                search.createColumn({ name: "casenumber", label: "Número" }),
                search.createColumn({ name: "startdate", label: "FECHA - HORA DENUNCIA" }),
                search.createColumn({ name: "company", label: "Empresa" }),
                search.createColumn({ name: "phone", join: "company", label: "Teléfono" }),
                search.createColumn({ name: "custevent_ht_departamento", label: "Departamento" }),
                search.createColumn({ name: "custevent_nombre", label: "Denunciante" }),
                search.createColumn({ name: "address1", join: "company", label: "DOMICILIO CLIENTE" }),
                search.createColumn({ name: "custrecord_ht_bien_motor", join: "CUSTEVENT_HT_CASO_VEHICULO", label: "MOTOR" }),
                search.createColumn({ name: "custrecord_ht_bien_chasis", join: "CUSTEVENT_HT_CASO_VEHICULO", label: "CHASIS" }),
                search.createColumn({ name: "custevent_ht_caso_direccionrobo", label: "LUGAR ROBO" }),
                search.createColumn({ name: "custevent_ht_caso_ciudad", label: "CIUDAD ROBO" }),
                search.createColumn({ name: "custevent_ht_caso_fecharobo", label: "FECHA ROBO" }),
                search.createColumn({ name: "custevent_ht_caso_horarobo", label: "HORA ROBO" }),
                search.createColumn({ name: "custevent_ht_cs_recuperadopor", label: "RECUPERADO POR" }),
                search.createColumn({ name: "custevent1", label: "minutocel" }),
                search.createColumn({ name: "custevent_ht_cs_fechahorarecup", label: "minutocel" }),
                search.createColumn({ name: "custevent_ht_cs_latitudgestion", label: "LATITUD GESTION" }),
                search.createColumn({ name: "custevent_ht_cs_longitudgestion", label: "LONGITUD GESTION" }),
                search.createColumn({ name: "custrecord_ht_up_pais", join: "CUSTRECORD_HT_UP_CASO", label: "LUGAR UBICACIÓN" }),
                search.createColumn({ name: "custevent_ht_cs_provinciagestion" }),
                search.createColumn({ name: "custrecord_ht_up_ciudad", join: "CUSTRECORD_HT_UP_CASO", label: "CIUDAD UBICACIÓN" }),
                search.createColumn({ name: "custevent_ht_cs_ciudadgestion" }),
                search.createColumn({ name: "custrecord_ht_up_fechaubicacion", join: "CUSTRECORD_HT_UP_CASO", label: "FECHA UBICACIÓN" }),
                search.createColumn({ name: "custrecord_ht_up_horaubicacion", join: "CUSTRECORD_HT_UP_CASO", label: "HORA UBICACIÓN" }),
                search.createColumn({ name: "custrecord_ht_bien_consesionarios", join: "CUSTEVENT_HT_CASO_VEHICULO", label: "CONCESIONARIO"}),
                search.createColumn({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTEVENT_HT_CASO_VEHICULO", label: "CIA DE SEGUROS"}),
                search.createColumn({ name: "name", join: "CUSTEVENT_HT_CASO_TIPOGESTION", label: "Nombre" }),
                search.createColumn({ name: "altname", join: "CUSTEVENT_HT_CASO_TIPOGESTION", label: "Nombre" }),
                search.createColumn({ name: "custevent_ht_caso_etapacaso", label: "ETAPA CASO"}),
            ]
        });
        var resultData = [];
        supportcaseSearchObj.run().each(function (result) {

            resultData.push({
                numero: result.getValue({ name: "casenumber" }),
                fechaDenuncia: result.getValue({ name: "startdate" }),
                empresa: result.getText({ name: "company" }),
                telefono: result.getValue({ name: "phone", join: "company" }),
                departamento: result.getText({ name: "custevent_ht_departamento" }),
                denunciante: result.getValue({ name: "custevent_nombre" }),
                domicilioCliente: result.getValue({ name: "address1", join: "company" }),
                motor: result.getValue({ name: "custrecord_ht_bien_motor", join: "CUSTEVENT_HT_CASO_VEHICULO" }),
                chasis: result.getValue({ name: "custrecord_ht_bien_chasis", join: "CUSTEVENT_HT_CASO_VEHICULO" }),
                fechaRobo: result.getValue({ name: "custevent_ht_caso_fecharobo" }),
                lugarRobo: result.getValue({ name: "custevent_ht_caso_direccionrobo" }),
                ciudadRobo: result.getText({ name: "custevent_ht_caso_ciudad" }),
                horaRobo: result.getValue({ name: "custevent_ht_caso_horarobo" }),
                recuperadoPor: result.getText({ name: "custevent_ht_cs_recuperadopor" }),
                celularMin: result.getValue({ name: "custevent1" }),
                latitudGestion: result.getValue({ name: "custevent_ht_cs_latitudgestion" }),
                longitudGestion: result.getValue({ name: "custevent_ht_cs_longitudgestion" }),
                lugarUbicacion: result.getText({ name: "custrecord_ht_up_pais", join: "CUSTRECORD_HT_UP_CASO" }),
                lugarUbicacion: result.getText({ name: "custevent_ht_cs_provinciagestion"}),
                ciudadUbicacion: result.getText({ name: "custrecord_ht_up_ciudad", join: "CUSTRECORD_HT_UP_CASO" }),
                ciudadUbicacion: result.getText({ name: "custevent_ht_cs_ciudadgestion"}),
                fechaUbicacion: result.getValue({ name: "custrecord_ht_up_fechaubicacion", join: "CUSTRECORD_HT_UP_CASO" }),
                fechaUbicacion: result.getValue({ name: "custevent_ht_cs_fechahorarecup"}),
                horaUbicacion: result.getValue({ name: "custrecord_ht_up_horaubicacion", join: "CUSTRECORD_HT_UP_CASO" }),
                concesionario: result.getText({ name: "custrecord_ht_bien_consesionarios", join: "CUSTEVENT_HT_CASO_VEHICULO" }),
                aseguradora: result.getText({ name: "custrecord_ht_bien_companiaseguros", join: "CUSTEVENT_HT_CASO_VEHICULO" }),
                tipoGestionCodigo: result.getValue({ name: "name", join: "CUSTEVENT_HT_CASO_TIPOGESTION" }),
                tipoGestion: result.getValue({ name: "altname", join: "CUSTEVENT_HT_CASO_TIPOGESTION" }),
                etapaCaso: result.getText({ name: "custevent_ht_caso_etapacaso" })
            });
            return true; // Continúa iterando
        });
        log.debug("Resultados", resultData);
        return resultData;
    }

    const renderPDF = (type, id, json, context, template) => {
        var fileContents = file.load({ id: template }).getContents();

        var renderer = render.create();
        renderer.templateContent = fileContents;

        renderer.addRecord({
            templateName: 'record',
            record: record.load({
                type: type,
                id: id
            })
        });

        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'data',
            data: json
        });

        result = renderer.renderAsString();
        context.response.renderPdf(result);
    }
    return {onRequest};
});