/*********************************************************************************************************************************************
File Name: HU_EC_RS_PD_RP_PROVEEDORES_DETALLE.js                                                                        
Commit: 02                                                        
Version: 1.1                                                                     
Date: 09/06/2025
ApiVersion: Script 2.1
Enviroment: Produccion
Url: https://7451241.restlets.api.netsuite.com/app/site/hosting/restlet.nl?deploy=1&fechaInicio=01-01-2024&fechaCorte=05-05-2025&opcion=101&indice=1&script=5953&idproveedor=25351
=============================================================================================================================================*/
/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(["N/log", "N/record", "N/search"], function (log, record, search) {
  const LONGITUD_PAGINA = 400;

  function _get(context) {
    log.debug("Contexto recibido", context);

    try {
      const opcion = String(context?.opcion ?? ""); // asegura que sea string
      const indice = Number(context?.indice || 1);
      const fechaInicio = limpiarFecha(context?.fechaInicio?.replace(/[-"]/g, "/")) || "";
      const fechaCorte = limpiarFecha(context?.fechaCorte?.replace(/[-"]/g, "/")) || "";
      const ID_Proveedor = context?.idproveedor || ""; // Asegura que sea string

      // Validaciones básicas
      if (!opcion || !fechaInicio || !fechaCorte || indice === 0 || ID_Proveedor === "") {
        log.debug("Error de parámetros", { opcion, fechaInicio, fechaCorte, indice, ID_Proveedor });
        return JSON.stringify({ results: [] });
      }

      if (!esFechaValida(fechaInicio)) {
        log.debug(`Error, la fecha ingresada no es válida: ${fechaInicio}`);
        return JSON.stringify({ results: [] });
      }

      log.debug("Opción recibida", opcion);

      switch (opcion) {
        // case "100":
        // return JSON.stringify(ConsultaSaldoBancoAyer(fechaInicio, 1, fechaInicio, "Diario", indice));
        case "101":
          return JSON.stringify(ConsultaMovimientoProveedor(fechaInicio, 1, fechaCorte, "General", indice, ID_Proveedor));

        default:
          log.debug("Error, opción no válida", opcion);
          return [];
      }

    } catch (error) {
      log.error("Error inesperado", error);
      return [];
    }
  }

  function ConsultaMovimientoProveedor(
    FechaConsulta,
    caso,
    Fechafin,
    TipoRegistro,
    indice,
    ID_Proveedor
  ) {
    try {
      indice = indice - 1;

      let Busqueda = search.create({
        type: "transaction",
        filters: [
          ["subsidiary", "anyof", "2"],
          "AND", ["trandate", "within", FechaConsulta, Fechafin],
          "AND", ["entity", "anyof", ID_Proveedor],
          "AND",
          [
            [
              ["type", "anyof", "VendBill"],             // Factura
              "AND", ["mainline", "is", "T"],
              "AND", ["status", "noneof", "VendBill:C"],
              "AND", ["memo", "doesnotcontain", "VOID"]
            ],
            "OR",
            [
              ["type", "anyof", "VPrepApp"],             // Aplicación de pago anticipado a proveedor 
              "AND", ["mainline", "is", "F"]
            ],
            "OR",
            [
              ["type", "anyof", "VendPymt"],             // Pago de factura, 
              "AND", ["mainline", "is", "T"],
              "AND", ["status", "noneof", "VendPymt:V"]
            ],
            "OR",
            [
              ["type", "anyof", "Journal"],              // Asiento contable
              "AND", ["mainline", "is", "T"],
              "AND", ["appliedtotransaction.internalid", "noneof", "@NONE@"],
              "AND", ["status", "noneof", "Journal:V"],
              "AND", ["accountingbook", "noneof", ["1"]],
            ]
            // Considerar nota de credito // "VendCred"
          ]
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
          search.createColumn({ name: "entityid", join: "vendor", label: "ID Proveedor" }),
          search.createColumn({ name: "internalid", join: "vendor", label: "ID interno" }),
          search.createColumn({ name: "altname", join: "vendor", label: "Nombre" }),
          search.createColumn({ name: "memo", label: "Nota" }),
          search.createColumn({ name: "tranid", label: "Número de documento" }),
          search.createColumn({ name: "status", label: "Estado" }),
          search.createColumn({ name: "amount", label: "Importe" }),
          search.createColumn({ name: 'internalid', join: 'appliedtotransaction' }),
        ],
      });

      let ObjResultado = [];

      // ═══════════════════════════════════════════════
      // Caché para no repetir búsquedas de la misma factura (appliedtotransaction)
      let cacheProveedorFactura = {};
      // ═══════════════════════════════════════════════

      let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });

      let conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
      if (!indice || indice == "" || indice < 0) {
        indice = 0;
      } else if (indice > conteoPagina) {
        indice = conteoPagina;
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
          let tipoOS = ResConsulta.getValue("type");
          let amount = ResConsulta.getValue("amount");
          let trandate = ResConsulta.getValue("trandate");
          let transactionnumber = ResConsulta.getValue("transactionnumber");
          // let nota = (ResConsulta.getValue("memo") || infAdiconalVendPymt?.memo || "N/A").replace(/,/g, nota => nota !== "N/A" ? "" : nota);
          // log.debug("Nota original", ResConsulta.getValue("memo"));
          let nota = ((ResConsulta.getValue("memo") || "N/A").replace(/,/g, nota => nota !== "N/A" ? "" : nota).replace(/[^a-zA-Z0-9\s]/g, ""));

          let numeroDocumento = ResConsulta.getValue({ name: "tranid" });
          let estado = ResConsulta.getText("status") || "Sin Estado";
          let appliedtotransaction = ResConsulta.getValue({ name: 'internalid', join: 'appliedtotransaction' }) || 0;

          // ═══════════════════════════════════════════════
          // OPTIMIZACIÓN: solo buscar el proveedor de la factura cuando NO viene directo,
          // y usar caché para no repetir la misma búsqueda por cada fila del mismo grupo.
          let entityidDirecto = ResConsulta.getValue({ name: "entityid", join: "vendor" });
          let infAdicionaJournal = { proveedor: "", id_proveedor: "", nombre_proveedor: "" };

          if (!entityidDirecto && appliedtotransaction) {
            if (cacheProveedorFactura[appliedtotransaction] !== undefined) {
              infAdicionaJournal = cacheProveedorFactura[appliedtotransaction];
            } else {
              infAdicionaJournal = obtenerProveedorFactura(appliedtotransaction);
              cacheProveedorFactura[appliedtotransaction] = infAdicionaJournal;
            }
          }

          let entityid = entityidDirecto || infAdicionaJournal?.proveedor;
          let internalidEnti = ResConsulta.getValue({ name: "internalid", join: "vendor" }) || infAdicionaJournal?.id_proveedor;
          let nombre = ResConsulta.getValue({ name: "altname", join: "vendor" }) || infAdicionaJournal?.nombre_proveedor;
          // ═══════════════════════════════════════════════

          let debitoAux = amount > 0 ? parseFloat(amount || 0) : 0; // Si es positivo, asignar a debitoAux
          let creditoAux = amount < 0 ? (parseFloat(amount || 0) * -1) : 0; // Si es negativo, asignar a creditoAux

          if (amount) { // 13/05/2025
            amount = amount * -1; // Cambiar el signo del importe
          }

          let idclasificacion = "";
          if (tipoOS == "VendBill") {
            idclasificacion = 1;
          } else if (tipoOS == "VendPymt") {
            idclasificacion = 2;
          } else if (tipoOS == "VPrepApp") {
            idclasificacion = 3;
          } else if (tipoOS == "Journal") {
            idclasificacion = 4;
          } else if (tipoOS == "VendCred") {
            idclasificacion = 5;
          } else {
            idclasificacion = 0;
          }
          const tiposValidos = ["VendPymt", "VPrepApp", "Journal", "VendCred"];
          if (tiposValidos.includes(tipoOS)) {
            tipo = " " + tipo;
            numeroDocumento = " " + numeroDocumento;
          }

          if (tipoOS == "VendPymt") {
            let aplicaciones = obtenerAplicacionesDePago(internalid);
            aplicaciones.forEach(aplicacion => {
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
                Tipo_Transaccion: tipoOS,
                id_clasificacion: idclasificacion,
                Credito: aplicacion.montoAplicado, //parseNumber(creditamount),// 13/05/2025
                Debito: 0,
                Importe: aplicacion.montoAplicado,
                Fecha_Movimiento: trandate,
                ID_Proveedor: entityid,
                ID_Proveedor_Netsuite: internalidEnti,
                nombre_Proveedor: (entityid ? entityid.replace(/^P-EC-/, '') : entityid) + " - " + nombre,
                Nota: (aplicacion.memo || nota || "N/A").replace(/,/g, nota => nota !== "N/A" ? "" : nota).replace(/[^a-zA-Z0-9\s]/g, ""),
                Numero_Documento: numeroDocumento,
                Estado: aplicacion.estado || estado,
                ReferenciaTransaccion: aplicacion?.facturaId || 0,
                Paginas: conteoPagina,
              });
            });
          } else if (tipoOS == "VendBill" || tipoOS == "VendCred" || tipoOS == "Journal" || tipoOS == "VPrepApp") {
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
              Tipo_Transaccion: tipoOS,
              id_clasificacion: idclasificacion,
              Credito: creditoAux, //parseNumber(creditamount),// 13/05/2025
              Debito: debitoAux, //parseNumber(debitamount), // 13/05/2025
              Importe: parseNumber(amount),
              Fecha_Movimiento: trandate,
              ID_Proveedor: entityid,
              ID_Proveedor_Netsuite: internalidEnti,
              nombre_Proveedor: (entityid ? entityid.replace(/^P-EC-/, '') : entityid) + " - " + nombre,
              Nota: nota,
              Numero_Documento: numeroDocumento,
              Estado: estado,
              ReferenciaTransaccion: appliedtotransaction,
              Paginas: conteoPagina,
            });
          }
        });
      }
      log.debug("Total de registros obtenidos", ResultadoConsulta.count);
      return ObjResultado;

    } catch (error) {
      log.error("error", error);
      return [];
    }
  }

  function obtenerAplicacionesDePago(idPago) {
    const resultados = [];
    try {
      const pago = record.load({
        type: record.Type.VENDOR_PAYMENT,
        id: idPago,
        isDynamic: false,
      });
      const memo = pago.getValue({ fieldId: 'memo' });
      const estado = pago.getText({ fieldId: 'status' });

      // log.debug("Cargando pago", { idPago, memo, estado });

      const lineCount = pago.getLineCount({ sublistId: 'apply' });
      for (let i = 0; i < lineCount; i++) {
        const aplicado = pago.getSublistValue({ sublistId: 'apply', fieldId: 'amount', line: i });
        const idFactura = pago.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i });
        const aplicar = pago.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: i });
        if (aplicar && aplicado > 0) {
          resultados.push({
            facturaId: idFactura,
            montoAplicado: aplicado,
            memo: memo || "",
            estado: estado || "",
          });
        }
      }
    } catch (error) {
      log.error("Error al obtener aplicaciones de pago", error);
    }
    return resultados;
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

  const limpiarFecha = (fecha) => {
    return (fecha || "")
      .replace(/[-"]/g, "/")          // Reemplaza - y " por /
      .replace(/^\/+|\/+$/g, "");     // Elimina / al inicio y al final
  };

  function obtenerProveedorFactura(id_factura) {
    try {
      let id_proveedor = "";
      let proveedor = "";
      let nombre_proveedor = "";

      if (!id_factura) {
        return { id_proveedor: "", proveedor: "" };
      }

      const busqueda = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "VendBill"],
          "AND",
          ["internalid", "anyof", id_factura],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          search.createColumn({ name: "internalid", join: "vendor" }),
          search.createColumn({ name: "entityid", join: "vendor" }),
          search.createColumn({ name: "altname", join: "vendor" }),
        ],
      });

      busqueda.run().each((result) => {
        id_proveedor = result.getValue({ name: "internalid", join: "vendor" });
        proveedor = result.getValue({ name: "entityid", join: "vendor" });
        nombre_proveedor = result.getValue({ name: "altname", join: "vendor" });
        return true;
      });

      return { id_proveedor, proveedor, nombre_proveedor };

    } catch (e) {
      log.debug("Error en la busqueda de proveedor", e);
      return { id_proveedor: "", proveedor: "" };
    }
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