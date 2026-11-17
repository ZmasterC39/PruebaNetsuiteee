/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 
    'N/record', 
    'N/search', 
    'N/runtime'], 
    function(log, record, search, runtime) {
    // TODO: Acciones
    const CREAR = 'crear';
    const ACTUALIZAR = 'actualizar';
   

    function _get(context) {
        try {
            log.debug('Request....Get........', context);        
            // let busqueda = "3";
            //let objRecord = record.load({ type: 'customrecord_ht_record_bienes', id: busqueda.busqueda });                  
            //let ht_bien_codigo = objRecord.getValue({ fieldId: 'custrecord_ht_bien_codigo' });
            //let ht_bien_propietario = objRecord.getValue({ fieldId: 'custrecord_ht_bien_propietario' });
            //let ht_bien_estadocontrato = objRecord.getValue({ fieldId: 'custrecord_ht_bien_estadocontrato' });
            //log.debug("runtime.getCurrentUser()", runtime.getCurrentUser());
            let subsidiaria = runtime.getCurrentUser().subsidiary;
            log.debug("...........subsidiary................", subsidiaria);
            
            var busquedabienesSearch = search.create({
                type: "customrecord_ht_record_bienes",
                filters:
                [  
                   //["isinactive","anyof","F"],
                   ["isinactive","is","F"],
                    "AND",
                   ["custrecord_bn_subsidiaria","anyof",subsidiaria] 
                ],
                columns:
                [
                   search.createColumn({name: "name",   label: "name"}),
                   search.createColumn({name: "internalid", sort: search.Sort.ASC, label: "internalid"}),
                   search.createColumn({name: "altname", label: "Nombre"}),
                   search.createColumn({name: "custrecord_ht_bien_codsysh", label: "CodigoSys"}),
                   search.createColumn({name: "custrecord_ht_bien_placa", label: "HT BN Placa"}),
                   search.createColumn({name: "custrecord_ht_bien_chasis", label: "HT BN Chasis"}),
                   search.createColumn({name: "custrecord_ht_bien_motor", label: "HT BN Motor"}),
                   search.createColumn({name: "custrecord_ht_bn_tipori", label: "Tipo Origen"}),
                   search.createColumn({ name: "custrecord_ht_bn_tipo_origen_desc", join: "custrecord_ht_bn_tipori", label: "Descripcion Origen" }),
                  // search.createColumn({name: "name", join: "CUSTOMLIST_HT_BN_TIPODEORIGENBIEN", label: "Descripcion"}),
                   search.createColumn({name: "custrecord_ht_bn_estadobien", label: "Estado Bien"}),
                   search.createColumn({name: "custrecord_ht_bien_conveniovehiculo", label: "Convenio"}),
                   //search.createColumn({name: "custrecord_ht_cn_nombreconvenio", join: "CUSTOMRECORD_HT_RECORD_CONVENIO", label: "Descripcion"}),
                   search.createColumn({ name: "custrecord_ht_cn_nombreconvenio", join: "custrecord_ht_bien_conveniovehiculo", label: "Descripcion Convenio" }),
                   search.createColumn({name: "custrecord_ht_bien_estadoconvenio", label: "Estado Convenio"}),
                   //search.createColumn({ name: "name", join: "custrecord_ht_bien_estadoconvenio", label: "Descripcion Estado" }),
                   search.createColumn({name: "created", label: "Fecha Creacion"})
                ]
            });
            if (typeof context.chasis != 'undefined') {
                if (context.chasis.length != 0) {
                    if (context.chasis != 0 && context.chasis != '') {
                        busquedabienesSearch.filters.push(search.createFilter({
                            name: 'custrecord_ht_bien_chasis', 
                            operator: search.Operator.IS, 
                            values: context.chasis
                            })); 
                    }
                }
            }
            if (typeof context.motor != 'undefined') {
                if (context.motor.length != 0) {
                    if (context.motor != 0 && context.motor != '') {
                        busquedabienesSearch.filters.push(search.createFilter({
                            name: 'custrecord_ht_bien_motor', 
                            operator: search.Operator.IS,
                            values: context.motor
                            })); 
                    }
                }
            }
            if (typeof context.codigo != 'undefined') {
                if (context.codigo.length != 0) {
                    if (context.codigo != 0 && context.codigo != '') {
                        busquedabienesSearch.filters.push(search.createFilter({
                            name: 'internalid', 
                            operator: search.Operator.IS, //IS STARTSWITH CONTAINS ANYOF
                            values: context.codigo
                            })); 
                    }
                }
            }
            //var searchResultCount = busquedabienesSearch.runPaged().count;
            //log.debug("busquedabienesSearch result count",searchResultCount);
            let respuestaConsulta = [];
            busquedabienesSearch.run().each(function(result){
                respuestaConsulta.push({
                    internalId: result.getValue({ name: "internalid" }),
                    codigo: result.getValue({ name: "name" }),
                    altname: result.getValue({ name: "altname" }),
                    placa: result.getValue({ name: "custrecord_ht_bien_placa" }),
                    chasis: result.getValue({ name: "custrecord_ht_bien_chasis" }),
                    motor: result.getValue({ name: "custrecord_ht_bien_motor" }),
                    codigoSys: result.getValue({ name: "custrecord_ht_bien_codsysh" }),
                    //tipoOrigen: result.getValue({ name: "custrecord_ht_bn_tipori" }),
                    tipoOrigen: result.getValue({ name: "custrecord_ht_bn_tipo_origen_desc", join: "custrecord_ht_bn_tipori" }),
                    EstadoBien: result.getText({ name: "custrecord_ht_bn_estadobien" }),
                   // ConvenioVehiculo: result.getValue({ name: "custrecord_ht_bien_conveniovehiculo" }),
                    ConvenioVehiculo: result.getValue({ name: "custrecord_ht_cn_nombreconvenio", join: "custrecord_ht_bien_conveniovehiculo" }),
                    EstadoConvenio: result.getText({ name: "custrecord_ht_bien_estadoconvenio" }),
                    //EstadoConvenio: result.getValue({ name: "name", join: "custrecord_ht_bien_estadoconvenio" }),
                    FechaCreacion: result.getValue({ name: "created" }),
                });
            });
            //return respuestaConsulta
            return JSON.stringify({ results: respuestaConsulta });
            // return {
            //     objRecord: objRecord
            // }
        } catch (error) {
            log.error('Error-GET', error)
        }

    }

    function _post(context) {
        let accion = "";
        try {
            //REQUEST
            log.debug('Request.....Post........', context);
            let vatregnumber = context.customer;
            let customerform = context.customerform;
           // let usuario = context.usuario;


            //let subsidiaria = 2;
            log.debug("runtime.getCurrentUser()", runtime.getCurrentUser());
            let subsidiaria = runtime.getCurrentUser().subsidiary;
            //log.error("...........subsidiary................", subsidiaria);
            
            let respuesta = [];
            var busquedatipobien = ConsultaGeneral(context.tipobien,"CUSTOMRECORD_HT_BIEN_TIPOBIEN","TIBN", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_BIEN_TIPOBIEN.........', busquedatipobien);
            if (busquedatipobien==0){
                busquedatipobien = ConsultaGeneral("TERRESTRE","CUSTOMRECORD_HT_BIEN_TIPOBIEN","TIBN", subsidiaria  );
            }
            //log.debug('CUSTOMRECORD_HT_BIEN_TIPOBIEN....1.....', busquedatipobien);
            if ( esNumeroString(context.tipoterrestre) ){
               // var busquedatipo=ConsultaTipoVehiculo(busquedamarca,busquedamodelo, context.tipo,"", "CUSTOMRECORD_HT_RECORD_TIPOVEHICULO");
                var busquedatipoterrestre= ConsultaTipoTerrestre(busquedatipobien,context.tipoterrestre,"","CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE", subsidiaria);
            }else{
                //var busquedatipo=ConsultaTipoVehiculo(busquedamarca, "",context.tipo,"CUSTOMRECORD_HT_RECORD_TIPOVEHICULO");
                var busquedatipoterrestre= ConsultaTipoTerrestre(busquedatipobien,"",context.tipoterrestre,"CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE", subsidiaria);
            }
            //log.debug('CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE.........', busquedatipoterrestre);
            // var busquedatipoterrestre= ConsultaGeneral(context.tipoterrestre,"CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE","STBN" );
            // if (busquedatipoterrestre==0){
            //     busquedatipoterrestre = ConsultaGeneral("VEHICULO","CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE","STBN" );
            //     log.debug('CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE.........', busquedatipoterrestre);
            //     // if (busquedatipoterrestre==0){
            //     //     if(context.tipoterrestre=="VEHICULO"){
            //     //         busquedatipoterrestre=1
            //     //     }
            //     //     if(context.tipoterrestre=="MOTO"){
            //     //         busquedatipoterrestre=2
            //     //     }   
            //     //     log.debug('CUSTOMRECORD_HT_BIEN_TIPOTERRESTRE....1.....', busquedatipoterrestre);
            //     // }   
            // }
            var busquedaestadobien= ConsultaGeneral(context.estadobien,"CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN" ,"ESBN", subsidiaria );
            //
            if (busquedaestadobien==0){
                busquedaestadobien = ConsultaGeneral("VIGENTE","CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN","ESBN", subsidiaria );
              //  log.debug('CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN....1.....', busquedaestadobien);
            }
            //log.debug('CUSTOMLIST_HT__LISTA_BN_ESTADOBIEN.........', busquedaestadobien);
            let busquedaorigen= ConsultaGeneral(context.origen,"CUSTOMLIST_HT_BN_TIPODEORIGENBIEN","TOBN", subsidiaria );
            //log.debug('CUSTOMLIST_HT_BN_TIPODEORIGENBIEN.........', busquedaorigen);        
            let busquedaorigenvehiculo= ConsultaGeneral(context.origenvehiculo,"CUSTOMRECORD_HT_BN_TIPO_ORIGEN","TORG" , subsidiaria);
            //log.debug('CUSTOMRECORD_HT_BN_TIPO_ORIGEN.........', busquedaorigenvehiculo);
            //log.debug('1................................', context.marca);

            let busquedamarca= ConsultaGeneral(context.marca,"CUSTOMRECORD_HT_BIEN_MARCA","MARC", subsidiaria );
            let busquedaCodmarca= ConsultaCodMarca(context.marca,"CUSTOMRECORD_HT_BIEN_MARCA", subsidiaria );
            log.debug('CUSTOMRECORD_HT_BIEN_MARCA.........', busquedamarca);
            log.debug('busquedaCodmarca.........', busquedaCodmarca);
            accion = context?.accion?.toLowerCase() || null;
            // switch (accion) {
            //     case CREAR:
            //         break;
            //         // TODO: Default
            //         //log.debug('2.....................', busquedamarca);
            //             if ( esNumeroString(context.modelo) ){
            //                 var busquedamodelo=ConsultaModelo(busquedamarca,context.modelo, "", "CUSTOMRECORD_HT_BN_MODELO");
            //             }else{
            //                 var busquedamodelo=ConsultaModelo(busquedamarca, "",context.modelo,"CUSTOMRECORD_HT_BN_MODELO");
            //             }
            //         //log.debug('CUSTOMRECORD_HT_BN_MODELO.........', busquedamodelo);
            //             if ( esNumeroString(context.tipo) ){
            //                 var busquedatipo=ConsultaTipoVehiculo(busquedamarca,busquedamodelo, context.tipo,"", "CUSTOMRECORD_HT_RECORD_TIPOVEHICULO");
            //             }else{
            //                 var busquedatipo=ConsultaTipoVehiculo(busquedamarca, busquedamodelo,"",context.tipo,"CUSTOMRECORD_HT_RECORD_TIPOVEHICULO");
            //             }
            //         default:
            //             respuesta = { id: 0, mensaje: "Verifique la accion" };
            //         break;
            //    }
            // POR EL MOMENTO SE COMENTO ESTO
            //var busquedamodelo
            var busquedamodelo;
            var busquedatipo;

            if ( esNumeroString(context.modelo) ){
                busquedamodelo=ConsultaModelo(busquedamarca,context.modelo, "", "CUSTOMRECORD_HT_BN_MODELO", subsidiaria, busquedaCodmarca);
            }else{
                //log.error('CUSTOMRECORD_HT_BN_MODELO.........', context.modelo);
                busquedamodelo=ConsultaModelo(busquedamarca, "",context.modelo,"CUSTOMRECORD_HT_BN_MODELO", subsidiaria, busquedaCodmarca);
            }
            log.debug('CUSTOMRECORD_HT_BN_MODELO.........', busquedamodelo);
            if ( esNumeroString(context.tipo) ){
                busquedatipo=ConsultaTipoVehiculo(busquedamarca,busquedamodelo, context.tipo,"", "CUSTOMRECORD_HT_RECORD_TIPOVEHICULO", subsidiaria);
            }else{
                busquedatipo=ConsultaTipoVehiculo(busquedamarca, busquedamodelo,"",context.tipo,"CUSTOMRECORD_HT_RECORD_TIPOVEHICULO", subsidiaria);
            }
            log.debug('CUSTOMRECORD_HT_RECORD_TIPOVEHICULO.........', busquedatipo);

            
            //FIN     
            //log.error('1................................', context.transmision);
            let busquedatransmision= ConsultaGeneral(context.transmision,"CUSTOMRECORD_HT_BN_TRANSMISION" ,"TRAN", subsidiaria);
            //log.error('2................................', busquedatransmision);
           // log.debug('CUSTOMRECORD_HT_BN_TRANSMISION.........', busquedatransmision);
            let busquedacolorcarseg= ConsultaGeneral(context.colorcarseg,"CUSTOMRECORD_HT_BN_COLORCARSEG" ,"COLC", subsidiaria);
            //log.debug('CUSTOMRECORD_HT_BN_COLORCARSEG.........', busquedacolorcarseg);         
            //let busquedacolorcarseg=  ConsultaColor(context.colorcarseg, "CUSTOMRECORD_HT_BN_COLORCARSEG" , "COLC")
            //log.debug('CUSTOMRECORD_HT_BN_COLORCARSEG....1.....', busquedacolorcarseg);
            let busquedacolorfabricante= ConsultaGeneral(context.colorfabricante,"CUSTOMRECORD_HT_BN_COLORFABRICANTE" ,"COLF", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_BN_COLORFABRICANTE.........', busquedacolorfabricante);
            let busquedacolormatricula= ConsultaGeneral(context.colormatricula,"CUSTOMRECORD_HT_BN_COLORMATRICULA","COLM", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_BN_COLORMATRICULA.........', busquedacolormatricula);
            let busquedaversion= ConsultaGeneral(context.version,"CUSTOMRECORD_HT_RECORD_VERSION" ,"VERS" , subsidiaria);
            //log.debug('CUSTOMRECORD_HT_RECORD_VERSION.........', busquedaversion);           
            let busquedatipocabina= ConsultaGeneral(context.tipocabina,"CUSTOMRECORD_HT_BN_TIPOCABINA" ,"TCAB", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_BN_TIPOCABINA.........', busquedatipocabina);         
            let busquedacilindraje= ConsultaGeneral(context.cilindraje,"CUSTOMRECORD_HT_RECORD_CILINDRAJE","CILI", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_RECORD_CILINDRAJE.........', busquedacilindraje);           
            let busquedatraccion= ConsultaGeneral(context.traccion,"CUSTOMRECORD_HT_BN_TRACCION","TRAC", subsidiaria );
            //log.debug('CUSTOMRECORD_HT_BN_TRACCION.........', busquedatraccion);                       
            let busquedacombustible= ConsultaGeneral(context.combustible,"CUSTOMRECORD_HT_BN_TIPOCOMBUSTIBLE","TCOM", subsidiaria  );
            //log.debug('CUSTOMRECORD_HT_BN_TIPOCOMBUSTIBLE.........', busquedacombustible);
            let busquedaaireacondicionado= ConsultaGeneral(context.aireacondicionado,"CUSTOMRECORD_HT_BIEN_AIREACONDICIONADO","AIRE", subsidiaria );
            if (busquedaaireacondicionado==0){
                busquedaaireacondicionado= ConsultaGeneral("SI","CUSTOMRECORD_HT_BIEN_AIREACONDICIONADO","AIRE", subsidiaria );
            }
            //log.debug('CUSTOMRECORD_HT_BIEN_AIREACONDICIONADO.........', busquedaaireacondicionado);
            let busquedatipoflota= ConsultaGeneral(context.tipoflota,"CUSTOMRECORD_HT_RECORD_TIPOFLOTA","TFLO", subsidiaria  );
            if (busquedatipoflota==0){
                busquedatipoflota= ConsultaGeneral("OTROS","CUSTOMRECORD_HT_RECORD_TIPOFLOTA","TFLO", subsidiaria  );
            }
            //log.debug('CUSTOMRECORD_HT_RECORD_TIPOFLOTA.........', busquedatipoflota);
            let busquedarecorrido= ConsultaGeneral(context.recorrido,"CUSTOMRECORD_HT_RECORD_RECORRIDO","RECO", subsidiaria  );
            if (busquedarecorrido==0){
                busquedarecorrido= ConsultaGeneral("PERSONALES","CUSTOMRECORD_HT_RECORD_RECORRIDO","RECO", subsidiaria  );
            }
            //log.debug('CUSTOMRECORD_HT_RECORD_RECORRIDO.........', busquedarecorrido);           
            let busquedausovehiculo= ConsultaGeneral(context.usovehiculo,"CUSTOMRECORD_HT_BIEN_USOVEHICULO","UVEH", subsidiaria );
            if (busquedausovehiculo==0){
                busquedausovehiculo= ConsultaGeneral("PERSONAL","CUSTOMRECORD_HT_BIEN_USOVEHICULO","UVEH", subsidiaria );
            }
            //log.debug('CUSTOMRECORD_HT_BIEN_USOVEHICULO.........', busquedausovehiculo);
            // if ( esNumeroString(context.concesionario) ){
            //     var busquedaconcesionario= ConsultaCanal("", context.concesionario, 2,"")
            // }else{
            //     var busquedaconcesionario= ConsultaCanal("", "", 2,context.concesionario)
            // }
            var busquedaconcesionario= ConsultaCanal(2,context.concesionario,"customrecord_ht_record_canaldistribucion", subsidiaria)
            //log.debug('CONCESIONARIO.........', busquedaconcesionario);         
            // if ( esNumeroString(context.aseguradora) ){
            //     var busquedaaseguradora= ConsultaCanal("", context.aseguradora, 1,"")
            // }else{
            //     var busquedaaseguradora= ConsultaCanal("", "", 1,context.aseguradora)
            // }
            var busquedaaseguradora= ConsultaCanal( 1,context.aseguradora,"customrecord_ht_record_canaldistribucion", subsidiaria)
            //log.debug('ASEGURADORA.........', busquedaaseguradora);
            // if ( esNumeroString(context.financiera) ){
            //     var busquedafinanciera= ConsultaCanal("", context.financiera, 3,"")
            // }else{
            //     var busquedafinanciera= ConsultaCanal("", "", 3,context.financiera)
            // }
            var busquedafinanciera= ConsultaCanal(3,context.financiera,"customrecord_ht_record_canaldistribucion", subsidiaria)
            //log.debug('FINANCIERA.........', busquedafinanciera);           
            let busquedaoficina= ConsultaGeneral(context.oficina,"Location" ,"LOCT", subsidiaria);
            if (busquedaoficina==0){
                busquedaoficina= ConsultaGeneral("GUAYAQUIL","Location" ,"LOCT", subsidiaria);
            }
            var origennoconvenio="";
            //log.debug('Location.........', busquedaoficina);
            if (context.origenvehiculo?.includes(";")  || false)
            {
                let array = context.origenvehiculo.split(";")
                origennoconvenio = array[0].toUpperCase();
                if (origennoconvenio!="CV"){
                    var busquedaconvenio= ConsultaGeneral(context.convenio,"CUSTOMRECORD_HT_RECORD_CONVENIO" ,"CONV" , subsidiaria);
                    //log.debug('CUSTOMRECORD_HT_RECORD_CONVENIO.........', busquedaconvenio);
        
                    var busquedaestadoconvenio= ConsultaGeneral(context.estadoconvenio,"CUSTOMLIST_HT_LISTA_ESTADOCONVENIO","ECNV", subsidiaria );
                    if (busquedaestadoconvenio==0){
                        busquedaestadoconvenio= ConsultaGeneral("ACTIVO","CUSTOMLIST_HT_LISTA_ESTADOCONVENIO","ECNV", subsidiaria );
                    }
                 } 
            }   
            //log.debug('CUSTOMLIST_HT_LISTA_ESTADOCONVENIO.........', busquedaestadoconvenio);
            //  myResultSet[i].getValue(busquedaCustomer.columns[1]
            // let ht_bien_tipobien = context.tipobien //1
            // let ht_bien_tipoterrestre = context.tipoterrestre //1
            // let ht_bn_estadobien = context.estadobien //11
            // let ht_bien_marca = context.marca //2
            // let ht_bien_tipo = context.tipo //3
            // let ht_bien_transmision = context.transmision //1
            // let ht_bien_aireacondicionado = context.aireacondicionado //1
            // let ht_bien_usovehiculo = context.usovehiculo //1
            //     // consulta de internalId
            var busquedaCustomer = search.create({
                type: search.Type.CUSTOMER,
                columns: ['entityid', 'altname', 'internalid'],
                filters: ['vatregnumber', search.Operator.IS, vatregnumber]
            });
            var myResultSet = busquedaCustomer.run().getRange({ start: 0, end: 10 });;
            //log.debug('Busqueda.........', myResultSet);
            var theCount = busquedaCustomer.runPaged().count;
           // log.debug('CANTIDAD.........', theCount);
            if (theCount != 1) {
                log.debug('Error consulta', myResultSet);
            } 
            else 
            {
                for (let i in myResultSet) {
                   // var altname = myResultSet[i].getValue(busquedaCustomer.columns[1]);
                    var customer = myResultSet[i].getValue(busquedaCustomer.columns[2]);
                }
                //log.debug('Usuario Ingreso.........', usuario);
                accion = context?.accion?.toLowerCase() || null;
                switch (accion) {
                    // TODO: CREAR
                    case CREAR:
                        
                        log.debug("Crear....", context);                 
                        let objRecord = record.create({ type: "customrecord_ht_record_bienes", isDynamic: true });
                        // let objRecord = record.create({ type: "customrecord_ht_record_bienes", isDynamic: true, ignoreMandatoryFields: true });

                        objRecord.setValue({ fieldId: 'customform', value: customerform });
                        objRecord.setValue({ fieldId: 'altname', value: context.altname });//REQUEST
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_propietario', value: customer }); //* //REQUEST
                        objRecord.setValue({ fieldId: 'custrecord_bn_subsidiaria', value: subsidiaria });
                        //objRecord.setValue({ fieldId: 'custrecord_ht_bien_codigo', value: context.codigosys });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tipobien', value: busquedatipobien });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bn_tipoorigen', value: busquedaorigen });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tipoterrestre', value: busquedatipoterrestre });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bn_estadobien', value: busquedaestadobien });
                       
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_placa', value: context.placa });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_chasis', value: context.chasis });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_motor', value: context.motor });                                             
                  
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_caractadicional', value: context.caractadicional });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_numeropuertas', value: context.numeropuertas });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_transmision', value: busquedatransmision });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_colorcarseg', value: busquedacolorcarseg });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_colorfabricante', value: busquedacolorfabricante });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_colormatricula', value: busquedacolormatricula});
                        objRecord.setValue({ fieldId: 'custrecord_bien_version', value: busquedaversion });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tipocabina', value: busquedatipocabina });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_cilindraje', value: busquedacilindraje });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_traccion', value: busquedatraccion });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_combustible', value: busquedacombustible });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_aireacondicionado', value: busquedaaireacondicionado });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_numeropuertas', value: context.numeropuertas });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_kilometraje', value: context.kilometraje });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_ano', value: context.anio });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_avaluo', value: context.avaluo });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tonelaje', value: context.tonelaje });
                        //     objRecord.setValue({ fieldId: 'custrecord_ht_bien_plazo', value: context.plazo });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_codsysh', value: context.codigosys });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_generico', value: false});      
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tipoflota', value: busquedatipoflota });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_clave', value: context.clave });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_recorrido', value: busquedarecorrido });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_usovehiculo', value: busquedausovehiculo });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_oficina', value: busquedaoficina });
                       
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_consesionarios', value: busquedaconcesionario });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_companiaseguros', value: busquedaaseguradora });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_financiadovehiculo', value: busquedafinanciera })  
                        if (origennoconvenio!="CV"){
                            objRecord.setValue({ fieldId: 'custrecord_ht_bien_conveniovehiculo', value: busquedaconvenio });
                            objRecord.setValue({ fieldId: 'custrecord_ht_bien_estadoconvenio', value: busquedaestadoconvenio })
                        }
                        //log.debug('Cbusquedaorigenvehiculo.....3....',  busquedaorigenvehiculo);
                        //log.debug('Cbusquedaorigenvehiculo.....3....',  busquedamarca);
                        //log.debug('Cbusquedaorigenvehiculo.....3....',  busquedamodelo);
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_marca', value: busquedamarca });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_modelo', value: busquedamodelo });
                        objRecord.setValue({ fieldId: 'custrecord_ht_bn_tipori', value: busquedaorigenvehiculo });  
                        objRecord.setValue({ fieldId: 'custrecord_ht_bien_tipo', value: busquedatipo });
                        log.debug ("Grabando...........", objRecord);
                        let BienId = objRecord.save({ ignoreMandatoryFields: false });
                        // let BienId = objRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                        //log.debug('Bien.....', BienId);
                        respuesta = { id: BienId, mensaje: "Grabado.........."};
                        break;
                    // TODO: Actualizar
                    case ACTUALIZAR:
                        log.debug("Actualizar.....", context);
                       // let openRecord = record.load({ type: HT_ORDEN_TRABAJO_RECORD, id: scriptContext.idordentrabajo, isDynamic: true });
                        let openRecord = record.load({ type: 'customrecord_ht_record_bienes', id: context.id , isDynamic: true });
                        openRecord.setValue({ fieldId: 'customform', value: customerform });
                        //--openRecord.setValue({ fieldId: 'altname', value: context.altname });//REQUEST
                       // openRecord.setValue({ fieldId: 'custrecord_ht_bien_propietario', value: customer }); //* //REQUEST
                       //-- openRecord.setValue({ fieldId: 'custrecord_ht_bien_codigo', value: context.codigosys });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipobien', value: busquedatipobien });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bn_tipoorigen', value: busquedaorigen });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipoterrestre', value: busquedatipoterrestre });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bn_estadobien', value: busquedaestadobien });
                        
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_placa', value: context.placa });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_chasis', value: context.chasis });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_motor', value: context.motor });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_marca', value: busquedamarca });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_modelo', value: busquedamodelo });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipo', value: busquedatipo });

                        log.debug('Cbusquedaorigenvehiculo.....3....',  busquedaorigenvehiculo);

                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_caractadicional', value: context.caractadicional });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_numeropuertas', value: context.numeropuertas });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_transmision', value: busquedatransmision });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_colorcarseg', value: busquedacolorcarseg });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_colorfabricante', value: busquedacolorfabricante });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_colormatricula', value: busquedacolormatricula});
                        openRecord.setValue({ fieldId: 'custrecord_bien_version', value: busquedaversion });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipocabina', value: busquedatipocabina });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_cilindraje', value: busquedacilindraje });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_traccion', value: busquedatraccion });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_combustible', value: busquedacombustible });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_aireacondicionado', value: busquedaaireacondicionado });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_numeropuertas', value: context.numeropuertas });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_kilometraje', value: context.kilometraje });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_ano', value: context.anio });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_avaluo', value: context.avaluo });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_tonelaje', value: context.tonelaje });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipoflota', value: busquedatipoflota });
                        //openRecord.setValue({ fieldId: 'custrecord_ht_bien_clave', value: context.clave });
                        //openRecord.setValue({ fieldId: 'custrecord_ht_bien_codsysh', value: context.codigosys });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_recorrido', value: busquedarecorrido });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_usovehiculo', value: busquedausovehiculo });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_oficina', value: busquedaoficina });
                        //openRecord.setValue({ fieldId: 'custrecord_bn_subsidiaria', value: subsidiaria });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_consesionarios', value: busquedaconcesionario });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_companiaseguros', value: busquedaaseguradora });
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_financiadovehiculo', value: busquedafinanciera })  
                        openRecord.setValue({ fieldId: 'custrecord_ht_bien_conveniovehiculo', value: busquedaconvenio });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_estadoconvenio', value: busquedaestadoconvenio })      
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_modelo', value: busquedamodelo });
                        //--openRecord.setValue({ fieldId: 'custrecord_ht_bien_tipo', value: busquedatipo });
 
                       openRecord.setValue({ fieldId: 'custrecord_ht_bn_tipori', value: busquedaorigenvehiculo });

                        let idVehiculo = openRecord.save();       
                        //log.debug("Actualizar fin", idOT);
                        respuesta = { id: idVehiculo, mensaje: "Modificado.........."};
                        break;

                   
                    // TODO: Default
                    default:
                        respuesta = { id: 0, mensaje: "Verifique la accion" };
                    break;
               }
            }
            return JSON.stringify({ results: respuesta });
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


    function esNumeroString(valor) {
        return !isNaN(valor) && !isNaN(parseFloat(valor));
    }

    
    function ConsultaCanal( TipoCanal, Criterio, tabla, subsidiaria){
        try{
            let Resultado = [];
            let Canal = '';
            var detalle="";
            var identificacion="";
            Criterio = Criterio.toUpperCase();
            switch (TipoCanal) {
                case 1: Canal = "Aseguradora"; break;
                case 2: Canal = "Concesionario"; break;
                case 3: Canal = "Financiera"; break;
                default: break;
            }
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    ["custrecord_ht_cd_tipocanal","is",TipoCanal],
                    "AND",
                    ["isinactive","is","F"],
                    "AND",
                    ["custrecord_ht_cd_subsidiaria","anyof",subsidiaria]
                ],
                columns: ["internalid","custrecord_ht_cd_ruccanaldistribucion","custrecord_ht_cd_nombre","name"]
            });
            // if (IdCanal != 0 && IdCanal != '') {
            //     Busqueda.filters.push(search.createFilter({
            //         name: 'internalid', 
            //         operator: search.Operator.CONTAINS, //NO FUNCIONA ANYOF IS EQUALTO
            //         values: IdCanal
            //         })); 
            // }
            // if (Ruc_Canal != 0 && Ruc_Canal != '') {
            //     Busqueda.filters.push(search.createFilter({
            //         name: 'custrecord_ht_cd_ruccanaldistribucion', 
            //         operator: search.Operator.STARTSWITH,
            //         values: Ruc_Canal
            //         })); 
            // }
            if (Criterio != 0 && Criterio != '') {
                Criterio.split(";")
                if (Criterio?.includes(";")  || false)
                {
                    let array = Criterio.split(";")
                    identificacion = array[0].toUpperCase();
                    detalle = array[1].toUpperCase();
                }  
               // log.debug(tabla, identificacion);
               // log.debug(tabla, detalle);
                // Busqueda.filters.push(search.createFilter({
                //     name: 'custrecord_ht_cd_nombre', 
                //     operator: search.Operator.CONTAINS,
                //     values: detalle
                //     })); 
                Busqueda.filters.push(search.createFilter({
                        name: 'custrecord_ht_cd_ruccanaldistribucion', 
                        operator: search.Operator.IS,
                        values: identificacion
                        }));        
            }
            let ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            for (let i in ResConsulta) {
                Resultado.push({
                    Id: ResConsulta[i].getValue("internalid"),
                    Canal: Canal,
                    RucCanal: ResConsulta[i].getValue("custrecord_ht_cd_ruccanaldistribucion"),
                    DescripcionCanal: ResConsulta[i].getValue("custrecord_ht_cd_nombre"),
                    //DescripcionCanal: ResConsulta[i].getValue("name"),
                    //RucRepresentante: ResConsulta[i].getValue("custrecord_ht_cd_rucrepresentante"),
                    //Representante: ResConsulta[i].getValue("custrecord_ht_cd_representante")
                });
            }
            if (( Resultado[0]?.Id || "0")=="0")
            {
                Resultado = [];
                //log.debug(tabla, "Resultado......................");
                var creardatos = record.create({ type: tabla });
                creardatos.setValue({
                    fieldId: "name",
                    value: detalle,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_cd_nombre",
                    value: detalle,
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_cd_tipocanal",
                    value: TipoCanal,
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_cd_subsidiaria",
                    value: "2",
                });  
                creardatos.setValue({
                    fieldId: "custrecord_ht_cd_ruccanaldistribucion",
                    value: identificacion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_cd_subsidiaria",
                    value: subsidiaria,
                });
                indice = creardatos.save();
                //log.debug(tabla, indice);
                 Resultado.push({
                    Id: indice,
                    Canal: Canal,
                    RucCanal: identificacion,
                    DescripcionCanal: detalle,
                 });   
                 log.debug("customrecord_ht_record_canaldistribucion", Resultado); 
            }  
            //return Resultado;
            //log.debug("customrecord_ht_record_canaldistribucion", Resultado); 
            return Resultado[0]?.Id|| "0";
        }catch (error) {
            log.error('error', error);
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanal)';
        }
    }


    function ConsultaTipoVehiculo(Id_Marca, Id_Modelo, codigo, descripcion, tabla, subsidiaria){
        try{
            var Resultado = [];
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters:[
                   // ["isinactive","anyof","F"], 
                    ["isinactive","is","F"],
                    // "AND",
                    // ["custrecord_ht_tv_subsidiaria","anyof",subsidiaria] 
 
                ],
                columns:
                [
                  //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                  search.createColumn({ name: "custrecord_ht_tv_marca", label: "Id Marca" }),
                  search.createColumn({ name: "custrecord_ht_tv_modelo", label: "Id Modelo" }),
                  search.createColumn({name: "internalid", label: "Id tipo"}),
                  search.createColumn({name: "custrecord_ht_tv_subsidiaria", label: "subtipo"}),
                  search.createColumn({name: "custrecord_ht_tv_descripcion", label: "tipo"})   
                ]
            });
            if (Id_Marca != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tv_marca',
                operator: search.Operator.IS,
                values: Id_Marca
                }));
            }
            if (Id_Modelo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tv_modelo', 
                operator: search.Operator.IS,
                values: Id_Modelo
                }));
            } 
            if (codigo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: codigo
                }));
            } 
            if (descripcion != '') {
                var textodescripcion =  descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tv_descripcion', 
                operator: search.Operator.IS,
                values: textodescripcion
                }));
            }           
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            if (ResConsulta.count != 0) 
            {
                for (let i in ResConsulta) {
                    var IdMarca = ResConsulta[i].getValue({name: 'custrecord_ht_tv_marca'});
                    var IdModelo = ResConsulta[i].getValue({name: 'custrecord_ht_tv_modelo'});
                    var IdTipo = ResConsulta[i].getValue({name: 'internalid'});
                    var TipoSubsidiaria = ResConsulta[i].getValue({name: 'custrecord_ht_tv_subsidiaria'});
                    var Tipo = ResConsulta[i].getValue({name: 'custrecord_ht_tv_descripcion'});
                }  
                
                Resultado.push({
                    IdMarca: IdMarca,
                    IdModelo: IdModelo,
                    Id: IdTipo,
                    Descripcion: Tipo,
                    Subsidiaria: TipoSubsidiaria
                }); 
 
            }
            if (( Resultado[0]?.Id || "0")=="0")
            {
                Resultado = [];
                //log.debug(tabla, "Resultado......................");
                var creardatos = record.create({ type: tabla });
                creardatos.setValue({
                    fieldId: "name",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_marca",
                    value: Id_Marca,
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_modelo",
                    value: Id_Modelo,
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_codigo",
                    value: "000",
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_descripcion",
                    value: descripcion,
                });  
                creardatos.setValue({
                    fieldId: "custrecord_ht_tv_subsidiaria",
                    value: subsidiaria,
                });                
                indice = creardatos.save();
                //log.debug(tabla, indice);
                Resultado.push({
                    IdMarca: Id_Marca,
                    IdModelo: Id_Modelo,
                    Id: indice,
                    Descripcion: descripcion,
                    Subsidiaria: subsidiaria
                });  
                log.debug(tabla, Resultado);
            }       
            else     
            {
                log.debug('tabla...', Resultado);
                if (!esNumeroString( Resultado[0]?.Subsidiaria )){
                     let updateRec = record.load({ type: tabla, id:  Resultado[0]?.Id , isDynamic: true });
                     updateRec.setValue({ fieldId: 'custrecord_ht_tv_subsidiaria', value: subsidiaria });
                     let updaetIns = updateRec.save();
                     log.debug('tabla...updaetIns', updaetIns)
                }
            }  
            //return Resultado;
            return Resultado[0]?.Id || "0";
        } catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoVehiculo)';
        }
    }


    function ConsultaModelo(Id_Marca, Id_Modelo, descripcion, tabla, subsidiaria, codMarca){ 
        try{  
            var Resultado = [];
            //let bandera=false;
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters:[
                    //["isinactive","anyof","F"], 
                    ["isinactive","is","F"], 
                    "AND",
                    ["custrecord_ht_mod_subsidiaria","anyof",subsidiaria] 
                ],
                columns:
                [
                  //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                  search.createColumn({ name: "internalid", join: "CUSTRECORD_HT_MB_MARCA", label: "Id Marca" }),
                  search.createColumn({name: "custrecord_ht_mb_marca", label: "Codigo marca"}),
                  //search.createColumn({name: "custrecord_ht_marca_descripcion", join: "CUSTRECORD_HT_MB_MARCA", label: "Descripcion"}),
                  search.createColumn({name: "internalid", label: "Id Modelo"}),
                  //search.createColumn({name: "custrecord_ht_mod_codigo", label: "CodigoModelo"}),
                  search.createColumn({name: "custrecord_ht_mod_descripcion", label: "Modelo"})   
                ]
            });
            if (Id_Marca != '') {
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
           //log.debug("tabla................", Busqueda);
            if (descripcion != '') {
                bandera=true;
                var textodescripcion =  descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_mod_descripcion', 
                operator: search.Operator.IS,
                values: textodescripcion
                }));
            }          
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });
            //var ResConsulta =Busqueda.runPaged().count;
            //log.debug(tabla, theCount);
            //log.debug(tabla, tipo);
          //log.debug("tabla................", ResConsulta);
            if (ResConsulta != 0)
            {
                //log.debug(tabla, "Resultado..........1111............");
                log.debug(tabla, ResConsulta);
                for (let i in ResConsulta) {
                    var IdMarca = ResConsulta[i].getValue({name: 'custrecord_ht_mb_marca'});
                    //*var CodigoMarca = ResConsulta[i].getValue({name: 'custrecord_ht_marca_codigo', join: 'CUSTRECORD_HT_MB_MARCA'});
                    //var CodigoMarca =  ResConsulta[i].getValue({name: 'custrecord_ht_mb_marca', join: 'CUSTRECORD_HT_MB_MARCA'});
                    //var Marca = ResConsulta[i].getValue({name: 'custrecord_ht_marca_descripcion', join: 'CUSTRECORD_HT_MB_MARCA'});
                    var IdModelo = ResConsulta[i].getValue({name: 'internalid'});
                    //var CodigoModelo = ResConsulta[i].getValue({name: 'custrecord_ht_mod_codigo'});
                    var Modelo = ResConsulta[i].getValue({name: 'custrecord_ht_mod_descripcion'});  
                }  
                Resultado.push({
                    IdMarca: IdMarca,
                    //CodigoMarca: CodigoMarca,
                    //Marca: Marca,
                    Id: IdModelo,
                    //Codigo: CodigoModelo,
                    Descripcion: Modelo
                }); 
            } 
            //if (( Resultado[0]?.Id || "0")=="0")
            if (ResConsulta == 0)
            {
                Resultado = [];
                log.debug("Nuevo..................", "Nuevo......................");
                log.debug("descripcion...................", descripcion);
                log.debug("Id_Marca...................", Id_Marca);
                log.debug("codMarca...................", codMarca);
                var creardatos = record.create({ type: tabla });                
                creardatos.setValue({
                    fieldId: "name",
                    value: descripcion,
                });
                creardatos.setValue({
                    fieldId: "custrecord_ht_mb_marca",
                    value: Id_Marca,
                }); 
               //custrecord_ht_cod_marca
                creardatos.setValue({
                    fieldId: "custrecord_ht_cod_marca",
                    value: codMarca,
                   //-value: Id_Marca,
                }); 
                //custrecord_ht_mod_codigo
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_codigo",
                    value: Id_Marca,
                    //-value: codMarca,
                }); 
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_descripcion",
                    value: descripcion,
                });     
                creardatos.setValue({
                    fieldId: "custrecord_ht_mod_subsidiaria",
                    value: subsidiaria,
                }); 
                indice = creardatos.save();
                // //log.debug(tabla, indice);

                Resultado.push({
                    IdMarca: Id_Marca,
                    Id: indice,
                    Descripcion: descripcion
                });    
                log.debug(tabla, Resultado);
            }
            //return Resultado;
            return Resultado[0]?.Id || "0";
        }catch (error) {
            log.error('error', error);
            //return JSON.stringify({error: error.message});
            return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaModelo)';
        }
        
        
    }

    
    function ConsultaTipoTerrestre(Id_tipobien, codigo, descripcion, tabla, subsidiaria){
        try{
            var Resultado = [];
            descripcion = descripcion.toUpperCase();
            let Busqueda = search.create({
                type: tabla,
                filters: [
                    //["isinactive","anyof","F"], 
                    ["isinactive","is","F"],
                ],
                columns: [
                  //*search.createColumn({name: "custrecord_ht_mb_marca", label: "IdMarca"}),
                  //*search.createColumn({ name: "custrecord_ht_tv_marca", label: "Id Marca" }),
                  search.createColumn({ name: "custrecord_ht_tt_tipobien", label: "Id Tipo Bien" }),
                  search.createColumn({name: "internalid", label: "internalid"}),
                  search.createColumn({name: "name", label: "name"}),
                  search.createColumn({name: "custrecord_ht_bien_tipoterrestre_descrip", label: "tipobien"})   
                ]
            });
            if (Id_tipobien != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tt_tipobien',
                operator: search.Operator.IS,
                values: Id_tipobien
                }));
            }
            if (codigo != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'internalid', 
                operator: search.Operator.IS,
                values: codigo
                }));
            } 
            if (descripcion != '') {
                var textodescripcion =  descripcion.toUpperCase();
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_bien_tipoterrestre_descrip', 
                operator: search.Operator.IS,
                values: textodescripcion
                }));
            }           
            var ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;
            if (ResConsulta.count != 0) 
            {
                for (let i in ResConsulta) {
                    //var IdMarca = ResConsulta[i].getValue({name: 'custrecord_ht_tv_marca'});
                    var IdBien= ResConsulta[i].getValue({name: 'custrecord_ht_tt_tipobien'});
                    var IdTipo = ResConsulta[i].getValue({name: 'internalid'});
                    var Tipo = ResConsulta[i].getValue({name: 'custrecord_ht_bien_tipoterrestre_descrip'});
                }  
                Resultado.push({
                    //IdMarca: IdMarca,
                    IdBien: IdBien,
                    Id: IdTipo,
                    Descripcion: Tipo
                }); 
            }
            //log.debug(tabla, Resultado);        
            return Resultado[0]?.Id || "0";
        }catch (error) {
                log.error('error', error);
                //return JSON.stringify({error: error.message});
                return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaTipoTerrestre)';
        }
    }


    // function ConsultaColor(valor, tabla, campo){
    //     try{
            
    //         let Resultado = [];
    //         //valor=valor.toUpperCase();
    //         let Busqueda = search.create({
    //             type: tabla,
    //             filters:[
    //                 ["isinactive","anyof","F"], 
    //             ],
    //             columns:
    //             [
    //                 search.createColumn({name: "custrecord_ht_bn_colorcarseg_descripcion", label: "custrecord_ht_bn_colorcarseg_descripcion"  }),
    //                 search.createColumn({name: "internalid", label: "Id"}),
    //                 search.createColumn({name: "custrecord_ht_bn_colorcarseg_codigo", label: "Codigo"}),
    //                 search.createColumn({name: "name", label: "name"}),
    //             ]
    //         });
    //         if ( esNumeroString(valor) ){
    //             Busqueda.filters.push(search.createFilter({
    //                 name: 'internalid', 
    //                 operator: search.Operator.IS,
    //                 values: valor
    //                 })); 
    //         }else{
    //             var textovalor = valor.toUpperCase();
    //             Busqueda.filters.push(search.createFilter({
    //                 name: 'name', 
    //                 operator: search.Operator.IS,
    //                 values: textovalor
    //                 })); 
    //         }           
    //         let BusquedaNumReg = Busqueda.runPaged().count;
    //         //let ResConsulta = Busqueda.run().getRange(0, BusquedaNumReg);
    //         var ResConsulta = Busqueda.run().getRange({ start: 0, end: 100 });
    //         log.debug("1..........................", ResConsulta);
    //         for (let i in ResConsulta)  {
    //             var IdColor = ResConsulta[i].getValue({name: 'internalid'});
    //            // var Codigo = ResConsulta[i].getValue({name: 'custrecord_ht_bn_colorcarseg_codigo'});
    //             var Descripcion= ResConsulta[i].getValue({name: 'custrecord_ht_bn_colorcarseg_descripcion'});
    //             var Name= ResConsulta[i].getValue({name: 'name'});
    //             Resultado.push({
    //                 Id: IdColor,
    //                // Codigo: Codigo,
    //                 Descripcion: Descripcion,
    //                 Name: Name
    //             });
    //         }
    //         log.debug(tabla, Resultado);
    //         //return ;
    //         return (Resultado[0]?.Id || "0");
    //     }catch (error) {
    //             log.debug('error', error);
    //             //return JSON.stringify({error: error.message});
    //             return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaColor)';
    //     }
    // }


    const ConsultaGeneral = (valor, tabla, tipo, subsidiaria) => {
        try {
            valor.split(";")
            var valor2="";
            if (valor?.includes(";")  || false)
            {
                let array = valor.split(";")
                valor = array[0].toUpperCase();
                valor2 = array[1].toUpperCase();
            }  
            valor=valor.toUpperCase();
            filtersAux = []
            let bandera=false;
            if (tipo=='CILI') {
                bandera=true;
                filtersAux = [//["isinactive","anyof","F"], 
                               ["isinactive","is","F"],
                              "AND",
                              ["name", "is", valor.toUpperCase()]]
            }  else {
                if ( esNumeroString(valor) ){
                    filtersAux = [//["isinactive","anyof","F"],
                                  ["isinactive","is","F"],
                                  "AND",
                                  ["internalid", "anyof", valor]]
                } else {
                    if (tipo=='MARC'){
                        bandera=true;
                        filtersAux = [["isinactive","is",false], "AND",
                                      ["name", "is", valor], "AND",
                                      ["custrecord_ht_marca_sub","anyof",subsidiaria] 
                                    ]
                      //filtersAux = [  ["name", "is", valor]]
                    } else {
                        if (tipo=='TRAN' || tipo=="TCOM"){
                             bandera=true;
                             //log.error('5................................', valor);
                             filtersAux = [["isinactive","is","F"], "AND",
                                           ["name", "contains", valor]]
                              //filtersAux = [  ["name", "is", valor.toUpperCase()]]
                         } else if (tipo=='COLC' ){
                            bandera=true;
                            filtersAux = [["isinactive","is","F"], "AND",
                                          ["name", "is", valor.toUpperCase()] , "AND",
                                          ["custrecord_ht_bn_colorcarseg_subsidiaria","anyof",subsidiaria]
                                        ]
                         } else {
                            bandera=true;
                            filtersAux = [["isinactive","is","F"], "AND",
                                          ["name", "is", valor.toUpperCase()]]
                        }
                    }
                }
            } 
          //name
            //ConsultaColor
            //let busquedacolorcarseg= ConsultaGeneral(context.colorcarseg,"CUSTOMRECORD_HT_BN_COLORCARSEG" ,"COLC");
            const busquedaSearchObj = search.create({
            type: tabla,
            filters: filtersAux,
            columns: [
                { name: "internalid" },
                { name: "name" },
            ],
            });
            const myPagedData = busquedaSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        //campo: result.getValue({ name: campo}),
                        idInternal: result.getValue({ name: "internalid" }),
                        descripcion: result.getValue({ name: "name" }),
                    });
                });
            });
            var theCount =busquedaSearchObj.runPaged().count;
            //log.debug(tabla, theCount);
            //log.debug(tabla, tipo);
            if (theCount == 0){
                //valores se envian por defecto
                if (tipo=="ESBN" || tipo=="STBN" || tipo=="TIBN" || tipo=="LOCT" || tipo=="TRAN"){
                    bandera= false;     
                } 
                if (tipo=="UVEH" || tipo=="RECO" || tipo=="TFLO" || tipo=="AIRE" || tipo=="ECNV"){
                    bandera= false;     
                }               
                respuesta.push({
                    idInternal: 0,
                    descripcion: "",
                });  
            }                     
              //if (tipo=='MARC'){
               //  log.debug(tabla, respuesta);  
             // } 
            if (tipo=="COLF" || tipo=="COLM" || tipo=="COLC"){
                //log.debug(tabla, respuesta[0]);
                //log.debug(tabla, respuesta);
                if (( respuesta[0]?.idInternal || "0")=="0"){
                    bandera=true
                }  else {
                    bandera=false
                } 
            } 
            if ( bandera ){
                //log.debug(tabla, "aqui.....");
                //if (theCount != 1) {
                if (theCount == 0) {
                    respuesta= [];
                    var creardatos = record.create({ type: tabla });
                    creardatos.setValue({
                        fieldId: "name",
                        value: valor,
                    }); 
                    switch (tipo) {
                        //TIPO DE ORIGEN
                        case "TORG":  
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipo_origen_desc",
                                value: valor2,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_tip_sub",
                                value: subsidiaria,
                            }); 

                            
                            //bandera=true;
                            break;
                        //TIPO ORIGEN BIEN
                        case "TOBN":
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // });
                            break;
                        //MARCA
                        case "MARC":  
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_descripcion",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_codigo",
                                value: "000",
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_marca_sub",
                                value: subsidiaria,
                            }); 
                            break;
                        //TRANSMISION
                        case "TRAN":  
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_descripcion",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_codigo",
                                value: "000",
                            }); 
                            break;
                        //VERSION
                        case "VERS": 
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_version_descrip",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_version_codigo",
                                value: "000",
                            }); 
                            break;
                        //TIPO CABINA
                        case "TCAB":  
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocabina_descrip",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocabina_codigo",
                                value: "000",
                            }); 
                            break;
                        //COLOR FABRICANTE
                        case "COLF": 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorfabricante_descrip",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorfabricante_codigo",
                                value: "000",
                            }); 
                            //log.debug(tabla, "aqui..................");
                            break;
                        //COLOR MATRICULA
                        case "COLM": 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colormatricula_descrip",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colormatricula_codigo",
                                value: "000",
                            }); 
                           // log.debug(tabla, "aqui..................");
                            break;
                        //COLOR CARSEG
                        case "COLC":  
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorcarseg_descripcion",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorcarseg_codigo",
                                value: "000",
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_colorcarseg_subsidiaria",
                                value: subsidiaria,
                            }); 
                            //log.debug(tabla, "aqui..................");
                            break;
                        //CILINDRAJE
                        case "CILI":  
                            // var creardatos = record.create({ type: tabla });
                            // creardatos.setValue({
                            //     fieldId: "name",
                            //     value: valor,
                            // }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_cilindraje_descrip",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_record_cilindraje_codigo",
                                value: "000",
                            }); 
                            break;
                        //TRACCION
                        case "TRAC":  
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_traccion_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_traccion_codigo",
                                value: "000",
                            }); 
                            break;
                        //TIPO COMBUSTIBLE
                        case "TCOM": 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocombustible_descrip",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_bn_tipocombustible_codigo",
                                value: "000",
                            }); 
                            break;
                        //CONVENIO
                        case "CONV":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_cn_razon_social",
                                value: valor,
                            });
                            creardatos.setValue({
                                fieldId: "custrecord_ht_cn_nombreconvenio",
                                value: valor,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_cn_codigo",
                                value: "000",
                            });
                            break;
                        default: break;
                    }  
                    indice = creardatos.save();
                   // log.debug(tabla, indice);
                    respuesta.push({
                        idInternal: indice,
                        descripcion: valor,
                    });    
                    //respuesta = CrearRegistro(tabla,valor, valor2,tipo);
                    log.debug(tabla, respuesta);
                } 
            }
            //log.debug(tabla, respuesta);
            return (respuesta[0]?.idInternal || "0");
        } catch (e) {
            log.error(tabla, e);
            return 0;
        }
    };

    const ConsultaCodMarca = (valor, tabla, subsidiaria) => {
        try {
            valor.split(";")
            var valor2="";
            if (valor?.includes(";")  || false)
            {
                let array = valor.split(";")
                valor = array[0].toUpperCase();
                valor2 = array[1].toUpperCase();
            }  
            valor=valor.toUpperCase();
            filtersAux = []
            let bandera=false;
            
            if ( esNumeroString(valor) ){
                filtersAux = [["isinactive","is","F"], "AND",
                                ["internalid", "anyof", valor]]
            } else {
               
                bandera=true;
                filtersAux = [["isinactive","is",false], "AND",
                                ["name", "is", valor], "AND",
                                ["custrecord_ht_marca_sub","anyof",subsidiaria] 
                            ]
                //filtersAux = [  ["name", "is", valor]]
                
            }
            const busquedaSearchObj = search.create({
                type: tabla,
                filters: filtersAux,
                columns: [
                    { name: "internalid" },
                    { name: "custrecord_ht_marca_codigo" },
                    { name: "name" },
                ],
            });

            const myPagedData = busquedaSearchObj.runPaged({ pageSize: 1000 });
            let respuesta = [];
            myPagedData.pageRanges.forEach((pageRange) => {
                const myPage = myPagedData.fetch({ index: pageRange.index });
                myPage.data.forEach(function (result) {
                    respuesta.push({
                        //campo: result.getValue({ name: campo}),
                        idInternal: result.getValue({ name: "internalid" }),
                        codigo: result.getText({ name: "custrecord_ht_marca_codigo" }),
                        descripcion: result.getValue({ name: "name" }),
                    });
                });
            });
            var theCount =busquedaSearchObj.runPaged().count;
            //log.debug(tabla, theCount);
            //log.debug(tabla, tipo);
            if (theCount == 0){
                //valores se envian por defecto
                          
                respuesta.push({
                    idInternal: 0,
                    codigo:0,
                    descripcion: "",
                });  
            }    
            log.debug("Marca.................", respuesta);
            return (respuesta[0]?.codigo || "0");     
        } catch (e) {
            log.error(tabla, e);
            return 0;
        }
    };
    
    // const CrearRegistro = (tabla, valor, valor2, tipo) => {
    //     try {
          
    //         let bandera=false;
    //         switch (tipo) {
    //             case "TORG":  
    //                 var creardatos = record.create({ type: tabla });
    //                 creardatos.setValue({
    //                     fieldId: "name",
    //                     value: valor,
    //                 });
    //                 creardatos.setValue({
    //                     fieldId: "custrecord_ht_bn_tipo_origen_desc",
    //                     value: valor2,
    //                 }); 
    //                 bandera=true;
    //                 break;
    //             // case 2: Canal = "Concesionario"; break;
    //             // case 3: Canal = "Financiera"; break;
    //             default: break;
    //         }  
    //         var indice="";
    //         if (bandera){
    //             indice = creardatos.save();
    //             log.debug(tabla, indice);

    //             respuesta.push({
    //                 idInternal: indice,
    //                 descripcion: valor,
    //             });
    //         } else {
    //             respuesta.push({
    //                 idInternal: 0,
    //                 descripcion: "",
    //             });
    //         }
            
            
    //         return respuesta;
    //     } catch (error) {
    //       throw new Error("Error al guardar el registro");
    //     }
    // };

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});