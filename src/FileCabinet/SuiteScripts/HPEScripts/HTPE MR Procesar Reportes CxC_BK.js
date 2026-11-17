/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/file', 'N/compress', 'N/email', 'N/runtime', 'N/render', 'N/encode', 'N/log', 'N/url', 'N/query'], 
(search, file, compress, email, runtime, render, moduloEncode, log, url, query) => {

const GET_INPUT_DATA = () => {
    try {
        // =========================================================================
        // LECTURA DE PARÁMETROS DEL SCRIPT
        // =========================================================================
        let currentScript     = runtime.getCurrentScript();
        let accountParam      = currentScript.getParameter({ name: 'custscript_mr_account_bk' });
        let dateFrom          = currentScript.getParameter({ name: 'custscript_mr_date_from_bk' });
        let dateTo            = currentScript.getParameter({ name: 'custscript_mr_date_to_bk' });
        let clientParam       = currentScript.getParameter({ name: 'custscript_mr_client_bk' });
        let omitirzeroParam   = currentScript.getParameter({ name: 'custscript_mr_hide_zero_bk' });
        let usermailParam     = currentScript.getParameter({ name: 'custscript_mr_usuario_email_bk' });
        let tipoFormato       = currentScript.getParameter({ name: 'custscript_mr_tipo_formato_bk' }); // 'PDF', 'EXCEL', 'PDF_RESUMEN', etc.
        let bookParam         = currentScript.getParameter({ name: 'custscript_mr_accounting_book_bk' });

        log.audit({
            title: 'Parametros Input',
            details: `accountParam: ${accountParam} | dateFrom: ${dateFrom} | dateTo: ${dateTo} | clientParam: ${clientParam} | tipoFormato: ${tipoFormato} | bookParam: ${bookParam}`
        });

        // 🔹 1. SI ES UN RESUMEN, EJECUTAR SUITEQL PAGINADO Y RETORNAR
        if (tipoFormato === 'PDF_RESUMEN' || tipoFormato === 'EXCEL_RESUMEN') {
            log.audit('GET_INPUT_DATA', 'Ejecutando SuiteQL Resumido...');
            
            // Retorna directamente la invocación paginada para mantener consistencia de tipos
            return obtenerResumenCxCSuiteQL({
                accountParam: accountParam,
                dateFrom: dateFrom,
                dateTo: dateTo,
                clientParam: clientParam,
                omitirzeroParam: omitirzeroParam,
                bookParam: bookParam
            });
        }

        // =========================================================================
        // 🔹 2. SUITEQL DETALLADO (3 NIVELES: PRINCIPAL, RELACIONADOS, REVALUACIONES)
        // =========================================================================
        log.audit('GET_INPUT_DATA', 'Ejecutando SuiteQL Detallado...');

        let idLibroContable = bookParam ? parseInt(bookParam, 10) : 1;

        // Preparación de Filtro de Cuentas Contables
        let accounts = accountParam ? (Array.isArray(accountParam) ? accountParam : [accountParam]) : ['4896'];
        let accountsCond = accounts.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',');
        if (!accountsCond) accountsCond = '4896';

        // Preparación de Filtro de Entidades
        let filterClient = '';
        let filterClientRel = '';
        if (clientParam) {
            let clients = Array.isArray(clientParam) ? clientParam : [clientParam];
            let clientsCond = clients.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',');
            if (clientsCond) {
                filterClient = ` AND t.entity IN (${clientsCond})`;
                filterClientRel = ` AND COALESCE(t_rel.entity, t_orig.entity) IN (${clientsCond})`;
            }
        }

        // Preparación de Filtro de Fechas
        let filterDate = '';
        let filterDateRel = '';
        if (dateFrom && dateTo) {
            filterDate = ` AND t.trandate BETWEEN TO_DATE('${dateFrom}', 'DD/MM/YYYY') AND TO_DATE('${dateTo}', 'DD/MM/YYYY')`;
            filterDateRel = ` AND t_rel.trandate BETWEEN TO_DATE('${dateFrom}', 'DD/MM/YYYY') AND TO_DATE('${dateTo}', 'DD/MM/YYYY')`;
        }

        // Consulta SuiteQL Completa con alias 'is_resumen' explícito
        let sqlDetallado = `
            -- 1. FACTURA PRINCIPAL
            SELECT 
                0 AS is_resumen,
                t.id AS doc_id,
                t.id AS doc_padre_id,
                COALESCE(t.tranid, 'S/N') AS num_doc,
                COALESCE(t.tranid, 'S/N') AS num_doc_padre,
                ab.name AS libro_contable,
                acc.acctnumber || ' ' || acc.accountsearchdisplayname AS cuenta_contable,
                COALESCE(t.entity, 0) AS entity_id,
                COALESCE(e.entityid, 'sin-entidad') AS entity_name,
                'Factura Principal' AS tipo_relacion,
                'Factura' AS tipo_registro,
                TO_CHAR(t.trandate, 'DD/MM/YYYY') AS fecha,
                t.trandate AS fecha_raw,
                ap.periodname AS periodo_contable,
                COALESCE(c.symbol, 'PEN') AS moneda,
                COALESCE(t.memo, '') AS memo,
                CASE 
                    WHEN INSTR(BUILTIN.DF(t.status), ':') > 0 
                    THEN SUBSTR(BUILTIN.DF(t.status), INSTR(BUILTIN.DF(t.status), ':') + 2)
                    ELSE BUILTIN.DF(t.status)
                END AS estado_documento,
                ROUND(SUM(ABS(tal.amount)), 2) AS monto_aplicado,
                ROUND(SUM(CASE WHEN tal.amount > 0 THEN tal.amount ELSE 0 END), 2) AS debitamount,
                ROUND(SUM(CASE WHEN tal.amount < 0 THEN ABS(tal.amount) ELSE 0 END), 2) AS creditamount,
                ROUND(SUM(tal.amount), 2) AS saldo_pendiente
            FROM 
                Transaction t
            INNER JOIN 
                TransactionAccountingLine tal ON tal.transaction = t.id AND tal.accountingbook = ${idLibroContable}
            INNER JOIN 
                AccountingBook ab ON ab.id = tal.accountingbook
            LEFT JOIN 
                Entity e ON e.id = t.entity
            INNER JOIN 
                Account acc ON acc.id = tal.account
            LEFT JOIN 
                Currency c ON c.id = t.currency
            LEFT JOIN 
                AccountingPeriod ap ON ap.id = t.postingperiod
            WHERE 
                t.type = 'CustInvc'
                AND tal.account IN (${accountsCond})
                ${filterClient}
                ${filterDate}
                AND LOWER(BUILTIN.DF(t.status)) NOT LIKE '%anulado%'
                AND LOWER(BUILTIN.DF(t.status)) NOT LIKE '%voided%'
                AND t.status NOT LIKE '%:V'
            GROUP BY 
                t.id, t.tranid, ab.name, acc.acctnumber, acc.accountsearchdisplayname, 
                t.entity, e.entityid, t.trandate, ap.periodname, c.symbol, t.memo, BUILTIN.DF(t.status)

            UNION ALL

            -- 2. DOCUMENTOS RELACIONADOS
            SELECT 
                0 AS is_resumen,
                t_rel.id AS doc_id,
                t_orig.id AS doc_padre_id,
                COALESCE(t_rel.tranid, 'S/N') AS num_doc,
                COALESCE(t_orig.tranid, 'S/N') AS num_doc_padre,
                ab.name AS libro_contable,
                acc.acctnumber || ' ' || acc.accountsearchdisplayname AS cuenta_contable,
                COALESCE(t_rel.entity, t_orig.entity, 0) AS entity_id,
                COALESCE(e.entityid, 'sin-entidad') AS entity_name,
                'Documento Relacionado' AS tipo_relacion,
                CASE 
                    WHEN t_rel.type = 'Payment' THEN 'Pago de Cliente'
                    WHEN t_rel.type = 'CuCred' THEN 'Nota de Crédito'
                    WHEN t_rel.type = 'DepAppl' THEN 'Aplicación de Depósito'
                    WHEN t_rel.type = 'Unreval' THEN 'Revaluación Ganancia/Pérdida'
                    WHEN t_rel.type = 'FxReval' THEN 'Revaluación de Moneda Extranjera'
                    WHEN t_rel.type = 'Journal' THEN 'Asiento Contable / Ajuste'
                    ELSE t_rel.type 
                END AS tipo_registro,
                TO_CHAR(t_rel.trandate, 'DD/MM/YYYY') AS fecha,
                t_rel.trandate AS fecha_raw,
                ap_rel.periodname AS periodo_contable,
                COALESCE(c.symbol, 'PEN') AS moneda,
                COALESCE(t_rel.memo, '') AS memo,
                CASE 
                    WHEN INSTR(BUILTIN.DF(t_rel.status), ':') > 0 
                    THEN SUBSTR(BUILTIN.DF(t_rel.status), INSTR(BUILTIN.DF(t_rel.status), ':') + 2)
                    ELSE BUILTIN.DF(t_rel.status)
                END AS estado_documento,
                ROUND(ABS(COALESCE(ntll.foreignamount, tal_rel.amount)), 2) AS monto_aplicado,
                0 AS debitamount,
                ROUND(ABS(COALESCE(ntll.foreignamount, tal_rel.amount)), 2) AS creditamount,
                0 AS saldo_pendiente
            FROM 
                Transaction t_orig
            INNER JOIN 
                NextTransactionLineLink ntll ON ntll.previousdoc = t_orig.id
            INNER JOIN 
                Transaction t_rel ON t_rel.id = ntll.nextdoc
            INNER JOIN 
                TransactionAccountingLine tal_rel ON tal_rel.transaction = t_rel.id AND tal_rel.accountingbook = ${idLibroContable}
            INNER JOIN 
                AccountingBook ab ON ab.id = tal_rel.accountingbook
            LEFT JOIN 
                Account acc ON acc.id = tal_rel.account
            LEFT JOIN 
                Entity e ON e.id = COALESCE(t_rel.entity, t_orig.entity)
            LEFT JOIN 
                Currency c ON c.id = t_rel.currency
            LEFT JOIN 
                AccountingPeriod ap_rel ON ap_rel.id = t_rel.postingperiod
            WHERE 
                t_orig.type = 'CustInvc'
                AND tal_rel.account IN (${accountsCond})
                ${filterClientRel}
                ${filterDateRel}
                AND LOWER(BUILTIN.DF(t_rel.status)) NOT LIKE '%anulado%'
                AND LOWER(BUILTIN.DF(t_rel.status)) NOT LIKE '%voided%'
                AND t_rel.status NOT LIKE '%:V'

            UNION ALL

            -- 3. REVALUACIONES Y ASIENTOS VINCULADOS
            SELECT 
                0 AS is_resumen,
                t_rel.id AS doc_id,
                t_orig.id AS doc_padre_id,
                COALESCE(t_rel.tranid, 'S/N') AS num_doc,
                COALESCE(t_orig.tranid, 'S/N') AS num_doc_padre,
                ab.name AS libro_contable,
                acc.acctnumber || ' ' || acc.accountsearchdisplayname AS cuenta_contable,
                COALESCE(t_rel.entity, t_orig.entity, 0) AS entity_id,
                COALESCE(e.entityid, 'sin-entidad') AS entity_name,
                'Documento Relacionado' AS tipo_relacion,
                CASE 
                    WHEN t_rel.type = 'Unreval' THEN 'Revaluación Ganancia/Pérdida'
                    WHEN t_rel.type = 'FxReval' THEN 'Revaluación de Moneda Extranjera'
                    WHEN t_rel.type = 'Journal' THEN 'Asiento Contable / Ajuste'
                    ELSE t_rel.type 
                END AS tipo_registro,
                TO_CHAR(t_rel.trandate, 'DD/MM/YYYY') AS fecha,
                t_rel.trandate AS fecha_raw,
                ap_rel.periodname AS periodo_contable,
                COALESCE(c.symbol, 'PEN') AS moneda,
                COALESCE(t_rel.memo, '') AS memo,
                CASE 
                    WHEN INSTR(BUILTIN.DF(t_rel.status), ':') > 0 
                    THEN SUBSTR(BUILTIN.DF(t_rel.status), INSTR(BUILTIN.DF(t_rel.status), ':') + 2)
                    ELSE BUILTIN.DF(t_rel.status)
                END AS estado_documento,
                ROUND(ABS(tal_rel.amount), 2) AS monto_aplicado,
                ROUND(CASE WHEN tal_rel.amount > 0 THEN tal_rel.amount ELSE 0 END, 2) AS debitamount,
                ROUND(CASE WHEN tal_rel.amount < 0 THEN ABS(tal_rel.amount) ELSE ABS(tal_rel.amount) END, 2) AS creditamount,
                0 AS saldo_pendiente
            FROM 
                Transaction t_orig
            INNER JOIN 
                TransactionLine tl ON tl.createdfrom = t_orig.id
            INNER JOIN 
                Transaction t_rel ON t_rel.id = tl.transaction
            INNER JOIN 
                TransactionAccountingLine tal_rel ON tal_rel.transaction = t_rel.id AND tal_rel.accountingbook = ${idLibroContable}
            INNER JOIN 
                AccountingBook ab ON ab.id = tal_rel.accountingbook
            LEFT JOIN 
                Account acc ON acc.id = tal_rel.account
            LEFT JOIN 
                Entity e ON e.id = COALESCE(t_rel.entity, t_orig.entity)
            LEFT JOIN 
                Currency c ON c.id = t_rel.currency
            LEFT JOIN 
                AccountingPeriod ap_rel ON ap_rel.id = t_rel.postingperiod
            WHERE 
                t_orig.type = 'CustInvc'
                AND tal_rel.account IN (${accountsCond})
                ${filterClientRel}
                ${filterDateRel}
                AND t_rel.type IN ('Unreval', 'FxReval', 'Journal')
                AND LOWER(BUILTIN.DF(t_rel.status)) NOT LIKE '%anulado%'
                AND LOWER(BUILTIN.DF(t_rel.status)) NOT LIKE '%voided%'
                AND t_rel.status NOT LIKE '%:V'

            ORDER BY 
                cuenta_contable,
                entity_name,
                num_doc_padre,
                fecha_raw
        `;

        // Retorno Paginado Estándar para Map/Reduce
        return query.runSuiteQLPaged({
            query: sqlDetallado,
            pageSize: 1000
        });

    } catch (e) {
        log.error('Error en GET_INPUT_DATA', e);
        return [];
    }
};

    const MAP = (context) => {
    try {
        if (!context.value) return;

        let searchResult;
        try {
            searchResult = JSON.parse(context.value);
        } catch (parseErr) {
            log.error('Error parseando JSON en MAP. String recibido:', context.value);
            return; // Omite el registro corrupto sin detener la ejecución del Map/Reduce
        }

        // 🔹 SI VIENE DEL SUITEQL RESUMIDO DIRECTO
        if (searchResult.isResumenDirecto) {
            let customGroupingKey = searchResult.cuenta.trim() + "||" + searchResult.entidadId + "||" + searchResult.entidadNombre;
            context.write({
                key: customGroupingKey,
                value: searchResult
            });
            return;
        }

        // 🔹 SI VIENE DEL DETALLADO SUITEQL (3 Quiebres: Cuenta || Entidad || Doc Padre)
        let accountKey = searchResult.cuenta_contable || 'sin-cuenta';
        let entityId   = String(searchResult.entity_id || '@NONE@').trim();
        let entityName = String(searchResult.entity_name || 'sin-entidad').trim();
        let docPadre   = String(searchResult.num_doc_padre || 'SIN_PADRE').trim();

        if (!entityId || entityId === "-" || entityId === "" || entityId === "null" || entityId === "undefined") {
            entityName = "sin-entidad";
            entityId = "@NONE@";
        }

        // Normalización de prefijos de entidad Perú
        if (entityName !== "sin-entidad") {
            if (!/^C-PE-/.test(entityName)) {
                if (/^PE-/.test(entityName)) {
                    entityName = "C-" + entityName;
                } else {
                    entityName = "C-PE-" + entityName;
                }
            }
        }

        let movimientoPayload = {
            docId: searchResult.doc_id,
            docPadreId: searchResult.doc_padre_id,
            doc: searchResult.num_doc || "S/N",
            docPadre: docPadre,
            tipoRelacion: searchResult.tipo_relacion,
            tip: searchResult.tipo_registro,
            fec: searchResult.fecha,
            fechaRaw: searchResult.fecha_raw,
            periodo: searchResult.periodo_contable,
            mon: searchResult.moneda,
            mem: searchResult.memo || '',
            estado: searchResult.estado_documento,
            montoAplicado: parseFloat(searchResult.monto_aplicado) || 0,
            debitamtmn: parseFloat(searchResult.debitamount) || 0,
            creditamtmn: parseFloat(searchResult.creditamount) || 0,
            amt: (parseFloat(searchResult.debitamount) || 0) - (parseFloat(searchResult.creditamount) || 0),
            saldoPendiente: parseFloat(searchResult.saldo_pendiente) || 0,
            entidad: entityName,
            entidadId: entityId,
            cuenta: accountKey
        };

        // Clave de agrupación compuesta para 3 Quiebres: CUENTA || ENTIDAD || DOC_PADRE
        let customGroupingKey = accountKey.trim() + "||" + entityId + "||" + entityName + "||" + docPadre;

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
            // Descomponer la clave de agrupación (3 Quiebres)
            let keyParts = context.key.split('||');
            let cuentaContable = keyParts[0] || 'SIN_CUENTA';
            let idEntidadReal  = keyParts[1] || '@NONE@';
            let nombreEntidad  = keyParts[2] || 'OTROS';
            let numDocPadre    = keyParts[3] || 'SIN_PADRE';

            let primerValor = JSON.parse(context.values[0]);

            // 🔹 SI VIENE DEL PROCESO RESUMIDO DIRECTO POR SUITEQL
            if (primerValor.isResumenDirecto) {
               let totalSaldoIni = 0, totalDeb = 0, totalCred = 0, totalNeto = 0;

               context.values.forEach(v => {
                   let row = JSON.parse(v);
                   totalSaldoIni += parseFloat(row.saldoini) || 0;
                   totalDeb += parseFloat(row.debe) || 0;
                   totalCred += parseFloat(row.haber) || 0;
               });

               let totalNetoCalculado = totalSaldoIni + totalDeb - totalCred;

               context.write({
                   key: cuentaContable,
                   value: {
                       clienteNombre: nombreEntidad,
                       saldoInicial: totalSaldoIni,
                       debeResumen: totalDeb,
                       haberResumen: totalCred,
                       saldoFinalCliente: totalNetoCalculado,
                       movimientosDetalle: []
                   }
               });
               return;
            }

            // 🔹 CÓDIGO NORMAL DE REDUCE PARA EL DETALLADO CON 3 QUIEBRES
            const scriptObj = runtime.getCurrentScript();
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_from_bk' });
            const hideZeroParam = scriptObj.getParameter({ name: 'custscript_mr_hide_zero_bk' });
            const checkFiltrar = (hideZeroParam === 'T' || hideZeroParam === true || hideZeroParam === 'true');
            const bookParam = scriptObj.getParameter({ name: 'custscript_mr_accounting_book_bk' });

            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            let isLibroPrimario = (String(bookParam) === "1");
          
            let movimientos = [];
            let totalDebitoDocPadre = 0;
            let totalCreditoDocPadre = 0;
            let saldoDocPadre = 0;

            // Agrupar movimientos del Documento Padre
            context.values.forEach((val) => {
                let row = JSON.parse(val);
                movimientos.push(row);
                totalDebitoDocPadre += row.debitamtmn;
                totalCreditoDocPadre += row.creditamtmn;
            });

            saldoDocPadre = totalDebitoDocPadre - totalCreditoDocPadre;

            // Ordenar: Factura Principal primero, luego por fecha
            movimientos.sort((a, b) => {
                if (a.tipoRelacion === 'Factura Principal') return -1;
                if (b.tipoRelacion === 'Factura Principal') return 1;
                return new Date(a.fechaRaw) - new Date(b.fechaRaw);
            });

            let sCliIni = 0;
            if (dateFrom) {
               let idCuentaReal = obtenerIdCuentaFiltro(cuentaContable);
               let saldosClientesMap = obtenerSaldosInicialesPorCliente({
                   dateFrom: dateFrom,
                   account: idCuentaReal,
                   client: (idEntidadReal !== '@NONE@' && idEntidadReal !== 'sin-entidad') ? idEntidadReal : null,
                   bookParam: bookParam
               });
               sCliIni = saldosClientesMap[idEntidadReal] || 0;
            }

            // Omitir documentos con saldo e histórico en cero si se solicita
            if (checkFiltrar && Math.abs(parseFloat(saldoDocPadre.toFixed(2))) === 0 && totalDebitoDocPadre === 0 && totalCreditoDocPadre === 0) {
                return;
            }
 
            // Construcción del fragmento XML BFO para la agrupación (Cuenta -> Cliente -> Doc Padre)
            let xmlBloque = '';
            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';

            xmlBloque += '<table style="margin-top:5px;table-layout:fixed;width:100%;">';
            xmlBloque += '<tr class="cli"><td width="70%">{NUM_CLIENTE}. ' + esc(nombreEntidad) + ' | Doc. Padre: <b>' + esc(numDocPadre) + '</b></td><td width="30%" align="right">Saldo Padre: ' + formatNumberPE(saldoDocPadre) + ' ' + labelMonedaBook + '</td></tr>';
            xmlBloque += '</table>';
            
            xmlBloque += '<table style="margin-top:2px;table-layout:fixed;width:100%;"><thead><tr>';
            xmlBloque += '<th width="7%" align="center">Fecha</th>';
            xmlBloque += '<th width="6%" align="center">Período</th>';
            xmlBloque += '<th width="12%" align="center">Relación</th>';
            xmlBloque += '<th width="10%" align="center">Tipo</th>';
            xmlBloque += '<th width="12%" align="center">Documento</th>';
            xmlBloque += '<th width="8%" align="center">Estado</th>';
            xmlBloque += '<th width="15%" align="center">Glosa</th>';
            xmlBloque += '<th width="6%" align="center">Mon.</th>';
            xmlBloque += '<th width="8%" align="center">Débito (' + labelMonedaBook + ')</th>';
            xmlBloque += '<th width="8%" align="center">Crédito (' + labelMonedaBook + ')</th>';
            xmlBloque += '<th width="8%" align="center">Aplicado (' + labelMonedaBook + ')</th></tr></thead><tbody>';

            movimientos.forEach(m => {
                let glosaLimpia = esc(m.mem || '');
                if (glosaLimpia.length > 35) glosaLimpia = glosaLimpia.substring(0, 32) + '...';

                let linkTransaccion = 'https://' + domain + '/app/accounting/transactions/transaction.nl?id=' + m.docId;

                xmlBloque += '<tr>';
                xmlBloque += '<td align="center">' + esc(m.fec) + '</td>';
                xmlBloque += '<td align="center">' + esc(m.periodo) + '</td>';
                xmlBloque += '<td>' + esc(m.tipoRelacion) + '</td>';
                xmlBloque += '<td>' + esc(m.tip) + '</td>';
                xmlBloque += '<td><a href="' + esc(linkTransaccion) + '" style="color: #1a5276; text-decoration: underline;">' + esc(m.doc) + '</a></td>';
                xmlBloque += '<td>' + esc(m.estado) + '</td>';
                xmlBloque += '<td>' + esc(glosaLimpia) + '</td>';
                xmlBloque += '<td align="center">' + esc(m.mon) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(m.debitamtmn) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(m.creditamtmn) + '</td>';
                xmlBloque += '<td align="right">' + formatNumberPE(m.montoAplicado) + '</td>';
                xmlBloque += '</tr>';
            });

            xmlBloque += '<tr style="background-color:#ebf5fb;font-weight:bold;"><td colspan="8" align="right">TOTAL DOC PADRE (' + esc(numDocPadre) + ')</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(totalDebitoDocPadre) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(totalCreditoDocPadre) + '</td>';
            xmlBloque += '<td align="right">' + formatNumberPE(saldoDocPadre) + '</td></tr>';
            xmlBloque += '</tbody></table>';

            // Salida agrupada por Cuenta Contable
            context.write({
                key: cuentaContable,
                value: {
                    clienteNombre: nombreEntidad,
                    docPadre: numDocPadre,
                    xml: xmlBloque,
                    totalDebitoDocPadre: totalDebitoDocPadre,
                    totalCreditoDocPadre: totalCreditoDocPadre,
                    netoAmt: saldoDocPadre,                       
                    saldoInicialCalculado: sCliIni,           
                    saldoFinalCliente: saldoDocPadre,   
                    movimientosDetalle: movimientos,
                    isLibroPrimario: isLibroPrimario
                }
            });

        } catch (e) {
            log.error('Error en REDUCE para clave ' + context.key, e);
        }
    };

    const SUMMARIZE = (summary) => {
        try {
            const scriptObj = runtime.getCurrentScript();
            const dateFrom = scriptObj.getParameter({ name: 'custscript_mr_date_from_bk' });
            const accountSelected = scriptObj.getParameter({ name: 'custscript_mr_account_bk' });
            const dateTo = scriptObj.getParameter({ name: 'custscript_mr_date_to_bk' }); 
            const clientParam = scriptObj.getParameter({ name: 'custscript_mr_client_bk' });
            const bookParam = scriptObj.getParameter({ name: 'custscript_mr_accounting_book_bk' });
          
            let tipoFormato = 'PDF';
            try {
                let paramFormato = scriptObj.getParameter({ name: 'custscript_mr_tipo_formato_bk' });
                if (paramFormato) {
                    tipoFormato = String(paramFormato).toUpperCase().trim();
                }
            } catch (paramErr) {
                log.error('Error leyendo parámetro custscript_mr_tipo_formato_bk, usando PDF por defecto', paramErr);
            }

            log.audit({
                title: 'Summarize - Formato a generar',
                details: 'tipoFormato detectado: ' + tipoFormato
            });
            
            let params = {
                custpage_date_from: dateFrom,
                custpage_account: accountSelected,
                dateTo: dateTo,         
                clientParam: clientParam,
                bookParam: bookParam
            };

            // Lectura de Saldos Globales por Cuenta vía SuiteQL
            let saldosGlobales = obtenerSaldosPorCuenta(params);

            let dataPorCuenta = {};
            summary.output.iterator().each((key, value) => {
                let item = JSON.parse(value);
                if (!dataPorCuenta[key]) {
                    dataPorCuenta[key] = { 
                      clientesBloques: [], 
                      totalMovimientoCuenta: 0
                    };
                }
                dataPorCuenta[key].clientesBloques.push(item);
                dataPorCuenta[key].totalMovimientoCuenta += parseFloat(item.netoAmt) || 0;
    
                return true;
            });

            // Enrutamiento según el formato solicitado
            switch (tipoFormato) {
               case 'EXCEL_RESUMEN':
                     log.audit('Summarize', 'Iniciando generación de EXCEL Resumen...');
                     generarExcelResumen(dataPorCuenta, dateFrom, dateTo, bookParam);
                     break;
               case 'PDF_RESUMEN':
                     log.audit('Summarize', 'Iniciando generación de PDF Resumen...');
                     generarPDFResumen(dataPorCuenta, dateFrom, dateTo, bookParam);
                     break;
               case 'EXCEL':
                     log.audit('Summarize', 'Iniciando generación de EXCEL...');
                     generarExcel(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam);
                     break;
               case 'PDF':
                     default:
                     log.audit('Summarize', 'Iniciando generación de PDF...');
                     generarPDF(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam);
                     break;
            }

        } catch (e) {
            log.error('Error en SUMMARIZE consolidación', e);
        }
    };

    // ==========================================
    // SECCIÓN GENERACIÓN EXCEL (DETALLADO CON 3 QUIEBRES)
    // ==========================================
    function generarExcel(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam) {
        const currentScript = runtime.getCurrentScript();
        const currentUser = runtime.getCurrentUser();

        let mapSaldos = Array.isArray(saldosGlobales) ? saldosGlobales[0] : (saldosGlobales || {});
        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";

        let xlsString = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        xlsString += '<head><meta charset="UTF-8"/><style>';
        xlsString += 'table { border-collapse:collapse; font-family:sans-serif; font-size:9pt; width:100%; margin-top:4px; }';
        xlsString += '.title { font-size:14pt; font-weight:bold; text-align:center; }';
        xlsString += '.header-cta { background-color:#1a252f; color:white; font-weight:bold; }';
        xlsString += '.header-cli { background-color:#d5dbdb; font-weight:bold; }';
        xlsString += '.header-doc { background-color:#eaeded; font-weight:bold; font-style:italic; }';
        xlsString += '.th-sub { background-color:#566573; color:white; font-weight:bold; text-align:center; }';
        xlsString += '.num { mso-number-format:"#,##0.00"; text-align:right; }';
        xlsString += '.total-row { background-color:#ebf5fb; font-weight:bold; }';
        xlsString += '.final-row { background-color:#d5f5e3; font-weight:bold; }';
        xlsString += '</style></head><body>';

        xlsString += '<table><tr><td colspan="11" class="title">REPORTE DETALLADO DE CUENTAS POR COBRAR</td></tr>';
        xlsString += '<tr><td colspan="11" style="text-align:center;">Rango: ' + esc(dateFrom) + ' al ' + esc(dateTo) + '<br/>Libro Contable: ' + esc(nombreLibro) +'</td></tr></table><br/>';

        let totalCuentasProcesadas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentasProcesadas++;
            let isLibroPrimario = (String(bookParam) === "1");
            let saldoInicialCuenta = 0;

            if (mapSaldos[cKey] && mapSaldos[cKey].monto !== undefined) {
                saldoInicialCuenta = parseFloat(mapSaldos[cKey].monto) || 0;
            } else if (typeof mapSaldos[cKey] === 'number') {
                saldoInicialCuenta = parseFloat(mapSaldos[cKey]) || 0;
            }

            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';

            xlsString += '<table border="1">';
            xlsString += '<tr class="header-cta"><td colspan="8">CUENTA: ' + esc(cKey) + '</td><td colspan="2" align="right">SALDO INI (' + labelMonedaBook + '):</td><td class="num">' + formatNumberPE(saldoInicialCuenta) + '</td></tr>';

            // Ordenamiento por Entidad y Documento Padre
            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                let compEnt = (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
                if (compEnt !== 0) return compEnt;
                return (a.docPadre || "").toUpperCase().localeCompare((b.docPadre || "").toUpperCase());
            });

            let contadorCliente = 1;
            dataPorCuenta[cKey].clientesBloques.forEach(bloque => {
                xlsString += '<tr class="header-cli"><td colspan="11">' + contadorCliente + '. CLIENTE: ' + esc(bloque.clienteNombre) + ' | DOC PADRE: ' + esc(bloque.docPadre) + '</td></tr>';
                xlsString += '<tr>';
                xlsString += '<th class="th-sub">Fecha</th><th class="th-sub">Período</th><th class="th-sub">Relación</th><th class="th-sub">Tipo</th><th class="th-sub">Documento</th><th class="th-sub">Estado</th><th class="th-sub">Glosa</th>';
                xlsString += '<th class="th-sub">Mon.</th>';
                xlsString += '<th class="th-sub">Débito (' + labelMonedaBook + ')</th><th class="th-sub">Crédito (' + labelMonedaBook + ')</th>';
                xlsString += '<th class="th-sub">Aplicado (' + labelMonedaBook + ')</th></tr>';

                let tDeb = 0, tCred = 0;

                bloque.movimientosDetalle.forEach(m => {
                    tDeb += m.debitamtmn; 
                    tCred += m.creditamtmn;

                    xlsString += '<tr>';
                    xlsString += '<td align="center">' + esc(m.fec) + '</td>';
                    xlsString += '<td align="center">' + esc(m.periodo) + '</td>';
                    xlsString += '<td>' + esc(m.tipoRelacion) + '</td>';
                    xlsString += '<td>' + esc(m.tip) + '</td>';
                    xlsString += '<td>' + esc(m.doc) + '</td>';
                    xlsString += '<td align="center">' + esc(m.estado) + '</td>';
                    xlsString += '<td>' + esc(m.mem) + '</td>';
                    xlsString += '<td align="center">' + esc(m.mon) + '</td>';
                    xlsString += '<td class="num">' + formatNumberPE(m.debitamtmn) + '</td>';
                    xlsString += '<td class="num">' + formatNumberPE(m.creditamtmn) + '</td>';
                    xlsString += '<td class="num">' + formatNumberPE(m.montoAplicado) + '</td>';
                    xlsString += '</tr>';
                });

                xlsString += '<tr class="total-row"><td colspan="8" align="right">SUBTOTAL DOC PADRE (' + esc(bloque.docPadre) + ')</td>';
                xlsString += '<td class="num">' + formatNumberPE(tDeb) + '</td><td class="num">' + formatNumberPE(tCred) + '</td>';
                xlsString += '<td class="num">' + formatNumberPE(bloque.netoAmt) + '</td></tr>';

                contadorCliente++;
            });

            let saldoFinalCuenta = saldoInicialCuenta + dataPorCuenta[cKey].totalMovimientoCuenta;
            xlsString += '<tr class="total-row"><td colspan="10" align="right">TOTAL MOVIMIENTOS CUENTA (' + labelMonedaBook + '):</td><td class="num">' + formatNumberPE(dataPorCuenta[cKey].totalMovimientoCuenta) + '</td></tr>';
            xlsString += '<tr class="final-row"><td colspan="10" align="right">SALDO FINAL CUENTA (' + labelMonedaBook + '):</td><td class="num">' + formatNumberPE(saldoFinalCuenta) + '</td></tr>';
            xlsString += '</table><br/>';
        }

        if (totalCuentasProcesadas === 0) {
            xlsString += '<p style="font-size:11pt; margin-top:20px; text-align:center;">No se encontraron movimientos con los criterios seleccionados.</p>';
        }

        xlsString += '</body></html>';
      
        let authorId = currentUser.id;
        if (!authorId || authorId === -4 || authorId === '-4') authorId = 1513;

        let excelFileName = authorId + '_Reporte_Detallado_CxC_' + new Date().getTime() + '.xls';
      
        let excelFileObj = file.create({
            name: excelFileName,
            fileType: file.Type.PLAINTEXT,
            contents: xlsString,
            folder: 405143
        });

        let fileId = excelFileObj.save();
        xlsString = null;

        let zipArchiver = compress.createArchiver();
        zipArchiver.add({ file: file.load({ id: fileId }) });
        
        let zipFileObj = zipArchiver.archive({
            name: excelFileName.replace('.xls', '.zip')
        });

        zipFileObj.folder = 405143;
        let zipFileId = zipFileObj.save();

        const bccEmails = ['jesusc1967@hotmail.com'];

        try {
            if (zipFileId && authorId) {
               email.send({
                   author: parseInt(authorId, 10),
                   recipients: bccEmails,
                   subject: 'Su Reporte Detallado de CxC Excel está listo',
                   body: 'Estimado usuario,\n\nSe ha completado la generación de su reporte detallado de cuentas por cobrar en formato Excel.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })]
               });
            }
        } catch (mailError) {
            log.error('Error enviando correo Excel', mailError);
        }

        log.audit('PROCESO FINALIZADO EXCEL', 'Excel generado con éxito. File ID: ' + fileId + ' | ZIP ID: ' + zipFileId);
    }

    // ==========================================
    // SECCIÓN GENERACIÓN PDF
    // ==========================================
    function generarPDF(dataPorCuenta, saldosGlobales, dateFrom, dateTo, bookParam) {
        let logoUrl = '';
        const currentScript = runtime.getCurrentScript();
        const currentUser = runtime.getCurrentUser();
         
        try {
            const logoFile = file.load({ id: '2240' });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;
        } catch (err) {
            log.error('Error cargando logo', err);
        }

        let mapSaldos = Array.isArray(saldosGlobales) ? saldosGlobales[0] : (saldosGlobales || {});
        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";

        let xmlFinal = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xmlFinal += '<pdf><head><macrolist>';
        xmlFinal += '<macro id="h"><table style="width:100%;"><tr>';

        let tagLogo = '';
        if (logoUrl) {
            let rawUrl = String(logoUrl).replace(/&amp;/g, '&');
            let safeUrl = rawUrl.replace(/&/g, '&amp;');
            tagLogo = '<img src="' + safeUrl + '" style="width:120px;height:40px;"/>';
        }
        
        xmlFinal += '<td width="30%">' + tagLogo + '</td>';
        xmlFinal += '<td width="40%" align="center" style="font-size:11pt;"><b>Reporte detallado CxC</b></td>';
        xmlFinal += '<td width="30%" align="right" style="font-size:7pt;">' + esc(dateFrom) + ' al ' + esc(dateTo) + '<br/>Libro: ' + esc(nombreLibro) + '</td>';
        xmlFinal += '</tr></table></macro></macrolist>';

        xmlFinal += '<style>';
        xmlFinal += 'body { font-family:sans-serif; font-size:6pt; }';
        xmlFinal += 'table { width:100%; border-collapse:collapse; margin-top:4px; table-layout:fixed; }';
        xmlFinal += 'th { background-color:#566573; color:white; font-weight:bold; padding:2px; font-size:5.5pt; }';
        xmlFinal += 'td { border:0.1pt solid #bdc3c7; padding:1.5px; font-size:5.5pt; vertical-align:middle; }';
        xmlFinal += '.cta { background-color:#1a252f; color:white; font-weight:bold; padding:3px; font-size:6.5pt; }';
        xmlFinal += '.cli { background-color:#d5dbdb; font-weight:bold; padding:2px; font-size:6pt; }';
        xmlFinal += '</style></head>';

        xmlFinal += '<body size="letter" header="h" header-height="45pt" padding="0.2in 0.2in 0.3in 0.2in">';
      
        let totalCuentasProcesadas = 0;
        for (let cKey in dataPorCuenta) {
            totalCuentasProcesadas++;
            let isLibroPrimario = (String(bookParam) === "1");
            let saldoInicialCuenta = 0;
        
            if (mapSaldos[cKey] && mapSaldos[cKey].monto !== undefined) {
                saldoInicialCuenta = parseFloat(mapSaldos[cKey].monto) || 0;
            } else if (typeof mapSaldos[cKey] === 'number') {
                saldoInicialCuenta = parseFloat(mapSaldos[cKey]) || 0;
            }
          
            let labelMonedaBook = isLibroPrimario ? 'PEN' : 'USD';

            xmlFinal += '<table style="margin-top:15px; border:1pt solid black;width:100%;table-layout:fixed;"><tr class="cta">';
            xmlFinal += '<td width="70%">CUENTA: ' + esc(cKey) + '</td>';
            xmlFinal += '<td width="18%" align="right">SALDO INI (' + labelMonedaBook + '): </td>';
            xmlFinal += '<td width="12%" align="right">' + formatNumberPE(saldoInicialCuenta) + '</td></tr></table>';

            // Ordenamiento por Cliente y Doc Padre
            dataPorCuenta[cKey].clientesBloques.sort((a, b) => {
                let compEnt = (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase());
                if (compEnt !== 0) return compEnt;
                return (a.docPadre || "").toUpperCase().localeCompare((b.docPadre || "").toUpperCase());
            });

            let contadorCliente = 1;
            let bloquesXmlOrdenados = dataPorCuenta[cKey].clientesBloques.map(item => {
                let bloqueFinal = item.xml.replace('{NUM_CLIENTE}', contadorCliente);
                contadorCliente++;
                return bloqueFinal;
            });

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

        let authorId = currentUser.id;
        if (!authorId || authorId === -4 || authorId === '-4') authorId = 1513;

        let pdfFileObj = render.xmlToPdf({ xmlString: xmlFinal });
        let pdfFileName = authorId + '_Reporte_Detallado_CxC_' + new Date().getTime() + '.pdf';
        pdfFileObj.name = pdfFileName;
        pdfFileObj.folder = 405143; 

        let fileId = pdfFileObj.save();

        let zipArchiver = compress.createArchiver();
        zipArchiver.add({ file: file.load({ id: fileId }) });
        
        let zipFileObj = zipArchiver.archive({
            name: pdfFileName.replace('.pdf', '.zip')
        });

        zipFileObj.folder = 405143;
        let zipFileId = zipFileObj.save();

        const bccEmails = ['jesusc1967@hotmail.com'];

        try {
            if (zipFileId && authorId) {
               email.send({
                   author: parseInt(authorId, 10),
                   recipients: bccEmails,
                   subject: 'Su Reporte Detallado de CxC PDF está listo',
                   body: 'Estimado usuario,\n\nSe ha completado la generación de su reporte detallado de cuentas por cobrar.\n\nAtentamente,\nÁrea de Sistemas.',
                   attachments: [file.load({ id: zipFileId })]
               });
            }
        } catch (mailError) {
            log.error('Error enviando correo', mailError);
        }

        log.audit('PROCESO FINALIZADO PDF', 'PDF generado con éxito. File ID: ' + fileId + ' | ZIP ID: ' + zipFileId);
    }

    function generarPDFResumen(dataPorCuenta, dateFrom, dateTo, bookParam) {
        let logoUrl = '';
        const currentScript = runtime.getCurrentScript();
        const currentUser = runtime.getCurrentUser();

        try {
            const logoFile = file.load({ id: '2240' });
            const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
            logoUrl = 'https://' + domain + logoFile.url;
        } catch (err) {
            log.error('Error cargando logo PDF Resumen', err);
        }

        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";
        let labelMonedaBook = (String(bookParam) === "1") ? "PEN" : "USD";

        let xmlFinal = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">';
        xmlFinal += '<pdf><head><macrolist>';
        xmlFinal += '<macro id="h"><table style="width:100%;"><tr>';

        let tagLogo = logoUrl ? '<img src="' + esc(logoUrl) + '" style="width:120px;height:40px;"/>' : '';
        xmlFinal += '<td width="30%">' + tagLogo + '</td>';
        xmlFinal += '<td width="40%" align="center" style="font-size:11pt;"><b>RESUMEN DE CUENTAS POR COBRAR</b></td>';
        xmlFinal += '<td width="30%" align="right" style="font-size:7pt;">' + esc(dateFrom) + ' al ' + esc(dateTo) + '<br/>Libro: ' + esc(nombreLibro) + '</td>';
        xmlFinal += '</tr></table></macro></macrolist>';

        xmlFinal += '<style>';
        xmlFinal += 'body { font-family:sans-serif; font-size:7pt; }';
        xmlFinal += 'table { width:100%; border-collapse:collapse; margin-top:6px; table-layout:fixed; }';
        xmlFinal += 'th { background-color:#1a252f; color:white; font-weight:bold; padding:3px; font-size:6.5pt; }';
        xmlFinal += 'td { border:0.1pt solid #bdc3c7; padding:2px; font-size:6.5pt; vertical-align:middle; }';
        xmlFinal += '.cta { background-color:#2c3e50; color:white; font-weight:bold; padding:3px; font-size:7pt; }';
        xmlFinal += '.tot { background-color:#ebf5fb; font-weight:bold; }';
        xmlFinal += '</style></head>';

        xmlFinal += '<body size="letter" header="h" header-height="45pt" padding="0.2in 0.2in 0.3in 0.2in">';

        for (let cKey in dataPorCuenta) {
            xmlFinal += '<table style="margin-top:10px;"><tr class="cta"><td colspan="6">CUENTA: ' + esc(cKey) + '</td></tr></table>';
            xmlFinal += '<table><thead><tr>';
            xmlFinal += '<th width="40%" align="left">Cliente / Entidad</th>';
            xmlFinal += '<th width="12%" align="right">Saldo Inicial (' + labelMonedaBook + ')</th>';
            xmlFinal += '<th width="12%" align="right">Débito (' + labelMonedaBook + ')</th>';
            xmlFinal += '<th width="12%" align="right">Crédito (' + labelMonedaBook + ')</th>';
            xmlFinal += '<th width="12%" align="right">Neto (' + labelMonedaBook + ')</th>';
            xmlFinal += '<th width="12%" align="right">Saldo Final (' + labelMonedaBook + ')</th>';
            xmlFinal += '</tr></thead><tbody>';

            let tIni = 0, tDeb = 0, tCred = 0, tNeto = 0, tFin = 0;

            dataPorCuenta[cKey].clientesBloques.sort((a, b) => 
                (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase())
            );

            dataPorCuenta[cKey].clientesBloques.forEach(b => {
                let sIni = parseFloat(b.saldoInicial || b.saldoInicialCliente) || 0;
                let sDeb = parseFloat(b.debeResumen) || 0;
                let sCred = parseFloat(b.haberResumen) || 0;
                let sNeto = sDeb - sCred;
                let sFin = sIni + sDeb - sCred;

                tIni += sIni;
                tDeb += sDeb;
                tCred += sCred;
                tNeto += sNeto; 
                tFin += sFin;
              
                xmlFinal += '<tr>';
                xmlFinal += '<td>' + esc(b.clienteNombre) + '</td>';
                xmlFinal += '<td align="right">' + formatNumberPE(sIni) + '</td>';
                xmlFinal += '<td align="right">' + formatNumberPE(sDeb) + '</td>';
                xmlFinal += '<td align="right">' + formatNumberPE(sCred) + '</td>';
                xmlFinal += '<td align="right">' + formatNumberPE(sNeto) + '</td>';
                xmlFinal += '<td align="right">' + formatNumberPE(sFin) + '</td>';
                xmlFinal += '</tr>';
            });

            xmlFinal += '<tr class="tot">';
            xmlFinal += '<td align="right">TOTAL CUENTA:</td>';
            xmlFinal += '<td align="right">' + formatNumberPE(tIni) + '</td>';
            xmlFinal += '<td align="right">' + formatNumberPE(tDeb) + '</td>';
            xmlFinal += '<td align="right">' + formatNumberPE(tCred) + '</td>';
            xmlFinal += '<td align="right">' + formatNumberPE(tNeto) + '</td>';
            xmlFinal += '<td align="right">' + formatNumberPE(tFin) + '</td>';
            xmlFinal += '</tr></tbody></table>';
        }

        xmlFinal += '</body></pdf>';

        let pdfFileObj = render.xmlToPdf({ xmlString: xmlFinal });
        let pdfFileName = currentUser.id + '_Reporte_Resumen_CxC_' + new Date().getTime() + '.pdf';
        pdfFileObj.name = pdfFileName;
        pdfFileObj.folder = 405143; 
        let fileId = pdfFileObj.save();

        let zipArchiver = compress.createArchiver();
        zipArchiver.add({ file: file.load({ id: fileId }) });

        let zipFileObj = zipArchiver.archive({ 
            name: pdfFileName.replace(/\.(pdf|xls)$/i, '.zip') 
        });
        zipFileObj.folder = 405143;
        let zipFileId = zipFileObj.save();

        let authorId = currentUser.id;
        if (!authorId || authorId === -4 || authorId === '-4') authorId = 1513;

        email.send({
            author: parseInt(authorId, 10),
            recipients: ['jesusc1967@hotmail.com'],
            subject: 'Su Reporte CxC está listo',
            body: 'Estimado usuario,\n\nSe ha completado la generación de su reporte.\n\nAtentamente,\nÁrea de Sistemas.',
            attachments: [file.load({ id: zipFileId })]
        });

        log.audit('PROCESO FINALIZADO PDF RESUMEN', 'PDF generado con éxito. File ID: ' + fileId + ' | ZIP ID: ' + zipFileId);
     }

     function generarExcelResumen(dataPorCuenta, dateFrom, dateTo, bookParam) {
        const currentScript = runtime.getCurrentScript();
        const currentUser = runtime.getCurrentUser();

        let nombreLibro = (String(bookParam) === "1") ? "Primary Accounting Book (PEN)" : "USD GAAP (USD)";
        let labelMonedaBook = (String(bookParam) === "1") ? "PEN" : "USD";

        let xlsString = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        xlsString += '<head><meta charset="UTF-8"/><style>';
        xlsString += 'table { border-collapse:collapse; font-family:sans-serif; font-size:9pt; width:100%; margin-top:4px; }';
        xlsString += '.title { font-size:13pt; font-weight:bold; text-align:center; }';
        xlsString += '.header-cta { background-color:#1a252f; color:white; font-weight:bold; }';
        xlsString += '.th-sub { background-color:#34495e; color:white; font-weight:bold; text-align:center; }';
        xlsString += '.num { mso-number-format:"#,##0.00"; text-align:right; }';
        xlsString += '.total-row { background-color:#ebf5fb; font-weight:bold; }';
        xlsString += '</style></head><body>';

        xlsString += '<table><tr><td colspan="6" class="title">RESUMEN DE CUENTAS POR COBRAR</td></tr>';
        xlsString += '<tr><td colspan="6" style="text-align:center;">Rango: ' + esc(dateFrom) + ' al ' + esc(dateTo) + ' | Libro: ' + esc(nombreLibro) + '</td></tr></table><br/>';

        for (let cKey in dataPorCuenta) {
            xlsString += '<table border="1">';
            xlsString += '<tr class="header-cta"><td colspan="6">CUENTA: ' + esc(cKey) + '</td></tr>';
            xlsString += '<tr>';
            xlsString += '<th class="th-sub">Cliente / Entidad</th>';
            xlsString += '<th class="th-sub">Saldo Inicial (' + labelMonedaBook + ')</th>';
            xlsString += '<th class="th-sub">Débito (' + labelMonedaBook + ')</th>';
            xlsString += '<th class="th-sub">Crédito (' + labelMonedaBook + ')</th>';
            xlsString += '<th class="th-sub">Neto (' + labelMonedaBook + ')</th>';
            xlsString += '<th class="th-sub">Saldo Final (' + labelMonedaBook + ')</th>';
            xlsString += '</tr>';

            let tIni = 0, tDeb = 0, tCred = 0, tNeto = 0, tFin = 0;

            dataPorCuenta[cKey].clientesBloques.sort((a, b) => 
                (a.clienteNombre || "").toUpperCase().localeCompare((b.clienteNombre || "").toUpperCase())
            );

            dataPorCuenta[cKey].clientesBloques.forEach(b => {
                let sIni = parseFloat(b.saldoInicial || b.saldoInicialCliente) || 0;
                let sDeb = parseFloat(b.debeResumen) || 0;
                let sCred = parseFloat(b.haberResumen) || 0;
                let sNeto = sDeb - sCred;
                let sFin = sIni + sDeb - sCred;

                tIni += sIni;
                tDeb += sDeb;
                tCred += sCred;
                tNeto += sNeto; 
                tFin += sFin;
 
               xlsString += '<tr>';
               xlsString += '<td>' + esc(b.clienteNombre) + '</td>';
               xlsString += '<td class="num">' + formatNumberPE(sIni) + '</td>';
               xlsString += '<td class="num">' + formatNumberPE(sDeb) + '</td>';
               xlsString += '<td class="num">' + formatNumberPE(sCred) + '</td>';
               xlsString += '<td class="num">' + formatNumberPE(sNeto) + '</td>';
               xlsString += '<td class="num">' + formatNumberPE(sFin) + '</td>';
               xlsString += '</tr>';
            });

            xlsString += '<tr class="total-row">';
            xlsString += '<td align="right">TOTAL CUENTA:</td>';
            xlsString += '<td class="num">' + formatNumberPE(tIni) + '</td>';
            xlsString += '<td class="num">' + formatNumberPE(tDeb) + '</td>';
            xlsString += '<td class="num">' + formatNumberPE(tCred) + '</td>';
            xlsString += '<td class="num">' + formatNumberPE(tNeto) + '</td>';
            xlsString += '<td class="num">' + formatNumberPE(tFin) + '</td>';
            xlsString += '</tr></table><br/>';
        }

        xlsString += '</body></html>';

        let excelFileName = currentUser.id + '_Reporte_Resumen_CxC_' + new Date().getTime() + '.xls';
        let excelFileObj = file.create({
            name: excelFileName,
            fileType: file.Type.PLAINTEXT,
            contents: xlsString,
            folder: 405143
        });

        let fileId = excelFileObj.save();

         let zipArchiver = compress.createArchiver();
         zipArchiver.add({ file: file.load({ id: fileId }) });

         let zipFileObj = zipArchiver.archive({ 
             name: excelFileName.replace(/\.(pdf|xls)$/i, '.zip') 
         });
         zipFileObj.folder = 405143;
         let zipFileId = zipFileObj.save();

         let authorId = currentUser.id;
         if (!authorId || authorId === -4 || authorId === '-4') authorId = 1513;

         email.send({
              author: parseInt(authorId, 10),
              recipients: ['jesusc1967@hotmail.com'],
              subject: 'Su Reporte CxC está listo',
              body: 'Estimado usuario,\n\nSe ha completado la generación de su reporte en formato Excel.\n\nAtentamente,\nÁrea de Sistemas.',
              attachments: [file.load({ id: zipFileId })]
         });

        log.audit('PROCESO FINALIZADO EXCEL RESUMEN', 'Excel generado con éxito. File ID: ' + fileId + ' | ZIP ID: ' + zipFileId);
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
        let idLibroContable = params.bookParam ? String(params.bookParam) : '1';

        let accounts = params.custpage_account 
            ? (Array.isArray(params.custpage_account) ? params.custpage_account : [params.custpage_account]) 
            : ['4896', '4897'];

        let accountsCondition = accounts.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',');

        if (!accountsCondition) {
           log.error('obtenerSaldosPorCuenta', 'No se proporcionaron IDs de cuentas válidos.');
           return [saldosCuentas];
        }

        try {
            let filtroFechaPeriodo = '';
            if (params.custpage_date_from) {
               filtroFechaPeriodo = `
                   AND ap.enddate < TO_DATE('${params.custpage_date_from}', 'DD/MM/YYYY')
               `;
            }

            let sql = `
                SELECT 
                    acc.acctnumber || ' ' || acc.accountsearchdisplayname AS cuenta_nombre,
                    ROUND(SUM(CASE WHEN tal.accountingbook = 1 THEN tal.amount ELSE 0 END), 2) AS saldo_pen,
                    ROUND(SUM(CASE WHEN tal.accountingbook = 2 THEN tal.amount ELSE 0 END), 2) AS saldo_usd
                FROM 
                    TransactionAccountingLine tal
                INNER JOIN 
                    transaction t ON t.id = tal.transaction
                INNER JOIN 
                    account acc ON acc.id = tal.account
                INNER JOIN 
                    AccountingPeriod ap ON ap.id = t.postingperiod
                WHERE 
                    tal.account IN (${accountsCondition})
                    AND t.posting = 'T'
                    ${filtroFechaPeriodo}
                 GROUP BY 
                    acc.acctnumber, 
                    acc.accountsearchdisplayname
                HAVING 
                   SUM(CASE WHEN tal.accountingbook = 1 THEN tal.amount ELSE 0 END) != 0
                   OR SUM(CASE WHEN tal.accountingbook = 2 THEN tal.amount ELSE 0 END) != 0
            `;

            let MontoFinal = 0;
            let queryResult = query.runSuiteQL({ query: sql }).asMappedResults();

            queryResult.forEach(row => {
                       let accountName = row.cuenta_nombre || 'Sin Cuenta';
                       let MontoMN =  parseFloat(row.saldo_pen) || 0;
                       let MontoME =  parseFloat(row.saldo_usd) || 0;

                  if (idLibroContable === '1') {
                      MontoFinal = MontoMN;
                  } else {
                      MontoFinal =  MontoME;
                  }
              
                  saldosCuentas[accountName] = (saldosCuentas[accountName] || 0) + MontoFinal;
            });

            Object.keys(saldosCuentas).forEach(key => {
                   saldosCuentas[key] = Math.round((saldosCuentas[key] + Number.EPSILON) * 100) / 100;
            });

        } catch (e) {
            log.error('Error en obtenerSaldosPorCuenta (SuiteQL)', {
                mensaje: e.message || e.toString(),
                stack: e.stack
             });
        }

        return [saldosCuentas];
    }

     function obtenerSaldosInicialesPorCliente(params) {
        let saldosEntidadMap = {};

        try {
           params = params || {};
           let idLibroContable = params.bookParam ? String(params.bookParam) : '1';

           let rawAccount = params.custpage_account || params.account || '4896';
           let cleanAccountId = parseInt(String(rawAccount).trim(), 10);

           if (isNaN(cleanAccountId) || cleanAccountId <= 0) {
              log.error('obtenerSaldosInicialesPorCliente', 'ID de cuenta invalido: ' + rawAccount);
              return saldosEntidadMap;
           }

          let targetClient = params.client;
          let targetClientID = parseInt(String(targetClient).trim(), 10);

          if (isNaN(targetClientID) || targetClientID <= 0) {
             log.error('obtenerSaldosInicialesPorCliente', 'ID de cliente invalido: ' + targetClient);
             return saldosEntidadMap;
          }

          let fechaDesdeRaw = params.custpage_date_from || params.dateFrom;
          let filtroFechaPeriodo = '';

          if (fechaDesdeRaw) {
             let partesFecha = String(fechaDesdeRaw).trim().split('/');
             if (partesFecha.length === 3) {
                let dia = partesFecha[0].padStart(2, '0');
                let mes = partesFecha[1].padStart(2, '0');
                let anio = partesFecha[2];
                
                filtroFechaPeriodo = ` AND ap.enddate < TO_DATE('${dia}/${mes}/${anio}', 'DD/MM/YYYY')`;
             }
          }

          let sql = `
            SELECT 
               COALESCE(tl.entity, t.entity) AS entidad_id,
               COALESCE(BUILTIN.DF(tl.entity), BUILTIN.DF(t.entity)) AS entidad_nombre,
               ROUND(SUM(CASE WHEN tal.accountingbook = 1 THEN tal.amount ELSE 0 END), 2) AS saldo_pen,
               ROUND(SUM(CASE WHEN tal.accountingbook = 2 THEN tal.amount ELSE 0 END), 2) AS saldo_usd
            FROM 
                TransactionAccountingLine tal
            INNER JOIN 
                transaction t ON t.id = tal.transaction
            INNER JOIN 
                TransactionLine tl ON tl.transaction = tal.transaction AND tl.id = tal.transactionline
            INNER JOIN 
                account acc ON acc.id = tal.account
            INNER JOIN 
                AccountingPeriod ap ON ap.id = t.postingperiod
            WHERE 
                tal.account = ${cleanAccountId}
                AND t.posting = 'T'
                AND (tl.entity = ${targetClientID} OR t.entity = ${targetClientID})
                ${filtroFechaPeriodo}
             GROUP BY  
                COALESCE(tl.entity, t.entity) , 
                COALESCE(BUILTIN.DF(tl.entity), BUILTIN.DF(t.entity))
        `;

        let queryResult = query.runSuiteQL({ query: sql }).asMappedResults();

        if (queryResult && queryResult.length > 0) {
            let row = queryResult[0];

            let targetClientID =  row.entidad_id;
            let targetClient =  row.entidad_nombre;
            
            let rawPen = row.saldo_pen !== undefined ? row.saldo_pen : (row.SALDO_PEN || 0);
            let rawUsd = row.saldo_usd !== undefined ? row.saldo_usd : (row.SALDO_USD || 0);

            let MontoMN = parseFloat(rawPen) || 0;
            let MontoME = parseFloat(rawUsd) || 0;
            
            let MontoFinal = (idLibroContable === '1') ? MontoMN : MontoME;

            let keyEntidad = String(targetClientID);
            saldosEntidadMap[keyEntidad] = Math.round((MontoFinal + Number.EPSILON) * 100) / 100;
          
        } else {
            saldosEntidadMap[String(targetClientID)] = 0;
        }

        } catch (e) {
            log.error('Error en obtenerSaldosInicialesPorCliente', {
               mensaje: e.message || e.toString(),
               stack: e.stack,
               paramsPassed: params
            });
        }

        return saldosEntidadMap;
    }

const obtenerResumenCxCSuiteQL = (params) => {
    let idLibroContable = params.bookParam ? parseInt(params.bookParam, 10) : 1;
    let accounts = params.accountParam ? (Array.isArray(params.accountParam) ? params.accountParam : [params.accountParam]) : ['4896'];
    let accountsCond = accounts.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',') || '4896';

    let sqlResumen = `
        SELECT 
            1 AS is_resumen,
            acc.acctnumber || ' ' || acc.accountsearchdisplayname AS cuenta_contable,
            COALESCE(e.entityid, 'sin-entidad') AS cliente,
            ROUND(SUM(CASE WHEN tal.amount > 0 THEN tal.amount ELSE 0 END), 2) AS total_debit,
            ROUND(SUM(CASE WHEN tal.amount < 0 THEN ABS(tal.amount) ELSE 0 END), 2) AS total_credit,
            ROUND(SUM(tal.amount), 2) AS saldo_total
        FROM 
            Transaction t
        INNER JOIN 
            TransactionAccountingLine tal ON tal.transaction = t.id AND tal.accountingbook = ${idLibroContable}
        INNER JOIN 
            Account acc ON acc.id = tal.account
        LEFT JOIN 
            Entity e ON e.id = t.entity
        WHERE 
            tal.account IN (${accountsCond})
        GROUP BY 
            acc.acctnumber, acc.accountsearchdisplayname, e.entityid
    `;

    return query.runSuiteQLPaged({
        query: sqlResumen,
        pageSize: 1000
    });
};

      return {
          getInputData: GET_INPUT_DATA,
          map: MAP,
          reduce: REDUCE,
          summarize: SUMMARIZE
      };
});