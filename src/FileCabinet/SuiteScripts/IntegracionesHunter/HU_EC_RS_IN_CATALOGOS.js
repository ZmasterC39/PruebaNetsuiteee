/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log','N/record','N/search','N/query','./UtilsGeneral/HU_EC_CONSTANTES'], function(log, record, search, query, _const) {
    const LONGITUD_PAGINA = 25;
    const PaisConsulta = 'EC';
    let OrigenConsulta = 'WEB'; //PARA CONTROLAR LA RESPUESTA, SI ES WEB DB DEVOLVER VACIO, SI ES SQL DB RETORNAR TABLA
    var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC;
       
        function _get(context){
            try{
                let CodigoTabla = context.codigotabla;
                let CodItem = 0;   
                let Parametro = '';
                let Criterio = '';
                let Indice = 0; 
                let ResultadoConsulta = [];
                
				if (typeof context.tiporetorno != 'undefined') {
					if (context.tiporetorno.length != 0) {
							OrigenConsulta = context.tiporetorno;
					}
                }

                switch (CodigoTabla) {
                    case "IVA":
                        /*let FechaEvaluada = context.fecha;
                            let Tipo = context.TipoImpuesto;
        
                        //log.debug("fecha: ",FechaEvaluada);
                        FechaEvaluada = FechaEvaluada.replace(/-/g,'/');
                        //log.debug("fecha: ",FechaEvaluada);
        
                        FechaEvaluada = FechaEvaluada.replace(/"/g,"")
                        //log.debug("fecha: ",FechaEvaluada);
        
                        ResultadoConsulta = ConsultaIVA(FechaEvaluada, Tipo);*/

                        let IdIva = context.idiva;
                        ResultadoConsulta = ObtieneIva(IdIva); //IVA  //2 servicio
                        break;

                    case "MAR":
                        let CodigoMarca = "";
                        let PaginaIndice = 0;

                        if (typeof context.indice != 'undefined') {
                            if (context.indice.length != 0) {
                                PaginaIndice = context.indice;
                            }
                        }
                    
                        if (typeof context.marca != 'undefined') {
                             if (context.marca.length != 0) {
                                     CodigoMarca = context.marca;
                             }
                        }
                        ResultadoConsulta=ConsultaMarca(CodigoMarca, PaginaIndice);
                        break;

                    case "MDA":
                        let CodMarca = context.marca;
                        let CodModelo = context.modelo;
                        let paginaId = context.indice;

                        ResultadoConsulta=ConsultaModelo(CodMarca, CodModelo,paginaId);
                        break;

                    case "ITEM":
                        CodItem = context.idproducto;
                        ////let CodAdp = context.adp;
                        let IdNivel = context.nivelprecio;
                        //ResultadoConsulta=ConsultaItem(CodItem, CodAdp,IdNivel); 
                        ResultadoConsulta = ConsultaItemComercial (CodItem, IdNivel);
                        break;

                    case "ITEM_PARAM":
                        CodItem = context.idproducto;
                        Parametro = context.parametro;
                        //let IdNivel = context.nivelprecio;
                        ResultadoConsulta=ObtieneItemParametro(CodItem, Parametro);
                        break;

                    case "ITEM_PROD":
                        Prod = "";
                        IdItemNs = 0;

                       if (typeof context.grupoproducto != 'undefined') {
                           if (context.grupoproducto.length != 0) {
                                 Prod = context.grupoproducto;
                           }
                        }
                       if (typeof context.id != 'undefined') {
                           if (context.id.length != 0) {
                                 IdItemNs = context.id;
                           }
                        }
                    
                        ResultadoConsulta=ConsultaItemPorFamiliaProducto( Prod, IdItemNs);
                        break;

                    
                    case "ITEM_COMERCIAL":
                        Trans = "";
                        Item = 0;
                        Prod = "";
                        IdItemNs = 0;

                       if (typeof context.transaccion != 'undefined') {
                           if (context.transaccion.length != 0) {
                                 Trans = context.transaccion;
                           }
                        }
                       if (typeof context.item != 'undefined') {
                           if (context.item.length != 0) {
                                 Item = context.item;
                           }
                        }
                       if (typeof context.idproducto != 'undefined') {
                           if (context.idproducto.length != 0) {
                                 Prod = context.idproducto;
                           }
                        }
                       if (typeof context.id != 'undefined') {
                           if (context.id.length != 0) {
                                 IdItemNs = context.id;
                           }
                        }
                    
                        ResultadoConsulta=ConsultaItemComercialSql(Trans, Item, Prod, IdItemNs);
                        break;

                    case "TDI": case "TTE": case "OFI": case "TCLI": case "TVH": case "TID": case "TAC": case "TMAI": case "TPE":case "SEX":case "CLA":case "TER":case "SER":case "UNT":case "NPR":
                        let Id = context.id;
                        let Entidad = '';
                        let ColumnaDescripcion = 'name';
                        let ColumnaId = '';
                        let ColNombreSubsidiary = '';
                    
                        if (CodigoTabla == "TDI"){
                            Entidad = 'customrecord_ht_registro_tipo_direccion';
                        }
                        if (CodigoTabla == "TTE"){
                            Entidad = 'customrecordht_registro_tipo_telefono';
                        }
                        if (CodigoTabla == "OFI"){
                            Entidad = 'location';
                            ColNombreSubsidiary = 'subsidiary';
                        }
                        if (CodigoTabla == "TCLI"){
                            Entidad = 'customercategory';
                        }
                        if (CodigoTabla == "TVH"){
                            Entidad = 'customrecord_ht_bien_tipobien';
                        }
                        if (CodigoTabla == "TID"){
                            Entidad = 'customrecord_ec_document_type';
                        }
                        if (CodigoTabla == "TAC"){
                            Entidad = 'customrecord_ht_record_sectoreconomico';
                            ColumnaDescripcion = 'altname';
                        }
                        if (CodigoTabla == "TMAI"){
                            Entidad = 'customlist_ht_email_tipoemail';
                        }
                        if (CodigoTabla == "TPE"){
                            Entidad = 'CUSTOMRECORD_PE_TYPE_OF_PERSON';
                        }
                        if (CodigoTabla == "SEX"){
                            Entidad = 'CUSTOMLIST_HT_CT_SEXO';
                        }
                        //CLASIFICACION
                        if (CodigoTabla == "CLA"){
                            Entidad = 'classification';
                            ColNombreSubsidiary = 'subsidiary';
                        }
                        //TERMINOS
                        if (CodigoTabla == "TER"){
                            Entidad = 'term';
                        }
                        //SERVICIOS
                        if (CodigoTabla == "SER"){
                            Entidad = 'customrecord_ht_servicios';
                            ColNombreSubsidiary = 'custrecord_ht_sv_sub';
                        }
                        //UNIDAD DE TIEMPO
                        if (CodigoTabla == "UNT") {
                            Entidad = 'customlist_ht_os_unid_tiempo';
                        }

                        //NIVEL DE PRECIO
                        if (CodigoTabla == "NPR") {
                            Entidad = 'pricelevel';                           
                        }
                       
                        ResultadoConsulta = ConsultaGeneralCatalogo(Id, Entidad, ColumnaDescripcion, ColumnaId, ColNombreSubsidiary);
                        break;

                    case "PRO_PARAM":
                        let Producto = context.grupoproducto;
                        Parametro = context.parametro;
                        let Valor = "";
                        Item = 0;
                        let IdNivel1 = '';

                        if (typeof context.valor != 'undefined') {
                            if (context.valor.length != 0) {
                                Valor = context.valor;
                            }
                        }
                        if (typeof context.item != 'undefined') {
                            if (context.item.length != 0) {
                                  Item = context.item;
                            }
                        }
                        if (typeof context.nivelprecio != 'undefined') {
                            if (context.nivelprecio.length != 0) {
                                  IdNivel1 = context.nivelprecio;
                            }
                        }
                        ResultadoConsulta = ConsultaProductoAdp(Producto, Parametro, Valor, IdNivel1, Item);
                        break;

                    case "PROV":                        
                        let IdProvincia = context.idprovincia;
                        ResultadoConsulta = ConsultaProvincia(IdProvincia);
                        break;

                    case "CIU":                        
                        let IdProvi = context.idprovincia;
                        let IdCanton = context.idcanton;
                        Indice = context.indice;
                        ResultadoConsulta = ConsultaCanton(IdProvi,IdCanton,Indice);
                        break;

                    case "PARR":                        
                        let IdProvincia1 = context.idprovincia;
                        let IdCanton1 = context.idcanton;
                        let IdParroquia = context.idparroquia;
                        Indice = context.indice;
                        ResultadoConsulta = ConsultaParroquia(IdProvincia1,IdCanton1,IdParroquia,Indice);
                        break;

                    case "TVHD":
                        let TipoVeh = context.tipovehiculo;
                        let tipoDet = context.tipovehdet;
                        ResultadoConsulta = ConsultaTipoVehiculoDetalle(TipoVeh, tipoDet);
                        break;

                    case "ASE": case "CON": case "FIN": case "VND": case "VEX":
                        let TipoCanal = 0;
                        let IdCanal = "";
                        let RucCanal = "";

                        if (CodigoTabla == "ASE"){
                            TipoCanal = 1;
                        }
                        if (CodigoTabla == "CON"){
                            TipoCanal = 2;
                        }
                        if (CodigoTabla == "FIN"){
                            TipoCanal = 3;
                        }
                        if (CodigoTabla == "VND"){
                            TipoCanal = 4;
                        }
                        if (CodigoTabla == "VEX"){
                            TipoCanal = 5;
                        }

                        Criterio = "";

                        if (typeof context.idcanal != 'undefined') {
                            if (context.idcanal.length != 0) {
                                    IdCanal = context.idcanal;
                            }
                        }

                        if (typeof context.ruc != 'undefined') {
                            if (context.ruc.length != 0) {
                                    RucCanal = context.ruc;
                            }
                        }

                        if (typeof context.criterio != 'undefined') {
                            if (context.criterio.length != 0) {
                                    Criterio = context.criterio;
                            }
                        }

                        if(TipoCanal == 1 || TipoCanal == 2)  {
                            ResultadoConsulta = ConsultaCanal(IdCanal, RucCanal, TipoCanal,Criterio); 
                        }
                        if(TipoCanal == 3) {
                            let PaginaIndice = 0;

                            if (typeof context.indice != 'undefined') {
                                if (context.indice.length != 0) {
                                        PaginaIndice = context.indice;
                                }
                            }
                            ResultadoConsulta = ConsultaCanal_v2(IdCanal, RucCanal, TipoCanal, Criterio, PaginaIndice); 
                        }                    
                        if (TipoCanal == 4)
                        {
                            let PaginaIndice = 0;

                            if (typeof context.indice != 'undefined') {
                                if (context.indice.length != 0) {
                                        PaginaIndice = context.indice;
                                }
                            }
                            ResultadoConsulta = ConsultaVendedor(IdCanal, RucCanal, Criterio, PaginaIndice); //vendedor
                        }
                        if (TipoCanal == 5)
                        {
                            let PaginaIndice = 0;

                            if (typeof context.indice != 'undefined') {
                                if (context.indice.length != 0) {
                                        PaginaIndice = context.indice;
                                }
                            }
                            ResultadoConsulta = ConsultaVendedorCompleto(IdCanal, RucCanal, Criterio, PaginaIndice); //vendedor
                        }

                        break;

                    case "COL":
                        let IdColor = context.idcolor;
                        ResultadoConsulta=ConsultaColor(IdColor);
                        break;

                    case "PAI":
                        let IdPais = context.idpais;
                        Criterio = context.criterio;
                        ResultadoConsulta=ConsultaPais(IdPais, Criterio);
                        break;

                    case "ESU":
                        ResultadoConsulta=ConsultaSupervisorEmpleado(context.idejecutiva);
                        break;

                    case "EJE": case "USER": 
                        let IdEjecutiva = 0;
                        Criterio = '';
                        let Clase = 0;
                        let Ciudad = 0;

                        if (typeof context.idejecutiva != 'undefined') { 
                            if (context.idejecutiva.length != 0) {
                                    IdEjecutiva = context.idejecutiva;
                            }
                        }

                        if (typeof context.criterio != 'undefined') {
                            if (context.criterio.length != 0) {
                                    Criterio = context.criterio;
                            }
                        }

                        if (typeof context.clase != 'undefined') {
                            if (context.clase.length != 0) {
                                    Clase = context.clase;
                            }
                        }

                        if (typeof context.ciudad != 'undefined') {
                            if (context.ciudad.length != 0) {
                                    Ciudad = context.ciudad;
                            }
                        }
                        let EsEje = "T";
                        if (CodigoTabla == "USER"){
                          EsEje = "F";
                        } 
                        ResultadoConsulta=ConsultaEjecutiva(EsEje, IdEjecutiva, Criterio, Clase, Ciudad);
                        break;

                    case "EMP":
                        let IdEjecutivaNs = 0;
                        Criterio = '';
                        let CiudadNs = 0;

                        if (typeof context.idejecutiva != 'undefined') { 
                            if (context.idejecutiva.length != 0) {
                                    IdEjecutivaNs = context.idejecutiva;
                            }
                        }

                        if (typeof context.criterio != 'undefined') {
                            if (context.criterio.length != 0) {
                                    Criterio = context.criterio;
                            }
                        }

                        if (typeof context.ciudad != 'undefined') {
                            if (context.ciudad.length != 0) {
                                    CiudadNs = context.ciudad;
                            }
                        }

                        ResultadoConsulta=ConsultaEmpleado(IdEjecutivaNs, Criterio, CiudadNs);
                        break;

                    case "TCA":
                        ResultadoConsulta=ConsultaTipoCanal();
                        break;

                    case "FAC":
                        let IdInternoFac = 0;
                        let IdProveedor = context.idproveedor;
                        let Serie = context.seriedocumento;
                        let TipoDoc = context.tipodoc;

                       if (typeof context.idfactura != 'undefined') {
                           if (context.idfactura.length != 0) {
                                 IdInternoFac = context.idfactura;
                           }
                        }
                    
                        ResultadoConsulta=ConsultaFactura(IdProveedor, IdInternoFac, Serie, TipoDoc);
                        break;

                    case "CNV":
                        let CodCnv = "";
                        let DescripcionCnv = "";

                       if (typeof context.codigo != 'undefined') {
                           if (context.codigo.length != 0) {
                            CodCnv = context.codigo;
                           }
                        }
                        if (typeof context.descripcion != 'undefined') {
                            if (context.descripcion.length != 0) {
                                DescripcionCnv = context.descripcion;
                            }
                         }

                        ResultadoConsulta=ConsultaConvenio(CodCnv, DescripcionCnv);
                        break;

                    case "PARAM":

                       if (typeof context.parametro != 'undefined') {
                           if (context.parametro.length != 0) {
                            Parametro = context.parametro;
                           }
                        }

                        ResultadoConsulta=Get_Parametro_Producto(Parametro);
                        break;

                    case "PARAM2":
                        let ListaItem = "";
                        let CodigoParametro = "";
                        let ValorParam = "";

                        ListaItem = context.listaitem;
                        CodigoParametro = context.parametro;

                        if (typeof context.valor != 'undefined') {
                            if (context.valor.length != 0) {
                                    ValorParam = context.valor;
                            }
                        }
                        
                        ResultadoConsulta=AniosAnticipados(ListaItem, CodigoParametro, ValorParam);
                        break;
                    
                    case "CHA":
                        if (typeof context.parametro != 'undefined') {
                           if (context.parametro.length != 0) {
                            Parametro = context.parametro;
                           }
                        }
                        ResultadoConsulta=ConsultaDispositivoChaser(Parametro);
                        break;
                    
                    case "SIM":
                        if (typeof context.parametro != 'undefined') {
                           if (context.parametro.length != 0) {
                            Parametro = context.parametro;
                           }
                        }
                        ResultadoConsulta=ConsultaSimCard(Parametro);
                        break;
                    
                    case "EPC"://MLNY NOV2025
                        if (typeof context.parametro != 'undefined') {
                           if (context.parametro.length != 0) {
                            Parametro = context.parametro;
                           }
                        }
                        ResultadoConsulta=EstadoPeriodoContable(Parametro);
                        break;

                    case "ITEMS_2":
                        let ItemDescripcion = context.descripcionitem;
                        let ItemTransaccion = context.descripciontrans;
                        let ItemProducto = context.descripcionprod;
                        let Alquiler = context.alq;
                        let Indice = 0;

                        if (typeof context.indice != 'undefined') {
                            if (context.indice.length != 0) {
                                Indice = context.indice;
                            }
                        }

                        ResultadoConsulta=ConsultaItemsGeneral(ItemDescripcion, ItemTransaccion, ItemProducto, Alquiler, Indice);
                        break;

                    case "UNI":  //UNIDADES
                        let IdUnidad = context.id;
                        ResultadoConsulta=ConsultaUnidades(IdUnidad);
                        break;
                    case "CFA":  //CALENDARIO DE FACTURACION
                        let IdCalendario = context.id;
                        ResultadoConsulta=ConsultaCalendarioFacturacion(IdCalendario);
                        break;
                    case "TIM":  //TIPO DE IMPUESTO
                        let Pais = context.pais;                        
                        //let IdTipoImpuesto = context.idimpuesto
                        //                     ? String(context.idimpuesto).trim()
                        //                     : '';
                                   
                        ResultadoConsulta=ConsultaTipoImpuesto2(Pais);
                        break;
                    
                    case "PARITEM":  //PARAMETRIZACION POR ITEM                                           
                        let IdItem = context.iditem;
                        let IdParametro =context.idparametro;           
                        ResultadoConsulta=ConsultaParametrizacion(IdItem,IdParametro);
                        break;

                    case "VCD":  //VENDEDOR DE CANAL DE DISTRIBUCION                                
                        let IdCategoria = context.idcategoria;          
                        ResultadoConsulta=ConsultaVendedorCanal(IdCategoria);
                        break;

                   case "NPI":  //NIVEL PRECIO POR ITEM                               
                        let IdInternoItem = context.iditem;          
                        ResultadoConsulta=ConsultaNivelPrecioItem(IdInternoItem);
                        break;

                    
                    default: 
                        return 'id:400, opcion no valida';
                }

                return ResultadoConsulta;
            }catch (error) {
                log.error('error', error);
              return 'id:400, No se encontraron resultados.';
            }    
        }

   function ConsultaTipoImpuesto2(Pais) {
         
            let Resultado = []; 
                 
            var salestaxitemSearchObj = search.create({
            type: "salestaxitem",
            filters:
            [
               ["subsidiary","anyof", GlobalSubsidiaria], 
               "AND", 
               ["isinactive","is","F"],
               "AND", 
               ["country","is",Pais]
            ],
            columns:
            [
                search.createColumn({name: "name", label: "Nombre"}),
                search.createColumn({name: "itemid", label: "itemid"}), 
                search.createColumn({name: "rate", label: "Tarifa"}),
                search.createColumn({name: "internalid", label: "ID"}),
                search.createColumn({name: "taxtype", label: "Tipo de impuesto"}),
		        search.createColumn({name: "country", label: "País"}),
                search.createColumn({name: "availableon", label: "Disponible en"})
            ]
            });
            
            let BusquedaNumReg = salestaxitemSearchObj.runPaged().count;
            const ResConsulta = salestaxitemSearchObj.run().getRange({ start: 0, end: BusquedaNumReg });
             
            for (let i in ResConsulta) {
                     let country =  ResConsulta[i].getValue({name: 'country'});
                     let id = ResConsulta[i].getValue({name: 'internalid'});
                     let rate = ResConsulta[i].getValue({name: 'rate'});                     
                     
                     let itemid = ResConsulta[i].getValue({name: 'itemid'});
                     let taxtype = ResConsulta[i].getValue({name: 'taxtype'});
                     let name = ResConsulta[i].getValue({name: 'name'});
                     let disponible =  ResConsulta[i].getValue({name: 'availableon'});

 
                  
 
                    Resultado.push({    
                         country: country,
                         id: id,
                         rate: rate ? rate : 0,
                         itemid: itemid, 
                         taxtype: taxtype,
                         name: name, 
                         disponible: disponible,
                    });
            }               
    
          
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({    
                    country : '',
                    id : '',
                    rate : '',
                    itemid : '',                    
                    taxtype : '',
                    name : '',
                    disponible : ''
                });
            }

          
            return Resultado;
       
    }
   function ConsultaNivelPrecioItem(IdInternoItem){
        try{
            let Resultado = []; 
            let condicion ="";           

          	condicion = " AND i.id = '" + IdInternoItem.trim() + "'";
                  
      
            let sql = query.runSuiteQL({
                query: `SELECT distinct
						  i.id                       
   						, i.itemid
   						, pl.id 		 AS idnivelprecio
  						, pl.name        AS descripcion
    					, NVL((SELECT	 ip.price        
							from	itemPrice ip 
							where	ip.pricelevel= pl.id
							and		ip.item = i.id 
							and		ip.isinactive = 'F'),0) precio 
                        , subsidiary 
					FROM pricing p
						, pricelevel pl
						, item i
						,customrecord_ht_pp_main_param_prod rel
						,CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param
						,CUSTOMRECORD_HT_CR_PP_VALORES val   
					WHERE 1=1
					and 	pl.id = p.pricelevel
					and 	p.unitprice IS NOT NULL
					and 	pl.isinactive='F'
					and 	i.id = rel.custrecord_ht_pp_parametrizacionid
					and 	rel.custrecord_ht_pp_parametrizacion_rela = param.id 
					and 	rel.custrecord_ht_pp_parametrizacion_valor = val.id
					and 	PARAM.custrecord_ht_pp_code 	 =  'FAM'
					and 	i.isinactive='F'
                      ${condicion}`
            }); 

            
            let res = sql.asMappedResults();
            log.debug("res ", res);
            
            res = res.filter(item => {
 
                if (item.subsidiary != GlobalSubsidiaria) {
                  return false;
                }
                return true;
            });
           
            let resfiltrada = res;            
          
            //Resultado = resfiltrada;
            Resultado = resfiltrada.map(item => { delete item.subsidiary; return item; });
                                 
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    id : '', 
                    itemid : '',
                    idnivelprecio : '',
                    descripcion : '',
                    precio : ''
                });
            }
           
            return Resultado; 
          
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaNivelPrecioItem)';
        }
    }

   function ConsultaVendedorCanal(Categoria){
        try{
            let Resultado = []; 
            let condicion ="";           

            if (Categoria !== ""){
            	condicion = " AND category = '" + Categoria.trim() + "'";
            }          
      
            let sql = query.runSuiteQL({
                query: `select   id, vatregnumber identificacion, fullname nombre
                       from vendor
                       where 1=1
                       and isinactive='F'                       
                      ${condicion}`
            }); 
           
             
            let res = sql.asMappedResults();
           
            Resultado = res;
          
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    id : '', 
                    identificacion : '',
                    nombre : ''              
                });
            }
           
            return Resultado; 
          
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaVendedorCanal)';
        }
    }

   function ConsultaParametrizacion(Item,Parametro){
        try{
            let Resultado = []; 
            let condicion ="";
 
            condicion = " and i.id = '" + Item.trim() + "'";

            if (Parametro !== ""){
            	condicion = condicion + " and param.custrecord_ht_pp_code =  '" + Parametro + "' ";
            }
          
      
            let sql = query.runSuiteQL({
                query: `select  i.id , 
                                nvl(i.displayname,'') descripcion,
                                nvl(param.custrecord_ht_pp_code,'') parametro,
                                nvl(VAL.custrecord_ht_pp_codigo,'') valor,
                                custitem_ht_it_servicios servicio
                        from    item i, 
                                customrecord_ht_pp_main_param_prod rel, 
                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                CUSTOMRECORD_HT_CR_PP_VALORES val
                        WHERE   i.id = rel.custrecord_ht_pp_parametrizacionid 
                        and     rel.custrecord_ht_pp_parametrizacion_rela = param.id
                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                        ${condicion}`
            }); 
           

            let res = sql.asMappedResults();
           
            Resultado = res;
          
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    id : '',
                    Descripcion : '',
                    CodigoParametro : '',
                    Valor : '', 
                    servicio : ''                    
                });
            }
           
            return Resultado; 
          
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaParametrizacion)';
        }
    }
   
   function ConsultaTipoImpuesto(Pais,IdTipoImpuesto) {
        try{
            let Resultado = []; 
            let condicion ="";
 
            condicion = " and tt.country = '" + Pais.trim() + 
            "' and sti.custrecord_ts_ec_tipo_impuesto = '" + IdTipoImpuesto + "'";
          
      
            let sql = query.runSuiteQL({
                query: `select country,  sti.id, rate, itemid, sti.description, taxtype, tt.name
                       from  salestaxitem sti
	                      ,taxtype tt
                       where 1=1 
                       and sti.isinactive = 'F'
                       AND tt.ID=sti.taxtype 
                        ${condicion}`
            }); 
           

            let res = sql.asMappedResults();
           
            Resultado = res;
          
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    country : '',                   
                    id : '',
                    rate : '',
                    itemid : '',
                    description : '',
                    taxtype : '',
                    name : ''                    
                });
            }

          
            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoImpuesto)';
        }
    }

    function ConsultaCalendarioFacturacion(IdCalendario) {
        try{
            let Resultado = []; 
            let condicion ="";
            if (IdCalendario !== ""){
            	condicion =  " and id =  '" + IdCalendario + "' ";
            }
         
            let sql = query.runSuiteQL({
                query: `SELECT id, name, numberremaining          
                        FROM billingschedule WHERE isinactive = 'F'                        
                        ${condicion}`
            }); 

            //log.debug("C query: ", query);
           
            let res = sql.asMappedResults();
           
            Resultado = res;


            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    internalid : '',
                    name : '', 
                    numberremaining : ''
                });
            }
 

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCalendarioFacturacion)';
        }
    }
    function ConsultaUnidades(IdUnidad) {
        try{
            let Resultado = []; 
            let condicion ="";
            if (IdUnidad !== ""){
            	condicion = " and internalid =  '" + IdUnidad.trim() + "'";
            }
         
             let sql = query.runSuiteQL({
                query: `SELECT internalid, abbreviation,unitstype ,conversionrate               
                        FROM unitsTypeUom  
                        WHERE 1=1
                        ${condicion}`
            }); 
           
            //log.debug("C query: ", query);
            let res = sql.asMappedResults();
           
            Resultado = res;


            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    internalid : '',
                    abbreviation : '',
                    unitstype : '',
                    conversionrate : ''
                });
            }
 

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaUnidades)';
        }
    }

   
    function EstadoPeriodoContable(Parametro) {
        try{
            let Resultado = [];
            let dateObj = new Date(Parametro);
            //log.debug("C Parametro: ", dateObj);

            //let dateSql = dateObj.toISOString().split('T')[0];

            let year = dateObj.getFullYear();
            let month = String(dateObj.getMonth() + 1).padStart(2, '0');
            let day = String(dateObj.getDate()).padStart(2, '0');
          
            let dateSql = `${year}-${month}-${day}`;
            
            let sql = `SELECT id, periodname, closedondate, startdate, enddate,
                closed, alllocked, arlocked, aplocked
                FROM accountingperiod
                WHERE isinactive='F' 
                AND  ISYEAR ='F'
                AND ISQUARTER ='F' 
                AND startdate <= TO_DATE(?, 'YYYY-MM-DD')
                AND enddate >= TO_DATE(?, 'YYYY-MM-DD')
            `;

             
            let result = query.runSuiteQL({
                query: sql,
                params: [dateSql, dateSql]
            }).asMappedResults();

            Resultado = result;


            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    existe : false,
                    estado : '',
                    id : '',
                    periodname : '',
                    closedondate : '',
                    startdate : '',     
                    enddate : '',
                    closed : '',   
                    closedondate : '',
                    alllocked : '',     
                    arlocked : '',
                    aplocked : ''
                });
            }
 

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (EstadoPeriodoContable)';
        }
    }
   
     function ConsultaSimCard(Parametro){
        try{
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
            "custrecord_ht_ds_operadora",            
            "custrecord_ht_ds_apn",
            "custrecord_ht_ds_numerocelsim",
            "custrecord_ht_ds_estado",
            "custrecord_ht_ds_fechacorte",
            "custrecord_ht_ds_icc",
            "custrecord_ht_ds_estado_conciliacion",
            "custrecord_ht_ds_token",
            "name",
            "internalid" 

          ]
          });

          const searchResult = searchObj.run().getRange({ start: 0, end: 1 });

          if (searchResult.length > 0) {
            const result = searchResult[0];
            Resultado.push({
                 	simcard: result.getText("custrecord_ht_ds_simcard"),
					serie: result.getValue("custrecord_ht_ds_serie"),
					Idtiposimcard: result.getValue("custrecord_ht_ds_tiposimcard"),
                    tiposimcard: result.getText("custrecord_ht_ds_tiposimcard"),
					Idoperadora: result.getValue("custrecord_ht_ds_operadora"),
                    operadora: result.getText("custrecord_ht_ds_operadora"),					 
					apn: result.getValue("custrecord_ht_ds_apn"),
					numerocelsim: result.getValue("custrecord_ht_ds_numerocelsim"),
					Idestado: result.getValue("custrecord_ht_ds_estado"),
                    estado: result.getText("custrecord_ht_ds_estado"),
					fechacorte: result.getValue("custrecord_ht_ds_fechacorte"),
					icc: result.getValue("custrecord_ht_ds_icc"),
					Idestado_conciliacion: result.getValue("custrecord_ht_ds_estado_conciliacion"),		
                    estado_conciliacion: result.getText("custrecord_ht_ds_estado_conciliacion"),	
					name: result.getValue("name"),
					internalid: result.getValue("internalid"),
           });
          
         } 

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    simcard : '',
                    serie : '',
                    Idtiposimcard : '',
                    tiposimcard : '',     
                    Idoperadora : '',
                    operadora : '', 		            
                    apn : '',
                    numerocelsim : '',
                    Idestado : '',
                    estado : '',
		            fechacorte : '',
                    icc : '',
                    Idestado_conciliacion : '',
                    estado_conciliacion : '',
		            name : '',
                    internalid : ''
                });
            }

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaSimCard)';
        }
    }
   
    function ConsultaDispositivoChaser(Parametro){
        try{
            let Resultado = [];
            let condicion ="";
            if (Parametro !== ""){
            	condicion = " and CHA.name =  '" + Parametro + "' ";
            }
 
            log.debug("condicion: ", condicion);

            let RespuestaQuery = query.runSuiteQL({
                query: `SELECT name serie
	, custrecord_ht_dd_tipodispositivo id_marca	
	,custrecord_ht_dd_modelodispositivo id_modelo
	,nvl((SELECT name
		FROM CUSTOMRECORD_HT_DD_MODELODISPOSITIVO E
		WHERE 1=1
		AND E.ID=CHA.custrecord_ht_dd_modelodispositivo
		),'') modelo
	,custrecord_ht_dd_firmware id_firmware
	,nvl((SELECT name
		FROM CUSTOMRECORD_HT_MC_FIRMWARE E
		WHERE 1=1
		AND E.ID = CHA.custrecord_ht_dd_firmware ),'') firmware
	,custrecord_ht_dd_script id_script
	,nvl((SELECT name
		FROM CUSTOMRECORD_HT_MC_SCRIPT E
		WHERE 1=1
		AND E.ID = CHA.custrecord_ht_dd_script ),'') script
	,custrecord_ht_dd_servidor id_servidor 
	,nvl((SELECT name
		FROM CUSTOMRECORD_HT_MC_SERVIDOR E
		WHERE 1=1
		AND E.ID = CHA.custrecord_ht_dd_servidor ),'') servidor
	,custrecord_ht_dd_vid vid
	,custrecord_ht_dd_imei imei
	,custrecord_ht_dd_estado id_estado
	,nvl((SELECT name
		FROM customlist_ht_mc_estado E
		WHERE 1=1
		AND E.ID = CHA.custrecord_ht_dd_estado),'') estado
	,id internal_id
FROM customrecord_ht_record_detallechaserdisp CHA
WHERE 1=1
                        ${condicion} `
            });
            let res = RespuestaQuery.asMappedResults();
            let resfiltrada = res;
          
            Resultado = resfiltrada;

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    serie : '',
                    id_marca : '',               
                    id_modelo : '',
 		            modelo : '',
                    id_firmware : '',
                    firmware : '',
                    id_script : '',
		            script : '',
                    id_servidor : '',
                    servidor : '',
		            vid : '',
                    imei : '',
                    id_estado : '',
                    estado : '',
                    internal_id : ''
                });
            }

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaDispositivoChaser)';
        }
    }
   
    function ConsultaMarca(IdMarca, PaginaId){
        try{
            let Resultado = [];
          
            let Busqueda = search.create({
                type: "customrecord_ht_bien_marca",
                filters:[
                    ["isinactive","anyof","F"], "AND",
                    ["custrecord_ht_marca_sub","anyof",GlobalSubsidiaria]
                ],
                columns:
                [
                    search.createColumn({
                        name: "custrecord_ht_marca_descripcion",
                        sort: search.Sort.ASC,
                        label: "name"
                    }),
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ht_marca_codigo", label: "Codigo"}),
                ]
            });


            if (IdMarca != 0 && IdMarca != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdMarca
                    })); 
            }
          
            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
            let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } /*else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }*/


            if (ResConsulta.count != 0 && PaginaId < conteoPagina){
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result) {
                    Resultado.push({
                        IdMarca: result.getValue("internalid"),
                        Codigo: result.getValue("custrecord_ht_marca_codigo"),
                        Descripcion: result.getValue("custrecord_ht_marca_descripcion"),
                        Paginas: conteoPagina
                    });
                });
            }

            if (ResConsulta.count == 0 && OrigenConsulta == "SQL" || PaginaId >= conteoPagina){
                  Resultado.push({
                    IdMarca: "",
                    Codigo: "",
                    Descripcion: " ",
                    Paginas: 0
                });
            }

/*          
            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);
        
            for (let i in ResConsulta)  {
                var IdMarca= ResConsulta[i].getValue({name: 'internalid'});
                var Codigo = ResConsulta[i].getValue({name: 'custrecord_ht_marca_codigo'});
                var Descripcion= ResConsulta[i].getValue({name: 'custrecord_ht_marca_descripcion'});
    
                Resultado.push({
                    Id: IdMarca,
                    Codigo: Codigo,
                    Descripcion: Descripcion
                });
            } */

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaMarca)';
        }
    }

    function ConsultaModelo(Id_Marca, Id_Modelo, PaginaId){
        try{
            let conteoPagina = '';
            let Resultado = [];
            let Busqueda = search.create({
                type: 'customrecord_ht_bn_modelo',
                filters:[
                    ["isinactive","anyof","F"], 
                ],
                columns:
                [
                    search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_MB_MARCA", label: "Id Marca", sort: search.Sort.ASC }),
                    search.createColumn({name: "custrecord_ht_mb_marca", label: "Codigo marca"}),
                    search.createColumn({name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_MB_MARCA", label: "Descripcion"}),
                    search.createColumn({name: "internalid", label: "Id Modelo"}),
                    search.createColumn({name: "custrecord_ht_mod_codigo", label: "CodigoModelo"}),
                    search.createColumn({name: "custrecord_ht_mod_descripcion", label: "Modelo"})   
                ]
            });

            if (Id_Marca != 0 && Id_Marca != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    join: 'CUSTRECORD_HT_MB_MARCA',
                    operator: search.Operator.IS,
                    values: Id_Marca
                    })); 
            }

            
            if (Id_Modelo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: Id_Modelo
                }));
            } 

            //let BusquedaNumReg = Busqueda.runPaged().count;
            //let ResConsulta = Busqueda.run().getRange(0, 500); 
            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            if (ResConsulta.count != 0) 
            {
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});
                //let result = new Array();
    
                BusquedaResultado.data.forEach(function (result) {
                    let IdMarca = result.getValue({name: 'internalid', join: "CUSTRECORD_HT_MB_MARCA"});
                    let CodigoMarca = result.getValue({name: 'custrecord_ht_mb_marca', join: 'CUSTRECORD_HT_MB_MARCA'});
                    let Marca = result.getValue({name: 'custrecord_ht_marca_descripcion', join: 'CUSTRECORD_HT_MB_MARCA'});
                    let IdModelo = result.getValue({name: 'internalid'});
                    let CodigoModelo = result.getValue({name: 'custrecord_ht_mod_codigo'});
                    let Modelo = result.getValue({name: 'custrecord_ht_mod_descripcion'});  
    
                    Resultado.push({
                        IdMarca: IdMarca,
                        CodigoMarca: CodigoMarca,
                        Marca: Marca,
                        Id: IdModelo,
                        Codigo: CodigoModelo,
                        Descripcion: Modelo,
                        Paginas: conteoPagina
                    }); 
                });
            }

            return Resultado;

        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaModelo)';
        }
    }

    function ConsultaGeneralCatalogo(Id, Entidad, ColDescripcion, ColId, ColSubsidiaria) {
        try{
            let Resultado = [];
            let filtros = ["isinactive","is","F"];
                       
            if (ColId == ''){
               ColId = 'internalid';
            }

            let Columnas = [
                    search.createColumn({name: ColId, sort: search.Sort.ASC, label: "internalid"}),
                    search.createColumn({name: ColDescripcion, label: "Descripcion"}),
                    search.createColumn({name: "isinactive", label: "Estado"})
            ];

            if (Entidad === "customrecord_ht_servicios") {
                Columnas.push(
                    search.createColumn({ name: "custrecord_ht_sv_sub", label: "Subsidiaria" })
                );
            }
          
            let Busqueda = search.create({
                type: Entidad, //"customrecord_ht_registro_tipo_direccion",
                filters: filtros,
                columns: Columnas
            });

            if (Id != '' && Id != '0') {
                Busqueda.filters.push(search.createFilter({
                    name: ColId, //'internalid', 
                    operator: search.Operator.ANYOF,
                    values: Id
                    }));
            }

           //if (Entidad === "customrecord_ht_servicios") {
          if ((Entidad == "Location") || (Entidad == "classification" ) || (Entidad == "customrecord_ht_servicios" )) {
                Busqueda.filters.push(search.createFilter({
                    name: ColSubsidiaria,
                    operator: search.Operator.ANYOF,
                    values: GlobalSubsidiaria
                    }));
            }

        /*if (Id && Id !== '' && Id !== '0') {
            Busqueda.filters.push(["internalid", search.Operator.ANYOF, Id]);
        }*/
          
            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Id = ResConsulta[i].getValue({name: 'internalid'});
                let Descripcion = ResConsulta[i].getValue({name: ColDescripcion});
                let Estado = ResConsulta[i].getValue({name: 'isinactive'});
    
                if (Estado == 'F'){
                    Estado= 'VIG';
                }else{
                    Estado= 'INA';
                }

                Resultado.push({
                    Id: Id,
                    Descripcion: Descripcion,
                    Estado: Estado
                });
            }
            return Resultado;

        }catch (error) {
                    log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaGeneralCatalogo)';
            }
    }

    function ConsultaItemComercial(Item, NivelPrecio) {
        try{

            if ((Item == 0) || (Item =='')) {
                return 'id:400, Ingrese idproducto.';
            }
            if ((NivelPrecio == 0) || (NivelPrecio =='')) {
                return 'id:400, Ingrese nivelprecio.';
            }

            let busTabla = search.create({
                type: 'item',
                filters: [["internalid","is",Item], "AND",["subsidiary","anyof",GlobalSubsidiaria]],
                columns: [
                  search.createColumn({name: "name", label: "Descripcion"}),
                ]
            });
            let TablaResult = busTabla.run().getRange(0, 1000);
            let Entidad = TablaResult[0].recordType;
          
            let ObjResultado = new Array();
            let ObjItem = record.load({ type: Entidad, id: Item, isDynamic: true }); //abre tabla

            let ProductoId= ObjItem.getValue({fieldId: 'id'});
            let ProductoCodigo = ObjItem.getValue({fieldId: 'itemid'});
            let ProductoDescripcion = ObjItem.getValue({fieldId: 'displayname'});
            let Unidad = ObjItem.getText({fieldId: 'consumptionunit'});
            let IdTipoImpuesto = ObjItem.getValue({fieldId: 'taxschedule'}); //iva

            let objIva = [];
            let ImpuestoCompra = '';
            let ImpuestoVenta = '';
            let IvaCompra = 0;
            let IvaVenta = 0;

            let ObjImpuesto = record.load({type: 'taxschedule', id: IdTipoImpuesto, isDynamic: true});
            let TipoImpuesto = ObjImpuesto.getValue({fieldId: 'description'});
            let objDetImpuesto = ObjImpuesto.getLineCount({sublistId: "nexuses"});

            if (objDetImpuesto > 0){
                for (let i = 0; i < objDetImpuesto; i++) {
                    if (ObjImpuesto.getSublistValue({sublistId: 'nexuses', fieldId: 'nexuscountry', line: i}) == PaisConsulta){
                        let idIvaCompra = ObjImpuesto.getSublistValue({sublistId: 'nexuses', fieldId: 'purchasetaxcode', line: i});
                        let idIvaVenta = ObjImpuesto.getSublistValue({sublistId: 'nexuses', fieldId: 'salestaxcode', line: i});
    
                        objIva = record.load({type: 'salestaxitem', id: idIvaCompra, isDynamic: true });
                        ImpuestoCompra = objIva.getValue({fieldId: 'itemid'});
                        IvaCompra = objIva.getValue({fieldId: 'rate'});
    
                        objIva = record.load({type: 'salestaxitem', id: idIvaVenta, isDynamic: true });
                        ImpuestoVenta = objIva.getValue({fieldId: 'itemid'});
                        IvaVenta = objIva.getValue({fieldId: 'rate'});                        
                    }
                }
            }

            let objPrecio = ObjItem.getLineCount({sublistId: "price1"});
          
            let PrecioItem = 0;
            if (objPrecio > 0) {
                for (let i = 0; i < objDetImpuesto; i++) {
                    if (ObjItem.getSublistValue({sublistId: 'price1', fieldId:'pricelevelname', line: i}) == NivelPrecio){
                        PrecioItem= ObjItem.getSublistValue({sublistId: 'price1', fieldId: 'price_1_', line:i});
                    }
                }
            }

            let IdParametro = 0;
            let IdValor = 0;
            let CodTipoTransaccion = '';
            let TipoTransaccion = '';
            let IdGrupoProducto = '';
            let GrupoProducto = '';
            let Valor = [];

            let objParametro = ObjItem.getLineCount({sublistId: "recmachcustrecord_ht_pp_parametrizacionid"});
          
            if (objParametro>0){
                for (let i = 0; i < objParametro; i++) {
                    IdParametro = ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_rela', line: i});
                    IdValor = ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_valor', line: i});

                    let Parametro = record.load({type: 'customrecord_ht_cr_parametrizacion_produ', id: IdParametro, isDynamic: true});

                    if (Parametro.getValue({fieldId: 'custrecord_ht_pp_code'}) == 'TTR' || Parametro.getValue({fieldId: 'custrecord_ht_pp_code'}) == 'FAM') {
                        Valor = record.load({type: 'customrecord_ht_cr_pp_valores', id: IdValor, isDynamic: true});

                        if (Parametro.getValue({fieldId: 'custrecord_ht_pp_code'}) == 'TTR') {
                            CodTipoTransaccion = Valor.getValue({fieldId: 'custrecord_ht_pp_codigo'});
                            TipoTransaccion = Valor.getValue({fieldId: 'custrecord_ht_pp_descripcion'});
                        }


                        if (Parametro.getValue({fieldId: 'custrecord_ht_pp_code'}) == 'FAM') {
                            IdGrupoProducto = Valor.getValue({fieldId: 'custrecord_ht_pp_codigo'});
                            GrupoProducto = Valor.getValue({fieldId: 'custrecord_ht_pp_descripcion'});
                        }

                    }

                }
                
            }

           
            ObjResultado.push({
                ProductoId: ProductoId,
                ProductoCodigo: ProductoCodigo,
                ProductoDescripcion: ProductoDescripcion,
                IdTipoImpuesto: IdTipoImpuesto,
                TipoImpuesto: TipoImpuesto,
                ImpuestoCompra: ImpuestoCompra,
                ImpuestoVenta: ImpuestoVenta,
                TasaIvaCompra: IvaCompra,
                TasaIvaVenta: IvaVenta,
                PrecioItem: PrecioItem,
                CodTipoTransaccion: CodTipoTransaccion,
                TipoTransaccion: TipoTransaccion,
                IdGrupoProducto: IdGrupoProducto,
                GrupoProducto: GrupoProducto,
                Unidad: Unidad
            }); 
        

            return ObjResultado;
        }catch (error) {
                    log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaItemComercial)';
        }
    }
   
    function ObtieneItemParametro(Item, Param){
        try{
            if (Item == 0 || Item =='') {
                return 'id:400, Ingrese idproducto.';
            }
            if (Param == 0 || Param =='') {
                return 'id:400, Ingrese parametro.';
            }

            let busTabla = search.create({
                type: 'item',
                filters: [["internalid","is",Item], "AND",["subsidiary","anyof",GlobalSubsidiaria]],
                columns: [
                  search.createColumn({name: "name", label: "Descripcion"}),
                ]
            });
            let TablaResult = busTabla.run().getRange(0, 1000);
            let Entidad = TablaResult[0].recordType;
          
            let ObjResultado = new Array();
            let ObjItem = record.load({ type: Entidad, id: Item, isDynamic: true }); //abre tabla
          
            let ProductoId= ObjItem.getValue({fieldId: 'id'});
            let ProductoCodigo = ObjItem.getValue({fieldId: 'itemid'});
            let ProductoDescripcion = ObjItem.getValue({fieldId: 'displayname'});

            let IdParametro = 0;
            let CodParametro = '';
            let IdValor = 0;
            let CodValor = '';
            let ValorDescripcion = '';
            let Parametro = [];
            let Valor = [];

            let objParametro = ObjItem.getLineCount({sublistId: "recmachcustrecord_ht_pp_parametrizacionid"});
            if (objParametro>0){
                for (let i = 0; i < objParametro; i++) {
                    IdParametro = ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_rela', line: i});
                    IdValor = ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_valor', line: i});

                    Parametro = record.load({type: 'customrecord_ht_cr_parametrizacion_produ', id: IdParametro, isDynamic: true});
                    CodParametro = Parametro.getValue({fieldId: 'custrecord_ht_pp_code'});

                    Valor = record.load({type: 'customrecord_ht_cr_pp_valores', id: IdValor, isDynamic: true});
                    IdValor = Valor.getValue({fieldId: 'id'});
                    CodValor = Valor.getValue({fieldId: 'custrecord_ht_pp_codigo'});
                    ValorDescripcion = Valor.getValue({fieldId: 'custrecord_ht_pp_descripcion'});

                    if (Param != ''){
                        if (Param == CodParametro){
                            ObjResultado.push({
                                ProductoId: ProductoId,
                                ProductoCodigo: ProductoCodigo,
                                ProductoDescripcion: ProductoDescripcion,
                                IdParametro: IdParametro,
                                CodParametro: CodParametro,
                                IdValor: IdValor,
                                CodValor: CodValor,
                                ValorDescripcion: ValorDescripcion
                                //PrecioItem: PrecioItem
                            });
                        }
                    }
                    else {
                        ObjResultado.push({
                            ProductoId: ProductoId,
                            ProductoCodigo: ProductoCodigo,
                            ProductoDescripcion: ProductoDescripcion,
                            IdParametro: IdParametro,
                            CodParametro: CodParametro,
                            IdValor: IdValor,
                            CodValor: CodValor,
                            ValorDescripcion: ValorDescripcion,
                            PrecioItem: PrecioItem
                        });
                    }
                }

            }

            return ObjResultado;

        }catch (error) {
                    log.error('error', error);
                      return 'id:400, No se encontraron registros. Error Controlado. (ObtieneItemParametro)';
            }
    }

    function ConsultaItemComercialSql(TransaccionDescrip, Item, GrupoProd, IdItemNs){
        try{
            let Resultado = [];
            let condicion = '';
            let ArrItem = [];
            let valoresFiltrar = '';

            if (Item !== "" && Item !== 0){
             Item = Item.replace(/\-/g, ',');
              
              ArrItem = Item.split(',').map(item => item.trim()); //convierte en arreglo los items que vienen
              valoresFiltrar = ArrItem.map(valor => `'${valor}'`).join(','); // convierte en una cadena de items 'item1','item2' para poder filtrar
              condicion = ' AND i.itemid in (' + valoresFiltrar + ')'; //arma la condicion
            }

          let cadenaTransformada = '';
          
          if (IdItemNs !== "" && IdItemNs !== 0){
              cadenaTransformada = IdItemNs.replace(/\-/g, ',');
              cadenaTransformada = cadenaTransformada.trim().replace(/,\s*$/, "")
              condicion = ' AND i.id in (' + cadenaTransformada + ')';
          }
  
            let TipoCanalQuery = query.runSuiteQL({
              query: ` SELECT  DISTINCT i.id IdNs, nvl(i.saleunit,0) saleunit, i.itemid CODIGO, i.displayname as Descripcion, 
							NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
									FROM	customrecord_ht_pp_main_param_prod rel, 
											CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
											CUSTOMRECORD_HT_CR_PP_VALORES val
									where	i.id = rel.custrecord_ht_pp_parametrizacionid 
									and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                    and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
									and		rel.isinactive = 'F' 
									and		param.isinactive = 'F'
									and		param.custrecord_ht_pp_code = 'TTR'),'') transaccion,
							NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
									FROM	customrecord_ht_pp_main_param_prod rel, 
											CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param, 
											CUSTOMRECORD_HT_CR_PP_VALORES val
									where	i.id = rel.custrecord_ht_pp_parametrizacionid 
									and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                    and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
									and		rel.isinactive = 'F' 
									and		param.isinactive = 'F'
									and		param.custrecord_ht_pp_code = 'FAM'),'') producto, 
							NVL((	SELECT	top 1 ip.price 
									from	itemPrice ip 
									where	ip.pricelevelname = 'PVP' 
									and		ip.item = i.id 
									and		ip.isinactive = 'F'),0) precio, 
							NVL(i.itemtype, '') itemtype,
							NVL(i.subtype,'') subtype,
                            i.subsidiary
					FROM	item i 
					where	i.isinactive = 'F' 
					and		i.itemtype in ('Assembly','Service','InvtPart')
					and		i.id is not null 
					and		i.id <> 0 
					AND		LENGTH(i.itemid)<= 6 
					AND exists( select	top 1 1 
								from	customrecord_ht_pp_main_param_prod r,
										CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU p
								where	r.custrecord_ht_pp_parametrizacionid = i.id 
								and		r.custrecord_ht_pp_parametrizacion_rela = p.id 
								and		p.custrecord_ht_pp_code = 'TTR')
                       ${condicion} `,
            });

            let res = TipoCanalQuery.asMappedResults(); 
            let filtrado = res.filter(r => r.subsidiary == GlobalSubsidiaria); //filtra solo los datos de la empresa
            let resfiltrada = filtrado.map(item => {
              delete item.subsidiary;
              return item;
            });
            

            if (TransaccionDescrip !== ""){
                resfiltrada = resfiltrada.filter(item => item?.transaccion?.includes(TransaccionDescrip));
            }
            if (GrupoProd !== ""){
                resfiltrada = resfiltrada.filter(item => item?.producto?.includes(GrupoProd));
            }
          
            Resultado = resfiltrada;

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    saleunit : '',
                    idns : '',
                    codigo : '',
                    descripcion : '',
                    transaccion : '',
                    producto : '',
                    precio : '',
                    itemtype : '',
                    subtype : ''
                });
            }

            return Resultado;
            
        } catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaItemComercialSql)';
        }  
    }

  function ConsultaItemPorFamiliaProducto(GrupoProd, IdItemNs){
        try{
            let Resultado = [];
            let condicion = '';
            let ArrItem = [];
            let valoresFiltrar = '';

            if (IdItemNs !== "" && IdItemNs !== 0){
              IdItemNs = IdItemNs.replace(/\|/g, ',');
              
              ArrItem = IdItemNs.split(',').map(item => item.trim()); //convierte en arreglo los items que vienen
              valoresFiltrar = ArrItem.map(valor => `${valor}`).join(','); // convierte en una cadena de items 'item1','item2' para poder filtrar
              condicion = ' AND i.id in (' + valoresFiltrar + ')'; //arma la condicion               
            }

            if (GrupoProd !== ""){
                condicion = condicion + " and 	val.custrecord_ht_pp_codigo = '" + GrupoProd + "' ";
            }

           /* let TipoCanalQuery = query.runSuiteQL({
                query: `SELECT 	distinct i.id IdNs, 
                                (
                                   SELECT UND.pluralabbreviation FROM unitsTypeUom UND WHERE UND.INTERNALID = i.saleunit
                                ) saleunit, i.itemid CODIGO, i.displayname as Descripcion, 
                                val.custrecord_ht_pp_codigo FamiliaProd, val.custrecord_ht_pp_descripcion GrupoProdDescripcion,
                                NVL((SELECT top 1 concat(concat(nvl(val2.custrecord_ht_pp_codigo,''), ' | '), nvl(val2.custrecord_ht_pp_descripcion,'')) codigo FROM customrecord_ht_pp_main_param_prod rel2, CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param2, MAP_customrecord_ht_pp_main_param_prod_custrecord_ht_pp_parametrizacion_valor mp2, CUSTOMRECORD_HT_CR_PP_VALORES val2 where i.id = rel2.custrecord_ht_pp_parametrizacionid and rel2.custrecord_ht_pp_parametrizacion_rela = param2.id and rel2.id = mp2.mapone and mp2.maptwo = val2.id and rel2.isinactive = 'F' and param2.isinactive = 'F'and param2.custrecord_ht_pp_code = 'ADP'),'') ADP
                        FROM 	item i,
                                customrecord_ht_pp_main_param_prod rel, 
                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param, 
                                MAP_customrecord_ht_pp_main_param_prod_custrecord_ht_pp_parametrizacion_valor mp, 
                                CUSTOMRECORD_HT_CR_PP_VALORES val
                        where 	i.id = rel.custrecord_ht_pp_parametrizacionid 
                        and 	rel.custrecord_ht_pp_parametrizacion_rela = param.id 
                        and 	rel.id = mp.mapone 
                        and 	mp.maptwo = val.id 
                        and 	rel.isinactive = 'F' 
                        and 	param.isinactive = 'F'
                        and 	param.custrecord_ht_pp_code = 'FAM'
                            ${condicion} `,
            }); */

            let TipoCanalQuery = query.runSuiteQL({
                query: `SELECT 	distinct i.id IdNs, 
                                (
                                            SELECT UND.abbreviation FROM unitsTypeUom UND WHERE UND.INTERNALID = i.saleunit
                                ) saleunit, i.itemid CODIGO, i.displayname as Descripcion, 
                                nvl(val.custrecord_ht_pp_codigo,'.') FamiliaProd, nvl(val.custrecord_ht_pp_descripcion,'.') GrupoProdDescripcion,
                                NVL((	SELECT 	top 1 concat(concat(nvl(val2.custrecord_ht_pp_codigo,''), ' | '), nvl(val2.custrecord_ht_pp_descripcion,''))
                                        FROM 	customrecord_ht_pp_main_param_prod rel2, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param2, 
                                                CUSTOMRECORD_HT_CR_PP_VALORES val2 
                                        where 	i.id = rel2.custrecord_ht_pp_parametrizacionid 
                                        and 	rel2.custrecord_ht_pp_parametrizacion_rela = param2.id
                                        and 	rel2.custrecord_ht_pp_parametrizacion_valor = val2.id
                                        and 	rel2.isinactive = 'F' 
                                        and 	param2.isinactive = 'F'
                                        and 	param2.custrecord_ht_pp_code = 'ADP'),'NO CONFIGURADO') ADP
                                        , i.subsidiary
                                       
                                        ,NVL((	SELECT	top 1 ip.price 
									from	itemPrice ip 
									where	ip.pricelevelname = 'PVP' 
									and		ip.item = i.id 
									and		ip.isinactive = 'F'),0) precio 
                                    , i.saleunit idsaleunit
                                    ,NVL(i.consumptionunit,0) programafiscal
                                    , NVL((	SELECT 	top 1 concat(concat(nvl(val2.custrecord_ht_pp_codigo,''), ' | '), nvl(val2.custrecord_ht_pp_descripcion,''))
                                        FROM 	customrecord_ht_pp_main_param_prod rel2, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param2, 
                                                CUSTOMRECORD_HT_CR_PP_VALORES val2 
                                        where 	i.id = rel2.custrecord_ht_pp_parametrizacionid 
                                        and 	rel2.custrecord_ht_pp_parametrizacion_rela = param2.id
                                        and 	rel2.custrecord_ht_pp_parametrizacion_valor = val2.id
                                        and 	rel2.isinactive = 'F' 
                                        and 	param2.isinactive = 'F'
                                        and 	param2.custrecord_ht_pp_code = 'GTR'),'N | NO') GTR  
                                    , NVL((	SELECT 	top 1 concat(concat(nvl(val2.custrecord_ht_pp_codigo,''), ' | '), nvl(val2.custrecord_ht_pp_descripcion,''))
                                        FROM 	customrecord_ht_pp_main_param_prod rel2, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param2, 
                                                CUSTOMRECORD_HT_CR_PP_VALORES val2 
                                        where 	i.id = rel2.custrecord_ht_pp_parametrizacionid 
                                        and 	rel2.custrecord_ht_pp_parametrizacion_rela = param2.id
                                        and 	rel2.custrecord_ht_pp_parametrizacion_valor = val2.id
                                        and 	rel2.isinactive = 'F' 
                                        and 	param2.isinactive = 'F'
                                        and 	param2.custrecord_ht_pp_code = 'SCK'),'N | NO') SCK 
                        FROM 	item i,
                                customrecord_ht_pp_main_param_prod rel,
                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                CUSTOMRECORD_HT_CR_PP_VALORES val
                        where	i.isinactive = 'F'
                        and     i.id = rel.custrecord_ht_pp_parametrizacionid
                        and 	rel.custrecord_ht_pp_parametrizacion_rela = param.id 
                        and 	rel.custrecord_ht_pp_parametrizacion_valor = val.id
                        AND	    PARAM.custrecord_ht_pp_code 	 =  'FAM'
                       
                            ${condicion} `,
            }); 

            let res = TipoCanalQuery.asMappedResults();
            
            res = res.filter(item => {
 
                if (item.subsidiary != GlobalSubsidiaria) {
                  return false;
                }
                return true;
            });
            
            let resfiltrada = res;
            
          
            Resultado = resfiltrada;

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    idns : '.',
                    saleunit : '.',                    
                    codigo : '.',
                    descripcion : '.',
                    FamiliaProd : '.',
                    GrupoProdDescripcion : '.',
                    ADP: ''
                });
            }

            return Resultado;
            
        } catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaItemPorFamiliaProducto)';
        }  
    }

    function ConsultaConvenio(Codigo, Descripcion){
        try{
            let Resultado = [];
            let condicion = "";
            if (Codigo !== "" && Codigo !== 0){
                ArrItem = Codigo.split(',');
                valoresFiltrar = ArrItem.map(str => `'${str}'`);
                condicion = ' AND custrecord_ht_cn_codigo in (' + valoresFiltrar.join(',') + ')'; //arma la condicion
            }

           let TipoCanalQuery = query.runSuiteQL({
                query: `select  id IdNs,
                                NVL(TO_CHAR(custrecord_ht_cn_codigo), '') CODIGO,
                                name DESCRIPCION
                        from    CUSTOMRECORD_HT_RECORD_CONVENIO 
                        where   isinactive = 'F'
                        ${condicion} 
                        order by custrecord_ht_cn_codigo`,
            });             

            let res = TipoCanalQuery.asMappedResults();
            let resfiltrada = res;

            if (Descripcion !== ""){
                resfiltrada = resfiltrada.filter(item => item?.transaccion?.includes(Descripcion));
            }

            Resultado = resfiltrada;

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                Resultado.push({
                  IdNs : '',
                  CODIGO : '',
                  DESCRIPCION : ''
              });
            }

            return Resultado;

        } catch (error) {
            log.error('error', error);
            //return JSON.stringify({error: error.message});
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaConvenio)';
        }  
    }
   
    function ObtieneIva(IdImpuesto)
    {
        try{
            if (IdImpuesto == 0 || IdImpuesto == '') {
                return 'id:400, Indique el idiva: 1:Bienes, 2. Servicios';
            }

            let ObjResultado = new Array();
            let ObjProgramaFiscal = record.load({ type: 'taxschedule', id: IdImpuesto, isDynamic: true }); //abre tabla

            let sblCodImpuesto = ObjProgramaFiscal.getLineCount({
                sublistId: "nexuses", //sublista
            });

            if(sblCodImpuesto > 0){  //recorre sublista
                for (let i = 0; i < sblCodImpuesto; i++) {
                    let CodPais = ObjProgramaFiscal.getSublistValue({
                        sublistId: 'nexuses',
                        fieldId: 'nexuscountry',
                        line: i });

                    if (CodPais == PaisConsulta) {

                        let IdCodImpuestoVentas = ObjProgramaFiscal.getSublistValue({
                        sublistId: 'nexuses',
                        fieldId: 'salestaxcode',
                        line: i });

                        let IdCodImpuestoCompras = ObjProgramaFiscal.getSublistValue({
                            sublistId: 'nexuses',
                            fieldId: 'purchasetaxcode',
                            line: i });
                        //log.debug('items..1....', IdCodImpuestoVentas);

                        let TarifaVentas = search.lookupFields({ 
                            type: 'salestaxitem',
                            id: IdCodImpuestoVentas, 
                            columns: ['rate', 'itemid', 'description']
                        });
            
                        let TarifaCompras = search.lookupFields({ 
                            type: 'salestaxitem',
                            id: IdCodImpuestoCompras, 
                            columns: ['rate', 'itemid', 'description']
                        });
                        
                        //return { customerpayment: ObjProgramaFiscal}
                        ObjResultado.push({
                            IdCodidgoImpuestoVentas: IdCodImpuestoVentas,
                            CodidgoImpuestoVentas: TarifaVentas.itemid,
                            DescCodidgoImpuestoVentas: TarifaVentas.description,
                            TarifaCodidgoImpuestoVentas: TarifaVentas.rate,
                            IdCodidgoImpuestoCompras: IdCodImpuestoCompras,
                            CodidgoImpuestoCompras: TarifaCompras.itemid,
                            DescCodidgoImpuestoCompras: TarifaCompras.description,
                            TarifaCodidgoImpuestoCompras: TarifaCompras.rate
                        //,Prueba:  TarifaCompras.description.substring(0,5) 
                        });
                    } /* else{
                        if (OrigenConsulta == "SQL" && ObjResultado.length == 0){
                            ObjResultado.push({
                                IdCodidgoImpuestoVentas: "",
                                CodidgoImpuestoVentas: "",
                                DescCodidgoImpuestoVentas: "",
                                TarifaCodidgoImpuestoVentas: "",
                                IdCodidgoImpuestoCompras: "",
                                CodidgoImpuestoCompras: "",
                                DescCodidgoImpuestoCompras: "",
                                TarifaCodidgoImpuestoCompras: ""
                            });
                        }
                    } */
                }
            }
 
            return ObjResultado;

        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ObtieneIva)';
        }
    }

    function ConsultaProductoAdp(GrupoProducto, Parametro, ValorParametro, NivelPrecio, Item){
        try {
                let Resultado = [];
                let condicion = '';
                let ArrItem = [];
                let valoresFiltrar = '';

                if (GrupoProducto == 0 || GrupoProducto =='') {
                    return 'id:400, Ingrese grupoproducto.';
                }

                if (Parametro == 0 || Parametro =='') {
                    return 'id:400, Ingrese parametro.';
                }

                if (NivelPrecio == ''){
                    NivelPrecio = 'PVP';
                }
    
                condicion = " and     fparam.custrecord_ht_pp_code = '" + Parametro + "'";
                condicion = condicion + " and     val.custrecord_ht_pp_codigo = '" + GrupoProducto + "'";
          
                if (ValorParametro !== 0 || ValorParametro !=='') {
                    condicion = condicion + " and     fval.custrecord_ht_pp_codigo = '" + ValorParametro + "'";
                }

                if (Item !== "" && Item !== 0){
                    ArrItem = Item.split(',').map(item => item.trim()); //convierte en arreglo los items que vienen
                    valoresFiltrar = ArrItem.map(valor => `'${valor}'`).join(','); // convierte en una cadena de items 'item1','item2' para poder filtrar
                    condicion = ' AND i.itemid in (' + valoresFiltrar + ')'; //arma la condicion
                }

                 /* let TipoCanalQuery = query.runSuiteQL({
                    query: `select  VFAM.custrecord_ht_pp_codigo CodGrupoProducto, 
                                    VFAM.custrecord_ht_pp_descripcion DescGrupoProducto, 
                                    i.itemid Iditem, 
                                    i.displayname DescripcionItem, 
                                    ADP.custrecord_ht_pp_parametrizacion_rela IdParametro, 
                                    PADP.custrecord_ht_pp_code Parametro, 
                                    VADP.id idValorParam, 
                                    VADP.custrecord_ht_pp_codigo CodValorParam, 
                                    VADP.custrecord_ht_pp_descripcion DescripcionValorParam, 
                                    NVL((   SELECT  top 1 p.unitprice 
                                        from    pricing p, 
                                                priceLevel pl 
                                        where   p.pricelevel = pl.id 
                                        and     p.item = i.id 
                                        and     pl.name = '${NivelPrecio}'),0) PrecioItem 
                                        ,i.id idNs
                            FROM    item i,
                                    customrecord_ht_pp_main_param_prod FAM, 
                                    CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU PFAM, 
                                    MAP_customrecord_ht_pp_main_param_prod_custrecord_ht_pp_parametrizacion_valor FMP, 
                                    CUSTOMRECORD_HT_CR_PP_VALORES VFAM, 
                                    customrecord_ht_pp_main_param_prod ADP, 
                                    CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU PADP, 
                                    MAP_customrecord_ht_pp_main_param_prod_custrecord_ht_pp_parametrizacion_valor AMP, 
                                    CUSTOMRECORD_HT_CR_PP_VALORES VADP 
                            WHERE   i.id = FAM.custrecord_ht_pp_parametrizacionid 
                            and     FAM.custrecord_ht_pp_parametrizacion_rela = PFAM.id 
                            and     FAM.id = FMP.mapone 
                            and     FMP.maptwo = VFAM.id 
                            and     FAM.isinactive = 'F' 
                            and     PFAM.isinactive = 'F'
                            and     PFAM.custrecord_ht_pp_code = 'FAM' 
                            and     i.id = ADP.custrecord_ht_pp_parametrizacionid 
                            and     ADP.custrecord_ht_pp_parametrizacion_rela = PADP.id 
                            and     ADP.id = AMP.mapone 
                            and     AMP.maptwo = VADP.id 
                            and     ADP.isinactive = 'F' 
                            and     PADP.isinactive = 'F'
                              ${condicion} `,
                }); */

                let TipoCanalQuery = query.runSuiteQL({
                    query: `SELECT 	distinct val.custrecord_ht_pp_codigo CodGrupoProducto, 
                                    val.custrecord_ht_pp_descripcion DescGrupoProducto, 
                                            i.itemid Iditem, 
                                            i.displayname DescripcionItem, 
                                            frel.custrecord_ht_pp_parametrizacion_rela IdParametro, 
                                            fparam.custrecord_ht_pp_code Parametro, 
                                            Fval.id idValorParam, 
                                            Fval.custrecord_ht_pp_codigo CodValorParam, 
                                            Fval.custrecord_ht_pp_descripcion DescripcionValorParam, 
                                            NVL((   	SELECT  	top 1 p.unitprice 
                                            from    	pricing p, 
                                                                    priceLevel pl 
                                            where   	p.pricelevel = pl.id 
                                            and     	p.item = i.id 
                                            and     	pl.name = '${NivelPrecio}'),0) PrecioItem 
                                    ,i.id idNs, i.subsidiary
                            FROM 	item i,
                                    customrecord_ht_pp_main_param_prod rel,
                                    CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                    CUSTOMRECORD_HT_CR_PP_VALORES val,
                                    customrecord_ht_pp_main_param_prod frel,
                                    CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU fparam,
                                    CUSTOMRECORD_HT_CR_PP_VALORES Fval
                            where	i.id = rel.custrecord_ht_pp_parametrizacionid
                            and 	rel.custrecord_ht_pp_parametrizacion_rela = param.id
                            and 	rel.custrecord_ht_pp_parametrizacion_valor = val.id
                            AND	    PARAM.custrecord_ht_pp_code 	 =  'FAM'
                            and 	i.id = frel.custrecord_ht_pp_parametrizacionid
                            and 	frel.custrecord_ht_pp_parametrizacion_rela = fparam.id
                            and 	Frel.custrecord_ht_pp_parametrizacion_valor = Fval.id
                            and     rel.isinactive = 'F' 
                            and     PARAM.isinactive = 'F'
                            ${condicion} `
                    });

                let res = TipoCanalQuery.asMappedResults();
                let filtrado = res.filter(r => r.subsidiary == GlobalSubsidiaria);
                Resultado = filtrado.map(item => { delete item.subsidiary; return item; });
    
                if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                      Resultado.push({
                        CodGrupoProducto: '',
                        DescGrupoProducto: '',
                        Iditem: '',
                        CodItem: '',
                        DescripcionItem: '',
                        IdParametro: '',
                        Parametro: '',
                        idValorParam: '',
                        CodValorParam: '',
                        DescripcionValorParam: ''
                    });
                }
    
                return Resultado;


        }catch (error) {
            log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaProductoAdp)';
        }
    }
   
    function ConsultaProductoAdp_bak(GrupoProducto, Parametro, ValorParametro, NivelPrecio){
        try{
            if (GrupoProducto == 0 || GrupoProducto =='') {
                return 'id:400, Ingrese grupoproducto.';
            }

            if (Parametro == 0 || Parametro =='') {
                return 'id:400, Ingrese parametro.';
            }

            if (ValorParametro == 0 || ValorParametro =='') {
                return 'id:400, Ingrese valor.';
            }    

            let objResultado = [];
            let FamiliaProducto = search.create({
                type: "customrecord_ht_cr_parametrizacion_produ",
                filters: [
                    ["custrecord_ht_pp_code","is","FAM", "AND", "internalid", "is not", "29892"]
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ht_pp_code", label: "Codigo"}),
                    search.createColumn({name: "custrecord_ht_pp_descrip", label: "Descripcion"})
                ]
            });

            let ResFamiliaProducto = FamiliaProducto.run().getRange(0, 1); //OBTENGO EL CODIGO DEL PARAMETRO FAM
            let Fam = 0;
          
            if (FamiliaProducto.runPaged().count == 0) {
                return objResultado;
            }
          
            Fam = ResFamiliaProducto[0].getValue({name: 'internalid'});

            let Valor = search.create({
                type: "customrecord_ht_cr_pp_valores",
                filters: [
                    ["custrecord_ht_pp_codigo","is",GrupoProducto]
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ht_pp_codigo", label: "Codigo"}),
                    search.createColumn({name: "custrecord_ht_pp_descripcion", label: "Descripcion"})
                ]
            });

            let ResValor = Valor.run().getRange(0, 1); //OBTENGO EL CODIGO DEL GRUPO PRODUCTO
            let IdValor = 0;
          
            if (Valor.runPaged().count == 0) {
                return objResultado;
            }

            IdValor = ResValor[0].getValue({name: 'internalid'});

            let objParametro = search.create({
                type: "customrecord_ht_cr_parametrizacion_produ",
                filters: [
                    ["custrecord_ht_pp_code","is",Parametro]
                ],
                columns: [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ht_pp_code", label: "Codigo"}),
                    search.createColumn({name: "custrecord_ht_pp_descrip", label: "Descripcion"})
                ]
            });

            let ResParametro = objParametro.run().getRange(0, 1); //OBTENGO EL CODIGO DEL PARAMETRO CONSULTADO
            let IdParametro = 0;
          
            if (objParametro.runPaged().count == 0) {
                return objResultado;
            }

            IdParametro = ResParametro[0].getValue({name: 'internalid'});

            if (Fam != 0 || IdValor != 0 || IdParametro != 0) {

                let Busqueda = search.create({
                    type: "item",
                    filters: [
                        ["custrecord_ht_pp_parametrizacionid.custrecord_ht_pp_parametrizacion_rela","anyof",Fam], "AND", //FILTRO LOS ITEMS DEL GRUPO PRODUCTO CONSULTADO
                        ["custrecord_ht_pp_parametrizacionid.custrecord_ht_pp_parametrizacion_valor","anyof",IdValor], "AND",
                        ["isinactive","is","F"]
                    ],
                    columns: [
                        search.createColumn({name: "internalid", label: "Id"}),
                        search.createColumn({name: "displayname", label: "Descripcion"}), //salesdescription
                        search.createColumn({name: "itemid", label: "Codigo"}),
                        
                        search.createColumn({name: "isinactive", label: "Estado"}),
                        //search.createColumn({name: "recordType", label: "Tabla"}),
                        search.createColumn({
                            name: "custrecord_ht_pp_parametrizacion_valor",
                            join: "CUSTRECORD_HT_PP_PARAMETRIZACIONID",
                            label: "Valor"
                         }),
                         search.createColumn({
                            name: "custrecord_ht_pp_parametrizacion_rela",
                            join: "CUSTRECORD_HT_PP_PARAMETRIZACIONID",
                            label: "ParametrizaciÃ³n"
                         })
                    ]
                });
    
                let Iditem = 0;
                let CodItem = 0;
                let DescripcionItem = '';
                let idValorParam = 0;
                let CodValorParam = 0;
                let DescripcionValorParam = '';
                let ObjItem = [];
                let ObjDetItem = [];
                let Resultado = Busqueda.run().getRange(0, 1000);

                log.error('PARAMETRIZACION: ',Resultado);              

                if (Busqueda.runPaged().count == 0) {
                    return objResultado;
                }
    
                for (let i in Resultado){ //RECORRO EL DETALLE DE PRODUCTOS OBTENIDO
                    log.error('ITEM DESCRIP: ', Resultado[i].getValue({name: 'displayname'}));
                    log.error('TABLA: ', Resultado[i].recordType) ; //({name: 'type'})); 
                  
                    ObjItem = record.load({type: Resultado[i].recordType, id: Resultado[i].getValue({name: 'internalid'}), isDynamic: true}); 
                    //record.load({type: 'serviceitem', id: Resultado[i].getValue({name: 'internalid'}), isDynamic: true}); //FILTRO POR CADA PRODUCTO
                    //log.error('ITEM: ', ObjItem);
                    Iditem = ObjItem.getValue({fieldId: 'id'});
                    CodItem = ObjItem.getValue({fieldId: 'itemid'});
                    DescripcionItem = ObjItem.getValue({fieldId: 'displayname'}); //'salesdescription'});

                    ObjDetItem = ObjItem.getLineCount({sublistId: "recmachcustrecord_ht_pp_parametrizacionid"}); //OBTENGO LA SUBLISTA QUE CONTIENE LOS PARAMETROS DEL ITEM
                    if (ObjDetItem > 0) {
                        log.error('DETALLE ITEM: ', ObjDetItem); 
                        for (let i = 0; i < ObjDetItem; i++) {
                            if (IdParametro == ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_rela', line: i})){  //FILTRO POR EL PARAMETRO CONSULTADO
    
                                idValorParam = ObjItem.getSublistValue({sublistId: 'recmachcustrecord_ht_pp_parametrizacionid', fieldId: 'custrecord_ht_pp_parametrizacion_valor', line: i});
                                objValor = record.load({type: 'customrecord_ht_cr_pp_valores', id: idValorParam, isDynamic: true});
                                
                                idValorParam = objValor.getValue({fieldId: 'id'});
                                CodValorParam = objValor.getValue({fieldId: 'custrecord_ht_pp_codigo'});
                                DescripcionValorParam = objValor.getValue({fieldId: 'custrecord_ht_pp_descripcion'});

                                let objItemComercial = ConsultaItemComercial (Iditem, NivelPrecio);

                                if (ValorParametro == CodValorParam) {
                                    objResultado.push({
                                        CodGrupoProducto: GrupoProducto,
                                        DescGrupoProducto: ResValor[0].getValue({name: 'custrecord_ht_pp_descripcion'}),
                                        Iditem: Iditem,
                                        CodItem: CodItem,
                                        DescripcionItem: DescripcionItem,
                                        IdParametro: IdParametro,
                                        Parametro: Parametro,
                                        idValorParam: idValorParam,
                                        CodValorParam: CodValorParam,
                                        DescripcionValorParam: DescripcionValorParam,
                                        PrecioItem: objItemComercial[0].PrecioItem,
                                        IdTipoImpuesto: objItemComercial[0].IdTipoImpuesto,
                                        TipoImpuesto: objItemComercial[0].TipoImpuesto,
                                        TasaIvaCompra: objItemComercial[0].TasaIvaCompra,
                                        TasaIvaVenta: objItemComercial[0].TasaIvaVenta 
                                    });
                                }
                            }
                        } //fin ciclo sublista
                    } //if ObjDetItem   
                  
                } //fin ciclo    
            }            

            return objResultado;

        }catch (error) {
            log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaProductoAdp)';
        }
    }

    function ConsultaProvincia(IdProvincia) {
        try{
            let Resultado = [];
            let Busqueda = search.create({
                type: "customrecord_ec_record_provincia",
                filters: ["isinactive","is","F"],
                columns: [
                    search.createColumn({name: "internalid", sort: search.Sort.ASC, label: "internalid"}),
                    search.createColumn({name: "name", label: "Desciprcion"}),
                    search.createColumn({name: "isinactive", label: "Estado"})
                ]
            });

            if (IdProvincia != '' && IdProvincia != '0') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdProvincia
                    }));
            }
          
            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let Id = ResConsulta[i].getValue({name: 'internalid'});
                let Descripcion = ResConsulta[i].getValue({name: 'name'});
                let Estado = ResConsulta[i].getValue({name: 'isinactive'});
    
                if (Estado='F'){
                    Estado= 'VIG';
                }else{
                    Estado= 'INA';
                }

                Resultado.push({
                    Id: Id,
                    Descripcion: Descripcion,
                    Estado: Estado
                });
            }
            return Resultado;

        }catch (error) {
                    log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaProvincia)';
            }
    }

  function ConsultaCanton (IdProvincia, IdCanton, PaginaId) {
        try{
            let Resultado = [];
          
            if ((IdProvincia == '') || (IdProvincia ==0)){
                return 'id:400, Ingrese la provincia';
            }

            let Busqueda = search.create({
                type: "CUSTOMRECORD_EC_RECORD_CANTON",
                filters: ["isinactive","is","F"],
                columns: [
                    search.createColumn({name: "internalid", sort: search.Sort.ASC, label: "internalid"}),
                    search.createColumn({name: "name", label: "Canton"}),
                    search.createColumn({name: "custrecord_ec_cc_nombreprovincia", label: "Provincia"}),
                    search.createColumn({name: "isinactive", label: "Estado"})
                ]
            });

            Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ec_cc_nombreprovincia', 
                operator: search.Operator.IS,
                values: IdProvincia
                }));

            if (IdCanton != '' && IdCanton != '0') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdCanton
                    }));
            }

            //let BusquedaNumReg = Busqueda.runPaged().count;
            //let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            if (ResConsulta.count != 0) {
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result){
                    let IdCanton = result.getValue({name: 'internalid'});
                    let Descripcion = result.getValue({name: 'name'});
                    IdProvincia = result.getValue({name: 'custrecord_ec_cc_nombreprovincia'});
                    let Provincia = result.getText({name: 'custrecord_ec_cc_nombreprovincia'});
                    let Estado = result.getValue({name: 'isinactive'});
        
                    if (Estado='F'){
                        Estado= 'VIG';
                    }else{
                        Estado= 'INA';
                    }
    
                    Resultado.push({
                        IdProvincia: IdProvincia,
                        Provincia: Provincia,
                        Id: IdCanton,
                        Descripcion: Descripcion,
                        Estado: Estado,
                        Paginas: conteoPagina
                    });
                });
            }
            return Resultado;

        }catch (error) {
                    log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanton)';
            }
    }

   function ConsultaParroquia (IdProvincia, IdCanton, IdParroquia, PaginaId) {
        try{
            let Resultado = [];

            if ((IdProvincia == '') || (IdProvincia ==0)){
                return 'id:400, Ingrese la provincia';
            }

            if ((IdCanton == '') || (IdCanton ==0)){
                return 'id:400, Ingrese la canton';
            }

            let Busqueda = search.create({
                type: "CUSTOMRECORD_EC_RECORD_PARROQUIA",
                filters: ["isinactive","is","F"],

                columns: [
                    search.createColumn({name: "custrecord_ec_cp_nombreprovincia", label: "Provincia"}),
                    search.createColumn({name: "custrecord_ec_cp_nombrecanton", label: "Canton"}),
                    search.createColumn({name: "internalid", sort: search.Sort.ASC, label: "internalid"}),
                    search.createColumn({name: "name", label: "Parroquia"}),
                    search.createColumn({name: "isinactive", label: "Estado"}),
                    search.createColumn({
                        name: "custrecord_ec_cc_nombreprovincia",
                        join: "CUSTRECORD_EC_CP_NOMBRECANTON",
                        label: "ID PROVINCIA"
                    })
                ]
            });

            Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ec_cc_nombreprovincia', 
                join: 'CUSTRECORD_EC_CP_NOMBRECANTON',
                operator: search.Operator.IS,
                values: IdProvincia
                }));


            Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ec_cp_nombrecanton', 
                operator: search.Operator.IS,
                values: IdCanton
                }));

            if (IdParroquia != '' && IdParroquia != '0') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdParroquia
                    }));
            }

            //let BusquedaNumReg = Busqueda.runPaged().count;
            //let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);
            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});

            conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);
            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }

            //for (let i in ResConsulta) {
            if (ResConsulta.count != 0)  {
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});
                BusquedaResultado.data.forEach(function (result) {
                    let IdParroquia =  result.getValue({name: 'internalid'});
                    let Descripcion = result.getValue({name: 'name'});
                    let Provincia = result.getValue({name: 'custrecord_ec_cp_nombreprovincia'});
                    let Canton = result.getText({name: 'custrecord_ec_cp_nombrecanton'});
                    let Estado = result.getValue({name: 'isinactive'});
                    let IdProvincia = result.getValue({name: 'custrecord_ec_cc_nombreprovincia', join: 'CUSTRECORD_EC_CP_NOMBRECANTON'});
        
                    if (Estado='F'){
                        Estado= 'VIG';
                    }else{
                        Estado= 'INA';
                    }
    
                    Resultado.push({
                        IdProvincia: IdProvincia,
                        Provincia: Provincia,
                        IdCanton: IdCanton,
                        Canton: Canton,
                        Id: IdParroquia,
                        Descripcion: Descripcion,
                        Estado: Estado,
                        Paginas: conteoPagina
                    });
                });
            }
            return Resultado;

        }catch (error) {
                    log.error('error', error);
                    return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaParroquia)';
            }
    }

    function ConsultaTipoVehiculoDetalle(IdTipo, IdTipoDet) {
        try{

            if (IdTipo == 0 || IdTipo == '') {
                return 'id:400, Ingrese Tipo Vehiculo.';
            }

            let Resultado = [];
            let Busqueda = search.create({
                type: "customrecord_ht_bien_tipoterrestre",
                filters: ["isinactive","is","F"],
                columns: [
                    search.createColumn({name: "custrecord_ht_tt_tipobien", label: "Tipo Veh."}),
                    search.createColumn({name: "internalid", sort: search.Sort.ASC, label: "internalid"}),
                    search.createColumn({name: "name", label: "Descripcion"}),
                    search.createColumn({name: "isinactive", label: "Estado"})
                ]
            });

            Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tt_tipobien', 
                operator: search.Operator.ANYOF,
                values: IdTipo
                }));

            if (IdTipoDet != 0 && IdTipoDet != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdTipoDet
                    })); 
            }        

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                let IdTipoBien= ResConsulta[i].getValue({name: 'custrecord_ht_tt_tipobien'});
                let TipoBien= ResConsulta[i].getText({name: 'custrecord_ht_tt_tipobien'});
                let Id = ResConsulta[i].getValue({name: 'internalid'});
                let Descripcion = ResConsulta[i].getValue({name: 'name'});
                let Estado = ResConsulta[i].getValue({name: 'isinactive'});
    
                if (Estado='F'){
                    Estado= 'VIG';
                }else{
                    Estado= 'INA';
                }

                Resultado.push({
                    IdTipoBien: IdTipoBien,
                    TipoBien: TipoBien,
                    Id: Id,
                    Descripcion: Descripcion,
                    Estado: Estado
                });
            }
            return Resultado;

        }catch (error) {
                    log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoVehiculoDetalle)';
            }
    }

    function ConsultaCanal(IdCanal, Ruc_Canal, TipoCanal, Criterio){
        try{
            
            let Resultado = [];
            let Canal = '';
          
            switch (TipoCanal) {
                case 1: Canal = "Aseguradora"; break;
                case 2: Canal = "Concesionario"; break;
                case 3: Canal = "Financiera"; break;
                default: break;
            }

            let Busqueda = search.create({
                type: "customrecord_ht_record_canaldistribucion",
                filters: [
                    ["custrecord_ht_cd_subsidiaria","is",GlobalSubsidiaria],"AND",
                    ["custrecord_ht_cd_tipocanal","is",TipoCanal],"AND",
                    ["isinactive","is","F"]
                ],
                columns: ["internalid","custrecord_ht_cd_ruccanaldistribucion","custrecord_ht_cd_rucrepresentante","custrecord_ht_cd_representante","custrecord_ht_cd_nombre","name"]
            });

            if (IdCanal != 0 && IdCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS, //NO FUNCIONA ANYOF IS EQUALTO
                    values: IdCanal
                    })); 
            }
          
            if (Ruc_Canal != 0 && Ruc_Canal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_cd_ruccanaldistribucion', 
                    operator: search.Operator.STARTSWITH,
                    values: Ruc_Canal
                    })); 
            }

            if (Criterio != 0 && Criterio != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'name', //custrecord_ht_cd_nombre
                    operator: search.Operator.CONTAINS,
                    values: Criterio
                    })); 
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta) {
                Resultado.push({
                    Id: ResConsulta[i].getValue("internalid"),
                    Canal: Canal,
                    RucCanal: ResConsulta[i].getValue("custrecord_ht_cd_ruccanaldistribucion"),
                    DescripcionCanal: ResConsulta[i].getValue("name"), //ResConsulta[i].getValue("custrecord_ht_cd_nombre")
                    RucRepresentante: ResConsulta[i].getValue("custrecord_ht_cd_rucrepresentante"),
                    Representante: ResConsulta[i].getValue("custrecord_ht_cd_representante")
                });
            }

            if (BusquedaNumReg == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    Id: "",
                    Canal: "",
                    RucCanal: " ",
                    DescripcionCanal: " ",
                    RucRepresentante: "",
                    Representante: ""
                });
            }
          
            return Resultado;
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanal)';
        }
    }

    function ConsultaCanal_v2(IdCanal, Ruc_Canal, TipoCanal, Criterio, PaginaId){ //CON PAGINEO
        try{
            
            let Resultado = [];
            let Canal = '';
          
            switch (TipoCanal) {
                case 1: Canal = "Aseguradora"; break;
                case 2: Canal = "Concesionario"; break;
                case 3: Canal = "Financiera"; break;
                default: break;
            }

            let Busqueda = search.create({
                type: "customrecord_ht_record_canaldistribucion",
                filters: [
                    ["custrecord_ht_cd_subsidiaria","is",GlobalSubsidiaria],"AND",
                    ["custrecord_ht_cd_tipocanal","is",TipoCanal]
                    //,"AND",["isinactive","is","F"]
                    //,"AND", ["custrecord_ht_cd_nombre","isnot",["","."]]
                ],
                //columns: ["internalid","custrecord_ht_cd_ruccanaldistribucion","custrecord_ht_cd_rucrepresentante","custrecord_ht_cd_representante","custrecord_ht_cd_nombre"]
                columns: [
                    search.createColumn({name: "internalid", sort: search.Sort.ASC}),
                    search.createColumn({name: "custrecord_ht_cd_ruccanaldistribucion"}),
                    search.createColumn({name: "custrecord_ht_cd_rucrepresentante"}),
                    search.createColumn({name: "custrecord_ht_cd_representante"}),
                    search.createColumn({name: "custrecord_ht_cd_nombre"}),
                    search.createColumn({name: "name"})
                  
                ]
            });

            if (IdCanal != 0 && IdCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS, //NO FUNCIONA ANYOF IS EQUALTO
                    values: IdCanal
                    })); 
            }
          
            if (Ruc_Canal != 0 && Ruc_Canal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_cd_ruccanaldistribucion', 
                    operator: search.Operator.STARTSWITH,
                    values: Ruc_Canal
                    })); 
            }

            if (Criterio != 0 && Criterio != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_cd_nombre', 
                    operator: search.Operator.CONTAINS,
                    values: Criterio
                    })); 
            }

            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
            let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } /*else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }*/
          
            if (ResConsulta.count != 0 && PaginaId < conteoPagina) {
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result) { 
                    Resultado.push({
                        Id: result.getValue("internalid"),
                        Canal: Canal,
                        RucCanal: result.getValue("custrecord_ht_cd_ruccanaldistribucion"),
                        DescripcionCanal: result.getValue("custrecord_ht_cd_nombre") || result.getValue("name"),
                        RucRepresentante: result.getValue("custrecord_ht_cd_rucrepresentante"),
                        Representante: result.getValue("custrecord_ht_cd_representante"),
                        Paginas: conteoPagina
                    });
                });
            }

            if (ResConsulta.count == 0 && OrigenConsulta == "SQL" || PaginaId >= conteoPagina){
                  Resultado.push({
                    Id: "",
                    Canal: "",
                    RucCanal: " ",
                    DescripcionCanal: " ",
                    RucRepresentante: "",
                    Representante: "",
                    Paginas: 0
                });
            }

            return Resultado;
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanal_v2)';
        }
    }

    function ConsultaVendedor(IdCanal, RucCanal, Criterio, PaginaId){
        try{
            let Resultado = [];

            let Busqueda = search.create({
                type: "vendor",
                filters: [
                    ["subsidiary","is",GlobalSubsidiaria],"AND",
                    ["category","is","7"]
                ],
                columns: [
                  // "internalid","altname","vatregnumber","category"
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "vatregnumber", label: "Codigo"}),
                    search.createColumn({name: "altname", label: "Nombre", sort: search.Sort.ASC}),
                    search.createColumn({name: "companyname", label: "Descripcion"})
                ]
            });

            if (IdCanal != 0 && IdCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdCanal
                    })); 
            }
            if (RucCanal != 0 && RucCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'vatregnumber', 
                    operator: search.Operator.CONTAINS,
                    values: RucCanal
                    })); 
            }
            if (Criterio != 0 && Criterio != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'altname', 
                    operator: search.Operator.CONTAINS,
                    values: Criterio
                    })); 
            }

            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
            let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } /*else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }*/

            if (ResConsulta.count != 0 && PaginaId < conteoPagina){
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result) {
                    Resultado.push({
                        Id: result.getValue("internalid"),
                        Canal: 'Vendedor',
                        RucCanal: result.getValue("vatregnumber"),
                        DescripcionCanal: result.getValue("altname"),
                        Paginas: conteoPagina
                    });
                });
            }
          
            if (ResConsulta.count == 0 && OrigenConsulta == "SQL" || PaginaId >= conteoPagina){
                  Resultado.push({
                    Id: "",
                    Canal: "",
                    RucCanal: " ",
                    DescripcionCanal: " ",
                    Paginas: 0
                });
            }
            return Resultado;
            
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaVendedor)';
        }
    }

    function ConsultaVendedorCompleto(IdCanal, RucCanal, Criterio, PaginaId){
        try{
            let Resultado = [];

            let Busqueda = search.create({
                type: "vendor",
                filters: [
                    ["subsidiary","is",GlobalSubsidiaria],"AND",
                    ["category","is","7"]
                ],
                columns: [
                  // "internalid","altname","vatregnumber","category"
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "vatregnumber", label: "Codigo"}),
                    search.createColumn({name: "altname", label: "Nombre", sort: search.Sort.ASC}),
                    search.createColumn({name: "companyname", label: "Descripcion"}),
                    search.createColumn({name: "email", label: "mail"}),
                    search.createColumn({name: "phone", label: "telefono"}),
                    search.createColumn({name: "custentity_ht_concesionario", label: "Concesionario"})
                ]
            });

            if (IdCanal != 0 && IdCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'internalid', 
                    operator: search.Operator.IS,
                    values: IdCanal
                    })); 
            }
            if (RucCanal != 0 && RucCanal != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'vatregnumber', 
                    operator: search.Operator.CONTAINS,
                    values: RucCanal
                    })); 
            }
            if (Criterio != 0 && Criterio != '') {
                Busqueda.filters.push(search.createFilter({
                    name: 'altname', 
                    operator: search.Operator.CONTAINS,
                    values: Criterio
                    })); 
            }

            let ResConsulta = Busqueda.runPaged({ pageSize: LONGITUD_PAGINA});
            let conteoPagina = Math.ceil(ResConsulta.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            } /*else if (PaginaId >= conteoPagina) {
                PaginaId = conteoPagina - 1;
            }*/

            if (ResConsulta.count != 0 && PaginaId < conteoPagina){
                let BusquedaResultado = ResConsulta.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result) {
                    Resultado.push({
                        Id: result.getValue("internalid"),
                        Canal: 'Vendedor',
                        RucCanal: result.getValue("vatregnumber"),
                        DescripcionCanal: result.getValue("altname"),
                        Email: result.getValue("email") ? result.getValue("email") : '',
                        Telefono: result.getValue("phone") ? result.getValue("phone"): '',
                        Concesionario: result.getText("custentity_ht_concesionario") ? result.getText("custentity_ht_concesionario") : '',
                        Paginas: conteoPagina
                    });
                });
            }
          
            if (ResConsulta.count == 0 && OrigenConsulta == "SQL" || PaginaId >= conteoPagina){
                  Resultado.push({
                    Id: "",
                    Canal: "",
                    RucCanal: " ",
                    DescripcionCanal: ".",
                    Email: ".",
                    Telefono: ".",
                    Concesionario: ".",
                    Paginas: 0
                });
            }
            return Resultado;
            
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaVendedorCompleto)';
        }
    }
   
  function ConsultaColor(idColor){
        try{
            
            let Resultado = [];
            let Busqueda = search.create({
                type: "customrecord_ht_bn_colorcarseg",
                filters:[
                    ["isinactive","anyof","F"], 
                ],
                columns:
                [
                    search.createColumn({
                        name: "custrecord_ht_bn_colorcarseg_descripcion",
                        sort: search.Sort.ASC,
                        label: "name"
                    }),
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ht_bn_colorcarseg_codigo", label: "Codigo"}),
                ]
            });

            if (idColor != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: idColor
                })); 
            } 

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta)  {
                var IdColor = ResConsulta[i].getValue({name: 'internalid'});
                var Codigo = ResConsulta[i].getValue({name: 'custrecord_ht_bn_colorcarseg_codigo'});
                var Descripcion= ResConsulta[i].getValue({name: 'custrecord_ht_bn_colorcarseg_descripcion'});
    
                Resultado.push({
                    Id: IdColor,
                    Codigo: Codigo,
                    Descripcion: Descripcion
                });
            }

            return Resultado;
        }catch (error) {
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaColor)';
        }
    }

 function ConsultaPais(IdPais, Criterio){
        try{
            
            let Resultado = [];
          
            let Busqueda = search.create({
                type: "customrecord_ts_ec_pe_pais",
                filters:[
                    ["isinactive","anyof","F"], "AND",
                    ["name","contains",Criterio]
                ],
                columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "name"
                    }),
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "custrecord_ts_ec_codigo_pais", label: "Codigo"}),
                   // search.createColumn({name: "abbreviation", label: "CodPais"}),
                ]
            });

            if (IdPais != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: IdPais
                })); 
            } 

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);
        
            for (let i in ResConsulta)  {
                var IdPais = ResConsulta[i].getValue({name: 'internalid'});
                var Codigo = ResConsulta[i].getValue({name: 'custrecord_ts_ec_codigo_pais'});
                //var CodPais = ResConsulta[i].getValue({name: 'abbreviation'});
                var Descripcion= ResConsulta[i].getValue({name: 'name'});
    
                Resultado.push({
                    Id: IdPais,
                    Codigo: Codigo,
                    //CodPais: CodPais,
                    Descripcion: Descripcion
                });
            }
//Resultado = record.load({type: 'customrecord_ts_ec_pe_pais', id: IdPais, isDynamic: true});
            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaPais)';
        }
    }

    function ConsultaEjecutiva(EsEjecutiva, IdEjecutiva, Criterio, Clase, Ciudad){
        try{
            let Resultado = [];
            let Filtro = [["isinactive","anyof","F"],"AND", ["salesrep","is",EsEjecutiva]];

            if (IdEjecutiva) {
              Filtro.push("AND");
              Filtro.push(["internalid","is",Number(IdEjecutiva)]);
            } 
            if (Clase) {
              Filtro.push("AND");
              Filtro.push(["class","anyof",Clase]);
            } 
            if (Ciudad) {
              Filtro.push("AND");
              Filtro.push(["location","is",Number(Ciudad)]);
            } 
            if (Criterio) {
              Filtro.push("AND");
              Filtro.push(["altname","contains",Criterio]);
            } 

            let Busqueda = search.create({
                type: "employee",
                filters: Filtro,
                columns:
                [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "entityid", label: "Codigo"}),
                    search.createColumn({name: "altname", label: "Nombre"}),
                    search.createColumn({name: "class", label: "Clase"}),
                    search.createColumn({name: "location", label: "Ciudad"}),
                    search.createColumn({name: "issalesrep", label: "RepresentanteVentas"}),
                    search.createColumn({name: "custentity_ec_numero_registro", label: "Identificacion"})
                  
                ]
            });

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);
        
            for (let i in ResConsulta)  {
                let IdEjecutiva = ResConsulta[i].getValue({name: 'internalid'});
                let Codigo = ResConsulta[i].getValue({name: 'entityid'});
                let Nombre = ResConsulta[i].getValue({name: 'altname'});
                let IdClase = ResConsulta[i].getValue({name: 'class'});
                let IdOficina = ResConsulta[i].getValue({name: 'location'});
                let Clase = ResConsulta[i].getText({name: 'class'});
                let Oficina = ResConsulta[i].getText({name: 'location'});
                let Ejecutiva = ResConsulta[i].getValue({name: 'issalesrep'});
                let Identificacion = ResConsulta[i].getValue({name: 'custentity_ec_numero_registro'});
    
                Resultado.push({
                    Id: IdEjecutiva ? IdEjecutiva : 0,
                    Codigo: Codigo ? Codigo : '',
                    Nombre: Nombre ? Nombre : '',
                    IdClase: IdClase ? IdClase : '.',
                    Clase: Clase ?  Clase : '.',
                    Oficina: Oficina ? Oficina : '',
                    IdOficina: IdOficina ? IdOficina : 0,
                    Ejecutiva: Ejecutiva ? Ejecutiva : 'FALSE',
                    Identificacion: Identificacion ? Identificacion : '-'
                });
            }

            if (ResConsulta.length == 0 && OrigenConsulta == "SQL"){
                Resultado.push({
                    Id: '',
                    Codigo: '',
                    Nombre: '',
                    IdClase: 0,
                    Clase: '',
                    Oficina: '',
                    IdOficina: 0,
                    Ejecutiva: '',
                    Identificacion: ''
                });
            }

            return Resultado;
        }catch (error) {
                log.error('error', error);
                return JSON.stringify({error: error.message});
                //return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaEjecutiva)';
        }
    }

   function ConsultaTipoCanal() {
        try{
            let resultado = null;
            let TipoCanalQuery = query.runSuiteQL({
                query: `SELECT  * FROM CUSTOMLIST_HT_CD_TIPOCANAL`,
            });

            let res = TipoCanalQuery.asMappedResults();

            if (res.length > 0) {
                resultado = res;
            } else {
                resultado = { error: 'no data' };
            }

            return JSON.stringify({
                results: resultado
            });
            
        } catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoCanal)';
        }
    }

    function ConsultaFactura(CodigoProveedor, IdDocumento, SerieDocumento, TipoDoc){
        try{
            
            let Resultado = [];
            let Busqueda = search.create({
                type: "transaction",
                filters:[
                    ["mainline","is","T"],"AND",
                    ["taxline","is","F"],"AND", 
                    ["custbodyts_ec_tipo_documento_fiscal","anyof","4"]
                ],
                columns:
                [
                    search.createColumn({name: "tranid", label: "NUMERO_DOCUMENTO"}),
                    search.createColumn({name: "transactionnumber", label: "NUMERO_TRANSACCION"}),
                    search.createColumn({name: "custbody_ts_ec_serie_doc_cxp", label: "CxP_SERIE"}),
                    search.createColumn({name: "custbody_ts_ec_numero_preimpreso", label: "NUMERO_PREIMPRESO"}),
                    search.createColumn({name: "entity", label: "PROVEEDOR"}),
                    search.createColumn({name: "trandate", label: "FECHA"}),
                    search.createColumn({name: "internalid", label: "ID_INTERNO"}),
                  
                    search.createColumn({
                        name: "externalid",
                        join: "vendorLine",
                        label: "CODPROVEEDOR"
                     }),
                     search.createColumn({
                        name: "vatregnumber",
                        join: "vendorLine",
                        label: "CODPROVEEDOR1"
                     }),
                    search.createColumn({
                        name: "formulatext",
                        formula: "CONCAT({custbody_ts_ec_serie_doc_cxp}, {custbody_ts_ec_numero_preimpreso}) ",
                        label: "SERIE"
                    }),
                    search.createColumn({name: "custbodyts_ec_tipo_documento_fiscal", label: "EC - Tipo de Documento Fiscal"})

                   /* search.createColumn({
                        name: "entityid", // produccion externalid // sandbox entityid
                        join: "vendorLine",
                        label: "CODPROVEEDOR"
                     })*/
                ]
            });

            if (IdDocumento != '' && IdDocumento != 0) {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.ANYOF,
                values: IdDocumento
                })); 
            } 
/* // NO FUNCIONA, DA ERROR INESPERADO
            if (SerieDocumento != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'formulatext',
                operator: search.Operator.ANYOF,
                formula: "CONCAT({custbody_ts_ec_serie_doc_cxp}, {custbody_ts_ec_numero_preimpreso})",
                values: SerieDocumento
                })); 
            }
*/

            if (SerieDocumento != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'tranid',
                operator: search.Operator.ANYOF,
                values: SerieDocumento
                })); 
            }
          
            if (CodigoProveedor != '' && CodigoProveedor != 0) {
                Busqueda.filters.push(search.createFilter({
                // name: 'externalid',
                name: 'vatregnumber', 
                join: 'vendorLine',
                operator: search.Operator.IS,
                values: CodigoProveedor
                })); 
            }

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta)  {
                let NumeroDocumento= ResConsulta[i].getValue({name: 'tranid'});
                let NumeroTransaccion = ResConsulta[i].getValue({name: 'transactionnumber'});
                let Cxp_Serie= ResConsulta[i].getValue({name: 'custbody_ts_ec_serie_doc_cxp'});
                let NumeroPreimpreso= ResConsulta[i].getValue({name: 'custbody_ts_ec_numero_preimpreso'});
                let Proveedor= ResConsulta[i].getText({name: 'entity'});
                let Fecha = ResConsulta[i].getValue({name: 'trandate'});
                let idInterno= ResConsulta[i].getValue({name: 'internalid'});
                //let codproveedor = ResConsulta[i].getValue({name: 'vatregnumber', join: 'vendorLine'});
                let codproveedor = ResConsulta[i].getValue({name: 'vatregnumber', join: 'vendorLine'});
                let Referencia = ResConsulta[i].getValue({name: 'formulatext'});
                let TipoDocumentoFiscal = ResConsulta[i].getText({name: 'custbodyts_ec_tipo_documento_fiscal'});

                Resultado.push({
                    NumeroDocumento: NumeroDocumento,
                    NumeroTransaccion: NumeroTransaccion,
                    Cxp_Serie: Cxp_Serie,
                    NumeroPreimpreso: NumeroPreimpreso,
                    Proveedor: Proveedor,
                    Fecha: Fecha,
                    idInterno: idInterno,
                    CodigoProveedor: codproveedor,
                    Referencia: Referencia,
                    TipoDocumentoFiscal: TipoDocumentoFiscal
                    // CodigoProveedorProd: codproveedor_prod
                });
            }

            return Resultado;      
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaFactura)';
        }
    }

    function Get_Parametro_Producto(Parametro){
        try{
            let Resultado = [];
            let condicion = '';

            if (Parametro !== ""){
                condicion = " AND PARAM.custrecord_ht_pp_code =  '" + Parametro + "' ";
            }

            let TipoCanalQuery = query.runSuiteQL({
                query: `SELECT  distinct param.id id_parametro, 
                                param.custrecord_ht_pp_code cod_parametro,
                                param.name descr_param,
                                val.id id_valor, 
                                val.custrecord_ht_pp_codigo codigo, 
                                val.custrecord_ht_pp_descripcion  descripcion
                        FROM 	CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU PARAM,
                                customrecord_ht_pp_main_param_prod REL,
                                CUSTOMRECORD_HT_CR_PP_VALORES VAL
                        WHERE 	rel.custrecord_ht_pp_parametrizacion_rela = param.id
                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                        and     rel.isinactive = 'F' 
                        and     param.isinactive = 'F'
                        ${condicion}
                        ORDER BY val.custrecord_ht_pp_codigo, val.custrecord_ht_pp_codigo                
                             `,
            });

            let res = TipoCanalQuery.asMappedResults();
            let resfiltrada = res;
          
            Resultado = resfiltrada;

            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    id_parametro : '',
                    cod_parametro : '',                    
                    id_valor : '',
                    codigo : '',
                    descripcion : ''
                });
            }

            return Resultado;
            
        } catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (Get_Parametro_Producto)';
        }  
    }

    function ConsultaLibre(QueryConsulta){
        try{

            let RespuestaQuery = query.runSuiteQL({
                query: `${QueryConsulta}`
            });
            let Resultado = RespuestaQuery.asMappedResults();

            if (RespuestaQuery.length == 0) {
                Resultado = { error: 'no data' };
            } else {
              
                let combinedResultado = {};
                Resultado.forEach((item, index) => {
                    combinedResultado[`displayname${index + 1}`] = item.displayname;
                });
                Resultado = [combinedResultado]; // Formatear como array de un único objeto
            }
            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaLibre)';
        }
    }

    function AniosAnticipados(ListaItems, Parametro, Valor){
        try{

            //let cadenaTransformada = ListaItems.replace(/\s\-\s/g, " , ");
            let cadenaTransformada = ListaItems.replace(/\-/g, " , ");
            cadenaTransformada = cadenaTransformada.trim().replace(/,\s*$/, "");
          
            let condicion = " and param.custrecord_ht_pp_code = '" + Parametro + "'";

            if (Valor != ''){
               condicion = condicion + " and VAL.custrecord_ht_pp_codigo = '" + Valor + "'";
            }
            if (ListaItems != ''){
               condicion = condicion + " and i.id in (" + cadenaTransformada + ")"; 
            }

          log.debug("cadenaTransformada: ", cadenaTransformada);
          log.debug("condicion: ", condicion);

            let RespuestaQuery = query.runSuiteQL({
                query: `select  i.id IdNs, 
                                nvl(i.displayname,'') Descripcion,
                                nvl(param.custrecord_ht_pp_code,'') CodigoParametro,
                                nvl(VAL.custrecord_ht_pp_codigo,'') Valor,
                                i.subsidiary
                        from    item i, 
                                customrecord_ht_pp_main_param_prod rel, 
                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                CUSTOMRECORD_HT_CR_PP_VALORES val
                        WHERE   i.id = rel.custrecord_ht_pp_parametrizacionid 
                        and     rel.custrecord_ht_pp_parametrizacion_rela = param.id
                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                        ${condicion} `
            }); 
            let res = RespuestaQuery.asMappedResults();
            let filtrado = res.filter(r => r.subsidiary == GlobalSubsidiaria);
            Resultado = filtrado.map(item => {delete item.subsidiary; return item; }); //ELIMINA EL CAMPO SUBSIDIARY PORQUE SE INCLUYÓ SOLO PARA PODER FILTRAR

            return Resultado;
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (AniosAnticipados)';
        }
    }

    function ConsultaItemsGeneral(DescripcionItem, Trasnsaccion, Familia, ALQ, PaginaId){
        try{

            let Resultado = [];

            let RespuestaQuery = query.runSuiteQL({
                query: `SELECT	DISTINCT 
                                i.id IdNs, 
                                I.itemid IdSH, 
                                i.displayname as descripcion, 
                                nvl((
                                    select 	tt.custrecord_assettypedescription
                                    from 	customrecord_ncfar_assettype tt
                                    where 	id = i.custitem_ht_ar_tipoactivo
                                ), '') tipo_activo,
                                NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'TTR'),'') transaccion,
                                NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'FAM'),'') grupo_producto,
                                NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'TCH'),'') tipo_chequeo,
                                NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'PRO'),'') Carga,
                                NVL((	SELECT	top 1 nvl(val.custrecord_ht_pp_descripcion,'') codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'TAG'),'') tipo_producto,
                                NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'ADP'),'') ADP,
                                NVL((	SELECT	top 1 nvl(val.custrecord_ht_pp_descripcion,'') codigo 
                                        FROM	customrecord_ht_pp_main_param_prod rel, 
                                                CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                                CUSTOMRECORD_HT_CR_PP_VALORES val
                                        where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                                        and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                        and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                                        and		rel.isinactive = 'F' 
                                        and		param.isinactive = 'F'
                                        and		param.custrecord_ht_pp_code = 'ALQ'),'') ALQ,
                                        i.subsidiary
                FROM	item i 
                where	i.isinactive = 'F' 
                and		i.itemtype in ('Assembly','Service','InvtPart')
                and		i.id is not null 
                and		i.id <> 0 
                AND	LENGTH(i.itemid)<= 6 
                AND exists( select	top 1 1 
                            from	customrecord_ht_pp_main_param_prod r,
                                    CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU p
                            where	r.custrecord_ht_pp_parametrizacionid = i.id 
                            and		r.custrecord_ht_pp_parametrizacion_rela = p.id 
                            and		p.custrecord_ht_pp_code = 'TTR') `
            }); 

            let res = RespuestaQuery.asMappedResults();

            res = res.filter(item => {

                if (item.subsidiary != GlobalSubsidiaria) {
                    return false;
                }
              
                // Filtro por descripción
                if (DescripcionItem && DescripcionItem.trim() !== "") {
                    if (!item.descripcion ||
                        !item.descripcion.toUpperCase().includes(DescripcionItem.toUpperCase())) {
                        return false;
                    }
                }

                // Filtro por transacción
                if (Trasnsaccion && Trasnsaccion.trim() !== "") {
                    if (!item.transaccion ||
                        !item.transaccion.toUpperCase().includes(Trasnsaccion.toUpperCase())) {
                        return false;
                    }
                }

                // Filtro por familia (grupo_producto)
                if (Familia && Familia.trim() !== "") {
                    if (!item.grupo_producto ||
                        !item.grupo_producto.toUpperCase().includes(Familia.toUpperCase())) {
                        return false;
                    }
                }

                // Filtro por familia (grupo_producto)
                if (ALQ && ALQ.trim() !== "") {
                    if (!item.alq ||
                        !item.alq.toUpperCase().includes(ALQ.toUpperCase())) {
                        return false;
                    }
                }

                return true;
            });

            let NumReg= 100;
          
            let conteoPagina = Math.ceil(res.length  / NumReg);
            let inicio = PaginaId * NumReg;
            let fin = inicio + NumReg;

            let Pagina = res.slice(inicio, fin);

            if (!PaginaId || PaginaId == '' || PaginaId < 0 || PaginaId > conteoPagina) {
                PaginaId = 0;
            }

            if (res.count != 0 && PaginaId < conteoPagina){
                Pagina.forEach(result => {
                    Resultado.push({
                        idns: result.idns,
                        idsh: result.idsh,
                        descripcion: result.descripcion ? result.descripcion : '',
                        tipo_activo: result.tipo_activo ? result.tipo_activo : '',
                        transaccion: result.transaccion ? result.transaccion : '',
                        grupo_producto: result.grupo_producto ? result.grupo_producto : '',
                        tipo_chequeo: result.tipo_chequeo ? result.tipo_chequeo : '',
                        carga: result.carga ? result.carga : '',
                        tipo_producto: result.tipo_producto ? result.tipo_producto : '',
                        adp: result.adp ? result.adp : '',
                        alq: result.alq ? result.alq : '',
                        Paginas: conteoPagina
                    });
                });
            }          

            /* let res = RespuestaQuery.asMappedResults();
            let conteoPagina = Math.ceil(res.count / LONGITUD_PAGINA);

            if (!PaginaId || PaginaId == '' || PaginaId < 0) {
                PaginaId = 0;
            }

            log.debug("res: ", res);
          log.debug("conteoPagina: ", conteoPagina);

            if (res.count != 0 && PaginaId < conteoPagina){
                let BusquedaResultado = res.fetch({index: PaginaId});

                BusquedaResultado.data.forEach(function (result) {
                  log.debug("result: ", result);
                    Resultado.push({
                        idns: result.getValue("IdNs"),
                        idsh: result.getValue("IdSH"),
                        descripcion: result.getValue("Descripcion"),
                        tipo_activo: result.getValue("tipo_activo"),
                        transaccion: result.getValue("transaccion"),
                        grupo_producto: result.getValue("grupo_producto"),
                        tipo_chequeo: result.getValue("tipo_chequeo"),
                        carga: result.getValue("Carga"),
                        tipo_producto: result.getValue("tipo_producto"),
                        Paginas: conteoPagina
                    });
                });
            } */

            if (Resultado.length == 0){
                  Resultado.push({
                    idns : '',
                    idsh : '',
                    descripcion : '',
                    tipo_activo : '',
                    transaccion : '',
                    grupo_producto : '',
                    tipo_chequeo : '',
                    carga : '',
                    tipo_producto : '',
                    adp: '',
                    alq: '',
                    Paginas: 0
                });
            }


            return Resultado;
        } catch (error) {
                log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaItemsGeneral)';
        }
    }

    function ConsultaEmpleado(IdEjecutiva, Criterio, Ciudad){
        try{
            
            let Resultado = [];
            let Filtro = [["isinactive","anyof","F"], "AND", ["subsidiary","ANYOF",GlobalSubsidiaria]];

            if (IdEjecutiva) {
              Filtro.push("AND");
              Filtro.push(["internalid","is",Number(IdEjecutiva)]);
            } 
            if (Ciudad) {
              Filtro.push("AND");
              Filtro.push(["location","is",Number(Ciudad)]);
            } 
            if (Criterio) {
              Filtro.push("AND");
              Filtro.push(["altname","contains",Criterio]);
            } 

            let Busqueda = search.create({
                type: "employee",
                filters: Filtro,
                columns:
                [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "entityid", label: "Codigo"}),
                    search.createColumn({name: "altname", label: "Nombre"}),
                    search.createColumn({name: "class", label: "Clase"}),
                    search.createColumn({name: "location", label: "Ciudad"}),
                    search.createColumn({name: "issalesrep", label: "RepresentanteVentas"}),
                    search.createColumn({name: "custentity_ec_numero_registro", label: "Identificacion"}),
                    search.createColumn({name: "firstname", label: "Identificacion"}),
                    search.createColumn({name: "department", label: "departmento"}) 
                ]
            });

            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);

            for (let i in ResConsulta)  {
              Resultado.push({
                Id : ResConsulta[i].getValue({name: 'internalid'}),
                Codigo : ResConsulta[i].getValue({name: 'entityid'}) ? ResConsulta[i].getValue({name: 'entityid'}) : '',
                Nombre : ResConsulta[i].getValue({name: 'altname'}) ? ResConsulta[i].getValue({name: 'altname'}) : '',
                IdClase : ResConsulta[i].getValue({name: 'class'}) ? ResConsulta[i].getValue({name: 'class'}) : '0',
                Clase : ResConsulta[i].getText({name: 'class'}) ? ResConsulta[i].getText({name: 'class'}): '.',
                Oficina : ResConsulta[i].getText({name: 'location'}) ? ResConsulta[i].getText({name: 'location'}): '.',
                IdOficina : ResConsulta[i].getValue({name: 'location'}) ? ResConsulta[i].getValue({name: 'location'}): '0',
                Ejecutiva : ResConsulta[i].getValue({name: 'issalesrep'}) ? ResConsulta[i].getValue({name: 'issalesrep'}): '',
                Identificacion : ResConsulta[i].getValue({name: 'custentity_ec_numero_registro'}) ? ResConsulta[i].getValue({name: 'custentity_ec_numero_registro'}) : '',              
                IdDepartamento : ResConsulta[i].getValue({name: 'department'}) ? ResConsulta[i].getValue({name: 'department'}) : '0'
             
              });
            }

            if (ResConsulta.length == 0 && OrigenConsulta == "SQL"){
                Resultado.push({
                    Id: '',
                    Codigo: '',
                    Nombre: '',
                    IdClase: '0',
                    Clase: '.',
                    Oficina: '.',
                    IdOficina: '0',
                    Ejecutiva: '',
                    Identificacion: '',
                    IdDepartamento: '0'
                });
            }

            return Resultado;

        }catch (error) {
                log.error('error', error);
                return JSON.stringify({error: error.message});
                //return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaEjecutiva)';
        }
    }
   
    function EjecutaQuery(Entidad) { 
        try{
            let resultado = null;
            log.error('post: ', Entidad);
          
            let ResultQuery = query.runSuiteQL({
              query: `${Entidad}`
            });

            let res = ResultQuery.asMappedResults();

            if (res.length > 0) {
                resultado = res;
            } else {
                resultado = { error: 'no data' };
            }

            return JSON.stringify({
                results: resultado
            });
         
        } catch (error) {
                log.error('error', error.message);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (EjecutaQuery)';
        }
   }

   function _post(context) {
        try{
          log.debug("context", context);
            let ResultadoConsulta = [];
            let Opcion = context.entidad;

            if (typeof context.tabla != 'undefined') {
                if (context.tabla.length != 0) {
                    Opcion = 'QUERY';
                }
            }
          
            switch (Opcion){
                case "":
                   ResultadoConsulta = ConsultaLibre(context.query_);
                   break;
                case "QUERY":
                   ResultadoConsulta = EjecutaQuery(context.tabla);
                   break;
                case "ITEM":
                    if (typeof context.iditemns != 'undefined') {
                        if (context.iditemns.length != 0) {
                            IdItemNs = context.iditemns;
                        }
                    }

                    if (typeof context.iditemsh != 'undefined') {
                        if (context.iditemsh.length != 0) {
                            IdItemSh = context.iditemsh;
                        }
                    }

                    ResultadoConsulta = ConsultaItemsParametros(IdItemNs, IdItemSh);
                    break;

                case "PROMO_DA":
                    ResultadoConsulta = InsertaRegistroRelacionPromoDa(context.nombre, context.codpromo, context.descripcionpromo, context.descripcionitem, context.tipoitemda, context.tipocartera, context.valoritem, context.valorpromocion, context.valorcuota, context.diacorte, context.iditem, context.iditemns);
                    break;
                
            }
            return ResultadoConsulta;
        } catch (error) {
            log.error('error', error.message);
            return 'id:400, No se pudo insertar el registro. Error controlado.';
        }        
    }

    function ConsultaSupervisorEmpleado(IdEmpleado){ //20260706
        try{
            let Resultado = []; 
            let condicion ="";           

          	condicion = " AND  ee.id = " + IdEmpleado.trim()
                  
      
            let sql = query.runSuiteQL({
                query: `SELECT ee.id, ee.externalid CodEmpleado,
                                concat(concat(ee.firstname, ' '), ee.lastname) Ejecutiva, 
                                nvl((
                                    select 	concat(concat(j.firstname, ' ') ,j.lastname)
                                    from employee j
                                    where ee.supervisor = j.id
                                ),'') Supervisor,
                                ee.supervisor IdJefe, ee.subsidiary
					FROM employee ee   
					WHERE 1=1
                      ${condicion}`
            }); 

            
            let res = sql.asMappedResults();
            log.debug("res ", res);
            
            res = res.filter(item => {
 
                if (item.subsidiary != GlobalSubsidiaria) {
                  return false;
                }
                return true;
            });
           
            let resfiltrada = res;            
          
            //Resultado = resfiltrada;
            Resultado = resfiltrada.map(item => { delete item.subsidiary; return item; });
                                 
            if (Resultado.length == 0 && OrigenConsulta == "SQL"){
                  Resultado.push({
                    id : '', 
                    codempleado : '',
                    ejecutiva : '',
                    supervisor : '',
                    idjefe : ''
                });
            }
           
            return Resultado; 
          
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaNivelPrecioItem)';
        }
    }   

    function ConsultaItemsParametros(idns, idsh){
        try {
                let Resultado = [];
                let condicion = '';
                let Final = [];

                if (idns != 0){
                   condicion = " and it.id = " + idns;  
                }

                if (idsh != 0){
                   condicion = condicion + " and it.itemid = " + idsh; 
                }

          log.debug("condicion: ", condicion);

                let CadenaQuery = query.runSuiteQL({
                    query:  `   SELECT 	IT.ID id_ns,
                                        IT.itemid id_sh,
                                        IT.displayname descripcion,
                                        IT.createddate fecha_creacion,
                                        IT.saleunit, 
                                        IT.unitstype,
                                        IT.subsidiary,
                                        REL.custrecord_ht_pp_parametrizacionid item, 
                                        P.custrecord_ht_pp_code cod_parametro, 	
                                        P.custrecord_ht_pp_descrip desc_parametro,
                                        P.ID id_parametro, 
                                        VV.custrecord_ht_pp_codigo cod_valor,
                                        VV.custrecord_ht_pp_descripcion desc_valor,
                                        VV.ID ID_VALOR, it.itemtype,
                                        CASE 
                                            WHEN it.itemtype = 'Assembly' THEN  'serializedassemblyitem' 
                                            WHEN it.itemtype = 'Service' THEN 'serviceitem'
                                            WHEN it.itemtype = 'InvtPart' THEN 'serializedinventoryitem'
                                            ELSE '' END entidad 
                                FROM 	item IT,
                                        customrecord_ht_pp_main_param_prod rel,
                                        CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU P,
                                        CUSTOMRECORD_HT_CR_PP_VALORES VV
                                WHERE 	IT.ID = REL.custrecord_ht_pp_parametrizacionid
                                AND 	rel.custrecord_ht_pp_parametrizacion_rela = P.id
                                AND 	REL.custrecord_ht_pp_parametrizacion_valor = VV.ID
                                AND 	P.isinactive = 'F'
                                AND 	REL.isinactive = 'F'
                                AND 	P.isinactive = 'F'
                                AND 	VV.isinactive = 'F'
                                and		it.itemtype in ('Assembly','Service','InvtPart')
                                ${condicion}
                                ORDER BY IT.ID, P.custrecord_ht_pp_code, VV.custrecord_ht_pp_codigo
                                `
                });

                let Detalle = CadenaQuery.asMappedResults();

                Detalle = Detalle.filter(item => {

                    if (String(item.subsidiary) != String(GlobalSubsidiaria)) {
                        return false;
                    }
                    return true;
                });

                let sec = 0;
                let PrecioItem = 0;
          
                Detalle.forEach(Fila => {
                    if (sec == 0){
                        const lookup = search.lookupFields({
                            type: search.Type.ITEM,
                            id: Fila.id_ns,
                            columns: ['recordtype']
                        });
                      
                        // let ObjItem = record.load({ type: Fila.entidad, id: Fila.id_ns, isDynamic: true });
                        let ObjItem = record.load({ type: lookup.recordtype, id: Fila.id_ns, isDynamic: true });
                        let objPrecio = ObjItem.getLineCount({sublistId: "price1"});
                        if (objPrecio > 0) {
                            for (let i = 0; i < objPrecio; i++){
                                if (ObjItem.getSublistValue({sublistId: 'price1', fieldId:'pricelevelname', line: i}) == "PVP"){
                                    PrecioItem= ObjItem.getSublistValue({sublistId: 'price1', fieldId: 'price_1_', line:i});
                                    PrecioItem = parseFloat(PrecioItem);
                                    if (isNaN(PrecioItem)) {
                                      PrecioItem = 0;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    Resultado.push({
                        idns: Fila.id_ns,
                        idsh: Fila.id_sh,
                        descripcion: Fila.descripcion ? Fila.descripcion: '',
                        fecha_creacion: Fila.fecha_creacion,
                        item: Fila.item, 
                        cod_parametro: Fila.cod_parametro, 
                        desc_parametro: Fila.desc_parametro,
                        id_parametro: Fila.id_parametro, 
                        cod_valor: Fila.cod_valor,
                        desc_valor: Fila.desc_valor,
                        id_valor: Fila.id_valor,
                        itemtype: Fila.itemtype,
                        precio: PrecioItem,
                        empresa: Fila.subsidiary
                    });
                  sec =  sec + 1;
                });

                Final = GeneraCabeceraDetalle(Resultado);

                return Final[0];
        } catch (error) {
                log.error('error', error);
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaItemsParametros)';
        }
    }

    const GeneraCabeceraDetalle = (data) => {
        const Cabecera = data.length > 0 ? { ...data[0] } : {};

        delete Cabecera.cod_parametro;
        delete Cabecera.desc_parametro;
        delete Cabecera.id_parametro;
        delete Cabecera.cod_valor;
        delete Cabecera.desc_valor;
        delete Cabecera.id_valor;
        
        Cabecera.Detalleitems = data
            //.filter(item => item.Secuencia !== "0")
            .map(item => {
                return {
                    cod_parametro: item.cod_parametro, 
                    desc_parametro: item.desc_parametro,
                    id_parametro: item.id_parametro, 
                    cod_valor: item.cod_valor,
                    desc_valor: item.desc_valor,
                    id_valor: item.id_valor
                }
            });
        return [Cabecera];
    }

    //AQUI PROMO 20260623
   function InsertaRegistroRelacionPromoDa(Nombre, CodPromo, DescripcionPromo, DescripcionItem, TipoItemDa, TipoCartera, ValorItem, ValorPromocion, ValorCuota, DiaCorte, IdItem, IdItemNs)
    {
        try {

                let condicion = "";
                let IdPromocionNueva = 0;
                let PromocionNueva = [];
                let Resultado = [];

                if ((Nombre == '') || (Nombre == 0)) 
                {
                    return 'id:400, Ingrese Nombre de la Promoción.'
                }
                if (CodPromo == '')
                {
                    return 'id:400, Indique el código de la promoción.'
                }
                if (DescripcionPromo == '')
                {
                    return 'id:400, Ingrese Descripcion de Promoción.'
                }

                condicion = " p.custrecord_ht_prom_da_codigo = '" + CodPromo + "' and p.custrecord_ht_prom_da_codigo_item  = " + IdItem ;

                let sql = query.runSuiteQL({
                    query: `select 	p.id
                            FROM    customrecordec_detalle_promociones_da p
                            WHERE   ${condicion}`
                });
          
                let res = sql.asMappedResults();
                Resultado = res;
            
                if (Resultado.length > 0){
                    return 'id:400, Ya existe relación de promoción e ítem'
                }

                let busTabla = search.create({
                    type: 'item',
                    filters: [["itemid","is",IdItem], "AND",["subsidiary","anyof",GlobalSubsidiaria]],
                    columns: [
                    search.createColumn({name: "internalid", label: "Id"}),
                    search.createColumn({name: "name", label: "Descripcion"}),
                    ]
                });

                let resultados = busTabla.run().getRange({
                    start: 0,
                    end: 1
                });

                if (resultados.length == 0) {
                    return 'Item no está creado en Netsuite, verifique por favor.'
                } 
          
                if ((IdItemNs == 0) || (IdItemNs == '') || (IdItemNs == undefined))
                {
                  IdItemNs = resultados[0].getValue({name: 'internalid'});
                }

                let objPromocion = record.create({ type: 'customrecordec_detalle_promociones_da', isDynamic: true});
                    objPromocion.setValue({ fieldId: 'name', value: Nombre });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_codigo', value: CodPromo });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_descripcion', value: DescripcionPromo });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_descripcion_item', value: DescripcionItem });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_tipo_item', value: TipoItemDa });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_tipo_cartera', value: TipoCartera });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_valor_item', value: ValorItem });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_valor_promo', value: ValorPromocion });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_valor_cuota', value: ValorCuota });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_dia_corte', value: DiaCorte });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_codigo_item', value: IdItem });
                    objPromocion.setValue({ fieldId: 'custrecord_ht_prom_da_cod_item_ns', value: IdItemNs });

                    IdPromocionNueva = objPromocion.save({ ignoreMandatoryFields: true });          
                    PromocionNueva.push({
                        IdPromocionNueva: IdPromocionNueva
                    });    

                    return {
                        results: PromocionNueva
                    }             


        }catch (error) {
            log.error('error', error);
            return 'id:400, No se pudo insertar el registro (InsertaRegistroRelacionPromoDa)';
        }
    }

   
    function _put() {
        //put
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