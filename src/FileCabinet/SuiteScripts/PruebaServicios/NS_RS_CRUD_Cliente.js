/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log', 'N/record', 'N/search', 'N/query','N/runtime'], function (log, record, search, query, runtime) {
    // TODO: Acciones
    const CREAR = 'crear';
    const ACTUALIZAR = 'actualizar';

    function _get(context) {
        try {
            var vatregnumber= context.vatregnumber;
            let subsidiaria = runtime.getCurrentUser().subsidiary;
            log.error("...........subsidiary................", subsidiaria);
            
            log.debug('Request.....Get..............', context);
            var busquedaCustomer = search.create({
                type: record.Type.CUSTOMER,
                filters:
                [  ["vatregnumber", search.Operator.IS, context.vatregnumber],"AND",
                   ["isinactive","is","F"]
                  //-- ["isinactive","is","F"],"AND",
                  //- ["subsidiary","anyof",subsidiaria]
                ],
                columns:
                [
                   search.createColumn({name: "entityid",   label: "entityid"}),
                   search.createColumn({name: "altname",  label: "altname"}),
                   search.createColumn({name: "lastname", label: "lastname"}),
                   search.createColumn({name: "email", label: "email"}),
                   search.createColumn({name: "firstname", label: "firstname"}),
                   search.createColumn({name: "internalid", label: "internalid"}),
                   search.createColumn({ name: "subsidiary", label: "subsidiary" }),      
          
                ]
            });
            var searchResultCount = busquedaCustomer.runPaged().count;
            //log.debug("busquedaclienteSearch result count",searchResultCount);
            let respuestaConsulta = [];
            busquedaCustomer.run().each(function(result){
                respuestaConsulta.push({
                    firstname: result.getValue({ name: "firstname" }),
                    lastname: result.getValue({ name: "lastname" }),
                    codigo: result.getValue({ name: "internalid" }),
                    entityid: result.getValue({ name: "entityid" }),
                    altname: result.getValue({ name: "altname" }),
                    identificacion: vatregnumber,      
                    subsidiary:result.getValue({ name: "subsidiary" }),            
                });
            });
            log.debug('Response.....Get..............', respuestaConsulta);
            return JSON.stringify({ results: respuestaConsulta });
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _post(context) {
        try {
            //REQUEST
            log.debug('Request.....Post.......', context);
            let isperson = context.isperson;
            let primernombre = context.primernombre.toUpperCase();
            let segundonombre = context.segundonombre.toUpperCase();
            let primerapellido = context.primerapellido.toUpperCase();
            let segundoapellido = context.segundoapellido.toUpperCase();
            let subsidiaria = runtime.getCurrentUser().subsidiary;
            log.error("...........subsidiary................", subsidiaria);
            
            let busquedaoficina= ConsultaGeneral(context.oficinacliente, "Location" ,"LOCT", subsidiaria);
            if (busquedaoficina==0){
                busquedaoficina= ConsultaGeneral("GUAYAQUIL", "Location" ,"LOCT", subsidiaria);
            }
            //log.debug('Location.........', busquedaoficina);

            let busquedadocumento= ConsultaGeneral(context.document_type, "CUSTOMRECORD_EC_DOCUMENT_TYPE" ,"TDOC", subsidiaria);
            //log.debug('Documento.........', busquedadocumento);
            
            let busquedapais= ConsultaGeneral(context.pais_entidad, "CUSTOMRECORD_TS_EC_PE_PAIS" ,"PAIS", subsidiaria);
            //log.debug('Pais.........', busquedapais);

            //--var busquedaconcesionario= ConsultaCanal(2,context.concesionario,"customrecord_ht_record_canaldistribucion")
            //log.debug('CONCESIONARIO.........', busquedaconcesionario);
            // let companyname = context.companyname;
            // let email = context.email;
            // let phone = context.phone;
            // let subsidiary = context.principalsubsidiary;
            var items;
            var itemsTelefono;
            var itemsMail;
            var altname;
            accion = context?.accion?.toLowerCase() || null;
                switch (accion) {
                    // TODO: CREAR
                    case CREAR:
                        //CREATE RECORD
                        let objRecord = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
                        //objRecord.setValue({ fieldId: 'isperson', value: isperson, ignoreFieldChange: true });
                       // objRecord.setValue({ fieldId: 'id', value: 37345 });
                        objRecord.setValue({ fieldId: 'entityid', value: context.entityid  });
                        objRecord.setValue({ fieldId: 'customform', value: context.customform  });
                        objRecord.setValue({ fieldId: 'entitystatus', value: context.entitystatus  });
                        objRecord.setValue({ fieldId: 'category', value: context.category  });
                        objRecord.setValue({ fieldId: 'salesrep', value: context.salesrep  });
                        //objRecord.setValue({ fieldId: 'email', value: context.email  });
                        //objRecord.setValue({ fieldId: 'phone', value: context.phone  });
                        //--objRecord.setValue({ fieldId: 'subsidiary', value: context.subsidiary  });
                        objRecord.setValue({ fieldId: 'subsidiary', value: subsidiaria });
                        objRecord.setValue({ fieldId: 'custentity_ht_cl_oficinacliente', value: busquedaoficina });
                        objRecord.setValue({ fieldId: 'custentity_ec_document_type', value: busquedadocumento});
                        objRecord.setValue({ fieldId: 'vatregnumber', value: context. vatregnumber });
                        objRecord.setValue({ fieldId: 'custentity_ts_ec_tipo_persona', value: context.tipo_persona  });
                        objRecord.setValue({ fieldId: 'custentityts_ec_pais_entidad', value: busquedapais  }); 
                        //--objRecord.setValue({ fieldId: 'custentity_ht_cleconc', value: busquedaconcesionario  }); 
                        objRecord.setValue({ fieldId: 'custentity_ec_obligado_contabilidad', value: "1"  });                        
                        objRecord.setValue({ fieldId: 'receivablesaccount', value: context.cxcobrar  });       
                        //bloque direcciones
                        items = context.addressbook;
                        log.debug('items....direc.....', items);
                        // const itemLine = objRecord.selectNewLine({ sublistId: 'addressbook' });
                        for (let i in items) {
                            let busquedatipodireccion= ConsultaGeneral(items[i].custrecord_ht_direccion_tipo, "customlist_ht_tipodireccion" ,"TDIR", subsidiaria);
                            //log.debug('TipoDireccion.........', busquedatipodireccion);
                            let busquedaprovincia= ConsultaGeneral(items[i].custrecord_ec_provincia, "CUSTOMRECORD_EC_RECORD_PROVINCIA" ,"PROV", subsidiaria);
                            //log.debug('Provincia.........', busquedaprovincia);
                            let valorcanton  = items[i].custrecord_ec_canton+';'+busquedaprovincia;
                            let busquedacanton= ConsultaGeneral(valorcanton ,"CUSTOMRECORD_EC_RECORD_CANTON" ,"CANT", subsidiaria);
                            //log.debug('Canton.........', busquedacanton);
                            let valorparroquia = items[i].custrecord_ec_parroquia+';'+busquedacanton+';'+items[i].custrecord_ec_provincia;
                            let busquedaparroquia= ConsultaGeneral(valorparroquia, "CUSTOMRECORD_EC_RECORD_PARROQUIA", "PARR", subsidiaria);
                            //log.debug('Parroquia.........', busquedaparroquia);
                            /*Ajuste para el codigo del script */
                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'defaultshipping',
                                value: true
                            });                   
                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'defaultbilling',
                                value: true
                            });
                            objRecord.setCurrentSublistValue({
                                sublistId: 'addressbook',
                                fieldId: 'label',
                                value: items[i].addr1
                            });
                            let dire =  objRecord.getCurrentSublistSubrecord({
                                sublistId: 'addressbook',
                                fieldId: 'addressbookaddress'
                            });
                            let direccion = items[i].addressee + ' ' + items[i].addr1 + ' Guayaquil' + ' Ecuador'
                            dire.setValue({  fieldId: 'addr1', value: items[i].addr1 ,ignoreFieldChange:true}); //* //REQUEST
                            dire.setValue({  fieldId: 'addressee', value: items[i].addressee ,ignoreFieldChange:true}); //* //REQUEST
                            //dire.setValue({  fieldId: 'country', value: items[i].country ,ignoreFieldChange:true}); //* //REQUEST
                            dire.setValue({  fieldId: 'custrecord_ec_provincia', value: busquedaprovincia ,ignoreFieldChange:false}); //* //REQUEST
                            dire.setValue({  fieldId: 'custrecord_ec_canton', value: busquedacanton ,ignoreFieldChange:false}); //* //REQUEST
                            dire.setValue({  fieldId: 'custrecord_ec_parroquia', value: busquedaparroquia ,ignoreFieldChange:false}); //* //REQUEST
                            dire.setValue({  fieldId: 'custrecord_ht_direccion_tipo', value: busquedatipodireccion ,ignoreFieldChange:true}); //* //REQUEST
                            dire.setValue({  fieldId: 'addressbookaddress_text', value: direccion ,ignoreFieldChange:true}); //* //REQUEST
                            dire.setValue({  fieldId: 'custrecord_direccion_zonaciudadela', value: items[i].custrecord_direccion_zonaciudadela ,ignoreFieldChange:true}); //* //REQUEST
                            objRecord.commitLine({ sublistId: 'addressbook' });
                        }
                        //MAIL
                        itemsMail = context.correo;
                        //recmachcustrecord_ht_da_enlace - recmachcustrecord_ht_ce_enlace - recmachcustrecord_psg_ei_email_recipient_cust
                        //   const itemLineEmail = objRecord.selectNewLine({ sublistId: 'recmachcustrecord_ht_da_enlace' });
                        for (let i in itemsMail) {
                        //     let busquedatipomail= ConsultaGeneral(itemsMail[i].tipo ,"customlist_ht_email_tipoemail" ,"TMAIL");
                        //     //log.debug('TipoMail.........', busquedatipomail);
                            if (itemsMail[i].principal){
                                objRecord.setValue({ fieldId: 'email',  value: itemsMail[i].email  });
                            }else{
                                objRecord.setValue({ fieldId: 'altemail',  value: itemsMail[i].email  });
                            }

                        //     //itemLineEmail.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_ce_enlace', fieldId: 'custrecord_ht_ce_enlace', value: recordId}); //* //REQUEST
                        //     //itemLineEmail.setCurrentSublistValue({ sublistId: 'recmachcustrecord_psg_ei_email_recipient_cust', fieldId: 'Contact', value: 12}); //* //REQUEST
                        //     //note
                        //     itemLineEmail.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_da_enlace',fieldId: 'custrecord_ht_email_email', value: itemsMail[i].email}); //* //REQUEST
                        //     itemLineEmail.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_da_enlace',fieldId: 'custrecord_ht_email_emailprincipal', value: itemsMail[i].principal}); //* //REQUEST
                        //     itemLineEmail.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_da_enlace',fieldId: 'custrecord_ht_email_tipoemail', value: busquedatipomail}); //* //REQUEST
                        //     objReobjRecordMailcord.commitLine({ sublistId: 'recmachcustrecord_ht_da_enlace' });
                        }          
                        //telefono
                        itemsTelefono = context.telefono;
                        // let objRecordTelefono = record.create({ type: "customrecord_ht_registro_telefono", isDynamic: true });
                        log.debug('items....Telefono.....', itemsTelefono);
                        const itemLineTelefono = objRecord.selectNewLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                        for (let i in itemsTelefono) {
                            let busquedatipotelefono= ConsultaGeneral(itemsTelefono[i].tipo ,"customrecordht_registro_tipo_telefono" ,"TTEL", subsidiaria);
                            //log.debug('TipoTelefono.........', busquedatipotelefono);
                            if (itemsTelefono[i].principal){
                                objRecord.setValue({ fieldId: 'phone',  value: itemsTelefono[i].telefono  });
                                objRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                                objRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                            } else {
                                objRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                                objRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                            }  
                            // if ( itemsTelefono[i].telefono.length<=9){
                            //     objRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                            // }  
                            // if ( itemsTelefono[i].telefono.length==10){
                            //     objRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                            // }  
                            // itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_lbl_entidad_telefono', value: recordId}); //* //REQUEST
                            itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_list_tipo_telefono', value: busquedatipotelefono}); //* //REQUEST
                            itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_txt_principal', value: itemsTelefono[i].principal}); //* //REQUEST
                            itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_txt_telefono', value: itemsTelefono[i].telefono}); //* //REQUEST
                            objRecord.commitLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                        }  
                        //log.debug('Result.......', objRecord);
                        //respuesta=objRecord;
                        //objRecord.setValue({ fieldId: 'companyname', value: context.companyname});
                        objRecord.setValue({ fieldId: 'isperson', value: isperson, ignoreFieldChange: true });
                        if (isperson == "T") {
                            altname = primernombre + ' ' + segundonombre + ' ' + primerapellido + ' ' + segundoapellido;
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_primernombre', value: primernombre });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_segundonombre', value: segundonombre });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_apellidopaterno', value: primerapellido });
                            objRecord.setValue({ fieldId: 'custentity_ht_cl_apellidomaterno', value: segundoapellido  });
                            objRecord.setValue({ fieldId: 'lastname', value: primerapellido + ' ' + segundoapellido });
                            objRecord.setValue({ fieldId: 'firstname', value: primernombre + ' ' + segundonombre   });
                            objRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || ""  });
                            objRecord.setValue({ fieldId: 'companyname', value: altname?.toUpperCase() || ""  });
                        } else {
                       //     //log.debug('items....company.....', context.companyname);
                            altname = context.companyname.replace(',', ' ') ;
                            objRecord.setValue({ fieldId: 'companyname', value: context.companyname.replace(',', ' ') });
                            objRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || ""  });
                            objRecord.setValue({ fieldId: 'firstname', value: context.companyname.replace(',', ' ')  });
                        }
                        let recordId = objRecord.save({ ignoreMandatoryFields: false });
                        //MAIL
                        log.debug('items....mail.....', itemsMail);
                        for (let i in itemsMail) {
                            let busquedatipomail= ConsultaGeneral(itemsMail[i].tipo ,"customlist_ht_email_tipoemail" ,"TMAIL", subsidiaria);
                            let objRecordMail = record.create({ type: 'customrecord_ht_record_correoelectronico', isDynamic: true });                
                            objRecordMail.setValue({ fieldId: 'custrecord_ht_email_subsidiaria', value: subsidiaria});   
                            objRecordMail.setValue({ fieldId: 'custrecord_ht_email_email', value: itemsMail[i].email}); //* //REQUEST
                            objRecordMail.setValue({ fieldId: 'custrecord_ht_email_emailprincipal', value: itemsMail[i].principal}); //* //REQUEST
                            objRecordMail.setValue({ fieldId: 'custrecord_ht_email_tipoemail', value: busquedatipomail}); //* //REQUEST
                            objRecordMail.setValue({fieldId: 'custrecord_ht_ce_enlace', value: recordId});                 
                            objRecordMail.save({ ignoreMandatoryFields: false });
                            //var recordmail = objRecordMail.save({ ignoreMandatoryFields: false });
                            //log.debug('items....mail..222...', recordmail);
                        } 
                        //     log.debug('Result', recordId);
                        respuesta = { id: recordId, mensaje: "Grabado.........."};
                        break;
                    // TODO: Actualizar
                    case ACTUALIZAR:
                        let openRecord = record.load({ type: record.Type.CUSTOMER, id: context.id , isDynamic: true });
                        openRecord.setValue({ fieldId: 'isperson', value: isperson, ignoreFieldChange: true });
                        if (isperson == "T") {
                             //altname = primernombre + ' ' + segundonombre + ' ' + primerapellido + ' ' + segundoapellido;
                             //openRecord.setValue({ fieldId: 'custentity_ht_cl_primernombre', value: primernombre });
                             //openRecord.setValue({ fieldId: 'custentity_ht_cl_segundonombre', value: segundonombre });
                             //openRecord.setValue({ fieldId: 'custentity_ht_cl_apellidopaterno', value: primerapellido });
                             //openRecord.setValue({ fieldId: 'custentity_ht_cl_apellidomaterno', value: segundoapellido  });
                             //openRecord.setValue({ fieldId: 'lastname', value: primerapellido + ' ' + segundoapellido });
                             //openRecord.setValue({ fieldId: 'firstname', value: primernombre + ' ' + segundonombre   });
                             //openRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || ""  });
                             //openRecord.setValue({ fieldId: 'companyname', value: altname?.toUpperCase() || ""});
                        } else {
                             //altname = primernombre;
                             //openRecord.setValue({ fieldId: 'companyname', value: context.companyname });
                             //openRecord.setValue({ fieldId: 'altname', value: altname?.toUpperCase() || ""});
                             //openRecord.setValue({ fieldId: 'firstname', value: context.companyname  });
                        }
                        //openRecord.setValue({ fieldId: 'entitystatus', value: context.entitystatus  });
                        openRecord.setValue({ fieldId: 'category', value: context.category  });
                        //openRecord.setValue({ fieldId: 'salesrep', value: context.salesrep  });
                        //openRecord.setValue({ fieldId: 'subsidiary', value: context.subsidiary  });
                        openRecord.setValue({ fieldId: 'custentity_ht_cl_oficinacliente', value: busquedaoficina });
                        //openRecord.setValue({ fieldId: 'custentity_ec_document_type', value: busquedadocumento});
                        //openRecord.setValue({ fieldId: 'vatregnumber', value: context. vatregnumber });
                        openRecord.setValue({ fieldId: 'custentity_ts_ec_tipo_persona', value: context.tipo_persona  });
                        openRecord.setValue({ fieldId: 'custentityts_ec_pais_entidad', value: busquedapais  }); 
                        openRecord.setValue({ fieldId: 'receivablesaccount', value: context.cxcobrar  });  
                        //--openRecord.setValue({ fieldId: 'custentity_ht_cleconc', value: busquedaconcesionario  }); 
                        //log.debug("Actualizar fin", idOT);
                        //bloque direcciones
                        items = context.addressbook;
                        //log.debug('items....direc.....', items);
                        // const itemLine = objRecord.selectNewLine({ sublistId: 'addressbook' });
                        for (let i in items) {
                            let busquedatipodireccion= ConsultaGeneral(items[i].custrecord_ht_direccion_tipo ,"customlist_ht_tipodireccion" ,"TDIR", subsidiaria);
                            //log.debug('TipoDireccion.........', busquedatipodireccion);
                            let busquedaprovincia= ConsultaGeneral(items[i].custrecord_ec_provincia ,"CUSTOMRECORD_EC_RECORD_PROVINCIA" ,"PROV", subsidiaria);
                            //log.debug('Provincia.........', busquedaprovincia);
                            let valorcanton  = items[i].custrecord_ec_canton+';'+busquedaprovincia;
                            let busquedacanton= ConsultaGeneral(valorcanton ,"CUSTOMRECORD_EC_RECORD_CANTON" ,"CANT", subsidiaria);
                            //log.debug('Canton.........', busquedacanton);
                            let valorparroquia = items[i].custrecord_ec_parroquia+';'+busquedacanton+';'+items[i].custrecord_ec_provincia;
                            let busquedaparroquia= ConsultaGeneral(valorparroquia ,"CUSTOMRECORD_EC_RECORD_PARROQUIA" ,"PARR", subsidiaria);
                            //log.debug('Parroquia.........', busquedaparroquia);
                            let c = obtenerDireccionesParaEntidad(context.id, busquedatipodireccion,items[i].addr1, subsidiaria)
                            log.debug({ title: "Direcc", details: c });
                            if (c.length>0){
                                //log.debug({ title: "Direcciones........", details: c[0].recordowner });                               
                            }else {
                                //guardar nueva direccion
                                log.debug({ title: "nueva Direcciones........" });
                                /*Ajuste para el codigo del script */
                                openRecord.setCurrentSublistValue({
                                    sublistId: 'addressbook',
                                    fieldId: 'defaultshipping',
                                    value: true
                                });                   
                                openRecord.setCurrentSublistValue({
                                    sublistId: 'addressbook',
                                    fieldId: 'defaultbilling',
                                    value: true
                                });
                                openRecord.setCurrentSublistValue({
                                    sublistId: 'addressbook',
                                    fieldId: 'label',
                                    value: items[i].addr1
                                });

                                let dire =  openRecord.getCurrentSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress'
                                });
                                let direccion = items[i].addressee + ' ' + items[i].addr1 + ' Guayaquil' + ' Ecuador'
                                dire.setValue({  fieldId: 'addr1', value: items[i].addr1 ,ignoreFieldChange:true}); //* //REQUEST
                                dire.setValue({  fieldId: 'addressee', value: items[i].addressee ,ignoreFieldChange:true}); //* //REQUEST
                                //dire.setValue({  fieldId: 'country', value: items[i].country ,ignoreFieldChange:true}); //* //REQUEST
                                dire.setValue({  fieldId: 'custrecord_ec_provincia', value: busquedaprovincia ,ignoreFieldChange:false}); //* //REQUEST
                                dire.setValue({  fieldId: 'custrecord_ec_canton', value: busquedacanton ,ignoreFieldChange:false}); //* //REQUEST
                                dire.setValue({  fieldId: 'custrecord_ec_parroquia', value: busquedaparroquia ,ignoreFieldChange:false}); //* //REQUEST
                                dire.setValue({  fieldId: 'custrecord_ht_direccion_tipo', value: busquedatipodireccion ,ignoreFieldChange:true}); //* //REQUEST
                                dire.setValue({  fieldId: 'addressbookaddress_text', value: direccion ,ignoreFieldChange:true}); //* //REQUEST
                                dire.setValue({  fieldId: 'custrecord_direccion_zonaciudadela', value: items[i].custrecord_direccion_zonaciudadela ,ignoreFieldChange:true}); //* //REQUEST
                                openRecord.commitLine({ sublistId: 'addressbook' });
                            }                         
                        }
                         //MAIL
                        itemsMail = context.correo;
                        for (let i in itemsMail) {
                            if (itemsMail[i].principal){
                                openRecord.setValue({ fieldId: 'email',  value: itemsMail[i].email  });
                            } else {
                                openRecord.setValue({ fieldId: 'altemail',  value: itemsMail[i].email  });
                            }
                        }          
                        //telefono
                        itemsTelefono = context.telefono;
                        //log.debug('items....Telefono.....', itemsTelefono);
                        for (let i in itemsTelefono) {
                             let busquedatipotelefono= ConsultaGeneral(itemsTelefono[i].tipo ,"customrecordht_registro_tipo_telefono" ,"TTEL", subsidiaria);
                            //log.debug('TipoTelefono.........', busquedatipotelefono);
                            if (itemsTelefono[i].principal){
                                //homephone
                                openRecord.setValue({ fieldId: 'phone',  value: itemsTelefono[i].telefono  });
                                openRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                                openRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                            } else {
                                openRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                                openRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                            }  
                            // if ( itemsTelefono[i].telefono.length<=9){
                            //     openRecord.setValue({ fieldId: 'homephone',  value: itemsTelefono[i].telefono  });
                            // }  
                            // if ( itemsTelefono[i].telefono.length==10){
                            //     openRecord.setValue({ fieldId: 'mobilephone',  value: itemsTelefono[i].telefono  });
                            // }  
                            let b = obtenerTelefonosParaEntidad(context.id, busquedatipotelefono, itemsTelefono[i].telefono, subsidiaria )
                            log.debug({ title: "Telefonos", details: b });
                            if (b.length>0){
                                //log.debug({ title: "Telefonos........", details: b[0].id });
                            } else  {
                                log.debug({ title: "nuevo Telefonos........" });
                                const itemLineTelefono = openRecord.selectNewLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                                itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_list_tipo_telefono', value: busquedatipotelefono}); //* //REQUEST
                                itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_txt_principal', value: itemsTelefono[i].principal}); //* //REQUEST
                                itemLineTelefono.setCurrentSublistValue({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'custrecord_ht_campo_txt_telefono', value: itemsTelefono[i].telefono}); //* //REQUEST
                                openRecord.commitLine({ sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono' });
                            }
                        }  
                        let clienteId = openRecord.save();  
                        //MAIL
                        //log.debug('items....Mail.....', itemsMail);
                        for (let i in itemsMail) {
                            let busquedatipomail= ConsultaGeneral(itemsMail[i].tipo ,"customlist_ht_email_tipoemail" ,"TMAIL", subsidiaria);
                            let a = obtenerEmailPrincipal(context.id, busquedatipomail, itemsMail[i].email, subsidiaria)
                            log.debug({ title: "Email Principal", details: a });
                            if (a.length>0){
                                //log.debug({ title: "Email........", details: a[0].id });                             
                            } else {
                                //guardar nueva direccion
                                log.debug({ title: "nueva Email........" });
                                let objRecordMail = record.create({ type: 'customrecord_ht_record_correoelectronico', isDynamic: true });
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_subsidiaria', value: subsidiaria});                                             
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_email', value: itemsMail[i].email}); //* //REQUEST
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_emailprincipal', value: itemsMail[i].principal}); //* //REQUEST
                                objRecordMail.setValue({ fieldId: 'custrecord_ht_email_tipoemail', value: busquedatipomail}); //* //REQUEST
                                objRecordMail.setValue({fieldId: 'custrecord_ht_ce_enlace', value: context.id});
                                objRecordMail.save({ ignoreMandatoryFields: false });
                            } 
                        } 
                       
                        // //direccion
                        // for (let i in items) {
                        //     let busquedatipodireccion= ConsultaGeneral(items[i].custrecord_ht_direccion_tipo ,"customlist_ht_tipodireccion" ,"TDIR");
                        //     //log.debug('TipoDireccion.........', busquedatipodireccion);
                        //     let busquedaprovincia= ConsultaGeneral(items[i].custrecord_ec_provincia ,"CUSTOMRECORD_EC_RECORD_PROVINCIA" ,"PROV");
                        //     //log.debug('Provincia.........', busquedaprovincia);
                        //     let valorcanton  = items[i].custrecord_ec_canton+';'+busquedaprovincia;
                        //     let busquedacanton= ConsultaGeneral(valorcanton ,"CUSTOMRECORD_EC_RECORD_CANTON" ,"CANT");
                        //     //log.debug('Canton.........', busquedacanton);
                        //     let valorparroquia = items[i].custrecord_ec_parroquia+';'+busquedacanton+';'+items[i].custrecord_ec_provincia;
                        //     let busquedaparroquia= ConsultaGeneral(valorparroquia ,"CUSTOMRECORD_EC_RECORD_PARROQUIA" ,"PARR");
                        //     //log.debug('Parroquia.........', busquedaparroquia);
                        //     log.debug('items....direc.....', items);
                        //     let c = obtenerDireccionesParaEntidad(context.id, busquedatipodireccion,items[i].addr1)
                        //     log.debug({ title: "Direcciones........", details: c });
                        //     if (c.length>0){
                        //         //log.debug({ title: "Direcciones........", details: c[0].recordowner });
                        //         //let openRecord = record.load({ type: record.Type.CUSTOMER, id: context.id , isDynamic: true });
                        //         let customerRecordDirec = record.load({
                        //             type: 'customer',
                        //             id: context.id
                        //         });
                        //         let subrecordDirec = customerRecordDirec.getSublistSubrecord({
                        //             sublistId: 'addressbook',
                        //             fieldId: 'addressbookaddress',
                        //             line: i
                        //         });
                        //         if (subrecordDirec.getValue({ fieldId: 'id' }) == c[0].recordowner) {
                        //             let direccion = items[i].addressee + ' ' + items[i].addr1 + ' Guayaquil' + ' Ecuador'
                        //             //  log.debug('Dirección encontrada565465456', `Dirección ${addressbookId} del cliente ${customerId} encontrada.`);
                        //             subrecordDirec.setValue({
                        //                 fieldId: 'addr1',
                        //                 value: items[i].addr1
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'addressee',
                        //                 value: items[i].addressee
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'custrecord_ec_provincia',
                        //                 value: busquedaprovincia
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'custrecord_ec_canton',
                        //                 value: busquedacanton
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'custrecord_ec_parroquia',
                        //                 value: busquedaparroquia
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'custrecord_ht_direccion_tipo',
                        //                 value: busquedatipodireccion
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'addressbookaddress_text',
                        //                 value: direccion
                        //             });

                        //             subrecordDirec.setValue({
                        //                 fieldId: 'custrecord_direccion_zonaciudadela',
                        //                 value: items[i].custrecord_direccion_zonaciudadela
                        //             });                       
                        //         }
                        //         customerRecordDirec.save();
                        //         //log.debug({ title: "final........", details: i });   
                        //     }
                        // }   
                    
                        // //telefono
                        // itemsTelefono = context.telefono;
                        // for (let i in itemsTelefono) {
                        //      let busquedatipotelefono= ConsultaGeneral(itemsTelefono[i].tipo ,"customrecordht_registro_tipo_telefono" ,"TTEL");
                        //     //log.debug('TipoTelefono.........', busquedatipotelefono);                          
                        //     let b = obtenerTelefonosParaEntidad(context.id, busquedatipotelefono,itemsTelefono[i].telefono)
                        //     log.debug({ title: "Telefonos", details: b });
                        //     if (b.length>0){
                        //             var valor = b[0].id;
                        //             // //let openRecord = record.load({ type: record.Type.CUSTOMER, id: context.id , isDynamic: true });
                        //             let openRecordTelef = record.load({ type: 'customrecord_ht_registro_telefono' , id: valor, isDynamic: true });
                        //             //    // openRecordTelef.setValue({  sublistId: 'recmachcustrecord_ht_campo_lbl_entidad_telefono', fieldId: 'id', value: valor}); //* //REQUEST
                        //             openRecordTelef.setValue({   fieldId: 'custrecord_ht_campo_list_tipo_telefono', value: busquedatipotelefono}); //* //REQUEST
                        //             openRecordTelef.setValue({   fieldId: 'custrecord_ht_campo_txt_principal', value: itemsTelefono[i].principal}); //* //REQUEST
                        //             openRecordTelef.setValue({ fieldId: 'custrecord_ht_campo_txt_telefono', value: itemsTelefono[i].telefono}); //* //REQUEST
                        //             openRecordTelef.save();
                        //     }                       
                        // }                          
                        // //email
                        // for (let i in itemsMail) {
                        //     let busquedatipomail= ConsultaGeneral(itemsMail[i].tipo ,"customlist_ht_email_tipoemail" ,"TMAIL");                
                        //     let a = obtenerEmailPrincipal(context.id,busquedatipomail,itemsMail[i].email)
                        //     log.debug({ title: "Email Principal", details: a });
                        //     if (a.length>0){
                        //         // log.debug({ title: "Email........", details: a[0].id });
                        //         var valor = a[0].id;
                        //         let openRecordMail = record.load({ type: 'customrecord_ht_record_correoelectronico' , id: valor, isDynamic: true });
                        //         openRecordMail.setValue({   fieldId: 'custrecord_ht_email_email', value: itemsMail[i].email}); //* //REQUEST
                        //         openRecordMail.setValue({   fieldId: 'custrecord_ht_email_emailprincipal', value: itemsMail[i].principal}); //* //REQUEST
                        //         openRecordMail.setValue({   fieldId: 'custrecord_ht_email_tipoemail', value: busquedatipomail}); //* //REQUEST
                        //         openRecordMail.save();
                        //     } 
                        // } 
                       respuesta = { id: clienteId, mensaje: "Modificado.........."};
                       //respuesta = { id: 0, mensaje: "Modificado.........."};
                        break;
                    // TODO: Default
                    default:
                        respuesta = { id: 0, mensaje: "Verifique la accion" };
                    break;
               }       
            return JSON.stringify({ results: respuesta });
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _put(context) {
        try {
            //REQUEST
            // let idcustomer = context.idcustomer;
            // let companyname = context.companyname;
            // let phone = context.phone;

            // //UPDATE RECORD
            // let objRecord = record.load({ type: record.Type.CUSTOMER, id: idcustomer, isDynamic: true });
            // objRecord.setValue({ fieldId: 'companyname', value: companyname, ignoreFieldChange: true });
            // objRecord.setValue({ fieldId: 'phone', value: phone, ignoreFieldChange: true });
            // let recordId = objRecord.save({ enableSourcing: false, ignoreMandatoryFields: false });
            
            // return {
            //     id: recordId,
            //     success: 1
            // }
        } catch (error) {
            log.error('Error', error);
        }
    }


    function _delete(context) {
        try {
            let idcustomer = context.idcustomer;
            record.delete({ type: record.Type.CUSTOMER, id: idcustomer });
            return 'Registro Eliminado';
        } catch (error) {
            log.error('Error', error);
        }
    }


    function esNumeroString(valor) {
        return !isNaN(valor) && !isNaN(parseFloat(valor));
    }


    const ConsultaGeneral = (valor, tabla, tipo, subsidiaria) => {
        try {
            // valor.split(";")
            // var valor2="";
            // if (valor?.includes(";")  || false)
            // {
            //     let array = valor.split(";")
            //     valor = array[0].toUpperCase();
            //     valor2 = array[1].toUpperCase();
            // }  
            var codigocanton="";
            var provincia="";
            var codigoprovincia="";
            if (tipo=='PARR'){
                valor.split(";")
                if (valor?.includes(";")  || false)
                {
                    let array = valor.split(";")
                    valor = array[0].toUpperCase();
                    codigocanton = array[1].toUpperCase();
                    provincia= array[2].toUpperCase();
                }  
            }
            if (tipo=='CANT'){
                valor.split(";")
                if (valor?.includes(";")  || false)
                {
                    let array = valor.split(";")
                    valor = array[0].toUpperCase();
                    codigoprovincia = array[1].toUpperCase();
                }  
            }
            valor=valor.toUpperCase();
            filtersAux = []
            let bandera=false;
            if (tipo=='CANT' || tipo=="PROV" || tipo=="PARR"){
                valor = capitalizarPrimeraLetra(valor);
                //log.debug(tipo, valor);
            }           
            if ( esNumeroString(valor) ){
                filtersAux = [["isinactive","anyof","F"], "AND",
                              ["internalid", "anyof", valor]]
            } else {
                if (tipo=='TDOC'){
                    bandera=true;
                    filtersAux = [["isinactive","is",false], "AND",
                                ["name", "is", valor]]
                } else if (tipo=='CANT'){
                    bandera=true;
                    filtersAux = [["isinactive","anyof","F"], "AND",
                                  ["name", "is", valor] , "AND",
                                  ["custrecord_ec_cc_nombreprovincia", "is", codigoprovincia] 
                                ]
                } else {
                    bandera=true;
                    filtersAux = [["isinactive","anyof","F"], "AND",
                                ["name", "is", valor]]
                }
            }      
            // if (tipo=='CANT' ){
            //     log.debug("cant.......valor.......", valor);
            //    log.debug("cant........prov......", codigoprovincia);   
            // }  
            
            const busquedaSearchObj = search.create({
            type: tabla,
            filters: filtersAux,
            columns: [  { name: "internalid" },
                        { name: "name" },  ],
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
            //log.debug(tabla, respuesta);          
             if (theCount == 0){
                //valores se envian por defecto
                 if (tipo=="PAIS" ){
                     bandera= false;     
                 }               
                 respuesta.push({
                     idInternal: 0,
                     descripcion: "",
                 });  
             }             
            // if (tipo=="COLF" || tipo=="COLM" || tipo=="COLC"){
            //     //log.debug(tabla, respuesta[0]);
            //     if (( respuesta[0]?.idInternal || "0")=="0"){
            //         bandera=true
            //     }  else {
            //         bandera=false
            //     } 
            // } 
            if ( bandera ){
                //if (theCount != 1) {
                if (theCount == 0) {
                     //log.debug(tabla, "Nuevo Registro.....");
                    respuesta= [];
                    var creardatos = record.create({ type: tabla });
                    creardatos.setValue({
                        fieldId: "name",
                        value: valor,
                    }); 
                    switch (tipo) {
                        //TIPO DE DOCUMENTO
                        case "TDOC":  
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cod_doc_type",
                                value: "00",
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ec_country_doc_type",
                                value: "63",
                            }); 
                            //bandera=true;
                            break;
                        //TIPO DIRECCION
                         case "TDIR":
                            break;
                        //TIPO MAIL
                         case "TMAIL":
                            break;
                        //TIPO TELEFONO
                         case "TTEL":
                            creardatos.setValue({
                                fieldId: "custrecord_ht_codigo_telefono",
                                value: "00",
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ht_descripcion_tipo_telefono",
                                value: valor,
                            }); 
                            break;
                        //PARROQUIA
                         case "PARR":  
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_nombrecanton",
                                value: codigocanton,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_codigoparroquia",
                                value: "00",
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cp_nombreprovincia",
                                value: provincia,
                            }); 
                            break;
                        //PROVINCIA
                         case "PROV":  
                             break;
                        //CANTON
                        case "CANT": 
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cc_nombreprovincia",
                                value: codigoprovincia,
                            }); 
                            creardatos.setValue({
                                fieldId: "custrecord_ec_cc_codigocanton",
                                value: "0",
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
            return (respuesta[0]?.idInternal || "0");
        } catch (e) {
            log.error(tabla, e);
            return 0;
        }
    };


    function capitalizarPrimeraLetra(cadena) {
        try {
            return cadena.split(' ').map(palabra => {
                return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
            }).join(' ');
        } catch (error) {
            console.error("Error al capitalizar la cadena:", error);
            return cadena; // Devuelve la cadena original en caso de error
        }
    }


    // function ConsultaCanal( TipoCanal, Criterio, tabla){
    //     try{
            
    //         let Resultado = [];
    //         let Canal = '';
    //         var detalle="";
    //         var identificacion="";
    //         Criterio = Criterio.toUpperCase();
    //         switch (TipoCanal) {
    //             case 1: Canal = "Aseguradora"; break;
    //             case 2: Canal = "Concesionario"; break;
    //             case 3: Canal = "Financiera"; break;
    //             default: break;
    //         }

    //         let Busqueda = search.create({
    //             type: tabla,
    //             filters: [
    //                 ["custrecord_ht_cd_tipocanal","is",TipoCanal],"AND",
    //                 ["isinactive","is","F"]
    //             ],
    //             columns: ["internalid","custrecord_ht_cd_ruccanaldistribucion","custrecord_ht_cd_nombre","name"]
    //         });

    //         if (Criterio != 0 && Criterio != '') {
    //             Criterio.split(";")
    //             if (Criterio?.includes(";")  || false)
    //             {
    //                 let array = Criterio.split(";")
    //                 identificacion = array[0].toUpperCase();
    //                 detalle = array[1].toUpperCase();
    //             }  
    //             //log.debug(tabla, identificacion);
    //             //log.debug(tabla, detalle);
    //             Busqueda.filters.push(search.createFilter({
    //                 name: 'custrecord_ht_cd_nombre', 
    //                 operator: search.Operator.CONTAINS,
    //                 values: detalle
    //                 })); 
    //         }

    //         let ResConsulta = Busqueda.run().getRange({ start: 0, end: 1 });;

           
            
    //         for (let i in ResConsulta) {
    //             Resultado.push({
    //                 Id: ResConsulta[i].getValue("internalid"),
    //                 Canal: Canal,
    //                 RucCanal: ResConsulta[i].getValue("custrecord_ht_cd_ruccanaldistribucion"),
    //                 DescripcionCanal: ResConsulta[i].getValue("custrecord_ht_cd_nombre"),
    //                 //DescripcionCanal: ResConsulta[i].getValue("name"),
    //                 //RucRepresentante: ResConsulta[i].getValue("custrecord_ht_cd_rucrepresentante"),
    //                 //Representante: ResConsulta[i].getValue("custrecord_ht_cd_representante")
    //             });
    //         }

    //         if (( Resultado[0]?.Id || "0")=="0")
    //         {
    //             Resultado = [];
    //             //log.debug(tabla, "Resultado......................");
    //             var creardatos = record.create({ type: tabla });
    //             creardatos.setValue({
    //                 fieldId: "name",
    //                 value: detalle,
    //             });
    //             creardatos.setValue({
    //                 fieldId: "custrecord_ht_cd_nombre",
    //                 value: detalle,
    //             }); 
    //             creardatos.setValue({
    //                 fieldId: "custrecord_ht_cd_tipocanal",
    //                 value: TipoCanal,
    //             }); 
    //             creardatos.setValue({
    //                 fieldId: "custrecord_ht_cd_subsidiaria",
    //                 value: "2",
    //             }); 
                
    //             creardatos.setValue({
    //                 fieldId: "custrecord_ht_cd_ruccanaldistribucion",
    //                 value: identificacion,
    //             });
                
    //             indice = creardatos.save();
    //             //log.debug(tabla, indice);

    //              Resultado.push({
    //                 Id: indice,
    //                 Canal: Canal,
    //                 RucCanal: identificacion,
    //                 DescripcionCanal: detalle,
    //              });   
    //              log.debug("customrecord_ht_record_canaldistribucion", Resultado); 
    //         }  
    //         //return Resultado;
    //         return Resultado[0]?.Id|| "0";
    //     }catch (error) {
    //         log.error('error', error);
    //         return 'id:400, No se encontraron resultados. Error Controlado. (ConsultaCanal)';
    //     }
    // }


    const obtenerEmailPrincipal = (entityId, tipo, email, subsidiaria) => {
    try {
        const emailSearch = search.create({
            type: 'customrecord_ht_record_correoelectronico', 
            filters: [
                ['custrecord_ht_ce_enlace', 'is', entityId] ,"AND",
                ['custrecord_ht_email_tipoemail', 'is', tipo]  ,"AND",
                ['custrecord_ht_email_email', 'is', email] 
            ],
            columns: [
                'internalid', 
                'custrecord_ht_email_emailprincipal', 
                'custrecord_ht_email_email'
            ]
        });
        const searchResult = emailSearch.run().getRange({ start: 0, end: 10 });
        const resultados = searchResult.map(result => ({
            id: result.getValue('internalid'),
            emailPrincipal: result.getValue('custrecord_ht_email_emailprincipal'),
            email: result.getValue('custrecord_ht_email_email')
        }));
        return resultados;
    } catch (e) {
        log.error('Error en obtenerEmailPrincipal', e);
        return [];
    }
    };


    const obtenerTelefonosParaEntidad = (entityId, tipo, telefono, subsidiaria) => {
        try {
            const telefonoSearch = search.create({
            type: 'customrecord_ht_registro_telefono', 
            filters: [
                ['custrecord_ht_campo_lbl_entidad_telefono', 'is', entityId] ,"AND",
                ['custrecord_ht_campo_list_tipo_telefono', 'is', tipo] ,"AND",
                ['custrecord_ht_campo_txt_telefono', 'is', telefono] 
            ],
            columns: [
                'internalid', // Seleccionar el ID interno
                'custrecord_ht_campo_txt_principal', // Seleccionar el campo de teléfono principal
                'custrecord_ht_campo_txt_telefono' // Seleccionar el campo de teléfono
            ]
            });
            const searchResult = telefonoSearch.run().getRange({ start: 0, end: 10 });
            return searchResult.map(result => ({
            id: result.getValue('internalid'),
            telefonoPrincipal: result.getValue('custrecord_ht_campo_txt_principal'),
            telefono: result.getValue('custrecord_ht_campo_txt_telefono')
            }));
        } catch (e) {
            log.error('Error en obtenerTelefonosParaEntidad', e);
            return [];
        }
    };


    const obtenerDireccionesParaEntidad = (entityId, tipo, direccion, subsidiaria) => {
        try {
            //const sql = 'select recordowner from customerAddressbook cus, EntityAddress ent where  cus.entity=? and cus.addressbookaddress=ent.recordowner and custrecord_ht_direccion_tipo=?';
            //const params = [entityId, tipo];
            const sql = 'select recordowner, addr1, addressee, addrtext from customerAddressbook cus, EntityAddress ent where  cus.entity=? and cus.addressbookaddress=ent.recordowner and custrecord_ht_direccion_tipo=? and addr1=?';
            const params = [entityId, tipo, direccion];
            const resultSet = query.runSuiteQL({ query: sql, params: params });
            return resultSet.asMappedResults();
        } catch (e) {
            log.error('Error en obtenerDireccionesParaEntidad', e);
            return [];
        }
    };


    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
