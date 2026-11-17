/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
**/

define(['N/log', 'N/search', 'N/record', 'N/https', 'N/query', 'N/file', 'N/runtime', 'N/ui/serverWidget', 'N/format',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION',
  'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES',],
  (log, search, record, https, query, file, runtime, serverWidget, format, coberturaController, _funcion, _const) => {

    const onAction = (context) => {
      try {

        // log.debug("Se ejecutó desde un WorkflowActionScript");
        const currentRecord = context.newRecord;

        const infoUsuario = ValidarEjecucion(runtime.getCurrentUser());
        if (!infoUsuario.permiso) return true;

        log.debug("currentRecord", currentRecord)
        
        const ht_dato_tecnico_ID = currentRecord.id;
        let sendCoberura = BloqueActualizacionCoberturaDatoTecnico(ht_dato_tecnico_ID, currentRecord);

        // if (runtime.getCurrentUser().id == 468332) {
        //   log.debug("Ejecución detenida: usuario no permitido");
        //   return true;
        // }

        if (sendCoberura && sendCoberura.length > 0) {
          EnvioLoteCobertura(sendCoberura, ht_dato_tecnico_ID);
        } else {
          BloqueInactivo(currentRecord, context.type);
        }

      } catch (error) {
        log.debug("Error en onAction", error);
        return true;
      }
    };

    /*
    * Funciones Adicionales
    */
    function ValidarEjecucion(datos) {
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
    }

    function BloqueInactivo(record, actionType) {
      if (!record.getValue("isinactive")) return;

      let dataRegistroInactivoDT = ObtenerInfDatosTecnicos({ post: "Ina", id: record.id }) || {};

      if (!Object.keys(dataRegistroInactivoDT).length) return true; // Detener el proceso si el objeto está vacío

      Object.assign(dataRegistroInactivoDT, {
        fecha: ObtenerFechaEcuador(),
        id_usuario: (runtime?.getCurrentUser()?.id || 0).toString(),
        accion: actionType,
        cliente_Identificacion: IdentificacionCliente({ codigocliente: dataRegistroInactivoDT.cliente_ID }),
      });

      log.debug("Data del registro inactivo", dataRegistroInactivoDT);

      EnviarDatosAPIExternaDatoTecnico(dataRegistroInactivoDT);
    }

    function ObtenerInfDatosTecnicos(ObjDatoTecnico) {
      try {

        // log.debug("ObjDatoTecnico", ObjDatoTecnico);

        if (!ObjDatoTecnico?.id) {
          log.error('Error', 'ID del registro no proporcionado');
          return;
        }

        // Realizar una búsqueda guardada para obtener los registros
        const mySearch = search.create({
          type: 'customrecord_ht_record_mantchaser',
          filters: [
            ['internalid', 'is', ObjDatoTecnico?.id],
            "AND",
            ["custrecord_ht_mc_subsidiaria", "anyof", "2"],
          ],
          columns: [
            // Informacion General
            // internalid
            search.createColumn({ name: "internalid", label: "ID" }),
            search.createColumn({ name: "name", label: "Fecha" }),
            search.createColumn({ name: "custrecord_ht_mc_enlace", label: "Enlace" }),
            search.createColumn({ name: "custrecord_ht_mc_ubicacion", label: "Ubicación" }),
            search.createColumn({ name: "custrecord_ht_mc_vehiculo", label: "Vehículo" }),
            search.createColumn({ name: "isinactive", label: "Inactivo" }),

            // Dispositivo Chaser
            search.createColumn({ name: "custrecord_ht_mc_seriedispositivo", label: "Dispositivo" }),
            search.createColumn({ name: "custrecord_ht_mc_modelo", label: "Modelo" }),
            search.createColumn({ name: "custrecord_ht_mc_imei", label: "IMEI" }),
            search.createColumn({ name: "custrecord_ht_mc_firmware", label: "Firmware" }),

            search.createColumn({ name: "custrecord_ht_mc_script", label: "Script" }),
            search.createColumn({ name: "custrecord_ht_mc_servidor", label: "Servidor" }),
            search.createColumn({ name: "custrecord_ht_mc_tipodispositivo", label: "Tipo Dispositivo" }),
            search.createColumn({ name: "custrecord_ht_mc_unidad", label: "Unidad" }),

            search.createColumn({ name: "custrecord_ht_mc_vid", label: "VID" }),
            search.createColumn({ name: "custrecord_ht_mc_macaddress", label: "MAC Address" }),
            search.createColumn({ name: "custrecord_ht_mc_sn", label: "SN" }),
            search.createColumn({ name: "custrecord_ht_mc_estadolodispositivo", label: "Estado Dispositivo" }),

            // Sim Card
            search.createColumn({ name: "custrecord_ht_mc_celularsimcard", label: "Celular SIM Card" }),
            search.createColumn({ name: "custrecord_ht_mc_operadora", label: "Operadora" }),
            search.createColumn({ name: "custrecord_ht_mc_ip", label: "IP" }),

            search.createColumn({ name: "custrecord_ht_mc_apn", label: "APN" }),
            search.createColumn({ name: "custrecord_ht_mc_nocelularsim", label: "No. Celular SIM" }),

            search.createColumn({ name: "custrecord_ht_mc_icc", label: "ICC" }),
            search.createColumn({ name: "custrecord_ht_mc_estadosimcard", label: "Estado SIM Card" }),

            // Dispositivo Lojack
            search.createColumn({ name: "custrecord_ht_mc_seriedispositivolojack", label: "Dispositivo Lojack" }),
            search.createColumn({ name: "custrecord_ht_mc_codigoactivacion", label: "Código Activación" }),
            search.createColumn({ name: "custrecord_ht_mc_codigorespuesta", label: "Código Respuesta" }),
            search.createColumn({ name: "custrecord_ht_mc_estadolojack", label: "Estado Lojack" }),

            // HT Subsidiaria
            //  search.createColumn({ name: "custrecord_ht_mc_subsidiaria", label: "HT Subsidiaria" }),

            search.createColumn({
              name: "custrecord_ht_bien_propietario",
              join: "CUSTRECORD_HT_MC_VEHICULO",
              label: "HT BN Propietario"
            })

          ],
        });

        let results = [];
        let myPagedData = mySearch.runPaged();
        myPagedData.pageRanges.forEach(function (pageRange) {
          var myPage = myPagedData.fetch({ index: pageRange.index });
          myPage.data.forEach(function (result) {


            results.push({
              datoTecnicoID: result.getValue({ name: "internalid" }) || "0",
              nombre: result.getValue({ name: "name" }) || "",
              ensamblaje_ID: result.getValue({ name: "custrecord_ht_mc_enlace" }) || "0",
              ensamblaje_Text: result.getText({ name: "custrecord_ht_mc_enlace" }),
              ubicacion: result.getValue({ name: "custrecord_ht_mc_ubicacion" }) || "0",
              bien: result.getValue({ name: "custrecord_ht_mc_vehiculo" }) || "0",
              inactivo: result.getValue({ name: "isinactive" }) == true ? 'T' : 'F',

              serieDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_seriedispositivo" }) || "0",
              serieDispositivo_Text: result.getText({ name: "custrecord_ht_mc_seriedispositivo" }) || "",
              modelo_ID: result.getValue({ name: "custrecord_ht_mc_modelo" }) || "0",
              modelo_Text: result.getText({ name: "custrecord_ht_mc_modelo" }) || "",
              imei: result.getValue({ name: "custrecord_ht_mc_imei" }) || "",
              firmware_ID: result.getValue({ name: "custrecord_ht_mc_firmware" }) || "0",
              firmware_Text: result.getText({ name: "custrecord_ht_mc_firmware" }) || "",
              script_ID: result.getValue({ name: "custrecord_ht_mc_script" }) || "0",
              script_Text: result.getText({ name: "custrecord_ht_mc_script" }) || "",
              servidor_ID: result.getValue({ name: "custrecord_ht_mc_servidor" }) || "0",
              servidor_Text: result.getText({ name: "custrecord_ht_mc_servidor" }) || "",
              tipoDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_tipodispositivo" }) || "0",
              tipoDispositivo_Text: result.getText({ name: "custrecord_ht_mc_tipodispositivo" }) || "",
              unidad_ID: result.getValue({ name: "custrecord_ht_mc_unidad" }) || "0",
              unidad_Text: result.getText({ name: "custrecord_ht_mc_unidad" }) || "",
              vid: result.getValue({ name: "custrecord_ht_mc_vid" }) || "",
              macAddress: result.getValue({ name: "custrecord_ht_mc_macaddress" }) || "",
              sn: result.getValue({ name: "custrecord_ht_mc_sn" }) || "",
              estadoDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_estadolodispositivo" }) || "0",
              estadoDispositivo_Text: result.getText({ name: "custrecord_ht_mc_estadolodispositivo" }) || "",

              celularSimCard_ID: result.getValue({ name: "custrecord_ht_mc_celularsimcard" }) || "0",
              celularSimCard_Text: result.getText({ name: "custrecord_ht_mc_celularsimcard" }) || "",
              operadora_ID: result.getValue({ name: "custrecord_ht_mc_operadora" }) || "0",
              operadora_Text: result.getText({ name: "custrecord_ht_mc_operadora" }) || "",
              ip: result.getValue({ name: "custrecord_ht_mc_ip" }) || "",
              apn: result.getValue({ name: "custrecord_ht_mc_apn" }) || "",
              noCelularSim: result.getValue({ name: "custrecord_ht_mc_nocelularsim" }) || "",
              icc: result.getValue({ name: "custrecord_ht_mc_icc" }) || "",
              estadoSimCard_ID: result.getValue({ name: "custrecord_ht_mc_estadosimcard" }) || "0",
              estadoSimCard_Text: result.getText({ name: "custrecord_ht_mc_estadosimcard" }) || "",

              serieDispositivoLojack_ID: result.getValue({ name: "custrecord_ht_mc_seriedispositivolojack" }) || "0",
              serieDispositivoLojack_Text: result.getText({ name: "custrecord_ht_mc_seriedispositivolojack" }) || "",
              codigoActivacion: result.getValue({ name: "custrecord_ht_mc_codigoactivacion" }) || "",
              codigoRespuesta: result.getValue({ name: "custrecord_ht_mc_codigorespuesta" }) || "",
              estadoLojack_ID: result.getValue({ name: "custrecord_ht_mc_estadolojack" }) || "0",
              estadoLojack_Text: result.getText({ name: "custrecord_ht_mc_estadolojack" }) || "",

              empresa_ID: result.getValue({ name: "custrecord_ht_mc_subsidiaria" }) || "0", //"2", 
              empresa_Text: result.getText({ name: "custrecord_ht_mc_subsidiaria" }) || "", //"Empresa principal : CARSEG",

              cliente_ID: result.getValue({ name: "custrecord_ht_bien_propietario", join: "CUSTRECORD_HT_MC_VEHICULO" }) || "0",
              cliente_Identificacion: result.getText({ name: "custrecord_ht_bien_propietario", join: "CUSTRECORD_HT_MC_VEHICULO" }) || "",

              fecha: "",
              id_usuario: "",
              accion: "",
            });

          });
        });

        if (results && results.length > 0) {
          if (ObjDatoTecnico.post == "Ina") {
            return results[0];
          } else {
            return results;
          }
        } else {
          throw "No se encontraron resultados";
        }

      } catch (error) {
        log.error('Error al actualizar el registro', { error: error.message, stack: error.stack });
        return [];
      }
    }

    function IdentificacionCliente(data) {
      try {
        if (!data.codigocliente) {
          throw new Error("No se ha proporcionado el código del cliente");
        }

        // log.debug("Datos de entrada:", data);

        let searchObj = search.create({
          type: "customer",
          filters: [["internalid", "anyof", data.codigocliente]],
          columns: ["vatregnumber"],
        });

        let resultado = searchObj.run().getRange({ start: 0, end: 1 })?.[0]?.getValue("vatregnumber") || "";

        if (!resultado) {
          throw new Error(`No se encontraron resultados para el cliente ${data.codigocliente}`);
        }

        return resultado;
      } catch (error) {
        log.error("Error en DatosCliente", error.message);
        return "";
      }
    }

    function ObtenerFechaEcuador() {
      const fechaActual = new Date();

      // Ajustar a la zona horaria de Ecuador
      const ecuadorTimeZone = 'America/Guayaquil';
      const fechaAjustada = new Date(
        fechaActual.toLocaleString('en-US', { timeZone: ecuadorTimeZone })
      );

      // Obtener componentes de la fecha
      const dia = String(fechaAjustada.getDate()).padStart(2, '0');
      const mes = String(fechaAjustada.getMonth() + 1).padStart(2, '0'); // Los meses empiezan en 0
      const anio = fechaAjustada.getFullYear();
      const horas = String(fechaAjustada.getHours()).padStart(2, '0');
      const minutos = String(fechaAjustada.getMinutes()).padStart(2, '0');

      // Formatear la fecha y hora en el formato deseado
      const fechaFormateada = `${dia}/${mes}/${anio} ${horas}:${minutos}`;

      return fechaFormateada;
    }

    function ActualizarCoberturaDatoTecnico(idRegistro, Object) {

      log.debug("ActualizarCoberturaDatoTecnico", { idRegistro, Object });

      try {
        if (!idRegistro) {
          log.error("Error", "El parámetro idRegistro es obligatorio.");
          return;
        }

        record.submitFields({
          type: 'customrecord_ht_co_cobertura', // Tipo de registro
          id: idRegistro, // ID del registro a actualizar
          values: {
            //   ** Detalle del Producto Chaser **  //
            // - HT CO Número serie Dispositivo
            custrecord_ht_co_numerodispositivo: Object.getValue({ fieldId: "custrecord_ht_mc_modelo" }) != "" ? Object.getValue({ fieldId: "name" }) : "",
            // - HT CO Modelo Dispositivo
            custrecord_ht_co_modelodispositivo: Object.getText({ fieldId: "custrecord_ht_mc_modelo" }),
            // - HT CO Unidad
            custrecord_ht_co_unidad: Object.getText({ fieldId: "custrecord_ht_mc_unidad" }),
            // - HT CO IMEI/ESN/DNID
            custrecord_ht_co_imei: Object.getValue({ fieldId: "custrecord_ht_mc_imei" }),
            // - HT CO Celular Sim Card
            custrecord_ht_co_celularsimcard: Object.getText({ fieldId: "custrecord_ht_mc_celularsimcard" }),
            // - HT CO Numero Celular Sim Card
            custrecord_ht_co_nocelularsimcard: Object.getValue({ fieldId: "custrecord_ht_mc_nocelularsim" }),
            // - HT CO IP
            custrecord_ht_co_ip: Object.getValue({ fieldId: "custrecord_ht_mc_ip" }),
            // - HT CO APN
            custrecord_ht_co_apn: Object.getValue({ fieldId: "custrecord_ht_mc_apn" }),
            // - HT CO Operadora
            custrecord_ht_co_operadora: Object.getText({ fieldId: "custrecord_ht_mc_operadora" }),
            // - HT CO VID
            custrecord_ht_co_vid: Object.getValue({ fieldId: "custrecord_ht_mc_vid" }),
            // - HT CO Firmware
            custrecord_ht_co_firmware: Object.getText({ fieldId: "custrecord_ht_mc_firmware" }),
            // - HT CO Script
            custrecord_ht_co_script: Object.getText({ fieldId: "custrecord_ht_mc_script" }),
            // - HT CO Servidor
            custrecord_ht_co_servidor: Object.getText({ fieldId: "custrecord_ht_mc_servidor" }),

            //   ** Detalle del Producto Lojack **  //
            // - HT Serie Dispositivo Lojack
            custrecord_ht_co_seriedispolojack: Object.getText({ fieldId: "custrecord_ht_mc_seriedispositivolojack" }),
            // - HT Código de activación Lojack
            custrecord_ht_co_codigoactivacion: Object.getValue({ fieldId: "custrecord_ht_mc_codigoactivacion" }),
            // - HT Código Respuesta
            custrecord_ht_co_codigorespuesta: Object.getValue({ fieldId: "custrecord_ht_mc_codigorespuesta" }),

            //   ** Estado Producto **  //
            // custrecord_ht_co_estado: Object.getValue({ fieldId: "custrecord_ht_mc_modelo" }) != "" ? Object.getValue({ fieldId: "custrecord_ht_mc_estadolodispositivo" }) : Object.getValue({ fieldId: "custrecord_ht_mc_estadolojack" })
          },
          options: {
            enableSourcing: false, // Opcional: evita que se activen búsquedas automáticas
            ignoreMandatoryFields: true // Opcional: ignora campos obligatorios
          }
        });

      } catch (error) {
        log.error("Error en ActualizarCoberturaDatoTecnico", { error: error.message, stack: error.stack });
      }
    }

    function BloqueActualizacionCoberturaDatoTecnico(idRegistro, Object) {
      try {
        const isInactive = Object.getValue('isinactive');

        if (!idRegistro) {
          log.error("Error", "El parámetro idRegistro es obligatorio.");
          return [];
        }

        // if (isInactive) {
        //   log.error("Error", "El registro se inactivo, no se actualiza.");
        //   return [];
        // }

        log.debug("--idRegistro--", idRegistro);

        let bienDT = Object.getValue("custrecord_ht_mc_vehiculo");
        let results = [];

        // Creación de la búsqueda
        let ht_co_coberturaSearch = search.create({
          type: "customrecord_ht_co_cobertura",
          filters: [
            ["custrecord_ht_co_numeroserieproducto", "anyof", idRegistro],
            "AND",
            ["isinactive", "is", "F"],
            "AND",
            ["custrecord_ht_co_subsidiaria", "anyof", "2"]
          ],
          columns: [
            search.createColumn({ name: "internalid", sort: search.Sort.ASC }),
            search.createColumn({ name: "custrecord_ht_co_bien" }),
          ]
        });

        // Ejecutar búsqueda paginada
        let pagedData = ht_co_coberturaSearch.runPaged({ pageSize: 100 });
        log.debug("Cantidad de registros encontrados", pagedData.count);

        // Iterar sobre las páginas de resultados
        pagedData.pageRanges.forEach(pageRange => {
          let page = pagedData.fetch({ index: pageRange.index });
          page.data.forEach(result => {

            let idRegistro = result.getValue({ name: "internalid" });
            let bien = result.getValue({ name: "custrecord_ht_co_bien" });

            if (bienDT == bien && !isInactive) { // Condicion para Actualizar la cobertura que conrresponde con el vehiculo de dato tecnico y no es inactivo
              ActualizarCoberturaDatoTecnico(idRegistro, Object);
            }

            results.push({
              internalID: idRegistro,
              bienID: bien
            })

          });
        });

        // Validar si se encontraron resultados
        if (results.length === 0) {
          log.error("Sin resultados", "No se encontraron registros para el idRegistro proporcionado.");
        }
        return results;

      } catch (error) {
        log.error("Error en ObtenerCoberturaDatoTecnico", { error: error.message, stack: error.stack });
        return [];
      }
    }

    function EnviarDatosAPIExternaCobertura(data) {
      try {

        if (data == []) {
          return false;
        }

        const token = _funcion.loginGetToken();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const options = {
          method: "POST",
          url: _const.URLS.HUNTER_API_NETSUITE + "/CoberturaNS",
          headers: headers,
          body: JSON.stringify(data),
        };

        log.debug("Opciones de la API externa", options);

        const response = https.post(options);

        let temporal = false

        if (response && response.body != "") {
          temporal = JSON.parse(response.body);
        }

        if (temporal && temporal.statusCode === 200) {
          log.debug("Respuesta de la API externa", temporal);
          return true;
        } else {

          // generarLogCambioEstado(data, response);

          log.debug("Error en la respuesta de la API externa", response);
          return false;
        }
      } catch (error) {
        log.debug("error", error)
        return false;
      }
    }

    function EnvioLoteCobertura(data, id_dato_tecnico) {
      try {
        log.debug("--Lote--", data);

        for (let y = 0; y < data.length; y++) {
          const idCobertura = data[y].internalID;

          let datosParaAPIInterna = PrepararDatosParaAPIInternaConSearch(idCobertura);

          if (!datosParaAPIInterna) {
            log.error("Error en datosParaAPIInterna", "No se pudo obtener los datos necesarios para la API interna");
            return true; // Salta a la siguiente iteración
          }

          const respuestaAPIInterna = ConsumirAPIInterna2(datosParaAPIInterna, 'POST');
          respuestaAPIInterna.Empresa = "2";
          respuestaAPIInterna.Accion = "edit";

          log.debug("infCompleta", respuestaAPIInterna);

          const respuestaExterna = EnviarDatosAPIExternaCobertura(respuestaAPIInterna); // devuelve true o false
          log.debug("Respuesta", respuestaExterna);

          // Validar si la respuesta es false
          if (!respuestaExterna) {
            log.error("Error en envío", `El envío falló para la cobertura con ID: ${idCobertura}`);
            GenerarLogCambioEstado(data, id_dato_tecnico, 'F', "PD_Dato_Tecnico"); // Guardar el registro
            return false; // Detener el proceso
          }
        }

        // Si todas las respuestas son true, generar el log final
        GenerarLogCambioEstado(data, id_dato_tecnico, 'T', "PD_Dato_Tecnico");

      } catch (error) {
        log.error("Error en EnvioLoteCobertura", error);
        return false;
      }
    }

    function GenerarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
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

    function PrepararDatosParaAPIInternaConSearch(idRegistro) {
      try {
        if (!idRegistro) {
          log.error("Error", "El parámetro idRegistro es obligatorio.");
          return false;
        }

        // Crear la búsqueda para obtener los datos del registro
        const coberturaSearch = search.create({
          type: 'customrecord_ht_co_cobertura',
          filters: [
            ['internalid', 'is', idRegistro] // Filtrar por el ID del registro
          ],
          columns: [
            search.createColumn({ name: 'custrecord_ht_co_bien' }), // Campo: Bien
            search.createColumn({ name: 'custrecord_ht_co_familia_prod' }), // Campo: Familia del bien
            search.createColumn({ name: 'custrecord_ht_co_coberturainicial' }), // Campo: Cobertura inicial
            search.createColumn({ name: 'custrecord_ht_co_coberturafinal' }) // Campo: Cobertura final
          ]
        });

        // Ejecutar la búsqueda y obtener el primer resultado
        const result = coberturaSearch.run().getRange({ start: 0, end: 1 })[0];
        if (!result) {
          log.error("Error", `No se encontró el registro con ID: ${idRegistro}`);
          return false;
        }

        // Obtener los valores de los campos
        const idbien = result.getValue({ name: 'custrecord_ht_co_bien' });
        const id_familia_bien = result.getValue({ name: 'custrecord_ht_co_familia_prod' });
        const coberturaInicial = result.getValue({ name: 'custrecord_ht_co_coberturainicial' });
        const coberturaFinal = result.getValue({ name: 'custrecord_ht_co_coberturafinal' });

        // Calcular el resultado adicional
        const resultado = ValorAdicionalPD(coberturaInicial, coberturaFinal);

        // Retornar los datos en el formato esperado
        return {
          id: idRegistro,
          idbien,
          id_familia_bien,
          TipoPlazo: resultado.Tipo_plazo,
          IdUsuario: (runtime?.getCurrentUser()?.id || 0).toString(),
          IdDocumento: 0,
          CodDocumento: "",
          Comentario: ""
        };
      } catch (error) {
        log.error("Error en prepararDatosParaAPIInternaConSearch", { error: error.message, stack: error.stack });
        return false;
      }
    }

    function ConsumirAPIInterna2(json, method) {
      try {

        if (!json) {
          return [];
        }

        let respuesta = coberturaController.makeApiRequest(
          {
            // accion: "PasoDatos",     
            accion: "PasoDatos_N",
            // idvehiculo: json.idbien,
            // idgrupoproducto: json.id_familia_bien
            IdCobertura: json.id
          },
          "customdeploy_hu_ec_rs_in_coberturas",
          "customscript_hu_ec_rs_in_coberturas",
          method,
          false
        );

        if (respuesta && (respuesta.status == "error")) {
          return [];
        } else {
          respuesta.TipoPlazo = json?.TipoPlazo || "";
          respuesta.IdUsuario = json?.IdUsuario || 0;
          respuesta.IdDocumento = json?.IdDocumento || 0;
          respuesta.CodDocumento = json?.CodDocumento || "";
          respuesta.Comentario = json?.Comentario || "";

          return respuesta;
        }
      } catch (error) {
        log.debug("error", error)
        return []
      }
    }

    function ValorAdicionalPD(fechaInicio, fechaFin) {
      try {
        log.debug("fechas", { fechaInicio, fechaFin });

        if (!fechaInicio || !fechaFin) {
          return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
        }

        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        const diferenciaAnios = fin.getFullYear() - inicio.getFullYear();
        const diferenciaMeses = diferenciaAnios * 12 + (fin.getMonth() - inicio.getMonth());
        const diferenciaTiempo = fin - inicio;
        const diferenciaDias = diferenciaTiempo / (1000 * 60 * 60 * 24);

        if (diferenciaMeses % 12 === 0 && diferenciaMeses >= 12) {
          return { id_plazo: 1, Tipo_plazo: "AÑOS", Diferencia: diferenciaMeses / 12 };
        } else if (diferenciaMeses > 0) {
          return { id_plazo: 2, Tipo_plazo: "MESES", Diferencia: diferenciaMeses };
        } else {
          return { id_plazo: 3, Tipo_plazo: "DÍAS", Diferencia: Math.floor(diferenciaDias) };
        }
      } catch (error) {
        return { id_plazo: 0, Tipo_plazo: "", Diferencia: "" };
      }
    }

    function EnviarDatosAPIExternaDatoTecnico(data) {
      try {
        if (data == [] || data == {} || !data) {
          return false;
        }

        const token = _funcion.loginGetToken();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const options = {
          method: "POST",
          url: _const.URLS.HUNTER_API_NETSUITE + "/DatosTecnicos",
          headers: headers,
          body: JSON.stringify(data),
        };

        log.debug("Opciones de la API externa", options);

        const response = https.post(options);

        let temporal = false

        if (response && response.body != "") {
          temporal = JSON.parse(response.body);
        }

        if (temporal && temporal.statusCode === 200) {
          log.debug("Respuesta de la API externa", temporal);
          return true;
        } else {
          log.debug("Error en la respuesta de la API externa", response);
          GenerarLogCambioEstado(data, data?.datoTecnicoID || 0, 'F', "PD_Dato_Tecnico"); // Guardar el registro
          return false;
        }
      } catch (error) {
        log.debug("error", error)
        GenerarLogCambioEstado(data, data?.datoTecnicoID || 0, 'F', "PD_Dato_Tecnico"); // Guardar el registro
        return false;
      }
    }

    return {
      onAction: onAction
    };
  });