/**
 * ========================================================================
 * RESTlet: Crear Orden de Servicio (Sales Order) - Flujo Completo
 * ========================================================================
 * Replica la lógica completa de Pre-Orden → OS pero en un solo paso:
 *   1. Valida/crea Cliente (con sub-registros: phones, emails, contacts, addresses)
 *   2. Valida/crea Bien/Vehículo (con validaciones de duplicados)
 *   3. Aplica validaciones obligatorias para OS
 *   4. Crea Sales Order con configuración completa
 * 
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 * 
 * Versión: 1.0.0 (2025-01-13)
 * ========================================================================
 */

define([
  'N/record',
  'N/search',
  'N/error',
  'N/log',
  'N/runtime'
], function(record, search, error, log, runtime) {

  /* ====================================================================
   * CONSTANTES Y CONFIGURACIÓN
   * ==================================================================== */
  
  const CONFIG = {
    // NetSuite
    DEFAULT_SUBSIDIARY: 3,          // PE
    DEFAULT_STATUS: 13,             // Cliente - Activo
    DEFAULT_CURRENCY: 1,            // USD
    EXTRA_CURRENCY: 5,              // PEN
    DEFAULT_BROKER: 19909,
    
    // Custom Records
    PHONE_REC: 'customrecord_ht_registro_telefono',
    PHONE_CUSTOMER_FLD: 'custrecord_ht_campo_lbl_entidad_telefono',
    EMAIL_REC: 'customrecord_ht_record_correoelectronico',
    EMAIL_CUSTOMER_FLD: 'custrecord_ht_ce_enlace',
    CONTACT_REC: 'customrecord_ht_rc_registrocontactos',
    CONTACT_CUSTOMER_FLD: 'custrecord_ht_rc_empresa',
    
    // Mapeo Oficina → Departamento
    OFFICE_TO_DEPT: {
      '415': 299, // MIRAFLORES
      '416': 299, // SURQUILLO
      '417': 331, // TRUJILLO
      '418': 315, // PIURA
      '419': 283  // AREQUIPA
    }
  };

  /* ====================================================================
   * UTILIDADES GENERALES
   * ==================================================================== */
  
  const Utils = {
    // Conversión segura a número
    nvlNum: (v, d = 0) => (isFinite(parseFloat(v)) ? parseFloat(v) : d),
    
    // Redondeo a 2 decimales
    round2: (x) => Math.round((x + Number.EPSILON) * 100) / 100,
    
    // Convertir tasa a decimal (18% → 0.18)
    rate01: function(r) {
      r = this.nvlNum(r, 0);
      return (r > 1 ? r / 100 : r);
    },
    
    // Normalizar texto
    normalize: (s) => (s || '').toString().trim().toUpperCase(),
    
    // Verificar si valor está vacío
    isEmpty: (v) => v === null || v === undefined || v === '' || 
                    (typeof v === 'string' && v.trim() === ''),
    
    // Convertir a booleano
    toBool: (v) => (v === true || v === 'T' || v === 1 || 
                    (typeof v === 'string' && v.toLowerCase() === 'true')),
    
    // Log estructurado
    logAudit: function(title, data) {
      log.audit({
        title: `[OS-API] ${title}`,
        details: typeof data === 'object' ? JSON.stringify(data) : data
      });
    },
    
    logError: function(title, error) {
      log.error({
        title: `[OS-API ERROR] ${title}`,
        details: error.message || String(error)
      });
    },
    
    // Dividir nombre en partes
    splitName: function(fullName) {
      const parts = (fullName || '').toString().trim().split(/\s+/);
      return {
        first: parts.shift() || '',
        rest: parts.join(' ') || ''
      };
    },
    
    // Dividir apellidos (último elemento = materno, resto = paterno)
    splitLastName: function(fullLastName) {
      const parts = (fullLastName || '').toString().trim().split(/\s+/);
      const materno = parts.pop() || '';
      const paterno = parts.join(' ') || '';
      return { paterno, materno };
    }
  };

  /* ====================================================================
   * VALIDACIONES
   * ==================================================================== */
  
  const Validator = {
    // Email RFC 5322
    isValidEmail: (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    },
    
    // Celular peruano (9 dígitos)
    isValidCellphone: (phone) => {
      const cleaned = (phone || '').replace(/\s+/g, '');
      return /^\d{9}$/.test(cleaned);
    },
    
    // Validar campos obligatorios
    requireFields: function(obj, fields, context = '') {
      const missing = [];
      fields.forEach(f => {
        if (Utils.isEmpty(obj[f]) && obj[f] !== 0) {
          missing.push(f);
        }
      });
      
      if (missing.length > 0) {
        throw error.create({
          name: 'MISSING_REQUIRED_FIELDS',
          message: `${context ? context + ': ' : ''}Faltan campos obligatorios: ${missing.join(', ')}`
        });
      }
    },
    
    // Validar teléfonos (Cliente)
    validatePhones: function(phones) {
      if (!Array.isArray(phones) || phones.length === 0) {
        throw error.create({
          name: 'INVALID_PHONES',
          message: 'Debe incluir al menos 1 teléfono'
        });
      }
      
      const cellphones = [];
      let principalCount = 0;
      
      phones.forEach((phone, idx) => {
        const number = (phone.number || '').replace(/\s+/g, '');
        if (!number) {
          throw error.create({
            name: 'INVALID_PHONE',
            message: `Teléfono ${idx + 1}: número es obligatorio`
          });
        }
        
        // Validar celulares (9 dígitos únicos)
        const type = (phone.typeName || phone.type || '').toLowerCase();
        if (type.includes('celular') || type.includes('móvil')) {
          if (!this.isValidCellphone(number)) {
            throw error.create({
              name: 'INVALID_CELLPHONE',
              message: `Teléfono ${idx + 1}: celular debe tener 9 dígitos`
            });
          }
          if (cellphones.includes(number)) {
            throw error.create({
              name: 'DUPLICATE_CELLPHONE',
              message: `Teléfono ${idx + 1}: celular ${number} duplicado`
            });
          }
          cellphones.push(number);
        }
        
        if (phone.principal) principalCount++;
      });
      
      if (principalCount !== 1) {
        throw error.create({
          name: 'INVALID_PRINCIPAL_PHONE',
          message: 'Debe haber exactamente 1 teléfono principal'
        });
      }
    },
    
    // Validar emails (Cliente)
    validateEmails: function(emails) {
      if (!Array.isArray(emails) || emails.length !== 3) {
        throw error.create({
          name: 'INVALID_EMAILS',
          message: 'Debe incluir exactamente 3 emails'
        });
      }
      
      const addresses = [];
      const types = [];
      
      emails.forEach((e, idx) => {
        const addr = (e.email || '').toLowerCase().trim();
        if (!this.isValidEmail(addr)) {
          throw error.create({
            name: 'INVALID_EMAIL_FORMAT',
            message: `Email ${idx + 1}: formato inválido`
          });
        }
        
        addresses.push(addr);
        
        const type = e.typeName || e.type || '';
        if (types.includes(type)) {
          throw error.create({
            name: 'DUPLICATE_EMAIL_TYPE',
            message: `Email ${idx + 1}: tipo "${type}" duplicado`
          });
        }
        types.push(type);
      });
    },
    
    // Validar direcciones (Cliente)
    validateAddresses: function(addresses) {
      if (!Array.isArray(addresses) || addresses.length === 0) {
        throw error.create({
          name: 'INVALID_ADDRESSES',
          message: 'Debe incluir al menos 1 dirección'
        });
      }
      
      addresses.forEach((addr, idx) => {
        if (Utils.isEmpty(addr.addr1)) {
          throw error.create({
            name: 'INVALID_ADDRESS',
            message: `Dirección ${idx + 1}: falta dirección (addr1)`
          });
        }
        if (Utils.isEmpty(addr.addressee)) {
          throw error.create({
            name: 'INVALID_ADDRESSEE',
            message: `Dirección ${idx + 1}: falta destinatario`
          });
        }
        if (Utils.isEmpty(addr.custrecord_pe_ubigeo)) {
          throw error.create({
            name: 'INVALID_UBIGEO',
            message: `Dirección ${idx + 1}: ubigeo es obligatorio`
          });
        }
      });
    }
  };

  /* ====================================================================
   * BÚSQUEDAS EN NETSUITE
   * ==================================================================== */
  
  const Searcher = {
    // Buscar cliente por documento
    findCustomerByDoc: function(docNumber) {
      if (Utils.isEmpty(docNumber)) return null;
      
      let customerId = null;
      search.create({
        type: record.Type.CUSTOMER,
        filters: [['custentity_pe_document_number', 'is', docNumber]],
        columns: ['internalid']
      }).run().each(function(result) {
        customerId = result.getValue('internalid');
        return false; // stop
      });
      
      return customerId;
    },
    
    // Buscar bien por placa/motor/chasis
    findBienByIdentifiers: function(placa, motor, chasis) {
      const filters = [];
      let hasFilters = false;
      
      if (!Utils.isEmpty(placa) && placa.toUpperCase() !== 'S/P') {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_placa', 'is', placa]);
        hasFilters = true;
      }
      
      if (!Utils.isEmpty(motor)) {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_motor', 'is', motor]);
        hasFilters = true;
      }
      
      if (!Utils.isEmpty(chasis)) {
        if (hasFilters) filters.push('OR');
        filters.push(['custrecord_ht_bien_chasis', 'is', chasis]);
        hasFilters = true;
      }
      
      if (!hasFilters) return null;
      
      let bienId = null;
      search.create({
        type: 'customrecord_ht_record_bienes',
        filters: filters,
        columns: ['internalid']
      }).run().each(function(result) {
        bienId = result.getValue('internalid');
        return false;
      });
      
      return bienId;
    },
    
    // Verificar duplicado de identificador de bien
    existsBienField: function(fieldId, value) {
      if (Utils.isEmpty(value)) return false;
      
      const val = Utils.normalize(value);
      const variants = [val];
      if (val !== val.toUpperCase()) variants.push(val.toUpperCase());
      
      const filters = [];
      variants.forEach((v, i) => {
        if (i > 0) filters.push('OR');
        filters.push([fieldId, 'is', v]);
      });
      
      const results = search.create({
        type: 'customrecord_ht_record_bienes',
        filters: filters,
        columns: ['internalid']
      }).run().getRange({ start: 0, end: 1 });
      
      return !!(results && results.length);
    },
    
    // Buscar empleado por email
    findEmployeeByEmail: function(email) {
      if (Utils.isEmpty(email)) return null;
      
      const em = email.toString().trim().toLowerCase();
      const results = search.create({
        type: search.Type.EMPLOYEE,
        filters: [
          ['email', 'is', em], 'AND',
          ['isinactive', 'is', 'F']
        ],
        columns: ['internalid', 'giveaccess']
      }).run().getRange({ start: 0, end: 10 });
      
      if (!results || !results.length) return null;
      
      // Priorizar empleados con acceso
      let selected = results[0];
      for (let i = 0; i < results.length; i++) {
        const ga = results[i].getValue('giveaccess');
        if (ga === true || ga === 'T') {
          selected = results[i];
          break;
        }
      }
      
      return selected.getValue('internalid');
    }
  };

  /* ====================================================================
   * PROCESAMIENTO DE CLIENTE
   * ==================================================================== */
  
  const ClienteProcessor = {
    // Procesar cliente: buscar o crear
    process: function(clienteData) {
      if (!clienteData) {
        throw error.create({
          name: 'MISSING_CLIENTE',
          message: 'Debe proporcionar datos del cliente'
        });
      }
      
      Utils.logAudit('Procesando Cliente', clienteData);
      
      // ¿Existe el cliente?
      const docNumber = clienteData.documentNumber || clienteData.custentity_pe_document_number;
      let customerId = null;
      
      if (docNumber) {
        customerId = Searcher.findCustomerByDoc(docNumber);
      }
      
      if (customerId) {
        Utils.logAudit('Cliente existente encontrado', { customerId, docNumber });
        return customerId;
      }
      
      // Crear nuevo cliente
      Utils.logAudit('Creando nuevo cliente', docNumber);
      return this.create(clienteData);
    },
    
    // Crear cliente completo
    create: function(data) {
      // Validaciones obligatorias
      Validator.requireFields(data, [
        'documentNumber',
        'documentType',
        'personType'
      ], 'Cliente');
      
      const isPerson = (data.isindividual || '').toLowerCase() === 'individual';
      
      if (isPerson) {
        Validator.requireFields(data, ['firstname', 'lastname'], 'Cliente (Persona)');
      } else {
        Validator.requireFields(data, ['companyname'], 'Cliente (Empresa)');
      }
      
      // Validar sub-registros
      if (data.phones) Validator.validatePhones(data.phones);
      if (data.emails) Validator.validateEmails(data.emails);
      if (data.addresses) Validator.validateAddresses(data.addresses);
      
      // Buscar empleado para Owner
      let ownerId = null;
      if (data.ownerId) {
        ownerId = data.ownerId;
      } else if (data.ownerEmail || data.owner_email) {
        const email = data.ownerEmail || data.owner_email;
        ownerId = Searcher.findEmployeeByEmail(email);
      }
      
      // Crear Customer
      const cust = record.create({
        type: record.Type.CUSTOMER,
        isDynamic: true
      });
      
      // Campos básicos
      cust.setValue({ fieldId: 'subsidiary', value: CONFIG.DEFAULT_SUBSIDIARY });
      cust.setValue({ fieldId: 'currency', value: CONFIG.DEFAULT_CURRENCY });
      cust.setValue({ fieldId: 'entitystatus', value: CONFIG.DEFAULT_STATUS });
      
      cust.setValue({ 
        fieldId: 'custentity_pe_document_type', 
        value: Number(data.documentType) || data.documentType 
      });
      cust.setValue({ 
        fieldId: 'custentity_pe_document_number', 
        value: data.documentNumber 
      });
      cust.setValue({ 
        fieldId: 'custentity_pe_type_of_person', 
        value: Number(data.personType) || data.personType 
      });
      cust.setValue({ fieldId: 'vatregnumber', value: data.documentNumber });
      cust.setValue({ fieldId: 'isindividual', value: isPerson ? 'Individual' : 'Empresa' });
      cust.setValue({ fieldId: 'isperson', value: isPerson ? 'T' : 'F' });
      
      if (data.email) cust.setValue({ fieldId: 'email', value: data.email });
      if (data.phone) cust.setValue({ fieldId: 'phone', value: data.phone });
      
      // Owner (pre-save)
      if (ownerId) {
        try {
          cust.setValue({ fieldId: 'custentity_pe_ht_owner_customers', value: ownerId });
          cust.setValue({ fieldId: 'owner', value: ownerId });
          try {
            cust.setValue({ fieldId: 'salesrep', value: ownerId });
          } catch (e) {
            Utils.logError('No se pudo setear salesrep', e);
          }
        } catch (e) {
          Utils.logError('No se pudo setear owner', e);
        }
      }
      
      // Nombres
      if (isPerson) {
        const firstname = data.firstname || '';
        const lastname = data.lastname || '';
        
        const { first: primerNombre, rest: segundoNombre } = Utils.splitName(firstname);
        const { paterno, materno } = Utils.splitLastName(lastname);
        
        cust.setValue({ fieldId: 'firstname', value: firstname });
        cust.setValue({ fieldId: 'lastname', value: lastname });
        cust.setValue({ fieldId: 'custentity_ht_cl_primernombre', value: Utils.normalize(primerNombre) });
        cust.setValue({ fieldId: 'custentity_ht_cl_segundonombre', value: Utils.normalize(segundoNombre) });
        cust.setValue({ fieldId: 'custentity_ht_cl_apellidopaterno', value: Utils.normalize(paterno) });
        cust.setValue({ fieldId: 'custentity_ht_cl_apellidomaterno', value: Utils.normalize(materno) });
        cust.setValue({ fieldId: 'custentity_pe_legal_name', value: `${firstname} ${lastname}` });
      } else {
        const companyname = data.companyname || '';
        cust.setValue({ fieldId: 'companyname', value: companyname });
        cust.setValue({ fieldId: 'custentity_pe_legal_name', value: companyname });
      }
      
      // Addressbook
      if (Array.isArray(data.addresses)) {
        data.addresses.forEach(addr => {
          cust.selectNewLine({ sublistId: 'addressbook' });
          cust.setCurrentSublistValue({ 
            sublistId: 'addressbook', 
            fieldId: 'label', 
            value: addr.label || 'Principal' 
          });
          cust.setCurrentSublistValue({ 
            sublistId: 'addressbook', 
            fieldId: 'defaultbilling', 
            value: Utils.toBool(addr.defaultbilling) 
          });
          cust.setCurrentSublistValue({ 
            sublistId: 'addressbook', 
            fieldId: 'defaultshipping', 
            value: Utils.toBool(addr.defaultshipping) 
          });
          
          const sub = cust.getCurrentSublistSubrecord({ 
            sublistId: 'addressbook', 
            fieldId: 'addressbookaddress' 
          });
          
          Object.keys(addr).forEach(k => {
            if (Utils.isEmpty(addr[k])) return;
            try {
              if (sub.getField({ fieldId: k })) {
                sub.setValue({ fieldId: k, value: addr[k] });
              }
            } catch (e) {
              // Ignorar campos no válidos
            }
          });
          
          cust.commitLine({ sublistId: 'addressbook' });
        });
      }
      
      // Currency sub-lista (USD + PEN)
      [CONFIG.DEFAULT_CURRENCY, CONFIG.EXTRA_CURRENCY].forEach(cur => {
        cust.selectNewLine({ sublistId: 'currency' });
        cust.setCurrentSublistValue({ sublistId: 'currency', fieldId: 'currency', value: cur });
        cust.commitLine({ sublistId: 'currency' });
      });
      
      const customerId = cust.save({ 
        enableSourcing: true, 
        ignoreMandatoryFields: false 
      });
      
      Utils.logAudit('Cliente creado', { customerId });
      
      // Sub-registros: Teléfonos
      if (Array.isArray(data.phones)) {
        data.phones.forEach(phone => {
          try {
            const tel = record.create({ type: CONFIG.PHONE_REC });
            tel.setValue({ fieldId: CONFIG.PHONE_CUSTOMER_FLD, value: customerId });
            if (phone.number) {
              tel.setValue({ 
                fieldId: 'custrecord_ht_campo_txt_telefono', 
                value: phone.number 
              });
            }
            if (phone.type) {
              tel.setValue({ 
                fieldId: 'custrecord_ht_campo_list_tipo_telefono', 
                value: Number(phone.type) || phone.type 
              });
            }
            if (phone.extension) {
              tel.setValue({ 
                fieldId: 'custrecord_ht_campo_txt_extension', 
                value: phone.extension 
              });
            }
            tel.setValue({ 
              fieldId: 'custrecord_ht_campo_txt_principal', 
              value: Utils.toBool(phone.principal) 
            });
            tel.save();
          } catch (e) {
            Utils.logError('Error creando teléfono', e);
          }
        });
      }
      
      // Sub-registros: Emails
      if (Array.isArray(data.emails)) {
        data.emails.forEach(em => {
          try {
            const email = record.create({ type: CONFIG.EMAIL_REC });
            email.setValue({ fieldId: CONFIG.EMAIL_CUSTOMER_FLD, value: customerId });
            if (em.email) {
              email.setValue({ 
                fieldId: 'custrecord_ht_email_email', 
                value: em.email 
              });
            }
            if (em.type) {
              email.setValue({ 
                fieldId: 'custrecord_ht_email_tipoemail', 
                value: Number(em.type) || em.type 
              });
            }
            email.setValue({ 
              fieldId: 'custrecord_ht_email_emailprincipal', 
              value: Utils.toBool(em.principal) 
            });
            email.save();
          } catch (e) {
            Utils.logError('Error creando email', e);
          }
        });
      }
      
      // Sub-registros: Contactos
      if (Array.isArray(data.contacts)) {
        data.contacts.forEach(c => {
          try {
            const contact = record.create({ type: CONFIG.CONTACT_REC });
            contact.setValue({ fieldId: CONFIG.CONTACT_CUSTOMER_FLD, value: customerId });
            
            Object.keys(c).forEach(f => {
              if (Utils.isEmpty(c[f])) return;
              try {
                if (contact.getField({ fieldId: f })) {
                  contact.setValue({ fieldId: f, value: c[f] });
                }
              } catch (e) {
                // Ignorar
              }
            });
            
            contact.save();
          } catch (e) {
            Utils.logError('Error creando contacto', e);
          }
        });
      }
      
      return customerId;
    }
  };

  /* ====================================================================
   * PROCESAMIENTO DE BIEN/VEHÍCULO
   * ==================================================================== */
  
  const BienProcessor = {
    // Procesar bien: buscar o crear
    process: function(bienData, customerId) {
      if (!bienData) {
        throw error.create({
          name: 'MISSING_BIEN',
          message: 'Debe proporcionar datos del bien/vehículo'
        });
      }
      
      Utils.logAudit('Procesando Bien', bienData);
      
      // ¿Existe el bien?
      const placa = bienData.custrecord_ht_bien_placa || bienData.placa;
      const motor = bienData.custrecord_ht_bien_motor || bienData.motor;
      const chasis = bienData.custrecord_ht_bien_chasis || bienData.chasis;
      
      let bienId = null;
      if (placa || motor || chasis) {
        bienId = Searcher.findBienByIdentifiers(placa, motor, chasis);
      }
      
      if (bienId) {
        Utils.logAudit('Bien existente encontrado', { 
          bienId, 
          placa, 
          motor, 
          chasis 
        });
        return bienId;
      }
      
      // Crear nuevo bien
      Utils.logAudit('Creando nuevo bien', { placa, motor, chasis });
      return this.create(bienData, customerId);
    },
    
    // Validar duplicados antes de crear
    validateDuplicates: function(placa, motor, chasis) {
      const errors = [];
      
      if (placa && placa.toUpperCase() !== 'S/P') {
        if (Searcher.existsBienField('custrecord_ht_bien_placa', placa)) {
          errors.push({ field: 'placa', value: placa });
        }
      }
      
      if (motor) {
        if (Searcher.existsBienField('custrecord_ht_bien_motor', motor)) {
          errors.push({ field: 'motor', value: motor });
        }
      }
      
      if (chasis) {
        if (Searcher.existsBienField('custrecord_ht_bien_chasis', chasis)) {
          errors.push({ field: 'chasis', value: chasis });
        }
      }
      
      if (errors.length > 0) {
        const details = errors.map(e => `${e.field}=${e.value}`).join(', ');
        throw error.create({
          name: 'DUPLICATE_BIEN',
          message: `Bien duplicado: ${details}`,
          notifyOff: true
        });
      }
    },
    
    // Crear bien/vehículo completo
    create: function(data, customerId) {
      // Validaciones obligatorias
      Validator.requireFields(data, [
        'custrecord_ht_bien_motor',
        'custrecord_ht_bien_chasis',
        'custrecord_ht_bien_oficina',
        'custrecord_ht_bien_tipobien',
        'custrecord_ht_bien_tipoterrestre',
        'custrecord_ht_bien_marca',
        'custrecord_ht_bien_modelo',
        'custrecord_ht_bien_tipo',
        'custrecord_ht_bien_colorcarseg'
      ], 'Bien');
      
      // Normalizar identificadores
      const placa = Utils.normalize(
        data.custrecord_ht_bien_placa || data.placa || ''
      );
      const motor = Utils.normalize(
        data.custrecord_ht_bien_motor || data.motor || ''
      );
      const chasis = Utils.normalize(
        data.custrecord_ht_bien_chasis || data.chasis || ''
      );
      
      // Validar duplicados
      this.validateDuplicates(placa, motor, chasis);
      
      // Buscar empleado para Owner
      let ownerId = null;
      if (data.ownerId) {
        ownerId = data.ownerId;
      } else if (data.ownerEmail || data.owner_email) {
        const email = data.ownerEmail || data.owner_email;
        ownerId = Searcher.findEmployeeByEmail(email);
      }
      
      // Crear Bien
      const bien = record.create({
        type: 'customrecord_ht_record_bienes',
        isDynamic: true
      });
      
      // Propietario
      bien.setValue({ 
        fieldId: 'custrecord_ht_bien_propietario', 
        value: customerId 
      });
      
      // Identificadores
      bien.setValue({ fieldId: 'custrecord_ht_bien_placa', value: placa });
      bien.setValue({ fieldId: 'custrecord_ht_bien_motor', value: motor });
      bien.setValue({ fieldId: 'custrecord_ht_bien_chasis', value: chasis });
      
      // Construir altname: "COD PLC.:xxx MOT.:yyy CHA.:zzz"
      const altNameParts = [];
      if (data.custrecord_ht_bien_codsysh) {
        altNameParts.push(data.custrecord_ht_bien_codsysh);
      }
      if (placa) altNameParts.push('PLC.:' + placa);
      if (motor) altNameParts.push('MOT.:' + motor);
      if (chasis) altNameParts.push('CHA.:' + chasis);
      bien.setValue({ fieldId: 'altname', value: altNameParts.join(' ') });
      
      // Campos obligatorios y opcionales
      const bienFields = [
        'custrecord_ht_bien_codsysh',
        'custrecord_ht_bien_ano',
        'custrecord_ht_bien_clave',
        'custrecord_ht_bien_avaluo',
        'custrecord_ht_bien_oficina',
        'custrecord_ht_bien_tipobien',
        'custrecord_ht_bien_tipoterrestre',
        'custrecord_ht_bien_marca',
        'custrecord_ht_bien_modelo',
        'custrecord_ht_bien_tipo',
        'custrecord_ht_bien_transmision',
        'custrecord_ht_bien_colorcarseg',
        'custrecord_ht_bien_recorrido',
        'custrecord_ht_bien_usovehiculo',
        'custrecord_ht_bien_numeropuertas',
        'custrecord_ht_bien_consesionarios',
        'custrecord_ht_pe_sucursal',
        'custrecord_ht_bien_companiaseguros',
        'custrecord_ht_bien_financiadovehiculo',
        'custrecord_pe_ht_financiador',
        'custrecord_pe_broker',
        'custrecord_ht_pe_bien_ejecutivoren',
        'custrecord_ht_pe_bien_ejecutivo_ren',
        'custrecord_ht_bien_kilometraje',
        'custrecord_ht_bien_observacion'
      ];
      
      bienFields.forEach(f => {
        if (!Utils.isEmpty(data[f])) {
          try {
            bien.setValue({ fieldId: f, value: data[f] });
          } catch (e) {
            Utils.logError(`Error seteando campo bien: ${f}`, e);
          }
        }
      });
      
      // Broker por defecto si no viene
      if (Utils.isEmpty(data.custrecord_pe_broker)) {
        bien.setValue({ 
          fieldId: 'custrecord_pe_broker', 
          value: CONFIG.DEFAULT_BROKER 
        });
      }
      
      const bienId = bien.save({ 
        enableSourcing: true, 
        ignoreMandatoryFields: false 
      });
      
      Utils.logAudit('Bien creado', { bienId });
      
      // Guardar observación post-save (campo long text)
      if (data.custrecord_ht_bien_observacion) {
        try {
          record.submitFields({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            values: { 
              custrecord_ht_bien_observacion: String(data.custrecord_ht_bien_observacion) 
            }
          });
        } catch (e) {
          Utils.logError('Error guardando observación del bien', e);
        }
      }
      
      // Setear Owner post-save (genera System Note)
      if (ownerId) {
        try {
          record.submitFields({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            values: { owner: Number(ownerId) }
          });
          Utils.logAudit('Owner del bien seteado post-save', { bienId, ownerId });
        } catch (e) {
          Utils.logError('Error seteando owner del bien', e);
        }
      }
      
      return bienId;
    }
  };

  /* ====================================================================
   * PROCESAMIENTO DE ORDEN DE SERVICIO (SALES ORDER)
   * ==================================================================== */
  
  const OSProcessor = {
    // Validar campos obligatorios para OS
    validate: function(data, customerId, bienId) {
      Utils.logAudit('Validando campos OS', { customerId, bienId });
      
      // Validar IDs base
      if (!customerId) {
        throw error.create({
          name: 'MISSING_CUSTOMER',
          message: 'Cliente no especificado o no se pudo crear'
        });
      }
      
      if (!bienId) {
        throw error.create({
          name: 'MISSING_BIEN',
          message: 'Bien/Vehículo no especificado o no se pudo crear'
        });
      }
      
      // Validar campos obligatorios de OS
      const required = [
        'moneda',
        'formaPago',
        'facturarA',
        'condiciones',
        'leyenda',
        'lugarInstalacion'
      ];
      
      Validator.requireFields(data, required, 'Orden de Servicio');
      
      // Validar ejecutivas
      if (Utils.isEmpty(data.ejecutivaReferencia)) {
        throw error.create({
          name: 'MISSING_EJECUTIVA_REFERENCIA',
          message: 'Falta: Ejecutiva de Referencia'
        });
      }
      
      if (Utils.isEmpty(data.ejecutivaRenovacion)) {
        throw error.create({
          name: 'MISSING_EJECUTIVA_RENOVACION',
          message: 'Falta: Ejecutiva de Renovación'
        });
      }
      
      // Validar canales (con fallback desde bien si es necesario)
      const fallbackNeeded = [
        'concesionario',
        'aseguradora',
        'financiera',
        'broker'
      ];
      
      const hasFallback = data.bienData && typeof data.bienData === 'object';
      
      fallbackNeeded.forEach(field => {
        const mainValue = data[field];
        const fallbackValue = hasFallback ? data.bienData[`custrecord_ht_bien_${field}s` || `custrecord_pe_${field}`] : null;
        const finalValue = mainValue || fallbackValue;
        
        if (Utils.isEmpty(finalValue)) {
          throw error.create({
            name: `MISSING_${field.toUpperCase()}`,
            message: `Falta: ${field.charAt(0).toUpperCase() + field.slice(1)}`
          });
        }
      });
      
      // Validar artículos/líneas
      if (!Array.isArray(data.articulos) || data.articulos.length === 0) {
        throw error.create({
          name: 'MISSING_ITEMS',
          message: 'Debe incluir al menos 1 artículo en la orden'
        });
      }
      
      Utils.logAudit('Validación OS exitosa', 'OK');
    },
    
    // Crear Sales Order completo
    create: function(data, customerId, bienId) {
      Utils.logAudit('Creando Sales Order', { customerId, bienId });
      
      // Cargar bien para fallbacks
      let bienRecord = null;
      if (bienId) {
        try {
          bienRecord = record.load({
            type: 'customrecord_ht_record_bienes',
            id: bienId,
            isDynamic: false
          });
        } catch (e) {
          Utils.logError('Error cargando bien para fallbacks', e);
        }
      }
      
      // Fallbacks para canales desde bien
      const getFallback = (field) => {
        if (!Utils.isEmpty(data[field])) return data[field];
        if (!bienRecord) return null;
        
        const bienFieldMap = {
          concesionario: 'custrecord_ht_bien_consesionarios',
          aseguradora: 'custrecord_ht_bien_companiaseguros',
          financiera: 'custrecord_ht_bien_financiadovehiculo',
          broker: 'custrecord_pe_broker'
        };
        
        const bienField = bienFieldMap[field];
        if (!bienField) return null;
        
        try {
          return bienRecord.getValue(bienField);
        } catch (e) {
          return null;
        }
      };
      
      const concesionario = getFallback('concesionario');
      const aseguradora = getFallback('aseguradora');
      const financiera = getFallback('financiera');
      const broker = getFallback('broker');
      
      // Crear Sales Order
      const so = record.create({
        type: record.Type.SALES_ORDER,
        isDynamic: true
      });
      
      // Cabecera básica
      so.setValue({ fieldId: 'subsidiary', value: CONFIG.DEFAULT_SUBSIDIARY });
      so.setValue({ fieldId: 'entity', value: customerId });
      so.setValue({ fieldId: 'currency', value: Number(data.moneda) || data.moneda });
      
      // Bien
      if (bienId) {
        so.setValue({ fieldId: 'custbody_ht_so_bien', value: bienId });
      }
      
      // Mapeo Oficina → Departamento
      const oficina = data.oficina;
      let departamento = data.departamento;
      
      if (oficina && !departamento) {
        const mapped = CONFIG.OFFICE_TO_DEPT[String(oficina)];
        if (mapped) departamento = mapped;
      }
      
      if (departamento) so.setValue({ fieldId: 'department', value: departamento });
      if (data.clase) so.setValue({ fieldId: 'class', value: data.clase });
      if (oficina) so.setValue({ fieldId: 'location', value: oficina });
      
      // Campos específicos de OS
      const osFields = {
        custbody_canal_distribucion_sys: data.canalSYS,
        custbody_ht_pe_os_leyenda: data.leyenda,
        custbody_ht_pe_os_vendedor: data.vendedor,
        custbody_pe_os_convenio: data.convenio,
        terms: data.condiciones,
        custbody_pe_os_forma_pago_sys: data.formaPago,
        custbody_ht_facturar_a: data.facturarA,
        custbody_os_ejecutivarenovacion: data.ejecutivaRenovacion,
        custbody_ht_os_ejecutivareferencia: data.ejecutivaReferencia,
        custbody_pe_ht_lugar_instalacion: data.lugarInstalacion,
        custbody_ht_os_concesionario: concesionario,
        custbody_ht_os_companiaseguros: aseguradora,
        custbody_ht_os_bancofinanciera: financiera,
        custbody_ht_os_broker: broker
      };
      
      // Representante de ventas (salesrep)
      if (data.representanteVentas) {
        try {
          so.setValue({ 
            fieldId: 'salesrep', 
            value: data.representanteVentas 
          });
        } catch (e) {
          Utils.logError('Error seteando salesrep', e);
        }
      }
      
      Object.keys(osFields).forEach(field => {
        if (!Utils.isEmpty(osFields[field])) {
          try {
            so.setValue({ fieldId: field, value: osFields[field] });
          } catch (e) {
            Utils.logError(`Error seteando campo OS: ${field}`, e);
          }
        }
      });
      
      // Líneas de artículos
      data.articulos.forEach((art, idx) => {
        try {
          so.selectNewLine({ sublistId: 'item' });
          
          // Item obligatorio
          if (Utils.isEmpty(art.item)) {
            throw error.create({
              name: 'MISSING_ITEM',
              message: `Línea ${idx + 1}: falta item/artículo`
            });
          }
          
          so.setCurrentSublistValue({ 
            sublistId: 'item', 
            fieldId: 'item', 
            value: art.item 
          });
          
          // Cantidad
          const qty = Utils.nvlNum(art.cantidad, 1);
          so.setCurrentSublistValue({ 
            sublistId: 'item', 
            fieldId: 'quantity', 
            value: qty 
          });
          
          // Precio (calcular unitario sin IGV desde total con impuestos)
          const totalInc = Utils.nvlNum(art.totalConImpuestos || art.precio, 0);
          const taxRate = Utils.rate01(art.tasaImpuesto || 18);
          const unitPrice = Utils.round2(totalInc / qty / (1 + taxRate));
          
          so.setCurrentSublistValue({ 
            sublistId: 'item', 
            fieldId: 'rate', 
            value: unitPrice 
          });
          
          // Tiempo de cobertura
          const tiempo = Utils.nvlNum(art.tiempoCobertura, 0);
          if (tiempo > 0) {
            so.setCurrentSublistValue({ 
              sublistId: 'item', 
              fieldId: 'custcol_ht_os_tiempo_cobertura', 
              value: tiempo 
            });
          }
          
          // Unidad de tiempo
          if (art.unidadTiempo) {
            so.setCurrentSublistValue({ 
              sublistId: 'item', 
              fieldId: 'custcol_ht_os_und_tiempo_cobertura', 
              value: art.unidadTiempo 
            });
          }
          
          // Cliente monitoreo
          so.setCurrentSublistValue({ 
            sublistId: 'item', 
            fieldId: 'custcol_ht_os_cliente_monitoreo', 
            value: customerId 
          });
          
          // Departamento y oficina en línea (heredados o específicos)
          const depLinea = art.departamento || departamento;
          const ofiLinea = art.oficina || oficina;
          
          if (depLinea) {
            so.setCurrentSublistValue({ 
              sublistId: 'item', 
              fieldId: 'department', 
              value: depLinea 
            });
          }
          
          if (ofiLinea) {
            so.setCurrentSublistValue({ 
              sublistId: 'item', 
              fieldId: 'location', 
              value: ofiLinea 
            });
          }
          
          so.commitLine({ sublistId: 'item' });
          
        } catch (e) {
          Utils.logError(`Error agregando línea ${idx + 1}`, e);
          throw error.create({
            name: 'LINE_ERROR',
            message: `Error en línea ${idx + 1}: ${e.message}`
          });
        }
      });
      
      // Guardar Sales Order
      const osId = so.save({ 
        enableSourcing: true, 
        ignoreMandatoryFields: false 
      });
      
      Utils.logAudit('Sales Order creada', { osId });
      
      return osId;
    }
  };

  /* ====================================================================
   * HANDLER PRINCIPAL - POST
   * ==================================================================== */
  
  function post(requestBody) {
    const startTime = new Date();
    
    try {
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('INICIO - Crear Orden de Servicio', {
        timestamp: startTime.toISOString(),
        user: runtime.getCurrentUser().name
      });
      Utils.logAudit('Request Body', requestBody);
      
      // Validación básica del body
      if (!requestBody || typeof requestBody !== 'object') {
        throw error.create({
          name: 'INVALID_REQUEST',
          message: 'Body de la solicitud inválido o vacío'
        });
      }
      
      // ========== PASO 1: PROCESAR CLIENTE ==========
      const clienteData = requestBody.cliente;
      const customerId = ClienteProcessor.process(clienteData);
      
      // ========== PASO 2: PROCESAR BIEN ==========
      const bienData = requestBody.bien;
      const bienId = BienProcessor.process(bienData, customerId);
      
      // ========== PASO 3: VALIDAR OS ==========
      // Agregar bienData al body para fallbacks
      requestBody.bienData = bienData;
      OSProcessor.validate(requestBody, customerId, bienId);
      
      // ========== PASO 4: CREAR SALES ORDER ==========
      const osId = OSProcessor.create(requestBody, customerId, bienId);
      
      // ========== RESPUESTA EXITOSA ==========
      const endTime = new Date();
      const duration = endTime - startTime;
      
      const response = {
        success: true,
        code: 'OK',
        message: 'Orden de Servicio creada exitosamente',
        data: {
          salesOrderId: osId,
          customerId: customerId,
          bienId: bienId,
          timestamp: endTime.toISOString(),
          duration: `${duration}ms`
        }
      };
      
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('FIN - Orden de Servicio creada exitosamente', response.data);
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      
      return response;
      
    } catch (e) {
      Utils.logError('ERROR GENERAL', e);
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      const errorResponse = {
        success: false,
        code: e.name || 'ERROR',
        message: e.message || 'Error desconocido al crear Orden de Servicio',
        details: {
          timestamp: endTime.toISOString(),
          duration: `${duration}ms`,
          stack: e.stack || null
        }
      };
      
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      Utils.logAudit('FIN - Error al crear Orden de Servicio', errorResponse);
      Utils.logAudit('═══════════════════════════════════════════════════', null);
      
      return errorResponse;
    }
  }

  /* ====================================================================
   * EXPORTS
   * ==================================================================== */
  
  return {
    post: post
  };
});