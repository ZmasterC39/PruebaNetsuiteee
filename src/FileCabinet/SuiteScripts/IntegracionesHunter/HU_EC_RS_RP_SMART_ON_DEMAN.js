/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
  'N/log',
  'N/search',
  'N/query',
  "N/record",
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_FUNCION",
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
  "N/https",
  "N/runtime",
  "N/format",
  'SuiteScripts/IntegracionesHunter/HU_TS_ScriptPlataformas_controller',
  'N/file',
  'N/email'
], function (log, search, query, record, coberturaController, _funcion, _const, https, runtime, format, _platformController, file, email) {

  function _post(context) {
    try {

      log.debug("context", context)

      let caso = context.accion

      switch (caso) {
        case "dispositivo":

          try {

            let bin = context.bin || '654';
            let item = context.item || '22059';

            const currentUser = runtime.getCurrentUser();
            // log.debug("Usuario actual", currentUser);

            // Obtener el correo electrónico
            const emailUsuario = currentUser.email;
            // log.debug("Correo del usuario", emailUsuario);

            let recepcionEmail = context.recepcionEmail || [emailUsuario];
            let subject = "Registro de Dispositivos disponibles del día " + format.format({ value: new Date(), type: format.Type.DATE }) + " - " + runtime.getCurrentUser().name;

            if (!recepcionEmail || recepcionEmail.length === 0) {
              return { result: "Faltan parámetros requeridos" };
            }

            let datos = ConsultaSqlDispositivoBodega(bin, item);

            if (!datos || datos.length === 0) {
              return { result: "No hay datos para enviar" };
            }

            let disponibles = datos.filter(d => d.estado_actual && d.estado_actual.toUpperCase().includes("DISPONIBLE"));
            let reservados = datos.filter(d => d.estado_actual && d.estado_actual.toUpperCase().includes("RESERVADO"));

            let ultimosReservados = ConsultaSqlUltimosReservados(bin, item);
            let ultimosDisponibles = ConsultaSqlUltimosDisponibles(bin, item);

            let contenidoHTML = `<p></p>`;

            if (disponibles.length > 0) contenidoHTML += `<h3>DISPOSITIVO EN ESTADO DISPONIBLE</h3>` + generarTablaHTML(disponibles);
            else contenidoHTML += `<p><strong>No hay dispositivos disponibles.</strong></p>`;

            if (reservados.length > 0) contenidoHTML += `<h3>DISPOSITIVO EN ESTADO DE RESERVA</h3>` + generarTablaHTML(reservados);
            else contenidoHTML += `<p><strong>No hay dispositivos reservados.</strong></p>`;

            if (ultimosReservados.length > 0) contenidoHTML += `<h3>DETALLE DE LAS RESERVAS</h3>` + generarTablaHTMLUltimosReservados(ultimosReservados);
            else contenidoHTML += `<p><strong>No se encontraron dispositivos recientemente reservados.</strong></p>`;

            if (ultimosDisponibles.length > 0) contenidoHTML += `<h3>DETALLE DE LOS ÚLTIMOS DISPONIBLES</h3>` + generarTablaHTMLUltimosDisponibles(ultimosDisponibles);
            else contenidoHTML += `<p><strong>No se encontraron dispositivos recientemente disponibles.</strong></p>`;

            let body = `
                       <table border="1" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border: 2px solid #ccc;">
                         <tr>
                           <td style="padding: 20px 0 0 20px; background-color: #fff;">
                             <img src="https://www.hunter.com.ec/images/logo.png" alt="Logo Principal" style="display: inline-block; max-width: 100px; height: auto; margin-bottom: 10px;">
                             <img src="https://www.aafd.org/wp-content/uploads/2024/11/NetSuite-logo-half-light.jpg" alt="Logo Área Control" style="display: inline-block; max-width: 80px; height: auto; margin-left: 10px;">
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 15px; text-align: center; background-color: #f8f8f8; border-top: 2px solid #ccc; border-bottom: 2px solid #ccc;">
                             <h1 style="margin: 0; font-size: 20px; font-weight: bold;">ESTADOS DE DISPOSITIVOS B262 COM.GYE SMART</h1>
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 14px;">
                             ${contenidoHTML}
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 10px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                             <p style="margin: 0 0 10px 0;">NOTA: ESTE MENSAJE FUE GENERADO DE FORMA AUTOMÁTICA. FAVOR NO RESPONDER A ESTA DIRECCIÓN.</p>
                           </td>
                         </tr>
                       </table>`;

            enviarNotificacionCorreo(subject, body, recepcionEmail);

            return { result: "Correo enviado correctamente", data: datos };

          } catch (error) {
            log.debug("error", error)
            break
          }

        case "sim":
          try {

            let bin = context.bin || '654';
            let item = context.item || '43868';

            const currentUser = runtime.getCurrentUser();
            // log.debug("Usuario actual", currentUser);

            // Obtener el correo electrónico
            const emailUsuario = currentUser.email;
            // log.debug("Correo del usuario", emailUsuario);

            let recepcionEmail = context.recepcionEmail || [emailUsuario];
            let subject = "Registro de Dispositivos disponibles del día " + format.format({ value: new Date(), type: format.Type.DATE }) + " - " + runtime.getCurrentUser().name;

            if (!recepcionEmail || recepcionEmail.length === 0) {
              return { result: "Faltan parámetros requeridos" };
            }

            let datos = ConsultaSqlSimBodega(bin, item);

            log.debug("datos", datos)

            if (!datos || datos.length === 0) {
              return { result: "No hay datos para enviar" };
            }

            let disponibles = datos.filter(d => d.estado_actual && d.estado_actual.toUpperCase().includes("DISPONIBLE"));
            let reservados = datos.filter(d => d.estado_actual && d.estado_actual.toUpperCase().includes("RESERVADO"));

            let ultimosReservados = ConsultaSqlUltimosReservadosSIM(bin, item);
            let ultimosDisponibles = ConsultaSqlUltimosDisponiblesSIM(bin, item);

            let contenidoHTML = `<p></p>`;

            if (disponibles.length > 0) contenidoHTML += `<h3>SIM CARD EN ESTADO DISPONIBLE</h3>` + generarTablaHTML(disponibles);
            else contenidoHTML += `<p><strong>No hay dispositivos disponibles.</strong></p>`;

            if (reservados.length > 0) contenidoHTML += `<h3>SIM CARD EN ESTADO DE RESERVA</h3>` + generarTablaHTML(reservados);
            else contenidoHTML += `<p><strong>No hay dispositivos reservados.</strong></p>`;

            if (ultimosReservados.length > 0) contenidoHTML += `<h3>DETALLE DE LAS RESERVAS</h3>` + generarTablaHTMLUltimosReservados(ultimosReservados);
            else contenidoHTML += `<p><strong>No se encontraron sim card recientemente reservados.</strong></p>`;

            if (ultimosDisponibles.length > 0) contenidoHTML += `<h3>DETALLE DE LOS ÚLTIMOS DISPONIBLES</h3>` + generarTablaHTMLUltimosDisponibles(ultimosDisponibles);
            else contenidoHTML += `<p><strong>No se encontraron sim card recientemente disponibles.</strong></p>`;

            let body = `
                       <table border="1" cellpadding="0" cellspacing="0" width="100%" style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse; border: 2px solid #ccc;">
                         <tr>
                           <td style="padding: 20px 0 0 20px; background-color: #fff;">
                             <img src="https://www.hunter.com.ec/images/logo.png" alt="Logo Principal" style="display: inline-block; max-width: 100px; height: auto; margin-bottom: 10px;">
                             <img src="https://www.aafd.org/wp-content/uploads/2024/11/NetSuite-logo-half-light.jpg" alt="Logo Área Control" style="display: inline-block; max-width: 80px; height: auto; margin-left: 10px;">
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 15px; text-align: center; background-color: #f8f8f8; border-top: 2px solid #ccc; border-bottom: 2px solid #ccc;">
                             <h1 style="margin: 0; font-size: 20px; font-weight: bold;">ESTADOS DE SIM CARD B262 COM.GYE SMART</h1>
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 14px;">
                             ${contenidoHTML}
                           </td>
                         </tr>
                         <tr>
                           <td style="padding: 10px; text-align: center; background-color: #DE022E; color: #ffffff; font-size: 12px;">
                             <p style="margin: 0 0 10px 0;">NOTA: ESTE MENSAJE FUE GENERADO DE FORMA AUTOMÁTICA. FAVOR NO RESPONDER A ESTA DIRECCIÓN.</p>
                           </td>
                         </tr>
                       </table>`;

            enviarNotificacionCorreo(subject, body, recepcionEmail);

            return { result: "Correo enviado correctamente", data: datos };

          } catch (error) {
            log.debug("error", error)
            break
          }

        default:
          break;
      }



    } catch (error) {
      log.error("Error en Restlet POST", error);
      return { result: "Error en Restlet", error: error.message };
    }
  }

  // === FUNCIONES AUXILIARES ===
  function generarTablaHTML(data) {
    let tabla = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">`;
    tabla += `<thead><tr><th>Descripción</th><th>Depósito</th><th>Item</th><th>Estado Actual</th><th>Cantidad</th></tr></thead><tbody>`;

    let posicion = 1; // Inicializamos el contador de posición

    for (let item of data) {
      tabla += `<tr>
           
            <td style="text-align: center;">${item.descripcion || ''}</td>
            <td style="text-align: center;">${item.deposito || ''}</td>
            <td style="text-align: center;">${item.itemname || ''}</td>
            <td style="text-align: center;">${item.estado_actual || ''}</td>
            <td style="text-align: center;">${item.cantidad || ''}</td>
          </tr>`;
      posicion++; // Incrementamos la posición
    }

    tabla += `</tbody></table><br>`;
    return tabla;
  }

  function enviarNotificacionCorreo(subject, body, salesrepEmail) {
    try {
      email.send({
        author: 449, // ID del autor del correo (puede cambiarse)
        recipients: salesrepEmail,
        bcc: ['daristega@carsegsa.com'],
        subject,
        body,
        relatedRecords: null,
      });
      log.debug("Correo enviado correctamente", { recipients: salesrepEmail });
    } catch (error) {
      log.error("Error al enviar correo", error);
    }
  }

  function generarTablaHTMLUltimosReservados(data) {
    let tabla = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">`;
    tabla += `<thead><tr>
          <th>N.</th>
          <th>Descripción</th>
          <th>ID Dispositivo</th>
          <th>Nombre de Dispositivo</th>
          <th>Fecha de reserva</th>
        </tr></thead><tbody>`;

    let posicion = 1; // Inicializamos el contador de posición

    for (let item of data) {
      tabla += `<tr>
               <td>${posicion}</td>
            <td>${item.descripcion || ''}</td>
            <td style="text-align: center;">${item.id_inventario || ''}</td>
            <td style="text-align: center;">${item.numero_inventario || ''}</td>
            <td style="text-align: center;">${item.ultima_fecha_reservado || ''}</td>
          </tr>`;
      posicion++; // Incrementamos la posición
    }

    tabla += `</tbody></table><br>`;
    return tabla;
  }

  function generarTablaHTMLUltimosDisponibles(data) {
    let tabla = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%;">`;
    tabla += `<thead><tr>
          <th>N.</th>
          <th>Descripción</th>
          <th>ID Dispositivo</th>
          <th>Nombre de Dispositivo</th>
          <th>Fecha de Carga  </th>
        </tr></thead><tbody>`;

    let posicion = 1; // Inicializamos el contador de posición

    for (let item of data) {
      tabla += `<tr>
               <td>${posicion}</td>
            <td>${item.descripcion || ''}</td>
            <td style="text-align: center;">${item.id_inventario || ''}</td>
            <td style="text-align: center;">${item.numero_inventario || ''}</td>
            <td style="text-align: center;">${item.ultima_fecha_reservado || ''}</td>
          </tr>`;
      posicion++; // Incrementamos la posición
    }

    tabla += `</tbody></table><br>`;
    return tabla;
  }

  function ConsultaSqlDispositivoBodega() {
    try {
      let sqlQuery = `
            SELECT 
                Item.description AS descripcion, 
                ItemBinQuantity.bin AS deposito,
                BUILTIN.DF(ItemBinQuantity.Item) AS itemname,
                BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS estado_actual,
                COUNT(HtDispositivo.custrecord_ht_dd_estado) AS cantidad
            FROM ItemBinQuantity
            INNER JOIN Item ON Item.id = ItemBinQuantity.Item
            INNER JOIN InventoryBalance ON InventoryBalance.item = Item.id
                AND InventoryBalance.binnumber = ItemBinQuantity.bin
            INNER JOIN CustomRecord_HT_Record_DetalleChaserDisp AS HtDispositivo 
                ON HtDispositivo.name = BUILTIN.DF(InventoryBalance.inventorynumber)
            WHERE ItemBinQuantity.bin = '654'
              AND ItemBinQuantity.onhand > 0
              AND Item.itemtype = 'InvtPart'
            GROUP BY 
                Item.description, 
                ItemBinQuantity.bin,
                BUILTIN.DF(ItemBinQuantity.Item),
                BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado)
            ORDER BY ItemBinQuantity.bin, Item.description;
          `;

      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  function ConsultaSqlSimBodega() {
    try {
      let sqlQuery = `
            SELECT 
                Item.description AS descripcion, 
                ItemBinQuantity.bin AS deposito,
                BUILTIN.DF(ItemBinQuantity.Item) AS itemname,
                BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) AS estado_actual,
                COUNT(HtDispositivo.custrecord_ht_ds_estado) AS cantidad
            FROM ItemBinQuantity
            INNER JOIN Item ON Item.id = ItemBinQuantity.Item
            INNER JOIN InventoryBalance ON InventoryBalance.item = Item.id
                AND InventoryBalance.binnumber = ItemBinQuantity.bin
            INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERSIM AS HtDispositivo 
                ON HtDispositivo.name = BUILTIN.DF(InventoryBalance.inventorynumber)
            WHERE
               custrecord_ht_ds_serie IS NOT NULL 
               AND ItemBinQuantity.bin = 654
               AND Item.id = 43868
               AND ItemBinQuantity.onhand > 0
               AND Item.itemtype = 'InvtPart'
               AND HtDispositivo.isinactive = 'F' 
            GROUP BY 
                Item.description, 
                ItemBinQuantity.bin,
                BUILTIN.DF(ItemBinQuantity.Item),
                BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado)
            ORDER BY ItemBinQuantity.bin, Item.description;
          `;

      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  function ConsultaSqlUltimosReservados() {
    try {
      // let sqlQuery = `
      //         SELECT 
      //         BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
      //         ItemBinQuantity.bin AS Deposito,
      //         BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
      //         Item.description AS DESCRIPCION,
      //         inventorybalance.inventorynumber AS ID_INVENTARIO,
      //         BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
      //         BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,
      //         MAX(systemnote.date) AS Ultima_Fecha_Reservado
      //     FROM
      //         ItemBinQuantity
      //     INNER JOIN Item 
      //         ON Item.id = ItemBinQuantity.Item
      //     INNER JOIN inventorybalance 
      //         ON inventorybalance.item = Item.id
      //         AND inventorybalance.binnumber = ItemBinQuantity.bin
      //     INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
      //         ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
      //     LEFT JOIN systemnote 
      //         ON systemnote.recordid = HtDispositivo.id
      //         AND systemnote.newvalue = '009 - RESERVADO'
      //     WHERE
      //         ItemBinQuantity.bin = '654'
      //         AND Item.id = '22059'
      //         AND ItemBinQuantity.OnHand > 0
      //         AND Item.itemtype = 'InvtPart'
      //         AND HtDispositivo.custrecord_ht_dd_estado = '9'
      //     GROUP BY
      //         BUILTIN.DF(ItemBinQuantity.Item),
      //         ItemBinQuantity.bin,
      //         BUILTIN.DF(ItemBinQuantity.bin),
      //         Item.description,
      //         inventorybalance.inventorynumber,
      //         BUILTIN.DF(inventorybalance.inventorynumber),
      //         BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado)
      //     ORDER BY
      //         Ultima_Fecha_Reservado ASC;
      //     `;

      let sqlQuery = `
            SELECT 
              BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
              ItemBinQuantity.bin AS Deposito,
              BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
              Item.description AS DESCRIPCION,
              inventorybalance.inventorynumber AS ID_INVENTARIO,
              BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,    
              HtDispositivo.lastmodified AS Ultima_Fecha_Reservado
          FROM
              ItemBinQuantity
          INNER JOIN Item 
              ON Item.id = ItemBinQuantity.Item
          INNER JOIN inventorybalance 
              ON inventorybalance.item = Item.id
              AND inventorybalance.binnumber = ItemBinQuantity.bin
          INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
              ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
          WHERE
              ItemBinQuantity.bin = '654'
              AND Item.id = '22059'
              AND ItemBinQuantity.OnHand > 0
              AND Item.itemtype = 'InvtPart'
              AND HtDispositivo.custrecord_ht_dd_estado = '9'
          GROUP BY
              BUILTIN.DF(ItemBinQuantity.Item),
              ItemBinQuantity.bin,
              BUILTIN.DF(ItemBinQuantity.bin),
              Item.description,
              inventorybalance.inventorynumber,
              BUILTIN.DF(inventorybalance.inventorynumber),
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado),
              HtDispositivo.lastmodified
          ORDER BY
              Ultima_Fecha_Reservado ASC;
          `;

      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  function ConsultaSqlUltimosReservadosSIM() {
    try {
      let sqlQuery = `
          SELECT 
              BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
              ItemBinQuantity.bin AS Deposito,
              BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
              Item.description AS DESCRIPCION,
              inventorybalance.inventorynumber AS ID_INVENTARIO,
              BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
              BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) AS Estado_Actual,
              -- MAX(systemnote.date) AS Ultima_Fecha_Reservado
              HtDispositivo.lastmodified AS Ultima_Fecha_Reservado
          FROM
              ItemBinQuantity
          INNER JOIN Item 
              ON Item.id = ItemBinQuantity.Item
          INNER JOIN inventorybalance 
              ON inventorybalance.item = Item.id
              AND inventorybalance.binnumber = ItemBinQuantity.bin
          INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERSIM AS HtDispositivo 
              ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
          -- LEFT JOIN systemnote 
            --  ON systemnote.recordid = HtDispositivo.id
             -- AND systemnote.newvalue = 'RESERVADO'
          WHERE
              ItemBinQuantity.bin = '654'
              AND Item.id = '43868'
              AND ItemBinQuantity.OnHand > 0
              AND Item.itemtype = 'InvtPart'
              AND HtDispositivo.custrecord_ht_ds_estado = '6'
          GROUP BY
              BUILTIN.DF(ItemBinQuantity.Item),
              ItemBinQuantity.bin,
              BUILTIN.DF(ItemBinQuantity.bin),
              Item.description,
              inventorybalance.inventorynumber,
              BUILTIN.DF(inventorybalance.inventorynumber),
              BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado),
              HtDispositivo.lastmodified
          ORDER BY
              Ultima_Fecha_Reservado ASC;
          `;

      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  function ConsultaSqlUltimosDisponibles() {
    try {
      // let sqlQuery = `
      //         SELECT 
      //         BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
      //         ItemBinQuantity.bin AS Deposito,
      //         BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
      //         Item.description AS DESCRIPCION,
      //         inventorybalance.inventorynumber AS ID_INVENTARIO,
      //         BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
      //         BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,
      //         MAX(systemnote.date) AS Ultima_Fecha_Reservado
      //     FROM
      //         ItemBinQuantity
      //     INNER JOIN Item 
      //         ON Item.id = ItemBinQuantity.Item
      //     INNER JOIN inventorybalance 
      //         ON inventorybalance.item = Item.id
      //         AND inventorybalance.binnumber = ItemBinQuantity.bin
      //     INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
      //         ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
      //     LEFT JOIN systemnote 
      //         ON systemnote.recordid = HtDispositivo.id
      //         --AND systemnote.newvalue = '009 - RESERVADO'
      //     WHERE
      //         ItemBinQuantity.bin = '654'
      //         AND Item.id = '22059'
      //         AND ItemBinQuantity.OnHand > 0
      //         AND Item.itemtype = 'InvtPart'
      //         AND HtDispositivo.custrecord_ht_dd_estado = '5'
      //     GROUP BY
      //         BUILTIN.DF(ItemBinQuantity.Item),
      //         ItemBinQuantity.bin,
      //         BUILTIN.DF(ItemBinQuantity.bin),
      //         Item.description,
      //         inventorybalance.inventorynumber,
      //         BUILTIN.DF(inventorybalance.inventorynumber),
      //         BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado)
      //     ORDER BY
      //         Ultima_Fecha_Reservado ASC;
      //     `;

      let sqlQuery = `
           SELECT 
              BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
              ItemBinQuantity.bin AS Deposito,
              BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
              Item.description AS DESCRIPCION,
              inventorybalance.inventorynumber AS ID_INVENTARIO,
              BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado) AS Estado_Actual,    
              HtDispositivo.lastmodified AS Ultima_Fecha_Reservado
          FROM
              ItemBinQuantity
          INNER JOIN Item 
              ON Item.id = ItemBinQuantity.Item
          INNER JOIN inventorybalance 
              ON inventorybalance.item = Item.id
              AND inventorybalance.binnumber = ItemBinQuantity.bin
          INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERDISP AS HtDispositivo 
              ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
          WHERE
              ItemBinQuantity.bin = '654'
              AND Item.id = '22059'
              AND ItemBinQuantity.OnHand > 0
              AND Item.itemtype = 'InvtPart'
              AND HtDispositivo.custrecord_ht_dd_estado = '5'
          GROUP BY
              BUILTIN.DF(ItemBinQuantity.Item),
              ItemBinQuantity.bin,
              BUILTIN.DF(ItemBinQuantity.bin),
              Item.description,
              inventorybalance.inventorynumber,
              BUILTIN.DF(inventorybalance.inventorynumber),
              BUILTIN.DF(HtDispositivo.custrecord_ht_dd_estado),
              HtDispositivo.lastmodified
          ORDER BY
              Ultima_Fecha_Reservado ASC;
   `;
      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  function ConsultaSqlUltimosDisponiblesSIM() {
    try {
      let sqlQuery = `
              SELECT 
              BUILTIN.DF(ItemBinQuantity.Item) AS ItemName,
              ItemBinQuantity.bin AS Deposito,
              BUILTIN.DF(ItemBinQuantity.bin) AS Nombre_Deposito,
              Item.description AS DESCRIPCION,
              inventorybalance.inventorynumber AS ID_INVENTARIO,
              BUILTIN.DF(inventorybalance.inventorynumber) AS numero_inventario,
              BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado) AS Estado_Actual,
              -- MAX(systemnote.date) AS Ultima_Fecha_Reservado
              HtDispositivo.lastmodified AS Ultima_Fecha_Reservado
          FROM
              ItemBinQuantity
          INNER JOIN Item 
              ON Item.id = ItemBinQuantity.Item
          INNER JOIN inventorybalance 
              ON inventorybalance.item = Item.id
              AND inventorybalance.binnumber = ItemBinQuantity.bin
          INNER JOIN CUSTOMRECORD_HT_RECORD_DETALLECHASERSIM AS HtDispositivo 
              ON HtDispositivo.name = BUILTIN.DF(inventorybalance.inventorynumber)
          -- LEFT JOIN systemnote 
          --    ON systemnote.recordid = HtDispositivo.id
          WHERE
              ItemBinQuantity.bin = '654'
              AND Item.id = '43868'
              AND ItemBinQuantity.OnHand > 0
              AND Item.itemtype = 'InvtPart'
              AND HtDispositivo.custrecord_ht_ds_estado = '7'
          GROUP BY
              BUILTIN.DF(ItemBinQuantity.Item),
              ItemBinQuantity.bin,
              BUILTIN.DF(ItemBinQuantity.bin),
              Item.description,
              inventorybalance.inventorynumber,
              BUILTIN.DF(inventorybalance.inventorynumber),
              BUILTIN.DF(HtDispositivo.custrecord_ht_ds_estado),
              HtDispositivo.lastmodified
          ORDER BY
              Ultima_Fecha_Reservado ASC;
          `;

      const resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      if (!results) return [];

      // Sanitizar los resultados
      for (let obj of results) {
        for (let key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\n/g, " ").trim();
          } else {
            obj[key] = obj[key] === null ? "" : obj[key];
          }
        }
      }

      return results;
    } catch (error) {
      log.error("ConsultaSqlDispositivoBodega - Error", error);
      return [];
    }
  }

  return {
    post: _post
  };
});
