/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/https', 'N/encode', 'N/task','N/file'], function (log, https, encode, task, file) {
    // const URLPX = 'https://tyr.24hm.net/API_PX/WSPX.asmx';  
    // const NACIONALIDAD = "EC";

    function _post(context) {
        // log.debug("context-sendPXServer", context);
        // log.debug("URLPX-sendPXServer", context.URLPX);
        log.debug("NACIONALIDAD-sendPXServer", context.NACIONALIDAD);

        var URLPX=context.URLPX;
        var NACIONALIDAD=context.NACIONALIDAD;
        
        let headers1 = [];
        headers1['Content-Type'] = 'text/xml';
        headers1['SOAPAction'] = 'http://tempuri.org/AutenticacionUsuarioPx';
        var raw = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\r\n  <soap:Header>\r\n    <SeguridadPx xmlns=\"http://tempuri.org/\">\r\n " +
            "<StrToken>" + context.StrToken + "</StrToken>\r\n" +
            "<UserName>" + context.UserName + "</UserName>\r\n" +
            "<Password>" + context.Password + "</Password>\r\n" +
            "</SeguridadPx>\r\n  </soap:Header>\r\n  <soap:Body>\r\n" +
            "<AutenticacionUsuarioPx xmlns=\"http://tempuri.org/\" />\r\n  </soap:Body>\r\n</soap:Envelope>";

        //log.debug('raw', raw);
        //log.debug('url', `${URLPX}?op=AutenticacionUsuarioPx`);
        const resp = https.post({
            url: `${URLPX}?op=AutenticacionUsuarioPx`,
            headers: headers1,
            body: raw
        });



        var xmlDoc = resp.body;
        log.debug('resp.body', resp.body)
        const regex = /.*<AutenticacionUsuarioPxResult>(.*)<\/AutenticacionUsuarioPxResult>.*/;

        let rowXml = getBodyByOperacionOrden(context);

       // log.debug("rowXml.......................", rowXml);
        let string = xmlDoc.replace(regex, '$1');

       // log.debug("AutenticacionToken", string);

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
         const resp2 = https.post({
             url: `${URLPX}?op=InsertaOrdenV2`,
             headers: headers2,
             body: rawInsert
         });
        //galvar se comento por pedido de Peru 14-03-2025
          //let Respon;
        //  if (NACIONALIDAD == "PE") {
        //     // log.debug('...............IMPULSO A PLATAFORMA....................', headers2);
        //     //para ejecutar el proceso URL
        //   const resp2 = https.post({
        //           url: `${URLPX}?op=InsertaOrdenV2`,
        //           headers: headers2,
        //           body: rawInsert
        //       });
        //      //log.debug('headers2',headers2);
               /*/log.debug('...............Response-Hunter-PXADMIN....................', resp2);

            // const regex2 = /.*<string>(.*)<\/string>.*/;
            // Respon = resp2.body.replace(regex2, '$1');

            // log.debug('...............Respon....................', Respon);

        //  }
        //fin
        //log.debug('url', `${URLPX}?op=InsertaOrdenV2`);
        //log.debug('headers2',headers2);
        
        //-log.debug('headers2................',rawInsert);

        var xmlFile = file.create({
            //-name: context.StrToken+'.xml', // Nombre del archivo
           // name: context.NumeroOrden +'.xml', 
            name: context.FileName +'.xml', 
            fileType: file.Type.XMLDOC, // Tipo de archivo
            contents: rawInsert, // Contenido XML
            encoding: file.Encoding.UTF8, // Codificación
            folder: 24686 // ID de la carpeta donde deseas guardar, -15 es "Sin carpeta"
        });
        var fileId = xmlFile.save();
        //log.debug('fileId', fileId);
        

        const regex2 = /.*<string>(.*)<\/string>.*/;
        let Respon = resp2.body.replace(regex2, '$1');
        log.debug('XML', rawInsert);
        log.debug('Response-Hunter-PXADMIN', resp2);
        log.debug('Response-PXLATAM', Respon);

      //proceso de contacto emergencia
        if (context.Alerta =="S" && context.Emergencia.length > 0 ){
            let headers3 = [];
            headers3['Content-Type'] = 'text/xml';
            headers3['SOAPAction'] = 'http://tempuri.org/ContactoEmergencia';

            let rowXmlAlerta  = getBodyByOperacionAlerta(context);

            var rawInsertAlerta = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\r\n<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">\r\n" +
            "<soap:Header>\r\n  " +
            "<SeguridadPx xmlns=\"http://tempuri.org/\">\r\n" +
            "<StrToken>" + context.StrToken + "</StrToken>\r\n" +
            "<AutenticacionToken>" + string + "</AutenticacionToken>\r\n" +
            "<UserName>" + context.UserName + "</UserName>\r\n" +
            "<Password>" + context.Password + "</Password>\r\n" +
            "</SeguridadPx>\r\n" +
            "</soap:Header>\r\n" +
            "<soap:Body>\r\n" +
            "<ContactoEmergencia xmlns=\"http://tempuri.org/\">\r\n" +
            "<strXml>\r\n" +
            "<![CDATA[\r\n" +
            rowXmlAlerta  + "\r\n" +
            "]]>\r\n" +
            "</strXml>\r\n" +
            "<strNacionalidad>"+ NACIONALIDAD +"</strNacionalidad>"+
            "</ContactoEmergencia>\r\n" +
            "</soap:Body>\r\n" +
            "</soap:Envelope>";


            const respAlerta = https.post({
             url: `${URLPX}?op=ContactoEmergencia`,
             headers: headers3,
             body: rawInsertAlerta
            });

            let ResponAlerta = respAlerta.body.replace(regex2, '$1');
            log.debug('XML Alerta', rawInsertAlerta);
            log.debug('Response-Hunter-PXADMIN Alerta', rawInsertAlerta);
            log.debug('Response-PXLATAM Alerta', ResponAlerta);

        }
      
        return Respon;
        //return rowXml;

        //galvar se comento por pedido de Peru 14-03-2025
        // if (NACIONALIDAD == "PE") {
        //      return Respon;
        //  } else {
        //      return rowXml;

        //  }
        //fin
  

       

    }

    const getBodyByOperacionOrden = (context) => {
        let rowXml = "";
        rowXml = getBody(context);
        
       // log.debug('rowXml', rowXml)

        return rowXml;
    }

    const getBodyByOperacionAlerta = (context) => {
        let rowXml = "";
        let tipoContacto="1";
      //let numero="0999999999";
        rowXml ="<Contactos><Contacto><NumeroOrden>" + context.NumeroOrden + "</NumeroOrden><UsuarioIngreso>" + context.UsuarioIngreso + "</UsuarioIngreso>" +
                "<CodigoVehiculo>" + (context.CodigoVehiculo || "") + "</CodigoVehiculo>" +
                "<TipoContacto>" + tipoContacto +"</TipoContacto>" +
                "<IdentificadorContacto>" + (context.IdentificadorPropietario || "") + "</IdentificadorContacto>" +
                "<NombreContacto>" + (context.NombrePropietario || "") + "</NombreContacto>" +
                "<ApellidosContacto>" + (context.ApellidosPropietario || "") + "</ApellidosContacto>" +
                "<CelularContacto>" + (context.Emergencia || "") + "</CelularContacto>" +
                //"<CelularContacto>" + (numero || "") + "</CelularContacto>" +
                "<EmailContacto/></Contacto></Contactos>"         
        return rowXml;
    }
   
    const getBody = (context) => {
        let rowXml ="<Ordenes><Orden><NumeroOrden>" + context.NumeroOrden + "</NumeroOrden><UsuarioIngreso>" + context.UsuarioIngreso + "</UsuarioIngreso>" +
                    "<OperacionOrden>" + context.OperacionOrden + "</OperacionOrden>" 

        //cabecera
        if (['001','002','003','004','005','006','007','008','009','011','012','013','014','015','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
                    "<Ciudad>" + context.Ciudad + "</Ciudad>" +
                    "<Sucursal>" + context.Sucursal + "</Sucursal>" +
                    "<EstadoCartera>" + context.EstadoCartera + "</EstadoCartera>" +
                    "<FechaInicioCobertura>" + context.FechaInicioCobertura + "</FechaInicioCobertura>" +
                    "<FechaFinCobertura>" + context.FechaFinCobertura + "</FechaFinCobertura>" 
        }
        if (['010','016','017','018'].includes(String(context.OperacionOrden))) {
            rowXml +="<NombreEjecutiva>" + context.NombreEjecutiva + "</NombreEjecutiva>" +
                    "<Ciudad>" + context.Ciudad + "</Ciudad>" +
                    "<Sucursal>" + context.Sucursal + "</Sucursal>"  +  
                    "<EstadoCartera></EstadoCartera>" +
                    "<FechaInicioCobertura></FechaInicioCobertura>" +
                    "<FechaFinCobertura></FechaFinCobertura>"                 
        }

        //vehiculo
        if (['001','018'].includes(String(context.OperacionOrden))) {
            rowXml +="<Vehiculo>" +
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
                    "</Vehiculo>" 
        }
        if (['002','003','004','005','006','007','008','009','010','011','012','013','014','015','017','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Vehiculo>" +
                    "<Placa></Placa>" +
                    "<IdMarca></IdMarca>" +
                    "<DescMarca></DescMarca>" +
                    "<IdModelo></IdModelo>" +
                    "<DescModelo></DescModelo>" +
                    "<CodigoVehiculo>" + (context.CodigoVehiculo || "") + "</CodigoVehiculo>" +
                    "<Chasis></Chasis>" +
                    "<Motor></Motor>" +
                    "<Color></Color>" +
                    "<Anio></Anio>" +
                    "<Tipo></Tipo>" +
                    "</Vehiculo>" 
        }
       
        if (['016'].includes(String(context.OperacionOrden))) {
            rowXml +="<Vehiculo/>"
        }
        //dispositivo
        if (['001','003'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
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
                    context.Servicios +
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
                    "</Dispositivo>" 
        } 
        if (['002','004','011'].includes(String(context.OperacionOrden))) {
            rowXml +="<Dispositivo>" +
                    "<Vid>" + (context.Vid || "") + "</Vid>" +
                    "<IdProducto></IdProducto>" +
                    "<DescProducto></DescProducto>" +
                    "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                    "<MarcaDispositivo></MarcaDispositivo>" +
                    "<CodModeloDispositivo></CodModeloDispositivo>" +
                    "<ModeloDispositivo></ModeloDispositivo>" +
                    "<Sn></Sn>" +
                    "<Imei></Imei>" +
                    "<NumeroCamaras>0</NumeroCamaras>" +
                    "<DireccionMac></DireccionMac>" +
                    "<Icc></Icc>" +
                    "<NumeroCelular></NumeroCelular>" +
                    "<Operadora></Operadora>" +
                    "<EstadoSim></EstadoSim>" +
                    context.Servicios +
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior></VidAnterior>" +
                    "</Dispositivo>" 
        }        
        if (['005','006','007','008','009'].includes(String(context.OperacionOrden))) {
            rowXml += "<Dispositivo>" +
                    "<Vid>" + (context.Vid || "") + "</Vid>" +
                    "<IdProducto></IdProducto>" +
                    "<DescProducto></DescProducto>" +
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
                    context.Servicios +
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior>" + (context.VidAnterior || "") + "</VidAnterior>" +
                    "</Dispositivo>" 
        }
        if (['017'].includes(String(context.OperacionOrden))) {
            rowXml +="<Dispositivo>" +
                    "<Vid>" + (context.Vid || "") + "</Vid>" +
                    "<IdProducto>" + (context.IdProducto || "") + "</IdProducto>" +
                    "<DescProducto></DescProducto>" +
                    "<CodMarcaDispositivo>" + (context.CodMarcaDispositivo || "") + "</CodMarcaDispositivo>" +
                    "<MarcaDispositivo></MarcaDispositivo>" +
                    "<CodModeloDispositivo>" + (context.CodModeloDispositivo || "") + "</CodModeloDispositivo>" +
                    "<ModeloDispositivo></ModeloDispositivo>" +
                    "<Sn></Sn>" +
                    "<Imei></Imei>" +
                    "<NumeroCamaras>0</NumeroCamaras>" +
                    "<DireccionMac></DireccionMac>" +
                    "<Icc></Icc>" +
                    "<NumeroCelular></NumeroCelular>" +
                    "<Operadora></Operadora>" +
                    "<EstadoSim>" + (context.EstadoSim || "") + "</EstadoSim>" +    
                    context.Servicios +     
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior></VidAnterior>" +
                    "</Dispositivo>" 

        }   
        if (['012','013','014','015','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Dispositivo>" +
                    "<Vid>" + (context.Vid || "") + "</Vid>" +
                    "<IdProducto></IdProducto>" +
                    "<DescProducto></DescProducto>" +
                    "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                    "<MarcaDispositivo></MarcaDispositivo>" +
                    "<CodModeloDispositivo></CodModeloDispositivo>" +
                    "<ModeloDispositivo></ModeloDispositivo>" +
                    "<Sn></Sn>" +
                    "<Imei></Imei>" +
                    "<NumeroCamaras>0</NumeroCamaras>" +
                    "<DireccionMac></DireccionMac>" +
                    "<Icc></Icc>" +
                    "<NumeroCelular></NumeroCelular>" +
                    "<Operadora></Operadora>" +
                    "<EstadoSim></EstadoSim>" +       
                    context.Servicios +
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior></VidAnterior>" +
                    "</Dispositivo>" 
        }   
        if (['016'].includes(String(context.OperacionOrden))) {
            rowXml +="<Dispositivo>" +
                    "<Vid></Vid>" +
                    "<IdProducto></IdProducto>" +
                    "<DescProducto></DescProducto>" +
                    "<CodMarcaDispositivo></CodMarcaDispositivo>" +
                    "<MarcaDispositivo></MarcaDispositivo>" +
                    "<CodModeloDispositivo></CodModeloDispositivo>" +
                    "<ModeloDispositivo></ModeloDispositivo>" +
                    "<Sn></Sn>" +
                    "<Imei></Imei>" +
                    "<NumeroCamaras>0</NumeroCamaras>" +
                    "<DireccionMac></DireccionMac>" +
                    "<Icc></Icc>" +
                    "<NumeroCelular></NumeroCelular>" +
                    "<Operadora></Operadora>" +
                    "<EstadoSim></EstadoSim>" +       
                    context.Servicios +     
                    "<OperacionDispositivo>" + (context.OperacionDispositivo || "") + "</OperacionDispositivo>" +
                    "<VidAnterior></VidAnterior>" +
                    "</Dispositivo>" 
        }   
        if (['010','018'].includes(String(context.OperacionOrden))) {
            rowXml +="<Dispositivo/>" 
        }     

        //propietario
        if (['001','007','010','016'].includes(String(context.OperacionOrden))) {
            rowXml +="<Propietario>" +
                    "<IdentificadorPropietario>" + (context.IdentificadorPropietario || "") + "</IdentificadorPropietario>" +
                    "<NombrePropietario>" + (context.NombrePropietario || "") + "</NombrePropietario>" +
                    "<ApellidosPropietario>" + (context.ApellidosPropietario || "") + "</ApellidosPropietario>" +
                    "<DireccionPropietario>" + (context.DireccionPropietario || "") + "</DireccionPropietario>" +
                    "<ConvencionalPropietario>" + (context.ConvencionalPropietario || "") + "</ConvencionalPropietario>" +
                    "<CelularPropietario>" + (context.CelularPropietario || "") + "</CelularPropietario>" +
                    "<EmailPropietario>" + (context.EmailPropietario || "") + "</EmailPropietario>" +
                    "</Propietario>" 
        }
        if (['002','003','004','005','006','008','009','011','012','013','014','015','017','018','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Propietario/>" 
        }

        //monitoreo
        if (['001','010'].includes(String(context.OperacionOrden))) {
            rowXml +="<Monitor>" +
                    "<IdentificadorMonitorea>" + (context.IdentificadorMonitorea || "") + "</IdentificadorMonitorea>" +
                    "<NombreMonitorea>" + (context.NombreMonitorea || "") + "</NombreMonitorea>" +
                    "<ApellidosMonitorea>" + (context.ApellidosMonitorea || "") + "</ApellidosMonitorea>" +
                    "<DireccionMonitorea>" + (context.DireccionMonitorea || "") + "</DireccionMonitorea>" +
                    "<ConvencionalMonitorea>" + (context.ConvencionalMonitorea || "") + "</ConvencionalMonitorea>" +
                    "<CelularMonitorea>" + (context.CelularMonitorea || "") + "</CelularMonitorea>" +
                    "<EmailMonitorea>" + (context.EmailMonitorea || "") + "</EmailMonitorea>" +
                    "</Monitor>" 
        }
        if (['002','003','004','005','006','007','008','009','011','012','013','014','015','016','017','018','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Monitor/>" 
        }

        //concesionario
        if (['001','018'].includes(String(context.OperacionOrden))) {
            rowXml +="<Concesionario>" +
                    "<IdentificadorConcesionario>" + (context.IdentificadorConcesionario || "") + "</IdentificadorConcesionario>" +
                    "<RazonSocialConcesionario>" + (context.RazonSocialConcesionario || "") + "</RazonSocialConcesionario>" +
                    "<DireccionConcesionario>" + (context.DireccionConcesionario || "") + "</DireccionConcesionario>" +
                    "<ConvencionalConcesionario>" + (context.ConvencionalConcesionario || "") + "</ConvencionalConcesionario>" +
                    "<CelularConcesionario>" + (context.CelularConcesionario || "") + "</CelularConcesionario>" +
                    "<EmailConcesionario>" + (context.EmailConcesionario || "") + "</EmailConcesionario>" +
                    "</Concesionario>" 
        }
        if (['002','003','004','005','006','007','008','009','010','011','012','013','014','015','016','017','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Concesionario/>" 
        }

        //financiera
        if (context.OperacionOrden == "001") {
            rowXml +="<Financiera>" +
                    "<IdentificadorFinanciera>" + (context.IdentificadorFinanciera || "") + "</IdentificadorFinanciera>" +
                    "<RazonSocialFinanciera>" + (context.RazonSocialFinanciera || "") + "</RazonSocialFinanciera>" +
                    "<DireccionFinanciera>" + (context.DireccionFinanciera || "") + "</DireccionFinanciera>" +
                    "<ConvencionalFinanciera>" + (context.ConvencionalFinanciera || "") + "</ConvencionalFinanciera>" +
                    "<CelularFinanciera>" + (context.CelularFinanciera || "") + "</CelularFinanciera>" +
                    "<EmailFinanciera>" + (context.EmailFinanciera || "") + "</EmailFinanciera>" +
                    "</Financiera>" 
        }
        if (['002','003','004','005','006','007','008','009','010','011','012','013','014','015','016','017','018','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Financiera/>" 
        }

        //aseguradora
        if (context.OperacionOrden == "001") {
            rowXml +="<Aseguradora>" +
                    "<IdentificadorAseguradora>" + (context.IdentificadorAseguradora || "") + "</IdentificadorAseguradora>" +
                    "<RazonSocialAseguradora>" + (context.RazonSocialAseguradora || "") + "</RazonSocialAseguradora>" +
                    "<DireccionAseguradora>" + (context.DireccionAseguradora || "") + "</DireccionAseguradora>" +
                    "<ConvencionalAseguradora>" + (context.ConvencionalAseguradora || "") + "</ConvencionalAseguradora>" +
                    "<CelularAseguradora>" + (context.CelularAseguradora || "") + "</CelularAseguradora>" +
                    "<EmailAseguradora>" + (context.EmailAseguradora || "") + "</EmailAseguradora>" +
                    "</Aseguradora>"
        }
        if (['002','003','004','005','006','007','008','009','010','011','012','013','014','015','016','017','018','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Aseguradora/>" 
        }

        //convenio
        if (context.OperacionOrden == "001") {
            rowXml +="<Convenio>" +
                    "<IdentificadorConvenio>" + (context.IdentificadorConvenio || "") + "</IdentificadorConvenio>" +
                    "<RazonSocialConvenio>" + (context.RazonSocialConvenio || "") + "</RazonSocialConvenio>" +
                    "<DireccionConvenio>" + (context.DireccionConvenio || "") + "</DireccionConvenio>" +
                    "<ConvencionalConvenio>" + (context.ConvencionalConvenio || "") + "</ConvencionalConvenio>" +
                    "<CelularConvenio>" + (context.CelularConvenio || "") + "</CelularConvenio>" +
                    "<EmailConvenio>" + (context.EmailConvenio || "") + "</EmailConvenio>"+
                    "</Convenio>"
        }
        if (['002','003','004','005','006','007','008','009','010','011','012','013','014','015','016','017','018','019'].includes(String(context.OperacionOrden))) {
            rowXml +="<Convenio/>" 
        }
        //cierre
        rowXml += "</Orden></Ordenes>";
        return rowXml;
    }


    return {
        post: _post
    }
});