/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define([
    "N/https",
    "N/log",
    "N/record",
    "N/search",
    "./UtilsGeneral/HU_EC_FUNCION",
    "./UtilsGeneral/HU_EC_CONSTANTES",
    'N/file',
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
    'N/url'
], function (https, log, record, search, _funcion, _const, file, _platformController, url) {

    const SUBSIDIARIA_PE = 3;
    const ESTADO_ACTIVO = "1";
    const ESTADO_SUSPENDIDO = "2";

    const ACCION_IMPULSO = 4;   // TODO: confirmar si PE usa el mismo ID de impulso que EC
    const folderRequest = 24651   // TODO: confirmar/crear carpeta de PE (actualmente es la de EC PR)
    const folderResponse = 24652  // TODO: confirmar/crear carpeta de PE (actualmente es la de EC PR)
    let URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'; // Endpoint compartido LATAM (resuelve NACIONALIDAD por subsidiaria)

    let OK_STATUS_CODE = [200, 201];
    let URL = "https://telematicsapi.hunterlabs.io"
    let TOKEN = 'ZGVubmlzLmZlcm5hbmRlekBteWV2b2wuYml6OkM0cnMzZ3M0QDIwMjI='

    /* ============================================================
     *  ENTRADA
     * ============================================================ */
    function afterSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) return;

            const newRecord = context.newRecord;
            const recordId = newRecord.id;

            const subsidiaria = newRecord.getValue({ fieldId: 'custrecord_ht_co_subsidiaria' });
            if (String(subsidiaria) !== String(SUBSIDIARIA_PE)) return;

            const estadoCobertura = String(newRecord.getValue({ fieldId: 'custrecord_ht_co_estado_cobertura' }) || '');

            // Validación de estado: solo Activo (1) o Suspendido (2) disparan el proceso completo.
            if (estadoCobertura !== ESTADO_ACTIVO && estadoCobertura !== ESTADO_SUSPENDIDO) {
                log.debug('Estado no relevante para impulso', { recordId, estadoCobertura });
                return;
            }

            log.audit('Evento Cobertura PE - Inicio', { recordId, estadoCobertura });

            // Recargar el registro completo (el newRecord del evento no siempre trae todos los joins/valores necesarios)
            const recordData = record.load({ type: 'customrecord_ht_co_cobertura', id: recordId, isDynamic: false });

            const item = recordData.getValue('custrecord_ht_co_producto');
            const parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM']);

            if (parametrizacion_Item[2]?.Valor == 'JM') {
                log.debug('Evento Cobertura PE - Familia JM, se omite', { recordId });
                return;
            }

            const trama = obtenerDatosParaImpulso(recordData, true);

            if (parametrizacion_Item[0]?.Valor == '' && parametrizacion_Item[2]?.Valor == 'HT' && trama?.idtelematic == '') {
                log.debug("Parametrizacion Item", "No se encontró el item de parametrización, asignando valor por defecto 'S' para GPG");
                parametrizacion_Item[0].Valor = 'S'
            }

            if (!trama || !parametrizacion_Item?.length) {
                log.debug('Evento Cobertura PE - Sin trama o sin parametrización', { recordId });
                return;
            }
            trama.producto = parametrizacion_Item[2]?.Valor || "";

            log.debug("Trama", trama);
            log.debug("Parametrización del Item", parametrizacion_Item);

            // Enviar trama a PX si aplica
            if (parametrizacion_Item[0]?.Valor === 'S') {
                log.debug("Caso Actualización Cobertura PX", "Se envia datos de Actualización a PX");
                casoActualizacionCoberturaLatam(trama, SUBSIDIARIA_PE);
            }

            // Enviar trama a Telematic si aplica
            if (esEnvioAMIValido(parametrizacion_Item, trama)) {
                log.debug("Caso Actualización Telematic", "Se envia datos de Actualización a Telematic");
                casoActualizacionTelematic(trama);
            }

            log.audit('Evento Cobertura PE - Fin', { recordId });

        } catch (error) {
            log.error('Error en afterSubmit', error.stack || error.message || error);
        }
    }

    /**
     * Funciones Auxiliares
     */
    const obtenerDatosParaImpulso = (dataCobertura, impulsoManual) => {
        try {
            // ========================
            // 1. Validaciones iniciales
            // ========================
            if (!dataCobertura) throw new Error("El objeto dataCobertura es nulo o indefinido.");

            const fechaFinal = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturafinal')) || "";
            if (!fechaFinal) throw new Error("La fecha final no tiene valor.");

            let idTelematic = 0;

            // ========================
            // 2. Datos base de la cobertura
            // ========================
            const idCobertura = dataCobertura.id;
            const datoTecnico = dataCobertura.getValue('custrecord_ht_co_numeroserieproducto') || "";
            const CodigoVehiculo = dataCobertura.getValue('custrecord_ht_co_bien')?.toString() || "";
            const custrecord_ht_co_producto = dataCobertura.getValue('custrecord_ht_co_producto') || "";
            const estadocobertura = dataCobertura.getValue('custrecord_ht_co_estado_cobertura') || "";
            const Propietario = dataCobertura.getValue('custrecord_ht_co_propietario') || "";
            const PropietarioMonitoreo = dataCobertura.getValue('custrecord_ht_co_clientemonitoreo') || "";
            let familia_prod = dataCobertura.getValue('custrecord_ht_co_familia_prod') || "";

            if (familia_prod == 456) {  // !HT - HUNTER GPS HMT - 456
                try {
                    ActualizarInfTelematic(Propietario, PropietarioMonitoreo, CodigoVehiculo);
                } catch (error) {
                    log.debug("Error en ajusteTrama", error.message || error.stack);
                }
            }

            // ========================
            // 3. Cargar registro de Bien para obtener ID Telematic
            // ========================
            if (CodigoVehiculo) {
                try {
                    const registroBien = record.load({
                        type: "customrecord_ht_record_bienes",
                        id: CodigoVehiculo
                    });
                    idTelematic = registroBien.getValue({ fieldId: "custrecord_ht_bien_id_telematic" }) || "";
                    log.debug("ID Telematic", idTelematic);
                } catch (error) {
                    log.debug("Error al cargar el registro de Bien", error);
                }
            } else {
                log.debug("Aviso", "El registro de Bien no está asociado a esta Cobertura.");
            }

            // ========================
            // 4. Información de clientes
            // ========================
            const infoCliente = obtenerDatosPropietario(Propietario) || {};
            const infoClienteMonitoreo = obtenerDatosPropietario(PropietarioMonitoreo) || {};

            // Validar segmento del cliente
            if (impulsoManual) {
                if (!validarPropietarioAut(Propietario, impulsoManual) && estadocobertura === "2") {
                    log.debug("Proceso detenido", "Segmento cliente no válido y estado de cobertura es 2.");
                    return false;
                }
            }

            // ========================
            // 5. Determinar estado de la SIM
            // ========================
            const EstadoSim =
                estadocobertura === "1" ? "ACT" :
                    estadocobertura === "2" ? "INA" :
                        (() => { throw new Error("Estado de cobertura no válido."); })();

            // ========================
            // 6. Datos adicionales
            // ========================
            let CodigoSys = obtenerVehiculo(CodigoVehiculo);

            const { Vid, CodMarcaDispositivo, CodModeloDispositivo } = dataDatoTecnico(datoTecnico);
            const { familia } = dataFamilia(familia_prod);

            // Ajustar fecha final para cobertura AMI
            const ajusteFecha = (new Date(fechaFinal).toISOString()).split('T')[0] + "T23:59:59";

            // ========================
            // 7. Retornar trama de datos
            // ========================
            return {
                // Plataforma PX
                FechaFinCobertura: fechaFinal,
                Vid,
                CodMarcaDispositivo,
                CodModeloDispositivo,
                EstadoSim,
                CodigoProducto: custrecord_ht_co_producto,
                IdCobertura: idCobertura,
                IdDatoTecnico: datoTecnico,
                FamiliaProducto: familia,

                // Plataforma AMI
                clientepropietario: infoCliente?.vatregnumber || "",
                clientemonitoreo: infoClienteMonitoreo?.vatregnumber || infoCliente?.vatregnumber || "",
                codigovehiculo: CodigoVehiculo,
                codigosys: CodigoSys?.custrecord_ht_bien_codsysh || "",
                serie: "",
                comando: "",
                ruccompania: "",
                ordentrabajo: "0",
                sensors: "0",
                cobertura: ajusteFecha,
                producto: "",
                itemNS: custrecord_ht_co_producto,
                ordenservicio: "0",
                usuario: "OPERAD",
                origen: "N",
                idtelematic: idTelematic,
            };

        } catch (error) {
            log.debug("Error en obtenerDatosParaImpulso", error.message);
            return false;
        }
    };

    const dataDatoTecnico = (id) => {
        let objData = {
            Vid: '',
            CodMarcaDispositivo: '',
            MarcaDispositivo: '',
            CodModeloDispositivo: '',
            ModeloDispositivo: '',
            Sn: '',
            Imei: '',
            NumeroCamaras: '',
            DireccionMac: '',
            Icc: '',
            NumeroCelular: '',
            Operadora: ''
        };

        try {

            if (!id) {
                return objData;
            }

            let objSearch = search.create({
                type: "customrecord_ht_record_mantchaser",
                filters: [
                    ["internalid", "anyof", id]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_mc_vid", label: "Vid" }),
                    search.createColumn({ name: "custrecord_ht_dd_tipodispositivo_codigo", join: "CUSTRECORD_HT_MC_UNIDAD", label: "CodMarcaDispositivo" }),
                    search.createColumn({ name: "custrecord_ht_dd_tipodispositivo_descrip", join: "CUSTRECORD_HT_MC_UNIDAD", label: "MarcaDispositivo" }),
                    search.createColumn({ name: "custrecord_ht_dd_modelodispositivo_codig", join: "CUSTRECORD_HT_MC_MODELO", label: "CodModeloDispositivo" }),
                    search.createColumn({ name: "custrecord_ht_dd_modelodispositivo_descr", join: "CUSTRECORD_HT_MC_MODELO", label: "ModeloDispositivo" }),
                    search.createColumn({ name: "custrecord_ht_mc_sn", label: "Sn" }),
                    search.createColumn({ name: "custrecord_ht_mc_imei", label: "Imei" }),
                    search.createColumn({ name: "custrecord_ht_dd_numero_camaras", join: "CUSTRECORD_HT_MC_SERIEDISPOSITIVO", label: "NumeroCamaras" }),
                    search.createColumn({ name: "custrecord_ht_mc_macaddress", label: "DireccionMac" }),
                    search.createColumn({ name: "custrecord_ht_mc_icc", label: "Icc" }),
                    search.createColumn({ name: "custrecord_ht_mc_nocelularsim", label: "NumeroCelular" }),
                    search.createColumn({ name: "custrecord_ht_cs_operadora_descrip", join: "CUSTRECORD_HT_MC_OPERADORA", label: "Operadora" }),
                    search.createColumn({ name: "custrecord_ht_mc_unidad" }),
                    search.createColumn({ name: "custrecord_ht_mc_modelo" }),
                ]
            });

            let result = objSearch.run().getRange({ start: 0, end: 1 })[0];
            if (result) {
                objData.Vid = result.getValue({ name: "custrecord_ht_mc_vid" }) || '';
                objData.CodMarcaDispositivo = result.getValue({ name: "custrecord_ht_mc_unidad", label: "Codigo" })
                objData.MarcaDispositivo = result.getValue({ name: "custrecord_ht_dd_tipodispositivo_descrip", join: "CUSTRECORD_HT_MC_UNIDAD" }) || '';
                objData.CodModeloDispositivo = result.getValue({ name: "custrecord_ht_mc_modelo", label: "CodModeloDispositivo" })
                objData.ModeloDispositivo = result.getValue({ name: "custrecord_ht_dd_modelodispositivo_descr", join: "CUSTRECORD_HT_MC_MODELO" }) || '';
                objData.Sn = result.getValue({ name: "custrecord_ht_mc_sn" }) || '';
                objData.Imei = result.getValue({ name: "custrecord_ht_mc_imei" }) || '';
                objData.NumeroCamaras = result.getValue({ name: "custrecord_ht_dd_numero_camaras", join: "CUSTRECORD_HT_MC_SERIEDISPOSITIVO" }) || '';
                objData.DireccionMac = result.getValue({ name: "custrecord_ht_mc_macaddress" }) || '';
                objData.Icc = result.getValue({ name: "custrecord_ht_mc_icc" }) || '';
                objData.NumeroCelular = result.getValue({ name: "custrecord_ht_mc_nocelularsim" }) || '';
                objData.Operadora = result.getValue({ name: "custrecord_ht_cs_operadora_descrip", join: "CUSTRECORD_HT_MC_OPERADORA" }) || '';
            }
        } catch (error) {
            log.error("Error en getDataDatoTecnico", error);
        }

        return objData;
    };

    const formatearFecha = (fecha) => {
        try {
            const partes = fecha.split("/");
            const dia = partes[0];
            const mes = partes[1];
            const año = partes[2];
            const fechaFormateada = `${año}-${mes}-${dia}`;
            return fechaFormateada;
        } catch (error) {
            throw new Error("Error en Formatear fecha");
        }
    };

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {
            let data = [];
            for (let i = 0; i < busquedaParametro.length; i++) {

                if (!items || !busquedaParametro[i]) {
                    log.error("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
                    return [];
                }

                let filtro = [
                    ["custrecord_ht_pp_parametrizacionid", "is", items],
                    "AND",
                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
                ];

                let busqueda = search.create({
                    type: "customrecord_ht_pp_main_param_prod",
                    filters: filtro,
                    columns: [
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
                        search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
                        search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
                    ],
                });

                let resultCount = busqueda.runPaged().count;

                if (resultCount > 0) {
                    let pageData = busqueda.runPaged({ pageSize: 1 });
                    pageData.pageRanges.forEach((pageRange) => {
                        let page = pageData.fetch({ index: pageRange.index });
                        page.data.forEach((result) => {
                            let columns = result.columns;
                            let parametrizacion = {
                                Param: result.getValue(columns[2]) || "",
                                ParamId: result.getValue(columns[0]) || "",
                                Valor: result.getValue(columns[3]) || "",
                                ValorText: result.getText(columns[1]) || "",
                                ValorId: result.getValue(columns[1]) || "",
                            };
                            data.push(parametrizacion);
                        });
                    });
                } else {
                    data.push({
                        Param: "",
                        ParamId: "",
                        Valor: "",
                        ValorText: "",
                        ValorId: "",
                    });
                }
            }
            return data;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return []
        }
    };

    const crearRegistroImpulso = (cobertura, requestFile, responseFile, respuesta, Plataforma) => {
        try {
            let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: ACCION_IMPULSO });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });

            let saveRecord = objRecord.save();
        } catch (error) {
            log.error('Error al crear el registro de traza', { error: error.message, stack: error.stack });
        }
    };

    const fechaSistema = () => {
        let date = new Date();
        let tdate = date.getDate();
        tdate = tdate < 10 ? `0${tdate}` : tdate;
        let month = date.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let year = date.getFullYear();
        let hours = date.getHours();
        hours = hours < 10 ? `0${hours}` : hours;
        let minutes = date.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${tdate}${month}${year}${hours}${minutes}`;
    };

    const saveJson = (contents, nombre, folder) => {
        let fecha = fechaSistema();
        let fileObj = file.create({
            name: `${nombre}_${fecha}.json`,
            fileType: file.Type.JSON,
            contents: JSON.stringify(contents),
            folder: folder,
            isOnline: false
        });
        return fileObj.save();
    };

    const validarPropietarioAut = (id) => {
        try {
            if (!id) return false

            const searchObj = search.create({
                type: "customer",
                filters: [
                    // TODO: confirmar con negocio si esta lista de categorías aplica igual para PE
                    ["category", "anyof", "1", "7", "10", "8", "3", "5", "11"],
                    "AND",
                    ["subsidiary", "anyof", SUBSIDIARIA_PE],
                    "AND",
                    ["internalid", "anyof", id]
                ],
                columns: [
                    search.createColumn({ name: "entityid", label: "ID" }),
                    search.createColumn({ name: "altname", label: "Nombre" }),
                    search.createColumn({ name: "hasduplicates", label: "Duplicado" }),
                    search.createColumn({ name: "contact", label: "Contacto principal" }),
                    search.createColumn({ name: "category", label: "Categoría" }),
                    search.createColumn({ name: "subsidiary", label: "Subsidiaria principal" })
                ]
            });

            const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                return true
            } else {
                return false;
            }
        } catch (error) {
            log.error("Error en ValidarPropietarioAut", { error: error.message, stack: error.stack });
            return false;
        }
    };

    function generarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
        try {
            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();
        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    };

    const casoActualizacionTelematic = (data) => {
        try {
            if (!data || Object.keys(data).length === 0) {
                log.error("casoActualizacionTelematic", "Los datos proporcionados son nulos, vacíos o indefinidos.");
                return false;
            }

            const token = _funcion.loginGetToken();
            if (!token) {
                log.error("casoActualizacionTelematic", "No se pudo obtener el token.");
                return false;
            }

            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const requestData = {
                "clientepropietario": data.clientepropietario,
                "clientemonitoreo": data.clientemonitoreo,
                "codigovehiculo": data.codigovehiculo,
                "codigosys": data.codigosys || data.codigovehiculo,
                "serie": "",
                "comando": "",
                "ruccompania": "",
                "ordentrabajo": "0",
                "sensors": "0",
                "cobertura": data.cobertura,
                "producto": data.producto,
                "itemNS": data.itemNS,
                "ordenservicio": data.ordenservicio,
                "usuario": "OPERAD",
                "origen": "N",
                "parametroproducto": "GPT",
                "vehiculoid": "",
                "clienteid": "",
                "accion": "",
                "vidanterior": "",
                "vid": ""
            };

            const options = {
                method: "POST",
                url: `${_const.URLS.HUNTER_API_NETSUITE}/ProcesoAMI/ActualizacionCoberturaNetsuite`,
                headers: headers,
                body: JSON.stringify(requestData),
            };

            let response = https.post(options);

            let temporal = response && response.body ? JSON.parse(response.body) : null;
            let respuesta = temporal && temporal[0]?.cODIGO == "1" ? temporal[0]?.cODIGO : response;

            const requestFile = saveJson(requestData, `request_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderRequest);
            const responseFile = saveJson(response, `response_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderResponse);

            crearRegistroImpulso(data.IdCobertura, requestFile, responseFile, respuesta, "TELEMATICS");

            if (response && response.code == 200) {
                return true;
            } else {
                log.error("Error en la respuesta de la API externa", temporal || response);
                generarLogCambioEstado(data, data.IdCobertura || 0, "F", "ProcesoAMI");
                return false;
            }
        } catch (error) {
            log.error("Error en casoActualizacionTelematic", error.message);
            crearRegistroImpulso(data?.IdCobertura, "", "", error?.message, "TELEMATICS");
            generarLogCambioEstado(error, data?.IdCobertura || 0, "F", "ProcesoAMI");
            return false;
        }
    };

    function esEnvioAMIValido(parametrizacion_Item, trama) {
        return (
            parametrizacion_Item[1]?.Valor === 'S' &&
            trama.producto &&
            trama.FechaInicioCobertura &&
            trama.FechaFinCobertura
        );
    };

    function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
        try {
            const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];
            const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
            if (camposVacios.length > 0) {
                log.error('Campos vacíos en jsonCobertura', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
                return true;
            }

            if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
                log.debug("Estado SIM no válido", trama.EstadoSim)
                return false;
            }

            let procesoPX = _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim);

            log.debug("Respuesta procesoPX..", procesoPX);

            if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
                generarLogCambioEstado(procesoPX.PxAdmin, trama.IdCobertura, 'F', "ProcesoPX");
            } else {
                let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);
                let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);

                crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');

                return true;
            }

        } catch (error) {
            log.debug("error", error)
            crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
            generarLogCambioEstado(error, trama?.IdCobertura, 'F', "ProcesoPX");
        }
    };

    function ActualizarInfTelematic(propietario, clienteMonitoreo, bien) {
        try {
            const headers = getHeaders();
            const urlBase = getTelematicUrlBase();

            let propietarioId = procesarPropietario(propietario, headers, urlBase);
            procesarPropietario(clienteMonitoreo, headers, urlBase);

            procesarBien(bien, headers, urlBase, propietarioId);

            return true;

        } catch (error) {
            log.debug("Error ActualizarInfTelematic", error.stack || error.message);
        }
    };

    const obtenerDatosPropietario = (customerId) => {
        if (!customerId) return;

        let customer = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: [
                'entityid',
                'custentity_ht_cl_primernombre',
                'custentity_ht_cl_segundonombre',
                'custentity_ht_cl_apellidopaterno',
                'custentity_ht_cl_apellidomaterno',
                'phone',
                'homephone',
                'email',
                'vatregnumber',
                'custentity_ht_customer_id_telematic',
                'internalid',
                'custentityts_ec_cod_tipo_doc_identidad',
                'companyname',
                'isperson',
                'subsidiary'
            ]
        });

        if (customer.subsidiary && customer.subsidiary.length) {
            let subsidiaryId = customer.subsidiary[0].value;
            let subsidiaryData = search.lookupFields({
                type: 'subsidiary',
                id: subsidiaryId,
                columns: ['taxidnum']
            });
            customer.taxidnum = subsidiaryData.taxidnum || '';
        }

        return customer;
    };

    const obtenerVehiculo = (id) => {
        if (!id) return;
        let vehiculo = search.lookupFields({
            type: 'customrecord_ht_record_bienes', id: id,
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
                'custrecord_ht_bien_ano',
                'custrecord_ht_bien_codsysh',
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
                'custrecord_ht_bien_tipo.custrecord_ht_tv_codigo',
                'custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion',
                'custrecord_ht_bien_numeropuertas',
                'custrecord_ht_bien_num_ruedas',
                'custrecord_ht_bien_max_peso',
                'custrecord_ht_bien_largo',
                'altname'
            ]
        });
        return vehiculo;
    };

    const dataFamilia = (id) => {
        const emptyFamilia = { familia: "" };

        if (!id) return emptyFamilia;

        try {
            const searchParametroInfo = search.lookupFields({
                type: "customrecord_ht_cr_pp_valores",
                id,
                columns: ['custrecord_ht_pp_codigo']
            });

            if (!searchParametroInfo || !Object.keys(searchParametroInfo).length) {
                log.error('getClientInfo', `No se encontró información para el cliente con ID: ${id}`);
                return emptyFamilia;
            }

            return {
                familia: searchParametroInfo.custrecord_ht_pp_codigo || ""
            };

        } catch (error) {
            log.error('error-getClientInfo', error.message || error);
            return emptyFamilia;
        }
    };

    const getHeaders = () => {
        let headers = {};
        headers['Accept'] = '*/*';
        headers['Content-Type'] = 'application/json';
        headers['Authorization'] = 'Basic ' + TOKEN;
        return headers;
    };

    const getTelematicUrlBase = () => {
        return URL
    };

    function procesarPropietario(customerId, headers, urlBase) {
        if (!customerId) return;
        const correos = obtenerCorreosPropietario(customerId);
        const datos = obtenerDatosPropietario(customerId);

        if (!datos?.custentity_ht_customer_id_telematic && correos?.amiEmail) {
            const getCustomerMonitorParams = {
                username: correos.amiEmail,
                customer__company_code: datos.taxidnum,
                customer__identity_document_number: datos.vatregnumber
            };

            const getCustomerMonitorUrl = formatUrl(`${urlBase}/customer/user/`, getCustomerMonitorParams);
            let getCustomerMonitorResponse = https.get({ headers, url: getCustomerMonitorUrl });

            if (OK_STATUS_CODE.indexOf(getCustomerMonitorResponse.code) === -1) {
                log.error('procesarPropietario', { code: getCustomerMonitorResponse.code, body: getCustomerMonitorResponse.body });
                return;
            }

            getCustomerMonitorResponse = JSON.parse(getCustomerMonitorResponse.body);

            if (getCustomerMonitorResponse.count === 1) {
                const customerMonitor = getCustomerMonitorResponse.results[0];
                return customerMonitor?.id || 0;
            }
        } else {
            return datos?.custentity_ht_customer_id_telematic
        }
    };

    function procesarBien(bienID, headers, urlBase, propietarioId) {
        if (!bienID || !propietarioId) return;

        const datosBien = obtenerVehiculo(bienID);
        if (datosBien?.custrecord_ht_bien_id_telematic || !datosBien?.custrecord_ht_bien_codsysh) return;

        let encontrado = false;

        function buscarYGuardar(paramValue, logLabel) {
            const params = {
                attributes__attribute__name: "COD_SYS",
                attributes__value: paramValue
            };

            const url = formatUrl(`${urlBase}/asset/`, params);
            let resp = https.get({ headers, url });

            if (!OK_STATUS_CODE.includes(resp.code)) {
                log.error(`procesarBien ${logLabel}`, { code: resp.code, body: resp.body });
                return;
            }

            resp = JSON.parse(resp.body);

            if (resp.count === 1) {
                const asset = resp.results[0];
                encontrado = true;
            }
        }

        buscarYGuardar(datosBien.custrecord_ht_bien_codsysh, "");

        if (!encontrado && datosBien?.internalid) {
            buscarYGuardar(datosBien.internalid, "por InternalID");
        }
    }

    const formatUrl = (domain, params) => {
        return url.format({ domain, params });
    };

    const obtenerCorreosPropietario = (customerId) => {
        let result = {
            email: "",
            amiEmail: "",
            convenioEmail: "",
            mainEmail: ""
        };

        let resultSearch = search.create({
            type: "customrecord_ht_record_correoelectronico",
            filters: [
                ["custrecord_ht_ce_enlace", "anyof", customerId],
                "AND",
                ["custrecord_ht_email_tipoemail", "anyof", ["1", "2", "3"]]
            ],
            columns: [
                search.createColumn({ name: "custrecord_ht_email_tipoemail" }),
                search.createColumn({ name: "custrecord_ht_email_email" }),
                search.createColumn({ name: "custrecord_ht_email_emailprincipal" })
            ]
        }).run().getRange(0, 3);

        for (let record of resultSearch) {
            let email = record.getValue("custrecord_ht_email_email");
            let emailType = record.getValue("custrecord_ht_email_tipoemail");
            let mainEmail = record.getValue("custrecord_ht_email_emailprincipal");

            if (mainEmail) result.mainEmail = email;
            if (emailType === "1") result.email = email;
            if (emailType === "2") result.amiEmail = email;
            if (emailType === "3") result.convenioEmail = email;
        }

        return result;
    };

    const sysDateTime = () => {
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${rand}_${rand2}`;
    };

    return {
        afterSubmit
    };
});
