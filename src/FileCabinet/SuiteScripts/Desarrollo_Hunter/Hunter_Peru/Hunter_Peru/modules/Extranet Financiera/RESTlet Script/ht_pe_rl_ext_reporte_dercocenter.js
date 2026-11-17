/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * RESTlet: Reporte DercoCenter
 * Parámetros requeridos:
 *   - fecha_inicio  : 'YYYY-MM-DD'
 *   - fecha_fin     : 'YYYY-MM-DD'
 *   - tipo          : 'FACTURADO A CLIENTE' | 'FACTURADO A DERCOCENTER'
 */
define(['N/query', 'N/log'], (query, log) => {

    function post(body) {
        try {

            const params = (typeof body === 'string') ? JSON.parse(body) : body;

            const fechaInicio = params.fecha_inicio;
            const fechaFin    = params.fecha_fin;
            const tipo        = params.tipo;

            if (!fechaInicio || !fechaFin || !tipo) {
                return {
                    success: false,
                    message: 'Parámetros requeridos: fecha_inicio, fecha_fin, tipo'
                };
            }

            let sql;

            switch (tipo) {

                case 'FACTURADO A CLIENTE':
                    sql = `
SELECT DISTINCT
    TO_CHAR(os.trandate, 'DD-MM-YYYY')                                      AS fecha_os,
    vend.name                                                               AS vendedor,
    c.altname                                                               AS cliente,
    c.vatregnumber                                                          AS dni_ruc,
    direc.addr1                                                             AS direccion,
    mar.name                                                                AS marca,
    mod.name                                                                AS modelo,
    b.custrecord_ht_bien_placa                                              AS placa,
    b.custrecord_ht_bien_motor                                              AS motor,
    b.custrecord_ht_bien_chasis                                             AS chasis,
    b.custrecord_ht_bien_ano                                                AS anio,
    col.name                                                                AS color,
    CASE
        WHEN direc.custrecord_pe_departamento = 'LIMA' THEN 'LIMA'
        ELSE 'PROVINCIA'
    END                                                                     AS provincia,
    lug.name                                                                AS LUGAR_INSTALACION,
    CASE
        WHEN ot.custrecord_ht_ot_estado = '2' THEN 'TRABAJADO'
        WHEN ot.custrecord_ht_ot_estado = '4' THEN 'PROCESO DE TRABAJO'
        WHEN ot.custrecord_ht_ot_estado = '8' THEN 'ENTREGADO'
        WHEN ot.custrecord_ht_ot_estado = '9' THEN 'CERRADO'
        ELSE 'SIN PROGRAMAR'
    END                                                                     AS estado,
    os.tranid                                                               AS orden,
    cob.created                                                             AS fecha_instalacion,
    pre.name                                                                AS PRE_ORDEN,
    (
        SELECT TOP 1 (firstname || ' ' || lastname)
        FROM employee
        WHERE id = os.custbody_ht_os_ejecutiva_backoffice
    )                                                                       AS ejecutiva,
    pro.displayname                                                         AS producto,
    estf.name                                                               AS FACTURACION,
    fact.fullname                                                           AS FACTURAR_A,
    TO_CHAR(ROUND(
        NVL(items_data.precio_1, 0) +
        NVL(items_data.precio_2, 0) +
        NVL(items_data.precio_3, 0), 2
    ))                                                                      AS precio_os,
    b.custrecord_ht_bien_codsysh                                            AS codigo_vehiculo,
    CASE
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) = 190.99
            THEN 'CONSIDERAR'
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 249 AND 251
            THEN 'CONSIDERAR'
        ELSE 'NO CONSIDERAR'
    END                                                                     AS precio_convenio_considerados,
    CASE
        WHEN os.custbody_estado_facturacion_os <> 3 THEN
            CASE
                WHEN pro.itemid IN ('PE-7270','PE-6828') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 250.01 THEN '67.80'
                WHEN pro.itemid IN ('PE-7270','PE-6828') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  250.01 THEN '0'
                WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 420.00 THEN '84.75'
                WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  420.00 THEN '0'
                WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 500.00 THEN '93.22'
                WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  500.00 THEN '0'
                WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 660.00 THEN '118.64'
                WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  660.00 THEN '0'
                WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 820.01 THEN '144.07'
                WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  820.01 THEN '0'
                WHEN pro.itemid IN ('PE-7293')           AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 211.86 THEN '50'
                WHEN pro.itemid IN ('PE-7293')           AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  211.86 THEN '0'
                WHEN pro.itemid IN ('PE-7303')           AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 360.17 THEN '70.99'
                WHEN pro.itemid IN ('PE-7303')           AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  360.17 THEN '0'
                WHEN pro.itemid IN ('PE-6874','PE-6859') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 250.00 THEN '67.80'
                ELSE '0'
            END
        ELSE '0.00'
    END                                                                     AS importe_comision
FROM transaction os
LEFT JOIN customrecord_ht_record_ordentrabajo ot
    ON ot.custrecord_ht_ot_orden_servicio = os.id
LEFT JOIN customrecord_ht_record_bienes b
    ON os.custbody_ht_so_bien = b.id
LEFT JOIN customrecord_ht_record_tipovehiculo tip
    ON tip.id = b.custrecord_ht_bien_tipo
LEFT JOIN customrecord_ht_bn_modelo mod
    ON mod.id = b.custrecord_ht_bien_modelo
LEFT JOIN customrecord_ht_bien_marca mar
    ON mar.id = b.custrecord_ht_bien_marca
LEFT JOIN customrecord_ht_bn_colorcarseg col
    ON col.id = b.custrecord_ht_bien_colorcarseg
LEFT JOIN item pro
    ON pro.id = ot.custrecord_ht_ot_item
LEFT JOIN customrecord_ht_co_cobertura cob
    ON cob.custrecord_ht_co_bien = b.id
LEFT JOIN customrecord_ht_record_canaldistribucion conc
    ON conc.id = b.custrecord_ht_bien_consesionarios
LEFT JOIN customrecord_ht_record_canaldistribucion fina
    ON fina.id = b.custrecord_ht_bien_financiadovehiculo
LEFT JOIN customrecord_ht_record_canaldistribucion ase
    ON ase.id = b.custrecord_ht_bien_companiaseguros
LEFT JOIN customrecord_ht_record_canaldistribucion bro
    ON bro.id = b.custrecord_pe_broker
LEFT JOIN customer c
    ON c.id = os.entity
LEFT JOIN CUSTOMRECORD_PE_HT_OS_VENDEDOR vend
    ON vend.recordid = os.custbody_ht_pe_os_vendedor
LEFT JOIN entityaddress direc
    ON direc.recordowner = c.defaultbillingaddress
    AND direc.country = 'PE'
LEFT JOIN CUSTOMRECORD_HT_OS_LUGAR_INSTALACION lug
    ON lug.id = os.custbody_pe_ht_lugar_instalacion
LEFT JOIN CUSTOMER fact
    ON fact.id = os.custbody_ht_facturar_a
LEFT JOIN CUSTOMLIST_ESTADO_FACTURACION_OS estf
    ON estf.id = os.custbody_estado_facturacion_os
LEFT JOIN CUSTOMRECORD_HT_PE_PREORDENES pre
    ON pre.id = os.custbody_ht_pe_os_preorden
LEFT JOIN (
    SELECT
        transaction,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_item
            WHEN servicio_item    IS NOT NULL THEN servicio_item
            WHEN accesorio_item   IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_1,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_precio
            WHEN servicio_item    IS NOT NULL THEN servicio_precio
            WHEN accesorio_item   IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_1,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_plazo
            WHEN servicio_item    IS NOT NULL THEN servicio_plazo
            WHEN accesorio_item   IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_1,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_item
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_precio
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_plazo
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_3,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_3,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_3
    FROM (
        SELECT
            main_lines.transaction,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS dispositivo_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS dispositivo_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS dispositivo_plazo,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS servicio_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS servicio_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS servicio_plazo,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS accesorio_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS accesorio_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS accesorio_plazo
        FROM (
            SELECT
                tl.estgrossprofit,
                tl.netamount,
                tl.transaction,
                tl.custcol_ht_os_tipoarticulo,
                tl.foreignamount,
                tl.custcol_ht_os_tiempo_cobertura,
                i.itemid,
                i.displayname
            FROM transactionline tl
            INNER JOIN item i ON i.id = tl.item
            WHERE tl.item IS NOT NULL
            AND tl.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Servicio', 'Artículo no inventariable')
            AND (tl.assemblycomponent IS NULL OR tl.assemblycomponent != 'T')
            AND tl.donotprintline = 'F'
        ) main_lines
        LEFT JOIN (
            SELECT
                transaction,
                MAX(NVL(ratepercent, 0.18)) AS tax_rate
            FROM transactionline
            WHERE itemtype = 'TaxItem'
            GROUP BY transaction
        ) tax_data ON tax_data.transaction = main_lines.transaction
        GROUP BY main_lines.transaction
    ) items_grouped
) items_data ON items_data.transaction = os.id

WHERE os.type                                      = 'SalesOrd'
    AND os.custbody_ts_ec_subsidiaria_pais         = 174
    AND conc.custrecord_ht_cd_ruccanaldistribucion = '20548527113'
    AND os.trandate BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    AND (
        CASE
            WHEN pro.itemid IN ('PE-7270','PE-6828') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 250.01 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-6828'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  250.01 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7270'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  250.01 THEN 'NO CONSIDERAR'
            WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 420.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  420.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 500.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  500.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 660.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  660.00 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 820.01 THEN 'CONSIDERAR'
            WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  820.01 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7293'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 211.86 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7293'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  211.86 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7303'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 360.17 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7303'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  360.17 THEN 'CONSIDERAR'
            WHEN pro.itemid =  'PE-7270'             AND os.tranid = '1101962159'                                                                          THEN 'NO CONSIDERAR'
            WHEN pro.itemid IN ('PE-6874','PE-6859') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 250.00 THEN 'CONSIDERAR'
            ELSE 'NO CONSIDERAR'
        END
    ) = 'CONSIDERAR'
    AND os.custbody_ht_facturar_a <> '38200'
    AND pro.itemid IN (
        'PE-7270','PE-6874','PE-7323','PE-7325',
        'PE-7326','PE-7352','PE-6828','PE-7072',
        'PE-7073','PE-7074','PE-7075','PE-7293','PE-7303'
    )

UNION ALL

SELECT DISTINCT
    TO_CHAR(os.trandate, 'DD-MM-YYYY')                                      AS fecha_os,
    vend.name                                                               AS vendedor,
    c.altname                                                               AS cliente,
    c.vatregnumber                                                          AS dni_ruc,
    direc.addr1                                                             AS direccion,
    mar.name                                                                AS marca,
    mod.name                                                                AS modelo,
    b.custrecord_ht_bien_placa                                              AS placa,
    b.custrecord_ht_bien_motor                                              AS motor,
    b.custrecord_ht_bien_chasis                                             AS chasis,
    b.custrecord_ht_bien_ano                                                AS anio,
    col.name                                                                AS color,
    CASE
        WHEN direc.custrecord_pe_departamento = 'LIMA' THEN 'LIMA'
        ELSE 'PROVINCIA'
    END                                                                     AS provincia,
    lug.name                                                                AS LUGAR_INSTALACION,
    CASE
        WHEN ot.custrecord_ht_ot_estado = '2' THEN 'TRABAJADO'
        WHEN ot.custrecord_ht_ot_estado = '4' THEN 'PROCESO DE TRABAJO'
        WHEN ot.custrecord_ht_ot_estado = '8' THEN 'ENTREGADO'
        WHEN ot.custrecord_ht_ot_estado = '9' THEN 'CERRADO'
        ELSE 'SIN PROGRAMAR'
    END                                                                     AS estado,
    os.tranid                                                               AS orden,
    cob.created                                                             AS fecha_instalacion,
    pre.name                                                                AS PRE_ORDEN,
    (
        SELECT TOP 1 (firstname || ' ' || lastname)
        FROM employee
        WHERE id = os.custbody_ht_os_ejecutiva_backoffice
    )                                                                       AS ejecutiva,
    pro.displayname                                                         AS producto,
    estf.name                                                               AS FACTURACION,
    fact.fullname                                                           AS FACTURAR_A,
    TO_CHAR(ROUND(
        NVL(items_data.precio_1, 0) +
        NVL(items_data.precio_2, 0) +
        NVL(items_data.precio_3, 0), 2
    ))                                                                      AS precio_os,
    b.custrecord_ht_bien_codsysh                                            AS codigo_vehiculo,
    CASE
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) = 190.99
            THEN 'CONSIDERAR'
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 249 AND 251
            THEN 'CONSIDERAR'
        ELSE 'NO CONSIDERAR'
    END                                                                     AS precio_convenio_considerados,
    CASE
        WHEN os.custbody_estado_facturacion_os <> 3 THEN
            CASE
                WHEN os.memo IN ('1101915673','1101915674','1101915676','1101915677','1101915679','1101915680') THEN ' '
                WHEN os.tranid = '1101923145' THEN '90'
                WHEN pro.itemid IN ('PE-7270','PE-6828') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 211.87 THEN '67.80'
                WHEN pro.itemid IN ('PE-7270','PE-6828') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  250.01 THEN '0'
                WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 355.94 THEN '84.75'
                WHEN pro.itemid IN ('PE-7323','PE-7072') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  420.00 THEN '0'
                WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 423.73 THEN '93.22'
                WHEN pro.itemid IN ('PE-7325','PE-7073') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  500.00 THEN '0'
                WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 559.32 THEN '118.64'
                WHEN pro.itemid IN ('PE-7326','PE-7074') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  660.00 THEN '0'
                WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 694.92 THEN '144.07'
                WHEN pro.itemid IN ('PE-7352','PE-7075') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  820.01 THEN '0'
                WHEN pro.itemid =  'PE-7293'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 211.86 THEN '50'
                WHEN pro.itemid =  'PE-7293'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  211.86 THEN '0'
                WHEN pro.itemid =  'PE-7303'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 360.17 THEN '70.99'
                WHEN pro.itemid =  'PE-7303'             AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) <  360.17 THEN '0'
                WHEN pro.itemid IN ('PE-6874','PE-6859') AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 250.00 THEN '67.80'
                ELSE '0'
            END
        ELSE '0.00'
    END                                                                     AS importe_comision
FROM transaction os
LEFT JOIN customrecord_ht_record_ordentrabajo ot
    ON ot.custrecord_ht_ot_orden_servicio = os.id
LEFT JOIN customrecord_ht_record_bienes b
    ON os.custbody_ht_so_bien = b.id
LEFT JOIN customrecord_ht_record_tipovehiculo tip
    ON tip.id = b.custrecord_ht_bien_tipo
LEFT JOIN customrecord_ht_bn_modelo mod
    ON mod.id = b.custrecord_ht_bien_modelo
LEFT JOIN customrecord_ht_bien_marca mar
    ON mar.id = b.custrecord_ht_bien_marca
LEFT JOIN customrecord_ht_bn_colorcarseg col
    ON col.id = b.custrecord_ht_bien_colorcarseg
LEFT JOIN item pro
    ON pro.id = ot.custrecord_ht_ot_item
LEFT JOIN customrecord_ht_co_cobertura cob
    ON cob.custrecord_ht_co_bien = b.id
LEFT JOIN customrecord_ht_record_canaldistribucion conc
    ON conc.id = b.custrecord_ht_bien_consesionarios
LEFT JOIN customrecord_ht_record_canaldistribucion fina
    ON fina.id = b.custrecord_ht_bien_financiadovehiculo
LEFT JOIN customrecord_ht_record_canaldistribucion ase
    ON ase.id = b.custrecord_ht_bien_companiaseguros
LEFT JOIN customrecord_ht_record_canaldistribucion bro
    ON bro.id = b.custrecord_pe_broker
LEFT JOIN customer c
    ON c.id = os.entity
LEFT JOIN CUSTOMRECORD_PE_HT_OS_VENDEDOR vend
    ON vend.recordid = os.custbody_ht_pe_os_vendedor
LEFT JOIN entityaddress direc
    ON direc.recordowner = c.defaultbillingaddress
    AND direc.country = 'PE'
LEFT JOIN CUSTOMRECORD_HT_OS_LUGAR_INSTALACION lug
    ON lug.id = os.custbody_pe_ht_lugar_instalacion
LEFT JOIN CUSTOMER fact
    ON fact.id = os.custbody_ht_facturar_a
LEFT JOIN CUSTOMLIST_ESTADO_FACTURACION_OS estf
    ON estf.id = os.custbody_estado_facturacion_os
LEFT JOIN CUSTOMRECORD_HT_PE_PREORDENES pre
    ON pre.id = os.custbody_ht_pe_os_preorden
LEFT JOIN (
    SELECT
        transaction,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_item
            WHEN servicio_item    IS NOT NULL THEN servicio_item
            WHEN accesorio_item   IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_1,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_precio
            WHEN servicio_item    IS NOT NULL THEN servicio_precio
            WHEN accesorio_item   IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_1,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_plazo
            WHEN servicio_item    IS NOT NULL THEN servicio_plazo
            WHEN accesorio_item   IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_1,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_item
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_precio
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_plazo
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_item
            ELSE ''
        END AS item_3,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_3,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_plazo
            ELSE ''
        END AS plazo_3
    FROM (
        SELECT
            main_lines.transaction,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS dispositivo_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS dispositivo_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS dispositivo_plazo,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS servicio_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS servicio_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio'
                OR   UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS servicio_plazo,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    CASE
                        WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1)
                        ELSE main_lines.itemid
                    END
            END) AS accesorio_item,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18))
            END) AS accesorio_precio,
            MAX(CASE
                WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable')
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%'
                AND  UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%'
                AND  main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN
                    NVL(main_lines.custcol_ht_os_tiempo_cobertura, '')
            END) AS accesorio_plazo
        FROM (
            SELECT
                tl.estgrossprofit,
                tl.netamount,
                tl.transaction,
                tl.custcol_ht_os_tipoarticulo,
                tl.foreignamount,
                tl.custcol_ht_os_tiempo_cobertura,
                i.itemid,
                i.displayname
            FROM transactionline tl
            INNER JOIN item i ON i.id = tl.item
            WHERE tl.item IS NOT NULL
            AND tl.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Servicio', 'Artículo no inventariable')
            AND (tl.assemblycomponent IS NULL OR tl.assemblycomponent != 'T')
            AND tl.donotprintline = 'F'
        ) main_lines
        LEFT JOIN (
            SELECT
                transaction,
                MAX(NVL(ratepercent, 0.18)) AS tax_rate
            FROM transactionline
            WHERE itemtype = 'TaxItem'
            GROUP BY transaction
        ) tax_data ON tax_data.transaction = main_lines.transaction
        GROUP BY main_lines.transaction
    ) items_grouped
) items_data ON items_data.transaction = os.id

WHERE os.type                                      = 'SalesOrd'
    AND os.custbody_ts_ec_subsidiaria_pais         = 174
    AND conc.custrecord_ht_cd_ruccanaldistribucion = '20548527113'
    AND os.trandate BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    AND (
        CASE
            WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) = 190.99
                THEN 'CONSIDERAR'
            WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) >= 194.90
                THEN 'CONSIDERAR'
            WHEN os.currency = '5' AND pro.itemid = 'PE-7352'
                 AND ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 3371 AND 3372
                THEN 'CONSIDERAR'
            WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 247 AND 490
                THEN 'CONSIDERAR'
            ELSE 'NO CONSIDERAR'
        END
    ) = 'CONSIDERAR'
    AND os.custbody_ht_facturar_a <> '38200'
    AND os.memo IN ('1101757980','1101758139','1101758475','1101755124','1101809390','1101815357','1101861487','1101863944','1101866635','1101874756','1101886558','1101886571','1101894557','1101894072',
'1101899240','1101907142','1101911331','1101917216','1101915673','1101915674','1101915676','1101915677','1101915679','1101915680','1101915673','1101915674','1101915676','1101915677','1101915679','1101915680',
'1101923145','1101927750','1101929951','1101933565','1101940679','1101940645','1101947789','1101947791','1101950537','1101952308','1101953512','1101956785','1101956986','1101961097','1101964478','1101963009',
'1101963010','1101969455','1101971349','1101972304','1101978030','1101986530','1101985257','1101986530','1101985257','1101988545','1101989284','1101991208','1101989196','1101994421','1102049607','1102059117',
'1102059921','1102064856','1102069129','1102087253','1102085551','1102088803','1102089450','1102093636','1102096870','1102102703','1102102733','1102106432','1102107096','1102107096','1102107097','1102108008',
'1102108014','1102108019','1102108021','1102108194','1102112439','1102123407','1102123443','1102124969','1102125319','1102125367','1102148213','1102148211','1102148212','1102148213','1102148212','1102148211',
'1102174551','1102179253','1102180522','1102185436','1102185431','1102186541','1102188131','1102188678','1102190252','1102191254','1102191240','1102191247','1102191249','1102198457','1102197989','1102198103',
'1102208297','1102209406','1102213050','1102215158','1102218297','1102218833','1102220588','1102221769','1102236656','1102236672','1102238581','1102243269','1102243865','1102262322','1102262927','1102267803'
)
`;
                    break;

                case 'FACTURADO A DERCOCENTER':
                    sql = `
SELECT DISTINCT
    TO_CHAR(os.trandate, 'DD-MM-YYYY')                                      AS fecha_os,
    vend.name                                                               AS vendedor,
    c.altname                                                               AS cliente,
    c.vatregnumber                                                          AS dni_ruc,
    direc.addr1                                                             AS direccion,
    mar.name                                                                AS marca,
    mod.name                                                                AS modelo,
    b.custrecord_ht_bien_placa                                              AS placa,
    b.custrecord_ht_bien_motor                                              AS motor,
    b.custrecord_ht_bien_chasis                                             AS chasis,
    b.custrecord_ht_bien_ano                                                AS anio,
    col.name                                                                AS color,
    CASE
        WHEN direc.custrecord_pe_departamento = 'LIMA' THEN 'LIMA'
        ELSE 'PROVINCIA'
    END                                                                     AS provincia,
    lug.name                                                                AS lugar_instalacion,
    CASE
        WHEN ot.custrecord_ht_ot_estado = '2' THEN 'TRABAJADO'
        WHEN ot.custrecord_ht_ot_estado = '4' THEN 'PROCESO DE TRABAJO'
        WHEN ot.custrecord_ht_ot_estado = '8' THEN 'ENTREGADO'
        WHEN ot.custrecord_ht_ot_estado = '9' THEN 'CERRADO'
        ELSE 'SIN PROGRAMAR'
    END                                                                     AS estado,
    os.tranid                                                               AS orden,
    cob.created                                                             AS fecha_instalacion,
    pre.name                                                                AS pre_orden,
    (
        SELECT TOP 1 (firstname || ' ' || lastname)
        FROM employee
        WHERE id = os.custbody_ht_os_ejecutiva_backoffice
    )                                                                       AS ejecutiva,
    pro.displayname                                                         AS producto,
    estf.name                                                               AS facturacion,
    fact.fullname                                                           AS facturar_a,
    TO_CHAR(ROUND(
        NVL(items_data.precio_1, 0) +
        NVL(items_data.precio_2, 0) +
        NVL(items_data.precio_3, 0), 2
    ))                                                                      AS precio_os,
    b.custrecord_ht_bien_codsysh                                            AS codigo_vehiculo,
    CASE
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) = 190.99
            THEN 'CONSIDERAR'
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 249 AND 251
            THEN 'CONSIDERAR'
        ELSE 'NO CONSIDERAR'
    END                                                                     AS precio_convenio_considerados,
    '0.00' as importe_comision
FROM transaction os
LEFT JOIN transactionline d_os
    ON d_os.transaction = os.id
LEFT JOIN customrecord_ht_record_ordentrabajo ot
    ON ot.custrecord_ht_ot_orden_servicio = os.id
LEFT JOIN customrecord_ht_record_bienes b
    ON os.custbody_ht_so_bien = b.id
LEFT JOIN customrecord_ht_record_tipovehiculo tip
    ON tip.id = b.custrecord_ht_bien_tipo
LEFT JOIN customrecord_ht_bn_modelo mod
    ON mod.id = b.custrecord_ht_bien_modelo
LEFT JOIN customrecord_ht_bien_marca mar
    ON mar.id = b.custrecord_ht_bien_marca
LEFT JOIN customrecord_ht_bn_colorcarseg col
    ON col.id = b.custrecord_ht_bien_colorcarseg
LEFT JOIN item pro
    ON pro.id = ot.custrecord_ht_ot_item
LEFT JOIN customrecord_ht_co_cobertura cob
    ON cob.custrecord_ht_co_bien = b.id
LEFT JOIN customrecord_ht_record_canaldistribucion conc
    ON conc.id = b.custrecord_ht_bien_consesionarios
LEFT JOIN customrecord_ht_record_canaldistribucion fina
    ON fina.id = b.custrecord_ht_bien_financiadovehiculo
LEFT JOIN customrecord_ht_record_canaldistribucion ase
    ON ase.id = b.custrecord_ht_bien_companiaseguros
LEFT JOIN customrecord_ht_record_canaldistribucion bro
    ON bro.id = b.custrecord_pe_broker
LEFT JOIN customer c
    ON c.id = os.entity
LEFT JOIN CUSTOMRECORD_PE_HT_OS_VENDEDOR vend
    ON vend.recordid = os.custbody_ht_pe_os_vendedor
LEFT JOIN entityaddress direc
    ON direc.recordowner = c.defaultbillingaddress
    AND direc.country = 'PE'
LEFT JOIN CUSTOMRECORD_HT_OS_LUGAR_INSTALACION lug
    ON lug.id = os.custbody_pe_ht_lugar_instalacion
LEFT JOIN CUSTOMER fact
    ON fact.id = os.custbody_ht_facturar_a
LEFT JOIN CUSTOMLIST_ESTADO_FACTURACION_OS estf
    ON estf.id = os.custbody_estado_facturacion_os
LEFT JOIN CUSTOMRECORD_HT_PE_PREORDENES pre
    ON pre.id = os.custbody_ht_pe_os_preorden
LEFT JOIN (
    SELECT
        transaction,
        CASE
            WHEN dispositivo_item IS NOT NULL THEN dispositivo_precio
            WHEN servicio_item    IS NOT NULL THEN servicio_precio
            WHEN accesorio_item   IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_1,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item  IS NOT NULL THEN servicio_precio
            WHEN dispositivo_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            WHEN dispositivo_item IS NULL     AND servicio_item  IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_2,
        CASE
            WHEN dispositivo_item IS NOT NULL AND servicio_item IS NOT NULL AND accesorio_item IS NOT NULL THEN accesorio_precio
            ELSE 0
        END AS precio_3
    FROM (
        SELECT
            main_lines.transaction,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') AND UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN CASE WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1) ELSE main_lines.itemid END END) AS dispositivo_item,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') AND UPPER(NVL(main_lines.displayname, '')) LIKE '%(DISPOSITIVO%' THEN TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18)) END) AS dispositivo_precio,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio' OR UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN CASE WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1) ELSE main_lines.itemid END END) AS servicio_item,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo = 'Servicio' OR UPPER(NVL(main_lines.displayname, '')) LIKE '%(SERVICIO%' THEN TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18)) END) AS servicio_precio,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%' AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%' AND main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN CASE WHEN INSTR(main_lines.itemid, '-') > 0 THEN SUBSTR(main_lines.itemid, INSTR(main_lines.itemid, '-') + 1) ELSE main_lines.itemid END END) AS accesorio_item,
            MAX(CASE WHEN main_lines.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable') AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(DISPOSITIVO%' AND UPPER(NVL(main_lines.displayname, '')) NOT LIKE '%(SERVICIO%' AND main_lines.custcol_ht_os_tipoarticulo != 'Servicio' THEN TO_NUMBER(REPLACE(NVL(main_lines.netamount, '0'), '-', '')) * (1 + NVL(tax_data.tax_rate, 0.18)) END) AS accesorio_precio
        FROM (
            SELECT tl.netamount, tl.transaction, tl.custcol_ht_os_tipoarticulo, tl.custcol_ht_os_tiempo_cobertura, i.itemid, i.displayname
            FROM transactionline tl
            INNER JOIN item i ON i.id = tl.item
            WHERE tl.item IS NOT NULL
            AND tl.custcol_ht_os_tipoarticulo IN ('Ensamblaje', 'Artículo de inventario', 'Servicio', 'Artículo no inventariable')
            AND (tl.assemblycomponent IS NULL OR tl.assemblycomponent != 'T')
            AND tl.donotprintline = 'F'
        ) main_lines
        LEFT JOIN (
            SELECT transaction, MAX(NVL(ratepercent, 0.18)) AS tax_rate
            FROM transactionline WHERE itemtype = 'TaxItem' GROUP BY transaction
        ) tax_data ON tax_data.transaction = main_lines.transaction
        GROUP BY main_lines.transaction
    ) items_grouped
) items_data ON items_data.transaction = os.id
WHERE os.type                                      = 'SalesOrd'
    AND os.custbody_ts_ec_subsidiaria_pais         = 174
    AND conc.custrecord_ht_cd_ruccanaldistribucion = '20548527113'
    AND os.trandate BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
    AND os.custbody_ht_facturar_a = '38200'
    AND pro.itemid IN ('PE-7270','PE-6874','PE-6828')
    AND (
    CASE
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) = 190.99
            THEN 'CONSIDERAR'
        WHEN ROUND(NVL(items_data.precio_1,0) + NVL(items_data.precio_2,0) + NVL(items_data.precio_3,0), 2) BETWEEN 249 AND 251
            THEN 'CONSIDERAR'
        ELSE 'NO CONSIDERAR'
    END
) = 'CONSIDERAR'
`;
                    break;

                default:
                    return { success: false, message: "tipo inválido. Use: 'FACTURADO A CLIENTE' o 'FACTURADO A DERCOCENTER'" };
            }

            const paramList = tipo === 'FACTURADO A CLIENTE'
    ? [fechaInicio, fechaFin, fechaInicio, fechaFin]
    : [fechaInicio, fechaFin];

log.debug('Tipo', tipo);
log.debug('SQL Ejecutado', sql);
log.debug('Params', JSON.stringify(paramList));

const pagedData = query.runSuiteQLPaged({
    query    : sql,
    params   : paramList,
    pageSize : 1000
});

            let data = [];
            pagedData.iterator().each(function (page) {
                const results = page.value.data.asMappedResults();
                data = data.concat(results);
                return true;
            });

            return { data: data };

        } catch (e) {
            log.error('Error RESTlet', e);
            return {
                success: false,
                message: e.message
            };
        }
    }

    return { post };
});