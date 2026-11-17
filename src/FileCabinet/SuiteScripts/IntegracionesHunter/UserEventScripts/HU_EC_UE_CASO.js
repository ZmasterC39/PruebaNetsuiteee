/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author Mauro F Ramos
 * @date Created at: 20/02/2025 - Last modified: 26/02/2025
 * @description
 *  - Botón de impresión de caso
 *  - Generar seguimiento al crear o cerrar un caso ( _definirSeguimiento )
 *
 * @version 1.0
 * @notes - Ninguna -
 */
define(['N/record', 'N/log', 'N/runtime', 'N/query', "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController", 'N/format', 'N/email', 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_CASO.js', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION.js', 'N/https'], function (record, log, runtime, query, _coberturaController, format, email, csCaso, _funcion, https) {

    function beforeLoad(context) {
        try {
            let usuario = runtime.getCurrentUser();

            if(usuario.subsidiary == 2){
                _inputsFormulario(context);
            }

        } catch (error) {
            log.error("Error en beforeLoad", error);
        }
    }

    function _inputsFormulario(context){
        try {

            let ftl = 0
            let form = context.form;
            form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Plantillas/ClientScripts/HU_EC_CS_STANDARD_PDF.js'

            let objRecord = context.newRecord;
            let type = objRecord.type;
            let formulario =  objRecord.getValue({ fieldId: 'customform' });
            // Suitelet
            const custScript = "customscript_hu_ec_st_caso";
            const custDeploy = "customdeploy_hu_ec_st_caso";
            if (context.type === context.UserEventType.VIEW ) {
                let id = objRecord.id;
                let formload = record.load({
                    type,
                    id,
                    isDynamic: true,
                });

                let formulario = formload.getValue({ fieldId: 'customform' });
                if( formulario === "82" ){
                    form.addButton({
                        id: 'custpage_imprimir_caso',
                        label: 'Imprimir Caso',
                        functionName: `customButtonFunction('${type}','${id}','${custScript}','${custDeploy}','${ftl}')`
                    });

                }

            }

            if (context.type === 'create' || context.type === 'edit') {
                let newCampo = form.addField({
                    id: "custpage_problema_caso",
                    type: "SELECT",
                    label: "PROBLEMA DE CASO",
                });
                form.insertField({
                    field: newCampo,
                    nextfield: "issue",
                });

                let issueField = form.getField({ id: 'issue' });
                let selectOptions = issueField.getSelectOptions();
                let objRecord = context.newRecord;
                selectOptions.forEach(function(option) {
                    if (option.value === "1" && formulario === "82") {
                        newCampo.addSelectOption({
                            value: option.value,
                            text: option.text
                        });
                    }
                });
                newCampo.defaultValue = "1";
                if(context.type === 'edit'){
                    let issue = objRecord.getValue({ fieldId: 'issue' });
                    newCampo.defaultValue = `${issue}`;
                }
                let hidden = form.getField('issue');
                hidden.updateDisplayType({ displayType: "HIDDEN" });
            }
        } catch (error) {
            log.error("Error en _botones", error.stack);
        }
    }

    function afterSubmit(context) {
        try {
            let usuario = runtime.getCurrentUser();

            if(usuario.subsidiary == 2){
                _definirSeguimiento(context);
            }
        } catch (error) {
            log.error("Error en afterSubmit", error);
            log.error("Error en afterSubmit", error.stack);
        }
    }

    function _definirSeguimiento(context) {
        try {
            let currentMode = context.type;
            if(currentMode == 'delete'){ return; }
            let usuario = runtime.getCurrentUser();
            let oldRecord = context.oldRecord;
            let newRecord = context.newRecord;
            log.debug("id caso", newRecord.id)
            log.debug("caso", newRecord)
            let supportcase = _executeQuery(`SELECT casenumber FROM supportcase WHERE id = ?`, [newRecord.id]); // * NÚMERO DE CASO
            let caso_numero = supportcase[0].casenumber
            let etapagestion = _executeQuery(`SELECT name  FROM customrecord_ht_eg_etapagestion WHERE id = ?`, [ newRecord.getValue({fieldId: 'custevent_ht_caso_etapacaso' }) ]); // * ETAPA DEL CASO
            let etapa = etapagestion[0].name;
            log.debug("status", newRecord.getValue({fieldId: 'status' }))
            //let caso_estado = _executeQuery(`SELECT name FROM supportCaseStatus WHERE id = ?`, [ newRecord.getValue({fieldId: 'status' }) ]); // * ESTADO DEL CASO
            let estado = newRecord.getText({fieldId: 'status' })//caso_estado[0].name.toUpperCase();
            let cliente = newRecord.getValue({fieldId: 'company' });
            let vehiculo = newRecord.getValue({fieldId: 'custevent_ht_caso_vehiculo' });
            let telefonoContacto = newRecord.getValue({fieldId: 'phone' });
            let fechaDenuncia = newRecord.getValue({fieldId: 'startdate'});
            let seguimiento = ``;
            if (fechaDenuncia) {
                fechaDenuncia = format.format({
                    value: fechaDenuncia,
                    type: format.Type.DATETIME
                });
                fechaDenuncia = fechaDenuncia.split(' ')[0]
            }
            let estado_seguimiento; // SOLO PARA DEBUG
            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* GENERAR SEGUIMIENTO AL CREAR CASO: CREATE *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // 1849	EC OPERADOR CONTROL
            // 1811	EC - Administrador
            if( (currentMode == 'create') && [1849, 1811].includes(usuario.role) ){
                seguimiento = `SE HA REGISTRADO UN NUEVO CASO DESDE EL AREA DE CONTROL POR: ${etapa} NRO:${caso_numero} ESTADO: ${estado} FECHA DENUNCIA: ${fechaDenuncia}`;
            }
            // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* GENERAR SEGUIMIENTO AL CERRAR EL CASO: EDIT *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            if(currentMode == 'edit' && [1849, 1811].includes(usuario.role)){
                let oldEstado = oldRecord.getValue({ fieldId: 'status' });
                let newEstado = newRecord.getValue({ fieldId: 'status' });

                let oldEtapa = oldRecord.getValue({ fieldId : 'custevent_ht_caso_etapacaso'});
                let newEtapa = newRecord.getValue({ fieldId : 'custevent_ht_caso_etapacaso'});
                let flag = true;

                // 1 DENUNCIA         2 RECUPERACION
                // 1 DENUNCIA         4 CODIGO ROJO
                if(oldEtapa == "1" && ["2", "4"].includes(newEtapa)){
                    seguimiento = `SE HA CERRADO UN CASO DESDE EL AREA DE CONTROL POR: ${etapa} NRO:${caso_numero} ESTADO: ${estado} FECHA DENUNCIA: ${fechaDenuncia}`;
                    flag = false;
                }
                // 1	No iniciado
                // 2	En curso
                // 3	Escalado
                // 4	Reabierto
                // 5    Cerrado
                if(["1","2","3","4"].includes(oldEstado) && newEstado == "5" && flag){
                    seguimiento = `SE HA CERRADO UN CASO DESDE EL AREA DE CONTROL POR: ${etapa} NRO:${caso_numero} ESTADO: ${estado} FECHA DENUNCIA: ${fechaDenuncia}`;
                }
            }
            if(seguimiento.length > 0){
                if ( etapa == 'DENUNCIA'){
                    _actualizar_estado_bien(vehiculo, 18);  // DENUNCIA - DENUNCIA DE ROBO
                }

                if ( etapa == 'RECUPERACION') {
                    _actualizar_estado_bien(vehiculo, 11); // RECUPERACION - VIGENTE
                }

                if ( etapa == 'CODIGO ROJO' ) {
                    _actualizar_estado_bien(vehiculo, 3); // CODIGO ROJO - CODIGO ROJO
                }
                log.debug("seguimiento", seguimiento);
                estado_seguimiento = _coberturaController.GenerarSeguimientoCliente({
                    empleado: usuario.id,
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
                    seguimiento: seguimiento.toUpperCase(),
                    //telefonoAlterno: "",
                    tipoSeguimiento: 8, // 8 CONTROL
                    vehiculo,
                    subsidiaria: 2,
                    telefonoContacto,
                });
                log.debug("Estado de seguimiento", estado_seguimiento);

                // 442847
                // let salesrep = _executeQuery('SELECT c.altname, c.salesrep, e.email FROM customer c JOIN employee e ON c.salesrep = e.id WHERE c.id = ?', [cliente]);
                // let salesrep_email = salesrep[0].email;
                // log.debug("salesrep_email", salesrep_email);

                let customer = _executeQuery('SELECT c.altname, c.entityid AS num, c.salesrep,  e.email AS salesrepemail FROM customer c JOIN employee e ON e.id = c.salesrep  WHERE c.id = ?', [cliente]);
                if(!customer){
                  log.debug("No se encontro representante de ventas, acción correo abortada");
                    return;
                }
                let datos = getApiData(customer[0]?.salesrep);
                if ( !datos ) {
                  return;
                }
                
                let salesrepEmail = customer[0].salesrepemail ?? false;
                let bien = _executeQuery('SELECT altname FROM customrecord_ht_record_bienes WHERE id = ?', [vehiculo])
                let subject = "";

                let envType = runtime.envType;
                let entorno;
                if (envType === runtime.EnvType.SANDBOX) {
                    entorno = 'https://7451241-sb1.app.netsuite.com'
                } else if (envType === runtime.EnvType.PRODUCTION) {
                    entorno = 'https://7451241.app.netsuite.com'
                }

                if(currentMode == 'create'){
                    subject = `NUEVA GESTIÓN DE RECUPERACIÓN ${caso_numero} - ${etapa} - ${estado}`;
                }else if(currentMode == 'edit'){
                    subject = `CIERRE GESTIÓN DE RECUPERACIÓN ${caso_numero} - ${etapa} - ${estado}`;
                }

                subject = `${subject}`;

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
                                        <a href="${entorno}/app/common/entity/custjob.nl?id=${cliente}" style="color: #000000; text-decoration: none; font-weight: bold;">${customer[0].altname} - ${customer[0].num.replace('C-EC-', '')}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Bien</td>
                                    <td style="padding: 10px; border: 1px solid #dddddd;">
                                        <a href="${entorno}/app/common/custom/custrecordentry.nl?rectype=698&id=${vehiculo}" style="color: #000000; text-decoration: none; font-weight: bold;">${bien[0].altname}</a>
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
                                        <a href="${entorno}/app/crm/support/supportcase.nl?id=${newRecord.id}"  style="color: #000000; text-decoration: none; font-weight: bold;">${caso_numero}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Etapa:</td>
                                    <td style="padding: 10px; border: 1px solid #dddddd;">${etapa}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Estado:</td>
                                    <td style="padding: 10px; border: 1px solid #dddddd;">${estado}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Fecha de Denuncia:</td>
                                    <td style="padding: 10px; border: 1px solid #dddddd;">${fechaDenuncia}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                            <p style="margin: 0 0 10px 0;">Este es un mensaje automático. Por favor, no responda a este correo electrónico.</p>
                        </td>
                    </tr>
                </table>
                `;

                log.debug("correos", `${salesrepEmail} - ${datos.MAIL_JEFE}`)

                csCaso.enviarNotificacionCorreo(subject, body, salesrepEmail, datos.MAIL_JEFE);
            }
        } catch (error) {
            log.error("errror _definirSeguimiento", error);
            log.error("Error en _definirSeguimiento", error.stack);
        }
    }

    function _executeQuery(sqlQuery, params) {
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
    }

    function _actualizar_estado_bien(bien_id, estado){
        try {
            record.submitFields({
                type: 'customrecord_ht_record_bienes',
                id: bien_id,
                values: {
                    custrecord_ht_bn_estadobien: estado
                }
            });

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: 'PD_Bienes' });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: {'origen': 'caso'} });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: bien_id || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: 'F' });
            objRecord.save();
            const log_proceso_general = objRecord.save();
            log.audit("Log Proceso General", log_proceso_general);
        } catch (error) {
            log.error("Error _actualizar_estado_bien", error);
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
        log.debug("data return", data);
        return data.results[0];
        } catch (error) {
            log.error("error", error)
            return false
        }
    }

    return { beforeLoad: beforeLoad, afterSubmit : afterSubmit,  };
});