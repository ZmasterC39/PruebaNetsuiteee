/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @scriptid customscript_ht_pe_ue_impulso_px_ot
 * @deployment customdeploy_ht_pe_ue_impulso_px_ot
 *
 * Impulso síncrono a PX para customrecord_ht_record_ordentrabajo, disparado directamente desde
 * este User Event (sin task.create / Scheduled Script). Solo consume
 * HU_TS_ScriptPlataformas_controller.js, nunca lo modifica. Convive con el flujo asíncrono
 * existente (TS_UE_Orden_Trabajo_PE.js -> ht_pe_impulso_plat_px.js); el guard de
 * custrecord_ht_ot_pxadminfinalizacion evita el doble envío real a la API externa.
 */
define([
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    'N/ui/message',
    'SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant',
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller'
], (log, record, runtime, search, message, _constant, _platformControllerLatam) => {

    const SUBSIDIARIA_PERMITIDA = 3;
    const RECORD_TYPE_OT = 'customrecord_ht_record_ordentrabajo';
    const RECORD_TYPE_REGISTRO = 'customrecord_ts_regis_impulso_plataforma';
    const BANNER_DURATION_MS = 5000;
    const MENSAJE_MAX_LENGTH = 4000;
    const OT_BASED_ADPS = ['001', '002', '003', '006', '007', '015'];

    const esSubsidiariaPermitida = (subsidiaria) => Number(subsidiaria) === SUBSIDIARIA_PERMITIDA;

    const wrapPxResponse = (rawResponse, payload) => {
        let status = false;
        let mensaje = '';
        let respuesta = rawResponse;
        let detalle = payload || null;
        const raw = rawResponse;
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

    const getParametrizacionItem = (itemId, parametroId) => {
        if (!itemId || !parametroId) return null;
        try {
            const srch = search.create({
                type: 'customrecord_ht_pp_main_param_prod',
                filters: [
                    ['custrecord_ht_pp_parametrizacionid', 'anyof', itemId],
                    'AND',
                    ['custrecord_ht_pp_parametrizacion_rela', 'anyof', parametroId]
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
        } catch (e) {
            log.error('IMPULSO-PX-OT-UE-PARAM-ERROR', { itemId, parametroId, error: e.message });
        }
        return null;
    };

    const esGpgHabilitado = (itemId) => {
        const gpgParam = _constant.Parameter && _constant.Parameter.GPG_GENERA_PARAMETRIZACION_EN_GEOSYS;
        if (!gpgParam) return false;
        const valor = getParametrizacionItem(itemId, gpgParam);
        if (valor === null) return false;
        return valor === _constant.Valor.SI || String(valor) === String(_constant.Valor.SI);
    };

    const getAdpFromItem = (itemId) => {
        const adpParam = _constant.Parameter && _constant.Parameter.ADP_ACCION_DEL_PRODUCTO;
        if (!adpParam) return null;
        return getParametrizacionItem(itemId, adpParam);
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
        if (rawStr === '051') return '001';
        if (/^\d+$/.test(rawStr) && rawStr.length <= 3) return rawStr.padStart(3, '0');
        return rawStr;
    };

    const resolverAplicabilidad = (itemId) => {
        if (!itemId) return { aplica: false, adpCode: null };
        if (!esGpgHabilitado(itemId)) return { aplica: false, adpCode: null };
        const adpRaw = getAdpFromItem(itemId);
        const adpCode = resolveAdpCode(adpRaw);
        if (!adpCode || OT_BASED_ADPS.indexOf(adpCode) === -1) return { aplica: false, adpCode };
        return { aplica: true, adpCode };
    };

    const ejecutarImpulso = (adpCode, otId, subsidiary) => {
        switch (adpCode) {
            case '001':
                return _platformControllerLatam.envioPXInstalacionDispositivoPeru(otId, subsidiary, _constant.Constants.URLPX);
            case '002':
                return _platformControllerLatam.envioPXDesinstalacionDispositivo(otId, subsidiary, _constant.Constants.URLPX);
            case '003':
                return _platformControllerLatam.envioPXReinstalacionDispositivo(otId, subsidiary, _constant.Constants.URLPX);
            case '006':
                return _platformControllerLatam.envioPXMantenimientoChequeoDispositivo(otId, subsidiary, _constant.Constants.URLPX, '');
            case '007':
                return _platformControllerLatam.envioPXChequeoComponentes(otId, subsidiary, _constant.Constants.URLPX);
            case '015':
                return _platformControllerLatam.envioPXVentaServicios(otId, subsidiary, _constant.Constants.URLPX);
            default:
                return null;
        }
    };

    const buscarUltimoRegistro = (otId) => {
        const srch = search.create({
            type: RECORD_TYPE_REGISTRO,
            filters: [['custrecord_ts_reg_imp_plt_ordentrabajo', 'anyof', otId]],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                'created',
                'custrecord_ts_reg_imp_plt_estado'
            ]
        });
        const res = srch.run().getRange({ start: 0, end: 1 });
        return res && res.length ? res[0] : null;
    };

    const actualizarDetalleRegistro = (otId, estadoFinal, wrapped) => {
        try {
            const ultimo = buscarUltimoRegistro(otId);
            if (!ultimo) {
                log.debug('IMPULSO-PX-OT-UE-NO-REGISTRO', { ot: otId });
                return;
            }
            const registroId = ultimo.getValue({ name: 'internalid' });
            let detalleJson = JSON.stringify({
                status: wrapped.status,
                mensaje: wrapped.mensaje,
                respuesta: wrapped.respuesta,
                detalle: wrapped.detalle
            });
            if (detalleJson && detalleJson.length > MENSAJE_MAX_LENGTH) {
                detalleJson = detalleJson.substring(0, MENSAJE_MAX_LENGTH);
            }
            record.submitFields({
                type: RECORD_TYPE_REGISTRO,
                id: registroId,
                values: {
                    custrecord_ts_reg_imp_plt_estado: estadoFinal,
                    custrecord_ts_reg_imp_plt_mensaje: detalleJson
                },
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
        } catch (e) {
            log.error('IMPULSO-PX-OT-UE-REGISTRO-ERROR', { ot: otId, error: e.message });
        }
    };

    const marcarOtFinalizada = (otId) => {
        try {
            record.submitFields({
                type: RECORD_TYPE_OT,
                id: otId,
                values: {
                    custrecord_ht_ot_pxadminfinalizacion: true,
                    custrecord_ht_ot_noimpulsaplataformas: false
                },
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
        } catch (e) {
            log.error('IMPULSO-PX-OT-UE-MARCA-ERROR', { ot: otId, error: e.message });
        }
    };

    const procesarImpulso = (otId) => {
        try {
            const ot = record.load({ type: RECORD_TYPE_OT, id: otId });
            if (ot.getValue('custrecord_ht_ot_pxadminfinalizacion') === true) {
                log.debug('IMPULSO-PX-OT-UE-SKIP-FINALIZADA', { ot: otId });
                return;
            }

            const itemId = ot.getValue('custrecord_ht_ot_item');
            const subsidiary = ot.getValue('custrecord_ht_ot_subsidiary');
            if (!esSubsidiariaPermitida(subsidiary)) {
                log.debug('IMPULSO-PX-OT-UE-SKIP-SUBSIDIARIA', { ot: otId, subs: subsidiary });
                return;
            }
            const { aplica, adpCode } = resolverAplicabilidad(itemId);

            if (!aplica) {
                log.debug('IMPULSO-PX-OT-UE-SKIP-GPG-ADP', { ot: otId, item: itemId, adp: adpCode });
                return;
            }

            const payload = { ot: otId, subs: subsidiary, adp: adpCode, item: itemId };
            log.debug('IMPULSO-PX-OT-UE-START', payload);

            const resp = ejecutarImpulso(adpCode, otId, subsidiary);
            const wrapped = wrapPxResponse(resp, payload);
            log.debug('IMPULSO-PX-OT-UE-RESP', wrapped);

            const respBody = (wrapped.respuesta && wrapped.respuesta.PxAdmin && wrapped.respuesta.PxAdmin.Respuesta) ||
                (wrapped.respuesta && wrapped.respuesta.Respuesta) || null;
            const esExito = wrapped.status === true || respBody === '1' || respBody === 1;

            actualizarDetalleRegistro(otId, esExito ? 'Enviado' : 'Error', wrapped);

            if (esExito) {
                marcarOtFinalizada(otId);
                log.audit('IMPULSO-PX-OT-UE-OK', { ot: otId, adp: adpCode });
            } else {
                log.error('IMPULSO-PX-OT-UE-FALLO', { ot: otId, adp: adpCode, mensaje: wrapped.mensaje });
            }
        } catch (e) {
            log.error('IMPULSO-PX-OT-UE-ERROR', { ot: otId, message: e.message, stack: e.stack });
        }
    };

    const esUsuarioSubsidiariaPermitida = () =>
        esSubsidiariaPermitida(runtime.getCurrentUser().subsidiary);

    const afterSubmit = (context) => {
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;
        if (!esUsuarioSubsidiariaPermitida()) return;
        procesarImpulso(context.newRecord.id);
    };

    const mostrarBannerExito = (form) => {
        // El propio custrecord_ht_ot_pxadminfinalizacion=true ya es la prueba de que el impulso
        // se hizo correctamente, así que el indicador se muestra siempre que se abre la OT,
        // no solo la primera vez.
        const msg = message.create({
            type: message.Type.CONFIRMATION,
            title: 'Impulso a plataforma exitoso',
            message: 'La Orden de Trabajo se impulsó correctamente a la plataforma PX.',
            duration: BANNER_DURATION_MS
        });
        form.addPageInitMessage({ message: msg });
    };

    const mostrarBannerPendiente = (form) => {
        // finalizacion=false y noimpulsaplataformas=false: todavía se espera el impulso.
        const msg = message.create({
            type: message.Type.WARNING,
            title: 'Impulso a plataforma pendiente',
            message: 'Esta Orden de Trabajo aún NO está en la plataforma PX (pendiente de migrar/impulsar).',
            duration: BANNER_DURATION_MS
        });
        form.addPageInitMessage({ message: msg });
    };

    const mostrarBannerNoImpulsa = (form) => {
        // noimpulsaplataformas=true: esta OT está marcada para NO impulsarse nunca a PX.
        const msg = message.create({
            type: message.Type.ERROR,
            title: 'OT marcada para NO impulsarse',
            message: 'Esta Orden de Trabajo tiene custrecord_ht_ot_noimpulsaplataformas en TRUE: no se impulsará a la plataforma PX.',
            duration: BANNER_DURATION_MS
        });
        form.addPageInitMessage({ message: msg });
    };

    const beforeLoad = (context) => {
        if (context.type !== context.UserEventType.VIEW && context.type !== context.UserEventType.EDIT) return;
        if (!esUsuarioSubsidiariaPermitida()) return;
        try {
            const rec = context.newRecord;
            if (!esSubsidiariaPermitida(rec.getValue('custrecord_ht_ot_subsidiary'))) return;
            const finalizado = rec.getValue('custrecord_ht_ot_pxadminfinalizacion') === true;
            const noImpulsa = rec.getValue('custrecord_ht_ot_noimpulsaplataformas') === true;
            if (finalizado) {
                mostrarBannerExito(context.form);
            } else if (noImpulsa) {
                mostrarBannerNoImpulsa(context.form);
            } else {
                mostrarBannerPendiente(context.form);
            }
        } catch (e) {
            log.error('IMPULSO-PX-OT-UE-BANNER-ERROR', { message: e.message, stack: e.stack });
        }
    };

    return { beforeLoad, afterSubmit };
});
