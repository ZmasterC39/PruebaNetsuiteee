/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/file', 'N/compress', 'N/email', 'N/runtime', 'N/render', 'N/encode', 'N/log', 'N/url'], 
(search, file, compress ,email, runtime, render, moduloEncode, log, url) => {

    const GET_INPUT_DATA = () => {
        try {
            let currentScript     = runtime.getCurrentScript();
            let accountParam      = currentScript.getParameter({ name: 'custscript_mr_account' });
            let dateFrom          = currentScript.getParameter({ name: 'custscript_mr_date_from' });
            let dateTo            = currentScript.getParameter({ name: 'custscript_mr_date_to' });
            let clientParam       = currentScript.getParameter({ name: 'custscript_mr_client' });
            let omitirzeroParam   = currentScript.getParameter({ name: 'custscript_mr_hide_zero' });
            let usermailParam     = currentScript.getParameter({ name: 'custscript_mr_usuario_email' });
            let tipoFormato       = currentScript.getParameter({ name: 'custscript_mr_tipo_formato' }); // 'PDF' o 'EXCEL'
            // NUEVO PARÁMETRO: Libro Contable seleccionado (1 = Primario / PEN, 2 = Secundario / USD)
            let bookParam         = currentScript.getParameter({ name: 'custscript_mr_accounting_book' });
          
            log.audit({
                title: 'Parametros Input',
                details: 'accountParam: ' + accountParam + ' | dateFrom: ' + dateFrom + ' | dateTo: ' + dateTo + ' | clientParam: ' + clientParam + ' | omitirzeroParam: ' + omitirzeroParam + ' | usermailParam: ' + usermailParam + ' | tipoFormato: ' + tipoFormato + ' | bookParam: ' + bookParam
            });

            let dSearch = search.load({ id: 'customsearch_pe_cobrar_2' });
            
            // CORRECCIÓN CRÍTICA: Limpiar ordenamientos de resumen previos de la UI
            dSearch.sort = []; 
            dSearch.filters = [];

            // Evaluación de Libro Contable
            let idLibroContable = bookParam ? String(bookParam) : "1";

            dSearch.filters.push(
                search.createFilter({
                    name: 'accountingbook',
                    operator: search.Operator.IS,
                    values: [idLibroContable]
                })
            );         

            if (accountParam && accountParam.length > 0) {
                dSearch.filters.push(search.createFilter({ 
                    name: 'account', 
                    operator: search.Operator.ANYOF, 
                    values: accountParam
                }));
            }

            if (dateFrom && dateTo) {
                dSearch.filters.push(search.createFilter({ 
                    name: 'formuladate',
                    formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                    operator: search.Operator.WITHIN, 
                    values: [dateFrom, dateTo] 
                }));
            }

            dSearch.filters.push(search.createFilter({
                name: 'memo',
                join: 'transaction',
                operator: search.Operator.DOESNOTCONTAIN,
                values: ['VOID']
            }));

            dSearch.filters.push(search.createFilter({ 
                name: 'posting', 
                operator: search.Operator.IS, 
                values: ['T'] 
            }));

            if (clientParam && clientParam.length > 0) {
                dSearch.filters.push(search.createFilter({ 
                    name: 'entity', 
                    join: 'transaction',   
                    operator: search.Operator.ANYOF, 
                    values: clientParam
                }));
            }

            // REESTRUCTURACIÓN DE COLUMNAS PLANAS
            dSearch.columns = [
                search.createColumn({ name: 'account', sort: search.Sort.ASC }),
                search.createColumn({ name: 'entity', join: 'transaction', sort: search.Sort.ASC }),
                search.createColumn({ name: 'trandate', join: 'transaction', sort: search.Sort.ASC }),
                search.createColumn({ name: 'tranid', join: 'transaction' }),
                search.createColumn({ 
                    name: 'formulatext', 
                    formula: "CASE WHEN {transaction.type} = 'CustInvc' THEN 'Factura' WHEN {transaction.type} = 'Journal' THEN 'Asiento Diario' WHEN {transaction.type} = 'Payment' THEN 'Pago' WHEN {transaction.type} = 'CuCred' THEN 'Nota de Crédito' ELSE {transaction.type} END",
                    label: 'TipoTransaccionTexto'
                }),
                search.createColumn({ name: 'currency', join: 'transaction' }),
                search.createColumn({ name: 'fxamount', join: 'transaction' }), // Monto Original en Moneda de la transacción
                search.createColumn({ name: 'debitamount' }),
                search.createColumn({ name: 'creditamount' }),
                search.createColumn({ name: 'amount' }),
                search.createColumn({ name: 'memo',  join: 'transaction' }),
                search.createColumn({ name: 'internalid', join: 'transaction' }),
                search.createColumn({ name: 'subsidiary', join: 'transaction'  }),
                search.createColumn({ name: 'postingperiod', join: 'transaction' }), // 🔹 NUEVA COLUMNA PERIODO
                search.createColumn({ name: 'statusref', join: 'transaction' })      // 🔹 NUEVA COLUMNA ESTADO
            ];

            let countCheck = dSearch.runPaged().count;
            log.audit({ title: 'Verificación de Registros', details: 'Cantidad de registros encontrados: ' + countCheck });
            return dSearch;

        } catch (e) {
            log.error('Error en GET_INPUT_DATA', e);
            throw e;
        }
    };

    const MAP = (context) => {
        try {
            const searchResult = JSON.parse(context.value);
            const values = searchResult.values;

            let accountKey = values['account']?.text || values['account']?.value || 'sin-cuenta';
            
            // CORRECCIÓN DE KEY: Al usar join en columnas, NetSuite entrega la propiedad como 'transaction.entity'
            let entityObj = values['transaction.entity'] || values['entity.transaction'] || values['entity'];

            let entityId = "";
            let entityName = "sin-entidad";

            if (entityObj) {
                entityId = typeof entityObj === 'object' ? (entityObj.value || "") : entityObj;
                entityName = typeof entityObj === 'object' ? (entityObj.text || "sin-entidad") : entityObj;
            }

            entityId = String(entityId).trim();
            entityName = String(entityName).trim();

            if (!entityId || entityId === "-" || entityName === "") {
                entityName = "sin-entidad";
                entityId = "@NONE@";
            }

            // Lógica de formateo de prefijos PE para Hunter
            if (entityName !== "sin-entidad") {
                if (!/^C-PE-/.test(entityName)) {
                    if (/^PE-/.test(entityName)) {
                        entityName = "C-" + entityName;
                    } else {
                        entityName = "C-PE-" + entityName;
                    }
                }
            }

            let rawFecha = values["transaction.trandate"] || values["trandate.transaction"] || "";
            let fechaTx = typeof rawFecha === 'object' ? (rawFecha.text || rawFecha.value || "") : rawFecha;

            let currencyKey = values["transaction.currency"]?.text || values["currency.transaction"]?.text || 'PEN';
            let docNum = values["transaction.tranid"]?.text || values["transaction.tranid"] || values["tranid.transaction"] || "S/N";
            let internalIdKey = values["transaction.internalid"]?.value || values["internalid.transaction"]?.value || "";
            
            let tipoTx = "";
            let rawTipo = values["TipoTransaccionTexto"] || values["formulatext"] || values["transaction.type"];
            if (rawTipo) {
                tipoTx = typeof rawTipo === 'object' ? (rawTipo.text || rawTipo.value || "") : rawTipo;
            }
            tipoTx = tipoTx.trim();
            
            let rawMemo = values["transaction.memo"] || values["memo.transaction"] || values["memo"] || "";
            let memoField = typeof rawMemo === 'object' ? (rawMemo.text || rawMemo.value || "") : rawMemo;

            // Extraer Monto Original de la Transacción
            let rawOriginalAmt = values["transaction.fxamount"] || values["fxamount.transaction"] || values["amount"] || 0;
            let originalAmount = parseFloat(typeof rawOriginalAmt === 'object' ? rawOriginalAmt.value : rawOriginalAmt) || 0;

            // 🔹 EXTRACCIÓN DE PERIODO Y ESTADO
            let rawPeriod = values["transaction.postingperiod"] || values["postingperiod.transaction"] || "";
            let periodText = typeof rawPeriod === 'object' ? (rawPeriod.text || rawPeriod.value || "") : rawPeriod;

            let rawStatus = values["transaction.statusref"] || values["statusref.transaction"] || "";
            let statusText = typeof rawStatus === 'object' ? (rawStatus.text || rawStatus.value || "") : rawStatus;
          
            let movimientoPayload = {
                doc: docNum,
                fec: fechaTx,
                tip: tipoTx,
                mon: currencyKey,
                montoOriginal: originalAmount,
                entidad: entityName,
                entidadId: entityId,
                debitamtmn: parseFloat(values["debitamount"]) || 0,
                creditamtmn: parseFloat(values["creditamount"]) || 0, 
                amt: parseFloat(values["amount"]) || 0,
                // CORRECCIÓN: Se agrega amtUSD para que REDUCE no sume indefinidos
                amtUSD: parseFloat(values["amount"]) || 0, 
                debitamtme: parseFloat(values["debitamount"]) || 0,
                creditamtme: parseFloat(values["creditamount"]) || 0,
                mem: memoField,
                idInterno: internalIdKey,
                periodo: periodText, // 🔹 Guardado en payload
                estado: statusText   // 🔹 Guardado en payload
            };

            let customGroupingKey = accountKey.trim() + "||" + entityId + "||" + entityName;

            context.write({
                key: customGroupingKey,
                value: movimientoPayload
            });

        } catch (e) {
            log.error('Error crítico en etapa MAP', e);
        }
    };
      
    const REDUCE = (context) => {
        try {
            let keyParts = context.key.split('||');
            let cuentaContable = keyParts[0] || 'SIN_CUENTA';
            let idEntidadReal  = keyParts[1] || '@NONE@';
            let nombreEntidad  = keyParts[2] || 'OTROS';
          
            const scriptObj = runtime.getCurrentScript();
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_from' });
            const hideZeroParam = scriptObj.getParameter({ name: 'custscript_mr_hide_zero' });
            const checkFiltrar = (hideZeroParam === 'T' || hideZeroParam === true || hideZeroParam === 'true');
            const bookParam = scriptObj.getParameter({ name: 'custscript_mr_accounting_book' });

            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });

            // Identificar si la visualización será basada en el Libro Primario (Soles) o Secundario (USD)
            let isLibroPrimario = (String(bookParam) === "1");
          
            let movimientos = [];
            let totalAmt = 0;

            context.values.forEach((val) => {
                let row = JSON.parse(val);
                movimientos.push(row);
                totalAmt += (isLibroPrimario ? row.amt : row.amtUSD);
            });

            // 1. ORDENAMIENTO INTERNO: Los movimientos de ESTE cliente específicos van por Fecha
            movimientos.sort((a, b) => {
                if (!a.fec || a.fec === "") return 1;
                if (!b.fec || b.fec === "") return -1;
                let dateA = a.fec.split('/');
                let dateB = b.fec.split('/');
                if(dateA.length < 3 || dateB.length < 3) return 0;
                return new Date(dateA[2], dateA[1] - 1, dateA[0]) - new Date(dateB[2], dateB[1] - 1, dateB[0]);
            });

            if (checkFiltrar && Math.abs(parseFloat(totalAmt.toFixed(2))) === 0) {
                return;
            }
          
            let sCliIni = 0;

            if (dateFrom) {
               try {
                   let filterExpression = [
                       ['posting', 'is', 'T'],
                       'AND',
                       ['account', 'anyof', obtenerIdCuentaFiltro(cuentaContable)]
                   ];

                   if (idEntidadReal === '@NONE@' || idEntidadReal === 'sin-entidad' || idEntidadReal === "") {
                      filterExpression.push('AND', ['transaction.entity', 'anyof', '@NONE@']);
                   } else {
                      filterExpression.push('AND', ['transaction.entity', 'anyof', idEntidadReal]);
                   }

                   filterExpression.push('AND', ['accountingbook', 'anyof', isLibroPrimario ? '1' : '2']);

                   let formulaDateStr = "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')";

                   filterExpression.push('AND', [
                       'formuladate:' + formulaDateStr, 
                       search.Operator.BEFORE, 
                       dateFrom
                   ]);

                   let saldoBusqueda = search.create({
                       type: 'accountingtransaction',
                       filters: filterExpression,
                       columns: [search.createColumn({ name: 'amount', summary: search.Summary.SUM })]
                   });

                   saldoBusqueda.run().each(res => {
                       sCliIni = parseFloat(res.getValue(saldoBusqueda.columns[0])) || 0;
                       return false;
                   });

                   // 🔹 AGREGAR AQUÍ: Audit Log para validar Saldo Inicial
                   if (sCliIni > 0) {
                      log.audit({
                          title: 'VALIDACION_SALDO_INICIAL',
                          details: 'Entidad ID: ' + idEntidadReal + ' | Saldo Inicial (sCliIni): ' + sCliIni
                      });
                    }
                 
                } catch (errSaldo) {
                    log.error({ title: 'Error al calcular saldo inicial en REDUCE', details: errSaldo });
                }
            }

            let xmlBloque = '';
            let mCliDebit = 0, mCliCredit = 0;
            let mSaldo = sCliIni;
            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';

            xmlBloque += '<table style="margin-top:5px;table-layout:fixed;width:100%;">';
            xmlBloque += '<tr class="cli"><td width="92%">' + esc(nombreEntidad) + '</td><td width="8%" align="right">' + formatNumberPE(sCliIni) + '</td></tr>';
            xmlBloque += '</table>';
            
            xmlBloque += '<table style="margin-top:5px;table-layout:fixed;width:100%;"><thead><tr>';
            xmlBloque += '<th width="7%" align="center">Fecha</th>';
            xmlBloque += '<th width="6%" align="center">Período</th>'; // Nueva columna
            xmlBloque += '<th width="9%" align="center">Tipo</th>';
            xmlBloque += '<th width="14%" align="center">Documento</th>';
            xmlBloque += '<th width="8%" align="center">Estado</th>';  // Nueva columna
            xmlBloque += '<th width="18%" align="center">Glosa</th>';
            xmlBloque += '<th width="6%" align="center">Mon.</th>';
            xmlBloque += '<th width="8%" align="center">Monto Orig.</th>';
            xmlBloque += '<th width="8%" align="center">Debito (' + labelMonedaBook + ')</th>';
            xmlBloque += '<th width="8%" align="center">Credito (' + labelMonedaBook + ')</th>';
            xmlBloque += '<th width="8%" align="center">Saldo (' + labelMonedaBook + ')</th></tr></thead><tbody>';

            movimientos.forEach(m => {
                let deb = isLibroPrimario ? m.debitamtmn : m.debitamtme;
                let cred = isLibroPrimario ? m.creditamtmn : m.creditamtme;
                let amtRow = isLibroPrimario ? m.amt : m.amtUSD;

                mCliDebit += deb; 
                mCliCredit += cred;
                mSaldo += amtRow;

                // 🔹 Recorte de glosa para ahorrar memoria e imposición de clases CSS en lugar de style=""
                let glosaLimpia = esc(m.mem || '');
                if (glosaLimpia.length > 40) glosaLimpia = glosaLimpia.substring(0, 37) + '...';

                // 🔹 Recorte de glosa para ahorrar memoria e imposición de clases CSS en lugar de style=""
                let TipoTrxLimpia = esc(m.tip || '');
                if (TipoTrxLimpia.length > 10) TipoTrxLimpia = TipoTrxLimpia.substring(0, 10) + '...';


                xmlBloque += '<tr>';
                xmlBloque += '<td align="center">' + esc(m.fec) + '</td>';
                xmlBloque += '<td align="center">' + esc(m.periodo) + '</td>'; // 🔹 Período
                xmlBloque += '<td>' + esc(TipoTrxLimpia) + '</td>';

                let linkTransaccion = 'https://' + domain + '/app/accounting/transactions/transaction.nl?id=' + m.idInterno;
                xmlBloque += '<td><a href="' + esc(linkTransaccion) + '" style="color: #1a5276; text-decoration: underline;">' + esc(m.doc) + '</a></td>';

                xmlBloque += '<td>' + esc(m.estado) + '</td>'; // 🔹 Estado
                xmlBloque += '<td>' + esc(glosaLimpia) + '</td>';

                // 🔹 1. Convertimos la moneda a la abreviatura de 3 letras (PEN / USD)
                let rawMoneda = String(m.mon || '').toLowerCase();
                let labelMonedaCelda = 'USD'; // Valor por defecto

                if (rawMoneda.includes('sol')) {
                    labelMonedaCelda = 'PEN';
                } else if (rawMoneda.includes('dollar') || rawMoneda.includes('usd')) {
                    labelMonedaCelda = 'USD';
                }                
                xmlBloque += '<td align="center">' + esc(labelMonedaCelda) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(m.montoOriginal) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(deb) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(cred) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(mSaldo) + '</td>';
                xmlBloque += '</tr>';
            });

            xmlBloque += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="8" align="right">TOTAL CLIENTE (' + labelMonedaBook + ')</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(mCliDebit) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(mCliCredit) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(totalAmt) + '</td></tr>';
            xmlBloque += '</tbody></table>';

            context.write({
                key: cuentaContable,
                value: {
                    clienteNombre: nombreEntidad, // <-- Agregado para poder ordenar en summarize
                    xml: xmlBloque,
                    netoAmt: totalAmt,
                    // Enviamos los datos crudos para que el Excel no requiera parsear HTML
                    movimientosDetalle: movimientos,
                    saldoInicialCalculado: sCliIni,
                    isLibroPrimario: isLibroPrimario
                }
            });

        } catch (e) {
            log.error('Error en REDUCE para clave ' + context.key, e);
        }
    };

    const SUMMARIZE = (summary) => {
        try {
            // Recuperar parámetros pasados al script desde el script deployment o parámetros de la suitelet
            const scriptObj = runtime.getCurrentScript();
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_from' }); // Cambiar por el ID real de tu parámetro
            const accountSelected = scriptObj.getParameter({ name: 'custscript_mr_account' });
            const dateTo = scriptObj.getParameter({ name: 'custscript_mr_date_to' }); 
            const clientParam = scriptObj.getParameter({ name: 'custscript_mr_client' });
            const bookParam = scriptObj.getParameter({ name: 'custscript_mr_accounting_book' });
          
            // Declaración robusta con fallback explícito a PDF
            let tipoFormato = 'PDF';
            try {
                let paramFormato = scriptObj.getParameter({ name: 'custscript_mr_tipo_formato' });
                if (paramFormato) {
                    tipoFormato = String(paramFormato).toUpperCase().trim();
                }
            } catch (paramErr) {
                log.error('Error leyendo parámetro custscript_mr_tipo_formato, usando PDF por defecto', paramErr);
            }

            log.audit({
                title: 'Summarize - Formato a generar',
                details: 'tipoFormato detectado: ' + tipoFormato
            });
            
            let params = {
                custpage_date_from: dateFrom,
                custpage_account: accountSelected,
                dateTo: dateTo,         // <--- Ahora ya existe y no dará ReferenceError
                clientParam: clientParam,
                bookParam: bookParam
            };

            log.audit('Parámetros mapeados en summarize', params);
          
            // Invocación de la función helper
            let [saldosGlobales] = obtenerSaldosPorCuenta(params);

            let dataPorCuenta = {};
            summary.output.iterator().each((key, value) => {
                let item = JSON.parse(value);
                if (!dataPorCuenta[key]) {
                    dataPorCuenta[key] = { clientesBloques: [], totalMovimientoCuenta: 0 };
                }
                dataPorCuenta[key].clientesBloques.push(item);
                dataPorCuenta[key].totalMovimientoCuenta += item.netoAmt;
                return true;
            });

            // Bifurcación del formato de salida utilizando la variable blindada
            if (tipoFormato === 'EXCEL') {
                log.audit('Summarize', 'Iniciando generación de EXCEL...');
                generarExcel(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam);
            } else {
                log.audit('Summarize', 'Iniciando generación de PDF...');
                generarPDF(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam);
            }

        } catch (e) {
            log.error('Error en SUMMARIZE consolidación', e);
        }
    };

    // ==========================================
    // SECCIÓN GENERACIÓN EXCEL (HTML COMPATIBLE)
    // ==========================================
    function generarExcel(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam) {
        let xlsString = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        xlsString += '<head><meta charset="UTF-8"/><style>';
        xlsString += 'table { border-collapse:collapse; font-family:sans-serif; font-size:9pt; }';
        xlsString += '.title { font-size:14pt; font-weight:bold; text-align:center; }';
        xlsString += '.header-cta { background-color:#1a252f; color:white; font-weight:bold; }';
        xlsString += '.header-cli { background-color:#d5dbdb; font-weight:bold; }';
        xlsString += '.th-sub { background-color:#566573; color:white; font-weight:bold; text-align:center; }';
        xlsString += '.num { mso-number-format:"#,##0.00"; text-align:right; }';
        xlsString += '.total-row { background-color:#ebf5fb; font-weight:bold; }';
        xlsString += '.final-row { background-color:#d5f5e3; font-weight:bold; }';
        xlsString += '</style></head><body>';

        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";

        xlsString += '<table><tr><td colspan="11" class="title">REPORTE DETALLADO DE CUENTAS POR COBRAR</td></tr>';
        xlsString += '<tr><td colspan="11" style="text-align:center;">Rango: ' + dateFrom + ' al ' + dateTo + '<br/>Libro Contable: ' + esc(nombreLibro) +'</td></tr></table><br/>';

        let totalCuentas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentas++;
            let isLibroPrimario = (String(bookParam) === "1");
            //let saldoInicialCuenta = isLibroPrimario ? (parseFloat(saldosGlobalesMN[cKey]) || 0) : (parseFloat(saldosGlobalesME[cKey]) || 0);
            let saldoInicialCuenta = parseFloat(saldosGlobales[cKey]) || 0;
            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';

            xlsString += '<table border="1">';
            xlsString += '<tr class="cta"><td colspan="8">CUENTA: ' + esc(cKey) + '</td><td colspan="2" align="right">SALDO INICIAL(' + labelMonedaBook + '):</td><td class="num">' + saldoInicialCuenta + '</td></tr>';

            // Ordenamiento Alfabético de Clientes
            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                return (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
            });

            dataPorCuenta[cKey].clientesBloques.forEach(bloque => {
                xlsString += '<tr class="cli"><td colspan="11">' + esc(bloque.clienteNombre) + '</td></tr>';
                xlsString += '<tr>';
                xlsString += '<th class="th-sub">Fecha</th><th class="th-sub">Periodo</th><th class="th-sub">Tipo</th><th class="th-sub">Documento</th><th class="th-sub">Estado</th><th class="th-sub">Glosa</th>';
                xlsString += '<th class="th-sub">Moneda</th><th class="th-sub">Monto Orig.</th>';
                xlsString += '<th class="th-sub">Debito (' + labelMonedaBook + ')</th><th class="th-sub">Credito (' + labelMonedaBook + ')</th>';
                xlsString += '<th class="th-sub">Saldo (' + labelMonedaBook + ')</th></tr>';

                let runningSaldo = bloque.saldoInicialCalculado;
                let tDeb = 0, tCred = 0;

                bloque.movimientosDetalle.forEach(m => {
                    let deb = isLibroPrimario ? m.debitamtmn : m.debitamtme;
                    let cred = isLibroPrimario ? m.creditamtmn : m.creditamtme;
                    let amtRow = isLibroPrimario ? m.amt : m.amtUSD;
                    let rawMoneda = String(m.mon || '').toLowerCase();
                    let labelMoneda = 'USD'; // Valor por defecto

                    if (rawMoneda.includes('sol')) {
                        labelMoneda = 'PEN';
                    } else if (rawMoneda.includes('dollar')) {
                        labelMoneda = 'USD';
                    }

                    runningSaldo += amtRow;
                    tDeb += deb; 
                    tCred += cred;

                    xlsString += '<tr>';
                    xlsString += '<td align="center">' + esc(m.fec) + '</td>';
                    xlsString += '<td align="center">' + esc(m.periodo) + '</td>';
                    xlsString += '<td>' + esc(m.tip) + '</td>';
                    xlsString += '<td>' + esc(m.doc) + '</td>';
                    xlsString += '<td align="center">' + esc(m.estado) + '</td>';
                    xlsString += '<td>' + esc(m.mem) + '</td>';
                    xlsString += '<td align="center">' + esc(labelMoneda) + '</td>';
                    xlsString += '<td class="num">' + m.montoOriginal + '</td>';
                    xlsString += '<td class="num">' + deb + '</td>';
                    xlsString += '<td class="num">' + cred + '</td>';
                    xlsString += '<td class="num">' + runningSaldo + '</td>';
                    xlsString += '</tr>';
                });

                // Total del Cliente
                xlsString += '<tr class="total-row"><td colspan="8" align="right">TOTAL CLIENTE (' + labelMonedaBook + ')</td>';
                xlsString += '<td class="num">' + tDeb + '</td><td class="num">' + tCred + '</td>';
                xlsString += '<td class="num">' + bloque.netoAmt + '</td></tr>';
            });

            // Resumen Final de la Cuenta
            let saldoFinalCuenta = saldoInicialCuenta + dataPorCuenta[cKey].totalMovimientoCuenta;
            xlsString += '<tr class="final-row"><td colspan="10" align="right">TOTAL MOVIMIENTOS CUENTA (' + labelMonedaBook + '):</td><td class="num">' + dataPorCuenta[cKey].totalMovimientoCuenta + '</td></tr>';
            xlsString += '<tr class="final-row"><td colspan="10" align="right">SALDO FINAL CUENTA (' + labelMonedaBook + '):</td><td class="num">' + saldoFinalCuenta + '</td></tr>';
            xlsString += '</table><br/>';
        }

        if (totalCuentas === 0) {
            xlsString += '<p>No se encontraron movimientos.</p>';
        }

        xlsString += '</body></html>';
      
        //let base64Xls = moduloEncode.convert({ string: xlsString, inputEncoding: moduloEncode.Encoding.UTF_8, outputEncoding: moduloEncode.Encoding.BASE_64 });
        
        let excelFileName = 'Reporte_Detallado_CxC_' + new Date().getTime() + '.xls';
      
        let excelFileObj = file.create({
            name: excelFileName,
            fileType: file.Type.PLAINTEXT,
            contents: xlsString,
            folder: 405143
        });

        let fileId = excelFileObj.save();

        // 🔹 OPTIMIZACIÓN 2: Liberar memoria del String HTML de inmediato
        xlsString = null;

        // COMPRESIÓN DEL EXCEL
        let zipArchiver = compress.createArchiver();
        zipArchiver.add({
            file: file.load({ id: fileId })
        });
        
        let zipFileObj = zipArchiver.archive({
            name: excelFileName.replace('.xls', '.zip')
        });

        // Asignar la carpeta y guardar físicamente el ZIP en el Archivador[cite: 1]
        zipFileObj.folder = 405143;
        let zipFileId = zipFileObj.save();

        // 1. Obtener el usuario remitente desde el parámetro del script
        const currentScript = runtime.getCurrentScript();
        let usuarioRemitente = currentScript.getParameter({ name: 'custscript_mr_usuario_email' });

        // Fallback: Si el parámetro viene vacío, usamos el ID del usuario que ejecuta el script actualmente
        if (!usuarioRemitente) {
           usuarioRemitente = runtime.getCurrentUser().id;
        }

        // Forzar un ID de remitente válido si por alguna razón sigue siendo -4 (System)
        if (!usuarioRemitente || usuarioRemitente === -4 || usuarioRemitente === '-4') {
           usuarioRemitente = 1513; // TODO: Reemplaza con un ID de empleado activo real en tu NetSuite (ej. tu propio ID)
        }

        // 2. Definir destinatario fijo según lo solicitado
        let correoDestinatario = usuarioRemitente;
        const bccEmails = ['jesusc1967@hotmail.com'];

        try {
            if (fileId && usuarioRemitente) {
               // Identificar dinámicamente el formato para el asunto del correo
               log.audit({
                  title: 'Preparando envío de correo',
                  details: 'Remitente ID: ' + usuarioRemitente + ' | Destinatario: ' + correoDestinatario
               });

               /*email.send({
                   author: parseInt(usuarioRemitente), // Forzar a entero (requerido por NetSuite para el ID del Empleado)
                   recipients: parseInt(correoDestinatario),
                   bcc: bccEmails,
                   subject: 'Su Reporte Detallado de CxC EXCEL está listo',
                   body: 'Estimado usuario,\n\nSe ha completado de manera exitosa la generación de su reporte detallado de cuentas por cobrar en formato EXCEL.\n\nEl archivo ha sido adjuntado a este correo.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })] // Cargamos el ZIP guardado[cite: 1]
               });*/

               log.audit('Envío Exitoso', 'Reporte enviado correctamente a ' + correoDestinatario);
            } else {
               log.error('Error de Envío', 'No se pudo enviar el correo. fileId: ' + fileId + ' | usuarioRemitente: ' + usuarioRemitente);
            }
        } catch (mailError) {
            log.error('Error al enviar el correo electrónico', mailError);
        }

        log.audit('PROCESO FINALIZADO EXCEL', 'Excel generado con éxito. File ID: ' + fileId);
    }

    // ==========================================
    // SECCIÓN GENERACIÓN PDF
    // ==========================================
    function generarPDF(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam) {
        let logoUrl = '';
        try {
            const logoFile = file.load({ id: '2240' });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;
        } catch (err) {
            log.error('Error cargando logo', err);
        }

        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";

        let xmlFinal = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xmlFinal += '<pdf><head><macrolist>';

        // 🔹 MACRO DEL ENCABEZADO
        xmlFinal += '<macro id="h"><table style="width:100%;"><tr>';

        // 1. Solución Logo: URL completa usando el dominio de la cuenta NetSuite si es relativa
        let tagLogo = '';
        if (logoUrl) {
            let rawUrl = String(logoUrl).replace(/&amp;/g, '&');
            // 2. Escapamos únicamente los & de la URL para que no rompa el atributo src
            let safeUrl = rawUrl.replace(/&/g, '&amp;');

           // tagLogo = '<img src="' + safeUrl + '" style="width:120px;height:40px;"/>';
        }
        
         xmlFinal += '<td width="30%">' + tagLogo + '</td>';
         xmlFinal += '<td width="40%" align="center" style="font-size:11pt;"><b>Reporte detallado CxC</b></td>';
         xmlFinal += '<td width="30%" align="right" style="font-size:7pt;">' + esc(dateFrom) + ' al ' + esc(dateTo) + '<br/>Libro: ' + esc(nombreLibro) + '</td>';
         xmlFinal += '</tr></table></macro></macrolist>';

         // ESTILOS CSS
         xmlFinal += '<style>';
         xmlFinal += 'body { font-family:sans-serif; font-size:6pt; }';
         xmlFinal += 'table { width:100%; border-collapse:collapse; margin-top:4px; table-layout:fixed; }';
         xmlFinal += 'th { background-color:#566573; color:white; font-weight:bold; padding:2px; font-size:5.5pt; }';
         xmlFinal += 'td { border:0.1pt solid #bdc3c7; padding:1.5px; font-size:5.5pt; vertical-align:middle; }';
         xmlFinal += '.cta { background-color:#1a252f; color:white; font-weight:bold; padding:3px; font-size:6.5pt; }';
         xmlFinal += '.cli { background-color:#d5dbdb; font-weight:bold; padding:2px; font-size:6pt; }';
         xmlFinal += '</style></head>';

         // 🔹 FIX CLAVE 1: header="h" obliga a NetSuite a renderizar la macro "h" en cada página
         // 🔹 FIX CLAVE 2: header-height asigna el espacio superior necesario para que no tape los datos
         xmlFinal += '<body size="letter" header="h" header-height="45pt" padding="0.2in 0.2in 0.3in 0.2in">';
      
        let totalCuentasProcesadas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentasProcesadas++;
            let isLibroPrimario = (String(bookParam) === "1");
            let saldoInicialCuenta = parseFloat(saldosGlobales[cKey]) || 0;
            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';
          
            xmlFinal += '<table style="margin-top:15px; border:1pt solid black;width:100%;table-layout:fixed;"><tr class="cta">';
            xmlFinal += '<td width="70%">CUENTA: ' + esc(cKey) + '</td>';
            xmlFinal += '<td width="18%" align="right">SALDO INI (' + labelMonedaBook + '): </td>';
            xmlFinal += '<td width="12%" align="right">' + formatNumberPE(saldoInicialCuenta) + '</td></tr></table>';

            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                return (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
            });

            let bloquesXmlOrdenados = dataPorCuenta[cKey].clientesBloques.map(item => item.xml);
            xmlFinal += bloquesXmlOrdenados.join("");

            let saldoFinalCuenta = saldoInicialCuenta + dataPorCuenta[cKey].totalMovimientoCuenta;
            
            xmlFinal += '<table style="margin-top:10px; border:1.5pt solid #1a252f;width:100%;table-layout:fixed;">';
            xmlFinal += '<tr style="font-weight:bold;background-color:#fcf3cf;"><td width="88%" align="right">TOTAL MOVIMIENTOS CUENTA (' + labelMonedaBook + '):</td><td width="12%" align="right">' + formatNumberPE(dataPorCuenta[cKey].totalMovimientoCuenta) + '</td></tr>';
            xmlFinal += '<tr style="font-weight:bold;background-color:#d5f5e3;"><td align="right">SALDO FINAL CUENTA(' + labelMonedaBook + '):</td><td align="right">' + formatNumberPE(saldoFinalCuenta) + '</td></tr>';
            xmlFinal += '</table>';
        }

        if (totalCuentasProcesadas === 0) {
            xmlFinal += '<p style="font-size:11pt; margin-top:20px; text-align:center;">No se encontraron movimientos con los criterios seleccionados.</p>';
        }

        xmlFinal += '</body></pdf>';

        // Justo antes de render.xmlToPdf
        /*try {
            let pdfFile = render.xmlToPdf({ xmlString: xmlFinal });
            return pdfFile;
        } catch (xmlError) {
            // Si falla, guarda el XML en la consola para ver qué carácter & lo rompió
            log.error('Error XML generado', xmlFinal);
            throw xmlError;
        }*/

        let pdfFileObj = render.xmlToPdf({ xmlString: xmlFinal });
        let pdfFileName = 'Reporte_Detallado_CxC_' + new Date().getTime() + '.pdf';
        pdfFileObj.name = pdfFileName;
        pdfFileObj.folder = 405143; 

        let fileId = pdfFileObj.save();

        // COMPRESIÓN DEL PDF
        let zipArchiver = compress.createArchiver();
        zipArchiver.add({
            file: file.load({ id: fileId })
        });
        
        let zipFileObj = zipArchiver.archive({
            name: pdfFileName.replace('.pdf', '.zip')
        });

        // Asignar la carpeta y guardar físicamente el ZIP en el Archivador[cite: 1]
        zipFileObj.folder = 405143;
        let zipFileId = zipFileObj.save();
      
        // 1. Obtener el usuario remitente desde el parámetro del script
        const currentScript = runtime.getCurrentScript();
        let usuarioRemitente = currentScript.getParameter({ name: 'custscript_mr_usuario_email' });

        // Fallback: Si el parámetro viene vacío, usamos el ID del usuario que ejecuta el script actualmente
        if (!usuarioRemitente) {
           usuarioRemitente = runtime.getCurrentUser().id;
        }

        // Forzar un ID de remitente válido si por alguna razón sigue siendo -4 (System)
        if (!usuarioRemitente || usuarioRemitente === -4 || usuarioRemitente === '-4') {
           usuarioRemitente = 1513; // TODO: Reemplaza con un ID de empleado activo real en tu NetSuite (ej. tu propio ID)
        }

         // 2. Definir destinatario fijo según lo solicitado
        let correoDestinatario = usuarioRemitente;
        const bccEmails = ['jesusc1967@hotmail.com'];

        try {
            if (fileId && usuarioRemitente) {
               // Identificar dinámicamente el formato para el asunto del correo
               log.audit({
                  title: 'Preparando envío de correo',
                  details: 'Remitente ID: ' + usuarioRemitente + ' | Destinatario: ' + correoDestinatario
               });

               /*email.send({
                   author: parseInt(usuarioRemitente), // Forzar a entero (requerido por NetSuite para el ID del Empleado)
                   recipients: parseInt(correoDestinatario),
                   bcc: bccEmails,
                   subject: 'Su Reporte Detallado de CxC PDF está listo',
                   body: 'Estimado usuario,\n\nSe ha completado de manera exitosa la generación de su reporte detallado de cuentas por cobrar en formato PDF.\n\nEl archivo ha sido adjuntado a este correo.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })] // Cargamos el ZIP guardado[cite: 1]      
               });*/

               log.audit('Envío Exitoso', 'Reporte enviado correctamente a ' + correoDestinatario);
            } else {
               log.error('Error de Envío', 'No se pudo enviar el correo. fileId: ' + fileId + ' | usuarioRemitente: ' + usuarioRemitente);
            }
        } catch (mailError) {
            log.error('Error al enviar el correo electrónico', mailError);
        }
      
        log.audit('PROCESO FINALIZADO PDF', 'PDF generado con éxito. File ID: ' + fileId);
    }

    // ==========================================
    // HELPERS GENERALES
    // ==========================================
    const esc = (s) => (s !== null && s !== undefined) 
        ? String(s)
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&apos;')
           .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "") 
        : "";
  
    function formatNumberPE(valor) {
        let num = parseFloat(valor) || 0;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }

    function obtenerIdCuentaFiltro(accountText) {
        if (accountText.indexOf('121201') !== -1) return '4896';
        if (accountText.indexOf('121202') !== -1) return '4897';
        return accountText;
    }

function obtenerSaldosPorCuenta(params) {
    let saldosCuentas = {};
    let accounts = params.custpage_account ? [params.custpage_account] : ['4893', '4894', '4895', '4897', '4908', '4909', '6793', '4929', '4930'];
    let idLibroContable = params.bookParam ? String(params.bookParam) : "1";

    try {
        let dSearch = search.load({
            id: 'customsearch_pe_saldos_cxc_resumen'
        });

        // 1. PURGAR FILTROS DE FECHA PRE-GUARDADOS (Vital)
        // Eliminamos cualquier filtro de periodo o fecha que venga de la UI para que nuestro script tenga control total.
        let cleanFilters = dSearch.filters.filter(f => {
            let fname = f.name.toLowerCase();
            let fjoin = (f.join || '').toLowerCase();
            return !(fname.includes('period') || fjoin.includes('period') || fname.includes('date') || fname === 'trandate');
        });

        // 2. Filtro de Cuentas y Transacción Contable pura
        cleanFilters.push(search.createFilter({ name: 'posting', operator: search.Operator.IS, values: ['T'] }));
        cleanFilters.push(search.createFilter({ name: 'account', operator: search.Operator.ANYOF, values: accounts }));

        // 3. Filtro Multi-Book
        if (idLibroContable !== "1") {
            cleanFilters.push(search.createFilter({
                name: 'accountingbook',
                join: 'accountingtransaction',
                operator: search.Operator.IS,
                values: [idLibroContable]
            }));
        } else {
            cleanFilters.push(search.createFilter({
                name: 'accountingbook',
                operator: search.Operator.IS,
                values: [idLibroContable]
            }));
        }

        // 4. Inyectar tu filtro de Fecha de Inicio de Periodo
        if (params.custpage_date_from) {
            cleanFilters.push(search.createFilter({
                name: 'startdate',
                join: 'accountingperiod',
                operator: search.Operator.BEFORE, // Mantenemos BEFORE como lo pediste
                values: [params.custpage_date_from]
            }));
        }

        // Reasignar los filtros limpios a la búsqueda
        dSearch.filters = cleanFilters;

        // 5. LA FÓRMULA DE ORO CONTABLE: (Débitos - Créditos) y Redondeado a 2 decimales
        // Esto obliga al motor a sumar con signos correctos (Facturas suman, Pagos/Notas Crédito restan) y formatea el .736
        let formulaSaldo = idLibroContable !== "1" 
            ? 'ROUND(NVL({accountingtransaction.debitamount},0) - NVL({accountingtransaction.creditamount},0), 2)'
            : 'ROUND(NVL({debitamount},0) - NVL({creditamount},0), 2)';

        dSearch.columns = [
            search.createColumn({
                name: 'account',
                summary: search.Summary.GROUP
            }),
            search.createColumn({
                name: 'formulanumeric',
                formula: formulaSaldo,
                summary: search.Summary.SUM
            })
        ];

        // 6. Ejecutar Búsqueda
        dSearch.run().each(res => {
            // Usar los índices del array de columnas que acabamos de crear
            let accountName = res.getText(dSearch.columns[0]) || res.getValue(dSearch.columns[0]);
            let montoStr = res.getValue(dSearch.columns[1]);
            let monto = parseFloat(montoStr) || 0;

            if (accountName) {
                saldosCuentas[accountName] = (saldosCuentas[accountName] || 0) + monto;
            }

            log.audit({ 
                title: 'Saldo Resultado Exacto', 
                details: 'Cuenta: ' + accountName + ' | Libro: ' + idLibroContable + ' | Monto: ' + monto 
            });

            return true;
        });

    } catch (e) {
        log.error('Error al obtener saldos por cuenta', e);
    }

    return [saldosCuentas];
}

    return {
        getInputData: GET_INPUT_DATA,
        map: MAP,
        reduce: REDUCE,
        summarize: SUMMARIZE
    };
});