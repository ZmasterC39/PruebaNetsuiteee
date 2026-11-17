/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * @author Mauro F Ramos
 * @description
 * UserEventScript, general ECUADOR
 * ! beforeLoad:
 * * Ofuscar información para EC BACK OFFICE
 */
define(["N/log", 'N/email', "SuiteScripts/IntegracionesHunter/Validaciones/Librerias/HU_EC_LIB_CONTROL_FORMULARIO", "N/runtime", 'N/record', 'N/query', 'SuiteScripts/IntegracionesHunter/HU_EC_LIB_TOOLKIT.js', 'N/search', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], function (log, email, _libControl, runtime, record, query, _toolkit, search, coberturaController) {

  function beforeLoad(context) {
    try {
      // *-*-*-*-*-*-* OCULTA LA INFORMACIÓN DE CAMPOS EN EL FORMULARIO
      let { id, subsidiary, role } = runtime.getCurrentUser();
      if (subsidiary == 2) {
        ofuscarInformacion(context);
        btnImprimirOT(context);
        // 1655 - EC ASISTENTE DE BODEGA
        // 1841 - EC SUPERVISOR DE TALLER
        // 1842 - EC TECNICO ELECTRÓNICO
        if ( ![1655, 1841, 1842].includes(role)) {
          context.form.getField('custrecord_trabajo_no_ejecutado').updateDisplayType({ displayType: 'DISABLED' });
        }
        context.form.getField('custrecord_lt_ot_novedades_no_ejecutadas').updateDisplayType({ displayType: 'DISABLED' });
      } else {
        _libControl.ocultarCampos(context, ['custrecord_ht_ot_fecha_recepcion', 'custrecord_ht_ot_hora_recepcion']);
      }
      // *-*-*-*-*-*-*
    } catch (error) {
      log.debug("error", error);
    }
  }

  function btnImprimirOT(context) {
    try {
      if (context.type == context.UserEventType.VIEW) {
        let custScript = 'customscript_hu_ec_sl_ot';
        let custDeploy = 'customdeploy_hu_ec_sl_ot';
        const form = context.form;
        let objRecord = context.newRecord;
        let id = objRecord.id;
        let type = objRecord.type;
        let transaction = objRecord.getValue({ fieldId: 'custrecord_ht_ot_orden_servicio' }) ?? '';

        if (transaction) {
          form.addButton({
            id: "custpage_print_ot_custom_button",
            label: "Imprimir OT",
            functionName: `customButtonFunction('${type}','${transaction}','${custScript}','${custDeploy}')`
          });
          form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Plantillas/ClientScripts/HU_EC_CS_STANDARD_PDF.js';
        }
      }
    } catch (error) {
      log.error("error btnImprimirOT", error);
    }
  }

  function ofuscarInformacion(context) {
    try {
      let newRecord = context.newRecord;
      let recordType = newRecord.type;
      if (recordType !== 'customrecord_ht_record_ordentrabajo' && context.type !== 'view') {
        return;
      }


      let { role: userRole } = runtime.getCurrentUser();
      // * ROLES A LOS QUE APLICA
      // 1811   EC - Administrador
      // 1653	EC BACK OFFICE
      // 1663	EC SAC
      // 1843	EC EJECUTIVO CALLCENTER
      // 1617	EC EJECUTIVO COMERCIAL
      if ([1653, 1663, 1843, 1617].includes(userRole)) {
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_serieproductoasignacion",
          "custrecord_ht_ot_serieproductoasignacion",
          "NONE"
        );
        // DISPOSITIVO FLOTA CHASER
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_dispositivo",
          "custrecord_ht_ot_dispositivo",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_modelo",
          "custrecord_ht_ot_modelo",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_unidad",
          "custrecord_ht_ot_unidad",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_firmware",
          "custrecord_ht_ot_firmware",
          "STARTCOL"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_script",
          "custrecord_ht_ot_script",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_servidor",
          "custrecord_ht_ot_servidor",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_simcard",
          "custrecord_ht_ot_simcard",
          "STARTCOL"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_ip",
          "custrecord_ht_ot_ip",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_apn",
          "custrecord_ht_ot_apn",
          "NONE"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_imei",
          "custrecord_ht_ot_imei",
          "STARTCOL"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_vid",
          "custrecord_ht_ot_vid",
          "NONE"
        );
        // DISPOSITIVO LOJACK
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_boxserie",
          "custrecord_ht_ot_boxserie",
          "STARTCOL"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_codigoactivacion",
          "custrecord_ht_ot_codigoactivacion",
          "STARTCOL"
        );
        _libControl.ofuscarCampo(
          context,
          "custrecord_ht_ot_codigorespuesta",
          "custrecord_ht_ot_codigorespuesta",
          "STARTCOL"
        );
      }
    } catch (error) {
      log.error("error beforeLoad ", error)
    }
  }

  function afterSubmit(context) {
    try {
      var userID = runtime.getCurrentUser().id;

      _crearFulFillment(context);
      // _correoChequeo(context);
      if (![27736, 49529].includes(userID)) {
        _correoChequeo(context);
      }
    } catch (error) {
      log.error("ERROR afterSubmit")
    }
  }

  function _correoChequeo(context) {
    try {
      let oldRecord = context.oldRecord;
      let newRecord = context.newRecord;
      let estado_old = oldRecord.getValue({ fieldId: 'custrecord_ht_ot_estado' });
      let estado_oldT = oldRecord.getText({ fieldId: 'custrecord_ht_ot_estado' });
      let estado_new = newRecord.getValue({ fieldId: 'custrecord_ht_ot_estado' });
      let estado_newT = newRecord.getText({ fieldId: 'custrecord_ht_ot_estado' });
      //log.debug("newRecord id", newRecord.id);
      if (estado_old == 4 && estado_new == 2) {
        //log.debug("ESTADO OT:", `${estado_oldT} - ${estado_newT}`);
        envioCorreoOT(context);
        generarNota(context);
      }

    } catch (error) {
      log.error("ERROR _correoChequeo", error)
    }
  }

  function generarNota(context) {
    try {
      let objRecord = context.newRecord;
      let usuario = _toolkit.executeQuery(`SELECT entityid, firstname, lastname FROM employee WHERE id = ?`, [runtime.getCurrentUser().id]);
      const nota = record.create({ type: 'note', isDynamic: true });
      nota.setValue({ fieldId: 'author', value: 449 });
      nota.setValue({ fieldId: 'title', value: `Chequeo realizado ${usuario[0].entityid} ${usuario[0].firstname} ${usuario[0].lastname}` });
      nota.setValue({ fieldId: 'notetype', value: '3' });
      nota.setValue({ fieldId: 'notedate', value: new Date() });
      nota.setValue({ fieldId: 'note', value: `Chequeo Netsuite generado en vehículo: ${objRecord.getValue('custrecord_ht_ot_vehiculo')} cliente: ${objRecord.getText('custrecord_ht_ot_cliente_id')} - ${objRecord.getText('custrecord_ht_ot_location')}. ` });
      nota.setValue({ fieldId: 'record', value: objRecord.id });
      nota.setValue({ fieldId: 'recordtype', value: 718 });
      let recordId = nota.save({ ignoreMandatoryFields: false });
      //log.debug("recordId", recordId)
    } catch (error) {
      log.error("error", error);
    }

  }

  // Mauro F Ramos 17/11/2025
  function envioCorreoOT(context) {
    try {
      let objRecord = context.newRecord;

      let data = _toolkit.executeQuery(`SELECT ot.custrecord_ht_ot_orden_servicio, t.tranid, e.email FROM customrecord_ht_record_ordentrabajo ot INNER JOIN transaction t ON t.id = ot.custrecord_ht_ot_orden_servicio INNER JOIN employee e ON e.id = t.custbody_ht_os_ejecutivareferencia WHERE ot.id = ?`, [objRecord.id]);
      log.debug("data", data);
      if (data[0].email == 'sincorreo@carsegsa.com') {
        log.debug("No se puede enviar a sincorreo@carsegsa.com");
        return;
      }

      const currentUserEmail = runtime.getCurrentUser().email;
      const usuario_recibe = [data[0].email];

      if (currentUserEmail !== 'ns_user_integracion@carsegsa.com') {
        log.debug("No se puede enviar a ns_user_integracion@carsegsa.com");
        usuario_recibe.push(currentUserEmail);
      }
      email.send({
        //author: runtime.getCurrentUser().email,
        author: 449,
        recipients: usuario_recibe,
        bcc: ['mramos@carsegsa.com', 'mnarea@carsegsa.com'],
        subject: `Chequeo Netsuite generado en vehículo: ${objRecord.getValue('custrecord_ht_ot_vehiculo')} cliente: ${objRecord.getText('custrecord_ht_ot_cliente_id')} - ${objRecord.getText('custrecord_ht_ot_location')} `,
        body: `
                <table style="background-color:#EDEADF;width:70%;border:1pt solid #EDEADF;" cellpadding="0" cellspacing="1" border="1">
                    <tbody>
                        <tr>
                            <td style="padding:3.75pt;border-style:none;" colspan="2"><p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:center;margin:0;" align="center"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Chequeo Netsuite generado en vehículo: 623146 cliente: 1791704576001-ALMODON S.A.</span></p></td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Fecha y Hora </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;"><p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${_toolkit.getFecha().fecha2}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap=""><p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Cliente </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${objRecord.getText('custrecord_ht_ot_cliente_id')}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td></tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap=""><p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Orden de servicio </span></p>
                            </td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${objRecord.getText('custrecord_ht_ot_orden_servicio')}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Orden de trabajo </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${objRecord.getText('name')}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Técnico </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${objRecord.getText('custrecord_ht_ot_tecnicoasignacion')}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td></tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Chequeado </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;">${objRecord.getText('custrecord_ht_ot_location')}</span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td>
                        </tr>
                        <!--
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Mapa </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;"><a data-auth="NotApplicable" rel="noopener noreferrer" target="_blank" href="https://www.google.es/maps?" data-linkindex="0" title="https://www.google.es/maps?">${''}</a></span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Dispositivo </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;"></td></tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Acción del Producto </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;"></td>
                        </tr>
                        <tr>
                            <td style="width:75pt;padding:3.75pt;border-style:none;" nowrap="">
                            <p style="font-size:12pt;font-family:Aptos,sans-serif;text-align:right;margin:0;" align="right"><span style="color:black;font-size:9pt;font-family:Verdana,sans-serif;">Servicios Chequeado </span></p></td>
                            <td style="background-color:white;padding:3.75pt;border-style:none;"><p style="font-size:12pt;font-family:Aptos,sans-serif;margin:0;"><span style="color:black;font-size:7.5pt;font-family:Verdana,sans-serif;"></span><span style="font-size:7.5pt;font-family:Verdana,sans-serif;"></span></p></td>
                        </tr>
                        -->
                    </tbody>
                </table>`,
      });
    } catch (error) {
      log.error("ERROR envioCorreoOT", error);
    }
  }

  function _crearFulFillment(context) {
    let objRecord = context.newRecord;
    try {
      let orden_servicio = objRecord.getValue('custrecord_ht_ot_orden_servicio');
      let estado = objRecord.getValue('custrecord_ht_ot_estado');
      let os = _executeQuery('SELECT id, tranid, status FROM TRANSACTION WHERE id = ?', [orden_servicio]);
      if (context.type == context.UserEventType.EDIT && (os[0].status == 'B' || os[0].status == 'D' || os[0].status == 'E') && estado == 2) {
        // *-*-*-*-*-*-*-**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* CAMPOS DE LA ORDEN DE TRABAJO *-*-*-*-*-*-*-**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
        let orden_servicio_text = objRecord.getText('custrecord_ht_ot_orden_servicio');
        let producto = objRecord.getValue('custrecord_ht_ot_item');
        let item_relacionado = objRecord.getValue('custrecord_ht_ot_itemrelacionado');
        let orden_fabricacion = objRecord.getValue('custrecord_ht_ot_ordenfabricacion');
        let trandate = objRecord.getValue('custrecord_ht_ot_fechatrabajoasignacion');
        let location = objRecord.getValue('custrecord_ht_ot_location');
        let serieproductoasignacion = objRecord.getText('custrecord_ht_ot_serieproductoasignacion');


        // *-*-*-*-*-*-*-**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* CAMPOS DE LA ORDEN DE TRABAJO *-*-*-*-*-*-*-**-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
        let item = _executeQuery('SELECT itemtype, isserialitem FROM item WHERE id = ?', [producto]);

        if (item[0]?.itemtype == 'Service' || !item) {
          return; // Si el item es un servicio (Servicio para Venta) o no existe, no se crea el fulfillment
        }

        log.debug("info", { orden_servicio, ot: objRecord.id, type: item[0]?.itemtype })

        // Obtener ubicación de la orden de fabricacion, si no lo encuentra entonces lo saca de la Orden de Servicio

        let newItemFulFillment = record.transform({ fromType: record.Type.SALES_ORDER, fromId: orden_servicio, toType: record.Type.ITEM_FULFILLMENT, isDynamic: true });
        if (trandate) {
          newItemFulFillment.setValue({ fieldId: 'trandate', value: trandate });
        }
        newItemFulFillment.setValue({ fieldId: 'memo', value: orden_servicio_text });
        let newItemFulFillmentLines = newItemFulFillment.getLineCount({ sublistId: 'item' });
        let flagFulFillment = false;
        for (let i = 0; i < newItemFulFillmentLines; i++) {
          newItemFulFillment.selectLine({ sublistId: 'item', line: i })
          let idArticulo = newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
          // Ejecutar solo 1 creación de 'itemfulfillment' por OT chequeada.
          if (producto == idArticulo) {
            // log.audit(`${producto} == ${idArticulo}`, producto == idArticulo)
            flagFulFillment = true;
            newItemFulFillment.setCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true });
            newItemFulFillment.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            // ! cambio de ubicación ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
            let assemblybuild = _executeQuery("SELECT location, quantity FROM TRANSACTION t JOIN transactionline l ON t.id = l.TRANSACTION WHERE t.custbody_ht_ce_ordentrabajo = ? AND l.mainline = 'T' AND type = 'Build'", [objRecord.id]);
            let ward = newItemFulFillment.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
            let ward_inventorydetailLines = ward.getLineCount({ sublistId: 'inventoryassignment' });
            log.debug("ward_inventorydetailLines", ward_inventorydetailLines)
            let old_issueinventorynumber;
            if (ward_inventorydetailLines > 0) {
              old_issueinventorynumber = ward.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: 0 });
              log.debug("old_issueinventorynumber", old_issueinventorynumber)
            }
            log.debug("assemblybuild", assemblybuild)
            if (assemblybuild) {
              newItemFulFillment.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: assemblybuild[0].location });
            }
            // ! cambio de ubicación ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
            newItemFulFillment.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            // newItemFulFillment.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: idItemOT });

            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* SOLO AUDITORIA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* SOLO AUDITORIA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            log.debug(`itemfulfillment`, {
              os: orden_servicio,
              ot: objRecord.id,
              itemFulFillmentLine: i,
              itemreceive: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemreceive' }),
              item: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' }),
              itemdescription: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemdescription' }),
              location: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'location' }),
              department: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'department' }),
              class: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'class' }),
              onhand: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'onhand' }),
              quantityremaining: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantityremaining' }),
              quantitycommitted: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantitycommitted' }),
              quantity: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' }),
              unitsdisplay: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'unitsdisplay' }),
              subsidiary: newItemFulFillment.getCurrentSublistValue({ sublistId: 'item', fieldId: 'subsidiary' }),
            });

            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* SOLO AUDITORIA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
            // ! *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-* SOLO AUDITORIA *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

            let inventorydetail = newItemFulFillment.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' });
            let inventorydetailLines = inventorydetail.getLineCount({ sublistId: 'inventoryassignment' });
            log.debug("inventorydetailLines", inventorydetailLines)
            let binNumber = false;
            if (inventorydetailLines > 0) {
              log.debug("inventorydetail", {
                issueinventorynumber: inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', line: 0 }),
                binNumber: `${inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', line: 0 })} - ${inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber_display', line: 0 })}`,
                inventorystatus: `${inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', line: 0 })} - ${inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus_display', line: 0 })}`,
                quantity: `${inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', line: 0 })}`,
              });
              // ! ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
              binNumber = inventorydetail.getSublistValue({ sublistId: 'inventoryassignment', fieldId: 'binnumber', line: 0 });
              if (binNumber) {
                inventorydetail.selectLine({ sublistId: 'inventoryassignment', line: 0 });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1 });
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
              } 
            } else {
              inventorydetail.selectLine({ sublistId: 'inventoryassignment', line: 0 });
              log.debug("item[0]", item[0])
              if (item[0]?.isserialitem == 'T') {
                let inventorynumber = _executeQuery(`SELECT * FROM inventorynumber WHERE inventorynumber = ? AND item = ?`, [serieproductoasignacion, producto]);
                let issueinventorynumber = inventorynumber[0]?.id ? inventorynumber[0]?.id : old_issueinventorynumber;
                // if ( !inventorynumber &&  old_issueinventorynumber) {
                //   inventorynumber = []
                //   inventorynumber.push({id: old_issueinventorynumber });
                //   log.debug("inventorynumber perdido", inventorynumber);
                // }else{
                //   inventorynumber = false;
                // }
                log.debug("Line 431", {
                      os: orden_servicio,
                      ot: objRecord.id,
                      bodega_ensamblaje: inventorynumber[0]?.bodega,
                      item: item[0]
                });
                if (!issueinventorynumber) {
                  log.debug("Ejecución de orden de artículo.", 'EXIT');
                  return;
                }
                inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: `${issueinventorynumber}` });
              } else if (item[0]?.isserialitem == 'F'){
                  
                  log.debug("Búsqueda de bodega seleccionada en el ensamblaje")
                  let inventorynumber = _executeQuery(`SELECT t.tranid, i.itemId AS item_codigo, i.description AS item_descripcion, ia.quantity, loc.name AS ubicacion,
                    b.binNumber AS bodega, ist.name AS estado FROM inventoryassignment ia JOIN transactionline l ON ia.transactionline = l.id  AND ia.transaction = l.transaction JOIN transaction t  ON t.id = ia.transaction JOIN item i ON l.item = i.id JOIN location loc ON l.location = loc.id LEFT JOIN bin b ON ia.bin = b.id LEFT JOIN inventorystatus ist ON ia.inventorystatus = ist.id WHERE t.custbody_ht_ce_ordentrabajo = ? AND t.type = 'Build'`, [ objRecord.id ]);
                 log.debug("Bodega 0", {
                      os: orden_servicio,
                      ot: objRecord.id,
                      bodega_ensamblaje: inventorynumber[0]?.bodega,
                      item: item[0]
                  });
                    // log.audit("Bodega 0", {
                    //   os: orden_servicio,
                    //   ot: objRecord.id,
                    //   bodega_ensamblaje: inventorynumber[0].bodega
                    // });
                  // let issueinventorynumber = inventorynumber[0]?.id ? inventorynumber[0]?.id : old_issueinventorynumber;
                  // inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'issueinventorynumber', value: `${issueinventorynumber}` });

                } else if ( item[0]?.isserialitem == 'T' && item[0].itemtype == 'InvtPart'){
                  log.debug("Line 470", {
                      os: orden_servicio,
                      ot: objRecord.id,
                      //bodega_ensamblaje: inventorynumber[0]?.bodega,
                      item: item[0]
                    });

                }
              inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'inventorystatus', value: 1 });
              inventorydetail.setCurrentSublistValue({ sublistId: 'inventoryassignment', fieldId: 'quantity', value: 1 });
            }
            inventorydetail.commitLine({ sublistId: 'inventoryassignment' });
          }
          newItemFulFillment.commitLine({ sublistId: 'item' });
        }
        if (flagFulFillment) {
          let itemfulfillment = newItemFulFillment.save({ enableSourcing: false, ignoreMandatoryFields: true });
          log.debug("Ejecución de orden de artículo creado", `<a href='https://7451241.app.netsuite.com/app/accounting/transactions/itemship.nl?id=${itemfulfillment}&whence='>${itemfulfillment}</a>`);
        } else {
          // log.audit("No se creo itemfulfillment", objRecord.id); // Es decir el item de la OT chequeada no es el mismo del registro Ejecución de orden de artículo
          return;
        }
      }

    } catch (error) {
      log.debug("ERROR afterSubmit", error.message);
    }
  }

  function _executeQuery(sqlQuery, params = []) {
    // Aseguramos que params sea un array válido
    if (!Array.isArray(params)) {
      params = [];
    }

    let resultSet = query.runSuiteQL({ query: sqlQuery, params: params });
    let results = resultSet.asMappedResults();

    if (results.length > 0) {
      return results.map(obj => {
        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.replace(/\n/g, " ") : value === null ? "" : value
          ])
        );
      });
    } else {
      return false;
    }
  }

  // ! NEW
  // function _correcionChequeo(context) {
  //   try {
  //     log.audit("_correcionChequeo", "INICIO");

  //     let newRecord = context.newRecord;

  //     let idOs = newRecord.getValue("custrecord_ht_ot_orden_servicio")
  //     let itemOT = newRecord.getValue("custrecord_ht_ot_itemrelacionado")
  //     let bienOT = newRecord.getValue("custrecord_ht_ot_vehiculo")
  //     let fecha = newRecord.getValue("custrecord_ht_ot_fecha_asignacion")

  //     log.audit("itemOT", itemOT)

  //     let infoItemOT = obtenerParametrizacionItem(itemOT, ['FAM']);

  //     log.audit("infoItemOT", infoItemOT)

  //     let valorfamOT = infoItemOT[0]?.Valor
  //     let valorIdfamOT = infoItemOT[0]?.ValorId
  //     if (!valorfamOT) {
  //       return
  //     }

  //     // Obtener Todas las Os del Bien Relacionado
  //     let totalOsBien = obtenerOsPorBien(bienOT, valorfamOT);
  //     log.audit("totalOsBien", totalOsBien);

  //     let coberturaErrada = consultaCoberturaMovFcc(bienOT, valorIdfamOT)
  //     log.audit("coberturaErrada", coberturaErrada);


  //     // Validacion de cobertura igaul 
  //     // let validarPlazoCero = esCoberturaPlazoCero(coberturaErrada)

  //     // if (!validarPlazoCero) {
  //     //   return;
  //     // }

  //     let detalleCobertura = infoDetalleCobertura(coberturaErrada.id)
  //     log.audit("detalleCobertura", detalleCobertura);

  //     totalOsBien = eliminarOsRepetidas(totalOsBien, detalleCobertura);


  //     let TotalPlazo = calcularPlazoTotal(totalOsBien);
  //     log.audit("TotalPlazo", TotalPlazo);


  //     // Sumatoria
  //     const parametrosTiempo = {
  //       tiempo: TotalPlazo.total,
  //       unidad: TotalPlazo.unidad,
  //     };

  //     const parametrosCobertura = {
  //       coberturaInicial: coberturaErrada.coberturainicial,
  //       coberturaFinal: coberturaErrada.coberturafinal,
  //     };

  //     const opcionesAdicionales = {
  //       esReverso: "No",
  //       fechaOS: fecha,
  //     };

  //     const resultadoCalculo = calcularCoberturaPersonalizado(
  //       parametrosTiempo,
  //       parametrosCobertura,
  //       opcionesAdicionales
  //     );

  //     log.audit("Final", resultadoCalculo)

  //     let dataCalculada = {
  //       ID_BIEN: bienOT,

  //       ID_OS: idOs,
  //       FECHA_OS: fecha,
  //       ID_FAC: "",
  //       FECHA_FAC: "",
  //       FAMILIA_PRODUCTO: valorfamOT,
  //       ID_FAMILIA_PRODUCTO: valorIdfamOT,
  //       UNIDAD: parametrosTiempo.tiempo,
  //       ID_TIPO_PLAZO: parametrosTiempo.unidad,
  //       TIPO_PLAZO: parametrosTiempo?.unidad == 1 ? "AÑO" : parametrosTiempo?.unidad == 2 ? "MESES" : "DIA",

  //       FECHA_INICIO_ACTUAL: coberturaErrada.coberturainicial,
  //       FECHA_FIN_ACTUAL: coberturaErrada.coberturafinal,
  //       ID_ESTADO_COBERTURA_ACTUAL: 0,
  //       ESTADO_COBERTURA_ACTUAL: "",
  //       ID_ESTADO_DISPOSITIVO_ACTUAL: 0,
  //       ESTADO_DISPOSITIVO_ACTUAL: "",

  //       FECHA_INICIO_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaInicoCalculada),
  //       FECHA_FIN_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaFinCalculada),
  //       ID_ESTADO_COBERTURA_CALCULADO: "",
  //       ESTADO_COBERTURA_CALCULADO: "",
  //       ID_ESTADO_DISPOSITIVO_CALCULADO: "",
  //       ESTADO_DISPOSITIVO_CALCULADO: "",

  //       FECHA_INICIO_MODIFICADO: "",
  //       FECHA_FIN_MODIFICADO: "",
  //       ID_ESTADO_COBERTURA_MODIFICADO: "",
  //       ESTADO_COBERTURA_MODIFICADO: "",
  //       ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
  //       ESTADO_DISPOSITIVO_MODIFICADO: "",

  //       CORTESIA: "F",
  //       PROCESADO: "P",
  //       FECHA_PROCESADO: "",
  //       ID_ORIGEN: 2,
  //       ORIGEN: "EDIT",
  //       PARAMETRIZACION_APD: "015"
  //     }

  //     // let createss = createLogRecordFechaCobertura(dataCalculada);
  //     // log.audit("createss", createss)


  //     let jsonFinal = armarData(dataCalculada);
  //     log.audit("jsonFinal", jsonFinal)

  //     // let infCobertura = coberturaController.makeApiRequest(
  //     //   jsonFinal,
  //     //   "customdeploy_hu_ec_rs_in_coberturas",
  //     //   "customscript_hu_ec_rs_in_coberturas",
  //     //   "POST",
  //     //   false
  //     // );

  //     // log.debug("infCobertura", infCobertura);
  //     return;
  //   }
  //   catch (error) {
  //     log.audit("ERROR _correcionChequeo", error)
  //   }
  // }

  function _correcionChequeo(context) {
    try {
      log.audit("_correcionChequeo", "INICIO");

      let newRecord = context.newRecord;

      let idOs = newRecord.getValue("custrecord_ht_ot_orden_servicio")
      let itemOT = newRecord.getValue("custrecord_ht_ot_itemrelacionado")
      let bienOT = newRecord.getValue("custrecord_ht_ot_vehiculo")
      let fecha = newRecord.getValue("custrecord_ht_ot_fecha_asignacion")

      log.audit("itemOT", itemOT)

      let infoItemOT = obtenerParametrizacionItem(itemOT, ['FAM']);

      log.audit("infoItemOT", infoItemOT)

      let valorfamOT = infoItemOT[0]?.Valor
      let valorIdfamOT = infoItemOT[0]?.ValorId
      if (!valorfamOT) {
        return
      }

      // Obtener Todas las Os del Bien Relacionado
      let totalOsBien = obtenerOsPorBien(bienOT, valorfamOT, 1);
      log.audit("totalOsBien", totalOsBien);

      let tieneDesistalacion = validarUltimaOS(totalOsBien)
      log.audit("tieneDesistalacion", tieneDesistalacion)

      let coberturaErrada = consultaCoberturaMovFcc(bienOT, valorIdfamOT)
      log.audit("coberturaErrada", coberturaErrada);




      // let detalleCobertura = infoDetalleCobertura(coberturaErrada.id)
      // log.audit("detalleCobertura", detalleCobertura);

      // totalOsBien = eliminarOsRepetidas(totalOsBien, detalleCobertura);
      // log.audit("totalOsBien", totalOsBien.length);

      // totalOsBien.forEach((result) => {
      // });

      let TotalPlazo = calcularPlazoTotal(totalOsBien);
      log.audit("TotalPlazo", TotalPlazo);


      // Sumatoria
      const parametrosTiempo = {
        tiempo: TotalPlazo.total,
        unidad: TotalPlazo.unidad,
      };

      const parametrosCobertura = {
        coberturaInicial: coberturaErrada.coberturainicial,
        coberturaFinal: coberturaErrada.coberturafinal,
      };

      const opcionesAdicionales = {
        esReverso: "No",
        fechaOS: fecha,
      };

      const resultadoCalculo = calcularCoberturaPersonalizado(
        parametrosTiempo,
        parametrosCobertura,
        opcionesAdicionales
      );

      log.audit("Final", resultadoCalculo)

      let dataCalculada = {
        ID_BIEN: bienOT,

        ID_OS: idOs,
        FECHA_OS: fecha,
        ID_FAC: "",
        FECHA_FAC: "",
        FAMILIA_PRODUCTO: valorfamOT,
        ID_FAMILIA_PRODUCTO: valorIdfamOT,
        UNIDAD: parametrosTiempo.tiempo,
        ID_TIPO_PLAZO: parametrosTiempo.unidad,
        TIPO_PLAZO: parametrosTiempo?.unidad == 1 ? "AÑO" : parametrosTiempo?.unidad == 2 ? "MESES" : "DIA",

        FECHA_INICIO_ACTUAL: coberturaErrada.coberturainicial,
        FECHA_FIN_ACTUAL: coberturaErrada.coberturafinal,
        ID_ESTADO_COBERTURA_ACTUAL: 0,
        ESTADO_COBERTURA_ACTUAL: "",
        ID_ESTADO_DISPOSITIVO_ACTUAL: 0,
        ESTADO_DISPOSITIVO_ACTUAL: "",

        FECHA_INICIO_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaInicoCalculada),
        FECHA_FIN_CALCULADO: formatoFechaCalculo(resultadoCalculo.fechaFinCalculada),
        ID_ESTADO_COBERTURA_CALCULADO: "",
        ESTADO_COBERTURA_CALCULADO: "",
        ID_ESTADO_DISPOSITIVO_CALCULADO: "",
        ESTADO_DISPOSITIVO_CALCULADO: "",

        FECHA_INICIO_MODIFICADO: "",
        FECHA_FIN_MODIFICADO: "",
        ID_ESTADO_COBERTURA_MODIFICADO: "",
        ESTADO_COBERTURA_MODIFICADO: "",
        ID_ESTADO_DISPOSITIVO_MODIFICADO: "",
        ESTADO_DISPOSITIVO_MODIFICADO: "",

        CORTESIA: "F",
        PROCESADO: "P",
        FECHA_PROCESADO: "",
        ID_ORIGEN: 2,
        ORIGEN: "EDIT",
        PARAMETRIZACION_APD: "015"
      }

      let jsonFinal = armarData(dataCalculada);
      log.audit("jsonFinal", jsonFinal)

      // let infCobertura = coberturaController.makeApiRequest(
      //   jsonFinal,
      //   "customdeploy_hu_ec_rs_in_coberturas",
      //   "customscript_hu_ec_rs_in_coberturas",
      //   "POST",
      //   false
      // );

      // log.debug("infCobertura", infCobertura);
      return;
    }
    catch (error) {
      log.audit("ERROR _correcionChequeo", error)
    }
  }

  function obtenerOsPorBien(bien, fam, caso) {
    try {
      let results = [];
      let pageSize = 1000;
      let filtro 

      if(caso == 1){
        filtro = ' AND va.custrecord_ht_pp_codigo = ?'
      }else{
        filtro = ' AND va.custrecord_ht_pp_codigo = ?'
      }

      let sql = `
      SELECT 
        b.custcol_ht_os_tiempo_cobertura AS tiempo,
        b.custcol_ht_os_und_tiempo_cobertura AS unidad,
        b.item AS familia_producto_id, 
        vf.custrecord_ht_pp_codigo AS familia_sigla, 
        va.custrecord_ht_pp_codigo AS adp_codigo, 
        vf.custrecord_ht_pp_descripcion AS descripcion_familia, 
        va.custrecord_ht_pp_descripcion AS descripcion_adp, 
        b.item AS producto, 
        a.trandate AS fecha_inicial, 
        a.custbody_ht_so_bien AS codigo_bien, 
        a.number AS os, 
        a.id AS id_orden_servicio, 
        BUILTIN.DF(a.status) AS estado 
      FROM 
        TRANSACTION a 
        JOIN transactionline b ON a.id = b.transaction 
        LEFT JOIN customrecord_ht_pp_main_param_prod pf 
          ON pf.custrecord_ht_pp_parametrizacionid = b.item 
          AND pf.custrecord_ht_pp_parametrizacion_rela = 109 
        LEFT JOIN customrecord_ht_cr_pp_valores vf 
          ON vf.id = pf.custrecord_ht_pp_parametrizacion_valor 
        LEFT JOIN customrecord_ht_pp_main_param_prod pa 
          ON pa.custrecord_ht_pp_parametrizacionid = b.item 
          AND pa.custrecord_ht_pp_parametrizacion_rela = 130 
        LEFT JOIN customrecord_ht_cr_pp_valores va 
          ON va.id = pa.custrecord_ht_pp_parametrizacion_valor 
      WHERE 
        a.customform = 142 
        AND a.recordtype = 'salesorder' 
        AND b.mainline = 'F' 
        AND b.taxline = 'F' 
        AND b.foreignamount IS NOT NULL 
        AND a.custbody_ht_so_bien = ? 
       -- AND va.custrecord_ht_pp_codigo = ?
        ${filtro}
        AND b.custcol_ht_os_tiempo_cobertura > 0
        AND b.custcol_ht_os_und_tiempo_cobertura IN ('1','2','3')
        AND vf.custrecord_ht_pp_codigo IN ('004','015','008','009')
        AND a.status != 'C'
      ORDER BY 
        va.custrecord_ht_pp_codigo ASC,  
        a.trandate DESC,                 
        TO_NUMBER(REGEXP_SUBSTR(vf.custrecord_ht_pp_codigo, '^\d+')) ASC
    `;

      let pagedData = query.runSuiteQLPaged({
        query: sql,
        params: [bien, fam],
        pageSize: pageSize
      });

      pagedData.pageRanges.forEach(function (pageRange) {
        let page = pagedData.fetch({ index: pageRange.index });
        let iterator = page.data.iterator();

        iterator.each(function (result) {
          let row = result.value.asMap();
          results.push(row)
          return true;
        });
      });

      log.audit("obtenerOsPorBien - Total de registros", results.length);

      return results;

    } catch (error) {
      log.audit("obtenerOsPorBien - Error", error);
      return [];
    }
  }

  function obtenerParametrizacionItem(items, busquedaParametro) {
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
        }
      }
      return data;
    } catch (error) {
      log.audit("Error", { error: error.message, stack: error.stack });
      return []
    }
  }

  function consultaCoberturaMovFcc(IdVehiculo, idfamilia) {

    log.audit("consultaCoberturaMovFcc", {
      IdVehiculo, idfamilia
    })

    let results = [];
    try {
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
          "AND",
          ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "name" }),
          search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),
          search.createColumn({ name: "custrecord_ht_co_estado" }),
        ],
      });

      let searchResult = CoberturaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
            name: result.getValue({ name: "name" }),
            clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
            bien: result.getValue({ name: "custrecord_ht_co_bien" }),
            producto: result.getValue({ name: "custrecord_ht_co_producto" }),
            coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            estado_dispositivo: result.getValue({ name: "custrecord_ht_co_estado" }),
          });
        });
      });

      return results[0];

    } catch (error) {
      log.debug("Error", { error: error.message, stack: error.stack });
      return [];
    }


  }

  function esCoberturaPlazoCero(objCobertura) {
    try {
      const { coberturainicial, coberturafinal, plazo } = objCobertura;

      const mismaCobertura = coberturainicial === coberturafinal;
      const plazoCero = String(plazo).trim() === "0";

      return mismaCobertura && plazoCero;

    } catch (error) {
      log.audit("Error esCoberturaPlazoCero", { error: error.message, stack: error.stack });
      return false;
    }
  }

  function calcularPlazoTotal(items) {
    try {

      const equivalencias = {
        "AÑO": "1", "ANO": "1",
        "MES": "2",
        "DIA": "3", "DÍA": "3"
      };

      // Invertir equivalencias para buscar por ID
      const unidadPorId = {
        "1": "AÑO",
        "2": "MES",
        "3": "DIA"
      };

      // Conversiones a días
      const aDias = {
        "DIA": (t) => t,
        "MES": (t) => t * 30,
        "AÑO": (t) => t * 365
      };

      // Conversiones a meses
      const aMeses = {
        "DIA": (t) => t / 30,
        "MES": (t) => t,
        "AÑO": (t) => t * 12
      };

      let unidadMinima = "AÑO"; // empezamos con la mayor, iremos bajando
      const ordenUnidad = ["AÑO", "MES", "DIA"]; // de mayor a menor

      // 1. Determinar la unidad mínima presente
      items.forEach(item => {
        const unidadNombre = unidadPorId[String(item.unidad)];
        if (!unidadNombre) return;

        const indexActual = ordenUnidad.indexOf(unidadNombre);
        const indexMinima = ordenUnidad.indexOf(unidadMinima);

        if (indexActual > indexMinima) {
          unidadMinima = unidadNombre; // bajamos a unidad menor
        }
      });

      // 2. Sumar todo en la unidad mínima
      let totalAcumulado = 0;

      items.forEach(item => {
        const unidadNombre = unidadPorId[String(item.unidad)];
        if (!unidadNombre) return;

        const tiempo = Number(item.tiempo);

        if (unidadMinima === "DIA") {
          totalAcumulado += aDias[unidadNombre](tiempo);
        } else if (unidadMinima === "MES") {
          totalAcumulado += aMeses[unidadNombre](tiempo);
        } else {
          // todo en años (caso donde todos son años)
          totalAcumulado += tiempo;
        }
      });

      // 3. Si la unidad mínima es MES, convertir días a días finales
      // Regla especial: si hay MES y DIA => resultado en DIAS
      const tienesDia = items.some(i => String(i.unidad) === "3");
      const tieneMes = items.some(i => String(i.unidad) === "2");
      const tieneAnio = items.some(i => String(i.unidad) === "1");

      let unidadFinal;
      if (tienesDia || (tieneMes && tienesDia)) {
        unidadFinal = "DIA";
        // Recalcular todo en días por si acaso
        totalAcumulado = items.reduce((acc, item) => {
          const unidadNombre = unidadPorId[String(item.unidad)];
          return acc + aDias[unidadNombre](Number(item.tiempo));
        }, 0);
      } else if (tieneMes && tieneAnio) {
        unidadFinal = "MES";
        totalAcumulado = items.reduce((acc, item) => {
          const unidadNombre = unidadPorId[String(item.unidad)];
          return acc + aMeses[unidadNombre](Number(item.tiempo));
        }, 0);
      } else if (tieneMes) {
        unidadFinal = "MES";
      } else {
        unidadFinal = "AÑO";
      }

      return {
        total: Math.round(totalAcumulado),
        unidad: equivalencias[unidadFinal]
      };

    } catch (error) {
      log.audit("Error calcularPlazoTotal", { error: error.message, stack: error.stack });
      return null;
    }
  }

  function calcularCoberturaPersonalizado(itemResult, infoCoberturaEncontrada, requestBody, auxFecha = false) {

    log.audit("infcalcularCoberturaPersonalizado", {
      itemResult,
      infoCoberturaEncontrada,
      requestBody
    })

    try {
      // devolucion directa por tiempo 0
      if (itemResult.tiempo == "0" && itemResult.unidad == "4") {
        const diferenciaDias = calcularDiferenciaDias(
          infoCoberturaEncontrada.coberturaInicial,
          infoCoberturaEncontrada.coberturaFinal
        );

        return {
          fechaInicoCalculada: infoCoberturaEncontrada.coberturaInicial,
          fechaFinCalculada: convertirFechaIso(infoCoberturaEncontrada.coberturaFinal),
          plazoCalculado: (diferenciaDias || "")
        }
      }

      let fechaFinCalculada = ""
      let fechaInicoCalculada = ""
      let plazoCalculado = ""

      const esReverso = (requestBody.esReverso == "Si") ? true : false;

      // Determinar la fecha base de la cobertura según si es reverso o no
      let fechaBase = esReverso ? infoCoberturaEncontrada.coberturaInicial : infoCoberturaEncontrada.coberturaFinal;

      // Calcular cobertura
      const coberturaCalculada = coberturaController.CalcularCobertura(
        parseInt(itemResult.tiempo),
        parseInt(itemResult.unidad),
        fechaBase,
        esReverso
      );

      // Calcular diferencia de días
      const diferenciaDias = calcularDiferenciaDias(coberturaCalculada.coberturaInicial, coberturaCalculada.coberturaFinal);

      fechaInicoCalculada = (coberturaCalculada?.coberturaInicial || "")
      fechaFinCalculada = (coberturaCalculada?.coberturaFinal || "")
      plazoCalculado = (diferenciaDias || "")

      return {
        fechaInicoCalculada,
        fechaFinCalculada,
        plazoCalculado
      }
    }
    catch (error) {

      log.audit("error", error.stack)
      return {
        fechaInicoCalculada: "",
        fechaFinCalculada: "",
        plazoCalculado: ""
      }
    }

  }

  function calcularDiferenciaDias(inicioCobertura, finCobertura) {
    let inicio = new Date(inicioCobertura);
    let fin = new Date(finCobertura);

    let diferenciaMilisegundos = fin - inicio;
    let milisegundosPorDia = 24 * 60 * 60 * 1000;

    return diferenciaMilisegundos / milisegundosPorDia;
  }

  function formatoFechaCalculo(fecha) {
    try {
      return fecha.split("T")[0].split("-").reverse().join("/");
    } catch (error) {
      log.debug("Error", { error: error.message, stack: error.stack });
      return fecha
    }
  }

  function armarData(registro) {
    try {
      return {
        "idbien": registro.ID_BIEN,
        "familia": registro.FAMILIA_PRODUCTO,
        "accion": "Update",
        "fechaInicio": registro.FECHA_INICIO_CALCULADO,
        "tipocobertura": registro.UNIDAD,
        "unidadcobertu": registro.TIPO_PLAZO,
        "fechafin": registro.FECHA_FIN_CALCULADO,
        "idOrdenServicio": registro.ID_OS,
        "concepto": "100",
        "codVehiculo": ""
      };
    } catch (error) {
      log.debug("Error al armarData", { error: error.message, stack: error.stack });

      return {
        "idbien": "",
        "familia": "",
        "accion": "",
        "fechaInicio": "",
        "tipocobertura": "",
        "unidadcobertu": "",
        "fechafin": "",
        "idOrdenServicio": "",
        "concepto": "",
        "codVehiculo": ""
      };
    }

  }

  function createLogRecordFechaCobertura(INFODATALOG) {
    try {

      log.audit("createLogRecordFechaCobertura", INFODATALOG)

      if (INFODATALOG == {}) {
        // log.debug("---info---", INFODATALOG);
        throw new Error("Error al guardar el registro");
      }

      if (!INFODATALOG?.ID_OS) {
        throw new Error("Error por falta de data");
      }


      // let ExisteLogProcesado = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "T", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO })
      // if (ExisteLogProcesado && !INFODATALOG?.ID_FAC) {
      //   log.audit("1")
      //   return 0;
      // }

      // let Existelog = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "F", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO });
      // if (Existelog && !INFODATALOG?.ID_FAC) {
      //   log.audit("2")
      //   return 0;
      // }

      // let ExistelogX = verificarExistenciaRegistros({ ID_OS: INFODATALOG.ID_OS, PROCESADO: "X", FAMILIA_PRODUCTO: INFODATALOG.FAMILIA_PRODUCTO });
      // if (ExistelogX && !INFODATALOG?.ID_FAC) {
      //   log.audit("3")
      //   return 0;
      // }

      const logRecord = record.create({
        type: "customrecord_log_movimiento_fecha_cobert",
        isDynamic: true,
      });

      //  * -Identificación del Bien
      // ID_BIEN
      logRecord.setValue("custrecord_id_bien_mov_fcc", INFODATALOG.ID_BIEN);

      // *- Orden de Servicio y Facturación
      // ID_OS
      logRecord.setValue("custrecord_id_os_mov_fcc", INFODATALOG.ID_OS);
      // FECHA_OS
      logRecord.setValue("custrecord_fecha_os_mov_fcc", INFODATALOG.FECHA_OS);
      // ID_FAC
      logRecord.setValue("custrecord_id_fac_mov_fcc", INFODATALOG.ID_FAC);
      // FECHA FAC
      logRecord.setValue("custrecord_fecha_fac_mov_fcc", INFODATALOG.FECHA_FAC);
      // ID_FAMILIA_PRODUCTO
      logRecord.setValue("custrecord_id_familia_producto_mov_fcc", INFODATALOG.ID_FAMILIA_PRODUCTO);
      // FAMILIA_PRODUCTO
      logRecord.setValue("custrecord_familia_producto_mov_fcc", INFODATALOG.FAMILIA_PRODUCTO);
      // PLAZO -> UNIDAD
      logRecord.setValue("custrecord_unidad_mov_fcc", INFODATALOG.UNIDAD);
      // ID_TIPO_PLAZO
      logRecord.setValue("custrecord_id_tipo_plazo_mov_fcc", INFODATALOG.ID_TIPO_PLAZO);
      // TIPO_PLAZO
      logRecord.setValue("custrecord_tipo_plazo_mov_fcc", INFODATALOG.TIPO_PLAZO);

      // *- Cobertura y Plazo Actual
      // FECHA_INICIO_ACTUAL
      logRecord.setValue("custrecord_fecha_inicio_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_INICIO_ACTUAL)));
      // FECHA_FIN_ACTUAL
      logRecord.setValue("custrecord_fecha_fin_actual_mov_fcc", new Date(convertirFechaIso(INFODATALOG.FECHA_FIN_ACTUAL)));
      // ID_ESTADO_COBERTURA_ACTUAL
      logRecord.setValue("custrecord_id_estado_cobe_act_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_ACTUAL);
      // ESTADO_COBERTURA_ACTUAL
      logRecord.setValue("custrecord_estado_cobertura_act_mov_fcc", INFODATALOG.ESTADO_COBERTURA_ACTUAL);
      // ID_ESTADO_DISPOSITIVO_ACTUAL
      logRecord.setValue("custrecordid_estado_disp_act_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_ACTUAL);
      // ESTADO_DISPOSITIVO_ACTUAL
      logRecord.setValue("custrecord_estado_dispositivo_act_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_ACTUAL);

      // *- obertura y Plazo Calculado
      // FECHA_INICIO_CALCULADO
      logRecord.setValue("custrecord_fecha_inicio_cal_mov_fcc", new Date((INFODATALOG.FECHA_INICIO_CALCULADO)));
      // FECHA_FIN_CALCULADO
      logRecord.setValue("custrecord_fecha_fin_cal_mov_fcc", new Date((INFODATALOG.FECHA_FIN_CALCULADO)));
      // ID_ESTADO_COBERTURA_CALCULADO
      logRecord.setValue("custrecord_id_estado_cobe_cal_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_CALCULADO);
      // ESTADO_COBERTURA_CALCULADO
      logRecord.setValue("custrecord_estado_cobertura_cal_mov_fcc", INFODATALOG.ESTADO_COBERTURA_CALCULADO);
      // ID_ESTADO_DISPOSITIVO_CALCULADO
      logRecord.setValue("custrecordid_estado_disp_cal_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_CALCULADO);
      // ESTADO_DISPOSITIVO_CALCULADO
      logRecord.setValue("custrecord_estado_dispositivo_cal_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_CALCULADO);

      // *- Cobertura y Plazo Modificado
      // FECHA_INICIO_MODIFICADO
      logRecord.setValue("custrecordcustrecord_fecha_inicio_mod_mo", INFODATALOG.FECHA_INICIO_MODIFICADO ? new Date(INFODATALOG.FECHA_INICIO_MODIFICADO) : null);
      // FECHA_FIN_MODIFICADO
      logRecord.setValue("custrecordcustrecord_fecha_fin_mod_mov_f", INFODATALOG.FECHA_FIN_MODIFICADO ? new Date(INFODATALOG.FECHA_FIN_MODIFICADO) : null);
      // ID_ESTADO_COBERTURA_MODIFICADO
      logRecord.setValue("custrecord_id_estado_cobe_mod_mov_fcc", INFODATALOG.ID_ESTADO_COBERTURA_MODIFICADO);
      // ESTADO_COBERTURA_MODIFICADO
      logRecord.setValue("custrecord_estado_cobertura_mod_mov_fcc", INFODATALOG.ESTADO_COBERTURA_MODIFICADO);
      // ID_ESTADO_DISPOSITIVO_MODIFICADO
      logRecord.setValue("custrecord_estado_disp_mod_mov_fcc", INFODATALOG.ID_ESTADO_DISPOSITIVO_MODIFICADO);
      // ESTADO_DISPOSITIVO_MODIFICADO
      logRecord.setValue("custrecord_estado_dispositivo_mod_mov_fc", INFODATALOG.ESTADO_DISPOSITIVO_MODIFICADO);

      // *- Otros Detalles
      // CORTESIA
      logRecord.setValue("custrecord_cortesia_mov_fcc", INFODATALOG.CORTESIA);
      // PROCESADO
      logRecord.setValue("custrecord_procesado_mov_fcc", INFODATALOG.PROCESADO);
      // FECHA_PROCESADO
      logRecord.setValue("custrecord_fecha_procesado_mov_fcc", INFODATALOG.FECHA_PROCESADO);
      // ID_ORIGEN
      logRecord.setValue("custrecordid_origen_mov_fcc", INFODATALOG.ID_ORIGEN);
      // ORIGEN
      logRecord.setValue("custrecord_origen_mov_fcc", INFODATALOG.ORIGEN);
      // PARAMETRIZACION_APD
      logRecord.setValue("custrecord_parametrizacion_apd_mov_fcc", INFODATALOG.PARAMETRIZACION_APD);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });
    } catch (error) {
      log.audit("Error al createLogRecordFechaCobertura", { error: error.message, stack: error.stack });
      return 0;
    }
  }

  function convertirFechaIso(fecha) {
    try {
      const [dia, mes, año] = fecha.split("/").map(Number); // Dividir la fecha y convertir a números
      const fechaISO = new Date(Date.UTC(año, mes - 1, dia, 22, 0, 0)); // Crear la fecha en UTC con la hora 22:00
      return fechaISO.toISOString();
    } catch (error) {
      log.debug("Error al convertirFechaIso", { error: error.message, stack: error.stack });
      return fecha;
    }
  }

  function infoDetalleCobertura(idCobertura) {

    let results = [];
    try {
      let serviceOrderSearch = search.create({
        type: "customrecord_ht_ct_cobertura_transaction",
        filters: [
          ["custrecord_ht_ct_transacciones", "is", idCobertura],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "created" }),
          search.createColumn({ name: "custrecord_ht_ct_transacciones" }),
          search.createColumn({ name: "custrecord_ht_ct_orden_servicio" }),
          search.createColumn({ name: "custrecord_ht_ct_orden_trabajo" }),
          search.createColumn({ name: "custrecord_ht_ct_concepto" }),
          search.createColumn({ name: "custrecord_ht_ct_fecha_inicial" }),
          search.createColumn({ name: "custrecord_ht_ct_fecha_final" }),
        ],
      });

      let searchResult = serviceOrderSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            id_detalleCobertura: result.getValue({ name: "internalid" }),
            created: result.getValue({ name: "created" }),
            idCobertura: result.getValue({ name: "custrecord_ht_ct_transacciones" }),
            idordenServicio: result.getValue({ name: "custrecord_ht_ct_orden_servicio" }),
            idordenTrabajo: result.getValue({ name: "custrecord_ht_ct_orden_trabajo" }),
            concepto: result.getValue({ name: "custrecord_ht_ct_concepto" }),
            fechaInicial: result.getValue({ name: "custrecord_ht_ct_fecha_inicial" }),
            fechaFinal: result.getValue({ name: "custrecord_ht_ct_fecha_final" }),
          });
        });
      });

      // log.debug("results", results)

      return results;
    } catch (error) {
      log.debug("error", error);
      return [];
    }

  }

  function eliminarOsRepetidas(principal, secundarios) {

    // Crear un Set con los idordenServicio del segundo arreglo
    const idsExcluir = new Set(
      secundarios.map(item => Number(item.idordenServicio))
    );

    // Filtrar el principal
    const resultado = principal.filter(item =>
      !idsExcluir.has(Number(item.id_orden_servicio))
    );

    return resultado;
  }

  function validarUltimaOS(lista) {
    if (!lista || lista.length === 0) {
        return true;
    }

    var ultimaOS = lista[0]; // ya viene ordenado por trandate DESC

    // Si la última OS es desinstalación (002) devolver false
    if (ultimaOS.familia_sigla === '002') {
        return true;
    }

    return false;
}
  return {
    beforeLoad: beforeLoad,
    afterSubmit
  };
});

