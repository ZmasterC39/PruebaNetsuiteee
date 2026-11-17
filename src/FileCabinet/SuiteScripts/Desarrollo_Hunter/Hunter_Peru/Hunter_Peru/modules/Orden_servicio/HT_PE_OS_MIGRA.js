/**
 * HT_PE_SC_OS_Sync – ScheduledScript con TEST_MODE
 * ------------------------------------------------------------
 * - Refactor del Map/Reduce a Scheduled Script (2.1)
 * - Sin N/query: todo vía record/search.
 * - TEST_MODE: true = solo logs (no API, no updates) / false = ejecución real.
 *
 * Parámetro:
 *   custscript_target_record_id  → internalId de la Sales Order a procesar
 *
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/https', 'N/runtime', 'N/log'], function(record, search, https, runtime, log) {

    /* =============================== CONFIG =============================== */
    /** TEST_MODE:
     *  true  → solo logs (construye orderData y payload final y LOS LOGUEA)
     *  false → proceso real (llama API y actualiza la OS)
     */
    const TEST_MODE = true;

    const API_URL = 'https://syshunterperu.com/migraos/migraos/NS/generateOSNetsuite';
    const HTTP_SUCCESS = new Set([200, 201, 202]);
    const DEFAULT_TAX_RATE = 0.18; // fallback si no se puede inferir
    const MAX_LOG_JSON = 4000; // truncar JSON en logs

    // Defaults de RUCS (si faltan en el Bien/Canal de Distribución)
    const DEFAULTS_RUC = {
        CONCESIONARIO: '9980000000006',
        FINANCIERA: '9980000000004',
        BROKER: '9980000000003',
        COMPANIA: '9980000000005'
    };

    // Clasificación de líneas (ya no se usa para limitar a 3, pero lo dejo por compatibilidad)
    const TIPO_ART_DISPOSITIVO = new Set(['Ensamblaje', 'Artículo de inventario', 'Artículo no inventariable']);
    const TIPO_ART_SERVICIO = 'Servicio';

    /* ================================ MAIN ================================ */

    function execute(context) {
        const script = runtime.getCurrentScript();
        const targetSO = script.getParameter({
            name: 'custscript_target_record_id1'
        });

        log.audit('Start Scheduled', {
            TEST_MODE,
            targetSO: targetSO || '(no param)'
        });

        if (!targetSO) {
            log.audit('No target record id provided, nothing to do', {});
            return;
        }

        try {
            // En modo real, evitamos reprocesar cuando ya fue enviado
            if (!TEST_MODE && isAlreadySent(targetSO)) {
                log.audit('Already Sent - Skipping (modo real)', {
                    recordId: targetSO
                });
                return;
            }

            // 1) Armar el payload base (equivalente al SuiteQL del MR original)
            const orderData = buildOrderData(targetSO);
            if (!orderData) {
                const msg = 'No se pudo armar orderData (datos insuficientes o error).';
                if (TEST_MODE) {
                    log.error('TEST_MODE: buildOrderData failed', {
                        recordId: targetSO,
                        msg
                    });
                    return; // sin actualizar la OS
                } else {
                    markAsFailed(targetSO, msg, null);
                    return;
                }
            }

            // 2) Armar payload final (usuario + objJson)
            const dniusuario = getDNIUsuarioFromSO(targetSO) || '';
            const finalPayload = {
                usuario: dniusuario,
                objJson: [orderData]
            };

            // LOG: Payload FINAL (lo que se enviaría)
            logJson('Payload FINAL hacia API (truncado si excede)', finalPayload);

            if (TEST_MODE) {
                const sentFlag = isAlreadySent(targetSO);
                log.audit('TEST_MODE ON – No se llama API ni se actualiza la OS', {
                    apiUrl: API_URL,
                    recordId: targetSO,
                    usuario: dniusuario || '(vacío)',
                    objJsonCount: finalPayload.objJson.length,
                    nota: sentFlag ? 'En modo real se OMITIRÍA por custbody_os_api_sent = true' : 'En modo real SÍ se enviaría'
                });
                return; // no llamar API ni actualizar en TEST_MODE
            }

            // 3) Envío real a API
            const apiResult = sendToAPI(finalPayload, targetSO);

            // 4) Registrar resultado real
            if (apiResult.success) {
                markAsSuccess(targetSO, apiResult);
                log.audit('API Success', {
                    recordId: targetSO,
                    statusCode: apiResult.statusCode,
                    numeroOS: apiResult.numeroOS,
                    codigoVehiculo: apiResult.codigoVehiculo,
                    estados: (apiResult.estados || []).join(', '),
                    responseTimeMs: apiResult.responseTime
                });
            } else {
                markAsFailed(targetSO, apiResult.error || 'API devolvió error', apiResult);
                log.error('API Failed', {
                    recordId: targetSO,
                    statusCode: apiResult.statusCode || '(n/a)',
                    error: apiResult.error,
                    errors: apiResult.errors,
                    responseTimeMs: apiResult.responseTime
                });
            }

        } catch (e) {
            log.error('Scheduled Error', {
                recordId: targetSO,
                error: e.toString(),
                stack: e.stack
            });
            if (!TEST_MODE) {
                markAsFailed(targetSO, 'Scheduled Error: ' + e.toString(), null);
            }
        }
    }

    /* ========================== BUILD ORDER DATA ========================== */

    function buildOrderData(soId) {
        try {
            const so = record.load({
                type: 'salesorder',
                id: soId,
                isDynamic: false
            });

            // ----------- Datos base / cabecera ----------
            const entityId = so.getValue('entity');
            const currencyId = String(so.getValue('currency') || '');
            const termsId = so.getValue('terms') || '';
            const bienId = so.getValue('custbody_ht_so_bien') || '';
            const lugarInst = so.getValue('custbody_pe_ht_lugar_instalacion') || '';
            const leyendaId = so.getValue('custbody_ht_pe_os_leyenda') || '';
            const convenioId = so.getValue('custbody_pe_os_convenio') || '';
            const canalSYS = so.getValue('custbody_canal_distribucion_sys') || '';
            const facturarA = so.getValue('custbody_ht_facturar_a') || '';
            const vendedorRef = so.getValue('custbody_ht_pe_os_vendedor') || '';

            const ejecutivaGestionId = so.getValue('custbody_ht_os_ejecutiva_backoffice') || '';
            const ejecutivaRenovacionId = so.getValue('custbody_os_ejecutivarenovacion') || '';
            const ejecutivaReferenciaId = so.getValue('custbody_ht_os_ejecutivareferencia') || '';

            const startDate = getYMD(so.getValue('startdate')); // puede venir null
            const endDate = getYMD(so.getValue('enddate')); // puede venir null

            // tasa efectiva de impuestos (fallback a 18%) – ya no se usa para precios
            const subtotal = toNumber(so.getValue('subtotal'));
            const taxtotal = toNumber(so.getValue('taxtotal'));
            const taxRate = (subtotal > 0) ? round2(taxtotal / subtotal) : DEFAULT_TAX_RATE;

            // ----------- Cliente ----------
            const cust = lookupCustomerBasic(entityId); // { isPerson, firstName, lastName, companyName, docType, docNumber, phone, email }
            if (!cust) throw new Error('Cliente no encontrado o sin datos básicos');

            const docTypeTxt = mapDocType(cust.docType);
            const nombres = cust.isPerson ? (cust.firstName || '') : (cust.companyName || '');
            const apellPat = cust.isPerson ? (cust.lastName || ' ') : ' ';
            const telefono = normalizePhonePE(cust.phone || '');

            // Segundo documento (facturar a)
            let numeroDoc2 = '';
            if (facturarA) {
                const factA = lookupCustomerDocNumber(facturarA);
                numeroDoc2 = factA || '';
            }

            // ----------- Dirección (legal) ----------
            const addr = extractBillingAddress(so); // { departamento, provincia, distrito, direccion }

            // ----------- Bien (vehículo) ----------
            const bien = loadBienInfo(bienId);

            // ----------- Ítems: TODOS con precio BRUTO real de la línea ----------
            const itemsAll = extractAllItems(so); // { lines:[{item, precioStr, precioNum, plazo}], totalStr }

            // ----------- Departamento / Centro utilidad ----------
            const deptInfo = lookupDepartmentInfo(so.getValue('department')); // { name }
            const cu = mapCentroUtilidad(deptInfo ? (deptInfo.name || '') : '');

            // ----------- Códigos de catálogos ----------
            const idLugarInst = lookupCustomCode('customrecord_ht_os_lugar_instalacion', lugarInst, 'custrecord_pe_ht_os_codigo');
            const idLeyenda = lookupCustomCode('customrecord_ht_pe_os_leyenda', leyendaId, 'custrecord_ht_pe_codigo');
            const vendedorCod = lookupCustomCode('customrecord_pe_ht_os_vendedor', vendedorRef, 'custrecord_ht_pe_id_vendedor');

            // ----------- Ejecutivas (DNI) ----------
            const ejGestionDNI = ejecutivaGestionId ? lookupEmployeeDNI(ejecutivaGestionId) : '';
            const ejRenovacionDNI = ejecutivaRenovacionId ? lookupEmployeeDNI(ejecutivaRenovacionId) : '';
            const ejReferenciaDNI = ejecutivaReferenciaId ? lookupEmployeeDNI(ejecutivaReferenciaId) : '';

            // ----------- Moneda S/D ----------
            const monedaSD = (currencyId === '1') ? 'D' : (currencyId === '5' ? 'S' : 'D');

            // ----------- Armar objeto final ----------
            const data = {
                N_CREDITO: '1',

                fini: startDate || '',
                ffin: endDate || '',

                EJECUTIVA_GESTION: ejGestionDNI || '',
                EJECUTIVA_RENOVACION: ejRenovacionDNI || '',

                // Se llenarán dinámicamente; se dejan por compatibilidad
                PLAZO_ITEM_1: '',
                PLAZO_ITEM_2: '',
                PLAZO_ITEM_3: '',

                ID_LUGAR_INSTALACION: idLugarInst || '',
                ID_LEYENDA: idLeyenda || '',

                id_convenio_netsuite: convenioId || '',
                id_canal_distribucion_sys: canalSYS || '',

                ID_INTERNO_OS: soId,
                ID_INTERNO_BIEN: bienId || '',
                ID_INTERNO_CLIENTE: entityId || '',

                NOMBRES: safeStr(nombres),
                APELLIDO_PATERNO: safeStr(apellPat),
                APELLIDO_MATERNO: '',

                TIPO_DE_DOCUMENTO: docTypeTxt,
                NUMERO_DE_DOCUMENTO: cust.docNumber || '',
                NUMERO_DE_DOCUMENTO_2: numeroDoc2 || '',

                SEXO: 'M',
                FECHA_DE_NACIMIENTO: '01/01/2000',

                DEPARTAMEN_O_DIRECCION_LEGAL: addr.departamento || '',
                PROVINCIA_DIRECCION_LEGAL: addr.provincia || '',
                DISTRITO_DIRECCION_LEGAL: addr.distrito || '',
                DIRECCION_LEGAL: addr.direccion || '',

                TELEFONO_TITULAR: telefono,
                OTRO_CORREO: cust.email || '',

                CLASE: bien.tipoVehiculo || ' ',
                USO: 'PARTICULAR',
                MARCA: bien.marca || '',
                MODELO: bien.modelo || '',
                TIPO_VEHICULO: bien.tipoVehiculo || '',
                COLOR: bien.color || '',
                ANIO_FABRICACION: String(bien.anio || ''),

                N_PLACA: bien.placa || '',
                N_MOTOR: bien.motor || '',
                N_SERIE: bien.chasis || '',

                CBU: '',

                CONCESIONARIO: bien.rucConcesionario || DEFAULTS_RUC.CONCESIONARIO,
                SUCURSAL: '2',
                EJECUTIVA_REFERENCIA: ejReferenciaDNI || '',

                FINANCIERA: bien.rucFinanciera || DEFAULTS_RUC.FINANCIERA,
                BROKER: bien.rucBroker || DEFAULTS_RUC.BROKER,
                COMPANIA_SEGUROS: bien.rucAseguradora || DEFAULTS_RUC.COMPANIA,

                // Suma exacta de TODOS los ítems (en string con dos decimales)
                MONTO_GPS_DOLARES: itemsAll.totalStr,

                CORREO_DE_CORRESPONDENCIA: cust.email || '',
                MONEDA_S_D: monedaSD,
                FORMA_PAGO: so.getValue('custbody_pe_os_forma_pago_sys') || '',
                DATCORP_TIPO_CREDITO: termsId || '',
                DIAS: '0',

                VENDEDOR_CODIGO: vendedorCod || '',

                // Compatibilidad (se completan abajo)
                ITEM_1: '',
                PRECIO_1: '0.00',
                ITEM_2: '',
                PRECIO_2: '0.00',
                ITEM_3: '',
                PRECIO_3: '0.00',

                CENTRO_UTILIDAD: cu.codigo,
                CENTRO_COSTO: cu.nombre,

                // Meta
                TOTAL_ITEMS: itemsAll.lines.length
            };

            // ——— Relleno dinámico de TODOS los ítems:
            itemsAll.lines.forEach((ln, idx) => {
                const i = idx + 1;
                data['ITEM_' + i] = ln.item || '';
                data['PRECIO_' + i] = ln.precioStr;   // EXACTO como en la línea
                data['PLAZO_ITEM_' + i] = ln.plazo || '';
            });

            // ——— Compatibilidad con los 3 primeros (si existen)
            if (itemsAll.lines[0]) {
                data.ITEM_1 = itemsAll.lines[0].item;
                data.PRECIO_1 = itemsAll.lines[0].precioStr;
                data.PLAZO_ITEM_1 = itemsAll.lines[0].plazo || '';
            }
            if (itemsAll.lines[1]) {
                data.ITEM_2 = itemsAll.lines[1].item;
                data.PRECIO_2 = itemsAll.lines[1].precioStr;
                data.PLAZO_ITEM_2 = itemsAll.lines[1].plazo || '';
            }
            if (itemsAll.lines[2]) {
                data.ITEM_3 = itemsAll.lines[2].item;
                data.PRECIO_3 = itemsAll.lines[2].precioStr;
                data.PLAZO_ITEM_3 = itemsAll.lines[2].plazo || '';
            }

            // Log de “lo que se arma” (orderData)
            logJson('orderData armado (truncado si excede)', data);
            return data;

        } catch (e) {
            log.error('buildOrderData error', {
                soId,
                error: e.toString(),
                stack: e.stack
            });
            return null;
        }
    }

    /* ========================= HELPERS – LOOKUPS ========================= */

    function lookupCustomerBasic(customerId) {
        if (!customerId) return null;
        try {
            const f = search.lookupFields({
                type: 'customer',
                id: customerId,
                columns: [
                    'isperson', 'firstname', 'lastname', 'companyname',
                    'custentity_pe_document_type', 'custentity_pe_document_number',
                    'phone', 'email'
                    // OJO: no pedir 'defaultbilling' aquí (provocaba SSS_INVALID_SRCH_COL)
                ]
            });
            return {
                isPerson: f.isperson === true,
                firstName: f.firstname || '',
                lastName: f.lastname || '',
                companyName: f.companyname || '',
                docType: valueOrId(f.custentity_pe_document_type),
                docNumber: f.custentity_pe_document_number || '',
                phone: f.phone || '',
                email: f.email || ''
            };
        } catch (e) {
            log.error('lookupCustomerBasic', {
                customerId,
                error: e.toString()
            });
            return null;
        }
    }

    function lookupCustomerDocNumber(customerId) {
        try {
            const f = search.lookupFields({
                type: 'customer',
                id: customerId,
                columns: ['custentity_pe_document_number']
            });
            return f && f.custentity_pe_document_number ? f.custentity_pe_document_number : '';
        } catch (e) {
            log.error('lookupCustomerDocNumber', {
                customerId,
                error: e.toString()
            });
            return '';
        }
    }

    function lookupEmployeeDNI(empId) {
        try {
            const raw = rawId(empId);
            const idInt = parseInt(String(raw), 10);
            if (!idInt) {
                log.debug('lookupEmployeeDNI: empId inválido', {
                    empId
                });
                return '';
            }
            const f = search.lookupFields({
                type: 'employee',
                id: idInt,
                columns: ['custentity_pe_document_number']
            });
            return (f && f.custentity_pe_document_number) || '';
        } catch (e) {
            log.error('lookupEmployeeDNI', {
                empId,
                error: e.toString()
            });
            return '';
        }
    }

    function lookupCustomCode(recType, id, codeFieldId) {
        if (!id) return '';
        try {
            const f = search.lookupFields({
                type: recType,
                id: id,
                columns: [codeFieldId]
            });
            return (f && f[codeFieldId]) || '';
        } catch (e) {
            log.error('lookupCustomCode', {
                recType,
                id,
                codeFieldId,
                error: e.toString()
            });
            return '';
        }
    }

    function lookupDepartmentInfo(deptId) {
        if (!deptId) return null;
        try {
            const f = search.lookupFields({
                type: 'department',
                id: deptId,
                columns: ['name']
            });
            return {
                name: (f && f.name) || ''
            };
        } catch (e) {
            log.error('lookupDepartmentInfo', {
                deptId,
                error: e.toString()
            });
            return null;
        }
    }


    /* ========================= HELPERS – DNI USUARIO ========================= */
    function getDNIUsuarioFromSO(soId) {
        try {
            // Leemos de la OS el empleado referencia (y backups por si no estuviera)
            const f = search.lookupFields({
                type: 'salesorder',
                id: soId,
                columns: [
                    'custbody_ht_os_ejecutivareferencia',
                    'custbody_ht_os_ejecutiva_backoffice',
                    'custbody_os_ejecutivarenovacion'
                ]
            });

            // valueOrId maneja {value,text} y casos simples
            const refEmpId = valueOrId(f.custbody_ht_os_ejecutivareferencia);
            const backEmpId = valueOrId(f.custbody_ht_os_ejecutiva_backoffice);
            const renoEmpId = valueOrId(f.custbody_os_ejecutivarenovacion);

            const chosenEmpId = refEmpId || backEmpId || renoEmpId;
            if (!chosenEmpId) {
                log.debug('getDNIUsuarioFromSO: sin empleado en OS', {
                    soId
                });
                return '';
            }

            const dni = lookupEmployeeDNI(chosenEmpId) || '';
            if (!dni) {
                log.debug('getDNIUsuarioFromSO: empleado sin DNI', {
                    soId,
                    chosenEmpId
                });
            }
            return dni;

        } catch (e) {
            log.error('getDNIUsuarioFromSO error', {
                soId,
                error: e.toString()
            });
            return '';
        }
    }


    /* ========================= HELPERS – ADDRESS ========================= */

    function extractBillingAddress(soRec) {
        // Intento 1: subrecord de billingaddress
        try {
            const sub = soRec.getSubrecord({
                fieldId: 'billingaddress'
            });
            if (sub) {
                const g = (id) => {
                    try {
                        return sub.getValue(id) || '';
                    } catch (_e) {
                        return '';
                    }
                };
                return {
                    departamento: g('custrecord_pe_departamento'),
                    provincia: g('dropdownstate') || g('state'),
                    distrito: g('custrecord_pe_distrito'),
                    direccion: g('addr1')
                };
            }
        } catch (e) {
            log.debug('extractBillingAddress subrecord not available', e.toString());
        }
        // Intento 2: usar el texto de billaddress como respaldo
        const billText = safeStr(soRec.getValue('billaddress'));
        if (billText) {
            // No podemos parsear Dpto/Prov/Dist con certeza; devolvemos dirección completa en 'direccion'
            return {
                departamento: '',
                provincia: '',
                distrito: '',
                direccion: billText.split('\n')[1] || billText
            };
        }
        return {
            departamento: '',
            provincia: '',
            distrito: '',
            direccion: ''
        };
    }

    /* ========================= HELPERS – BIEN (vehículo) ========================= */

    function loadBienInfo(bienId) {
        if (!bienId) return emptyBien();
        try {
            const r = record.load({
                type: 'customrecord_ht_record_bienes',
                id: bienId,
                isDynamic: false
            });

            const marcaId = r.getValue('custrecord_ht_bien_marca') || '';
            const modeloId = r.getValue('custrecord_ht_bien_modelo') || '';
            const tipoId = r.getValue('custrecord_ht_bien_tipo') || '';
            const colorId = r.getValue('custrecord_ht_bien_colorcarseg') || '';

            const consId = r.getValue('custrecord_ht_bien_consesionarios') || '';
            const finanId = r.getValue('custrecord_ht_bien_financiadovehiculo') || '';
            const asegId = r.getValue('custrecord_ht_bien_companiaseguros') || '';
            const brokerId = r.getValue('custrecord_pe_broker') || '';

            return {
                marca: lookupName('customrecord_ht_bien_marca', marcaId),
                modelo: lookupName('customrecord_ht_bn_modelo', modeloId),
                tipoVehiculo: lookupName('customrecord_ht_record_tipovehiculo', tipoId),
                color: lookupName('customrecord_ht_bn_colorcarseg', colorId),
                anio: r.getValue('custrecord_ht_bien_ano') || '',
                placa: r.getValue('custrecord_ht_bien_placa') || '',
                motor: r.getValue('custrecord_ht_bien_motor') || '',
                chasis: r.getValue('custrecord_ht_bien_chasis') || '',

                rucConcesionario: lookupRUC('customrecord_ht_record_canaldistribucion', consId),
                rucFinanciera: lookupRUC('customrecord_ht_record_canaldistribucion', finanId),
                rucAseguradora: lookupRUC('customrecord_ht_record_canaldistribucion', asegId),
                rucBroker: lookupRUC('customrecord_ht_record_canaldistribucion', brokerId)
            };

        } catch (e) {
            log.error('loadBienInfo', {
                bienId,
                error: e.toString()
            });
            return emptyBien();
        }
    }

    function emptyBien() {
        return {
            marca: '',
            modelo: '',
            tipoVehiculo: '',
            color: '',
            anio: '',
            placa: '',
            motor: '',
            chasis: '',
            rucConcesionario: '',
            rucFinanciera: '',
            rucAseguradora: '',
            rucBroker: ''
        };
    }

    function lookupName(recType, id) {
        if (!id) return '';
        try {
            const f = search.lookupFields({
                type: recType,
                id,
                columns: ['name']
            });
            return (f && f.name) || '';
        } catch (e) {
            log.error('lookupName', {
                recType,
                id,
                error: e.toString()
            });
            return '';
        }
    }

    function lookupRUC(recType, id) {
        if (!id) return '';
        try {
            const f = search.lookupFields({
                type: recType,
                id,
                columns: ['custrecord_ht_cd_ruccanaldistribucion']
            });
            return (f && f.custrecord_ht_cd_ruccanaldistribucion) || '';
        } catch (e) {
            log.error('lookupRUC', {
                recType,
                id,
                error: e.toString()
            });
            return '';
        }
    }

    /* ====================== HELPERS – ITEMS & PRECIOS ===================== */

    // NUEVO: obtiene TODOS los ítems con el precio BRUTO exacto de la línea (grossamt), sin recalcular impuestos
    function extractAllItems(so) {
        const lineCount = so.getLineCount({ sublistId: 'item' }) || 0;
        const cacheItem = {}; // idItem → { itemid, displayname }
        const lines = [];

        let totalCents = 0;

        for (let i = 0; i < lineCount; i++) {
            const itemId = so.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            if (!itemId) continue;

            // Precio bruto exacto que devuelve NS en la línea
            let grossStr = safeStr(so.getSublistValue({
                sublistId: 'item',
                fieldId: 'grossamt',
                line: i
            }));

            // Fallback si por alguna razón 'grossamt' no viene
            if (grossStr === '') {
                const net = toNumber(so.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }));
                const tax = toNumber(so.getSublistValue({ sublistId: 'item', fieldId: 'tax1amt', line: i }));
                const sum = net + tax;
                grossStr = (Math.floor(sum) === sum) ? sum.toFixed(2) : String(sum);
            }

            // Parse seguro a centavos (evita errores de float)
            const cents = Math.round(parseFloat(grossStr) * 100);
            totalCents += isNaN(cents) ? 0 : cents;

            const plazo = safeStr(so.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_ht_os_tiempo_cobertura',
                line: i
            }));

            // Obtener nombre base (por item)
            if (!cacheItem[itemId]) cacheItem[itemId] = loadItemNames(itemId);
            const names = cacheItem[itemId]; // { itemid, displayname }
            const display = (names.displayname || '');
            const itemid = (names.itemid || '');
            const baseName = normalizeItemName(itemid, display); // ej "PE-6859 ..." → "6859"

            lines.push({
                item: baseName,
                precioStr: grossStr,
                precioNum: parseFloat(grossStr),
                plazo
            });
        }

        const totalStr = (totalCents / 100).toFixed(2);
        return { lines, totalStr };
    }

    function loadItemNames(itemId) {
        try {
            const s = search.create({
                type: search.Type.ITEM,
                filters: [
                    ['internalid', 'anyof', itemId]
                ],
                columns: ['itemid', 'displayname']
            });
            const r = s.run().getRange({
                start: 0,
                end: 1
            });
            if (r && r.length) {
                return {
                    itemid: r[0].getValue('itemid') || '',
                    displayname: r[0].getValue('displayname') || ''
                };
            }
        } catch (e) {
            log.error('loadItemNames', {
                itemId,
                error: e.toString()
            });
        }
        return {
            itemid: '',
            displayname: ''
        };
    }

    function normalizeItemName(itemid, displayname) {
        // Si itemid tiene '-', usar lo de la derecha; si no, itemid; si vacío, displayname.
        const base = (itemid || '').trim();
        if (!base) return (displayname || '').trim();
        const idx = base.indexOf('-');
        return (idx >= 0) ? base.substring(idx + 1).trim() : base;
    }

    /* =========================== HELPERS – MISC =========================== */

    function isAlreadySent(recordId) {
        try {
            const v = search.lookupFields({
                type: 'salesorder',
                id: recordId,
                columns: ['custbody_os_api_sent']
            });
            return v && v.custbody_os_api_sent === true;
        } catch (e) {
            log.debug('isAlreadySent lookup error', e.toString());
            return false;
        }
    }

    function getCurrentAttempts(recordId) {
        try {
            const v = search.lookupFields({
                type: 'salesorder',
                id: recordId,
                columns: ['custbody_os_api_attempts']
            });
            return parseInt(v && v.custbody_os_api_attempts ? v.custbody_os_api_attempts : '0', 10);
        } catch (e) {
            log.debug('getCurrentAttempts lookup error', e.toString());
            return 0;
        }
    }

    function markAsSuccess(recordId, apiResult) {
        try {
            const attempts = getCurrentAttempts(recordId) + 1;

            const parts = [];
            if (apiResult.numeroOS) parts.push('OS: ' + apiResult.numeroOS);
            if (apiResult.codigoVehiculo) parts.push('Vehiculo: ' + apiResult.codigoVehiculo);
            if (apiResult.estados && apiResult.estados.length) parts.push('Estados: ' + apiResult.estados.join(', '));
            const responseText = parts.length ? parts.join(' | ') : 'Success';

            record.submitFields({
                type: 'salesorder',
                id: recordId,
                values: {
                    custbody_os_api_sent: true,
                    custbody_os_api_sent_date: new Date(),
                    custbody_os_api_failed: false,
                    custbody_os_api_last_attempt: new Date(),
                    custbody_os_api_attempts: attempts,
                    custbody_os_api_last_response: responseText.substring(0, 300),
                    memo: apiResult.numeroOS || ''
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.audit('Marked as Success', {
                recordId,
                attempts,
                responsePreview: responseText.substring(0, 120)
            });
        } catch (e) {
            log.error('markAsSuccess error', {
                recordId,
                error: e.toString()
            });
        }
    }

    function markAsFailed(recordId, errorMsg, apiResult) {
        try {
            const attempts = getCurrentAttempts(recordId) + 1;

            let msg = 'ERROR: ' + (errorMsg || 'Desconocido');
            if (apiResult) {
                if (apiResult.error) msg = 'ERROR: ' + apiResult.error;
                else if (apiResult.errors && apiResult.errors.length) msg = 'ERRORES: ' + apiResult.errors.join(' | ');

                const extra = [];
                if (apiResult.numeroOS) extra.push('OS: ' + apiResult.numeroOS);
                if (apiResult.codigoVehiculo) extra.push('Vehiculo: ' + apiResult.codigoVehiculo);
                if (extra.length) msg += ' [' + extra.join(', ') + ']';
            }

            record.submitFields({
                type: 'salesorder',
                id: recordId,
                values: {
                    custbody_os_api_sent: false,
                    custbody_os_api_sent_date: null,
                    custbody_os_api_failed: true,
                    custbody_os_api_last_attempt: new Date(),
                    custbody_os_api_attempts: attempts,
                    custbody_os_api_last_response: msg.substring(0, 300)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.audit('Marked as Failed', {
                recordId,
                attempts,
                msgPreview: msg.substring(0, 120)
            });

        } catch (e) {
            log.error('markAsFailed error', {
                recordId,
                error: e.toString()
            });
        }
    }

    function sendToAPI(finalPayload, recordId) {
        const t0 = Date.now();
        try {
            const response = https.post({
                url: API_URL,
                body: JSON.stringify(finalPayload),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const dt = Date.now() - t0;

            if (!HTTP_SUCCESS.has(response.code)) {
                log.error('HTTP error calling API', {
                    recordId,
                    code: response.code,
                    timeMs: dt,
                    bodyPreview: (response.body || '').substring(0, 500)
                });
                return {
                    success: false,
                    statusCode: response.code,
                    error: 'HTTP ' + response.code,
                    hasErrors: true,
                    errors: ['HTTP status ' + response.code + ' al llamar API'],
                    responseTime: dt
                };
            }

            const parsed = analyzeAPIResponse(response.body, recordId, response.code);
            parsed.responseTime = dt;
            return parsed;

        } catch (e) {
            return {
                success: false,
                error: 'Request Error: ' + e.toString(),
                responseTime: Date.now() - t0,
                hasErrors: true,
                errors: ['Request Error: ' + e.toString()]
            };
        }
    }

    function analyzeAPIResponse(responseBody, recordId, statusCode) {
        const result = {
            success: false,
            hasErrors: true,
            errors: [],
            numeroOS: null,
            codigoVehiculo: null,
            estados: [],
            error: null,
            statusCode: statusCode
        };

        try {
            if (!responseBody) {
                result.error = 'API no retornó respuesta (vacía)';
                result.errors.push('Empty response body');
                return result;
            }
            let parsed;
            try {
                parsed = JSON.parse(responseBody);
            } catch (pe) {
                result.error = 'API retorno respuesta no válida (no JSON)';
                result.errors.push('Invalid JSON response: ' + pe.toString());
                return result;
            }

            if (!parsed.status) {
                result.error = 'API retorno sin campo status';
                result.errors.push('No status field in response');
                return result;
            }
            if (parsed.status === 'error') {
                result.error = 'API retornó status: error';
                result.errors.push('API returned error status');
                return result;
            }
            if (parsed.status !== 'success') {
                result.error = 'API retornó status no exitoso: ' + parsed.status;
                result.errors.push('API status not success: ' + parsed.status);
                return result;
            }

            if (!parsed.registros || !Array.isArray(parsed.registros)) {
                result.error = 'API no retornó array de registros válido';
                result.errors.push('No valid registros array found in response');
                return result;
            }
            if (!parsed.registros.length) {
                result.error = 'API retornó array de registros vacío';
                result.errors.push('Empty registros array');
                return result;
            }

            let foundErrors = false;
            let successCount = 0;

            parsed.registros.forEach((registro, idx) => {
                if (registro.NUMERO_OS && registro.NUMERO_OS > 0 && !result.numeroOS) {
                    result.numeroOS = registro.NUMERO_OS;
                }
                if (registro.CODIGO_VEHICULO && !result.codigoVehiculo) {
                    result.codigoVehiculo = registro.CODIGO_VEHICULO;
                }

                if (registro.ESTADO) {
                    const estado = String(registro.ESTADO);
                    result.estados.push(estado);
                    const up = estado.toUpperCase();
                    if (up === 'OK' || up === 'SUCCESS' || up === 'COMPLETADO') successCount++;
                    else {
                        foundErrors = true;
                        result.errors.push(`Registro ${idx + 1}: ${estado}`);
                    }
                } else {
                    foundErrors = true;
                    result.errors.push(`Registro ${idx + 1}: Sin campo ESTADO`);
                }
            });

            if (!foundErrors && successCount > 0) {
                result.success = true;
                result.hasErrors = false;
                result.error = null;
            } else if (foundErrors) {
                result.success = false;
                result.hasErrors = true;
                result.error = 'Errores de validación encontrados';
            } else {
                result.success = false;
                result.hasErrors = true;
                result.error = 'No se encontraron estados exitosos';
            }

            log.debug('API parsed', {
                recordId,
                totalRegistros: parsed.registros.length,
                successCount,
                numeroOS: result.numeroOS,
                codigoVehiculo: result.codigoVehiculo
            });

            return result;

        } catch (e) {
            result.error = 'Error analizando respuesta API: ' + e.toString();
            result.errors.push('Analysis error: ' + e.toString());
            return result;
        }
    }

    /* =========================== HELPERS – MISC =========================== */


    /* ================================ UTILS =============================== */

    function mapDocType(v) {
        // mapeo del SQL: 1 OTROS, 2 DNI, 3 CE, 4 RUC, 5 PASAPORTE, 6 CEDULA
        switch (String(v || '')) {
            case '2':
                return 'DNI';
            case '3':
                return 'CARNET EXTRANJERIA';
            case '4':
                return 'RUC';
            case '5':
                return 'PASAPORTE';
            case '6':
                return 'CEDULA';
            case '1':
            default:
                return 'OTROS';
        }
    }

    function mapCentroUtilidad(deptName) {
        const upper = (deptName || '').toUpperCase();
        if (upper.indexOf('LIMA') >= 0) return {
            codigo: 'L100',
            nombre: deptName
        };
        if (upper.indexOf('AREQUIPA') >= 0) return {
            codigo: 'A300',
            nombre: deptName
        };
        if (upper.indexOf('TRUJILLO') >= 0) return {
            codigo: 'T200',
            nombre: deptName
        };
        return {
            codigo: 'L100',
            nombre: deptName || ''
        };
    }

    function normalizePhonePE(phone) {
        const p = String(phone || '').trim();
        if (p.indexOf('+51') === 0) return p.substring(3);
        return p;
    }

    function getYMD(nsDate) {
        if (!nsDate) return '';
        try {
            const d = (nsDate instanceof Date) ? nsDate : new Date(nsDate);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = ('0' + (d.getMonth() + 1)).slice(-2);
            const dd = ('0' + d.getDate()).slice(-2);
            return `${y}-${m}-${dd}`;
        } catch (_e) {
            return '';
        }
    }

    function safeStr(v) {
        return (v == null ? '' : String(v));
    }

    function toNumber(v) {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
    }

    function round2(n) {
        return Math.round((n + Number.EPSILON) * 100) / 100;
    }

    function toFixed2(n) {
        n = toNumber(n);
        return n.toFixed(2);
    }

    function rawId(v) {
        // Devuelve el id “en crudo” desde distintas formas:
        // - number o string (devuelve tal cual)
        // - { value, text } -> value
        // - [ { value, text }, ... ] -> value del primero
        // - { id } -> id
        if (v == null) return '';
        if (Array.isArray(v)) {
            return v.length ? rawId(v[0]) : '';
        }
        if (typeof v === 'object') {
            if ('value' in v) return v.value;
            if ('id' in v) return v.id;
            return '';
        }
        // string o number
        return v;
    }

    function valueOrId(v) {
        // Compat con el resto del código: devuelve el id “usable” como string
        const r = rawId(v);
        return (r == null) ? '' : String(r);
    }

    function logJson(title, obj) {
        try {
            const s = JSON.stringify(obj);
            log.debug(title, s.length > MAX_LOG_JSON ? s.substring(0, MAX_LOG_JSON) + ' ...' : s);
        } catch (e) {
            log.debug(title + ' (no JSON)', String(obj));
        }
    }

    /* ============================ EXPORTS ============================ */
    return {
        execute
    };
});
