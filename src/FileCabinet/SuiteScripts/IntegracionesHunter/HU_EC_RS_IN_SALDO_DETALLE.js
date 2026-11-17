/*********************************************************************************************************************************************
Script para consultar el saldo de cuentas bancarias.
Este servicio es consumido externamente para obtener información detallada del saldo de una cuenta bancaria.
/*********************************************************************************************************************************************
Nombre del archivo: HU_EC_RS_IN_SALDO_DETALLE.js
Commit: 01
Versión: 1.0
Fecha: 15/04/2024
API Version: Script 2.1
Ambiente: Producción (PRD)
Puntos de Gobernanza: No aplica (N/A)
URL de consumo (Producción):
https://7451241.app.netsuite.com/app/site/hosting/restlet.nl?script=2016&deploy=1&opcion=101&fecha=22-04-2024&indice=1
===========================================================================================================================================*/

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(["N/log", "N/record", "N/search"], function (log, record, search) {
  const LONGITUD_PAGINA = 900;

  function _get(context) {
    log.error("Contexto recibido", context);

    try {
      const opcion = String(context?.opcion ?? "");
      const indice = Number(context?.indice || 1);
      const fechaInicio = limpiarFecha(context?.fechaInicio?.replace(/[-"]/g, "/")) || "";
      const fechaCorte = limpiarFecha(context?.fechaCorte?.replace(/[-"]/g, "/")) || "";

      // Validación de parámetros obligatorios
      if (!opcion || !fechaInicio || !fechaCorte || indice === 0) {
        log.error("Error de parámetros", { opcion, fechaInicio, fechaCorte, indice });
        return JSON.stringify({ results: [], index: -1, pages: 0 });
      }

      if (!esFechaValida(fechaInicio)) {
        log.error(`Error, la fecha ingresada no es válida: ${fechaInicio}`);
        return JSON.stringify({ results: [], index: -1, pages: 0 });
      }

      log.debug("Opción recibida", opcion);

      switch (opcion) {
        case "100":
          return JSON.stringify(ConsultaSaldoBancoAyer(fechaInicio, 1, fechaInicio, "Diario", indice));
        case "101":
          return JSON.stringify(ConsultaSaldoBancoAyer(fechaInicio, 1, fechaCorte, "General", indice));
        default:
          log.error("Error, opción no válida", opcion);
          return JSON.stringify({ results: [], index: -1, pages: 0 });
      }

    } catch (error) {
      log.error("Error inesperado", error);
      return JSON.stringify({ results: [], index: -1, pages: 0 });
    }
  }


  function ConsultaSaldoBancoAyer(
    FechaConsulta,
    caso,
    Fechafin,
    TipoRegistro,
    indice
  ) {
    try {
      indice = indice - 1;

      let Busqueda = search.create({
        type: "transaction",
        filters: [
          ["posting", "is", "T"],
          "AND",
          ["subsidiary", "anyof", "2"],
          // "AND",
          // ["account.number", "isnot", "11003010100"],
          // "AND",
          // ["account.number", "isnot", "11003010600"],
          // "AND",
          // ["account.number", "isnot", "11003021700"],
          // "AND",
          // ["account.number", "isnot", "11003050400"],
          // "AND",
          // ["account.number", "isnot", "11003069999"],
          "AND",
          ["account.type", "anyof", "Bank"], // Filtrar solo cuentas bancarias
          "AND",
          ["trandate", "within", FechaConsulta, Fechafin], // Filtrar entre fechas
        ],
        columns: [
          search.createColumn({ name: "internalid", join: "subsidiary", label: "ID interno" }),
          search.createColumn({ name: "subsidiary", label: "Subsidiaria" }),
          search.createColumn({ name: "internalid", join: "location", label: "ID interno" }),
          search.createColumn({ name: "name", join: "location", label: "Ubicacion" }),
          search.createColumn({ name: "externalid", join: "location", label: "ID externo" }),
          search.createColumn({ name: "namenohierarchy", join: "location", label: "Nombre (sin jerarquía)" }),
          search.createColumn({ name: "number", join: "account", label: "Número" }),
          search.createColumn({ name: "custrecord_ht_ec_cuentabancaria", join: "account", label: "EC Cuenta bancaria" }),
          search.createColumn({ name: "account", label: "Cuenta" }),
          search.createColumn({ name: "description", join: "account", label: "Descripción" }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "type", label: "Tipo" }),
          search.createColumn({ name: "debitamount", label: "Debito" }),
          search.createColumn({ name: "creditamount", label: "Credito" }),
          search.createColumn({ name: "grossamount", label: "Diferencia" }),
          search.createColumn({ name: "trandate", label: "Fecha", sort: search.Sort.ASC }),
          search.createColumn({ name: "transactionnumber", label: "Número de transacción" }),

          search.createColumn({ name: "postingperiod", label: "Periodo Contable" }),
          search.createColumn({ name: "tranid", label: "Name" }),
          search.createColumn({ name: "entity", label: "Cliente" }),
          search.createColumn({ name: "memo", label: "Nota" }),
          search.createColumn({ name: "number", join: "account", label: "ID number" }),
          search.createColumn({ name: "custbody_num_vale", label: "Número de Vale" }),
          search.createColumn({ name: "custbody_asiento_concepto", label: "Concepto de Asiento" }),
          search.createColumn({ name: "custbody_ht_pago_sec_banco", label: "HT Secuencial banco" })

        ],
      });

      let ObjResultado = [];

      let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });

      let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
      if (!indice || indice == "" || indice < 0) {
        indice = 0;
      } else if (indice >= conteoPagina) {
        indice = conteoPagina - 1; // el índice máximo válido es conteoPagina - 1 (las páginas van de 0 a conteoPagina-1)
      }

      if (ResultadoConsulta.count != 0) {
        let ResPagina = ResultadoConsulta.fetch({ index: indice });
        ResPagina.data.forEach(function (ResConsulta) {
          let ID_Subidiaria = ResConsulta.getValue({ name: "internalid", join: "subsidiary" });
          let subsidiary = ResConsulta.getText("subsidiary");
          let id_locacion = ResConsulta.getValue({ name: "internalid", join: "location" });
          let location = ResConsulta.getValue({ name: "name", join: "location" });
          let idlocation2 = ResConsulta.getValue({ name: "externalid", join: "location" });
          let location2 = ResConsulta.getValue({ name: "namenohierarchy", join: "location" });
          let number = ResConsulta.getValue({ name: "number", join: "account" });
          let custrecord_ht_ec_cuentabancaria = ResConsulta.getValue({ name: "custrecord_ht_ec_cuentabancaria", join: "account" });
          let account = ResConsulta.getValue("account");
          let description = ResConsulta.getValue({ name: "description", join: "account" });
          let internalid = ResConsulta.getValue({ name: "internalid" });
          let tipo = ResConsulta.getText("type");
          let debitamount = ResConsulta.getValue("debitamount");
          let creditamount = ResConsulta.getValue("creditamount");
          let amount = ResConsulta.getValue("grossamount");
          let trandate = ResConsulta.getValue("trandate");
          let transactionnumber = ResConsulta.getValue("transactionnumber");

          let id_postingperiod = ResConsulta.getValue("postingperiod");
          let postingperiod = ResConsulta.getText("postingperiod");
          let tranid = ResConsulta.getValue("tranid");
          let customer = ResConsulta.getValue("entity");
          let customerText = ResConsulta.getText("entity");
          let memo = ResConsulta.getValue("memo");
          let custbody_num_vale = ResConsulta.getValue("custbody_num_vale");
          let concepto_de_Asiento = ResConsulta.getValue("custbody_asiento_concepto");
          let concepto_Asiento_Text = ResConsulta.getText("custbody_asiento_concepto");

          let ht_secuencial_banco = ResConsulta.getValue("custbody_ht_pago_sec_banco") || "0";

          ObjResultado.push({
            ID_EMPRESA: ID_Subidiaria,
            Empresa: subsidiary,
            ID_oficina: id_locacion,
            Oficina: location,
            ID_Sucursal: idlocation2,
            Sucursal: location2,
            Grupo_Cuenta: number,
            Numero_Cuenta: custrecord_ht_ec_cuentabancaria || number,
            ID_Cuenta_Netsuite: account,
            Descripcion_Cuenta: description,
            ID_Transaccion: internalid,
            Numero_Transaccion: transactionnumber,
            Descripcion_Transaccion: tipo,
            ID_Clasificacion: clasificarNumero(number),
            Clasificacion: clasificarNombre(number),
            Debito: parseNumber(debitamount),
            Credito: parseNumber(creditamount),
            Importe: parseNumber(amount),
            Fecha_Movimiento: trandate,
            Tipo_Registro: TipoRegistro,

            ID_Periodo_Contable: id_postingperiod || 0,
            Periodo_Contable: postingperiod || "N/A",
            Nombre_Transaccion: tranid || "SIN IDENTIFICAR",
            Cliente: customer || "0",
            // Nombre_Cliente: (customerText || "N/A").replace(/[^a-zA-Z0-9\s]/g, ""),
            Nombre_Cliente: limpiarTexto(customerText) || "NINGUNO",

            // Nota: (memo || "N/A").replace(/[^a-zA-Z0-9\s]/g, ""),
            Nota: limpiarTexto2(memo) || "NINGUNO",

            // Num_vale: (custbody_num_vale || "N/A").replace(/[^a-zA-Z0-9\s]/g, ""),
            Num_vale: limpiarTexto(custbody_num_vale) || "NINGUNO",
            Id_concepto_Asiento: concepto_de_Asiento || 0,

            // Concepto_Asiento: (concepto_Asiento_Text || "N/A").replace(/[^a-zA-Z0-9\s]/g, ""),
            Concepto_Asiento: limpiarTexto(concepto_Asiento_Text) || "NINGUNO",

            Ht_secuencial_banco: ht_secuencial_banco,

            Proceso_Saldo_detalle: ["11003010100", "11003010600", "11003021700", "11003050400", "11003069999"]
              .includes(custrecord_ht_ec_cuentabancaria || number)
              ? "N"
              : "S"
          });
        });
      }

      return {
        results: ObjResultado,
        index: parseInt(indice) + 1,
        pages: conteoPagina,
        //total: ResultadoConsulta.count,
      };
    } catch (error) {
      log.error("error", error);
      return {
        results: [],
        index: -1,
        pages: 0,
      };
    }
  }

  const esFechaValida = (fecha) => {
    let regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!regex.test(fecha)) {
      return false;
    }

    let partes = fecha.split("/");
    let dia = parseInt(partes[0], 10);
    let mes = parseInt(partes[1], 10) - 1;
    let anio = parseInt(partes[2], 10);

    let dateObj = new Date(anio, mes, dia);
    if (
      dateObj.getFullYear() !== anio ||
      dateObj.getMonth() !== mes ||
      dateObj.getDate() !== dia
    ) {
      return false;
    } else {
      return true;
    }
  };

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

  function obtenerFechaHoy() {
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0"); // Los meses en JavaScript empiezan en 0
    const ano = fecha.getFullYear();

    return `${dia}/${mes}/${ano}`;
  }

  function clasificarNumero(numero) {
    if (numero.includes("11001030")) {
      return 1;
    } else if (numero.includes("1100101")) {
      return 2;
    } else if (numero.includes("11002")) {
      return 3;
    } if (numero.includes("1100102020")) {  // Se restructura por Requerimiento - 25/06/2026
      return 2;
    } else if (numero.includes("11001040")) {
      return 4;
    } else {
      return "";
    }
  }

  function clasificarNombre(numero) {
    if (numero.includes("11001030")) {
      return "Cuentas Bancarias";
    } else
    if (numero.includes("1100101")) {
      return "Cajas Generales";
    } else
    if (numero.includes("11002")) {
      return "Tarjetas Credito";
    } else
    if (numero.includes("1100102020")) {  // Se restructura por Requerimiento - 25/06/2026
      return "Cajas Generales";
    } else
    if (numero.includes("11001040")) {
      return "Cuentas Bancarias";
    } else {
      return "";
    }
  }

  const limpiarFecha = (fecha) => {
    return (fecha || "")
      .replace(/[-"]/g, "/")          // Reemplaza - y " por /
      .replace(/^\/+|\/+$/g, "");     // Elimina / al inicio y al final
  };

  function limpiarTexto(texto) {
    // return (texto || "")
    //   .normalize("NFD")                 // elimina acentos
    //   .replace(/[\u0300-\u036f]/g, "")  // limpia residual de acentos
    //   .replace(/[^a-zA-Z0-9\s]/g, "")   // solo letras, números y espacios
    //   .trim();
    // return (texto || "")
    //   .normalize("NFD")
    //   .replace(/[\u0300-\u036f]/g, "")
    //   .replace(/[^a-zA-Z0-9\s-]/g, "")  // Se permite guion
    //   .trim();
    // return (texto || "")
    //   .normalize("NFD")                 // elimina acentos
    //   .replace(/[\u0300-\u036f]/g, "")  // limpia residuales
    //   .replace(/[\"\'\\\/\[\]\{\},:]/g, "") // eliminamos solo los peligrosos para JSON
    //   .trim();
    // return (texto || "")
    //   .normalize("NFD")                       // elimina acentos
    //   .replace(/[\u0300-\u036f]/g, "")        // limpia residuales
    //   .replace(/["'\\\/[\]{},:]/g, "")        // elimina caracteres peligrosos para JSON
    //   .trim();
    return (texto || "")
      .normalize("NFD")                        // elimina acentos
      .replace(/[\u0300-\u036f]/g, "")         // limpia residuales
      .replace(/error/gi, "Err")               // reemplaza ERROR, error, Error, etc.
      .replace(/["'\\\/[\]{},:]/g, "")         // elimina caracteres peligrosos para JSON
      .trim();
  }

  function limpiarTexto2(texto) {
    return (texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/error/gi, "Err")
      .replace(/["'[\]{},:]/g, "")   // sin \/ ni /
      .trim();
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

// HU_EC_RS_IN_SALDO_DETALLE.js