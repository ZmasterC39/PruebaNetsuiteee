/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta según el cronograma establecido en NetSuite
Objetivo: Realiza una búsqueda de registros pendientes de procesamiento y envía los datos a un API externo.
Script: https://7451241-sb1.app.netsuite.com/app/common/scripting/script.nl?id=1823&whence=
Ambiente: SB1, Sandbox
*/

define([
  'N/log',
  'N/search',
  'N/query',
  "N/record",
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION",
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
  "N/https",
  "N/runtime",
  "N/format",
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
  'N/file'
], function (log, search, query, record, coberturaController, _funcion, _const, https, runtime, format, _platformController, file) {

  const folderRequest = 24651   // SB: 28733 - PR: 24651
  const folderResponse = 24652  // SB: 28734 - PR: 24652

  function execute() {

    try {
      // return
      // Crear la búsqueda del registro
      const searchObj = search.create({
        type: "customrecord_log_proceso_general",
        filters: [
          ["custrecordlog_proceso_general_proceso", "is", "ProcesoPX"],
          "AND",
          ["custrecord_producto_lpc", "startswith", "F"],
          "AND",
          ["isinactive","anyof","F"] 
        ],
        columns: [
          search.createColumn({ name: "id", label: "ID", sort: search.Sort.DESC }),
          search.createColumn({ name: "owner", label: "Propietario" }),
          search.createColumn({ name: "created", label: "Fecha de creación" }),
          search.createColumn({ name: "custrecord_producto_lpc", label: "PROCESADO" }),
          search.createColumn({ name: "custrecordlog_proceso_general_proceso", label: "Proceso" }),
          search.createColumn({ name: "custrecordid_registro_proc_general", label: "id_registro" })
        ]
      });

      const myResultParaCobertura = searchObj.run().getRange({ start: 0, end: 100 });
      const theCountFac = searchObj.runPaged().count;

      log.debug("Número de registros encontrados", theCountFac);

      // Procesar cada resultado de la búsqueda
      myResultParaCobertura.forEach((result, index) => {

        log.debug(`Procesando registro`, `${index + 1}`);


        // Obtener el ID del bien
        const idCobertura = result.getValue({ name: "custrecordid_registro_proc_general" });

        // cargar el record de cobertura
        const recordORI = record.load({
          type: "customrecord_ht_co_cobertura",
          id: idCobertura,
          isDynamic: true
        }) || false;


        // log.debug("Record", recordORI);

        // return

        const name = recordORI.getValue('name') || "";
        log.debug("Información", {
          id: idCobertura,
          name: name,
        });

        const SubsidiariaID = recordORI.getValue('custrecord_ht_co_subsidiaria');

        // Verifica si el impulso manual coincide con los valores esperados o ejecuta la función de detección de cambio de estado
        let existeCambioEstado = true;
        const esValido = (SubsidiariaID == 2 && existeCambioEstado);

        log.debug("Validación de ejecución", esValido);

        if (!esValido) return;

        let item = recordORI.getValue('custrecord_ht_co_producto');
        let trama = obtenerDatosParaImpulso(recordORI);
        let parametrizacion_Item = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM', 'APS']);

        if (parametrizacion_Item[3]?.Valor === 'N') {
          record.delete({
            type: 'customrecord_log_proceso_general',
            id: result.getValue({ name: "id" })
          });
          log.debug("Registro eliminado", `Registro con ID ${result.getValue({ name: "id" })} eliminado correctamente.`);
        };

        log.debug("parametrizacion_Item", parametrizacion_Item);

        trama.producto = parametrizacion_Item[2]?.Valor || "";
        if (parametrizacion_Item[0]?.Valor === 'S' || parametrizacion_Item[2]?.Valor === 'HT' ) {

          log.debug("parametrizacion_Item_0", parametrizacion_Item[0])
          
          if (casoActualizacionCoberturaLatam(trama, SubsidiariaID)) {
            // Eliminar el registro de la tabla customrecord_log_proceso_general
            const id = result.getValue({ name: "id" });
            record.delete({
              type: 'customrecord_log_proceso_general',
              id: id
            });
            log.debug("Registro eliminado", `Registro con ID ${id} eliminado correctamente.`);
          }

        }
        //! if (parametrizacion_Item[0]?.Valor === 'S') casoActualizacionCoberturaPX(trama);
        //! if (esEnvioAMIValido(parametrizacion_Item, trama)) casoActualizacionTelematic(trama);



      });

    } catch (error) {
      log.error("Error en la ejecución del script", error);
      return true
    }
  }

  /*
    * Funciones Auxiliares 
    */
  const obtenerDatosParaImpulso = (dataCobertura) => {
    try {
      // Validaciones iniciales
      if (!dataCobertura) throw new Error("El objeto dataCobertura es nulo o indefinido.");

      // Constantes globales
      const USERNAME = "PxPrTest";
      const PASSWORD = "PX12%09#w";
      const USUARIO_INGRESO = "PRUEBAEVOL";
      const OPERACION_ORDEN = "017";
      const OPERACION_DISPOSITIVO = "A";
      const ORDEN_TRABAJO = "0";
      const PARAMETRO_PRODUCTO = "GPT";

      // Obtener valores de dataCobertura
      const idCobertura = dataCobertura.id;
      const CodigoVehiculo = dataCobertura.getValue('custrecord_ht_co_bien')?.toString() || "";
      const datoTecnico = dataCobertura.getValue('custrecord_ht_co_numeroserieproducto') || "";
      const fechaInicial = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturainicial')) || "";
      const fechaFinal = formatearFecha(dataCobertura.getText('custrecord_ht_co_coberturafinal')) || "";
      if (!fechaFinal) throw new Error("La fecha final no tiene valor.");

      const custrecord_ht_co_producto = dataCobertura.getValue('custrecord_ht_co_producto') || "";
      const estadocobertura = dataCobertura.getValue('custrecord_ht_co_estado_cobertura') || "";
      const Propietario = dataCobertura.getValue('custrecord_ht_co_propietario') || "";
      const PropietarioMonitoreo = dataCobertura.getValue('custrecord_ht_co_clientemonitoreo') || "";

      // Obtener información del cliente
      const infoCliente = dataCliente(Propietario) || {};
      const infoClienteMonitoreo = dataCliente(PropietarioMonitoreo) || {};



      // Obtener fecha actual para el token
      const { year, month, day } = obtenerValoresFechaHoy();

      // Determinar estado de la SIM
      const EstadoSim = estadocobertura === "1" ? "ACT" : estadocobertura === "2" ? "INA" : (() => { throw new Error("Estado de cobertura no válido."); })();

      // Obtener información del bien
      const { CodigoSys } = dataBien(CodigoVehiculo);

      // Obtener información del dato técnico
      const { Vid, CodMarcaDispositivo, CodModeloDispositivo } = dataDatoTecnico(datoTecnico);

      // Retornar la trama de datos
      return {
        // Plataforma PX
        StrToken: `SH2PX${year}${month}${day}`,
        UserName: USERNAME,
        Password: PASSWORD,
        UsuarioIngreso: USUARIO_INGRESO,
        NumeroOrden: ORDEN_TRABAJO,
        FechaInicioCobertura: fechaInicial,
        FechaFinCobertura: fechaFinal,
        OperacionOrden: OPERACION_ORDEN,
        CodigoVehiculo: CodigoSys || CodigoVehiculo,
        Vid,
        CodMarcaDispositivo,
        CodModeloDispositivo,
        EstadoSim,
        OperacionDispositivo: OPERACION_DISPOSITIVO,
        CodigoProducto: custrecord_ht_co_producto,
        IdCobertura: idCobertura,
        IdDatoTecnico: datoTecnico,

        // Plataforma AMI
        clientepropietario: infoCliente?.clientId || "",
        clientemonitoreo: infoClienteMonitoreo?.clientId || infoCliente?.clientId || "",
        codigovehiculo: CodigoVehiculo,
        codigosys: CodigoSys,
        serie: "",
        comando: "",
        ruccompania: "",
        ordentrabajo: ORDEN_TRABAJO,
        sensors: "0",
        cobertura: new Date(fechaFinal).toISOString(),
        producto: "",
        itemNS: custrecord_ht_co_producto,
        ordenservicio: "0",
        usuario: "OPERAD",
        origen: "N",
        parametroproducto: PARAMETRO_PRODUCTO
      };

    } catch (error) {
      log.debug("Error en obtenerDatosParaImpulso", error.message);
      return false;
    }
  };

  const dataBien = (id) => {
    const objData = {
      CodigoSys: ''
    };

    if (!id) return objData;

    try {
      const result = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [["internalid", "anyof", id]],
        columns: ["custrecord_ht_bien_codsysh"]
      }).run().getRange({ start: 0, end: 1 })[0];

      if (result) {
        objData.CodigoSys = result.getValue("custrecord_ht_bien_codsysh") || '';
      }
    } catch (error) {
      log.error("Error en dataBien", error);
    }

    return objData;
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

  const dataCliente = (id) => {
    const emptyClient = { clientId: "" };

    if (!id) return emptyClient;

    try {
      const searchClientInfo = search.lookupFields({
        type: "customer",
        id,
        columns: ['vatregnumber']
      });

      if (!searchClientInfo || !Object.keys(searchClientInfo).length) {
        log.error('getClientInfo', `No se encontró información para el cliente con ID: ${id}`);
        return emptyClient;
      }

      return {
        clientId: searchClientInfo.vatregnumber || ""
      };

    } catch (error) {
      log.error('error-getClientInfo', error.message || error);
      return emptyClient;
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

  const obtenerValoresFechaHoy = () => {
    // Obtener la fecha actual en la zona horaria de Ecuador
    let fechaEcuador = new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" });
    let date = new Date(fechaEcuador);

    let year = date.getFullYear();
    let month = date.getMonth() + 1; // Los meses son indexados desde 0
    let day = date.getDate();

    // Asegurar que siempre sean dos dígitos
    month = month < 10 ? `0${month}` : month;
    day = day < 10 ? `0${day}` : day;

    return { year, month, day };
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

  function casoActualizacionCoberturaLatam(trama, SubsidiariaID) {
    try {
      // let URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; // URL de prueba
      let URLPX ='https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'
      const camposRequeridos = ['IdDatoTecnico', 'codigovehiculo'];

      const camposVacios = camposRequeridos.filter(campo => !trama[campo] || trama[campo] === '');
      if (camposVacios.length > 0) {
        // log.debug("--jsonCobertura--", jsonCobertura)
        log.error('Campos vacíos en jsonCobertura', `Los siguientes campos están vacíos: ${camposVacios.join(', ')}`);
        return true; // Detener el proceso si hay campos vacíos
      }

      log.debug("---trama PX---", {
        "IdDatoTecnico": trama.IdDatoTecnico,
        "SubsidiariaID": SubsidiariaID,
        "URLPX": URLPX,
        "codigovehiculo": trama.codigovehiculo,
        "E": "1",
        "EstadoSim": trama.EstadoSim
      }) // !

      if (trama.EstadoSim != "ACT" && trama.EstadoSim != "INA") {
        log.debug("Estado SIM no válido", trama.EstadoSim)
        return false;
      }

      let procesoPX = _platformController.envioPXActualizacionEstado(trama.IdDatoTecnico, SubsidiariaID, URLPX, trama.codigovehiculo, "1", trama.EstadoSim);

      log.debug("procesoPX", procesoPX);

      if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
        // Generar log Proceso General PX 
        // generarLogCambioEstado(procesoPX.PxAdmin, trama.IdCobertura, 'F', "ProcesoPX");
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
      log.error("Error", { error: error.message, stack: error.stack });

      crearRegistroImpulso(trama?.IdCobertura, "", "", error?.message, 'PX');
    }
  };

  const sysDateTime = () => {
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${rand}_${rand2}`;
  };

  return {
    execute: execute,
  };
});