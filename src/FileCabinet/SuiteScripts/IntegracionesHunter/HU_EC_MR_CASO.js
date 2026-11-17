/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @author Mauro F Ramos
 * @date Created at: 14/08/2025
 * @description
 *
*/

define(['N/log', 'N/query', 'N/record', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', 'N/email', 'N/runtime', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION.js', 'N/https'], function (log, query, record, _coberturaController, email, runtime, _funcion, https) {

    function getInputData(context) {
        try {
            let suiteql = `SELECT DISTINCT
                                caso.id AS caso_id,
                                caso.startdate,
                                caso.casenumber AS nro_caso,
                                caso.subsidiary,
                                c.id AS cliente_id,
                                c.entityid AS entity,
                                c.altname AS nombre_cliente,
                                c.salesrep AS representante_ventas,
                                e.email AS repesentante_ventas_email,
                                bien.custrecord_ht_bien_placa AS placa,
                                bien.id AS bien_id,
                                bien.altname AS bien_altname,
                                eg.name AS etapa,
                                sc.name AS estado,
                                sp.name AS prioridad,
                                timeelapsed
                            FROM supportcase caso
                            JOIN customrecord_ht_record_bienes bien
                                ON bien.id = caso.CUSTEVENT_HT_CASO_VEHICULO
                            JOIN customer c
                                ON c.id = caso.company
                            JOIN supportcasestatus sc
                                ON sc.id = caso.status
                            JOIN supportcasepriority sp
                                ON sp.id = caso.priority
                            LEFT JOIN customrecord_ht_co_cobertura co
                                ON co.custrecord_ht_co_bien = bien.id
                            LEFT JOIN customrecord_ht_eg_etapagestion eg
                                ON eg.id = caso.custevent_ht_caso_etapacaso
                            LEFT JOIN employee e ON e.id = c.salesrep
                            WHERE caso.status != 5
                            AND caso.subsidiary = 2
                            AND caso.custevent_ht_caso_etapacaso = 1
                            AND caso.issue = 1
                            --FETCH FIRST 1 ROWS ONLY;`;
            let result = _executeQuery(suiteql);
            if(result){
                log.debug("Procesando", '*-*-*-*-*-*-*-*-*-* Inicio *-*-*-*-*-*-*-*-*-*' );
                return result;
            }else{
                result = []
            }

        } catch (error) {
            log.error("ERROR getInputData", error);
            return true;
        }
    }

    function map(context){
        try {
            const data = JSON.parse(context.value);
            let notificacion = false;
            let correo_jefe = false;

            let partes = data.startdate.split("/"); // ["04", "04", "2025"]
            let dia = parseInt(partes[0], 10);
            let mes = parseInt(partes[1], 10) - 1; // Mes en JS es 0-11
            let anio = parseInt(partes[2], 10);
            let fechaInicio = new Date(anio, mes, dia);
            let hoy = new Date();
            hoy.setHours(0,0,0,0);
            fechaInicio.setHours(0,0,0,0);
            let diferenciaMs = hoy - fechaInicio;
            let diasTranscurridos = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
            if( diasTranscurridos  > 5){

                let suiteQl = `SELECT
                    ec.name AS estado_cobertura,
                    v.name AS familia_producto,
                    v.custrecord_ht_pp_codigo AS fam,
                    CASE
                        WHEN tc.custrecord_ht_codigo_nuevo IN ('CAR', 'MON', 'SAT', 'PER', 'SER') THEN 'MON'
                        WHEN tc.custrecord_ht_codigo_nuevo = 'LOJ' THEN 'LOJ'
                        ELSE 'NO DEFINIDA'
                    END AS codigo
                FROM customrecord_ht_co_cobertura co
                JOIN customlist_ht_estado_cobertura ec ON ec.id = co.custrecord_ht_co_estado_cobertura
                JOIN customrecord_ht_general_tabla_codigos tc ON tc.custrecord_ht_codigo_gtc = co.custrecord_ht_co_familia_prod
                JOIN customrecord_ht_cr_pp_valores v ON v.id = co.custrecord_ht_co_familia_prod
                WHERE custrecord_ht_co_bien = ?
                AND custrecord_ht_co_subsidiaria = 2
                `;
                let respuesta = _executeQuery(suiteQl, [data.bien_id]);

                if(respuesta){
                    let monitoreo = false;
                    let lojack = false;
                    let cliente_vip = false
                    for (let i = 0; i < respuesta.length; i++) {
                        const element = respuesta[i];
                        if( element.codigo == 'MON' ){
                            if( element.fam == 'MH' || element.fam == 'BM'){
                                cliente_vip = true;
                            }
                            monitoreo = true;
                        }
                        if( element.codigo == 'LOJ'){
                            lojack = true;
                        }
                    }

                    if ( monitoreo && lojack) {
                        monitoreo = false;
                    }

                    //log.debug(data.nro_caso, `PRODUCTO${lojack ? 'lojack': 'monitoreo' } - DÍAS: ${diasTranscurridos}`);

                    if( lojack &&  diasTranscurridos > 20) {
                        log.audit("CERRAR POR LOJACK", `${data.nro_caso} | DÍAS: ${diasTranscurridos}`);
                        notificacion = _cerrarCaso(data.caso_id, data.bien_id);
                        return;
                    }

                    if( monitoreo ) {
                        if ( cliente_vip ) {
                            if( diasTranscurridos > 10){
                                log.audit("CERRAR POR MONITOREO VIP", `${data.nro_caso} | DÍAS: ${diasTranscurridos}`);
                                notificacion = _cerrarCaso(data.caso_id, data.bien_id);
                            }
                        } else{
                            log.audit("CERRAR POR MONITOREO", `${data.nro_caso} | DÍAS: ${diasTranscurridos}`);
                            notificacion = _cerrarCaso(data.caso_id, data.bien_id);
                        }
                    }
                } else {
                    log.audit("CERRAR POR SIN COBERTURA", `${data.nro_caso} | DÍAS: ${diasTranscurridos}`);
                    //notificacion = _cerrarCaso(data.caso_id, data.bien_id);
                }

                if ( notificacion ){
                    let seguimiento = `CIERRE AUTOMÁTICO DE CASO POR: ${data.etapa} NRO:${data.nro_caso} ESTADO: CERRADO FECHA DENUNCIA: ${data.startdate}`;
                    let cliente = data.cliente_id;
                    seguimiento  = seguimiento.toUpperCase();
                    let vehiculo = data.bien_id;
                    let telefonoContacto = data.telefono

                    nuevo_seguimiento(cliente, vehiculo, telefonoContacto, seguimiento);

                    if( data.representante_ventas && data.repesentante_ventas_email.length > 0 ) {
                        let subject = `CIERRE AUTOMÁTICO DE CASO ${data.nro_caso} - ${data.etapa} - CERRADO`;
                        let salesrepEmail = data.repesentante_ventas_email;

                        if( !salesrepEmail || salesrepEmail == 'sincorreo@carsegsa.com' ){
                            //log.debug("enviarNotificacionCorreo", `No se envia a ${salesrepEmail} - ${typeof salesrepEmail}`);
                            return true;
                        }else{
                            correo_jefe = getApiData(data.representante_ventas);
                        }

                        let envType = runtime.envType;
                        let entorno;
                        if (envType === runtime.EnvType.SANDBOX) {
                            entorno = 'https://7451241-sb1.app.netsuite.com'
                        } else if (envType === runtime.EnvType.PRODUCTION) {
                            entorno = 'https://7451241.app.netsuite.com'
                        }

                        let body = `
                        <table border="1" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border: 2px solid #ccc;">
                            <!-- Header with logo images -->
                            <tr>
                                <td style="padding: 20px 0 0 20px; background-color: #fff;">
                                    <img src="https://www.hunter.com.ec/images/logo.png" alt="Logo Principal" style="display: inline-block; max-width: 100px; height: auto; margin-bottom: 10px;">

                                    <img src="https://www.aafd.org/wp-content/uploads/2024/11/NetSuite-logo-half-light.jpg" alt="Logo Área Control" style="display: inline-block; max-width: 80px; height: auto;">
                                </td>
                            </tr>

                            <!-- Notification Title -->
                            <tr>
                                <td style="padding: 20px; text-align: center; background-color: #f8f8f8; border-bottom: 2px solid #DE022E; border-top: 2px solid #DE022E;">
                                    <h1 style="margin: 0; color: #DE022E; font-size: 24px; font-weight: bold;">NOTIFICACIÓN DE CASO</h1>
                                </td>
                            </tr>

                            <!-- Notification Content -->
                            <tr style="border-bottom: 0px solid #fff">
                                <td style="padding: 10px 20px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 5px; margin-bottom: 5px;">
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold; width: 40%;">Cliente</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">
                                                <a href="${entorno}/app/common/entity/custjob.nl?id=${data.cliente_id}" style="color: #000000; text-decoration: none; font-weight: bold;">${data.nombre_cliente} - ${data.entity.replace('C-EC-', '')}</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Bien</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">
                                                <a href="${entorno}/app/common/custom/custrecordentry.nl?rectype=698&id=${data.bien_id}" style="color: #000000; text-decoration: none; font-weight: bold;">${data.bien_altname}</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 20px;">
                                    <!-- Status indicator -->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 5px; margin-bottom: 5px;">
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold; width: 40%;">Número de Caso:</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">
                                                <a href="${entorno}/app/crm/support/supportcase.nl?id=${data.caso_id}"  style="color: #000000; text-decoration: none; font-weight: bold;">${data.nro_caso}</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Etapa:</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">CODIGO ROJO</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Estado:</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">CERRADO</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Fecha de Denuncia:</td>
                                            <td style="padding: 10px; border: 1px solid #dddddd;">${data.startdate}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 20px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                                    <p style="margin: 0 0 10px 0;">NOTA: ESTE MENSAJE FUE GENERADO DE FORMA AUTOMÁTICA. FAVOR NO RESPONDER A ESTA DIRECCIÓN.</p>
                                </td>
                            </tr>
                        </table>
                        `;
                        if ( correo_jefe ){
                            correo(subject, body, salesrepEmail, correo_jefe);
                        }
                    }

                }
            }

            return true;
        } catch (error) {
            log.error("ERROR map", error);
            return true;
        }
    }

    function reduce(context){
        try {
            return true;
        } catch (error) {
            log.error("ERROR reduce", error);
            return true;
        }
    }

    function summarize(summary){
        try {
            return true;
        } catch (error) {
            log.error("ERROR summarize", error);
            return true;
        }
    }

    function _executeQuery(sqlQuery, params = []) {
        try {
            // Aseguramos que params sea un array válido
            if (!Array.isArray(params)) {
                params = [];
            }
            let resultSet = query.runSuiteQL({ query: sqlQuery, params: params });
            let results = resultSet.asMappedResults();
            if (results.length > 0) {
                return results.map(obj => {
                    return Object.fromEntries(
                        Object.entries(obj).map(([key, value]) => [
                            key,
                            typeof value === 'string' ? value.replace(/\n/g, " ") : value === null ? "" : value
                        ])
                    );
                });
            } else {
                return false;
            }
        } catch (error) {
            log.error("_executeQuery error", error);
        }
    }

    function _cerrarCaso(caso_id, bien_id){
        try {
            // Cerrar caso
            record.submitFields({
                type: record.Type.SUPPORT_CASE,
                id: caso_id,
                values: {
                    custevent_ht_caso_etapacaso: 4, // CODIGO ROJO
                    status: 5,                       // Cerrado
                    emailform: false
                }
            });

            // Actualizar bien
            record.submitFields({
                type: 'customrecord_ht_record_bienes',
                id: bien_id,
                values: {
                    custrecord_ht_bn_estadobien: 3  // CODIGO ROJO
                }
            });

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: 'PD_Bienes' });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: {'origen': 'caso'} });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: bien_id || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: 'F' });
            objRecord.save();
            const log_proceso_general = objRecord.save();
            log.debug("Log Proceso General", log_proceso_general);

            return true;
        } catch (error) {
            log.error("ERROR _cerrarCaso", error);
        }
    }

    function nuevo_seguimiento(cliente, vehiculo, telefonoContacto, seguimiento) {
        try {
            let estado_seguimiento = _coberturaController.GenerarSeguimientoCliente({
                empleado: 449,
                tipoCliente: 1, // CLIENTES CARSEG
                estado: 2,
                //fechaContacto: fechaSolicitud,
                cliente,
                //modoContacto: 1,
                //resultadoGestion: 23,
                //cmotivo: 110,
                fechaProximoContacto: new Date(),
                fechaPromesa: new Date(),
                //proximoContacto: 1,
                seguimiento,
                //telefonoAlterno: "",
                tipoSeguimiento: 8, // 8 CONTROL
                vehiculo,
                subsidiaria: 2,
                telefonoContacto,
            });

            log.debug("Seguimiento", estado_seguimiento);
        } catch (error) {
            log.error("ERROR notificacion", error);
        }
    }

    function correo(subject, body, salesrepEmail, correo_jefe) {
        try {
            email.send({
                author: 449,
                recipients: [salesrepEmail],
                cc: [correo_jefe],
                bcc: ['mramos@carsegsa.com'],//, 'vreyes@carsegsa.com'],
                subject,
                body,
            });
        } catch (error) {
            log.error("ERROR correo", error);
        }
    }

    function getApiData(representante_ventas) {
        try {
        let loginApiToken = _funcion.loginGetToken();
        let params = {
            opcion: "100",
            datSelect: "SELECT TOP 1 EMP.CODIGO EJECUTIVA, JEF.CODIGO JEFE, RTRIM(LTRIM(EMP.IDENTIFICACION )) IDENTIFICACION_EJE,RTRIM(LTRIM(JEF.IDENTIFICACION )) IDENTIFICACION_JEF, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE EJ.CEDULA = EMP.IDENTIFICACION AND EJ.STATUS NOT IN ('E')),'') MAIL_EJECUTIVO, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE EJ.CEDULA = JEF.IDENTIFICACION AND EJ.STATUS NOT IN ('E')), '') MAIL_JEFE, ISNULL((SELECT EJ.DIRECCION_E_MAIL FROM HUNTER.DBO.COM_EMPLEADO_COMISION J WITH(NOLOCK), SRVHAWKEYE.hra_prod.[dbo].[VW_COLABORADORES_SYSHUNTER] EJ WITH(NOLOCK) WHERE J.COM_EMPLEADO_ID = EMP.JEFE_ID AND EJ.CEDULA = J.IDENTIFICACION AND EJ.STATUS NOT IN ('E')),'') MAIL_JEFE2, EMP.JEFE_ID, EMP.CODIGO_NS, R.*",
            datFrom: "FROM Hunter.DBO.COM_RELACION_EMPLEADO R WITH(NOLOCK), Hunter.DBO.COM_EMPLEADO_COMISION EMP WITH(NOLOCK), Hunter.DBO.COM_EMPLEADO_COMISION JEF WITH(NOLOCK)",
            datWhere: `WHERE R.COM_EMPLEADO_ID = EMP.COM_EMPLEADO_ID AND R.JEFE_ID = JEF.COM_EMPLEADO_ID AND EMP.CODIGO_NS = ${representante_ventas} AND JEF.GEN_ESTADO_ID = 1 AND R.GEN_ESTADO_ID = 1 AND JEF.CODIGO NOT IN ('JREYMU','LYESQU','MSAMAM',EMP.CODIGO) ORDER BY R.COM_RELACION_EMPLEADO_ID DESC`
            };

        let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";

        let headersConsulta = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${loginApiToken}`,
        };

        let response = https.post({
          url: urlBase,
          headers: headersConsulta,
          body: JSON.stringify(params),
        });

        let data = JSON.parse(response.body);
        return data.results[0].MAIL_JEFE;
        } catch (error) {
            log.error("error", error)
            return false
        }
    }

    return { getInputData, map, reduce, summarize }
});