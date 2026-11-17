/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 31/05/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
*/

define(['N/ui/serverWidget', 'N/runtime', 'N/log', 'N/search', 'N/record', 'N/file', 'N/task', 'N/url', 'N/redirect'], function (serverWidget, runtime, log, search, record, file, task, url, redirect) {


    function onRequest(context) {
        let form
        try {
            let {role: userRol, subsidiary} = runtime.getCurrentUser();
            let facturas_internas_seleccionadas = new Array();
            if( subsidiary !== 2){
                form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                context.response.writePage(form);
                return;
            }

            form = serverWidget.createForm({title: 'EC AGRUPACIÓN DE FACTURAS PARA FACTURA DIRECTA'});
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_AGRUPACION_FIN.js";

            _uiMain(context, form);

            let cliente = context.request.parameters.cliente;
            let fecha_inicio = context.request.parameters.fecha_inicio;
            let fecha_fin = context.request.parameters.fecha_fin;
            let agrupador = context.request.parameters.agrupador;
            if (cliente || fecha_inicio || fecha_fin || agrupador) {
                _uiSublist(form, cliente, fecha_inicio, fecha_fin, agrupador);
            }else{
                _uiSublist(form, 0, 0, 0, 0);
            }

            if(context.request.method == 'POST') {
                let cliente = context.request.parameters['custpage_cliente'] || "";
                let agrupador = context.request.parameters['custpage_agrupador'] || "";
                let terminoPago = context.request.parameters['custpage_termino_pago'] || "";
                fecha_inicio = context.request.parameters['custpage_fecha_inicio'] || "";
                fecha_fin = context.request.parameters['custpage_fecha_fin'] || "";
                let currentUser = runtime.getCurrentUser();
                let usuario = currentUser.id;
                let glosa = context.request.parameters['custpage_glosa'] || "";
                let facturarA = context.request.parameters['custpage_facturar_a'] || "";
                let notaFactura = context.request.parameters['custpage_nota_factura'] || "";
                let facturasSeleccionadas = new Array();
                let fecha = context.request.parameters['custpage_fecha'] || "";

                let lineCount = context.request.getLineCount({
                    group: 'custpage_sublist'
                })

                for ( let index = 0; index < lineCount; index++) {
                    let tranInternalId = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_checkbox',
                        line: index
                    });

                    let id = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_id',
                        line: index
                    });
                    let nro_cuota = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_nro_cuota',
                        line: index
                    });
                    let creado_desde = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_creado_desde',
                        line: index
                    });

                    if(tranInternalId == 'T'){
                        facturas_internas_seleccionadas.push(id);
                        facturasSeleccionadas.push({
                            id,
                            nro_cuota,
                            creado_desde,
                        })
                    }
                }

                let ts_ss_agrup_fac_params = {
                    cliente,
                    fecha_inicio,
                    fecha_fin,
                    agrupador,
                    terminoPago,
                    usuario,
                    glosa,
                    facturarA,
                    notaFactura,
                    facturasSeleccionadas,
                }

                log.debug("ts_ss_agrup_fac_params", ts_ss_agrup_fac_params);

                const registro_actividad = crearRegistroActividad(cliente);

                const fileid = saveJson(ts_ss_agrup_fac_params, 18054) // devuelve id del archivo

                if (!fileid) {
                    throw new Error("• Ha ocurrido un error, intente nuevamente.");
                }

                const resultado = lanzarMRDisponible(fileid, registro_actividad);

                if (!resultado.success) {
                    record.delete({
                        type: 'customrecord_registro_actividad',
                        id: registro_actividad
                    });
                    throw new Error("• Ha ocurrido un error, el sistema ya está procesando otras tareas.\nPor favor, espera un momento y vuelve a intentarlo.");
                }else {
                    suiteletUrl = url.resolveScript({
                        scriptId: 'customscript_hu_ec_sl_estado',
                        deploymentId: 'customdeploy_hu_ec_sl_estado',
                        params: {
                            tipo_proceso: '1',
                            fecha_inicio: fecha,
                            fecha_fin: fecha,
                        }
                    });

                    redirect.redirect({
                        url: suiteletUrl
                    });
                }

            }

            context.response.writePage(form);

        } catch (error) {
            form = serverWidget.createForm({title: 'Error'});
            let errorField = form.addField({
                id: 'custpage_error_message',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Error Message'
            });
            errorField.defaultValue = `
                <p style="font-size:13px;">
                    ${error.message}.
                </p>
            `;
            log.error("Error: onRequest", error.stack);
            context.response.writePage( form );
        }
    }

    function lanzarMRDisponible(fileid, registro_actividad) {
        const scriptId = 'customscript_hu_ec_mr_agrupacion_fin';
        const deployments = [
            'customdeploy_hu_ec_mr_agrupacion_fin_001',
            'customdeploy_hu_ec_mr_agrupacion_fin_002',
            'customdeploy_hu_ec_mr_agrupacion_fin_003',
            'customdeploy_hu_ec_mr_agrupacion_fin_004',
            'customdeploy_hu_ec_mr_agrupacion_fin_005'
        ];

        for (let i = 0; i < deployments.length; i++) {
            try {
                // setTimeout(() => {
                //     log.debug(`Elemento ${i}: ${arreglo[i]}`);
                // }, (i + 1) * 1000);

                const mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: scriptId,
                    deploymentId: deployments[i],
                    params: {
                        custscript_hu_ec_json_agrupacion_fin: fileid,
                        custscript_hu_ec_registro_actividad: registro_actividad
                    }
                });

                const taskId = mrTask.submit();
                log.audit('Map/Reduce lanzado', `Deployment: ${deployments[i]} | Task ID: ${taskId}`);
                return {
                    success: true,
                    taskId: taskId,
                    deployment: deployments[i]
                };

            } catch (e) {
                if (e.name === 'MAP_REDUCE_ALREADY_RUNNING') {
                    //log.debug(`Deployment ocupado: ${deployments[i]}`, e.message);
                    continue; // prueba el siguiente deployment
                } else {
                    log.error(`Error en deployment: ${deployments[i]}`, e);
                    throw e; // error inesperado
                }
            }
        }

        // Todos los deployments están ocupados
        return {
            success: false,
            message: 'El sistema ya está procesando otras tareas.\nPor favor, espera un momento y vuelve a intentarlo.'
        };
    }

    const saveJson = (contents, folder) => {
        try {
            let time = sysDateTime();
            let fileObj = file.create({
                name: `lote_ec_${time}.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: folder,
                isOnline: false
            });
            //log.debug("fileObj", fileObj);
            return fileObj.save();
        } catch (error) {
            log.error("ERROR: saveJson", error);
            log.error("ERROR: saveJson", error.stack);
            return false;
        }
    }

    const crearRegistroActividad = (cliente) => {
        try {
            let registro = record.create({ type: 'customrecord_registro_actividad', isDynamic: true })
            registro.setValue({ fieldId: 'custrecord_registro_actividad_cliente', value: cliente});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_estado', value: '1'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_subsidiary', value: '2'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_nombre', value: '1'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_fecha_inic', value: new Date()});
            registro.save();
            return registro.id;
        } catch (error) {
            log.error("ERROR: crearRegistroActividad", error.stack);
        }
    }

    const sysDateTime = () => {
        // const date = new Date();
        // const dd = String(date.getDate()).padStart(2, '0');
        // const mm = String(date.getMonth() + 1).padStart(2, '0');
        // const yyyy = date.getFullYear();
        // const hh = String(date.getHours()).padStart(2, '0');
        // const mi = String(date.getMinutes()).padStart(2, '0');
        // const ss = String(date.getSeconds()).padStart(2, '0');
        // const ms = String(date.getMilliseconds()).padStart(3, '0');
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${rand}_${rand2}`;
    };



    function _uiSublist(form, cliente, fecha_inicio, fecha_fin, agrupador) {
        try {
            let sublist = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.LIST,
                label: "Facturas Internas"
            });

            if( cliente == 0, fecha_inicio == 0, fecha_fin == 0, agrupador == 0){
                return;
            }

            sublist.addMarkAllButtons();

            sublist.addField({ id: 'custpage_checkbox', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar' });
            sublist.addField({ id: 'custpage_id', type: serverWidget.FieldType.TEXT, label: 'ID' });
            sublist.addField({ id: 'custpage_numero', type: serverWidget.FieldType.TEXT, label: 'Número' });
            sublist.addField({ id: 'custpage_agrupador', type: serverWidget.FieldType.TEXT, label: 'Agrupador' });
            sublist.addField({ id: 'custpage_orden_servicio', type: serverWidget.FieldType.TEXT, label: 'Orden de Servicio'});
            sublist.addField({ id: 'custpage_creado_desde', type: serverWidget.FieldType.TEXT, label: 'OS id' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN});;
            sublist.addField({ id: 'custpage_nro_cuota', type: serverWidget.FieldType.TEXT, label: 'Nro. Cuota' });
            sublist.addField({ id: 'custpage_fecha', type: serverWidget.FieldType.TEXT, label: 'Fecha' });
            sublist.addField({ id: 'custpage_cliente', type: serverWidget.FieldType.TEXT, label: 'Cliente' });
            sublist.addField({ id: 'custpage_monto', type: serverWidget.FieldType.TEXT, label: 'Monto' });

            let data = _get_facturas_internas(cliente, fecha_inicio, fecha_fin, agrupador);

            data.forEach( (item, index) => {
                Object.keys(item).forEach( (key) => {
                    sublist.setSublistValue({
                        id: `custpage_${key}`,
                        line: index,
                        value: item[key] || null
                    })
                })
            });

        } catch (error) {
            log.error("Error _uiSublist", error.stack);
        }
    }

    function _get_facturas_lineas_fin(facturas_internas_seleccionadas){
        try {
            let respuesta = new Array();
            let invoiceSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CuTrSale112"],
                    "AND",
                    ["status", "noneof", "CuTrSale112:V"],
                    "AND",
                    ["item", "noneof", "@NONE@"],
                    "AND",
                    ["taxline", "is", "F"],
                    "AND",
                    ["custbody_ht_factura_directa", "anyof", "@NONE@"],
                    "AND",
                    ["memomain", "isnot", "VOID"],
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
            //contamos los resultados

            invoiceSearchObj.run().each(function (result) {
                let objFacturas = {
                    id: result.getValue({ name: 'internalid' }),
                    numero: result.getValue({ name: 'tranid' }),
                    bien: result.getValue({ name: 'custbody_ht_so_bien' }),
                    departamento: result.getValue({ name: 'department' }),
                    clase: result.getValue({ name: 'class' }),
                    oficina: result.getValue({ name: 'location' }),
                    aseguradora: result.getValue({ name: 'custbody_ht_os_companiaseguros' }),
                    concesionario: result.getValue({ name: 'custbody_ht_os_concesionario' }),
                    financiera: result.getValue({ name: 'custbody_ht_os_bancofinanciera' }),
                    item: result.getValue({ name: 'item' }),
                    item_f: result.getValue({ name: 'custitem_ec_item_agrupado', join: "item" }),
                    nombreItem: result.getValue({ name: "itemid", join: "item", }),
                    cantidad: result.getValue({ name: 'quantityuom' }),
                    unidad: result.getValue({ name: "unitid" }),
                    taxcode: result.getValue({ name: 'taxcode' }),
                    price: result.getValue({ name: 'pricelevel' }),
                    rate: result.getValue({ name: "formulacurrency", formula: "CASE WHEN {unitabbreviation} = 'SRVM' THEN {rate}/12 ELSE {rate} END", label: "Formula (Currency)" })
                }
                respuesta.push(objFacturas);
                return true;
            });
            return respuesta;
        } catch (error) {
            log.error("ERROR: _get_facturas_lineas_fin", error.stack);
        }
    }

    function _get_facturas_internas(cliente, fecha_inicio, fecha_fin, agrupador){
        try {
            let results = [];
            let filters = [];
            filters = [
                ["type", "anyof", "CuTrSale112"],
                "AND",
                ["status", "noneof", "CuTrSale112:V"],
                "AND",
                ['mainline', 'is', 'T'],
                "AND",
                ["custbody_ht_factura_directa", "anyof", "@NONE@"],
                "AND",
                ["memomain", "isnot", "VOID"],
                "AND",
                ["subsidiary", "anyof", "2"]
            ]
            if (cliente) {
                filters.push("AND");
                filters.push(["entity", "anyof", cliente]);
            }
            if (fecha_inicio && fecha_fin) {
                filters.push("AND");
                filters.push(["trandate", "within", `${fecha_inicio}`, `${fecha_fin}`]);
            }
            if (agrupador) {
                filters.push("AND");
                filters.push(["custbody_ht_cod_agru", "is", agrupador]);
            }
            let invoiceSearch = search.create({
                type: 'transaction',
                filters,
                columns: [
                search.createColumn({ name: 'internalid', label: 'id' }),
                search.createColumn({ name: 'tranid', label: 'numero' }),
                search.createColumn({ name: 'trandate', label: 'fecha' }),
                search.createColumn({ name: 'entity', label: 'cliente' }),
                search.createColumn({ name: 'amount', label: 'monton' }),
                // search.createColumn({ name: 'approvalstatus', label:  }),
                search.createColumn({ name: 'custbody_ht_cod_agru', label: 'agrupador' }),
                search.createColumn({ name: 'custbody_ec_nro_cuota_fac_int', label: 'nro_cuota' }),
                search.createColumn({ name: 'custbody_ec_created_from_fac_int', label: 'orden_servicio' }),
                search.createColumn({
                    name: "internalid",
                    join: "createdFrom",
                    label: "creado_desde"
                })
                ]
            });
            // Ejecutar la búsqueda para obtener el total de registros
            let searchResult = invoiceSearch.runPaged({ pageSize: 1000 });
            let totalRecords = searchResult.count; // Obtiene el número total de registros
            let data = []
            // Primero, si hay más de 1000 registros, traer los primeros 1000
            if (totalRecords > 0) {
                // Procesa la primera página (primeros 1000 registros)
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {}; // Mapa temporal para evitar duplicados
                // Procesar los resultados de la primera página
                firstPage.data.forEach(function (result) {
                    data.push({
                        id: result.getValue({ name: 'internalid' }),
                        numero: result.getValue({ name: 'tranid' }),
                        fecha: result.getValue({ name: 'trandate' }),
                        cliente: result.getText({ name: 'entity' }),
                        monto: result.getValue({ name: 'amount' }),
                        agrupador: result.getText({ name: 'custbody_ht_cod_agru' }),
                        nro_cuota: result.getValue({ name: 'custbody_ec_nro_cuota_fac_int' }),
                        orden_servicio: result.getText({ name: 'custbody_ec_created_from_fac_int' }),
                        creado_desde: result.getValue({ name: 'internalid', join: 'createdFrom' })
                    })
                });
                // Agrega los primeros 1000 registros al resultado final
                results = results.concat(Object.values(invoicesMap));
                // Ahora recupera el resto de los registros (si es que existen más de 1000)
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000); // Calcular cuántas páginas quedan por procesar
                // Procesar las páginas restantes (con página 1, página 2, etc.)
                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados
                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {
                    data.push({
                        id: result.getValue({ name: 'internalid' }),
                        numero: result.getValue({ name: 'tranid' }),
                        fecha: result.getValue({ name: 'trandate' }),
                        cliente: result.getText({ name: 'entity' }),
                        monto: result.getValue({ name: 'amount' }),
                        agrupador: result.getText({ name: 'custbody_ht_cod_agru' }),
                        nro_cuota: result.getValue({ name: 'custbody_ec_nro_cuota_fac_int' }),
                        orden_servicio: result.getText({ name: 'custbody_ec_created_from_fac_int' }),
                        creado_desde: result.getValue({ name: 'internalid', join: 'createdFrom' })
                    })
                    });
                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            return data;
        } catch (error) {
            log.error("Error _get_facturas_internas", error.stack)
        }
    }

    function _uiMain(context, form) {
        try {
            form.addSubmitButton({
                label: 'Crear Factura directa'
            });

            form.addResetButton({
                label: 'Cancelar'
            });

            form.addFieldGroup({
                id: 'custpage_seccion_busqueda',
                label: 'Búsqueda de Ordenes de Servicio',
            });

            form.addButton({
                id: 'custpage_estado',
                label: 'Ver procesos',
                functionName: 'estado()'
            });

            let cliente = form.addField({
                id: 'custpage_cliente',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Cliente',
                container: 'custpage_seccion_busqueda'
            });
            cliente.defaultValue = context.request.parameters.cliente || '';
            cliente.isMandatory = true;

            let fecha_inicio = form.addField({
                id: 'custpage_fecha_inicio',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Inicio',
                container: 'custpage_seccion_busqueda'
            });
            fecha_inicio.defaultValue = context.request.parameters.fecha_inicio || '';
            fecha_inicio.isMandatory = true;

            let fecha_fin = form.addField({
                id: 'custpage_fecha_fin',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Fin',
                container: 'custpage_seccion_busqueda'
            });
            fecha_fin.defaultValue = context.request.parameters.fecha_fin || '';
            fecha_fin.isMandatory = true;

            let termino_pago = form.addField({
                id: 'custpage_termino_pago',
                type: serverWidget.FieldType.SELECT,
                source: 'term',
                label: 'Término de Pago',
                container: 'custpage_seccion_busqueda'
            });
            termino_pago.isMandatory = true;

            let agrupador = form.addField({
                id: 'custpage_agrupador',
                type: serverWidget.FieldType.TEXT,
                label: 'Agrupador',
                container: 'custpage_seccion_busqueda'
            });
            agrupador.defaultValue = context.request.parameters.agrupador || '';

            let glosa = form.addField({
                id: 'custpage_glosa',
                type: serverWidget.FieldType.TEXT,
                label: 'Glosa',
                container: 'custpage_seccion_busqueda'
            });
            glosa.isMandatory = true;

            let facturar_a = form.addField({
                id: 'custpage_facturar_a',
                type: serverWidget.FieldType.SELECT,
                source: 'customer',
                label: 'Facturar a',
                container: 'custpage_seccion_busqueda'
            });

            let nota_factura = form.addField({
                id: 'custpage_nota_factura',
                type: serverWidget.FieldType.TEXTAREA,
                label: 'Nota de Factura',
                container: 'custpage_seccion_busqueda'
            });

            let importeField = form.addField({
                id: 'custpage_importe',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Importe'
            });
            importeField.defaultValue = `
                <p style="font-size:13px;">
                    <span style="color:#6f6f6f;">IMPORTE: </span> $0.0
                </p>
            `;
            importeField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            let seleccionados = form.addField({
                id: 'custpage_seleccionados',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Seleccionados'
            });
            seleccionados.defaultValue = `
                <p style="font-size:13px;">
                    <span style="color:#6f6f6f;">TOTAL SELECCIONADOS:</span> 0
                </p>
            `;
            seleccionados.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            let fecha = form.addField({
                id: 'custpage_fecha',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Fin',
                container: 'custpage_seccion_busqueda'
            });
            fecha.defaultValue = new Date();
            fecha.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        } catch (error) {
            log.error("Error _uiMain", error.stack);
        }
    }

    return { onRequest };

});
