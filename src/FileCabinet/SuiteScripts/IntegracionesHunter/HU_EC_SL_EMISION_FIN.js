/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 *
 * @author Mauro F Ramos
 * @date Created at: 15/07/2025 - Last modified:
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 *
*/

define(['N/runtime', 'N/log', 'N/ui/serverWidget', 'N/search', 'N/task', 'N/record', 'N/url', 'N/redirect', 'N/file'], function (runtime, log, serverWidget, search, task, record, url, redirect, file) {

    function onRequest(context) {
        try {
            let {role: userRol, subsidiary} = runtime.getCurrentUser();
            let orden_servicio_seleccionadas = new Array();
            if( subsidiary !== 2){
                form = serverWidget.createForm({title: 'No tienes permisos para ver esta página'});
                context.response.writePage(form);
                return;
            }

            form = serverWidget.createForm({ title: 'EC EMISIÓN MASIVA FACTURA INTERNA'});
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_EMISION_FIN.js";

            _uiMain(context, form);
            let cliente = context.request.parameters.cliente;
            let fecha_inicio = context.request.parameters.fecha_inicio;
            let fecha_fin = context.request.parameters.fecha_fin;
            if(cliente || fecha_inicio || fecha_fin){
                _uiSublist(form, cliente, fecha_inicio, fecha_fin);
            }else{
                _uiSublist(form, 0, 0, 0);
            }

            if ( context.request.method == 'POST'){
                cliente = context.request.parameters['custpage_cliente'];
                fecha_inicio = context.request.parameters['custpage_fecha_inicio'];
                fecha_fin = context.request.parameters['custpage_fecha_fin'];
                let fecha = context.request.parameters['custpage_fecha'] || "";

                let lineCount = context.request.getLineCount({
                    group: 'custpage_sublist'
                });

                for( let index = 0; index < lineCount; index++){
                    let trandId = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_checkbox',
                        line: index
                    });

                    let id = context.request.getSublistValue({
                        group: 'custpage_sublist',
                        name: 'custpage_id',
                        line: index,
                    });

                    if( trandId == 'T'){
                        orden_servicio_seleccionadas.push(id);
                    }
                }

                let registros_procesar = {
                    procesar: true,
                    orden_servicio_seleccionadas,
                    total: orden_servicio_seleccionadas.length,
                    procesadas: 0,
                    errores: 0,
                    errores_detalles: ''
                }

                const registro_actividad = crearRegistroActividad(cliente);

                const fileid = saveJson(registros_procesar, 18054);

                log.debug("fileid", fileid);

                if (!fileid) {
                    throw new Error("• Ha ocurrido un error, intente nuevamente.");
                }

                const resultado = lanzarSSDisponible(fileid, registro_actividad);

                if( !resultado.success ){
                    record.delete({
                        type: 'customrecord_registro_actividad',
                        id: registro_actividad
                    });
                    throw new Error("• Ha ocurrido un error, el sistema ya está procesando otras tareas.\nPor favor, espera un momento y vuelve a intentarlo.");
                }else{
                    suiteletUrl = url.resolveScript({
                        scriptId: 'customscript_hu_ec_sl_estado',
                        deploymentId: 'customdeploy_hu_ec_sl_estado',
                        params: {
                            tipo_proceso: '2',
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

    const saveJson = (contents, folder) => {
        try {
            let time = sysDateTime();
            let fileObj = file.create({
                name: `lote_ec_EFIN_${time}.json`,
                fileType: file.Type.JSON,
                contents: JSON.stringify(contents),
                folder: folder,
                isOnline: false
            });
            return fileObj.save();
        } catch (error) {
            log.error("ERROR: saveJson", error);
            log.error("ERROR: saveJson", error.stack);
            return false;
        }
    }

    const sysDateTime = () => {
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${rand}_${rand2}`;
    };

    const crearRegistroActividad = (cliente) => {
        try {
            let registro = record.create({ type: 'customrecord_registro_actividad', isDynamic: true })
            registro.setValue({ fieldId: 'custrecord_registro_actividad_cliente', value: cliente});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_estado', value: '2'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_subsidiary', value: '2'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_nombre', value: '2'});
            registro.setValue({ fieldId: 'custrecord_registro_actividad_fecha_inic', value: new Date()});
            registro.save();
            return registro.id;
        } catch (error) {
            log.error("ERROR: crearRegistroActividad", error);
        }
    }

    // TODO: CREAR CAMPO DE REGISTRO DE ACTIVIDAD EN EL SCHEDULED SCRIPT
    function lanzarSSDisponible(fileid, registro_actividad) {
        const scriptId = 'customscript_hu_ec_ss_emision_masiva_fin';
        const deployments = [
            'customdeploy_hu_ec_ss_emision_fin_001',
            'customdeploy_hu_ec_ss_emision_fin_002',
            'customdeploy_hu_ec_ss_emision_fin_003',
            'customdeploy_hu_ec_ss_emision_fin_004',
            'customdeploy_hu_ec_ss_emision_fin_005',
        ];

        for (let i = 0; i < deployments.length; i++) {
            try {
                const mrTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: scriptId,
                    deploymentId: deployments[i],
                    params: {
                        custscript_file_os_generar_fin : fileid,
                        custscript_gfin_registro_actividad : registro_actividad,
                    }
                });

                const taskId = mrTask.submit();
                log.audit('SCHEDULED SCRIPT lanzado', `Deployment: ${deployments[i]} | Task ID: ${taskId}`);
                return {
                    success: true,
                    taskId: taskId,
                    deployment: deployments[i]
                };

            } catch (e) {
                if (e.name === 'FAILED_TO_SUBMIT_JOB_REQUEST_1') {
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

    function _uiSublist(form, cliente, fecha_inicio, fecha_fin) {
        try {
            let sublist = form.addSublist({
                id: 'custpage_sublist',
                type: serverWidget.SublistType.LIST,
                label: "Ordenes de servicio"
            });

            if( cliente == 0, fecha_inicio == 0, fecha_fin == 0){
                return;
            }

            sublist.addMarkAllButtons();
            sublist.addField({ id: 'custpage_checkbox', type: serverWidget.FieldType.CHECKBOX, label: 'Seleccionar' });
            sublist.addField({ id: 'custpage_id', type: serverWidget.FieldType.TEXT, label: 'ID' });
            sublist.addField({ id: 'custpage_nr_documento', type: serverWidget.FieldType.TEXT, label: 'N° Documento' });
            sublist.addField({ id: 'custpage_fecha', type: serverWidget.FieldType.TEXT, label: 'Fecha' });
            sublist.addField({ id: 'custpage_cliente', type: serverWidget.FieldType.TEXT, label: 'Cliente' });
            sublist.addField({ id: 'custpage_importe', type: serverWidget.FieldType.CURRENCY, label: 'Importe' });

            let data = _get_ordenes_servicio(cliente, fecha_inicio, fecha_fin);

            data.forEach( (item, index) => {
                Object.keys(item).forEach( (key) => {
                    sublist.setSublistValue({
                        id: `custpage_${key}`,
                        line: index,
                        value: item[key] || null
                    })
                })
            });

            form.addSubmitButton({
                label: 'Generar'
            });

            form.addResetButton({
                label: 'Cancelar'
            });

        } catch (error) {
            log.error("ERROR _uiSublist", error);
        }
    }

    function _get_ordenes_servicio(cliente, fecha_inicio, fecha_fin){
        try {
            let results = [];
            let filters = [
                ["type","anyof","SalesOrd"],
                "AND",
                ["mainline","is","T"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["custbody_ec_estado_factura_interna","anyof","1","3"],
                "AND",
                ["status","anyof","SalesOrd:B","SalesOrd:E","SalesOrd:F"],
                "AND",
                ["custbody_ht_os_aprobacionventa","anyof","1"],
                "AND",
                ["custbody_ht_os_aprobacioncartera","anyof","1"],
                "AND",
                ["amount","greaterthan","0.00"]

            ];

            if( cliente ){
                filters.push("AND");
                filters.push(["entity", "anyof", cliente]);
            }

            if (fecha_inicio && fecha_fin) {
                filters.push("AND");
                filters.push(["trandate", "within", `${fecha_inicio}`, `${fecha_fin}`]);
            }

            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters,
                columns:
                [
                    search.createColumn({ name: "internalid", label: "id" }),
                    search.createColumn({ name: "tranid", label: "nr_documento" }),
                    search.createColumn({ name: "trandate", label: "fecha" }),
                    search.createColumn({ name: "entity", label: "cliente" }),
                    search.createColumn({
                        name: "formulanumeric",
                        formula: "{amount}-{taxtotal}",
                        label: "Fórmula (numérica)"
                    }),
                ]
            });

            let searchResult = salesorderSearchObj.runPaged( {pageSize: 1000});
            let totalRecords = searchResult.count;
            let data = [];
            if (totalRecords > 0) {
                let firstPage = searchResult.fetch({ index: 0 });
                let invoicesMap = {};
                firstPage.data.forEach(function (result) {
                    data.push({
                        id: result.getValue({ name: 'internalid' }),
                        nr_documento: result.getValue({ name: 'tranid' }),
                        fecha: result.getValue({ name: 'trandate' }),
                        cliente: result.getText({ name: 'entity'}),
                        importe: result.getValue({ name: 'formulanumeric' }),
                    });
                });
                results = results.concat( Object.values( invoicesMap ));
                let remainingRecordsCount = totalRecords - 1000;
                let remainingPages = Math.ceil(remainingRecordsCount / 1000);

                for (let pageIndex = 1; pageIndex <= remainingPages; pageIndex++) {
                    let page = searchResult.fetch({ index: pageIndex });
                    let remainingInvoicesMap = {}; // Mapa temporal para evitar duplicados
                    // Procesar cada resultado de la página
                    page.data.forEach(function (result) {
                        data.push({
                            id: result.getValue({ name: 'internalid' }),
                            nr_documento: result.getValue({ name: 'tranid' }),
                            fecha: result.getValue({ name: 'trandate' }),
                            cliente: result.getValue({ name: 'altname', join: 'customerMain' }),
                            importe: result.getValue({ name: 'formulanumeric' }),
                        })
                    });
                    // Concatenar los resultados restantes
                    results = results.concat(Object.values(remainingInvoicesMap));
                }
            }
            return data;
        } catch (error) {
            log.error("ERROR _get_ordenes_servicio", error);
        }
    }

    function _uiMain( context, form){
        try {
            form.addFieldGroup({ id: 'custpage_seccion_busqueda', label: 'Filtros' });
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
            cliente.updateBreakType({
                breakType: serverWidget.FieldBreakType.STARTCOL
            });

            let fecha_inicio = form.addField({
                id: 'custpage_fecha_inicio',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Inicio',
                container: 'custpage_seccion_busqueda'
            });
            fecha_inicio.defaultValue = context.request.parameters.fecha_inicio || '';
            fecha_inicio.isMandatory = true;
            fecha_inicio.updateBreakType({
                breakType: serverWidget.FieldBreakType.NONE
            });

            let fecha_fin = form.addField({
                id: 'custpage_fecha_fin',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Fin',
                container: 'custpage_seccion_busqueda'
            });
            fecha_fin.defaultValue = context.request.parameters.fecha_fin || '';
            fecha_fin.isMandatory = true;
            fecha_fin.updateBreakType({
                breakType: serverWidget.FieldBreakType.NONE
            });

            let importeField = form.addField({
                id: 'custpage_importe2',
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

            seleccionados.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            let fecha = form.addField({
                id: 'custpage_fecha',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha',
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
