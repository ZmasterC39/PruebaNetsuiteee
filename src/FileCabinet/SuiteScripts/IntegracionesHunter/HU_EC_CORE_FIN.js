/**
 * @NApiVersion 2.1
 */

define([ 'N/log', 'N/record' ], (log, record) => {

    function create(ordenServicioId){
        let orden_servicio = record.load({ type: record.Type.SALES_ORDER, id: ordenServicioId, isDynamic: true });
        try {
            // let start = new Date();
            // let buildId = new Array();
            // let objbuildId = new Array();
            let hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            let nroCuota = 1;
            // Cargar la OS

            let tranid = orden_servicio.getValue('tranid');
            let location = orden_servicio.getValue('location');
            let programa = orden_servicio.getLineCount({ sublistId: 'billingschedule'});
            let numLinesItem = orden_servicio.getLineCount({ sublistId: 'item' });
            let estado_factura_interna = orden_servicio.getValue('custbody_ec_estado_factura_interna');
            if(estado_factura_interna == '2'){
              return {
                    error: false,
                    message: `Ya fue procesado ${tranid}`
                }
            }
            //log.debug("INFO", {programa })

            let billingschedule = new Array();

            for (let i = 0; i < programa; i++) {
                //let fechaFactura = new Date(hoy);
                //fechaFactura.setMonth(hoy.getMonth() + i);
                //log.debug(`fechaFactura ${i}`, fechaFactura);
                //let billdate = fechaFactura;
                let billdate = orden_servicio.getSublistValue({ sublistId: 'billingschedule', fieldId: 'billdate', line: i });
                let billamount = orden_servicio.getSublistValue({ sublistId: 'billingschedule', fieldId: 'billamount', line: i });
                billingschedule.push({billdate, billamount});
            }
            log.debug(`billingschedule ${tranid}`, billingschedule);
            let base;
            let emision = 0;

            if ( programa > 0 ) {
                for ( let i = 0; i < programa; i++ ){
                    base = _fin_build(ordenServicioId, numLinesItem, location, billingschedule[i], nroCuota, orden_servicio);
                    //log.debug("base _fin_build", base)
                    if ( !base.error){
                        nroCuota++;
                        emision += 1;
                    }
                }
            }

            if( emision > 0){
                orden_servicio.setValue({
                    fieldId: 'custbody_ec_estado_factura_interna',
                    value: '2'
                });

                orden_servicio.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: false
                });
                return {
                    error: false,
                    message: `OK ${tranid}`
                }
            }else{
                return {
                    error: true,
                    message: `${tranid}`
                }
            }

        } catch (error) {
            log.error("ERROR create", error);
            return {
                error: true,
                message: error.message
            }
        }
    }

    function _fin_build(ordenServicioId, numLinesItem, location, billingschedule, nroCuota, orden_servicio_original){
        try {
            let finBuild = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: ordenServicioId,
                toType: 'customsale_ec_factura_interna',
                isDynamic: true
            });

            finBuild.setValue('custbody_ec_created_from_fac_int', ordenServicioId);
            finBuild.setValue('custbody_ec_nro_cuota_fac_int', nroCuota);
            finBuild.setValue('custbodyts_ec_tipo_documento_fiscal', 37);
            finBuild.setValue('location', location);
            finBuild.setValue('trandate', billingschedule.billdate);

            // let totalLineasTransformado = finBuild.getLineCount({ sublistId: 'item' });

            // totalLineasTransformado = finBuild.getLineCount({ sublistId: 'item' });

            for (let j = 0; j < numLinesItem; j++) {

                let itemOriginal = orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                let itemAgrupado = orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_so_item_agrupado', line: j })
                let quantity = orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: j })
                let unitsOriginal= orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'units', line: j });
                //log.debug("unitsOriginal", unitsOriginal);
                let rateOriginal = orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: j });
                let priceLevel = orden_servicio_original.getSublistValue({ sublistId: 'item', fieldId: 'price', line: j });
                let priceLeveltext = orden_servicio_original.getSublistText({ sublistId: 'item', fieldId: 'price', line: j });
                //log.debug("rateOriginal", rateOriginal);
                //log.debug("priceLeveltext - orden_servicio_original.getSublistValue", `${priceLevel} ${typeof priceLevel} | ${priceLeveltext} ${typeof priceLeveltext}`);
                finBuild.selectLine({ sublistId: 'item', line: j });
                // ! ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

                let units = finBuild.getSublistText({ sublistId: 'item', fieldId: 'units', line: j });
                //log.debug("units", units);
                let price = finBuild.getSublistText({ sublistId: 'item', fieldId: 'price', line: j });
                //log.debug("price - finBuild.getSublistText ", `${price} ${typeof price}`);

                let rate = finBuild.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: j });
                if (itemAgrupado) {
                    finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemAgrupado });
                } else {
                    finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemOriginal });
                }
                if ( units === 'SRVM'){
                    finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                    finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'units', value: 50 }); // SRVM
                }
                finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: priceLevel });
                finBuild.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rate });

                //if( ordenServicioId == 4398245){
                  log.audit(`OS id ${ordenServicioId}`, `priceLevel: ${priceLevel} ${typeof priceLevel}`);
                  log.audit(`OS id ${ordenServicioId}`, `priceLeveltext: ${priceLeveltext} ${typeof priceLeveltext}`);
                  log.audit(`OS id ${ordenServicioId}`, `price .getSublistText: ${price} ${typeof price}`);
                //}
                finBuild.commitLine({ sublistId: 'item' });
            }

            let fingen = finBuild.save({ ignoreFieldChange: true, forceSyncSourcing: true });

            actualizarValorNeto(fingen);
          
            return fingen;
        } catch (error) {
            log.error("ERROR _fin_build", error);

            orden_servicio_original.setValue({
                fieldId: 'custbody_ec_estado_factura_interna',
                value: '1'
            });

            orden_servicio_original.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });

            return {
                error: true,
                message: error.message
            }
        }

    }

  const actualizarValorNeto = (idFactura) => {
        try {

            log.debug("idFactura", idFactura)

          if(!idFactura){
            return
          }
          
            // Cargar la factura
            let invoiceRec = record.load({
                type: 'customsale_ec_factura_interna',
                id: idFactura,
                isDynamic: false
            });

            // Obtener el total
            let totalFactura = invoiceRec.getValue({ fieldId: 'total' });

            log.debug("totalFactura", totalFactura)


            // Actualizar el campo personalizado
            record.submitFields({
                type: 'customsale_ec_factura_interna',
                id: idFactura,
                values: {
                    custbody_valor_neto_fin: totalFactura
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            log.debug("OK", { idFactura, totalFactura });

        } catch (e) {
            log.debug("Error", e);
        }
    };
  

    return { create }
});