/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/record", "N/search", "N/query", "N/format", "N/llm", 'N/https', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js'], function (log, record, search, query, format, llm, https, _toolkit) {
  function _get(context) {
    try {

      if (context?.aux) {

        function ConsultaSqlDispositivoBodega() {
          try {
            let sqlQuery = `
         SELECT 
              BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
              ItemBinQuantity.bin AS Deposito,
              BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
              BUILTIN.DF(inventorybalance.location) AS location,
              Item.description AS DESCRIPCION,
              inventorybalance.inventorynumber AS ID_INVENTARIO,
              BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,    
              HtDispositivo.lastmodified AS Ultima_Fecha_Reservado
          FROM
              ItemBinQuantity
          INNER JOIN Item 
              ON Item.id = ItemBinQuantity.Item
          INNER JOIN inventorybalance 
              ON inventorybalance.item = Item.id
              AND inventorybalance.binnumber = ItemBinQuantity.bin
          INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
              ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
          WHERE
              ItemBinQuantity.bin = '428'
              --AND Item.id = '22059'
              AND ItemBinQuantity.OnHand > 0
              AND Item.itemtype = 'InvtPart'
              --AND HtDispositivo.custrecord_ht_dd_estado = '9'
          GROUP BY
              BUILTIN.DF(ItemBinQuantity.Item),
              ItemBinQuantity.bin,
              BUILTIN.DF(ItemBinQuantity.bin),
              BUILTIN.DF(inventorybalance.location),
              Item.description,
              inventorybalance.inventorynumber,
              BUILTIN.DF(inventorybalance.inventorynumber),
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado),
              HtDispositivo.lastmodified
          ORDER BY
              Ultima_Fecha_Reservado ASC;
                `;

            const resultSet = query.runSuiteQL({ query: sqlQuery });
            let results = resultSet.asMappedResults();

            if (!results) return [];

            // Sanitizar los resultados
            for (let obj of results) {
              for (let key in obj) {
                if (typeof obj[key] === 'string') {
                  obj[key] = obj[key].replace(/\n/g, " ").trim();
                } else {
                  obj[key] = obj[key] === null ? "" : obj[key];
                }
              }
            }

            return results;
          } catch (error) {
            log.error("ConsultaSqlDispositivoBodega - Error", error);
            return [];
          }
        }

        let a = ConsultaSqlDispositivoBodega();
        

        return JSON.stringify({ result: a });
      }

      log.debug("context", context);
      let datalog = GenerarLogSeguimientoCorreo(context)

      log.debug("datalog", datalog)

      return context;
    } catch (error) {
      log.error("error", error.stack);
      return "id:400, No se pudo insertar el registro. Error controlado.";
    }
  }

  function _post(context) {
    try {
      let ResultadoConsulta = null;
      let OpcionConsulta = context.accion;

      switch (OpcionConsulta) {
        case "ConsultaCliente":

          if (!context?.cedula) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere el número de cédula para la consulta" }] };
          }

          ResultadoConsulta = ObtenerN8nConsultaPorCedulaCliente(context?.cedula);
          return { results: ResultadoConsulta };


        case "ConsultaBien":

          if (!context?.cedula) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere el número de cédula para la consulta" }] };
          }

          ResultadoConsulta = ObtenerN8nConsultaPorCedulaBien(context?.cedula);
          return { results: ResultadoConsulta };

        case "ConsultaCobertura":

          if (!context?.cedula) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere el bien para la consulta" }] };
          }

          ResultadoConsulta = ObtenerCoberturaPorBien(context?.cedula);
          return { results: ResultadoConsulta };

        case "ObtenerFacturacionGeneral":

          if (!context) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Fechas" }] };
          }

          ResultadoConsulta = ObtenerFacturacionGeneral(context);
          return { results: ResultadoConsulta };

        case "ConsultaSuiteQLDemo":

          if (!context) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Data" }] };
          }

          ResultadoConsulta = ConsultaSuiteQLDemo(context);
          return { results: ResultadoConsulta };

        case "ConsultaIA":

          if (!context) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Data" }] };
          }

          ResultadoConsulta = EjecutarAnalisisIA({
            query: context.query,
            data: context.data
          });
          return { results: ResultadoConsulta };


        case "ObtenerFacturaSQLNativo":

          if (!context) {
            return { results: [{ "CODIGO": "400", "DESCRIPCION": "Se requiere Fechas" }] };
          }

          ResultadoConsulta = ObtenerFacturacionSqlNativo(context);
          return { results: ResultadoConsulta };


        default:
          return "id:400, tipo de busqueda no valida";
      }
    } catch (error) {
      log.error("error", { message: error.message, stack: error.stack });
      return { results: [{ "CODIGO": "404", "DESCRIPCION": "not found" }] };
    }
  }


  /**
   * Funciones auxiliares
   */
  function formatearTelefono(numero) {
    try {
      // log.debug("numero", numero);

      // Eliminar el prefijo "+593" y cualquier espacio en blanco
      let numeroLimpio = numero.replace("+593", "").trim();

      // log.debug("numeroLimpio--", numeroLimpio);

      if (numeroLimpio.startsWith("9")) {
        // Formatear números móviles
        return `0${numeroLimpio.slice(0, 9)}`;
      } else if (numeroLimpio.startsWith("4") || numeroLimpio.startsWith("3")) {
        // Formatear números convencionales
        return `(0${numeroLimpio.slice(0, 1)}) ${numeroLimpio.slice(1, 4)}-${numeroLimpio.slice(4)}`;
      } else {
        // Devolver el número limpio si no cumple con las condiciones anteriores
        return numeroLimpio || numero;
      }
    } catch (e) {
      // Devolver el número original en caso de error
      return numero;
    }
  }

  function transformarNumeroGeneral(numero) {
    let auxnumero = numero;
    try {
      // Eliminar espacios en blanco, paréntesis y guiones
      numero = numero.replace(/[\s()-]/g, '');

      // Validar si el número es un teléfono fijo ecuatoriano con código de área
      const telefonoFijoRegex = /^(\d{1})(\d{7})$/;
      const matchFijo = numero.match(telefonoFijoRegex);

      if (matchFijo) {
        // Retornar el número completo con el prefijo 0
        return `0${matchFijo[1]}${matchFijo[2]}`;
      }

      // Validar si el número es un celular ecuatoriano
      const celularRegex = /^(9\d{8})$/;
      const matchCelular = numero.match(celularRegex);

      if (matchCelular) {
        // Retornar el número completo con el prefijo 0
        return `0${matchCelular[1]}`;
      }

      // Retornar el número original si no es válido
      return numero;

    } catch (error) {
      return auxnumero;
    }

  }

  function CorreoCliente(idCliente) {
    try {
      let resultadoDireccion = [];
      // Búsqueda de correos electrónicos del cliente
      const searchObj2 = search.create({
        type: "customrecord_ht_record_correoelectronico",
        filters: [
          ["custrecord_ht_ce_enlace", "is", idCliente],
          "AND",
          ["custrecord_ht_email_emailprincipal", "is", true],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_ht_email_tipoemail",
            label: "Tipo de Email",
          }),
          search.createColumn({
            name: "custrecord_ht_email_email",
            label: "Email",
          }),
        ],
      });

      searchObj2.run().each((result) => {
        const tipoEmailTexto = result.getText({
          name: "custrecord_ht_email_tipoemail",
        });
        const tipoEmailCodigo = obtenerCodigoTipoDireccion(tipoEmailTexto);

        resultadoDireccion.push({
          TIPO_DIRECCION: tipoEmailCodigo,
          TIPO: tipoEmailTexto,
          DIRECCION:
            result.getValue({ name: "custrecord_ht_email_email" }) ?? "",
        });
        return true;
      });

      if (resultadoDireccion.length > 0) {
        return resultadoDireccion[0];
      } else {
        return { DIRECCION: "" };
      }
    } catch (error) {
      log.debug("error", error);
      return { DIRECCION: "" };
    }
  }

  function TelefonoGeneralClienteEx(idcliente, tipo) {
    try {
      let resultado = [];
      let ajuste = [];

      if (tipo == 4) {
        ajuste = [
          "4",  // CELULAR
          "28", // CELULAR CONVENIO
          "17", // CELULAR FACTURACION
          "21", // CELULAR MARESA
          "16", // CELULAR TDE
          "6", // CELULAR-EXTRA
          "9", // CONTACTO CELULAR
          "25", // CONVENIO CELULAR
          "19", // REGISTRESE H.O. CELULAR
        ];
      } else {
        ajuste = [
          "29", // TELEFONO
          "1", // TELEFONO CELULAR
          "10", // TELEFONO CONVENCIONAL
          "27", // TELEFONO CONVENIO
          "20", // TELEFONO MARESA
          "15", // TELEFONO MAVESA
          "12", // TELEFONO SOS
          "11", // TELEFONO TDE
          "5",  // TELEFONO-EXTRA
        ];
      }

      // log.debug("idcliente", idcliente);

      let searchObj = search.create({
        type: "customrecord_ht_registro_telefono",
        filters: [
          ["custrecord_ht_campo_lbl_entidad_telefono", "is", idcliente],
          // "AND",
          // ["custrecord_ht_campo_txt_principal", "is", true],
          "AND",
          ["custrecord_ht_campo_list_tipo_telefono", "anyof", ajuste],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_ht_campo_list_tipo_telefono",
            label: "Tipo telefono",
          }),
          search.createColumn({
            name: "custrecord_ht_campo_txt_telefono",
            label: "Telefono",
          }),
          search.createColumn({
            name: "custrecord_ht_codigo_telefono",
            join: "CUSTRECORD_HT_CAMPO_LIST_TIPO_TELEFONO",
            label: "Código",
          }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO: result.getValue({
            name: "custrecord_ht_codigo_telefono",
            join: "CUSTRECORD_HT_CAMPO_LIST_TIPO_TELEFONO",
          }),
          TIPO: result.getText({
            name: "custrecord_ht_campo_list_tipo_telefono",
          }),
          TELEFONO: formatearTelefono(
            result.getValue({ name: "custrecord_ht_campo_txt_telefono" })
          ),
        });
        return true;
      });

      if (resultado.length > 0) {
        return resultado[0];
      } else {
        return { TELEFONO: "" };
      }
    } catch (error) {
      log.debug("error", error);
      return { TELEFONO: "" };
    }
  }

  function DireccionEx(idcliente) {
    try {
      let resultadoDireccion = [];

      // Búsqueda de direcciones del cliente
      const searchObj = search.create({
        type: "customer",
        filters: [
          ["stage", "anyof", "CUSTOMER"],
          "AND",
          ["internalid", "is", idcliente],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["Address.isdefaultbilling", "is", true],
        ],
        columns: [
          search.createColumn({
            name: "addressinternalid",
            join: "Address",
            label: "ID de Dirección",
          }),
          search.createColumn({
            name: "address1",
            join: "Address",
            label: "Dirección",
          }),
          search.createColumn({
            name: "isdefaultbilling",
            join: "Address",
            label: "Dirección Principal",
          }),
          search.createColumn({
            name: "custrecord_ht_direccion_tipo",
            join: "Address",
            label: "Tipo de Dirección",
          }),
          search.createColumn({
            name: "custrecord_ec_canton",
            join: "Address",
            label: "Provincia",
          }),
        ],
      });

      searchObj.run().each((result) => {
        const tipoDireccionTexto = result.getText({
          name: "custrecord_ht_direccion_tipo",
          join: "Address",
        });
        const tipoDireccionCodigo =
          obtenerCodigoTipoDireccion(tipoDireccionTexto);

        let idCiudad = result.getValue({
          name: "custrecord_ec_canton",
          join: "Address",
        });
        let descripcionCliente = obtenerUnDato(
          "customrecord_ec_record_canton",
          "name",
          idCiudad
        );

        resultadoDireccion.push({
          TIPO_DIRECCION: tipoDireccionCodigo,
          TIPO: tipoDireccionTexto,
          DIRECCION:
            result.getValue({ name: "address1", join: "Address" }) ?? "",
          CIUDAD: descripcionCliente,
        });
        return true;
      });

      if (resultadoDireccion.length > 0) {
        return resultadoDireccion[0];
      } else {
        return { CIUDAD: "" };
      }
    } catch (error) {
      log.debug("error", error);
      return { CIUDAD: "" };
    }
  }

  function BienCliente(idcliente) {
    try {

      let resultado = [];
      let searchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [["custrecord_ht_bien_propietario", "is", idcliente]],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_bien_placa" }),
          search.createColumn({ name: "custrecord_ht_bien_motor" }),
          search.createColumn({ name: "custrecord_ht_bien_chasis" }),
          search.createColumn({ name: "altname" }),
          // search.createColumn({ name: "custrecord_ht_bien_marca" }),
          // search.createColumn({ name: "custrecord_ht_bien_modelo" }),
          // search.createColumn({ name: "custrecord_ht_bien_consesionarios" }),
          search.createColumn({
            name: "custrecord_ht_marca_descripcion",
            join: "CUSTRECORD_HT_BIEN_MARCA",
            label: "Descripcion"
          }),
          search.createColumn({
            name: "custrecord_ht_mod_descripcion",
            join: "CUSTRECORD_HT_BIEN_MODELO",
            label: "Descripcion"
          }),
          search.createColumn({
            name: "custrecord_ht_cd_nombre",
            join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS",
            label: "HT CD Nombre Canal de Distribución"
          })
        ],
      });

      // count 
      log.debug("count", searchObj.runPaged().count);

      if (searchObj.runPaged().count > 1000) {
        throw "Error controlado por cantidad de registros";
      }

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO: result.getValue({ name: "internalid" }),
          PLACA: result.getValue({ name: "custrecord_ht_bien_placa" }),
          MOTOR: result.getValue({ name: "custrecord_ht_bien_motor" }),
          CHASIS: result.getValue({ name: "custrecord_ht_bien_chasis" }),
          NOMBRE_COMPLETO: result.getValue({ name: "altname" }),
          MARCA: result.getValue({ name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_BIEN_MARCA" }),
          MODELO: result.getValue({ name: "custrecord_ht_mod_descripcion", join: "CUSTRECORD_HT_BIEN_MODELO" }),
          CONCESIONARIO: result.getValue({ name: "custrecord_ht_cd_nombre", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS" })
        });
        return true;
      });

      if (resultado.length > 0) {
        return resultado;
      } else {
        return [
          {
            CODIGO: "",
            PLACA: "",
            MOTOR: "",
            CHASIS: "",
            NOMBRE_COMPLETO: "",
            MARCA: "",
            MODELO: "",
            CONCESIONARIO: "",
          }
        ];
      }
    } catch (error) {
      log.debug("error", { error: error.message, stack: error.stack });
      return [
        {
          CODIGO: "",
          PLACA: "",
          MOTOR: "",
          CHASIS: "",
          NOMBRE_COMPLETO: "",
          MARCA: "",
          MODELO: "",
          CONCESIONARIO: "",
        }
      ];
    }
  }

  function obtenerCodigoTipoDireccion(descripcionTipo) {
    try {
      const searchObj = search.create({
        type: "customrecord_ht_registro_tipo_direccion",
        filters: [
          ["custrecordht_descripcion_tipo_direccion", "is", descripcionTipo],
        ],
        columns: [
          {
            name: "custrecordht_codigo_tipo_direccion",
            label: "Código Tipo Dirección",
          },
        ],
      });

      const searchResults = searchObj.run().getRange({ start: 0, end: 1 });
      return searchResults.length > 0
        ? searchResults[0].getValue({
          name: "custrecordht_codigo_tipo_direccion",
        })
        : "";
    } catch (error) {
      return "";
    }
  }

  function obtenerUnDato(type, columna, id) {
    try {
      const resultado = search
        .create({
          type: type,
          filters: [["internalid", "is", id]],
          columns: [columna],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      return resultado.length > 0 ? resultado[0].getValue(columna) : "";
    } catch (error) {
      return "";
    }
  }

  function ObtenerIDVehiculoSysID(IdVehiculo) {

    let results = [];
    try {
      let VehiculoSearch = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
          ["custrecord_ht_bien_codsysh", "is", IdVehiculo],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_bien_codsysh" }),
        ],
      });

      let searchResult = VehiculoSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
          });
        });
      });

      if (results.length > 0) {
        return results[0].id;
      } else {
        return false;
      }

    } catch (error) {
      log.debug("error", { error: error, stack: error.stack });
      return false;
    }
  }

  function ObtenerN8nConsultaPorCedulaBien(cedula) {
    try {

      if (!cedula || cedula.trim() === "") {
        throw new Error("La cédula es requerida");
      }

      let resultado = [];
      let idCliente = null;
      let nombreCliente = "";

      // 🔎 Paso 1: Buscar cliente
      let searchObj = search.create({
        type: "customer",
        filters: [["vatregnumber", "is", cedula.trim()]],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "altname" })
        ]
      });

      let totalClientes = searchObj.runPaged().count;
      if (totalClientes === 0) {
        throw new Error(`No se encontró cliente con cédula: ${cedula}`);
      }

      searchObj.run().each(r => {
        idCliente = r.getValue({ name: "internalid" });
        nombreCliente = r.getValue({ name: "altname" });
        return false;
      });

      // 🧾 Paso 2: Información del cliente
      let infcorreo = CorreoCliente(idCliente);
      let infCelular = TelefonoGeneralClienteEx(idCliente, 4);
      let infTelefono = TelefonoGeneralClienteEx(idCliente, 29);
      let infDireccionEx = DireccionEx(idCliente);
      let infBienCliente = BienCliente(idCliente);

      const LIMITE_MAX = 1000;
      const LIMITE_RESPUESTA = 100;
      let procesados = 0;

      // 🧮 Paso 3: Construcción del resultado
      for (let y = 0; y < infBienCliente.length; y++) {

        if (procesados >= LIMITE_RESPUESTA && resultado.length >= LIMITE_MAX) {
          break;
        }

        let infCobertura = ProductoVehiculo({ codigoVehiculo: infBienCliente[y].CODIGO }, true);

        if (infCobertura && infCobertura.length > 0) {
          for (let y2 = 0; y2 < infCobertura.length; y2++) {

            if (resultado.length >= LIMITE_MAX) break;
            if (resultado.length >= LIMITE_RESPUESTA && LIMITE_MAX < resultado.length) break;

            resultado.push({
              ID_CLIENTE: idCliente,
              CEDULA: cedula,
              NOMBRE_COMPLETO: nombreCliente || "",
              TELEFONO: infTelefono?.TELEFONO ? transformarNumeroGeneral(infTelefono.TELEFONO) : "",
              CELULAR: infCelular?.TELEFONO ? transformarNumeroGeneral(infCelular.TELEFONO) : "",
              EMAIL: infcorreo?.DIRECCION || "",
              NOMBRE_BIEN: infBienCliente[y].NOMBRE_COMPLETO,
              PLACA: infBienCliente[y].PLACA,
              MARCA: infBienCliente[y].MARCA,
              MODELO: infBienCliente[y].MODELO,
              CONCESIONARIO: infBienCliente[y].CONCESIONARIO,
              CODIGO: infBienCliente[y].CODIGO,
              CIUDAD: infDireccionEx?.CIUDAD || "",
              PRODUCTO: infCobertura[y2].FAMILIA || ""
            });

            procesados++;
            if (procesados >= LIMITE_RESPUESTA && resultado.length > LIMITE_MAX) break;
          }
        } else {

          if (resultado.length >= LIMITE_MAX) break;

          resultado.push({
            ID_CLIENTE: idCliente,
            CEDULA: cedula,
            NOMBRE_COMPLETO: nombreCliente || "",
            TELEFONO: infTelefono?.TELEFONO ? transformarNumeroGeneral(infTelefono.TELEFONO) : "",
            CELULAR: infCelular?.TELEFONO ? transformarNumeroGeneral(infCelular.TELEFONO) : "",
            EMAIL: infcorreo?.DIRECCION || "",
            PLACA: infBienCliente[y].PLACA,
            MARCA: infBienCliente[y].MARCA,
            MODELO: infBienCliente[y].MODELO,
            CONCESIONARIO: infBienCliente[y].CONCESIONARIO,
            CODIGO: infBienCliente[y].CODIGO,
            CIUDAD: infDireccionEx?.CIUDAD || "",
            PRODUCTO: ""
          });

          procesados++;
        }
      }

      // 🧾 Política de salida
      if (resultado.length > 1000) {
        resultado = resultado.slice(0, 100);
      }

      return resultado;

    } catch (error) {

      log.error("Error ObtenerN8nConsultaPorCedulaBien", {
        mensaje: error.message,
        stack: error.stack
      });

      return [{
        CODIGO: "500",
        DESCRIPCION: error.message
      }];
    }
  }

  function ObtenerN8nConsultaPorCedulaCliente(cedula) {
    try {

      if (!cedula || cedula.trim() === "") {
        throw new Error("La cédula es requerida");
      }

      let resultado = [];
      let idCliente = null;
      let nombreCliente = "";

      // Paso 1: Buscar cliente por cédula
      let searchObj = search.create({
        type: "customer",
        filters: [
          ["vatregnumber", "is", cedula.trim()]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "altname" })
        ]
      });

      let totalClientes = searchObj.runPaged().count;

      if (totalClientes === 0) {
        throw new Error(`No se encontró cliente con cédula: ${cedula}`);
      }

      const LIMITE_RESULTADOS = totalClientes > 1000 ? 100 : totalClientes;
      let procesados = 0;

      searchObj.run().each(function (result) {

        if (procesados >= LIMITE_RESULTADOS) {
          return false; // 🛑 corta el loop
        }

        idCliente = result.getValue({ name: "internalid" });
        nombreCliente = result.getValue({ name: "altname" });

        // 🧾 Paso 2: Información completa del cliente
        let infcorreo = CorreoCliente(idCliente);
        let infCelular = TelefonoGeneralClienteEx(idCliente, 4);
        let infTelefono = TelefonoGeneralClienteEx(idCliente, 29);
        let infDireccionEx = DireccionEx(idCliente);

        resultado.push({
          ID_CLIENTE: idCliente,
          CEDULA: cedula,
          NOMBRE_COMPLETO: nombreCliente || "",
          TELEFONO: (infTelefono?.TELEFONO ? transformarNumeroGeneral(infTelefono.TELEFONO) : ""),
          CELULAR: (infCelular?.TELEFONO ? transformarNumeroGeneral(infCelular.TELEFONO) : ""),
          EMAIL: infcorreo?.DIRECCION || "",
          CIUDAD: infDireccionEx?.CIUDAD || ""
        });

        procesados++;
        return true;
      });

      return resultado;

    } catch (error) {

      log.error("Error ObtenerN8nConsultaPorCedulaCliente", {
        mensaje: error.message,
        stack: error.stack
      });

      return [{
        CODIGO: "500",
        DESCRIPCION: error.message
      }];
    }
  }

  function ObtenerCoberturaPorBien(bien) {
    try {

      if (!bien || bien.trim() === "") {
        throw new Error("El bien es requerido");
      }

      const resultado = [];
      let searchObj;

      // 1. Búsqueda principal
      searchObj = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", bien],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" })
        ],
      });

      let count = searchObj.runPaged().count;

      // 2. Fallback por SysID
      if (count === 0) {
        let idVehiculo = ObtenerIDVehiculoSysID(bien);

        if (!idVehiculo) {
          throw new Error("No se encontraron resultados para el vehículo proporcionado");
        }

        searchObj = search.create({
          type: "customrecord_ht_co_cobertura",
          filters: [
            ["custrecord_ht_co_bien", "anyof", idVehiculo],
            "AND",
            ["isinactive", "is", "F"]
          ],
          columns: [
            search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
            search.createColumn({ name: "custrecord_ht_co_producto" }),
            search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
            search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
            search.createColumn({ name: "custrecord_ht_co_estado_cobertura" })
          ],
        });

        count = searchObj.runPaged().count;

        if (count === 0) {
          throw new Error("No se encontraron resultados para el vehículo proporcionado");
        }
      }

      // 3. Definir límite dinámico
      const LIMITE_RESULTADOS = count > 1000 ? 100 : count;
      let procesados = 0;

      // 4. Procesamiento controlado
      searchObj.run().each((result) => {

        if (procesados >= LIMITE_RESULTADOS) {
          return false; // 
        }

        const familiaProducto = obtenerUnDato(
          "customrecord_ht_cr_pp_valores",
          "custrecord_ht_pp_codigo",
          result.getValue({ name: "custrecord_ht_co_familia_prod" })
        ) || "";

        const descripcionProducto = obtenerUnDato(
          "customrecord_ht_cr_pp_valores",
          "custrecord_ht_pp_descripcion",
          result.getValue({ name: "custrecord_ht_co_familia_prod" })
        ) || "";

        resultado.push({
          PRODUCTO: familiaProducto,
          DESC_PRODUCTO: descripcionProducto,
          FECHA_INICIO: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
          FECHA_FINAL: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
          ESTADO: result.getText({ name: "custrecord_ht_co_estado_cobertura" })
        });

        procesados++;
        return true;
      });

      return resultado;

    } catch (error) {

      log.error("Error ObtenerCoberturaPorBien", {
        mensaje: error.message,
        stack: error.stack
      });

      return [{
        CODIGO: "500",
        DESCRIPCION: error.message
      }];
    }
  }

  function ObtenerFacturacionGeneral(context) {

    try {
      context.fechaini = "2026-01-01"
      context.fechafin = "2026-01-31"

      if (!context || !context.fechaini || !context.fechafin) {
        throw new Error('Debes enviar fechaini y fechafin');
      }

      const from = new Date(context.fechaini);
      const to = new Date(context.fechafin);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Formato de fecha inválido');
      }

      if (from > to) {
        throw new Error('La fecha inicial no puede ser mayor a la final');
      }

      const fechaDesde = format.format({ value: from, type: format.Type.DATE });
      const fechaHasta = format.format({ value: to, type: format.Type.DATE });

      // Cargar Saved Search existente
      const savedSearch = search.load({ id: 'customsearch3686' });

      // Inyectar filtro de fechas dinámico
      savedSearch.filters.push(
        search.createFilter({
          name: 'trandate',
          operator: search.Operator.WITHIN,
          values: ['thismonth']
          // values: [fechaDesde, fechaHasta]
        })
      );

      const data = [];

      const pagedData = savedSearch.runPaged({ pageSize: 1000 });

      pagedData.pageRanges.forEach((range) => {
        const page = pagedData.fetch({ index: range.index });

        page.data.forEach((result) => {
          const row = {};

          result.columns.forEach((col) => {
            const label = col.label || col.name;
            row[label] = result.getValue(col);
          });

          data.push(row);
        });
      });

      return {
        success: true,
        total: data.length,
        desde: fechaDesde,
        hasta: fechaHasta,
        data: data
      };

    } catch (error) {
      log.error('Error en ObtenerFacturacionGeneral', error);

      return {
        success: false,
        message: error.message
      };
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  function ObtenerFacturacionSqlNativo(context) {

    try {

      let data = getApiData(context)

      return data;

    } catch (error) {
      log.error('Error en ObtenerFacturacionGeneral', error);

      return {
        success: false,
        message: error.message
      };
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // Mapeo de entidades a tablas y campos disponibles
  const ENTIDADES = {
    customer: {
      tabla: 'customer',
      camposDisponibles: [
        // Identificadores
        'id', 'entityid', 'externalid', 'entitynumber', 'companyname', 'fullname',
        // Nombres y apellidos
        'firstname', 'lastname', 'middlename', 'salutation', 'title',
        // Información de contacto
        'email', 'phone', 'mobilephone', 'altphone', 'homephone', 'fax',
        'altemail', 'url', 'sourcewebsite',
        // Dirección
        'city', 'state', 'thirdpartycountry', 'thirdpartyzipcode',
        'defaultbillingaddress', 'defaultshippingaddress',
        // Información comercial
        'category', 'leadsource', 'salesrep', 'territory', 'partner',
        'pricelevel', 'currency', 'accountnumber', 'creditlimit',
        // Fechas importantes
        'datecreated', 'lastmodifieddate', 'dateconversion', 'datelead',
        'firstorderdate', 'lastorderdate', 'firstsaledate', 'lastsaledate',
        'dateclosed', 'dategrosslead',
        // Estado
        'isinactive', 'oncredithold', 'creditholdoverride', 'isexplicitconversion',
        'convertedtocontact', 'convertedtocustomer', 'isperson', 'isjob',
        // Finanzas
        'balancesearch', 'overduebalancesearch', 'consoldaysoverduesearch',
        'daysoverduesearch', 'consolunbilledorderssearch',
        // Fiscales
        'vatregnumber', 'taxable', 'taxitem', 'resalenumber',
        // Adicionales relevantes
        'comments', 'language', 'emailpreference', 'duplicate',
        'unsubscribe', 'weblead', 'parent', 'toplevelparent'
      ],
      camposPorDefecto: [
        'id', 'entityid', 'companyname', 'fullname', 'email', 'phone',
        'datecreated', 'lastmodifieddate', 'isinactive', 'category'
      ]
    },
    clientes: {
      tabla: 'customer',
      camposDisponibles: [
        'id', 'entityid', 'externalid', 'entitynumber', 'companyname', 'fullname',
        'firstname', 'lastname', 'middlename', 'salutation', 'title',
        'email', 'phone', 'mobilephone', 'altphone', 'homephone', 'fax',
        'altemail', 'url', 'sourcewebsite',
        'city', 'state', 'thirdpartycountry', 'thirdpartyzipcode',
        'defaultbillingaddress', 'defaultshippingaddress',
        'category', 'leadsource', 'salesrep', 'territory', 'partner',
        'pricelevel', 'currency', 'accountnumber', 'creditlimit',
        'datecreated', 'lastmodifieddate', 'dateconversion', 'datelead',
        'firstorderdate', 'lastorderdate', 'firstsaledate', 'lastsaledate',
        'dateclosed', 'dategrosslead',
        'isinactive', 'oncredithold', 'creditholdoverride', 'isexplicitconversion',
        'convertedtocontact', 'convertedtocustomer', 'isperson', 'isjob',
        'balancesearch', 'overduebalancesearch', 'consoldaysoverduesearch',
        'daysoverduesearch', 'consolunbilledorderssearch',
        'vatregnumber', 'taxable', 'taxitem', 'resalenumber',
        'comments', 'language', 'emailpreference', 'duplicate',
        'unsubscribe', 'weblead', 'parent', 'toplevelparent'
      ],
      camposPorDefecto: [
        'id', 'entityid', 'companyname', 'fullname', 'email', 'phone',
        'datecreated', 'lastmodifieddate', 'isinactive', 'category'
      ]
    },
    cobertura: {
      tabla: 'customrecord_ht_co_cobertura',
      camposDisponibles: [
        // Identificadores
        'id', 'name', 'externalid', 'scriptid',
        // Propietario y cliente
        'custrecord_ht_co_propietario', 'custrecord_ht_co_clientemonitoreo', 'owner',
        // Producto y bien
        'custrecord_ht_co_producto', 'custrecord_ht_co_bien', 'custrecord_ht_co_familia_prod',
        // Números y códigos
        'custrecord_ht_co_numerodispositivo', 'custrecord_ht_co_numeroserieproducto',
        'custrecord_ht_co_imei', 'custrecord_ht_co_apn', 'custrecord_ht_co_codigoactivacion',
        'custrecord_ht_co_codigorespuesta', 'custrecord_ht_co_seriedispolojack',
        // Fechas de cobertura
        'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
        'custrecord_ht_co_fechareactivacion', 'created', 'lastmodified',
        // Estado
        'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'custrecord_ht_co_estado_cobertura',
        'custrecord_ht_co_producto_convertido', 'isinactive',
        // Información técnica
        'custrecord_ht_co_celularsimcard', 'custrecord_ht_co_nocelularsimcard',
        'custrecord_ht_co_script', 'custrecord_ht_co_firmware', 'custrecord_ht_co_token',
        'custrecord_ht_co_vid', 'custrecord_ht_co_ip', 'custrecord_ht_co_operadora',
        'custrecord_ht_co_servidor', 'custrecord_ht_co_unidad', 'custrecord_ht_co_modelodispositivo',
        // Información adicional
        'custrecord_ht_co_plazo', 'custrecord_ht_co_subsidiaria', 'custrecord_ht_co_orden_servicio',
        'custrecord_ht_co_udp_pla_px_ami', 'custrecord_ht_co_impulso_plataforma',
        'custrecord_ht_co_estado_conciliacion', 'custrecord_ht_co_estadocartera',
        'custrecord_ht_co_estadolojack', 'custrecord19', 'custrecord_ht_customer_id_telematic',
        // Metadatos
        'altname', 'abbreviation', 'lastmodifiedby'
      ],
      camposPorDefecto: [
        'id', 'name', 'custrecord_ht_co_propietario', 'custrecord_ht_co_producto',
        'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
        'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'created'
      ]
    },
    coberturas: {
      tabla: 'customrecord_ht_co_cobertura',
      camposDisponibles: [
        'id', 'name', 'externalid', 'scriptid',
        'custrecord_ht_co_propietario', 'custrecord_ht_co_clientemonitoreo', 'owner',
        'custrecord_ht_co_producto', 'custrecord_ht_co_bien', 'custrecord_ht_co_familia_prod',
        'custrecord_ht_co_numerodispositivo', 'custrecord_ht_co_numeroserieproducto',
        'custrecord_ht_co_imei', 'custrecord_ht_co_apn', 'custrecord_ht_co_codigoactivacion',
        'custrecord_ht_co_codigorespuesta', 'custrecord_ht_co_seriedispolojack',
        'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
        'custrecord_ht_co_fechareactivacion', 'created', 'lastmodified',
        'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'custrecord_ht_co_estado_cobertura',
        'custrecord_ht_co_producto_convertido', 'isinactive',
        'custrecord_ht_co_celularsimcard', 'custrecord_ht_co_nocelularsimcard',
        'custrecord_ht_co_script', 'custrecord_ht_co_firmware', 'custrecord_ht_co_token',
        'custrecord_ht_co_vid', 'custrecord_ht_co_ip', 'custrecord_ht_co_operadora',
        'custrecord_ht_co_servidor', 'custrecord_ht_co_unidad', 'custrecord_ht_co_modelodispositivo',
        'custrecord_ht_co_plazo', 'custrecord_ht_co_subsidiaria', 'custrecord_ht_co_orden_servicio',
        'custrecord_ht_co_udp_pla_px_ami', 'custrecord_ht_co_impulso_plataforma',
        'custrecord_ht_co_estado_conciliacion', 'custrecord_ht_co_estadocartera',
        'custrecord_ht_co_estadolojack', 'custrecord19', 'custrecord_ht_customer_id_telematic',
        'altname', 'abbreviation', 'lastmodifiedby'
      ],
      camposPorDefecto: [
        'id', 'name', 'custrecord_ht_co_propietario', 'custrecord_ht_co_producto',
        'custrecord_ht_co_coberturainicial', 'custrecord_ht_co_coberturafinal',
        'custrecord_ht_co_estado', 'custrecord_ht_co_activo', 'created'
      ]
    }
  };

  function ConsultaSuiteQLDemo(context) { // Contador
    try {
      const body = context;

      log.debug('========== INICIO RESTLET ==========');
      log.debug('Body recibido:', JSON.stringify(body));

      // PASO 1: Validar estructura
      const validacion = validarBody(body);
      if (!validacion.valid) {
        return {
          success: false,
          error: validacion.error
        };
      }

      // PASO 2: Construir consultas
      const suiteqlData = construirSuiteQL(body);        // con límite 25
      const suiteqlCount = construirSuiteQLCount(body); // total real

      log.debug('SuiteQL DATA:', suiteqlData);
      log.debug('SuiteQL COUNT:', suiteqlCount);

      // PASO 3: Ejecutar consultas
      const dataResult = query.runSuiteQL({ query: suiteqlData });
      const data = dataResult.asMappedResults();

      const countResult = query.runSuiteQL({ query: suiteqlCount });
      const totalRegistros = countResult.asMappedResults()[0].total;

      // PASO 4: Mensaje inteligente
      let mensaje = `Se encontraron ${totalRegistros} registros`;

      if (totalRegistros > data.length) {
        mensaje = `Se muestran ${data.length} de ${totalRegistros} registros disponibles. Afine la consulta.`;
      }

      log.debug('========== FIN RESTLET ==========');

      return {
        success: true,
        totalRegistros: totalRegistros,
        registrosMostrados: data.length,
        data: data,
        mensaje: mensaje
      };

    } catch (error) {
      log.error('Error en ConsultaSuiteQLDemo:', error);
      return {
        success: false,
        error: 'Error: ' + error.message
      };
    }
  }

  /**
   * Valida que el body tenga la estructura correcta
   */
  function validarBody(body) {
    // Validar que body existe
    if (!body) {
      return { valid: false, error: 'Body vacío' };
    }

    // Validar entityType
    if (!body.entityType) {
      return { valid: false, error: 'Se requiere "entityType"' };
    }

    const entityType = body.entityType.toLowerCase();
    const entidad = ENTIDADES[entityType];

    if (!entidad) {
      const validos = Object.keys(ENTIDADES).join(', ');
      return {
        valid: false,
        error: `entityType no válido: ${body.entityType}. Válidos: ${validos}`
      };
    }

    // Validar campos si se especifican
    if (body.campos !== undefined) {
      if (!Array.isArray(body.campos)) {
        return { valid: false, error: '"campos" debe ser un array' };
      }
      if (body.campos.length === 0) {
        return { valid: false, error: '"campos" no puede estar vacío' };
      }

      for (const campo of body.campos) {
        if (!entidad.camposDisponibles.includes(campo)) {
          return {
            valid: false,
            error: `Campo no válido: ${campo}. Disponibles: ${entidad.camposDisponibles.join(', ')}`
          };
        }
      }
    }

    // Validar filtros si se especifican
    if (body.filtros !== undefined) {
      if (!Array.isArray(body.filtros)) {
        return { valid: false, error: '"filtros" debe ser un array' };
      }

      for (let i = 0; i < body.filtros.length; i++) {
        const filtro = body.filtros[i];

        if (!filtro.campo) {
          return { valid: false, error: `Filtro ${i}: se requiere "campo"` };
        }
        if (filtro.valor === undefined) {
          return { valid: false, error: `Filtro ${i}: se requiere "valor"` };
        }
        if (
          filtro.operador &&
          !['=', '>', '<', '>=', '<=', '<>', 'LIKE', 'IN'].includes(filtro.operador)
        ) {
          return {
            valid: false,
            error: `Filtro ${i}: operador no válido: ${filtro.operador}`
          };
        }
      }
    }

    // Validar orden SOLO si campo tiene valor
    if (body.orden && body.orden.campo) {
      if (typeof body.orden.campo !== 'string' || body.orden.campo.trim() === '') {
        // campo vacío → ignorar orden
        delete body.orden;
      } else if (
        body.orden.descendente !== undefined &&
        typeof body.orden.descendente !== 'boolean'
      ) {
        return {
          valid: false,
          error: 'orden: "descendente" debe ser true o false'
        };
      }
    }

    // Validar límite
    if (body.limite !== undefined) {
      if (isNaN(body.limite) || body.limite < 1) {
        return { valid: false, error: 'limite debe ser un número mayor a 0' };
      }
      if (body.limite > 10000) {
        return { valid: false, error: 'limite máximo es 10000' };
      }
    }

    return { valid: true };
  }

  function construirSuiteQL(params) {
    const entityType = params.entityType.toLowerCase();
    const entidad = ENTIDADES[entityType];

    const campos = params.campos && params.campos.length > 0
      ? params.campos
      : entidad.camposPorDefecto;

    let sql = `SELECT ${campos.join(', ')} FROM ${entidad.tabla}`;

    if (params.filtros && params.filtros.length > 0) {
      const condiciones = params.filtros.map(f => {
        const operador = f.operador || '=';
        const campoLower = f.campo.toLowerCase();

        // 🔹 DETECTAR FECHAS (YYYY-MM-DD)
        const esFecha =
          campoLower.includes('date') &&
          typeof f.valor === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(f.valor);

        // 🔹 FECHA → USAR RANGO
        if (esFecha && operador === '=') {
          return `
          ${f.campo} >= TO_DATE('${f.valor}', 'YYYY-MM-DD')
          AND ${f.campo} < TO_DATE('${f.valor}', 'YYYY-MM-DD') + 1
        `;
        }

        // 🔹 DETECTAR NÚMEROS
        const esNumero =
          typeof f.valor === 'number' || !isNaN(Number(f.valor));

        let valor = esNumero ? f.valor : `'${f.valor}'`;

        // 🔹 TEXTO → IGNORAR MAYÚSCULAS SOLO PARA LIKE
        if (!esNumero && operador === 'LIKE') {
          return `UPPER(${f.campo}) LIKE UPPER(${valor})`;
        }

        return `${f.campo} ${operador} ${valor}`;
      });

      sql += ` WHERE ${condiciones.join(' AND ')}`;
    }

    if (params.orden && params.orden.campo) {
      const direccion = params.orden.descendente ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${params.orden.campo} ${direccion}`;
    }

    // 🔹 LÍMITE MÁXIMO = 25
    const LIMITE_MAXIMO = 25;

    const limite = Math.min(
      Number(params.limite) || LIMITE_MAXIMO,
      LIMITE_MAXIMO
    );

    sql += ` FETCH FIRST ${limite} ROWS ONLY`;

    return sql;
  }

  function construirSuiteQLCount(params) {
    const entityType = params.entityType.toLowerCase();
    const entidad = ENTIDADES[entityType];

    let sql = `SELECT COUNT(*) AS total FROM ${entidad.tabla}`;

    if (params.filtros && params.filtros.length > 0) {
      const condiciones = params.filtros.map(f => {
        const operador = f.operador || '=';
        const campoLower = f.campo.toLowerCase();

        const esFecha =
          campoLower.includes('date') &&
          typeof f.valor === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(f.valor);

        if (esFecha && operador === '=') {
          return `
          ${f.campo} >= TO_DATE('${f.valor}', 'YYYY-MM-DD')
          AND ${f.campo} < TO_DATE('${f.valor}', 'YYYY-MM-DD') + 1
        `;
        }

        const esNumero =
          typeof f.valor === 'number' || !isNaN(Number(f.valor));

        let valor = esNumero ? f.valor : `'${f.valor}'`;

        if (!esNumero && operador === 'LIKE') {
          return `UPPER(${f.campo}) LIKE UPPER(${valor})`;
        }

        return `${f.campo} ${operador} ${valor}`;
      });

      sql += ` WHERE ${condiciones.join(' AND ')}`;
    }

    return sql;
  }

  function EjecutarAnalisisIA(params) {
    try {

      /* =========================
       * VALIDAR CUOTA LLM (NO TOCAR 19950)
       * ========================= */
      function checkLLMQuota(llm, margin = 19950) {
        try {
          const usage = llm.getRemainingFreeUsage();
          log.debug("LLM usage", usage);

          if (typeof usage === 'number') {
            return { ok: usage > margin, remaining: usage, resetDate: null };
          }

          if (usage && typeof usage === 'object' && typeof usage.remainingRequests === 'number') {
            return {
              ok: usage.remainingRequests > margin,
              remaining: usage.remainingRequests,
              resetDate: usage.resetDate || null
            };
          }

          return { ok: false, remaining: 0, resetDate: null };
        } catch (e) {
          log.error('LLM QUOTA ERROR', e);
          return { ok: false, remaining: 0, resetDate: null };
        }
      }

      /* =========================
       * LIMPIAR RESPUESTA IA
       * ========================= */
      function limpiarRespuestaIA(text) {
        if (!text) return text;
        return text.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      /* =========================
       * SCHEMA ENRIQUECIDO
       * ========================= */
      const schema = {
        customer: {
          type: search.Type.CUSTOMER,

          campos: {
            entityid: {
              tipo: "texto",
              descripcion: "Código o identificador del cliente."
            },
            companyname: {
              tipo: "texto",
              descripcion: "Nombre legal del cliente."
            },
            altname: {
              tipo: "texto",
              descripcion: "Nombre mostrado del cliente."
            },
            email: {
              tipo: "texto",
              descripcion: "Correo electrónico."
            },
            phone: {
              tipo: "texto",
              descripcion: "Teléfono."
            },
            category: {
              tipo: "lista",
              descripcion: "Categoría del cliente."
            },
            isinactive: {
              tipo: "booleano",
              descripcion: "Cliente inactivo."
            },
            datecreated: {
              tipo: "fecha",
              formato: "DD/MM/YYYY",
              descripcion: "Fecha de creación."
            }
          },

          camposPorDefecto: [
            'entityid',
            'companyname',
            'altname',
            'email',
            'phone'
          ]
        }
      };

      /* =========================
       * VALIDACIONES
       * ========================= */
      const entity = (params.entity || 'customer').toLowerCase();
      const userQuery = params.query;

      if (!userQuery) {
        return [{ CODIGO: "400", DESCRIPCION: "Debe enviar query" }];
      }

      if (!schema[entity]) {
        return [{ CODIGO: "400", DESCRIPCION: "Entidad no soportada" }];
      }

      /* =========================
       * VALIDAR CUOTA IA (19950)
       * ========================= */
      const quota = checkLLMQuota(llm);
      if (!quota.ok) {
        return [{
          CODIGO: "429",
          DESCRIPCION: "IA deshabilitada por límite de uso",
          REMAINING_REQUESTS: quota.remaining,
          RESET_DATE: quota.resetDate
        }];
      }

      const entitySchema = schema[entity];
      const camposDisponibles = Object.keys(entitySchema.campos);

      /* =========================
       * IA INTERPRETA CONSULTA (ÚNICA LLAMADA)
       * ========================= */
      const aiRaw = llm.generateText({
        prompt: `
Devuelve SOLO JSON (sin markdown).

Estructura:
{
  "filters": {},
  "fields": []
}

Campos disponibles y su significado:
${camposDisponibles.map(c => {
          const f = entitySchema.campos[c];
          return `- ${c} (${f.tipo}${f.formato ? ", formato " + f.formato : ""}): ${f.descripcion}`;
        }).join('\n')}

Reglas:
- Usa SOLO los campos listados
- Si no hay campos explícitos usa los campos por defecto
- Usa datecreated para preguntas de creación o antigüedad

Pregunta:
"${userQuery}"
`
      }).text;

      let instruction;
      try {
        instruction = JSON.parse(limpiarRespuestaIA(aiRaw));
      } catch (e) {
        return [{
          CODIGO: "500",
          DESCRIPCION: "Respuesta IA inválida",
          RAW: aiRaw
        }];
      }

      /* =========================
       * CAMPOS
       * ========================= */
      let fields = Array.isArray(instruction.fields) && instruction.fields.length
        ? instruction.fields.filter(f => camposDisponibles.includes(f))
        : entitySchema.camposPorDefecto;

      if (!fields.length) fields = entitySchema.camposPorDefecto;

      /* =========================
       * FILTROS (100% DINÁMICOS)
       * ========================= */
      const filters = [];

      if (instruction.filters && typeof instruction.filters === 'object') {
        Object.keys(instruction.filters).forEach(field => {
          if (!camposDisponibles.includes(field)) return;

          const value = instruction.filters[field];
          const meta = entitySchema.campos[field];

          if (value === null || value === undefined) return;

          switch (meta.tipo) {
            case 'texto':
              filters.push([field, 'contains', value]);
              break;

            case 'booleano':
              filters.push([field, 'is', value ? 'T' : 'F']);
              break;

            case 'fecha':
              filters.push([field, 'on', value]);
              break;

            case 'lista':
              filters.push([field, 'anyof', value]);
              break;
          }
        });
      }

      /* =========================
       * SEARCH
       * ========================= */
      const data = [];
      let count = 0;

      const srch = search.create({
        type: entitySchema.type,
        filters,
        columns: fields.map(f => search.createColumn({ name: f }))
      });

      log.debug("FIELDS", fields);
      log.debug("FILTERS", filters);

      srch.run().each(r => {
        if (count >= 20) return false;

        const row = {};
        fields.forEach(f => {
          row[f] = r.getValue({ name: f }) || r.getText({ name: f });
        });

        data.push(row);
        count++;
        return true;
      });

      if (!data.length) {
        return [{ CODIGO: "204", DESCRIPCION: "No se encontraron registros" }];
      }

      /* =========================
       * RESPUESTA FINAL (SIN IA)
       * ========================= */
      return [{
        CODIGO: "200",
        ENTITY: entity,
        FIELDS: fields,
        FILTERS_APPLIED: filters,
        DATA: data
      }];

    } catch (err) {
      log.error('EjecutarAnalisisIA ERROR', err);
      return [{ CODIGO: "500", DESCRIPCION: "Error interno" }];
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  function GenerarLogSeguimientoCorreo(context) {
    try {

      let objRecord = record.create({ type: 'customrecord_ht_log_correo_automatico', isDynamic: true });

      objRecord.setValue({ fieldId: 'custrecord_proceso_ht_log_cor_aut', value: context.proceso });
      objRecord.setValue({ fieldId: 'custrecord_correo_origen_ht_log_cor_aut', value: context.correo });

      var texto = (typeof context.data === 'string' && context.data.length > 0)
        ? context.data.replace(/[\r\n]+/g, ' ').substring(0, 3999)
        : '';

      objRecord.setValue({ fieldId: 'custrecord_traza_ht_log_cor_aut', value: texto });


      // objRecord.setValue({ fieldId: 'custrecord_archivo_ht_log_cor_aut', value: context.archivo });

      var texto2 = (typeof context.archivo === 'string' && context.archivo.length > 0)
        ? context.archivo.replace(/[\r\n]+/g, ' ').substring(0, 3999)
        : '';

      objRecord.setValue({ fieldId: 'custrecord_archivo_ht_log_cor_aut', value: texto2 });

      objRecord.setValue({ fieldId: 'custrecord_can_reg_ht_log_cor_aut', value: context.cantidad_registro });
      objRecord.setValue({ fieldId: 'custrecord_c_pdf_ht_log_cor_aut', value: context.total_pdf });
      objRecord.setValue({ fieldId: 'custrecord_c_img_ht_log_cor_aut', value: context.total_imagen });
      objRecord.setValue({ fieldId: 'custrecord_c_txt_ht_log_cor_aut', value: context.total_texto });

      return objRecord.save();

    } catch (error) {
      log.error('Error en generarLogCambioEstado', error.stack);
    }
  }

  //
  function getApiData(representante_ventas) {
    try {
      log.audit("aqui")

      let loginApiToken = _toolkit.loginGetToken();
      let params = {
        pais: 'ECUADOR',
        anio: 2026,
        mes: 5,
        caso: 0
      };

      let urlBase = "https://www.hunteronline.com.ec:2023/ApiNetsuite/Factura/Cumplimiento";
      let queryString = Object.keys(params)
        .map(key => `${key}=${params[key]}`)
        .join('&');
      let urlCompleta = `${urlBase}?${queryString}`;

      log.debug("URL Completa", urlCompleta)

      let headersConsulta = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginApiToken}`,
      };

      let response = https.get({
        url: urlCompleta,
        headers: headersConsulta,
      });

      log.audit("Response completo", response)
      log.audit("Response body", response.body)

      let data = JSON.parse(response.body);

      log.audit("Data parseada", data)
      // log.audit("data.results", data.results)
      log.audit("data.results.Table", data.Table)

      let tabla = data.Table;

      // Llamar a la función que transforma los datos
      let resultado = transformarDatos(tabla);

      return resultado;

    } catch (error) {
      log.error("error en getApiData", error);
      return null;
    }
  }
  //

  function transformarDatos(tabla) {
    try {
      // Obtener fecha-hora actual en formato String
      let ahora = new Date();
      let fechaHoraString = ahora.getFullYear() + '-' +
        String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
        String(ahora.getDate()).padStart(2, '0') + ' ' +
        String(ahora.getHours()).padStart(2, '0') + ':' +
        String(ahora.getMinutes()).padStart(2, '0') + ':' +
        String(ahora.getSeconds()).padStart(2, '0');

      // Inicializar variables
      let cumplimientoTotal = 0;
      let presupuestoTotal = 0;
      let sumaPorSucursal = {};
      let sumaPorMes = {};
      let pais = '';

      // Procesar tabla
      for (let i = 0; i < tabla.length; i++) {
        let fila = tabla[i];

        // Sumatoria total
        cumplimientoTotal += fila.CUMPLIMIENTO;
        presupuestoTotal += fila.PRESUPUESTO;

        // Obtener país
        if (!pais) {
          pais = fila.PAIS;
        }

        // Sumatoria por Sucursal
        if (!sumaPorSucursal[fila.SUCURSAL]) {
          sumaPorSucursal[fila.SUCURSAL] = {
            cumplimiento: 0,
            presupuesto: 0
          };
        }
        sumaPorSucursal[fila.SUCURSAL].cumplimiento += fila.CUMPLIMIENTO;
        sumaPorSucursal[fila.SUCURSAL].presupuesto += fila.PRESUPUESTO;

        // Sumatoria por Mes
        if (!sumaPorMes[fila.MES_NOMBRE]) {
          sumaPorMes[fila.MES_NOMBRE] = {
            cumplimiento: 0,
            presupuesto: 0
          };
        }
        sumaPorMes[fila.MES_NOMBRE].cumplimiento += fila.CUMPLIMIENTO;
        sumaPorMes[fila.MES_NOMBRE].presupuesto += fila.PRESUPUESTO;
      }

      // Convertir porSucursal de objeto a array
      let porSucursalArray = [];
      for (let sucursal in sumaPorSucursal) {
        porSucursalArray.push({
          sucursal: sucursal,
          cumplimiento: sumaPorSucursal[sucursal].cumplimiento,
          presupuesto: sumaPorSucursal[sucursal].presupuesto
        });
      }

      // Convertir porMes de objeto a array
      let porMesArray = [];
      for (let mes in sumaPorMes) {
        porMesArray.push({
          mes: mes,
          cumplimiento: sumaPorMes[mes].cumplimiento,
          presupuesto: sumaPorMes[mes].presupuesto
        });
      }

      // Crear objeto final
      let resultado = {
        fechaHoraGeneracion: fechaHoraString,
        pais: pais,
        totalGeneral: {
          cumplimiento: cumplimientoTotal,
          presupuesto: presupuestoTotal
        },
        porSucursal: porSucursalArray,
        porMes: porMesArray
      };

      return resultado;

    } catch (error) {
      log.error("error en transformarDatos", error);
      return null;
    }
  }

  function _put() {
    //put
  }

  function _delete() {
    //delete
  }

  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete,
  };
});