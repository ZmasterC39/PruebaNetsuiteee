/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/log', 'N/search', 'N/format', 'N/runtime', 'N/task', 'N/file'],

    (record, log, search, format, runtime, task, file) => {
        const FORM_EC_FORMULARIO_FACTURA_VENTA = 101;
        const FORM_PE_FORMULARIO_FACTURA_VENTA = 183;
        const TIPO_DOCUMENTO_18 = 16;
        const TIPO_DOCUMENTO_01 = 50;
        const LOG_RECORD = 'customrecord_ts_standar_ss_cola_pe';
        const inputfolder = 18054;
        const PENDIENTE = 3;
        const COMPLETADO = 1;
        const ERROR = 2;
        const PROCESANDO = 4;

        const execute = (scriptContext) => {
            try {
                let cola = getCola();
                log.debug('cola', cola);
                if (cola.length > 0) {
                    log.debug('execute', 'Ejecucion Iniciada');
                    try {
                        let fileObjContent = file.load({ id: cola[0].parametros });
                        const parametros = JSON.parse(fileObjContent.getContents());
                        log.debug('contentResults', parametros);
                        //let facturas = parametros.facturasSeleccionadas;
                        //parametros.facturasInternas = facturas;
                        parametros.facturasInternas = parametros.facturasSeleccionadas;
                        let facturaDirecta = generarFacturaDirecta(parametros, cola[0]);
                        log.debug('execute', 'Factura Directa Generada: ' + facturaDirecta.id);
                    } catch (e) {
                        log.error('execute error getFacturasFIN', e);
                    }
                    try {
                        let scriptTask = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT, scriptId: 'customscript_ts_ss_agrupacion_factura_pe', deploymentId: 'customdeploy_ts_ss_agrupacion_factura_pe', params: { custscriptts_ss_agrup_fac_par_pe: '{}', custscript_ts_ss_agrup_fac_slect_fact_pe: 't' } });
                        scriptTask.submit();
                    } catch (error) {
                        log.error('Pendientes Task Error', error);
                    }
                }
            } catch (error) {
                log.error('execute main error', error);
            }
        }

        const generarFacturaDirecta = (params, id_cola) => {
            log.debug('params', params);
            let idCabLog = params.id_log;
            try {
                let respuesta = new Object();
                var facturaarray = [];
                for (let j = 0; j < params.facturaDirecta.length; j++) {
                    let facturaDirecta = record.create({ type: record.Type.INVOICE, isDynamic: true });
                    facturaDirecta.setValue({ fieldId: 'customform', value: FORM_PE_FORMULARIO_FACTURA_VENTA });
                    facturaDirecta.setValue({ fieldId: 'entity', value: params.facturaDirecta[j].facturar_a });

                    const headerDept = params.facturaDirecta[j].items?.[0]?.departamento || null;
                    const headerClass = params.facturaDirecta[j].items?.[0]?.clase || null;

                    if (params.agrupador) { facturaDirecta.setValue({ fieldId: 'custbody_ht_cod_agru', value: params.agrupador }); }
                    facturaDirecta.setValue({ fieldId: 'trandate', value: new Date() });
                    facturaDirecta.setValue({ fieldId: 'memo', value: params.glosa });
                    if (headerDept) { facturaDirecta.setValue({ fieldId: 'department', value: headerDept }); }
                    if (headerClass) { facturaDirecta.setValue({ fieldId: 'class', value: headerClass }); }
                    facturaDirecta.setValue({ fieldId: 'location', value: params.ubicacion });
                    facturaDirecta.setValue({ fieldId: 'approvalstatus', value: 2 });
                    facturaDirecta.setValue({ fieldId: 'currency', value: params.currency });

                    facturaDirecta.setValue({ fieldId: 'custbody_pe_document_type', value: params.tipo_doc });
                    facturaDirecta.setValue({ fieldId: 'terms', value: params.terminoPago });
                    facturaDirecta.setValue({ fieldId: 'custbodyec_nota_cliente', value: params.notaFactura });
                    facturaDirecta.setValue({ fieldId: 'custbody_ht_status_process_group', value: PENDIENTE });

                    facturaDirecta.setValue({ fieldId: 'custbody_pe_ei_forma_pago', value: params.forma_pago });
                    facturaDirecta.setValue({ fieldId: 'custbody_pe_concept_detraction', value: params.concept_detraction });
                    facturaDirecta.setValue({ fieldId: 'custbody_pe_ei_operation_type', value: params.tipo_operacion });
                    facturaDirecta.setValue({ fieldId: 'custbody_pe_serie', value: params.serie });
                    if (params.gratutita != 'F') {
                        facturaDirecta.setValue({ fieldId: 'custbody_pe_free_operation', value: true });
                        facturaDirecta.setValue({ fieldId: 'discountitem', value: 47451 });
                    }
                    let witaxCode;
                    if (params.concept_detraction != 1) {
                        let currencyname = facturaDirecta.getText({ fieldId: 'currency' });
                        witaxCode = getWitaxCode(params.concept_detraction, currencyname);
                    }
                    try { updateCabLog({ idCabLog: idCabLog, porcentaje: '30%' }); } catch (error) { log.error('generarFacturaDirecta', error); }

                    for (let i = 0; i < params.facturaDirecta[j].items.length; i++) {
                        facturaDirecta.selectNewLine({ sublistId: 'item' });
                   /*     if (params.facturaDirecta[j].items[i].item_f) {
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: params.facturaDirecta[j].items[i].item_f });
                        } else {
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: params.facturaDirecta[j].items[i].id });
                        }
                    */
                        let itemId = params.facturaDirecta[j].items[i].item_f || params.facturaDirecta[j].items[i].id;
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });

                      
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'units', value: params.facturaDirecta[j].items[i].unidad });
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: params.facturaDirecta[j].items[i].cantidad });
                        facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: params.facturaDirecta[j].items[i].price });
                        if (params.facturaDirecta[j].items[i].price == '-1') {
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: params.facturaDirecta[j].items[i].rate });
                        }

                        const lineDept = params.facturaDirecta[j].items[i].departamento || headerDept;
                        const lineClass = params.facturaDirecta[j].items[i].clase || headerClass;
                        const lineLoc = params.facturaDirecta[j].items[i].oficina || params.ubicacion;

                        if (lineDept) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', value: lineDept }); }
                        if (lineClass) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: lineClass }); }
                        if (lineLoc) { facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: lineLoc }); }
                        if (params.concept_detraction != 1) {
                            var totalline = facturaDirecta.getCurrentSublistValue({ sublistId: 'item', fieldId: 'amount' });
                            totalline = (parseFloat(totalline) + parseFloat(totalline * 0.18)).toFixed(2);
                            let totalporcentaje = witaxCode.percentageDetraction;
                            let porcentaje = totalporcentaje.replace('%', '') / 100;
                            let totalretenciones = totalline * porcentaje;
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxapplies', value: true });
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: witaxCode.taxCodes });
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxbaseamount', value: parseFloat(totalline) * -1 });
                            facturaDirecta.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxamount', value: totalretenciones.toFixed(2) });
                        }

                        // Mantener la clasificación por línea ya asignada arriba
                        facturaDirecta.commitLine({ sublistId: 'item' });
                    }
                    let facturaDirectaId = facturaDirecta.save();
                  
                    //log.debug('Procesando Factura Interna', `ID: ${facturaInternaId} | Directa: ${facturaDirectaId}`);
                  
                    facturaarray.push(facturaDirectaId);
                  
                    for (let i = 0; i < params.facturasSeleccionadas.length; i++) {

                        // DEFINICIÓN DE VARIABLES PARA EVITAR REFERENCE ERROR
                        let facturaInternaId = params.facturasSeleccionadas[i].id;
                        let creadoDesdeId = params.facturasSeleccionadas[i].creado_desde;
                        let facturarIdParam = params.facturasSeleccionadas[i].facturar_id;
                        let itemParam = params.facturasSeleccionadas[i].items;

                        log.debug('Procesando Vinculación', `Interna: ${facturaInternaId} -> Directa: ${facturaDirectaId}`);

                    
                        let loadRecord = record.load({ 
                          type: 'customsale_ec_factura_interna', 
                          id: params.facturasSeleccionadas[i].id,
                          isDynamic: true 
                        });
                        //const linkscount = loadRecord.getLineCount({ sublistId: 'item' });
                        const custbody_ht_facturar_a = loadRecord.getValue({ fieldId: 'custbody_ht_facturar_a' });
                        if (parseFloat(custbody_ht_facturar_a) == parseFloat(params.facturasSeleccionadas[i].facturar_id)) {
                            loadRecord.setValue({ fieldId: 'custbody_ht_factura_directa', value: facturaDirectaId });

                            // Solo intentar actualizar Sales Order si el ID existe
                            if (creadoDesdeId) {
                                try {
                                    record.submitFields({ 
                                    type: record.Type.SALES_ORDER, 
                                    id: creadoDesdeId, 
                                    values: { custbody_ht_factura_directa: facturaDirectaId } 
                                    });
                                } catch (e) {
                                   log.error('Error al actualizar Sales Order', `ID ${creadoDesdeId}: ${e.message}`);
                                }
                            }
                          
                          //  record.submitFields({ type: record.Type.SALES_ORDER, id: params.facturasSeleccionadas[i].creado_desde, values: { custbody_ht_factura_directa: facturaDirectaId } });

                            let nuevoRegistro = record.create({ type: 'customrecord_ht_fact_internas_asociadas', isDynamic: true });
                            nuevoRegistro.setValue({ fieldId: 'custrecord_nro_factura', value: facturaDirectaId });
                            // nuevoRegistro.setValue({ fieldId: 'custrecord_nro_factura_interna', value: params.facturasSeleccionadas[i].id });
                            nuevoRegistro.setValue({ fieldId: 'custrecord_nro_factura_interna', value: facturaInternaId });
                            if (creadoDesdeId) {
                                nuevoRegistro.setValue({ fieldId: 'custrecord_orden_servicio', value: params.facturasSeleccionadas[i].creadoDesdeId });
                            }
                            nuevoRegistro.save({ enableSourcing: false, ignoreMandatoryFields: false });
                        }

                        // Actualizar columna en la sublista
                        const linkscount = loadRecord.getLineCount({ sublistId: 'item' });
                      
                        for (let index = 0; index < linkscount; index++) {
                          let item = loadRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: index });
                            if (parseFloat(item) == parseFloat(params.facturasSeleccionadas[i].items) && parseFloat(custbody_ht_facturar_a) == parseFloat(params.facturasSeleccionadas[i].facturar_id)) {
                                loadRecord.selectLine({ sublistId: 'item', line: index });
                                loadRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_fac_agru', value: facturaDirectaId });
                                loadRecord.commitLine({ sublistId: 'item' });
                            }
                        }
                        loadRecord.save({ ignoreMandatoryFields: true });
                    }
                }

                try { updateCabLog({ idCabLog: idCabLog, porcentaje: '100%' }); } catch (error) { log.error('generarFacturaDirecta', error); }

                let fileObjContent = file.load({ id: id_cola.parametros });
                const contentResults = JSON.parse(fileObjContent.getContents());
                contentResults.facturaDirectaid = facturaarray;
                let returnFileId = saveJson(contentResults, fileObjContent.name, inputfolder)
                id_cola.facturaDirectaid = facturaarray
                taskScheduled(id_cola)

                try { updateCabLog({ idCabLog: idCabLog, porcentaje: '100%', estado: 'Finalizado', idFacturaDirecta: facturaarray, fechaFin: true, errores: 'OK' }); updateCola({ id: id_cola.id, estado: 'Completado' }) } catch (error) { log.error('generarFacturaDirecta', error); }
                respuesta = { id: facturaarray };
                return respuesta;
            } catch (error) {
                log.error('generarFacturaDirecta', error);
                try { updateCabLog({ idCabLog: idCabLog, porcentaje: '100%', estado: 'Error', fechaFin: true, errores: error }); updateCola({ id: id_cola.id, estado: 'Error', errores: error }) } catch (error) { log.error('generarFacturaDirecta', error); }
            }
        }

        const getWitaxCode = (conceptDetraction, currencyName) => {
            try {
                let objSearch = search.create({ type: "customrecord_pe_concept_detraction", filters: [["internalid", "anyof", conceptDetraction]], columns: [search.createColumn({ name: "name" }), search.createColumn({ name: "custrecord_pe_code_detraccion" }), search.createColumn({ name: "custrecord_pe_percentage_detraction" }), search.createColumn({ name: "custrecord_pe_tax_codes_pen" }), search.createColumn({ name: "custrecord_pe_tax_codes_dol" })] });
                const searchResult = objSearch.run().getRange(0, 1);
                let column01 = currencyName == 'Soles' ? searchResult[0].getValue(objSearch.columns[3]) : searchResult[0].getValue(objSearch.columns[4]);
                return { taxCodes: column01, percentageDetraction: searchResult[0].getValue(objSearch.columns[2]) };
            } catch (error) {
                log.error('Error-getWitaxCode', error)
            }
        }

        const updateCabLog = (params) => {
            try {
                let cabLog = record.load({ type: 'customrecord_ts_log_ejec_agrup_fact_pe', id: params.idCabLog });
                cabLog.setValue({ fieldId: 'custrecord_ts_porcentaje_pe', value: params.porcentaje });
                cabLog.setValue({ fieldId: 'custrecord_ts_error_pe', value: params.errores });
                if (params.estado) { cabLog.setValue({ fieldId: 'custrecord_ts_estado_pe', value: params.estado }) }
                if (params.fechaFin) { cabLog.setValue({ fieldId: 'custrecord_ts_fecha_fin_pe', value: new Date() }) }
                if (params.idFacturaDirecta) { cabLog.setValue({ fieldId: 'custrecord_ts_fact_direct_pe', value: params.idFacturaDirecta }) }
                cabLog.save();
            } catch (error) {
                log.error('updateCabLog', error);
            }
        }

        const getCola = () => {
            try {
                let respuesta = new Array();
                var customrecord_ts_standar_ss_colaSearchObj = search.create({ type: "customrecord_ts_standar_ss_cola_pe", filters: [["custrecord_ts_ss_estado_pe", "is", "pendiente"]], columns: [search.createColumn({ name: "internalId" }), search.createColumn({ name: "custrecord_ts_ss_fecha_inicio_pe" }), search.createColumn({ name: "custrecord_ts_ss_parametros_pe" })] });
                var searchResultCount = customrecord_ts_standar_ss_colaSearchObj.runPaged().count;
                customrecord_ts_standar_ss_colaSearchObj.run().each(function (result) {
                    respuesta.push({ id: result.getValue({ name: 'internalId' }), ejecucionesPendientes: searchResultCount, fechaInicio: result.getValue({ name: 'custrecord_ts_ss_fecha_inicio_pe' }), parametros: result.getValue({ name: 'custrecord_ts_ss_parametros_pe' }) });
                    return true;
                });
                respuesta.sort((a, b) => { return new Date(a.fechaInicio) - new Date(b.fechaInicio); });
                return respuesta;
            } catch (e) {
                log.error('getCola Error', e);
            }
        }

        const updateCola = (params) => {
            try {
                let cola = record.load({ type: 'customrecord_ts_standar_ss_cola_pe', id: params.id });
                cola.setValue({ fieldId: 'custrecord_ts_ss_estado_pe', value: params.estado });
                cola.setValue({ fieldId: 'custrecord_ts_ss_fecha_fin_pe', value: new Date() });
                if (params.errores) { cola.setValue({ fieldId: 'custrecord_ts_ss_error_pe', value: params.errores }) }
                cola.save();
            } catch (error) {
                log.error('updateCola', error);
            }
        }

        const taskScheduled = (objSendData) => {
            try {
                let scriptTask = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT, scriptId: 'customscript_ts_ss_agrupacion_factura_os', deploymentId: 'customdeploy_ts_ss_agrupacion_factura_os', params: { custscriptts_ss_agrup_fac_par_pe: '{}', custscript_ts_ss_agrup_fac_slect_fact_pe: 't' } });
                scriptTask.submit();
            } catch (error) {
                log.error('Error-taskScheduled', error);
              // Verifique que el ID exista antes de llamar a submitFields
              if (recordIdToUpdate) {
                record.submitFields({ type: LOG_RECORD, 
                                     id: recordId, 
                                     values: { custrecord_ts_ss_estado_asociar_fac_pe: PENDIENTE } });
                } else {
             log.error('Error Crítico', 'No se pudo actualizar el log/cola. Falta el ID del registro de cola.');
        }
            }
        }

        const saveJson = (contents, nombre, folder) => {
            let fileObj = file.create({ name: nombre, fileType: file.Type.JSON, contents: JSON.stringify(contents), folder: folder, isOnline: false });
            return fileObj.save();
        }

        return { execute }

    });