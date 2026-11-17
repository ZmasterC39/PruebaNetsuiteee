/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @scriptid customscript_ht_pe_mr_impulso_px_masivo
 * @deployment customdeploy_ht_pe_mr_impulso_px_masivo
 *
 * Creado Por: JHON MONTES - 19/10/2026
 * Versión 1 - Impulso masivo normal a PX (CON dependencia de HU_TS_ScriptPlataformas_controller).
 * Mismo flujo de OT que ht_pe_impulso_plat_px.js (Scheduled), pero para muchas OTs a la vez:
 * cada OT se impulsa con el ADP de su item (001, 002, 006, 007, 015 / 051 como 001).
 * Las OTs con ADP 003 y 004 NO se consideran aquí: se envían con ht_pe_mr_impulso_plat_px_cobertura.js.
 *
 * Condiciones de impulso (las mismas que TS_UE_Orden_Trabajo_PE):
 *   - OT de la subsidiaria Perú, activa
 *   - custrecord_ht_ot_pxadminfinalizacion = F
 *   - custrecord_ht_ot_estado = CHEQUEADO (se puede ignorar con CONFIG.IGNORAR_ESTADO_OT)
 *   - Item con parámetro GPG = SI y con ADP soportado
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
    'N/format',
    'N/https',
    'N/log',
    'N/record',
    'N/search',
    'SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant',
    'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller'
], (email, file, format, https, log, record, search, _constant, _platformControllerLatam) => {

    /* ============================== CONFIGURACIÓN ============================== */
    const CONFIG = {
        // Grupo de OTs (internal id). Vacío = no filtra por OT.
        OTS: [
            '373660', '375769', '375036', '371795', '363927', '374470', '376132', '374261',
            '375203', '373458', '372668', '371476', '372962', '367799', '368737', '371830',
            '374448', '374293', '374429', '365174', '372915', '376382', '391758', '392255',
            '392671', '386293', '387843', '363037', '379219', '390215', '391869', '372047',
            '376032', '375992', '375156', '375145', '375120', '385356', '385370', '385384',
            '392318', '386750', '386752', '386754', '388778', '227085', '386759', '373326',
            '352713', '373934', '372129', '371077', '374101', '374221', '375656', '374433',
            '376366', '374550', '374498', '374111', '372702', '376469', '367621', '375624',
            '366092', '375927', '375051', '374989', '376339', '376107', '372327', '375142',
            '367247', '391207', '391200', '391191', '391197', '391293', '391261', '391249',
            '391203', '391210', '391171', '391264', '391174', '391177', '391180', '391306',
            '391184', '366242', '376094', '387785', '387331', '364635', '390549', '371479',
            '368050', '375511', '374527', '375946', '374248', '358842', '352817', '374202',
            '362682', '376077', '367346', '372750', '392435', '376115', '376068', '371522',
            '376147', '375491', '372908', '365854', '368553', '376341', '371369', '376684',
            '376738', '376652', '376713', '376338', '376986', '376608', '383418', '391311',
            '390547', '349811', '367179', '385089', '385398', '386682', '388029', '390455',
            '391601', '387526', '380827', '382560', '384116', '385987', '385989', '378681',
            '378689', '383616', '385090', '386626', '386893', '373012', '388087', '388679',
            '388361', '380695', '392018', '369308', '369970', '366993', '386970', '386048',
            '380480', '381909', '386728', '386850', '387088', '386061', '380866', '380938',
            '382611', '387165', '337411', '376096', '363490', '390251', '362296', '362308',
            '364642', '387249', '370369', '354033', '290561', '351358', '351386', '351082',
            '351262', '351318', '351478', '351482', '369629', '369665', '369564', '334329',
            '363448', '375794', '351232', '351132', '351412', '351555', '369559', '375570',
            '354129', '351597', '351575', '351505', '351196', '369713', '310267', '334357',
            '334405', '334234', '363463', '363436', '363444', '375813', '375719', '354050',
            '354065', '351426', '351336', '369633', '309975', '310002', '334263', '354834',
            '354902', '354923', '351216', '351290', '351204', '351509', '334178', '375740',
            '312954', '351577', '351396', '354095', '354171', '354115', '351523', '351328',
            '351364', '351402', '351444', '369722', '369580', '334423', '334165', '354927',
            '354276', '363459', '375617', '375724', '354169', '310245', '310307', '351248',
            '351484', '351330', '351266', '351470', '369720', '369671', '375609', '375658',
            '351422', '351150', '351092', '351547', '369655', '369588', '334429', '334331',
            '354846', '354985', '354214', '375800', '351116', '369615', '369623', '369680',
            '354218', '375709', '313131', '354140', '351270', '369638', '369796', '369520',
            '334184', '354878', '354239', '363430', '313071', '351384', '351593', '351202',
            '351332', '369562', '369539', '369785', '354826', '375771', '354021', '354076',
            '351316', '351108', '334407', '354840', '354039', '351569', '369517', '369555',
            '369621', '354817', '354157', '354097', '351298', '270545', '369673', '354888',
            '354919', '375667', '375660', '375823', '375714', '375579', '375557', '369548',
            '369790', '369536', '354848', '375664', '375802', '375834', '375626', '375711',
            '375821', '375623', '375646', '313001', '351591', '369583', '369730', '354257',
            '354830', '375596', '375816', '375858', '375843', '375704', '375841', '375662',
            '375598', '375701', '375729', '375804', '375837', '375738', '375951', '354123',
            '351380', '351553', '351468', '351501', '351496', '369818', '369810', '369675',
            '369728', '288342', '309874', '354886', '354838', '375967', '375866', '375969',
            '375936', '375964', '375806', '375839', '375852', '375818', '375743', '312930',
            '369658', '369718', '369808', '354866', '375604', '375832', '375926', '375796',
            '375856', '375736', '375651', '375560', '351334', '376039', '375864', '375798',
            '377726', '375828', '373865', '373858', '373869', '373864', '373859', '371297',
            '373855', '350998', '371255', '350997', '388465', '389619', '376562', '376610',
            '376587', '376534', '376950', '377002', '378824', '378746', '387854', '389101',
            '388517', '390038', '369112', '369111', '369109', '369110', '369108', '384041',
            '387796', '387847', '383091', '383097', '388051', '388695', '388556', '389658',
            '383084', '383039', '390605', '391552', '381243', '387850', '376180', '376211',
            '376199', '376163', '376172', '373603', '386220', '382768', '383215', '380475',
            '378218', '344392', '368913', '360646', '360670', '352550', '350366', '369962',
            '360682', '372821', '378377', '326985', '379113', '379275', '341571', '357558',
            '352554', '363130', '374478', '326789', '306603', '334964', '380430', '365775',
            '368896', '372823', '372802', '372841', '371876', '382875', '366531', '374529',
            '382877', '366540', '366544', '362594', '364127', '385017', '374235', '366546',
            '369960', '334963', '372822', '363122', '369953', '371871', '362595', '374233',
            '362433', '368096', '321340', '386938', '350391', '367784', '368907', '331837',
            '358524', '381995', '362417', '378474', '386911', '372792', '368099', '368892',
            '385033', '381989', '363139', '369984', '368076', '371903', '368888', '321342',
            '380853', '382147', '365789', '366557', '378486', '311204', '342739', '368064',
            '369988', '386942', '343589', '321350', '382864', '389058', '365749', '372832',
            '368921', '374545', '369994', '366607', '304677', '362420', '362497', '371909',
            '365500', '374552', '349451', '371947', '368925', '371901', '363155', '346087',
            '374556', '317449', '335733', '359031', '368909', '331839', '358526', '372794',
            '368894', '368101', '363141', '368079', '367786', '368890', '369986', '371905',
            '321345', '365791', '366559', '311205', '350396', '342741', '369990', '368066',
            '343591', '321353', '366592', '365794', '374566', '365747', '363148', '372831',
            '368920', '366606', '382908', '382840', '362496', '378483', '371908', '378445',
            '349450', '371946', '371900', '374555', '317448', '378462', '378457', '385006',
            '386939', '368908', '331838', '358525', '381996', '378475', '386912', '368893',
            '368100', '363140', '368078', '369985', '368889', '371904', '321343', '382149',
            '380854', '365790', '378487', '350395', '368065', '369989', '391484', '343590',
            '321352', '354032', '290560', '351097', '351354', '351385', '351261', '351317',
            '369563', '334328', '351131', '351554', '369558', '375569', '354128', '351596',
            '351504', '369712', '334233', '363462', '351045', '354049', '351425', '351335',
            '334261', '354833', '354901', '351347', '351203', '351508', '351267', '334177',
            '312953', '351395', '354094', '354114', '351522', '351351', '351363', '351443',
            '369579', '334422', '354275', '363458', '375616', '351329', '351483', '351265',
            '351491', '351469', '369719', '375608', '351421', '351091', '334428', '354245',
            '354984', '354213', '375799', '351115', '369614', '369679', '354217', '375708',
            '313130', '369637', '369795', '334183', '354877', '354238', '363429', '313070',
            '351383', '351331', '369538', '369784', '354825', '375770', '354020', '351315',
            '351107', '351568', '369516', '354156', '354096', '351297', '354887', '375822',
            '375666', '375659', '375713', '375556', '369547', '369789', '369535', '354847',
            '375801', '375833', '375625', '375710', '375622', '375645', '369582', '369729',
            '354256', '375595', '375815', '375857', '375842', '375703', '375840', '375661',
            '375597', '375700', '375728', '375803', '375836', '375737', '375950', '309746',
            '390555', '382185', '382305', '382318', '382319', '384941', '384945', '374170',
            '351701', '373506', '374907', '373505', '374930', '372201', '359686', '351624',
            '372271', '370767', '372224', '370521', '370605', '370898', '372286', '372222',
            '372248', '370472', '375004', '372272', '373549', '370909', '372255', '370897',
            '372266', '373514', '370497', '370876', '370558', '359905', '374968', '374175',
            '374173', '374174', '351708', '372211', '372213', '373519', '372185', '372199',
            '373524', '370882', '370432', '374937', '374950', '370810', '374946', '374970',
            '374960', '370641', '372194', '370618', '370813', '370883', '373516', '373523',
            '372191', '370704', '370706', '370731', '374939', '374940', '372195', '370708',
            '370626', '370815', '370431', '370811', '374942', '374941', '370816', '370655',
            '370879', '373511', '373518', '373513', '372221', '374959', '374956', '374966',
            '372219', '373512', '373515', '374949', '374944', '374967', '370698', '374955',
            '370881', '374964', '370434', '374951', '374963', '372167', '372220', '372212',
            '374954', '392390', '368856', '380294', '384028', '387856', '381975', '381232',
            '374272', '381944', '371368', '367261', '380065', '382104', '383153', '386291',
            '387825', '387838', '386294', '379733', '384265', '385153', '391113', '388192',
            '389154', '389166', '389162', '389150', '389158', '392020', '389165', '389153',
            '389161', '389149', '389157', '392019', '375160', '373459', '389875', '386732',
            '386743', '387706', '387691', '376117', '376070', '371524', '376149', '383287',
            '376116', '371523', '376148', '386289', '382847', '371370', '365478', '346237',
            '318198', '383874', '383877', '386585', '377872', '378137', '387710', '387692',
            '370339', '388002', '387821', '387995', '377322', '377345', '377334', '377308'
        ],
        // Rango de fechas 'YYYY-MM-DD' sobre CAMPO_FECHA. Vacío = sin límite por ese lado.
        FECHA_DESDE: '',
        FECHA_HASTA: '',
        // Campo de la OT para el rango: 'created' | 'lastmodified' | 'custrecord_ht_ot_fechatrabajoasignacion'
        CAMPO_FECHA: 'created',
        // true = no exige que la OT esté en estado CHEQUEADO
        IGNORAR_ESTADO_OT: false,
        // true = no exige GPG = SI en el item
        IGNORAR_GPG: false,
        // true = consulta PX pero no impulsa ni modifica la OT (el CSV y el correo se generan igual)
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
        MARCAR_FINALIZADA_SI_EN_PX: true,

        // Correo con el CSV. CORREO_AUTOR = internal id de un empleado activo.
        ENVIAR_CORREO: true,
        CORREO_AUTOR: 49599,
        // Internal ids de empleado o direcciones de correo. Vacío = se envía al autor.
        CORREO_DESTINATARIOS: [],
        // Copia (cc) del correo: internal ids de empleado o direcciones de correo (máx. 10).
        CORREO_CC: ['pcordova@hunter.com.pe', 'rzamudio@hunter.com.pe'],
        // Carpeta del File Cabinet donde se guarda el CSV. null = no se guarda (solo se adjunta).
        CARPETA_CSV: 552150
    };
    /* =========================================================================== */

    const TAG = 'IMPULSO-PX-MR';
    const RECORD_TYPE_OT = 'customrecord_ht_record_ordentrabajo';
    const SUBSIDIARIA_PE = _constant.Constants.PERU_SUBSIDIARY || 3;
    const ESTADO = { ENVIADO: 'ENVIADO', ERROR: 'ERROR', OMITIDO: 'OMITIDO', SIMULADO: 'SIMULADO', EN_PX: 'YA_EN_PX' };

    // internal id del valor ADP -> código de impulso (mismo ruteo que ht_pe_impulso_plat_px, sin 003 ni 004)
    const ADP_PERMITIDOS = {
        [_constant.Valor.VALOR_001_INST_DISPOSITIVO]: '001',
        [_constant.Valor.VALOR_051_ACTIVADOS]: '001',
        [_constant.Valor.VALOR_002_DESINSTALACION_DE_DISP]: '002',
        [_constant.Valor.VALOR_006_MANTENIMIENTO_CHEQUEO_DE_DISPOSITIVO]: '006',
        [_constant.Valor.VALOR_007_CHEQUEO_DE_COMPONENTES]: '007',
        [_constant.Valor.VALOR_015_VENTA_SERVICIOS]: '015'
    };

    // Consulta de órdenes en PX (copiado de ht_pe_mr_consulta_px_validacion.js, mantener sincronizado)
    const PX_SOAP = {
        URL: _constant.Constants.URLPX,
        USUARIO: 'NetSuite',
        CLAVE: 'NS*25#01@%j?i',
        NACIONALIDAD: 'PE',
        NS: 'http://tempuri.org/',
        METODO: 'ConsultaOrden',
        PARAM: 'strNumeroOrden',
        PARAM_NACIONALIDAD: 'strNacionalidad'
    };

    /* ---------------------------------------------------------------- selección de OTs */

    const fechaNetSuite = (texto) => {
        const [anio, mes, dia] = texto.split('-').map(Number);
        return format.format({ value: new Date(anio, mes - 1, dia), type: format.Type.DATE });
    };

    /**
     * itemId -> internal id del valor, para los items que tienen el parámetro con el valor indicado.
     * filtroValor: filtro sobre el valor, p. ej. ['custrecord_ht_pp_parametrizacion_valor', 'anyof', ids].
     */
    const itemsConParametro = (parametroId, filtroValor) => {
        const items = {};
        const paged = search.create({
            type: 'customrecord_ht_pp_main_param_prod',
            filters: [
                ['custrecord_ht_pp_parametrizacion_rela', 'anyof', parametroId],
                'AND',
                filtroValor,
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

    /**
     * Items con ADP soportado (y GPG = SI salvo IGNORAR_GPG).
     * { impulsables: itemId -> código ADP, itemsAdp: itemId -> valor ADP (sin mirar GPG) }
     */
    const obtenerItemsImpulsables = () => {
        const itemsAdp = itemsConParametro(_constant.Parameter.ADP_ACCION_DEL_PRODUCTO,
            ['custrecord_ht_pp_parametrizacion_valor', 'anyof', Object.keys(ADP_PERMITIDOS)]);
        // GPG se valida por el código del valor ('S'), igual que TS_UE_Orden_Trabajo_PE:
        // Perú tiene su propio valor SI (p. ej. 4348) distinto de _constant.Valor.SI (331).
        const itemsGpg = CONFIG.IGNORAR_GPG ? null : itemsConParametro(_constant.Parameter.GPG_GENERA_PARAMETRIZACION_EN_GEOSYS,
            ['custrecord_ht_pp_parametrizacion_valor.custrecord_ht_pp_codigo', 'is', _constant.Codigo_Valor.COD_SI]);
        const impulsables = {};
        Object.keys(itemsAdp).forEach((itemId) => {
            if (itemsGpg && !itemsGpg[itemId]) return;
            impulsables[itemId] = ADP_PERMITIDOS[itemsAdp[itemId]];
        });
        return { impulsables, itemsAdp };
    };

    const esVerdadero = (v) => v === true || v === 'T';

    /**
     * Para las OTs de CONFIG.OTS que la búsqueda principal no devolvió, indica qué condición no cumplen,
     * para que aparezcan en el CSV como OMITIDO en lugar de desaparecer.
     */
    const diagnosticarExcluidas = (otIds, impulsables, itemsAdp) => {
        const encontradas = {};
        const paged = search.create({
            type: RECORD_TYPE_OT,
            filters: [['internalid', 'anyof', otIds]],
            columns: ['name', 'isinactive', 'custrecord_ht_ot_subsidiary', 'custrecord_ht_ot_pxadminfinalizacion',
                'custrecord_ht_ot_estado', 'custrecord_ht_ot_item']
        }).runPaged({ pageSize: 1000 });
        paged.pageRanges.forEach((pageRange) => {
            paged.fetch({ index: pageRange.index }).data.forEach((r) => {
                const itemId = r.getValue('custrecord_ht_ot_item');
                const item = r.getText('custrecord_ht_ot_item') || itemId;
                const motivos = [];
                if (esVerdadero(r.getValue('isinactive'))) motivos.push('OT inactiva');
                if (String(r.getValue('custrecord_ht_ot_subsidiary')) !== String(SUBSIDIARIA_PE)) {
                    motivos.push(`Subsidiaria distinta a Perú (${r.getText('custrecord_ht_ot_subsidiary')})`);
                }
                if (esVerdadero(r.getValue('custrecord_ht_ot_pxadminfinalizacion'))) motivos.push('OT ya impulsada (custrecord_ht_ot_pxadminfinalizacion = T)');
                if (!CONFIG.IGNORAR_ESTADO_OT && String(r.getValue('custrecord_ht_ot_estado')) !== String(_constant.Status.CHEQUEADO)) {
                    motivos.push(`Estado de la OT no es CHEQUEADO (${r.getText('custrecord_ht_ot_estado') || 'vacío'})`);
                }
                if (!itemsAdp[itemId]) {
                    motivos.push(`Item ${item} sin ADP soportado (001/002/006/007/015/051; 003/004 van por el script de cobertura)`);
                } else if (!impulsables[itemId]) {
                    motivos.push(`Item ${item} sin GPG = SI`);
                }
                if (!motivos.length) motivos.push('Fuera del rango de fechas o de LIMITE_OTS');
                encontradas[r.id] = {
                    otId: r.id,
                    otNombre: r.getValue('name'),
                    adp: impulsables[itemId] || (itemsAdp[itemId] ? ADP_PERMITIDOS[itemsAdp[itemId]] : ''),
                    omitida: motivos.join(' | ')
                };
            });
        });
        return otIds.map((otId) => encontradas[otId] || { otId, adp: '', omitida: 'La OT no existe' });
    };

    const construirFiltrosOt = (itemIds) => {
        const filtros = [
            ['isinactive', 'is', 'F'],
            'AND',
            ['custrecord_ht_ot_subsidiary', 'anyof', SUBSIDIARIA_PE],
            'AND',
            ['custrecord_ht_ot_pxadminfinalizacion', 'is', 'F'],
            'AND',
            ['custrecord_ht_ot_item', 'anyof', itemIds]
        ];
        if (!CONFIG.IGNORAR_ESTADO_OT) filtros.push('AND', ['custrecord_ht_ot_estado', 'anyof', _constant.Status.CHEQUEADO]);
        if (CONFIG.OTS.length) filtros.push('AND', ['internalid', 'anyof', CONFIG.OTS]);
        if (CONFIG.FECHA_DESDE) filtros.push('AND', [CONFIG.CAMPO_FECHA, 'onorafter', fechaNetSuite(CONFIG.FECHA_DESDE)]);
        if (CONFIG.FECHA_HASTA) filtros.push('AND', [CONFIG.CAMPO_FECHA, 'onorbefore', fechaNetSuite(CONFIG.FECHA_HASTA)]);
        return filtros;
    };

    /* ---------------------------------------------------------------- consulta PX */

    const obtenerStrToken = () => {
        const d = new Date();
        return `SH2PX${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    };

    const escXml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const unescapeXml = (v) => String(v ?? '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&amp;/g, '&');

    const headerSeguridad = (strToken, authToken) =>
        '<soap:Header>' +
        `<SeguridadPx xmlns="${PX_SOAP.NS}">` +
        `<StrToken>${escXml(strToken)}</StrToken>` +
        (authToken ? `<AutenticacionToken>${escXml(authToken)}</AutenticacionToken>` : '') +
        `<UserName>${escXml(PX_SOAP.USUARIO)}</UserName>` +
        `<Password>${escXml(PX_SOAP.CLAVE)}</Password>` +
        '</SeguridadPx></soap:Header>';

    const envelope = (header, body) =>
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
        'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
        header + '<soap:Body>' + body + '</soap:Body></soap:Envelope>';

    const postSoap = (metodo, xml) => https.post({
        url: `${PX_SOAP.URL}?op=${metodo}`,
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
            `<${PX_SOAP.PARAM}>${escXml(numero)}</${PX_SOAP.PARAM}>` +
            `<${PX_SOAP.PARAM_NACIONALIDAD}>${PX_SOAP.NACIONALIDAD}</${PX_SOAP.PARAM_NACIONALIDAD}>` +
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

    /* ---------------------------------------------------------------- impulso */

    const wrapPxResponse = (rawResponse, payload) => {
        let status = false;
        let mensaje = '';
        let respuesta = rawResponse;
        let detalle = payload || null;
        const raw = rawResponse;
        try {
            if (typeof rawResponse === 'string') {
                try {
                    const parsed = JSON.parse(rawResponse);
                    if (parsed && typeof parsed === 'object') {
                        respuesta = parsed;
                        if (parsed.status !== undefined) status = parsed.status === true || parsed.status === 'true';
                        if (parsed.mensaje) mensaje = parsed.mensaje;
                        if (parsed.detalle) detalle = parsed.detalle;
                        if (!status && parsed.PxAdmin && parsed.PxAdmin.Respuesta === '1') status = true;
                    }
                } catch (e) {
                    status = rawResponse === '1';
                    mensaje = status ? '' : rawResponse;
                }
            } else if (rawResponse === true || rawResponse === false) {
                status = rawResponse === true;
            } else if (typeof rawResponse === 'object' && rawResponse !== null) {
                if (rawResponse.status !== undefined) {
                    status = rawResponse.status === true || rawResponse.status === 'true';
                    mensaje = rawResponse.mensaje || '';
                    respuesta = rawResponse.respuesta !== undefined ? rawResponse.respuesta : rawResponse;
                    detalle = rawResponse.detalle || detalle;
                } else {
                    respuesta = rawResponse;
                }
                if (!status && rawResponse.PxAdmin && rawResponse.PxAdmin.Respuesta === '1') status = true;
                if (!detalle && rawResponse.PxAdmin) detalle = rawResponse;
            } else if (rawResponse === 1) {
                status = true;
            }
        } catch (e) {
            mensaje = e.message;
        }
        return { status, mensaje, respuesta, detalle, raw };
    };

    const esRespuestaExitosa = (wrapped) => {
        const respBody = wrapped?.respuesta?.PxAdmin?.Respuesta || wrapped?.respuesta?.Respuesta || null;
        return wrapped.status === true || respBody === '1' || respBody === 1;
    };

    const valorLista = (campo) => {
        if (Array.isArray(campo)) return campo.length ? campo[0].value : '';
        return campo || '';
    };

    const marcarOtFinalizada = (otId) => {
        record.submitFields({
            type: RECORD_TYPE_OT,
            id: otId,
            values: { custrecord_ht_ot_pxadminfinalizacion: true, custrecord_ht_ot_noimpulsaplataformas: false },
            options: { enableSourcing: false, ignoreMandatoryFields: true }
        });
    };

    const ejecutarImpulso = (adpCode, otId, subsidiary) => {
        const URLPX = _constant.Constants.URLPX;
        switch (adpCode) {
            case '001':
                return _platformControllerLatam.envioPXInstalacionDispositivoPeru(otId, subsidiary, URLPX);
            case '002':
                return _platformControllerLatam.envioPXDesinstalacionDispositivo(otId, subsidiary, URLPX);
            case '006':
                // Enviar activo fijo vacio para este impulso
                return _platformControllerLatam.envioPXMantenimientoChequeoDispositivo(otId, subsidiary, URLPX, '');
            case '007':
                return _platformControllerLatam.envioPXChequeoComponentes(otId, subsidiary, URLPX);
            case '015':
                return _platformControllerLatam.envioPXVentaServicios(otId, subsidiary, URLPX);
            default:
                return { status: false, mensaje: `ADP no soportado (${adpCode})`, respuesta: null };
        }
    };

    /** res se va completando (tranid, consulta PX...) para que llegue al CSV aunque haya una excepción. */
    const procesarOt = (res) => {
        const otId = res.ot;
        const fin = (estado, mensaje) => Object.assign(res, { estado, mensaje: mensaje || '' });

        const ot = search.lookupFields({
            type: RECORD_TYPE_OT,
            id: otId,
            columns: ['name', 'custrecord_ht_ot_subsidiary', 'custrecord_ht_ot_orden_servicio', 'custrecord_ht_ot_pxadminfinalizacion']
        });
        res.otNombre = ot.name;
        // Se vuelve a validar por si la OT se impulsó entre getInputData y map.
        if (ot.custrecord_ht_ot_pxadminfinalizacion === true) {
            return fin(ESTADO.OMITIDO, 'OT ya impulsada (custrecord_ht_ot_pxadminfinalizacion)');
        }
        const subsidiary = valorLista(ot.custrecord_ht_ot_subsidiary);
        const soId = valorLista(ot.custrecord_ht_ot_orden_servicio);
        if (!soId) return fin(ESTADO.ERROR, 'La OT no tiene orden de servicio');
        res.tranid = search.lookupFields({ type: search.Type.SALES_ORDER, id: soId, columns: ['tranid'] }).tranid;

        if (CONFIG.CONSULTAR_PX_ANTES) {
            try {
                Object.assign(res, { px: consultarEnPx(res.tranid) });
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

        if (CONFIG.SOLO_SIMULAR) return fin(ESTADO.SIMULADO, 'Simulación: no se impulsó');

        const payload = { ot: otId, so: soId, subs: subsidiary, adp: res.adp };
        log.debug(`${TAG}-START`, payload);
        const wrapped = wrapPxResponse(ejecutarImpulso(res.adp, otId, subsidiary), payload);
        log.debug(`${TAG}-RESP`, wrapped);

        if (!esRespuestaExitosa(wrapped)) {
            return fin(ESTADO.ERROR, wrapped.mensaje || 'PX no confirmó el envío');
        }
        marcarOtFinalizada(otId);
        return fin(ESTADO.ENVIADO, 'Impulsado a PX');
    };

    /* ---------------------------------------------------------------- CSV y correo */

    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const COLUMNAS_CSV = [
        ['OT (id)', (r) => r.ot],
        ['OT', (r) => r.otNombre],
        ['Orden de Servicio', (r) => r.tranid],
        ['ADP', (r) => r.adp],
        ['Estado', (r) => r.estado],
        ['Mensaje', (r) => r.mensaje],
        ['Consulta PX', (r) => (r.px ? r.px.consulta : 'NO CONSULTADA')],
        ['Numero Consultado', (r) => (r.px ? r.px.numero : '')],
        ['Detalle PX', (r) => (r.px ? r.px.detalle : '')]
    ];

    const generarYEnviarCsv = (filas, totales) => {
        const lineas = [COLUMNAS_CSV.map(([titulo]) => csvEscape(titulo)).join(',')];
        filas.forEach((f) => lineas.push(COLUMNAS_CSV.map(([, valor]) => csvEscape(valor(f))).join(',')));
        // BOM UTF-8 para que Excel respete tildes/eñes al abrir el CSV directamente.
        const contenido = '﻿' + lineas.join('\r\n');
        const nombre = `Impulso_PX_Masivo_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}.csv`;

        const archivo = file.create({ name: nombre, fileType: file.Type.CSV, contents: contenido });
        if (CONFIG.CARPETA_CSV) {
            archivo.folder = CONFIG.CARPETA_CSV;
            log.audit(`${TAG}-CSV`, { idArchivo: archivo.save(), nombre, filas: filas.length });
        }
        if (!CONFIG.ENVIAR_CORREO) return;

        const resumen = Object.keys(totales).map((k) => `${k}: ${totales[k]}`).join('\n');
        const destinatarios = CONFIG.CORREO_DESTINATARIOS.length ? CONFIG.CORREO_DESTINATARIOS : [CONFIG.CORREO_AUTOR];
        email.send({
            author: CONFIG.CORREO_AUTOR,
            recipients: destinatarios,
            cc: CONFIG.CORREO_CC.length ? CONFIG.CORREO_CC : null,
            subject: `Impulso masivo PX${CONFIG.SOLO_SIMULAR ? ' (SIMULACIÓN)' : ''} - ${filas.length} OTs`,
            body: `Resultado del impulso masivo a PX (ht_pe_mr_impulso_plat_px_masivo).\n\n${resumen}\n\nFiltro: ${JSON.stringify({
                OTS: CONFIG.OTS, FECHA_DESDE: CONFIG.FECHA_DESDE, FECHA_HASTA: CONFIG.FECHA_HASTA, CAMPO_FECHA: CONFIG.CAMPO_FECHA
            })}\n\nEl detalle de cada OT está en el CSV adjunto.`,
            attachments: [archivo]
        });
        log.audit(`${TAG}-CORREO`, { destinatarios, cc: CONFIG.CORREO_CC });
    };

    /* ---------------------------------------------------------------- etapas */

    const getInputData = () => {
        log.audit(`${TAG}-CONFIG`, CONFIG);
        if (!CONFIG.OTS.length && !CONFIG.FECHA_DESDE && !CONFIG.FECHA_HASTA && !CONFIG.PERMITIR_SIN_FILTRO) {
            log.error(`${TAG}-SIN-FILTRO`, 'Configure CONFIG.OTS o el rango de fechas (o PERMITIR_SIN_FILTRO = true)');
            return [];
        }
        const { impulsables: items, itemsAdp } = obtenerItemsImpulsables();
        const itemIds = Object.keys(items);
        if (!itemIds.length) {
            log.error(`${TAG}-SIN-ITEMS`, 'No hay items con ADP soportado y GPG = SI');
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
        let excluidas = [];
        if (CONFIG.OTS.length) {
            const incluidas = new Set(entrada.map((e) => String(e.otId)));
            const faltantes = [...new Set(CONFIG.OTS.map(String))].filter((id) => !incluidas.has(id));
            if (faltantes.length) excluidas = diagnosticarExcluidas(faltantes, items, itemsAdp);
        }
        log.audit(`${TAG}-INPUT`, { total: entrada.length, excluidas: excluidas.length, items: itemIds.length });
        if (excluidas.length) log.audit(`${TAG}-EXCLUIDAS`, excluidas);
        return entrada.concat(excluidas);
    };

    const map = (context) => {
        const { otId, adp, otNombre, omitida } = JSON.parse(context.value);
        const resultado = { ot: otId, adp };
        try {
            if (omitida) Object.assign(resultado, { otNombre, estado: ESTADO.OMITIDO, mensaje: omitida });
            else procesarOt(resultado);
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
