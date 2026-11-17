/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 
 'N/record',
 'N/search',
 //'N/query', 
 //'SuiteScripts/IntegracionesHunter/PFlantillas/Controllers/coberturaController', 
 './HU_EC_CORE_IMPULSO_PLATAFORMA.js',
 'N/query',
 'N/runtime'], 
 //query, coberturaController
 function(log, record, search, _coreimp, query,  runtime) {
   //
  // TODO: Acciones
  const VEHICULO ='vehiculo';
  const VEHICULOCODIGO ='vehiculocodigo';
  const CLIENTE ='cliente';

  function _get(requestBody) {
    try{
      log.debug("PostCaso1", requestBody);
      let subsidiaria = runtime.getCurrentUser().subsidiary;
      //var datos= runtime.getCurrentUser();
      //var subsidiaria= datos.subsidiary;
      log.debug("...........subsidiary................", subsidiaria);
      //log.debug("...........datos................", datos);
      if (requestBody.familia=="SN"){
        requestBody.familia="SÑ";
      } 
      //log.error("...........requestBody................", requestBody.familia);  
      const data = PostCaso1(requestBody, subsidiaria);
      log.debug("Respuesta Post 1", data);
      return JSON.stringify({results: data});
    } catch (error) {
      log.debug("Error Post", { error: error, stack: error.stack });
      return JSON.stringify({ results: [] });
    }
  }
  
  const PostCaso1 = (requestBody, subsidiaria) => {
      try { 
        log.debug("PostCaso1", requestBody);
        let results = {};
        //data general
        if (requestBody.opcion == 100) {
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);  
          // Verifica si la consulta de familia es válida
          if (familiaConsulta?.id !== undefined && familiaConsulta.id !== null && familiaConsulta.id !== '') {
            // Consulta la cobertura en NetSuite
            let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
            let vehiculo = getVehiculo(requestBody.idbien, subsidiaria);
            let ordenServicio = getOrden(requestBody.idorden, subsidiaria); 
            //let clientemonitoreo = getCliente(coberturaConsulta.clientemonitoreo)
            let clientemonitoreo = getCliente(coberturaConsulta.clientemonitoreo ? coberturaConsulta.clientemonitoreo : coberturaConsulta.clientepropietario, subsidiaria);
            let clientepropietario = getCliente(coberturaConsulta.clientepropietario, subsidiaria)  
            let datosTecnicos = obtenerInformacionDispositivo(coberturaConsulta.numerodispositivo, subsidiaria);
            let infoTelematic =   datosTecnicos?.codmodelo ? ConsultaIDTelematic(datosTecnicos?.codmodelo, subsidiaria) : "";
            // // Nuevo
            let serviciosvehiculo = getVehiculoServicios(requestBody.idbien, subsidiaria);
            // log.debug("--", serviciosvehiculo);
            let datosComando  ="";
            let comandoUnificado ="";
            if (serviciosvehiculo !== undefined && serviciosvehiculo !== null && serviciosvehiculo !== '') {
              datosComando  = comandoServicio(serviciosvehiculo.infservicio, subsidiaria);
              comandoUnificado = filtrarYCombinarComandos(datosComando);
            }
            results={
              //familia: familiaConsulta,
              //cobertura: coberturaConsulta,
              //vehiculo: vehiculo,
              //datosTecnicos: datosTecnicos,
              //clientepropietario:clientepropietario,
              //ordenServicio:ordenServicio,
              //clientemonitoreo:clientemonitoreo,
              idvehiculo: vehiculo.idvehiculo,
              vehiculo: vehiculo.vehiculo,
              motor: vehiculo.motor,
              placa: vehiculo.placa,
              chasis: vehiculo.chasis,
              codmarca: vehiculo.codmarca,
              marca: vehiculo.marca,
              codmodelo: vehiculo.codmodelo,
              modelo: vehiculo.modelo,
              color: vehiculo.color,
              anio: vehiculo.anio,
              tipovehiculo: vehiculo.tipovehiculo,
              codigosys: vehiculo.codigosys,
              familiacodigo: familiaConsulta.codigo,
              familiadescripcion: familiaConsulta.name.split("-")[1].replace(' ', ''),             
              ejecutivareferencia: ordenServicio.ejecutivareferencia,
              location: ordenServicio.location,
              estadovehiculo: vehiculo.estadobien,
              vid: datosTecnicos.vid,
              codmarcadispositivo: datosTecnicos.codunidad,
              //marcadispositivo: datosTecnicos.unidad.split("-")[1],
              marcadispositivo: datosTecnicos.unidad ? (datosTecnicos.unidad.includes("-") ? datosTecnicos.unidad.split("-")[1] : datosTecnicos.unidad) : "",
              codmodelodispositivo : datosTecnicos.codmodelo,
              modelodispositivo: datosTecnicos.modelo,
              imei: datosTecnicos.imei,
              macAddress: datosTecnicos.macAddress,
              serieSIM: datosTecnicos.celularSIMCARD,
              noCelularSIM: datosTecnicos.noCelularSIM,
              serieDispositivo: datosTecnicos.nombre,
              operadora: datosTecnicos.operadora,
              clientepropietarioid:clientepropietario.identificacion,
              clientepropietarioprimernombre:clientepropietario?.primernombre ? clientepropietario?.primernombre : (clientepropietario?.compania || ""),
              clientepropietariosegundonombre:clientepropietario.segundonombre ,
              clientepropietarioprimerapellido:clientepropietario.apellidopaterno ,
              clientepropietariosegundoapellido: clientepropietario.apellidomaterno ,
              clientepropietariodireccion:clientepropietario.direccion.split("\n")[0],
              clientepropietarioconvencional:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.homephone,
              clientepropietariocelular:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.mobilephone,
              clientepropietarioemail:clientepropietario.email, 
              clientemonitoreoid:clientemonitoreo.identificacion,
              // clientemonitoreonombre:clientemonitoreo.primernombre +' '+ clientemonitoreo.segundonombre ,
              clientemonitoreoprimernombre:clientemonitoreo?.primernombre ? clientemonitoreo?.primernombre : (clientemonitoreo?.compania || ""),
              //clientemonitoreoapellido:clientemonitoreo.apellidopaterno +' '+ clientemonitoreo.apellidomaterno ,
              clientemonitoreosegundonombre:clientemonitoreo.segundonombre ,
              clientemonitoreoprimerapellido:clientemonitoreo.apellidopaterno ,
              clientemonitoreosegundoapellido: clientemonitoreo.apellidomaterno ,
              //clientemonitoreodireccion:clientemonitoreo?.direccion.split("\n")[0],
              clientemonitoreodireccion: clientemonitoreo ? clientemonitoreo?.direccion.split("\n")[0] : "",
              //clientemonitoreoconvencional:clientemonitoreo.telefono,
              clientemonitoreoconvencional:clientemonitoreo.telefono ? clientemonitoreo.telefono : clientemonitoreo.homephone,
              clientemonitoreocelular:clientemonitoreo.telefono ? clientemonitoreo.telefono : clientemonitoreo.mobilephone,
              // clientemonitoreocelular:clientemonitoreo.telefono,
              clientemonitoreoemail:clientemonitoreo.email,
              ordenservicio: ordenServicio.nOS.replace('OS', ''),
              //ordenservicio: ordenServicio.nOS,
              //comandoami: comandoUnificado,
              comandoami: comandoUnificado ? comandoUnificado.replace(' ', '') : comandoUnificado,
              comandopx: limpiarServicio(serviciosvehiculo?.servicio || ""),
              //comandopx: limpiarServicio(serviciosvehiculo?.camposervicio || ""),
              coberturainicial: coberturaConsulta?.coberturainicial ? coberturaConsulta.coberturainicial : "",
              coberturafinal:  coberturaConsulta?.coberturafinal ? coberturaConsulta.coberturafinal : "",
              //comandopx: (serviciosvehiculo?.servicio.replace(',','/') || ""),
              id_telematic_modelo: infoTelematic.idtelematicModelo,
              id_telematic_servidor: infoTelematic.idtelematicServidor,
              conveniovehiculo: '',
              rucaseguradora: '',
              aseguradora:'',
              diraseguradora: '',
              rucconcesionaria: '',
              concesionaria: '',
              dirconcesionaria: '',
              rucfinanciera: '',
              financiera: '',
              dirfinanciera: '',
            };
          }
        }

        //datos del clientes monitoreo
        if (requestBody.opcion == 200) {
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);
          let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
          let clientemonitoreo = getCliente(coberturaConsulta.clientemonitoreo ? coberturaConsulta.clientemonitoreo : coberturaConsulta.clientepropietario, subsidiaria );
          //let ordenServicio = obtenerInformacionItemOs(requestBody.idorden, requestBody.item);
          //let datacliente = getCliente(ordenServicio.clienteItem);
          let info = obtenerParametrizacionItem(requestBody.item, ['ADP'])[0];
          //let info = obtenerParametrizacionItem(28813, ['ADP'])[0];
          results={
            ID_CLIENTE:clientemonitoreo.identificacion,
            // clientemonitoreonombre:clientemonitoreo.primernombre +' '+ clientemonitoreo.segundonombre ,
            FIRST_NAME:clientemonitoreo?.primernombre ? clientemonitoreo?.primernombre +' '+ clientemonitoreo?.segundonombre  : (clientemonitoreo?.compania.split(" ")[0] +' '+ clientemonitoreo?.compania.split(" ")[1] || ""),
            LAST_NAME:clientemonitoreo?.apellidopaterno ? clientemonitoreo?.apellidopaterno +' '+ clientemonitoreo.apellidomaterno : (clientemonitoreo?.compania.split(" ")[2] +' '+ clientemonitoreo?.compania.split(" ")[3] || ""),
            //clientemonitoreosegundonombre:clientemonitoreo.segundonombre ,
            // LAST_NAME:clientemonitoreo.apellidopaterno ,
            // clientemonitoreosegundoapellido: clientemonitoreo.apellidomaterno ,
            //clientemonitoreodireccion:clientemonitoreo.direccion.split("\n")[0],
            //clientemonitoreoconvencional:clientemonitoreo.telefono,
            //clientemonitoreocelular:clientemonitoreo.telefono,
            //TELEFONO_CLIENTE:clientemonitoreo.telefono,
            TELEFONO_CLIENTE:clientemonitoreo.telefono ? clientemonitoreo.telefono : clientemonitoreo.homephone,
            USERNAME:clientemonitoreo.emailami, 
            //USERNAME:clientemonitoreo.email, 
            EMAIL:clientemonitoreo.email, 
            ACCION:info.Valor, 
            //  ordenServicio:ordenServicio,
            //  datacliente:datacliente,
            ID_TELEMATIC:clientemonitoreo.clientetelematic,
            TIPO:"1",
          }
        }

        //datos del clientes propietario
        if (requestBody.opcion == 201)  {
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);
          let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
          let clientepropietario = getCliente(coberturaConsulta.clientepropietario, subsidiaria)
          let info = obtenerParametrizacionItem(requestBody.item, ['ADP'])[0];
//log.debug("...........coberturaConsulta................", coberturaConsulta);
           //let ordenServicio = obtenerInformacionItemOs(requestBody.idorden, requestBody.item);
          //let datacliente = getCliente(ordenServicio.clienteItem);
          results = {
           // clientepropietario:clientepropietario,
            ID_CLIENTE:clientepropietario.identificacion,
            // clientepropietarioprimernombre:clientepropietario?.primernombre ? clientepropietario?.primernombre : (clientepropietario?.compania || ""),
            // clientepropietariosegundonombre:clientepropietario.segundonombre ,
            // clientepropietarioprimerapellido:clientepropietario.apellidopaterno ,
            // clientepropietariosegundoapellido: clientepropietario.apellidomaterno ,
            FIRST_NAME:clientepropietario?.primernombre ? clientepropietario?.primernombre  +' '+ clientepropietario?.segundonombre  : (clientepropietario?.compania.split(" ")[0] +' '+ clientepropietario?.compania.split(" ")[1] || ""),
            LAST_NAME:clientepropietario?.apellidopaterno ? clientepropietario?.apellidopaterno +' '+ clientepropietario.apellidomaterno: (clientepropietario?.compania.split(" ")[2] +' '+ clientepropietario?.compania.split(" ")[3] || ""),
            //clientepropietariodireccion:clientepropietario.direccion.split("\n")[0],
            //clientepropietarioconvencional:clientepropietario.telefono,
            //TELEFONO_CLIENTE:clientepropietario.telefono,
            TELEFONO_CLIENTE:clientepropietario.telefono ? clientepropietario.telefono.replace('+593',''): clientepropietario.homephone,
            //USERNAME:clientepropietario.email, 
            USERNAME:clientepropietario.emailami, 
            EMAIL:clientepropietario.email, 
            //clientepropietarioemail:clientepropietario.email,
            //SUPPORT:"soporteami@carsegsa.com", 
           // TELEFONO:"0985454544",    
           // CELULAR:"046004640", 
            //COMPANY:"0991259546001",
            ACCION:info.Valor, 
            ID_TELEMATIC:clientepropietario.clientetelematic,
            TIPO:"1",
          }
        }

        //datos del dispositivo
        if (requestBody.opcion == 202 )  {
         // log.debug('requestBody.familia...................', requestBody.familia);
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);
          //log.debug('requestBody.idbien...................', requestBody.idbien);
          //log.debug('requestBody.idbien...................', requestBody.idbien);
          //log.debug('familiaConsulta.id...................', familiaConsulta.id);
          let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
          // let coberturaConsulta = [];
          // if (requestBody.opcion == 202 )  {
          //   coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
          // }
          // if (requestBody.opcion == 214)  {
          //   coberturaConsulta = consultaCoberturaDesins(requestBody.idbien, familiaConsulta.id, subsidiaria);
          // }
          log.debug('coberturaConsulta...................', coberturaConsulta);
          let datosTecnicos = obtenerInformacionDispositivo(coberturaConsulta.numerodispositivo, subsidiaria);
          //log.debug('datosTecnicos...................', datosTecnicos);
          let infoTelematic =   datosTecnicos?.codmodelo ? ConsultaIDTelematic(datosTecnicos?.codmodelo, subsidiaria) : "";
          //var coberturafecha="1900-01-01T05:00:00-05:00";
          var coberturafecha="1900-01-01";
          if (coberturaConsulta.coberturafinal) {
          let partesFecha = coberturaConsulta.coberturafinal.split("/"); // Separa la fecha en partes (día, mes, año)
          let fechaObj = new Date(partesFecha[2], partesFecha[1] -1, partesFecha[0]);
          let valorfecha = fechaObj.toISOString().split("T");
          //coberturafecha=valorfecha[0]+"T05:00:00-05:00";
          coberturafecha=valorfecha[0];
        } 
          //let fecha =fechaObj.split("T");
        results={
            //modelo: datosTecnicos,
          serie: datosTecnicos.serieDispositivoText,
          vid: datosTecnicos.vid,
          cobertura: coberturafecha,
          //partesFecha:partesFecha,
          noCelularSIM: datosTecnicos.noCelularSIM,
          id_telematic_modelo: infoTelematic.idtelematicModelo,
          id_telematic_servidor: infoTelematic.idtelematicServidor,
        }
      }

        //datos del vehiculo
        if (requestBody.opcion == 203) {
          let vehiculo = getVehiculo(requestBody.idbien, subsidiaria);
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);
          // Nuevo
          let serviciosvehiculo = getVehiculoServicios(requestBody.idbien, subsidiaria);
          // log.debug("--", serviciosvehiculo);
          let datosComando  ="";
          let comandoUnificado ="";
          if (serviciosvehiculo !== undefined && serviciosvehiculo !== null && serviciosvehiculo !== '') {
            datosComando  = comandoServicio(serviciosvehiculo.infservicio, subsidiaria);
            comandoUnificado = filtrarYCombinarComandos(datosComando);
          }
          results={
           // vehiculo: vehiculo,
            idvehiculo: vehiculo.idvehiculo,
            vehiculo: vehiculo.vehiculo,
            marca: vehiculo.marca,
            modelo:vehiculo.modelo,
            chasis:vehiculo.chasis,
            motor:vehiculo.motor,
            placa:vehiculo.placa,
            color:vehiculo.color,
            tipo:vehiculo.tipo,
            tipoami:vehiculo.tipoami,
            anio:vehiculo.anio,
            codigosys: vehiculo.codigosys,
            familiacodigo: familiaConsulta.codigo,
            // familiadescripcion: familiaConsulta.name.split("-")[1],
            familiadescripcion: familiaConsulta.name.split("-")[1].replace(' ', ''),
            //comandoami: comandoUnificado,
            comandoami: comandoUnificado ? comandoUnificado.replace(' ', '') : comandoUnificado,
            concesionarios: vehiculo.concesionarios.split(" ")[0],
            ID_TELEMATIC:vehiculo.vehiculotelematic,
          }
        }

        //datos del clientes nuevo por cambio de propietario 
        if (requestBody.opcion == 204) {
          let ordenServicio = obtenerInformacionItemOs(requestBody.idorden, requestBody.item, subsidiaria);
          //let datacliente = getCliente(ordenServicio.clienteItem);
          let datacliente = getCliente(ordenServicio.clienteItem ? ordenServicio.clienteItem : ordenServicio.cliente , subsidiaria);
          let info = obtenerParametrizacionItem(requestBody.item, ['ADP'])[0];
          results = {
            ID_CLIENTE:datacliente.identificacion,
            //ordenServicio:ordenServicio,
            //datacliente:datacliente,
            FIRST_NAME:datacliente?.primernombre ? datacliente?.primernombre +' '+ datacliente?.segundonombre  : (datacliente?.compania.split(" ")[0] +' '+ datacliente?.compania.split(" ")[1] || ""),
            LAST_NAME:datacliente?.apellidopaterno ? datacliente?.apellidopaterno +' '+ datacliente.apellidomaterno : (datacliente?.compania.split(" ")[2] +' '+ datacliente?.compania.split(" ")[3] || ""),
            //TELEFONO_CLIENTE:datacliente.telefono,
            TELEFONO_CLIENTE:datacliente.telefono ? datacliente.telefono : datacliente.homephone,
            //USERNAME:datacliente.email, 
            USERNAME:datacliente.emailami, 
            EMAIL:datacliente.email, 
            ACCION:info.Valor, 
            ID_TELEMATIC:datacliente.clientetelematic,
            TIPO:"1",
            //ACCION2:info.Param, 
          }
        }

        //datos del clientes anterior por cambio de propietario 
        if (requestBody.opcion == 205) {
          let ordenServicio = obtenerInformacionItemOs(requestBody.idorden, requestBody.item, subsidiaria);
          let datacliente = getCliente(ordenServicio.cliente, subsidiaria);
          let info = obtenerParametrizacionItem(requestBody.item, ['ADP'])[0];
          results = {
            ID_CLIENTE:datacliente.identificacion,
            FIRST_NAME:datacliente?.primernombre ? datacliente?.primernombre +' '+ datacliente?.segundonombre  : (datacliente?.compania.split(" ")[0] +' '+ datacliente?.compania.split(" ")[1] || ""),
            LAST_NAME:datacliente?.apellidopaterno ? datacliente?.apellidopaterno +' '+ datacliente.apellidomaterno : (datacliente?.compania.split(" ")[2] +' '+ datacliente?.compania.split(" ")[3] || ""),
            //TELEFONO_CLIENTE:datacliente.telefono,
            TELEFONO_CLIENTE:datacliente.telefono ? datacliente.telefono : datacliente.homephone,
            //USERNAME:datacliente.email, 
            USERNAME:datacliente.emailami,
            EMAIL:datacliente.email, 
            ACCION:info.Valor, 
            ID_TELEMATIC:datacliente.clientetelematic,
            TIPO:"1",
          }
        }

        //revisar los correo de AMI
        //consulta de cliente por codigo interno de netsuite
        if (requestBody.opcion == 206) {
          let cliente = getCliente(requestBody.clienteid, subsidiaria)
          results={
            ID_CLIENTE:cliente.identificacion,
            FIRST_NAME:cliente?.primernombre ? cliente?.primernombre  +' '+ cliente?.segundonombre  : (cliente?.compania.split(" ")[0] +' '+ cliente?.compania.split(" ")[1] || ""),
            LAST_NAME:cliente?.apellidopaterno ? cliente?.apellidopaterno +' '+ cliente.apellidomaterno: (cliente?.compania.split(" ")[2] +' '+ cliente?.compania.split(" ")[3] || ""),
            //TELEFONO_CLIENTE:cliente.telefono,
            TELEFONO_CLIENTE:cliente.telefono ? cliente.telefono : cliente.homephone,
             //USERNAME:cliente.email, 
            USERNAME:cliente.emailami,
            EMAIL:cliente.email, 
            ID_TELEMATIC:cliente.clientetelematic,
            TIPO:"1",
          }
        }

        //consulta de vehiculo por codigo interno de netsuite
        if (requestBody.opcion == 207) {
          let vehiculo = getVehiculo(requestBody.idbien, subsidiaria);
          results = {
            idvehiculo: vehiculo.idvehiculo,
            vehiculo: vehiculo.vehiculo,
            marca: vehiculo.marca,
            modelo:vehiculo.modelo,
            chasis:vehiculo.chasis,
            motor:vehiculo.motor,
            placa:vehiculo.placa,
            color:vehiculo.color,
            tipo:vehiculo.tipo,
            anio:vehiculo.anio,
            codigosys: vehiculo.codigosys,
            concesionarios: vehiculo.concesionarios.split(" ")[0],
            ID_TELEMATIC:vehiculo.vehiculotelematic,
          }
        }

        //data general para instalacion PX or data desintalacion
        if (requestBody.opcion == 208 || requestBody.opcion == 212 || requestBody.opcion == 213)  {
          if (requestBody.familia=="SÑ") {
            requestBody.familia="SN";
          }  
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);    
          //log.debug("..........familiaConsulta..............", requestBody.familia);  
          //log.debug("..........familiaConsulta..............", familiaConsulta);  
          //let familiaConsulta = consultaFamiliaNetsuiteNuevo(requestBody.item);  
          // Verifica si la consulta de familia es válida
          if (familiaConsulta?.id !== undefined && familiaConsulta.id !== null && familiaConsulta.id !== '') {
            // Consulta la cobertura en NetSuite
            //let coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
            let coberturaConsulta = [];
            if (requestBody.opcion == 208 )  {
              coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
            }
            if (requestBody.opcion == 212)  {
              coberturaConsulta = consultaCoberturaDesins(requestBody.idbien, familiaConsulta.id, subsidiaria);
            }
            if (requestBody.opcion == 213)  {
              coberturaConsulta = consultaCoberturaGarantia(requestBody.idbien, familiaConsulta.id, subsidiaria);
            }      
            //log.debug("..........familiaConsulta..............", requestBody.idbien); 
            //log.debug("..........familiaConsulta..............", familiaConsulta.id); 
            log.debug("..........coberturaConsulta..............", coberturaConsulta); 
            let vehiculo = getVehiculoCanales(requestBody.idbien, subsidiaria);
            //log.debug("..........vehiculo..............", vehiculo); 
            let ordenServicio = [];
            if  (requestBody.idorden!="0")
            {
              ordenServicio = getOrdenCanales(requestBody.idorden, subsidiaria);
            }
            let clientemonitoreo = [];
            let clientepropietario =[];
            let datosTecnicos=[];       
            if (typeof coberturaConsulta == "undefined")
            {
              log.debug('............CoberturaVacia.....................',coberturaConsulta);
            } else {
              clientemonitoreo = getCliente(coberturaConsulta.clientemonitoreo ? coberturaConsulta.clientemonitoreo : coberturaConsulta.clientepropietario, subsidiaria);
              clientepropietario = getCliente(coberturaConsulta.clientepropietario, subsidiaria);
              datosTecnicos = obtenerInformacionDispositivo(coberturaConsulta.numerodispositivo, subsidiaria);  
            }               
            log.debug("..........datosTecnicos..............", datosTecnicos); 
            //let serviciosvehiculo = getVehiculoServicios(requestBody.idbien, subsidiaria);            
            let serviciosvehiculo = getVehiculoServiciosTrabajo(requestBody.idbien, subsidiaria, requestBody.idorden);          
            //log.debug(".....................",ordenServicio);
            //log.debug("-----------------", serviciosvehiculo);
            results={
              //familia: familiaConsulta,
              //cobertura: coberturaConsulta,
              //vehiculo: vehiculo,
              //datosTecnicos: datosTecnicos,
              //clientepropietario:clientepropietario,
              //ordenServicio:ordenServicio,
              //clientemonitoreo:clientemonitoreo,
              idvehiculo: vehiculo.idvehiculo,
              vehiculo: vehiculo.vehiculo,
              motor: vehiculo.motor,
              placa: vehiculo.placa,
              chasis: vehiculo.chasis,
              codmarca: vehiculo.codmarca,
              marca: vehiculo.marca,
              codmodelo: vehiculo.codmodelo,
              modelo: vehiculo.modelo,
              color: vehiculo.color,
              anio: vehiculo.anio,
              tipovehiculo: vehiculo.tipovehiculo,
              codigosys: vehiculo.codigosys,
              familiacodigo: familiaConsulta.codigo,
              familiadescripcion: familiaConsulta.name.split("-")[1].replace(' ', ''),
              ejecutivareferencia: ordenServicio?.ejecutivareferencia ? ordenServicio?.ejecutivareferencia : "" ,
              location: ordenServicio?.location ? ordenServicio?.location : "" ,
              estadovehiculo: vehiculo.estadobien,             
              vid: datosTecnicos?.vid ? datosTecnicos?.vid : "",
              codmarcadispositivo: datosTecnicos?.codunidad ? datosTecnicos?.codunidad : "",
              //marcadispositivo: datosTecnicos.unidad.split("-")[1],
              marcadispositivo: datosTecnicos?.unidad ? (datosTecnicos?.unidad.includes("-") ? datosTecnicos?.unidad.split("-")[1] : datosTecnicos?.unidad) : "",
              codmodelodispositivo : datosTecnicos?.codmodelo ? datosTecnicos?.codmodelo : "",
              modelodispositivo: datosTecnicos?.modelo ? datosTecnicos?.modelo : "",
              imei: datosTecnicos?.imei ? datosTecnicos?.imei : "",
              macAddress: datosTecnicos?.macAddress ? datosTecnicos?.macAddress : "",
              serieSIM: datosTecnicos?.celularSIMCARD ? datosTecnicos?.celularSIMCARD : "",
              noCelularSIM: datosTecnicos?.noCelularSIM ? datosTecnicos?.noCelularSIM : "",
              serieDispositivo: datosTecnicos?.nombre ? datosTecnicos?.nombre : "",
              operadora: datosTecnicos?.operadora ? datosTecnicos?.operadora : "",
              clientepropietarioid:clientepropietario.identificacion,
              clientepropietarioprimernombre:clientepropietario?.primernombre ? clientepropietario?.primernombre : (clientepropietario?.compania || ""),
              clientepropietariosegundonombre:clientepropietario.segundonombre ,
              clientepropietarioprimerapellido:clientepropietario.apellidopaterno ,
              clientepropietariosegundoapellido: clientepropietario.apellidomaterno ,
              clientepropietariodireccion:clientepropietario?.direccion ? clientepropietario?.direccion.split("\n")[0] :"",
              clientepropietarioconvencional:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.homephone,
              clientepropietariocelular:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.mobilephone,
              clientepropietarioemail:clientepropietario?.email ? clientepropietario?.email : "",
              clientemonitoreoid:clientemonitoreo?.identificacion ? clientemonitoreo?.identificacion :"",
              // clientemonitoreonombre:clientemonitoreo.primernombre +' '+ clientemonitoreo.segundonombre ,
              clientemonitoreoprimernombre:clientemonitoreo?.primernombre ? clientemonitoreo?.primernombre : (clientemonitoreo?.compania || ""),
              //clientemonitoreoapellido:clientemonitoreo.apellidopaterno +' '+ clientemonitoreo.apellidomaterno ,
              clientemonitoreosegundonombre:clientemonitoreo?.segundonombre ? clientemonitoreo?.segundonombre : "",
              clientemonitoreoprimerapellido:clientemonitoreo?.apellidopaterno ? clientemonitoreo?.apellidopaterno : "",
              clientemonitoreosegundoapellido: clientemonitoreo?.apellidomaterno ? clientemonitoreo?.apellidomaterno : "",
              //clientemonitoreodireccion:clientemonitoreo?.direccion.split("\n")[0],
              clientemonitoreodireccion: clientemonitoreo?.direccion ? clientemonitoreo?.direccion.split("\n")[0] : "",
              //clientemonitoreoconvencional:clientemonitoreo.telefono,
              clientemonitoreoconvencional:clientemonitoreo?.telefono ? clientemonitoreo?.telefono : clientemonitoreo?.homephone,
              clientemonitoreocelular:clientemonitoreo?.telefono ? clientemonitoreo?.telefono : clientemonitoreo?.mobilephone,
              // clientemonitoreocelular:clientemonitoreo.telefono,
              clientemonitoreoemail:clientemonitoreo?.email ? clientemonitoreo?.email : "",
              //ordenservicio: ordenServicio?.nOS.replace('OS', ''),
              ordenservicio: ordenServicio?.nOS ?  ordenServicio?.nOS.replace('OS', '') : "",           
              //comandoami: comandoUnificado ? comandoUnificado.replace(' ', '') : comandoUnificado,
              comandoami:"",
              // comandopx: (serviciosvehiculo?.servicio.replace(',','/') || ""),
              //comandopx: serviciosvehiculo?.camposervicio ? obtenerValoresUnicos( serviciosvehiculo?.camposervicio ).replace(/,/g, '/') : "",
              //comandopx: (serviciosvehiculo?.camposervicio.replace(/,/g, '/') || ""),
              comandopx: serviciosvehiculo?.camposervicio ? serviciosvehiculo?.camposervicio.replace(/,/g, '/') : "",
              coberturainicial: coberturaConsulta?.coberturainicial ? coberturaConsulta.coberturainicial : "",
              coberturafinal:  coberturaConsulta?.coberturafinal ? coberturaConsulta.coberturafinal : "",
              //id_telematic_modelo: infoTelematic.idtelematicModelo,
              //id_telematic_servidor: infoTelematic.idtelematicServidor,
              conveniovehiculo: vehiculo.conveniovehiculo,
              rucaseguradora: vehiculo?.aseguradora ? procesarDato(vehiculo?.aseguradora).numero : "",
              //procesarDato(vehiculo?.aseguradora).numero,
              aseguradora: vehiculo?.aseguradora ? procesarDato(vehiculo?.aseguradora).nombre : "",
              //procesarDato(vehiculo?.aseguradora).nombre,
              diraseguradora: vehiculo?.diraseguradora,
              rucconcesionaria: vehiculo?.concesionario ? procesarDato(vehiculo?.concesionario).numero : "",
              //procesarDato(vehiculo?.concesionario).numero,
              concesionaria:  vehiculo?.concesionario ? procesarDato(vehiculo?.concesionario).nombre : "",
              //procesarDato(vehiculo?.concesionario).nombre,
              dirconcesionaria: vehiculo?.dirconcesionario,
              rucfinanciera: vehiculo?.financiera ? procesarDato(vehiculo?.financiera).numero : "",
              //procesarDato(vehiculo?.financiera).numero,
              financiera: vehiculo?.financiera ? procesarDato(vehiculo?.financiera).nombre : "",
              //procesarDato(vehiculo?.financiera).nombre,
              dirfinanciera: vehiculo?.dirfinanciera,
            };
          }
        }    
        
        //ACTUALIZA DATOS DE VEHICULO PLATAFORMA
        if (requestBody.opcion == 209) {
          let idBien = requestBody.idbien;
          var plataforma =_coreimp.actualizarBien(idBien);
          results= plataforma.results
        }  

        //ACTUALIZA DATOS DE CLIENTE PLATAFORMA
        if (requestBody.opcion == 210) {
          let idCliente = requestBody.clienteid;
          var plataforma =_coreimp.actualizarCliente(idCliente);
          results= plataforma.results
        }  

         //data general para cambio de propietario PX
        if (requestBody.opcion == 211) {
          //log.debug("..........subsidiaria....111..........", subsidiaria);  
            let vehiculo = getVehiculoCanales(requestBody.idbien, subsidiaria);
            let ordenServicio = [];
            if  (requestBody.idorden!="0")
            {
              ordenServicio = getOrdenCanales(requestBody.idorden, subsidiaria);
            }
            //log.debug("..........vehiculo..............", vehiculo);  
            //let clientemonitoreo = [];
            //let clientepropietario =[]; 
            let clientemonitoreo = getCliente(vehiculo.propietario, subsidiaria);
            let clientepropietario = getCliente(vehiculo.propietario, subsidiaria);           
           //let serviciosvehiculo = getVehiculoServicios(requestBody.idbien, subsidiaria);
            let serviciosvehiculo = getVehiculoServiciosTrabajo(requestBody.idbien, subsidiaria, requestBody.idorden);
            //log.debug(vehiculo);
            results={
              //familia: familiaConsulta,
              //cobertura: coberturaConsulta,
              //propietario: vehiculo.propietario,
              //datosTecnicos: datosTecnicos,
              //clientepropietario:clientepropietario,
              //ordenServicio:ordenServicio,
              //clientemonitoreo:clientemonitoreo,
              idvehiculo: vehiculo.idvehiculo,
              vehiculo: vehiculo.vehiculo,
              motor: vehiculo.motor,
              placa: vehiculo.placa,
              chasis: vehiculo.chasis,
              codmarca: vehiculo.codmarca,
              marca: vehiculo.marca,
              codmodelo: vehiculo.codmodelo,
              modelo: vehiculo.modelo,
              color: vehiculo.color,
              anio: vehiculo.anio,
              tipovehiculo: vehiculo.tipovehiculo,
              codigosys: vehiculo.codigosys,
              familiacodigo: "",
              familiadescripcion: "",            
              vid: "",
              codmarcadispositivo: "",
              marcadispositivo: "",
              codmodelodispositivo : "",
              modelodispositivo: "",
              imei: "",
              macAddress: "",
              serieSIM: "",
              noCelularSIM: "",
              serieDispositivo: "",
              operadora: "",
              ejecutivareferencia: ordenServicio.ejecutivareferencia,
              location: ordenServicio.location,
              estadovehiculo: vehiculo.estadobien,
              clientepropietarioid:clientepropietario.identificacion,
              clientepropietarioprimernombre:clientepropietario?.primernombre ? clientepropietario?.primernombre : (clientepropietario?.compania || ""),
              clientepropietariosegundonombre:clientepropietario.segundonombre ,
              clientepropietarioprimerapellido:clientepropietario.apellidopaterno ,
              clientepropietariosegundoapellido: clientepropietario.apellidomaterno ,
              clientepropietariodireccion:clientepropietario?.direccion ? clientepropietario?.direccion.split("\n")[0] :"",
              clientepropietarioconvencional:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.homephone,
              clientepropietariocelular:clientepropietario.telefono ? clientepropietario.telefono : clientepropietario.mobilephone,
              clientepropietarioemail:clientepropietario?.email ? clientepropietario?.email : "",
              clientemonitoreoid:clientemonitoreo?.identificacion ? clientemonitoreo?.identificacion :"",
              clientemonitoreoprimernombre:clientemonitoreo?.primernombre ? clientemonitoreo?.primernombre : (clientemonitoreo?.compania || ""),
              clientemonitoreosegundonombre:clientemonitoreo?.segundonombre ? clientemonitoreo?.segundonombre : "",
              clientemonitoreoprimerapellido:clientemonitoreo?.apellidopaterno ? clientemonitoreo?.apellidopaterno : "",
              clientemonitoreosegundoapellido: clientemonitoreo?.apellidomaterno ? clientemonitoreo?.apellidomaterno : "",
              clientemonitoreodireccion: clientemonitoreo?.direccion ? clientemonitoreo?.direccion.split("\n")[0] : "",
              clientemonitoreoconvencional:clientemonitoreo?.telefono ? clientemonitoreo?.telefono : clientemonitoreo?.homephone,
              clientemonitoreocelular:clientemonitoreo?.telefono ? clientemonitoreo?.telefono : clientemonitoreo?.mobilephone,
              clientemonitoreoemail:clientemonitoreo?.email ? clientemonitoreo?.email : "",
              ordenservicio: ordenServicio.nOS ?  ordenServicio?.nOS.replace('OS', '') : "",
              comandoami:"",
              //comandopx: (serviciosvehiculo?.servicio.replace(/,/g, '/') || ""),
              //comandopx: serviciosvehiculo?.camposervicio ? obtenerValoresUnicos( serviciosvehiculo?.camposervicio ).replace(/,/g, '/') : "",
              //comandopx: (serviciosvehiculo?.camposervicio.replace(/,/g, '/') || ""),
              comandopx: serviciosvehiculo?.camposervicio ? serviciosvehiculo?.camposervicio.replace(/,/g, '/') : "",
              coberturainicial:  "",
              coberturafinal:  "",
              conveniovehiculo: vehiculo.conveniovehiculo,
              rucaseguradora: vehiculo?.aseguradora ? procesarDato(vehiculo?.aseguradora).numero : "",
              //procesarDato(vehiculo?.aseguradora).numero,
              aseguradora: vehiculo?.aseguradora ? procesarDato(vehiculo?.aseguradora).nombre : "",
              //procesarDato(vehiculo?.aseguradora).nombre,
              diraseguradora: vehiculo?.diraseguradora,
              rucconcesionaria: vehiculo?.concesionario ? procesarDato(vehiculo?.concesionario).numero : "",
              //procesarDato(vehiculo?.concesionario).numero,
              concesionaria: vehiculo?.concesionario ? procesarDato(vehiculo?.concesionario).nombre : "",
              //procesarDato(vehiculo?.concesionario).nombre,
              dirconcesionaria: vehiculo?.dirconcesionario,
              rucfinanciera: vehiculo?.financiera ? procesarDato(vehiculo?.financiera).numero : "",
              //procesarDato(vehiculo?.financiera).numero,
              financiera: vehiculo?.financiera ? procesarDato(vehiculo?.financiera).nombre : "",
              //procesarDato(vehiculo?.financiera).nombre,
              dirfinanciera: vehiculo?.dirfinanciera,
            };
          //}
        }          

        //datos de la orden de servicio
        if (requestBody.opcion == 215) {        
          //let ordenServicio = [];
          let ordenServicio = getOrdenCanales(requestBody.idorden, subsidiaria);
          let vehiculo = getVehiculoCanales(ordenServicio.idbien, subsidiaria);
          log.debug("..........vehiculo..............", vehiculo); 
          log.debug("..........ordenServicio..............", ordenServicio);  
          results={
            ordenservicio: ordenServicio?.nOS ?  ordenServicio?.nOS : "",
            idvehiculo: vehiculo.idvehiculo,
            vehiculo: vehiculo.vehiculo,
            motor: vehiculo.motor,
            chasis: vehiculo.chasis,           
          };
        }

         //datos de la item de orden
        if (requestBody.opcion == 216) {
          //let ordenServicio = [];
          let Item = obtenerItemParametrizadoPorBien(requestBody.idorden, subsidiaria);
          log.debug("..........Item..............", Item);            
          results=Item;
        }

        //datos del clientes para huntermed
        if (requestBody.opcion == 217) {
          let datacliente = getClientenetsuite(requestBody.cliente , subsidiaria);
          let ordenServicio = getOrdenEjecutiva(requestBody.idorden, subsidiaria);
          let ejecutiva=ConsultaEjecutiva(ordenServicio.ejecutivareId, subsidiaria);
          let itemOS = [];
          if (requestBody.accion =="001"){
            itemOS = obtenerItemOS(requestBody.idorden, subsidiaria, "28797");
            if (typeof itemOS == "undefined")
            {
              log.debug('............obtenerItemOSacia.......INS..............',itemOS);
              itemOS = obtenerItemOS(requestBody.idorden, subsidiaria, "28802");
            } 
          } 
          if (requestBody.accion =="004"){
            itemOS = obtenerItemOS(requestBody.idorden, subsidiaria, "28798");
            if (typeof itemOS == "undefined")
            {
              log.debug('............obtenerItemOSacia....RENO.................',itemOS);
              itemOS = obtenerItemOS(requestBody.idorden, subsidiaria, "28803");
            } 
          } 
          log.debug("..........ordenServicio..............", ordenServicio);  
          log.debug("..........itemOS..............", itemOS); 
          log.debug("..........ejecutiva..............", ejecutiva);       
          results = {
            identification:datacliente.identificacion,
            firstname:datacliente?.primernombre ? datacliente?.primernombre +' '+ datacliente?.segundonombre  : (datacliente?.compania.split(" ")[0] +' '+ datacliente?.compania.split(" ")[1] || ""),
            lastname:datacliente?.apellidopaterno ? datacliente?.apellidopaterno +' '+ datacliente.apellidomaterno : (datacliente?.compania.split(" ")[2] +' '+ datacliente?.compania.split(" ")[3] || ""),
            birthdate:"",    
            address:datacliente?.direccion ? datacliente.direccion : "",
            email:datacliente?.email ? datacliente.email : "",
            amount: itemOS?.amount ? itemOS.amount : "",
            certificate_number:"HUNT" + requestBody.idorden, 
            gender:"", 
            city:datacliente?.oficina ? datacliente.oficina : "",
            civil_status:"", 
            identification_type:datacliente?.tipoIdentificacion ? datacliente.tipoIdentificacion : "",
            telephone:datacliente?.telefono ? datacliente.telefono : "",
            movil:datacliente?.homephone ? datacliente.homephone : datacliente?.mobilephone ? datacliente.mobilephone : "",
            payment_type:"Anual", 
            product_code:"HUNT", 
            plan_code:"", 
            ejecutivaIdentificacion:ejecutiva?.Identificacion ? ejecutiva.Identificacion : "",
            ejecutivacodigo:ejecutiva?.Codigo ? ejecutiva.Codigo : "",
            localidad:"", 
            departamento:"", 
          }
        }        
        
        //Cconsulta datos de Orden
        if (requestBody.opcion == 218) {
          let ordenServicio = getOrden(requestBody.idorden, subsidiaria); 
          let datacliente = getCliente(ordenServicio.entity , subsidiaria);
          log.debug('............ordenServicio..............',ordenServicio);
          results = {
            //ordenServicio: ordenServicio,
            //datacliente: datacliente
            identificacion: datacliente.identificacion,
            email:datacliente.email,
            idcliente: datacliente.idcliente,
            cliente: datacliente.cliente,
            idbien: ordenServicio.idbien,
            bien: ordenServicio.nombre,
            location:ordenServicio.location,
            idorden:requestBody.idorden,
            nOS:ordenServicio.nOS
          }
        } 
        
         //Consulta datos de cliente para anular turno
        if (requestBody.opcion == 219) {
            let dataturno = [];
            let datacliente = [];
            let datarecep = [];
            dataturno = getTurnoEvent (requestBody.idturno , subsidiaria)
            if (typeof dataturno == "undefined")
            {
              datacliente = [];
              datarecep = [];
            } else {
              datacliente = getCliente(requestBody.clienteid , subsidiaria);
              datarecep= getCalendarEvent(dataturno.transactionid , subsidiaria);
            } 
            results = {
              turnoid: dataturno?.id ? dataturno.id : "",
              transactionid: dataturno?.transactionid ? dataturno.transactionid : "",
              clienteid: dataturno?.companyid ? dataturno.companyid : "",
              identificacion: datacliente?.identificacion ? datacliente.identificacion : "",
              clienteid:datacliente?.idcliente ? datacliente.idcliente : "",
              cliente: datacliente?.cliente ? datacliente.cliente : "",
              categoriaid: datacliente?.categoryid ? datacliente.categoryid : "",
              categoria: datacliente?.category ? datacliente.category : "",
              recepcionid:datarecep?.id ? datarecep.id : "",
              recepciontransaction:datarecep?.transaction ? datarecep.transaction : "",
            }
        } 
        
        //Consulta datoa para el turno
        if (requestBody.opcion == 220) {
          let ordenServicio = getOrdenTurno(requestBody.orden, subsidiaria); 
          let datacliente = getCliente(ordenServicio.entity , subsidiaria);
          log.debug('............ordenServicio..............',ordenServicio);
          log.debug('............datacliente..............',datacliente);
          results = {
            //ordenServicio: ordenServicio,
            //datacliente: datacliente
            //identificacion: datacliente.identificacion,
            email:datacliente.email,
            idcliente: datacliente.idcliente,
            cliente: datacliente.cliente,
            identificacion:datacliente.identificacion,
            direccion:datacliente.direccion,
            idbien: ordenServicio.idbien,
            bien: ordenServicio.nombre,
            //location:ordenServicio.location,
            idorden:ordenServicio.codigo,
            nOS:ordenServicio.nOS
          }
        } 

        //CONSULTA de datos de Dispositivo
        if (requestBody.opcion == 221) {
          let ordenServicio = getOrden(requestBody.idorden, subsidiaria); 
          let datosTecnicos = obtenerInformacionDispositivo(requestBody.dispositivo, subsidiaria);  
          let vehiculo = [];
          let cliente= [];
          if  (ordenServicio.idbien !="0")
          {
            vehiculo = getVehiculoCanales(ordenServicio.idbien, subsidiaria);
            cliente= getCliente(vehiculo.propietario, subsidiaria);
          }
          results = {
              idbien: ordenServicio.idbien,
              nOS:ordenServicio.nOS.replace("OS",""),
              identificacion: cliente?.identificacion ? cliente.identificacion :"",
              serie:datosTecnicos.serieDispositivoText,
              celularSIMCARD:datosTecnicos.celularSIMCARD,
              familia:requestBody?.familia ? requestBody.familia :"",
              accion:requestBody.accion,
              operadora:datosTecnicos.operadora,  
              estadoDispositivo:datosTecnicos.estadoDispositivo,
              estadoSIMCARD: datosTecnicos.estadoSIMCARD,
              vid: datosTecnicos.vid,                 
          }
        } 

        //consulta de datos para el chequeo/recepcion automatica
        if (requestBody.opcion == 222) {
            let ordenServicio = getOrdenTurno(requestBody.orden, subsidiaria); 
            let datacliente = getCliente(ordenServicio.entity , subsidiaria);
            //let vehiculo = getVehiculo(ordenServicio.idbien, subsidiaria);
            //let serviciosvehiculo = getVehiculoServiciosTrabajo( ordenServicio.idbien, subsidiaria, ordenServicio.codigo);
            let dataturno = [];
            let datarecep = [];
            dataturno = getTurnoChequeoEvent (ordenServicio.codigo , subsidiaria);
            if (typeof dataturno == "undefined")
            {
              datarecep = [];
            } else {
              datarecep= getCalendarEvent(dataturno.transactionid , subsidiaria);
            } 
            let trabajo =  getOrdenTrabajo (requestBody.trabajo, subsidiaria, requestBody.orden);
            results = {
              //ordenServicio: ordenServicio,
              //datacliente: datacliente,
              //dataturno: dataturno,
              //datarecep:datarecep,
              //serviciosvehiculo:serviciosvehiculo,
              //trabajo:trabajo,  
              turnoid: dataturno?.id ? dataturno.id : "",
              sucursal: dataturno?.taller ? dataturno.taller : "",
              recepcionid:datarecep?.id ? datarecep.id : "",
              email:datacliente.email,
              idcliente: datacliente.idcliente,
              cliente:datacliente.cliente,
              identificacion:datacliente.identificacion,
              idbien: ordenServicio.idbien,
              //codigosys: vehiculo.codigosys,
              entity:ordenServicio.entity,
              idorden:ordenServicio.codigo,
              tecnicoid: trabajo.tecnico,
              supervisorid: trabajo.supervisor,
              estadoid: trabajo.idestado,
              nOT: trabajo.name,
              idtrabajo: trabajo.internalid,
              nOS:ordenServicio.nOS
          }
        }

        //datos de la item por orden idorden=OS10231214545
        if (requestBody.opcion == 223) {
          let Item = obtenerItemParametrizadoPorOrden(requestBody.idorden, subsidiaria);
          log.debug("..........Item..............", Item);        
          log.debug("results", String(Item[0].tag));
          if (['PER','CAR'].includes(String(Item[0].tag))) {
            results= { 
              idOS: Item[0].IdOs,
              internalid: Item[0].internalidOs,
              iditem: Item[0].iditem,
              fam: Item[0].familia,
              tag: Item[0].tag,
              adp: Item[0].accion,
              ttr: Item[0].ttr
            };
          } else {
            results=[];
          }
        }

       //datos de los productos instalados
        if (requestBody.opcion == 224) {
          let ordenServicio = getOrden(requestBody.idorden, subsidiaria); 
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria);  
          let producto= ObtenerCobertura(ordenServicio.idbien,familiaConsulta.id, subsidiaria);
          results= { 
              idbien: ordenServicio.idbien,
              subsidiaria: ordenServicio.subsidiaryid,
              idorden: requestBody.idorden,
              nOS:ordenServicio.nOS,
              idCobertura: producto?.id ? producto.id : "",
              numeroserieproducto: producto?.numeroserieproducto ? producto.numeroserieproducto : "",
              familiaidproducto: producto?.familiaid ? producto.familiaid : "",
              familia: producto?.familia ? producto.familia : ""
              //familiaConsulta:familiaConsulta
            };
        }

         // datos para el certificado
        if (requestBody.opcion == 225) {
          let datavehiculo =[]; 
          let clientepropietario =[]; 
          let coberturaConsulta =[]; 
          let familiaConsulta = consultaFamiliaNetsuite(requestBody.familia, subsidiaria); 
          if  (requestBody.chasis !="0")
          {
            datavehiculo = getVehiculoCanalesCertificado(requestBody.chasis , subsidiaria);
            clientepropietario = getCliente(datavehiculo.propietario, subsidiaria);
            coberturaConsulta = consultaCobertura(datavehiculo.idvehiculo, familiaConsulta.id, subsidiaria);
          } else {
            datavehiculo = getVehiculoCanales(requestBody.idbien, subsidiaria);
            coberturaConsulta = consultaCobertura(requestBody.idbien, familiaConsulta.id, subsidiaria);
            clientepropietario = getCliente(coberturaConsulta.clientepropietario, subsidiaria);    
          }
          let ordenServicio = getOrdenCanales(requestBody.idorden, subsidiaria);
          results = {
              //datavehiculo: datavehiculo,
              idvehiculo: datavehiculo.idvehiculo,
              placa: datavehiculo.placa,
              chasis: datavehiculo.chasis,
              motor: datavehiculo.motor,
              estadobien: datavehiculo.estadobien,
              codigosys: datavehiculo.codigosys,
              //rucconcesionario: datavehiculo?.concesionario ? procesarDato(datavehiculo?.concesionario).numero : "",
              //rucaseguradora: datavehiculo?.aseguradora ? procesarDato(datavehiculo?.aseguradora).numero : "",
              //rucfinanciera: datavehiculo?.financiera ? procesarDato(datavehiculo?.financiera).numero : "",
              //concesionario: datavehiculo?.concesionario ? procesarDato(datavehiculo?.concesionario).nombre : "",
              //aseguradora: datavehiculo?.aseguradora ? procesarDato(datavehiculo?.aseguradora).nombre : "",
              //financiera: datavehiculo?.financiera ? procesarDato(datavehiculo?.financiera).nombre : "",
              vehiculo: datavehiculo.vehiculo,
              ordenservicio: ordenServicio?.nOS ?  ordenServicio?.nOS.replace('OS', '') : "",       
              //familia: requestBody?.familia  ? requestBody.familia  : "",
              marca: datavehiculo.marca,
              modelo: datavehiculo.modelo,
              color: datavehiculo.color,
              anio: datavehiculo.anio,
              tipovehiculo: datavehiculo.tipovehiculo,
              clientepropietarioid:clientepropietario.identificacion,
              clientepropietarioprimernombre:clientepropietario?.primernombre ? clientepropietario?.primernombre : (clientepropietario?.compania || ""),
              clientepropietariosegundonombre:clientepropietario.segundonombre ,
              clientepropietarioprimerapellido:clientepropietario.apellidopaterno ,
              clientepropietariosegundoapellido: clientepropietario.apellidomaterno ,
              familiaid: familiaConsulta.id,
              familiacodigo: familiaConsulta.codigo,
              familiadescripcion: familiaConsulta.name.split("-")[1].replace(' ', ''),  
              coberturainicial: coberturaConsulta?.coberturainicial ? coberturaConsulta.coberturainicial : "",
              coberturafinal:  coberturaConsulta?.coberturafinal ? coberturaConsulta.coberturafinal : "",
              idaseguradora: ordenServicio?.idaseguradora ? ordenServicio?.idaseguradora: "",
              rucaseguradora: ordenServicio?.aseguradora ? procesarDato(ordenServicio?.aseguradora).numero : "",
              idconcesionario: ordenServicio?.idconcesionario ? ordenServicio?.idconcesionario: "",
              rucconcesionaria: ordenServicio?.concesionario ? procesarDato(ordenServicio?.concesionario).numero : "",
              idfinanciera: ordenServicio?.idfinanciera ? ordenServicio?.idfinanciera: "",
              rucfinanciera: ordenServicio?.financiera ? procesarDato(ordenServicio?.financiera).numero : "",
              idvendedor: ordenServicio?.idvendedor ? ordenServicio?.idvendedor: "",
              vendedor: ordenServicio?.vendedor ? procesarDato(ordenServicio?.vendedor.replace('P-EC-', '')).numero : "",
              ejecutivareferencia : ordenServicio?.ejecutivareferencia ? ordenServicio?.ejecutivareferencia : "",
              mailejecutiva: ordenServicio?.mailejecutiva ? ordenServicio?.mailejecutiva : "",
             // mailejecutiva: "vbenavides@carsegsa.com",
          }
        }

        //consulta de vehiculo para el proceso de GEA
        if (requestBody.opcion == 226) {
          let vehiculo = getVehiculo(requestBody.idbien, subsidiaria);
          results = {
            idvehiculo: vehiculo.idvehiculo,
            vehiculo: vehiculo.vehiculo,
            codigosys: vehiculo.codigosys,
            mascotatipo: vehiculo?.mascotatipo ? vehiculo.mascotatipo : "",
            mascotaedad: vehiculo?.mascotaedad ? vehiculo.mascotaedad : "",
            nombremascota: vehiculo?.altname ? vehiculo.altname : "",
          }
        }

        
        
        return results;
      } catch (error) {
        log.debug("Error PostCaso1", { error: error, stack: error.stack });
        //manejarError(error.message);
        return { results: "respuesta", status: "Error", message: error.message };
      }
  };

  function obtenerValoresUnicos(cadena) {
    try {
      const partes = cadena.split(",").map((parte) => parte.trim());
      const valoresUnicos = [...new Set(partes)];
      return valoresUnicos.join(",");
    } catch (e) {
      return cadena
    }
  }

  function procesarDato(cadena) {
    try {
      // Separar la cadena en dos partes usando una expresión regular
      const match = cadena.match(/^(\d+)\s(.+)$/);
      if (!match) {
        throw new Error("Formato inválido");
      }
      // Extraer el número y el nombre
      const numero = match[1];
      const nombre = match[2];
      // Devolver el resultado en un objeto
      return {
        numero: numero,
        nombre: nombre
      };
    } catch (error) {
      // En caso de error, devolver la cadena original
      log.debug("error", error)
      return { numero: "", nombre: "" };
    }
  }

  function _post(context) {
    log.debug("_Post", context);
    let accion = "";
    try {
      accion = context?.accion?.toLowerCase() || null;
      log.debug("Actualizar..AMI...", context);
      let subsidiaria = runtime.getCurrentUser().subsidiary;
      log.debug("...........subsidiary................", subsidiaria);
      switch (accion) {
        // codigo de ami del vehiculo
        case VEHICULO:
          let vehiculo = getConsultaVehiculo("1", context.chasis, subsidiaria);
          log.debug("vehiculo.......................", vehiculo)
          if ((vehiculo.vehiculotelematic=="") || (vehiculo.vehiculotelematic != context.codigoami)) {
            let openRecordVehiculo = record.load({ type: 'customrecord_ht_record_bienes', id: vehiculo.idvehiculo , isDynamic: true });
            openRecordVehiculo.setValue({ fieldId: 'custrecord_ht_bien_id_telematic', value: context.codigoami });             
            let idVehiculoAmi = openRecordVehiculo.save({ enableSourcing: false, ignoreMandatoryFields: true });     
            results = { 
              //vehiculo: vehiculo,
              id: idVehiculoAmi, 
              chasis: vehiculo.chasis,
              mensaje: "Modificado.....AMI....."
            };
          } else if (vehiculo.vehiculotelematic==context.codigoami) {
            results = { 
              //vehiculo: vehiculo
              id: vehiculo.idvehiculo, 
              chasis: vehiculo.chasis,
              codigoami:vehiculo.vehiculotelematic,
              mensaje: "Existente.....AMI....."
            };
          } else {
            results = { 
              //vehiculo: vehiculo
              id: vehiculo.idvehiculo, 
              chasis: vehiculo.chasis,
              codigoami:vehiculo.vehiculotelematic,
              mensaje: "Error, Verificar Codigo AMI"
            };
          }                     
          break;          
        case VEHICULOCODIGO:
          let vehiculocodigo = getConsultaVehiculo("2", context.chasis, subsidiaria);            
          if ((vehiculocodigo.vehiculotelematic=="") || (vehiculocodigo.vehiculotelematic != context.codigoami)) {
            let openRecordVehiculo = record.load({ type: 'customrecord_ht_record_bienes', id: vehiculocodigo.idvehiculo , isDynamic: true });
            openRecordVehiculo.setValue({ fieldId: 'custrecord_ht_bien_id_telematic', value: context.codigoami });            
            let idVehiculoAmi = openRecordVehiculo.save({ enableSourcing: false, ignoreMandatoryFields: true });     
            results = { 
              //vehiculo: vehiculocodigo,
              id: idVehiculoAmi, 
              chasis: vehiculocodigo.chasis,
              mensaje: "Modificado.....AMI....."
            };
          } else if (vehiculocodigo.vehiculotelematic==context.codigoami) {
            results = { 
              //vehiculo: vehiculocodigo,
              id: vehiculocodigo.idvehiculo, 
              chasis: vehiculocodigo.chasis,
              codigoami:vehiculocodigo.vehiculotelematic,
              mensaje: "Existente.....AMI....."
            };
          } else {
            results = { 
              //vehiculo: vehiculocodigo,
              id: vehiculocodigo.idvehiculo, 
              chasis: vehiculocodigo.chasis,
              codigoami:vehiculocodigo.vehiculotelematic,
              mensaje: "Error, Verificar Codigo AMI"
            };
          }         
          break;
        // codigo de ami del cliente
        case CLIENTE:
          let clienteAMI = getClienteAMI(context.cliente, subsidiaria);
          log.debug("Actualizar..FINAL...", clienteAMI);
          if ((clienteAMI.clientetelematic=="") || (clienteAMI.clientetelematic != context.codigoami)) {
            let openRecord = record.load({ type: record.Type.CUSTOMER, id: clienteAMI.idcliente , isDynamic: true });
            openRecord.setValue({ fieldId: 'custentity_ht_customer_id_telematic', value: context.codigoami });      
            let clienteId = openRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });   
            results = { 
              //clienteAMI: clienteAMI,
              id: clienteId, 
              identificacion: clienteAMI.identificacion,
              mensaje: "Modificado.....AMI....."
            };
          } else if (clienteAMI.clientetelematic==context.codigoami) {
            results = { 
              //clienteAMI: clienteAMI,
              id: clienteAMI.idcliente, 
              identificacion: clienteAMI.identificacion,
              codigoami:clienteAMI.clientetelematic,
              mensaje: "Existente.....AMI....."
            };
          } else {
            results = { 
              //clienteAMI: clienteAMI,
              id: clienteAMI.idcliente, 
              identificacion: clienteAMI.identificacion,
              codigoami:clienteAMI.clientetelematic,
              mensaje: "Error, Verificar Codigo AMI"
            };
          }
          break;
        // TODO: Default
        default:
          respuesta = { id: 0, mensaje: "Verifique la accion" };
        break;
      }
      log.debug("Actualizar..FINAL...", JSON.stringify({ results: results }));
      return JSON.stringify({ results: results });
      //return results;
    } catch (error) {
        log.error('Error', error);
    }
  }

  function _put() {
      //put
  }

  function _delete() {
      //delete
  }

  function formatearTelefono(numero) {
    try {
      if (!numero){
        return ""
      } 
      let numeroLimpio = numero.replace("+593", "0").trim();
      if (numeroLimpio.startsWith("99")) {
        return `0${numeroLimpio.slice(0, 3)} ${numeroLimpio.slice(
          3,
          6
        )} ${numeroLimpio.slice(6)}`;
      } else if (numeroLimpio.startsWith("4")) {
        return `(04) ${numeroLimpio.slice(1, 4)}-${numeroLimpio.slice(4)}`;
      } else {
        return numeroLimpio || numero;
      }
    } catch (e) {
      log.debug("Error - formatearTelefono", error);
    }
  }
  
  function consultaCobertura(IdVehiculo, idfamilia, subsidiaria) {
    let results = [];
    try {
      log.debug("IdVehiculo", IdVehiculo);
      log.debug("idfamilia", idfamilia);
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          "AND", 
          ["custrecord_ht_co_estado_cobertura","anyof","1","2","3"], // ACTIVO-SUSPENDIDO-PENDIENTE DE ACTIVACIÓN  
        // ["custrecord_ht_co_estado_cobertura","anyof","1","2","3","4"], // ACTIVO-SUSPENDIDO-PENDIENTE DE ACTIVACIÓN  
         //["custrecord_ht_co_estado_cobertura","anyof","1","2","3","4","5"], // ACTIVO-SUSPENDIDO-PENDIENTE DE ACTIVACIÓN  
          // NO TIENE LLENO EL CAMPO DE SUBSIDIARIA
          //GALVAR 25-08-26
          "AND",
          ["isinactive","is","F"],
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", subsidiaria],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],  
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
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),  
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),        
          
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
            numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            subsidiaria:result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
          });
        });
      });
      //log.debug("..........consultaCobertura..............", results[0]);
      //log.debug(results);
      return results[0];
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  function consultaCoberturaGarantia(IdVehiculo, idfamilia, subsidiaria) {
    let results = [];
    try {
     // log.debug("IdVehiculo", IdVehiculo);
     // log.debug("idfamilia", idfamilia);
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          "AND", 
          ["custrecord_ht_co_estado_cobertura","anyof","1","3"], // ACTIVO-PENDIENTE DE ACTIVACIÓN  
           //GALVAR 25-08-26
          "AND",
          ["isinactive","is","F"],
          // NO TIENE LLENO EL CAMPO DE SUBSIDIARIA
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", subsidiaria],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],  
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
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),  
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),           
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
            numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            subsidiaria:result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
          });
        });
      });
     // log.debug("..........consultaCobertura..............", results[0]);
      //log.debug(results);
      return results[0];
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  function ObtenerCobertura(IdVehiculo, idfamilia, subsidiaria) {
    let results = [];
    try {
      log.debug("IdVehiculo", IdVehiculo);
      log.debug("idfamilia", idfamilia);
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", subsidiaria],
          //GALVAR 25-08-26
          "AND",
          ["isinactive","is","F"],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],  
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
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),  
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),     
          search.createColumn({ name: "custrecord_ht_co_familia_prod" }),            
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
            numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            subsidiaria:result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
            familiaid: result.getValue({ name: "custrecord_ht_co_familia_prod" }),
            familia: result.getText({ name: "custrecord_ht_co_familia_prod" })
          });
        });
      });
      return results[0];
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }

  function consultaCoberturaDesins(IdVehiculo, idfamilia, subsidiaria) {
    let results = [];
    try {
     // log.debug("IdVehiculo", IdVehiculo);
     // log.debug("idfamilia", idfamilia);
      let CoberturaSearch = search.create({
        type: "customrecord_ht_co_cobertura",
        filters: [
          ["custrecord_ht_co_bien", "anyof", IdVehiculo],
          //"AND", 
          //["custrecord_ht_co_estado_cobertura","anyof","4"], // ACTIVO-SUSPENDIDO-PENDIENTE DE ACTIVACIÓN  
        //  ["custrecord_ht_co_estado","anyof","2"], // ACTIVO-SUSPENDIDO-PENDIENTE DE ACTIVACIÓN
          //GALVAR 25-08-26
          "AND",
          ["isinactive","is","F"],
          // NO TIENE LLENO EL CAMPO DE SUBSIDIARIA
          "AND",
          ["custrecord_ht_co_subsidiaria", "anyof", subsidiaria],
          "AND",
          ["custrecord_ht_co_familia_prod", "anyof", idfamilia],  
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
          search.createColumn({ name: "custrecord_ht_co_numerodispositivo" }),
          search.createColumn({ name: "custrecord_ht_co_propietario" }),  
          search.createColumn({ name: "custrecord_ht_co_subsidiaria" }),           
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
            numerodispositivo: result.getValue({ name: "custrecord_ht_co_numerodispositivo" }),
            clientepropietario: result.getValue({ name: "custrecord_ht_co_propietario" }),
            subsidiaria:result.getValue({ name: "custrecord_ht_co_subsidiaria" }),
          });
        });
      });
      //log.debug("..........consultaCobertura..............", results[0]);
      //log.debug(results);
      return results[0];
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  }


  function consultaFamiliaNetsuite(familia, subsidiaria){
    let results = [];
    try {
     // log.debug("FAMILIA", familia);
      let FamiliaSearch = search.create({
        type: "customrecord_ht_cr_pp_valores",
        filters: [ ["custrecord_ht_pp_codigo", "is", familia],
                    'AND',
                    //['owner.subsidiary', 'anyof', '2']
                    ['custrecord33', 'anyof', subsidiaria]
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

  // function consultaFamiliaNetsuiteNuevo(item){
  //   let results = [];
  //   try {
  //     condicion = ' AND rel.custrecord_ht_pp_parametrizacionid ='+ item + '';
  //     let TipoCanalQuery = query.runSuiteQL({
  //       query: ` SELECT	val.internalid, val.name, val.custrecord_ht_pp_codigo
  //             FROM	customrecord_ht_pp_main_param_prod rel, 
  //                   CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
  //                   CUSTOMRECORD_HT_CR_PP_VALORES val,
  //                   ITEM ITE
  //             where	 rel.custrecord_ht_pp_parametrizacion_rela = param.id
  //                   and    rel.custrecord_ht_pp_parametrizacion_valor = val.id
  //                   AND custrecord_ht_pp_code ='FAM'
  //                   AND ITE.subsidiary='2'
  //                   ${condicion} `,
  //     })
  //     let res = TipoCanalQuery.asMappedResults();
  //     let FamiliaSearch = res;
  //     // let FamiliaSearch = search.create({
  //     //   type: "customrecord_ht_cr_pp_valores",
  //     //   filters: [ ["custrecord_ht_pp_codigo", "is", familia], ],
  //     //   columns: [
  //     //     search.createColumn({ name: "internalid" }),
  //     //     search.createColumn({ name: "name" }),
  //     //     search.createColumn({ name: "custrecord_ht_pp_codigo" }),
  //     //   ],
  //     // });
      
  //     let searchResult = FamiliaSearch.runPaged();
  //     searchResult.pageRanges.forEach(function (pageRange) {
  //       let myPage = searchResult.fetch({ index: pageRange.index });
  //       myPage.data.forEach(function (result) {      
  //         results.push({
  //           id: result.getValue({ name: "internalid" }),
  //           name: result.getValue({ name: "name" }),
  //           codigo: result.getValue({ name: "custrecord_ht_pp_codigo" }),
  //         });
  //       });
  //     });
  //     return results[0];
  //   } catch (error) {
  //     log.debug("error", error);
  //     return [];
  //   }
  // }

  const getVehiculo = (id, subsidiaria) => {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
                  ["internalid", "anyof", id],
                  "AND",
                  ["custrecord_bn_subsidiaria", "anyof", subsidiaria] 
                ],
        columns: [
          { name: "internalid" },
          { name: "name" },
          { name: "custrecord_ht_bien_motor" },
          { name: "custrecord_ht_bien_placa" },
          { name: "custrecord_ht_bien_chasis" },
          { name: "custrecord_ht_bien_marca" },
          { name: "custrecord_ht_bien_modelo" },
          { name: "custrecord_ht_bien_colorcarseg" },
          { name: "custrecord_ht_bien_ano" },
          { name: "custrecord_ht_bien_codsysh" },            
          { name: "custrecord_ht_bien_tipo" },
          { name: "custrecord_ht_bien_tipobien" },
          { name: "custrecord_ht_bien_tipoterrestre" },
          { name: "custrecord_ht_bien_ano" },
          { name: "custrecord_ht_bien_consesionarios" },
          { name: "custrecord_ht_bien_id_telematic" },
          { name: "custrecord_ht_bn_estadobien" },
          { name: "custrecord_ht_bien_nom_embarcacion" },
          { name: "custrecord_ht_serie_pro" },
          { name: "custrecordcustrecord_ht_edad_mascota" },
          { name: "custrecordcustrecord_lt_tipo_mascota" },
          { name: "altname" },
        ],
      });
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });        
        myPage.data.forEach(function (result) {
          //log.error("Error en getVehiculo modelo", result.getValue({ name: "custrecord_ht_bien_modelo" }));
          //log.error("Error en getVehiculo marca", result.getValue({ name: "custrecord_ht_bien_marca" }));
          var busquedamodelo=ConsultaModelo(result.getValue({ name: "custrecord_ht_bien_modelo" }),  "CUSTOMRECORD_HT_BN_MODELO", subsidiaria);
          var busquedamarca =ConsultaMarca(result.getValue({ name: "custrecord_ht_bien_marca" }), "CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria);
          var busquedachasis 
          var busquedaplaca
          var busquedamotor
          //var tipobien=result.getValue({ name: "custrecord_ht_bien_tipobien" });
          // 6	MARÍTIMO
          if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="6") { 
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 7	TANQUE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="7") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_nom_embarcacion" });
            busquedamotor="NO DEFINIDO";
            busquedachasis="NO DEFINIDO";
          // 8	INMUEBLE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="8") {
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 9	PRODUCCIÓN
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="9") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_serie_pro" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          } else  {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_placa" });
            busquedamotor=result.getValue({ name: "custrecord_ht_bien_motor" });
            busquedachasis=result.getValue({ name: "custrecord_ht_bien_chasis" });
          }
          var TipoamiId="";
          if (result.getValue({ name: "custrecord_ht_bien_tipoterrestre" })==30){
            TipoamiId="1"
          } else if (result.getValue({ name: "custrecord_ht_bien_tipoterrestre" })==1){
            TipoamiId="2"
          } 
          //log.error("Error en getVehiculo modelo", busquedamodelo);
          //log.error("Error en getVehiculo marca", busquedamarca);
          respuesta.push({
            idvehiculo: result.getValue({ name: "internalid" }),
            vehiculo: result.getValue({ name: "name" }),
            //motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
            //placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
            //chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            motor: busquedamotor,
            placa: busquedaplaca,
            chasis : busquedachasis,
            codmarca :result.getValue({ name: "custrecord_ht_bien_marca" }),
            marca: busquedamarca,
            //marca: result.getText({ name: "custrecord_ht_bien_marca" }),
            codmodelo :result.getValue({ name: "custrecord_ht_bien_modelo" }),
            //modelo: result.getText({ name: "custrecord_ht_bien_modelo" }),
            modelo: busquedamodelo,
            color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
            codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
            tipo: result.getValue({ name: "custrecord_ht_bien_tipoterrestre" }),
            tipobien: result.getValue({ name: "custrecord_ht_bien_tipobien" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            concesionarios: result.getText({ name: "custrecord_ht_bien_consesionarios" }),
            vehiculotelematic:result.getValue({ name: "custrecord_ht_bien_id_telematic" }),
            estadobien:result.getText({ name: "custrecord_ht_bn_estadobien" }),
            tipoami:TipoamiId,
            mascotatipo: result.getText({ name: "custrecordcustrecord_lt_tipo_mascota" }),
            mascotaedad: result.getValue({ name: "custrecordcustrecord_ht_edad_mascota" }),
            altname: result.getValue({ name: "altname" }),
          });
        });
      });
      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculo", e);
      return [];
    }
  };

  const getVehiculoCanales = (id, subsidiaria) => {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
                  ["internalid", "anyof", id],
                  "AND",
                  ["custrecord_bn_subsidiaria", "anyof", subsidiaria] 
                ],
        columns: [
          { name: "internalid" },
          { name: "name" },
          { name: "custrecord_ht_bien_motor" },
          { name: "custrecord_ht_bien_placa" },
          { name: "custrecord_ht_bien_chasis" },
          { name: "custrecord_ht_bien_marca" },
          { name: "custrecord_ht_bien_modelo" },
          { name: "custrecord_ht_bien_colorcarseg" },
          { name: "custrecord_ht_bien_ano" },
          { name: "custrecord_ht_bien_codsysh" },            
          { name: "custrecord_ht_bien_tipo" },
          { name: "custrecord_ht_bien_tipoterrestre" },
          { name: "custrecord_ht_bien_ano" },
          { name: "custrecord_ht_bien_consesionarios" },
          { name: "custrecord_ht_bien_id_telematic" },
          { name: "custrecord_ht_bien_propietario" },
          { name: "custrecord_ht_bien_tipobien" },
          { name: "custrecord_ht_bn_estadobien" },
          { name: "custrecord_ht_bien_nom_embarcacion" },
          { name: "custrecord_ht_serie_pro" },
          { name: "altname" },   
          //search.createColumn({ name: "custrecord_ht_cn_codigo", join: "customrecord_ht_bien_tipobien", label: "ConvenioVehiculo" }),    
          //custrecord_ht_bien_conveniovehiculo
          search.createColumn({ name: "custrecord_ht_cn_codigo", join: "CUSTRECORD_HT_BIEN_CONVENIOVEHICULO", label: "ConvenioVehiculo" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Aseguradora" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Diraseguradora" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "Concesionario" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "Dirconcesionario" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "Financiera" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "Dirfinanciera" })          
        ],
      });
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });        
        myPage.data.forEach(function (result) {
          //log.error("Error en getVehiculo modelo", result.getValue({ name: "custrecord_ht_bien_modelo" }));
          //log.error("Error en getVehiculo marca", result.getValue({ name: "custrecord_ht_bien_marca" }));
          var busquedamodelo=ConsultaModelo(result.getValue({ name: "custrecord_ht_bien_modelo" }),  "CUSTOMRECORD_HT_BN_MODELO", subsidiaria);
          var busquedamarca =ConsultaMarca(result.getValue({ name: "custrecord_ht_bien_marca" }), "CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria);
          const conveniovehiculo = result.getValue({ name: "custrecord_ht_cn_codigo",  join: "CUSTRECORD_HT_BIEN_CONVENIOVEHICULO", label: "ConvenioVehiculo"});      
          //log.error("Error en getVehiculo modelo", busquedamodelo);
          //log.error("Error en getVehiculo marca", busquedamarca);
          var busquedachasis 
          var busquedaplaca
          var busquedamotor
          //var tipobien=result.getValue({ name: "custrecord_ht_bien_tipobien" });
          // 6	MARÍTIMO
          if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="6") {
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 7	TANQUE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="7") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_nom_embarcacion" });
            busquedamotor="NO DEFINIDO";
            busquedachasis="NO DEFINIDO";
          // 8	INMUEBLE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="8") {
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 9	PRODUCCIÓN
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="9") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_serie_pro" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          } else  {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_placa" });
            busquedamotor=result.getValue({ name: "custrecord_ht_bien_motor" });
            busquedachasis=result.getValue({ name: "custrecord_ht_bien_chasis" });
          }     
          //log.debug("tipobien",tipobien )
          //log.debug("embarcacion",result.getValue({ name: "custrecord_ht_bien_nom_embarcacion" }) )
          //log.debug("busquedachasis",busquedachasis )
          respuesta.push({
            idvehiculo: result.getValue({ name: "internalid" }),
            vehiculo: result.getValue({ name: "name" }),
            //motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
            //placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
            //chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            placa: busquedaplaca,
            motor: busquedamotor,
            chasis: busquedachasis,
            idtipobien: result.getValue({ name: "custrecord_ht_bien_tipobien" }),
            tipobien: result.getText({ name: "custrecord_ht_bien_tipobien" }),
            codmarca :result.getValue({ name: "custrecord_ht_bien_marca" }),
            marca: busquedamarca,
            estadobien:result.getText({ name: "custrecord_ht_bn_estadobien" }),
            //marca: result.getText({ name: "custrecord_ht_bien_marca" }),
            codmodelo :result.getValue({ name: "custrecord_ht_bien_modelo" }),
            propietario:result.getValue({ name: "custrecord_ht_bien_propietario" }),          
            //modelo: result.getText({ name: "custrecord_ht_bien_modelo" }),
            modelo: busquedamodelo,
            color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
            codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
            tipo: result.getValue({ name: "custrecord_ht_bien_tipoterrestre" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            concesionarios: result.getText({ name: "custrecord_ht_bien_consesionarios" }),
            vehiculotelematic:result.getValue({ name: "custrecord_ht_bien_id_telematic" }),
            conveniovehiculo:conveniovehiculo,
            aseguradora : result.getValue({  name: "name",join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Aseguradora"}),
            diraseguradora : result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Diraseguradora"}),
            concesionario : result.getValue({  name: "name", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS",label: "Concesionario"}),
            dirconcesionario: result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "Dirconcesionario"}),
            financiera : result.getValue({  name: "name", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO",label: "Financiera"}),
            dirfinanciera: result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "Dirfinanciera"}),
          }); 
        });
      });
      log.debug("vehiculo",respuesta[0] )
      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculoCanales", e);
      return [];
    }
  };

   const getVehiculoCanalesCertificado = (chasis, subsidiaria) => {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_record_bienes",
        filters: [
                  ["custrecord_ht_bien_chasis", "is", chasis],
                  "AND",
                  ["custrecord_bn_subsidiaria", "anyof", subsidiaria] 
                ],
        columns: [
          { name: "internalid" },
          { name: "name" },
          { name: "custrecord_ht_bien_motor" },
          { name: "custrecord_ht_bien_placa" },
          { name: "custrecord_ht_bien_chasis" },
          { name: "custrecord_ht_bien_codsysh" },            
          { name: "custrecord_ht_bien_consesionarios" },
          { name: "custrecord_ht_bn_estadobien" },
          { name: "custrecord_ht_bien_tipobien" },
          { name: "custrecord_ht_bien_marca" },
          { name: "custrecord_ht_bien_modelo" },
          { name: "custrecord_ht_bien_tipo" },
          { name: "custrecord_ht_bien_colorcarseg" },
          { name: "custrecord_ht_bien_ano" },
          { name: "custrecord_ht_bien_propietario" },
          { name: "altname" },   
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Aseguradora" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS", label: "Concesionario" }),
          search.createColumn({ name: "name", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO", label: "Financiera" }),
        ],
      });
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });        
        myPage.data.forEach(function (result) {
          var busquedachasis 
          var busquedaplaca
          var busquedamotor
          //var tipobien=result.getValue({ name: "custrecord_ht_bien_tipobien" });
          // 6	MARÍTIMO
          if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="6") {
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 7	TANQUE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="7") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_nom_embarcacion" });
            busquedamotor="NO DEFINIDO";
            busquedachasis="NO DEFINIDO";
          // 8	INMUEBLE
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="8") {
            busquedaplaca=result.getValue({ name: "altname" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          // 9	PRODUCCIÓN
          } else  if (result.getValue({ name: "custrecord_ht_bien_tipobien" }) =="9") {
            busquedaplaca=result.getValue({ name: "custrecord_ht_serie_pro" });
            busquedamotor=result.getValue({ name: "altname" });
            busquedachasis=result.getValue({ name: "altname" });
          } else  {
            busquedaplaca=result.getValue({ name: "custrecord_ht_bien_placa" });
            busquedamotor=result.getValue({ name: "custrecord_ht_bien_motor" });
            busquedachasis=result.getValue({ name: "custrecord_ht_bien_chasis" });
          }     
          var busquedamodelo=ConsultaModelo(result.getValue({ name: "custrecord_ht_bien_modelo" }),  "CUSTOMRECORD_HT_BN_MODELO", subsidiaria);
          var busquedamarca =ConsultaMarca(result.getValue({ name: "custrecord_ht_bien_marca" }), "CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria);
          respuesta.push({
            idvehiculo: result.getValue({ name: "internalid" }),
            vehiculo: result.getValue({ name: "name" }),
            placa: busquedaplaca,
            motor: busquedamotor,
            chasis: busquedachasis,
            estadobien:result.getText({ name: "custrecord_ht_bn_estadobien" }),
            codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
            marca: busquedamarca,
            modelo: busquedamodelo,
            color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
            propietario:result.getValue({ name: "custrecord_ht_bien_propietario" }),  
            aseguradora : result.getValue({  name: "name",join: "CUSTRECORD_HT_BIEN_COMPANIASEGUROS", label: "Aseguradora"}),
            concesionario : result.getValue({  name: "name", join: "CUSTRECORD_HT_BIEN_CONSESIONARIOS",label: "Concesionario"}),
            financiera : result.getValue({  name: "name", join: "CUSTRECORD_HT_BIEN_FINANCIADOVEHICULO",label: "Financiera"}),
          }); 
        });
      });
      log.debug("vehiculo",respuesta[0] )
      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculoCanalesCertificado", e);
      return [];
    }
  };
   
   
  const getConsultaVehiculo = (opcion, valor, subsidiaria) => {
    try {
      let vehicleSearchObj = "";
      if (opcion=="1"){
        vehicleSearchObj = search.create({
          type: "customrecord_ht_record_bienes",
          filters: [
                    ["custrecord_ht_bien_chasis", "is", valor],
                    "AND",
                    ["custrecord_bn_subsidiaria", "anyof", subsidiaria]
                  ],
          columns: [
            { name: "internalid" },
            { name: "name" },
            { name: "custrecord_ht_bien_motor" },
            { name: "custrecord_ht_bien_placa" },
            { name: "custrecord_ht_bien_chasis" },
            { name: "custrecord_ht_bien_marca" },
            { name: "custrecord_ht_bien_modelo" },
            { name: "custrecord_ht_bien_colorcarseg" },
            { name: "custrecord_ht_bien_ano" },
            { name: "custrecord_ht_bien_codsysh" },            
            { name: "custrecord_ht_bien_tipo" },
            { name: "custrecord_ht_bien_tipoterrestre" },
            { name: "custrecord_ht_bien_ano" },
            { name: "custrecord_ht_bien_consesionarios" },
            { name: "custrecord_ht_bien_id_telematic" },
          ],
        });
      }
      if (opcion=="2"){
        vehicleSearchObj = search.create({
          type: "customrecord_ht_record_bienes",
          filters: [
                    ["internalid", search.Operator.IS, valor],
                    "AND",
                    ["custrecord_bn_subsidiaria", "anyof", subsidiaria]
                  ],
          columns: [
            { name: "internalid" },
            { name: "name" },
            { name: "custrecord_ht_bien_motor" },
            { name: "custrecord_ht_bien_placa" },
            { name: "custrecord_ht_bien_chasis" },
            { name: "custrecord_ht_bien_marca" },
            { name: "custrecord_ht_bien_modelo" },
            { name: "custrecord_ht_bien_colorcarseg" },
            { name: "custrecord_ht_bien_ano" },
            { name: "custrecord_ht_bien_codsysh" },            
            { name: "custrecord_ht_bien_tipo" },
            { name: "custrecord_ht_bien_tipoterrestre" },
            { name: "custrecord_ht_bien_ano" },
            { name: "custrecord_ht_bien_consesionarios" },
            { name: "custrecord_ht_bien_id_telematic" },
          ],
        });
      }     
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });       
        myPage.data.forEach(function (result) {
          //log.error("Error en getVehiculo modelo", result.getValue({ name: "custrecord_ht_bien_modelo" }));
          //log.error("Error en getVehiculo marca", result.getValue({ name: "custrecord_ht_bien_marca" }));
          var busquedamodelo=ConsultaModelo(result.getValue({ name: "custrecord_ht_bien_modelo" }),  "CUSTOMRECORD_HT_BN_MODELO", subsidiaria );
          var busquedamarca =ConsultaMarca(result.getValue({ name: "custrecord_ht_bien_marca" }), "CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria);
          //log.error("Error en getVehiculo modelo", busquedamodelo);
          //log.error("Error en getVehiculo marca", busquedamarca);
          respuesta.push({
            idvehiculo: result.getValue({ name: "internalid" }),
            vehiculo: result.getValue({ name: "name" }),
            motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
            placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
            chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
            codmarca :result.getValue({ name: "custrecord_ht_bien_marca" }),
            marca: busquedamarca,
            //marca: result.getText({ name: "custrecord_ht_bien_marca" }),
            codmodelo :result.getValue({ name: "custrecord_ht_bien_modelo" }),
            //modelo: result.getText({ name: "custrecord_ht_bien_modelo" }),
            modelo: busquedamodelo,
            color: result.getText({ name: "custrecord_ht_bien_colorcarseg" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            tipovehiculo: result.getText({ name: "custrecord_ht_bien_tipo" }),
            codigosys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
            tipo: result.getValue({ name: "custrecord_ht_bien_tipoterrestre" }),
            anio: result.getValue({ name: "custrecord_ht_bien_ano" }),
            concesionarios: result.getText({ name: "custrecord_ht_bien_consesionarios" }),
            vehiculotelematic:result.getValue({ name: "custrecord_ht_bien_id_telematic" }),
          });
        });
      });
      return respuesta[0];
    } catch (e) {
      log.error("Error en getVehiculo", e);
      return [];
    }
  };

  const getClienteAMI = (identificacion, subsidiaria) => {
    try {
      const customerSearchObj = search.create({
        type: "customer",
        //filters: [["vatregnumber", "anyof", identificacion]],
        filters: [  ['vatregnumber', search.Operator.IS, identificacion],
                    "AND",
                    ["subsidiary", "anyof", subsidiaria] 
                ],
        columns: [
          search.createColumn({ name: "entityid", label: "ID" }),
          search.createColumn({ name: "altname", label: "Nombre" }),
          search.createColumn({ name: "email", label: "Correo electrónico" }),
          search.createColumn({ name: "phone", label: "Teléfono" }),
          search.createColumn({ name: "homephone", label: "Teléfono" }),
          search.createColumn({ name: "mobilephone", label: "Teléfono" }),
          search.createColumn({ name: "custentity_ts_ec_tipo_persona", label: "EC - Tipo de persona", }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "shipaddress", label: "Dirección de envío", }),
          search.createColumn({ name: "formulatext", formula: "{vatregnumber}", label: "Fórmula (texto)", }),
          search.createColumn({ name: "custentity_ht_cl_primernombre", label: "Primer Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_segundonombre", label: "Segundo Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_apellidopaterno", label: "Apellido Paterno" }),
          search.createColumn({ name: "custentity_ht_cl_apellidomaterno", label: "Apellido Materno" }),
          search.createColumn({ name: "companyname", label: "Compania" }),
          search.createColumn({ name: "custentity_ht_customer_id_telematic", label: "Telematic" }),                  
        ],
      });
      const myPagedData = customerSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = [];
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          // Log Eliminar 21/08/2024
          let generalCorreos = obtenerCorreosPropietario(result.getValue({ name: "internalid" }), subsidiaria);
          log.debug('generalCorreos', generalCorreos);
          respuesta.push({
            idcliente: result.getValue({ name: "internalid" }),
            cliente: result.getValue({ name: "altname" }),
            identificacion: result.getValue({ name: "formulatext" }),
            direccion: result.getValue({ name: "shipaddress" }),
            telefono: result.getValue({ name: "phone" }),
            homephone: result.getValue({ name: "homephone" }),
            mobilephone: result.getValue({ name: "mobilephone" }),
            tipopersona: result.getValue({name: "custentity_ts_ec_tipo_persona" }),
            email: result.getValue({ name: "email" }),
            emailami:generalCorreos?.amiEmail ? generalCorreos?.amiEmail : result.getValue({ name: "email" }),
            emailpx:generalCorreos?.pxEmail ? generalCorreos?.pxEmail : result.getValue({ name: "email" }),
            primernombre:result.getValue({ name: "custentity_ht_cl_primernombre" }),
            segundonombre:result.getValue({ name: "custentity_ht_cl_segundonombre" }),
            apellidopaterno:result.getValue({ name: "custentity_ht_cl_apellidopaterno" }),
            apellidomaterno:result.getValue({ name: "custentity_ht_cl_apellidomaterno" }),
            compania:result.getValue({ name: "companyname" }),
            clientetelematic:result.getValue({ name: "custentity_ht_customer_id_telematic" }),
          });
        });
      });
      return respuesta[0];
    } catch (e) {
      log.error("Error en getCliente", e);
      return [];
    }
  };

  function ConsultaModelo( Id_Modelo, tabla, subsidiaria){
    try{
      var Resultado = [];
      let Busqueda = search.create({
        type: tabla,
        filters:[ //["isinactive","anyof","F"], 
                  ["isinactive","is","F"],
                  "AND",
                  ["custrecord_ht_mod_subsidiaria","anyof",subsidiaria]
                ],
        columns:
        [
          search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_MB_MARCA", label: "Id Marca" }),
          search.createColumn({name: "custrecord_ht_mb_marca", label: "Codigo marca"}),
          search.createColumn({name: "internalid", label: "Id Modelo"}),
          search.createColumn({name: "custrecord_ht_mod_descripcion", label: "Modelo"})              
        ]
      });        
      if (Id_Modelo != '') {
        Busqueda.filters.push(
          search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: Id_Modelo })
        );
      }        
      var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });
      // log.debug(tabla, ResConsulta.count);
      if (ResConsulta.count != 0) {
        //log.debug(tabla, "Resultado..........1111............");
        for (let i in ResConsulta) {
          var IdMarca = ResConsulta[i].getValue({name: 'custrecord_ht_mb_marca'});
          var IdModelo = ResConsulta[i].getValue({name: 'internalid'});
          var Modelo = ResConsulta[i].getValue({name: 'custrecord_ht_mod_descripcion'});  
        }  
        Resultado.push({
          IdMarca: IdMarca,
          Id: IdModelo,
          Descripcion: Modelo
        }); 
      } 
      // log.error("Error en getVehiculo....................", Resultado);
      //return Resultado;
      return Resultado[0]?.Descripcion || "";
    } catch (error) {
      log.error('error', error);
      //return JSON.stringify({error: error.message});
      return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaModelo)';
    }
  }

  const ConsultaMarca = (Id_Marca, tabla, subsidiaria) => {
    try {
      var Resultado = [];
      let Busqueda = search.create({
          type: tabla,
          filters:[ //["isinactive","anyof","F"], 
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_ht_marca_sub", "anyof", subsidiaria]
                  ],
          columns:
          [
            search.createColumn({ name: "internalid",  label: "Id Marca" }),
            search.createColumn({ name: "custrecord_ht_marca_descripcion", label: "Modelo"})  
          ]
      });
      if (Id_Marca != '') {
        Busqueda.filters.push(
          search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: Id_Marca  })
        );
      } 
      var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });
     // log.debug(tabla, ResConsulta.count);
      if (ResConsulta.count != 0) {
        //log.debug(tabla, "Resultado..........1111............");
        for (let i in ResConsulta) {
          var IdMarca = ResConsulta[i].getValue({name: 'internalid'});
          var Marca = ResConsulta[i].getValue({name: 'custrecord_ht_marca_descripcion'});  
        }  
        Resultado.push({
          IdMarca: IdMarca,
          Descripcion: Marca,
        }); 
      } 
      //log.error("Error en getVehiculo....................", Resultado);
      //return Resultado;
      return Resultado[0]?.Descripcion || "";
    } catch (e) {
        log.error(tabla, e);
        return 0;
    }
  };

  const getCliente = (id, subsidiaria) => {
    try {
      const customerSearchObj = search.create({
        type: "customer",
        filters: [
                  ["internalid", "anyof", id], "AND",
                  ["subsidiary", "anyof", subsidiaria]
                ],
        columns: [
          search.createColumn({ name: "entityid", label: "ID" }),
          search.createColumn({ name: "altname", label: "Nombre" }),
          search.createColumn({ name: "email", label: "Correo electrónico" }),
          search.createColumn({ name: "phone", label: "Teléfono" }),
          search.createColumn({ name: "homephone", label: "Teléfono" }),
          search.createColumn({ name: "mobilephone", label: "Teléfono" }),
          search.createColumn({ name: "custentity_ts_ec_tipo_persona", label: "EC - Tipo de persona", }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
          search.createColumn({ name: "shipaddress", label: "Dirección de envío", }),
          search.createColumn({ name: "formulatext", formula: "{vatregnumber}", label: "Fórmula (texto)", }),
          search.createColumn({ name: "custentity_ht_cl_primernombre", label: "Primer Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_segundonombre", label: "Segundo Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_apellidopaterno", label: "Apellido Paterno" }),
          search.createColumn({ name: "custentity_ht_cl_apellidomaterno", label: "Apellido Materno" }),
          search.createColumn({ name: "companyname", label: "Compania" }),
          search.createColumn({ name: "custentity_ht_customer_id_telematic", label: "Telematic" }),  
          search.createColumn({ name: "subsidiary", label: "subsidiary" }),   
          search.createColumn({ name: "category", label: "Categoria" }),
        ],
      }); 
      // Log Eliminar 21/08/2024
      let generalCorreos = obtenerCorreosPropietario(id, subsidiaria);
      log.debug('generalCorreos...getCliente...', generalCorreos);
      const myPagedData = customerSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) {
            respuesta.push({
            idcliente: result.getValue({ name: "internalid" }),
            cliente: result.getValue({ name: "altname" }),
            identificacion: result.getValue({ name: "formulatext" }),
            direccion: result.getValue({ name: "shipaddress" }),
            telefono: formatearTelefono(result.getValue({ name: "phone" })),
            homephone: formatearTelefono(result.getValue({ name: "homephone" })),
            mobilephone: formatearTelefono(result.getValue({ name: "mobilephone" })),
            tipopersona: result.getValue({ name: "custentity_ts_ec_tipo_persona", }),
            email: result.getValue({ name: "email" }),
            emailami:generalCorreos?.amiEmail ? generalCorreos?.amiEmail : result.getValue({ name: "email" }),
            emailpx:generalCorreos?.pxEmail ? generalCorreos?.pxEmail : result.getValue({ name: "email" }),
            primernombre:result.getValue({ name: "custentity_ht_cl_primernombre" }),
            segundonombre:result.getValue({ name: "custentity_ht_cl_segundonombre" }),
            apellidopaterno:result.getValue({ name: "custentity_ht_cl_apellidopaterno" }),
            apellidomaterno:result.getValue({ name: "custentity_ht_cl_apellidomaterno" }),
            compania:result.getValue({ name: "companyname" }),
            clientetelematic:result.getValue({ name: "custentity_ht_customer_id_telematic" }),
            subsidiary:result.getValue({ name: "subsidiary" }),
            categoryid:result.getValue({ name: "category" }),
            category:result.getText({ name: "category" }),
          });
        });
      });
      //log.debug("..........getCliente..............", respuesta[0]); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en getCliente", e);
      return [];
    }
  };

    const getCalendarEvent = (orden, subsidiaria) => {
    try {
     // log.debug("..........orden..............", orden); 
      const CalendarEventSearchObj = search.create({
        type: "calendarevent",
        filters: [
                  ["transaction.internalid", "anyof", orden]
                ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "title", label: "title" }),
          search.createColumn({ name: "transaction", label: "transaction" }),
          search.createColumn({ name: "startdate", label: "startdate" }),
          search.createColumn({ name: "status", label: "status" }),        
        ],
      });     
      const myPagedData = CalendarEventSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getText({ name: "internalid" }),
            title: result.getValue({ name: "title" }),
            transaction: result.getText({ name: "transaction" }),
            startdate: result.getValue({ name: "startdate" }),
            status: result.getText({ name: "status" })
          });
        });
      });
      return respuesta[0];
    } catch (e) {
      log.error("Error en getCalendarEvent", e.stack);
      return [];
    }
  };
  
  const getTurnoEvent = (turno, subsidiaria) => {
    try {
      const CalendarEventSearchObj = search.create({
        type: "task",
        filters:[
                  ["internalid", "anyof", turno]
                ],
        columns: [
          //search.createColumn({ name: "title", label: "title" }),
          search.createColumn({ name: "internalid", label: "id" }),
          search.createColumn({ name: "company" }),
          search.createColumn({ name: "transaction" }),
          search.createColumn({ name: "startdate" }),
          search.createColumn({ name: "custevent_ht_turno_taller" })
        ],
      });     
      const myPagedData = CalendarEventSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getText({ name: "internalid" }),
            companyid: result.getValue({ name: "company" }),
            company: result.getText({ name: "company" }),
            transactionid: result.getValue({ name: "transaction" }),
            transaction: result.getText({ name: "transaction" }),
            startdate: result.getValue({ name: "startdate" }),
            taller: result.getValue({ name: "custevent_ht_turno_taller" }),
          });
        });
      });
      //log.debug("..........getCliente..............", respuesta[0]); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en getTurno", e.stack);
      return [];
    }
  };

  const getTurnoChequeoEvent = (ordenid, subsidiaria) => {
    try {
      log.debug(ordenid);
      const CalendarEventSearchObj = search.create({
      type: "task",
        filters:[
                  ["transaction.internalid", "anyof", ordenid]
                ],
        columns: [
          //search.createColumn({ name: "title", label: "title" }),
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "company" }),
          search.createColumn({ name: "transaction" }),
          search.createColumn({ name: "startdate" }),
          search.createColumn({ name: "custevent_ht_turno_taller" }),
        ],
      });     
      const myPagedData = CalendarEventSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getText({ name: "internalid" }),
            companyid: result.getValue({ name: "company" }),
            company: result.getText({ name: "company" }),
            transactionid: result.getValue({ name: "transaction" }),
            transaction: result.getText({ name: "transaction" }),
            startdate: result.getValue({ name: "startdate" }),
            taller: result.getValue({ name: "custevent_ht_turno_taller" }),
          });
        });
      });
      //log.debug("..........getCliente..............", respuesta[0]); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en getTurno", e.stack);
      return [];
    }
  };
   
   const getClientenetsuite = (identificacion, subsidiaria) => {
    try {
      const customerSearchObj = search.create({
        type: "customer",
        filters: [
                   //["internalid", "anyof", id]
                  ["vatregnumber", search.Operator.IS,  identificacion], "AND",
                  ["subsidiary", "anyof", subsidiaria]
                ],
        columns: [
          search.createColumn({ name: "entityid", label: "ID" }),
          // search.createColumn({ name: "altname", label: "Nombre" }),
          search.createColumn({ name: "email", label: "Correo electrónico" }),
          search.createColumn({ name: "phone", label: "Teléfono" }),
          search.createColumn({ name: "homephone", label: "Teléfono" }),
          search.createColumn({ name: "mobilephone", label: "Teléfono" }),
          // search.createColumn({ name: "custentity_ts_ec_tipo_persona", label: "EC - Tipo de persona", }),
          search.createColumn({ name: "internalid", label: "ID interno" }),
            search.createColumn({
            name: "address1",
            join: "Address",
            label: "Dirección",
          }),
          //search.createColumn({ name: "shipaddress", label: "Dirección de envío", }),
          search.createColumn({ name: "formulatext", formula: "{vatregnumber}", label: "Fórmula (texto)", }),
          search.createColumn({ name: "custentity_ht_cl_primernombre", label: "Primer Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_segundonombre", label: "Segundo Nombre" }),
          search.createColumn({ name: "custentity_ht_cl_apellidopaterno", label: "Apellido Paterno" }),
          search.createColumn({ name: "custentity_ht_cl_apellidomaterno", label: "Apellido Materno" }),
          search.createColumn({ name: "companyname", label: "Compania" }),
          // search.createColumn({ name: "custentity_ht_customer_id_telematic", label: "Telematic" }),  
          search.createColumn({ name: "subsidiary", label: "subsidiary" }),      
          search.createColumn({ name: "custentity_ht_cl_oficinacliente", label: "oficina" }),
          search.createColumn({ name: "custentity_ec_document_type", label: "tipoIdentificacion" }),             
        ],
      }); 
      const myPagedData = customerSearchObj.runPaged({ pageSize: 1000 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) {
          // Log Eliminar 21/08/2024
          let generalCorreos = obtenerCorreosPropietario(result.getValue({ name: "internalid" }), subsidiaria);
          log.debug('generalCorreos...Netsuite', generalCorreos);
          respuesta.push({
            idcliente: result.getValue({ name: "internalid" }),
            //cliente: result.getValue({ name: "altname" }),
            identificacion: result.getValue({ name: "formulatext" }),
            //direccion: result.getValue({ name: "shipaddress" }),
            direccion: result.getValue({ name: "address1", join: "Address" }) ?? "",
            //direccion: result.getValue({ name: "defaultaddress" }),
            telefono: formatearTelefono(result.getValue({ name: "phone" })),
            homephone: formatearTelefono(result.getValue({ name: "homephone" })),
            mobilephone: formatearTelefono(result.getValue({ name: "mobilephone" })),
            // tipopersona: result.getValue({ name: "custentity_ts_ec_tipo_persona", }),
            email: result.getValue({ name: "email" }),
            emailami:generalCorreos?.amiEmail ? generalCorreos?.amiEmail : result.getValue({ name: "email" }),
            emailpx:generalCorreos?.pxEmail ? generalCorreos?.pxEmail : result.getValue({ name: "email" }),
            primernombre:result.getValue({ name: "custentity_ht_cl_primernombre" }),
            segundonombre:result.getValue({ name: "custentity_ht_cl_segundonombre" }),
            apellidopaterno:result.getValue({ name: "custentity_ht_cl_apellidopaterno" }),
            apellidomaterno:result.getValue({ name: "custentity_ht_cl_apellidomaterno" }),
            tipoIdentificacion:result.getText({ name: "custentity_ec_document_type" }),
            oficina:result.getText({ name: "custentity_ht_cl_oficinacliente" }),
            compania:result.getValue({ name: "companyname" }),
            // clientetelematic:result.getValue({ name: "custentity_ht_customer_id_telematic" }),
            subsidiary:result.getValue({ name: "subsidiary" }),
          });
        });
      });
      log.debug("..........getClientenetsuite..............", respuesta[0]); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en getClientenetsuite", e);
      return [];
    }
  };

  function ConsultaEjecutiva(IdEjecutiva, subsidiaria){
    try{
        let Resultado = [];
        let Busqueda = search.create({
            type: "employee",
            filters:[
                //["isinactive","anyof","F"], "AND",
                ["isinactive","is","F"], "AND",
                ["subsidiary", "anyof", subsidiaria],"AND",
                ["internalid",search.Operator.IS,IdEjecutiva]
            ],
            columns:
            [
              search.createColumn({name: "internalid", label: "Id"}),
              search.createColumn({name: "entityid", label: "Codigo"}),
              search.createColumn({name: "altname", label: "Nombre"}),
              search.createColumn({name: "class", label: "Clase"}),
              search.createColumn({name: "location", label: "Ciudad"}),     
              search.createColumn({name: "custentity_ec_numero_registro", label: "identificacion"}),
              search.createColumn({name: "email", label: "Email"})
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
            let Identificacion = ResConsulta[i].getValue({name: 'custentity_ec_numero_registro'});
            let mailejecutiva = ResConsulta[i].getValue({name: 'email'});
            Resultado.push({
                Id: IdEjecutiva,
                Codigo: Codigo,
                Nombre: Nombre,
                IdClase: IdClase,
                Clase: Clase,
                Oficina: Oficina,
                IdOficina: IdOficina,
                Identificacion:Identificacion,
                mailejecutiva: mailejecutiva,
            });
        }
        //log.debug("........Resultado.................", Resultado);
        return Resultado[0];
    } catch (error) {
            log.error('error', error);
            return JSON.stringify({error: error.message});
            //return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaEjecutiva)';
    }
  }

  const getOrden = (id, subsidiaria)=> {
    try {
      let ResultadoConsulta = [];
      const salesorderSearchObj = search.create({
      type: "salesorder",
      filters: [
        ["type", "anyof", "SalesOrd"],
        "AND",
        ["subsidiary", "anyof", subsidiaria],
        "AND",
        ["internalid", "anyof", id],
        "AND",
        ["mainline", "is", "T"],
      ],
      columns: [
        { name: "custbody_ht_so_bien", label: "Bien" },
        { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },      
        { name: "tranid", label: "Num. Pedido" },
        { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
        { name: "internalid" },
        { name: "subsidiary", label: "Subsidiaria" },
        { name: "location", label: "location" },
        { name: "custbody_ht_os_ejecutivareferencia", label: "custbody_ht_os_ejecutivareferencia" },
        { name: "entity",  label: "Nombre" },   
      ],
      }); 
      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) { 
          const codigo = result.getText( { name: "custbody_ht_so_bien" });
          const nombre = result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" });
          const idbien = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN" });
          // const aseguradora = result.getValue(  { name: "name" , join: "custbody_ht_os_companaseguros" });
          //const name = result.getValue({ name: "name", join: "location" });
          const subsidiary = result.getText({ name: "subsidiary" }).split(":")[1].trim();
          //const subsidiary = result.getText(columns[12]).split(":")[1].trim();
          //  const nrodocPropietario = result
          //    ?.getValue({ name: "formulatext" })
          //    .split(" ")[0]
          //    .split("-")[2];
          const subsidiaryid = result.getValue({ name: "subsidiary" });
          //  const memo = result.getValue({ name: "memo" });
          //  const location = result.getValue({ name: "location" });
          const nOS = result.getValue({ name: "tranid" });
          const location = result.getText({ name: "location" });
          const ejecutivareId = result.getValue({ name: "custbody_ht_os_ejecutivareferencia" });
          ResultadoConsulta=ConsultaEjecutiva(ejecutivareId, subsidiaria);
          //const ejecutivareferencia = result.getText({ name: "custbody_ht_os_ejecutivareferencia" });
          const ejecutivareferencia = ResultadoConsulta?.Nombre ? ResultadoConsulta.Nombre : "";
          //  const concesionario = result.getText({ name: "custbody_ht_os_concesionario" });
          //  const fecha = result.getValue({ name: "trandate" });
          //  const consideracion = result.getValue({ name: "custbody_ht_os_consideracion" });
          const entity = result.getValue({ name: "entity" });        
           //const cliente = result.getText({ name: "entity" });
          respuesta.push({
            codigo,
            nombre,
            idbien,
            //cliente,
            //aseguradora,
            //cliente,
            // clientemonitoreo,
            //  nrodocPropietario,
            // name,
            subsidiary,
            subsidiaryid,
            //  memo,
            //  location,
            nOS,
            location,
            ejecutivareferencia,
            //  concesionario,
            //  fecha,
            //  consideracion,
            entity
          });
        });
      });
      //log.error('CUSTOMRECORD_HT_BN_MODELO.........', respuesta[0]);
      log.debug("..........ResultadoConsulta..............", ResultadoConsulta); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };

    const getOrdenTrabajo = (trabajo, subsidiaria, OrdenServicio) =>{
    try {
        let ordenTrabajoInstalacion = search.create({
            type: "customrecord_ht_record_ordentrabajo",
            filters:
                [
                   // ["internalid", "is", "182012"], "AND",
                    ["idtext","startswith",trabajo], "AND",
                    //["transaction.name", "anyof", trabajo], "AND",
                    ["custrecord_ht_ot_subsidiary", "anyof", subsidiaria], "AND", 
                    // ["custrecord_ht_ot_orden_servicio", "anyof", idOrdenServicio]
                    ["custrecord_ht_ot_orden_serivicio_txt", "contains", OrdenServicio ]
                ],
            columns:
                [
                    search.createColumn({ name: 'custrecord_ht_ot_supervisorasignacion', label: 'Supervisor' }),
                    search.createColumn({ name: 'custrecord_ht_ot_tecnicoasignacion', label: 'tecnico' }),
                    search.createColumn({ name: 'custrecord_ht_ot_estado', label: 'Estado' }),
                    search.createColumn({ name: 'name', label: 'name' }),
                    search.createColumn({ name: 'custrecord_ht_ot_serieproductoasignacion', label: 'SerieId' }),
                    search.createColumn({ name: 'custrecord_ht_mc_seriedispositivo', join: 'custrecord_ht_ot_serieproductoasignacion', label: 'SerieId' }),
                    search.createColumn({ name: 'internalid', label: 'internalid' })
                ]
        });
      const myPagedData = ordenTrabajoInstalacion.runPaged({ pageSize: 10 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) { 
          const supervisor = result.getValue( { name: "custrecord_ht_ot_supervisorasignacion" });
          const tecnico = result.getValue({ name: "custrecord_ht_ot_tecnicoasignacion" });
          const idestado = result.getValue({ name: "custrecord_ht_ot_estado" });
          const estado = result.getText({ name: "custrecord_ht_ot_estado" }).split("-")[1].trim();
          const internalid = result.getValue({ name: "internalid" });
          const name = result.getValue({ name: "name" });
          const serieproducto = result.getValue({ name: "custrecord_ht_ot_serieproductoasignacion" });
          const serieDispositivo = result.getValue({ name: "custrecord_ht_mc_seriedispositivo" });      
          respuesta.push({
            supervisor,
            tecnico,
            idestado,
            estado,
            name,
            internalid,
            serieproducto,
            serieDispositivo
          });
        });
      });
      //log.error('CUSTOMRECORD_HT_BN_MODELO.........', respuesta[0]);
      return respuesta[0];
    } catch (e) {
      log.error("Error en BuscarOT", e);
      return [];
    }
  };

  
  const getOrdenTurno = (tranid, subsidiaria)=> {
    try {
      let ResultadoConsulta = [];
      const salesorderSearchObj = search.create({
      type: "salesorder",
      filters: [
        ["type", "anyof", "SalesOrd"],
        "AND",
        ["subsidiary", "anyof", subsidiaria],
        "AND",
        ["tranid", "anyof", tranid],
        "AND",
        ["mainline", "is", "T"],
      ],
      columns: [
        { name: "custbody_ht_so_bien", label: "Bien" },
        { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },      
        { name: "tranid", label: "Num. Pedido" },
        { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
        { name: "internalid" },
        { name: "subsidiary", label: "Subsidiaria" },
        { name: "location", label: "location" },
        { name: "custbody_ht_os_ejecutivareferencia", label: "custbody_ht_os_ejecutivareferencia" },
        { name: "entity",  label: "Nombre" },   
      ],
      }); 
      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
      let respuesta = []; 
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index }); 
        myPage.data.forEach(function (result) { 
          //const codigo = result.getText( { name: "custbody_ht_so_bien" });
          const codigo =  result.getValue({ name: "internalid" });
          const nombre = result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" });
          const idbien = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN" });
          // const aseguradora = result.getValue(  { name: "name" , join: "custbody_ht_os_companaseguros" });
          //const name = result.getValue({ name: "name", join: "location" });
          const subsidiary = result.getText({ name: "subsidiary" }).split(":")[1].trim();
          //const subsidiary = result.getText(columns[12]).split(":")[1].trim();
          //  const nrodocPropietario = result
          //    ?.getValue({ name: "formulatext" })
          //    .split(" ")[0]
          //    .split("-")[2];
          const subsidiaryid = result.getValue({ name: "subsidiary" });
          //  const memo = result.getValue({ name: "memo" });
          //  const location = result.getValue({ name: "location" });
          const nOS = result.getValue({ name: "tranid" });
          const location = result.getText({ name: "location" });
          const ejecutivareId = result.getValue({ name: "custbody_ht_os_ejecutivareferencia" });
          ResultadoConsulta=ConsultaEjecutiva(ejecutivareId, subsidiaria);
          //const ejecutivareferencia = result.getText({ name: "custbody_ht_os_ejecutivareferencia" });
          const ejecutivareferencia = ResultadoConsulta?.Nombre ? ResultadoConsulta.Nombre : "";
          //  const concesionario = result.getText({ name: "custbody_ht_os_concesionario" });
          //  const fecha = result.getValue({ name: "trandate" });
          //  const consideracion = result.getValue({ name: "custbody_ht_os_consideracion" });
          const entity = result.getValue({ name: "entity" });
          respuesta.push({
            codigo,
            nombre,
            idbien,
            //aseguradora,
            //cliente,
            // clientemonitoreo,
            //  nrodocPropietario,
            // name,
            subsidiary,
            subsidiaryid,
            //  memo,
            //  location,
            nOS,
            location,
            ejecutivareferencia,
            //  concesionario,
            //  fecha,
            //  consideracion,
              entity
          });
        });
      });
      //log.error('CUSTOMRECORD_HT_BN_MODELO.........', respuesta[0]);
      log.debug("..........ResultadoConsulta..............", ResultadoConsulta); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en BuscarOS", e);
      return [];
    }
  };


  const obtenerItemParametrizadoPorBien = (IdOs, subsidiaria) => {
    let results = [];
    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["internalid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", subsidiaria], // Subsidiaria.
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "item" }),
          //search.createColumn({ name: "rate" }),
          search.createColumn({ name: "displayname", join: "item" }),
          search.createColumn({ name: "internalid", join: "item" }),
          //search.createColumn({ name: "type", join: "item" }),
          search.createColumn({ name: "custbody_ht_so_bien" }),
        ],
      });
      let searchResult = serviceOrderSearch.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          let infoparametros = "";
          item = result.getValue({ name: "item" });
          let info = obtenerParametrizacionItem(item, ['ADP', 'FAM']);
          results.push({
            internalidOs: result.getValue({ name: "internalid" }),
            iditem: item,
            //price: result.getValue({ name: "rate" }),
            displayname: result.getValue({ name: "displayname", join: "item" }),
            internalidItem: result.getValue({name: "internalid",join: "item"}),
            //type: result.getValue({ name: "type", join: "item" }),
            bien: result.getValue({ name: "custbody_ht_so_bien" }),
            accion:info[0]?.Valor ? info[0].Valor : "",  
            descrAccion:info[0]?.Descr ? info[0].Descr : "",
            familia:info[1]?.Valor ? info[1].Valor : "",
          });
        });
      });
      log.debug("results", results);
      return results;
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  };

  const obtenerItemParametrizadoPorOrden = (IdOs, subsidiaria) => {
    let results = [];
    try {
      let serviceOrderSearch = search.create({
        type: search.Type.SALES_ORDER,
        filters: [
          ["tranid", "is", IdOs],
          "AND",
          ["subsidiary", "anyof", subsidiaria], // Subsidiaria.
          "AND",
          ["item.internalid", "noneof", "@NONE@"],
          "AND",
          ["item.type", "noneof", "TaxItem"],
        ],
        columns: [
          search.createColumn({ name: "internalid" }),
          search.createColumn({ name: "item" }),
          search.createColumn({ name: "displayname", join: "item" }),
          search.createColumn({ name: "internalid", join: "item" }),
          search.createColumn({ name: "custbody_ht_so_bien" }),
        ],
      });
      let searchResult = serviceOrderSearch.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {
        let myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          let infoparametros = "";
          item = result.getValue({ name: "item" });
          let info = obtenerParametrizacionItem(item, ['ADP', 'FAM', 'TAG','TTR']);
          results.push({
            internalidOs: result.getValue({ name: "internalid" }),
            IdOs:IdOs,
            iditem: item,
            displayname: result.getValue({ name: "displayname", join: "item" }),
            internalidItem: result.getValue({name: "internalid",join: "item"}),
            bien: result.getValue({ name: "custbody_ht_so_bien" }),
            accion:info[0]?.Valor ? info[0].Valor : "",  
            descrAccion:info[0]?.Descr ? info[0].Descr : "",
            familia:info[1]?.Valor ? info[1].Valor : "",
            tag:info[2]?.Valor ? info[2].Valor : "",
            descrtag:info[2]?.Descr ? info[2].Descr : "",
            ttr:info[3]?.Valor ? info[3].Valor : "",
          });
        });
      });      
      return results;
    } catch (error) {
      log.debug("error", error);
      return [];
    }
  };
  
  
  const getOrdenCanales = (id, subsidiaria)=> {
    try {
      let ResultadoConsulta = [];
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["subsidiary", "anyof", subsidiaria],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "custbody_ht_so_bien", label: "Bien" },
          { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "internalid" },
          { name: "subsidiary", label: "Subsidiaria" },
          { name: "location", label: "location" },
          { name: "custbody_ht_os_ejecutivareferencia", label: "custbody_ht_os_ejecutivareferencia" },         
          search.createColumn({ name: "name", join: "CUSTBODY_HT_OS_COMPANIASEGUROS", label: "Aseguradora" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_COMPANIASEGUROS", label: "Aseguradora" }),
          search.createColumn({ name: "name", join: "CUSTBODY_HT_OS_CONCESIONARIO", label: "Concesionario" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_CONCESIONARIO", label: "Concesionario" }),
          search.createColumn({ name: "name", join: "CUSTBODY_HT_OS_BANCOFINANCIERA", label: "Financiera" }),
          search.createColumn({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_BANCOFINANCIERA", label: "Financiera" }),
          { name: "custbody_ht_os_bancofinanciera", label: "custbody_ht_os_bancofinanciera" },   
          { name: "custbody_ht_os_concesionario", label: "custbody_ht_os_concesionario" }, 
          { name: "custbody_ht_os_companiaseguros", label: "custbody_ht_os_companiaseguros" }, 
          { name: "custbody_ht_os_vendcanaldistribucion", label: "custbody_ht_os_vendcanaldistribucion" }, 
        ],
      }); 
      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];  
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          const codigo = result.getText( { name: "custbody_ht_so_bien" });
          const nombre = result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" });
          const idbien = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN" });
          const aseguradora = result.getValue({  name: "name",join: "CUSTBODY_HT_OS_COMPANIASEGUROS", label: "Aseguradora"});
          const diraseguradora = result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_COMPANIASEGUROS", label: "Aseguradora"});
          const concesionario = result.getValue({  name: "name", join: "CUSTBODY_HT_OS_CONCESIONARIO",label: "Concesionario"});
          const dirconcesionario= result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_CONCESIONARIO", label: "Concesionario"});
          const financiera = result.getValue({  name: "name", join: "CUSTBODY_HT_OS_BANCOFINANCIERA",label: "Financiera"});
          const dirfinanciera= result.getValue({ name: "custrecord_ht_cd_direccion", join: "CUSTBODY_HT_OS_BANCOFINANCIERA", label: "Financiera"});
          const idaseguradora = result.getValue({  name: "custbody_ht_os_companiaseguros"});
          const idconcesionario = result.getValue({  name: "custbody_ht_os_concesionario"});
          const idfinanciera = result.getValue({  name: "custbody_ht_os_bancofinanciera"});
          const idvendedor = result.getValue({  name: "custbody_ht_os_vendcanaldistribucion"});
          const vendedor = result.getText({  name: "custbody_ht_os_vendcanaldistribucion"}); 
          const nOS = result.getValue({ name: "tranid" });
          const location = result.getText({ name: "location" });
          const ejecutivareId = result.getValue({ name: "custbody_ht_os_ejecutivareferencia" });
          ResultadoConsulta=ConsultaEjecutiva(ejecutivareId, subsidiaria );
           //const ejecutivareferencia = result.getText({ name: "custbody_ht_os_ejecutivareferencia" });
          const ejecutivareferencia = ResultadoConsulta?.Nombre ? ResultadoConsulta.Nombre : "";
          const subsidiaryid = result.getValue({ name: "subsidiary" });
          const mailejecutiva = ResultadoConsulta?.mailejecutiva ? ResultadoConsulta.mailejecutiva : "";
          respuesta.push({
            codigo,
            codigo,
            nombre,
            idbien,
            aseguradora,
            diraseguradora,
            concesionario,
            dirconcesionario,
            financiera,
            dirfinanciera,
            nOS,
            subsidiaryid,
            location,
            ejecutivareferencia,
            idaseguradora,
            idconcesionario,
            idfinanciera,
            idvendedor,
            vendedor,
            mailejecutiva
          });
        });
      });
      log.debug('CUSTOMRECORD_HT_BN_MODELO.........', respuesta[0]);
      //log.debug("..........ResultadoConsulta..............", ResultadoConsulta); 
      return respuesta[0];
    } catch (e) {
      log.error("Error en getOrdenCanales", e);
      return [];
    }
  };


  const getOrdenEjecutiva= (id, subsidiaria)=> {
    try {
      let ResultadoConsulta = [];
      const salesorderSearchObj = search.create({
        type: "salesorder",
        filters: [
          ["type", "anyof", "SalesOrd"],
          "AND",
          ["subsidiary", "anyof", subsidiaria],
          "AND",
          ["internalid", "anyof", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          { name: "custbody_ht_so_bien", label: "Bien" },
          { name: "altname", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "tranid", label: "Num. Pedido" },
          { name: "internalid", join: "CUSTBODY_HT_SO_BIEN", label: "Nombre" },
          { name: "internalid" },
          { name: "subsidiary", label: "Subsidiaria" },
          { name: "location", label: "location" },
          { name: "custbody_ht_os_ejecutivareferencia", label: "custbody_ht_os_ejecutivareferencia" },       
        ],
      }); 
      const myPagedData = salesorderSearchObj.runPaged({ pageSize: 10 });
      let respuesta = [];  
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          const codigo = result.getText( { name: "custbody_ht_so_bien" });
          const nombre = result.getValue({ name: "altname", join: "CUSTBODY_HT_SO_BIEN" });
          const idbien = result.getValue({ name: "internalid", join: "CUSTBODY_HT_SO_BIEN" });
          const nOS = result.getValue({ name: "tranid" });
          const location = result.getText({ name: "location" });
          //const iditem = result.getValue({ name: "item" });
          const ejecutivareId = result.getValue({ name: "custbody_ht_os_ejecutivareferencia" });
          const subsidiaryid = result.getValue({ name: "subsidiary" });
          respuesta.push({
            codigo,
            codigo,
            nombre,
            idbien,
            nOS,
            subsidiaryid,
            location,
            ejecutivareId
            
          });
        });
      });
      log.debug('getOrdenEjecutiva.........', respuesta[0]);
      return respuesta[0];
    } catch (e) {
      log.error("Error en getOrdenEjecutiva", e);
      return [];
    }
  };


  const obtenerItemOS = (IdOs, subsidiaria, item) => {
    let results = [];
    if (!IdOs) {
        return results;
    }
    try {
        let serviceOrderSearch = search.create({
            type: search.Type.SALES_ORDER,
            filters: [
                ["internalid", "is", IdOs],
                "AND",
                ["subsidiary", "anyof", subsidiaria],
                "AND",
                ["item.internalid", "noneof", "@NONE@"],
                "AND",
                ["item.type", "noneof", "TaxItem"],
                "AND",
                ["item", "anyof", item],
            ],
            columns: [
                search.createColumn({ name: "internalid" }),
                search.createColumn({ name: "item" }),
                search.createColumn({ name: "custcol_ht_os_und_tiempo_cobertura" }),
                search.createColumn({ name: "custcol_ht_os_tiempo_cobertura" }),
                search.createColumn({ name: "custbody_ht_so_bien" }),
                search.createColumn({ name: "amount" }),
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
                    amount: result.getValue({ name: "amount" }),
                });
            });
        });
      return results[0];
    } catch (error) {
        log.debug("error", error);
        return [];
    }
  };


  const obtenerInformacionItemOs = (idOS, itemId, subsidiaria) => {
    try {
      // Crear una búsqueda para obtener los datos del registro de la orden de venta
      let searchResult = search.create({
          type: "salesorder",
          filters: [
                    ["internalid", "is", idOS],
                    "AND",
                    ["subsidiary", "anyof", subsidiaria],
                    "AND",
                    ["item.internalid", "is", itemId]
                  ],
          columns: [
            "entity",
            "item",
            "custcol_ht_os_cliente",
            "custcol_ht_os_cliente_monitoreo",
            "custcol_ht_os_tiempo_cobertura",
            "custcol_ht_os_und_tiempo_cobertura"                
          ]
      }).run().getRange({ start: 0, end: 1 });
      if (searchResult.length > 0) {
        let result = searchResult[0];
        let cliente = result.getValue({ name: "entity" });
        let items = result.getValue({ name: "item" });
        let clienteItem = result.getValue({ name: "custcol_ht_os_cliente" });
        let monitoreo = result.getValue({ name: "custcol_ht_os_cliente_monitoreo" });
        let quantity = parseInt(result.getValue({ name: "custcol_ht_os_tiempo_cobertura" })) || 0;
        let unidadTiempo = result.getValue({ name: "custcol_ht_os_und_tiempo_cobertura" }) || 0;
        return {
          cliente,
          clienteItem,
          items,
          monitoreo,
          quantity,
          unidadTiempo,
          idOS
        };
      } else {
        log.debug("Item no encontrado", `El item con ID ${itemId} no se encontró en la orden de venta con ID ${idOS}.`);
        return null;
      }
    } catch (e) {
      log.error("Error al obtener la información del item", e);
      return null;
    }
  };

  const obtenerInformacionDispositivo = (NumeroSerieDispositivo, subsidiaria) => {
    let results = [];
    try {
      //log.error("NumeroSerieDispositivo", NumeroSerieDispositivo);
      var customerSearchObj = search.create({
        type: "customrecord_ht_record_mantchaser",
        filters: [
                  // ["internalid", "anyof", id],
                  // "AND", 
                  ["name", "is", NumeroSerieDispositivo],
                  //--"AND",
                 //--["custrecord_ht_mc_subsidiaria", "anyof", subsidiaria],
                 //"AND",
                 //["custrecord_ht_mc_enlace", "noneof", "@NONE@"],
                ],
        columns: [
          search.createColumn({ name: "name", label: "Nombre" }),
          search.createColumn({ name: "scriptid", label: "ID de script" }),
          search.createColumn({ name: "custrecord_ht_mc_enlace", label: "Enlace", }),
          search.createColumn({ name: "custrecord_ht_mc_ubicacion", label: "Ubicación", }),
          search.createColumn({ name: "custrecord_ht_mc_seriedispositivo",  label: "Serie Dispositivo", }),
          search.createColumn({ name: "custrecord_ht_mc_modelo",  label: "Modelo",  }),
          search.createColumn({ name: "custrecord_ht_mc_imei", label: "IMEI" }),
          search.createColumn({  name: "custrecord_ht_mc_firmware", label: "Firmware", }),
          search.createColumn({ name: "custrecord_ht_mc_script", label: "Script", }),
          search.createColumn({ name: "custrecord_ht_mc_servidor", label: "Servidor", }),
          search.createColumn({ name: "custrecord_ht_mc_tipodispositivo", label: "Tipo Dispositivo", }),
          search.createColumn({ name: "custrecord_ht_mc_unidad", label: "Unidad", }),
          search.createColumn({ name: "custrecord_ht_mc_vid" }),
          search.createColumn({ name: "custrecord_ht_mc_macaddress", label: "MAC Address", }),
          search.createColumn({ name: "custrecord_ht_mc_sn", label: "SN" }),
          search.createColumn({ name: "custrecord_ht_mc_estadolodispositivo", label: "Estado Dispositivo",  }),
          search.createColumn({ name: "custrecord_ht_mc_celularsimcard", label: "Celular SIMCARD",  }),
          search.createColumn({ name: "custrecord_ht_mc_operadora", label: "Operadora", }),
          search.createColumn({ name: "custrecord_ht_mc_ip", label: "IP" }),
          search.createColumn({ name: "custrecord_ht_mc_apn", label: "APN" }),
          search.createColumn({ name: "custrecord_ht_mc_nocelularsim", label: "No. Celular SIM", }),
          search.createColumn({ name: "custrecord_ht_mc_icc", label: "ICC" }),
          search.createColumn({ name: "custrecord_ht_mc_estadosimcard", label: "Estado SIMCARD", }),
          search.createColumn({ name: "custrecord_ht_mc_seriedispositivolojack", label: "Serie Dispositivo Lojack", }),
          search.createColumn({ name: "custrecord_ht_mc_codigoactivacion", label: "Código de Activación", }),
          search.createColumn({ name: "custrecord_ht_mc_codigorespuesta", label: "Código de Respuesta", }),
          search.createColumn({ name: "custrecord_ht_mc_estadolojack", label: "Estado Lojack", }),
        ],
      });
      var searchResult = customerSearchObj.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
         // log.debug('............custrecord_ht_mc_modelo............1.........',result.getValue({ name: "custrecord_ht_mc_modelo" }));
          let nombreModelo = obtenerNombreDispositivo( result.getValue({ name: "custrecord_ht_mc_modelo" }) , subsidiaria );
          let nombreScript = obtenerNombreScript( result.getValue({ name: "custrecord_ht_mc_script" }) , subsidiaria );
         //let nombreModelo = obtenerNombreDispositivo( result.getValue({ name: "custrecord_ht_mc_modelo" })  );        
         //let nombreScript = obtenerNombreScript( result.getValue({ name: "custrecord_ht_mc_script" })  );
          //log.debug('............nombreModelo............1.........',nombreModelo);
          results.push({
            nombre: result.getValue({ name: "name", label: "Nombre" }),
            idScript: result.getValue({ name: "scriptid", label: "ID de script", }),
            enlace: result.getValue({ name: "custrecord_ht_mc_enlace", label: "Enlace", }),
            ubicacion: result.getValue({ name: "custrecord_ht_mc_ubicacion", label: "Ubicación", }),
            serieDispositivo: result.getValue({ name: "custrecord_ht_mc_seriedispositivo", label: "Serie Dispositivo", }),
            serieDispositivoText: result.getText({ name: "custrecord_ht_mc_seriedispositivo", label: "Serie Dispositivo", }),
            codmodelo: result.getValue({ name: "custrecord_ht_mc_modelo", label: "Codigo modelo", }),
            modelo: nombreModelo || "",
            imei: result.getValue({ name: "custrecord_ht_mc_imei", label: "IMEI",  }),
            firmware: result.getText({ name: "custrecord_ht_mc_firmware", label: "Firmware", }),
            script: nombreScript || "",
            servidor: result.getText({ name: "custrecord_ht_mc_servidor", label: "Servidor", }),
            tipoDispositivo: result.getValue({ name: "custrecord_ht_mc_tipodispositivo", label: "Tipo Dispositivo", }),
            unidad: result.getText({ name: "custrecord_ht_mc_unidad", label: "Unidad", }),
            codunidad: result.getValue({ name: "custrecord_ht_mc_unidad", label: "Unidad", }),
            vid: result.getValue({ name: "custrecord_ht_mc_vid" }),
            macAddress: result.getValue({ name: "custrecord_ht_mc_macaddress", label: "MAC Address", }),
            sn: result.getValue({ name: "custrecord_ht_mc_sn", label: "SN" }),
            estadoDispositivo: result.getValue({ name: "custrecord_ht_mc_estadolodispositivo", label: "Estado Dispositivo", }),
            celularSIMCARD: result.getText({ name: "custrecord_ht_mc_celularsimcard", label: "Celular SIMCARD", }),
            operadora: result.getText({ name: "custrecord_ht_mc_operadora", label: "Operadora", }),
            ip: result.getValue({ name: "custrecord_ht_mc_ip", label: "IP" }),
            apn: result.getValue({ name: "custrecord_ht_mc_apn", label: "APN", }),
            noCelularSIM: result.getValue({ name: "custrecord_ht_mc_nocelularsim", label: "No. Celular SIM", }),
            icc: result.getValue({ name: "custrecord_ht_mc_icc", label: "ICC", }),
            estadoSIMCARD: result.getValue({ name: "custrecord_ht_mc_estadosimcard", label: "Estado SIMCARD", }),
            serieDispositivoLojack: result.getValue({ name: "custrecord_ht_mc_seriedispositivolojack", label: "Serie Dispositivo Lojack", }),
            codigoActivacion: result.getValue({ name: "custrecord_ht_mc_codigoactivacion", label: "Código de Activación", }),
            codigoRespuesta: result.getValue({ name: "custrecord_ht_mc_codigorespuesta", label: "Código de Respuesta", }),
            estadoLojack: result.getValue({ name: "custrecord_ht_mc_estadolojack", label: "Estado Lojack", }),
          });
        });
      });
      //log.debug('............custrecord_ht_mc_modelo.....................',results[0]);
      return results[0];
    } catch (error) {
      log.debug("error", error);
      return results;
    }
  };

  // TODO: Obtener nombre del modelo del dispositivo.
  const obtenerNombreDispositivo = (id, subsidiaria) => {
    try{
      let obtenerNombreModelo = search.create({
        type: "customrecord_ht_dd_modelodispositivo",
        filters: [["internalid", "anyof", id],
                  //--"AND",
                  //--["custrecord_ht_sub", "anyof", subsidiaria],
                ],
        columns: [ search.createColumn({ name: "custrecord_ht_dd_modelodispositivo_descr", label: "Nombre", }), ],
      });
      let results = [];
      let searchResult = obtenerNombreModelo.runPaged();
      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });   
        myPage.data.forEach(function (result) {
          results.push({
            modelo: result.getValue({ name: "custrecord_ht_dd_modelodispositivo_descr", label: "Nombre", }),
          });
        });
      });
      //log.debug('............modelo............1.........',results[0]);
      return results[0]?.modelo;
    } catch(e) {
      return "";
    }
  };
  
  // TODO: Obtener nombre del script del dispositivo.
  const obtenerNombreScript = (id, subsidiaria) => {
    try {
      let obtenerNombreModelo = search.create({
        type: "customrecord_ht_mc_script",
        filters: [["internalid", "anyof", id],
                  //--"AND",
                  //--["custrecord_script_sub", "anyof", subsidiaria],
                  ],
        columns: [ search.createColumn({ name: "custrecord_ht_mc_script_descrip", label: "Nombre", }), ],
      });  
      let results = [];
      let searchResult = obtenerNombreModelo.runPaged();   
      searchResult.pageRanges.forEach(function (pageRange) {
        var myPage = searchResult.fetch({ index: pageRange.index });    
        myPage.data.forEach(function (result) {
          results.push({
            modelo: result.getValue({ name: "custrecord_ht_mc_script_descrip", label: "Nombre", }),
          });
        });
      });
      return results[0]?.modelo;
    } catch(e){
      return "";
    } 
  };

  const obtenerCorreosPropietario = (customerId, subsidiaria) => {
      let result = {
          email: "",
          amiEmail: "",
          mainEmail: "",
          convenioEmail: "",
          pxEmail: ""
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
              if (mainEmail) result.mainEmail = email.toLowerCase();
              if (emailType == "1") result.email = email.toLowerCase();
              if (emailType == "2") result.amiEmail = email.toLowerCase();
              if (emailType == "3") result.convenioEmail = email.toLowerCase();
              if (emailType == "8") result.pxEmail = email.toLowerCase();
          }
      }
      return result;
  }

  const getVehiculoServicios = (id, subsidiaria) => {
    try {     
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_nc_servicios_instalados",
        filters: [["custrecord_ns_bien_si", "anyof", id],
                  //--"AND",
                 //--["custrecord_si_sub", "anyof", subsidiaria], 
                ],       
        columns: [
          { name: "internalid" },
          { name: "custrecord_ns_servicio" },
          { name: "custrecord_ht_si_numero_puertas" },
          { name: "custrecord_ht_si_novedad" },
          { name: "custrecord_ht_tipo" }
        ],
      });
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let count= myPagedData.count;
      let respuesta = [];
      var camposervicio='';
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          if (count == 1) {
            camposervicio=result.getText({ name: "custrecord_ns_servicio" });
            //camposervicio=camposervicio.replace(',','/');
            //camposervicio=camposervicio.replace(',','/');
            //camposervicio=camposervicio.replace(',','/');
            //camposervicio=camposervicio.replace(',','/');
            camposervicio = camposervicio.replace(/,/g, "/");
          } else {
            camposervicio+=","+result.getText({ name: "custrecord_ns_servicio" });
          }          
        });
      });
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getValue({ name: "internalid" }),
            servicio: result.getText({ name: "custrecord_ns_servicio" }),
            infservicio: result.getValue({ name: "custrecord_ns_servicio" }),
            numeroPuertas: result.getValue({ name: "custrecord_ht_si_numero_puertas" }),
            novedad: result.getValue({ name: "custrecord_ht_si_novedad" }),
            tipo: result.getText({ name: "custrecord_ht_tipo" }),
            camposervicio: camposervicio ? obtenerValoresUnicos( camposervicio.replace(',','').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace(/\//g, ",")) : ""
            //camposervicio: camposervicio ? obtenerValoresUnicos( camposervicio.replace(',','').replace('/',',').replace('/',',').replace('/',',').replace('/',',')) : ""
            //camposervicio: camposervicio ? camposervicio.replace(',','') : ""
            //camposervicio: camposervicio ? camposervicio : ""
          });
        });
      });

      log.debug("......getVehiculoServicios...........",respuesta);
      return respuesta[0];   
    } catch (e) {
      log.error("Error en getVehiculoServicios", e);
      return [];
    }
  };

  const getVehiculoServiciosTrabajo = (id, subsidiaria, orden) => {
    try {
      const vehicleSearchObj = search.create({
        type: "customrecord_ht_nc_servicios_instalados",
        filters: [["custrecord_ns_bien_si", "anyof", id],
                  //--"AND",
                  //--["custrecord_si_sub", "anyof", subsidiaria], 
                  "AND",
                  ["custrecord_ns_orden_servicio_si", "anyof", orden], 
                //  "AND",
                //  ["custrecord_ns_orden_trabajo", "anyof", trabajo],                
                ],        
        columns: [
          { name: "internalid" },
          { name: "custrecord_ns_servicio" },
          { name: "custrecord_ht_si_numero_puertas" },
          { name: "custrecord_ht_si_novedad" },
          { name: "custrecord_ht_tipo" }
        ],
      });
      const myPagedData = vehicleSearchObj.runPaged({ pageSize: 10 });
      let count= myPagedData.count;
      let respuesta = [];
      var camposervicio='';
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          if (count == 1) {
            camposervicio=result.getText({ name: "custrecord_ns_servicio" });
           //camposervicio=camposervicio.replace(',','/');
           // camposervicio=camposervicio.replace(',','/');
            //camposervicio=camposervicio.replace(',','/');
            //camposervicio=camposervicio.replace(',','/');
            camposervicio = camposervicio.replace(/,/g, "/");      
          } else {
             log.debug("......camposervicio.......22....",camposervicio);
            camposervicio+=","+result.getText({ name: "custrecord_ns_servicio" });
          }          
        });
      });
      myPagedData.pageRanges.forEach((pageRange) => {
        const myPage = myPagedData.fetch({ index: pageRange.index });
        myPage.data.forEach(function (result) {
          respuesta.push({
            id: result.getValue({ name: "internalid" }),
            servicio: result.getText({ name: "custrecord_ns_servicio" }),
            infservicio: result.getValue({ name: "custrecord_ns_servicio" }),
            numeroPuertas: result.getValue({ name: "custrecord_ht_si_numero_puertas" }),
            novedad: result.getValue({ name: "custrecord_ht_si_novedad" }),
            tipo: result.getText({ name: "custrecord_ht_tipo" }),
            camposervicio: camposervicio ? obtenerValoresUnicos( camposervicio.replace(',','').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace(/\//g, ",")) : ""
           //camposervicio: camposervicio ? obtenerValoresUnicos( camposervicio.replace(',','').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',').replace('/',',')) : ""
            //camposervicio: camposervicio ? obtenerValoresUnicos( camposervicio.replace("/", /,/g)) : ""
            //camposervicio: camposervicio ? camposervicio.replace(',','') : ""
            // camposervicio: camposervicio ? camposervicio : ""
          });
        });
      });
      log.debug("......getVehiculoServiciosTrabajo...........",respuesta);
      return respuesta[0];   
    } catch (e) {
      log.error("Error en getVehiculoServiciosTrabajo", e);
      return [];
    }
  };


  const comandoServicio = (lista, subsidiaria) => {
    try {
      let data = [];
      let filtro = [];
      if (lista !== undefined) {
        parametrosOpcionales = lista?.toString();
        filtro.push([ [ "internalid", "anyof", parametrosOpcionales.split(","), ],
                      //"AND",
                      //["custrecord_ht_sv_sub", "anyof", subsidiaria], 
                    ] );
      }
      const busqueda = search.create({
        type: "customrecord_ht_servicios",
        filters: filtro,
        columns: [ { name: "custrecord_ht_sv_command" }, ],
      });
      let resultCount = busqueda.runPaged().count;
      if (resultCount > 0) {
        let pageData = busqueda.runPaged({ pageSize: 10 });
        pageData.pageRanges.forEach((pageRange) => {
          let page = pageData.fetch({ index: pageRange.index });
          page.data.forEach((result) => {
            let columns = result.columns;
            let parametrizacion = { comando: result.getText(columns[0]) || "", };
            data.push(parametrizacion);
          });
        });
      }
      return data;
    } catch (e) {
      log.error("Error en getVehiculoServicios", e);
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
            search.createColumn({ name: "custrecord_ht_pp_descripcion", join: "CUSTRECORD_HT_PP_PARAMETRIZACION_VALOR", label: "Código" }),
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
                Descr: result.getValue(columns[4]) || "",
              };
              data.push(parametrizacion);
            });
          });
        }
      }
      return data;
    } catch (error) {
      log.error("Error", {error: error.message, stack: error.stack});
      return []
    }
  };


  function filtrarYCombinarComandos(datos) {
    let comandoFinal = '';
    try {
      // Filtra y combina los comandos en una sola cadena, eliminando aquellos vacíos.
      if (Array.isArray(datos)) {
        comandoFinal = datos
          .map(c => c.comando)
          .filter(c => c)  // Elimina valores vacíos
          .join(', ');     // Une los comandos con una coma y un espacio
      }
    } catch (error) {
        console.error('Error en filtrarYCombinarComandos:', error);
    }
    return comandoFinal;
  }


  function limpiarServicio(servicio) {
    try {
     // log.debug('..........getOrden..............',servicio);
      // Verificamos que el campo 'servicio' exista y sea una cadena
      if (typeof servicio !== 'string') {
        return '';
      }
      // Eliminamos los códigos numéricos y los guiones de cada servicio
      let serviciosLimpios = servicio
        .split(',')                       // Dividimos la cadena por comas
        .map(s => s.split(' - ')[1])       // Eliminamos el código antes del guion
        .join(',');                        // Unimos los servicios sin los códigos
      // Actualizamos el valor de 'servicio' en el objeto original
      return serviciosLimpios || "";
    } catch (error) {
        console.error("Ocurrió un error al procesar limpiarServicio:", error.message);
        return '';
    };
  }


  function HTServidorRelacionado(data, subsidiaria) {
    try {
      const searchObj = search.create({
        type: "customrecord_ht_mc_servidor",
        filters: [ ['internalid', "is", data],
                   //--"AND",
                   //--["custrecord_sub_servidor", "anyof", subsidiaria],
                ],
        columns: [ search.createColumn({ name: "custrecord_ht_mc_servidor_id_telematic" }), ]
      });  
      const results = searchObj.run().getRange({ start: 0, end: 1 });
      if (results.length > 0) {
        return results[0].getValue({ name: "custrecord_ht_mc_servidor_id_telematic" });
      } else {
        return "";
      }
    } catch (error) {
      return "";
    }
  }


  function ConsultaIDTelematic(data, subsidiaria) {
    try {
     // log.debug(data);
      const searchObj = search.create({
        type: "customrecord_ht_dd_modelodispositivo",
        filters: [ ['internalid', "is", data],
                   //--"AND",
                   //--["custrecord_ht_sub", "anyof", subsidiaria], 
                ],
        columns: [
          search.createColumn({ name: "custrecord_ht_dd_mod_disp_id_telematic" }),
          search.createColumn({ name: "custrecord_ht_md_servidor_relacionado" })
        ]
      });  
      const results = searchObj.run().getRange({ start: 0, end: 1 }); 
      //log.debug(data);
      if (results.length > 0) {
        let idservidorrelacionado = results[0].getValue({ name: "custrecord_ht_md_servidor_relacionado" });      
        //log.debug("idservidorrelacionado", idservidorrelacionado);
        let idtelematic = idservidorrelacionado ? HTServidorRelacionado(idservidorrelacionado, subsidiaria) : "";       
        let resultado = {
          idtelematicServidor: idtelematic || "",
          idtelematicModelo: results[0].getValue({ name: "custrecord_ht_dd_mod_disp_id_telematic" }) || ""
        }
        return resultado;
      } else {
        return 0;
      }
    } catch (error) {
      return 0;
    }
  }

  return {
      get: _get,
      post: _post,
      put: _put,
      delete: _delete
  }

});