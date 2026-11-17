/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * HT PE - Carga de series en Órdenes de Compra (interfaz)
 *
 * 1. GET            : formulario para subir el CSV (+ últimas cargas). Plantilla con ?plantilla=T.
 * 2. POST validar   : lee el CSV, lo valida contra la OC y muestra el resultado.
 *                     Si hay líneas válidas guarda HT_PE_CS_VAL_*.json y muestra "Ejecutar carga".
 * 3. POST ejecutar  : renombra el archivo a HT_PE_CS_JOB_<id>.json (en cola) y lanza
 *                     HT_PE_MR_CARGA_SERIES_OC, que procesa los archivos en cola.
 * 4. GET ?job=      : estado de la ejecución y resultado por OC.
 * 5. GET ?historial=T / POST historial : últimas 30 cargas, filtrables por fecha (auditoría).
 *
 * Sin parámetros de script: carpeta e IDs están fijos en CONFIG de la librería.
 * La interfaz usa solo estilos en línea (sin recursos externos).
 */
define(['N/ui/serverWidget', 'N/ui/message', 'N/file', 'N/task', 'N/redirect', 'N/runtime', 'N/url', 'N/search', 'N/format', 'N/log', './HT_PE_LIB_CARGA_SERIES_OC'],
    (ui, message, file, task, redirect, runtime, url, search, format, log, lib) => {

        const TITLE = 'Carga de series en Órdenes de Compra';
        const STEPS = ['Cargar archivo', 'Validación', 'Ejecución', 'Resultado'];
        const FOLDER = lib.CONFIG.FOLDER_ID;
        const AUTO_REFRESH_SECONDS = 10;

        const CSS = '<style>' +
            '.htcs{color:#1f2937;font-size:13px;max-width:1400px}' +
            '.htcs-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:14px 18px;margin:6px 0 14px;' +
            'border:1px solid #dfe3e8;border-left:4px solid #0f5ea8;border-radius:6px;background:#fff}' +
            '.htcs-title{font-size:17px;font-weight:600;color:#0f2b46}' +
            '.htcs-sub{color:#5f6b7a;margin-top:3px}' +
            '.htcs-steps{display:flex;gap:6px;flex-wrap:wrap}' +
            '.htcs-step{display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:14px;background:#f1f3f5;color:#6b7280;font-size:12px}' +
            '.htcs-step b{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#c9d0d8;color:#fff;font-size:11px}' +
            '.htcs-step.done{background:#e7f3ec;color:#1e7b34}.htcs-step.done b{background:#1e7b34}' +
            '.htcs-step.on{background:#e3eefb;color:#0f5ea8;font-weight:600}.htcs-step.on b{background:#0f5ea8}' +
            '.htcs-kpis{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}' +
            '.htcs-kpi{min-width:140px;flex:1;padding:10px 14px;border:1px solid #dfe3e8;border-radius:6px;background:#fff}' +
            '.htcs-kpi .v{font-size:22px;font-weight:600;line-height:1.2;color:#1f2937}' +
            '.htcs-kpi .l{color:#5f6b7a;font-size:12px;margin-top:2px}' +
            '.htcs-kpi.ok .v{color:#1e7b34}.htcs-kpi.err .v{color:#b3261e}.htcs-kpi.warn .v{color:#8a5300}.htcs-kpi.info .v{color:#0f5ea8}' +
            '.htcs-meta{display:flex;flex-wrap:wrap;gap:6px 24px;padding:10px 14px;margin:0 0 14px;border:1px solid #dfe3e8;border-radius:6px;background:#fafbfc}' +
            '.htcs-meta span{color:#5f6b7a}.htcs-meta b{font-weight:600;color:#1f2937}' +
            '.htcs-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}' +
            '.htcs-btn{display:inline-block;padding:6px 14px;border:1px solid #c5ccd4;border-radius:4px;background:#fff;' +
            'color:#1f2937 !important;text-decoration:none !important;font-size:12px}' +
            '.htcs-btn:hover{background:#f1f3f5;border-color:#9aa5b1}' +
            '.htcs-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap}' +
            '.htcs-pill.ok{background:#e7f3ec;color:#1e7b34}.htcs-pill.err{background:#fdecea;color:#b3261e}' +
            '.htcs-pill.warn{background:#fff4e5;color:#8a5300}.htcs-pill.info{background:#e3eefb;color:#0f5ea8}' +
            '.htcs-pill.muted{background:#f1f3f5;color:#4b5563}' +
            '.htcs-callout{padding:10px 14px;margin:0 0 14px;border-radius:6px;background:#fff8e6;border:1px solid #f0d488;color:#5c4400}' +
            '.htcs-progress{padding:12px 14px;margin:0 0 14px;border:1px solid #dfe3e8;border-radius:6px;background:#fff}' +
            '.htcs-bar{height:8px;border-radius:4px;background:#e5e8ec;overflow:hidden;margin:8px 0 6px;max-width:460px}' +
            '.htcs-bar i{display:block;height:100%;background:#0f5ea8}' +
            '.htcs-bar.ind i{width:35%!important;animation:htcs-ind 1.4s ease-in-out infinite}' +
            '@keyframes htcs-ind{0%{margin-left:-35%}100%{margin-left:100%}}' +
            '.htcs-muted{color:#6b7280;font-size:12px}' +
            '</style>';

        // ------------------------------------------------------------------ utilidades

        const esc = (v) => String(v === null || v === undefined ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const script = () => runtime.getCurrentScript();
        const selfUrl = (params) => url.resolveScript({ scriptId: script().id, deploymentId: script().deploymentId, params: params || {} });
        const poLink = (id, text) => '<a href="' + esc(url.resolveRecord({ recordType: 'purchaseorder', recordId: id })) + '" target="_blank">' + esc(text || id) + '</a>';
        const fileLink = (id, text) => '<a href="/app/common/media/mediaitem.nl?id=' + esc(id) + '" target="_blank">' + esc(text) + '</a>';
        const msg = (type, title, text) => ({ type, title, message: text });
        const fmtNum = (n) => (n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('es-PE'));

        // ------------------------------------------------------------------ componentes visuales

        const pill = (tone, text) => '<span class="htcs-pill ' + tone + '">' + esc(text) + '</span>';

        const header = (title, sub, step) => {
            const steps = step === undefined ? '' : '<div class="htcs-steps">' + STEPS.map((s, i) =>
                '<div class="htcs-step' + (i < step ? ' done' : i === step ? ' on' : '') + '"><b>' + (i < step ? '&#10003;' : i + 1) + '</b>' + esc(s) + '</div>').join('') + '</div>';
            return '<div class="htcs-head"><div><div class="htcs-title">' + esc(title) + '</div>' +
                (sub ? '<div class="htcs-sub">' + sub + '</div>' : '') + '</div>' + steps + '</div>';
        };

        const kpis = (items) => '<div class="htcs-kpis">' + items.map((k) =>
            '<div class="htcs-kpi ' + (k.tone || '') + '"><div class="v">' + esc(k.value) + '</div><div class="l">' + esc(k.label) + '</div></div>').join('') + '</div>';

        /** pairs: [etiqueta, valor, esHtml?]; se omiten los vacíos. */
        const meta = (pairs) => '<div class="htcs-meta">' + pairs.filter((p) => p && p[1] !== '' && p[1] !== null && p[1] !== undefined)
            .map((p) => '<div><span>' + esc(p[0]) + ':</span> <b>' + (p[2] ? p[1] : esc(p[1])) + '</b></div>').join('') + '</div>';

        const actions = (list) => '<div class="htcs-actions">' + list.filter(Boolean).map((a) =>
            '<a class="htcs-btn" href="' + esc(a.href) + '"' + (a.blank ? ' target="_blank"' : '') + '>' + esc(a.label) + '</a>').join('') + '</div>';

        const NAV = {
            upload: () => ({ label: 'Cargar otro archivo', href: selfUrl() }),
            template: () => ({ label: 'Descargar plantilla CSV', href: selfUrl({ plantilla: 'T' }) }),
            history: () => ({ label: 'Historial de cargas', href: selfUrl({ historial: 'T' }) })
        };

        const addHidden = (form, id, value) => {
            const f = form.addField({ id, type: ui.FieldType.TEXT, label: id });
            f.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
            f.defaultValue = String(value);
        };

        const addHtml = (form, id, html, container) => {
            const f = form.addField(container
                ? { id, type: ui.FieldType.INLINEHTML, label: ' ', container }
                : { id, type: ui.FieldType.INLINEHTML, label: ' ' });
            f.defaultValue = html;
        };

        /** Bloque superior de la página (estilos + encabezado + contenido). */
        const addTop = (form, html) => addHtml(form, 'custpage_top', '<div class="htcs">' + CSS + html + '</div>');

        /** Sublista de solo lectura. cols: [{ id, label, type? }] ; rows: objetos con esas claves. */
        const addList = (form, id, label, cols, rows, tab) => {
            const def = { id, type: ui.SublistType.LIST, label };
            if (tab) def.tab = tab;
            const sl = form.addSublist(def);
            cols.forEach((c) => sl.addField({ id: id + '_' + c.id, type: c.type || ui.FieldType.TEXT, label: c.label }));
            rows.forEach((r, i) => cols.forEach((c) => {
                let v = r[c.id];
                if (v === null || v === undefined || v === '') return;
                v = String(v);
                if ((c.type || ui.FieldType.TEXT) === ui.FieldType.TEXT && v.length > 300 && v.indexOf('<') !== 0) v = v.slice(0, 297) + '...';
                sl.setSublistValue({ id: id + '_' + c.id, line: i, value: v });
            }));
            return sl;
        };

        /** Registro de auditoría de una carga; un fallo aquí no debe interrumpir la carga. */
        const writeLog = (data) => {
            try {
                const user = runtime.getCurrentUser();
                lib.saveJson(FOLDER, lib.logFileName(data.sourceFileId), Object.assign({
                    at: lib.stamp(), userId: user.id, userName: user.name
                }, data));
            } catch (e) {
                log.error('No se pudo registrar el historial', e);
            }
        };

        // ------------------------------------------------------------------ historial (datos)

        const HISTORY_COLS = [
            { id: 'fec', label: 'Fecha' },
            { id: 'usr', label: 'Cargado por' },
            { id: 'arc', label: 'Archivo' },
            { id: 'oc', label: 'OC' },
            { id: 'ser', label: 'Series' },
            { id: 'val', label: 'Líneas válidas' },
            { id: 'est', label: 'Estado' },
            { id: 'eje', label: 'Ejecutado por' },
            { id: 'res', label: 'Resultado' },
            { id: 'det', label: 'Detalle' }
        ];

        /**
         * Últimas cargas (más reciente primero) entre from y to ('AAAAMMDD', opcionales).
         * Devuelve { rows, counts } listos para la sublista HISTORY_COLS.
         */
        const getHistory = (from, to, limit) => {
            const C = lib.CONFIG;
            const logs = [];
            lib.eachFile(['file.name', 'startswith', C.PREFIX_LOG], true, (f) => {
                const st = f.name.substr(C.PREFIX_LOG.length, 15);
                const day = st.substr(0, 8);
                if (to && day > to) return true;
                if (from && day < from) return false;
                logs.push({ id: f.id, stamp: st });
                return logs.length < limit;
            });

            const entries = logs.map((l) => {
                try {
                    return Object.assign(JSON.parse(file.load({ id: l.id }).getContents()), { stamp: l.stamp });
                } catch (e) {
                    return { stamp: l.stamp, fatal: 'No se pudo leer el registro.' };
                }
            });

            // Ejecuciones y resultados de esas cargas, en una sola búsqueda.
            const exe = {};
            const res = {};
            const jobIds = entries.map((e) => e.jobId).filter(Boolean).map(String);
            if (jobIds.length) {
                const ors = [];
                jobIds.forEach((id) => {
                    if (ors.length) ors.push('OR');
                    ors.push(['file.name', 'is', lib.resultFileName(id, 'json')], 'OR',
                        ['file.name', 'is', lib.resultFileName(id, 'csv')], 'OR',
                        ['file.name', 'startswith', C.PREFIX_EXE + id + '_']);
                });
                lib.eachFile(ors, false, (f) => {
                    if (f.name.indexOf(C.PREFIX_EXE) === 0) {
                        // EXE_<job>_<usuario>_<AAAAMMDD>_<HHmmss>.json
                        const parts = f.name.slice(C.PREFIX_EXE.length).replace(/\.json$/, '').split('_');
                        if (!exe[parts[0]]) exe[parts[0]] = { userId: parts[1], stamp: parts[2] + '_' + parts[3] };
                    } else {
                        const m = f.name.slice(C.PREFIX_RES.length).match(/^(\d+)\.(json|csv)$/);
                        if (m) { res[m[1]] = res[m[1]] || {}; res[m[1]][m[2]] = f.id; }
                    }
                    return true;
                });
            }

            // Nombres de quienes ejecutaron
            const names = {};
            entries.forEach((e) => { if (e.userId) names[e.userId] = e.userName; });
            const missing = Object.keys(exe).map((k) => exe[k].userId)
                .filter((id, i, arr) => /^\d+$/.test(id) && !names[id] && arr.indexOf(id) === i);
            if (missing.length) {
                try {
                    search.create({ type: search.Type.EMPLOYEE, filters: [['internalid', 'anyof', missing]], columns: ['entityid'] })
                        .run().each((r) => { names[r.id] = r.getValue('entityid'); return true; });
                } catch (e) { log.error('Nombres de usuarios', e); }
            }

            const counts = { total: entries.length, processed: 0, pending: 0, failed: 0 };
            const rows = entries.map((e) => {
                const jobId = e.jobId ? String(e.jobId) : '';
                const s = e.stats || {};
                const r = jobId ? res[jobId] : null;
                const x = jobId ? exe[jobId] : null;
                let estado;
                let resultado = '';
                if (e.fatal) {
                    estado = pill('err', 'Error de lectura');
                    resultado = e.fatal;
                    counts.failed++;
                } else if (!jobId) {
                    estado = pill('err', 'Rechazado');
                    resultado = 'Sin líneas válidas';
                    counts.failed++;
                } else if (r && r.json) {
                    let d = null;
                    try { d = JSON.parse(file.load({ id: r.json }).getContents()); } catch (err) { /* sin detalle */ }
                    if (d && d.errors) {
                        estado = pill('warn', 'Procesado con errores');
                        counts.failed++;
                    } else {
                        estado = pill('ok', 'Procesado');
                        counts.processed++;
                    }
                    resultado = d ? d.ok + ' de ' + d.total + ' OC actualizadas' : 'Ver detalle';
                } else if (x) {
                    estado = pill('info', 'En cola / en proceso');
                    counts.pending++;
                } else {
                    estado = pill('muted', 'Validado, sin ejecutar');
                    counts.pending++;
                }
                const pos = e.pos || [];
                return {
                    fec: lib.stampToText(e.stamp),
                    usr: e.userName || e.userId,
                    arc: e.sourceFileId ? fileLink(e.sourceFileId, e.sourceFileName || e.sourceFileId) : (e.sourceFileName || ''),
                    oc: pos.slice(0, 5).join(', ') + (pos.length > 5 ? ' (+' + (pos.length - 5) + ')' : ''),
                    ser: fmtNum(s.okSerials),
                    val: s.lines ? s.okLines + ' de ' + s.lines : '',
                    est: estado,
                    eje: x ? (names[x.userId] || x.userId) + ' · ' + lib.stampToText(x.stamp) : '',
                    res: resultado + (r && r.csv ? ' &nbsp;' + fileLink(r.csv, 'CSV') : ''),
                    det: jobId && (x || r) ? '<a href="' + esc(selfUrl({ job: jobId })) + '">Ver</a>' : ''
                };
            });
            return { rows, counts };
        };

        // ------------------------------------------------------------------ páginas

        const uploadPage = (pageMsg) => {
            const form = ui.createForm({ title: TITLE });
            if (pageMsg) form.addPageInitMessage(pageMsg);
            addHidden(form, 'custpage_action', 'validar');

            addTop(form,
                header('Cargar archivo', 'Seleccione el CSV con las series para el detalle de inventario de la orden de compra.', 0) +
                actions([NAV.template(), NAV.history()]));

            // NetSuite no permite campos FILE dentro de grupos, fichas o sublistas: va en el área principal.
            const f = form.addField({ id: 'custpage_csv', type: ui.FieldType.FILE, label: 'Archivo CSV' });
            f.isMandatory = true;
            f.setHelpText({ help: 'CSV con las columnas de la plantilla. Se valida contra la orden de compra antes de procesar; no se modifica nada hasta presionar Ejecutar carga.' });
            form.addSubmitButton({ label: 'Cargar y validar' });

            try {
                const h = getHistory('', '', 5);
                addList(form, 'custpage_rec', 'Últimas cargas', HISTORY_COLS, h.rows);
            } catch (e) {
                log.error('Últimas cargas', e);
            }
            return form;
        };

        const validatePage = (request) => {
            const up = request.files && request.files.custpage_csv;
            if (!up) return uploadPage(msg(message.Type.ERROR, 'Sin archivo', 'Seleccione un archivo CSV.'));
            if (up.fileType && [file.Type.CSV, file.Type.PLAINTEXT].indexOf(up.fileType) === -1) {
                return uploadPage(msg(message.Type.ERROR, 'Formato no válido', 'El archivo "' + esc(up.name) + '" no es CSV. En Excel use Guardar como → CSV.'));
            }

            const content = up.getContents();
            const originalName = up.name;
            up.folder = FOLDER;
            up.name = 'HT_PE_CS_SRC_' + lib.stamp() + '_' + originalName;
            const sourceFileId = up.save();

            const parsed = lib.readCsv(content);
            if (parsed.fatal.length) {
                writeLog({ sourceFileId, sourceFileName: originalName, jobId: null, fatal: parsed.fatal.join(' ') });
                return uploadPage(msg(message.Type.ERROR, 'No se pudo leer el archivo', parsed.fatal.map(esc).join('<br>')));
            }

            const res = lib.validate(parsed.records);
            const s = res.stats;
            let jobId = null;
            if (res.job.groups.length) {
                res.job.sourceFileId = sourceFileId;
                res.job.sourceFileName = originalName;
                jobId = lib.saveJson(FOLDER, lib.validatedFileName(), res.job);
            }
            log.audit('Validación ' + originalName, JSON.stringify(s) + ' | job: ' + jobId);
            writeLog({
                sourceFileId,
                sourceFileName: originalName,
                jobId,
                stats: s,
                pos: res.summary.map((r) => r.tranid || r.poId).filter((v, i, arr) => v && arr.indexOf(v) === i)
            });

            const form = ui.createForm({ title: TITLE });
            if (!s.errorLines) {
                form.addPageInitMessage(msg(message.Type.CONFIRMATION, 'Archivo válido', 'Todas las líneas pasaron la validación. Revise el detalle y presione Ejecutar carga.'));
            } else if (s.okLines) {
                form.addPageInitMessage(msg(message.Type.WARNING, 'Archivo con errores', s.errorLines + ' línea(s) de OC tienen errores y no se procesarán. Puede ejecutar solo las líneas válidas.'));
            } else {
                form.addPageInitMessage(msg(message.Type.ERROR, 'Archivo no válido', 'Ninguna línea pasó la validación. Revise las observaciones, corrija el archivo y vuelva a cargarlo.'));
            }

            // Todas las observaciones en CSV (la pantalla muestra hasta MAX_OBSERVATIONS).
            let obsUrl = null;
            if (res.observations.length) {
                try {
                    const obsId = lib.saveCsv(FOLDER, 'HT_PE_CS_OBS_' + lib.stamp() + '_' + sourceFileId + '.csv', lib.toCsv(
                        ['Tipo', 'Fila CSV', 'ID OC', 'Articulo', 'Detalle'],
                        res.observations.map((o) => [o.type, o.rowNum, o.poId, o.item, o.message])));
                    obsUrl = file.load({ id: obsId }).url;
                } catch (e) {
                    log.error('No se pudo generar el CSV de observaciones', e);
                }
            }

            const h = parsed.headerInfo;
            addTop(form,
                header('Validación del archivo', esc(originalName), 1) +
                kpis([
                    { label: 'Filas leídas', value: fmtNum(s.rows) },
                    { label: 'Líneas de OC válidas', value: s.okLines + ' / ' + s.lines, tone: s.errorLines ? (s.okLines ? 'warn' : 'err') : 'ok' },
                    { label: 'Series a cargar', value: fmtNum(s.okSerials), tone: 'info' },
                    { label: 'OC a actualizar', value: fmtNum(s.okPos) },
                    { label: 'Errores', value: fmtNum(s.errors), tone: s.errors ? 'err' : '' },
                    { label: 'Advertencias', value: fmtNum(s.warnings), tone: s.warnings ? 'warn' : '' }
                ]) +
                meta([
                    ['Archivo', fileLink(sourceFileId, originalName), true],
                    ['Separador', parsed.delimiter === '\t' ? 'tabulación' : parsed.delimiter],
                    ['Columnas reconocidas', h.recognized.length + ' de ' + lib.TEMPLATE_COLUMNS.length],
                    h.ignored.length ? ['Columnas ignoradas', h.ignored.join(', ')] : null
                ]) +
                (jobId ? '<div class="htcs-callout">Al ejecutar se <b>reemplazará el detalle de inventario</b> de ' + s.okLines +
                    ' línea(s) en ' + s.okPos + ' orden(es) de compra con ' + fmtNum(s.okSerials) + ' series.</div>' : '') +
                actions([
                    obsUrl ? { label: 'Descargar observaciones (' + fmtNum(res.observations.length) + ') CSV', href: obsUrl, blank: true } : null,
                    NAV.upload(),
                    NAV.history()
                ]));

            form.addTab({ id: 'custpage_tab_lin', label: 'Líneas de OC (' + res.summary.length + ')' });
            addList(form, 'custpage_lin', 'Líneas de OC', [
                { id: 'res', label: 'Resultado' },
                { id: 'oc', label: 'OC' },
                { id: 'est', label: 'Estado OC' },
                { id: 'lin', label: 'Línea' },
                { id: 'art', label: 'Artículo' },
                { id: 'ofi', label: 'Oficina' },
                { id: 'cant', label: 'Cant. OC' },
                { id: 'ser', label: 'Cant. series' },
                { id: 'ini', label: 'Primera serie' },
                { id: 'fin', label: 'Última serie' },
                { id: 'bin', label: 'Oficina destino' },
                { id: 'sta', label: 'Estado inv.' },
                { id: 'obs', label: 'Observación', type: ui.FieldType.TEXTAREA }
            ], res.summary.map((r) => ({
                res: r.ok ? pill('ok', 'Válida') : pill('err', 'Con error'),
                oc: /^\d+$/.test(r.poId) && r.tranid ? poLink(r.poId, r.tranid) : r.poId,
                est: r.poStatus,
                lin: r.lineId,
                art: r.item,
                ofi: r.location,
                cant: fmtNum(r.poQty),
                ser: fmtNum(r.csvQty),
                ini: r.firstSerial,
                fin: r.lastSerial,
                bin: r.bins,
                sta: r.statuses,
                obs: r.message
            })), 'custpage_tab_lin');

            if (res.observations.length) {
                const max = lib.CONFIG.MAX_OBSERVATIONS;
                form.addTab({ id: 'custpage_tab_obs', label: 'Observaciones (' + res.observations.length + ')' });
                addList(form, 'custpage_obs', res.observations.length > max ? 'Primeras ' + max + ' de ' + res.observations.length : 'Observaciones', [
                    { id: 'tip', label: 'Tipo' },
                    { id: 'fil', label: 'Fila CSV' },
                    { id: 'oc', label: 'ID OC' },
                    { id: 'art', label: 'Artículo' },
                    { id: 'msg', label: 'Detalle', type: ui.FieldType.TEXTAREA }
                ], res.observations.slice(0, max).map((o) => ({
                    tip: o.type === 'ERROR' ? pill('err', 'Error') : pill('warn', 'Advertencia'),
                    fil: o.rowNum,
                    oc: o.poId,
                    art: o.item,
                    msg: o.message
                })), 'custpage_tab_obs');
            }

            if (jobId) {
                addHidden(form, 'custpage_action', 'ejecutar');
                addHidden(form, 'custpage_job', jobId);
                form.addSubmitButton({ label: 'Ejecutar carga' });
            }
            return form;
        };

        const execute = (ctx) => {
            const jobId = ctx.request.parameters.custpage_job;
            if (!jobId) {
                ctx.response.writePage(uploadPage(msg(message.Type.ERROR, 'Sin datos', 'No hay un archivo validado para ejecutar. Vuelva a cargar el CSV.')));
                return;
            }
            // Poner en cola (VAL -> JOB). Si ya fue procesado (DONE) se muestra su resultado.
            const jobFile = file.load({ id: jobId });
            if (String(jobFile.folder) !== String(FOLDER)) throw new Error('El archivo ' + jobId + ' no pertenece a la carpeta de la carga de series.');
            if (jobFile.name.indexOf(lib.CONFIG.PREFIX_DONE) === 0) {
                redirect.toSuitelet({ scriptId: script().id, deploymentId: script().deploymentId, parameters: { job: jobId } });
                return;
            }
            if (jobFile.name.indexOf(lib.CONFIG.PREFIX_JOB) !== 0) {
                lib.renameFile(jobId, lib.queuedFileName(jobId));
                try {
                    lib.saveJson(FOLDER, lib.exeFileName(jobId, runtime.getCurrentUser().id), {});
                } catch (e) {
                    log.error('No se pudo registrar la ejecución en el historial', e);
                }
            }

            let taskId;
            try {
                taskId = task.create({ taskType: task.TaskType.MAP_REDUCE, scriptId: lib.CONFIG.MR_SCRIPT_ID }).submit();
            } catch (e) {
                log.error('No se pudo lanzar el proceso', e);
                const busy = e.name === 'MAP_REDUCE_ALREADY_RUNNING' || e.name === 'NO_DEPLOYMENTS_AVAILABLE' ||
                    e.name === 'FAILED_TO_SUBMIT_JOB_REQUEST_1';
                const form = ui.createForm({ title: TITLE });
                form.addPageInitMessage(msg(message.Type.ERROR, 'No se pudo ejecutar',
                    busy ? 'Ya hay una carga de series en proceso. El archivo quedó en cola; espere unos minutos y presione Reintentar.'
                        : esc(e.name + ': ' + e.message)));
                addTop(form, header('Ejecución', 'Archivo de trabajo ' + esc(jobId), 2) + actions([NAV.upload(), NAV.history()]));
                addHidden(form, 'custpage_action', 'ejecutar');
                addHidden(form, 'custpage_job', jobId);
                form.addSubmitButton({ label: 'Reintentar' });
                ctx.response.writePage(form);
                return;
            }
            log.audit('Proceso lanzado', 'Tarea ' + taskId + ' | archivo de trabajo ' + jobId);
            redirect.toSuitelet({ scriptId: script().id, deploymentId: script().deploymentId, parameters: { taskid: taskId, job: jobId } });
        };

        const statusPage = (taskId, jobId) => {
            const form = ui.createForm({ title: TITLE });
            const jsonId = jobId ? lib.findFileId(FOLDER, lib.resultFileName(jobId, 'json')) : null;
            const refreshUrl = selfUrl(taskId ? { taskid: taskId, job: jobId } : { job: jobId });

            if (!jsonId) {
                let st = null;
                if (taskId) {
                    try { st = task.checkStatus({ taskId }); } catch (e) { log.error('checkStatus ' + taskId, e); }
                }
                const running = st && (st.status === task.TaskStatus.PENDING || st.status === task.TaskStatus.PROCESSING);

                if (running) {
                    let pct = 0;
                    try { pct = Math.max(0, Math.min(100, Math.round(st.getPercentageCompleted()))); } catch (e) { /* no disponible */ }
                    const stage = { GET_INPUT: 'Leyendo archivo', MAP: 'Actualizando órdenes de compra', SHUFFLE: 'Agrupando', REDUCE: 'Actualizando órdenes de compra', SUMMARIZE: 'Generando resultado' }[st.stage] || '';
                    // NetSuite solo sube el porcentaje al terminar cada OC: mientras sea 0 se muestra una barra animada.
                    const ind = st.status === task.TaskStatus.PROCESSING && pct === 0;
                    addTop(form,
                        header('Ejecución en curso', 'Archivo de trabajo ' + esc(jobId), 2) +
                        '<div class="htcs-progress"><b>' + esc(st.status === task.TaskStatus.PENDING ? 'En espera de iniciar' : (stage || 'Procesando')) + '</b>' +
                        '<div class="htcs-bar' + (ind ? ' ind' : '') + '"><i style="width:' + pct + '%"></i></div>' +
                        '<span class="htcs-muted">' + (ind ? 'Procesando · el porcentaje avanza al terminar cada orden de compra' : pct + '% completado') +
                        ' · la página se actualiza cada ' + AUTO_REFRESH_SECONDS + ' segundos</span></div>' +
                        actions([{ label: 'Actualizar ahora', href: refreshUrl }, NAV.history()]) +
                        '<script>setTimeout(function(){window.location.href=' + JSON.stringify(refreshUrl) + ';},' + (AUTO_REFRESH_SECONDS * 1000) + ');</script>');
                    return form;
                }

                // Tarea fallida, terminada sin este archivo (se puso en cola cuando ya corría otra) o sin tarea.
                const failed = st && st.status === task.TaskStatus.FAILED;
                form.addPageInitMessage(failed
                    ? msg(message.Type.ERROR, 'Proceso fallido', 'Revise el log de ejecución del script HT PE MR Carga Series OC. Puede presionar Reintentar.')
                    : msg(message.Type.WARNING, 'Pendiente', 'El archivo sigue en cola y aún no se procesó. Presione Reintentar para lanzar el proceso.'));
                addTop(form,
                    header('Ejecución', 'Archivo de trabajo ' + esc(jobId), 2) +
                    meta([['Estado', failed ? pill('err', 'Fallido') : pill('info', 'En cola'), true], ['Tarea', taskId || '']]) +
                    actions([{ label: 'Actualizar', href: refreshUrl }, NAV.upload(), NAV.history()]));
                addHidden(form, 'custpage_action', 'ejecutar');
                addHidden(form, 'custpage_job', jobId);
                form.addSubmitButton({ label: 'Reintentar' });
                return form;
            }

            const data = JSON.parse(file.load({ id: jsonId }).getContents());
            const csvId = lib.findFileId(FOLDER, lib.resultFileName(jobId, 'csv'));
            const serials = data.results.filter((r) => r.ok).reduce((s, r) => s + (Number(r.serials) || 0), 0);
            form.addPageInitMessage(data.errors
                ? msg(message.Type.WARNING, 'Carga terminada con errores', data.errors + ' orden(es) de compra no se actualizaron. Revise el mensaje de cada una.')
                : msg(message.Type.CONFIRMATION, 'Carga terminada', 'Todas las órdenes de compra se actualizaron correctamente.'));

            addTop(form,
                header('Resultado de la carga', 'Archivo de trabajo ' + esc(jobId), 3) +
                kpis([
                    { label: 'OC procesadas', value: fmtNum(data.total) },
                    { label: 'OC actualizadas', value: fmtNum(data.ok), tone: 'ok' },
                    { label: 'OC con error', value: fmtNum(data.errors), tone: data.errors ? 'err' : '' },
                    { label: 'Series cargadas', value: fmtNum(serials), tone: 'info' }
                ]) +
                actions([
                    csvId ? { label: 'Descargar resultado (CSV)', href: file.load({ id: csvId }).url, blank: true } : null,
                    NAV.upload(),
                    NAV.history()
                ]));

            addList(form, 'custpage_res', 'Resultado por OC', [
                { id: 'res', label: 'Resultado' },
                { id: 'oc', label: 'OC' },
                { id: 'lin', label: 'Líneas' },
                { id: 'ser', label: 'Series' },
                { id: 'msg', label: 'Mensaje', type: ui.FieldType.TEXTAREA }
            ], data.results.map((r) => ({
                res: r.ok ? pill('ok', 'Actualizada') : pill('err', 'Error'),
                oc: poLink(r.poId, r.tranid || r.poId),
                lin: r.lines,
                ser: fmtNum(r.serials),
                msg: r.message
            })));
            return form;
        };

        /** Valor de un campo DATE del formulario -> 'AAAAMMDD' ('' si vacío o inválido). */
        const dateKey = (v) => {
            if (!v) return '';
            try {
                const d = format.parse({ value: v, type: format.Type.DATE });
                const p = (n) => (n < 10 ? '0' : '') + n;
                return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
            } catch (e) {
                return '';
            }
        };

        /** Auditoría: últimas HISTORY_LIMIT cargas, opcionalmente entre dos fechas. */
        const historyPage = (desde, hasta) => {
            const C = lib.CONFIG;
            const form = ui.createForm({ title: TITLE });
            addHidden(form, 'custpage_action', 'historial');

            const from = dateKey(desde);
            const to = dateKey(hasta);
            const invalid = from && to && from > to;
            const h = invalid ? { rows: [], counts: { total: 0, processed: 0, pending: 0, failed: 0 } } : getHistory(from, to, C.HISTORY_LIMIT);

            const range = (desde || hasta) ? 'del ' + esc(desde || 'inicio') + ' al ' + esc(hasta || 'hoy') : 'de todas las fechas';
            addTop(form,
                header('Historial de cargas', 'Auditoría de cargas ' + range + ' · se muestran las ' + C.HISTORY_LIMIT + ' más recientes.') +
                kpis([
                    { label: 'Cargas mostradas', value: fmtNum(h.counts.total) },
                    { label: 'Procesadas', value: fmtNum(h.counts.processed), tone: 'ok' },
                    { label: 'Pendientes', value: fmtNum(h.counts.pending), tone: h.counts.pending ? 'info' : '' },
                    { label: 'Con errores / rechazadas', value: fmtNum(h.counts.failed), tone: h.counts.failed ? 'err' : '' }
                ]) +
                actions([NAV.upload(), NAV.template(), (desde || hasta) ? { label: 'Quitar filtro', href: selfUrl({ historial: 'T' }) } : null]));

            form.addFieldGroup({ id: 'custpage_grp_filter', label: 'Filtrar por fecha' });
            const fDesde = form.addField({ id: 'custpage_desde', type: ui.FieldType.DATE, label: 'Desde', container: 'custpage_grp_filter' });
            const fHasta = form.addField({ id: 'custpage_hasta', type: ui.FieldType.DATE, label: 'Hasta', container: 'custpage_grp_filter' });
            if (desde) fDesde.defaultValue = desde;
            if (hasta) fHasta.defaultValue = hasta;
            form.addSubmitButton({ label: 'Filtrar' });

            if (invalid) {
                form.addPageInitMessage(msg(message.Type.ERROR, 'Rango no válido', 'La fecha Desde es posterior a la fecha Hasta.'));
            } else if (!h.rows.length) {
                form.addPageInitMessage(msg(message.Type.INFORMATION, 'Sin resultados', 'No hay cargas registradas ' + range + '.'));
            }

            addList(form, 'custpage_his', 'Cargas', HISTORY_COLS, h.rows);
            return form;
        };

        const downloadTemplate = (ctx) => {
            ctx.response.writeFile({
                file: file.create({ name: 'plantilla_carga_series_oc.csv', fileType: file.Type.CSV, contents: lib.templateCsv() }),
                isInline: false
            });
        };

        // ------------------------------------------------------------------ entrada

        const onRequest = (ctx) => {
            const req = ctx.request;
            const p = req.parameters;
            try {
                if (req.method === 'GET') {
                    if (p.plantilla === 'T') { downloadTemplate(ctx); return; }
                    if (p.historial === 'T') { ctx.response.writePage(historyPage()); return; }
                    if (p.job) { ctx.response.writePage(statusPage(p.taskid, p.job)); return; }
                    ctx.response.writePage(uploadPage());
                    return;
                }
                if (p.custpage_action === 'historial') { ctx.response.writePage(historyPage(p.custpage_desde, p.custpage_hasta)); return; }
                if (p.custpage_action === 'ejecutar') { execute(ctx); return; }
                ctx.response.writePage(validatePage(req));
            } catch (e) {
                log.error('HT_PE_SL_CARGA_SERIES_OC', e);
                ctx.response.writePage(uploadPage(msg(message.Type.ERROR, 'Error inesperado', esc((e.name ? e.name + ': ' : '') + e.message))));
            }
        };

        return { onRequest };
    });
