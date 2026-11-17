/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/message', 'N/runtime', 'N/search', 'N/ui/dialog', 'N/url'], (message, runtime, search, dialog, url) => {
  /* -------------------- Constantes & Config -------------------- */
  const ENFORCED_SUBSIDIARY_ID = '3';       // Solo aplica a registros con subsidiaria = 3
  const BANNER_TYPE = message.Type.WARNING; // ERROR | WARNING | INFORMATION | CONFIRMATION
  const BANNER_SECONDS = 6;                 // Duración visible en segundos; 0 = persistente

  // Roles exentos de validación de sublistas
  const EXEMPT_ROLES = ['1800', '1803'];

  function getCurrentRoleId() {
    try {
      return String(runtime.getCurrentUser().role || '');
    } catch (_e) {
      return '';
    }
  }

  function isExemptFromSublistValidation() {
    const roleId = getCurrentRoleId();
    return EXEMPT_ROLES.indexOf(roleId) !== -1;
  }

  /* -------------------- Campos -------------------- */
  const FIELDS = {
    subsidiary: 'subsidiary',
    entityid: 'entityid',
    docNumber: 'custentity_pe_document_number',
    vatreg: 'vatregnumber',
    email: 'email',

    // PE Legal Name
    legalName: 'custentity_pe_legal_name',

    // Tipo cliente
    isPerson: 'isperson',

    // Campos estándar NetSuite
    companyName: 'companyname',
    firstName: 'firstname',
    middleName: 'middlename',
    lastName: 'lastname',
    altName: 'altname',

    // Campos personalizados Hunter
    htPrimerNombre: 'custentity_ht_cl_primernombre',
    htSegundoNombre: 'custentity_ht_cl_segundonombre',
    htApellidoPaterno: 'custentity_ht_cl_apellidopaterno',
    htApellidoMaterno: 'custentity_ht_cl_apellidomaterno'
  };

  const LEGAL_NAME_TRIGGER_FIELDS = [
    FIELDS.isPerson,
    FIELDS.companyName,
    FIELDS.firstName,
    FIELDS.middleName,
    FIELDS.lastName,
    FIELDS.altName,
    FIELDS.subsidiary,

    // Campos personalizados Hunter
    FIELDS.htPrimerNombre,
    FIELDS.htSegundoNombre,
    FIELDS.htApellidoPaterno,
    FIELDS.htApellidoMaterno
  ];

  /* -------------------- Sublistas y mínimos -------------------- */
  const SUBLISTS = {
    phones: 'recmachcustrecord_ht_campo_lbl_entidad_telefono',
    address: 'addressbook',
    emails: 'recmachcustrecord_ht_ce_enlace'
  };

  const REQUIRED = {
    phones: 1,
    address: 1,
    emails: 3
  };

  /*
   * Tipos obligatorios al CREAR el cliente:
   * - al menos 1 teléfono tipo CELULAR (customrecordht_registro_tipo_telefono id 4)
   * - al menos 1 correo tipo 112 (custrecord_ht_email_tipoemail)
   */
  const REQUIRED_TYPES = {
    phone: {
      sublistId: SUBLISTS.phones,
      fieldId: 'custrecord_ht_campo_list_tipo_telefono',
      typeId: '4',
      label: 'al menos 1 Teléfono tipo CELULAR'
    },
    email: {
      sublistId: SUBLISTS.emails,
      fieldId: 'custrecord_ht_email_tipoemail',
      typeId: '112',
      label: 'al menos 1 Correo electrónico del tipo requerido'
    }
  };

  let isCreate = false;

  /* -------------------- Utils -------------------- */
  const U = v => (v || '').toString().trim();
  const UPPER = v => U(v).toUpperCase();
  const LOWER = v => U(v).toLowerCase();

  function asBool(v) {
    return v === true || v === 'T';
  }

  function getValueSafe(rec, fieldId) {
    try {
      return rec.getValue({ fieldId });
    } catch (_e) {
      return '';
    }
  }

  function setValueSafe(rec, fieldId, value) {
    try {
      rec.setValue({
        fieldId,
        value,
        ignoreFieldChange: true
      });
    } catch (_e) { }
  }

  function showBanner(htmlMsg, type = BANNER_TYPE, seconds = BANNER_SECONDS, title = 'Validación de Cliente') {
    const msg = message.create({
      title,
      message: htmlMsg,
      type
    });

    msg.show({
      duration: seconds * 1000
    });
  }

  function clearBannersSafe() {
    try {
      message.clear && message.clear();
    } catch (_e) { }
  }

  function countLines(rec, sublistId) {
    try {
      return rec.getLineCount({ sublistId }) || 0;
    } catch (_e) {
      return 0;
    }
  }

  function hasLineOfType(rec, sublistId, fieldId, typeId) {
    const total = countLines(rec, sublistId);

    for (let i = 0; i < total; i++) {
      try {
        const value = String(rec.getSublistValue({ sublistId, fieldId, line: i }) || '');

        if (value === String(typeId)) {
          return true;
        }
      } catch (_e) { }
    }

    return false;
  }

  function getRecSubsidiary(rec) {
    try {
      return String(rec.getValue({ fieldId: FIELDS.subsidiary }) || '');
    } catch (_e) {
      return '';
    }
  }

  function linkToCustomer(id) {
    try {
      return url.resolveRecord({
        recordType: 'customer',
        recordId: id,
        isEditMode: false
      });
    } catch (_e) {
      return null;
    }
  }

  function listHtml(dups) {
    return dups.map(d => {
      const href = linkToCustomer(d.id);
      const label = `${d.entityid || d.id} — ${d.altname || ''}`.trim();

      const meta = [
        d.doc ? `Doc: ${d.doc}` : null,
        d.vat ? `VAT: ${d.vat}` : null,
        d.email ? `Email: ${d.email}` : null
      ].filter(Boolean).join(' | ');

      return href
        ? `<li><a target="_blank" href="${href}">${label}</a>${meta ? ` <small>(${meta})</small>` : ''}</li>`
        : `<li>${label}${meta ? ` <small>(${meta})</small>` : ''}</li>`;
    }).join('');
  }

  /* -------------------- Espejo Documento → VAT -------------------- */
  function mirrorDocToVat(rec) {
    try {
      const v = U(getValueSafe(rec, FIELDS.docNumber));

      rec.setValue({
        fieldId: FIELDS.vatreg,
        value: v,
        ignoreFieldChange: true
      });
    } catch (_e) { }
  }

  /* -------------------- PE Legal Name -------------------- */
  function buildLegalName(rec) {
    const subsidiary = getRecSubsidiary(rec);

    if (subsidiary !== ENFORCED_SUBSIDIARY_ID) {
      return '';
    }

    const isPerson = asBool(getValueSafe(rec, FIELDS.isPerson));

    if (!isPerson) {
      // Empresa: usar companyname
      const company = U(getValueSafe(rec, FIELDS.companyName));

      if (company) {
        return company;
      }
    } else {
      /*
       * Persona natural:
       * Primero usamos los campos personalizados Hunter.
       *
       * Orden elegido:
       * Apellido Paterno + Apellido Materno + Primer Nombre + Segundo Nombre
       *
       * Ejemplo:
       * LUDEÑA + GUTIERREZ + ABEL = LUDEÑA GUTIERREZ ABEL
       */
      const apellidoPaterno = U(getValueSafe(rec, FIELDS.htApellidoPaterno));
      const apellidoMaterno = U(getValueSafe(rec, FIELDS.htApellidoMaterno));
      const primerNombre = U(getValueSafe(rec, FIELDS.htPrimerNombre));
      const segundoNombre = U(getValueSafe(rec, FIELDS.htSegundoNombre));

      const legalFromCustom = [
        apellidoPaterno,
        apellidoMaterno,
        primerNombre,
        segundoNombre
      ].filter(Boolean).join(' ').trim();

      if (legalFromCustom) {
        return legalFromCustom;
      }

      /*
       * Fallback:
       * Si no existen los campos personalizados en el formulario,
       * usamos los campos estándar de NetSuite.
       */
      const fn = U(getValueSafe(rec, FIELDS.firstName));
      const mn = U(getValueSafe(rec, FIELDS.middleName));
      const ln = U(getValueSafe(rec, FIELDS.lastName));

      const legalFromStandard = [
        ln,
        fn,
        mn
      ].filter(Boolean).join(' ').trim();

      if (legalFromStandard) {
        return legalFromStandard;
      }
    }

    // Último fallback: altname
    return U(getValueSafe(rec, FIELDS.altName));
  }

  function mirrorLegalName(rec) {
    try {
      const legal = buildLegalName(rec);

      if (!legal) {
        return;
      }

      rec.setValue({
        fieldId: FIELDS.legalName,
        value: legal,
        ignoreFieldChange: true
      });
    } catch (_e) { }
  }

  function isLegalNameTriggerField(fieldId) {
    return LEGAL_NAME_TRIGGER_FIELDS.indexOf(fieldId) !== -1;
  }

  /* -------------------- Duplicados -------------------- */
  /**
   * Busca duplicados por:
   * entityid OR custentity_pe_document_number OR vatregnumber OR email
   *
   * Solo dentro de subsidiaria 3.
   * Excluye el propio registro en edición.
   */
  function findDuplicatesInSubsidiary(rec) {
    const subsidiary = getRecSubsidiary(rec);

    if (subsidiary !== ENFORCED_SUBSIDIARY_ID) {
      return [];
    }

    const currentId = rec.id || null;

    const entityId = UPPER(getValueSafe(rec, FIELDS.entityid));
    const docNumber = U(getValueSafe(rec, FIELDS.docNumber));
    const vat = U(getValueSafe(rec, FIELDS.vatreg));
    const email = LOWER(getValueSafe(rec, FIELDS.email));

    if (!entityId && !docNumber && !vat && !email) {
      return [];
    }

    const ors = [];

    if (entityId) {
      ors.push(['formulatext', 'is', entityId, 'formula:UPPER({entityid})']);
    }

    if (docNumber) {
      ors.push(['custentity_pe_document_number', 'is', docNumber]);
    }

    if (vat) {
      ors.push(['vatregnumber', 'is', vat]);
    }

    if (email) {
      ors.push(['formulatext', 'is', email, 'formula:LOWER({email})']);
    }

    const orGroup = ors.reduce((acc, cur) => acc ? [acc, 'OR', cur] : cur, null);

    if (!orGroup) {
      return [];
    }

    const filters = [
      ['subsidiary', 'anyof', ENFORCED_SUBSIDIARY_ID],
      'AND',
      ['isinactive', 'is', 'F'],
      'AND',
      orGroup
    ];

    if (currentId) {
      filters.push('AND', ['internalid', 'noneof', currentId]);
    }

    const s = search.create({
      type: search.Type.CUSTOMER,
      filters,
      columns: [
        'internalid',
        'entityid',
        'altname',
        'email',
        'vatregnumber',
        'custentity_pe_document_number'
      ]
    });

    const res = s.run().getRange({
      start: 0,
      end: 10
    }) || [];

    return res.map(r => ({
      id: r.getValue('internalid'),
      entityid: r.getValue('entityid'),
      altname: r.getValue('altname'),
      email: r.getValue('email'),
      vat: r.getValue('vatregnumber'),
      doc: r.getValue('custentity_pe_document_number')
    }));
  }

  function showDuplicateBanner(dups, entityId, docNumber, vat, email) {
    const bits = [];

    if (entityId) {
      bits.push(`Entity ID "<b>${entityId}</b>"`);
    }

    if (docNumber) {
      bits.push(`N° de documento "<b>${docNumber}</b>"`);
    }

    if (vat) {
      bits.push(`VAT "<b>${vat}</b>"`);
    }

    if (email) {
      bits.push(`Email "<b>${email}</b>"`);
    }

    const why = bits.length ? ` con ${bits.join(' o ')}` : '';

    const html =
      `<p>Se detectaron posibles <b>clientes duplicados</b>${why} en la subsidiaria ${ENFORCED_SUBSIDIARY_ID}.</p>` +
      `<ul>${listHtml(dups)}</ul>` +
      `<p><strong>No se guardará</strong> este cliente para evitar duplicados.</p>`;

    showBanner(html, message.Type.ERROR, 60, 'Duplicado detectado');
  }

  /* -------------------- Valores por defecto -------------------- */
  function setDefaultValuesOnCreate(rec) {
    try {
      setValueSafe(rec, 'receivablesaccount', '4897');
      setValueSafe(rec, 'taxitem', '24205');
      setValueSafe(rec, 'custentity_edoc_gen_trans_pdf', true);
      setValueSafe(rec, 'custentity_psg_ei_entity_edoc_standard', '2');
      setValueSafe(rec, 'currency', '1');

      try {
        const sublistId = 'currency';
        const mustHave = ['5', '1'];
        const existing = new Set();

        const lineCount = rec.getLineCount({ sublistId }) || 0;

        for (let i = 0; i < lineCount; i++) {
          const cur = String(rec.getSublistValue({
            sublistId,
            fieldId: 'currency',
            line: i
          }) || '');

          if (cur) {
            existing.add(cur);
          }
        }

        mustHave.forEach(cur => {
          if (!existing.has(cur)) {
            rec.selectNewLine({ sublistId });

            rec.setCurrentSublistValue({
              sublistId,
              fieldId: 'currency',
              value: cur,
              ignoreFieldChange: true
            });

            rec.commitLine({ sublistId });
          }
        });
      } catch (_e) {
        // Si la sublista currency no está disponible en la forma, no bloquear.
      }
    } catch (_e) {
      // No bloquear el formulario por valores por defecto.
    }
  }

  /* -------------------- Handlers -------------------- */
  function pageInit(ctx) {
    isCreate = ctx.mode === 'create';

    try {
      const rec = ctx.currentRecord;

      if (!rec) {
        return;
      }

      const subsidiary = getRecSubsidiary(rec);

      if (subsidiary !== ENFORCED_SUBSIDIARY_ID) {
        return;
      }

      if (isCreate) {
        setDefaultValuesOnCreate(rec);
      }

      const doc = getValueSafe(rec, FIELDS.docNumber);

      if (doc) {
        mirrorDocToVat(rec);
      }

      // Setear PE Legal Name al cargar la página.
      mirrorLegalName(rec);

    } catch (_e) { }
  }

  function fieldChanged(ctx) {
    const rec = ctx.currentRecord;
    const fieldId = ctx.fieldId;

    if (!rec) {
      return;
    }

    // Espejo Documento → VAT
    if (fieldId === FIELDS.docNumber) {
      mirrorDocToVat(rec);
    }

    // Espejo PE Legal Name cuando cambian campos relevantes
    if (isLegalNameTriggerField(fieldId)) {
      setTimeout(() => {
        mirrorLegalName(rec);
      }, 0);
    }

    // Validación temprana de duplicados cuando cambian claves
    if (
      fieldId === FIELDS.docNumber ||
      fieldId === FIELDS.vatreg ||
      fieldId === FIELDS.email ||
      fieldId === FIELDS.entityid
    ) {
      setTimeout(() => {
        const dups = findDuplicatesInSubsidiary(rec);

        if (dups.length) {
          const entityId = UPPER(getValueSafe(rec, FIELDS.entityid));
          const docNumber = U(getValueSafe(rec, FIELDS.docNumber));
          const vat = U(getValueSafe(rec, FIELDS.vatreg));
          const email = LOWER(getValueSafe(rec, FIELDS.email));

          showDuplicateBanner(dups, entityId, docNumber, vat, email);
        } else {
          clearBannersSafe();
        }
      }, 0);
    }
  }

  function postSourcing(ctx) {
    const rec = ctx.currentRecord;

    if (!rec) {
      return;
    }

    if (ctx.fieldId === FIELDS.docNumber) {
      mirrorDocToVat(rec);
    }

    if (isLegalNameTriggerField(ctx.fieldId)) {
      mirrorLegalName(rec);
    }
  }

  function saveRecord(ctx) {
    const rec = ctx.currentRecord;

    if (!rec) {
      return true;
    }

    const subsidiary = getRecSubsidiary(rec);

    /*
     * 1) Validaciones mínimas de sublistas
     * Solo si subsidiaria = 3
     * Roles 1800 y 1803 quedan exentos.
     */
    if (subsidiary === ENFORCED_SUBSIDIARY_ID && !isExemptFromSublistValidation()) {
      const counts = {
        phones: countLines(rec, SUBLISTS.phones),
        address: countLines(rec, SUBLISTS.address),
        emails: countLines(rec, SUBLISTS.emails)
      };

      const missing = [];

      if (counts.phones < REQUIRED.phones) {
        missing.push('al menos 1 Teléfono');
      }

      if (counts.address < REQUIRED.address) {
        missing.push('al menos 1 Dirección');
      }

      if (counts.emails < REQUIRED.emails) {
        missing.push('al menos 3 Correos electrónicos');
      }

      // Solo al crear: exigir al menos 1 teléfono CELULAR y 1 correo del tipo requerido.
      if (isCreate) {
        Object.keys(REQUIRED_TYPES).forEach(key => {
          const req = REQUIRED_TYPES[key];

          if (!hasLineOfType(rec, req.sublistId, req.fieldId, req.typeId)) {
            missing.push(req.label);
          }
        });
      }

      if (missing.length) {
        showBanner(
          'Para guardar este cliente debes registrar <b>' + missing.join(', ') + '</b>.'
        );

        return false;
      }
    }

    /*
     * 2) Duplicados
     * Solo en creación y subsidiaria 3.
     */
    if (isCreate && subsidiary === ENFORCED_SUBSIDIARY_ID) {
      const dups = findDuplicatesInSubsidiary(rec);

      if (dups.length) {
        const entityId = UPPER(getValueSafe(rec, FIELDS.entityid));
        const docNumber = U(getValueSafe(rec, FIELDS.docNumber));
        const vat = U(getValueSafe(rec, FIELDS.vatreg));
        const email = LOWER(getValueSafe(rec, FIELDS.email));

        showDuplicateBanner(dups, entityId, docNumber, vat, email);

        try {
          dialog.alert({
            title: 'Duplicado detectado',
            message: 'Existen clientes que coinciden con Entity ID / Doc / VAT / Email. Revisa el banner rojo y usa el registro existente.'
          });
        } catch (_e) { }

        return false;
      }
    }

    /*
     * 3) Última línea de defensa antes de guardar.
     */
    mirrorDocToVat(rec);
    mirrorLegalName(rec);

    return true;
  }

  /* -------------------- Exports -------------------- */
  return {
    pageInit,
    fieldChanged,
    postSourcing,
    saveRecord
  };
});