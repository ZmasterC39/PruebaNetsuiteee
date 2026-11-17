/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(["N/log", "N/record", "N/search"], (log, record, search) => {
  const LONGITUD_PAGINA = 600;

  const _get = (context) => {
    log.debug("Contexto recibido", context);
    try {
      const indice = Number(context?.indice || 1);
      const ID_Proveedor = context?.idproveedor || null;
      if(ID_Proveedor){
        if (indice < 1) return JSON.stringify({ results: [] });
        return JSON.stringify(ConsultaProveedorGeneral2(indice, ID_Proveedor));
      }else{
        if (indice < 1) return JSON.stringify({ results: [] });
        return JSON.stringify(ConsultaProveedorGeneral1(indice, null));
      }
    } catch (error) {
      log.error("Error en _get", error);
      return JSON.stringify({ results: [] });
    }
  };

  // const ConsultaPorProveedor = (ID_Proveedor) => {
  //   try {
  //     const Busqueda = search.create({
  //       type: "transaction",
  //       filters: [
  //         ["subsidiary", "anyof", "2"],
  //         "AND",
  //         ["entity", "anyof", ID_Proveedor],
  //         "AND", [
  //           [
  //             ["type", "anyof", "VendBill"],
  //             "AND", ["mainline", "is", "T"],
  //             "AND", ["status", "noneof", "VendBill:C"],
  //             "AND", ["memo", "doesnotcontain", "VOID"]
  //           ],
  //           "OR",
  //           [
  //             ["type", "anyof", "VendPymt", "VPrepApp"],
  //             "AND", ["mainline", "is", "F"],
  //             "AND", ["status", "noneof", "VendPymt:V"]
  //           ],
  //           "OR",
  //           [
  //             ["type", "anyof", "Journal"],
  //             "AND", ["mainline", "is", "T"],
  //             "AND", ["appliedtotransaction.internalid", "noneof", "@NONE@"],
  //             "AND", ["status", "noneof", "Journal:V"],
  //             "AND", ["accountingbook", "noneof", ["1"]]
  //           ]
  //         ]
  //       ],
  //       columns: [
  //         search.createColumn({ name: "entity", summary: "GROUP" }),
  //         search.createColumn({ name: "type", summary: "GROUP" }),
  //         search.createColumn({ name: "amount", summary: "SUM" }),
  //       ]
  //     });

  //     const pagedResult = Busqueda.runPaged({ pageSize: 10 });
  //     if (pagedResult.count === 0) return [];

  //     const pagina = pagedResult.fetch({ index: 0 });

  //     return pagina.data.map(res => ({
  //       ID_Proveedor: res.getValue({ name: "entity", summary: "GROUP" }),
  //       Tipo_Transaccion: res.getText({ name: "type", summary: "GROUP" }),
  //       Total_Importe: parseNumber(res.getValue({ name: "amount", summary: "SUM" })),
  //     }));

  //   } catch (error) {
  //     log.error("Error en ConsultaPorProveedor", error);
  //     return [];
  //   }
  // };

  // const ConsultaProveedorGeneral = (indice) => {
  //   try {
  //     const pageIndex = Math.max(0, Number(indice) - 1);

  //     const Busqueda = search.create({
  //       type: "vendor",
  //       filters: [
  //         ["isinactive", "is", "F"],
  //         "AND",
  //         ["subsidiary", "anyof", "2"]
  //       ],
  //       columns: [
  //         search.createColumn({ name: "internalid" }),
  //         search.createColumn({ name: "vatregnumber" }),
  //         search.createColumn({ name: "altname", sort: search.Sort.ASC }),
  //       ]
  //     });

  //     const pagedResult = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
  //     const totalPaginas = Math.ceil(pagedResult.count / LONGITUD_PAGINA);
  //     if (pagedResult.count === 0 || pageIndex >= totalPaginas) return [];

  //     const pagina = pagedResult.fetch({ index: pageIndex });
  //     const ObjResultado = [];

  //     pagina.data.forEach(res => {
  //       const id = res.getValue({ name: "internalid" });
  //       const identificacion = res.getValue({ name: "vatregnumber" }) || "";
  //       const nombre = res.getValue({ name: "altname" }) || "";
  //       const transacciones = ConsultaPorProveedor(id);

  //       transacciones.forEach(trans => {
  //               ObjResultado.push({
  //             id_interno: id || 0,
  //             identificacion: identificacion || "", // Asignación correcta de la propiedad
  //             // nombre: nombre || "", // Asignación correcta de la propiedad   //!!!! aJUSTE CARACTER ESPECIAL
  //             Tipo_Transaccion: trans?.Tipo_Transaccion || "", // Uso opcional seguro con `trans?.`
  //             Total_Importe: trans?.Total_Importe || 0, // Uso opcional seguro con `trans?.`
  //             Paginas: totalPaginas || 0 // Asegurar que `totalPaginas` tenga un valor predeterminado
  //         });
  //       });
  //     });

  //     return ObjResultado;

  //   } catch (error) {
  //     log.error("Error en ConsultaProveedorGeneral", error);
  //     return [];
  //   }
  // };

  const ConsultaProveedorGeneral1 = (indice, ID_Proveedor) => {
    try {
      const pageIndex = Math.max(0, Number(indice) - 1);

      let filters = [
        ["isinactive", "is", "F"],
        "AND",
        ["subsidiary", "anyof", "2"],
        "AND",
        ["balance", "notequalto", "0.00"]
      ];

      if (ID_Proveedor) {
        filters.push("AND", ["internalid", "anyof", ID_Proveedor]);
      }

      log.debug("Filtros de búsqueda", filters);

      const Busqueda = search.create({
        type: "vendor",
        filters: filters,
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "vatregnumber" }),
          search.createColumn({ name: "altname", sort: search.Sort.ASC }),
        ]
      });

      const pagedResult = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
      const totalPaginas = Math.ceil(pagedResult.count / LONGITUD_PAGINA);

      if (pagedResult.count === 0 || pageIndex >= totalPaginas) return [];

      const pagina = pagedResult.fetch({ index: pageIndex });
      const ObjResultado = [];

      for (const res of pagina.data) {
        const id = res.getValue({ name: "internalid" });
        const identificacion = res.getValue({ name: "vatregnumber" }) || "";
        const nombre = (res.getValue({ name: "altname" }) || "").replace(/[^a-zA-Z0-9\s]/g, "");

        // log.debug("--Evaluacion--", {
        //   id: id,
        //   identificacion: identificacion,
        //   nombre: nombre
        // });

        // Subconsulta para obtener transacciones del proveedor
        const BusquedaTransacciones = search.create({
          type: "transaction",
          filters: [
            ["entity", "anyof", id],
            "AND",
            ["subsidiary", "anyof", "2"],
            "AND", [
              [
                ["type", "anyof", "VendBill"],
                "AND", ["mainline", "is", "T"],
                "AND", ["status", "noneof", "VendBill:C"],
                "AND", ["memo", "doesnotcontain", "VOID"]
              ],
              "OR",
              [
                ["type", "anyof", "VPrepApp"],
                "AND", ["mainline", "is", "F"],
              ],
              "OR",
              [
                ["type", "anyof", "VendPymt"],
                "AND", ["mainline", "is", "T"],
                "AND", ["status", "noneof", "VendPymt:V"]
              ],
              "OR",
              [
                // ["vendor.internalid", "anyof", id], "AND",
                ["type", "anyof", "Journal"],
                "AND", ["mainline", "is", "T"],
                "AND", ["appliedtotransaction.internalid", "noneof", "@NONE@"],
                "AND", ["status", "noneof", "Journal:V"],
                "AND", ["accountingbook", "noneof", ["1"]]
              ]
            ]
          ],
          columns: [
            search.createColumn({
              name: "entity"
              , summary: "GROUP"
            }),
            search.createColumn({
              name: "type"
              , summary: "GROUP"
            }),
            search.createColumn({
              name: "creditamount"
              , summary: "SUM"
            }),
            search.createColumn({
              name: "amount"
              , summary: "SUM"
            }),

            // Columna de fórmula para contar las transacciones por tipo
            search.createColumn({
              name: "formulanumeric",
              formula: "COUNT(*)", // Fórmula para contar las transacciones
              summary: "SUM",
              label: "Cantidad de Transacciones"
            })
          ]
        });

        const resultTrans = BusquedaTransacciones.runPaged({ pageSize: 10 });
        if (resultTrans.count === 0) continue;

        const paginaTrans = resultTrans.fetch({ index: 0 });

        for (const trans of paginaTrans.data) {

          let Tipo_Transaccion = trans.getText({
            name: "type"
            , summary: "GROUP"
          }) || ""

          let Total_Importe2 = parseNumber(trans.getValue({
            name: "amount"
            , summary: "SUM"
          })) || 0

          let Total_Importe = parseNumber(trans.getValue({
            name: "creditamount"
            , summary: "SUM"
          })) || 0


          if (Tipo_Transaccion === "Pago de factura" || Tipo_Transaccion === "Asiento" || Tipo_Transaccion === "Aplicación de pago anticipado a proveedor") {
            if (Total_Importe2 < 0) {
              Total_Importe2 = -Total_Importe2; // Invertir el signo para pagos de factura
            }
          }

          ObjResultado.push({
            id_interno: id,
            identificacion: identificacion,
            nombre: nombre,
            Tipo_Transaccion: Tipo_Transaccion,
            Total_Importe: Total_Importe || Total_Importe2,
            Cantidad_Tipo_Transaccion: parseInt(trans.getValue({ name: "formulanumeric", summary: "SUM" })) || 0,
            Paginas: totalPaginas
          });
        }
      }
      return ObjResultado;
    } catch (error) {
      log.error("Error en ConsultaProveedorGeneral", error);
      return [];
    }
  }; // ORIGINAL SOLO ID

  const ConsultaProveedorGeneral2 = (indice, ID_Proveedor, vatRegNumber = "") => {
    try {
      const pageIndex = Math.max(0, Number(indice) - 1);
      const LONGITUD_PAGINA = 20; // o el valor que estés usando
  
      const filtrosBase = [
        ["isinactive", "is", "F"],
        "AND",
        ["subsidiary", "anyof", "2"],
        "AND",
        ["balance", "notequalto", "0.00"]
      ];
  
      const ejecutarBusquedaProveedor = (filtros) => {
        return search.create({
          type: "vendor",
          filters: filtros,
          columns: [
            search.createColumn({ name: "internalid" }),
            search.createColumn({ name: "vatregnumber" }),
            search.createColumn({ name: "altname", sort: search.Sort.ASC }),
          ]
        });
      };
  
      let busqueda;
      let pagedResult;
  
      // 1. Intentar con internalid
      if (ID_Proveedor) {
        const filtrosConID = [...filtrosBase, "AND", ["internalid", "anyof", ID_Proveedor]];
        busqueda = ejecutarBusquedaProveedor(filtrosConID);
        pagedResult = busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
  
        // 2. Si no hay resultados, intentar con vatRegNumber
        if (pagedResult.count === 0 && ID_Proveedor) {
          log.debug("Intentando búsqueda con vatRegNumber", ID_Proveedor); 
          ID_Proveedor = ID_Proveedor.replace(/\s+/g, '');
          const filtrosConVAT = [...filtrosBase, "AND", ["vatregnumber", "is", ID_Proveedor]];
          busqueda = ejecutarBusquedaProveedor(filtrosConVAT);
          pagedResult = busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
        }
      } else {
        // Búsqueda solo con filtros base
        busqueda = ejecutarBusquedaProveedor(filtrosBase);
        pagedResult = busqueda.runPaged({ pageSize: LONGITUD_PAGINA });
      }
  
      const totalPaginas = Math.ceil(pagedResult.count / LONGITUD_PAGINA);
      if (pagedResult.count === 0 || pageIndex >= totalPaginas) return [];
  
      const pagina = pagedResult.fetch({ index: pageIndex });
      const ObjResultado = [];
  
      for (const res of pagina.data) {
        const id = res.getValue({ name: "internalid" });
        const identificacion = res.getValue({ name: "vatregnumber" }) || "";
        const nombre = (res.getValue({ name: "altname" }) || "").replace(/[^a-zA-Z0-9\s]/g, "");
  
        const BusquedaTransacciones = search.create({
          type: "transaction",
          filters: [
            ["entity", "anyof", id],
            "AND",
            ["subsidiary", "anyof", "2"],
            "AND", [
              [
                ["type", "anyof", "VendBill"],
                "AND", ["mainline", "is", "T"],
                "AND", ["status", "noneof", "VendBill:C"],
                "AND", ["memo", "doesnotcontain", "VOID"]
              ],
              "OR",
              [
                ["type", "anyof", "VPrepApp"],
                "AND", ["mainline", "is", "F"],
              ],
              "OR",
              [
                ["type", "anyof", "VendPymt"],
                "AND", ["mainline", "is", "T"],
                "AND", ["status", "noneof", "VendPymt:V"]
              ],
              "OR",
              [
                ["type", "anyof", "Journal"],
                "AND", ["mainline", "is", "T"],
                "AND", ["appliedtotransaction.internalid", "noneof", "@NONE@"],
                "AND", ["status", "noneof", "Journal:V"],
                "AND", ["accountingbook", "noneof", ["1"]]
              ]
            ]
          ],
          columns: [
            search.createColumn({ name: "entity", summary: "GROUP" }),
            search.createColumn({ name: "type", summary: "GROUP" }),
            search.createColumn({ name: "creditamount", summary: "SUM" }),
            search.createColumn({ name: "amount", summary: "SUM" }),
            search.createColumn({
              name: "formulanumeric",
              formula: "COUNT(*)",
              summary: "SUM",
              label: "Cantidad de Transacciones"
            })
          ]
        });
  
        const resultTrans = BusquedaTransacciones.runPaged({ pageSize: 10 });
        if (resultTrans.count === 0) continue;
  
        const paginaTrans = resultTrans.fetch({ index: 0 });
  
        for (const trans of paginaTrans.data) {
          const tipo = trans.getText({ name: "type", summary: "GROUP" }) || "";
          let importe2 = parseNumber(trans.getValue({ name: "amount", summary: "SUM" })) || 0;
          let importe = parseNumber(trans.getValue({ name: "creditamount", summary: "SUM" })) || 0;
  
          if (["Pago de factura", "Asiento", "Aplicación de pago anticipado a proveedor"].includes(tipo)) {
            if (importe2 < 0) importe2 = -importe2;
          }
  
          ObjResultado.push({
            id_interno: id,
            identificacion: identificacion,
            nombre: nombre,
            Tipo_Transaccion: tipo,
            Total_Importe: importe || importe2,
            Cantidad_Tipo_Transaccion: parseInt(trans.getValue({ name: "formulanumeric", summary: "SUM" })) || 0,
            Paginas: totalPaginas
          });
        }
      }
  
      return ObjResultado;
    } catch (error) {
      log.error("Error en ConsultaProveedorResumen", error);
      return [];
    }
  };
  

  const parseNumber = (input) => {
    const number = Number(input);
    return isNaN(number) ? 0 : number;
  };

  return {
    get: _get,
    post: () => { },
    put: () => { },
    delete: () => { }
  };
});
