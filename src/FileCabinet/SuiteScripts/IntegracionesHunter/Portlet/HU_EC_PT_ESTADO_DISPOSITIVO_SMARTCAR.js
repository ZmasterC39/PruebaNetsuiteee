/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/query', 'N/log'],
    function (serverWidget, runtime, query, log) {

        /**
         * Renderiza el portlet
         * @param {Object} params
         */
        function render(params) {
            try {
                const portlet = params.portlet;
                portlet.title = "B262 COM.GYE SMART";

                // Definir columnas
                _definirColumnas(portlet);

                // Ejecutar consultas
                const resultadosDispositivo = _executeQuery(`
                SELECT
                    Item.description                                  AS DESCRIPCION,
                    ItemBinQuantity.bin                               AS Deposito,
                    BUILTIN.DF(ItemBinQuantity.bin)                   AS Nombre_Deposito,
                    BUILTIN.DF(ItemBinQuantity.Item)                  AS ItemName,
                    BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,
                    COUNT(HtDispositivo.custrecord_ht_dd_estado)      AS Cantidad
                FROM ItemBinQuantity
                INNER JOIN Item 
                    ON Item.id = ItemBinQuantity.Item
                INNER JOIN InventoryBalance 
                    ON InventoryBalance.item = Item.id
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
                    BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado)
                ORDER BY 
                    ItemBinQuantity.bin,
                    Item.description;
            `);

                const resultadosSim = _executeQuery(`
                SELECT 
                    ItemBinQuantity.bin                               AS Deposito,
                    BUILTIN.DF(ItemBinQuantity.bin)                   AS Nombre_Deposito,
                    BUILTIN.DF(ItemBinQuantity.Item)                  AS ItemName,
                    Item.description                                  AS Descripcion,
                    BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) AS Estado_Actual,
                    COUNT(*)                                          AS Cantidad
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
                    ItemBinQuantity.bin,
                    BUILTIN.DF(ItemBinQuantity.bin),
                    BUILTIN.DF(ItemBinQuantity.Item),
                    Item.description,
                    BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado)
                ORDER BY 
                    ItemBinQuantity.bin,
                    Item.description,
                    Estado_Actual;
            `);

                // log.debug("Resultados SIM", resultadosSim);

                // Agregar resultados al portlet
                _agregarResultados(portlet, resultadosDispositivo);
                _agregarResultados(portlet, resultadosSim);

            } catch (error) {
                log.error({
                    title: 'Error en Portlet',
                    details: error
                });

                params.portlet.addRow({
                    row: {
                        descripcion: 'Error al cargar datos',
                        deposito: '',
                        itemname: '',
                        estado_actual: '',
                        cantidad: ''
                    }
                });
            }
        }

        /**
         * Define columnas del portlet
         */
        function _definirColumnas(portlet) {
            portlet.addColumn({ id: 'deposito', type: serverWidget.FieldType.TEXT, label: 'Depósito' });
            portlet.addColumn({ id: 'itemname', type: serverWidget.FieldType.TEXT, label: 'Item' });
            portlet.addColumn({ id: 'descripcion', type: serverWidget.FieldType.TEXT, label: 'Descripción' });
            portlet.addColumn({ id: 'estado_actual', type: serverWidget.FieldType.TEXT, label: 'Estado Actual' });
            portlet.addColumn({ id: 'cantidad', type: serverWidget.FieldType.INTEGER, label: 'Cantidad' });
        }

        /**
         * Ejecuta una consulta SQL
         */
        function _executeQuery(sqlQuery) {
            try {
                const resultSet = query.runSuiteQL({ query: sqlQuery });
                const results = resultSet.asMappedResults();

                if (results.length > 0) {
                    return results.map(obj => {
                        return Object.fromEntries(
                            Object.entries(obj).map(([key, value]) => [
                                key.toLowerCase(),
                                typeof value === 'string'
                                    ? value.replace(/\n/g, " ")
                                    : value === null
                                        ? ""
                                        : value
                            ])
                        );
                    });
                }
                return false;
            } catch (error) {
                log.debug("Error en _executeQuery", error.stack);
                return false;
            }
        }

        /**
         * Agrega resultados al portlet
         */
        function _agregarResultados(portlet, resultados) {
            if (resultados && resultados.length > 0) {
                resultados.forEach(row => {
                    portlet.addRow({
                        row: {
                            deposito: row.nombre_deposito,
                            itemname: row.itemname,
                            descripcion: row.descripcion,
                            estado_actual: row.estado_actual
                                ? row.estado_actual.split("-")[1]
                                    ? row.estado_actual.split("-")[1]
                                    : row.estado_actual
                                : '',
                            cantidad: row.cantidad
                        }
                    });
                });
            } else {
                portlet.addRow({
                    row: {
                        deposito: 'N/A',
                        itemname: 'N/A',
                        descripcion: 'Sin resultados',
                        estado_actual: 'N/A',
                        cantidad: 'N/A'
                    }
                });
            }
        }

        return {
            render: render
        };
    });
