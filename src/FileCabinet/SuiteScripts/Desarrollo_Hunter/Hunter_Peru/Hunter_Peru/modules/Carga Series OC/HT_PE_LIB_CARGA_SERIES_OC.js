/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * HT PE - Carga de series en Órdenes de Compra (librería compartida)
 *
 * Lectura del CSV, validación contra la OC y utilidades de archivos. La usan:
 *   - HT_PE_SL_CARGA_SERIES_OC (interfaz: carga, validación y ejecución)
 *   - HT_PE_MR_CARGA_SERIES_OC (proceso: escribe el inventory detail)
 */
define(['N/search', 'N/runtime', 'N/file'], (search, runtime, file) => {

    /**
     * Valores fijos (sin parámetros de script).
     *
     * Archivos en FOLDER_ID (el ID interno no cambia al renombrar):
     *   HT_PE_CS_SRC_<fecha>_<nombre>.csv  CSV original subido
     *   HT_PE_CS_VAL_<fecha>.json          validado, aún no ejecutado (el MR lo ignora)
     *   HT_PE_CS_JOB_<id>.json             en cola: el usuario presionó Ejecutar
     *   HT_PE_CS_DONE_<id>.json            ya procesado por el MR
     *   HT_PE_CS_RES_<id>.json / .csv      resultado por OC
     *   HT_PE_CS_LOG_<fecha>_<src>.json    historial: una carga (quién, cuándo, qué archivo, validación)
     *   HT_PE_CS_EXE_<id>_<usuario>_<fecha>.json  historial: quién y cuándo presionó Ejecutar
     *
     * <fecha> = AAAAMMDD_HHmmss en hora de Perú (TZ_OFFSET_HOURS).
     */
    const CONFIG = {
        FOLDER_ID: 631415,
        MR_SCRIPT_ID: 'customscript_ht_pe_mr_carga_series_oc',
        PREFIX_VAL: 'HT_PE_CS_VAL_',
        PREFIX_JOB: 'HT_PE_CS_JOB_',
        PREFIX_DONE: 'HT_PE_CS_DONE_',
        PREFIX_RES: 'HT_PE_CS_RES_',
        PREFIX_LOG: 'HT_PE_CS_LOG_',
        PREFIX_EXE: 'HT_PE_CS_EXE_',
        TZ_OFFSET_HOURS: -5,
        HISTORY_LIMIT: 30,
        MAX_OBSERVATIONS: 1000,     // filas visibles en pantalla; el CSV de observaciones trae todas
        SERIAL_CHECK_CHUNK: 500     // series por búsqueda al verificar si ya existen en inventario
    };

    /**
     * Columnas reconocidas en el CSV. La cabecera se compara normalizada
     * (sin tildes, sin mayúsculas, sin signos). "head" = dato de la línea de la OC;
     * si viene vacío en una fila se hereda de la fila anterior (basta con llenarlo
     * en la primera fila de cada OC/artículo).
     */
    const COLUMNS = [
        { key: 'poId', label: 'ID INTERNO', required: true, head: true,
            aliases: ['id interno', 'id interno oc', 'internal id', 'id oc', 'id'], contains: ['id interno'] },
        { key: 'item', label: 'ARTICULO', required: true, head: true,
            aliases: ['articulo', 'articulos', 'item', 'items', 'codigo articulo'], contains: ['articulo'] },
        { key: 'location', label: 'OFICINA', head: true,
            aliases: ['oficina', 'ubicacion', 'location'], contains: [] },
        { key: 'lineQty', label: 'CANTIDAD', head: true,
            aliases: ['cantidad', 'quantity', 'cantidad oc'], contains: [] },
        { key: 'serial', label: 'Numero de inventario de recibo', required: true,
            aliases: ['numero de inventario de recibo', 'numero inventario recibo', 'receipt inventory number',
                'numero de serie', 'serie', 'serial', 'serial lot number', 'lote'],
            contains: ['inventario de recibo', 'serie', 'serial'] },
        // Viene en el formato de importación de NetSuite; se reconoce pero no se usa.
        { key: 'subrecordId', label: 'ID de subregistro sustituto', ignored: true,
            aliases: ['id de subregistro sustituto', 'id subregistro sustituto', 'subrecord id'], contains: ['subregistro'] },
        { key: 'status', label: 'ESTADO',
            aliases: ['estado', 'status', 'estado de inventario', 'estado inventario', 'inventory status'], contains: [] },
        { key: 'serialQty', label: 'CANTIDAD linea',
            aliases: ['cantidad linea', 'cantidad serie', 'cantidad detalle'], contains: ['cantidad linea'] },
        { key: 'bin', label: 'Oficina Destino',
            aliases: ['oficina destino', 'ubicacion destino', 'bin', 'bin number', 'numero de bin', 'contenedor'],
            contains: ['destino'] },
        // Opcional, fuera de la plantilla: solo si el artículo se repite en varias líneas de la misma OC.
        { key: 'line', label: 'LINEA', head: true, optional: true,
            aliases: ['linea', 'line', 'nro linea', 'id linea'], contains: [] }
    ];

    const TEMPLATE_COLUMNS = COLUMNS.filter((c) => !c.optional);

    // ------------------------------------------------------------------ utilidades

    const norm = (v) => {
        let s = (v === null || v === undefined ? '' : String(v)).trim().toLowerCase();
        try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* sin soporte */ }
        return s.replace(/[^a-z0-9]+/g, ' ').trim();
    };

    const clean = (v) => (v === null || v === undefined ? '' : String(v)).trim();

    /** "6,000" / "6000" / "1,5" -> número; NaN si no es válido. */
    const toNumber = (v) => {
        let s = clean(v).replace(/\s/g, '');
        if (!s) return NaN;
        if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
        else if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.');
        return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
    };

    const sameQty = (a, b) => Math.abs(Number(a) - Number(b)) < 0.00001;

    /** AAAAMMDD_HHmmss en hora de Perú (independiente de la zona horaria del servidor). */
    const stamp = () => {
        const d = new Date(Date.now() + CONFIG.TZ_OFFSET_HOURS * 3600000);
        const p = (n) => (n < 10 ? '0' : '') + n;
        return '' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '_' +
            p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
    };

    /** '20261110_173900' -> '10/11/2026 17:39' */
    const stampToText = (s) => (/^\d{8}_\d{6}$/.test(s || '')
        ? s.substr(6, 2) + '/' + s.substr(4, 2) + '/' + s.substr(0, 4) + ' ' + s.substr(9, 2) + ':' + s.substr(11, 2)
        : (s || ''));

    const validatedFileName = () => CONFIG.PREFIX_VAL + stamp() + '.json';
    const queuedFileName = (jobId) => CONFIG.PREFIX_JOB + jobId + '.json';
    const doneFileName = (jobId) => CONFIG.PREFIX_DONE + jobId + '.json';
    const resultFileName = (jobId, ext) => CONFIG.PREFIX_RES + jobId + '.' + (ext || 'json');
    const logFileName = (sourceFileId) => CONFIG.PREFIX_LOG + stamp() + '_' + sourceFileId + '.json';
    const exeFileName = (jobId, userId) => CONFIG.PREFIX_EXE + jobId + '_' + userId + '_' + stamp() + '.json';

    const csvCell = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const toCsv = (headers, rows) =>
        '﻿' + [headers].concat(rows).map((r) => r.map(csvCell).join(',')).join('\r\n');

    // ------------------------------------------------------------------ archivos

    const renameFile = (fileId, name) => {
        const f = file.load({ id: fileId });
        f.name = name;
        return f.save();
    };

    /** Archivos en cola (HT_PE_CS_JOB_*) de la carpeta, del más antiguo al más reciente. */
    const listQueuedJobs = () => {
        const out = [];
        search.create({
            type: search.Type.FOLDER,
            filters: [['internalid', 'anyof', CONFIG.FOLDER_ID], 'AND', ['file.name', 'startswith', CONFIG.PREFIX_JOB]],
            columns: [
                search.createColumn({ name: 'internalid', join: 'file', sort: search.Sort.ASC }),
                search.createColumn({ name: 'name', join: 'file' })
            ]
        }).run().each((r) => {
            out.push({ id: String(r.getValue({ name: 'internalid', join: 'file' })), name: r.getValue({ name: 'name', join: 'file' }) });
            return true;
        });
        return out;
    };

    /**
     * Recorre los archivos de la carpeta que cumplen nameFilter (expresión sobre 'file.name'),
     * ordenados por nombre. cb({ id, name }) devuelve false para detenerse.
     */
    const eachFile = (nameFilter, descending, cb) => {
        search.create({
            type: search.Type.FOLDER,
            filters: [['internalid', 'anyof', CONFIG.FOLDER_ID], 'AND', nameFilter],
            columns: [
                search.createColumn({ name: 'name', join: 'file', sort: descending ? search.Sort.DESC : search.Sort.ASC }),
                search.createColumn({ name: 'internalid', join: 'file' })
            ]
        }).run().each((r) => cb({
            id: String(r.getValue({ name: 'internalid', join: 'file' })),
            name: r.getValue({ name: 'name', join: 'file' })
        }) !== false);
    };

    const saveJson = (folderId, name, data) => file.create({
        name,
        fileType: file.Type.JSON,
        contents: JSON.stringify(data),
        folder: folderId
    }).save();

    const saveCsv = (folderId, name, contents) => file.create({
        name,
        fileType: file.Type.CSV,
        contents,
        folder: folderId
    }).save();

    const findFileId = (folderId, name) => {
        let id = null;
        search.create({
            type: search.Type.FOLDER,
            filters: [['internalid', 'anyof', folderId], 'AND', ['file.name', 'is', name]],
            columns: [search.createColumn({ name: 'internalid', join: 'file' })]
        }).run().each((r) => { id = r.getValue({ name: 'internalid', join: 'file' }); return false; });
        return id;
    };

    // ------------------------------------------------------------------ CSV

    const parseCsvText = (text) => {
        const src = String(text || '').replace(/^﻿/, '');
        const firstLine = src.split(/\r?\n/).find((l) => l.trim()) || '';
        const delimiter = [';', ',', '\t']
            .map((d) => ({ d, n: firstLine.split(d).length }))
            .sort((a, b) => b.n - a.n)[0].d;

        // Filas que Excel guardó completas entre comillas ("6655421,""PE-7083..."",LIMA...")
        // llegan como una sola celda que contiene el separador: se vuelven a leer.
        const rows = parseRows(src, delimiter).map((r) =>
            (r.length === 1 && r[0].indexOf(delimiter) !== -1 ? (parseRows(r[0], delimiter)[0] || r) : r));
        return { delimiter, rows };
    };

    const parseRows = (src, delimiter) => {
        const rows = [];
        let row = [];
        let field = '';
        let quoted = false;
        for (let i = 0; i < src.length; i++) {
            const ch = src[i];
            if (quoted) {
                if (ch === '"') {
                    if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
                } else {
                    field += ch;
                }
            } else if (ch === '"') {
                quoted = true;
            } else if (ch === delimiter) {
                row.push(field); field = '';
            } else if (ch === '\n') {
                row.push(field); rows.push(row); row = []; field = '';
            } else if (ch !== '\r') {
                field += ch;
            }
        }
        if (field !== '' || row.length) { row.push(field); rows.push(row); }
        return rows;
    };

    const mapHeaders = (headerRow) => {
        const index = {};
        const used = {};
        const headers = headerRow.map(norm);

        headers.forEach((h, i) => {
            const col = COLUMNS.find((c) => index[c.key] === undefined && c.aliases.indexOf(h) !== -1);
            if (col) { index[col.key] = i; used[i] = true; }
        });
        headers.forEach((h, i) => {
            if (used[i] || !h) return;
            const col = COLUMNS.find((c) => index[c.key] === undefined && c.contains.some((k) => h.indexOf(k) !== -1));
            if (col) { index[col.key] = i; used[i] = true; }
        });

        return {
            index,
            recognized: COLUMNS.filter((c) => index[c.key] !== undefined)
                .map((c) => c.label + ' = "' + clean(headerRow[index[c.key]]) + '"' + (c.ignored ? ' (no se usa)' : '')),
            ignored: headerRow.filter((h, i) => !used[i] && clean(h)).map(clean),
            missing: COLUMNS.filter((c) => c.required && index[c.key] === undefined).map((c) => c.label)
        };
    };

    /**
     * Lee el CSV y devuelve las filas con los datos de la OC heredados de la fila
     * anterior cuando vienen vacíos.
     */
    const readCsv = (text) => {
        const parsed = parseCsvText(text);
        const nonEmpty = parsed.rows
            .map((cells, i) => ({ cells, rowNum: i + 1 }))
            .filter((r) => r.cells.some((c) => clean(c)));

        const out = { delimiter: parsed.delimiter, records: [], fatal: [], headerInfo: null };
        if (nonEmpty.length < 2) {
            out.fatal.push('El archivo no tiene filas de datos (se espera una fila de cabecera y al menos una fila con series).');
            return out;
        }

        const header = mapHeaders(nonEmpty[0].cells);
        out.headerInfo = header;
        if (header.missing.length) {
            out.fatal.push('No se encontraron las columnas obligatorias: ' + header.missing.join(', ') +
                '. Cabecera leída: ' + nonEmpty[0].cells.map(clean).join(' | '));
            return out;
        }

        const headKeys = COLUMNS.filter((c) => c.head && c.key !== 'poId' && c.key !== 'item').map((c) => c.key);
        const detailKeys = ['status', 'serialQty', 'bin'];
        let prev = null;

        nonEmpty.slice(1).forEach((r) => {
            const rec = { rowNum: r.rowNum };
            COLUMNS.forEach((c) => {
                rec[c.key] = header.index[c.key] === undefined ? '' : clean(r.cells[header.index[c.key]]);
            });

            const newHead = !prev ||
                (rec.poId && rec.poId !== prev.poId) ||
                (rec.item && norm(rec.item) !== norm(prev.item));

            if (prev) {
                if (!rec.poId) rec.poId = prev.poId;
                if (!rec.item) rec.item = prev.item;
                if (!newHead) {
                    headKeys.concat(detailKeys).forEach((k) => { if (!rec[k]) rec[k] = prev[k]; });
                }
            }
            out.records.push(rec);
            prev = rec;
        });
        return out;
    };

    // ------------------------------------------------------------------ búsquedas

    const getPoLines = (ids) => {
        const out = {};
        if (!ids.length) return out;
        const create = (withSerialFlag) => search.create({
            type: search.Type.PURCHASE_ORDER,
            filters: [
                ['internalid', 'anyof', ids], 'AND',
                ['mainline', 'is', 'F'], 'AND',
                ['taxline', 'is', 'F'], 'AND',
                ['shipping', 'is', 'F'], 'AND',
                ['cogs', 'is', 'F'], 'AND',
                ['item', 'noneof', '@NONE@']
            ],
            columns: [
                'tranid', 'statusref', 'line', 'lineuniquekey', 'item', 'location',
                'quantity', 'quantityshiprecv', 'closed',
                search.createColumn({ name: 'displayname', join: 'item' })
            ].concat(withSerialFlag ? [search.createColumn({ name: 'isserialitem', join: 'item' })] : [])
        });
        // isserialitem solo se usa para exigir cantidad 1 por serie; si la cuenta no acepta la
        // columna se busca sin ella y NetSuite valida la cantidad al guardar.
        let withSerialFlag = true;
        let paged;
        try {
            paged = create(true).runPaged({ pageSize: 1000 });
        } catch (e) {
            if (e.name !== 'SSS_INVALID_SRCH_COL') throw e;
            withSerialFlag = false;
            paged = create(false).runPaged({ pageSize: 1000 });
        }
        paged.pageRanges.forEach((pr) => {
            paged.fetch({ index: pr.index }).data.forEach((r) => {
                const id = String(r.id);
                if (!out[id]) {
                    out[id] = {
                        tranid: r.getValue('tranid'),
                        status: r.getValue('statusref'),
                        statusText: r.getText('statusref'),
                        lines: []
                    };
                }
                const isSerial = withSerialFlag ? r.getValue({ name: 'isserialitem', join: 'item' }) : null;
                out[id].lines.push({
                    lineId: String(r.getValue('line')),
                    lineUniqueKey: String(r.getValue('lineuniquekey')),
                    itemId: String(r.getValue('item')),
                    itemText: r.getText('item'),
                    itemName: r.getValue({ name: 'displayname', join: 'item' }),
                    locationId: String(r.getValue('location') || ''),
                    locationText: r.getText('location') || '',
                    quantity: Math.abs(Number(r.getValue('quantity')) || 0),
                    received: Math.abs(Number(r.getValue('quantityshiprecv')) || 0),
                    closed: r.getValue('closed') === true || r.getValue('closed') === 'T',
                    isSerial: isSerial === true || isSerial === 'T'
                });
            });
        });
        return out;
    };

    const getBins = (locationIds) => {
        const out = {};
        if (!locationIds.length) return out;
        const s = search.create({
            type: 'bin',
            filters: [['location', 'anyof', locationIds]],
            columns: ['binnumber', 'location']
        });
        const paged = s.runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pr) => {
            paged.fetch({ index: pr.index }).data.forEach((r) => {
                out[r.getValue('location') + '|' + norm(r.getValue('binnumber'))] = String(r.id);
            });
        });
        return out;
    };

    /**
     * Series del artículo que ya tienen existencia en inventario (NetSuite rechaza recibirlas de nuevo).
     * Devuelve { SERIE_EN_MAYUSCULAS: ['ubicación', ...] }. Busca por bloques para no armar filtros gigantes.
     * Si la cuenta no acepta alguna columna/filtro, prueba variantes más simples.
     */
    let serialSearchVariant = null;
    const SERIAL_SEARCH_VARIANTS = [
        { qty: 'quantityonhand', location: true },
        { qty: 'quantityonhand', location: false },
        { qty: 'quantityavailable', location: false }
    ];
    const findExistingSerials = (itemId, serials) => {
        const found = {};
        const run = (variant, chunk) => {
            const ors = [];
            chunk.forEach((s, k) => { if (k) ors.push('OR'); ors.push(['inventorynumber', 'is', s]); });
            const paged = search.create({
                type: 'inventorynumber',
                filters: [['item', 'anyof', itemId], 'AND', [variant.qty, 'greaterthan', 0], 'AND', ors],
                columns: ['inventorynumber'].concat(variant.location ? ['location'] : [])
            }).runPaged({ pageSize: 1000 });
            paged.pageRanges.forEach((pr) => {
                paged.fetch({ index: pr.index }).data.forEach((r) => {
                    const key = String(r.getValue('inventorynumber')).toUpperCase();
                    const loc = variant.location ? (r.getText('location') || '') : '';
                    found[key] = found[key] || [];
                    if (loc && found[key].indexOf(loc) === -1) found[key].push(loc);
                });
            });
        };
        for (let i = 0; i < serials.length; i += CONFIG.SERIAL_CHECK_CHUNK) {
            const chunk = serials.slice(i, i + CONFIG.SERIAL_CHECK_CHUNK);
            if (serialSearchVariant) { run(serialSearchVariant, chunk); continue; }
            let lastError = null;
            for (let v = 0; v < SERIAL_SEARCH_VARIANTS.length && !serialSearchVariant; v++) {
                try {
                    run(SERIAL_SEARCH_VARIANTS[v], chunk);
                    serialSearchVariant = SERIAL_SEARCH_VARIANTS[v];
                } catch (e) {
                    if (String(e.name || '').indexOf('SSS_INVALID_SRCH') !== 0) throw e;
                    lastError = e;
                }
            }
            if (!serialSearchVariant) throw lastError;
        }
        return found;
    };

    const inventoryStatusEnabled = () => {
        try { return runtime.isFeatureInEffect({ feature: 'INVENTORYSTATUS' }); } catch (e) { return false; }
    };

    const getInventoryStatuses = () => {
        const out = {};
        search.create({ type: 'inventorystatus', columns: ['name'] }).run().each((r) => {
            out[norm(r.getValue('name'))] = String(r.id);
            return true;
        });
        return out;
    };

    // ------------------------------------------------------------------ validación

    const itemMatches = (csvItem, line) => {
        const v = norm(csvItem);
        if (!v) return false;
        if (v === line.itemId) return true;
        const text = norm(line.itemText);
        const code = norm(String(line.itemText || '').split(':').pop());
        const full = norm(line.itemText + ' ' + (line.itemName || ''));
        // "PE-7083", "PE-7083 SIM SMART - MOVISTAR" o el ID interno
        return v === text || v === code || v === full ||
            text.indexOf(v + ' ') === 0 || code.indexOf(v + ' ') === 0 ||
            (code && v.indexOf(code + ' ') === 0);
    };

    const locationMatches = (csvLocation, line) => {
        const v = norm(csvLocation);
        if (!v) return true;
        return v === line.locationId ||
            v === norm(line.locationText) ||
            v === norm(String(line.locationText).split(':').pop());
    };

    /**
     * Valida las filas leídas contra las OC. Devuelve:
     *   summary: una fila por línea de OC (lo que ve el usuario)
     *   observations: errores y advertencias por fila
     *   job: solo las líneas sin errores, con los IDs ya resueltos (lo que ejecuta el MR)
     */
    const validate = (records) => {
        const observations = [];
        const groups = [];
        const byKey = {};

        records.forEach((r) => {
            const key = [r.poId, norm(r.item), r.line, norm(r.location)].join('|');
            if (!byKey[key]) {
                byKey[key] = { key, poId: r.poId, item: r.item, line: r.line, location: r.location,
                    lineQty: r.lineQty, rows: [], errors: [], warnings: [] };
                groups.push(byKey[key]);
            }
            byKey[key].rows.push(r);
        });

        const addObs = (g, type, rowNum, message) => {
            observations.push({ type, rowNum, poId: g.poId, item: g.item, message });
            (type === 'ERROR' ? g.errors : g.warnings).push(message);
        };

        const poIds = [];
        groups.forEach((g) => {
            if (!/^\d+$/.test(g.poId)) {
                addObs(g, 'ERROR', g.rows[0].rowNum, 'El ID interno de la OC "' + g.poId + '" no es válido (debe ser numérico).');
            } else if (poIds.indexOf(g.poId) === -1) {
                poIds.push(g.poId);
            }
        });

        const pos = getPoLines(poIds);

        // Resolver la línea de la OC de cada grupo
        groups.forEach((g) => {
            if (g.errors.length) return;
            const po = pos[g.poId];
            const first = g.rows[0].rowNum;
            if (!po) {
                addObs(g, 'ERROR', first, 'La OC con ID interno ' + g.poId + ' no existe, no es una orden de compra o no tiene líneas de artículo.');
                return;
            }
            g.tranid = po.tranid;

            const byItem = po.lines.filter((l) => itemMatches(g.item, l));
            if (!byItem.length) {
                addObs(g, 'ERROR', first, 'El artículo "' + g.item + '" no está en la OC ' + po.tranid +
                    '. Artículos de la OC: ' + po.lines.map((l) => l.itemText).join(', '));
                return;
            }
            const byLocation = byItem.filter((l) => locationMatches(g.location, l));
            if (!byLocation.length) {
                addObs(g, 'ERROR', first, 'El artículo "' + g.item + '" está en la OC ' + po.tranid +
                    ' pero en otra oficina (' + byItem.map((l) => l.locationText || 'sin oficina').join(', ') +
                    '), no en "' + g.location + '".');
                return;
            }
            const candidates = g.line ? byLocation.filter((l) => l.lineId === String(g.line)) : byLocation;
            if (!candidates.length) {
                addObs(g, 'ERROR', first, 'La línea ' + g.line + ' de la OC ' + po.tranid + ' no corresponde al artículo "' + g.item + '".');
                return;
            }
            if (candidates.length > 1) {
                addObs(g, 'ERROR', first, 'El artículo "' + g.item + '" aparece en varias líneas de la OC ' + po.tranid +
                    ' (líneas ' + candidates.map((l) => l.lineId).join(', ') + '). Agregue la columna "Linea" para indicar cuál.');
                return;
            }
            g.poLine = candidates[0];
            g.poStatus = po.status;
            g.poStatusText = po.statusText;
        });

        // Línea de OC usada por más de un grupo (p. ej. misma línea escrita con distinta oficina)
        const usedLines = {};
        groups.forEach((g) => {
            if (!g.poLine) return;
            const k = g.poId + '|' + g.poLine.lineUniqueKey;
            if (usedLines[k]) {
                addObs(g, 'ERROR', g.rows[0].rowNum, 'La línea ' + g.poLine.lineId + ' de la OC ' + g.tranid +
                    ' aparece en más de un bloque del archivo (revise el artículo/oficina de la fila ' + usedLines[k] + ').');
            } else {
                usedLines[k] = g.rows[0].rowNum;
            }
        });

        // Catálogos
        const locationIds = [];
        groups.forEach((g) => {
            if (g.poLine && g.poLine.locationId && locationIds.indexOf(g.poLine.locationId) === -1) {
                locationIds.push(g.poLine.locationId);
            }
        });
        const needsBins = groups.some((g) => g.poLine && g.rows.some((r) => r.bin));
        const bins = needsBins ? getBins(locationIds) : {};
        const statusOn = inventoryStatusEnabled();
        const needsStatus = statusOn && groups.some((g) => g.poLine && g.rows.some((r) => r.status));
        const statuses = needsStatus ? getInventoryStatuses() : {};
        let statusIgnoredWarned = false;

        // Validación fila por fila
        const seenSerial = {};
        groups.forEach((g) => {
            if (!g.poLine) return;
            const line = g.poLine;
            g.assignments = [];

            if (line.closed) addObs(g, 'ADVERTENCIA', g.rows[0].rowNum, 'La línea ' + line.lineId + ' de la OC ' + g.tranid + ' está cerrada.');
            if (line.received > 0) {
                addObs(g, 'ADVERTENCIA', g.rows[0].rowNum, 'La línea ' + line.lineId + ' de la OC ' + g.tranid + ' ya tiene ' + line.received +
                    ' unidades recibidas; NetSuite podría no permitir cambiar su detalle de inventario.');
            }
            if (g.lineQty) {
                const q = toNumber(g.lineQty);
                if (isNaN(q)) addObs(g, 'ERROR', g.rows[0].rowNum, 'La cantidad "' + g.lineQty + '" no es un número válido.');
                else if (!sameQty(q, line.quantity)) {
                    addObs(g, 'ERROR', g.rows[0].rowNum, 'La cantidad del archivo (' + q + ') no coincide con la cantidad de la línea en la OC (' + line.quantity + ').');
                }
            }

            g.rows.forEach((r) => {
                const serial = r.serial;
                if (!serial) { addObs(g, 'ERROR', r.rowNum, 'La fila no tiene número de serie/lote.'); return; }
                if (/^\d+(\.\d+)?e\+?\d+$/i.test(serial)) {
                    addObs(g, 'ERROR', r.rowNum, 'La serie "' + serial + '" está en notación científica (Excel la convirtió). Formatee la columna como Texto y vuelva a generar el CSV.');
                    return;
                }
                const dupKey = line.itemId + '|' + serial.toUpperCase();
                if (seenSerial[dupKey]) {
                    addObs(g, 'ERROR', r.rowNum, 'La serie ' + serial + ' está repetida (ya aparece en la fila ' + seenSerial[dupKey] + ').');
                    return;
                }
                seenSerial[dupKey] = r.rowNum;

                const qty = r.serialQty ? toNumber(r.serialQty) : 1;
                if (isNaN(qty) || qty <= 0) { addObs(g, 'ERROR', r.rowNum, 'La cantidad de la serie "' + r.serialQty + '" no es válida.'); return; }
                if (line.isSerial && !sameQty(qty, 1)) { addObs(g, 'ERROR', r.rowNum, 'Para artículos serializados la cantidad por serie debe ser 1 (se leyó ' + qty + ').'); return; }

                let binId = '';
                if (r.bin) {
                    binId = bins[line.locationId + '|' + norm(r.bin)] || '';
                    if (!binId) {
                        addObs(g, 'ERROR', r.rowNum, 'La oficina destino (bin) "' + r.bin + '" no existe en la ubicación ' + (line.locationText || line.locationId) + '.');
                        return;
                    }
                }

                let statusId = '';
                if (r.status) {
                    if (!statusOn) {
                        if (!statusIgnoredWarned) {
                            addObs(g, 'ADVERTENCIA', r.rowNum, 'La cuenta no usa estados de inventario; la columna Estado se ignorará.');
                            statusIgnoredWarned = true;
                        }
                    } else {
                        statusId = statuses[norm(r.status)] || '';
                        if (!statusId) { addObs(g, 'ERROR', r.rowNum, 'El estado de inventario "' + r.status + '" no existe.'); return; }
                    }
                }

                g.assignments.push({ serial, qty, binId, statusId, bin: r.bin, status: r.status, rowNum: r.rowNum });
            });

            const total = g.assignments.reduce((s, a) => s + a.qty, 0);
            if (!g.errors.length && !sameQty(total, line.quantity)) {
                addObs(g, 'ERROR', g.rows[0].rowNum, 'El archivo trae ' + total + ' unidades en series para la línea ' + line.lineId +
                    ' y la OC tiene ' + line.quantity + '. Deben coincidir.');
            }
        });

        // Series que ya existen en inventario: se reportan TODAS (NetSuite solo informa la primera al guardar).
        const toCheck = {};
        groups.forEach((g) => {
            if (!g.poLine || !g.assignments) return;
            g.existing = 0;
            g.assignments.forEach((a) => { (toCheck[g.poLine.itemId] = toCheck[g.poLine.itemId] || []).push({ g, a }); });
        });
        Object.keys(toCheck).forEach((itemId) => {
            const list = toCheck[itemId];
            const existing = findExistingSerials(itemId, list.map((x) => x.a.serial));
            list.forEach((x) => {
                const locs = existing[x.a.serial.toUpperCase()];
                if (!locs) return;
                x.g.existing++;
                observations.push({
                    type: 'ERROR', rowNum: x.a.rowNum, poId: x.g.poId, item: x.g.item,
                    message: 'La serie ' + x.a.serial + ' ya existe en inventario para el artículo ' + x.g.poLine.itemText +
                        (locs.length ? ' (ubicación: ' + locs.join(', ') + ')' : '') + '.'
                });
            });
        });

        const hasErrors = (g) => g.errors.length > 0 || g.existing > 0;
        const groupMessage = (g) => {
            const parts = [];
            if (g.existing) parts.push(g.existing + ' serie(s) ya existen en inventario (ver Observaciones).');
            if (g.errors.length) parts.push(g.errors[0] + (g.errors.length > 1 ? ' (+' + (g.errors.length - 1) + ' errores más)' : ''));
            if (parts.length) return parts.join(' ');
            return g.warnings.length ? g.warnings.join(' ') : 'OK';
        };

        // Resultado
        const distinct = (arr) => arr.filter((v, i) => v && arr.indexOf(v) === i);
        const summary = groups.map((g) => {
            const line = g.poLine || {};
            const a = g.assignments || [];
            return {
                ok: !hasErrors(g),
                poId: g.poId,
                tranid: g.tranid || '',
                poStatus: g.poStatusText || '',
                lineId: line.lineId || g.line || '',
                item: line.itemText || g.item,
                location: line.locationText || g.location,
                poQty: line.quantity === undefined ? '' : line.quantity,
                csvRows: g.rows.length,
                csvQty: a.reduce((s, x) => s + x.qty, 0),
                firstSerial: a.length ? a[0].serial : '',
                lastSerial: a.length ? a[a.length - 1].serial : '',
                bins: distinct(a.map((x) => x.bin)).join(', '),
                statuses: distinct(a.map((x) => x.status)).join(', '),
                message: groupMessage(g)
            };
        });

        const okGroups = groups.filter((g) => !hasErrors(g));
        const job = {
            createdAt: new Date().toISOString(),
            createdBy: runtime.getCurrentUser().id,
            groups: okGroups.map((g) => ({
                poId: g.poId,
                tranid: g.tranid,
                lineId: g.poLine.lineId,
                lineUniqueKey: g.poLine.lineUniqueKey,
                itemId: g.poLine.itemId,
                itemText: g.poLine.itemText,
                quantity: g.poLine.quantity,
                assignments: g.assignments.map((x) => ({ serial: x.serial, qty: x.qty, binId: x.binId, statusId: x.statusId }))
            }))
        };

        observations.sort((a, b) => (a.rowNum || 0) - (b.rowNum || 0));

        return {
            summary,
            observations,
            job,
            stats: {
                rows: records.length,
                lines: groups.length,
                okLines: okGroups.length,
                errorLines: groups.length - okGroups.length,
                okPos: okGroups.map((g) => g.poId).filter((v, i, arr) => arr.indexOf(v) === i).length,
                okSerials: okGroups.reduce((s, g) => s + g.assignments.length, 0),
                errors: observations.filter((o) => o.type === 'ERROR').length,
                warnings: observations.filter((o) => o.type !== 'ERROR').length
            }
        };
    };

    const templateCsv = () => toCsv(
        TEMPLATE_COLUMNS.map((c) => c.label),
        [
            ['6655421', 'PE-7083 SIM SMART - MOVISTAR', 'LIMA : SURQUILLO', '10000', '8934071700077462951', '1', 'Bueno', '1', 'SURQ-ALM GRAL COMPO.'],
            ['6655421', 'PE-7083 SIM SMART - MOVISTAR', 'LIMA : SURQUILLO', '10000', '8934071700077465863', '1', 'Bueno', '1', 'SURQ-ALM GRAL COMPO.']
        ]
    );

    return {
        CONFIG,
        COLUMNS,
        TEMPLATE_COLUMNS,
        norm,
        sameQty,
        stamp,
        stampToText,
        validatedFileName,
        queuedFileName,
        doneFileName,
        resultFileName,
        logFileName,
        exeFileName,
        toCsv,
        renameFile,
        listQueuedJobs,
        eachFile,
        saveJson,
        saveCsv,
        findFileId,
        parseCsvText,
        readCsv,
        validate,
        templateCsv
    };
});
