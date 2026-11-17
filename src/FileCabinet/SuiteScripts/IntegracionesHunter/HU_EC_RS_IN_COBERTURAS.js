/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define([
  'N/log',
  'N/search',
  'N/query',
  'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController',
  'N/record',
  "SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES",
  "SuiteScripts/TS NET Scripts/Main/controller/TS_CM_Controller",
  "SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant",
  'N/file'
], function (log, search, query, coberturaController, record, _const, _controller, _constant, file) {
  var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC;
  const folderRequest = 24651   // SB: 28733 - PR: 24651
  const folderResponse = 24652  // SB: 28734 - PR: 24652

  function _get(context) {

    try {
      let ResultadoConsulta = null;
      let OpcionConsulta = context.opcion;
      let CodVehiculo = '';
      let CodCliente = '';
      let IdCliente = 0;
      let IdVehiculo = 0;
      let IdProducto = 0;
      let CodProducto = '';
      let FechaIni = '';
      let FechaFin = '';
      // let Criterio = context.criterio;
      let IdEstDisp = 0;

      if (typeof context.codigovehiculo != 'undefined') {
        if (context.codigovehiculo.length != 0) {
          CodVehiculo = context.codigovehiculo;
        }
      }

      if (typeof context.codigocliente != 'undefined') {
        if (context.codigocliente.length != 0) {
          CodCliente = context.codigocliente;
        }
      }

      if (typeof context.idcliente != 'undefined') {
        if (context.idcliente.length != 0) {
          IdCliente = context.idcliente;
        }
      }

      if (typeof context.idvehiculo != 'undefined') {
        if (context.idvehiculo.length != 0) {
          IdVehiculo = context.idvehiculo;
        }
      }

      if (typeof context.idgrupoproducto != 'undefined') {
        if (context.idgrupoproducto.length != 0) {
          IdProducto = context.idgrupoproducto;
        }
      }

      if (typeof context.codgrupoproducto != 'undefined') {
        if (context.codgrupoproducto.length != 0) {
          CodProducto = context.codgrupoproducto;
        }
      }

      if (typeof context.fechaini != 'undefined') {
        if (context.fechaini.length != 0) {
          FechaIni = context.fechaini;
        }
      }

      if (typeof context.fechafin != 'undefined') {
        if (context.fechafin.length != 0) {
          FechaFin = context.fechafin;
        }
      }

      if (typeof context.idestadodispositivo != 'undefined') {
        if (context.idestadodispositivo.length != 0) {
          IdEstDisp = context.idestadodispositivo;
        }
      }

      switch (OpcionConsulta) {
        case "100":
          // log.debug("Respuesta Post Insert.........dddd............", "...........aa.............");
          ResultadoConsulta = ConsultaCobertura(CodVehiculo, IdVehiculo, IdProducto, CodProducto, CodCliente, IdCliente, FechaIni, FechaFin, IdEstDisp);
          // log.debug("Respuesta Post Insert.........dddd............", ResultadoConsulta);
          break;
        case "101":
          ResultadoConsulta = ConsultaVehCobertura(CodVehiculo, IdVehiculo, IdProducto, CodProducto, CodCliente, IdCliente, FechaIni, FechaFin, '');
          break;
        case "200":
          ResultadoConsulta = ConsultaPrueba();
          break;
        default:
          return 'id:400, opcion no valida.';
      }

      return ResultadoConsulta;

    } catch (error) {
      log.error('error', error);
      return 'id:400, No se encontraron resultados.';
    }
  }

  function ConsultaPrueba() {
    let Busqueda = search.create({
      type: 'customrecord_ht_co_cobertura',
      columns: [
        search.createColumn({ name: "internalid", label: "ID" }),
        search.createColumn({ name: "name", label: "ID" }),
        search.createColumn({ name: "custrecord_ht_co_propietario", label: "HT CO Propietario" }),
        search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Id Producto" })
      ]
    });

    let BusquedaNumReg = Busqueda.runPaged().count;
    let ResConsulta = Busqueda.run().getRange({ start: 0, end: BusquedaNumReg });

    return ResConsulta;

  }

  function ConsultaVehCobertura(NsVehiculo, NsidVeh, IdProducto, CodProducto, codCliente, idCliente, FechaIni, FechaFin, NsCriterio) {
    try {
      log.debug("Respuesta Post Insert.....................", "...........xxxxx.............");
      let Resultado = [];
      let condicion = '';

      let NumInstaladosVeh = 0;
      let NumInstaladosCli = 0;

      if (((NsVehiculo == 0) || (NsVehiculo == '')) &&
        ((NsidVeh == 0) || (NsidVeh == '')) &&
        ((IdProducto == 0) || (IdProducto == '')) &&
        ((CodProducto == 0) || (CodProducto == '')) &&
        ((codCliente == 0) || (codCliente == '')) &&
        ((idCliente == 0) || (idCliente == '')) &&
        ((FechaIni == 0) || (FechaIni == '')) &&
        ((FechaFin == 0) || (FechaFin == '')) &&
        (NsCriterio == '')) {
        return 'id:400, Ingrese filtro de consulta.';
      }

      condicion = '';

      if ((NsidVeh != 0) && (NsidVeh != '')) {
        condicion = condicion + ' and piv.custrecord_ht_co_bien = ' + NsidVeh;
      }

      if ((NsVehiculo != 0) && (NsVehiculo != '')) {
        condicion = condicion + ` and aut.name = '` + NsVehiculo + `'`;
      }

      if ((idCliente != 0) && (idCliente != '')) {
        condicion = condicion + ' and cli.id = ' + idCliente;
      }

      if ((codCliente != 0) && (codCliente != '')) {
        condicion = condicion + ` and cli.entityid = '` + codCliente + `'`;
      }

      if (IdProducto != '') {
        condicion = condicion + ' and piv.custrecord_ht_co_familia_prod = ' + IdProducto
      }

      if (CodProducto != '') {
        condicion = condicion + ` and prod.custrecord_ht_pp_codigo = '` + CodProducto + `'`;
      }

      if ((FechaIni != '') && (FechaFin != '')) {
        condicion = condicion + ` and piv.custrecord_ht_co_coberturafinal between '` + FechaIni + `' and '` + FechaFin`'`;
      }

      log.debug("condicion", condicion);

      let RutaImagenProd = 'http://10.100.107.14/cotizadorweb/images/listaproductos/Fichas%20Productos-';

      let Q_Consulta = query.runSuiteQL({
        query: `SELECT  nvl(piv.name,'') IdCobertura, piv.id CodCobertura, aut.id IdVehiculo, 
                              aut.name Vehiculo, cli.entityid Identificacion, cli.id IdCliente, cli.entitytitle Cliente, 
                              piv.custrecord_ht_co_coberturainicial CoberturaInicial, piv.custrecord_ht_co_coberturafinal CoberturaFinal, 
                              piv.custrecord_ht_co_estado_cobertura IdEstado, 
                              (select est.name 
                                  from CUSTOMLIST_HT_ESTADO_COBERTURA est 
                                  where est.id = piv.custrecord_ht_co_estado_cobertura) Estado,
                              piv.custrecord_ht_co_familia_prod IdGrupoProducto,  
                              prod.custrecord_ht_pp_codigo CodGrupoProducto,
                              prod.custrecord_ht_pp_descripcion GrupoProducto,  nvl(piv.custrecord_ht_co_numerodispositivo,'') Dispositivo, 
                              piv.custrecord_ht_co_estado IdEstadoDispositivo, 
                              (select edi.name 
                                  from CUSTOMLIST_HT_MC_ESTADO edi 
                                  where edi.id = piv.custrecord_ht_co_estado) EstadoDispositivo, 
                              cli.salesrep IdEjecutivo, 
                              (select concat(concat(nvl(ee.firstname ,''), ' '), nvl(ee.lastname,''))  
                                  from employee ee where ee.id = cli.salesrep) Ejecutivo,
                              aut.custrecord_ht_bien_chasis Chasis, 
                              aut.custrecord_ht_bien_motor Motor,
                              aut.custrecord_ht_bien_placa Placa,
                              (select mar.name from customrecord_ht_bien_marca mar where mar.id = aut.custrecord_ht_bien_marca) Marca,
                              (select mda.custrecord_ht_mod_descripcion from customrecord_ht_bn_modelo mda where mda.custrecord_ht_mb_marca = aut.custrecord_ht_bien_marca and mda.id = aut.custrecord_ht_bien_modelo) Modelo,
                              concat(concat(concat(concat(concat(aut.custrecord_ht_bien_chasis,' '), concat(aut.custrecord_ht_bien_motor,' ')), concat(aut.custrecord_ht_bien_placa,' ')) , concat((select mar.name from customrecord_ht_bien_marca mar where mar.id = aut.custrecord_ht_bien_marca), ' ')), (select mda.custrecord_ht_mod_descripcion from customrecord_ht_bn_modelo mda where mda.custrecord_ht_mb_marca = aut.custrecord_ht_bien_marca and mda.id = aut.custrecord_ht_bien_modelo)) CadenaCriterio,
                              (select ces.name 
                                  from CUSTOMLIST_HT_LISTA_ESTADOCONVENIO ces 
                                  where ces.id = aut.custrecord_ht_bien_estadoconvenio) EstadoConvenio, 
                              (select cnv.name 
                                  from customrecord_ht_record_convenio cnv 
                                  where cnv.id = aut.custrecord_ht_bien_conveniovehiculo) Convenio,
                              case 
                                  when prod.custrecord_ht_pp_codigo = 'BR' then '14'
                                  when prod.custrecord_ht_pp_codigo = 'BS' then '15'
                                  when prod.custrecord_ht_pp_codigo = 'CC' then '06'
                                  when prod.custrecord_ht_pp_codigo = 'CM' then '05'
                                  when prod.custrecord_ht_pp_codigo = 'HH' then '16'
                                  when prod.custrecord_ht_pp_codigo = 'HP' then '04'
                                  when prod.custrecord_ht_pp_codigo = 'HU' then '01'
                                  when prod.custrecord_ht_pp_codigo = 'HX' then '20'
                                  when prod.custrecord_ht_pp_codigo = 'KM' then '02'
                                  when prod.custrecord_ht_pp_codigo = 'PC' then '08'
                                  when prod.custrecord_ht_pp_codigo = 'SA' then '23'
                                  when prod.custrecord_ht_pp_codigo = 'SG' then '24'
                                  when prod.custrecord_ht_pp_codigo = 'CH' then '31'
                                  else '00' 
                              end codRutaImagenProd
                      from customrecord_ht_record_bienes aut 
                      inner join customer cli 
                          on aut.custrecord_ht_bien_propietario = cli.id 
                      left join customrecord_ht_co_cobertura piv 
                          on piv.custrecord_ht_co_bien = aut.id 
                      left join customrecord_ht_cr_pp_valores prod 
                          on prod.id = piv.custrecord_ht_co_familia_prod
                      where   1=1
                      ${condicion} `,
      });

      let ResultadoConsulta = Q_Consulta.asMappedResults(); //TipoCanalQuery.a${})MappedResults();

      if (NsCriterio !== "") {
        ResultadoConsulta = ResultadoConsulta.filter(item => item?.cadenacriterio?.includes(NsCriterio));
      }

      log.debug("Respuesta Post Insert.....................", "........................");
      if (ResultadoConsulta.length == 0) {
        Resultado.push({
          IdCobertura: '',
          CodCobertura: '',
          IdVehiculo: '',
          Vehiculo: '',
          Identificacion: '',
          IdCliente: '',
          Cliente: '',
          CoberturaInicial: '',
          CoberturaFinal: '',
          IdEstado: '',
          Estado: '',
          IdGrupoProducto: '',
          CodGrupoProducto: '',
          GrupoProducto: '',
          Dispositivo: '',
          IdEstadoDispositivo: '',
          EstadoDispositivo: '',
          IdEjecutivo: '',
          Ejecutivo: '',
          CadenaCriterio: '',
          DispositivosInstaladosVehiculo: 0,
          DispositivosInstaladosCliente: 0,
          ProductoLink: '',
          ProductoNombre: '',
          GrupoNombre: '',
          EstadoConvenio: '',
          Convenio: ''
        });
      }
      else {


        for (let i in ResultadoConsulta) {
          NumInstaladosVeh = 0;
          let InstaladosVeh = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
              ["custrecord_ht_co_bien", "is", ResultadoConsulta[i].idvehiculo], "AND",
              ["custrecord_ht_co_estado", "is", 1]
            ],
            columns: [
              search.createColumn({ name: "custrecord_ht_co_bien", label: "IdVehiculo" })
            ]
          });

          NumInstaladosVeh = InstaladosVeh.runPaged().count;

          NumInstaladosCli = 0;
          let InstaladosCli = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
              ["custrecord_ht_co_propietario", "is", ResultadoConsulta[i].idcliente], "AND",
              ["custrecord_ht_co_estado", "is", 1]
            ],
            columns: [
              search.createColumn({ name: "custrecord_ht_co_bien", label: "IdVehiculo" })
            ]
          });

          NumInstaladosCli = InstaladosCli.runPaged().count;

          Resultado.push({
            IdCobertura: ResultadoConsulta[i].idcobertura,
            CodCobertura: ResultadoConsulta[i].codcobertura,
            IdVehiculo: ResultadoConsulta[i].idvehiculo,
            Vehiculo: ResultadoConsulta[i].vehiculo,
            Identificacion: ResultadoConsulta[i].identificacion,
            IdCliente: ResultadoConsulta[i].idcliente,
            Cliente: ResultadoConsulta[i].cliente,
            CoberturaInicial: ResultadoConsulta[i].coberturainicial,
            CoberturaFinal: ResultadoConsulta[i].coberturafinal,
            IdEstado: ResultadoConsulta[i].idestado,
            Estado: ResultadoConsulta[i].estado,
            IdGrupoProducto: ResultadoConsulta[i].idgrupoproducto,
            CodGrupoProducto: ResultadoConsulta[i].codgrupoproducto,
            GrupoProducto: ResultadoConsulta[i].grupoproducto,
            Dispositivo: ResultadoConsulta[i].dispositivo,
            IdEstadoDispositivo: ResultadoConsulta[i].idestadodispositivo,
            EstadoDispositivo: ResultadoConsulta[i].estadodispositivo,
            IdEjecutivo: ResultadoConsulta[i].idejecutivo,
            Ejecutivo: ResultadoConsulta[i].ejecutivo,
            CadenaCriterio: (ResultadoConsulta[i].chasis + ' ' + ResultadoConsulta[i].motor + ' ' + ResultadoConsulta[i].placa + ' ' + ResultadoConsulta[i].marca + ' ' + ResultadoConsulta[i].modelo),
            DispositivosInstaladosVehiculo: NumInstaladosVeh,
            DispositivosInstaladosCliente: NumInstaladosCli,
            ProductoLink: RutaImagenProd + ResultadoConsulta[i].codrutaimagenprod + '.jpg',
            ProductoNombre: '<b>' + ResultadoConsulta[i].grupoproducto + '</b>  <br />' + ResultadoConsulta[i].coberturafinal + ' <b>/</b> ' + ResultadoConsulta[i].estado,
            GrupoNombre: (ResultadoConsulta[i].marca + ' / ' + ResultadoConsulta[i].modelo + ' / ' + ResultadoConsulta[i].placa),
            EstadoConvenio: ResultadoConsulta[i].estadoconvenio,
            Convenio: ResultadoConsulta[i].convenio
          });

        }
      }
      return Resultado;
    }
    catch (error) {
      log.error('error', error);
      return 'id:400, No se encontraron resultados. (ConsultaVehCobertura)';
    }
  }

  function ConsultaCobertura(NsVehiculo, NsidVeh, IdProducto, CodProducto, codCliente, idCliente, FechaIni, FechaFin, IdEstadoDisp) {
    try {
      if (((NsVehiculo == 0) || (NsVehiculo == '')) &&
        ((NsidVeh == 0) || (NsidVeh == '')) &&
        ((IdProducto == 0) || (IdProducto == '')) &&
        ((CodProducto == 0) || (CodProducto == '')) &&
        ((codCliente == 0) || (codCliente == '')) &&
        ((idCliente == 0) || (idCliente == '')) &&
        ((FechaIni == 0) || (FechaIni == '')) &&
        ((FechaFin == 0) || (FechaFin == '')) &&
        ((IdEstadoDisp == 0) || (IdEstadoDisp == ''))) {

        return 'id:400, Ingrese filtro de consulta.';
      }

      let Resultado = [];
      let Busqueda = search.create({
        type: 'customrecord_ht_co_cobertura',
        filters:
          [
            ["custrecord_ht_co_bien.custrecord_bn_subsidiaria", "anyof", GlobalSubsidiaria],
            "AND",
            ["isinactive", "is", "F"],
            "AND",
            ["internalid", "noneof", "@NONE@"], "AND", ["custrecord_ht_co_propietario", "noneof", "@NONE@"]
            /* ["formulatext: CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_co_bien.custrecord_ht_bien_chasis},{custrecord_ht_co_bien.custrecord_ht_bien_motor}),{custrecord_ht_co_bien.custrecord_ht_bien_placa}),{custrecord_ht_co_bien.custrecord_ht_bien_marca}),{custrecord_ht_co_bien.custrecord_ht_bien_modelo})","contains",NsCriterio] */

          ],
        columns: [
          search.createColumn({ name: "internalid", label: "ID" }),
          search.createColumn({ name: "name", label: "ID" }),
          search.createColumn({ name: "custrecord_ht_co_bien", label: "HT CO Bien" }),

          //search.createColumn({name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "ID"}),
          search.createColumn({ name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "Cedula/RUC" }),
          search.createColumn({ name: "custrecord_ht_co_propietario", label: "HT CO Propietario" }),
          search.createColumn({ name: "custrecord_ht_co_familia_prod", label: "Id Producto" }),
          search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CO_FAMILIA_PROD", label: "CÃ³digo" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_CO_FAMILIA_PROD", label: "Producto" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial", label: "HT CO Cobertura inicial" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal", label: "HT CO Cobertura final" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_estadocartera", label: "HT CO Estado Cartera" }),
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo", label: "HT CO NÃºmero serie Dispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto", label: "HT CO NÃºmero serie Producto" }),
          search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "ID Cliente" }),
          search.createColumn({ name: "entityid", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "ID" }),
          search.createColumn({ name: "custrecord_ht_co_codigoactivacion", label: "HT CÃ³digo de activaciÃ³n Lojack" }),
          search.createColumn({ name: "custrecord_ht_co_estado", label: "HT Estado Lojack" }),
          search.createColumn({ name: "custrecord_ht_co_seriedispolojack", label: "HT Serie Dispositivo Lojack" }),
          search.createColumn({ name: "salesrep", join: "CUSTRECORD_HT_CO_PROPIETARIO", label: "Representante de ventas" }),
          search.createColumn({ name: "custrecord_ht_bien_chasis", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_motor", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_placa", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_marca", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_modelo", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_estadoconvenio", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_conveniovehiculo", join: "custrecord_ht_co_bien" }),
          /* 
           search.createColumn({
               name: "formulatext",
               formula: "TO_CHAR({created}, 'DD-MON-YYYY')",
               label: "Mes"
           })*/

          /*  search.createColumn({
                name: "formulatext",
                //formula: "CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_co_bien.custrecord_ht_bien_chasis},{custrecord_ht_co_bien.custrecord_ht_bien_motor}),{custrecord_ht_co_bien.custrecord_ht_bien_placa}),{custrecord_ht_co_bien.custrecord_ht_bien_marca}),{custrecord_ht_co_bien.custrecord_ht_bien_modelo})",
                formula: {custrecord_ht_co_bien.custrecord_ht_bien_chasis},{custrecord_ht_co_bien.custrecord_ht_bien_motor}),{custrecord_ht_co_bien.custrecord_ht_bien_placa}),{custrecord_ht_co_bien.custrecord_ht_bien_marca}),{custrecord_ht_co_bien.custrecord_ht_bien_modelo};
                label: "CRITERIO"
            }) */
        ]
      });

      if ((NsidVeh != 0) && (NsidVeh != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_co_bien',
          operator: search.Operator.ANYOF,
          values: NsidVeh
        }));
      }

      if ((NsVehiculo != 0) && (NsVehiculo != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'idtext',
          join: 'CUSTRECORD_HT_CO_BIEN',
          operator: search.Operator.IS,
          values: NsVehiculo
        }));
      }

      if ((IdEstadoDisp != 0) && (IdEstadoDisp != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_co_estado',
          operator: search.Operator.IS,
          values: IdEstadoDisp
        }));
      }

      if ((idCliente != 0) && (idCliente != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_co_propietario',
          operator: search.Operator.IS,
          values: idCliente
        }));
      }

      if ((codCliente != 0) && (codCliente != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'entityid',
          join: 'CUSTRECORD_HT_CO_PROPIETARIO',
          operator: search.Operator.IS,
          values: codCliente
        }));
      }

      if (IdProducto != '') {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_co_familia_prod',
          operator: search.Operator.IS,
          values: IdProducto
        }));
      }

      if (CodProducto != '') {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_pp_codigo',
          join: 'CUSTRECORD_HT_CO_FAMILIA_PROD',
          operator: search.Operator.IS,
          values: CodProducto
        }));
      }

      if ((FechaIni != '') && (FechaFin != '')) {
        Busqueda.filters.push(search.createFilter({
          name: 'custrecord_ht_co_coberturafinal',
          operator: search.Operator.WITHIN,
          values: [FechaIni, FechaFin]
        }));
      }

      /* if (NsCriterio != '') {
             Busqueda.filters.push(search.createFilter({
                 name: 'formulatext: CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_co_bien.custrecord_ht_bien_chasis},{custrecord_ht_co_bien.custrecord_ht_bien_motor}),{custrecord_ht_co_bien.custrecord_ht_bien_placa}),{custrecord_ht_co_bien.custrecord_ht_bien_marca}),{custrecord_ht_co_bien.custrecord_ht_bien_modelo})', 
                 operator: search.Operator.CONTAINS,
                 values: NsCriterio
             }));
       }

       miBusqueda.filters.push(search.createFilter({
       name: 'trandate',
       operator: 'within',
       values: ['2023/09/01','2023/09/30']
       }));  */

      // let BusquedaNumReg = Busqueda.runPaged().count; 

      let totalRegistros = Busqueda.runPaged().count;
      let BusquedaNumReg = (totalRegistros > 1000) ? 1000 : totalRegistros;  // Doas 23/02/2025 - Excede el limite de registros

      let ResConsulta = Busqueda.run().getRange({ start: 0, end: BusquedaNumReg });

      let NumInstaladosVeh = 0;
      let NumInstaladosCli = 0;


      for (let i in ResConsulta) {

        let IdCobertura = ResConsulta[i].getValue({ name: 'name' });
        let CodCobertura = ResConsulta[i].getValue({ name: 'internalid' });
        let IdVehiculo = ResConsulta[i].getValue({ name: 'custrecord_ht_co_bien' });
        let Vehiculo = ResConsulta[i].getText({ name: 'custrecord_ht_co_bien' });
        let Identificacion = ResConsulta[i].getValue({ name: 'entityid', join: 'CUSTRECORD_HT_CO_PROPIETARIO' });
        let IdCliente = ResConsulta[i].getValue({ name: 'custrecord_ht_co_propietario' });
        let Cliente = ResConsulta[i].getText({ name: 'custrecord_ht_co_propietario' });
        let CoberturaInicial = ResConsulta[i].getValue({ name: 'custrecord_ht_co_coberturainicial' });
        let CoberturaFinal = ResConsulta[i].getValue({ name: 'custrecord_ht_co_coberturafinal' });
        let IdEstado = ResConsulta[i].getValue({ name: 'custrecord_ht_co_estado_cobertura' });
        let Estado = ResConsulta[i].getText({ name: 'custrecord_ht_co_estado_cobertura' });
        let IdGrupoProducto = ResConsulta[i].getValue({ name: 'custrecord_ht_co_familia_prod' });
        let CodGrupoProducto = ResConsulta[i].getValue({ name: 'custrecord_ht_pp_codigo', join: 'CUSTRECORD_HT_CO_FAMILIA_PROD' });
        let GrupoProducto = ResConsulta[i].getValue({ name: 'name', join: 'CUSTRECORD_HT_CO_FAMILIA_PROD' });
        let Dispositivo = ResConsulta[i].getValue({ name: 'custrecord_ht_co_numerodispositivo' });
        let IdEstadoDispositivo = ResConsulta[i].getValue({ name: 'custrecord_ht_co_estado' });
        let EstadoDispositivo = ResConsulta[i].getText({ name: 'custrecord_ht_co_estado' });
        let IdEjecutivo = ResConsulta[i].getValue({ name: 'salesrep', join: 'CUSTRECORD_HT_CO_PROPIETARIO' });
        let Ejecutivo = ResConsulta[i].getText({ name: 'salesrep', join: 'CUSTRECORD_HT_CO_PROPIETARIO' });
        let Chasis = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_chasis', join: 'custrecord_ht_co_bien' });
        let Motor = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_motor', join: 'custrecord_ht_co_bien' });
        let Placa = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_placa', join: 'custrecord_ht_co_bien' });
        let Marca = ResConsulta[i].getText({ name: 'custrecord_ht_bien_marca', join: 'custrecord_ht_co_bien' });
        let Modelo = ResConsulta[i].getText({ name: 'custrecord_ht_bien_modelo', join: 'custrecord_ht_co_bien' });
        let EstadoConvenio = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_estadoconvenio', join: 'custrecord_ht_co_bien' });
        let Convenio = ResConsulta[i].getValue({ name: 'custrecord_ht_bien_conveniovehiculo', join: 'custrecord_ht_co_bien' });
        let FinCoberturaF = ResConsulta[i].getValue({ name: 'formulatext' });

        NumInstaladosVeh = 0;
        let InstaladosVeh = search.create({
          type: "customrecord_ht_co_cobertura",
          filters: [
            ["custrecord_ht_co_bien", "IS", IdVehiculo], "AND",
            ["custrecord_ht_co_estado", "IS", 1]
          ],
          columns: [
            search.createColumn({ name: "custrecord_ht_co_bien", label: "IdVehiculo" })
          ]
        });


        NumInstaladosVeh = InstaladosVeh.runPaged().count;

        NumInstaladosCli = 0;
        let InstaladosCli = search.create({
          type: "customrecord_ht_co_cobertura",
          filters: [
            ["custrecord_ht_co_propietario", "is", IdCliente], "AND",
            ["custrecord_ht_co_estado", "is", 1]
          ],
          columns: [
            search.createColumn({ name: "custrecord_ht_co_bien", label: "IdVehiculo" })
          ]
        });

        NumInstaladosCli = InstaladosCli.runPaged().count;

        let codRutaImagenProd = '';
        switch (CodGrupoProducto) {
          case 'BR': codRutaImagenProd = '14'; break;
          case 'BS': codRutaImagenProd = '15'; break;
          case 'CC': codRutaImagenProd = '06'; break;
          case 'CM': codRutaImagenProd = '05'; break;
          case 'HH': codRutaImagenProd = '16'; break;
          case 'HP': codRutaImagenProd = '04'; break;
          case 'HU': codRutaImagenProd = '01'; break;
          case 'HX': codRutaImagenProd = '20'; break;
          case 'KM': codRutaImagenProd = '02'; break;
          case 'PC': codRutaImagenProd = '08'; break;
          case 'SA': codRutaImagenProd = '23'; break;
          case 'SG': codRutaImagenProd = '24'; break;
          case 'SR': codRutaImagenProd = '232'; break;
          case 'CH': codRutaImagenProd = '31'; break;
          default: codRutaImagenProd = '00'
        }

        let RutaImagenProd = 'http://10.100.107.14/cotizadorweb/images/listaproductos/Fichas%20Productos-' + codRutaImagenProd + '.jpg';

        Resultado.push({
          IdCobertura: IdCobertura,
          CodCobertura: CodCobertura,
          IdVehiculo: IdVehiculo,
          Vehiculo: Vehiculo,
          Identificacion: Identificacion,
          IdCliente: IdCliente,
          Cliente: Cliente,
          CoberturaInicial: CoberturaInicial,
          CoberturaFinal: CoberturaFinal,
          IdEstado: IdEstado,
          Estado: Estado,
          IdGrupoProducto: IdGrupoProducto,
          CodGrupoProducto: CodGrupoProducto,
          GrupoProducto: GrupoProducto,
          Dispositivo: Dispositivo,
          IdEstadoDispositivo: IdEstadoDispositivo,
          EstadoDispositivo: EstadoDispositivo,
          IdEjecutivo: IdEjecutivo,
          Ejecutivo: Ejecutivo,
          CadenaCriterio: (Chasis + ' ' + Motor + ' ' + Placa + ' ' + Marca + ' ' + Modelo),
          DispositivosInstaladosVehiculo: NumInstaladosVeh,
          DispositivosInstaladosCliente: NumInstaladosCli,
          ProductoLink: RutaImagenProd,
          ProductoNombre: '<b>' + GrupoProducto + '</b>  <br />' + FinCoberturaF + ' <b>/</b> ' + Estado,
          GrupoNombre: (Marca + ' / ' + Modelo + ' / ' + Placa),
          EstadoConvenio: EstadoConvenio,
          Convenio: Convenio
        });
      }

      return Resultado;

    } catch (error) {
      log.error('error', error);
      return 'id:400, No se encontraron resultados.';
    }

  }

  function _post(requestBody) {
    try {
      accion = requestBody.accion;

      switch (accion) {
        case "Insert":
          log.debug("POST request received", requestBody);
          try {
            const data = PostInsert(requestBody);
            log.debug("Respuesta Post Insert", data);
            log.debug("----------------------------------");
            return JSON.stringify(data);

          } catch (e) {
            log.debug("Error respuesta Post Insert", e);
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "Update":
          try {
            const data = PostUpdate(requestBody);
            log.debug("Respuesta Post Update", data);
            log.debug("----------------------------------");
            return JSON.stringify(data);

          } catch (e) {
            log.debug("Error respuesta Post Update", e);
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "Renovacion":
          try {

            log.debug("PostRenovacion", requestBody);
            const dataReno = PostRenovacion(requestBody);
            log.debug("Respuesta Post Renovacion", dataReno);
            return JSON.stringify({ result: dataReno });

          } catch (error) {
            log.debug("Error Post Renovacion", { error: error, stack: error.stack });
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "Ajuste":
          try {

            log.debug("PostAjuste", requestBody);
            const dataReno = PostAjuste(requestBody);
            log.debug("Respuesta Post PostAjuste", dataReno);
            return JSON.stringify({ result: dataReno });

          } catch (error) {
            log.debug("Error Post PostAjuste", { error: error, stack: error.stack });
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "PasoDatos":
          try {
            let IdVehiculo = 0;
            let IdProducto = 0;

            if (typeof requestBody.idvehiculo != 'undefined') {
              if (requestBody.idvehiculo.length != 0) {
                IdVehiculo = requestBody.idvehiculo;
              }
            }

            if (typeof requestBody.idgrupoproducto != 'undefined') {
              if (requestBody.idgrupoproducto.length != 0) {
                IdProducto = requestBody.idgrupoproducto;
              }
            }
            ResultadoConsulta = consultaCoberturaParaPasoDatos(IdVehiculo, IdProducto);

            return ResultadoConsulta;
          } catch (error) {
            log.debug("Error Post PasoDatos", { error: error, stack: error.stack });
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "PasoDatos_N":
          try {
            let IdVehiculo = 0;
            let IdProducto = 0;
            let IdCobertura = 0;

            if (typeof requestBody.idvehiculo != 'undefined') {
              if (requestBody.idvehiculo.length != 0) {
                IdVehiculo = requestBody.idvehiculo;
              }
            }

            if (typeof requestBody.idgrupoproducto != 'undefined') {
              if (requestBody.idgrupoproducto.length != 0) {
                IdProducto = requestBody.idgrupoproducto;
              }
            }

            if (typeof requestBody.IdCobertura != 'undefined') {
              if (requestBody.IdCobertura.length != 0) {
                IdCobertura = requestBody.IdCobertura;
              }
            }


            ResultadoConsulta = consultaCoberturaParaPasoDatos_N(IdVehiculo, IdProducto, IdCobertura);



            return ResultadoConsulta;
          } catch (error) {
            log.debug("Error Post PasoDatos_N", { error: error, stack: error.stack });
            return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
          }

        case "LogsFacInternaVoid":
          try {

            log.debug("PostLogsFacInternaVoid", requestBody);
            const data = PostLogsFacInternaVoid(requestBody);
            log.debug("Respuesta Post PostLogsFacInternaVoid", data);
            // return JSON.stringify({ result: data });

          } catch (error) {
            log.debug("Error LogsFacInternaVoid", { error: error, stack: error.stack });
            return JSON.stringify({ results: [] });
          }

        default:
          log.debug({ title: "default Post", details: requestBody });
          return JSON.stringify({ results: [] });
      }
    } catch (error) {
      log.debug("Error Post", { error: error, stack: error.stack });
      return JSON.stringify({ results: [coberturaController.respuestaGlobales("1")] });
    }
  }

  const PostInsert = (requestBody) => {
    const respuesta = [];
    const manejarError = (mensaje) => {
      respuesta.push({ Cobertura_ID: 0, DetalleCobertura_ID: 0, Mensaje: mensaje });
    };

    try {
      // Consulta la familia en NetSuite
      let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia);

      // Verifica si la consulta de familia es válida
      if (familiaConsulta?.id !== undefined && familiaConsulta.id !== null && familiaConsulta.id !== '') {
        // Consulta la cobertura en NetSuite
        let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id);
        log.debug("Info coberturaConsulta", coberturaConsulta);

        if (coberturaConsulta == null) {
          throw new Error("No se encontró la cobertura, estado Activo");
        }

        let cumpleCondicion = false;
        let dataDetalleCobertura = infoDetalleCobertura(requestBody.idOrdenServicio, requestBody.familia);

        // Obtener el Ht Monitoreo || Ht Factura
        let informaciónOSClientes = ObtenerHTMonitoreo(requestBody.idOrdenServicio, requestBody.idbien);
        log.debug("Info informaciónOSClientes", informaciónOSClientes);

        if (coberturaConsulta.propietario == informaciónOSClientes.clienteOs) {
          coberturaConsulta.clientemonitoreo = informaciónOSClientes.clienteMonitoreo;
          if (informaciónOSClientes?.clienteHt) {
            coberturaConsulta.propietario = informaciónOSClientes.clienteHt;
          }
        }

        for (let i = 0; i < dataDetalleCobertura.length; i++) {
          if (dataDetalleCobertura[i].idordenServicio == requestBody.idOrdenServicio && dataDetalleCobertura[i].idCobertura == coberturaConsulta.id) {
            cumpleCondicion = true;
            break; // Rompe el bucle for si se cumple la condición
          }
        }

        if (cumpleCondicion) {
          log.debug("Cobertura ya existe", coberturaConsulta);
          throw new Error("La orden de servicio ya genero una cobertura");
        } else {


          // Arma el JSON para insertar
          let jsonCobertura = CrearJson(coberturaConsulta, requestBody, familiaConsulta);
          log.debug("Info jsonCobertura", jsonCobertura);

          // Genera o actualiza la cobertura
          let dataFinal = coberturaController.Genera_Actualiza_Cobertura(jsonCobertura);

          log.debug("Info dataFinal", dataFinal);

          if ((dataFinal?.CoberturaID || 0) > 0) {
            ActualizarPropietarioBien(requestBody.idbien, informaciónOSClientes.clienteMonitoreo);
          }

          return { results: dataFinal, status: "OK", message: "Cobertura insertada correctamente" };
        }
      } else {
        throw new Error("No se encontró la familia");
      }

    } catch (error) {
      log.debug("Error PostCaso1", { error: error, stack: error.stack });
      manejarError(error.message);
      return { results: respuesta, status: "Error", message: error.message };
    }
  };

  const PostUpdate = (requestBody) => {
    const respuesta = [];
    const manejarError = (mensaje) => {
      respuesta.push({ Cobertura_ID: 0, DetalleCobertura_ID: 0, Mensaje: mensaje });
    };

    try {

      let validarfechainicio = validarFecha(requestBody.fechaInicio);
      let validarfechafin = validarFecha(requestBody.fechafin);

      if (!validarfechainicio.valido && !validarfechafin.valido) {
        let nuevafechainicio = validarYConvertirFecha(requestBody.fechaInicio);
        let nuevafechafin = validarYConvertirFecha(requestBody.fechafin);

        if (!nuevafechainicio.valido || !nuevafechafin.valido) {
          throw new Error("Fecha de inicio o fin no válida");
        } else {
          requestBody.fechaInicio = nuevafechainicio.fechaConvertida;
          requestBody.fechafin = nuevafechafin.fechaConvertida;
        }
      }

      let jsonCobertura;
      // Consulta la familia en NetSuite
      let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia.replace(/\s+/g, ''));

      // log.debug("Info requestBody", requestBody);

      // Verifica si la consulta de familia es válida
      if (familiaConsulta?.id !== undefined && familiaConsulta.id !== null && familiaConsulta.id !== '') {

        let condicionGPG = false;

        // Consulta la cobertura en NetSuite
        if (requestBody.codVehiculo) {
          requestBody.idbien = ObtenerIDVehiculoSysID(requestBody.codVehiculo);

          if (requestBody.idbien == 0) {
            throw new Error("No se encontró el vehículo");
          }
        }

        let coberturaConsulta = consultaCoberturaJ(requestBody.idbien, familiaConsulta.id, requestBody);
        log.debug("--Info coberturaConsulta--", coberturaConsulta);
        

        // let ajusteproducto = obtenerInfItem(coberturaConsulta?.producto, 136);
        // // log.debug("Info ajusteproducto", ajusteproducto);

        // if (ajusteproducto?.custrecord_ht_pp_codigo == "S") {
        //   condicionGPG = true;
        // }

        if (coberturaConsulta != null) {  // Se ajusta validacion para que no dependa de una sola os 

          let dataDetalleCobertura = infoDetalleCobertura(requestBody.idOrdenServicio, requestBody.familia);
          let parametrizacion_Item = obtenerParametrizacionItem(coberturaConsulta?.producto, ['GPG']);
          
          log.debug("Info dataDetalleCobertura", dataDetalleCobertura);

          let cumpleCondicion = false;
          let countConcepto8 = 0;
          let countConcepto20 = 0;

          // Recorremos la lista actual
          for (let i = 0; i < dataDetalleCobertura.length; i++) {
            const concepto = String(dataDetalleCobertura[i].concepto);
            if (concepto === "8") countConcepto8++;
            if (concepto === "20") countConcepto20++;
          }

          // Simulamos que vamos a insertar un nuevo registro
          if (requestBody.concepto === "8") {
            countConcepto8 += 1; // agregamos uno más de concepto "8"
            cumpleCondicion = (countConcepto8 === countConcepto20 && countConcepto8 > 0);
          }

          else if (requestBody.concepto === "20") {
            log.debug("Info countConcepto8", countConcepto8);
            log.debug("Info countConcepto20", countConcepto20);

            cumpleCondicion = (countConcepto8 === countConcepto20 && countConcepto20 > 0);
          }


          log.debug("Info cumpleCondicion", cumpleCondicion);

          if (cumpleCondicion) {
            throw new Error("La orden de servicio ya AFECTO una cobertura");
          } else {

            // throw new Error("Error Controlado");

            let calcularDiferenciaDiasInsert = requestBody?.tipocobertura ? requestBody.tipocobertura : calcularDiferenciaDias(requestBody.fechaInicio, requestBody.fechafin);

            // Arma el JSON para insertar
            jsonCobertura = CrearJson(coberturaConsulta, requestBody, familiaConsulta, null, calcularDiferenciaDiasInsert);
            log.debug("Info jsonCobertura", jsonCobertura);

            let dataFinal = coberturaController.Genera_Actualiza_Cobertura(jsonCobertura);

            // Genera o actualiza la cobertura
            try {
              if (jsonCobertura?.salesorder && jsonCobertura?.concepto == 8 && parametrizacion_Item[0]?.Valor === 'S') {

                let logData = {
                  "GPG": _constant.Parameter.GPG_GENERA_PARAMETRIZACION_EN_GEOSYS,
                  "ADP": _constant.Valor.VALOR_004_RENOVACION_DE_DISP,
                  "ID_Familia": familiaConsulta.id,
                  "ID_OS": jsonCobertura.salesorder,
                  "ID_Cobertura": jsonCobertura.cobertura
                }

                let procesoPX = _controller.parametros(_constant.Parameter.GPG_GENERA_PARAMETRIZACION_EN_GEOSYS, null, _constant.Valor.VALOR_004_RENOVACION_DE_DISP, null, null, null, familiaConsulta.id, jsonCobertura.salesorder);
                log.debug("--infRenoImpulso--", procesoPX)

                if ((procesoPX?.response?.body != "1") || (procesoPX?.response?.body != 1)) {
                  // Generar log Proceso General PX 
                  generarLogCambioEstado(procesoPX.PxAdmin, jsonCobertura.cobertura, 'F', "ProcesoRenoPX");
                } else {
                  // Crear Archivos
                  // let requestFile = saveJson(procesoPX?.PxAdmin || {}, `request_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderRequest);  // json traza
                  let requestFile = saveJson(logData || {}, `request_RENO_${jsonCobertura.bien}_${sysDateTime()}`, folderRequest);  // json traza
                  // log.debug('idrequestFile', requestFile);

                  // let responseFile = saveJson(procesoPX, `response_${trama.EstadoSim}_${trama.codigovehiculo}_${sysDateTime()}`, folderResponse);   // json Respuesta
                  let responseFile = saveJson(procesoPX, `response_RENO_${jsonCobertura.bien}_${sysDateTime()}`, folderResponse);   // json Respuesta
                  // log.debug('idresponseFile', requestFile);

                  // crearRegistroImpulso(trama.IdCobertura, requestFile, responseFile, procesoPX.response.body, 'PX');
                  crearRegistroImpulso(jsonCobertura.cobertura, requestFile, responseFile, procesoPX?.response?.body, 'PX');
                }
              }
            } catch (error) {
              log.debug("error Reno co", error.stack)
            }

            // let dataFinal = {}; // ! Eliminar esta linea
            // return { results: dataFinal, status: "OK", message: "Cobertura Generada correctamente" };

            // !Obtener el id de la cobertura.
            // !Nuevo campo Coberura Name
            // if ((dataFinal?.CoberturaID || 0) > 0) {
            //   ActualizarPropietarioBien(requestBody.idbien, requestBody.clienteMonitoreo);
            // }

            procesaLogCobertura(requestBody, "Cobertura Generada correctamente", "T");

            return { results: dataFinal, status: "OK", message: "Cobertura Generada correctamente" };

          }

        } else {
          throw new Error("No se encontró la cobertura");
        }
      } else {
        throw new Error("No se encontró la familia");
      }

    } catch (error) {
      procesaLogCobertura(requestBody, error.message, "F");

      log.debug("Error PostCaso1", { error: error, stack: error.stack });
      manejarError(error.message);
      return { results: respuesta, status: "Error", message: error.message };
    }
  };

  const PostRenovacion = (requestBody) => {
    try {
      let idOs = requestBody.idOrdenServicio;
      let data = obtenerItemOS(idOs);
      log.debug("-----------------Data", data);

      let results = procesarDatosOS(data);

      // log.debug("Results", results);

      if (results.items.length > 0 && results.idVehiculo > 0) {

        // log.debug("Entro");

        let resultadoFinal = procesarItems({ result: results.items });
        // log.debug("ResultadoFinal*******", resultadoFinal);

        for (let key in resultadoFinal) {
          let familiaConsulta = consultaFamiliaNetsuite(key);
          let infoCoberturaEncontrada = coberturaController.obtenerCoberturaVehiculoFamilia(results.idVehiculo, familiaConsulta.id);

          // log.debug("infoCoberturaEncontrada", infoCoberturaEncontrada);

          if (infoCoberturaEncontrada?.id) {

            let cumpleCondicion = false;
            let countConcepto8 = 0;
            let countConcepto20 = 0;

            let dataDetalleCobertura = infoDetalleCobertura(requestBody.idOrdenServicio, requestBody.familia);

            for (let i = 0; i < dataDetalleCobertura.length; i++) {  //! NEW AJUSTE
              const concepto = dataDetalleCobertura[i].concepto;
              if (concepto == 8) countConcepto8++;
              if (concepto == 20) countConcepto20++;

              if (countConcepto8 === countConcepto20 && countConcepto8 > 0) {
                cumpleCondicion = false;
              } else {
                cumpleCondicion = true;
              }
            }

            if (cumpleCondicion) {
              log.debug("Cobertura ya existe", infoCoberturaEncontrada);
              return { results: { CoberturaID: infoCoberturaEncontrada.id, DetalleCoberturaID: 0, Mensaje: "La orden de servicio ya genero una cobertura" }, status: "OK", message: "La orden de servicio ya genero una cobertura" };
            } else {
              let jsonCobertura = calcularCoberturaYGenerarJsonRenovacion(resultadoFinal[key], infoCoberturaEncontrada, familiaConsulta, results.idVehiculo, idOs, requestBody);
              log.debug("Info_Cobertura", jsonCobertura);
              let datacobertura = coberturaController.Genera_Actualiza_Cobertura(jsonCobertura);
              // return datacobertura;
              return { results: datacobertura, status: "OK", message: "Cobertura insertada correctamente" };
            }

          } else {
            log.debug("No se encontró cobertura para la familia", key);
            return { results: { CoberturaID: 0, DetalleCoberturaID: 0, Mensaje: "No se encontró cobertura para la familia" }, status: "OK", message: "No se encontró cobertura para la familia" };
          }
        }
      } else {
        return { results: { CoberturaID: 0, DetalleCoberturaID: 0, Mensaje: "No se encontró la orden de servicio" }, status: "OK", message: "No se encontró la orden de servicio" };
      }
    } catch (error) {
      return { results: { CoberturaID: 0, DetalleCoberturaID: 0, Mensaje: error.message }, status: "Error", message: error.message };
    }
  };

  const PostAjuste = (requestBody) => {
    try {
      // Cargar el registro de cobertura
      const coberturaRecord = record.load({
        type: "customrecord_ht_co_cobertura",
        id: requestBody.idCobertura,
        isDynamic: true,
      });

      // Obtener el campo custrecord_ht_ct_concepto por su internalId
      coberturaRecord.setValue({
        fieldId: 'custrecord_ht_co_estado_cobertura',
        value: requestBody.estado,
      });

      // Guardar el registro después de actualizar el campo
      const updatedRecordId = coberturaRecord.save();

      return { results: { CoberturaID: updatedRecordId, DetalleCoberturaID: 0, Mensaje: requestBody.estado }, status: "Success" };

    } catch (error) {
      return { results: { CoberturaID: 0, DetalleCoberturaID: 0, Mensaje: error.message }, status: "Error", message: error.message };
    }
  }

  const PostLogsFacInternaVoid = (data) => {




    // ! HT Seguimiento Cliente Creacion
    try {

      // Validar campos obligatorios
      if (!data.cliente || !data.idUsuario || !data.bien) {
        throw new Error("Los campos 'cliente', 'empleado' y 'vehiculo' son obligatorios.");
      }

      let complemento = (generarMensaje(data.dataJsonFin));

      // Mapeo de campos y valores
      const campos = [
        { fieldId: 'custrecord_ht_sc_cliente', value: data.cliente },
        { fieldId: 'custrecord_ht_sc_resultadogestion', value: 17 },
        // { fieldId: 'custrecord_ht_sc_cmotivo', value: requestBody.cmotivo },
        { fieldId: 'custrecord_ht_sc_empleado', value: data.idUsuario },
        { fieldId: 'custrecord_ht_sc_estado', value: 2 },
        // { fieldId: 'custrecord_ht_sc_fechacontacto', value: requestBody.fechaContacto ? new Date(requestBody.fechaContacto) : null },
        // { fieldId: 'custrecord_ht_sc_fechapproximocontacto', value: requestBody.fechaProximoContacto ? new Date(requestBody.fechaProximoContacto) : null },
        // { fieldId: 'custrecord_ht_sc_fechapromesa', value: requestBody.fechaPromesa ? new Date(requestBody.fechaPromesa) : null },
        { fieldId: 'custrecord_ht_sc_modocontacto', value: 5 },
        // { fieldId: 'custrecord_ht_sc_proximocontacto', value: requestBody.proximoContacto },
        { fieldId: 'custrecord_ht_sc_seguimiento', value: complemento + " Plazo: " + data.plazo + " Tipo Plazo: " + data.periodo },
        { fieldId: 'custrecord_ht_sc_tipocliente', value: 1 },
        { fieldId: 'custrecord_ht_sc_tiposeguimiento', value: 4 },
        { fieldId: 'custrecord_ht_sc_vehiculo', value: data.bien },
        { fieldId: 'custrecord_subsidiaria_seguimiento', value: 2 },
        // { fieldId: 'custrecord_ht_telefono_alterno', value: requestBody.telefonoAlterno },
        // { fieldId: 'custrecord_ht_telefono_contacto', value: requestBody.telefonoContacto }
      ];

      let registrarSeguimientoCliente = record.create({
        type: 'customrecord_ht_record_seguicliente',
        isDynamic: true
      });

      // Insertar valores solo si existen
      campos.forEach(({ fieldId, value }) => {
        if (value !== undefined && value !== null) {
          registrarSeguimientoCliente.setValue({ fieldId, value });
        }
      });

      let idSeguimientoCliente = registrarSeguimientoCliente.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });

      log.debug("idSeguimientoCliente", idSeguimientoCliente);
      // return { id: idSeguimientoCliente, Mensaje: "Exito" };
      return true

    } catch (error) {
      log.debug("-E-", error)

      return false

      // return {}
    }



  }

  const infoDetalleCobertura = (IdOs, familia) => {

    if ((!IdOs && !familia) || IdOs == "") {
      return [];
    }

    let familiaConsulta = consultaFamiliaNetsuite(familia);

    let results = [];
    try {
      let serviceOrderSearch = search.create({
        type: "customrecord_ht_ct_cobertura_transaction",
        filters: [
          ["custrecord_ht_ct_orden_servicio", "is", IdOs],
          "AND",
          ["custrecord_ht_ct_transacciones.custrecord_ht_co_familia_prod", "anyof", familiaConsulta.id]
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

      log.debug("results", results)

      return results;
    } catch (error) {
      log.debug("error", error);
      return [];
    }

  }

      function obtenerParametrizacionItem(items, busquedaParametro) {
        try {
            let data = [];
            for (let i = 0; i < busquedaParametro.length; i++) {

                if (!items || !busquedaParametro[i]) {
                    log.debug("Error", "El ID del item o el parámetro de búsqueda son nulos o indefinidos");
                    return [];
                }

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
    }

  
  /*
  * Importante Eventos retorna un JSON (Metodo Insert y Update)
  * */
  function CrearJson(coberturaConsulta, requestBody, familiaConsulta, vehiculoReno, plazoCalculado, idOsReno) {

    log.debug("CrearJson", { coberturaConsulta: coberturaConsulta, requestBody: requestBody, familiaConsulta: familiaConsulta, vehiculoReno: vehiculoReno, plazoReno: plazoCalculado });

    try {
      const accion = requestBody.accion;

      if (coberturaConsulta?.id == 0 || coberturaConsulta?.id == null || coberturaConsulta?.id == '') {
        throw new Error("No se encontró la cobertura");
      }

      if (accion == "Insert") {
        return {
          bien: requestBody.idbien,
          propietario: coberturaConsulta?.propietario || null,
          clienteMonitoreo: coberturaConsulta?.clientemonitoreo || null,
          start: requestBody.fechaInicio,
          plazo: requestBody.tipocobertura,
          end: requestBody.fechafin,
          estado: 1,
          concepto: requestBody?.concepto || null,
          producto: null,
          salesorder: requestBody?.idOrdenServicio || null,    // considerar para el registro log el id orden de servicio
          serieproducto: null,
          ordentrabajo: null,  // considerar para el registro log el id orden de trabajo
          monitoreo: "",
          cobertura: coberturaConsulta?.id || 0,
          ttr: familiaConsulta.id,
          estadoCobertura: evaluarFechaParaEstadoCobertura(requestBody.fechaInicio, requestBody.fechafin),
          t_PPS: true,
          modeloDispositivo: null,
          unidadDispositivo: null,
          vidDispositivo: null
        };
      }

      if (accion == "Update") {
        return {
          bien: requestBody.idbien,
          propietario: null,
          start: requestBody.fechaInicio,
          plazo: plazoCalculado,
          end: requestBody.fechafin,
          estado: coberturaConsulta?.estado_dispositivo || null,
          concepto: requestBody?.concepto || null,
          producto: null,
          salesorder: requestBody?.idOrdenServicio || null,    // considerar para el registro log el id orden de servicio
          serieproducto: null,
          ordentrabajo: null,  // considerar para el registro log el id orden de trabajo
          monitoreo: "",
          cobertura: coberturaConsulta?.id || 0,
          ttr: familiaConsulta.id,
          // estadoCobertura: evaluarFechaParaEstadoCobertura(requestBody.fechaInicio, requestBody.fechafin),
          estadoCobertura: coberturaConsulta?.estado_cobertura == 4 ? coberturaConsulta?.estado_cobertura : evaluarFechaParaEstadoCobertura(requestBody.fechaInicio, requestBody.fechafin), //Doas 02/09/2025
          t_PPS: true,
          modeloDispositivo: null,
          unidadDispositivo: null,
          vidDispositivo: null
        };
      }

      if (accion == "Renovacion") {

        // log.debug("CrearJson", { coberturaConsulta, requestBody, familiaConsulta, vehiculo: vehiculoReno, plazo: plazoReno });

        if (coberturaConsulta?.id == 0 || coberturaConsulta?.id == null || coberturaConsulta?.id == '') {
          throw new Error("No se encontró la cobertura");
        }

        return {
          bien: vehiculoReno,
          propietario: null,
          start: requestBody.coberturaInicial,
          plazo: plazoCalculado,
          end: requestBody.coberturaFinal,
          estado: 1,
          concepto: 8,
          producto: null,
          salesorder: idOsReno,    // considerar para el registro log el id orden de servicio
          serieproducto: null,
          ordentrabajo: null,  // considerar para el registro log el id orden de trabajo
          monitoreo: "",
          cobertura: coberturaConsulta?.id || 0,
          ttr: familiaConsulta.id,
          estadoCobertura: 1,
          t_PPS: true,
          modeloDispositivo: null,
          unidadDispositivo: null,
          vidDispositivo: null
        };
      }

    } catch (error) {
      log.debug("Error CrearJson", { error: error, stack: error.stack });
      throw new Error(error.message);

    }
  }

  function _put() {
    //put
  }

  function _delete() {
    //delete
  }

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
          "AND",
          ["custrecord_ht_co_estado_cobertura", "anyof", "2", "3"],
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
            id: result.getValue({ name: "internalid" }),
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
      log.debug("error", error);
      return [];
    }


  }

  function consultaCoberturaJ(IdVehiculo, idfamilia, requestBody) {
    let results = [];
    let filtro = [];

    if (IdVehiculo && idfamilia) {
      filtro.push(
        ["custrecord_ht_co_bien", "anyof", IdVehiculo],
        "AND",
        ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
        "AND",
        ["isinactive", "is", "F"],
        "AND",
        ["custrecord_ht_co_estado_cobertura", "noneof", "5"]   // ! Doas 04/05/2025 - Excluir estado cancelada para consulta de cobertura por vehículo y familia
      );

    } else {
      throw new Error("No se encontró la cobertura, falta información");
    }


    if (requestBody && requestBody.directo) {
      filtro.push(
        "AND",
        ["internalid", "is", requestBody.directo],
        "AND",
        ["isinactive", "is", "F"],
      )
    }

    try {
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: filtro,
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
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
          search.createColumn({ name: "custrecord_ht_co_estado" })
        ],
      });

      let searchResult = CoberturaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
            clientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }),
            bien: result.getValue({ name: "custrecord_ht_co_bien" }),
            producto: result.getValue({ name: "custrecord_ht_co_producto" }),
            coberturainicial: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            coberturafinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            numeroserieproducto: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            estado_cobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            estado_dispositivo: result.getValue({ name: "custrecord_ht_co_estado" }),
            propietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            familia: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
          });
        });
      });


      if (results.length > 0) {
        // Verificar si todos los campos numeroserieproducto son iguales
        const allEqualNumeroserie = results.every(item =>
          item.numeroserieproducto === results[0].numeroserieproducto &&
          item.clientemonitoreo === results[0].clientemonitoreo &&
          item.coberturainicial === results[0].coberturainicial &&
          item.coberturafinal === results[0].coberturafinal &&
          item.plazo === results[0].plazo &&
          item.estado_cobertura === results[0].estado_cobertura &&
          item.estado_dispositivo === results[0].estado_dispositivo &&
          item.propietario === results[0].propietario &&
          item.familia === results[0].familia
        );

        // const productoIsNull = results.some(item => item.numeroserieproducto === null || item.numeroserieproducto === undefined || item.numeroserieproducto === '');
        // log.debug("productoIsNull", productoIsNull);

        let familiasPermitidas = ["512", "522"]; // SA, SR

        const productoIsNull = results.some(item => {
          if (item.numeroserieproducto === null || item.numeroserieproducto === undefined || item.numeroserieproducto === '') {
            // Verificar si pertenece a alguna de las familias permitidas
            if (familiasPermitidas.includes(item.familia) || item.estado_cobertura != "4") {
              return false; // Permitir que pase
            } else {
              return true; // No permitir que pase
            }
          }
          return false; // Si numeroserieproducto no es vacío, permitir que pase
        });

        if (productoIsNull) {
          throw new Error("El numero de serie producto de la cobertura esta vacia");
        }

        if (!allEqualNumeroserie) {

          // throw new Error("Diferencia datos de cobertura.");

          let respuestaValidacion = ValidacionFechaActualActualizacion(results, requestBody);

          //Eliminar 
          // if (respuestaValidacion?.coberturasParaEliminar.length > 0) {
          //   for (let i = 0; i < respuestaValidacion.coberturasParaEliminar.length; i++) {
          //     let deleteCobertura = record.delete({
          //       type: 'customrecord_ht_co_cobertura',
          //       id: respuestaValidacion.coberturasParaEliminar[i].id,
          //       isDynamic: true,
          //     });
          //     log.debug("Se elimino ", deleteCobertura);
          //   }
          // }

          //isinactive
          try {
            if (respuestaValidacion?.coberturasParaEliminar.length > 0) {
              for (let i = 0; i < respuestaValidacion.coberturasParaEliminar.length; i++) {

                let coberturaId = respuestaValidacion.coberturasParaEliminar[i].id;
                let coberturaRecord = record.load({
                  type: 'customrecord_ht_co_cobertura',
                  id: coberturaId,
                  isDynamic: true,
                });

                coberturaRecord.setValue({
                  fieldId: 'isinactive',
                  value: true,
                });

                let updatedCoberturaId = coberturaRecord.save();
                log.debug("Se inactivo ", updatedCoberturaId);
              }
            }
          } catch (error) {
            log.debug("Error al inactivar", error);
          }

          if (respuestaValidacion?.coberturaMasReciente) {
            return respuestaValidacion.coberturaMasReciente;
          } else {
            throw new Error("Diferencia datos de cobertura.");
          }

        } else {
          // Encontrar el objeto con el id mayor
          let maxIdObject = results.reduce((max, item) => (parseInt(item.id) > parseInt(max.id) ? item : max), results[0]);

          // Crear el array dataencontrada con el objeto de id mayor
          let dataencontrada = [maxIdObject];

          // Crear el array dataparaEliminar excluyendo el objeto de id mayor
          let dataparaEliminar = results.filter(item => item.id !== maxIdObject.id);

          // Imprimir resultados
          log.debug("dataencontrada:", dataencontrada);
          log.debug("dataparaEliminar:", dataparaEliminar);

          for (let i = 0; i < dataparaEliminar.length; i++) {
            log.debug("ID identificado", dataparaEliminar[i].id);

            // ANTES
            // try {
            //   let deleteCobertura = record.delete({
            //     type: 'customrecord_ht_co_cobertura',
            //     id: results[i].id,
            //     isDynamic: true,
            //   });
            //   log.debug("Se elimino ", deleteCobertura);
            // } catch (error) {
            //   log.debug("Error al eliminar", error);
            //   throw new Error("Error al eliminar");
            //   // try {
            //   //   let bandera = infoDetalleCoberturaCabezera(results[i].id);
            //   //   if(bandera){
            //   //     let deleteCoberturaV2 = record.delete({
            //   //       type: 'customrecord_ht_co_cobertura',
            //   //       id: results[i].id,
            //   //       isDynamic: true,
            //   //     });
            //   //     log.debug("Eliminado", deleteCoberturaV2);
            //   //   } else {
            //   //     log.debug("No se puede eliminar por relacion", results[i].id);
            //   //   }
            //   // } catch (error) {
            //   //   log.debug("Error al eliminar222", error);
            //   // }
            // }

            // iNACTIVO
            try {
              let coberturaRecord = record.load({
                type: 'customrecord_ht_co_cobertura',
                id: results[i].id,
                isDynamic: true,
              });

              coberturaRecord.setValue({
                fieldId: 'isinactive',
                value: true,
              });

              let updatedCoberturaId = coberturaRecord.save();
              log.debug("Se inactivo ", updatedCoberturaId);

            } catch (error) {
              log.debug("Error al inactivar", error);
              throw new Error("Error al inactivar");
            }



          }
          return dataencontrada[0];
        }
      } else {
        log.error("No se encontraron resultados.");
        return [];
      }

    } catch (error) {
      log.debug("error", error);
      throw error;
    }
  }

  function consultaFamiliaNetsuite(familia) {

    let results = [];
    try {
      let FamiliaSearch = search.create({
        type: "customrecord_ht_cr_pp_valores",
        filters: [
          ["custrecord_ht_pp_codigo", "is", familia],
          // 'AND',
          // ['owner.subsidiary', 'anyof', '2'],
          'AND',
          ['custrecord33', 'anyof', '2']
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "name" }),
          search.createColumn({ name: "custrecord_ht_pp_codigo" }),
        ],
      });

      let searchResult = FamiliaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
            name: result.getValue({ name: "name" }),
            codigo: result.getValue({ name: "custrecord_ht_pp_codigo" }),
          });
        });
      });

      return results[0];

    } catch (error) {
      log.debug("error", error);
      return [];
    }

  }

  function consultaCoberturaParaPasoDatos(IdVehiculo, idfamilia) { //AQUI
    let results = [];

    try {
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien.custrecord_bn_subsidiaria", "anyof", GlobalSubsidiaria], "AND",
          ["custrecord_ht_co_bien", "anyof", IdVehiculo], "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],
          "AND", ["isinactive", "is", "F"]
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "name" }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_codsysh", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),
          search.createColumn({ name: "vatregnumber", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_estado" }),
          search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
          search.createColumn({ name: "custrecord_ht_co_udp_pla_px_ami" }),
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_modelodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_unidad" }),
          search.createColumn({ name: "custrecord_ht_co_imei" }),
          search.createColumn({ name: "custrecord_ht_co_celularsimcard" }),
          search.createColumn({ name: "custrecord_ht_co_nocelularsimcard" }),
          search.createColumn({ name: "custrecord_ht_co_ip" }),
          search.createColumn({ name: "custrecord_ht_co_apn" }),
          search.createColumn({ name: "custrecord_ht_co_operadora" }),
          search.createColumn({ name: "custrecord_ht_co_vid" }),
          search.createColumn({ name: "custrecord_ht_co_firmware" }),
          search.createColumn({ name: "custrecord_ht_co_script" }),
          search.createColumn({ name: "custrecord_ht_co_servidor" }),
          search.createColumn({ name: "custrecord_ht_co_seriedispolojack" }),
          search.createColumn({ name: "custrecord_ht_co_codigoactivacion" }),
          search.createColumn({ name: "custrecord_ht_co_codigorespuesta" }),

        ],
      });

      let searchResult = CoberturaSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            IdCobertura: result.getValue({ name: "internalid" }),
            CodCobertura: result.getValue({ name: "name" }),
            IdBien: result.getValue({ name: "custrecord_ht_co_bien" }),
            CodBienSys: result.getValue({ name: "custrecord_ht_bien_codsysh", join: "custrecord_ht_co_bien" }),
            Idclientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }) ? result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }) : '0',
            ClienteMonitoreo: '',
            Empresa: result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
            IdClienteNs: result.getValue({ name: "custrecord_ht_co_propietario" }),
            IdCliente: result.getValue({ name: "vatregnumber", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
            CodItemSys: result.getText({ name: "custrecord_ht_co_producto" }),
            NumeroSerie: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            IdEstadoCobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }),
            EstadoCobertura: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
            FechaInicio: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            Plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            FechaFinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            IdEstadoInstalacion: result.getValue({ name: "custrecord_ht_co_estado" }) ? result.getValue({ name: "custrecord_ht_co_estado" }) : '0',
            EstadoInstalacion: result.getText({ name: "custrecord_ht_co_estado" }),
            CodFamiliaProducto: result.getValue({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
            IdFamiliaProducto: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
            FamiliaProducto: result.getValue({ name: "name", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
            PlatPxAMi: result.getValue({ name: "custrecord_ht_co_udp_pla_px_ami" }),
            NumeroDispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            ModeloDispositivo: result.getValue({ name: "custrecord_ht_co_modelodispositivo" }),
            Unidad: result.getValue({ name: "custrecord_ht_co_unidad" }),
            Imei: result.getValue({ name: "custrecord_ht_co_imei" }),
            CelularSim: result.getValue({ name: "custrecord_ht_co_celularsimcard" }),
            NoCelularSimCarg: result.getValue({ name: "custrecord_ht_co_nocelularsimcard" }),
            Ip: result.getValue({ name: "custrecord_ht_co_ip" }),
            APN: result.getValue({ name: "custrecord_ht_co_apn" }),
            Operadora: result.getValue({ name: "custrecord_ht_co_operadora" }),
            Vid: result.getValue({ name: "custrecord_ht_co_vid" }),
            Firmware: result.getValue({ name: "custrecord_ht_co_firmware" }),
            Script: result.getValue({ name: "custrecord_ht_co_script" }),
            Servidor: result.getValue({ name: "custrecord_ht_co_servidor" }),
            SerieLojack: result.getValue({ name: "custrecord_ht_co_seriedispolojack" }),
            CodigoActivacion: result.getValue({ name: "custrecord_ht_co_codigoactivacion" }),
            CodigoRespuesta: result.getValue({ name: "custrecord_ht_co_codigorespuesta" })
          });
        });
      });

      return results[0];

    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  //BORRAR
  function consultaCoberturaParaPasoDatos_N(IdVehiculo, idfamilia, idCobertura) {
    let results = [];

    let filter = [
      ["custrecord_ht_co_bien.custrecord_bn_subsidiaria", "anyof", GlobalSubsidiaria], "AND",
      ["custrecord_ht_co_bien", "anyof", IdVehiculo], "AND",
      ["custrecord_ht_co_familia_prod", "anyof", idfamilia], "AND",
      ["isinactive", "is", "F"]
    ]

    if (idCobertura) {
      filter = [
        ["internalid", "is", idCobertura]
      ]
    }

    try {
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: filter,
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "name" }),
          search.createColumn({ name: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_bien_codsysh", join: "custrecord_ht_co_bien" }),
          search.createColumn({ name: "custrecord_ht_co_clientemonitoreo" }),
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),
          search.createColumn({ name: "vatregnumber", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
          search.createColumn({ name: "custrecord_ht_co_producto" }),
          search.createColumn({ name: "custrecord_ht_co_numeroserieproducto" }),
          search.createColumn({ name: "custrecord_ht_co_estado_cobertura" }),
          search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
          search.createColumn({ name: "custrecord_ht_co_plazo" }),
          search.createColumn({ name: "custrecord_ht_co_coberturafinal" }),
          search.createColumn({ name: "custrecord_ht_co_estado" }),
          search.createColumn({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),
          search.createColumn({ name: "custrecord_ht_co_udp_pla_px_ami" }),

          search.createColumn({ name: "custrecord_ht_mc_seriedispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO", label: "HT MC Serie Dispositivo Chaser" }),
          search.createColumn({ name: "custrecord_ht_mc_modelo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO", label: "HT MC Modelo" }),
          search.createColumn({ name: "custrecord_ht_mc_tipodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO", label: "HT MC Tipo dispositivo" }),
          search.createColumn({ name: "custrecord_ht_mc_unidad", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),

          search.createColumn({ name: "custrecord_ht_mc_imei", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_celularsimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_nocelularsim", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_ip", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_apn", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_operadora", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_vid", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_firmware", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_script", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_servidor", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_seriedispositivolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_codigoactivacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_codigorespuesta", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_estadosimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_estadolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_icc", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_estadolodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_ubicacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "custrecord_ht_mc_vehiculo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }),
          search.createColumn({ name: "isinactive", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" })


        ],
      });

      let searchResult = CoberturaSearch.runPaged();

      let SerieSim = '';
      let IdtipoSim = 0;
      let Tiposimcard = '';
      let Fechacorte = '01/01/1900';
      let IdestadoConciliacion = 0;
      let EstadoConciliacion = '';
      let SimCard = 0;
      let IdSim = 0;

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {


          SerieSim = result.getValue({ name: "custrecord_ht_mc_icc", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_icc", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '';
          if (SerieSim !== '') {
            let InformacionSim = ConsultaSimCard(SerieSim);
            if (InformacionSim.length > 0) {
              IdtipoSim = InformacionSim[0]?.Idtiposimcard;
              Tiposimcard = InformacionSim[0]?.Tiposimcard;
              IdestadoConciliacion = InformacionSim[0]?.Idestadoconciliacion;
              EstadoConciliacion = InformacionSim[0]?.Estadoconciliacion;
              SimCard = InformacionSim[0]?.Simcard;
              IdSim = InformacionSim[0]?.Internalid;
              Fechacorte = InformacionSim[0]?.Fechacorte;

            };
          };


          results.push({
            IdCobertura: result.getValue({ name: "internalid" }),
            CodCobertura: result.getValue({ name: "name" }),
            IdBien: result.getValue({ name: "custrecord_ht_co_bien" }),
            CodBienSys: result.getValue({ name: "custrecord_ht_bien_codsysh", join: "custrecord_ht_co_bien" }),
            Idclientemonitoreo: result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }) ? result.getValue({ name: "custrecord_ht_co_clientemonitoreo" }) : '0',
            ClienteMonitoreo: '',
            Empresa: result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
            IdClienteNs: result.getValue({ name: "custrecord_ht_co_propietario" }),
            IdCliente: result.getValue({ name: "vatregnumber", join: "CUSTRECORD_HT_CO_PROPIETARIO" }),
            CodItemSys: result.getText({ name: "custrecord_ht_co_producto" }),
            NumeroSerie: result.getValue({ name: "custrecord_ht_co_numeroserieproducto" }),
            IdEstadoCobertura: result.getValue({ name: "custrecord_ht_co_estado_cobertura" }) ? result.getValue({ name: "custrecord_ht_co_estado_cobertura" }) : '0',
            EstadoCobertura: result.getText({ name: "custrecord_ht_co_estado_cobertura" }),
            FechaInicio: result.getValue({ name: "custrecord_ht_co_coberturainicial" }),
            Plazo: result.getValue({ name: "custrecord_ht_co_plazo" }),
            FechaFinal: result.getValue({ name: "custrecord_ht_co_coberturafinal" }),
            IdEstadoInstalacion: result.getValue({ name: "custrecord_ht_co_estado" }) ? result.getValue({ name: "custrecord_ht_co_estado" }) : '0',
            EstadoInstalacion: result.getText({ name: "custrecord_ht_co_estado" }),
            CodFamiliaProducto: result.getValue({ name: "custrecord_ht_pp_codigo", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
            IdFamiliaProducto: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
            FamiliaProducto: result.getValue({ name: "name", join: "CUSTRECORD_HT_CO_FAMILIA_PROD" }),
            PlatPxAMi: result.getValue({ name: "custrecord_ht_co_udp_pla_px_ami" }),

            //AQUI
            IdNumeroDispositivoChaser: result.getValue({ name: "custrecord_ht_mc_seriedispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_seriedispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            NumeroDispositivo: result.getText({ name: "custrecord_ht_mc_seriedispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_seriedispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdModeloDispositivo: result.getValue({ name: "custrecord_ht_mc_modelo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_modelo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            ModeloDispositivo: result.getText({ name: "custrecord_ht_mc_modelo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_modelo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdTipoDispositivo: result.getValue({ name: "custrecord_ht_mc_tipodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_tipodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            TipoDispositivo: result.getText({ name: "custrecord_ht_mc_tipodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_tipodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdUnidad: result.getValue({ name: "custrecord_ht_mc_unidad", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_unidad", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            Unidad: result.getText({ name: "custrecord_ht_mc_unidad", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_unidad", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            Imei: result.getValue({ name: "custrecord_ht_mc_imei", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_imei", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            CelularSim: result.getText({ name: "custrecord_ht_mc_celularsimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_celularsimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            NoCelularSimCarg: result.getValue({ name: "custrecord_ht_mc_nocelularsim", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_nocelularsim", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            Ip: result.getValue({ name: "custrecord_ht_mc_ip", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_ip", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            APN: result.getValue({ name: "custrecord_ht_mc_apn", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_apn", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdOperadora: result.getValue({ name: "custrecord_ht_mc_operadora", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_operadora", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            Operadora: result.getText({ name: "custrecord_ht_mc_operadora", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_operadora", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            Vid: result.getValue({ name: "custrecord_ht_mc_vid", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_vid", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdFirmware: result.getValue({ name: "custrecord_ht_mc_firmware", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_firmware", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            Firmware: result.getText({ name: "custrecord_ht_mc_firmware", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_firmware", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdScript: result.getValue({ name: "custrecord_ht_mc_script", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_script", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            Script: result.getText({ name: "custrecord_ht_mc_script", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_script", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdServidor: result.getValue({ name: "custrecord_ht_mc_servidor", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_servidor", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            Servidor: result.getText({ name: "custrecord_ht_mc_servidor", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_servidor", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdSerieLojack: result.getValue({ name: "custrecord_ht_mc_seriedispositivolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_seriedispositivolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            SerieLojack: result.getText({ name: "custrecord_ht_mc_seriedispositivolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_seriedispositivolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            CodigoActivacion: result.getText({ name: "custrecord_ht_mc_codigoactivacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_codigoactivacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            CodigoRespuesta: result.getText({ name: "custrecord_ht_mc_codigorespuesta", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_codigorespuesta", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdEstadoSim: result.getValue({ name: "custrecord_ht_mc_estadosimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_estadosimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            EstadoSim: result.getText({ name: "custrecord_ht_mc_estadosimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_estadosimcard", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdEstadoLojack: result.getValue({ name: "custrecord_ht_mc_estadolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_estadolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            EstadoLojack: result.getText({ name: "custrecord_ht_mc_estadolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_estadolojack", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            IdEstadoChaser: result.getValue({ name: "custrecord_ht_mc_estadolodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_estadolodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,
            EstadoChaser: result.getText({ name: "custrecord_ht_mc_estadolodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getText({ name: "custrecord_ht_mc_estadolodispositivo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            ICC: result.getValue({ name: "custrecord_ht_mc_icc", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_icc", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            // FechaCreacionDispositivo: result.getValue({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '01/01/1900',
            FechaCreacionDispositivo: (result && result.getValue({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) && result.getValue({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }).trim() !== "") ? result.getValue({ name: "created", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '01/01/1900',

            NombreDispositivo: result.getValue({ name: "name", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "name", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            // Ubicacion: result.getValue({ name: "custrecord_ht_mc_ubicacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_ubicacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : '',
            Ubicacion: result.getValue({ name: "custrecord_ht_mc_ubicacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_ubicacion", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }).trim() : '',
            IdBienDt: result.getValue({ name: "custrecord_ht_mc_vehiculo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? result.getValue({ name: "custrecord_ht_mc_vehiculo", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) : 0,

            InacitvoDt: result.getValue({ name: "isinactive", join: "CUSTRECORD_HT_CO_NUMEROSERIEPRODUCTO" }) ? 'T' : 'F',
            IdTipoSim: IdtipoSim ? IdtipoSim : 0,
            TipoSim: Tiposimcard,
            FechaCorte: Fechacorte ? Fechacorte : '01/01/1900',
            IdEstadoConciliacion: IdestadoConciliacion ? IdestadoConciliacion : 0,
            EstadoConciliacion: EstadoConciliacion,
            SimCard: SimCard ? SimCard : 0,
            IdSim: IdSim ? IdSim : 0


          });
        });
      });

      return results[0];

    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }


  /**
   * Funciones adicionales para la renovacion por familia
   */
  const obtenerItemOS = (IdOs) => {
    let results = [];

    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["internalid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", "2"],
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "item" }),
          search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura" }),
          search.createColumn({ name: "custcol_ht_os_tiempo_cobertura" }),
          search.createColumn({ name: "custbody_ht_so_bien" }),
        ],
      });

      let searchResult = serviceOrderSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          results.push({
            iditem: result.getValue({ name: "item" }),
            unidad: result.getValue({ name: "custcol_ht_os_und_tiempo_cobertura" }),
            tiempo: result.getValue({ name: "custcol_ht_os_tiempo_cobertura" }),
            idbien: result.getValue({ name: "custbody_ht_so_bien" }),
          });
        });
      });

      return results;
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  };

  // Función para procesar los datos obtenidos de la orden de servicio
  const procesarDatosOS = (data) => {
    let results = [];
    let idVehiculo = 0;

    if (data.length > 0) {
      idVehiculo = data[0]?.idbien;
      for (let i = 0; i < data.length; i++) {
        const element = data[i].iditem;
        const unidad = data[i].unidad;
        const tiempo = data[i].tiempo;

        let AdpItem = obtenerInfItem(element, 109);  //SB 104 - PR 109
        let FamItem = obtenerInfItem(element, 130);  //SB 107 - PR 130
        let PpsItem = obtenerInfItem(element, 167);  //SB 113 - PR 167

        if (esItemValido(AdpItem, FamItem, PpsItem)) {
          results.push({
            iditem: element,
            unidad: unidad,
            tiempo: tiempo,
            AdpItem: AdpItem.custrecord_ht_pp_codigo,
            FamItem: FamItem.custrecord_ht_pp_codigo,
          });
        }
      }
    }

    return { items: results, idVehiculo };
  };

  // Función para obtener la información de un item
  function procesarItems(data) {

    log.debug("-------ProcesarItems---------", data);

    const equivalenciasUnidad = {
      '1': 365,  // 1 año = 365 días
      '2': 30,   // 1 mes = 30 días
      '3': 1     // 1 día = 1 día
    };

    const resultado = {};

    // Procesar cada item
    data.result.forEach(item => {
      let { unidad, tiempo, FamItem } = item;

      // Ignorar si la unidad es 4
      if (unidad === '4') return;

      // Convertir el tiempo a días según la unidad
      const tiempoEnDias = equivalenciasUnidad[unidad] * parseInt(tiempo, 10);

      // Sumar el tiempo al FamItem correspondiente
      if (!resultado[FamItem]) {
        resultado[FamItem] = tiempoEnDias;
      } else {
        resultado[FamItem] += tiempoEnDias;
      }
    });

    // Convertir el tiempo total a la unidad más adecuada
    const resultadoFinal = {};
    for (const adp in resultado) {
      let diasTotales = resultado[adp];
      let unidad, tiempo;

      // Determinar la unidad adecuada basada en días
      if (diasTotales >= 365 && diasTotales % 365 === 0) {
        unidad = 1; // Años
        tiempo = diasTotales / 365;
      } else if (diasTotales >= 30 && diasTotales % 30 === 0) {
        unidad = 2; // Meses
        tiempo = diasTotales / 30;
      } else {
        unidad = 3; // Días
        tiempo = diasTotales; // Quedan días
      }

      resultadoFinal[adp] = { unidad, tiempo };
    }

    return resultadoFinal;
  }

  // Función para calcular la diferencia de días entre dos fechas
  const calcularDiferenciaDias = (inicioCobertura, finCobertura) => {
    try {
      let inicio = new Date(inicioCobertura);
      let fin = new Date(finCobertura);

      if (isNaN(inicio) || isNaN(fin)) {
        throw new Error('Fecha inválida');
      }

      let diferenciaMilisegundos = fin - inicio;
      let milisegundosPorDia = 24 * 60 * 60 * 1000;

      return Math.floor(diferenciaMilisegundos / milisegundosPorDia);
    } catch (error) {
      log.error('Error al calcular la diferencia de días:', error.message);

      throw error;
    }
  };

  // Función para calcular la cobertura y generar el JSON correspondiente
  const calcularCoberturaYGenerarJsonRenovacion = (itemResult, infoCoberturaEncontrada, familiaConsulta, idVehiculo, idOs, requestBody) => {

    const esReverso = requestBody.esReverso === "Si";

    // Determinar la fecha base de la cobertura según si es reverso o no
    let fechaBase = esReverso ? infoCoberturaEncontrada.coberturaInicial : infoCoberturaEncontrada.coberturaFinal;

    // Calcular cobertura
    let coberturaCalculada = CalcularCobertura(
      parseInt(itemResult.tiempo),
      parseInt(itemResult.unidad),
      fechaBase,
      esReverso // Indica si es reverso (true si no lo es)
    );

    log.debug("------------CoberturaCalculada-", coberturaCalculada);

    // Calcular diferencia de días
    const diferenciaDias = calcularDiferenciaDias(coberturaCalculada.coberturaInicial, coberturaCalculada.coberturaFinal);

    coberturaCalculada.accion = "Renovacion";

    // Generar JSON
    return CrearJson(infoCoberturaEncontrada, coberturaCalculada, familiaConsulta, idVehiculo, diferenciaDias, idOs);
  };

  // 17/10/2024
  const obtenerInfItem = (id, param) => {
    try {

      if (!id || !param) {
        return
      }

      let sqlQuery = `
            SELECT 	VAL.custrecord_ht_pp_codigo, VAL.custrecord_ht_pp_descripcion
            FROM 	customrecord_ht_pp_main_param_prod rel,
                CUSTOMRECORD_HT_CR_PP_VALORES val
            WHERE 	rel.custrecord_ht_pp_parametrizacion_valor = val.id
            AND 	rel.custrecord_ht_pp_parametrizacion_rela = ${param}
            and		rel.isinactive = 'F'
            and		val.isinactive = 'F' 
            and 	REL.custrecord_ht_pp_parametrizacionid = ${id} 
            `;
      var resultSet = query.runSuiteQL({
        query: sqlQuery,
      });

      let results = resultSet.asMappedResults();

      if (!results) {
        return [];
      } else {
        for (let obj of results) {
          for (let key in obj) {
            if (typeof obj[key] === 'string') {
              obj[key] = obj[key].replace(/\n/g, " ");
            } else {
              obj[key] = obj[key] === null ? "" : obj[key];
            }
          }
        }
        return results[0];
      }

    } catch (error) {
      log.error("Error obtenerInfItemFamilia", { error: error.message, stack: error.stack });
      return [];
    }
  };

  // Función para validar si el ítem es correcto
  const esItemValido = (AdpItem, FamItem, PpsItem) => {
    return (
      AdpItem !== undefined &&
      FamItem !== undefined &&
      PpsItem?.custrecord_ht_pp_codigo == "S" &&
      (AdpItem.custrecord_ht_pp_codigo == "008" ||
        AdpItem.custrecord_ht_pp_codigo == "004" ||
        AdpItem.custrecord_ht_pp_codigo == "009")
    );
  };


  const CalcularCobertura = (Cantidad, UnidadTiempo, Fecha, esReverso = false) => {
    if (
      (Cantidad == 0 && UnidadTiempo == 0 && Fecha == "01/01/1900") ||
      (!Cantidad && !UnidadTiempo) || (UnidadTiempo > 3) || (UnidadTiempo < 1)
    ) {
      return {
        coberturaInicial: "01/01/1900",
        coberturaFinal: "01/01/1900",
      };
    }

    // Desglosa la fecha en día, mes y año, y crea un objeto Date con la hora 22:00:00
    let [day, month, year] = Fecha.split("/");
    let date_final = new Date(Date.UTC(year, month - 1, day, 22, 0, 0));
    const fechaInicial = new Date(date_final);

    const esBisiesto = (year) => {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    };

    try {

      if (esReverso) {
        switch (UnidadTiempo) {
          case 1: // Año
            date_final.setUTCFullYear(
              date_final.getUTCFullYear() - parseInt(Cantidad)
            );
            break;
          case 3: // Día
            date_final.setUTCDate(date_final.getUTCDate() - parseInt(Cantidad));
            break;
          default: // Mes
            date_final.setUTCMonth(date_final.getUTCMonth() - parseInt(Cantidad));
            break;
        }
      } else {
        switch (UnidadTiempo) {
          case 1: // Año
            date_final.setUTCFullYear(
              date_final.getUTCFullYear() + parseInt(Cantidad)
            );
            break;
          case 3: // Día
            date_final.setUTCDate(date_final.getUTCDate() + parseInt(Cantidad));
            break;
          default: // Mes
            date_final.setUTCMonth(date_final.getUTCMonth() + parseInt(Cantidad));
            break;
        }
      }

      // Ajustar para años bisiestos y no bisiestos
      if (
        date_final.getUTCMonth() === 1 &&
        date_final.getUTCDate() === 29 &&
        !esBisiesto(date_final.getUTCFullYear())
      ) {
        date_final.setUTCDate(28);
      }

      if (esReverso) {
        return {
          coberturaInicial: date_final.toISOString(),
          coberturaFinal: fechaInicial.toISOString()
        };
      } else {
        return {
          coberturaInicial: fechaInicial.toISOString(),
          coberturaFinal: date_final.toISOString(),
        };
      }

    } catch (e) {
      log.error("Error en CalcularCobertura", e);
      return {};
    }
  }; //!! CalcularCobertura

  const validarFecha = (fecha) => {
    const regex = /^\d{4}\/\d{2}\/\d{2}$/;
    const mensajeFormatoCorrecto = "El formato correcto es yyyy/mm/dd.";

    // Verifica si la fecha cumple con el formato yyyy/mm/dd
    if (!regex.test(fecha)) {
      return {
        valido: false,
        mensaje: `La fecha ${fecha} no cumple con el formato correcto. ${mensajeFormatoCorrecto}`
      };
    }

    // Divide la fecha en año, mes y día
    const [año, mes, dia] = fecha.split('/').map(Number);
    const fechaObjeto = new Date(año, mes - 1, dia);

    // Verifica si la fecha es válida
    if (fechaObjeto.getFullYear() !== año || fechaObjeto.getMonth() !== mes - 1 || fechaObjeto.getDate() !== dia) {
      return {
        valido: false,
        mensaje: `La fecha ${fecha} no es una fecha válida. ${mensajeFormatoCorrecto}`
      };
    }

    // La fecha es válida
    return {
      valido: true,
      mensaje: `La fecha ${fecha} es válida.`
    };
  };

  const validarYConvertirFecha = (fecha) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    const mensajeFormatoCorrecto = "El formato correcto es dd/mm/yyyy.";

    // Verifica si la fecha cumple con el formato dd/mm/yyyy
    if (!regex.test(fecha)) {
      return {
        valido: false,
        mensaje: `La fecha ${fecha} no cumple con el formato correcto. ${mensajeFormatoCorrecto}`
      };
    }

    // Divide la fecha en día, mes y año
    const [dia, mes, año] = fecha.split('/').map(Number);

    // Verifica si la fecha es válida
    const fechaObjeto = new Date(año, mes - 1, dia);
    if (fechaObjeto.getFullYear() !== año || fechaObjeto.getMonth() !== mes - 1 || fechaObjeto.getDate() !== dia) {
      return {
        valido: false,
        mensaje: `La fecha ${fecha} no es una fecha válida. ${mensajeFormatoCorrecto}`
      };
    }

    // Devuelve la fecha en el formato yyyy/mm/dd
    const fechaConvertida = `${año}/${String(mes).padStart(2, '0')}/${String(dia).padStart(2, '0')}`;
    return {
      valido: true,
      fechaConvertida: fechaConvertida
    };
  };

  function ObtenerIDVehiculoSysID(IdVehiculo) {

    let results = [];
    try {
      let VehiculoSearch = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
          ["custrecord_ht_bien_codsysh", "is", IdVehiculo],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "custrecord_ht_bien_codsysh" }),
        ],
      });

      let searchResult = VehiculoSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {

          results.push({
            id: result.getValue({ name: "internalid" }),
          });
        });
      });

      if (results.length > 0) {
        return results[0].id;
      } else {
        throw new Error("No se encontró el vehículo");
      }

    } catch (error) {
      log.debug("error", { error: error, stack: error.stack });
      return 0;
    }

  }

  function ObtenerHTMonitoreo(idOs, idVehiculo) {
    let results = [];

    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["internalid", "is", idOs],
          "AND",
          ["subsidiary", "anyof", "2"], // Subsidiaria.
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["custbody_ht_so_bien", "anyof", idVehiculo],
          "AND",
          // TaxItem
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "displayname", join: "item" }),
          search.createColumn({ name: "internalid", join: "item" }),
          search.createColumn({ name: "entity" }),
          search.createColumn({ name: "custcol_ht_os_cliente_monitoreo" }),
          search.createColumn({ name: "custcol_ht_os_cliente" }),
        ],
      });

      let searchResult = serviceOrderSearch.runPaged();

      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          results.push({
            internalidOs: result.getValue({ name: "internalid" }),
            displayname: result.getValue({ name: "displayname", join: "item" }),
            internalidItem: result.getValue({ name: "internalid", join: "item" }),
            clienteOs: result.getValue({ name: "entity" }),
            clienteMonitoreo: result.getValue({ name: "custcol_ht_os_cliente_monitoreo" }),
            clienteHt: result.getValue({ name: "custcol_ht_os_cliente" }),
          });
        });
      });

      if (results.length > 0) {
        return results[0];
      }
      return {};

    } catch (error) {
      log.debug("error", error);
      return [];
    }


  }


  function ActualizarPropietarioBien(idVehiculo, IDPropietario) {
    try {
      record.submitFields({
        type: "customrecord_ht_record_bienes",
        id: idVehiculo,
        values: {
          custrecord_ht_bien_propietario: IDPropietario,
          custrecord_ht_bien_estadoconvenio: 3
        },
      });
    } catch (error) {
      log.debug("Error ActualizarPropietarioBien", { error: error, stack: error.stack });
      return;
    }
  }

  const procesaLogCobertura = (registro, respuesta, estado) => {

    // ! Crear registro de log
    log.debug("procesaLogCobertura", registro);

    try {
      const logRecord = record.create({
        type: "customrecord_ven_log_cobertura_generada",
        isDynamic: true,
      });
      logRecord.setValue("custrecord_traza_cobe_generada", registro);
      logRecord.setValue("custrecord_familia_producto_cobertura_re", registro.familia);
      logRecord.setValue("custrecord_accion_cobertura_restlet", registro.accion);

      logRecord.setValue("custrecord_fecha_inicio_cobertura_restle", new Date(registro.fechaInicio));
      logRecord.setValue("custrecordfecha_fin_cobertura_restlet", new Date(registro.fechafin));

      if (registro.idbien != 0) {
        logRecord.setValue("custrecord_id_bien_cobertura_restlet", registro.idbien);
      }
      logRecord.setValue("custrecord_mensaje_cobe_generada", respuesta);
      logRecord.setValue("custrecord_codigo_syshunter_cobe", registro.codVehiculo);

      logRecord.setValue("custrecord_procesado_cobertura_generada", estado);

      return logRecord.save({
        enableSourcing: false,
        ignoreMandatoryFields: true,
      });

    } catch (error) {
      log.error("Error actualizando el registro", { error: error, stack: error.stack });
    }
  };

  function evaluarFechaParaEstadoCobertura(fechaInicial, fechaFinal) {

    // Configurar la zona horaria de Ecuador
    const zonaHorariaEcuador = 'America/Guayaquil';

    // Obtener la fecha actual en la zona horaria de Ecuador
    let fechaActual = new Date(new Date().toLocaleString("en-US", { timeZone: zonaHorariaEcuador }));
    fechaActual.setDate(fechaActual.getDate() - 3);

    // Convertir fechaFinal del formato "YYYY/MM/DD" a un objeto Date
    const [anioFinal, mesFinal, diaFinal] = fechaFinal.split('/').map(Number);
    const fechaFinalObj = new Date(Date.UTC(anioFinal, mesFinal - 1, diaFinal));

    // Comparar fechas
    if (fechaFinalObj < fechaActual) {
      return 2; // Fecha final es menor a la fecha actual
    } else {
      return 1; // Fecha final es mayor o igual a la fecha actual
    }
  }

  function ValidacionFechaActualActualizacion(results, requestBody) {
    try {
      // Ordenar los resultados por fecha de cobertura final (de más reciente a más antigua)
      const coberturasOrdenadas = results.sort((a, b) => {
        const fechaFinalA = new Date(a.coberturafinal.split("/").reverse().join("-"));
        const fechaFinalB = new Date(b.coberturafinal.split("/").reverse().join("-"));
        return fechaFinalB - fechaFinalA;
      });

      // Verificar que todos los propietarios sean iguales
      const propietariosUnicos = new Set(results.map(cobertura => cobertura.propietario));
      if (propietariosUnicos.size > 1) {
        throw new Error(`Los propietarios de la coberturas son diferentes`);
      }

      // Verificar que todos los valores de cliente monitoreo sean iguales
      const clientesMonitoreoUnicos = new Set(results.map(cobertura => cobertura.clientemonitoreo));
      if (clientesMonitoreoUnicos.size > 1) {
        throw new Error("El ClienteMonitoreo de la coberturas son diferentes");
      }

      // Verificar que todos los valores de estado de cobertura sean iguales
      const estadosCoberturaUnicos = new Set(results.map(cobertura => cobertura.estado_cobertura));
      if (estadosCoberturaUnicos.size > 1) {
        throw new Error(`Los estados de la coberturas son diferentes`);
      }

      // Obtener la cobertura más reciente
      const coberturaMasReciente = coberturasOrdenadas[0];

      // Validar si la fecha de inicio en el request tiene sentido
      const fechaInicioRequest = new Date(requestBody.fechaInicio.split("/").join("-"));
      const fechaFinalReciente = new Date(coberturaMasReciente.coberturafinal.split("/").reverse().join("-"));

      // Validar si la fecha final de la cobertura más reciente es menor que la fecha de inicio en el request
      if (fechaFinalReciente.getTime() > fechaInicioRequest.getTime()) {
        throw new Error("Los valores de fecha de la coberturas son diferentes");
      }

      // Identificar las coberturas que serán eliminadas
      const coberturasParaEliminar = coberturasOrdenadas.slice(1); // Todas menos la más reciente

      // Retornar resultados
      return {
        coberturaMasReciente,
        coberturasParaEliminar
      };

    } catch (error) {
      log.debug("Error ValidacionFechaActualActualizacion", { error: error.message, stack: error.stack });
      throw new Error(error.message);
    }
  }

  function ConsultaSimCard(Parametro) {
    try {
      let Resultado = [];
      const searchObj = search.create({
        type: "customrecord_ht_record_detallechasersim",
        filters: [
          ["name", "is", Parametro]
        ],
        columns: [
          "custrecord_ht_ds_simcard",
          "custrecord_ht_ds_serie",
          "custrecord_ht_ds_tiposimcard",
          "custrecord_ht_ds_fechacorte",
          "custrecord_ht_ds_icc",
          "custrecord_ht_ds_estado_conciliacion",
          "name",
          "internalid"

        ]
      });

      const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

      if (searchResult.length > 0) {
        const result = searchResult[0];
        Resultado.push({
          Simcard: result.getText("custrecord_ht_ds_simcard"),
          Serie: result.getValue("custrecord_ht_ds_serie"),
          Idtiposimcard: result.getValue("custrecord_ht_ds_tiposimcard"),
          Tiposimcard: result.getText("custrecord_ht_ds_tiposimcard"),
          Fechacorte: result.getValue("custrecord_ht_ds_fechacorte"),
          Icc: result.getValue("custrecord_ht_ds_icc"),
          Idestadoconciliacion: result.getValue("custrecord_ht_ds_estado_conciliacion"),
          Estadoconciliacion: result.getText("custrecord_ht_ds_estado_conciliacion"),
          Name: result.getValue("name"),
          Internalid: result.getValue("internalid"),
        });

      }

      return Resultado;
    } catch (error) {
      log.error('error', error);
      //return JSON.stringify({error: error.message});
      return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaSimCard)';
    }
  }

  const crearRegistroImpulso = (cobertura, requestFile, responseFile, respuesta, Plataforma) => {
    // Guardar Registro de traza
    try {
      let objRecord = record.create({ type: 'customrecord_ht_ct_traza_impulso_platafo', isDynamic: true });
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_cobertura', value: cobertura });                       // ID Cobertura 
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_impulso', value: 5 });                                 // ID del impulso
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_plataforma', value: Plataforma });                     // Plataforma -> PX
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_estado', value: 'Enviado' });                          // Estado -> enviado
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_envio', value: requestFile });                   // Documento 
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_trama_respuesta', value: responseFile });              // Documento
      objRecord.setValue({ fieldId: 'custrecord_ht_ip_respuesta', value: respuesta });                       // Documento

      let saveRecord = objRecord.save();
      // log.debug('Registro guardado con ID', saveRecord);
    } catch (error) {
      log.error('Error al crear el registro de traza', { error: error.message, stack: error.stack });
    }
  };

  const fechaSistema = () => {
    let date = new Date();
    let tdate = date.getDate();
    tdate = tdate < 10 ? `0${tdate}` : tdate;
    let month = date.getMonth() + 1;
    month = month < 10 ? `0${month}` : month;
    let year = date.getFullYear();
    let hours = date.getHours();
    hours = hours < 10 ? `0${hours}` : hours;
    let minutes = date.getMinutes();
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${tdate}${month}${year}${hours}${minutes}`;
  };

  const saveJson = (contents, nombre, folder) => {
    let fecha = fechaSistema();
    let fileObj = file.create({
      name: `${nombre}_${fecha}.json`,
      fileType: file.Type.JSON,
      contents: JSON.stringify(contents),
      folder: folder,
      isOnline: false
    });
    return fileObj.save();
  };

  const sysDateTime = () => {
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const rand2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${rand}_${rand2}`;
  };

  function generarLogCambioEstado(context, registroID, EstadoProcesado, Ajuste) {
    try {

      let objRecord = record.create({ type: 'customrecord_log_proceso_general', isDynamic: true });
      objRecord.setValue({ fieldId: 'custrecordlog_proceso_general_proceso', value: Ajuste });
      objRecord.setValue({ fieldId: 'custrecord_log_proceso_general_traza', value: JSON.stringify(context) });
      objRecord.setValue({ fieldId: 'custrecordid_registro_proc_general', value: registroID || 0 });
      objRecord.setValue({ fieldId: 'custrecord_producto_lpc', value: EstadoProcesado });
      objRecord.save();

    } catch (error) {
      log.error('Error en generarLogCambioEstado', error);
    }
  }


  function generarMensaje(dataJsonFin) {

    try {
      if (!dataJsonFin || dataJsonFin.length === 0) return "";

      const detalle = dataJsonFin
        .map(item => `${item.nrodoc} - Cuota ${item.cuota} - ${item.orden}`)
        .join(", ");

      return `Fin Reversadas ${detalle}`;

    } catch (error) {
      return `Reverso Factura Interna`;
    }
  }


  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete
  }

});