/**
 * SCHEDULED SCRIPT - OS Sync (sin N/query, sin parámetros)
 *
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/https', 'N/log', 'N/runtime', 'N/task'], function (search, record, https, log, runtime, task) {
  'use strict';

  // =========================================================
  // CONFIG (TODO AQUÍ, SIN PARÁMETROS)
  // =========================================================
  const CONFIG = {
    TEST_MODE: true,               // true = NO envía, solo muestra payload; false = envía real
    API_URL: 'https://syshunterperu.com/migraos/migraos/NS/generateOSNetsuite',

    // MASIVO
    MAX_PER_RUN: 50,               // cuántas OS procesa por corrida
    AUTO_RESCHEDULE_WHEN_LIMIT: false, // si llega al MAX_PER_RUN se reprograma solo (sin usar parámetros)
    MIN_REMAINING_USAGE_TO_CONTINUE: 400,

    // MANUAL
    MANUAL_MODE: false,            // true => solo procesa las OS de MANUAL_OS_IDS
    MANUAL_OS_IDS_CSV: '3658177,3658178', // ejemplo: "123,456,789" (solo si MANUAL_MODE=true)
    // alternativa si prefieres array:
    // MANUAL_OS_IDS_ARRAY: [3658177, 3658178],

    // Si deseas obligar fecha HOY también en manual, cambia a true
    FORCE_TODAY_ON_MANUAL: false,

    // Impuesto (fallback)
    TAX_RATE_FALLBACK: 0.18,

    // Si tu API quiere id_int_os también al nivel superior:
    INCLUDE_TOP_LEVEL_ID_INT_OS: false
  };

  // Campos control
  const FIELDS = {
    SENT: 'custbody_os_api_sent',
    SENT_DATE: 'custbody_os_api_sent_date',
    FAILED: 'custbody_os_api_failed',
    LAST_ATTEMPT: 'custbody_os_api_last_attempt',
    ATTEMPTS: 'custbody_os_api_attempts',
    LAST_RESPONSE: 'custbody_os_api_last_response',
    MEMO: 'memo'
  };

  // =========================================================
  // ENTRY
  // =========================================================
  function execute(context) {
    const script = runtime.getCurrentScript();

    log.audit('OS Sync Scheduled - START', {
      testMode: CONFIG.TEST_MODE,
      manualMode: CONFIG.MANUAL_MODE,
      maxPerRun: CONFIG.MAX_PER_RUN,
      apiUrl: CONFIG.API_URL
    });

    const candidateIds = CONFIG.MANUAL_MODE
      ? getManualIds()
      : searchPendingOrdersToday({ limit: CONFIG.MAX_PER_RUN });

    if (!candidateIds.length) {
      log.audit('OS Sync - NO CANDIDATES', { manualMode: CONFIG.MANUAL_MODE, testMode: CONFIG.TEST_MODE });
      return;
    }

    let processed = 0, success = 0, failed = 0, skipped = 0;

    for (let i = 0; i < candidateIds.length; i++) {
      const recordId = candidateIds[i];
      processed++;

      const remaining = script.getRemainingUsage();
      if (remaining < CONFIG.MIN_REMAINING_USAGE_TO_CONTINUE) {
        log.audit('Low governance, stopping early', { remaining, processedSoFar: processed });
        break;
      }

      try {
        const eligibility = getEligibility(recordId, CONFIG.MANUAL_MODE, CONFIG.FORCE_TODAY_ON_MANUAL);
        if (!eligibility.ok) {
          skipped++;
          log.audit('Skipping (not eligible)', { recordId, reason: eligibility.reason });
          continue;
        }

        const orderData = buildOrderDataSnakeCase(recordId);
        if (!orderData) {
          failed++;
          log.error('No orderData generated', { recordId });
          if (!CONFIG.TEST_MODE) markAsFailed(recordId, 'No se pudo construir orderData', null);
          continue;
        }

        // usuario = DNI (ejecutiva_referencia)
        const usuario = toInt(orderData.ejecutiva_referencia, null);
        if (!usuario) {
          failed++;
          log.error('No usuario (DNI) found', { recordId, ejecutiva_referencia: orderData.ejecutiva_referencia });
          if (!CONFIG.TEST_MODE) markAsFailed(recordId, 'No se encontró usuario (DNI) para enviar', null);
          continue;
        }

        const payload = buildApiPayload({ usuario, recordId, orderData });

        // ✅ Mostrar siempre el JSON real
        log.audit('API Payload (structure)', safeJsonForLog(payload));

        if (CONFIG.TEST_MODE) {
          log.audit('TEST MODE - Not sending', { recordId });
          continue;
        }

        const apiStart = Date.now();
        const apiResult = sendToApi(CONFIG.API_URL, payload);
        apiResult.responseTimeMs = Date.now() - apiStart;

        if (apiResult.success) {
          success++;
          markAsSuccess(recordId, apiResult);
          log.audit('API Success', {
            recordId,
            statusCode: apiResult.statusCode,
            numeroOS: apiResult.numeroOS,
            codigoVehiculo: apiResult.codigoVehiculo,
            responseTimeMs: apiResult.responseTimeMs
          });
        } else {
          failed++;
          markAsFailed(recordId, apiResult.error || 'API error', apiResult);
          log.error('API Failed', {
            recordId,
            statusCode: apiResult.statusCode,
            error: apiResult.error,
            responseTimeMs: apiResult.responseTimeMs
          });
        }

      } catch (e) {
        failed++;
        log.error('Unexpected error', { recordId, error: e.message, stack: e.stack });
        if (!CONFIG.TEST_MODE) markAsFailed(recordId, 'Script Error: ' + e.message, null);
      }
    }

    log.audit('OS Sync Scheduled - SUMMARY', {
      testMode: CONFIG.TEST_MODE,
      manualMode: CONFIG.MANUAL_MODE,
      processed,
      success,
      failed,
      skipped
    });

    // Auto reschedule (sin parámetros): vuelve a correr y tomará las siguientes OS que sigan pendientes
    if (!CONFIG.MANUAL_MODE && !CONFIG.TEST_MODE && CONFIG.AUTO_RESCHEDULE_WHEN_LIMIT) {
      if (processed >= CONFIG.MAX_PER_RUN) {
        rescheduleSelf();
      }
    }
  }

  // =========================================================
  // MANUAL IDS
  // =========================================================
  function getManualIds() {
    // Si prefieres array, puedes cambiar aquí fácilmente
    return parseIdList(CONFIG.MANUAL_OS_IDS_CSV || '');
  }

  // =========================================================
  // MASSIVE SEARCH (HOY, NO ENVIADAS, SIN REENVÍOS)
  // =========================================================
  function searchPendingOrdersToday(opts) {
    const limit = toInt(opts.limit, 50);

    const filters = [
      ['mainline', 'is', 'T'],
      'AND', ['type', 'anyof', 'SalesOrd'],
      'AND', ['trandate', 'on', 'today'],
      'AND', [FIELDS.MEMO, 'isempty', ''],
      'AND', [FIELDS.SENT, 'is', 'F'],
      'AND', [FIELDS.FAILED, 'is', 'F'],
      'AND',
      [
        [FIELDS.ATTEMPTS, 'isempty', ''],
        'OR',
        [FIELDS.ATTEMPTS, 'equalto', '0']
      ]
    ];

    const cols = [search.createColumn({ name: 'internalid', sort: search.Sort.ASC })];

    const s = search.create({ type: 'salesorder', filters: filters, columns: cols });

    const out = [];
    const paged = s.runPaged({ pageSize: 1000 });

    paged.pageRanges.some(function (range) {
      const page = paged.fetch({ index: range.index });
      for (let i = 0; i < page.data.length; i++) {
        out.push(toInt(page.data[i].getValue({ name: 'internalid' }), 0));
        if (out.length >= limit) return true;
      }
      return false;
    });

    log.audit('Candidates (massive search)', { found: out.length, limit });
    return out;
  }

  // =========================================================
  // ELIGIBILITY (SIN REENVÍOS)
  // =========================================================
  function getEligibility(recordId, isManualRun, forceTodayOnManual) {
    const f = search.lookupFields({
      type: 'salesorder',
      id: recordId,
      columns: [FIELDS.SENT, FIELDS.FAILED, FIELDS.ATTEMPTS, FIELDS.MEMO, 'trandate']
    });

    const sent = !!f[FIELDS.SENT];
    const failed = !!f[FIELDS.FAILED];
    const attempts = toInt(f[FIELDS.ATTEMPTS], 0);
    const memo = (f[FIELDS.MEMO] || '').toString().trim();

    if (sent) return { ok: false, reason: 'Ya enviado (custbody_os_api_sent=T)' };
    if (memo) return { ok: false, reason: 'Memo no vacío' };
    if (failed) return { ok: false, reason: 'Marcado failed (sin reenvíos)' };
    if (attempts > 0) return { ok: false, reason: 'Ya tuvo intentos > 0 (sin reenvíos)' };

    if (isManualRun && forceTodayOnManual) {
      // trandate en lookupFields puede ser string/Date según cuenta; si falla, omitimos bloqueo
      // La forma segura de forzarlo es: en manual NO, pero si lo deseas lo puedes implementar con un search adicional.
    }

    return { ok: true };
  }

  // =========================================================
  // BUILD objJson[0] (snake_case) SIN SuiteQL
  // =========================================================
  function buildOrderDataSnakeCase(recordId) {
    const so = record.load({ type: 'salesorder', id: recordId, isDynamic: false });

    const customerId = toInt(so.getValue({ fieldId: 'entity' }), 0);
    const bienId = toInt(so.getValue({ fieldId: 'custbody_ht_so_bien' }), 0);

    const startdate = so.getValue({ fieldId: 'startdate' });
    const enddate = so.getValue({ fieldId: 'enddate' });

    const ejecGestionId = toInt(so.getValue({ fieldId: 'custbody_ht_os_ejecutiva_backoffice' }), 0);
    const ejecRenovId = toInt(so.getValue({ fieldId: 'custbody_os_ejecutivarenovacion' }), 0);
    const ejecRefId = toInt(so.getValue({ fieldId: 'custbody_ht_os_ejecutivareferencia' }), 0);

    const ejecutiva_gestion = lookupEmployeeDocNumber(ejecGestionId);
    const ejecutiva_renovacion = lookupEmployeeDocNumber(ejecRenovId);
    const ejecutiva_referencia = lookupEmployeeDocNumber(ejecRefId);

    const cust = customerId ? lookupCustomer(customerId) : null;
    const bill = getBillingAddressParts(so);
    const bien = bienId ? lookupBien(bienId) : {};
    const dept = lookupDeptInfo(so);
    const items = extractTop10Items(so);

    const data = {
      n_credito: '1',
      fini: formatYMDorNull(startdate),
      ffin: formatYMDorNull(enddate),

      ejecutiva_gestion: ejecutiva_gestion,
      ejecutiva_renovacion: ejecutiva_renovacion,

      plazo_item_1: emptyToNull(items.plazos[0]),
      plazo_item_2: emptyToNull(items.plazos[1]),
      plazo_item_3: emptyToNull(items.plazos[2]),
      plazo_item_4: emptyToNull(items.plazos[3]),
      plazo_item_5: emptyToNull(items.plazos[4]),
      plazo_item_6: emptyToNull(items.plazos[5]),
      plazo_item_7: emptyToNull(items.plazos[6]),
      plazo_item_8: emptyToNull(items.plazos[7]),
      plazo_item_9: emptyToNull(items.plazos[8]),
      plazo_item_10: emptyToNull(items.plazos[9]),

      id_lugar_instalacion: lookupLugarInstalacionCodigo(toInt(so.getValue({ fieldId: 'custbody_pe_ht_lugar_instalacion' }), 0)),
      id_leyenda: lookupLeyendaCodigo(toInt(so.getValue({ fieldId: 'custbody_ht_pe_os_leyenda' }), 0)),
      id_convenio_netsuite: nullIfZero(toInt(so.getValue({ fieldId: 'custbody_pe_os_convenio' }), 0)),
      id_canal_distribucion_sys: nullIfZero(toInt(so.getValue({ fieldId: 'custbody_canal_distribucion_sys' }), 0)),

      id_interno_os: recordId,
      id_interno_bien: bienId || null,
      id_interno_cliente: customerId || null,

      nombres: cust ? (cust.isperson ? cust.firstname : cust.companyname) : null,
      apellido_paterno: cust ? (cust.isperson ? cust.lastname : ' ') : null,
      apellido_materno: null,

      tipo_de_documento: cust ? mapDocType(cust.docType) : null,
      numero_de_documento: cust ? cust.docNumber : null,
      numero_de_documento_2: (function () {
        const billToCustId = toInt(so.getValue({ fieldId: 'custbody_ht_facturar_a' }), 0);
        return billToCustId ? lookupCustomerDocNumber(billToCustId) : null;
      })(),

      sexo: 'M',
      fecha_de_nacimiento: '01/01/2000',

      departamen_o_direccion_legal: emptyToNull(bill.departamento),
      provincia_direccion_legal: emptyToNull(bill.provincia),
      distrito_direccion_legal: emptyToNull(bill.distrito),
      direccion_legal: emptyToNull(bill.direccion),

      telefono_titular: emptyToNull(normalizePhone(cust ? cust.phone : null)),
      otro_correo: emptyToNull(cust ? cust.email : null),

      clase: emptyToNull(bien.clase) || ' ',
      uso: 'PARTICULAR',
      marca: emptyToNull(bien.marca),
      modelo: emptyToNull(bien.modelo),
      tipo_vehiculo: emptyToNull(bien.tipo_vehiculo),
      color: emptyToNull(bien.color),
      anio_fabricacion: emptyToNull(bien.anio_fabricacion),
      n_placa: emptyToNull(bien.n_placa),
      n_motor: emptyToNull(bien.n_motor),
      n_serie: emptyToNull(bien.n_serie),
      cbu: null,

      concesionario: emptyToNull(bien.concesionario) || '9980000000006',
      sucursal: '2',
      ejecutiva_referencia: ejecutiva_referencia,

      financiera: emptyToNull(bien.financiera) || '9980000000004',
      broker: emptyToNull(bien.broker) || '9980000000003',
      compania_seguros: emptyToNull(bien.compania_seguros) || '9980000000005',

      monto_gps_dolares: moneyStr(items.total || 0),

      correo_de_correspondencia: emptyToNull(cust ? cust.email : null),
      moneda_s_d: mapCurrency(so.getValue({ fieldId: 'currency' })),

      forma_pago: nullIfZero(toInt(so.getValue({ fieldId: 'custbody_pe_os_forma_pago_sys' }), 0)),
      datcorp_tipo_credito: nullIfZero(toInt(so.getValue({ fieldId: 'terms' }), 0)),
      dias: '0',
      vendedor_codigo: lookupVendedorCodigo(toInt(so.getValue({ fieldId: 'custbody_ht_pe_os_vendedor' }), 0)),

      item_1: emptyToNull(items.items[0]),
      precio_1: moneyStr(items.precios[0] || 0),
      item_2: emptyToNull(items.items[1]),
      precio_2: moneyStr(items.precios[1] || 0),
      item_3: emptyToNull(items.items[2]),
      precio_3: moneyStr(items.precios[2] || 0),
      item_4: emptyToNull(items.items[3]),
      precio_4: moneyStr(items.precios[3] || 0),
      item_5: emptyToNull(items.items[4]),
      precio_5: moneyStr(items.precios[4] || 0),
      item_6: emptyToNull(items.items[5]),
      precio_6: moneyStr(items.precios[5] || 0),
      item_7: emptyToNull(items.items[6]),
      precio_7: moneyStr(items.precios[6] || 0),
      item_8: emptyToNull(items.items[7]),
      precio_8: moneyStr(items.precios[7] || 0),
      item_9: emptyToNull(items.items[8]),
      precio_9: moneyStr(items.precios[8] || 0),
      item_10: emptyToNull(items.items[9]),
      precio_10: moneyStr(items.precios[9] || 0),

      centro_utilidad: emptyToNull(dept.centroUtilidad),
      centro_costo: emptyToNull(dept.centroCosto)
    };

    return data;
  }

  // =========================================================
  // PAYLOAD + SEND
  // =========================================================
  function buildApiPayload(opts) {
    const payload = {
      usuario: Number(opts.usuario),
      objJson: [opts.orderData]
    };
    if (CONFIG.INCLUDE_TOP_LEVEL_ID_INT_OS) payload.id_int_os = opts.recordId;
    return payload;
  }

  function sendToApi(apiUrl, payload) {
    try {
      const resp = https.post({
        url: apiUrl,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      const analysis = analyzeApiResponse(resp.body);

      return {
        success: analysis.success,
        statusCode: resp.code,
        responseBody: resp.body,
        numeroOS: analysis.numeroOS,
        codigoVehiculo: analysis.codigoVehiculo,
        estados: analysis.estados,
        error: analysis.error
      };
    } catch (e) {
      return { success: false, statusCode: null, responseBody: null, estados: [], error: 'Request Error: ' + e.message };
    }
  }

  function analyzeApiResponse(body) {
    const result = { success: false, numeroOS: null, codigoVehiculo: null, estados: [], error: null };
    if (!body) { result.error = 'Respuesta vacía del API'; return result; }

    let parsed;
    try { parsed = JSON.parse(body); }
    catch (e) { result.error = 'Respuesta no es JSON válido'; return result; }

    if (parsed.status !== 'success') { result.error = 'API status: ' + parsed.status; return result; }
    if (!Array.isArray(parsed.registros) || parsed.registros.length === 0) { result.error = 'Sin registros en respuesta'; return result; }

    let okCount = 0, foundErrors = false;

    parsed.registros.forEach(function (r) {
      if (r.NUMERO_OS && !result.numeroOS) result.numeroOS = r.NUMERO_OS;
      if (r.CODIGO_VEHICULO && !result.codigoVehiculo) result.codigoVehiculo = r.CODIGO_VEHICULO;

      const estado = r.ESTADO ? String(r.ESTADO) : '';
      if (estado) {
        result.estados.push(estado);
        const up = estado.toUpperCase();
        if (up === 'OK' || up === 'SUCCESS' || up === 'COMPLETADO') okCount++;
        else foundErrors = true;
      } else {
        foundErrors = true;
      }
    });

    if (!foundErrors && okCount > 0) result.success = true;
    else result.error = 'Errores de validación en registros';

    return result;
  }

  // =========================================================
  // STATUS UPDATES (SIN REENVÍOS)
  // =========================================================
  function markAsSuccess(recordId, apiResult) {
    try {
      const parts = [];
      if (apiResult.numeroOS) parts.push('OS: ' + apiResult.numeroOS);
      if (apiResult.codigoVehiculo) parts.push('Vehiculo: ' + apiResult.codigoVehiculo);
      if (apiResult.estados && apiResult.estados.length) parts.push('Estados: ' + apiResult.estados.join(', '));

      const responseText = (parts.length ? parts.join(' | ') : 'Success');

      record.submitFields({
        type: 'salesorder',
        id: recordId,
        values: {
          [FIELDS.SENT]: true,
          [FIELDS.SENT_DATE]: new Date(),
          [FIELDS.FAILED]: false,
          [FIELDS.LAST_ATTEMPT]: new Date(),
          [FIELDS.ATTEMPTS]: 1,
          [FIELDS.LAST_RESPONSE]: responseText.substring(0, 300),
          [FIELDS.MEMO]: apiResult.numeroOS || ''
        },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });
    } catch (e) {
      log.error('markAsSuccess error', { recordId, error: e.message });
    }
  }

  function markAsFailed(recordId, errorMsg, apiResult) {
    try {
      const currentAttempts = getCurrentAttemptsLight(recordId);
      let errorResponse = 'ERROR: ' + (errorMsg || 'Error desconocido');
      if (apiResult && apiResult.responseBody) errorResponse += ' | RESP: ' + String(apiResult.responseBody).substring(0, 150);

      record.submitFields({
        type: 'salesorder',
        id: recordId,
        values: {
          [FIELDS.SENT]: false,
          [FIELDS.SENT_DATE]: null,
          [FIELDS.FAILED]: true,
          [FIELDS.LAST_ATTEMPT]: new Date(),
          [FIELDS.ATTEMPTS]: currentAttempts + 1,
          [FIELDS.LAST_RESPONSE]: errorResponse.substring(0, 300)
        },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });
    } catch (e) {
      log.error('markAsFailed error', { recordId, error: e.message });
    }
  }

  function getCurrentAttemptsLight(recordId) {
    try {
      const f = search.lookupFields({ type: 'salesorder', id: recordId, columns: [FIELDS.ATTEMPTS] });
      return toInt(f[FIELDS.ATTEMPTS], 0);
    } catch (e) {
      return 0;
    }
  }

  // =========================================================
  // ITEMS TOP 10 (SIN query)
  // =========================================================
  function extractTop10Items(so) {
    const lineCount = so.getLineCount({ sublistId: 'item' }) || 0;
    const candidates = [];

    for (let i = 0; i < lineCount; i++) {
      const itemId = toInt(so.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }), 0);
      if (!itemId) continue;

      const tipoArticulo = String(so.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tipoarticulo', line: i }) || '');
      const plazo = String(so.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', line: i }) || '');

      const isAssemblyComponent = so.getSublistValue({ sublistId: 'item', fieldId: 'assemblycomponent', line: i });
      const doNotPrint = so.getSublistValue({ sublistId: 'item', fieldId: 'donotprintline', line: i });
      if (isAssemblyComponent === true || isAssemblyComponent === 'T') continue;
      if (doNotPrint === true || doNotPrint === 'T') continue;

      const allowed = ['Ensamblaje', 'Artículo de inventario', 'Servicio', 'Artículo no inventariable'];
      if (allowed.indexOf(tipoArticulo) === -1) continue;

      const netamount = Number(so.getSublistValue({ sublistId: 'item', fieldId: 'netamount', line: i }) || 0);
      const netAbs = Math.abs(netamount);
      const priceWithTax = round2(netAbs * (1 + CONFIG.TAX_RATE_FALLBACK));
      const desc = String(so.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }) || '');

      candidates.push({ itemId, tipoArticulo, plazo, upperText: desc.toUpperCase(), priceWithTax });
    }

    if (!candidates.length) return { items: fill10([], null), precios: fill10([], 0), plazos: fill10([], null), total: 0 };

    const meta = lookupItemsMeta(candidates.map(c => c.itemId));

    candidates.forEach(function (c) {
      const m = meta[c.itemId] || {};
      const itemid = String(m.itemid || '');
      const displayname = String(m.displayname || '');
      const txt = (c.upperText + ' ' + displayname.toUpperCase()).trim();

      const tipo = classifyItemType(c.tipoArticulo, txt);
      c.priority = (tipo === 'DISPOSITIVO') ? 1 : (tipo === 'SERVICIO') ? 2 : 3;
      c.itemCode = extractItemCode(itemid);
      c.itemIdText = itemid;
    });

    candidates.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.itemIdText || '').localeCompare(b.itemIdText || '');
    });

    const top = candidates.slice(0, 10);
    const items = [], precios = [], plazos = [];
    let total = 0;

    top.forEach(function (c) {
      items.push(c.itemCode || null);
      precios.push(c.priceWithTax || 0);
      plazos.push(c.plazo || null);
      total += (c.priceWithTax || 0);
    });

    return { items: fill10(items, null), precios: fill10(precios, 0), plazos: fill10(plazos, null), total: round2(total) };
  }

  function fill10(arr, fillVal) {
    const out = arr.slice(0);
    while (out.length < 10) out.push(fillVal);
    return out;
  }

  function lookupItemsMeta(itemIds) {
    const uniq = {};
    itemIds.forEach(id => { if (id) uniq[id] = true; });
    const ids = Object.keys(uniq).map(x => parseInt(x, 10)).filter(Boolean);

    const map = {};
    if (!ids.length) return map;

    const s = search.create({
      type: search.Type.ITEM,
      filters: [['internalid', 'anyof', ids]],
      columns: ['internalid', 'itemid', 'displayname']
    });

    s.run().each(function (r) {
      const id = toInt(r.getValue({ name: 'internalid' }), 0);
      map[id] = { itemid: r.getValue({ name: 'itemid' }), displayname: r.getValue({ name: 'displayname' }) };
      return true;
    });

    return map;
  }

  function classifyItemType(tipoArticulo, upperText) {
    const isInvLike = (tipoArticulo === 'Ensamblaje' || tipoArticulo === 'Artículo de inventario' || tipoArticulo === 'Artículo no inventariable');
    const hasDispositivo = upperText.indexOf('(DISPOSITIVO') !== -1;
    const hasServicio = upperText.indexOf('(SERVICIO') !== -1;

    if (isInvLike && hasDispositivo) return 'DISPOSITIVO';
    if (tipoArticulo === 'Servicio' || hasServicio) return 'SERVICIO';
    if (isInvLike && !hasDispositivo && !hasServicio && tipoArticulo !== 'Servicio') return 'ACCESORIO';
    return 'OTRO';
  }

  // =========================================================
  // LOOKUPS
  // =========================================================
  function lookupEmployeeDocNumber(empId) {
    if (!empId) return null;
    try {
      const f = search.lookupFields({ type: 'employee', id: empId, columns: ['custentity_pe_document_number'] });
      return emptyToNull(f.custentity_pe_document_number);
    } catch (e) { return null; }
  }

  function lookupCustomer(customerId) {
    try {
      const f = search.lookupFields({
        type: 'customer',
        id: customerId,
        columns: ['isperson', 'firstname', 'lastname', 'companyname', 'custentity_pe_document_type', 'custentity_pe_document_number', 'phone', 'email']
      });
      return {
        isperson: f.isperson === true || f.isperson === 'T',
        firstname: emptyToNull(f.firstname),
        lastname: emptyToNull(f.lastname),
        companyname: emptyToNull(f.companyname),
        docType: emptyToNull(f.custentity_pe_document_type),
        docNumber: emptyToNull(f.custentity_pe_document_number),
        phone: emptyToNull(f.phone),
        email: emptyToNull(f.email)
      };
    } catch (e) { return null; }
  }

  function lookupCustomerDocNumber(customerId) {
    if (!customerId) return null;
    try {
      const f = search.lookupFields({ type: 'customer', id: customerId, columns: ['custentity_pe_document_number'] });
      return emptyToNull(f.custentity_pe_document_number);
    } catch (e) { return null; }
  }

  function lookupBien(bienId) {
    const out = {};
    try {
      const b = record.load({ type: 'customrecord_ht_record_bienes', id: bienId, isDynamic: false });

      const tipoId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_tipo' }), 0);
      const modeloId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_modelo' }), 0);
      const marcaId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_marca' }), 0);
      const colorId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_colorcarseg' }), 0);

      out.clase = lookupCustomName('customrecord_ht_record_tipovehiculo', tipoId);
      out.tipo_vehiculo = out.clase;
      out.modelo = lookupCustomName('customrecord_ht_bn_modelo', modeloId);
      out.marca = lookupCustomName('customrecord_ht_bien_marca', marcaId);
      out.color = lookupCustomName('customrecord_ht_bn_colorcarseg', colorId);

      out.anio_fabricacion = emptyToNull(b.getValue({ fieldId: 'custrecord_ht_bien_ano' }));
      out.n_placa = emptyToNull(b.getValue({ fieldId: 'custrecord_ht_bien_placa' }));
      out.n_motor = emptyToNull(b.getValue({ fieldId: 'custrecord_ht_bien_motor' }));
      out.n_serie = emptyToNull(b.getValue({ fieldId: 'custrecord_ht_bien_chasis' }));

      const consId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_consesionarios' }), 0);
      const finaId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_financiadovehiculo' }), 0);
      const aseId = toInt(b.getValue({ fieldId: 'custrecord_ht_bien_companiaseguros' }), 0);
      const broId = toInt(b.getValue({ fieldId: 'custrecord_pe_broker' }), 0);

      out.concesionario = lookupCanalRuc(consId);
      out.financiera = lookupCanalRuc(finaId);
      out.compania_seguros = lookupCanalRuc(aseId);
      out.broker = lookupCanalRuc(broId);
    } catch (e) {}
    return out;
  }

  function lookupCustomName(recordType, id) {
    if (!id) return null;
    try {
      const f = search.lookupFields({ type: recordType, id: id, columns: ['name'] });
      return emptyToNull(f.name);
    } catch (e) { return null; }
  }

  function lookupCanalRuc(canalId) {
    if (!canalId) return null;
    try {
      const f = search.lookupFields({
        type: 'customrecord_ht_record_canaldistribucion',
        id: canalId,
        columns: ['custrecord_ht_cd_ruccanaldistribucion']
      });
      return emptyToNull(f.custrecord_ht_cd_ruccanaldistribucion);
    } catch (e) { return null; }
  }

  function lookupLugarInstalacionCodigo(id) {
    if (!id) return null;
    try {
      const f = search.lookupFields({ type: 'customrecord_ht_os_lugar_instalacion', id: id, columns: ['custrecord_pe_ht_os_codigo'] });
      return emptyToNull(f.custrecord_pe_ht_os_codigo);
    } catch (e) { return null; }
  }

  function lookupLeyendaCodigo(id) {
    if (!id) return null;
    try {
      const f = search.lookupFields({ type: 'customrecord_ht_pe_os_leyenda', id: id, columns: ['custrecord_ht_pe_codigo'] });
      return emptyToNull(f.custrecord_ht_pe_codigo);
    } catch (e) { return null; }
  }

  function lookupVendedorCodigo(id) {
    if (!id) return null;
    try {
      const f = search.lookupFields({ type: 'customrecord_pe_ht_os_vendedor', id: id, columns: ['custrecord_ht_pe_id_vendedor'] });
      return emptyToNull(f.custrecord_ht_pe_id_vendedor);
    } catch (e) { return null; }
  }

  function lookupDeptInfo(so) {
    const deptId = toInt(so.getValue({ fieldId: 'department' }), 0);
    let fullname = '';

    if (deptId) {
      try {
        const f = search.lookupFields({ type: 'department', id: deptId, columns: ['fullname'] });
        fullname = (f.fullname || '').toString();
      } catch (e) {}
    }

    const upper = fullname.toUpperCase();
    let centroUtilidad = 'L100';
    if (upper.indexOf('AREQUIPA') !== -1) centroUtilidad = 'A300';
    else if (upper.indexOf('TRUJILLO') !== -1) centroUtilidad = 'T200';
    else if (upper.indexOf('LIMA') !== -1) centroUtilidad = 'L100';

    return { centroUtilidad, centroCosto: emptyToNull(fullname) };
  }

  function getBillingAddressParts(so) {
    const res = { departamento: null, provincia: null, distrito: null, direccion: null };
    try {
      const bill = so.getSubrecord({ fieldId: 'billingaddress' });
      res.departamento = emptyToNull(safeSubValue(bill, 'custrecord_pe_departamento')) || emptyToNull(safeSubValue(bill, 'state'));
      res.provincia = emptyToNull(safeSubValue(bill, 'dropdownstate')) || emptyToNull(safeSubValue(bill, 'city')) || emptyToNull(safeSubValue(bill, 'state'));
      res.distrito = emptyToNull(safeSubValue(bill, 'custrecord_pe_distrito')) || emptyToNull(safeSubValue(bill, 'city'));
      res.direccion = emptyToNull(safeSubValue(bill, 'addr1')) || emptyToNull(safeSubValue(bill, 'addrtext'));
      return res;
    } catch (e) {}

    res.departamento = emptyToNull(so.getValue({ fieldId: 'billstate' }));
    res.provincia = emptyToNull(so.getValue({ fieldId: 'billcity' }));
    res.distrito = emptyToNull(so.getValue({ fieldId: 'billcity' }));
    res.direccion = emptyToNull(so.getValue({ fieldId: 'billaddr1' }));
    return res;
  }

  // =========================================================
  // RESCHEDULE (SIN PARÁMETROS)
  // =========================================================
  function rescheduleSelf() {
    try {
      const script = runtime.getCurrentScript();
      const t = task.create({
        taskType: task.TaskType.SCHEDULED_SCRIPT,
        scriptId: script.id,
        deploymentId: script.deploymentId
      });
      const taskId = t.submit();
      log.audit('Re-scheduled self (no params)', { taskId });
    } catch (e) {
      log.error('Reschedule failed', { error: e.message, stack: e.stack });
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================
  function safeJsonForLog(obj) {
    try { return JSON.stringify(obj, null, 2); } catch (e) { return '[Unserializable JSON]'; }
  }

  function parseIdList(csv) {
    return (csv || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n > 0);
  }

  function toInt(v, fallback) {
    if (v === null || v === undefined || v === '') return fallback;
    const n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }

  function nullIfZero(n) { return (!n || n === 0) ? null : n; }

  function emptyToNull(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s ? s : null;
  }

  function round2(n) {
    const x = Number(n || 0);
    return Math.round(x * 100) / 100;
  }

  function moneyStr(n) {
    const x = round2(Number(n || 0));
    let s = x.toFixed(2);
    if (s.endsWith('.00')) return s.slice(0, -3);
    if (s.endsWith('0')) return s.slice(0, -1);
    return s;
  }

  function formatYMDorNull(d) {
    if (!d) return null;
    try {
      const dt = (d instanceof Date) ? d : new Date(d);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) { return null; }
  }

  function normalizePhone(phone) {
    const p = (phone || '').toString().trim();
    if (!p) return null;
    if (p.indexOf('+51') === 0) return p.substring(3).trim();
    return p;
  }

  function mapDocType(v) {
    const s = (v || '').toString();
    if (s === '1') return 'OTROS';
    if (s === '2') return 'DNI';
    if (s === '3') return 'CARNET EXTRANJERIA';
    if (s === '4') return 'RUC';
    if (s === '5') return 'PASAPORTE';
    if (s === '6') return 'CEDULA';
    return null;
  }

  function mapCurrency(currencyId) {
    const c = (currencyId || '').toString();
    if (c === '1') return 'D';
    if (c === '5') return 'S';
    return null;
  }

  function extractItemCode(itemid) {
    const s = (itemid || '').toString();
    const idx = s.indexOf('-');
    if (idx >= 0 && idx < s.length - 1) return s.substring(idx + 1);
    return s || null;
  }

  function safeSubValue(subrec, fieldId) {
    try {
      const v = subrec.getValue({ fieldId });
      return v == null ? '' : String(v);
    } catch (e) { return ''; }
  }

  // =========================================================
  // EXPORT
  // =========================================================
  return { execute: execute };
});
