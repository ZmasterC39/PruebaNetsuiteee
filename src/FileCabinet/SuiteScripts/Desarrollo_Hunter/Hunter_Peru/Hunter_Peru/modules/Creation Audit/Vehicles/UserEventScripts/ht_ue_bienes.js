/**
 *  @NApiVersion 2.1
 *  @NScriptType  UserEventScript
 *  @NModuleScope SameAccount
 *
 *  Reglas clave:
 *  1) USUARIO_INGRESO SIEMPRE se toma del EMPLEADO en el campo `owner` del Bien
 *     (su `custentity_pe_document_number`). Si no hay owner o no tiene doc,
 *     se usa el documento del empleado que ejecuta.
 *  2) Un SOLO deployment del Scheduled Script. Se evita “INQUEUE” y los
 *     reintentos en bucle guardando el Task ID, consultando su estado
 *     y NO re-enfilando si ya hay una ejecución PENDING/PROCESSING.
 *
 *  3) (MEJORA) Solo en evento EDIT:
 *     - Si cambian PLACA / MOTOR / CHASIS del Bien, se propagan a las OTs
 *       relacionadas (customrecord_ht_record_ordentrabajo) vía lookup por
 *       `custrecord_ht_ot_vehiculo` = id del Bien.
 *     - (NUEVO) También se propagan: MARCA, TIPO, MODELO, COLOR, VERSIÓN y AÑO DEL BIEN.
 *
 *  4) (NUEVO) Campo "Forzar envío API" (custrecord_ht_pe_send_api_force):
 *     - Si está en TRUE, el UE envía directamente al API (sin Scheduled)
 *       usando el payload construido aquí y actualiza campos de resultado.
 *     - Si está en FALSE, se mantiene el flujo normal que lanza el Scheduled
 *       según la lógica de reintentos existente.
 *
 *  5) (NUEVO) También procesar CREATE cuando viene de CSVIMPORT:
 *     - Si ctx.type = CREATE y execCtx = CSVIMPORT, se construye payload
 *       y se encola el Scheduled siguiendo el flujo normal.
 */
define(['N/record','N/log','N/runtime','N/task','N/search','N/https'],
  (record, log, runtime, task, search, https) => {

  /* ================================================================
   *  Utilidades
   * ================================================================ */
  const safeTrim = (v) => (typeof v === 'string') ? v.trim() : v;
  const safeStr  = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  const safeId   = (v) => (v === '' || v === null || v === undefined) ? '' : String(v); // para campos lista/relación
  const eq       = (a,b) => (safeTrim(a) || '') === (safeTrim(b) || '');

  /* ================================================================
   *  Config SS (un solo deployment)
   * ================================================================ */
  const SS_SCRIPT_ID     = 'customscript_ht_pe_sc_bienesapi';
  const SS_DEPLOYMENT_ID = 'customdeploy_ht_pe_sc_bienesapi';

  /* ================================================================
   *  Campos de auditoría / flags / tracking tarea
   * ================================================================ */
  const NOTE_FIELD       = 'custrecord_ht_bien_codsysh';            // donde suele quedar el codSys (10 dígitos) o mensaje
  const FIELD_FAILED     = 'custrecord_veh_api_failed';             // checkbox (T/F)
  const FIELD_LAST_RESP  = 'custrecord_veh_api_last_response';      // texto libre
  const FIELD_TASK_ID    = 'custrecord_veh_api_taskid';             // guardar Task ID del último envío
  const FIELD_SENT       = 'custrecord_veh_api_sent';               // enviado (T/F)
  const FIELD_FORCE_SEND = 'custrecord_ht_pe_send_api_force';       // nuevo checkbox "Forzar envío API"

  /* ================================================================
   *  IDs / Campos Bien ↔ OT
   * ================================================================ */
  const BIEN_RT = 'customrecord_ht_record_bienes';
  const OT_RT   = 'customrecord_ht_record_ordentrabajo';

  // Bien (fuente)
  const F_BIEN_PLACA    = 'custrecord_ht_bien_placa';
  const F_BIEN_MOTOR    = 'custrecord_ht_bien_motor';
  const F_BIEN_CHASIS   = 'custrecord_ht_bien_chasis';
  const F_BIEN_MARCA    = 'custrecord_ht_bien_marca';
  const F_BIEN_TIPO     = 'custrecord_ht_bien_tipo';
  const F_BIEN_MODELO   = 'custrecord_ht_bien_modelo';
  const F_BIEN_COLOR    = 'custrecord_ht_bien_colorcarseg';
  const F_BIEN_VERSION  = 'custrecord_bien_version';       // según tu bien, guarda "755"
  const F_BIEN_ANIO     = 'custrecord_ht_bien_ano';

  // OT (destino)
  const F_OT_PLACA      = 'custrecord_ht_ot_placa';
  const F_OT_MOTOR      = 'custrecord_ht_ot_motor';
  const F_OT_CHASIS     = 'custrecord_ht_ot_chasis';
  const F_OT_VEHIC      = 'custrecord_ht_ot_vehiculo';
  const F_OT_MARCA      = 'custrecord_ht_ot_marca';
  const F_OT_TIPO       = 'custrecord_ht_ot_tipo';
  const F_OT_MODELO     = 'custrecord_ht_ot_modelobien';
  const F_OT_COLOR      = 'custrecord_ht_ot_color';
  const F_OT_VERSION    = 'custrecord_ht_ot_version';
  const F_OT_ANIO_BIEN  = 'custrecordht_ot_ao_bien';       // “AÑO DEL BIEN” en OT

  /* ================================================================
   *  Campos auxiliares que necesitan “código” en vez de ID interno
   * ================================================================ */
  const CODED_LOOKUPS = {
    custrecord_ht_bien_colorfabricante: {
      recType  : 'customrecord_ht_bn_colorfabricante',
      codeField: 'custrecord_ht_bn_colorfabricante_codigo'
    },
    custrecord_ht_bien_colormatricula: {
      recType  : 'customrecord_ht_bn_colormatricula',
      codeField: 'custrecord_ht_bn_colormatricula_codigo'
    },
    custrecord_ht_bien_tipoflota: {
      recType  : 'customrecord_ht_record_tipoflota',
      codeField: 'custrecord31' // “001”, “002”, etc.
    }
  };

  /* ================================================================
   *  Config API (para envío directo)
   * ================================================================ */
  const API_URL      = 'https://syshunterperu.com/migravehiculo/migravehiculo/SIT/I_Vehiculos_Netsuite';
  const HEADERS_JSON = { 'Content-Type': 'application/json' };
  const HTTP_SUCCESS = [200, 201, 202];

  /* ================================================================
   *  AFTER-SUBMIT
   * ================================================================ */
  const afterSubmit = (ctx) => {
    const execCtx = runtime.executionContext; // ej: 'CSVIMPORT', 'USERINTERFACE', 'USEREVENT', etc.
    log.debug({ title:'Debug UE', details:`type=${ctx.type} · execCtx=${execCtx}` });

    // ------------------------------------------------------------
    // (CAMBIO) Procesar:
    //  - EDIT (como siempre)
    //  - CREATE SOLO cuando viene de CSVIMPORT
    // ------------------------------------------------------------
    const isEdit = (ctx.type === ctx.UserEventType.EDIT);

    // En 2.1 puede existir runtime.ContextType.CSV_IMPORT; dejamos robusto.
    const isCsvImport = (execCtx === 'CSVIMPORT') || (runtime.ContextType && execCtx === runtime.ContextType.CSV_IMPORT);

    const isCreateCsv = (ctx.type === ctx.UserEventType.CREATE) && isCsvImport;

    // NO procesar otros eventos (CREATE UI, XEDIT, DELETE, etc.)
    if (!(isEdit || isCreateCsv)) return;

    /* 1) Cargar Bien */
    const bien = record.load({
      type     : BIEN_RT,
      id       : ctx.newRecord.id,
      isDynamic: false
    });

    /* 2) Snapshot base */
    const snapshot = { recordType: bien.type, id: bien.id, source: execCtx, body:{}, sublists:{} };

    /* 3) Doc/ID del ejecutor */
    try {
      const userId = runtime.getCurrentUser().id;
      const empFields = search.lookupFields({
        type: record.Type.EMPLOYEE, id: userId, columns: ['custentity_pe_document_number']
      });
      snapshot.body.creator_document_number = empFields.custentity_pe_document_number || null;
      snapshot.body.creator_employee_id     = userId;
    } catch (e) { log.error({ title:'Lookup doc creator', details:e }); }

    /* 4) Cabecera */
    const numericFields = [
      'custrecord_pe_ht_financiador',
      'custrecord_ht_bien_companiaseguros',
      'custrecord_ht_bien_consesionarios',
      'custrecord_ht_bien_financiadovehiculo',
      'custrecord_pe_broker'
    ];

    bien.getFields().forEach((fieldId) => {
      const rawValue = bien.getValue({ fieldId });
      if (rawValue === '' || rawValue === null || rawValue === undefined) return;

      if (CODED_LOOKUPS[fieldId]) {
        const { recType, codeField } = CODED_LOOKUPS[fieldId];
        try {
          const data = search.lookupFields({ type: recType, id: rawValue, columns: [codeField] });
          snapshot.body[fieldId] = data[codeField] || rawValue;
        } catch (e) {
          snapshot.body[fieldId] = rawValue;
          log.error({ title:`Lookup código ${fieldId}`, details:e });
        }
        return;
      }

      if (fieldId === 'custrecord_ht_bien_avaluo') {
        const aval = parseInt(String(rawValue).replace(/[, ]/g,''), 10);
        snapshot.body[fieldId] = isNaN(aval) ? rawValue : aval.toString();
        return;
      }

      if (fieldId === 'custrecord_ht_bien_propietario') {
        let docNumber = null;
        try {
          const l1 = record.lookupFields({
            type: record.Type.CUSTOMER, id: rawValue, columns: ['custentity_pe_document_number','parent']
          });
          docNumber = l1.custentity_pe_document_number || null;
          if (!docNumber && l1.parent?.length) {
            const parentId = l1.parent[0].value;
            const l2 = record.lookupFields({
              type: record.Type.CUSTOMER, id: parentId, columns: ['custentity_pe_document_number']
            });
            docNumber = l2.custentity_pe_document_number || null;
          }
        } catch(e) { /* silent */ }
        if (!docNumber) {
          const txt = bien.getText({ fieldId }) || '';
          const m = txt.match(/\b\d{8,11}\b/);
          if (m) docNumber = m[0];
        }
        snapshot.body[fieldId] = docNumber || rawValue;
        snapshot.body[`${fieldId}_id`] = rawValue;
        return;
      }

      if (numericFields.includes(fieldId)) {
        let txt=''; try { txt = bien.getText({ fieldId }) || ''; } catch(e) {}
        const m = txt.match(/\b\d+\b/);
        snapshot.body[fieldId] = m ? m[0] : rawValue;
        return;
      }

      let displayValue = null;
      try { displayValue = bien.getText({ fieldId }); } catch(e) {}
      snapshot.body[fieldId] = displayValue || rawValue;

      try {
        const subrec = bien.getSubrecord({ fieldId });
        if (subrec) {
          const subSnap = {};
          subrec.getFields().forEach((sf) => {
            const sv = subrec.getValue({ fieldId: sf });
            if (sv === '' || sv === null || sv === undefined) return;
            let svText = null; try { svText = subrec.getText({ fieldId: sf }); } catch(e) {}
            subSnap[sf] = svText || sv;
          });
          snapshot.body[`${fieldId}_subrecord`] = subSnap;
        }
      } catch(e) {}
    });

    /* 5) Sublistas (igual que antes) */
    ['recmachcustrecord_detalle_bien', 'recmachcustrecord_historial_bien'].forEach((sublistId) => {
      const count = bien.getLineCount({ sublistId });
      if (!count) return;
      snapshot.sublists[sublistId] = [];
      const lineFields = bien.getSublistFields({ sublistId });
      for (let i=0;i<count;i++){
        const lineObj = {};
        lineFields.forEach((f)=>{
          const v = bien.getSublistValue({ sublistId, fieldId:f, line:i });
          if (v !== '' && v !== null && v !== undefined) lineObj[f]=v;
        });
        lineFields.forEach((f)=>{
          try{
            const subRec = bien.getSubrecord({ sublistId, fieldId:f, line:i });
            if (subRec) {
              const subSnap={};
              subRec.getFields().forEach((sf)=>{
                const sv = subRec.getValue({ fieldId:sf });
                if (sv === '' || sv === null || sv === undefined) return;
                let svText=null; try{ svText=subRec.getText({ fieldId:sf }); }catch(e){}
                subSnap[sf] = svText || sv;
              });
              lineObj[`${f}_subrecord`] = subSnap;
            }
          }catch(e){}
        });
        snapshot.sublists[sublistId].push(lineObj);
      }
    });

    /* 6) Log snapshot */
    try { log.audit({ title:`Bien ${snapshot.id} – snapshot`, details: JSON.stringify(snapshot).substring(0,3500) }); } catch(e){}

    /* 7) Helpers */
    const up = (v)=> (v||'').toString().toUpperCase();

    const getEmpDoc = (empId) => {
      try {
        if (!empId) return '';
        const info = search.lookupFields({
          type: record.Type.EMPLOYEE, id: empId, columns:['custentity_pe_document_number']
        });
        return (info && info.custentity_pe_document_number) ? String(info.custentity_pe_document_number) : '';
      } catch(e) {
        log.error({ title:'getEmpDoc()', details:{ empId, e } });
        return '';
      }
    };

    const getBienOwnerId = () => {
      let ownerId = null;
      try { ownerId = bien.getValue({ fieldId:'owner'   }); } catch(e){}
      if (!ownerId) { try { ownerId = bien.getValue({ fieldId:'ownerid' }); } catch(e){} }
      if (!ownerId && ctx && ctx.newRecord) {
        try { ownerId = ctx.newRecord.getValue({ fieldId:'owner'   }); } catch(e){}
        if (!ownerId) { try { ownerId = ctx.newRecord.getValue({ fieldId:'ownerid' }); } catch(e){} }
      }
      return ownerId;
    };

    /* Helper: obtener el código de sucursal desde el record de sucursal */
    const getSucursalCodeFromBien = (bienRec) => {
      try {
        const sucId = (safeStr(bienRec.getValue({ fieldId: 'custrecord_ht_pe_sucursal' })) ||
                       safeStr(bienRec.getValue({ fieldId: 'custrecordht_pe_sucursal' })) || '').toString();
        if (!sucId) return '';
        const info = search.lookupFields({
          type: 'customrecord_ht_pe_sucursal',
          id: sucId,
          columns: ['custrecord_ht_pe_cod_sucursal']
        });
        return (info && info.custrecord_ht_pe_cod_sucursal) ? String(info.custrecord_ht_pe_cod_sucursal) : '';
      } catch (e) {
        log.error({ title:'getSucursalCodeFromBien (UE)', details:e });
        return '';
      }
    };

    /* 8) USUARIO_INGRESO = doc del EMPLEADO en `owner` (fallback: ejecutor) */
    const ownerIdForIngreso = getBienOwnerId();
    let usuarioIngreso = getEmpDoc(ownerIdForIngreso);
    if (!usuarioIngreso) usuarioIngreso = (snapshot.body.creator_document_number || '').toString();

    const sucursalCode = getSucursalCodeFromBien(bien);

    const payload = {
      BIEN              : snapshot.id.toString(),
      CLIENTE           : (snapshot.body.custrecord_ht_bien_propietario      || '').toString(),
      MARCA             : up(snapshot.body.custrecord_ht_bien_marca),
      MODELO            : up(snapshot.body.custrecord_ht_bien_modelo),
      TIPO_VEHICULO     : up(snapshot.body.custrecord_ht_bien_tipo),
      COLOR             : up(snapshot.body.custrecord_ht_bien_colorcarseg),
      MOTOR             : up(snapshot.body.custrecord_ht_bien_motor),
      CHASIS            : up(snapshot.body.custrecord_ht_bien_chasis),
      PLACA             : up(snapshot.body.custrecord_ht_bien_placa),
      ANIO              : (snapshot.body.custrecord_ht_bien_ano || '').toString().replace(/[, ]/g,''),
      CONCESIONARIO     : (snapshot.body.custrecord_ht_bien_consesionarios     || '').toString(),
      BROKER            : (snapshot.body.custrecord_pe_broker     || '').toString(),
      FINANCIERA        : (snapshot.body.custrecord_ht_bien_financiadovehiculo || '').toString(),
      ASEGURADORA       : (snapshot.body.custrecord_ht_bien_companiaseguros    || '').toString(),
      CODIGO_FINANCIADOR: (snapshot.body.custrecord_pe_ht_financiador          || '').toString(),
      USUARIO_INGRESO   : usuarioIngreso,
      COLOR_FABRICANTE  : (snapshot.body.custrecord_ht_bien_colorfabricante    || '').toString(),
      COLOR_MATRICULA   : (snapshot.body.custrecord_ht_bien_colormatricula     || '').toString(),
      AVALUO            : (snapshot.body.custrecord_ht_bien_avaluo             || '').toString(),
      CLAVE             : (snapshot.body.custrecord_ht_bien_clave              || '').toString(),
      SUCURSAL_CONCESIONARIO: (sucursalCode || '').toString(), //  cod sucursal
      TIPO_FLOTA        : (snapshot.body.custrecord_ht_bien_tipoflota          || '').toString(),
      OBSERVACION       : up(snapshot.body.custrecord_ht_bien_observacion),
    };

    try { log.audit({ title:`Payload UE (Bien ${bien.id})`, details: JSON.stringify(payload, null, 2).substring(0,3500) }); } catch(e){}

    /* ============================================================
     *  8.1) Propagar datos del Bien → OTs relacionadas (SOLO EDIT)
     * ============================================================ */
    if (isEdit) {
      try {
        // Nuevos valores (post-EDIT)
        const n = {
          placa  : safeStr(bien.getValue({ fieldId: F_BIEN_PLACA })),
          motor  : safeStr(bien.getValue({ fieldId: F_BIEN_MOTOR })),
          chasis : safeStr(bien.getValue({ fieldId: F_BIEN_CHASIS })),
          marca  : safeId (bien.getValue({ fieldId: F_BIEN_MARCA })),   // IDs a listas
          tipo   : safeId (bien.getValue({ fieldId: F_BIEN_TIPO })),
          modelo : safeId (bien.getValue({ fieldId: F_BIEN_MODELO })),
          color  : safeId (bien.getValue({ fieldId: F_BIEN_COLOR })),
          version: safeStr(bien.getValue({ fieldId: F_BIEN_VERSION })), // texto/num
          anio   : safeStr(bien.getValue({ fieldId: F_BIEN_ANIO })),    // texto/num
        };

        // Valores previos (oldRecord) si están disponibles
        let changed = true;
        if (ctx.oldRecord) {
          const o = {
            placa  : safeStr(ctx.oldRecord.getValue({ fieldId: F_BIEN_PLACA })),
            motor  : safeStr(ctx.oldRecord.getValue({ fieldId: F_BIEN_MOTOR })),
            chasis : safeStr(ctx.oldRecord.getValue({ fieldId: F_BIEN_CHASIS })),
            marca  : safeId (ctx.oldRecord.getValue({ fieldId: F_BIEN_MARCA })),
            tipo   : safeId (ctx.oldRecord.getValue({ fieldId: F_BIEN_TIPO })),
            modelo : safeId (ctx.oldRecord.getValue({ fieldId: F_BIEN_MODELO })),
            color  : safeId (ctx.oldRecord.getValue({ fieldId: F_BIEN_COLOR })),
            version: safeStr(ctx.oldRecord.getValue({ fieldId: F_BIEN_VERSION })),
            anio   : safeStr(ctx.oldRecord.getValue({ fieldId: F_BIEN_ANIO })),
          };
          changed =
            !eq(n.placa,o.placa)   || !eq(n.motor,o.motor)   || !eq(n.chasis,o.chasis) ||
            !eq(n.marca,o.marca)   || !eq(n.tipo,o.tipo)     || !eq(n.modelo,o.modelo) ||
            !eq(n.color,o.color)   || !eq(n.version,o.version) || !eq(n.anio,o.anio);
        }

        if (changed) {
          const total = actualizarOTsDesdeBien(bien.id, n);
          log.audit('Bien→OT (propagación)', `Se actualizaron ${total} OT(s) para el Bien ${bien.id}`);
        } else {
          log.debug('Bien→OT (propagación)', 'No hay cambios en los campos a propagar; se omite actualización de OTs');
        }
      } catch (e) {
        log.error('Bien→OT (propagación) error', `${e.name || ''} ${e.message || e}`);
      }
    }

    /* ============================================================
     *  8.2) Si está marcado "Forzar envío API", no lanzar Scheduled,
     *       sino enviar directamente desde este UE.
     * ============================================================ */
    const forceSendRaw = bien.getValue({ fieldId: FIELD_FORCE_SEND });
    const forceSend    = (forceSendRaw === true || forceSendRaw === 'T');

    if (forceSend) {
      log.audit({
        title  : 'FORZAR ENVÍO API (UE)',
        details: `Bien ${bien.id} con ${FIELD_FORCE_SEND}=T. Se enviará directo al API y NO se encolará Scheduled.`
      });

      // Envío directo usando el payload construido arriba
      enviarBienDirectoApi(bien.id, payload);

      // IMPORTANTE: salir aquí para no ejecutar la lógica de cola/tarea
      return;
    }

    /* ============================================================
     *  9) Lanzamiento SS con control de cola por Task ID
     *     - EDIT: regla de reintentos (como antes)
     *     - CREATE + CSVIMPORT: ENCOLAR y seguir flujo normal
     * ============================================================ */

    // Helper: guarda info en el Bien (no bloquear si falla)
    const setInfo = (valuesObj) => {
      try {
        record.submitFields({
          type   : BIEN_RT,
          id     : bien.id,
          values : valuesObj,
          options: { enableSourcing:false, ignoreMandatoryFields:true }
        });
      } catch (e) {
        log.error({ title:'submitFields info', details:e });
      }
    };

    // Consulta el estado si ya hay un Task ID guardado
    const priorTaskId = (bien.getValue({ fieldId: FIELD_TASK_ID }) || '').toString().trim();
    if (priorTaskId) {
      try {
        const st = task.checkStatus({ taskId: priorTaskId });
        const statusName = (st && st.status) ? String(st.status) : 'UNKNOWN';
        log.debug({ title:'checkStatus previo', details:{ taskId: priorTaskId, status: statusName } });

        // Si la ejecución previa está pendiente o procesando, NO relanzar
        if (statusName === task.TaskStatus.PENDING || statusName === task.TaskStatus.PROCESSING) {
          setInfo({ [FIELD_LAST_RESP]: `INQUEUE: tarea activa (${priorTaskId}) – se omite reenvío` });
          log.audit({
            title  : 'Cola ocupada – se omite reenvío',
            details: { bienId: bien.id, taskId: priorTaskId, status: statusName }
          });
          return;
        }
      } catch (e) {
        log.error({ title:'checkStatus error', details:e });
        // si falla el check, seguimos el flujo normal (intentaremos encolar)
      }
    }

    // ------------------------------------------------------------
    // (CAMBIO) CREATE + CSVIMPORT => encolar SIEMPRE (flujo normal)
    // ------------------------------------------------------------
    if (isCreateCsv) {
      log.audit({
        title  : `CREATE(CSVIMPORT) – envío programado (Bien ${bien.id})`,
        details: `Se encolará Scheduled Script (Deployment único) para envío al API.`
      });
      lanzarScheduled(bien.id, payload, setInfo);
      return;
    }

    // ------------------------------------------------------------
    // EDIT: regla de reenvío (igual que antes)
    // ------------------------------------------------------------
    const failedRaw     = bien.getValue({ fieldId: FIELD_FAILED });
    const failedBoolean = (failedRaw === true) || (failedRaw === false) || (failedRaw === 'T') || (failedRaw === 'F');

    const noteValue  = (bien.getValue({ fieldId: NOTE_FIELD }) || '').toString();
    const lastResp   = (bien.getValue({ fieldId: FIELD_LAST_RESP }) || '').toString();
    const hasFALSO   = /falso/i.test(noteValue) || /falso/i.test(lastResp);
    const isTenDigit = /^\d{10}$/.test(noteValue);

    if ((failedBoolean || hasFALSO) && !isTenDigit) {
      log.audit({
        title  : `EDIT – reenvío programado (Bien ${bien.id})`,
        details: `failedHasBoolean=${failedBoolean} · hasFALSO=${hasFALSO} · nota="${noteValue}" · lastResp="${lastResp}"`
      });
      lanzarScheduled(bien.id, payload, setInfo);
    } else {
      log.audit({
        title  : `EDIT – sin reenvío (Bien ${bien.id})`,
        details: `failedHasBoolean=${failedBoolean} · hasFALSO=${hasFALSO} · nota="${noteValue}"`
      });
    }
  };

  /* ================================================================
   *  Envío directo al API (cuando se fuerza desde el Bien)
   * ================================================================ */
  const enviarBienDirectoApi = (bienId, payloadObj) => {
    let payloadForLog = null;
    try {
      payloadForLog = payloadObj || {};
      log.audit({
        title  : `FORZAR ENVÍO API (Bien ${bienId}) – payload`,
        details: JSON.stringify(payloadForLog, null, 2).substring(0, 3500)
      });

      const resp = https.request({
        method         : https.Method.POST,
        url            : API_URL,
        headers        : HEADERS_JSON,
        body           : JSON.stringify(payloadForLog),
        followRedirects: false
      });

      log.audit({
        title  : `Respuesta API (envío directo Bien ${bienId})`,
        details: { code: resp.code, body: resp.body }
      });

      let codSysApi = null;
      try {
        const parsed = JSON.parse(resp.body || '{}');
        if (parsed.respuesta) codSysApi = parsed.respuesta.toString();
      } catch (e) {
        log.error({ title:'Error parseando respuesta API (directo)', details:e });
      }

      const isNumericResponse = /^\d{10}$/.test(codSysApi);
      const success           = HTTP_SUCCESS.indexOf(resp.code) !== -1 && isNumericResponse;

      const codText = codSysApi || '—';
      const lastMsg = success
        ? `HTTP ${resp.code} – codsys=${codText}`
        : `HTTP ${resp.code} – respuesta no válida: ${resp.body}`.substring(0, 300);

      const values = success
        ? {
            [FIELD_SENT]      : 'T',
            [FIELD_FAILED]    : 'F',
            [FIELD_LAST_RESP] : lastMsg,
            [NOTE_FIELD]      : codSysApi     // guarda el codSys (10 dígitos)
          }
        : {
            [FIELD_SENT]      : 'F',
            [FIELD_FAILED]    : 'T',
            [FIELD_LAST_RESP] : lastMsg
          };

      record.submitFields({
        type   : BIEN_RT,
        id     : bienId,
        values,
        options: { enableSourcing:false, ignoreMandatoryFields:true }
      });

      if (success) {
        log.debug({ title:`✅ Envío directo Bien ${bienId}`, details:lastMsg });
      } else {
        log.error({ title:`❌ Envío directo Bien ${bienId}`, details:lastMsg });
      }

    } catch (e) {
      const msg = (e && (e.message || e.toString())) || '';
      log.error({
        title  : `❌ Error general envío directo Bien ${bienId}`,
        details: { error: e, payload: payloadForLog }
      });
      try {
        record.submitFields({
          type   : BIEN_RT,
          id     : bienId,
          values : {
            [FIELD_SENT]      : 'F',
            [FIELD_FAILED]    : 'T',
            [FIELD_LAST_RESP] : msg.substring(0, 300)
          },
          options: { enableSourcing:false, ignoreMandatoryFields:true }
        });
      } catch (e2) {
        log.error({ title:'No se pudo marcar fallo en envío directo', details:e2 });
      }
    }
  };

  /* ================================================================
   *  Lanzar Scheduled (1 deployment) — guarda Task ID, evita bucles
   * ================================================================ */
  const lanzarScheduled = (bienId, payloadObj, writeInfoCb) => {
    const params = {
      custscript_bien_id     : bienId,
      custscript_bien_payload: JSON.stringify(payloadObj)
    };

    try {
      const schTask = task.create({
        taskType    : task.TaskType.SCHEDULED_SCRIPT,
        scriptId    : SS_SCRIPT_ID,
        deploymentId: SS_DEPLOYMENT_ID,
        params
      });
      const taskId = schTask.submit();

      // Guardar Task ID + mensaje (esto disparará de nuevo el UE, pero se detendrá por checkStatus)
      if (writeInfoCb) {
        writeInfoCb({
          [FIELD_TASK_ID]  : taskId,
          [FIELD_LAST_RESP]: `TASK ENCOLADA (${taskId})`
        });
      }

      log.audit({
        title  : 'Scheduled-Script lanzado',
        details: `Deployment=${SS_DEPLOYMENT_ID} · Task ${taskId}`
      });

    } catch (e) {
      const nameOrCode = (e && (e.name || e.code || '')) || '';
      const msg        = (e && e.message) || '';

      // Si el sistema devolvió INQUEUE, dejamos constancia y evitamos tratarlo como error “duro”
      const isInQueue = /INQUEUE/i.test(nameOrCode) || /INQUEUE/i.test(msg) ||
                        /FAILED_TO_SUBMIT_JOB_REQUEST_1/.test(nameOrCode);

      if (isInQueue) {
        log.audit({
          title  : 'INQUEUE: no se pudo encolar (deployment ocupado)',
          details: { deployment: SS_DEPLOYMENT_ID, nameOrCode, message: msg, bienId }
        });
        if (writeInfoCb) {
          writeInfoCb({
            [FIELD_LAST_RESP]: 'INQUEUE: no se pudo encolar (deployment ocupado). Reintentar luego.'
          });
        }
      } else {
        log.error({ title:'No pudo lanzar Scheduled-Script', details:{ nameOrCode, message: msg } });
        if (writeInfoCb) {
          writeInfoCb({
            [FIELD_LAST_RESP]: `ERROR al encolar: ${nameOrCode || ''} ${msg || ''}`.trim()
          });
        }
      }
    }
  };

  /**
   * Actualiza todas las OTs relacionadas con el Bien.
   * - Relación: custrecord_ht_ot_vehiculo = bienId
   * - Solo OTs activas (isinactive = F)
   * - submitFields por OT para eficiencia de gobernanza.
   *
   * @param {number|string} bienId
   * @param {{placa:string, motor:string, chasis:string, marca:string, tipo:string, modelo:string, color:string, version:string, anio:string}} vals
   * @returns {number} cantidad de OTs actualizadas
   */
  const actualizarOTsDesdeBien = (bienId, vals) => {
    const otIds = [];
    const s = search.create({
      type: OT_RT,
      filters: [
        [F_OT_VEHIC, 'anyof', bienId],
        'AND', ['isinactive', 'is', 'F']
        // Si deseas excluir cerradas/canceladas, agrega aquí filtros por estado.
      ],
      columns: ['internalid']
    });
    s.run().each(r => { otIds.push(r.getValue('internalid')); return true; });

    let updated = 0;
    otIds.forEach((otId) => {
      try {
        record.submitFields({
          type: OT_RT,
          id: otId,
          values: {
            // Texto/libre
            [F_OT_PLACA]    : vals.placa  || '',
            [F_OT_MOTOR]    : vals.motor  || '',
            [F_OT_CHASIS]   : vals.chasis || '',
            [F_OT_VERSION]  : vals.version || '',
            [F_OT_ANIO_BIEN]: vals.anio || '',
            // Listas/IDs
            [F_OT_MARCA]    : vals.marca  ? Number(vals.marca)  : null,
            [F_OT_TIPO]     : vals.tipo   ? Number(vals.tipo)   : null,
            [F_OT_MODELO]   : vals.modelo ? Number(vals.modelo) : null,
            [F_OT_COLOR]    : vals.color  ? Number(vals.color)  : null
          },
          options: { enableSourcing:false, ignoreMandatoryFields:true }
        });
        updated++;
      } catch (e) {
        log.error('Actualizar OT fallo', `OT ${otId}: ${e.name || ''} ${e.message || e}`);
      }
    });
    return updated;
  };

  return { afterSubmit };
});
