/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/query', 'N/log', 'N/file', 'N/encode'],
    function (serverWidget, query, log, file, encode) {

        function onRequest(context) {
            if (context.request.method === 'GET') {
                try {
                    // Crear formulario
                    const form = serverWidget.createForm({
                        title: 'B262 COM.GYE SMART',
                        hideNavBar: false
                    });

                    // Botón para consulta Dispositivo
                    form.addButton({
                        id: 'btn_export',
                        label: 'Exportar Detalle',
                        functionName: 'exportSegunSubtab()'
                    });

                    form.addButton({
                        id: 'btn_email',
                        label: 'Enviar por Correo',
                        functionName: 'exportSegunSubtab2()'
                    });

                  
                    form.clientScriptModulePath = './Portlet/CS_ExportXLS.js';

                    const resultadosDispositivo = _executeQuery(`
                        SELECT
                            Item.description AS DESCRIPCION,
                            ItemBinQuantity.bin AS Deposito,
                            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
                            BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
                            CASE 
                                WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) = '005 - DISPONIBLE' THEN '005 - DISPONIBLE'
                                ELSE '009 - RESERVADO'
                            END AS Estado_Actual,
                            COUNT(*) AS Cantidad
                        FROM ItemBinQuantity
                        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
                        INNER JOIN InventoryBalance ON InventoryBalance.item = Item.id
                            AND InventoryBalance.binnumber = ItemBinQuantity.bin
                        INNER JOIN CustomRecord_HT_Record_DetalleChaserDisp AS HtDispositivo
                            ON HtDispositivo.name = BUILTIN.DF(InventoryBalance.inventorynumber)
                        WHERE ItemBinQuantity.bin = '654'
                          AND ItemBinQuantity.onhand > 0
                          AND Item.itemtype = 'InvtPart'
                        GROUP BY
                            Item.description,
                            ItemBinQuantity.bin,
                            BUILTIN.DF(ItemBinQuantity.bin),  
                            BUILTIN.DF(ItemBinQuantity.Item),
                            CASE 
                                WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) = '005 - DISPONIBLE' THEN '005 - DISPONIBLE'
                                ELSE '009 - RESERVADO'
                            END
                        ORDER BY 
                            ItemBinQuantity.bin,
                            Item.description;
                    `);

                    const resultadosSim = _executeQuery(`
                        SELECT 
                            ItemBinQuantity.bin AS Deposito,
                            BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
                            BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
                            Item.description AS Descripcion,
                            CASE 
                                WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) = 'DISPONIBLE' THEN 'DISPONIBLE'
                                ELSE 'RESERVADO'
                            END AS Estado_Actual,
                            COUNT(*) AS Cantidad
                        FROM ItemBinQuantity
                        INNER JOIN Item ON Item.id = ItemBinQuantity.Item
                        INNER JOIN InventoryBalance ON InventoryBalance.item = Item.id
                            AND InventoryBalance.binnumber = ItemBinQuantity.bin
                        INNER JOIN CustomRecord_HT_Record_DetalleChaserSim AS HtDispositivo
                            ON HtDispositivo.name = BUILTIN.DF(InventoryBalance.inventorynumber)
                        WHERE ItemBinQuantity.bin = 654
                          AND Item.id = 43868
                          AND ItemBinQuantity.onhand > 0
                          AND Item.itemtype = 'InvtPart'
                          AND HtDispositivo.isinactive = 'F'
                          AND custrecord_ht_ds_serie IS NOT NULL
                        GROUP BY 
                            ItemBinQuantity.bin,
                            BUILTIN.DF(ItemBinQuantity.bin),
                            BUILTIN.DF(ItemBinQuantity.Item),
                            Item.description,
                            CASE 
                                WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) = 'DISPONIBLE' THEN 'DISPONIBLE'
                                ELSE 'RESERVADO'
                            END
                        ORDER BY 
                            ItemBinQuantity.bin,
                            Item.description,
                            Estado_Actual;
                    `);

                    const sublistDisp = form.addSublist({
                        id: 'sublist_disp',
                        type: serverWidget.SublistType.LIST,
                        label: 'Resultados Dispositivo'
                    });
                    _definirColumnas(sublistDisp);
                    _agregarResultados(sublistDisp, resultadosDispositivo);

                    const sublistSim = form.addSublist({
                        id: 'sublist_sim',
                        type: serverWidget.SublistType.LIST,
                        label: 'Resultados SIM'
                    });
                    _definirColumnas(sublistSim);
                    _agregarResultados(sublistSim, resultadosSim);

                    context.response.writePage(form);

                } catch (error) {
                    log.error({ title: 'Error Suitelet', details: error });
                    context.response.write('Error al cargar datos: ' + error.message);
                }
            }

            // POST: manejar exportación de XLS
            if (context.request.method === 'POST') {
                const tipo = context.request.parameters.tipo;
                let resultados = [];

                if (tipo === 'dispositivo') {
                    resultados = _executeQuery(`SELECT 
                                                BUILTIN.DF(inventorybalance.inventorynumber) AS DISPOSITIVO,
                                                BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS ESTADO,
                                                CASE 
                                                    WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) = '005 - DISPONIBLE' 
                                                    THEN '' 
                                                    ELSE TO_CHAR(HtDispositivo.lastmodified, 'YYYY-MM-DD HH24:MI:SS') 
                                                END AS FECHA
                                            FROM ItemBinQuantity
                                            INNER JOIN Item 
                                                ON Item.id = ItemBinQuantity.Item
                                            INNER JOIN inventorybalance 
                                                ON inventorybalance.item = Item.id 
                                               AND inventorybalance.binnumber = ItemBinQuantity.bin
                                            INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
                                                ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
                                            WHERE ItemBinQuantity.bin = '654'
                                              AND Item.id = '22059'
                                              AND ItemBinQuantity.OnHand > 0
                                              AND Item.itemtype = 'InvtPart'
                                            ORDER BY DISPOSITIVO ASC;

                `);
                } else if (tipo === 'sim') {
                    resultados = _executeQuery(`SELECT 
                                                    BUILTIN.DF(InventoryBalance.inventorynumber) AS SERIE,
                                                    BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) AS ESTADO,
                                                    CASE 
                                                        WHEN BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) = 'DISPONIBLE' 
                                                             THEN '' 
                                                        ELSE TO_CHAR(MAX(HtDispositivo.lastmodified), 'YYYY-MM-DD HH24:MI:SS')
                                                    END AS FECHA
                                                FROM ItemBinQuantity
                                                INNER JOIN Item 
                                                       ON Item.id = ItemBinQuantity.Item
                                                INNER JOIN InventoryBalance 
                                                       ON InventoryBalance.item = Item.id
                                                      AND InventoryBalance.binnumber = ItemBinQuantity.bin
                                                INNER JOIN CustomRecord_HT_Record_DetalleChaserSim AS HtDispositivo
                                                       ON HtDispositivo.name = BUILTIN.DF(InventoryBalance.inventorynumber)
                                                WHERE ItemBinQuantity.bin = 654
                                                  AND Item.id = 43868
                                                  AND ItemBinQuantity.onhand > 0
                                                  AND Item.itemtype = 'InvtPart'
                                                  AND HtDispositivo.isinactive = 'F'
                                                  AND custrecord_ht_ds_serie IS NOT NULL
                                                GROUP BY 
                                                    --ItemBinQuantity.bin,
                                                    --BUILTIN.DF(ItemBinQuantity.bin),
                                                    --Item.description,
                                                    BUILTIN.DF(InventoryBalance.inventorynumber),
                                                    BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado)
                                                ORDER BY 
                                                    Item.id;
                `,);
                }

                const csvContent = convertToExcelXML(resultados);
                const fileObj = file.create({
                    name: `Resultado_Detallado_${tipo}_${fechaSistemaLog()}.xls`,
                    fileType: file.Type.XMLDOC,      // Usamos XMLDOC para este contenido
                    contents: csvContent
                });

                context.response.writeFile({
                    file: fileObj,
                    isInline: false
                });
            }
        }

        function _definirColumnas(sublist) {
            sublist.addField({ id: 'deposito', type: serverWidget.FieldType.TEXT, label: 'Depósito' });
            sublist.addField({ id: 'itemname', type: serverWidget.FieldType.TEXT, label: 'Item' });
            sublist.addField({ id: 'descripcion', type: serverWidget.FieldType.TEXT, label: 'Descripción' });
            sublist.addField({ id: 'estado_actual', type: serverWidget.FieldType.TEXT, label: 'Estado Actual' });
            sublist.addField({ id: 'cantidad', type: serverWidget.FieldType.INTEGER, label: 'Cantidad' });
        }

        function _executeQuery(sqlQuery) {
            try {
                const resultSet = query.runSuiteQL({ query: sqlQuery });
                const results = resultSet.asMappedResults();
                return results.map(obj => {
                    return Object.fromEntries(
                        Object.entries(obj).map(([key, value]) => [
                            key.toLowerCase(),
                            value === null ? '' : value.toString().replace(/\n/g, ' ')
                        ])
                    );
                });
            } catch (error) {
                log.error('Error en _executeQuery', error);
                return [];
            }
        }

        function _agregarResultados(sublist, resultados) {
            if (!resultados || resultados.length === 0) return;
            resultados.forEach((row, i) => {
                sublist.setSublistValue({ id: 'deposito', line: i, value: row.nombre_deposito });
                sublist.setSublistValue({ id: 'itemname', line: i, value: row.itemname });
                sublist.setSublistValue({ id: 'descripcion', line: i, value: row.descripcion });
                sublist.setSublistValue({ id: 'estado_actual', line: i, value: row.estado_actual || '' });
                sublist.setSublistValue({ id: 'cantidad', line: i, value: row.cantidad.toString() });
            });
        }


        function convertToExcelXML(data) {
            if (!data || data.length === 0) return '';

            const headers = Object.keys(data[0]);

            let rowsXML = '';

            // Encabezados
            rowsXML += '<Row>';
            headers.forEach(header => {
                rowsXML += `<Cell><Data ss:Type="String">${escapeXML(header.toUpperCase())}</Data></Cell>`;
            });
            rowsXML += '</Row>';


            // Datos
            data.forEach(row => {
                rowsXML += '<Row>';
                headers.forEach(header => {
                    const value = row[header] != null ? row[header] : '';
                    rowsXML += `<Cell><Data ss:Type="String">${escapeXML(value.toString())}</Data></Cell>`;
                });
                rowsXML += '</Row>';
            });

            // Plantilla completa Excel XML
            return `<?xml version="1.0"?>
                <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:html="http://www.w3.org/TR/REC-html40">
                <Worksheet ss:Name="Resultado">
                <Table>
                ${rowsXML}
                </Table>
                </Worksheet>
                </Workbook>`;
        }

        function escapeXML(value) {
            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        const fechaSistemaLog = () => {
            let date = new Date();
            let tdate = date.getDate();
            tdate = tdate < 10 ? `0${tdate}` : tdate;
            let month = date.getMonth() + 1;
            month = month < 10 ? `0${month}` : month;
            let year = date.getFullYear();
            let hours = date.getHours();
            hours = hours < 10 ? `0${hours}` : hours;
            let minutes = date.getMinutes();
            minutes = minutes < 10 ? `0${minutes}` : minutes;
            return `${tdate}${month}${year}${hours}${minutes}`;
        };

        return {
            onRequest: onRequest
        };
    });
