/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime', './HU_EC_CORE_IMPULSO_PLATAFORMA'], (runtime,_coreimp) => {
  function afterSubmit(context) {
    try {
      const newRecord = context.newRecord;
      const idCliente = newRecord.id;
      if (context.type === context.UserEventType.EDIT) {
        //context.type === context.UserEventType.XEDIT
        _coreimp.actualizarCliente(idCliente);
      } else {
        return;
      }
    } catch (error) {
      log.error("UE afterSubmit" , error.stack)
    }
  }

  function beforeLoad(context) {
    try {
        let usuario = runtime.getCurrentUser();

        if(usuario.subsidiary == 2){
            if(context.type === context.UserEventType.VIEW){
              _mostrarCartera(context);
            }
        }

        if(context.type === context.UserEventType.VIEW){
          // 1894 - EC Desarrollo TI
          if([1894].includes(usuario.role) && usuario.subsidiary == 2){
            let record = context.newRecord;
            let isperson = record.getText({ fieldId: 'isperson' });
            let campos_sensibles;
            if( isperson == 'F'){
              campos_sensibles = {
                CLIENTE: [
                  { fieldId: 'entityid', nextTo: 'entityid', position: 'STARTCOL' },
                  { fieldId: 'altname', nextTo: 'altname', position: 'NONE' },
                  { fieldId: 'companyname', nextTo: 'companyname', position: 'NONE' },
                  { fieldId: 'email', nextTo: 'email', position: 'STARTCOL' },
                  { fieldId: 'phone', nextTo: 'phone', position: 'STARTCOL' },
                  { fieldId: 'defaultaddress', nextTo: 'defaultaddress', position: 'STARTCOL' },
                ]
              };
              _coreimp.ofuscarCampos(context, campos_sensibles.CLIENTE);
            }else{
              campos_sensibles = {
                CLIENTE: [
                  { fieldId: 'entityid', nextTo: 'entityid', position: 'STARTCOL' },
                  { fieldId: 'altname', nextTo: 'altname', position: 'NONE' },
                  { fieldId: 'custentity_ht_cl_primernombre', nextTo: 'custentity_ht_cl_primernombre', position: 'NONE' },
                  { fieldId: 'custentity_ht_cl_segundonombre', nextTo: 'custentity_ht_cl_segundonombre', position: 'NONE' },
                  { fieldId: 'custentity_ht_cl_apellidopaterno', nextTo: 'custentity_ht_cl_apellidopaterno', position: 'STARTCOL' },
                  { fieldId: 'custentity_ht_cl_apellidomaterno', nextTo: 'custentity_ht_cl_apellidomaterno', position: 'NONE' },
                  { fieldId: 'glommedname', nextTo: 'glommedname', position: 'NONE' },
                  { fieldId: 'companyname', nextTo: 'companyname', position: 'NONE' },
                  { fieldId: 'email', nextTo: 'email', position: 'STARTCOL' },
                  { fieldId: 'phone', nextTo: 'phone', position: 'NONE' },
                  { fieldId: 'homephone', nextTo: 'homephone', position: 'STARTCOL' },
                  { fieldId: 'defaultaddress', nextTo: 'defaultaddress', position: 'STARTCOL' },
                  { fieldId: 'altemail', nextTo: 'altemail', position: 'STARTCOL' },
                  { fieldId: 'mobilephone', nextTo: 'mobilephone', position: 'NONE' },
                ]
              };
              _coreimp.ofuscarCampos(context, campos_sensibles.CLIENTE);
            }

             const form = context.form;

             const newField = form.addField({
               id: 'custpage_ofuscar_titulo_pagina',
               type: 'INLINEHTML',
               label: 'Ofuscar título de página'
             });

            newField.defaultValue = `
              <script>
                (function() {
                  function ofuscarElemento(selector) {
                    const elemento = document.querySelector(selector);
                    if (!elemento) return;
            
                    const textoOriginal = elemento.innerText.trim();
                    if (textoOriginal.length <= 9) return;
            
                    // Mantiene los primeros 9 caracteres visibles
                    const textoOfuscado = textoOriginal
                      .split('')
                      .map((c, i) => {
                        if (i < 9) return c;
                        // return /[A-Za-z0-9]/.test(c) ? 'X' : c;
                        return /[A-Za-z]/.test(c) ? 'X' : c;
                      })
                      .join('');
            
                    elemento.innerText = textoOfuscado;
                  }
            
                  function ofuscarTituloYId() {
                    ofuscarElemento('.uir-record-name'); // título principal
                    ofuscarElemento('.uir-record-id');   // ID del registro
                    ofuscarElemento('.listtext uir-list-row-cell');   // correo
                  }
            
                  // Esperar que la UI esté renderizada
                  window.addEventListener('load', ofuscarTituloYId);
                })();
              </script>
            `;
          }
        }
    } catch (error) {
        log.debug("Error en beforeLoad", error);
    }
  }

  function _mostrarCartera(context){
    try {

      const form = context.form;
      let newRecord = context.newRecord;
      let overduebalance = newRecord.getValue({ fieldId: 'overduebalance' });
      form.addFieldGroup({
        id: 'custpage_grupo_cartera',
        label: 'Información de Cartera'
      });
      let estado_cartera = form.addField({
        id: "custpage_cartera",
        type: "INLINEHTML",
        label: "Estado Cartera",
        container: 'custpage_grupo_cartera'
      });

      if ( overduebalance > 0) {
        estado_cartera.defaultValue = `
        <div>
        <p style="font-size: 12px; color:#6f6f6f;">ESTADO DE COBRANZAS<br><b><span style="color: #de022e; font-size: 14px;">CLIENTE CON VALORES VENCIDOS</span></b></p>
        </div>
        `;
      } else {
        estado_cartera.defaultValue = `
        <div>
        <p style="font-size: 12px; color:#6f6f6f;">ESTADO DE COBRANZAS<br><b><span style="font-size: 14px;">CLIENTE SIN SEGUIMIENTO DE COBRANZA.</span></b></p>
        </div>
        `;
      }
    } catch (error) {
      log.debug("ERROR: _mostrarCartera", error);
    }
  }

  return {
    afterSubmit: afterSubmit,
    beforeLoad
  };
});
