/**
 * RESTlet de Bienes – v3.3 (2025-09-30)
 * ------------------------------------
 * POST:
 *   { "id": 123 }                                   → 1 bien
 *   { "custrecord_ht_bien_propietario": 666951 }    → lista (por filtro)
 *   { …campos de alta… }                            → crea bien (SIN enviar a API externa)
 *
 *  @NApiVersion 2.1
 *  @NScriptType Restlet
 *  @NModuleScope SameAccount
 *
 *  NOTA:
 *   - Si llega body.owner_email, se resuelve a internalId (Employee) y se graba en `owner`
 *     vía submitFields post-save para generar System Note del cambio de Propietario.
 *   - Se eliminó TODO lo referente al envío a la API externa (no se hace request ni se
 *     actualizan flags de envío).
 */
define([
  'N/record',
  'N/search',
  'N/error',
  'N/log'
], function (record, search, error, log) {

  /* ------------------------------------------------------------- *
   *  CONSTANTES – NetSuite / Generales                             *
   * ------------------------------------------------------------- */
  const T_BIEN = 'customrecord_ht_record_bienes';

  /* Filtros permitidos para búsqueda */
  const FILTER_KEYS = [
    'custrecord_ht_bien_propietario',
    'custrecord_ht_bien_placa',
    'custrecord_ht_bien_motor',
    'custrecord_ht_bien_chasis'
  ];

  /* Etiquetas legibles para mensajes de error */
  const FIELD_LABELS = {
    // Identificación & vínculo
    'custrecord_ht_bien_propietario'        : 'Propietario',

    // Campos críticos
    'custrecord_ht_bien_placa'              : 'Placa',
    'custrecord_ht_bien_motor'              : 'Motor',
    'custrecord_ht_bien_chasis'             : 'Chasis',

    // Jerarquías & atributos
    'custrecord_ht_bien_oficina'            : 'Oficina',
    'custrecord_ht_bien_tipobien'           : 'Tipo de Bien',
    'custrecord_ht_bien_tipoterrestre'      : 'Tipo Terrestre',
    'custrecord_ht_bien_marca'              : 'Marca',
    'custrecord_ht_bien_modelo'             : 'Modelo',
    'custrecord_ht_bien_tipo'               : 'Tipo',
    'custrecord_ht_bien_colorcarseg'        : 'Color (CarSeg)',

    // Nuevos obligatorios/críticos
    'custrecord_ht_bien_consesionarios'     : 'Concesionario',
    'custrecord_ht_pe_sucursal'             : 'Sucursal',
    'custrecord_ht_bien_companiaseguros'    : 'Compañía de Seguros',
    'custrecord_pe_broker'                  : 'Broker',
    'custrecord_ht_bien_financiadovehiculo' : 'Financiadora',
    'custrecord_pe_ht_financiador'          : 'Financiador '
  };

  /* Tips/Hints por campo (aparecen si falta) */
  const FIELD_HINTS = {
    'custrecord_ht_bien_consesionarios': 'Selecciona el concesionario que entregó o gestiona el vehículo.',
    'custrecord_ht_bien_companiaseguros': 'Elige la compañía de seguros asociada al bien.',
    'custrecord_pe_broker': 'Si no envías broker, se autocompleta 19909.',
    'custrecord_ht_bien_financiadovehiculo': 'Marca si es financiado; si “Sí”, debes especificar el financiador.',
    'custrecord_pe_ht_financiador': 'Indica la entidad financiera que otorga el crédito.'
  };

  /* Campos OBLIGATORIOS (según requerimiento) */
  const OBLIG_KEYS = [
    // Identificación & vínculo
    'custrecord_ht_bien_propietario',

    // Campos críticos
    'custrecord_ht_bien_placa',
    'custrecord_ht_bien_motor',
    'custrecord_ht_bien_chasis',

    // Jerarquías & atributos
    'custrecord_ht_bien_oficina',
    'custrecord_ht_bien_tipobien',
    'custrecord_ht_bien_tipoterrestre',
    'custrecord_ht_bien_marca',
    'custrecord_ht_bien_modelo',
    'custrecord_ht_bien_tipo',
    'custrecord_ht_bien_colorcarseg',

    // Nuevos obligatorios/críticos
    'custrecord_ht_bien_consesionarios',
    'custrecord_ht_bien_companiaseguros',
    'custrecord_pe_broker',
    'custrecord_ht_bien_financiadovehiculo',
    'custrecord_pe_ht_financiador'
  ];

  // Responder errores como 200 para mostrar "message" en Postman/UI
  const ERRORS_AS_200 = true;

  /* ------------------------------------------------------------- *
   *  HELPERS                                                      *
   * ------------------------------------------------------------- */

  /* ——— Serialización segura y truncada para logs ——— */
  const LOG_MAX = 3500;
  function clip(s, max){
    max = max || LOG_MAX;
    if (!s) return s;
    if (s.length > max) return s.substring(0, max) + ' …(trunc)';
    return s;
  }
  function j(x, max){
    var s;
    try { s = (typeof x === 'string') ? x : JSON.stringify(x, null, 2); }
    catch(e){ s = String(x); }
    return clip(s, max);
  }
  function now(){ return Date.now(); }
  function elapsed(t0){ return (Date.now() - t0) + ' ms'; }

  /* Convierte un record a objeto plano legible */
  const recToJson = rec => {
    const out = {};
    rec.getFields().forEach(f => { out[f] = rec.getValue(f); });

    // Forzar inclusión de long text de observación (por si getFields no lo lista)
    if (typeof out.custrecord_ht_bien_observacion === 'undefined') {
      try { out.custrecord_ht_bien_observacion = rec.getValue('custrecord_ht_bien_observacion'); } catch(e){}
    }
    return out;
  };
  const loadFullBien = id => recToJson(record.load({ type: T_BIEN, id }));

  /* Verifica campos obligatorios con mensaje amigable */
  function obligatorio(obj, campos) {
    var missing = [];
    campos.forEach(f => {
      if ((!Object.prototype.hasOwnProperty.call(obj, f) ||
           obj[f] === '' || obj[f] == null) && obj[f] !== 0) {
        missing.push(f);
      }
    });

    if (missing.length) {
      // Construir texto amigable
      var nice = missing.map(f => FIELD_LABELS[f] || f);
      var list = nice.join(', ');
      var first = missing[0];

      // Hints por cada campo faltante
      var hints = {};
      missing.forEach(f => { if (FIELD_HINTS[f]) hints[f] = FIELD_HINTS[f]; });

      var msg =
        (missing.length === 1)
          ? `Falta completar el campo obligatorio: "${FIELD_LABELS[first] || first}".`
          : `Faltan completar ${missing.length} campos obligatorios: ${list}.`;

      // Adjuntar un “detalle” corto para casos comunes
      if (missing.indexOf('custrecord_ht_bien_consesionarios') >= 0) {
        msg += ' Indica el Concesionario responsable.';
      }

      // Crear error de NetSuite y colgar detalles útiles
      var err = error.create({ name:'MISSING_PARAMETER', message: msg });
      err.missingFields = missing; // IDs técnicos
      err.hints = hints;           // tips por campo
      throw err;
    }
  }

  /* Construye altName «COD PLC.:xxx MOT.:yyy CHA.:zzz» */
  function altName(d) {
    const p = [];
    if (d.custrecord_ht_bien_codsysh) p.push(d.custrecord_ht_bien_codsysh);
    if (d.custrecord_ht_bien_placa)   p.push('PLC.:' + d.custrecord_ht_bien_placa);
    if (d.custrecord_ht_bien_motor)   p.push('MOT.:' + d.custrecord_ht_bien_motor);
    if (d.custrecord_ht_bien_chasis)  p.push('CHA.:' + d.custrecord_ht_bien_chasis);
    return p.join(' ');
  }

  /* Limpia parámetros de la UI */
  function sanitize(raw) {
    const skip = k => k.startsWith('_') || k === 'recordType' || k === 'baserecordtype';
    const out  = {};
    Object.keys(raw).forEach(k => { if (!skip(k)) out[k] = raw[k]; });

    // Alias: "observacion"/"observaciones" → campo NetSuite
    if (out.custrecord_ht_bien_observacion == null) {
      var obs = (out.observacion != null) ? out.observacion : out.observaciones;
      if (obs != null) out.custrecord_ht_bien_observacion = String(obs);
    }
    delete out.observacion;
    delete out.observaciones;

    return out;
  }

  /* Solo filtros válidos ? */
  const isOnlyFilters = obj =>
    Object.keys(obj).length && Object.keys(obj).every(k => FILTER_KEYS.includes(k));

  /* ——— Duplicados: verificación simple ——— */
  function norm(v){ return (v||'').toString().trim(); }

  // Busca existencia exacta (con variantes en mayúsculas)
  function existsByField(fieldId, value){
    var v = norm(value);
    if (!v) return false;

    var variants = [v];
    var up = v.toUpperCase();
    if (up !== v) variants.push(up);

    var flt = [];
    variants.forEach(function(val, i){
      if (i) flt.push('OR');
      flt.push([fieldId, 'is', val]);
    });

    var t0 = now();
    var rs = search.create({
      type   : T_BIEN,
      filters: flt,
      columns: ['internalid']
    }).run().getRange({ start:0, end:1 });
    log.debug({
      title  : 'DupCheck → ' + fieldId,
      details: j({ value:value, filters:flt, found: !!(rs && rs.length), time: elapsed(t0) })
    });

    return !!(rs && rs.length);
  }

  // Detalles de duplicados (omite placa = "S/P")
  // Devuelve [{ field:'placa|motor|chasis', value:'...' }, ...]
  function checkDupDetails(body){
    var dup = [];
    var placa  = norm(body.custrecord_ht_bien_placa);
    var motor  = norm(body.custrecord_ht_bien_motor);
    var chasis = norm(body.custrecord_ht_bien_chasis);

    // permitir S/P sin bloquear
    if (placa && placa.toUpperCase() !== 'S/P' && existsByField('custrecord_ht_bien_placa', placa)){
      dup.push({ field:'placa', value: placa });
    }
    if (motor && existsByField('custrecord_ht_bien_motor', motor)){
      dup.push({ field:'motor', value: motor });
    }
    if (chasis && existsByField('custrecord_ht_bien_chasis', chasis)){
      dup.push({ field:'chasis', value: chasis });
    }
    log.audit({ title:'DupCheck detalles', details: j(dup) });
    return dup;
  }

  // Resuelve propietario de un vehículo existente por (placa/motor/chasis)
  function resolveExistingOwner(body){
    var orFilters = [];

    function addVariants(fieldId, val){
      var v = norm(val);
      if (!v) return;
      // Evitar que "S/P" entre a la resolución (no es duplicado bloqueante)
      if (fieldId === 'custrecord_ht_bien_placa' && v.toUpperCase() === 'S/P') return;

      var up = v.toUpperCase();
      if (orFilters.length) orFilters.push('OR');
      orFilters.push([fieldId, 'is', v]);
      if (up !== v){ orFilters.push('OR'); orFilters.push([fieldId, 'is', up]); }
    }

    addVariants('custrecord_ht_bien_placa',  body.custrecord_ht_bien_placa);
    addVariants('custrecord_ht_bien_motor',  body.custrecord_ht_bien_motor);
    addVariants('custrecord_ht_bien_chasis', body.custrecord_ht_bien_chasis);

    if (!orFilters.length) return null;

    var t0 = now();
    var rs = search.create({
      type   : T_BIEN,
      filters: orFilters,
      columns: [
        'internalid',
        'custrecord_ht_bien_propietario',
        search.createColumn({ name:'altname',     join:'custrecord_ht_bien_propietario' }),
        search.createColumn({ name:'entityid',    join:'custrecord_ht_bien_propietario' }),
        search.createColumn({ name:'companyname', join:'custrecord_ht_bien_propietario' }),
        search.createColumn({ name:'firstname',   join:'custrecord_ht_bien_propietario' }),
        search.createColumn({ name:'lastname',    join:'custrecord_ht_bien_propietario' })
      ]
    }).run().getRange({ start:0, end:1 });

    log.debug({
      title  : 'Owner resolve – búsqueda',
      details: j({ filters: orFilters, found: (rs && rs.length) || 0, time: elapsed(t0) })
    });

    if (!rs || !rs.length) return null;

    var r = rs[0];
    var ownerId   = r.getValue('custrecord_ht_bien_propietario');
    var altname   = r.getValue({ name:'altname', join:'custrecord_ht_bien_propietario' });
    var entityid  = r.getValue({ name:'entityid', join:'custrecord_ht_bien_propietario' });
    var company   = r.getValue({ name:'companyname', join:'custrecord_ht_bien_propietario' });
    var first     = r.getValue({ name:'firstname', join:'custrecord_ht_bien_propietario' });
    var last      = r.getValue({ name:'lastname',  join:'custrecord_ht_bien_propietario' });

    var ownerName = altname || company || ((first||'') + ' ' + (last||'')).trim() || entityid || '(cliente sin nombre)';
    log.audit({ title:'Owner resolve – resultado', details: j({ ownerId, ownerName }) });

    return { ownerId: ownerId, ownerName: ownerName };
  }

  /* ======= Buscar empleado por e-mail para setear OWNER ======= */
  function getEmpleadoIdByEmail (emailStr) {
    if (!emailStr) return null;
    var em = String(emailStr).trim().toLowerCase();

    var res = search.create({
      type   : search.Type.EMPLOYEE,
      filters: [['email','is', em],'and',['isinactive','is','F']],
      columns:['internalid','giveaccess']
    }).run().getRange({ start:0, end:10 });

    if (!res || !res.length) {
      log.error({ title:'Owner email no corresponde a empleado', details: em });
      return null;
    }
    // priorizar empleados con acceso
    var elegido = res[0];
    for (var i=0;i<res.length;i++){
      var ga = res[i].getValue('giveaccess');
      if (ga === true || ga === 'T'){ elegido = res[i]; break; }
    }
    return elegido.getValue('internalid');
  }

  /* ------------------------------------------------------------- *
   *  POST                                                          *
   * ------------------------------------------------------------- */
  function post(rawBody) {

    // Wrapper: siempre devolver JSON con "message"
    function ok(res){ return res; }
    function fail(e){
      var out = {
        success : false,
        code    : (e && e.name) || 'ERROR',
        message : (e && e.message) || String(e)
      };
      // Propagar detalles adicionales si existen
      if (e && e.missingFields) out.missingFields = e.missingFields;
      if (e && e.hints)         out.hints = e.hints;

      log.error({ title:'RESTlet – Error capturado', details: j(out) });
      if (ERRORS_AS_200) return out;
      throw e;
    }

    try {
      const body = sanitize(rawBody);
      log.audit({ title:'RESTlet Bienes – POST (entrada sanitizada)', details: j(body) });

      /* ===== 1) CONSULTA / BÚSQUEDA ============================== */
      if ((body.id && Object.keys(body).length === 1) || isOnlyFilters(body)) {

        /* -- Consulta 1 Bien */
        if (body.id) {
          var t0 = now();
          log.debug({ title:'Consultar bien (loadFullBien)', details: 'id=' + body.id });
          var bien = loadFullBien(body.id);
          log.audit({ title:'Consulta por ID completada', details: j({ id: body.id, time: elapsed(t0) }) });
          bien.message = 'Consulta por ID ' + body.id + ' completada.';
          return ok(bien);
        }

        /* -- Búsqueda por filtros */
        const filtros = {};
        FILTER_KEYS.forEach(k => { if (body[k]) filtros[k] = body[k]; });

        const flt = [];
        Object.keys(filtros).forEach((f, i, arr) => {
          flt.push([f, 'is', filtros[f]]);
          if (i < arr.length - 1) flt.push('AND');
        });

        log.debug({ title:'Búsqueda – Construcción de filtros', details: j({ filtros, flt }) });

        var t1 = now();
        var ids = search.create({
          type   : T_BIEN,
          filters: flt,
          columns: ['internalid']
        }).run().getRange({ start:0, end:1000 })
          .map(r => r.getValue('internalid'));

        log.audit({
          title  : 'Búsqueda – Resultados',
          details: j({ total: ids.length, sample: ids.slice(0, 20), time: elapsed(t1) })
        });

        return ok({
          filtros,
          bienes: ids.map(loadFullBien),
          message: 'Búsqueda por filtros realizada. Total: ' + ids.length
        });
      }

      /* ===== 2) CREAR =========================================== */

      /* Broker por defecto 19909 si viene vacío o no viene (antes de validar obligatorios) */
      if (!Object.prototype.hasOwnProperty.call(body, 'custrecord_pe_broker') ||
          body.custrecord_pe_broker == null || body.custrecord_pe_broker === '') {
        body.custrecord_pe_broker = 19909;
      }

      // Validación de campos obligatorios (ahora con mensaje amigable)
      obligatorio(body, OBLIG_KEYS);

      // Duplicados con detalle (omitiendo placa "S/P")
      var dupDetails = checkDupDetails(body);

      if (dupDetails.length){
        // Propietario del vehículo existente (primer match)
        var ownerInfo = resolveExistingOwner(body) || {};
        var ownerId   = ownerInfo.ownerId || '';
        var ownerName = ownerInfo.ownerName || '(cliente no disponible)';

        // Mensaje humano: "placa=XXX, chasis=YYY"
        var dupHuman = dupDetails.map(function(d){ return d.field + '=' + d.value; }).join(', ');

        var userMsg = 'No se creó el Bien: ya existe un vehículo con ' + dupHuman +
                      '. Pertenece al cliente [' + ownerId + ']: ' + ownerName;

        log.error({
          title  : 'Bloqueado por duplicado',
          details: j({ duplicates: dupDetails, ownerId, ownerName })
        });

        if (ERRORS_AS_200){
          return ok({
            success    : false,
            code       : 'DUPLICATE_VEHICLE_ID',
            message    : userMsg,
            duplicates : dupDetails,
            ownerId    : ownerId,
            ownerName  : ownerName
          });
        }
        throw error.create({ name:'DUPLICATE_VEHICLE_ID', message:userMsg });
      }

      if (!body.altname) body.altname = altName(body);

      // (Opcional) normalizar antes de guardar
      body.custrecord_ht_bien_placa  = norm(body.custrecord_ht_bien_placa);
      body.custrecord_ht_bien_motor  = norm(body.custrecord_ht_bien_motor);
      body.custrecord_ht_bien_chasis = norm(body.custrecord_ht_bien_chasis);

      const rec = record.create({ type:T_BIEN, isDynamic:true });

      log.debug({ title:'Alta – Campos a setear', details: j(body) });

      Object.keys(body).forEach(f => {
        try { rec.setValue({ fieldId:f, value:body[f] }); }
        catch(e){ log.debug({ title:'Alta – Campo ignorado', details:f + ' → ' + (e && e.message) }); }
      });

      var tSave = now();
      const id = rec.save({ enableSourcing:true, ignoreMandatoryFields:false });
      log.audit({ title:'Bien creado', details: j({ id, time: elapsed(tSave) }) });

      /* ===== Guardar Observación post-save (fallback robusto) ===== */
      try {
        if (body.custrecord_ht_bien_observacion != null) {
          record.submitFields({
            type  : T_BIEN,
            id    : id,
            values: { custrecord_ht_bien_observacion: String(body.custrecord_ht_bien_observacion) }
          });
          log.audit({
            title  : 'Observación guardada',
            details: j({ id, len: String(body.custrecord_ht_bien_observacion).length })
          });
        }
      } catch (e) {
        log.error({ title:'Error guardando Observación', details: (e && e.message) || String(e) });
      }

      /* ===== Setear OWNER desde owner_email (post-save) ===== */
      try {
        var ownerEmail = (body.owner_email || '').trim();
        if (ownerEmail) {
          var ownerId = getEmpleadoIdByEmail(ownerEmail);
          if (ownerId) {
            record.submitFields({
              type  : T_BIEN,
              id    : id,
              values: { owner: +ownerId }
            });
            log.audit({
              title  : 'Owner seteado por email',
              details: j({ id, ownerEmail, ownerId })
            });
          } else {
            log.error({
              title  : 'Owner no seteado (email sin match)',
              details: ownerEmail
            });
          }
        } else {
          log.debug({ title:'Owner no seteado (sin owner_email en body)', details: '' });
        }
      } catch (e) {
        log.error({ title: 'Error seteando owner post-save', details: (e && e.message) || String(e) });
      }

      var msg = 'Bien ' + id + ' creado correctamente .';
      return ok({ success:true, id, bien:loadFullBien(id), message: msg });

    } catch (e) {
      return fail(e);
    }
  }

  return { post };
});
