/*********************************************************************************************************************************************
This script to Obtain Bank Balance (The service will be consumed to consult Bank Account Balance information)
/*********************************************************************************************************************************************
File Name: HU_EC_RS_IN_SALDO_CABEZERA.js                                                                                                                                
Version: 1.0                                                                     
Date: 16/04/2025
ApiVersion: Script 2.1
Enviroment: Produccion
Url: https://7451241.restlets.api.netsuite.com/app/site/hosting/restlet.nl?deploy=1&script=2017&fechaCorte=28-10-2024&opcion=100&indice=1
=============================================================================================================================================*/
/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(["N/log", "N/record", "N/search"], function (log, record, search) {
  let tipoCuenta = 0;

  function _get(context) {
    try {
      log.error("context", context);
      let ConsultaTotal = [];

      let OpcionConsulta = context.opcion;
      let FechaFin = context.fechaCorte;

      FechaFin = FechaFin.replace(/-/g, "/");
      FechaFin = FechaFin.replace(/"/g, "");

      let PaginaId = Number(context?.indice);
      if (isNaN(PaginaId)) { PaginaId = 0; }

      if (OpcionConsulta == 100) {
        ConsultaTotal = ConsultaSaldoBancoGeneral(FechaFin);
      } else {
        log.error("Error, opcion no valida", OpcionConsulta);
        return "id:400, No se encontraron resultados. Error controlado.";
      }


      let pageSize = 50;
      let page = paginate(ConsultaTotal, PaginaId, pageSize);
      let totalPages = getTotalPages(ConsultaTotal, pageSize);

      let conteoPagina = Math.ceil(ConsultaTotal.count / pageSize);
      if (
        !PaginaId ||
        PaginaId == "" ||
        PaginaId <= 0 ||
        isNaN(PaginaId) ||
        page.length == 0
      ) {
        return JSON.stringify({
          results: [],
          index: -1,
          pages: 0,
        });
      } else if (PaginaId > conteoPagina) {
        return JSON.stringify({
          results: ObjResultado,
          index: -1,
          pages: 0,
        });
      }

      return JSON.stringify({
        results: page,
        index: PaginaId,
        pages: totalPages,
      });

    } catch (error) {
      log.error("Error", error);
      return "id:400, No se encontraron resultados. Error controlado.";
    }
  }

  function ConsultaSaldoBancoGeneral(Fechafin) {
    try {
      let Busqueda = search.create({
        type: "transaction",
        filters: [
          ["posting", "is", "T"],
          "AND",
          ["subsidiary", "anyof", "2"],
          "AND",
          ["trandate", "within", "01/01/2024", Fechafin],
          "AND",
          ["account.number", "isnot", "11003010100"],
          "AND",
          ["account.number", "isnot", "11003010600"],
          "AND",
          ["account.number", "isnot", "11003021700"],
          "AND",
          ["account.number", "isnot", "11003050400"],
          "AND",
          ["account.number", "isnot", "11003069999"],
          "AND",
          ["account.type", "anyof", "Bank"]
        ]
        ,
        columns: [
          search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno", summary: "GROUP" }),
          search.createColumn({ name: "subsidiary", label: "Subsidiaria", summary: "GROUP" }),
          search.createColumn({ name: "number", join: "account", summary: "GROUP", label: "Número" }),
          search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", summary: "GROUP", label: "EC Cuenta bancaria" }),
          search.createColumn({ name: "account", summary: "GROUP", label: "Cuenta" }),
          search.createColumn({ name: "localizedname", join: "account", summary: "GROUP", label: "Nombre localizado" }),
          search.createColumn({ name: "balance", join: "account", summary: "GROUP", label: "Saldo Final" }),
        ],
      });

      let ObjResultado = [];
      let ResultadoConsulta = Busqueda.run();

      ResultadoConsulta.each(function (ResConsulta) {
        let ID_Subidiaria = ResConsulta.getValue({ name: "internalid", join: "subsidiary", summary: "GROUP" });
        let subsidiary = ResConsulta.getText({ name: "subsidiary", label: "Subsidiaria", summary: "GROUP" });
        let number = ResConsulta.getValue({ name: "number", join: "account", summary: "GROUP" });
        let custrecord_ht_ec_cuentabancaria = ResConsulta.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account", summary: "GROUP" });
        let account = ResConsulta.getValue({ name: "account", summary: "GROUP" });
        let description = ResConsulta.getValue({ name: "localizedname", join: "account", summary: "GROUP" });
        let balance = ResConsulta.getValue({ name: "balance", join: "account", summary: "GROUP" });

        if (typeof number === "string") {
          // Mapa de patrones con sus valores asociados
          const patrones = [
            { pattern: "11001030", tipoCuenta: 1, clasificacion: "Cuentas Bancarias" },
            { pattern: "11001040", tipoCuenta: 1, clasificacion: "Cuentas Bancarias" },
            { pattern: "1100101", tipoCuenta: 2, clasificacion: "Cajas Generales" },
            { pattern: "11002", tipoCuenta: 3, clasificacion: "Tarjetas Credito" },
            { pattern: "1100102020", tipoCuenta: 3, clasificacion: "Tarjetas Credito" }
          ];

          // Buscar el patrón que coincida
          const resultado = patrones.find(({ pattern }) => number.includes(pattern));

          if (resultado) {
            tipoCuenta = resultado.tipoCuenta;
            clasificacion = resultado.clasificacion;
          }
        }

        ObjResultado.push({
          ID_EMPRESA: ID_Subidiaria,
          Empresa: subsidiary,
          Grupo_Cuenta: number,
          Numero_Cuenta: custrecord_ht_ec_cuentabancaria !== "- None -" ? custrecord_ht_ec_cuentabancaria : number,
          ID_Cuenta_Netsuite: account,
          Descripcion: description,
          Saldo_Actual: parseNumber(balance),
          ID_Clasificacion: tipoCuenta,
          Clasificacion: clasificacion,
          Fecha_Consulta: Fechafin,
        });
        return true; // Continuar a la siguiente fila
      });

      return ObjResultado;
    } catch (error) {
      log.error("error", error);
      return "id:400, No se encontraron resultados. Error controlado.";
    }
  }

  function parseNumber(input) {
    if (input === "") {
      return 0;
    }
    let number = Number(input);
    if (isNaN(number)) {
      return 0;
    }

    return number;
  }

  function paginate(array, pageNumber, pageSize) {
    // Calcular el índice de inicio
    let start = (pageNumber - 1) * pageSize;
    // Devolver los elementos de la página solicitada
    return array.slice(start, start + pageSize);
  }

  function getTotalPages(array, pageSize) {
    return Math.ceil(array.length / pageSize);
  }


  function _put() {
    // put
  }

  function _post() {
    // post
  }

  function _delete() {
    // delete
  }

  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete,
  };
});

// HU_EC_RS_IN_SALDO_CABEZERA.js
