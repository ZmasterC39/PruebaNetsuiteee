/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @scriptid customscript_hu_pe_ss_generar_xml_ot
 */
define([
    'N/log',
    'N/record',
    'N/file',
    'N/search',
    'N/query',
    'N/format',
    'SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant'
], (log, record, file, search, query, format, _constant) => {

    const OT_ID = '379047';
    const FOLDER_XML = 24686;

    const OPERACION_ORDEN_INSTALACION = "001";
    const OPERACION_ORDEN_DESINSTALACION = "002";
    const OPERACION_ORDEN_REINSTALACION = "003";
    const OPERACION_ORDEN_RENOVACION = "004";
    const OPERACION_ORDEN_MODIFICACION = "005";
    const OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO = "006";
    const OPERACION_ORDEN_CHEQUEO_COMPONENTES = "007";
    const OPERACION_ORDEN_VENTA_SEGUROS = "008";
    const OPERACION_ORDEN_RENOVACION_SEGUROS = "009";
    const OPERACION_ORDEN_CAMBIO_PROPIETARIO = "010";
    const OPERACION_ORDEN_RECONEXION = "011";
    const OPERACION_ORDEN_CHEQUEO_OTROS_PRODUCTOS = "013";
    const OPERACION_ORDEN_VENTA_SERVICIOS = "015";
    const OPERACION_ORDEN_ACTUALIZACION_DATOS_PROPIETARIOS = "016";
    const OPERACION_ORDEN_ACTUALIZACION_ESTADOS = "017";
    const OPERACION_ORDEN_REGISTRAR_CANAL = "018";
    const OPERACION_ORDEN_INSTALACION_COMPONENTES = "019";

    const UNIDAD_TIEMPO = { ANIO: 1, MESES: 2, DIA: 3 };

    const usuario = "NetSuite";
    const clave = "NS*25#01@%j?i";

    // ------------------------------------------------------------------
    // Resolucion de ADP (misma logica que getAdpFromItem/resolveAdpCode en
    // ht_pe_ue_impulso_plat_px_ot.js), copiada aqui porque ese User Event no las expone.
    // ------------------------------------------------------------------
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
            log.error('GENERAR-XML-OT-PARAM-ERROR', { itemId, parametroId, error: e.message });
        }
        return null;
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

    // ------------------------------------------------------------------
    // A partir de aqui: copia literal (solo lectura, sin sendPXServer/crearRegistroImpulso/
    // record.save) de las funciones internas de HU_TS_ScriptPlataformas_controller.js que
    // arman el PxAdmin de una Orden de Trabajo.
    // ------------------------------------------------------------------

    const obtenerPeriodoCobertura = (ordenServicio) => {
        let cantidad = 0;
        let itemLines = ordenServicio.getLineCount('item');
        for (let j = 0; j < itemLines; j++) {
            let itemtype = ordenServicio.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: j });
            if (itemtype == 'Service') {
                let quantity = parseInt(ordenServicio.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', line: j }));
                cantidad = cantidad + quantity;
            }
        }
        return cantidad;
    };

    const convertFechaFinalToCobertura = (fechaPST) => {
        let fechaOriginal = new Date(fechaPST);
        let anio = fechaOriginal.getFullYear();
        let mes = String(fechaOriginal.getMonth() + 1).padStart(2, '0');
        let dia = String(fechaOriginal.getDate()).padStart(2, '0');
        return `${anio}-${mes}-${dia}`;
    };

    const getHoraChequeo = () => {
        let fechaActual = new Date();
        let horas = String(fechaActual.getHours()).padStart(2, '0');
        let minutos = String(fechaActual.getMinutes()).padStart(2, '0');
        return `${3 + Number(horas)}:${minutos}`;
    };

    const getFechaChequeo = () => {
        let fechaOriginal = new Date();
        let anio = fechaOriginal.getFullYear();
        let mes = String(fechaOriginal.getMonth() + 1).padStart(2, '0');
        let dia = String(fechaOriginal.getDate()).padStart(2, '0');
        let fechaFormateada = new Date(`${anio}-${mes}-${dia}`);
        let horaChequeo = getHoraChequeo();
        fechaFormateada.setHours(fechaFormateada.getHours() + Number(horaChequeo.split(":")[0]));
        return fechaFormateada.toISOString();
    };

    const getCobertura = (cantidad, undTiempo, fechaChequeo) => {
        let date = new Date(fechaChequeo);
        date.setDate(date.getDate());
        let dateChequeo = convertFechaFinalToCobertura(fechaChequeo);
        let date_final = new Date(dateChequeo);
        try {
            if (undTiempo == UNIDAD_TIEMPO.ANIO) {
                cantidad = parseInt(cantidad) * 12;
                date_final.setDate(date_final.getDate());
                date_final.setMonth(date_final.getMonth() + parseInt(cantidad));
            } else if (undTiempo == UNIDAD_TIEMPO.DIA) {
                date_final.setDate(date_final.getDate() + parseInt(cantidad));
            } else {
                date_final.setDate(date_final.getDate());
                date_final.setMonth(date_final.getMonth() + parseInt(cantidad));
            }
            date_final = new Date(date_final);
            let horaChequeo = getHoraChequeo();
            date_final.setHours(date_final.getHours() + Number(horaChequeo.split(":")[0]));
            let fechaAjustada = date_final.toISOString();
            date.setHours(date.getHours());
            date = date.toISOString();
            return {
                coberturaInicial: date.split("T")[0],
                coberturaFinal: fechaAjustada.split("T")[0]
            };
        } catch (e) {
            log.debug('getCobertura-error', e);
        }
    };

    const obtenerDispositivo = (id, subsidiaria) => {
        if (!id) return;
        return search.lookupFields({
            type: 'customrecord_ht_record_mantchaser', id: id,
            columns: [
                'custrecord_ht_mc_vid',
                'custrecord_ht_mc_modelo',
                'custrecord_ht_mc_unidad',
                'custrecord_ht_mc_seriedispositivo',
                'custrecord_ht_mc_imei',
                'name',
                'custrecord_ht_mc_nocelularsim',
                'custrecord_ht_mc_operadora',
                'custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_codigo',
                'custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip',
                'custrecord_ht_mc_ip',
                'custrecord_ht_mc_celularsimcard',
                'custrecord_ht_mc_estadosimcard',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_mod_disp_id_telematic',
                'custrecord_ht_mc_modelo.custrecord_ht_md_servidor_relacionado',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_codig',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr',
                'custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_codigo',
                'custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip',
                'custrecord_ht_mc_macaddress',
                'custrecord_ht_mc_sn',
                'custrecord_ht_mc_numero_camara',
                'custrecord_ht_mc_icc',
                'custrecord_ht_mc_servidor.custrecord_ht_mc_servidor_id_telematic',
                'custrecord_ht_mc_servidor',
                'custrecord_ht_mc_estadolodispositivo'
            ]
        });
    };

    const obtenerVehiculo = (id, subsidiaria) => {
        if (!id) return;
        return search.lookupFields({
            type: 'customrecord_ht_record_bienes', id: id,
            filters: [["custrecord_bn_subsidiaria", "anyof", subsidiaria]],
            columns: [
                'custrecord_ht_bien_placa',
                'custrecord_ht_bien_marca',
                'custrecord_ht_bien_modelo',
                'custrecord_ht_bien_chasis',
                'custrecord_ht_bien_motor',
                'custrecord_ht_bien_colorcarseg',
                'custrecord_ht_bien_tipoterrestre',
                'custrecord_ht_bien_tipoterrestre.custrecord_ht_tt_idtelematic',
                'name',
                'custrecord_ht_bn_estadobien',
                'custrecord_ht_bien_ano',
                'custrecord_ht_bien_codsysh',
                'custrecord_ht_bien_propietario',
                'custrecord_ht_bien_consesionarios',
                'custrecord_ht_bien_companiaseguros',
                'custrecord_ht_bien_financiadovehiculo',
                'custrecord_ht_bien_conveniovehiculo',
                'custrecord_bn_subsidiaria',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_ruccanaldistribucion',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_nombre',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_direccion',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_telefono',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_tipocanal',
                'custrecord_ht_bien_marca.custrecord_ht_marca_codigo',
                'custrecord_ht_bien_marca.custrecord_ht_marca_descripcion',
                'custrecord_ht_bien_modelo.custrecord_ht_mod_codigo',
                'custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion',
                'custrecord_ht_bien_cilindraje',
                'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_codigo',
                'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_descrip',
                'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_codigo',
                'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion',
                'custrecord_ht_bien_id_telematic',
                'internalid',
                'custrecord_ht_bien_tipo',
                'custrecord_ht_bien_tipobien',
                'custrecord_ht_bien_tipo.custrecord_ht_tv_codigo',
                'custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion',
                'custrecord_ht_bien_numeropuertas',
                'custrecord_ht_bien_num_ruedas',
                'custrecord_ht_bien_max_peso',
                'custrecord_ht_bien_largo',
                'custrecord_ht_bien_telefono_emergencia',
                'altname',
                'custrecord_ht_bien_nom_embarcacion',
                'custrecord_ht_serie_pro',
                'custrecord_ht_bien_oficina'
            ]
        });
    };

    const obtenerCorreosPropietario = (customerId, subsidiaria) => {
        let result = { email: "", amiEmail: "", mainEmail: "", convenioEmail: "", pxEmail: "" };
        let resultSearch = search.create({
            type: "customrecord_ht_record_correoelectronico",
            filters: [["custrecord_ht_ce_enlace", "anyof", customerId]],
            columns: [
                search.createColumn({ name: "custrecord_ht_email_tipoemail" }),
                search.createColumn({ name: "custrecord_ht_email_email" }),
                search.createColumn({ name: "custrecord_ht_email_emailprincipal" })
            ]
        }).run().getRange(0, 1000);
        if (resultSearch.length) {
            for (let i = 0; i < resultSearch.length; i++) {
                let email = resultSearch[i].getValue("custrecord_ht_email_email");
                let emailType = resultSearch[i].getValue("custrecord_ht_email_tipoemail");
                let mainEmail = resultSearch[i].getValue("custrecord_ht_email_emailprincipal");
                if (mainEmail) result.mainEmail = email.toLowerCase();
                if (subsidiaria == 2) {
                    if (emailType == "1") result.email = email.toLowerCase();
                    if (emailType == "2") result.amiEmail = email.toLowerCase();
                    if (emailType == "3") result.convenioEmail = email.toLowerCase();
                    if (emailType == "8") result.pxEmail = email.toLowerCase();
                }
                if (subsidiaria == 3) {
                    if (emailType == "112") {
                        result.email = email.toLowerCase();
                        result.amiEmail = email.toLowerCase();
                        result.convenioEmail = email.toLowerCase();
                        result.pxEmail = email.toLowerCase();
                    }
                }
            }
        }
        return result;
    };

    const obtenerPropietario = (id, subsidiaria) => {
        if (!id) return;
        let result = {};
        let correoEmail = '', celular = '', convencional = '', city = '';
        let tipoEmail = '', tipoCelular = '', tipoConvencional = '';
        if (subsidiaria == 2) { tipoCelular = 4; tipoEmail = 1; tipoConvencional = 10; }
        if (subsidiaria == 3) { tipoCelular = 4; tipoEmail = 112; tipoConvencional = 4; }
        let resultSet = query.runSuiteQL({ query: 'SELECT custrecord_ht_email_email as email FROM customrecord_ht_record_correoelectronico WHERE custrecord_ht_email_tipoemail = ? AND custrecord_ht_ce_enlace = ?', params: [tipoEmail, id] });
        let results = resultSet.asMappedResults();
        correoEmail = results.length ? results[0]['email'] : correoEmail;
        let resultSet2 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoCelular, id] });
        let results2 = resultSet2.asMappedResults();
        if (subsidiaria == 2) {
            if (results2.length) {
                celular = results2[0]['celular'].replace('+593', '0');
            } else {
                tipoCelular = 1;
                let resultSetcel = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoCelular, id] });
                let resultscel = resultSetcel.asMappedResults();
                if (resultscel.length) celular = resultscel[0]['celular'].replace('+593', '0');
            }
        }
        if (subsidiaria == 3) { celular = results2.length ? results2[0]['celular'].replace('+51', '0') : celular; }
        let resultSet3 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoConvencional, id] });
        let results3 = resultSet3.asMappedResults();
        if (subsidiaria == 2) { convencional = results3.length ? results3[0]['convencional'].replace('+593', '0') : convencional; }
        if (subsidiaria == 3) { convencional = results3.length ? results3[0]['convencional'].replace('+51', '0') : convencional; }
        let resultSet4 = query.runSuiteQL({ query: 'SELECT addressbookaddress FROM customeraddressbook WHERE entity = ?', params: [id] });
        let results4 = resultSet4.asMappedResults();
        if (results4.length > 0) {
            let resultSet5 = query.runSuiteQL({ query: 'SELECT addr1, addr2, city, zip, country FROM customerAddressbookEntityAddress WHERE nkey = ?', params: [results4[0]['addressbookaddress']] });
            let results5 = resultSet5.asMappedResults();
            if (results5.length > 0) {
                city = (results5[0]['addr1'] == null ? '' : results5[0]['addr1']) + ' ' + (results5[0]['addr2'] == null ? '' : results5[0]['addr2']) + ' ' + (results5[0]['city'] == null ? '' : results5[0]['city']) + ' ' + (results5[0]['zip'] == null ? '' : results5[0]['zip']) + ' ' + (results5[0]['country'] == null ? '' : results5[0]['country']);
            }
        }
        let Propietario = search.lookupFields({
            type: 'customer', id: id,
            columns: ['entityid', 'custentity_ht_cl_primernombre', 'custentity_ht_cl_segundonombre', 'custentity_ht_cl_apellidopaterno', 'custentity_ht_cl_apellidomaterno', 'phone', 'homephone', 'email', 'vatregnumber', 'custentity_ht_customer_id_telematic', 'internalid', 'custentityts_ec_cod_tipo_doc_identidad', 'companyname', 'isperson', 'salesrep', 'custentity_ht_cl_oficinacliente']
        });
        result.htEmail = obtenerCorreosPropietario(id, subsidiaria);
        result.entityid = Propietario.entityid.length ? Propietario.entityid : '';
        result.phone = celular;
        result.email = correoEmail;
        result.vatregnumber = Propietario.vatregnumber.length ? Propietario.vatregnumber : '';
        result.custentity_ht_customer_id_telematic = Propietario.custentity_ht_customer_id_telematic.length ? Propietario.custentity_ht_customer_id_telematic : '';
        result.internalid = Propietario.internalid.length ? Propietario.internalid : '';
        result.isperson = Propietario.isperson;
        result.provincia = city;
        result.companyname = Propietario.companyname || "";
        result.custentityts_ec_cod_tipo_doc_identidad = Propietario.custentityts_ec_cod_tipo_doc_identidad || "";
        result.homephone = convencional ? convencional : celular;
        if (result.isperson) {
            result.custentity_ht_cl_primernombre = Propietario.custentity_ht_cl_primernombre.length ? Propietario.custentity_ht_cl_primernombre : '';
            result.custentity_ht_cl_segundonombre = Propietario.custentity_ht_cl_segundonombre.length ? Propietario.custentity_ht_cl_segundonombre : '';
            result.custentity_ht_cl_apellidopaterno = Propietario.custentity_ht_cl_apellidopaterno.length ? Propietario.custentity_ht_cl_apellidopaterno : '';
            result.custentity_ht_cl_apellidomaterno = Propietario.custentity_ht_cl_apellidomaterno.length ? Propietario.custentity_ht_cl_apellidomaterno : '';
        } else {
            result.custentity_ht_cl_primernombre = Propietario.companyname;
            result.custentity_ht_cl_apellidopaterno = Propietario.companyname;
        }
        result.salesrep = Propietario.salesrep.length ? Propietario.salesrep[0].value : '';
        result.oficina = Propietario.custentity_ht_cl_oficinacliente.length ? Propietario.custentity_ht_cl_oficinacliente[0].text : '';
        return result;
    };

    const obtenerPropietarioMonitoreo = (salesOrderRecord, itemMonitoreo, subsidiaria) => {
        let city = '', correoEmail = '', celular = '', convencional = '';
        try {
            let itemLines = salesOrderRecord.getLineCount({ sublistId: 'item' });
            let PropietarioMonitoreo = 0;
            for (let j = 0; j < itemLines; j++) {
                let item = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                if (itemMonitoreo && item == itemMonitoreo) {
                    PropietarioMonitoreo = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente_monitoreo', line: j });
                    break;
                } else {
                    PropietarioMonitoreo = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente_monitoreo', line: j });
                    if (PropietarioMonitoreo) break;
                }
            }
            var lookupFieldsPropietarioMonitoreo = {};
            if (!PropietarioMonitoreo) return lookupFieldsPropietarioMonitoreo;
            let resultSet = query.runSuiteQL({
                query: 'SELECT isperson, id, entityid, custentity_ht_cl_primernombre, custentity_ht_cl_segundonombre, custentity_ht_cl_apellidopaterno, custentity_ht_cl_apellidomaterno, custentity_ht_customer_id_telematic, custentityts_ec_cod_tipo_doc_identidad, companyname FROM customer WHERE id = ?',
                params: [PropietarioMonitoreo]
            });
            let results = resultSet.asMappedResults();
            if (results.length > 0) {
                let tipoEmail = '', tipoCelular = '', tipoConvencional = '';
                if (subsidiaria == 2) { tipoCelular = 4; tipoEmail = 1; tipoConvencional = 10; }
                if (subsidiaria == 3) { tipoCelular = 4; tipoEmail = 112; tipoConvencional = 4; }
                let resultSet1 = query.runSuiteQL({ query: 'SELECT custrecord_ht_email_email as email FROM customrecord_ht_record_correoelectronico WHERE custrecord_ht_email_tipoemail = ? AND custrecord_ht_ce_enlace = ?', params: [tipoEmail, PropietarioMonitoreo] });
                let results1 = resultSet1.asMappedResults();
                correoEmail = results1.length ? results1[0]['email'] : correoEmail;
                let resultSet2 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoCelular, PropietarioMonitoreo] });
                let results2 = resultSet2.asMappedResults();
                if (subsidiaria == 2) {
                    if (results2.length) {
                        celular = results2[0]['celular'].replace('+593', '0');
                    } else {
                        tipoCelular = 1;
                        let resultSetcel = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoCelular, PropietarioMonitoreo] });
                        let resultscel = resultSetcel.asMappedResults();
                        if (resultscel.length) celular = resultscel[0]['celular'].replace('+593', '0');
                    }
                }
                if (subsidiaria == 3) { celular = results2.length ? results2[0]['celular'].replace('+51', '0') : celular; }
                let resultSet3 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoConvencional, PropietarioMonitoreo] });
                let results3 = resultSet3.asMappedResults();
                if (subsidiaria == 2) { convencional = results3.length ? results3[0]['convencional'].replace('+593', '0') : convencional; }
                if (subsidiaria == 3) { convencional = results3.length ? results3[0]['convencional'].replace('+51', '0') : convencional; }
                let resultSet4 = query.runSuiteQL({ query: 'SELECT addressbookaddress FROM customeraddressbook WHERE entity = ?', params: [PropietarioMonitoreo] });
                let results4 = resultSet4.asMappedResults();
                if (results4.length > 0) {
                    let resultSet5 = query.runSuiteQL({ query: 'SELECT addr1, addr2, city, zip, country FROM customerAddressbookEntityAddress WHERE nkey = ?', params: [results4[0]['addressbookaddress']] });
                    let results5 = resultSet5.asMappedResults();
                    if (results5.length > 0) {
                        city = (results5[0]['addr1'] == null ? '' : results5[0]['addr1']) + ' ' + (results5[0]['addr2'] == null ? '' : results5[0]['addr2']) + ' ' + (results5[0]['city'] == null ? '' : results5[0]['city']) + ' ' + (results5[0]['zip'] == null ? '' : results5[0]['zip']) + ' ' + (results5[0]['country'] == null ? '' : results5[0]['country']);
                    }
                }
                lookupFieldsPropietarioMonitoreo.htEmail = obtenerCorreosPropietario(PropietarioMonitoreo, subsidiaria);
                lookupFieldsPropietarioMonitoreo = search.lookupFields({ type: 'customer', id: PropietarioMonitoreo, columns: ['vatregnumber'] });
                lookupFieldsPropietarioMonitoreo.htEmail = obtenerCorreosPropietario(PropietarioMonitoreo, subsidiaria);
                lookupFieldsPropietarioMonitoreo.entityid = results[0]['entityid'] == null ? '' : results[0]['entityid'];
                lookupFieldsPropietarioMonitoreo.phone = celular;
                lookupFieldsPropietarioMonitoreo.homephone = convencional ? convencional : celular;
                lookupFieldsPropietarioMonitoreo.email = correoEmail;
                lookupFieldsPropietarioMonitoreo.vatregnumber = lookupFieldsPropietarioMonitoreo.vatregnumber.length ? lookupFieldsPropietarioMonitoreo.vatregnumber : '';
                lookupFieldsPropietarioMonitoreo.custentity_ht_customer_id_telematic = results[0]['custentity_ht_customer_id_telematic'] == null ? '' : results[0]['custentity_ht_customer_id_telematic'];
                lookupFieldsPropietarioMonitoreo.isperson = results[0]['isperson'];
                lookupFieldsPropietarioMonitoreo.custentityts_ec_cod_tipo_doc_identidad = results[0]['custentityts_ec_cod_tipo_doc_identidad'];
                lookupFieldsPropietarioMonitoreo.companyname = results[0]["companyname"];
                lookupFieldsPropietarioMonitoreo.identity = PropietarioMonitoreo;
                lookupFieldsPropietarioMonitoreo.provincia = city;
                if (results[0]['isperson'] == 'F') {
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = results[0]['companyname'] == null ? '' : results[0]['companyname'];
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidopaterno = results[0]['companyname'] == null ? '' : results[0]['companyname'];
                } else {
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = results[0]['custentity_ht_cl_primernombre'] == null ? '' : results[0]['custentity_ht_cl_primernombre'];
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_segundonombre = results[0]['custentity_ht_cl_segundonombre'] == null ? '' : results[0]['custentity_ht_cl_segundonombre'];
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidopaterno = results[0]['custentity_ht_cl_apellidopaterno'] == null ? '' : results[0]['custentity_ht_cl_apellidopaterno'];
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidomaterno = results[0]['custentity_ht_cl_apellidomaterno'] == null ? '' : results[0]['custentity_ht_cl_apellidomaterno'];
                }
            }
            return lookupFieldsPropietarioMonitoreo;
        } catch (error) {
            log.debug('obtenerPropietarioMonitoreo-error', error);
        }
    };

    const obtenerCobertura = (ordenTrabajo, subsidiaria) => {
        let itemId = ordenTrabajo.getValue('custrecord_ht_ot_item');
        let bienId = ordenTrabajo.getValue('custrecord_ht_ot_vehiculo');
        let clienteId = ordenTrabajo.getValue('custrecord_ht_ot_cliente_id');
        let subsdiaryId = ordenTrabajo.getValue('custrecord_ht_ot_subsidiary');
        let coberturaSearchResult = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
                ["custrecord_ht_co_bien", "anyof", bienId], "AND",
                ["custrecord_ht_co_propietario", "anyof", clienteId], "AND",
                ["custrecord_ht_co_producto", "anyof", itemId], "AND",
                ["custrecord_ht_co_subsidiaria", "anyof", subsdiaryId]
            ],
            columns: [
                search.createColumn({ name: "name", sort: search.Sort.ASC }),
                search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturainicial}, 'YYYY-MM-DD')" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturafinal}, 'YYYY-MM-DD')" }),
                search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                search.createColumn({ name: "custrecord_ht_co_coberturafinal" })
            ]
        }).run().getRange(0, 10);
        let result = {
            name: "", custrecord_ht_co_estado_cobertura: "", custrecord_ht_co_coberturainicial: "",
            custrecord_ht_co_coberturafinal: "", custrecord_ht_co_coberturainicialtext: "", custrecord_ht_co_coberturafinaltext: ""
        };
        if (!coberturaSearchResult.length) return result;
        let columns = coberturaSearchResult[0].columns;
        return {
            name: coberturaSearchResult[0].getValue("name"),
            custrecord_ht_co_estado_cobertura: coberturaSearchResult[0].getText("custrecord_ht_co_estado_cobertura"),
            custrecord_ht_co_coberturainicialtext: coberturaSearchResult[0].getValue(columns[2]),
            custrecord_ht_co_coberturafinaltext: coberturaSearchResult[0].getValue(columns[3]),
            custrecord_ht_co_coberturainicial: format.parse({ value: coberturaSearchResult[0].getValue(columns[4]), type: format.Type.DATE }),
            custrecord_ht_co_coberturafinal: format.parse({ value: coberturaSearchResult[0].getValue(columns[5]), type: format.Type.DATE })
        };
    };

    const obtenerCoberturaDisp = (IdVehiculo, idfamilia, subsidiaria) => {
        let coberturaSearchResult = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
                ["custrecord_ht_co_bien", "anyof", IdVehiculo], "AND",
                ["custrecord_ht_co_subsidiaria", "anyof", subsidiaria], "AND",
                ["custrecord_ht_co_familia_prod", "anyof", idfamilia]
            ],
            columns: [
                search.createColumn({ name: "name", sort: search.Sort.ASC }),
                search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturainicial}, 'YYYY-MM-DD')" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturafinal}, 'YYYY-MM-DD')" }),
                search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
                search.createColumn({ name: "custrecord_ht_co_numerodispositivo" })
            ]
        }).run().getRange(0, 10);
        let result = {
            name: "", custrecord_ht_co_estado_cobertura: "", custrecord_ht_co_coberturainicial: "",
            custrecord_ht_co_coberturafinal: "", custrecord_ht_co_coberturainicialtext: "",
            custrecord_ht_co_coberturafinaltext: "", numeroserieproducto: "", numerodispositivo: ""
        };
        if (!coberturaSearchResult.length) return result;
        let columns = coberturaSearchResult[0].columns;
        return {
            name: coberturaSearchResult[0].getValue("name"),
            custrecord_ht_co_estado_cobertura: coberturaSearchResult[0].getText("custrecord_ht_co_estado_cobertura"),
            custrecord_ht_co_coberturainicialtext: coberturaSearchResult[0].getValue(columns[2]),
            custrecord_ht_co_coberturafinaltext: coberturaSearchResult[0].getValue(columns[3]),
            custrecord_ht_co_coberturainicial: format.parse({ value: coberturaSearchResult[0].getValue(columns[4]), type: format.Type.DATE }),
            custrecord_ht_co_coberturafinal: format.parse({ value: coberturaSearchResult[0].getValue(columns[5]), type: format.Type.DATE }),
            numeroserieproducto: coberturaSearchResult[0].getValue(columns[6]),
            numerodispositivo: coberturaSearchResult[0].getValue(columns[7])
        };
    };

    const obtenerSubsidiaria = (subsdiaryId) => {
        if (!subsdiaryId) return {};
        return search.lookupFields({
            type: search.Type.SUBSIDIARY, id: subsdiaryId,
            columns: ["taxidnum", "custrecord_telematic_emergency_phone_num", "custrecord_telematic_assistanc_phone_num", "custrecord_telematic_technic_support_ema", "internalid"]
        });
    };

    const obtenerCanalDistribucion = (idCanalDistribucion, subsidiaria) => {
        if (!idCanalDistribucion) return {};
        return search.lookupFields({
            type: "customrecord_ht_record_canaldistribucion", id: idCanalDistribucion,
            filters: [["custrecord_ht_cd_subsidiaria", "anyof", subsidiaria]],
            columns: ["custrecord_ht_cd_ruccanaldistribucion", "custrecord_ht_cd_nombre", "custrecord_ht_cd_telefono", "custrecord_ht_cd_direccion", "custrecord_ht_cd_email", "custrecord_ht_cd_convencional"]
        });
    };

    const obtenerConvenio = (idConvenio) => {
        if (!idConvenio) return {};
        return search.lookupFields({
            type: "customrecord_ht_record_convenio", id: idConvenio,
            columns: ["custrecord_ht_cn_ruc_convenio", "custrecord_ht_cn_razon_social", "custrecord_ht_cn_direccion", "custrecord_ht_cn_celular", "custrecord_ht_cn_email", "custrecord_ht_cn_convencional"]
        });
    };

    const obtenerFamilia = (familia, subsidiaria) => {
        let results = [];
        try {
            let FamiliaSearch = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [["custrecord_ht_pp_codigo", "is", familia], 'AND', ['custrecord33', 'anyof', subsidiaria]],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo" })
                ]
            });
            let searchResult = FamiliaSearch.runPaged();
            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        codigo: result.getValue({ name: "custrecord_ht_pp_codigo" })
                    });
                });
            });
            return results[0];
        } catch (error) {
            log.debug('obtenerFamilia-error', error);
            return [];
        }
    };

    const idItemType = (itemId) => {
        if (!itemId) return "";
        let item = search.lookupFields({ type: search.Type.SERVICE_ITEM, id: itemId, columns: ["unitstype"] });
        if (item.unitstype) item.unitstype = item.unitstype.length ? item.unitstype[0].value : "";
        return item;
    };

    const obtenerNacionalidad = (id) => {
        let result = {};
        if (id == 2) { result = "EC"; }
        if (id == 3) { result = "PE"; }
        return result;
    };

    const obtenerValoresFechaHoy = () => {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        month = month < 10 ? `0${month}` : month;
        day = day < 10 ? `0${day}` : day;
        return { year, month, day };
    };

    const getSalesOrder = (salesOrderId) => {
        return search.lookupFields({ type: search.Type.SALES_ORDER, id: salesOrderId, columns: ['tranid'] });
    };

    const getVehiculoServicios = (id, ordenVenta, subsidiaria) => {
        try {
            const vehicleSearchObj = search.create({
                type: "customrecord_ht_nc_servicios_instalados",
                filters: [["custrecord_ns_bien_si", "anyof", id], "AND", ["custrecord_ns_orden_servicio_si", "anyof", ordenVenta]],
                columns: [
                    { name: "internalid" }, { name: "custrecord_ns_servicio" },
                    { name: "custrecord_ht_si_numero_puertas" }, { name: "custrecord_ht_si_novedad" }, { name: "custrecord_ht_tipo" }
                ]
            });
            const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        id: result.getValue({ name: "internalid" }),
                        servicio: result.getText({ name: "custrecord_ns_servicio" }),
                        infservicio: result.getValue({ name: "custrecord_ns_servicio" }),
                        numeroPuertas: result.getValue({ name: "custrecord_ht_si_numero_puertas" }),
                        novedad: result.getValue({ name: "custrecord_ht_si_novedad" }),
                        tipo: result.getText({ name: "custrecord_ht_tipo" })
                    });
                });
            });
            return respuesta;
        } catch (e) {
            log.debug('getVehiculoServicios-error', e);
            return [];
        }
    };

    // ------------------------------------------------------------------
    // obtenerCamposOrdenTrabajo* (una por familia de ADP), copia literal de las 4 variantes
    // que existen en el controller.
    // ------------------------------------------------------------------

    const obtenerCamposOrdenTrabajo = (ordenTrabajoId, subsidiaria) => {
        let Convenio = {}, Location = "", Ejecutiva = "";
        let ordenTrabajo = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        const vacio = { Dispositivo: "", vehiculo: "", Propietario: "", PropietarioMonitoreo: "", Cobertura: "", Subsidiaria: "", Aseguradora: "", Concesionario: "", Financiera: "", Convenio: "", Commands: "", Servicios: "", pxadminfinalizacion: "", confirmaciontelamatic: "", salesOrderId: "", numPuertas: "", Location: "", Ejecutiva: "" };
        if (ordenTrabajo.getValue('custrecord_ht_ot_subsidiary') != String(subsidiaria)) return vacio;
        let numPuertas = ordenTrabajo.getValue('custrecord_ht_ot_numero_puertas');
        let salesOrderId = ordenTrabajo.getValue('custrecord_ht_ot_orden_servicio');
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: salesOrderId });
        if (ordenVenta.getValue('subsidiary') != String(subsidiaria)) return vacio;
        let resultSet5 = query.runSuiteQL({ query: 'SELECT Location.name, Location.subsidiary FROM Location JOIN locationSubsidiaryMap ON location.id = locationSubsidiaryMap.location JOIN Subsidiary ON locationSubsidiaryMap.subsidiary = Subsidiary.id WHERE  location.id = ? and Subsidiary.id = ? ', params: [ordenVenta.getValue('location'), subsidiaria] });
        let results5 = resultSet5.asMappedResults();
        Location = results5.length > 0 ? results5[0]['name'] : "";
        let resultSet6 = query.runSuiteQL({ query: 'SELECT firstname, lastname, subsidiary FROM employee WHERE id = ? and  subsidiary = ? ', params: [ordenVenta.getValue('custbody_ht_os_ejecutivareferencia'), subsidiaria] });
        let results6 = resultSet6.asMappedResults();
        Ejecutiva = results6.length > 0 ? results6[0]['firstname'] + ' ' + results6[0]['lastname'] : "";
        let resultSet4 = query.runSuiteQL({ query: 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? and custrecord_bn_subsidiaria = ? ', params: [ordenVenta.getValue('custbody_ht_so_bien'), subsidiaria] });
        let results4 = resultSet4.asMappedResults();
        let periodoCobertura = obtenerPeriodoCobertura(ordenVenta);
        let fechaChequeo = ordenTrabajo.getValue('custrecord_ht_ot_fechatrabajoasignacion');
        if (!fechaChequeo) fechaChequeo = getFechaChequeo();
        let fechaCoberturaOrden = getCobertura(periodoCobertura, UNIDAD_TIEMPO.MESES, fechaChequeo);
        let Dispositivo = obtenerDispositivo(ordenTrabajo.getValue('custrecord_ht_ot_serieproductoasignacion'), subsidiaria);
        if (Dispositivo !== undefined) Dispositivo.producto = ordenTrabajo.getText('custrecord_ht_ot_producto') || "";
        let vehiculo = obtenerVehiculo(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), subsidiaria);
        let productCadena = ordenTrabajo.getText('custrecord_ht_ot_producto');
        if (productCadena.includes("-")) productCadena = productCadena.split('-')[1];
        vehiculo.producto = productCadena || "";
        vehiculo.fechaInicioCobertura = ordenVenta.getValue('trandate');
        vehiculo.fechaFinCobertura = new Date(vehiculo.fechaInicioCobertura.getFullYear(), vehiculo.fechaInicioCobertura.getMonth() + periodoCobertura, vehiculo.fechaInicioCobertura.getDate());
        let Propietario = obtenerPropietario(ordenTrabajo.getValue('custrecord_ht_ot_cliente_id'), subsidiaria);
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, ordenTrabajo.getValue('custrecord_ht_ot_item'), subsidiaria);
        let Cobertura = obtenerCobertura(ordenTrabajo, subsidiaria);
        Cobertura.custrecord_ht_co_coberturainicial = Cobertura?.custrecord_ht_co_coberturainicial ? Cobertura.custrecord_ht_co_coberturainicial : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinal = Cobertura?.custrecord_ht_co_coberturafinal ? Cobertura.custrecord_ht_co_coberturafinal : fechaCoberturaOrden?.coberturaFinal;
        Cobertura.custrecord_ht_co_coberturainicialtext = Cobertura?.custrecord_ht_co_coberturainicialtext ? Cobertura.custrecord_ht_co_coberturainicialtext : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinaltext = Cobertura?.custrecord_ht_co_coberturafinaltext ? Cobertura.custrecord_ht_co_coberturafinaltext : fechaCoberturaOrden?.coberturaFinal;
        let pxadminfinalizacion = ordenTrabajo.getValue('custrecord_ht_ot_pxadminfinalizacion');
        let confirmaciontelamatic = ordenTrabajo.getValue('custrecord_ht_ot_confirmaciontelamatic');
        let Subsidiaria = obtenerSubsidiaria(ordenVenta.getValue('subsidiary'));
        let Aseguradora = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros'), subsidiaria);
        let Concesionario = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario'), subsidiaria);
        let Financiera = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera'), subsidiaria);
        if (results4.length > 0) {
            Convenio = obtenerConvenio(results4[0]['custrecord_ht_bien_conveniovehiculo']);
        } else {
            Convenio = obtenerConvenio(ordenVenta.getValue('custbody_ht_os_convenio'));
        }
        let Commands = getVehiculoServicios(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), salesOrderId, subsidiaria);
        let Servicios = ordenTrabajo.getText("custrecord_ht_ot_servicios_commands");
        return { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, Subsidiaria, Aseguradora, Concesionario, Financiera, Convenio, Commands, Servicios, pxadminfinalizacion, confirmaciontelamatic, salesOrderId, numPuertas, Location, Ejecutiva };
    };

    const obtenerCamposOrdenTrabajoChequeo = (ordenTrabajoId, subsidiaria) => {
        let Convenio = {}, Location = "", Ejecutiva = "";
        let ordenTrabajo = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        const vacio = { Dispositivo: "", vehiculo: "", Propietario: "", PropietarioMonitoreo: "", Cobertura: "", Subsidiaria: "", Aseguradora: "", Concesionario: "", Financiera: "", Convenio: "", Commands: "", Servicios: "", pxadminfinalizacion: "", confirmaciontelamatic: "", salesOrderId: "", numPuertas: "", Location: "", Ejecutiva: "" };
        if (ordenTrabajo.getValue('custrecord_ht_ot_subsidiary') != String(subsidiaria)) return vacio;
        let numPuertas = ordenTrabajo.getValue('custrecord_ht_ot_numero_puertas');
        let salesOrderId = ordenTrabajo.getValue('custrecord_ht_ot_orden_servicio');
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: salesOrderId });
        if (ordenVenta.getValue('subsidiary') != String(subsidiaria)) return vacio;
        let resultSet5 = query.runSuiteQL({ query: 'SELECT Location.name, Location.subsidiary FROM Location JOIN locationSubsidiaryMap ON location.id = locationSubsidiaryMap.location JOIN Subsidiary ON locationSubsidiaryMap.subsidiary = Subsidiary.id WHERE  location.id = ? and Subsidiary.id = ? ', params: [ordenVenta.getValue('location'), subsidiaria] });
        let results5 = resultSet5.asMappedResults();
        Location = results5.length > 0 ? results5[0]['name'] : "";
        let resultSet6 = query.runSuiteQL({ query: 'SELECT firstname, lastname, subsidiary FROM employee WHERE id = ? and  subsidiary = ? ', params: [ordenVenta.getValue('custbody_ht_os_ejecutivareferencia'), subsidiaria] });
        let results6 = resultSet6.asMappedResults();
        Ejecutiva = results6.length > 0 ? results6[0]['firstname'] + ' ' + results6[0]['lastname'] : "";
        let resultSet4 = query.runSuiteQL({ query: 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? and custrecord_bn_subsidiaria = ? ', params: [ordenVenta.getValue('custbody_ht_so_bien'), subsidiaria] });
        let results4 = resultSet4.asMappedResults();
        let periodoCobertura = obtenerPeriodoCobertura(ordenVenta);
        let fechaChequeo = ordenTrabajo.getValue('custrecord_ht_ot_fechatrabajoasignacion');
        if (!fechaChequeo) fechaChequeo = getFechaChequeo();
        let fechaCoberturaOrden = getCobertura(periodoCobertura, UNIDAD_TIEMPO.MESES, fechaChequeo);
        let Dispositivo = obtenerDispositivo(ordenTrabajo.getValue('custrecord_ht_ot_serieproductoasignacion'), subsidiaria);
        if (Dispositivo !== undefined) Dispositivo.producto = ordenTrabajo.getText('custrecord_ht_ot_producto') || "";
        let vehiculo = obtenerVehiculo(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), subsidiaria);
        let productCadena = ordenTrabajo.getText('custrecord_ht_ot_producto');
        if (productCadena.includes("-")) productCadena = productCadena.split('-')[1];
        vehiculo.producto = productCadena || "";
        vehiculo.fechaInicioCobertura = ordenVenta.getValue('trandate');
        vehiculo.fechaFinCobertura = new Date(vehiculo.fechaInicioCobertura.getFullYear(), vehiculo.fechaInicioCobertura.getMonth() + periodoCobertura, vehiculo.fechaInicioCobertura.getDate());
        let Propietario = obtenerPropietario(ordenTrabajo.getValue('custrecord_ht_ot_cliente_id'), subsidiaria);
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, ordenTrabajo.getValue('custrecord_ht_ot_item'), subsidiaria);
        let familia = ordenTrabajo.getText('custrecord_ht_ot_producto').split(' - ');
        let idfamilia = familia.length ? familia[0] : '';
        let familiaConsulta = obtenerFamilia(idfamilia, subsidiaria);
        let Cobertura = obtenerCoberturaDisp(ordenVenta.getValue('custbody_ht_so_bien'), familiaConsulta.id, subsidiaria);
        Cobertura.custrecord_ht_co_coberturainicial = Cobertura?.custrecord_ht_co_coberturainicial ? Cobertura.custrecord_ht_co_coberturainicial : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinal = Cobertura?.custrecord_ht_co_coberturafinal ? Cobertura.custrecord_ht_co_coberturafinal : fechaCoberturaOrden?.coberturaFinal;
        Cobertura.custrecord_ht_co_coberturainicialtext = Cobertura?.custrecord_ht_co_coberturainicialtext ? Cobertura.custrecord_ht_co_coberturainicialtext : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinaltext = Cobertura?.custrecord_ht_co_coberturafinaltext ? Cobertura.custrecord_ht_co_coberturafinaltext : fechaCoberturaOrden?.coberturaFinal;
        let pxadminfinalizacion = ordenTrabajo.getValue('custrecord_ht_ot_pxadminfinalizacion');
        let confirmaciontelamatic = ordenTrabajo.getValue('custrecord_ht_ot_confirmaciontelamatic');
        let Subsidiaria = obtenerSubsidiaria(ordenVenta.getValue('subsidiary'));
        let Aseguradora = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros'), subsidiaria);
        let Concesionario = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario'), subsidiaria);
        let Financiera = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera'), subsidiaria);
        if (results4.length > 0) {
            Convenio = obtenerConvenio(results4[0]['custrecord_ht_bien_conveniovehiculo']);
        } else {
            Convenio = obtenerConvenio(ordenVenta.getValue('custbody_ht_os_convenio'));
        }
        let Commands = getVehiculoServicios(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), salesOrderId, subsidiaria);
        let Servicios = ordenTrabajo.getText("custrecord_ht_ot_servicios_commands");
        let vidAnterior = ordenTrabajo.getValue('custrecord_ht_ot_vid_anterior');
        let vidNuevo = ordenTrabajo.getValue('custrecord_ht_ot_vid_nuevo');
        return { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, Subsidiaria, Aseguradora, Concesionario, Financiera, Convenio, Commands, Servicios, pxadminfinalizacion, confirmaciontelamatic, salesOrderId, numPuertas, Location, Ejecutiva, vidAnterior, vidNuevo };
    };

    const obtenerCamposOrdenComponente = (ordenTrabajoId, subsidiaria) => {
        let Convenio = {}, Location = "", Ejecutiva = "";
        let ordenTrabajo = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        const vacio = { Dispositivo: "", vehiculo: "", Propietario: "", PropietarioMonitoreo: "", Cobertura: "", Subsidiaria: "", Aseguradora: "", Concesionario: "", Financiera: "", Convenio: "", Commands: "", Servicios: "", pxadminfinalizacion: "", confirmaciontelamatic: "", salesOrderId: "", numPuertas: "", Location: "", Ejecutiva: "" };
        if (ordenTrabajo.getValue('custrecord_ht_ot_subsidiary') != String(subsidiaria)) return vacio;
        let numPuertas = ordenTrabajo.getValue('custrecord_ht_ot_numero_puertas');
        let salesOrderId = ordenTrabajo.getValue('custrecord_ht_ot_orden_servicio');
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: salesOrderId });
        if (ordenVenta.getValue('subsidiary') != String(subsidiaria)) return vacio;
        let resultSet5 = query.runSuiteQL({ query: 'SELECT Location.name, Location.subsidiary FROM Location JOIN locationSubsidiaryMap ON location.id = locationSubsidiaryMap.location JOIN Subsidiary ON locationSubsidiaryMap.subsidiary = Subsidiary.id WHERE  location.id = ? and Subsidiary.id = ? ', params: [ordenVenta.getValue('location'), subsidiaria] });
        let results5 = resultSet5.asMappedResults();
        Location = results5.length > 0 ? results5[0]['name'] : "";
        let resultSet6 = query.runSuiteQL({ query: 'SELECT firstname, lastname, subsidiary FROM employee WHERE id = ? and  subsidiary = ? ', params: [ordenVenta.getValue('custbody_ht_os_ejecutivareferencia'), subsidiaria] });
        let results6 = resultSet6.asMappedResults();
        Ejecutiva = results6.length > 0 ? results6[0]['firstname'] + ' ' + results6[0]['lastname'] : "";
        let resultSet4 = query.runSuiteQL({ query: 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? and custrecord_bn_subsidiaria = ? ', params: [ordenVenta.getValue('custbody_ht_so_bien'), subsidiaria] });
        let results4 = resultSet4.asMappedResults();
        let periodoCobertura = obtenerPeriodoCobertura(ordenVenta);
        let fechaChequeo = ordenTrabajo.getValue('custrecord_ht_ot_fechatrabajoasignacion');
        if (!fechaChequeo) fechaChequeo = getFechaChequeo();
        let fechaCoberturaOrden = getCobertura(periodoCobertura, UNIDAD_TIEMPO.MESES, fechaChequeo);
        let Dispositivo = obtenerDispositivo(ordenTrabajo.getValue('custrecord_ht_ot_serieproductoasignacion'), subsidiaria);
        if (Dispositivo !== undefined) Dispositivo.producto = ordenTrabajo.getText('custrecord_ht_ot_producto') || "";
        let familia = ordenTrabajo.getText('custrecord_ht_ot_producto').split(' - ');
        let idfamilia = familia.length ? familia[0] : '';
        let familiaConsulta = obtenerFamilia(idfamilia, subsidiaria);
        let vehiculo = obtenerVehiculo(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), subsidiaria);
        let productCadena = ordenTrabajo.getText('custrecord_ht_ot_producto');
        if (productCadena.includes("-")) productCadena = productCadena.split('-')[1];
        vehiculo.producto = productCadena || "";
        vehiculo.fechaInicioCobertura = ordenVenta.getValue('trandate');
        vehiculo.fechaFinCobertura = new Date(vehiculo.fechaInicioCobertura.getFullYear(), vehiculo.fechaInicioCobertura.getMonth() + periodoCobertura, vehiculo.fechaInicioCobertura.getDate());
        let Propietario = obtenerPropietario(ordenTrabajo.getValue('custrecord_ht_ot_cliente_id'), subsidiaria);
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, ordenTrabajo.getValue('custrecord_ht_ot_item'), subsidiaria);
        let Cobertura = obtenerCoberturaDisp(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), familiaConsulta.id, subsidiaria);
        Cobertura.custrecord_ht_co_coberturainicial = Cobertura?.custrecord_ht_co_coberturainicial ? Cobertura.custrecord_ht_co_coberturainicial : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinal = Cobertura?.custrecord_ht_co_coberturafinal ? Cobertura.custrecord_ht_co_coberturafinal : fechaCoberturaOrden?.coberturaFinal;
        Cobertura.custrecord_ht_co_coberturainicialtext = Cobertura?.custrecord_ht_co_coberturainicialtext ? Cobertura.custrecord_ht_co_coberturainicialtext : fechaCoberturaOrden?.coberturaInicial;
        Cobertura.custrecord_ht_co_coberturafinaltext = Cobertura?.custrecord_ht_co_coberturafinaltext ? Cobertura.custrecord_ht_co_coberturafinaltext : fechaCoberturaOrden?.coberturaFinal;
        let pxadminfinalizacion = ordenTrabajo.getValue('custrecord_ht_ot_pxadminfinalizacion');
        let confirmaciontelamatic = ordenTrabajo.getValue('custrecord_ht_ot_confirmaciontelamatic');
        let Subsidiaria = obtenerSubsidiaria(ordenVenta.getValue('subsidiary'));
        let Aseguradora = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros'), subsidiaria);
        let Concesionario = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario'), subsidiaria);
        let Financiera = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera'), subsidiaria);
        if (results4.length > 0) {
            Convenio = obtenerConvenio(results4[0]['custrecord_ht_bien_conveniovehiculo']);
        } else {
            Convenio = obtenerConvenio(ordenVenta.getValue('custbody_ht_os_convenio'));
        }
        let Commands = getVehiculoServicios(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), salesOrderId, subsidiaria);
        let Servicios = ordenTrabajo.getText("custrecord_ht_ot_servicios_commands");
        return { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, Subsidiaria, Aseguradora, Concesionario, Financiera, Convenio, Commands, Servicios, pxadminfinalizacion, confirmaciontelamatic, salesOrderId, numPuertas, Location, Ejecutiva };
    };

    const obtenerCamposOrdenTrabajoDisp = (ordenTrabajoId, subsidiaria) => {
        let Convenio = {}, Location = "", Ejecutiva = "";
        let ordenTrabajo = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        const vacio = { Dispositivo: "", vehiculo: "", Propietario: "", PropietarioMonitoreo: "", Cobertura: "", Subsidiaria: "", Aseguradora: "", Concesionario: "", Financiera: "", Convenio: "", Commands: "", Servicios: "", pxadminfinalizacion: "", confirmaciontelamatic: "", salesOrderId: "", numPuertas: "", Location: "", Ejecutiva: "" };
        if (ordenTrabajo.getValue('custrecord_ht_ot_subsidiary') != String(subsidiaria)) return vacio;
        let numPuertas = ordenTrabajo.getValue('custrecord_ht_ot_numero_puertas');
        let salesOrderId = ordenTrabajo.getValue('custrecord_ht_ot_orden_servicio');
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: salesOrderId });
        if (ordenVenta.getValue('subsidiary') != String(subsidiaria)) return vacio;
        let resultSet5 = query.runSuiteQL({ query: 'SELECT Location.name, Location.subsidiary FROM Location JOIN locationSubsidiaryMap ON location.id = locationSubsidiaryMap.location JOIN Subsidiary ON locationSubsidiaryMap.subsidiary = Subsidiary.id WHERE  location.id = ? and Subsidiary.id = ? ', params: [ordenVenta.getValue('location'), subsidiaria] });
        let results5 = resultSet5.asMappedResults();
        Location = results5.length > 0 ? results5[0]['name'] : "";
        let resultSet6 = query.runSuiteQL({ query: 'SELECT firstname, lastname, subsidiary FROM employee WHERE id = ? and  subsidiary = ? ', params: [ordenVenta.getValue('custbody_ht_os_ejecutivareferencia'), subsidiaria] });
        let results6 = resultSet6.asMappedResults();
        Ejecutiva = results6.length > 0 ? results6[0]['firstname'] + ' ' + results6[0]['lastname'] : "";
        let resultSet4 = query.runSuiteQL({ query: 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? and custrecord_bn_subsidiaria = ? ', params: [ordenVenta.getValue('custbody_ht_so_bien'), subsidiaria] });
        let results4 = resultSet4.asMappedResults();
        let periodoCobertura = obtenerPeriodoCobertura(ordenVenta);
        let Dispositivo = obtenerDispositivo(ordenTrabajo.getValue('custrecord_ht_ot_serieproductoasignacion'), subsidiaria);
        let Cobertura = [];
        if (Dispositivo !== undefined) {
            Dispositivo.producto = ordenTrabajo.getText('custrecord_ht_ot_producto') || "";
            Cobertura = obtenerCobertura(ordenTrabajo, subsidiaria);
        } else {
            let familia = ordenTrabajo.getText('custrecord_ht_ot_producto').split(' - ');
            let idfamilia = familia.length ? familia[0] : '';
            let familiaConsulta = obtenerFamilia(idfamilia, subsidiaria);
            Cobertura = obtenerCoberturaDisp(ordenVenta.getValue('custbody_ht_so_bien'), familiaConsulta.id, subsidiaria);
            Dispositivo = obtenerDispositivo(Cobertura.numeroserieproducto, subsidiaria);
        }
        let vehiculo = obtenerVehiculo(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), subsidiaria);
        let productCadena = ordenTrabajo.getText('custrecord_ht_ot_producto');
        if (productCadena.includes("-")) productCadena = productCadena.split('-')[1];
        vehiculo.producto = productCadena || "";
        vehiculo.fechaInicioCobertura = ordenVenta.getValue('trandate');
        vehiculo.fechaFinCobertura = new Date(vehiculo.fechaInicioCobertura.getFullYear(), vehiculo.fechaInicioCobertura.getMonth() + periodoCobertura, vehiculo.fechaInicioCobertura.getDate());
        let Propietario = obtenerPropietario(ordenTrabajo.getValue('custrecord_ht_ot_cliente_id'), subsidiaria);
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, ordenTrabajo.getValue('custrecord_ht_ot_item'), subsidiaria);
        let pxadminfinalizacion = ordenTrabajo.getValue('custrecord_ht_ot_pxadminfinalizacion');
        let confirmaciontelamatic = ordenTrabajo.getValue('custrecord_ht_ot_confirmaciontelamatic');
        let Subsidiaria = obtenerSubsidiaria(ordenVenta.getValue('subsidiary'));
        let Aseguradora = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros'), subsidiaria);
        let Concesionario = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario'), subsidiaria);
        let Financiera = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera'), subsidiaria);
        if (results4.length > 0) {
            Convenio = obtenerConvenio(results4[0]['custrecord_ht_bien_conveniovehiculo']);
        } else {
            Convenio = obtenerConvenio(ordenVenta.getValue('custbody_ht_os_convenio'));
        }
        let Commands = getVehiculoServicios(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'), salesOrderId, subsidiaria);
        let Servicios = ordenTrabajo.getText("custrecord_ht_ot_servicios_commands");
        return { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, Subsidiaria, Aseguradora, Concesionario, Financiera, Convenio, Commands, Servicios, pxadminfinalizacion, confirmaciontelamatic, salesOrderId, numPuertas, Location, Ejecutiva };
    };

    // ------------------------------------------------------------------
    // setXxxValues: copia literal de los setters del controller.
    // ------------------------------------------------------------------

    const setAuthenticationValues = (PxAdmin) => {
        let { year, month, day } = obtenerValoresFechaHoy();
        PxAdmin["StrToken"] = `SH2PX${year}${month}${day}`;
        PxAdmin["UserName"] = usuario;
        PxAdmin["Password"] = clave;
        PxAdmin["NACIONALIDAD"] = "";
        PxAdmin["URLPX"] = "";
        PxAdmin["UsuarioIngreso"] = "";
        PxAdmin["FileName"] = "";
        PxAdmin["Respuesta"] = "";
    };

    const setOrdenVentaEmptyField = (PxAdmin) => {
        PxAdmin["NumeroOrden"] = ""; PxAdmin["NombreEjecutiva"] = ""; PxAdmin["Ciudad"] = "";
        PxAdmin["Sucursal"] = ""; PxAdmin["EstadoCartera"] = ""; PxAdmin["FechaInicioCobertura"] = ""; PxAdmin["FechaFinCobertura"] = "";
    };
    const setVehiculoEmptyField = (PxAdmin) => {
        PxAdmin["Placa"] = ""; PxAdmin["IdMarca"] = ""; PxAdmin["DescMarca"] = ""; PxAdmin["IdModelo"] = "";
        PxAdmin["DescModelo"] = ""; PxAdmin["CodigoVehiculo"] = ""; PxAdmin["Chasis"] = ""; PxAdmin["Motor"] = "";
        PxAdmin["Color"] = ""; PxAdmin["Anio"] = ""; PxAdmin["Tipo"] = ""; PxAdmin["Emergencia"] = "";
    };
    const setDispositivoEmptyFields = (PxAdmin) => {
        PxAdmin["Vid"] = ""; PxAdmin["IdProducto"] = ""; PxAdmin["DescProducto"] = ""; PxAdmin["CodMarcaDispositivo"] = "";
        PxAdmin["MarcaDispositivo"] = ""; PxAdmin["CodModeloDispositivo"] = ""; PxAdmin["ModeloDispositivo"] = "";
        PxAdmin["Sn"] = ""; PxAdmin["Imei"] = ""; PxAdmin["NumeroCamaras"] = ""; PxAdmin["DireccionMac"] = "";
        PxAdmin["Icc"] = ""; PxAdmin["NumeroCelular"] = ""; PxAdmin["Operadora"] = ""; PxAdmin["EstadoSim"] = "ACTIVO";
        PxAdmin["ServiciosInstalados"] = ""; PxAdmin["OperacionDispositivo"] = ""; PxAdmin["VidAnterior"] = "";
    };
    const setPropietarioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorPropietario"] = ""; PxAdmin["NombrePropietario"] = ""; PxAdmin["ApellidosPropietario"] = "";
        PxAdmin["DireccionPropietario"] = ""; PxAdmin["ConvencionalPropietario"] = ""; PxAdmin["CelularPropietario"] = ""; PxAdmin["EmailPropietario"] = "";
    };
    const setMonitorEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorMonitorea"] = ""; PxAdmin["NombreMonitorea"] = ""; PxAdmin["ApellidosMonitorea"] = "";
        PxAdmin["DireccionMonitorea"] = ""; PxAdmin["ConvencionalMonitorea"] = ""; PxAdmin["CelularMonitorea"] = ""; PxAdmin["EmailMonitorea"] = "";
    };
    const setServicioEmptyFields = (PxAdmin) => {
        PxAdmin["CodServicio"] = ""; PxAdmin["DescripcionServicio"] = ""; PxAdmin["FechaInicioServicio"] = "";
        PxAdmin["FechaFinServicio"] = ""; PxAdmin["EstadoServicio"] = "";
    };
    const setConcesionarioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorConcesionario"] = ""; PxAdmin["RazonSocialConcesionario"] = ""; PxAdmin["DireccionConcesionario"] = "";
        PxAdmin["ConvencionalConcesionario"] = ""; PxAdmin["CelularConcesionario"] = ""; PxAdmin["EmailConcesionario"] = "";
    };
    const setFinancieraEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorFinanciera"] = ""; PxAdmin["RazonSocialFinanciera"] = ""; PxAdmin["DireccionFinanciera"] = "";
        PxAdmin["ConvencionalFinanciera"] = ""; PxAdmin["CelularFinanciera"] = ""; PxAdmin["EmailFinanciera"] = "";
    };
    const setAseguradoraEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorAseguradora"] = ""; PxAdmin["RazonSocialAseguradora"] = ""; PxAdmin["DireccionAseguradora"] = "";
        PxAdmin["ConvencionalAseguradora"] = ""; PxAdmin["CelularAseguradora"] = ""; PxAdmin["EmailAseguradora"] = "";
    };
    const setConvenioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorConvenio"] = ""; PxAdmin["RazonSocialConvenio"] = ""; PxAdmin["DireccionConvenio"] = "";
        PxAdmin["ConvencionalConvenio"] = ""; PxAdmin["CelularConvenio"] = ""; PxAdmin["EmailConvenio"] = "";
    };
    const setEmptyFields = (PxAdmin) => {
        setOrdenVentaEmptyField(PxAdmin); setVehiculoEmptyField(PxAdmin); setDispositivoEmptyFields(PxAdmin);
        setPropietarioEmptyFields(PxAdmin); setMonitorEmptyFields(PxAdmin); setConcesionarioEmptyFields(PxAdmin);
        setFinancieraEmptyFields(PxAdmin); setAseguradoraEmptyFields(PxAdmin); setConvenioEmptyFields(PxAdmin); setServicioEmptyFields(PxAdmin);
    };

    const setSalesOrderValues = (PxAdmin, salesOrderId, vehiculo, Cobertura, location, ejecutiva, NACIONALIDAD) => {
        let salesOrder = getSalesOrder(salesOrderId);
        if (NACIONALIDAD == "PE") {
            PxAdmin["NumeroOrden"] = salesOrder.tranid.replace('S001', '').replace('M001', '').replace(/\D/g, '');
        } else {
            PxAdmin["NumeroOrden"] = salesOrder.tranid.replace(/\D/g, '');
        }
        const fecha = new Date();
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        const orden = `${anio}${mes}${dia}`;
        if (NACIONALIDAD == "PE") {
            PxAdmin["FileName"] = salesOrder.tranid.replace('S001', '').replace('M001', '').replace(/\D/g, '') + "_" + orden;
        } else {
            PxAdmin["FileName"] = salesOrder.tranid.replace(/\D/g, '') + "_" + orden;
        }
        PxAdmin["NACIONALIDAD"] = NACIONALIDAD;
        PxAdmin["UsuarioIngreso"] = "OPERAD" + "_" + NACIONALIDAD;
        let estadovehiculo = vehiculo["custrecord_ht_bn_estadobien"] || "";
        PxAdmin["EstadoCartera"] = estadovehiculo[0].text;
        PxAdmin["NombreEjecutiva"] = ejecutiva;
        PxAdmin["Sucursal"] = location;
        PxAdmin["Ciudad"] = location;
        PxAdmin["FechaInicioCobertura"] = Cobertura?.custrecord_ht_co_coberturainicial || vehiculo.co;
        PxAdmin["FechaFinCobertura"] = Cobertura?.custrecord_ht_co_coberturafinal || "";
    };

    const setVehiculoValues = (PxAdmin, vehiculo, operacionOrden, subsidiaria) => {
        let idMarca2 = vehiculo["custrecord_ht_bien_marca"] || "";
        let descMarca = vehiculo["custrecord_ht_bien_marca.custrecord_ht_marca_descripcion"] || "";
        let idModelo2 = vehiculo["custrecord_ht_bien_modelo"] || "";
        let descModelo = vehiculo["custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion"];
        let colorName = vehiculo["custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion"];
        let tipoVehiculo = vehiculo["custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion"];
        switch (vehiculo.custrecord_ht_bien_tipobien[0].value) {
            case "1": break;
            case "6":
                vehiculo.custrecord_ht_bien_placa = vehiculo.custrecord_ht_bien_nom_embarcacion;
                vehiculo.custrecord_ht_bien_chasis = vehiculo.altname;
                vehiculo.custrecord_ht_bien_motor = vehiculo.altname;
                break;
            case "7":
                vehiculo.custrecord_ht_bien_placa = vehiculo.custrecord_ht_bien_nom_embarcacion;
                vehiculo.custrecord_ht_bien_chasis = "NO DEFINIDO";
                vehiculo.custrecord_ht_bien_motor = "NO DEFINIDO";
                break;
            case "8":
                vehiculo.custrecord_ht_bien_placa = vehiculo.altname;
                vehiculo.custrecord_ht_bien_chasis = vehiculo.altname;
                vehiculo.custrecord_ht_bien_motor = vehiculo.altname;
                break;
            case "9":
                vehiculo.custrecord_ht_bien_placa = vehiculo.custrecord_ht_serie_pro;
                vehiculo.custrecord_ht_bien_chasis = vehiculo.altname;
                vehiculo.custrecord_ht_bien_motor = vehiculo.altname;
                break;
            default: break;
        }
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["Emergencia"] = vehiculo.custrecord_ht_bien_telefono_emergencia;
            PxAdmin["Placa"] = vehiculo.custrecord_ht_bien_placa;
            PxAdmin["IdMarca"] = idMarca2[0].value;
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0].value;
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
            PxAdmin["Chasis"] = vehiculo.custrecord_ht_bien_chasis;
            PxAdmin["Motor"] = vehiculo.custrecord_ht_bien_motor;
            PxAdmin["Color"] = colorName;
            PxAdmin["Anio"] = vehiculo.custrecord_ht_bien_ano;
            PxAdmin["Tipo"] = tipoVehiculo;
        } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION) {
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION) {
            PxAdmin["IdMarca"] = idMarca2[0].value;
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0].value;
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        } else if (operacionOrden == OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO) {
            PxAdmin["IdMarca"] = idMarca2[0].value;
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0].value;
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
            PxAdmin["Emergencia"] = vehiculo.custrecord_ht_bien_telefono_emergencia;
            PxAdmin["IdMarca"] = idMarca2[0].value;
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0].value;
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        } else if (operacionOrden == OPERACION_ORDEN_VENTA_SERVICIOS) {
            PxAdmin["Emergencia"] = vehiculo.custrecord_ht_bien_telefono_emergencia;
            PxAdmin["IdMarca"] = idMarca2[0] ? idMarca2[0].value : "";
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0] ? idModelo2[0].value : "";
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        }
    };

    const setDispositivoValues = (PxAdmin, Dispositivo, operacionOrden, subsidiaria) => {
        try {
            let idUnidad2 = Dispositivo["custrecord_ht_mc_unidad"];
            let descUnidad = Dispositivo["custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip"];
            let idModelo2 = Dispositivo["custrecord_ht_mc_modelo"];
            let descModelo = Dispositivo["custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr"];
            let descOperadora = Dispositivo["custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip"];
            let EstadoSim = Dispositivo ? Dispositivo?.custrecord_ht_mc_estadosimcard[0]?.text : '';
            if (EstadoSim == "ACTIVO") EstadoSim = "ACT";
            else if (EstadoSim == "CORTADO") EstadoSim = "COR";
            else if (EstadoSim == "INACTIVO") EstadoSim = "INA";
            else if (EstadoSim == "ANULADO") EstadoSim = "INA";
            let producto = Dispositivo.producto ? Dispositivo.producto.split(' - ') : "";
            let idProducto = producto.length ? producto[0] : '';
            let descProducto = producto.length > 1 ? producto[1] : '';
            if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["IdProducto"] = idProducto.substr(0, 5);
                PxAdmin["DescProducto"] = descProducto;
                PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
                PxAdmin["MarcaDispositivo"] = descUnidad;
                PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
                PxAdmin["ModeloDispositivo"] = descModelo;
                PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
                PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
                PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
                PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
                PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
                PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
                PxAdmin["Operadora"] = descOperadora;
                PxAdmin["EstadoSim"] = 'ACT';
                PxAdmin["OperacionDispositivo"] = "I";
            } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["OperacionDispositivo"] = "D";
            } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["IdProducto"] = idProducto.substr(0, 5);
                PxAdmin["DescProducto"] = descProducto;
                PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
                PxAdmin["MarcaDispositivo"] = descUnidad;
                PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
                PxAdmin["ModeloDispositivo"] = descModelo;
                PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
                PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
                PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
                PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
                PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
                PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
                PxAdmin["Operadora"] = descOperadora;
                PxAdmin["EstadoSim"] = EstadoSim;
                PxAdmin["OperacionDispositivo"] = "I";
            } else if (operacionOrden == OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
                PxAdmin["IdProducto"] = idProducto.substr(0, 5);
                PxAdmin["DescProducto"] = descProducto;
                PxAdmin["MarcaDispositivo"] = descUnidad;
                PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
                PxAdmin["ModeloDispositivo"] = descModelo;
                PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
                PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
                PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
                PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
                PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
                PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
                PxAdmin["Operadora"] = descOperadora;
                PxAdmin["EstadoSim"] = EstadoSim;
                PxAdmin["OperacionDispositivo"] = "A";
            } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
                PxAdmin["MarcaDispositivo"] = descUnidad;
                PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
                PxAdmin["ModeloDispositivo"] = descModelo;
                PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
                PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
                PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
                PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
                PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
                PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
                PxAdmin["Operadora"] = descOperadora;
                PxAdmin["EstadoSim"] = EstadoSim;
                PxAdmin["OperacionDispositivo"] = "A";
            } else if (operacionOrden == OPERACION_ORDEN_VENTA_SERVICIOS) {
                PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
                PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
                PxAdmin["MarcaDispositivo"] = descUnidad;
                PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
                PxAdmin["NumeroCamaras"] = "0";
                PxAdmin["ModeloDispositivo"] = descModelo;
                PxAdmin["OperacionDispositivo"] = "A";
            }
        } catch (error) {
            log.debug('setDispositivoValues-error', error.stack);
            return [];
        }
    };

    const setPropietarioValues = (PxAdmin, Propietario, operacionOrden, subsidiaria) => {
        if (operacionOrden == OPERACION_ORDEN_INSTALACION || operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
            PxAdmin["IdentificadorPropietario"] = Propietario.vatregnumber;
            PxAdmin["NombrePropietario"] = (typeof Propietario.custentity_ht_cl_primernombre == 'undefined' ? '' : Propietario.custentity_ht_cl_primernombre).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_segundonombre == 'undefined' ? '' : Propietario.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
            PxAdmin["ApellidosPropietario"] = (typeof Propietario.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidomaterno);
            PxAdmin["DireccionPropietario"] = Propietario.provincia.replace(/&/g, '&amp;');
            PxAdmin["ConvencionalPropietario"] = Propietario.homephone;
            if (subsidiaria == 2) { PxAdmin["CelularPropietario"] = Propietario.phone.length ? Propietario.phone.replace('+593', '0') : ''; }
            if (subsidiaria == 3) { PxAdmin["CelularPropietario"] = Propietario.phone.length ? Propietario.phone.replace('+51', '0') : ''; }
            PxAdmin["EmailPropietario"] = Propietario.email;
        }
    };

    const setAseguradoraValues = (PxAdmin, Aseguradora, operacionOrden, subsidiaria) => {
        if (!Aseguradora.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorAseguradora"] = Aseguradora.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialAseguradora"] = Aseguradora.custrecord_ht_cd_nombre.replace(/&/g, '&amp;') || "";
            PxAdmin["DireccionAseguradora"] = Aseguradora.custrecord_ht_cd_direccion.replace(/&/g, '&amp;') || "";
            if (subsidiaria == 2) { PxAdmin["ConvencionalAseguradora"] = Aseguradora.custrecord_ht_cd_convencional.replace('+593', '0'); PxAdmin["CelularAseguradora"] = Aseguradora.custrecord_ht_cd_telefono.replace('+593', '0') || ""; }
            if (subsidiaria == 3) { PxAdmin["ConvencionalAseguradora"] = Aseguradora.custrecord_ht_cd_convencional.replace('+51', '0'); PxAdmin["CelularAseguradora"] = Aseguradora.custrecord_ht_cd_telefono.replace('+51', '0') || ""; }
            PxAdmin["EmailAseguradora"] = Aseguradora.custrecord_ht_cd_email || "";
        }
    };

    const setConcesionarioValues = (PxAdmin, Concesionario, operacionOrden, subsidiaria) => {
        if (!Concesionario.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorConcesionario"] = Concesionario.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialConcesionario"] = Concesionario.custrecord_ht_cd_nombre || "";
            PxAdmin["DireccionConcesionario"] = Concesionario.custrecord_ht_cd_direccion || "";
            if (subsidiaria == 2) { PxAdmin["ConvencionalConcesionario"] = Concesionario.custrecord_ht_cd_convencional.replace('+593', '0'); PxAdmin["CelularConcesionario"] = Concesionario.custrecord_ht_cd_telefono.replace('+593', '0') || ""; }
            if (subsidiaria == 3) { PxAdmin["ConvencionalConcesionario"] = Concesionario.custrecord_ht_cd_convencional.replace('+51', '0'); PxAdmin["CelularConcesionario"] = Concesionario.custrecord_ht_cd_telefono.replace('+51', '0') || ""; }
            PxAdmin["EmailConcesionario"] = Concesionario.custrecord_ht_cd_email || "";
        }
    };

    const setFinancieraValues = (PxAdmin, Financiera, operacionOrden, subsidiaria) => {
        if (!Financiera.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorFinanciera"] = Financiera.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialFinanciera"] = Financiera.custrecord_ht_cd_nombre || "";
            PxAdmin["DireccionFinanciera"] = Financiera.custrecord_ht_cd_direccion || "";
            if (subsidiaria == 2) { PxAdmin["ConvencionalFinanciera"] = Financiera.custrecord_ht_cd_convencional.replace('+593', '0'); PxAdmin["CelularFinanciera"] = Financiera.custrecord_ht_cd_telefono.replace('+593', '0') || ""; }
            if (subsidiaria == 3) { PxAdmin["ConvencionalFinanciera"] = Financiera.custrecord_ht_cd_convencional.replace('+51', '0'); PxAdmin["CelularFinanciera"] = Financiera.custrecord_ht_cd_telefono.replace('+51', '0') || ""; }
            PxAdmin["EmailFinanciera"] = Financiera.custrecord_ht_cd_email || "";
        }
    };

    const setConvenioValues = (PxAdmin, Convenio, operacionOrden, subsidiaria) => {
        if (!Convenio.custrecord_ht_cn_ruc_convenio) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorConvenio"] = Convenio.custrecord_ht_cn_ruc_convenio || "";
            PxAdmin["RazonSocialConvenio"] = Convenio.custrecord_ht_cn_razon_social || "";
            PxAdmin["DireccionConvenio"] = Convenio.custrecord_ht_cn_direccion || "";
            if (subsidiaria == 2) { PxAdmin["ConvencionalConvenio"] = Convenio.custrecord_ht_cn_convencional.replace('+593', '0'); PxAdmin["CelularConvenio"] = Convenio.custrecord_ht_cn_celular.replace('+593', '0') || ""; }
            if (subsidiaria == 3) { PxAdmin["ConvencionalConvenio"] = Convenio.custrecord_ht_cn_convencional.replace('+51', '0'); PxAdmin["CelularConvenio"] = Convenio.custrecord_ht_cn_celular.replace('+51', '0') || ""; }
            PxAdmin["EmailConvenio"] = Convenio.custrecord_ht_cn_email || "";
        }
    };

    const setMonitoreoValues = (PxAdmin, PropietarioMonitoreo, operacionOrden, subsidiaria) => {
        let convencional = '';
        if (!PropietarioMonitoreo.vatregnumber) return;
        let tipoConvencional = '';
        let resultSet3 = '';
        if (subsidiaria == 2) {
            tipoConvencional = 10;
            resultSet3 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoConvencional, PropietarioMonitoreo.identity] });
        }
        if (subsidiaria == 3) {
            tipoConvencional = 4;
            resultSet3 = query.runSuiteQL({ query: 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?', params: [tipoConvencional, PropietarioMonitoreo.identity] });
        }
        let results3 = resultSet3 ? resultSet3.asMappedResults() : [];
        if (subsidiaria == 2) { convencional = results3.length ? results3[0]['convencional'].replace('+593', '0') : convencional; }
        if (subsidiaria == 3) { convencional = results3.length ? results3[0]['convencional'].replace('+51', '0') : convencional; }
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorMonitorea"] = PropietarioMonitoreo.vatregnumber;
            PxAdmin["NombreMonitorea"] = (typeof PropietarioMonitoreo.custentity_ht_cl_primernombre == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_primernombre).replace(/&/g, '&amp;') + ' ' + (typeof PropietarioMonitoreo.custentity_ht_cl_segundonombre == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
            PxAdmin["ApellidosMonitorea"] = (typeof PropietarioMonitoreo.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof PropietarioMonitoreo.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_apellidomaterno);
            PxAdmin["DireccionMonitorea"] = PropietarioMonitoreo.provincia.replace(/&/g, '&amp;');
            PxAdmin["ConvencionalMonitorea"] = convencional;
            if (subsidiaria == 2) { PxAdmin["CelularMonitorea"] = PropietarioMonitoreo.phone.replace('+593', '0'); }
            if (subsidiaria == 3) { PxAdmin["CelularMonitorea"] = PropietarioMonitoreo.phone.replace('+51', '0'); }
            PxAdmin["EmailMonitorea"] = PropietarioMonitoreo.email;
        }
    };

    const setCommandsValues = (PxAdmin, Servicios, operacionOrden, Cobertura, subsidiaria) => {
        PxAdmin["Alerta"] = "N";
        let CodServicioEmergencia = ["042", "046", "047", "048", "049"];
        if (operacionOrden == OPERACION_ORDEN_INSTALACION || operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES || operacionOrden == OPERACION_ORDEN_VENTA_SERVICIOS) {
            if (Servicios && Servicios.length > 0) {
                PxAdmin["Servicios"] = "<ServiciosInstalados>";
                for (let i = 0; i < Servicios.length; i++) {
                    PxAdmin["Servicios"] += "<Servicio><CodServicio>" + Servicios[i].split(" - ")[0] + "</CodServicio>";
                    PxAdmin["Servicios"] += "<DescripcionServicio>" + Servicios[i].split(" - ")[1] + "</DescripcionServicio>";
                    PxAdmin["Servicios"] += "<FechaInicioServicio>" + Cobertura.custrecord_ht_co_coberturainicialtext + "</FechaInicioServicio>";
                    PxAdmin["Servicios"] += "<FechaFinServicio>" + Cobertura.custrecord_ht_co_coberturafinaltext + "</FechaFinServicio>";
                    PxAdmin["Servicios"] += "<EstadoServicio>ACTIVO</EstadoServicio>";
                    PxAdmin["Servicios"] += "</Servicio>";
                    if (CodServicioEmergencia.includes(Servicios[i].split(" - ")[0])) PxAdmin["Alerta"] = "S";
                }
                PxAdmin["Servicios"] += "</ServiciosInstalados>";
            } else {
                PxAdmin["Servicios"] = "<ServiciosInstalados />";
            }
        } else {
            PxAdmin["Servicios"] = "<ServiciosInstalados />";
        }
    };

    // ------------------------------------------------------------------
    // Arma el PxAdmin segun el ADP resuelto, sin llamar a sendPXServer ni crear registros de
    // auditoria ni marcar la OT como finalizada.
    // ------------------------------------------------------------------
    const construirPxAdminOT = (ordenTrabajoId, subsidiaria, adpCode) => {
        let NACIONALIDAD = obtenerNacionalidad(subsidiaria);
        let PxAdmin = {};
        let vehiculo = "";
        switch (adpCode) {
            case OPERACION_ORDEN_INSTALACION: {
                let datos = obtenerCamposOrdenTrabajo(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_INSTALACION;
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setPropietarioValues(PxAdmin, datos.Propietario, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setAseguradoraValues(PxAdmin, datos.Aseguradora, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setConcesionarioValues(PxAdmin, datos.Concesionario, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setFinancieraValues(PxAdmin, datos.Financiera, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setConvenioValues(PxAdmin, datos.Convenio, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setMonitoreoValues(PxAdmin, datos.PropietarioMonitoreo, OPERACION_ORDEN_INSTALACION, subsidiaria);
                    setCommandsValues(PxAdmin, datos.Servicios, OPERACION_ORDEN_INSTALACION, datos.Cobertura, subsidiaria);
                }
                break;
            }
            case OPERACION_ORDEN_DESINSTALACION: {
                let datos = obtenerCamposOrdenTrabajo(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_DESINSTALACION;
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_DESINSTALACION, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_DESINSTALACION, subsidiaria);
                    setCommandsValues(PxAdmin, "", OPERACION_ORDEN_DESINSTALACION, datos.Cobertura, subsidiaria);
                }
                break;
            }
            case OPERACION_ORDEN_REINSTALACION: {
                let datos = obtenerCamposOrdenTrabajo(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_REINSTALACION;
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_REINSTALACION, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_REINSTALACION, subsidiaria);
                    setCommandsValues(PxAdmin, "", OPERACION_ORDEN_REINSTALACION, "", subsidiaria);
                }
                break;
            }
            case OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO: {
                let datos = obtenerCamposOrdenTrabajoChequeo(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO;
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO, subsidiaria);
                    setCommandsValues(PxAdmin, "", OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO, datos.Cobertura, subsidiaria);
                }
                break;
            }
            case OPERACION_ORDEN_CHEQUEO_COMPONENTES: {
                let datos = obtenerCamposOrdenComponente(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_CHEQUEO_COMPONENTES;
                    setPropietarioValues(PxAdmin, datos.Propietario, OPERACION_ORDEN_CHEQUEO_COMPONENTES, subsidiaria);
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_CHEQUEO_COMPONENTES, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_CHEQUEO_COMPONENTES, subsidiaria);
                    setCommandsValues(PxAdmin, datos.Servicios, OPERACION_ORDEN_CHEQUEO_COMPONENTES, datos.Cobertura, subsidiaria);
                }
                break;
            }
            case OPERACION_ORDEN_VENTA_SERVICIOS: {
                let datos = obtenerCamposOrdenTrabajoDisp(ordenTrabajoId, subsidiaria);
                vehiculo = datos.vehiculo;
                if (vehiculo && vehiculo != "") {
                    setAuthenticationValues(PxAdmin);
                    setEmptyFields(PxAdmin);
                    setSalesOrderValues(PxAdmin, datos.salesOrderId, vehiculo, datos.Cobertura, datos.Location, datos.Ejecutiva, NACIONALIDAD);
                    PxAdmin["OperacionOrden"] = OPERACION_ORDEN_VENTA_SERVICIOS;
                    setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_VENTA_SERVICIOS, subsidiaria);
                    setDispositivoValues(PxAdmin, datos.Dispositivo, OPERACION_ORDEN_VENTA_SERVICIOS, subsidiaria);
                    if (datos.Servicios !== undefined) {
                        setCommandsValues(PxAdmin, datos.Servicios, OPERACION_ORDEN_INSTALACION, datos.Cobertura, subsidiaria);
                    } else {
                        setCommandsValues(PxAdmin, "", OPERACION_ORDEN_VENTA_SERVICIOS, datos.Cobertura, subsidiaria);
                    }
                }
                break;
            }
            default:
                log.debug('construirPxAdminOT - ADP no soportado', { ordenTrabajoId, adpCode });
                return null;
        }
        if (!vehiculo || vehiculo === "") {
            log.debug('construirPxAdminOT - vehiculo vacio para la subsidiaria', { ordenTrabajoId, subsidiaria, adpCode });
            return null;
        }
        return PxAdmin;
    };

    // ------------------------------------------------------------------
    // Replica exacta de getBody() en IntegracionesHunter/HU_RS_PX_services.js.
    // ------------------------------------------------------------------
    const getBody = (context) => {
        let rowXml = "<Ordenes><Orden><NumeroOrden>" + context.NumeroOrden + "</NumeroOrden><UsuarioIngreso>" + context.UsuarioIngreso + "</UsuarioIngreso>" +
            "<OperacionOrden>" + context.OperacionOrden + "</OperacionOrden>"

        if (['001', '002', '003', '004', '005', '006', '007', '008', '009', '011', '012', '013', '014', '015', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
                "<Ciudad>" + context.Ciudad + "</Ciudad>" +
                "<Sucursal>" + context.Sucursal + "</Sucursal>" +
                "<EstadoCartera>" + context.EstadoCartera + "</EstadoCartera>" +
                "<FechaInicioCobertura>" + context.FechaInicioCobertura + "</FechaInicioCobertura>" +
                "<FechaFinCobertura>" + context.FechaFinCobertura + "</FechaFinCobertura>"
        }
        if (['010', '016', '017'].includes(String(context.OperacionOrden))) {
            rowXml += "<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
                "<Ciudad>" + context.Ciudad + "</Ciudad>" +
                "<Sucursal>" + context.Sucursal + "</Sucursal>" +
                "<EstadoCartera></EstadoCartera>" +
                "<FechaInicioCobertura></FechaInicioCobertura>" +
                "<FechaFinCobertura></FechaFinCobertura>"
        }
        if (['018'].includes(String(context.OperacionOrden))) {
            rowXml += "<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
                "<Ciudad>" + context.Ciudad + "</Ciudad>" +
                "<Sucursal>" + context.Sucursal + "</Sucursal>" +
                "<EstadoCartera>" + context.EstadoCartera + "</EstadoCartera>" +
                "<FechaInicioCobertura></FechaInicioCobertura>" +
                "<FechaFinCobertura></FechaFinCobertura>"
        }
        //vehiculo
        if (['001', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Vehiculo>" +
                "<Placa>" + (context.Placa || "") + "</Placa>" +
                "<IdMarca>" + (context.IdMarca || "") + "</IdMarca>" +
                "<DescMarca>" + (context.DescMarca || "") + "</DescMarca>" +
                "<IdModelo>" + (context.IdModelo || "") + "</IdModelo>" +
                "<DescModelo>" + (context.DescModelo || "") + "</DescModelo>" +
                "<CodigoVehiculo>" + (context.CodigoVehiculo || "") + "</CodigoVehiculo>" +
                "<Chasis>" + (context.Chasis || "") + "</Chasis>" +
                "<Motor>" + (context.Motor || "") + "</Motor>" +
                "<Color>" + (context.Color || "") + "</Color>" +
                "<Anio>" + (context.Anio || "") + "</Anio>" +
                "<Tipo>" + (context.Tipo || "") + "</Tipo>" +
                "</Vehiculo>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '017', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Vehiculo>" +
                "<Placa></Placa>" +
                "<IdMarca></IdMarca>" +
                "<DescMarca></DescMarca>" +
                "<IdModelo></IdModelo>" +
                "<DescModelo></DescModelo>" +
                "<CodigoVehiculo>" + (context.CodigoVehiculo || "") + "</CodigoVehiculo>" +
                "<Chasis></Chasis>" +
                "<Motor></Motor>" +
                "<Color></Color>" +
                "<Anio></Anio>" +
                "<Tipo></Tipo>" +
                "</Vehiculo>"
        }
        if (['016'].includes(String(context.OperacionOrden))) {
            rowXml += "<Vehiculo/>"
        }
        //dispositivo
        if (['001', '003'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto>" + (context.IdProducto || "") + "</IdProducto>" +
                "<DescProducto>" + (context.DescProducto || "") + "</DescProducto>" +
                "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
                "<MarcaDispositivo>" + (context.MarcaDispositivo || "") + "</MarcaDispositivo>" +
                "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
                "<ModeloDispositivo>" + (context.ModeloDispositivo || "") + "</ModeloDispositivo>" +
                "<Sn>" + (context.Sn || "") + "</Sn>" +
                "<Imei>" + (context.Imei || "") + "</Imei>" +
                "<NumeroCamaras>" + (context.NumeroCamaras || "") + "</NumeroCamaras>" +
                "<DireccionMac>" + (context.DireccionMac || "") + "</DireccionMac>" +
                "<Icc>" + (context.Icc || "") + "</Icc>" +
                "<NumeroCelular>" + (context.NumeroCelular || "") + "</NumeroCelular>" +
                "<Operadora>" + (context.Operadora || "") + "</Operadora>" +
                "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
                "</Dispositivo>"
        }
        if (['002', '004', '011'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto></IdProducto>" +
                "<DescProducto></DescProducto>" +
                "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                "<MarcaDispositivo></MarcaDispositivo>" +
                "<CodModeloDispositivo></CodModeloDispositivo>" +
                "<ModeloDispositivo></ModeloDispositivo>" +
                "<Sn></Sn>" +
                "<Imei></Imei>" +
                "<NumeroCamaras>0</NumeroCamaras>" +
                "<DireccionMac></DireccionMac>" +
                "<Icc></Icc>" +
                "<NumeroCelular></NumeroCelular>" +
                "<Operadora></Operadora>" +
                "<EstadoSim></EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior></VidAnterior>" +
                "</Dispositivo>"
        }
        if (['005', '006'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto>" + (context.IdProducto || "") + "</IdProducto>" +
                "<DescProducto>" + (context.DescProducto || "") + "</DescProducto>" +
                "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
                "<MarcaDispositivo>" + (context.MarcaDispositivo || "") + "</MarcaDispositivo>" +
                "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
                "<ModeloDispositivo>" + (context.ModeloDispositivo || "") + "</ModeloDispositivo>" +
                "<Sn>" + (context.Sn || "") + "</Sn>" +
                "<Imei>" + (context.Imei || "") + "</Imei>" +
                "<NumeroCamaras>" + (context.NumeroCamaras || "") + "</NumeroCamaras>" +
                "<DireccionMac>" + (context.DireccionMac || "") + "</DireccionMac>" +
                "<Icc>" + (context.Icc || "") + "</Icc>" +
                "<NumeroCelular>" + (context.NumeroCelular || "") + "</NumeroCelular>" +
                "<Operadora>" + (context.Operadora || "") + "</Operadora>" +
                "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
                "</Dispositivo>"
        }
        if (['007', '008', '009'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto></IdProducto>" +
                "<DescProducto></DescProducto>" +
                "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
                "<MarcaDispositivo>" + (context.MarcaDispositivo || "") + "</MarcaDispositivo>" +
                "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
                "<ModeloDispositivo>" + (context.ModeloDispositivo || "") + "</ModeloDispositivo>" +
                "<Sn>" + (context.Sn || "") + "</Sn>" +
                "<Imei>" + (context.Imei || "") + "</Imei>" +
                "<NumeroCamaras>" + (context.NumeroCamaras || "") + "</NumeroCamaras>" +
                "<DireccionMac>" + (context.DireccionMac || "") + "</DireccionMac>" +
                "<Icc>" + (context.Icc || "") + "</Icc>" +
                "<NumeroCelular>" + (context.NumeroCelular || "") + "</NumeroCelular>" +
                "<Operadora>" + (context.Operadora || "") + "</Operadora>" +
                "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
                "</Dispositivo>"
        }
        if (['017'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto>" + (context.IdProducto || "") + "</IdProducto>" +
                "<DescProducto></DescProducto>" +
                "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
                "<MarcaDispositivo></MarcaDispositivo>" +
                "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
                "<ModeloDispositivo></ModeloDispositivo>" +
                "<Sn></Sn>" +
                "<Imei></Imei>" +
                "<NumeroCamaras>0</NumeroCamaras>" +
                "<DireccionMac></DireccionMac>" +
                "<Icc></Icc>" +
                "<NumeroCelular></NumeroCelular>" +
                "<Operadora></Operadora>" +
                "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior></VidAnterior>" +
                "</Dispositivo>"

        }
        if (['012', '013', '014', '015', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid>" + (context.Vid || "") + "</Vid>" +
                "<IdProducto></IdProducto>" +
                "<DescProducto></DescProducto>" +
                "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                "<MarcaDispositivo></MarcaDispositivo>" +
                "<CodModeloDispositivo></CodModeloDispositivo>" +
                "<ModeloDispositivo></ModeloDispositivo>" +
                "<Sn></Sn>" +
                "<Imei></Imei>" +
                "<NumeroCamaras>0</NumeroCamaras>" +
                "<DireccionMac></DireccionMac>" +
                "<Icc></Icc>" +
                "<NumeroCelular></NumeroCelular>" +
                "<Operadora></Operadora>" +
                "<EstadoSim></EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior></VidAnterior>" +
                "</Dispositivo>"
        }
        if (['016'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                "<Vid></Vid>" +
                "<IdProducto></IdProducto>" +
                "<DescProducto></DescProducto>" +
                "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                "<MarcaDispositivo></MarcaDispositivo>" +
                "<CodModeloDispositivo></CodModeloDispositivo>" +
                "<ModeloDispositivo></ModeloDispositivo>" +
                "<Sn></Sn>" +
                "<Imei></Imei>" +
                "<NumeroCamaras>0</NumeroCamaras>" +
                "<DireccionMac></DireccionMac>" +
                "<Icc></Icc>" +
                "<NumeroCelular></NumeroCelular>" +
                "<Operadora></Operadora>" +
                "<EstadoSim></EstadoSim>" +
                context.Servicios +
                "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                "<VidAnterior></VidAnterior>" +
                "</Dispositivo>"
        }
        if (['010', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo/>"
        }

        //propietario
        if (['001', '007', '010', '016'].includes(String(context.OperacionOrden))) {
            rowXml += "<Propietario>" +
                "<IdentificadorPropietario>" + (context.IdentificadorPropietario || "") + "</IdentificadorPropietario>" +
                "<NombrePropietario>" + (context.NombrePropietario || "") + "</NombrePropietario>" +
                "<ApellidosPropietario>" + (context.ApellidosPropietario || "") + "</ApellidosPropietario>" +
                "<DireccionPropietario>" + (context.DireccionPropietario || "") + "</DireccionPropietario>" +
                "<ConvencionalPropietario>" + (context.ConvencionalPropietario || "") + "</ConvencionalPropietario>" +
                "<CelularPropietario>" + (context.CelularPropietario || "") + "</CelularPropietario>" +
                "<EmailPropietario>" + (context.EmailPropietario || "") + "</EmailPropietario>" +
                "</Propietario>"
        }
        if (['002', '003', '004', '005', '006', '008', '009', '011', '012', '013', '014', '015', '017', '018', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Propietario/>"
        }

        //monitoreo
        if (['001', '010'].includes(String(context.OperacionOrden))) {
            rowXml += "<Monitor>" +
                "<IdentificadorMonitorea>" + (context.IdentificadorMonitorea || "") + "</IdentificadorMonitorea>" +
                "<NombreMonitorea>" + (context.NombreMonitorea || "") + "</NombreMonitorea>" +
                "<ApellidosMonitorea>" + (context.ApellidosMonitorea || "") + "</ApellidosMonitorea>" +
                "<DireccionMonitorea>" + (context.DireccionMonitorea || "") + "</DireccionMonitorea>" +
                "<ConvencionalMonitorea>" + (context.ConvencionalMonitorea || "") + "</ConvencionalMonitorea>" +
                "<CelularMonitorea>" + (context.CelularMonitorea || "") + "</CelularMonitorea>" +
                "<EmailMonitorea>" + (context.EmailMonitorea || "") + "</EmailMonitorea>" +
                "</Monitor>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '011', '012', '013', '014', '015', '016', '017', '018', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Monitor/>"
        }

        //concesionario
        if (['001', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Concesionario>" +
                "<IdentificadorConcesionario>" + (context.IdentificadorConcesionario || "") + "</IdentificadorConcesionario>" +
                "<RazonSocialConcesionario>" + (context.RazonSocialConcesionario || "") + "</RazonSocialConcesionario>" +
                "<DireccionConcesionario>" + (context.DireccionConcesionario || "") + "</DireccionConcesionario>" +
                "<ConvencionalConcesionario>" + (context.ConvencionalConcesionario || "") + "</ConvencionalConcesionario>" +
                "<CelularConcesionario>" + (context.CelularConcesionario || "") + "</CelularConcesionario>" +
                "<EmailConcesionario>" + (context.EmailConcesionario || "") + "</EmailConcesionario>" +
                "</Concesionario>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Concesionario/>"
        }

        //financiera
        if (['001', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Financiera>" +
                "<IdentificadorFinanciera>" + (context.IdentificadorFinanciera || "") + "</IdentificadorFinanciera>" +
                "<RazonSocialFinanciera>" + (context.RazonSocialFinanciera || "") + "</RazonSocialFinanciera>" +
                "<DireccionFinanciera>" + (context.DireccionFinanciera || "") + "</DireccionFinanciera>" +
                "<ConvencionalFinanciera>" + (context.ConvencionalFinanciera || "") + "</ConvencionalFinanciera>" +
                "<CelularFinanciera>" + (context.CelularFinanciera || "") + "</CelularFinanciera>" +
                "<EmailFinanciera>" + (context.EmailFinanciera || "") + "</EmailFinanciera>" +
                "</Financiera>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Financiera/>"
        }

        //aseguradora
        if (['001', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Aseguradora>" +
                "<IdentificadorAseguradora>" + (context.IdentificadorAseguradora || "") + "</IdentificadorAseguradora>" +
                "<RazonSocialAseguradora>" + (context.RazonSocialAseguradora || "") + "</RazonSocialAseguradora>" +
                "<DireccionAseguradora>" + (context.DireccionAseguradora || "") + "</DireccionAseguradora>" +
                "<ConvencionalAseguradora>" + (context.ConvencionalAseguradora || "") + "</ConvencionalAseguradora>" +
                "<CelularAseguradora>" + (context.CelularAseguradora || "") + "</CelularAseguradora>" +
                "<EmailAseguradora>" + (context.EmailAseguradora || "") + "</EmailAseguradora>" +
                "</Aseguradora>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Aseguradora/>"
        }

        //convenio
        if (['001', '018'].includes(String(context.OperacionOrden))) {
            rowXml += "<Convenio>" +
                "<IdentificadorConvenio>" + (context.IdentificadorConvenio || "") + "</IdentificadorConvenio>" +
                "<RazonSocialConvenio>" + (context.RazonSocialConvenio || "") + "</RazonSocialConvenio>" +
                "<DireccionConvenio>" + (context.DireccionConvenio || "") + "</DireccionConvenio>" +
                "<ConvencionalConvenio>" + (context.ConvencionalConvenio || "") + "</ConvencionalConvenio>" +
                "<CelularConvenio>" + (context.CelularConvenio || "") + "</CelularConvenio>" +
                "<EmailConvenio>" + (context.EmailConvenio || "") + "</EmailConvenio>" +
                "</Convenio>"
        }
        if (['002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014', '015', '016', '017', '019'].includes(String(context.OperacionOrden))) {
            rowXml += "<Convenio/>"
        }
        rowXml += "</Orden></Ordenes>";
        return rowXml;
    };

    const execute = (scriptContext) => {
        const ot = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: OT_ID });
        const itemId = ot.getValue('custrecord_ht_ot_item');
        const subsidiaria = ot.getValue('custrecord_ht_ot_subsidiary');
        const noImpulsa = ot.getValue('custrecord_ht_ot_noimpulsaplataformas');
        const finalizada = ot.getValue('custrecord_ht_ot_pxadminfinalizacion');

        log.debug('GENERAR-XML-OT-INICIO', { otId: OT_ID, itemId, subsidiaria, noImpulsa, finalizada });

        const adpParam = _constant.Parameter && _constant.Parameter.ADP_ACCION_DEL_PRODUCTO;
        const adpRaw = getParametrizacionItem(itemId, adpParam);
        const adpCode = resolveAdpCode(adpRaw);
        log.debug('GENERAR-XML-OT-ADP', { itemId, adpParam, adpRaw, adpCode });

        const PxAdmin = construirPxAdminOT(OT_ID, subsidiaria, adpCode);

        if (!PxAdmin) {
            log.error('GENERAR-XML-OT-SIN-DATOS', {
                otId: OT_ID,
                adpCode,
                mensaje: 'No se pudo armar el PxAdmin (ADP no soportado por este script, o el vehiculo/OT no corresponde a la subsidiaria indicada).'
            });
            return;
        }

        const rowXml = getBody(PxAdmin);

        // Mismo sobre SOAP que arma HU_RS_PX_services.js antes de guardar el archivo, salvo que
        // aqui no se llama a AutenticacionUsuarioPx (no hay envio real), por lo que
        // AutenticacionToken queda vacio.
        const rawInsert = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\r\n" +
            "<soap:Header>\r\n  " +
            "<SeguridadPx xmlns=\"http://tempuri.org/\">\r\n" +
            "<StrToken>" + PxAdmin.StrToken + "</StrToken>\r\n" +
            "<AutenticacionToken></AutenticacionToken>\r\n" +
            "<UserName>" + PxAdmin.UserName + "</UserName>\r\n" +
            "<Password>" + PxAdmin.Password + "</Password>\r\n" +
            "</SeguridadPx>\r\n" +
            "</soap:Header>\r\n" +
            "<soap:Body>\r\n" +
            "<InsertaOrdenV2 xmlns=\"http://tempuri.org/\">\r\n" +
            "<strXml>\r\n" +
            "<![CDATA[\r\n" +
            rowXml + "\r\n" +
            "]]>\r\n" +
            "</strXml>\r\n" +
            "<strNacionalidad>" + PxAdmin.NACIONALIDAD + "</strNacionalidad>" +
            "</InsertaOrdenV2>\r\n" +
            "</soap:Body>\r\n" +
            "</soap:Envelope>";

        const xmlFile = file.create({
            name: (PxAdmin.FileName || ('OT' + OT_ID)) + '_PREVIEW_SIN_ENVIO.xml',
            fileType: file.Type.XMLDOC,
            contents: rawInsert,
            encoding: file.Encoding.UTF8,
            folder: FOLDER_XML
        });
        const fileId = xmlFile.save();

        log.audit('GENERAR-XML-OT-OK', { otId: OT_ID, adpCode, fileId, fileName: xmlFile.name });
    };

    return { execute };
});
