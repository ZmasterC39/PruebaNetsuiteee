/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
  'N/ui/serverWidget',
  'N/email',
  'N/runtime',
  'N/search',
  'N/redirect',
  'N/task',
  'N/log',
  'N/file',
  'N/encode',
  'N/config',
  'N/url',
  './PE_LIB_Libros.js'
], (
  ui, email, runtime, search, redirect, task, log, file, encode, config, url, libPE
) => {

  const RID = () => (Date.now() + '-' + Math.floor(Math.random() * 1e6)).toString();
  const makeLogger = (rid) => ({
    aud: (t, d) => log.audit(`[DET] ${rid} :: ${t}`, (typeof d === 'string' ? d : JSON.stringify(d))),
    dbg: (t, d) => log.debug(t, (typeof d === 'string' ? d : JSON.stringify(d))),
    err: (t, e) => log.error(`[DET] ${rid} :: ${t}`, (e && e.stack) ? (e.name + ': ' + e.message + '\n' + e.stack) : (typeof e === 'string' ? e : JSON.stringify(e)))
  });

  const safe = (v) => (v === null || v === undefined ? '' : String(v));
  const isValid = (value) => value !== null && value !== undefined && value !== '';

  // setSublistValue seguro con captura de errores
  function setLine(sublist, fieldId, line, value, L) {
    try {
      sublist.setSublistValue({ id: fieldId, line: line, value: safe(value) });
      return true;
    } catch (e) {
      L.err(`sublist-set-fail field=${fieldId} line=${line}`, e);
      return false;
    }
  }

  // Llenado seguro para la sublista de LOGS (filterPage=3)
  function fillLogsSublist({ sublist, resultSet, featureSubsidiary, L }) {
    let j = 0, count = 0;
    resultSet.each((result) => {
      const cols = resultSet.columns;
      const row = {
        id: result.getValue(cols[0]) || '--',
        user: result.getText(cols[1]) || '--',
        datecreate: result.getValue(cols[2]) || '--',
        subsidiary: featureSubsidiary ? (result.getText(cols[3]) || '--') : '',
        period: result.getText(cols[4]) || '--',
        bookreport: (result.getValue(cols[8]) || '') + ' ',
        reportname: result.getValue(cols[5]) || '--',
        status: result.getValue(cols[6]) || '--',
        fileurl: result.getValue(cols[7]) || ''
      };

      setLine(sublist, 'id', j, row.id, L);
      setLine(sublist, 'user', j, row.user, L);
      setLine(sublist, 'datecreate', j, row.datecreate, L);
      if (featureSubsidiary) setLine(sublist, 'subsidiary', j, row.subsidiary, L);
      setLine(sublist, 'period', j, row.period, L);
      setLine(sublist, 'bookreport', j, row.bookreport, L);
      setLine(sublist, 'reportname', j, row.reportname, L);
      if (row.status !== 'Generated') {
        setLine(sublist, 'link', j, row.status, L);
      } else {
        setLine(sublist, 'link', j, `<a target="_blank" download href="${row.fileurl}">Descargar</a>`, L);
      }
      j++; count++;
      return true;
    });
    return count;
  }

  // Llenado seguro de la sublista dinámica de “Registros de detracciones por realizar” (filterPage=2)
  function fillDetraccionesSublist({
    sublist, resultSet, featureSubsidiary, companyruc, companyname, L
  }) {
    const cols = resultSet.columns;
    // crear campos (columnas) una sola vez y registrar labels
    for (let i = 0; i < cols.length; i++) {
      sublist.addField({
        id: 'campo' + i,
        label: cols[i].label || ('Col ' + i),
        type: ui.FieldType.TEXT
      });
    }
    let j = 0, count = 0;
    resultSet.each((result) => {
      // Filtro lógico original (col 11 >= 0). Si falla, no agregamos línea.
      const v = Number(result.getValue(cols[11]));
      if (isNaN(v) || v < 0) { return true; }

      for (let i = 0; i < cols.length; i++) {
        let val = result.getValue(cols[i]);
        if (val === '- None -') val = '';

        // Columnas 2 y 3: ruc/razón social si no hay subsidiaries
        if (i === 2) val = (featureSubsidiary ? val : companyruc);
        if (i === 3) val = (featureSubsidiary ? val : companyname);

        setLine(sublist, 'campo' + i, j, val || '', L);
      }
      j++; count++;
      return true;
    });
    return count;
  }

  const onRequest = (context) => {
    const rid = RID();
    const L = makeLogger(rid);
    let trace = 'Init';

    try {
      L.aud('START', { method: context.request.method, params: context.request.parameters || {} });

      const method = context.request.method;
      const file_cabinet_detrac_id = libPE.callFolder();
      L.aud('Folder', file_cabinet_detrac_id);
      L.dbg('Metodo de accesos', method);

      if (method === 'GET') {
        trace = 'GET:config';
        const featureSubsidiary = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
        const cfg = config.load({ type: config.Type.COMPANY_INFORMATION });

        const companyruc = cfg.getValue('employerid');
        const companyname = cfg.getValue('legalname');

        const filterPostingPeriod = context.request.parameters.custscript_pe_period_stlt_det;
        const filterSubsidiary   = context.request.parameters.custscript_pe_subsidiary_stlt_det;
        const filterPage         = context.request.parameters.custscript_pe_page_stlt_det;

        L.aud('GET-params', { featureSubsidiary });

        if (String(filterPage) === '3') {
          trace = 'GET:page3-ui';
          const form = ui.createForm({ title: 'Archivos de Detracción Generados' });
          const sublist_reports = form.addSublist({
            id: 'customsearch_pe_generation_logs_sublist',
            type: ui.SublistType.LIST, // LIST para evitar restricciones de STATICLIST
            label: 'Log de generacion'
          });
          sublist_reports.addRefreshButton();

          sublist_reports.addField({ id: 'id', label: 'ID', type: ui.FieldType.TEXT });
          sublist_reports.addField({ id: 'user', label: 'Creado por', type: ui.FieldType.TEXT });
          sublist_reports.addField({ id: 'datecreate', label: 'Fecha de creacion', type: ui.FieldType.TEXT });
          if (featureSubsidiary) {
            sublist_reports.addField({ id: 'subsidiary', label: 'Subsidiaria', type: ui.FieldType.TEXT });
          }
          sublist_reports.addField({ id: 'period', label: 'Periodo', type: ui.FieldType.TEXT });
          sublist_reports.addField({ id: 'bookreport', label: 'Libro Contable', type: ui.FieldType.TEXT });
          sublist_reports.addField({ id: 'reportname', label: 'Reporte', type: ui.FieldType.TEXT });
          sublist_reports.addField({ id: 'link', label: 'Descargar', type: ui.FieldType.TEXT });

          trace = 'GET:page3-search';
          const mySearch = search.load({ id: 'customsearch_pe_gene_logs_detraction2' });
          const resultSetPE = mySearch.run();

          trace = 'GET:page3-fill';
          const rows = fillLogsSublist({
            sublist: sublist_reports,
            resultSet: resultSetPE,
            featureSubsidiary,
            L
          });
          L.aud('logs-count', rows);

          trace = 'GET:writepage';
          context.response.writePage(form);
          L.aud('pageX-writepage-ok', 'OK');
          L.aud('END', new Date().toISOString());
          return;

        } else {
          // Página 1 o 2
          trace = 'GET:page12-ui';
          const form = ui.createForm({ title: 'Generador Archivos de Detracción' });
          form.clientScriptModulePath = './PE_CS_Detracciones_Gen.js';

          if (featureSubsidiary) {
            const field_subsidiary = form.addField({
              id: 'custpage_subsidiary',
              type: ui.FieldType.SELECT,
              label: 'Subsidiaria'
            });

            const myFilter = search.createFilter({ name: 'country', operator: search.Operator.IS, values: 'PE' });
            const mySearchSubs = search.create({
              type: search.Type.SUBSIDIARY,
              columns: ['internalId', 'name'],
              filters: myFilter
            });

            let subsCount = 0;
            mySearchSubs.run().each((result) => {
              const subId = result.getValue({ name: 'internalId' });
              const subName = result.getValue({ name: 'name' });
              field_subsidiary.addSelectOption({ value: subId, text: subName });
              subsCount++;
              return true;
            });
            field_subsidiary.isMandatory = true;
            L.aud('subs-count', subsCount);
          }

          const field_acc_period = form.addField({
            id: 'custpage_field_acc_period',
            type: ui.FieldType.SELECT,
            source: 'accountingperiod',
            label: 'Periodo Contable'
          });
          const field_acc_bank = form.addField({
            id: 'custpage_field_acc_bank',
            type: ui.FieldType.SELECT,
            label: 'Banco'
          });
          const field_page = form.addField({
            id: 'custpage_field_page',
            type: ui.FieldType.TEXT,
            label: 'Pagina'
          });
          field_page.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

          trace = 'GET:banking-search';
          const mySearch = search.load({ id: 'customsearch_pe_accounts_banking' });
          if (String(filterPage) === '2') {
            const filters_bank = mySearch.filters;
            if (featureSubsidiary) {
              filters_bank.push(search.createFilter({
                name: 'subsidiary',
                operator: search.Operator.ANYOF,
                values: filterSubsidiary
              }));
            }
          }

          const resultSetPE = mySearch.run();
          let bankingCount = 0;
          const bankingCols = { count: mySearch.columns.length, labels: mySearch.columns.map(c => c.label) };
          L.aud('banking-cols', bankingCols);

          resultSetPE.each((result) => {
            const txtCampo01 = result.getValue(resultSetPE.columns[0]) || '--';
            const txtCampo02 = result.getValue(resultSetPE.columns[1]) || '--';
            field_acc_bank.addSelectOption({ value: txtCampo01, text: txtCampo02 });
            bankingCount++;
            return true;
          });
          L.aud('banking-count', bankingCount);

          field_acc_bank.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
          field_acc_period.layoutType = ui.FieldLayoutType.NORMAL;
          field_acc_period.isMandatory = true;

          if (String(filterPage) !== '2') {
            form.addSubmitButton({ label: 'Mostrar' });
          } else {
            form.addSubmitButton({ label: 'Pagar' });
            form.addButton({ id: 'btnCancelar', label: 'Cancelar', functionName: 'cancelarDetraccion' });

            if (featureSubsidiary) {
              form.getField({ id: 'custpage_subsidiary' })
                  .updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
            }
            field_acc_period.updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
            field_acc_bank.updateDisplayType({ displayType: ui.FieldDisplayType.NORMAL });

            if (featureSubsidiary) {
              form.getField({ id: 'custpage_subsidiary' }).defaultValue = filterSubsidiary;
            }
            field_acc_period.defaultValue = filterPostingPeriod;
            field_page.defaultValue = filterPage;

            trace = 'GET:detra-search';
            const searchLoad = search.load({ id: 'customsearch_pe_detracciones_x_pagar_nc2' });
            const filters = searchLoad.filters;
            filters.push(search.createFilter({
              name: 'postingperiod', operator: search.Operator.ANYOF, values: filterPostingPeriod
            }));
            if (featureSubsidiary) {
              filters.push(search.createFilter({
                name: 'subsidiary', operator: search.Operator.ANYOF, values: filterSubsidiary
              }));
            }

            const resultSetDet = searchLoad.run();
            trace = 'GET:detra-sublist';
            const sublist_reports = form.addSublist({
              id: '_customsearch_detracciones_sublist',
              type: ui.SublistType.LIST, // LIST para editar líneas si fuese necesario
              label: 'Registros de detracciones por realizar'
            });
            sublist_reports.addRefreshButton();

            const rowsFilled = fillDetraccionesSublist({
              sublist: sublist_reports,
              resultSet: resultSetDet,
              featureSubsidiary,
              companyruc,
              companyname,
              L
            });
            L.aud('detra-count', rowsFilled);

            // ========= Resto: generación CSV/XLS (no tocado) =========
            // (Tu lógica de CSV/XLS queda igual; solo preservo variables de tu bloque)
            // Para no alterar, replico tu bloque original con mínimas adaptaciones locales:

            // Reconstruimos cabecera y contenido para el archivo (tomando los mismos resultSet de arriba)
            let cabeceraColumnas = '';
            for (let i = 0; i < resultSetDet.columns.length; i++) {
              cabeceraColumnas += (i === 0 ? '' : ',') + (resultSetDet.columns[i].label || ('Col ' + i));
            }

            let contenidoCSV = '';
            let montoTotalSearch = 0;
            // Volvemos a recorrer para armar el CSV igual que hacías (sin tocar cálculo)
            resultSetDet.each((result) => {
              const cols = resultSetDet.columns;
              const v = Number(result.getValue(cols[11]));
              if (isNaN(v) || v < 0) { return true; }

              let linea = '';
              for (let i = 0; i < cols.length; i++) {
                let val = result.getValue(cols[i]);
                if (val === '- None -') val = '';
                if (i === 2) val = (featureSubsidiary ? val : companyruc);
                if (i === 3) val = (featureSubsidiary ? val : companyname);

                if (i === 11) {
                  const n = parseFloat(val || '0') || 0;
                  montoTotalSearch = parseFloat((montoTotalSearch + n).toFixed(2));
                }
                linea += (i === 0 ? '' : ',') + safe(val);
              }
              contenidoCSV += (linea + '\n');
              return true;
            });

            const fileFinal = file.create({
              name: 'ReporteDetracciones.csv',
              fileType: file.Type.CSV,
              contents: cabeceraColumnas + '\n' + contenidoCSV,
              encoding: file.Encoding.UTF8,
              folder: file_cabinet_detrac_id,
              isOnline: true
            });
            const fileId = fileFinal.save();
            const fileAux = file.load({ id: fileId });

            const inicioExcel =
              '<?xml version="1.0"?>' +
              '<?mso-application progid="Excel.Sheet"?>' +
              '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
              'xmlns:o="urn:schemas-microsoft-com:office:office" ' +
              'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
              'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ' +
              'xmlns:html="http://www.w3.org/TR/REC-html40">' +
              '<Worksheet ss:Name="Sheet1"><Table>' +
              '<Row>' + cabeceraColumnas.split(',').map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>' +
              contenidoCSV.trim().split('\n').map(line => {
                const cells = line.split(',').map(c => `<Cell><Data ss:Type="String">${c}</Data></Cell>`).join('');
                return `<Row>${cells}</Row>`;
              }).join('') +
              '</Table></Worksheet></Workbook>';

            const baseEncode = encode.convert({
              string: inicioExcel,
              inputEncoding: encode.Encoding.UTF_8,
              outputEncoding: encode.Encoding.BASE_64
            });
            const fileFinal2 = file.create({
              name: 'ReporteDetracciones.xls',
              fileType: file.Type.EXCEL,
              contents: baseEncode,
              folder: file_cabinet_detrac_id
            });
            const fileId2 = fileFinal2.save();
            const fileAux2 = file.load({ id: fileId2 });

            const fieldtotal = form.addField({
              id: 'custpagetotal', type: ui.FieldType.TEXT, label: 'totalDetraccion'
            });
            fieldtotal.defaultValue = String(montoTotalSearch);
            fieldtotal.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });

            const fielddescargar = form.addField({
              id: 'custpagefielddescargar', type: ui.FieldType.INLINEHTML, label: 'Descargar resumen'
            });
            fielddescargar.defaultValue =
              "<br><br><a target='_blank' href='" + fileAux.url + "'>Descargar archivo CSV</a>" +
              "<br><br><a target='_blank' href='" + fileAux2.url + "'>Descargar archivo EXCEL</a>";
          }

          trace = 'GET:writepage';
          context.response.writePage(form);
          L.aud('pageX-writepage-ok', 'OK');
          L.aud('END', new Date().toISOString());
          return;
        }
      } else {
        // ======================= POST =======================
        L.dbg('SUBSIDIARY', context.request.parameters.custpage_subsidiary);
        const filterPagePOST = context.request.parameters.custpage_field_page;
        const page2 = (filterPagePOST == '2' || filterPagePOST == 2);

        if (page2) {
          // Tareas programadas (igual que tu código)
          const t1 = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: 'customscript_pe_ss_detracc_bnacion',
            deploymentId: 'customdeploy_pe_ss_detracc_bnacion',
            params: {
              custscript_pe_ss_detracc_bnacion_sub: context.request.parameters.custpage_subsidiary,
              custscript_pe_ss_detracc_bnacion_per: context.request.parameters.custpage_field_acc_period,
              custscript_pe_ss_detracc_bnacion_file: file_cabinet_detrac_id
            }
          });
          t1.submit();

          const t3 = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: 'customscript_pe_ss_detracc_journal',
            deploymentId: 'customdeploy_pe_ss_detracc_journal',
            params: {
              custscript_pe_ss_detracc_journal_sub: context.request.parameters.custpage_subsidiary,
              custscript_pe_ss_detracc_journal_per: context.request.parameters.custpage_field_acc_period,
              custscript_pe_ss_detracc_journal_acc: context.request.parameters.custpage_field_acc_bank,
              custscript_pe_ss_detracc_journal_fol: file_cabinet_detrac_id
            }
          });
          t3.submit();

          // Redirección a página 3 (server-side)
          const params3 = {
            custscript_pe_period_stlt_det: context.request.parameters.custpage_field_acc_period,
            custscript_pe_subsidiary_stlt_det: context.request.parameters.custpage_subsidiary,
            custscript_pe_page_stlt_det: '3'
          };
          const url3 = url.resolveScript({
            scriptId: 'customscript_pe_sl_detracciones_gen',
            deploymentId: 'customdeploy_pe_sl_detracciones_gen',
            params: params3
          });
          L.aud('redirect', 'page=3');
          L.aud('redirect-url', url3);
          redirect.toSuitelet({
            scriptId: 'customscript_pe_sl_detracciones_gen',
            deploymentId: 'customdeploy_pe_sl_detracciones_gen',
            parameters: params3
          });
          L.aud('END', new Date().toISOString());
          return;
        }

        // Redirección a página 2 (server-side)
        const params2 = {
          custscript_pe_period_stlt_det: context.request.parameters.custpage_field_acc_period,
          custscript_pe_subsidiary_stlt_det: context.request.parameters.custpage_subsidiary,
          custscript_pe_page_stlt_det: '2'
        };
        const url2 = url.resolveScript({
          scriptId: 'customscript_pe_sl_detracciones_gen',
          deploymentId: 'customdeploy_pe_sl_detracciones_gen',
          params: params2
        });
        L.aud('redirect', 'page=2');
        L.aud('redirect-url', url2);
        redirect.toSuitelet({
          scriptId: 'customscript_pe_sl_detracciones_gen',
          deploymentId: 'customdeploy_pe_sl_detracciones_gen',
          parameters: params2
        });
        L.aud('END', new Date().toISOString());
        return;
      }

    } catch (error) {
      // Logging nativo detallado
      try {
        const sc = runtime.getCurrentScript();
        log.error({
          title: `Suitelet Detracciones - ERROR en ${trace}`,
          details: JSON.stringify({
            name: error.name,
            message: error.message,
            stack: (error.stack || '').toString(),
            trace,
            params: {
              GET_page: (context.request.parameters || {}).custscript_pe_page_stlt_det,
              POST_page: (context.request.parameters || {}).custpage_field_page,
              period: (context.request.parameters || {}).custscript_pe_period_stlt_det || (context.request.parameters || {}).custpage_field_acc_period,
              subsidiary: (context.request.parameters || {}).custscript_pe_subsidiary_stlt_det || (context.request.parameters || {}).custpage_subsidiary
            },
            usage: sc.getRemainingUsage()
          })
        });
      } catch (inner) {
        log.error('Suitelet Detracciones - ERROR logger falló', inner);
      }
      throw error; // que quede como Error en el request
    }
  };

  const saveJson = (contents, nombre, folderId) => {
    const fileObj = file.create({
      name: nombre,
      fileType: file.Type.JSON,
      contents: JSON.stringify(contents),
      folder: folderId,
      isOnline: false
    });
    return fileObj.save();
  };

  return { onRequest };
});
