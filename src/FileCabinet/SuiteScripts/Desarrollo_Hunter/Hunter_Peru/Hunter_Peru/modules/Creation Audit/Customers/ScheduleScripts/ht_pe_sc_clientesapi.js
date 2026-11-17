/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 *  Secuencia:
 *    1) Cliente      → I_Clientes_Netsuite
 *    2) Contactos    → I_Parientes_Netsuite
 *    3) Dir/Tel/Mail → I_Clientes_Direccion_Netsuite
 *
 *  Si la respuesta del paso 1 contiene “EXISTE CLIENTE …”, el proceso se detiene.
 *
 *  Mejoras:
 *    • Actualiza siempre el Customer con:
 *        - custentity_cust_api_last_response (última respuesta recibida)
 *        - custentity_cust_api_sent (true si respuesta del paso 1 = “SE CREÓ EL CLIENTE …”)
 */
define(['N/https', 'N/runtime', 'N/log', 'N/record'], (https, runtime, log, record) => {

  /* URL de los endpoints --------------------------------------- */
  const API_CLIENTE   = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Clientes_Netsuite';
  const API_PARENTES  = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Parientes_Netsuite';
  const API_DIRECCION = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Clientes_Direccion_Netsuite';

  /* Modo de prueba (no envía HTTP reales) ---------------------- */
  const TEST_MODE = false;

  /* Fields en Customer ----------------------------------------- */
  const CUSTOMER_REC        = 'customer';
  const API_SENT_FLD        = 'custentity_cust_api_sent';
  const API_LASTRESP_FLD    = 'custentity_cust_api_last_response';

  function post(url, body) {
    if (TEST_MODE) {
      log.audit({ title: `TEST ▶ POST ${url}`, details: body });
      return { code: 200, body: '{"status":"success","respuesta":"TEST OK"}' };
    }
    return https.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function extractRespuesta(body) {
    try {
      const o = JSON.parse(body || '{}');
      return o.respuesta || o.message || body || '';
    } catch (e) {
      return String(body || '');
    }
  }

  function setCustomerFields(custId, lastResp, sentFlag) {
    if (!custId) return;
    try {
      record.submitFields({
        type: CUSTOMER_REC,
        id: String(custId),
        values: {
          [API_LASTRESP_FLD]: lastResp || '',
          [API_SENT_FLD]: !!sentFlag
        },
        options: { enableSourcing: false, ignoreMandatoryFields: true }
      });
      log.audit({
        title: 'SC – Customer actualizado',
        details: { custId, [API_SENT_FLD]: !!sentFlag, [API_LASTRESP_FLD]: lastResp }
      });
    } catch (e) {
      log.error({ title: 'SC – no pude actualizar Customer', details: e });
    }
  }

  const execute = () => {

    /* Leer parámetros ------------------------------------------ */
    const raw = runtime.getCurrentScript().getParameter('custscript_cli_payload');
    const custId = runtime.getCurrentScript().getParameter('custscript_cli_id');

    if (!raw) {
      log.error({ title: 'SC – abortado', details: 'Falta payload' });
      return;
    }
    if (!custId) {
      log.error({ title: 'SC – sin custId', details: 'Falta parámetro custscript_cli_id' });
    }

    let data;
    try { data = JSON.parse(raw); }
    catch (e) {
      log.error({ title: 'SC – JSON inválido', details: e });
      return;
    }

    let lastResp = '';
    let created  = false; // true si resp MAIN contiene “SE CREÓ EL CLIENTE …”

    /* 1) Cliente ----------------------------------------------- */
    log.audit({ title: 'Enviando MAIN', details: data.main });
    let r;
    try {
      r = post(API_CLIENTE, data.main);
    } catch (e) {
      lastResp = `ERROR POST MAIN: ${e && e.message ? e.message : e}`;
      setCustomerFields(custId, lastResp, false);
      log.error({ title: 'SC – Error HTTP MAIN', details: e });
      return;
    }

    log.audit({ title: `Resp MAIN ${r.code}`, details: r.body });
    lastResp = extractRespuesta(r.body);

    /* ——> Si ya existe el cliente, detener --------------------- */
    try {
      const resp = JSON.parse(r.body || '{}');
      if (resp.respuesta && /^EXISTE CLIENTE/i.test(resp.respuesta)) {
        setCustomerFields(custId, lastResp, false); // no marcar enviado
        log.audit({ title: 'SC – Cliente ya existe, proceso detenido', details: resp.respuesta });
        return;
      }
      // marcar éxito por “SE CREÓ EL CLIENTE …”
      if (resp.respuesta && /SE\s*CRE(O|Ó)\s*EL\s*CLIENTE/i.test(resp.respuesta)) {
        created = true;
      }
    } catch (e) {
      // body no JSON; aun así, evaluar patrón en texto plano
      if (/SE\s*CRE(O|Ó)\s*EL\s*CLIENTE/i.test(String(r.body || ''))) created = true;
      log.debug({ title: 'SC – body MAIN no JSON', details: r.body });
    }

    /* 2) Contactos --------------------------------------------- */
    if (data.contacts && data.contacts.length) {
      log.audit({ title: `Enviando CONTACTS (${data.contacts.length})`, details: data.contacts });
      try {
        r = post(API_PARENTES, data.contacts);
        log.audit({ title: `Resp CONTACTS ${r.code}`, details: r.body });
        lastResp = extractRespuesta(r.body); // última respuesta
      } catch (e) {
        lastResp = `ERROR POST CONTACTS: ${e && e.message ? e.message : e}`;
        // No detenemos necesariamente: pero registramos y seguimos a dirs
        log.error({ title: 'SC – Error HTTP CONTACTS', details: e });
      }
    }

    /* 3) Direcciones / Tel / Email ----------------------------- */
    if (data.dirs && data.dirs.length) {
      log.audit({ title: `Enviando DIRS (${data.dirs.length})`, details: data.dirs });
      try {
        r = post(API_DIRECCION, data.dirs);
        log.audit({ title: `Resp DIRS ${r.code}`, details: r.body });
        lastResp = extractRespuesta(r.body); // última respuesta de toda la secuencia
      } catch (e) {
        lastResp = `ERROR POST DIRS: ${e && e.message ? e.message : e}`;
        log.error({ title: 'SC – Error HTTP DIRS', details: e });
      }
    }

    /* 4) Persistir estado en Customer -------------------------- */
    setCustomerFields(custId, lastResp, created);
  };

  return { execute };
});
