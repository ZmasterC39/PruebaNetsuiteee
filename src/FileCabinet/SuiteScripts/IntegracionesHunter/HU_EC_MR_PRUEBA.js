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
    'N/log',
    'N/search',
    'N/query',
    "N/record",
    'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
    "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION",
    "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
    "N/https",
    "N/runtime",
    "N/format",
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
    'N/file'
], function (log, search, query, record, coberturaController, _funcion, _const, https, runtime, format, _platformController, file) {


    function getInputData() {
        try {

            return [
                329054,
                329054,
                329146,
                329146,
                646435,
                646435,
                646658,
                646658,
                646672,
                646672,
                647363,
                647363,
                653083,
                653083,
                653316,
                653316,
                653530,
                657297,
                657297,
                662326,
                684130,
                684142,
                684179,
                684185,
                684190,
                684198,
                684329,
                684363,
                684376,
                684500,
                684502,
                684513,
                684536,
                684545,
                684550,
                684553,
                684554,
                684556,
                684562,
                684569,
                684577,
                684648,
                684665,
                684687,
                684724,
                684731,
                684814,
                684822,
                684823,
                684830,
                684839,
                684853,
                685204,
                685250,
                685381,
                685395,
                685500,
                685530,
                686073,
                686076,
                686131,
                686201,
                686282,
                686354,
                686422,
                686476,
                686494,
                686506,
                686645,
                686717,
                686722,
                686726,
                686757,
                686767,
                686881,
                686894,
                686996,
                687024,
                687058,
                687065,
                687146,
                687154,
                687217,
                687307,
                687316,
                687319,
                687320,
                687338,
                687345,
                687382,
                687391,
                687533,
                687534,
                687536,
                687624,
                687631,
                687747,
                687778,
                687782,
                687808,
                687859,
                688003,
                688100,
                688153,
                688611,
                688693,
                688990,
                689022,
                689099,
                689173,
                689175,
                689475,
                689602,
                689705,
                690030,
                690255,
                690358,
                690377,
                690554,
                690573,
                690799,
                690809,
                690821,
                691111,
                691256,
                691305,
                691309,
                691311,
                691340,
                691393,
                691510,
                691518,
                691542,
                691605,
                691758,
                691863,
                691870,
                691997,
                692165,
                692195,
                692300,
                692435,
                692458,
                692542,
                692583,
                693383,
                693592,
                693998,
                694007,
                694157,
                694166,
                694236,
                694360,
                694390,
                694426,
                694445,
                694598,
                695112,
                695124,
                695149,
                695188,
                695227,
                695238,
                695322,
                695344,
                695384,
                695465,
                695490,
                695510,
                695819,
                695991,
                695995,
                696002,
                696015,
                696120,
                696330,
                696381,
                696411,
                696577,
                696586,
                696612,
                696687,
                696888,
                697237,
                697352,
                697509,
                697526,
                699162,
                699185,
                699244,
                699348,
                699378,
                699404,
                699471,
                699606,
                699762,
                699823,
                700713,
                700769,
                700771,
                700816,
                701136,
                701966,
                702008,
                702213,
                704484,
                706936,
                706992,
                707075,
                707230,
                707392,
                707439,
                707659,
                707937,
                707941,
                708161,
                708301,
                708393,
                708726,
                708792,
                709437,
                709454,
                709460,
                709483,
                709520,
                709520,
                709561,
                709600,
                709627,
                709633,
                709659,
                709681,
                709803,
                709809,
                709848,
                710076,
                710077,
                710129,
                710167,
                710189,
                710241,
                710444,
                710679,
                711834,
                711838,
                713733,
                713978,
                714036,
                714044,
                714132,
                714915,
                715102,
                715455,
                715474,
                715478,
                715707,
                715724,
                715867,
                715904,
                715917,
                715919,
                716087,
                716102,
                716104,
                716140,
                716349,
                716438,
                716773,
                717033,
                717264,
                717432,
                717692,
                718158,
                718292,
                718417,
                718440,
                718622,
                718640,
                718669,
                718708,
                722403,
                722449,
                722527,
                722546,
                722555,
                722583,
                723135,
                723292,
                723386,
                723413,
                723417,
                723618,
                723626,
                723717,
                723777,
                723914,
                723923,
                724174,
                724226,
                724227,
                725278,
                725993,
                726223,
                726386,
                726388,
                726751,
                727167,
                727289,
                728083,
                728215,
                728230,
                728315,
                728539,
                728571,
                729394,
                729964,
                730241,
                730831,
                731168,
                731255,
                731492,
                731498,
                731521,
                731757,
                732016,
                732269,
                732371,
                732381,
                732420,
                732902,
                733030,
                733031,
                733041,
                733047,
                733186,
                733200,
                733726,
                733816,
                733865,
                733930,
                733953,
                734352,
                734379,
                734967,
                735004,
                735276,
                735793,
                735811,
                736172,
                736204,
                736451,
                736481,
                736762,
                736937,
                737254,
                737482,
                737488,
                737513,
                737641,
                738060,
                738388,
                738926,
                738935,
                739550,
                739556,
                739567,
                739607,
                739626,
                739655,
                739657,
                739778,
                739868,
                739889,
                739898,
                739942,
                740023,
                740095,
                740096,
                740150,
                740156,
                740164,
                740169,
                740176,
                740181,
                740192,
                740214,
                740316,
                740398,
                741604,
                741604,

            ]

            let anioSQL = '2024';
            let mesSQL = '11';
            let results = [];
            let pageSize = 1000;

            // // Rutina de propietario 2024
            // let sql = `
            //   SELECT 
            //     DISTINCT bn.custrecord_ht_bien_propietario 
            //   FROM 
            //     systemnote sn, 
            //     customrecord_ht_record_bienes bn 
            //   WHERE 
            //     sn.recordid = bn.id 
            //     AND sn.recordtypeid = 698 
            //     AND TO_CHAR(sn.date, 'YYYY') = ?
            //     AND TO_CHAR(sn.date, 'MM')   = ? 
            //     AND sn.type = 1 
            //     AND bn.custrecord_bn_subsidiaria = 2 
            //     AND sn.context = 'CSV' 
            //     AND NVL(
            //       bn.custrecord_ht_bien_codsysh, '0'
            //     ) = '0' 
            //   ORDER BY 
            //     bn.custrecord_ht_bien_propietario
            // `;

            // Rutina de Bien 2024
            let sql = `
              SELECT 
                sn.recordid
              FROM 
                systemnote sn, 
                customrecord_ht_record_bienes bn 
              WHERE 
                sn.recordid = bn.id 
                AND sn.recordtypeid = 698 
                AND TO_CHAR(sn.date, 'YYYY') = ?
                AND TO_CHAR(sn.date, 'MM')   = ? 
                AND sn.type = 1 
                AND bn.custrecord_bn_subsidiaria = 2 
                AND sn.context = 'CSV' 
                AND NVL(
                  bn.custrecord_ht_bien_codsysh, '0'
                ) = '0' 
              ORDER BY 
                bn.custrecord_ht_bien_propietario
            `;


            // // Rutina de propietario 
            // let sql = `
            //   Select distinct bn.custrecord_ht_bien_propietario
            //   FROM systemnote sn, customrecord_ht_record_bienes bn
            //   WHERE sn.recordid = bn.id
            //   AND sn.recordtypeid = 698 
            //   AND TO_CHAR(sn.date, 'YYYY') = ?
            //   AND TO_CHAR(sn.date, 'MM') = ?
            //   AND sn.type = 1
            //   AND bn.custrecord_bn_subsidiaria = 2
            //   AND sn.context = 'CSV'
            //   order by bn.custrecord_ht_bien_propietario
            // `;

            // // Rutina de Bien
            // let sql = `
            //   Select recordid
            //   FROM systemnote sn, customrecord_ht_record_bienes bn
            //   WHERE sn.recordid = bn.id
            //   AND sn.recordtypeid = 698 
            //   AND TO_CHAR(sn.date, 'YYYY') = ?
            //   AND TO_CHAR(sn.date, 'MM') = ?
            //     --AND sn.recordid = 985260
            //   AND sn.type = 1
            //   AND bn.custrecord_bn_subsidiaria = 2
            //   AND sn.context = 'CSV'
            //   order by sn.recordid
            // `;

            let pagedData = query.runSuiteQLPaged({
                query: sql,
                params: [anioSQL, mesSQL],
                pageSize: pageSize
            });

            pagedData.pageRanges.forEach(function (pageRange) {
                let page = pagedData.fetch({ index: pageRange.index });
                let iterator = page.data.iterator();

                iterator.each(function (result) {
                    let row = result.value.asMap();
                    // let idCliente = row.custrecord_ht_bien_propietario;
                    // if (idCliente) {
                    //     results.push(idCliente); // asegurar string
                    // }

                    let idBien = row.recordid;
                    if (idBien) {
                        results.push(idBien); // asegurar string
                    }

                    return true;
                });
            });

            log.debug("getInputData - Total IDs encontrados", results.length);

            return results; //  [1, 2, 3, ...]

        } catch (error) {
            log.error("Error en getInputData", error);
            return [];
        }
    }



    // function map(context) {
    //     try {
    //         // ID que viene del getInputData
    //         log.debug('MAP', '--------MAP Inicio--------')
    //         const idRegistro = JSON.parse(context.value);

    //         // ! Inicio Cliente
    //         log.audit('Map - idRegistro recibido', idRegistro);
    //         crearRegistroLog(idRegistro, 'PD_Cliente');
    //         return;
    //         // ! Fin Cliente

    //     } catch (e) {
    //         log.error('Error en map', {
    //             value: context.value,
    //             error: e
    //         });
    //     }
    // }

    function map(context) {
        try {
            // ID que viene del getInputData
            log.debug('MAP', '--------MAP Inicio--------')
            const idRegistro = JSON.parse(context.value);

            // ! Inicio Bien
            // log.audit('Map - idRegistro recibido', idRegistro);
            // crearRegistroLog(idRegistro, 'PD_Bienes');

            log.audit('Map - idRegistro recibido', idRegistro);
            crearRegistroLog(idRegistro, 'EnvioCobertura');

            return;

            let loginApiToken = _funcion.loginGetToken();
            let params = {
                opcion: "100",
                datSelect: "SELECT TOP 1 1",
                datFrom: "FROM Ventas.DBO.VEN_AUTOMOVILES AUT WITH(NOLOCK)",
                datWhere: `WHERE CONVERT(VARCHAR, AUT.ID_INTERNO_NS) = '${idRegistro}' `
            }

            let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";

            let headersConsulta = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${loginApiToken}`,
            };

            let response = https.post({
                url: urlBase,
                headers: headersConsulta,
                body: JSON.stringify(params),
            });

            log.audit("log Api Ejecutiva", response)
            let data = JSON.parse(response.body);

            if (data?.results && data?.results.length === 0) {
                log.audit('Registro no existe en API externa, creando log', idRegistro);
            } else {
                log.audit('Registro ya existe en API externa', idRegistro);
            }

            return;
            // ! Fin Bien


        } catch (e) {
            log.error('Error en map', {
                value: context.value,
                error: e
            });
        }
    }

    // function map(context) {
    //     try {
    //         // ID que viene del getInputData
    //         log.debug('MAP', '--------MAP Inicio--------')
    //         const idRegistro = JSON.parse(context.value);

    //         // ! Inicio Bien
    //         log.audit('Map - idRegistro recibido', idRegistro);


    //         let coberturas = consultaCoberturaBIENFINAL(idRegistro);

    //         for (let i = 0; i < coberturas.length; i++) {
    //             let idCobertura = coberturas[i].id;
    //             let fechaFin = coberturas[i].fechaFin;


    //             log.audit('Procesando cobertura', idCobertura);
    //             if (fechaFin) {
    //                 log.audit('Fecha Fin Cobertura', fechaFin);
    //                 let fechaFinFormateada = formatDateYYYYMMDD(fechaFin);
    //                 log.audit('Fecha Fin Formateada', fechaFinFormateada);

    //                 let loginApiToken = _funcion.loginGetToken();
    //                 let params = {
    //                     opcion: "100",
    //                     datSelect: "SELECT CONVERT(VARCHAR,FECHA_FIN, 112)",
    //                     datFrom: "FROM Ventas.DBO.VEN_PRODUCTOS_INSTALADOS_VEHICULO PIV WITH(NOLOCK)",
    //                     // datWhere: `WHERE CONVERT(VARCHAR, AUT.ID_INTERNO_NS) = '${idRegistro}' `
    //                     datWhere: `WHERE PIV.ID_COBERTURA = '${idCobertura}' AND CONVERT(VARCHAR,PIV.FECHA_FIN, 112) = '${fechaFinFormateada}' `
    //                 }

    //                 let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite//General/ConsultaGeneralBD";

    //                 let headersConsulta = {
    //                     "Content-Type": "application/json",
    //                     Authorization: `Bearer ${loginApiToken}`,
    //                 };

    //                 let response = https.post({
    //                     url: urlBase,
    //                     headers: headersConsulta,
    //                     body: JSON.stringify(params),
    //                 });

    //                 log.audit("log Api ---", response)
    //                 let data = JSON.parse(response.body);

    //                 if (data?.results && data?.results.length === 0) {

    //                     log.audit('Registro no existe en API externa, creando log', idCobertura);
    //                     crearRegistroLog(idCobertura, 'EnvioCobertura');
    //                 } else {
    //                     log.audit('Registro ya existe en API externa', idCobertura);
    //                 }

    //             }
    //         }

    //         return;
    //         // ! Fin Bien


    //     } catch (e) {
    //         log.error('Error en map', {
    //             value: context.value,
    //             error: e
    //         });
    //     }
    // }

    //     function map(context) {
    //     try {
    //         // ID que viene del getInputData
    //         log.debug('MAP', '--------MAP Inicio--------')
    //         const idRegistro = JSON.parse(context.value);

    //         // ! Inicio Bien
    //         log.audit('Map - idRegistro recibido', idRegistro);


    //         let coberturas = consultaCoberturaBIENFINAL(idRegistro);

    //         for (let i = 0; i < coberturas.length; i++) {
    //             let idCobertura = coberturas[i].id;
    //             let fechaFin = coberturas[i].fechaFin;
    //             let estadoo = coberturas[i].estado;
    //             let prodcutoidv = coberturas[i]?.prodcutoid || ""

    //             if((estadoo == 2 || estadoo == "2") && prodcutoidv.length >= 1){
    //                 log.audit('AAA', idCobertura);
    //                 log.debug('estadoo CO', estadoo);
    //                 log.debug("fechaFin", fechaFin);
    //                 log.debug('prodcutoidv', typeof prodcutoidv)
    //                 log.debug('prodcutoidv',  prodcutoidv)
    //                 log.debug('prodcutoidv',  prodcutoidv.length)

    //             }

    //         }

    //         return;
    //         // ! Fin Bien


    //     } catch (e) {
    //         log.error('Error en map', {
    //             value: context.value,
    //             error: e
    //         });
    //     }
    // }


    function reduce(context) {
        try {

            return true

        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el proceso de reducción
            // log.error("Error en reduce", error);
            return
        }
    }

    function summarize(summary) {
        try {
            return true;

        } catch (error) {
            // Capturamos y registramos cualquier error que ocurra durante el resumen
            // log.error("Error en summarize", error);
        }
    }

    /**
     * Funciones Auxiliares
     */
    /*
   * Funciones Adicionales
   */
    function valorAdicionalPD(fechaInicio, fechaFin) {
        try {
            // log.debug("fechas", { fechaInicio, fechaFin });

            if (!fechaInicio || !fechaFin) {
                return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
            }

            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);

            const diferenciaAnios = fin.getFullYear() - inicio.getFullYear();
            const diferenciaMeses = diferenciaAnios * 12 + (fin.getMonth() - inicio.getMonth());
            const diferenciaTiempo = fin - inicio;
            const diferenciaDias = diferenciaTiempo / (1000 * 60 * 60 * 24);

            if (diferenciaMeses % 12 === 0 && diferenciaMeses >= 12) {
                return { id_plazo: 1, Tipo_plazo: "AÑOS", Diferencia: diferenciaMeses / 12 };
            } else if (diferenciaMeses > 0) {
                return { id_plazo: 2, Tipo_plazo: "MESES", Diferencia: diferenciaMeses };
            } else {
                return { id_plazo: 3, Tipo_plazo: "DÍAS", Diferencia: Math.floor(diferenciaDias) };
            }
        } catch (error) {
            return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
        }
    }

    function GeneralPrepararDatosParaApiInterna(record, idUsuario, accion, idCobertura) {

        try {
            switch (accion) {

                case "EnvioCobertura":
                    // log.debug("Caso Envió Cobertura", "Preparando datos para Envió Cobertura");

                    const idbien = record.getValue("custrecord_ht_co_bien");
                    const id_familia_bien = record.getValue("custrecord_ht_co_familia_prod");
                    const coberturaInicial = record.getValue("custrecord_ht_co_coberturainicial");
                    const coberturaFinal = record.getValue("custrecord_ht_co_coberturafinal");
                    const subsidiary = record.getValue("custrecord_ht_co_subsidiaria");
                    const resultado = valorAdicionalPD(coberturaInicial, coberturaFinal);

                    if (subsidiary && (subsidiary != 2 || subsidiary != "2")) {
                        return false;
                    }

                    return {
                        Id: idCobertura,
                        idbien,
                        id_familia_bien,
                        TipoPlazo: resultado.Tipo_plazo,
                        IdUsuario: idUsuario,
                        IdDocumento: 0,
                        CodDocumento: "",
                        Comentario: ""
                    };

                case "PD_Cliente":
                    // log.debug("Caso PD_Cliente", "Preparando datos para PD_Cliente");
                    break;
                case "PD_Bienes":
                    // log.debug("Caso PD_Bienes", "Preparando datos para PD_Bienes");
                    break;
                default:
                    return false; // Si no se reconoce el caso, retornar false
            }

        } catch (error) {
            // log.debug("Error al preparar datos para API interna", error);
            return false;
        }

    }

    function GeneralConsumirApiInterna(json, method, accion) {
        try {


            // log.debug("json--", json)

            let respuesta = false
            switch (accion) {


                case "EnvioCobertura":

                    if (!json) {
                        return [];
                    }

                    respuesta = coberturaController.makeApiRequest(
                        {
                            // accion: "PasoDatos",     
                            accion: "PasoDatos_N",
                            // idvehiculo: json.idbien,
                            // idgrupoproducto: json.id_familia_bien,
                            IdCobertura: json.Id
                        },
                        "customdeploy_hu_ec_rs_in_coberturas",
                        "customscript_hu_ec_rs_in_coberturas",
                        method,
                        false
                    );

                    if (respuesta && (respuesta.status == "error")) {
                        return [];
                    } else {
                        respuesta.TipoPlazo = json?.TipoPlazo || "";
                        respuesta.IdUsuario = json?.IdUsuario || 0;
                        respuesta.IdDocumento = json?.IdDocumento || 0;
                        respuesta.CodDocumento = json?.CodDocumento || "";
                        respuesta.Comentario = json?.Comentario || "";

                        return respuesta;
                    }

                case "PD_Bienes":

                    if (!json) { return []; }
                    respuesta = coberturaController.makeApiRequest(
                        {
                            opcion: "PASO_VEHICULO",
                            idvehiculo: json.idvehiculo,
                        },
                        "customdeploy_hu_ec_rs_in_bienes",
                        "customscript_hu_ec_rs_in_bienes",
                        method,
                        false
                    );

                    if (respuesta && (respuesta.status == "error")) {
                        return [];
                    } else {
                        return respuesta;
                    }

                case "PD_Cliente":
                    // log.debug("Caso PD_Cliente", "Consumir API Interna para PD_Cliente");
                    if (!json) { return []; }

                    respuesta = coberturaController.makeApiRequest(
                        {
                            opcion: "MIGRA_CLIENTE",
                            identificacion: json.identificacion,
                        },
                        "customdeploy_hu_ec_rs_in_cliente",
                        "customscript_hu_ec_rs_in_cliente",
                        method,
                        false
                    );

                    if (respuesta && (respuesta.status == "error")) {
                        return [];
                    } else {
                        return respuesta;
                    }
                default:
                    return false; // Si no se reconoce el caso, retornar false
            }
        } catch (error) {
            // log.debug("error", error)
            return []
        }
    }

    function GeneralEnviarDatosAPIExterna(data, accion, idRegistro) {
        try {
            let token;
            let headers;
            let options;
            let response;
            let temporal;

            switch (accion) {
                case "EnvioCobertura":
                    // log.debug("Caso Envió Cobertura", "Enviando datos a la API externa para Envió Cobertura");
                    if (data == []) {
                        return false;
                    }

                    token = _funcion.loginGetToken();
                    headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };

                    options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
                        headers: headers,
                        body: JSON.stringify(data),
                    };

                    // log.debug("--Opciones de la API externa--", options);
                    response = https.post(options);

                    temporal = false

                    if (response && response.body != "") {
                        temporal = JSON.parse(response.body);
                    }

                    if (temporal && temporal.statusCode === 200) {
                        // log.debug("--Respuesta de la API externa", {
                        //     idRegistro,  
                        //     temporal
                        // });

                        let respuestssss = AumentarValorCampo(idRegistro, "custrecord_impulso_log_pro_general", true, temporal)

                        // log.debug("respuestssss", respuestssss)

                        if (data?.IdCobertura) {
                            ControlRegistroEnvio(data?.IdCobertura, "T")
                        }

                        return true;
                    } else {

                        if (temporal && temporal?.result == "NO SE ENCONTRÓ BIEN CREADO") {

                            GenerarLogCambioEstado(data, data.IdBien, 'F', "PD_Bienes");
                            GenerarLogCambioEstado(data, data.IdClienteNs, 'F', "PD_Cliente");
                        }
                        // log.debug("Error en la respuesta de la API externa", response);
                        AumentarValorCampo(idRegistro, "custrecord_impulso_log_pro_general", false, temporal) // ! Solo Aumenta Impulso 

                        ControlRegistroEnvio(data?.IdCobertura, "F")


                        return false;
                    }

                case "PD_Bienes":
                    // log.debug("---A----", data)

                    // return true
                    if (data == []) {
                        return false;
                    }

                    token = _funcion.loginGetToken();
                    headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };

                    options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/VehiculoNS",
                        headers: headers,
                        body: JSON.stringify(data),
                    };

                    // log.debug("Opciones de la API externa", options);
                    response = https.post(options);
                    temporal = false

                    if (response && response.body != "") {
                        temporal = JSON.parse(response.body);
                    }

                    if (temporal && temporal.statusCode === 200) {
                        // log.debug("Respuesta de la API externa", temporal);
                        return true;
                    } else {

                        // generarLogCambioEstado(data, response);

                        // log.debug("Error en la respuesta de la API externa", response);
                        return false;
                    }
                    break;

                case "PD_Cliente":
                    // log.debug("Caso PD_Cliente", "Enviando datos a la API externa para PD_Cliente");

                    if (data == [] || data == {} || !data) {
                        return false;
                    }

                    token = _funcion.loginGetToken();
                    headers = {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    };

                    options = {
                        method: "POST",
                        url: _const.URLS.HUNTER_API_NETSUITE + "/Cliente/RegistrarCliente",
                        headers: headers,
                        body: JSON.stringify(data),
                    };

                    // log.debug("Opciones de la API externa", options);

                    response = https.post(options);

                    temporal = false

                    if (response && response.body != "") {
                        temporal = JSON.parse(response.body);
                    }

                    if (temporal && temporal.statusCode === 200) {
                        // log.debug("Respuesta de la API externa", temporal);
                        return true;
                    } else {
                        // log.debug("Error en la respuesta de la API externa", response);
                        // GenerarLogCambioEstado(data, data?.Id_ns_cliente || 0, 'F'); // Guardar el registro
                        return false;
                    }

                default:
                    // log.debug("Caso no reconocido", "No se reconoce el caso para enviar datos a la API externa");
                    return false; // Si no se reconoce el caso, retornar false
            }


        } catch (error) {
            // log.debug("error", error)
            return false;
        }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, proceso) {
        try {

            // log.debug("GenerarLogCambioEstado", { context, registroID, EstadoProcesado, proceso });
            if (!context || !registroID || !EstadoProcesado || !proceso) {
                // log.error("Error en GenerarLogCambioEstado", "Faltan parámetros necesarios");
                return;
            }
            // Verifica si el registro ya existe
            const existingSearch = search.create({
                type: 'customrecord_log_proceso_general',
                filters: [
                    ['custrecordlog_proceso_general_proceso', 'is', proceso],
                    'AND',
                    ['custrecordid_registro_proc_general', 'is', registroID],
                    'AND',
                    ["custrecord_producto_lpc", "startswith", "F"]
                ],
                columns: ['internalid']
            });

            const existingResult = existingSearch.run().getRange({ start: 0, end: 1 });

            if (existingResult.length > 0) {
                // log.debug("Registro ya existe", `El registro con ID ${registroID} y proceso ${proceso} ya existe.`);
                return; // Si el registro ya existe, no se crea uno nuevo
            } else {
                let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
                objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: proceso });
                objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
                objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
                objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
                objRecord.save();
            }

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    }

    function AumentarValorCampo(idRegistro, campo, status, respuesta) {
        try {

            // log.debug("AumentarValorCampo", { idRegistro, campo, status, respuesta });

            if (!idRegistro || !campo) return false;

            // Cargar el registro completo
            const rec = record.load({
                type: 'customrecord_log_proceso_general',
                id: idRegistro,
                isDynamic: true
            });

            // Obtener el valor actual y sumarle 1
            const valorActual = rec.getValue({ fieldId: campo }) || "0";
            let nuevoValor = (parseInt(valorActual, 10) + 1).toString();


            if (status) {
                nuevoValor = 4
                // log.debug("RRRRR", respuesta)
                rec.setValue({ fieldId: "custrecord_producto_lpc", value: "T" });
                rec.setValue({ fieldId: campo, value: 4 });
                rec.setValue({ fieldId: "custrecord_log_proceso_general_rat", value: respuesta });
            } else {
                rec.setValue({ fieldId: campo, value: nuevoValor });
                rec.setValue({ fieldId: "custrecord_log_proceso_general_raf", value: respuesta });
            }


            const idGuardado = rec.save();

            // log.debug("Campo actualizado correctamente", {
            //     id: idGuardado,
            //     campo,
            //     anterior: valorActual,
            //     nuevo: nuevoValor
            // });

            return true;
        } catch (error) {
            log.error("Error en AumentarValorCampo", error);
            return false;
        }
    }

    function ControlRegistroEnvio(idRegistro, estado) {
        try {
            // 🔍 Crear la búsqueda dinámica
            const logSearch = search.create({
                type: "customrecord_log_proceso_general",
                filters: [
                    ["custrecordlog_proceso_general_proceso", "startswith", "EnvioCobertura"], "AND",
                    ["custrecordid_registro_proc_general", "startswith", idRegistro],
                    "AND", ["custrecord_producto_lpc", "startswith", "F"]
                ],
                columns: ["id", "custrecord_producto_lpc"]
            });

            const pagedData = logSearch.runPaged({ pageSize: 1000 });
            let contador = 0;

            pagedData.pageRanges.forEach(pageRange => {
                const page = pagedData.fetch({ index: pageRange.index });
                page.data.forEach(result => {
                    let recordId = result.id;

                    // log.debug("recordId----", recordId)

                    // Actualizar el campo
                    record.submitFields({
                        type: "customrecord_log_proceso_general",
                        id: recordId,
                        values: {
                            custrecord_producto_lpc: estado
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });




                    contador++;
                });
            });

            // log.audit("Actualización completa", `Registros actualizados: ${contador}`);
        } catch (e) {
            log.error("Error al actualizar registros", e);
        }
    }

    function obtenerIdsAgrupados() {
        const searchObj = search.create({
            type: "customrecord_log_proceso_general",
            filters: [
                [
                    ['custrecordlog_proceso_general_proceso', 'startswith', 'EnvioCobertura'],
                    'AND',
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_impulso_log_pro_general', 'lessthan', '4'],
                    'AND',
                    ['custrecord_producto_lpc', 'startswith', 'F'],
                ]
            ],
            columns: [
                // 🔹 Agrupamos solo por el ID de registro general
                search.createColumn({
                    name: "custrecordid_registro_proc_general",
                    summary: search.Summary.GROUP,
                    label: "ID Registro General"
                })
            ]
        });

        const ids = [];

        // 🔹 Obtener solo los primeros 100 resultados agrupados
        const results = searchObj.run().getRange({ start: 0, end: 101 });

        for (let i = 0; i < results.length; i++) {
            const idRegistro = results[i].getValue({
                name: "custrecordid_registro_proc_general",
                summary: search.Summary.GROUP
            });
            ids.push(idRegistro);
        }

        // log.debug(`🔹 IDs agrupados encontrados (${ids.length})`, ids);
        return ids;
    }

    function obtenerDetallesPorId(idRegistro) {
        try {
            if (!idRegistro) {
                // log.error("Error", "Debe enviar un idRegistro válido");
                return null;
            }

            const searchObj = search.create({
                type: "customrecord_log_proceso_general",
                filters: [
                    ["custrecordid_registro_proc_general", "is", idRegistro],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    ['custrecordlog_proceso_general_proceso', 'startswith', 'EnvioCobertura'],
                ],
                columns: [
                    search.createColumn({ name: "id", sort: search.Sort.DESC, label: "ID" }),
                    search.createColumn({ name: "owner", label: "Propietario" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_producto_lpc", label: "Producto" }),
                    search.createColumn({ name: "custrecordlog_proceso_general_proceso", label: "Proceso" }),
                    search.createColumn({ name: "custrecordid_registro_proc_general", label: "ID Registro" }),
                    search.createColumn({ name: "custrecord_log_proceso_general_traza", label: "Traza" }),
                    search.createColumn({ name: "custrecord_impulso_log_pro_general", label: "Impulso" })
                ]
            });

            // 🔹 Obtener solo el primer resultado (ordenado por ID descendente)
            const results = searchObj.run().getRange({ start: 0, end: 1 });

            if (!results || results.length === 0) {
                // log.debug(`Sin resultados para ID ${idRegistro}`);
                return null;
            }

            const result = results[0];
            const detalle = {
                id: result.getValue("id"),
                propietario: result.getText("owner"),
                fecha: result.getValue("created"),
                producto: result.getValue("custrecord_producto_lpc"),
                proceso: result.getValue("custrecordlog_proceso_general_proceso"),
                idRegistro: result.getValue("custrecordid_registro_proc_general"),
                traza: result.getValue("custrecord_log_proceso_general_traza"),
                impulso: result.getValue("custrecord_impulso_log_pro_general")
            };

            // log.debug(`📄 Detalle único para ID ${idRegistro}`, detalle);
            return detalle;

        } catch (error) {
            log.error("Error en obtenerDetallesPorId", error);
            return null;
        }
    }

    // new 
    function crearRegistroLog(idRegistro, proceso) {
        try {

            log.audit('Creando log', {
                idRegistro: idRegistro,
                proceso: proceso
            });

            const logRecord = record.create({
                type: 'customrecord_log_proceso_general',
                isDynamic: true
            });

            // Proceso
            logRecord.setValue({
                fieldId: 'custrecordlog_proceso_general_proceso',
                value: proceso
            });

            // Impulso
            logRecord.setValue({
                fieldId: 'custrecord_impulso_log_pro_general',
                value: 0
            });

            // Producto
            logRecord.setValue({
                fieldId: 'custrecord_producto_lpc',
                value: 'F'
            });

            // ID de cobertura (ÚNICO)
            logRecord.setValue({
                fieldId: 'custrecordid_registro_proc_general',
                value: idRegistro
            });

            // Traza (mejor como JSON)
            const traza = "01"

            logRecord.setValue({
                fieldId: 'custrecord_log_proceso_general_traza',
                value: JSON.stringify(traza)
            });

            const recordId = logRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });

            log.audit('Log creado correctamente', recordId);

            return recordId;

        } catch (e) {
            log.error('Error creando registro log', {
                idRegistro: idRegistro,
                proceso: proceso,
                error: e
            });
        }
    }


    // HJKHJS
    function consultaCobertura(IdVehiculo) {
        let results = [];

        try {
            let CoberturaSearch = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["custrecord_ht_co_bien", "anyof", IdVehiculo],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                ],
            });

            let searchResult = CoberturaSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                    });
                });
            });

            return results;

        } catch (error) {
            log.debug("error", error);
            return [];
        }

    }

    function consultaCoberturaBIENFINAL(IdVehiculo) {
        let results = [];

        try {
            let CoberturaSearch = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: [
                    ["custrecord_ht_co_bien", "anyof", IdVehiculo],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                    search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
                    search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
                ],
            });

            let searchResult = CoberturaSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                        fechaFin: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                        estado: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
                        prodcutoid: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }) || ''
                    });
                });
            });

            return results;

        } catch (error) {
            log.debug("error", error);
            return [];
        }

    }

    function formatDateYYYYMMDD(fecha) {
        if (!fecha) return '';

        var partes = fecha.split('/'); // ["25", "04", "2026"]
        if (partes.length !== 3) return '';

        var dia = partes[0].padStart(2, '0');
        var mes = partes[1].padStart(2, '0');
        var anio = partes[2];

        return anio + mes + dia;
    }



    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});
