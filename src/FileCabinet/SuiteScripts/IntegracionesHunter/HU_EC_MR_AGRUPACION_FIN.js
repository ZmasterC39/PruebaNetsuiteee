/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @author Mauro F Ramos
 * @date Created at: 11/06/2025
 * @description Procesamiento de agrupación de factura interna a factura de venta.
*/
define(['N/record', 'N/runtime', 'N/log', 'N/file', 'N/search'], function(record, runtime, log, file, search) {

    function getInputData(context) {
        try {
            const script = runtime.getCurrentScript();
            const fileId = script.getParameter({ name: 'custscript_hu_ec_json_agrupacion_fin' });
            const registro_actividad = script.getParameter({ name: 'custscript_hu_ec_registro_actividad' });

            if (!fileId) {
                log.error('getInputData', 'No se recibió fileId en parámetros.');
                return [];
            }

            const fileObj = file.load({ id: fileId });
            const contents = fileObj.getContents();
            const jsonData = JSON.parse(contents);

            const fileJson = jsonData;

            let facturas_internas_seleccionadas = fileJson.facturasSeleccionadas.map(function(f) { return Number(f.id); });

            log.audit('lote usuario', {
                cliente: fileJson.facturarA ? fileJson.facturarA : fileJson.cliente,
                archivo: fileId,
                fin_seleccionadas: facturas_internas_seleccionadas.length,
                script: script.deploymentId,
                fecha: new Date()
            });

            let invoiceSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["item", "noneof", "@NONE@"],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["custbody_ht_factura_directa", "anyof", "@NONE@"],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ['mainline', 'is', 'F'],
                    "AND",
                    ["internalid","anyof", facturas_internas_seleccionadas],
                ],
                columns: [
                    //Datos Cabecera
                    search.createColumn({ name: "internalid", label: "ID interno" }),
                    search.createColumn({ name: "tranid", label: "Número de documento" }),
                    search.createColumn({ name: "custbody_ht_so_bien", label: "Bien" }),
                    search.createColumn({ name: "department", label: "Departamento" }),
                    search.createColumn({ name: "class", label: "Clase" }),
                    search.createColumn({ name: "location", label: "Oficina" }),
                    search.createColumn({ name: "custbody_ht_os_companiaseguros", label: "HT ASEGURADORA" }),
                    search.createColumn({ name: "custbody_ht_os_concesionario", label: "HT CONCESIONARIO" }),
                    search.createColumn({ name: "custbody_ht_os_bancofinanciera", label: "HT FINANCIERA" }),
                    search.createColumn({ name: "item", label: "Artículo" }),
                    search.createColumn({ name: "custitem_ec_item_agrupado", join: "item", label: "Artículo F" }),
                    search.createColumn({ name: "itemid", join: "item", label: "Nombre Articulo" }),
                    search.createColumn({ name: "quantityuom", label: "Cantidad" }),
                    search.createColumn({ name: "unitid", label: "Unidad" }),
                    search.createColumn({ name: "taxcode", label: "Artículo de impuesto sobre las ventas" }),
                    search.createColumn({ name: "pricelevel", label: "Nivel de Precio" }),
                    search.createColumn({ name: "rate", label: "Tarifa" }),
                    search.createColumn({ name: "formulacurrency", formula: "CASE WHEN {unitabbreviation} = 'SRVM' THEN {rate}/12 ELSE {rate} END", label: "Formula (Currency)" })
                ]
            });
            let concesionarias = new Set();
            let aseguradoras = new Set();
            let financiera = new Set();
            let bien = new Set();
            let itemMap = new Map();


            invoiceSearchObj.run().each(function (result) {
                try {
                    key = `${result.getValue({ name: 'item' })}|${result.getValue({ name: 'pricelevel' })}|${result.getValue({ name: "formulacurrency" })}`;

                    if ( result.getValue({ name: 'custbody_ht_os_concesionario' }) )     concesionarias.add( result.getValue({ name: 'custbody_ht_os_concesionario' }) );
                    if ( result.getValue({ name: 'custbody_ht_os_companiaseguros' }) )   aseguradoras.add( result.getValue({ name: 'custbody_ht_os_companiaseguros' }) );
                    if ( result.getValue({ name: 'custbody_ht_os_bancofinanciera' }) )   financiera.add( result.getValue({ name: 'custbody_ht_os_bancofinanciera' }) );
                    if ( result.getValue({ name: 'custbody_ht_so_bien' })) bien.add( result.getValue({ name: 'custbody_ht_so_bien' }) );

                    if (itemMap.has(key)) {
                        itemMap.get(key).cantidad += Number(result.getValue({ name: 'quantityuom' })) || 0;
                    } else {
                        itemMap.set(key, {
                            id: result.getValue({ name: 'item' }),
                            item_f: result.getValue({ name: 'custitem_ec_item_agrupado', join: "item" }),
                            nombre: result.getValue({ name: "itemid", join: "item" }),
                            unidad: result.getValue({ name: "unitid" }),
                            cantidad: Number(result.getValue({ name: 'quantityuom' })) || 0,
                            price: result.getValue({ name: 'pricelevel' }),
                            rate: result.getValue({ name: "formulacurrency" }),
                            oficina: result.getValue({ name: 'location' }),
                            departamento: result.getValue({ name: 'department' }),
                            clase: result.getValue({ name: 'class' }),
                        });
                    }

                    return true;
                } catch (error) {
                    log.error(`ERROR: Registro actividad: ${registro_actividad}`, error);
                    return [];
                }
            });

            let items = Array.from(itemMap.values());
            log.debug("items", items);


            let facturaDirecta = record.create({ type: record.Type.INVOICE, isDynamic: true });
            facturaDirecta.setValue({ fieldId: 'customform', value: 101 });
            fileJson.facturarA ? facturaDirecta.setValue({ fieldId: 'entity', value: fileJson.facturarA }) : facturaDirecta.setValue({ fieldId: 'entity', value: fileJson.cliente });
            if (fileJson.agrupador) { facturaDirecta.setValue({ fieldId: 'custbody_ht_cod_agru', value: fileJson.agrupador }); }
            // facturaDirecta.setValue({ fieldId: 'custbody_ht_so_bien', value: linea_factura_interna[0].bien })
            facturaDirecta.setValue({ fieldId: 'trandate', value: new Date() });
            facturaDirecta.setValue({ fieldId: 'memo', value: fileJson.glosa });
            facturaDirecta.setValue({ fieldId: 'department', value: items[0].departamento });
            facturaDirecta.setValue({ fieldId: 'class', value: items[0].clase });
            facturaDirecta.setValue({ fieldId: 'location', value: items[0].oficina });
            facturaDirecta.setValue({ fieldId: 'custbodyts_ec_tipo_documento_fiscal', value: 16 });
            facturaDirecta.setValue({ fieldId: 'terms', value: fileJson.terminoPago });
            facturaDirecta.setValue({ fieldId: 'custbodyec_nota_cliente', value: fileJson.notaFactura });
            facturaDirecta.setValue({ fieldId: 'custbody_ht_status_process_group', value: 3 });

            if( concesionarias.size === 1 && aseguradoras.size === 1 && financiera.size === 1 ){
                facturaDirecta.setValue({ fieldId: 'custbody_ht_os_concesionario', value: [...concesionarias][0] });
                facturaDirecta.setValue({ fieldId: 'custbody_ht_os_companiaseguros', value: [...aseguradoras][0] });
                facturaDirecta.setValue({ fieldId: 'custbody_ht_os_bancofinanciera', value: [...financiera][0] });
            }
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*- ELIMINAR CAMPO OBLIGATORIO DE PERÚ *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
            // ! facturaDirecta.setValue({ fieldId: 'custbody_canal_distribucion_sys', value: '1' }); // ! ELIMINAR CAMPO OBLIGATORIO DE PERÚ
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*- ELIMINAR CAMPO OBLIGATORIO DE PERÚ *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-

            for ( let i = 0; i < items.length; i++){
                facturaDirecta.selectNewLine({ sublistId: 'item' });
                if (items[i].item_f) {
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: items[i].item_f});
                }else{
                    facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: items[i].id });
                }
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'units', value: items[i].unidad });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: items[i].cantidad });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: items[i].price });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: items[i].rate });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', value: items[i].departamento });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: items[i].clase });
                facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: items[i].oficina });
                facturaDirecta.commitLine({ sublistId: 'item' });
            }

            facturaDirecta.setValue({ fieldId: 'custbody_ht_status_process_group', value: 1 });
            let facturaDirectaId;

            try {
                facturaDirectaId = facturaDirecta.save();
                const factura = record.load({
                    type: record.Type.INVOICE,
                    id: facturaDirectaId
                });
                const numeroFactura = factura.getValue({ fieldId: 'tranid' });
                const accountId = (runtime.envType === runtime.EnvType.SANDBOX) ? '7451241-sb1' : '7451241';
                record.submitFields({
                    type: 'customrecord_registro_actividad',
                    id: registro_actividad,
                    values: {
                        custrecord_registro_actividad_estado: '2',
                        custrecord_registro_actividad_detalle: `Factura creada <a href="https://${accountId}.app.netsuite.com/app/accounting/transactions/custinvc.nl?id=${facturaDirectaId}&whence=">#${numeroFactura}</a>`
                    }
                });
                log.debug("Factura Directa Creada", `ID: ${facturaDirectaId}, Número: #${numeroFactura}`);
            } catch (saveError) {
                log.error('Error guardando la factura', saveError);
                return;
            }


            fileJson.facturaDirectaid = facturaDirectaId;
            const fact_internas_asociadas = []

            fileJson.facturasSeleccionadas.forEach(facturaInterna => {
                facturaInterna.facturaDirectaid = facturaDirectaId;

                fact_internas_asociadas.push(facturaInterna);
            });

            file.delete({ id: fileId });

            return fact_internas_asociadas;
        } catch (error) {
            log.error("ERROR: getInputData", error);
            const script = runtime.getCurrentScript();
            const registro_actividad = script.getParameter({ name: 'custscript_hu_ec_registro_actividad' });
            record.submitFields({
                type: 'customrecord_registro_actividad',
                id: registro_actividad,
                values: {
                    custrecord_registro_actividad_estado: '4',
                    custrecord_registro_actividad_detalle: `${error.message}`,
                    custrecord_registro_actividad_fecha_fin: new Date()
                }
            });
            return [];
        }
    }

    function map(context) {
        try {
            const ec_factura_interna = JSON.parse(context.value);

            record.submitFields({
                type: 'customsale_ec_factura_interna',
                id: ec_factura_interna.id,
                values: {
                    custbody_ht_factura_directa: ec_factura_interna.facturaDirectaid,
                    // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*- ELIMINAR CAMPO OBLIGATORIO DE PERÚ *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
                    // ! custbody_canal_distribucion_sys: '1' // ! ELIMINAR CAMPO OBLIGATORIO DE PERÚ
                    // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*- ELIMINAR CAMPO OBLIGATORIO DE PERÚ *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
            } });

            let factura = record.create({
                type: "customrecord_ht_fact_internas_asociadas",
                isDynamic: true
            });

            factura.setValue({ fieldId: 'custrecord_nro_factura', value:  ec_factura_interna.facturaDirectaid }); // FACTURA DE VENTA
            factura.setValue({ fieldId: 'custrecord_nro_factura_interna', value: ec_factura_interna.id }); // FACTURA INTERNA
            if (ec_factura_interna.creado_desde) {
                try {
                    factura.setValue({ fieldId: 'custrecord_orden_servicio', value: ec_factura_interna.creado_desde })

                    record.submitFields({
                        type: record.Type.SALES_ORDER,
                        id: ec_factura_interna.creado_desde,
                        values: {
                            custbody_ht_factura_directa: ec_factura_interna.facturaDirectaid,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                        },
                    });
                } catch (error) {
                    log.error("ERRRO SALES_ORDER", error);
                }
            }

            if (ec_factura_interna.nro_cuota) {
                factura.setValue({ fieldId: 'custrecord_nro_cuota', value: ec_factura_interna.nro_cuota })
            }
            factura.save(
            //     {
            //     enableSourcing: true,
            //     ignoreMandatoryFields: true
            // }
            );
            return true;
        } catch (error) {
            log.error("Error: MAP", error.stack);
            return true;
        }
    }

    function reduce(context) {
        try {
            return true;
        } catch (error) {
            return true;
        }
    }

    function summarize(summary) {
        try {
            const script = runtime.getCurrentScript();
            const registro_actividad = script.getParameter({ name: 'custscript_hu_ec_registro_actividad' });

            record.submitFields({
                type: 'customrecord_registro_actividad',
                id: registro_actividad,
                values: {
                    custrecord_registro_actividad_estado: '3',
                    custrecord_registro_actividad_fecha_fin: new Date()
                }
            });

            return true;
        } catch (error) {
            log.error("ERROR: summarize", error.stack);
            const script = runtime.getCurrentScript();
            const registro_actividad = script.getParameter({ name: 'custscript_hu_ec_registro_actividad' });
            record.submitFields({
                type: 'customrecord_registro_actividad',
                id: registro_actividad,
                values: {
                    custrecord_registro_actividad_estado: '4',
                    custrecord_registro_actividad_detalle: `${error.message}`
                }
            });
            return true;
        }
    }

    return { getInputData, map, reduce, summarize }
});
