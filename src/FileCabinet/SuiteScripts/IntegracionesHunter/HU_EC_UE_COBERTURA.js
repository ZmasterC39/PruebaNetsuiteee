/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/*
Creado Por: DAVID ARISTEGA
Fecha: 02/09/2024
Ejecutable: Función principal que se ejecuta según el Evento establecido en NetSuite
Objetivo: Realiza registros pendientes de procesamiento y envía los datos a un API externo para generar la cobertura, Casos: Cortesía, Cobertura, al crear una factura, al Chequear una OT. 
 * Casos de uso:
 * - Cortesía
 * - Cobertura
 * - Creación de una factura
 * - Chequeo de una OT
 */

define([
  "N/record",
  "N/log",
  "N/search",
  "SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController",
  "N/query",
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',
  "N/runtime",
  'N/https',
], function (record, log, search, coberturaController, query, _funcion, _const, runtime, https) {

  const beforeLoad = (context) => {
    // NEW 26/03/2026
    bloquearCamposPorRol(context);
  };

  function beforeSubmit(context) {
    // return
    try {
      const rec = context.newRecord;
      const userId = runtime.getCurrentUser().id;

      if (runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
        return;
      }

      if (!aplicaLogica(rec, userId)) {
        return;
      }

      validarCampo(rec);

    } catch (e) {
      throw e; 

      log.error({
        title: 'Error en beforeSubmit',
        details: e
      });

    }
  }

  
  function afterSubmit(context) {
    let idos, bien, origen, cambioPropietario, flatValidacion = false;
    try {
      const newRecord = context.newRecord;
      const oldRecord = context.oldRecord;
      const recordType = newRecord.type;

      let OrdenServicio = "";
      let Subsidiaria = "";
      let location = "";
      let traindOriginal = "";

      log.debug("Evento", context.type);

      switch (recordType) {
        case "salesorder":

          log.debug("salesorder");

          let BanderaDA = true;
          let EsCortesia = false;
          let DebitoAutomatico = false;
          idos = newRecord.id;
          nameios = newRecord.getValue("tranid");
          bien = newRecord.getValue("custbody_ht_so_bien");
          cambioPropietario = newRecord.getValue("custbody_es_cambio_de_propietario");
          origen = "OS";

          // inicio de B validacion para debito automatico
          let status = newRecord.getValue("status");
          let terms = newRecord.getValue("terms");
          let trandate = newRecord.getValue("trandate");
          let custbody_ht_ec_promocion_da = newRecord.getValue("custbody_ht_ec_promocion_da");

          // if ((status == "Cancelada" || status == "Cerrada") && (terms != "48" && terms != 48)) {
          if ((status == "Cancelada" || status == "Cerrada" || status == "Facturada") && (terms != "48" && terms != 48)) {
            DebitoAutomatico = false;
          } else if ((terms == "48" || terms == 48)) {
            DebitoAutomatico = true;
            BanderaDA = false;
          }

          log.debug("DebitoAutomatico", DebitoAutomatico);

          // fin de validacion para debito automatico

          const validaciontotal = newRecord.getValue("total");
          const cortesia = validaciontotal == 0 && cambioPropietario == false;

          // Logica para Delete
          if (context.type === context.UserEventType.DELETE && !nameios?.toLowerCase()?.startsWith("osp")) {
            // log.debug("Orden de servicio eliminada", oldRecord.id);

            OrdenServicio = oldRecord?.getValue("tranid") || "";
            Subsidiaria = oldRecord?.getValue("subsidiary") || "";
            location = oldRecord?.getValue("location") || "";
            traindOriginal = oldRecord?.getValue("tranid") || "";

            if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
              return;
            }

            createLogRecord({
              idos: oldRecord.id,
              bien: oldRecord.getValue("custbody_ht_so_bien"),
              idOrigen: oldRecord.id,
              origen,
              tipoEventoUsuario: context?.type,
              OrdenServicio,
              Subsidiaria,
              location
            });

            flatValidacion = true;
          }

          // Validación para evitar OSP
          if (!bien || nameios?.toLowerCase()?.startsWith("osp")) {
            // log.debug("No se encuentra la orden de servicio asociada");
            flatValidacion = true;
            return;
          }

          // Lógica para Creación y Edición
          if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.COPY) {
            log.debug("Orden de servicio creada", newRecord.id);

            // try {
            //   let terms = newRecord.getValue("terms");
            //   let oldTerms = oldRecord.getValue("terms");
            //   log.debug("terms", terms);
            //   log.debug("oldTerms", oldTerms);
            // } catch (error) {
            //   log.debug("no encontro terms");
            // }

            OrdenServicio = "";
            Subsidiaria = newRecord?.getValue("subsidiary") || "";
            location = newRecord?.getValue("location") || "";
            traindOriginal = "";

            try {   // ! 15/12/2025  Debito automatico

              if (!DebitoAutomatico || !custbody_ht_ec_promocion_da) throw new Error("No aplica débito automático");

              const dataDebitoAutomatico = coberturaController.obtenerInfDebitoAutomatico(custbody_ht_ec_promocion_da);
              const dataResult = coberturaController.obtenerItemParametrizadoPorBien(idos, bien);

              const procesarCobertura = (item, resultadoCobertura, fechaInicio, fechaFin) => {

                if (!fechaInicio || !fechaFin) return log.debug("No se puede procesar, faltan fechas", {
                  fechaInicio,
                  fechaFin,
                  item
                });

                try {
                  log.debug("Orden de servicio--", newRecord.id);
                  log.debug("LOG Seguimiento", { item, resultadoCobertura, fechaInicio, fechaFin })
                } catch (error) {
                  log.debug("error LG", error)
                }

                const payload = {
                  idbien: item.idbien,
                  familia: item.familiaGrupo,
                  accion: "Update",
                  fechaInicio,
                  tipocobertura: "1",
                  unidadcobertu: "meses",
                  fechafin: fechaFin,
                  concepto: 19,
                  idOrdenServicio: idos
                };

                const response = coberturaController.makeApiRequest(
                  payload,
                  "customdeploy_hu_ec_rs_in_coberturas",
                  "customscript_hu_ec_rs_in_coberturas",
                  "POST",
                  false
                );

                log.debug("Cobertura generada/update DA", response);
              };

              dataResult?.forEach(result => {
                result.items?.forEach(item => {
                  const resultadoCobertura = coberturaController.obtenerCoberturaVehiculoFamilia(item.idbien, item.valorfamilia);

                  if (!resultadoCobertura?.coberturaInicial || !resultadoCobertura?.coberturaFinal) {
                    return log.debug("Faltan datos mínimos de cobertura", resultadoCobertura);
                  }

                  // Formatear fecha inicial (común para todos los casos)
                  let fechaInicio = formatearFecha(resultadoCobertura.coberturaInicial);

                  // Caso 1: Suspensión (usa fecha expr1)
                  if (resultadoCobertura.estadoCobertura == 2 || resultadoCobertura.estadoCobertura == "2") {

                    fechaInicio = formatearFecha(trandate);

                    const fechaFin = (dataDebitoAutomatico?.expr1 &&
                      dataDebitoAutomatico?.custrecord_ht_pp_codigo &&
                      item.idbien && idos && trandate)
                      ? formatearFecha(dataDebitoAutomatico.expr1)
                      : "";

                    return procesarCobertura(item, resultadoCobertura, fechaInicio, fechaFin);
                  }

                  // Caso 2: Cobertura Activa (determinar la fecha mayor)
                  if (resultadoCobertura.estadoCobertura == 1 || resultadoCobertura.estadoCobertura == "1") {

                    const fechaOS = formatearFecha(trandate);
                    const fechaFinCob = formatearFecha(resultadoCobertura.coberturaFinal);
                    const fechaFin = obtenerFechaMayor(fechaFinCob, fechaOS, "2", "1"); // 17/12/2025

                    return procesarCobertura(item, resultadoCobertura, fechaInicio, fechaFin);
                  }

                });
              });

            } catch (error) {
              log.error("Error al generar la cobertura por débito automático", error);
            }

          } else if (context.type === context.UserEventType.EDIT) {
            // log.debug("Orden de servicio editada", newRecord.id);
            // log.debug("Orden de servicio anterior", oldRecord.id);

            OrdenServicio = newRecord?.getValue("tranid") || "";
            Subsidiaria = newRecord?.getValue("subsidiary") || "";
            location = newRecord?.getValue("location") || "";
            traindOriginal = newRecord?.getValue("tranid") || "";
          } else {
            try {
              // log.debug("Evento no identificado", context.type);
              OrdenServicio = newRecord?.getValue("tranid") || "";
              Subsidiaria = newRecord?.getValue("subsidiary") || "";
              location = newRecord?.getValue("location") || "";
              traindOriginal = newRecord?.getValue("tranid") || "";

              if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
                return;
              }

              createLogRecord({
                idos: newRecord.id,
                bien: newRecord.getValue("custbody_ht_so_bien"),
                idOrigen: newRecord.id,
                origen,
                tipoEventoUsuario: context?.type,
                OrdenServicio,
                Subsidiaria,
                location
              });

              flatValidacion = true;
            } catch (error) {
              // log.debug("Error al identificar evento orden servicio", error);
              flatValidacion = true;
            }
          }

          break;

        case "invoice":
          try {
            let recordId = newRecord.id;
            // log.debug("Identificador Invoice", recordId);

            let searchResult = search.lookupFields({
              type: recordType,
              id: recordId,
              columns: ['custbody_ec_estado_de_autorizaci']
            });
            let busquedatemp = searchResult?.custbody_ec_estado_de_autorizaci || "";

            // log.debug("Estado de autorización", busquedatemp);
            if (busquedatemp == "SIN DECLARAR" || "") {
              // log.debug("Continua el Flujo")
            } else {
              // log.debug("---No se impulsa---");
              flatValidacion = true;
              return;
            }

          } catch (error) {
            log.error("Error al obtener estado de autorización", error);
          }

          idos = newRecord.getValue("createdfrom") || 0;
          bien = newRecord.getValue("custbody_ht_so_bien") || 0;
          origen = "FAC";
          let termsFact = oldRecord?.getValue("terms") || 0;

          // Lógica para Creación
          if (context.type == context.UserEventType.CREATE) {
            // log.debug("Factura creada", newRecord);

            OrdenServicio = newRecord?.getValue("createdfrom") || "";
            Subsidiaria = newRecord?.getValue("subsidiary") || "";
            location = newRecord?.getValue("location") || "";
            traindOriginal = newRecord?.getValue("tranid") || "";

            if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
              return;
            }

            let cortesia = esCortesiaOS(idos);
            if ((termsFact != 48 || termsFact != "48") && (cortesia != true)) { // Validación para cortesía
            }

          }
          // Lógica para Edición
          else if (context.type == context.UserEventType.EDIT) {
            // log.debug("Factura editada", newRecord.id);
            // log.debug("Factura anterior", oldRecord.id);
            let estadoINNuevo = newRecord?.getValue("status");
            let estadoINAnterior = oldRecord?.getValue("status");

            OrdenServicio = newRecord?.getValue("createdfrom") || "";
            Subsidiaria = newRecord?.getValue("subsidiary") || "";
            location = newRecord?.getValue("location") || "";
            traindOriginal = newRecord?.getValue("tranid") || "";

            if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
              return;
            }

          }
          // Lógica para Eliminación
          else if (context.type == context.UserEventType.DELETE) {
            try {

              OrdenServicio = oldRecord?.getValue("createdfrom") || "";
              Subsidiaria = oldRecord?.getValue("subsidiary") || "";
              location = oldRecord?.getValue("location") || "";
              traindOriginal = oldRecord?.getValue("tranid") || "";

              if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
                return;
              }

              createLogRecord({
                idos: oldRecord?.getValue("createdfrom") || 0,
                bien: oldRecord?.getValue("custbody_ht_so_bien") || 0,
                idOrigen: oldRecord.id,
                origen,
                tipoEventoUsuario: context?.type,
                OrdenServicio,
                Subsidiaria,
                location,
                traindOriginal
              });
            } catch (error) {
              log.error("Error al eliminar factura", error);

            }
          } else {
            try {

              OrdenServicio = oldRecord?.getValue("createdfrom") || "";
              Subsidiaria = oldRecord?.getValue("subsidiary") || "";
              location = oldRecord?.getValue("location") || "";
              traindOriginal = oldRecord?.getValue("tranid") || "";

              if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
                return;
              }

              createLogRecord({
                idos: oldRecord?.getValue("createdfrom") || 0,
                bien: oldRecord?.getValue("custbody_ht_so_bien") || 0,
                idOrigen: oldRecord?.id || 0,
                origen,
                tipoEventoUsuario: context?.type,
                OrdenServicio,
                Subsidiaria,
                location,
                traindOriginal
              });

              // log.debug("Evento no identificado se guardo", context?.type);
              flatValidacion = true;

            } catch (error) {
              log.debug("Error al identificar evento", error);
              flatValidacion = true;
            }
          }

          break;

        case "customrecord_ht_record_ordentrabajo":

          idos = newRecord.getValue("custrecord_ht_ot_orden_servicio");
          bien = newRecord.getValue("custrecord_ht_ot_vehiculo");
          let itemOT = newRecord.getValue("custrecord_ht_ot_item");
          origen = "OT";

          let Estado_OT_Ins = "";

          if (!bien || !idos) {
            // log.debug("No se encuentra la orden de servicio asociada o bien asociado");
            flatValidacion = true;
          }

          // Lógica para Creación
          if (context.type === context.UserEventType.CREATE) {
            // log.debug("Orden de trabajo creada", newRecord.id);

            OrdenServicio = newRecord?.getValue("custrecord_ht_ot_orden_servicio") || "";
            Subsidiaria = newRecord?.getValue("custrecord_ht_ot_subsidiaria") || ObtenerSubsidiariaId(idos);
            location = newRecord?.getValue("custrecord_ht_ot_taller") || "";
            traindOriginal = newRecord?.getValue("name") || "";

            // NEW 
            Estado_OT_Ins = newRecord.getValue("custrecord_ht_ot_estado") || "";

          }
          // Lógica para Edición
          else if (context.type === context.UserEventType.EDIT) {
            // log.debug("Orden de trabajo editada", newRecord.id);

            OrdenServicio = newRecord?.getValue("custrecord_ht_ot_orden_servicio") || "";
            Subsidiaria = newRecord?.getValue("custrecord_ht_ot_subsidiaria") || ObtenerSubsidiariaId(idos);
            location = newRecord?.getValue("custrecord_ht_ot_taller") || "";
            traindOriginal = newRecord?.getValue("name") || "";
            log.debug("traindOriginal", traindOriginal)

            // NEW
            Estado_OT_Ins = newRecord.getValue("custrecord_ht_ot_estado") || "";

          }
          // Lógica para Eliminación
          else if (context.type === context.UserEventType.DELETE) {

            OrdenServicio = oldRecord?.getValue("custrecord_ht_ot_orden_servicio") || "";
            Subsidiaria = oldRecord?.getValue("custrecord_ht_ot_subsidiaria") || ObtenerSubsidiariaId(idos);
            location = oldRecord?.getValue("custrecord_ht_ot_taller") || "";
            traindOriginal = oldRecord?.getValue("name") || "";

            // OLD
            Estado_OT_Ins = oldRecord?.getValue("custrecord_ht_ot_estado") || "";

            try {

              if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
                return;
              }

              createLogRecord({
                idos: oldRecord?.getValue("custrecord_ht_ot_orden_servicio") || 0,
                bien: oldRecord?.getValue("custrecord_ht_ot_vehiculo") || 0,
                idOrigen: oldRecord.id,
                origen,
                tipoEventoUsuario: context?.type,
                OrdenServicio,
                Subsidiaria,
                location,
                traindOriginal
              });

            } catch (error) {
              log.error("Error al eliminar orden de trabajo", error);
            }

          }

          // Opcion para actualizar cobertura al chequear OT  
          // 16/01/2026
          try {
            actualizarCoberturaDesdeOT(Estado_OT_Ins, context, itemOT, bien, newRecord, OrdenServicio);
          } catch (error) {
            log.debug("error new ot", error);
          }

          break;

        case "customerpayment":
          try {
            let paymentRecord = context.newRecord;

            // Iterar sobre las facturas relacionadas
            let lineCount = paymentRecord.getLineCount({ sublistId: 'apply' });
            let InfFactura = {};

            log.debug("lineCount", lineCount);

            for (let i = 0; i < lineCount; i++) {
              var isApplied = paymentRecord.getSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i
              });

              if (isApplied) {
                let invoiceId = paymentRecord.getSublistValue({
                  sublistId: 'apply',
                  fieldId: 'internalid',
                  line: i
                });
                // log.debug("Factura ID", invoiceId);

                // log.debug ("Factura Inf",obtenerInfFacturaPago(invoiceId))
                InfFactura = obtenerInfFacturaPago(invoiceId);

                let SubsidiariaPY = paymentRecord.getValue('subsidiary');
                let locationPY = paymentRecord.getValue('location');
                origen = 'PC';

                if (InfFactura.idos != "") {
                  createLogRecord({
                    idos: InfFactura.idos,
                    bien: InfFactura.bien,
                    idOrigen: paymentRecord.id,
                    origen: origen,
                    tipoEventoUsuario: context?.type,
                    OrdenServicio: InfFactura.idos,
                    Subsidiaria: SubsidiariaPY,
                    location: locationPY,
                  });
                }

              }
            }

          } catch (error) {
            log.error("Error customerpayment", { error: error.error, stack: error.stack });
          }

          flatValidacion = true;
          break;
      }

      if (flatValidacion) {
        // log.debug("No se impulsa Guardado, falta de datos");
        return;
      }

      // log.debug("S-",Subsidiaria )
      if ((Subsidiaria == 3) || (Subsidiaria == "3")) {
        return;
      }

      const logRecordId = createLogRecord({
        idos,
        bien,
        idOrigen: newRecord.id,
        origen,
        tipoEventoUsuario: context?.type,
        OrdenServicio,
        Subsidiaria,
        location,
        traindOriginal
      });

      // log.debug("Registro de log creado", "ID: " + logRecordId);
    } catch (error) {
      log.error("Error afterSubmit", { error: error.error, stack: error.stack });
    }
  }

  function createLogRecord({ idos, bien, idOrigen, origen, tipoEventoUsuario, OrdenServicio, Subsidiaria, location, traindOriginal }) {
    let subsidiary;
    try {

      if (idos && tipoEventoUsuario != "delete") {
        subsidiary = ObtenerSubsidiariaId(idos);
        if ((subsidiary == 3) || (subsidiary == "3")) {
          log.error("Error al obtener subsidiaria");
          return 0;
        }
      }

      if (origen == "FAC" && !idos) {
        try {
          // log.error("Error al crear log", "Falta dato idOS");

          let dataFacInt = obtenerInfFacturaInterna(idOrigen);
          // log.debug("dataFacInt", dataFacInt)

          if (dataFacInt.length > 0) {

            log.debug("FI", { idos, bien, idOrigen, origen, tipoEventoUsuario, OrdenServicio, Subsidiaria, location, traindOriginal });

            for (let i = 0; i < dataFacInt.length; i++) {
              if (dataFacInt[i].custrecord_orden_servicio) {
                const logRecord = record.create({
                  type: "customrecord_ven_orden_servicio_log",
                  isDynamic: true,
                });

                logRecord.setValue("custrecord_id_os", dataFacInt[i].custrecord_orden_servicio);
                logRecord.setValue("custrecord_id_bien", bien);
                logRecord.setValue("custrecord_id_origen", dataFacInt[i].custrecord_nro_factura_interna);
                logRecord.setValue("custrecord_origen", "FI");
                logRecord.setValue("custrecord_procesado", "F");
                logRecord.setValue("custrecord_impulso", 0);
                logRecord.setValue("custrecord_tipoeventousuario", tipoEventoUsuario);
                logRecord.setValue("custrecord_orden_servicio_name", OrdenServicio);
                logRecord.setValue("custrecord_subsidiaria", Subsidiaria);
                logRecord.setValue("custrecord_localidad", location);
                logRecord.setValue("custrecord_original_nombre", traindOriginal);

                logRecord.save({
                  enableSourcing: false,
                  ignoreMandatoryFields: true,
                });
                // log.debug("auss", auss)
              }
            }
          } else {
            return 0;
          }
        } catch (error) {
          log.error("Error al crear log de factura interna", error);
          return 0;
        }
      }

      if (!idos || !bien && origen != "FAC") {
        log.error("Error al crear log", "Faltan datos");
        return 0;
      }

      const logRecord = record.create({
        type: "customrecord_ven_orden_servicio_log",
        isDynamic: true,
      });

      logRecord.setValue("custrecord_id_os", idos);
      logRecord.setValue("custrecord_id_bien", bien);
      logRecord.setValue("custrecord_id_origen", idOrigen);
      logRecord.setValue("custrecord_origen", origen);
      logRecord.setValue("custrecord_procesado", "F");
      logRecord.setValue("custrecord_impulso", 0);
      logRecord.setValue("custrecord_tipoeventousuario", tipoEventoUsuario);
      logRecord.setValue("custrecord_orden_servicio_name", OrdenServicio);
      logRecord.setValue("custrecord_subsidiaria", Subsidiaria);
      logRecord.setValue("custrecord_localidad", location);
      logRecord.setValue("custrecord_original_nombre", traindOriginal);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
    } catch (error) {
      log.error("Error al crear log", error);
      return 0;
    }
  }

  const ObtenerSubsidiariaId = (id) => {
    try {

      if (!id) return 3;

      // log.debug("ObtenerSubsidiariaId", id);
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["internalid", "anyof", id]
        ],
        columns: [
          { name: "subsidiary", label: "Subsidiaria" }
        ],
      });

      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 1 });
      let respuesta = null;

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach((result) => {
          respuesta = result.getValue({ name: "subsidiary" });
        });
      });

      // log.debug("ObtenerSubsidiariaId", respuesta);

      return respuesta || 3; // Si no hay valor, retorna 3
    } catch (e) {
      log.error("Error en ObtenerSubsidiariaId", e);
      return 3; // Valor predeterminado en caso de error
    }
  };

  const esCortesiaOS = (IdOs) => {
    try {

      if ((!IdOs) || (IdOs == 0)) return true;

      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["internalid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", "2"],
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "total" }),
        ],
      });

      let searchResult = serviceOrderSearch.run().getRange({ start: 0, end: 1 });

      if (searchResult.length > 0) {
        if (searchResult[0].getValue({ name: "total" }) == ".00") {
          return true
        } else {
          return false
        }
      } else {
        return false;
      }
    } catch (error) {
      log.debug("error", error);
      return false;
    }
  }

  // 22/11/2024
  const obtenerInfFacturaInterna = (idFactura) => {
    try {

      if (!idFactura) { return []; }

      let sqlQuery = `
          SELECT  
              custrecord_nro_factura_interna, 
              custrecord_orden_servicio,
              'FI' AS Tag
          FROM     
              customrecord_ht_fact_internas_asociadas
          WHERE    
              isinactive = 'F'
          AND      
              custrecord_nro_factura = ${idFactura}
          `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }

        if (results.length > 0) {
          return results;
        } else {
          return []
        }
      }

    } catch (error) {
      log.error("Error obtenerInfFacturaInterna", { error: error.message, stack: error.stack });
      return [];
    }
  };

  //05/12/2024
  const obtenerInfFacturaPago = (id) => {
    try {
      // Crear la búsqueda
      let busqueda = search.create({
        type: "transaction",
        filters: [
          ["internalid", "anyof", id]
        ],
        columns: [
          search.createColumn({ name: "createdfrom", label: "ID_OS" }),
          search.createColumn({ name: "custbody_ht_so_bien", label: "ID_BIEN" }),
        ]
      });

      // Ejecutar la búsqueda y obtener el rango
      let savedsearch = busqueda.run().getRange(0, 1);

      // Validar si hay resultados
      if (savedsearch.length > 0) {
        // Crear el objeto con los resultados
        let result = savedsearch[0];
        return {
          idos: result.getValue(busqueda.columns[0]),
          bien: result.getValue(busqueda.columns[1]),
        };
      } else {
        return { "idos": "", "bien": "" }; // Sin resultados
      }

    } catch (e) {
      log.error('Error en obtenerInfFacturaPago', e);
      return { "idos": "", "bien": "" }; // Devolver objeto vacío en caso de error
    }
  };

  // 16/10/2024
  const formatearFecha = (fecha) => {
    try {

      log.debug('fecha', fecha);

      if (!fecha) {
        return false;
      }

      // Si la fecha es un objeto de tipo Date (en lugar de cadena), la convertimos a ISO string
      if (fecha instanceof Date) {
        fecha = fecha.toISOString();
      } else {
        // Convertir la fecha a cadena para asegurarnos de que tenga el método `includes`
        fecha = String(fecha);
      }

      let dia, mes, anio;

      // Si la fecha contiene "T", asumimos que es formato ISO y la procesamos manualmente
      if (fecha.includes('T')) {
        // Extraemos la parte de la fecha del formato ISO (yyyy-mm-ddTHH:mm:ss.sssZ)
        const partesFechaISO = fecha.split('T')[0].split('-');
        if (partesFechaISO.length !== 3) {
          throw new Error('Formato de fecha ISO inválido');
        }
        [anio, mes, dia] = partesFechaISO; // yyyy, mm, dd
      } else {
        // Caso de formato dd/mm/yyyy
        const partesFecha = fecha.split('/');
        if (partesFecha.length !== 3) {
          throw new Error('Formato de fecha dd/mm/yyyy inválido');
        }
        [dia, mes, anio] = partesFecha; // dd, mm, yyyy
      }

      // Retornar fecha en formato yyyy/mm/dd
      return `${anio}/${mes}/${dia}`;
    } catch (error) {
      // Manejo de errores
      log.error('Error al formatear la fecha', error.message);
      return null;
    }
  };

  // function obtenerFechaMayor(fechaA, fechaB) {
  //   if (!fechaA) return fechaB;
  //   if (!fechaB) return fechaA;

  //   // Convertir a fecha
  //   let a = new Date(fechaA);
  //   let b = new Date(fechaB);

  //   // Elegir la mayor
  //   let mayor = (a > b) ? a : b;

  //   // Sumar 1 mes
  //   mayor.setMonth(mayor.getMonth() + 1);

  //   // Ajuste si el mes no tiene el mismo día (ej. 30 → 28)
  //   if (mayor.getDate() !== ((a > b) ? a : b).getDate()) {
  //     mayor.setDate(0);
  //   }

  //   // Retornar formateada YYYY/MM/DD
  //   return mayor.toISOString().slice(0, 10).replace(/-/g, "/");
  // }

  function obtenerFechaMayor(fechaA, fechaB, tipoplazo, cantidad) {

    if (!fechaA) return fechaB;
    if (!fechaB) return fechaA;

    // Convertir a Date
    let a = new Date(fechaA);
    let b = new Date(fechaB);

    // Elegir la mayor
    let mayor = (a > b) ? a : b;

    // Guardamos el día original para ajustar después
    const diaOriginal = mayor.getDate();

    // ===== SUMAR PLAZO =====
    switch (String(tipoplazo)) {
      case "1": // Años
        mayor.setFullYear(mayor.getFullYear() + Number(cantidad));
        break;

      case "2": // Meses
        mayor.setMonth(mayor.getMonth() + Number(cantidad));
        break;

      case "3": // Días
        mayor.setDate(mayor.getDate() + Number(cantidad));
        break;
    }

    // ===== Ajustar día si el mes no tiene ese día (caso 31 o 30 → Febrero, etc.) =====
    if (mayor.getDate() !== diaOriginal && (tipoplazo === "2" || tipoplazo === 2)) {
      mayor.setDate(0); // Va al último día del mes anterior, que es el correcto
    }

    // ===== Formatear YYYY/MM/DD =====
    return mayor.toISOString().slice(0, 10).replace(/-/g, "/");
  }


  // const obtenerParametrizacionItem = (items, busquedaParametro) => {
  //   try {
  //     let data = [];
  //     for (let i = 0; i < busquedaParametro.length; i++) {

  //       if (!items || !busquedaParametro[i]) {
  //         log.debug("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
  //         return [];
  //       }

  //       let filtro = [
  //         ["custrecord_ht_pp_parametrizacionid", "is", items],
  //         "AND",
  //         ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
  //       ];

  //       let busqueda = search.create({
  //         type: "customrecord_ht_pp_main_param_prod",
  //         filters: filtro,
  //         columns: [
  //           search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
  //           search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
  //           search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
  //           search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
  //         ],
  //       });

  //       let resultCount = busqueda.runPaged().count;

  //       if (resultCount > 0) {
  //         let pageData = busqueda.runPaged({ pageSize: 1 });
  //         pageData.pageRanges.forEach((pageRange) => {
  //           let page = pageData.fetch({ index: pageRange.index });
  //           page.data.forEach((result) => {
  //             let columns = result.columns;
  //             let parametrizacion = {
  //               Param: result.getValue(columns[2]) || "",
  //               ParamId: result.getValue(columns[0]) || "",
  //               Valor: result.getValue(columns[3]) || "",
  //               ValorText: result.getText(columns[1]) || "",
  //               ValorId: result.getValue(columns[1]) || "",
  //             };
  //             data.push(parametrizacion);
  //           });
  //         });
  //       } else {
  //         data.push({
  //           Param: "",
  //           ParamId: "",
  //           Valor: "",
  //           ValorText: "",
  //           ValorId: "",
  //         });
  //       }
  //     }
  //     return data;
  //   } catch (error) {
  //     log.error("Error", { error: error.message, stack: error.stack });
  //     return []
  //   }
  // };

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
            search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela" }),
            search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor" }),
            search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA" }),
            search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR" }),
          ],
        });

        // 👉 Trae solo el PRIMER resultado
        let results = busqueda.run().getRange({ start: 0, end: 1 });

        if (results.length > 0) {
          let r = results[0];
          let c = r.columns;

          data.push({
            Param: r.getValue(c[2]) || "",
            ParamId: r.getValue(c[0]) || "",
            Valor: r.getValue(c[3]) || "",
            ValorText: r.getText(c[1]) || "",
            ValorId: r.getValue(c[1]) || "",
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
      return [];
    }
  };


  function enviarDatosAPIExterna(data, registroID) {
    try {
      if (data == []) {
        return false;
      }

      const token = _funcion.loginGetToken();
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      function toQueryString(obj) {
        return Object.keys(obj)
          .map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]);
          })
          .join("&");
      }

      const queryString = toQueryString(data);

      const options = {
        method: "GET",
        url: _const.URLS.HUNTER_API_NETSUITE + "/OrdenServicio/DispositivoKite?" + queryString,
        headers: headers
      };

      log.debug("Opciones de la API externa--", options);
      // return
      const response = https.get(options);

      log.debug("Respuesta de la API externa", response);

      let temporal = false
      let temporal2 = false

      if (response && response.body != "") {
        temporal = JSON.parse(response.code);
        temporal2 = JSON.parse(response.body);
      }

      log.debug("temporal2", temporal2)

      if (temporal && temporal === 200) {
        // log.debug("Respuesta de l-a API externa", temporal);
        // log.debug("temporal2?.mensaje", temporal2?.mensaje);

        if (temporal2?.mensaje == "Grabado con exito") {
          log.debug("Grabado con exito", temporal2?.mensaje);
          GenerarLogCambioEstado(data, response, 'T', 'Dispositivo_Kite', registroID);
          return true;
        }

        return true;

      } else {

        GenerarLogCambioEstado(data, response, 'F', 'Dispositivo_Kite', registroID);
        log.debug("Error en la- respuesta de la API externa", response);
        return false;
      }
    } catch (error) {
      log.debug("error", error)
      return false;
    }
  }


  function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste, registroID) {
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

  /**
 * Retorna true si existe un registro que cumple los criterios.
 * Retorna false si NO existe.
 */
  function validarChaserPorName(nameBuscado, bien) {
    try {


      if (!nameBuscado || nameBuscado == "" || nameBuscado == null) {
        return false;
      }

      var searchObj = search.create({
        type: "customrecord_ht_record_mantchaser",
        filters: [
          ["custrecord_ht_mc_subsidiaria", "anyof", "2"],
          "AND",
          ["name", "haskeywords", nameBuscado],
          "AND",
          ["custrecord_ht_mc_vehiculo", "anyof", bien],
          "AND",
          ["custrecord_ht_mc_operadora", "anyof", "5", "111", "114", "110", "112", "113"],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "internalid" }) // solo necesitamos 1 campo
        ]
      });

      // Solo revisar si existe al menos 1
      var count = searchObj.runPaged().count;

      return count > 0;

    } catch (e) {
      log.error("Error en validarChaserPorName", e);
      return false;
    }
  }

  function consultaCoberturaOT(IdVehiculo, idfamilia) {
    let results = [];

    try {
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", "2"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),
        ],
      });

      let searchResult = CoberturaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
            clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
            bien: result.getValue({ name: "custrecord_ht_co_bien" }),
            producto: result.getValue({ name: "custrecord_ht_co_producto" }),
            coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
          });
        });
      });

      return results;

    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  function actualizarCoberturaDesdeOT(Estado_OT_Ins, context, itemOT, bien, newRecord, OrdenServicio) {
    try {
      const esEstadoChequeada = (Estado_OT_Ins === "2" || Estado_OT_Ins === 2);
      const noEsDelete = context.type !== context.UserEventType.DELETE;
      const fechaOt = newRecord.getValue('custrecord_ht_ot_fecha_asignacion') || null;
      const nameOTOS = newRecord.getValue('custrecord_ht_ot_orden_serivicio_txt') || OrdenServicio || "";

      // Si la OT se encuentra en estado Chequeada
      if (esEstadoChequeada && noEsDelete && itemOT && fechaOt && nameOTOS) {

        const dataparametro = obtenerParametrizacionItem(itemOT, ['FAM', 'ADP']);
        const tieneFamilia = dataparametro.length > 0 && dataparametro[0]?.ValorId;
        const adpValido = dataparametro[1]?.Valor == "001" || dataparametro[1]?.Valor == "003";

        // Validar familia y ADP
        if (tieneFamilia && adpValido) {

          const idFamilia = dataparametro[0].ValorId;
          const infCoberura = consultaCoberturaOT(bien, idFamilia);

          // Iterar infCobertura
          for (let i = 0; i < infCoberura.length; i++) {
            const cobertura = infCoberura[i];

            // Actualizar Cobertura
            try {
              const coberturaRecordId = record.submitFields({
                type: 'customrecord_ht_co_cobertura',
                id: cobertura.id,
                values: {
                  custrecord_ht_fecha_instalacion: new Date(fechaOt),
                  custrecord_ht_os_instalacion: nameOTOS,
                  // custrecord_ht_os_instalacion: OrdenServicio
                },
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              });
              log.debug("Cobertura actualizada desde OT", coberturaRecordId);
            } catch (error) {
              log.debug("Error al actualizar cobertura desde OT", error);
            }

          }
        }
      }

    } catch (error) {
      log.debug("error new ot", error);
    }
  }

  const bloquearCamposPorRol = (context) => {
    try {

      log.debug("context.newRecord", context.newRecord)


      if (context.type !== context.UserEventType.EDIT &&
        context.type !== context.UserEventType.VIEW) return;

      const rec = context.newRecord;


      // Solo aplicar a Sales Order e Invoice
      const tiposPermitidos = ['salesorder', 'invoice'];
      if (!tiposPermitidos.includes(rec.type)) return;

      const form = context.form;
      const subsidiaria = rec.getValue({ fieldId: 'subsidiary' });

      // Solo aplica para subsidiaria 2
      if (subsidiaria != 2) return;

      // Roles permitidos - 3 Administrador; 1894 EC Desarrollo TI;  1785 EC GERENTE DE CARTERA; 1811 EC - Administrador

      const rolesPermitidos = [3, 1894, 1785, 1811, 1015];
      const rolActual = runtime.getCurrentUser().role;

      log.debug("rolActual", rolActual)

      // Si tiene permiso → no hacer nada
      if (rolesPermitidos.includes(rolActual)) return;

      // Campos a bloquear
      const campos = [
        'custbody_ht_os_ejecutiva_backoffice',
        'salesrep',
        'custbody_ht_os_ejecutivareferencia'
      ];

      campos.forEach(idCampo => {
        let campo = form.getField({ id: idCampo });
        if (campo) {
          campo.updateDisplayType({
            displayType: 'disabled'
          });
        }
      });

    } catch (error) {
      log.debug('Error bloquearCamposPorRol', error);
    }
  };


  
  /**
   * Determina si la lógica de validación aplica para este registro
   * 
   * Aplica si:
   * - Usuario NO es 449 Y
   * - Type es salesorder Y
   * - Formulario es 142 Y
   * - Subsidiaria es 2 Y
   * - Total es mayor a 0
   * 
   * @param {Record} record - El registro a validar
   * @param {number} userId - ID del usuario actual
   * @returns {boolean} true si aplica la validación
   */
  function aplicaLogica(rec, userId) {
    try {
      var esUser449 = (userId == 449);
      var esSalesOrder = (rec.type === 'salesorder');
      var formulario = rec.getValue({ fieldId: 'customform' });
      var esFormulario142 = (formulario == 142 || formulario === '142');
      var subsidiaria = rec.getValue({ fieldId: 'subsidiary' });
      var esSubsidiaria2 = (subsidiaria == 2 || subsidiaria === '2');
      var total = rec.getValue({ fieldId: 'total' });
      var totalMayorACero = (total && total > 0);

      // Log para debugging
      log.debug({
        title: 'Evaluación de condiciones',
        details: {
          usuario: userId,
          esUser449: esUser449,
          esSalesOrder: esSalesOrder,
          formulario: formulario,
          esFormulario142: esFormulario142,
          subsidiaria: subsidiaria,
          esSubsidiaria2: esSubsidiaria2,
          total: total,
          totalMayorACero: totalMayorACero
        }
      });

      // Aplicar lógica: debe cumplir TODOS los criterios
      var resultado = !esUser449 &&
        esSalesOrder &&
        esFormulario142 &&
        esSubsidiaria2 &&
        totalMayorACero;

      log.debug({
        title: 'Resultado de aplicaLogica',
        details: 'Aplica validación: ' + resultado
      });

      return resultado;

    } catch (error) {
      log.error({
        title: 'Error en aplicaLogica',
        details: error.toString()
      });
      return false; // Si hay error, no aplicar validación
    }
  }

  /**
   * Valida que el campo custbody_os_nota_para_caja no esté vacío
   * Lanza error si está vacío
   * 
   * @param {Record} record - El registro a validar
   * @throws {Error} Si el campo está vacío
   */
  function validarCampo(rec) {
    try {
      var valor = rec.getValue({
        fieldId: 'custbody_os_nota_para_caja'
      });

      log.debug({
        title: 'Validando custbody_os_nota_para_caja',
        details: 'Valor del campo: ' + (valor || '[VACÍO]')
      });

      // Validar que no esté vacío
      if (!valor || (typeof valor === 'string' && valor.trim() === '')) {
        throw new Error('El campo "NOTA PARA CAJA" es obligatorio para esta Orden de Venta');
      }

      log.debug({
        title: 'Validación exitosa',
        details: 'Campo completado: ' + valor
      });

    } catch (error) {
      log.error({
        title: 'Error en validarCampo',
        details: error.toString()
      });
      throw error; // Re-lanzar para que NetSuite muestre el mensaje al usuario
    }
  }
  
  return {
    beforeLoad,
    afterSubmit: afterSubmit,
  };
});
