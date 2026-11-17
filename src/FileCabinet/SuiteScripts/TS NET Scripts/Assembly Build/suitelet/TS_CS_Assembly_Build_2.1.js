/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/url', 'N/currentRecord', 'N/ui/dialog', 'N/search'], (url, currentRecord, dialog, search) => {

    const COMPONENT_INVENTORY_DETAIL_POPUP_ID = 'compinvdet_popup_';

    const pageInit = (scriptContext) => {
        console.log('START PAGEINIT');
    }

    const fieldChanged = (scriptContext) => {
        let currentRecord = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;
        let line = scriptContext.line;

        //Inicio Cambio JCEC 08/10/2024
        if (scriptContext.fieldId == 'custpage_f_location') {

            let location = currentRecord.getValue('custpage_f_location');
            let item = currentRecord.getValue('custpage_f_item');
            let workorder = currentRecord.getValue('custpage_f_workorder');
            let salesorder = currentRecord.getValue('custpage_f_salesorder');
            let customer = currentRecord.getValue('custpage_f_customer');
            //let subsidiary = currentRecord.getValue('custpage_f_subsidiary');

            let parametros = {
                location,
                item,
                workorder,
                salesorder,
                customer,
                //subsidiary
            }

            console.log(parametros);

            let url = getSuiteletURL(parametros);
            //evitamos mostrar el mensaje de confirmacion
            window.onbeforeunload = null;
            window.open(url, '_self');

        }

        //Fin Cambio JCEC 08/10/2024


        if (sublistId == 'custpage_sl_components' && fieldId == 'custpage_slf_quantity') {
            let getInventoryDetail = JSON.parse(currentRecord.getValue('custpage_f_inventorydetail'));
            if (getInventoryDetail[line] === undefined) return true;
            let length = Object.keys(getInventoryDetail[line]).length;
            let quantity = currentRecord.getSublistValue('custpage_sl_components', 'custpage_slf_quantity', line);
            if (length == quantity && quantity != 0) {
                updateSetTagIcon(line + 1);
            } else {
                updateNeededTagIcon(line + 1)
            }
        }

        return true;
    }

    //Inicio Cambio JCEC 08/10/2024
    const saveRecord = (scriptContext) => {
        let currentRecord = scriptContext.currentRecord;
        if (verificarParametroCandado(currentRecord.getValue('custpage_f_workorder'))) {
            if (currentRecord.getValue({ fieldId: 'custpage_field_datos_tecnicos' })) return true;
        } else {
            return true;
        }
    }
    //Fin Cambio JCEC 08/10/2024

    const updateSetTagIcon = (line) => {
        let id = `${COMPONENT_INVENTORY_DETAIL_POPUP_ID}${line}`;
        var element = document.getElementById(`${COMPONENT_INVENTORY_DETAIL_POPUP_ID}${line}`);
        element.classList.remove("i_inventorydetailneeded");
        element.classList.add("i_inventorydetailset");
    }

    const updateNeededTagIcon = (line) => {
        let id = `${COMPONENT_INVENTORY_DETAIL_POPUP_ID}${line}`;
        var element = document.getElementById(`${COMPONENT_INVENTORY_DETAIL_POPUP_ID}${line}`);
        element.classList.remove("i_inventorydetailset");
        element.classList.add("i_inventorydetailneeded");
    }

    const verificarParametroCandado = (workOrderId) => {
        const COD_PRO_ITEM_COMERCIAL_DE_PRODUCCION = "PRO";
        const COD_SI = "S";
        let itemVenta = search.lookupFields({
            type: "customrecord_ht_record_ordentrabajo",
            id: workOrderId,
            columns: ["custrecord_ht_ot_item"]
        }).custrecord_ht_ot_item;
        let itemVentaId = itemVenta.length ? itemVenta[0].value : "";
        if (!itemVentaId) return true;
        let parametrizacionProducto = parametrizacionJson(itemVentaId);
        let esCandado = parametrizacionProducto[COD_PRO_ITEM_COMERCIAL_DE_PRODUCCION];
        return esCandado !== undefined && esCandado.valor == COD_SI;
    }

    const parametrizacionJson = (items) => {
        let parametrizacionResult = {};
        let searchResult = search.create({
            type: "customrecord_ht_pp_main_param_prod",
            filters: [
                ["custrecord_ht_pp_aplicacion", "is", "T"],
                "AND",
                ["custrecord_ht_pp_parametrizacionid", "anyof", items]
            ],
            columns: [
                search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela" }),
                search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA" }),
                search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" }),
                search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR" })
            ]
        });
        let resultCount = searchResult.runPaged().count;
        if (resultCount > 0) {
            let pageData = searchResult.runPaged({ pageSize: 1000 });
            pageData.pageRanges.forEach(pageRange => {
                let page = pageData.fetch({ index: pageRange.index });
                page.data.forEach(result => {
                    let columns = result.columns;
                    let idParametrizacion = result.getValue(columns[0]);
                    let codigoParametrizacion = result.getValue(columns[1]);
                    let idValor = result.getValue(columns[2]);
                    let codigoValor = result.getValue(columns[3]);

                    if (!codigoParametrizacion) return;

                    parametrizacionResult[codigoParametrizacion] = {
                        parametrizacion: codigoParametrizacion,
                        valor: codigoValor,
                        idValor,
                        idParametrizacion
                    }
                });
            });
        }

        return parametrizacionResult;
    }

    //Inicio Cambio JCEC 08/10/2024
    const getSuiteletURL = (parametros) => {
        return url.resolveScript({
            scriptId: 'customscript_ts_ui_assembly_build_21',
            deploymentId: 'customdeploy_ts_ui_assembly_build_21',
            params: parametros
        });
    }
    //Fin Cambio JCEC 08/10/2024

    const addParametersToUrl = (suiteletURL, parameters) => {
        for (let param in parameters) {
            if (parameters[param]) {
                suiteletURL = `${suiteletURL}&${param}=${parameters[param]}`;
            }
        }
        return suiteletURL;
    }

    const getHeaderParameters = (currentRecord) => {
        let values = {
            item: currentRecord.getValue('custpage_f_item'),
            billofmaterials: currentRecord.getValue('custpage_f_billofmaterials'),
            location: currentRecord.getValue('custpage_f_location'),
        };
        return values;
    }

    return {
        pageInit,
        fieldChanged,
        saveRecord
    };
});
