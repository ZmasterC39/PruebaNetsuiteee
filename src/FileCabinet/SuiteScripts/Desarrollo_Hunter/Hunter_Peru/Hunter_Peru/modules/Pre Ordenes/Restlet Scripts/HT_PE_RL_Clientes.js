/**
 * HT_PE_RL_Clientes – RESTlet alta / consulta + sync API
 * versión 2025-08-28  ·  Owner/SalesRep por email + USUARIO_INGRESO override
 * --------------------------------------------------------
 *  ▸ POST { documentNumber }          → consulta
 *  ▸ POST { …datos completos… }       → crea cliente, sub-registros
 *                                       y sincroniza con 3 APIs
 *
 *  Respuesta estándar:
 *  {
 *    success : true|false,
 *    code    : 'OK' | 'MISSING_FIELD' | 'DUPLICATE_DOC' | …,
 *    message : 'texto descriptivo',
 *    id      : <internalId>,            // SIEMPRE presente
 *    data    : { …ficha completa… }     // incluye id & internalId
 *  }
 * --------------------------------------------------------
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','N/error','N/log','N/https','N/runtime'],
(record, search, error, log, https, runtime) => {

/* ---------- Config. cuenta ---------------------------------- */
const DEFAULT_SUBSIDIARY = 3;          // PE
const DEFAULT_STATUS     = 13;         // «Cliente – Activo»
// >>> CAMBIO: Moneda cabecera PEN (5) y extra USD (1)
const DEFAULT_CURRENCY   = 1;          // USD – segunda línea en la sub-lista
const EXTRA_CURRENCY     = 5;          // PEN – moneda por defecto (cabecera)
const TEST_MODE          = false;      

/* ---------- Endpoints externos ------------------------------ */
const API_CLIENTE   = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Clientes_Netsuite';
const API_PARENTES  = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Parientes_Netsuite';
const API_DIRECCION = 'https://syshunterperu.com/migracliente/migracliente/SIT/I_Clientes_Direccion_Netsuite';

/* ---------- Custom records ---------------------------------- */
const PHONE_REC            = 'customrecord_ht_registro_telefono';
const PHONE_CUSTOMER_FLD   = 'custrecord_ht_campo_lbl_entidad_telefono';

const EMAIL_REC            = 'customrecord_ht_record_correoelectronico';
const EMAIL_CUSTOMER_FLD   = 'custrecord_ht_ce_enlace';

const CONTACT_REC          = 'customrecord_ht_rc_registrocontactos';
const CONTACT_CUSTOMER_FLD = 'custrecord_ht_rc_empresa';

/* ============================================================ *
 *  UTILIDADES                                                  *
 * ============================================================ */
const U         = v => (v || '').toString().toUpperCase();
const isEmpty   = v => v === null || v === undefined || v === '';
const toBool    = v => (v===true||v==='T'||v===1||(typeof v==='string'&&v.toLowerCase()==='true'));
const toNumber  = v => (!isEmpty(v) && !isNaN(v)) ? Number(v) : null;

function recToJson(rec){
  const o={}; rec.getFields().forEach(f=>o[f]=rec.getValue(f)); return o;
}
function safeSet(rec,fieldId,value){
  try{ if(!isEmpty(value)) rec.setValue({ fieldId, value }); }catch(e){
    log.error({ title:`safeSet ${fieldId}`, details:{ value, err:e } });
  }
}

function findCustomerId(docNum){
  let id=null;
  search.create({
    type:record.Type.CUSTOMER,
    filters:[['custentity_pe_document_number','is',docNum]],
    columns:['internalid']
  }).run().each(r=>{ id=r.getValue('internalid'); return false; });
  return id;
}

/** Divide una cadena en { first, rest } usando espacios como separadores. */
function splitFirstAndRest(s){
  const parts = (s || '').toString().trim().split(/\s+/);
  const first = parts.shift() || '';
  const rest  = parts.join(' ') || '';
  return { first, rest };
}

/** Busca empleado por email y devuelve { id, doc, email, isSalesRep } si existe. */
function findEmployeeByEmail(email){
  if (isEmpty(email)) return null;
  let out = null;
  search.create({
    type:record.Type.EMPLOYEE,
    filters:[['isinactive','is','F'],'AND',['email','is',email]],
    columns:['internalid','custentity_pe_document_number','email','issalesrep']
  }).run().each(r=>{
    out = {
      id        : Number(r.getValue('internalid')),
      doc       : (r.getValue('custentity_pe_document_number') || '').toString(),
      email     : (r.getValue('email') || '').toString(),
      isSalesRep: r.getValue('issalesrep') === true || r.getValue('issalesrep') === 'T'
    };
    return false; // stop at first
  });
  return out;
}

/* ------------- Lee ficha completa --------------------------- */
function loadFullCustomer(internalId){

  const cust = record.load({ type:record.Type.CUSTOMER, id:internalId });
  const out  = recToJson(cust);

  out.id         = internalId;   // compatibilidad UI
  out.internalId = internalId;

  /* Addressbook */
  out.addressbook=[];
  const n=cust.getLineCount({ sublistId:'addressbook' })||0;
  for(let i=0;i<n;i++){
    const sub=cust.getSublistSubrecord({
      sublistId:'addressbook', fieldId:'addressbookaddress', line:i
    });
    out.addressbook.push({
      label          : cust.getSublistValue({ sublistId:'addressbook', fieldId:'label',           line:i }),
      defaultbilling : cust.getSublistValue({ sublistId:'addressbook', fieldId:'defaultbilling',  line:i }),
      defaultshipping: cust.getSublistValue({ sublistId:'addressbook', fieldId:'defaultshipping', line:i }),
      address        : recToJson(sub)
    });
  }

  /* Custom records vinculados */
  function fetchAll(recType,linkFld){
    const ids=search.create({
      type:recType,
      filters:[[linkFld,'anyof',internalId],'AND',['isinactive','is','F']],
      columns:['internalid']
    }).run().getRange({ start:0, end:1000 }).map(r=>r.getValue('internalid'));
    return ids.map(id=>recToJson(record.load({ type:recType, id })));
  }

  out.phones   = fetchAll(PHONE_REC,   PHONE_CUSTOMER_FLD);
  out.emails   = fetchAll(EMAIL_REC,   EMAIL_CUSTOMER_FLD);
  out.contacts = fetchAll(CONTACT_REC, CONTACT_CUSTOMER_FLD);

  return out;
}

/* ============================================================ *
 *  CREAR CLIENTE                                               *
 * ============================================================ */
function createCustomer(body){

  /* --- Validaciones mínimas --------------------------------- */
  const mandatory=['documentType','documentNumber','personType'];  // currency ya no es obligatorio
  for(const f of mandatory){
    if(isEmpty(body[f]))
      return { success:false, code:'MISSING_FIELD', message:`Falta ${f}`, data:{ body } };
  }
  if(findCustomerId(body.documentNumber))
    return { success:false, code:'DUPLICATE_DOC', message:`Doc ${body.documentNumber} ya existe` };

  const isPerson=(body.isindividual||'').toLowerCase()==='individual';
  if(isPerson && (isEmpty(body.firstname)||isEmpty(body.lastname)))
    return { success:false, code:'MISSING_FIELD', message:'Faltan firstname/lastname' };
  if(!isPerson && isEmpty(body.companyname))
    return { success:false, code:'MISSING_FIELD', message:'Falta companyname' };

  /* --- Resolver empleado (Owner/SalesRep) por id o por email --- */
  let chosenEmp = null; // { id, doc, email, isSalesRep }
  const ownerIdRaw    = !isEmpty(body.ownerId) ? Number(body.ownerId) : null;
  const ownerEmailRaw = (body.ownerEmail || body.owner_email || '').toString().trim().toLowerCase();

  if (ownerIdRaw) {
    try{
      const info = search.lookupFields({
        type   : record.Type.EMPLOYEE,
        id     : ownerIdRaw,
        columns: ['custentity_pe_document_number','email','issalesrep']
      });
      chosenEmp = {
        id        : ownerIdRaw,
        doc       : (info.custentity_pe_document_number || '').toString(),
        email     : (info.email || '').toString().toLowerCase(),
        isSalesRep: info.issalesrep === true || info.issalesrep === 'T'
      };
    }catch(e){
      log.error({ title:'ownerId inválido', details:{ ownerId:ownerIdRaw, err:e } });
    }
  } else if (ownerEmailRaw) {
    chosenEmp = findEmployeeByEmail(ownerEmailRaw);
    if (!chosenEmp) {
      log.error({ title:'No se encontró empleado por email', details:{ ownerEmail: ownerEmailRaw } });
    }
  }

  /* --- Alta de Customer ------------------------------------- */
  let cid;
  try{
    const cust=record.create({ type:record.Type.CUSTOMER, isDynamic:true });

    safeSet(cust,'subsidiary',DEFAULT_SUBSIDIARY);
    // >>> CAMBIO: Moneda cabecera = PEN (5)
    safeSet(cust,'currency',  DEFAULT_CURRENCY);

    safeSet(cust,'custentity_pe_document_type',toNumber(body.documentType)||body.documentType);
    safeSet(cust,'custentity_pe_document_number',body.documentNumber);
    safeSet(cust,'custentity_pe_type_of_person',toNumber(body.personType)||body.personType);
    safeSet(cust,'vatregnumber',body.documentNumber);
    safeSet(cust,'isindividual',isPerson?'Individual':'Empresa');
    safeSet(cust,'isperson',   isPerson?'T':'F');
    safeSet(cust,'entitystatus',DEFAULT_STATUS);
    safeSet(cust,'email',body.email);
    safeSet(cust,'phone',body.phone);

    // >>> NUEVO: Defaults solicitados (solo subsidiaria 3; aquí ya lo es)
    safeSet(cust,'receivablesaccount', '4897');
    safeSet(cust,'taxitem',            '24205');
    safeSet(cust,'custentity_edoc_gen_trans_pdf',        true);  // "T"
    safeSet(cust,'custentity_psg_ei_entity_edoc_standard','2');

    /* ====== SET Owner/SalesRep antes de guardar =======================
       - Campo custom:  custentity_pe_ht_owner_customers (Employee)
       - Campo estándar: owner (Employee)
       - Campo salesrep: si el empleado es rep (o si el set no falla)
       NOTA: nluser es solo lectura — NO se puede setear desde script.
    ==================================================================== */
    if (chosenEmp && chosenEmp.id) {
      try {
        safeSet(cust, 'custentity_pe_ht_owner_customers', chosenEmp.id);
        safeSet(cust, 'owner', chosenEmp.id);
        try {
          safeSet(cust, 'salesrep', chosenEmp.id); // puede fallar si no es Sales Rep
          log.audit({ title:'SalesRep seteado', details:{ employeeId: chosenEmp.id } });
        } catch (eSR) {
          log.debug({ title:'No se pudo setear salesrep (posible no Sales Rep)', details:{ employeeId: chosenEmp.id, err:eSR } });
        }
        log.audit({ title:'Owner seteado (pre-save)', details:{ ownerId: chosenEmp.id, ownerEmail: chosenEmp.email } });
      } catch (e) {
        log.error({ title:'No se pudo setear Owner/SalesRep (pre-save)', details:{ employeeId: chosenEmp.id, err:e } });
      }
    } else {
      log.debug({ title:'Owner no seteado (sin ownerId/ownerEmail válido)', details:{} });
    }
    /* ================================================================= */

    if(isPerson){

      const lastRaw   = (body.lastname || '').trim();
      const lastParts = lastRaw.split(/\s+/);           
      const apePat    = lastParts.shift() || '';         
      const apeMat    = lastParts.join(' ') || '';      
      const { first: priNom, rest: segNom } = splitFirstAndRest(body.firstname || '');

      safeSet(cust, 'custentity_ht_cl_primernombre',  U(priNom));
      safeSet(cust, 'custentity_ht_cl_segundonombre', U(segNom));
      
      safeSet(cust,'firstname', body.firstname);
      safeSet(cust,'lastname',  lastRaw );
      safeSet(cust,'custentity_ht_cl_apellidopaterno', apePat.toUpperCase());
      safeSet(cust,'custentity_ht_cl_apellidomaterno', apeMat.toUpperCase());
      
      safeSet(cust,'custentity_pe_legal_name',`${body.firstname} ${lastRaw}`);
    }else{
      safeSet(cust,'companyname',body.companyname);
      safeSet(cust,'custentity_pe_legal_name',body.companyname);
    }

    /* Addressbook */
    (body.addresses||[]).forEach((a,idx)=>{
      if(isEmpty(a.custrecord_pe_ubigeo)){
        log.error({ title:`Address sin ubigeo idx ${idx}`, details:a });
        return;
      }
      cust.selectNewLine({ sublistId:'addressbook' });
      cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'label',           value:a.label||'' });
      cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'defaultbilling',  value:toBool(a.defaultbilling) });
      cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'defaultshipping', value:toBool(a.defaultshipping) });

      const sub=cust.getCurrentSublistSubrecord({ sublistId:'addressbook', fieldId:'addressbookaddress' });
      Object.keys(a).forEach(k=>{
        if(isEmpty(a[k])) return;
        try{ if(sub.getField({ fieldId:k })) sub.setValue({ fieldId:k, value:a[k] }); }catch(e){}
      });
      cust.commitLine({ sublistId:'addressbook' });
    });

    /* ---------- Sub-lista Currency: PEN (5) y USD (1) -------- */
    [DEFAULT_CURRENCY, EXTRA_CURRENCY].forEach(cur => {
      cust.selectNewLine({ sublistId:'currency' });
      cust.setCurrentSublistValue({ sublistId:'currency', fieldId:'currency', value:cur });
      cust.commitLine({ sublistId:'currency' });
    });

    cid=cust.save({ enableSourcing:true, ignoreMandatoryFields:false });
    log.audit({ title:'Customer creado', details:`ID ${cid}` });
  }catch(e){
    log.error({ title:'Error guardando Customer', details:{ err:e, body } });
    return { success:false, code:e.name||'ERROR', message:e.message||'Error guardando Customer', data:{ body } };
  }

  /* Teléfonos */
  (body.phones||[]).forEach(p=>{
    try{
      const tel=record.create({ type:PHONE_REC });
      tel.setValue({ fieldId:PHONE_CUSTOMER_FLD,value:cid });
      if(!isEmpty(p.number))
        tel.setValue({ fieldId:'custrecord_ht_campo_txt_telefono',value:p.number });
      const tId=toNumber(p.type); if(tId)
        tel.setValue({ fieldId:'custrecord_ht_campo_list_tipo_telefono',value:tId });
      if(!isEmpty(p.extension))
        tel.setValue({ fieldId:'custrecord_ht_campo_txt_extension',value:p.extension });
      tel.setValue({ fieldId:'custrecord_ht_campo_txt_principal',value:toBool(p.principal) });
      tel.save();
    }catch(e){ log.error({ title:'Error creando Teléfono', details:{ err:e, phone:p } }); }
  });

  /* Correos */
  (body.emails||[]).forEach(e=>{
    try{
      const em=record.create({ type:EMAIL_REC });
      em.setValue({ fieldId:EMAIL_CUSTOMER_FLD,value:cid });
      if(!isEmpty(e.email))
        em.setValue({ fieldId:'custrecord_ht_email_email',value:e.email });
      const eId=toNumber(e.type); if(eId)
        em.setValue({ fieldId:'custrecord_ht_email_tipoemail',value:eId });
      em.setValue({ fieldId:'custrecord_ht_email_emailprincipal',value:toBool(e.principal) });
      em.save();
    }catch(err){ log.error({ title:'Error creando Email', details:{ err:err, email:e } }); }
  });

  /* Contactos */
  (body.contacts||[]).forEach(c=>{
    try{
      const co=record.create({ type:CONTACT_REC });
      co.setValue({ fieldId:CONTACT_CUSTOMER_FLD,value:cid });
      for(const f in c){
        if(isEmpty(c[f])) continue;
        try{ if(co.getField({ fieldId:f })) co.setValue({ fieldId:f, value:c[f] }); }catch(e){}
      }
      co.save();
    }catch(err){ log.error({ title:'Error creando Contacto', details:{ err:err, contact:c } }); }
  });

  /* Payloads y sincronización (con override para USUARIO_INGRESO) */
  const usuarioIngresoOverride = (chosenEmp && chosenEmp.doc) ? chosenEmp.doc : '';
  const payloads=buildPayloads(cid, { usuarioIngresoDoc: usuarioIngresoOverride });
  syncWithApis(payloads);

  return {
    success : true,
    code    : 'OK',
    message : 'Cliente creado con éxito',
    id      : cid,
    data    : payloads.full                            // ficha completa
  };
}

/* ============================================================ *
 *  PAYLOADS & SINCRONIZACIÓN                                   *
 * ============================================================ */
function buildPayloads(cid, opts={}){

  const overrideDoc = (opts && opts.usuarioIngresoDoc)
    ? (opts.usuarioIngresoDoc || '').toString().toUpperCase()
    : '';

  const full   = loadFullCustomer(cid);  // incluye id/internalId
  const cust   = record.load({ type:record.Type.CUSTOMER, id:cid });
  const isPers = cust.getValue('isperson')==='T'||cust.getValue('isperson')===true;
  const doc    = U(cust.getValue('custentity_pe_document_number'));

  /* USUARIO_INGRESO:
     0) Si viene override (del empleado encontrado por email) → úsalo
     1) Si no, tomar empleado de custentity_pe_ht_owner_customers
     2) Luego owner
     3) Luego salesrep
     4) Fallback: usuario actual (nombre en mayúsculas)
  */
  let empDoc = overrideDoc;
  const tryGetEmpDoc = (empId) => {
    try{
      if(!empId) return '';
      const emp = record.load({ type: record.Type.EMPLOYEE, id: empId });
      return U(emp.getValue('custentity_pe_document_number'));
    }catch(e){ return ''; }
  };

  if (!empDoc) {
    let empId = cust.getValue('custentity_pe_ht_owner_customers');
    if (!empId) empId = cust.getValue('owner');
    if (!empId) empId = cust.getValue('salesrep');
    empDoc = tryGetEmpDoc(empId);
  }
  if (!empDoc) empDoc = U(runtime.getCurrentUser().name||'');

  // Separar primer y segundo nombre a partir de firstname (sin usar middlename)
  let primerNombre = '', segundoNombre = '';
  if (isPers) {
    const { first, rest } = splitFirstAndRest(cust.getValue('firstname'));
    primerNombre  = U(first);
    segundoNombre = U(rest); // puede quedar vacío
  }

  const main={
    ID_CLIENTE      : doc,
    PRIMER_NOMBRE   : isPers ? primerNombre : U(cust.getValue('companyname')),
    SEGUNDO_NOMBRE  : isPers ? segundoNombre : '',
    APELLIDO_PATERNO: isPers ? U(cust.getValue('custentity_ht_cl_apellidopaterno')) : '',
    APELLIDO_MATERNO: isPers ? U(cust.getValue('custentity_ht_cl_apellidomaterno')) : '',
    TIPODOCUMENTO   : U(cust.getText('custentity_pe_document_type')),
    USUARIO_INGRESO : empDoc
  };

  /* helpers */
  const fetch=(recType,linkFld)=>
    search.create({
      type:recType,
      filters:[[linkFld,'anyof',cid],'AND',['isinactive','is','F']],
      columns:['internalid']
    }).run().getRange({ start:0, end:1000 })
      .map(r=>record.load({ type:recType, id:r.getValue('internalid') }));

  const contacts=fetch(CONTACT_REC,CONTACT_CUSTOMER_FLD).map(c=>({
    ID_CLIENTE:doc,
    PARENTEZCO:U(c.getText('custrecord_ht_rc_tipodecontacto')||'NO DEFINIDO'),
    NOMBRE    :U((c.getValue('name')||'').split(/\s+/)[0]),
    APELLIDO_PATERNO:U((c.getValue('name')||'').split(/\s+/)[1]||''),
    APELLIDO_MATERNO:U((c.getValue('name')||'').split(/\s+/)[2]||''),
    TELEFONO  :U(c.getValue('custrecord_ht_rc_numerotelefonoprincipal'))
  }));

  const dirs=[];
  /* addressbook */
  const n=cust.getLineCount({ sublistId:'addressbook' })||0;
  for(let i=0;i<n;i++){
    const sub=cust.getSublistSubrecord({ sublistId:'addressbook', fieldId:'addressbookaddress', line:i });
    dirs.push({
      ID_CLIENTE   : doc,
      TIPO_DIRECCION:'DIRECCION',
      DIRECCION    : U(sub.getValue('addr1')),
      UBIGEO       : U(sub.getValue('custrecord_pe_cod_ubigeo')||sub.getText('custrecord_pe_cod_ubigeo')),
      USUARIO_INGRESO: empDoc
    });
  }
  /* phones */
  fetch(PHONE_REC,PHONE_CUSTOMER_FLD).forEach(p=>dirs.push({
    ID_CLIENTE:doc,TIPO_DIRECCION:'TELEFONO',DIRECCION:U(p.getValue('custrecord_ht_campo_txt_telefono')),USUARIO_INGRESO: empDoc
  }));
  /* emails */
  fetch(EMAIL_REC,EMAIL_CUSTOMER_FLD).forEach(e=>{
    let tipo=U(e.getText('custrecord_ht_email_tipoemail')||'E-MAIL');
    if(!/^E-MAIL/.test(tipo)) tipo=`E-MAIL ${tipo}`.trim();
    dirs.push({ ID_CLIENTE:doc, TIPO_DIRECCION:tipo, DIRECCION:U(e.getValue('custrecord_ht_email_email')),USUARIO_INGRESO: empDoc });
  });

  return { main, contacts, dirs, full };
}

/* ---------------- Helpers de APPEND -------------------------- */
function countLinked(recType, linkFld, customerId){
  return search.create({
    type:recType,
    filters:[[linkFld,'anyof',customerId],'AND',['isinactive','is','F']],
    columns:[search.createColumn({ name:'internalid', summary:search.Summary.COUNT })]
  }).run().getRange({ start:0, end:1 }).reduce(function(acc,r){
    return Number(r.getValue({ name:'internalid', summary:search.Summary.COUNT }))||0;
  },0);
}

function appendSubrecords(body){
  var cid = body.customerId;
  if(!cid) return { success:false, code:'MISSING_FIELD', message:'Falta customerId' };

  try{
    // Teléfonos: solo si no existen
    if (Array.isArray(body.phones) && body.phones.length) {
      var existing = countLinked(PHONE_REC, PHONE_CUSTOMER_FLD, cid);
      if (existing === 0) {
        body.phones.forEach(function(p){
          var tel=record.create({ type:PHONE_REC });
          tel.setValue({ fieldId:PHONE_CUSTOMER_FLD,value:cid });
          if(!isEmpty(p.number))
            tel.setValue({ fieldId:'custrecord_ht_campo_txt_telefono',value:p.number });
          var tId=toNumber(p.type); if(tId)
            tel.setValue({ fieldId:'custrecord_ht_campo_list_tipo_telefono',value:tId });
          if(!isEmpty(p.extension))
            tel.setValue({ fieldId:'custrecord_ht_campo_txt_extension',value:p.extension });
          tel.setValue({ fieldId:'custrecord_ht_campo_txt_principal',value:toBool(p.principal) });
          tel.save();
        });
      }
    }

    // Emails: solo si no existen
    if (Array.isArray(body.emails) && body.emails.length) {
      var existingE = countLinked(EMAIL_REC, EMAIL_CUSTOMER_FLD, cid);
      if (existingE === 0) {
        body.emails.forEach(function(e){
          var em=record.create({ type:EMAIL_REC });
          em.setValue({ fieldId:EMAIL_CUSTOMER_FLD,value:cid });
          if(!isEmpty(e.email))
            em.setValue({ fieldId:'custrecord_ht_email_email',value:e.email });
          var eId=toNumber(e.type); if(eId)
            em.setValue({ fieldId:'custrecord_ht_email_tipoemail',value:eId });
          em.setValue({ fieldId:'custrecord_ht_email_emailprincipal',value:toBool(e.principal) });
          em.save();
        });
      }
    }

    // Contactos: solo si no existen
    if (Array.isArray(body.contacts) && body.contacts.length) {
      var existingC = countLinked(CONTACT_REC, CONTACT_CUSTOMER_FLD, cid);
      if (existingC === 0) {
        body.contacts.forEach(function(c){
          var co=record.create({ type:CONTACT_REC });
          co.setValue({ fieldId:CONTACT_CUSTOMER_FLD,value:cid });
          for(var f in c){
            if(isEmpty(c[f])) continue;
            try{ if(co.getField({ fieldId:f })) co.setValue({ fieldId:f, value:c[f] }); }catch(e){}
          }
          co.save();
        });
      }
    }

    // Direcciones (addressbook): solo si no existe ninguna
    if (Array.isArray(body.addresses) && body.addresses.length) {
      var cust = record.load({ type:record.Type.CUSTOMER, id:cid, isDynamic:true });
      var lines = cust.getLineCount({ sublistId:'addressbook' })||0;
      if (lines === 0) {
        body.addresses.forEach(function(a){
          if(isEmpty(a.custrecord_pe_ubigeo)) return;
          cust.selectNewLine({ sublistId:'addressbook' });
          cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'label',           value:a.label||'' });
          cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'defaultbilling',  value:toBool(a.defaultbilling) });
          cust.setCurrentSublistValue({ sublistId:'addressbook', fieldId:'defaultshipping', value:toBool(a.defaultshipping) });
          var sub=cust.getCurrentSublistSubrecord({ sublistId:'addressbook', fieldId:'addressbookaddress' });
          Object.keys(a).forEach(function(k){
            if(isEmpty(a[k])) return;
            try{ if(sub.getField({ fieldId:k })) sub.setValue({ fieldId:k, value:a[k] }); }catch(e){}
          });
          cust.commitLine({ sublistId:'addressbook' });
        });
        cust.save({ enableSourcing:true, ignoreMandatoryFields:false });
      }
    }

    return {
      success:true,
      code:'OK',
      message:'Anexos guardados',
      id: cid,
      data: loadFullCustomer(cid)
    };

  }catch(e){
    log.error({ title:'appendSubrecords', details:e });
    return { success:false, code:e.name||'ERROR', message:e.message||'Error anexando registros', id:cid };
  }
}

/* ---------------- POST helper ------------------------------- */
function postHttp(url, body){
  if (TEST_MODE){
    log.audit({ title:`TEST ▶ ${url}`, details:body });
    // En test devolvemos un response “vacío” pero válido
    return { code: 200, body: '', json: null };
  }
  const r = https.post({
    url,
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });

  let json = null;
  try { json = JSON.parse(r.body || '{}'); } catch(e) { /* body no era JSON */ }

  log.audit({ title:`Resp ${url}`, details:{ code:r.code, body:r.body } });
  return { code: r.code, body: r.body, json };
}

/* ---------------- Intérprete de “EXISTE CLIENTE …” ---------- */
function apiClienteDiceQueExiste(json){
  if (!json || typeof json !== 'object') return false;
  const status = (json.status || json.Status || '').toString().toLowerCase();
  const resp   = (json.respuesta || json.message || '').toString().toUpperCase();
  // Ejemplo esperado: { "status":"success", "respuesta":"EXISTE CLIENTE 47146484" }
  return (status === 'success' && /EXISTE CLIENTE/.test(resp));
}

/* ---------------- SINCRONIZACIÓN (actualizado) --------------- */
function syncWithApis({ main, contacts, dirs }){
  log.audit({ title:'Payload MAIN', details: main });

  // 1) Enviar primero a API_CLIENTE y decidir en base a su respuesta
  const rMain = postHttp(API_CLIENTE, main);

  // 2) Si el servicio indica que el cliente YA EXISTE, no mandamos contactos ni direcciones
  if (apiClienteDiceQueExiste(rMain.json)){
    log.audit({
      title: 'API_CLIENTE indica EXISTE CLIENTE — se omiten API_PARENTES y API_DIRECCION',
      details: rMain.json
    });
    return; // <- corte aquí
  }

  // 3) Si NO existe (o no vino esa señal), seguimos con los demás
  if (contacts.length){
    log.audit({ title:`Payload CONTACTS (${contacts.length})`, details: contacts });
    postHttp(API_PARENTES, contacts);
  }
  if (dirs.length){
    log.audit({ title:`Payload DIRS (${dirs.length})`, details: dirs });
    postHttp(API_DIRECCION, dirs);
  }
}
/* ============================================================ *
 *  HANDLER POST                                                *
 * ============================================================ */
function post(body){

  log.audit({ title:'RESTlet body recibido', details:body });

  try{
    // -------- APPEND a cliente existente --------------
    if (body && body.op === 'append' && body.customerId) {
      return appendSubrecords(body);
    }

    /* Consulta rápida ---------------------------------- */
    if(body && Object.keys(body).length===1 && body.documentNumber){
      const id=findCustomerId(body.documentNumber);
      if(!id) return { success:false, code:'NOT_FOUND', message:`Cliente no existe: ${body.documentNumber}` };
      return { success:true, code:'OK', message:'Cliente encontrado', id, data:loadFullCustomer(id) };
    }

    /* Alta --------------------------------------------- */
    return createCustomer(body||{});
  }catch(e){
    log.error({ title:'RESTlet error', details:e });
    return { success:false, code:e.name||'ERROR', message:e.message||'Error inesperado', data:{ body } };
  }
}

/* ============================================================ */
return { post };

});
