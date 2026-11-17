/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log','N/search'], function(log,  search) {

    function _get(context){
        try{
            let ResultadoConsulta = [];
            let OpcionConsulta = context.opcion;

            switch (OpcionConsulta) {
                case "100": 
                    log.error("opcion: ","100");
                    let IdVeh = 0;
                    let CodVeh = '';
                    let idCliente = 0;
                    let CodCliente = '';
                    let IdOs = 0;
                    let CodOs = '';

                    if (typeof context.idvehiculo != 'undefined') {
                        if (context.idvehiculo.length != 0) {
                            if (isNaN(context.idvehiculo) == false){
                                IdVeh = context.idvehiculo;
                            }else {
                              return 'id:400, idvehiculo es un filtro numerico.';
                            }
                        }
                    }
                    if (typeof context.codigovehiculo != 'undefined') {
                        if (context.codigovehiculo.length != 0) {
                            CodVeh = context.codigovehiculo;
                        }
                    }
                    if (typeof context.idcliente != 'undefined') {
                        if (context.idcliente.length != 0) {
                            if (isNaN(context.idcliente) == false){
                                idCliente = context.idcliente;
                            }else {
                              return 'id:400, idcliente es un filtro numerico.';
                            }                            
                        }
                    }
                    if (typeof context.identificacion != 'undefined') {
                        if (context.identificacion.length != 0) {
                            CodCliente = context.identificacion;
                        }
                    }
                    if (typeof context.idos != 'undefined') {
                        if (context.idos.length != 0) {
                            if (isNaN(context.idos) == false){
                                IdOs = context.idos;
                            }else {
                              return 'id:400, idos es un filtro numerico.';
                            }
                        }
                    }
                    if (typeof context.os != 'undefined') {
                        if (context.os.length != 0) {
                            CodOs = context.os;
                        }
                    }
                    
                    ResultadoConsulta = ConsultaOrdenesTrabajo(IdVeh, CodVeh, idCliente, CodCliente, CodOs, IdOs);
                    break;

                case "101":
                    log.error("opcion: ","101");
                    let IdTaller = 0;
                    let CodTaller = '';
                    let DescTaller = '';
                    let IdOficina = 0;

                    if (typeof context.idtaller != 'undefined') {
                        if (context.idtaller.length != 0) {
                           IdTaller = context.idtaller;
                        }
                    }

                    if (typeof context.codtaller != 'undefined') {
                        if (context.codtaller.length != 0) {
                            CodTaller = context.codtaller;
                        }
                    }

                    if (typeof context.descripcion != 'undefined') {
                        if (context.descripcion.length != 0) {
                            DescTaller = context.descripcion;
                        }
                    }

                    if (typeof context.idoficina != 'undefined') {
                        if (context.idoficina.length != 0) {
                            IdOficina = context.idoficina;
                        }
                    }

                    ResultadoConsulta = ConsultaTaller(IdTaller, CodTaller, DescTaller, IdOficina);
                    break;
                default: 
                    return 'id:400, opcion no valida';
            }
          
            return ResultadoConsulta;
          
        } catch (error) {
             log.error ("error: ", error);
             return 'id:400, No se encontraron resultados.';
        }
    }

    function ConsultaOrdenesTrabajo(IdNsVehiculo, CodNsVehiculo, IdNsCliente, Identificacion, p_OS, p_IdOs) {
        try{


            if ((IdNsVehiculo == 0 || IdNsVehiculo == '') && 
                    (CodNsVehiculo == '' || CodNsVehiculo == 0) &&
                    (IdNsCliente == '' || IdNsCliente == 0) &&
                    (Identificacion == '' || Identificacion == 0) &&
                    (p_OS == '' || p_OS == 0) &&
                    (p_IdOs == '' || p_IdOs == 0)) {    
                    return 'id:400, Ingrese filtro de consulta.';
            }
          
            if ((IdNsCliente == 0 || IdNsCliente == '') && (Identificacion != '')){
                let objCliente = search.create({
                    type: "customer",
                    filters:
                    [
                        ["entityid","is",Identificacion]
                    ],
                    columns: [
                        search.createColumn({name: "internalid", label: "IdCliente"}), 
                        search.createColumn({name: "entityid", label: "Identificacion"})
                    ]
                });
                let ResCliente = objCliente.run().getRange(0, 1);
                IdNsCliente = ResCliente[0].getValue({name: 'internalid'});
            }
          
            let Resultado = [];
            let Busqueda = search.create({
                type: "customrecord_ht_record_ordentrabajo",
                columns: [
                    search.createColumn({name: "name", sort: search.Sort.ASC, label: "ID"}),                  
                    search.createColumn({name: "custrecord_ht_ot_orden_servicio", label: "HT OT ID Orden Servicio"}),
                    search.createColumn({name: "custrecord_ht_ot_estado", label: "HT OT Estado Orden de trabajo"}),
                    search.createColumn({name: "custrecord_ht_ot_item", label: "HT OT Ítem"}),
                    search.createColumn({name: "custrecord_ht_ot_cliente_id", label: "Cliente"}),
                    search.createColumn({name: "custrecord_ht_ot_taller", label: "HT OT Taller"}),
                    search.createColumn({name: "custrecord_ht_ot_boton_panico", label: "Botón de Pánico"}),
                    search.createColumn({name: "created", label: "Fecha de creación"}),
                    search.createColumn({name: "custrecord_flujo_de_alquiler", label: "Flujo de Alquiler"}),
                    search.createColumn({name: "custrecord_flujo_de_convenio", label: "Flujo de Convenio"}),
                    search.createColumn({name: "custrecord_flujo_de_custodia", label: "Flujo de Custodia"}),
                    search.createColumn({name: "custrecord_flujo_de_garantia", label: "Flujo de Garantia"}),

                    search.createColumn({name: "custrecord_ht_ot_boxserie", label: "HT Box Serie"}),
                    search.createColumn({name: "custrecord_ht_ot_pxadminfinalizacion", label: "HT Confirmación PX Admin"}),
                    search.createColumn({name: "custrecord_ht_ot_confirmaciontelamatic", label: "HT Confirmación Telematic"}),
                    search.createColumn({name: "custrecord_ht_ot_modelobien", label: "HT OS Modelo"}),
                    search.createColumn({name: "custrecord_ht_ot_apn", label: "HT OT APN"}),
                    search.createColumn({name: "custrecord_ht_ot_aireacondicionado", label: "HT OT Aire acondicionado"}),
                    search.createColumn({name: "custrecord_ht_ot_chasis", label: "HT OT Chasis"}),
                    search.createColumn({name: "custrecord_ht_ot_color", label: "HT OT Color"}),
                    search.createColumn({name: "custrecord_ht_ot_connovedad", label: "HT OT Con novedad"}),
                    search.createColumn({name: "custrecord_ht_ot_correorecepcion", label: "HT OT Correo"}),
                    search.createColumn({name: "custrecord_ht_ot_correocliente", label: "HT OT Correo del Cliente"}),
                    search.createColumn({name: "custrecord_ht_ot_codigoactivacion", label: "HT OT Código de Activación"}),
                    search.createColumn({name: "custrecord_ht_ot_codigorespuesta", label: "HT OT Código de Respuesta"}),
                    search.createColumn({name: "custrecord_ht_ot_direccioncliente", label: "HT OT Dirección del Cliente"}),
                    search.createColumn({name: "custrecord_ht_ot_dispositivo", label: "HT OT Dispositivo"}),
                    search.createColumn({name: "custrecord_ht_ot_estadochaser", label: "HT OT Estado Chaser"}),
                    search.createColumn({name: "custrecord_ht_ot_estadolojack", label: "HT OT Estado Lojack"}),
                    search.createColumn({name: "custrecord_ht_ot_fechaentrega", label: "HT OT Fecha entrega"}),
                    search.createColumn({name: "custrecord_ht_ot_fechatrabajoasignacion", label: "HT OT Fecha trabajo"}),
                    search.createColumn({name: "custrecord_ht_ot_firmware", label: "HT OT Firmware"}),
                    search.createColumn({name: "custrecord_ht_ot_fueraciudad", label: "HT OT Fuera Ciudad"}),
                    search.createColumn({name: "custrecord_ht_ot_fuerataller", label: "HT OT Fuera taller"}),
                    search.createColumn({name: "custrecord_ht_ot_horaentrega", label: "HT OT Hora entrega"}),
                    search.createColumn({name: "custrecord_ht_ot_horatrabajoasignacion", label: "HT OT Hora trabajo"}),
                    search.createColumn({name: "custrecord_ht_ot_vehiculo", label: "HT OT ID Vehículo"}),
                    search.createColumn({name: "custrecord_ht_ot_imei", label: "HT OT IMEI"}),
                    search.createColumn({name: "custrecord_ht_ot_ip", label: "HT OT IP"}),
                    search.createColumn({name: "custrecord_ht_ot_identificacioncliente", label: "HT OT Identificación del Cliente"}),
                    search.createColumn({name: "custrecord_ht_ot_item_vent_alq", label: "HT OT Item Vent Alq"}),
                    search.createColumn({name: "custrecord_ht_ot_listacomentarios", label: "HT OT Lista de comentarios"}),
                    search.createColumn({name: "custrecord_ht_ot_lucesparqueo", label: "HT OT Luces Parqueo"}),
                    search.createColumn({name: "custrecord_ht_ot_marca", label: "HT OT Marca"}),
                    search.createColumn({name: "custrecord_ht_ot_mascarillas", label: "HT OT Mascarillas"}),
                    search.createColumn({name: "custrecord_ht_ot_mensajerecepcion", label: "HT OT Mensaje"}),
                    search.createColumn({name: "custrecord_ht_ot_modelo", label: "HT OT Modelo"}),
                    search.createColumn({name: "custrecord_ht_ot_motivos", label: "HT OT Motivos"}),
                    search.createColumn({name: "custrecord_ht_ot_motivoscomentario", label: "HT OT Motivos Comentario"}),
                    search.createColumn({name: "custrecord_ht_ot_motor", label: "HT OT Motor"}),
                    search.createColumn({name: "custrecord_ht_ot_noimpulsaplataformas", label: "HT OT No impulsa a Plataformas"}),
                    search.createColumn({name: "custrecord_ht_ot_nombrereciberecepcion", label: "HT OT Nombre Recibe"}),
                    search.createColumn({name: "custrecord_ht_ot_nombreentregarecepcion", label: "HT OT Nombre entrega"}),
                    search.createColumn({name: "custrecord_ht_ot_novedades", label: "HT OT Novedades"}),
                    search.createColumn({name: "custrecord_ht_ot_observacion", label: "HT OT Observación"}),
                    search.createColumn({name: "custrecord_ht_ot_odometro", label: "HT OT Odómetro"}),
                    search.createColumn({name: "custrecord_ht_ot_oficinaatencion", label: "HT OT Oficina de atención"}),
                    search.createColumn({name: "custrecord_ht_ot_orden_serivicio_txt", label: "HT OT Orden de Servicio TXT"}),
                    search.createColumn({name: "custrecord_ht_ot_ordenfabricacion", label: "HT OT Orden de fabricación"}),
                    search.createColumn({name: "custrecord_ht_ot_paralizador", label: "HT OT Paralizador"}),
                    search.createColumn({name: "custrecord_ht_ot_perillas", label: "HT OT Perillas"}),
                    search.createColumn({name: "custrecord_ht_ot_placa", label: "HT OT Placa"}),
                    search.createColumn({name: "custrecord_ht_ot_radio", label: "HT OT Radio"}),
                    search.createColumn({name: "custrecord_ht_ot_script", label: "HT OT Script"}),
                    search.createColumn({name: "custrecord_ht_ot_serieproductoasignacion", label: "HT OT Serie Producto"}),
                    search.createColumn({name: "custrecord_ht_ot_servidor", label: "HT OT Servidor"}),
                    search.createColumn({name: "custrecord_ht_ot_simcard", label: "HT OT Sim Card"}),
                    search.createColumn({name: "custrecord_ht_ot_sinnovedad", label: "HT OT Sin novedad"}),
                    search.createColumn({name: "custrecord_ht_ot_supervisorasignacion", label: "HT OT Supervisor"}),
                    search.createColumn({name: "custrecord_ht_ot_tapacombustible", label: "HT OT Tapa Combustible"}),
                    search.createColumn({name: "custrecord_ht_ot_telefonocliente", label: "HT OT Teléfono del Cliente"}),
                    search.createColumn({name: "custrecord_ht_ot_termometro", label: "HT OT Termometro"}),
                    search.createColumn({name: "custrecord_ht_ot_tipo", label: "HT OT Tipo"}),
                    search.createColumn({name: "custrecord_ht_ot_tecnicoasignacion", label: "HT OT Técnico asignado"}),
                    search.createColumn({name: "custrecord_ht_ot_ubicacion", label: "HT OT Ubicación"}),
                    search.createColumn({name: "custrecord_ht_ot_unidad", label: "HT OT Unidad"}),
                    search.createColumn({name: "custrecord_ht_ot_vid", label: "HT OT VID"}),
                    search.createColumn({name: "custrecord_ht_ot_version", label: "HT OT Version"}),
                    search.createColumn({name: "custrecord_ht_ot_itemrelacionado", label: "HT OT Ítem relacionado"}),
                    search.createColumn({name: "externalid", label: "ID externo"}),
                    search.createColumn({name: "internalid", label: "ID interno"}),
                    search.createColumn({name: "language", label: "Idioma"}),
                    search.createColumn({name: "isinactive", label: "Inactivo"}),
                    search.createColumn({name: "custrecord_ts_item_venta_garantia", label: "Item de Venta por Garantia"}),
                    search.createColumn({name: "custrecord_ht_ot_producto", label: "PRODUCTO"}),
                    search.createColumn({name: "custrecord_ht_ot_tenico_emp", label: "TECNICO EMPLEADO"}),
                    search.createColumn({name: "custrecord_ht_ot_tipo_trabajo", label: "TTR Producto"}),
                    search.createColumn({name: "lastmodified", label: "Última modificación"}),
                    //search.createColumn({name: "vatregnumber", join: "customer", label: "Identificacion"}),

                    search.createColumn({
                        name: "name",
                        join: "CUSTRECORD_HT_OT_VEHICULO",
                        label: "ID"
                     }),
                     search.createColumn({
                        name: "internalid",
                        join: "CUSTRECORD_HT_OT_VEHICULO",
                        label: "ID interno"
                     }),
                     search.createColumn({
                        name: "altname",
                        join: "CUSTRECORD_HT_OT_VEHICULO",
                        label: "Nombre"
                     }),
                    search.createColumn({
                        name: "altname",
                        join: "CUSTRECORD_HT_OT_CLIENTE_ID",
                        label: "Nombre"
                    })
                  

                ]                        
            });

            if (CodNsVehiculo != '') {
              log.error("filtro codvehiculo: ", CodNsVehiculo);
                Busqueda.filters.push(search.createFilter({
                name: 'idtext', 
                join:  'CUSTRECORD_HT_OT_VEHICULO',
                operator: search.Operator.IS,
                values: CodNsVehiculo
                }));
            }

            if (IdNsVehiculo != '') {
              log.error("filtro idvehiculo: ", IdNsVehiculo);
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_ot_vehiculo', //'internalid', 
                operator: search.Operator.ANYOF,
                values: IdNsVehiculo
                }));
            }

            if (IdNsCliente != 0 && IdNsCliente != '') {
              log.error("filtro idcliente: ", IdNsCliente);
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_ot_cliente_id', 
                    operator: search.Operator.IS,
                    values: IdNsCliente
                    }));
            }

            if (p_OS != ''){
              log.error("filtro os: ", p_OS);
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_ot_orden_serivicio_txt', 
                    operator: search.Operator.IS,
                    values: p_OS
                    }));
            }

            if (p_IdOs != 0 && p_IdOs != ''){
              log.error("filtro id_os: ", p_IdOs);
                Busqueda.filters.push(search.createFilter({
                    name: 'custrecord_ht_ot_orden_servicio', 
                    operator: search.Operator.IS,
                    values: p_IdOs
                    }));
            }
          
            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange({ start: 0, end: 100 });

            for (let i in ResConsulta) {
                let IdOt = ResConsulta[i].getValue({name: 'internalid'});
                let Ot = ResConsulta[i].getValue({name: 'name'});
                let IdOs = ResConsulta[i].getValue({name: 'custrecord_ht_ot_orden_servicio'});
                let Os = ResConsulta[i].getValue({name: 'custrecord_ht_ot_orden_serivicio_txt'});
                let IdVehiculo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_vehiculo'});
                let CodigoVehiculo = ResConsulta[i].getValue({name: 'name', join: 'CUSTRECORD_HT_OT_VEHICULO'});
                let Placa = ResConsulta[i].getValue({name: 'custrecord_ht_ot_placa'});
                let Chasis = ResConsulta[i].getValue({name: 'custrecord_ht_ot_chasis'});
                let IdEstadoOt = ResConsulta[i].getValue({name: 'custrecord_ht_ot_estado'});
                let EstadoOt = ResConsulta[i].getText({name: 'custrecord_ht_ot_estado'});
                let IdItemOt = ResConsulta[i].getValue({name: 'custrecord_ht_ot_item'});
                let ItemOt = ResConsulta[i].getText({name: 'custrecord_ht_ot_item'});
                let IdClienteOt = ResConsulta[i].getValue({name: 'custrecord_ht_ot_cliente_id'});
                let IdentificacionCliente = ResConsulta[i].getValue({name: 'custrecord_ht_ot_identificacioncliente'});
                let ClienteOt = ResConsulta[i].getText({name: 'custrecord_ht_ot_cliente_id'});
                let ClienteNombre = ResConsulta[i].getValue({name: 'altname', join: 'CUSTRECORD_HT_OT_CLIENTE_ID'});
                let idTallerOt = ResConsulta[i].getValue({name: 'custrecord_ht_ot_taller'});
                let TallerOt = ResConsulta[i].getText({name: 'custrecord_ht_ot_taller'});
                let BotonPanicoOt = ResConsulta[i].getValue({name: 'custrecord_ht_ot_boton_panico'});
                let FechaOt = ResConsulta[i].getValue({name: 'created'});
                let AlquilerOt = ResConsulta[i].getValue({name: 'custrecord_flujo_de_alquiler'});
                let ConvenioOt = ResConsulta[i].getValue({name: 'custrecord_flujo_de_convenio'});
                let CustodiaOt = ResConsulta[i].getValue({name: 'custrecord_flujo_de_custodia'});
                let GarantiaOt = ResConsulta[i].getValue({name: 'custrecord_flujo_de_garantia'});
                let Serie = ResConsulta[i].getValue({name: 'custrecord_ht_ot_boxserie'});
                let PXAdmin = ResConsulta[i].getValue({name: 'custrecord_ht_ot_pxadminfinalizacion'});
                let Telematic = ResConsulta[i].getValue({name: 'custrecord_ht_ot_confirmaciontelamatic'});
                let IdModeloVeh = ResConsulta[i].getValue({name: 'custrecord_ht_ot_modelobien'});
                let ModeloVeh = ResConsulta[i].getText({name: 'custrecord_ht_ot_modelobien'});
                let Apn = ResConsulta[i].getValue({name: 'custrecord_ht_ot_apn'});
                let AireAcondicionado = ResConsulta[i].getValue({name: 'custrecord_ht_ot_aireacondicionado'});
                
                let IdColor = ResConsulta[i].getValue({name: 'custrecord_ht_ot_color'});
                let Color = ResConsulta[i].getText({name: 'custrecord_ht_ot_color'});
                let Novedad = ResConsulta[i].getValue({name: 'custrecord_ht_ot_connovedad'});
                let Correo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_correorecepcion'});
                let CorreoCliente = ResConsulta[i].getValue({name: 'custrecord_ht_ot_correocliente'});
                let Activacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_codigoactivacion'});
                let Respuesta = ResConsulta[i].getValue({name: 'custrecord_ht_ot_codigorespuesta'});
                let DireccionCliente = ResConsulta[i].getValue({name: 'custrecord_ht_ot_direccioncliente'});
                let Dispositivo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_dispositivo'});
                let IdEstadoChaser = ResConsulta[i].getValue({name: 'custrecord_ht_ot_estadochaser'});
                let EstadoChaser = ResConsulta[i].getText({name: 'custrecord_ht_ot_estadochaser'});
                let IdEstadoLojack = ResConsulta[i].getValue({name: 'custrecord_ht_ot_estadolojack'});
                let EstadoLojack = ResConsulta[i].getText({name: 'custrecord_ht_ot_estadolojack'});
                let FechaEntrega = ResConsulta[i].getValue({name: 'custrecord_ht_ot_fechaentrega'});
                let FecTrabajoAsig = ResConsulta[i].getValue({name: 'custrecord_ht_ot_fechatrabajoasignacion'});
                let Firmware = ResConsulta[i].getValue({name: 'custrecord_ht_ot_firmware'});
                let FueraCiudad = ResConsulta[i].getValue({name: 'custrecord_ht_ot_fueraciudad'});
                let FueraTaller = ResConsulta[i].getValue({name: 'custrecord_ht_ot_fuerataller'});
                let HoraEntrega = ResConsulta[i].getValue({name: 'custrecord_ht_ot_horaentrega'});
                let HoraTrabajo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_horatrabajoasignacion'});
                let Imei = ResConsulta[i].getValue({name: 'custrecord_ht_ot_imei'});
                let Ip = ResConsulta[i].getValue({name: 'custrecord_ht_ot_ip'});
                
                let ItemAlq = ResConsulta[i].getValue({name: 'custrecord_ht_ot_item_vent_alq'});
                let ListaComentario = ResConsulta[i].getValue({name: 'custrecord_ht_ot_listacomentarios'});
                let LucesParqueo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_lucesparqueo'});
                let Marca = ResConsulta[i].getValue({name: 'custrecord_ht_ot_marca'});
                let Mascarilla = ResConsulta[i].getValue({name: 'custrecord_ht_ot_mascarillas'});
                let MsgRecepcion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_mensajerecepcion'});
                let Modelo = ResConsulta[i].getValue({name: 'custrecord_ht_ot_modelo'});
                let Motivos = ResConsulta[i].getValue({name: 'custrecord_ht_ot_motivos'});
                let MotivosComentario = ResConsulta[i].getValue({name: 'custrecord_ht_ot_motivoscomentario'});
                let Motor = ResConsulta[i].getValue({name: 'custrecord_ht_ot_motor'});
                let NoImpulsaPlataforma = ResConsulta[i].getValue({name: 'custrecord_ht_ot_noimpulsaplataformas'});
                let NombreRecibe = ResConsulta[i].getValue({name: 'custrecord_ht_ot_nombrereciberecepcion'});
                let NombreEntrega = ResConsulta[i].getValue({name: 'custrecord_ht_ot_nombreentregarecepcion'});
                let Novedades = ResConsulta[i].getValue({name: 'custrecord_ht_ot_novedades'});
                let Observacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_observacion'});
                let Odometro = ResConsulta[i].getValue({name: 'custrecord_ht_ot_odometro'});
                let OficinaAtencion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_oficinaatencion'});
                let IdOrdenFabricacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_ordenfabricacion'});
                let OrdenFabricacion = ResConsulta[i].getText({name: 'custrecord_ht_ot_ordenfabricacion'});
                let Paralizador = ResConsulta[i].getValue({name: 'custrecord_ht_ot_paralizador'});
                let Perillas = ResConsulta[i].getValue({name: 'custrecord_ht_ot_perillas'});
                
                let Radio = ResConsulta[i].getValue({name: 'custrecord_ht_ot_radio'});
                let Script = ResConsulta[i].getValue({name: 'custrecord_ht_ot_script'});
                let IdSerieProdAsig = ResConsulta[i].getValue({name: 'custrecord_ht_ot_serieproductoasignacion'});
                let SerieProdAsig = ResConsulta[i].getText({name: 'custrecord_ht_ot_serieproductoasignacion'});
                let Servidor = ResConsulta[i].getValue({name: 'custrecord_ht_ot_servidor'});
                let SimCard = ResConsulta[i].getValue({name: 'custrecord_ht_ot_simcard'});
                let SinNovedad = ResConsulta[i].getValue({name: 'custrecord_ht_ot_sinnovedad'});
                let SupervisorAsignacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_supervisorasignacion'});
                let TapaCombustible = ResConsulta[i].getValue({name: 'custrecord_ht_ot_tapacombustible'});
                let TelefonoCliente = ResConsulta[i].getValue({name: 'custrecord_ht_ot_telefonocliente'});
                let Termometro = ResConsulta[i].getValue({name: 'custrecord_ht_ot_termometro'});
                let TecnicoAsignacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_tecnicoasignacion'});
                let Ubicacion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_ubicacion'});
                let Unidad = ResConsulta[i].getValue({name: 'custrecord_ht_ot_unidad'});
                let Vid = ResConsulta[i].getValue({name: 'custrecord_ht_ot_vid'});
                let Version = ResConsulta[i].getValue({name: 'custrecord_ht_ot_version'});
                let IdItemRelacionado = ResConsulta[i].getValue({name: 'custrecord_ht_ot_itemrelacionado'});
                let ItemRelacionado = ResConsulta[i].getText({name: 'custrecord_ht_ot_itemrelacionado'});
                
                let isinactive = ResConsulta[i].getValue({name: 'isinactive'});
                let Garantia = ResConsulta[i].getValue({name: 'custrecord_ts_item_venta_garantia'});
                let Producto = ResConsulta[i].getValue({name: 'custrecord_ht_ot_producto'});
                let DescProducto = ResConsulta[i].getText({name: 'custrecord_ht_ot_producto'});
                let Tecnico = ResConsulta[i].getValue({name: 'custrecord_ht_ot_tenico_emp'});
                let TipoTransaccion = ResConsulta[i].getValue({name: 'custrecord_ht_ot_tipo_trabajo'});
                let FechaModificacion = ResConsulta[i].getValue({name: 'lastmodified'});
              
                Resultado.push({
                    IdOt: IdOt,
                    Ot: Ot,
                    IdOs: IdOs,
                    Os: Os,
                    IdVehiculo: IdVehiculo,
                    CodigoVehiculo: CodigoVehiculo,
                    Placa: Placa,
                    Chasis: Chasis,
                    IdEstadoOt: IdEstadoOt,
                    EstadoOt: EstadoOt,
                    IdItemOt: IdItemOt,
                    ItemOt: ItemOt,
                    IdClienteOt: IdClienteOt,
                    ClienteOt: ClienteOt,
                    IdentificacionCliente: IdentificacionCliente,
                    ClienteNombre: ClienteNombre,
                    idTallerOt: idTallerOt,
                    TallerOt: TallerOt,
                    BotonPanicoOt: BotonPanicoOt,
                    FechaOt: FechaOt,
                    AlquilerOt: AlquilerOt,
                    ConvenioOt: ConvenioOt,
                    CustodiaOt: CustodiaOt,
                    GarantiaOt: GarantiaOt,
                    Serie: Serie,
                    PXAdmin: PXAdmin,
                    Telematic: Telematic,
                    IdModeloVeh: IdModeloVeh,
                    ModeloVeh: ModeloVeh,
                    Apn: Apn,
                    AireAcondicionado: AireAcondicionado,
                    IdColor: IdColor,
                    Color: Color,
                    Novedad: Novedad,
                    Correo: Correo,
                    CorreoCliente: CorreoCliente,
                    Activacion: Activacion,
                    Respuesta: Respuesta,
                    DireccionCliente: DireccionCliente,
                    Dispositivo: Dispositivo,
                    IdEstadoChaser: IdEstadoChaser,
                    EstadoChaser: EstadoChaser,
                    IdEstadoLojack: IdEstadoLojack,
                    EstadoLojack: EstadoLojack,
                    FechaEntrega: FechaEntrega,
                    FecTrabajoAsig: FecTrabajoAsig,
                    Firmware: Firmware,
                    FueraCiudad: FueraCiudad,
                    FueraTaller: FueraTaller,
                    HoraEntrega: HoraEntrega,
                    HoraTrabajo: HoraTrabajo,
                    Imei: Imei,
                    Ip: Ip,
                    ItemAlq: ItemAlq,
                    ListaComentario: ListaComentario,
                    LucesParqueo: LucesParqueo,
                    Marca: Marca,
                    Mascarilla: Mascarilla,
                    MsgRecepcion: MsgRecepcion,
                    Modelo: Modelo,
                    Motivos: Motivos,
                    MotivosComentario: MotivosComentario,
                    Motor: Motor,
                    NoImpulsaPlataforma: NoImpulsaPlataforma,
                    NombreRecibe: NombreRecibe,
                    NombreEntrega: NombreEntrega,
                    Novedades: Novedades,
                    Observacion: Observacion,
                    Odometro: Odometro,
                    OficinaAtencion: OficinaAtencion,
                    IdOrdenFabricacion: IdOrdenFabricacion,
                    OrdenFabricacion: OrdenFabricacion,
                    Paralizador: Paralizador,
                    Perillas: Perillas,
                    
                    Radio: Radio,
                    Script: Script,
                    IdSerieProdAsig: IdSerieProdAsig,
                    SerieProdAsig: SerieProdAsig,
                    Servidor: Servidor,
                    SimCard: SimCard,
                    SinNovedad: SinNovedad,
                    SupervisorAsignacion: SupervisorAsignacion,
                    TapaCombustible: TapaCombustible,
                    TelefonoCliente: TelefonoCliente,
                    Termometro: Termometro,
                    TecnicoAsignacion: TecnicoAsignacion,
                    Ubicacion: Ubicacion,
                    Unidad: Unidad,
                    Vid: Vid,
                    Version: Version,
                    IdItemRelacionado: IdItemRelacionado,
                    ItemRelacionado: ItemRelacionado,
                    isinactive: isinactive,
                    Garantia: Garantia,
                    Producto: Producto,
                    DescProducto: DescProducto,
                    Tecnico: Tecnico,
                    TipoTransaccion: TipoTransaccion,
                    FechaModificacion: FechaModificacion
                }); 
            } //for

            return Resultado;

        } catch (error) {
            log.error ("error: ", error);
            return 'id:400, No se encontraron resultados. Error Controlado (ConsultaOrdenesTrabajo)';
        }
    }

    function ConsultaTaller(IdTaller, CodTaller, DescTaller, IdNsOficina){
        try{
            let Resultado = [];
            let Busqueda = search.create({
                type: "customrecord_ht_tt_tallertablet",
                filters: [["isinactive","is","F"], "AND",
                          ["formulatext: {name}","contains",DescTaller]],
                columns: [
                    search.createColumn({name: "internalid", label: "IdTaller"}),
                    search.createColumn({name: "custrecord_ht_tt_codigo", label: "CodTaller"}),
                    search.createColumn({name: "custrecord_ht_tt_descripcion", label: "Descripcion"}),
                    search.createColumn({name: "custrecord_ht_tt_oficina", label: "IdOficina"}),
                    search.createColumn({name: "name", label: "Nombre"})
                ]
            }); 

            if ((IdTaller != '') && (IdTaller!=0)) {
                  Busqueda.filters.push(search.createFilter({
                  name: 'internalid', 
                  operator: search.Operator.IS,
                  values: IdTaller
                  }));
            }

            if (CodTaller != '') {
                Busqueda.filters.push(search.createFilter({
                name: 'custrecord_ht_tt_codigo', 
                operator: search.Operator.IS,
                values: CodTaller
                }));
            }

            if ((IdNsOficina != '') && (IdNsOficina!=0)) {
                  Busqueda.filters.push(search.createFilter({
                  name: 'custrecord_ht_tt_oficina', 
                  operator: search.Operator.IS,
                  values: IdNsOficina
                  }));
            }
  
            let BusquedaNumReg = Busqueda.runPaged().count;
            let ResConsulta = Busqueda.run().getRange({ start: 0, end: BusquedaNumReg });

            for (let i in ResConsulta) {
                let IdNsaller = ResConsulta[i].getValue({name: 'internalid'});
                let CodigoTaller = ResConsulta[i].getValue({name: 'custrecord_ht_tt_codigo'});
                let Descripcion = ResConsulta[i].getValue({name: 'custrecord_ht_tt_descripcion'});
                let NombreTaller = ResConsulta[i].getValue({name: 'name'});
                let IdOficina = ResConsulta[i].getValue({name: 'custrecord_ht_tt_oficina'});
                let Oficina = ResConsulta[i].getText({name: 'custrecord_ht_tt_oficina'});

                Resultado.push({
                    IdTaller: IdNsaller,
                    CodTaller: CodigoTaller,
                    Descripcion: Descripcion,
                    NombreTaller: NombreTaller,
                    IdOficina: IdOficina,
                    OficinaDescripcion: Oficina
                });
            }

            return Resultado;
        } catch (error) {
            log.error ("error: ", error);
            return 'id:400, No se encontraron resultados. (ConsultaTaller)';
       }
    }

    function _post() {
        // post
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