/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * @author Mauro F Ramos
 * @date 06/02/2025
 * @description
 *
 * @version 2.0
 * @notes - Ninguna -
 * @LastModifiedBy 06/02/2025
 */
 define(['N/log', 'N/query', 'N/search', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], (log, query, search, coberturaController) => {

  let bien;
  let producto = [];
  let canal_consulta;
  let bien_flag;
  let errores = [];

  const _post = (requestBody) => {
    try {
      bien_flag = _buscarBien(requestBody);
      canal_consulta = requestBody.ruc_canales;
      if(bien_flag){
        _buscarProducto(); // COBERTURA
        if( producto.length < 1){ // DESDE ORDEN DE SERVICIO
          _buscarProducto2();
          // VERIFICAR SI LA OS ESTA FACTURADA O SUBIDA AL DEBITO
          if( producto != undefined){
            let respuesta_os = []
            producto.forEach((item) => {
              let json = { entidad : "ES_FACTURADO", idorden: `${item.id_orden_servicio}`}
              let respuestaAPIInterna = consumirAPIInterna(json, 'POST');
              respuesta_os.push(respuestaAPIInterna.result);
            });
            log.debug("respuesta_os", respuesta_os);
            for (let index = 0; index < respuesta_os.length; index++) {
              if( respuesta_os[index] === "N"){
                producto = undefined;
              }
            }
          }
        }
      }
      _validacion(requestBody);

      let responseObject = {response: requestBody, bien, producto: producto };
      if(errores.length > 0){
        responseObject.errores = errores;
      }
      log.debug("responseObject", responseObject);
      return JSON.stringify(responseObject);
    } catch (e) {
      log.error("Error en post", e.stack);
      return JSON.stringify({
        response: requestBody,
        bien: null,
        producto: null,
      });
    }
  };

  function _buscarProducto2(){
    try {
        sqlQuery = `
        SELECT
         b.item                         AS familia_producto_id,
         v.custrecord_ht_pp_codigo      AS familia,
         v.custrecord_ht_pp_descripcion AS descripcion,
         b.item                         AS producto,
         a.trandate                     AS fecha_inicial,
         a.trandate                     AS fecha_fin,
         e.NAME                         AS estado,
         ot.custrecord_ht_ot_estado     AS codigo_estado_internal,
         a.custbody_ht_so_bien          AS codigo_bien,
         a.custbody_ht_so_bien          AS codigo_bien_internal,
         a.number                       AS os,
         ' '                            AS producto_art,
         a.id                          AS id_orden_servicio,
        FROM   TRANSACTION a
              JOIN transactionline b
                ON a.id = b.TRANSACTION
              LEFT JOIN customrecord_ht_pp_main_param_prod i
                      ON i.custrecord_ht_pp_parametrizacion_rela = 130
                        AND i.custrecord_ht_pp_parametrizacionid = b.item
              LEFT JOIN customrecord_ht_cr_pp_valores v
                      ON v.id = i.custrecord_ht_pp_parametrizacion_valor
              LEFT JOIN customrecord_ht_record_ordentrabajo ot
                      ON ot.custrecord_ht_ot_vehiculo = a.custbody_ht_so_bien
              LEFT JOIN customlist_ht_ot_estadoordentrabajo e
                      ON ot.custrecord_ht_ot_estado = e.id
        WHERE  a.customform = 142
              AND a.recordtype = 'salesorder'
              AND b.mainline = 'F'
              AND b.taxline = 'F'
              AND b.foreignamount IS NOT NULL
              AND a.custbody_ht_so_bien = ${bien.id_vehiculo}`;

        let resultSet = query.runSuiteQL({ query: sqlQuery});
        let results = resultSet.asMappedResults();

        if(results.length > 0){
            // Procesamiento de datos y eliminación de duplicados
            let uniqueResults = [];
            let descripcionesVistas = new Set();

            for (let obj of results) {
                // Limpieza de campos
                for (let key in obj) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = obj[key].replace(/\n/g, " ");
                    } else {
                        obj[key] = obj[key] === null ? "" : obj[key];
                    }
                }

                // Verificar si la descripción ya fue procesada
                if (!descripcionesVistas.has(obj.descripcion)) {
                    descripcionesVistas.add(obj.descripcion);
                    uniqueResults.push(obj);
                }
            }

            producto = uniqueResults;
        }
    } catch (error) {
        log.debug("ERROR - _buscarProducto2", error.stack);
    }
  }

  function consumirAPIInterna(json, method) {
    try {
      if (!json) { return []; }

      let respuesta = coberturaController.makeApiRequest(
        json,
        "customdeploy_hu_ec_rs_pd_orden_servicio",
        "customscript_hu_ec_rs_pd_orden_servicio",
        method,
        false
      );

      if (respuesta && (respuesta.status == "error")) {
        return [];
      } else {
        return respuesta;
      }
    } catch (error) {
      log.debug("error", error)
      return [];
    }
  }

  function _buscarBien(params) {
    try {
      let { chasis, motor, id_vehiculo, placa } = params;
      const hasValidParam =
        chasis.trim() ||
        id_vehiculo.trim() ||
        motor.trim() ||
        (placa.trim() && placa.trim().toUpperCase() !== 'S/P') ||
        cobertura.trim();

      if (!hasValidParam) {
        log.debug("Al menos un parámetro debe estar presente para realizar la búsqueda.");
      }
      sqlQuery = `
      SELECT To_char(bien.custrecord_ht_bien_propietario)         AS id_cliente,
              propietario.altname                                 AS cliente,
              bien.name                                           AS id_vehiculo,
              bien.custrecord_ht_bien_placa                       AS placa,
              marca.custrecord_ht_marca_descripcion               AS marca,
              modelo.custrecord_ht_mod_descripcion                AS modelo,
              tipo.custrecord_ht_bien_tipoterrestre_descrip       AS tipo,
              color.custrecord_ht_bn_colorcarseg_descripcion      AS color,
              bien.custrecord_ht_bien_motor                       AS motor,
              bien.custrecord_ht_bien_chasis                      AS chasis,
              To_char(custrecord_ht_bien_ano)                     AS anio,
              estado.name                                         AS estado,
              To_char(bien.custrecord_ht_bn_estadobien)           AS codigo_estado_bien
              ,
              concesionaria.custrecord_ht_cd_nombre               AS
              concesionario,
              To_char(bien.custrecord_ht_bien_consesionarios)     AS concesionario_id,
              concesionaria.custrecord_ht_cd_ruccanaldistribucion AS
              cod_concesionario_ruc,
              financiera.custrecord_ht_cd_nombre                  AS financiera,
              To_char(bien.custrecord_ht_bien_financiadovehiculo) AS financiera_id,
              financiera.custrecord_ht_cd_ruccanaldistribucion    AS cod_financiera_ruc
              ,
              aseguradora.custrecord_ht_cd_nombre                 AS
              aseguradora,
              To_char(bien.custrecord_ht_bien_companiaseguros)    aseguradora_id,
              aseguradora.custrecord_ht_cd_ruccanaldistribucion   AS
              cod_aseguradora_ruc,
              ''                                                  AS cam_prop_estado,
              ''                                                  AS estado_rei,
              convenio.custrecord_ht_cn_codigo                    AS codigo_convenio,
              To_char(bien.custrecord_ht_bien_estadoconvenio)     AS
              convenio_estado_codigo,
              bien.name                                           AS internal_id
      FROM   customrecord_ht_record_bienes bien
              left join customer propietario
                    ON bien.custrecord_ht_bien_propietario = propietario.id
              left join customrecord_ht_bien_marca marca
                    ON bien.custrecord_ht_bien_marca = marca.id
              left join customrecord_ht_bn_modelo modelo
                    ON bien.custrecord_ht_bien_modelo = modelo.id
              left join customrecord_ht_record_canaldistribucion concesionaria
                    ON bien.custrecord_ht_bien_consesionarios = concesionaria.id
              left join customrecord_ht_record_canaldistribucion financiera
                    ON bien.custrecord_ht_bien_financiadovehiculo = financiera.id
              left join customrecord_ht_record_canaldistribucion aseguradora
                    ON bien.custrecord_ht_bien_companiaseguros = aseguradora.id
              left join customrecord_ht_bn_colorcarseg color
                    ON bien.custrecord_ht_bien_colorcarseg = color.id
              left join customrecord_ht_bien_tipoterrestre tipo
                    ON bien.custrecord_ht_bien_tipoterrestre = tipo.id
              left join customlist_ht__lista_bn_estadobien estado
                    ON bien.custrecord_ht_bn_estadobien = estado.id
              left join customrecord_ht_record_convenio convenio
                    ON bien.custrecord_ht_bien_conveniovehiculo = convenio.id`;

      let conditions = [];

      if (chasis.trim()) {
          conditions.push(`custrecord_ht_bien_chasis = '${chasis.trim()}'`);
      }
      if (id_vehiculo.trim()) {
          conditions.push(`bien.id = ${id_vehiculo.trim()}`);
      }
      if (motor.trim()) {
          conditions.push(`custrecord_ht_bien_motor = '${motor.trim()}'`);
      }
      if (placa.trim() && placa.trim().toUpperCase() !== 'S/P') {
          conditions.push(`custrecord_ht_bien_placa = '${placa.trim()}'`);
      }

      if (conditions.length > 0) {
        sqlQuery = `${sqlQuery} WHERE ${conditions.join(" AND ")}`;
        let resultSet = query.runSuiteQL({ query: sqlQuery});

        let results = resultSet.asMappedResults();

        if(results.length > 0){
          for (let obj of results) {
            for (let key in obj) {
              if (typeof obj[key] === 'string') {
                obj[key] = obj[key].replace(/\n/g, " ");
              } else {
                obj[key] = obj[key] === null ? "" : obj[key];
              }
            }
          }
          bien = results[0];
          return true;
        }else{
          return false;
        }
      }
    } catch (error) {
      log.debug("ERROR - _buscarBien", error.stack);
    }
  }

  function _buscarProducto() {
    try {
      sqlQuery = `
      SELECT    To_char(cobertura.custrecord_ht_co_familia_prod) AS familia_producto_id,
                parametros.custrecord_ht_pp_codigo               AS familia,
                parametros.custrecord_ht_pp_descripcion          AS descripcion,
                To_char(cobertura.custrecord_ht_co_familia_prod) AS producto,
                cobertura.custrecord_ht_co_coberturainicial      AS fecha_inicial,
                cobertura.custrecord_ht_co_coberturafinal        AS fecha_fin,
                estado.NAME                                      AS estado,
                To_char(cobertura.custrecord_ht_co_estado)       AS codigo_estado_internal,
                To_char(cobertura.custrecord_ht_co_bien)         AS codigo_bien,
                To_char(cobertura.custrecord_ht_co_bien)         AS codigo_bien_internal,
                To_char(custrecord_ht_co_producto)               AS producto_art
      FROM      customrecord_ht_co_cobertura cobertura
      LEFT JOIN customrecord_ht_cr_pp_valores parametros
      ON        cobertura.custrecord_ht_co_familia_prod = parametros.id
      LEFT JOIN customlist_ht_mc_estado estado
      ON        cobertura.custrecord_ht_co_estado = estado.id
      WHERE     custrecord_ht_co_bien = ${bien.id_vehiculo}`;
      let resultSet = query.runSuiteQL({ query: sqlQuery});
      let results = resultSet.asMappedResults();
      if(results.length > 0){
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
      }
      if(results.length > 0){
        results.forEach((item) => {
          let prod = obtenerParametrizacionItem(item.producto_art, ["FAM", "ADP"]);
          if(prod.length > 0){
            if(prod[1].Valor == "001" && item.estado !== ""){
              producto.push(item);
            }
          }
        });
      }
    } catch (error) {
      log.error("ERROR - _buscarProducto", error.stack);
    }
  }

  function _validacion(requestBody) {
    try {
      if(bien_flag){
        if(bien.convenio_estado_codigo.trim().length === 0 ){
          errores.push({ codigo_error: "001", mensaje: "El estado del convenio no esta definido"});
        }
        if(producto === undefined){
          errores.push({ codigo_error: "002", mensaje: "El vehículo no cuenta con productos instalados."});
        }
        if(bien.codigo_estado_bien !== "11"){
          errores.push({ codigo_error: "004", mensaje: "El vehículo está inactivo en el sistema." });
        }

        if(canal_consulta.trim().length > 1 || requestBody.user_certificado.trim().length > 0){
          let canales_configurados = _filtrarTipoCanal(canal_consulta);
          let match = [];
          if(requestBody.user_certificado.trim() == 'N'){
            // valido si tengo canales configurados
            if(canales_configurados?.length > 0 ){
              canales_configurados.forEach( canal => {
                switch (canal.tipo) {
                  case 1: // ? ASEGURADORA
                    match.push({id: `bien: ${bien.aseguradora_id} - canal: ${canal.id}`, flag: bien.aseguradora_id === canal.id, tipo_canal: canal.tipo});
                    if(bien.aseguradora_id !== canal.id){
                      errores.push({ codigo_error: "014", mensaje: "El vehículo existe en el sistema, pero está asociado a otra Aseguradora." });
                    }
                    break;
                  case 2: // ? CONCESIONARIO
                    match.push({id: `bien: ${bien.concesionario_id} - canal: ${canal.id}`, flag: bien.concesionario_id === canal.id, tipo_canal: canal.tipo});
                    if(bien.concesionario_id !== canal.id){
                      errores.push({ codigo_error: "007", mensaje:"El vehículo existe en el sistema, pero está asociado a otro Concesionario." });
                    }
                    break;
                  case 3: // ? FINANCIERA
                    match.push({id: `bien: ${bien.financiera_id} - canal: ${canal.id}`, flag: bien.financiera_id === canal.id, tipo_canal: canal.tipo});
                    if(bien.financiera_id !== canal.id){
                      if( canal.id == '1402' && bien.codigo_convenio == '026' ){
                        // 1402 1791251237001 CONSORCIO ECUATORIANO DE TELECOMUNICACIONES S.A. C
                        // HT Convenio CONVENIO CONECEL  -  HT CN CÓDIGO 026
                        match.push({id: `bien: ${bien.financiera_id} - convenio: 1402`, flag: canal.id === "1402", tipo_canal: '030'});
                      }else{
                        break;
                      }
                      errores.push({ codigo_error: '013', mensaje: "El vehículo existe en el sistema, pero está asociado a otra Financiera"});
                    }
                    break;
                  default:
                      errores.push({ codigo_error: "017", mensaje: "No se ha configurado un canal en tu cuenta." });
                    break;
                }
              });
              log.debug("MATCH" , match);
              if (match.some((canal) => canal.flag === true)) {
                errores = errores.filter((e) => e.codigo_error !== "007");
                errores = errores.filter((e) => e.codigo_error !== "013");
                errores = errores.filter((e) => e.codigo_error !== "014");
                errores = errores.filter((e) => e.codigo_error !== "016");
                errores = errores.filter((e) => e.codigo_error !== "017");
              }

              if( producto != undefined){
                if(producto.length > 1){
                  if( bien.concesionario_id == "510"){ // CASABACA S.A.
                    producto = producto.filter((e) => e.familia == "HT");
                  }
                  if( bien.concesionario_id == "708"){ // MAQUINARIAS Y VEHICULOS S.A. MAVESA
                    producto = producto.filter((e) => e.familia == "CM");
                  }
                }
              }

            }else{
              errores.push({ codigo_error: "017", mensaje: "No se ha configurado un canal en tu cuenta." });
            }
          }
        }
      }else{
        errores.push({ codigo_error: "003", mensaje: "Este vehículo no está registrado en el sistema. Por favor, verifica la información ingresada"});
      }
      errores = errores.filter((error, index, self) => index === self.findIndex(e => e.codigo_error === error.codigo_error));
    } catch (error) {
      log.error("ERROR _validacion", error.stack);
    }
  }

  const _filtrarTipoCanal = (canales) => {
    try {
      let valores = canales.split("; ").filter(Boolean);
      if (valores.length === 0) return [];
      let sqlQuery = `
        SELECT
          REPLACE(COALESCE(name, ''), '\n', ' ') AS nombre,
          TO_CHAR(id) as id,
          custrecord_ht_cd_tipocanal AS tipo,
        FROM customrecord_ht_record_canaldistribucion
        WHERE custrecord_ht_cd_ruccanaldistribucion IN (${valores
          .map((valor) => `'${valor}'`)
          .join(", ")})
        AND custrecord_ht_cd_tipocanal IN (1,2,3)
      `;
      let result = query.runSuiteQL({ query: sqlQuery });
      return result.asMappedResults() || [];
    } catch (error) {
      log.error("Error _filtrarTipoCanal", error.stack);
      return [];
    }
  };

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

  return {
    post: _post,
  };
  });
