/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 27/02/2025
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros de envio de Orden de Servicios, Factura, Pagos, Orden de trabajo sobre la entidad Ven log Orden Servicio.
Ambiente: Produccion
*/
define([
    'N/https',
    'N/log',
    'N/record',
    'N/search',
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES'
], function (https, log, record, search, coberturaController, _funcion, _const) {

    function getInputData() {
        try {

            let fechaAnteriorEcuador = obtenerFechaEcuador();
            let rangoHora = obtenerRangoTiempoEcuador();

            log.debug("fechaAnteriorEcuador", fechaAnteriorEcuador )
            log.debug("rangoHora", rangoHora )
          
          
            const searchObj = search.create({
                type: "customrecord_ven_orden_servicio_log",
                filters: [
                    ["created", "within", `${fechaAnteriorEcuador}` + " " + `${rangoHora.HoraInicio}`, `${fechaAnteriorEcuador}` + " " + `${rangoHora.HoraFin}`]
                    // ["created", "within", `14/02/2025 0:00`, `14/02/2025 23:59`]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_id_os", summary: "GROUP", label: "ID_OS" })
                ]
            });

            const pagedResults = searchObj.runPaged({ pageSize: 1000 }); // Recuperar en páginas de 1000
            log.debug("Número de registros encontrados", pagedResults.count);

            let resultadosFormateados = [];

            // Iterar sobre todas las páginas de resultados
            pagedResults.pageRanges.forEach(pageRange => {
                const currentPage = pagedResults.fetch({ index: pageRange.index });
                currentPage.data.forEach(result => {
                    resultadosFormateados.push({
                        OriginalNombre: result.getValue({ name: "custrecord_id_os", summary: "GROUP" }),
                        InternalOS: result.getValue({ name: "custrecord_id_os", summary: "GROUP" })
                    });
                });
            });

            // Retornar los resultados procesados
            return resultadosFormateados;

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {

        // log.debug("contextmap", context)


        try {
            let data = JSON.parse(context.value);
            // Parseamos el valor recibido en el contexto (que normalmente es un JSON)

            let aux = context.key;
            try {
                context.write({
                    key: data.OriginalNombre,
                    value: { data, aux }
                });
            } catch (error) {
                log.error("Error en map", error);
            }
        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el procesamiento
            log.error("Error en map", error);
        }
    }

    function reduce(context) {

      // return true
      
        let values = context.values.map(JSON.parse);
        let data = values[0].data;

        // log.debug("data", data)
        try {
            let responseBody = makeApiRequest(data.InternalOS, "POST");
            let response = responseBody;

            // log.debug("Proceso", values[0].aux)
            // log.debug("informacion", { contador: values[0].aux, data: values })
            // log.debug("responseBody", responseBody)
            // return true;

            if (responseBody?.DetalleOrden?.length >= 0) {
                try {

                    // Preparar datos para enviar a la API externa
                    let DataToSend = response;
                    let token = _funcion.loginGetToken();

                    let headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };

                    DataToSend.accion = "V";
                    DataToSend.origen = "VI";

                    // log.debug("DataToSend", DataToSend)

                    let options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/OrdenServicioNS",
                        //url: "https://hunterapi.hunter.com.ec:9444/Apinetsuite/OrdenServicioNS",
                        headers: headers,
                        body: JSON.stringify(DataToSend),
                    };

                    // log.debug("Datos a enviar a la API externa", options);

                    // Enviar datos a la API externa
                    let response2 = https.post(options);

                    // log.debug("Respuesta de la API externa", response2);
                    let temporal = {};

                    if (response2.body != "") {
                        temporal = JSON.parse(response2.body);
                    }

                    // Validar la respuesta de la API externa y actualizar el registro de log
                    if (response2 && temporal?.statusCode === 200) {

                        log.debug("Respuesta de la API externa ok", data);

                        return true;
                    } else {

                        log.error("Error HTTP", `Código de estado: ${response2.code}, Respuesta: ${response2.body}`);

                        let ExisteOS = getOrdenService(data.InternalOS)

                        if (!ExisteOS) {
                            record.submitFields({
                                type: "customrecord_ven_orden_servicio_log",
                                id: data.InternalIdDoc,
                                values: {
                                    custrecord_procesado: "F",
                                    custrecord_tipoeventousuario: "delete",
                                    custrecord_impulso: 0
                                },
                            });
                        } else {
                            return `Código de estado: ${response2.code}, Respuesta: ${response2.body}`;
                        }
                    }
                } catch (error) {
                    log.debug("Error en la consulta de la API error", { stack: error.stack });
                }
            } else {
                log.debug("Error", "Tiempo Agotado.");
            }
        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el proceso de reducción
            log.error("Error en reduce", error);
        }
    }

    function summarize(summary) {
        try {

            return true;

        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el resumen
            log.error("Error en summarize", error);
        }
    }

    function makeApiRequest(idorden, method) {
        try {
            // Simula la llamada a la API
            return coberturaController.makeApiRequest(
                { idorden, indice: 1 },
                "customdeploy_hu_ec_rs_pd_orden_servicio",
                "customscript_hu_ec_rs_pd_orden_servicio",
                method,
                false
            );
        } catch (error) {
            log.debug("error", error)
            return []
        }
    }

    const getOrdenService = (id) => {
        try {
            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["internalid", "anyof", id],
                    "AND",
                    ["mainline", "is", "T"],
                ],
                columns: [
                    { name: "internalid" },
                    { name: "tranid", label: "Num. Pedido" },
                ],
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
            let respuesta = [];

            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {
                    respuesta.push({
                        idordenservicio: result.getValue({ name: "internalid" }),
                        ordenservicio: result.getValue({
                            name: "tranid",
                            label: "Num. Pedido",
                        }),
                    });
                });
            });

            return respuesta[0]?.ordenservicio ? true : false;
        } catch (e) {
            log.error("Error en BuscarOS", e);
            return 0;
        }
    };

    function obtenerFechaEcuador() {
        let fechaEcuador = new Date().toLocaleDateString("es-EC", {
            timeZone: "America/Guayaquil",
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        let [dia, mes, anio] = fechaEcuador.split('/');
        let fechaAnterior = new Date(`${anio}-${mes}-${dia}T00:00:00-05:00`);
        fechaAnterior.setDate(fechaAnterior.getDate());

        let fechaAnteriorEcuador = fechaAnterior.toLocaleDateString("es-EC", {
            timeZone: "America/Guayaquil",
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return fechaAnteriorEcuador;
    }

    function obtenerRangoTiempoEcuador() {
        try {
            let opciones = { timeZone: "America/Guayaquil", hour12: false };
            let fechaEcuador = new Date(new Date().toLocaleString("en-US", opciones));

            let hora = fechaEcuador.getHours();

            // Asegurar que siempre sean dos dígitos
            // let horaInicioStr = hora.toString().padStart(2, "0");
            // let horaFinStr = (hora + 1).toString().padStart(2, "0");
            let horaInicioStr = (hora - 1).toString().padStart(2, "0")
            let horaFinStr = (hora).toString().padStart(2, "0")
          

            return {
                HoraInicio: `${horaInicioStr}:00`,
                HoraFin: `${horaFinStr}:00`
            };

        } catch (error) {
            log.debug("error", error);
            return {};
        }
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
