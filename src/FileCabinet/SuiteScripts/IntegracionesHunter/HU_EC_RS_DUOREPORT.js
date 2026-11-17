/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/query", "N/search", "N/log"], (query, search, log) => {
  const _post = (requestBody) => {
    let reporte = informe(requestBody);
    for (let index = 0; index < reporte.length; index++) {
      reporte[index].FECHA_FIN_COBERTURA = obtenerCobertura(
        reporte[index].BIEN_CODIGO,
        reporte[index].PRODUCTO_ID
      );
    }

    log.debug("reporte", filtrarDatos(reporte));
    return JSON.stringify(filtrarDatos(reporte));
  };

  const filtrarDatos = (datos) => {
    return datos.map((item) => ({
      SUCURSAL: item.SUCURSAL,
      EJECUTIVA_DE_GESTION: item.EJECUTIVA_DE_GESTION,
      EJECUTIVA_DE_RENOVACION: item.EJECUTIVA_DE_RENOVACION,
      EJECUTIVA_DE_REFERENCIA: item.EJECUTIVA_DE_REFERENCIA,
      ID_CLIENTE: item.ID_CLIENTE,
      CLIENTE: item.CLIENTE,
      CODIGO_VEHICULO_INTERNO: item.BIEN_CODIGO,
      CODIGO_VEHICULO: item.CODIGO_VEHICULO_SYS,
      PLACA: item.PLACA,
      MARCA: item.MARCA,
      TRANSACCION: item.TRANSACCION,
      PRODUCTO: item.PRODUCTO,
      PRECIO: item.PRECIO,
      FECHA_FIN_COBERTURA: item.FECHA_FIN_COBERTURA,
    }));
  };

  function informe(requestBody) {
    try {
      let os = search.create({
        type: "salesorder",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["memorized", "is", "F"],
          "AND",
          ["posting", "any", ""],
          "AND",
          ["voided", "is", "F"],
          "AND",
          ["subsidiary", "anyof", "2"],
          "AND",
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["customform", "noneof", "137"],
          "AND",
          ["item.internalid", "anyof", "22623", "22624"],
          "AND",
          [
            "item.type",
            "anyof",
            "Assembly",
            "Expense",
            "Group",
            "Kit",
            "OthCharge",
            "Payment",
            "SubscriPlan",
            "Markup",
            "Service",
            "Subtotal",
            "InvtPart",
            "NonInvtPart",
            "Description",
            "Discount",
          ],
          "AND",
          ["trandate", "within", requestBody.inicio, requestBody.fin],
        ],
        columns: [
          search.createColumn({ name: "location", label: "SUCURSAL" }),
          search.createColumn({
            name: "altname",
            join: "CUSTBODY_HT_OS_EJECUTIVA_BACKOFFICE",
            label: "EJECUTIVA_DE_GESTION",
          }),
          search.createColumn({
            name: "salesrep",
            label: "EJECUTIVA_DE_RENOVACION",
          }),
          search.createColumn({
            name: "altname",
            join: "CUSTBODY_HT_OS_EJECUTIVAREFERENCIA",
            label: "EJECUTIVA_DE_REFERENCIA",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{customermain.vatregnumber}",
            label: "ID_CLIENTE",
          }),
          search.createColumn({
            name: "formulatext",
            formula: "{customermain.altname}",
            label: "CLIENTE",
          }),
          search.createColumn({
            name: "internalid",
            join: "item",
            label: "ID_INTERNO_VEHICULO",
          }),
          search.createColumn({
            name: "custrecord_ht_bien_codsysh",
            join: "CUSTBODY_HT_SO_BIEN",
            label: "CODIGO_VEHICULO_SYS",
          }),
          search.createColumn({
            name: "custrecord_ht_bien_placa",
            join: "CUSTBODY_HT_SO_BIEN",
            label: "PLACA",
          }),
          search.createColumn({
            name: "custrecord_ht_bien_marca",
            join: "CUSTBODY_HT_SO_BIEN",
            label: "MARCA",
          }),
          search.createColumn({
            name: "displayname",
            join: "item",
            label: "TRANSACCION",
          }),

          search.createColumn({
            name: "netamountnotax",
            label: "PRECIO",
          }),
          search.createColumn({
            name: "custbody_ht_so_bien",
            label: "BIEN_CODIGO",
          }),
        ],
      });
      let resultSet = os.run();
      let results = resultSet.getRange({ start: 0, end: 1000 });
      let familia;
      let codProd;
      let coberFecha;
      return (transformedData = results.map((result) => {
        var rowData = {};
        os.columns.forEach((column) => {
          var value = result.getText(column) || result.getValue(column);
          let internalidVeh = result.getValue({
            name: "internalid",
            join: "item",
          });
          familia = obtenerParametrizacionItem(internalidVeh, ["FAM"]);
          codProd = familia[0].ValorId;
          rowData[column.label] = value.toString();
          if (column.label === "TRANSACCION") {
            rowData["PRODUCTO"] =
              familia.length > 0 ? familia[0].ValorText : "";
            rowData["PRODUCTO_ID"] =
              familia.length > 0 ? familia[0].ValorId : "";
          }
        });
        return rowData;
      }));
    } catch (error) {
      log.error("ERROR informe", error);
    }
  }

  const obtenerParametrizacionItem = (items, busquedaParametro) => {
    try {
      let data = [];
      for (let i = 0; i < busquedaParametro.length; i++) {
        let filtro = [
          ["custrecord_ht_pp_parametrizacionid", "is", items],
          "AND",
          [
            "custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code",
            "is",
            busquedaParametro[i],
          ],
        ];

        let busqueda = search.create({
          type: "customrecord_ht_pp_main_param_prod",
          filters: filtro,
          columns: [
            search.createColumn({
              name: "custrecord_ht_pp_parametrizacion_rela",
              label: "Param",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_parametrizacion_valor",
              label: "Valor",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_code",
              join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA",
              label: "Código",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_codigo",
              join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR",
              label: "Código",
            }),
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
      log.error("Error", { error: error.message, stack: error.stack });
      return [];
    }
  };

  const obtenerCobertura = (codVeh, codFam) => {
    let data = []; // Inicializa el arreglo donde guardarás los datos
    try {
      let busqueda = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_familia_prod", "anyof", codFam],
          "AND",
          ["custrecord_ht_co_bien", "anyof", codVeh],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_ht_co_coberturafinal",
            label: "HT CO Cobertura final",
          }),
        ],
      });

      busqueda.run().each((result) => {
        data.push(result.getValue("custrecord_ht_co_coberturafinal"));
        return true;
      });
    } catch (error) {
      log.error("Error en obtenerCobertura", {
        error: error.message,
        stack: error.stack,
      });
    }
    return data[0] || "";
  };

  return {
    post: _post,
  };
});
