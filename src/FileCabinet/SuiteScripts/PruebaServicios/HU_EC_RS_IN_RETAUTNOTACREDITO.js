/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _get(context) {
        try {
            let iddocument = context.iddocument;
            let objRecord = record.load({ type: record.Type.CREDIT_MEMO, id: iddocument, isDynamic: true });
            //let objRecord = record.load({ type: record.Type.VENDOR, id: iddocument, isDynamic: true });

           //let companyname = objRecord.getValue({ fieldId: 'entityid' });
  
            return {
                customerpayment: objRecord
               
            }
        } catch (error) {
            log.error('Error', error);
        }
    }
   

    /**
     * Función para obtener el ID del período contable.
     *
     * @param {string} periodo - El nombre del período contable (ej. "jul 2024").
     * @returns {number|null} - El ID del período contable o null si no se encuentra.
     */
    function obtenerIdPeriodoContable(periodo) {
        try {
            const periodSearch = search.create({
                type: "accountingperiod",
                filters: [["periodname", "contains", periodo]],
                columns: ["internalid"],
            });

            const resultSet = periodSearch.run();
            const results = resultSet.getRange({ start: 0, end: 1 });

            if (results.length > 0) {
                return results[0].getValue("internalid");
            } else {
                return "";
            }
        } catch (e) {
            log.error("Error en obtenerIdPeriodoContable", e);
            return "";
        }
    }


    function _post(context) {
        try {

            log.debug('context....', context);

            //REQUEST
            // FIELDS
            let customform = 104;//132 // Formulario de de comprobante de retencion
            let trandate  = context.trandate; // fecha de transacción
            let entity = context.entity; // codigo cliente
            let createdfrom = context.createdfrom; // inernal ID de la factura que aparece en la cabecera
            let subsidiary = context.subsidiary; // Pais
            let location = context.location; // Ciudad
            let applied = Number.parseFloat(context.applied).toFixed(2);// valor aplicado
          
            let custbodyts_ec_tipo_documento_fiscal = context.custbodyts_ec_tipo_documento_fiscal; // tipo documento fiscal NC
            let custbody_ts_ec_serie_retencion = context.custbody_ts_ec_serie_retencion; // tipo documento fiscal NC
            let custbody_ts_ec_preimpreso_retencion = context.custbody_ts_ec_preimpreso_retencion; // tipo documento fiscal NC
            let custbodyts_ec_cod_wht_autorization = context.custbodyts_ec_cod_wht_autorization;
            let custbody_ec_fecha_hora_autorizacion = context.custbody_ec_fecha_hora_autorizacion;
           
            // DOC. REFERENCIA - FACTURA
            let custbodyts_ec_doc_serie_ref = context.custbodyts_ec_doc_serie_ref;
            let custbodyts_ec_doc_number_ref = context.custbodyts_ec_doc_number_ref;
            let custbodyts_ec_doc_type_ref = context.custbodyts_ec_doc_type_ref;
            let custbodyts_ec_doc_fecha_ref = context.custbodyts_ec_doc_fecha_ref;
            let custbody_autor_ref = context.custbody_autor_ref;
            let custbody_ec_comentario = context.custbody_ec_comentario // comentario

            let custbody_ec_origen_comp_ret = context.custbody_ec_origen_ingreso; // Origen ingreso integracion
            let periodo_contable = context.periodo_contable; // Periodo contable Ej. nov 2024

            var custbodyec_tipo_de_documento_retencion = 11 // 07 Comprobante de Retención
            var custbodyts_ec_tipo_trans = 17; // 17	VENTA - RUC
            var custbodyts_ec_tipo_documento_ref = 16; // 18 Documentos autorizados utilizados en ventas excepto N/C N/D

            let idActualizaCliente = 0;
            let obligadocontabilidad = 1;

            //var periodo = 'nov 2024';
            var postingperiod = obtenerIdPeriodoContable(periodo_contable);

             // IVA
             var total_importe_base_iva = 0; 
             var total_monto_de_ret_iva = 0;

             let response = [{
                status: "ER",
                message: "ERROR",
                idinternal: 0
               }];

        
            log.debug('trandate....', trandate);
            log.debug('custbody_ec_fecha_hora_autorizacion....', custbody_ec_fecha_hora_autorizacion);
            log.debug('postingperiod....', postingperiod);
          
          
            /*
            log.debug('entity....', entity);
            log.debug('trandate....', trandate);
            log.debug('location....', location);
            log.debug('createdfrom....', createdfrom);
            log.debug('custbody_ts_ec_metodo_pago....', custbody_ts_ec_metodo_pago);
            log.debug('custbodyts_ec_tipo_trans....', custbodyts_ec_tipo_trans);
            log.debug('seriefactura....', seriefactura);
            log.debug('referenciafactura....', referenciafactura);
            log.debug('custbodyts_ec_tipo_documento_fiscal....', custbodyts_ec_tipo_documento_fiscal);
            log.debug('custbody_ts_ec_serie_cxc....', custbody_ts_ec_serie_cxc);
            */

          
            // OBTENER INTERNAL ID DE CLIENTE
            // var internalidcliente

            var busquedaCliente = search.create({
                type: search.Type.CUSTOMER,
                columns: ['entityid', 'altname','internalid'],
                filters: ['vatregnumber', search.Operator.IS, entity]
            });
            var myResultSetCliente = busquedaCliente.run().getRange({start: 0, end: 1});
            var theCountCli = busquedaCliente.runPaged().count;
            if (theCountCli != 1) {
                log.debug('Busqueda.Error no se encontró el Cliente........', myResultSetCliente);
                //return 'ERROR:' + '100'; //El Cliente no se encuentra registrado
                response = [{
                    status: "ER",
                    message: "ERROR:100",
                    idinternal: 0
                  }];
                  return { results: response };

            } else {
                //Obtiene el ID
                var internalidcliente = myResultSetCliente[0].getValue(busquedaCliente.columns[2]);
            }

            log.debug('internalidcliente....', internalidcliente);
          

            var memo = 'RET. AUT. APLICADA A DEUDA FAC: ' + custbodyts_ec_doc_serie_ref + custbodyts_ec_doc_number_ref
            var rutapdf = 'https://invoice.hunter.com.ec:2250/PDFProv/'+ 'comprobanteElectronico' + custbody_ec_comentario + '.PDF';
            var rutaxml = 'https://invoice.hunter.com.ec:2250/XMLProv/'+ custbody_ec_comentario + '.XML';
          
            var internalidseriefactura = 0
            var origen_ingreso_ht = 'HT';

             // OBTENER ID INTERNO DE LA SERIE DE LA FACTURA
            //var serieBusqueda = SUBSTR({custbodyts_ec_doc_serie_ref},1,3) +'-'+ SUBSTR({custbodyts_ec_doc_serie_ref},4,3)//custbodyts_ec_doc_serie_ref
            //var serieBusqueda = LEFT(custbodyts_ec_doc_serie_ref,3) +'-'+ RIGHT(custbodyts_ec_doc_serie_ref,3)//custbodyts_ec_doc_serie_ref

            var busquedaSeriefactura = search.create({
                type: "customrecordts_ec_series_impresion",
                filters:
                [
                   ["custrecord_ts_ec_tipo_documento","anyof",custbodyts_ec_tipo_documento_ref], 
                   "AND", 
                   ["isinactive","is","F"], 
                   "AND", 
                   ["custrecord_ts_ec_series_impresion","is",custbodyts_ec_doc_serie_ref]
                ],
                columns:
                [
                   search.createColumn({
                      name: "name",
                      sort: search.Sort.ASC,
                      label: "Nombre"
                   }),
                   search.createColumn({name: "custrecord_ts_ec_series_impresion", label: "Serie de Impresión"}),
                   search.createColumn({name: "custrecord_ts_ec_localidad_serie", label: "EC - Localidad por Serie"}),
                   search.createColumn({name: "internalid", label: "ID interno"})
                ]
             });
             var myResultSetSeriefactura = busquedaSeriefactura.run().getRange({start: 0, end: 1});
             var theCountSerie = busquedaSeriefactura.runPaged().count;
             if (theCountSerie != 1) {
                log.debug('Busqueda.Error no se encontró la serie de la factura........', myResultSetSeriefactura); 
                //return 'ERROR:' + '200'; //No se encontro la serie de la factura
                response = [{
                    status: "ER",
                    message: "ERROR:200",
                    idinternal: 0
                  }];
                  return { results: response };
               
             } else {
                //Obtiene el ID
                log.debug('myResultSetSeriefactura....', myResultSetSeriefactura[0]);
                var internalidseriefactura = myResultSetSeriefactura[0].getValue(busquedaSeriefactura.columns[3]);

             }

             log.debug('internalidseriefactura....', internalidseriefactura);


            //internalidseriefactura = 140; // FACTURAS MIGRADAS NO TIENEN EL CODIGO SE SERIE CORRECTO


            // OBTIENE EL ID INTERNO DE LA FACTURA
            var busquedaFactura = search.create({
                type: "invoice",
                filters:
                [
                   ["type","anyof","CustInvc"], 
                   "AND", 
                   ["taxline","is","F"], 
                   "AND", 
                   ["mainline","is","T"], 
                   "AND", 
                   ["voided","is","F"], 
                   "AND", 
                   ["entity","anyof", internalidcliente],
                   "AND",
                   ["custbodyts_ec_tipo_documento_fiscal","anyof", custbodyts_ec_doc_type_ref],
                   "AND",
                   ["custbody_ts_ec_serie_cxc","anyof", internalidseriefactura],
                   "AND",
                   ["custbody_ts_ec_numero_preimpreso","is", custbodyts_ec_doc_number_ref]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID interno"}),
                   search.createColumn({name: "trandate", label: "Fecha"}),
                   search.createColumn({name: "location", label: "Oficina"}), 
                   search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "EC - NUMERO PREIMPRESO"}),
                   search.createColumn({
                      name: "internalid",
                      join: "customerMain",
                      label: "idinternocliente"
                   }),
                   search.createColumn({name: "amount", label: "Importe"}),
                   search.createColumn({name: "amountpaid", label: "Importe pagado"}),
                   search.createColumn({name: "amountremaining", label: "Importe restante"}),
                   search.createColumn({name: "department", label: "Departamento"}), 
                   search.createColumn({name: "class", label: "Clase"}),
                   search.createColumn({
                      name: "name",
                      join: "CUSTBODY_TS_EC_SERIE_CXC",
                      label: "Nombre"
                   }),
                   search.createColumn({
                      name: "internalid",
                      join: "CUSTBODY_TS_EC_SERIE_CXC",
                      label: "ID interno"
                   })
                ]
             });
             var myResultSetFactura = busquedaFactura.run().getRange({start: 0, end: 1});
             var theCountFac = busquedaFactura.runPaged().count;
             if (theCountFac != 1) {
                log.debug('Busqueda.Error no se encontró la factura........', myResultSetFactura);
                //return 'ERROR:' + '300'; //La factura no se encuentra registrada
                response = [{
                    status: "ER",
                    message: "ERROR:300",
                    idinternal: 0
                  }];
                  return { results: response };
               
             } else {
                //Obtiene el ID
                var internalidfactura = myResultSetFactura[0].getValue(busquedaFactura.columns[0]);
                var internalidoficina = myResultSetFactura[0].getValue(busquedaFactura.columns[2]);
                // Saldo de la factura
                var saldofactura = myResultSetFactura[0].getValue(busquedaFactura.columns[7]);
                saldofactura = Number.parseFloat(saldofactura).toFixed(2);// saldo
                var departamento = myResultSetFactura[0].getValue(busquedaFactura.columns[8]);
                var clase = myResultSetFactura[0].getValue(busquedaFactura.columns[9]);
                var fechafactura = myResultSetFactura[0].getValue(busquedaFactura.columns[1]);

            }

            log.debug('internalidfactura.........', internalidfactura);
            log.debug('saldofactura.........', saldofactura);
            log.debug('applied.........', applied);

          
           // VERIFICA SI LA RETENCION YA SE ENCUENTRA REGISTRADA
           // SOLO POR EL NUMERO FISCAL, CLIENTE Y NUMERO FISCAL DE FACTURA
           var busquedaRetencion = search.create({
            type: "creditmemo",
            settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
            filters:
            [
               ["type","anyof","CustCred"], 
               "AND", 
               ["mainline","is","T"], 
               "AND", 
               ["voided","is","F"],
               "AND",
               ["subsidiary","anyof", subsidiary],
               "AND", 
               ["customermain.internalidnumber","equalto",internalidcliente],
               "AND", 
               ["custbodyec_tipo_de_documento_retencion","anyof",custbodyec_tipo_de_documento_retencion], 
               "AND", 
               ["custbody_ts_ec_serie_retencion","is",custbody_ts_ec_serie_retencion], 
               "AND", 
               ["custbody_ts_ec_preimpreso_retencion","is",custbody_ts_ec_preimpreso_retencion]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "ID interno"})
            ]
            });
            
            var myResultSetRetencion = busquedaRetencion.run().getRange({start: 0, end: 1});
            var theCountRet = busquedaRetencion.runPaged().count;
          
            if (theCountRet >= 1) {
                log.debug('Busqueda.Error ya se encontró el registro de Retencion........', myResultSetFactura);
                //return 'ERROR:' + '500'; //La Retencion ya se encuentra registrada
                response = [{
                    status: "ER",
                    message: "ERROR:500",
                    idinternal: 0
                  }];
                  return { results: response };
            }

            // Validar la fecha contable y la cuenta de gasto de IVA
            /*var fechatransaccion = context.trandate;
            var registrofueraperiodo = 'N';
            var codigoimpuestogasto = 0;
            if (fechafactura) {
               var fechafacturaobj = new Date(fechafactura);
               var fechaautorizacionret = new Date(custbody_ec_fecha_hora_autorizacion);
               // Sumar un mes a la fecha
               var messigufactura = fechafacturaobj.getMonth() + 1;
               var mesfecautorizacion = fechaautorizacionret.getMonth();
               var diafecautorizacion = fechaautorizacionret.getDay();
               if ((messigufactura == mesfecautorizacion) && (diafecautorizacion > 7)) {

                 registrofueraperiodo = 'S';
                 fechatransaccion = new Date(custbody_ec_fecha_hora_autorizacion)
                   
               }
              
            }
            */


          if ((internalidfactura > 0) && (saldofactura == 0.00)) {
            response = [{
                    status: "ER",
                    message: "ERROR:400",
                    idinternal: 0
                  }];
                  return { results: response };
          }


            // Si existe el registro de factura y hay saldo
            if ((internalidfactura > 0) && (saldofactura > 0)) {

                // Valores que se obtinen de la busqueda de factura
                location = internalidoficina
                createdfrom = internalidfactura

                //CREATE RECORD
                let objRecord = record.create({ type: record.Type.CREDIT_MEMO, isDynamic: true });
                objRecord.setValue({ fieldId: 'entity', value: internalidcliente });// internal ID del cliente
                
                //objRecord.setValue({ fieldId: 'postingperiod', value: postingperiod });
              
                objRecord.setValue({ fieldId: 'applied', value: applied }); // valor aplicado
                objRecord.setValue({ fieldId: 'createdfrom', value: createdfrom }); // internal id de factura
                objRecord.setValue({ fieldId: 'customform', value: customform }); 
                objRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });
                objRecord.setValue({ fieldId: 'location', value: location });
                objRecord.setValue({ fieldId: 'trandate', value: new Date(context.trandate) });
                //objRecord.setValue({ fieldId: 'trandate', value: new Date(fechatransaccion) });
                objRecord.setValue({ fieldId: 'department', value: departamento });
                objRecord.setValue({ fieldId: 'class', value: clase });
              
                // DATOS DE RETENCION
                objRecord.setValue({ fieldId: 'custbodyts_ec_tipo_documento_fiscal', value: custbodyts_ec_tipo_documento_fiscal }); 
                objRecord.setValue({ fieldId: 'custbody_ts_ec_serie_retencion', value: custbody_ts_ec_serie_retencion }); 
                objRecord.setValue({ fieldId: 'custbody_ts_ec_preimpreso_retencion', value: custbody_ts_ec_preimpreso_retencion }); 
                objRecord.setValue({ fieldId: 'custbodyec_tipo_de_documento_retencion', value: custbodyec_tipo_de_documento_retencion }); 
                objRecord.setValue({ fieldId: 'custbodyts_ec_cod_wht_autorization', value: custbodyts_ec_cod_wht_autorization }); 
                objRecord.setValue({ fieldId: 'custbody_ec_fecha_hora_autorizacion', value: new Date(custbody_ec_fecha_hora_autorizacion) });

    
                // DOC. REFERENCIA: FACTURA
                objRecord.setValue({ fieldId: 'custbodyts_ec_doc_serie_ref', value: custbodyts_ec_doc_serie_ref });
                objRecord.setValue({ fieldId: 'custbodyts_ec_doc_number_ref', value: custbodyts_ec_doc_number_ref });
                objRecord.setValue({ fieldId: 'custbodyts_ec_doc_type_ref', value: custbodyts_ec_doc_type_ref });
                objRecord.setValue({ fieldId: 'custbodyts_ec_doc_fecha_ref',  value: new Date(custbodyts_ec_doc_fecha_ref) });
                objRecord.setValue({ fieldId: 'custbody_autor_ref', value: custbody_autor_ref });
                objRecord.setValue({ fieldId: 'custbody_ec_factura_retencion', value: internalidfactura });
                objRecord.setValue({ fieldId: 'memo', value: memo });
                objRecord.setValue({ fieldId: 'custbody_ei_xml_response', value: rutaxml });
                objRecord.setValue({ fieldId: 'custbody_ei_pdf_response', value: rutapdf });
                objRecord.setValue({ fieldId: 'custbody_ec_origen_comp_ret', value: custbody_ec_origen_comp_ret }); // oriegen ingreso integracion
                objRecord.setValue({ fieldId: 'custbody_ec_origen_ingreso', value: origen_ingreso_ht }); // origen ingreso integracion HT


                // SECCION ITEMS
                // item : codigo de impuesto a aplicar
                const itemLine = objRecord.selectNewLine({ sublistId: 'item' });
                let items = context.items; // declaracion del arreglo del for

                
                for (let i in items) {
                    log.debug('items.........', items);

                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: items[i].item });  // ITEM
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: items[i].amount }); // VALOR DE LA RETENCION
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: items[i].price }); // NIVEL DE PRECIO
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: items[i].taxcode }); // CODIGO IMUESTO IVA 0
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'tax1amt', value: items[i].tax1amt }); // VALOR IMPUESTO IVA 0
                    //itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxrate1', value: items[i].taxrate1 }); // PORCENTAJE IMPUESTO IVA 0
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', value: departamento  }); // DEPARTAMENTO
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'class', value: clase  }); // CLASE
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: internalidoficina  }); // OFICINA DE LA RETENCION

                    //ID_INTERNO	NOMBRE
                    //218	        CL IVA 10% GASTO
                    //219	        CL IVA 100% GASTO
                    //220	        CL IVA 20% GASTO
                    //221	        CL IVA 30% GASTO
                    //222	        CL IVA 70% GASTO

                  
                    /*if ((registrofueraperiodo == "S") && (items[i].tipo_impuesto == "IVA")) {
                       if (items[i].custbody_ec_porcentaje_ret_de_iva == 10) {
                            codigoimpuestogasto = 218;
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 20) {
                            codigoimpuestogasto = 220;
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 30) {
                            codigoimpuestogasto = 221;
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 70) {
                            codigoimpuestogasto = 222;
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 100) {
                            codigoimpuestogasto = 219;
                        }

                        itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: items[i].codigoimpuestogasto }); // CODIGO PRINCIPAL
                      
                    }

                   if ((registrofueraperiodo == "N") && (items[i].tipo_impuesto == "IVA")) {
                        itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: items[i].custbody_ec_codigo_principal }); // CODIGO PRINCIPAL
                   }

                    if ((registrofueraperiodo == "S") && (items[i].tipo_impuesto == "RENTA")) {
                        itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: items[i].custbody_ec_codigo_principal }); // CODIGO PRINCIPAL
                    }
                    */

                  
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_4601_witaxcode', value: items[i].custbody_ec_codigo_principal }); // CODIGO PRINCIPAL
                    if (items[i].custcol_ts_ec_col_ec_concepto_retenci != '0'){
                        itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ts_ec_col_ec_concepto_retenci', value: items[i].custcol_ts_ec_col_ec_concepto_retenci }); //CONCEPTO DE RETENCION
                    }
                    itemLine.setCurrentSublistValue({ sublistId: 'item', fieldId: 'grossamt', value: items[i].grossamt }); // VALOR DE LA RETENCION


                    // LLENADO DE LOS CAMPOS DE CABECERA
                    /*if (items[i].tipo_impuesto == "RENTA") {

                        if (items[i].cont_rtf == 1) {
                          
                            objRecord.setValue({ fieldId: 'custbody_ec_ret_ir', value: items[i].custbody_ec_codigo_principal });
                            objRecord.setValue({ fieldId: 'custbody_ec_importe_base_ir', value: items[i].custbody_ec_importe_base_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_monto_de_ret_ir', value: items[i].custbody_ec_monto_de_ret_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_ir', value: items[i].custbody_ec_porcentaje_ret_ir });
                            

                        }

                        if (items[i].cont_rtf == 2) {
                          
                            objRecord.setValue({ fieldId: 'custbody_ec_ret_por_ir2', value: items[i].custbody_ec_codigo_principal });
                            objRecord.setValue({ fieldId: 'custbody_ec_impb_ir2', value: items[i].custbody_ec_importe_base_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_mont_ret_2', value: items[i].custbody_ec_monto_de_ret_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_ret_ir2', value: items[i].custbody_ec_porcentaje_ret_ir });

                        }

                        if (items[i].cont_rtf == 3) {
                            
                            objRecord.setValue({ fieldId: 'custbody_ec_ret_por_ir3', value: items[i].custbody_ec_codigo_principal });
                            objRecord.setValue({ fieldId: 'custbody_ec_impb_ir3', value: items[i].custbody_ec_importe_base_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_mont_ret_3', value: items[i].custbody_ec_monto_de_ret_ir }); 
                            objRecord.setValue({ fieldId: 'custbody_ec_ret_ir3', value: items[i].custbody_ec_porcentaje_ret_ir });

                        }
                

                    }
                    */


                    // IVA
                  /*
                    if (items[i].tipo_impuesto == "IVA") {

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 10) {
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_10', value: items[i].custbody_ec_monto_de_ret_iva });
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 20) {
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_20', value: items[i].custbody_ec_monto_de_ret_iva });
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 30) {
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_30', value: items[i].custbody_ec_monto_de_ret_iva });
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 70) {
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_70', value: items[i].custbody_ec_monto_de_ret_iva });
                        }

                        if (items[i].custbody_ec_porcentaje_ret_de_iva == 100) {
                            objRecord.setValue({ fieldId: 'custbody_ec_porcentaje_ret_100', value: items[i].custbody_ec_monto_de_ret_iva });
                        }
                    
                        //total_monto_de_ret_iva = total_monto_de_ret_iva + items[i].custbody_ec_monto_de_ret_iva;
                        //total_importe_base_iva = total_importe_base_iva + items[i].custbody_ec_importe_base_iva;

                         total_monto_de_ret_iva += items[i].custbody_ec_monto_de_ret_iva;
                         total_importe_base_iva += items[i].custbody_ec_importe_base_iva;

    
                    }
                    */


                    objRecord.commitLine({ sublistId: 'item' });

                }

                log.debug('total_monto_de_ret_iva....', total_monto_de_ret_iva);
                log.debug('total_importe_base_iva....', total_importe_base_iva);

                // MONTOS DE RETENCIONES
                //objRecord.setValue({ fieldId: 'custbody_ec_mont_retiva', total_monto_de_ret_iva });
                //objRecord.setValue({ fieldId: 'custbody_ec_importe_base_iva', total_importe_base_iva });
                
                
                // SECCION APPLY
                // Apply : documento a aplicar
                let amount = Number.parseFloat( context.apply[0].amount).toFixed(2); // valor de retencion
                //var amount = 0;
                //let internalid  = context.apply[0].internalid;    // codigo de factura netsuite
                let internalid = internalidfactura
                var apLine = objRecord.getLineCount({
                    sublistId: "apply",
                });


               // CAMBIOS PARA VARIAS FACTURAS
                var factura = '';
                var valoraplicar = 0;
                var idinternalfac = 0;
                let facturas = context.facturas; // declaracion del arreglo del for
                var montoaplicadotot = 0;

                
                if(apLine > 0){

                    for (let f in facturas) {

                        factura = facturas[f].factura  
                        valoraplicar = Number(facturas[f].valoraplicar);
                        idinternalfac = facturas[f].idinternalfac;

                        log.debug('factura....', factura);

                         // Number.parseFloat(facturas[f].valoraplicar).toFixed(2);

                        for (var i = 0; i < apLine; i++) { 

                            
                                var refnum = objRecord.getSublistValue({

                                    sublistId: 'apply',

                                    fieldId: 'internalid',

                                    line: i

                                });

                                var saldofact = objRecord.getSublistValue({

                                    sublistId: 'apply',

                                    fieldId: 'due',

                                    line: i

                                });

                                //  Validar saldo de factura
                                /*if (refnum == idinternalfac && saldofact < valoraplicar){
                                
                                    response = [{
                                        status: "ER",
                                        message: "ERROR:700",
                                        idinternal: 0
                                    }];
                                    return { results: response };
                                
                                }
                                */


                                // Aplicar documento de la lista
                                // si el código de factura es igual al internalId del documento
                                // si el documento tiene saldo
                               
                                if (refnum == idinternalfac && saldofact >= valoraplicar) {


                                    log.debug("facturaid", idinternalfac)
                                    log.debug("saldo factura", saldofact)
                                    log.debug("valoraplicarfac", valoraplicar)
                                    log.debug("saldo factura", saldofact)
                                    

                                    var lnNum = objRecord.selectLine({

                                        sublistId: 'apply',

                                        line: i

                                    });

                                    // Aplicar documento
                                    objRecord.setCurrentSublistValue({

                                        sublistId: 'apply',

                                        fieldId: 'apply',

                                        value: true

                                    });
                                
                                    // Valor de aplicación
                                    objRecord.setCurrentSublistValue({

                                        sublistId: 'apply',

                                        fieldId: 'amount',

                                        value: valoraplicar

                                    });
                                  
                                    
                                    /*
                                    objRecord.commitLine({

                                        sublistId: 'apply'

                                    });
                                    */
                                
                                    //montoaplicadotot = montoaplicadotot + valoraplicar;

                                    montoaplicadotot += valoraplicar;

                                    log.debug('montoaplicadotot....', montoaplicadotot);

                                    break;

                                    
                                }

                        }

                    }
                }

                log.debug('montoaplicadotot....', montoaplicadotot);
                log.debug('amount....', amount);

                // Si el monto no se aplico totalmente
               // Number.parseFloat(montoaplicadotot).toFixed(2);
                if (Number.parseFloat(montoaplicadotot).toFixed(2) != amount){
                    
                    response = [{
                        status: "ER",
                        message: "ERROR:700",
                        idinternal: 0
                    }];
                    return { results: response };
                }
              

                log.audit('objRecord before save', JSON.stringify(objRecord));

                // ACTUALIZA CLIENTE CAMPO custentity_ec_obligado_contabilidad
                let objCliente = record.load({ type: 'CUSTOMER', id: internalidcliente, isDynamic: true }); //abre tabla
                //log.debug('objCliente.........', objCliente);
    
                //obligadocontabilidad: 1	SI - 2	NO
                let oblcontabilidad = objCliente.getValue({ fieldId: 'custentity_ec_obligado_contabilidad' });
                let email = objCliente.getValue({ fieldId: 'email' });
                let telefono = objCliente.getValue({ fieldId: 'phone' });

                if (email != null && email != '' && telefono != null && telefono != ''){
                   if (oblcontabilidad == '2' || oblcontabilidad == ''){
                      objCliente.setValue({fieldId: 'custentity_ec_obligado_contabilidad', value: obligadocontabilidad, ignoreFieldChange: true});
    
                      idActualizaCliente = 0;
                      idActualizaCliente = objCliente.save({ enableSourcing: false, ignoreMandatoryFields: false });
                   }
                      
                }

                // Grabar registro de retencion
                let recordId = objRecord.save({ enableSourcing: false, ignoreMandatoryFields: false });
                log.debug('Result', recordId);

                //let recordId = objRecord.save();

               /*if (recordId) > 0 {
                    try {
                        // Actualizar la fecha al 05/11/2024
                        let objRecordNc = record.load({ type: record.Type.CREDIT_MEMO, id: recordId, isDynamic: true });
                        objRecordNc.setValue({ fieldId: 'trandate', value: new Date(trandate) });
                        objRecordNc.setValue({ fieldId: 'postingperiod', value: postingperiod });
                        objRecordNc.save({ ignoreMandatoryFields: true });

                    } catch (e) {
                        log.error("Error en Actualizar Fecha registro", e);
                    }
                }
                */

               if (recordId > 0) {

                                   
                    response = [{
                         status: "OK",
                         message: "Registro generado correctamente",
                         idinternal: recordId
                    }];

                 
                }
                
               
                //Respuesta.
                return { results: response };

                
            }

        } catch (e) {
            log.error('Error', {e: e.error, stack: e.stack});
            throw e; // Lanza el error para que se registre
        }
    }


    return {
        get: _get,
        post: _post
        //put: _put,
        //delete: _delete
    }
});