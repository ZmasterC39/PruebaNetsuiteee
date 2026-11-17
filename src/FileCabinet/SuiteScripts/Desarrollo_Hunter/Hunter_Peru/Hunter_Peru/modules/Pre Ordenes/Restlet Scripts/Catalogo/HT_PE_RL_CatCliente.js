/**
 *  @NApiVersion 2.1
 *  @NScriptType Restlet
 *  @NModuleScope SameAccount
 *
 *  Catálogos:
 *    – PE Type of Person           (customrecord_pe1_type_of_person)
 *    – PE Document Type            (customrecord_pe_document_type)
 *    – HT Tipo de Contacto         (customlist_ht_ct_tipodecontacto)
 *    – HT Registro Tipo Teléfono   (customrecordht_registro_tipo_telefono)
 *    – HT Tipo de Email            (customlist_ht_email_tipoemail)
 *    – PE Ubigeos                  (customrecord_pe_ubigeo)
 */
define(['N/search','N/error','N/log'], function(search, error, log){
  /* -------- tabla de catálogos: alias → search.type --------------- */
  const CATALOGS = {
    personTypes   : 'customrecord_pe1_type_of_person',
    documentTypes : 'customrecord_pe_document_type',
    contactTypes  : 'customlist_ht_ct_tipodecontacto',
    phoneTypes    : 'customrecordht_registro_tipo_telefono',
    emailTypes    : 'customlist_ht_email_tipoemail',
    ubigeos       : 'customrecord_pe_ubigeo'  // ← NUEVO
  };
  
  /* ---------------------------------------------------------------- */
  function fetch(typeId){
    const data = [];
    
    // Configuración especial para ubigeos
    if (typeId === 'customrecord_pe_ubigeo') {
      search.create({
        type   : typeId,
        filters: [['isinactive','is','F']],
        columns: [
          'internalid', 
          'name',
          'custrecord_pe_codigo'  // código de ubigeo
        ]
      })
      .run()
      .each(r => {
        const ubigeoName = r.getValue('name');
        const parts = ubigeoName.split(':').map(p => p.trim());
        
        data.push({ 
          id: r.getValue('internalid'), 
          name: ubigeoName,
          codigo: r.getValue('custrecord_pe_codigo'),
          departamento: parts[0] || '',
          provincia: parts[1] || '',
          distrito: parts[2] || ''
        });
        return true;
      });
    } else {


    let filters = [['isinactive','is','F']];
      
    if (typeId === 'customrecord_pe_document_type') {
      filters = [
        ['isinactive','is','F'],
        'AND',
        ['internalid','anyof',['3','5','2','4']]
      ];
    }
       if (typeId === 'customlist_ht_email_tipoemail') {
      filters = [
        ['isinactive','is','F'],
        'AND',
        ['internalid','anyof',['1','111','112']]
      ];
    }

      // Configuración estándar para otros catálogos
      search.create({
        type   : typeId,
        filters: filters,
        columns: ['internalid', 'name']
      })
      .run()
      .each(r => {
        data.push({ 
          id: r.getValue('internalid'), 
          name: r.getValue('name') 
        });
        return true;
      });
    }
    
    return data;
  }
  
  /* ------------------------- GET ---------------------------------- */
  function get(params){
    /* ¿quiere un catálogo específico? ------------------------------ */
    if (params && params.list){
      const key = params.list;
      const typeId = CATALOGS[key];
      if(!typeId)
        throw error.create({ name:'INVALID_LIST', message:'Catálogo no soportado: '+key });
      return { [key]: fetch(typeId) };
    }
    /* …o todos los catálogos a la vez ------------------------------ */
    const out = {};
    Object.keys(CATALOGS).forEach(k => out[k] = fetch(CATALOGS[k]));
    return out;
  }
  
  /* ------------------------- POST (no usado) ---------------------- */
  function post(){ return { success:false, message:'Sólo GET soportado'}; }
  return { get:get, post:post };
});