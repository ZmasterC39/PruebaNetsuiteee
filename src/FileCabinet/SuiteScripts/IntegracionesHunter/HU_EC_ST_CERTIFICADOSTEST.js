/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * @author Mauro F Ramos
 * @date 26/03/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 * @LastModifiedBy
 */
define(['N/ui/serverWidget', 'N/query', 'N/log', 'N/search','N/runtime', 'N/record'], (serverWidget, query, log, search, runtime, record) => {

    const onRequest =  (context) => {
        try {   

            let form = serverWidget.createForm({
                title: "GENERACIÓN DE DOCUMENTOS COMERCIALES - TEST 🛠️",
            });
            form.clientScriptModulePath = "SuiteScripts/IntegracionesHunter/Validaciones/ClientScripts/HU_EC_CS_CERTIFICADOSTEST.js";
            _uiMain(context,form);
            let os = context.request.parameters.os;
            let cliente = context.request.parameters.cliente;
            let fecha_desde = context.request.parameters.fecha_desde || null;
            let fecha_hasta = context.request.parameters.fecha_hasta || null;
            if(os || cliente || fecha_desde || fecha_hasta){
                _uiSublist(form, 1, os, cliente, fecha_desde, fecha_hasta);
            }else{
                _uiSublist(form, 0);
            }

            context.response.writePage(form);
        } catch (error) {
            log.error("ERROR onRequest", error.stack);
        }
    }

    function _uiMain(context, form){
        try {

            form.addResetButton({
                label: 'Cancelar'
            });
            form.addFieldGroup({
                id: 'custpage_informacion_bien',
                label: "Criterios de búsqueda"
            });
            let cliente = form.addField({
                id: 'custpage_cliente',
                type: serverWidget.FieldType.SELECT,
                label: 'Cliente',
                container: 'custpage_informacion_bien',
                source: "customer",
            });
            cliente.defaultValue = context.request.parameters.cliente || null;

            let fecha_desde = form.addField({
                id: 'custpage_fecha_desde',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Desde',
                container: 'custpage_informacion_bien',
            });
            fecha_desde.defaultValue = context.request.parameters.fecha_desde || null;

            let fecha_hasta = form.addField({
                id: 'custpage_fecha_hasta',
                type: serverWidget.FieldType.DATE,
                label: 'Fecha Hasta',
                container: 'custpage_informacion_bien',
            });
            fecha_hasta.defaultValue = context.request.parameters.fecha_hasta || null;

            form.addField({
                id: 'custpage_inline_html',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'INLINEHTML',
                container: 'custpage_informacion_bien',
            });
            form.addField({
                id: 'custpage_inline_html1',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'INLINEHTML',
                container: 'custpage_informacion_bien',
            });

            let os = form.addField({
                id: 'custpage_os',
                type: serverWidget.FieldType.TEXT,
                label: 'Orden de Servicio',
                container: 'custpage_informacion_bien',
            });
            os.defaultValue = context.request.parameters.os || null

            let cmbCertificado = form.addField({
                id: 'custpage_cmb_certificado',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Certificado',
                container: 'custpage_informacion_bien',
            });
            cmbCertificado.defaultValue = `
            <div style="margin: 10px 0px">
                <span style=" font-size:13px; color:#6f6f6f;">CERTIFICADOS DISPONIBLES</span>
                <br>
                <select style="width: 280px; padding: 5px;">
                    <option value="">-- Seleccione un certificado --</option>
                </select>
            </div>`;

        } catch (error) {
            log.error("ERROR _uiMain", error.stack);
        }
    }

    function _uiSublist(form, estado, os, cliente, fechaIni, fechaFin) {
        let sublist = form.addSublist({
            id: 'custpage_sublista',
            type: serverWidget.SublistType.LIST,
            label: "Busqueda"
        });

        if(estado == 1 ) {
            try {
                let filters = [];
                let conditions = [];
                // Filtros condicionales
                if (os) {
                    conditions.push(["number", "equalto", os]);
                }
                if(fechaIni && fechaFin){
                    conditions.push(["trandate","within", fechaIni, fechaFin]);
                }
                // Filtros obligatorios
                // conditions.push(["item.type", "anyof", "InvtPart", "NonInvtPart", "Description",
                //             "Discount", "Assembly", "Expense", "Group", "Kit", "OthCharge",
                //             "Payment", "SubscriPlan", "Markup", "Service", "Subtotal"]);
                conditions.push(["mainline", "is", "F"]);
                if (cliente) {
                    conditions.push(["name", "anyof", cliente]);
                }
                conditions.push(["customform", "anyof", "142"]);
                // Construir array de filtros con operadores AND
                for (let i = 0; i < conditions.length; i++) {
                    if (i > 0) {
                        filters.push("AND");
                    }
                    filters.push(conditions[i]);
                }

                log.debug("filters", filters)

                var transactionSearchObj = search.create({
                    type: "transaction",
                    settings: [{"name":"consolidationtype","value":"ACCTTYPE"}],
                    filters,
                    columns: [
                        search.createColumn({
                            name: "name",
                            join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
                            label: "ID"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_ot_estado",
                            join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
                            label: "HT OT Estado Orden de trabajo"
                        }),
                        search.createColumn({name: "tranid", label: "Número de documento"}),
                        search.createColumn({name: "trandate", label: "Fecha"}),
                        search.createColumn({name: "custbody_ht_os_ejecutiva_backoffice", label: "HT Ejecutiva de Gestión"}),
                        search.createColumn({name: "salesrep", label: "Representante de ventas"}),
                        search.createColumn({name: "custbody_ht_os_ejecutivareferencia", label: "HT Ejecutiva de referencia"}),
                        search.createColumn({
                        name: "vatregnumber",
                        join: "customerMain",
                        label: "Número de impuesto"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_codsysh",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Cod SysHunter"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_marca",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Marca"
                        }),
                        search.createColumn({
                            name: "altname",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "Nombre"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_modelo",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Modelo"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_tipo",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Tipo"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_ano",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Año"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_colorcarseg",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Color Carseg"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_motor",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Motor"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_chasis",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Chasis"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_companiaseguros",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Compañía de seguros"
                        }),
                        search.createColumn({
                            name: "custrecord_ht_bien_consesionarios",
                            join: "CUSTBODY_HT_SO_BIEN",
                            label: "HT BN Concesionarios"
                        }),
                        search.createColumn({name: "item", label: "Artículo"}),
                        search.createColumn({
                        name: "internalid",
                        join: "item",
                        label: "Nombre para mostrar"
                        }),
                        search.createColumn({
                        name: "displayname",
                        join: "item",
                        label: "Nombre para mostrar"
                        }),
                        search.createColumn({name: "entity", label: "Nombre"}),
                        search.createColumn({name: "account", label: "Cuenta"}),
                        search.createColumn({name: "memo", label: "Nota"}),
                        search.createColumn({name: "amount", label: "Importe"}),
                        search.createColumn({
                            name: "custrecord_ht_ot_item",
                            join: "CUSTRECORD_HT_OT_ORDEN_SERVICIO",
                            label: "HT OT Ítem"
                        }),
                        search.createColumn({name: "custbody_ht_so_bien", label: "Bien"}),
                        search.createColumn({
                            name: "formulatext",
                            formula: "CASE WHEN {custbody_ht_so_bien.name} IS NOT NULL THEN '' || {custbody_ht_so_bien.name} ELSE '' || {custbody_ht_so_bien.custrecord_ht_bien_codsysh} END",
                            label: "Fórmula (texto)"
                            })
                    ]
                });

                let resultSet = transactionSearchObj.run();
                let results = resultSet.getRange({start: 0, end: 300});

                // Transformar los resultados
                let data =  (transformedData = results.map((result) => {
                    var rowData = {};
                    rowData['id'] = result.id;
                    transactionSearchObj.columns.forEach((column) => {
                    var value = result.getText(column) || result.getValue(column);
                    rowData[column.name] = value.toString();
                    });
                    return rowData;
                }));

                // Agregar columnas a la sublista
                sublist.addField({
                    id: 'custpage_checkbox',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Seleccionar'
                });
                let os_id = sublist.addField({
                    id: 'custpage_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Número de documento'
                });
                os_id.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                sublist.addField({
                    id: 'custpage_tranid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Número de documento'
                });
                sublist.addField({
                    id: 'custpage_trandate',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Fecha'
                });
                sublist.addField({
                    id: 'custpage_name',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Orden de trabajo'
                });
                sublist.addField({
                    id: 'custpage_custrecord_ht_ot_estado',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Estado OT'
                });
                sublist.addField({
                    id: 'custpage_custbody_ht_os_ejecutiva_backoffice',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Ejecutiva de Gestión'
                });
                sublist.addField({
                    id: 'custpage_salesrep',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Rep. de Ventas'
                });
                sublist.addField({
                    id: 'custpage_custbody_ht_os_ejecutivareferencia',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Ejecutiva de referencia'
                });
                // sublist.addField({
                //     id: 'custpage_vatregnumber',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Número de impuesto'
                // });
                sublist.addField({
                    id: 'custpage_entity',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Nombre'
                });
                sublist.addField({
                    id: 'custpage_formulatext',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Cod. Vehiculo'
                });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_marca',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Marca'
                // });
                sublist.addField({
                    id: 'custpage_altname',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Nombre'
                });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_modelo',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Modelo'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_tipo',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Tipo'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_ano',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Año'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_colorcarseg',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Color'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_motor',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Motor'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_chasis',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Chasis'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_companiaseguros',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Compañia de seguros'
                // });
                // sublist.addField({
                //     id: 'custpage_custrecord_ht_bien_consesionarios',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Compañia de seguros'
                // });
                // sublist.addField({
                //     id: 'custpage_item',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Item'
                // });
                // sublist.addField({
                //     id: 'custpage_displayname',
                //     type: serverWidget.FieldType.TEXT,
                //     label: 'Producto'
                // });
                sublist.addField({
                    id: 'custpage_fam',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Producto'
                });
                let cid = sublist.addField({
                    id: 'custpage_cobertura_id',
                    type: serverWidget.FieldType.TEXT,
                    label: 'ID COBERTURA'
                });
                cid.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                let bienid = sublist.addField({
                    id: 'custpage_custbody_ht_so_bien',
                    type: serverWidget.FieldType.TEXT,
                    label: 'ID BIEN'
                });
                bienid.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                let emailenvio = sublist.addField({
                    id: 'custpage_email',
                    type: serverWidget.FieldType.TEXT,
                    label: 'EMAIL'
                });
                emailenvio.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                let senderNameenvio  = sublist.addField({
                    id: 'custpage_sendername',
                    type: serverWidget.FieldType.TEXT,
                    label: 'SENDERNAME'
                });
                senderNameenvio.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                let senderId = runtime.getCurrentUser().name;
                let senderIdemail = runtime.getCurrentUser().email;
                let email = senderIdemail.split("@")[0];
                let senderName = senderId.split(" ").slice(1).join(" ");

                let filteredData = data.filter(item => {
                    let adp = obtenerParametrizacionItem([item.internalid], ["ADP", "FAM", "CPR"]);
                    if(item.item !== item.custrecord_ht_ot_item){
                        return;
                    }
                    log.debug("ADP", adp)
                    if(adp[0].Valor === '001' || adp[0].Valor === '003' || adp[0].Valor === '006' || adp[2].Valor == 'S'){ // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
                        item.fam = adp[1].ValorText;
                        let cobertura = consultaCobertura(item.custbody_ht_so_bien, adp[1].ValorId)
                        // let factura = Get_ObtenerFactura(item.id);
                        // let factura_fin = Get_ObtenerFacturaInterna(item.id);
                        // log.debug("factura", factura);
                        // log.debug("factura interna", factura_fin);
                        item.cobertura_id = cobertura?.cobertura_id || ""
                        item.email = email;
                        item.sendername = senderName
                        return item;
                    }
                });
                // log.debug("filtro usado", filteredData);
                filteredData.forEach((item, index) => {
                    Object.keys(item).forEach((key) => {
                        sublist.setSublistValue({
                            id: `custpage_${key}`,
                            line: index,
                            value: item[key] || " "
                        });
                        if(key === 'entity1' || key === 'custbody_ht_os_ejecutiva_backoffice' || key === 'salesrep'){
                            let nombreCompleto = item[key];
                            let soloNombre =nombreCompleto.split(' ').slice(1).join(' ');
                            sublist.setSublistValue({
                                id: `custpage_${key}`,
                                line: index,
                                value: soloNombre || " "
                            });
                        }
                        if(key === 'name'){
                            sublist.setSublistValue({
                                id: `custpage_${key}`,
                                line: index,
                                value: item[key] || "0"
                            });
                        }
                        if(key === 'custrecord_ht_ot_estado' || key == 'fam'){
                            sublist.setSublistValue({
                                id: `custpage_${key}`,
                                line: index,
                                value: item[key] || "-"
                            });
                        }
                    });
                });
            } catch (e) {
                log.error('Error en la búsqueda', e);
            }
        }
    }

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {
            let data = [];
            for (let i = 0; i < busquedaParametro.length; i++) {

                let filtro = [
                    ["custrecord_ht_pp_parametrizacionid", "is", items],
                    "AND",
                    ["custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code", "is", busquedaParametro[i]]
                ];

                let busqueda = search.create({
                    type: "customrecord_ht_pp_main_param_prod",
                    filters: filtro,
                    columns: [
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_rela", label: "Param" }),
                        search.createColumn({ name: "custrecord_ht_pp_parametrizacion_valor", label: "Valor" }),
                        search.createColumn({ name: "custrecord_ht_pp_code", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA", label: "Código" }),
                        search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
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
                } else {
                    data.push({
                        Param: "",
                        ParamId: "",
                        Valor: "",
                        ValorText: "",
                        ValorId: "",
                    });
                }
            }
            return data;
        } catch (error) {
            log.error("Error", { error: error.message, stack: error.stack });
            return []
        }
    };

    function consultaCobertura(IdVehiculo, idfamilia) {
        let results = [];
        let filtro = "";
        try {
        let CoberturaSearch = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
            ["custrecord_ht_co_bien", "anyof", IdVehiculo],
            // "AND",
            // ["custrecord_ht_co_coberturainicial","on","01/01/1900"], //! 06/11/2024
            //   "AND",
            //   ["custrecord_ht_co_estado_cobertura", "anyof", "2", "3"],
            "AND",
            ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
            "AND",
            ["isinactive", "is", "F"]
            ],
            columns: [
            search.createColumn({ name: "internalid" }),
            search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
            search.createColumn({ name: "custrecord_ht_co_bien" }),
            search.createColumn({ name: "custrecord_ht_co_producto" }),
            search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
            search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
            search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
            search.createColumn({ name: "custrecord_ht_co_plazo" }),
            search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
            search.createColumn({ name: "custrecord_ht_co_propietario" }),
            ],
        });
        let searchResult = CoberturaSearch.runPaged();
        searchResult.pageRanges.forEach(function (pageRange) {
            let myPage = searchResult.fetch({ index: pageRange.index });
            myPage.data.forEach(function (result) {
            results.push({
                cobertura_id: result.getValue({ name: "internalid" }),
                clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
                bien: result.getValue({ name: "custrecord_ht_co_bien" }),
                producto: result.getValue({ name: "custrecord_ht_co_producto" }),
                coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
                coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
                numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
                plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
                estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
                propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            });
            });
        });
        return results[0];
        } catch (error) {
        log.error("error", error);
        return [];
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
            let ResConsulta = BusquedaFactura.run().getRange(0, ConteoResultados);
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
                            var FechaPagoF = ("0" + dia).slice(-2) + "/" + ("0" + mes).slice(-2) + "/" + anio;
                            if (parseFecha(FechaPagoF) > parseFecha(FechaPago)) {
                                IdPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i });
                                RefPago = Factura.getSublistValue({ sublistId: 'links', fieldId: 'tranid', line: i });
                                FechaPago = FechaPagoF; //Factura.getSublistValue({sublistId: 'links', fieldId: 'trandate', line: i});
                            }
                        }
                    }
                }
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
            return Resultado;
        } catch (error) {
            log.error('error', { error: error.message, stack: error.stack });
            return 'id:400, No se encontraron resultados. Error Controlado. (Get_ObtenerFactura)';
        }
    }

    function Get_ObtenerFacturaInterna(IdOs) {
        try {
            let Resultado = [];
            let F_Desde = '';
            let F_Hasta = '';
            let PaginaId = 0;
            let LONGITUD_PAGINA = 50;
            let BusquedaOrdenesFacturaInterna = search.create({
                type: "salesorder",
                //settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
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

                            if (TipoPago != 'Total') { //AQUI
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

    return { onRequest }
});
