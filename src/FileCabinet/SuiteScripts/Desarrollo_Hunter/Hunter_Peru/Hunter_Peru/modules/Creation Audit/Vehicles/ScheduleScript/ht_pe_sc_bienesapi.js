/**
 *  @NApiVersion 2.1
 *  @NScriptType ScheduledScript
 *  @NModuleScope SameAccount
 *
 *  Cambio solicitado:
 *   - USUARIO_INGRESO **siempre** debe ser el documento del EMPLEADO en el campo `owner`
 *     del Bien (campo del empleado: `custentity_pe_document_number`).
 *   - Si no existe `owner` o el empleado no tiene documento, se deja vacío y se registra en logs.
 */
define(['N/record','N/https','N/runtime','N/log','N/search'], (record, https, runtime, log, search) => {


  const safeStr  = (v) => (v === null || v === undefined) ? '' : String(v).trim();

  /* =============================== CONFIG =============================== */
  const API_URL       = 'https://syshunterperu.com/migravehiculo/migravehiculo/SIT/I_Vehiculos_Netsuite';
  const HEADERS_JSON  = { 'Content-Type': 'application/json' };
  const HTTP_SUCCESS  = [200, 201, 202];

  const FIELD_CODSYS     = 'custrecord_ht_bien_codsysh';
  const FIELD_SENT       = 'custrecord_veh_api_sent';
  const FIELD_FAILED     = 'custrecord_veh_api_failed';
  const FIELD_LAST_RESP  = 'custrecord_veh_api_last_response';

  const PARAM_BIEN_ID    = 'custscript_bien_id';
  const PARAM_PAYLOAD    = 'custscript_bien_payload';

  const TEST_MODE        = false; // deja en false para producción

  /* ========================== PUNTO DE ENTRADA ========================== */
  const execute = () => {
    const bienId = runtime.getCurrentScript().getParameter(PARAM_BIEN_ID);
    if (!bienId) {
      log.audit({
        title  : 'Abortado – falta parámetro',
        details: 'No se procesó ningún Bien: faltó custscript_bien_id.'
      });
      return;
    }
    procesarBien(bienId);
  };

  /* ============================== HELPERS =============================== */
  const upper = v => (v || '').toString().toUpperCase();

  const marcarBien = (bienId, exito, mensaje = '') => {
    try {
      const vals = exito
        ? { [FIELD_SENT] : 'T', [FIELD_FAILED] : 'F' }
        : { [FIELD_SENT] : 'F', [FIELD_FAILED] : 'T' };

      vals[FIELD_LAST_RESP] = (mensaje || '').substring(0, 300);

      record.submitFields({
        type    : 'customrecord_ht_record_bienes',
        id      : bienId,
        values  : vals,
        options : { enableSourcing:false, ignoreMandatoryFields:true }
      });

      if (!exito)
        log.error({ title:`Bien ${bienId} – fallo`, details: mensaje });

    } catch (e) {
      log.error({ title:`No se pudo marcar Bien ${bienId}`, details:e });
    }
  };

  const obtenerRucCliente = clienteId => {
    if (!clienteId) return null;
    try {
      const datos = search.lookupFields({
        type   : record.Type.CUSTOMER,
        id     : clienteId,
        columns: ['custentity_pe_document_number', 'parent', 'entityid']
      });
      let ruc = datos.custentity_pe_document_number || null;
      if (!ruc && datos.parent?.length) {
        const pid  = datos.parent[0].value;
        const pdat = search.lookupFields({
          type   : record.Type.CUSTOMER,
          id     : pid,
          columns: ['custentity_pe_document_number']
        });
        ruc = pdat.custentity_pe_document_number || null;
      }
      if (!ruc && datos.entityid) {
        const m = datos.entityid.match(/\b\d{8,11}\b/);
        if (m) ruc = m[0];
      }
      return ruc;
    } catch (e) {
      log.error({ title:`Lookup RUC cliente ${clienteId}`, details:e });
      return null;
    }
  };

  /** Devuelve el internalId del EMPLEADO en el campo owner/ownerid del Bien */
  const getOwnerEmployeeId = (bienRec) => {
    let ownerId = null;
    try { ownerId = bienRec.getValue('owner'); } catch (e) {}
    if (!ownerId) { try { ownerId = bienRec.getValue('ownerid'); } catch (e) {} }
    return ownerId || null;
  };

  /** Devuelve el documento del empleado (custentity_pe_document_number) */
  const getEmployeeDocNumber = (empId) => {
    if (!empId) return '';
    try {
      const info = search.lookupFields({
        type   : record.Type.EMPLOYEE,
        id     : empId,
        columns: ['custentity_pe_document_number']
      });
      return (info && info.custentity_pe_document_number)
        ? String(info.custentity_pe_document_number)
        : '';
    } catch (e) {
      log.error({ title:'getEmployeeDocNumber()', details:{ empId, e } });
      return '';
    }
  };

  /** Extrae dígitos desde el texto mostrado o devuelve el valor del campo */
  const extractDigits = (bien, fieldId) => {
    const txt = bien.getText({ fieldId }) || '';
    const m   = txt.match(/\b\d+\b/);
    return m ? m[0] : (bien.getValue({ fieldId }) || '');
  };


      /* Helper: obtener el código de sucursal desde el record de sucursal */
    const getSucursalCodeFromBien = (bienRec) => {
      try {
        const sucId = (safeStr(bienRec.getValue({ fieldId: 'custrecord_ht_pe_sucursal' })) || safeStr(bienRec.getValue({ fieldId: 'custrecordht_pe_sucursal' })) || '').toString();
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

  /* ========================== PROCESAR UN BIEN ========================== */
  const procesarBien = (bienId) => {
    let payloadForLog = null;

    try {
      /* 0) Payload inyectado desde UE (opcional) */
      const rawPayload = runtime.getCurrentScript().getParameter(PARAM_PAYLOAD);
      let payloadUE = null;
      if (rawPayload) {
        try { payloadUE = JSON.parse(rawPayload); }
        catch (e) { log.error({ title: 'Payload JSON inválido', details: e }); }
      }

      /* 1) Cargar Bien */
      const bien = record.load({
        type      : 'customrecord_ht_record_bienes',
        id        : bienId,
        isDynamic : false
      });

      /* === NUEVO/CLAVE: USUARIO_INGRESO desde OWNER (empleado) === */
      const ownerEmpId  = getOwnerEmployeeId(bien);
      const ownerDocNum = getEmployeeDocNumber(ownerEmpId);
      if (!ownerEmpId || !ownerDocNum) {
        log.error({
          title  : 'USUARIO_INGRESO – owner inválido',
          details: { ownerEmpId, ownerDocNum, bienId }
        });
      } else {
        log.debug({
          title  : 'USUARIO_INGRESO – resuelto por owner',
          details: { ownerEmpId, ownerDocNum }
        });
      }

      /* 2) RUC/DNI del propietario */
      const clienteId = bien.getValue('custrecord_ht_bien_propietario');
      const ruc       = obtenerRucCliente(clienteId) || clienteId;

      /* 3) Campos básicos */
      const campo  = id => bien.getText({ fieldId:id }) || bien.getValue({ fieldId:id });
      const marca  = campo('custrecord_ht_bien_marca');
      const modelo = campo('custrecord_ht_bien_modelo');
      const tipo   = campo('custrecord_ht_bien_tipo');
      const color  = campo('custrecord_ht_bien_colorcarseg');
      const motor  = bien.getValue('custrecord_ht_bien_motor');
      const chasis = bien.getValue('custrecord_ht_bien_chasis');
      const placa  = bien.getValue('custrecord_ht_bien_placa');
      const anio   = bien.getValue('custrecord_ht_bien_ano');
      const observacion = bien.getValue('custrecord_ht_bien_observacion');
      const sucursalCode = getSucursalCodeFromBien(bien);

      /* 4) Validación mínima */
      const faltantes = [];
      if (!modelo) faltantes.push('MODELO');
      if (!tipo)   faltantes.push('TIPO_VEHICULO');
      if (faltantes.length) {
        const msg = `Faltan campos obligatorios: ${faltantes.join(', ')}`;
        marcarBien(bienId, false, msg);
        log.error({ title:`Bien ${bienId} – campos faltantes`, details: msg });
        return;
      }

      /* 5) Códigos/numéricos */
      const concesionario     = extractDigits(bien, 'custrecord_ht_bien_consesionarios');
      const financiera        = extractDigits(bien, 'custrecord_ht_bien_financiadovehiculo');
      const aseguradora       = extractDigits(bien, 'custrecord_ht_bien_companiaseguros');
      const broker       = extractDigits(bien, 'custrecord_pe_broker');
      const codigoFinanciador = extractDigits(bien, 'custrecord_pe_ht_financiador');

      const colorFabCode  = extractDigits(bien, 'custrecord_ht_bien_colorfabricante');
      const colorMatCode  = extractDigits(bien, 'custrecord_ht_bien_colormatricula');
      const tipoFlotaCode = extractDigits(bien, 'custrecord_ht_bien_tipoflota');

      /* 6) Avalúo → entero */
      const avalRaw = bien.getValue('custrecord_ht_bien_avaluo');
      const avalInt = avalRaw ? parseInt(String(avalRaw).replace(/[, ]/g,''), 10) : null;

      /* 7) Clave */
      const clave = bien.getValue('custrecord_ht_bien_clave');

      /* 8) Construir payload (si vino del UE, se respeta pero se fuerza USUARIO_INGRESO=ownerDoc) */
      let payload;
      if (payloadUE) {
        payload = payloadUE;
        payload.USUARIO_INGRESO = ownerDocNum || '';
      } else {
        payload = {
          BIEN              : bienId.toString(),
          CLIENTE           : (ruc || '').toString(),
          MARCA             : upper(marca),
          MODELO            : upper(modelo),
          TIPO_VEHICULO     : upper(tipo),
          COLOR             : upper(color),
          MOTOR             : upper(motor),
          CHASIS            : upper(chasis),
          PLACA             : upper(placa),
          ANIO              : (anio || '').toString(),
          CONCESIONARIO     : (concesionario || '').toString(),
          FINANCIERA        : (financiera || '').toString(),
          ASEGURADORA       : (aseguradora || '').toString(),
          BROKER            : (broker || '').toString(),
          CODIGO_FINANCIADOR: (codigoFinanciador || '').toString(),
          USUARIO_INGRESO   : ownerDocNum || '',
          COLOR_FABRICANTE  : (colorFabCode || '').toString(),
          COLOR_MATRICULA   : (colorMatCode || '').toString(),
          AVALUO            : (avalInt !== null ? avalInt.toString() : ''),
          CLAVE             : (clave || '').toString(),
          TIPO_FLOTA        : (tipoFlotaCode || '').toString(),
          OBSERVACION       : upper(observacion),
          SUCURSAL          : (sucursalCode || '').toString(),
        };
      }

      payloadForLog = payload;
      log.audit({
        title  : `Payload Hunter (Bien ${bienId})`,
        details: JSON.stringify(payload, null, 2)
      });

      /* 9) TEST MODE */
      if (TEST_MODE) {
        marcarBien(bienId, true, '🔍 MODO TEST – no se llamó a la API');
        return;
      }

      /* 10) Enviar al API */
      const resp = https.request({
        method          : https.Method.POST,
        url             : API_URL,
        headers         : HEADERS_JSON,
        body            : JSON.stringify(payload),
        followRedirects : false
      });

      /* 11) Parsear respuesta */
      let codSysApi = null;
      try {
        const parsed = JSON.parse(resp.body || '{}');
        if (parsed.respuesta) codSysApi = parsed.respuesta.toString();
      } catch (e) {
        log.error({ title:'Error parseando respuesta', details:e });
      }

      const isNumericResponse = /^\d{10}$/.test(codSysApi);
      const success           = HTTP_SUCCESS.includes(resp.code) && isNumericResponse;

      const codText = codSysApi || '—';
      const lastMsg = success
        ? `HTTP ${resp.code} – codsys=${codText}`
        : `HTTP ${resp.code} – respuesta no válida: ${resp.body}`.substring(0, 300);

      log.audit({
        title  : `Respuesta Hunter (Bien ${bienId})`,
        details: { code: resp.code, body: resp.body }
      });

      /* 12) Marcar resultado */
      if (success) {
        const vals = {
          [FIELD_SENT]      : 'T',
          [FIELD_FAILED]    : 'F',
          [FIELD_LAST_RESP] : lastMsg,
          [FIELD_CODSYS]    : codSysApi
        };
        record.submitFields({
          type    : 'customrecord_ht_record_bienes',
          id      : bienId,
          values  : vals,
          options : { enableSourcing:false, ignoreMandatoryFields:true }
        });
        log.debug({ title:`✅ Bien ${bienId} enviado`, details:lastMsg });
      } else {
        marcarBien(bienId, false, lastMsg);
      }

    } catch (e) {
      marcarBien(bienId, false, e.message || String(e));
      log.error({
        title  : `❌ Error procesando Bien ${bienId}`,
        details: { error: e, payload: payloadForLog }
      });
    }
  };

  return { execute };
});
