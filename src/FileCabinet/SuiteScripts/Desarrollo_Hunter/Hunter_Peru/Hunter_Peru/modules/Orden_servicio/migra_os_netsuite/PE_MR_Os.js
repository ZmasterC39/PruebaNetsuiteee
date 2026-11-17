/**
 * MAP/REDUCE SCRIPT - Service Order Sync
 * Procesa ordenes pendientes y las envia al API neskuit
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/https', 'N/log', 'N/query', 'N/runtime'], function (search, record, https, log, query, runtime) {

    /**
     * Obtiene SOLO el registro pasado como parametro (id interno de la os o sales order, como quieras decirle xd)
     */
    function getInputData() {
        try {
            var script = runtime.getCurrentScript();
            var targetRecordId = script.getParameter('custscript_target_record_id');

            log.debug('Map/Reduce getInputData', {
                targetRecordId: targetRecordId || 'Not specified',
                mode: targetRecordId ? 'SINGLE_RECORD' : 'BATCH_MODE'
            });

            if (targetRecordId) {
                var specificRecordSearch = search.create({
                    type: 'salesorder',
                    filters: [
                        ['internalid', 'is', targetRecordId]
                    ],
                    columns: [
                        'internalid',
                        'custbody_os_api_attempts'
                    ]
                });

                var resultCount = specificRecordSearch.runPaged().count;
                log.debug('encontrao', {
                    targetRecordId: targetRecordId,
                    found: resultCount > 0
                });

                return specificRecordSearch;
            } else {
                return search.create({
                    type: 'salesorder',
                    filters: [['internalid', 'is', '-1']],
                    columns: ['internalid']
                });
            }

        } catch (error) {
            log.error('Error in getInputData', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Procesa cada registro con map :p
     */
    function map(context) {
        var recordId = null;

        try {
            var searchResult = JSON.parse(context.value);
            recordId = searchResult.id;

            log.debug('id entra a map', {
                recordId: recordId
            });

            if (isAlreadySent(recordId)) {
                log.audit('si valida enviado, omitir', {
                    recordId: recordId,
                    message: 'Record already processed successfully'
                });
                return;
            }

            var orderData = getOrderData(recordId);

            if (!orderData) {
                markAsFailed(recordId, 'no se encontro datos con el id proporcionado', null);
                return;
            }

            context.write({
                key: recordId,
                value: {
                    recordId: recordId,
                    orderData: orderData
                }
            });

        } catch (error) {
            log.error('Error in Map phase', {
                error: error.message,
                stack: error.stack,
                recordId: recordId || 'unknown'
            });

            if (recordId) {
                markAsFailed(recordId, 'Map Error: ' + error.message, null);
            }
        }
    }

    /**
     * fase del reduce
     */
    function reduce(context) {
        var recordId = context.key;
        var startTime = Date.now();

        try {
            var recordData = JSON.parse(context.values[0]);
            var orderData = recordData.orderData;

            log.debug('Processing Reduce - Original API Logic', {
                recordId: recordId,
                startTime: new Date().toISOString()
            });

            var apiResult = sendToAPI(orderData, recordId);

            if (apiResult.success) {
                markAsSuccess(recordId, apiResult, startTime);
                log.audit('API Success', {
                    recordId: recordId,
                    statusCode: apiResult.statusCode,
                    numeroOS: apiResult.numeroOS,
                    codigoVehiculo: apiResult.codigoVehiculo,
                    totalTimeMs: Date.now() - startTime
                });
            } else {
                markAsFailed(recordId, apiResult.error, apiResult);
                log.error('API Failed', {
                    recordId: recordId,
                    error: apiResult.error,
                    hasErrors: apiResult.hasErrors,
                    errorsCount: apiResult.errors ? apiResult.errors.length : 0,
                    totalTimeMs: Date.now() - startTime
                });
            }

        } catch (error) {
            log.error('Critical Script Error', {
                recordId: recordId,
                error: error.toString(),
                stack: error.stack,
                executionTimeMs: Date.now() - startTime
            });

            markAsFailed(recordId, 'Script Error: ' + error.toString(), null);
        }
    }

    /**
     * fase summarize
     */
    function summarize(context) {
        try {
            var processedCount = 0;
            var successCount = 0;
            var errorCount = 0;

            context.reduceSummary.keys.iterator().each(function (key) {
                processedCount++;
                return true;
            });

            context.reduceSummary.errors.iterator().each(function (key, error) {
                errorCount++;
                log.error('Reduce Error Summary', {
                    key: key,
                    error: error
                });
                return true;
            });

            context.mapSummary.errors.iterator().each(function (key, error) {
                errorCount++;
                log.error('Map Error Summary', {
                    key: key,
                    error: error
                });
                return true;
            });

            successCount = processedCount - errorCount;

            log.audit('Map/Reduce Summary', {
                totalProcessed: processedCount,
                successful: successCount,
                errors: errorCount,
                inputSummary: context.inputSummary
            });

            scheduleNextExecutionIfNeeded();

        } catch (error) {
            log.error('Error in Summarize', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * obtener data de os (o sales order xd)
     */
    function getOrderData(recordId) {
        try {
            var sql = `
select
'1' as N_CREDITO,
    TO_CHAR(so.startdate, 'YYYY-MM-DD') as fini,
    TO_CHAR(so.enddate,   'YYYY-MM-DD') as ffin,
    (select top 1 custentity_pe_document_number from employee where id = so.custbody_ht_os_ejecutiva_backoffice) AS EJECUTIVA_GESTION,
    (select top 1 custentity_pe_document_number from employee where id = so.custbody_os_ejecutivarenovacion) AS EJECUTIVA_RENOVACION,
    (select top 1 custentity_pe_document_number from employee where id = so.custbody_ht_os_ejecutivocampo) AS EJECUTIVO_CAMPO,
    so.custbody_ht_pe_os_clas_os AS CLAS_OS,
    
    -- PLAZOS (hasta 10 items)
    NVL(items_data.plazo_1, '') AS PLAZO_ITEM_1,
    NVL(items_data.plazo_2, '') AS PLAZO_ITEM_2,
    NVL(items_data.plazo_3, '') AS PLAZO_ITEM_3,
    NVL(items_data.plazo_4, '') AS PLAZO_ITEM_4,
    NVL(items_data.plazo_5, '') AS PLAZO_ITEM_5,
    NVL(items_data.plazo_6, '') AS PLAZO_ITEM_6,
    NVL(items_data.plazo_7, '') AS PLAZO_ITEM_7,
    NVL(items_data.plazo_8, '') AS PLAZO_ITEM_8,
    NVL(items_data.plazo_9, '') AS PLAZO_ITEM_9,
    NVL(items_data.plazo_10, '') AS PLAZO_ITEM_10,
    --'' AS cod_vh_custodia,
    (select top 1 custrecord_pe_ht_os_codigo  from customrecord_ht_os_lugar_instalacion where id = so.custbody_pe_ht_lugar_instalacion) as ID_LUGAR_INSTALACION,
    (select top 1 custrecord_ht_pe_codigo from customrecord_ht_pe_os_leyenda  where id = so.custbody_ht_pe_os_leyenda) as ID_LEYENDA,
    so.custbody_pe_os_convenio as id_convenio_netsuite,
    so.custbody_canal_distribucion_sys as id_canal_distribucion_sys,
    so.id as ID_INTERNO_OS,
    so.custbody_ht_so_bien as ID_INTERNO_BIEN,
    so.entity ID_INTERNO_CLIENTE,
    CASE WHEN c.isperson = 'T' THEN c.firstname ELSE c.companyname END AS NOMBRES,
    CASE WHEN c.isperson = 'T' THEN c.lastname ELSE ' ' END AS APELLIDO_PATERNO,
    '' AS APELLIDO_MATERNO,
   CASE WHEN c.custentity_pe_document_type = '1' THEN 'OTROS'
        WHEN c.custentity_pe_document_type = '2' THEN 'DNI'    
        WHEN c.custentity_pe_document_type = '3' THEN 'CARNET EXTRANJERIA'    
        WHEN c.custentity_pe_document_type = '4' THEN 'RUC'    
        WHEN c.custentity_pe_document_type = '5' THEN 'PASAPORTE'    
        WHEN c.custentity_pe_document_type = '6' THEN 'CEDULA'    
    END AS TIPO_DE_DOCUMENTO,
    c.custentity_pe_document_number AS NUMERO_DE_DOCUMENTO,
    NVL((select custentity_pe_document_number from customer where id = so.custbody_ht_facturar_a), '') AS NUMERO_DE_DOCUMENTO_2,
    CASE WHEN c.custentity_pe_document_type = '2' THEN 'M' ELSE 'M' END AS SEXO,
    '01/01/2000' AS FECHA_DE_NACIMIENTO,
    direc.custrecord_pe_departamento AS DEPARTAMEN_O_DIRECCION_LEGAL,
    direc.dropdownstate AS PROVINCIA_DIRECCION_LEGAL,
    direc.custrecord_pe_distrito AS DISTRITO_DIRECCION_LEGAL,
    direc.addr1 AS DIRECCION_LEGAL,
    CASE 
        WHEN c.phone LIKE '+51%' THEN SUBSTR(c.phone, 4)
        ELSE NVL(c.phone, '')
    END AS TELEFONO_TITULAR,
    NVL(c.email, '') AS OTRO_CORREO,
    NVL(tv.name, ' ') AS CLASE,
    'PARTICULAR' AS USO,
    NVL(bma.name, '') AS MARCA,
    NVL(bmo.name, '') AS MODELO,
    NVL(tv.name, '') AS TIPO_VEHICULO,
    NVL(col.name, '') AS COLOR,
    TO_CHAR(b.custrecord_ht_bien_ano) AS ANIO_FABRICACION,
    b.custrecord_ht_bien_placa as N_PLACA,
    b.custrecord_ht_bien_motor AS N_MOTOR,
    b.custrecord_ht_bien_chasis AS N_SERIE,
    '' AS CBU,
    NVL(cons.custrecord_ht_cd_ruccanaldistribucion, '9980000000006') AS CONCESIONARIO,
    '2' AS SUCURSAL,
    (select top 1 custentity_pe_document_number from employee where id = so.custbody_ht_os_ejecutivareferencia) AS EJECUTIVA_REFERENCIA,
    NVL(fina.custrecord_ht_cd_ruccanaldistribucion, '9980000000004') AS FINANCIERA,
    NVL(bro.custrecord_ht_cd_ruccanaldistribucion, '9980000000003') AS BROKER,    
    NVL(ase.custrecord_ht_cd_ruccanaldistribucion, '9980000000005') AS COMPANIA_SEGUROS,
    
    -- MONTO TOTAL
    TO_CHAR(ROUND(
        NVL(items_data.precio_1, 0) + 
        NVL(items_data.precio_2, 0) + 
        NVL(items_data.precio_3, 0) + 
        NVL(items_data.precio_4, 0) + 
        NVL(items_data.precio_5, 0) + 
        NVL(items_data.precio_6, 0) + 
        NVL(items_data.precio_7, 0) + 
        NVL(items_data.precio_8, 0) + 
        NVL(items_data.precio_9, 0) + 
        NVL(items_data.precio_10, 0), 2
    )) AS MONTO_GPS_DOLARES,
    
    NVL(c.email, '') AS CORREO_DE_CORRESPONDENCIA,
    (case when so.currency = '1' then 'D' when so.currency = '5' then 'S' end) as MONEDA_S_D,
    so.custbody_pe_os_forma_pago_sys as FORMA_PAGO,
    so.terms AS DATCORP_TIPO_CREDITO,
    '0' AS DIAS,
    (select top 1 custrecord_ht_pe_id_vendedor from  customrecord_pe_ht_os_vendedor where id = so.custbody_ht_pe_os_vendedor) AS VENDEDOR_CODIGO,
    
    NVL(items_data.item_1, '') AS ITEM_1,
    TO_CHAR(ROUND(NVL(items_data.precio_1, 0), 2)) AS PRECIO_1,
    
    NVL(items_data.item_2, '') AS ITEM_2,
    TO_CHAR(ROUND(NVL(items_data.precio_2, 0), 2)) AS PRECIO_2,
    
    NVL(items_data.item_3, '') AS ITEM_3,
    TO_CHAR(ROUND(NVL(items_data.precio_3, 0), 2)) AS PRECIO_3,
    
    NVL(items_data.item_4, '') AS ITEM_4,
    TO_CHAR(ROUND(NVL(items_data.precio_4, 0), 2)) AS PRECIO_4,
    
    NVL(items_data.item_5, '') AS ITEM_5,
    TO_CHAR(ROUND(NVL(items_data.precio_5, 0), 2)) AS PRECIO_5,
    
    NVL(items_data.item_6, '') AS ITEM_6,
    TO_CHAR(ROUND(NVL(items_data.precio_6, 0), 2)) AS PRECIO_6,
    
    NVL(items_data.item_7, '') AS ITEM_7,
    TO_CHAR(ROUND(NVL(items_data.precio_7, 0), 2)) AS PRECIO_7,
    
    NVL(items_data.item_8, '') AS ITEM_8,
    TO_CHAR(ROUND(NVL(items_data.precio_8, 0), 2)) AS PRECIO_8,
    
    NVL(items_data.item_9, '') AS ITEM_9,
    TO_CHAR(ROUND(NVL(items_data.precio_9, 0), 2)) AS PRECIO_9,
    
    NVL(items_data.item_10, '') AS ITEM_10,
    TO_CHAR(ROUND(NVL(items_data.precio_10, 0), 2)) AS PRECIO_10,

    CASE 
        WHEN UPPER(dept_data.department_fullname) LIKE '%LIMA%' THEN 'L100'
        WHEN UPPER(dept_data.department_fullname) LIKE '%AREQUIPA%' THEN 'A300'
        WHEN UPPER(dept_data.department_fullname) LIKE '%TRUJILLO%' THEN 'T200'
        ELSE 'L100'
    END AS CENTRO_UTILIDAD,
    dept_data.department_fullname AS CENTRO_COSTO
    
FROM customer c 
LEFT JOIN transaction so ON so.entity = c.id
LEFT JOIN CUSTOMRECORD_HT_RECORD_BIENES b ON so.custbody_ht_so_bien = b.id
LEFT JOIN customrecord_ht_record_tipovehiculo tv ON tv.id = b.custrecord_ht_bien_tipo
LEFT JOIN customrecord_ht_bn_modelo bmo ON bmo.id = b.custrecord_ht_bien_modelo
LEFT JOIN customrecord_ht_bien_marca bma ON bma.id = b.custrecord_ht_bien_marca
LEFT JOIN customrecord_ht_bn_colorcarseg col ON col.id = b.custrecord_ht_bien_colorcarseg
LEFT JOIN customrecord_ht_record_canaldistribucion cons ON cons.id = b.custrecord_ht_bien_consesionarios
LEFT JOIN customrecord_ht_record_canaldistribucion fina ON fina.id = b.custrecord_ht_bien_financiadovehiculo
LEFT JOIN customrecord_ht_record_canaldistribucion ase ON ase.id = b.custrecord_ht_bien_companiaseguros
LEFT JOIN customrecord_ht_record_canaldistribucion bro ON bro.id = b.custrecord_pe_broker
LEFT JOIN entityaddress direc ON direc.recordowner = c.defaultbillingaddress AND direc.country = 'PE'
LEFT JOIN (
    SELECT 
        tl.transaction,
        d.fullname as department_fullname
    FROM transactionline tl
    INNER JOIN department d ON d.id = tl.department
    WHERE tl.mainline = 'T'
    AND tl.department IS NOT NULL
) dept_data ON dept_data.transaction = so.id

-- Subconsulta que genera columnas dinámicas hasta 10 items
LEFT JOIN (
    SELECT 
        transaction,
        MAX(CASE WHEN rn = 1 THEN item_codigo END) AS item_1,
        MAX(CASE WHEN rn = 1 THEN precio_con_impuesto END) AS precio_1,
        MAX(CASE WHEN rn = 1 THEN plazo END) AS plazo_1,
        MAX(CASE WHEN rn = 1 THEN tipo_item END) AS tipo_1,
        
        MAX(CASE WHEN rn = 2 THEN item_codigo END) AS item_2,
        MAX(CASE WHEN rn = 2 THEN precio_con_impuesto END) AS precio_2,
        MAX(CASE WHEN rn = 2 THEN plazo END) AS plazo_2,
        MAX(CASE WHEN rn = 2 THEN tipo_item END) AS tipo_2,
        
        MAX(CASE WHEN rn = 3 THEN item_codigo END) AS item_3,
        MAX(CASE WHEN rn = 3 THEN precio_con_impuesto END) AS precio_3,
        MAX(CASE WHEN rn = 3 THEN plazo END) AS plazo_3,
        MAX(CASE WHEN rn = 3 THEN tipo_item END) AS tipo_3,
        
        MAX(CASE WHEN rn = 4 THEN item_codigo END) AS item_4,
        MAX(CASE WHEN rn = 4 THEN precio_con_impuesto END) AS precio_4,
        MAX(CASE WHEN rn = 4 THEN plazo END) AS plazo_4,
        MAX(CASE WHEN rn = 4 THEN tipo_item END) AS tipo_4,
        
        MAX(CASE WHEN rn = 5 THEN item_codigo END) AS item_5,
        MAX(CASE WHEN rn = 5 THEN precio_con_impuesto END) AS precio_5,
        MAX(CASE WHEN rn = 5 THEN plazo END) AS plazo_5,
        MAX(CASE WHEN rn = 5 THEN tipo_item END) AS tipo_5,
        
        MAX(CASE WHEN rn = 6 THEN item_codigo END) AS item_6,
        MAX(CASE WHEN rn = 6 THEN precio_con_impuesto END) AS precio_6,
        MAX(CASE WHEN rn = 6 THEN plazo END) AS plazo_6,
        MAX(CASE WHEN rn = 6 THEN tipo_item END) AS tipo_6,
        
        MAX(CASE WHEN rn = 7 THEN item_codigo END) AS item_7,
        MAX(CASE WHEN rn = 7 THEN precio_con_impuesto END) AS precio_7,
        MAX(CASE WHEN rn = 7 THEN plazo END) AS plazo_7,
        MAX(CASE WHEN rn = 7 THEN tipo_item END) AS tipo_7,
        
        MAX(CASE WHEN rn = 8 THEN item_codigo END) AS item_8,
        MAX(CASE WHEN rn = 8 THEN precio_con_impuesto END) AS precio_8,
        MAX(CASE WHEN rn = 8 THEN plazo END) AS plazo_8,
        MAX(CASE WHEN rn = 8 THEN tipo_item END) AS tipo_8,
        
        MAX(CASE WHEN rn = 9 THEN item_codigo END) AS item_9,
        MAX(CASE WHEN rn = 9 THEN precio_con_impuesto END) AS precio_9,
        MAX(CASE WHEN rn = 9 THEN plazo END) AS plazo_9,
        MAX(CASE WHEN rn = 9 THEN tipo_item END) AS tipo_9,
        
        MAX(CASE WHEN rn = 10 THEN item_codigo END) AS item_10,
        MAX(CASE WHEN rn = 10 THEN precio_con_impuesto END) AS precio_10,
        MAX(CASE WHEN rn = 10 THEN plazo END) AS plazo_10,
        MAX(CASE WHEN rn = 10 THEN tipo_item END) AS tipo_10
        
    FROM (
        SELECT 
            main_lines.transaction,
            
            -- Tipo de item
            CASE 
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') 
                     AND UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN 'DISPOSITIVO'
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio' 
                     OR UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN 'SERVICIO'
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') 
                     AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%' 
                     AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                     AND main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN 'ACCESORIO'
                ELSE 'OTRO'
            END AS tipo_item,
            
            -- Código del item
            CASE 
                WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                ELSE main_lines.itemid
            END AS item_codigo,
            
            -- Precio con impuesto
            TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(main_lines.tax_rate, 0.18)) AS precio_con_impuesto,
            
            -- Plazo
            NVL(main_lines.custcol_ht_os_tiempo_cobertura, '') AS plazo,
            
            -- Número de secuencia (ordenado por tipo primero, luego por itemid)
            ROW_NUMBER() OVER (
                PARTITION BY main_lines.transaction 
                ORDER BY 
                    CASE 
                        WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') 
                             AND UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN 1
                        WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio' 
                             OR UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN 2
                        ELSE 3
                    END,
                    main_lines.itemid
            ) AS rn
            
        FROM (
            SELECT 
                tl.transaction,
                tl.estgrossprofit,
                tl.netamount,
                tl.custcol_ht_os_tipoarticulo,
                tl.custcol_ht_os_tiempo_cobertura,
                i.itemid,
                i.displayname,
                -- Obtener la tasa de impuesto
                (SELECT MAX(NVL(ratepercent, 0.18)) 
                 FROM transactionline 
                 WHERE transaction = tl.transaction 
                 AND itemtype = 'TaxItem') as tax_rate
            FROM transactionline tl
            INNER JOIN item i ON i.id = tl.item
            WHERE tl.item IS NOT NULL
            AND tl.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Servicio', 'Artículo no inventariable','Non-inventory Item','Assembly')
            AND (tl.assemblycomponent IS NULL OR tl.assemblycomponent != 'T')
            AND tl.donotprintline = 'F'
        ) main_lines
    ) numbered_items
    GROUP BY transaction
) items_data ON items_data.transaction = so.id
WHERE so.type = 'SalesOrd' AND so.id = ?
            `;

            
          log.debug('Executing SuiteQL Query', {
                recordId: recordId
            });

            var resultSet = query.runSuiteQL({
                query: sql,
                params: [recordId]
            });

            var results = resultSet.asMappedResults();

            if (results.length === 0) {
                log.error('No Data Found', {
                    recordId: recordId,
                    message: 'SuiteQL query returned no results'
                });
                return null;
            }

            var orderData = results[0];
          log.debug('SuiteQL rows count', results.length);
          log.debug('SuiteQL results', JSON.stringify(results, null, 2));

            log.debug('Data Retrieved Successfully', {
                recordId: recordId,
                nombres: orderData.NOMBRES,
                item1: orderData.ITEM_1,
                monto: orderData.MONTO_GPS_DOLARES
            });

            return orderData;

        } catch (error) {
            log.error('SuiteQL Error', {
                recordId: recordId,
                error: error.toString(),
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * el api neskuit con pre homologacion de usuario (bueno mas o menos)
     */
    function sendToAPI(data, recordId) {
        var apiStartTime = Date.now();
        try {
            var sqlUsuario = `
                select emp.custentity_pe_document_number 
                    from employee emp 
                left join transaction so on so.custbody_ht_os_ejecutivareferencia = emp.id
                where so.id = ${recordId}
            `;

            var usuarioResult = query.runSuiteQL({
                query: sqlUsuario
            }).asMappedResults();

            if (usuarioResult.length === 0) {
                log.error('No User Found', {
                    recordId: recordId,
                    message: 'No user found for the given record ID'
                });
                return {
                    success: false,
                    error: 'No user found for the given record ID',
                    hasErrors: true,
                    errors: ['No user found for the given record ID']
                };
            }

            var dniusuario = usuarioResult[0].custentity_pe_document_number;

            log.debug('User Found', {
                recordId: recordId,
                dniusuario: dniusuario
            });

            var apiPayload = {
                usuario: dniusuario,
                id_int_os: recordId,
                objJson: [data]
            };

            log.debug('Sending API', {
                recordId: recordId,
                //url: 'https://hunterdev.com.pe/NS/generateOSNetsuite',
                utl: 'https://syshunterperu.com/migraos/migraos/NS/generateOSNetsuite',
                usuario: apiPayload.usuario,
                objJsonLength: apiPayload.objJson.length,
                sampleData: {
                    nombres: data.NOMBRES,
                    item1: data.ITEM_1,
                    monto: data.MONTO_GPS_DOLARES
                }
            });

            var response = https.post({
                url: 'https://syshunterperu.com/migraos/migraos/NS/generateOSNetsuite',
                body: JSON.stringify(apiPayload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            var responseTime = Date.now() - apiStartTime;

            // Analizar la respuesta de la API
            var apiResponseAnalysis = analyzeAPIResponse(response.body, recordId, response.code);

            log.debug('API Response', {
                recordId: recordId,
                statusCode: response.code,
                responseTimeMs: responseTime,
                bodyLength: response.body ? response.body.length : 0,
                hasErrors: apiResponseAnalysis.hasErrors,
                numeroOS: apiResponseAnalysis.numeroOS,
                codigoVehiculo: apiResponseAnalysis.codigoVehiculo,
                errorsFound: apiResponseAnalysis.errors
            });

            return {
                success: apiResponseAnalysis.success,
                statusCode: response.code,
                response: response.body || 'No response',
                responseTime: responseTime,
                numeroOS: apiResponseAnalysis.numeroOS,
                codigoVehiculo: apiResponseAnalysis.codigoVehiculo,
                estados: apiResponseAnalysis.estados,
                errors: apiResponseAnalysis.errors,
                hasErrors: apiResponseAnalysis.hasErrors,
                error: apiResponseAnalysis.errorsFound
            };

        } catch (error) {
            return {
                success: false,
                error: 'Request Error: ' + error.toString(),
                responseTime: Date.now() - apiStartTime,
                hasErrors: true,
                errors: ['Request Error: ' + error.toString()]
            };
        }
    }

    /**
     * Analizar respeusta
     */
    function analyzeAPIResponse(responseBody, recordId, statusCode) {
        var result = {
            success: false,
            hasErrors: true,
            errors: [],
            numeroOS: null,
            codigoVehiculo: null,
            estados: [],
            error: null
        };

        try {
            
            if (!responseBody) {
                result.error = 'API no retornó respuesta (vacía)';
                result.errors.push('Empty response body');
                log.error('Empty API Response', {
                    recordId: recordId,
                    statusCode: statusCode
                });
                return result;
            }

            var parsedResponse;
            try {
                parsedResponse = JSON.parse(responseBody);
            } catch (parseError) {
                result.error = 'API retorno respuesta no valida (o sea no JSON ps)';
                result.errors.push('Invalid JSON response: ' + parseError.toString());
                log.error('JSON Parse Error', {
                    recordId: recordId,
                    error: parseError.toString(),
                    responseBody: responseBody ? responseBody.substring(0, 500) : 'null'
                });
                return result;
            }

            if (!parsedResponse.status) {
                result.error = 'API retorno respuesta sin campo status (eres un monstruo)';
                result.errors.push('No status field in response');
                return result;
            }

            if (parsedResponse.status === 'error') {
                result.error = 'API retornó status: error';
                result.errors.push('API returned error status');
                return result;
            }

            if (parsedResponse.status !== 'success') {
                result.error = 'API retornó status no exitoso: ' + parsedResponse.status;
                result.errors.push('API status not success: ' + parsedResponse.status);
                return result;
            }

            if (!parsedResponse.registros || !Array.isArray(parsedResponse.registros)) {
                result.error = 'API no retorno array de registros valido';
                result.errors.push('No valid registros array found in response');
                return result;
            }

            if (parsedResponse.registros.length === 0) {
                result.error = 'API retornop array de registros vacio';
                result.errors.push('Empty registros array');
                return result;
            }

            var foundErrors = false;
            var successCount = 0;

            parsedResponse.registros.forEach(function (registro, index) {
                
                if (registro.NUMERO_OS && registro.NUMERO_OS > 0 && !result.numeroOS) {
                    result.numeroOS = registro.NUMERO_OS;
                }

                if (registro.CODIGO_VEHICULO && !result.codigoVehiculo) {
                    result.codigoVehiculo = registro.CODIGO_VEHICULO;
                }

                if (registro.ESTADO) {
                    var estado = registro.ESTADO.toString();
                    result.estados.push(estado);

                    var estadoUpper = estado.toUpperCase();
                    if (estadoUpper === 'OK' || estadoUpper === 'SUCCESS' || estadoUpper === 'COMPLETADO') {
                        successCount++;
                    } else {
                        foundErrors = true;
                        result.errors.push(`Registro ${index + 1}: ${estado}`);
                    }
                } else {
                    foundErrors = true;
                    result.errors.push(`Registro ${index + 1}: Sin campo ESTADO`);
                }
            });

            if (!foundErrors && successCount > 0) {
                result.success = true;
                result.hasErrors = false;
                result.error = null;
            } else if (foundErrors) {
                result.success = false;
                result.hasErrors = true;
                result.error = 'Errores de validacion encontradoss';
            } else {
                result.success = false;
                result.hasErrors = true;
                result.error = 'No se encontraron estados exitosos';
            }

            log.debug('Response Analysis Complete', {
                recordId: recordId,
                totalRegistros: parsedResponse.registros.length,
                successCount: successCount,
                errorsFound: result.errors.length,
                numeroOS: result.numeroOS,
                codigoVehiculo: result.codigoVehiculo,
                success: result.success
            });

        } catch (analysisError) {
            result.error = 'Error analizando respuesta API: ' + analysisError.toString();
            result.errors.push('Analysis error: ' + analysisError.toString());
            log.error('API Analysis Error', {
                recordId: recordId,
                error: analysisError.toString(),
                responseBody: responseBody ? responseBody.substring(0, 500) : 'null'
            });
        }

        return result;
    }

    /**
     * Verifica si el registro ya fue enviado exitosamente
     */
    function isAlreadySent(recordId) {
        try {
            var orderRecord = record.load({
                type: 'salesorder',
                id: recordId,
                isDynamic: false
            });
            return orderRecord.getValue('custbody_os_api_sent') === true;
        } catch (error) {
            log.debug('Error checking sent status', {
                recordId: recordId,
                error: error.toString()
            });
            return false;
        }
    }

    /**
     * markAsSuccess
     */
    function markAsSuccess(recordId, apiResult, startTime) {
        try {
            var responseText = 'Success';

            var responseParts = [];
            if (apiResult.numeroOS) {
                responseParts.push('OS: ' + apiResult.numeroOS);
            }
            if (apiResult.codigoVehiculo) {
                responseParts.push('Vehiculo: ' + apiResult.codigoVehiculo);
            }
            if (apiResult.estados && apiResult.estados.length > 0) {
                responseParts.push('Estados: ' + apiResult.estados.join(', '));
            }

            if (responseParts.length > 0) {
                responseText = responseParts.join(' | ');
            }

            record.submitFields({
                type: 'salesorder',
                id: recordId,
                values: {
                    'custbody_os_api_sent': true,                           // OS en Syshunter
                    'custbody_os_api_sent_date': new Date(),               // Fecha Envio API
                    'custbody_os_api_failed': false,                       // API Fallo
                    'custbody_os_api_last_attempt': new Date(),            // Ultimo Intento API
                    'custbody_os_api_attempts': 1,                         // Intentos envio
                    'custbody_os_api_last_response': responseText.substring(0, 300), // Ultima Respuesta
                    'memo': apiResult.numeroOS                             // Guardar OS en Memo (lo ultimo que solicitaron)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.audit('Marked as Success', {
                recordId: recordId,
                statusCode: apiResult.statusCode,
                numeroOS: apiResult.numeroOS,
                codigoVehiculo: apiResult.codigoVehiculo,
                response: responseText.substring(0, 100)
            });

        } catch (error) {
            log.error('Error marking as success', {
                recordId: recordId,
                error: error.toString()
            });
        }
    }

    /**
     * markAsFailed
     */
    function markAsFailed(recordId, errorMsg, apiResult) {
        try {
            var currentAttempts = getCurrentAttempts(recordId);

            var errorResponse = 'ERROR: ' + errorMsg;

            if (apiResult) {
                if (apiResult.error) {
                    errorResponse = 'ERROR: ' + apiResult.error;
                } else if (apiResult.errors && apiResult.errors.length > 0) {
                    errorResponse = 'ERRORES: ' + apiResult.errors.join(' | ');
                }

                var additionalInfo = [];
                if (apiResult.numeroOS) {
                    additionalInfo.push('OS: ' + apiResult.numeroOS);
                }
                if (apiResult.codigoVehiculo) {
                    additionalInfo.push('Vehiculo: ' + apiResult.codigoVehiculo);
                }
                if (additionalInfo.length > 0) {
                    errorResponse += ' [' + additionalInfo.join(', ') + ']';
                }
            }

            record.submitFields({
                type: 'salesorder',
                id: recordId,
                values: {
                    'custbody_os_api_sent': false,                         // OS en Syshunter
                    'custbody_os_api_sent_date': null,                     // Fecha Envio API
                    'custbody_os_api_failed': true,                        // API Fallo
                    'custbody_os_api_last_attempt': new Date(),            // Ultimo Intento API
                    'custbody_os_api_attempts': currentAttempts + 1,       // Intentos envio
                    'custbody_os_api_last_response': errorResponse.substring(0, 300) // Ultima Respuesta
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.audit('Marked as Failed', {
                recordId: recordId,
                attempts: currentAttempts + 1,
                error: errorMsg.substring(0, 100),
                apiErrors: apiResult && apiResult.errors ? apiResult.errors.length : 0
            });

        } catch (error) {
            log.error('Error marking as failed', {
                recordId: recordId,
                error: error.toString()
            });
        }
    }

    /**
     * Obtiene el numero actual de intentos para sumarlo
     */
    function getCurrentAttempts(recordId) {
        try {
            var orderRecord = record.load({
                type: 'salesorder',
                id: recordId,
                isDynamic: false
            });
            return parseInt(orderRecord.getValue('custbody_os_api_attempts') || '0');
        } catch (error) {
            log.debug('Error getting attempts', {
                recordId: recordId,
                error: error.toString()
            });
            return 0;
        }
    }

    /**
     * Se ejecuta al finalizar
     */
    function summarize(context) {
        try {
            var processedCount = 0;
            var successCount = 0;
            var errorCount = 0;

            context.reduceSummary.keys.iterator().each(function (key) {
                processedCount++;
                return true;
            });

            context.reduceSummary.errors.iterator().each(function (key, error) {
                errorCount++;
                log.error('Reduce Error Summary', {
                    key: key,
                    error: error
                });
                return true;
            });

            context.mapSummary.errors.iterator().each(function (key, error) {
                errorCount++;
                log.error('Map Error Summary', {
                    key: key,
                    error: error
                });
                return true;
            });

            successCount = processedCount - errorCount;

            log.audit('Map/Reduce Summary', {
                totalProcessed: processedCount,
                successful: successCount,
                errors: errorCount,
                inputSummary: context.inputSummary
            });

        } catch (error) {
            log.error('Error in Summarize', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});