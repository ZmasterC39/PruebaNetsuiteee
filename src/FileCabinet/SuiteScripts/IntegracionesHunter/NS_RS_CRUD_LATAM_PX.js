/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log',
 'N/search',
 'N/record',
 'N/https',
 'N/url',
 'N/format',
 'N/file',
 'N/query',
 'N/runtime',
 './HU_TS_ScriptPlataformas_controller'
        
], 

//,SuiteScripts > IntegracionesHunter > UtilsGeneral
//SuiteScripts > TS NET Scripts > Main > constant
// '../../Impulso Plataformas/Controller/TS_ScriptPlataformas_controller'
//, _platformController


 function(log, search, record, https, url, format, file, query , runtime,_platformController)  {
    // TODO: Acciones
    const PROD = 'prod';
    //const CONSULTA = 'consulta';
    const DESA = 'desa';
    //const URLPX = 'https://apipx.24hm.net/API_PX/WSPX.asmx'; 
    //const URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; 

    const OPERACION_ORDEN_INSTALACION = "001"; // Instalación
    const OPERACION_ORDEN_DESINSTALACION = "002"; // Desinstalación
    const OPERACION_ORDEN_REINSTALACION = "003";
    const OPERACION_ORDEN_RENOVACION = "004" // Renovación
    const OPERACION_ORDEN_MODIFICACION = "005";
    const OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO = "006";//
    const OPERACION_ORDEN_CHEQUEO_COMPONENTES = "007";
    const OPERACION_ORDEN_VENTA_SEGUROS = "008";//
    const OPERACION_ORDEN_RENOVACION_SEGUROS = "009";
    const OPERACION_ORDEN_CAMBIO_PROPIETARIO = "010";
    const OPERACION_ORDEN_RECONEXION = "011";
    const OPERACION_ORDEN_CHEQUEO_OTROS_PRODUCTOS = "013";
    const OPERACION_ORDEN_VENTA_SERVICIOS = "015";
    const OPERACION_ORDEN_ACTUALIZACION_DATOS_PROPIETARIOS = "016";
    const OPERACION_ORDEN_ACTUALIZACION_ESTADOS = "017"; //
    const OPERACION_ORDEN_REGISTRAR_CANAL = "018";
    const OPERACION_ORDEN_INSTALACION_COMPONENTES = "019";

    const OPERACION_ORDEN_ACTIVADOS = "051" // OPERACION_ORDEN_ACTIVADOS

    const usuario ="NetSuite";
    const clave="NS*25#01@%j?i";
    var URLPX = "";

    
    // const NACIONALIDAD = "EC";
    // const subsidiaria=2;
    
    function _get(context) {
        try {
            log.debug('Result', 'Hola Mundo..GET.');
        } catch (error) {
            log.error('Error-GET', error)
        }

    }

    function _post(context) {
       
        try {
            log.debug('Result', 'Hola Mundo..POST.');
            //CONSUMIR TOKEN
            let PxAdmin = {};
            setAuthenticationValues(PxAdmin);
            setEmptyFields(PxAdmin);
            accion = context?.accion?.toLowerCase() || null;

            log.debug('Result', accion);
            switch (accion) 
            {
                // TODO: CHEQUEO
                case PROD:
                    URLPX = 'https://tristan.24hm.net/API_PX_LATAM/WSPX.asmx'; 
                    respuesta= setEstructuraDatos(context, PxAdmin)
                    break;


                // TODO: PRUEBAS
                case DESA:
                    URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx'; 
                    respuesta=  setEstructuraDatos(context, PxAdmin)
                     //var valor = conexionPX(PxAdmin, URLPX);
                    break;
                // TODO: Default
                default:
                    respuesta = { id: 0, mensaje: "Verifique la accion" };
                break;
                
            }
            return JSON.stringify({ results: respuesta });
            //CONSUMIR LOS DATOS

            //ACCION DEL PRODUCTO

            //VALIDAR QUE ACCION DEBE DE EJECUTAR

            //CADENA DE CONEXION

           
            
           
            
           

            //var valor = conexionPX(PxAdmin);

            //AGREGAR LOS DATOS EN FORMATO XML

            //ENVIAR LA TRAZA CON LA NACIONALIDAD

            //OBTENER RESPUESTA
            //return valor;
            //return PxAdmin;
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _put(context) {
        try {
            log.debug('Result', 'Hola Mundo..put.');
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _delete(context) {
        try {
            log.debug('Result', 'Hola Mundo..delete.');
        } catch (error) {
            log.error('Error', error);
        }
    }

    // const respuesta1 = await (fetch('https://tyr.24hm.net/API_PX/WSPX.asmx?op-InsertaOrdenV2`,{
    //     method: 'POST',

    // })
    // )


    
// const respuesta = await (fetch('https://tyr. 24hm.net/API_PX/WSPX.asmx?op-InsertaOrdenV2`, method: 'POST',
// headers: {
    // 'Content-type': 'text/xml',
// 'SOAPAction': 'http://tempuri.org/InsertaOrdenV2'
// },
// body: datosMensaje,
// agent: new https.Agent({
// rejectUnauthorized: false,
// })
// })

    const setEstructuraDatos = (context, PxAdmin) => {
        //LLEGAR LOS DATOS QUE SE ENVIAN

        const fecha = new Date();
        log.error("Body PX fecha", fecha);
        const hora = String(fecha.getHours()).padStart(2, '0'); // Hora (0-23)
        const minutos = String(fecha.getMinutes()).padStart(2, '0'); // Minutos (0-59)
        const segundos = String(fecha.getSeconds()).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0'); // Día del mes (1-31)
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');  // Mes (0-11) -> Se suma 1 para obtener 1-12
        const anio = fecha.getFullYear();

        // Concatenamos la fecha en una variable
        const orden = `${anio}${mes}${dia}${hora}${minutos}`;

        log.error("Body PX orden", orden);
        log.debug("runtime.getCurrentUser()", runtime.getCurrentUser());

        let subsidiariaEjecucion = runtime.getCurrentUser().subsidiary;

        log.error("...........subsidiary................", subsidiariaEjecucion);
        

        let  subsidiaria;
        //let  NACIONALIDAD;   
        // const subsidiaria=2;

        // if (subsidiaria==2)
        // { NACIONALIDAD="EC" }
        // if (subsidiaria==3)
        // { NACIONALIDAD="PE" }

         // const NACIONALIDAD = "EC";
    // const subsidiaria=2;

        //let response = { status: true, mensaje: '' };

        // log.debug("..........Parametrizacion..............", context.idtrabajo);  
        // log.debug("..........Parametrizacion..............", subsidiaria);  
        // log.debug("..........Parametrizacion..............", context.idorden);  


        //let sqlitem = 'select custrecord_ht_ot_item from customrecord_ht_record_ordentrabajo where id= ?  and custrecord_ht_ot_subsidiary= ?  and custrecord_ht_ot_orden_servicio = ? '
        //let resultSetitem  = query.runSuiteQL({ query: sqlitem, params: [context.idtrabajo, subsidiaria, context.idorden] });
        let sqlitem;
        let resultSetitem;
        let resultsitem;
        if (context.idtrabajo=="0"){
            sqlitem = "SELECT b.item  FROM Transaction  A ,TransactionLine B" + 
                      " WHERE 1=1  AND A.TYPE = 'SalesOrd'" + 
                      " AND A.ID= ? AND A.ID = B.TRANSACTION" + 
                      " AND B.MAINLINE='F'" + 
                      " AND B.TAXLINE ='F'" +
                      " AND B.subsidiary = ? "
            resultSetitem  = query.runSuiteQL({ query: sqlitem, params: [context.idorden, subsidiariaEjecucion ] });    
            resultsitem = resultSetitem .asMappedResults();
            //results5.filter(ordenVenta.getValue('subsidiary'))
            if (resultsitem .length > 0) {
                item = resultsitem[0]['item'];
                //item = resultsitem[1]['item'];
            } else {
                item = "";
            }    
        } else {

            sqlitem = 'select custrecord_ht_ot_item from customrecord_ht_record_ordentrabajo where id= ?   and custrecord_ht_ot_orden_servicio = ?  AND custrecord_ht_ot_subsidiary= ? '
            resultSetitem  = query.runSuiteQL({ query: sqlitem, params: [context.idtrabajo, context.idorden, subsidiariaEjecucion] });  
            resultsitem = resultSetitem .asMappedResults();
            //results5.filter(ordenVenta.getValue('subsidiary'))
            if (resultsitem .length > 0) {
                item = resultsitem[0]['custrecord_ht_ot_item'];
            } else {
                item = "";
            }          
        }

        log.debug("..........item..............", item);  
        let ADP="";
        let resultado ="";
        if (context.iddispositivo !="0" && context.idorden =="0" ){
            ADP =   "017"
        } else  if (context.iddispositivo =="0" && context.idorden =="0" ){
            ADP =   "018"
        } else {
            //log.debug(".......item.................", item);
            resultado = obtenerParametrizacionItem(item, ['ADP', 'PPS', 'FAM', 'GPG', 'IGS']);

            log.debug("..........Parametrizacion..............", resultado);  
            ADP = resultado[0]?.Valor ? resultado[0].Valor : "";                   
        } 

        let PPS = resultado[1]?.Valor ? resultado[1].Valor : "";
        let FAM = resultado[2]?.Valor ? resultado[2].Valor : "";
        let GPG = resultado[3]?.Valor ? resultado[3].Valor : "";
        let IGS = resultado[4]?.Valor ? resultado[4].Valor : "";

        log.debug("..........ADP..............", ADP);  
        log.debug("..........PPS..............", PPS);
        log.debug("...........FAM.............", FAM);
        log.debug("...........GPG.............", GPG);
        log.debug("...........IGS.............", IGS);

        //ADP="015";
        // FAM="GX";
        var response = "";
        //log.debug("........................", _platformController);
        //if (GPG ==="S" &&  IGS ==="S") {
        if (ADP == OPERACION_ORDEN_INSTALACION) {
            if (subsidiariaEjecucion==2){

                response = _platformController.envioPXInstalacionDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
       
            } else {

                response = _platformController.envioPXInstalacionDispositivoPeru(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
       
            } 
             log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_DESINSTALACION) {
            response = _platformController.envioPXDesinstalacionDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            log.debug('ResponsePX', response);


            

        } else if (ADP == OPERACION_ORDEN_ACTIVADOS) {
            response = _platformController.envioPXInstalacionDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            log.debug('ResponsePX', response);
        

        } else if (ADP == OPERACION_ORDEN_RENOVACION) {
            //--
            if (FAM != ""){
                response = _platformController.envioPXRenovacionDispositivo(context.idorden, subsidiariaEjecucion, URLPX, FAM); // id Orden de Trabajo
            } else {
                response ="No envia la Familia del producto";
            }
          
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_CAMBIO_PROPIETARIO) {
            response = _platformController.envioPXCambioPropietario(context.idorden, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_ACTUALIZACION_DATOS_PROPIETARIOS) {
            //--
            response = _platformController.envioPXActualizacionDatosPropietario(context.idorden, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_REINSTALACION) {
            //--
            response = _platformController.envioPXReinstalacionDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_MODIFICACION) {
            //--
            response = _platformController.envioPXModificacionDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
             //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO) {
            response = _platformController.envioPXMantenimientoChequeoDispositivo(context.idtrabajo, subsidiariaEjecucion, URLPX, ""); // id Orden de Trabajo
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
            response = _platformController.envioPXChequeoComponentes(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_VENTA_SEGUROS) {
            //--
            if (FAM != ""){
                response = _platformController.envioPXVentaSeguros(context.idorden, subsidiariaEjecucion, URLPX, FAM); // id Orden de Trabajo
            } else {
                response ="No envia la Familia del producto";
            }
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_RENOVACION_SEGUROS) {
            //--
            if (FAM != ""){
                response = _platformController.envioPXRenovacionSeguro(context.idorden, subsidiariaEjecucion, URLPX, FAM); // id Orden de Trabajo
            } else {
                response ="No envia la Familia del producto";
            }
           
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_RECONEXION) {
            response = _platformController.envioPXInstalacionReconexion(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_CHEQUEO_OTROS_PRODUCTOS) {
            //--
            response = _platformController.envioPXChequeoOtrosProductos(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //--
            log.debug('ResponsePX', response);
        
        } else if (ADP == OPERACION_ORDEN_VENTA_SERVICIOS) {
            //--
            response = _platformController.envioPXVentaServicios(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //-
            log.debug('ResponsePX', response);
                    
        } else if (ADP == OPERACION_ORDEN_ACTUALIZACION_ESTADOS) {
            //--
            response = _platformController.envioPXActualizacionEstado(context.iddispositivo, subsidiariaEjecucion, URLPX, context.idbien, "0", context.estado, context.familia); // id Orden de Trabajo
          //--
            log.debug('ResponsePX', response);
                 
        } else if (ADP == OPERACION_ORDEN_REGISTRAR_CANAL) {
            //--
            response = _platformController.envioPXRegistrarCanal(context.idbien, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //--
            log.debug('ResponsePX', response);

        } else if (ADP == OPERACION_ORDEN_INSTALACION_COMPONENTES) {
            //--
            //response = _platformController.envioPXInstalacionComponentes(context.idtrabajo, subsidiariaEjecucion, URLPX); // id Orden de Trabajo
            //--
            log.debug('ResponsePX', response);
        }   
      
         
        //-envioPXInstalacionDispositivo(context.idtrabajo, PxAdmin)
        return response ?  response : "No";
       



        //datos generales para consulta
        //let { vehiculo, Propietario, PropietarioMonitoreo, NuevoPropietario } = obtenerCamposOrdenServicio(ordenServicioId);
        //let { vehiculo, Propietario, PropietarioMonitoreo } = obtenerCamposOrdenServicio(context.idorden);
       // let { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, pxadminfinalizacion, Aseguradora, Concesionario, Financiera, Convenio, Servicios, salesOrderId } = obtenerCamposOrdenTrabajo(ordenTrabajoId);
          
        //let { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, pxadminfinalizacion, Aseguradora, Concesionario, Financiera, Convenio, Servicios, salesOrderId } = obtenerCamposOrdenTrabajo(context.idtrabajo);
    
        //datos de cabecera
        //setSalesOrderValues(PxAdmin, context.idorden);
        // PxAdmin["UsuarioIngreso"] = "WSLTM202502031121";
        // PxAdmin["NumeroOrden"] = orden;
        // PxAdmin["NombreEjecutiva"] = "EJECUTIVA LATAM";
        // PxAdmin["Ciudad"] = "CIUDAD LATAM";
        // PxAdmin["Sucursal"] = "SUCURSAL LATAM";
        // PxAdmin["EstadoCartera"] = "ESTADO CARTERA LATAM";
        // PxAdmin["FechaInicioCobertura"] = "2025-02-03";
        // PxAdmin["FechaFinCobertura"] = "2027-02-04";

        // nodo vehiculo
       // setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_INSTALACION);
        // PxAdmin["Placa"] = "VIRTUAL-LATAM-202502031121";
        // PxAdmin["IdMarca"] = "000";
        // PxAdmin["DescMarca"] = "NO DEFINIDO";
        // PxAdmin["IdModelo"] = "000";
        // PxAdmin["DescModelo"] = "NO DEFINIDO";
        // PxAdmin["CodigoVehiculo"] = "WSLTM202502031121";
        // PxAdmin["Chasis"] = "0";
        // PxAdmin["Motor"] = "0";
        // PxAdmin["Color"] = "AMARILLO";
        // PxAdmin["Anio"] = "2024";
        // PxAdmin["Tipo"] = "TERRESTRE";


        //setPropietarioValues(PxAdmin, Propietario, OPERACION_ORDEN_INSTALACION);
        // PxAdmin["IdentificadorPropietario"] = "0918485533";
        // PxAdmin["NombrePropietario"] = "ERWIN GUSTAVO";
        // PxAdmin["ApellidosPropietario"] = "ESCALANTE RAMIREZ";
        // PxAdmin["DireccionPropietario"] = "ALBORADA 11AVA ETAPA";
        // PxAdmin["ConvencionalPropietario"] = "046011450";
        // PxAdmin["CelularPropietario"] = "0998679101";
        // PxAdmin["EmailPropietario"] = "ERGU.ESCALANTE@GMAIL.COM";

        //setMonitoreoValues(PxAdmin, PropietarioMonitoreo, OPERACION_ORDEN_INSTALACION);
        // PxAdmin["IdentificadorMonitorea"] = "0918485533";
        // PxAdmin["NombreMonitorea"] = "ERWIN GUSTAVO";
        // PxAdmin["ApellidosMonitorea"] = "ESCALANTE RAMIREZ";
        // PxAdmin["DireccionMonitorea"] = "ALBORADA 11AVA ETAPA";
        // PxAdmin["ConvencionalMonitorea"] = "046011450";
        // PxAdmin["CelularMonitorea"] = "0998679101";
        // PxAdmin["EmailMonitorea"] = "ERGU.ESCALANTE@GMAIL.COM";


            

        // // FOR QUE BARRA LA CANTIDAD DE REGISTROS Y QUE ENVIEN EL XML DE LOS DISPOSITIVOS
        /* <ServiciosInstalados><Servicio><CodServicio>100</CodServicio><DescripcionServicio>APERTURA DE SEGUROS</DescripcionServicio><FechaInicioServicio>2025-02-03</FechaInicioServicio><FechaFinServicio>2026-02-03</FechaFinServicio><EstadoServicio>ACTIVO</EstadoServicio></Servicio><Servicio><CodServicio>200</CodServicio><DescripcionServicio>PARALIZACIÓN DE VEHÍCULO</DescripcionServicio><FechaInicioServicio>2025-02-03</FechaInicioServicio><FechaFinServicio>2026-02-03</FechaFinServicio><EstadoServicio>ACTIVO</EstadoServicio></Servicio></ServiciosInstalados> */

        // setServicioEmptyFields(PxAdmin,"100","APERTURA DE SEGUROS","2025-02-03","2026-02-03","ACTIVO")
        // PxAdmin["OperacionOrden"] = OPERACION_ORDEN_INSTALACION;
        // //log.debug('Result', setAuthenticationValues);
        // log.error("Body PX Venta Servicios", PxAdmin);

        

    
        

        // PxAdmin["Vid"] = "WSLTM202502031121";
        // PxAdmin["IdProducto"] = "00";
        // PxAdmin["DescProducto"] = "NO DEFINIDO";
        // PxAdmin["CodMarcaDispositivo"] = "000";
        // PxAdmin["MarcaDispositivo"] = "NO DEFINIDO";
        // PxAdmin["CodModeloDispositivo"] = "000";
        // PxAdmin["ModeloDispositivo"] = "NO DEFINIDO";
        // PxAdmin["Sn"] = "0";
        // PxAdmin["Imei"] = "0";
        // PxAdmin["NumeroCamaras"] = "0";
        // PxAdmin["DireccionMac"] = "0.0.0.0";
        // PxAdmin["Icc"] = "0";
        // PxAdmin["NumeroCelular"] = "0";
        // PxAdmin["Operadora"] = "TELEFONICA";
        // PxAdmin["EstadoSim"] = "ACTIVO";
        // //PxAdmin["ServiciosInstalados"] = "";
        // PxAdmin["OperacionDispositivo"] = "I";
        // PxAdmin["VidAnterior"] = "";

    
    

        // PxAdmin["IdentificadorConcesionario"] = "9980000000006";
        // PxAdmin["RazonSocialConcesionario"] = "SIN CONCESIONARIO";
        // PxAdmin["DireccionConcesionario"] = "";
        // PxAdmin["ConvencionalConcesionario"] = "0";
        // PxAdmin["CelularConcesionario"] = "";
        // PxAdmin["EmailConcesionario"] = "";
        



        
        // PxAdmin["IdentificadorFinanciera"] = "9980000000004";
        // PxAdmin["RazonSocialFinanciera"] = "SIN BANCO/FINANCIERA";
        // PxAdmin["DireccionFinanciera"] = "";
        // PxAdmin["ConvencionalFinanciera"] = "0";
        // PxAdmin["CelularFinanciera"] = "0";
        // PxAdmin["EmailFinanciera"] = "";


        // PxAdmin["IdentificadorAseguradora"] = "9980000000005";
        // PxAdmin["RazonSocialAseguradora"] = "SIN ASEGURADORA";
        // PxAdmin["DireccionAseguradora"] = "ECUADOR CARSEG";
        // PxAdmin["ConvencionalAseguradora"] = "0";
        // PxAdmin["CelularAseguradora"] = "0";
        // PxAdmin["EmailAseguradora"] = "";
        //-return PxAdmin
    }

    const envioPXInstalacionDispositivo = (ordenTrabajoId, PxAdmin) => {
        let { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, pxadminfinalizacion, Aseguradora, Concesionario, Financiera, Convenio, Servicios, salesOrderId, Location, Ejecutiva } = obtenerCamposOrdenTrabajo(ordenTrabajoId);
        // if (!pxadminfinalizacion) {
        //     let registroImpulsoPlataforma = crearRegistroImpulsoPlataforma(ordenTrabajoId, null, "enviado", "PX");
            //let PxAdmin = {};
            setAuthenticationValues(PxAdmin);
            setEmptyFields(PxAdmin);

            // log.error("Aseguradora........................", Aseguradora);
            // log.error("Concesionario........................", Concesionario);
            // log.error("Financiera........................", Financiera);
            // log.error("Convenio........................", Convenio);


            setSalesOrderValues(PxAdmin, salesOrderId, vehiculo,Cobertura, Location, Ejecutiva);
            PxAdmin["OperacionOrden"] = OPERACION_ORDEN_INSTALACION;
            PxAdmin["NACIONALIDAD"] = NACIONALIDAD;
            PxAdmin["URLPX"] = URLPX;

            setVehiculoValues(PxAdmin, vehiculo, OPERACION_ORDEN_INSTALACION);
            setDispositivoValues(PxAdmin, Dispositivo, OPERACION_ORDEN_INSTALACION);
            setPropietarioValues(PxAdmin, Propietario, OPERACION_ORDEN_INSTALACION);
            setAseguradoraValues(PxAdmin, Aseguradora, OPERACION_ORDEN_INSTALACION);
            setConcesionarioValues(PxAdmin, Concesionario, OPERACION_ORDEN_INSTALACION);
            setFinancieraValues(PxAdmin, Financiera, OPERACION_ORDEN_INSTALACION);
            setConvenioValues(PxAdmin, Convenio, OPERACION_ORDEN_INSTALACION);
            setMonitoreoValues(PxAdmin, PropietarioMonitoreo, OPERACION_ORDEN_INSTALACION);
           //setCoberturaValues(PxAdmin, Cobertura);

            //log.error("PxAdmin........................", PxAdmin);

            // PxAdmin["ServiciosInstalados"] = Servicios.join("/");
            log.error("Body PX Instalacion Dispositivo", PxAdmin);

            let response = sendPXServer(PxAdmin);
            log.error("Response PX Instalacion Componentes", response.body);

            //var valor = conexionPX(PxAdmin, URLPX);

            log.error(".............................", URLPX);
            // log.error("Response PX Instalacion Dispositivo", response.body);
            // if (response.body == 1) {
            //     // //TODO: cambiar a false para pruebas, solo para validación
            //     let updatePxadmin = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
            //     updatePxadmin.setValue({ fieldId: 'custrecord_ht_ot_pxadminfinalizacion', value: true })
            //     updatePxadmin.save();
            //     pxadminfinalizacion = true;
            //     actualizarRegistroImpulsoPlataforma(registroImpulsoPlataforma, "enviado", response.body);
            // } else {
            //     actualizarRegistroImpulsoPlataforma(registroImpulsoPlataforma, "error", response.body);
            // }
        //}
        // if (!pxadminfinalizacion) {
        //     let updatePxadmin = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        //     updatePxadmin.setValue({ fieldId: 'custrecord_ht_ot_estado', value: 4 })
        //     updatePxadmin.save();
        //     return false;
        // }
        //return true;
    }
    
    const setDispositivoValues = (PxAdmin, Dispositivo, operacionOrden, workOrder) => {
        let idUnidad = Dispositivo["custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_codigo"];
        let descUnidad = Dispositivo["custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip"];
        let idModelo = Dispositivo["custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_codig"];
        let descModelo = Dispositivo["custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr"];

        let idUnidad2 = Dispositivo["custrecord_ht_mc_unidad"];
        let idModelo2 = Dispositivo["custrecord_ht_mc_modelo"];

        // Serie
        // <i> dfernandez 06/12/2024
        //cambio de código dispositivo a vid
        let serie = Dispositivo.custrecord_ht_mc_vid.length ? Dispositivo.custrecord_ht_mc_vid : '';
        let idSerie = serie.length ? serie[0] : '';
        // <f> dfernandez 06/12/2024

        let descOperadora = Dispositivo["custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip"];

        //EstadoSim
        //let Estado = Dispositivo.custrecord_ht_mc_estado[0].text.split(' - ');
        let Estado = Dispositivo.custrecord_ht_mc_estadolodispositivo[0].text.split(' - ');
        let descEstado = Estado.length > 1 ? Estado[1] : '';

        let producto = Dispositivo.producto ? Dispositivo.producto.split(' - ') : "";
        let idProducto = producto.length ? producto[0] : '';
        let descProducto = producto.length > 1 ? producto[1] : '';

        let estadoDispositivo = Dispositivo.custrecord_ht_mc_estadolodispositivo.length ? Dispositivo.custrecord_ht_mc_estadolodispositivo[0].text.split(' - ') : '';
        let idEstadoDispositivo = estadoDispositivo.length ? estadoDispositivo[0] : "";
        //let estadoSim = obtenerEstadoSIM(idEstadoDispositivo);

        // if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
            PxAdmin["IdProducto"] = idProducto.substr(0, 5);
            PxAdmin["DescProducto"] = descProducto;
            // <I> dfernandez 06/12/2024
            // cambio de campo por el id interno del registro de la unidad.
            PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
            // <F> dfernandez 06/12/2024
            PxAdmin["MarcaDispositivo"] = descUnidad;
            // <I> dfernandez 06/12/2024
            // cambio de campo por el id interno del registro del modelo.
            PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
            // <F> dfernandez 06/12/2024
            PxAdmin["ModeloDispositivo"] = descModelo;
            PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
            PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
            PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
            PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
            PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
            PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
            PxAdmin["Operadora"] = descOperadora;
            PxAdmin["EstadoSim"] = 'ACT';
            PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["OperacionDispositivo"] = "D";
        // } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["IdProducto"] = Dispositivo.name.substr(0, 5);
        //     PxAdmin["DescProducto"] = Dispositivo.name;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = descEstado;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_RENOVACION) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["OperacionDispositivo"] = "A";
        // } else if (operacionOrden == OPERACION_ORDEN_MODIFICACION) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = descEstado;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO) {
        //     let estadoSim = obtenerEstadoSIM(idEstadoDispositivo);
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = estadoSim;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = descEstado;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_VENTA_SEGUROS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = descEstado;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_RENOVACION_SEGUROS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["Sn"] = Dispositivo.custrecord_ht_mc_sn;
        //     PxAdmin["Imei"] = Dispositivo.custrecord_ht_mc_imei;
        //     PxAdmin["NumeroCamaras"] = Dispositivo.custrecord_ht_mc_numero_camara.replace(/&/g, '&amp;') || "0";
        //     PxAdmin["DireccionMac"] = Dispositivo.custrecord_ht_mc_macaddress;
        //     PxAdmin["Icc"] = Dispositivo.custrecord_ht_mc_icc;
        //     PxAdmin["NumeroCelular"] = Dispositivo.custrecord_ht_mc_nocelularsim;
        //     PxAdmin["Operadora"] = descOperadora;
        //     PxAdmin["EstadoSim"] = descEstado;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_INSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["OperacionDispositivo"] = "D";
        // } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_OTROS_PRODUCTOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_VENTA_SERVICIOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_ACTUALIZACION_DATOS_PROPIETARIOS) {
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_ACTUALIZACION_ESTADOS) {
        //     PxAdmin["Vid"] = Dispositivo.custrecord_ht_mc_vid;
        //     PxAdmin["IdProducto"] = Dispositivo.name.substr(0, 5);
        //     PxAdmin["DescProducto"] = Dispositivo.name;
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        //     //PxAdmin["EstadoSim"] = Dispositivo.custrecord_ht_mc_estado[0].text.substr(0, 5);
        //     PxAdmin["OperacionDispositivo"] = "A";
        // } else if (operacionOrden == OPERACION_ORDEN_REGISTRAR_CANAL) {
        //     PxAdmin["OperacionDispositivo"] = "I";
        // } else if (operacionOrden == OPERACION_ORDEN_INSTALACION_COMPONENTES) {
        //     PxAdmin["OperacionDispositivo"] = "I";
        //     PxAdmin["CodMarcaDispositivo"] = idUnidad2[0].value;
        //     PxAdmin["MarcaDispositivo"] = descUnidad;
        //     PxAdmin["CodModeloDispositivo"] = idModelo2[0].value;
        //     PxAdmin["ModeloDispositivo"] = descModelo;
        // }
    }

    const setVehiculoValues = (PxAdmin, vehiculo, operacionOrden) => {
        let idMarca = vehiculo["custrecord_ht_bien_marca.custrecord_ht_marca_codigo"] || "";
        let idMarca2 = vehiculo["custrecord_ht_bien_marca"] || "";
        let descMarca = vehiculo["custrecord_ht_bien_marca.custrecord_ht_marca_descripcion"] || "";
        let idModelo = vehiculo["custrecord_ht_bien_modelo.custrecord_ht_mod_codigo"] || "";
        let idModelo2 = vehiculo["custrecord_ht_bien_modelo"] || "";
        let descModelo = vehiculo["custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion"];
        let colorName = vehiculo["custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion"];
        let tipoVehiculo = vehiculo["custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion"];
        
        //if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            //<I> dfernandez 06/12/2024
            //retiro de la lógica de validación S/P, se debe enviar lo que contenga el campo placa
            PxAdmin["Placa"] = vehiculo.custrecord_ht_bien_placa.text;
            //<F> dfernandez 06/12/2024
            PxAdmin["IdMarca"] = idMarca2[0].value; //idMarca;
            PxAdmin["DescMarca"] = descMarca;
            PxAdmin["IdModelo"] = idModelo2[0].value;//idModelo
            PxAdmin["DescModelo"] = descModelo;
            PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
            PxAdmin["Chasis"] = vehiculo.custrecord_ht_bien_chasis;
            PxAdmin["Motor"] = vehiculo.custrecord_ht_bien_motor;
            PxAdmin["Color"] = colorName;
            PxAdmin["Anio"] = vehiculo.custrecord_ht_bien_ano;
            PxAdmin["Tipo"] = tipoVehiculo;
        // } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION) {
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_RENOVACION) {
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_MODIFICACION) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_MANTENIMIENTO_CHEQUEO) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_COMPONENTES) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_VENTA_SEGUROS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_RENOVACION_SEGUROS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_CAMBIO_PROPIETARIO) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_INSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_DESINSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_CHEQUEO_OTROS_PRODUCTOS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_REINSTALACION_OTROS_PRODUCTOS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_VENTA_SERVICIOS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_ACTUALIZACION_ESTADOS) {
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // } else if (operacionOrden == OPERACION_ORDEN_REGISTRAR_CANAL) {
        //     //<i> dfernandez 06/12/2024
        //     //retiro de la lógica de validación S/P, se debe enviar lo que contenga el campo placa
        //     PxAdmin["Placa"] = vehiculo.custrecord_ht_bien_placa;
        //     //<F> dfernandez 06/12/2024
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["DescModelo"] = descModelo;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        //     PxAdmin["Chasis"] = vehiculo.custrecord_ht_bien_chasis;
        //     PxAdmin["Motor"] = vehiculo.custrecord_ht_bien_motor;
        //     PxAdmin["Color"] = colorName;
        //     PxAdmin["Anio"] = vehiculo.custrecord_ht_bien_ano;
        //     PxAdmin["Tipo"] = tipoVehiculo;
        // } else if (operacionOrden == OPERACION_ORDEN_INSTALACION_COMPONENTES) {
        //     //<i> dfernandez 06/12/2024
        //     //retiro de la lógica de validación S/P, se debe enviar lo que contenga el campo placa
        //     PxAdmin["Placa"] = vehiculo.custrecord_ht_bien_placa;
        //     //<F> dfernandez 06/12/2024
        //     PxAdmin["IdMarca"] = idMarca2[0].value;
        //     PxAdmin["DescMarca"] = descMarca;
        //     PxAdmin["IdModelo"] = idModelo2[0].value;
        //     PxAdmin["CodigoVehiculo"] = vehiculo.custrecord_ht_bien_codsysh ? vehiculo.custrecord_ht_bien_codsysh : vehiculo.name;
        // }
    }

    const setPropietarioValues = (PxAdmin, Propietario, operacionOrden) => {
        let persona = Propietario.isperson;
        // if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorPropietario"] = Propietario.vatregnumber;
            PxAdmin["NombrePropietario"] = Propietario.custentity_ht_cl_primernombre.replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_segundonombre == 'undefined' ? '' : Propietario.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
            PxAdmin["ApellidosPropietario"] = (typeof Propietario.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidomaterno);
            PxAdmin["DireccionPropietario"] = Propietario.provincia.replace(/&/g, '&amp;');
            PxAdmin["ConvencionalPropietario"] = Propietario.homephone;
            PxAdmin["CelularPropietario"] = Propietario.phone.length ? Propietario.phone.replace('+593', '0') : '';
            PxAdmin["EmailPropietario"] = Propietario.email;
        // } else if (operacionOrden == OPERACION_ORDEN_ACTUALIZACION_DATOS_PROPIETARIOS) {
        //     PxAdmin["IdentificadorPropietario"] = Propietario.vatregnumber;
        //     PxAdmin["NombrePropietario"] = (typeof Propietario.custentity_ht_cl_primernombre == 'undefined' ? '' : Propietario.custentity_ht_cl_primernombre).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_segundonombre == 'undefined' ? '' : Propietario.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
        //     PxAdmin["ApellidosPropietario"] = (typeof Propietario.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidomaterno);
        //     PxAdmin["DireccionPropietario"] = Propietario.provincia.replace(/&/g, '&amp;');
        //     PxAdmin["ConvencionalPropietario"] = Propietario.homephone;
        //     PxAdmin["CelularPropietario"] = Propietario.phone.length ? Propietario.phone.replace('+593', '0') : '';
        //     PxAdmin["EmailPropietario"] = Propietario.email;
        // } else if (operacionOrden == OPERACION_ORDEN_CAMBIO_PROPIETARIO) {
        //     PxAdmin["IdentificadorPropietario"] = Propietario.vatregnumber;
        //     PxAdmin["NombrePropietario"] = Propietario.custentity_ht_cl_primernombre.replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_segundonombre == 'undefined' ? '' : Propietario.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
        //     PxAdmin["ApellidosPropietario"] = (typeof Propietario.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof Propietario.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : Propietario.custentity_ht_cl_apellidomaterno);
        //     PxAdmin["DireccionPropietario"] = Propietario.provincia.replace(/&/g, '&amp;');
        //     PxAdmin["ConvencionalPropietario"] = Propietario.homephone;
        //     PxAdmin["CelularPropietario"] = Propietario.phone.length ? Propietario.phone.replace('+593', '0') : '';
        //     PxAdmin["EmailPropietario"] = Propietario.email;
        // }
    }

    const setAseguradoraValues = (PxAdmin, Aseguradora, operacionOrden) => {
        if (!Aseguradora.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorAseguradora"] = Aseguradora.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialAseguradora"] = Aseguradora.custrecord_ht_cd_nombre.replace(/&/g, '&amp;') || "";
            PxAdmin["DireccionAseguradora"] = Aseguradora.custrecord_ht_cd_direccion.replace(/&/g, '&amp;') || "";
            PxAdmin["ConvencionalAseguradora"] = Aseguradora.custrecord_ht_cd_convencional.replace('+593', '0');
            PxAdmin["CelularAseguradora"] = Aseguradora.custrecord_ht_cd_telefono.replace('+593', '0') || "";
            PxAdmin["EmailAseguradora"] = Aseguradora.custrecord_ht_cd_email || "";
        }
    }

    const setConcesionarioValues = (PxAdmin, Concesionario, operacionOrden) => {
        if (!Concesionario.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorConcesionario"] = Concesionario.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialConcesionario"] = Concesionario.custrecord_ht_cd_nombre || "";
            PxAdmin["DireccionConcesionario"] = Concesionario.custrecord_ht_cd_direccion || "";
            PxAdmin["ConvencionalConcesionario"] = Concesionario.custrecord_ht_cd_convencional.replace('+593', '0');
            PxAdmin["CelularConcesionario"] = Concesionario.custrecord_ht_cd_telefono.replace('+593', '0') || "";
            PxAdmin["EmailConcesionario"] = Concesionario.custrecord_ht_cd_email || "";
        }
    }

    const setFinancieraValues = (PxAdmin, Financiera, operacionOrden) => {
        if (!Financiera.custrecord_ht_cd_nombre) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorFinanciera"] = Financiera.custrecord_ht_cd_ruccanaldistribucion || "";
            PxAdmin["RazonSocialFinanciera"] = Financiera.custrecord_ht_cd_nombre || "";
            PxAdmin["DireccionFinanciera"] = Financiera.custrecord_ht_cd_direccion || "";
            PxAdmin["ConvencionalFinanciera"] = Financiera.custrecord_ht_cd_convencional.replace('+593', '0');
            PxAdmin["CelularFinanciera"] = Financiera.custrecord_ht_cd_telefono.replace('+593', '0') || "";
            PxAdmin["EmailFinanciera"] = Financiera.custrecord_ht_cd_email || "";
        }
    }

    const setConvenioValues = (PxAdmin, Convenio, operacionOrden) => {
        if (!Convenio.custrecord_ht_cn_ruc_convenio) return;
        if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorConvenio"] = Convenio.custrecord_ht_cn_ruc_convenio || "";
            PxAdmin["RazonSocialConvenio"] = Convenio.custrecord_ht_cn_razon_social || "";
            PxAdmin["DireccionConvenio"] = Convenio.custrecord_ht_cn_direccion || "";
            PxAdmin["ConvencionalConvenio"] = Convenio.custrecord_ht_cn_convencional.replace('+593', '0');
            PxAdmin["CelularConvenio"] = Convenio.custrecord_ht_cn_celular.replace('+593', '0') || "";
            PxAdmin["EmailConvenio"] = Convenio.custrecord_ht_cn_email || "";
        }
    }

    const setMonitoreoValues = (PxAdmin, PropietarioMonitoreo, operacionOrden) => {
        let persona = PropietarioMonitoreo.isperson;
        let convencional = '';
        if (!PropietarioMonitoreo.vatregnumber) return;
       // log.debug('IDMONITOREO', PropietarioMonitoreo);
        let sql3 = 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = 10 AND custrecord_ht_campo_lbl_entidad_telefono = ?'
        let resultSet3 = query.runSuiteQL({ query: sql3, params: [PropietarioMonitoreo.identity] });
        let results3 = resultSet3.asMappedResults();
        convencional = results3.length ? results3[0]['convencional'].replace('+593', '0') : convencional;
        // if (operacionOrden == OPERACION_ORDEN_INSTALACION) {
            PxAdmin["IdentificadorMonitorea"] = PropietarioMonitoreo.vatregnumber;
            PxAdmin["NombreMonitorea"] = (typeof PropietarioMonitoreo.custentity_ht_cl_primernombre == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_primernombre).replace(/&/g, '&amp;') + ' ' + (typeof PropietarioMonitoreo.custentity_ht_cl_segundonombre == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_segundonombre).replace(/&/g, '&amp;');
            PxAdmin["ApellidosMonitorea"] = (typeof PropietarioMonitoreo.custentity_ht_cl_apellidopaterno == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_apellidopaterno).replace(/&/g, '&amp;') + ' ' + (typeof PropietarioMonitoreo.custentity_ht_cl_apellidomaterno == 'undefined' ? '' : PropietarioMonitoreo.custentity_ht_cl_apellidomaterno);
            PxAdmin["DireccionMonitorea"] = PropietarioMonitoreo.provincia.replace(/&/g, '&amp;');
            PxAdmin["ConvencionalMonitorea"] = convencional;
            PxAdmin["CelularMonitorea"] = PropietarioMonitoreo.phone.replace('+593', '0');
            PxAdmin["EmailMonitorea"] = PropietarioMonitoreo.email;
        // } else if (operacionOrden == OPERACION_ORDEN_CAMBIO_PROPIETARIO) {
        //     PxAdmin["IdentificadorMonitorea"] = PropietarioMonitoreo.vatregnumber;
        //     PxAdmin["NombreMonitorea"] = PropietarioMonitoreo.custentity_ht_cl_primernombre.replace(/&/g, '&amp;') + ' ' + PropietarioMonitoreo.custentity_ht_cl_segundonombre.replace(/&/g, '&amp;');
        //     PxAdmin["ApellidosMonitorea"] = PropietarioMonitoreo.custentity_ht_cl_apellidopaterno.replace(/&/g, '&amp;') + ' ' + PropietarioMonitoreo.custentity_ht_cl_apellidomaterno;
        //     PxAdmin["DireccionMonitorea"] = PropietarioMonitoreo.provincia.replace(/&/g, '&amp;');
        //     PxAdmin["ConvencionalMonitorea"] = convencional;
        //     PxAdmin["CelularMonitorea"] = PropietarioMonitoreo.phone.replace('+593', '0');
        //     PxAdmin["EmailMonitorea"] = PropietarioMonitoreo.email;
        // }
    }

    const setAuthenticationValues = (PxAdmin) => {
        let { year, month, day } = obtenerValoresFechaHoy();
        PxAdmin["StrToken"] = `SH2PX${year}${month}${day}`;
        //PxAdmin["UserName"] = `PxPrTest`;
        //PxAdmin["Password"] = `PX23$03%16#w`;
        PxAdmin["UserName"] = usuario;
        PxAdmin["Password"] = clave;
        PxAdmin["NACIONALIDAD"] = "";
        PxAdmin["URLPX"] = "";
        //PxAdmin["UsuarioIngreso"] = `PRUEBASYS`;
    }

    const setEmptyFields = (PxAdmin) => {
        setOrdenVentaEmptyField(PxAdmin);
        setVehiculoEmptyField(PxAdmin);
        setDispositivoEmptyFields(PxAdmin);
        setPropietarioEmptyFields(PxAdmin);
        setMonitorEmptyFields(PxAdmin);
        setConcesionarioEmptyFields(PxAdmin);
        setFinancieraEmptyFields(PxAdmin);
        setAseguradoraEmptyFields(PxAdmin);
        setConvenioEmptyFields(PxAdmin);
        setServicioEmptyFields(PxAdmin,"","","","","");
    }

    const setOrdenVentaEmptyField = (PxAdmin) => {
        PxAdmin["NumeroOrden"] = "";
        PxAdmin["NombreEjecutiva"] = "";
        PxAdmin["Ciudad"] = "";
        PxAdmin["Sucursal"] = "";
        PxAdmin["EstadoCartera"] = "";
        PxAdmin["FechaInicioCobertura"] = "";
        PxAdmin["FechaFinCobertura"] = "";

    }

    const setVehiculoEmptyField = (PxAdmin) => {
        PxAdmin["Placa"] = "";
        PxAdmin["IdMarca"] = "";
        PxAdmin["DescMarca"] = "";
        PxAdmin["IdModelo"] = "";
        PxAdmin["DescModelo"] = "";
        PxAdmin["CodigoVehiculo"] = "";
        PxAdmin["Chasis"] = "";
        PxAdmin["Motor"] = "";
        PxAdmin["Color"] = "";
        PxAdmin["Anio"] = "";
        PxAdmin["Tipo"] = "";
    }

    const setDispositivoEmptyFields = (PxAdmin) => {
        PxAdmin["Vid"] = "";
        PxAdmin["IdProducto"] = "";
        PxAdmin["DescProducto"] = "";
        PxAdmin["CodMarcaDispositivo"] = "";
        PxAdmin["MarcaDispositivo"] = "";
        PxAdmin["CodModeloDispositivo"] = "";
        PxAdmin["ModeloDispositivo"] = "";
        PxAdmin["Sn"] = "";
        PxAdmin["Imei"] = "";
        PxAdmin["NumeroCamaras"] = "";
        PxAdmin["DireccionMac"] = "";
        PxAdmin["Icc"] = "";
        PxAdmin["NumeroCelular"] = "";
        PxAdmin["Operadora"] = "";
        PxAdmin["EstadoSim"] = "ACTVO";
        PxAdmin["ServiciosInstalados"] = "";
        PxAdmin["OperacionDispositivo"] = "";
        PxAdmin["VidAnterior"] = "";
    }

    const setPropietarioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorPropietario"] = "";
        PxAdmin["NombrePropietario"] = "";
        PxAdmin["ApellidosPropietario"] = "";
        PxAdmin["DireccionPropietario"] = "";
        PxAdmin["ConvencionalPropietario"] = "";
        PxAdmin["CelularPropietario"] = "";
        PxAdmin["EmailPropietario"] = "";
    }

    const setMonitorEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorMonitorea"] = "";
        PxAdmin["NombreMonitorea"] = "";
        PxAdmin["ApellidosMonitorea"] = "";
        PxAdmin["DireccionMonitorea"] = "";
        PxAdmin["ConvencionalMonitorea"] = "";
        PxAdmin["CelularMonitorea"] = "";
        PxAdmin["EmailMonitorea"] = "";
    }
    
    const setServicioEmptyFields = (PxAdmin, CodServicio,DescripcionServicio,FechaInicioServicio,FechaFinServicio,EstadoServicio) => {
        PxAdmin["CodServicio"] = CodServicio;
        PxAdmin["DescripcionServicio"] = DescripcionServicio;
        PxAdmin["FechaInicioServicio"] = FechaInicioServicio;
        PxAdmin["FechaFinServicio"] = FechaFinServicio;
        PxAdmin["EstadoServicio"] = EstadoServicio;
    }   
    
    const setConcesionarioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorConcesionario"] = "";
        PxAdmin["RazonSocialConcesionario"] = "";
        PxAdmin["DireccionConcesionario"] = "";
        PxAdmin["ConvencionalConcesionario"] = "";
        PxAdmin["CelularConcesionario"] = "";
        PxAdmin["EmailConcesionario"] = "";
    }

    const setFinancieraEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorFinanciera"] = "";
        PxAdmin["RazonSocialFinanciera"] = "";
        PxAdmin["DireccionFinanciera"] = "";
        PxAdmin["ConvencionalFinanciera"] = "";
        PxAdmin["CelularFinanciera"] = "";
        PxAdmin["EmailFinanciera"] = "";
    }

    const setAseguradoraEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorAseguradora"] = "";
        PxAdmin["RazonSocialAseguradora"] = "";
        PxAdmin["DireccionAseguradora"] = "";
        PxAdmin["ConvencionalAseguradora"] = "";
        PxAdmin["CelularAseguradora"] = "";
        PxAdmin["EmailAseguradora"] = "";
    }

    const setConvenioEmptyFields = (PxAdmin) => {
        PxAdmin["IdentificadorConvenio"] = "";
        PxAdmin["RazonSocialConvenio"] = "";
        PxAdmin["DireccionConvenio"] = "";
        PxAdmin["ConvencionalConvenio"] = "";
        PxAdmin["CelularConvenio"] = "";
        PxAdmin["EmailConvenio"] = "";
    }

    const setSalesOrderValues = (PxAdmin, salesOrderId, vehiculo, Cobertura, location, ejecutiva) => {
        let salesOrder = getSalesOrder(salesOrderId);
        PxAdmin["NumeroOrden"] = salesOrder.tranid.replace(/\D/g, '');
        let estadovehiculo = vehiculo["custrecord_ht_bn_estadobien"] || "";
        PxAdmin["EstadoCartera"] = estadovehiculo[0].text;
        PxAdmin["NombreEjecutiva"] = ejecutiva;
        PxAdmin["Sucursal"] = location;
        PxAdmin["Ciudad"] = location;
        PxAdmin["FechaInicioCobertura"] = Cobertura.custrecord_ht_co_coberturainicial;
        PxAdmin["FechaFinCobertura"] = Cobertura.custrecord_ht_co_coberturafinal;
    }

    // const setCoberturaValues = (PxAdmin, Cobertura, operacionOrden) => {
    //     PxAdmin["Servicio"] = [];
        
    // }





    const obtenerValoresFechaHoy = () => {
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        month = month < 10 ? `0${month}` : month;
        day = day < 10 ? `0${day}` : day;
        return { year, month, day };
    }

    const obtenerCamposOrdenTrabajo = (ordenTrabajoId) => {
        let Convenio = {};
        var Location="";
        var Ejecutiva="";
        let ordenTrabajo = record.load({ type: 'customrecord_ht_record_ordentrabajo', id: ordenTrabajoId });
        let numPuertas = ordenTrabajo.getValue('custrecord_ht_ot_numero_puertas');
        let salesOrderId = ordenTrabajo.getValue('custrecord_ht_ot_orden_servicio');
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: salesOrderId });


        log.debug('ordenVenta', ordenVenta);
        // log.debug('Ejecutiva...', ordenVenta.getValue('custbody_ht_os_ejecutivareferencia'));
        log.debug('custbody_ht_os_servicios.............', ordenVenta.getValue('custbody_ht_os_servicios'));
        // log.debug('location................', ordenVenta.getValue('location'));
         log.debug('subsidiary...............', ordenVenta.getValue('subsidiary'));


        //
        let sql5 = 'SELECT name, subsidiary FROM Location WHERE id = ?  '
        let resultSet5 = query.runSuiteQL({ query: sql5, params: [ordenVenta.getValue('location')] });
        let results5 = resultSet5.asMappedResults();
        //results5.filter(ordenVenta.getValue('subsidiary'))
        if (results5.length > 0) {
            Location = results5[0]['name'];
        } else {
            Location = "";
        }
        log.debug('RESULTTTTT......................', results5);


        let sql6 = 'SELECT firstname, lastname, subsidiary FROM employee WHERE id = ?  '
        let resultSet6 = query.runSuiteQL({ query: sql6, params: [ordenVenta.getValue('custbody_ht_os_ejecutivareferencia')] });
        let results6 = resultSet6.asMappedResults();
        //results5.filter(ordenVenta.getValue('subsidiary'))
        if (results6.length > 0) {
            Ejecutiva = results6[0]['firstname'] + ' ' + results6[0]['lastname'] ;
        } else {
            Ejecutiva = "";
        }
        log.debug('RESULTTTTT......................', results6);



        let bien = ordenVenta.getValue('custbody_ht_so_bien');
        let sql4 = 'SELECT custrecord_ht_bien_conveniovehiculo FROM customrecord_ht_record_bienes WHERE id = ? '
        let resultSet4 = query.runSuiteQL({ query: sql4, params: [bien ] });
        let results4 = resultSet4.asMappedResults();


        //log.debug('RESULTTTTT', results4);
        let periodoCobertura = obtenerPeriodoCobertura(ordenVenta);
        let Dispositivo = obtenerDispositivo(ordenTrabajo.getValue('custrecord_ht_ot_serieproductoasignacion'));

        log.debug('Dispositivo..................', Dispositivo);




        Dispositivo.producto = ordenTrabajo.getText('custrecord_ht_ot_producto') || "";
        let vehiculo = obtenerVehiculo(ordenTrabajo.getValue('custrecord_ht_ot_vehiculo'));
        let productCadena = ordenTrabajo.getText('custrecord_ht_ot_producto')
        if (productCadena.includes("-")) {
            productCadena = productCadena.split('-')[1]/*.replace(/\s+/g, '')*/
        }

        //log.debug('EstadoBien', vehiculo.getValue('custrecord_ht_bn_estadobien'));
        //log.debug('EstadoBien', vehiculo);
        //vehiculo.EstadoCartera = vehiculo.getValue('custrecord_ht_bn_estadobien');

        vehiculo.producto = productCadena || "";
        vehiculo.fechaInicioCobertura = ordenVenta.getValue('trandate');
        vehiculo.fechaFinCobertura = new Date(vehiculo.fechaInicioCobertura.getFullYear(), vehiculo.fechaInicioCobertura.getMonth() + periodoCobertura, vehiculo.fechaInicioCobertura.getDate());
        let Propietario = obtenerPropietario(ordenTrabajo.getValue('custrecord_ht_ot_cliente_id'));
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, ordenTrabajo.getValue('custrecord_ht_ot_item'));

        let Cobertura = obtenerCobertura(ordenTrabajo);
        let pxadminfinalizacion = ordenTrabajo.getValue('custrecord_ht_ot_pxadminfinalizacion');
        let confirmaciontelamatic = ordenTrabajo.getValue('custrecord_ht_ot_confirmaciontelamatic');
        let Subsidiaria = obtenerSubsidiaria(ordenVenta.getValue('subsidiary'));


        //log.error("custbody_ht_os_companiaseguros........................", ordenVenta.getValue('custbody_ht_os_companiaseguros'));


        let Aseguradora = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_companiaseguros'));
        let Concesionario = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_concesionario'));
        let Financiera = obtenerCanalDistribucion(ordenVenta.getValue('custbody_ht_os_bancofinanciera'));
        if (results4.length > 0) {
            Convenio = obtenerConvenio(results4[0]['custrecord_ht_bien_conveniovehiculo']);
        } else {
            Convenio = obtenerConvenio(ordenVenta.getValue('custbody_ht_os_convenio'));
        }

        let Commands = obtenerCommands(ordenTrabajo, ordenVenta);
        let Servicios = ordenTrabajo.getText("custrecord_ht_ot_servicios_commands");
        //let Producto = ordenTrabajo.getText('custrecord_ht_ot_producto');
        // log.debug('CONVENIOOOO', Convenio)
         log.debug('Subsidiaria', Subsidiaria)
         log.debug('Servicios..................', Servicios)
        // log.debug('PROPIETARIOMON', PropietarioMonitoreo)
        return { Dispositivo, vehiculo, Propietario, PropietarioMonitoreo, Cobertura, Subsidiaria, Aseguradora, Concesionario, Financiera, Convenio, Commands, Servicios, pxadminfinalizacion, confirmaciontelamatic, salesOrderId, numPuertas, Location, Ejecutiva};
    }

    const obtenerPeriodoCobertura = (ordenServicio) => {
        let cantidad = 0;
        let itemLines = ordenServicio.getLineCount('item');
        for (let j = 0; j < itemLines; j++) {
            let items = ordenServicio.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
            var itemTypeId = idItemType(items);
            if (itemTypeId.unitstype == "6") {
                let quantity = Number(ordenServicio.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: j }));
                cantidad = cantidad + quantity;
            }
        }
        return cantidad;
    }

    const obtenerDispositivo = (id) => {
        if (!id) return;
        let Dispositivo = search.lookupFields({
            type: 'customrecord_ht_record_mantchaser', id: id,
            columns: [
                'custrecord_ht_mc_vid',
                'custrecord_ht_mc_modelo',
                'custrecord_ht_mc_unidad',
                'custrecord_ht_mc_seriedispositivo',
                'custrecord_ht_mc_imei',
                'name',
                'custrecord_ht_mc_nocelularsim',
                'custrecord_ht_mc_operadora',
                'custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_codigo',
                'custrecord_ht_mc_operadora.custrecord_ht_cs_operadora_descrip',
                'custrecord_ht_mc_ip', 'custrecord_ht_mc_celularsimcard',
                //'custrecord_ht_mc_estado',
                'custrecord_ht_mc_estadolodispositivo',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_mod_disp_id_telematic',
                'custrecord_ht_mc_modelo.custrecord_ht_md_servidor_relacionado',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_codig',
                'custrecord_ht_mc_modelo.custrecord_ht_dd_modelodispositivo_descr',
                'custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_codigo',
                'custrecord_ht_mc_unidad.custrecord_ht_dd_tipodispositivo_descrip',
                'custrecord_ht_mc_macaddress',
                'custrecord_ht_mc_sn',
                'custrecord_ht_mc_numero_camara',
                'custrecord_ht_mc_icc',
                'custrecord_ht_mc_servidor.custrecord_ht_mc_servidor_id_telematic',
                'custrecord_ht_mc_servidor',
                'custrecord_ht_mc_estadolodispositivo'
            ]
        });
        return Dispositivo;
    }

    const obtenerHeaders = () => {
        let headers = {};
        headers['Accept'] = '*/*';
        headers['Content-Type'] = 'application/json';
        return headers;
    };

  
    const obtenerCamposOrdenServicio = (ordenServicioId) => {
        let ordenVenta = record.load({ type: record.Type.SALES_ORDER, id: ordenServicioId });
        let Propietario = obtenerPropietario(ordenVenta.getValue('entity'));
        let vehiculo = obtenerVehiculo(ordenVenta.getValue('custbody_ht_so_bien'));
        let PropietarioMonitoreo = obtenerPropietarioMonitoreo(ordenVenta, null);
        // let order = record.load({ type: 'salesorder', id: ordenServicioId });
        // let clienteNew = order.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente', line: 0 });
        // let NuevoPropietario = obtenerNewPropietario(clienteNew);
        // //obtenerNuevoPropietario(ordenVenta, null);

        // return { vehiculo, Propietario, PropietarioMonitoreo, NuevoPropietario };
        return { vehiculo, Propietario, PropietarioMonitoreo };
    }

    const obtenerVehiculo = (id) => {
        if (!id) return;
        let vehiculo = search.lookupFields({
            type: 'customrecord_ht_record_bienes', id: id,
            columns: [
                'custrecord_ht_bien_placa',
                'custrecord_ht_bien_marca',
                'custrecord_ht_bien_modelo',
                'custrecord_ht_bien_chasis',
                'custrecord_ht_bien_motor',
                'custrecord_ht_bien_colorcarseg',
                'custrecord_ht_bien_tipoterrestre',
                'custrecord_ht_bien_tipoterrestre.custrecord_ht_tt_idtelematic',
                'name',
                'custrecord_ht_bn_estadobien',
                'custrecord_ht_bien_ano',
                'custrecord_ht_bien_codsysh',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_ruccanaldistribucion',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_nombre',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_direccion',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_telefono',
                'custrecord_ht_bien_consesionarios.custrecord_ht_cd_tipocanal',
                'custrecord_ht_bien_marca.custrecord_ht_marca_codigo',
                'custrecord_ht_bien_marca.custrecord_ht_marca_descripcion',
                'custrecord_ht_bien_modelo.custrecord_ht_mod_codigo',
                'custrecord_ht_bien_modelo.custrecord_ht_mod_descripcion',
                'custrecord_ht_bien_cilindraje',
                'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_codigo',
                'custrecord_ht_bien_cilindraje.custrecord_ht_record_cilindraje_descrip',
                'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_codigo',
                'custrecord_ht_bien_colorcarseg.custrecord_ht_bn_colorcarseg_descripcion',
                'custrecord_ht_bien_id_telematic',
                'internalid',
                'custrecord_ht_bien_tipo',
                'custrecord_ht_bien_tipo.custrecord_ht_tv_codigo',
                'custrecord_ht_bien_tipo.custrecord_ht_tv_descripcion',
                'custrecord_ht_bien_numeropuertas',
                'custrecord_ht_bien_num_ruedas',
                'custrecord_ht_bien_max_peso',
                'custrecord_ht_bien_largo',
                'altname'
            ]
        });
        return vehiculo;
    }

    const sendPXServer = (PxAdmin) => {
        let myRestletResponse = https.requestRestlet({
            body: JSON.stringify(PxAdmin),
            deploymentId: 'customdeploy_hu_rs_px_services',
            scriptId: 'customscript_hu_rs_px_services',
            headers: obtenerHeaders(),
        });
        return myRestletResponse;
    }
    
    const obtenerPropietario = (id) => {
        if (!id) return;
        let result = {};
        let correoEmail = '';
        let celular = '';
        let convencional = '';
        let city = '';
        let sql = 'SELECT custrecord_ht_email_email as email FROM customrecord_ht_record_correoelectronico WHERE custrecord_ht_email_tipoemail = 1 AND custrecord_ht_ce_enlace = ?';
        let resultSet = query.runSuiteQL({ query: sql, params: [id] });
        let results = resultSet.asMappedResults();
        correoEmail = results.length ? results[0]['email'] : correoEmail;
        let sql2 = 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = 1 AND custrecord_ht_campo_lbl_entidad_telefono = ?'
        let resultSet2 = query.runSuiteQL({ query: sql2, params: [id] });
        let results2 = resultSet2.asMappedResults();
        celular = results2.length ? results2[0]['celular'].replace('+593', '0') : celular;
        let sql3 = 'SELECT custrecord_ht_campo_txt_telefono as convencional FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = 10 AND custrecord_ht_campo_lbl_entidad_telefono = ?'
        let resultSet3 = query.runSuiteQL({ query: sql3, params: [id] });
        let results3 = resultSet3.asMappedResults();
        convencional = results3.length ? results3[0]['convencional'].replace('+593', '0') : convencional;
        let sql4 = 'SELECT addressbookaddress FROM customeraddressbook WHERE entity = ?'
        let resultSet4 = query.runSuiteQL({ query: sql4, params: [id] });
        let results4 = resultSet4.asMappedResults();
        if (results4.length > 0) {
            let sql5 = 'SELECT addr1, addr2, city, zip, country FROM customerAddressbookEntityAddress WHERE nkey = ?'
            let resultSet5 = query.runSuiteQL({ query: sql5, params: [results4[0]['addressbookaddress']] });
            let results5 = resultSet5.asMappedResults();
            if (results5.length > 0) {
                city = (results5[0]['addr1'] == null ? '' : results5[0]['addr1']) + ' ' + (results5[0]['addr2'] == null ? '' : results5[0]['addr2']) + ' ' + (results5[0]['city'] == null ? '' : results5[0]['city']) + ' ' + (results5[0]['zip'] == null ? '' : results5[0]['zip']) + ' ' + (results5[0]['country'] == null ? '' : results5[0]['country'])
            }
        }
        let Propietario = search.lookupFields({
            type: 'customer', id: id,
            columns: ['entityid', 'custentity_ht_cl_primernombre', 'custentity_ht_cl_segundonombre',
                'custentity_ht_cl_apellidopaterno',
                'custentity_ht_cl_apellidomaterno',
                'phone',
                'homephone',
                'email',
                'vatregnumber',
                'custentity_ht_customer_id_telematic',
                'internalid',
                'custentityts_ec_cod_tipo_doc_identidad',
                'companyname',
                'isperson'
            ]
        });
        //let provincia = ObtenerProvincia(id);
        result.htEmail = obtenerCorreosPropietario(id);
        result.entityid = Propietario.entityid.length ? Propietario.entityid : '';
        // result.phone = Propietario.phone.length ? Propietario.phone.replace('+593', '') : '';
        //result.email = Propietario.email.length ? Propietario.email : '';
        result.phone = celular;
        result.email = correoEmail;
        result.vatregnumber = Propietario.vatregnumber.length ? Propietario.vatregnumber : '';
        result.custentity_ht_customer_id_telematic = Propietario.custentity_ht_customer_id_telematic.length ? Propietario.custentity_ht_customer_id_telematic : '';
        result.internalid = Propietario.internalid.length ? Propietario.internalid : '';
        result.isperson = Propietario.isperson;
        // result.provincia = provincia.length ? provincia : '';
        result.provincia = city;
        result.companyname = Propietario.companyname || ""
        result.custentityts_ec_cod_tipo_doc_identidad = Propietario.custentityts_ec_cod_tipo_doc_identidad || "";
        // result.homephone = Propietario.homephone;
        result.homephone = convencional;
        if (result.isperson) {
            result.custentity_ht_cl_primernombre = Propietario.custentity_ht_cl_primernombre.length ? Propietario.custentity_ht_cl_primernombre : '';
            result.custentity_ht_cl_segundonombre = Propietario.custentity_ht_cl_segundonombre.length ? Propietario.custentity_ht_cl_segundonombre : '';
            result.custentity_ht_cl_apellidopaterno = Propietario.custentity_ht_cl_apellidopaterno.length ? Propietario.custentity_ht_cl_apellidopaterno : '';
            result.custentity_ht_cl_apellidomaterno = Propietario.custentity_ht_cl_apellidomaterno.length ? Propietario.custentity_ht_cl_apellidomaterno : '';
        } else {
            result.custentity_ht_cl_primernombre = Propietario.companyname;
        }
        log.error('result', result)
        return result;
    }

    const obtenerPropietarioMonitoreo = (salesOrderRecord, itemMonitoreo) => {
        let city = '';
        let correoEmail = '';
        let celular = '';
        try {
            let itemLines = salesOrderRecord.getLineCount({ sublistId: 'item' });
            let PropietarioMonitoreo = 0;
            for (let j = 0; j < itemLines; j++) {
                let item = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                if (itemMonitoreo && item == itemMonitoreo) {
                    PropietarioMonitoreo = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente_monitoreo', line: j });
                    break;
                } else {
                    PropietarioMonitoreo = salesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ht_os_cliente_monitoreo', line: j });
                    if (PropietarioMonitoreo) break;
                }
            }
            var lookupFieldsPropietarioMonitoreo = {};
            if (!PropietarioMonitoreo) return lookupFieldsPropietarioMonitoreo;
            let sql = 'SELECT isperson, id, entityid, custentity_ht_cl_primernombre, custentity_ht_cl_segundonombre, custentity_ht_cl_apellidopaterno, custentity_ht_cl_apellidomaterno, ' +
                'custentity_ht_customer_id_telematic, custentityts_ec_cod_tipo_doc_identidad, companyname FROM customer WHERE id = ?';
            let resultSet = query.runSuiteQL({ query: sql, params: [PropietarioMonitoreo] });
            let results = resultSet.asMappedResults();
            if (results.length > 0) {
                let sql1 = 'SELECT custrecord_ht_email_email as email FROM customrecord_ht_record_correoelectronico WHERE custrecord_ht_email_tipoemail = 1 AND custrecord_ht_ce_enlace = ?';
                let resultSet1 = query.runSuiteQL({ query: sql1, params: [PropietarioMonitoreo] });
                let results1 = resultSet1.asMappedResults();
                correoEmail = results1.length ? results1[0]['email'] : correoEmail;
                let sql2 = 'SELECT custrecord_ht_campo_txt_telefono as celular FROM customrecord_ht_registro_telefono WHERE custrecord_ht_campo_list_tipo_telefono = 1 AND custrecord_ht_campo_lbl_entidad_telefono = ?'
                let resultSet2 = query.runSuiteQL({ query: sql2, params: [PropietarioMonitoreo] });
                let results2 = resultSet2.asMappedResults();
                celular = results2.length ? results2[0]['celular'].replace('+593', '0') : celular;
                //let provincia = ObtenerProvincia(PropietarioMonitoreo);
                let sql4 = 'SELECT addressbookaddress FROM customeraddressbook WHERE entity = ?'
                let resultSet4 = query.runSuiteQL({ query: sql4, params: [PropietarioMonitoreo] });
                let results4 = resultSet4.asMappedResults();
                if (results4.length > 0) {
                    let sql5 = 'SELECT addr1, addr2, city, zip, country FROM customerAddressbookEntityAddress WHERE nkey = ?'
                    let resultSet5 = query.runSuiteQL({ query: sql5, params: [results4[0]['addressbookaddress']] });
                    let results5 = resultSet5.asMappedResults();
                    if (results5.length > 0) {
                        city = (results5[0]['addr1'] == null ? '' : results5[0]['addr1']) + ' ' + (results5[0]['addr2'] == null ? '' : results5[0]['addr2']) + ' ' + (results5[0]['city'] == null ? '' : results5[0]['city']) + ' ' + (results5[0]['zip'] == null ? '' : results5[0]['zip']) + ' ' + (results5[0]['country'] == null ? '' : results5[0]['country'])
                    }
                }
                lookupFieldsPropietarioMonitoreo.htEmail = obtenerCorreosPropietario(PropietarioMonitoreo);
                lookupFieldsPropietarioMonitoreo = search.lookupFields({ type: 'customer', id: PropietarioMonitoreo, columns: ['vatregnumber'] });
                log.debug('lookupFieldsPropietarioMonitoreo', lookupFieldsPropietarioMonitoreo);
                //let provincia = ObtenerProvincia(PropietarioMonitoreo);
                lookupFieldsPropietarioMonitoreo.htEmail = obtenerCorreosPropietario(PropietarioMonitoreo);
                lookupFieldsPropietarioMonitoreo.entityid = results[0]['entityid'] == null ? '' : results[0]['entityid'];
                lookupFieldsPropietarioMonitoreo.phone = celular;
                lookupFieldsPropietarioMonitoreo.email = correoEmail;
                lookupFieldsPropietarioMonitoreo.vatregnumber = lookupFieldsPropietarioMonitoreo.vatregnumber.length ? lookupFieldsPropietarioMonitoreo.vatregnumber : '';
                lookupFieldsPropietarioMonitoreo.custentity_ht_customer_id_telematic = results[0]['custentity_ht_customer_id_telematic'] == null ? '' : results[0]['custentity_ht_customer_id_telematic'];
                lookupFieldsPropietarioMonitoreo.isperson = results[0]['isperson'];
                lookupFieldsPropietarioMonitoreo.custentityts_ec_cod_tipo_doc_identidad = results[0]['custentityts_ec_cod_tipo_doc_identidad'];
                lookupFieldsPropietarioMonitoreo.companyname = results[0]["companyname"];
                lookupFieldsPropietarioMonitoreo.identity = PropietarioMonitoreo;
                // lookupFieldsPropietarioMonitoreo.provincia = provincia.length ? provincia : '';
                lookupFieldsPropietarioMonitoreo.provincia = city;
                if (results[0]['isperson'] == 'F') {
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = results[0]['companyname'] == null ? '' : results[0]['companyname']
                } else {
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = results[0]['custentity_ht_cl_primernombre'] == null ? '' : results[0]['custentity_ht_cl_primernombre']
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_segundonombre = results[0]['custentity_ht_cl_segundonombre'] == null ? '' : results[0]['custentity_ht_cl_segundonombre']
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidopaterno = results[0]['custentity_ht_cl_apellidopaterno'] == null ? '' : results[0]['custentity_ht_cl_apellidopaterno']
                    lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidomaterno = results[0]['custentity_ht_cl_apellidomaterno'] == null ? '' : results[0]['custentity_ht_cl_apellidomaterno']
                }
            }
            // lookupFieldsPropietarioMonitoreo = search.lookupFields({
            //     type: 'customer', id: PropietarioMonitoreo,
            //     columns: [
            //         // 'entityid',
            //         // 'custentity_ht_cl_primernombre',
            //         // 'custentity_ht_cl_segundonombre',
            //         // 'custentity_ht_cl_apellidopaterno',
            //         // 'custentity_ht_cl_apellidomaterno',
            //         // 'phone',
            //         // 'homephone',
            //         // 'email',
            //         'vatregnumber',
            //         // 'custentity_ht_customer_id_telematic',
            //         // 'custentityts_ec_cod_tipo_doc_identidad',
            //         // 'companyname',
            //         // 'isperson'
            //     ]
            // });
            // log.debug('lookupFieldsPropietarioMonitoreo', lookupFieldsPropietarioMonitoreo);
            // let provincia = ObtenerProvincia(PropietarioMonitoreo);
            // lookupFieldsPropietarioMonitoreo.htEmail = obtenerCorreosPropietario(PropietarioMonitoreo);
            // lookupFieldsPropietarioMonitoreo.entityid = lookupFieldsPropietarioMonitoreo.entityid.length ? lookupFieldsPropietarioMonitoreo.entityid : '';
            // lookupFieldsPropietarioMonitoreo.phone = lookupFieldsPropietarioMonitoreo.phone.length ? lookupFieldsPropietarioMonitoreo.phone.replace('+593', '0') : '';
            // lookupFieldsPropietarioMonitoreo.email = lookupFieldsPropietarioMonitoreo.email.length ? lookupFieldsPropietarioMonitoreo.email : '';
            // lookupFieldsPropietarioMonitoreo.vatregnumber = lookupFieldsPropietarioMonitoreo.vatregnumber.length ? lookupFieldsPropietarioMonitoreo.vatregnumber : '';
            // lookupFieldsPropietarioMonitoreo.custentity_ht_customer_id_telematic = lookupFieldsPropietarioMonitoreo.custentity_ht_customer_id_telematic.length ? lookupFieldsPropietarioMonitoreo.custentity_ht_customer_id_telematic : '';
            // lookupFieldsPropietarioMonitoreo.isperson = lookupFieldsPropietarioMonitoreo.isperson;
            // lookupFieldsPropietarioMonitoreo.provincia = provincia.length ? provincia : '';
            // if (lookupFieldsPropietarioMonitoreo.isperson) {
            //     lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = Propietario.custentity_ht_cl_primernombre.length ? Propietario.custentity_ht_cl_primernombre : '';
            //     lookupFieldsPropietarioMonitoreo.custentity_ht_cl_segundonombre = Propietario.custentity_ht_cl_segundonombre.length ? Propietario.custentity_ht_cl_segundonombre : '';
            //     lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidopaterno = Propietario.custentity_ht_cl_apellidopaterno.length ? Propietario.custentity_ht_cl_apellidopaterno : '';
            //     lookupFieldsPropietarioMonitoreo.custentity_ht_cl_apellidomaterno = Propietario.custentity_ht_cl_apellidomaterno.length ? Propietario.custentity_ht_cl_apellidomaterno : '';
            // } else {
            //     lookupFieldsPropietarioMonitoreo.custentity_ht_cl_primernombre = Propietario.companyname;
            // }
            return lookupFieldsPropietarioMonitoreo;
        } catch (error) {
            log.error('error-pxxxx', error);
        }
    }

    const obtenerCorreosPropietario = (customerId) => {
        let result = {
            email: "",
            amiEmail: "",
            mainEmail: "",
            convenioEmail: ""
        };
        let resultSearch = search.create({
            type: "customrecord_ht_record_correoelectronico",
            filters: [
                ["custrecord_ht_ce_enlace", "anyof", customerId]
            ],
            columns: [
                search.createColumn({ name: "custrecord_ht_email_tipoemail", label: "HT CE Tipo de Email" }),
                search.createColumn({ name: "custrecord_ht_email_email", label: "HT CE Email" }),
                search.createColumn({ name: "custrecord_ht_email_emailprincipal", label: "HT Email Principal" })
            ]
        }).run().getRange(0, 1000);

        if (resultSearch.length) {
            for (let i = 0; i < resultSearch.length; i++) {
                let email = resultSearch[i].getValue("custrecord_ht_email_email");
                let emailType = resultSearch[i].getValue("custrecord_ht_email_tipoemail");
                let mainEmail = resultSearch[i].getValue("custrecord_ht_email_emailprincipal");
                if (mainEmail) result.mainEmail = email;
                if (emailType == "1") result.email = email;
                if (emailType == "2") result.amiEmail = email;
                if (emailType == "3") result.convenioEmail = email;
            }
        }
        return result;
    }

    const obtenerCobertura = (ordenTrabajo) => {
        let itemId = ordenTrabajo.getValue('custrecord_ht_ot_item');
        let bienId = ordenTrabajo.getValue('custrecord_ht_ot_vehiculo');
        let clienteId = ordenTrabajo.getValue('custrecord_ht_ot_cliente_id');

        let coberturaSearchResult = search.create({
            type: "customrecord_ht_co_cobertura",
            filters: [
                ["custrecord_ht_co_bien", "anyof", bienId],
                "AND",
                ["custrecord_ht_co_propietario", "anyof", clienteId],
                "AND",
                ["custrecord_ht_co_producto", "anyof", itemId]
            ],
            columns: [
                search.createColumn({ name: "name", sort: search.Sort.ASC, label: "ID" }),
                search.createColumn({ name: "custrecord_ht_co_estado_cobertura", label: "HT CO Estado Cobertura" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturainicial}, 'YYYY-MM-DD')", label: "Formula (Text)" }),
                search.createColumn({ name: "formulatext", formula: "to_char({custrecord_ht_co_coberturafinal}, 'YYYY-MM-DD')", label: "Formula (Text)" }),
                search.createColumn({ name: "custrecord_ht_co_coberturainicial" }),
                search.createColumn({ name: "custrecord_ht_co_coberturafinal" })
            ]
        }).run().getRange(0, 10);

        log.debug('coberturaSearchResult', coberturaSearchResult);
        let result = {
            name: "",
            custrecord_ht_co_estado_cobertura: "",
            custrecord_ht_co_coberturainicial: "",
            custrecord_ht_co_coberturafinal: "",
            custrecord_ht_co_coberturainicialtext: "",
            custrecord_ht_co_coberturafinaltext: "",
        };

        if (!coberturaSearchResult.length) return result;
        let columns = coberturaSearchResult[0].columns;

        //log.error("coberturaSearchResult........................", coberturaSearchResult[0].getValue(columns[4]));
        return {
            name: coberturaSearchResult[0].getValue("name"),
            custrecord_ht_co_estado_cobertura: coberturaSearchResult[0].getText("custrecord_ht_co_estado_cobertura"),
            custrecord_ht_co_coberturainicialtext: coberturaSearchResult[0].getValue(columns[2]),
            custrecord_ht_co_coberturafinaltext: coberturaSearchResult[0].getValue(columns[3]),
            custrecord_ht_co_coberturainicial: format.parse({ value: coberturaSearchResult[0].getValue(columns[4]), type: format.Type.DATE }),
            custrecord_ht_co_coberturafinal: format.parse({ value: coberturaSearchResult[0].getValue(columns[5]), type: format.Type.DATE })
        };
    }

    const obtenerSubsidiaria = (subsdiaryId) => {
        if (!subsdiaryId) return {};
        let subsidiary = search.lookupFields({
            type: search.Type.SUBSIDIARY,
            id: subsdiaryId,
            columns: ["taxidnum", "custrecord_telematic_emergency_phone_num", "custrecord_telematic_assistanc_phone_num", "custrecord_telematic_technic_support_ema"]
        });
        return subsidiary;
    }

    const obtenerCanalDistribucion = (idCanalDistribucion) => {
        if (!idCanalDistribucion) return {};
        let canalDistribucion = search.lookupFields({
            type: "customrecord_ht_record_canaldistribucion",
            id: idCanalDistribucion,
            columns: [
                "custrecord_ht_cd_ruccanaldistribucion",
                "custrecord_ht_cd_nombre",
                "custrecord_ht_cd_telefono",
                "custrecord_ht_cd_direccion",
                "custrecord_ht_cd_email",
                "custrecord_ht_cd_convencional"
            ]
        });

        return canalDistribucion;
    }

    const obtenerConvenio = (idConvenio) => {
        if (!idConvenio) return {};
        let convenio = search.lookupFields({
            type: "customrecord_ht_record_convenio",
            id: idConvenio,
            columns: [
                "custrecord_ht_cn_ruc_convenio",
                "custrecord_ht_cn_razon_social",
                "custrecord_ht_cn_direccion",
                "custrecord_ht_cn_celular",
                "custrecord_ht_cn_email",
                "custrecord_ht_cn_convencional"
            ]
        });
        return convenio;
    }

    const obtenerCommands = (ordenTrabajo, ordenVenta) => {

        //let filters = ordenTrabajo.getValue("custrecord_ht_ot_servicios_commands");
        getVehiculoServicios(986819);
        let filters = ordenVenta.getValue("custbody_ht_os_servicios");
        let commands = obtenerServicios(filters);
        //let commands = obtenerServiciosPX(filters);
        
        log.error("commands..................", commands);
        log.error("obtenerServicios..................", ordenVenta);
        log.error("ordenTrabajo..................", ordenTrabajo);

        return commands;
        // let paralizador = ordenTrabajo.getValue("custrecord_ht_ot_paralizador");
        // let aperturaPuertas = ordenTrabajo.getValue("custrecord_ht_ot_boton_panico");

        // let filters = [];
        // if (paralizador) {
        //     let paralizadorField = ordenTrabajo.getField("custrecord_ht_ot_paralizador");
        //     filters.push(["name", "is", paralizadorField.label]);
        // }
        // if (aperturaPuertas) {
        //     let aperturaPuertasField = ordenTrabajo.getField("custrecord_ht_ot_boton_panico");
        //     if (filters.length) filters.push("OR");
        //     filters.push(["name", "is", "APERTURA DE PUERTAS"]);
        // }
        // log.error("filters", filters);

    }

    const getVehiculoServicios = (id)=> {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_nc_servicios_instalados",
        filters: [["custrecord_ns_bien_si", "anyof", id]],
        columns: [
          { name: "internalid" },
          { name: "custrecord_ns_servicio" },
          { name: "custrecord_ht_si_numero_puertas" },
          { name: "custrecord_ht_si_novedad" },
          { name: "custrecord_ht_tipo" }
        ],
      });

      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];

      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });

        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getValue({ name: "internalid" }),
            servicio: result.getText({ name: "custrecord_ns_servicio" }),
            infservicio: result.getValue({ name: "custrecord_ns_servicio" }),
            numeroPuertas: result.getValue({ name: "custrecord_ht_si_numero_puertas" }),
            novedad: result.getValue({ name: "custrecord_ht_si_novedad" }),
            tipo: result.getText({ name: "custrecord_ht_tipo" })
          });
        });
      });
      log.error("Servicios.....................",respuesta);
      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculoServicios", e);
      return [];
    }
    };

    const obtenerServicios = (filters) => {
        if (!filters.length) return filters;
        let jsonComand = new Array();
        let mySearch = search.create({
            type: "customrecord_ht_servicios",
            filters:
                [
                    ["internalid", "anyof", filters]
                ],
            columns:
                [
                    search.createColumn({ name: "custrecord_ht_sv_command", label: "Comando" })

                ]
        });
        mySearch.run().each(result => {
            if (result.getValue('custrecord_ht_sv_command')) {
                let comando = result.getText('custrecord_ht_sv_command').split(',');
                jsonComand = jsonComand.concat(comando);
            }
            return true;
        });
        return jsonComand;
        // let result = [];
        // let newSearch = search.create({
        //     type: "customrecord_ht_servicios",
        //     filters,
        //     columns: ["custrecord_ht_sv_command"]
        // }).run().getRange(0, 1000);

        // for (let i = 0; i < newSearch.length; i++) {
        //     let commands = newSearch[i].getText("custrecord_ht_sv_command").split(',');
        //     result = result.concat(commands);
        // }
        // return result;
    }

    const obtenerServiciosPX = (filters) => {
        if (!filters.length) return filters;
        //let jsonComand = new Array();
        // let mySearch = search.create({
        //     type: "customrecord_ht_servicios",
        //     filters:
        //         [
        //             ["internalid", "anyof", filters]
        //         ],
        //     columns:
        //         [
        //             search.createColumn({ name: "custrecord_ht_sv_command", label: "Comando" }),
        //             search.createColumn({ name: "name", label: "name" }),
        //             search.createColumn({ name: "custrecord_ht_sv_sub", label: "Subsidiary" })

        //         ]
        // });
        let servicioPX = search.lookupFields({
            type: "customrecord_ht_servicios",
            id: 1,
            // filters:
            // [
            //     ["internalid", "anyof", 1]
            // ],
            columns:
                [
                    search.createColumn({ name: "custrecord_ht_sv_command", label: "Comando" }),
                    search.createColumn({ name: "name", label: "name" }),
                    search.createColumn({ name: "custrecord_ht_sv_sub", label: "Subsidiary" })

                ]
        });
        return servicioPX;
        // mySearch.run().each(result => {
        //     if (result.getValue('custrecord_ht_sv_command')) {
        //         //let comando = result.getText('custrecord_ht_sv_command').split(',');
        //         //jsonComand = jsonComand.concat(comando);
        //     }
        //     return true;
        // });
        return jsonComand;
        
    }


    function conexionPX(context, URLPX){
        let headers1 = [];
        headers1['Content-Type'] = 'text/xml';
        headers1['SOAPAction'] = 'http://tempuri.org/AutenticacionUsuarioPx';
        var raw = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\r\n  <soap:Header>\r\n    <SeguridadPx xmlns=\"http://tempuri.org/\">\r\n " +
            "<StrToken>" + context.StrToken + "</StrToken>\r\n" +
            "<UserName>" + context.UserName + "</UserName>\r\n" +
            "<Password>" + context.Password + "</Password>\r\n" +
            "</SeguridadPx>\r\n  </soap:Header>\r\n  <soap:Body>\r\n" +
            "<AutenticacionUsuarioPx xmlns=\"http://tempuri.org/\" />\r\n  </soap:Body>\r\n</soap:Envelope>";

        log.debug('raw', raw);
        log.debug('url', `${URLPX}?op=AutenticacionUsuarioPx`);
        const resp = https.post({
            url: `${URLPX}?op=AutenticacionUsuarioPx`,
            headers: headers1,
            body: raw
        });

      

        var xmlDoc = resp.body;
        //log.debug('resp.body', resp.body)
        const regex = /.*<AutenticacionUsuarioPxResult>(.*)<\/AutenticacionUsuarioPxResult>.*/;

        let rowXml = getBodyByOperacionOrden(context);

        log.debug("rowXml.......................", rowXml);
        let string = xmlDoc.replace(regex, '$1');

        //log.debug("AutenticacionToken", string);

        let headers2 = [];
        headers2['Content-Type'] = 'text/xml';
        headers2['SOAPAction'] = 'http://tempuri.org/InsertaOrdenV2';
        //-headers2['Authorization'] = 'Bearer 2bbca8dd-81ca-4de8-ae3e-3f212286cafe';
        var rawInsert = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\r\n" +
            "<soap:Header>\r\n  " +
            "<SeguridadPx xmlns=\"http://tempuri.org/\">\r\n" +
            "<StrToken>" + context.StrToken + "</StrToken>\r\n" +
            "<AutenticacionToken>" + string + "</AutenticacionToken>\r\n" +
            "<UserName>" + context.UserName + "</UserName>\r\n" +
            "<Password>" + context.Password + "</Password>\r\n" +
            "</SeguridadPx>\r\n" +
            "</soap:Header>\r\n" +
            "<soap:Body>\r\n" +
            "<InsertaOrdenV2 xmlns=\"http://tempuri.org/\">\r\n" +
            "<strXml>\r\n" +
            "<![CDATA[\r\n" +
            rowXml + "\r\n" +
            "]]>\r\n" +
            "</strXml>\r\n" +
            "<strNacionalidad>"+ NACIONALIDAD +"</strNacionalidad>"+
            "</InsertaOrdenV2>\r\n" +
            "</soap:Body>\r\n" +
            "</soap:Envelope>";

            //para ejecutar el proceso URL
        //-- const resp2 = https.post({
        //--     url: `${URLPX}?op=InsertaOrdenV2`,
        //--     headers: headers2,
        //--     body: rawInsert
        //-- });

        log.debug('url', `${URLPX}?op=InsertaOrdenV2`);
        //log.debug('headers2',headers2);
        log.debug('headers2................',rawInsert);

        var xmlFile = file.create({
            //-name: context.StrToken+'.xml', // Nombre del archivo
            name: context.NumeroOrden +'.xml', 
            fileType: file.Type.XMLDOC, // Tipo de archivo
            contents: rawInsert, // Contenido XML
            encoding: file.Encoding.UTF8, // Codificación
            folder: 24686 // ID de la carpeta donde deseas guardar, -15 es "Sin carpeta"
        });
        var fileId = xmlFile.save();
        log.debug('fileId', fileId);
        
        //-- const regex2 = /.*<string>(.*)<\/string>.*/;
        //-- let Respon = resp2.body.replace(regex2, '$1');
        log.debug('XML', rawInsert);
        //--log.debug('Response-Hunter-PXADMIN', resp2);
        //--return Respon;
        return rowXml;
    }; 

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
                } else {
                    data.push( {
                            Param: "",
                            ParamId:  "",
                            Valor:  "",
                            ValorText:  "",
                            ValorId: "", }) 
                    }
            }
            return data;
        } catch (error) {
            log.debug("Error", { error: error.message, stack: error.stack });
            return []
        }
    }


    const idItemType = (itemId) => {
        if (!itemId) return "";
        let item = search.lookupFields({
            type: search.Type.SERVICE_ITEM,
            id: itemId,
            columns: ["unitstype"]
        });
        if (item.unitstype) item.unitstype = item.unitstype.length ? item.unitstype[0].value : "";
        return item;
    }


     

    const getSalesOrder = (salesOrderId) => {
        let salesOrderValues = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: salesOrderId,
            columns: ['tranid']
        });
        return salesOrderValues;
    }
    
    const getBodyByOperacionOrden = (context) => {
        let rowXml = "";
        rowXml = getInstalacionBody(context);
        log.debug('rowXml', rowXml)
        
        return rowXml;
    }


    const getInstalacionBody = (context) => {
        //log.debug('Type of', typeof context.NombrePropietario);
        let rowXml = "<Ordenes><Orden><NumeroOrden>" + context.NumeroOrden + "</NumeroOrden><UsuarioIngreso>" + context.UsuarioIngreso + "</UsuarioIngreso>" +
            "<OperacionOrden>" + context.OperacionOrden + "</OperacionOrden>" +
            "<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
            "<Ciudad>" + context.Ciudad + "</Ciudad>" +
            "<Sucursal>" + context.Sucursal + "</Sucursal>" +
            "<EstadoCartera>" + context.EstadoCartera + "</EstadoCartera>" +
            "<FechaInicioCobertura>" + context.FechaInicioCobertura + "</FechaInicioCobertura>" +
            "<FechaFinCobertura>" + context.FechaFinCobertura + "</FechaFinCobertura>" +
            "<Vehiculo>" +
            "<Placa>" + (context.Placa || "") + "</Placa>" +
            "<IdMarca>" + (context.IdMarca || "") + "</IdMarca>" +
            "<DescMarca>" + (context.DescMarca || "") + "</DescMarca>" +
            "<IdModelo>" + (context.IdModelo || "") + "</IdModelo>" +
            "<DescModelo>" + (context.DescModelo || "") + "</DescModelo>" +
            "<CodigoVehiculo>" + (context.CodigoVehiculo || "") + "</CodigoVehiculo>" +
            "<Chasis>" + (context.Chasis || "") + "</Chasis>" +
            "<Motor>" + (context.Motor || "") + "</Motor>" +
            "<Color>" + (context.Color || "") + "</Color>" +
            "<Anio>" + (context.Anio || "") + "</Anio>" +
            "<Tipo>" + (context.Tipo || "") + "</Tipo>" +
            "</Vehiculo>" +
            "<Dispositivo>" +
            "<Vid>" + (context.Vid || "") + "</Vid>" +
            "<IdProducto>" + (context.IdProducto || "") + "</IdProducto>" +
            "<DescProducto>" + (context.DescProducto || "") + "</DescProducto>" +
            "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
            "<MarcaDispositivo>" + (context.MarcaDispositivo || "") + "</MarcaDispositivo>" +
            "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
            "<ModeloDispositivo>" + (context.ModeloDispositivo || "") + "</ModeloDispositivo>" +
            "<Sn>" + (context.Sn || "") + "</Sn>" +
            "<Imei>" + (context.Imei || "") + "</Imei>" +
            "<NumeroCamaras>" + (context.NumeroCamaras || "") + "</NumeroCamaras>" +
            "<DireccionMac>" + (context.DireccionMac || "") + "</DireccionMac>" +
            "<Icc>" + (context.Icc || "") + "</Icc>" +
            "<NumeroCelular>" + (context.NumeroCelular || "") + "</NumeroCelular>" +
            "<Operadora>" + (context.Operadora || "") + "</Operadora>" +
            "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +
           // "<ServiciosInstalados>" + context.ServiciosInstalados + "</ServiciosInstalados>" +
            "<ServiciosInstalados>"+
            "<Servicio>"+
            "<CodServicio>" + (context.CodServicio || "") + "</CodServicio>" +
            "<DescripcionServicio>" + (context.DescripcionServicio || "") + "</DescripcionServicio>" +
            "<FechaInicioServicio>" + (context.FechaInicioServicio || "") + "</FechaInicioServicio>" +
            "<FechaFinServicio>" + (context.FechaFinServicio || "") + "</FechaFinServicio>" +
            "<EstadoServicio>" + (context.EstadoServicio || "") + "</EstadoServicio>" +
            "</Servicio>"+
            "</ServiciosInstalados>" +
            "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
            "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
            "</Dispositivo>" +
            "<Propietario>" +
            "<IdentificadorPropietario>" + (context.IdentificadorPropietario || "") + "</IdentificadorPropietario>" +
            "<NombrePropietario>" + (context.NombrePropietario || "") + "</NombrePropietario>" +
            "<ApellidosPropietario>" + (context.ApellidosPropietario || "") + "</ApellidosPropietario>" +
            "<DireccionPropietario>" + (context.DireccionPropietario || "") + "</DireccionPropietario>" +
            "<ConvencionalPropietario>" + (context.ConvencionalPropietario || "") + "</ConvencionalPropietario>" +
            "<CelularPropietario>" + (context.CelularPropietario || "") + "</CelularPropietario>" +
            "<EmailPropietario>" + (context.EmailPropietario || "") + "</EmailPropietario>" +
            "</Propietario>" +
            "<Monitor>" +
            "<IdentificadorMonitorea>" + (context.IdentificadorMonitorea || "") + "</IdentificadorMonitorea>" +
            "<NombreMonitorea>" + (context.NombreMonitorea || "") + "</NombreMonitorea>" +
            "<ApellidosMonitorea>" + (context.ApellidosMonitorea || "") + "</ApellidosMonitorea>" +
            "<DireccionMonitorea>" + (context.DireccionMonitorea || "") + "</DireccionMonitorea>" +
            "<ConvencionalMonitorea>" + (context.ConvencionalMonitorea || "") + "</ConvencionalMonitorea>" +
            "<CelularMonitorea>" + (context.CelularMonitorea || "") + "</CelularMonitorea>" +
            "<EmailMonitorea>" + (context.EmailMonitorea || "") + "</EmailMonitorea>" +
            "</Monitor>" +
            "<Concesionario>" +
            "<IdentificadorConcesionario>" + (context.IdentificadorConcesionario || "") + "</IdentificadorConcesionario>" +
            "<RazonSocialConcesionario>" + (context.RazonSocialConcesionario || "") + "</RazonSocialConcesionario>" +
            "<DireccionConcesionario>" + (context.DireccionConcesionario || "") + "</DireccionConcesionario>" +
            "<ConvencionalConcesionario>" + (context.ConvencionalConcesionario || "") + "</ConvencionalConcesionario>" +
            "<CelularConcesionario>" + (context.CelularConcesionario || "") + "</CelularConcesionario>" +
            "<EmailConcesionario>" + (context.EmailConcesionario || "") + "</EmailConcesionario>" +
            "</Concesionario>" +
            "<Financiera>" +
            "<IdentificadorFinanciera>" + (context.IdentificadorFinanciera || "") + "</IdentificadorFinanciera>" +
            "<RazonSocialFinanciera>" + (context.RazonSocialFinanciera || "") + "</RazonSocialFinanciera>" +
            "<DireccionFinanciera>" + (context.DireccionFinanciera || "") + "</DireccionFinanciera>" +
            "<ConvencionalFinanciera>" + (context.ConvencionalFinanciera || "") + "</ConvencionalFinanciera>" +
            "<CelularFinanciera>" + (context.CelularFinanciera || "") + "</CelularFinanciera>" +
            "<EmailFinanciera>" + (context.EmailFinanciera || "") + "</EmailFinanciera>" +
            "</Financiera>" +
            "<Aseguradora>" +
            "<IdentificadorAseguradora>" + (context.IdentificadorAseguradora || "") + "</IdentificadorAseguradora>" +
            "<RazonSocialAseguradora>" + (context.RazonSocialAseguradora || "") + "</RazonSocialAseguradora>" +
            "<DireccionAseguradora>" + (context.DireccionAseguradora || "") + "</DireccionAseguradora>" +
            "<ConvencionalAseguradora>" + (context.ConvencionalAseguradora || "") + "</ConvencionalAseguradora>" +
            "<CelularAseguradora>" + (context.CelularAseguradora || "") + "</CelularAseguradora>" +
            "<EmailAseguradora>" + (context.EmailAseguradora || "") + "</EmailAseguradora>" +
            "</Aseguradora>" +
            "<Convenio>" +
            "<IdentificadorConvenio>" + (context.IdentificadorConvenio || "") + "</IdentificadorConvenio>" +
            "<RazonSocialConvenio>" + (context.RazonSocialConvenio || "") + "</RazonSocialConvenio>" +
            "<DireccionConvenio>" + (context.DireccionConvenio || "") + "</DireccionConvenio>" +
            "<ConvencionalConvenio>" + (context.ConvencionalConvenio || "") + "</ConvencionalConvenio>" +
            "<CelularConvenio>" + (context.CelularConvenio || "") + "</CelularConvenio>" +
            "<EmailConvenio>" + (context.EmailConvenio || "") + "</EmailConvenio>"+
            "</Convenio></Orden></Ordenes>";
        return rowXml;
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});