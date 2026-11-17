/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @scriptid customscript_ht_pe_mr_impulso_px_cob
 * @deployment customdeploy_ht_pe_mr_impulso_px_cob
 *
 * Creado Por: JHON MONTES - 19/10/2026
 * Versión 2 - Envío masivo a PX como 001 (instalación) de OTs cuyo item tiene ADP 003 o 004.
 * SIN dependencias: no usa HU_TS_ScriptPlataformas_controller ni TS_CM_Constant. Arma el PxAdmin
 * igual que envioPXInstalacionDispositivoPeru y lo envía al RESTlet customscript_hu_rs_px_services.
 *
 * La serie del dispositivo NO sale de la OT (custrecord_ht_ot_serieproductoasignacion) sino de la cobertura:
 *   customrecord_ht_co_cobertura con
 *     custrecord_ht_co_bien         = custrecord_ht_ot_vehiculo de la OT
 *     custrecord_ht_co_propietario  = custrecord_ht_ot_cliente_id de la OT
 *     custrecord_ht_co_familia_prod = parámetro FAM del item de la OT (customrecord_ht_pp_main_param_prod)
 *     custrecord_ht_co_subsidiaria  = subsidiaria de la OT
 *   -> custrecord_ht_co_numeroserieproducto y fechas de cobertura. Si hay varias, toma la más reciente.
 *
 * Condiciones de impulso (las mismas que TS_UE_Orden_Trabajo_PE):
 *   - OT de la subsidiaria Perú, activa
 *   - custrecord_ht_ot_pxadminfinalizacion = F (se puede ignorar con CONFIG.IGNORAR_FINALIZADA)
 *   - custrecord_ht_ot_estado = CHEQUEADO (se puede ignorar con CONFIG.IGNORAR_ESTADO_OT)
 *   - Item con parámetro GPG = SI y ADP 003 o 004
 *
 * Antes de impulsar consulta si la orden de servicio ya está en PX (ConsultaOrden, misma lógica que
 * ht_pe_mr_consulta_px_validacion.js): primero con los dígitos finales del tranid (OS-PE-S001-1102338827 -> 1102338827)
 * y, si no la encuentra, anteponiendo el último dígito del código (S001 -> 11102338827). Si ya está, no se impulsa.
 * Al terminar genera un CSV con el resultado de cada OT y lo envía por correo.
 *
 * No usa parámetros de deployment: todo se configura en CONFIG.
 */
define([
    'N/email',
    'N/file',
    'N/https',
    'N/format',
    'N/log',
    'N/query',
    'N/record',
    'N/search'
], (email, file, https, format, log, query, record, search) => {

    /* ============================== CONFIGURACIÓN ============================== */
    const CONFIG = {
        // Grupo de OTs (internal id). Vacío = no filtra por OT.
        OTS: [],
        // Rango de fechas 'YYYY-MM-DD' sobre CAMPO_FECHA. Vacío = sin límite por ese lado.
        FECHA_DESDE: '',
        FECHA_HASTA: '',
        // Campo de la OT para el rango: 'created' | 'lastmodified' | 'custrecord_ht_ot_fechatrabajoasignacion'
        CAMPO_FECHA: 'created',
        // true = no exige que la OT esté en estado CHEQUEADO
        IGNORAR_ESTADO_OT: false,
        // true = reenvía aunque la OT ya tenga custrecord_ht_ot_pxadminfinalizacion = T
        IGNORAR_FINALIZADA: false,
        // true = no exige GPG = SI en el item
        IGNORAR_GPG: false,
        // true = consulta PX y arma el PxAdmin (queda en el log), pero no lo envía ni modifica la OT
        SOLO_SIMULAR: false,
        // Máximo de OTs a procesar en la corrida. 0 = sin límite.
        LIMITE_OTS: 0,
        // Protección: si no hay OTS ni fechas, no procesa nada salvo que esto sea true
        PERMITIR_SIN_FILTRO: false,

        // Consultar en PX si la orden ya existe antes de impulsar
        CONSULTAR_PX_ANTES: true,
        // true = si la consulta a PX falla (error de conexión / autenticación), igual impulsa
        IMPULSAR_SI_FALLA_CONSULTA: false,
        // true = si la orden ya está en PX, marca la OT con custrecord_ht_ot_pxadminfinalizacion = T
        MARCAR_FINALIZADA_SI_EN_PX: false,

        // Correo con el CSV. CORREO_AUTOR = internal id de un empleado activo.
        ENVIAR_CORREO: true,
        CORREO_AUTOR: 49599,
        // Internal ids de empleado o direcciones de correo. Vacío = se envía al autor.
        CORREO_DESTINATARIOS: [],
        // Carpeta del File Cabinet donde se guarda el CSV. null = no se guarda (solo se adjunta).
        CARPETA_CSV: 552150
    };
    /* =========================================================================== */

    const TAG = 'IMPULSO-PX-MR-COB';
    const ESTADO = { ENVIADO: 'ENVIADO', ERROR: 'ERROR', OMITIDO: 'OMITIDO', SIMULADO: 'SIMULADO', EN_PX: 'YA_EN_PX' };
    const RECORD_TYPE_OT = 'customrecord_ht_record_ordentrabajo';

    // Valores copiados de TS_CM_Constant / HU_TS_ScriptPlataformas_controller (mantener sincronizados)
    const URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx';
    const PX_USUARIO = 'NetSuite';
    const PX_CLAVE = 'NS*25#01@%j?i';
    const PX_RESTLET = { scriptId: 'customscript_hu_rs_px_services', deploymentId: 'customdeploy_hu_rs_px_services' };
    const PARAM_ADP_ACCION_DEL_PRODUCTO = 109;
    const PARAM_FAM_FAMILIA_DE_PRODUCTOS = 130;
    const PARAM_GPG_GENERA_PARAMETRIZACION_EN_GEOSYS = 136;
    const VALOR_SI = 331;
    const ESTADO_OT_CHEQUEADO = 2;
    const ADP_PERMITIDOS = { 319: '003', 320: '004' }; // internal id del valor ADP -> código
    const OPERACION_ORDEN_INSTALACION = '001';
    const CODIGOS_SERVICIO_EMERGENCIA = ['042', '046', '047', '048', '049'];

    // Perú (subsidiaria 3)
    const SUBSIDIARIA_PE = '3';
    const NACIONALIDAD = 'PE';
    const PREFIJO_TELEFONO = '+51';
    const TIPO_TELEFONO_CELULAR = 4;
    const TIPO_TELEFONO_CONVENCIONAL = 4;
    const TIPO_EMAIL = 112;

    /* ---------------------------------------------------------------- utilidades */

    const valorLista = (campo) => {
        if (Array.isArray(campo)) return campo.length ? campo[0].value : '';
        return campo || '';
    };

    const textoLista = (campo) => {
        if (Array.isArray(campo)) return campo.length ? campo[0].text : '';
        return campo || '';
    };

    const escaparXml = (valor) => String(valor || '').replace(/&/g, '&amp;');

    const limpiarTelefono = (valor) => String(valor || '').replace(PREFIJO_TELEFONO, '0');

    const primerValorSql = (sql, params, columna) => {
        const res = query.runSuiteQL({ query: sql, params }).asMappedResults();
        return res.length ? res[0][columna] : null;
    };

    /* ---------------------------------------------------------------- selección de OTs */

    const fechaNetSuite = (texto) => {
        const [anio, mes, dia] = texto.split('-').map(Number);
        return format.format({ value: new Date(anio, mes - 1, dia), type: format.Type.DATE });
    };

    /** itemId -> internal id del valor, para los items que tienen el parámetro con alguno de los valores. */
    const itemsConParametro = (parametroId, valores) => {
        const items = {};
        const paged = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', parametroId],
                'AND',
                ['custrecord_ht_pp_parametrizacion_valor', 'anyof', valores],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['custrecord_ht_pp_parametrizacionid', 'custrecord_ht_pp_parametrizacion_valor']
        }).runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pageRange) => {
            paged.fetch({ index: pageRange.index }).data.forEach((r) => {
                items[r.getValue('custrecord_ht_pp_parametrizacionid')] = r.getValue('custrecord_ht_pp_parametrizacion_valor');
            });
        });
        return items;
    };

    /** Items con ADP 003/004 (y GPG = SI salvo IGNORAR_GPG). itemId -> código ADP. */
    const obtenerItemsImpulsables = () => {
        const itemsAdp = itemsConParametro(PARAM_ADP_ACCION_DEL_PRODUCTO, Object.keys(ADP_PERMITIDOS));
        const itemsGpg = CONFIG.IGNORAR_GPG ? null : itemsConParametro(PARAM_GPG_GENERA_PARAMETRIZACION_EN_GEOSYS, [VALOR_SI]);
        const resultado = {};
        Object.keys(itemsAdp).forEach((itemId) => {
            if (itemsGpg && !itemsGpg[itemId]) return;
            resultado[itemId] = ADP_PERMITIDOS[itemsAdp[itemId]];
        });
        return resultado;
    };

    const construirFiltrosOt = (itemIds) => {
        const filtros = [
            ['isinactive', 'is', 'F'],
            'AND',
            ['custrecord_ht_ot_subsidiary', 'anyof', SUBSIDIARIA_PE],
            'AND',
            ['custrecord_ht_ot_item', 'anyof', itemIds]
        ];
        if (!CONFIG.IGNORAR_FINALIZADA) filtros.push('AND', ['custrecord_ht_ot_pxadminfinalizacion', 'is', 'F']);
        if (!CONFIG.IGNORAR_ESTADO_OT) filtros.push('AND', ['custrecord_ht_ot_estado', 'anyof', ESTADO_OT_CHEQUEADO]);
        if (CONFIG.OTS.length) filtros.push('AND', ['internalid', 'anyof', CONFIG.OTS]);
        if (CONFIG.FECHA_DESDE) filtros.push('AND', [CONFIG.CAMPO_FECHA, 'onorafter', fechaNetSuite(CONFIG.FECHA_DESDE)]);
        if (CONFIG.FECHA_HASTA) filtros.push('AND', [CONFIG.CAMPO_FECHA, 'onorbefore', fechaNetSuite(CONFIG.FECHA_HASTA)]);
        return filtros;
    };

    /* ---------------------------------------------------------------- lectura de datos */

    /** internal id de la familia (FAM) del item: es lo que guarda custrecord_ht_co_familia_prod. */
    const obtenerFamiliaId = (itemId) => {
        const res = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacionid', 'anyof', itemId],
                'AND',
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', PARAM_FAM_FAMILIA_DE_PRODUCTOS]
            ],
            columns: ['custrecord_ht_pp_parametrizacion_valor']
        }).run().getRange({ start: 0, end: 1 });
        return res && res.length ? res[0].getValue('custrecord_ht_pp_parametrizacion_valor') : null;
    };

    const buscarCobertura = (bienId, familiaId, clienteId, subsidiaria) => {
        const res = search.create({
            type: 'customrecord_ht_co_cobertura',
            filters: [
                ['custrecord_ht_co_bien', 'anyof', bienId],
                'AND',
                ['custrecord_ht_co_familia_prod', 'anyof', familiaId],
                'AND',
                ['custrecord_ht_co_propietario', 'anyof', clienteId],
                'AND',
                ['custrecord_ht_co_subsidiaria', 'anyof', subsidiaria],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: [
                search.createColumn({ name: 'internalid', sort: search.Sort.DESC }),
                search.createColumn({ name: 'name' }),
                search.createColumn({ name: 'custrecord_ht_co_numeroserieproducto' }),
                search.createColumn({ name: 'custrecord_ht_co_familia_prod' }),
                search.createColumn({ name: 'custrecord_ht_co_estado_cobertura' }),
                search.createColumn({ name: 'custrecord_ht_co_coberturainicial' }),
                search.createColumn({ name: 'custrecord_ht_co_coberturafinal' }),
                search.createColumn({ name: 'formulatext', formula: "to_char({custrecord_ht_co_coberturainicial}, 'YYYY-MM-DD')" }),
                search.createColumn({ name: 'formulatext', formula: "to_char({custrecord_ht_co_coberturafinal}, 'YYYY-MM-DD')" })
            ]
        }).run().getRange({ start: 0, end: 1 });
        if (!res || !res.length) return null;
        const r = res[0];
        const inicial = r.getValue('custrecord_ht_co_coberturainicial');
        const final = r.getValue('custrecord_ht_co_coberturafinal');
        return {
            id: r.getValue('internalid'),
            name: r.getValue('name'),
            serie: r.getValue('custrecord_ht_co_numeroserieproducto'),
            familiaTexto: r.getText('custrecord_ht_co_familia_prod'),
            estado: r.getText('custrecord_ht_co_estado_cobertura'),
            inicial: inicial ? format.parse({ value: inicial, type: format.Type.DATE }) : '',
            final: final ? format.parse({ value: final, type: format.Type.DATE }) : '',
            inicialTexto: r.getValue(r.columns[7]),
            finalTexto: r.getValue(r.columns[8])
        };
    };

    const obtenerDispositivo = (serieId) => search.lookupFields({
        type: 'customrecord_ht_record_mantchaser',
        id: serieId,
        columns: [
            'custrecord_ht_mc_vid',
            'custrecord_ht_mc_modelo',
            'custrecord_ht_mc_unidad',
            'custrecord_ht_mc_imei',
            'custrecord_ht_mc_nocelularsim',
            'custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip',
            'custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr',
            'custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip',
            'custrecord_ht_mc_macaddress',
            'custrecord_ht_mc_sn',
            'custrecord_ht_mc_numero_camara',
            'custrecord_ht_mc_icc'
        ]
    });

    const obtenerVehiculo = (bienId) => search.lookupFields({
        type: 'customrecord_ht_record_bienes',
        id: bienId,
        columns: [
            'name',
            'altname',
            'custrecord_ht_bien_placa',
            'custrecord_ht_bien_marca',
            'custrecord_ht_bien_modelo',
            'custrecord_ht_bien_chasis',
            'custrecord_ht_bien_motor',
            'custrecord_ht_bien_ano',
            'custrecord_ht_bien_codsysh',
            'custrecord_ht_bn_estadobien',
            'custrecord_ht_bien_tipobien',
            'custrecord_ht_bien_telefono_emergencia',
            'custrecord_ht_bien_nom_embarcacion',
            'custrecord_ht_serie_pro',
            'custrecord_ht_bien_marca.custrecord_ht_marca_descripcion',
            'custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion',
            'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion',
            'custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion'
        ]
    });

    /** Datos de contacto del cliente (propietario o monitoreo), igual que obtenerPropietario del controller. */
    const obtenerCliente = (clienteId) => {
        const email = primerValorSql(
            'SELECT custrecord_ht_email_email as email FROM customrecord_ht_record_correoelectronico WHERE custrecord_ht_email_tipoemail = ? AND custrecord_ht_ce_enlace = ?',
            [TIPO_EMAIL, clienteId], 'email') || '';
        const sqlTelefono = 'SELECT custrecord_ht_campo_txt_telefono as telefono FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = ? AND custrecord_ht_campo_lbl_entidad_telefono = ?';
        const celular = limpiarTelefono(primerValorSql(sqlTelefono, [TIPO_TELEFONO_CELULAR, clienteId], 'telefono'));
        const convencional = limpiarTelefono(primerValorSql(sqlTelefono, [TIPO_TELEFONO_CONVENCIONAL, clienteId], 'telefono'));

        let direccion = '';
        const nkey = primerValorSql('SELECT addressbookaddress FROM customeraddressbook WHERE entity = ?', [clienteId], 'addressbookaddress');
        if (nkey) {
            const dir = query.runSuiteQL({
                query: 'SELECT addr1, addr2, city, zip, country FROM customerAddressbookEntityAddress WHERE nkey = ?',
                params: [nkey]
            }).asMappedResults();
            if (dir.length) {
                direccion = ['addr1', 'addr2', 'city', 'zip', 'country'].map((c) => (dir[0][c] == null ? '' : dir[0][c])).join(' ');
            }
        }

        const c = search.lookupFields({
            type: 'customer',
            id: clienteId,
            columns: [
                'vatregnumber', 'companyname', 'isperson',
                'custentity_ht_cl_primernombre', 'custentity_ht_cl_segundonombre',
                'custentity_ht_cl_apellidopaterno', 'custentity_ht_cl_apellidomaterno'
            ]
        });
        const esPersona = c.isperson === true || c.isperson === 'T';
        return {
            vatregnumber: c.vatregnumber || '',
            primerNombre: esPersona ? c.custentity_ht_cl_primernombre : c.companyname,
            segundoNombre: esPersona ? c.custentity_ht_cl_segundonombre : '',
            apellidoPaterno: esPersona ? c.custentity_ht_cl_apellidopaterno : c.companyname,
            apellidoMaterno: esPersona ? c.custentity_ht_cl_apellidomaterno : '',
            direccion,
            celular,
            convencional,
            email
        };
    };

    /** Cliente de monitoreo de la OS: la línea del item de la OT, o la primera con cliente de monitoreo. */
    const obtenerClienteMonitoreoId = (ordenVenta, itemId) => {
        const lineas = ordenVenta.getLineCount({ sublistId: 'item' });
        let clienteMonitoreo = null;
        for (let j = 0; j < lineas; j++) {
            const item = ordenVenta.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
            clienteMonitoreo = ordenVenta.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente_monitoreo', line: j });
            if (item == itemId || clienteMonitoreo) break;
        }
        return clienteMonitoreo || null;
    };

    const obtenerCanalDistribucion = (canalId) => {
        if (!canalId) return null;
        return search.lookupFields({
            type: 'customrecord_ht_record_canaldistribucion',
            id: canalId,
            columns: [
                'custrecord_ht_cd_ruccanaldistribucion',
                'custrecord_ht_cd_nombre',
                'custrecord_ht_cd_telefono',
                'custrecord_ht_cd_direccion',
                'custrecord_ht_cd_email',
                'custrecord_ht_cd_convencional'
            ]
        });
    };

    const obtenerConvenio = (ordenVenta, bienId) => {
        const bienes = query.runSuiteQL({
            query: 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? and custrecord_bn_subsidiaria = ?',
            params: [bienId, SUBSIDIARIA_PE]
        }).asMappedResults();
        const convenioId = bienes.length ? bienes[0]['custrecord_ht_bien_conveniovehiculo'] : ordenVenta.getValue('custbody_ht_os_convenio');
        if (!convenioId) return null;
        return search.lookupFields({
            type: 'customrecord_ht_record_convenio',
            id: convenioId,
            columns: [
                'custrecord_ht_cn_ruc_convenio',
                'custrecord_ht_cn_razon_social',
                'custrecord_ht_cn_direccion',
                'custrecord_ht_cn_celular',
                'custrecord_ht_cn_email',
                'custrecord_ht_cn_convencional'
            ]
        });
    };

    const obtenerLocation = (locationId) => primerValorSql(
        'SELECT Location.name FROM Location JOIN locationSubsidiaryMap ON location.id = locationSubsidiaryMap.location JOIN Subsidiary ON locationSubsidiaryMap.subsidiary = Subsidiary.id WHERE location.id = ? and Subsidiary.id = ?',
        [locationId, SUBSIDIARIA_PE], 'name') || '';

    const obtenerEjecutiva = (empleadoId) => {
        const res = query.runSuiteQL({
            query: 'SELECT firstname, lastname FROM employee WHERE id = ? and subsidiary = ?',
            params: [empleadoId, SUBSIDIARIA_PE]
        }).asMappedResults();
        return res.length ? `${res[0]['firstname']} ${res[0]['lastname']}` : '';
    };

    /* ---------------------------------------------------------------- armado del PxAdmin (operación 001) */

    const fechaHoy = () => {
        const d = new Date();
        return { anio: d.getFullYear(), mes: String(d.getMonth() + 1).padStart(2, '0'), dia: String(d.getDate()).padStart(2, '0') };
    };

    const crearPxAdminVacio = () => {
        const { anio, mes, dia } = fechaHoy();
        const PxAdmin = {
            StrToken: `SH2PX${anio}${mes}${dia}`,
            UserName: PX_USUARIO,
            Password: PX_CLAVE,
            NACIONALIDAD: '',
            URLPX: '',
            UsuarioIngreso: '',
            FileName: '',
            Respuesta: ''
        };
        [
            'NumeroOrden', 'NombreEjecutiva', 'Ciudad', 'Sucursal', 'EstadoCartera', 'FechaInicioCobertura', 'FechaFinCobertura',
            'Placa', 'IdMarca', 'DescMarca', 'IdModelo', 'DescModelo', 'CodigoVehiculo', 'Chasis', 'Motor', 'Color', 'Anio', 'Tipo', 'Emergencia',
            'Vid', 'IdProducto', 'DescProducto', 'CodMarcaDispositivo', 'MarcaDispositivo', 'CodModeloDispositivo', 'ModeloDispositivo',
            'Sn', 'Imei', 'NumeroCamaras', 'DireccionMac', 'Icc', 'NumeroCelular', 'Operadora', 'ServiciosInstalados', 'OperacionDispositivo', 'VidAnterior',
            'CodServicio', 'DescripcionServicio', 'FechaInicioServicio', 'FechaFinServicio', 'EstadoServicio'
        ].forEach((campo) => { PxAdmin[campo] = ''; });
        ['Propietario', 'Monitorea', 'Concesionario', 'Financiera', 'Aseguradora', 'Convenio'].forEach((entidad) => {
            const prefijos = entidad === 'Propietario' || entidad === 'Monitorea'
                ? ['Identificador', 'Nombre', 'Apellidos', 'Direccion', 'Convencional', 'Celular', 'Email']
                : ['Identificador', 'RazonSocial', 'Direccion', 'Convencional', 'Celular', 'Email'];
            prefijos.forEach((p) => { PxAdmin[`${p}${entidad}`] = ''; });
        });
        PxAdmin.EstadoSim = 'ACTIVO';
        return PxAdmin;
    };

    const setOrdenValues = (PxAdmin, tranid, vehiculo, cobertura, location, ejecutiva) => {
        const { anio, mes, dia } = fechaHoy();
        PxAdmin.NumeroOrden = tranid.replace('S001', '').replace('M001', '').replace('T002', '').replace('A002', '').replace(/\D/g, '');
        PxAdmin.FileName = `${tranid.replace('S001', '').replace('M001', '').replace(/\D/g, '')}_${anio}${mes}${dia}`;
        PxAdmin.NACIONALIDAD = NACIONALIDAD;
        PxAdmin.UsuarioIngreso = `OPERAD_${NACIONALIDAD}`;
        PxAdmin.EstadoCartera = textoLista(vehiculo.custrecord_ht_bn_estadobien);
        PxAdmin.NombreEjecutiva = ejecutiva;
        PxAdmin.Sucursal = location;
        PxAdmin.Ciudad = location;
        PxAdmin.FechaInicioCobertura = cobertura.inicial;
        PxAdmin.FechaFinCobertura = cobertura.final;
    };

    const setVehiculoValues = (PxAdmin, vehiculo) => {
        let placa = vehiculo.custrecord_ht_bien_placa;
        let chasis = vehiculo.custrecord_ht_bien_chasis;
        let motor = vehiculo.custrecord_ht_bien_motor;
        switch (valorLista(vehiculo.custrecord_ht_bien_tipobien)) {
            case '6': // MARÍTIMO
                placa = vehiculo.custrecord_ht_bien_nom_embarcacion;
                chasis = vehiculo.altname;
                motor = vehiculo.altname;
                break;
            case '7': // TANQUE
                placa = vehiculo.custrecord_ht_bien_nom_embarcacion;
                chasis = 'NO DEFINIDO';
                motor = 'NO DEFINIDO';
                break;
            case '8': // INMUEBLE
                placa = vehiculo.altname;
                chasis = vehiculo.altname;
                motor = vehiculo.altname;
                break;
            case '9': // PRODUCCIÓN
                placa = vehiculo.custrecord_ht_serie_pro;
                chasis = vehiculo.altname;
                motor = vehiculo.altname;
                break;
            default:
                break;
        }
        PxAdmin.Emergencia = vehiculo.custrecord_ht_bien_telefono_emergencia;
        PxAdmin.Placa = placa;
        PxAdmin.IdMarca = valorLista(vehiculo.custrecord_ht_bien_marca);
        PxAdmin.DescMarca = vehiculo['custrecord_ht_bien_marca.custrecord_ht_marca_descripcion'] || '';
        PxAdmin.IdModelo = valorLista(vehiculo.custrecord_ht_bien_modelo);
        PxAdmin.DescModelo = vehiculo['custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion'];
        PxAdmin.CodigoVehiculo = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        PxAdmin.Chasis = chasis;
        PxAdmin.Motor = motor;
        PxAdmin.Color = vehiculo['custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion'];
        PxAdmin.Anio = vehiculo.custrecord_ht_bien_ano;
        PxAdmin.Tipo = vehiculo['custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion'];
    };

    const setDispositivoValues = (PxAdmin, dispositivo, productoTexto) => {
        const producto = productoTexto ? productoTexto.split(' - ') : [];
        PxAdmin.Vid = dispositivo.custrecord_ht_mc_vid;
        PxAdmin.IdProducto = (producto[0] || '').substr(0, 5);
        PxAdmin.DescProducto = producto.length > 1 ? producto[1] : '';
        PxAdmin.CodMarcaDispositivo = valorLista(dispositivo.custrecord_ht_mc_unidad);
        PxAdmin.MarcaDispositivo = dispositivo['custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip'];
        PxAdmin.CodModeloDispositivo = valorLista(dispositivo.custrecord_ht_mc_modelo);
        PxAdmin.ModeloDispositivo = dispositivo['custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr'];
        PxAdmin.Sn = dispositivo.custrecord_ht_mc_sn;
        PxAdmin.Imei = dispositivo.custrecord_ht_mc_imei;
        PxAdmin.NumeroCamaras = escaparXml(dispositivo.custrecord_ht_mc_numero_camara) || '0';
        PxAdmin.DireccionMac = dispositivo.custrecord_ht_mc_macaddress;
        PxAdmin.Icc = dispositivo.custrecord_ht_mc_icc;
        PxAdmin.NumeroCelular = dispositivo.custrecord_ht_mc_nocelularsim;
        PxAdmin.Operadora = dispositivo['custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip'];
        PxAdmin.EstadoSim = 'ACT';
        PxAdmin.OperacionDispositivo = 'I';
    };

    /** sufijo = 'Propietario' | 'Monitorea' */
    const setPersonaValues = (PxAdmin, cliente, sufijo) => {
        PxAdmin[`Identificador${sufijo}`] = cliente.vatregnumber;
        PxAdmin[`Nombre${sufijo}`] = `${escaparXml(cliente.primerNombre)} ${escaparXml(cliente.segundoNombre)}`;
        PxAdmin[`Apellidos${sufijo}`] = `${escaparXml(cliente.apellidoPaterno)} ${escaparXml(cliente.apellidoMaterno)}`;
        PxAdmin[`Direccion${sufijo}`] = escaparXml(cliente.direccion);
        PxAdmin[`Celular${sufijo}`] = cliente.celular;
        PxAdmin[`Email${sufijo}`] = cliente.email;
        // El controller manda al propietario el convencional o, si no hay, el celular; al monitoreo solo el convencional.
        PxAdmin[`Convencional${sufijo}`] = sufijo === 'Propietario' ? (cliente.convencional || cliente.celular) : cliente.convencional;
    };

    /** sufijo = 'Aseguradora' | 'Concesionario' | 'Financiera' */
    const setCanalValues = (PxAdmin, canal, sufijo) => {
        if (!canal || !canal.custrecord_ht_cd_nombre) return;
        PxAdmin[`Identificador${sufijo}`] = canal.custrecord_ht_cd_ruccanaldistribucion || '';
        PxAdmin[`RazonSocial${sufijo}`] = escaparXml(canal.custrecord_ht_cd_nombre);
        PxAdmin[`Direccion${sufijo}`] = escaparXml(canal.custrecord_ht_cd_direccion);
        PxAdmin[`Convencional${sufijo}`] = limpiarTelefono(canal.custrecord_ht_cd_convencional);
        PxAdmin[`Celular${sufijo}`] = limpiarTelefono(canal.custrecord_ht_cd_telefono);
        PxAdmin[`Email${sufijo}`] = canal.custrecord_ht_cd_email || '';
    };

    const setConvenioValues = (PxAdmin, convenio) => {
        if (!convenio || !convenio.custrecord_ht_cn_ruc_convenio) return;
        PxAdmin.IdentificadorConvenio = convenio.custrecord_ht_cn_ruc_convenio || '';
        PxAdmin.RazonSocialConvenio = convenio.custrecord_ht_cn_razon_social || '';
        PxAdmin.DireccionConvenio = convenio.custrecord_ht_cn_direccion || '';
        PxAdmin.ConvencionalConvenio = limpiarTelefono(convenio.custrecord_ht_cn_convencional);
        PxAdmin.CelularConvenio = limpiarTelefono(convenio.custrecord_ht_cn_celular);
        PxAdmin.EmailConvenio = convenio.custrecord_ht_cn_email || '';
    };

    const setServiciosValues = (PxAdmin, servicios, cobertura) => {
        PxAdmin.Alerta = 'N';
        if (!servicios || !servicios.length) {
            PxAdmin.Servicios = '<ServiciosInstalados />';
            return;
        }
        let xml = '<ServiciosInstalados>';
        servicios.forEach((servicio) => {
            const [codigo, descripcion] = servicio.split(' - ');
            xml += `<Servicio><CodServicio>${codigo}</CodServicio>`;
            xml += `<DescripcionServicio>${descripcion}</DescripcionServicio>`;
            xml += `<FechaInicioServicio>${cobertura.inicialTexto}</FechaInicioServicio>`;
            xml += `<FechaFinServicio>${cobertura.finalTexto}</FechaFinServicio>`;
            xml += '<EstadoServicio>ACTIVO</EstadoServicio>';
            xml += '</Servicio>';
            if (CODIGOS_SERVICIO_EMERGENCIA.includes(codigo)) PxAdmin.Alerta = 'S';
        });
        PxAdmin.Servicios = `${xml}</ServiciosInstalados>`;
    };

    /* ---------------------------------------------------------------- envío */

    const crearRegistroImpulso = (otId) => {
        const registro = record.create({ type: 'customrecord_ts_regis_impulso_plataforma' });
        registro.setValue('custrecord_ts_reg_imp_plt_ordentrabajo', otId);
        registro.setValue('custrecord_ts_reg_imp_plt_activo_fijo', '');
        registro.setValue('custrecord_ts_reg_imp_plt_estado', 'Enviado');
        registro.setValue('custrecord_ts_reg_imp_plt_plataforma', 'PX');
        return registro.save();
    };

    const actualizarRegistroImpulso = (registroId, estado, mensaje) => {
        record.submitFields({
            type: 'customrecord_ts_regis_impulso_plataforma',
            id: registroId,
            values: { custrecord_ts_reg_imp_plt_estado: estado, custrecord_ts_reg_imp_plt_mensaje: mensaje }
        });
    };

    const enviarPx = (PxAdmin) => https.requestRestlet({
        body: JSON.stringify(PxAdmin),
        scriptId: PX_RESTLET.scriptId,
        deploymentId: PX_RESTLET.deploymentId,
        headers: { 'Accept': '*/*', 'Content-Type': 'application/json' }
    });

    /* ---------------------------------------------------------------- consulta PX */
    // Copiado de ht_pe_mr_consulta_px_validacion.js (mantener sincronizado)

    const PX_SOAP = {
        NS: 'http://tempuri.org/',
        METODO: 'ConsultaOrden',
        PARAM: 'strNumeroOrden',
        PARAM_NACIONALIDAD: 'strNacionalidad'
    };

    const obtenerStrToken = () => {
        const { anio, mes, dia } = fechaHoy();
        return `SH2PX${anio}${mes}${dia}`;
    };

    const escSoap = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const unescapeXml = (v) => String(v ?? '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

    const headerSeguridad = (strToken, authToken) =>
        '<soap:Header>' +
        `<SeguridadPx xmlns="${PX_SOAP.NS}">` +
        `<StrToken>${escSoap(strToken)}</StrToken>` +
        (authToken ? `<AutenticacionToken>${escSoap(authToken)}</AutenticacionToken>` : '') +
        `<UserName>${escSoap(PX_USUARIO)}</UserName>` +
        `<Password>${escSoap(PX_CLAVE)}</Password>` +
        '</SeguridadPx></soap:Header>';

    const envelope = (header, body) =>
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
        'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
        header + '<soap:Body>' + body + '</soap:Body></soap:Envelope>';

    const postSoap = (metodo, xml) => https.post({
        url: `${URLPX}?op=${metodo}`,
        headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': `${PX_SOAP.NS}${metodo}` },
        body: xml
    });

    const extraerTag = (body, tag) => {
        const m = String(body).match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
        return m ? m[1] : null;
    };

    const autenticarPx = (strToken) => {
        const resp = postSoap('AutenticacionUsuarioPx', envelope(headerSeguridad(strToken), `<AutenticacionUsuarioPx xmlns="${PX_SOAP.NS}" />`));
        const token = extraerTag(resp.body, 'AutenticacionUsuarioPxResult');
        if (!token || token === '-1') throw new Error(`Autenticacion PX fallida: ${resp.body}`);
        return token;
    };

    // Convierte el DataSet (.NET diffgram) en un arreglo de filas { CAMPO: valor }
    const parsearFilas = (xmlTexto) => {
        const sinSchema = xmlTexto.replace(/<xs:schema[\s\S]*?<\/xs:schema>/, '');
        const filas = [];
        const reFila = /<(\w+) diffgr:id="[^"]*"[^>]*>([\s\S]*?)<\/\1>/g;
        let f;
        while ((f = reFila.exec(sinSchema)) !== null) {
            const fila = {};
            const reCampo = /<([^\s<>\/]+)>([^<]*)<\/\1>/g;
            let c;
            while ((c = reCampo.exec(f[2])) !== null) fila[c[1]] = c[2];
            filas.push(fila);
        }
        return filas;
    };

    const consultarOrdenPx = (strToken, authToken, numero) => {
        const body =
            `<${PX_SOAP.METODO} xmlns="${PX_SOAP.NS}">` +
            `<${PX_SOAP.PARAM}>${escSoap(numero)}</${PX_SOAP.PARAM}>` +
            `<${PX_SOAP.PARAM_NACIONALIDAD}>${NACIONALIDAD}</${PX_SOAP.PARAM_NACIONALIDAD}>` +
            `</${PX_SOAP.METODO}>`;
        const resp = postSoap(PX_SOAP.METODO, envelope(headerSeguridad(strToken, authToken), body));
        if (resp.code !== 200) {
            return { ok: false, error: extraerTag(resp.body, 'faultstring') || `HTTP ${resp.code}` };
        }
        return { ok: true, filas: parsearFilas(unescapeXml(extraerTag(resp.body, `${PX_SOAP.METODO}Result`) || '')) };
    };

    /** OS-PE-S001-1102338827 -> ['1102338827', '11102338827'] (último dígito del código S001 antepuesto). */
    const obtenerNumerosOrden = (tranid) => {
        const base = String(tranid).split('-').pop().replace(/\D/g, '');
        const m = String(tranid).match(/-[A-Z](\d{3})-/);
        const prefijo = m ? m[1].slice(-1) : '1';
        return [base, `${prefijo}${base}`];
    };

    /** { consulta: 'SI' | 'NO' | 'ERROR', numero, detalle } */
    const consultarEnPx = (tranid) => {
        const intentos = obtenerNumerosOrden(tranid);
        const strToken = obtenerStrToken();
        const authToken = autenticarPx(strToken);
        const fallas = [];
        for (const numero of intentos) {
            const r = consultarOrdenPx(strToken, authToken, numero);
            if (!r.ok) {
                fallas.push(`${numero}: ${r.error}`);
                continue;
            }
            if (r.filas.length) {
                return { consulta: 'SI', numero, detalle: JSON.stringify(r.filas.length === 1 ? r.filas[0] : r.filas) };
            }
        }
        if (fallas.length === intentos.length) return { consulta: 'ERROR', numero: intentos.join(' / '), detalle: fallas.join(' | ') };
        return { consulta: 'NO', numero: intentos.join(' / '), detalle: fallas.length ? fallas.join(' | ') : 'SIN RESULTADOS' };
    };

    const marcarOtFinalizada = (otId) => {
        record.submitFields({
            type: RECORD_TYPE_OT,
            id: otId,
            values: { custrecord_ht_ot_pxadminfinalizacion: true, custrecord_ht_ot_noimpulsaplataformas: false },
            options: { enableSourcing: false, ignoreMandatoryFields: true }
        });
    };

    /* ---------------------------------------------------------------- proceso por OT */

    /** res se va completando (tranid, consulta PX, cobertura...) para que llegue al CSV aunque haya una excepción. */
    const procesarOt = (res) => {
        const otId = res.ot;
        const fin = (estado, mensaje) => Object.assign(res, { estado, mensaje: mensaje || '' });

        const ot = record.load({ type: RECORD_TYPE_OT, id: otId });
        const subsidiaria = String(ot.getValue('custrecord_ht_ot_subsidiary'));
        const itemId = ot.getValue('custrecord_ht_ot_item');
        const bienId = ot.getValue('custrecord_ht_ot_vehiculo');
        const clienteId = ot.getValue('custrecord_ht_ot_cliente_id');
        const soId = ot.getValue('custrecord_ht_ot_orden_servicio');
        res.otNombre = ot.getValue('name');

        // Solo ADP 003 / 004.
        if (Object.values(ADP_PERMITIDOS).indexOf(res.adp) === -1) {
            return fin(ESTADO.OMITIDO, `ADP ${res.adp || 'vacío'} no es 003/004`);
        }
        // Se vuelve a validar por si la OT se impulsó entre getInputData y map.
        if (ot.getValue('custrecord_ht_ot_pxadminfinalizacion') === true && !CONFIG.IGNORAR_FINALIZADA) {
            return fin(ESTADO.OMITIDO, 'OT ya impulsada (custrecord_ht_ot_pxadminfinalizacion)');
        }
        if (!bienId || !clienteId || !soId) {
            return fin(ESTADO.ERROR, 'La OT no tiene bien, cliente u orden de servicio');
        }

        const ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: soId });
        res.tranid = ordenVenta.getValue('tranid');

        if (CONFIG.CONSULTAR_PX_ANTES) {
            try {
                res.px = consultarEnPx(res.tranid);
            } catch (e) {
                res.px = { consulta: 'ERROR', numero: obtenerNumerosOrden(res.tranid).join(' / '), detalle: e.message };
            }
            log.debug(`${TAG}-CONSULTA-PX`, { ot: otId, tranid: res.tranid, px: res.px });
            if (res.px.consulta === 'SI') {
                if (CONFIG.MARCAR_FINALIZADA_SI_EN_PX && !CONFIG.SOLO_SIMULAR) marcarOtFinalizada(otId);
                return fin(ESTADO.EN_PX, `La orden ya está en PX (número ${res.px.numero}), no se impulsa`);
            }
            if (res.px.consulta === 'ERROR' && !CONFIG.IMPULSAR_SI_FALLA_CONSULTA) {
                return fin(ESTADO.ERROR, 'No se pudo consultar PX, no se impulsa');
            }
        }

        const familiaId = obtenerFamiliaId(itemId);
        if (!familiaId) return fin(ESTADO.ERROR, 'El item no tiene parámetro FAM (familia de productos)');

        const cobertura = buscarCobertura(bienId, familiaId, clienteId, subsidiaria);
        if (!cobertura) return fin(ESTADO.ERROR, 'No se encontró cobertura para bien + familia + cliente');
        res.cobertura = cobertura.name || cobertura.id;
        res.serie = cobertura.serie;
        if (!cobertura.serie) return fin(ESTADO.ERROR, `La cobertura ${res.cobertura} no tiene serie de producto`);
        if (!cobertura.inicial || !cobertura.final) return fin(ESTADO.ERROR, `La cobertura ${res.cobertura} no tiene fechas de cobertura`);

        const vehiculo = obtenerVehiculo(bienId);
        const dispositivo = obtenerDispositivo(cobertura.serie);
        const propietario = obtenerCliente(clienteId);
        const clienteMonitoreoId = obtenerClienteMonitoreoId(ordenVenta, itemId);
        const monitoreo = clienteMonitoreoId ? obtenerCliente(clienteMonitoreoId) : null;
        const servicios = ot.getText('custrecord_ht_ot_servicios_commands') || [];
        const productoTexto = cobertura.familiaTexto || ot.getText('custrecord_ht_ot_producto') || '';

        const PxAdmin = crearPxAdminVacio();
        setOrdenValues(PxAdmin, ordenVenta.getValue('tranid'), vehiculo, cobertura,
            obtenerLocation(ordenVenta.getValue('location')), obtenerEjecutiva(ordenVenta.getValue('custbody_ht_os_ejecutivareferencia')));
        PxAdmin.OperacionOrden = OPERACION_ORDEN_INSTALACION;
        PxAdmin.URLPX = URLPX;
        setVehiculoValues(PxAdmin, vehiculo);
        setDispositivoValues(PxAdmin, dispositivo, productoTexto);
        setPersonaValues(PxAdmin, propietario, 'Propietario');
        setCanalValues(PxAdmin, obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros')), 'Aseguradora');
        setCanalValues(PxAdmin, obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario')), 'Concesionario');
        setCanalValues(PxAdmin, obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera')), 'Financiera');
        setConvenioValues(PxAdmin, obtenerConvenio(ordenVenta, bienId));
        if (monitoreo && monitoreo.vatregnumber) setPersonaValues(PxAdmin, monitoreo, 'Monitorea');
        setServiciosValues(PxAdmin, Array.isArray(servicios) ? servicios : [servicios], cobertura);

        log.debug(`${TAG}-BODY`, { ot: otId, PxAdmin: Object.assign({}, PxAdmin, { Password: '***' }) });
        if (CONFIG.SOLO_SIMULAR) return fin(ESTADO.SIMULADO, 'Simulación: no se impulsó');

        const registroId = crearRegistroImpulso(otId);
        const response = enviarPx(PxAdmin);
        log.debug(`${TAG}-RESP`, { ot: otId, code: response.code, body: response.body });
        res.respuestaPx = response.body;

        if (response.body == 1) {
            marcarOtFinalizada(otId);
            actualizarRegistroImpulso(registroId, 'Enviado', response.body);
            return fin(ESTADO.ENVIADO, 'Impulsado a PX como 001');
        }
        actualizarRegistroImpulso(registroId, 'Error', response.body);
        return fin(ESTADO.ERROR, `PX respondió: ${response.body}`);
    };

    /* ---------------------------------------------------------------- CSV y correo */

    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const COLUMNAS_CSV = [
        ['OT (id)', (r) => r.ot],
        ['OT', (r) => r.otNombre],
        ['Orden de Servicio', (r) => r.tranid],
        ['ADP Item', (r) => r.adp],
        ['Estado', (r) => r.estado],
        ['Mensaje', (r) => r.mensaje],
        ['Consulta PX', (r) => (r.px ? r.px.consulta : 'NO CONSULTADA')],
        ['Numero Consultado', (r) => (r.px ? r.px.numero : '')],
        ['Detalle PX', (r) => (r.px ? r.px.detalle : '')],
        ['Cobertura', (r) => r.cobertura],
        ['Serie', (r) => r.serie],
        ['Respuesta Impulso', (r) => r.respuestaPx]
    ];

    const generarYEnviarCsv = (filas, totales) => {
        const lineas = [COLUMNAS_CSV.map(([titulo]) => csvEscape(titulo)).join(',')];
        filas.forEach((f) => lineas.push(COLUMNAS_CSV.map(([, valor]) => csvEscape(valor(f))).join(',')));
        // BOM UTF-8 para que Excel respete tildes/eñes al abrir el CSV directamente.
        const contenido = '﻿' + lineas.join('\r\n');
        const nombre = `Impulso_PX_Cobertura_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`;

        const archivo = file.create({ name: nombre, fileType: file.Type.CSV, contents: contenido });
        if (CONFIG.CARPETA_CSV) {
            archivo.folder = CONFIG.CARPETA_CSV;
            log.audit(`${TAG}-CSV`, { idArchivo: archivo.save(), nombre, filas: filas.length });
        }
        if (!CONFIG.ENVIAR_CORREO) return;

        const destinatarios = CONFIG.CORREO_DESTINATARIOS.length ? CONFIG.CORREO_DESTINATARIOS : [CONFIG.CORREO_AUTOR];
        const resumen = Object.keys(totales).map((k) => `${k}: ${totales[k]}`).join('\n');
        email.send({
            author: CONFIG.CORREO_AUTOR,
            recipients: destinatarios,
            subject: `Impulso PX 003/004 como 001${CONFIG.SOLO_SIMULAR ? ' (SIMULACIÓN)' : ''} - ${filas.length} OTs`,
            body: `Resultado del envío masivo a PX de OTs ADP 003/004 como 001 (ht_pe_mr_impulso_plat_px_cobertura).\n\n${resumen}\n\nFiltro: ${JSON.stringify({
                OTS: CONFIG.OTS, FECHA_DESDE: CONFIG.FECHA_DESDE, FECHA_HASTA: CONFIG.FECHA_HASTA, CAMPO_FECHA: CONFIG.CAMPO_FECHA
            })}\n\nEl detalle de cada OT está en el CSV adjunto.`,
            attachments: [archivo]
        });
        log.audit(`${TAG}-CORREO`, { destinatarios });
    };

    /* ---------------------------------------------------------------- etapas */

    const getInputData = () => {
        log.audit(`${TAG}-CONFIG`, CONFIG);
        if (!CONFIG.OTS.length && !CONFIG.FECHA_DESDE && !CONFIG.FECHA_HASTA && !CONFIG.PERMITIR_SIN_FILTRO) {
            log.error(`${TAG}-SIN-FILTRO`, 'Configure CONFIG.OTS o el rango de fechas (o PERMITIR_SIN_FILTRO = true)');
            return [];
        }
        const items = obtenerItemsImpulsables();
        const itemIds = Object.keys(items);
        if (!itemIds.length) {
            log.error(`${TAG}-SIN-ITEMS`, 'No hay items con ADP 003/004 y GPG = SI');
            return [];
        }

        const entrada = [];
        const paged = search.create({
            type: RECORD_TYPE_OT,
            filters: construirFiltrosOt(itemIds),
            columns: [search.createColumn({ name: 'internalid', sort: search.Sort.ASC }), 'custrecord_ht_ot_item']
        }).runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pageRange) => {
            if (CONFIG.LIMITE_OTS && entrada.length >= CONFIG.LIMITE_OTS) return;
            paged.fetch({ index: pageRange.index }).data.forEach((r) => {
                if (CONFIG.LIMITE_OTS && entrada.length >= CONFIG.LIMITE_OTS) return;
                entrada.push({ otId: r.id, adp: items[r.getValue('custrecord_ht_ot_item')] });
            });
        });
        log.audit(`${TAG}-INPUT`, { total: entrada.length, items: itemIds.length });
        return entrada;
    };

    const map = (context) => {
        const { otId, adp } = JSON.parse(context.value);
        const resultado = { ot: otId, adp };
        try {
            procesarOt(resultado);
        } catch (e) {
            log.error(`${TAG}-ERROR`, { ot: otId, message: e.message, stack: e.stack });
            Object.assign(resultado, { estado: ESTADO.ERROR, mensaje: e.message });
        }
        if (resultado.estado !== ESTADO.ENVIADO) log.audit(`${TAG}-${resultado.estado}`, resultado);
        context.write({ key: otId, value: JSON.stringify(resultado) });
    };

    const summarize = (summary) => {
        if (summary.inputSummary.error) log.error(`${TAG}-INPUT-ERROR`, summary.inputSummary.error);
        const filas = [];
        summary.mapSummary.errors.iterator().each((key, error) => {
            log.error(`${TAG}-MAP-ERROR`, { key, error });
            filas.push({ ot: key, estado: ESTADO.ERROR, mensaje: `Error no controlado en map: ${error}` });
            return true;
        });
        summary.output.iterator().each((key, value) => {
            filas.push(JSON.parse(value));
            return true;
        });
        filas.sort((a, b) => Number(a.ot) - Number(b.ot));

        const totales = { [ESTADO.ENVIADO]: 0, [ESTADO.EN_PX]: 0, [ESTADO.SIMULADO]: 0, [ESTADO.OMITIDO]: 0, [ESTADO.ERROR]: 0 };
        filas.forEach((f) => { totales[f.estado] = (totales[f.estado] || 0) + 1; });
        log.audit(`${TAG}-RESUMEN`, { totales, segundos: summary.seconds, usage: summary.usage });

        if (!filas.length) {
            log.audit(`${TAG}-SIN-RESULTADOS`, 'No hubo OTs para procesar, no se genera CSV ni correo');
            return;
        }
        try {
            generarYEnviarCsv(filas, totales);
        } catch (e) {
            log.error(`${TAG}-CSV-CORREO-ERROR`, { message: e.message, stack: e.stack });
        }
    };

    return { getInputData, map, summarize };
});
