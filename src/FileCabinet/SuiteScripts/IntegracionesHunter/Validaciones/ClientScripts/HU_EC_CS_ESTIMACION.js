/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 03/10/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define( ['N/log', 'N/url', 'N/runtime', 'N/record', 'N/https', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION.js'], function(log, url, runtime, record, https, _funcion) {

    function fieldChanged(context) {
        try {
            const { subsidiary } = runtime.getCurrentUser();
            if (subsidiary === 2) {
                _formulario(context);
            }
        } catch (error) {
            log.error("ERROR fieldChanged", error);
        }
    }

    function _formulario(context) {
        try {
            const { fieldId, currentRecord } = context;

            console.log(fieldId)

            if ( fieldId == 'salesrep') {
                let representante_ventas_id = currentRecord.getValue('salesrep');
                if ( representante_ventas_id ) {
                    const representante_ventas = record.load({ type: record.Type.EMPLOYEE, id: representante_ventas_id });

                    const departamento = representante_ventas.getValue({ fieldId: 'department' });
                    const oficina = representante_ventas.getValue({ fieldId: 'location' });

                    if ( departamento ) currentRecord.setValue({ fieldId: 'department', value: departamento, ignoreFieldChange: true, forceSyncSourcing: true });
                    if ( oficina ) currentRecord.setValue({ fieldId: 'location', value: oficina, ignoreFieldChange: true, forceSyncSourcing: true });

                    let correo_jefa = getApiData(representante_ventas_id);
                    if ( correo_jefa ) {
                        currentRecord.setValue({fieldId: 'custbody_correo_jefatura', value: correo_jefa, ignoreFieldChange:true, forceSyncSourcing: true})
                    }
                }else{
                    currentRecord.setValue({fieldId: 'custbody_correo_jefatura', value: '', ignoreFieldChange:true, forceSyncSourcing: true})
                    currentRecord.setValue({ fieldId: 'department', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                    currentRecord.setValue({ fieldId: 'location', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                }
            }

            if ( fieldId == 'custpage_correo' ) {
                const correo = currentRecord.getValue('custpage_correo');
                if ( correo ) currentRecord.setValue({ fieldId: 'custbody_correo_ultima_vez_enviado', value: correo, ignoreFieldChange: true, forceSyncSourcing: true });
            }

            if ( fieldId == 'custpage_archivo_pdf_nombre') {
                const nombre_pdf = currentRecord.getValue('custpage_archivo_pdf_nombre');
                if ( nombre_pdf ) currentRecord.setValue({ fieldId: 'custbody_archivo_pdf_adjuntado', value: nombre_pdf, ignoreFieldChange: true, forceSyncSourcing: true });
            }
            if ( fieldId == 'custpage_archivo_bienes_nombre') {
                const nombre_excel = currentRecord.getValue('custpage_archivo_bienes_nombre');
                if ( nombre_excel ) currentRecord.setValue({ fieldId: 'custbody_archivo_excel_bienes', value: nombre_excel, ignoreFieldChange: true, forceSyncSourcing: true });
            }

            if ( fieldId == 'custbody_ht_so_bien' ) {
                const bien_id = currentRecord.getValue('custbody_ht_so_bien');
                if ( bien_id ) {

                    const bien = record.load({ type: 'customrecord_ht_record_bienes', id: bien_id });
                    const motor = bien.getValue({ fieldId: 'custrecord_ht_bien_motor' });
                    const chasis = bien.getValue({ fieldId: 'custrecord_ht_bien_chasis' });

                    let row = false;

                    if ( bien.id ) row = bien.id;
                    if ( motor ) row += ','+ motor;
                    if ( chasis ) row += ',' + chasis;
                    if ( bien.id && motor && chasis && row ) {
                        currentRecord.setValue({ fieldId: 'custbody_archivo_excel_bienes', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_nombre', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_header', value: 'id,motor,chasis', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_rows', value: row, ignoreFieldChange: true, forceSyncSourcing: true });
                    }
                }else {
                        currentRecord.setValue({ fieldId: 'custbody_archivo_excel_bienes', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_nombre', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_header', value: '', ignoreFieldChange: true, forceSyncSourcing: true });
                        currentRecord.setValue({ fieldId: 'custpage_archivo_bienes_rows', value: '',  ignoreFieldChange: true, forceSyncSourcing: true });
                }
            }
        } catch (error) {
            log.error("ERROR _formulario", error.stack);
        }
    }

    function saveRecord(context) {
        try {
            const { subsidiary } = runtime.getCurrentUser();
            let flag = true;
            if (subsidiary === 2) {
                flag = _enviar_cliente(context);
            }

            return flag;
        } catch (error) {
            log.error("ERROR saveRecord", error);
        }
    }

    function _enviar_cliente(context) {
        try {
            let { currentRecord } = context
            let enviar_correo = currentRecord.getValue({ fieldId: "custpage_enviar_correo"});
            let correo_cliente = currentRecord.getText({ fieldId: "custpage_correo"});
            //let archivo_bienes = currentRecord.getText({ fieldId: "custpage_archivo_bienes_contenido"});

            if ( enviar_correo ) {
                if ( correo_cliente.length == 0) {
                    alert("Para hacer el envio de la estimación al cliente indique el correo destinatario.")
                    return false;
                }
                // if (archivo_bienes.length == 0) {
                //     alert("No ha ingresado un archivo de bienes.");
                //     return false;
                // }
            }
            return true;
        } catch (error) {
           log.error("ERROR _enviar_cliente", error);
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

    return { fieldChanged, saveRecord }

});