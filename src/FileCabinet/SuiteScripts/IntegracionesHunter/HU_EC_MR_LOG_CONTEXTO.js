/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
Creado Por: DAVID ARISTEGA
Fecha: 09/12/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros con contexto UI y CSV, sobre Orden de Servicio Solo Subsidaria 2. Se reajusta cada 1 Hora
Ambiente: Produccion
*/
define([
    'N/search',
    'N/log',
    'N/record',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
    'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
    'N/query',
], function (search, log, record, _funcion, _const, query) {


    const CAMPOS_RUIDO = [
        'TRANLINE.RCOMMITTED',       // cantidad comprometida (commitment de inventario)
        'TRANLINE.QUANTITYCOMMITTED'
    ];

    // function getInputData() {
    //     try {

    //         let rangoAjustado = obtenerRangoTiempoEcuador();
    //         log.debug("rangoHora", rangoAjustado);

    //         // let rangoAjustado = { HoraInicio: "11/08/2026 11:00", HoraFin: "11/08/2026 12:00" };
    //         // log.debug("rangoHora", rangoAjustado);

    //         const contextos = [
    //             'CSV', 'WFA', 'UIF', 'UES', 'RST', 'MUP', 'SLT', 'SCH', 'MPR',
    //             'WFW', 'SCR', 'MUS', 'SSP', 'CLS', 'SDF', 'BND', 'POR'
    //         ];
    //         const inList = contextos.map(c => `'${c}'`).join(',');

    //         // Lista de campos de ruido para el NOT IN del SQL
    //         const ruidoList = CAMPOS_RUIDO.map(c => `'${c}'`).join(',');

    //         const sql = `
    //         SELECT recordid, context, tipo
    //         FROM (
    //             SELECT sn.recordid, sn.context, t.type AS tipo,
    //                    ROW_NUMBER() OVER (PARTITION BY sn.recordid ORDER BY sn.date DESC, sn.id DESC) AS rn
    //             FROM SystemNote sn
    //             JOIN transaction t ON t.id = sn.recordid
    //             JOIN transactionLine tl ON tl.transaction = t.id AND tl.mainline = 'T'
    //             WHERE 1=1 
    //               -- AND sn.context IN (${inList})
    //               -- AND sn.field NOT IN (${ruidoList})
    //               -- AND recordid = 5645956
    //               AND sn.recordtypeid = -30
    //               AND tl.subsidiary = 2
    //               AND sn.date >= TO_DATE('${rangoAjustado.HoraInicio}', 'DD/MM/YYYY HH24:MI')
    //               AND sn.date <= TO_DATE('${rangoAjustado.HoraFin}', 'DD/MM/YYYY HH24:MI')
    //               AND t.type IN ('SalesOrd', 'CustInvc', 'CustPymt', 'DepAppl')
    //         )
    //         WHERE rn = 1
    //     `;

    //         const results = query.runSuiteQL({ query: sql }).asMappedResults();

    //         if (results.length === 0) {
    //             log.error("Búsqueda vacía", "No se encontraron resultados");
    //         }

    //         log.debug("--Resultados de la búsqueda--", results.length);

    //         return results.map(r => ({
    //             id: r.recordid,
    //             context: r.context,
    //             tipo: r.tipo   // 'SalesOrd', 'CustInvc', 'CustPymt', 'DepAppl'.
    //         }));

    //     } catch (error) {
    //         log.error("Error en getInputData", error);
    //         return [];
    //     }
    // }

    function getInputData() {
        try {
            let rangoAjustado = obtenerRangoTiempoEcuador();
            log.debug("rangoHora", rangoAjustado);

            // let rangoAjustado = { HoraInicio: "12/08/2026 08:00", HoraFin: "12/08/2026 09:00" };
            // log.debug("rangoHora", rangoAjustado);

            const contextos = [
                'CSV', 'WFA', 'UIF', 'UES', 'RST', 'MUP', 'SLT', 'SCH', 'MPR',
                'WFW', 'SCR', 'MUS', 'SSP', 'CLS', 'SDF', 'BND', 'POR'
            ];
            const inList = contextos.map(c => `'${c}'`).join(',');
            const ruidoList = CAMPOS_RUIDO.map(c => `'${c}'`).join(',');

            const sql = `
                SELECT recordid, context, tipo
                FROM (
                    SELECT sn.recordid, sn.context, t.type AS tipo,
                           ROW_NUMBER() OVER (PARTITION BY sn.recordid ORDER BY sn.date DESC, sn.id DESC) AS rn
                    FROM SystemNote sn
                    JOIN transaction t ON t.id = sn.recordid
                    JOIN transactionLine tl ON tl.transaction = t.id AND tl.mainline = 'T'
                    WHERE 1=1 
                      -- AND sn.context IN (${inList})
                      -- AND sn.field NOT IN (${ruidoList})
                      AND sn.recordtypeid = -30
                      AND tl.subsidiary = 2
                      AND sn.date >= TO_DATE('${rangoAjustado.HoraInicio}', 'DD/MM/YYYY HH24:MI')
                      AND sn.date <= TO_DATE('${rangoAjustado.HoraFin}', 'DD/MM/YYYY HH24:MI')
                      AND t.type IN ('SalesOrd', 'CustInvc', 'CustPymt', 'DepAppl')
                )
                WHERE rn = 1
            `;

            const pagedData = query.runSuiteQLPaged({ query: sql, pageSize: 1000 });
            const results = [];

            pagedData.pageRanges.forEach(function (pageRange) {
                const page = pagedData.fetch({ index: pageRange.index });
                page.data.asMappedResults().forEach(function (r) {
                    results.push({
                        id: r.recordid,
                        context: r.context,
                        tipo: r.tipo
                    });
                });
            });

            log.debug("--Resultados de la búsqueda--", results.length);

            if (results.length === 0) {
                log.error("Búsqueda vacía", "No se encontraron resultados");
            }

            return results;
        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }

    function map(context) {
        try {
            // return
            const data = JSON.parse(context.value);

            if (!data.context) {
                data.context = "UI"; // Valor por defecto si no se encuentra el contexto
            }

            if (!data.id || !data.context) {
                log.error("Datos incompletos en el registro", data);
                return;
            }

            const recordId = data.id;
            const contextType = data.context;
            const tipo = data.tipo;

            // ---------- ORDEN DE SERVICIO ----------
            if (tipo === 'SalesOrd') {
                let esValidoOS = getOrdenService(recordId);
                if (esValidoOS) {
                    const outputData = {
                        idos: esValidoOS.Idordenservicio,
                        bien: esValidoOS.Bien,
                        idOrigen: esValidoOS.Idordenservicio,
                        origen: esValidoOS.Origen,
                        tipoEventoUsuario: contextType,
                        OrdenServicio: esValidoOS.Ordenservicio,
                        Subsidiaria: "2",
                        location: "",
                        traindOriginal: esValidoOS.Ordenservicio
                    };
                    context.write({ key: recordId, value: outputData });
                    return;
                }
            }

            // ---------- FACTURA DE VENTA ----------
            else if (tipo === 'CustInvc') {
                let esValidoFV = getFacturaVenta(recordId);
                if (esValidoFV) {
                    for (let i = 0; i < esValidoFV.length; i++) {
                        let d = {
                            idos: esValidoFV[i].Idordenservicio,
                            bien: esValidoFV[i].Bien || 0,
                            idOrigen: esValidoFV[i].IdFactura,
                            origen: esValidoFV[i].Origen,
                            tipoEventoUsuario: esValidoFV[i].Evento_usuario,
                            OrdenServicio: esValidoFV[i].Ordenservicio,
                            Subsidiaria: "2",
                            location: "",
                            traindOriginal: esValidoFV[i].Ordenservicio
                        };
                        context.write({ key: recordId, value: d });
                    }
                    return;
                }
            }

            // ---------- PAGO (Customer Payment) ----------
            else if (tipo === 'CustPymt') {
                let esValidoPG = getPayment(recordId);
                if (esValidoPG) {
                    for (let i = 0; i < esValidoPG.length; i++) {
                        let d = {
                            idos: esValidoPG[i].idos,
                            bien: esValidoPG[i].bien || 0,
                            idOrigen: esValidoPG[i].idOrigen,
                            origen: esValidoPG[i].origen,
                            tipoEventoUsuario: esValidoPG[i].tipoEventoUsuario,
                            OrdenServicio: esValidoPG[i].OrdenServicio,
                            Subsidiaria: "2",
                            location: esValidoPG[i].location,
                        };
                        context.write({ key: recordId, value: d });
                    }
                    return;
                }
            }

            // ---------- APLICACIÓN DE DEPÓSITO (Deposit Application) ----------
            else if (tipo === 'DepAppl') {
                let esValidoDP = getDepappl(recordId);
                if (esValidoDP) {
                    for (let i = 0; i < esValidoDP.length; i++) {
                        let d = {
                            idos: esValidoDP[i].idos,
                            bien: esValidoDP[i].bien || 0,
                            idOrigen: esValidoDP[i].idOrigen,
                            origen: esValidoDP[i].origen,
                            tipoEventoUsuario: esValidoDP[i].tipoEventoUsuario,
                            OrdenServicio: esValidoDP[i].OrdenServicio,
                            Subsidiaria: "2",
                            location: esValidoDP[i].location,
                        };
                        context.write({ key: recordId, value: d });
                    }
                    return;
                }
            }

            else {
                log.debug("Tipo no manejado en enrutamiento", { recordId, contextType, tipo });
                return;
            }

            log.debug("Registro no aplica a reglas de negocio", { recordId, contextType, tipo });

        } catch (error) {
            log.error("Error en map", error);
        }
    }

    function reduce(context) {
        try {
            // return
            context.values.forEach(dataString => {
                const data = JSON.parse(dataString);
                createLogRecord(data);
            });
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

    const getOrdenService = (id) => {
        try {

            if (!id || isNaN(id)) {
                log.error("ID inválido", { id });
                return false;
            }

            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["internalid", "is", id],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["custbody_ht_so_bien", "noneof", "@NONE@"],
                    "AND",
                    ["customform", "anyof", "142"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "custbody_ht_so_bien" })
                ]
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1 });

            if (myPagedData.count > 0) {
                const result = myPagedData.fetch({ index: 0 }).data[0];
                return {
                    Idordenservicio: result.getValue({ name: "internalid" }),
                    Ordenservicio: result.getValue({ name: "tranid" }),
                    Bien: result.getValue({ name: "custbody_ht_so_bien" }),
                    Origen: "OS",
                    Procesado: "F"
                };
            }

            return false;
        } catch (error) {
            log.error("Error en getOrdenService", error);
            return false;
        }
    };

    const getFacturaVenta = (id) => {
        try {
            const salesorderSearchObj = search.create({
                type: "transaction",
                filters: [
                    ["type", "anyof", "CustInvc"],
                    "AND",
                    ["internalid", "anyof", id],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["createdfrom", "noneof", "@NONE@"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "custbody_ht_so_bien" }),
                    search.createColumn({ name: "createdfrom" }),
                ],
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1 });

            if (myPagedData.count > 0) {
                const myPage = myPagedData.fetch({ index: 0 });
                const result = myPage.data[0];

                return [{
                    Idordenservicio: result.getValue({ name: "createdfrom" }),
                    Ordenservicio: result.getValue({ name: "tranid" }),
                    Bien: result.getValue({ name: "custbody_ht_so_bien" }),
                    IdFactura: result.getValue({ name: "internalid" }),
                    Origen: "FAC",
                    Procesado: "F",
                    Evento_usuario: "UI",
                    Impulso: "0"
                }];
            } else {
                return getOrdenServiceFacturaAgrupada(id);
            }

        } catch (e) {
            log.error("Error en BuscarOS", e);
            return false;
        }
    };

    const getOrdenServiceFacturaAgrupada = (id) => {
        try {
            if (!id || isNaN(id)) {
                log.error("ID inválido", { id });
                return false;
            }

            const salesorderSearchObj = search.create({
                type: "salesorder",
                filters: [
                    ["type", "anyof", "SalesOrd"],
                    "AND",
                    ["custbody_ht_factura_directa", "is", id],
                    "AND",
                    ["mainline", "is", "T"],
                    "AND",
                    ["subsidiary", "anyof", "2"],
                    "AND",
                    ["custbody_ht_so_bien", "noneof", "@NONE@"],
                    "AND",
                    ["customform", "anyof", "142"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "tranid" }),
                    search.createColumn({ name: "custbody_ht_so_bien" })
                ]
            });

            const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1000 });
            let resultadosFormateados = [];

            myPagedData.pageRanges.forEach(pageRange => {
                const currentPage = myPagedData.fetch({ index: pageRange.index });
                currentPage.data.forEach(result => {
                    resultadosFormateados.push({
                        Idordenservicio: result.getValue({ name: "internalid" }),
                        Ordenservicio: result.getValue({ name: "tranid" }),
                        Bien: result.getValue({ name: "custbody_ht_so_bien" }),
                        Origen: "OS",
                        Procesado: "F"
                    });
                });
            });

            let facturaNormal = resultadosFormateados.length > 0 ? resultadosFormateados : false;

            if (!facturaNormal) {
                let dataFacInt = obtenerInfFacturaInterna(id);

                if (dataFacInt && dataFacInt?.length > 0) {
                    for (let i = 0; i < dataFacInt.length; i++) {
                        let data = {
                            Idordenservicio: dataFacInt[i].custrecord_orden_servicio,
                            Ordenservicio: "",
                            Bien: 0,
                            Origen: "FI",
                            Procesado: "F",
                            IdFactura: dataFacInt[i].custrecord_nro_factura_interna
                        };
                        resultadosFormateados.push(data);
                    }
                    return resultadosFormateados;
                } else {
                    return false;
                }
            }

            return facturaNormal;

        } catch (error) {
            log.error("Error en getOrdenService", error);
            return false;
        }
    };

    const getPayment = (idPago) => {
        try {

            let dataPago = [];

            let paymentRecord = record.load({
                type: record.Type.CUSTOMER_PAYMENT,
                id: idPago,
                isDynamic: false
            });

            let SubsidiariaPY = paymentRecord.getValue("subsidiary");
            if (SubsidiariaPY == 3 || SubsidiariaPY == "3") return false;

            let locationPY = paymentRecord.getValue("location");
            let lineCount = paymentRecord.getLineCount({ sublistId: "apply" });

            for (let i = 0; i < lineCount; i++) {
                let isApplied = paymentRecord.getSublistValue({
                    sublistId: "apply",
                    fieldId: "apply",
                    line: i
                });

                if (isApplied) {
                    let invoiceId = paymentRecord.getSublistValue({
                        sublistId: "apply",
                        fieldId: "internalid",
                        line: i
                    });

                    let InfFactura = obtenerInfFacturaPago(invoiceId);
                    let origen = "PC";

                    if (Array.isArray(InfFactura)) {
                        InfFactura.forEach((factura) => {
                            if (factura.idos) {
                                dataPago.push({
                                    idos: factura.idos,
                                    bien: factura.bien,
                                    idOrigen: idPago,
                                    origen: origen,
                                    tipoEventoUsuario: "UI",
                                    OrdenServicio: factura.idos,
                                    Subsidiaria: SubsidiariaPY,
                                    location: locationPY,
                                });
                            }
                        });
                    } else if (InfFactura && InfFactura.idos) {
                        dataPago.push({
                            idos: InfFactura.idos,
                            bien: InfFactura.bien,
                            idOrigen: idPago,
                            origen: origen,
                            tipoEventoUsuario: "UI",
                            OrdenServicio: InfFactura.idos,
                            Subsidiaria: SubsidiariaPY,
                            location: locationPY,
                        });
                    }
                }
            }

            return dataPago.length > 0 ? dataPago : false;
        } catch (error) {
            // log.error("Error en getPayment", error);
            return false;
        }
    };

    const getDepappl = (idAdd) => {
        try {

            let dataPago = [];

            let paymentRecord = record.load({
                type: record.Type.DEPOSIT_APPLICATION,
                id: idAdd,
                isDynamic: false
            });

            let SubsidiariaPY = paymentRecord.getValue("subsidiary");
            if (SubsidiariaPY == 3 || SubsidiariaPY == "3") return false;

            let locationPY = paymentRecord.getValue("location");
            let lineCount = paymentRecord.getLineCount({ sublistId: "apply" });

            for (let i = 0; i < lineCount; i++) {
                let isApplied = paymentRecord.getSublistValue({
                    sublistId: "apply",
                    fieldId: "apply",
                    line: i
                });

                if (isApplied) {
                    let invoiceId = paymentRecord.getSublistValue({
                        sublistId: "apply",
                        fieldId: "internalid",
                        line: i
                    });

                    log.debug("invoiceId", { idAdd, invoiceId, isApplied });

                    let InfFactura = obtenerInfFacturaPago(invoiceId);

                    log.debug("--InfFactura--", InfFactura);

                    let origen = "ADD";

                    if (Array.isArray(InfFactura)) {
                        InfFactura.forEach((factura) => {
                            if (factura.idos) {
                                dataPago.push({
                                    idos: factura.idos,
                                    bien: factura.bien,
                                    idOrigen: idAdd,
                                    origen: origen,
                                    tipoEventoUsuario: "UI",
                                    OrdenServicio: factura.idos,
                                    Subsidiaria: SubsidiariaPY,
                                    location: locationPY,
                                });
                            }
                        });
                    } else if (InfFactura && InfFactura.idos) {
                        dataPago.push({
                            idos: InfFactura.idos,
                            bien: InfFactura.bien,
                            idOrigen: idAdd,
                            origen: origen,
                            tipoEventoUsuario: "UI",
                            OrdenServicio: InfFactura.idos,
                            Subsidiaria: SubsidiariaPY,
                            location: locationPY,
                        });
                    }
                }
            }

            log.debug("-dataPago-", dataPago);
            log.debug("-dataPago-", dataPago.length);

            return dataPago.length > 0 ? dataPago : false;
        } catch (error) {
            // log.error("Error en getDepappl", error);
            return false;
        }
    };

    const createLogRecord = (data) => {
        try {
            const logRecord = record.create({
                type: "customrecord_ven_orden_servicio_log",
                isDynamic: true
            });

            logRecord.setValue("custrecord_id_os", data.idos);
            logRecord.setValue("custrecord_id_bien", data.bien);
            logRecord.setValue("custrecord_id_origen", data.idOrigen);
            logRecord.setValue("custrecord_origen", data.origen);
            logRecord.setValue("custrecord_procesado", "F");
            logRecord.setValue("custrecord_impulso", 0);
            logRecord.setValue("custrecord_tipoeventousuario", data?.tipoEventoUsuario);
            logRecord.setValue("custrecord_orden_servicio_name", data?.OrdenServicio);
            logRecord.setValue("custrecord_subsidiaria", data?.Subsidiaria);
            logRecord.setValue("custrecord_localidad", data?.location);
            logRecord.setValue("custrecord_original_nombre", data?.traindOriginal);

            logRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
        } catch (error) {
            log.error("Error en createLogRecord", data);
        }
    };

    // ============================================================
    // Rango de 1 HORA. Devuelve SIEMPRE la hora en punto anterior,
    // sin importar el minuto exacto de ejecución:
    //   9:01, 9:30, 9:59  ->  08:00 a 09:00
    //   0:15              ->  23:00 (día anterior) a 00:00
    // Requiere que el cron dispare una vez por hora.
    // ============================================================
    function obtenerRangoTiempoEcuador() {
        try {
            const fechaServidor = new Date();
            const offsetEcuador = -5 * 60; // UTC-5 en minutos

            const utc = fechaServidor.getTime() + (fechaServidor.getTimezoneOffset() * 60000);
            const fechaEcuador = new Date(utc + (offsetEcuador * 60000));

            const fechaFin = new Date(fechaEcuador);
            fechaFin.setMinutes(0, 0, 0);

            const fechaInicio = new Date(fechaFin);
            fechaInicio.setHours(fechaInicio.getHours() - 1);

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

        return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
    };

    const obtenerInfFacturaPago = (id) => {
        try {
            let busqueda = search.create({
                type: "transaction",
                filters: [
                    ["internalid", "anyof", id]
                ],
                columns: [
                    search.createColumn({ name: "createdfrom", label: "ID_OS" }),
                    search.createColumn({ name: "custbody_ht_so_bien", label: "ID_BIEN" }),
                ]
            });

            let savedsearch = busqueda.run().getRange(0, 1);

            let dataAjustada = [];

            if (savedsearch.length > 0) {
                let result = savedsearch[0];
                let os = result.getValue(busqueda.columns[0]);

                if (os) {
                    dataAjustada.push({
                        idos: os,
                        bien: result.getValue(busqueda.columns[1]),
                    });
                } else {
                    let dataFacInt = obtenerInfFacturaInterna(id);

                    if (dataFacInt && dataFacInt?.length > 0) {
                        for (let i = 0; i < dataFacInt.length; i++) {
                            dataAjustada.push({
                                idos: dataFacInt[i].custrecord_orden_servicio,
                                bien: 0
                            });
                        }
                    }
                }

                if (dataAjustada.length > 0) {
                    return dataAjustada;
                } else {
                    return [{ "idos": "", "bien": "" }];
                }
            }

        } catch (e) {
            log.error('Error en obtenerInfFacturaPago', e);
            return { "idos": "", "bien": "" };
        }
    };

    // 22/11/2024
    const obtenerInfFacturaInterna = (idFactura) => {
        try {

            if (!idFactura) { return []; }

            let sqlQuery = `
            SELECT  
               custrecord_nro_factura_interna, 
               custrecord_orden_servicio,
               'FI' AS Tag
            FROM     
                customrecord_ht_fact_internas_asociadas fi
            JOIN 
                transaction tr ON tr.id = fi.custrecord_orden_servicio
            JOIN
                transactionLine B ON B.TRANSACTION = tr.id 
            WHERE    
                fi.isinactive = 'F'
                AND fi.custrecord_nro_factura = ${idFactura}
                AND fi.custrecord_orden_servicio IS NOT NULL
                AND B.MAINLINE='F'
                AND B.TAXLINE = 'F'
                AND B.subsidiary= 2
           `;
            var resultSet = query.runSuiteQL({
                query: sqlQuery,
            });

            let results = resultSet.asMappedResults();

            if (!results) {
                return [];
            } else {
                for (let obj of results) {
                    for (let key in obj) {
                        if (typeof obj[key] === 'string') {
                            obj[key] = obj[key].replace(/\n/g, " ");
                        } else {
                            obj[key] = obj[key] === null ? "" : obj[key];
                        }
                    }
                }

                if (results.length > 0) {
                    return results;
                } else {
                    return [];
                }
            }

        } catch (error) {
            log.error("Error obtenerInfFacturaInterna", { error: error.message, stack: error.stack });
            return [];
        }
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});