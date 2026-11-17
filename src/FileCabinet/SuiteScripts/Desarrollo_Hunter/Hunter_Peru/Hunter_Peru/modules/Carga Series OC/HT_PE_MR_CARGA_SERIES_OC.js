/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * HT PE - Carga de series en Órdenes de Compra (proceso)
 *
 * Sin parámetros: procesa los archivos en cola (HT_PE_CS_JOB_<id>.json) de la carpeta
 * fija de la librería. El Suitelet HT_PE_SL_CARGA_SERIES_OC los pone en cola al presionar
 * "Ejecutar". Por cada línea escribe el inventory detail de la OC; el detalle existente
 * se reemplaza por el del archivo.
 *
 * El trabajo se hace en reduce (no en map): una OC se guarda en una sola invocación y map
 * corta a los 5 minutos; reduce permite 15 minutos y 5,000 unidades. La OC se edita en modo
 * estándar (no dinámico) para que miles de series no hagan una validación por campo.
 *
 * Al terminar, por cada archivo procesado:
 *   - guarda HT_PE_CS_RES_<id>.json / .csv con el resultado por OC
 *   - renombra el archivo a HT_PE_CS_DONE_<id>.json para no volver a procesarlo
 */
define(['N/record', 'N/file', 'N/error', 'N/log', './HT_PE_LIB_CARGA_SERIES_OC'],
    (record, file, error, log, lib) => {

        const SUBLIST = 'item';
        const ASSIGN = 'inventoryassignment';
        const SEP = '|';

        const getInputData = () => {
            const jobs = lib.listQueuedJobs();
            const byKey = {};
            jobs.forEach((j) => {
                try {
                    const job = JSON.parse(file.load({ id: j.id }).getContents());
                    (job.groups || []).forEach((g) => {
                        const key = j.id + SEP + g.poId;
                        (byKey[key] = byKey[key] || []).push(g);
                    });
                } catch (e) {
                    log.error('No se pudo leer ' + j.name, e);
                }
            });
            log.audit('Inicio', 'Archivos en cola: ' + jobs.map((j) => j.name).join(', ') + ' | OC: ' + Object.keys(byKey).length);
            return byKey;
        };

        const findLine = (po, g) => {
            const count = po.getLineCount({ sublistId: SUBLIST });
            for (let i = 0; i < count; i++) {
                if (String(po.getSublistValue({ sublistId: SUBLIST, fieldId: 'lineuniquekey', line: i })) === String(g.lineUniqueKey)) return i;
            }
            for (let i = 0; i < count; i++) {
                if (String(po.getSublistValue({ sublistId: SUBLIST, fieldId: 'line', line: i })) === String(g.lineId)) return i;
            }
            return -1;
        };

        const applyLine = (po, g) => {
            const idx = findLine(po, g);
            if (idx === -1) throw error.create({ name: 'HT_PE_CS_LINEA', message: 'No se encontró la línea ' + g.lineId + ' en la OC.' });

            const itemId = String(po.getSublistValue({ sublistId: SUBLIST, fieldId: 'item', line: idx }));
            if (itemId !== String(g.itemId)) {
                throw error.create({ name: 'HT_PE_CS_ARTICULO', message: 'La línea ' + g.lineId + ' ya no tiene el artículo ' + g.itemText + '.' });
            }
            const qty = Number(po.getSublistValue({ sublistId: SUBLIST, fieldId: 'quantity', line: idx }));
            const total = g.assignments.reduce((s, a) => s + Number(a.qty), 0);
            if (!lib.sameQty(qty, total)) {
                throw error.create({ name: 'HT_PE_CS_CANTIDAD', message: 'La cantidad de la línea ' + g.lineId + ' cambió a ' + qty + ' después de la validación (archivo: ' + total + ').' });
            }

            const inv = po.getSublistSubrecord({ sublistId: SUBLIST, fieldId: 'inventorydetail', line: idx });
            for (let i = inv.getLineCount({ sublistId: ASSIGN }) - 1; i >= 0; i--) {
                inv.removeLine({ sublistId: ASSIGN, line: i });
            }

            g.assignments.forEach((a, i) => {
                inv.insertLine({ sublistId: ASSIGN, line: i });
                inv.setSublistValue({ sublistId: ASSIGN, fieldId: 'receiptinventorynumber', line: i, value: a.serial });
                if (a.binId) inv.setSublistValue({ sublistId: ASSIGN, fieldId: 'binnumber', line: i, value: a.binId });
                if (a.statusId) inv.setSublistValue({ sublistId: ASSIGN, fieldId: 'inventorystatus', line: i, value: a.statusId });
                inv.setSublistValue({ sublistId: ASSIGN, fieldId: 'quantity', line: i, value: Number(a.qty) });
            });
        };

        /** Una invocación por archivo + OC: se carga y guarda una sola vez aunque tenga varias líneas. */
        const reduce = (context) => {
            const poId = context.key.split(SEP)[1];
            const groups = JSON.parse(context.values[0]);
            const result = {
                poId,
                tranid: groups[0].tranid,
                lines: groups.map((g) => g.lineId + ' ' + g.itemText).join(' / '),
                serials: groups.reduce((s, g) => s + g.assignments.length, 0),
                ok: false,
                message: ''
            };
            try {
                const po = record.load({ type: record.Type.PURCHASE_ORDER, id: poId, isDynamic: false });
                groups.forEach((g) => applyLine(po, g));
                po.save({ enableSourcing: false, ignoreMandatoryFields: true });
                result.ok = true;
                result.message = 'Detalle de inventario actualizado';
                log.audit('OC ' + result.tranid, result.serials + ' series cargadas');
            } catch (e) {
                result.message = (e.name ? e.name + ': ' : '') + e.message;
                if (e.name === 'RCRD_LOCKED_BY_WF') {
                    result.message += '. La OC está bloqueada por un workflow (acción "Bloquear registro"). ' +
                        'Excluya el contexto Map/Reduce en esa acción del workflow de Órdenes de Compra y vuelva a ejecutar.';
                }
                log.error('OC ' + result.tranid + ' (' + poId + ')', result.message);
            }
            context.write({ key: context.key, value: JSON.stringify(result) });
        };

        const summarize = (summary) => {
            if (summary.inputSummary.error) log.error('Error en getInputData', summary.inputSummary.error);

            const byJob = {};
            const add = (key, r) => {
                const jobId = String(key).split(SEP)[0];
                (byJob[jobId] = byJob[jobId] || []).push(r);
            };
            summary.output.iterator().each((key, value) => { add(key, JSON.parse(value)); return true; });
            summary.reduceSummary.errors.iterator().each((key, err) => {
                let msg = err;
                try { const e = JSON.parse(err); msg = e.name + ': ' + e.message; } catch (x) { /* texto plano */ }
                add(key, { poId: String(key).split(SEP)[1], tranid: '', lines: '', serials: 0, ok: false, message: msg });
                return true;
            });

            Object.keys(byJob).forEach((jobId) => {
                const results = byJob[jobId];
                const data = {
                    jobId,
                    finishedAt: new Date().toISOString(),
                    total: results.length,
                    ok: results.filter((r) => r.ok).length,
                    errors: results.filter((r) => !r.ok).length,
                    results
                };
                try {
                    lib.saveJson(lib.CONFIG.FOLDER_ID, lib.resultFileName(jobId, 'json'), data);
                    lib.saveCsv(lib.CONFIG.FOLDER_ID, lib.resultFileName(jobId, 'csv'), lib.toCsv(
                        ['OC', 'ID interno', 'Lineas', 'Series', 'Resultado', 'Mensaje'],
                        results.map((r) => [r.tranid, r.poId, r.lines, r.serials, r.ok ? 'OK' : 'ERROR', r.message])
                    ));
                    lib.renameFile(jobId, lib.doneFileName(jobId));
                } catch (e) {
                    log.error('No se pudo cerrar el archivo ' + jobId, e);
                }
                log.audit('Archivo ' + jobId, 'OC: ' + data.total + ' | OK: ' + data.ok + ' | Error: ' + data.errors);
            });

            log.audit('Fin', 'Archivos: ' + Object.keys(byJob).length + ' | Uso: ' + summary.usage + ' | Tiempo: ' + summary.seconds + 's');
        };

        return { getInputData, reduce, summarize };
    });
