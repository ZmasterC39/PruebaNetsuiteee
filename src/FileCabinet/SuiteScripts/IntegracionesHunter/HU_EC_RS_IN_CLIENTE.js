/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log','N/search','N/record','N/query', './UtilsGeneral/HU_EC_CONSTANTES'], function(log, search, record, query, _const) {
    const LONGITUD_PAGINA = 10;
   
    var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC;
    
     function _get(context) {
         try{
             let ResultadoConsulta = null;
             let OpcionConsulta = context.opcion;
             let IdCliente = '';
             let IdClienteNs = 0;
             let IdPagina = 0;
             let IdRepresentante='';
             let IdBien = '';
             let IdSeguimiento = 0;
              
             log.error("..........gET.context................", context);
            

             if (typeof context.identificacion != 'undefined') {
                if (context.identificacion.length != 0) {
                    IdCliente = context.identificacion;
                }
            }
            if (typeof context.idcliente != 'undefined') {
                if (context.idcliente.length != 0) {
                    IdClienteNs = context.idcliente;
                }
            }
            if (typeof context.indice != 'undefined') {
                if (context.indice.length != 0) {
                    IdPagina = context.indice;
                }
            }

            if (typeof context.idbien != 'undefined') {
                if (context.idbien.length != 0) {
                    IdBien = context.idbien;
                }
            }

            if (typeof context.idseguimiento != 'undefined') {
                if (context.idseguimiento.length != 0) {
                    IdSeguimiento = context.idseguimiento;
                }
            }
 
             switch (OpcionConsulta) {
                case "100":
                    let P_IdOficina = 0;
                    let P_IdTipoCliente = 0;

                    if (typeof context.oficina != 'undefined') {
                        if (context.oficina.length != 0) {
                            P_IdOficina = context.oficina;
                        }
                    }
                    if (typeof context.idtipocliente != 'undefined') {
                        if (context.idtipocliente.length != 0) {
                            P_IdTipoCliente = context.idtipocliente;
                        }
                    }

                    ResultadoConsulta = ConsultaCliente(IdCliente, IdClienteNs, P_IdOficina, P_IdTipoCliente,IdPagina);    
                    break;
                case "101":
                    ResultadoConsulta = ConsultaDireccionCliente(IdCliente, IdClienteNs);
                    break;
                case "102":
                    ResultadoConsulta = ConsultaTelefonosCliente(IdCliente, IdClienteNs, "N");
                    break;
                case "103":
                    ResultadoConsulta = ConsultaEmailCliente(IdCliente, IdClienteNs, "N");
                    break;
                case "104":
                    IdRepresentante = 'N';
                    ResultadoConsulta = ConsultaNombreCliente(IdCliente, IdClienteNs, IdPagina,IdRepresentante,'');    
                    break;
                case "105":
                    ResultadoConsulta = ClienteSaldosCxC(IdClienteNs, IdCliente);
                    break;
                case "106":
                    IdRepresentante = 'S';
                    let P_Nombre = '';
                 
                     if (typeof context.nombre != 'undefined') {
                        if (context.nombre.length != 0) {
                            P_Nombre = context.nombre;
                        }
                    }
                 
                    ResultadoConsulta = ConsultaNombreCliente(IdCliente, IdClienteNs, IdPagina,IdRepresentante, P_Nombre);    
                    break;
                case "202":
                    ResultadoConsulta = ConsultaTelefonosCliente(IdCliente, IdClienteNs, "S");
                    break;
                case "203":
                    ResultadoConsulta = ConsultaEmailCliente(IdCliente, IdClienteNs, "S");
                    break;

                default: 

                return 'id:400, opcion no valida';
             }

             log.error(OpcionConsulta, ResultadoConsulta);
 
             return ResultadoConsulta;
 
         }catch (error) {
             log.error('error', error);
             return 'id:400, No se encontraron resultados. Error controlado.';
         }
 
     }

     function _post(context) {
        try {
           
            let IdResultado = 0;
            let Opcion = context.opcion;

            //log.error("..........POST.context................", context);

            switch (Opcion) {
                case "CLI":
                    let objCliente = [];
                    let Direccion= context.direccion; //billaddressee
                    let Categoria = context.tipocliente; //category
                    let Tipo = context.esempresa; //isperson
                    let PrimerNombre = context.primernombre; //custentity_ht_cl_primernombre
                    let SegundoNombre = context.segundornombre; //custentity_ht_cl_segundonombre
                    let ApellidoPaterno = context.apellidopaterno; //custentity_ht_cl_apellidopaterno
                    let ApellidoMaterno = context.apellidomaterno; //custentity_ht_cl_apellidomaterno
                    let Telefeono = context.telefono; //homephone
                    let Email = context.email; //email
                    let Oficina = context.oficina; //custentity_ht_cl_oficinacliente
                    let TipoPersona = context.tipopersona; //custentity_ts_ec_tipo_persona
                    let Identificacion = context.identificacion; //custentity_ec_vatregnumber
                    let TipoDocumento = context.tipodocumento; //custentity_ec_document_type
                    let Pais = context.pais; //custentityts_ec_pais_entidad
                    let EjecutivaVenta = context.ejecutivaventa; //salesrep
                    let EjecutivaRenovacion = context.ejecutivarenovacion; //salesrep

                    objCliente.push({
                        Direccion: Direccion,
                        TipoCliente: Categoria,
                        Tipo: Tipo,
                        PrimerNombre: PrimerNombre,
                        SegundoNombre: SegundoNombre,
                        ApellidoPaterno: ApellidoPaterno,
                        ApellidoMaterno: ApellidoMaterno,
                        Telefeono: Telefeono,
                        Email: Email,
                        Oficina: Oficina,
                        TipoPersona: TipoPersona,
                        Identificacion: Identificacion,
                        TipoDocumento: TipoDocumento,
                        Pais: Pais,
                        EjecutivaVenta: EjecutivaVenta,
                        EjecutivaRenovacion: EjecutivaRenovacion 
                    });

                    IdResultado = InsertaCliente(objCliente);
                    break;

                case "MAIL":
                    IdResultado = InsertaMailCliente(context.idcliente, context.correo, context.correoprincipal, context.tipocorreo);
                    break;
                case "TEL":
                    IdResultado = InsertaTelefonosCliente(context.idcliente, context.telefono, context.telefonoprincipal, context.tipotelefono);
                    break;
                case "DIR":
                    let objDirCliente = [];
                                        
                    objDirCliente.push({
                        IdCliente: context.idcliente,
                        DireccionCorta : context.direccioncorta,
                        Direccion: context.direccion,
                        Etiqueta: context.etiqueta,
                        Pais: context.idpais,
                        Telefono: context.telefono,
                        TipoDireccion: context.tipodireccion,
                        Provincia: context.idprovincia,
                        Canton: context.idcanton,
                        Parroquia: context.idparroquia,
                        Zip: context.zip,
                        EnvioPredeterminado: context.enviopredeterminado,
                        FacturaPredeterminado: context.facturapredeterminado,
                        DireccionResidencia: context.residencia
                    });
                    IdResultado = InsertaDireccionCliente(objDirCliente);
                    break;
                case "MIGRA_CLIENTE":
                    //20250114 PARA ACTUALIZAR CLIENTES EN SYSHUNTER
                    ResultadoConsulta = InformacionClienteParaSyshunter(context.identificacion);
                    break;

                case "SEG": 
                    ResultadoConsulta = ConsultaSeguimientos(context.idcliente, context.idbien, context.idseguimiento);
                    break;
                
                default: 
                    return 'id:400, opcion no valida';
            }

            if ((Opcion === "MIGRA_CLIENTE") || (Opcion ==="SEG")) {
                return ResultadoConsulta;
            }else {
                return IdResultado;
            }
        }catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el registro. Error controlado.';
        }
     }

     function _put(context) {
        try{
            let Resultado = '';
            let Opcion = context.opcion;
            let Principal = '';
                
            switch (Opcion) {
                case "CLI":
                    let objCliente = [];

                    objCliente.push({
                        IdCliente: context.idcliente,
                        Direccion: context.direccion,
                        TipoCliente: context.tipocliente,
                        Tipo: context.esempresa,
                        PrimerNombre: context.primernombre,
                        SegundoNombre: context.segundornombre,
                        ApellidoPaterno: context.apellidopaterno,
                        ApellidoMaterno: context.apellidomaterno,
                        Telefeono: context.telefono,
                        Email: context.email,
                        Oficina: context.oficina,
                        TipoPersona: context.tipopersona,
                        Identificacion: context.identificacion,
                        TipoDocumento: context.tipodocumento,
                        Pais: context.pais,
                        EjecutivaVenta: context.ejecutivaventa,
                        EjecutivaRenovacion: context.ejecutivarenovacion 
                    });

                    Resultado = ActualizaCliente(objCliente);
                    break;
                case "DIR":
                    let objDirCliente = [];
                                        
                    objDirCliente.push({
                        IdCliente: context.idcliente,
                        IdDireccion: context.iddireccion,
                        IdDireccionDetalle: context.iddirecciondetalle,
                        DireccionCorta : context.direccioncorta,
                        Direccion: context.direccion,
                        Etiqueta: context.etiqueta,
                        Pais: context.idpais,
                        Telefono: context.telefono,
                        TipoDireccion: context.tipodireccion,
                        Provincia: context.idprovincia,
                        Canton: context.idcanton,
                        Parroquia: context.idparroquia,
                        Zip: context.zip,
                        EnvioPredeterminado: context.enviopredeterminado,
                        FacturaPredeterminado: context.facturapredeterminado,
                        DireccionResidencia: context.residencia
                    });
                    Resultado = UpdateDireccionCliente(objDirCliente);
                    break;
                case "MAIL":
                    let IdDireccion = context.iddireccion;
                    let Correo = context.correo;
                    Principal = context.principal;
                    let TipoCorreo = context.tipocorreo;
                
                    Resultado = UpdateMailCliente(IdDireccion, Correo, Principal, TipoCorreo);
                    break;

                case "TEL":
                    let IdTelefono = context.idtelefono;
                    let Telefono = context.telefono;
                    Principal = context.principal;
                    let TipoTelefono = context.tipotelefono;

                    Resultado = UpdateTelefonoCliente(IdTelefono, Telefono, Principal, TipoTelefono);
                    break;
                
                default: return 'id:400, opcion no valida';
            }
            return Resultado;
        }catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo actualizar el registro de cliente.';
        }
     }
   
      function ConsultaCliente(Identificacion, IdCliente, CodOficina, CodTipoCliente, PaginaId){
         try{
             let conteoPagina = '';
             let Resultado = [];
             let Busqueda = search.create({
                 type:'customer',
                 columns: [
                    search.createColumn({name: "entityid", label: "Identificacion"}),
                    search.createColumn({name: "vatregnumber", label: "Cedula_Ruc"}),
                    search.createColumn({name: "internalid", label: "Id_Cliente"}),
                    search.createColumn({name: "isperson", label: "Type"}),

                    search.createColumn({name: "internalid", join: "CUSTENTITY_HT_CL_OFICINACLIENTE", label: "CodOficina"}),
                    search.createColumn({name: "internalid", join: "CUSTENTITY_TS_EC_TIPO_PERSONA", label: "CodTipoCliente"}),
                    search.createColumn({name: "custentity_ec_document_type", label: "TipoDocumento"}),
                    search.createColumn({name: "altname", label: "NombreCompleto"}),
                    search.createColumn({name: "custentity_ht_cl_primernombre", label: "PrimerNombre"}),
                    search.createColumn({name: "custentity_ht_cl_segundonombre", label: "SegundoNombre"}),
                    search.createColumn({name: "custentity_ht_cl_apellidopaterno", label: "ApellidoPaterno"}),
                    search.createColumn({name: "custentity_ht_cl_apellidomaterno", label: "ApellidoMaterno"}),
                    search.createColumn({name: "email", label: "email"}),
                    search.createColumn({name: "phone", label: "Telefono"}),
                    search.createColumn({name: "homephone", label: "Telefono Particular"}),                  
                    //search.createColumn({name: "defaultaddress", label: "Direccion"}),
                    search.createColumn({name: "entitystatus", label: "Estado"}),
                    search.createColumn({name: "salesrep", label: "Ejecutiva"}),
                    search.createColumn({name: "companyname", label: "Compania"}),
                    search.createColumn({name: "category", label: "TipoCliente"}),
                    search.createColumn({name: "subsidiary", label: "Subsidiaria"}),
                    search.createColumn({name: "custentity_ht_cl_oficinacliente", label: "Oficina"}),
                    search.createColumn({name: "custentity_ht_cl_sectoreconomico", label: "Sector"}),
                    search.createColumn({name: "custentity_ts_ec_tipo_persona", label: "TipoPersona"}),
                    search.createColumn({name: "custentityts_ec_pais_entidad", label: "PaisEntidad"})
                 ]
               });
 
              if (Identificacion != '') {
                 Busqueda.filters.push(search.createFilter({
                 name: 'vatregnumber', 
                 operator: search.Operator.IS,
                 values: Identificacion
                 }));
              }

              if (IdCliente != '') {
                 Busqueda.filters.push(search.createFilter({
                 name: 'internalid', 
                 operator: search.Operator.IS,
                 values: IdCliente
                 }));
             }

             if (CodOficina != '') {
                 Busqueda.filters.push(search.createFilter({
                 name: 'internalid', 
                 join: 'CUSTENTITY_HT_CL_OFICINACLIENTE',
                 operator: search.Operator.IS,
                 values: CodOficina
                 })); 
             } 
 
            if (CodTipoCliente != '') {
                 Busqueda.filters.push(search.createFilter({
                 name: 'internalid',
                 join: 'CUSTENTITY_TS_EC_TIPO_PERSONA',
                 operator: search.Operator.IS,
                 values: CodTipoCliente
                 }));
             }
 
             // let ObjResultado = new Array();
             // let ResConsulta = Busqueda.run().getRange({ start: 0, end: 1000 });
             let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
 
             conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
             if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                 PaginaId = 0;
             } else if (PaginaId >= conteoPagina) {
                 PaginaId = conteoPagina - 1;
             }

             let Tipo = '';
           
             if (ResConsulta.count != 0)
             {
                 let BusquedaResultado = ResConsulta.fetch({index: PaginaId});
                 BusquedaResultado.data.forEach(function (result){

                    let IdTipoDocumento = result.getValue({name: 'custentity_ec_document_type'});
                    let TipoDocumento = result.getText({name: 'custentity_ec_document_type'});
                    let Tipo = '';
                    if (result.getValue({name: 'isperson'})==true) 
                    { Tipo = "Individual"} 
                    else { Tipo = "Empresa"}
                    let IdentificacionCliente = result.getValue({name: 'entityid'});
                    let Cedula_Ruc = result.getValue({name: 'vatregnumber'});
                    let IdCliente = result.getValue({name: 'internalid'});
                    let NombreCompleto = result.getValue({name: 'altname'});
                    let PrimerNombre = result.getValue({name: 'custentity_ht_cl_primernombre'});
                    let SegundoNombre = result.getValue({name: 'custentity_ht_cl_segundonombre'});
                    let ApellidoPaterno = result.getValue({name: 'custentity_ht_cl_apellidopaterno'});
                    let ApellidoMaterno = result.getValue({name: 'custentity_ht_cl_apellidomaterno'});
                    let email = result.getValue({name: 'email'});
                    let Telefono = result.getValue({name: 'phone'});
                    //let Direccion = result.getValue({name: 'defaultaddress'});
                    let TelefonoParticular = result.getValue({name: 'homephone'});
                    let Estado = result.getValue({name: 'entitystatus'});
                    let IdEjecutiva = result.getValue({name: 'salesrep'});
                    let Ejecutiva = result.getText({name: 'salesrep'});
                    let Compania = result.getValue({name: 'companyname'});
                    let IdTipoCliente = result.getValue({name: 'category'});
                    let TipoCliente = result.getText({name: 'category'});
                    let IdSubsidiaria =result.getValue({name: 'subsidiary'});
                    let Subsidiaria =result.getText({name: 'subsidiary'});
                    let IdOficina = result.getValue({name: 'custentity_ht_cl_oficinacliente'});
                    let Oficina = result.getText({name: 'custentity_ht_cl_oficinacliente'});
                    let IdSector = result.getValue({name: 'custentity_ht_cl_sectoreconomico'});
                    let Sector = result.getText({name: 'custentity_ht_cl_sectoreconomico'});
                    let IdTipoPersona = result.getValue({name: 'custentity_ts_ec_tipo_persona'});
                    let TipoPersona = result.getText({name: 'custentity_ts_ec_tipo_persona'});
                    let IdPaisEntidad= result.getValue({name: 'custentityts_ec_pais_entidad'});
                    let PaisEntidad= result.getText({name: 'custentityts_ec_pais_entidad'});

                    Resultado.push({
                        IdTipoDocumento: IdTipoDocumento,
                        TipoDocumento: TipoDocumento,
                        Tipo: Tipo,
                        IdentificacionCliente: IdentificacionCliente,
                        Cedula_Ruc: Cedula_Ruc,
                        IdCliente: IdCliente,
                        NombreCompleto: NombreCompleto,
                        PrimerNombre: PrimerNombre,
                        SegundoNombre: SegundoNombre,
                        ApellidoPaterno: ApellidoPaterno,
                        ApellidoMaterno: ApellidoMaterno,
                        IdTipoPersona: IdTipoPersona,
                        TipoPersona: TipoPersona,
                        email: email,
                        Telefono: Telefono,
                        //Direccion: Direccion,
                        TelefonoParticular: TelefonoParticular,
                        Estado: Estado,
                        IdEjecutiva: IdEjecutiva,
                        Ejecutiva: Ejecutiva,
                        Compania: Compania,
                        IdTipoCliente: IdTipoCliente,
                        TipoCliente: TipoCliente,
                        IdOficina: IdOficina,
                        Oficina: Oficina,
                        IdSubsidiaria: IdSubsidiaria,
                        Subsidiaria: Subsidiaria,
                        IdSector: IdSector,
                        Sector: Sector,
                        IdPaisEntidad: IdPaisEntidad,
                        PaisEntidad: PaisEntidad,
                        Paginas: conteoPagina
                    });    
                 });
 
             }          
 
             log.debug('Results', Resultado);
             return Resultado;            
 
         } catch (error) {
             log.error('error', error);
             return 'id:400, No se encontraron resultados. Error controlado. (ConsultaCliente)';
         }
     }
    
     function ConsultaDireccionCliente(IdCliente, IdClienteNs) { //, TipoDireccion, Predeterminado){
        try{
            let Resultado = [];

            let Busqueda = search.create({
                type:'customer',
                columns: [
                    search.createColumn({name: "entityid", label: "Identificacion"}),
                    search.createColumn({name: "vatregnumber", label: "Cedula_Ruc"}),
                    search.createColumn({name: "internalid", label: "IdClienteNs"}),
                    search.createColumn({name: "altname", label: "NombreCliente"}),
                    search.createColumn({name: "address", join: "Address", label: "Direccion"}),
                    search.createColumn({name: "address1", join: "Address", label: "Direccion1"}),
                    search.createColumn({name: "email", label: "Email"}),
                    search.createColumn({name: "homephone", label: "Telefono"}),                  
                    search.createColumn({name: "country", join: "Address", label: "IdPais"}),
                    search.createColumn({name: "custrecord_ec_provincia", join: "Address", label: "IdProvincia"}),
                    search.createColumn({name: "custrecord_ec_canton", join: "Address", label: "IdCanton"}),
                    search.createColumn({name: "custrecord_ec_parroquia", join: "Address", label: "IdParroquia"}),
                    search.createColumn({name: "custrecord_direccion_zonaciudadela", join: "Address", label: "IdZona"}),
                    search.createColumn({name: "custrecord_ht_direccion_tipo", join: "Address", label: "IdTipoDireccion"}),
                    search.createColumn({name: "internalid", join: "Address", join: "Address", label: "IdDireccionDetNs"}),
                    search.createColumn({name: "addressinternalid", join: "Address", label: "IdDireccionDetNs"}),
                    // search.createColumn({name: "isdefaultbilling", join: "Address", label: "DireccionPredeterminadaEnvio"}),
                    // search.createColumn({name: "isdefaultshipping", join: "Address", label: "DireccionPredeterminadaFactura"})
                    search.createColumn({
                    name: "formulatext",
                    join: "Address",
                    formula: "CASE WHEN {isdefaultbilling} = 'T' THEN 'S' ELSE 'N' END",
                    label: "DireccionPredeterminadaEnvio"}),
                    search.createColumn({
                        name: "formulatext",
                        join: "Address",
                        formula: "CASE WHEN {isdefaultshipping} = 'T' THEN 'S' ELSE 'N' END",
                        label: "DireccionPredeterminadaFactura"})
                  
                ]
            });

            if (IdCliente != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'vatregnumber', 
                    operator: search.Operator.IS,
                    values: IdCliente
                }));
            }

            if (IdClienteNs != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdClienteNs
                }));
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Identificacion = ResConsulta[i].getValue({name: 'entityid'});
                let Cedula_Ruc = ResConsulta[i].getValue({name: 'vatregnumber'});
                let IdClienteNs = ResConsulta[i].getValue({name: 'internalid'});
                let NombreCliente =ResConsulta[i].getValue({name: 'altname'});
                let Direccion = ResConsulta[i].getValue({name: 'address', join: 'Address'});
                Direccion = Direccion.replace(/,/g, ' ');
                let Direccion1 = ResConsulta[i].getValue({name: 'address1', join: 'Address'});
                let Telefono =ResConsulta[i].getValue({name: 'homephone'});
                let Email =ResConsulta[i].getValue({name: 'email'});
                let IdPais = ResConsulta[i].getValue({name: 'country', join: 'Address'});
                let Pais = ResConsulta[i].getText({name: 'country', join: 'Address'});
                let IdProvincia = ResConsulta[i].getValue({name: 'custrecord_ec_provincia', join: 'Address'});
                let Provincia = ResConsulta[i].getText({name:'custrecord_ec_provincia', join: 'Address'});
                let IdCanton= ResConsulta[i].getValue({name: 'custrecord_ec_canton', join: 'Address'});
                let Canton = ResConsulta[i].getText({name:'custrecord_ec_canton', join: 'Address'});
                let IdParroquia = ResConsulta[i].getValue({name: 'custrecord_ec_parroquia', join: 'Address'});
                let Parroquia = ResConsulta[i].getText({name:'custrecord_ec_parroquia', join: 'Address'});
                let IdZona = ResConsulta[i].getValue({name: 'custrecord_direccion_zonaciudadela', join: 'Address'});
                let Zona = ResConsulta[i].getText({name: 'custrecord_direccion_zonaciudadela', join: 'Address'});
                let IdTipoDireccion = ''; //ResConsulta[i].getValue({name: 'custrecord_ht_direccion_tipo', join: 'Address'});
                let TipoDireccion = ResConsulta[i].getText({name: 'custrecord_ht_direccion_tipo', join: 'Address'});
                let IdDireccionNs = ResConsulta[i].getValue({name: 'internalid', join: 'Address'});
                let IdDireccionDetNs = ResConsulta[i].getValue({name: 'addressinternalid', join: 'Address'});
                // let DireccionPredeterminadaEnvio = ResConsulta[i].getValue({name: 'isdefaultbilling', join: 'Address'});
                // let DireccionPredeterminadaFactura = ResConsulta[i].getValue({name: 'isdefaultshipping', join: 'Address'});
                let DireccionPredeterminadaEnvio = ResConsulta[i].getValue({name: 'formulatext', join: "Address", formula: "CASE WHEN {isdefaultbilling} = 'T' THEN 'S' ELSE 'N' END"});
                let DireccionPredeterminadaFactura = ResConsulta[i].getValue({name: 'formulatext', join: "Address", formula: "CASE WHEN {isdefaultshipping} = 'T' THEN 'S' ELSE 'N' END"});

                let ConsultaQuery = query.runSuiteQL({
                query: `SELECT 	nvl(custrecordht_codigo_tipo_direccion, '')
                        FROM 	customrecord_ht_registro_tipo_direccion
                        WHERE	custrecordht_descripcion_tipo_direccion = '${TipoDireccion.trim()}' `,
                });

                if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                    IdTipoDireccion = ConsultaQuery.results[0].values[0];
                }
              
                Resultado.push({
                    Identificacion: Identificacion,
                    Cedula_Ruc: Cedula_Ruc,
                    Direccion: Direccion,
                    Direccion1: Direccion1,
                    Telefono: Telefono,
                    Email: Email,
                    IdClienteNs: IdClienteNs,
                    NombreCliente: NombreCliente,
                    //IdDireccion: IdDireccion,
                    IdPais: IdPais,
                    Pais: Pais,
                    IdProvincia: IdProvincia,
                    Provincia: Provincia,
                    IdCanton: IdCanton,
                    Canton: Canton,
                    IdParroquia: IdParroquia,
                    Parroquia: Parroquia,
                    IdZona: IdZona,
                    Zona: Zona,
                    IdTipoDireccion: IdTipoDireccion ? IdTipoDireccion : '.',
                    TipoDireccion: TipoDireccion ? TipoDireccion : '.',
                    IdDireccionNs: IdDireccionNs,
                    IdDireccionDetNs: IdDireccionDetNs,
                    DireccionPredeterminadaEnvio: DireccionPredeterminadaEnvio,
                    DireccionPredeterminadaFactura: DireccionPredeterminadaFactura
                });
            }

            return Resultado;

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaDireccionCliente)';
        }
    }

    function ConsultaTelefonosCliente (IdCliente, IdClienteNs, PasoDatos){
        try{
            let Resultado = [];
          
            let Busqueda = search.create({
                type: 'customrecord_ht_registro_telefono',

                columns: [
                    search.createColumn({name: "internalid", label: "IdInterno"}),
                    search.createColumn({name: "name", label: "name"}),
                    search.createColumn({name: "custrecord_ht_campo_txt_telefono", label: "Telefono"}),
                    search.createColumn({name: "custrecord_ht_campo_list_tipo_telefono", label: "TipoTelefono"}),
                    search.createColumn({name: "custrecord_ht_codigo_telefono", join: "CUSTRECORD_HT_CAMPO_LIST_TIPO_TELEFONO", label: "CodTipoTelefono"}),
                    search.createColumn({name: "custrecord_ht_descripcion_tipo_telefono", join: "CUSTRECORD_HT_CAMPO_LIST_TIPO_TELEFONO", label: "TipoTelefono"}),
                    search.createColumn({name: "custrecord_ht_campo_txt_principal", label: "principal"}),
                    search.createColumn({name: "isinactive", label: "isinactive"}),
                    search.createColumn({name: "custrecord_ht_campo_lbl_entidad_telefono", label: "IdCliente"}),
                    search.createColumn({name: "entityid", join: "CUSTRECORD_HT_CAMPO_LBL_ENTIDAD_TELEFONO", label: "Identificacion"}),                  
                    search.createColumn({name: "custrecord_ht_campo_txt_extension", label: "Ext"}),
                    search.createColumn({
                       name: "custentity_ec_numero_registro",
                       join: "owner",
                       label: "Cedula"
                    })
                    //search.createColumn({name: "custrecord_ht_codigo_telefono", label: "Codigo"})
                  
                ]
            });

            if (IdCliente != ''){
                Busqueda.filters.push(search.createFilter({
                    name: 'entityid',
                    join: 'CUSTRECORD_HT_CAMPO_LBL_ENTIDAD_TELEFONO',
                    operator: search.Operator.IS,
                    values: IdCliente
                }));
            }

            if (IdClienteNs != ''){
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_campo_lbl_entidad_telefono',
                    operator: search.Operator.IS,
                    values: IdClienteNs
                }));
            }

            Busqueda.filters.push(search.createFilter({
                name: 'isinactive', 
                operator: search.Operator.IS,
                values: "F"
            }));

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Id = ResConsulta[i].getValue({name: 'internalid'});
                let CodTelefono = ResConsulta[i].getValue({name: 'name'});
                let Telefono = ResConsulta[i].getValue({name: 'custrecord_ht_campo_txt_telefono'});
                let IdTipoTelefono = ResConsulta[i].getValue({name: 'custrecord_ht_campo_list_tipo_telefono'});
                let TipoTelefono = ResConsulta[i].getText({name: 'custrecord_ht_campo_list_tipo_telefono'});
              
                let TelefonoPrincipal = ''; 
                if (ResConsulta[i].getValue({name: 'custrecord_ht_campo_txt_principal'}) == true)
                {
                  TelefonoPrincipal = 'SI';
                }else {
                  TelefonoPrincipal = 'NO';
                }
              
                let Inactivo = ResConsulta[i].getValue({name: 'isinactive'});
                let InternalIdCliente = ResConsulta[i].getValue({name: 'custrecord_ht_campo_lbl_entidad_telefono'});
                let Identificacion = ResConsulta[i].getValue({name: 'entityid', join: 'CUSTRECORD_HT_CAMPO_LBL_ENTIDAD_TELEFONO'});
                let Cedula = ResConsulta[i].getValue({name: 'custentity_ec_numero_registro', join: 'owner'});
                let CodTipoTelefono = ResConsulta[i].getValue({name: 'custrecord_ht_codigo_telefono', join: 'CUSTRECORD_HT_CAMPO_LIST_TIPO_TELEFONO'});
                let Extension = ResConsulta[i].getValue({name: 'custrecord_ht_campo_txt_extension'}); 

                if(Telefono != ''){
                    if (PasoDatos == "N"){
                        Resultado.push({
                            Id: Id,
                            Telefono: Telefono,
                            IdTipoTelefono: IdTipoTelefono,
                            TipoTelefono: TipoTelefono,
                            TelefonoPrincipal: TelefonoPrincipal,
                            Inactivo: Inactivo,
                            IdCliente: InternalIdCliente,
                            Identificacion: Identificacion,
                            Cedula: Cedula
                        });
                    }else{
                        Resultado.push({
                            Id: Id,
                            CodTelefono: CodTelefono,
                            Telefono: Telefono,
                            IdTipoTelefono: IdTipoTelefono,
                            CodTipoTelefono: CodTipoTelefono ? CodTipoTelefono: '',
                            TipoTelefono: TipoTelefono,
                            TelefonoPrincipal: TelefonoPrincipal,
                            Inactivo: Inactivo,
                            IdCliente: InternalIdCliente,
                            Identificacion: Identificacion,
                            Cedula: Cedula,
                            Extension: Extension ? Extension: ''
                        });
                    }
                }
              
            }

            return Resultado;

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaTelefonosCliente)';
        }
    }
   
    function ConsultaEmailCliente (IdCliente, IdClienteNs, PasoDatos){
        try{
            let Resultado = [];
            let Busqueda = search.create({
                type: 'customrecord_ht_record_correoelectronico',

                columns: [
                    search.createColumn({name: "internalid", label: "ID de script"}),
                    search.createColumn({name: "name", label: "CodMail"}),
                    search.createColumn({name: "custrecord_ht_email_tipoemail", label: "Tipo de Email"}),
                    search.createColumn({name: "custrecord_ht_email_email", label: "Email"}),
                    search.createColumn({name: "custrecord_ht_ce_enlace", label: "Cliente"}),
                    search.createColumn({name: "custrecord_ht_ce_enlace", label: "IdCliente"}),
                    search.createColumn({
                        name: "entityid",
                        join: "CUSTRECORD_HT_CE_ENLACE",
                        label: "ID"
                     }),
                     search.createColumn({
                        name: "vatregnumber",
                        join: "CUSTRECORD_HT_CE_ENLACE",
                        label: "Cedula"
                     })
                    //search.createColumn({name: "custrecordht_codigo_tipo_direccion", join: "customrecord_ht_registro_tipo_direccion", label: "CodTipoMail"})
                    , search.createColumn({name: "custrecord_ht_email_emailprincipal", label: "Principal"})
                ]
            });

            if (IdCliente != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'entityid', 
                join: 'CUSTRECORD_HT_CE_ENLACE',
                operator: search.Operator.IS,
                values: IdCliente
                }));
            }

            if (IdClienteNs != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_ce_enlace', 
                operator: search.Operator.IS,
                values: IdClienteNs
                }));
            }

            Busqueda.filters.push(search.createFilter({
                name: 'isinactive', 
                operator: search.Operator.IS,
                values: "F"
            }));

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Id = ResConsulta[i].getValue({name: 'internalid'});
                let CodMail = ResConsulta[i].getValue({name: 'name'});
                let IdTipoCorreo = ResConsulta[i].getValue({name: 'custrecord_ht_email_tipoemail'});
                let TipoCorreo = ResConsulta[i].getText({name: 'custrecord_ht_email_tipoemail'});
                let CodTipoCorreo = '';
                let Email = ResConsulta[i].getValue({name: 'custrecord_ht_email_email'});
                let Principal = '';
                if (ResConsulta[i].getValue({name: 'custrecord_ht_email_emailprincipal'})){
                  Principal = 'SI';
                }else {
                  Principal = 'NO';
                }
                let IdClienteNs = ResConsulta[i].getValue({name: 'custrecord_ht_ce_enlace'});
                let Identificacion = ResConsulta[i].getValue({name: 'entityid', join: 'CUSTRECORD_HT_CE_ENLACE'});
                let InternalIdCliente = ResConsulta[i].getValue({name: 'custrecord_ht_ce_enlace'});
                let Cedula = ResConsulta[i].getText({name: 'vatregnumber', join: 'CUSTRECORD_HT_CE_ENLACE'});

                if ((PasoDatos == "S") && (Email != '')) {

                    let ConsultaQuery = query.runSuiteQL({
                    query: `SELECT 	nvl(custrecordht_codigo_tipo_direccion, '')
                            FROM 	customrecord_ht_registro_tipo_direccion
                            WHERE	custrecord_ht_email_check_direccion = 'T'
                            AND     custrecordht_descripcion_tipo_direccion = '${TipoCorreo.trim()}' `,
                    });

                    if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                        CodTipoCorreo = ConsultaQuery.results[0].values[0];
                    }
                  
                    Resultado.push({
                        Id: Id,
                        CodMail: CodMail,
                        IdTipoCorreo: IdTipoCorreo,
                        CodTipoCorreo: CodTipoCorreo,
                        TipoCorreo: TipoCorreo,
                        Email: Email,
                        Principal: Principal,
                        IdClienteNs: IdClienteNs,
                        Identificacion: Identificacion,
                        IdCliente: InternalIdCliente,
                        Cedula: Cedula
                    });
                }else {
                    Resultado.push({
                        Id: Id,
                        IdTipoCorreo: IdTipoCorreo,
                        TipoCorreo: TipoCorreo,
                        Email: Email,
                        IdClienteNs: IdClienteNs,
                        Identificacion: Identificacion,
                        IdCliente: InternalIdCliente,
                        Cedula: Cedula
                    });
                } //if
            }

            return Resultado;

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaEmailCliente)';
        }
    }

   function ConsultaNombreCliente(Identificacion, IdCliente, PaginaId,IdRepresentante,Nombre){
        try{
            let conteoPagina = '';
            let Resultado = [];
            let ResConsulta;
            let Busqueda = search.create({
                type:'customer',
                columns: [
                   search.createColumn({name: "internalid", label: "Id_Cliente"}),
                   search.createColumn({name: "entityid", label: "Identificacion"}),
                   search.createColumn({name: "vatregnumber", label: "Cedula_Ruc"}),
                   search.createColumn({name: "salesrep", label: "Ejecutiva" }),
                   search.createColumn({name: "altname", label: "NombreCompleto"})
                ]
              });

             if (Identificacion != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'vatregnumber', 
                operator: search.Operator.IS,
                values: Identificacion
                }));
             }

             if (IdCliente != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: IdCliente
                }));
            }

            if (Nombre != '') {                
                Busqueda.filters.push(search.createFilter({
                name: 'entityid', 
                operator: search.Operator.HASKEYWORDS,
                values: Nombre
                }));
            }

            if (Nombre != '') {
               ResConsulta = Busqueda.runPaged({ pageSize: 25});
               conteoPagina = Math.ceil(ResConsulta.count / 25);
            } else{
               ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
               conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
            }
              
            //let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
            //conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
          
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }
          
            if (ResConsulta.count != 0)
            {
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});
                BusquedaResultado.data.forEach(function (result){

                   let IdCliente = result.getValue({name: 'internalid'});
                   let IdentificacionCliente = result.getValue({name: 'entityid'});
                   let Cedula_Ruc = result.getValue({name: 'vatregnumber'});
                   let NombreCompleto = result.getValue({name: 'altname'});
                   let IdEjecutiva = result.getValue({name: 'salesrep'});

                   if (IdRepresentante =='S') {
                     Resultado.push({
                       IdCliente: IdCliente,
                       IdentificacionCliente: IdentificacionCliente,
                       Cedula_Ruc: Cedula_Ruc,
                       NombreCompleto: NombreCompleto,    
                       IdEjecutiva: IdEjecutiva,
                       Paginas: conteoPagina 
                   });    
                   } else {
                      Resultado.push({
                       IdCliente: IdCliente,
                       IdentificacionCliente: IdentificacionCliente,
                       Cedula_Ruc: Cedula_Ruc,
                       NombreCompleto: NombreCompleto,                     
                       Paginas: conteoPagina 
                   });    
                   }
                     
                });

            }
            return Resultado;            

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaNombreCliente)';
        }
    }

    function ClienteSaldosCxC(IdInterno, Identificacion){ //20250613
        try{
            let Resultado = [];
            let Busqueda = search.create({
                type:'customer',
                columns: [
                   search.createColumn({name: "internalid", label: "Id_Cliente"}),
                   search.createColumn({name: "vatregnumber", label: "Identificacion"}),
                   search.createColumn({name: "altname", label: "NombreCompleto"}),
                   search.createColumn({name: "balance", label: "Saldo"}),
                   search.createColumn({name: "overduebalance", label: "Saldo Vencido"}),
                   search.createColumn({name: "daysoverdue", label: "Dias Vencido"})
                ]
              });

             if (Identificacion != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'vatregnumber', 
                operator: search.Operator.IS,
                values: Identificacion
                }));
             }

             if (IdInterno != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: IdInterno
                }));
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let IdCliente = ResConsulta[i].getValue({name: 'internalid'});
                let IdentificacionCliente = ResConsulta[i].getValue({name: 'vatregnumber'});
                let NombreCompleto = ResConsulta[i].getValue({name: 'altname'});
                let Saldo = ResConsulta[i].getValue({name: 'balance'}); //? ResConsulta[i].getValue({name: 'balance'}) : 0;
                let SaldoVencido = ResConsulta[i].getValue({name: 'overduebalance'}); //? ResConsulta[i].getValue({name: 'overduebalance'}) : 0;
                let DiasVencido = ResConsulta[i].getValue({name: 'daysoverdue'}); //? ResConsulta[i].getValue({name: 'daysoverdue'}); : 0;


                NombreCompleto = NombreCompleto.replace(/,/g, ' ');
                Resultado.push({
                    IdCliente: IdCliente,
                    IdentificacionCliente: IdentificacionCliente ? IdentificacionCliente : '',
                    NombreCompleto: NombreCompleto ? NombreCompleto : '',
                    Saldo: Saldo ? Saldo : 0,
                    SaldoVencido: SaldoVencido ? SaldoVencido : 0,
                    DiasVencido: DiasVencido ? DiasVencido : 0
                });
            }

            return Resultado;
        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ClienteSaldosCxC)';
        }
    }

   function InformacionClienteParaSyshunter(Identificacion){
        try{

            let Resultado = [];
            let Busqueda = search.create({
                type: "customer",
                filters:
                [
                   ["subsidiary","anyof",GlobalSubsidiaria],
                   "AND", 
                   ["vatregnumber","is",Identificacion]
                ],
                columns:
                [
                   search.createColumn({name: "internalid", label: "ID_NS_CLIENTE"}),
                   search.createColumn({name: "vatregnumber", label: "IDENTIFICACION"}),
                   search.createColumn({name: "altname", label: "NOMBRE_COMPLETO"}),
                   search.createColumn({name: "custentity_ht_cl_primernombre", label: "PRIMER_NOMBRE"}),
                   search.createColumn({name: "custentity_ht_cl_segundonombre", label: "SEGUNDO_NOMBRE"}),
                   search.createColumn({name: "custentity_ht_cl_apellidopaterno", label: "APELLIDO_PATERNO"}),
                   search.createColumn({name: "custentity_ht_cl_apellidomaterno", label: "APELLIDO_MATERNO"}),
                   search.createColumn({name: "custentity_ec_document_type", label: "TIPO_DOCUMENTO"}),
                   search.createColumn({name: "category", label: "TIPO_CLIENTE_D"}),
                   search.createColumn({name: "salesrep", label: "EJECUTIVA"}),
                   search.createColumn({name: "custentity_ts_ec_tipo_persona", label: "TIPO_PERSONA"}),
                   search.createColumn({name: "custentity_ht_customer_id_telematic", label: "ID_TELEMATIC"}),
                   search.createColumn({name: "custentity_ht_cl_oficinacliente", label: "OFICINA"}),
                ]
             });

             let BusquedaNumReg = Busqueda.runPaged().count;
             let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

          //20250325 POR CONFIRMAR, NS NO TIENE TODAS LAS DIRECCIONES Q SYSHUNTER, SI SE PASA EN EL DELETE SE PERDERIAN LOS DETALLES
             let ObjDireccion = []; //ConsultaDireccionCliente_v2('', ResConsulta[0].getValue({name: 'internalid'}));
             let ObjCorreos = []; //ConsultaEmailCliente('', ResConsulta[0].getValue({name: 'internalid'}));
             let ObjTelefono = [];

             ObjDireccion = ConsultaDireccionCliente_v2('', ResConsulta[0].getValue({name: 'internalid'}));
             ObjTelefono = ConsultaTelefonosCliente('', ResConsulta[0].getValue({name: 'internalid'}), 'S'); //HABILIDATO 20260319
             ObjCorreos = ConsultaEmailCliente('', ResConsulta[0].getValue({name: 'internalid'}),'S');  //HABILIDATO 20260319

             for (let i in ResConsulta) {
                let ID_NS_CLIENTE = ResConsulta[i].getValue({name: 'internalid'});
                let IDENTIFICACION = ResConsulta[i].getValue({name: 'vatregnumber'});
                let NOMBRE_COMPLETO = ResConsulta[i].getValue({name: 'altname'});
                let PRIMER_NOMBRE = ResConsulta[i].getValue({name: 'custentity_ht_cl_primernombre'});
                let SEGUNDO_NOMBRE = ResConsulta[i].getValue({name: 'custentity_ht_cl_segundonombre'});
                let APELLIDO_PATERNO = ResConsulta[i].getValue({name: 'custentity_ht_cl_apellidopaterno'});
                let APELLIDO_MATERNO = ResConsulta[i].getValue({name: 'custentity_ht_cl_apellidomaterno'});
                let TIPO_CLIENTE_D = ResConsulta[i].getText({name: 'category'});

                let TIPO_PERSONA = ResConsulta[i].getText({name: 'custentity_ts_ec_tipo_persona'});
                let ID_TELEMATIC = ResConsulta[i].getValue({name: 'custentity_ht_customer_id_telematic'});
                let OFICINA = ResConsulta[i].getText({name: 'custentity_ht_cl_oficinacliente'});
                let ID_EJECUTIVA = ResConsulta[i].getValue({name: 'salesrep'});

                Resultado.push({
                    Id_ns_cliente: ID_NS_CLIENTE,
                    Identificacion: IDENTIFICACION,
                    Nombre_Completo: NOMBRE_COMPLETO,
                    Primer_Nombre: PRIMER_NOMBRE,
                    Segundo_Nombre: SEGUNDO_NOMBRE,
                    Apellido_Paterno: APELLIDO_PATERNO,
                    Apellido_Materno: APELLIDO_MATERNO,
                    Tipo_Cliente: TIPO_CLIENTE_D,
                    Tipo_Persona: TIPO_PERSONA,
                    Id_Ejecutiva: ID_EJECUTIVA ? ID_EJECUTIVA : '0',
                    Id_Telematic: ID_TELEMATIC ? ID_TELEMATIC : '0',
                    Oficina: OFICINA,
                    Direccion: ObjDireccion,
                    Email: ObjCorreos,
                    Telefono: ObjTelefono
                });
             }

            return Resultado[0];

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (InformacionClienteParaSyshunter)';
        }
    }

   //VBC 20250317
   function ConsultaDireccionCliente_v2(IdCliente, IdClienteNs) {
        try{
            let Resultado = [];

            let Busqueda = search.create({
                type:'customer',
                columns: [
                    search.createColumn({name: "entityid", label: "Identificacion"}),
                    search.createColumn({name: "vatregnumber", label: "Cedula_Ruc"}),
                    search.createColumn({name: "internalid", label: "IdClienteNs"}),
                    search.createColumn({name: "altname", label: "NombreCliente"}),
                    search.createColumn({name: "address", join: "Address", label: "Direccion"}),
                    search.createColumn({name: "address1", join: "Address", label: "Direccion1"}),
                    search.createColumn({name: "email", label: "Email"}),
                    search.createColumn({name: "homephone", label: "Telefono"}),                  
                    search.createColumn({name: "country", join: "Address", label: "IdPais"}),
                    search.createColumn({name: "custrecord_ec_provincia", join: "Address", label: "IdProvincia"}),
                    search.createColumn({name: "custrecord_ec_canton", join: "Address", label: "IdCanton"}),
                    search.createColumn({name: "custrecord_ec_parroquia", join: "Address", label: "IdParroquia"}),
                    search.createColumn({name: "custrecord_direccion_zonaciudadela", join: "Address", label: "IdZona"}),
                    search.createColumn({name: "custrecord_ht_direccion_tipo", join: "Address", label: "IdTipoDireccion"}),
                    search.createColumn({name: "internalid", join: "Address", join: "Address", label: "IdDireccionDetNs"}),
                    search.createColumn({name: "addressinternalid", join: "Address", label: "IdDireccionDetNs"}),
                    // search.createColumn({name: "isdefaultbilling", join: "Address", label: "DireccionPredeterminadaEnvio"}),
                    // search.createColumn({name: "isdefaultshipping", join: "Address", label: "DireccionPredeterminadaFactura"})
                  /*  search.createColumn({
                    name: "formulatext",
                    join: "Address",
                    formula: "CASE WHEN {isdefaultbilling} = 'T' THEN 'S' ELSE 'N' END",
                    label: "DireccionPredeterminadaEnvio"}),
                    search.createColumn({
                        name: "formulatext",
                        join: "Address",
                        formula: "CASE WHEN {isdefaultshipping} = 'T' THEN 'S' ELSE 'N' END",
                        label: "DireccionPredeterminadaFactura"}) */
                    search.createColumn({
                        name: "isdefaultshipping",
                        join: "Address",
                        label: "DireccionPredeterminadaEnvio1"
                    }),
                    search.createColumn({
                        name: "isdefaultbilling",
                        join: "Address",
                        label: "DireccionPredeterminadaFactura1"
                    })      
                ]
            });

            Busqueda.filters.push(search.createFilter({
                name: 'isinactive', 
                operator: search.Operator.IS,
                values: "F"
            }));

            if (IdCliente != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'vatregnumber', 
                    operator: search.Operator.IS,
                    values: IdCliente
                }));
            }

            if (IdClienteNs != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdClienteNs
                }));
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Identificacion = ResConsulta[i].getValue({name: 'entityid'});
                let Cedula_Ruc = ResConsulta[i].getValue({name: 'vatregnumber'});
                let IdClienteNs = ResConsulta[i].getValue({name: 'internalid'});
                let NombreCliente =ResConsulta[i].getValue({name: 'altname'});
                let Direccion = ResConsulta[i].getValue({name: 'address', join: 'Address'});
                Direccion = Direccion.replace(/,/g, ' ');
                let Direccion1 = ResConsulta[i].getValue({name: 'address1', join: 'Address'});
                let Telefono =ResConsulta[i].getValue({name: 'homephone'});
                let Email =ResConsulta[i].getValue({name: 'email'});
                let IdPais = ResConsulta[i].getValue({name: 'country', join: 'Address'});
                let Pais = ResConsulta[i].getText({name: 'country', join: 'Address'});
                let IdProvincia = ResConsulta[i].getValue({name: 'custrecord_ec_provincia', join: 'Address'});
                let Provincia = ResConsulta[i].getText({name:'custrecord_ec_provincia', join: 'Address'});
                let IdCanton= ResConsulta[i].getValue({name: 'custrecord_ec_canton', join: 'Address'});
                let Canton = ResConsulta[i].getText({name:'custrecord_ec_canton', join: 'Address'});
                let IdParroquia = ResConsulta[i].getValue({name: 'custrecord_ec_parroquia', join: 'Address'});
                let Parroquia = ResConsulta[i].getText({name:'custrecord_ec_parroquia', join: 'Address'});
                let IdZona = ResConsulta[i].getValue({name: 'custrecord_direccion_zonaciudadela', join: 'Address'});
                let Zona = ResConsulta[i].getText({name: 'custrecord_direccion_zonaciudadela', join: 'Address'});
                let IdTipoDireccion = ''; //ResConsulta[i].getValue({name: 'custrecord_ht_direccion_tipo', join: 'Address'});
                let TipoDireccion = ResConsulta[i].getText({name: 'custrecord_ht_direccion_tipo', join: 'Address'});
                let IdDireccionNs = ResConsulta[i].getValue({name: 'internalid', join: 'Address'});
                let IdDireccionDetNs = ResConsulta[i].getValue({name: 'addressinternalid', join: 'Address'});
                // let DireccionPredeterminadaEnvio = ResConsulta[i].getValue({name: 'isdefaultbilling', join: 'Address'});
                // let DireccionPredeterminadaFactura = ResConsulta[i].getValue({name: 'isdefaultshipping', join: 'Address'});
              /*  let DireccionPredeterminadaEnvio = ResConsulta[i].getValue({name: 'formulatext', join: "Address", formula: "CASE WHEN {isdefaultbilling} = 'T' THEN 'S' ELSE 'N' END"});
                let DireccionPredeterminadaFactura = ResConsulta[i].getValue({name: 'formulatext', join: "Address", formula: "CASE WHEN {isdefaultshipping} = 'T' THEN 'S' ELSE 'N' END"});
*/
                let DireccionPredeterminadaEnvio = ResConsulta[i].getValue({name: 'isdefaultshipping', join: "Address"});
                let DireccionPredeterminadaFactura = ResConsulta[i].getValue({name: 'isdefaultbilling', join: "Address"});                 

              
                let CodProvincia = '';
                let CodCiudad = '';
                let CodParroquia = '';

                let ConsultaQuery = query.runSuiteQL({
                query: `SELECT 	nvl(custrecordht_codigo_tipo_direccion, '')
                        FROM 	customrecord_ht_registro_tipo_direccion
                        WHERE	custrecordht_descripcion_tipo_direccion = '${TipoDireccion.trim()}' `,
                });

                if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                    IdTipoDireccion = ConsultaQuery.results[0].values[0];
                }

                if (IdProvincia)
                {
                    
                    ConsultaQuery = query.runSuiteQL({
                        query: `SELECT 	nvl(custrecord_ec_pr_codigo, '')
                                FROM 	customrecord_ec_record_provincia
                                WHERE	id = '${IdProvincia.trim()}' `,
                        });
                    if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                        CodProvincia = ConsultaQuery.results[0].values[0];
                    }
                }

                if (IdCanton)
                {
                    ConsultaQuery = query.runSuiteQL({
                        query: `SELECT 	nvl(custrecord_ec_cc_codigocanton, '')
                                FROM 	customrecord_ec_record_canton
                                WHERE	id = '${IdCanton.trim()}' `,
                        });

                    if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                        CodCiudad = ConsultaQuery.results[0].values[0];
                    }
                }

                if (IdParroquia)
                {
                    ConsultaQuery = query.runSuiteQL({
                        query: `SELECT 	nvl(custrecord_ec_cp_codigoparroquia, '')
                                FROM 	customrecord_ec_record_parroquia
                                WHERE	id = '${IdParroquia.trim()}' `,
                        });

                    if (ConsultaQuery && ConsultaQuery.results && ConsultaQuery.results.length > 0) {
                        CodParroquia = ConsultaQuery.results[0].values[0];
                    }
                }

                if (Direccion1 != "")
                {
                    Resultado.push({
                            Identificacion: Identificacion,
                            Cedula_Ruc: Cedula_Ruc,
                            Direccion: Direccion,
                            Direccion1: Direccion1,
                            Telefono: Telefono,
                            Email: Email,
                            IdClienteNs: IdClienteNs,
                            NombreCliente: NombreCliente,
                            //IdDireccion: IdDireccion,
                            IdPais: IdPais,
                            Pais: Pais,
                            IdProvincia: IdProvincia ? IdProvincia: 0,
                            CodProvincia: CodProvincia ? CodProvincia: '000',
                            Provincia: Provincia ? Provincia: '',
                            IdCanton: IdCanton ? IdCanton: 0,
                            CodCanton: CodCiudad ? CodCiudad: '000',
                            Canton: Canton ? Canton: '',
                            IdParroquia: IdParroquia ? IdParroquia: 0,
                            CodParroquia: CodParroquia ? CodParroquia : '000',
                            Parroquia: Parroquia ? Parroquia: '',
                            IdZona: IdZona ? IdZona: 0,
                            Zona: Zona ? Zona: '',
                            IdTipoDireccion: IdTipoDireccion ? IdTipoDireccion : '.',
                            TipoDireccion: TipoDireccion ? TipoDireccion : '.',
                            IdDireccionNs: IdDireccionNs,
                            IdDireccionDetNs: IdDireccionDetNs,
                            DireccionPredeterminadaEnvio: DireccionPredeterminadaEnvio ? 'S' : 'N', //AQUI
                            DireccionPredeterminadaFactura: DireccionPredeterminadaFactura ? 'S' : 'N'
                        });
                }
            }

            return Resultado;

        } catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaDireccionCliente_v2)';
        }
    }

    //VBC 20260408 
     function ConsultaSeguimientos(Cliente, Vehiculo, Seguimiento){
        try{

            let Resultado = [];

            let Busqueda = search.create({
                type: "customrecord_ht_record_seguicliente",
                filters:
                [
                    ["custrecord_ht_sc_tiposeguimiento","anyof","1","4","3"] //VENTAS, POST VENTA, FINANCIERO
                ],
                columns:
                [
                    search.createColumn({name: "name", label: "Cod_Seguimiento"}),
                    search.createColumn({name: "internalid", label: "Id_Interno_Seg"}),
                    search.createColumn({
                        name: "custentity_ht_cl_oficinacliente",
                        join: "CUSTRECORD_HT_SC_CLIENTE",
                        label: "Oficina_Cliente"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HT_SC_EMPLEADO",
                        label: "Id_Ejecutivo"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_empleado", label: "Nombre_Ejecutivo"}),
                    search.createColumn({name: "custrecord_ht_sc_tipocliente", label: "Tipo_Cliente"}),
                    search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HT_SC_CLIENTE",
                        label: "Codigo_Cliente"
                    }),
                    search.createColumn({
                        name: "vatregnumber",
                        join: "CUSTRECORD_HT_SC_CLIENTE",
                        label: "Codigo_Cliente"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_cliente", label: "HT Cliente"}),
                    search.createColumn({name: "custrecord_ht_sc_vehiculo", label: "Id_Bien"}),
                    search.createColumn({
                        name: "custrecord_ht_bien_codsysh",
                        join: "CUSTRECORD_HT_SC_VEHICULO",
                        label: "Cod_Bien_SH"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_fechacontacto", label: "Fecha_Contacto"}),
                    search.createColumn({
                        name: "custrecord_ht_md_codigo",
                        join: "CUSTRECORD_HT_SC_MODOCONTACTO",
                        label: "Cod_Modo_Contacto"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_modocontacto", label: "Modo_Contacto"}),
                    search.createColumn({
                        name: "custrecord_ht_rg_codigo",
                        join: "CUSTRECORD_HT_SC_RESULTADOGESTION",
                        label: "Cod_Resultado_Gestion"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_resultadogestion", label: "Resultado_Gestion"}),
                    search.createColumn({name: "custrecord_ht_sc_seguimiento", label: "Seguimiento"}),
                    search.createColumn({name: "custrecord_ht_sc_fechapproximocontacto", label: "Fecha_Proximo_Contacto"}),
                    search.createColumn({
                        name: "custrecord_ht_md_codigo",
                        join: "CUSTRECORD_HT_SC_PROXIMOCONTACTO",
                        label: "Cod_Forma_Proximo_Contacto"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_proximocontacto", label: "Forma_Proximo_Contacto"}),
                    search.createColumn({name: "custrecord_ht_sc_fechapromesa", label: "Fecha_Promesa_Contacto"}),
                    search.createColumn({name: "created", label: "Fecha de creación"}),
                    search.createColumn({name: "custrecord_ht_sc_estado", label: "HT SC Estado"}),
                    search.createColumn({
                        name: "custrecord_ht_esc_codigo",
                        join: "CUSTRECORD_HT_SC_ESTADO",
                        label: "Cod_Estado"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_tiposeguimiento", label: "HT SC Tipo seguimiento"}),
                    search.createColumn({
                        name: "custrecord_ht_mt_codigo",
                        join: "CUSTRECORD_HT_SC_CMOTIVO",
                        label: "Cod_Motivo"
                    }),
                    search.createColumn({name: "custrecord_ht_sc_cmotivo", label: "Motivo"}),
                    search.createColumn({name: "lastmodifiedby", label: "Última modificación hecha por"})
                ]
                });

            if (Cliente != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_sc_cliente', 
                    operator: search.Operator.IS,
                    values: Cliente
                }));
            }

            if (Vehiculo != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_sc_vehiculo', 
                    operator: search.Operator.IS,
                    values: Vehiculo
                }));
            }

            if (Seguimiento != '')
            {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: Seguimiento
                }));
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Cod_Seguimiento = ResConsulta[i].getValue({name: 'name'});
                let Id_Interno_Seg = ResConsulta[i].getValue({name: 'internalid'});
                let Oficina_Cliente = ResConsulta[i].getValue({name: 'custentity_ht_cl_oficinacliente', join: "CUSTRECORD_HT_SC_CLIENTE"});
                let Id_Ejecutivo = ResConsulta[i].getValue({name: 'internalid', join: "CUSTRECORD_HT_SC_EMPLEADO"});
                let Nombre_Ejecutivo = ResConsulta[i].getText({name: 'custrecord_ht_sc_empleado'});
                let Tipo_Cliente = ResConsulta[i].getText({name: 'custrecord_ht_sc_tipocliente'});
                let Id_Cliente = ResConsulta[i].getValue({name: 'internalid', join: "CUSTRECORD_HT_SC_CLIENTE"});
                let Codigo_Cliente = ResConsulta[i].getValue({name: 'vatregnumber', join: "CUSTRECORD_HT_SC_CLIENTE"});
                let Cliente = ResConsulta[i].getText({name: 'custrecord_ht_sc_cliente'});
                let Id_Bien = ResConsulta[i].getValue({name: 'custrecord_ht_sc_vehiculo'});
                let Cod_Bien_SH = ResConsulta[i].getValue({name: 'custrecord_ht_bien_codsysh', join: "CUSTRECORD_HT_SC_VEHICULO"}) ? ResConsulta[i].getValue({name: 'custrecord_ht_bien_codsysh', join: "CUSTRECORD_HT_SC_VEHICULO"}): '';
                let Fecha_Contacto = ResConsulta[i].getValue({name: 'custrecord_ht_sc_fechacontacto'});
                let Cod_Modo_Contacto = ResConsulta[i].getValue({name: 'custrecord_ht_md_codigo', join: "CUSTRECORD_HT_SC_MODOCONTACTO"});
                let Modo_Contacto = ResConsulta[i].getText({name: 'custrecord_ht_sc_modocontacto'});
                let Cod_Resultado_Gestion = ResConsulta[i].getValue({name: 'custrecord_ht_rg_codigo', join: "CUSTRECORD_HT_SC_RESULTADOGESTION"}) ? ResConsulta[i].getValue({name: 'custrecord_ht_rg_codigo', join: "CUSTRECORD_HT_SC_RESULTADOGESTION"}): '';
                let Resultado_Gestion = ResConsulta[i].getText({name: 'custrecord_ht_sc_resultadogestion'}) ? ResConsulta[i].getText({name: 'custrecord_ht_sc_resultadogestion'}): '';
                let Seguimiento = ResConsulta[i].getValue({name: 'custrecord_ht_sc_seguimiento'});
                let Fecha_Proximo_Contacto = ResConsulta[i].getValue({name: 'custrecord_ht_sc_fechapproximocontacto'}) ? ResConsulta[i].getValue({name: 'custrecord_ht_sc_fechapproximocontacto'}): '';
                let Cod_Forma_Proximo_Contacto = ResConsulta[i].getValue({name: 'custrecord_ht_md_codigo', join: "CUSTRECORD_HT_SC_PROXIMOCONTACTO"}) ? ResConsulta[i].getValue({name: 'custrecord_ht_md_codigo', join: "CUSTRECORD_HT_SC_PROXIMOCONTACTO"}): '';
                let Forma_Proximo_Contacto = ResConsulta[i].getText({name: 'custrecord_ht_sc_proximocontacto'}) ? ResConsulta[i].getText({name: 'custrecord_ht_sc_proximocontacto'}): '';
                let Fecha_Promesa_Contacto = ResConsulta[i].getValue({name: 'custrecord_ht_sc_fechapromesa'}) ? ResConsulta[i].getValue({name: 'custrecord_ht_sc_fechapromesa'}): '';
                let Fecha_Creacion = ResConsulta[i].getValue({name: 'created'});
                let Cod_Estado = ResConsulta[i].getValue({name: 'custrecord_ht_esc_codigo', join: "CUSTRECORD_HT_SC_ESTADO"}) ? ResConsulta[i].getValue({name: 'custrecord_ht_esc_codigo', join: "CUSTRECORD_HT_SC_ESTADO"}): '';
                let Estado = ResConsulta[i].getText({name: 'custrecord_ht_sc_estado'});
                let TipoSeguimiento = ResConsulta[i].getText({name: 'custrecord_ht_sc_tiposeguimiento'}).substring(0,3) ? ResConsulta[i].getText({name: 'custrecord_ht_sc_tiposeguimiento'}).substring(0,3): '';
                let Cod_Motivo = ResConsulta[i].getValue({name: 'custrecord_ht_mt_codigo', join: "CUSTRECORD_HT_SC_CMOTIVO"}) ? ResConsulta[i].getValue({name: 'custrecord_ht_mt_codigo', join: "CUSTRECORD_HT_SC_CMOTIVO"}): '';
                let Motivo = ResConsulta[i].getText({name: 'custrecord_ht_sc_cmotivo'}) ? ResConsulta[i].getText({name: 'custrecord_ht_sc_cmotivo'}): '';
                let USER = ResConsulta[i].getValue({name: 'lastmodifiedby'}) ? ResConsulta[i].getValue({name: 'lastmodifiedby'}): '';

                Resultado.push({
                    Cod_Seguimiento: Cod_Seguimiento,
                    Id_Interno_Seg: Id_Interno_Seg,
                    Oficina_Cliente: Oficina_Cliente,
                    Id_Ejecutivo: Id_Ejecutivo,
                    Nombre_Ejecutivo: Nombre_Ejecutivo,
                    Tipo_Cliente: Tipo_Cliente,
                    Id_Cliente: Id_Cliente,
                    Codigo_Cliente: Codigo_Cliente,
                    Cliente: Cliente,
                    Id_Bien: Id_Bien ? Id_Bien: '0',
                    Cod_Bien_SH: Cod_Bien_SH ? Cod_Bien_SH: '0',
                    Fecha_Contacto: Fecha_Contacto,
                    Cod_Modo_Contacto: Cod_Modo_Contacto,
                    Modo_Contacto: Modo_Contacto,
                    Cod_Resultado_Gestion: Cod_Resultado_Gestion,
                    Resultado_Gestion: Resultado_Gestion,
                    Seguimiento: Seguimiento,
                    Fecha_Proximo_Contacto: Fecha_Proximo_Contacto ? Fecha_Proximo_Contacto: '01/01/1900',
                    Cod_Forma_Proximo_Contacto: Cod_Forma_Proximo_Contacto,
                    Forma_Proximo_Contacto: Forma_Proximo_Contacto,
                    Fecha_Promesa_Contacto: Fecha_Promesa_Contacto ? Fecha_Promesa_Contacto : '01/01/1900',
                    Fecha_Creacion: Fecha_Creacion,
                    Cod_Estado: Cod_Estado,
                    Estado: Estado,
                    TipoSeguimiento: TipoSeguimiento,
                    Cod_Motivo: Cod_Motivo,
                    Motivo: Motivo,
                    USER: USER
                });
            }

            return Resultado;

        }   catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado. (ConsultaSeguimientos)';
        }
     }

   
    function InsertaCliente(Cliente) {
        try {
                
                let IdCliente = 0;
                log.error('objeto cliente: ', Cliente);
          
                let RecCliente = record.create({type: 'customer', isDynamic: true});
                RecCliente.setValue({fieldId: 'custentity_ec_vatregnumber', value: Cliente[0].Identificacion});
                RecCliente.setValue({fieldId: 'custentity_ht_cl_primernombre', value: Cliente[0].PrimerNombre});
                RecCliente.setValue({fieldId: 'custentity_ht_cl_segundonombre', value: Cliente[0].SegundoNombre});
                RecCliente.setValue({fieldId: 'custentity_ht_cl_apellidopaterno', value: Cliente[0].ApellidoPaterno});
                RecCliente.setValue({fieldId: 'custentity_ht_cl_apellidomaterno', value: Cliente[0].ApellidoMaterno});
                RecCliente.setValue({fieldId: 'firstname', value: Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre});
                RecCliente.setValue({fieldId: 'lastname', value: Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno});
                RecCliente.setValue({fieldId: 'altname', value: Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre + ' ' + Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno});                
                RecCliente.setValue({fieldId: 'category', value: Cliente[0].TipoCliente});
                RecCliente.setValue({fieldId: 'isperson', value: Cliente[0].Tipo}); //T, F
                RecCliente.setValue({fieldId: 'billaddressee', value: Cliente[0].Direccion});
                RecCliente.setValue({fieldId: 'homephone', value: Cliente[0].Telefeono});
                RecCliente.setValue({fieldId: 'email', value: Cliente[0].Email});
                RecCliente.setValue({fieldId: 'custentity_ht_cl_oficinacliente', value: Cliente[0].Oficina});
                RecCliente.setValue({fieldId: 'custentity_ts_ec_tipo_persona', value: Cliente[0].TipoPersona});
                RecCliente.setValue({fieldId: 'custentity_ec_document_type', value: Cliente[0].TipoDocumento});
                RecCliente.setValue({fieldId: 'custentityts_ec_pais_entidad', value: Cliente[0].Pais});
                RecCliente.setValue({fieldId: 'salesrep', value: Cliente[0].EjecutivaVenta});
                RecCliente.setValue({fieldId: 'custentity_cliente_ej_reno', value: Cliente[0].EjecutivaRenovacion});          
                RecCliente.setValue({fieldId: 'vatregnumber', value: Cliente[0].Identificacion});
                RecCliente.setValue({fieldId: 'entityId', value: "C-EC-" + Cliente[0].Identificacion});
          
                IdCliente = RecCliente.save({ ignoreMandatoryFields: true });          
                return IdCliente;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo insertar el registro (InsertaCliente)';
        }
    }

    function InsertaDireccionCliente(RecCliente){
        try{
            let Validacion = '';
            let Predetermidada = '';
            let c_enviopred = 0;
            let c_factpred = 0;
          
            let ObjCLiente =record.load({type: record.Type.CUSTOMER, id: RecCliente[0].IdCliente, isDynamic: true});
            Validacion = ValidaDireccionesCliente(ObjCLiente, RecCliente);
            if (Validacion != ''){
                return Validacion;
            }

            let FilasDir = ObjCLiente.getLineCount({sublistId: "addressbook"});
            if (FilasDir > 0) {
                for(let i = 0; i < FilasDir; i++) {
                    ObjCLiente.selectLine({sublistId: 'addressbook', line: i});
                    if (ObjCLiente.getSublistValue({sublistId: 'addressbook', fieldId: 'defaultshipping', line: i}) == true){
                        c_enviopred ++;
                    }
                    if (ObjCLiente.getSublistValue({sublistId: 'addressbook', fieldId: 'defaultbilling', line: i}) == true){
                        c_factpred ++;
                    }
                }
            }

            if (c_enviopred == 0){
                Predetermidada = 'Envío predeterminado.';
            }
            if (c_factpred == 0){
                Predetermidada += ' Factura predeterminada.';
            }

            ObjCLiente.selectNewLine({sublistId: 'addressbook'});

            let ObjDetDireccion = ObjCLiente.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress'});

            ObjDetDireccion.setValue({ fieldId: 'addr1', value: RecCliente[0].DireccionCorta});
            ObjDetDireccion.setValue({ fieldId: 'addr2', value: RecCliente[0].Direccion});
            ObjDetDireccion.setValue({ fieldId: 'addr3', value: ''});
            ObjDetDireccion.setValue({ fieldId: 'label', value: RecCliente[0].Etiqueta});
            ObjDetDireccion.setValue({ fieldId: 'country', value: RecCliente[0].Pais});
            ObjDetDireccion.setValue({ fieldId: 'addrphone', value: RecCliente[0].Telefono});
            ObjDetDireccion.setValue({ fieldId: 'custrecord_ht_direccion_tipo', value: RecCliente[0].TipoDireccion});
            if (RecCliente[0].Pais == 'EC') {
                ObjDetDireccion.setValue({ fieldId: 'custrecord_ec_provincia', value: RecCliente[0].Provincia});
                ObjDetDireccion.setValue({ fieldId: 'custrecord_ec_canton', value: RecCliente[0].Canton});
                ObjDetDireccion.setValue({ fieldId: 'custrecord_ec_parroquia', value: RecCliente[0].Parroquia});    
            } else {
                ObjDetDireccion.setValue({ fieldId: 'city', value: RecCliente[0].Canton});
                ObjDetDireccion.setValue({ fieldId: 'zip', value: RecCliente[0].Zip});
            }

            ObjCLiente.setCurrentSublistValue({sublistId: 'addressbook', fieldId: 'isresidential', value: RecCliente[0].DireccionResidencia});

            ObjCLiente.commitLine({ sublistId: 'addressbook'});
            idDetalleDireccion = ObjCLiente.save({ enableSourcing: false, ignoreMandatoryFields: true});

            if ((idDetalleDireccion != 0) && (idDetalleDireccion != -1)){
                return 'Direccion Ingresada. ' + Predetermidada;
            }else {
                return 'id:400, Registro de Direccion no pudo ser ingresado.'
            }
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo insertar el registro (InsertaDireccionCliente)';
        }
    }

    function InsertaMailCliente(IdCliente, Correo, Principal, TipoCorreo)
    {
        try {

                if ((IdCliente == '') || (IdCliente == 0)) 
                {
                    return 'id:400, Ingrese idcliente.'
                }
                if (Correo == '')
                {
                    return 'id:400, Ingrese correo.'
                }
                if (Principal == '')
                {
                    return 'id:400, Ingrese correoprincipal.'
                }
                if ((TipoCorreo == '') || (TipoCorreo == 0)) 
                {
                    return 'id:400, Ingrese tipocorreo.'
                }

                if (Principal == 'T'){
                    Principal = true;
                }else{
                    Principal = false;
                }

                let IdDireccionCliente = 0;

                
                if ((Correo.indexOf('@') == -1) || (Correo.indexOf('.') == -1))
                {
                    return 'id:400, Formato de mail incorrecto.';
                }

                let Busqueda = search.create({
                    type: "customrecord_ht_record_correoelectronico",
                    filters: [
                        ["custrecord_ht_ce_enlace","is", IdCliente], "AND",
                        ["custrecord_ht_email_email","contains",Correo]
                    ],
                    columns:[
                        search.createColumn({name: "custrecord_ht_ce_enlace", label: "Cliente"})
                    ]
                });
                let BusquedaNumReg = Busqueda.runPaged().count;
                if (BusquedaNumReg > 0){
                    return 'id:400, Mail ya existe.';
                }
          
                let ojbCliente = record.create({ type: 'customrecord_ht_record_correoelectronico', isDynamic: true});
                ojbCliente.setValue({fieldId: 'custrecord_ht_ce_enlace', value: IdCliente});
                ojbCliente.setValue({fieldId: 'custrecord_ht_email_email', value: Correo});
                ojbCliente.setValue({fieldId: 'custrecord_ht_email_emailprincipal', value: Principal});
                ojbCliente.setValue({fieldId: 'custrecord_ht_email_tipoemail', value: TipoCorreo});

                IdDireccionCliente = ojbCliente.save({ enableSourcing: false, ignoreMandatoryFields: false });
                return IdDireccionCliente;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo insertar el registro (InsertaMailCliente)';
        }
    }

    function InsertaTelefonosCliente(IdCliente, Telefono, Principal, TipoTelefono)
    {
        try {
                if ((IdCliente == '') || (IdCliente == 0)) 
                {
                    return 'id:400, Ingrese idcliente.'
                }
                if (Telefono == '')
                {
                    return 'id:400, Ingrese telefono.'
                }
                if (Principal == '')
                {
                    return 'id:400, Ingrese telefonoprincipal.'
                }
                if ((TipoTelefono == '') || (TipoTelefono == 0)) 
                {
                    return 'id:400, Ingrese tipotelefono.'
                }

                if (Principal == 'T'){
                    Principal = true;
                }else{
                    Principal = false;
                }

                let TelfAux ='';
                if (Telefono.substring(0,1) == '0'){ //NO GRABA EL 0 AL INICIO
                    TelfAux = Telefono.substring(1);
                }else {
                    TelfAux = Telefono;
                }          

                let Busqueda = search.create({
                    type: "customrecord_ht_registro_telefono",
                    filters: [
                         ["custrecord_ht_campo_lbl_entidad_telefono","is", IdCliente], "AND", 
                         ["custrecord_ht_campo_txt_telefono","contains", TelfAux]
                    ],
                    columns:[
                        search.createColumn({name: "custrecord_ht_campo_lbl_entidad_telefono", label: "Cliente"})
                    ]
                });
                let BusquedaNumReg = Busqueda.runPaged().count;
                if (BusquedaNumReg > 0){
                    return 'id:400, Telefono ya existe.';
                }

                let IdTelefonoCliente = 0;

                let ojbCliente = record.create({ type: 'customrecord_ht_registro_telefono', isDynamic: true});
                ojbCliente.setValue({fieldId: 'custrecord_ht_campo_lbl_entidad_telefono', value: IdCliente});
                ojbCliente.setValue({fieldId: 'custrecord_ht_campo_txt_telefono', value: Telefono});
                ojbCliente.setValue({fieldId: 'custrecord_ht_campo_txt_principal', value: Principal});
                ojbCliente.setValue({fieldId: 'custrecord_ht_campo_list_tipo_telefono', value: TipoTelefono});

                IdTelefonoCliente = ojbCliente.save({ enableSourcing: false, ignoreMandatoryFields: false });
                return IdTelefonoCliente;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo insertar el registro (InsertaTelefonosCliente)';
        }
    }

  function ActualizaCliente(Cliente) { 
        try {
                let CamposActualizados='';

                if ((Cliente[0].IdCliente == '') || (Cliente[0].IdCliente == 0)) {
                    return 'id:400, Ingrese IdCliente.';
                }

                let RecCliente = record.load({type: 'customer', id: Cliente[0].IdCliente, isDynamic: true});
         
                if((Cliente[0].Identificacion != '') && (Cliente[0].Identificacion.length >= 10)) {
                    RecCliente.setValue({fieldId: 'custentity_ec_vatregnumber', value: Cliente[0].Identificacion, ignoreFieldChange: true});
                    CamposActualizados += 'Identificacion // ';
                }
                if(Cliente[0].PrimerNombre != '') {
                    RecCliente.setValue({fieldId: 'custentity_ht_cl_primernombre', value: Cliente[0].PrimerNombre, ignoreFieldChange: true});
                    CamposActualizados += 'PrimerNombre // ';
                }
                if(Cliente[0].SegundoNombre != '') {
                    RecCliente.setValue({fieldId: 'custentity_ht_cl_segundonombre', value: Cliente[0].SegundoNombre, ignoreFieldChange: true});
                    CamposActualizados += 'SegundoNombre // ';
                }
                if(Cliente[0].ApellidoPaterno != '') {
                    RecCliente.setValue({fieldId: 'custentity_ht_cl_apellidopaterno', value: Cliente[0].ApellidoPaterno, ignoreFieldChange: true});
                    CamposActualizados += 'ApellidoPaterno // ';
                }
                if(Cliente[0].ApellidoMaterno != '') {
                    RecCliente.setValue({fieldId: 'custentity_ht_cl_apellidomaterno', value: Cliente[0].ApellidoMaterno, ignoreFieldChange: true});
                    CamposActualizados += 'ApellidoMaterno // ';
                }
                /*
                if((Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre) != '') {
                    RecCliente.setValue({fieldId: 'firstname', value: Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre, ignoreFieldChange: true});
                    CamposActualizados += 'Nombres // ';
                }
                if((Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno) != '') {
                    RecCliente.setValue({fieldId: 'lastname', value: Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno, ignoreFieldChange: true});
                    CamposActualizados += 'Apellidos // ';
                }
                if((Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre + ' ' + Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno) != ''){
                    RecCliente.setValue({fieldId: 'altname', value: Cliente[0].PrimerNombre + ' ' + Cliente[0].SegundoNombre + ' ' + Cliente[0].ApellidoPaterno + ' ' + Cliente[0].ApellidoMaterno, ignoreFieldChange: true});
                    CamposActualizados += 'Nombre Completo // ';
                }*/
                if(Cliente[0].TipoCliente != '') {
                    RecCliente.setValue({fieldId: 'category', value: Cliente[0].TipoCliente, ignoreFieldChange: true});
                    CamposActualizados += 'TipoCliente // ';
                }
                if(Cliente[0].Tipo != '') {
                    RecCliente.setValue({fieldId: 'isperson', value: Cliente[0].Tipo}); //T, F
                    CamposActualizados += 'Es Empresa // ';
                }
                if(Cliente[0].Direccion != '') {
                    RecCliente.setValue({fieldId: 'billaddressee', value: Cliente[0].Direccion, ignoreFieldChange: true});
                    CamposActualizados += 'Direccion // ';
                }
                if(Cliente[0].Telefeono != ''){
                    RecCliente.setValue({fieldId: 'homephone', value: Cliente[0].Telefeono, ignoreFieldChange: true});
                    CamposActualizados += 'Telefono // ';
                }
                if(Cliente[0].Email != '') {
                    RecCliente.setValue({fieldId: 'email', value: Cliente[0].Email, ignoreFieldChange: true});
                    CamposActualizados += 'Email // ';
                }
                if(Cliente[0].Oficina != '') {
                    RecCliente.setValue({fieldId: 'custentity_ht_cl_oficinacliente', value: Cliente[0].Oficina, ignoreFieldChange: true});
                    CamposActualizados += 'Oficina // ';
                }
                if(Cliente[0].TipoPersona != ''){
                    RecCliente.setValue({fieldId: 'custentity_ts_ec_tipo_persona', value: Cliente[0].TipoPersona, ignoreFieldChange: true});
                    CamposActualizados += 'TipoPersona // ';
                }
                if(Cliente[0].TipoDocumento != ''){
                    RecCliente.setValue({fieldId: 'custentity_ec_document_type', value: Cliente[0].TipoDocumento, ignoreFieldChange: true});
                    CamposActualizados += 'TipoDocumento // ';
                }
                if(Cliente[0].Pais != ''){
                    RecCliente.setValue({fieldId: 'custentityts_ec_pais_entidad', value: Cliente[0].Pais, ignoreFieldChange: true});
                    CamposActualizados += 'Pais // ';
                }
                if(Cliente[0].EjecutivaVenta != ''){
                    RecCliente.setValue({fieldId: 'salesrep', value: Cliente[0].EjecutivaVenta, ignoreFieldChange: true});
                    CamposActualizados += 'EjecutivaVenta // ';
                }
                if(Cliente[0].EjecutivaRenovacion != ''){
                    RecCliente.setValue({fieldId: 'custentity_cliente_ej_reno', value: Cliente[0].EjecutivaRenovacion, ignoreFieldChange: true});
                    CamposActualizados += 'EjecutivaRenovacion // ';
                }
                if(Cliente[0].Identificacion != ''){
                    RecCliente.setValue({fieldId: 'vatregnumber', value: Cliente[0].Identificacion, ignoreFieldChange: true});
                    CamposActualizados += 'TAX REG. NUMBER // ';
                }
                if(Cliente[0].Identificacion != ''){
                    RecCliente.setValue({fieldId: 'entityId', value: "C-EC-" + Cliente[0].Identificacion, ignoreFieldChange: true});
                    CamposActualizados += 'Customer Id // ';
                }

                let idActualiza = 0;
          
                idActualiza = RecCliente.save({ enableSourcing: false, ignoreMandatoryFields: false });
                log.error('Campos actualizados: ', CamposActualizados);
                return idActualiza;

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo actualizar el registro (ActualizaCliente)';
        }
    }

    function UpdateMailCliente(IdDireccion, Correo, Principal, TipoCorreo){
        try{
            if ((IdDireccion == '') || (IdDireccion == 0)) {
                return 'id:400, Ingrese IdDireccion.'
            }
            if ( ((Correo == '') || (Correo == 0)) &&
                    ((Principal == '') || (Principal == 0)) &&
                    ((TipoCorreo == '') || (TipoCorreo == 0))
                )
            {
                return 'id:400, No hay campos por actualizar.';
            }
          
            let objDireccion = record.load({ type: 'customrecord_ht_record_correoelectronico', id: IdDireccion, isDynamic: true });
            log.error('Correo: ', Correo);
            if (Correo != ''){
                if ((Correo.indexOf('@') == -1) || (Correo.indexOf('.') == -1))
                {
                    return 'id:400, Formato de mail incorrecto.';
                }
                objDireccion.setValue({fieldId: 'custrecord_ht_email_email', value: Correo, ignoreFieldChange: true});
              log.error('Correo 1: ', Correo);
            }
            if (TipoCorreo != ''){
                objDireccion.setValue({fieldId: 'custrecord_ht_email_tipoemail', value: TipoCorreo, ignoreFieldChange: true});
              log.error('TipoCorreo 1: ', TipoCorreo);
            }
            if (Principal != ''){
                if (Principal == 'T'){
                    Principal = true;
                }else{
                    Principal = false;
                }
                objDireccion.setValue({fieldId: 'custrecord_ht_email_emailprincipal', value: Principal, ignoreFieldChange: true});
              log.error('Principal 1: ', Principal);
            }

            let idActualiza = 0;
            idActualiza = objDireccion.save({ enableSourcing: false, ignoreMandatoryFields: false });

            if ((idActualiza != 0) && (idActualiza != -1)){
                return 'Registro de Mail Actualizado.'
            }else {
                return 'id:400, Registro de Mail no pudo ser actualizado.'
            }

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (UpdateMailCliente).';
        }
    }

    function UpdateTelefonoCliente(IdTelefono, Telefono, Principal, TipoTelefono){
        try{
            if ((IdTelefono == '') || (IdTelefono == 0)) {
                return 'id:400, Ingrese IdTelefono.'
            }
            if ( ((Telefono == '') || (Telefono == 0)) &&
                    ((Principal == '') || (Principal == 0)) &&
                    ((TipoTelefono == '') || (TipoTelefono == 0))
                )
            {
                return 'id:400, No hay campos por actualizar.';
            }

            let objTelefono = record.load({ type: 'customrecord_ht_registro_telefono', id: IdTelefono, isDynamic: true });
            
            if (Telefono != ''){
                objTelefono.setValue({fieldId: 'custrecord_ht_campo_txt_telefono', value: Telefono, ignoreFieldChange: true});
            }
            if (TipoTelefono != ''){
                objTelefono.setValue({fieldId: 'custrecord_ht_campo_list_tipo_telefono', value: TipoTelefono, ignoreFieldChange: true});
            }
            if (Principal != ''){
                if (Principal == 'T'){
                    Principal = true;
                }else{
                    Principal = false;
                }
                objTelefono.setValue({fieldId: 'custrecord_ht_campo_txt_principal', value: Principal, ignoreFieldChange: true});
            }

            let idActualiza = 0;
            idActualiza = objTelefono.save({ enableSourcing: false, ignoreMandatoryFields: false });

            if ((idActualiza != 0) && (idActualiza != -1)){
                return 'Registro de Telefono Actualizado.'
            }else {
                return 'id:400, Registro de Telefono no pudo ser actualizado.'
            }

        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error controlado (UpdateTelefonoCliente).';
        }
    }

    function UpdateDireccionCliente(RecCliente){ 
        try{
            let idActualiza = 0;
            let FilasDir = 0;

            if ((RecCliente[0].IdCliente == 0) || (RecCliente[0].IdCliente == '')){
                return 'id:400, Ingrese idcliente.'
            }
            if ((RecCliente[0].IdDireccion == 0) || (RecCliente[0].IdDireccion == '')){
                return 'id:400, Ingrese iddireccion.'
            }

            if ((RecCliente[0].EnvioPredeterminado == true) || (RecCliente[0].FacturaPredeterminado == true))
            {
                let ObjCLienteAux =record.load({type: record.Type.CUSTOMER, id: RecCliente[0].IdCliente});
                FilasDir = ObjCLienteAux.getLineCount({sublistId: "addressbook"});
              
                if (RecCliente[0].EnvioPredeterminado == true){ //solo db haber 1 registro seleccionado como envio predeterminado, por eso se deselecciona las casillas de todos los demas
                    if (FilasDir > 0) {
                        for(let i = 0; i < FilasDir; i++) {
                            ObjCLienteAux.setSublistValue({sublistId: 'addressbook', fieldId: 'defaultshipping', value: false, line:i});
                        }
                    }
                }
                if (RecCliente[0].FacturaPredeterminado == true){ //solo db haber 1 registro seleccionado como envio predeterminado, por eso se deselecciona las casillas de todos los demas
                    if (FilasDir > 0) {
                        for(let i = 0; i < FilasDir; i++) {
                            ObjCLienteAux.setSublistValue({sublistId: 'addressbook', fieldId: 'defaultbilling', value: false, line:i});
                        }
                    }
                }
                ObjCLienteAux.save();
                FilasDir = 0;
            }

            let ObjCLiente =record.load({type: record.Type.CUSTOMER, id: RecCliente[0].IdCliente});
          
            let ObjCLienteV =record.load({type: record.Type.CUSTOMER, id: RecCliente[0].IdCliente, isDynamic: true});
            let Validacion = ValidaDireccionesCliente(ObjCLienteV, RecCliente);
            if (Validacion != ''){
                return Validacion;
            }
            
            FilasDir = ObjCLiente.getLineCount({sublistId: "addressbook"});

            if (FilasDir == 0){
                return 'id:400, No existen direcciones registradas.'
            }

            if (FilasDir > 0) {
                for(let i = 0; i < FilasDir; i++) {
                    let subrec = ObjCLiente.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: i
                    });

                    if (subrec.getValue({fieldId: 'nkey'}) == RecCliente[0].IdDireccion){
                        if (RecCliente[0].DireccionCorta != ''){
                            subrec.setValue({fieldId: 'addr1', value: RecCliente[0].DireccionCorta});
                        }
                        if (RecCliente[0].Direccion != ''){
                            subrec.setValue({fieldId: 'addr2', value: RecCliente[0].Direccion});
                        }
                        if ((RecCliente[0].Pais != 0) && (RecCliente[0].Pais != '')){
                            subrec.setValue({fieldId: 'country', value: RecCliente[0].Pais});
                        }
                        if (RecCliente[0].Telefono != '') {
                            subrec.setValue({fieldId: 'addrphone', value: RecCliente[0].Telefono});
                        }
                        if ((RecCliente[0].TipoDireccion != '') && (RecCliente[0].TipoDireccion != 0)) {
                            subrec.setValue({fieldId: 'custrecord_ht_direccion_tipo', value: RecCliente[0].TipoDireccion});
                        }
                        if ((RecCliente[0].Provincia != 0) && (RecCliente[0].Provincia != '')){
                            subrec.setValue({fieldId: 'custrecord_ec_provincia', value: RecCliente[0].Provincia});
                        }
                        if ((RecCliente[0].Canton != 0) && (RecCliente[0].Canton != '')){
                            subrec.setValue({fieldId: 'custrecord_ec_canton', value: RecCliente[0].Canton});
                        }
                        if ((RecCliente[0].Parroquia != 0) && (RecCliente[0].Parroquia != '')){
                            subrec.setValue({fieldId: 'custrecord_ec_parroquia', value: RecCliente[0].Parroquia});
                        }
                        if ((RecCliente[0].Canton != 0) && (RecCliente[0].Canton != '')){
                            subrec.setValue({fieldId: 'city', value: RecCliente[0].Canton});
                        }
                        if ((RecCliente[0].Zip != 0) && (RecCliente[0].Zip != '')){
                            subrec.setValue({fieldId: 'zip', value: RecCliente[0].Zip});
                        }
                        if ((RecCliente[0].Etiqueta != 0) && (RecCliente[0].Etiqueta != '')){
                            ObjCLiente.setSublistValue({sublistId: 'addressbook', fieldId: 'label', value: RecCliente[0].Etiqueta, line:i});
                        }
                        //if ((RecCliente[0].EnvioPredeterminado != 0) && (RecCliente[0].EnvioPredeterminado != '')){
                            ObjCLiente.setSublistValue({sublistId: 'addressbook', fieldId: 'defaultshipping', value: RecCliente[0].EnvioPredeterminado, line:i});
                        //}
                        //if ((RecCliente[0].FacturaPredeterminado != 0) && (RecCliente[0].FacturaPredeterminado != '')){
                            ObjCLiente.setSublistValue({sublistId: 'addressbook', fieldId: 'defaultbilling', value: RecCliente[0].FacturaPredeterminado, line:i});
                        //}
                        //if ((RecCliente[0].DireccionResidencia != 0) && (RecCliente[0].DireccionResidencia != '')){
                          log.error('residencia dentro: ', RecCliente[0].DireccionResidencia);
                            ObjCLiente.setSublistValue({sublistId: 'addressbook', fieldId: 'isresidential', value: RecCliente[0].DireccionResidencia, line:i});
                        //}

                        idActualiza = ObjCLiente.save();
                    }
                }
            }

            if ((idActualiza != 0) && (idActualiza != -1)){
                return 'Registro de Dirección Actualizado.'
            }else {
                return 'id:400, Registro de Dirección no pudo ser actualizado.'
            }
            
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo actualizar el registro (UpdateDireccionCliente)';
        }
    }
   
    function ValidaDireccionesCliente(Cliente, RecCliente){
        let FilasDir = Cliente.getLineCount({sublistId: "addressbook"});

        if (FilasDir > 0) {
            for(let i = 0; i < FilasDir; i++) {
                Cliente.selectLine({sublistId: 'addressbook', line: i});
                let subrec = Cliente.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress'});
              log.error('subrec: ', subrec);

                if (subrec.getValue({fieldId: 'addr1'}) == RecCliente[0].DireccionCorta) {
                    return 'Dirección Corta ya existe, verifique por favor.';
                }
                if (subrec.getValue({fieldId: 'addr2'}) == RecCliente[0].Direccion) {
                    return 'Dirección ya existe, verifique por favor.';
                }
            }
        }
        return '';
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