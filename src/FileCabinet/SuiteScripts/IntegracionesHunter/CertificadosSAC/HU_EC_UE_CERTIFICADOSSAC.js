 /**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/https",
  "N/ui/serverWidget",
  "N/runtime",
  "N/log",
  "N/record",
  "N/search",
  "../UtilsGeneral/HU_EC_CONSTANTES",
  "../UtilsGeneral/HU_EC_FUNCION",
], (https, serverWidget, runtime, log, record, search,_const, _funcion) => {
  //var ROL_POST_VENTA = 1663; 
  var ROL_POST_VENTA = 1792 ; //POST VENTA 2 
  const beforeLoad = (scriptContext) => {
    try {
     
      var currentRole = runtime.getCurrentUser().role;
      log.debug('Roles', currentRole);
      if (currentRole === ROL_POST_VENTA) {
        try {
           let respuesta = validarEnvio(scriptContext);
           //log.debug('respuesta', respuesta);
           if (respuesta.ok){
             //log.debug('respuesta', respuesta.ok);
             const record = scriptContext.newRecord;
             const currentUser = runtime.getCurrentUser();
             let subsidiaria = currentUser.subsidiary;
             let internalid = record.getValue('id');
             log.debug('Data de Impulso', "subsidiaria " + subsidiaria + " - internalid " + internalid);
             scriptContext.form.addButton({
               id: "custpage_impulso_px_button",
               label: "IMPULSO PX",
               functionName:`impulsoPX('${internalid}', '${subsidiaria}')`,
             });
             scriptContext.form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/CertificadosSAC/HT_EC_CL_CERTIFICADOSSAC.js";
             log.debug( "Botón IMPULSO PX", "Usuario con rol: " + currentRole + " - se muestra únicamente el botón IMPULSO PX" );
           } else {
             log.debug('respuesta', respuesta);
             mostrarMensaje(
                scriptContext.form,
                "WARNING",
                "IMPULSO PX no disponible",
                respuesta && respuesta.motivo
                  ? respuesta.motivo
                  : "No se cumplen las validaciones para ejecutar Impulso PX.",
                 60000 // 1 minuto visible, luego se oculta solo
             );
           }
        } catch (e) {
          log.error("Error al agregar botón IMPULSO PX", e);
        }
        return;
      } else {
          log.debug("ROL_POST_VENTA", "No tiene rol de ROL_POST_VENTA");
      }
      
      try {
        var role = runtime.getCurrentUser().role;
        // Solo estos roles PUEDEN ver los campos
        var allowedRoles = [1015, 1894, 1811];

        // Si el rol NO está en la lista de permitidos, ocultar los campos
        // if (allowedRoles.indexOf(role) === -1) {
        // if (allowedRoles.includes(role)) {
        //   try {
        //     // Obtener los campos por su ID interno
        //     var fieldFechaInstalacion = scriptContext.form.getField({
        //       id: 'custrecord_ht_fecha_instalacion' // Ajusta el ID según tu campo
        //     });

        //     var fieldOsInstalacion = scriptContext.form.getField({
        //       id: 'custrecord_ht_os_instalacion' // Ajusta el ID según tu campo
        //     });

        //     // Ocultar los campos si existen
        //     if (fieldFechaInstalacion) {
        //       fieldFechaInstalacion.updateDisplayType({
        //         displayType: serverWidget.FieldDisplayType.HIDDEN
        //       });
        //     }

        //     if (fieldOsInstalacion) {
        //       fieldOsInstalacion.updateDisplayType({
        //         displayType: serverWidget.FieldDisplayType.HIDDEN
        //       });
        //     }

        //     log.debug('Campos ocultados', 'Usuario con rol: ' + role + ' no tiene permisos para ver los campos');

        //   } catch (e) {
        //     log.error('Error al ocultar campos', e);
        //   }
        // } else {
        //   log.debug('Campos visibles', 'Usuario con rol: ' + role + ' tiene permisos para ver los campos');
        // }
      } catch (error) {
        log.error('Error al verificar rol de usuario', error);
      }
      
      let objRecord = scriptContext.newRecord;
      var id = objRecord.id;
      var type = objRecord.type;

      let senderId = runtime.getCurrentUser().name;
      let senderIdemail = runtime.getCurrentUser().email;
      let email = senderIdemail.split("@")[0];

      log.debug("runtime.getCurrentUser()", runtime.getCurrentUser());

      let senderName = senderId.split(" ").slice(1).join(" ");

      let idBien = objRecord.getValue("custrecord_ht_co_bien");
      let idCobertura = objRecord.getValue("id");
      if (idBien) {
        let bienRecord = record.load({
          type: "customrecord_ht_record_bienes",
          id: idBien,
        });

        let bienPlaca = bienRecord.getValue("custrecord_ht_bien_placa");
        log.debug("bienPlaca", bienPlaca);
        let codsysh = bienRecord.getValue("custrecord_ht_bien_codsysh");
        log.debug("codsysh", codsysh);
        if( !codsysh ){
          return;
        }
      } else {
        return;
      }

      let estado_cobertura_value = objRecord.getValue("custrecord_ht_co_estado_cobertura");
      let estado_cobertura_text = objRecord.getText("custrecord_ht_co_estado_cobertura");

      let estado_instalacion_value = objRecord.getValue("custrecord_ht_co_estado" );
      let estado_instalacion_text = objRecord.getText( "custrecord_ht_co_estado" );

      // Detalle del producto Chaser
      let numerodispositivo = objRecord.getText( "custrecord_ht_co_numerodispositivo");

      // Detalle del producto Lojack
      let seriedispolojack = objRecord.getText( "custrecord_ht_co_seriedispolojack");

      log.debug("estado_cobertura_value", estado_cobertura_value);

      if (estado_cobertura_value === "3" || estado_cobertura_value === "4") {
        return;
      }

      if (
        estado_cobertura_value &&
        estado_cobertura_text &&
        estado_instalacion_value &&
        estado_instalacion_text
      ) {
        if (numerodispositivo || seriedispolojack) {
          if (
            estado_instalacion_value === "1" ||
            estado_instalacion_value === "2"
          ) {
            let [bien, cobertura, name, correo] = sendPostEncrypt(
              idBien,
              idCobertura,
              senderName,
              email
            );
            log.debug(
              "info:",
              JSON.stringify({
                bien: [idBien, bien],
                cobertura: [idCobertura, cobertura],
                nombre: [senderName, name],
                email: [email, correo],
              })
            );
            scriptContext.form.addButton({
              id: "custpage_print_button_pop",
              label: "Emitir Certificado",
              functionName: `openURL('${bien}', '${cobertura}', '${name}', '${correo}')`,
            });
            scriptContext.form.clientScriptModulePath =
              "SuiteScripts/IntegracionesHunter/CertificadosSAC/HT_EC_CL_CERTIFICADOSSAC.js";
          }
        }
      } else {
        log.debug(
          "Sistema",
          `Producto no cumple con validaciones para certificado. Cobertura id: ${idCobertura}`
        );
      }
    } catch (e) {
      log.debug("ERROR", e);
    }
  };

  function sendPostEncrypt(idBien, idCobertura, senderName, email) {
    var dataToSend = {
      data: [idBien + "", idCobertura + "", senderName + "", email + ""],
    };

    var headers = {
      "Content-Type": "application/json",
    };

    var options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(dataToSend),
    };

    try {
      var response = https.post({
        url: _const.URLS.HUNTER_API_NETSUITE + "/CodificarString",
        body: options.body,
        headers: options.headers,
      });

      if (response.code === 200) {
        var responseBody = JSON.parse(response.body);
        return responseBody;
      } else {
        log.error(
          "HTTP Error",
          `Status Code: ${response.code}, Response Body: ${response.body}`
        );
      }
    } catch (error) {
      log.error("Exception", `Error while sending request: ${error.message}`);
    }
  }

  let validarEnvio = (scriptContext) => {
    try {
      let record = scriptContext.newRecord;
      if (!record) return { ok: false, motivo: "Sin newRecord" };
      let subsidiaria = String(record.getValue('custrecord_ht_co_subsidiaria') || "");
      if (subsidiaria !== "2") return { ok: false, motivo: "Subsidiaria no habilitada: " + subsidiaria };
      let item = record.getValue('custrecord_ht_co_producto');
      if (!item) return { ok: false, motivo: "Cobertura sin producto" };
      let parametrizacion = obtenerParametrizacionItem(item, ['GPG', 'GPT', 'FAM']);
      if (!parametrizacion || !parametrizacion.length) return { ok: false, motivo: "Sin parametrización del item " + item };
      let trama = obtenerDatosParaImpulso(record, String(runtime.getCurrentUser()?.id || "0"));
      //log.debug("ROL_POST_VENTA", trama);
      if (!trama) return { ok: false, motivo: "Sin trama" };
      let gpg = String(parametrizacion[0]?.Valor || "").trim().toUpperCase();
      let fam = String(parametrizacion[2]?.Valor || "").trim().toUpperCase();
      if (gpg === "" && fam === 'HT') parametrizacion[0].Valor = 'S';
      if (trama.FamiliaProducto !== fam)return { ok: false, motivo: "El producto y la familia de la cobertura no están relacionados." };
      if (trama.IdDatoTecnico === "")return { ok: false, motivo: "Cobertura no tiene vinculado un dispositivo  " };
      if (trama.Vid === "")return { ok: false, motivo: "El campo Vid está  vacío" };
      if (trama.EstadoSim === "XXX")return { ok: false, motivo: "El estado de la Cobertura es inválido" };
      trama.producto = fam;
      if (!fam) return { ok: false, motivo: "Producto (FAM) vacío" };
      let enviarLatam = String(parametrizacion[0]?.Valor || "").trim().toUpperCase() === 'S';
      if (!enviarLatam) return { ok: false, motivo: "Parametro GPG no habilitado" };
      return { ok: true, trama: trama, subsidiaria: subsidiaria, parametrizacion: parametrizacion };
    } catch (error) {
      return { ok: false, motivo: "Error: " + (error.message || error) };
    }
  };

  const obtenerParametrizacionItem = (items, busquedaParametro) => {
      try {
        let data = [];
        for (let i = 0; i < busquedaParametro.length; i++) {

          if (!items || !busquedaParametro[i]) {
            console.log("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
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
        if (Propietario == "439954" && estadocobertura == "2") { // Se Excluye toda suspencion 
          throw new Error("El propietarioid es 439954, proceso detenido. (CONFLICTO)");
        }
        const PropietarioMonitoreo = dataCobertura.getValue('custrecord_ht_co_clientemonitoreo') || "";
        let familia_prod = dataCobertura.getValue('custrecord_ht_co_familia_prod') || "";

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
            estadocobertura === "2" ? "INA" : "XXX";
              //(() => { throw new Error("Estado de cobertura no válido."); })();

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

  const validarPropietarioAut = (id, usuarioEject) => {
      try {
        log.debug("UsuarioEject", usuarioEject);
        if (!id) return false
        let filter = [
          ["subsidiary", "anyof", "2"],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          // ["internalid", "noneof", "47445"]
          ["internalid", "noneof", "47445", "20995", "311945", "439954"]   // CLIENTES EXCLUIDOS
        ];

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
          console.log('getClientInfo', `No se encontró información para el cliente con ID: ${id}`);
          return emptyFamilia;
        }

        return {
          familia: searchParametroInfo.custrecord_ht_pp_codigo || ""
        };

      } catch (error) {
        console.log('error-getClientInfo', error.message || error);
        return emptyFamilia;
      }
    };

  const mostrarMensaje = (form, tipo, titulo, mensaje, duracion) => {
    try {
      if (!form) return;
      const estilos = {
        ERROR:        { fondo: "#FDECEA", borde: "#D93025", texto: "#5F1512", icono: "\u2716" },
        WARNING:      { fondo: "#FFF8E1", borde: "#F0A30A", texto: "#5C4500", icono: "\u26A0" },
        INFORMATION:  { fondo: "#E8F4FD", borde: "#1A73E8", texto: "#0B3B66", icono: "\u2139" },
        CONFIRMATION: { fondo: "#EAF6EC", borde: "#2E7D32", texto: "#14401A", icono: "\u2714" },
      };
      const tipoFinal = estilos[String(tipo).toUpperCase()] ? String(tipo).toUpperCase() : "INFORMATION";
      const est = estilos[tipoFinal];
      const ms = parseInt(duracion, 10) || 0;
      // JSON.stringify escapa de forma segura comillas, saltos de línea y acentos
      const sTitulo = JSON.stringify(String(titulo || ""));
      const sMensaje = JSON.stringify(String(mensaje || ""));
      const campoMensaje = form.addField({
        id: "custpage_mensaje_impulso_px",
        type: serverWidget.FieldType.INLINEHTML,
        label: "Mensaje",
      });
      campoMensaje.defaultValue =
        "<script>" +
        "(function(){" +
        "  function pintarBanner(){" +
        "    try {" +
        "      if (document.getElementById('custpage_banner_impulso_px')) { return; }" +
        "      var cont = document.createElement('div');" +
        "      cont.id = 'custpage_banner_impulso_px';" +
        "      cont.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);" +
        "        z-index:100000;min-width:340px;max-width:70%;display:flex;align-items:flex-start;" +
        "        gap:10px;background:" + est.fondo + ";border-left:5px solid " + est.borde + ";" +
        "        color:" + est.texto + ";padding:12px 40px 12px 14px;border-radius:4px;" +
        "        font-family:Arial,Helvetica,sans-serif;font-size:13px;" +
        "        box-shadow:0 2px 8px rgba(0,0,0,.25);';" +
        "      var ico = document.createElement('span');" +
        "      ico.style.cssText = 'font-size:16px;line-height:1.2;';" +
        "      ico.textContent = '" + est.icono + "';" +
        "      var txt = document.createElement('div');" +
        "      txt.style.cssText = 'flex:1;';" +
        "      var t = document.createElement('div');" +
        "      t.style.cssText = 'font-weight:bold;margin-bottom:3px;';" +
        "      t.textContent = " + sTitulo + ";" +
        "      var m = document.createElement('div');" +
        "      m.textContent = " + sMensaje + ";" +
        "      txt.appendChild(t); txt.appendChild(m);" +
        "      var x = document.createElement('span');" +
        "      x.textContent = '\\u00D7';" +
        "      x.title = 'Cerrar';" +
        "      x.style.cssText = 'position:absolute;top:8px;right:12px;cursor:pointer;" +
        "        font-size:20px;line-height:1;font-weight:bold;color:" + est.texto + ";opacity:.6;';" +
        "      x.onmouseover = function(){ this.style.opacity = 1; };" +
        "      x.onmouseout  = function(){ this.style.opacity = .6; };" +
        "      x.onclick     = function(){ if (cont.parentNode) { cont.parentNode.removeChild(cont); } };" +
        "      cont.appendChild(ico); cont.appendChild(txt); cont.appendChild(x);" +
        "      document.body.appendChild(cont);" +
        (ms > 0
          ? "      setTimeout(function(){ if (cont.parentNode) { cont.parentNode.removeChild(cont); } }, " + ms + ");"
          : "") +
        "    } catch(e) { if (window.console) { console.log('Error pintando banner', e); } }" +
        "  }" +
        "  if (document.readyState === 'loading') {" +
        "    document.addEventListener('DOMContentLoaded', pintarBanner);" +
        "  } else {" +
        "    pintarBanner();" +
        "  }" +
        "})();" +
        "<\/script>";
    } catch (error) {
      log.error("Error en mostrarMensaje", error);
    }
  };
    
  return { beforeLoad };
});
