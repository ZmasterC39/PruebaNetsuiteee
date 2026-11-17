/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',
    'N/runtime',
    'N/record',
    'N/ui/dialog',
    'N/email',
    '../controller/TS_CM_Controller',
    '../constant/TS_CM_Constant', 'N/log',
    'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js',
    'N/query',
], (url, runtime, record, dialog, email, _controller, _constant, log, _toolkit, query) => {
    const RENT_ASSEMBLY_BUILD_DEPLOYMENT_ID = "customdeploy_ts_ui_assembly_build_21";
    const RENT_ASSEMBLY_BUILD_SCRIPT_ID = "customscript_ts_ui_assembly_build_21";
    const CUSTODY_ASSEMBLY_BUILD_DEPLOYMENT_ID = "customdeploy_ts_ui_custody_assem_buil_21";
    const CUSTODY_ASSEMBLY_BUILD_SCRIPT_ID = "customscript_ts_ui_custody_assem_buil_21";
    const WARRANT_ASSEMBLY_BUILD_DEPLOYMENT_ID = "customdeploy_ts_ui_warrant_assem_buil_21";
    const WARRANT_ASSEMBLY_BUILD_SCRIPT_ID = "customscript_ts_ui_warrant_assem_buil_21";
    const IMPRESION_CERTIFICADO_SCRIPT_ID = "customscript_ts_ui_ec_impresion_certi";
    const IMPRESION_CERTIFICADO_DEPLOYMENT_ID = "customdeploy_ts_ui_ec_impresion_certi"
    const estadoChequeado = 2;
    const estadoDisponible = 5;


    const pageInit = (scriptContext) => { }

    const ensambleDispositivo = (internalid) => {
        try {
            var host = url.resolveDomain({
                hostType: url.HostType.APPLICATION,
                accountId: runtime.accountId
            });
            console.log('host', host);
            window.open('https://' + host + '/app/accounting/transactions/build.nl?id=' + internalid + '&e=T&transform=workord&memdoc=0&whence=', '_blank');
        } catch (err) {
            console.log("Error", "[ ensambleDispositivo ] " + err);
        }
    }

    const ensambleAlquiler = (item, location, workorder, salesorder, customer, subsidiary) => {
        /*try {
        console.log({ item, location, workorder, salesorder, customer });
        var host = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: runtime.accountId
        });
        var newUrl = 'https://' + host + '/app/site/hosting/scriptlet.nl?script=980&deploy=1&' +
            'item=' + item +
            '&location=' + location +
            '&workorder=' + workorder +
            '&salesorder=' + salesorder +
            '&customer=' + customer;
        console.log('host', host);
        window.open(newUrl);
        } catch (err) {
        console.log(err);
        }*/
        try {
            let params = { item, location, workorder, salesorder, customer, subsidiary };
            let host = getHostDomain();
            let suiteletUrl = getSuiteletUrl(RENT_ASSEMBLY_BUILD_SCRIPT_ID, RENT_ASSEMBLY_BUILD_DEPLOYMENT_ID);
            let fullUrl = addParametersToUrl(`https://${host}${suiteletUrl}`, params);
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.log(error);
        }
    }

    const ensambleCustodia = (item, relateditem, location, workorder, salesorder, customer, subsidiary) => {
        /*try {
        console.log(item, relateditem, location, workorder, salesorder, customer);
        var host = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: runtime.accountId
        });
        var newUrl = 'https://' + host + '/app/site/hosting/scriptlet.nl?script=1147&deploy=1&' +
            'item=' + item +
            '&relateditem=' + relateditem +
            '&location=' + location +
            '&workorder=' + workorder +
            '&salesorder=' + salesorder +
            '&customer=' + customer;
        console.log('host', host);
        window.open(newUrl);
        } catch (err) {
        console.log(err);
        }*/

        try {
            let params = { item, relateditem, location, workorder, salesorder, customer, subsidiary };
            let host = getHostDomain();
            let suiteletUrl = getSuiteletUrl(CUSTODY_ASSEMBLY_BUILD_SCRIPT_ID, CUSTODY_ASSEMBLY_BUILD_DEPLOYMENT_ID);
            let fullUrl = addParametersToUrl(`https://${host}${suiteletUrl}`, params);
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.log(error);
        }
    }

    const ensambleGarantia = (item, location, workorder, salesorder, customer, subsidiary) => {
        try {
            let params = { item, location, workorder, salesorder, customer, subsidiary };
            let host = getHostDomain();
            let suiteletUrl = getSuiteletUrl(WARRANT_ASSEMBLY_BUILD_SCRIPT_ID, WARRANT_ASSEMBLY_BUILD_DEPLOYMENT_ID);
            let fullUrl = addParametersToUrl(`https://${host}${suiteletUrl}`, params);
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.log(error);
        }
    }

    const getSuiteletUrl = (scriptId, deploymentId) => {
        return url.resolveScript({
            scriptId: scriptId,
            deploymentId: deploymentId,
            returnExternalUrl: false
        });
    }

    const getHostDomain = () => {
        return host = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
            accountId: runtime.accountId
        });
    }

    const addParametersToUrl = (suiteletURL, parameters) => {
        for (let param in parameters) {
            if (parameters[param]) {
                suiteletURL = `${suiteletURL}&${param}=${parameters[param]}`;
            }
        }
        return suiteletURL;
    }

    const chequearOrden = (internalid) => {
        let pideNumberBox = 0;
        let response;
        try {
            let objRecord = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: internalid });

            // reinstalación de garantía bloqueada hasta chequear la desinstalación  20/07/2026 - Doas
            if (bloqueaReinstalacionGarantia(objRecord)) {
                dialog.alert({
                    title: 'No se puede chequear la Reinstalación',
                    message: 'Debe chequear primero la Orden de Trabajo de DESINSTALACIÓN (garantía) de esta Orden de Servicio.'
                });
                return; // detiene el chequeo, no guarda
            }

            if (objRecord.getValue('custrecord_ht_ot_others_installs') == false) {
                if (objRecord.getValue('custrecord_ht_ot_estadochaser').length > 0) {
                    if (objRecord.getValue('custrecord_ht_ot_taller').length > 0) {
                        if (objRecord.getValue('custrecord_ht_ot_estadochaser') != estadoDisponible) {
                            let parametrosRespo = _controller.parametrizacion(objRecord.getValue({ fieldId: 'custrecord_ht_ot_item' }));
                            for (let j = 0; j < parametrosRespo.length; j++) {
                                if (parametrosRespo[j][0] == _constant.Parameter.PNB_PIDE_NUMBER_BOX && parametrosRespo[j][1] == _constant.Valor.SI) {
                                    pideNumberBox = _constant.Valor.SI;
                                    break;
                                }
                            }

                            if (pideNumberBox == 0) {
                                objRecord.setValue({ fieldId: 'custrecord_ht_ot_estado', value: estadoChequeado });
                                response = objRecord.save();
                                location.reload();
                            } else {
                                if (objRecord.getValue('custrecord_ht_ot_boxserie').length > 0) {
                                    objRecord.setValue({ fieldId: 'custrecord_ht_ot_estado', value: estadoChequeado });
                                    response = objRecord.save();
                                    location.reload();
                                } else {
                                    dialog.alert({ title: 'Alerta', message: 'Se debe ingresar un dato para el campo BOX SERIE.' });
                                }

                                // return true;
                                //dialog.alert({ title: 'Alerta', message: 'Se debe ingresar un dato para el campo BOX SERIE.' });
                            }
                        } else {
                            dialog.alert({ title: 'Alerta', message: 'El estado de la instalación debe ser diferente a disponible.' });
                        }
                    } else {
                        dialog.alert({ title: 'Alerta', message: 'Debe tener un taller asignado.' });
                    }
                } else {
                    dialog.alert({ title: 'Alerta', message: 'Debe ingresar un estado para la instalación.' });
                }
            } else {
                if (objRecord.getValue('custrecord_ht_ot_serieproductoasignacion').length > 0) {
                    dialog.alert({
                        title: 'Alerta',
                        message: 'Está realizando otras instalaciones, el campo SERIE PRODUCTO no debe contener ningun valor.'
                    });
                } else {
                    objRecord.setValue({ fieldId: 'custrecord_ht_ot_estado', value: estadoChequeado });
                    response = objRecord.save();
                    location.reload();
                }
            }

            log.audit("response SAVE", response)
        } catch (error) {
            console.log('Error', error);
        }
    }

    // ============================================================================
    // VALIDATION - Par garantía desinstalación (002) -> reinstalación (003)
    // ============================================================================
    const bloqueaReinstalacionGarantia = (objRecord) => {
        try {

            let userSubsidiaria = runtime.getCurrentUser().subsidiary;
            if (userSubsidiaria != 2) return false;

            let osId = objRecord.getValue('custrecord_ht_ot_orden_servicio');
            let garantia = objRecord.getValue('custrecord_flujo_de_garantia');
            let artRel = objRecord.getValue('custrecord_ht_ot_itemrelacionado');

            if (!osId || !garantia || !artRel) return false;

            let adpAct = _controller.getParameter(artRel, _constant.Parameter.ADP_ACCION_DEL_PRODUCTO);
            if (adpAct != _constant.Valor.VALOR_003_REINSTALACION_DE_DISP) return false;

            let sql =
                "SELECT ot.custrecord_ht_ot_estado AS estado, " +
                "       ot.custrecord_flujo_de_garantia AS garantia, " +
                "       val.custrecord_ht_pp_codigo AS adp " +
                "FROM customrecord_ht_record_ordentrabajo ot " +
                "  INNER JOIN customrecord_ht_pp_main_param_prod mp " +
                "          ON mp.custrecord_ht_pp_parametrizacionid = ot.custrecord_ht_ot_itemrelacionado " +
                "  INNER JOIN customrecord_ht_cr_parametrizacion_produ rela " +
                "          ON rela.id = mp.custrecord_ht_pp_parametrizacion_rela " +
                "         AND rela.custrecord_ht_pp_code = 'ADP' " +
                "  INNER JOIN customrecord_ht_cr_pp_valores val " +
                "          ON val.id = mp.custrecord_ht_pp_parametrizacion_valor " +
                "WHERE ot.custrecord_ht_ot_orden_servicio = ?";

            let filas = query.runSuiteQL({ query: sql, params: [osId] }).asMappedResults();

            let desinst = filas.filter(f => String(f.adp) === '002');
            let reinst = filas.filter(f => String(f.adp) === '003' &&
                (f.garantia === true || String(f.garantia) === 'T' || String(f.garantia) === 'true'));

            let esParExacto = desinst.length === 1 && reinst.length === 1;
            if (!esParExacto) return false;

            let desinstChequeada = Number(desinst[0].estado) === estadoChequeado;
            return !desinstChequeada; // bloquea si la desinstalación NO está chequeada

        } catch (e) {
            console.log('Error bloqueaReinstalacionGarantia:', e);
            return false; // ante error, no bloquear
        }
    };

    const printCertificado = (workOrder, type) => {
        try {
            let params = { workOrder, type };
            let host = getHostDomain();
            let suiteletUrl = getSuiteletUrl(IMPRESION_CERTIFICADO_SCRIPT_ID, IMPRESION_CERTIFICADO_DEPLOYMENT_ID);
            let fullUrl = addParametersToUrl(`https://${host}${suiteletUrl}`, params);
            window.open(fullUrl, '_blank');
        } catch (error) {
            console.log(error);
        }
    }

    return {
        pageInit,
        ensambleDispositivo,
        ensambleAlquiler,
        ensambleCustodia,
        ensambleGarantia,
        chequearOrden,
        printCertificado
    };
});
/********************************************************************************************************************************************************
TRACKING
/********************************************************************************************************************************************************
/* Commit:01
Version: 1.0
Date: 27/06/2022
Author: Jean Ñique
Description: Creación del script.
========================================================================================================================================================*/