/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/search', 'N/record', 'N/query', 'N/https', 'N/runtime','SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], (log, search, record, query, https, runtime, _toolkit) => {
  let ami_cuenta_usuario;
  let ami_cuenta_correo;
  let px_correo_monitoreo;

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

      log.debug("parametrizacion", parametrizacion);

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
        respuesta.push(impulsoPlataformaBien(json));

        json.plataforma = "PX";
        respuesta.push(impulsoPlataformaBien(json));
      } else if (tieneGPG) {
        respuesta.push(impulsoPlataformaBien(json));
      } else if (tieneGPT) {
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
    const user_run = runtime.getCurrentUser();
    let envio = false;
    try {
      let loginApiToken = _toolkit.loginGetToken();
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

        log.debug("responseActualizaBien", responseActualizaBien);

        if(responseActualizaBien && responseActualizaBien?.body ) {
          let respuestaActualizaBien = JSON.parse(responseActualizaBien.body);
          log.debug(
            `Librería - Enviado a: ${respuestaActualizaBien.plataforma}`,
            respuestaActualizaBien
          );

          if( respuestaActualizaBien.status == 200) {
            let bien_id = respuestaActualizaBien.vehiculoid;
            let suiteQl = `SELECT
              '0' AS numeroorden,
              'OPERAD' AS UsuarioIngreso,
              bien.custrecord_ht_bien_codsysh AS codsysh,
              bien.name AS codigo,
              1 AS TipoContacto,
              c.isperson,
              c.entityid AS IdentificadorContacto,
              c.altname,
              c.custentity_ht_cl_primernombre,
              c.custentity_ht_cl_segundonombre,
              c.custentity_ht_cl_apellidopaterno,
              c.custentity_ht_cl_apellidomaterno,
              c.phone,
              bien.custrecord_ht_bien_telefono_emergencia AS CelularContacto,
              email.custrecord_ht_email_tipoemail,
              email.custrecord_ht_email_email AS emailcontacto
            FROM customrecord_ht_record_bienes bien
            JOIN customer c ON c.id = bien.custrecord_ht_bien_propietario
            JOIN customrecord_ht_record_correoelectronico email ON email.custrecord_ht_ce_enlace =bien.custrecord_ht_bien_propietario
            WHERE bien.id = ?
            FETCH FIRST 1 ROWS ONLY`
            let respuesta = _toolkit.executeQuery(suiteQl, [bien_id]);
            log.debug("ENVIO TELEFONO EMERGENCIA", respuesta);
            for (let i = 0; i < respuesta.length; i++) {
              let elemento = respuesta[i];
              let codigovehiculo;
              let nombrecontacto;
              let apellidoscontacto;
              //if( elemento.custrecord_ht_email_tipoemail == 8){ // 	E-MAIL MONITOREO
              log.debug("sql data", elemento);
              // log.debug("elemento", elemento.celularcontacto);
              // log.debug("elemento", typeof elemento.celularcontacto);
                if( elemento.celularcontacto.trim().length > 0 ){
                  envio = true;
                }
                if ( elemento.codsysh ) {
                  codigovehiculo = elemento.codsysh;
                }else{
                  codigovehiculo = elemento.codigo;
                }
                let IdentificadorContacto = elemento.identificadorcontacto
                IdentificadorContacto = IdentificadorContacto.split('-').pop();
                if ( elemento.isperson == 'T') {
                  nombrecontacto = elemento.custentity_ht_cl_primernombre + ' ' + elemento.custentity_ht_cl_segundonombre;
                  apellidoscontacto = elemento.custentity_ht_cl_apellidopaterno + ' ' + elemento.custentity_ht_cl_apellidomaterno;
                }else{
                  nombrecontacto = elemento.altname;
                  apellidoscontacto = ''
                }
                let NumeroOrden = elemento.numeroorden
                let usuarioingreso = elemento.usuarioingreso;
                let { year, month, day } = obtenerValoresFechaHoy();
                json = {
                  'usuario': 'NetSuite',
                  'pass': 'NS*25#01@%j?i',
                  'token': `SH2PX${year}${month}${day}`,
                  'orden': `${elemento.numeroorden}`,
                  'usuarioIngreso': `${usuarioingreso}`,
                  'vehiculo': `${codigovehiculo}`,
                  'tipoContacto': `${elemento.tipocontacto}`,
                  'identificacion': `${IdentificadorContacto}` ,
                  'nombreContacto': `${nombrecontacto}`,
                  'apellidoContacto': `${apellidoscontacto}` ,
                  'celularContacto': elemento.celularcontacto,
                  'emailContacto': `` //elemento.emailcontacto
                };
              // }else{
              //   continue;
              // }
            }

            
            //log.debug("envio", envio)
            if ( envio ){
            log.debug("json ProcesoPX/ContactoEmergencia ", json);
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            //urlActualizaBien = "https://www.hunteronline.com.ec:2023/ApiNetsuite/ProcesoPX/ContactoEmergencia";
            urlActualizaBien = "https://hunterapi.hunter.com.ec:9443/ApiNetsuite/ProcesoPX/ContactoEmergencia";
            responseActualizaBien = https.post({
              url: urlActualizaBien,
              headers: headersActualizaBien,
              body: JSON.stringify(json),
            });
              //log.debug("responseActualizaBien 2 ", responseActualizaBien)
            if(responseActualizaBien && responseActualizaBien?.body ) {
              let respuestaActualizaBien = JSON.parse(responseActualizaBien.body);
              log.debug("enviado, telefono emergencia", respuestaActualizaBien);
            }
            }
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
          }
        }
        return responseActualizaBien;
      }
    } catch (error) {
      log.debug("Librería - ERROR - impulsoPlataformaBien", error.stack);
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
                --AND custrecord_ht_co_estado_cobertura = 1
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

      // findText
      let {
        salesrep: repVentas,
        custentity_ht_cl_oficinacliente: oficinaCliente
      } = findText(
        "customer",
        "internalid",
        "anyof",
        newRecord.getValue({ fieldId: "custrecord_ht_bien_propietario" }),
        [
          "salesrep",
          "custentity_ht_cl_oficinacliente"
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

      // 25/04/2025 - Actualización de la librería para obtener el estado del bien
      let estadoBien = newRecord.getText({ fieldId: "custrecord_ht_bn_estadobien"});

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
        color: color || "", //color || "000",
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
        idusuario: "OPERAD_EC",
        ejecutiva : limpiarNombre(repVentas),
        estadocartera : estadoBien,
        sucursal: oficinaCliente
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
          jsonObject.motor = "NO DEFINIDO"
          jsonObject.chasis = "NO DEFINIDO"
          jsonObject.color = "NO DEFINIDO"
          return jsonObject;
          case "8": // 8	INMUEBLE
          jsonObject.placa = newRecord.getValue({ fieldId: "altname" });
          jsonObject.chasis = newRecord.getValue({ fieldId: "altname" });
          jsonObject.motor = newRecord.getValue({ fieldId: "altname" });
          jsonObject.descripcionvehiculo = "";
          jsonObject.tipo = "";
          return jsonObject;
          case "9": // 9	PRODUCCIÓN
          jsonObject.descripcionvehiculo = "";
          jsonObject.placa = newRecord.getValue({ fieldId: "custrecord_ht_serie_pro" });
          jsonObject.chasis = newRecord.getValue({ fieldId: "altname" });
          jsonObject.motor = newRecord.getValue({ fieldId: "altname" });
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

  const findText = (table, column, type, id, columns) => {
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
            resultObject[col] = result.getText({ name: col });
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
      let objCustomer = record.load({
        type: "customer",
        id: idCliente,
        isDynamic: true,
      });

      let json = crearJsonCliente(objCustomer);

      let respuesta = [];

      log.debug("Librería - json cliente a enviar", json);
      if (json.plataforma === "PX") {
        respuesta.push(impulsoPlataformaCliente(json));
      } else {
        // 1ero envia AMI
        respuesta.push(impulsoPlataformaCliente(json));
        json.email = px_correo_monitoreo
        json.plataforma = "PX";
        respuesta.push(impulsoPlataformaCliente(json));
      }
      log.debug("respuesta", respuesta)
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
            mensaje: "ERROR"
          }
        ],
      };
    }
  }

  function crearJsonCliente(customer) {
    try {
      const getValue = (id) => customer.getValue({ fieldId: `${id}` });

      const getText = (id) => customer.getText({ fieldId: `${id}` });

      let id_cliente = getText("vatregnumber");
      let primer_nombre = getText("custentity_ht_cl_primernombre") || getText("companyname") || '';
      let segundo_nombre = getText("custentity_ht_cl_segundonombre") || "";
      let apellido_paterno = getText("custentity_ht_cl_apellidopaterno") || "";
      let apellido_materno = getText("custentity_ht_cl_apellidomaterno") || "";
      let direccion = getValue("billaddr1") || '';
      direccion = direccion.replace(/[^a-zA-Z0-9\s]/g, '');
      let telefono_convencional = formatearTelefono(getValue("homephone"));
      let telefono_celular = formatearTelefono(getValue("phone"));
      let email = getText("email")?.toLowerCase() || "";


      let ami_tipodocumento = getValue("vatregnumber")?.toLowerCase().length == 10 ? "1" : "2";
      let amicliente = getText("custentity_ht_customer_id_telematic")?.toLowerCase() || "";
      let plataforma = amicliente.length === 0 ? "PX" : "AMI";

      let repVentas = getText("salesrep") || "";
      let oficinaCliente = getText("custentity_ht_cl_oficinacliente") || "";

      let id_usuario = getText("id");
      let correos = getCorreo(id_usuario);
      log.debug("Correos encontrados", correos);
      //let correo = correos.find( (correo) => correo.custrecord_ht_email_tipoemail === 2 )?.custrecord_ht_email_email;

      if ( amicliente.length > 0 ){
          correos.forEach(correo => {
              if (correo.name === "E-MAIL AMI") {
                  ami_cuenta_usuario = correo.custrecord_ht_email_email // correo de usuario en ami
              }
              if(correo.custrecord_ht_email_emailprincipal === "T") {
                  ami_cuenta_correo = correo.custrecord_ht_email_email // correo de cuenta en ami
              }
          });
      }

      if(correos.length > 0){
          correos.forEach(correo => {
              if (correo.name === "E-MAIL MONITOREO") {
                px_correo_monitoreo = correo.custrecord_ht_email_email || email;
              }else{
                px_correo_monitoreo = email;
              }
          });
      }

      return {
        id_cliente,
        primer_nombre,
        segundo_nombre,
        apellido_paterno,
        apellido_materno,
        direccion,
        telefono_convencional: telefono_convencional || telefono_celular,
        telefono_celular,
        email: ami_cuenta_correo || px_correo_monitoreo || email || "",
        id_usuario: "OPERAD_EC",
        numeroorden: "0",
        plataforma,
        email_ami: ami_cuenta_usuario || email || "",
        ami_tipodocumento,
        amicliente,
        ami_company: "0991259546001",
        ami_support: "soporteami@carsegsa.com",
        ami_telefono: "0985454544",
        ami_celular: "046004640",
        ejecutiva : limpiarNombre(repVentas) || "",
        sucursal: oficinaCliente || "",
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
      log.debug("Error - formatearTelefono", error.stack);
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
      log.debug("Error - getCorreo", error.stack);
    }
  }

  function limpiarNombre(valor) {
    if (!valor || valor.trim() === "") {
        return "";
    }

    // Quita todo hasta el primer espacio
    var partes = valor.trim().split(" ");
    partes.shift(); // Elimina la primera parte (el código tipo E-1241)

    return partes.join(" ");
  }

  function impulsoPlataformaCliente(bodyActualizaCliente) {
    try {
      //obtener token de autenticación
      let loginApiToken = _toolkit.loginGetToken();

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

        return respuestaActualizaCliente;
      }
    } catch (error) {
        log.debug("Error - impulsoPlataformaCliente", error.stack);
    }
  }

  const ofuscarCampos = (context, cliente) => {
    _toolkit.ofuscarCampos(context,cliente)
  }

    const obtenerValoresFechaHoy = () => {
            let date = new Date();
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let day = date.getDate();
            month = month < 10 ? `0${month}` : month;
            day = day < 10 ? `0${day}` : day;
            return { year, month, day };
        }

  return { actualizarBien, actualizarCliente, ofuscarCampos };
});