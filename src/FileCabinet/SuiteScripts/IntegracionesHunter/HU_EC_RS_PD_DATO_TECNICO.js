/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log', 'N/search', 'N/query', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController', 'N/record', 'N/runtime', 'N/https',
], function (log, search, query, coberturaController, record, runtime, https) {

  function _get() {
    // get
  }

  function _post(requestBody) {
    try {
      switch (requestBody.post) {

        case "Ina":

          log.debug("Post Ina", requestBody);
          const dataPostIna = ObtenerInfDatosTecnicos(requestBody);
          log.debug("Respuesta Ina", dataPostIna);
          return JSON.stringify({ result: dataPostIna });

        default:
          return JSON.stringify({ result: [] });
      }


    } catch (error) {
      log.debug("Error Post", { error: error, stack: error.stack });
      return JSON.stringify({ results: [] });
    }
  }

  function ObtenerInfDatosTecnicos(ObjDatoTecnico) {
    try {

      log.debug("ObjDatoTecnico", ObjDatoTecnico);

      if (!ObjDatoTecnico?.id) {
        log.error('Error', 'ID del registro no proporcionado');
        return;
      }

      // Realizar una búsqueda guardada para obtener los registros
      const mySearch = search.create({
        type: 'customrecord_ht_record_mantchaser',
        filters: [
          ['internalid', 'is', ObjDatoTecnico?.id]
        ]
        ,
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
          search.createColumn({ name: "custrecord_ht_mc_subsidiaria", label: "HT Subsidiaria" }),

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
            datoTecnicoID: result.getValue({ name: "internalid" }),
            nombre: result.getValue({ name: "name" }),
            ensamblaje_ID: result.getValue({ name: "custrecord_ht_mc_enlace" }),
            ensamblaje_Text: result.getText({ name: "custrecord_ht_mc_enlace" }),
            ubicacion: result.getValue({ name: "custrecord_ht_mc_ubicacion" }),
            bien: result.getValue({ name: "custrecord_ht_mc_vehiculo" }),
            inactivo: result.getValue({ name: "isinactive" }) == true ? 'T' : 'F',

            serieDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_seriedispositivo" }),
            serieDispositivo_Text: result.getText({ name: "custrecord_ht_mc_seriedispositivo" }),
            modelo_ID: result.getValue({ name: "custrecord_ht_mc_modelo" }),
            modelo_Text: result.getText({ name: "custrecord_ht_mc_modelo" }),
            imei: result.getValue({ name: "custrecord_ht_mc_imei" }),
            firmware_ID: result.getValue({ name: "custrecord_ht_mc_firmware" }),
            firmware_Text: result.getText({ name: "custrecord_ht_mc_firmware" }),
            script_ID: result.getValue({ name: "custrecord_ht_mc_script" }),
            script_Text: result.getText({ name: "custrecord_ht_mc_script" }),
            servidor_ID: result.getValue({ name: "custrecord_ht_mc_servidor" }),
            servidor_Text: result.getText({ name: "custrecord_ht_mc_servidor" }),
            tipoDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_tipodispositivo" }),
            tipoDispositivo_Text: result.getText({ name: "custrecord_ht_mc_tipodispositivo" }),
            unidad_ID: result.getValue({ name: "custrecord_ht_mc_unidad" }),
            unidad_Text: result.getText({ name: "custrecord_ht_mc_unidad" }),
            vid: result.getValue({ name: "custrecord_ht_mc_vid" }),
            macAddress: result.getValue({ name: "custrecord_ht_mc_macaddress" }),
            sn: result.getValue({ name: "custrecord_ht_mc_sn" }),
            estadoDispositivo_ID: result.getValue({ name: "custrecord_ht_mc_estadolodispositivo" }),
            estadoDispositivo_Text: result.getText({ name: "custrecord_ht_mc_estadolodispositivo" }),

            celularSimCard_ID: result.getValue({ name: "custrecord_ht_mc_celularsimcard" }),
            celularSimCard_Text: result.getText({ name: "custrecord_ht_mc_celularsimcard" }),
            operadora_ID: result.getValue({ name: "custrecord_ht_mc_operadora" }),
            operadora_Text: result.getText({ name: "custrecord_ht_mc_operadora" }),
            ip: result.getValue({ name: "custrecord_ht_mc_ip" }),
            apn: result.getValue({ name: "custrecord_ht_mc_apn" }),
            noCelularSim: result.getValue({ name: "custrecord_ht_mc_nocelularsim" }),
            icc: result.getValue({ name: "custrecord_ht_mc_icc" }),
            estadoSimCard_ID: result.getValue({ name: "custrecord_ht_mc_estadosimcard" }),
            estadoSimCard_Text: result.getText({ name: "custrecord_ht_mc_estadosimcard" }),

            serieDispositivoLojack_ID: result.getValue({ name: "custrecord_ht_mc_seriedispositivolojack" }),
            serieDispositivoLojack_Text: result.getText({ name: "custrecord_ht_mc_seriedispositivolojack" }),
            codigoActivacion: result.getValue({ name: "custrecord_ht_mc_codigoactivacion" }),
            codigoRespuesta: result.getValue({ name: "custrecord_ht_mc_codigorespuesta" }),
            estadoLojack_ID: result.getValue({ name: "custrecord_ht_mc_estadolojack" }),
            estadoLojack_Text: result.getText({ name: "custrecord_ht_mc_estadolojack" }),

            empresa_ID: result.getValue({ name: "custrecord_ht_mc_subsidiaria" }),
            empresa_Text: result.getText({ name: "custrecord_ht_mc_subsidiaria" }),

            cliente_ID: result.getValue({name: "custrecord_ht_bien_propietario",join: "CUSTRECORD_HT_MC_VEHICULO"}),
            cliente_Text: result.getText({name: "custrecord_ht_bien_propietario",join: "CUSTRECORD_HT_MC_VEHICULO"}),

            fecha: "",
            id_usuario: "",
            accion: "",
          });

        });
      });

      return results;


    } catch (error) {
      log.error('Error al actualizar el registro', { error: error.message, stack: error.stack });
      return [];
    }
  }



  return {
    get: _get,
    post: _post
  }

});