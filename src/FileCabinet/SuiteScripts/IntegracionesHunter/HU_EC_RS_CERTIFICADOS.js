/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 *
 * @author Mauro F Ramos
 * @date 06/02/2025
 * @description Generación de Certificados Venta - Instalación (NETSUITE - SAC)
 *
 * @version 2.0
 * @notes - _hu_ec_rs_certificados
 * @LastModifiedBy 26/03/2025
 */
define(["N/log", "N/query", 'SuiteScripts/IntegracionesHunter/Plantillas/Libreria.js'], (log, query, eigl) => {
  let bien;
  let producto;
  let servicios;

  let errores_sms = [];
  let responseObject = {};
  let certificado;
  const _post = (requestBody) => {
    try {
      bien_flag = _buscarBien(requestBody);
      if(bien_flag){
        certificado = requestBody.certificado;
        getConsultaCodigo(requestBody.cobertura);
        getServicios(requestBody);
        // let x = eigl.ExtraerImpactoGL("transaction",1754738);
        // log.debug("x",x)
        log.debug("requestBody", requestBody);
      }

      responseObject.bien = bien;
      responseObject.producto = producto;
      responseObject.servicios = servicios;

      log.debug("responseObject", responseObject);
      return JSON.stringify(responseObject);
    } catch (error) {
      log.debug("Error en _buscarBien", error.stack);
    }
  };

  function _buscarBien(params) {
    try {
      // let { chasis, motor, id_vehiculo, placa } = params;
      let { id_vehiculo } = params;
      const hasValidParam =
        // chasis.trim() ||
        id_vehiculo.trim() //||
        // motor.trim() ||
        // (placa.trim() && placa.trim().toUpperCase() !== 'S/P') ||
        // cobertura.trim();
        ;

      if (!hasValidParam) {
        log.debug("Al menos un parámetro debe estar presente para realizar la búsqueda.");
      }

      let sqlQuery = `
      SELECT To_char(bien.custrecord_ht_bien_propietario)         AS id_cliente,
              propietario.altname                                 AS cliente,
              NVL(bien.custrecord_ht_bien_codsysh , bien.name)    AS id_vehiculo,
              bien.custrecord_ht_bien_placa                       AS placa,
              marca.custrecord_ht_marca_descripcion               AS marca,
              modelo.custrecord_ht_mod_descripcion                AS modelo,
              tvehiculo.custrecord_ht_tv_descripcion       AS tipo,
              color.custrecord_ht_bn_colorcarseg_descripcion      AS color,
              bien.custrecord_ht_bien_motor                       AS motor,
              bien.custrecord_ht_bien_chasis                      AS chasis,
              To_char(custrecord_ht_bien_ano)                     AS anio,
              estado.name                                         AS estado,
              To_char(bien.custrecord_ht_bn_estadobien)           AS codigo_estado_bien,
              concesionaria.custrecord_ht_cd_nombre               AS concesionario,
              To_char(bien.custrecord_ht_bien_consesionarios)     AS concesionario_id,
              concesionaria.custrecord_ht_cd_ruccanaldistribucion AS
              cod_concesionario_ruc,
              financiera.custrecord_ht_cd_nombre                  AS financiera,
              To_char(bien.custrecord_ht_bien_financiadovehiculo) AS financiera_id,
              financiera.custrecord_ht_cd_ruccanaldistribucion    AS cod_financiera_ruc,
              aseguradora.custrecord_ht_cd_nombre                 AS aseguradora,
              To_char(bien.custrecord_ht_bien_companiaseguros)    AS aseguradora_id,
              aseguradora.custrecord_ht_cd_ruccanaldistribucion   AS cod_aseguradora_ruc,
              ''                                                  AS cam_prop_estado,
              ''                                                  AS estado_rei,
              convenio.custrecord_ht_cn_codigo                    AS codigo_convenio,
              To_char(bien.custrecord_ht_bien_estadoconvenio)     AS convenio_estado_codigo,
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
                    ON bien.custrecord_ht_bien_conveniovehiculo = convenio.id
              left join customrecord_ht_record_tipovehiculo tvehiculo
                    ON bien.custrecord_ht_bien_tipo = tvehiculo.id `;

      let conditions = [];

      // if (chasis.trim()) {
      //     conditions.push(`custrecord_ht_bien_chasis = '${chasis.trim()}'`);
      // }
      if (id_vehiculo.trim()) {
          conditions.push(`bien.id = ${id_vehiculo.trim()}`);
      }
      // if (motor.trim()) {
      //     conditions.push(`custrecord_ht_bien_motor = '${motor.trim()}'`);
      // }
      // if (placa.trim() && placa.trim().toUpperCase() !== 'S/P') {
      //     conditions.push(`custrecord_ht_bien_placa = '${placa.trim()}'`);
      // }

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


  const getConsultaCodigo = (codigo) => {
    try {
      let sqlQuery;
      if (/^\d+$/.test(codigo) || certificado == "I") {
        // CERTIFICADO DE INSTALACION
        sqlQuery = `
        SELECT To_char(cobertura.custrecord_ht_co_familia_prod)   AS familia_producto_id,
              codigo.custrecord_ht_pp_codigo                     AS familia,
              codigo.custrecord_ht_pp_descripcion                AS descripcion,
              To_char(cobertura.custrecord_ht_co_familia_prod)   AS producto,
              cobertura.custrecord_ht_co_coberturainicial        AS fecha_inicial,
              cobertura.custrecord_ht_co_coberturafinal          AS fecha_fin,
              e.NAME                                             AS estado,
              To_char(e.id)                                      AS codigo_estado_internal,
              To_char(cobertura.custrecord_ht_co_bien)           AS codigo_bien,
              To_char(cobertura.custrecord_ht_co_bien)           AS codigo_bien_internal,
              To_char(custrecord_ht_co_estado_cobertura)         AS estado_cobertura_value,
              ec.NAME                                            AS estado_cobertura_text
        FROM   customrecord_ht_co_cobertura cobertura
        JOIN   customrecord_ht_cr_pp_valores codigo
        ON     codigo.id= cobertura.custrecord_ht_co_familia_prod
        JOIN   customlist_ht_mc_estado e
        ON     e.id = cobertura.custrecord_ht_co_estado
        JOIN   customlist_ht_estado_cobertura ec
        ON     ec.id = cobertura.custrecord_ht_co_estado_cobertura
        WHERE  cobertura.id = ${codigo}`;
      }
      else if (certificado == "C") {
        // CERTIFICADO DE VENTA
        sqlQuery = `
        SELECT  id                     AS familia_producto_id,
                custrecord_ht_pp_codigo                      AS familia,
                custrecord_ht_pp_descripcion                      AS descripcion,
                id                      AS producto,
                '01/01/2025'                      AS fecha_inicial,
                '01/01/2025'                      AS fecha_fin,
                '001 - INSTALADO'                      AS estado,
                '1'                      AS codigo_estado_internal,
                ' '                      AS codigo_bien,
                ' '                      AS codigo_bien_internal,
                '1'                      AS estado_cobertura_value,
                'ACTIVO'                      AS estado_cobertura_text
                FROM   customrecord_ht_cr_pp_valores
        WHERE  name = '${codigo}'`;
      }
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
        producto = results;
      }
    } catch (e) {
      log.error("Error en getConsultaCodigo", e);
      return [];
    }
  };

  const getServicios = (params) => {
    try {
      let { id_vehiculo } = params;
      let sqlQuery = `
      SELECT custrecord_ns_servicio AS id_servicio
      FROM customrecord_ht_nc_servicios_instalados
      WHERE custrecord_ns_bien_si = 987737 --${id_vehiculo}`;

      let resultSet = query.runSuiteQL({ query: sqlQuery });
      let results = resultSet.asMappedResults();

      let allServiceIds = [];

      if (results.length > 0) {
        for (let obj of results) {
          if (obj.id_servicio) {
            const ids = obj.id_servicio.split(',').map(id => parseInt(id.trim()));
            allServiceIds.push(...ids);
          }
        }

        if (allServiceIds.length > 0) {
          let idsString = allServiceIds.join(',');
          let nameQuery = `
          SELECT name AS servicio
          FROM customrecord_ht_servicios
          WHERE id IN (${idsString})`;

          let nameResultSet = query.runSuiteQL({ query: nameQuery });
          let nameResults = nameResultSet.asMappedResults();
          nameResults = nameResults.map(obj => `• ${obj.servicio}`);
          servicios = nameResults;
        }
      }else{
        servicios = [" "]
      }
    } catch (e) {
        log.error("Error en getConsultaCodigo", e);
        return [];
    }
  };

  return {
    post: _post,
  };
});