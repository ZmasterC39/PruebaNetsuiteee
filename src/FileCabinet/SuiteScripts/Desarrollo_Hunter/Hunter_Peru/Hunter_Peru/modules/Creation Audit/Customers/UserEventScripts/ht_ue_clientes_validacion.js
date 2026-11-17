/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/query', 'N/runtime', 'N/error', 'N/log', 'N/record'], (search, query, runtime, error, log, record) => {

    const FIELD_DOCUMENTO = 'custentity_pe_document_number';
    const FIELD_SUBSIDIARIA = 'subsidiary';

    const SUBSIDIARIA_PERU = '3';

    const TIPOS_VALIDADOS = ['create', 'copy', 'edit', 'xedit'];

    const CONTEXTOS_VALIDADOS = ['USERINTERFACE', 'CSVIMPORT'];

    const CONTACTOS_OBLIGATORIOS = [
        {
            label: 'un teléfono de tipo 4',
            tabla: 'customrecord_ht_registro_telefono',
            sublista: 'recmachcustrecord_ht_campo_lbl_entidad_telefono',
            campoEnlace: 'custrecord_ht_campo_lbl_entidad_telefono',
            campoTipo: 'custrecord_ht_campo_list_tipo_telefono',
            campoValor: 'custrecord_ht_campo_txt_telefono',
            tipo: '4',
            campoCliente: 'phone'
        },
        {
            label: 'un correo de tipo 112',
            tabla: 'customrecord_ht_record_correoelectronico',
            sublista: 'recmachcustrecord_ht_ce_enlace',
            campoEnlace: 'custrecord_ht_ce_enlace',
            campoTipo: 'custrecord_ht_email_tipoemail',
            campoValor: 'custrecord_ht_email_email',
            tipo: '112',
            campoCliente: 'email'
        }
    ];

    const CONTACTOS_CSV = [
        {
            tabla: 'customrecord_ht_record_correoelectronico',
            campoEnlace: 'custrecord_ht_ce_enlace',
            campoTipo: 'custrecord_ht_email_tipoemail',
            campoValor: 'custrecord_ht_email_email',
            tipo: '1',
            campoCliente: 'email',
            extras: { custrecord_ht_email_emailprincipal: true, custrecord_ht_email_subsidiaria: SUBSIDIARIA_PERU }
        },
        {
            tabla: 'customrecord_ht_record_correoelectronico',
            campoEnlace: 'custrecord_ht_ce_enlace',
            campoTipo: 'custrecord_ht_email_tipoemail',
            campoValor: 'custrecord_ht_email_email',
            tipo: '112',
            campoCliente: 'email',
            extras: { custrecord_ht_email_emailprincipal: false, custrecord_ht_email_subsidiaria: SUBSIDIARIA_PERU }
        },
        {
            tabla: 'customrecord_ht_record_correoelectronico',
            campoEnlace: 'custrecord_ht_ce_enlace',
            campoTipo: 'custrecord_ht_email_tipoemail',
            campoValor: 'custrecord_ht_email_email',
            tipo: '111',
            campoCliente: 'email',
            extras: { custrecord_ht_email_emailprincipal: false, custrecord_ht_email_subsidiaria: SUBSIDIARIA_PERU }
        },
        {
            tabla: 'customrecord_ht_registro_telefono',
            campoEnlace: 'custrecord_ht_campo_lbl_entidad_telefono',
            campoTipo: 'custrecord_ht_campo_list_tipo_telefono',
            campoValor: 'custrecord_ht_campo_txt_telefono',
            tipo: '4',
            campoCliente: 'phone',
            extras: { custrecord_ht_campo_txt_extension: '+51', custrecord_ht_campo_txt_principal: true }
        }
    ];

    const normalizar = (valor) => String(valor == null ? '' : valor)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    const tieneValor = (valor) => String(valor == null ? '' : valor).trim() !== '';

    const esVerdadero = (valor) => valor === true || valor === 'T';

    const obtenerValor = (context, fieldId) => {
        const { newRecord, oldRecord, type } = context;

        if (type === 'xedit' && oldRecord && newRecord.getFields().indexOf(fieldId) === -1) {
            return oldRecord.getValue({ fieldId });
        }

        return newRecord.getValue({ fieldId });
    };

    const esEdicion = (context) => context.type === 'edit' || context.type === 'xedit';

    const buscarDuplicados = (documento, clienteId) => {
        const original = String(documento).trim().toUpperCase();
        const compacto = normalizar(documento);
        const variantes = [original, compacto].filter((v, i, arr) => v && arr.indexOf(v) === i);

        const filtrosOr = [];
        variantes.forEach((variante) => {
            if (filtrosOr.length) filtrosOr.push('OR');
            filtrosOr.push([FIELD_DOCUMENTO, search.Operator.IS, variante]);
        });

        const filtros = [
            filtrosOr,
            'AND', [FIELD_SUBSIDIARIA, search.Operator.ANYOF, SUBSIDIARIA_PERU],
            'AND', ['isinactive', search.Operator.IS, 'F']
        ];
        if (clienteId) {
            filtros.push('AND', ['internalid', search.Operator.NONEOF, clienteId]);
        }

        return search.create({
            type: search.Type.CUSTOMER,
            filters: filtros,
            columns: ['entityid', 'altname', FIELD_DOCUMENTO]
        }).run().getRange({ start: 0, end: 10 })
            .filter((r) => normalizar(r.getValue({ name: FIELD_DOCUMENTO })) === compacto)
            .map((r) => ({
                id: r.id,
                codigo: r.getValue({ name: 'entityid' }),
                nombre: r.getValue({ name: 'altname' })
            }));
    };

    const validarDocumento = (context) => {
        const documento = obtenerValor(context, FIELD_DOCUMENTO);
        const compacto = normalizar(documento);
        if (!compacto) return null;

        if (esEdicion(context) && context.oldRecord
            && normalizar(context.oldRecord.getValue({ fieldId: FIELD_DOCUMENTO })) === compacto) {
            return null;
        }

        const clienteId = esEdicion(context) ? context.newRecord.id : null;
        const duplicados = buscarDuplicados(documento, clienteId);
        if (!duplicados.length) return null;

        const detalle = duplicados
            .map((d) => `ID ${d.id} (${[d.codigo, d.nombre].filter(Boolean).join(' ')})`)
            .join(', ');

        return `el número de documento "${documento}" ya está registrado en el cliente ${detalle}`;
    };

    const tieneSublista = (rec, sublista) => rec.getSublists().indexOf(sublista) !== -1;

    const contarEnSublista = (rec, req) => {
        const lineas = rec.getLineCount({ sublistId: req.sublista });
        let cantidad = 0;

        for (let i = 0; i < lineas; i++) {
            const valor = (fieldId) => rec.getSublistValue({ sublistId: req.sublista, fieldId, line: i });

            if (esVerdadero(valor('isinactive'))) continue;
            if (String(valor(req.campoTipo)) !== req.tipo) continue;
            if (!tieneValor(valor(req.campoValor))) continue;
            cantidad++;
        }
        return cantidad;
    };

    const contarEnBaseDatos = (clienteId, req) => {
        const sql = `SELECT COUNT(*) AS cantidad FROM ${req.tabla}
            WHERE ${req.campoEnlace} = ?
              AND ${req.campoTipo} = ?
              AND isinactive = 'F'
              AND ${req.campoValor} IS NOT NULL`;

        const filas = query.runSuiteQL({ query: sql, params: [clienteId, req.tipo] }).asMappedResults();
        return Number(filas.length ? filas[0].cantidad : 0);
    };

    const cumpleContacto = (rec, req) => {
        if (tieneSublista(rec, req.sublista)) {
            return contarEnSublista(rec, req) > 0;
        }
        if (rec.id) {
            return contarEnBaseDatos(rec.id, req) > 0;
        }
        return null;
    };

    const validarContactos = (context) => {
        const rec = context.newRecord;
        const faltantes = [];
        const sinValidar = [];
        const esCreacionCsv = context.type === 'create' && runtime.executionContext === 'CSVIMPORT';

        CONTACTOS_OBLIGATORIOS.forEach((req) => {
            // Creación por CSV: el registro se crea en afterSubmit a partir del email / phone del cliente
            if (esCreacionCsv && tieneValor(rec.getValue({ fieldId: req.campoCliente }))) return;

            const resultado = cumpleContacto(rec, req);
            if (resultado === false) faltantes.push(req.label);
            if (resultado === null) sinValidar.push(req.label);
        });

        if (sinValidar.length) {
            log.debug({
                title: 'Cliente nuevo sin sublista de contacto',
                details: { type: context.type, sinValidar }
            });
        }

        return faltantes.length ? `debe tener ${faltantes.join(' y ')}` : null;
    };

    const beforeSubmit = (context) => {
        if (TIPOS_VALIDADOS.indexOf(context.type) === -1) return;
        if (CONTEXTOS_VALIDADOS.indexOf(runtime.executionContext) === -1) return;

        if (String(obtenerValor(context, FIELD_SUBSIDIARIA) || '') !== SUBSIDIARIA_PERU) return;

        const errores = [validarDocumento(context), validarContactos(context)].filter(Boolean);
        if (!errores.length) return;

        log.audit({
            title: 'Cliente bloqueado',
            details: { type: context.type, id: context.newRecord.id, errores }
        });

        throw error.create({
            name: 'HT_CLIENTE_VALIDACION',
            message: `No se puede guardar el cliente: ${errores.join('; ')}.`,
            notifyOff: true
        });
    };

    const afterSubmit = (context) => {
        if (context.type !== 'create') return;
        if (runtime.executionContext !== 'CSVIMPORT') return;

        const rec = context.newRecord;
        if (String(rec.getValue({ fieldId: FIELD_SUBSIDIARIA }) || '') !== SUBSIDIARIA_PERU) return;

        CONTACTOS_CSV.forEach((c) => {
            try {
                const valor = String(rec.getValue({ fieldId: c.campoCliente }) || '').trim();
                if (!valor) return;
                if (contarEnBaseDatos(rec.id, c) > 0) return;

                const nuevo = record.create({ type: c.tabla });
                nuevo.setValue({ fieldId: c.campoEnlace, value: rec.id });
                nuevo.setValue({ fieldId: c.campoTipo, value: c.tipo });
                nuevo.setValue({ fieldId: c.campoValor, value: valor });
                Object.keys(c.extras).forEach((fieldId) => nuevo.setValue({ fieldId, value: c.extras[fieldId] }));
                const id = nuevo.save();

                log.audit({ title: 'Contacto creado (CSV)', details: { cliente: rec.id, tabla: c.tabla, tipo: c.tipo, id } });
            } catch (e) {
                log.error({ title: 'Error creando contacto (CSV)', details: { cliente: rec.id, tabla: c.tabla, tipo: c.tipo, error: e.message } });
            }
        });
    };

    return { beforeSubmit, afterSubmit };
});
