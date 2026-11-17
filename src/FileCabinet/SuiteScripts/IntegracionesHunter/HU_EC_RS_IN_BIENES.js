/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/log','N/record','N/search', './UtilsGeneral/HU_EC_CONSTANTES'], function(log, record, search, _const) {
    const LONGITUD_PAGINA = 25;
    var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC;

    function _get(context){      
        try{
            let ResultadoConsulta = [];
            let OpcionConsulta = context.opcion;
            let CodVehiculo = '';
            let IdInternoVehiculo = 0;
            let IdCliente = '';
            let IdInternoCliente = 0;
            let PaginaId = 0;
            let Criterio = '';
            let TipoBien = '';

			if (typeof context.codigovehiculo != 'undefined') {
				if (context.codigovehiculo.length != 0) {
					CodVehiculo = context.codigovehiculo;
				}
            }

			if (typeof context.idvehiculo != 'undefined') {
				if (context.idvehiculo.length != 0) {
					IdInternoVehiculo = context.idvehiculo;
				}
            }

			if (typeof context.codigocliente != 'undefined') {
				if (context.codigocliente.length != 0) {
					IdCliente = context.codigocliente;
				}
            }

			if (typeof context.idcliente != 'undefined') {
				if (context.idcliente.length != 0) {
					IdInternoCliente = context.idcliente;
				}
            }

			if (typeof context.indice != 'undefined') {
				if (context.indice.length != 0) {
					PaginaId = context.indice;
				}
            }

			if (typeof context.criterio != 'undefined') {
				if (context.criterio.length != 0) {
					Criterio = context.criterio;
				}
            }

			if (typeof context.tipobien != 'undefined') {
				if (context.tipobien.length != 0) {
					TipoBien = context.tipobien;
				}
            }

            switch (OpcionConsulta) {
                case "100":
                    ResultadoConsulta = ConsultaVehiculo(CodVehiculo, IdInternoVehiculo, IdCliente, IdInternoCliente, PaginaId, Criterio, TipoBien);
                    break;
                case "101":
                    ResultadoConsulta = ConsultaVehiculoResumido(CodVehiculo, IdInternoVehiculo, IdCliente, IdInternoCliente, PaginaId, Criterio, TipoBien);
                    break;
                case "102":
                    ResultadoConsulta = ConsultaVehiculoCliente(CodVehiculo, IdInternoVehiculo, IdCliente, IdInternoCliente, PaginaId, Criterio, TipoBien);
                    break;
                default: 
                    return 'id:400, opcion no valida';
            }

            return ResultadoConsulta;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado.';
        }
    }

   function _post(context) {
        try {
                let Opcion = context.opcion;
                let CodVehiculo = '';
                let IdInternoVehiculo = 0;

                if (typeof context.codigovehiculo != 'undefined') {
                    if (context.codigovehiculo.length != 0) {
                        CodVehiculo = context.codigovehiculo;
                    }
                }
    
                if (typeof context.idvehiculo != 'undefined') {
                    if (context.idvehiculo.length != 0) {
                        IdInternoVehiculo = context.idvehiculo;
                    }
                }

                switch (Opcion) {
                    case "PASO_VEHICULO":
                        ResultadoConsulta = ConsultaVehiculoPasoSyshunter(CodVehiculo, IdInternoVehiculo);
                        break;

                    default: 

                    return 'id:400, opcion no valida';
                }

                return ResultadoConsulta;

            } catch (error) {
                log.error('error', error.message);
                return 'id:400, No se pudo insertar el registro. Error controlado.';
            }
   }


    function ConsultaVehiculo(CodVehiculo, IdVeh, Identificacion, IdCli, PaginaId, NsCriterio, NsTipoBien){
        try{
         
            let conteoPagina = '';
            let filtro = [
                 ["custrecord_bn_subsidiaria","anyof",GlobalSubsidiaria], "AND", //20250415
                ["formulatext: CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_bien_chasis},{custrecord_ht_bien_motor}),{custrecord_ht_bien_placa}),{custrecord_ht_bien_marca}),{custrecord_ht_bien_modelo})","contains",NsCriterio]
            ];

            let Busqueda = search.create({
                type: 'customrecord_ht_record_bienes',
                filters: filtro,
                columns:
                [
                   search.createColumn({name: "name", label: "ID"}),
                   search.createColumn({name: "altname", label: "Nombre"}),
                   search.createColumn({name: "scriptid", label: "ID de script"}),
                   search.createColumn({
                      name: "entityid",
                      join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                      label: "ID"
                   }),
                   search.createColumn({
                      name: "custrecord_ht_bien_propietario",
                      sort: search.Sort.ASC,
                      label: "Cliente"
                   }),
                   search.createColumn({
                    name: "vatregnumber",
                    join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                    label: "Cedula/Ruc"
                    }),
                  
                    search.createColumn({name: "internalid", label: "Id Interno"}),
                    search.createColumn({name: "custrecord_ht_bien_tipobien", label: "Tipo de bien"}),
                    search.createColumn({name: "custrecord_ht_bien_tipoterrestre", label: "Tipo terrestre"}),
                    search.createColumn({name: "custrecord_ht_bien_placa", label: "Placa"}),
                    search.createColumn({name: "custrecord_ht_bn_tipoorigen", label: "Tipo de Origen"}),
                    search.createColumn({name: "custrecord_ht_bien_motor", label: "Motor"}),
                    search.createColumn({name: "custrecord_ht_bien_marca", label: "Marca"}),
                    search.createColumn({name: "custrecord_ht_bien_modelo", label: "Modelo"}), 
                    //search.createColumn({name: "custrecord_ht_mod_descripcion", label: "Modelo"}),xx
                    //search.createColumn({name: "name", label: "Modelo"}),
                  
                    search.createColumn({name: "custrecord_ht_bien_chasis", label: "Chasis"}),
                    search.createColumn({name: "custrecord_ht_bien_tipo", label: "Tipo"}),
                    search.createColumn({name: "custrecord_ht_bien_transmision", label: "Transmision"}),
                    search.createColumn({name: "custrecord_ht_bien_caractadicional", label: "Caracteristica adicional"}),
                    search.createColumn({name: "custrecord_ht_bien_colorcarseg", label: "Color Carseg"}),
                    search.createColumn({name: "custrecord_ht_bien_colorfabricante", label: "Color fabricante"}),
                    search.createColumn({name: "custrecord_ht_bien_colormatricula", label: "Color matricula"}),
                    search.createColumn({name: "custrecord_bien_version", label: "Version"}),
                    search.createColumn({name: "custrecord_ht_bien_tipocabina", label: "Tipo cabina"}),
                    search.createColumn({name: "custrecord_ht_bien_cilindraje", label: "Cilindraje"}),
                    search.createColumn({name: "custrecord_ht_bien_traccion", label: "Traccion"}),
                    search.createColumn({name: "custrecord_ht_bien_tipoflota", label: "Cod.Tipo Flota"}),
                    search.createColumn({name: "custrecord_ht_bien_ano", label: "Anio"}),
                    search.createColumn({name: "custrecord_ht_bien_clave", label: "Clave"}),
                    search.createColumn({name: "custrecord_ht_bien_recorrido", label: "Recorrido"}),
                    search.createColumn({name: "custrecord_ht_bien_usovehiculo", label: "Uso de vehiculo"}),
                    search.createColumn({name: "custrecord_ht_bien_oficina", label: "Oficina"}),
                    search.createColumn({name: "custrecord_ht_bien_formapago", label: "Forma de pago"}),
                    search.createColumn({name: "custrecord_ht_bien_conductor", label: "Conductor"}),
                    search.createColumn({name: "custrecord_ht_bien_consesionarios", label: "Concesionarios"}),
                    search.createColumn({name: "custrecord_ht_bien_companiaseguros", label: "Aseguradora"}),
                    search.createColumn({name: "custrecord_ht_bien_financiadovehiculo", label: "Financiera"}),
                    search.createColumn({name: "custrecord_ht_bn_cooperativaasociacion", label: "Cooperativa / Asociacion"}),
                    search.createColumn({name: "custrecord_ht_bien_conveniovehiculo", label: "Convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_estadoconvenio", label: "Estado convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_orden_serv_convenio", label: "Orden de Servicio Convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_seguimiento", label: "Seguimiento"})
                ]
            });

            if (CodVehiculo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_codsysh', 
                operator: search.Operator.IS,
                values: CodVehiculo
                }));
            }

            if (IdVeh != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.ANYOF,
                values: IdVeh
                }));
            }

            if (Identificacion != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'vatregnumber', 
                  join: 'CUSTRECORD_HT_BIEN_PROPIETARIO',
                operator: search.Operator.CONTAINS,
                values: Identificacion
                }));
            }

            if (IdCli != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_propietario', 
                operator: search.Operator.IS,
                values: IdCli
                }));
            }

            if (NsTipoBien != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_tipobien', 
                operator: search.Operator.IS,
                values: NsTipoBien
                }));
            }
          
            let ObjResultado = [];
            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            //for (let i in ResConsulta) {
            if (ResultadoConsulta.count != 0) {
                let ResPagina= ResultadoConsulta.fetch({index: PaginaId});
                ResPagina.data.forEach(function (ResConsulta) {

                    let internalid = ResConsulta.getValue({name: 'internalid'});
                    let Vehiculo= ResConsulta.getValue({name: 'name'});
                    let VehiculoNombre= ResConsulta.getValue({name: 'altname'});
                    let Script = ResConsulta.getValue({name: 'scriptid'});
                    let IdCliente = ResConsulta.getValue({name: 'custrecord_ht_bien_propietario'});
                    let NumIdentificacion = ResConsulta.getValue({name: 'entityid', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});
                    let Cedula_Ruc = ResConsulta.getValue({name: 'vatregnumber', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});                    
                    let NombreCliente = ResConsulta.getText({name: 'custrecord_ht_bien_propietario'});

                    let IdTipoBien= ResConsulta.getValue({name: 'custrecord_ht_bien_tipobien'});
                    let TipoBien= ResConsulta.getText({name: 'custrecord_ht_bien_tipobien'});

                    let IdTipoTerrestre= ResConsulta.getValue({name: 'custrecord_ht_bien_tipoterrestre'});
                    let TipoTerrestre= ResConsulta.getText({name: 'custrecord_ht_bien_tipoterrestre'});
                    let Placa= ResConsulta.getValue({name: 'custrecord_ht_bien_placa'});
                    let IdOrigen= ResConsulta.getValue({name: 'custrecord_ht_bn_tipoorigen'});
                    let Origen= ResConsulta.getText({name: 'custrecord_ht_bn_tipoorigen'});
                    let Motor= ResConsulta.getValue({name: 'custrecord_ht_bien_motor'});
                    let IdMarca= ResConsulta.getValue({name: 'custrecord_ht_bien_marca'});
                    let Marca= ResConsulta.getText({name: 'custrecord_ht_bien_marca'});
                    let IdModelo= ResConsulta.getValue({name: 'custrecord_ht_bien_modelo'});
                    let Modelo= ResConsulta.getText({name: 'custrecord_ht_bien_modelo'});
                    
                    //let IdModelo= ResConsulta.getValue({name: 'name'});
                    //let Modelo= ResConsulta.getText({name: 'name'});
                    let Chasis = ResConsulta.getValue({name: 'custrecord_ht_bien_chasis'});
                    let IdTipo= ResConsulta.getValue({name: 'custrecord_ht_bien_tipo'});
                    let Tipo= ResConsulta.getText({name: 'custrecord_ht_bien_tipo'});
                    let IdTransmision= ResConsulta.getValue({name: 'custrecord_ht_bien_transmision'});
                    let Transmision= ResConsulta.getText({name: 'custrecord_ht_bien_transmision'});
                    let IdCaracteristica= ResConsulta.getValue({name: 'custrecord_ht_bien_caractadicional'});
                    let Caracteristica= ResConsulta.getText({name: 'custrecord_ht_bien_caractadicional'});
                    let IdColorCarseg= ResConsulta.getValue({name: 'custrecord_ht_bien_colorcarseg'});
                    let ColorCarseg= ResConsulta.getText({name: 'custrecord_ht_bien_colorcarseg'});
                    let IdColorFabricante= ResConsulta.getValue({name: 'custrecord_ht_bien_colorfabricante'});
                    let ColorFabricante= ResConsulta.getText({name: 'custrecord_ht_bien_colorfabricante'});
                    let IdColorMatricula= ResConsulta.getValue({name: 'custrecord_ht_bien_colormatricula'});
                    let ColorMatricula= ResConsulta.getText({name: 'custrecord_ht_bien_colormatricula'});
                    let IdVersion= ResConsulta.getValue({name: 'custrecord_bien_version'});
                    let Version= ResConsulta.getText({name: 'custrecord_bien_version'});
                    let IdTipoCabina= ResConsulta.getValue({name: 'custrecord_ht_bien_tipocabina'});
                    let TipoCabina= ResConsulta.getText({name: 'custrecord_ht_bien_tipocabina'});
                    let IdCilindraje= ResConsulta.getValue({name: 'custrecord_ht_bien_cilindraje'});
                    let Cilindraje= ResConsulta.getValue({name: 'custrecord_ht_bien_cilindraje'});
                    let IdTraccion= ResConsulta.getValue({name: 'custrecord_ht_bien_traccion'});
                    let Traccion= ResConsulta.getText({name: 'custrecord_ht_bien_traccion'});
                    let IdTipoFlota= ResConsulta.getValue({name: 'custrecord_ht_bien_tipoflota'});
                    let TipoFlota= ResConsulta.getText({name: 'custrecord_ht_bien_tipoflota'});
                    let Anio= ResConsulta.getValue({name: 'custrecord_ht_bien_ano'});
                    let Clave= ResConsulta.getValue({name: 'custrecord_ht_bien_clave'});
                    let IdRecorrido= ResConsulta.getValue({name: 'custrecord_ht_bien_recorrido'});
                    let Recorrido= ResConsulta.getText({name: 'custrecord_ht_bien_recorrido'});
                    let IdUsoVehicular= ResConsulta.getValue({name: 'custrecord_ht_bien_usovehiculo'});
                    let UsoVehicular= ResConsulta.getText({name: 'custrecord_ht_bien_usovehiculo'});
                    let IdOFicina= ResConsulta.getValue({name: 'custrecord_ht_bien_oficina'}) || "0";
                    let OFicina= ResConsulta.getText({name: 'custrecord_ht_bien_oficina'});
                    let IdFormaPago= ResConsulta.getValue({name: 'custrecord_ht_bien_formapago'});
                    let FormaPago= ResConsulta.getText({name: 'custrecord_ht_bien_formapago'});
                    let IdConductor= ResConsulta.getValue({name: 'custrecord_ht_bien_conductor'});
                    let Conductor= ResConsulta.getText({name: 'custrecord_ht_bien_conductor'});
                    let IdConcesionario= ResConsulta.getValue({name: 'custrecord_ht_bien_consesionarios'});
                    let Concesionario= ResConsulta.getText({name: 'custrecord_ht_bien_consesionarios'});
                    let IdAseguradora= ResConsulta.getValue({name: 'custrecord_ht_bien_companiaseguros'});
                    let Aseguradora= ResConsulta.getText({name: 'custrecord_ht_bien_companiaseguros'});
                    let IdFinanciera = ResConsulta.getValue({name: 'custrecord_ht_bien_financiadovehiculo'});
                    let Financiera = ResConsulta.getText({name: 'custrecord_ht_bien_financiadovehiculo'});
                    let IdCopAsociacion= ResConsulta.getValue({name: 'custrecord_ht_bn_cooperativaasociacion'});
                    let CopAsociacion= ResConsulta.getText({name: 'custrecord_ht_bn_cooperativaasociacion'});
                    let IdConvenio= ResConsulta.getValue({name: 'custrecord_ht_bien_conveniovehiculo'});
                    let Convenio= ResConsulta.getText({name: 'custrecord_ht_bien_conveniovehiculo'});
                    let EstadoConvenio= ResConsulta.getValue({name: 'custrecord_ht_bien_estadoconvenio'});
                    let OSConvenio= ResConsulta.getValue({name: 'custrecord_ht_bien_orden_serv_convenio'});
                    let seguimiento= ResConsulta.getValue({name: 'custrecord_ht_bien_seguimiento'});
                  


                    ObjResultado.push({
                        IdVehiculo: internalid,
                        CodigoVehiculo: Vehiculo,
                        VehiculoNombre: VehiculoNombre,
                        Script: Script,
                        IdCliente: IdCliente,
                        NumIdentificacion: NumIdentificacion,
                        Cedula_Ruc: Cedula_Ruc,
                        NombreCliente: NombreCliente,
                        IdTipoBien: IdTipoBien,
                        TipoBien: TipoBien,
                        IdTipoTerrestre: IdTipoTerrestre,
                        TipoTerrestre:TipoTerrestre,
                        Placa: Placa,
                        IdOrigen: IdOrigen,
                        Origen: Origen,
                        Motor: Motor,
                        IdMarca: IdMarca,
                        Marca: Marca,
                        IdModelo: IdModelo,
                        Modelo: Modelo.replace(/,/g, ' '),
                        //Modelo1: Modelo1,
                        Chasis: Chasis,
                        IdTipo: IdTipo,
                        Tipo: Tipo,
                        IdTransmision: IdTransmision,
                        Transmision: Transmision,
                        IdCaracteristica: IdCaracteristica,
                        Caracteristica: Caracteristica,
                        IdColorCarseg: IdColorCarseg,
                        ColorCarseg: ColorCarseg,
                        IdColorFabricante: IdColorFabricante,
                        ColorFabricante:ColorFabricante,
                        IdColorMatricula: IdColorMatricula,
                        ColorMatricula: ColorMatricula,
                        IdVersion:IdVersion,
                        Version: Version,
                        IdTipoCabina: IdTipoCabina,
                        TipoCabina: TipoCabina,
                        IdCilindraje: IdCilindraje,
                        Cilindraje: Cilindraje,
                        IdTraccion: IdTraccion,
                        Traccion: Traccion,
                        IdTipoFlota: IdTipoFlota,
                        TipoFlota: TipoFlota,
                        Anio: Anio,
                        Clave: Clave,
                        IdRecorrido: IdRecorrido,
                        Recorrido: Recorrido,
                        IdUsoVehicular: IdUsoVehicular,
                        UsoVehicular: UsoVehicular,
                        IdOFicina: IdOFicina,
                        OFicina: OFicina,
                        IdFormaPago: IdFormaPago,
                        FormaPago: FormaPago,
                        IdConductor: IdConductor,
                        Conductor: Conductor,
                        IdConcesionario: IdConcesionario,
                        Concesionario: Concesionario,
                        IdAseguradora: IdAseguradora,
                        Aseguradora: Aseguradora,
                        IdFinanciera: IdFinanciera,
                        Financiera: Financiera,
                        IdCopAsociacion: IdCopAsociacion,
                        CopAsociacion: CopAsociacion,
                        IdConvenio: IdConvenio,
                        Convenio: Convenio,
                        EstadoConvenio: EstadoConvenio,
                        OSConvenio: OSConvenio,
                        seguimiento: seguimiento,
                        CadenaCriterio: (Chasis +' '+ Motor +' '+ Placa +' '+ Marca +' '+ Modelo),
                        Paginas: conteoPagina
                        
                    });
                }); //foreach
            } //if

            //log.debug('Results', ObjResultado);
            return ObjResultado;    

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (ConsultaVehiculo)';
        }
    }

    function ConsultaVehiculoResumido(CodVehiculo, IdVeh, Identificacion, IdCli, PaginaId, NsCriterio, NsTipoBien){
        try{
         
            let conteoPagina = '';
            let Busqueda = search.create({
                type: 'customrecord_ht_record_bienes',
                filters:
                [
                    ["custrecord_bn_subsidiaria","anyof",GlobalSubsidiaria], "AND", //20250415
                    ["formulatext: CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_bien_chasis},{custrecord_ht_bien_motor}),{custrecord_ht_bien_placa}),{custrecord_ht_bien_marca}),{custrecord_ht_bien_modelo})","contains",NsCriterio]
                ],
                columns:
                [
                   search.createColumn({name: "name", label: "ID"}),
                   search.createColumn({name: "altname", label: "Nombre"}),
                   search.createColumn({
                      name: "entityid",
                      join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                      label: "ID"
                   }),
                   search.createColumn({
                      name: "custrecord_ht_bien_propietario",
                      sort: search.Sort.ASC,
                      label: "Cliente"
                   }),
                   search.createColumn({
                    name: "vatregnumber",
                    join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                    label: "Cedula/Ruc"
                    }),

                    search.createColumn({name: "custrecord_ht_bien_codsysh", label: "Codigo Vehiculo"}),
                    search.createColumn({name: "internalid", label: "Id Interno"}),
                    search.createColumn({name: "custrecord_ht_bien_placa", label: "Placa"}),
                    search.createColumn({name: "custrecord_ht_bien_motor", label: "Motor"}),
                    search.createColumn({name: "custrecord_ht_bien_marca", label: "Marca"}),
                    search.createColumn({name: "custrecord_ht_bien_modelo", label: "Modelo"}),
                    search.createColumn({name: "custrecord_ht_bien_chasis", label: "Chasis"}),
                    search.createColumn({name: "custrecord_ht_bien_ano", label: "Anio"}),
                    search.createColumn({name: "custrecord_ht_bien_colorfabricante", label: "Color"}),
                    search.createColumn({name: "custrecord_ht_bien_conveniovehiculo", label: "Convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_estadoconvenio", label: "Estado convenio"})
                ]
            });

            if (CodVehiculo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_codsysh', 
                operator: search.Operator.IS,
                values: CodVehiculo
                }));
            }

            if (IdVeh != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.ANYOF,
                values: IdVeh
                }));
            }

            if (Identificacion != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'vatregnumber', 
                  join: 'CUSTRECORD_HT_BIEN_PROPIETARIO',
                operator: search.Operator.IS,
                values: Identificacion
                }));
            }

            if (IdCli != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_propietario', 
                operator: search.Operator.ANYOF,
                values: IdCli
                }));
            }

            if (NsTipoBien != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_tipobien', 
                operator: search.Operator.IS,
                values: NsTipoBien
                }));
            }
          
            let ObjResultado = [];
            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            //for (let i in ResConsulta) {
            if (ResultadoConsulta.count != 0) {
                let ResPagina= ResultadoConsulta.fetch({index: PaginaId});
                ResPagina.data.forEach(function (ResConsulta) {

                    let internalid = ResConsulta.getValue({name: 'internalid'});
                    let Vehiculo= ResConsulta.getValue({name: 'custrecord_ht_bien_codsysh'});
                    let VehiculoNombre= ResConsulta.getValue({name: 'altname'}); //aqui
                    let IdCliente = ResConsulta.getValue({name: 'custrecord_ht_bien_propietario'});
                    let NumIdentificacion = ResConsulta.getValue({name: 'entityid', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});
                    let Cedula_Ruc = ResConsulta.getValue({name: 'vatregnumber', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});                    
                    let NombreCliente = ResConsulta.getText({name: 'custrecord_ht_bien_propietario'});

                    let Placa= ResConsulta.getValue({name: 'custrecord_ht_bien_placa'});
                    let Motor= ResConsulta.getValue({name: 'custrecord_ht_bien_motor'});
                    let Marca= ResConsulta.getText({name: 'custrecord_ht_bien_marca'});
                    let Modelo= ResConsulta.getText({name: 'custrecord_ht_bien_modelo'});
                    let Chasis = ResConsulta.getValue({name: 'custrecord_ht_bien_chasis'});
                    let Anio = ResConsulta.getValue({name: 'custrecord_ht_bien_ano'});
                    let Color = ResConsulta.getValue({name: 'custrecord_ht_bien_colorfabricante'});
                    let Convenio = ResConsulta.getValue({name: 'custrecord_ht_bien_conveniovehiculo'});
                    let EstadoConvenio = ResConsulta.getValue({name: 'custrecord_ht_bien_estadoconvenio'});

                    ObjResultado.push({
                        IdVehiculo: internalid,
                        CodigoVehiculo: Vehiculo,
                        VehiculoNombre: VehiculoNombre.replace(/,/g, ';'),
                        IdCliente: IdCliente,
                        NumIdentificacion: NumIdentificacion,
                        Cedula_Ruc: Cedula_Ruc,
                        NombreCliente: NombreCliente,
                        Placa: Placa,
                        Motor: Motor,
                        Marca: Marca,
                        Modelo: Modelo.replace(/,/g, ' '),
                        Chasis: Chasis,
                        Anio: Anio,
                        Color: Color ?  Color: '.',
                        Convenio: Convenio ? Convenio : 0,
                        EstadoConvenio: EstadoConvenio ? EstadoConvenio: -1,
                        Paginas: conteoPagina                        
                    });
                }); //foreach
            } //if

            //log.debug('Results', ObjResultado);
            return ObjResultado;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (ConsultaVehiculoResumido)';
        }
    }

    function ConsultaVehiculoCliente(CodVehiculo, IdVeh, Identificacion, IdCli, PaginaId, NsCriterio, NsTipoBien){
        try{
         
            let conteoPagina = '';
            let Busqueda = search.create({
                type: 'customrecord_ht_record_bienes',
                filters:
                [
                    ["custrecord_bn_subsidiaria","anyof",GlobalSubsidiaria], "AND", //20250415
                    ["formulatext: CONCAT(CONCAT(CONCAT(CONCAT({custrecord_ht_bien_chasis},{custrecord_ht_bien_motor}),{custrecord_ht_bien_placa}),{custrecord_ht_bien_marca}),{custrecord_ht_bien_modelo})","contains",NsCriterio]
                ],
                columns:
                [
                   search.createColumn({name: "name", label: "ID"}),
                   search.createColumn({name: "altname", label: "Nombre"}),
                   search.createColumn({
                      name: "entityid",
                      join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                      label: "ID"
                   }),
                   search.createColumn({
                      name: "custrecord_ht_bien_propietario",
                      sort: search.Sort.ASC,
                      label: "Cliente"
                   }),
                   search.createColumn({
                    name: "vatregnumber",
                    join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                    label: "Cedula/Ruc"
                    }),

                    search.createColumn({name: "custrecord_ht_bien_codsysh", label: "Codigo Vehiculo"}),
                    search.createColumn({name: "internalid", label: "Id Interno"})
                ]
            });

            if (CodVehiculo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_codsysh', 
                operator: search.Operator.IS,
                values: CodVehiculo
                }));
            }

            if (IdVeh != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.ANYOF,
                values: IdVeh
                }));
            }

            if (Identificacion != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'vatregnumber', 
                  join: 'CUSTRECORD_HT_BIEN_PROPIETARIO',
                operator: search.Operator.IS,
                values: Identificacion
                }));
            }

            if (IdCli != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_propietario', 
                operator: search.Operator.ANYOF,
                values: IdCli
                }));
            }

            if (NsTipoBien != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_tipobien', 
                operator: search.Operator.IS,
                values: NsTipoBien
                }));
            }
          
            let ObjResultado = [];
            let ResultadoConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResultadoConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            //for (let i in ResConsulta) {
            if (ResultadoConsulta.count != 0) {
                let ResPagina= ResultadoConsulta.fetch({index: PaginaId});
                ResPagina.data.forEach(function (ResConsulta) {

                    let internalid = ResConsulta.getValue({name: 'internalid'});
                    let Vehiculo= ResConsulta.getValue({name: 'custrecord_ht_bien_codsysh'});
                    let VehiculoNombre= ResConsulta.getValue({name: 'altname'});
                    let IdCliente = ResConsulta.getValue({name: 'custrecord_ht_bien_propietario'});
                    let NumIdentificacion = ResConsulta.getValue({name: 'entityid', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});
                    let Cedula_Ruc = ResConsulta.getValue({name: 'vatregnumber', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});                    
                    let NombreCliente = ResConsulta.getText({name: 'custrecord_ht_bien_propietario'});

                    ObjResultado.push({
                        IdVehiculo: internalid,
                        CodigoVehiculo: Vehiculo,
                        VehiculoNombre: VehiculoNombre,
                        IdCliente: IdCliente,
                        NumIdentificacion: NumIdentificacion,
                        Cedula_Ruc: Cedula_Ruc,
                        NombreCliente: NombreCliente,
                        Paginas: conteoPagina                        
                    });
                }); //foreach
            } //if

            //log.debug('Results', ObjResultado);
            return ObjResultado;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (ConsultaVehiculoCliente)';
        }
    }

    function ConsultaVehiculoPasoSyshunter(CodVehiculo, IdVeh){ //aqui
        try{
         
            let ObjResultado = [];
            let Busqueda = search.create({
                type: 'customrecord_ht_record_bienes',
                columns:
                [
                   search.createColumn({name: "name", label: "ID"}),
                   search.createColumn({name: "altname", label: "Nombre"}),
                   search.createColumn({name: "scriptid", label: "ID de script"}),
                   search.createColumn({
                      name: "entityid",
                      join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                      label: "ID"
                   }),
                   search.createColumn({
                      name: "custrecord_ht_bien_propietario",
                      sort: search.Sort.ASC,
                      label: "Cliente"
                   }),
                   search.createColumn({
                    name: "vatregnumber",
                    join: "CUSTRECORD_HT_BIEN_PROPIETARIO",
                    label: "Cedula/Ruc"
                    }),
                  
                    search.createColumn({name: "internalid", label: "Id Interno"}),
                    search.createColumn({name: "custrecord_ht_bien_tipobien", label: "Tipo de bien"}),
                    search.createColumn({name: "custrecord_ht_bien_tipoterrestre", label: "Tipo terrestre"}),
                    search.createColumn({name: "custrecord_ht_bien_placa", label: "Placa"}),
                    //search.createColumn({name: "custrecord_ht_bn_tipoorigen", label: "Tipo de Origen"}),
                    search.createColumn({name: "custrecord_ht_bn_tipori", label: "ORIGEN DESC"}),
                    search.createColumn({name: "custrecord_ht_bn_tipo_origen_desc", join: "CUSTRECORD_HT_BN_TIPORI", label: "Tipo de Origen"}),
                    search.createColumn({name: "name", join: "CUSTRECORD_HT_BN_TIPORI", label: "CodTipoOrigen"}),
                    search.createColumn({name: "custrecord_ht_bien_motor", label: "Motor"}),
                    search.createColumn({name: "custrecord_ht_bien_marca", label: "Marca"}),
                    search.createColumn({name: "custrecord_ht_bien_modelo", label: "Modelo"}), 
                    //search.createColumn({name: "custrecord_ht_mod_descripcion", label: "Modelo"}),xx
                    //search.createColumn({name: "name", label: "Modelo"}),
                  
                    search.createColumn({name: "custrecord_ht_bien_chasis", label: "Chasis"}),
                    search.createColumn({name: "custrecord_ht_bien_kilometraje", label: "Kilometraje"}),
                    search.createColumn({name: "custrecord_ht_bien_avaluo", label: "Avaluo"}),
                    search.createColumn({name: "custrecord_ht_bien_tonelaje", label: "Tonelaje"}),
                    search.createColumn({name: "custrecord_ht_bien_tipo", label: "Tipo"}),
                    search.createColumn({name: "custrecord_ht_bien_transmision", label: "Transmision"}),
                    search.createColumn({name: "custrecord_ht_bn_codigo", join: "CUSTRECORD_HT_BIEN_TRANSMISION", label: "CodTransmision"}),
                    search.createColumn({name: "custrecord_ht_bien_caractadicional", label: "Caracteristica adicional"}),
                    search.createColumn({name: "custrecord_ht_bien_colorcarseg", label: "Color Carseg"}),
                    search.createColumn({name: "custrecord_ht_bien_colorfabricante", label: "Color fabricante"}),
                    search.createColumn({name: "custrecord_ht_bien_colormatricula", label: "Color matricula"}),
                    search.createColumn({name: "custrecord_bien_version", label: "Version"}),
                    search.createColumn({name: "custrecord_ht_bien_tipocabina", label: "Tipo cabina"}),
                    search.createColumn({name: "custrecord_ht_bien_cilindraje", label: "Cilindraje"}),
                    search.createColumn({name: "custrecord_ht_bien_combustible", label: "Tipo combustible"}),
                    search.createColumn({name: "custrecord_ht_bien_traccion", label: "Traccion"}),
                    search.createColumn({name: "custrecord31", join: "CUSTRECORD_HT_BIEN_TIPOFLOTA", label: "Cod.Tipo Flota"}),
                    search.createColumn({name: "custrecord_ht_bien_ano", label: "Anio"}),
                    search.createColumn({name: "custrecord_ht_bien_clave", label: "Clave"}),
                    search.createColumn({name: "custrecord30", join: "CUSTRECORD_HT_BIEN_RECORRIDO", label: "Recorrido"}),
                    search.createColumn({name: "custrecord_ht_bien_usovehiculo", label: "Uso de vehiculo"}),
                    search.createColumn({name: "custrecord_ht_bien_oficina", label: "Oficina"}),
                    search.createColumn({name: "custrecord_ht_bien_formapago", label: "Forma de pago"}),
                    search.createColumn({name: "custrecord_ht_bien_conductor", label: "Conductor"}),
                    search.createColumn({name: "custrecord_ht_bien_consesionarios", label: "Concesionarios"}),
                    search.createColumn({name: "custrecord_ht_bien_companiaseguros", label: "Aseguradora"}),
                    search.createColumn({name: "custrecord_ht_bien_financiadovehiculo", label: "Financiera"}),
                    search.createColumn({name: "custrecord_ht_bn_cooperativaasociacion", label: "Cooperativa / Asociacion"}),
                    search.createColumn({name: "custrecord_ht_bien_conveniovehiculo", label: "Convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_estadoconvenio", label: "Estado convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_orden_serv_convenio", label: "Orden de Servicio Convenio"}),
                    search.createColumn({name: "custrecord_ht_bien_seguimiento", label: "Seguimiento"}),
                    search.createColumn({name: "custrecord_ht_bien_codsysh", label: "CodSyshunter"}),
                    search.createColumn({name: "externalid", label: "ID externo"}),
                    search.createColumn({name: "custrecord_ht_cd_ruccanaldistribucion", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "ASEGURADORA"}),
                    search.createColumn({name: "custrecord_ht_cd_oficina", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "ASEGURADORA OFICINA"}),
                    search.createColumn({name: "custrecord_ht_cd_ruccanaldistribucion", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "FINANCIERA"}),
                    search.createColumn({name: "custrecord_ht_cd_oficina", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "FINANCIERA OFICINA"}),
                    search.createColumn({name: "custrecord_ht_cd_ruccanaldistribucion", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "CONCESIONARIO"}),
                    search.createColumn({name: "custrecord_ht_cd_oficina", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "CONCESIONARIO OFICINA"}),
                    search.createColumn({name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "CONCESIONARIO DIRECCION"}),
                    search.createColumn({name: "salesrep", join: "CUSTRECORD_HT_BIEN_PROPIETARIO", label: "EJECUTIVA"}),
                    search.createColumn({name: "custrecord_ht_bien_numeropuertas", label: "NUM_PUERTAS"}),
                    search.createColumn({name: "custrecord_ht_bn_estadobien", label: "ESTADO_AUTOMOVIL"})
                  
                ]
            });

            if (CodVehiculo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_codsysh', 
                operator: search.Operator.IS,
                values: CodVehiculo
                }));
            }

            if (IdVeh != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.ANYOF,
                values: IdVeh
                }));
            }

            Busqueda.filters.push(search.createFilter({ //20250415
            name: 'custrecord_bn_subsidiaria', 
            operator: search.Operator.ANYOF,
            values: GlobalSubsidiaria
            }));

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {

                    let internalid = ResConsulta[i].getValue({name: 'internalid'});
                    let Vehiculo= ResConsulta[i].getValue({name: 'custrecord_ht_bien_codsysh'}) || ResConsulta[i].getValue({name: 'externalid'}) || "0"; 
                    let VehiculoNombre= ResConsulta[i].getValue({name: 'altname'});
                    let Script = ResConsulta[i].getValue({name: 'scriptid'});
                    let IdCliente = ResConsulta[i].getValue({name: 'custrecord_ht_bien_propietario'});
                    let NumIdentificacion = ResConsulta[i].getValue({name: 'entityid', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});
                    let Cedula_Ruc = ResConsulta[i].getValue({name: 'vatregnumber', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});                    
                    let NombreCliente = ResConsulta[i].getText({name: 'custrecord_ht_bien_propietario'});

                    let IdTipoBien= ResConsulta[i].getValue({name: 'custrecord_ht_bien_tipobien'});
                    let TipoBien= ResConsulta[i].getText({name: 'custrecord_ht_bien_tipobien'});

                    let IdTipoTerrestre= ResConsulta[i].getValue({name: 'custrecord_ht_bien_tipoterrestre'});
                    let TipoTerrestre= ResConsulta[i].getText({name: 'custrecord_ht_bien_tipoterrestre'});
                    let Placa= ResConsulta[i].getValue({name: 'custrecord_ht_bien_placa'});
                    let IdOrigen= ResConsulta[i].getValue({name: 'custrecord_ht_bn_tipori'}) || "0";
                    let CodOrigen= ResConsulta[i].getValue({name: 'name', join: "CUSTRECORD_HT_BN_TIPORI"});
              
                    let Origen= ResConsulta[i].getValue({name: 'custrecord_ht_bn_tipo_origen_desc', join: "CUSTRECORD_HT_BN_TIPORI"});
                    let Motor= ResConsulta[i].getValue({name: 'custrecord_ht_bien_motor'});
                    let IdMarca= ResConsulta[i].getValue({name: 'custrecord_ht_bien_marca'});
                    let Marca= ResConsulta[i].getText({name: 'custrecord_ht_bien_marca'});
                    let IdModelo= ResConsulta[i].getValue({name: 'custrecord_ht_bien_modelo'});
                    let Modelo= ResConsulta[i].getText({name: 'custrecord_ht_bien_modelo'});
                    
                    //let IdModelo= ResConsulta.getValue({name: 'name'});
                    //let Modelo= ResConsulta.getText({name: 'name'});
                    let Chasis = ResConsulta[i].getValue({name: 'custrecord_ht_bien_chasis'});
                    let Kilometraje = ResConsulta[i].getValue({name: "custrecord_ht_bien_kilometraje"});
                    let Avaluo = ResConsulta[i].getValue({name: "custrecord_ht_bien_avaluo"});
                    let Tonelaje = ResConsulta[i].getValue({name: "custrecord_ht_bien_tonelaje"});
                    let IdTipo= ResConsulta[i].getValue({name: 'custrecord_ht_bien_tipo'});
                    let Tipo= ResConsulta[i].getText({name: 'custrecord_ht_bien_tipo'});
                    let IdTransmision= ResConsulta[i].getValue({name: 'custrecord_ht_bien_transmision'});
                    let CodTransmision= ResConsulta[i].getValue({name: 'custrecord_ht_bn_codigo', join: "CUSTRECORD_HT_BIEN_TRANSMISION"});
                    let Transmision= ResConsulta[i].getText({name: 'custrecord_ht_bien_transmision'});
                    let IdCaracteristica= ResConsulta[i].getValue({name: 'custrecord_ht_bien_caractadicional'});
                    let Caracteristica= ResConsulta[i].getText({name: 'custrecord_ht_bien_caractadicional'});
                    let IdColorCarseg= ResConsulta[i].getValue({name: 'custrecord_ht_bien_colorcarseg'});
                    let ColorCarseg= ResConsulta[i].getText({name: 'custrecord_ht_bien_colorcarseg'});
                    let IdColorFabricante= ResConsulta[i].getValue({name: 'custrecord_ht_bien_colorfabricante'});
                    let ColorFabricante= ResConsulta[i].getText({name: 'custrecord_ht_bien_colorfabricante'});
                    let IdColorMatricula= ResConsulta[i].getValue({name: 'custrecord_ht_bien_colormatricula'});
                    let ColorMatricula= ResConsulta[i].getText({name: 'custrecord_ht_bien_colormatricula'});
                    let IdVersion= ResConsulta[i].getValue({name: 'custrecord_bien_version'});
                    let Version= ResConsulta[i].getText({name: 'custrecord_bien_version'});
                    let IdTipoCabina= ResConsulta[i].getValue({name: 'custrecord_ht_bien_tipocabina'});
                    let TipoCabina= ResConsulta[i].getText({name: 'custrecord_ht_bien_tipocabina'});
                    let IdCilindraje= ResConsulta[i].getValue({name: 'custrecord_ht_bien_cilindraje'});
                    let Cilindraje= ResConsulta[i].getValue({name: 'custrecord_ht_bien_cilindraje'});
                    let IdCombustible= ResConsulta[i].getValue({name: 'custrecord_ht_bien_combustible'});
                    let Combustible= ResConsulta[i].getText({name: 'custrecord_ht_bien_combustible'});
                    let IdTraccion= ResConsulta[i].getValue({name: 'custrecord_ht_bien_traccion'});
                    let Traccion= ResConsulta[i].getText({name: 'custrecord_ht_bien_traccion'});
                    let TipoFlota= ResConsulta[i].getValue({name: 'custrecord31', join: "CUSTRECORD_HT_BIEN_TIPOFLOTA"});
                    let Anio= ResConsulta[i].getValue({name: 'custrecord_ht_bien_ano'}) || "0";
                    let Clave= ResConsulta[i].getValue({name: 'custrecord_ht_bien_clave'});
                    let Recorrido= ResConsulta[i].getValue({name: 'custrecord30', join: "CUSTRECORD_HT_BIEN_RECORRIDO"});
                    let IdUsoVehicular= ResConsulta[i].getValue({name: 'custrecord_ht_bien_usovehiculo'});
                    let UsoVehicular= ResConsulta[i].getText({name: 'custrecord_ht_bien_usovehiculo'});
                    let IdOFicina= ResConsulta[i].getValue({name: 'custrecord_ht_bien_oficina'}) || "0";
                    let OFicina= ResConsulta[i].getText({name: 'custrecord_ht_bien_oficina'});
                    let IdFormaPago= ResConsulta[i].getValue({name: 'custrecord_ht_bien_formapago'});
                    let FormaPago= ResConsulta[i].getText({name: 'custrecord_ht_bien_formapago'});
                    let IdConductor= ResConsulta[i].getValue({name: 'custrecord_ht_bien_conductor'});
                    let Conductor= ResConsulta[i].getText({name: 'custrecord_ht_bien_conductor'});
                    let IdConcesionario= ResConsulta[i].getValue({name: 'custrecord_ht_bien_consesionarios'});
                    let Concesionario= ResConsulta[i].getText({name: 'custrecord_ht_bien_consesionarios'});
                    let IdAseguradora= ResConsulta[i].getValue({name: 'custrecord_ht_bien_companiaseguros'});
                    let Aseguradora= ResConsulta[i].getText({name: 'custrecord_ht_bien_companiaseguros'});
                    let IdFinanciera = ResConsulta[i].getValue({name: 'custrecord_ht_bien_financiadovehiculo'});
                    let Financiera = ResConsulta[i].getText({name: 'custrecord_ht_bien_financiadovehiculo'});
                    let IdCopAsociacion= ResConsulta[i].getValue({name: 'custrecord_ht_bn_cooperativaasociacion'});
                    let CopAsociacion= ResConsulta[i].getText({name: 'custrecord_ht_bn_cooperativaasociacion'});
                    let IdConvenio= ResConsulta[i].getValue({name: 'custrecord_ht_bien_conveniovehiculo'});
                    let Convenio= ResConsulta[i].getText({name: 'custrecord_ht_bien_conveniovehiculo'});
                    let EstadoConvenio= ResConsulta[i].getValue({name: 'custrecord_ht_bien_estadoconvenio'});
                    let OSConvenio= ResConsulta[i].getValue({name: 'custrecord_ht_bien_orden_serv_convenio'});
                    let seguimiento= ResConsulta[i].getValue({name: 'custrecord_ht_bien_seguimiento'});

                    let CodConcesionario = ResConsulta[i].getValue({name: 'custrecord_ht_cd_ruccanaldistribucion', join: 'CUSTRECORD_HT_BIEN_CONSESIONARIOS'});
                    let DireccionConcesionario = ResConsulta[i].getValue({name: 'custrecord_ht_cd_direccion', join: 'CUSTRECORD_HT_BIEN_CONSESIONARIOS'});
                    let IdOficinaConcesionario = ResConsulta[i].getValue({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_CONSESIONARIOS'});
                    let OficinaConcesionario = ResConsulta[i].getText({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_CONSESIONARIOS'});              

                    let CodAseguradora = ResConsulta[i].getValue({name: 'custrecord_ht_cd_ruccanaldistribucion', join: 'CUSTRECORD_HT_BIEN_COMPANIASEGUROS'});
                    let IdOficinaAseguradora = ResConsulta[i].getValue({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_COMPANIASEGUROS'});
                    let OficinaAseguradora = ResConsulta[i].getText({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_COMPANIASEGUROS'});

                    let CodFinanciera = ResConsulta[i].getValue({name: 'custrecord_ht_cd_ruccanaldistribucion', join: 'CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO'});
                    let IdOficinaFinanciera = ResConsulta[i].getValue({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO'});
                    let OficinaFinanciera = ResConsulta[i].getText({name: 'custrecord_ht_cd_oficina', join: 'CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO'});

                    let IdEjecutiva = ResConsulta[i].getValue({name: 'salesrep', join: 'CUSTRECORD_HT_BIEN_PROPIETARIO'});
                    let NumPuertas = ResConsulta[i].getValue({name: 'custrecord_ht_bien_numeropuertas'});
                    let EstadoAutomovil = ResConsulta[i].getValue({name: 'custrecord_ht_bn_estadobien'});
              
                    ObjResultado.push({
                        IdVehiculo: internalid,
                        CodigoVehiculo: Vehiculo,
                        VehiculoNombre: VehiculoNombre,
                        Script: Script ? Script: '',
                        IdCliente: IdCliente,
                        NumIdentificacion: NumIdentificacion,
                        Cedula_Ruc: Cedula_Ruc,
                        NombreCliente: NombreCliente,
                        IdTipoBien: IdTipoBien ? IdTipoBien : "0",
                        TipoBien: TipoBien ? TipoBien : '',
                        IdTipoTerrestre: IdTipoTerrestre ? IdTipoTerrestre : "0",
                        TipoTerrestre: TipoTerrestre ? TipoTerrestre : '',
                        Placa: Placa ? Placa : '',
                        IdOrigen: IdOrigen ? IdOrigen: '',
                        CodOrigen: CodOrigen ? CodOrigen: '',
                        Origen: Origen ? Origen: '',
                        Motor: Motor ? Motor: '',
                        IdMarca: IdMarca ? IdMarca: "0",
                        Marca: Marca ? Marca: '',
                        IdModelo: IdModelo ? IdModelo: '',
                        Modelo: Modelo.replace(/,/g, ' '),
                        //Modelo1: Modelo1,
                        Chasis: Chasis ? Chasis: '',
                        Kilometraje: Kilometraje ? Kilometraje : "0",
                        Avaluo: Avaluo ? Avaluo : "0",
                        Tonelaje: Tonelaje ? parseFloat(Tonelaje).toString() : "0",
                        IdTipo: IdTipo ? IdTipo: "0",
                        Tipo: Tipo ? Tipo: '',
                        IdTransmision: IdTransmision ? IdTransmision: "0",
                        CodTransmision: CodTransmision ? CodTransmision: '',
                        Transmision: Transmision ? Transmision: '',
                        IdCaracteristica: IdCaracteristica ? IdCaracteristica: "0",
                        Caracteristica: Caracteristica ? Caracteristica: '',
                        IdColorCarseg: IdColorCarseg ? IdColorCarseg: "0",
                        ColorCarseg: ColorCarseg ? ColorCarseg: '',
                        IdColorFabricante: IdColorFabricante ? IdColorFabricante : "0",
                        ColorFabricante: ColorFabricante ? ColorFabricante: '',
                        IdColorMatricula: IdColorMatricula ? IdColorMatricula: "0",
                        ColorMatricula: ColorMatricula ? ColorMatricula: '',
                        IdVersion:IdVersion ? IdVersion: "0",
                        Version: Version ? Version: '',
                        IdTipoCabina: IdTipoCabina ? IdTipoCabina: "0",
                        TipoCabina: TipoCabina ? TipoCabina: "0",
                        IdCilindraje: IdCilindraje ? IdCilindraje: "0",
                        Cilindraje: Cilindraje ? Cilindraje: '',
                        IdCombustible: IdCombustible ? IdCombustible: "0",
                        Combustible: Combustible ? Combustible: '',
                        IdTraccion: IdTraccion ? IdTraccion: "0",
                        Traccion: Traccion ? Traccion: '',
                        TipoFlota: TipoFlota ? TipoFlota: '',
                        Anio: Anio ? Anio: '',
                        Clave: Clave ? Clave: '',
                        Recorrido: Recorrido ? Recorrido : '',
                        IdUsoVehicular: IdUsoVehicular ? IdUsoVehicular: "0",
                        UsoVehicular: UsoVehicular ? UsoVehicular: '',
                        IdOFicina: IdOFicina ? IdOFicina: '0',
                        OFicina: OFicina ? OFicina: '',
                        IdFormaPago: IdFormaPago ? IdFormaPago: '',
                        FormaPago: FormaPago ? FormaPago: '',
                        IdConductor: IdConductor ? IdConductor: "0",
                        Conductor: Conductor ? Conductor: '',
                        IdConcesionario: IdConcesionario ? IdConcesionario: "0",
                        CodConcesionario: CodConcesionario ? CodConcesionario: '',
                        Concesionario: Concesionario ? Concesionario: '',
                        DireccionConcesionario: DireccionConcesionario ? DireccionConcesionario: '',
                        IdOficinaConcesionario: IdOficinaConcesionario ? IdOficinaConcesionario: "0",
                        OficinaConcesionario: OficinaConcesionario ? OficinaConcesionario: '',
                        IdAseguradora: IdAseguradora ? IdAseguradora: "0",
                        CodAseguradora: CodAseguradora ? CodAseguradora: '',
                        Aseguradora: Aseguradora ? Aseguradora: '',
                        IdOficinaAseguradora: IdOficinaAseguradora ? IdOficinaAseguradora : "0",
                        OficinaAseguradora: OficinaAseguradora ? OficinaAseguradora : '',
                        IdFinanciera: IdFinanciera ? IdFinanciera : "0",
                        CodFinanciera: CodFinanciera ? CodFinanciera : '',
                        Financiera: Financiera ? Financiera : '',
                        IdOficinaFinanciera: IdOficinaFinanciera ? IdOficinaFinanciera : "0",
                        OficinaFinanciera: OficinaFinanciera ? OficinaFinanciera : '',
                        IdCopAsociacion: IdCopAsociacion ? IdCopAsociacion : "0",
                        CopAsociacion: CopAsociacion ? CopAsociacion : '',
                        IdConvenio: IdConvenio ? IdConvenio : "0",
                        Convenio: Convenio ? Convenio : '',
                        EstadoConvenio: EstadoConvenio ? EstadoConvenio : '',
                        OSConvenio: OSConvenio ? OSConvenio : '',
                        seguimiento: seguimiento ? seguimiento : '',
                        IdEjecutiva: IdEjecutiva ? IdEjecutiva: "0",
                        NumPuertas: NumPuertas ?  NumPuertas: '0',
                        EstadoAutomovil: EstadoAutomovil ? EstadoAutomovil : '0'
                    });
            } //if

            return ObjResultado[0];    

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (ConsultaVehiculoPasoSyshunter)';
        }
    }
  
    function _put(context) {
        try {
                let Opcion = context.opcion;
                let PlacaVeh = context.placa;
                let AnioVeh = context.aniovehiculo;
                let IdAseguradora = context.idaseguradora;
                let IdVehiculo = context.idvehiculo;

                let Resultado = '';
                switch (Opcion) {
                        case "200":
                            Resultado = ActualizadBienes(PlacaVeh, AnioVeh, IdAseguradora, IdVehiculo);
                            break;
                        default: return 'id:400, opcion no valida';
                }
                return Resultado;
        }catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo actualizar el registro vehiculo.';
        }
    }

    function ActualizadBienes (Placa, Anio, Aseguradora, Vehiculo) {
        try{
            if ((Vehiculo == '') || (Vehiculo == 0)) {
                return 'id:400, Ingrese IdVehiculo.'
            }
            if ( ((Placa == '') || (Placa == 0)) &&
                    ((Anio == '') || (Anio == 0)) &&
                    ((Aseguradora == '') || (Aseguradora == 0))
                )
            {
                return 'id:400, No hay campos por actualizar.';
            }

            let objBien = record.load({ type: 'customrecord_ht_record_bienes', id: Vehiculo, isDynamic: true }); //abre tabla
            log.error('obj: ',objBien);
          
            if (Placa != ''){
                objBien.setValue({fieldId: 'custrecord_ht_bien_placa', value: Placa, ignoreFieldChange: true});
                log.error('placa: ', Placa);
            }
            if (Anio != 0){
                objBien.setValue({fieldId: 'custrecord_ht_bien_ano', value: Anio, ignoreFieldChange: true});
                log.error('anio: ', Anio);
            }
            if (Aseguradora != ''){
                objBien.setValue({fieldId: 'custrecord_ht_bien_companiaseguros', value: Aseguradora, ignoreFieldChange: true});
                log.error('Aseguradora: ', Aseguradora);
            }

            let idActualiza = 0;
            idActualiza = objBien.save({ enableSourcing: false, ignoreMandatoryFields: false });

            if ((idActualiza != 0) && (idActualiza != -1)){
                return 'Registro Actualizado.'
            }else {
                return 'id:400, Registro no pudo ser acctualizado.'
            }
            
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (ActualizadBienes).';
        }
    }

    function _delete() {
        //delete
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
 });