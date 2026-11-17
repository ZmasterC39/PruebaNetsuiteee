/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/log', 'N/record', 'N/runtime', 'N/search', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', "N/format"], (log, record, runtime, search, coberturaController, format) => {

    // const beforeLoad = (context) => {  // Método ejecutado antes de que el registro sea cargado.
    // };

    const beforeSubmit = (context) => { //  Método ejecutado antes de guardar el registro.
    };

    const beforeLoad = (context) => {  // Método ejecutado después de guardar el registro.
        try {
          return true
            log.debug('afterSubmit', `Tipo de evento: ${context.type}`);

            let bien, idOS;
            const newRecord = context.newRecord;
            const recordType = newRecord.type;
            bien = newRecord.getValue("custbody_ht_so_bien");
            idOS = newRecord.id;

            log.debug("recordType", recordType);

            switch (recordType) {

                case "salesorder":

                    log.debug("Es Orden de Servicio");
                    let subsidiary = newRecord?.getValue("subsidiary") || "0";

                    // if (true) {
                
                    if (context.type === context.UserEventType.CREATE) {
                        crearRegistroLogMCC(bien, idOS, subsidiary, recordType);
                    }

                    // if (true) {
                        if ((context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT)) {
                        let estadoFacturaInterna = newRecord.getValue("custbody_ec_estado_factura_interna");
                        let Subsidiaria = obtenerUnDato("transaction", "subsidiary", idOS);

                        log.debug("estadoFacturaInterna", estadoFacturaInterna);
                        log.debug("Subsidiaria", Subsidiaria);

                        if (estadoFacturaInterna == "2" && (Subsidiaria == "2" || Subsidiaria == 2) && idOS && bien) {

                            // crearRegistroLogMCC(bien, idOS, Subsidiaria, recordType);  // Garantiza generar cobertura de un producto cuando la os es editada antes de facturar

                            log.debug("-------------Apartado de Factura Agrupada-------------")

                            let dataGlobalSobreItems = obtenerLosItemsDeUnaOS(idOS, bien);
                            let infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);

                            log.debug("infItemsProceso", infItemsProceso)

                            if (infItemsProceso.cumplen) {

                                // let DataParabuscarCobertura = agruparPorFamilias(obtenerFamiliasEncontradas(infItemsProceso.cumplen));
                                let DataParabuscarCobertura = procesarYAgruparFamilias(infItemsProceso.cumplen);

                                for (let i = 0; i < DataParabuscarCobertura.length; i++) {

                                    let InfCoberturaEncontrada;
                                    let familiaConsulta;
                                    let fechaControlInicial;
                                    let fechaControl;
                                    let DataInternaPorFamilia = DataParabuscarCobertura[i];
                                    let EsInstalacionRenovacion = existeAdp015(DataParabuscarCobertura[i]);
                                    let EsAdp008 = existeAdp008(DataInternaPorFamilia);
                                    let GenerarCoberturaSinOt = false;
                                    let acumuladorPlazo = 0;
                                    let dataRegistro = {}
                                    let dataCalculada = {}

                                    for (let y = 0; y < DataInternaPorFamilia.data.length; y++) {

                                        familiaConsulta = consultaFamiliaNetsuiteMovFcc(DataInternaPorFamilia.data[y].familia);
                                        InfCoberturaEncontrada = consultaCoberturaMovFcc(DataInternaPorFamilia.data[y].idbien, familiaConsulta.id);

                                        // ! Caso Instalacion y Renovacion
                                        if ((EsInstalacionRenovacion || EsAdp008) && !InfCoberturaEncontrada) {

                                            if (DataParabuscarCobertura[i].familia == "CS"
                                                && InfCoberturaEncontrada
                                                && InfCoberturaEncontrada.coberturainicial
                                                && InfCoberturaEncontrada.coberturafinal) {
                                                InfCoberturaEncontrada = {
                                                    coberturainicial: InfCoberturaEncontrada.coberturainicial,
                                                    coberturafinal: InfCoberturaEncontrada.coberturafinal,
                                                    estado_cobertura: InfCoberturaEncontrada.estado_cobertura,
                                                    estado_dispositivo: InfCoberturaEncontrada.estado_dispositivo
                                                }
                                            } else {

                                                if (EsAdp008 && !InfCoberturaEncontrada) {
                                                    GenerarCoberturaSinOt = true;
                                                    itemCasoAdp008 = DataInternaPorFamilia.data[y].iditem;
                                                }

                                                InfCoberturaEncontrada = {
                                                    coberturainicial: obtenerFechaEcuador(),
                                                    coberturafinal: obtenerFechaEcuador(),
                                                    estado_cobertura: "1",
                                                    estado_dispositivo: "1"
                                                }
                                            }
                                        }

                                        // Validaciones de info
                                        let validacion = validarInfParaGenerarCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data[y]);


                                        // !! OJO
                                        if (InfCoberturaEncontrada && validacion) {

                                            if (y == 0) { fechaControlInicial = InfCoberturaEncontrada.coberturafinal }

                                            const coberturainicial = InfCoberturaEncontrada.coberturainicial || "";
                                            const coberturafinal = fechaControl ? fechaControl : (InfCoberturaEncontrada.coberturafinal || "01/01/1900");
                                            const estadoCobertura = InfCoberturaEncontrada.estado_cobertura || 0;
                                            const estadoDispositivo = InfCoberturaEncontrada.estado_dispositivo || 0;

                                            // Variables para los parámetros de cálculo
                                            const parametrosTiempo = {
                                                tiempo: DataInternaPorFamilia.data[y].plazo,
                                                unidad: DataInternaPorFamilia.data[y].tipoPlazo,
                                            };

                                            const parametrosCobertura = {
                                                coberturaInicial: coberturainicial,
                                                coberturaFinal: coberturafinal,
                                            };

                                            const opcionesAdicionales = {
                                                esReverso: "No",
                                                fechaOS: obtenerUnDato("transaction", "trandate", idOS),
                                            };

                                            let fechaFacturaAgrupada = ObtenerLogRegistro(idOS);
                                            if (!fechaFacturaAgrupada) return;

                                            let ajusteFacAgrupada = validarFechasControlFacAgru(coberturafinal, fechaFacturaAgrupada?.date);
                                            if (ajusteFacAgrupada) { fechaFacturaAgrupada.date = coberturafinal }

                                            // Llamada a la función con parámetros separados
                                            const resultadoCalculo = calcularCoberturaPersonalizado(
                                                parametrosTiempo,
                                                parametrosCobertura,
                                                opcionesAdicionales,
                                                fechaFacturaAgrupada
                                            );


                                            if (resultadoCalculo) { fechaControl = formatoFechaCalculo(resultadoCalculo.fechaFinCalculada) }

                                            acumuladorPlazo = acumuladorPlazo + validarNumero(DataInternaPorFamilia.data[y].plazo);

                                            dataCalculada = {
                                                ID_BIEN: DataInternaPorFamilia.data[y].idbien,

                                                ID_OS: DataInternaPorFamilia.data[y].idOrdenServicio,
                                                FECHA_OS: DataInternaPorFamilia.data[y].fechaOs,
                                                ID_FAC: "",
                                                FECHA_FAC: "",
                                                FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia,
                                                ID_FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia ? consultaFamiliaNetsuite(DataInternaPorFamilia.data[y].familia).id : null,
                                                UNIDAD: acumuladorPlazo,
                                                ID_TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo,
                                                TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo ? obtenerSignificadoPlazo(DataInternaPorFamilia.data[y].tipoPlazo) : "",

                                                FECHA_INICIO_ACTUAL: InfCoberturaEncontrada.coberturainicial,
                                                FECHA_FIN_ACTUAL: InfCoberturaEncontrada.coberturafinal,
                                                ID_ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                                                ESTADO_COBERTURA_ACTUAL: estadoCobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", estadoCobertura) : "",
                                                ID_ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                                                ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", estadoDispositivo) : "",

                                                FECHA_INICIO_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaInicoCalculada),
                                                FECHA_FIN_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaFinCalculada),
                                                ID_ESTADO_COBERTURA_CALCULADO: "",
                                                ESTADO_COBERTURA_CALCULADO: "",
                                                ID_ESTADO_DISPOSITIVO_CALCULADO: "",
                                                ESTADO_DISPOSITIVO_CALCULADO: "",

                                                FECHA_INICIO_MODIFICADO: "",
                                                FECHA_FIN_MODIFICADO: "",
                                                ID_ESTADO_COBERTURA_MODIFICADO: "",
                                                ESTADO_COBERTURA_MODIFICADO: "",
                                                ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
                                                ESTADO_DISPOSITIVO_MODIFICADO: "",

                                                CORTESIA: DataInternaPorFamilia.data[y].esCortesiaOS ? "T" : "F",
                                                PROCESADO: "F",
                                                FECHA_PROCESADO: "",
                                                ID_ORIGEN: recordType == "salesorder" ? 1 : 2,
                                                ORIGEN: recordType,
                                                PARAMETRIZACION_APD: (EsInstalacionRenovacion) ? "015" : DataInternaPorFamilia.data[y].adp ? DataInternaPorFamilia.data[y].adp : ""
                                            }
                                        }
                                    }

                                    // Logica fuera del log 
                                    if (fechaControlInicial) {
                                        dataCalculada.FECHA_INICIO_CALCULADO = fechaControlInicial;
                                    }

                                    if (dataCalculada.ID_ESTADO_COBERTURA_CALCULADO == "" && dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO == "") {
                                        const EstadosGeneralesCobe = determinarEstadoCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data, dataCalculada);

                                        dataCalculada.ID_ESTADO_COBERTURA_CALCULADO = transformarSiEsNumero(EstadosGeneralesCobe.Cobertura);
                                        dataCalculada.ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", EstadosGeneralesCobe.Cobertura) : "";
                                        dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO = transformarSiEsNumero(EstadosGeneralesCobe.Dispositivo);
                                        dataCalculada.ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", EstadosGeneralesCobe.Dispositivo) : "";
                                    }


                                    if (dataCalculada?.ID_OS) {

                                        log.debug("****** dataCalculada ******", dataCalculada)


                                        dataRegistro = obtenerRegistrosLogCobertura(dataCalculada);


                                        if (!dataRegistro) {
                                            log.debug("Ya se procesó", infItemsProceso);
                                            continue;
                                        }

                                        // Bloque de renovacion  // ? Continuar flujo  
                                        if (EsInstalacionRenovacion) {
                                            log.debug("En proceso...", dataRegistro);

                                            const InfOrderTrabajo = consultaOtTrabajadas(dataRegistro.ID_OS, dataRegistro.FAMILIA_PRODUCTO);
                                            log.debug("InfOrderTrabajo", InfOrderTrabajo);

                                            if ((InfOrderTrabajo.length < 1 || !tieneOrdenesTrabajadas(InfOrderTrabajo)) && dataRegistro.PARAMETRIZACION_APD == "015" && dataRegistro.FAMILIA_PRODUCTO != "CS") {
                                                // if (InfOrderTrabajo.length < 1 || !tieneOrdenesTrabajadas(InfOrderTrabajo)) {
                                                log.debug("Todavía no se trabaja la OS", InfOrderTrabajo);
                                                continue; // Continuar con el siguiente registro
                                            }
                                        }

                                        if (EsAdp008 && GenerarCoberturaSinOt) {
                                            let fecha_Transaccion = obtenerFechaEcuador();
                                            actualizarProcesadoLogCobertura(idOS, fecha_Transaccion, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Cobertura Sin OT", "X");
                                            // ! FUNCION PARA Crear Cobertura SIN OT
                                            casoCoberturaSinOt(dataRegistro, GenerarCoberturaSinOt, itemCasoAdp008);
                                        }

                                        const validarCamposObjetosInf = validarCamposObjetos(dataRegistro, dataCalculada);
                                        const dataParaCoberturaJson = validarCamposObjetosInf
                                            ? (log.debug("Sin modificación", dataRegistro), armarData(dataRegistro))
                                            : (log.debug("Con modificación--", dataCalculada), armarData(dataCalculada));

                                        procesarCoberturaDirecto(dataParaCoberturaJson, idOS, dataRegistro, "F");
                                    }

                                }
                            } else {
                                log.debug("No cumple Condiciones", infItemsProceso.noCumplen)
                            }
                            log.debug("-------------Fin de Factura Agrupada-------------")

                        }
                    }

                    break;

                case "invoice":
                    log.debug("Es Factura");

                    // Si es el evento Crear
                    if (context.type === context.UserEventType.CREATE) {
                    // if (true) {
                      
                        let createdFrom = newRecord.getValue("createdfrom");
                        let subsidiary = newRecord.getValue("subsidiary");

                        // log.debug("subsidiary", subsidiary);
                        // log.debug("createdFrom", createdFrom);
                        // log.debug("bien", bien);

                        if (subsidiary == "2" || subsidiary == 2) {

                            if (!bien && createdFrom) {
                                bien = obtenerUnDato("transaction", "custbody_ht_so_bien", createdFrom)
                                log.debug("bien", bien)
                            }

                            // Solo caso Factura normal
                            if (bien && createdFrom) {


                                let dataGlobalSobreItems = obtenerLosItemsDeUnaOS(createdFrom, bien);
                                log.debug("dataGlobalSobreItems", dataGlobalSobreItems);

                                let infItemsProceso = filtraDatosQueCumplaParametros(dataGlobalSobreItems);
                                log.debug("infItemsProceso", infItemsProceso);

                                if(infItemsProceso && infItemsProceso?.cumplen && infItemsProceso?.cumplen.length < 8){
                                    crearRegistroLogMCC(bien, createdFrom, subsidiary, recordType); // Garantiza generar cobertura de un producto cuando la os es editada antes de facturar
                                }



                                if (infItemsProceso.cumplen) {

                                    let DataParabuscarCobertura = agruparPorFamilias(obtenerFamiliasEncontradas(infItemsProceso.cumplen));

                                    log.debug("DataParabuscarCobertura", DataParabuscarCobertura);

                                    for (let i = 0; i < DataParabuscarCobertura.length; i++) {

                                        let InfCoberturaEncontrada;
                                        let familiaConsulta;
                                        let DataParabuscarCoberturaProx = DataParabuscarCobertura[i];
                                        let GenerarCoberturaSinOt = false;
                                        let EsAdp008 = existeAdp008(DataParabuscarCoberturaProx);
                                        let fechaControlInicial;
                                        let fechaControl;
                                        let dataRegistro = []
                                        let EsInstalacionRenovacion = existeAdp015(DataParabuscarCobertura[i]);
                                        let itemCasoAdp008 = 0;
                                        let acumuladorPlazo = 0;

                                        let dataCalculada = {}

                                        for (let y = 0; y < DataParabuscarCoberturaProx.data.length; y++) {

                                            familiaConsulta = consultaFamiliaNetsuiteMovFcc(DataParabuscarCoberturaProx.data[y].familia);
                                            InfCoberturaEncontrada = consultaCoberturaMovFcc(DataParabuscarCoberturaProx.data[y].idbien, familiaConsulta.id);

                                            // log.debug("DataParabuscarCobertura[i]", DataParabuscarCobertura[i])
                                            // log.debug("DataParabuscarCoberturaProx.data[y]", DataParabuscarCoberturaProx.data[y])
                                            // log.debug("InfCoberturaEncontrada", InfCoberturaEncontrada);

                                            // ! Caso Instalacion y Renovacion
                                            if ((EsInstalacionRenovacion || EsAdp008) && !InfCoberturaEncontrada) {

                                                if (DataParabuscarCobertura[i].familia == "CS"
                                                    && InfCoberturaEncontrada
                                                    && InfCoberturaEncontrada.coberturainicial
                                                    && InfCoberturaEncontrada.coberturafinal) {
                                                    InfCoberturaEncontrada = {
                                                        coberturainicial: InfCoberturaEncontrada.coberturainicial,
                                                        coberturafinal: InfCoberturaEncontrada.coberturafinal,
                                                        estado_cobertura: InfCoberturaEncontrada.estado_cobertura,
                                                        estado_dispositivo: InfCoberturaEncontrada.estado_dispositivo

                                                    }
                                                } else {
                                                    itemCasoAdp008 = DataParabuscarCoberturaProx.data[y].iditem;

                                                    if (EsAdp008 && !InfCoberturaEncontrada) {
                                                        GenerarCoberturaSinOt = true;
                                                    }

                                                    InfCoberturaEncontrada = {
                                                        coberturainicial: obtenerFechaEcuador(),
                                                        coberturafinal: obtenerFechaEcuador(),
                                                        estado_cobertura: "1",
                                                        estado_dispositivo: "1"
                                                    }
                                                }
                                            }

                                            // Validaciones de info
                                            let validacion = validarInfParaGenerarCobertura(InfCoberturaEncontrada, DataParabuscarCoberturaProx.data[y]);
                                            // log.debug("validacion", validacion);

                                            // !! OJO
                                            if (InfCoberturaEncontrada && validacion) {

                                                if (y == 0) {
                                                    fechaControlInicial = InfCoberturaEncontrada.coberturafinal;
                                                }

                                                const coberturainicial = InfCoberturaEncontrada.coberturainicial || "";
                                                const coberturafinal = fechaControl ? fechaControl : (InfCoberturaEncontrada.coberturafinal || "01/01/1900");
                                                const estadoCobertura = InfCoberturaEncontrada.estado_cobertura || 0;
                                                const estadoDispositivo = InfCoberturaEncontrada.estado_dispositivo || 0;

                                                // Variables para los parámetros de cálculo
                                                const parametrosTiempo = {
                                                    tiempo: DataParabuscarCoberturaProx.data[y].plazo,
                                                    unidad: DataParabuscarCoberturaProx.data[y].tipoPlazo,
                                                };

                                                const parametrosCobertura = {
                                                    coberturaInicial: coberturainicial,
                                                    coberturaFinal: coberturafinal,
                                                };

                                                const opcionesAdicionales = {
                                                    esReverso: "No",
                                                    fechaOS: obtenerUnDato("transaction", "trandate", createdFrom),
                                                };

                                                // Llamada a la función con parámetros separados
                                                const resultadoCalculo = calcularCoberturaPersonalizado(
                                                    parametrosTiempo,
                                                    parametrosCobertura,
                                                    opcionesAdicionales
                                                );


                                                if (resultadoCalculo) {
                                                    fechaControl = formatoFechaCalculo(resultadoCalculo.fechaFinCalculada);
                                                }

                                                // const EstadosGeneralesCobe = determinarEstadoCobertura(InfCoberturaEncontrada, DataParabuscarCoberturaProx.data[y]);

                                                acumuladorPlazo = acumuladorPlazo + validarNumero(DataParabuscarCoberturaProx.data[y].plazo);

                                                dataCalculada = {
                                                    ID_BIEN: DataParabuscarCoberturaProx.data[y].idbien,

                                                    ID_OS: DataParabuscarCoberturaProx.data[y].idOrdenServicio,
                                                    FECHA_OS: DataParabuscarCoberturaProx.data[y].fechaOs,
                                                    ID_FAC: "",
                                                    FECHA_FAC: "",
                                                    FAMILIA_PRODUCTO: DataParabuscarCoberturaProx.data[y].familia,
                                                    ID_FAMILIA_PRODUCTO: DataParabuscarCoberturaProx.data[y].familia ? consultaFamiliaNetsuite(DataParabuscarCoberturaProx.data[y].familia).id : null,
                                                    UNIDAD: acumuladorPlazo,
                                                    ID_TIPO_PLAZO: DataParabuscarCoberturaProx.data[y].tipoPlazo,
                                                    TIPO_PLAZO: DataParabuscarCoberturaProx.data[y].tipoPlazo ? obtenerSignificadoPlazo(DataParabuscarCoberturaProx.data[y].tipoPlazo) : "",

                                                    FECHA_INICIO_ACTUAL: InfCoberturaEncontrada.coberturainicial,
                                                    FECHA_FIN_ACTUAL: InfCoberturaEncontrada.coberturafinal,
                                                    ID_ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                                                    ESTADO_COBERTURA_ACTUAL: estadoCobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", estadoCobertura) : "",
                                                    ID_ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                                                    ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", estadoDispositivo) : "",

                                                    FECHA_INICIO_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaInicoCalculada),
                                                    FECHA_FIN_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaFinCalculada),
                                                    ID_ESTADO_COBERTURA_CALCULADO: "",
                                                    ESTADO_COBERTURA_CALCULADO: "",
                                                    ID_ESTADO_DISPOSITIVO_CALCULADO: "",
                                                    ESTADO_DISPOSITIVO_CALCULADO: "",

                                                    FECHA_INICIO_MODIFICADO: "",
                                                    FECHA_FIN_MODIFICADO: "",
                                                    ID_ESTADO_COBERTURA_MODIFICADO: "",
                                                    ESTADO_COBERTURA_MODIFICADO: "",
                                                    ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
                                                    ESTADO_DISPOSITIVO_MODIFICADO: "",

                                                    CORTESIA: DataParabuscarCoberturaProx.data[y].esCortesiaOS ? "T" : "F",
                                                    PROCESADO: "F",
                                                    FECHA_PROCESADO: "",
                                                    ID_ORIGEN: recordType == "salesorder" ? 1 : 2,
                                                    ORIGEN: recordType,
                                                    PARAMETRIZACION_APD: (EsInstalacionRenovacion) ? "015" : DataParabuscarCoberturaProx.data[y].adp ? DataParabuscarCoberturaProx.data[y].adp : ""
                                                }
                                            }
                                        }

                                        if (dataCalculada.ID_ESTADO_COBERTURA_CALCULADO == "" && dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO == "") {
                                            const EstadosGeneralesCobe = determinarEstadoCobertura(InfCoberturaEncontrada, DataParabuscarCoberturaProx.data, dataCalculada);

                                            dataCalculada.ID_ESTADO_COBERTURA_CALCULADO = transformarSiEsNumero(EstadosGeneralesCobe.Cobertura);
                                            dataCalculada.ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", EstadosGeneralesCobe.Cobertura) : "";
                                            dataCalculada.ID_ESTADO_DISPOSITIVO_CALCULADO = transformarSiEsNumero(EstadosGeneralesCobe.Dispositivo);
                                            dataCalculada.ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", EstadosGeneralesCobe.Dispositivo) : "";
                                        }

                                        // Logica fuera del log 
                                        if (fechaControlInicial) {
                                            dataCalculada.FECHA_INICIO_CALCULADO = fechaControlInicial;
                                        }

                                        if (dataCalculada?.ID_OS) {

                                            log.debug("****** dataCalculada ******", dataCalculada)

                                            dataRegistro = obtenerRegistrosLogCobertura(dataCalculada);


                                            if (!dataRegistro) {
                                                log.debug("Ya se procesó", infItemsProceso);
                                                continue;
                                            }

                                            // Bloque de renovacion
                                            if (EsInstalacionRenovacion) {
                                                log.debug("En proceso...", dataRegistro);

                                                const InfOrderTrabajo = consultaOtTrabajadas(dataRegistro.ID_OS, dataRegistro.FAMILIA_PRODUCTO);
                                                log.debug("InfOrderTrabajo", InfOrderTrabajo);

                                                if ((InfOrderTrabajo.length < 1 || !tieneOrdenesTrabajadas(InfOrderTrabajo)) && dataRegistro.PARAMETRIZACION_APD == "015" && dataRegistro.FAMILIA_PRODUCTO != "CS") {
                                                    // if (InfOrderTrabajo.length < 1 || !tieneOrdenesTrabajadas(InfOrderTrabajo)) {
                                                    log.debug("Todavía no se trabaja la OS", InfOrderTrabajo);
                                                    continue; // Continuar con el siguiente registro
                                                }
                                            }

                                            if (EsAdp008 && GenerarCoberturaSinOt) {
                                                let fecha_Transaccion = obtenerFechaEcuador();
                                                actualizarProcesadoLogCobertura(idOS, fecha_Transaccion, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Cobertura Sin OT", "X");
                                                // ! FUNCION PARA Crear Cobertura SIN OT
                                                casoCoberturaSinOt(dataRegistro, GenerarCoberturaSinOt, itemCasoAdp008);
                                            }

                                            const validarCamposObjetosInf = validarCamposObjetos(dataRegistro, dataCalculada);
                                            const dataParaCoberturaJson = validarCamposObjetosInf
                                                ? (log.debug("Sin modificación", dataRegistro), armarData(dataRegistro))
                                                : (log.debug("Con modificación--", dataCalculada), armarData(dataCalculada));

                                            procesarCoberturaDirecto(dataParaCoberturaJson, idOS, dataRegistro, "F");
                                        }

                                    }
                                } else {
                                    log.debug("No cumple Condiciones", infItemsProceso.noCumplen)
                                }
                            } else {
                                log.debug("No posee Bien o Os");
                                return;
                            }
                        }
                    }

                    break;
            }

        } catch (error) {
            log.debug('Error en afterSubmit', { error: error.message, stack: error.stack });
        }

    };


    /*
    * Funciones de apoyo
    */
    function obtenerLosItemsDeUnaOS(IdOs, IdVehiculo) {

        /**
         * Función que obtiene los items de una orden de servicio.
         */

        let results = [];

        try {
            let serviceOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ["internalid", "is", IdOs],
                    "AND",
                    ["subsidiary", "anyof", "2"], // Subsidiaria.
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    "AND",
                    ["custbody_ht_so_bien", "anyof", IdVehiculo],
                    "AND",
                    // TaxItem
                    ["item.type", "noneof", "TaxItem"],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "item" }),
                    search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura" }),
                    search.createColumn({ name: "custcol_ht_os_tiempo_cobertura" }),
                    search.createColumn({ name: "rate" }),
                    search.createColumn({ name: "displayname", join: "item" }),
                    search.createColumn({ name: "internalid", join: "item" }),
                    search.createColumn({ name: "type", join: "item" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "trandate" }),
                    search.createColumn({ name: "terms" }),
                    search.createColumn({ name: "status" }),
                    search.createColumn({ name: "custbody_ht_ec_promocion_da" }),
                    search.createColumn({ name: "total" }),
                ],
            });

            let searchResult = serviceOrderSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    let infoparametros = "";
                    item = result.getValue({ name: "item" });
                    infoparametros = obtenerParametrizacionItem(item, ['ADP', 'PPS', 'FAM']);
                    results.push({
                        internalidOs: result.getValue({ name: "internalid" }),
                        bien: result.getValue({ name: "custbody_ht_so_bien" }),

                        iditem: item,
                        TipoPlazo: result.getValue({ name: "custcol_ht_os_und_tiempo_cobertura" }),
                        Plazo: result.getValue({ name: "custcol_ht_os_tiempo_cobertura" }),
                        infoparametros: infoparametros,
                        fechaOs: result.getValue({ name: "trandate" }),

                        status: result.getValue({ name: "status" }),
                        CambProp: result.getValue({ name: "custbody_ht_ec_promocion_da" }),
                        valor: result.getValue({ name: "total" }),
                        terms: result.getValue({ name: "terms" })

                    });
                });
            });


            return results;
        } catch (error) {
            log.debug("error", error.stack);
            return [];
        }
    }

    function obtenerParametrizacionItem(items, busquedaParametro) {
        try {
            let data = [];
            for (let i = 0; i < busquedaParametro.length; i++) {

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
                }
            }
            return data;
        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });
            return []
        }
    }

    function obtenerFamiliasEncontradas(data) {
        return data
            .map(item => {
                // log.debug("item", item)
                const ParametroFam = item.infoparametros.find(param => param.Param === "FAM");
                const ParametroAdp = item.infoparametros.find(param => param.Param === "ADP");

                return {
                    idbien: item.bien,
                    familia: ParametroFam ? ParametroFam.Valor : "",
                    adp: ParametroAdp ? ParametroAdp.Valor : "",
                    idOrdenServicio: item.internalidOs,
                    iditem: item.iditem,
                    tipoPlazo: item.TipoPlazo,
                    plazo: item.Plazo,
                    fechaOs: item.fechaOs,
                    esCortesiaOS: esCortesiaOS(item.internalidOs),
                    terms: item.terms
                };
            })
            .filter(familia => familia.familia); // Eliminar elementos sin familia
    }

    function consultaCoberturaMovFcc(IdVehiculo, idfamilia) {
        let results = [];
        try {
            let CoberturaSearch = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["custrecord_ht_co_bien", "anyof", IdVehiculo],
                    "AND",
                    ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
                    search.createColumn({ name: "custrecord_ht_co_bien" }),
                    search.createColumn({ name: "custrecord_ht_co_producto" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                    search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
                    search.createColumn({ name: "custrecord_ht_co_plazo" }),
                    search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                    search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
                    search.createColumn({ name: "custrecord_ht_co_propietario" }),
                    search.createColumn({ name: "custrecord_ht_co_estado" }),
                ],
            });

            let searchResult = CoberturaSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
                        bien: result.getValue({ name: "custrecord_ht_co_bien" }),
                        producto: result.getValue({ name: "custrecord_ht_co_producto" }),
                        coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                        coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                        numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
                        plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
                        estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
                        numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
                        clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
                        estado_dispositivo: result.getValue({ name: "custrecord_ht_co_estado" }),
                    });
                });
            });

            return results[0];

        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });
            return [];
        }


    }

    function consultaFamiliaNetsuiteMovFcc(familia) {
        let results = [];
        try {
            let FamiliaSearch = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [
                    ["custrecord_ht_pp_codigo", "is", familia],
                    // 'AND',
                    // ['owner.subsidiary', 'anyof', '2'],
                    'AND',
                    ['custrecord33', 'anyof', '2']
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo" }),
                ],
            });

            let searchResult = FamiliaSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        codigo: result.getValue({ name: "custrecord_ht_pp_codigo" }),
                    });
                });
            });

            log.debug("results", results)

            return results[0];

        } catch (error) {
            log.debug("error", error);
            return [];
        }

    }

    function filtraDatosQueCumplaParametros(data) {
        // log.debug("data", data)
        try {
            // Inicializar las variables de resultados
            const cumplen = [];
            const noCumplen = [];

            data.forEach((item) => {
                const parametros = item.infoparametros;

                // Verificar que haya exactamente 3 parámetros
                if (parametros.length !== 3) {
                    noCumplen.push(item);
                    return;
                }

                // Extraer los valores relevantes para evaluar
                const adp = parametros.find((param) => param.Param === "ADP");
                const pps = parametros.find((param) => param.Param === "PPS");
                const fam = parametros.find((param) => param.Param === "FAM");

                // Validar la existencia de los 3 parámetros requeridos
                if (!adp || !pps || !fam) {
                    noCumplen.push(item);
                    return;
                }

                // Condiciones específicas para cada parámetro
                const cumpleAdp = (adp.Valor === "004") || (adp.Valor === "015") || (adp.Valor === "008") || (adp.Valor === "009");
                const cumplePps = pps.Valor === "S";
                const cumpleFam = fam.Valor !== "";

                if (cumpleAdp && cumplePps && cumpleFam) {
                    cumplen.push(item);
                } else {
                    noCumplen.push(item);
                }
            });

            // Retornar los resultados en las dos variables requeridas
            return { cumplen, noCumplen };
        } catch (error) {
            // Si ocurre un error, devolver arrays vacíos
            log.debug("Error en filtrarDatos", error.message);
            return { cumplen: [], noCumplen: [] };
        }
    }

    function calcularCoberturaPersonalizado(itemResult, infoCoberturaEncontrada, requestBody, auxFecha = false) {

        log.debug("infcalcularCoberturaPersonalizado", {
            itemResult,
            infoCoberturaEncontrada,
            requestBody
        })

        try {

            // devolucion directa por tiempo 0
            if (itemResult.tiempo == "0" && itemResult.unidad == "4") {
                const diferenciaDias = calcularDiferenciaDias(
                    infoCoberturaEncontrada.coberturaInicial,
                    infoCoberturaEncontrada.coberturaFinal
                );

                return {
                    fechaInicoCalculada: infoCoberturaEncontrada.coberturaInicial,
                    fechaFinCalculada: convertirFechaIso(infoCoberturaEncontrada.coberturaFinal),
                    plazoCalculado: (diferenciaDias || "")
                }
            }


            const fechaAccion = (fecha) => `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;

            let fechaFinCalculada = ""
            let fechaInicoCalculada = ""
            let plazoCalculado = ""

            const esReverso = (requestBody.esReverso == "Si") ? true : false;

            // log.debug("esReverso", esReverso)

            // Determinar la fecha base de la cobertura según si es reverso o no
            let fechaBase = esReverso ? infoCoberturaEncontrada.coberturaInicial : infoCoberturaEncontrada.coberturaFinal;

            // log.debug("fechaBase_Antes", fechaBase)

            if (requestBody.fechaOS && requestBody.esReverso == "No") {
                let fechaHoy = new Date();
                fechaBase = coberturaController.CompararFechas(fechaBase, requestBody.fechaOS) ? fechaAccion(fechaHoy) : fechaBase;
                // log.debug("fechaBase_Despues", fechaBase)
            }

            if (auxFecha) {
                log.debug("auxFecha", auxFecha)
                fechaBase = auxFecha;
                fechaBase = coberturaController.CompararFechas(fechaBase, infoCoberturaEncontrada.coberturaFinal) ? infoCoberturaEncontrada.coberturaFinal : fechaBase
            }

            // Calcular cobertura
            const coberturaCalculada = coberturaController.CalcularCobertura(
                parseInt(itemResult.tiempo),
                parseInt(itemResult.unidad),
                fechaBase,
                esReverso
            );

            // Calcular diferencia de días
            const diferenciaDias = calcularDiferenciaDias(coberturaCalculada.coberturaInicial, coberturaCalculada.coberturaFinal);

            fechaInicoCalculada = (coberturaCalculada?.coberturaInicial || "")
            fechaFinCalculada = (coberturaCalculada?.coberturaFinal || "")
            plazoCalculado = (diferenciaDias || "")

            return {
                fechaInicoCalculada,
                fechaFinCalculada,
                plazoCalculado
            }
        }
        catch (error) {

            log.debug("error", error)
            return {
                fechaInicoCalculada: "",
                fechaFinCalculada: "",
                plazoCalculado: ""
            }
        }

    }

    function calcularDiferenciaDias(inicioCobertura, finCobertura) {
        let inicio = new Date(inicioCobertura);
        let fin = new Date(finCobertura);

        let diferenciaMilisegundos = fin - inicio;
        let milisegundosPorDia = 24 * 60 * 60 * 1000;

        return diferenciaMilisegundos / milisegundosPorDia;
    }

    function agruparPorFamilias(data) {
        try {
            return data.reduce((acumulador, item) => {
                // Buscar si la familia ya existe en el array acumulador
                const familiaExistente = acumulador.find((grupo) => grupo.familia === item.familia);

                if (familiaExistente) {
                    // Si existe, agregar el item al array `data` de esa familia
                    familiaExistente.data.push(item);
                } else {
                    // Si no existe, crear una nueva entrada para la familia
                    acumulador.push({
                        familia: item.familia,
                        bien: item.idbien,
                        cortesia: item.esCortesiaOS,
                        data: [item],
                    });
                }

                return acumulador;
            }, []);
        } catch (error) {
            throw new Error(`Error al agrupar por familias: ${error.message}`);
        }
    }

    function formatoFechaCalculo(fecha) {
        try {
            return fecha.split("T")[0].split("-").reverse().join("/");
        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });
            return fecha
        }
    }

    function createLogRecordFechaCobertura(INFODATALOG) {
        try {

            log.debug("createLogRecordFechaCobertura", INFODATALOG)

            if (INFODATALOG == {}) {
                // log.debug("---info---", INFODATALOG);
                throw new Error("Error al guardar el registro");
            }

            if (!INFODATALOG?.ID_OS) {
                throw new Error("Error por falta de data");
            }

            let ExisteLogProcesado = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "T", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO })
            if (ExisteLogProcesado) {
                log.debug("1")
                return 0;
            }

            let Existelog = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "F", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO });
            if (Existelog) {
                log.debug("2")
                return 0;
            }

            let ExistelogX = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "X", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO });
            if (ExistelogX) {
                log.debug("3")
                return 0;
            }

            const logRecord = record.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                isDynamic: true,
            });

            //  * -Identificación del Bien
            // ID_BIEN
            logRecord.setValue("custrecord_id_bien_mov_fcc", INFODATALOG.ID_BIEN);

            // *- Orden de Servicio y Facturación
            // ID_OS
            logRecord.setValue("custrecord_id_os_mov_fcc", INFODATALOG.ID_OS);
            // FECHA_OS
            logRecord.setValue("custrecord_fecha_os_mov_fcc", INFODATALOG.FECHA_OS ? new Date(...(INFODATALOG.FECHA_OS.split("/").reverse().map((v, i) => i === 1 ? v - 1 : +v))) : "");
            // ID_FAC
            logRecord.setValue("custrecord_id_fac_mov_fcc", INFODATALOG.ID_FAC);
            // FECHA FAC
            logRecord.setValue("custrecord_fecha_fac_mov_fcc", INFODATALOG.FECHA_FAC);
            // ID_FAMILIA_PRODUCTO
            logRecord.setValue("custrecord_id_familia_producto_mov_fcc", INFODATALOG.ID_FAMILIA_PRODUCTO);
            // FAMILIA_PRODUCTO
            logRecord.setValue("custrecord_familia_producto_mov_fcc", INFODATALOG.FAMILIA_PRODUCTO);
            // PLAZO -> UNIDAD
            logRecord.setValue("custrecord_unidad_mov_fcc", INFODATALOG.UNIDAD);
            // ID_TIPO_PLAZO
            logRecord.setValue("custrecord_id_tipo_plazo_mov_fcc", INFODATALOG.ID_TIPO_PLAZO);
            // TIPO_PLAZO
            logRecord.setValue("custrecord_tipo_plazo_mov_fcc", INFODATALOG.TIPO_PLAZO);

            // *- Cobertura y Plazo Actual
            // FECHA_INICIO_ACTUAL
            logRecord.setValue("custrecord_fecha_inicio_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_INICIO_ACTUAL)));
            // FECHA_FIN_ACTUAL
            logRecord.setValue("custrecord_fecha_fin_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_FIN_ACTUAL)));
            // ID_ESTADO_COBERTURA_ACTUAL
            logRecord.setValue("custrecord_id_estado_cobe_act_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_ACTUAL);
            // ESTADO_COBERTURA_ACTUAL
            logRecord.setValue("custrecord_estado_cobertura_act_mov_fcc", INFODATALOG.ESTADO_COBERTURA_ACTUAL);
            // ID_ESTADO_DISPOSITIVO_ACTUAL
            logRecord.setValue("custrecordid_estado_disp_act_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_ACTUAL);
            // ESTADO_DISPOSITIVO_ACTUAL
            logRecord.setValue("custrecord_estado_dispositivo_act_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_ACTUAL);

            // *- obertura y Plazo Calculado
            // FECHA_INICIO_CALCULADO
            logRecord.setValue("custrecord_fecha_inicio_cal_mov_fcc", new Date((INFODATALOG.FECHA_INICIO_CALCULADO)));
            // FECHA_FIN_CALCULADO
            logRecord.setValue("custrecord_fecha_fin_cal_mov_fcc", new Date((INFODATALOG.FECHA_FIN_CALCULADO)));
            // ID_ESTADO_COBERTURA_CALCULADO
            logRecord.setValue("custrecord_id_estado_cobe_cal_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_CALCULADO);
            // ESTADO_COBERTURA_CALCULADO
            logRecord.setValue("custrecord_estado_cobertura_cal_mov_fcc", INFODATALOG.ESTADO_COBERTURA_CALCULADO);
            // ID_ESTADO_DISPOSITIVO_CALCULADO
            logRecord.setValue("custrecordid_estado_disp_cal_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_CALCULADO);
            // ESTADO_DISPOSITIVO_CALCULADO
            logRecord.setValue("custrecord_estado_dispositivo_cal_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_CALCULADO);

            // *- Cobertura y Plazo Modificado
            // FECHA_INICIO_MODIFICADO
            logRecord.setValue("custrecordcustrecord_fecha_inicio_mod_mo", INFODATALOG.FECHA_INICIO_MODIFICADO ? new Date(INFODATALOG.FECHA_INICIO_MODIFICADO) : null);
            // FECHA_FIN_MODIFICADO
            logRecord.setValue("custrecordcustrecord_fecha_fin_mod_mov_f", INFODATALOG.FECHA_FIN_MODIFICADO ? new Date(INFODATALOG.FECHA_FIN_MODIFICADO) : null);
            // ID_ESTADO_COBERTURA_MODIFICADO
            logRecord.setValue("custrecord_id_estado_cobe_mod_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_MODIFICADO);
            // ESTADO_COBERTURA_MODIFICADO
            logRecord.setValue("custrecord_estado_cobertura_mod_mov_fcc", INFODATALOG.ESTADO_COBERTURA_MODIFICADO);
            // ID_ESTADO_DISPOSITIVO_MODIFICADO
            logRecord.setValue("custrecord_estado_disp_mod_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_MODIFICADO);
            // ESTADO_DISPOSITIVO_MODIFICADO
            logRecord.setValue("custrecord_estado_dispositivo_mod_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_MODIFICADO);

            // *- Otros Detalles
            // CORTESIA
            logRecord.setValue("custrecord_cortesia_mov_fcc", INFODATALOG.CORTESIA);
            // PROCESADO
            logRecord.setValue("custrecord_procesado_mov_fcc", INFODATALOG.PROCESADO);
            // FECHA_PROCESADO
            logRecord.setValue("custrecord_fecha_procesado_mov_fcc", INFODATALOG.FECHA_PROCESADO);
            // ID_ORIGEN
            logRecord.setValue("custrecordid_origen_mov_fcc", INFODATALOG.ID_ORIGEN);
            // ORIGEN
            logRecord.setValue("custrecord_origen_mov_fcc", INFODATALOG.ORIGEN);
            // PARAMETRIZACION_APD
            logRecord.setValue("custrecord_parametrizacion_apd_mov_fcc", INFODATALOG.PARAMETRIZACION_APD);

            return logRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true,
            });
        } catch (error) {
            log.debug("Error al createLogRecordFechaCobertura", { error: error.message, stack: error.stack });
            return 0;
        }
    }

    function convertirFechaIso(fecha) {
        try {
            const [dia, mes, año] = fecha.split("/").map(Number); // Dividir la fecha y convertir a números
            const fechaISO = new Date(Date.UTC(año, mes - 1, dia, 22, 0, 0)); // Crear la fecha en UTC con la hora 22:00
            return fechaISO.toISOString();
        } catch (error) {
            log.debug("Error al convertirFechaIso", { error: error.message, stack: error.stack });
            return fecha;
        }
    }

    function validarInfParaGenerarCobertura(DataCobertura, DataOrdenService) {

        if (!DataCobertura || typeof DataCobertura !== "object") {
            log.debug("Caso No Se encuentra Cobertura", DataCobertura || "Sin Cobertura");
            return false; // Salir directamente si no hay cobertura
        }

        let control = DataOrdenService ? DataOrdenService.adp : "";
        let cumpleCondicion = false;

        switch (control) {
            case "004":
                if (DataCobertura.estado_cobertura == 4) {
                    return false;
                } else {
                    cumpleCondicion = true
                }
                break;
            case "015":
                DataCobertura = {
                    "coberturainicial": obtenerFechaEcuador(),
                    "coberturafinal": obtenerFechaEcuador(),
                }
                cumpleCondicion = true
                break;

            case "008":
                DataCobertura = {
                    "coberturainicial": obtenerFechaEcuador(),
                    "coberturafinal": obtenerFechaEcuador(),
                }
                cumpleCondicion = true

                break;

            case "009":
                // if (DataCobertura.estado_cobertura == 4 || DataCobertura.estado_dispositivo != 1) {
                if (DataCobertura.estado_cobertura == 4) {
                    return false;
                } else {
                    cumpleCondicion = true

                }
                break;

            default:
                log.debug("Caso No Contemplado", { DataCobertura, DataOrdenService })
                break;
        }
        return cumpleCondicion
    }

    function esCortesiaOS(IdOs) {
        try {

            if ((!IdOs) || (IdOs == 0)) return true;

            let serviceOrderSearch = search.create({
                type: search.Type.SALES_ORDER,
                filters: [
                    ["internalid", "is", IdOs],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["item.internalid", "noneof", "@NONE@"],
                    "AND",
                    ["item.type", "noneof", "TaxItem"],
                ],
                columns: [
                    search.createColumn({ name: "total" }),
                ],
            });

            let searchResult = serviceOrderSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                if (searchResult[0].getValue({ name: "total" }) == ".00") {
                    return true
                } else {
                    return false
                }
            } else {
                return false;
            }
        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });
            return false;
        }
    }

    function determinarEstadoCobertura(control, DataOrdenService, dataGestion) {

        try {
            let Nconvenio = validarNumero(obtenerUnDato("transaction", "custbody_ht_os_convenio", dataGestion.ID_OS) || 0);
            let ItemAdp = determinarAdp(DataOrdenService);

            switch (ItemAdp) {
                case "004":
                    // ! Renovacion
                    let Caso004 = evaluarFecha(dataGestion.FECHA_FIN_CALCULADO)
                    return Caso004;

                case "015":
                    // ! Instalacion
                    if ((dataGestion && (dataGestion.FECHA_INICIO_CALCULADO == dataGestion.FECHA_FIN_CALCULADO)) || Nconvenio > 0) {
                        return { Dispositivo: "", Cobertura: 3 };
                    } else {
                        return { Dispositivo: 1, Cobertura: 1 };
                    }

                case "008":
                    // ! Isntalacion sin OT
                    if ((dataGestion && (dataGestion.FECHA_INICIO_CALCULADO == dataGestion.FECHA_FIN_CALCULADO)) || Nconvenio > 0) {
                        return { Dispositivo: "", Cobertura: 3 };
                    } else {
                        return { Dispositivo: 1, Cobertura: 1 };
                    }

                case "009":
                    // ! Renovacion
                    let Caso009 = evaluarFecha(dataGestion.FECHA_FIN_CALCULADO)
                    return Caso009;


                default:
                    return { Dispositivo: "", Cobertura: "" };
            }
        } catch (error) {
            log.debug("error", error)
            return { Dispositivo: "", Cobertura: "" };
        }
    }

    function evaluarFecha(fechaEntrada) {
        try {
            // Parse the input date
            const fecha = new Date(fechaEntrada);

            // Get the current date in Ecuador time zone
            const fechaActual = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" });
            const fechaActualEcuador = new Date(fechaActual);

            // Compare the dates
            if (fecha < fechaActualEcuador) {
                return { Dispositivo: "", Cobertura: 3 };
            } else {
                return { Dispositivo: 1, Cobertura: 1 };
            }
        } catch (error) {
            log.debug("Error en evaluarFecha", { error: error.message, stack: error.stack });
            return { Dispositivo: "", Cobertura: "" };
        }
    }

    function obtenerUnDato(type, columna, id) {
        try {
            const resultado = search
                .create({
                    type: type,
                    filters: [["internalid", "is", id]],
                    columns: [columna],
                })
                .run()
                .getRange({ start: 0, end: 1 });

            return resultado.length > 0 ? resultado[0].getValue(columna) : "";
        } catch (error) {
            log.debug("Error al obtenerUnDato", { error: error.message, stack: error.stack });
            return "";
        }
    }

    function obtenerSignificadoPlazo(tiempo) {
        switch (tiempo) {
            case "1": return "AÑO";
            case "2": return "MESES";
            case "3": return "DIA";
            default: return "";
        }
    }

    function consultaFamiliaNetsuite(familia) {

        let results = [];
        try {
            let FamiliaSearch = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [
                    ["custrecord_ht_pp_codigo", "is", familia],
                    // 'AND',
                    // ['owner.subsidiary', 'anyof', '2'],
                    'AND',
                    ['custrecord33', 'anyof', '2']
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "name" }),
                    search.createColumn({ name: "custrecord_ht_pp_codigo" }),
                ],
            });

            let searchResult = FamiliaSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        name: result.getValue({ name: "name" }),
                        codigo: result.getValue({ name: "custrecord_ht_pp_codigo" }),
                    });
                });
            });

            return results[0];

        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });

            return [];
        }

    }

    function verificarExistenciaRegistros(filtros) {

        try {
            // log.debug("Filtros proporcionados", filtros);

            // Crear un array dinámico de filtros
            let filtrosDinamicos = [];

            // Función para agregar filtros de forma condicional
            function agregarFiltro(campo, operador, valor) {
                if (valor !== undefined && valor !== null && valor !== "") {
                    // Si ya hay filtros, agregar "AND" antes del siguiente
                    if (filtrosDinamicos.length > 0) {
                        filtrosDinamicos.push("AND");
                    }
                    filtrosDinamicos.push([campo, operador, valor]);
                }
            }

            // Agregar los filtros usando la función
            agregarFiltro("custrecord_id_os_mov_fcc", "equalto", filtros.ID_OS);
            agregarFiltro("custrecord_procesado_mov_fcc", "startswith", filtros.PROCESADO);
            agregarFiltro("custrecord_familia_producto_mov_fcc", "startswith", filtros.FAMILIA_PRODUCTO);


            agregarFiltro("custrecord_id_bien_mov_fcc", "anyof", filtros.ID_BIEN);
            agregarFiltro("custrecord_id_familia_producto_mov_fcc", "anyof", filtros.ID_FAMILIA_PRODUCTO);
            agregarFiltro("custrecord_id_tipo_plazo_mov_fcc", "equalto", filtros.ID_TIPO_PLAZO);
            agregarFiltro("custrecord_unidad_mov_fcc", "startswith", filtros.UNIDAD);
            agregarFiltro("custrecord_tipo_plazo_mov_fcc", "startswith", filtros.TIPO_PLAZO);
            agregarFiltro("custrecord_cortesia_mov_fcc", "startswith", filtros.CORTESIA);
            agregarFiltro("custrecordid_origen_mov_fcc", "startswith", filtros.ID_ORIGEN);
            agregarFiltro("custrecord_origen_mov_fcc", "startswith", filtros.ORIGEN);
            agregarFiltro("custrecord_parametrizacion_apd_mov_fcc", "startswith", filtros.PARAMETRIZACION_APD);
            agregarFiltro("custrecord_fecha_os_mov_fcc", "within", filtros.FECHA_OS);
            agregarFiltro("custrecord_fecha_inicio_actual_mov_fcc", "within", filtros.FECHA_INICIO_ACTUAL);
            agregarFiltro("custrecord_fecha_fin_actual_mov_fcc", "within", filtros.FECHA_FIN_ACTUAL);
            agregarFiltro("custrecord_fecha_inicio_cal_mov_fcc", "within", convertirFechaFormato(filtros.FECHA_INICIO_CALCULADO));
            agregarFiltro("custrecord_fecha_fin_cal_mov_fcc", "within", convertirFechaFormato(filtros.FECHA_FIN_CALCULADO));
            agregarFiltro("custrecord_id_estado_cobe_cal_mov_fcc", "equalto", filtros.ID_ESTADO_COBERTURA_CALCULADO);

            // Se agregan filtros para que no se tomen en cuenta los registros inactivos

            if (filtrosDinamicos.length > 0) {
                filtrosDinamicos.push("AND");
                filtrosDinamicos.push(["isinactive", "is", false]);
            }

            // Verificar si hay filtros antes de realizar la búsqueda
            if (filtrosDinamicos.length === 0) {
                log.debug("Sin filtros aplicables", "No se ejecutará la búsqueda.");
                return false;
            }

            log.debug("filtrosDinamicos---", filtrosDinamicos)

            // Crear la búsqueda con los filtros dinámicos
            var customrecordLogMovimientoSearchObj = search.create({
                type: "customrecord_log_movimiento_fecha_cobert",
                filters: filtrosDinamicos,
                columns: []
            });

            // Contar resultados
            var searchResultCount = customrecordLogMovimientoSearchObj.runPaged().count;

            // Log para depuración
            log.debug("Resultado de búsqueda", (searchResultCount > 0 == true) ? "Existen datos" : "No existen datos");

            // Retornar si existen registros o no
            // log.debug("searchResultCount > 0", searchResultCount > 0)

            return searchResultCount > 0;
        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });

            return false
        }


    }

    function convertirFechaFormato(fechaISO) {
        if (!fechaISO) return "";

        // Crear un objeto Date a partir de la cadena ISO
        const fecha = new Date(fechaISO);

        // Verificar si la fecha es válida
        if (isNaN(fecha)) return "Fecha no válida";

        // Extraer día, mes y año
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0"); // Los meses empiezan en 0
        const año = fecha.getFullYear();

        // Formatear la fecha como DD/MM/YYYY
        return `${dia}/${mes}/${año}`;
    }

    function obtenerRegistrosLogCobertura(filtros) {

        // Crear la búsqueda con los filtros dinámicos
        let customrecordLogMovimientoSearchObj = search.create({
            type: "customrecord_log_movimiento_fecha_cobert",
            filters: [
                ["custrecord_id_bien_mov_fcc", "anyof", filtros.ID_BIEN],
                "AND",
                ["custrecord_id_os_mov_fcc", "equalto", filtros.ID_OS],
                "AND",
                ["custrecord_id_familia_producto_mov_fcc", "anyof", filtros.ID_FAMILIA_PRODUCTO],
                "AND",
                ["custrecord_parametrizacion_apd_mov_fcc", "startswith", filtros.PARAMETRIZACION_APD],
                "AND",
                ["custrecord_procesado_mov_fcc", "startswith", "F"],
                "AND",
                ["isinactive", "is", "F"]
            ],
            columns: [

                search.createColumn({ name: "internalid", label: "ID_INTERNO" }),

                search.createColumn({ name: "custrecord_id_bien_mov_fcc", label: "ID_BIEN" }),

                search.createColumn({ name: "custrecord_id_os_mov_fcc", label: "ID_OS" }),
                search.createColumn({ name: "custrecord_fecha_os_mov_fcc", label: "FECHA_OS" }),
                // search.createColumn({ name: "custrecord_id_fac_mov_fcc", label: "ID_FAC" }),
                search.createColumn({ name: "custrecord_id_familia_producto_mov_fcc", label: "ID_FAMILIA_PRODUCTO" }),
                search.createColumn({ name: "custrecord_familia_producto_mov_fcc", label: "FAMILIA_PRODUCTO" }),
                search.createColumn({ name: "custrecord_id_tipo_plazo_mov_fcc", label: "ID_TIPO_PLAZO" }),
                search.createColumn({ name: "custrecord_unidad_mov_fcc", label: "UNIDAD" }),
                search.createColumn({ name: "custrecord_tipo_plazo_mov_fcc", label: "TIPO_PLAZO" }),

                search.createColumn({ name: "custrecord_fecha_inicio_actual_mov_fcc", label: "FECHA_INICIO_ACTUAL" }),
                search.createColumn({ name: "custrecord_fecha_fin_actual_mov_fcc", label: "FECHA_FIN_ACTUAL" }),
                search.createColumn({ name: "custrecord_id_estado_cobe_act_mov_fcc", label: "ID_ESTADO_COBERTURA_ACTUAL" }),
                search.createColumn({ name: "custrecordid_estado_disp_act_mov_fcc", label: "ID_ESTADO_DISPOSITIVO_ACTUAL" }),

                search.createColumn({ name: "custrecord_fecha_inicio_cal_mov_fcc", label: "FECHA_INICIO_CALCULADO" }),
                search.createColumn({ name: "custrecord_fecha_fin_cal_mov_fcc", label: "FECHA_FIN_CALCULADO" }),
                search.createColumn({ name: "custrecord_id_estado_cobe_cal_mov_fcc", label: "ID_ESTADO_COBERTURA_CALCULADO" }),
                search.createColumn({ name: "custrecordid_estado_disp_cal_mov_fcc", label: "ID_ESTADO_DISPOSITIVO_CALCULADO" }),

                search.createColumn({ name: "custrecord_cortesia_mov_fcc", label: "CORTESIA" }),
                search.createColumn({ name: "custrecord_procesado_mov_fcc", label: "PROCESADO" }),
                search.createColumn({ name: "custrecord_parametrizacion_apd_mov_fcc", label: "PARAMETRIZACION_APD" })
            ]
        });

        // Ejecutar la búsqueda y obtener los resultados
        let resultados = [];
        let pagedData = customrecordLogMovimientoSearchObj.runPaged({ pageSize: 1000 });

        pagedData.pageRanges.forEach(function (pageRange) {
            let pagina = pagedData.fetch({ index: pageRange.index });
            pagina.data.forEach(function (resultado) {
                let registro = {};
                customrecordLogMovimientoSearchObj.columns.forEach(function (columna) {
                    let valor = resultado.getValue(columna);
                    let texto = "";
                    registro[columna.label] = valor !== null ? valor : texto;
                });
                resultados.push(registro);
            });
        });

        return resultados.length > 0 ? resultados[0] : false;
    }

    function validarCamposObjetos(objMenor, objMayor) {

        if (typeof objMayor.UNIDAD === "number") {
            objMayor.UNIDAD = objMayor.UNIDAD.toString();
        }

        // log.debug("x.x", { objMenor, objMayor })

        for (let clave in objMenor) {

            if (clave === "ID_INTERNO") {
                continue; // Ignorar la propiedad "ID_INTERNO"
            }

            if (objMenor.hasOwnProperty(clave)) {
                // Verificar si el campo existe en el objeto mayor y si los valores coinciden
                if (!objMayor.hasOwnProperty(clave) || objMenor[clave] !== objMayor[clave]) {
                    return false; // Falla inmediata si hay discrepancia
                }
            }
        }
        return true; // Todos los campos coinciden
    }

    function transformarSiEsNumero(valor) {
        return typeof valor === "number" ? valor.toString() : valor;
    }

    function determinarConceptoCobertura(DataOrdenService) {
        let ItemAdp = DataOrdenService.PARAMETRIZACION_APD
        switch (ItemAdp) {
            case "004":
                return 8;
            case "015":
                return 16;
            default:
                return 17;
        }
    }

    function armarData(registro) {
        try {
            return {
                "idbien": registro.ID_BIEN,
                "familia": registro.FAMILIA_PRODUCTO,
                "accion": "Update",
                "fechaInicio": registro.FECHA_INICIO_CALCULADO,
                "tipocobertura": registro.UNIDAD,
                "unidadcobertu": registro.TIPO_PLAZO,
                "fechafin": registro.FECHA_FIN_CALCULADO,
                "idOrdenServicio": registro.ID_OS,
                "concepto": transformarSiEsNumero(determinarConceptoCobertura(registro)),
                "codVehiculo": ""
            };
        } catch (error) {
            log.debug("Error al armarData", { error: error.message, stack: error.stack });

            return {
                "idbien": "",
                "familia": "",
                "accion": "",
                "fechaInicio": "",
                "tipocobertura": "",
                "unidadcobertu": "",
                "fechafin": "",
                "idOrdenServicio": "",
                "concepto": "",
                "codVehiculo": ""
            };
        }

    }

    function actualizarProcesadoLogCobertura(id_factura, fecha_factura, internalId, Mensaje, Estado) {
        try {
            // Función para formatear la fecha actual como "DD/MM/YYYY"
            const obtenerFechaActualFormateada = () => {
                const hoy = new Date();
                const dia = String(hoy.getDate()).padStart(2, '0');
                const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Meses comienzan desde 0
                const anio = hoy.getFullYear();
                return `${dia}/${mes}/${anio}`;
            };

            // Construcción del objeto de valores
            let valuesTem = {
                custrecord_id_fac_mov_fcc: id_factura,
                custrecord_fecha_fac_mov_fcc: fecha_factura || obtenerFechaActualFormateada(),
                custrecord_procesado_mov_fcc: Estado,
                custrecord_fecha_procesado_mov_fcc: obtenerFechaActualFormateada(), // Fecha del día actual formateada
                custrecord_info_mov_fcc: Mensaje || ""
            };

            // Actualización del registro
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: valuesTem,
            });

            log.debug("actualizarProcesadoLogCobertura", `ID: ${internalId}`);
        } catch (error) {
            log.debug("Error actualizando el registro", error);
        }
    }

    function actualizarLogCoberturaFecha(Fecha_A, Fecha_B, internalId) {
        try {
            // Construcción del objeto de valores
            let valuesTem = {
                custrecord_fecha_inicio_cal_mov_fcc: Fecha_A,
                custrecord_fecha_fin_cal_mov_fcc: Fecha_B
            }

            // Actualización del registro
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: valuesTem,
            });

            log.debug("actualizarLogCoberturaFecha", `ID: ${internalId}`);
        } catch (error) {
            log.debug("Error actualizando el registro", error);
        }
    }

    function procesarCoberturaDirecto(dataParaCoberturaJson, idTransaccion, dataRegistro, ajuste) {
        try {
            let infDetalleCobe = infoDetalleCobertura(dataParaCoberturaJson.idOrdenServicio, dataParaCoberturaJson.familia);
            let fecha_Transaccion = obtenerFechaEcuador();

            log.debug("procesarCoberturaDirecto", { dataParaCoberturaJson, idTransaccion, dataRegistro, ajuste });
            return true

            if (infDetalleCobe.length > 0) {

                // log.debug("procesarCoberturaDirecto", { dataParaCoberturaJson, idTransaccion, dataRegistro, ajuste });

                let familiaConsulta = consultaFamiliaNetsuiteMovFcc(dataRegistro?.FAMILIA_PRODUCTO);
                let InfCoberturaEncontrada = consultaCoberturaMovFcc(dataRegistro?.ID_BIEN, familiaConsulta.id);

                if (dataRegistro.FECHA_FIN_CALCULADO == InfCoberturaEncontrada.coberturafinal) {

                    if (ajuste == "T") {
                        actualizarProcesadoLogCobertura(0, "", dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio, Calculo de Fecha Correcto", "T");
                    } else {
                        fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                        actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio, Calculo de Fecha Correcto", "T");
                    }
                } else {
                    if (ajuste == "T") {
                        actualizarProcesadoLogCobertura(0, "", dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio", "T");
                    } else {
                        fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                        actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Ya se encuentra un registro de esta orden de servicio", "T");
                    }
                }

                try {

                    let InfCoberturaEncontradaPasoFinal = consultaCoberturaMovFcc(dataParaCoberturaJson.idbien, familiaConsulta.id);
                    if (dataRegistro.ID_INTERNO && InfCoberturaEncontradaPasoFinal?.name && InfCoberturaEncontradaPasoFinal?.id) {
                        actualizarinfoCoberturaAfectada(dataRegistro.ID_INTERNO, InfCoberturaEncontradaPasoFinal.name, InfCoberturaEncontradaPasoFinal.id);
                    }
                } catch (error) {
                    log.debug("Error al ActualizarinfoCoberturaAfectada", error);
                }
                return true

            } else {

                if (dataParaCoberturaJson?.accion && dataParaCoberturaJson?.accion !== "") {
                    try {
                        log.debug("--> dataParaCoberturaJson", dataParaCoberturaJson);

                        function validarFechas(dataParaCoberturaJson) {
                            const [diaInicio, mesInicio, anioInicio] = dataParaCoberturaJson.fechaInicio.split('/');
                            const [diaFin, mesFin, anioFin] = dataParaCoberturaJson.fechafin.split('/');

                            const fechaInicio = new Date(`${anioInicio}-${mesInicio}-${diaInicio}`);
                            const fechaFin = new Date(`${anioFin}-${mesFin}-${diaFin}`);

                            if (fechaInicio >= fechaFin) {
                                return true;
                            }
                        }

                        // Ejemplo de uso
                        try {
                            if (validarFechas(dataParaCoberturaJson)) {
                                log.error("La fecha de inicio no puede ser mayor o igual a la fecha de fin");
                                return false;
                            }

                        } catch (error) {
                            log.error(error.message);
                        }


                        // // Realizar solicitud a la API
                        let infCobertura = coberturaController.makeApiRequest(
                            dataParaCoberturaJson,
                            "customdeploy_hu_ec_rs_in_coberturas",
                            "customscript_hu_ec_rs_in_coberturas",
                            "POST",
                            false
                        );

                        log.debug("infCobertura", infCobertura);

                        // log.debug("--------------", { dataRegistro, dataParaCoberturaJson });


                        if ((dataRegistro.FECHA_INICIO_CALCULADO != dataParaCoberturaJson.fechaInicio) || (dataRegistro.FECHA_FIN_CALCULADO != dataParaCoberturaJson.fechafin)) {
                            actualizarLogCoberturaFecha(dataParaCoberturaJson.fechaInicio, dataParaCoberturaJson.fechafin, dataRegistro.ID_INTERNO);
                        }

                        // Validar la respuesta de la API
                        if (
                            infCobertura &&
                            (infCobertura?.results[0]?.Cobertura_ID !== 0 && infCobertura?.results[0]?.Cobertura_ID !== "0")
                        ) {
                            log.debug("infCobertura 1", infCobertura.results[0]);

                            // Obtener la fecha de la factura y actualizar el log
                            fecha_Transaccion = obtenerUnDato("transaction", "trandate", idTransaccion);
                            let estadoFacturainterna = obtenerUnDato("transaction", "custbody_ec_estado_factura_interna", idTransaccion);

                            // ! agregar caso por factura agrupada desde os
                            let fechaFactura = ObtenerLogRegistro(idTransaccion);

                            if (idTransaccion && fechaFactura && estadoFacturainterna == "2") {
                                actualizarProcesadoLogCobertura(idTransaccion, fechaFactura, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Factura interna", "X");
                            } else {
                                actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Accion Realizada por el Script, Caso Normal", "X");
                            }

                            try {
                                let familiaConsulta = consultaFamiliaNetsuiteMovFcc(dataParaCoberturaJson.familia);
                                let InfCoberturaEncontradaPasoFinal = consultaCoberturaMovFcc(dataParaCoberturaJson.idbien, familiaConsulta.id);

                                if (dataRegistro.ID_INTERNO && InfCoberturaEncontradaPasoFinal?.name && InfCoberturaEncontradaPasoFinal?.id) {
                                    actualizarinfoCoberturaAfectada(dataRegistro.ID_INTERNO, InfCoberturaEncontradaPasoFinal.name, InfCoberturaEncontradaPasoFinal.id);
                                }
                            } catch (error) {
                                log.debug("Error al ActualizarinfoCoberturaAfectada", error);
                            }


                        } else {
                            actualizarProcesadoLogCobertura(idTransaccion, fecha_Transaccion, dataRegistro.ID_INTERNO, "Conflicto en la Cobertura", "F");
                            return true;
                        }
                    } catch (error) {
                        log.debug("No se puede realizar la petición", error);
                    }
                }
            }
        } catch (error) {
            log.debug("error", error);
        }
    }

    function infoDetalleCobertura(IdOs, familia) {

        if (!IdOs && !familia) {
            return [];
        }

        let familiaConsulta = consultaFamiliaNetsuiteMovFcc(familia);

        let results = [];
        try {
            let serviceOrderSearch = search.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                filters: [
                    ["custrecord_ht_ct_orden_servicio", "is", IdOs],
                    "AND",
                    ["custrecord_ht_ct_transacciones.custrecord_ht_co_familia_prod", "anyof", familiaConsulta.id]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "created" }),
                    search.createColumn({ name: "custrecord_ht_ct_transacciones" }),
                    search.createColumn({ name: "custrecord_ht_ct_orden_servicio" }),
                    search.createColumn({ name: "custrecord_ht_ct_orden_trabajo" }),
                    search.createColumn({ name: "custrecord_ht_ct_concepto" }),
                    search.createColumn({ name: "custrecord_ht_ct_fecha_inicial" }),
                    search.createColumn({ name: "custrecord_ht_ct_fecha_final" }),
                ],
            });

            let searchResult = serviceOrderSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    results.push({
                        id_detalleCobertura: result.getValue({ name: "internalid" }),
                        created: result.getValue({ name: "created" }),
                        idCobertura: result.getValue({ name: "custrecord_ht_ct_transacciones" }),
                        idordenServicio: result.getValue({ name: "custrecord_ht_ct_orden_servicio" }),
                        idordenTrabajo: result.getValue({ name: "custrecord_ht_ct_orden_trabajo" }),
                        concepto: result.getValue({ name: "custrecord_ht_ct_concepto" }),
                        fechaInicial: result.getValue({ name: "custrecord_ht_ct_fecha_inicial" }),
                        fechaFinal: result.getValue({ name: "custrecord_ht_ct_fecha_final" }),
                    });
                });
            });

            // log.debug("results", results)

            return results;
        } catch (error) {
            log.debug("error", error);
            return [];
        }

    }

    function obtenerFechaEcuador() {
        // Asegurarse de que la zona horaria del entorno sea Ecuador
        // const userTimeZone = runtime.getCurrentUser().getPreference('TIMEZONE');
        const fechaActual = new Date();

        // Ajustar a la zona horaria de Ecuador si no coincide
        const ecuadorTimeZone = 'America/Guayaquil';
        const fechaAjustada = new Date(
            fechaActual.toLocaleString('en-US', { timeZone: ecuadorTimeZone })
        );

        // Formatear la fecha en el formato DD/MM/YYYY
        const fechaFormateada = format.format({
            value: fechaAjustada,
            type: format.Type.DATE
        });

        return fechaFormateada;
    }

    function existeAdp015(inputData) {
        if (!inputData || !Array.isArray(inputData.data)) {
            throw new Error('El formato de datos no es válido o no incluye un array "data".');
        }

        return inputData.data.some(item => item.adp === "015");
    }

    function existeAdp008(inputData) {
        if (!inputData || !Array.isArray(inputData.data)) {
            throw new Error('El formato de datos no es válido o no incluye un array "data".');
        }

        return inputData.data.some(item => item.adp === "008");
    }

    function validarNumero(cadena) {
        // Convertir la cadena a número
        const numero = parseInt(cadena, 10);

        // Validar si es un número entero y mayor o igual a 0
        if (!isNaN(numero) && numero >= 0) {
            return numero;
        }

        // Devolver 0 si no cumple la condición
        return 0;
    }

    function consultaOtTrabajadas(idOS, familia) {
        try {

            let item = ""
            let infoparametros;

            // Crear la búsqueda
            let itemOT = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                filters: [
                    ["custrecord_ht_ot_orden_servicio", "is", idOS],
                ],
                columns: [
                    search.createColumn({ name: "custrecord_ht_ot_item", label: "Item" }),
                    search.createColumn({ name: "custrecord_ht_ot_estado", label: "Estado" }),
                    search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "Fecha de Trabajo Asignación" }),
                ],
            });

            let resultados = [];
            let pagedData = itemOT.runPaged({ pageSize: 10 });

            // Iterar por las páginas de resultados
            pagedData.pageRanges.forEach(function (pageRange) {
                let pagina = pagedData.fetch({ index: pageRange.index });
                pagina.data.forEach(function (resultado) {
                    // Construir un objeto con los valores de las columnas
                    item = resultado.getValue({ name: "custrecord_ht_ot_item" });
                    // log.debug("item", item)
                    infoparametros = obtenerParametrizacionItem(item, ['FAM']);

                    let registro = {
                        Item: infoparametros[0]?.Valor || "",
                        Estado: resultado.getValue({ name: "custrecord_ht_ot_estado" }),
                        FechaTrabajoAsignacion: resultado.getValue({ name: "custrecord_ht_ot_fechatrabajoasignacion" }),
                    };

                    if (registro.Item == familia) {
                        resultados.push(registro);
                    }

                });
            });

            return resultados;
        } catch (error) {
            log.error("Error en ConsultaOTTrabajadas", error);
            return [];
        }
    }

    function tieneOrdenesTrabajadas(data) {
        try {
            // Validar que todos los elementos tengan Estado igual a "2"
            return data.every(item => item.Estado === "2");
        } catch (error) {
            log.error("Error en verificarEstado:", error);
            return false; // Retornar falso en caso de error
        }
    }

    function determinarAdp(datos) {
        // Verificar si existe al menos un elemento con adp "015"
        const tiene015 = datos.some(item => item.adp === "015");

        // Si existe, devolver "015", de lo contrario devolver el valor de adp del primer elemento
        return tiene015 ? "015" : (datos[0]?.adp || "");
    }

    function actualizarinfoCoberturaAfectada(internalId, NombreCobertura, IdCobertura) {
        try {

            // Construcción del objeto de valores
            let valuesTem = {
                custrecord_nombre_cobertura_mov_fcc: NombreCobertura,
                custrecord_id_cobertura_mov_fcc: IdCobertura,
            }

            // Actualización del registro
            record.submitFields({
                type: "customrecord_log_movimiento_fecha_cobert",
                id: internalId,
                values: valuesTem,
            });

            // log.debug("Registro actualizado", `ID: ${internalId}`);
        } catch (error) {
            log.debug("Error actualizando el registro", error);
        }
    }

    function crearCoberturaSinOt(Infdata) {
        try {
            let newCobertura = record.create({
                type: "customrecord_ht_co_cobertura",
                isDynamic: true,
            });

            const fields = {
                bien: "custrecord_ht_co_bien",
                producto: "custrecord_ht_co_producto",
                estado: "custrecord_ht_co_estado_cobertura",
                fechaInicio: "custrecord_ht_co_coberturainicial",
                plazo: "custrecord_ht_co_plazo",
                fechaFinal: "custrecord_ht_co_coberturafinal",
                familia: "custrecord_ht_co_familia_prod",
            };

            for (const [key, fieldId] of Object.entries(fields)) {
                if (Infdata[key]) {
                    newCobertura.setValue({
                        fieldId: fieldId,
                        value: Infdata[key],
                    });
                }
            }

            newCobertura.setValue({
                fieldId: "custrecord_ht_co_estado",
                value: 1,
            });

            newCobertura.setValue({
                fieldId: "custrecord_ht_co_subsidiaria",
                value: 2,
            });

            let newCoberturaId = newCobertura.save();

            log.debug("crearCoberturaSinOt -> ", newCoberturaId);

            return newCoberturaId;
        } catch (error) {
            log.error("Error-CrearCoberturaSinOt", error);
        }
    }

    function crearDetalleCoberturaSinOt(infData) {
        try {
            let newDetalleCobertura = record.create({
                type: "customrecord_ht_ct_cobertura_transaction",
                isDynamic: true,
            });

            const fields = {
                IdCobertura: "custrecord_ht_ct_transacciones",
                IdOrdenServicio: "custrecord_ht_ct_orden_servicio",
                concepto: "custrecord_ht_ct_concepto",
                fechaInicio: "custrecord_ht_ct_fecha_inicial",
                fechaFinal: "custrecord_ht_ct_fecha_final",
            };

            for (const [key, fieldId] of Object.entries(fields)) {
                if (infData[key]) {
                    newDetalleCobertura.setValue({
                        fieldId: fieldId,
                        value: infData[key],
                    });
                }
            }


            let newDetalleCoberturaId = newDetalleCobertura.save();

            log.debug("crearDetalleCoberturaSinOt ->", newDetalleCoberturaId);

            return newDetalleCoberturaId;
        } catch (error) {
            log.error("Error-CrearHTDetalleCobertura", error);
        }
    }

    function casoCoberturaSinOt(dataRegistro, GenerarCoberturaSinOt, idItem) {
        try {
            if (dataRegistro.PARAMETRIZACION_APD == "008" && GenerarCoberturaSinOt && idItem != 0) {

                let fechaIni = new Date(convertirFechaIso(dataRegistro.FECHA_INICIO_CALCULADO));
                let fechaFin = new Date(convertirFechaIso(dataRegistro.FECHA_FIN_CALCULADO));

                const diferenciaDias = calcularDiferenciaDias(fechaIni, fechaFin);

                const dataParaCobertura = {
                    bien: dataRegistro.ID_BIEN,
                    producto: idItem,
                    estado: dataRegistro.ID_ESTADO_COBERTURA_CALCULADO,
                    fechaInicio: fechaIni,
                    plazo: diferenciaDias,
                    fechaFinal: fechaFin,
                    familia: dataRegistro.ID_FAMILIA_PRODUCTO,
                };

                const idcobeGenerada = crearCoberturaSinOt(dataParaCobertura);

                const dataParaCobertura2 = {
                    IdCobertura: idcobeGenerada,
                    IdOrdenServicio: dataRegistro.ID_OS,
                    concepto: 16,
                    fechaInicio: fechaIni,
                    fechaFinal: fechaFin,
                };

                crearDetalleCoberturaSinOt(dataParaCobertura2);
            }

        } catch (error) {
            return false;
        }
    }

    function ObtenerLogRegistro(id) {
        try {

            let results = [];

            let serviceOrderSearch = search.create({
                type: "systemnote",
                filters: [
                    ['recordid', 'equalto', id],
                    'AND',
                    ['field', 'anyof', 'CUSTBODY_EC_ESTADO_FACTURA_INTERNA'],
                    'AND',
                    ['newvalue', 'startswith', 'Facturado'],
                ],
                columns: [
                    search.createColumn({ name: "date", label: "fecha", sort: search.Sort.DESC }),
                    search.createColumn({ name: "name", label: "definido_por" }),
                    search.createColumn({ name: "context", label: "contexto" }),
                    search.createColumn({ name: "type", label: "tipo" }),
                    search.createColumn({ name: "field", label: "campo" }),
                    search.createColumn({ name: "oldvalue", label: "oldValue" }),
                    search.createColumn({ name: "newvalue", label: "newValue" }),
                ],
            });

            let searchResult = serviceOrderSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    results.push({
                        date: result.getValue({ name: "date" }),
                        name: result.getValue({ name: "name" }),
                        context: result.getValue({ name: "context" }),
                        type: result.getValue({ name: "type" }),
                        field: result.getValue({ name: "field" }),
                        oldValue: result.getValue({ name: "oldvalue" }),
                        newValue: result.getValue({ name: "newvalue" }),
                    });
                });
            });

            if (results.length > 0) {
                return (results[0].date).split(" ")[0];
            } else {
                return false
            }

        } catch (error) {
            log.debug("error", error);
            return false;
        }
    }

    /*
    * Nuevo
    */
    function procesarYAgruparFamilias(data) {
        try {
            return data.reduce((acumulador, item) => {
                // Extraer los parámetros necesarios
                const ParametroFam = item.infoparametros.find(param => param.Param === "FAM");
                const ParametroAdp = item.infoparametros.find(param => param.Param === "ADP");

                // Crear el objeto transformado
                const itemTransformado = {
                    idbien: item.bien,
                    familia: ParametroFam ? ParametroFam.Valor : "",
                    adp: ParametroAdp ? ParametroAdp.Valor : "",
                    idOrdenServicio: item.internalidOs,
                    iditem: item.iditem,
                    tipoPlazo: item.TipoPlazo,
                    plazo: item.Plazo,
                    fechaOs: item.fechaOs,
                    esCortesiaOS: esCortesiaOS(item.internalidOs),
                    terms: item.terms
                };

                // Ignorar elementos sin familia
                if (!itemTransformado.familia) {
                    return acumulador;
                }

                // Buscar si la familia ya existe en el acumulador
                const familiaExistente = acumulador.find(grupo => grupo.familia === itemTransformado.familia);

                if (familiaExistente) {
                    // Si existe, agregar el item al array `data` de esa familia
                    familiaExistente.data.push(itemTransformado);
                } else {
                    // Si no existe, crear una nueva entrada para la familia
                    acumulador.push({
                        familia: itemTransformado.familia,
                        bien: itemTransformado.idbien,
                        cortesia: itemTransformado.esCortesiaOS,
                        data: [itemTransformado],
                    });
                }

                return acumulador;
            }, []);
        } catch (error) {
            throw new Error(`Error al procesar y agrupar familias: ${error.message}`);
        }
    }

    function validarFechasControlFacAgru(a, b) {
        try {
            if (a === "" || b === "") {
                return false;
            }

            const [diaInicio, mesInicio, anioInicio] = a.split('/');
            const [diaFin, mesFin, anioFin] = b.split('/');

            const fechaInicio = new Date(`${anioInicio}-${mesInicio}-${diaInicio}`);
            const fechaFin = new Date(`${anioFin}-${mesFin}-${diaFin}`);

            if (fechaInicio >= fechaFin) {
                return true;
            }
            return false;

        } catch (error) {
            return false;
        }
    }

    // 06/02/2025
    function crearRegistroLogMCC(bien, idOS, subsidiary, recordType) {

    try {
        if (bien && idOS && (subsidiary == "2" || subsidiary == 2)) {
            let ObtenerLosItemsDeLaOS = obtenerLosItemsDeUnaOS(idOS, bien);
            let infItemParaProceso = filtraDatosQueCumplaParametros(ObtenerLosItemsDeLaOS);

            log.debug("infItemParaProceso", infItemParaProceso);

            if (ObtenerLosItemsDeLaOS && infItemParaProceso && infItemParaProceso.cumplen) {
                let DataParabuscarCobertura = procesarYAgruparFamilias(infItemParaProceso.cumplen);
                log.debug("DataParabuscarCobertura", DataParabuscarCobertura);

                for (let i = 0; i < DataParabuscarCobertura.length; i++) {
                    log.debug("------------Ciclo-----------", i);
                    log.debug("DataParabuscarCobertura", DataParabuscarCobertura[i]);

                    let InfCoberturaEncontrada;
                    let DataInternaPorFamilia = DataParabuscarCobertura[i];

                    let fechaControlInicial;
                    let fechaControl;
                    let dataRegistro = {};
                    let EsInstalacionRenovacion = existeAdp015(DataInternaPorFamilia);
                    let familiaConsulta;
                    let EsAdp008 = existeAdp008(DataInternaPorFamilia);
                    let GenerarCoberturaSinOt = false;
                    let itemCasoAdp008 = 0;
                    let acumuladorPlazo = 0;

                    for (let y = 0; y < DataInternaPorFamilia.data.length; y++) {
                        familiaConsulta = consultaFamiliaNetsuiteMovFcc(DataInternaPorFamilia.data[y].familia);
                        InfCoberturaEncontrada = consultaCoberturaMovFcc(DataInternaPorFamilia.data[y].idbien, familiaConsulta.id);

                        log.debug("InfCoberturaEncontrada", InfCoberturaEncontrada);

                        if ((EsInstalacionRenovacion || EsAdp008) && !InfCoberturaEncontrada) {
                            if (DataInternaPorFamilia.familia == "CS" && InfCoberturaEncontrada && InfCoberturaEncontrada.coberturainicial && InfCoberturaEncontrada.coberturafinal) {
                                InfCoberturaEncontrada = {
                                    coberturainicial: InfCoberturaEncontrada.coberturainicial,
                                    coberturafinal: InfCoberturaEncontrada.coberturafinal,
                                    estado_cobertura: InfCoberturaEncontrada.estado_cobertura,
                                    estado_dispositivo: InfCoberturaEncontrada.estado_dispositivo
                                };
                            } else {
                                if (EsAdp008 && !InfCoberturaEncontrada) {
                                    GenerarCoberturaSinOt = true;
                                    itemCasoAdp008 = DataInternaPorFamilia.data[y].iditem;
                                }
                                InfCoberturaEncontrada = {
                                    coberturainicial: obtenerFechaEcuador(),
                                    coberturafinal: obtenerFechaEcuador(),
                                    estado_cobertura: "1",
                                    estado_dispositivo: "1"
                                };
                            }
                        }

                        let validacion = validarInfParaGenerarCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data[y]);
                        log.debug("validacion", validacion);

                        if (InfCoberturaEncontrada && validacion) {
                            if (y == 0) { fechaControlInicial = InfCoberturaEncontrada.coberturafinal; }

                            const coberturainicial = InfCoberturaEncontrada.coberturainicial || "";
                            const coberturafinal = fechaControl ? fechaControl : (InfCoberturaEncontrada.coberturafinal || "01/01/1900");
                            const estadoCobertura = InfCoberturaEncontrada.estado_cobertura || 0;
                            const estadoDispositivo = InfCoberturaEncontrada.estado_dispositivo || 0;

                            const parametrosTiempo = {
                                tiempo: DataInternaPorFamilia.data[y].plazo,
                                unidad: DataInternaPorFamilia.data[y].tipoPlazo,
                            };

                            const parametrosCobertura = {
                                coberturaInicial: coberturainicial,
                                coberturaFinal: coberturafinal,
                            };

                            const opcionesAdicionales = {
                                esReverso: "No",
                                fechaOS: obtenerUnDato("transaction", "trandate", idOS),
                            };

                            const resultadoCalculo = calcularCoberturaPersonalizado(
                                parametrosTiempo,
                                parametrosCobertura,
                                opcionesAdicionales
                            );

                            if (resultadoCalculo) { fechaControl = formatoFechaCalculo(resultadoCalculo.fechaFinCalculada); }

                            acumuladorPlazo = acumuladorPlazo + validarNumero(DataInternaPorFamilia.data[y].plazo);

                            dataRegistro = {
                                ID_BIEN: DataInternaPorFamilia.data[y].idbien,
                                ID_OS: DataInternaPorFamilia.data[y].idOrdenServicio,
                                FECHA_OS: DataInternaPorFamilia.data[y].fechaOs,
                                ID_FAC: "",
                                FECHA_FAC: "",
                                FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia,
                                ID_FAMILIA_PRODUCTO: DataInternaPorFamilia.data[y].familia ? consultaFamiliaNetsuite(DataInternaPorFamilia.data[y].familia).id : null,
                                UNIDAD: acumuladorPlazo,
                                ID_TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo,
                                TIPO_PLAZO: DataInternaPorFamilia.data[y].tipoPlazo ? obtenerSignificadoPlazo(DataInternaPorFamilia.data[y].tipoPlazo) : "",
                                FECHA_INICIO_ACTUAL: InfCoberturaEncontrada.coberturainicial,
                                FECHA_FIN_ACTUAL: InfCoberturaEncontrada.coberturafinal,
                                ID_ESTADO_COBERTURA_ACTUAL: estadoCobertura,
                                ESTADO_COBERTURA_ACTUAL: estadoCobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", estadoCobertura) : "",
                                ID_ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo,
                                ESTADO_DISPOSITIVO_ACTUAL: estadoDispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", estadoDispositivo) : "",
                                FECHA_INICIO_CALCULADO: resultadoCalculo.fechaInicoCalculada,
                                FECHA_FIN_CALCULADO: resultadoCalculo.fechaFinCalculada,
                                ID_ESTADO_COBERTURA_CALCULADO: "",
                                ESTADO_COBERTURA_CALCULADO: "",
                                ID_ESTADO_DISPOSITIVO_CALCULADO: "",
                                ESTADO_DISPOSITIVO_CALCULADO: "",
                                FECHA_INICIO_MODIFICADO: "",
                                FECHA_FIN_MODIFICADO: "",
                                ID_ESTADO_COBERTURA_MODIFICADO: "",
                                ESTADO_COBERTURA_MODIFICADO: "",
                                ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
                                ESTADO_DISPOSITIVO_MODIFICADO: "",
                                CORTESIA: DataInternaPorFamilia.data[y].esCortesiaOS ? "T" : "F",
                                PROCESADO: "F",
                                FECHA_PROCESADO: "",
                                ID_ORIGEN: recordType == "salesorder" ? 1 : 2,
                                ORIGEN: recordType,
                                PARAMETRIZACION_APD: (EsInstalacionRenovacion) ? "015" : DataInternaPorFamilia.data[y].adp ? DataInternaPorFamilia.data[y].adp : ""
                            };
                        }
                    }

                    if (fechaControlInicial) {
                        dataRegistro.FECHA_INICIO_CALCULADO = convertirFechaIso(fechaControlInicial);
                    }

                    if (dataRegistro.FECHA_FIN_CALCULADO == "01/01/1900" || dataRegistro.FECHA_FIN_CALCULADO == "1900-01-01T22:00:00.000Z") {
                        dataRegistro.FECHA_FIN_CALCULADO = dataRegistro.FECHA_INICIO_CALCULADO;
                    }

                    if (dataRegistro.ID_ESTADO_COBERTURA_CALCULADO == "" && dataRegistro.ID_ESTADO_DISPOSITIVO_CALCULADO == "") {
                        const EstadosGeneralesCobe = determinarEstadoCobertura(InfCoberturaEncontrada, DataInternaPorFamilia.data, dataRegistro);

                        dataRegistro.ID_ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura;
                        dataRegistro.ESTADO_COBERTURA_CALCULADO = EstadosGeneralesCobe.Cobertura ? obtenerUnDato("customlist_ht_estado_cobertura", "name", EstadosGeneralesCobe.Cobertura) : "";
                        dataRegistro.ID_ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo;
                        dataRegistro.ESTADO_DISPOSITIVO_CALCULADO = EstadosGeneralesCobe.Dispositivo ? obtenerUnDato("customlist_ht_mc_estado", "name", EstadosGeneralesCobe.Dispositivo) : "";
                    }

                    log.debug("****** dataregistrofinal - >******", dataRegistro);

                    let registroCreado = createLogRecordFechaCobertura(dataRegistro);

                    log.debug("registroCreado", registroCreado);
                }
            } else {
                log.debug("No cumple Condiciones", infItemParaProceso.noCumplen);
            }
        }
    } catch (error) {
      log.debug("error", error)
      return true
    }
    }

    return {
        beforeLoad,
        // beforeSubmit,
        // afterSubmit,
    };
});
