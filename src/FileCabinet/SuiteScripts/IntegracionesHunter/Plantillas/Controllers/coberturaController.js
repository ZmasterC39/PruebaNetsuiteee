/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */

define(["N/log", "N/search", "N/record", "N/query", "N/url", "N/runtime", "N/https", "N/format",
], function (log, search, record, query, url, runtime, https, format) {

  /**
   * TODO: Funciones auxiliares.
   */
  function respuestaGlobales(opcion) {
    const responses = {
      1: {
        results: [],
        status: "ERROR",
        message: "Error al procesar la solicitud.",
      },
    };
    return responses[opcion] || null;
  }

  function createColumn(name, join = null, summary = null, label, sort) {
    const columnConfig = { name, join, summary, label };
    if (sort === "ASC") columnConfig.sort = "ASC";
    return search.createColumn(columnConfig);
  }

  function getValueOrEmpty(result, column) {
    const value = result.getValue(column);
    return value === "- None -" ? "" : value;
  }

  function getTextOrEmpty(result, column) {
    const value = result.getText(column);
    return value === "- None -" ? "" : value;
  }

  function establecerSiexisteValor(objRecord, fieldId, value) {
    if (value !== undefined && value !== null) {
      objRecord.setValue({ fieldId, value });
    }
  }

  /**
   *  TODO: Busquedas
   */
  const obtenerParametrizacionIDItem = (items, busquedaParametro) => {
    try {
      let data = [];
      let parametrosOpcionales;

      let filtro = [
        //["custrecord_ht_pp_aplicacion", "is", "T"], // Solo aplicaciones , Preguntar
        //"AND",
        ["custrecord_ht_pp_parametrizacionid", "anyof", items],
      ];

      if (busquedaParametro !== undefined) {
        parametrosOpcionales = busquedaParametro?.toString();
        filtro.push("AND", [
          "custrecord_ht_pp_parametrizacion_rela",
          "anyof",
          parametrosOpcionales.split(","),
        ]);
      }

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
        let pageData = busqueda.runPaged({ pageSize: 1000 });
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

      return data;
    } catch (error) {
      log.error("Error en obtenerParametrizacionItem", error);
      return [];
    }
  }; // Actualizar

  const obtenerItemParametrizadoPorBien = (IdOs, IdVehiculo) => {  // * OK
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
        ],
      });

      let searchResult = serviceOrderSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          let infoparametros = "";
          item = result.getValue({ name: "item" });
          infoparametros = obtenerParametrizacionIDItem(
            item,
            // [7, 2, 6, 75, 34, 36]
            // [113, 104, 118, 107, 109, 153]
            [167, 109, 188, 130, 136, 138]
          );

          results.push({
            internalidOs: result.getValue({ name: "internalid" }),
            iditem: item,
            TipoPlazo: result.getValue({ name: "custcol_ht_os_und_tiempo_cobertura" }),
            Plazo: result.getValue({ name: "custcol_ht_os_tiempo_cobertura" }),
            infoparametros: infoparametros,
            price: result.getValue({ name: "rate" }),
            displayname: result.getValue({ name: "displayname", join: "item" }),
            internalidItem: result.getValue({ name: "internalid", join: "item" }),
            type: result.getValue({ name: "type", join: "item" }),
            bien: result.getValue({ name: "custbody_ht_so_bien" }),
          });
        });
      });


      // Clasificar items
      if (results.length > 0) {
        let clasificacion = ClasificarItems(results);
        return clasificacion;
      }

      return [];
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  };

  const obtenerTodasFamiliasProducto = () => {  // * OK
    try {
      var sqlQuery = `
      SELECT DISTINCT
          SUBSTR(BUILTIN.DF(custrecord_ht_pp_parametrizacion_valor), 1, 2) AS "cccc"
      FROM
          customrecord_ht_pp_main_param_prod
      WHERE
          custrecord_ht_pp_parametrizacion_rela = '130'
      `;

      var resultSet = query.runSuiteQL({
        query: sqlQuery,
      });

      const result = resultSet
        .asMappedResults()
        .map((item) => item.cccc)
        .filter((codigo) => codigo !== null);

      //log.debug('Results', result);
      return result;

    } catch (error) {
      log.error("Error obtenerTodasFamiliasProducto", error);
      return [];
    }
  };

  const obtenerCoberturaVehiculoFamilia = (idBien, idfamilia) => {  // * OK
    try {
      let mySearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", idBien],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
          // "AND",
          // ["custrecord_ht_co_estado_cobertura", "anyof", "1", "2"] //ACTIVO o SUSPENDIDO
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
        ],
      });

      let results = [];

      let myPagedData = mySearch.runPaged();
      myPagedData.pageRanges.forEach(function (pageRange) {
        let myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          results.push({
            id: result.getValue({ name: "internalid" }),
            producto: result.getValue({ name: "custrecord_ht_co_producto" }),
            coberturaInicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturaFinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            numeroSerie: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            estadoCobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
          });
        });
      });

      return results[0];
    } catch (e) {
      log.error("Error en getCoberturaItem", e);
      return [];
    }
  };

  /**
   * TODO: Crear registro o actualizar cobertura.
   */
  const FilasCobertura = (objRecord, objetoJson, esNuevo) => { // * OK
    establecerSiexisteValor(objRecord, "custrecord_ht_co_bien", objetoJson.bien);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_propietario", objetoJson.propietario);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_producto", objetoJson.producto);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_numeroserieproducto", objetoJson.serieproducto);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_familia_prod", objetoJson.ttr);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_modelodispositivo", objetoJson.modeloDispositivo);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_unidad", objetoJson.unidadDispositivo);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_vid", objetoJson.vidDispositivo);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_estado", objetoJson.estado);
    establecerSiexisteValor(objRecord, "custrecord_ht_co_clientemonitoreo", objetoJson.clienteMonitoreo);

    if (esNuevo || objetoJson.t_PPS) {
      establecerSiexisteValor(objRecord, "custrecord_ht_co_estado_cobertura", objetoJson.estadoCobertura);
      establecerSiexisteValor(objRecord, "custrecord_ht_co_coberturainicial", objetoJson.start ? new Date(objetoJson.start) : null);
      establecerSiexisteValor(objRecord, "custrecord_ht_co_plazo", objetoJson.plazo);
      establecerSiexisteValor(objRecord, "custrecord_ht_co_coberturafinal", objetoJson.end ? new Date(objetoJson.end) : null);
    }
  };

  const FilasDetalleCobertura = (objRecord_2, objetoJson, identificacionCobertura) => { // * OK
    establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_transacciones", identificacionCobertura);
    establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_orden_servicio", objetoJson.salesorder);
    establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_orden_trabajo", objetoJson.ordentrabajo);
    establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_concepto", objetoJson.concepto);

    if (objetoJson.t_PPS) {
      establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_fecha_inicial", objetoJson.start ? new Date(objetoJson.start) : null);
      establecerSiexisteValor(objRecord_2, "custrecord_ht_ct_fecha_final", objetoJson.end ? new Date(objetoJson.end) : null);
    }
  };

  const Genera_Actualiza_Cobertura = (objetoJson) => { // * OK
    log.debug("Genera_Actualiza_Cobertura", objetoJson);
    // funcion para crear cobertura
    const HT_COBERTURA_RECORD = "customrecord_ht_co_cobertura";
    const HT_DETALLE_COBERTURA = "customrecord_ht_ct_cobertura_transaction";

    if (
      objetoJson === null ||
      objetoJson === undefined ||
      Object.keys(objetoJson).length === 0
    ) {
      return {
        CoberturaID: 0,
        DetalleCoberturaID: 0,
        Mensaje: "Verifique el dispositivo a Instalar o la Orden de Servicio",
      };
    }

    try {
      let response;
      let response_2;
      let objRecord =
        objetoJson.cobertura === 0
          ? record.create({ type: HT_COBERTURA_RECORD, isDynamic: true })
          : record.load({
            type: HT_COBERTURA_RECORD,
            id: objetoJson.cobertura,
            isDynamic: true,
          });

      try {
        FilasCobertura(objRecord, objetoJson, objetoJson.cobertura === 0);
        response = objRecord.save(); // Guarda Cobertura
      } catch (error) {
        response = parseInt(objetoJson?.cobertura || "0");
        log.error("No genero cobertura", error);
      }

      try {
        let objRecord_2 = record.create({ type: HT_DETALLE_COBERTURA, isDynamic: true });
        FilasDetalleCobertura(objRecord_2, objetoJson, response);
        response_2 = objRecord_2.save();
      } catch (error) {
        log.error("No genero detalle de cobertura", error);
        response_2 = 0;
      }
      // Guarda detalle Cobertura

      return {
        CoberturaID: response,
        DetalleCoberturaID: response_2,
        Mensaje: "Exito",
      };
    } catch (error) {
      log.error("Error_Genera_Actualiza_Cobertura", error);
      return {
        CoberturaID: parseInt(objetoJson?.cobertura || "0"),
        DetalleCoberturaID: 0,
        Mensaje: error.message,
      };
    }
  }; //!! Importante

  /**
   * TODO: Funciones.
   */
  const ClasificarItems = (data) => {  // * OK, Lo llama obtenerItemParametrizadoPorBien
    try {
      const defaultClassification = {
        etiqueta: "SINCONTEMPLAR",
        valor: "SCTR",
        familia: "SCTR-SINCONTEMPLAR",
        items: [],
      };

      const classification = [];

      data.forEach((item) => {
        const infoparametros = item.infoparametros || [];
        const ppsParam = infoparametros.find((param) => param.Param === "PPS");
        const famParam = infoparametros.find((param) => param.Param === "FAM");
        const adpParam = infoparametros.find((param) => param.Param === "ADP");
        const ttrParam = infoparametros.find((param) => param.Param === "TTR");

        const pps = ppsParam ? ppsParam.Valor : "N";
        const idpps = ppsParam ? ppsParam.ParamId : 0;
        const adp = adpParam ? adpParam.Valor : "000";
        const etiqueta = famParam
          ? famParam.Param
          : defaultClassification.etiqueta;
        const valor = famParam ? famParam.Valor : defaultClassification.valor;
        const familia = famParam
          ? famParam.ValorText
          : defaultClassification.familia;
        const idfamilia = famParam ? famParam.ParamId : 0;
        const valorTTR = ttrParam ? ttrParam.ValorId : 0;
        const valorfamilia = famParam
          ? famParam.ValorId
          : defaultClassification.familia;

        const familiaGrupo = famParam ? famParam.Valor : defaultClassification.familia;


        let group = classification.find(
          (group) => group.etiqueta === etiqueta && group.valor === valor
        );

        if (!group) {
          group = {
            etiqueta,
            valor,
            familia,
            items: [],
          };
          classification.push(group);
        }

        group.items.push({
          idbien: item.bien,
          internalidOs: item.internalidOs,
          iditem: item.iditem,
          tipoplazo: item.TipoPlazo,
          plazo: item.Plazo,
          displayname: item.displayname,
          type: item.type,
          pps,
          adp,
          idfamilia,
          idpps,
          valorTTR,
          valorfamilia,
          familiaGrupo
        });
      });

      return classification;
    } catch (error) {
      log.error("Error al clasificar los items:", error);
      return [];
    }
  };

  const CalcularCobertura = (Cantidad, UnidadTiempo, Fecha, esReverso = false) => {
    if (
      (Cantidad == 0 && UnidadTiempo == 0 && Fecha == "01/01/1900") ||
      (!Cantidad && !UnidadTiempo) || (UnidadTiempo > 3) || (UnidadTiempo < 1)
    ) {
      return {
        coberturaInicial: "01/01/1900",
        coberturaFinal: "01/01/1900",
      };
    }

    // Desglosa la fecha en día, mes y año, y crea un objeto Date con la hora 22:00:00
    let [day, month, year] = Fecha.split("/");
    let date_final = new Date(Date.UTC(year, month - 1, day, 22, 0, 0));
    const fechaInicial = new Date(date_final);

    const esBisiesto = (year) => {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    };

    try {

      if (esReverso) {
        switch (UnidadTiempo) {
          case 1: // Año
            date_final.setUTCFullYear(
              date_final.getUTCFullYear() - parseInt(Cantidad)
            );
            break;
          case 3: // Día
            date_final.setUTCDate(date_final.getUTCDate() - parseInt(Cantidad));
            break;
          default: // Mes
            date_final.setUTCMonth(date_final.getUTCMonth() - parseInt(Cantidad));
            break;
        }
      } else {
        switch (UnidadTiempo) {
          case 1: // Año
            date_final.setUTCFullYear(
              date_final.getUTCFullYear() + parseInt(Cantidad)
            );
            break;
          case 3: // Día
            date_final.setUTCDate(date_final.getUTCDate() + parseInt(Cantidad));
            break;
          default: // Mes
            date_final.setUTCMonth(date_final.getUTCMonth() + parseInt(Cantidad));
            break;
        }
      }

      // Ajustar para años bisiestos y no bisiestos
      if (
        date_final.getUTCMonth() === 1 &&
        date_final.getUTCDate() === 29 &&
        !esBisiesto(date_final.getUTCFullYear())
      ) {
        date_final.setUTCDate(28);
      }

      if (esReverso) {
        return {
          coberturaInicial: date_final.toISOString(),
          coberturaFinal: fechaInicial.toISOString()
        };
      } else {
        return {
          coberturaInicial: fechaInicial.toISOString(),
          coberturaFinal: date_final.toISOString(),
        };
      }

    } catch (e) {
      log.error("Error en CalcularCobertura", e);
      return {};
    }
  }; //!! CalcularCobertura

  // ! V2
  // const CalcularCobertura = (Cantidad, UnidadTiempo, Fecha, esReverso = false) => {
  //   try {
  //     // Validaciones iniciales
  //     if (
  //       (Cantidad == 0 && UnidadTiempo == 0 && Fecha == "01/01/1900") ||
  //       (!Cantidad && !UnidadTiempo) ||
  //       (UnidadTiempo > 3) ||
  //       (UnidadTiempo < 1)
  //     ) {
  //       return {
  //         coberturaInicial: "01/01/1900",
  //         coberturaFinal: "01/01/1900",
  //       };
  //     }

  //     // Convertir fecha string DD/MM/YYYY a formato YYYY-MM-DD para SuiteQL
  //     const [day, month, year] = Fecha.split("/");
  //     const fechaFormato = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  //     log.debug("Fecha inicial formateada", fechaFormato);

  //     // Determinar operación SQL según UnidadTiempo y dirección
  //     let sql = "";
  //     const operacion = esReverso ? "-" : "+";

  //     switch (UnidadTiempo) {
  //       case 1: // AÑOS
  //         sql = `SELECT 
  //                DATE '${fechaFormato}' AS fecha_inicial,
  //                ADD_MONTHS(DATE '${fechaFormato}', ${operacion === '+' ? Cantidad * 12 : -Cantidad * 12}) AS fecha_final
  //              FROM DUAL`;
  //         break;

  //       case 2: // MESES
  //         sql = `SELECT 
  //                DATE '${fechaFormato}' AS fecha_inicial,
  //                ADD_MONTHS(DATE '${fechaFormato}', ${operacion === '+' ? Cantidad : -Cantidad}) AS fecha_final
  //              FROM DUAL`;
  //         break;

  //       case 3: // DÍAS
  //         sql = `SELECT 
  //                DATE '${fechaFormato}' AS fecha_inicial,
  //                (DATE '${fechaFormato}' ${operacion} ${Cantidad}) AS fecha_final
  //              FROM DUAL`;
  //         break;

  //       default:
  //         throw new Error("UnidadTiempo inválida. Use 1 (años), 2 (meses), 3 (días)");
  //     }

  //     log.debug("SQL Query", sql);

  //     // Ejecutar SuiteQL
  //     const result = query.runSuiteQL({ query: sql }).asMappedResults();

  //     if (!result || result.length === 0) {
  //       throw new Error("No se obtuvo resultado del cálculo de fechas");
  //     }

  //     log.debug("Resultado SuiteQL", result[0]);

  //     // Si es reverso, invertir las fechas
  //     if (esReverso) {
  //       return {
  //         coberturaInicial: result[0]?.fecha_final,
  //         coberturaFinal: result[0]?.fecha_inicial
  //       };
  //     } else {
  //       return {
  //         coberturaInicial: result[0]?.fecha_inicial,
  //         coberturaFinal: result[0]?.fecha_final
  //       };
  //     }

  //   } catch (e) {
  //     log.error("Error en CalcularCobertura", e);
  //     return {};
  //   }
  // };


  const CompararFechas = (fecha1, fecha2) => {  // * OK
    // Verificar si alguna de las fechas es nula o indefinida
    if (!fecha1 || !fecha2) {
      return true;
    }

    // Convertir las fechas de string a objetos Date
    const partesFecha1 = fecha1.split("/");
    const partesFecha2 = fecha2.split("/");

    const date1 = new Date(
      parseInt(partesFecha1[2], 10),
      parseInt(partesFecha1[1], 10) - 1,
      parseInt(partesFecha1[0], 10)
    );
    const date2 = new Date(
      parseInt(partesFecha2[2], 10),
      parseInt(partesFecha2[1], 10) - 1,
      parseInt(partesFecha2[0], 10)
    );

    // Comparar las fechas
    return date1 < date2;
  };

  const makeApiRequest = (json, deploymentId, scriptId, method = 'POST', input = false) => {

    /**
* Realiza una solicitud a una API Restlet de NetSuite.
*
* @param {Object} json - El cuerpo de la solicitud en formato JSON.
* @param {string} deploymentId - El ID de despliegue del Restlet.
* @param {string} scriptId - El ID del script del Restlet.
* @param {string} [method='POST'] - El método HTTP a utilizar (por defecto es 'POST').
* @param {boolean} [input=false] - Si es true, devuelve la respuesta como texto; de lo contrario, la parsea como JSON.
* @returns {Object|string} - La respuesta de la API, parseada como JSON o como texto si `input` es true.
*/

    let myRestletHeaders = {
      Accept: "*/*",
      "Content-Type": "application/json",
    };

    let requestOptions = {
      deploymentId: deploymentId,
      scriptId: scriptId,
      headers: myRestletHeaders,
      method: method
    };

    // Omitir el cuerpo si el método es GET
    if (method !== 'GET') {
      requestOptions.body = JSON.stringify(json);
    }

    try {
      let myRestletResponse = https.requestRestlet(requestOptions);
      let response = myRestletResponse?.body;
      if (input) {
        return response;
      } else {
        return JSON.parse(response);
      }
    } catch (error) {
      log.error("Error en la solicitud API", error);
      return { "status": error.stack };
    }
  };

  // 16/10/2024
  const obtenerInfDebitoAutomatico = (idDebito) => {  // * OK
    try {

      if (!idDebito) { return []; }

      let sqlQuery = `
          SELECT 	p.ID, trunc(add_months(sysdate,1),'mm') + (case when custrecord_ht_dia_corte =  1 then 0 else custrecord_ht_dia_corte-1 end), val.custrecord_ht_pp_codigo, p.custrecord_ht_prom_da_codigo_item item, 		p.custrecord_ht_prom_da_cod_item_ns  item_ns
          FROM 	customrecordec_detalle_promociones_da P,
              customrecord_ht_pp_main_param_prod rel,
              CUSTOMRECORD_HT_CR_PP_VALORES val
          WHERE 	p.custrecord_ht_prom_da_cod_item_ns = rel.custrecord_ht_pp_parametrizacionid
          and 	rel.custrecord_ht_pp_parametrizacion_valor = val.id
          AND 	rel.custrecord_ht_pp_parametrizacion_rela = 130
          and		rel.isinactive = 'F'
          and		val.isinactive = 'F' 
          and   val.custrecord33 = '2'
          and 	p.ID = ${idDebito}
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
        return results[0];
      }

    } catch (error) {
      log.error("Error obtenerInfDebitoAutomatico", { error: error.message, stack: error.stack });
      return [];
    }
  };

  // Generar Seguimiento Cliente
  const GenerarSeguimientoCliente = (requestBody) => {
    try {
      log.debug("GenerarSeguimientoCliente", requestBody);

      // Validar campos obligatorios
      if (!requestBody.cliente || !requestBody.empleado || !requestBody.vehiculo) {
        throw new Error("Los campos 'cliente', 'empleado' y 'vehiculo' son obligatorios.");
      }


      if (requestBody && requestBody?.fechaContacto) {
        requestBody.fechaContacto = formatearFecha(requestBody.fechaContacto);
      }

      if (requestBody && requestBody?.fechaProximoContacto) {
        requestBody.fechaProximoContacto = formatearFecha(requestBody.fechaProximoContacto);
      }

      if (requestBody && requestBody?.fechaPromesa) {
        requestBody.fechaPromesa = formatearFecha(requestBody.fechaPromesa);
      }

      // Mapeo de campos y valores
      const campos = [
        { fieldId: 'custrecord_ht_sc_cliente', value: requestBody.cliente },
        { fieldId: 'custrecord_ht_sc_resultadogestion', value: requestBody.resultadoGestion },
        { fieldId: 'custrecord_ht_sc_cmotivo', value: requestBody.cmotivo },
        { fieldId: 'custrecord_ht_sc_empleado', value: requestBody.empleado },
        { fieldId: 'custrecord_ht_sc_estado', value: requestBody.estado },
        { fieldId: 'custrecord_ht_sc_fechacontacto', value: requestBody.fechaContacto ? new Date(requestBody.fechaContacto) : null },
        { fieldId: 'custrecord_ht_sc_fechapproximocontacto', value: requestBody.fechaProximoContacto ? new Date(requestBody.fechaProximoContacto) : null },
        { fieldId: 'custrecord_ht_sc_fechapromesa', value: requestBody.fechaPromesa ? new Date(requestBody.fechaPromesa) : null },
        { fieldId: 'custrecord_ht_sc_modocontacto', value: requestBody.modoContacto },
        { fieldId: 'custrecord_ht_sc_proximocontacto', value: requestBody.proximoContacto },
        { fieldId: 'custrecord_ht_sc_seguimiento', value: requestBody.seguimiento },
        { fieldId: 'custrecord_ht_sc_tipocliente', value: requestBody.tipoCliente },
        { fieldId: 'custrecord_ht_sc_tiposeguimiento', value: requestBody.tipoSeguimiento },
        { fieldId: 'custrecord_ht_sc_vehiculo', value: requestBody.vehiculo },
        { fieldId: 'custrecord_subsidiaria_seguimiento', value: requestBody.subsidiaria },
        { fieldId: 'custrecord_ht_telefono_alterno', value: requestBody.telefonoAlterno },
        { fieldId: 'custrecord_ht_telefono_contacto', value: requestBody.telefonoContacto }
      ];

      let registrarSeguimientoCliente = record.create({
        type: 'customrecord_ht_record_seguicliente',
        isDynamic: true
      });

      // Insertar valores solo si existen
      campos.forEach(({ fieldId, value }) => {
        if (value !== undefined && value !== null) {
          registrarSeguimientoCliente.setValue({ fieldId, value });
        }
      });

      let idSeguimientoCliente = registrarSeguimientoCliente.save();

      log.debug("idSeguimientoCliente", idSeguimientoCliente);
      return { id: idSeguimientoCliente, Mensaje: "Exito" };
    } catch (error) {
      log.debug("Error GenerarSeguimientoCliente", { error: error.message, stack: error.stack });
      return { id: 0, Mensaje: error.message };
    }
  };

  // 16/10/2024
  const formatearFecha = (fecha) => {
    try {

      log.debug('fecha', fecha);

      if (!fecha) {
        return false;
      }

      // Si la fecha es un objeto de tipo Date (en lugar de cadena), la convertimos a ISO string
      if (fecha instanceof Date) {
        fecha = fecha.toISOString();
      } else {
        // Convertir la fecha a cadena para asegurarnos de que tenga el método `includes`
        fecha = String(fecha);
      }

      let dia, mes, anio;

      // Si la fecha contiene "T", asumimos que es formato ISO y la procesamos manualmente
      if (fecha.includes('T')) {
        // Extraemos la parte de la fecha del formato ISO (yyyy-mm-ddTHH:mm:ss.sssZ)
        const partesFechaISO = fecha.split('T')[0].split('-');
        if (partesFechaISO.length !== 3) {
          throw new Error('Formato de fecha ISO inválido');
        }
        [anio, mes, dia] = partesFechaISO; // yyyy, mm, dd
      } else {
        // Caso de formato dd/mm/yyyy
        const partesFecha = fecha.split('/');
        if (partesFecha.length !== 3) {
          throw new Error('Formato de fecha dd/mm/yyyy inválido');
        }
        [dia, mes, anio] = partesFecha; // dd, mm, yyyy
      }

      // Retornar fecha en formato yyyy/mm/dd
      return `${anio}/${mes}/${dia}`;
    } catch (error) {
      // Manejo de errores
      log.error('Error al formatear la fecha', error.message);
      return null;
    }
  };

  return {
    respuestaGlobales,
    createColumn,
    getValueOrEmpty,
    getTextOrEmpty,
    establecerSiexisteValor,
    obtenerParametrizacionIDItem,
    obtenerItemParametrizadoPorBien,
    obtenerTodasFamiliasProducto,
    obtenerCoberturaVehiculoFamilia,
    Genera_Actualiza_Cobertura,
    CalcularCobertura,
    CompararFechas,
    makeApiRequest,
    obtenerInfDebitoAutomatico,
    GenerarSeguimientoCliente
  };
});
