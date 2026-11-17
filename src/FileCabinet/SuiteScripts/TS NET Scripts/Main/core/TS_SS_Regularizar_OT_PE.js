/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript

 */
define([
    "N/record",
    "N/search",
    "N/log",
    "N/runtime",
    "N/task",
    "N/cache",
    "SuiteScripts/TS NET Scripts/Main/controller/TS_CM_Controller_PE",
    "SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant",
], (record, search, log, runtime, task, cache, _controller, _constant) => {

    const CONFIG = {

        SO_IDS: ["5606926"],

        DATE_FROM: "",
        DATE_TO: "",

        DRY_RUN: true,

        REGENERAR_WO: false,

        PAGE_SIZE: 200,

        RESET_RESUME: false,
    };

    const SO_FORMS = [
        String(_constant.Form.EC_ORDENES_DE_SERVICIOS),
        String(_constant.Form.PE_ORDENES_DE_SERVICIOS),
    ];
    const GOVERNANCE_FLOOR = 1000;
    const CACHE_NAME = "ts_ss_regularizar_ot_pe";
    const CACHE_KEY_PAGE_INDEX = "pageIndex";

    const getResumeCache = () => cache.getCache({ name: CACHE_NAME, scope: cache.Scope.PRIVATE });

    const getPageIndex = () => {
        if (CONFIG.RESET_RESUME) return 0;
        const value = getResumeCache().get({ key: CACHE_KEY_PAGE_INDEX });
        return value ? Number(value) : 0;
    };

    const setPageIndex = (value) => {
        getResumeCache().put({ key: CACHE_KEY_PAGE_INDEX, value: String(value), ttl: 60 * 60 * 24 });
    };

    const getParams = () => ({
        soIds: CONFIG.SO_IDS && CONFIG.SO_IDS.length ? CONFIG.SO_IDS : null,
        dateFrom: CONFIG.DATE_FROM,
        dateTo: CONFIG.DATE_TO,
        dryRun: CONFIG.DRY_RUN,
        regenerarWo: CONFIG.REGENERAR_WO,
        pageSize: CONFIG.PAGE_SIZE,
        pageIndex: getPageIndex(),
    });

    const buildSalesOrderSearch = (params) => {
        const filters = [
            ["type", "anyof", "SalesOrd"],
            "AND",
            ["mainline", "is", "T"],
            "AND",
            ["customform", "anyof", SO_FORMS],
        ];
        if (params.soIds) {
            filters.push("AND", ["internalid", "anyof", params.soIds]);
        } else {
            if (params.dateFrom) filters.push("AND", ["trandate", "onorafter", params.dateFrom]);
            if (params.dateTo) filters.push("AND", ["trandate", "onorbefore", params.dateTo]);
        }
        return search.create({
            type: "salesorder",
            filters: filters,
            columns: [search.createColumn({ name: "internalid", sort: search.Sort.ASC })],
        });
    };

    const buscarOTExistente = (soId, itemId) => {
        let otId = null;
        search
            .create({
                type: _constant.customRecord.ORDEN_TRABAJO,
                filters: [
                    ["custrecord_ht_ot_orden_servicio", "anyof", soId],
                    "AND",
                    ["custrecord_ht_ot_item", "anyof", itemId],
                ],
                columns: ["internalid"],
            })
            .run()
            .each((result) => {
                otId = result.id;
                return false;
            });
        return otId;
    };

    const buscarWorkOrderExistente = (soId, itemId) => {
        let woId = null;
        search
            .create({
                type: "workorder",
                filters: [
                    ["type", "anyof", "WorkOrd"],
                    "AND",
                    ["createdfrom", "anyof", soId],
                    "AND",
                    ["item", "anyof", itemId],
                ],
                columns: ["internalid"],
            })
            .run()
            .each((result) => {
                woId = result.id;
                return false;
            });
        return woId;
    };

    const contarItemsRelacionados = (itemId) => {
        return search
            .create({
                type: "customrecord_ht_pp_main_item_relacionado",
                filters: [["custrecord_ht_pp_parametrizacionir", "anyof", itemId]],
                columns: ["internalid"],
            })
            .runPaged().count;
    };

    const esRespuestaIdValido = (valor) => {
        return typeof valor === "number" || (typeof valor === "string" && /^\d+$/.test(valor));
    };

    const buscarItemsVinculadosParaOT = (itemVentaId) => {
        return search
            .create({
                type: "item",
                filters: [
                    ["custitem_ec_item_agrupado", "anyof", itemVentaId],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    [
                        ["type", "anyof", "InvtPart"],
                        "OR",
                        [["type", "anyof", "Assembly"], "AND", ["isserialitem", "is", "T"]],
                    ],
                ],
                columns: [search.createColumn({ name: "internalid", sort: search.Sort.ASC })],
            })
            .run()

            .getRange({ start: 0, end: 2 })
            .map((result) => result.id);
    };

    const esBienGenerico = (bienId) => {
        if (!bienId) return false;
        try {
            const bien = search.lookupFields({
                type: _constant.customRecord.BIENES,
                id: bienId,
                columns: ["custrecord_ht_bien_generico"],
            });
            return !!bien.custrecord_ht_bien_generico;
        } catch (error) {
            log.error("Regularizar-Bien-Error", { bienId: bienId, error: error.message });
            return false;
        }
    };

    const regularizarOrdenDeVenta = (soId, params) => {
        const detalle = [];
        const so = record.load({ type: "salesorder", id: soId, isDynamic: false });

        const customer = so.getValue({ fieldId: "entity" });
        const vehiculo = so.getValue({ fieldId: "custbody_ht_so_bien" });
        const ordenServicioTxt = so.getValue({ fieldId: "tranid" });
        const comentario = so.getValue({ fieldId: "custbody_ht_os_consideracion" });
        const numLines = so.getLineCount({ sublistId: "item" });
        const isGenerico = esBienGenerico(vehiculo);

        let huboCambiosEnLinea = false;
        const itemsVinculadosPorItem = {};

        for (let i = 0; i < numLines; i++) {
            const itemVentaId = so.getSublistValue({ sublistId: "item", fieldId: "item", line: i });
            if (!itemVentaId) continue;
            let itemId = itemVentaId;

            try {
                const itemType = so.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i });

                if (itemType === "NonInvtPart") {
                    if (!Object.prototype.hasOwnProperty.call(itemsVinculadosPorItem, itemVentaId)) {
                        itemsVinculadosPorItem[itemVentaId] = buscarItemsVinculadosParaOT(itemVentaId);
                    }
                    const itemsVinculados = itemsVinculadosPorItem[itemVentaId];
                    if (itemsVinculados.length !== 1) {
                        detalle.push({
                            line: i,
                            item: itemVentaId,
                            accion: itemsVinculados.length === 0 ? "OT_SIN_ITEM_VINCULADO" : "OT_ITEM_VINCULADO_AMBIGUO",
                            candidatos: itemsVinculados,
                            nota: "Se requiere un unico inventariable o ensamble serializado activo con custitem_ec_item_agrupado igual al item de la OV.",
                        });
                        continue;
                    }
                    itemId = itemsVinculados[0];
                    detalle.push({ line: i, item: itemId, itemVenta: itemVentaId, accion: "OT_ITEM_VINCULADO" });
                }

                const got = _controller.getParameter(itemId, _constant.Codigo_parametro.COD_GOT_GENERA_SOLICITUD_DE_TRABAJO);
                const vot = _controller.getParameter(itemId, _constant.Codigo_parametro.COD_VOT_VARIAS_ORDENES_DE_TRABAJO);
                const generaGot = got.codigo === _constant.Codigo_Valor.COD_SI;
                const generaVot = vot.codigo === _constant.Codigo_Valor.COD_SI;

                let otIdLinea = null;

                if ((generaGot || generaVot) && !isGenerico) {

                    const otExistente = buscarOTExistente(soId, [itemVentaId, itemId]);
                    otIdLinea = otExistente;

                    const itemsRelacionados = generaVot && !generaGot ? contarItemsRelacionados(itemId) : null;

                    if (otExistente) {
                        detalle.push({ line: i, item: itemId, accion: "OT_YA_EXISTE", otId: otExistente });
                    } else if (itemsRelacionados === 0) {
                        detalle.push({
                            line: i,
                            item: itemId,
                            accion: "VOT_SIN_ITEMS_RELACIONADOS",
                            nota: "El item tiene VOT=SI pero no tiene items relacionados en customrecord_ht_pp_main_item_relacionado; revisar parametrizacion antes de reintentar.",
                        });
                    } else if (params.dryRun) {
                        detalle.push({
                            line: i,
                            item: itemId,
                            accion: "OT_PENDIENTE (dry-run)",
                            viaParametro: generaGot ? "GOT" : "VOT",
                            itemsRelacionados: itemsRelacionados,
                        });
                    } else {
                        const json = {
                            serviceOrder: soId.toString(),
                            customer: customer ? customer.toString() : "",
                            vehiculo: vehiculo,
                            item: parseInt(itemId, 10),
                            ordenServicio: ordenServicioTxt,
                            comentario: comentario,
                            tipoProd: 0,
                            tipoTrab: 0,
                        };
                        const codigoParametro = generaGot
                            ? _constant.Codigo_parametro.COD_GOT_GENERA_SOLICITUD_DE_TRABAJO
                            : _constant.Codigo_parametro.COD_VOT_VARIAS_ORDENES_DE_TRABAJO;
                        try {
                            const otId = _controller.parametros(codigoParametro, json);
                            if (esRespuestaIdValido(otId)) {
                                otIdLinea = otId;
                                detalle.push({ line: i, item: itemId, accion: "OT_CREADA", otId: otId });
                                log.audit("Regularizar-OT-Creada", { soId: soId, item: itemId, otId: otId });
                            } else {
                                detalle.push({ line: i, item: itemId, accion: "OT_NO_GENERADA", respuesta: otId });
                                log.error("Regularizar-OT-No-Generada", { soId: soId, item: itemId, respuesta: otId });
                            }
                        } catch (errorOt) {
                            detalle.push({ line: i, item: itemId, accion: "OT_ERROR", error: errorOt.message });
                            log.error("Regularizar-OT-Error", { soId: soId, item: itemId, error: errorOt });
                        }
                    }
                }

                if (params.regenerarWo && itemType === "NonInvtPart" && (generaGot || generaVot) && !isGenerico) {
                    detalle.push({
                        line: i,
                        item: itemId,
                        itemVenta: itemVentaId,
                        accion: "WO_REQUIERE_LINEA_ENSAMBLE",
                        nota: "La OT usa el item vinculado. La WO nativa requiere una linea de ensamble en la OV; no se modifica la linea no inventariable.",
                    });
                }

                if (params.regenerarWo && itemType === "Assembly" && (generaGot || generaVot) && !isGenerico) {
                    const woExistente = buscarWorkOrderExistente(soId, itemId);

                    if (woExistente) {
                        detalle.push({ line: i, item: itemId, accion: "WO_YA_EXISTE", woId: woExistente });
                    } else if (params.dryRun) {
                        detalle.push({ line: i, item: itemId, accion: "WO_PENDIENTE (dry-run)" });
                    } else {

                        const ordenEnAprobacion = so.getValue({ fieldId: "orderstatus" }) === "A";

                        if (ordenEnAprobacion) {
                            so.setSublistValue({ sublistId: "item", fieldId: "createwo", line: i, value: true });
                            huboCambiosEnLinea = true;
                            detalle.push({ line: i, item: itemId, accion: "WO_MARCADA_CREATEWO" });
                        } else {
                            try {
                                const lineNumber = so.getSublistValue({ sublistId: "item", fieldId: "line", line: i });
                                const quantity = so.getSublistValue({ sublistId: "item", fieldId: "quantity", line: i }) || 1;
                                const location = so.getSublistValue({ sublistId: "item", fieldId: "location", line: i });

                                const workOrder = record.create({
                                    type: record.Type.WORK_ORDER,
                                    isDynamic: true,
                                    defaultValues: { soid: soId, soline: lineNumber, specord: "T", assemblyitem: itemId },
                                });
                                workOrder.setValue({ fieldId: "quantity", value: quantity });
                                if (location) workOrder.setValue({ fieldId: "location", value: location });
                                if (otIdLinea) workOrder.setValue({ fieldId: "custbody_ht_ce_ordentrabajo", value: otIdLinea });

                                const woId = workOrder.save();

                                if (otIdLinea) {
                                    record.submitFields({
                                        type: _constant.customRecord.ORDEN_TRABAJO,
                                        id: otIdLinea,
                                        values: { custrecord_ht_ot_ordenfabricacion: woId },
                                        options: { enableSourcing: false, ignoreMandatoryFields: true },
                                    });
                                }

                                const woValidada = buscarWorkOrderExistente(soId, itemId);
                                if (woValidada) {
                                    detalle.push({ line: i, item: itemId, accion: "WO_CREADA", woId: woId, otId: otIdLinea });
                                    log.audit("Regularizar-WO-Creada", { soId: soId, item: itemId, woId: woId, otId: otIdLinea });
                                } else {
                                    detalle.push({ line: i, item: itemId, accion: "WO_NO_VALIDADA", woId: woId });
                                    log.error("Regularizar-WO-No-Validada", { soId: soId, item: itemId, woId: woId });
                                }
                            } catch (errorWo) {
                                detalle.push({ line: i, item: itemId, accion: "WO_ERROR", error: errorWo.message });
                                log.error("Regularizar-WO-Error", { soId: soId, item: itemId, error: errorWo });
                            }
                        }
                    }
                }
            } catch (errorLinea) {
                detalle.push({ line: i, item: itemId, itemVenta: itemVentaId, accion: "LINEA_ERROR", error: errorLinea.message });
                log.error("Regularizar-Linea-Error", { soId: soId, line: i, item: itemId, itemVenta: itemVentaId, error: errorLinea });
            }
        }

        if (huboCambiosEnLinea && !params.dryRun) {
            try {
                so.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.audit("Regularizar-WO-Save-OK", { soId: soId });
            } catch (errorSave) {
                log.error("Regularizar-WO-Save-Error", { soId: soId, error: errorSave });
                detalle.push({ accion: "SAVE_ERROR", error: errorSave.message });
            }
        }

        return detalle;
    };

    const reprogramar = (nextPageIndex) => {
        try {
            setPageIndex(nextPageIndex);
            const script = runtime.getCurrentScript();
            const t = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
            t.scriptId = script.id;
            t.deploymentId = script.deploymentId;
            t.submit();
            log.audit("Regularizar-Reprogramado", { nextPageIndex: nextPageIndex });
        } catch (error) {
            log.error("Regularizar-Reprogramar-Error", error);
        }
    };

    const execute = (scriptContext) => {
        const script = runtime.getCurrentScript();
        const params = getParams();
        log.audit("Regularizar-Inicio", {
            ...params,
            version: "2026-10-13.2",
            scriptId: script.id,
            deploymentId: script.deploymentId,
        });

        const resumen = {
            procesadas: 0,
            otCreadas: 0,
            otExistentes: 0,
            otNoGeneradas: 0,
            otSinItemsRelacionados: 0,
            otSinItemVinculado: 0,
            otItemVinculadoAmbiguo: 0,
            otErrores: 0,
            woMarcadas: 0,
            woExistentes: 0,
            woCreadas: 0,
            woNoValidadas: 0,
            woErrores: 0,
            lineasConError: 0,
        };

        const searchObj = buildSalesOrderSearch(params);
        const pagedData = searchObj.runPaged({ pageSize: params.pageSize });
        const totalPages = pagedData.pageRanges.length;

        if (totalPages === 0) {
            log.audit("Regularizar-Fin", "No hay Ordenes de Venta que coincidan con los filtros.");
            return;
        }
        if (params.pageIndex >= totalPages) {
            log.audit("Regularizar-Fin", "No quedan paginas por procesar.");
            return;
        }

        const page = pagedData.fetch({ index: params.pageIndex });

        for (let i = 0; i < page.data.length; i++) {
            if (script.getRemainingUsage() < GOVERNANCE_FLOOR) {
                reprogramar(params.pageIndex);
                log.audit("Regularizar-Pausa-Por-Gobernancia", { paginaActual: params.pageIndex, resumenParcial: resumen });
                return;
            }

            const soId = page.data[i].getValue({ name: "internalid" });
            try {
                const detalle = regularizarOrdenDeVenta(soId, params);
                resumen.procesadas++;
                detalle.forEach((d) => {
                    if (d.accion === "OT_CREADA") resumen.otCreadas++;
                    if (d.accion === "OT_YA_EXISTE") resumen.otExistentes++;
                    if (d.accion === "OT_NO_GENERADA") resumen.otNoGeneradas++;
                    if (d.accion === "VOT_SIN_ITEMS_RELACIONADOS") resumen.otSinItemsRelacionados++;
                    if (d.accion === "OT_SIN_ITEM_VINCULADO") resumen.otSinItemVinculado++;
                    if (d.accion === "OT_ITEM_VINCULADO_AMBIGUO") resumen.otItemVinculadoAmbiguo++;
                    if (d.accion === "OT_ERROR") resumen.otErrores++;
                    if (d.accion === "WO_MARCADA_CREATEWO") resumen.woMarcadas++;
                    if (d.accion === "WO_YA_EXISTE") resumen.woExistentes++;
                    if (d.accion === "WO_CREADA") resumen.woCreadas++;
                    if (d.accion === "WO_NO_VALIDADA") resumen.woNoValidadas++;
                    if (d.accion === "WO_ERROR") resumen.woErrores++;
                    if (d.accion === "LINEA_ERROR") resumen.lineasConError++;
                });
                log.debug("Regularizar-Detalle-OV", { soId: soId, detalle: detalle });
            } catch (errorSo) {
                resumen.otErrores++;
                log.error("Regularizar-OV-Error", { soId: soId, error: errorSo });
            }
        }

        if (params.pageIndex + 1 < totalPages) {
            reprogramar(params.pageIndex + 1);
        }

        log.audit("Regularizar-Resumen", resumen);
    };

    return { execute: execute };
});
