/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
  "N/search",
  "N/record",
  "N/runtime",
  "N/log",
  "N/file",
  "N/task",
  "N/config",
  "N/render",
  "N/format"
], (search, record, runtime, log, file, task, config, render,format) => {
  /**
   * Defines the Scheduled script trigger point.
   * @param {Object} scriptContext
   * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
   * @since 2015.2
   */

  const SCRIPT_ID = "customscript_ts_ss_le_3_15";
  const DEPLOYMENT_ID = "customdeploy_ts_ss_le_3_15";
  const TIPO_SCRIPT = task.TaskType.SCHEDULED_SCRIPT;

  const execute = (scriptContext) => {
    try {
      let getCola = getPendientes();
      if (getCola.length > 0) {
        let params = getCola[0].param;
        params = JSON.parse(params);
        let idCola = getCola[0].id;
        params.parametros.idCola = idCola;
        main(params.parametros, scriptContext);
        try {
          let scriptTask = task.create({
            taskType: TIPO_SCRIPT,
            scriptId: SCRIPT_ID,
            deploymentId: DEPLOYMENT_ID,
          });
          let scriptTaskId = scriptTask.submit();
        } catch (error) {
          log.error("Error", error);
        }
      }
    } catch (error) {
      log.error("Error", error);
    }
  };
  const main = (parametros, scriptContext) => {
    try {
      /**
       * Zona de desarrollo
       */
      try {
        const featureSubsidiary = runtime.isFeatureInEffect({
          feature: "SUBSIDIARIES",
        });
        const searchId = "customsearch_pe_detalle_49_3_15"; // PE - Libro de Inventario y Balances - Estado de Situación Financiera - 3.1
        let fedIdNumb = "";
        let hasinfo = 0;

        const params = getParams(parametros);

        if (featureSubsidiary) {
          const getruc = getRUC(params.filterSubsidiary);
          fedIdNumb = getruc;
        } else {
          const employerid = getEmployerID();
          fedIdNumb = employerid;
        }

        let param_update_cola = {
          idCola: parametros.idCola,
          estado: "PROCESANDO",
        };

        var createrecord = updateCola(param_update_cola);

        var searchbook = {};
        if (params.filterFormat === "PDF") {
          searchbook = getTransactions(params);
        } else {
          searchbook = searchBook(
            params.filterSubsidiary,
            params.filterPostingPeriod,
            searchId,
            featureSubsidiary,
            params.filterAnioPeriod
          );
        }

        if (searchbook.thereisinfo == 1) {
          hasinfo = "1";
          const transactionJSON = searchbook.content;
          //const structuregbody = structureBody(searchbook.content);
          const createfile = createFile(
            params,
            fedIdNumb,
            hasinfo,
            "",
            params.filterFormat,
            transactionJSON,
            params.fileCabinetId,
            params.filterAnioPeriod
          );

          let fileAux = file.load({
            id: createfile,
          });
          param_update_cola = {
            idCola: parametros.idCola,
            estado: "FINALIZADO",
            fechaFin: new Date(),
            urlArchivo: fileAux.url,
            nombreArchivo: fileAux.name,
          };

          const statusProcess = updateCola(param_update_cola);
          log.debug({
            title: "FinalResponse",
            details: "Estado del proceso: " + statusProcess + " OK!!",
          });
        } else {
          param_update_cola = {
            idCola: parametros.idCola,
            estado: "FINALIZADO",
            fechaFin: new Date(),
            mensaje: "No hay registros",
          };

          updateCola(param_update_cola);
        }
      } catch (e) {
        log.error({ title: "ErrorInExecute", details: e });
        param_update_cola = {
          idCola: parametros.idCola,
          estado: "ERROR",
          fechaFin: new Date(),
          mensaje: e.message,
        };
        const statusProcess = updateCola(param_update_cola);
      }

      /**
       * Zona de desarrollo
       */
    } catch (error) {
      log.error("main Error", error);
      try {
        let param_update_cola = {
          idCola: parametros.idCola,
          estado: "ERROR",
          mensaje: error.message,
          fechaFin: new Date(),
        };
        updateCola(param_update_cola);
      } catch (error) {
        log.error("main param_update_cola Error", error);
      }
    }
  };

  /**
   *
   * @param {Object} params
   * Estados: (1) PENDIENTE, (2) PROCESANDO, (3) ERROR, (4) FINALIZADO
   */
  const updateCola = (params) => {
    try {
      let cola = record.load({
        type: "customrecord_ts_le_cola_ejecuciones",
        id: params.idCola,
      });

      if (params.estado) {
        cola.setValue({
          fieldId: "custrecord_ts_le_estado_ejecu",
          value: params.estado,
        });
      }
      if (params.fechaFin) {
        cola.setValue({
          fieldId: "custrecord_ts_le_cola_fecha_fin",
          value: params.fechaFin,
        });
      }
      if (params.mensaje) {
        cola.setValue({
          fieldId: "custrecord_ts_le_estado_mens",
          value: params.mensaje,
        });
      }
      if (params.urlArchivo) {
        cola.setValue({
          fieldId: "custrecord_ts_le_url_archivo",
          value: params.urlArchivo,
        });
      }
      if (params.nombreArchivo) {
        cola.setValue({
          fieldId: "custrecord_ts_le_nombre_archivo",
          value: params.nombreArchivo,
        });
      }

      cola.save();
    } catch (error) {
      log.error("updateCola Error", error);
    }
  };

  const getPendientes = () => {
    try {
      let cola = [];

      let searchCola = search.create({
        type: "customrecord_ts_le_cola_ejecuciones",
        filters: [
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ts_le_estado_ejecu", "is", "PENDIENTE"],
          "AND",
          ["custrecord_ts_le_cola_script_id", "is", SCRIPT_ID],
          "AND",
          ["custrecord_ts_le_cola_id_deploy", "is", DEPLOYMENT_ID],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ts_le_cola_fecha_inicio" }),
          search.createColumn({ name: "custrecord_ts_le_cola_param" }),
        ],
      });

      searchCola.run().each(function (result) {
        let obj = {
          id: result.getValue({ name: "internalid" }),
          fechaInicio: result.getValue({
            name: "custrecord_ts_le_cola_fecha_inicio",
          }),
          param: result.getValue({ name: "custrecord_ts_le_cola_param" }),
        };

        cola.push(obj);
        return true;
      });

      //ordenamos la cola por fecha de inicio
      cola.sort((a, b) => {
        return new Date(a.fechaInicio) - new Date(b.fechaInicio);
      });

      return cola;
    } catch (error) {
      log.error("Error", error);
    }
  };

  const getParams = (parametros) => {
    try {
      return {
        filterSubsidiary: parametros.custbody_ts_le_subsidiaria,
        filterPostingPeriod: parametros.custbody_ts_le_periodo,
        filterFormat: parametros.salida_reporte_nombre,
        fileCabinetId: parametros.salida_folder,
        filterAnioPeriod: parametros.custbody_ts_le_anio_contable,
      };
    } catch (e) {
      log.error({ title: "getParams", details: e });
    }
    //log.debug('PARAMETROS', params);
  };

  const getRUC = (filterSubsidiary) => {
    try {
      const subLookup = search.lookupFields({
        type: search.Type.SUBSIDIARY,
        id: filterSubsidiary,
        columns: ["taxidnum"],
      });
      const ruc = subLookup.taxidnum;
      return ruc;
    } catch (e) {
      log.error({ title: "getRUC", details: e });
    }
  };

  const getEmployerID = () => {
    const configpage = config.load({ type: config.Type.COMPANY_INFORMATION });
    const employeeid = configpage.getValue("employerid");
    return employeeid;
  };

  const createRecord = (
    logrecodId,
    featureSubsidiary,
    filterSubsidiary,
    filterPostingPeriod
  ) => {
    try {
      const recordlog = record.create({ type: logrecodId });
      if (featureSubsidiary) {
        recordlog.setValue({
          fieldId: "custrecord_pe_subsidiary_log",
          value: filterSubsidiary,
        });
      }
      recordlog.setValue({
        fieldId: "custrecord_pe_period_log",
        value: filterPostingPeriod,
      });
      recordlog.setValue({
        fieldId: "custrecord_pe_status_log",
        value: "Procesando...",
      });
      recordlog.setValue({
        fieldId: "custrecord_pe_report_log",
        value: "Procesando...",
      });
      recordlog.setValue({
        fieldId: "custrecord_pe_book_log",
        value: "Inventario y Balance 3.15",
      });
      const recordlogid = recordlog.save();

      return { recordlogid: recordlogid, irecord: record };
    } catch (e) {
      log.error({ title: "createRecord", details: e });
    }
  };

  const searchBook = (
    subsidiary,
    period,
    searchId,
    featureSubsidiary,
    anioperiod
  ) => {
    let json = new Array();
    var searchResult;
    let division = 0.0;
    let laps = 0.0;
    let start = 0;
    let end = 1000;
    try {
      const searchLoad = search.load({
        id: searchId,
      });

      let filters = searchLoad.filters;

      // const filterOne = search.createFilter({
      //     name: 'postingperiod',
      //     operator: search.Operator.ANYOF,
      //     values: period
      // });

      // filters.push(filterOne);

      if (featureSubsidiary) {
        const filterTwo = search.createFilter({
          name: "subsidiary",
          operator: search.Operator.ANYOF,
          values: subsidiary,
        });
        filters.push(filterTwo);
      }

      const searchResultCount = searchLoad.runPaged().count;

      if (searchResultCount != 0) {
        if (searchResultCount <= 4000) {
          searchLoad.run().each((result) => {
            let column01 = result.getValue(searchLoad.columns[0]);
            //column01 = column01.split('/');
            //const PeriodoCompleto = func(column01[0], column01[1]);
            let column02 = result.getValue(searchLoad.columns[1]);
            column02 = column02.replace(/(\r\n|\n|\r)/gm, "");
            column02 = column02.replace(/[\/\\|]/g, "");
            const column03 = result.getValue(searchLoad.columns[2]);
            let column04 = result.getValue(searchLoad.columns[3]);
            if (column04 == "- None -") {
              column04 = "";
            }
            let column05 = result.getValue(searchLoad.columns[4]);
            if (column05 == "- None -") {
              column05 = "";
            }
            let column06 = result.getValue(searchLoad.columns[5]);
            if (column06 == "- None -") {
              column06 = "";
            }
            const column07 = result.getValue(searchLoad.columns[6]);
            let column08 = result.getValue(searchLoad.columns[7]);
            column08 = column08.replace(/(\r\n|\n|\r)/gm, "");
            column08 = column08.replace(/[\/\\|]/g, "");
            if (column08 == "- None -") {
              column08 = "Sin Concepto";
            }
            let column09 = result.getValue(searchLoad.columns[8]);
            column09 = parseFloat(column09);
            if (column09 >= 0) {
              column09 = parseFloat(column09).toFixed(2);
              column09 = numberWithCommas(column09);
            } else {
              column09 = "0.00";
            }
            let column10 = result.getValue(searchLoad.columns[9]);
            column10 = parseFloat(column10);
            if (column10 >= 0) {
              column10 = parseFloat(column09).toFixed(2);
              column10 = numberWithCommas(column10);
            } else {
              column10 = "0.00";
            }
            let column11 = result.getValue(searchLoad.columns[10]);
            column11 = parseFloat(column11);
            if (column11 >= 0) {
              column11 = parseFloat(column11).toFixed(2);
              column11 = column11;
            } else {
              column11 = "0.00";
            }
            const column12 = result.getValue(searchLoad.columns[11]);
            let column13 = result.getValue(searchLoad.columns[12]);
            if (column13 == anioperiod) {
              json.push({
                c1_periodo: column01,
                c2_cuo: column02,
                c3_correlativo: column03,
                c4_tipo_compr_pago: column04,
                c5_serie_compr_pago: column05,
                c6_compr_pago: column06,
                c7_cuenta_cont: column07,
                c8_concep_de_la_operacion: column08,
                c9_saldo_final: column09,
                c10_adiciones: column10,
                c11_deducciones: column11,
                c12_estado_de_operacion: column12,
              });
            }
            return true;
          });
          return { thereisinfo: 1, content: json };
        } else {
          division = searchResultCount / 1000;
          laps = Math.round(division);
          if (division > laps) {
            laps = laps + 1;
          }
          for (let i = 1; i <= laps; i++) {
            if (i != laps) {
              searchResult = searchLoad
                .run()
                .getRange({ start: start, end: end });
            } else {
              searchResult = searchLoad
                .run()
                .getRange({ start: start, end: searchResultCount });
            }
            for (let j in searchResult) {
              let column01 = searchResult[j].getValue(searchLoad.columns[0]);
              //column01 = column01.split('/');
              //const PeriodoCompleto = func(column01[0], column01[1]);
              let column02 = searchResult[j].getValue(searchLoad.columns[1]);
              column02 = column02.replace(/(\r\n|\n|\r)/gm, "");
              column02 = column02.replace(/[\/\\|]/g, "");
              const column03 = searchResult[j].getValue(searchLoad.columns[2]);
              let column04 = searchResult[j].getValue(searchLoad.columns[3]);
              if (column04 == "- None -") {
                column04 = "";
              }
              let column05 = searchResult[j].getValue(searchLoad.columns[4]);
              if (column05 == "- None -") {
                column05 = "";
              }
              let column06 = searchResult[j].getValue(searchLoad.columns[5]);
              if (column06 == "- None -") {
                column06 = "";
              }
              const column07 = searchResult[j].getValue(searchLoad.columns[6]);
              let column08 = searchResult[j].getValue(searchLoad.columns[7]);
              column08 = column08.replace(/(\r\n|\n|\r)/gm, "");
              column08 = column08.replace(/[\/\\|]/g, "");
              if (column08 == "- None -") {
                column08 = "Sin Concepto";
              }
              let column09 = searchResult[j].getValue(searchLoad.columns[8]);
              column09 = parseFloat(column09);
              if (column09 >= 0) {
                column09 = parseFloat(column09).toFixed(2);
              } else {
                column09 = "0.00";
              }
              let column10 = searchResult[j].getValue(searchLoad.columns[9]);
              column10 = parseFloat(column10);
              if (column10 >= 0) {
                column10 = parseFloat(column09).toFixed(2);
              } else {
                column10 = "0.00";
              }
              let column11 = searchResult[j].getValue(searchLoad.columns[10]);
              column11 = parseFloat(column11);
              if (column11 >= 0) {
                column11 = parseFloat(column11).toFixed(2);
              } else {
                column11 = "0.00";
              }
              const column12 = searchResult[j].getValue(searchLoad.columns[11]);
              let column13 = searchResult[j].getValue(searchLoad.columns[12]);
              if (column13 == anioperiod) {
                json.push({
                  c1_periodo: column01,
                  c2_cuo: column02,
                  c3_correlativo: column03,
                  c4_tipo_compr_pago: column04,
                  c5_serie_compr_pago: column05,
                  c6_compr_pago: column06,
                  c7_cuenta_cont: column07,
                  c8_concep_de_la_operacion: column08,
                  c9_saldo_final: column09,
                  c10_adiciones: column10,
                  c11_deducciones: column11,
                  c12_estado_de_operacion: column12,
                });
              }
            }
            start = start + 1000;
            end = end + 1000;
          }
          return { thereisinfo: 1, content: json };
        }
      } else {
        return { thereisinfo: 0 };
      }
    } catch (e) {
      log.error({ title: "searchBook", details: e });
    }
  };

  const structureBody = (searchResult) => {
    let contentReport = "";
    try {
      for (let i in searchResult) {
        contentReport =
          contentReport +
          searchResult[i].c1_periodo +
          "|" +
          searchResult[i].c2_cuo +
          "|" +
          searchResult[i].c3_correlativo +
          "|" +
          searchResult[i].c4_tipo_compr_pago +
          "|" +
          searchResult[i].c5_serie_compr_pago +
          "|" +
          searchResult[i].c6_compr_pago +
          "|" +
          searchResult[i].c7_cuenta_cont +
          "|" +
          searchResult[i].c8_concep_de_la_operacion +
          "|" +
          searchResult[i].c9_saldo_final +
          "|" +
          searchResult[i].c10_adiciones +
          "|" +
          searchResult[i].c11_deducciones +
          "|" +
          searchResult[i].c12_estado_de_operacion +
          "|\n";
      }

      return contentReport;
    } catch (e) {
      log.error({ title: "structureBody", details: e });
    }
  };

  const createFile = (
    params,
    fedIdNumb,
    hasinfo,
    recordlogid,
    filterFormat,
    transactionJSON,
    fileCabinetId,
    filterAnioPeriod
  ) => {
    let typeformat;
    const header =
      "1 Periodo|2 CUO|3 Correlativo|4 Tipo de Documento de Identidad del tercero|5 Numero de Documento de Identidad del tercero|6 Apellidos y Nombres, Denominacion o Razon Social de terceros|" +
      "7 Fecha de emision del Comprobante de Pago o Fecha de inicio de la operacion|8 Monto de cada cuenta por cobrar del tercero|9 Indica el estado de la operacion|10 Cód. Cuenta Contable|\n";
    try {
      let periodname = filterAnioPeriod;
      //let nameReportGenerated = 'LE' + fedIdNumb + periodname + '1231031500' + '07' + '1' + hasinfo + '11_' + recordlogid;
      let nameReportGenerated =
        "LE" +
        fedIdNumb +
        periodname +
        "1231031500" +
        "07" +
        "1" +
        hasinfo +
        "11";
      let structuregbody = structureBody(transactionJSON);
      let jsonAxiliar = getJsonData(transactionJSON, params);

      if (params.filterFormat == "CSV") {
        nameReportGenerated = nameReportGenerated + ".csv";
        structuregbody = header + structuregbody;
        structuregbody = structuregbody.replace(/[,]/gi, " ");
        structuregbody = structuregbody.replace(/[|]/gi, ",");
        typeformat = file.Type.CSV;
      } else if (params.filterFormat == 'TXT') {
        nameReportGenerated = nameReportGenerated + ".txt";
        typeformat = file.Type.PLAINTEXT;
      } else if (params.filterFormat == 'PDF') {
        log.debug('jsonAxiliar YWH', jsonAxiliar);
        // Generar el contenido PDF
        var renderer = render.create();
        renderer.templateContent = getTemplate(); //==> Cargar la plantilla FTL desde el File Cabinet

        // Pasar datos al template
        log.debug('setSpecialChars(jsonAxiliar)', setSpecialChars(jsonAxiliar));
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'data',
            data: setSpecialChars(jsonAxiliar)
        });
        var pdfFile = renderer.renderAsPdf();

        // **************************************************************************************** //

        // Guardar el PDF en el File Cabinet
        pdfFile.name = nameReportGenerated + '.pdf';
        pdfFile.folder = params.fileCabinetId;
        let pdfFileId = pdfFile.save();

        let auxFile = file.load({ id: pdfFileId });
        var urlfile = auxFile.url;

        return pdfFileId;
    }
      const fileObj = file.create({
        name: nameReportGenerated,
        fileType: typeformat,
        contents: structuregbody,
        encoding: file.Encoding.UTF8,
        folder: params.fileCabinetId,
        isOnline: true,
      });
      const fileId = fileObj.save();
      return fileId;
    } catch (e) {
      log.error({ title: "createFile", details: e });
    }
  };

  const setRecord = (irecord, recordlogid, fileid, logrecodId) => {
    try {
      const fileAux = file.load({ id: fileid });
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_file_cabinet_log: fileAux.url + "&_xd=T" },
      });
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_status_log: "Generated" },
      });
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_report_log: fileAux.name },
      });
      return recordlogid;
    } catch (e) {
      log.error({ title: "setRecord", details: e });
    }
  };

  const setError = (irecord, logrecodId, recordlogid, error) => {
    try {
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_status_log: "ERROR: " + error },
      });
    } catch (e) {
      log.error({ title: "setError", details: e });
    }
  };

  const setVoid = (irecord, logrecodId, recordlogid, estado) => {
    try {
      const estado = "No hay registros";
      const report = "Proceso finalizado";
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_status_log: estado },
      });
      irecord.submitFields({
        type: logrecodId,
        id: recordlogid,
        values: { custrecord_pe_report_log: report },
      });
    } catch (e) {
      log.error({ title: "setVoid", details: e });
    }
  };

  const getPeriodName = (filterPostingPeriod) => {
    try {
      const perLookup = search.lookupFields({
        type: search.Type.ACCOUNTING_PERIOD,
        id: filterPostingPeriod,
        columns: ["periodname"],
      });
      const period = perLookup.periodname;
      return period;
    } catch (e) {
      log.error({ title: "getPeriodName", details: e });
    }
  };

  const retornaPeriodoStringForView = (campoRegistro01) => {
    if (campoRegistro01 >= "") {
      var valorAnio = campoRegistro01.split(" ")[1];
      var valorMes = campoRegistro01.split(" ")[0];
      if (valorMes.indexOf("Jan") >= 0 || valorMes.indexOf("Ene") >= 0) {
        valorMes = "01";
      } else {
        if (valorMes.indexOf("Feb") >= 0) {
          valorMes = "02";
        } else {
          if (valorMes.indexOf("Mar") >= 0) {
            valorMes = "03";
          } else {
            if (valorMes.indexOf("Abr") >= 0 || valorMes.indexOf("Apr") >= 0) {
              valorMes = "04";
            } else {
              if (valorMes.indexOf("May") >= 0) {
                valorMes = "05";
              } else {
                if (valorMes.indexOf("Jun") >= 0) {
                  valorMes = "06";
                } else {
                  if (valorMes.indexOf("Jul") >= 0) {
                    valorMes = "07";
                  } else {
                    if (
                      valorMes.indexOf("Aug") >= 0 ||
                      valorMes.indexOf("Ago") >= 0
                    ) {
                      valorMes = "08";
                    } else {
                      if (
                        valorMes.indexOf("Set") >= 0 ||
                        valorMes.indexOf("Sep") >= 0
                      ) {
                        valorMes = "09";
                      } else {
                        if (valorMes.indexOf("Oct") >= 0) {
                          valorMes = "10";
                        } else {
                          if (valorMes.indexOf("Nov") >= 0) {
                            valorMes = "11";
                          } else {
                            valorMes = "12";
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      //campoRegistro01 = valorAnio + valorMes + '30';
      var json = {
        valorAnio: valorAnio,
        valorMes: valorMes,
      };
    }
    return json;
  };

  const numberWithCommas = (x) => {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x)) x = x.replace(pattern, "$1,$2");
    return x;
  };

  const getTransactions = (params) => {
    try {
      var arrResult = [];
      var _cont = 0;
      var featSubsidiary = null;

      // FORMATO 3.15: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 49"
      var savedSearch = search.load({
        id: "customsearch_pe_libro_impreso_3_15",
      });

      if (featSubsidiary) {
        savedSearch.filters.push(
          search.createFilter({
            name: "subsidiary",
            operator: search.Operator.IS,
            values: params.filterSubsidiary,
          })
        );
      }

      var startdate = format.format({
        value: new Date(params.filterAnioPeriod, 0, 1),
        type: format.Type.DATE,
      });
      var enddate = format.format({
        value: new Date(params.filterAnioPeriod, 12, 0),
        type: format.Type.DATE,
      });

      savedSearch.filters.push(
        search.createFilter({
          name: "trandate",
          operator: search.Operator.WITHIN,
          values: [startdate, enddate],
          //values: ['01/09/2024', '29/09/2024'],
        })
      );

      var pagedData = savedSearch.runPaged({
        pageSize: 1000,
      });

      var page, columns;

      pagedData.pageRanges.forEach(function (pageRange) {
        page = pagedData.fetch({
          index: pageRange.index,
        });

        page.data.forEach(function (result) {
          columns = result.columns;
          arrAux = new Array();

          // 0. CONCEPTO
          arrAux[0] = result.getValue(columns[0]);

          // 1. NÚMERO DE  COMPROBANTE DE PAGO RELACIONADO
          arrAux[1] = result.getValue(columns[1]);

          // 2. SALDO FINAL
          arrAux[2] = result.getValue(columns[2]);

          // 2. Fecha
          arrAux[3] = result.getText(columns[3]);

          let year = arrAux[3].split(" ")[1];

          if (year == params.filterAnioPeriod) {
            // Crear el objeto resultTransactions como en la función map

            arrResult.push({
              key: _cont++,
              concepto: arrAux[0] == "- None -" ? "" : arrAux[0],
              numComprobantes: arrAux[1],
              saldoFinal: arrAux[2],
            });
          }
        });
      });

      if (arrResult.length > 0) {
        //Ordenar 2 Cód. Cuenta Contable
        arrResult.sort((a, b) => a.saldoFinal.localeCompare(b.saldoFinal));
        return { thereisinfo: 1, content: arrResult };
      }
      return { thereisinfo: 0 };
    } catch (error) {
      log.error("getTransactions()", error.message);
    }
  };

  const getJsonData = (transactions,params) => {

    try {
    let userTemp = runtime.getCurrentUser(),
      useID = userTemp.id,
      jsonTransacion = [],
      jsonTransacionvine = new Array(),
      totalAmount = 0;

    var employeeName = search.lookupFields({
      type: search.Type.EMPLOYEE,
      id: useID,
      columns: ["firstname", "lastname"],
    });
    var userName = employeeName.firstname + " " + employeeName.lastname;

    var cantidadLinea = 0;
    var montoviene = 0;
    var cantidadFor = 0;
    var cantidadAnterio = 0;
    log.debug('getJsonData', 'Parte 1');
    for (var k in transactions) {
      let IDD = transactions[k].key;
      cantidadLinea = cantidadLinea + 1;
      if (!jsonTransacion[IDD]) {
        let saldoFinal = Number(transactions[k].saldoFinal);
        jsonTransacion[IDD] = {
          number: cantidadFor,
          concepto: transactions[k].concepto.replace(/&/g, "&amp;").toLocaleUpperCase(),
          numComprobantes: transactions[k].numComprobantes,
          saldoFinal: saldoFinal,
        };
        cantidadFor = cantidadFor + 1;
        totalAmount = totalAmount + Number(transactions[k].saldoFinal);
      }
      if (cantidadLinea <= 27) {
        montoviene = Number(montoviene) + Number(transactions[k].saldoFinal);
        cantidadAnterio = cantidadLinea;
      } else {
  
        jsonTransacionvine.push({
          montoviene: formatearNumeroConComas(montoviene.toFixed(2)),
          cantidadFor: cantidadFor - 1
        });


        cantidadLinea = 0;
        cantidadLinea = cantidadLinea + 1;
        montoviene = Number(montoviene) + Number(transactions[k].saldoFinal);
      }
    }

    log.debug('getJsonData', 'Parte 2');
    

    log.debug('getJsonData', 'Parte 3');

    let jsonAxiliar = {
      company: {
        formato: 'FORMATO 3.15: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 49" - GANANCIAS DIFERIDAS"',
        ejercicio: "EJERCICIO: " + params.filterAnioPeriod,
        ruc: "RUC: " + getSubsidiaria(params.filterSubsidiary, 'ruc'),
        name: "RAZÓN SOCIAL: " + getSubsidiaria(params.filterSubsidiary, 'razonSocial').toUpperCase(),
      },
      total: {
        total: totalAmount,
      },
      movements: jsonTransacion,
      "jsonTransacionvine": jsonTransacionvine
    };

    log.debug('getJsonData', 'Parte 4');

    return jsonAxiliar;

        } catch (e) {
            log.error({ title: 'getJsonData', details: e });
        }
  };

  const getSubsidiaria = (filterSubsidiary, pOpcion) => {
    try {
        const subLookup = search.lookupFields({
            type: search.Type.SUBSIDIARY,
            id: filterSubsidiary,
            columns: ['taxidnum', 'legalname']
        });

        if (pOpcion === 'ruc') {
            return subLookup.taxidnum;
        } else if (pOpcion === 'razonSocial') {
            return subLookup.legalname;
        } else {
            return '-';
        }
    } catch (e) {
        log.error({ title: 'getSubsidiaria', details: e });
    }
};

const getTemplate = () => {
    var aux = file.load("/SuiteScripts/Evol/PE/Localizaciones/LibrosElectronicos/LibrosScripts/TS_FTL_LIBRO_ELECTRONICO_3_15.ftl");
    return aux.getContents();
};

const setSpecialChars = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/&/g, "&amp;")
                               .replace(/</g, "&lt;")
                               .replace(/>/g, "&gt;")
                               .replace(/"/g, "&quot;")
                               .replace(/'/g, "&#039;");
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (Array.isArray(obj[key])) {
                obj[key] = obj[key].map(item => setSpecialChars(item)); // Procesar cada elemento del array
            } else {
                setSpecialChars(obj[key]); // Llamada recursiva para objetos anidados
            }
        }
    }
    return obj;
};

function formatearNumeroConComas(numero) {
    // Convierte el número a una cadena
    const numeroString = numero.toString();
  
    // Divide la cadena en parte entera y parte decimal (si existe)
    const partes = numeroString.split('.');
    const parteEntera = partes[0];
    const parteDecimal = partes.length > 1 ? '.' + partes[1] : '';
  
    // Agrega comas para separar los miles en la parte entera
    const parteEnteraFormateada = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
    // Combina la parte entera formateada y la parte decimal (si existe)
    const numeroFormateado = parteEnteraFormateada + parteDecimal;
  
    return numeroFormateado;
  };

  const func = (valorAnio, valorMes) => {
    // var date = new Date();
    var ultimoDia = new Date(valorAnio, valorMes, 0).getDate();
    var PeriodoCompleto =
      String(valorAnio) + String(valorMes) + String(ultimoDia);
    return PeriodoCompleto;
  };

  return { execute };
});
