/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * PARAMS (deploy/script):
 *  - custscript_internal_ids           (string)  : "1,2,3" o JSON "[1,2,3]"
 *  - custscript_new_department_id      (string|number): id interno del nuevo departamento
 *  - custscript_target_recordtype      (string)  : "salesorder" | "invoice" | "customsale_ec_factura_interna"
 *      *Si no lo pones, por defecto "salesorder"
 *
 * REGLAS:
 *  - SOLO procesa subsidiaria = 3 (hardcode). Si es otra, no hace nada.
 *  - Trabaja por Main Line (header) y por líneas de item.
 *  - Loguea SOLO cambios reales (antes != después). No repite 2 o 3 veces lo mismo.
 *  - Evita líneas “extra” (tax/shipping/cogs) y deduplica por lineuniquekey.
 */

define(['N/runtime', 'N/search', 'N/record', 'N/log'], (runtime, search, record, log) => {
  const SUBSIDIARY_ALLOWED = '3';

  // -----------------------------
  // Helpers
  // -----------------------------
  function parseInternalIds(raw) {
    if (!raw) return [];
    const s = String(raw).trim();
    if (!s) return [];

    // JSON array
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const arr = JSON.parse(s);
        return (Array.isArray(arr) ? arr : [])
          .map(v => String(v).trim())
          .filter(Boolean);
      } catch (e) {
        // cae a parse CSV
      }
    }

    // CSV
    return s
      .split(',')
      .map(v => String(v).trim())
      .filter(Boolean);
  }

  function uniq(arr) {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }

  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function normalizeRecordType(raw) {
    const rt = (raw ? String(raw).trim() : '').toLowerCase();
    if (!rt) return 'salesorder';

    // permitimos aliases típicos
    if (rt === 'so' || rt === 'sales_order' || rt === 'salesord') return 'salesorder';
    if (rt === 'inv' || rt === 'custinvc' || rt === 'customerinvoice') return 'invoice';

    return rt; // p.ej. "customsale_ec_factura_interna"
  }

  function getLoadType(recordType) {
    // record.load para transacciones estándar acepta record.Type.*
    // para custom transaction acepta el string del recordtype, p.ej. "customsale_ec_factura_interna"
    switch (recordType) {
      case 'salesorder':
        return record.Type.SALES_ORDER;
      case 'invoice':
        return record.Type.INVOICE;
      default:
        return recordType; // custom transaction record type id
    }
  }

  function isTruthy(v) {
    return v === true || v === 'T' || v === 'true' || v === 'TRUE';
  }

  // Busca headers (mainline) válidos por IDs + subsidiaria + recordtype
  function searchMainlines(recordType, internalIdsChunk) {
    const s = search.create({
      type: search.Type.TRANSACTION,
      filters: [
        ['internalid', 'anyof', internalIdsChunk],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['subsidiary', 'anyof', SUBSIDIARY_ALLOWED],
        'AND',
        ['recordtype', 'is', recordType],
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'tranid' }),
        search.createColumn({ name: 'recordtype' }),
        search.createColumn({ name: 'subsidiary' }),
        search.createColumn({ name: 'department' }),
      ],
    });

    const out = new Map(); // id -> { tranid, recordtype, dept, subsidiary }
    s.run().each(r => {
      const id = String(r.getValue({ name: 'internalid' }));
      out.set(id, {
        id,
        tranid: String(r.getValue({ name: 'tranid' }) || ''),
        recordtype: String(r.getValue({ name: 'recordtype' }) || recordType),
        subsidiary: String(r.getValue({ name: 'subsidiary' }) || ''),
        dept: String(r.getValue({ name: 'department' }) || ''),
      });
      return true;
    });
    return out;
  }

  // Busca SOLO líneas de item (excluye tax/shipping/cogs) y deduplica por lineuniquekey
  function searchItemLines(recordType, internalIdsChunk) {
    const s = search.create({
      type: search.Type.TRANSACTION,
      filters: [
        ['internalid', 'anyof', internalIdsChunk],
        'AND',
        ['mainline', 'is', 'F'],
        'AND',
        ['subsidiary', 'anyof', SUBSIDIARY_ALLOWED],
        'AND',
        ['recordtype', 'is', recordType],
        // excluir líneas no-item / extras:
        'AND',
        ['taxline', 'is', 'F'],
        'AND',
        ['shipping', 'is', 'F'],
        'AND',
        ['cogs', 'is', 'F'],
        'AND',
        ['item', 'noneof', '@NONE@'],
      ],
      columns: [
        search.createColumn({ name: 'internalid' }),
        search.createColumn({ name: 'lineuniquekey' }),
        search.createColumn({ name: 'line' }),
        search.createColumn({ name: 'department' }),
      ],
    });

    const byTxn = new Map(); // txnId -> Map(lineuniquekey -> { line, dept })
    s.run().each(r => {
      const txnId = String(r.getValue({ name: 'internalid' }));
      const luk = String(r.getValue({ name: 'lineuniquekey' }) || '');
      if (!luk) return true;

      const lineNo = String(r.getValue({ name: 'line' }) || '');
      const dept = String(r.getValue({ name: 'department' }) || '');

      if (!byTxn.has(txnId)) byTxn.set(txnId, new Map());
      const map = byTxn.get(txnId);

      // dedupe por lineuniquekey (si el search devuelve repetido por joins raros)
      if (!map.has(luk)) {
        map.set(luk, { line: lineNo, dept });
      }
      return true;
    });

    return byTxn;
  }

  // Aplica cambios SOLO si realmente difiere (mainline y líneas), y loguea SOLO lo que cambió.
  function processTransaction({ recordType, txnId, tranid, newDeptId, lineKeysMap }) {
    const loadType = getLoadType(recordType);

    const rec = record.load({
      type: loadType,
      id: txnId,
      isDynamic: false,
    });

    // Validación extra por si acaso (aunque ya filtramos en search)
    const sub = String(rec.getValue({ fieldId: 'subsidiary' }) || '');
    if (sub !== SUBSIDIARY_ALLOWED) {
      return { status: 'SKIPPED', reason: `Subsidiary=${sub} != ${SUBSIDIARY_ALLOWED}`, changes: [] };
    }

    const changes = [];
    let dirty = false;

    // --- MAIN LINE (header) ---
    const oldMainDept = String(rec.getValue({ fieldId: 'department' }) || '');
    if (oldMainDept !== String(newDeptId)) {
      rec.setValue({ fieldId: 'department', value: newDeptId });
      dirty = true;
      changes.push({
        scope: 'MAIN',
        from: oldMainDept || '(vacío)',
        to: String(newDeptId),
      });
    }

    // --- ITEM LINES ---
    const targetLineKeys = lineKeysMap ? new Set(Array.from(lineKeysMap.keys())) : new Set();
    if (targetLineKeys.size) {
      const lineCount = rec.getLineCount({ sublistId: 'item' });
      for (let i = 0; i < lineCount; i++) {
        const luk = String(rec.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i }) || '');
        if (!luk || !targetLineKeys.has(luk)) continue;

        // Por seguridad: si la línea en record es tax/shipping (a veces existen flags)
        const taxLine = rec.getSublistValue({ sublistId: 'item', fieldId: 'taxline', line: i });
        const shipLine = rec.getSublistValue({ sublistId: 'item', fieldId: 'shipping', line: i });
        const cogsLine = rec.getSublistValue({ sublistId: 'item', fieldId: 'cogs', line: i });
        if (isTruthy(taxLine) || isTruthy(shipLine) || isTruthy(cogsLine)) continue;

        const oldLineDept = String(rec.getSublistValue({ sublistId: 'item', fieldId: 'department', line: i }) || '');
        if (oldLineDept !== String(newDeptId)) {
          rec.setSublistValue({ sublistId: 'item', fieldId: 'department', line: i, value: newDeptId });
          dirty = true;

          changes.push({
            scope: 'LINE',
            line: i + 1, // 1-based solo para visual
            lineuniquekey: luk,
            from: oldLineDept || '(vacío)',
            to: String(newDeptId),
          });
        }
      }
    }

    if (!dirty) {
      return { status: 'OK_NOCHANGE', changes: [] };
    }

    const savedId = rec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    return { status: 'OK', savedId, changes };
  }

  // -----------------------------
  // Entry Point
  // -----------------------------
  function execute(context) {
    const script = runtime.getCurrentScript();

    const rawIds = script.getParameter({ name: 'custscript_txn_internalids_csv' });
    const newDeptId = script.getParameter({ name: 'custscript_new_department_id' });
    const rawRecordType = script.getParameter({ name: 'custscript_target_recordtype' });

    const recordType = normalizeRecordType(rawRecordType);
    const internalIds = uniq(parseInternalIds(rawIds));

    if (!internalIds.length) {
      log.audit({ title: 'Resumen', details: `Sin IDs para procesar. recordType=${recordType}` });
      return;
    }
    if (!newDeptId) {
      throw new Error('Falta parámetro custscript_new_department_id');
    }

    const chunks = chunk(internalIds, 1000);

    let found = 0;
    let ok = 0;
    let noChange = 0;
    let skipped = 0;
    let fail = 0;

    for (const idsChunk of chunks) {
      // 1) Buscar transacciones MAINLINE que cumplen subsidiaria=3 y recordtype
      const mainMap = searchMainlines(recordType, idsChunk);

      // 2) Buscar líneas de item (dedupe lineuniquekey)
      const linesMap = searchItemLines(recordType, idsChunk);

      // IDs que no salieron en mainMap => o no existen / no subsidiaria 3 / no recordtype
      const mainIds = new Set(Array.from(mainMap.keys()));
      const notFoundOrFiltered = idsChunk.filter(id => !mainIds.has(String(id)));
      for (const id of notFoundOrFiltered) {
        skipped++;
        log.audit({
          title: 'SKIPPED',
          details: `id=${id} motivo=No encontrado / filtro (subsidiary=3, recordtype=${recordType})`,
        });
      }

      for (const [txnId, info] of mainMap.entries()) {
        found++;
        const tranid = info.tranid || '';
        const perTxnLines = linesMap.get(txnId) || new Map();

        try {
          const res = processTransaction({
            recordType,
            txnId,
            tranid,
            newDeptId,
            lineKeysMap: perTxnLines,
          });

          if (res.status === 'OK') {
            ok++;

            // Loguear SOLO cambios reales (en 1 sola línea por transacción)
            const mainChanges = res.changes.filter(c => c.scope === 'MAIN').length;
            const lineChanges = res.changes.filter(c => c.scope === 'LINE').length;

            // Detalle compacto (si prefieres más verboso, lo expandimos)
            const detailParts = [];
            for (const c of res.changes) {
              if (c.scope === 'MAIN') {
                detailParts.push(`MAIN dept: ${c.from} -> ${c.to}`);
              } else {
                detailParts.push(`LINE#${c.line}(${c.lineuniquekey}) dept: ${c.from} -> ${c.to}`);
              }
            }

            log.audit({
              title: 'Actualizado',
              details: `id=${txnId} tranid=${tranid} recordtype=${recordType} cambios=${res.changes.length} (main=${mainChanges}, lines=${lineChanges}) | ${detailParts.join(' | ')}`,
            });
          } else if (res.status === 'OK_NOCHANGE') {
            noChange++;
            // NO logueamos “no cambió” porque pediste mostrar solo lo que hizo.
          } else if (res.status === 'SKIPPED') {
            skipped++;
            log.audit({
              title: 'SKIPPED',
              details: `id=${txnId} tranid=${tranid} recordtype=${recordType} motivo=${res.reason || 'N/A'}`,
            });
          } else {
            // Cualquier estado inesperado lo consideramos skip
            skipped++;
            log.audit({
              title: 'SKIPPED',
              details: `id=${txnId} tranid=${tranid} recordtype=${recordType} motivo=Estado ${res.status}`,
            });
          }
        } catch (e) {
          fail++;
          log.error({
            title: 'FAIL',
            details: `id=${txnId} tranid=${tranid} recordtype=${recordType} err=${e.name || ''} ${e.message || e}`,
          });
        }
      }
    }

    // Resumen final (sí conviene verlo)
    log.audit({
      title: 'Resumen',
      details:
        `Target=${recordType} | InputIDs=${internalIds.length} | ` +
        `Encontrados(sub=3)=${found} | OK=${ok} | NOCHANGE=${noChange} | FAIL=${fail} | SKIPPED=${skipped}`,
    });
  }

  return { execute };
});
