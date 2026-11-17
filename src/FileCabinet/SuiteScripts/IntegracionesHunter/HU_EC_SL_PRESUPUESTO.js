/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/search", "N/ui/serverWidget", "N/log", "N/query"], (
  search,
  ui,
  log,
  query
) => {
  function onRequest(context) {
    try {
      const currentDate = new Date();
      const currentMonth = (currentDate.getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const currentYear = currentDate.getFullYear(); // Año actual
      const month =
        context.request.parameters.custpage_month_filter || currentMonth;
      const year =
        context.request.parameters.custpage_year_filter || currentYear;

      const startDate = new Date(year, month - 1, 1);

      const endDate = new Date(year, month, 0);

      const startDateStr =
        startDate.getDate().toString().padStart(2, "0") +
        "/" +
        (startDate.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        startDate.getFullYear();
      const endDateStr =
        endDate.getDate().toString().padStart(2, "0") +
        "/" +
        (endDate.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        endDate.getFullYear();

      var form = ui.createForm({
        title:
          "Resultados de facturación VS Presupuesto por oficina: " +
          startDateStr +
          " - " +
          endDateStr +
          " (BALANCE)",
      });

      // ? *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
      // ? *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
      form.clientScriptModulePath =
        "SuiteScripts/IntegracionesHunter/HU_EC_CL_PRESUPUESTO_PDF.js";

      // ? *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-
      // ? *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-

      form.addSubmitButton({
        label: "Actualizar",
      });

      // Filtro de año
      let yearSelectOption = form
        .addField({
          id: "custpage_year_filter",
          type: ui.FieldType.SELECT,
          label: "Año",
        })
        .updateBreakType({
          breakType: ui.FieldBreakType.STARTCOL,
        });

      // let inlineHtmlField = form.addField({
      //   id: "custpage_inlinehtml",
      //   type: ui.FieldType.INLINEHTML,
      //   label: "Contenido HTML",
      // });
      // .updateBreakType({
      //   breakType: ui.FieldBreakType.NONE,
      // })
      // .updateLayoutType({
      //   layoutType: ui.FieldLayoutType.NONE,
      // });

      let sqlQuery = `SELECT DISTINCT custrecord_anio_net FROM customrecord_presupuesto_netsuite`;
      let result = query.runSuiteQL({ query: sqlQuery });
      let results = result.asMappedResults();
      let yearOptions = results.map((row) => ({
        value: String(row.custrecord_anio_net),
        text: String(row.custrecord_anio_net),
      }));
      yearOptions.forEach((yearOption) => {
        yearSelectOption.addSelectOption({
          value: yearOption.value,
          text: yearOption.text,
          isSelected: yearOption.value === year, // Marcar como seleccionado si coincide
        });
      });

      var monthSelectOption = form
        .addField({
          id: "custpage_month_filter",
          type: ui.FieldType.SELECT,
          label: "Mes",
        })
        .updateBreakType({
          breakType: ui.FieldBreakType.STARTCOL,
        });

      // Agregar opciones de mes al filtro

      [
        { value: "1", text: "Enero" },
        { value: "2", text: "Febrero" },
        { value: "3", text: "Marzo" },
        { value: "4", text: "Abril" },
        { value: "5", text: "Mayo" },
        { value: "6", text: "Junio" },
        { value: "7", text: "Julio" },
        { value: "8", text: "Agosto" },
        { value: "9", text: "Septiembre" },
        { value: "10", text: "Octubre" },
        { value: "11", text: "Noviembre" },
        { value: "12", text: "Diciembre" },
      ].forEach((monthOption) => {
        monthSelectOption.addSelectOption({
          value: monthOption.value,
          text: monthOption.text,
          isSelected: monthOption.value === month,
        });
      });

      var sublist = form.addSublist({
        id: "results",
        label: "Resultados",
        type: ui.SublistType.LIST,
      });

      sublist.addField({
        id: "sucursal",
        label: "Oficina",
        type: ui.FieldType.TEXT,
      });

      sublist.addField({
        id: "factura_valor",
        label: "Facturación",
        type: ui.FieldType.CURRENCY,
      });

      sublist.addField({
        id: "presupuesto_valor",
        label: "Presupuesto",
        type: ui.FieldType.CURRENCY,
      });

      sublist.addField({
        id: "porcentaje_de_cumplimiento",
        label: "% de Cumplimiento",
        type: ui.FieldType.TEXT,
      });

      let facturacion_nacional = facturacion(startDateStr, endDateStr);
      log.debug("facturacion_nacional", facturacion_nacional);
      let presupuesto = presupuestoNetsuite(month, year);
      log.debug("presupuesto", presupuesto);

      if (facturacion_nacional.length > 0 && presupuesto.length > 0) {
        const expectedCodes = [
          "001", // Loja
          "002", // Quito
          "003", // Ambato
          "004", // Manta
          "005", // Machala
          "006", // Cuenca
          "009", // Ibarra
          "010", // Santo Domingo
          "011", // Loja
          "-1", // Sin
          "-2", // Quevedo
        ];
        const existingCodes = presupuesto.map(
          (item) => item.custpage_col_custrecord_codigo_sucursal_net
        );
        const missingCodes = expectedCodes.filter(
          (code) => !existingCodes.includes(code)
        );
        missingCodes.forEach((code) => {
          presupuesto.push({
            custpage_col_custrecord_sucursal_net: "Sin Nombre",
            custpage_col_custrecord_codigo_sucursal_net: code,
            custpage_col_custrecord_valor_net: "0.001",
          });
        });
      }
      // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*--*-*-*-*-*-*-*-*-*-*-*-*
      // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*--*-*-*-*-*-*-*-*-*-*-*-*
      // Transformar las listas
      const resultado = [];
      let totalFactura = 0;
      let totalPresupuesto = 0;

      if (facturacion_nacional.length > 0 || presupuesto.length > 0) {
        facturacion_nacional.forEach((factura) => {
          const sucursal =
            factura[
              `custpage_col_formulatext${
                Object.keys(factura)[0].match(/\d+/)[0]
              }`
            ];

          const codigoSucursal =
            factura[
              `custpage_col_formulatext${
                Object.keys(factura)[1].match(/\d+/)[0]
              }`
            ];
          const valorFactura = parseFloat(
            factura[
              `custpage_col_netamountnotax${
                Object.keys(factura)[2].match(/\d+/)[0]
              }`
            ]
          );

          const presupuesto_netsuite = presupuesto.find(
            (p) =>
              p.custpage_col_custrecord_codigo_sucursal_net === codigoSucursal
          );

          if (presupuesto_netsuite) {
            const valorPresupuesto = parseFloat(
              presupuesto_netsuite.custpage_col_custrecord_valor_net
            );

            let porcentajeCumplimiento;
            if (valorPresupuesto == 0.001) {
              porcentajeCumplimiento = Number(parseFloat("0.00"));
            } else {
              porcentajeCumplimiento = (valorFactura / valorPresupuesto) * 100;
            }

            resultado.push({
              sucursal,
              codigo_sucursal: codigoSucursal,
              factura_valor: valorFactura,
              presupuesto_valor: valorPresupuesto,
              porcentaje_de_cumplimiento: `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${porcentajeCumplimiento.toFixed(
                2
              )}&nbsp;%`,
            });

            totalFactura += valorFactura;
            totalPresupuesto += valorPresupuesto;
          }
        });

        resultado.sort(function (a, b) {
          return a.sucursal.localeCompare(b.sucursal);
        });

        // Agregar el total
        resultado.push({
          sucursal: "<b>Total</b>",
          codigo_sucursal: "000",
          factura_valor: totalFactura,
          presupuesto_valor: totalPresupuesto,
          porcentaje_de_cumplimiento: `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${
            totalPresupuesto > 0
              ? ((totalFactura / totalPresupuesto) * 100).toFixed(2)
              : 0.0
          }&nbsp;%`,
        });
      }
      // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*--*-*-*-*-*-*-*-*-*-*-*-*
      log.debug("resultado FINAL", resultado);
      // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*--*-*-*-*-*-*-*-*-*-*-*-*

      if (facturacion_nacional.length > 0 && presupuesto.length > 0) {
        resultado.forEach((result, index) => {
          sublist.setSublistValue({
            id: "sucursal",
            line: index,
            value: result.sucursal || "No disponible",
          });
          sublist.setSublistValue({
            id: "factura_valor",
            line: index,
            value: result.factura_valor || "No disponible", // Valor predeterminado si sucursal es vacío
          });
          sublist.setSublistValue({
            id: "presupuesto_valor",
            line: index,
            value: result.presupuesto_valor || "No disponible", // Valor predeterminado si sucursal es vacío
          });
          sublist.setSublistValue({
            id: "porcentaje_de_cumplimiento",
            line: index,
            value: result.porcentaje_de_cumplimiento || "No disponible", // Valor predeterminado si sucursal es vacío
          });
        });
        form.addButton({
          id: "custpage_btn_excel",
          label: "Exportar a Excel",
          functionName: "exportToExcel('" + JSON.stringify(resultado) + "')",
        });
      }

      sublist.isEditable = false;

      // Escribir el formulario en la respuesta
      context.response.writePage(form);
    } catch (error) {
      log.error("Error al procesar la solicitud", error.stack);
      context.response.write("Ocurrió un error al procesar la solicitud.");
    }
  }

  function facturacion(startDateStr, endDateStr) {
    try {
      let facturacion_nacional = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["trandate", "within", startDateStr, endDateStr],
          "AND",
          ["subsidiary", "anyof", "2"],
          "AND",
          ["posting", "is", "T"],
          "AND",
          [
            "accounttype",
            "anyof",
            "Expense",
            "Income",
            "COGS",
            "OthIncome",
            "OthExpense",
          ],
          "AND",
          ["formulatext: {account}", "startswith", "4"],
        ],
        columns: [
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula:
              "CASE WHEN {customermain.vatregnumber} = '0991259546001' OR {customermain.vatregnumber} = '1709556615' OR {customermain.vatregnumber} ='20504292968' THEN 'SIN SUCURSAL' WHEN {location} IN ('Guayaquil : GYE Vernaza', 'Guayaquil : GYE Pascuales', 'Guayaquil') THEN 'Guayaquil' ELSE {location} END",
            label: "Sucursal",
          }),
          search.createColumn({
            name: "formulatext",
            summary: "GROUP",
            formula: `
            CASE
              WHEN {customermain.vatregnumber} IN ('0991259546001', '1709556615', '20504292968') THEN '-1'
              WHEN {location} = 'Quevedo' THEN '-2'
              WHEN {location} IN ('Guayaquil : GYE Vernaza', 'Guayaquil : GYE Pascuales', 'Guayaquil') THEN '001'
              WHEN {location} = 'Quito' THEN '002'
              WHEN {location} = 'Ambato' THEN '003'
              WHEN {location} = 'Manta' THEN '004'
              WHEN {location} = 'Machala' THEN '005'
              WHEN {location} = 'Cuenca' THEN '006'
              WHEN {location} = 'Santo Domingo' THEN '010'
              WHEN {location} = 'Loja' THEN '011'
              WHEN {location} = 'Ibarra' THEN '009'
            ELSE 'Sin Código'
            END`,
            label: "Fórmula (texto)",
          }),
          search.createColumn({
            name: "netamountnotax",
            summary: "SUM",
            label: "Importe (neto de impuestos)",
          }),
        ],
      });

      let resultSet = facturacion_nacional.run();
      let results = resultSet.getRange({ start: 0, end: 100 });
      var i = 0;

      return (transformedData = results.map((result) => {
        var rowData = {};
        facturacion_nacional.columns.forEach((column) => {
          var value = result.getText(column) || result.getValue(column);
          rowData["custpage_col_" + column.name + i] = value.toString();
          i++;
        });
        return rowData;
      }));
    } catch (error) {
      log.error("error facturacion", error);
    }
  }

  // Función para realizar la búsqueda en NetSuite
  function presupuestoNetsuite(month, year) {
    try {
      var customrecord_presupuesto_netsuiteSearchObj = search.create({
        type: "customrecord_presupuesto_netsuite",
        filters: [
          ["custrecord_anio_net", "equalto", year],
          "AND",
          ["custrecord_mes_net", "equalto", month],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_sucursal_net",
            summary: "GROUP",
            label: "SUCURSAL",
          }),
          search.createColumn({
            name: "custrecord_codigo_sucursal_net",
            summary: "GROUP",
            label: "CODIGO SUCURSAL",
          }),
          search.createColumn({
            name: "custrecord_valor_net",
            summary: "SUM",
            label: "VALOR",
          }),
        ],
      });

      // Ejecutar la búsqueda
      var resultSet = customrecord_presupuesto_netsuiteSearchObj.run();
      var results = resultSet.getRange({ start: 0, end: 100 });

      // Transformar los resultados
      return (transformedData = results.map((result) => {
        var rowData = {};
        customrecord_presupuesto_netsuiteSearchObj.columns.forEach((column) => {
          var value = result.getText(column) || result.getValue(column);
          rowData["custpage_col_" + column.name] = value.toString();
        });
        return rowData;
      }));
    } catch (error) {
      log.error("error presupuestoNetsuite", error);
    }
  }

  // Retorno del objeto del Suitelet
  return {
    onRequest: onRequest,
  };
});
