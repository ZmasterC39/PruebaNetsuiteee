/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 11/02/2025
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros pendientes de procesamiento y envía los datos a un API externo.
Script: MapReduceScript
Ambiente: Producción
*/
define([
    "N/https",
    "N/log",
    "N/record",
    "N/search",
    "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
    "./UtilsGeneral/HU_EC_FUNCION",
    "./UtilsGeneral/HU_EC_CONSTANTES",
    'N/file',
    'N/runtime',
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
    'N/url'

], function (https, log, record, search, coberturaController, _funcion, _const, file, runtime, _platformController, url) {

    const ACCION_IMPULSO = 4;   // SB: 101   - PR: 4     
    const folderRequest = 24651   // SB: 28733 - PR: 24651
    const folderResponse = 24652  // SB: 28734 - PR: 24652
    // let URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; // URL de prueba
    let URLPX ='https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'

    let OK_STATUS_CODE = [200, 201];
    let URL = "https://telematicsapi.hunterlabs.io"
    let TOKEN = 'ZGVubmlzLmZlcm5hbmRlekBteWV2b2wuYml6OkM0cnMzZ3M0QDIwMjI='

    function getInputData() {
        try {
            // return
            let rangoAjustado = obtenerRangoTiempoEcuador();
            log.debug("rangoHora", rangoAjustado)

            // let rangoAjustado = { HoraInicio: "21/04/2026 00:00", HoraFin: "21/04/2026 23:59" };
            // log.debug("rangoHora", rangoAjustado);

            const horaInicio = parseInt(rangoAjustado.HoraInicio.split(" ")[1].split(":")[0], 10);
            const horaFin = parseInt(rangoAjustado.HoraFin.split(" ")[1].split(":")[0], 10);
            const fecha = rangoAjustado.HoraInicio.split(" ")[0];

            let results = [];

            for (let h = horaInicio; h < horaFin; h++) {
                for (let m = 0; m < 60; m += 15) {
                    const inicioHora = h.toString().padStart(2, '0');
                    const inicioMin = m.toString().padStart(2, '0');

                    let finHora = h;
                    let finMin = m + 15;
                    if (finMin === 60) {
                        finMin = 0;
                        finHora += 1;
                    }

                    const finHoraStr = finHora.toString().padStart(2, '0');
                    const finMinStr = finMin.toString().padStart(2, '0');

                    const bloqueInicio = `${fecha} ${inicioHora}:${inicioMin}`;
                    const bloqueFin = `${fecha} ${finHoraStr}:${finMinStr}`;

                    log.debug("Ejecutando búsqueda para el rango:", { bloqueInicio, bloqueFin });

                    const searchObj = search.create({
                        type: "customrecord_ht_co_cobertura",
                        filters: [
                            ["custrecord_ht_co_subsidiaria", "anyof", "2"],
                            "AND",
                            ["lastmodified", "within", bloqueInicio, bloqueFin],
                            "AND",
                            ["isinactive", "is", "F"],
                            "AND",
                            ['custrecord_ht_co_estado_cobertura', 'anyof', ['1', '2']]
                        ],
                        columns: [
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "lastmodifiedby", label: "ID Label" })
                        ]
                    });

                    const pagedData = searchObj.runPaged({ pageSize: 1000 });

                    pagedData.pageRanges.forEach(pageRange => {
                        const page = pagedData.fetch({ index: pageRange.index });
                        page.data.forEach(result => {
                            results.push(result);
                        });
                    });
                }
            }

            if (results.length === 0) {
                log.error("Búsqueda vacía", "No se encontraron resultados");
            }

            log.debug("--Resultados de la búsqueda--", results.length);

            return results.map(result => ({
                id: result.getValue({ name: "internalid", label: "ID interno" }),
                context: result.getValue({ name: "lastmodifiedby", label: "ID Label" }),
            }));


        } catch (error) {
            log.error("Error en getInputData", error);
            return
        }

    }

    function map(context) {
        try {
            log.debug("-Contexto recibido en map-", "---------------------------------------");

            // return
            const data = JSON.parse(context.value);

            // Validamos que los datos necesarios estén presentes en el registro
            if (!data.id || !data.context) {
                log.error("Datos incompletos en el registro", data);
                return; // Salimos de la función si los datos están incompletos
            }

            // Extraemos el ID del registro y el tipo de contexto de los datos
            const recordId = data.id;                                          // ID del registro a procesar
            const contextType = data.context;                                  // Tipo de contexto (e.g., UIF o CSV)

            log.debug("Procesando registro", { recordId, contextType });
            //  Genera Registro de producto 
            let recordData = record.load({ type: 'customrecord_ht_co_cobertura', id: recordId, isDynamic: true });

            const item = recordData.getValue('custrecord_ht_co_producto');
            const parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM']);
          
            if (parametrizacion_Item[2]?.Valor == 'JM') {
                return true
            }

            // Correcion de estado
            try {
                // log.debug("Evaluando fecha de cobertura final", recordData.getValue('custrecord_ht_co_estado_cobertura'));
                let EstadoCobeFinal = evaluarFechaCobertura(recordData.getText('custrecord_ht_co_coberturafinal'));
                let EstadoDispositivo = recordData.getValue('custrecord_ht_co_estado');

                if (EstadoDispositivo == 1 && EstadoCobeFinal == true) {
                    let estadocobertura = EstadoCobeFinal ? 1 : 2;
                    actualizarEstadoCobertura(recordData.id, estadocobertura);
                    // log.debug("Estado Cobertura Actualizado", estadocobertura);
                    recordData.setValue({ fieldId: 'custrecord_ht_co_estado_cobertura', value: estadocobertura });
                    // log.debug("Estado Cobertura Actualizado", estadocobertura);
                }

            } catch (error) {
                log.debug("Error al evaluar fecha de cobertura", error.message || error);
            }

            if (!huboCambioEnCampos(recordData.id)) {
                log.debug("Registro No cambio Fecha final o Estado", `El registro con ID ${recordData.id} no cumple con los criterios de actualización.`);
                return;
            }

            // if (existeRegistroImpulsoPlataforma(recordData.id)) {
            //     log.debug("Registro ya procesado hoy", `El registro con ID ${recordData.id} ya ha sido procesado hoy. Se omite para evitar duplicados.`);
            //     return;
            // }

            // const item = recordData.getValue('custrecord_ht_co_producto');
            const trama = obtenerDatosParaImpulso(recordData, true);
            // const parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM']);

            if (parametrizacion_Item[0]?.Valor == '' && parametrizacion_Item[2]?.Valor == 'HT' && trama?.idtelematic == '') {
                log.debug("Parametrizacion Item", "No se encontró el item de parametrización, asignando valor por defecto 'S' para GPG");
                parametrizacion_Item[0].Valor = 'S'
            }

            // if (parametrizacion_Item[2]?.Valor == 'JM') {
            //     return true
            // }

            if (!trama || !parametrizacion_Item?.length) return true;
            trama.producto = parametrizacion_Item[2]?.Valor || "";

            // if (parametrizacion_Item[0]?.Valor === 'S') log.debug("Caso Actualizacion Cobertura PX", "Enviando trama a PX");
            if (parametrizacion_Item[0]?.Valor === 'S') casoActualizacionCoberturaLatam(trama, 2);

            // if (esEnvioAMIValido(parametrizacion_Item, trama)) log.debug("Caso Actualizacion Telematic", "Enviando trama a Telematic");
            if (esEnvioAMIValido(parametrizacion_Item, trama)) casoActualizacionTelematic(trama);

        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el procesamiento
            log.error("Error en map", error.stack || error.message || error);
            return; // Salimos de la función en caso de error
        }
    }

    function reduce(context) {
        try {
            return true;
        } catch (error) {
            log.error("Error en reduce", error);
        }
    }

    function summarize(summary) {
        try {
            return true;
        } catch (error) {
            log.error("Error en summarize", error);
        }
    }

    /**
     * Funciones Auxiliares
     */
    function obtenerRangoTiempoEcuador() {
        try {
            const fechaServidor = new Date();
            const offsetEcuador = -5 * 60; // UTC-5 en minutos

            // Convertir fecha del servidor a hora local de Ecuador
            const utc = fechaServidor.getTime() + (fechaServidor.getTimezoneOffset() * 60000);
            const fechaEcuador = new Date(utc + (offsetEcuador * 60000));

            let hora = fechaEcuador.getHours();
            // let hora = 1;

            let fechaInicio, fechaFin;

            if (hora >= 0 && hora < 8) {
                // 00:00 - 08:00 → Devuelve 16:00 - 00:00 del día anterior
                const anterior = new Date(fechaEcuador);
                anterior.setDate(anterior.getDate() - 1);

                fechaInicio = new Date(anterior);
                fechaInicio.setHours(16, 0, 0, 0);

                fechaFin = new Date(anterior);
                fechaFin.setDate(fechaFin.getDate());
                fechaFin.setHours(23, 59, 59, 999);

            } else if (hora >= 8 && hora < 16) {
                // 08:00 - 16:00 → Devuelve 00:00 - 08:00 del mismo día
                fechaInicio = new Date(fechaEcuador);
                fechaInicio.setHours(0, 0, 0, 0);

                fechaFin = new Date(fechaEcuador);
                fechaFin.setHours(8, 0, 0, 0);

            } else {
                // 16:00 - 24:00 → Devuelve 08:00 - 16:00 del mismo día
                fechaInicio = new Date(fechaEcuador);
                fechaInicio.setHours(8, 0, 0, 0);

                fechaFin = new Date(fechaEcuador);
                fechaFin.setHours(16, 0, 0, 0);
            }

            return {
                HoraInicio: formatearFechaHora(fechaInicio),
                HoraFin: formatearFechaHora(fechaFin)
            };

        } catch (error) {
            log.debug("Error en obtenerRangoTiempoEcuador", error);
            return {};
        }
    };

    function formatearFechaHora(fecha) {
        let dia = fecha.getDate().toString().padStart(2, "0");
        let mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
        let anio = fecha.getFullYear();
        let hora = fecha.getHours().toString().padStart(2, "0");
        let minutos = fecha.getMinutes().toString().padStart(2, "0");

        if (hora == "23" && minutos == "59") {
            hora = "24";
            minutos = "00";
        }

        return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
    };

    // function validarCoberturaCarseg(idCobertura) {
    //     try {
    //         let CoberturaSearch = search.create({
    //             type: "customrecord_ht_co_cobertura",
    //             filters: [
    //                 ["internalid", "is", idCobertura],
    //                 "AND",
    //                 ["custrecord_ht_co_subsidiaria", "is", "2"],
    //                 "AND",
    //                 ["isinactive", "is", "F"],
    //                 "AND",
    //                 // ["custrecord_ht_co_propietario.internalid", "noneof", "47445"]
    //                 ["custrecord_ht_co_propietario.internalid", "noneof", "47445", "20995", "311945"],
    //                 'AND',
    //                 ['custrecord_ht_co_estado_cobertura', 'noneof', '5'],  // 06/02/2026 Se ajusta para evitar los convertidos
    //             ],
    //             columns: [
    //                 search.createColumn({
    //                     name: "internalid",
    //                     summary: "GROUP"
    //                 }),
    //                 search.createColumn({
    //                     name: "custrecord_ht_co_estado_cobertura",
    //                     summary: "GROUP"
    //                 }),

    //             ],
    //         });

    //         let searchResult = CoberturaSearch.run().getRange({ start: 0, end: 2 });

    //         if (searchResult.length > 0) {
    //             // Solo una respuesta está presente
    //             return true;
    //         }

    //         // No se encontraron resultados
    //         // log.debug("ValidarCoberturaCarseg", "No se encontraron resultados.");
    //         return false;

    //     } catch (error) {
    //         log.debug("Error en prepararDatosParaAPIInterna", error);
    //         return false;
    //     }
    // }

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
                // log.error('getDataDatoTecnico', 'El ID del dato técnico es nulo o indefinido');
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
                // objData.CodMarcaDispositivo = result.getValue({ name: "custrecord_ht_dd_tipodispositivo_codigo", join: "CUSTRECORD_HT_MC_UNIDAD" }) || '';
                objData.CodMarcaDispositivo = result.getValue({ name: "custrecord_ht_mc_unidad", label: "Codigo" })
                objData.MarcaDispositivo = result.getValue({ name: "custrecord_ht_dd_tipodispositivo_descrip", join: "CUSTRECORD_HT_MC_UNIDAD" }) || '';
                // objData.CodModeloDispositivo = result.getValue({ name: "custrecord_ht_dd_modelodispositivo_codig", join: "CUSTRECORD_HT_MC_MODELO" }) || '';
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
        // Guardar Registro de traza
        try {
            let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });                       // ID Cobertura 
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: ACCION_IMPULSO });                    // ID del impulso
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });                           // Plataforma -> PX
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });                          // Estado -> enviado
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });                   // Documento 
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });              // Documento
            objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });                       // Documento

            let saveRecord = objRecord.save();
            // log.debug('Registro guardado con ID', saveRecord);
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

            // log.debug("PropietarioID", id)

            if (!id) return false

            const searchObj = search.create({
                type: "customer",
                filters: [
                    ["category", "anyof", "1", "7", "10", "8", "3", "5", "11"],   // Solo Cliente Categoria 001, 017, 011
                    "AND",
                    ["subsidiary", "anyof", "2"],
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
            // Validar que los datos no sean nulos, vacíos o indefinidos
            if (!data || Object.keys(data).length === 0) {
                log.error("casoActualizacionTelematic", "Los datos proporcionados son nulos, vacíos o indefinidos.");
                return false;
            }

            // Obtener el token
            const token = _funcion.loginGetToken();
            if (!token) {
                log.error("casoActualizacionTelematic", "No se pudo obtener el token.");
                return false;
            }

            // Configurar los headers
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            // Construir el cuerpo de la solicitud
            const requestData = {
                "clientepropietario": data.clientepropietario,       // 1
                "clientemonitoreo": data.clientemonitoreo,           // 12
                "codigovehiculo": data.codigovehiculo,               // 2
                "codigosys": data.codigosys || data.codigovehiculo,  // 3
                "serie": "",                                         // 17
                "comando": "",                                       // 15
                "ruccompania": "",
                "ordentrabajo": "0",                                 // 9
                "sensors": "0",
                "cobertura": data.cobertura,                         // 6
                "producto": data.producto,                           // 5
                "itemNS": data.itemNS,                               // 11
                "ordenservicio": data.ordenservicio,                 // 8
                "usuario": "OPERAD",                                 // 4
                "origen": "N",                                       // 7
                "parametroproducto": "GPT",                          // 10
                "vehiculoid": "",                                    // 13
                "clienteid": "",                                     // 14
                "accion": "",                                        // 16
                "vidanterior": "",                                   // 18
                "vid": ""                                            // 19
            };

            // log.debug("Datos de la solicitud", requestData);

            // Configurar las opciones de la solicitud
            const options = {
                method: "POST",
                url: `${_const.URLS.HUNTER_API_NETSUITE}/ProcesoAMI/ActualizacionCoberturaNetsuite`,
                headers: headers,
                body: JSON.stringify(requestData),
            };

            // log.debug("Opciones de la API externa", options);

            // Realizar la solicitud HTTP
            let response = https.post(options);

            // Validar la respuesta
            let temporal = response && response.body ? JSON.parse(response.body) : null;
            let respuesta = temporal && temporal[0]?.cODIGO == "1" ? temporal[0]?.cODIGO : response;

            // Crear archivos de trazabilidad
            const requestFile = saveJson(requestData, `request_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderRequest);
            // log.debug("Archivo de solicitud creado", requestFile);

            const responseFile = saveJson(response, `response_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderResponse);
            // log.debug("Archivo de respuesta creado", responseFile);

            // Crear registro de impulso
            crearRegistroImpulso(data.IdCobertura, requestFile, responseFile, respuesta, "TELEMATICS");

            // Validar el estado de la respuesta
            if (response && response.code == 200) {
                // log.debug("Respuesta exitosa de la API externa", temporal);
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
            parametrizacion_Item[1]?.Valor === 'S' &&     // Validar si el envío a AMI está habilitado posee GPT
            trama.producto &&                             // Validar que el producto no esté vacío
            trama.FechaInicioCobertura &&                 // Validar que la fecha de inicio no esté vacía
            trama.FechaFinCobertura                       // Validar que la fecha de fin no esté vacía
        );
    };

    function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
        try {

            // log.debug("trama", trama) // !
            // log.debug("SubsidiariaID", SubsidiariaID) // !
            const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];

            const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
            if (camposVacios.length > 0) {
                // log.debug("--jsonCobertura--", jsonCobertura)
                log.error('Campos vacíos en jsonCobertura', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
                return true; // Detener el proceso si hay campos vacíos
            }

            // log.debug("trama", trama.EstadoSim) // !

            if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
                log.debug("Estado SIM no válido", trama.EstadoSim)
                return false;
            }

            let procesoPX = _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim);

            log.debug("Respuesta procesoPX..", procesoPX);

            if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
                // Generar log Proceso General PX 
                generarLogCambioEstado(procesoPX.PxAdmin, trama.IdCobertura, 'F', "ProcesoPX");
            } else {
                // Crear Archivos
                let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);  // json traza
                // log.debug('idrequestFile', requestFile);

                let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);   // json Respuesta
                // log.debug('idresponseFile', requestFile);

                crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');

                return true;
            }

        } catch (error) {
            log.debug("error", error)
            crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
            generarLogCambioEstado(error, trama?.IdCobertura, 'F', "ProcesoPX");
        }
    };

    function evaluarFechaCobertura(fechaFinalCobertura) {
        try {
            const formatoValido = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!formatoValido.test(fechaFinalCobertura)) return false;

            const hoy = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" }));
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const anio = hoy.getFullYear();
            const fechaActual = new Date(`${anio}-${mes}-${dia}`);

            const partes = fechaFinalCobertura.split('/');
            const fechaFinal = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);

            if (isNaN(fechaFinal) || isNaN(fechaActual)) return false;

            return fechaFinal >= fechaActual;
        } catch (error) {
            log.error("Error al evaluar cobertura", error);
            return false;
        }
    }

    function actualizarEstadoCobertura(recordId, estado) {
        try {
            record.submitFields({
                type: "customrecord_ht_co_cobertura",
                id: recordId,
                values: {
                    custrecord_ht_co_estado_cobertura: estado
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug("Estado de cobertura actualizado", `ID: ${recordId}`);
        } catch (error) {
            log.error("Error al actualizar el estado de cobertura", {
                recordId: recordId,
                mensaje: error.message
            });
            throw error;
        }
    };

    function ActualizarInfTelematic(propietario, clienteMonitoreo, bien) {
        try {
            log.debug("---------------------------", "---------------------------");
            const headers = getHeaders();
            const urlBase = getTelematicUrlBase();

            // Procesar propietario principal y propietario de monitoreo
            let propietarioId = procesarPropietario(propietario, headers, urlBase);  // cliente
            procesarPropietario(clienteMonitoreo, headers, urlBase);                 // cliente de monitoreo

            // Procesar vehículo
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
                'subsidiary' // traer solo el ID/nombre
            ]
        });

        // Si hay subsidiaria, buscar su federalidnumber
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

        // if (datos.custentity_ht_customer_id_telematic && correos.amiEmail) {
        if (!datos?.custentity_ht_customer_id_telematic && correos?.amiEmail) {  //!
            const getCustomerMonitorParams = {
                username: correos.amiEmail,
                customer__company_code: datos.taxidnum,
                customer__identity_document_number: datos.vatregnumber
            };
            log.error("Datos de consulta Propietario", getCustomerMonitorParams);

            const getCustomerMonitorUrl = formatUrl(`${urlBase}/customer/user/`, getCustomerMonitorParams);
            let getCustomerMonitorResponse = https.get({ headers, url: getCustomerMonitorUrl });

            if (OK_STATUS_CODE.indexOf(getCustomerMonitorResponse.code) === -1) {
                return getResultResponse("error", results, JSON.stringify({
                    code: getCustomerMonitorResponse.code,
                    error: JSON.parse(getCustomerMonitorResponse.body)
                }));
            }

            getCustomerMonitorResponse = JSON.parse(getCustomerMonitorResponse.body);
            log.error("-Respuesta Propietario-", getCustomerMonitorResponse);

            if (getCustomerMonitorResponse.count === 1) {
                const customerMonitor = getCustomerMonitorResponse.results[0];
                log.error("-Propietario-IdTelematic-Simulacion-guardado", customerMonitor?.id);


                // guardarEnNetSuite('customer', customerId, {
                //   custentity_ht_customer_id_telematic: customerMonitor.id
                // });

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

            log.error(`Datos de consulta Bien ${logLabel}`, params);

            const url = formatUrl(`${urlBase}/asset/`, params);
            let resp = https.get({ headers, url });

            if (!OK_STATUS_CODE.includes(resp.code)) {
                return getResultResponse("error", results, JSON.stringify({
                    code: resp.code,
                    error: JSON.parse(resp.body)
                }));
            }

            resp = JSON.parse(resp.body);
            log.error(`-Respuesta Bien ${logLabel}-`, resp);

            if (resp.count === 1) {
                const asset = resp.results[0];
                log.error(`-Bien ${logLabel}-IdTelematic-Simulacion-Guardado`, asset?.id);

                // guardarEnNetSuite('customrecord_ht_record_bienes', bienID, {
                //   custrecord_ht_bien_id_telematic: asset.id
                // });

                encontrado = true; // Marca que ya se encontró
            }
        }

        // Buscar primero por COD_SYS de datosBien
        buscarYGuardar(datosBien.custrecord_ht_bien_codsysh, "");

        // Si no se encontró, intentar con InternalID
        if (!encontrado && datosBien?.internalid) {

            log.error("Datos de consulta Bien por InternalID", { internalid: datosBien.internalid });
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
        }).run().getRange(0, 3); // Solo 3 resultados

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

    function guardarEnNetSuite(tipoRegistro, idRegistro, valores) {
        try {
            record.submitFields({
                type: tipoRegistro,
                id: idRegistro,
                values: valores,
                options: { enableSourcing: false, ignoreMandatoryFields: true }
            });

            log.debug("Registro actualizado correctamente", {
                tipo: tipoRegistro,
                id: idRegistro,
                valores
            });

            return true;
        } catch (error) {
            log.error("Error al actualizar registro en NetSuite", {
                tipo: tipoRegistro,
                id: idRegistro,
                valores,
                mensaje: error.message || error,
                stack: error.stack || "Sin traza de error"
            });
            return false;
        }
    };

    // const existeRegistroHoy = (coberturaId) => {
    //     try {
    //         const busqueda = search.create({
    //             type: "customrecord_ht_ct_traza_impulso_platafo",
    //             filters: [
    //                 ["created", "on", "today"],
    //                 "AND",
    //                 ["custrecord_ht_ip_cobertura", "anyof", coberturaId]
    //             ],
    //             columns: ["internalid"]
    //         });

    //         const count = busqueda.runPaged().count;

    //         return count > 0; // true si existe al menos uno
    //     } catch (e) {
    //         log.error('Error en existeRegistroHoy', e);
    //         return false;
    //     }
    // };

    const existeRegistroImpulsoPlataforma = (coberturaId) => {
        try {
            return false
            const ahora = new Date();

            // Convertir a Ecuador (UTC-5)
            const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
            const fechaEcuador = new Date(utc - (5 * 60 * 60000));

            const hora = fechaEcuador.getHours();

            const filtroFecha = (hora >= 0 && hora < 8) ? "yesterday" : "today";

            // log.debug("Fecha Ecuador", fechaEcuador);
            log.debug("Filtro de fecha para búsqueda", filtroFecha);

            const busqueda = search.create({
                type: "customrecord_ht_ct_traza_impulso_platafo",
                filters: [
                    ["created", "on", filtroFecha],
                    "AND",
                    ["custrecord_ht_ip_cobertura", "anyof", coberturaId]
                ],
                columns: ["internalid"]
            });

            const count = busqueda.runPaged().count;

            return count > 0;

        } catch (e) {
            log.error('Error en existeRegistroHoy', e);
            return false;
        }
    };

    function huboCambioEnCampos(recordId) {
        try {

            const ahora = new Date();
            const utc = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
            const fechaEcuador = new Date(utc - (5 * 60 * 60000));
            const hora = fechaEcuador.getHours();
            const filtroFecha = (hora >= 0 && hora < 8) ? "yesterday" : "today";

            const searchObj = search.create({
                type: "systemnote",
                filters: [
                    ["recordid", "equalto", recordId],
                    "AND",
                    ["date", "within", filtroFecha],
                    // ["date", "within", "yesterday"],
                  
                    "AND",
                    ["recordtype", "anyof", "677"],
                    "AND",
                    ["field", "anyof",
                        "CUSTRECORD_HT_CO_COBERTURAFINAL",
                        "CUSTRECORD_HT_CO_ESTADO_COBERTURA"
                    ]
                ],
                columns: [
                    search.createColumn({ name: "recordid" })
                ]
            });

            const result = searchObj.run().getRange({ start: 0, end: 1 });

            log.debug("--Resultados de búsqueda de cambios en campos", result.length > 0 ? true : false);
            return result.length > 0;

        } catch (e) {
            log.error("Error en huboCambioEnCampos", e);
            return false;
        }
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
