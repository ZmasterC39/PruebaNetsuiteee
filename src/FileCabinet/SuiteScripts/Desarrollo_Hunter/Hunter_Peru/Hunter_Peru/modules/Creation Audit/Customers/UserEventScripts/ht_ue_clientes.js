/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 *  ▸ Genera tres snapshots:
 *      • main      → 6 campos del cliente (API I_Clientes_Netsuite)
 *      • contacts  → contactos normalizados (API I_Parientes_Netsuite)
 *      • dirs      → direcciones + teléfonos + emails (API I_Clientes_Direccion_Netsuite)
 *
 *  ▸ Lanza un único ScheduledScript con el objeto { main, contacts, dirs }.
 *    (El Scheduled abortará el resto del envío si la API indica “EXISTE CLIENTE …”)
 *
 *  ▸ Mejoras:
 *      • Permite reenvío en EDIT si custentity_ht_pe_customer_maf = true
 *        y custentity_cust_api_sent = false. En otros casos no hace nada.
 *      • Se repone el log: log.debug({ title: 'UE – sin Scheduled', details: `Evento ${ctx.type}` });
 *      • Logs extensos siempre, incluso si se ignora el envío (motivo + payload completo troceado).
 */
define(
  ['N/record', 'N/search', 'N/log', 'N/task', 'N/runtime'],
  (record, search, log, task, runtime) => {

  /* ---------- Custom records ------------------------------------ */
  const PHONE_REC            = 'customrecord_ht_registro_telefono';
  const PHONE_CUSTOMER_FLD   = 'custrecord_ht_campo_lbl_entidad_telefono';

  const EMAIL_REC            = 'customrecord_ht_record_correoelectronico';
  const EMAIL_CUSTOMER_FLD   = 'custrecord_ht_ce_enlace';

  const CONTACT_REC          = 'customrecord_ht_rc_registrocontactos';
  const CONTACT_CUSTOMER_FLD = 'custrecord_ht_rc_empresa';

  /* ---------- Fields en Customer -------------------------------- */
  const MAF_FLAG_FLD         = 'custentity_ht_pe_customer_maf';         // checkbox
  const API_SENT_FLD         = 'custentity_cust_api_sent';              // checkbox
  const API_LASTRESP_FLD     = 'custentity_cust_api_last_response';     // text (informativo en UE)

  /* ---------- Helpers Log (troceo seguro) ----------------------- */
  const MAX_CHARS = 3800; // margen por límite del log
  function logJsonBig(level, title, obj) {
    try {
      const s = JSON.stringify(obj, null, 2);
      logTextBig(level, title, s);
    } catch (e) {
      logTextBig('error', `${title} (JSON fail)`, (e && e.message) || String(e));
    }
  }
  function logTextBig(level, title, text) {
    const t = String(text || '');
    if (t.length <= MAX_CHARS) return log[level]({ title, details: t });
    let idx = 0;
    for (let i = 0; i < t.length; i += MAX_CHARS) {
      const part = t.substring(i, i + MAX_CHARS);
      log[level]({ title: `${title} [${++idx}]`, details: part });
    }
  }

  /* ---------- Util ---------------------------------------------- */
  const U = v => (v || '').toString().toUpperCase();

  function splitFullName(full) {
    const p = (full || '').trim().split(/\s+/);
    let n = '', ap = '', am = '';
    switch (p.length) {
      case 1: n = p[0]; break;
      case 2: n = p[0]; ap = p[1]; break;
      case 3: n = p[0]; ap = p[1]; am = p[2]; break;
      default:
        n  = p.slice(0, 2).join(' ');
        ap = p[2]; am = p[3];
    }
    return { n: U(n), ap: U(ap), am: U(am) };
  }

  /* ---------- Normalizar PARENTEZCO ----------------------------- */
  const PARENT_BY_ID = {
    '1':'NO DEFINIDO','2':'ABUELO(A)','3':'PADRE','4':'MADRE','5':'TIO(A)',
    '6':'HIJO(A)','7':'PRIMO(A)','8':'SOBRINO(A)','9':'SUEGRO(A)','10':'AMIGO(A)',
    '11':'ESPOSO(A)','12':'HERMANO(A)','13':'CUÑADO(A)','14':'REPRESENTANTE',
    '15':'CONTACTO KEEPER'
  };
  function normParen(id, text) {
    if (PARENT_BY_ID[id]) return PARENT_BY_ID[id];
    const t = U(text || '');
    const hit = kw => t.indexOf(kw) !== -1;
    if (hit('ABUELO')) return 'ABUELO(A)';
    if (hit('PADRE'))  return 'PADRE';
    if (hit('MADRE'))  return 'MADRE';
    if (hit('TIO'))    return 'TIO(A)';
    if (hit('HIJO'))   return 'HIJO(A)';
    if (hit('PRIMO'))  return 'PRIMO(A)';
    if (hit('SOBRINO'))return 'SOBRINO(A)';
    if (hit('SUEGRO')) return 'SUEGRO(A)';
    if (hit('AMIGO'))  return 'AMIGO(A)';
    if (hit('ESPOSO')) return 'ESPOSO(A)';
    if (hit('HERMANO'))return 'HERMANO(A)';
    if (hit('CUÑADO')) return 'CUÑADO(A)';
    if (hit('REPRESENTANTE')) return 'REPRESENTANTE';
    if (hit('CONTACTO KEEPER')) return 'CONTACTO KEEPER';
    if (hit('BENEFICIO') && hit('COVID')) return 'BENEFICIO COVID';
    return 'NO DEFINIDO';
  }

  /* ---------- Lee el doc-number del usuario actual -------------- */
  function getCurrentEmpDoc () {
    try {
      const userId = runtime.getCurrentUser().id;
      if (!userId) return '';
      const emp = record.load({ type: 'employee', id: userId, isDynamic: false });
      return emp.getValue('custentity_pe_document_number') || '';
    } catch (e) {
      log.error({ title: 'UE – no pude leer empleado', details: e });
      return '';
    }
  }

  /* ---------- Snapshot MAIN (solo cliente) ---------------------- */
  function buildMain(rec, empDoc) {
    const isPerson = rec.getValue('isperson') === true || rec.getValue('isperson') === 'T';
    return {
      ID_CLIENTE      : U(rec.getValue('custentity_pe_document_number')),
      PRIMER_NOMBRE   : isPerson ? U(rec.getValue('firstname')) : U(rec.getValue('companyname')),
      SEGUNDO_NOMBRE  : isPerson ? U(rec.getValue('middlename')) : '',
      APELLIDO_PATERNO: isPerson ? U(rec.getValue('custentity_ht_cl_apellidopaterno')) : '',
      APELLIDO_MATERNO: isPerson ? U(rec.getValue('custentity_ht_cl_apellidomaterno')) : '',
      TIPODOCUMENTO   : U(rec.getText('custentity_pe_document_type')),
      USUARIO_INGRESO : U(empDoc)
    };
  }

  /* ---------- Addressbook → dirs ------------------------------- */
  function buildAddresses(rec, docNum) {
    const out = [];
    const cnt = rec.getLineCount({ sublistId: 'addressbook' }) || 0;
    for (let i = 0; i < cnt; i++) {
      const sub = rec.getSublistSubrecord({
        sublistId: 'addressbook',
        fieldId  : 'addressbookaddress',
        line     : i
      });
      out.push({
        ID_CLIENTE    : docNum,
        TIPO_DIRECCION: 'DIRECCION',
        DIRECCION     : U(sub.getValue('addr1')),
        UBIGEO        : U(
          sub.getValue('custrecord_pe_cod_ubigeo') ||
          sub.getText('custrecord_pe_cod_ubigeo')
        )
      });
    }
    return out;
  }

  /* ---------- Helper para custom records ----------------------- */
  function fetch(recType, linkFld, cId) {
    return search.create({
      type   : recType,
      filters: [[linkFld, 'anyof', cId], 'AND', ['isinactive', 'is', 'F']],
      columns: ['internalid']
    })
    .run()
    .getRange({ start: 0, end: 1000 })
    .map(r => record.load({ type: recType, id: r.getValue('internalid') }));
  }

  /* ---------- Contactos / Tel / Email -------------------------- */
  function buildContacts(cId, docNum, empDoc) {
    return fetch(CONTACT_REC, CONTACT_CUSTOMER_FLD, cId).map(c => {
      const tipo = normParen(
        String(c.getValue('custrecord_ht_rc_tipodecontacto') || ''),
        c.getText('custrecord_ht_rc_tipodecontacto')
      );
      const { n, ap, am } = splitFullName(c.getValue('name'));
      return {
        ID_CLIENTE      : docNum,
        PARENTEZCO      : tipo,
        NOMBRE          : n,
        APELLIDO_PATERNO: ap,
        APELLIDO_MATERNO: am,
        TELEFONO        : U(c.getValue('custrecord_ht_rc_numerotelefonoprincipal')),
        USUARIO_INGRESO : U(empDoc)
      };
    });
  }

  function buildPhones(cId, docNum, empDoc) {
    return fetch(PHONE_REC, PHONE_CUSTOMER_FLD, cId).map(p => ({
      ID_CLIENTE      : docNum,
      TIPO_DIRECCION  : 'TELEFONO',
      DIRECCION       : U(p.getValue('custrecord_ht_campo_txt_telefono')),
      USUARIO_INGRESO : U(empDoc)
    }));
  }

  function buildEmails(cId, docNum, empDoc) {
    return fetch(EMAIL_REC, EMAIL_CUSTOMER_FLD, cId).map(e => {
      let tipo = U(e.getText('custrecord_ht_email_tipoemail') || '');
      if (!tipo) tipo = 'E-MAIL';
      if (!/^E-MAIL/.test(tipo)) tipo = `E-MAIL ${tipo}`;
      return {
        ID_CLIENTE      : docNum,
        TIPO_DIRECCION  : tipo.trim(),
        DIRECCION       : U(e.getValue('custrecord_ht_email_email')),
        USUARIO_INGRESO : U(empDoc)
      };
    });
  }

  /* ---------- afterSubmit -------------------------------------- */
  function afterSubmit(ctx) {
    const isCreate = ctx.type === ctx.UserEventType.CREATE;
    const isEdit   = ctx.type === ctx.UserEventType.EDIT;

    // Flags desde newRecord (sin cargar aún)
    const mafFlag = (ctx.newRecord.getValue(MAF_FLAG_FLD) === true) ||
                    (ctx.newRecord.getValue(MAF_FLAG_FLD) === 'T');

    const apiSent = (ctx.newRecord.getValue(API_SENT_FLD) === true) ||
                    (ctx.newRecord.getValue(API_SENT_FLD) === 'T');

    // Determinar si se permite envío
    const isSchedCtx = runtime.executionContext === runtime.ContextType.SCHEDULED_SCRIPT;
    //const allowed = !isSchedCtx && mafFlag && (isCreate || (isEdit && !apiSent));
    //travesura
    const allowed = !isSchedCtx && mafFlag && !apiSent && (isCreate || isEdit);    
    
    // Motivo de ignorar (si aplica)
    let ignoreReason = '';
    if (!allowed) {
      if (isSchedCtx)                ignoreReason = 'origen SCHEDULED_SCRIPT';
      else if (!mafFlag)             ignoreReason = 'MAF=false';
      else if (isEdit && apiSent)    ignoreReason = 'EDIT con API_SENT=true';
      else                           ignoreReason = `Evento no permitido: ${ctx.type}`;
    }

    // Cargar siempre para loggear payload (aunque se ignore)
    let cust;
    try {
      cust = record.load({ type: ctx.newRecord.type, id: ctx.newRecord.id, isDynamic: false });
    } catch (e) {
      log.error({ title: 'UE – no se pudo cargar Customer', details: e });
      // si ni siquiera carga, loguear estado básico y salir
      if (!allowed) {
        log.debug({ title: 'UE – sin Scheduled', details: `Evento ${ctx.type} (${ignoreReason})` });
      }
      return;
    }

    const docNum = U(cust.getValue('custentity_pe_document_number'));
    const empDoc = getCurrentEmpDoc();

    const main     = buildMain(cust, empDoc);
    const contacts = buildContacts(cust.id, docNum, empDoc);
    const dirs     = [
      ...buildAddresses(cust, docNum),
      ...buildPhones(cust.id, docNum, empDoc),
      ...buildEmails(cust.id, docNum, empDoc)
    ];

    // Siempre imprimir un resumen del estado + payload completo
    logTextBig('audit', 'UE ▶ Estado',
      `Evento=${ctx.type}, Allowed=${allowed}, MotivoIgnorar=${ignoreReason || '—'}, ` +
      `MAF=${mafFlag}, API_SENT=${apiSent}, Ctx=${runtime.executionContext}`
    );
    logJsonBig('audit', 'UE ▶ MAIN', main);
    logJsonBig('audit', `UE ▶ CONTACTS (${contacts.length})`, contacts);
    logJsonBig('audit', `UE ▶ DIRS (${dirs.length})`, dirs);

    if (!allowed) {
      // No programar, pero dejar rastro explícito (tu línea original)
      log.debug({ title: 'UE – sin Scheduled', details: `Evento ${ctx.type}` });
      return;
    }

    // Lanzar Scheduled
    try {
      const tId = task.create({
        taskType    : task.TaskType.SCHEDULED_SCRIPT,
        scriptId    : 'customscript_ht_pe_sc_clientesapi',
        deploymentId: 'customdeploy_ht_pe_sc_clientesapi',
        params      : {
          custscript_cli_id      : String(cust.id),
          custscript_cli_payload : JSON.stringify({ main, contacts, dirs })
        }
      }).submit();
      log.audit({ title: 'Scheduled lanzado', details: `Task ${tId}` });
    } catch (e) {
      log.error({ title: 'UE – no se pudo lanzar Scheduled', details: e });
    }
  }

  return { afterSubmit };
});
