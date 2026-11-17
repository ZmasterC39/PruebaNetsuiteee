/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/
/*
Creado Por: JHON MONTES
Fecha: 04/11/2026
Basado en: HU_EC_WF_ACT_COBERTURA.js (subsidiaria 2 - Ecuador)
Objetivo: Acción de Workflow sobre la Cobertura de la Subsidiaria 3 (Perú). Cuando detecta un
          cambio reciente de Estado / Fecha final de la cobertura, sincroniza el estado con PX (LATAM).
          En Perú NO aplica: usuarios autorizados, categorías de cliente ni Telematic (AMI).
Script: WorkflowActionScript

IMPORTANTE - Pendientes de validar con el equipo funcional antes de desplegar a producción:
  1) CLIENTES_EXCLUIDOS_PE: clientes a los que no se les envía suspensión. Vacío por defecto
     (en EC eran 47445, 20995, 311945, 439954).
  2) folderRequest / folderResponse: apuntan a las carpetas de EC PR. Confirmar/crear las de PE.
*/

define(['N/log', 'N/search', 'N/record', 'N/file', 'N/runtime',
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller'
],
  (log, search, record, file, runtime, _platformController) => {

    // ============================================================
    //  CONFIGURACIÓN PERÚ
    // ============================================================
    const SUBSIDIARIA_PE = 3;
    const TIMEZONE_PE = "America/Lima";

    // Propietarios excluidos de la suspensión. TODO: confirmar con negocio. Ej: ["47445", "20995"]
    const CLIENTES_EXCLUIDOS_PE = [];

    const folderRequest = 24651   // TODO: confirmar/crear carpeta de PE (actualmente es la de EC PR)
    const folderResponse = 24652  // TODO: confirmar/crear carpeta de PE (actualmente es la de EC PR)

    const URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'; // Endpoint compartido LATAM (resuelve NACIONALIDAD por subsidiaria)

    const onAction = (scriptContext) => {
      try {
        const currentUser = runtime.getCurrentUser();
        if (!validarEjecucion(currentUser)?.permiso) return true;

        const record = scriptContext.newRecord;
        const idCobertura = record.id || 0;

        const name = record.getValue('name') || "";
        log.debug("Información", { id: idCobertura, name: name });

        const SubsidiariaID = record.getValue('custrecord_ht_co_subsidiaria');
        if (String(SubsidiariaID) !== String(SUBSIDIARIA_PE)) return true;

        // Solo se procesa si hubo un cambio reciente de estado / fecha final de la cobertura
        const existeCambioDeEstado = bloqueDetectaCambioEstado(scriptContext);
        if (!existeCambioDeEstado) return true;

        let item = record.getValue('custrecord_ht_co_producto');
        let parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'FAM']);

        const trama = obtenerDatosParaImpulso(record);
        if (!trama) {
          log.debug("Proceso detenido", "No se generó la trama de la cobertura.");
          return true;
        }

        // Familia HT sin GPG parametrizado: se envía a PX (en PE no hay Telematic)
        if (parametrizacion_Item[0]?.Valor == '' && parametrizacion_Item[1]?.Valor == 'HT') {
          parametrizacion_Item[0].Valor = 'S'
        }

        log.debug("-TRAMA-", trama)
        log.debug("parametrizacion_Item", parametrizacion_Item)

        if (parametrizacion_Item[0]?.Valor === 'S') casoActualizacionCoberturaLatam(trama, SUBSIDIARIA_PE);

        return true;

      } catch (error) {
        log.error("Error en onAction", error);
      }
    };

    /*
     * Funciones Auxiliares
     */
    const obtenerDatosParaImpulso = (dataCobertura) => {
      try {
        // ========================
        // 1. Validaciones iniciales
        // ========================
        if (!dataCobertura) throw new Error("El objeto dataCobertura es nulo o indefinido.");

        const fechaFinal = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturafinal')) || "";
        if (!fechaFinal) throw new Error("La fecha final no tiene valor.");
        // ========================
        // 2. Datos base de la cobertura
        // ========================
        const idCobertura = dataCobertura.id;
        const datoTecnico = dataCobertura.getValue('custrecord_ht_co_numeroserieproducto') || "";
        const CodigoVehiculo = dataCobertura.getValue('custrecord_ht_co_bien')?.toString() || "";
        const custrecord_ht_co_producto = dataCobertura.getValue('custrecord_ht_co_producto') || "";
        const estadocobertura = dataCobertura.getValue('custrecord_ht_co_estado_cobertura') || "";
        const Propietario = dataCobertura.getValue('custrecord_ht_co_propietario') || "";

        if (CLIENTES_EXCLUIDOS_PE.includes(String(Propietario)) && estadocobertura == "2") { // Se excluye toda suspensión
          throw new Error(`El propietario ${Propietario} está excluido de suspensión, proceso detenido.`);
        }

        let familia_prod = dataCobertura.getValue('custrecord_ht_co_familia_prod') || "";

        // ========================
        // 3. Validar cliente (subsidiaria PE y no excluido) para suspensión
        // ========================
        if (!validarPropietarioAut(Propietario) && estadocobertura === "2") {
          log.debug("Proceso detenido", "Cliente no válido y estado de cobertura es 2.");
          return false;
        }

        // ========================
        // 4. Determinar estado de la SIM
        // ========================
        const EstadoSim =
          estadocobertura === "1" ? "ACT" :
            estadocobertura === "2" ? "INA" :
              (() => { throw new Error("Estado de cobertura no válido."); })();

        // ========================
        // 5. Datos adicionales
        // ========================
        const { Vid, CodMarcaDispositivo, CodModeloDispositivo } = dataDatoTecnico(datoTecnico);
        const { familia } = dataFamilia(familia_prod);

        // ========================
        // 6. Retornar trama de datos (Plataforma PX)
        // ========================
        return {
          FechaFinCobertura: fechaFinal,
          Vid,
          CodMarcaDispositivo,
          CodModeloDispositivo,
          EstadoSim,
          CodigoProducto: custrecord_ht_co_producto,
          IdCobertura: idCobertura,
          IdDatoTecnico: datoTecnico,
          FamiliaProducto: familia,
          codigovehiculo: CodigoVehiculo,
        };

      } catch (error) {
        log.debug("Error en obtenerDatosParaImpulso", error.message);
        return false;
      }
    };

    const dataDatoTecnico = (id) => {
      const objData = {
        Vid: '',
        CodMarcaDispositivo: '',
        CodModeloDispositivo: ''
      };

      if (!id) return objData;

      try {
        const objSearch = search.create({
          type: "customrecord_ht_record_mantchaser",
          filters: [["internalid", "anyof", id]],
          columns: [
            "custrecord_ht_mc_vid",
            "custrecord_ht_mc_unidad",
            "custrecord_ht_mc_modelo"
          ]
        });

        const result = objSearch.run().getRange({ start: 0, end: 1 })[0];

        if (result) {
          objData.Vid = result.getValue("custrecord_ht_mc_vid") || '';
          objData.CodMarcaDispositivo = result.getValue("custrecord_ht_mc_unidad") || '';
          objData.CodModeloDispositivo = result.getValue("custrecord_ht_mc_modelo") || '';
        }

      } catch (error) {
        log.error("Error en dataDatoTecnico", error);
      }

      return objData;
    };

    const dataFamilia = (id) => {
      const emptyFamilia = { familia: "" };

      if (!id) return emptyFamilia;

      try {
        const searchParametroInfo = search.lookupFields({
          type: "customrecord_ht_cr_pp_valores",
          id,
          columns: ['custrecord_ht_pp_codigo']
        });

        if (!searchParametroInfo || !Object.keys(searchParametroInfo).length) {
          log.error('dataFamilia', `No se encontró información para la familia con ID: ${id}`);
          return emptyFamilia;
        }

        return {
          familia: searchParametroInfo.custrecord_ht_pp_codigo || ""
        };

      } catch (error) {
        log.error('error-dataFamilia', error.message || error);
        return emptyFamilia;
      }
    };

    const formatearFecha = (fecha) => {
      try {
        const partes = fecha.split("/");
        const dia = partes[0];
        const mes = partes[1];
        const año = partes[2];
        const fechaFormateada = `${año}-${mes}-${dia}`;
        return fechaFormateada;
      } catch (error) {
        throw new Error("Error en Formatear fecha");
      }
    };

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
      try {
        let data = [];
        for (let i = 0; i < busquedaParametro.length; i++) {

          if (!items || !busquedaParametro[i]) {
            log.debug("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
            return [];
          }

          let filtro = [
            ["custrecord_ht_pp_parametrizacionid", "is", items],
            "AND",
            ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
          ];

          let busqueda = search.create({
            type: "customrecord_ht_pp_main_param_prod",
            filters: filtro,
            columns: [
              search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
              search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
              search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
              search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
            ],
          });

          let resultCount = busqueda.runPaged().count;

          if (resultCount > 0) {
            let pageData = busqueda.runPaged({ pageSize: 1 });
            pageData.pageRanges.forEach((pageRange) => {
              let page = pageData.fetch({ index: pageRange.index });
              page.data.forEach((result) => {
                let columns = result.columns;
                let parametrizacion = {
                  Param: result.getValue(columns[2]) || "",
                  ParamId: result.getValue(columns[0]) || "",
                  Valor: result.getValue(columns[3]) || "",
                  ValorText: result.getText(columns[1]) || "",
                  ValorId: result.getValue(columns[1]) || "",
                };
                data.push(parametrizacion);
              });
            });
          } else {
            data.push({
              Param: "",
              ParamId: "",
              Valor: "",
              ValorText: "",
              ValorId: "",
            });
          }
        }
        return data;
      } catch (error) {
        log.error("Error", { error: error.message, stack: error.stack });
        return []
      }
    };

    const crearRegistroImpulso = (cobertura, requestFile, responseFile, respuesta, Plataforma) => {
      // Guardar Registro de traza
      try {
        let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });                       // ID Cobertura
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: 4 });                                 // ID del impulso (TODO: confirmar para PE)
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });                     // Plataforma
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });                          // Estado -> enviado
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });                   // Documento
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });              // Documento
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });                       // Respuesta
        objRecord.save();
      } catch (error) {
        log.error('Error al crear el registro de traza', { error: error.message, stack: error.stack });
      }
    };

    const fechaSistema = () => {
      let date = new Date();
      let tdate = date.getDate();
      tdate = tdate < 10 ? `0${tdate}` : tdate;
      let month = date.getMonth() + 1;
      month = month < 10 ? `0${month}` : month;
      let year = date.getFullYear();
      let hours = date.getHours();
      hours = hours < 10 ? `0${hours}` : hours;
      let minutes = date.getMinutes();
      minutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${tdate}${month}${year}${hours}${minutes}`;
    };

    const saveJson = (contents, nombre, folder) => {
      let fecha = fechaSistema();
      let fileObj = file.create({
        name: `${nombre}_${fecha}.json`,
        fileType: file.Type.JSON,
        contents: JSON.stringify(contents),
        folder: folder,
        isOnline: false
      });
      return fileObj.save();
    };

    // Solo ejecuta si el usuario que dispara el workflow pertenece a la subsidiaria de Perú
    const validarEjecucion = (datos) => {
      if (Number(datos?.subsidiary) === SUBSIDIARIA_PE) {
        return {
          permiso: true,
          id: datos.id,
          nombre: datos.name || ""
        };
      }
      return {
        permiso: false,
        id: "",
        nombre: ""
      };
    };

    const validarPropietarioAut = (id) => {
      try {
        if (!id) return false

        let filter = [
          ["subsidiary", "anyof", String(SUBSIDIARIA_PE)],
          "AND",
          ["internalid", "anyof", id]
        ];

        // Clientes excluidos (solo si hay alguno configurado; 'noneof' sin valores falla)
        if (CLIENTES_EXCLUIDOS_PE.length) {
          filter.push("AND", ["internalid", "noneof", ...CLIENTES_EXCLUIDOS_PE]);
        }

        const searchObj = search.create({
          type: "customer",
          filters: filter,
          columns: [
            search.createColumn({ name: "entityid", label: "ID" }),
            search.createColumn({ name: "category", label: "Categoría" }),
            search.createColumn({ name: "subsidiary", label: "Subsidiaria principal" })
          ]
        });

        const searchResult = searchObj.run().getRange({ start: 0, end: 1 });
        return searchResult.length > 0;

      } catch (error) {
        log.error("Error en ValidarPropietarioAut", { error: error.message, stack: error.stack });
        return false;
      }
    };

    function generarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
      try {
        let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
        objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
        objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
        objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
        objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
        objRecord.save();
      } catch (error) {
        log.error('Error en generarLogCambioEstado', error);
      }
    }

    const bloqueDetectaCambioEstado = (context) => {
      try {
        let existeCambio = false;
        let newRecord = context.newRecord;

        // Fecha y hora en la que se disparó el flujo de trabajo (hora Perú)
        let fechaPeru = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE_PE }));

        // Rango de tiempo: dos minutos antes y después
        let fechaInicio = new Date(fechaPeru);
        fechaInicio.setMinutes(fechaInicio.getMinutes() - 2);
        let fechaFin = new Date(fechaPeru);
        fechaFin.setMinutes(fechaFin.getMinutes() + 2);

        // Formato requerido por NetSuite (DD/MM/YYYY HH:mm)
        let formatoFecha = fecha => {
          let dia = String(fecha.getDate()).padStart(2, '0');
          let mes = String(fecha.getMonth() + 1).padStart(2, '0');
          let anio = fecha.getFullYear();
          let horas = String(fecha.getHours()).padStart(2, '0');
          let minutos = String(fecha.getMinutes()).padStart(2, '0');
          return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
        };

        let rangoInicio = formatoFecha(fechaInicio);
        let rangoFin = formatoFecha(fechaFin);

        // Búsqueda en las notas del sistema
        let searchResult = search.create({
          type: 'systemnote',
          filters: [
            ["recordid", "equalto", newRecord.id],
            'AND',
            ['date', 'within', rangoInicio, rangoFin]
          ],
          columns: [
            search.createColumn({ name: 'date', sort: search.Sort.DESC }),
            search.createColumn({ name: 'name' }),
            search.createColumn({ name: 'newvalue' }),
            search.createColumn({ name: 'oldvalue' }),
            search.createColumn({ name: 'field' })
          ]
        });

        let results = searchResult.run().getRange({ start: 0, end: 200 });

        if (results.length > 0) {
          existeCambio = verificarCamposPersonalizados(results);
        }

        return existeCambio;

      } catch (error) {
        log.debug("error", error)
        return false
      }
    };

    const verificarCamposPersonalizados = (results) => {
      try {
        let camposRelevantes = ["HT CO Estado Cobertura", "HT CO Cobertura final"];
        let lastChanges = {};

        results.forEach(result => {
          let field = result.getText({ name: 'field' });
          let date = result.getValue({ name: 'date' });

          if (!lastChanges[field] || new Date(lastChanges[field].date) < new Date(date)) {
            lastChanges[field] = {
              oldValue: result.getValue({ name: 'oldvalue' }),
              newValue: result.getValue({ name: 'newvalue' }),
              date: date,
              user: result.getValue({ name: 'name' })
            };
          }
        });

        return Object.keys(lastChanges).some(field => camposRelevantes.includes(field));
      } catch (error) {
        log.debug("error", error)
        return false
      }
    };

    const sysDateTime = () => {
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${rand}_${rand2}`;
    };

    function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
      try {
        log.debug("Inicia casoActualizacionCoberturaLatam", trama)

        const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];
        const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
        if (camposVacios.length > 0) {
          log.error('Campos vacíos en trama', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
          return true;
        }

        if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
          log.debug("Estado SIM no válido", trama.EstadoSim)
          return false;
        }

        log.debug("Envío PX", {
          IdDatoTecnico: trama.IdDatoTecnico,
          SubsidiariaID,
          URLPX,
          codigovehiculo: trama.codigovehiculo,
          EstadoSim: trama.EstadoSim,
          Familia: trama.FamiliaProducto
        })

        let procesoPX = _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim, trama.FamiliaProducto);

        log.debug("procesoPX", procesoPX);

        if (String(procesoPX?.response?.body) !== "1") {
          // Error PX -> log de proceso general
          generarLogCambioEstado(procesoPX?.PxAdmin || {}, trama.IdCobertura, 'F', "ProcesoPX");
          return false;
        }

        // Éxito PX -> archivos de traza + registro de impulso
        let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);
        let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);

        crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');

        return true;

      } catch (error) {
        log.debug("error", error)
        crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
      }
    }

    return {
      onAction: onAction
    };
  });
