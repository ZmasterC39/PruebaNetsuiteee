/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author Mauro F Ramos
 * @date Created at: 19/02/2025 - Last modified: 19/02/2025
 * @description
 *
 * @version 1.0
 * @notes
 *  - Crea dos botones para los roles de 1811 EC - ADMINISTRADOR, para crear caso
 *
 */
define(['N/runtime', 'N/log', 'N/query'], (runtime, log, query) => {

    function beforeLoad(context) {
        try {
            let {subsidiary, role, id} = runtime.getCurrentUser();
            let newRecord = context.newRecord;
            let bienId = newRecord.getValue({ fieldId: 'name' });
            let customform = newRecord.getValue({ fieldId: 'customform' });
            let bienPropietario = newRecord.getValue({ fieldId: 'custrecord_ht_bien_propietario' });

            // *-*-*-*-*-*-*-*-*-*-*-*-**-*-*-*-*-*-*-* CREAR CASOS *-*-*-*-*-*-*-*-*-*-*-*-**-*-*-*-*-*-*-*
            // 1811 EC - ADMINISTRADOR
            // 1849 EC OPERADOR CONTROL
            if(subsidiary == 2 && context.type === context.UserEventType.VIEW && [1811, 1849].includes(role)) {
                let form = context.form;
                form.addButton({
                  id: "custpage_crear_caso",
                  label: "Crear Caso",
                  functionName: `crearCaso(0, ${bienId}, ${bienPropietario})`,
                });

                form.addButton({
                  id: "custpage_crear_caso_robo",
                  label: "CREAR GESTION DE RECUPERACION",
                  functionName: `crearCaso(1, '${bienId}', '${bienPropietario}')`,
                });

                form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_BIENES.js';
            }

            if( subsidiary == 2 && context.type === context.UserEventType.CREATE && customform == '112') {
                let form = context.form;
                form.addButton({
                  id: "custpage_buscar_bien",
                  label: "Buscar",
                  functionName: `buscarBien()`,
                });
                form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_BIENES.js';
            }
            // *-*-*-*-*-*-*-*-*-*-*-*-**-*-*-*-*-*-*-* CREAR CASOS *-*-*-*-*-*-*-*-*-*-*-*-**-*-*-*-*-*-*-*

            if( subsidiary == 2 && context.type === context.UserEventType.VIEW && id == 49529){
                //_estado_bien(context,bienId)
            }

        } catch (error) {
            log.error("ERROR beforeLoad", error);
        }
    }

    function _estado_bien(context,bienId){
        try {
            let form = context.form;
            let sqlquery = `SELECT
                custevent_ht_caso_vehiculo AS vehiculo,
                timeelapsed AS tiempo_transcurrido,
                tg.altname AS tipo_gestion,
                eg.name AS etapa_gestion,
                sc.name AS estado,
                scs.name AS problema_caso,
                startdate
            FROM supportcase caso
            JOIN customrecord_ht_record_tipogestion tg ON tg.id = caso.custevent_ht_caso_tipogestion
            JOIN supportcasestatus sc ON sc.id = caso.status
            JOIN customrecord_ht_eg_etapagestion eg ON eg.id = caso.custevent_ht_caso_etapacaso
            JOIN supportcaseissue scs ON scs.id = caso.issue
            WHERE
                custevent_ht_caso_vehiculo = ?
                AND caso.subsidiary = 2
                AND caso.custevent_ht_caso_tipogestion = 2 -- 2	002 GESTIÓN RECUPERACIÓN
                --AND status != 5 -- 5	Cerrado
                --AND custevent_ht_caso_etapacaso = 1 -- 1	DENUNCIA`;
            let result = _executeQuery(sqlquery, [bienId]);
            if(result){
                let casoSeleccionado;
                let tiempoTexto = '';
                let status;
                if(result.length > 0){
                    // Intentamos encontrar un caso "En curso"
                    casoSeleccionado = result.find(caso => caso.estado === "En curso");
                    status = 'DENUNCIA DEL ROBO'

                    // Si no hay ninguno, buscamos "Cerrado" con etapa "CODIGO ROJO"
                    if (!casoSeleccionado) {
                        casoSeleccionado = result.find(caso => caso.estado === "Cerrado" && caso.etapa_gestion === "CODIGO ROJO");
                        status = 'CÓDIGO ROJO'
                    }
                    tiempoHoras  = casoSeleccionado.tiempo_transcurrido || 0;
                    // Convertimos a texto
                    if (tiempoHoras < 24) {
                        tiempoTexto = `${tiempoHoras} ${tiempoHoras === 1 ? 'hora' : 'horas'}`;
                    } else {
                        let dias = Math.floor(tiempoHoras / 24);
                        tiempoTexto = `${dias} ${dias === 1 ? 'día' : 'días'}`;
                    }
                }
                log.debug("casoSeleccionado", casoSeleccionado)
                let newCampo = form.addField({ id: "custpage_bn_status", type: "INLINEHTML", label: "Bien estado"});
                // newCampo.defaultValue = `<p class="uir-record-status" style="background-color:#d5e0ec; position:absolute; top:24px; left: 105px; font-size:14px; padding:5px 5px; font-weight:bold; margin:0;">${casoSeleccionado.tipo_gestion}: ${casoSeleccionado.etapa_gestion} - ${casoSeleccionado.estado.toUpperCase()} (${tiempoTexto})</p>`;
                newCampo.defaultValue = `<p class="uir-record-status" style="background-color:#d5e0ec; position:absolute; top:24px; left: 105px; font-size:14px; padding:5px 5px; font-weight:bold; margin:0;">${status}</p>`;
            }
        } catch (error) {
            log.erro("ERROR _estado_bien", error);
        }
    }

    function _executeQuery(sqlQuery, params = []) {
        try {
            // Aseguramos que params sea un array válido
            if (!Array.isArray(params)) {
                params = [];
            }
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
        } catch (error) {
            log.error("_executeQuery error", error);
        }
    }

    return {beforeLoad};

});