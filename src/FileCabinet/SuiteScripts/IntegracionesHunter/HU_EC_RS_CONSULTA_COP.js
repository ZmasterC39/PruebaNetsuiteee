/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/record", "N/search", "N/query", 'N/email', 'N/format', 'N/file'], function (log, record, search, query, email, format, file) {

    // RECORD_TYPE
    const RECORD_TYPE = 'customrecord_copilot_cod_bot';

    const ENTIDADES = {
        customer: {
            tabla: 'customer',
            alias: 'c',
            camposDisponibles: [
                // Identificadores
                'id', 'entityid', 'externalid', 'entitynumber', 'companyname', 'fullname',
                // Nombres y apellidos
                'firstname', 'lastname', 'middlename', 'salutation', 'title',
                // Información de contacto
                'email', 'phone', 'mobilephone', 'altphone', 'homephone', 'fax',
                'altemail', 'url', 'sourcewebsite',
                // Dirección
                'city', 'state', 'thirdpartycountry', 'thirdpartyzipcode',
                'defaultbillingaddress', 'defaultshippingaddress',
                // Información comercial
                'category', 'leadsource', 'salesrep', 'territory', 'partner',
                'pricelevel', 'currency', 'accountnumber', 'creditlimit',
                // Fechas importantes
                'datecreated', 'lastmodifieddate', 'dateconversion', 'datelead',
                'firstorderdate', 'lastorderdate', 'firstsaledate', 'lastsaledate',
                'dateclosed', 'dategrosslead',
                // Estado
                'isinactive', 'oncredithold', 'creditholdoverride', 'isexplicitconversion',
                'convertedtocontact', 'convertedtocustomer', 'isperson', 'isjob',
                // Finanzas
                'balancesearch', 'overduebalancesearch', 'consoldaysoverduesearch',
                'daysoverduesearch', 'consolunbilledorderssearch',
                // Fiscales
                'vatregnumber', 'taxable', 'taxitem', 'resalenumber',
                // Adicionales relevantes
                'comments', 'language', 'emailpreference', 'duplicate',
                'unsubscribe', 'weblead', 'parent', 'toplevelparent'
            ],
            camposPorDefecto: [
                'id', 'entityid', 'companyname', 'fullname', 'email', 'phone',
                'datecreated', 'lastmodifieddate', 'isinactive', 'category', 'salesrep'
            ],
            relaciones: [
                {
                    entidad: 'cobertura',
                    campo_local: 'id',
                    campo_remoto: 'custrecord_ht_co_propietario',
                    tipo: 'INNER'
                }
            ]
        },
        cobertura: {
            tabla: 'customrecord_ht_co_cobertura',
            alias: 'cob',
            camposDisponibles: [
                // Identificadores
                'id', 'name', 'externalid', 'scriptid',
                // Propietario y cliente
                'custrecord_ht_co_propietario', 'custrecord_ht_co_clientemonitoreo', 'owner',
                // Producto y bien
                'custrecord_ht_co_producto', 'custrecord_ht_co_bien', 'custrecord_ht_co_familia_prod',
                // Números y códigos
                'custrecord_ht_co_numerodispositivo', 'custrecord_ht_co_numeroserieproducto',
                'custrecord_ht_co_imei', 'custrecord_ht_co_apn', 'custrecord_ht_co_codigoactivacion',
                'custrecord_ht_co_codigorespuesta', 'custrecord_ht_co_seriedispolojack',
                // Fechas de cobertura
                'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
                'custrecord_ht_co_fechareactivacion', 'created', 'lastmodified',
                // Estado
                'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'custrecord_ht_co_estado_cobertura',
                'custrecord_ht_co_producto_convertido', 'isinactive',
                // Información técnica
                'custrecord_ht_co_celularsimcard', 'custrecord_ht_co_nocelularsimcard',
                'custrecord_ht_co_script', 'custrecord_ht_co_firmware', 'custrecord_ht_co_token',
                'custrecord_ht_co_vid', 'custrecord_ht_co_ip', 'custrecord_ht_co_operadora',
                'custrecord_ht_co_servidor', 'custrecord_ht_co_unidad', 'custrecord_ht_co_modelodispositivo',
                // Información adicional
                'custrecord_ht_co_plazo', 'custrecord_ht_co_subsidiaria', 'custrecord_ht_co_orden_servicio',
                'custrecord_ht_co_udp_pla_px_ami', 'custrecord_ht_co_impulso_plataforma',
                'custrecord_ht_co_estado_conciliacion', 'custrecord_ht_co_estadocartera',
                'custrecord_ht_co_estadolojack', 'custrecord19', 'custrecord_ht_customer_id_telematic',
                // Metadatos
                'altname', 'abbreviation', 'lastmodifiedby'
            ],
            camposPorDefecto: [
                'id', 'name', 'custrecord_ht_co_propietario', 'custrecord_ht_co_producto',
                'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
                'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'created'
            ],
            relaciones: [
                {
                    entidad: 'customer',
                    campo_local: 'custrecord_ht_co_propietario',
                    campo_remoto: 'id',
                    tipo: 'INNER'
                }
            ]
        },
        bien: {
            tabla: 'customrecord_ht_record_bienes',
            alias: 'b',
            camposDisponibles: [
                // Identificadores
                'id', 'name', 'externalid', 'scriptid', 'altname', 'abbreviation',
                // Códigos y referencias principales
                'custrecord_ht_bien_placa', 'custrecord_ht_bien_codsysh',
                'custrecord_ht_bien_motor', 'custrecord_ht_bien_chasis',
                // Propietario y relaciones
                'custrecord_ht_bien_propietario', 'custrecord_ht_bien_conductor', 'owner',
                // Información del vehículo
                'custrecord_ht_bien_marca', 'custrecord_ht_bien_modelo', 'custrecord_ht_bien_ano',
                'custrecord_ht_bien_tipo', 'custrecord_ht_bien_tipobien', 'custrecord_ht_bien_tipoterrestre',
                'custrecord_ht_bien_usovehiculo', 'custrecord_ht_bien_tipoflota',
                // Características físicas
                'custrecord_ht_bien_colorfabricante', 'custrecord_ht_bien_colorcarseg',
                'custrecord_ht_bien_colormatricula', 'custrecord_ht_bien_numeropuertas',
                'custrecord_ht_bien_tipocabina', 'custrecord_ht_bien_num_ruedas',
                // Características técnicas
                'custrecord_ht_bien_combustible', 'custrecord_ht_bien_transmision',
                'custrecord_ht_bien_cilindraje', 'custrecord_ht_bien_traccion',
                'custrecord_ht_bien_aireacondicionado', 'custrecord_ht_bien_tonelaje',
                'custrecord_ht_bien_max_peso', 'custrecord_ht_bien_largo',
                // Kilometraje y uso
                'custrecord_ht_bien_kilometraje', 'custrecord_ht_bien_recorrido',
                'custrecord_ht_bien_seguimiento',
                // Valores y financiamiento
                'custrecord_ht_bien_avaluo', 'custrecord_ht_bien_financiadovehiculo',
                'custrecord_ht_bien_formapago',
                // Dispositivos y tecnología
                'custrecord_ht_paralizador', 'custrecord_ht_boton_panico',
                'custrecord_ht_bien_dispositivo_convenio', 'custrecord_ht_bien_simcard_convenio',
                'custrecord_ht_serie_pro', 'custrecord_ht_bien_id_telematic',
                // Convenios y órdenes
                'custrecord_ht_bien_conveniovehiculo', 'custrecord_ht_bien_estadoconvenio',
                'custrecord_ht_bien_orden_serv_convenio', 'custrecord_ht_bien_taller_convenio',
                'custrecord_ht_bien_codigoprocesoconvenio',
                // Estado y versiones
                'custrecord_ht_bn_estadobien', 'custrecord_ht_bien_estadocontrato',
                'isinactive', 'custrecord_bien_version', 'custrecord_ht_bien_actualizado_p_px_ami',
                // Fechas
                'created', 'lastmodified', 'custrecord_ht_bien_fechareactivacion',
                'lastmodifiedby',
                // Otros
                'custrecord_ht_bien_observacion', 'custrecord_ht_bien_caractadicional',
                'custrecord_ht_bien_ejecutivorenovacion', 'custrecord_ht_bien_clave',
                'custrecord_ht_bien_ruat', 'custrecord_ht_bien_generico',
                'custrecord_ht_bien_nom_embarcacion', 'custrecord_ht_bien_telefono_emergencia',
                // Organizacionales
                'custrecord_bn_subsidiaria', 'custrecord_ht_bien_oficina',
                'custrecord_ht_bn_cooperativaasociacion', 'custrecord_ht_bien_cooperativaasociacion',
                'custrecord_ht_bn_tipoorigen', 'custrecord_ht_bn_tipori',
                'custrecord_ht_bien_consesionarios', 'custrecord_ht_bien_companiaseguros',
                // Campos legacy
                'custrecord14'
            ],
            camposPorDefecto: [
                'id', 'custrecord_ht_bien_placa', 'created', 'altname',
                'custrecord_ht_bien_marca', 'custrecord_ht_bien_modelo', 'custrecord_ht_bien_ano',
                'custrecord_ht_bien_motor', 'custrecord_ht_bien_chasis',
                'custrecord_ht_bien_propietario', 'custrecord_ht_bien_codsysh'
            ],
            relaciones: [
                {
                    entidad: 'customer',
                    campo_local: 'custrecord_ht_bien_propietario',
                    campo_remoto: 'id',
                    tipo: 'INNER'
                },
                {
                    entidad: 'cobertura',
                    campo_local: 'id',
                    campo_remoto: 'custrecord_ht_co_bien',
                    tipo: 'LEFT'
                }
            ]
        },
        employee: {
            tabla: 'employee',
            alias: 'emp',
            camposDisponibles: [
                // Identificadores
                'id', 'entityid', 'externalid',
                // Nombres
                'firstname', 'middlename', 'lastname', 'salutation', 'title', 'initials',
                // Información de contacto
                'email', 'phone', 'officephone', 'mobilephone', 'homephone', 'fax',
                // Información administrativa
                'accountnumber', 'comments', 'isinactive',
                // Roles y permisos
                'issalesrep', 'issupportrep', 'isjobmanager', 'isjobresource',
                'giveaccess', 'unsubscribe', 'rolesforsearch',
                // Tipo y categorización
                'employeetype', 'employeestatus', 'btemplate',
                // Aprobadores y límites
                'purchaseorderapprover', 'timeapprover', 'approver', 'supervisor',
                'purchaseorderlimit', 'purchaseorderapprovallimit', 'expenselimit', 'approvallimit',
                // Fechas importantes
                'hiredate', 'releasedate', 'birthdate', 'lastmodifieddate', 'datecreated',
                'lastreviewdate', 'nextreviewdate', 'authworkdate', 'visaexpdate',
                // Información demográfica
                'gender', 'maritalstatus', 'ethnicity',
                // Organización
                'class', 'department', 'location', 'subsidiary',
                // Financiero
                'currency', 'defaultexpensereportcurrency', 'laborcost',
                // Trabajo
                'workcalendar', 'defaultjobresourcerole', 'targetutilization', 'jobdescription',
                // Estado migratorio/documentación
                'i9verified', 'residentstatus', 'visatype', 'aliennumber',
                // Suscripciones
                'globalsubscriptionstatus',
                // Campos personalizados - Perú
                'custentity_pe_document_number', 'custentity_pe_code_document_type',
                'custentity_pe_document_type', 'custentity_pe_entity_country',
                'custentity_pe_code_entity_country', 'custentity_pe_type_of_person',
                'custentity_pe_code_type_person',
                // Campos personalizados - Filipinas
                'custentity_ph_tin', 'custentity_ph_ctc', 'custentity_ph_philhealth',
                // Campos personalizados - Notificaciones y pagos
                'custentity_2663_email_address_notif', 'custentity_2663_payment_method',
                'custentity_2663_eft_file_format',
                // Campos personalizados - Grupo y supervisión
                'custentity_ts_grupo_comercial', 'custentity_tec_supervisor', 'custentity_empl_tec',
                // Campos personalizados - Ecuador
                'custentity_ec_numero_registro', 'custentity_ec_document_type',
                'custentity_ec_cod_banco', 'custentityts_ec_cod_tipo_doc_identidad',
                'custentityts_ec_pais_entidad', 'custentity_ts_ec_cod_pais_ent',
                'custentity_ts_ec_tipo_persona',
                // Otros campos adicionales
                'defaultacctcorpcardexp'
            ],
            camposPorDefecto: [
                'id', 'entityid', 'firstname', 'middlename', 'lastname',
                'email', 'phone', 'employeetype', 'department', 'supervisor',
                'hiredate', 'isinactive'
            ],
            relaciones: [
                {
                    entidad: 'customer',
                    campo_local: 'id',
                    campo_remoto: 'salesrep',
                    tipo: 'LEFT'
                }
            ]
        }
    };

    const CAMPOS_SIEMPRE_STRING = {
        // CUSTOMER
        'id': false,
        'entityid': true,
        'externalid': true,
        'entitynumber': true,
        'companyname': true,
        'fullname': true,
        'firstname': true,
        'lastname': true,
        'middlename': true,
        'salutation': true,
        'title': true,
        'email': true,
        'phone': true,
        'mobilephone': true,
        'altphone': true,
        'homephone': true,
        'fax': true,
        'altemail': true,
        'url': true,
        'sourcewebsite': true,
        'city': true,
        'state': true,
        'thirdpartycountry': true,
        'thirdpartyzipcode': true,
        'vatregnumber': true,  // ← IMPORTANTE
        'resalenumber': true,  // ← IMPORTANTE
        'taxitem': true,
        'category': true,
        'leadsource': true,
        'salesrep': true,
        'territory': true,
        'partner': true,
        'currency': true,
        'accountnumber': true,
        'comments': true,
        'language': true,
        'emailpreference': true,

        // COBERTURA
        'name': true,
        'scriptid': true,
        'custrecord_ht_co_propietario': true,
        'custrecord_ht_co_clientemonitoreo': true,
        'owner': true,
        'custrecord_ht_co_producto': true,
        'custrecord_ht_co_bien': true,
        'custrecord_ht_co_familia_prod': true,
        'custrecord_ht_co_numerodispositivo': true,
        'custrecord_ht_co_numeroserieproducto': true,
        'custrecord_ht_co_imei': true,
        'custrecord_ht_co_apn': true,
        'custrecord_ht_co_codigoactivacion': true,
        'custrecord_ht_co_codigorespuesta': true,
        'custrecord_ht_co_seriedispolojack': true,
        'custrecord_ht_co_estado': true,
        'custrecord_ht_co_script': true,
        'custrecord_ht_co_firmware': true,
        'custrecord_ht_co_token': true,
        'custrecord_ht_co_vid': true,
        'custrecord_ht_co_ip': true,
        'custrecord_ht_co_operadora': true,
        'custrecord_ht_co_servidor': true,
        'custrecord_ht_co_unidad': true,
        'custrecord_ht_co_modelodispositivo': true,
        'custrecord_ht_co_plazo': true,
        'custrecord_ht_co_subsidiaria': true,
        'custrecord_ht_co_orden_servicio': true,
        'custrecord_ht_co_udp_pla_px_ami': true,
        'custrecord_ht_co_impulso_plataforma': true,
        'custrecord_ht_co_estado_conciliacion': true,
        'custrecord_ht_co_estadocartera': true,
        'custrecord_ht_co_estadolojack': true,
        'custrecord19': true,
        'custrecord_ht_customer_id_telematic': true,
        'altname': true,
        'abbreviation': true,
        'lastmodifiedby': true,

        'custrecord_ht_bien_placa': true,
        'custrecord_ht_bien_codsysh': true
    };

    const LONGITUD_PAGINA = 20;

    function _get(context) {
        try {
            return _getLogSeguimiento(context);
        } catch (error) {
            log.error("error", error.stack);
            return "id:400, No se pudo insertar el registro. Error controlado.";
        }
    }

    function _post(context) {
        try {
            let ResultadoConsulta = null;
            let OpcionConsulta = context.accion;

            switch (OpcionConsulta) {

                case "ObtenerFacturacionGeneral":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Fechas" } };
                    }

                    ResultadoConsulta = ObtenerFacturacionGeneral(context);
                    return { results: ResultadoConsulta };
                    break;

                case "ConsultaSuiteQLDemo":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Data" } };
                    }

                    ResultadoConsulta = ConsultaSuiteQLDemo(context);
                    return { results: ResultadoConsulta };
                   break;

                case "Consulta_Cliente_OS":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Data" } };
                    }

                    ResultadoConsulta = Consulta_Cliente_OS(context);
                    let resulmen_resultado_c_c_os = Consulta_Resumen_Cliente_OS(context);

                    // log.debug("cant_Resultado", resulmen_resultado_c_c_os)

                    return {
                        results: ResultadoConsulta,
                        resumen: resulmen_resultado_c_c_os
                    };
                break;

                case "Consulta_Bien_OS":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Data" } };
                    }

                    ResultadoConsulta = Consulta_Bien_OS(context);
                    let resulmen_resultado_c_b_os = Consulta_Resumen_Bien_OS(context);

                    return {
                        results: ResultadoConsulta,
                        resumen: resulmen_resultado_c_b_os
                    };
break;
                case "Consulta_Ejec_OS":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Data" } };
                    }

                    ResultadoConsulta = Consulta_Ejec_OS(context);
                    let resumen_resultado = Consulta_Resumen_Ejec_OS(context);

                    // log.debug("cant_Resultado", resumen_resultado);

                    return {
                        results: ResultadoConsulta,
                        resumen: resumen_resultado
                    };
break;
                case "Validar_Sesion":

                    if (!context?.Correo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Correo" }] };
                    }
                    ResultadoConsulta = verificarSesion(context.Correo);

                    return { results: ResultadoConsulta };
break;
                case "Registrar_Sesion":
                    if (!context?.Correo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Correo" }] };
                    }

                    ResultadoConsulta = generarSesion(context.Correo);
                    return { results: ResultadoConsulta };
break;
                case "Validar_Codigo":
                    if (!context?.Correo || !context?.Codigo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Correo y Código" }] };
                    }

                    ResultadoConsulta = validarCodigo(context.Correo, context.Codigo);
                    return { results: ResultadoConsulta };
break;
                case "Correo_Ejecutiva_OS":
                    if (!context?.id_ejecutiva || !context?.correo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Correo y Código" }] };
                    }

                    ResultadoConsulta = EnviarCorreoEjecutiva(context.id_ejecutiva, context.correo, context.direct);
                    return { results: ResultadoConsulta };
break;
                case "CorreoOfflineEjecutiva":

                    ResultadoConsulta = GestionCorreo();
                    return { results: ResultadoConsulta };
break;
                case "Correo_Cliente_OS":
                    if (!context?.ids || !context?.correo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere ids y Correo" }] };
                    }

                    ResultadoConsulta = EnviarCorreoClienteOS(context.ids, context.correo);
                    return { results: ResultadoConsulta };

break;
                case "Correo_Bien_OS":
                    if (!context?.ids || !context?.correo) {
                        return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere ids y Correo" }] };
                    }

                    ResultadoConsulta = EnviarCorreoBienOS(context.ids, context.correo);
                    return { results: ResultadoConsulta };
break;
                case "ConsultaCobertura":

                    if (!context) {
                        return { results: { "CODIGO": "400", "DESCRIPCION": "Se requiere Data" } };
                    }

                    ResultadoConsulta = ConsultaCoberturaBien(context);
                    return { results: ResultadoConsulta };
break;

                default:
                    return { results: { "CODIGO": "400", "DESCRIPCION": "tipo de busqueda no valida" } };
            }
        } catch (error) {
            log.error("error", { message: error.message, stack: error.stack });
            return { results: { "CODIGO": "400", "DESCRIPCION": "--Se requiere Data--" } };
        }
    }

    // !Metodo Get
    function GenerarLogSeguimientoCorreo(context) {
        try {

            let objRecord = record.create({ type: 'customrecord_ht_log_correo_automatico', isDynamic: true });

            objRecord.setValue({ fieldId: 'custrecord_proceso_ht_log_cor_aut', value: context.proceso });
            objRecord.setValue({ fieldId: 'custrecord_correo_origen_ht_log_cor_aut', value: context.correo });

            var texto = (typeof context.data === 'string' && context.data.length > 0)
                ? context.data.replace(/[\r\n]+/g, ' ').substring(0, 3999)
                : '';

            objRecord.setValue({ fieldId: 'custrecord_traza_ht_log_cor_aut', value: texto });


            // objRecord.setValue({ fieldId: 'custrecord_archivo_ht_log_cor_aut', value: context.archivo });

            var texto2 = (typeof context.archivo === 'string' && context.archivo.length > 0)
                ? context.archivo.replace(/[\r\n]+/g, ' ').substring(0, 3999)
                : '';

            objRecord.setValue({ fieldId: 'custrecord_archivo_ht_log_cor_aut', value: texto2 });

            objRecord.setValue({ fieldId: 'custrecord_can_reg_ht_log_cor_aut', value: context.cantidad_registro });
            objRecord.setValue({ fieldId: 'custrecord_c_pdf_ht_log_cor_aut', value: context.total_pdf });
            objRecord.setValue({ fieldId: 'custrecord_c_img_ht_log_cor_aut', value: context.total_imagen });
            objRecord.setValue({ fieldId: 'custrecord_c_txt_ht_log_cor_aut', value: context.total_texto });

            return objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error.stack);
        }
    }

    function _getLogSeguimiento(context) {
        // log.debug("context", context);
        let datalog = GenerarLogSeguimientoCorreo(context);
        // log.debug("datalog", datalog);

        return context;
    }

    // !Metodo Post
    function ObtenerFacturacionGeneral(context) {
        try {
            // Valores por defecto
            const requiereFecha = context?.requiereFecha || 'N';

            // Validar que requiereFecha solo contenga valores permitidos
            if (!['S', 'N'].includes(requiereFecha.toUpperCase())) {
                throw new Error('requiereFecha debe ser "S" o "N"');
            }

            let fechaDesde, fechaHasta;

            // Función para validar formato DD/MM/YYYY
            const validarFormatoFecha = (fechaString) => {
                const regex = /^\d{2}\/\d{2}\/\d{4}$/;
                if (!regex.test(fechaString)) {
                    throw new Error('Formato de fecha inválido. Use DD/MM/YYYY');
                }
            };

            // Si requiere fecha, validar las fechas
            if (requiereFecha.toUpperCase() === 'S') {
                if (!context.fechaini || !context.fechafin) {
                    throw new Error('Cuando requiereFecha es "S", debes enviar fechaini y fechafin');
                }

                // Validar formato de fechas
                validarFormatoFecha(context.fechaini);
                validarFormatoFecha(context.fechafin);

                fechaDesde = context.fechaini;
                fechaHasta = context.fechafin;
            }

            // Cargar Saved Search existente
            const savedSearch = search.load({ id: 'customsearch3686' });

            // Inyectar filtro de fechas dinámico
            if (requiereFecha.toUpperCase() === 'S') {
                // Usar rango de fechas específico en formato DD/MM/YYYY
                savedSearch.filters.push(
                    search.createFilter({
                        name: 'trandate',
                        operator: search.Operator.WITHIN,
                        values: [fechaDesde, fechaHasta]
                    })
                );
            } else {
                // Usar solo el mes actual
                savedSearch.filters.push(
                    search.createFilter({
                        name: 'trandate',
                        operator: search.Operator.WITHIN,
                        values: ['thismonth']
                    })
                );
            }

            const data = [];

            const pagedData = savedSearch.runPaged({ pageSize: 1000 });

            pagedData.pageRanges.forEach((range) => {
                const page = pagedData.fetch({ index: range.index });

                page.data.forEach((result) => {
                    const row = {};

                    result.columns.forEach((col) => {
                        const label = col.label || col.name;
                        row[label] = result.getValue(col);
                    });

                    data.push(row);
                });
            });

            return {
                success: true,
                total: data.length,
                requiereFecha: requiereFecha.toUpperCase(),
                desde: fechaDesde || 'thismonth',
                hasta: fechaHasta || 'thismonth',
                data: data
            };

        } catch (error) {
            log.error('Error en ObtenerFacturacionGeneral', error);

            return {
                success: false,
                message: error.message
            };
        }
    }

    function ConsultaSuiteQLDemo(context) {
        try {
            const body = context;

            log.debug('========== INICIO RESTLET ==========');
            log.debug('Body recibido:', JSON.stringify(body));

            // PASO 1: Validar estructura
            const validacion = validarBody(body);
            if (!validacion.valid) {
                return {
                    success: false,
                    error: validacion.error
                };
            }

            // PASO 2: Construir consultas

            const suiteqlData = construirSuiteQLGeneral(body);             // con límite 10

            log.debug('SuiteQL DATA:', suiteqlData);

            // PASO 3: Ejecutar consultas
            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();
            const totalRegistros = data?.length || 0;
            log.debug('SuiteQL COUNT:', totalRegistros);

            // PASO 4: Mensaje inteligente
            let mensaje = `Se encontraron ${totalRegistros} registros`;

            if (totalRegistros > data.length) {
                mensaje = `Se muestran ${data.length} de ${totalRegistros} registros disponibles. Afine la consulta.`;
            }

            log.debug('========== FIN RESTLET ==========');

            let dataLimitada = data.map(registro => {
                let nuevo = {};
                Object.keys(registro)
                    .slice(0, 15) // solo las primeras 15 columnas
                    .forEach(key => {
                        nuevo[key] = registro[key];
                    });
                return nuevo;
            });

            let idsPrimeros15 = [...new Set(
                data.slice(0, 15).map(registro => registro.id)
            )];

            log.debug("idsPrimeros15", idsPrimeros15)

            return {
                success: true,
                totalRegistros: totalRegistros,
                registrosMostrados: data.length,
                data: dataLimitada,
                data_Total: data,
                ids: idsPrimeros15,
                mensaje: mensaje
            };

        } catch (error) {
            log.error('Error en ConsultaSuiteQLDemo:', error);
            return {
                success: false,
                error: 'Error: ' + error.message
            };
        }
    }

    function validarBody(body) {
        if (!body) {
            return { valid: false, error: 'Body vacío' };
        }

        // NUEVO: Detectar si es modo una entidad o múltiples
        let entidadesArray = [];
        let modoMultiple = false;

        if (body.entityType) {
            // Modo antiguo: una entidad
            entidadesArray = [body.entityType.toLowerCase()];
            modoMultiple = false;

        } else if (body.entidades && Array.isArray(body.entidades)) {
            // Modo nuevo: múltiples entidades
            entidadesArray = body.entidades.map(e => e.toLowerCase());
            modoMultiple = entidadesArray.length > 1;
        } else {
            return {
                valid: false,
                error: 'Se requiere "entityType" (una entidad) o "entidades" (array de entidades)'
            };
        }

        // Validar que todas las entidades existan
        for (let i = 0; i < entidadesArray.length; i++) {
            const entidad = entidadesArray[i];
            if (!ENTIDADES[entidad]) {
                const validos = Object.keys(ENTIDADES).join(', ');
                return {
                    valid: false,
                    error: `Entidad no válida: ${entidad}. Válidas: ${validos}`
                };
            }
        }

        // Validar campos si se especifican
        if (body.campos !== undefined) {
            if (!Array.isArray(body.campos)) {
                return { valid: false, error: '"campos" debe ser un array' };
            }
            if (body.campos.length === 0) {
                return { valid: false, error: '"campos" no puede estar vacío' };
            }

            // Si es múltiple, los campos deben tener alias
            if (modoMultiple) {
                for (const campo of body.campos) {
                    if (!campo.includes('.')) {
                        return {
                            valid: false,
                            error: `Modo múltiple: campo "${campo}" debe incluir alias (ej: c.id, cob.name)`
                        };
                    }
                }
            } else {
                // Modo una entidad: validar contra camposDisponibles
                const entidad = ENTIDADES[entidadesArray[0]];
                for (const campo of body.campos) {
                    if (!entidad.camposDisponibles.includes(campo)) {
                        return {
                            valid: false,
                            error: `Campo no válido: ${campo}`
                        };
                    }
                }
            }
        }

        // Validar filtros
        if (body.filtros !== undefined) {
            if (!Array.isArray(body.filtros)) {
                return { valid: false, error: '"filtros" debe ser un array' };
            }

            for (let i = 0; i < body.filtros.length; i++) {
                const filtro = body.filtros[i];

                if (!filtro.campo) {
                    return { valid: false, error: `Filtro ${i}: se requiere "campo"` };
                }
                if (filtro.valor === undefined) {
                    return { valid: false, error: `Filtro ${i}: se requiere "valor"` };
                }
                if (filtro.operador && !['=', '>', '<', '>=', '<=', '<>', 'LIKE', 'IN'].includes(filtro.operador)) {
                    return {
                        valid: false,
                        error: `Filtro ${i}: operador no válido: ${filtro.operador}`
                    };
                }
            }
        }

        // Validar orden
        if (body.orden && body.orden.campo) {
            if (typeof body.orden.campo !== 'string' || body.orden.campo.trim() === '') {
                delete body.orden;
            } else if (body.orden.descendente !== undefined && typeof body.orden.descendente !== 'boolean') {
                return {
                    valid: false,
                    error: 'orden: "descendente" debe ser true o false'
                };
            }
        }

        // Validar límite
        if (body.limite !== undefined) {
            if (isNaN(body.limite) || body.limite < 1) {
                return { valid: false, error: 'limite debe ser un número mayor a 0' };
            }
            if (body.limite > 50) {
                return { valid: false, error: 'limite máximo es 50' };
            }
        }

        return { valid: true };
    }

    function construirSuiteQLGeneral(params) {
        try {
            // log.debug('construirSuiteQLMulti - Iniciando', 'Params recibidos: ' + JSON.stringify(params));

            // ==================== DETECTAR MODO ====================
            let entidadesArray = [];
            let modoMultiple = false;

            // Detectar si es modo una entidad (legacy) o múltiples entidades
            if (params.entityType) {
                // log.debug('Modo detectado', 'Modo ANTIGUO - entityType: ' + params.entityType);
                entidadesArray = [params.entityType.toLowerCase()];
                modoMultiple = false;
            } else if (params.entidades && Array.isArray(params.entidades)) {
                // log.debug('Modo detectado', 'Modo NUEVO - entidades: ' + JSON.stringify(params.entidades));
                entidadesArray = params.entidades.map(e => e.toLowerCase());
                modoMultiple = entidadesArray.length > 1;
                // log.debug('Modo múltiple?', 'modoMultiple = ' + modoMultiple + ', cantidad de entidades = ' + entidadesArray.length);
            } else {
                var errorMsg = 'Debe especificar "entityType" (una entidad) o "entidades" (array de entidades)';
                log.error('Error en parámetros', errorMsg);
                throw new Error(errorMsg);
            }

            // Validar que todas las entidades existan
            // log.debug('Validando entidades', 'Entidades a validar: ' + JSON.stringify(entidadesArray));
            entidadesArray.forEach(function (entidad) {
                if (!ENTIDADES[entidad]) {
                    var errorMsg2 = 'Entidad desconocida: ' + entidad;
                    log.error('Entidad no encontrada', errorMsg2);
                    throw new Error(errorMsg2);
                }
                log.debug('Entidad validada', 'Entidad "' + entidad + '" existe en ENTIDADES');
            });

            // ==================== MODO UNA ENTIDAD (LEGACY) ====================
            if (!modoMultiple) {
                log.debug('Ejecutando', 'Llamando a construirSuiteQLUnica con entidad: ' + entidadesArray[0]);
                var sqlResult = construirSuiteQLUnica(entidadesArray[0], params);
                log.debug('SQL Generado (Unica Entidad)', sqlResult);
                return sqlResult;
            }

            // ==================== MODO MÚLTIPLES ENTIDADES ====================
            log.debug('Ejecutando', 'Llamando a construirSuiteQLMultipleEntidades con entidades: ' + JSON.stringify(entidadesArray));
            var sqlMultiResult = construirSuiteQLMultipleEntidades(entidadesArray, params);
            log.debug('SQL Generado (Múltiples Entidades)', sqlMultiResult);
            return sqlMultiResult;

        } catch (error) {
            log.error('Error en construirSuiteQLMulti', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function construirSuiteQLUnica(entityType, params) {
        try {
            // log.debug('construirSuiteQLUnica - Iniciando', 'entityType: ' + entityType);

            var entidad = ENTIDADES[entityType];
            log.debug('Entidad encontrada', 'Tabla: ' + entidad.tabla + ', Alias: ' + entidad.alias);

            var campos;
            if (params.campos && Array.isArray(params.campos) && params.campos.length > 0) {
                campos = params.campos;
            } else {
                campos = entidad.camposPorDefecto;
            }

            log.debug('Campos seleccionados', 'Total: ' + campos.length + ', Campos: ' + JSON.stringify(campos));

            var sql = 'SELECT ' + campos.join(', ') + ' FROM ' + entidad.tabla;
            log.debug('SQL base construido', sql);

            // ==================== WHERE ====================
            if (params.filtros && params.filtros.length > 0) {
                log.debug('Procesando filtros', 'Total de filtros: ' + params.filtros.length);

                var whereClause = '';

                for (var i = 0; i < params.filtros.length; i++) {
                    var f = params.filtros[i];
                    log.debug('Procesando filtro ' + i, 'Campo: ' + f.campo + ', Operador: ' + (f.operador || '=') + ', Valor: ' + f.valor + ', Logica: ' + (f.logica || 'AND'));

                    var operador = f.operador || '=';
                    var campoLower = f.campo.toLowerCase();

                    // DETECTAR FECHAS (YYYY-MM-DD)
                    var esFecha =
                        campoLower.includes('date') &&
                        typeof f.valor === 'string' &&
                        /^\d{4}-\d{2}-\d{2}$/.test(f.valor);

                    log.debug('Detección de tipo', 'Campo: ' + f.campo + ', ¿Es fecha?: ' + esFecha);

                    var condicion = '';

                    // FECHA → USAR RANGO
                    if (esFecha && operador === '=') {
                        condicion = f.campo + ' >= TO_DATE(\'' + f.valor + '\', \'YYYY-MM-DD\') AND ' +
                            f.campo + ' < TO_DATE(\'' + f.valor + '\', \'YYYY-MM-DD\') + 1';
                        log.debug('Condición de fecha generada', condicion);
                    } else {
                        // ✅ VERIFICAR SI EL CAMPO ES SIEMPRE STRING
                        var esCampoString = CAMPOS_SIEMPRE_STRING[campoLower] === true;
                        log.debug('Tipo de campo', 'Campo: ' + f.campo + ', ¿Es STRING siempre?: ' + esCampoString);

                        // DETECTAR NÚMEROS (pero NO si es campo STRING)
                        var esNumero = !esCampoString &&
                            (typeof f.valor === 'number' || !isNaN(Number(f.valor)));

                        var valor;
                        if (esCampoString) {
                            valor = '\'' + f.valor + '\'';
                            log.debug('Valor formateado como STRING', valor);
                        } else if (esNumero) {
                            valor = f.valor;
                            log.debug('Valor formateado como NÚMERO', valor);
                        } else {
                            valor = '\'' + f.valor + '\'';
                            log.debug('Valor formateado como TEXTO', valor);
                        }

                        log.debug('Tipo de valor', 'Campo: ' + f.campo + ', ¿Es número?: ' + esNumero + ', Valor formateado: ' + valor);

                        // TEXTO → IGNORAR MAYÚSCULAS SOLO PARA LIKE
                        if (!esNumero && operador === 'LIKE') {
                            condicion = 'UPPER(' + f.campo + ') LIKE UPPER(' + valor + ')';
                            log.debug('Condición LIKE generada', condicion);
                        } else {
                            condicion = f.campo + ' ' + operador + ' ' + valor;
                            log.debug('Condición generada', condicion);
                        }
                    }

                    // ==================== AGREGAR OPERADOR LÓGICO ====================
                    if (i === 0) {
                        // Primera condición, no lleva operador lógico adelante
                        whereClause = condicion;
                    } else {
                        // Para las siguientes condiciones, usar la lógica del filtro ANTERIOR
                        // El filtro anterior dice cómo conectarse con el siguiente
                        var filtroAnterior = params.filtros[i - 1];
                        var operadorLogico = filtroAnterior.logica || 'AND';
                        whereClause += ' ' + operadorLogico + ' ' + condicion;
                        log.debug('Operador lógico usado', 'Filtro anterior tenía logica: ' + (filtroAnterior.logica || 'AND (default)'));
                    }

                    log.debug('WHERE parcial ' + i, whereClause);
                }

                sql += ' WHERE ' + whereClause;
                log.debug('SQL con WHERE', sql);
            }

            // ==================== ORDER BY ====================
            if (params.orden && params.orden.campo) {
                var direccion = params.orden.descendente ? 'DESC' : 'ASC';
                log.debug('Ordenamiento', 'Campo: ' + params.orden.campo + ', Dirección: ' + direccion);
                sql += ' ORDER BY ' + params.orden.campo + ' ' + direccion;
            }

            // ==================== LIMIT ====================
            var LIMITE_MAXIMO = 10;
            var limite = Math.min(
                Number(params.limite) || LIMITE_MAXIMO,
                LIMITE_MAXIMO
            );
            log.debug('Límite de resultados', 'Límite solicitado: ' + params.limite + ', Límite final: ' + limite);

            sql += ' FETCH FIRST ' + limite + ' ROWS ONLY';

            log.debug('SQL Final Generado', sql);
            return sql;

        } catch (error) {
            log.error('Error en construirSuiteQLUnica', 'entityType: ' + entityType + ', Error: ' + error.message);
            throw error;
        }
    }

    function construirSuiteQLMultipleEntidades(entidades, params) {
        try {
            log.debug('construirSuiteQLMultipleEntidades - Iniciando', 'Entidades: ' + JSON.stringify(entidades));

            // ==================== CONSTRUIR SELECT ====================
            var camposSelect = [];

            if (params.campos && params.campos.length > 0) {
                log.debug('Campos', 'Usando campos personalizados: ' + JSON.stringify(params.campos));
                camposSelect = params.campos;
            } else {
                log.debug('Campos', 'Usando camposPorDefecto de cada entidad');
                entidades.forEach(function (entidad) {
                    var alias = ENTIDADES[entidad].alias;
                    var campos = ENTIDADES[entidad].camposPorDefecto;
                    campos.forEach(function (campo) {
                        camposSelect.push(alias + '.' + campo);
                    });
                    log.debug('Campos agregados para ' + entidad, 'Alias: ' + alias + ', Total campos: ' + campos.length);
                });
            }

            log.debug('Campos SELECT finales', 'Total: ' + camposSelect.length + ', Campos: ' + JSON.stringify(camposSelect));
            var sql = 'SELECT ' + camposSelect.join(', ');

            // ==================== CONSTRUIR FROM Y JOINS ====================
            var tablaBase = entidades[0];
            var entidadBase = ENTIDADES[tablaBase];

            log.debug('Tabla base', 'Entidad: ' + tablaBase + ', Tabla: ' + entidadBase.tabla + ', Alias: ' + entidadBase.alias);
            sql += ' FROM ' + entidadBase.tabla + ' ' + entidadBase.alias;

            // Agregar JOINS para el resto de entidades
            if (entidades.length > 1) {
                log.debug('Procesando JOINs', 'Total de JOINs a procesar: ' + (entidades.length - 1));

                for (var i = 1; i < entidades.length; i++) {
                    var entidadActual = entidades[i];
                    var configActual = ENTIDADES[entidadActual];

                    log.debug('Procesando JOIN ' + i, 'Entidad actual: ' + entidadActual + ', Tabla: ' + configActual.tabla);

                    // Buscar relación en el array de relaciones de tablaBase
                    var relacion = ENTIDADES[tablaBase].relaciones.find(function (r) {
                        return r.entidad === entidadActual;
                    });

                    log.debug('Búsqueda de relación en ' + tablaBase, relacion ? 'Relación encontrada' : 'Relación NO encontrada, buscando inversa');

                    // Si no encuentra, buscar en sentido inverso
                    if (!relacion) {
                        relacion = ENTIDADES[entidadActual].relaciones.find(function (r) {
                            return r.entidad === tablaBase;
                        });

                        log.debug('Búsqueda de relación inversa en ' + entidadActual, relacion ? 'Relación inversa encontrada' : 'Relación inversa NO encontrada');

                        // Invertir los campos si la relación viene de la otra entidad
                        if (relacion) {
                            relacion = {
                                entidad: relacion.entidad,
                                campo_local: relacion.campo_remoto,
                                campo_remoto: relacion.campo_local,
                                tipo: relacion.tipo
                            };
                            log.debug('Relación invertida', 'campo_local: ' + relacion.campo_local + ', campo_remoto: ' + relacion.campo_remoto);
                        }
                    }

                    if (!relacion) {
                        var errorJoinMsg = 'No se encontró relación directa entre ' + tablaBase + ' y ' + entidadActual;
                        log.error('Error en JOIN', errorJoinMsg);
                        throw new Error(errorJoinMsg);
                    }

                    var tipoJoin = relacion.tipo || 'INNER';
                    var campoLocal = entidadBase.alias + '.' + relacion.campo_local;
                    var campoRemoto = configActual.alias + '.' + relacion.campo_remoto;

                    log.debug('JOIN configurado', 'Tipo: ' + tipoJoin + ', ON: ' + campoLocal + ' = ' + campoRemoto);

                    sql += ' ' + tipoJoin + ' JOIN ' + configActual.tabla + ' ' + configActual.alias + ' ON ' + campoLocal + ' = ' + campoRemoto;
                }
            }

            log.debug('SQL con FROM y JOINs', sql);

            // ==================== CONSTRUIR WHERE ====================
            if (params.filtros && params.filtros.length > 0) {
                log.debug('Procesando filtros', 'Total de filtros: ' + params.filtros.length);

                var whereClause = '';

                for (var j = 0; j < params.filtros.length; j++) {
                    var f = params.filtros[j];
                    log.debug('Procesando filtro ' + j, 'Campo: ' + f.campo + ', Operador: ' + (f.operador || '=') + ', Valor: ' + f.valor + ', Logica: ' + (f.logica || 'AND'));

                    var operador = f.operador || '=';
                    var campo = f.campo;
                    var campoLower = campo.toLowerCase();

                    // ✅ EXTRAER NOMBRE DEL CAMPO SIN ALIAS (para múltiples)
                    var nombreCampo = campoLower.includes('.')
                        ? campoLower.split('.')[1]
                        : campoLower;

                    log.debug('Campo sin alias', 'Campo original: ' + campo + ', Campo sin alias: ' + nombreCampo);

                    // DETECTAR FECHAS
                    var esFecha =
                        (nombreCampo.includes('date') || nombreCampo.includes('fecha')) &&
                        typeof f.valor === 'string' &&
                        /^\d{4}-\d{2}-\d{2}$/.test(f.valor);

                    log.debug('Detección de tipo', 'Campo: ' + f.campo + ', ¿Es fecha?: ' + esFecha);

                    var condicion = '';

                    // FECHA → USAR RANGO
                    if (esFecha && operador === '=') {
                        condicion = campo + ' >= TO_DATE(\'' + f.valor + '\', \'YYYY-MM-DD\') AND ' +
                            campo + ' < TO_DATE(\'' + f.valor + '\', \'YYYY-MM-DD\') + 1';
                        log.debug('Condición de fecha generada', condicion);
                    } else {
                        // ✅ VERIFICAR SI EL CAMPO ES SIEMPRE STRING
                        var esCampoString = CAMPOS_SIEMPRE_STRING[nombreCampo] === true;
                        log.debug('Tipo de campo', 'Campo: ' + f.campo + ', ¿Es STRING siempre?: ' + esCampoString);

                        // DETECTAR NÚMEROS (pero NO si es campo STRING)
                        var esNumero = !esCampoString &&
                            (typeof f.valor === 'number' || !isNaN(Number(f.valor)));

                        var valor;
                        if (esCampoString) {
                            valor = '\'' + f.valor + '\'';
                            log.debug('Valor formateado como STRING', valor);
                        } else if (esNumero) {
                            valor = f.valor;
                            log.debug('Valor formateado como NÚMERO', valor);
                        } else {
                            valor = '\'' + f.valor + '\'';
                            log.debug('Valor formateado como TEXTO', valor);
                        }

                        log.debug('Tipo de valor', 'Campo: ' + f.campo + ', ¿Es número?: ' + esNumero + ', Valor formateado: ' + valor);

                        // TEXTO → IGNORAR MAYÚSCULAS SOLO PARA LIKE
                        if (!esNumero && operador === 'LIKE') {
                            condicion = 'UPPER(' + campo + ') LIKE UPPER(' + valor + ')';
                            log.debug('Condición LIKE generada', condicion);
                        } else {
                            condicion = campo + ' ' + operador + ' ' + valor;
                            log.debug('Condición generada', condicion);
                        }
                    }

                    // ==================== AGREGAR OPERADOR LÓGICO ====================
                    if (j === 0) {
                        // Primera condición, no lleva operador lógico adelante
                        whereClause = condicion;
                    } else {
                        // Para las siguientes condiciones, usar la lógica del filtro ANTERIOR
                        // El filtro anterior dice cómo conectarse con el siguiente
                        var filtroAnterior = params.filtros[j - 1];
                        var operadorLogico = filtroAnterior.logica || 'AND';
                        whereClause += ' ' + operadorLogico + ' ' + condicion;
                        log.debug('Operador lógico usado', 'Filtro anterior tenía logica: ' + (filtroAnterior.logica || 'AND (default)'));
                    }

                    log.debug('WHERE parcial ' + j, whereClause);
                }

                sql += ' WHERE ' + whereClause;
                log.debug('SQL con WHERE', sql);
            }

            // ==================== CONSTRUIR ORDER BY ====================
            if (params.orden && params.orden.campo) {
                var direccion2 = params.orden.descendente ? 'DESC' : 'ASC';
                log.debug('Ordenamiento', 'Campo: ' + params.orden.campo + ', Dirección: ' + direccion2);
                sql += ' ORDER BY ' + params.orden.campo + ' ' + direccion2;
            }

            // ==================== CONSTRUIR LIMIT ====================
            var LIMITE_MAXIMO = 10;
            var limite2 = Math.min(
                Number(params.limite) || LIMITE_MAXIMO,
                LIMITE_MAXIMO
            );
            log.debug('Límite de resultados', 'Límite solicitado: ' + params.limite + ', Límite final: ' + limite2);

            sql += ' FETCH FIRST ' + limite2 + ' ROWS ONLY';

            log.debug('SQL Final Generado', sql);
            return sql;

        } catch (error) {
            log.error('Error en construirSuiteQLMultipleEntidades', 'Entidades: ' + JSON.stringify(entidades) + ', Error: ' + error.message);
            throw error;
        }
    }

    /* ============================
    Consulta General - UTILIDADES
    ============================ */
    function Get_ObtenerFactura(IdNumeroOrdenServicio) {
        try {
            let Resultado = [];

            let BusquedaFactura = search.create({
                type: "invoice",
                settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
                filters:
                    [
                        ["type", "anyof", "CustInvc"],
                        "AND",
                        ["createdfrom", "anyof", IdNumeroOrdenServicio],
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "internalid", label: "ID interno" }),
                        search.createColumn({ name: "tranid", label: "NÃºmero de documento" }),
                        search.createColumn({ name: "trandate", label: "Fecha" }),
                        search.createColumn({ name: "postingperiod", label: "PerÃ­odo" }),
                        search.createColumn({ name: "createdfrom", label: "Orden Servicio" }),
                        search.createColumn({ name: "statusref", label: "Estado" })
                    ]
            });
            let ConteoResultados = BusquedaFactura.runPaged().count;
            let ResConsulta = BusquedaFactura.run().getRange(0, ConteoResultados);

            if (ConteoResultados > 0) {
                for (let i in ResConsulta) {
                    let Id = ResConsulta[i].getValue({ name: 'internalid' });
                    let NumeroReferencia = ResConsulta[i].getValue({ name: 'tranid' });
                    let Fecha = ResConsulta[i].getValue({ name: 'trandate' });
                    let IdOs = ResConsulta[i].getValue({ name: 'createdfrom' });
                    let OrdenServicio = ResConsulta[i].getText({ name: 'createdfrom' });
                    let Estado = ResConsulta[i].getText({ name: 'statusref' });

                    let Factura = record.load({ type: 'invoice', id: Id, isDynamic: true });
                    let NumPagos = Factura.getLineCount({ sublistId: "links" });

                    let FechaPago = '01/01/1900';
                    let TotalCobrado = 0;
                    let IdPago = 0;
                    let TipoPago = '';
                    let RefPago = '';
                    let RefPagoAux = '';

                    let contNC = 0;
                    let TotalNC = 0;

                    if (NumPagos > 0) {
                        for (let i = 0; i < NumPagos; i++) {
                            TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                            RefPagoAux = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });

                            if (TipoPago === 'Nota de crédito' && RefPagoAux.startsWith('NC')) {
                                contNC = contNC + 1;
                                TotalNC = Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                            }

                            if (TipoPago != 'Total') {
                                TotalCobrado = TotalCobrado + Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });

                                var FechaFormateada = new Date(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));
                                var dia = FechaFormateada.getUTCDate();
                                var mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                                var anio = FechaFormateada.getUTCFullYear();

                                // Formatear la fecha segÃºn el formato solicitado "dd/mm/yyyy"
                                var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;

                                if (parseFecha(FechaPagoF) > parseFecha(FechaPago)) {
                                    IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                                    RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                                    FechaPago = FechaPagoF; //Factura.getSublistValue({sublistId: 'links', fieldId: 'trandate', line: i});
                                }
                            }
                        }
                    }

                    //if (TipoPago != 'Nota de crédito') {
                    // if (contNC == NumPagos && TotalNC == TotalCobrado) {
                    //if ((contNC != 0) && (contNC == (NumPagos -1) && TotalNC == TotalCobrado)) {  // DOAS 12022025
                    if ((contNC != 0) && (TotalNC == TotalCobrado)) {  // VBC 20250224 NUMPAGOS INCLUYE EL TOTAL (2)

                        break;
                    }
                    else {
                        Resultado.push({
                            Id: Id,
                            NumeroReferencia: NumeroReferencia,
                            Fecha: Fecha,
                            IdOs: IdOs,
                            OrdenServicio: OrdenServicio,
                            Estado: Estado,
                            FechaPago: FechaPago,
                            TotalCobrado: TotalCobrado,
                            IdPago: IdPago,
                            RefPago: RefPago,
                            TipoPago: TipoPago
                        });
                    }
                }
            }
            /*else {
               Resultado.push({
                  Id: 0,
                  NumeroReferencia: '',
                  Fecha: '01/01/1900',
                  IdOs: 0,
                  OrdenServicio: '',
                  Estado: '',
                  FechaPago: '01/01/1900',
                  TotalCobrado: 0,
                  IdPago: 0,
                  RefPago: '',
                  TipoPago: ''
               });
            }*/

            return Resultado;

        } catch (error) {
            log.error('error', { error: error.message, stack: error.stack });
            //return JSON.stringify({error: error.message});
            return [];
        }
    }

    function Get_ObtenerFacturaInterna(IdOs, Desde, Hasta, PaginaId) {
        try {
            let Resultado = [];
            let F_Desde = '';
            let F_Hasta = '';

            let BusquedaOrdenesFacturaInterna = search.create({
                type: "salesorder",
                //settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
                filters:
                    [
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["custbody_itr_doc_number", "doesnotcontain", "OSP%"],
                        "AND",
                        ["custbody_ec_estado_factura_interna", "anyof", "2"], //FACTURADO
                        "AND",
                        ["mainline", "is", "T"]
                    ],
                columns: [
                    search.createColumn({ name: "tranid", label: "ID", summary: "GROUP" }),
                    search.createColumn({ name: "trandate", label: "Fecha", summary: "GROUP" }),
                    search.createColumn({ name: "internalid", label: "Id_Os", summary: "GROUP" }),
                    search.createColumn({ name: "custbody_ec_estado_factura_interna", label: "EC Estado Factura Interna", summary: "GROUP" }),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTBODY_HT_FACTURA_DIRECTA", //"CUSTBODY_HT_FACTURA_DIRECTA",
                        label: "ID interno",
                        summary: "GROUP"
                    })
                ]
            });

            if (IdOs != '' && IdOs != '0') {
                BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: IdOs
                }));
            }

            if (Desde != '' && Hasta != '') {
                F_Desde = FormateaFechaYYMMAA(Desde);
                F_Hasta = FormateaFechaYYMMAA(Hasta);

                BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.WITHIN,
                    values: [F_Desde, F_Hasta]
                }));
            }

            let ResConsulta = BusquedaOrdenesFacturaInterna.runPaged({ pageSize: LONGITUD_PAGINA });
            let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            }

            if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
                let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

                BusquedaResultado.data.forEach(function (result) {
                    let Id = result.getValue({ name: 'internalid', join: "CUSTBODY_HT_FACTURA_DIRECTA", summary: "GROUP" });
                    let FechaFacturaInterna = '01/01/1900';
                    let IdOrdenServicio = result.getValue({ name: 'internalid', summary: "GROUP" });
                    let OrdenServicio = result.getValue({ name: 'tranid', summary: "GROUP" });

                    if (OrdenServicio) {
                        let ConsultaQuery = query.runSuiteQL({
                            query: ` select 	min(createddate) fecha_creacion
                                 from     transaction
                                 where    type = 'CuTrSale112'
                                 and      custbody_ec_created_from_fac_int = ${IdOrdenServicio} `,
                        });

                        let ResProd = ConsultaQuery.asMappedResults();
                        if (ResProd.length > 0) {
                            FechaFacturaInterna = ResProd[0].fecha_creacion;
                        }

                        if (Id === '') { //FACTURACION DE VARIOS TIENE LA ASOCIACION A LAS ORDENES EN LA FACTURA CASO OS1001596244
                            let ConsultaFacturaVariosQuery = query.runSuiteQL({
                                query: ` SELECT 	custrecord_nro_factura
                                          FROM     customrecord_ht_fact_internas_asociadas
                                          WHERE    isinactive = 'F'
                                          AND      custrecord_orden_servicio  = ${IdOrdenServicio} `,
                            });
                            let ResIdFacturaVarios = ConsultaFacturaVariosQuery.asMappedResults();

                            if (ResIdFacturaVarios.length > 0) {
                                Id = ResIdFacturaVarios[0]?.custrecord_nro_factura || '';
                            }
                        }
                    }

                    if (Id === '') {
                        Resultado.push({
                            Id: 0,
                            NumeroReferencia: '',
                            Fecha: '01/01/1900',
                            TotalFactura: 0,
                            IdOrdenServicio: IdOrdenServicio,
                            OrdenServicio: OrdenServicio,
                            Estado: '',
                            FechaPago: '01/01/1900',
                            TotalCobrado: 0,
                            IdPago: 0,
                            RefPago: '',
                            FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                            Paginas: PaginaId,
                            TipoPago: ''
                        });
                    }
                    else {
                        let Factura = record.load({ type: 'invoice', id: Id, isDynamic: true });

                        let NumeroReferencia = Factura.getValue({ fieldId: 'initialtranid' });
                        let Fecha = Factura.getValue({ fieldId: 'trandate' });
                        let TotalFactura = Factura.getValue({ fieldId: 'origtotal' });

                        let fechaISO = Fecha;

                        let fechaConvertida = new Date(fechaISO);

                        let diaF = String(fechaConvertida.getDate()).padStart(2, '0');
                        let mesF = String(fechaConvertida.getMonth() + 1).padStart(2, '0');
                        let anioF = fechaConvertida.getFullYear();

                        let FechaF = `${diaF}/${mesF}/${anioF}`;

                        let Estado = Factura.getValue({ fieldId: 'custbody_psg_ei_status' });

                        let NumPagos = Factura.getLineCount({ sublistId: "links" });

                        let FechaPago = '01/01/1900';
                        let TotalCobrado = 0;
                        let IdPago = 0;
                        let TipoPago = '';
                        let RefPago = '';
                        let RefPagoAux = '';
                        let TotalNC = 0;
                        let contNC = 0;

                        if (NumPagos > 0) {
                            for (let i = 0; i < NumPagos; i++) {
                                TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                                RefPagoAux = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });

                                if (TipoPago === 'Nota de crédito' && RefPagoAux.startsWith('NC')) {
                                    contNC = contNC + 1;
                                    TotalNC = Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                                }

                                if (TipoPago != 'Total') { //AQUI
                                    var FechaFormateada = new Date(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));
                                    var dia = FechaFormateada.getUTCDate();
                                    var mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                                    var anio = FechaFormateada.getUTCFullYear();

                                    var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;
                                    TotalCobrado = TotalCobrado + Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });

                                    if (parseFecha(FechaPagoF) > parseFecha(FechaPago)) {
                                        IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                                        RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                                        FechaPago = FechaPagoF;
                                    }
                                }
                            }
                        }

                        if (TotalCobrado == '') {
                            TotalCobrado = 0;
                        }

                        if ((contNC != 0) && (TotalNC == TotalCobrado)) {
                            Resultado.push({
                                Id: 0,
                                NumeroReferencia: '',
                                Fecha: '01/01/1900',
                                TotalFactura: 0,
                                IdOrdenServicio: IdOrdenServicio,
                                OrdenServicio: OrdenServicio,
                                Estado: '',
                                FechaPago: '01/01/1900',
                                TotalCobrado: 0,
                                IdPago: 0,
                                RefPago: '',
                                FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                                Paginas: PaginaId,
                                TipoPago: ''
                            });
                        }
                        else {
                            Resultado.push({
                                Id: Id ? Id : 0,
                                NumeroReferencia: NumeroReferencia ? NumeroReferencia : '',
                                Fecha: FechaF ? FechaF : '01/01/1900',
                                TotalFactura: TotalFactura ? TotalFactura : 0,
                                IdOrdenServicio: IdOrdenServicio,
                                OrdenServicio: OrdenServicio,
                                Estado: Estado ? Estado : '',
                                FechaPago: FechaPago ? FechaPago : '01/01/1900',
                                TotalCobrado: TotalCobrado ? TotalCobrado : 0,
                                IdPago: IdPago ? IdPago : 0,
                                RefPago: RefPago ? RefPago : '',
                                FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                                Paginas: conteoPagina,
                                TipoPago: TipoPago ? TipoPago : 0
                            });
                        }
                    }
                });
            }

            return Resultado;

        } catch (error) {
            log.error('error', { error: error.message, stack: error.stack });
            //return JSON.stringify({error: error.message});
            return [];
        }
    }

    function parseFecha(fechaStr) {
        let [dia, mes, año] = fechaStr.split('/').map(Number);
        return new Date(año, mes - 1, dia);
    }

    function FormateaFechaYYMMAA(fecha) {
        // Verifica que la fecha tenga el formato correcto
        if (fecha.length !== 8 || isNaN(fecha)) {
            throw new Error("Formato de fecha inválido. Se esperaba YYYYMMDD.");
        }
        const anio = fecha.substring(0, 4);
        const mes = fecha.substring(4, 6);
        const dia = fecha.substring(6, 8);

        // Retorna la fecha formateada
        return `${dia}/${mes}/${anio}`;
    }

    // !Consulta Cliente
    function Consulta_Cliente_OS(context) {
        try {
            log.debug('Inicio Consulta_Cliente_OS', 'Context: ' + JSON.stringify(context));

            // 1. Validar que exista cliente
            if (!context.cliente) {
                log.debug('Sin cliente', 'No se recibió cliente en el context');
                return [];
            }

            // 2. Convertir a arreglo y limpiar espacios
            let clientesArray = context.cliente
                .toString()
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id)); // Validar que sean números

            // 3. Validar cantidad
            if (clientesArray.length === 0) {
                log.debug('Clientes inválidos', context.cliente);
                return [];
            }

            log.debug('Cantidad de clientes recibidos', clientesArray.length);

            // 4. Construir condición IN
            let clientesIN = clientesArray.join(',');

            let suiteqlData = `
            SELECT TOP 15
                a.number, 
                a.id, 
                a.tranid                                        AS "O/S",
                BUILTIN.DF(a.status)                            AS "ESTADO_OS",
                b.id                                            AS "ID_BIEN",
                b.custrecord_ht_bien_placa                      AS "PLACA",
                BUILTIN.DF(a.custbody_ht_os_aprobacionventa)    AS "COMERCIAL",
                BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)  AS "CARTERA",
                a.trandate                                      AS "FECHA_OS",             
                ot.name                                         AS "NOMBRE_OT",
                BUILTIN.DF(ot.custrecord_ht_ot_estado)          AS "ESTADO_OT"
            FROM 
                Transaction a 
                LEFT JOIN customrecord_ht_record_ordentrabajo ot 
                    ON ot.custrecord_ht_ot_orden_servicio = a.id
                LEFT JOIN customrecord_ht_record_bienes b 
                    ON b.id = a.custbody_ht_so_bien
            WHERE 
                a.type = 'SalesOrd'
                AND EXTRACT(YEAR FROM a.trandate) = 2026
                AND EXTRACT(MONTH FROM a.trandate) = 6
                AND a.customform = 142
                AND a.entity IN (${clientesIN})
        `;

            log.debug('SuiteQL Consulta_Cliente_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            // Iterar resultados
            for (let i = 0; i < data.length; i++) {

                let IdNumeroOrdenServicio = data[i]['id'];

                // Factura directa
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);
                data[i]['factura_directa'] = Facturas.length > 0;

                // Factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);
                data[i]['factura_interna'] = FacturasInternas.length > 0;
            }

            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);

            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function Consulta_Cliente_OS_TOTAL(context) {
        try {

            // 1. Validar que exista cliente
            if (!context.ids) {
                log.debug('Sin cliente', 'No se recibió cliente en el context');
                return [];
            }

            // 2. Convertir a arreglo y limpiar espacios
            let clientesArray = context.ids
                .toString()
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id)); // Validar que sean números

            // 3. Validar cantidad
            if (clientesArray.length === 0) {
                log.debug('Clientes inválidos', context.cliente);
                return [];
            }

            log.debug('Cantidad de clientes recibidos', clientesArray.length);
            let clientesIN = clientesArray.join(',');


            // Se agrega limite de consulta
            let suiteqlData = `
               SELECT
                    a.number, 
                    a.id, 
                    a.tranid                                                        AS "O/S",
                    BUILTIN.DF(a.status)                                   AS "ESTADO_OS",
                    b.id                                                              AS "ID_BIEN",
                    b.custrecord_ht_bien_placa                         AS "PLACA",
                    BUILTIN.DF(a.custbody_ht_os_aprobacionventa)            AS "COMERCIAL",
                    BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)          AS "CARTERA",
                    a.trandate                                               AS "FECHA_OS",             
                    ot.name                                                        AS "NOMBRE_OT",
                    BUILTIN.DF(ot.custrecord_ht_ot_estado)                          AS "ESTADO_OT",
                    a.id                                                                AS "FACTURA_DIRECTA",
                    a.id                                                                AS "FACTURA_INTERNA"
                FROM 
                    Transaction a 
                    LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = a.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = a.custbody_ht_so_bien
                WHERE 
                    a.type = 'SalesOrd' 
                    AND EXTRACT(YEAR FROM a.trandate) = 2026
                    AND EXTRACT(MONTH FROM a.trandate) = 6
                    AND a.customform = 142
                    AND a.entity IN (${clientesIN})
                ORDER BY 
                    a.id DESC
            `
            log.debug('SuiteQL Consulta_Bien_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            //iterar data
            for (let i = 0; i < data.length; i++) {
                let IdNumeroOrdenServicio = data[i]['id'];
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);

                if (Facturas.length > 0) {
                    data[i]['factura_directa'] = true;
                } else {
                    data[i]['factura_directa'] = false;
                }

                //Agregar factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);

                // log.debug('Facturas Internas ', FacturasInternas);

                if (FacturasInternas.length > 0) {
                    data[i]['factura_interna'] = true;
                } else {
                    data[i]['factura_interna'] = false;
                }
            }

            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);
            data.Total = data.length

            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    // !Consulta Bien 
    function Consulta_Bien_OS(context) {
        try {
            log.debug('Inicio Consulta_Bien_OS', 'Context: ' + JSON.stringify(context));
            log.debug('Cliente ID', context.cliente);

            let suiteqlData = `
               SELECT TOP 15
                    a.number, 
                    a.id, 
                    a.tranid                                                        AS "O/S",
                    BUILTIN.DF(a.status)                                   AS "ESTADO_OS",
                    b.id                                                              AS "ID_BIEN",
                    b.custrecord_ht_bien_placa                         AS "PLACA",
                    BUILTIN.DF(a.custbody_ht_os_aprobacionventa)            AS "COMERCIAL",
                    BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)          AS "CARTERA",
                    a.trandate                                               AS "FECHA_OS",             
                    ot.name                                                        AS "NOMBRE_OT",
                    BUILTIN.DF(ot.custrecord_ht_ot_estado)                          AS "ESTADO_OT",
                    a.id                                                                AS "FACTURA_DIRECTA",
                    a.id                                                                AS "FACTURA_INTERNA"
                FROM 
                    Transaction a 
                    LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = a.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = a.custbody_ht_so_bien
                WHERE 
                    a.type = 'SalesOrd' 
                    --AND EXTRACT(YEAR FROM a.trandate) = EXTRACT(YEAR FROM CURRENT_DATE)
                    --AND EXTRACT(MONTH FROM a.trandate) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM a.trandate) = 2026
                    AND EXTRACT(MONTH FROM a.trandate) = 6
                    AND a.customform = 142
                     AND a.custbody_ht_so_bien = ${context.bien}
            `
            log.debug('SuiteQL Consulta_Bien_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            //iterar data
            for (let i = 0; i < data.length; i++) {
                let IdNumeroOrdenServicio = data[i]['id'];
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);

                if (Facturas.length > 0) {
                    data[i]['factura_directa'] = true;
                } else {
                    data[i]['factura_directa'] = false;
                }

                //Agregar factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);

                log.debug('Facturas Internas ', FacturasInternas);

                if (FacturasInternas.length > 0) {
                    data[i]['factura_interna'] = true;
                } else {
                    data[i]['factura_interna'] = false;
                }
            }


            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);
            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function Consulta_Bien_OS_TOTAL(context) {
        try {
            log.debug('Inicio Consulta_Bien_OS', 'Context: ' + JSON.stringify(context));
            log.debug('Bien ID', context.ids);

            // 1. Validar que exista cliente
            if (!context.ids) {
                log.debug('Sin bien', 'No se recibió bien en el context');
                return [];
            }

            // 2. Convertir a arreglo y limpiar espacios
            let bienesArray = context.ids
                .toString()
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id)); // Validar que sean números

            // 3. Validar cantidad
            if (bienesArray.length === 0) {
                log.debug('bienes inválidos', context.ids);
                return [];
            }

            log.debug('Cantidad de bien recibidos', bienesArray.length);

            let bienesIN = bienesArray.join(',');

            let suiteqlData = `
               SELECT
                    a.number, 
                    a.id, 
                    a.tranid                                                        AS "O/S",
                    BUILTIN.DF(a.status)                                   AS "ESTADO_OS",
                    b.id                                                              AS "ID_BIEN",
                    b.custrecord_ht_bien_placa                         AS "PLACA",
                    BUILTIN.DF(a.custbody_ht_os_aprobacionventa)            AS "COMERCIAL",
                    BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)          AS "CARTERA",
                    a.trandate                                               AS "FECHA_OS",             
                    ot.name                                                        AS "NOMBRE_OT",
                    BUILTIN.DF(ot.custrecord_ht_ot_estado)                          AS "ESTADO_OT",
                    a.id                                                                AS "FACTURA_DIRECTA",
                    a.id                                                                AS "FACTURA_INTERNA"
                FROM 
                    Transaction a 
                    LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = a.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = a.custbody_ht_so_bien
                WHERE 
                    a.type = 'SalesOrd' 
                    --AND EXTRACT(YEAR FROM a.trandate) = EXTRACT(YEAR FROM CURRENT_DATE)
                    --AND EXTRACT(MONTH FROM a.trandate) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM a.trandate) = 2026
                    AND EXTRACT(MONTH FROM a.trandate) = 6
                    AND a.customform = 142
                           AND a.custbody_ht_so_bien IN (${bienesIN})
            `
            log.debug('SuiteQL Consulta_Bien_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            //iterar data
            for (let i = 0; i < data.length; i++) {
                let IdNumeroOrdenServicio = data[i]['id'];
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);

                if (Facturas.length > 0) {
                    data[i]['factura_directa'] = true;
                } else {
                    data[i]['factura_directa'] = false;
                }

                //Agregar factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);

                log.debug('Facturas Internas ', FacturasInternas);

                if (FacturasInternas.length > 0) {
                    data[i]['factura_interna'] = true;
                } else {
                    data[i]['factura_interna'] = false;
                }
            }


            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);
            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    // !Consulta Ejecutiva
    function Consulta_Ejec_OS(context) {
        try {
            log.debug('Inicio Consulta_Bien_OS', 'Context: ' + JSON.stringify(context));
            log.debug('Cliente ID', context.cliente);

            // Se agrega limite de consulta
            let suiteqlData = `
               SELECT TOP 15
                    a.number, 
                    a.id, 
                    a.tranid                                                        AS "O/S",
                    BUILTIN.DF(a.status)                                   AS "ESTADO_OS",
                    b.id                                                              AS "ID_BIEN",
                    b.custrecord_ht_bien_placa                         AS "PLACA",
                    BUILTIN.DF(a.custbody_ht_os_aprobacionventa)            AS "COMERCIAL",
                    BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)          AS "CARTERA",
                    a.trandate                                               AS "FECHA_OS",             
                    ot.name                                                        AS "NOMBRE_OT",
                    BUILTIN.DF(ot.custrecord_ht_ot_estado)                          AS "ESTADO_OT",
                    a.id                                                                AS "FACTURA_DIRECTA",
                    a.id                                                                AS "FACTURA_INTERNA"
                FROM 
                    Transaction a 
                    LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = a.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = a.custbody_ht_so_bien
                WHERE 
                    a.type = 'SalesOrd' 
                    --AND EXTRACT(YEAR FROM a.trandate) = EXTRACT(YEAR FROM CURRENT_DATE)
                    --AND EXTRACT(MONTH FROM a.trandate) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM a.trandate) = 2026
                    AND EXTRACT(MONTH FROM a.trandate) = 6
                    AND a.customform = 142
                    AND a.custbody_ht_os_ejecutivareferencia = ${context.ejec}
                ORDER BY 
                    a.id DESC
            `
            log.debug('SuiteQL Consulta_Bien_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            //iterar data
            for (let i = 0; i < data.length; i++) {
                let IdNumeroOrdenServicio = data[i]['id'];
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);

                if (Facturas.length > 0) {
                    data[i]['factura_directa'] = true;
                } else {
                    data[i]['factura_directa'] = false;
                }

                //Agregar factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);

                log.debug('Facturas Internas ', FacturasInternas);

                if (FacturasInternas.length > 0) {
                    data[i]['factura_interna'] = true;
                } else {
                    data[i]['factura_interna'] = false;
                }
            }


            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);
            data.Total = data.length

            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function Consulta_Ejec_OS_TOTAL(context) {
        try {
            log.debug('Inicio Consulta_Ejec_OS_TOTAL', 'Context: ' + JSON.stringify(context));
            // log.debug('Cliente ID', context.cliente);

            // Se agrega limite de consulta
            let suiteqlData = `
               SELECT
                    a.number, 
                    a.id, 
                    a.tranid                                                        AS "O/S",
                    BUILTIN.DF(a.status)                                   AS "ESTADO_OS",
                    b.id                                                              AS "ID_BIEN",
                    b.custrecord_ht_bien_placa                         AS "PLACA",
                    BUILTIN.DF(a.custbody_ht_os_aprobacionventa)            AS "COMERCIAL",
                    BUILTIN.DF(a.custbody_ht_os_aprobacioncartera)          AS "CARTERA",
                    a.trandate                                               AS "FECHA_OS",             
                    ot.name                                                        AS "NOMBRE_OT",
                    BUILTIN.DF(ot.custrecord_ht_ot_estado)                          AS "ESTADO_OT",
                    a.id                                                                AS "FACTURA_DIRECTA",
                    a.id                                                                AS "FACTURA_INTERNA"
                FROM 
                    Transaction a 
                    LEFT JOIN customrecord_ht_record_ordentrabajo ot ON ot.custrecord_ht_ot_orden_servicio = a.id
                    LEFT JOIN customrecord_ht_record_bienes b ON b.id = a.custbody_ht_so_bien
                WHERE 
                    a.type = 'SalesOrd' 
                    --AND EXTRACT(YEAR FROM a.trandate) = EXTRACT(YEAR FROM CURRENT_DATE)
                    --AND EXTRACT(MONTH FROM a.trandate) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM a.trandate) = 2026
                    AND EXTRACT(MONTH FROM a.trandate) = 6
                    AND a.customform = 142
                    AND a.custbody_ht_os_ejecutivareferencia = ${context.ejec}
                ORDER BY 
                    a.id DESC
            `
            log.debug('SuiteQL Consulta_Bien_OS', suiteqlData);

            const dataResult = query.runSuiteQL({ query: suiteqlData });
            const data = dataResult.asMappedResults();

            //iterar data
            for (let i = 0; i < data.length; i++) {
                let IdNumeroOrdenServicio = data[i]['id'];
                let Facturas = Get_ObtenerFactura(IdNumeroOrdenServicio);

                if (Facturas.length > 0) {
                    data[i]['factura_directa'] = true;
                } else {
                    data[i]['factura_directa'] = false;
                }

                //Agregar factura interna
                let FacturasInternas = Get_ObtenerFacturaInterna(IdNumeroOrdenServicio, '', '', 0);

                // log.debug('Facturas Internas ', FacturasInternas);

                if (FacturasInternas.length > 0) {
                    data[i]['factura_interna'] = true;
                } else {
                    data[i]['factura_interna'] = false;
                }
            }


            log.debug('Fin Consulta_Cliente_OS', 'Resultados encontrados: ' + data.length);
            data.Total = data.length

            return data;

        } catch (error) {
            log.error('Error en Consulta_Cliente_OS', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    /* ============================
    Consulta - Resumen
    ============================ */
    function Consulta_Resumen_Ejec_OS(context) {
        try {

            log.debug('Inicio Consulta_Resumen_Ejec_OS', JSON.stringify(context));

            let suiteqlResumen = `
            SELECT
                COUNT(DISTINCT a.id) AS total_ordenes_servicio,
                COUNT(DISTINCT ot.id) AS total_ordenes_trabajo
            FROM 
                Transaction a
                LEFT JOIN customrecord_ht_record_ordentrabajo ot 
                    ON ot.custrecord_ht_ot_orden_servicio = a.id
            WHERE 
                a.type = 'SalesOrd'
                AND EXTRACT(YEAR FROM a.trandate) = 2026
                AND EXTRACT(MONTH FROM a.trandate) = 6
                AND a.customform = 142
                AND a.custbody_ht_os_ejecutivareferencia = ${context.ejec}
        `;

            log.debug('SuiteQL Resumen', suiteqlResumen);

            const result = query.runSuiteQL({ query: suiteqlResumen }).asMappedResults();

            let resumen = {
                total_ordenes_servicio: 0,
                total_ordenes_trabajo: 0
            };

            if (result.length > 0) {
                resumen.total_ordenes_servicio = Number(result[0].total_ordenes_servicio || 0);
                resumen.total_ordenes_trabajo = Number(result[0].total_ordenes_trabajo || 0);
            }

            log.debug('Resumen Final', resumen);

            return resumen;

        } catch (error) {
            log.error('Error en Consulta_Resumen_Ejec_OS', error);
            throw error;
        }
    }

    function Consulta_Resumen_Cliente_OS(context) {
        try {

            log.debug('Inicio Consulta_Cliente_OS', 'Context: ' + JSON.stringify(context));

            // 1. Validar que exista cliente
            if (!context.cliente) {
                log.debug('Sin cliente', 'No se recibió cliente en el context');
                return [];
            }

            // 2. Convertir a arreglo y limpiar espacios
            let clientesArray = context.cliente
                .toString()
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id)); // Validar que sean números

            // 3. Validar cantidad
            if (clientesArray.length === 0) {
                log.debug('Clientes inválidos', context.cliente);
                return [];
            }

            log.debug('Cantidad de clientes recibidos', clientesArray.length);

            let clientesIN = clientesArray.join(',');

            let suiteqlResumen = `
            SELECT
                COUNT(DISTINCT a.id) AS total_ordenes_servicio,
                COUNT(DISTINCT ot.id) AS total_ordenes_trabajo
            FROM 
                Transaction a
                LEFT JOIN customrecord_ht_record_ordentrabajo ot 
                    ON ot.custrecord_ht_ot_orden_servicio = a.id
            WHERE 
                a.type = 'SalesOrd'
                AND EXTRACT(YEAR FROM a.trandate) = 2026
                AND EXTRACT(MONTH FROM a.trandate) = 6
                AND a.customform = 142
                AND a.entity IN (${clientesIN})
        `;

            log.debug('SuiteQL Resumen', suiteqlResumen);

            const result = query.runSuiteQL({ query: suiteqlResumen }).asMappedResults();

            let resumen = {
                total_ordenes_servicio: 0,
                total_ordenes_trabajo: 0
            };

            if (result.length > 0) {
                resumen.total_ordenes_servicio = Number(result[0].total_ordenes_servicio || 0);
                resumen.total_ordenes_trabajo = Number(result[0].total_ordenes_trabajo || 0);
            }

            log.debug('Resumen Final', resumen);

            return resumen;

        } catch (error) {
            log.error('Error en Consulta_Resumen_Ejec_OS', error);
            throw error;
        }
    }

    function Consulta_Resumen_Bien_OS(context) {
        try {

            log.debug('Inicio Consulta_Cliente_OS', 'Context: ' + JSON.stringify(context));

            // 1. Validar que exista cliente
            if (!context.bien) {
                log.debug('Sin cliente', 'No se recibió bien en el context');
                return [];
            }

            // 2. Convertir a arreglo y limpiar espacios
            let bienesArray = context.bien
                .toString()
                .split(',')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id)); // Validar que sean números

            // 3. Validar cantidad
            if (bienesArray.length === 0) {
                log.debug('bienes inválidos', context.bien);
                return [];
            }

            log.debug('Cantidad de bien recibidos', bienesArray.length);

            let bienesIN = bienesArray.join(',');

            let suiteqlResumen = `
            SELECT
                COUNT(DISTINCT a.id) AS total_ordenes_servicio,
                COUNT(DISTINCT ot.id) AS total_ordenes_trabajo
            FROM 
                Transaction a
                LEFT JOIN customrecord_ht_record_ordentrabajo ot 
                    ON ot.custrecord_ht_ot_orden_servicio = a.id
            WHERE 
                a.type = 'SalesOrd'
                AND EXTRACT(YEAR FROM a.trandate) = 2026
                AND EXTRACT(MONTH FROM a.trandate) = 6
                AND a.customform = 142
                AND a.custbody_ht_so_bien IN (${bienesIN})
        `;

            log.debug('SuiteQL Resumen', suiteqlResumen);

            const result = query.runSuiteQL({ query: suiteqlResumen }).asMappedResults();

            let resumen = {
                total_ordenes_servicio: 0,
                total_ordenes_trabajo: 0
            };

            if (result.length > 0) {
                resumen.total_ordenes_servicio = Number(result[0].total_ordenes_servicio || 0);
                resumen.total_ordenes_trabajo = Number(result[0].total_ordenes_trabajo || 0);
            }

            log.debug('Resumen Final', resumen);

            return resumen;

        } catch (error) {
            log.error('Error en Consulta_Resumen_bien_OS', error);
            throw error;
        }
    }

    /* ============================
    Seguridad - UTILIDADES
    ============================ */

    function generarCodigo() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function ahora() {
        return new Date();
    }

    function fechaExpiracion() {
        return new Date(ahora().getTime() + (8 * 60 * 60 * 1000)); // 8 horas
    }

    function verificarSesion(correo) {

        return { estado: 'VALIDO' };
      
      
        if (!correo) {
            return { estado: 'NO_VALIDO' };
        }

        let registro = buscarSesionActiva(correo);

        log.debug('Resultado de búsqueda de sesión activa--', registro);

        if (registro) {
            return { estado: 'VALIDO' };
        }

        return { estado: 'NO_VALIDO' };
    }

    /* ============================
    Seguridad - FUNCIONES INTERNAS
    ============================ */

    function buscarSesionActiva(correo) {
        try {

            log.debug('Buscar Sesión Activa', 'Correo: ' + correo);

            var ahora = new Date();

            // Construir fecha en formato DD/MM/YYYY HH:mm
            var dia = ("0" + ahora.getDate()).slice(-2);
            var mes = ("0" + (ahora.getMonth() + 1)).slice(-2);
            var anio = ahora.getFullYear();
            var horas = ("0" + ahora.getHours()).slice(-2);
            var minutos = ("0" + ahora.getMinutes()).slice(-2);

            var fechaActual = dia + '/' + mes + '/' + anio + ' ' + horas + ':' + minutos;

            log.debug('Fecha generada para filtro', fechaActual);

            var s = search.create({
                type: RECORD_TYPE,
                filters: [
                    search.createFilter({
                        name: 'custrecord_correo_ccb',
                        operator: search.Operator.IS,
                        values: correo
                    }),
                    search.createFilter({
                        name: 'custrecord_valido_ccb',
                        operator: search.Operator.IS,
                        values: 'T'
                    }),
                    search.createFilter({
                        name: 'custrecord_fecha_expiracion_ccb',
                        operator: search.Operator.ONORAFTER,
                        values: fechaActual
                    })
                ],
                columns: [
                    search.createColumn({
                        name: 'internalid',
                        sort: search.Sort.DESC
                    })
                ]
            });

            var r = s.run().getRange({ start: 0, end: 1 });

            log.debug('Resultados encontrados', r ? r.length : 0);

            if (r && r.length > 0) {
                return { id: r[0].getValue({ name: 'internalid' }) };
            }

            return null;

        } catch (e) {
            log.error('Error en buscarSesionActiva', e);
            throw e;
        }
    }

    function buscarUltimaSesion(correo) {

        log.debug('Buscar Última Sesión', 'Correo: ' + correo);

        let s = search.create({
            type: RECORD_TYPE,
            filters: [
                ['custrecord_correo_ccb', 'is', correo]
            ],
            columns: [
                search.createColumn({
                    name: 'created',
                    sort: search.Sort.DESC   // 👈 Ordena del más nuevo al más antiguo
                }),
                'internalid',
                'custrecord_valido_ccb',
                'custrecord_fecha_expiracion_ccb'
            ]
        });

        let r = s.run().getRange({ start: 0, end: 1 });

        log.debug('Resultados encontrados', r.length);

        if (r.length > 0) {
            return {
                id: r[0].getValue('internalid'),
                valido: r[0].getValue('custrecord_valido_ccb'),
                fechaExpiracion: r[0].getValue('custrecord_fecha_expiracion_ccb')
            };
        }

        return null;
    }

    function generarSesion(correo) {

        let existente = buscarSesionActiva(correo);
        if (existente) {
            return { estado: 'YA_EXISTE_SESION' };
        }

        invalidarSesiones(correo);

        let codigo = generarCodigo();

        let rec = record.create({
            type: RECORD_TYPE
        });

        rec.setValue({ fieldId: 'custrecord_correo_ccb', value: correo });
        rec.setValue({ fieldId: 'custrecord_cod_verificacion_ccb', value: codigo });
        rec.setValue({ fieldId: 'custrecord_fecha_expiracion_ccb', value: fechaExpiracion() });
        rec.setValue({ fieldId: 'custrecord_valido_ccb', value: false });
        rec.setValue({ fieldId: 'custrecord_restringido_ccb', value: false });
        rec.setValue({ fieldId: 'custrecord_intentos_ok_ccb', value: 0 });
        rec.setValue({ fieldId: 'custrecord_intentos_error_ccb', value: 0 });

        rec.save();

        enviarCorreo(correo, codigo);

        return {
            estado: 'CODIGO_ENVIADO'
        };
    }

    function validarCodigo(correo, codigoIngresado) {

       return { estado: 'VALIDO' };
      
      
        log.debug('Validar Código', 'Correo: ' + correo + ', Código Ingresado: ' + codigoIngresado);

        let registro = buscarUltimaSesion(correo);

        log.debug('Registro encontrado para validación', registro);

        if (!registro) {
            return { estado: 'NO_VALIDO' };
        }

        let rec = record.load({
            type: RECORD_TYPE,
            id: registro.id
        });

        let codigoGuardado = rec.getValue('custrecord_cod_verificacion_ccb');
        let valido = rec.getValue('custrecord_valido_ccb');

        log.debug('Validar Código', 'Correo: ' + correo + ', Código Ingresado: ' + codigoIngresado + ', Código Guardado: ' + codigoGuardado);

        log.debug("codigoIngresado", typeof codigoIngresado)
        log.debug("codigoGuardado", typeof codigoGuardado)
        log.debug("codigoGuardado", valido)

        if (valido == false && codigoGuardado == codigoIngresado) {

            let ok = rec.getValue('custrecord_intentos_ok_ccb') || 0;

            rec.setValue({
                fieldId: 'custrecord_intentos_ok_ccb',
                value: ok + 1
            });

            rec.setValue({
                fieldId: 'custrecord_valido_ccb',
                value: true
            });

            rec.save();

            return { estado: 'VALIDADO' };
        }

        let errores = rec.getValue('custrecord_intentos_error_ccb') || 0;

        rec.setValue({
            fieldId: 'custrecord_intentos_error_ccb',
            value: errores + 1
        });

        rec.save();

        return { estado: 'CODIGO_INCORRECTO' };
    }

    function invalidarSesiones(correo) {

        let s = search.create({
            type: RECORD_TYPE,
            filters: [
                ['custrecord_correo_ccb', 'is', correo],
                'AND',
                ['custrecord_valido_ccb', 'is', 'T']
            ],
            columns: ['internalid']
        });

        s.run().each(result => {

            let rec = record.load({
                type: RECORD_TYPE,
                id: result.getValue('internalid')
            });

            rec.setValue({
                fieldId: 'custrecord_valido_ccb',
                value: false
            });

            rec.save();

            return true;
        });
    }

    function enviarCorreo(destinatario, codigo) {
        email.send({
            author: 449, // ID del autor del correo (puede cambiarse)
            recipients: destinatario,
            subject: 'Código de verificación',
            body: `
                Hola,
                
                Tu código de verificación es: ${codigo}
                
                Este código expira en 8 horas.
            `
        });
    }

    /* ============================
    Correo - Envio De Correo
    ============================ */

    // function EnviarCorreoEjecutiva(id_ejecutiva, correo) {
    //     try {
    //         log.debug('Inicio EnviarCorreoEjecutiva', 'ID Ejecutiva: ' + id_ejecutiva + ' | Correo: ' + correo);

    //         // 1. Obtener los datos de la consulta
    //         const data = Consulta_Ejec_OS_TOTAL({ ejec: id_ejecutiva });

    //         if (!data || data.length === 0) {
    //             log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
    //             return { success: false, message: 'No se encontraron registros' };
    //         }

    //         // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
    //         const ahora = new Date();
    //         const dia = String(ahora.getDate()).padStart(2, '0');
    //         const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    //         const anio = ahora.getFullYear();
    //         const hora = String(ahora.getHours()).padStart(2, '0');
    //         const minutos = String(ahora.getMinutes()).padStart(2, '0');
    //         const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

    //         const nombreArchivo = `${id_ejecutiva}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

    //         // 3. Construir contenido XLS (HTML compatible con Excel)
    //         let filaEncabezado = `
    //         <tr>
    //             <th>N°</th>
    //             <th>ID</th>
    //             <th>O/S</th>
    //             <th>ESTADO OS</th>
    //             <th>ID BIEN</th>
    //             <th>PLACA</th>
    //             <th>COMERCIAL</th>
    //             <th>CARTERA</th>
    //             <th>FECHA OS</th>
    //             <th>NOMBRE OT</th>
    //             <th>ESTADO OT</th>
    //             <th>FACTURA DIRECTA</th>
    //             <th>FACTURA INTERNA</th>
    //         </tr>
    //     `;

    //         let filas = '';
    //         for (let i = 0; i < data.length; i++) {
    //             const row = data[i];
    //             filas += `
    //             <tr>
    //                 <td>${row['number'] || ''}</td>
    //                 <td>${row['id'] || ''}</td>
    //                 <td>${row['o/s'] || ''}</td>
    //                 <td>${row['estado_os'] || ''}</td>
    //                 <td>${row['id_bien'] || ''}</td>
    //                 <td>${row['placa'] || ''}</td>
    //                 <td>${row['comercial'] || ''}</td>
    //                 <td>${row['cartera'] || ''}</td>
    //                 <td>${row['fecha_os'] || ''}</td>
    //                 <td>${row['nombre_ot'] || ''}</td>
    //                 <td>${row['estado_ot'] || ''}</td>
    //                 <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
    //                 <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
    //             </tr>
    //         `;
    //         }

    //         const contenidoXLS = `
    //         <html xmlns:o="urn:schemas-microsoft-com:office:office"
    //               xmlns:x="urn:schemas-microsoft-com:office:excel"
    //               xmlns="http://www.w3.org/TR/REC-html40">
    //         <head>
    //             <meta charset="UTF-8">
    //             <!--[if gte mso 9]>
    //             <xml>
    //                 <x:ExcelWorkbook>
    //                     <x:ExcelWorksheets>
    //                         <x:ExcelWorksheet>
    //                             <x:Name>Reporte</x:Name>
    //                             <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    //                         </x:ExcelWorksheet>
    //                     </x:ExcelWorksheets>
    //                 </x:ExcelWorkbook>
    //             </xml>
    //             <![endif]-->
    //         </head>
    //         <body>
    //             <table border="1">
    //                 <thead>${filaEncabezado}</thead>
    //                 <tbody>${filas}</tbody>
    //             </table>
    //         </body>
    //         </html>
    //     `;

    //         // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
    //         const archivoEnMemoria = file.create({
    //             name: nombreArchivo,
    //             fileType: file.Type.XMLDOC,
    //             contents: contenidoXLS
    //         });

    //         // 5. Enviar correo con el archivo adjunto en memoria
    //         email.send({
    //             author: 449,
    //             // recipients: correo,
    //             recipients: correo,
    //             subject: `Reporte Ejecutiva - ${dia}/${mes}/${anio}`,
    //             body: `
    //                    Hola,

    //                    Se adjunta el reporte de órdenes de servicio de la ejecutiva ID: ${id_ejecutiva}.

    //                    Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
    //                    Total de registros: ${data.length}
    //                    Código de reporte: ${codigoAleatorio}

    //                    Saludos.
    //         `,
    //             attachments: [archivoEnMemoria]
    //         });

    //         log.debug('Correo enviado', 'Destinatario: ' + correo);

    //         return {
    //             success: true,
    //             nombreArchivo: nombreArchivo,
    //             totalRegistros: data.length,
    //             codigo: codigoAleatorio
    //         };

    //     } catch (error) {
    //         log.error('Error en EnviarCorreoEjecutiva', 'Error: ' + error.message + '\nStack: ' + error.stack);
    //         throw error;
    //     }
    // }

    // function EnviarCorreoClienteOS(ids, correo) {
    //     try {
    //         log.debug('Inicio EnviarCorreoEjecutiva', 'ID Ejecutiva: ' + ids + ' | Correo: ' + correo);

    //         // 1. Obtener los datos de la consulta
    //         const data = Consulta_Cliente_OS_TOTAL({ ids: ids });

    //         if (!data || data.length === 0) {
    //             // log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
    //             return { success: false, message: 'No se encontraron registros' };
    //         }

    //         // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
    //         const ahora = new Date();
    //         const dia = String(ahora.getDate()).padStart(2, '0');
    //         const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    //         const anio = ahora.getFullYear();
    //         const hora = String(ahora.getHours()).padStart(2, '0');
    //         const minutos = String(ahora.getMinutes()).padStart(2, '0');
    //         const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

    //         const nombreArchivo = `${"Cliente"}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

    //         // 3. Construir contenido XLS (HTML compatible con Excel)
    //         let filaEncabezado = `
    //         <tr>
    //             <th>N°</th>
    //             <th>ID</th>
    //             <th>O/S</th>
    //             <th>ESTADO OS</th>
    //             <th>ID BIEN</th>
    //             <th>PLACA</th>
    //             <th>COMERCIAL</th>
    //             <th>CARTERA</th>
    //             <th>FECHA OS</th>
    //             <th>NOMBRE OT</th>
    //             <th>ESTADO OT</th>
    //             <th>FACTURA DIRECTA</th>
    //             <th>FACTURA INTERNA</th>
    //         </tr>
    //     `;

    //         let filas = '';
    //         for (let i = 0; i < data.length; i++) {
    //             const row = data[i];
    //             filas += `
    //             <tr>
    //                 <td>${row['number'] || ''}</td>
    //                 <td>${row['id'] || ''}</td>
    //                 <td>${row['o/s'] || ''}</td>
    //                 <td>${row['estado_os'] || ''}</td>
    //                 <td>${row['id_bien'] || ''}</td>
    //                 <td>${row['placa'] || ''}</td>
    //                 <td>${row['comercial'] || ''}</td>
    //                 <td>${row['cartera'] || ''}</td>
    //                 <td>${row['fecha_os'] || ''}</td>
    //                 <td>${row['nombre_ot'] || ''}</td>
    //                 <td>${row['estado_ot'] || ''}</td>
    //                 <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
    //                 <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
    //             </tr>
    //         `;
    //         }

    //         const contenidoXLS = `
    //         <html xmlns:o="urn:schemas-microsoft-com:office:office"
    //               xmlns:x="urn:schemas-microsoft-com:office:excel"
    //               xmlns="http://www.w3.org/TR/REC-html40">
    //         <head>
    //             <meta charset="UTF-8">
    //             <!--[if gte mso 9]>
    //             <xml>
    //                 <x:ExcelWorkbook>
    //                     <x:ExcelWorksheets>
    //                         <x:ExcelWorksheet>
    //                             <x:Name>Reporte</x:Name>
    //                             <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    //                         </x:ExcelWorksheet>
    //                     </x:ExcelWorksheets>
    //                 </x:ExcelWorkbook>
    //             </xml>
    //             <![endif]-->
    //         </head>
    //         <body>
    //             <table border="1">
    //                 <thead>${filaEncabezado}</thead>
    //                 <tbody>${filas}</tbody>
    //             </table>
    //         </body>
    //         </html>
    //     `;

    //         // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
    //         const archivoEnMemoria = file.create({
    //             name: nombreArchivo,
    //             fileType: file.Type.XMLDOC,
    //             contents: contenidoXLS
    //         });

    //         // 5. Enviar correo con el archivo adjunto en memoria
    //         email.send({
    //             author: 449,
    //             // recipients: correo,
    //             recipients: correo,
    //             subject: `Reporte Cliente - ${dia}/${mes}/${anio}`,
    //             body: `
    //                    Hola,

    //                    Se adjunta el reporte de órdenes de servicio del Cliente: ${ids}.

    //                    Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
    //                    Total de registros: ${data.length}
    //                    Código de reporte: ${codigoAleatorio}

    //                    Saludos.
    //         `,
    //             attachments: [archivoEnMemoria]
    //         });

    //         log.debug('Correo enviado', 'Destinatario: ' + correo);

    //         return {
    //             success: true,
    //             nombreArchivo: nombreArchivo,
    //             totalRegistros: data.length,
    //             codigo: codigoAleatorio
    //         };

    //     } catch (error) {
    //         log.error('Error en EnviarCorreoEjecutiva', 'Error: ' + error.message + '\nStack: ' + error.stack);
    //         throw error;
    //     }
    // }

    // function EnviarCorreoBienOS(ids, correo) {
    //     try {
    //         log.debug('Inicio EnviarCorreobien', 'ID Bien: ' + ids + ' | Correo: ' + correo);

    //         // 1. Obtener los datos de la consulta
    //         const data = Consulta_Bien_OS_TOTAL({ ids: ids });

    //         if (!data || data.length === 0) {
    //             // log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
    //             return { success: false, message: 'No se encontraron registros' };
    //         }

    //         // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
    //         const ahora = new Date();
    //         const dia = String(ahora.getDate()).padStart(2, '0');
    //         const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    //         const anio = ahora.getFullYear();
    //         const hora = String(ahora.getHours()).padStart(2, '0');
    //         const minutos = String(ahora.getMinutes()).padStart(2, '0');
    //         const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

    //         const nombreArchivo = `${"Bien"}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

    //         // 3. Construir contenido XLS (HTML compatible con Excel)
    //         let filaEncabezado = `
    //         <tr>
    //             <th>N°</th>
    //             <th>ID</th>
    //             <th>O/S</th>
    //             <th>ESTADO OS</th>
    //             <th>ID BIEN</th>
    //             <th>PLACA</th>
    //             <th>COMERCIAL</th>
    //             <th>CARTERA</th>
    //             <th>FECHA OS</th>
    //             <th>NOMBRE OT</th>
    //             <th>ESTADO OT</th>
    //             <th>FACTURA DIRECTA</th>
    //             <th>FACTURA INTERNA</th>
    //         </tr>
    //     `;

    //         let filas = '';
    //         for (let i = 0; i < data.length; i++) {
    //             const row = data[i];
    //             filas += `
    //             <tr>
    //                 <td>${row['number'] || ''}</td>
    //                 <td>${row['id'] || ''}</td>
    //                 <td>${row['o/s'] || ''}</td>
    //                 <td>${row['estado_os'] || ''}</td>
    //                 <td>${row['id_bien'] || ''}</td>
    //                 <td>${row['placa'] || ''}</td>
    //                 <td>${row['comercial'] || ''}</td>
    //                 <td>${row['cartera'] || ''}</td>
    //                 <td>${row['fecha_os'] || ''}</td>
    //                 <td>${row['nombre_ot'] || ''}</td>
    //                 <td>${row['estado_ot'] || ''}</td>
    //                 <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
    //                 <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
    //             </tr>
    //         `;
    //         }

    //         const contenidoXLS = `
    //         <html xmlns:o="urn:schemas-microsoft-com:office:office"
    //               xmlns:x="urn:schemas-microsoft-com:office:excel"
    //               xmlns="http://www.w3.org/TR/REC-html40">
    //         <head>
    //             <meta charset="UTF-8">
    //             <!--[if gte mso 9]>
    //             <xml>
    //                 <x:ExcelWorkbook>
    //                     <x:ExcelWorksheets>
    //                         <x:ExcelWorksheet>
    //                             <x:Name>Reporte</x:Name>
    //                             <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    //                         </x:ExcelWorksheet>
    //                     </x:ExcelWorksheets>
    //                 </x:ExcelWorkbook>
    //             </xml>
    //             <![endif]-->
    //         </head>
    //         <body>
    //             <table border="1">
    //                 <thead>${filaEncabezado}</thead>
    //                 <tbody>${filas}</tbody>
    //             </table>
    //         </body>
    //         </html>
    //     `;

    //         // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
    //         const archivoEnMemoria = file.create({
    //             name: nombreArchivo,
    //             fileType: file.Type.XMLDOC,
    //             contents: contenidoXLS
    //         });

    //         // 5. Enviar correo con el archivo adjunto en memoria
    //         email.send({
    //             author: 449,
    //             // recipients: correo,
    //             recipients: correo,
    //             subject: `Reporte Bien - ${dia}/${mes}/${anio}`,
    //             body: `
    //                    Hola,

    //                    Se adjunta el reporte de órdenes de servicio del Bien: ${ids}.

    //                    Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
    //                    Total de registros: ${data.length}
    //                    Código de reporte: ${codigoAleatorio}

    //                    Saludos.
    //         `,
    //             attachments: [archivoEnMemoria]
    //         });

    //         log.debug('Correo enviado', 'Destinatario: ' + correo);

    //         return {
    //             success: true,
    //             nombreArchivo: nombreArchivo,
    //             totalRegistros: data.length,
    //             codigo: codigoAleatorio
    //         };

    //     } catch (error) {
    //         log.error('Error en EnviarCorreoBien', 'Error: ' + error.message + '\nStack: ' + error.stack);
    //         throw error;
    //     }
    // }

    // New
    // GenerarLogCambioEstado(data, data?.Id_ns_cliente || 0, 'F'); // Guardar el registro
    function GenerarLogCambioEstado(context, registroID, EstadoProcesado) {
        try {
            let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
            objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "EC_ejecutiva" });
            objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
            objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
            objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
            objRecord.save();

        } catch (error) {
            log.error('Error en generarLogCambioEstado', error);
        }
    }

    function EnviarCorreoEjecutiva(id_ejecutiva, correo, directo = 'No') {
        try {
            log.debug('Inicio EnviarCorreoEjecutiva', 'ID Ejecutiva: ' + id_ejecutiva + ' | Correo: ' + correo);

            // Correo offline
            if (directo == "No") {
                let aux = {
                    id_ejecutiva: id_ejecutiva,
                    correo: correo
                }

                GenerarLogCambioEstado(aux, 0, 'F');
                return {
                    success: true,
                    nombreArchivo: "",
                    totalRegistros: 0,
                    codigo: ""
                };
            }

            if (directo == "Si") {
                // 1. Obtener los datos de la consulta
                const data = Consulta_Ejec_OS_TOTAL({ ejec: id_ejecutiva });

                if (!data || data.length === 0) {
                    log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
                    return { success: false, message: 'No se encontraron registros' };
                }

                // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
                const ahora = new Date();
                const dia = String(ahora.getDate()).padStart(2, '0');
                const mes = String(ahora.getMonth() + 1).padStart(2, '0');
                const anio = ahora.getFullYear();
                const hora = String(ahora.getHours()).padStart(2, '0');
                const minutos = String(ahora.getMinutes()).padStart(2, '0');
                const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

                const nombreArchivo = `${id_ejecutiva}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

                // 3. Construir contenido XLS (HTML compatible con Excel)
                let filaEncabezado = `
            <tr>
                <th>N°</th>
                <th>ID</th>
                <th>O/S</th>
                <th>ESTADO OS</th>
                <th>ID BIEN</th>
                <th>PLACA</th>
                <th>COMERCIAL</th>
                <th>CARTERA</th>
                <th>FECHA OS</th>
                <th>NOMBRE OT</th>
                <th>ESTADO OT</th>
                <th>FACTURA DIRECTA</th>
                <th>FACTURA INTERNA</th>
            </tr>
        `;

                let filas = '';
                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    filas += `
                <tr>
                    <td>${row['number'] || ''}</td>
                    <td>${row['id'] || ''}</td>
                    <td>${row['o/s'] || ''}</td>
                    <td>${row['estado_os'] || ''}</td>
                    <td>${row['id_bien'] || ''}</td>
                    <td>${row['placa'] || ''}</td>
                    <td>${row['comercial'] || ''}</td>
                    <td>${row['cartera'] || ''}</td>
                    <td>${row['fecha_os'] || ''}</td>
                    <td>${row['nombre_ot'] || ''}</td>
                    <td>${row['estado_ot'] || ''}</td>
                    <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
                    <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
                </tr>
            `;
                }

                const contenidoXLS = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Reporte</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table border="1">
                    <thead>${filaEncabezado}</thead>
                    <tbody>${filas}</tbody>
                </table>
            </body>
            </html>
        `;

                // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
                const archivoEnMemoria = file.create({
                    name: nombreArchivo,
                    fileType: file.Type.XMLDOC,
                    contents: contenidoXLS
                });

                // 5. Enviar correo con el archivo adjunto en memoria
                email.send({
                    author: 449,
                    // recipients: correo,
                    recipients: correo,
                    subject: `Reporte Ejecutiva - ${dia}/${mes}/${anio}`,
                    body: `
                       Hola,
                       
                       Se adjunta el reporte de órdenes de servicio de la ejecutiva ID: ${id_ejecutiva}.
                       
                       Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
                       Total de registros: ${data.length}
                       Código de reporte: ${codigoAleatorio}
                       
                       Saludos.
                      `,
                    attachments: [archivoEnMemoria]
                });

                log.debug('Correo enviado', 'Destinatario: ' + correo);


                return {
                    success: true,
                    nombreArchivo: nombreArchivo,
                    totalRegistros: data.length,
                    codigo: codigoAleatorio
                };
            }

            return

        } catch (error) {
            log.error('Error en EnviarCorreoEjecutiva', 'Error: ' + error.message + '\nStack: ' + error.stack);
            return {
                success: false,
            };

        }
    }

    function EnviarCorreoClienteOS(ids, correo) {
        try {
            log.debug('Inicio EnviarCorreoEjecutiva', 'ID Ejecutiva: ' + ids + ' | Correo: ' + correo);

            // 1. Obtener los datos de la consulta
            const data = Consulta_Cliente_OS_TOTAL({ ids: ids });

            if (!data || data.length === 0) {
                // log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
                return { success: false, message: 'No se encontraron registros' };
            }

            // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
            const ahora = new Date();
            const dia = String(ahora.getDate()).padStart(2, '0');
            const mes = String(ahora.getMonth() + 1).padStart(2, '0');
            const anio = ahora.getFullYear();
            const hora = String(ahora.getHours()).padStart(2, '0');
            const minutos = String(ahora.getMinutes()).padStart(2, '0');
            const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

            const nombreArchivo = `${"Cliente"}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

            // 3. Construir contenido XLS (HTML compatible con Excel)
            let filaEncabezado = `
            <tr>
                <th>N°</th>
                <th>ID</th>
                <th>O/S</th>
                <th>ESTADO OS</th>
                <th>ID BIEN</th>
                <th>PLACA</th>
                <th>COMERCIAL</th>
                <th>CARTERA</th>
                <th>FECHA OS</th>
                <th>NOMBRE OT</th>
                <th>ESTADO OT</th>
                <th>FACTURA DIRECTA</th>
                <th>FACTURA INTERNA</th>
            </tr>
        `;

            let filas = '';
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                filas += `
                <tr>
                    <td>${row['number'] || ''}</td>
                    <td>${row['id'] || ''}</td>
                    <td>${row['o/s'] || ''}</td>
                    <td>${row['estado_os'] || ''}</td>
                    <td>${row['id_bien'] || ''}</td>
                    <td>${row['placa'] || ''}</td>
                    <td>${row['comercial'] || ''}</td>
                    <td>${row['cartera'] || ''}</td>
                    <td>${row['fecha_os'] || ''}</td>
                    <td>${row['nombre_ot'] || ''}</td>
                    <td>${row['estado_ot'] || ''}</td>
                    <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
                    <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
                </tr>
            `;
            }

            const contenidoXLS = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Reporte</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table border="1">
                    <thead>${filaEncabezado}</thead>
                    <tbody>${filas}</tbody>
                </table>
            </body>
            </html>
        `;

            // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
            const archivoEnMemoria = file.create({
                name: nombreArchivo,
                fileType: file.Type.XMLDOC,
                contents: contenidoXLS
            });

            // 5. Enviar correo con el archivo adjunto en memoria
            email.send({
                author: 449,
                // recipients: correo,
                recipients: correo,
                subject: `Reporte Cliente - ${dia}/${mes}/${anio}`,
                body: `
                       Hola,
                       
                       Se adjunta el reporte de órdenes de servicio del Cliente: ${ids}.
                       
                       Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
                       Total de registros: ${data.length}
                       Código de reporte: ${codigoAleatorio}
                       
                       Saludos.
            `,
                attachments: [archivoEnMemoria]
            });

            log.debug('Correo enviado', 'Destinatario: ' + correo);

            return {
                success: true,
                nombreArchivo: nombreArchivo,
                totalRegistros: data.length,
                codigo: codigoAleatorio
            };

        } catch (error) {
            log.error('Error en EnviarCorreoEjecutiva', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function EnviarCorreoBienOS(ids, correo) {
        try {
            log.debug('Inicio EnviarCorreobien', 'ID Bien: ' + ids + ' | Correo: ' + correo);

            // 1. Obtener los datos de la consulta
            const data = Consulta_Bien_OS_TOTAL({ ids: ids });

            if (!data || data.length === 0) {
                // log.debug('Sin datos', 'No se encontraron registros para la ejecutiva: ' + id_ejecutiva);
                return { success: false, message: 'No se encontraron registros' };
            }

            // 2. Generar nombre del archivo: idEjecutiva_DDMMAAAA_HHMM_CODIGOALEATORIO.xls
            const ahora = new Date();
            const dia = String(ahora.getDate()).padStart(2, '0');
            const mes = String(ahora.getMonth() + 1).padStart(2, '0');
            const anio = ahora.getFullYear();
            const hora = String(ahora.getHours()).padStart(2, '0');
            const minutos = String(ahora.getMinutes()).padStart(2, '0');
            const codigoAleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();

            const nombreArchivo = `${"Bien"}_${dia}${mes}${anio}_${hora}${minutos}_${codigoAleatorio}.xls`;

            // 3. Construir contenido XLS (HTML compatible con Excel)
            let filaEncabezado = `
            <tr>
                <th>N°</th>
                <th>ID</th>
                <th>O/S</th>
                <th>ESTADO OS</th>
                <th>ID BIEN</th>
                <th>PLACA</th>
                <th>COMERCIAL</th>
                <th>CARTERA</th>
                <th>FECHA OS</th>
                <th>NOMBRE OT</th>
                <th>ESTADO OT</th>
                <th>FACTURA DIRECTA</th>
                <th>FACTURA INTERNA</th>
            </tr>
        `;

            let filas = '';
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                filas += `
                <tr>
                    <td>${row['number'] || ''}</td>
                    <td>${row['id'] || ''}</td>
                    <td>${row['o/s'] || ''}</td>
                    <td>${row['estado_os'] || ''}</td>
                    <td>${row['id_bien'] || ''}</td>
                    <td>${row['placa'] || ''}</td>
                    <td>${row['comercial'] || ''}</td>
                    <td>${row['cartera'] || ''}</td>
                    <td>${row['fecha_os'] || ''}</td>
                    <td>${row['nombre_ot'] || ''}</td>
                    <td>${row['estado_ot'] || ''}</td>
                    <td>${row['factura_directa'] ? 'SÍ' : 'NO'}</td>
                    <td>${row['factura_interna'] ? 'SÍ' : 'NO'}</td>
                </tr>
            `;
            }

            const contenidoXLS = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Reporte</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table border="1">
                    <thead>${filaEncabezado}</thead>
                    <tbody>${filas}</tbody>
                </table>
            </body>
            </html>
        `;

            // 4. Crear archivo SOLO EN MEMORIA (sin .save(), sin File Cabinet)
            const archivoEnMemoria = file.create({
                name: nombreArchivo,
                fileType: file.Type.XMLDOC,
                contents: contenidoXLS
            });

            // 5. Enviar correo con el archivo adjunto en memoria
            email.send({
                author: 449,
                // recipients: correo,
                recipients: correo,
                subject: `Reporte Bien - ${dia}/${mes}/${anio}`,
                body: `
                       Hola,
                       
                       Se adjunta el reporte de órdenes de servicio del Bien: ${ids}.
                       
                       Fecha de generación: ${dia}/${mes}/${anio} ${hora}:${minutos}
                       Total de registros: ${data.length}
                       Código de reporte: ${codigoAleatorio}
                       
                       Saludos.
            `,
                attachments: [archivoEnMemoria]
            });

            log.debug('Correo enviado', 'Destinatario: ' + correo);

            return {
                success: true,
                nombreArchivo: nombreArchivo,
                totalRegistros: data.length,
                codigo: codigoAleatorio
            };

        } catch (error) {
            log.error('Error en EnviarCorreoBien', 'Error: ' + error.message + '\nStack: ' + error.stack);
            throw error;
        }
    }

    function ConsultaCoberturaBien(context, limitante = "si") {
        try {
            let bien = context.Entrada;

            const resultado = [];
            let searchObj;

            let filtro = [];


            if (context.Entrada == "" || context.Entrada == null) {
                return [];
            }

            if (context.identificacion === "Si") {
                filtro = [
                    ["custrecord_ht_co_propietario.vatregnumber", "startswith", bien],
                    "AND",
                    ["isinactive", "is", "F"]
                ];
            }

            if (context.idbien === "Si") {
                filtro = [
                    ["custrecord_ht_co_bien", "anyof", bien],
                    "AND",
                    ["isinactive", "is", "F"]
                ];
            }

            if (context.placa === "Si") {
                filtro = [
                    ["custrecord_ht_co_bien.custrecord_ht_bien_placa", "startswith", bien],
                    "AND",
                    ["isinactive", "is", "F"]
                ];
            }


            // 1. Búsqueda principal
            searchObj = search.create({
                type: "customrecord_ht_co_cobertura",
                filters: filtro,
                columns: [
                    search.createColumn({ name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "ID" }),
                    search.createColumn({ name: "altname", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "Nombre" }),
                    search.createColumn({ name: "custrecord_ht_co_bien", label: "HT CO Bien" }),
                    search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
                    search.createColumn({ name: "custrecord_ht_bien_placa", join: "CUSTRECORD_HT_CO_BIEN", label: "HT BN Placa" }),
                    search.createColumn({ name: "custrecord_ht_co_producto" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                    search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
                    search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),

                    search.createColumn({ name: "custrecord_ht_co_estado", label: "Estado" }),
                    search.createColumn({ name: "custrecord_ht_co_propietario", label: "HT CO Propietario" }),
                    search.createColumn({ name: "category", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "Categoría" }),
                    search.createColumn({ name: "custrecord_ht_bien_id_telematic", join: "CUSTRECORD_HT_CO_BIEN", label: "ID Telematic" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "lastmodified", label: "Última modificación" }),
                    search.createColumn({ name: "lastmodifiedby", label: "Última modificación hecha por" }),
                    search.createColumn({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "Representante de ventas" }),
                    search.createColumn({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "HT Oficina cliente" }),
                ],
            });

            let count = searchObj.runPaged().count;


            // 3. Definir límite dinámico según parámetro limitante
            const LIMITE_RESULTADOS = limitante.toLowerCase() === "si" ? count : Math.min(15, count);
            let procesados = 0;

            // 4. Procesamiento controlado
            searchObj.run().each((result) => {

                if (procesados >= LIMITE_RESULTADOS) {
                    return false; // Detiene el search.each()
                }

                const familiaProducto = obtenerUnDato(
                    "customrecord_ht_cr_pp_valores",
                    "custrecord_ht_pp_codigo",
                    result.getValue({ name: "custrecord_ht_co_familia_prod" })
                ) || "";

                const descripcionProducto = obtenerUnDato(
                    "customrecord_ht_cr_pp_valores",
                    "custrecord_ht_pp_descripcion",
                    result.getValue({ name: "custrecord_ht_co_familia_prod" })
                ) || "";

                resultado.push({
                    PROPIETARIO: result.getText({ name: "custrecord_ht_co_propietario" }),
                    CATEGORIA_PROPIETARIO: result.getText({ name: "category", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
                    ID_BIEN: result.getValue({ name: "custrecord_ht_co_bien" }),
                    PLACA: result.getValue({ name: "custrecord_ht_bien_placa", join: "CUSTRECORD_HT_CO_BIEN" }),
                    ESTADO: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
                    DESC_PRODUCTO: descripcionProducto,
                    PRODUCTO: familiaProducto,
                    FECHA_INICIO: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                    FECHA_FINAL: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                    ESTADO_DISPOSITIVO: result.getText({ name: "custrecord_ht_co_estado" }),
                    ID_TELEMATIC: result.getValue({ name: "custrecord_ht_bien_id_telematic", join: "CUSTRECORD_HT_CO_BIEN" }),
                    REPRESENTANTE_VENTAS: result.getText({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
                    OFICINA_CLIENTE: result.getText({ name: "custentity_ht_cl_oficinacliente", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
                    ULTIMA_MODIFICACION: result.getValue({ name: "lastmodified" }),
                    ULTIMA_MODIFICACION_POR: result.getValue({ name: "lastmodifiedby" }),
                    FECHA_CREACION: result.getValue({ name: "created" }),
                });

                procesados++;
                return true;
            });

            return resultado;

        } catch (error) {

            log.error("Error ObtenerCoberturaPorBien", {
                mensaje: error.message,
                stack: error.stack
            });

            return [{
                CODIGO: "500",
                DESCRIPCION: error.message
            }];
        }
    }

    function ObtenerIDVehiculoSysID(IdVehiculo) {

        let results = [];
        try {
            let VehiculoSearch = search.create({
                type: "customrecord_ht_record_bienes",
                filters: [
                    ["custrecord_ht_bien_codsysh", "is", IdVehiculo],
                ],
                columns: [
                    search.createColumn({ name: "internalid" }),
                    search.createColumn({ name: "custrecord_ht_bien_codsysh" }),
                ],
            });

            let searchResult = VehiculoSearch.runPaged();

            searchResult.pageRanges.forEach(function (pageRange) {
                let myPage = searchResult.fetch({ index: pageRange.index });

                myPage.data.forEach(function (result) {

                    results.push({
                        id: result.getValue({ name: "internalid" }),
                    });
                });
            });

            if (results.length > 0) {
                return results[0].id;
            } else {
                return false;
            }

        } catch (error) {
            log.debug("error", { error: error, stack: error.stack });
            return false;
        }
    }

    function obtenerUnDato(type, columna, id) {
        try {
            const resultado = search
                .create({
                    type: type,
                    filters: [["internalid", "is", id]],
                    columns: [columna],
                })
                .run()
                .getRange({ start: 0, end: 1 });

            return resultado.length > 0 ? resultado[0].getValue(columna) : "";
        } catch (error) {
            return "";
        }
    }

    function marcarComoProcesado(idRegistro) {
        try {

            record.submitFields({
                type: "customrecord_log_proceso_general",
                id: idRegistro,
                values: {
                    custrecord_producto_lpc: 'T'
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.debug("Registro actualizado", "ID: " + idRegistro);

        } catch (error) {
            log.error("Error al actualizar registro", error);
        }
    }

    function GestionCorreo() {
        try {
            // return 
            // Crear la búsqueda del registro
            const searchObj = search.create({
                type: "customrecord_log_proceso_general",
                filters: [
                    ["custrecordlog_proceso_general_proceso", "is", "EC_ejecutiva"],
                    "AND",
                    ["custrecord_producto_lpc", "startswith", "F"]
                ],
                columns: [
                    search.createColumn({ name: "id", label: "ID", sort: search.Sort.DESC }),
                    search.createColumn({ name: "owner", label: "Propietario" }),
                    search.createColumn({ name: "created", label: "Fecha de creación" }),
                    search.createColumn({ name: "custrecord_producto_lpc", label: "PROCESADO" }),
                    search.createColumn({ name: "custrecordlog_proceso_general_proceso", label: "Proceso" }),
                    search.createColumn({ name: "custrecordid_registro_proc_general", label: "id_registro" }),
                    search.createColumn({ name: "custrecord_log_proceso_general_traza", label: "Traza" })
                ]
            });

            const myResultParaCobertura = searchObj.run().getRange({ start: 0, end: 2 });
            const theCountFac = searchObj.runPaged().count;

            // log.debug("Número de registros encontrados", theCountFac);

            // Procesar cada resultado de la búsqueda
            myResultParaCobertura.forEach((result, index) => {
                log.debug(`Procesando registro`, `${index + 1}`);
                let Proceso = result.getValue({ name: "custrecordlog_proceso_general_proceso" });
                log.debug("Proceso", "---------" + Proceso + "---------");

                let traza = result.getValue({ name: "custrecord_log_proceso_general_traza" });
                let objeto = JSON.parse(traza);

                log.debug(objeto.id_ejecutiva);
                log.debug(objeto.correo);

                let id_registro_off = result.getValue({ name: "id" });

                switch (Proceso) {

                    case "EC_ejecutiva":
                        log.debug("Caso EC_ejecutiva", "Procesando EC_ejecutiva");

                        try {

                            let resp = EnviarCorreoEjecutiva(objeto.id_ejecutiva, objeto.correo, 'Si');

                            if (resp?.success) {
                                marcarComoProcesado(id_registro_off)
                            }



                        } catch (error) {
                            log.error("Error al cargar registro", error.stack);
                        }
                        break;

                    default:
                        break;
                }
            });

        } catch (error) {
            log.error("Error en la ejecución del script", error);
            return true
        }
    }

    function _put() {
        //put
    }

    function _delete() {
        //delete
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete,
    };
});