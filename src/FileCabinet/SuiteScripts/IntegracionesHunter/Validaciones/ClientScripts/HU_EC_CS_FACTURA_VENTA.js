/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 20/03/2025 - Last modified: 04/06/2025
 * @description
 * - validarFacturaDeVenta: Valida si el cliente tiene los campos necesarios para la emisión de factura electrónica (email, phone, addrtext)
 *
 * @version 1.0
 * @notes
 *    - REQD-4333 - Mauro F Ramos 04/06/2025
*/
define(["N/log", 'N/runtime', 'N/query', 'N/ui/dialog'], function (log, runtime, query, dialog) {

  let entity;
  let facturar_a;
  let cliente_factura;

    const pageInit = (context) => {
      try {
        let usuario = runtime.getCurrentUser();
        log.debug("usuario", usuario);
        let currentRecord = context.currentRecord;
        let cliente = currentRecord.getValue({fieldId: 'entity' });

        // if ( context.mode != 'view') {
        //   let registro = currentRecord.get();
        //   let campo = registro.getField({ fieldId: 'terms'});
        //   if ( campo ) {
        //     log.debug("campo", campo);
        //   }
        // }

        if( cliente.length === 0) {
          return;
        }

        /* REQD-4333 - Mauro F Ramos 06/06/2025
         * Si el modo es 'copy', se obtiene el valor del campo 'custbody_ht_facturar_a' y se asigna al campo 'entity'.
         * Esto es necesario para que la factura se emita al cliente correcto.
         * se hace uso de: ignoreFieldChange, para evitar que se dispare el evento fieldChanged al cambiar el valor del campo 'entity'.
        */
        if(context.mode == 'copy' ) { // Corresponde al impulso desde Proxima Factura y Factura Restante
          entity = currentRecord.getValue({ fieldId: 'entity' });
          facturar_a = currentRecord.getValue({ fieldId: 'custbody_ht_facturar_a' });
          if( entity && facturar_a ) {
            let es_financiera = _executeQuery(`SELECT
                CASE
                    WHEN EXISTS (
                    SELECT 1
                    FROM customrecord_ht_record_canaldistribucion
                    WHERE custrecord_ht_cd_ruccanaldistribucion = (
                        SELECT SUBSTR(entityid, INSTR(entityid, '-', 1, 2) + 1)
                        FROM customer
                        WHERE id = ?
                    )
                    AND custrecord_ht_cd_tipocanal = 3 AND isinactive = 'F'
                    ) THEN 'TRUE'
                    ELSE 'FALSE'
                END AS result
                FROM dual`, [facturar_a]);
            log.debug("es_financiera", `es Financiera: ${es_financiera[0].result}`);
            if( es_financiera && es_financiera[0].result === 'FALSE'){
                cliente_factura = facturar_a
                currentRecord.setValue({
                    fieldId: 'entity',
                    value: facturar_a,
                    ignoreFieldChange: true
                })
            }
          }
        }

        if( usuario.subsidiary == 2 && (context.mode == 'create' || context.mode == 'copy')){
          validarFacturaDeVenta(context, "pageInit");
        }
      } catch (e) {
        log.debug("Error:", e.stack);
      }
    };

    function validarFacturaDeVenta(context, logInfo) {
      try {
        let envType = runtime.envType; // Retorna 'SANDBOX' o 'PRODUCTION'
        let baseUrl = '';

        if (envType === runtime.EnvType.SANDBOX) {
            baseUrl = 'https://7451241-sb1.app.netsuite.com';
        } else {
            baseUrl = 'https://7451241.app.netsuite.com';
        }
        let currentRecord = context.currentRecord;
        let entity = currentRecord.getValue({ fieldId: 'entity'}); // custbody_ht_facturar_a
        let customform = currentRecord.getValue({fieldId: 'customform' });
        if(customform != 101){
          return;
        }
        let informacion = _executeQuery(`SELECT c.email, c.phone, ea.addrtext FROM customer c LEFT JOIN entityAddressbook eab ON eab.entity = c.id LEFT JOIN EntityAddress ea ON ea.recordowner = eab.addressbookaddress WHERE c.id = ?`, [entity]);
        log.debug(`${logInfo}: cliente`, informacion);

        if (informacion) {
          let camposFaltantes = validarInformacion(informacion[0]);
          if (camposFaltantes.length > 0) {
              let url = `${baseUrl}/app/common/entity/custjob.nl?id=${entity}`;

              dialog.alert({
                  title: "Información Incompleta",
                  message: `El cliente tiene los siguientes campos faltantes: <b>${camposFaltantes.join("<br>")}</b><br>Necesario para la emisión de factura electrónica`
              }).then(function() {
                window.onbeforeunload = null;
                window.open(url, '_self');
              });
              return false;
          }
        }
      } catch (error) {
        log.error("ERORR - validarFacturaDeVenta", error);
      }
    }

    function validarInformacion(item) {
      let faltantes = [];
      if (!item.email) faltantes.push("Correo Electrónico");
      if (!item.phone) faltantes.push("Teléfono");
      if (!item.addrtext) faltantes.push("Dirección");

      return faltantes;
    }

    function _executeQuery(sqlQuery, params) {
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

    function  fieldChanged(context) {
      try {
        let usuario = runtime.getCurrentUser();
      let fieldId = context.fieldId;
      if(usuario.subsidiary == 2){
        if(fieldId === "entity"){
          validarFacturaDeVenta(context, "fieldChanged");
        }
      }
      } catch (error) {
        log.error("Error en fieldChanged", error);
      }
    }

    return {
      pageInit: pageInit,
      fieldChanged: fieldChanged
    };
});