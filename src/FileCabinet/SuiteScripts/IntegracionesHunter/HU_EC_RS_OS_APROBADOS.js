/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *
*/

define(['N/log', 'N/search', 'N/runtime', 'N/email', 'N/format', "N/record", 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES', 'N/https',
], function (log, search, runtime, email, format, record, _toolkit, _funcion, _const, https) {

    function _post(context) {
        try {
            let { accion, tarea } = context;
            let resultado;
            switch (accion) {
                case 'notificaciones_os':
                    let { ordenes, ejecutiva_ref_id } = context;
                    if (tarea == 1) {
                        // Extracción de notas del sistemas
                        resultado = _getNotificacionesOS(context);
                    } else if (tarea == 2) {
                        // Procesamiento de data para correo electrónico
                        resultado = _procesarOSAprobadas(ordenes, ejecutiva_ref_id);
                        resultado = JSON.stringify({
                            success: true,
                            message: 'envio'
                        });
                    }
                    break;
                case 'infSim_ot':
                    if (tarea == 1) {
                        // Extracción de notas del sistemas
                        resultado = _obtenerOTChequeadasConSimMovistar(context)
                    } else if (tarea == 2) {
                        // Procesamiento de data para correo electrónico
                        resultado = _procesarOtIndividualChequeadasConSimMovistar(context);
                        resultado = JSON.stringify({
                            success: true,
                            message: 'Exito'
                        });
                    }
                    break;
                case 'infSim_os':
                    if (tarea == 1) {
                        // Extracción de notas del sistemas
                        // resultado = _obtenerOTChequeadasConSimMovistar(context)
                    } else if (tarea == 2) {
                        // Procesamiento de data para correo electrónico
                        resultado = _procesarOsIndividualChequeadasConSimMovistar(context);
                        resultado = JSON.stringify({
                            success: true,
                            message: 'Exito'
                        });
                    }
                    break;
                case 'ot-chequeadas':
                    if (tarea == 1) {
                        // Extracción de notas del sistemas
                        resultado = _getOtChequeadas(context);
                    } else if (tarea == 2) {
                      log.debug("<span style='background-color: #437bb0'>otCheada | Data para envío certificado automático</span>", context.certificado)
                        let estado_envio = _enviarCertificado(context.certificado)
                        return estado_envio;
                        // Procesamiento de data para correo electrónico
                        // resultado = JSON.stringify({
                        //     success: true,
                        //     message: 'Exito'
                        // });
                    }
                    break;
                default:
                    resultado = JSON.stringify({
                        success: false,
                        message: 'Acción no reconocida'
                    });
                    break;
            }

            return resultado;
        } catch (error) {
            log.error("<p style='color:red;'> ERROR _post</p>", error.stack)
        }
    }

    function _crear_seguimiento(estado, cliente, idbien, tipo, id, nombre, correo, orden, orden_trabajo) {
        try {
            const seguimiento = record.create({ type: 'customrecord_ht_record_seguicliente', isDynamic: true });
            seguimiento.setValue({ fieldId: 'customform',                         value: 278 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tipocliente',       value: 1 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_estado',            value: estado });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_tiposeguimiento',   value: 1 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cliente',           value: cliente});
            //seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cliente',           value: 446544});
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_modocontacto',      value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_resultadogestion',  value: 39 });
            // seguimiento.setValue({ fieldId: 'custrecord_ht_sc_cmotivo',           value: 123 }); // No se usa por duplicado o no existe motivo
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_seguimiento',       value: `${tipo.toUpperCase()}: ${id} ${nombre}\nOS: ${orden} / OT: ${orden_trabajo}\nSe envío el certificado de Instalación a:\n${correo}` });

            // seguimiento.setValue({ fieldId: 'custrecord_ht_sc_proximocontacto',   value: 2 });
            seguimiento.setValue({ fieldId: 'custrecord_ht_sc_vehiculo', value: idbien });
            // seguimiento.setValue({ fieldId: 'custrecord_ht_sc_vehiculo', value: "988228" });
            seguimiento.setValue({ fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 });

            seguimiento.save();
        } catch (error) {
            log.error("ERROR _crear_seguimiento", error)
        }
    }

    function _enviarCertificado(datos_certificado){
        try {
            const token = _funcion.loginGetToken();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            canales = [
                { tipo: "concesionaria", correo: datos_certificado.email_concesionaria, nombre: datos_certificado.nombre_concesionaria, id: datos_certificado.concesionaria, orden: datos_certificado.orden, orden_trabajo: datos_certificado.orden_trabajo },
                { tipo: "financiera", correo: datos_certificado.email_financiera, nombre: datos_certificado.nombre_financiera, id: datos_certificado.financiera, orden: datos_certificado.orden, orden_trabajo: datos_certificado.orden_trabajo },
                { tipo: "aseguradora", correo: datos_certificado.email_aseguradora, nombre: datos_certificado.nombre_aseguradora, id: datos_certificado.aseguradora, orden: datos_certificado.orden, orden_trabajo: datos_certificado.orden_trabajo },
                { tipo: "vendedor", correo: datos_certificado.email_vendedor, nombre: datos_certificado.nombre_vendedor, id: datos_certificado.vendedor, orden: datos_certificado.orden, orden_trabajo: datos_certificado.orden_trabajo }
            ];

            const response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE+'/Automatico/CertificadoAutomaticoSys',
                headers: headers,
                body: JSON.stringify(datos_certificado)
            });

            //const respuestaJob = response.body;
            const respuestaJob = JSON.parse(response.body);

            let objRecord = record.create({ type: 'customrecord_registro_actividad', isDynamic: true });
            let registro_actividad;
            log.debug("respuestaJob", respuestaJob);
            log.debug("respuestaJob", respuestaJob?.statusCode);
            log.debug("respuestaJob", respuestaJob?.statusCode == 200);
            // return;
            if (respuestaJob?.statusCode == 200 ) {
                log.debug("response",respuestaJob?.statusCode);
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_cliente', value: datos_certificado.id_cliente });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_estado', value: 3 });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_inic', value: new Date() });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_fin', value: new Date() });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_detalle', value:  JSON.stringify(datos_certificado) });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_nombre', value: 3 });
                registro_actividad = objRecord.save();
                canales.forEach((canal) => {
                    if (canal.correo && canal.correo.length > 0) {
                        _crear_seguimiento(2, datos_certificado.id_cliente, datos_certificado.idbien, canal.tipo, canal.id, canal.nombre, canal.correo, canal.orden, canal.orden_trabajo);
                    }
                });
                return JSON.stringify({
                    success: true,
                    message: 'Se creo el registro de actividad para el envio de certificado',
                });
            }else{
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_cliente', value: datos_certificado.id_cliente });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_estado', value: 4 });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_inic', value: new Date() });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_fin', value: new Date() });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_detalle', value:  JSON.stringify(datos_certificado) });
                objRecord.setValue({ fieldId: 'custrecord_registro_actividad_nombre', value: 3 });
                registro_actividad = objRecord.save();

                return JSON.stringify({
                    success: false,
                    message: 'Error en el envio de certificado, se creo el registro de actividad para revisión',
                });
            }

        }catch (error) {
            let objRecord = record.create({ type: 'customrecord_registro_actividad', isDynamic: true });
            let registro_actividad;
            log.error("<p style='color:red;'> ERROR _enviarCertificado</p>", error.stack);
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_cliente', value: datos_certificado.id_cliente });
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_estado', value: 4 });
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_inic', value: new Date() });
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_fecha_fin', value: new Date() });
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_detalle', value:  JSON.stringify(datos_certificado) });
            objRecord.setValue({ fieldId: 'custrecord_registro_actividad_nombre', value: 3 });
            registro_actividad = objRecord.save();
            return JSON.stringify({
                success: false,
                message: 'Error en el envio de certificado,' + error.message,
            })
        }
    }

    function _getOtChequeadas(context){
        try {

            const notas = _getNotasSistemaOTCheaqueadas();

            if (notas) {
                return JSON.stringify({
                    success: true,
                    message: 'Si se encontro datos en notas del sistema',
                    data: notas
                });
            } else {
                return JSON.stringify({
                    success: false,
                    message: 'No hay información en notas del sistema',
                });
            }
        } catch (error) {
            return JSON.stringify({
                success: false,
                message: error
            });
        }
    }

    function _getNotasSistemaOTCheaqueadas(params) {
        try {
            let fecha = _toolkit.getFecha().fecha2;
            let dateObj = new Date(_toolkit.getFecha().iso);
            dateObj.setMinutes(dateObj.getMinutes() - 5);

            function formatNS(date) {
                return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() +
                    " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
            }

            let fechaHace5Min = formatNS(dateObj);

            const sql = `
                SELECT DISTINCT
                    TO_CHAR(sn.date, 'DD/MM/YYYY HH24:MI:SS') fecha,
                    ot.id AS id_ot,
                    ot.name AS orden_trabajo,
                    ot.custrecord_ht_ot_orden_servicio AS idOs,
                    ot.custrecord_ht_ot_item AS item_id,
                    ot.custrecord_ht_ot_vehiculo AS idbien,
                    valores.custrecord_ht_pp_codigo AS accion,
                    valores130.custrecord_ht_pp_codigo AS familia
                FROM systemnote sn
                INNER JOIN customrecord_ht_record_ordentrabajo ot
                    ON ot.id = sn.recordid
                -- ADP=109 / valor=317 (fijo, filtro obligatorio)
                INNER JOIN customrecord_ht_pp_main_param_prod pp1
                    ON pp1.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                    AND pp1.custrecord_ht_pp_parametrizacion_rela = 109    -- ADP - ACCION DEL PRODUCTO
                    AND pp1.custrecord_ht_pp_parametrizacion_valor = 317   -- 001 - INST. DISPOSITIVO
                INNER JOIN customrecord_ht_cr_pp_valores valores
                    ON valores.id = pp1.custrecord_ht_pp_parametrizacion_valor
                -- rela=130 (valor variable, solo para mostrar el código)
                LEFT JOIN customrecord_ht_pp_main_param_prod pp4
                    ON pp4.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                    AND pp4.custrecord_ht_pp_parametrizacion_rela = 130
                LEFT JOIN customrecord_ht_cr_pp_valores valores130
                    ON valores130.id = pp4.custrecord_ht_pp_parametrizacion_valor
                WHERE
                    sn.date BETWEEN TO_DATE(?, 'DD/MM/YYYY HH24:MI') AND TO_DATE(?, 'DD/MM/YYYY HH24:MI')
                    --AND sn.recordid = 334802
                    AND sn.field = 'CUSTRECORD_HT_OT_ESTADO'
                    AND sn.oldvalue NOT IN ('V - VENTAS', 'X - NO EJECUTADO', 'C - CHEQUEADO')
                    AND sn.newvalue = 'C - CHEQUEADO'
                    AND ot.custrecord_ht_ot_estado = 2 -- OT Chequeada
                    AND NOT EXISTS (
                        SELECT 1
                        FROM customrecord_ht_pp_main_param_prod pp2
                        WHERE pp2.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                        AND pp2.custrecord_ht_pp_parametrizacion_rela = 146   -- IRP - ITEM DE REPUESTO
                    )
                        AND NOT EXISTS (
                        SELECT 1
                        FROM customrecord_ht_pp_main_param_prod pp5
                        WHERE pp5.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                        AND pp5.custrecord_ht_pp_parametrizacion_rela = 157   -- PGR - PRODUCTO DE GARANTÍA
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM customrecord_ht_pp_main_param_prod pp3
                        WHERE pp3.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_item
                        AND pp3.custrecord_ht_pp_parametrizacion_rela = 181   -- TDP - TIPO DE PRODUCTO
                        AND pp3.custrecord_ht_pp_parametrizacion_valor = 549  -- D - DEMO
                    )
            `;

            const filtro_ot = _toolkit.executeQuery(sql ,[fechaHace5Min, fecha]);
            //const filtro_ot = _toolkit.executeQuery(sql ,['04/08/2026 17:30', '04/08/2026 17:35']);

            log.debug("OT chequeadas hace 5 minutos", filtro_ot);

            if ( filtro_ot ) {

                const idosUnicos = [...new Set(filtro_ot.map(r => r.idos))];
                const placeholders = idosUnicos.map(() => '?').join(',');

                const sql2 = `
                    SELECT DISTINCT
                        t.id AS idOs,
                        t.tranid AS orden,
                        tl.subsidiary AS subsidiaria,
                        t.entity AS id_cliente,
                        REGEXP_SUBSTR(BUILTIN.DF(t.entity), '[0-9]+') AS clienteid,
                        t.custbody_ht_so_bien AS idbien,
                        b.custrecord_ht_bien_chasis AS chasis,

                        -- Aseguradora
                        t.custbody_ht_os_companiaseguros AS idaseguradora,
                        canal_aseg.custrecord_ht_cd_correo_certificados AS email_aseguradora,
                        canal_aseg.custrecord_ht_cd_ruccanaldistribucion AS aseguradora,
                        canal_aseg.custrecord_ht_cd_nombre AS nombre_aseguradora,

                        -- Concesionaria
                        t.custbody_ht_os_concesionario AS idconcesionaria,
                        canal_conc.custrecord_ht_cd_correo_certificados AS email_concesionaria,
                        canal_conc.custrecord_ht_cd_ruccanaldistribucion AS concesionaria,
                        canal_conc.custrecord_ht_cd_nombre AS nombre_concesionaria,

                        -- Financiera
                        t.custbody_ht_os_bancofinanciera AS idfinanciera,
                        canal_fin.custrecord_ht_cd_correo_certificados AS email_financiera,
                        canal_fin.custrecord_ht_cd_ruccanaldistribucion AS financiera,
                        canal_fin.custrecord_ht_cd_nombre AS nombre_financiera,


                        -- Vendedor
                        v.vatregnumber AS vendedor,
                        t.custbody_ht_os_vendcanaldistribucion AS idvendedor,
                        v.altemail AS email_vendedor,
                        v.altname AS nombre_vendedor

                    FROM transaction t
                        INNER JOIN transactionline tl
                            ON tl.transaction = t.id
                            AND tl.subsidiary = 2
                        INNER JOIN customrecord_ht_record_bienes b
                            ON b.id = t.custbody_ht_so_bien

                        -- Canal: Aseguradora
                        LEFT JOIN customrecord_ht_record_canaldistribucion canal_aseg
                            ON canal_aseg.id = t.custbody_ht_os_companiaseguros

                        -- Canal: Concesionaria
                        LEFT JOIN customrecord_ht_record_canaldistribucion canal_conc
                            ON canal_conc.id = t.custbody_ht_os_concesionario

                        -- Canal: Financiera
                        LEFT JOIN customrecord_ht_record_canaldistribucion canal_fin
                            ON canal_fin.id = t.custbody_ht_os_bancofinanciera

                        -- Vendedor (tabla vendor, no canaldistribucion)
                        LEFT JOIN vendor v
                            ON v.id = t.custbody_ht_os_vendcanaldistribucion AND v.category = 7

                    WHERE
                        t.id IN (${placeholders})

                        -- Al menos UNO de los 4 debe cumplir: activo/no-extranjero + email cargado
                        AND (
                            -- ============================================
                            -- FASE 1 (ACTUAL): Concesionaria y Vendedor
                            -- ============================================
                            (canal_conc.custrecord_ht_cd_envio_certificado = 'T' AND canal_conc.custrecord_ht_cd_correo_certificados IS NOT NULL)
                            OR
                            (v.custentity_proveedor_envio_certificado = 'T' AND v.altemail IS NOT NULL)

                            -- ============================================
                            -- FASE 2 (FUTURO): descomentar cuando se habilite
                            -- Aseguradora y Financiera
                            -- Habilitar correosemail_financiera, email_aseguradora
                            -- ============================================
                            -- OR
                            -- (canal_aseg.custrecord_ht_cd_envio_certificado = 'T' AND canal_aseg.custrecord_ht_cd_correo_certificados IS NOT NULL)
                            -- OR
                            -- (canal_fin.custrecord_ht_cd_envio_certificado = 'T' AND canal_fin.custrecord_ht_cd_correo_certificados IS NOT NULL)
                        )
                `;

                const osObtenidas = _toolkit.executeQuery(sql2 , idosUnicos);

                if ( osObtenidas ) {
                    const objetosFinales = filtro_ot.map(ot => {
                        const os = osObtenidas.find(o => o.idos === ot.idos);

                        if (!os) {
                            return false;
                        }

                        return {
                            tipo: "I", // valor por defecto

                            idbien: ot.idbien +'' || "",
                            orden_trabajo: ot.orden_trabajo || "",
                            familia: ot.familia || "",
                            accion: ot.accion || "",

                            subsidiaria: os.subsidiaria +'',
                            idOs: os.idos +'' || "",
                            orden: os.orden || "",
                            id_cliente: os.id_cliente || "",
                            clienteid: os.clienteid || "",
                            chasis: os.chasis || "",

                            idconcesionaria: os.idconcesionaria +'' || "",
                            concesionaria: os.concesionaria || "",
                            email_concesionaria: os.email_concesionaria || "",
                            nombre_concesionaria: os.nombre_concesionaria || "",

                            idfinanciera: os.idfinanciera +''|| "",
                            financiera: os.financiera || "",
                            email_financiera: "", //os.email_financiera || "",
                            nombre_financiera: os.nombre_financiera || "",

                            idaseguradora: os.idaseguradora +'' || "",
                            aseguradora: os.aseguradora || "",
                            email_aseguradora: "", //os.email_aseguradora || "",
                            nombre_aseguradora: os.nombre_aseguradora || "",

                            idvendedor: os.idvendedor +'' || "",
                            vendedor: os.vendedor || "",
                            email_vendedor: os.email_vendedor || "",
                            nombre_vendedor: os.nombre_vendedor || ""
                        };
                    }).filter(Boolean);

                    return objetosFinales;
                }
            }
            return false;
        } catch (error) {
            log.error("<p style='color:red;'> ERROR _getNotasSistemaOTCheaqueadas</p>", error)
        }
    }

    function _procesarOSAprobadas(ordenes, ejecutiva_ref_id) {
        try {

            let ejecutiva_referencia_envio = _toolkit.executeQuery('SELECT entityid, firstname, email FROM employee WHERE id = ?', [ejecutiva_ref_id]);


            let entorno = '';
            if (runtime.envType === runtime.EnvType.SANDBOX) {
                entorno = 'https://7451241-sb1.app.netsuite.com';
            } else if (runtime.envType === runtime.EnvType.PRODUCTION) {
                entorno = 'https://7451241.app.netsuite.com';
            }
            let url = `${entorno}/app/accounting/transactions/transaction.nl?id=`;

            if (ejecutiva_referencia_envio[0].email == 'sincorreo@carsegsa.com') {
                log.debug("No se puede enviar a sincorreo@carsegsa.com");
                return;
            }

            email.send({
                author: runtime.getCurrentUser().id,
                recipients: [ejecutiva_referencia_envio[0].email, 'grpcbo@carsegsa.com'],
                bcc: ['mramos@carsegsa.com'],
                subject: `Tu solicitud ha sido aprobada`,
                body: buildTable(url, ordenes, 'VENTA/CARTERA'),
            });

            return JSON.stringify({
                success: true,
                message: 'Correoe enviado'
            });

        } catch (error) {
            log.error("<p style='color:red;'> ERROR _procesarOSAprobadas</p>", error)
        }
    }

    function buildTable(url, rows, tipo) {
        if (!rows.length) return '';
        let tableRows = rows.map(item => `
            <tr>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.fecha}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.oficina}</td>
                <td style="padding: 10px; border: 1px solid #dddddd;"><a href="${url}${item.orden_servicio_id}" style="color: #000000; text-decoration: none; font-weight: bold;" target="_blank">${item.orden_servicio}</a></td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.ejecutiva_ref}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.cliente}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.facturar_a}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.bien}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.venta_aprobada ? item.usuario_aprueba_venta + ' ' + item.date_venta : '-'}</td>
                <td style="padding: 10px; border: 1px solid #dddddd; color: #000000;">${item.cartera_aprobada ? item.usuario_aprueba_cartera + ' ' + item.date_cartera : '-'}</td>
            </tr>

        `).join('');
        return `
            <table border="1" cellpadding="0" cellspacing="0" width="95%" style="margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border: 2px solid #ccc;">
                <!-- HEADER - LOGOS -->
                <tr>
                    <td style="padding: 20px 0 0 20px; background-color: #fff;">
                        <img src="https://www.hunter.com.ec/images/logo.png" alt="Logo Principal" style="display: inline-block; max-width: 100px; height: auto; margin-bottom: 10px;">

                        <img src="https://www.aafd.org/wp-content/uploads/2024/11/NetSuite-logo-half-light.jpg" alt="Logo Área Control" style="display: inline-block; max-width: 80px; height: auto;">
                    </td>
                </tr>
                <!-- TÍTULO -->
                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f8f8f8; border-bottom: 2px solid #DE022E; border-top: 2px solid #DE022E;">
                        <h1 style="margin: 0; color: #DE022E; font-size: 20px; font-weight: bold;">Ordenes de Servicio Aprobadas en ${tipo}</h1>
                    </td>
                </tr>

                <!-- CONTENIDO -->
                <tr style="border-bottom: 0px solid #fff">
                <td style="padding: 10px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-top: 5px; margin-bottom: 5px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">FECHA</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">OFICINA</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">ORDEN DE SERVICIO</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">EJECUTIVA REF.</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">CLIENTE</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">FACTURAR A</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">BIEN</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">APROB. VENTA</td>
                        <td style="padding: 10px; border: 1px solid #dddddd; color: #000000; text-decoration: none; font-weight: bold;">APROB. CARTERA</td>
                    </tr>
                    ${tableRows}
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 20px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                        <p style="margin: 0 0 10px 0;">Este es un mensaje automático. Por favor, no responda a este correo electrónico.</p>
                    </td>
                </tr>
            </table>
        `;
    }

    function buscarOS(internalid) {
        try {
            let filters = [
                ["customform", "anyof", "142"],
                "AND",
                ["subsidiary", "anyof", "2"],
                "AND",
                ["mainline", "is", "T"],
                "AND",
                ["internalid", "anyof", internalid]
            ];

            let salesorder = search.create({
                type: "transaction",
                filters,
                columns: [
                    search.createColumn({ name: "internalid", label: "id" }),
                    search.createColumn({ name: "trandate", label: "fecha" }),
                    search.createColumn({ name: "location", label: "oficina" }),
                    search.createColumn({ name: "tranid", label: "numero_documento" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacionventa", label: "apr_venta" }),
                    search.createColumn({ name: "custbody_ht_os_aprobacioncartera", label: "apr_cartera" }),
                    search.createColumn({ name: "entity", label: "nombre" }),
                    search.createColumn({ name: "custbody_ht_facturar_a", label: "HT Facturar a" }),
                    search.createColumn({
                        name: "altname",
                        join: "CUSTBODY_HT_SO_BIEN",
                        label: "Nombre"
                    }),
                    search.createColumn({ name: "salesrep", label: "representante_ventas" }),
                    search.createColumn({ name: "memomain", label: "nota" }),
                    search.createColumn({ name: "netamountnotax", label: "Importe (neto de impuestos)" }),
                    search.createColumn({ name: "amount", label: "total_orden" }),
                    search.createColumn({
                        name: "custentity_ec_document_type",
                        join: "customerMain",
                        label: "documento"
                    }),
                    search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "numero_documento_cliente"
                    }),
                    search.createColumn({ name: "terms", label: "nota" }),
                    search.createColumn({ name: "custbody_ht_os_ejecutivareferencia", label: "HT Ejecutiva de referencia" }),
                ]
            });

            let resultado = [];
            salesorder.run().each(function (result) {
                resultado.push({
                    id: result.getValue({ name: "internalid" }),
                    fecha: result.getValue({ name: "trandate" }),
                    oficina: result.getText({ name: "location" }),
                    orden_servicio: result.getValue({ name: "tranid" }),
                    ejecutiva_ref: result.getText({ name: "custbody_ht_os_ejecutivareferencia" }),
                    ejecutiva_ref_id: result.getValue({ name: "custbody_ht_os_ejecutivareferencia" }),
                    cliente: result.getText({ name: "entity" }),
                    facturar_a: result.getText({ name: "custbody_ht_facturar_a" }),
                    bien: result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" }),
                });

                return true;
            });


            return resultado;
        } catch (error) {
            log.error("<p style='color:red;'> ERROR buscarOS</p>", error)
        }
    }

    function _getNotificacionesOS(context) {
        try {

            let data = _getNotasSistemaOsAprobacion();
            if (data) {
                return JSON.stringify({
                    success: true,
                    message: 'api success',
                    data
                });
            } else {
                return JSON.stringify({
                    success: true,
                    message: 'No hay información en notas del sistema',
                });
            }
        } catch (error) {
            return JSON.stringify({
                success: false,
                message: error
            });
        }
    }

    function _getNotasSistemaOsAprobacion() {
        try {
            let fecha = _toolkit.getFecha().fecha2; //  "14/11/2025 16:40"
            let dateObj = new Date(_toolkit.getFecha().iso);
            dateObj.setMinutes(dateObj.getMinutes() - 5);

            function formatNS(date) {
                return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear() +
                    " " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
            }

            let fechaHace5Min = formatNS(dateObj);

            let systemnoteSearchObj = search.create({
                type: "systemnote",
                filters:
                    [
                        ["field", "anyof", "CUSTBODY_HT_OS_APROBACIONVENTA", "CUSTBODY_HT_OS_APROBACIONCARTERA"],
                        "AND",
                        ["date", "within", fechaHace5Min, fecha],
                        "AND",
                        ["recordtype", "anyof", "-30"],
                        "AND",
                        ["formulatext: {record}", "startswith", "Orden de Servicio"],
                    ],
                columns:
                    [
                        search.createColumn({ name: "recordid", label: "ID de registro" }),
                        search.createColumn({ name: "record", label: "Registro" }),
                        search.createColumn({ name: "name", label: "Definido por" }),
                        search.createColumn({ name: "date", label: "Fecha" }),
                        search.createColumn({ name: "context", label: "Contexto" }),
                        search.createColumn({ name: "type", label: "Tipo" }),
                        search.createColumn({ name: "field", label: "Campo" }),
                        search.createColumn({ name: "oldvalue", label: "Valor anterior" }),
                        search.createColumn({ name: "newvalue", label: "Nuevo valor" }),
                        search.createColumn({ name: "role", label: "Rol" }),
                        search.createColumn({ name: "type", label: "Tipo" }),
                        search.createColumn({ name: "recordtype", label: "Tipo de registro" }),
                        search.createColumn({
                            name: "subsidiary",
                            join: "user",
                            label: "Subsidiaria"
                        })
                    ]
            });

            const respuesta = {};
            let ordenes_servicio = []

            systemnoteSearchObj.run().each(function (result) {
                const usuario_aprueba_id = result.getValue({ name: "name" });
                const usuario_aprueba = result.getText({ name: "name" });
                const orde_servicio_id = result.getValue({ name: "recordid" });
                const date = result.getValue({ name: "date" });
                const campo = result.getText({ name: "field" });
                const registro = result.getValue({ name: "record" });
                const orde_servicio = registro.split("#")[1];

                ordenes_servicio.push(orde_servicio_id);

                if (!respuesta[orde_servicio_id]) {
                    respuesta[orde_servicio_id] = {
                        orde_servicio_id,
                        orde_servicio
                    };
                }

                if (campo.includes("Venta")) {
                    respuesta[orde_servicio_id].venta = {
                        usuario_aprueba_id,
                        usuario_aprueba,
                        date,
                        campo
                    };
                } else if (campo.includes("Cartera")) {
                    respuesta[orde_servicio_id].cartera = {
                        usuario_aprueba_id,
                        usuario_aprueba,
                        date,
                        campo
                    };
                }

                return true;
            });


            log.debug("respuesta", respuesta);

            const respuestaArray = Object.values(respuesta);

            if (ordenes_servicio.length == 0) {
                return [];
            }

            let resultado_os = buscarOS(ordenes_servicio);

            const registro_consolidado = respuestaArray.map(aprobacion => {
                const os = resultado_os.find(item => item.id === aprobacion.orde_servicio_id);

                const ordenConsolidada = {
                    orden_servicio_id: aprobacion.orde_servicio_id,
                    orden_servicio: aprobacion.orde_servicio,
                    fecha: os?.fecha,
                    oficina: os?.oficina,
                    ejecutiva_ref: os?.ejecutiva_ref,
                    ejecutiva_ref_id: os?.ejecutiva_ref_id,
                    cliente: os?.cliente,
                    facturar_a: os?.facturar_a,
                    bien: os?.bien
                };

                if (aprobacion.venta) {
                    ordenConsolidada.venta_aprobada = true;
                    ordenConsolidada.usuario_aprueba_venta_id = aprobacion.venta.usuario_aprueba_id;
                    ordenConsolidada.usuario_aprueba_venta = aprobacion.venta.usuario_aprueba;
                    ordenConsolidada.date_venta = aprobacion.venta.date;
                }

                if (aprobacion.cartera) {
                    ordenConsolidada.cartera_aprobada = true;
                    ordenConsolidada.usuario_aprueba_cartera_id = aprobacion.cartera.usuario_aprueba_id;
                    ordenConsolidada.usuario_aprueba_cartera = aprobacion.cartera.usuario_aprueba;
                    ordenConsolidada.date_cartera = aprobacion.cartera.date;
                }

                return ordenConsolidada;
            });

            const agrupado = {};

            registro_consolidado.forEach(item => {
                const key = item.ejecutiva_ref;

                if (!agrupado[key]) {
                    agrupado[key] = {
                        ejecutiva_ref: item.ejecutiva_ref,
                        ejecutiva_ref_id: item.ejecutiva_ref_id,
                        ordenes: []
                    };
                }

                agrupado[key].ordenes.push(item);
            });

            // Resultado final
            const resultado_final = Object.values(agrupado);

            log.debug(`${resultado_final.length} registros | TIEMPO`, `${fechaHace5Min} -→ ${fecha}`);
            return resultado_final;

        } catch (error) {
            log.error("<p style='color:red;'> ERROR _getNotasSistemaOsAprobacion</p>", error)
        }
    }


    // Caso Sim Movistar
    function _obtenerOTChequeadasConSimMovistar() {
        try {

            // =========================
            // 1️⃣ Calcular rango de fechas (últimos 5 minutos)
            // =========================
            var now = new Date();
            var fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));

            var fechaHasta = format.format({
                value: now,
                type: format.Type.DATETIME
            }).substring(0, 16);

            var fechaDesde = format.format({
                value: fiveMinutesAgo,
                type: format.Type.DATETIME
            }).substring(0, 16);

            // 🔥 Normalización CLAVE
            fechaHasta = normalizarHoraNS(fechaHasta);
            fechaDesde = normalizarHoraNS(fechaDesde);

            log.debug('Rango de ejecución', {
                desde: fechaDesde,
                typeof_desde: typeof fechaDesde,
                hasta: fechaHasta,
                typeof_hasta: typeof fechaHasta
            });


            // =========================
            // 2️⃣ Crear búsqueda
            // =========================
            var otSearch = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: [
                    ["custrecord_ht_ot_subsidiary", "anyof", "2", "@NONE@"],
                    "AND",
                    ["lastmodified", "within", fechaDesde, fechaHasta],
                    // ["lastmodified", "within", "19/12/2025 00:00", "19/12/2025 21:00"],
                    "AND",
                    ["custrecord_ht_ot_serieproductoasignacion", "noneof", "@NONE@"],
                    "AND",
                    ["custrecord_ht_ot_estado", "anyof", "2"], // Chequeada
                    "AND",
                    [
                        "custrecord_ht_ot_serieproductoasignacion.custrecord_ht_mc_operadora",
                        "anyof",
                        "5", "111", "114", "110", "112", "113" // Movistar
                    ]
                ],
                columns: [
                    search.createColumn({ name: "internalid" })
                ]
            });

            // =========================
            // 3️⃣ Validar cantidad de registros
            // =========================
            var pagedData = otSearch.runPaged({ pageSize: 1000 });
            var totalResultados = pagedData.count;

            log.debug('Total OT encontradas', totalResultados);

            if (totalResultados > 1000) {
                log.error('Proceso detenido', 'Se encontraron más de 1000 registros');
                // return []; // ⛔ NO continuar
                return JSON.stringify({
                    success: true,
                    message: 'Existe más de 1000 registros, el proceso no puede continuar.',
                    data: []
                });

            }

            // =========================
            // 4️⃣ Obtener internalId en array
            // =========================
            var internalIds = [];

            pagedData.pageRanges.forEach(function (pageRange) {
                var page = pagedData.fetch({ index: pageRange.index });

                page.data.forEach(function (result) {
                    internalIds.push(result.getValue({ name: 'internalid' }));
                });
            });

            // log.debug('Internal IDs obtenidos', internalIds.length);

            return JSON.stringify({
                success: true,
                message: 'api success',
                data: internalIds
            });


        } catch (error) {
            log.error("<p style='color:red;'> ERROR _obtenerOTChequeadasConSimMovistar</p>", error)
            return
        }
    }


    function normalizarHoraNS(fechaStr) {
        // Esperado: dd/MM/yyyy H:mm  ó dd/MM/yyyy HH:mm
        var partes = fechaStr.split(' ');
        var fecha = partes[0];
        var hora = partes[1];

        var hm = hora.split(':');
        var h = hm[0].padStart(2, '0');
        var m = hm[1];

        return fecha + ' ' + h + ':' + m;
    }

    function _procesarOtIndividualChequeadasConSimMovistar(inf) {
        try {

            log.debug('_procesarOtIndividualChequeadasConSimMovistar - inicio', inf);

            if (!inf?.ot_id) {
                log.error('ID OT inválido', inf);
                return;
            }

            // =========================
            // 1️⃣ Cargar OT
            // =========================
            var newRecord = record.load({
                type: 'customrecord_ht_record_ordentrabajo',
                id: inf.ot_id,
                isDynamic: false
            });

            // =========================
            // 2️⃣ Obtener item y parametrización
            // =========================
            let itemOT = newRecord.getValue("custrecord_ht_ot_item") || "";
            // log.debug("--+-itemOT--+-", itemOT);
            let parametrizacion_Item = obtenerParametrizacionItem(itemOT, ['ADP', 'FAM', 'TAG', 'PGR']);

            let ADP = parametrizacion_Item[0]?.Valor || "";
            let FAM = parametrizacion_Item[1]?.Valor || "";
            let TAG = parametrizacion_Item[2]?.Valor || "";
            let PGR = parametrizacion_Item[3]?.Valor || "";

            // log.debug("Parametrización inicial", { ADP, FAM, TAG, PGR });

            // =========================
            // 3️⃣ Si es PGR, usar item relacionado
            // =========================
            if (PGR === "S") {
                itemOT = newRecord.getValue("custrecord_ht_ot_itemrelacionado") || "";

                if (itemOT) {
                    parametrizacion_Item = obtenerParametrizacionItem(itemOT, ['ADP']);
                    ADP = parametrizacion_Item[0]?.Valor || "";
                }
            }

            // =========================
            // 4️⃣ Obtener datos OT
            // =========================
            let HT_ESTADO_ORDEN_TRABAJO = newRecord.getValue("custrecord_ht_ot_estado") || "";
            let OrdenServicio = newRecord.getValue("custrecord_ht_ot_orden_servicio") || "";

            let HT_DISPOSITIVO_ORDEN_TRABAJO = newRecord.getText(
                "custrecord_ht_ot_serieproductoasignacion"
            ) || "";


            let auxprueba = obtenerTagPorFamilia(FAM);
            if (auxprueba && auxprueba !== "NO DEFINIDA") {
                TAG = auxprueba;
            }

            // log.debug("OT evaluada", {
            //     idOt: inf?.ot_id,
            //     ADP,
            //     FAM,
            //     TAG,
            //     PGR,
            //     estado: HT_ESTADO_ORDEN_TRABAJO,
            //     dispositivo: HT_DISPOSITIVO_ORDEN_TRABAJO
            // });

            // =========================
            // 5️⃣ Validaciones de negocio
            // =========================
            if (
                (ADP === "001" || ADP === "002" || ADP === "003") &&
                FAM !== "" &&
                TAG === "MON" &&
                HT_ESTADO_ORDEN_TRABAJO === "2"
            ) {

                // Normalización ADP
                if (ADP === "003") {
                    ADP = "001";
                }

                let DataEnvio = {
                    opcion: "221",
                    idorden: OrdenServicio,
                    // idorden: 5253413,
                    dispositivo: HT_DISPOSITIVO_ORDEN_TRABAJO,
                    familia: FAM,
                    accion: ADP
                };

                log.debug("DataEnvio", DataEnvio);

                // =========================
                // 6️⃣ Envío API
                // =========================
                log.debug("Simulación envío API externa - OMITIDO", { DataEnvio, idOt: inf?.ot_id });
                let infDataExterna = enviarDatosAPIExterna(DataEnvio, inf?.ot_id);
                log.debug("Respuesta API Externa", infDataExterna);
            }

        } catch (error) {
            log.error(
                "<p style='color:red;'>ERROR _procesarOtIndividualChequeadasConSimMovistar</p>",
                {
                    idOt: inf,
                    error: error.message,
                    stack: error.stack
                }
            );
        }
    }

    // Aqui es el ajuste 
    // ============================
    // FUNCIÓN CORREGIDA - Desde OS
    // ============================
    function _procesarOsIndividualChequeadasConSimMovistar(inf) {
        try {
            if (!inf?.os_id) {
                log.error('ID OS inválido', inf);
                return;
            }

            log.debug('_procesarOsIndividualChequeadasConSimMovistar - inicio', inf.os_id);

            // =========================
            // 1️⃣ Cargar OS para obtener el bien
            // =========================
            var osRecord = record.load({
                type: 'salesorder',
                id: inf.os_id,
                isDynamic: false
            });

            let bien = osRecord.getValue("custbody_ht_so_bien") || "";
            if (!bien) {
                log.debug("OS sin bien asignado", inf.os_id);
                return;
            }

            // =========================
            // 2️⃣ Obtener items de la OS
            // =========================
            let itemsOS = _obtenerItemsDeOS(inf.os_id);
            if (!itemsOS || itemsOS.length === 0) {
                log.debug("OS sin items válidos", inf.os_id);
                return;
            }

            // =========================
            // 3️⃣ Clasificar items por familia con validación de negocio
            // =========================
            let familiasCalificadas = {}; // agrupamos por FAM

            for (let i = 0; i < itemsOS.length; i++) {
                let itemId = itemsOS[i].item;

                let parametrizacion = obtenerParametrizacionItem(itemId, ['ADP', 'FAM', 'TAG', 'PGR']);

                let ADP = parametrizacion[0]?.Valor || "";
                let FAM = parametrizacion[1]?.Valor || "";
                let TAG = parametrizacion[2]?.Valor || "";
                let PGR = parametrizacion[3]?.Valor || "";

                log.debug(`Item ${i + 1} - Parametrización inicial`, { itemId, ADP, FAM, TAG, PGR });

                // Si es PGR, buscar ADP del item relacionado (si existe en la línea)
                if (PGR === "S" && itemsOS[i].itemRelacionado) {
                    let paramRel = obtenerParametrizacionItem(itemsOS[i].itemRelacionado, ['ADP']);
                    ADP = paramRel[0]?.Valor || ADP;
                }

                // Obtener TAG real desde tabla de familias
                let auxTag = obtenerTagPorFamilia(FAM);
                if (auxTag && auxTag !== "NO DEFINIDA") {
                    TAG = auxTag;
                }

                // Validación de negocio: solo ADP 001/002/003, FAM no vacía, TAG=MON
                if (
                    (ADP === "001" || ADP === "002" || ADP === "003"|| ADP === "004") &&
                    FAM !== "" &&
                    TAG === "MON"
                ) {
                    // Normalización ADP
                    if (ADP === "003") {
                        ADP = "001";
                    }

                    // Agrupar por familia (solo necesitamos un envío por familia)
                    if (!familiasCalificadas[FAM]) {
                        familiasCalificadas[FAM] = {
                            ADP: ADP,
                            FAM: FAM,
                            TAG: TAG
                        };
                    }
                }
            }

            let familiaKeys = Object.keys(familiasCalificadas);
            if (familiaKeys.length === 0) {
                log.debug("Ningún item califica para envío API", inf.os_id);
                return;
            }

            // =========================
            // 4️⃣ Por cada familia: buscar cobertura y enviar API
            // =========================
            for (let f = 0; f < familiaKeys.length; f++) {
                let infoFam = familiasCalificadas[familiaKeys[f]];

                // Buscar ID interno de la familia
                let familiaData = _consultaFamiliaRestlet(infoFam.FAM);
                if (!familiaData) {
                    log.debug("Familia no encontrada en NetSuite", infoFam.FAM);
                    continue;
                }

                // Buscar cobertura por bien + familia
                let cobertura = _consultaCoberturaRestlet(bien, familiaData.id);
                if (!cobertura) {
                    log.debug("No se encontró cobertura", { bien: bien, familia: infoFam.FAM, familiaId: familiaData.id });
                    continue;
                }

                // El dispositivo viene de la cobertura (getText del producto serie asignado)
                let dispositivo = cobertura.nombreSerieProducto || cobertura.numerodispositivo || "";

                if (!dispositivo) {
                    log.debug("Cobertura sin dispositivo asignado", { coberturaId: cobertura.id, familia: infoFam.FAM });
                    continue;
                }

                let DataEnvio = {
                    opcion: "221",
                    idorden: inf.os_id,
                    dispositivo: dispositivo,
                    familia: infoFam.FAM,
                    accion: infoFam.ADP
                };

                log.debug("DataEnvio desde OS-----", DataEnvio);

                // =========================
                // 5️⃣ Envío API externa
                // =========================
                let infDataExterna = enviarDatosAPIExterna(DataEnvio, inf.os_id);
                log.debug("Respuesta API Externa desde OS", infDataExterna);
            }

        } catch (error) {
            log.error(
                "<p style='color:red;'>ERROR _procesarOsIndividualChequeadasConSimMovistar</p>",
                {
                    os_id: inf?.os_id,
                    error: error.message,
                    stack: error.stack
                }
            );
        }
    }


    // ============================
    // FUNCIONES AUXILIARES NUEVAS
    // ============================

    /**
     * Obtiene los items de una Orden de Servicio (Sales Order) - versión Restlet
     */
    function _obtenerItemsDeOS(idOS) {
        try {
            let results = [];

            let osSearch = search.create({
                type: "salesorder",
                filters: [
                    ["internalid", "is", idOS],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    "AND",
                    ["item.type", "noneof", "TaxItem"]
                ],
                columns: [
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "internalid", join: "item" }),
                ]
            });

            osSearch.run().each(function (result) {
                results.push({
                    item: result.getValue({ name: "item" }),
                });
                return true;
            });

            return results;
        } catch (error) {
            log.error("Error _obtenerItemsDeOS", { error: error.message, stack: error.stack });
            return [];
        }
    }

    /**
     * Busca el registro de familia por código (ej: "MO", "CS", etc.)
     */
    function _consultaFamiliaRestlet(codigoFamilia) {
        try {
            let familiaSearch = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [
                    ["custrecord_ht_pp_codigo", "is", codigoFamilia],
                    "AND",
                    ["custrecord33", "anyof", "2"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo" }),
                ]
            });

            let results = familiaSearch.run().getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                return {
                    id: results[0].getValue({ name: "internalid" }),
                    name: results[0].getValue({ name: "name" }),
                    codigo: results[0].getValue({ name: "custrecord_ht_pp_codigo" }),
                };
            }
            return null;
        } catch (error) {
            log.error("Error _consultaFamiliaRestlet", { error: error.message, stack: error.stack });
            return null;
        }
    }

    /**
     * Busca la cobertura activa por bien + familia
     * Retorna el primer registro con los datos del dispositivo
     */
    function _consultaCoberturaRestlet(idBien, idFamilia) {
        try {
            let coberturaSearch = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["custrecord_ht_co_bien", "anyof", idBien],
                    "AND",
                    ["custrecord_ht_co_familia_prod", "anyof", idFamilia],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_co_bien" }),
                    search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
                    search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                    search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                    search.createColumn({ name: "custrecord_ht_co_estado" }),
                    search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
                    search.createColumn({ name: "custrecord_ht_co_imei" }),
                    search.createColumn({ name: "custrecord_ht_co_operadora" }),
                ]
            });

            let results = coberturaSearch.run().getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                let r = results[0];
                return {
                    id: r.getValue({ name: "internalid" }),
                    name: r.getValue({ name: "name" }),
                    bien: r.getValue({ name: "custrecord_ht_co_bien" }),
                    // getText → nombre del registro de serie/producto (equivalente al getText de la OT)
                    nombreSerieProducto: r.getText({ name: "custrecord_ht_co_numeroserieproducto" }),
                    serieProductoId: r.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
                    numerodispositivo: r.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
                    coberturainicial: r.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                    coberturafinal: r.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                    estado_cobertura: r.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
                    estado_dispositivo: r.getValue({ name: "custrecord_ht_co_estado" }),
                    familiaId: r.getValue({ name: "custrecord_ht_co_familia_prod" }),
                    imei: r.getValue({ name: "custrecord_ht_co_imei" }),
                    operadora: r.getValue({ name: "custrecord_ht_co_operadora" }),
                };
            }
            return null;
        } catch (error) {
            log.error("Error _consultaCoberturaRestlet", { error: error.message, stack: error.stack });
            return null;
        }
    }

    // adicional para sim movistar
    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {
            let data = [];

            for (let i = 0; i < busquedaParametro.length; i++) {

                if (!items || !busquedaParametro[i]) {
                    log.debug("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
                    return [];
                }

                let filtro = [
                    ["custrecord_ht_pp_parametrizacionid", "is", items],
                    "AND",
                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
                ];

                let busqueda = search.create({
                    type: "customrecord_ht_pp_main_param_prod",
                    filters: filtro,
                    columns: [
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela" }),
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" }),
                        search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA" }),
                        search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR" }),
                    ],
                });

                // 👉 Trae solo el PRIMER resultado
                let results = busqueda.run().getRange({ start: 0, end: 1 });

                if (results.length > 0) {
                    let r = results[0];
                    let c = r.columns;

                    data.push({
                        Param: r.getValue(c[2]) || "",
                        ParamId: r.getValue(c[0]) || "",
                        Valor: r.getValue(c[3]) || "",
                        ValorText: r.getText(c[1]) || "",
                        ValorId: r.getValue(c[1]) || "",
                    });

                } else {
                    data.push({
                        Param: "",
                        ParamId: "",
                        Valor: "",
                        ValorText: "",
                        ValorId: "",
                    });
                }
            }

            return data;

        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return [];
        }
    };

    function registroOrigenProducto() {
        try {
            let searchObj = search.create({
                type: "customrecord_ht_general_tabla_codigos",
                filters: [
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "name", label: "ID" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_ht_subsidiaria_gtc", label: "HT Subsidiaria" }),
                    search.createColumn({ name: "custrecord_ht_codigo_tabla", label: "HT CODIGO TABLA" }),
                    search.createColumn({ name: "custrecord_ht_codigo_gtc", label: "HT CODIGO" }),
                    search.createColumn({ name: "custrecord_ht_codigo_nuevo", label: "HT CODIGO NUEVO" }),
                    search.createColumn({
                        name: "custrecord_ht_pp_codigo",
                        join: "CUSTRECORD_HT_CODIGO_GTC",
                        label: "Código"
                    }),
                    search.createColumn({
                        name: "custrecord33",
                        join: "CUSTRECORD_HT_CODIGO_GTC",
                        label: "Subsidiaria"
                    })
                ]
            });

            let searchResult = searchObj.run().getRange({ start: 0, end: 1000 });
            let data = [];

            if (searchResult && searchResult.length > 0) {

                searchResult.forEach(result => {
                    let codigoTabla = result.getValue({ name: "custrecord_ht_codigo_tabla" }) || "";
                    let codigo = result.getValue({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CODIGO_GTC" }) || "";
                    let descripcion = result.getValue({ name: "custrecord_ht_codigo_gtc" }) || "";
                    let codigoNuevo = result.getValue({ name: "custrecord_ht_codigo_nuevo" }) || "";

                    data.push({
                        CODIGO_TABLA: codigoTabla,
                        CODIGO: codigo,
                        DESCRIPCION: descripcion,
                        CODIGO_NUEVO: codigoNuevo
                    });
                });
            }

            return data;


        } catch (error) {
            log.error("Error en registroOrigenProducto", { error: error.message, stack: error.stack });
            return [];
        }
    };

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste, registroID) {
        try {

            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    }

    /**
 * Obtiene el TAG del item en base a la familia (FAM)
 */
    function obtenerTagPorFamilia(FAM) {

        if (!FAM) {
            return "NO DEFINIDA";
        }

        let origen = registroOrigenProducto() || [];
        let familia = String(FAM).trim();

        const encontrado = origen.find(function (entry) {
            return String(entry.CODIGO).trim() === familia;
        });

        if (!encontrado || !encontrado.CODIGO_NUEVO) {
            log.debug("Familia no encontrada en tabla", familia);
            return "NO DEFINIDA";
        }

        // Normalización de TAG
        if (["CAR", "MON", "SAT", "PER", "SER"].includes(encontrado.CODIGO_NUEVO)) {
            return "MON";
        }

        if (encontrado.CODIGO_NUEVO === "LOJ") {
            return "LOJ";
        }

        log.debug("Categoría no definida", {
            familia: familia,
            codigoNuevo: encontrado.CODIGO_NUEVO
        });

        return "NO DEFINIDA";
    }


    function enviarDatosAPIExterna(data, registroID) {
        try {
            if (data == []) {
                return false;
            }

            const token = _funcion.loginGetToken();
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            function toQueryString(obj) {
                return Object.keys(obj)
                    .map(function (k) {
                        return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
                    })
                    .join("&");
            }

            const queryString = toQueryString(data);

            const options = {
                method: "GET",
                url: _const.URLS.HUNTER_API_NETSUITE + "/OrdenServicio/DispositivoKite?" + queryString,
                headers: headers
            };

            log.debug("Opciones de la API externa--", options);
            // return
            const response = https.get(options);

            log.debug("Respuesta de la API externa", response);

            let temporal = false
            let temporal2 = false

            if (response && response.body != "") {
                temporal = JSON.parse(response.code);
                temporal2 = JSON.parse(response.body);
            }

            if (temporal && temporal === 200) {

                if (temporal2?.mensaje == "Grabado con exito") {
                    // log.debug("Grabado con exito", temporal2?.mensaje);
                    GenerarLogCambioEstado(data, response, 'T', 'Dispositivo_Kite', registroID);
                    return true;
                }

                return true;

            } else {

                GenerarLogCambioEstado(data, response, 'F', 'Dispositivo_Kite', registroID);
                log.debug("Error en la- respuesta de la API externa", response);
                return false;
            }
        } catch (error) {
            log.debug("error", error)
            return false;
        }
    }

    return { post: _post }
});