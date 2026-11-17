/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author JENNIFFER NARCISA CHAVEZ FIGUEROA - Mauro F Ramos
 * @date Created at: 01/10/2024 - Last modified: 23/06/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 */

define(['N/log', 'N/search', 'N/ui/message', 'N/runtime', 'N/query', 'N/record', 'N/format'], function (log, search, message, runtime, query, record, format) {
    /*
        Importante: Los scripts de cliente solo se ejecutan en modo de edición.
        Si tiene un script de cliente implementado con un punto de entrada pageInit,
        ese script no se ejecuta cuando visualiza el formulario. Se ejecuta cuando hace clic en Editar .
    */
    var TERM_ID = '48'; // DEBITO AUTOMATICO, VERIFICAR EN PRODUCCION
    var typeMode = "";

    const pageInit = (context) => {

      try {
        typeMode = context.mode; // El modo en el que se accede al registro.
        let usuario2 = runtime.getCurrentUser();
        if ( usuario2.id == 49529 ){
          log.error("context.currentRecord", context.currentRecord.getLineCount({ sublistId: 'billingschedule' }))
        }

        var currentRecordObj = context.currentRecord; // El registro del formulario actual.
        // Aquí se especifica el ID del campo que quieres hacer visible
        var fieldIdBanco = 'custbody_ht_ec_banco'; // Reemplaza con el ID del campo real

        var fieldIdTermino = 'terms';
        // Se obtiene el campo mediante el método getField
        var field = currentRecordObj.getField({
            fieldId: fieldIdTermino
        });


        // log.debug('field....', field);
        // Si el campo Termino existe, hacemos visibles campos de ingreso de DA
        if (field) {
            // Si el Termino es 48 - DebitoAutomatico, hacemos visible en otro caso no
            if (currentRecordObj.getValue({fieldId: fieldIdTermino}) == TERM_ID) {

               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_banco' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_numerocta' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_titularcuenta' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_tipocuentabanco' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_plazotarjeta' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_emisorestc' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_fechavenctarjeta' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_promocion_da' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisplay = true;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisabled = true;
            }
            else{
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_banco' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_numerocta' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_titularcuenta' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_tipocuentabanco' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_plazotarjeta' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_emisorestc' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_fechavenctarjeta' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_promocion_da' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisplay = false;
               currentRecordObj.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisabled = true;
            }
        }

        // Mauro F Ramos 23/06/2025
        // Mostrar una alaerta solo si el formulario de la OS esta en modo *create* y tiene un cliente establecido en el el formulario
        // si el cliente tiene saldo vencido, mostrar una alerta con el saldo vencido
        let entity = currentRecordObj.getValue({ fieldId: 'entity'});
        let bien = currentRecordObj.getValue({ fieldId: 'custbody_ht_so_bien'});
        if( context.mode == 'create' && entity){
            validarCartera(entity);
        }

        if( context.mode == 'create' && entity && bien){
          _aviso_doble_tecnologia(entity, bien);
        }

      } catch (error) {
          //log.error('Error', error);
          log.error("Error", { error: error.message, stack: error.stack });
        }
    };

    function _aviso_doble_tecnologia(entity, bien) {
      try {
        let suiteQl = `SELECT c.altname, c.category, ct.name FROM customer c JOIN customercategory ct ON ct.id = c.category WHERE c.category = 8 AND c.id = ?`
        suiteQl = `SELECT c.altname, c.category FROM customer c WHERE c.category = 8 AND c.id = ?`

        let customer = _executeQuery(suiteQl, [entity]); // Si existen resutlados es por que el cliente es: 009 CLIENTE CORPORATIVO

        suiteQl = `SELECT * FROM customrecord_ht_co_cobertura WHERE custrecord_ht_co_bien = ?`
        let tiene_productos = _executeQuery(suiteQl, [bien]); // El bien no tiene cobertura por lo que sera una venta nueva
        if( customer && (!tiene_productos) ){
          message.create({
            type: message.Type.INFORMATION,
            title: 'Información',
            message: `<div style="padding: 10px; border-radius: 5px;">
              <p style="font-size:17px; ">
                  009 CLIENTE CORPORATIVO: <b>${customer[0].altname}</b><br><b>Ofrecer Doble tecnología (LoJack / Monitoreo) conforme a precios y condiciones comerciales vigentes.</b>
              </p>
            </div>`,
          }).show();
        }
        } catch (error) {
        log.error("ERROR _aviso_doble_tecnologia", error)
      }
    }

    function validarCartera(entity){
        const customer = record.load({
            type: record.Type.CUSTOMER,
            id: entity
        });
        const overdueBalance = customer.getValue('overduebalance');
        const altname = customer.getValue('altname');

        const formattedBalance = format.format({
            value: overdueBalance,
            type: format.Type.CURRENCY
        });

        if(overdueBalance > 0){
          message.create({
                type: message.Type.ERROR,
                title: 'Información',
                message: `<p style="font-size:18px;">Estado de cartera del cliente: <b>${altname}</b><br>Saldo vencido: <b><span style="color:#de022e;">${formattedBalance}</span></b></p>`,
            }).show();
        }

    }

    function fieldChanged(context) {
       try {
            var currentRecord = context.currentRecord; // El registro del formulario actual.
            var fieldId = 'terms'; // Campo de la forma de pago
            let usuario = runtime.getCurrentUser();

            //log.debug('CurrentRecord....', currentRecord);
            if (typeMode == "create" || typeMode == "copy" || typeMode == "edit") {
                 // Campo de la forma de pago
                if (context.fieldId == 'terms') {

                    // TERMINO - DEBITO AUTOMATICO
                    if (currentRecord.getValue({fieldId: fieldId}) == TERM_ID) {

                        log.debug('CurrentRecord....', currentRecord);

                        //Activar los campos del convenio DA para permitir el ingreso
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_banco' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_numerocta' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_titularcuenta' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_tipocuentabanco' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_plazotarjeta' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_emisorestc' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_fechavenctarjeta' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_promocion_da' } ).isDisplay = true;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisplay = true;
                    }
                    else{

                        //log.debug('TerminoReg....', fieldValue);
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_banco' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_numerocta' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_titularcuenta' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_tipocuentabanco' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_plazotarjeta' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_emisorestc' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_fechavenctarjeta' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_promocion_da' } ).isDisplay = false;
                        currentRecord.getField( { fieldId: 'custbody_ht_ec_valor_promocion_da' } ).isDisplay = false;
                    }
                }

                // Campo de Promocion DA, setear valor de promocion
                if (context.fieldId == 'custbody_ht_ec_promocion_da') {

                    var Codigopromocion = currentRecord.getValue({fieldId: 'custbody_ht_ec_promocion_da'});

                    log.debug('Codigopromocion....', Codigopromocion);

                    // Busqueda de la promocion DA, para obtener el valor y el item
                    var busquedaPromocion = search.create({
                        type: "customrecordec_detalle_promociones_da",
                        filters:
                        [
                           ["internalid","anyof", Codigopromocion]
                        ],
                        columns:
                        [
                           search.createColumn({name: "custrecord_ht_prom_da_codigo_item", label: "EC - Codigo item"}),
                           search.createColumn({name: "custrecord_ht_prom_da_descripcion_item", label: "EC - Descripcion Item"}),
                           search.createColumn({name: "custrecord_ht_prom_da_valor_cuota", label: "EC - Valor Cuota"}),
                        ]
                     });

                     var myResultSetPromocion = busquedaPromocion.run().getRange({start: 0, end: 1});
                     var theCountPromo = busquedaPromocion.runPaged().count;
                     if (theCountPromo != 1) {
                         log.debug('Busqueda.Error no se el valor de la promocion........', myResultSetPromocion);    
                     } else {
                         //Obtiene el ID
                         var CodigoItem = myResultSetPromocion[0].getValue(busquedaPromocion.columns[0]);
                         var DescripcionItem = myResultSetPromocion[0].getValue(busquedaPromocion.columns[1]);
                         var ValorPromocion = myResultSetPromocion[0].getValue(busquedaPromocion.columns[2]);
                         var ItemPromocion = CodigoItem +' - ' + DescripcionItem
                     }
                    log.debug('ValorPromocion....', ValorPromocion);
                    log.debug('ItemPromocion....', ItemPromocion);

                    // Mostrar valor de cuota
                    currentRecord.setValue({ fieldId: 'custbody_ht_ec_valor_promocion_da', value: ValorPromocion });

                 }

               // Campo de ingreso de numero de cuenta
               // Validar ingreso de numeros
               if (context.fieldId == 'custbody_ht_ec_numerocta') {

                    var NumeroCuenta = currentRecord.getValue({fieldId: 'custbody_ht_ec_numerocta'});
                    var maxLength = 20; // Define la longitud máxima permitida

                    // Verifica si el valor no es un número
                    if (isNaN(NumeroCuenta)) {

                        dialog.alert({ title: 'Alerta', message: 'Se debe ingresar solo números en el campo Número Cuenta' });
                        // Borra el valor no válido
                        currentRecord.setValue({ fieldId: 'custbody_ht_ec_numerocta', value: '' });

                        return false
                    }
                    // Verifica la longitud del valor
                    if (NumeroCuenta && NumeroCuenta.length > maxLength) {
                        currentRecord.setValue({ fieldId: 'custbody_ht_ec_numerocta', value: NumeroCuenta.substring(0, maxLength) }); // Opcional: trunca el valor
                    }
                }

               // Campo de ingreso de plazo de tarjeta
               // Validar ingreso de numeros
               if (context.fieldId == 'custbody_ht_ec_plazotarjeta') {

                    var Plazo = currentRecord.getValue({fieldId: 'custbody_ht_ec_plazotarjeta'});
                    var maxLength = 3; // Define la longitud máxima permitida

                    // Verifica si el valor no es un número
                    if (isNaN(Plazo)) {

                        dialog.alert({ title: 'Alerta', message: 'Se debe ingresar solo números en el campo Plazo tarjeta' });
                        // Borra el valor no válido
                        currentRecord.setValue({ fieldId: 'custbody_ht_ec_plazotarjeta', value: '' });

                        return false
                    }

                    // Verifica la longitud del valor
                    if (Plazo && Plazo.length > maxLength) {
                        currentRecord.setValue({ fieldId: 'custbody_ht_ec_plazotarjeta', value: Plazo.substring(0, maxLength) }); // Opcional: trunca el valor
                    }
                 }

                // Mauro F Ramos 06/03/2025
                // Autocompletar información dependiendo del artículo seleccionado
                // Dependiendo del producto si es:
                //  • Venta: Tiempo Cobertura 0, Unidade Tiempo Cobertura N.A
                //  • Servicio: Tiempo cobertura 12 meses, Unidad tiempo Cobertura Meses
                //  • Si se selecciona un valor en Calendario de facturación, entonces Tiempo Cobertura y Cantidad y Unidades (SRVM)"

                // Validar que no se ingrese valores decimales al ingresar un artículo en la OS, dentro de la sublista de Artículo los campos: Tiempo Cobertura y Cantidad

                // Mauro F Ramos 20/03/2025
                // Si el tiempo de cobertura es mayor a 12 y la unidad de tiempo de cobertura es meses, se establece: tiempo de cobertura = 12
                // Si custcol_ht_os_und_tiempo_cobertura = a meses y entonces custcol_ht_os_tiempo_cobertura = 12
                if(usuario.subsidiary == 2 && (context.fieldId == 'item' || context.fieldId == 'quantity' || context.fieldId == 'custcol_ht_os_tiempo_cobertura' || context.fieldId == 'billingschedule' || context.fieldId == 'custcol_ht_os_und_tiempo_cobertura')){
                    _establecerValores(context);
                }
            }

            // Mauro F Ramos 23/06/2025
            // Mostrar una alaerta solo si el formulario de la OS esta en modo *create* y tiene un cliente establecido en el el formulario
            // si el cliente tiene saldo vencido, mostrar una alerta con el saldo vencido
            if( typeMode == 'create'){
                if ( context.fieldId == 'entity' ){
                    let entity = currentRecord.getValue({fieldId: 'entity'})
                    validarCartera(entity);
                }

                if( context.fieldId == 'custbody_ht_so_bien'){
                  let entity = currentRecord.getValue({ fieldId: 'entity'});
                  let bien = currentRecord.getValue({ fieldId: 'custbody_ht_so_bien'});
                  _aviso_doble_tecnologia(entity, bien);
                }
            }

        } catch (error) {
                //log.error('Error', error);
                log.error("Error", { error: error.message, stack: error.stack });
        }
    }

    function _establecerValores(context){
        try {
            let fieldId = context.fieldId;
            let record = context.currentRecord;
            let und_tiempo_cobertura = record.getCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura' });
            if( fieldId == 'item'){
              let itemId = record.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
              let value = obtenerParametrizacionItem(`${itemId}`, ['GTR']);
                if (value[0].ValorText === 'S - SI') {
                  record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 12 });
                  record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura', value: 2 });
                }else{
                    record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 0 });
                    record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura', value: 4 });
              }
            }
            if( fieldId == 'quantity'){
              let quantity = record.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
              if (quantity % 1 !== 0) {
                  let integerValue = parseInt(quantity);
                  record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: integerValue });
              }
            }
            if( fieldId == 'custcol_ht_os_tiempo_cobertura'){
              let tiempo_cobertura = record.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura' });
              let und_tiempo_cobertura = record.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura' });
              if(( tiempo_cobertura <= 0 || tiempo_cobertura > 12) && und_tiempo_cobertura == 2){
                // Cambio aplicado el 20/03/2025 - Mauro F Ramos
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 12 });
              }
              if(( tiempo_cobertura <= 0 || tiempo_cobertura > 365) && und_tiempo_cobertura == 3){
              // if( tiempo_cobertura <= 0 && und_tiempo_cobertura == 3){
                // Cambio aplicado el 20/03/2025 - Mauro F Ramos
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 365 });
              }
              if( tiempo_cobertura != 0 && und_tiempo_cobertura == 4){
                // Cambio aplicado el 20/03/2025 - Mauro F Ramos
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 0 });
              }

              if (tiempo_cobertura % 1 !== 0) {
                let integerValue = parseInt(tiempo_cobertura);
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: integerValue });
              }
            }
            if( fieldId == 'billingschedule'){
             if(und_tiempo_cobertura == 'N.A'){
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'billingschedule', value: null, ignoreFieldChange: true });
             }
              let calendario = record.getCurrentSublistText({ sublistId: 'item', fieldId: 'billingschedule' });
              if(calendario){
                let frecuencia = _executeQuery('SELECT name, numberremaining AS repeticiones  FROM billingschedule WHERE name = ? AND numberremaining IS NOT NULL;', [calendario])
                let repeticiones = frecuencia[0].repeticiones;
                // record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: repeticiones });
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: repeticiones });
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'units', value: 50 });
              }
            }
            if( fieldId == 'custcol_ht_os_und_tiempo_cobertura'){
              // Cambio aplicado el 20/03/2025 - Mauro F Ramos
              if(record.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_und_tiempo_cobertura' }) == 2){
                record.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_tiempo_cobertura', value: 12 });
              }
            }
        } catch (error) {
            log.error("error", error)
        }
    }

    const obtenerParametrizacionItem = (items, busquedaParametro) => {
        try {
          let data = [];
          for (let i = 0; i < busquedaParametro.length; i++) {
            let filtro = [
              ["custrecord_ht_pp_parametrizacionid", "is", items],
              "AND",
              [
                "custrecord_ht_pp_parametrizacion_rela.custrecord_ht_pp_code",
                "is",
                busquedaParametro[i],
              ],
            ];
            let busqueda = search.create({
              type: "customrecord_ht_pp_main_param_prod",
              filters: filtro,
              columns: [
                search.createColumn({
                  name: "custrecord_ht_pp_parametrizacion_rela",
                  label: "Param",
                }),
                search.createColumn({
                  name: "custrecord_ht_pp_parametrizacion_valor",
                  label: "Valor",
                }),
                search.createColumn({
                  name: "custrecord_ht_pp_code",
                  join: "CUSTRECORD_HT_PP_PARAMETRIZACION_RELA",
                  label: "Código",
                }),
                search.createColumn({
                  name: "custrecord_ht_pp_codigo",
                  join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR",
                  label: "Código",
                }),
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
          if(data.length === 0){
            return [
              {
                 Param: "",
                 ParamId: "",
                 Valor: "N",
                 ValorText: "N - NO",
                 ValorId: ""
              }
           ];
          }
          return data;
        } catch (error) {
          log.error("Error", { error: error.message, stack: error.stack });
          return false;
        }
    };

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
    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged
    };

});