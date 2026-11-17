/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(['N/log', 'N/search', 'N/record', 'N/https', 'N/query', 'N/file', 'N/runtime', 'N/ui/serverWidget', 'N/format',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
  'N/url'
],
  (log, search, record, https, query, file, runtime, serverWidget, format, coberturaController, _funcion, _const, _platformController, url) => {

    let OK_STATUS_CODE = [200, 201];
    const folderRequest = 24651   // SB: 28733 - PR: 24651
    const folderResponse = 24652  // SB: 28734 - PR: 24652

    let URL = "https://telematicsapi.hunterlabs.io"
    let TOKEN = 'ZGVubmlzLmZlcm5hbmRlekBteWV2b2wuYml6OkM0cnMzZ3M0QDIwMjI='

    const onAction = (scriptContext) => {
      try {

        const currentUser = runtime.getCurrentUser();
        const impulsoManual = currentUser?.id || "0";
        if (!validarEjecucion(currentUser)?.permiso) return true;

        const recordHTDetalle = scriptContext.newRecord;

        let idCobertura = recordHTDetalle.getValue('custrecord_ht_ct_transacciones') || "0";
        if (!idCobertura) {
          return true;
        }

        let recordCobertura = record.load({
          type: 'customrecord_ht_cobertura',
          id: idCobertura
        });

        const name = recordCobertura.getValue('name') || "";
        log.debug("Información", { id: idCobertura, name: name });

        // Verifica si el impulso manual coincide con los valores esperados o ejecuta la función de detección de cambio de estado
        let existeCambioDeEstado = bloqueDetectaCambioEstado(recordCobertura);
        const SubsidiariaID = recordCobertura.getValue('custrecord_ht_co_subsidiaria');
        const ID_OS = recordHTDetalle.getValue('custrecord_ht_ct_orden_servicio') || 0;
        const Concepto = recordHTDetalle.getValue('custrecord_ht_ct_concepto') || "";


        const esValido = (impulsoManual == "23" || impulsoManual == "27736" || impulsoManual == "273" || impulsoManual == "28") || (SubsidiariaID == 2 && existeCambioDeEstado && ID_OS && Concepto == 8);
        // log.debug("Validación de ejecución", esValido);
        if (!esValido) return true;

        let item = recordCobertura.getValue('custrecord_ht_co_producto');
        let parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM']);

        const trama = obtenerDatosParaImpulso(recordCobertura, impulsoManual);

        if (parametrizacion_Item[0]?.Valor == '' && parametrizacion_Item[2]?.Valor == 'HT' && trama?.idtelematic == '') {
          parametrizacion_Item[0].Valor = 'S'
        }

        trama.producto = parametrizacion_Item[2]?.Valor || "";

        log.debug("-TRAMA-", trama)

        if (parametrizacion_Item[0]?.Valor === 'S') casoRenovacionCoberturaLatam(trama, SubsidiariaID, ID_OS);
        if (esEnvioAMIValido(parametrizacion_Item, trama)) casoActualizacionTelematic(trama);

        return true;

      } catch (error) {
        log.error("Error en onAction", error);
      }
    };

    /*
     * Funciones Auxiliares
     */
    const obtenerDatosParaImpulso = (dataCobertura, impulsoManual) => {
      try {
        // ========================
        // 1. Validaciones iniciales
        // ========================
        if (!dataCobertura) throw new Error("El objeto dataCobertura es nulo o indefinido.");

        const fechaFinal = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturafinal')) || "";
        if (!fechaFinal) throw new Error("La fecha final no tiene valor.");

        let idTelematic = 0;

        // ========================
        // 2. Datos base de la cobertura
        // ========================
        const idCobertura = dataCobertura.id;
        const datoTecnico = dataCobertura.getValue('custrecord_ht_co_numeroserieproducto') || "";
        const CodigoVehiculo = dataCobertura.getValue('custrecord_ht_co_bien')?.toString() || "";
        const custrecord_ht_co_producto = dataCobertura.getValue('custrecord_ht_co_producto') || "";
        const estadocobertura = dataCobertura.getValue('custrecord_ht_co_estado_cobertura') || "";
        const Propietario = dataCobertura.getValue('custrecord_ht_co_propietario') || "";
        const PropietarioMonitoreo = dataCobertura.getValue('custrecord_ht_co_clientemonitoreo') || "";
        let familia_prod = dataCobertura.getValue('custrecord_ht_co_familia_prod') || "";

        if (familia_prod == 456) {  // !HT - HUNTER GPS HMT - 456
          try {
            ActualizarInfTelematic(Propietario, PropietarioMonitoreo, CodigoVehiculo);
          } catch (error) {
            log.debug("Error en ajusteTrama", error.message || error.stack);
          }
        }

        // ========================
        // 3. Cargar registro de Bien para obtener ID Telematic
        // ========================
        if (CodigoVehiculo) {
          try {
            const registroBien = record.load({
              type: "customrecord_ht_record_bienes",
              id: CodigoVehiculo
            });
            idTelematic = registroBien.getValue({ fieldId: "custrecord_ht_bien_id_telematic" }) || "";
            log.debug("ID Telematic", idTelematic);
          } catch (error) {
            log.debug("Error al cargar el registro de Bien", error);
          }
        } else {
          log.debug("Aviso", "El registro de Bien no está asociado a esta Cobertura.");
        }

        // ========================
        // 4. Información de clientes
        // ========================
        const infoCliente = obtenerDatosPropietario(Propietario) || {};
        const infoClienteMonitoreo = obtenerDatosPropietario(PropietarioMonitoreo) || {};

        // Validar segmento del cliente
        if (impulsoManual) {
          if (!validarPropietarioAut(Propietario, impulsoManual) && estadocobertura === "2") {
            log.debug("Proceso detenido", "Segmento cliente no válido y estado de cobertura es 2.");
            return false;
          }
        }

        // ========================
        // 5. Determinar estado de la SIM
        // ========================
        const EstadoSim =
          estadocobertura === "1" ? "ACT" :
            estadocobertura === "2" ? "INA" :
              (() => { throw new Error("Estado de cobertura no válido."); })();

        // ========================
        // 6. Datos adicionales
        // ========================
        let CodigoSys = obtenerVehiculo(CodigoVehiculo);

        const { Vid, CodMarcaDispositivo, CodModeloDispositivo } = dataDatoTecnico(datoTecnico);
        const { familia } = dataFamilia(familia_prod);

        // Ajustar fecha final para cobertura AMI
        const ajusteFecha = (new Date(fechaFinal).toISOString()).split('T')[0] + "T23:59:59";

        // ========================
        // 7. Retornar trama de datos
        // ========================
        return {
          // Plataforma PX
          FechaFinCobertura: fechaFinal,
          Vid,
          CodMarcaDispositivo,
          CodModeloDispositivo,
          EstadoSim,
          CodigoProducto: custrecord_ht_co_producto,
          IdCobertura: idCobertura,
          IdDatoTecnico: datoTecnico,
          FamiliaProducto: familia,

          // Plataforma AMI
          clientepropietario: infoCliente?.vatregnumber || "",
          clientemonitoreo: infoClienteMonitoreo?.vatregnumber || infoCliente?.vatregnumber || "",
          codigovehiculo: CodigoVehiculo,
          codigosys: CodigoSys?.custrecord_ht_bien_codsysh || "",
          serie: "",
          comando: "",
          ruccompania: "",
          ordentrabajo: "0",
          sensors: "0",
          cobertura: ajusteFecha,
          producto: "",
          itemNS: custrecord_ht_co_producto,
          ordenservicio: "0",
          usuario: "OPERAD",
          origen: "N",
          idtelematic: idTelematic,
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
          log.error('getClientInfo', `No se encontró información para el cliente con ID: ${id}`);
          return emptyFamilia;
        }

        return {
          familia: searchParametroInfo.custrecord_ht_pp_codigo || ""
        };

      } catch (error) {
        log.error('error-getClientInfo', error.message || error);
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
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: 4 });                                 // ID del impulso
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });                     // Plataforma -> PX
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });                          // Estado -> enviado
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });                   // Documento 
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });              // Documento
        objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });                       // Documento

        let saveRecord = objRecord.save();
        // log.debug('Registro guardado con ID', saveRecord);
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

    const validarEjecucion = (datos) => {
      if (datos.subsidiary === 2) {
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

    const validarPropietarioAut = (id, usuarioEject) => {
      try {
        log.debug("UsuarioEject", usuarioEject)

        if (!id) return false

        let filter = [
          ["subsidiary", "anyof", "2"],
          "AND",
          ["internalid", "anyof", id]
        ];

        // Agregar condición de categoría solo si el usuario no es "23" o "27736"
        if (
          // usuarioEject != "23" &&  // 
          usuarioEject != "27736" ||
          usuarioEject != "28"
          // || usuarioEject != "468332"
        ) {
          // filter.unshift(["category", "anyof", "1", "7"], "AND"); // Agregar al inicio
          filter.unshift(["category", "anyof", "1", "7", "10"], "AND"); // Agregar al inicio
        }

        const searchObj = search.create({
          type: "customer",
          filters: filter,
          columns: [
            search.createColumn({ name: "entityid", label: "ID" }),
            search.createColumn({ name: "altname", label: "Nombre" }),
            search.createColumn({ name: "hasduplicates", label: "Duplicado" }),
            search.createColumn({ name: "contact", label: "Contacto principal" }),
            search.createColumn({ name: "category", label: "Categoría" }),
            search.createColumn({ name: "subsidiary", label: "Subsidiaria principal" })
          ]
        });

        const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

        if (searchResult.length > 0) {
          return true
        } else {
          return false;
        }
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

        // Obtener la fecha y hora exacta en la que se disparó el flujo de trabajo
        let fechaDisparo = new Date();
        let fechaEcuador = new Date(fechaDisparo.toLocaleString("en-US", { timeZone: "America/Guayaquil" }));

        // Calcular el rango de tiempo (dos minutos antes y después)
        let fechaInicio = new Date(fechaEcuador);
        fechaInicio.setMinutes(fechaInicio.getMinutes() - 2);
        let fechaFin = new Date(fechaEcuador);
        fechaFin.setMinutes(fechaFin.getMinutes() + 2);

        // Formatear fechas en el formato requerido por NetSuite (DD/MM/YYYY HH:mm)
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

        // log.debug("Rango de búsqueda", `Inicio: ${rangoInicio}, Fin: ${rangoFin}`);

        // Crear la búsqueda en las notas del sistema
        let searchResult = search.create({
          type: 'systemnote',
          filters: [
            ["recordid", "equalto", newRecord.id],
            'AND',
            ['date', 'within', rangoInicio, rangoFin]
            // ['date', 'within', "27/03/2025 12:03", "27/03/2025 12:05"]
          ],
          columns: [
            search.createColumn({ name: 'date', sort: search.Sort.DESC }),
            search.createColumn({ name: 'name' }),
            search.createColumn({ name: 'newvalue' }),
            search.createColumn({ name: 'oldvalue' }),
            search.createColumn({ name: 'field' })
          ]
        });

        // Ejecutar la búsqueda y verificar cambios
        let results = searchResult.run().getRange({ start: 0, end: 200 });

        if (results.length > 0) {
          existeCambio = verificarCamposPersonalizados(results);
        } else {
          // log.debug("Validación de cambio", "No se encontraron cambios en el rango de tiempo especificado."); // !Temporal
        }

        return existeCambio;

      } catch (error) {
        log.debug("error", error)
        return
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

    const casoActualizacionTelematic = (data) => {
      try {
        // Validar que los datos no sean nulos, vacíos o indefinidos
        if (!data || Object.keys(data).length === 0) {
          log.error("casoActualizacionTelematic", "Los datos proporcionados son nulos, vacíos o indefinidos.");
          return false;
        }

        // Valida si contien id Telematic
        if (!data?.idtelematic) {
          log.error("casoActualizacionTelematic", "No se encontró el ID del dispositivo telemático.");
          return false;
        }

        // Obtener el token
        const token = _funcion.loginGetToken();
        if (!token) {
          log.error("casoActualizacionTelematic", "No se pudo obtener el token.");
          return false;
        }

        // Configurar los headers
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Construir el cuerpo de la solicitud
        const requestData = {
          "clientepropietario": data.clientepropietario,        // 1
          "clientemonitoreo": data.clientemonitoreo,            // 12
          "codigovehiculo": data.codigovehiculo,                // 2
          "codigosys": data.codigosys || data.codigovehiculo,   // 3
          "serie": "",                                          // 17
          "comando": "",                                        // 15
          "ruccompania": "",
          "ordentrabajo": "0",                                  // 9
          "sensors": "0",
          "cobertura": data.cobertura,                          // 6
          "producto": data.producto,                            // 5
          "itemNS": data.itemNS,                                // 11
          "ordenservicio": data.ordenservicio,                  // 8
          "usuario": "OPERAD",                                  // 4
          "origen": "N",                                        // 7
          "parametroproducto": "GPT",                           // 10
          "vehiculoid": "",                                     // 13
          "clienteid": "",                                      // 14
          "accion": "",                                         // 16
          "vidanterior": "",                                    // 18
          "vid": ""                                             // 19
        };

        // log.debug("Datos de la solicitud", requestData);

        // Configurar las opciones de la solicitud
        const options = {
          method: "POST",
          url: `${_const.URLS.HUNTER_API_NETSUITE}/ProcesoAMI/ActualizacionCoberturaNetsuite`,
          headers: headers,
          body: JSON.stringify(requestData),
        };

        // log.debug("Opciones de la API externa", options);

        // Realizar la solicitud HTTP
        let response = https.post(options);

        // Validar la respuesta
        let temporal = response && response.body ? JSON.parse(response.body) : null;
        let respuesta = temporal && temporal[0]?.cODIGO == "1" ? temporal[0]?.cODIGO : response;

        // Crear archivos de trazabilidad
        const requestFile = saveJson(requestData, `request_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderRequest);
        // log.debug("Archivo de solicitud creado", requestFile);

        const responseFile = saveJson(response, `response_${data.EstadoSim || 0}_${data.codigovehiculo}_GPT_${sysDateTime()}`, folderResponse);
        // log.debug("Archivo de respuesta creado", responseFile);

        // Crear registro de impulso
        crearRegistroImpulso(data.IdCobertura, requestFile, responseFile, respuesta, "TELEMATICS");

        // Validar el estado de la respuesta
        if (response && response.code == 200) {
          // log.debug("Respuesta exitosa de la API externa", temporal);
          return true;
        } else {
          log.error("Error en la respuesta de la API externa", temporal || response);
          generarLogCambioEstado(data, data.IdCobertura || 0, "F", "ProcesoAMI");
          return false;
        }
      } catch (error) {
        log.error("Error en casoActualizacionTelematic", error.message);
        crearRegistroImpulso(data?.IdCobertura, "", "", error.message, "TELEMATICS");
        return false;
      }
    };

    function esEnvioAMIValido(parametrizacion_Item, trama) {
      return (
        parametrizacion_Item[1]?.Valor === 'S' &&     // Validar si el envío a AMI está habilitado posee GPT
        trama.producto &&                             // Validar que el producto no esté vacío
        // trama.FechaInicioCobertura &&                 // Validar que la fecha de inicio no esté vacía
        trama.FechaFinCobertura                       // Validar que la fecha de fin no esté vacía
      );
    }

    function casoRenovacionCoberturaLatam(trama, SubsidiariaID, ID_OS) {
      try {
        // let URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; // URL de prueba
        // https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx
        let URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx';
        const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];

        const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
        if (camposVacios.length > 0) {
          // log.debug("--jsonCobertura--", jsonCobertura)
          log.error('Campos vacíos en jsonCobertura', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
          return true; // Detener el proceso si hay campos vacíos
        }

        if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
          log.debug("Estado SIM no válido", trama.EstadoSim)
          return false;
        }

        log.debug("TTT", {
          "IdDatoTecnico": trama.IdDatoTecnico,
          "SubsidiariaID": SubsidiariaID,
          "URLPX": URLPX,
          "codigovehiculo": trama.codigovehiculo,
          "A": "1",
          "EstadoSim": trama.EstadoSim,
          "Familia": trama.FamiliaProducto
        })

                       // _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim, trama.FamiliaProducto);
        let procesoPX = _platformController.envioPXRenovacionDispositivo(ID_OS, SubsidiariaID, URLPX, trama.FamiliaProducto)

        log.debug("procesoPX", procesoPX);

        if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
          // Generar log Proceso General PX 
          generarLogCambioEstado(procesoPX.PxAdmin, trama.IdCobertura, 'F', "ProcesoPX");
        } else {
          // Crear Archivos
          let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);  // json traza
          // log.debug('idrequestFile', requestFile);

          let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);   // json Respuesta
          // log.debug('idresponseFile', requestFile);

          crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');

          return true;
        }

      } catch (error) {
        log.debug("error", error)
        crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
      }
    }

    /////////////////////////////////////////////////////////////////////////////////////// HT - HUNTER GPS HMT
    function ActualizarInfTelematic(propietario, clienteMonitoreo, bien) {
      try {
        log.debug("---------------------------", "---------------------------");
        const headers = getHeaders();
        const urlBase = getTelematicUrlBase();

        // Procesar propietario principal y propietario de monitoreo
        let propietarioId = procesarPropietario(propietario, headers, urlBase);  // cliente
        procesarPropietario(clienteMonitoreo, headers, urlBase);                 // cliente de monitoreo

        // Procesar vehículo
        procesarBien(bien, headers, urlBase, propietarioId);

        return true;

      } catch (error) {
        log.debug("Error ActualizarInfTelematic", error.stack || error.message);
      }
    };

    function procesarPropietario(customerId, headers, urlBase) {
      if (!customerId) return;
      const correos = obtenerCorreosPropietario(customerId);
      const datos = obtenerDatosPropietario(customerId);

      // if (datos.custentity_ht_customer_id_telematic && correos.amiEmail) {
      if (!datos?.custentity_ht_customer_id_telematic && correos?.amiEmail) {  //!
        const getCustomerMonitorParams = {
          username: correos.amiEmail,
          customer__company_code: datos.taxidnum,
          customer__identity_document_number: datos.vatregnumber
        };
        log.error("Datos de consulta Propietario", getCustomerMonitorParams);

        const getCustomerMonitorUrl = formatUrl(`${urlBase}/customer/user/`, getCustomerMonitorParams);
        let getCustomerMonitorResponse = https.get({ headers, url: getCustomerMonitorUrl });

        if (OK_STATUS_CODE.indexOf(getCustomerMonitorResponse.code) === -1) {
          return getResultResponse("error", results, JSON.stringify({
            code: getCustomerMonitorResponse.code,
            error: JSON.parse(getCustomerMonitorResponse.body)
          }));
        }

        getCustomerMonitorResponse = JSON.parse(getCustomerMonitorResponse.body);
        log.error("-Respuesta Propietario-", getCustomerMonitorResponse);

        if (getCustomerMonitorResponse.count === 1) {
          const customerMonitor = getCustomerMonitorResponse.results[0];
          log.error("-Propietario-IdTelematic-Simulacion-guardado", customerMonitor?.id);


          // guardarEnNetSuite('customer', customerId, {
          //   custentity_ht_customer_id_telematic: customerMonitor.id
          // });

          return customerMonitor?.id || 0;

        }
      } else {
        return datos?.custentity_ht_customer_id_telematic
      }
    };

    function procesarBien(bienID, headers, urlBase, propietarioId) {
      if (!bienID || !propietarioId) return;

      const datosBien = obtenerVehiculo(bienID);
      if (datosBien?.custrecord_ht_bien_id_telematic || !datosBien?.custrecord_ht_bien_codsysh) return;

      let encontrado = false;

      function buscarYGuardar(paramValue, logLabel) {
        const params = {
          attributes__attribute__name: "COD_SYS",
          attributes__value: paramValue
        };

        log.error(`Datos de consulta Bien ${logLabel}`, params);

        const url = formatUrl(`${urlBase}/asset/`, params);
        let resp = https.get({ headers, url });

        if (!OK_STATUS_CODE.includes(resp.code)) {
          return getResultResponse("error", results, JSON.stringify({
            code: resp.code,
            error: JSON.parse(resp.body)
          }));
        }

        resp = JSON.parse(resp.body);
        log.error(`-Respuesta Bien ${logLabel}-`, resp);

        if (resp.count === 1) {
          const asset = resp.results[0];
          log.error(`-Bien ${logLabel}-IdTelematic-Simulacion-Guardado`, asset?.id);

          // guardarEnNetSuite('customrecord_ht_record_bienes', bienID, {
          //   custrecord_ht_bien_id_telematic: asset.id
          // });

          encontrado = true; // Marca que ya se encontró
        }
      }

      // Buscar primero por COD_SYS de datosBien
      buscarYGuardar(datosBien.custrecord_ht_bien_codsysh, "");

      // Si no se encontró, intentar con InternalID
      if (!encontrado && datosBien?.internalid) {

        log.error("Datos de consulta Bien por InternalID", { internalid: datosBien.internalid });
        buscarYGuardar(datosBien.internalid, "por InternalID");
      }
    }

    const getHeaders = () => {
      let headers = {};
      headers['Accept'] = '*/*';
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = 'Basic ' + TOKEN;
      return headers;
    };

    const getTelematicUrlBase = () => {
      return URL
    };

    const formatUrl = (domain, params) => {
      return url.format({ domain, params });
    };

    function guardarEnNetSuite(tipoRegistro, idRegistro, valores) {
      try {
        record.submitFields({
          type: tipoRegistro,
          id: idRegistro,
          values: valores,
          options: { enableSourcing: false, ignoreMandatoryFields: true }
        });

        log.debug("Registro actualizado correctamente", {
          tipo: tipoRegistro,
          id: idRegistro,
          valores
        });

        return true;
      } catch (error) {
        log.error("Error al actualizar registro en NetSuite", {
          tipo: tipoRegistro,
          id: idRegistro,
          valores,
          mensaje: error.message || error,
          stack: error.stack || "Sin traza de error"
        });
        return false;
      }
    };

    const obtenerCorreosPropietario = (customerId) => {
      let result = {
        email: "",
        amiEmail: "",
        convenioEmail: "",
        mainEmail: ""
      };

      let resultSearch = search.create({
        type: "customrecord_ht_record_correoelectronico",
        filters: [
          ["custrecord_ht_ce_enlace", "anyof", customerId],
          "AND",
          ["custrecord_ht_email_tipoemail", "anyof", ["1", "2", "3"]]
        ],
        columns: [
          search.createColumn({ name: "custrecord_ht_email_tipoemail" }),
          search.createColumn({ name: "custrecord_ht_email_email" }),
          search.createColumn({ name: "custrecord_ht_email_emailprincipal" })
        ]
      }).run().getRange(0, 3); // Solo 3 resultados

      for (let record of resultSearch) {
        let email = record.getValue("custrecord_ht_email_email");
        let emailType = record.getValue("custrecord_ht_email_tipoemail");
        let mainEmail = record.getValue("custrecord_ht_email_emailprincipal");

        if (mainEmail) result.mainEmail = email;
        if (emailType === "1") result.email = email;
        if (emailType === "2") result.amiEmail = email;
        if (emailType === "3") result.convenioEmail = email;
      }

      return result;
    };

    const obtenerDatosPropietario = (customerId) => {
      if (!customerId) return;

      let customer = search.lookupFields({
        type: 'customer',
        id: customerId,
        columns: [
          'entityid',
          'custentity_ht_cl_primernombre',
          'custentity_ht_cl_segundonombre',
          'custentity_ht_cl_apellidopaterno',
          'custentity_ht_cl_apellidomaterno',
          'phone',
          'homephone',
          'email',
          'vatregnumber',
          'custentity_ht_customer_id_telematic',
          'internalid',
          'custentityts_ec_cod_tipo_doc_identidad',
          'companyname',
          'isperson',
          'subsidiary' // traer solo el ID/nombre
        ]
      });

      // Si hay subsidiaria, buscar su federalidnumber
      if (customer.subsidiary && customer.subsidiary.length) {
        let subsidiaryId = customer.subsidiary[0].value;
        let subsidiaryData = search.lookupFields({
          type: 'subsidiary',
          id: subsidiaryId,
          columns: ['taxidnum']
        });
        customer.taxidnum = subsidiaryData.taxidnum || '';
      }

      return customer;
    };

    const obtenerVehiculo = (id) => {
      if (!id) return;
      let vehiculo = search.lookupFields({
        type: 'customrecord_ht_record_bienes', id: id,
        columns: [
          'custrecord_ht_bien_placa',
          'custrecord_ht_bien_marca',
          'custrecord_ht_bien_modelo',
          'custrecord_ht_bien_chasis',
          'custrecord_ht_bien_motor',
          'custrecord_ht_bien_colorcarseg',
          'custrecord_ht_bien_tipoterrestre',
          'custrecord_ht_bien_tipoterrestre.custrecord_ht_tt_idtelematic',
          'name',
          'custrecord_ht_bien_ano',
          'custrecord_ht_bien_codsysh',
          'custrecord_ht_bien_consesionarios.custrecord_ht_cd_ruccanaldistribucion',
          'custrecord_ht_bien_consesionarios.custrecord_ht_cd_nombre',
          'custrecord_ht_bien_consesionarios.custrecord_ht_cd_direccion',
          'custrecord_ht_bien_consesionarios.custrecord_ht_cd_telefono',
          'custrecord_ht_bien_consesionarios.custrecord_ht_cd_tipocanal',
          'custrecord_ht_bien_marca.custrecord_ht_marca_codigo',
          'custrecord_ht_bien_marca.custrecord_ht_marca_descripcion',
          'custrecord_ht_bien_modelo.custrecord_ht_mod_codigo',
          'custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion',
          'custrecord_ht_bien_cilindraje',
          'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_codigo',
          'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_descrip',
          'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_codigo',
          'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion',
          'custrecord_ht_bien_id_telematic',
          'internalid',
          'custrecord_ht_bien_tipo',
          'custrecord_ht_bien_tipo.custrecord_ht_tv_codigo',
          'custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion',
          'custrecord_ht_bien_numeropuertas',
          'custrecord_ht_bien_num_ruedas',
          'custrecord_ht_bien_max_peso',
          'custrecord_ht_bien_largo',
          'altname'
        ]
      });
      return vehiculo;
    };

    return {
      onAction: onAction
    };
  });