/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
/*
Creado Por: VIVIANA BENAVIDES
Fecha: 17/07/2024
Objetivo: Obtener datos de documentos, para paso de datos a Bases Syshunter.
Actualizacion: 01/09/2024 funcion Get_CabeceraOrdenServicio devuelve datos segmentados en cabecera y detalle,
                     Get_ObtieneOrdenesServicio devuelve lo mismo pero en un solo objeto.
*/
define(['N/log', 'N/record', 'N/search', 'SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES', 'N/query', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], function (log, record, search, _const, query, coberturaController) {

   var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC
   const LONGITUD_PAGINA = 20;

   function _get(context) {
      try {
         let Entidad = context.entidad;

         let IdOrden = 0;
         let paginaId = 0;
         let IdFacturaNs = 0;
         let FechaInicio = '';
         let FechaFin = '';
         let NombreCampo = '';

         let Veh = 0;
         let IdPro = 0;

         if (typeof context.idorden != 'undefined') {
            if (context.idorden.length != 0) {
               IdOrden = context.idorden;
            }
         }

         if (typeof context.indice != 'undefined') {
            if (context.indice.length != 0) {
               paginaId = context.indice;
            }
         }

         if (typeof context.idfactura != 'undefined') {
            if (context.idfactura.length != 0) {
               IdFacturaNs = context.idfactura;
            }
         }

         if (typeof context.bien != 'undefined') {
            if (context.bien.length != 0) {
               Veh = context.bien;
            }
         }

         if (typeof context.idproducto != 'undefined') {
            if (context.idproducto.length != 0) {
               IdPro = context.idproducto;
            }
         }

         if (typeof context.desde != 'undefined') {
            if (context.desde.length != 0) {
               FechaInicio = context.desde;
            }
         }

         if (typeof context.hasta != 'undefined') {
            if (context.hasta.length != 0) {
               FechaFin = context.hasta;
            }
         }

         if (typeof context.nombrecampo != 'undefined') {
            if (context.nombrecampo.length != 0) {
               NombreCampo = context.nombrecampo;
            }
         }

         switch (Entidad) {
            case "VEN_CABECERA_ORDEN_SERVICIO":
               ResultadoConsulta = Get_ObtieneOrdenesServicio(paginaId, IdOrden, true);
               break;

            case "FACTURA":
               ResultadoConsulta = Get_ObtenerFactura(IdOrden);
               break;

            case "FAC_FECHA":
               ResultadoConsulta = Get_ObtenerFactura_PorFecha(IdOrden, FechaInicio, FechaFin, paginaId);
               break;

            case "FACTURA_INTERNA":
               ResultadoConsulta = Get_ObtenerFacturaInterna(IdOrden, FechaInicio, FechaFin, paginaId);
               break;

            case "FACTURA_INTERNA_OS":
               ResultadoConsulta = FacturaInterna_por_OS(IdOrden);
               break;

            case "OT":
               ResultadoConsulta = Get_ObtenerOrdenTrabajo(IdOrden);
               break;

            case "OS_SQL":
               ResultadoConsulta = Get_CabeceraOrdenServicio_SQL(paginaId, IdOrden);
               break;

            case "ITEM":
               ResultadoConsulta = ObtieneProductoPiv(IdOrden);
               break;

            case "PIV":
               ResultadoConsulta = ObtieneCobertura(Veh, IdPro);
               break;

            case "PAGOS":
               ResultadoConsulta = Get_DetallePagos(IdFacturaNs);
               break;

            case "ES_FACTURADO":
               ResultadoConsulta = OrdenEstaFacturada(IdOrden);
               break;

            case "FIN_ANULADA":
               ResultadoConsulta = Get_FacturaInternaAnulada(IdOrden, FechaInicio, FechaFin, paginaId, NombreCampo);
               break;

            default:
               return 'id:400, opcion no valida';
         }

         return ResultadoConsulta;

      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (Metodo Get)';
      }
   }

   function _post(context) {
      try {
        /*
         // throw "Error controlado"
         let IdOrden = context.idorden;
         // if(context.entidad = "ES_FACTURADO" && IdOrden != 0){
         if(context.entidad == "ES_FACTURADO" && IdOrden != 0){
            ResultadoConsulta = OrdenEstaFacturada(IdOrden);
         }else{
            let IdItemNs = 0;
            if (typeof context.iditem != 'undefined') {
               if (context.iditem.length != 0) {
                  IdItemNs = context.iditem;
               }
            }
          ResultadoConsulta = Get_CabeceraOrdenServicio(0, IdOrden, IdItemNs, true);
         }*/

         let IdOrden = context.idorden;
         let Entidad = context.entidad;
         let IdItemNs = 0;

            if (typeof context.entidad == 'undefined') {
                  Entidad = "OS";
            }

         switch (Entidad) {
            case "OS":
               if (typeof context.iditem != 'undefined') {
                  if (context.iditem.length != 0) {
                     IdItemNs = context.iditem;
                  }
               }

               ResultadoConsulta = Get_CabeceraOrdenServicio(0, IdOrden, IdItemNs, true);
               break;

            case "ES_FACTURADO":
               ResultadoConsulta = OrdenEstaFacturada(IdOrden);
               break;

            default:
               return 'id:400, opcion no valida';
         }

         return ResultadoConsulta;
      } catch (error) {
         log.error('error', error);
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerFactura)';
      }
   }

   function Get_ObtenerFactura(IdNumeroOrdenServicio) {
      try {
         let Resultado = [];

         let BusquedaFactura = search.create({
            type: "invoice",
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters:
               [
                  ["type", "anyof", "CustInvc"],
                  "AND",
                  ["createdfrom", "anyof", IdNumeroOrdenServicio],
                  "AND",
                  ["mainline", "is", "T"]
               ],
            columns:
               [
                  search.createColumn({ name: "internalid", label: "ID interno" }),
                  search.createColumn({ name: "tranid", label: "NÃºmero de documento" }),
                  search.createColumn({ name: "trandate", label: "Fecha" }),
                  search.createColumn({ name: "postingperiod", label: "PerÃ­odo" }),
                  search.createColumn({ name: "createdfrom", label: "Orden Servicio" }),
                  search.createColumn({ name: "statusref", label: "Estado" })
               ]
         });
         let ConteoResultados = BusquedaFactura.runPaged().count;
      // let ResConsulta = BusquedaFactura.run().getRange(0, ConteoResultados);
         let ResConsulta = BusquedaFactura.run().getRange({ start: 0, end: ConteoResultados });

         if (ConteoResultados > 0) {
            for (let i in ResConsulta) {
               let Id = ResConsulta[i].getValue({ name: 'internalid' });
               let NumeroReferencia = ResConsulta[i].getValue({ name: 'tranid' });
               let Fecha = ResConsulta[i].getValue({ name: 'trandate' });
               let IdOs = ResConsulta[i].getValue({ name: 'createdfrom' });
               let OrdenServicio = ResConsulta[i].getText({ name: 'createdfrom' });
               let Estado = ResConsulta[i].getText({ name: 'statusref' });

               let Factura = record.load({ type: 'invoice', id: Id, isDynamic: true });
               let NumPagos = Factura.getLineCount({ sublistId: "links" });

               let FechaPago = '01/01/1900';
               let TotalCobrado = 0;
               let IdPago = 0;
               let TipoPago = '';
               let RefPago = '';
               let RefPagoAux = '';

               let contNC = 0;
               let TotalNC = 0;

               if (NumPagos > 0) {
                  for (let i = 0; i < NumPagos; i++) {
                     TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                     RefPagoAux = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });

                     if (TipoPago === 'Nota de crédito' && RefPagoAux.startsWith('NC')) {
                        contNC = contNC + 1;
                        TotalNC = Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                     }

                     if (TipoPago != 'Total') {
                        TotalCobrado = TotalCobrado + Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                       
                        var FechaFormateada = new Date(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));
                        var dia = FechaFormateada.getUTCDate();
                        var mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                        var anio = FechaFormateada.getUTCFullYear();

                        // Formatear la fecha segÃºn el formato solicitado "dd/mm/yyyy"
                        var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;

                        if (parseFecha(FechaPagoF) > parseFecha(FechaPago)) {
                           IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                           RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                           FechaPago = FechaPagoF; //Factura.getSublistValue({sublistId: 'links', fieldId: 'trandate', line: i});
                        }
                     }
                  }
               }

               //if (TipoPago != 'Nota de crédito') {
               // if (contNC == NumPagos && TotalNC == TotalCobrado) {
               //if ((contNC != 0) && (contNC == (NumPagos -1) && TotalNC == TotalCobrado)) {  // DOAS 12022025
              if ((contNC != 0) && (TotalNC == TotalCobrado)) {  // VBC 20250224 NUMPAGOS INCLUYE EL TOTAL (2)

                  break;
               }
               else {
                  Resultado.push({
                     Id: Id,
                     NumeroReferencia: NumeroReferencia,
                     Fecha: Fecha,
                     IdOs: IdOs,
                     OrdenServicio: OrdenServicio,
                     Estado: Estado,
                     FechaPago: FechaPago,
                     TotalCobrado: TotalCobrado,
                     IdPago: IdPago,
                     RefPago: RefPago,
                     TipoPago: TipoPago
                  });
               }
            }
         }
         /*else {
            Resultado.push({
               Id: 0,
               NumeroReferencia: '',
               Fecha: '01/01/1900',
               IdOs: 0,
               OrdenServicio: '',
               Estado: '',
               FechaPago: '01/01/1900',
               TotalCobrado: 0,
               IdPago: 0,
               RefPago: '',
               TipoPago: ''
            });
         }*/

         return Resultado;

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerFactura)';
      }
   }

   function Get_ObtenerOrdenTrabajo(IdOrdenServicioNs) {
      try {
         let Resultado = [];
         let BusquedaoOT = search.create({
            type: "customrecord_ht_record_ordentrabajo",
            filters: [
               ["custrecord_ht_ot_orden_servicio", "anyof", IdOrdenServicioNs]
               //["custrecord_ht_ot_estado","anyof","2"],
            ],
            columns: [
               search.createColumn({ name: "internalid", label: "IdOt" }),
               search.createColumn({ name: "custrecord_ht_ot_orden_serivicio_txt", label: "OrdenServicio" }),
               search.createColumn({ name: "custrecord_ht_ot_orden_servicio", label: "IdOrdenServicio" }),
               search.createColumn({ name: "custrecord_ht_ot_fechatrabajoasignacion", label: "FechaOt" }),
               search.createColumn({ name: "custrecord_ht_ot_horatrabajoasignacion", label: "HoraOT" }),
               search.createColumn({ name: "custrecord_ht_ot_item", label: "HT OT Ítem" }),
               search.createColumn({ name: "custrecord_ht_ot_estado", label: "EstadoOt" }),
               search.createColumn({ name: "custrecord_ht_ot_estado", label: "EstadoOt" }),
               search.createColumn({ name: "custrecord_ht_ot_tecnicoasignacion", label: "TecnicoChequeo" }),
               search.createColumn({ name: "name", label: "CodOt" })
            ]
         });

         let BusquedaNumReg = BusquedaoOT.runPaged().count;
         let ResConsulta = BusquedaoOT.run().getRange(0, BusquedaNumReg);

         for (let i in ResConsulta) {
            let IdOt = ResConsulta[i].getValue({ name: 'internalid' });
            let OrdenServicio = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_orden_serivicio_txt' });
            let IdOrdenServicio = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_orden_servicio' });
            let FechaOt = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_fechatrabajoasignacion' });
            let HoraOT = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_horatrabajoasignacion' });
            let EstadoOt = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_estado' });
            let EstadoOtDescripcion = ResConsulta[i].getText({ name: 'custrecord_ht_ot_estado' });
            let Item = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_item' });
            let IdTecnicoChequeo = ResConsulta[i].getValue({ name: 'custrecord_ht_ot_tecnicoasignacion' });
            let TecnicoChequeo = ResConsulta[i].getText({ name: 'custrecord_ht_ot_tecnicoasignacion' });
            let OT = ResConsulta[i].getValue({ name: 'name' });

            Resultado.push({
               IdOt: IdOt,
               OrdenServicio: OrdenServicio,
               IdOrdenServicio: IdOrdenServicio,
               FechaOt: FechaOt,
               HoraOT: HoraOT,
               EstadoOt: EstadoOt,
               Item: Item,
               IdTecnicoChequeo: IdTecnicoChequeo,
               TecnicoChequeo: TecnicoChequeo,
               OT: OT,
               EstadoOtDescripcion: EstadoOtDescripcion
            });
         }

         return Resultado;

      } catch (error) {
         log.error('error', error);
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerOrdenTrabajo)';
      }
   }

   function Get_CabeceraOrdenServicio(PaginaId, IdDocumento, IdItem, Directo) {
      try {
         let Resultado = [];
         let Final = [];
         let i = 0;
         let filtro = [
            ["type", "anyof", "SalesOrd"],
            "AND",
            ["taxline", "is", "F"],
            "AND",
            ["subsidiary", "anyof", GlobalSubsidiaria],
            "AND",
            ["item.internalid", "noneof", 24178]

            /* ,"AND",
            ["internalid","IS", IdDocumento] 
           ,"AND", ["trandate","after","01/08/2024"] */
         ];

         if (IdDocumento != '' && IdDocumento != 0) {
            filtro.push("AND", ["internalid", "IS", IdDocumento]);
         }

         if (IdItem != '' && IdItem != 0) {
            filtro.push("AND", ["item.internalid", "anyof", IdItem]);
         }

         let BusquedaOrdenServicio = search.create({
            type: 'salesorder',
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters: filtro,
            columns:
               [
                  search.createColumn({ name: "subsidiary", label: "Codigo_Empresa" }),
                  search.createColumn({ name: "location", label: "Codigo_Sucursal" }),
                  search.createColumn({ name: "tranid", label: "Numero_General" }),
                  search.createColumn({ name: "internalid", label: "Id_os" }),
                  search.createColumn({ name: "trandate", label: "Fecha" }),
                  search.createColumn({ name: "custbody_ht_ce_ordentrabajo", label: "Orden_Trabajo" }),
                  search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice", label: "Ejecutiva_Servicio" }),
                  search.createColumn({ name: "salesrep", label: "Ejecutiva_Renovacion" }),
                  search.createColumn({ name: "custbody_ht_os_identificacioncliente", label: "Identificacion_Cliente" }),
                  search.createColumn({
                     name: "internalid",
                     join: "customerMain",
                     label: "Id_Cliente_ns"
                  }),
                  search.createColumn({ name: "custbody_ht_so_bien", label: "Codigo_Vehiculo" }),
                  search.createColumn({
                     name: "custrecord_ht_bien_codsysh",
                     join: "CUSTBODY_HT_SO_BIEN",
                     label: "Cod_Vehiculo_Sh"
                  }),
                  search.createColumn({ name: "custbody_ht_os_companiaseguros", label: "Codigo_Aseguradora" }),
                  search.createColumn({ name: "custbody_ht_os_concesionario", label: "Codigo_Concesionario" }),
                  search.createColumn({ name: "custbody_ht_os_vendcanaldistribucion", label: "Vendedor" }),
                  search.createColumn({ name: "startdate", label: "Fecha_Inicio" }),
                  search.createColumn({ name: "enddate", label: "Fecha_Fin" }),
                  search.createColumn({ name: "custbody_ht_os_plazo", label: "Plazo" }),
                  search.createColumn({ name: "custbody_ht_facturar_a", label: "Facturar_a" }),
                  search.createColumn({ name: "statusref", label: "Estado" }),
                  search.createColumn({ name: "createdby", label: "Usuario_Ingreso" }),
                  search.createColumn({ name: "datecreated", label: "Fecha_Ingreso" }),
                  search.createColumn({ name: "lastmodifieddate", label: "Fecha_Modificacion" }),
                  search.createColumn({ name: "reversaldate", label: "Fecha_Anulacion" }),
                  search.createColumn({ name: "custbody_ht_os_aprobacionventa", label: "Aprobacion_Venta" }),
                  search.createColumn({ name: "custbodyec_nota_cliente", label: "Nota_Factura" }),
                  search.createColumn({ name: "custbody_ht_os_consideracion", label: "Consideracion_Trabajo" }),
                  search.createColumn({ name: "custbody_ht_requiere_aprobacion_carter", label: "Requiere_Aprobacion_Cartera" }),
                  search.createColumn({ name: "custbody_ht_os_aprobacioncartera", label: "Aprobacion_Cartera" }),
                  search.createColumn({ name: "custbody_ht_os_bancofinanciera", label: "Codigo_Financiera" }),
                  search.createColumn({ name: "custcol_ts_dispositivo_en_custodia", label: "Dispositivo_Custodia" }),
                  search.createColumn({ name: "custbody_ht_os_trabajado", label: "Trabajado" }),
                  search.createColumn({ name: "custbody_ht_os_ejecutivareferencia", label: "Ejecutiva_Inicio_Gestion" }),
                  search.createColumn({ name: "custbody_ht_os_usaparalizador", label: "Paralizador" }),
                  search.createColumn({ name: "currency", label: "Moneda" }),
                  //search.createColumn({name: "custbody_ec_estados_os", label: "Estado_1"}),
                  search.createColumn({ name: "custbody_ht_os_trabajado", label: "Trabajado" }),
                  //search.createColumn({name: "custbody_sii_registration_status", label: "Estado_2"}),
                  search.createColumn({ name: "custcol_ht_os_cliente_monitoreo", label: "Codigo_Cliente_Monitoreo" }),
                  search.createColumn({ name: "custcol_ht_os_cliente", label: "Codigo_Cliente_Nuevo" }),
                  search.createColumn({ name: "vatregnumber", join: "CUSTCOL_HT_OS_CLIENTE", label: "Codigo_Cliente_Nuevo_Ns" }),
                  search.createColumn({ name: "transactiondiscount", label: "Descuento_General" }),
                  search.createColumn({ name: "linesequencenumber", label: "Secuencia" }),
                  search.createColumn({
                     name: "internalid",
                     join: "item",
                     label: "IdItem"
                  }),
                  search.createColumn({
                     name: "itemid",
                     join: "item",
                     label: "CodigoItem"
                  }),
                  search.createColumn({ name: "pricelevel", label: "NivelPrecio" }),
                  search.createColumn({
                     name: "salesdescription",
                     join: "item",
                     label: "ItemDescripcion"
                  }),
                  search.createColumn({
                     name: "displayname",
                     join: "item",
                     label: "Nombre a mostrar"
                  }),
                  search.createColumn({ name: "class", label: "Clase" }),
                  search.createColumn({
                     name: "baseprice",
                     join: "item",
                     label: "DescuentoPorcentaje"
                  }),
                  search.createColumn({ name: "netamountnotax", label: "Total_Item" }),
                  search.createColumn({ name: "taxamount", label: "Iva" }),
                  search.createColumn({ name: "fxamount", label: "PrecioUnitario" }),
                  search.createColumn({ name: "total", label: "TotalGeneral" }),
                  search.createColumn({ name: "taxtotal", label: "ivatotal" }),

                  search.createColumn({
                     name: "formulacurrency",
                     formula: "{fxamount} + {taxamount}",
                     label: "PrecioCliente"
                  }),
                  search.createColumn({ name: "specialorder", label: "OrdenFabricacion" }),
                  search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura", label: "TipoPlazo" }),
                  search.createColumn({ name: "custcol_ht_os_tiempo_cobertura", label: "Plazo" }),
                  search.createColumn({ name: "unitabbreviation", label: "TipoProd" }),
                  search.createColumn({ name: "custcol_ht_os_tipoarticulo", label: "TipoArticulo" }),
                  search.createColumn({ name: "taxschedule", join: "item", label: "IvaDescripcion" }),
                  search.createColumn({ name: "type", label: "TipoRegistro" }),
                  search.createColumn({ name: "terms", label: "terms" }),

                  search.createColumn({ name: "custbody_ht_ec_banco", label: "custbody_ht_ec_banco" }),
                  search.createColumn({ name: "custbody_ht_ec_emisorestc", label: "custbody_ht_ec_emisorestc" }),
                  search.createColumn({ name: "custbody_ht_ec_fechavenctarjeta", label: "custbody_ht_ec_fechavenctarjeta" }),
                  search.createColumn({ name: "custbody_ht_ec_numerocta", label: "custbody_ht_ec_numerocta" }),
                  search.createColumn({ name: "custbody_ht_ec_plazotarjeta", label: "custbody_ht_ec_plazotarjeta" }),
                  search.createColumn({ name: "custbody_ht_ec_promocion_da", label: "custbody_ht_ec_promocion_da" }),
                  search.createColumn({ name: "custbody_ht_ec_tipocuentabanco", label: "custbody_ht_ec_tipocuentabanco" }),
                  search.createColumn({ name: "custbody_ht_ec_titularcuenta", label: "custbody_ht_ec_titularcuenta" }),
                  search.createColumn({ name: "custbody_ht_ec_valor_promocion_da", label: "custbody_ht_ec_valor_promocion_da" }), // JCH 20240913
                  search.createColumn({ name: "custbody_ht_os_origenordenservicio", label: "OrigenConvenioOs" }), //VBC 20241021

                  search.createColumn({ name: "custbody_ec_estado_factura_interna", label: "EsFacturaInterna" }), //VBC 20241122
                  search.createColumn({ name: "custbody_ht_factura_directa", label: "IdFacturaAgrupada" }), //VBC 20241122                 

                  // JCH 20240913
                  search.createColumn({
                     name: "vatregnumber",
                     join: "CUSTBODY_HT_EC_TITULARCUENTA",
                     label: "TitularCuentaId"
                  }),

                  // JCH 20240913
                  search.createColumn({
                     name: "vatregnumber",
                     join: "CUSTBODY_HT_FACTURAR_A",
                     label: "FacturaraId"
                  })
               ],
            sort: [
               { name: 'trandate', sort: search.Sort.ASC },
               { name: 'location', sort: search.Sort.ASC },
               { name: 'internalid', sort: search.Sort.ASC }
            ]
         });

         let IdOsAux = 0;
         let SecuenciaDetalle = 0; //secuencial del detalle de la orden
         let IdItemRelacion = 0;

         let ResConsulta = BusquedaOrdenServicio.runPaged({ pageSize: LONGITUD_PAGINA });
         let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
         let NumeroReg = ResConsulta.count;

         let ObjTrabajoPreCargado = [];

         if (!PaginaId || PaginaId == '' || PaginaId < 0) {
            PaginaId = 0;
         }

         if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
            let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

            BusquedaResultado.data.forEach(function (result) {
               i = i + 1;

               let Codigo_Empresa = result.getValue({ name: 'subsidiary' });
               let Codigo_Sucursal = result.getValue({ name: 'location' });
               let Numero_General = result.getValue({ name: 'tranid' });
               let Id_os = result.getValue({ name: 'internalid' });
               let Fecha = result.getValue({ name: 'trandate' });
               let Orden_Trabajo = result.getValue({ name: 'custbody_ht_ce_ordentrabajo' });
               let Ejecutiva_Servicio = result.getValue({ name: 'custbody_ht_os_ejecutiva_backoffice' });
               let Ejecutiva_Renovacion = result.getValue({ name: 'salesrep' });
               let Identificacion_Cliente = result.getValue({ name: 'custbody_ht_os_identificacioncliente' });
               let Id_Cliente_ns = result.getValue({ name: 'internalid', join: 'customerMain' });
               let Codigo_Vehiculo = result.getText({ name: 'custbody_ht_so_bien' });
               let Id_Vehiculo_ns = result.getValue({ name: 'custbody_ht_so_bien' });
               let Codigo_Vehiculo_Sh = result.getValue({ name: 'custrecord_ht_bien_codsysh', join: 'CUSTBODY_HT_SO_BIEN' });
               let Codigo_Aseguradora = result.getValue({ name: 'custbody_ht_os_companiaseguros' });
               let Codigo_Concesionario = result.getValue({ name: 'custbody_ht_os_concesionario' });
               let Vendedor = result.getValue({ name: 'custbody_ht_os_vendcanaldistribucion' });
               let Fecha_Inicio = result.getValue({ name: 'startdate' });
               let Fecha_Fin = result.getValue({ name: 'enddate' });
               let Facturar_a = result.getValue({ name: 'custbody_ht_facturar_a' });

               let IdEstado = '';
               let Estado = result.getText({ name: 'statusref' });
               let Usuario_Ingreso = result.getValue({ name: 'createdby' });
               let Fecha_Ingreso = result.getValue({ name: 'datecreated' });
               let Fecha_Modificacion = result.getValue({ name: 'lastmodifieddate' });
               let Fecha_Anulacion = result.getValue({ name: 'reversaldate' });
               let IdAprobacion_Venta = result.getValue({ name: 'custbody_ht_os_aprobacionventa' });
               let Aprobacion_Venta = result.getText({ name: 'custbody_ht_os_aprobacionventa' });
               let Nota_Factura = result.getValue({ name: 'custbodyec_nota_cliente' });
               let Consideracion_Trabajo = result.getValue({ name: 'custbody_ht_os_consideracion' });
               let Requiere_Aprobacion_Cartera = result.getValue({ name: 'custbody_ht_requiere_aprobacion_carter' }) ? 'T' : 'F';
               let Aprobacion_Cartera = result.getValue({ name: 'custbody_ht_requiere_aprobacion_carter' }) ? 'T' : 'F';
               let Codigo_Financiera = result.getValue({ name: 'custbody_ht_os_bancofinanciera' });
               let Dispositivo_Custodia = result.getValue({ name: 'custcol_ts_dispositivo_en_custodia' });
               let Trabajado = 'N'; //result.getValue({name: 'custbody_ht_os_trabajado'});
               let Ejecutiva_Inicio_Gestion = result.getValue({ name: 'custbody_ht_os_ejecutivareferencia' });
               let Paralizador = result.getValue({ name: 'custbody_ht_os_usaparalizador' });
               let Moneda = result.getValue({ name: 'currency' });
               // let Estado_1= result.getText({name: 'custbody_ec_estados_os'});
               // let Estado_2= result.getText({name: 'custbody_sii_registration_status'});
               let Codigo_Cliente_Monitoreo = result.getValue({ name: 'custcol_ht_os_cliente_monitoreo' });
               let Codigo_Cliente_Nuevo_Ns = result.getValue({ name: 'custcol_ht_os_cliente' });
               let Codigo_Cliente_Nuevo = result.getValue({ name: 'vatregnumber', join: 'CUSTCOL_HT_OS_CLIENTE' });
               let Descuento_General = result.getValue({ name: 'transactiondiscount' });
               let Secuencia = result.getValue({ name: 'linesequencenumber' });
               let IdItem = result.getValue({ name: 'internalid', join: 'item' });
               let CodigoItem = result.getValue({ name: 'itemid', join: "item" });
               //let NivelPrecio= result.getValue({name: 'pricelevel'}); 
               let ItemDescripcion = result.getValue({ name: 'salesdescription', join: 'item' }) ? result.getValue({ name: 'salesdescription', join: 'item' }) : result.getValue({ name: 'displayname', join: 'item' });
               let ItemNombreMostrado = result.getValue({ name: 'displayname', join: 'item' }) ? result.getValue({ name: 'displayname', join: 'item' }) : 'ITEM SIN DESCRIPCION';
               let Clase = result.getValue({ name: 'class' });
               let PrecioBase = parseFloat(result.getValue({ name: 'baseprice', join: 'item' }));
               let Total_Item = parseFloat(result.getValue({ name: 'netamountnotax' }));
               let Iva = parseFloat(result.getValue({ name: 'taxamount' }));
               let PrecioUnitario = parseFloat(result.getValue({ name: 'fxamount' }));
               let PrecioCliente = parseFloat(result.getValue({ name: 'formulacurrency' }));
               let OrdenFabricacion = result.getValue({ name: 'specialorder' });
               let IdTipoPlazo = result.getValue({ name: 'custcol_ht_os_und_tiempo_cobertura' });
               let TipoPlazo = result.getText({ name: 'custcol_ht_os_und_tiempo_cobertura' });
               let Plazo = result.getValue({ name: 'custcol_ht_os_tiempo_cobertura' });
               //let TipoProd= result.getValue({name: 'unitabbreviation'});
               let TipoArticulo = result.getValue({ name: 'custcol_ht_os_tipoarticulo' });
               let IdIvaDescripcion = result.getText({ name: 'taxschedule', join: 'item' });
               let IvaDescripcion = result.getText({ name: 'taxschedule', join: 'item' });
               let TipoRegistro = result.getValue({ name: 'type' });

               let TerminoPago = result.getValue({ name: 'terms' });
               let Banco = result.getValue({ name: 'custbody_ht_ec_banco' });
               let EmisorTarjeta = result.getValue({ name: 'custbody_ht_ec_emisorestc' });
               let FechaVencimientoTarjeta = result.getValue({ name: 'custbody_ht_ec_fechavenctarjeta' });
               let NumeroCuenta = result.getValue({ name: 'custbody_ht_ec_numerocta' });
               let PlazoTarjeta = result.getValue({ name: 'custbody_ht_ec_plazotarjeta' });
               let PromocioDA = result.getValue({ name: 'custbody_ht_ec_promocion_da' });
               let TipoCuentaBanco = result.getValue({ name: 'custbody_ht_ec_tipocuentabanco' });
               let TitularCuenta = result.getValue({ name: 'custbody_ht_ec_titularcuenta' });
               let ValorPromocionDA = result.getValue({ name: 'custbody_ht_ec_valor_promocion_da' }); // JCH 20240913

               let TitularCuentaId = result.getValue({ name: 'vatregnumber', join: 'CUSTBODY_HT_EC_TITULARCUENTA' }); // JCH 20240913
               let FacturaraId = result.getValue({ name: 'vatregnumber', join: 'CUSTBODY_HT_FACTURAR_A' }); // JCH 20240913

               let OrigenConvenioOS = result.getValue({ name: 'custbody_ht_os_origenordenservicio' }); //VBC 20241021
               let EsFacturaInterna = result.getValue({ name: 'custbody_ec_estado_factura_interna' }); //VBC 20241122
               let IdFacturaAgrupada = result.getValue({ name: 'custbody_ht_factura_directa' }); //VBC 20241122

               let Total_General = result.getValue({ name: 'total' });
               let Iva_Total = result.getValue({ name: 'taxtotal' });

               if (Plazo == "N/A") {
                  Plazo = 0;
               }

               if (TipoArticulo != 'Descuento') {
                  IdItemRelacion = IdItem;
               }

               let Facturado = 'N';
               let IdFactura = 0;
               let ReferenciaFactura = '';
               let FechaFactura = '01/01/1900';
               let FechaFacturaInterna = '01/01/1900';

               let ObjFactura = [];

               let FechaPago = '01/01/1900';
               let TotalCobrado = 0;
               let IdPago = 0;
               let RefPago = '';
               let Cobrado = 'N';

               let ObjTrabajo = [];
               let Fecha_Fin_Trabajo = '01/01/1900';
               let SaldoPermitido = 0;

               if (Secuencia == 0) {
                  ObjTrabajoPreCargado = [];
                  if (EsFacturaInterna == 2) { //SI ES FACTURA INTERNA
                     Facturado = 'S';
                     ObjFactura = Get_ObtenerFacturaInterna(Id_os, '', '', 0);
                  } else {
                     ObjFactura = Get_ObtenerFactura(Id_os);
                  }

                  // log.debug("ObjFactura", ObjFactura)
                 
                  if (ObjFactura.length > 0 && ObjFactura.IdFactura != 0) { //vbc 20241113 && IdFactura != 0
                    
                     Facturado = 'S';
                     IdFactura = ObjFactura[0].Id;
                     ReferenciaFactura = ObjFactura[0].NumeroReferencia;
                     FechaFactura = ObjFactura[0].Fecha;
                     IdPago = ObjFactura[0].IdPago;
                     RefPago = ObjFactura[0].RefPago;
                     FechaPago = ObjFactura[0].FechaPago;
                     TotalCobrado = ObjFactura[0].TotalCobrado;

                     if (EsFacturaInterna == 2) {
                        FechaFacturaInterna = ObjFactura[0].FechaFacturaInterna;
                        SaldoPermitido = (ObjFactura[0].TotalFactura * 0.03);
                        if ((ObjFactura[0].TotalFactura - (TotalCobrado + SaldoPermitido)) < 1 && ObjFactura[0].TotalFactura != 0) {
                           Cobrado = 'S';
                        }
                     } else {
                        SaldoPermitido = (Total_General * 0.03);
                        if ((Total_General - (TotalCobrado + SaldoPermitido)) < 1 && Total_General != 0) {
                           Cobrado = 'S';
                        }
                     }


                  }

                  let VerificaTrabajado = false;
                  ObjTrabajo = Get_ObtenerOrdenTrabajo(Id_os); //obtengo todos los trabajos asociados a la orden de servicio

                  if (ObjTrabajo.length > 0) {
                     ObjTrabajoPreCargado = ObjTrabajo;
                     VerificaTrabajado = ObjTrabajo.every(item => item.EstadoOt === "2"); //valida si todos los trabajos están chequeados
                     if (VerificaTrabajado) {
                        Trabajado = 'S';

                        // Obtener la fecha mayor usando reduce
                        const fechaMayor = ObjTrabajo.reduce((maxFecha, item) => {
                           const fechaActual = convertirFecha(item.FechaOt);
                           if (!fechaActual) return maxFecha; // Ignorar fechas vacías
                           return (!maxFecha || fechaActual > maxFecha) ? fechaActual : maxFecha;
                        }, null);

                        Fecha_Fin_Trabajo = fechaMayor ? fechaMayor : '01/01/1900';
                     }
                  }
               } //Secuencia == 0

               let Chequeado = 'N';
               let Id_OT = 0;
               let Fecha_Chequeo = '01/01/1900';
               let Hora_Chequeo = '00:00'                    // new
               let IdTecnicoChequeo = 0;
               let TecnicoChequeo = '';

               if ((ObjTrabajoPreCargado.length > 0) && (SecuenciaDetalle !== 0)) {
                  ObjTrabajoPreCargado.forEach(trabajo => {
                     if ((trabajo.Item == IdItem) && (trabajo.EstadoOt == 2)) {
                        Chequeado = 'S';
                        Id_OT = trabajo.IdOt;
                        Fecha_Chequeo = trabajo.FechaOt;
                        IdTecnicoChequeo = trabajo.IdTecnicoChequeo ? trabajo.IdTecnicoChequeo : 0;
                        TecnicoChequeo = trabajo.TecnicoChequeo ? trabajo.TecnicoChequeo : '';
                        Hora_Chequeo = trabajo.HoraOT ? trabajo.HoraOT : '' 
                     }
                  });
               }

               let ObjProd = [];
               let IdGrupoProd = 0;
               let GrupoProd = '';

               if (IdItem != 0 && IdItem != '' && IdItem != 'undefined') {
                  ObjProd = ObtieneProductoPiv(IdItem);
                  IdGrupoProd = ObjProd[0].Id;
                  GrupoProd = ObjProd[0].Producto;
               }

               let ObjCobertura = [];
               let FechaInicioCob = '01/01/1900';
               let FechaFinCob = '01/01/1900';
               let EstadoCob = '';
               let IdEstadoCob = 0;
               let ExisteCobertura = 'N';
               let IdEstadoInstal = 0;
               let EstadoInstal = '';

               if (IdGrupoProd != 0 && IdGrupoProd != '' && IdGrupoProd != 'undefined' && Secuencia != 0) {
                  ObjCobertura = ObtieneCobertura(Id_Vehiculo_ns, IdGrupoProd);
                  if (ObjCobertura.length > 0) {
                     FechaInicioCob = ObjCobertura[0].FechaInicio;
                     FechaFinCob = ObjCobertura[0].FechaFin;
                     IdEstadoCob = ObjCobertura[0].Id_Estado;
                     EstadoCob = ObjCobertura[0].Estado;
                     IdEstadoInstal = ObjCobertura[0].IdEstadoInstalacion;
                     EstadoInstal = ObjCobertura[0].EstadoInstalacion;

                     ExisteCobertura = 'S';
                  }
               }

               let ObjEstado = [];
               if (Estado != '' && Estado != 'undefined') {
                  ObjEstado = ObtieneEstado(Estado, TipoRegistro);
                  IdEstado = ObjEstado[0].Id;
               }

               let IdIva = 0;
               let PorcentajeIva = '';

               if (IdItem) {
                  let ObjIva = ObtienePorcentajeImpuesto(Id_os, IdItem);

                  if (ObjIva.length > 0) {
                     IdIva = ObjIva[0].IdPorcentajeIva;
                     PorcentajeIva = ObjIva[0].PorcentajeIva;
                  }
               }

               if (Id_os != IdOsAux && Secuencia != 0) {
                  IdOsAux = Id_os;
                  SecuenciaDetalle = 1;
               }

               let infoparametros = "";
               let ADP = "";
               let FAM = "";
               let TTR = "";
               let PPS = "";

               if (Secuencia == 0) {
                  SecuenciaDetalle = 0;
               } else {
                  infoparametros = coberturaController.obtenerParametrizacionIDItem(
                     IdItem,
                     // [2, 75, 6] //2: ADP / 75: FAM / 6:TTR
                     [109, 130, 188, 167] //104: ADP / 107: FAM / 118:TTR / 113: PPS
                  );
                  const params = infoparametros.map(item => item.Valor);

                  ADP = infoparametros.find(item => item.Param === "ADP")?.Valor || "";
                  TTR = infoparametros.find(item => item.Param === "TTR")?.Valor || "";
                  FAM = infoparametros.find(item => item.Param === "FAM")?.Valor || "";
                  PPS = infoparametros.find(item => item.Param === "PPS")?.Valor || "";
               }

               if ((IdItem == 40611) || (IdItem == 17027) || (IdItem == 20475)) {
                  ADP = '999';
                  TTR = 'REL';
                  FAM = 'RE';
               }
               if ((IdItem == 22661) || (IdItem == 40552)) {
                  ADP = '999';
                  TTR = 'HMB';
                  FAM = 'CM';
               }
               if (IdItem == 21862) {
                  ADP = '001';
                  TTR = 'HMT ';
                  FAM = 'CM';
               }

               Resultado.push({
                  Paginas: conteoPagina,
                  Indice: i,
                  NumeroReg: NumeroReg,
                  Codigo_Empresa: Codigo_Empresa ? Codigo_Empresa : 0,
                  Codigo_Sucursal: Codigo_Sucursal ? Codigo_Sucursal : 0,
                  Numero_General: Numero_General ? Numero_General : '',
                  Id_os: Id_os ? Id_os : 0,
                  Fecha: Fecha ? Fecha : '01/01/1900',
                  Orden_Trabajo: Orden_Trabajo ? Orden_Trabajo : 0,
                  Ejecutiva_Servicio: Ejecutiva_Servicio ? Ejecutiva_Servicio : 0,
                  Ejecutiva_Renovacion: Ejecutiva_Renovacion ? Ejecutiva_Renovacion : 0,
                  Identificacion_Cliente: Identificacion_Cliente ? Identificacion_Cliente : '',
                  Id_Cliente_ns: Id_Cliente_ns ? Id_Cliente_ns : 0,
                  Codigo_Vehiculo: Codigo_Vehiculo ? Codigo_Vehiculo : '',
                  Id_Vehiculo_ns: Id_Vehiculo_ns ? Id_Vehiculo_ns : 0,
                  Codigo_Vehiculo_Sh: Codigo_Vehiculo_Sh ? Codigo_Vehiculo_Sh : '',
                  Codigo_Aseguradora: Codigo_Aseguradora ? Codigo_Aseguradora : 0,
                  Codigo_Concesionario: Codigo_Concesionario ? Codigo_Concesionario : 0,
                  Vendedor: Vendedor ? Vendedor : 0,
                  Fecha_Inicio: Fecha_Inicio ? Fecha_Inicio : '01/01/1900',
                  Fecha_Fin: Fecha_Fin ? Fecha_Fin : '01/01/1900',
                  Facturar_a: Facturar_a ? Facturar_a : 0,
                  IdEstado: IdEstado ? IdEstado : 0,
                  Estado: Estado ? Estado : '',
                  Usuario_Ingreso: Usuario_Ingreso ? Usuario_Ingreso : 0,
                  Fecha_Ingreso: Fecha_Ingreso ? Fecha_Ingreso : '01/01/1900',
                  Fecha_Modificacion: Fecha_Modificacion ? Fecha_Modificacion : '01/01/1900',
                  Fecha_Anulacion: Fecha_Anulacion ? Fecha_Anulacion : '01/01/1900',
                  IdAprobacion_Venta: IdAprobacion_Venta ? IdAprobacion_Venta : 0,
                  Aprobacion_Venta: Aprobacion_Venta ? Aprobacion_Venta : '',
                  Nota_Factura: Nota_Factura ? Nota_Factura : '',
                  Consideracion_Trabajo: Consideracion_Trabajo ? Consideracion_Trabajo : '',
                  Requiere_Aprobacion_Cartera: Requiere_Aprobacion_Cartera ? Requiere_Aprobacion_Cartera : '',
                  Aprobacion_Cartera: Aprobacion_Cartera ? Aprobacion_Cartera : '',
                  Codigo_Financiera: Codigo_Financiera ? Codigo_Financiera : 0,
                  Dispositivo_Custodia: Dispositivo_Custodia ? Dispositivo_Custodia : '',
                  Trabajado: Trabajado ? Trabajado : '',
                  Fecha_Fin_Trabajo: Fecha_Fin_Trabajo ? Fecha_Fin_Trabajo : '01/01/1900',

                  Ejecutiva_Inicio_Gestion: Ejecutiva_Inicio_Gestion ? Ejecutiva_Inicio_Gestion : 0,
                  Paralizador: Paralizador ? Paralizador : '',
                  Moneda: Moneda ? Moneda : 0,
                  // Estado_1: Estado_1,
                  // Estado_2: Estado_2,
                  Codigo_Cliente_Monitoreo: Codigo_Cliente_Monitoreo ? Codigo_Cliente_Monitoreo : 0,
                  Id_Vehiculo_Custodia: 0,
                  //Descuento_General: Descuento_General ? Descuento_General: '',
                  Descuento_General: Descuento_General == true ? 'T' : Descuento_General == false ? '' : Descuento_General ?? '',
                  Facturado: Facturado ? Facturado : '',
                  IdFactura: IdFactura ? IdFactura : 0,
                  ReferenciaFactura: ReferenciaFactura ? ReferenciaFactura : '',
                  FechaFactura: FechaFactura ? FechaFactura : '01/01/1900',
                  IdPago: IdPago ? IdPago : 0,
                  RefPago: RefPago ? RefPago : '',
                  FechaPago: FechaPago ? FechaPago : '01/01/1900',
                  TotalCobrado: TotalCobrado ? TotalCobrado : 0,
                  Cobrado: Cobrado ? Cobrado : '',

                  TerminoPago: TerminoPago ? TerminoPago : 0,
                  Banco: Banco ? Banco : 0,
                  EmisorTarjeta: EmisorTarjeta ? EmisorTarjeta : 0,
                  FechaVencimientoTarjeta: FechaVencimientoTarjeta ? FechaVencimientoTarjeta : '01/01/1900',
                  NumeroCuenta: NumeroCuenta ? NumeroCuenta : '',
                  PlazoTarjeta: PlazoTarjeta ? PlazoTarjeta : '',
                  PromocioDA: PromocioDA ? PromocioDA : '',
                  TipoCuentaBanco: TipoCuentaBanco ? TipoCuentaBanco : '',
                  TitularCuenta: TitularCuenta ? TitularCuenta : '',
                  ValorPromocionDA: ValorPromocionDA ? ValorPromocionDA : 0, // JCH 20240913
                  TitularCuentaId: TitularCuentaId ? TitularCuentaId : '', // JCH 20240913
                  FacturaraId: FacturaraId ? FacturaraId : '', // JCH 20240913
                  OrigenConvenioOS: OrigenConvenioOS ? OrigenConvenioOS : "1", //VBC 20241021
                  EsFacturaInterna: EsFacturaInterna ? EsFacturaInterna : '', //VBC 20241122
                  //IdFacturaAgrupada: IdFacturaAgrupada ? IdFacturaAgrupada : 0, //VBC 20241122
                  FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',

                  Secuencia: Secuencia ? Secuencia : 0,
                  IdItem: IdItem ? IdItem : 0,
                  CodigoItem: CodigoItem ? CodigoItem : '',
                  // NivelPrecio: NivelPrecio,
                  ItemDescripcion: ItemDescripcion ? ItemDescripcion : '',
                  IdItemRelacion: IdItemRelacion ? IdItemRelacion : 0,
                  Clase: Clase ? Clase : 0,
                  PPS: PPS ? PPS : '',
                  ADP: ADP ? ADP : '',
                  Tipo_Transaccion: TTR ? TTR : '',
                  Grupo_Producto: FAM ? FAM : '',
                  PrecioBase: PrecioBase ? PrecioBase : 0,
                  Total_Item: Total_Item ? Total_Item : 0,
                  Iva: Iva ? Iva : 0,
                  PrecioUnitario: PrecioUnitario ? PrecioUnitario : 0,
                  PrecioCliente: PrecioCliente ? PrecioCliente : 0,

                  ValorPromocion: 0,
                  TasaDsctoItem: 0,
                  TasaDsctoGeneral: 0,

                  Total_General: Total_General ? Total_General : 0,
                  Iva_Total: Iva_Total ? Iva_Total : 0,
                  OrdenFabricacion: OrdenFabricacion ? OrdenFabricacion : '',
                  IdTipoPlazo: IdTipoPlazo ? IdTipoPlazo : 0,
                  TipoPlazo: TipoPlazo ? TipoPlazo : '',
                  Plazo: (!/^\d+$/.test(Plazo)) ? "0" : Plazo,  // DOAS

                  //TipoProd: TipoProd,
                  TipoArticulo: TipoArticulo ? TipoArticulo : '',
                  IdIvaDescripcion: IdIvaDescripcion ? IdIvaDescripcion : '',
                  IdIva: IdIva ? IdIva : 0,
                  PorcentajeIva: PorcentajeIva ? PorcentajeIva : 0,
                  SecuenciaDetalle: SecuenciaDetalle,
                  //IvaDescripcion: IvaDescripcion,
                  ExisteCobertura: ExisteCobertura,
                  IdGrupoProd: IdGrupoProd ? IdGrupoProd : 0,
                  GrupoProd: GrupoProd ? GrupoProd : '',
                  FechaInicioCob: FechaInicioCob ? FechaInicioCob : '01/01/1900',
                  FechaFinCob: FechaFinCob ? FechaFinCob : '01/01/1900',
                  IdEstadoCobertura: IdEstadoCob ? IdEstadoCob : 0,
                  EstadoCobertura: EstadoCob ? EstadoCob : '',
                  IdEstadoInstal: IdEstadoInstal ? IdEstadoInstal : 0,
                  EstadoInstal: EstadoInstal ? EstadoInstal : 0,
                  TipoRegistro: TipoRegistro,
                  Chequeado: Chequeado,
                  Id_OT: Id_OT,
                  Fecha_Chequeo: Fecha_Chequeo ? Fecha_Chequeo : '01/01/1900',
                  Hora_Chequeo: Hora_Chequeo ? Hora_Chequeo : '00:00',
                  IdTecnicoChequeo: IdTecnicoChequeo,
                  TecnicoChequeo: TecnicoChequeo,
                  Codigo_Cliente_Nuevo: Codigo_Cliente_Nuevo ? Codigo_Cliente_Nuevo : '',
                  Codigo_Cliente_Nuevo_Ns: Codigo_Cliente_Nuevo_Ns ? Codigo_Cliente_Nuevo_Ns : 0
               });
               SecuenciaDetalle = SecuenciaDetalle + 1;
            });
         }
         Final = Resultado;

         if (Directo) {
            Final = TransformaData(Resultado);
         }
         return Final[0];
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (Get_CabeceraOrdenServicio) ';
      }
   }

   function Get_ObtieneOrdenesServicio(PaginaId, IdDocumento, Directo) {
      try {
         let Resultado = [];
         let i = 0;

         let BusquedaOrdenServicio = search.create({
            type: 'salesorder',
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters:
               [
                  ["type", "anyof", "SalesOrd"],
                  "AND",
                  ["taxline", "is", "F"],
                  "AND",
                  ["subsidiary", "anyof", GlobalSubsidiaria],
                  "AND",
                  //[["trandate","within","lastmonth"],"OR",["lastmodifieddate","within","thismonth"],"OR",["reversaldate","within","thismonth"]],
                  //"AND", 
                  ["trandate", "after", "15/08/2024"]
               ],
            columns:
               [
                  search.createColumn({ name: "subsidiary", label: "Codigo_Empresa" }),
                  search.createColumn({ name: "location", label: "Codigo_Sucursal" }),
                  search.createColumn({ name: "tranid", label: "Numero_General" }),
                  search.createColumn({ name: "internalid", label: "Id_os" }),
                  search.createColumn({ name: "trandate", label: "Fecha" }),
                  search.createColumn({ name: "custbody_ht_ce_ordentrabajo", label: "Orden_Trabajo" }),
                  search.createColumn({ name: "custbody_ht_os_ejecutiva_backoffice", label: "Ejecutiva_Servicio" }),
                  search.createColumn({ name: "salesrep", label: "Ejecutiva_Renovacion" }),
                  search.createColumn({ name: "custbody_ht_os_identificacioncliente", label: "Identificacion_Cliente" }),
                  search.createColumn({
                     name: "internalid",
                     join: "customerMain",
                     label: "Id_Cliente_ns"
                  }),
                  search.createColumn({ name: "custbody_ht_so_bien", label: "Codigo_Vehiculo" }),
                  search.createColumn({
                     name: "custrecord_ht_bien_codsysh",
                     join: "CUSTBODY_HT_SO_BIEN",
                     label: "Cod_Vehiculo_Sh"
                  }),
                  search.createColumn({ name: "custbody_ht_os_companiaseguros", label: "Codigo_Aseguradora" }),
                  search.createColumn({ name: "custbody_ht_os_concesionario", label: "Codigo_Concesionario" }),
                  search.createColumn({ name: "custbody_ht_os_vendcanaldistribucion", label: "Vendedor" }),
                  search.createColumn({ name: "startdate", label: "Fecha_Inicio" }),
                  search.createColumn({ name: "enddate", label: "Fecha_Fin" }),
                  search.createColumn({ name: "custbody_ht_os_plazo", label: "Plazo" }),
                  search.createColumn({ name: "custbody_ht_facturar_a", label: "Facturar_a" }),
                  search.createColumn({ name: "statusref", label: "Estado" }),
                  search.createColumn({ name: "createdby", label: "Usuario_Ingreso" }),
                  search.createColumn({ name: "datecreated", label: "Fecha_Ingreso" }),
                  search.createColumn({ name: "lastmodifieddate", label: "Fecha_Modificacion" }),
                  search.createColumn({ name: "reversaldate", label: "Fecha_Anulacion" }),
                  search.createColumn({ name: "custbody_ht_os_aprobacionventa", label: "Aprobacion_Venta" }),
                  search.createColumn({ name: "custbodyec_nota_cliente", label: "Nota_Factura" }),
                  search.createColumn({ name: "custbody_ht_os_consideracion", label: "Consideracion_Trabajo" }),
                  search.createColumn({ name: "custbody_ht_requiere_aprobacion_carter", label: "Requiere_Aprobacion_Cartera" }),
                  search.createColumn({ name: "custbody_ht_os_aprobacioncartera", label: "Aprobacion_Cartera" }),
                  search.createColumn({ name: "custbody_ht_os_bancofinanciera", label: "Codigo_Financiera" }),
                  search.createColumn({ name: "custcol_ts_dispositivo_en_custodia", label: "Dispositivo_Custodia" }),
                  search.createColumn({ name: "custbody_ht_os_trabajado", label: "Trabajado" }),
                  search.createColumn({ name: "custbody_ht_os_ejecutivareferencia", label: "Ejecutiva_Inicio_Gestion" }),
                  search.createColumn({ name: "custbody_ht_os_usaparalizador", label: "Paralizador" }),
                  search.createColumn({ name: "currency", label: "Moneda" }),
                  //search.createColumn({name: "custbody_ec_estados_os", label: "Estado_1"}),
                  search.createColumn({ name: "custbody_ht_os_trabajado", label: "Trabajado" }),
                  //search.createColumn({name: "custbody_sii_registration_status", label: "Estado_2"}),
                  search.createColumn({ name: "custcol_ht_os_cliente_monitoreo", label: "Codigo_Cliente_Monitoreo" }),
                  search.createColumn({ name: "transactiondiscount", label: "Descuento_General" }),
                  search.createColumn({ name: "linesequencenumber", label: "Secuencia" }),
                  search.createColumn({
                     name: "internalid",
                     join: "item",
                     label: "IdItem"
                  }),
                  search.createColumn({
                     name: "itemid",
                     join: "item",
                     label: "CodigoItem"
                  }),
                  search.createColumn({ name: "pricelevel", label: "NivelPrecio" }),
                  search.createColumn({
                     name: "salesdescription",
                     join: "item",
                     label: "ItemDescripcion"
                  }),
                  search.createColumn({ name: "class", label: "Clase" }),
                  search.createColumn({
                     name: "baseprice",
                     join: "item",
                     label: "DescuentoPorcentaje"
                  }),
                  search.createColumn({ name: "netamountnotax", label: "Total_Item" }),
                  search.createColumn({ name: "taxamount", label: "Iva" }),
                  search.createColumn({ name: "fxamount", label: "PrecioUnitario" }),
                  search.createColumn({
                     name: "formulacurrency",
                     formula: "{fxamount} + {taxamount}",
                     label: "PrecioCliente"
                  }),
                  search.createColumn({ name: "specialorder", label: "OrdenFabricacion" }),
                  search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura", label: "TipoPlazo" }),
                  search.createColumn({ name: "custcol_ht_os_tiempo_cobertura", label: "Plazo" }),
                  search.createColumn({ name: "unitabbreviation", label: "TipoProd" }),
                  search.createColumn({ name: "custcol_ht_os_tipoarticulo", label: "TipoArticulo" }),
                  search.createColumn({ name: "taxschedule", join: "item", label: "IvaDescripcion" }),
                  search.createColumn({ name: "type", label: "TipoRegistro" })
               ],
            sort: [
               { name: 'trandate', sort: search.Sort.ASC },
               { name: 'location', sort: search.Sort.ASC },
               { name: 'internalid', sort: search.Sort.ASC }
            ]
         });

         if (IdDocumento != '' && IdDocumento != 0) {
            BusquedaOrdenServicio.filters.push(search.createFilter({
               name: 'internalid',
               operator: search.Operator.ANYOF,
               values: IdDocumento
            }));
         }

         let IdOsAux = 0;
         let SecuenciaDetalle = 0; //secuencial del detalle de la orden
         let IdItemRelacion = 0;

         let ResConsulta = BusquedaOrdenServicio.runPaged({ pageSize: LONGITUD_PAGINA });
         let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
         let NumeroReg = ResConsulta.count;

         if (!PaginaId || PaginaId == '' || PaginaId < 0) {
            PaginaId = 0;
         }

         if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
            let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

            BusquedaResultado.data.forEach(function (result) {
               i = i + 1;

               let Codigo_Empresa = result.getValue({ name: 'subsidiary' });
               let Codigo_Sucursal = result.getValue({ name: 'location' });
               let Numero_General = result.getValue({ name: 'tranid' });
               let Id_os = result.getValue({ name: 'internalid' });
               let Fecha = result.getValue({ name: 'trandate' });
               let Orden_Trabajo = result.getValue({ name: 'custbody_ht_ce_ordentrabajo' });
               let Ejecutiva_Servicio = result.getValue({ name: 'custbody_ht_os_ejecutiva_backoffice' });
               let Ejecutiva_Renovacion = result.getValue({ name: 'salesrep' });
               let Identificacion_Cliente = result.getValue({ name: 'custbody_ht_os_identificacioncliente' });
               let Id_Cliente_ns = result.getValue({ name: 'internalid', join: 'customerMain' });
               let Codigo_Vehiculo = result.getText({ name: 'custbody_ht_so_bien' });
               let Id_Vehiculo_ns = result.getValue({ name: 'custbody_ht_so_bien' });
               let Codigo_Vehiculo_Sh = result.getValue({ name: 'custrecord_ht_bien_codsysh', join: 'CUSTBODY_HT_SO_BIEN' });
               let Codigo_Aseguradora = result.getValue({ name: 'custbody_ht_os_companiaseguros' });
               let Codigo_Concesionario = result.getValue({ name: 'custbody_ht_os_concesionario' });
               let Vendedor = result.getValue({ name: 'custbody_ht_os_vendcanaldistribucion' });
               let Fecha_Inicio = result.getValue({ name: 'startdate' });
               let Fecha_Fin = result.getValue({ name: 'enddate' });
               let Facturar_a = result.getValue({ name: 'custbody_ht_facturar_a' });
               let IdEstado = '';
               let Estado = result.getText({ name: 'statusref' });
               let Usuario_Ingreso = result.getValue({ name: 'createdby' });
               let Fecha_Ingreso = result.getValue({ name: 'datecreated' });
               let Fecha_Modificacion = result.getValue({ name: 'lastmodifieddate' });
               let Fecha_Anulacion = result.getValue({ name: 'reversaldate' });
               let IdAprobacion_Venta = result.getValue({ name: 'custbody_ht_os_aprobacionventa' });
               let Aprobacion_Venta = result.getText({ name: 'custbody_ht_os_aprobacionventa' });
               let Nota_Factura = result.getValue({ name: 'custbodyec_nota_cliente' });
               let Consideracion_Trabajo = result.getValue({ name: 'custbody_ht_os_consideracion' });
               let Requiere_Aprobacion_Cartera = 'F';

               if (result.getValue({ name: 'custbody_ht_requiere_aprobacion_carter' }) == true) {
                  Requiere_Aprobacion_Cartera = 'T';
               }
               let Aprobacion_Cartera = result.getValue({ name: 'custbody_ht_requiere_aprobacion_carter' });
               let Codigo_Financiera = result.getValue({ name: 'custbody_ht_os_bancofinanciera' });
               let Dispositivo_Custodia = result.getValue({ name: 'custcol_ts_dispositivo_en_custodia' });
               let Trabajado = result.getValue({ name: 'custbody_ht_os_trabajado' });
               let Ejecutiva_Inicio_Gestion = result.getValue({ name: 'custbody_ht_os_ejecutivareferencia' });
               let Paralizador = result.getValue({ name: 'custbody_ht_os_usaparalizador' });
               let Moneda = result.getValue({ name: 'currency' });
               // let Estado_1= result.getText({name: 'custbody_ec_estados_os'});
               // let Estado_2= result.getText({name: 'custbody_sii_registration_status'});
               let Codigo_Cliente_Monitoreo = result.getValue({ name: 'custcol_ht_os_cliente_monitoreo' });
               let Descuento_General = result.getValue({ name: 'transactiondiscount' });
               let Secuencia = result.getValue({ name: 'linesequencenumber' });
               let IdItem = result.getValue({ name: 'internalid', join: 'item' });
               let CodigoItem = result.getValue({ name: 'itemid', join: "item" });
               //let NivelPrecio= result.getValue({name: 'pricelevel'});
               let ItemDescripcion = result.getValue({ name: 'salesdescription', join: 'item' });
               let Clase = result.getValue({ name: 'class' });
               let PrecioBase = parseFloat(result.getValue({ name: 'baseprice', join: 'item' }));
               let Total_Item = parseFloat(result.getValue({ name: 'netamountnotax' }));
               let Iva = parseFloat(result.getValue({ name: 'taxamount' }));
               let PrecioUnitario = parseFloat(result.getValue({ name: 'fxamount' }));
               let PrecioCliente = parseFloat(result.getValue({ name: 'formulacurrency' }));
               let OrdenFabricacion = result.getValue({ name: 'specialorder' });
               let IdTipoPlazo = result.getValue({ name: 'custcol_ht_os_und_tiempo_cobertura' });
               let TipoPlazo = result.getText({ name: 'custcol_ht_os_und_tiempo_cobertura' });
               let Plazo = result.getValue({ name: 'custcol_ht_os_tiempo_cobertura' });
               //let TipoProd= result.getValue({name: 'unitabbreviation'});
               let TipoArticulo = result.getValue({ name: 'custcol_ht_os_tipoarticulo' });
               let IdIvaDescripcion = result.getText({ name: 'taxschedule', join: 'item' });
               let IvaDescripcion = result.getText({ name: 'taxschedule', join: 'item' });
               let TipoRegistro = result.getValue({ name: 'type' });

               if (TipoArticulo != 'Descuento') {
                  IdItemRelacion = IdItem;
               }

               let Facturado = 'N';
               let IdFactura = 0;
               let ReferenciaFactura = '';
               let FechaFactura = '01/01/1900';

               let ObjFactura = [];

               let FechaPago = '01/01/1900';
               let TotalCobrado = 0;
               let IdPago = 0;
               let RefPago = '';
               let Cobrado = 'N';

               let ObjTrabajo = [];
               let Fecha_Fin_Trabajo = '01/01/1900';

               if (Secuencia == 0) {
                  ObjFactura = Get_ObtenerFactura(Id_os);

                  if (ObjFactura.length > 0) {
                     Facturado = 'S';
                     IdFactura = ObjFactura[0].Id;
                     ReferenciaFactura = ObjFactura[0].NumeroReferencia;
                     FechaFactura = ObjFactura[0].Fecha;
                     IdPago = ObjFactura[0].IdPago;
                     RefPago = ObjFactura[0].RefPago;
                     FechaPago = ObjFactura[0].FechaPago;
                     TotalCobrado = ObjFactura[0].TotalCobrado;
                     if (Total_General == TotalCobrado) {
                        Cobrado = 'S';
                     }
                  }

                  if (Trabajado == 'S') {
                     ObjTrabajo = Get_ObtenerOrdenTrabajo(Id_os);
                     if (ObjTrabajo.length > 0) {
                        for (let i in ObjTrabajo) {

                           /*let FechaFormateada = new Date(ObjTrabajo[i].FechaOt);
                           let dia = FechaFormateada.getUTCDate();
                           let mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                           let anio = FechaFormateada.getUTCFullYear();
 
                          log.debug("FechaFormateada: ", FechaFormateada);
                           
                           // Formatear la fecha segÃºn el formato solicitado "dd/mm/yyyy"
                           let Fecha_Fin_Trabajo_F = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;
 
                          log.debug("Fecha_Fin_Trabajo_F: ", Fecha_Fin_Trabajo_F);
                           */
                           Fecha_Fin_Trabajo_F = ObjTrabajo[i].FechaOt;

                           if (Fecha_Fin_Trabajo_F > Fecha_Fin_Trabajo) {
                              Fecha_Fin_Trabajo = Fecha_Fin_Trabajo_F;
                           }
                        }
                     }
                  }
               }

               let ObjProd = [];
               let IdGrupoProd = 0;
               let GrupoProd = '';

               if (IdItem != 0 && IdItem != '' && IdItem != 'undefined') {
                  ObjProd = ObtieneProductoPiv(IdItem);
                  IdGrupoProd = ObjProd[0].Id;
                  GrupoProd = ObjProd[0].Producto;
               }

               let ObjCobertura = [];
               let FechaInicioCob = '01/01/1900';
               let FechaFinCob = '01/01/1900';
               let EstadoCob = '';
               let IdEstadoCob = 0;
               let ExisteCobertura = 'N';
               let IdEstadoInstal = 0;
               let EstadoInstal = '';

               if (IdGrupoProd != 0 && IdGrupoProd != '' && IdGrupoProd != 'undefined' && Secuencia != 0) {
                  ObjCobertura = ObtieneCobertura(Id_Vehiculo_ns, IdGrupoProd);
                  if (ObjCobertura.length > 0) {
                     FechaInicioCob = ObjCobertura[0].FechaInicio;
                     FechaFinCob = ObjCobertura[0].FechaFin;
                     IdEstadoCob = ObjCobertura[0].Id_Estado;
                     EstadoCob = ObjCobertura[0].Estado;
                     IdEstadoInstal = ObjCobertura[0].IdEstadoInstalacion;
                     EstadoInstal = ObjCobertura[0].EstadoInstalacion;

                     ExisteCobertura = 'S';
                  }
               }

               let ObjEstado = [];
               if (Estado != '' && Estado != 'undefined') {
                  ObjEstado = ObtieneEstado(Estado, TipoRegistro);
                  IdEstado = ObjEstado[0].Id;
               }

               let IdIva = 0;
               let PorcentajeIva = '';

               if (IdItem) {
                  let ObjIva = ObtienePorcentajeImpuesto(Id_os, IdItem);

                  if (ObjIva.length > 0) {
                     IdIva = ObjIva[0].IdPorcentajeIva;
                     PorcentajeIva = ObjIva[0].PorcentajeIva;
                  }
               }

               if (Id_os != IdOsAux && Secuencia != 0) {
                  IdOsAux = Id_os;
                  SecuenciaDetalle = 1;
               }

               let infoparametros = "";
               let ADP = "";
               let FAM = "";
               let TTR = "";
               let PPS = "";

               if (Secuencia == 0) {
                  SecuenciaDetalle = 0;
               } else {
                  infoparametros = coberturaController.obtenerParametrizacionIDItem(
                     IdItem,
                     //[2, 75, 6] //2: ADP / 75: FAM / 6:TTR
                     [104, 107, 118, 113] //2: ADP / 75: FAM / 6:TTR
                  );
                  const params = infoparametros.map(item => item.Valor);

                  ADP = infoparametros.find(item => item.Param === "ADP")?.Valor || "";
                  TTR = infoparametros.find(item => item.Param === "TTR")?.Valor || "";
                  FAM = infoparametros.find(item => item.Param === "FAM")?.Valor || "";
                  PPS = infoparametros.find(item => item.Param === "PPS")?.Valor || "";
               }

               Resultado.push({
                  Paginas: conteoPagina,
                  Indice: i,
                  NumeroReg: NumeroReg,
                  Codigo_Empresa: Codigo_Empresa ? Codigo_Empresa : 0,
                  Codigo_Sucursal: Codigo_Sucursal ? Codigo_Sucursal : 0,
                  Numero_General: Numero_General ? Numero_General : '',
                  Id_os: Id_os ? Id_os : 0,
                  Fecha: Fecha ? Fecha : '01/01/1900',
                  Orden_Trabajo: Orden_Trabajo ? Orden_Trabajo : 0,
                  Ejecutiva_Servicio: Ejecutiva_Servicio ? Ejecutiva_Servicio : 0,
                  Ejecutiva_Renovacion: Ejecutiva_Renovacion ? Ejecutiva_Renovacion : 0,
                  Identificacion_Cliente: Identificacion_Cliente ? Identificacion_Cliente : '',
                  Id_Cliente_ns: Id_Cliente_ns ? Id_Cliente_ns : 0,
                  Codigo_Vehiculo: Codigo_Vehiculo ? Codigo_Vehiculo : '',
                  Id_Vehiculo_ns: Id_Vehiculo_ns ? Id_Vehiculo_ns : 0,
                  Codigo_Vehiculo_Sh: Codigo_Vehiculo_Sh ? Codigo_Vehiculo_Sh : '',
                  Codigo_Aseguradora: Codigo_Aseguradora ? Codigo_Aseguradora : 0,
                  Codigo_Concesionario: Codigo_Concesionario ? Codigo_Concesionario : 0,
                  Vendedor: Vendedor ? Vendedor : 0,
                  Fecha_Inicio: Fecha_Inicio ? Fecha_Inicio : '01/01/1900',
                  Fecha_Fin: Fecha_Fin ? Fecha_Fin : '01/01/1900',
                  Facturar_a: Facturar_a ? Facturar_a : 0,
                  IdEstado: IdEstado ? IdEstado : 0,
                  Estado: Estado ? Estado : '',
                  Usuario_Ingreso: Usuario_Ingreso ? Usuario_Ingreso : 0,
                  Fecha_Ingreso: Fecha_Ingreso ? Fecha_Ingreso : '01/01/1900',
                  Fecha_Modificacion: Fecha_Modificacion ? Fecha_Modificacion : '01/01/1900',
                  Fecha_Anulacion: Fecha_Anulacion ? Fecha_Anulacion : '01/01/1900',
                  IdAprobacion_Venta: IdAprobacion_Venta ? IdAprobacion_Venta : 0,
                  Aprobacion_Venta: Aprobacion_Venta ? Aprobacion_Venta : '',
                  Nota_Factura: Nota_Factura ? Nota_Factura : '',
                  Consideracion_Trabajo: Consideracion_Trabajo ? Consideracion_Trabajo : '',
                  Requiere_Aprobacion_Cartera: Requiere_Aprobacion_Cartera,
                  Aprobacion_Cartera: Aprobacion_Cartera ? Aprobacion_Cartera : '',
                  Codigo_Financiera: Codigo_Financiera ? Codigo_Financiera : 0,
                  Dispositivo_Custodia: Dispositivo_Custodia ? Dispositivo_Custodia : '',
                  Trabajado: Trabajado ? Trabajado : '',
                  Fecha_Fin_Trabajo: Fecha_Fin_Trabajo ? Fecha_Fin_Trabajo : '01/01/1900',
                  Ejecutiva_Inicio_Gestion: Ejecutiva_Inicio_Gestion ? Ejecutiva_Inicio_Gestion : 0,
                  Paralizador: Paralizador ? Paralizador : '',
                  Moneda: Moneda ? Moneda : 0,
                  // Estado_1: Estado_1,
                  // Estado_2: Estado_2,
                  Codigo_Cliente_Monitoreo: Codigo_Cliente_Monitoreo ? Codigo_Cliente_Monitoreo : 0,
                  Id_Vehiculo_Custodia: 0,
                  Descuento_General: Descuento_General ? Descuento_General : '',
                  Facturado: Facturado ? Facturado : '',
                  IdFactura: IdFactura ? IdFactura : 0,
                  ReferenciaFactura: ReferenciaFactura ? ReferenciaFactura : '',
                  FechaFactura: FechaFactura ? FechaFactura : '01/01/1900',
                  IdPago: IdPago ? IdPago : 0,
                  RefPago: RefPago ? RefPago : '',
                  FechaPago: FechaPago ? FechaPago : '01/01/1900',
                  TotalCobrado: TotalCobrado ? TotalCobrado : 0,
                  Cobrado: Cobrado ? Cobrado : '',
                  Secuencia: Secuencia ? Secuencia : 0,
                  IdItem: IdItem ? IdItem : 0,
                  CodigoItem: CodigoItem ? CodigoItem : '',
                  // NivelPrecio: NivelPrecio,
                  ItemDescripcion: ItemDescripcion ? ItemDescripcion : '',
                  IdItemRelacion: IdItemRelacion ? IdItemRelacion : 0,
                  Clase: Clase ? Clase : 0,
                  PPS: PPS ? PPS : '',
                  ADP: ADP ? ADP : '',
                  Tipo_Transaccion: TTR ? TTR : '',
                  Grupo_Producto: FAM ? FAM : '',
                  PrecioBase: PrecioBase ? PrecioBase : 0,
                  Total_Item: Total_Item ? Total_Item : 0,
                  Iva: Iva ? Iva : 0,
                  PrecioUnitario: PrecioUnitario ? PrecioUnitario : 0,
                  PrecioCliente: PrecioCliente ? PrecioCliente : 0,
                  OrdenFabricacion: OrdenFabricacion ? OrdenFabricacion : '',
                  IdTipoPlazo: IdTipoPlazo ? IdTipoPlazo : 0,
                  TipoPlazo: TipoPlazo ? TipoPlazo : '',
                  Plazo: Plazo ? Plazo : 0,
                  //TipoProd: TipoProd,
                  TipoArticulo: TipoArticulo ? TipoArticulo : '',
                  IdIvaDescripcion: IdIvaDescripcion ? IdIvaDescripcion : '',
                  IdIva: IdIva ? IdIva : 0,
                  PorcentajeIva: PorcentajeIva ? PorcentajeIva : '',
                  SecuenciaDetalle: SecuenciaDetalle,
                  //IvaDescripcion: IvaDescripcion,
                  ExisteCobertura: ExisteCobertura,
                  IdGrupoProd: IdGrupoProd ? IdGrupoProd : 0,
                  GrupoProd: GrupoProd ? GrupoProd : '',
                  FechaInicioCob: FechaInicioCob ? FechaInicioCob : '01/01/1900',
                  FechaFinCob: FechaFinCob ? FechaFinCob : '01/01/1900',
                  IdEstadoCobertura: IdEstadoCob ? IdEstadoCob : 0,
                  EstadoCobertura: EstadoCob ? EstadoCob : '',
                  IdEstadoInstal: IdEstadoInstal ? IdEstadoInstal : 0,
                  EstadoInstal: EstadoInstal ? EstadoInstal : 0,
                  TipoRegistro: TipoRegistro
               });
               SecuenciaDetalle = SecuenciaDetalle + 1;
            });
         }

         return Resultado;
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (Get_CabeceraOrdenServicio) ';
      }
   }

   function Get_DetallePagos(IdFactura) {
      try {
         let Resultado = [];

         let Factura = record.load({ type: 'invoice', id: IdFactura, isDynamic: true });
         let NumPagos = Factura.getLineCount({ sublistId: "links" });

         let FechaPago = '01/01/1900';
         let MontoAbonado = 0;
         let IdPago = 0;
         let TipoPago = '';
         let RefPago = '';

         if (NumPagos > 0) {
            for (let i = 0; i < NumPagos; i++) {
               TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });

               if (TipoPago != 'Total') {
                  IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                  RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                  MontoAbonado = Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                  FechaPago = FormateaFecha(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));

                  Resultado.push({
                     IdFactura: IdFactura,
                     IdPago: IdPago,
                     RefPago: RefPago,
                     TipoPago: TipoPago,
                     FechaPago: FechaPago,
                     MontoAbonado: MontoAbonado
                  });
               }
            }
         }
         return Resultado;
      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_DetallePagos)';
      }
   }

   function OrdenEstaFacturada(IdOrdenServicio) { //VBC 20250407
      try {
            let Facturado = 'N';

            let OrdenServicio = record.load({ type: 'salesorder', id: IdOrdenServicio, isDynamic: true });
            let LineasDetalle = 0;

            let EsFacturaInterna = OrdenServicio.getValue({fieldId: 'custbody_ec_estado_factura_interna'});

            if (EsFacturaInterna == 2){
               LineasDetalle = OrdenServicio.getLineCount({ sublistId: "transformations" });

               if (LineasDetalle > 0) {
                  Facturado = 'Factura Interna';
                  LineasDetalle = 0;
               }
            } 

            LineasDetalle = OrdenServicio.getLineCount({ sublistId: "links" });

            if (LineasDetalle > 0) {
               for (let i = 0; i < LineasDetalle; i++) {
                  TipoItem = OrdenServicio.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                  Estado = OrdenServicio.getSublistValue({ sublistId: 'links', fieldId: 'status', line: i });

                  if (TipoItem == 'Factura de venta') {
                     if (Facturado == 'N' ) { //SI HAY FACTURA INTERNA NO DEBERIA HABER FACTURA DE VENTA
                        Facturado = 'Factura de Venta';
                     } else {
                        Facturado = 'N';
                     }                     
                  } 
               }
            }

            return JSON.stringify({"result": Facturado});

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         return 'id:400, No se encontraron resultados. Error Controlado. (OrdenEstaFacturada)';
      }

   }

   function ObtieneProductoPiv(IdItem) {
      try {

         let Resultado = [];
         let condicion = ' and rel.custrecord_ht_pp_parametrizacionid = ' + IdItem; //arma la condicion

         /*let ConsultaQuery = query.runSuiteQL({
            query: ` SELECT val.id, val.custrecord_ht_pp_codigo, val.custrecord_ht_pp_descripcion
                     FROM	customrecord_ht_pp_main_param_prod rel, 
                           CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param, 
                           MAP_customrecord_ht_pp_main_param_prod_custrecord_ht_pp_parametrizacion_valor mp, 
                           CUSTOMRECORD_HT_CR_PP_VALORES val 
                     where rel.custrecord_ht_pp_parametrizacion_rela = param.id 
                     and rel.id = mp.mapone 
                     and mp.maptwo = val.id 
                     and rel.isinactive = 'F' 
                     and param.isinactive = 'F'
                     and param.custrecord_ht_pp_code = 'FAM'
                        ${condicion} `,
        }); */

         let ConsultaQuery = query.runSuiteQL({
            query: ` SELECT  val.id, val.custrecord_ht_pp_codigo, val.custrecord_ht_pp_descripcion
                   FROM	  customrecord_ht_pp_main_param_prod rel, 
                           CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param, 
                           CUSTOMRECORD_HT_CR_PP_VALORES val 
                   where   rel.custrecord_ht_pp_parametrizacion_rela = param.id 
                   and 	  rel.custrecord_ht_pp_parametrizacion_valor = val.id
                   and     rel.isinactive = 'F' 
                   and     param.isinactive = 'F'
                   and     param.custrecord_ht_pp_code = 'FAM'
                        ${condicion} `,
         });


         let ResProd = ConsultaQuery.asMappedResults();

         if (ResProd.length > 0) {
            ResProd.forEach(function (record) {
               Resultado.push({
                  Id: record.id,
                  Producto: record.custrecord_ht_pp_codigo,
                  Descripcion: record.custrecord_ht_pp_descripcion
               });
            });
         } else {
            Resultado.push({
               Id: 0,
               Producto: '',
               Descripcion: ''
            });
         }

         return Resultado;

      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (ObtieneProductoPiv)';
      }
   }

   function ObtieneCobertura(IdBien, IdFamiliaProd) {
      try {
         let Resultado = [];
         let condicion = ' where piv.custrecord_ht_co_bien = ' + IdBien;

         condicion = condicion + ' and piv.custrecord_ht_co_familia_prod = ' + IdFamiliaProd;

         let ConsultaQuery = query.runSuiteQL({
            query: ` SELECT   piv.custrecord_ht_co_familia_prod id_producto, 
                                 piv.custrecord_ht_co_coberturainicial fecha_inicio, 
                                 piv.custrecord_ht_co_coberturafinal fecha_fin, 
                                 piv.custrecord_ht_co_estado_cobertura id_estado,
                                 (
                                    SELECT 	E.NAME
                                    FROM 	CUSTOMLIST_HT_ESTADO_COBERTURA E
                                    WHERE	E.id = PIV.custrecord_ht_co_estado_cobertura
                                 ) estado,
                                 piv.custrecord_ht_co_estado id_estado_instalacion,
                                 (
                                    SELECT 	E.NAME
                                    FROM 	customrecord_ht_cl_estado E
                                    WHERE	E.id = PIV.custrecord_ht_co_estado
                                 ) estado_instalacion,
                        FROM  customrecord_ht_co_cobertura piv
                     ${condicion} `,
         });

         let ResProducto = ConsultaQuery.asMappedResults();

         if (ResProducto.length > 0) {
            ResProducto.forEach(function (record) {
               Resultado.push({
                  IdProducto: record.id_producto,
                  FechaInicio: record.fecha_inicio,
                  FechaFin: record.fecha_fin,
                  Id_Estado: record.id_estado,
                  Estado: record.estado,
                  IdEstadoInstalacion: record.id_estado_instalacion,
                  EstadoInstalacion: record.estado_instalacion
               });
            });
         }  /* else {
               Resultado.push({
                  IdProducto: 0,
                  FechaInicio: '01/01/1900',
                  FechaFin: '01/01/1900',
                  Id_Estado: 0,
                  Estado: ''
               });
            } */

         return Resultado;

      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (ObtieneCobertura)';
      }
   }

   function ObtieneEstado(DescripcionEstado, Tipo) {
      try {
         let Resultado = [];

         if (Tipo = 'SalesOrd') {
            Tipo = 'Orden de Servicio : ';
         }

         let condicion = " where a.fullname = '" + Tipo + DescripcionEstado + "' ";

         let ConsultaQuery = query.runSuiteQL({
            query: ` SELECT   a.*
                        FROM  TransactionStatus a
                        ${condicion} `,
         });

         let ResEstado = ConsultaQuery.asMappedResults();

         if (ResEstado.length > 0) {
            ResEstado.forEach(function (record) {
               Resultado.push({
                  Id: record.id,
                  Descripcion: record.name
               });
            });
         } else {
            Resultado.push({
               Id: '',
               Descripcion: ''
            });
         }

         return Resultado;

      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (ObtieneEstado)';
      }
   }

   function ObtienePorcentajeImpuesto(IdOs, IdItem, attempts = 3) {
      try {
         let Resultado = [];

         let ObjOs = record.load({ type: 'salesorder', id: IdOs, isDynamic: false });

         let DetItem = ObjOs.getLineCount({ sublistId: "item" });
         if (DetItem > 0) {
            for (let i = 0; i < DetItem; i++) {
               let IdItemDet = ObjOs.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
               let IdPorcentajeIva = 0;
               let PorcentajeIva = 0;

               if (IdItemDet == IdItem) {
                  IdPorcentajeIva = ObjOs.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                  PorcentajeIva = ObjOs.getSublistValue({ sublistId: 'item', fieldId: 'taxrate1', line: i });
                  Resultado.push({
                     IdPorcentajeIva: IdPorcentajeIva,
                     PorcentajeIva: PorcentajeIva
                  });
               }
            }
         }
         return Resultado;
      } catch (error) {
         log.error('error', error);
         return 'id:400, No se encontraron resultados. Error controlado. (ObtienePorcentajeImpuesto)';
      }
   }

   function Get_ObtenerFactura_PorFecha(IdOs, Desde, Hasta, PaginaId) {
      try {
         let Resultado = [];

         let BusquedaFactura = search.create({
            type: "invoice",
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters:
               [
                  ["type", "anyof", "CustInvc"],
                  "AND",
                  ["mainline", "is", "T"],
                  "AND",
                  ["createdfrom.internalid", "noneof", "@NONE@"]
               ],
            columns:
               [
                  search.createColumn({ name: "internalid", label: "ID interno" }),
                  search.createColumn({ name: "tranid", label: "Numero de documento" }),
                  search.createColumn({ name: "trandate", label: "Fecha" }),
                  search.createColumn({ name: "postingperiod", label: "Periodo" }),
                  search.createColumn({ name: "createdfrom", label: "Orden Servicio" }),
                  search.createColumn({ name: "statusref", label: "Estado" }),
                  search.createColumn({
                     name: "internalid",
                     join: "createdFrom",
                     label: "Id_Os"
                  }),
                  search.createColumn({ name: "total", label: "TotalFactura" }),
               ]
         });

         if (IdOs != '' && IdOs != '0') {
            BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
               name: 'internalid',
               operator: search.Operator.ANYOF,
               values: IdOs
            }));
         }

         if (Desde != '' && Hasta != '') {
            F_Desde = FormateaFechaYYMMAA(Desde);
            F_Hasta = FormateaFechaYYMMAA(Hasta);

            BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
               name: 'trandate',
               operator: search.Operator.WITHIN,
               values: [F_Desde, F_Hasta]
            }));
         }

         let ResConsulta = BusquedaFactura.runPaged({ pageSize: LONGITUD_PAGINA });
         let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

         if (!PaginaId || PaginaId == '' || PaginaId < 0) {
            PaginaId = 0;
         }

         if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
            let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

            BusquedaResultado.data.forEach(function (result) {
               let IdOrdenServicio = result.getValue({ name: 'internalid', join: "createdFrom" });
               let Id = result.getValue({ name: 'internalid' });
               let NumeroReferencia = result.getValue({ name: 'tranid' });
               let Fecha = result.getValue({ name: 'trandate' });
               let OrdenServicio = result.getText({ name: 'createdfrom' });
               let Estado = result.getText({ name: 'statusref' });
               let TotalFac = result.getValue({ name: 'total' });

               let Factura = record.load({ type: 'invoice', id: Id, isDynamic: true });
               let NumPagos = Factura.getLineCount({ sublistId: "links" });

               let FechaPago = '01/01/1900';
               let TotalCobrado = 0;
               let IdPago = 0;
               let TipoPago = '';
               let RefPago = '';

               if (NumPagos > 0) {
                  for (let i = 0; i < NumPagos; i++) {
                     TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                     RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });

                     if (TipoPago === 'Nota de crédito' && !RefPago.startsWith('RET')) {
                        break;
                     }

                     if (TipoPago != 'Total') {
                        IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                        TotalCobrado = TotalCobrado + Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });

                        var FechaFormateada = new Date(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));
                        var dia = FechaFormateada.getUTCDate();
                        var mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                        var anio = FechaFormateada.getUTCFullYear();

                        // Formatear la fecha segÃºn el formato solicitado "dd/mm/yyyy"
                        var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;

                        //if (Factura.getSublistValue({sublistId: 'links', fieldId: 'trandate', line: i}) > FechaPago){
                        if (FechaPagoF > FechaPago) {
                           FechaPago = FechaPagoF; //Factura.getSublistValue({sublistId: 'links', fieldId: 'trandate', line: i});
                        }
                     }
                  }
               }

               if (TipoPago != 'Nota de crédito' && !RefPago.startsWith('RET')) {
                  Resultado.push({
                     IdFactura: Id,
                     NumeroReferencia: NumeroReferencia,
                     FechaFactura: Fecha,
                     TotalFac: TotalFac,
                     IdOrdenServicio: IdOrdenServicio,
                     OrdenServicio: OrdenServicio,
                     Estado: Estado,
                     FechaPago: FechaPago,
                     TotalCobrado: TotalCobrado,
                     IdPago: IdPago,
                     RefPago: RefPago,
                     Paginas: conteoPagina,
                     TipoPago: TipoPago
                  });
               }
            });
         }
         /*else {
            Resultado.push({
               Id: 0,
               NumeroReferencia: '',
               Fecha: '01/01/1900',
               OrdenServicio: '',
               Estado: '',
               FechaPago: '01/01/1900',
               TotalCobrado: 0,
               IdPago: 0,
               RefPago: ''
            });
         }*/

         return Resultado;

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerFactura_PorFecha)';
      }
   }


   function Get_ObtenerFacturaInterna(IdOs, Desde, Hasta, PaginaId) {
      try {
         let Resultado = [];
         let F_Desde = '';
         let F_Hasta = '';

         let BusquedaOrdenesFacturaInterna = search.create({
            type: "salesorder",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
               [
                  ["type", "anyof", "SalesOrd"],
                  "AND",
                  ["custbody_itr_doc_number", "doesnotcontain", "OSP%"],
                  "AND",
                  ["custbody_ec_estado_factura_interna", "anyof", "2"], //FACTURADO
                  "AND",
                  ["mainline", "is", "T"]
               ],
            columns: [
               search.createColumn({ name: "tranid", label: "ID", summary: "GROUP" }),
               search.createColumn({ name: "trandate", label: "Fecha", summary: "GROUP" }),
               search.createColumn({ name: "internalid", label: "Id_Os", summary: "GROUP" }),
               search.createColumn({ name: "custbody_ec_estado_factura_interna", label: "EC Estado Factura Interna", summary: "GROUP" }),
               search.createColumn({
                  name: "internalid",
                  join: "CUSTBODY_HT_FACTURA_DIRECTA", //"CUSTBODY_HT_FACTURA_DIRECTA",
                  label: "ID interno",
                  summary: "GROUP"
               })
            ]
         });

         if (IdOs != '' && IdOs != '0') {
            BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
               name: 'internalid',
               operator: search.Operator.ANYOF,
               values: IdOs
            }));
         }

         if (Desde != '' && Hasta != '') {
            F_Desde = FormateaFechaYYMMAA(Desde);
            F_Hasta = FormateaFechaYYMMAA(Hasta);

            BusquedaOrdenesFacturaInterna.filters.push(search.createFilter({
               name: 'trandate',
               operator: search.Operator.WITHIN,
               values: [F_Desde, F_Hasta]
            }));
         }

         let ResConsulta = BusquedaOrdenesFacturaInterna.runPaged({ pageSize: LONGITUD_PAGINA });
         let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

         if (!PaginaId || PaginaId == '' || PaginaId < 0) {
            PaginaId = 0;
         }

         if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
            let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

            BusquedaResultado.data.forEach(function (result) {
               let Id = result.getValue({ name: 'internalid', join: "CUSTBODY_HT_FACTURA_DIRECTA", summary: "GROUP" });
               let FechaFacturaInterna = '01/01/1900';
               let IdOrdenServicio = result.getValue({ name: 'internalid', summary: "GROUP" });
               let OrdenServicio = result.getValue({ name: 'tranid', summary: "GROUP" });

               if (OrdenServicio) {
                  let ConsultaQuery = query.runSuiteQL({
                     query: ` select 	min(createddate) fecha_creacion
                                 from     transaction
                                 where    type = 'CuTrSale112'
                                 and      custbody_ec_created_from_fac_int = ${IdOrdenServicio} `,
                  });

                  let ResProd = ConsultaQuery.asMappedResults();
                  if (ResProd.length > 0) {
                     FechaFacturaInterna = ResProd[0].fecha_creacion;
                  }

                  if (Id === '') { //FACTURACION DE VARIOS TIENE LA ASOCIACION A LAS ORDENES EN LA FACTURA CASO OS1001596244
                     let ConsultaFacturaVariosQuery = query.runSuiteQL({
                        query: ` SELECT 	custrecord_nro_factura
                                          FROM     customrecord_ht_fact_internas_asociadas
                                          WHERE    isinactive = 'F'
                                          AND      custrecord_orden_servicio  = ${IdOrdenServicio} `,
                     });
                     let ResIdFacturaVarios = ConsultaFacturaVariosQuery.asMappedResults();

                     if (ResIdFacturaVarios.length > 0) {
                        Id = ResIdFacturaVarios[0]?.custrecord_nro_factura || '';
                     }
                  }
               }

               if (Id === '') {
                  Resultado.push({
                     Id: 0,
                     NumeroReferencia: '',
                     Fecha: '01/01/1900',
                     TotalFactura: 0,
                     IdOrdenServicio: IdOrdenServicio,
                     OrdenServicio: OrdenServicio,
                     Estado: '',
                     FechaPago: '01/01/1900',
                     TotalCobrado: 0,
                     IdPago: 0,
                     RefPago: '',
                     FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                     Paginas: PaginaId,
                     TipoPago: ''
                  });
               }
               else {
                  let Factura = record.load({ type: 'invoice', id: Id, isDynamic: true });

                  let NumeroReferencia = Factura.getValue({ fieldId: 'initialtranid' });
                  let Fecha = Factura.getValue({ fieldId: 'trandate' });
                  let TotalFactura = Factura.getValue({ fieldId: 'origtotal' });

                  let fechaISO = Fecha;

                  let fechaConvertida = new Date(fechaISO);

                  let diaF = String(fechaConvertida.getDate()).padStart(2, '0');
                  let mesF = String(fechaConvertida.getMonth() + 1).padStart(2, '0');
                  let anioF = fechaConvertida.getFullYear();

                  let FechaF = `${diaF}/${mesF}/${anioF}`;

                  let Estado = Factura.getValue({ fieldId: 'custbody_psg_ei_status' });

                  let NumPagos = Factura.getLineCount({ sublistId: "links" });

                  let FechaPago = '01/01/1900';
                  let TotalCobrado = 0;
                  let IdPago = 0;
                  let TipoPago = '';
                  let RefPago = '';
                  let RefPagoAux = '';
                  let TotalNC = 0;
                  let contNC = 0;

                  if (NumPagos > 0) {
                     for (let i = 0; i < NumPagos; i++) {
                        TipoPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                        RefPagoAux = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });

                        if (TipoPago === 'Nota de crédito' && RefPagoAux.startsWith('NC')) {
                           contNC = contNC + 1;
                           TotalNC = Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                        }

                        if (TipoPago != 'Total') {
                           var FechaFormateada = new Date(Factura.getSublistValue({ sublistId: 'links', fieldId: 'trandate', line: i }));
                           var dia = FechaFormateada.getUTCDate();
                           var mes = FechaFormateada.getUTCMonth() + 1; // Sumar 1 porque los meses van de 0 a 11
                           var anio = FechaFormateada.getUTCFullYear();

                           var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;
                           TotalCobrado = TotalCobrado + Factura.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i });
                           
                          if (parseFecha(FechaPagoF) > parseFecha(FechaPago)) { 
                             IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                             RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                             FechaPago = FechaPagoF; 
                           }
                        }
                     }
                  }

                  if (TotalCobrado == '') {
                     TotalCobrado = 0;
                  }

                  if ((contNC != 0) && (TotalNC == TotalCobrado)) { 
                     Resultado.push({
                        Id: 0,
                        NumeroReferencia: '',
                        Fecha: '01/01/1900',
                        TotalFactura: 0,
                        IdOrdenServicio: IdOrdenServicio,
                        OrdenServicio: OrdenServicio,
                        Estado: '',
                        FechaPago: '01/01/1900',
                        TotalCobrado: 0,
                        IdPago: 0,
                        RefPago: '',
                        FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                        Paginas: PaginaId,
                        TipoPago: ''
                     });
                  }
                  else {
                     Resultado.push({
                        Id: Id ? Id : 0,
                        NumeroReferencia: NumeroReferencia ? NumeroReferencia : '',
                        Fecha: FechaF ? FechaF : '01/01/1900',
                        TotalFactura: TotalFactura ? TotalFactura : 0,
                        IdOrdenServicio: IdOrdenServicio,
                        OrdenServicio: OrdenServicio,
                        Estado: Estado ? Estado : '',
                        FechaPago: FechaPago ? FechaPago : '01/01/1900',
                        TotalCobrado: TotalCobrado ? TotalCobrado : 0,
                        IdPago: IdPago ? IdPago : 0,
                        RefPago: RefPago ? RefPago : '',
                        FechaFacturaInterna: FechaFacturaInterna ? FechaFacturaInterna : '01/01/1900',
                        Paginas: conteoPagina,
                        TipoPago: TipoPago ? TipoPago : 0
                     });
                  }
               }
            });
         }

         return Resultado;

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerFacturaInterna)';
      }
   }

function parseFecha(fechaStr) {
    let [dia, mes, año] = fechaStr.split('/').map(Number);
    return new Date(año, mes - 1, dia);
}

   function FacturaInterna_por_OS(IdOs) {
      try {
         let Resultado = [];

         var transactionSearchObj = search.create({
            type: "transaction",
            settings: [{ "name": "consolidationtype", "value": "ACCTTYPE" }],
            filters:
               [
                  ["type", "anyof", "CuTrSale112"],
                  "AND",
                  ["mainline", "is", "T"],
                  "AND",
                  ["createdfrom.internalid", "anyof", "793025"]
               ],
            columns:
               [
                  search.createColumn({ name: "internalid", label: "ID interno" }),
                  search.createColumn({ name: "ordertype", label: "Tipo de orden" }),
                  search.createColumn({ name: "trandate", label: "Fecha" }),
                  search.createColumn({ name: "asofdate", label: "Fecha de corte" }),
                  search.createColumn({ name: "postingperiod", label: "Período" }),
                  search.createColumn({ name: "taxperiod", label: "Período fiscal" }),
                  search.createColumn({ name: "type", label: "Tipo" }),
                  search.createColumn({ name: "tranid", label: "Número de documento" }),
                  search.createColumn({ name: "datecreated", label: "Fecha de creación" }),
                  search.createColumn({ name: "salesorder", label: "Orden de Servicio" }),
                  search.createColumn({ name: "createdfrom", label: "Creado desde" }),
                  search.createColumn({
                     name: "internalid",
                     join: "createdFrom",
                     label: "ID interno"
                  })
               ]
         });
         var searchResultCount = transactionSearchObj.runPaged().count;
         log.debug("searchResultCount: ", searchResultCount);

         return Resultado;

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         //return JSON.stringify({error: error.message});
         return 'id:400, No se encontraron resultados. Error Controlado. (FacturaInterna_por_OS)';
      }
   }

   function Get_FacturaInternaAnulada(IdOs, Desde, Hasta, PaginaId, NombreCampo) {

      try {
         let Resultado = [];
         let F_Desde = '';
         let F_Hasta = '';

         let cacheNuevaFin = {};
         let cacheEstadoOS = {};

         if (NombreCampo == '') {
            NombreCampo = 'lastmodifieddate';
         }

         let BusquedaFacturaInternaAnulada = search.create({
            type: "transaction",
            filters: [
               ["subsidiary","anyof",GlobalSubsidiaria],
               "AND",
               ["type","anyof","CuTrSale112"],
               "AND", 
               ["voided","is","T"],
               "AND", 
               ["mainline","is","T"], 
               "AND", 
               ["custbody_ec_created_from_fac_int","noneof","@NONE@"]
            ],
            columns: [
               "internalid",
               "tranid",
               "datecreated",
               "trandate",
               "lastmodifieddate",
               "custbody_ec_created_from_fac_int",
               search.createColumn({name:"internalid", join:"salesRep"}),
               "custbody_valor_neto_fin",
               "custbody_ec_nro_cuota_fac_int",
               search.createColumn({name:"internalid", join:"customerMain"}),
               "custbody_ht_so_bien"
            ]
         });

         if (Desde && Hasta) {
            F_Desde = FormateaFechaYYMMAA(Desde);
            F_Hasta = FormateaFechaYYMMAA(Hasta);

            BusquedaFacturaInternaAnulada.filters.push(search.createFilter({
               name: NombreCampo,
               operator: search.Operator.WITHIN,
               values: [F_Desde, F_Hasta]
            }));
         }

         if (IdOs && IdOs != '0') {
            BusquedaFacturaInternaAnulada.filters.push(search.createFilter({
               name: 'custbody_ec_created_from_fac_int',
               operator: search.Operator.ANYOF,
               values: IdOs
            }));
         }

         let ResConsulta = BusquedaFacturaInternaAnulada.runPaged({ pageSize: 200 });
         let conteoPagina = Math.ceil(ResConsulta.count / 200);

         PaginaId = (!PaginaId || PaginaId < 0) ? 0 : (PaginaId >= conteoPagina ? conteoPagina - 1 : PaginaId);

         if (ResConsulta.count != 0 && PaginaId < conteoPagina) {

            let BusquedaResultado = ResConsulta.fetch({ index: PaginaId });

            BusquedaResultado.data.forEach(function (result) {

               let IdFin = result.getValue('internalid');
               let RefFin = result.getValue('tranid');
               let Fecha_creacion = result.getValue('datecreated');
               let Fecha_Doc = result.getValue('trandate');
               let Fecha_modificacion = result.getValue('lastmodifieddate');

               let IdOrdenServicio = result.getValue('custbody_ec_created_from_fac_int') || 0;
               let IdEjecutiva = result.getValue({ name: 'internalid', join: "salesRep" });

               let ValorFin = result.getValue('custbody_valor_neto_fin') || 0;
               let N_Cuota = result.getValue('custbody_ec_nro_cuota_fac_int') || 0;

               let Cliente = result.getValue({ name: 'internalid', join: 'customerMain' });
               let Bien = result.getValue('custbody_ht_so_bien');

               let key = Cliente + '_' + Bien;

               // 🔹 VALIDAR SI EXISTE NUEVA FIN (CACHE)
               if (!(key in cacheNuevaFin)) {

                  let QueryOS = query.runSuiteQL({
                     query: `SELECT TOP 1 1
                           FROM transaction a
                           WHERE a.recordtype = 'customsale_ec_factura_interna'
                           AND a.entity = ${Cliente}
                           AND a.custbody_ht_so_bien = ${Bien}
                           AND a.createddate > TO_DATE('${Fecha_modificacion}', 'DD/MM/YYYY HH24:MI')
                           AND a.voided = 'F'`
                  });

                 //AND a.custbody_ht_facturar_a = ${Cliente} //20260903 pueden cambiar el facturar a

                  let res = QueryOS.asMappedResults();
                  cacheNuevaFin[key] = (res.length > 0);
               }

               let CargaObjeto = !cacheNuevaFin[key];

               let IdEstadoFin = 0;
               let EstadoFin = '';
               let NumeroGeneral = '';

               if (CargaObjeto) {

                  // 🔹 CACHE ESTADO OS
                  if (!(IdOrdenServicio in cacheEstadoOS)) {

                     let QueryOS = query.runSuiteQL({
                        query: `SELECT a.custbody_ec_estado_factura_interna id, b.name descripcion, a.tranid
                              FROM transaction a, customlist_ec_estado_factura_interna b
                              WHERE a.custbody_ec_estado_factura_interna = b.id
                              AND a.recordtype = 'salesorder'
                              AND a.id = ${IdOrdenServicio}`
                     });

                     let res = QueryOS.asMappedResults();
                     cacheEstadoOS[IdOrdenServicio] = res.length > 0 ? res[0] : null;
                  }

                  let estado = cacheEstadoOS[IdOrdenServicio];

                  if (estado) {
                     IdEstadoFin = estado.id;
                     EstadoFin = estado.descripcion;
                     NumeroGeneral = estado.tranid;
                  }

                  // 🔴 SOLO SI NO TIENE VALOR → USA RECORD.LOAD
                  if (ValorFin == 0 || ValorFin == '') {

                     let TotalFin = 0;

                     let DetalleFin = record.load({
                        type: 'customsale_ec_factura_interna',
                        id: IdFin,
                        isDynamic: true
                     });

                     let CountItemDet = DetalleFin.getLineCount({ sublistId: "item" });

                     for (let i = 0; i < CountItemDet; i++) {
                        let RateFin = DetalleFin.getSublistValue({
                           sublistId: 'item',
                           fieldId: 'rate',
                           line: i
                        });

                        if (RateFin) {
                           TotalFin += RateFin;
                        }
                     }

                     ValorFin = Math.round(TotalFin * 100) / 100;
                  }
               }

               if (CargaObjeto) {
                  Resultado.push({
                     Paginas: conteoPagina,
                     IdFin,
                     RefFin,
                     Fecha_creacion,
                     Fecha_Doc,
                     Fecha_modificacion,
                     ValorFin,
                     N_Cuota,
                     IdOrdenServicio,
                     OrdenServcio: NumeroGeneral,
                     OS_IdEstadoFIN: IdEstadoFin,
                     OS_EstadoFIN: EstadoFin,
                     IdEjecutiva,
                     Cliente,
                     Bien
                  });
               }

            });
         }

         return Resultado;

      } catch (error) {
         log.error('error', { error: error.message, stack: error.stack });
         return 'id:400, Error controlado';
      }
   }

   function FormateaFechaYYMMAA(fecha) {
      // Verifica que la fecha tenga el formato correcto
      if (fecha.length !== 8 || isNaN(fecha)) {
         throw new Error("Formato de fecha inválido. Se esperaba YYYYMMDD.");
      }
      const anio = fecha.substring(0, 4);
      const mes = fecha.substring(4, 6);
      const dia = fecha.substring(6, 8);

      // Retorna la fecha formateada
      return `${dia}/${mes}/${anio}`;
   }

   function FormateaFecha(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
   }

   const TransformaData = (data) => {
      // Encuentra el primer objeto para usarlo como encabezado
      const header = data.length > 0 ? { ...data[0] } : {};

      const totalItem = data.find(item => item.Secuencia === "0")?.Total_Item || null;

      // Elimina las propiedades de detalle del objeto encabezado
      delete header.Secuencia;
      delete header.IdItem;
      delete header.CodigoItem;
      delete header.ItemDescripcion;
      delete header.IdItemRelacion;
      delete header.Clase;
      delete header.PPS;
      delete header.ADP;
      delete header.Tipo_Transaccion;
      delete header.Grupo_Producto;
      delete header.PrecioBase;
      delete header.Total_Item;
      delete header.Iva;
      delete header.PrecioUnitario;
      delete header.PrecioCliente;
      delete header.ValorPromocion;
      delete header.TasaDsctoItem;
      delete header.TasaDsctoGeneral;
      delete header.OrdenFabricacion;
      delete header.Descuento_General;
      delete header.IdTipoPlazo;
      delete header.TipoPlazo;
      delete header.Plazo;
      delete header.TipoArticulo;
      delete header.IdIvaDescripcion;
      delete header.IdIva;
      delete header.PorcentajeIva;
      delete header.ExisteCobertura;
      delete header.IdGrupoProd;
      delete header.GrupoProd;
      delete header.FechaInicioCob;
      delete header.FechaFinCob;
      delete header.IdEstadoCobertura;
      delete header.EstadoCobertura;
      delete header.IdEstadoInstal;
      delete header.EstadoInstal;
      delete header.TipoRegistro;
      delete header.SecuenciaDetalle;
      delete header.Chequeado;
      delete header.Id_OT;
      delete header.Fecha_Chequeo;
      delete header.Hora_Chequeo
      delete header.IdTecnicoChequeo;
      delete header.TecnicoChequeo;
      delete header.Codigo_Cliente_Nuevo;
      delete header.Codigo_Cliente_Nuevo_Ns;

      // Agrega el Total_Item a la cabecera si Secuencia es "0"
      if (totalItem) {
         header.Subtotal = totalItem;
      }

      // Agrega un nuevo campo "DetalleOrden" al encabezado
      header.DetalleOrden = data
         .filter(item => item.Secuencia !== "0")
         .map(item => {
            return {
               Secuencia: item.SecuenciaDetalle,
               IdItem: item.IdItem,
               CodigoItem: item.CodigoItem,
               ItemDescripcion: item.ItemDescripcion,
               IdItemRelacion: item.IdItemRelacion,
               Clase: item.Clase,
               PPS: item.PPS,
               ADP: item.ADP,
               Tipo_Transaccion: item.Tipo_Transaccion,
               Grupo_Producto: item.Grupo_Producto,
               PrecioBase: item.PrecioBase,
               Total_Item: item.Total_Item,
               Iva: item.Iva,
               PrecioUnitario: item.PrecioUnitario,
               PrecioCliente: item.PrecioCliente,
               ValorPromocion: item.ValorPromocion,
               TasaDsctoItem: item.TasaDsctoItem,
               TasaDsctoGeneral: item.TasaDsctoGeneral,
               OrdenFabricacion: item.OrdenFabricacion,
               Descuento_General: item.Descuento_General,
               IdTipoPlazo: item.IdTipoPlazo,
               TipoPlazo: item.TipoPlazo,
               Plazo: item.Plazo,
               TipoArticulo: item.TipoArticulo,
               IdIvaDescripcion: item.IdIvaDescripcion,
               IdIva: item.IdIva,
               PorcentajeIva: item.PorcentajeIva,
               Chequeado: item.Chequeado,
               Id_OT: item.Id_OT,
               Fecha_Chequeo: item.Fecha_Chequeo,
               Hora_Chequeo: item.Hora_Chequeo,
               IdTecnicoChequeo: item.IdTecnicoChequeo,
               TecnicoChequeo: item.TecnicoChequeo,
               Codigo_Cliente_Nuevo: item.Codigo_Cliente_Nuevo,
               Codigo_Cliente_Nuevo_Ns: item.Codigo_Cliente_Nuevo_Ns

               /*ExisteCobertura: item.ExisteCobertura,
                IdGrupoProd: item.IdGrupoProd,
                GrupoProd: item.GrupoProd,
                FechaInicioCob: item.FechaInicioCob,
                FechaFinCob: item.FechaFinCob,
                IdEstadoCobertura: item.IdEstadoCobertura,
                EstadoCobertura: item.EstadoCobertura,
                IdEstadoInstal: item.IdEstadoInstal,
                EstadoInstal: item.EstadoInstal,
                TipoRegistro: item.TipoRegistro*/
            };
         });

      return [header];
   };

   // Función para convertir la fecha de formato "dd/mm/yyyy" a un objeto Date
   const convertirFecha = (fechaStr) => {
      if (fechaStr === "") return null; // Manejo de fechas vacías
      const [dia, mes, anio] = fechaStr.split("/").map(Number);
      return new Date(anio, mes - 1, dia);
   };


   return {
      get: _get,
      post: _post
   }
});