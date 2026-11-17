/**
 * @NApiVersion 2.1
 */
define([
  "N/log",
  "N/search",
  "N/record",
  "N/query",
  "N/https",
  "./UtilsGeneral/HU_EC_FUNCION",
], (log, search, record, query, https, _funcion) => {
  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL BIEN EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL BIEN EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL BIEN EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
  function actualizarBien(idBien) {
    try {
      let objDiario = record.load({
        type: "customrecord_ht_record_bienes",
        id: idBien,
        isDynamic: true,
      });

      let context2 = objDiario;

      // if (context.type === context.UserEventType.EDIT) {
      // Crear el JSON a enviar a la API
      let json = crearJsonBien({ newRecord: context2 });
      log.debug("Librería - json a enviar a plataforma", json);
      return;
      // Verifica los productos con estado de cobertura activo
      let producto = tieneProducto(json.vehiculoid, json.clienteId);
      if (producto === null || producto === undefined || producto === 0) {
        log.debug(
          "Librería - Vehículo sin producto",
          "No se encontró un producto asociado al vehículo: " + json.vehiculoid
        );
        return {
          results: [
            {
              mensaje:
                "ERROR - No se encontró un producto asociado al vehículo",
              status: 400,
              amicliente: "",
              cliente: "",
              plataforma: "",
              username: "",
              vehiculoid: "",
              codvehiculo: "",
              amivehiculo: "",
              chasis: "",
              placa: "",
            },
          ],
        };
      }

      let parametrizacion;
      let arrayFinal = [];

      producto.forEach((element) => {
        parametrizacion = obtenerParametrizacionItem(
          element.custrecord_ht_co_producto,
          ["FAM", "GPT", "GPG"]
        );

        const filtrados = parametrizacion.filter(
          (item) =>
            (item.Param === "GPT" || item.Param === "GPG") && item.Valor === "S"
        );

        if (filtrados.length > 0) {
          arrayFinal.push(...filtrados); // Usar spread operator para añadir elementos individuales
        }
      });

      let tieneGPT = false;
      let tieneGPG = false;

      arrayFinal.forEach((item) => {
        if (item.Param === "GPT" && item.Valor === "S") {
          tieneGPT = true;
        }
        if (item.Param === "GPG" && item.Valor === "S") {
          tieneGPG = true;
        }
      });

      let respuesta = [];
      if (tieneGPT && tieneGPG) {
        log.debug("Librería - Resultado GPT + GPG", "AMI + PX");
        respuesta.push(impulsoPlataformaBien(json));

        json.plataforma = "PX";
        respuesta.push(impulsoPlataformaBien(json));
      } else if (tieneGPG) {
        log.debug("Librería - Resultado GPG", "PX");
        respuesta.push(impulsoPlataformaBien(json));
      } else {
        log.debug(
          "Librería - Resultado",
          "PRODUCTO, no cumple condiciones específicas."
        );
        return {
          results: [
            {
              mensaje: "ERROR - no se logro actualizar en plataforma",
              status: 400,
              amicliente: "",
              cliente: "",
              plataforma: "",
              username: "",
              vehiculoid: "",
              codvehiculo: "",
              amivehiculo: "",
              chasis: "",
              placa: "",
            },
          ],
        };
      }

      return { results: respuesta };
    } catch (error) {
      return {
        results: [
          {
            mensaje: "ERROR - no se logro actualizar en plataforma",
            status: 400,
            amicliente: "",
            cliente: "",
            plataforma: "",
            username: "",
            vehiculoid: "",
            codvehiculo: "",
            amivehiculo: "",
            chasis: "",
            placa: "",
          },
        ],
      };
    }
  }

  // PROCESO
  const impulsoPlataformaBien = (json) => {
    try {
      let loginApiToken = _funcion.loginGetToken();
      if (loginApiToken) {
        // let urlActualizaBien =
        //   "https://hunterapi.hunter.com.ec:9444/ApiNetsuitedesa/Bien";
        let urlActualizaBien =
          "https://www.hunteronline.com.ec:2023/ApiNetsuite/Bien";

        let headersActualizaBien = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginApiToken}`,
        };

        let responseActualizaBien = https.post({
          url: urlActualizaBien,
          headers: headersActualizaBien,
          body: JSON.stringify(json),
        });

        let respuestaActualizaBien = JSON.parse(responseActualizaBien.body);
        log.debug(
          `Librería - Enviado a: ${respuestaActualizaBien.plataforma}`,
          respuestaActualizaBien
        );
        return respuestaActualizaBien;
      }
    } catch (error) {
      log.debug("Librería - ERROR - impulsoPlataformaBien", error);
    }
  };

  const obtenerParametrizacionItem = (items, busquedaParametro) => {
    try {
      let data = [];
      for (let i = 0; i < busquedaParametro.length; i++) {
        let filtro = [
          ["custrecord_ht_pp_parametrizacionid", "is", items],
          "AND",
          [
            "custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code",
            "is",
            busquedaParametro[i],
          ],
        ];

        let busqueda = search.create({
          type: "customrecord_ht_pp_main_param_prod",
          filters: filtro,
          columns: [
            search.createColumn({
              name: "custrecord_ht_pp_parametrizacion_rela",
              label: "Param",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_parametrizacion_valor",
              label: "Valor",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_code",
              join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA",
              label: "Código",
            }),
            search.createColumn({
              name: "custrecord_ht_pp_codigo",
              join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR",
              label: "Código",
            }),
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
        }
      }
      return data;
    } catch (error) {
      log.error("Error", { error: error.message, stack: error.stack });
      return [];
    }
  };

  const tieneProducto = (vehiculoid, clienteId) => {
    try {
      let sqlQuery = `
            SELECT
                custrecord_ht_co_producto,
            FROM
                customrecord_ht_co_cobertura
            WHERE
                custrecord_ht_co_bien = ?
                AND custrecord_ht_co_propietario = ?
                AND custrecord_ht_co_estado_cobertura = 1
        `;
      // ?? custrecord_ht_co_numerodispositivo NO SEA NULO

      let resultSet = query.runSuiteQL({
        query: sqlQuery,
        params: [vehiculoid, clienteId],
      });

      let results = resultSet.asMappedResults();

      if (results.length > 0) {
        return results;
      }

      return 0;
    } catch (error) {
      log.error("ERROR - tieneProducto", error);
      return 0;
    }
  };

  const crearJsonBien = (context) => {
    try {
      let newRecord = context.newRecord;

      let plataforma =
        newRecord.getText({
          fieldId: "custrecord_ht_bien_id_telematic",
        }).length > 0
          ? "AMI"
          : "PX";
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CLIENTE *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let {
        internalid: clienteId,
        email: username,
        vatregnumber: cliente,
        custentity_ht_customer_id_telematic: amicliente,
      } = find(
        "customer",
        "internalid",
        "anyof",
        newRecord.getValue({ fieldId: "custrecord_ht_bien_propietario" }),
        [
          "internalid",
          "email",
          "vatregnumber",
          "custentity_ht_customer_id_telematic",
        ]
      );
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CLIENTE *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let codvehiculo =
        newRecord.getValue({ fieldId: "custrecord_ht_bien_codsysh" }) + "" ||
        newRecord.id + "";

      let vehiculoid = newRecord.getValue({ fieldId: "name" }) + "";

      let amivehiculo = newRecord.getText({
        fieldId: "custrecord_ht_bien_id_telematic",
      });

      let descripcionvehiculo = newRecord.getValue({ fieldId: "altname" });

      // custrecord_ht_tt_idtelematic
      // let { custrecord_ht_tt_idtelematic: tipovehiculo } = find(
      //   "customrecord_ht_bien_tipoterrestre",
      //   "internalid",
      //   "anyof",
      //   newRecord.getValue({
      //     fieldId: "custrecord_ht_bien_tipoterrestre",
      //   }),
      //   ["custrecord_ht_tt_idtelematic"]
      // );

      let tipovehiculo = newRecord.getValue({
        fieldId: "custrecord_ht_bien_tipoterrestre",
      });

      let tipo = newRecord.getText({
        fieldId: "custrecord_ht_bien_tipo",
      });

      let placa = newRecord.getValue({ fieldId: "custrecord_ht_bien_placa" });

      let idmarca = newRecord.getValue({ fieldId: "custrecord_ht_bien_marca" });
      let marca = newRecord.getText({ fieldId: "custrecord_ht_bien_marca" });
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* MODELO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let { custrecord_ht_mod_descripcion: modelo, internalid: idmodelo } =
        find(
          "customrecord_ht_bn_modelo",
          "internalid",
          "anyof",
          newRecord.getValue({ fieldId: "custrecord_ht_bien_modelo" }),
          ["custrecord_ht_mod_descripcion", "internalid"]
        );
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* MODELO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let chasis = newRecord.getValue({ fieldId: "custrecord_ht_bien_chasis" });
      let motor = newRecord.getValue({ fieldId: "custrecord_ht_bien_motor" });
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* COLOR *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let { custrecord_ht_bn_colorcarseg_descripcion: color } = find(
        "customrecord_ht_bn_colorcarseg",
        "internalid",
        "anyof",
        newRecord.getValue({ fieldId: "custrecord_ht_bien_colorcarseg" }),
        ["custrecord_ht_bn_colorcarseg_descripcion"]
      );
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* COLOR *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let anio = newRecord.getValue({ fieldId: "custrecord_ht_bien_ano" }) + "";
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CONCESIONARIO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let {
        custrecord_ht_cd_ruccanaldistribucion: idconcesionario,
        name: concesionariodesc,
        custrecord_ht_cd_direccion: concesionariodire,
      } = find(
        "customrecord_ht_record_canaldistribucion",
        "internalid",
        "anyof",
        newRecord.getValue({
          fieldId: "custrecord_ht_bien_consesionarios",
        }),
        [
          "custrecord_ht_cd_ruccanaldistribucion",
          "name",
          "custrecord_ht_cd_direccion",
        ]
      );
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* CONCESIONARIO *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* FINANCIERA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let {
        custrecord_ht_cd_ruccanaldistribucion: idfinanciera,
        name: financieradesc,
        custrecord_ht_cd_direccion: financieraDire,
      } = find(
        "customrecord_ht_record_canaldistribucion",
        "internalid",
        "anyof",
        newRecord.getValue({
          fieldId: "custrecord_ht_bien_financiadovehiculo",
        }),
        [
          "custrecord_ht_cd_ruccanaldistribucion",
          "name",
          "custrecord_ht_cd_direccion",
        ]
      );
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* FINANCIERA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ASEGURADORA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
      let {
        custrecord_ht_cd_ruccanaldistribucion: idaseguradora,
        name: aseguradoradesc,
        custrecord_ht_cd_direccion: aseguradoradire,
      } = find(
        "customrecord_ht_record_canaldistribucion",
        "internalid",
        "anyof",
        newRecord.getValue({
          fieldId: "custrecord_ht_bien_companiaseguros",
        }),
        [
          "custrecord_ht_cd_ruccanaldistribucion",
          "name",
          "custrecord_ht_cd_direccion",
        ]
      );

      let jsonObject = {
        plataforma: plataforma,
        clienteId: clienteId,
        cliente: cliente,
        username: username.toLowerCase(),
        amicliente: amicliente,
        codvehiculo: codvehiculo,
        vehiculoid: vehiculoid,
        amivehiculo: amivehiculo,
        // descripcionvehiculo: descripcionvehiculo,
        //"PLC. " + placa + " MOT. " + motor + " CHA. " + chasis,
        descripcionvehiculo: `PLC.:${placa};MAR.:${marca};MOD.:${modelo};COL.:${color}`,
        tipovehiculo: tipovehiculo,
        tipo: tipo,
        placa: placa,
        idmarca: idmarca,
        marca: marca,
        idmodelo: idmodelo,
        modelo: modelo,
        chasis: chasis,
        motor: motor,
        color: color, //color || "000",
        anio: anio || "",
        idconcesionario: idconcesionario || "",
        concesionariodesc:
          concesionariodesc?.substring(concesionariodesc.indexOf(" ") + 1) ||
          "",
        concesionariodire: concesionariodire || "",
        idfinanciera: idfinanciera || "",
        financieradesc:
          financieradesc?.substring(financieradesc.indexOf(" ") + 1) || "",
        financieraDire: financieraDire || "",
        idaseguradora: idaseguradora || "",
        aseguradoradesc:
          aseguradoradesc?.substring(aseguradoradesc.indexOf(" ") + 1) || "",
        aseguradoradire: aseguradoradire || "",
        numeroorden: "0",
        idusuario: "OPERAD",
      };

      let tipo_bien = newRecord.getValue({ fieldId: "custrecord_ht_bien_tipobien" });

      switch (tipo_bien) {
        case "1": // 1	TERRESTRE
          return jsonObject;
        case "6": // 6	MARÍTIMO
        case "7": // 7	TANQUE
          jsonObject.descripcionvehiculo = "";
          jsonObject.tipo = "";
          jsonObject.placa = newRecord.getValue({ fieldId: "custrecord_ht_bien_nom_embarcacion" });
          return jsonObject;
          case "8": // 8	INMUEBLE
          jsonObject.descripcionvehiculo = "";
          jsonObject.tipo = "";
          return jsonObject;
          case "9": // 9	PRODUCCIÓN
          jsonObject.descripcionvehiculo = "";
          jsonObject.placa = newRecord.getValue({ fieldId: "custrecord_ht_serie_pro" });
          return jsonObject;
        default:
          break;
      }
    } catch (error) {
      log.error("ERROR - crearJson", error);
    }
  };

  const find = (table, column, type, id, columns) => {
    try {
      const searchColumns = columns.map((col) =>
        search.createColumn({
          name: col,
          label: col,
        })
      );

      if (id == null || id == "" || id == undefined) return {};

      const customerSearchObj = search.create({
        type: table,
        filters: [[column, type, id]],
        columns: searchColumns,
      });

      const myPagedData = customerSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach((result) => {
          let resultObject = {};
          columns.forEach((col) => {
            resultObject[col] = result.getValue({ name: col });
          });
          respuesta.push(resultObject);
        });
      });

      return respuesta?.length > 0 ? respuesta[0] : {};
    } catch (error) {
      log.error("Error - find", { message: error, stack: error.stack });
      return {};
    }
  };

  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL CLIENTE EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL CLIENTE EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*
  // *-*-*-*-*-*-*-*-*-*-*-*-*-*-* ACTUALIZACIÓN DEL CLIENTE EN PLATAFORMA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*

  function actualizarCliente(idCliente) {
    try {
      let objDiario = record.load({
        type: "customer",
        id: idCliente,
        isDynamic: true,
      });

      let context2 = objDiario;
      let json = crearJsonCliente({ newRecord: context2 });
      log.debug("json", json);

      let respuesta = [];

      if (json.plataforma === "PX") {
        log.debug("SOLO PX");
        respuesta.push(impulsoPlataformaCliente(json));
      } else {
        log.debug("AMI - PX");
        respuesta.push(impulsoPlataformaCliente(json));
        json.plataforma = "PX";
        respuesta.push(impulsoPlataformaCliente(json));
      }

      return { results: respuesta };
    } catch (error) {
      log.debug("Error - afterSubmit", error);
      return {
        results: [
          {
            id_cliente: "",
            nombres: "",
            apellidos: " ",
            email: "",
            plataforma: "",
            status: 400,
            mensaje: "ERROR",
          },
        ],
      };
    }
  }

  function crearJsonCliente(context) {
    try {
      let newRecord = context.newRecord;
      const getValue = (id) =>
        newRecord.getValue({
          fieldId: `${id}`,
        });

      const getText = (id) =>
        newRecord.getText({
          fieldId: `${id}`,
        });

      let id_cliente = getText("vatregnumber");

      let primer_nombre =
        getText("custentity_ht_cl_primernombre") || getText("companyname");

      let segundo_nombre = getText("custentity_ht_cl_segundonombre") || "";

      let apellido_paterno = getText("custentity_ht_cl_apellidopaterno") || "";
      let apellido_materno = getText("custentity_ht_cl_apellidomaterno") || "";

      let direccion = getValue("billaddr1");
      let telefono_convencional = formatearTelefono(getValue("homephone"));
      let telefono_celular = formatearTelefono(getValue("phone"));
      let email = getText("email")?.toLowerCase() || "";

      let id_usuario = getText("id");
      let ami_tipodocumento =
        getValue("vatregnumber")?.toLowerCase().length == 10 ? "1" : "2";

      let amicliente =
        getText("custentity_ht_customer_id_telematic")?.toLowerCase() || "";

      let plataforma = amicliente.length === 0 ? "PX" : "AMI";

      let correos = getCorreo(id_usuario);
      let correo = correos.find(
        (correo) => correo.custrecord_ht_email_tipoemail === 2
      )?.custrecord_ht_email_email;
      log.debug("correo", correo);
      log.debug("Correos del cliente", correos);
      return {
        id_cliente,
        primer_nombre,
        segundo_nombre,
        apellido_paterno,
        apellido_materno,
        direccion,
        telefono_convencional: telefono_convencional || telefono_celular,
        telefono_celular,
        email,
        id_usuario: "OPERAD",
        numeroorden: "0",
        plataforma,
        email_ami: correo?.toLowerCase() || email?.toLowerCase(), // 023
        ami_tipodocumento,
        amicliente,
        ami_company: "0991259546001",
        ami_support: "soporteami@carsegsa.com",
        ami_telefono: "0985454544",
        ami_celular: "046004640",
      };
    } catch (error) {
      log.debug("Error - crearJson", error);
    }
  }

  function formatearTelefono(numero) {
    try {
      if (!numero) {
        return "";
      }
      let numeroLimpio = numero.replace("+593", "0").trim();

      if (numeroLimpio.startsWith("99")) {
        return `0${numeroLimpio.slice(0, 3)} ${numeroLimpio.slice(
          3,
          6
        )} ${numeroLimpio.slice(6)}`;
      } else if (numeroLimpio.startsWith("4")) {
        return `(04) ${numeroLimpio.slice(1, 4)}-${numeroLimpio.slice(4)}`;
      } else {
        return numeroLimpio || numero;
      }
    } catch (e) {
      log.debug("Error - formatearTelefono", error);
    }
  }

  function getCorreo(clienteIdInterno) {
    try {
      let sql = `
    SELECT
      correo.custrecord_ht_ce_enlace, correo.custrecord_ht_email_tipoemail, correo.custrecord_ht_email_emailprincipal, tipo.name, correo.custrecord_ht_email_email
    FROM
      customrecord_ht_record_correoelectronico AS correo
    LEFT JOIN
      CUSTOMLIST_HT_EMAIL_TIPOEMAIL AS tipo
    ON correo.custrecord_ht_email_tipoemail = tipo.id
    WHERE
      custrecord_ht_ce_enlace = ${clienteIdInterno}`;
      // AND custrecord_ht_email_tipoemail IN (23)
      // seleccionar que tipo de correo se va a tomar en cuenta

      let resultSet = query.runSuiteQL({
        query: sql,
      });

      return resultSet.asMappedResults() || [];
    } catch (error) {
      log.debug("Error - getCorreo", error);
    }
  }

  function impulsoPlataformaCliente(bodyActualizaCliente) {
    //obtener token de autenticación
    let loginApiToken = _funcion.loginGetToken();

    if (loginApiToken) {
      var urlActualizaCliente =
        "https://www.hunteronline.com.ec:2023/ApiNetsuite/Cliente";

      var headersActualizaCliente = {
        "Content-Type": "application/json",
        accept: "text/plain",
        Authorization: "Bearer " + loginApiToken,
      };

      //enviar el json sin corchetes
      var responseActualizaCliente = https.post({
        url: urlActualizaCliente,
        headers: headersActualizaCliente,
        body: JSON.stringify(bodyActualizaCliente),
      });

      var respuestaActualizaCliente = JSON.parse(responseActualizaCliente.body);
      log.debug("respuestaActualizaCliente", respuestaActualizaCliente);

      return respuestaActualizaCliente;
    }
  }

  return { actualizarBien, actualizarCliente };
});
