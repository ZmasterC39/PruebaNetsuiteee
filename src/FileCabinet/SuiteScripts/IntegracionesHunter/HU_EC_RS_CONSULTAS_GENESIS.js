/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(["N/log", "N/record", "N/search", "N/query"], function (log, record, search, query) {
  function _get(context) {
    try {
      log.debug("context", context);
      return context;
    } catch (error) {
      log.error("error", error.message);
      return "id:400, No se pudo insertar el registro. Error controlado.";
    }
  }

  function _post(context) {
    try {
      let ResultadoConsulta = null;
      let OpcionConsulta = context.accion;

      switch (OpcionConsulta) {
        case "General":                              
         log.debug("General", context);
          //ResultadoConsulta = GeneralCliente(context);
          let ResultadoDatos = DatosCliente(context);
          let ResultadoDireccion = DireccionCliente(context);
          let ResultadoTelefono = TelefonoCliente(context);
          let ResultadoVehiculos = VehiculosCliente(context);
          let ResultadoCobertura = VehiculosGeneralesCliente(context);
          log.debug("Resultado General", ResultadoConsulta);
          return { results : {
             "Datos":        ResultadoDatos  , 
             "Direcciones":  ResultadoDireccion , 
             "Telefonos":    ResultadoTelefono  , 
             "Vehiculos":    ResultadoVehiculos ,
             "Cobertura":    ResultadoCobertura
            } 
          }; 
        case "ModoContacto":                                   // Actualizado 31-01-2025
          log.debug("ModoContacto", context);
          ResultadoConsulta = ModoContacto();
          log.debug("Resultado ModoContacto", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "DatosCliente":                                   // Actualizado 31-01-2025
          log.debug("DatosCliente", context);
          ResultadoConsulta = DatosCliente(context);
          log.debug("Resultado DatosCliente", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "DireccionCliente":                               // Actualizado 31-01-2025
          log.debug("DireccionCliente", context);
          ResultadoConsulta = DireccionCliente(context);
          log.debug("Resultado DireccionCliente", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "TelefonoCliente":                                // Actualizado 31-01-2025
          log.debug("TelefonoCliente", context);
          ResultadoConsulta = TelefonoCliente(context);
          log.debug("Resultado TelefonoCliente", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "Telefono":                                       // Actualizado 31-01-2025
          log.debug("Telefono", context);
          ResultadoConsulta = Telefono(context);
          log.debug("Resultado Telefono", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "VehiculosCliente":                               // Actualizado 31-01-2025
          log.debug("VehiculosCliente", context);
          ResultadoConsulta = VehiculosCliente(context);
          log.debug("Resultado VehiculosCliente", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "VehiculosClientePlaca":                               // Actualizado 31-01-2025
          log.debug("VehiculosClientePlaca", context);
          ResultadoConsulta = VehiculosClientePlaca(context);
          log.debug("Resultado VehiculosClientePlaca", ResultadoConsulta);
          return { results: ResultadoConsulta };


        case "ProductoVehiculo":                               // Actualizado 31-01-2025
          log.debug("ProductoVehiculo", context);
          ResultadoConsulta = ProductoVehiculo(context, false);
          log.debug("Resultado ProductoVehiculo", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "ResultadoGestion":                               // Actualizado 31-01-2025
          log.debug("ResultadoGestion", context);
          ResultadoConsulta = ResultadoGestion();
          log.debug("Resultado ResultadoGestion", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "Motivo":                                         // Actualizado 31-01-2025
          log.debug("Motivo", context);
          ResultadoConsulta = Motivo(context);
          log.debug("Resultado Motivo", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "ConsultaTipificaionesPorCola":                   // Actualizado 31-01-2025
          log.debug("ConsultaTipificaionesPorCola", context);
          ResultadoConsulta = ConsultaTipificaionesPorCola(context);
          log.debug("Resultado ConsultaTipificaionesPorCola", ResultadoConsulta);
          return { results: ResultadoConsulta };

        case "RegistraSeguimiento":                            // Actualizado 31-01-2025
          log.debug("RegistraSeguimiento", context);

          try {                           // Registro de seguimiento en caso de que la consulta de homologación genesys no arroje resultados, para no perder la información ingresada por el agente
            crearRegistroGen(context);

          } catch (error) {
            log.debug("No se pudo Guardar")
          }

          ResultadoConsulta = RegistraSeguimiento(context);
          log.debug("Resultado RegistraSeguimiento", ResultadoConsulta);
          return { results: ResultadoConsulta };

        /**
         * Sin Informacion 
         */
        case "ConsultaHomologacionCliente":
          ResultadoConsulta = ConsultaHomologacionCliente(context);
          return { status: "success", resultado: ResultadoConsulta };

        case "CorreoEmpleado":
          ResultadoConsulta = CorreoEmpleado(context);
          return { status: "success", resultado: ResultadoConsulta };

        case "DatoGenesisCliente":
          ResultadoConsulta = DatoGenesisCliente(context);
          return { status: "success", resultado: ResultadoConsulta };

        default:
          return "id:400, tipo de busqueda no valida";
      }
    } catch (error) {
      log.error("error", { message: error.message, stack: error.stack });
      return { results: [{ "CODIGO": "404", "DESCRIPCION": "not found" }] };
    }
  }

  // ModoContacto - OK
  function ModoContacto() {
    try {
      let resultado = [];

      let searchObj = search.create({
        type: "customrecord_ht_sc_modocontacto",
        filters: [
          ['custrecord_ht_md_codigotabla', 'is', 'FCC']
        ],
        columns: [
          search.createColumn({
            name: "custrecord_ht_md_codigo",
            label: "HT modo contacto Código",
          }),
          search.createColumn({
            name: "custrecord_ht_md_descripcion",
            label: "HT modo contacto DESCRIPCION",
          }),
          search.createColumn({
            name: "internalid",
            label: "ID interno",
            sort: search.Sort.ASC,
          }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO: result.getValue({ name: "custrecord_ht_md_codigo" }),
          DESCRIPCION: result.getValue({ name: "custrecord_ht_md_descripcion" }),
        });
        return true;
      });

      return resultado;
    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }

  
  // DatosCliente - OK
  function DatosCliente(data) {
    try {
      let resultado = [];

      if (data.codigocliente == null || data.codigocliente == "") {
        throw new Error("No se ha proporcionado el código del cliente, datosCliente");
      }

      let searchObj = search.create({
        type: "customer",
        filters: [
          ["vatregnumber", "is", data.codigocliente],
        ],
        columns: [
          search.createColumn({ name: "altname", label: "Nombre" }),
          search.createColumn({ name: "custentity_atencion_especial", label: "Tipo" }),
          search.createColumn({ name: "category", label: "Categoria" }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          NOMBRE_COMPLETO: result.getValue({ name: "altname" }),
          TIPO_ATENCION:  result.getText({ name: "custentity_atencion_especial" }) ? result.getText({ name: "custentity_atencion_especial" }) : "NO DEFINIDO",
          TIPO_CLIENTE : result.getText({ name: "category" }) ? result.getText({ name: "category" }) : ""
        });
        return true;
      });

      if (resultado && resultado?.length > 0) {
        return resultado;
      } else {
        throw new Error("No se encontraron resultados para el cliente proporcionado");
      }

    } catch (error) {

      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }

  }

  // DireccionCliente - OK
  function DireccionCliente(data) {
    try {
      if (data.codigocliente == null || data.codigocliente == "") {
        return [{ "TIPO_DIRECCION": "", "TIPO": "", "DIRECCION": "" }];
      }

      log.debug("---data---", data);
      
      let resultadoDireccion = [];
      let idCliente = 0;
      idCliente = DatosClienteInterno(data?.codigocliente)[0]?.CLIENTE_IDENTIFICADOR || 0;

      if (idCliente == 0) {
        throw new Error("No se ha proporcionado el código del cliente, direccionCliente");
      }

      let info_correo = false;

      // Búsqueda de direcciones del cliente
      const searchObj = search.create({
        type: "customer",
        // filters: [["stage", "anyof", "CUSTOMER"], "AND", ["internalid", "is", data.codigocliente], "AND", ["isinactive", "is", "F"]],
        filters: [
          ["stage", "anyof", "CUSTOMER"],
          "AND",
          ["internalid", "is", idCliente],
          "AND",
          ["isinactive", "is", "F"],
        ],
        // filters: [["stage", "anyof", "CUSTOMER"], "AND", ['vatregnumber', 'is', data.codigocliente], "AND", ["isinactive", "is", "F"]],
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
            name: "email",
          }),
        ],
      });

      searchObj.run().each((result) => {
        info_correo = result.getValue({ name: "email" })

        const tipoDireccionTexto = result.getText({
          name: "custrecord_ht_direccion_tipo",
          join: "Address",
        });
        const tipoDireccionCodigo =
          obtenerCodigoTipoDireccion(tipoDireccionTexto);

        resultadoDireccion.push({
          TIPO_DIRECCION: tipoDireccionCodigo,
          TIPO: tipoDireccionTexto,
          DIRECCION: result.getValue({ name: "address1", join: "Address" }) ?? "",
        });

        return true;
      });

      // Búsqueda de correos electrónicos del cliente
      const searchObj2 = search.create({
        type: "customrecord_ht_record_correoelectronico",
        filters: [["custrecord_ht_ce_enlace", "is", idCliente]],
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

      let cantidadCorreos = searchObj2.runPaged().count;

      // log.debug("cantidadCorreos", cantidadCorreos);

      searchObj2.run().each((result) => {
        const tipoEmailTexto = result.getText({
          name: "custrecord_ht_email_tipoemail",
        });
        const tipoEmailCodigo = obtenerCodigoTipoDireccion(tipoEmailTexto);

        resultadoDireccion.push({
          TIPO_DIRECCION: tipoEmailCodigo,
          TIPO: tipoEmailTexto,
          DIRECCION: result.getValue({ name: "custrecord_ht_email_email" }) ?? "",
        });
        return true;
      });

      if (cantidadCorreos == 0 && info_correo) {
        // log.debug("--info_correo", info_correo);

        if (info_correo) {
          resultadoDireccion.push({
            TIPO_DIRECCION: "004",
            TIPO: "EMAIL",
            DIRECCION: info_correo,
          });
        }
      }

      if (resultadoDireccion && resultadoDireccion.length > 0) {
        return resultadoDireccion;
      } else {
        throw new Error("No se encontraron direcciones para el cliente");
      }

    } catch (error) {
      log.debug("error", { error: error.message, stack: error.stack });
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];

    }
  }

  // TelefonoCliente - OK
  function TelefonoCliente(data) {
    try {

      if (data.codigocliente == null || data.codigocliente == "") {
        return [{ "CODIGO": "", "TIPO": "", "TELEFONO": "" }];
      }

      let resultado = [];
      let idCliente = DatosClienteInterno(data?.codigocliente)[0]?.CLIENTE_IDENTIFICADOR || 0;

      if (idCliente == 0) { throw new Error("No se ha proporcionado el código del cliente, telefonocliente"); }

      let searchObj = search.create({
        type: "customrecord_ht_registro_telefono",
        filters: [["custrecord_ht_campo_lbl_entidad_telefono", "is", idCliente]],
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

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        let TC_Celular = "004";
        let TC_Fijo = "010";
        let TT_Celular = "CELULAR";
        let TT_Fijo = "TELEFONO CONVENCIONAL";

        let searchObj = search.create({
          type: "customer",
          filters: [["internalid", "is", idCliente]],
          columns: [
            search.createColumn({ name: "phone", label: "celular" }),
            search.createColumn({ name: "homephone", label: "telefono" }),
          ],
        });

        searchObj.run().each(function (result) {
          let numeroEncontradoCelular = result.getValue({ name: "phone" });
          let numeroEncontradoFijo = result.getValue({ name: "homephone" });
          // log.debug("numeroEncontradoCelular", numeroEncontradoCelular);
          // log.debug("numeroEncontradoFijo", numeroEncontradoFijo);

          if (numeroEncontradoCelular) {
            resultado.push({
              CODIGO: TC_Celular,
              TIPO: TT_Celular,
              TELEFONO: formatearTelefono(numeroEncontradoCelular),
            });
          }
          if (numeroEncontradoFijo) {
            resultado.push({
              CODIGO: TC_Fijo,
              TIPO: TT_Fijo,
              TELEFONO: formatearTelefono(numeroEncontradoFijo),
            });
          }
          return true;
        });

        if (resultado && resultado.length > 0) {
          return resultado;
        } else {
          return [{ "CODIGO": "", "TIPO": "", "TELEFONO": "" }];
        }
      }
    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }

  // Telefono   - OK
  function Telefono(data) {
    try {
      let resultado = [];

      if (data.telefono == null || data.telefono == "") {
        throw new Error("No se ha proporcionado el número de teléfono");
      }

      let validarnumerotelefono = validarNumero(data.telefono);
      if (!validarnumerotelefono) {
        throw new Error("El número de teléfono proporcionado no es válido");
      }

      let infclientefortelefono = DataClienteForTelefono(data?.telefono);

      // log.debug("infcliente", infclientefortelefono);

      if (infclientefortelefono.length > 0) {
        for (let i = 0; i < infclientefortelefono.length; i++) {

          let infcorreo = (CorreoCliente(infclientefortelefono[i].id_internal) || (infclientefortelefono[i]?.correo || ""));
          let infCelular = TelefonoGeneralClienteEx(infclientefortelefono[i].id_internal, 4);
          let infTelefono = TelefonoGeneralClienteEx(infclientefortelefono[i].id_internal, 29);
          let infDireccionEx = DireccionEx(infclientefortelefono[i].id_internal);

          // return true;
          let infBienCliente = BienCliente(infclientefortelefono[i].id_internal);

          // log.debug("infBienCliente", infBienCliente);

          if (infBienCliente.length > 0) {
            for (let y = 0; y < infBienCliente.length; y++) {

              let infCobertura = ProductoVehiculo({ codigoVehiculo: infBienCliente[y].CODIGO }, true);
              // log.debug("infCobertura", infCobertura);

              if (infCobertura && infCobertura.length > 0) {
                for (let y2 = 0; y2 < infCobertura.length; y2++) {
                  let nombre_cliente = obtenerMayorNombre(infclientefortelefono[i]);
                  resultado.push({
                    ID_CLIENTE: infclientefortelefono[i]?.identificacion || "",
                    NOMBRE_COMPLETO: nombre_cliente || "",
                    TELEFONO: (infTelefono?.TELEFONO ? transformarNumeroGeneral(infTelefono?.TELEFONO) : "") || "",
                    CELULAR: (infCelular?.TELEFONO ? transformarNumeroGeneral(infCelular?.TELEFONO) : "") || "",
                    EMAIL: infcorreo?.DIRECCION || "",
                    PLACA: infBienCliente[y].PLACA,
                    MARCA: infBienCliente[y].MARCA,
                    MODELO: infBienCliente[y].MODELO,
                    CONCESIONARIO: infBienCliente[y].CONCESIONARIO,
                    CODIGO: infBienCliente[y].CODIGO,
                    CIUDAD: infDireccionEx.CIUDAD,
                    PRODUCTO: infCobertura[y2].FAMILIA || "",
                  });
                }
              } else {
                let nombre_cliente = obtenerMayorNombre(infclientefortelefono[i]);
                resultado.push({
                  ID_CLIENTE: infclientefortelefono[i]?.identificacion || "",
                  NOMBRE_COMPLETO: nombre_cliente || "",
                  TELEFONO: (infTelefono?.TELEFONO ? transformarNumeroGeneral(infTelefono?.TELEFONO) : "") || "",
                  CELULAR: (infCelular?.TELEFONO ? transformarNumeroGeneral(infCelular?.TELEFONO) : "") || "",
                  EMAIL: infcorreo.DIRECCION,
                  PLACA: infBienCliente[y].PLACA,
                  MARCA: infBienCliente[y].MARCA,
                  MODELO: infBienCliente[y].MODELO,
                  CONCESIONARIO: infBienCliente[y].CONCESIONARIO,
                  CODIGO: infBienCliente[y].CODIGO,
                  CIUDAD: infDireccionEx.CIUDAD,
                  PRODUCTO: "",
                });
              }
            }
          }
        }
      }

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "not found"
        }];
      }

    } catch (error) {

      log.error("error", { error: error.message, stack: error.stack });
      return ([{
        ID_CLIENTE: "",
        NOMBRE_COMPLETO: "",
        TELEFONO: "",
        CELULAR: "",
        EMAIL: "",
        PLACA: "",
        MARCA: "",
        MODELO: "",
        CONCESIONARIO: "",
        CODIGO: "",
        CIUDAD: "",
        PRODUCTO: "",
      }])
    }
  }

  // VehiculosCliente - OK
  function VehiculosCliente(data) {
    try {
      let resultado = [];

      let idCliente = DatosClienteInterno(data?.codigocliente)[0]?.CLIENTE_IDENTIFICADOR || 0;

      if (idCliente == 0) { throw new Error("No se ha proporcionado el código del cliente, VehiculoCliente"); }

      let searchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [["custrecord_ht_bien_propietario", "is", idCliente]],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_bien_placa" }),
          search.createColumn({ name: "custrecord_ht_bien_motor" }),
          search.createColumn({ name: "custrecord_ht_bien_chasis" }),
          search.createColumn({ name: "altname" }),
        ],
      });
      let count = searchObj.runPaged().count;

      if (count > 0 && count < 1000) {
        searchObj.run().each(function (result) {
          resultado.push({
            CODIGO: result.getValue({ name: "internalid" }),
            PLACA: result.getValue({ name: "custrecord_ht_bien_placa" }),
            MOTOR: result.getValue({ name: "custrecord_ht_bien_motor" }),
            CHASIS: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            NOMBRE_COMPLETO: result.getValue({ name: "altname" }),
          });
          return true;
        });

        return resultado;
      } else {
        return [{
          "CODIGO": "",
          "PLACA": "",
          "MOTOR": "",
          "CHASIS": "",
          "NOMBRE_COMPLETO": "",
        }];
      }

    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }

  // VehiculosClientePlaca - OK
  function VehiculosClientePlaca(data) {
    try {
      let resultado = [];

      let idCliente = DatosClienteInterno(data?.codigocliente)[0]?.CLIENTE_IDENTIFICADOR || 0;

      if (idCliente == 0) { throw new Error("No se ha proporcionado el código del cliente, VehiculoCliente"); }

      let searchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
                   ["custrecord_ht_bien_propietario", "is", idCliente], 
                   "AND", ["custrecord_ht_bien_placa", "is", data?.placa]
                  ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_bien_placa" }),
          search.createColumn({ name: "custrecord_ht_bien_motor" }),
          search.createColumn({ name: "custrecord_ht_bien_chasis" }),
          search.createColumn({ name: "altname" }),
        ],
      });
      let count = searchObj.runPaged().count;

      if (count > 0 && count < 1000) {
        searchObj.run().each(function (result) {
          resultado.push({
            CODIGO: result.getValue({ name: "internalid" }),
            PLACA: result.getValue({ name: "custrecord_ht_bien_placa" }),
            MOTOR: result.getValue({ name: "custrecord_ht_bien_motor" }),
            CHASIS: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            NOMBRE_COMPLETO: result.getValue({ name: "altname" }),
          });
          return true;
        });

        return resultado;
      } else {
        return [{
          "CODIGO": "",
          "PLACA": "",
          "MOTOR": "",
          "CHASIS": "",
          "NOMBRE_COMPLETO": "",
        }];
      }
    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }
  
  // VehiculosGeneralesCliente - OK
    function VehiculosGeneralesCliente(data) {
    try {
      let resultado = [];
      let idCliente = DatosClienteInterno(data?.codigocliente)[0]?.CLIENTE_IDENTIFICADOR || 0;
      if (idCliente == 0) { throw new Error("No se ha proporcionado el código del cliente, VehiculoCliente"); }
      let searchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [["custrecord_ht_bien_propietario", "is", idCliente]],
        columns: [
          search.createColumn({ name: "internalid" }),
        ],
      });
      let count = searchObj.runPaged().count;
      if (count > 0 && count < 1000) {
        searchObj.run().each(function (resultCobertura) {
          searchObjVehiculo = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
              ["custrecord_ht_co_bien", "anyof", resultCobertura.getValue({ name: "internalid" })],
              "AND", 
              ["custrecord_ht_co_estado_cobertura","anyof","1","2"], // ACTIVO-SUSPENDIDO
              "AND",
              ["isinactive", "is", "F"]
            ],
            columns: [
              search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Familia de Producto" }),
              search.createColumn({ name: "custrecord_ht_co_producto", label: "HT CO Producto" }),
              search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
              search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
            ],
          });
          //let count2 = searchObjVehiculo.runPaged().count;
          //log.debug("resultado.........", count2);
          searchObjVehiculo.run().each((resultProducto) => {
              const familiaProducto = obtenerUnDato("customrecord_ht_cr_pp_valores", "custrecord_ht_pp_codigo", resultProducto.getValue({ name: "custrecord_ht_co_familia_prod" })) || "";
              const descripcionProducto = obtenerUnDato("customrecord_ht_cr_pp_valores", "custrecord_ht_pp_descripcion", resultProducto.getValue({ name: "custrecord_ht_co_familia_prod" })) || "";
              resultado.push({
                VehiculoID: resultCobertura.getValue({ name: "internalid" }),
                PRODUCTO: familiaProducto,
                DESC_PRODUCTO: descripcionProducto,
                COBERTURA: resultProducto.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                ESTADO: resultProducto.getText({ name: "custrecord_ht_co_estado_cobertura" }),
                FAMILIA: descripcionProducto,
              });
              return true;
          });
          //log.debug("resultado........1.....", searchObjVehiculo);
          return true;
        });
        return resultado;
      } else {
        return [{
          "VehiculoID": "",
          "PRODUCTO": "",
          "DESC_PRODUCTO": "",
          "COBERTURA": "",
          "ESTADO": "",
          "FAMILIA": "",
        }];
      }
    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }
  
  // ProductoVehiculo - OK
  function ProductoVehiculo(data, adicional) {

    try {
      if (data && (!data.codigovehiculo || data.codigovehiculo == "" || !validarNumero(data.codigovehiculo))) {
        throw new Error("No se ha proporcionado el código del vehículo");
      }

      const resultado = [];

      let searchObj = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", data.codigovehiculo],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Familia de Producto" }),
          search.createColumn({ name: "custrecord_ht_co_producto", label: "HT CO Producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
        ],
      });

      let count = searchObj.runPaged().count;
      if (count == 0) {

        let idVehiculo = ObtenerIDVehiculoSysID(data.codigovehiculo)

        // log.debug("idVehiculo-", idVehiculo)

        if (idVehiculo) {
          searchObj = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
              ["custrecord_ht_co_bien", "anyof", idVehiculo],
              "AND",
              ["isinactive", "is", "F"]
            ],
            columns: [
              search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Familia de Producto" }),
              search.createColumn({ name: "custrecord_ht_co_producto", label: "HT CO Producto" }),
              search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
              search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
            ],
          });

          let count2 = searchObj.runPaged().count;

          if (count2 == 0) {
            throw new Error("No se encontraron resultados para el vehículo proporcionado");
          }


        }

      }

      searchObj.run().each((result) => {

        const familiaProducto = obtenerUnDato("customrecord_ht_cr_pp_valores", "custrecord_ht_pp_codigo", result.getValue({ name: "custrecord_ht_co_familia_prod" })) || "";
        const descripcionProducto = obtenerUnDato("customrecord_ht_cr_pp_valores", "custrecord_ht_pp_descripcion", result.getValue({ name: "custrecord_ht_co_familia_prod" })) || "";

        if (adicional) {
          resultado.push({
            PRODUCTO: familiaProducto,
            DESC_PRODUCTO: descripcionProducto,
            FECHA: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            ESTADO: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
            ULTIMO_REPORTE: "",
            ULTIMO_CHEQUEO: "",
            FAMILIA: descripcionProducto,
          });

        } else {
          resultado.push({
            PRODUCTO: familiaProducto,
            DESC_PRODUCTO: descripcionProducto,
            FECHA: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            ESTADO: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
            ULTIMO_REPORTE: "",
            ULTIMO_CHEQUEO: "",
          });
        }

        return true;
      });

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        throw new Error("No se encontraron resultados para el vehículo proporcionado");
      }

    } catch (error) {
      return [{ "PRODUCTO": "", "DESC_PRODUCTO": "", "FECHA": "", "ESTADO": "", "ULTIMO_REPORTE": "", "ULTIMO_CHEQUEO": "" }];
    }
  }

  // ResultadoGestion - OK
  function ResultadoGestion() {
    try {
      let resultado = [];

      let searchObj = search.create({
        type: "customrecord_ht_resultadogestion",
        filters: [
          ["isinactive", "is", "F"],
          "AND",
          ["internalid", "anyof", ["1", "2", "3", "4", "5", "6", "7", "11", "12"]],
        ],
        columns: [
          search.createColumn({
            name: "name",
          }),
          search.createColumn({
            name: "custrecord_ht_rg_codigo",
            sort: search.Sort.ASC,
          }),
          search.createColumn({
            name: "internalid",
          }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO: result.getValue({ name: "custrecord_ht_rg_codigo" }),
          DESCRIPCION: result.getValue({ name: "name" }),
        });
        return true;
      });

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        return [{
          "CODIGO": "",
          "DESCRIPCION": ""
        }];
      }

    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];

    }


  }

  // Motivo - OK
  function Motivo(data) {
    try {
      if (data.resultadogestion == null || data.resultadogestion == "" || !validarNumero(data.resultadogestion)) {
        return [{
          "CODIGO": "",
          "DESCRIPCION": "",
          "CODIDO_RELACION_1": "",
        }];
      }

      let resultado = [];

      let idResultadoGestion = obtenerUnDatoPersonalizado("customrecord_ht_resultadogestion", "internalid", data.resultadogestion);

      log.debug("--idResultadoGestion--", idResultadoGestion);

      if (!idResultadoGestion) {
        return [{
          "CODIGO": "",
          "DESCRIPCION": "",
          "CODIDO_RELACION_1": ""
        }];
      }


      let searchObj = search.create({
        type: "customrecord_ht_sc_motivo",
        filters: [
          ["custrecord_ht_mt_codigo_resulgesiton", "is", idResultadoGestion],
        ],
        columns: [
          search.createColumn({
            name: "name",
          }),
          search.createColumn({
            name: "custrecord_ht_mt_codigo",
            sort: search.Sort.ASC,
          }),
          search.createColumn({
            name: "custrecord_ht_mt_codigo_resulgesiton",
          }),
          search.createColumn({
            name: "internalid",
          }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO: result.getValue({ name: "custrecord_ht_mt_codigo" }),
          DESCRIPCION: result.getValue({ name: "name" }),
          CODIDO_RELACION_1: data.resultadogestion,
        });
        return true;
      });

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        return [{
          "CODIGO": "",
          "DESCRIPCION": "",
          "CODIDO_RELACION_1": "",
        }];
      }

    } catch (error) {
      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];
    }
  }

  // ConsultaTipificaionesPorCola - OK
  function ConsultaTipificaionesPorCola(data) {
    try {

      let response = []

      if (data && !data.nom_cola) {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "Se requiere el nombre de la cola en el campo 'nom_cola', por favor verificar"
        }];
      };

      if (data && !data.contrasena) {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "La contraseña es incorrecta o no se ha proporcionado, por favor verificar"
        }];
      };

      if (data.contrasena !== 'd3v_c4rs3gs4_2024$$') {
        return [{
          "CODIGO": "400",
          "DESCRIPCION": "Bad Request - La contraseña no es correcta"
        }];
      }

      // Normaliza nom_cola: extrae el segmento que comienza con INB_ o OUT_
      // ya que Genesys puede enviar prefijos adicionales (ej: DAALMEOUT_RENOVACIONES → OUT_RENOVACIONES)
      // const nomColaOriginal = data.nom_cola; // valor original sin normalizar
      const matchCola = data.nom_cola.match(/((?:INB|OUT)_.+)/);
      const nomColaFiltro = matchCola ? matchCola[1] : data.nom_cola;

      const homologGenesysSearch = search.create({
        type: 'customrecordcustomrecord_ht_homologacion',
        filters: [
          // ['custrecord_genesys_colas', 'is', data.nom_cola], // antes se usaba el valor crudo
          ['custrecord_genesys_colas', 'is', nomColaFiltro],
          'AND',
          ['custrecord_genesys_subsidiaria', 'is', '2']
        ],
        columns: [
          'custrecord_genesys_cod_conclusion',
          'custrecord_genesys_nom_cod_conclusion',
          'custrecord_genesys_resultado_gestion',
          'custrecord_genesys_motivo',
          'custrecord_genesys_colas',
          'custrecord_genesys_cod_cola'
        ]
      });

      let count = homologGenesysSearch.runPaged().count;
      if (count == 0) {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "No se encontraron resultados para la cola proporcionada"
        }];
      }

      homologGenesysSearch.run().each(function (result) {
        const resultadoGestion = result.getValue('custrecord_genesys_resultado_gestion');
        const motivoGestion = result.getValue('custrecord_genesys_motivo');

        let estadoHunterSys = '';
        let motivoHunterSys = '';

        if (resultadoGestion) {
          const resultadosGestionSearch = search.create({
            type: 'customrecord_ht_resultadogestion',
            filters: [['internalid', 'is', resultadoGestion]],
            columns: ['custrecord_ht_rg_descripcion']
          });

          const resGestionResult = resultadosGestionSearch.run().getRange({ start: 0, end: 1 })[0];
          if (resGestionResult) {
            estadoHunterSys = resGestionResult.getValue('custrecord_ht_rg_descripcion') || "";
          }
        }

        if (motivoGestion) {
          const motivosGestionSearch = search.create({
            type: 'customrecord_ht_sc_motivo',
            filters: [['internalid', 'is', motivoGestion]],
            columns: ['custrecord_ht_mt_descripcion']
          });

          const motivoResult = motivosGestionSearch.run().getRange({ start: 0, end: 1 })[0];
          if (motivoResult) {
            motivoHunterSys = motivoResult.getValue('custrecord_ht_mt_descripcion') || "";
          }
        }

        response.push({
          "descripcion": result.getValue('custrecord_genesys_colas') || "",
          "ID_CAMPANA": result.getValue('custrecord_genesys_cod_cola') || "",
          "descripcion1": estadoHunterSys || "",
          "descripcion2": motivoHunterSys || "",
          "ID_MOTIVO_RESULTADO": result.getValue('custrecord_genesys_cod_conclusion') || "",
        });

        return true;
      });

      if (response && response.length > 0) {
        return response;
      } else {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "No se encontraron resultados para la cola proporcionada"
        }];
      }



    } catch (error) {
      log.debug('error', { message: error.message, stack: error.stack });

      return [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }];


    }
  }

  // RegistraSeguimiento - (En proceso)
  function RegistraSeguimiento(data) {
    try {
      let validarCamposGenesis = validarDataGenesis(data);

      if (validarCamposGenesis && !validarCamposGenesis.respuesta) {
        return validarCamposGenesis.Mensaje;
      }

      data.cliente = data.cliente.trim();

      let customer = buscarCliente(data.cliente);
      if (!customer) {
        throw new Error("No se encontró ningún cliente con el id proporcionado: " + data.cliente);
      }

      let employee = buscarEmpleado(data.ejecutivo);
      if (!employee) {
        throw new Error("No se encontró ningún empleado con el id proporcionado: " + data.ejecutivo);
      }

      let vehicle = buscarVehiculo(data.vehiculo);
      if (!vehicle) {

        let idVehiculo = ObtenerIDVehiculoSysID(data.vehiculo);

        log.debug("idVehiculo", idVehiculo) // 9500

        if (idVehiculo) {
          vehicle = buscarVehiculo(idVehiculo);
        } else {
          throw new Error("No se encontró ningún vehiculo con el id proporcionado: " + data.vehiculo);
        }
      }

      let homologGenesys = buscarHomologacionGenesys(data.idtipificacion);
      if (!homologGenesys) {
        log.debug("No se encontró ningún resultado de gestión con el id proporcionado: " + data.idtipificacion);
      }

      let idModoContacto = obtenerIdModoContacto(data, 'modocontacto');
      let idformaproximocontacto = obtenerIdModoContacto(data, 'formaproximocontacto');

      if (idModoContacto == 0) {
        throw new Error("Error al obtener el modo de contacto o la forma de proximo contacto");
      }

      let idSeguimientoCliente = crearSeguimientoCliente(data, customer, employee, vehicle, homologGenesys, idModoContacto, idformaproximocontacto);

      log.debug("idSeguimientoCliente", {
        data, customer, employee, vehicle, homologGenesys, idModoContacto, idformaproximocontacto
      });

      if (!idSeguimientoCliente) {
        throw new Error("Error al generar seguimiento");
      } else {
        return [{
          "CODIGO": "200",
          "DESCRIPCION": "Seguimiento generado correctamente"
        }];
      }

    } catch (error) {
      log.error('error', { message: error.message, stack: error.stack });
      return [{
        "CODIGO": "404",
        "DESCRIPCION": error.message
      }];
    }
  }

  // ConsultaHomologacionCliente - (?)
  function ConsultaHomologacionCliente(data) {

    try {
      let resultado = [];

      if (!data.codigoGenesys) {
        return resultado;
      }

      let searchObj = search.create({
        type: "customrecordcustomrecord_ht_homologacion",
        filters: [
          ["custrecord_genesys_cod_conclusion", "is", data.codigoGenesys],
        ],
        columns: [
          search.createColumn({ name: "custrecord_genesys_cod_conclusion" }),
          search.createColumn({ name: "custrecord_genesys_resultado_gestion" }),
          search.createColumn({ name: "custrecord_genesys_motivo" }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          COD_TIPI_GENESYS: result.getValue({
            name: "custrecord_genesys_cod_conclusion",
          }),
          CODIGO_ESTADO:
            HTResultadogestion(
              result.getValue({ name: "custrecord_genesys_resultado_gestion" })
            )?.CODIGO_GESTION || "",
          CODIGO_MOTIVO:
            HTSCMotivo(result.getValue({ name: "custrecord_genesys_motivo" }))
              ?.CODIGO_MOTIVO || "",
        });
        return true;
      });

      if (resultado && resultado.length > 0) {
        return resultado;
      } else {
        throw new Error("not found");
      }

    } catch (error) {
      log.error('error', { message: error.message, stack: error.stack });
      return [{
        "CODIGO": "404",
        "DESCRIPCION": error.message
      }];
    }
  }

  // CorreoEmpleado - (?)
  function CorreoEmpleado(data) {

    try {
      let resultadoCorreo = [];
      // Búsqueda de correo del Empleado
      const searchObj = search.create({
        type: "employee",
        filters: [["email", "is", data.correousu]],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "entityid" }),
          search.createColumn({ name: "firstname" }),
        ],
      });

      // count
      let count = searchObj.runPaged().count;
      log.debug("count", count);

      searchObj.run().each((result) => {
        resultadoCorreo.push({
          CODIGO_USUARIO: result.getValue({ name: "entityid" }),
        });
        return true;
      });


      if (resultadoCorreo && resultadoCorreo.length > 0) {
        return resultadoCorreo;
      } else {
        throw new Error("not found");
      }


    } catch (error) {
      log.error('error', { message: error.message, stack: error.stack });
      return [{
        "CODIGO": "404",
        "DESCRIPCION": error.message
      }];
    }

  }

  // DatoGenesisCliente - (?)
  function DatoGenesisCliente(Body) {

    try {
      let resultadoDatoGenesisCliente = "";
      let idCliente = DatosClienteInterno(Body?.cliente)[0]?.CLIENTE_IDENTIFICADOR || 0;


      if (idCliente == 0) {
        return [{
          "CODIGO": "404",
          "DESCRIPCION": "not found"
        }];
      }

      // Búsqueda de DatoGenesisCliente
      const searchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
          ["custrecord_ht_bien_placa", "is", Body.dato],
          "AND",
          ["custrecord_ht_bien_propietario", "is", idCliente],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "altname" }), // Eliminado entityid ya que no es válido
        ],
      });

      const results = searchObj.run().getRange({ start: 0, end: 1 });

      if (results.length > 0) {
        resultadoDatoGenesisCliente = "Cliente Valido";
      } else {
        resultadoDatoGenesisCliente = "Cliente No Valido";
      }

      if (resultadoDatoGenesisCliente && resultadoDatoGenesisCliente.length > 0) {
        return resultadoDatoGenesisCliente;
      } else {
        throw new Error("not found");
      }

    } catch (error) {
      log.error('error', { message: error.message, stack: error.stack });
      return [{
        "CODIGO": "404",
        "DESCRIPCION": error.message
      }];
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

  function DatosClienteInterno(data) {
    try {
      let resultado = [];

      let searchObj = search.create({
        type: "customer",
        filters: [["vatregnumber", "is", data]],
        columns: [
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "altname", label: "Nombre" }),
        ],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CLIENTE_IDENTIFICADOR: result.getValue({ name: "internalid" }),
        });
        return true;
      });

      return resultado;
    } catch (error) {
      return { CLIENTE_IDENTIFICADOR: 0 };
    }
  }

  function HTSCMotivo(data) {
    try {
      let resultado = [];
      let searchObj = search.create({
        type: "customrecord_ht_sc_motivo",
        filters: [["internalid", "is", data]],
        columns: [search.createColumn({ name: "custrecord_ht_mt_codigo" })],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO_MOTIVO: result.getValue({ name: "custrecord_ht_mt_codigo" }),
        });
        return true;
      });

      return resultado[0];
    } catch (error) {
      return { CODIGO_MOTIVO: "" };
    }
  }

  function HTResultadogestion(data) {
    try {
      let resultado = [];
      let searchObj = search.create({
        type: "customrecord_ht_resultadogestion",
        filters: [["internalid", "is", data]],
        columns: [search.createColumn({ name: "custrecord_ht_rg_codigo" })],
      });

      searchObj.run().each(function (result) {
        resultado.push({
          CODIGO_GESTION: result.getValue({ name: "custrecord_ht_rg_codigo" }),
        });
        return true;
      });

      return resultado[0];
    } catch (error) {
      return { CODIGO_GESTION: "" };
    }
  }

  function transformarCelular(numero) {

    let auxnumero = numero;

    // Eliminar espacios en blanco
    numero = numero.replace(/\s+/g, '');

    // Validar si el número es un celular ecuatoriano
    const celularRegex = /^0(9\d{8})$/;
    const match = numero.match(celularRegex);

    if (match) {
      // Transformar al formato internacional
      return `+593${match[1]}`;
    } else {
      // Retornar el número original si no es un celular válido
      return auxnumero;
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

  function DataClienteForTelefono(data) {
    try {
      let resultado = [];

      let numeroCelular = transformarCelular(data);
      // log.debug("numeroCelular", numeroCelular);

      let searchObj = search.create({
        type: "customer",
        filters: [
          ["phone", "is", numeroCelular]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "altname" }),
          search.createColumn({ name: "companyname" }),
          search.createColumn({ name: "vatregnumber" }),
          search.createColumn({ name: "email" }),
        ],
      });
      searchObj.run().each(function (result) {
        resultado.push({
          id_internal: result.getValue({ name: "internalid" }),
          nombre: result.getValue({ name: "altname" }),
          nombre2: result.getValue({ name: "companyname" }),
          identificacion: result.getValue({ name: "vatregnumber" }),
          email: result.getValue({ name: "email" })
        });
        return true;
      });

      if (resultado.length > 0) {
        return resultado;
      } else {

        //ingreso aca
        // !Falta Validacion de cober de telefono

        let searchObj = search.create({
          type: "customer",
          filters: [
            ["addressphone", "startswith", numeroCelular]
          ],
          columns: [
            search.createColumn({ name: "internalid" }),
            search.createColumn({ name: "altname" }),
            search.createColumn({ name: "companyname" }),
            search.createColumn({ name: "vatregnumber" }),
            search.createColumn({ name: "email" }),
          ],
        });
        searchObj.run().each(function (result) {
          resultado.push({
            id_internal: result.getValue({ name: "internalid" }),
            nombre: result.getValue({ name: "altname" }),
            nombre2: result.getValue({ name: "companyname" }),
            identificacion: result.getValue({ name: "vatregnumber" }),
            email: result.getValue({ name: "email" })
          });
          return true;
        });

        if (resultado.length > 0) {
          return resultado;
        } else {
          return {};
        }


      }


    } catch (error) {
      return { error: error.message, stack: error.stack };
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
          "AND",
          ["custrecord_ht_campo_txt_principal", "is", true],
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

  function obtenerUnDatoPersonalizado(type, columna, id) {
    try {
      const resultado = search
        .create({
          type: type,
          filters: [
            // inactivo
            ["isinactive", "is", "F"],
            "AND",
            ["custrecord_ht_rg_codigo", "equalto", id]
          ],
          columns: ["internalid"],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      return resultado.length > 0 ? resultado[0].getValue(columna) : "";
    } catch (error) {
      return "";
    }
  }

  function obtenerMayorNombre(obj) {
    // log.debug("obj", obj);
    return obj.nombre.length >= obj.nombre2.length ? obj.nombre : obj.nombre2;
  }

  function validarNumero(input) {
    // Verificar si el input es un string que representa un número
    if (/^\d+$/.test(input)) {
      return true; // Continúa si es un número
    } else {
      return false; // Devuelve false si no es un número
    }
  }

  function validarDataGenesis(data) {
    const requiredFields = [
      "cliente",
      "ejecutivo",
      "modocontacto",
      "seguimiento",
      "idconversacion",
      "idcontacto",
      "idtipificacion",
      "Canal",
      "vehiculo",
      // "formaproximocontacto",
      "fechapromesa",
      "fechaproximo",
      "telefonoalterno",
      "TelefonoContactado"
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === "") {
        let mensaje = "";
        switch (field) {
          case "cliente":
            mensaje = "Se requiere codigo del Cliente, por favor verificar";
            break;
          case "ejecutivo":
            mensaje = "Se requiere codigo del Ejecutivo, por favor verificar";
            break;
          case "modocontacto":
            mensaje = "Se requiere codigo Modo contacto, por favor verificar";
            break;
          case "seguimiento":
            mensaje = "Se requiere el Seguimiento, por favor verificar";
            break;
          default:
            mensaje = `El campo ${field} es requerido, por favor verificar`;
        }
        return {
          respuesta: false,
          Mensaje: [{
            "CODIGO": "404",
            "DESCRIPCION": mensaje
          }]

        };
      }
    }

    return {
      respuesta: true,
      Mensaje: [{
        "CODIGO": "404",
        "DESCRIPCION": "not found"
      }]
    };
  }

  function obtenerIdModoContacto(data, key) {

    try {
      let modoContacto = data[key];
      if (!modoContacto) { return 0 }

      let codigo = "";
      if (key === 'formaproximocontacto') {
        codigo = modoContacto;
      } else {
        codigo = modoContacto.split('-')[0].trim();
      }

      if (!codigo) { throw new Error(`No se pudo descomponer el valor de data.${key}`) }

      let idModoContacto = 0;
      let modoContactoSearch = search.create({
        type: 'customrecord_ht_sc_modocontacto',
        filters: [
          ['custrecord_ht_md_codigotabla', 'is', 'FCC'],
          'AND',
          ['custrecord_ht_md_codigo', 'is', codigo]
        ],
        columns: ['internalid']
      });

      let modoContactoSearchResult = modoContactoSearch.run().getRange({ start: 0, end: 1 });

      if (modoContactoSearchResult.length > 0) {
        idModoContacto = modoContactoSearchResult[0].getValue('internalid');
      }

      return idModoContacto;

    } catch (error) {
      log.error('error obtenerIdModoContacto', { stack: error.stack });
      return 0;
    }

  }

  function formatDateString(dateString) {
    try {
      if (!dateString) return '';
      let year = dateString.substring(0, 4);
      // let month = dateString.substring(4, 6);
      let month = dateString.substring(6, 8);

      // let day = dateString.substring(6, 8);
      let day = dateString.substring(4, 6);


      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  }

  function buscarCliente(clienteId) {
    try {
      let customerSearch = search.create({
        type: search.Type.CUSTOMER,
        filters: [
          ["vatregnumber", "is", clienteId],
        ],
        columns: ['internalid']
      });

      let customersearchResult = customerSearch.run().getRange({ start: 0, end: 1 });
      return customersearchResult.length > 0 ? customersearchResult[0] : null;
    } catch (error) {
      log.error('Error en buscarCliente', { message: error.message, stack: error.stack });
      return null;
    }
  }

  function buscarEmpleado(ejecutivoEmail) {
    try {
      let employeeSearch = search.create({
        type: search.Type.EMPLOYEE,
        filters: [
          // incative
          ["isinactive", "is", "F"],
          'AND',
          ['email', 'is', ejecutivoEmail]
        ],
        columns: ['internalid']
      });
      let employeesearchResult = employeeSearch.run().getRange({ start: 0, end: 1 });

      if (employeesearchResult.length === 0) {
        employeeSearch = search.create({
          type: search.Type.EMPLOYEE,
          filters: [
            // incative
            ["isinactive", "is", "F"],
            'AND',
            ['email', 'is', "ns_user_integracion@carsegsa.com"]
          ],
        });
        employeesearchResult = employeeSearch.run().getRange({ start: 0, end: 1 });
      }

      return employeesearchResult.length > 0 ? employeesearchResult[0] : null;
    } catch (error) {
      log.error('Error en buscarEmpleado', { message: error.message, stack: error.stack });
      return null;
    }
  }

  function buscarVehiculo(vehiculoId) {
    try {
      let vehicleSearch = search.create({
        type: 'customrecord_ht_record_bienes',
        filters: [
          ['internalid', 'is', vehiculoId]
        ],
        columns: ['internalid']
      });

      let vehiclesearchResult = vehicleSearch.run().getRange({ start: 0, end: 1 });
      return vehiclesearchResult.length > 0 ? vehiclesearchResult[0] : null;
    } catch (error) {
      log.error('Error en buscarVehiculo', { message: error.message, stack: error.stack });
      return null;
    }
  }

  function buscarHomologacionGenesys(idtipificacion) {
    try {
      log.debug('buscarHomologacionGenesys', { idtipificacion });
      let homologGenesysSearch = search.create({
        type: 'customrecordcustomrecord_ht_homologacion',
        filters: [
          ['custrecord_genesys_cod_conclusion', 'is', idtipificacion]
        ],
        columns: ['custrecord_genesys_resultado_gestion', 'custrecord_genesys_motivo']
      });
      let homologGenesysSearchResult = homologGenesysSearch.run().getRange({ start: 0, end: 1 });
      return homologGenesysSearchResult.length > 0 ? homologGenesysSearchResult[0] : null;
    } catch (error) {
      log.error('Error en buscarHomologacionGenesys', { message: error.message, stack: error.stack });
      return null;
    }
  }

  function crearSeguimientoCliente(data, customer, employee, vehicle, homologGenesys, idModoContacto, idformaproximocontacto) {
    try {
      let seguimientoCliente = record.create({
        type: 'customrecord_ht_record_seguicliente',
        isDynamic: true
      });

      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_cliente', value: customer.getValue('internalid') });

      if (homologGenesys && homologGenesys?.getValue('custrecord_genesys_resultado_gestion')) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_resultadogestion', value: homologGenesys.getValue('custrecord_genesys_resultado_gestion') });
      }

      if (homologGenesys && homologGenesys?.getValue('custrecord_genesys_motivo')) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_cmotivo', value: homologGenesys.getValue('custrecord_genesys_motivo') });
      }

      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_empleado', value: (employee && employee.getValue('internalid')) ? employee.getValue('internalid') : "449" });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_estado', value: "2" });

      let fechaContacto = formatDateString(data.fechaContacto);
      if (fechaContacto) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechacontacto', value: new Date(fechaContacto) });
      }

      let fechaproxima = formatDateString(data.fechaproximo);
      if (fechaproxima) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechapproximocontacto', value: new Date(fechaproxima) });
      }

      let fechapromesa = formatDateString(data.fechapromesa);
      if (fechapromesa) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_fechapromesa', value: new Date(fechapromesa) });
      }

      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_modocontacto', value: idModoContacto });

      if (idformaproximocontacto) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_proximocontacto', value: idformaproximocontacto });
      }

      if (data?.ejecutivo) {
        seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_correo_empleado', value: data?.ejecutivo });
      }

      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_seguimiento', value: data.seguimiento });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_tipocliente', value: "1" });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_tiposeguimiento', value: "2" });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_sc_vehiculo', value: vehicle.getValue('internalid') });
      seguimientoCliente.setValue({ fieldId: 'custrecord_subsidiaria_seguimiento', value: "2" });

      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_idconversacion_genesys', value: data.idconversacion });
      seguimientoCliente.setValue({ fieldId: 'custrecord_idcontacto_genesys', value: data.idcontacto });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_idtipificacion_genesys', value: data.idtipificacion });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_canal', value: data.Canal });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_telefono_alterno', value: data.telefonoalterno });
      seguimientoCliente.setValue({ fieldId: 'custrecord_ht_telefono_contacto', value: data.TelefonoContactado });

      log.debug('seguimientoCliente', seguimientoCliente);

      return seguimientoCliente.save();
    } catch (error) {
      log.error('Error en crearSeguimientoCliente', { message: error.message, stack: error.stack });
      return null;
    }
  }

  function crearRegistroGen(data) {
    try {
      let seguimientoCliente = record.create({
        type: 'customrecord_log_proceso_general',
        isDynamic: true
      });

      seguimientoCliente.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: "SeguimientoGenesis" });
      seguimientoCliente.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: data });


      log.debug('seguimientoCliente', seguimientoCliente);

      return seguimientoCliente.save();
    } catch (error) {
      log.error('Error en crearSeguimientoCliente', { message: error.message, stack: error.stack });
      return null;
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
