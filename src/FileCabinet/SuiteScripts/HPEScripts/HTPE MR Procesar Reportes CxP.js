/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/file', 'N/compress', 'N/email', 'N/runtime', 'N/render', 'N/encode', 'N/log', 'N/url'], 
(search, file, compress ,email, runtime, render, moduloEncode, log, url) => {

    const GET_INPUT_DATA = () => {
        try {
            let currentScript     = runtime.getCurrentScript();
            let accountParam      = currentScript.getParameter({ name: 'custscript_mr_accountcxp' });
            let dateFrom          = currentScript.getParameter({ name: 'custscript_mr_date_fromcxp' });
            let dateTo            = currentScript.getParameter({ name: 'custscript_mr_date_tocxp' });
            let clientParam       = currentScript.getParameter({ name: 'custscript_mr_clientcxp' });
            let omitirzeroParam   = currentScript.getParameter({ name: 'custscript_mr_hide_zerocxp' });
            let usermailParam     = currentScript.getParameter({ name: 'custscript_mr_usuario_emailcxp' });
            let tipoFormato       = currentScript.getParameter({ name: 'custscript_mr_tipo_formatocxp' }); // 'PDF' o 'EXCEL'

            log.audit({
                title: 'Parametros Input',
                details: 'accountParam: ' + accountParam + ' | dateFrom: ' + dateFrom + ' | dateTo: ' + dateTo + ' | clientParam: ' + clientParam + ' | omitirzeroParam: ' + omitirzeroParam + ' | usermailParam: ' + usermailParam + ' | tipoFormato: ' + tipoFormato
            });

            let dSearch = search.load({ id: 'customsearch_pe_pagar_2' });
            
            // CORRECCIÓN CRÍTICA: Limpiar ordenamientos de resumen previos de la UI
            dSearch.sort = []; 
            dSearch.filters = [];

            let idLibroContable = "2";
            if (accountParam && (accountParam.indexOf('6113') !== -1 || accountParam.indexOf('421001') !== -1)) {
                idLibroContable = "1"; 
            }

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

            /*if (accountParam && (accountParam.indexOf('6113') !== -1 || accountParam.indexOf('421001') !== -1)) {
                dSearch.filters.push(search.createFilter({
                    name: 'accountingbook',
                    operator: search.Operator.ANYOF,
                    values: ['1'] 
                }));
            }*/

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
                search.createColumn({ name: 'debitamount' }),
                search.createColumn({ name: 'creditamount' }),
                search.createColumn({ name: 'amount' }),
                search.createColumn({ name: 'memo',  join: 'transaction' }),
                search.createColumn({ name: 'internalid', join: 'transaction' }),
                search.createColumn({ name: 'subsidiary', join: 'transaction'  })
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
                if (!/^P-PE-/.test(entityName)) {
                    if (/^PE-/.test(entityName)) {
                        entityName = "P-" + entityName;
                    } else {
                        entityName = "P-PE-" + entityName;
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
          
            let movimientoPayload = {
                doc: docNum,
                fec: fechaTx,
                tip: tipoTx,
                mon: currencyKey, 
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
                idInterno: internalIdKey 
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
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_fromcxp' });
            const hideZeroParam = scriptObj.getParameter({ name: 'custscript_mr_hide_zerocxp' });
            const checkFiltrar = (hideZeroParam === 'T' || hideZeroParam === true || hideZeroParam === 'true');

            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });

            let movimientos = [];
            let totalAmt = 0;
            let totalAmtUSD = 0;

            context.values.forEach((val) => {
                let row = JSON.parse(val);
                movimientos.push(row);
                totalAmt += row.amt;
                totalAmtUSD += row.amtUSD;
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

            let isMonedaNacional = cuentaContable.indexOf('421001') !== -1;

            if (checkFiltrar) {
                if (isMonedaNacional && parseFloat(totalAmt.toFixed(2)) === 0) return;
                if (!isMonedaNacional && parseFloat(totalAmtUSD.toFixed(2)) === 0) return;
            }

            let sCliIni = 0;
            let sCliIniUSD = 0;

            if (dateFrom) {
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

                filterExpression.push('AND', ['accountingbook', 'anyof', '1']);
                filterExpression.push('AND', ['transaction.trandate', 'before', dateFrom]);

                let saldoBusqueda = search.create({
                    type: 'accountingtransaction',
                    filters: filterExpression,
                    columns: [search.createColumn({ name: 'amount', summary: search.Summary.SUM })]
                });

                saldoBusqueda.run().each(res => {
                    let saldoCalculado = parseFloat(res.getValue(saldoBusqueda.columns[0])) || 0;
                    if (isMonedaNacional) {
                        sCliIni = saldoCalculado;
                    } else {
                        sCliIniUSD = saldoCalculado;
                    }
                    return false;
                });
            }

            let xmlBloque = '';
            let mCliDebitMN = 0, mCliCreditMN = 0, mCliDebitME = 0, mCliCreditME = 0;
            let mSaldo = sCliIni;
            let mSaldoUSD = sCliIniUSD;

            xmlBloque += '<table style="margin-top:5px;table-layout:fixed;width:100%;">';
            xmlBloque += '<tr class="cli"><td width="100%" colspan="7">' + esc(nombreEntidad) + ' :</td></tr>';
            xmlBloque += '</table>';
            
            xmlBloque += '<table style="margin-top:5px;table-layout:fixed;width:100%;"><thead><tr>';
            xmlBloque += '<th width="8%" align="center">Fecha</th>';
            xmlBloque += '<th width="12%" align="center">Tipo</th>';
            xmlBloque += '<th width="18%" align="center">Documento</th>';
            xmlBloque += '<th width="32%" align="center">Glosa</th>';
            xmlBloque += isMonedaNacional ? '<th width="10%" align="center">DebitoMN</th><th width="10%" align="center">CreditoMN</th>' : '<th width="10%" align="center">DebitoME</th><th width="10%" align="center">CreditoME</th>';
            xmlBloque += '<th width="10%" align="center">Saldo</th></tr></thead><tbody>';

            movimientos.forEach(m => {
                mCliDebitMN += m.debitamtmn; mCliCreditMN += m.creditamtmn;
                mCliDebitME += m.debitamtme; mCliCreditME += m.creditamtme;
                mSaldo += m.amt; mSaldoUSD += m.amtUSD;

                xmlBloque += '<tr>';
                xmlBloque += '<td align="center">' + esc(m.fec) + '</td>';
                xmlBloque += '<td>' + esc(m.tip) + '</td>';

                let linkTransaccion = 'https://' + domain + '/app/accounting/transactions/transaction.nl?id=' + m.idInterno;
                xmlBloque += '<td><a href="' + esc(linkTransaccion) + '" style="color: #1a5276; text-decoration: underline;">' + esc(m.doc) + '</a></td>';
              
                xmlBloque += '<td>' + esc(m.mem) + '</td>';
                
                if (isMonedaNacional) {
                    xmlBloque += '<td align="right">' + formatNumberPE(m.debitamtmn) + '</td>';
                    xmlBloque += '<td align="right">' + formatNumberPE(m.creditamtmn) + '</td>';
                    xmlBloque += '<td align="right">' + formatNumberPE(mSaldo) + '</td>';
                } else {
                    xmlBloque += '<td align="right">' + formatNumberPE(m.debitamtme) + '</td>';
                    xmlBloque += '<td align="right">' + formatNumberPE(m.creditamtme) + '</td>';
                    xmlBloque += '<td align="right">' + formatNumberPE(mSaldoUSD) + '</td>';
                }
                xmlBloque += '</tr>';
            });

            xmlBloque += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="4" align="right">TOTAL MOVIMIENTOS:</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(isMonedaNacional ? mCliDebitMN : mCliDebitME) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(isMonedaNacional ? mCliCreditMN : mCliCreditME) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(isMonedaNacional ? totalAmt : totalAmtUSD) + '</td></tr>';
            xmlBloque += '</tbody></table>';

            context.write({
                key: cuentaContable,
                value: {
                    clienteNombre: nombreEntidad, // <-- Agregado para poder ordenar en summarize
                    xml: xmlBloque,
                    netoAmt: isMonedaNacional ? totalAmt : totalAmtUSD,
                    // Enviamos los datos crudos para que el Excel no requiera parsear HTML
                    movimientosDetalle: movimientos,
                    saldoInicialCalculado: isMonedaNacional ? sCliIni : sCliIniUSD,
                    isMonedaNacional: isMonedaNacional
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
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_fromcxp' }); // Cambiar por el ID real de tu parámetro
            const accountSelected = scriptObj.getParameter({ name: 'custscript_mr_accountcxp' });
            const dateTo = scriptObj.getParameter({ name: 'custscript_mr_date_tocxp' }); // <--- TE FALTABA ESTA LÍNEA
            const clientParam = scriptObj.getParameter({ name: 'custscript_mr_clientcxp' });
            // Declaración robusta con fallback explícito a PDF
            let tipoFormato = 'PDF';
            try {
                let paramFormato = scriptObj.getParameter({ name: 'custscript_mr_tipo_formatocxp' });
                if (paramFormato) {
                    tipoFormato = String(paramFormato).toUpperCase().trim();
                }
            } catch (paramErr) {
                log.error('Error leyendo parámetro custscript_mr_tipo_formatocxp, usando PDF por defecto', paramErr);
            }

            log.audit({
                title: 'Summarize - Formato a generar',
                details: 'tipoFormato detectado: ' + tipoFormato
            });
            
            let params = {
                custpage_date_from: dateFrom,
                custpage_account: accountSelected,
                dateTo: dateTo,         // <--- Ahora ya existe y no dará ReferenceError
                clientParam: clientParam
            };

            log.audit('Parámetros mapeados en summarize', params);
          
            // Invocación de la función helper
            let [saldosGlobalesMN, saldosGlobalesME] = obtenerSaldosPorCuenta(params);

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
                generarExcel(dataPorCuenta, saldosGlobalesMN, saldosGlobalesME, dateFrom, dateTo);
            } else {
                log.audit('Summarize', 'Iniciando generación de PDF...');
                generarPDF(dataPorCuenta, saldosGlobalesMN, saldosGlobalesME, dateFrom, dateTo);
            }

        } catch (e) {
            log.error('Error en SUMMARIZE consolidación', e);
        }
    };

    // ==========================================
    // SECCIÓN GENERACIÓN EXCEL (HTML COMPATIBLE)
    // ==========================================
    function generarExcel(dataPorCuenta, saldosGlobalesMN, saldosGlobalesME, dateFrom, dateTo) {
        let xlsString = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        xlsString += '<head><meta charset="UTF-8"/><style>';
        xlsString += 'table { border-collapse:collapse; font-family:sans-serif; font-size:10pt; }';
        xlsString += '.title { font-size:14pt; font-weight:bold; text-align:center; }';
        xlsString += '.header-cta { background-color:#1a252f; color:white; font-weight:bold; }';
        xlsString += '.header-cli { background-color:#d5dbdb; font-weight:bold; }';
        xlsString += '.th-sub { background-color:#566573; color:white; font-weight:bold; text-align:center; }';
        xlsString += '.num { mso-number-format:"#,##0.00"; text-align:right; }';
        xlsString += '.total-row { background-color:#ebf5fb; font-weight:bold; }';
        xlsString += '.final-row { background-color:#d5f5e3; font-weight:bold; }';
        xlsString += '</style></head><body>';

        xlsString += '<table><tr><td colspan="7" class="title">REPORTE DETALLADO DE CUENTAS POR PAGAR</td></tr>';
        xlsString += '<tr><td colspan="7" style="text-align:center;">Rango: ' + dateFrom + ' al ' + dateTo + '</td></tr></table><br/>';

        let totalCuentas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentas++;
            let isMonedaNacional = cKey.indexOf('421001') !== -1;
            let saldoInicialCuenta = isMonedaNacional ? (parseFloat(saldosGlobalesMN[cKey]) || 0) : (parseFloat(saldosGlobalesME[cKey]) || 0);

            xlsString += '<table border="1">';
            xlsString += '<tr class="header-cta"><td colspan="4">CUENTA: ' + esc(cKey) + '</td><td colspan="2" align="right">SALDO INICIAL:</td><td class="num">' + saldoInicialCuenta + '</td></tr>';

            // Ordenamiento Alfabético de Clientes
            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                return (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
            });

            dataPorCuenta[cKey].clientesBloques.forEach(bloque => {
                xlsString += '<tr class="header-cli"><td colspan="7">' + esc(bloque.clienteNombre) + '</td></tr>';
                xlsString += '<tr>';
                xlsString += '<th class="th-sub">Fecha</th><th class="th-sub">Tipo</th><th class="th-sub">Documento</th><th class="th-sub">Glosa</th>';
                xlsString += isMonedaNacional ? '<th class="th-sub">Debito MN</th><th class="th-sub">Credito MN</th>' : '<th class="th-sub">Debito ME</th><th class="th-sub">Credito ME</th>';
                xlsString += '<th class="th-sub">Saldo</th></tr>';

                let runningSaldo = bloque.saldoInicialCalculado;
                let tDeb = 0, tCred = 0;

                bloque.movimientosDetalle.forEach(m => {
                    let deb = m.isMonedaNacional ? m.debitamtmn : m.debitamtme;
                    let cred = m.isMonedaNacional ? m.creditamtmn : m.creditamtme;
                    runningSaldo += m.amt;
                    tDeb += deb; 
                    tCred += cred;

                    xlsString += '<tr>';
                    xlsString += '<td align="center">' + esc(m.fec) + '</td>';
                    xlsString += '<td>' + esc(m.tip) + '</td>';
                    xlsString += '<td>' + esc(m.doc) + '</td>';
                    xlsString += '<td>' + esc(m.mem) + '</td>';
                    xlsString += '<td class="num">' + deb + '</td>';
                    xlsString += '<td class="num">' + cred + '</td>';
                    xlsString += '<td class="num">' + runningSaldo + '</td>';
                    xlsString += '</tr>';
                });

                // Total del Cliente
                xlsString += '<tr class="total-row"><td colspan="4" align="right">TOTAL POR PROVEEDOR:</td>';
                xlsString += '<td class="num">' + tDeb + '</td><td class="num">' + tCred + '</td>';
                xlsString += '<td class="num">' + bloque.netoAmt + '</td></tr>';
            });

            // Resumen Final de la Cuenta
            let saldoFinalCuenta = saldoInicialCuenta + dataPorCuenta[cKey].totalMovimientoCuenta;
            xlsString += '<tr class="final-row"><td colspan="6" align="right">TOTAL MOVIMIENTOS CUENTA:</td><td class="num">' + dataPorCuenta[cKey].totalMovimientoCuenta + '</td></tr>';
            xlsString += '<tr class="final-row"><td colspan="6" align="right">SALDO FINAL CUENTA:</td><td class="num">' + saldoFinalCuenta + '</td></tr>';
            xlsString += '</table><br/>';
        }

        if (totalCuentas === 0) {
            xlsString += '<p>No se encontraron movimientos.</p>';
        }

        xlsString += '</body></html>';
      
        let base64Xls = moduloEncode.convert({ string: xlsString, inputEncoding: moduloEncode.Encoding.UTF_8, outputEncoding: moduloEncode.Encoding.BASE_64 });
        let excelFileName = 'Reporte_Detallado_CxP_' + new Date().getTime() + '.xls';
        let excelFileObj = file.create({
            name: excelFileName,
            fileType: file.Type.EXCEL,
            contents: base64Xls,
            folder: 405143
        });

        let fileId = excelFileObj.save();

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
        let usuarioRemitente = currentScript.getParameter({ name: 'custscript_mr_usuario_emailcxp' });

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

               email.send({
                   author: parseInt(usuarioRemitente), // Forzar a entero (requerido por NetSuite para el ID del Empleado)
                   recipients: parseInt(correoDestinatario),
                   bcc: bccEmails,
                   subject: 'Su Reporte Detallado de CxP EXCEL está listo',
                   body: 'Estimado usuario,\n\nSe ha completado de manera exitosa la generación de su reporte detallado de cuentas por pagar en formato EXCEL.\n\nEl archivo ha sido adjuntado a este correo.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })] // Cargamos el ZIP guardado[cite: 1]
               });

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
    function generarPDF(dataPorCuenta, saldosGlobalesMN, saldosGlobalesME, dateFrom, dateTo) {
        let logoUrl = '';
        try {
            const logoFile = file.load({ id: '2240' });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;
        } catch (err) {
            log.error('Error cargando logo', err);
        }

        let xmlFinal = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xmlFinal += '<pdf><head><macrolist><macro id="h"><table style="width:100%;"><tr>';
        xmlFinal += '<td width="30%">' + (logoUrl ? '<img src="' + esc(logoUrl) + '" style="width:100px;height:45px;"/>' : '') + '</td>';
        xmlFinal += '<td width="40%" align="center" style="font-size:12pt;"><b>CUENTAS POR PAGAR</b></td>';
        xmlFinal += '<td width="30%" align="right" style="font-size:7pt;">' + esc(dateFrom) + ' al ' + esc(dateTo) + '</td>';
        xmlFinal += '</tr></table></macro></macrolist>';
        xmlFinal += '<style>body{font-family:sans-serif;font-size:7pt;} table{width:100%;border-collapse:collapse;margin-top:5px;table-layout:fixed;} .cta{background-color:#1a252f;color:white;font-weight:bold;padding:4px;} .cli{background-color:#d5dbdb;font-weight:bold;padding:3px;} th{background-color:#566573;color:white;font-weight:bold;} td{border:0.1pt solid #bdc3c7;padding:2px; vertical-align: middle;}</style></head>';
        xmlFinal += '<body size="letter" header="h" header-height="0.8in" padding="0.4in">';

        let totalCuentasProcesadas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentasProcesadas++;
            let isMonedaNacional = cKey.indexOf('421001') !== -1; 
            let saldoInicialCuenta = isMonedaNacional ? (parseFloat(saldosGlobalesMN[cKey]) || 0) : (parseFloat(saldosGlobalesME[cKey]) || 0);

            xmlFinal += '<table style="margin-top:15px; border:1pt solid black;width:100%;table-layout:fixed;"><tr class="cta">';
            xmlFinal += '<td width="70%">CUENTA: ' + esc(cKey) + '</td>';
            xmlFinal += '<td width="18%" align="right">SALDO INICIAL: </td>';
            xmlFinal += '<td width="12%" align="right">' + formatNumberPE(saldoInicialCuenta) + '</td></tr></table>';

            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                return (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
            });

            let bloquesXmlOrdenados = dataPorCuenta[cKey].clientesBloques.map(item => item.xml);
            xmlFinal += bloquesXmlOrdenados.join("");

            let saldoFinalCuenta = saldoInicialCuenta + dataPorCuenta[cKey].totalMovimientoCuenta;
            
            xmlFinal += '<table style="margin-top:10px; border:1.5pt solid #1a252f;width:100%;table-layout:fixed;">';
            xmlFinal += '<tr style="font-weight:bold;background-color:#fcf3cf;"><td width="88%" align="right">TOTAL MOVIMIENTOS CUENTA:</td><td width="12%" align="right">' + formatNumberPE(dataPorCuenta[cKey].totalMovimientoCuenta) + '</td></tr>';
            xmlFinal += '<tr style="font-weight:bold;background-color:#d5f5e3;"><td align="right">SALDO FINAL CUENTA:</td><td align="right">' + formatNumberPE(saldoFinalCuenta) + '</td></tr>';
            xmlFinal += '</table>';
        }

        if (totalCuentasProcesadas === 0) {
            xmlFinal += '<p style="font-size:11pt; margin-top:20px; text-align:center;">No se encontraron movimientos con los criterios seleccionados.</p>';
        }

        xmlFinal += '</body></pdf>';

        let pdfFileObj = render.xmlToPdf({ xmlString: xmlFinal });
        let pdfFileName = 'Reporte_Detallado_CxP_' + new Date().getTime() + '.pdf';
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
        let usuarioRemitente = currentScript.getParameter({ name: 'custscript_mr_usuario_emailcxp' });

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

               email.send({
                   author: parseInt(usuarioRemitente), // Forzar a entero (requerido por NetSuite para el ID del Empleado)
                   recipients: parseInt(correoDestinatario),
                   bcc: bccEmails,
                   subject: 'Su Reporte Detallado de CxP PDF está listo',
                   body: 'Estimado usuario,\n\nSe ha completado de manera exitosa la generación de su reporte detallado de cuentas por pagar en formato PDF.\n\nEl archivo ha sido adjuntado a este correo.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })] // Cargamos el ZIP guardado[cite: 1]      
               });

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
    const esc = (s) => s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "") : "";
    
    function formatNumberPE(valor) {
        let num = parseFloat(valor) || 0;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }

    function obtenerIdCuentaFiltro(accountText) {
        if (accountText.indexOf('421001') !== -1) return '6113';
        if (accountText.indexOf('421002') !== -1) return '6114';
        return accountText;
    }

    function obtenerSaldosPorCuenta(params) {
        let saldosCuentas = {};
        let saldosCuentasUSD = {};
        let accounts = params.custpage_account ? [params.custpage_account] : ['6113', '6114'];

        try {
            let mySearch = search.load({ id: 'customsearch_pe_saldos_por_pagar' });
            mySearch.filters.push(search.createFilter({
                name: 'account',
                operator: search.Operator.ANYOF,
                values: accounts
            }));

            if (params.custpage_date_from) {
                mySearch.filters.push(search.createFilter({
                    name: 'formuladate',
                    formula: "TO_DATE(CONCAT(CONCAT('01/', CASE WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JAN' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ENE' THEN '01/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'FEB' THEN '02/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAR' THEN '03/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'APR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'ABR' THEN '04/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'MAY' THEN '05/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUN' THEN '06/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'JUL' THEN '07/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AUG' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'AGO' THEN '08/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SEP' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'SET' THEN '09/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'OCT' THEN '10/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'NOV' THEN '11/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DEC' THEN '12/' WHEN UPPER(SUBSTR({transaction.postingperiod},1,3)) = 'DIC' THEN '12/' ELSE 'Error' END),SUBSTR({transaction.postingperiod},5,4)),'dd/mm/yyyy')", 
                    operator: search.Operator.BEFORE,
                    values: params.custpage_date_from
                }));
            }

            mySearch.run().each(res => {
                let cols = res.columns; 
                let accountName = res.getText(cols[0]); 
                let monto = parseFloat(res.getValue(cols[1])) || 0;
                let montoUSD = parseFloat(res.getValue(cols[2])) || 0;
                
                saldosCuentas[accountName] = monto;
                saldosCuentasUSD[accountName] = montoUSD;
                return true;
            });

        } catch (e) {
            log.error('Error al obtener saldos por cuenta', e);
        }

        return [saldosCuentas, saldosCuentasUSD];
    }

    return {
        getInputData: GET_INPUT_DATA,
        map: MAP,
        reduce: REDUCE,
        summarize: SUMMARIZE
    };
});