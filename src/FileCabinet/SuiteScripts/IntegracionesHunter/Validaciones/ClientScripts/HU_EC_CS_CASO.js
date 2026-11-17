/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/runtime', 'N/query', 'N/log', 'N/ui/dialog','SuiteScripts/IntegracionesHunter/Validaciones/Librerias/HU_EC_LIB_CONTROL_FORMULARIO.js', 'N/email', 'N/format' ], function(runtime, query, log, dialog,_controlFormulario, email, format) {

    let currentMode;
    let registro_inicial;

    function pageInit(context, ) {
        try {
            let url = new URL(window.location.href);
            let parametros = new URLSearchParams(url.search);

            let vehiculo = parametros.get("record.custevent_ht_caso_vehiculo");
            let empresa = parametros.get("record.company");
            let accion = parametros.get("accion");
            let usuario = runtime.getCurrentUser();
            currentMode = context.mode;

            if(usuario.subsidiary == 2){
                // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CARGAR TIPO DE FORMULARIO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                // _formularioController(context, currentRecord, userRol, userId, vehiculo, empresa);
                _formularioController(context, usuario, vehiculo, empresa, accion);
                let bienIngresado = context.currentRecord.getValue({fieldId: 'custevent_ht_caso_vehiculo'});
                if ( bienIngresado){
                    _casoExistente(context);
                }
                // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CARGAR TIPO DE FORMULARIO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                registro_inicial = {
                    etapa: context.currentRecord.getValue({fieldId: 'custevent_ht_caso_etapacaso'}),
                    estado: context.currentRecord.getValue({fieldId: 'status'}),
                }
            }
        } catch (error) {
            log.error("ERROR - pageInit", error.stack);
        }
    }

    function _formularioController(context, usuario, vehiculo, empresa, accion) {
        try {
            let currentRecord = context.currentRecord;
            let mensaje = currentRecord.getField({fieldId:"incomingmessage"});
            // 1811	EC - Administrador
            // 1849	EC OPERADOR CONTROL
            if( [1811, 1849].includes(usuario.role)){
                let customform = currentRecord.getValue({fieldId: 'customform' });
                // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* MODE: CREATE *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                if (currentRecord.type === 'supportcase' && customform != 82 && context.mode == 'create' ) {
                    currentRecord.setValue({ fieldId: 'customform', value: 82 }); // ID del formulario deseado
                }else {
                    let usuarioActual = _executeQuery('SELECT department AS departamento FROM employee WHERE id = ?', [usuario.id]);
                    if(usuarioActual && context.mode === 'create'){
                        currentRecord.setValue({ fieldId: 'custevent_ht_departamento', value: `${usuarioActual[0].departamento}` });
                        currentRecord.setValue({ fieldId: 'status', value: `2` });
                        currentRecord.setValue({ fieldId: 'subsidiary', value: `2` });
                        currentRecord.setValue({ fieldId: 'profile', value: `2` });
                        currentRecord.setValue({ fieldId: 'email', value: `` });

                        mensaje.isDisplay = false;
                        // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* CREAR CASO ROBO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                        if(accion == '1'){
                            let bienIngresado = currentRecord.getValue({fieldId: 'custevent_ht_caso_vehiculo'});
                            let placaBien = _executeQuery('SELECT custrecord_ht_bien_placa AS placa FROM customrecord_ht_record_bienes WHERE id = ?', [bienIngresado]);
                            currentRecord.setValue({ fieldId: 'title', value: `INF - OP - ID: ${vehiculo} - ${placaBien[0].placa}`}); // DENUNCIA
                            currentRecord.setValue({ fieldId: 'custevent_ht_caso_etapacaso', value: `1` }); // DENUNCIA
                            currentRecord.setValue({ fieldId: 'issue', value: `1` }); // ROBO DE VEHÍCULO
                            currentRecord.setValue({ fieldId: 'custevent_ht_caso_tipogestion', value: `2` }); // Tipo de gestión
                        }
                    }
                }
                // *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* MODE: EDIT *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                if(context.mode == 'edit'){
                    let vehiculo = currentRecord.getValue({fieldId: 'custevent_ht_caso_vehiculo'});
                    currentRecord.setValue({ fieldId: 'email', value: `` });
                    // mensaje.isDisplay = false;
                    // currentRecord.setValue({ fieldId: 'messagenew', value: true });
                    // currentRecord.setValue({ fieldId: 'incomingmessage', value: '' });
                }
                currentRecord.setValue({ fieldId: 'internalonly', value: true });
                currentRecord.setValue({ fieldId: 'emailform', value: false });
                _controlFormulario.deshabilitarCampos(context, ['customform', 'custevent_ht_departamento', 'profile', 'phone', 'emailform', 'internalonly']);

            }
        } catch (error) {
            log.error("ERROR _formularioController", error);
        }
    }

    function fieldChanged(context) {
        try {
            let usuario = runtime.getCurrentUser();
            let fieldId = context.fieldId;
            if(usuario.subsidiary == 2){
                if(fieldId === "custevent_ht_caso_vehiculo"){
                    _casoExistente(context);
                }

                if(fieldId === 'custevent_ht_caso_etapacaso'){
                    _formularioCambios(context)
                }

                if( fieldId === "outgoingmessage"){
                    let currentRecord = context.currentRecord;
                    let texto = currentRecord.getValue({ fieldId: 'outgoingmessage'});
                    let campo = _limpiarHTML(texto);
                    currentRecord.setValue({fieldId: 'outgoingmessage', value: campo, ignoreFieldChange: true });
                }

                if( fieldId === "custpage_problema_caso"){
                    let currentRecord = context.currentRecord;
                    let custpage_problema_caso = currentRecord.getValue({ fieldId: 'custpage_problema_caso'});
                    currentRecord.setValue({ fieldId: 'issue', value: `${custpage_problema_caso}` });
                }
            }
        } catch (error) {
            log.error("ERROR fieldChanged", error.stack);
        }
    }

    function _formularioCambios(context) {
        let currentRecord = context.currentRecord;
        let etapa_caso = currentRecord.getValue({ fieldId: 'custevent_ht_caso_etapacaso'});
        if(["2", "4"].includes(etapa_caso)){
            currentRecord.setValue({ fieldId: 'status', value: '5'})
        }
    }

    function _limpiarHTML(html) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, "text/html");
        let texto = doc.body.textContent || '';
        return texto.trim().replace(/\s+/g, ' ');
    }

    function _casoExistente(context) {
        try {
            let currentRecord = context.currentRecord;

            let customform = currentRecord.getValue({fieldId: 'customform' });
            if( currentRecord.type === 'supportcase' && customform == 82 && (context.mode == 'create' || currentMode == 'create') ) {
                let bienIngresado = currentRecord.getValue({fieldId: 'custevent_ht_caso_vehiculo'});
                let existeRegistro = _executeQuery('SELECT id FROM supportcase WHERE custevent_ht_caso_vehiculo = ? AND status <> 5', [bienIngresado])
                if(existeRegistro){
                    let caso = existeRegistro[0].id
                    let envType = runtime.envType;
                    let entorno;
                    if (envType === runtime.EnvType.SANDBOX) {
                        entorno = 'https://7451241-sb1.app.netsuite.com'
                    } else if (envType === runtime.EnvType.PRODUCTION) {
                        entorno = 'https://7451241.app.netsuite.com'
                    }
                    let url = `${entorno}/app/crm/support/supportcase.nl?id=${caso}`;
                    let options = {
                        title: "Información",
                        message: "Ya existe un caso relacionado a este bien",
                        buttons: [
                            { label: "Ver Caso", value: "yes" },
                        ]
                    };
                    dialog.create(options).then(function(result) {
                        if (result === "yes") {
                            window.onbeforeunload = null;
                            window.open(url, '_self');
                        } else {
                            console.log("El usuario canceló.");
                        }
                    });
                    currentRecord.setValue({ fieldId: 'custevent_ht_caso_vehiculo', value: '' });
                }
            }
        } catch (error) {
            log.error("ERROR _casoExistente", error.stack);
        }
    }

    function _executeQuery(sqlQuery, params) {
        let resultSet = query.runSuiteQL({ query: sqlQuery, params: params });
        let results = resultSet.asMappedResults();

        if (results.length > 0) {
            return results.map(obj => {
                return Object.fromEntries(
                    Object.entries(obj).map(([key, value]) => [
                        key,
                        typeof value === 'string' ? value.replace(/\n/g, " ") : value === null ? "" : value
                    ])
                );
            });
        } else {
            return false;
        }
    }

    function enviarNotificacionCorreo(subject, body, salesrepEmail, correo_jefe) {
        try {

            if( !salesrepEmail || salesrepEmail == 'sincorreo@carsegsa.com' ){
                log.debug("enviarNotificacionCorreo", `No se envia a ${salesrepEmail} - ${typeof salesrepEmail}`);
                return;
            }

            email.send({
                author: 449,
                recipients: [salesrepEmail],
                cc: [correo_jefe],
                bcc: ['mramos@carsegsa.com', 'daristega@carsegsa.com'],//, 'vreyes@carsegsa.com'],
                subject,
                body,
            });
            log.debug("Correo enviado",
                {
                    author: 449, // ns_user_integracion@carsegsa.com
                    recipients: salesrepEmail,
                    bcc: ['mramos@carsegsa.com', 'daristega@carsegsa.com'],
                    subject,
                }
            );

            return;
        } catch (error) {
            log.error("Error - enviarNotificacionCorreo", error);
        }
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        enviarNotificacionCorreo: enviarNotificacionCorreo
    };
});