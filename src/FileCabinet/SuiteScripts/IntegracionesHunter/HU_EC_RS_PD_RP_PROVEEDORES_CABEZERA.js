/*********************************************************************************************************************************************
File Name: HU_EC_RS_PD_RP_PROVEEDORES_CABEZERA.js                                                                                                                                
Version: 1.0                                                                     
Date: 09/06/2025
ApiVersion: Script 2.1
Enviroment: Produccion
Url (GET): https://7451241.restlets.api.netsuite.com/app/site/hosting/restlet.nl?deploy=1&opcion=100&indice=1&script=5955&identificacion=0992921099001
=============================================================================================================================================*/
/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(["N/log", "N/record", "N/search","N/query"], function (log, record, search, query) {
  const LONGITUD_PAGINA = 50;

  function _get(context) {
    try {
      log.debug("Contexto recibido", context);
      let OpcionConsulta = context.opcion;
      let PaginaId = Number(context?.indice);
      if (isNaN(PaginaId)) { PaginaId = 0; }

      switch (OpcionConsulta) {
        case "100":
          return JSON.stringify(ConsultaProveedorGeneral(context, PaginaId));
        case "101": //VBC 20250818
          return JSON.stringify(ConsultaProveedorCompra(context.idproveedor, context.identificacion));
        default:
          log.debug("Error, opción no válida", OpcionConsulta);
          return []
      }
    } catch (error) {
      log.error("Error", error);
      return []
    }
  }

  // function ConsultaProveedorGeneral(context, indice) {
  //   try {
  //     indice = parseInt(indice) - 1;
  //     if (isNaN(indice) || indice < 0) indice = 0;


  //     let filter = [
  //       ["isinactive", "is", "F"],
  //       "AND",
  //       ["subsidiary", "anyof", 2],
  //     ]

  //     if (context.identificacion && context.identificacion != "") {
  //       filter.push("AND", ["vatregnumber", "contains", context.identificacion]);
  //     }

  //     if (context.nombre && context.nombre != "") {
  //       filter.push("AND", ["altname", "contains", context.nombre]);
  //     }

  //     if (context.id && context.id != "") {
  //       filter.push("AND", ["internalid", "is", context.id]);
  //     }

  //     const Busqueda = search.create({
  //       type: "vendor",
  //       filters: filter,
  //       columns:
  //         [
  //           search.createColumn({ name: "internalid", label: "ID interno" }),
  //           search.createColumn({ name: "vatregnumber", label: "Identificación" }),
  //           search.createColumn({ name: "altname", label: "Nombre", sort: search.Sort.ASC }),
  //         ]
  //     });

  //     const ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
  //     const conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);

  //     if (!indice || indice == "" || indice < 0) {
  //       indice = 0;
  //     } /*else if (indice > conteoPagina) {
  //       indice = conteoPagina;
  //     }*/

  //     const ObjResultado = [];

  //     if (ResultadoConsulta.count != 0 && indice < conteoPagina) {
  //       const ResPagina = ResultadoConsulta.fetch({ index: indice });

  //       ResPagina.data.forEach(function (ResConsulta) {
  //         ObjResultado.push({
  //           id_interno: ResConsulta.getValue({ name: "internalid" }) || "",
  //           identificacion: ResConsulta.getValue({ name: "vatregnumber" }) || "",
  //           // id: ResConsulta.getValue({ name: "entityid" }),
  //           nombre: ResConsulta.getValue({ name: "altname" }),
  //           // categoria_id: ResConsulta.getValue({ name: "category" }),
  //           // categoria: ResConsulta.getText({ name: "category" }) || "",
  //           // telefono: ResConsulta.getValue({ name: "phone" }),
  //           // correoElectronico: ResConsulta.getValue({ name: "email" }),
  //           Paginas: conteoPagina,
  //         });
  //       });
  //     }

  //     return ObjResultado;

  //   } catch (error) {
  //     log.error("Error", error);
  //     return []
  //   }
  // }

  function ConsultaProveedorGeneral(context, indice) {
    try {
      indice = parseInt(indice) - 1;
      if (isNaN(indice) || indice < 0) indice = 0;

      const LONGITUD_PAGINA = 20; // o el valor que tengas definido

      function ejecutarBusqueda(filtros) {
        const Busqueda = search.create({
          type: "vendor",
          filters: filtros,
          columns: [
            search.createColumn({ name: "internalid", label: "ID interno" }),
            search.createColumn({ name: "vatregnumber", label: "Identificación" }),
            search.createColumn({ name: "altname", label: "Nombre", sort: search.Sort.ASC }),
          ]
        });

        const ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
        return ResultadoConsulta;
      }

      let filtrosBase = [
        ["isinactive", "is", "F"],
        "AND",
        ["subsidiary", "anyof", 2]
      ];

      let ResultadoConsulta = null;

      // Primer intento: buscar por internalid
      if (context.id && context.id != "") {
        let filtrosInternalId = [...filtrosBase, "AND", ["internalid", "is", context.id]];
        ResultadoConsulta = ejecutarBusqueda(filtrosInternalId);

        if (ResultadoConsulta.count === 0 && context.id) {
          // Si no se encontró por internalid, buscar por vatregnumber
          context.id = context.id.replace(/\s+/g, '');
          let filtrosVatReg = [...filtrosBase, "AND", ["vatregnumber", "is", context.id]];
          ResultadoConsulta = ejecutarBusqueda(filtrosVatReg);
        }
      } else if (context.identificacion && context.identificacion != "") {
        // Si no hay id, pero sí identificación
        let filtrosVatReg = [...filtrosBase, "AND", ["vatregnumber", "contains", context.identificacion]];
        ResultadoConsulta = ejecutarBusqueda(filtrosVatReg);
      } else {
        // Búsqueda general con nombre (si lo hay)
        let filtrosNombre = [...filtrosBase];
        if (context.nombre && context.nombre != "") {
          filtrosNombre.push("AND", ["altname", "contains", context.nombre]);
        }
        ResultadoConsulta = ejecutarBusqueda(filtrosNombre);
      }

      const conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
      if (!indice || indice == "" || indice < 0) {
        indice = 0;
      }

      const ObjResultado = [];

      if (ResultadoConsulta.count != 0 && indice < conteoPagina) {
        const ResPagina = ResultadoConsulta.fetch({ index: indice });

        ResPagina.data.forEach(function (ResConsulta) {
          ObjResultado.push({
            id_interno: ResConsulta.getValue({ name: "internalid" }) || "",
            identificacion: ResConsulta.getValue({ name: "vatregnumber" }) || "",
            nombre: ResConsulta.getValue({ name: "altname" }),
            Paginas: conteoPagina,
          });
        });
      }

      return ObjResultado;

    } catch (error) {
      log.error("Error en ConsultaProveedorGeneral", error);
      return [];
    }
  }

  function ConsultaProveedorCompra(IdProveedor, IdentificacionProveedor){
    try{
        let Resultado = [];
        let condicion = "";

        if (IdProveedor !== "" && IdProveedor !==0){
            condicion = " AND V.ID = " + IdProveedor;
        }

        if (IdentificacionProveedor !== "" && IdentificacionProveedor !==0){
            //condicion = " AND V.EXTERNALID = '" + IdentificacionProveedor + "'";
          condicion = " AND V.entityid = 'P-EC-" + IdentificacionProveedor + "'";
        }

        let QueryProveedor = query.runSuiteQL({
            query: `  SELECT 	TOP 1 
                              V.ID IdProveedor,
                              nvl(V.EXTERNALID, v.entityid) Identificacion,
                              V.LEGALNAME RepresentanteLegal,
                              V.ALTNAME NombreEmpresa,
                              V.datecreated FechaCreacion
                      FROM 	VENDOR V
                      WHERE 	1=1
                      ${condicion} `,
        }); 
        
        let ResProv = QueryProveedor.asMappedResults();
        let ResCompra = [];
  
        log.debug("1: ResProv: ", ResProv);

        let IdCompra = 0;
        let CodCompra = '';
        let FechaCompra = '1980-01-01 00:00:00.000';
        let Motivo= '';
        let ValorCompra = 0;

        if (ResProv.length > 0){
            let InternalProveedor = ResProv[0].idproveedor;

            let BusquedaFactCompra = search.create({
            type: "vendorbill",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
                ["type","anyof","VendBill"], 
                "AND", 
                ["mainline","is","T"], 
                "AND", 
                ["vendorline.internalid","anyof",InternalProveedor],
                "AND", 
                ["custbodyts_ec_tipo_documento_fiscal","anyof","10"] //03 Liquidación de compra de Bienes o Prestación de servicios
            ],
            columns:
            [
                search.createColumn({name: "internalid", label: "ID_FACTURA"}),
                search.createColumn({name: "tranid", label: "COD_FACTURA"}),
                search.createColumn({
                  name: "internalid",
                  join: "vendorLine",
                  label: "ID_PROVEEDOR"
                }),
                search.createColumn({
                    name: "trandate",
                    label: "FECHA_COMPRA",
                    sort: search.Sort.DESC
                }),
                search.createColumn({name: "memo", label: "MOTIVO"}),
                search.createColumn({name: "grossamount", label: "VALOR"}),
                search.createColumn({name: "refnumber", label: "COD_COMPRA"})
            ]
            });

            ResCompra = BusquedaFactCompra.run().getRange({ start: 0, end: 1 });
            log.debug("2: ResCompra: ", ResCompra);

            if (ResCompra && ResCompra.length > 0) {
                let fila = ResCompra[0];

                IdCompra   = fila.getValue({ name: "internalid" });
                CodCompra  = fila.getValue({ name: "tranid" });
                FechaCompra = fila.getValue({ name: "trandate" });
                Motivo      = fila.getValue({ name: "memo" });
                ValorCompra       = fila.getValue({ name: "grossamount" });
                //let codCompra   = fila.getValue({ name: "refnumber" });     
            }
        }

        if (ResProv.length == 0){
              Resultado.push({
                IdCompra: '0',
                CodCompra: '',
                IdProveedor: '0',
                Identificacion: '',
                FechaCompra: '1980-01-01 00:00:00.000',
                Motivo: '',
                ValorCompra: 0,
                RepresentanteLegal: '',
                NombreEmpresa: '',
                FechaCreacion: '1900-01-01 00:00:00.000',
              });
        } 
        else {
              let FechaCreacionProv= ResProv[0].fechacreacion ? ResProv[0].fechacreacion: '1980-01-01 00:00:00.000';
              let fechaISO = null;
              if (FechaCreacionProv) {
                  // split por "/"
                  let partes = FechaCreacionProv.split("/"); // ["16","03","2024"]
                  if (partes.length === 3) {
                      let dia = partes[0].padStart(2, '0');
                      let mes = partes[1].padStart(2, '0');
                      let anio = partes[2];
                      fechaISO = `${anio}-${mes}-${dia}`;
                  }
              }

              Resultado.push({
                IdCompra:  IdCompra,
                CodCompra: CodCompra,
                IdProveedor: ResProv[0].idproveedor ? ResProv[0].idproveedor: '0',
                Identificacion: ResProv[0].identificacion ? ResProv[0].identificacion: '',
                FechaCompra: FechaCompra,
                Motivo: Motivo,
                ValorCompra: ValorCompra,
                RepresentanteLegal: ResProv[0].representantelegal ? ResProv[0].representantelegal: '',
                NombreEmpresa: ResProv[0].nombreempresa ? ResProv[0].nombreempresa: '',
                FechaCreacion: fechaISO
              });
        }

      return Resultado;

    } catch (error) {
      log.error("Error en ConsultaProveedorCompra", error);
      return [];
    }
  }


  return {
    get: _get,
  };
});