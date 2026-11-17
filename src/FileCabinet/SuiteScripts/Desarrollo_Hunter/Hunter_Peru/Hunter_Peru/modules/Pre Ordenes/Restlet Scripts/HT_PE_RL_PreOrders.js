/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/log', 'N/email', 'N/search', 'N/runtime'],  // ← se añadió N/runtime
function (record,     error,     log,     email,     search,     runtime) {

  /* ------------------------------------------------------------------ */
  /* -------------------------  VALIDACIONES  ------------------------- */
  /* ------------------------------------------------------------------ */
  function requeridos (data, lista) {
    lista.forEach(function (f) {
      if (!data.hasOwnProperty(f) || data[f] === '' || data[f] === null) {
        throw error.create({
          name   : 'MISSING_PARAMETER',
          message: 'Debe pasar el campo obligatorio: ' + f
        });
      }
    });
  }
  
  function normalizaDetalle (data) {
    if (!data.detalle) return;
    if (typeof data.detalle === 'string') {
      try   { data.detalle = JSON.parse(data.detalle); }
      catch (e) {
        throw error.create({ name:'INVALID_DETALLE',
          message:'El campo "detalle" debe ser JSON válido.' });
      }
    }
    if (!Array.isArray(data.detalle)) {
      throw error.create({ name:'INVALID_DETALLE',
        message:'El campo "detalle" debe ser un arreglo.' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* -------------------  OBTENER DATOS DE ENTIDADES  ----------------- */
  /* ------------------------------------------------------------------ */
  function obtenerDatosCliente(clienteId) {
    log.audit({
      title: 'INICIO - Obtener datos del cliente',
      details: 'Cliente ID: ' + clienteId
    });

    try {
      var clienteRec = record.load({
        type: record.Type.CUSTOMER,
        id  : clienteId
      });
      
      var datos = {
        id          : clienteId,
        nombre      : clienteRec.getValue('altname')      || clienteRec.getValue('companyname') || 'Sin nombre',
        entityid    : clienteRec.getValue('entityid')     || '',
        documento   : clienteRec.getValue('custentity_pe_document_number') ||
                      clienteRec.getValue('vatregnumber') || '',
        tipoDocumento: clienteRec.getValue('custentity_pe_document_type') || '',
        email       : clienteRec.getValue('email')        || '',
        telefono    : clienteRec.getValue('phone')        || ''
      };

      log.audit({
        title  : 'Datos del cliente obtenidos exitosamente',
        details: JSON.stringify(datos)
      });

      return datos;
    } catch (e) {
      log.error({
        title  : 'Error obteniendo datos del cliente',
        details: 'Cliente ID: ' + clienteId + ' - Error: ' + e.message + '\nStack: ' + e.stack
      });
      return {
        id          : clienteId,
        nombre      : 'Cliente no encontrado',
        entityid    : '',
        documento   : '',
        tipoDocumento: '',
        email       : '',
        telefono    : ''
      };
    }
  }

  function obtenerDatosVendedor(vendedorId) {
    log.audit({
      title: 'INICIO - Obtener datos del vendedor',
      details: 'Vendedor ID: ' + vendedorId
    });

    try {
      var vendedorRec = record.load({
        type: 'customrecord_pe_ht_os_vendedor',
        id  : vendedorId
      });
      
      var datos = {
        id   : vendedorId,
        nombre: vendedorRec.getValue('name') || 'Sin nombre',
        ruc  : vendedorRec.getValue('custrecord_ht_pe_vd_id_concesionario') || ''
      };

      log.audit({
        title  : 'Datos del vendedor obtenidos exitosamente',
        details: JSON.stringify(datos)
      });

      return datos;
    } catch (e) {
      log.error({
        title  : 'Error obteniendo datos del vendedor',
        details: 'Vendedor ID: ' + vendedorId + ' - Error: ' + e.message + '\nStack: ' + e.stack
      });
      return {
        id   : vendedorId,
        nombre: 'Vendedor no encontrado',
        ruc  : ''
      };
    }
  }

  /* ----------- NUEVO -----------  Obtener datos del representante de ventas */
  function obtenerDatosRepresentante(representanteId) {
    if (!representanteId) {             // si viene null / undefined retornamos placeholder
      return { id: null, nombre: '-', email: '' };
    }

    log.audit({
      title  : 'INICIO - Obtener datos del representante',
      details: 'Representante ID: ' + representanteId
    });

    try {
      var empRec = record.load({
        type: record.Type.EMPLOYEE,
        id  : representanteId
      });

      var datos = {
        id    : representanteId,
        nombre: (empRec.getValue('firstname') || '') + ' ' +
                (empRec.getValue('lastname')  || ''),
        email : empRec.getValue('email') || ''
      };

      log.audit({
        title  : 'Datos del representante obtenidos',
        details: JSON.stringify(datos)
      });

      return datos;
    } catch (e) {
      log.error({
        title  : 'Error obteniendo representante',
        details: 'Representante ID: ' + representanteId + ' - ' + e.message
      });
      return { id: representanteId, nombre: 'Representante no encontrado', email: '' };
    }
  }

  /* ----------- NUEVO -----------  Buscar empleado por e-mail --------- */
  function getEmpleadoIdByEmail (emailStr) {
    if (!emailStr) return null;
    var em = String(emailStr).trim().toLowerCase();

    var res = search.create({
      type   : search.Type.EMPLOYEE,
      filters: [
        ['email','is', em],'and',
        ['isinactive','is','F']
      ],
      columns:['internalid','giveaccess']
    }).run().getRange({ start:0, end:10 });

    if (!res || !res.length) {
      log.error({ title:'Empleado no encontrado por email', details: em });
      return null;
    }
    // prioriza giveaccess = T si hay duplicados
    var elegido = res[0];
    for (var i=0;i<res.length;i++){
      var ga = res[i].getValue('giveaccess');
      if (ga === true || ga === 'T'){ elegido = res[i]; break; }
    }
    return elegido.getValue('internalid');
  }

  /* ----------- NUEVO -----------  Usuario actual --------- */
  function getCurrentEmployee(){
    var u = runtime.getCurrentUser();
    return { id: +u.id, name: u.name, role: u.role };
  }

  /* ------------------------------------------------------------------ */
  /* -------------  ENVÍO DE EMAILS (MÚLTIPLES DESTINOS)  ------------- */
  /* ------------------------------------------------------------------ */
  function enviarNotificacionesPreOrden(preOrdenId, notificationConfig, datosCompletos) {
    log.audit({
      title  : 'INICIO - Envío de notificaciones',
      details: 'Pre-orden ID: ' + preOrdenId + ' - Iniciando proceso de envío de emails'
    });

    try {
      var emailsEnviados = [];
      var emailsFallidos = [];
      
      /* ---- registro de configuración recibida ---- */
      log.audit({
        title  : 'Configuración de notificaciones recibida',
        details: JSON.stringify({
          selected_employees: notificationConfig.selected_employees ? notificationConfig.selected_employees.length : 0,
          additional_emails : notificationConfig.additional_emails  ? notificationConfig.additional_emails.length  : 0
        })
      });

      /* ---- datos completos para el correo ---- */
      log.audit({
        title  : 'Datos completos para email',
        details: JSON.stringify({
          cliente      : datosCompletos.cliente.nombre,
          representante: datosCompletos.representante.nombre,
          documento    : datosCompletos.cliente.documento
        })
      });
      
      /* ---- preparar correo ---- */
      var asunto      = 'Pre O/S: ' + preOrdenId +
                        ' ha sido generada, Cliente: ' +
                        datosCompletos.cliente.entityid + '-' +
                        datosCompletos.cliente.nombre;

      var cuerpoEmail = construirCuerpoEmail(preOrdenId, datosCompletos);
      
      log.audit({
        title  : 'Email preparado',
        details: 'Asunto: ' + asunto + '\nCuerpo preparado con ' + cuerpoEmail.length + ' caracteres'
      });
      
      /* ---- envío a empleados seleccionados ---- */
      if (notificationConfig.selected_employees && notificationConfig.selected_employees.length > 0) {
        log.audit({
          title  : 'Procesando empleados seleccionados',
          details: 'Total empleados: ' + notificationConfig.selected_employees.length
        });

        for (var i = 0; i < notificationConfig.selected_employees.length; i++) {
          var empleado = notificationConfig.selected_employees[i];
          
          log.audit({
            title  : 'Procesando empleado ' + (i + 1),
            details: 'Nombre: ' + empleado.name + ', Email: ' + empleado.email
          });

          if (empleado.email) {
            try {
              log.audit({
                title  : 'Enviando email a empleado',
                details: 'Destinatario: ' + empleado.email + ' (' + empleado.name + ')'
              });

              email.send({
                author    : -5,
                recipients: empleado.email,
                subject   : asunto,
                body      : personalizarEmailParaEmpleado(cuerpoEmail, empleado)
              });

              emailsEnviados.push(empleado.email + ' (' + empleado.name + ')');
              
              log.audit({
                title  : 'Email enviado exitosamente',
                details: 'Enviado a: ' + empleado.email + ' (' + empleado.name + ')'
              });

            } catch (e) {
              var errorMsg = empleado.email + ' (' + empleado.name + '): ' + e.message;
              emailsFallidos.push(errorMsg);
              
              log.error({
                title  : 'Error enviando email a empleado',
                details: errorMsg
              });
            }
          } else {
            log.error({
              title  : 'Empleado sin email',
              details: 'Empleado ' + empleado.name + ' no tiene email configurado'
            });
          }
        }
      } else {
        log.audit({
          title  : 'Sin empleados seleccionados',
          details: 'No hay empleados seleccionados para envío de email'
        });
      }
      
      /* ---- envío a emails adicionales ---- */
      if (notificationConfig.additional_emails && notificationConfig.additional_emails.length > 0) {
        log.audit({
          title  : 'Procesando emails adicionales',
          details: 'Total emails adicionales: ' + notificationConfig.additional_emails.length
        });

        for (var j = 0; j < notificationConfig.additional_emails.length; j++) {
          var emailAddr = notificationConfig.additional_emails[j];
          
          log.audit({
            title  : 'Procesando email adicional ' + (j + 1),
            details: 'Email: ' + emailAddr
          });

          try {
            log.audit({
              title  : 'Enviando email adicional',
              details: 'Destinatario: ' + emailAddr
            });

            email.send({
              author    : -5,
              recipients: emailAddr,
              subject   : asunto,
              body      : cuerpoEmail
            });

            emailsEnviados.push(emailAddr);
            
            log.audit({
              title  : 'Email adicional enviado exitosamente',
              details: 'Enviado a: ' + emailAddr
            });

          } catch (e) {
            var errorMsg = emailAddr + ': ' + e.message;
            emailsFallidos.push(errorMsg);
            
            log.error({
              title  : 'Error enviando email adicional',
              details: errorMsg
            });
          }
        }
      } else {
        log.audit({
          title  : 'Sin emails adicionales',
          details: 'No hay emails adicionales configurados'
        });
      }
      
      /* ---- resumen final ---- */
      log.audit({
        title  : 'RESUMEN - Emails enviados exitosamente',
        details: 'Pre-orden ' + preOrdenId + ' - Total enviados: ' + emailsEnviados.length +
                 '\nDestinatarios: ' + emailsEnviados.join(', ')
      });
      
      if (emailsFallidos.length > 0) {
        log.error({
          title  : 'RESUMEN - Errores enviando emails',
          details: 'Pre-orden ' + preOrdenId + ' - Total errores: ' + emailsFallidos.length +
                   '\nErrores: ' + emailsFallidos.join(', ')
        });
      }

      log.audit({
        title  : 'FIN - Proceso de envío completado',
        details: 'Pre-orden ' + preOrdenId +
                 ' - Exitosos: ' + emailsEnviados.length +
                 ', Fallidos: ' + emailsFallidos.length
      });

    } catch (emailError) {
      log.error({
        title  : 'ERROR GENERAL - Fallo en envío de notificaciones',
        details: 'Pre-orden ' + preOrdenId +
                 ' - Error: ' + emailError.message +
                 '\nStack: ' + emailError.stack
      });
    }
  }
  
  function construirCuerpoEmail(preOrdenId, datosCompletos) {
    var fecha = new Date();
    
    /* ---- helper pad (para ES5) ---- */
    function pad(num, size) {
      var s = num + '';
      while (s.length < size) s = '0' + s;
      return s;
    }
    
    var fechaFormateada = fecha.getFullYear() + '-' + 
                          pad(fecha.getMonth() + 1, 2) + '-' + 
                          pad(fecha.getDate(), 2) + ' ' +
                          pad(fecha.getHours(), 2)   + ':' +
                          pad(fecha.getMinutes(), 2) + ':' +
                          pad(fecha.getSeconds(), 2);
    
    /* ---- detalle de artículos ---- */
    var lineasDetalle = [];
    for (var i = 0; i < datosCompletos.detalle.length; i++) {
      var item  = datosCompletos.detalle[i];
      var linea = '  ' + (i + 1) + '. ' +
                  (item.custrecordht_pe_articulos_po_display || 'Sin descripción') + 
                  ' - Cantidad: '     + (item.custrecord_ht_pe_po_cantidad         || 0) + 
                  ' - Precio Unit.: ' + (item.custrecord_ht_pe_po_total_impuestos  || 0);
      lineasDetalle.push(linea);
    }
    
    var tipoDoc = datosCompletos.cliente.tipoDocumento === '2' ? 'DNI/RUC' : 'Documento';
    
    var cuerpo = [
      'Estimado(a): EJECUTIVO, se ha generado la siguiente PreOS-00' + preOrdenId,
      '',
      '',
      tipoDoc     + ': ' + datosCompletos.cliente.documento,
      'Cliente: '  + datosCompletos.cliente.nombre,
      /* ---- CAMBIO: se muestra el representante de ventas ---- */
      'Ejecutivo: '+ datosCompletos.representante.nombre,
      'Observacion: ' + (datosCompletos.observaciones || '.'),
      '',
      'Artículos incluidos:'
    ];
    
    for (var j = 0; j < lineasDetalle.length; j++) {
      cuerpo.push(lineasDetalle[j]);
    }
    
    cuerpo.push('');
    cuerpo.push('Fecha: ' + fechaFormateada);
    cuerpo.push('');
    cuerpo.push('Por favor, revisar la pre-orden en el sistema NetSuite.');
    cuerpo.push('');
    cuerpo.push('Saludos cordiales,');
    
    return cuerpo.join('\n');
  }
  
  function personalizarEmailParaEmpleado(cuerpoBase, empleado) {
    var saludo = 'Estimado/a ' + (empleado.firstname || '') + ' ' + (empleado.lastname || '');
    var cuerpoPersonalizado = cuerpoBase.replace('Estimado(a): EJECUTIVO', saludo);
    return cuerpoPersonalizado;
  }

  /* ------------------------------------------------------------------ */
  /* -----------------------------  POST  ----------------------------- */
  /* ------------------------------------------------------------------ */
  function post (data) {

    /* ---------- consulta simple ---------- */
    if (data.id && Object.keys(data).length === 1) {
      return record.load({ type:'customrecord_ht_pe_preordenes', id:data.id }).toJSON();
    }
    
    /* ---------- crear ---------- */
    var OBLIG = [
      'custrecord_ht_pe_po_cliente_preorden',    // Cliente
      'custrecord_ht_pe_po_vehiculo_bien',       // Vehículo o bien
      'custrecord_ht_pe_po_moneda',              // Moneda
      'custrecord_item'                          // Item principal exigido
    ];
    requeridos(data, OBLIG);
    normalizaDetalle(data);

    /* ---------- convertir representante (si viene en formato email) ---------- */
    var repIdFinal = null;
    if (data.hasOwnProperty('custrecord_ht_pe_pe_representante_ventas')) {
      var repVal = data.custrecord_ht_pe_pe_representante_ventas;
      if (repVal && typeof repVal === 'string' && repVal.indexOf('@') !== -1) {
        log.audit({
          title  : 'Convirtiendo email de representante a internalId',
          details: repVal
        });
        var newRepId = getEmpleadoIdByEmail(repVal);
        if (newRepId) {
          data.custrecord_ht_pe_pe_representante_ventas = newRepId;
          repIdFinal = newRepId;
          log.audit({
            title  : 'Conversión exitosa',
            details: 'Email ' + repVal + ' ➜ ID ' + newRepId
          });
        } else {
          log.audit({
            title  : 'Conversión fallida',
            details: 'Se mantendrá representante nulo'
          });
          data.custrecord_ht_pe_pe_representante_ventas = null;
        }
      } else if (repVal) {
        // Si vino como ID ya numérico
        repIdFinal = repVal;
      }
    }



    /* ---------- 1. Cabecera (SIN owner para forzar System Note luego) ---------- */
    var rec = record.create({ type:'customrecord_ht_pe_preordenes', isDynamic:true });
    Object.keys(data).forEach(function (f) {
      if (f === 'detalle' || f === 'notification_config' || f === 'owner') return; // ← no setear owner aquí
      try { rec.setValue({ fieldId:f, value:data[f] }); }
      catch (e) { log.error({ title:'Campo ignorado ' + f, details:e }); }
    });
    var cabId = rec.save({ enableSourcing:true, ignoreMandatoryFields:false });
    
    /* ---------- 2. Líneas ---------- */
    if (data.detalle && data.detalle.length) {
      data.detalle.forEach(function (lin, i) {
        try {
          var det = record.create({
            type      :'customrecord_ht_pe_articulos_preorders',
            isDynamic : true
          });
          det.setValue({
            fieldId:'custrecord_ht_pe_po_detalle_articulo',
            value  : cabId
          });
          Object.keys(lin).forEach(function (f) {
            if (f === 'custrecord_ht_pe_po_detalle_articulo') return;
            try { det.setValue({ fieldId:f, value:lin[f] }); }
            catch (e2) { log.error({ title:'Campo línea ' + (i + 1) + ': ' + f, details:e2 }); }
          });
          det.save({ enableSourcing:true, ignoreMandatoryFields:false });
        } catch (e) {
          log.error({ title:'Error en línea ' + (i + 1), details:e });
          record.delete({ type:'customrecord_ht_pe_preordenes', id:cabId });
          throw e;
        }
      });
    }

    /* ---------- 3. FORZAR System Note: setear Owner post-save ---------- */
    try {
      var current = getCurrentEmployee(); // usuario de ejecución
      var ownerToSet = repIdFinal || current.id; // preferimos representante; si no, usuario actual

      record.submitFields({
        type  : 'customrecord_ht_pe_preordenes',
        id    : cabId,
        values: { owner: ownerToSet }
      });
      log.audit({
        title  : 'Owner seteado post-save (System Note generado)',
        details: 'owner=' + ownerToSet
      });
    } catch (e) {
      log.error({ title:'No se pudo setear owner post-save', details:e });
      // No abortamos: el registro existe y es gestionable.
    }

    /* ---------- 4. Enviar notificaciones múltiples ---------- */
    log.audit({
      title  : 'INICIO - Proceso de notificaciones',
      details: 'Pre-orden creada con ID: ' + cabId + ' - Verificando configuración de notificaciones'
    });

    try {
      if (data.notification_config) {
        log.audit({
          title  : 'Configuración de notificaciones encontrada',
          details: JSON.stringify(data.notification_config)
        });

        var hasEmployees = data.notification_config.selected_employees && data.notification_config.selected_employees.length > 0;
        var hasEmails    = data.notification_config.additional_emails  && data.notification_config.additional_emails.length  > 0;
        
        log.audit({
          title  : 'Análisis de destinatarios',
          details: 'Tiene empleados: ' + hasEmployees + ', Tiene emails adicionales: ' + hasEmails
        });
        
        if (hasEmployees || hasEmails) {
          log.audit({
            title  : 'Obteniendo datos completos para email',
            details: 'Cliente ID: ' + data.custrecord_ht_pe_po_cliente_preorden +
                     ', Vendedor ID: ' + data.custrecord_ht_pe_po_vendedor +
                     ', Representante ID: ' + (repIdFinal || 'null')
          });

          /* ----------- se agrega representante con fallback SOLO para mostrar en correo ----------- */
          var repParaCorreo = repIdFinal || data.custrecord_ht_pe_po_vendedor;

          var datosCompletos = {
            cliente      : obtenerDatosCliente     (data.custrecord_ht_pe_po_cliente_preorden),
            vendedor     : obtenerDatosVendedor    (data.custrecord_ht_pe_po_vendedor),
            representante: obtenerDatosRepresentante(repParaCorreo),
            vehiculo     : data.custrecord_ht_pe_po_vehiculo_bien || '',
            observaciones: data.custrecord_ht_pe_observaciones   || '',
            detalle      : data.detalle || []
          };

          log.audit({
            title  : 'Datos completos obtenidos, iniciando envío',
            details: 'Procediendo al envío de notificaciones'
          });

          enviarNotificacionesPreOrden(cabId, data.notification_config, datosCompletos);
        } else {
          log.audit({
            title  : 'Sin destinatarios configurados',
            details: 'Pre-orden ' + cabId + ' creada sin destinatarios de notificación'
          });
        }
      } else {
        log.audit({
          title  : 'Sin configuración de notificaciones',
          details: 'Pre-orden ' + cabId + ' creada sin configuración de notificaciones'
        });
      }
    } catch (notificationError) {
      log.error({
        title  : 'ERROR en procesamiento de notificaciones',
        details: 'Pre-orden creada exitosamente pero falló el envío de notificaciones: ' +
                 notificationError.message + '\nStack: ' + notificationError.stack
      });
    }
    
    return { success:true, id:cabId };
  }
  
  /* ------------------------------------------------------------------ */
  /* ---------------------------  EXPORT  ----------------------------- */
  /* ------------------------------------------------------------------ */
  return { post: post };
});
