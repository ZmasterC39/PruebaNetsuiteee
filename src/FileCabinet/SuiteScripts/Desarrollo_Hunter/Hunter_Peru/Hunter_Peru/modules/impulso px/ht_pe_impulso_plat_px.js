/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @scriptid customscript_ht_pe_impulso_plat_px
 * @deployment customdeploy_ht_pe_impulso_plat_px
 * cambio JMON 14/12/2025
 */
define([
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    'SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant',
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller'
], (log, record, runtime, search, _constant, _platformControllerLatam) => {

    /**
     * Envuelve la respuesta del controller PX para obtener siempre detalle.
     */
    const wrapPxResponse = (rawResponse, payload) => {
        let status = false;
        let mensaje = '';
        let respuesta = rawResponse;
        let detalle = payload || null;
        let raw = rawResponse;
        try {
            if (typeof rawResponse === 'string') {
                try {
                    const parsed = JSON.parse(rawResponse);
                    if (parsed && typeof parsed === 'object') {
                        respuesta = parsed;
                        if (parsed.status !== undefined) status = parsed.status === true || parsed.status === 'true';
                        if (parsed.mensaje) mensaje = parsed.mensaje;
                        if (parsed.detalle) detalle = parsed.detalle;
                        if (!status && parsed.PxAdmin && parsed.PxAdmin.Respuesta === '1') status = true;
                    }
                } catch (e) {
                    status = rawResponse === '1';
                    mensaje = status ? '' : rawResponse;
                }
            // cambio JMON 15/12/2025: si el controller devuelve booleano
            } else if (rawResponse === true || rawResponse === false) {
                status = rawResponse === true;
            } else if (typeof rawResponse === 'object' && rawResponse !== null) {
                if (rawResponse.status !== undefined) {
                    status = rawResponse.status === true || rawResponse.status === 'true';
                    mensaje = rawResponse.mensaje || '';
                    respuesta = rawResponse.respuesta !== undefined ? rawResponse.respuesta : rawResponse;
                    detalle = rawResponse.detalle || detalle;
                } else {
                    respuesta = rawResponse;
                }
                if (!status && rawResponse.PxAdmin && rawResponse.PxAdmin.Respuesta === '1') status = true;
                if (!detalle && rawResponse.PxAdmin) detalle = rawResponse;
            } else if (rawResponse === 1) {
                status = true;
            }
        } catch (e) {
            mensaje = e.message;
        }
        return { status, mensaje, respuesta, detalle, raw };
    };

    const getAdpFromItem = (itemId) => {
        if (!itemId) return null;
        const adpParam = _constant.Parameter && _constant.Parameter.ADP_ACCION_DEL_PRODUCTO;
        if (!adpParam) return null;
        const srch = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacionid', 'anyof', itemId],
                'AND',
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', adpParam]
            ],
            columns: [
                search.createColumn({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR' }),
                search.createColumn({ name: 'custrecord_ht_pp_parametrizacion_valor' })
            ]
        });
        const res = srch.run().getRange({ start: 0, end: 1 });
        if (res && res.length) {
            return res[0].getValue({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR' }) ||
                res[0].getValue('custrecord_ht_pp_parametrizacion_valor');
        }
        return null;
    };

    const getFamFromItem = (itemId) => {
        if (!itemId) return null;
        const famParam = _constant.Parameter && _constant.Parameter.FAM_FAMILIA_DE_PRODUCTOS;
        if (!famParam) return null;
        const srch = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacionid', 'anyof', itemId],
                'AND',
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', famParam]
            ],
            columns: [
                search.createColumn({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR' }),
                search.createColumn({ name: 'custrecord_ht_pp_parametrizacion_valor' })
            ]
        });
        const res = srch.run().getRange({ start: 0, end: 1 });
        if (res && res.length) {
            return res[0].getValue({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR' }) ||
                res[0].getValue('custrecord_ht_pp_parametrizacion_valor');
        }
        return null;
    };

    //cambio JHOMON 13/11/2026 - Garantia: valida si el articulo tiene PGR - PRODUCTO DE GARANTIA = SI
    const esProductoGarantia = (itemId) => {
        if (!itemId) return false;
        const pgrParam = _constant.Parameter && _constant.Parameter.PGR_PRODUCTO_DE_GARANTÍA;
        if (!pgrParam) return false;
        const srch = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacionid', 'anyof', itemId],
                'AND',
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', pgrParam],
                'AND',
                ['custrecord_ht_pp_parametrizacion_valor', 'anyof', _constant.Valor.SI]
            ],
            columns: ['internalid']
        });
        const res = srch.run().getRange({ start: 0, end: 1 }) || [];
        return res.length > 0;
    };

    const resolveAdpCode = (adpRaw) => {
        if (adpRaw === undefined || adpRaw === null) return '';
        const rawStr = String(adpRaw).trim();
        const mapById = {
            [_constant.Valor.VALOR_001_INST_DISPOSITIVO]: '001',
            [_constant.Valor.VALOR_002_DESINSTALACION_DE_DISP]: '002',
            [_constant.Valor.VALOR_003_REINSTALACION_DE_DISP]: '003',
            [_constant.Valor.VALOR_004_RENOVACION_DE_DISP]: '004',
            [_constant.Valor.VALOR_006_MANTENIMIENTO_CHEQUEO_DE_DISPOSITIVO]: '006',
            [_constant.Valor.VALOR_007_CHEQUEO_DE_COMPONENTES]: '007',
            [_constant.Valor.VALOR_010_CAMBIO_DE_PROPIETARIO]: '010',
            [_constant.Valor.VALOR_015_VENTA_SERVICIOS]: '015',
            '051': '001'
        };
        if (mapById[adpRaw]) return mapById[adpRaw];
        const parsed = parseInt(rawStr, 10);
        if (mapById[parsed]) return mapById[parsed];
        if (rawStr === '051' || parsed === 51) return '001';
        if (/^\d+$/.test(rawStr) && rawStr.length <= 3) return rawStr.padStart(3, '0');
        return rawStr;
    };


    const marcarOtsFinalizadas = (otIds, esExito) => {
        if (!esExito || !otIds || !otIds.length) return;
        otIds.forEach((otId) => {
            try {
                record.submitFields({
                    type: 'customrecord_ht_record_ordentrabajo',
                    id: otId,
                    values: {
                        custrecord_ht_ot_pxadminfinalizacion: true,
                        custrecord_ht_ot_noimpulsaplataformas: false
                    },
                    options: { enableSourcing: false, ignoreMandatoryFields: true }
                });
                log.debug('IMPULSO-PX-SCHED-MARCA', { ot: otId });
            } catch (e) {
                log.error('IMPULSO-PX-SCHED-MARCA-ERROR', { ot: otId, error: e });
            }
        });
    };

    const findOtsBySalesOrder = (soId) => {
        if (!soId) return [];
        const srch = search.create({
            type: 'customrecord_ht_record_ordentrabajo',
            filters: [['custrecord_ht_ot_orden_servicio', 'anyof', soId]],
            columns: ['internalid']
        });
        const res = srch.run().getRange({ start: 0, end: 1000 }) || [];
        return res.map((r) => r.getValue('internalid'));
    };

    const estaOtFinalizada = (otId) => {
        if (!otId) return false;
        try {
            const lookup = record.lookupFields({
                type: 'customrecord_ht_record_ordentrabajo',
                id: otId,
                columns: ['custrecord_ht_ot_pxadminfinalizacion']
            });
            return lookup && lookup.custrecord_ht_ot_pxadminfinalizacion === true;
        } catch (e) {
            log.error('IMPULSO-PX-SCHED-OT-CHECK-ERROR', { ot: otId, error: e });
            return false;
        }
    };

    const existeOtFinalizadaParaSo = (soId) => {
        const ots = findOtsBySalesOrder(soId);
        if (!ots.length) return false;
        return ots.some((otId) => estaOtFinalizada(otId));
    };

    const validarFamiliaCodigo = (familiaCodigo, subsidiaria) => {
        if (!familiaCodigo) return false;
        const srch = search.create({
            type: 'customrecord_ht_cr_pp_valores',
            filters: [
                ['custrecord_ht_pp_codigo', 'is', familiaCodigo],
                'AND',
                ['custrecord33', 'anyof', subsidiaria]
            ],
            columns: ['internalid']
        });
        const res = srch.run().getRange({ start: 0, end: 1 }) || [];
        return res.length > 0;
    };

    const execute = () => {
        try {
            const script = runtime.getCurrentScript();
            const otId = script.getParameter({ name: 'custscript_ht_pe_impulso_otid' });
            const soIdParam = script.getParameter({ name: 'custscript_ht_pe_impulso_soid' }); //cambio jmon 19/12/2025
            const familiaParam = script.getParameter({ name: 'custscript_ht_pe_impulso_fam' }); //cambio jmon 19/12/2025
            const subsidiariaParam = script.getParameter({ name: 'custscript_ht_pe_impulso_subs' }); //cambio jmon 19/12/2025
            if (!otId) {
                // flujo para renovaciones directas desde Sales Order (sin OT) //cambio jmon 19/12/2025
                if (soIdParam) {
                    let subs = subsidiariaParam || null;
                    let fam = familiaParam || null;
                    let adpRaw = null;
                    let soRec = null;
                    // Cargar la SO para obtener subsidiaria, familia y ADP cuando falten //cambio jmon 19/12/2025
                    if (!subs || !fam || !adpRaw) {
                        try {
                            soRec = record.load({ type: record.Type.SALES_ORDER, id: soIdParam });
                            if (!subs) subs = soRec.getValue('subsidiary') || null;
                            const firstItem = soRec.getLineCount({ sublistId: 'item' }) > 0 ? soRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 }) : null;
                            if (!fam) fam = getFamFromItem(firstItem);
                            if (!adpRaw) adpRaw = getAdpFromItem(firstItem);
                        } catch (e) {
                            log.error('IMPULSO-PX-SCHED-SO-LOAD-ERROR', e);
                        }
                    }
                    // Si no hay familia, no intentamos enviar para evitar errores en el controller
                    if (!fam) {
                        log.error('IMPULSO-PX-SCHED-SO-SIN-FAM', { so: soIdParam, motivo: 'Sin familia parametrizada' });
                        return;
                    }
                    const adpCode = resolveAdpCode(adpRaw || _constant.Valor.VALOR_004_RENOVACION_DE_DISP);
                    const payload = { so: soIdParam, subs, familia: fam, adp: adpCode };
                    log.debug('IMPULSO-PX-SCHED-START-SO', payload);
                    const hayOtFinalizada = existeOtFinalizadaParaSo(soIdParam);
                    if (hayOtFinalizada) {
                        log.debug('IMPULSO-PX-SCHED-SO-SKIP-FINALIZADA', { so: soIdParam });
                        return;
                    }
                    if ((adpCode === '004' || adpCode === '009') && !validarFamiliaCodigo(fam, subs)) {
                        log.error('IMPULSO-PX-SCHED-SO-FAM-NO-ENCONTRADA', { so: soIdParam, subs, fam, adp: adpCode });
                        return;
                    }
                    let resp;
                    if (adpCode === '009') {
                        resp = _platformControllerLatam.envioPXRenovacionSeguro(soIdParam, subs, _constant.Constants.URLPX, fam);
                    } else if (adpCode === '010') {
                        resp = _platformControllerLatam.envioPXCambioPropietario(soIdParam, subs, _constant.Constants.URLPX);
                    }else {
                        resp = _platformControllerLatam.envioPXRenovacionDispositivo(soIdParam, subs, _constant.Constants.URLPX, fam);
                    }
                    let wrapped = wrapPxResponse(resp, payload);
                    log.debug('IMPULSO-PX-SCHED-RESP-SO', wrapped);
                    const respBodySo = wrapped?.respuesta?.PxAdmin?.Respuesta || wrapped?.respuesta?.Respuesta || null;
                    const esExitoSo = wrapped.status === true || respBodySo === '1' || respBodySo === 1;
                    if (esExitoSo) {
                        const otsRelacionadas = findOtsBySalesOrder(soIdParam);
                        marcarOtsFinalizadas(otsRelacionadas, esExitoSo);
                    }
                    return;
                }
                log.debug('IMPULSO-PX-SCHED-SKIP', 'Sin parametro de OT/OS, no se ejecuta');
                return;
            }

            const ot = record.load({
                type: 'customrecord_ht_record_ordentrabajo',
                id: otId
            });
            const subsidiary = ot.getValue('custrecord_ht_ot_subsidiary');
            const soId = ot.getValue('custrecord_ht_ot_orden_servicio');
            const vehiculoId = ot.getValue('custrecord_ht_ot_vehiculo');
            const itemId = ot.getValue('custrecord_ht_ot_item');
            let familia = ot.getValue('custrecord_ht_ot_producto');
            if (!familia) {
                familia = getFamFromItem(itemId);
            }
            if (estaOtFinalizada(otId)) {
                log.debug('IMPULSO-PX-SCHED-OT-SKIP-FINALIZADA', { ot: otId, so: soId });
                return;
            }
            let adpRaw = getAdpFromItem(itemId) || _constant.Valor.VALOR_001_INST_DISPOSITIVO;
            //cambio JHOMON 13/11/2026 - Garantia: el ADP lo define el articulo relacionado (002 desinstalacion / 001-003 reinstalacion)
            const itemRelacionadoId = ot.getValue('custrecord_ht_ot_itemrelacionado');
            if (itemRelacionadoId && esProductoGarantia(itemId)) {
                const adpRelacionado = resolveAdpCode(getAdpFromItem(itemRelacionadoId));
                if (adpRelacionado === '002') {
                    adpRaw = _constant.Valor.VALOR_002_DESINSTALACION_DE_DISP;
                } else if (adpRelacionado === '001' || adpRelacionado === '003') {
                    adpRaw = _constant.Valor.VALOR_001_INST_DISPOSITIVO;
                }
                log.debug('IMPULSO-PX-SCHED-GARANTIA', { ot: otId, itemRelacionado: itemRelacionadoId, adpRelacionado });
            }
            const adpCode = resolveAdpCode(adpRaw) || '001';

            const payload = {
                ot: otId,
                so: soId,
                vehiculo: vehiculoId,
                subs: subsidiary,
                adp: adpCode,
                item: itemId,
                familia
            };

            log.debug('IMPULSO-PX-SCHED-START', payload);

            if ((adpCode === '004' || adpCode === '009') && !familia) {
                log.error('IMPULSO-PX-SCHED-SIN-FAM-OT', { ot: otId, so: soId, adp: adpCode, item: itemId });
                return;
            }
            if ((adpCode === '004' || adpCode === '009') && !validarFamiliaCodigo(familia, subsidiary)) {
                log.error('IMPULSO-PX-SCHED-OT-FAM-NO-ENCONTRADA', { ot: otId, so: soId, adp: adpCode, familia, subsidiary });
                return;
            }

            let resp;
            switch (adpCode) {
                case '002':
                    resp = _platformControllerLatam.envioPXDesinstalacionDispositivo(otId, subsidiary, _constant.Constants.URLPX);
                    break;
                case '003':
                    resp = _platformControllerLatam.envioPXReinstalacionDispositivo(otId, subsidiary, _constant.Constants.URLPX);
                    break;
                case '004':
                    resp = _platformControllerLatam.envioPXRenovacionDispositivo(soId, subsidiary, _constant.Constants.URLPX, familia);
                    break;
                case '009':
                    resp = _platformControllerLatam.envioPXRenovacionSeguro(soId, subsidiary, _constant.Constants.URLPX, familia);
                    break;
                case '006':
                    // Enviar activo fijo vacio para este impulso
                    resp = _platformControllerLatam.envioPXMantenimientoChequeoDispositivo(otId, subsidiary, _constant.Constants.URLPX, "");
                    break;
                case '007':
                    resp = _platformControllerLatam.envioPXChequeoComponentes(otId, subsidiary, _constant.Constants.URLPX);
                    break;
                case '010':
                    resp = _platformControllerLatam.envioPXCambioPropietario(soId, subsidiary, _constant.Constants.URLPX);
                    break;
                case '015':
                    resp = _platformControllerLatam.envioPXVentaServicios(otId, subsidiary, _constant.Constants.URLPX);
                    break;
                case '001':
                    resp = _platformControllerLatam.envioPXInstalacionDispositivoPeru(otId, subsidiary, _constant.Constants.URLPX);
                    break;
                default:
                    log.error('IMPULSO-PX-SCHED-NO-ADP', { ot: otId, adp: adpCode });
                    resp = { status: false, mensaje: `ADP no soportado (${adpCode})`, respuesta: null, detalle: payload };
                    break;
            }
            let wrapped = wrapPxResponse(resp, payload);

            log.debug('IMPULSO-PX-SCHED-RESP', wrapped);

            const respBody = wrapped?.respuesta?.PxAdmin?.Respuesta || wrapped?.respuesta?.Respuesta || null;
            const esExito = wrapped.status === true || respBody === '1' || respBody === 1;

            if (esExito) {
                marcarOtsFinalizadas([otId], esExito);
            } else {
                log.debug('IMPULSO-PX-SCHED-NO-MARCA', { ot: otId, respBody });
            }

        } catch (e) {
            log.error('IMPULSO-PX-SCHED-ERROR', { message: e.message, stack: e.stack });
        }
    };

    return { execute };
});
