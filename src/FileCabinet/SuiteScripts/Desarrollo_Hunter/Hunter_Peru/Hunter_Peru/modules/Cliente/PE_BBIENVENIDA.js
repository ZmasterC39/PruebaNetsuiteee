/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/query', 'N/search', 'N/log', 'N/error', 'N/format', 'N/record', 'N/task', 'N/runtime'], function (query, search, log, error, format, record, task, runtime) {

    /**
     * Formatea una fecha a string YYYY-MM-DD para SQL
     * @param {String} dateValue - Fecha a formatear
     * @returns {String} - Fecha formateada
     */
    function normalizeDate(inputDate) {
        var date = new Date(inputDate);
        if (isNaN(date)) {
            throw new Error('Fecha inválida: ' + inputDate);
        }
        var year = date.getFullYear();
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }
    /**
     * Obtiene busqueda de CUSTOMRECORD_HT_RECORD_ORDENTRABAJO o SALESORDER
     * @param {String} startDate - Fecha inicio
     * @param {String} endDate - Fecha fin
     * 
     * var sql = `
        SELECT DISTINCT
            c.id AS "CODIGO_INT_CLIENTE",
            c.custentity_pe_document_number AS "CODIGO_CLIENTE",
            CASE
                WHEN c.isperson = 'T' THEN c.altname 
                ELSE c.companyname 
            END AS "NOMBRE_CLIENTE",
            so.id AS "CODIGO_INT_OS",
            ot.custrecord_ht_ot_orden_serivicio_txt AS "OS",
            b.id AS "CODIGO_INT_VEHICULO",
            b.id AS "CODIGO_VEHICULO",
            i.itemid AS "CODIGO_PRODUCTO",
            i.displayname AS "NOMBRE_PRODUCTO",
            emp.firstname AS "EJECUTIVO_INGRESO",
            aseg.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_ASEGURADORA",
            aseg.custrecord_ht_cd_nombre AS "NOMBRE_ASEGURADORA",
            fin.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_FINANCIERA",
            fin.custrecord_ht_cd_nombre AS "NOMBRE_FINANCIERA"
        FROM 
            transaction so
            JOIN Customer c ON so.entity = c.id
            LEFT JOIN transactionline tl ON so.id = tl.transaction AND tl.mainline = 'T'
            LEFT JOIN CUSTOMRECORD_HT_RECORD_ORDENTRABAJO ot ON so.id = ot.custrecord_ht_ot_orden_servicio
            LEFT JOIN item i ON ot.custrecord_ht_ot_itemrelacionado = i.id
            LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON ot.custrecord_ht_ot_vehiculo = b.id
            LEFT JOIN employee emp ON so.custbody_ht_os_ejecutivareferencia = emp.id
            LEFT JOIN customrecord_ht_record_canaldistribucion aseg ON b.custrecord_ht_bien_companiaseguros = aseg.id
            LEFT JOIN customrecord_ht_record_canaldistribucion fin ON b.custrecord_ht_bien_financiadovehiculo = fin.id
        WHERE
            so.type = 'SalesOrd'
            AND so.recordtype = 'salesorder'
            AND BUILTIN.DF(so.status) != 'Cancelled'
            AND so.estgrossprofit > 0
            AND ot.custrecord_ht_ot_subsidiary = 3
            --AND ot.custrecord_ht_ot_estado = 2
            AND so.entity != 38014
            AND so.trandate BETWEEN DATE '${sqlStartDate}' AND DATE '${sqlEndDate}'
            AND i.displayname LIKE '%DISPO%'
        GROUP BY
            c.id,
            c.custentity_pe_document_number,
            CASE WHEN c.isperson = 'T' THEN c.altname ELSE c.companyname END,
            so.id,
            ot.custrecord_ht_ot_orden_serivicio_txt,
            b.id,
            i.itemid,
            i.displayname,
            emp.firstname,
            aseg.custrecord_ht_cd_ruccanaldistribucion,
            aseg.custrecord_ht_cd_nombre,
            fin.custrecord_ht_cd_ruccanaldistribucion,
            fin.custrecord_ht_cd_nombre
        `;
     */

    function getCustomOrdenS(startDate, endDate) {
        var sqlStartDate = normalizeDate(startDate);
        var sqlEndDate = normalizeDate(endDate);

        log.debug('Fechas SQL normalizadas', { startDate: sqlStartDate, endDate: sqlEndDate });

        var sql = `
            SELECT DISTINCT
            c.id AS "CODIGO_INT_CLIENTE",
            c.custentity_pe_document_number AS "CODIGO_CLIENTE",
             CASE 
                            WHEN i.itemid IN ('PE-7147','PE-7698') 
                                THEN 'SCOTIABANK'

                            WHEN i.itemid IN (
                                'PE-7358',
                                'PE-7359',
                                'PE-7360',
                                'PE-7361'
                            ) 
                                THEN 'GILDEMEISTER'

                            WHEN i.itemid IN (
                                'PE-10276',
                                'PE-10278',
                                'PE-10280',
                                'PE-10302',
                                'PE-10303',
                                'PE-10402',
                                'PE-10403',
                                'PE-10404'
                            ) 
                                THEN 'SANTANDER'

                            WHEN i.itemid IN ('PE-7860') 
                                THEN 'MOVILIZA'

                            WHEN so.custbody_fac_maf = 'T'
                                 AND so.custbody_ht_os_bancofinanciera <> 19749 
                                THEN 'MAF'

                            ELSE 
                                CASE
                                    WHEN c.isperson = 'F' THEN
                                        CASE
                                            WHEN tl.department IN (
                                                '283',
                                                '299',
                                                '315',
                                                '331'
                                            ) 
                                                THEN 'CANAL TRADICIONAL'

                                            WHEN tl.department IN (
                                                '282',
                                                '330',
                                                '298',
                                                '314'
                                            ) 
                                                THEN 'CORPORATIVO'

                                            ELSE 'EMPRESA'
                                        END
                                    ELSE 'NATURAL'
                                END
                        END AS "TIPO",
            CASE
                WHEN c.isperson = 'T' THEN c.altname 
                ELSE c.companyname 
            END AS "NOMBRE_CLIENTE",
            so.id AS "custrecord_pe_gb_os",
            ot.custrecord_ht_ot_orden_serivicio_txt AS "OS",
            b.id AS "CODIGO_INT_VEHICULO",
            b.id AS "CODIGO_VEHICULO",
            i.itemid AS "CODIGO_PRODUCTO",
            i.displayname AS "NOMBRE_PRODUCTO",
            emp.firstname AS "EJECUTIVO_INGRESO",
            aseg.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_ASEGURADORA",
            aseg.custrecord_ht_cd_nombre AS "NOMBRE_ASEGURADORA",
            fin.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_FINANCIERA",
            fin.custrecord_ht_cd_nombre AS "NOMBRE_FINANCIERA"
        FROM 
            transaction so
            JOIN Customer c ON so.entity = c.id
            LEFT JOIN transactionline tl ON so.id = tl.transaction AND tl.mainline = 'T'
            LEFT JOIN CUSTOMRECORD_HT_RECORD_ORDENTRABAJO ot ON so.id = ot.custrecord_ht_ot_orden_servicio
            LEFT JOIN item i ON ot.custrecord_ht_ot_itemrelacionado = i.id
            LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON ot.custrecord_ht_ot_vehiculo = b.id
            LEFT JOIN employee emp ON so.custbody_ht_os_ejecutivareferencia = emp.id
            LEFT JOIN customrecord_ht_record_canaldistribucion aseg ON b.custrecord_ht_bien_companiaseguros = aseg.id
            LEFT JOIN customrecord_ht_record_canaldistribucion fin ON b.custrecord_ht_bien_financiadovehiculo = fin.id
	    LEFT JOIN customrecord_pe_ht_gestion_bienvenida gb ON so.id = gb.custrecord_pe_gb_os
        WHERE
            so.type = 'SalesOrd'
            AND so.recordtype = 'salesorder'
            AND BUILTIN.DF(so.status) != 'Cancelled'
            AND so.estgrossprofit > 0
            AND ot.custrecord_ht_ot_subsidiary = 3
            AND ot.custrecord_ht_ot_estado = 2
            AND so.entity != 38014
	        AND gb.custrecord_pe_gb_cant_intentos IS NULL
            AND ot.custrecord_ht_ot_fechatrabajoasignacion BETWEEN DATE '${sqlStartDate}' AND DATE '${sqlEndDate}'
            AND i.displayname LIKE '%DISPO%'
    AND NOT EXISTS (
        SELECT 1
        FROM customrecord_ht_pe_asignacion_bienvenida ab
        WHERE ab.custrecord_pe_ht_idos = so.id
    )
        GROUP BY
            c.id,
            c.custentity_pe_document_number,
            CASE 
                            WHEN i.itemid IN ('PE-7147','PE-7698') 
                                THEN 'SCOTIABANK'

                            WHEN i.itemid IN (
                                'PE-7358',
                                'PE-7359',
                                'PE-7360',
                                'PE-7361'
                            ) 
                                THEN 'GILDEMEISTER'

                            WHEN i.itemid IN (
                                'PE-10276',
                                'PE-10278',
                                'PE-10280',
                                'PE-10302',
                                'PE-10303',
                                'PE-10402',
                                'PE-10403',
                                'PE-10404'
                            ) 
                                THEN 'SANTANDER'

                            WHEN i.itemid IN ('PE-7860') 
                                THEN 'MOVILIZA'

                            WHEN so.custbody_fac_maf = 'T'
                                 AND so.custbody_ht_os_bancofinanciera <> 19749 
                                THEN 'MAF'

                            ELSE 
                                CASE
                                    WHEN c.isperson = 'F' THEN
                                        CASE
                                            WHEN tl.department IN (
                                                '283',
                                                '299',
                                                '315',
                                                '331'
                                            ) 
                                                THEN 'CANAL TRADICIONAL'

                                            WHEN tl.department IN (
                                                '282',
                                                '330',
                                                '298',
                                                '314'
                                            ) 
                                                THEN 'CORPORATIVO'

                                            ELSE 'EMPRESA'
                                        END
                                    ELSE 'NATURAL'
                                END
                        END,
            CASE WHEN c.isperson = 'T' THEN c.altname ELSE c.companyname END,
            so.id,
            ot.custrecord_ht_ot_orden_serivicio_txt,
            b.id,
            i.itemid,
            i.displayname,
            emp.firstname,
            aseg.custrecord_ht_cd_ruccanaldistribucion,
            aseg.custrecord_ht_cd_nombre,
            fin.custrecord_ht_cd_ruccanaldistribucion,
            fin.custrecord_ht_cd_nombre
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();

        return results;
    }

    function getCustomOrdenT(startDate, endDate) {
        var sqlStartDate = normalizeDate(startDate);
        var sqlEndDate = normalizeDate(endDate);

        log.debug('Fechas SQL normalizadas', { startDate: sqlStartDate, endDate: sqlEndDate });

        var sql = `
            SELECT
                c.custentity_pe_document_number AS "CODIGO_CLIENTE",
                CASE 
                    WHEN c.isperson = 'T' THEN c.altname 
                    ELSE c.companyname 
                END AS "NOMBRE_CLIENTE",
                ot.custrecord_ht_ot_orden_serivicio_txt AS "OS",
                ot.custrecord_ht_ot_vehiculo AS "CODIGO_VEHICULO",
                i.itemid AS "CODIGO_PRODUCTO",
                i.displayname AS "NOMBRE_PRODUCTO",
                emp.firstname AS "EJECUTIVO_INGRESO",
                aseg.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_ASEGURADORA",
                aseg.custrecord_ht_cd_nombre AS "NOMBRE_ASEGURADORA",
                fin.custrecord_ht_cd_ruccanaldistribucion AS "CODIGO_FINANCIERA",
                fin.custrecord_ht_cd_nombre AS "NOMBRE_FINANCIERA"
            FROM 
                CUSTOMRECORD_HT_RECORD_ORDENTRABAJO ot
                JOIN Customer c ON ot.custrecord_ht_ot_cliente_id = c.id
                JOIN item i ON ot.custrecord_ht_ot_itemrelacionado = i.id
                LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON ot.custrecord_ht_ot_vehiculo = b.id
                LEFT JOIN (
                    SELECT 
                        so.id,
                        so.custbody_ht_os_ejecutivareferencia
                    FROM transaction so
                    WHERE 
                        so.type = 'SalesOrd'
                        AND so.recordtype = 'salesorder'
                        AND BUILTIN.DF(so.status) != 'Cancelled'
                        AND so.estgrossprofit > 0
                        AND so.entity != 38014
                ) so ON ot.custrecord_ht_ot_orden_servicio = so.id
                LEFT JOIN employee emp ON so.custbody_ht_os_ejecutivareferencia = emp.id
                LEFT JOIN customrecord_ht_record_canaldistribucion aseg ON b.custrecord_ht_bien_companiaseguros = aseg.id
                LEFT JOIN customrecord_ht_record_canaldistribucion fin ON b.custrecord_ht_bien_financiadovehiculo = fin.id
            WHERE
                ot.created BETWEEN DATE '${sqlStartDate}' AND DATE '${sqlEndDate}'
                AND ot.custrecord_ht_ot_subsidiary = 3
                AND ot.custrecord_ht_ot_estado = 2
                AND i.displayname LIKE '%DISPO%'
            --FETCH FIRST 2 ROWS ONLY
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();

        return results;
    }

    /**
    * Función para procesar la carga de registros de Gestión Bienvenida
    * Versión simplificada: siempre recibe un array de registros (records)
    * @param {Object} requestParams - Parámetros de la solicitud
    * @returns {Object} Resultado de la operación
    */
    function cargaGestionBienvenida(requestParams) {
        try {
            log.debug({
                title: 'Request recibido en cargaGestionBienvenida',
                details: JSON.stringify(requestParams)
            });

            // Variables para almacenar registros y destinatarios
            var records = [];
            var emailRecipients = [];

            // Siempre es carga masiva para el MapReduce
            var isMassiveLoad = true;

            // VERIFICAR FORMATO Y EXTRAER REGISTROS
            if (requestParams.records && Array.isArray(requestParams.records)) {
                // Formato 1: records en el objeto principal
                records = requestParams.records;

                // Verificar destinatarios en el objeto principal
                if (requestParams.emailRecipients && Array.isArray(requestParams.emailRecipients)) {
                    emailRecipients = requestParams.emailRecipients;
                }

                log.debug('Formato detectado', 'Array records en objeto principal: ' + records.length + ' registros');
            }
            else if (requestParams.data && requestParams.data.records && Array.isArray(requestParams.data.records)) {
                // Formato 2: records dentro de un objeto data
                records = requestParams.data.records;

                // Verificar destinatarios en el objeto data
                if (requestParams.data.emailRecipients && Array.isArray(requestParams.data.emailRecipients)) {
                    emailRecipients = requestParams.data.emailRecipients;
                }

                log.debug('Formato detectado', 'Array records en objeto data: ' + records.length + ' registros');
            }
            else {
                // Si no hay array records en ninguna parte, convertir todo el objeto en un único registro
                var singleRecord = {};

                if (requestParams.data) {
                    // Tomar datos del objeto data
                    for (var key in requestParams.data) {
                        if (key !== 'emailRecipients') {
                            singleRecord[key] = requestParams.data[key];
                        }
                    }

                    // Verificar destinatarios
                    if (requestParams.data.emailRecipients && Array.isArray(requestParams.data.emailRecipients)) {
                        emailRecipients = requestParams.data.emailRecipients;
                    }
                } else {
                    // Tomar datos del objeto principal
                    for (var key in requestParams) {
                        if (key !== 'action' && key !== 'emailRecipients') {
                            singleRecord[key] = requestParams[key];
                        }
                    }

                    // Verificar destinatarios
                    if (requestParams.emailRecipients && Array.isArray(requestParams.emailRecipients)) {
                        emailRecipients = requestParams.emailRecipients;
                    }
                }

                // Convertir el registro único en un array
                records = [singleRecord];
                log.debug('Formato detectado', 'Objeto convertido a array con 1 registro');
            }

            // Si no se especificaron destinatarios, usar valor por defecto
            if (emailRecipients.length === 0) {
                emailRecipients = ["grupodesarrollo@hunter.com.pe"];
            }

            // Validar que haya al menos un registro para procesar
            if (records.length === 0) {
                throw new Error('No se encontraron registros para procesar');
            }

            // NO REALIZAR NINGUNA VALIDACIÓN DE CAMPOS OBLIGATORIOS
            // Dejar que el MapReduce maneje cualquier error en los registros

            // Preparar datos para el Map/Reduce
            var inputData = {
                records: records,
                emailRecipients: emailRecipients,
                isMassiveLoad: isMassiveLoad,  // Siempre true
                submittedBy: runtime.getCurrentUser().id,
                timestamp: new Date().getTime()
            };

            log.debug({
                title: 'Datos a enviar al Map/Reduce',
                details: JSON.stringify(inputData)
            });

            // Crear y enviar la tarea Map/Reduce
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_pe_proc_gest_bienv_restlet',
                deploymentId: 'customdeploy_pe_proc_gest_bienv_restlet',
                params: {
                    custscript_pe_input_data: JSON.stringify(inputData)
                }
            });

            var mrTaskId = mrTask.submit();

            // Retornar respuesta de éxito con información adicional
            return {
                success: true,
                message: 'Solicitud recibida y programada para procesamiento',
                taskId: mrTaskId,
                recordCount: records.length,
                processingType: 'Procesamiento masivo'
            };

        } catch (e) {
            log.error({
                title: 'Error al programar procesamiento',
                details: e.message + '\n' + e.stack
            });

            return {
                success: false,
                message: 'Error al programar procesamiento: ' + e.message,
                code: e.name
            };
        }
    }

    function listaBaseRepartida(startDate, endDate, ejecutiva) {
        var sqlStartDate = normalizeDate(startDate);
        var sqlEndDate = normalizeDate(endDate);
        log.debug('Fechas SQL normalizadas listaBaseRepartida', { startDate: sqlStartDate, endDate: sqlEndDate });

        var sql = `
            WITH UltimosSeguimientos AS (
                SELECT 
                    custrecord_ht_sc_cliente AS cliente_id,
                    custrecord_ht_sc_vehiculo AS bien_id,
                    custrecord_ht_sc_empleado AS empleado_id,
                    MAX(id) AS ultimo_seguimiento_id
                FROM 
                    customrecord_ht_record_seguicliente
                GROUP BY 
                    custrecord_ht_sc_cliente,
                    custrecord_ht_sc_vehiculo,
                    custrecord_ht_sc_empleado
            ),
            DetallesSeguimientos AS (
                SELECT 
                    us.cliente_id,
                    us.bien_id,
                    us.empleado_id,
                    sc.name AS id_externo_seguimiento,
                    sc.id AS id_seguimiento,
                    sc.custrecord_ht_sc_resultadogestion AS id_resultado_gestion,
                    sc.custrecord_ht_sc_cmotivo AS id_motivo,
                    rg.custrecord_ht_rg_descripcion AS resultado_gestion,
                    mt.custrecord_ht_mt_descripcion AS motivo,
		            sc.created as fecha_seguimiento,
                    sc.custrecord_ht_sc_seguimiento AS seguimiento,
                    mc.name AS forma_contacto
                FROM 
                    UltimosSeguimientos us
                    JOIN customrecord_ht_record_seguicliente sc 
                        ON us.ultimo_seguimiento_id = sc.id
                    LEFT JOIN customrecord_ht_resultadogestion rg 
                        ON sc.custrecord_ht_sc_resultadogestion = rg.id
                    LEFT JOIN customrecord_ht_sc_motivo mt 
                        ON sc.custrecord_ht_sc_cmotivo = mt.id 
                        AND mt.custrecord_ht_mt_codigo_resulgesiton = sc.custrecord_ht_sc_resultadogestion
                    LEFT JOIN customrecord_ht_sc_modocontacto mc 
                        ON sc.custrecord_ht_sc_modocontacto = mc.id
            )
            SELECT
                DISTINCT
                gb.id AS "ID_GESTION_BIENVENIDA",
                ot.custrecord_ht_ot_orden_serivicio_txt AS "ORDEN_SERVICIO",
		        ot.custrecord_ht_ot_fechatrabajoasignacion as "FECHA_INSTALACION",
                case when so.custbody_fac_maf = 'T' then 'MAF' else
                    case when c.isperson = 'F' 
                        then
                            case 
                            when tl.department in ('283','299','315','331') then 'CANAL TRADICIONAL'
                            when tl.department in ('282','330','298','314') then 'CORPORATIVO'
                        else 'EMPRESA' end
                    else 'NATURAL' end
                end TIPO,
                b.id AS "ID_VEHICULO",
                b.custrecord_ht_bien_placa AS "PLACA",
                c.custentity_pe_document_number AS "CODIGO_CLIENTE",
                c.custentity_pe_document_number || '-' || 
                CASE WHEN c.isperson = 'T' THEN c.altname ELSE c.companyname END AS "CLIENTE",
                i.itemid AS "ITEM",
                i.itemid || '-' || i.displayname AS "PRODUCTO",
                CASE
                    WHEN so.employee IS NULL THEN 'VARIOS'
                    ELSE emp_sales.firstname || ' ' || emp_sales.lastname
                END AS "EJECUTIVO_SERVICIO",
                emp_ref.firstname || ' ' || emp_ref.lastname AS "EJECUTIVO_REFERENCIA",
                emp_creator.firstname || ' ' || emp_creator.lastname AS "CREA_ORDEN",
                c.phone AS "TELEFONO",
                c.email AS "CORREO",
                cons.custrecord_ht_cd_ruccanaldistribucion || '-' || cons.custrecord_ht_cd_nombre AS "CONCESIONARIO",
                fin.custrecord_ht_cd_ruccanaldistribucion || '-' || fin.custrecord_ht_cd_nombre AS "FINANCIERA",
                ds.id_externo_seguimiento AS "ID_EXTERNO_SEGUIMIENTO",
                ds.id_seguimiento AS "ID_SEGUIMIENTO",
                ds.id_resultado_gestion AS "ID_RESULTADO_GESTION",
                ds.id_motivo AS "ID_MOTIVO",
                ds.resultado_gestion AS "RESULTADO_GESTION",
                ds.motivo AS "MOTIVO",
		        ds.fecha_seguimiento as "FECHA_SEGUIMIENTO",
                ds.seguimiento AS "SEGUIMIENTO",
                ds.forma_contacto AS "FORMA_CONTACTO",
                so.id AS "CODIGO_INT_OS",
                gb.custrecord_pe_gb_cant_intentos AS "CANTIDAD_INTENTOS"
            FROM
                customrecord_pe_ht_gestion_bienvenida gb
                LEFT JOIN transaction so ON gb.custrecord_pe_gb_os = so.id
                LEFT JOIN transactionline tl ON so.id = tl.transaction AND tl.mainline = 'T'
                LEFT JOIN department dep ON tl.department = dep.id
                LEFT JOIN classification cls ON tl.class = cls.id
                LEFT JOIN location loc ON tl.location = loc.id
                LEFT JOIN Customer c ON gb.custrecord_pe_gb_cliente = c.id
                LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON gb.custrecord_pe_gb_bien = b.id
                LEFT JOIN CUSTOMRECORD_HT_RECORD_ORDENTRABAJO ot ON so.id = ot.custrecord_ht_ot_orden_servicio
                LEFT JOIN item i ON ot.custrecord_ht_ot_itemrelacionado = i.id
                LEFT JOIN employee emp_ref ON so.custbody_ht_os_ejecutivareferencia = emp_ref.id
                LEFT JOIN employee emp_sales ON so.employee = emp_sales.id
                LEFT JOIN employee emp_creator ON so.createdby = emp_creator.id
                LEFT JOIN employee emp_asign ON gb.custrecord_pe_gb_eje_asignado = emp_asign.id
                LEFT JOIN customrecord_ht_record_canaldistribucion cons ON b.custrecord_ht_bien_consesionarios = cons.id
                LEFT JOIN customrecord_ht_record_canaldistribucion fin ON b.custrecord_ht_bien_financiadovehiculo = fin.id
                LEFT JOIN DetallesSeguimientos ds ON c.id = ds.cliente_id AND b.id = ds.bien_id AND gb.custrecord_pe_gb_eje_asignado = ds.empleado_id
            WHERE
                so.type = 'SalesOrd'
                AND so.recordtype = 'salesorder'
                AND BUILTIN.DF(so.status) != 'Cancelled'
                AND so.estgrossprofit > 0
                AND i.displayname LIKE '%DISPO%'
                AND ot.custrecord_ht_ot_subsidiary = 3
                AND TRUNC(gb.created) BETWEEN TO_DATE('${sqlStartDate}', 'YYYY-MM-DD') AND TO_DATE('${sqlEndDate}', 'YYYY-MM-DD')
                --AND gb.created BETWEEN TO_DATE('${sqlStartDate}', 'YYYY-MM-DD') AND TO_DATE('${sqlEndDate}', 'YYYY-MM-DD')
                --AND gb.custrecord_pe_gb_eje_asignado = ''
                AND emp_asign.custentity_pe_document_number = '${ejecutiva}'
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();
        return results;
    }

    function listaBaseRepartidaByDato(cliente, os, idvehiculo, placa) {
        const clienter = cliente || '';
        const osr = os || '';
        const idvehiculor = idvehiculo || '';
        const placar = placa || '';

        const placaFormateada = placar.toUpperCase();

        if (placaFormateada.includes("S/P") ||
            placaFormateada.includes("N/P") ||
            placaFormateada.includes("SP")) {
            throw new Error('Sin placa');
        }

        log.debug({
            title: 'Campos',
            details: 'Cliente: ' + cliente + ', OS: ' + os + ', ID Vehículo: ' + idvehiculo + ', Placa: ' + placa
        });

        var sqlQuery = `
        WITH UltimosSeguimientos AS (
            SELECT 
                custrecord_ht_sc_cliente AS cliente_id,
                custrecord_ht_sc_vehiculo AS bien_id,
                custrecord_ht_sc_empleado AS empleado_id,
                MAX(id) AS ultimo_seguimiento_id
            FROM 
                customrecord_ht_record_seguicliente
            GROUP BY 
                custrecord_ht_sc_cliente,
                custrecord_ht_sc_vehiculo,
                custrecord_ht_sc_empleado
        ),
        DetallesSeguimientos AS (
            SELECT 
                us.cliente_id,
                us.bien_id,
                us.empleado_id,
                sc.name AS id_externo_seguimiento,
                sc.id AS id_seguimiento,
                sc.custrecord_ht_sc_resultadogestion AS id_resultado_gestion,
                sc.custrecord_ht_sc_cmotivo AS id_motivo,
                rg.custrecord_ht_rg_descripcion AS resultado_gestion,
                mt.custrecord_ht_mt_descripcion AS motivo,
                sc.created as fecha_seguimiento,
                sc.custrecord_ht_sc_seguimiento AS seguimiento,
                mc.name AS forma_contacto
            FROM 
                UltimosSeguimientos us
                JOIN customrecord_ht_record_seguicliente sc 
                    ON us.ultimo_seguimiento_id = sc.id
                LEFT JOIN customrecord_ht_resultadogestion rg 
                    ON sc.custrecord_ht_sc_resultadogestion = rg.id
                LEFT JOIN customrecord_ht_sc_motivo mt 
                    ON sc.custrecord_ht_sc_cmotivo = mt.id 
                    AND mt.custrecord_ht_mt_codigo_resulgesiton = sc.custrecord_ht_sc_resultadogestion
                LEFT JOIN customrecord_ht_sc_modocontacto mc 
                    ON sc.custrecord_ht_sc_modocontacto = mc.id
        )
        SELECT
            DISTINCT
            gb.id AS "ID_GESTION_BIENVENIDA",
            ot.custrecord_ht_ot_orden_serivicio_txt AS "ORDEN_SERVICIO",
            ot.custrecord_ht_ot_fechatrabajoasignacion as "FECHA_INSTALACION",
                case when so.custbody_fac_maf = 'T' then 'MAF' else
                    case when c.isperson = 'F' 
                        then
                            case 
                            when tl.department in ('283','299','315','331') then 'CANAL TRADICIONAL'
                            when tl.department in ('282','330','298','314') then 'CORPORATIVO'
                        else 'EMPRESA' end
                    else 'NATURAL' end
                end TIPO,
            b.id AS "ID_VEHICULO",
            b.custrecord_ht_bien_placa AS "PLACA",
            c.custentity_pe_document_number AS "CODIGO_CLIENTE",
            c.custentity_pe_document_number || '-' || 
            CASE WHEN c.isperson = 'T' THEN c.altname ELSE c.companyname END AS "CLIENTE",
            i.itemid AS "ITEM",
            i.itemid || '-' || i.displayname AS "PRODUCTO",
            emp_asign.firstname || ' ' || emp_asign.lastname AS "EJE_ASIGNADA",
            CASE 
                WHEN so.employee IS NULL THEN 'VARIOS'
                ELSE emp_sales.firstname || ' ' || emp_sales.lastname
            END AS "EJECUTIVO_SERVICIO",
            emp_ref.firstname || ' ' || emp_ref.lastname AS "EJECUTIVO_REFERENCIA",
            emp_creator.firstname || ' ' || emp_creator.lastname AS "CREA_ORDEN",
            c.phone AS "TELEFONO",
            c.email AS "CORREO",
            cons.custrecord_ht_cd_ruccanaldistribucion || '-' || cons.custrecord_ht_cd_nombre AS "CONCESIONARIO",
            ds.id_externo_seguimiento AS "ID_EXTERNO_SEGUIMIENTO",
            ds.id_seguimiento AS "ID_SEGUIMIENTO",
            ds.id_resultado_gestion AS "ID_RESULTADO_GESTION",
            ds.id_motivo AS "ID_MOTIVO",
            ds.resultado_gestion AS "RESULTADO_GESTION",
            ds.motivo AS "MOTIVO",
            ds.fecha_seguimiento AS "FECHA_SEGUIMIENTO",
            ds.seguimiento AS "SEGUIMIENTO",
            ds.forma_contacto AS "FORMA_CONTACTO",
            gb.custrecord_pe_gb_cant_intentos AS "CANTIDAD_INTENTOS"
        FROM
            customrecord_pe_ht_gestion_bienvenida gb
            LEFT JOIN transaction so ON gb.custrecord_pe_gb_os = so.id
            LEFT JOIN transactionline tl ON so.id = tl.transaction AND tl.mainline = 'T'
            LEFT JOIN department dep ON tl.department = dep.id
            LEFT JOIN classification cls ON tl.class = cls.id
            LEFT JOIN location loc ON tl.location = loc.id
            LEFT JOIN Customer c ON gb.custrecord_pe_gb_cliente = c.id
            LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON gb.custrecord_pe_gb_bien = b.id
            LEFT JOIN CUSTOMRECORD_HT_RECORD_ORDENTRABAJO ot ON so.id = ot.custrecord_ht_ot_orden_servicio
            LEFT JOIN item i ON ot.custrecord_ht_ot_itemrelacionado = i.id
            LEFT JOIN employee emp_ref ON so.custbody_ht_os_ejecutivareferencia = emp_ref.id
            LEFT JOIN employee emp_sales ON so.employee = emp_sales.id
            LEFT JOIN employee emp_creator ON so.createdby = emp_creator.id
            LEFT JOIN employee emp_asign ON gb.custrecord_pe_gb_eje_asignado = emp_asign.id
            LEFT JOIN customrecord_ht_record_canaldistribucion cons ON b.custrecord_ht_bien_consesionarios = cons.id
            LEFT JOIN DetallesSeguimientos ds ON c.id = ds.cliente_id AND b.id = ds.bien_id AND gb.custrecord_pe_gb_eje_asignado = ds.empleado_id
        WHERE
            so.type = 'SalesOrd'
            AND so.recordtype = 'salesorder'
            AND BUILTIN.DF(so.status) != 'Cancelled'
            AND so.estgrossprofit > 0
            AND i.displayname LIKE '%DISPO%'
            AND ot.custrecord_ht_ot_subsidiary = 3
            AND (
		c.custentity_pe_document_number = ?
		OR so.number = ?
		OR b.custrecord_ht_bien_placa = ?
		OR b.id = ?
            )

    `;

        try {
            var resultSet = query.runSuiteQL({
                query: sqlQuery,
                params: [
                    clienter,
                    osr,
                    placar,
                    idvehiculor
                ]
            });

            var results = resultSet.asMappedResults();

            log.debug({
                title: 'Resultados obtenidos',
                details: 'Se encontraron ' + results.length + ' registros'
            });

            return results;

        } catch (e) {
            log.error({
                title: 'Error en listaBaseRepartidaByDato',
                details: e.toString()
            });

            return [];
        }
    }

    function listaHistorialSeguimiento(clienteId, vehiculoId) {

        if (!clienteId) {
            throw new Error('clienteId no proporcionado');
        }
        log.debug('clienteId', clienteId);

        var sql = `
            SELECT 
                    sc.name AS id_externo_seguimiento,
                    sc.id AS id_seguimiento,
		    sc.custrecord_ht_sc_vehiculo AS id_vehiculo,
                    sc.custrecord_ht_sc_resultadogestion AS id_resultado_gestion,
                    c.custentity_pe_document_number AS "CODIGO_CLIENTE",
                    c.custentity_pe_document_number || '-' || 
                    CASE WHEN c.isperson = 'T' THEN c.altname ELSE c.companyname END AS "CLIENTE",
                    sc.custrecord_ht_sc_cmotivo AS id_motivo,
                    rg.custrecord_ht_rg_descripcion AS resultado_gestion,
                    mt.custrecord_ht_mt_descripcion AS motivo,
                    sc.created AS fecha_seguimiento,
                    sc.custrecord_ht_sc_seguimiento AS seguimiento,
                    mc.name AS forma_contacto,
                    sc.custrecord_ht_sc_fechacontacto AS fecha_contacto
                FROM 
			 customrecord_ht_record_seguicliente sc 
		        LEFT JOIN Customer c ON sc.custrecord_ht_sc_cliente = c.id
                    LEFT JOIN customrecord_ht_resultadogestion rg 
                        ON sc.custrecord_ht_sc_resultadogestion = rg.id
                    LEFT JOIN customrecord_ht_sc_motivo mt 
                        ON sc.custrecord_ht_sc_cmotivo = mt.id 
                        AND mt.custrecord_ht_mt_codigo_resulgesiton = sc.custrecord_ht_sc_resultadogestion
                    LEFT JOIN customrecord_ht_sc_modocontacto mc 
                        ON sc.custrecord_ht_sc_modocontacto = mc.id
		    where 
            --sc.custrecord_ht_sc_cliente = ${clienteId}
           	custentity_pe_document_number = ${clienteId}
		    --sc.custrecord_ht_sc_cliente = '45272'
        `

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();
        return results;

    }


    function listaModoContacto() {
        var sql = `
            select
                custrecord_ht_md_descripcion as 'desc',
                id
                from 
            customrecord_ht_sc_modocontacto
                where custrecord_ht_subsidiaria_cc = 3
                and isinactive = 'F'
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();
        return results;
    }

    function listaResultadosGestion() {
        var sql = `
            select
                custrecord_ht_rg_descripcion as 'desc',
                id
            from 
            customrecord_ht_resultadogestion
                where custrecord_ht_subsidiaria_resultado_gest = 3
                and isinactive = 'F'
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();
        return results;
    }

    function listaMotivos(resGestionid) {

        if (!resGestionid) {
            throw new Error('resGestionid no proporcionado');
        }
        log.debug('resGestionid', resGestionid);

        var sql = `
            select
                custrecord_ht_mt_descripcion as 'desc',
                id
            from 
            customrecord_ht_sc_motivo
                where custrecord_ht_subsidiaria_motivo= 3
                and isinactive = 'F'
                and custrecord_ht_mt_codigo_resulgesiton = ${resGestionid}
        `;

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();
        return results;

    }

    function updateEstGB(os) {
        if (!os) {
            throw new Error('OS no proporcionado');
        }

        log.debug('Buscando registro con OS', os);

        try {
            const selectSql = `
            SELECT id, custrecord_pe_gb_cant_intentos 
            FROM customrecord_pe_ht_gestion_bienvenida 
            WHERE custrecord_pe_gb_os = ?
        `;

            const resultSet = query.runSuiteQL({
                query: selectSql,
                params: [os]
            });

            const results = resultSet.asMappedResults();
            log.debug('Resultados encontrados', results.length);

            if (results.length === 0) {
                log.error('No se encontró registro', `No existe registro con OS: ${os}`);
                return {
                    success: false,
                    message: `No se encontró registro con OS: ${os}`
                };
            }

            const recordId = results[0].id;
            let intentos = parseInt(results[0].custrecord_pe_gb_cant_intentos || '0', 10);
            intentos += 1;

            log.debug('ID del registro a actualizar', recordId);
            log.debug('Nuevos intentos', intentos);

            const gestionRecord = record.load({
                type: 'customrecord_pe_ht_gestion_bienvenida',
                id: recordId
            });

            gestionRecord.setValue({
                fieldId: 'custrecord_pe_gb_cant_intentos',
                value: intentos
            });

            const savedId = gestionRecord.save();
            log.audit('Registro actualizado exitosamente', `ID: ${savedId}, OS: ${os}, Intentos: ${intentos}`);

            return {
                success: true,
                recordId: savedId,
                message: `Registro actualizado exitosamente. ID: ${savedId}, Intentos: ${intentos}`
            };

        } catch (error) {
            log.error('Error al actualizar registro', {
                error: error.message,
                stack: error.stack,
                os: os
            });

            return {
                success: false,
                message: `Error al actualizar registro: ${error.message}`
            };
        }
    }

    function _post(context) {
        try {
            var startDate = context.startDate;
            var endDate = context.endDate;
            var action = context.action;

            if (action === 'bbvienvenida') {
                var getCustomOrdenSres = getCustomOrdenS(startDate, endDate);
                return { success: true, data: getCustomOrdenSres };
            } else if (action === 'cargaGestionBienvenida') {
                return cargaGestionBienvenida(context);
            } else if (action === 'bbejetuivo') {
                var ejecutiva = context.ejecutiva;
                var listaBaseRepartidares = listaBaseRepartida(startDate, endDate, ejecutiva);
                return { success: true, data: listaBaseRepartidares };
            } else if (action === 'listaModoContacto') {
                var listaModoContactores = listaModoContacto();
                return { success: true, data: listaModoContactores };
            } else if (action === 'listaResultadosGestion') {
                var listaResultadosGestionres = listaResultadosGestion();
                return { success: true, data: listaResultadosGestionres };
            } else if (action === 'listaMotivos') {
                var resGestionid = context.resGestionid;
                var listaMotivosres = listaMotivos(resGestionid);
                return { success: true, data: listaMotivosres };
            } else if (action === 'listaHistorialSeguimiento') {
                var clienteId = context.clienteId;
                var vehiculoId = context.vehiculoId;
                var listaHistorialSeguimientores = listaHistorialSeguimiento(clienteId, vehiculoId);
                return { success: true, data: listaHistorialSeguimientores };
            } else if (action === 'listaBaseRepartidaByDato') {
                var cliente = context.cliente
                var os = context.os
                var idvehiculo = context.idvehiculo
                var placa = context.placa
                var listaBaseRepartidaByDatores = listaBaseRepartidaByDato(cliente, os, idvehiculo, placa)
                return { success: true, data: listaBaseRepartidaByDatores };
            } else if (action === 'updateEstGB') {
                var os = context.os;
                var updateEstGBres = updateEstGB(os);
                return { data: updateEstGBres };
            }
            else {
                return { success: true, data: 'accion no reconocida' };
            }
        } catch (e) {
            log.error('Error en el script', e);
            return { success: false, error: e.message };
        }
    }

    return {
        post: _post
    }
});
