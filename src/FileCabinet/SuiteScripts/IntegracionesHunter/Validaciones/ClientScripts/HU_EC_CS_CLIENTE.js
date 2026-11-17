/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 14/02/2025 12:40 - Last modified: 12/03/2025
 * @description
 *
 * @version 1.0
 * @notes - Ninguna -
 */
define(["N/runtime", "N/currentRecord", "N/ui/dialog", "N/https", "N/log", 'SuiteScripts/IntegracionesHunter/Validaciones/Librerias/HU_EC_LIB_CONTROL_FORMULARIO.js','SuiteScripts/TS NET Scripts/Main/constant/TS_CM_Constant'], function( runtime, currentRecord, dialog, https, log, _libControl,_constant) {
  const record = currentRecord.get();
  let btnBuscarCliente = document.querySelector("#custpage_search_client");
  let typeMode = "";
  let subsidiary = runtime.getCurrentUser().subsidiary;
  let userRole = runtime.getCurrentUser().role;

  // let submitter;

  function pageInit(context) {
    try {
      let customform = record.getValue({
        fieldId: "customform",
      });
      typeMode = context.mode;
      let tipo_persona = record.getValue({
        fieldId: "isperson",
      });

      // *-*-*-*-*-*-*-*- DESHABILITAR CAMPOS  ROLES*-*-*-*-*-*-*-*-
      if (customform === "80" && subsidiary === 2) {
        if(typeMode === 'create'){
          // 1617 - EC EJECUTIVO COMERCIAL
          if([1617].includes(userRole)){
            _libControl.deshabilitarCampos(context, ['salesrep'])
          }
        }
        if(typeMode === 'edit'){ // EDITAR CLIENTE
          // 1617	EC EJECUTIVO COMERCIAL
          // 1663	EC SAC
          // 1843	EC EJECUTIVO CALLCENTER
          // 1653	EC BACK OFFICE
          if([1617, 1663, 1843, 1653].includes(userRole)){
            _libControl.deshabilitarCampos(context, ['salesrep'])
          }

          let fieldCompania = rec.getField({ fieldId: 'custentity_ht_ec_compania_seguro' });
          let category = record.getValue({ fieldId: 'category' });
          if ( category == '8' || category == '10'  ){
            fieldCompania.isDisabled = false;
          }
        }
      }
      // *-*-*-*-*-*-*-*- DESHABILITAR CAMPOS  ROLES*-*-*-*-*-*-*-*-

      if (typeMode !== "create") {
        return;
      }

      if (tipo_persona == "F") {
        btnBuscarCliente.style.display = "none";
      }
    } catch (error) {
      log.debug("ERROR _pageInit", error);
    }
  }

  function saveRecord(context) {
    let customform = record.getValue({
      fieldId: "customform",
    });

    if (customform === "80" && subsidiary === 2) {
      let tipo_documento_id = record.getValue({
        fieldId: "custentity_ec_document_type",
      });
      let isperson = record.getValue({
        fieldId: "isperson",
      });
      if (tipo_documento_id == "2" || tipo_documento_id == "1") {
        let save = validacionCustomer();
        return save;
      } else {
        if (isperson === "F") {
          return campoObligatorio([
            "companyname",
            "category",
            "custentity_ec_document_type",
            "vatregnumber",
            "custentity_ts_ec_tipo_persona",
            // VALIDACION email - phone - defaultaddress 17/03/2025 - AGREGADO [OBLIGATORIO]
            "email",
            "phone",
            "defaultaddress"
          ]);
        } else {
          return campoObligatorio([
            "custentity_ht_cl_primernombre",
            "custentity_ht_cl_apellidopaterno",
            //"custentity_ht_cl_apellidomaterno", 11/03/2025 - DESHABILITADO (2do apellido OPCIONAL)
            "category",
            "custentity_ec_document_type",
            "vatregnumber",
            "custentity_ts_ec_tipo_persona",
            // VALIDACION email - phone - defaultaddress 17/03/2025 - AGREGADO [OBLIGATORIO]
            "email",
            "phone",
            "defaultaddress"
          ]);
        }
      }
    } else {
      return true;
    }
  }

  function validacionCustomer() {
    // VALIDAR CAMPOS OBLIGATORIOS
    let isperson = record.getValue({
      fieldId: "isperson",
    });

    let tipo_documento_id = record.getValue({
      fieldId: "custentity_ec_document_type",
    });

    let flag = false;
    if (isperson === "F") {
      // VALIDACIÓN
      // ! EMPRESA
      flag = campoObligatorio([
        "companyname",
        "entitystatus",
        "category",
        "subsidiary",
        "custentity_ec_document_type",
        "vatregnumber",
        "custentity_ts_ec_tipo_persona",
        // VALIDACION email - phone - defaultaddress 17/03/2025 - AGREGADO [OBLIGATORIO]
        "email",
        "phone",
        "defaultaddress"
      ]);
      if (!flag) {
        return flag;
      }

      flag = clienteRuc();
      return flag;
    } else {
      // VALIDACIÓN
      // ! INDIVIDUAL
      flag = campoObligatorio([
        "custentity_ht_cl_primernombre",
        "custentity_ht_cl_apellidopaterno",
        // "custentity_ht_cl_apellidomaterno", 12/03/2025 - DESHABILITADO (2do apellido OPCIONAL)
        "firstname",
        "entitystatus",
        "category",
        "subsidiary",
        "custentity_ec_document_type",
        "vatregnumber",
        "custentity_ts_ec_tipo_persona",
        // VALIDACION email - phone - defaultaddress 17/03/2025 - AGREGADO [OBLIGATORIO]
        "email",
        "phone",
        "defaultaddress"
      ]);
      if (!flag) {
        return flag;
      }

      flag = clienteCedula();
      return flag;
    }
  }

  function clienteRuc() {
    let tipo_documento_id = record.getValue({
      fieldId: "custentity_ec_document_type",
    });
    let tipo_documento_text = record.getText({
      fieldId: "custentity_ec_document_type",
    });

    let numero_identificacion = record.getValue({
      fieldId: "vatregnumber",
    });

    let tipo_persona = record.getValue({
      fieldId: "custentity_ts_ec_tipo_persona",
    });

    if (
      (tipo_documento_id == "1" && tipo_persona == "8") ||
      (tipo_documento_id == "1" && tipo_persona == "4") ||
      (tipo_documento_id == "1" && tipo_persona == "2") ||
      (tipo_documento_id == "1" && tipo_persona == "1")
    ) {
    } else {
      dialog
        .create({
          title: "Campos Obligatorios",
          message: `Por favor, verifica que el campo "<b>EC - Tipo de persona</b>" sea correcto`,
          buttons: [
            {
              label: "Aceptar",
              value: true,
            },
          ],
        })
        .then(function () {
          return;
        })
        .catch(function (e) {
          log.error("Error mostrando el diálogo:", e);
        });
      return false;
    }

    if (
      tipo_documento_id === "1" &&
      (numero_identificacion.length !== 13 ||
        !numero_identificacion.endsWith("001"))
    ) {
      dialog
        .create({
          title: "Campos Obligatorios",
          message: `Por favor, verifica que el número de documento "<b>${tipo_documento_text}: ${numero_identificacion} </b>" sea correcto`, // Agrega etiquetas <b>
          buttons: [
            {
              label: "Aceptar",
              value: true,
            },
          ],
        })
        .then(function () {
          return;
        })
        .catch(function (e) {
          log.error("Error mostrando el diálogo:", e);
        });
      return false;
    } else {
      return true;
    }
  }

  function clienteCedula() {
    let tipo_documento_id = record.getValue({
      fieldId: "custentity_ec_document_type",
    });

    let tipo_documento_text = record.getText({
      fieldId: "custentity_ec_document_type",
    });

    let tipo_persona = record.getValue({
      fieldId: "custentity_ts_ec_tipo_persona",
    });

    let numero_identificacion = record.getValue({
      fieldId: "vatregnumber",
    });

    if ((tipo_documento_id == "2" && tipo_persona == "1") || (tipo_documento_id == "1" && tipo_persona == "1")) {
    } else {
      dialog
        .create({
          title: "Campos Obligatorios",
          message: `Por favor, verifica que el campo "<b>EC - Tipo de persona</b>" sea correcto`,
          buttons: [
            {
              label: "Aceptar",
              value: true,
            },
          ],
        })
        .then(function () {
          return;
        })
        .catch(function (e) {
          log.error("Error mostrando el diálogo:", e);
        });
      return false;
    }

    if (tipo_documento_id === "2" && numero_identificacion.length != 10 ) {
      dialog
        .create({
          title: "Campos Obligatorios",
          message: `Por favor, verifica que el número de documento "<b>${tipo_documento_text}: ${numero_identificacion} </b>" sea correcto`,
          buttons: [
            {
              label: "Aceptar",
              value: false,
            },
          ],
        })
        .then(function () {
          return false;
        })
        .catch(function (e) {
          log.error("Error mostrando el diálogo:", e);
        });
      return false;
    } else {
      return true;
    }
  }

  function campoObligatorio(fieldIds) {
    let camposFaltantes = [];

    fieldIds.forEach(function (fieldId) {
      let field = record.getField({
        fieldId: fieldId,
      });

      if (!record.getValue({ fieldId: fieldId })) {
        let fieldLabel = field ? field.label : fieldId;
        camposFaltantes.push(fieldLabel);
      }
    });

    if (camposFaltantes.length > 0) {
      dialog
        .create({
          title: "Campos Obligatorios",
          message:
            "Campos obligatorios:<br>" +
            camposFaltantes.map((campo) => `<b>${campo}</b>`).join("<br>"),
          buttons: [
            {
              label: "Aceptar",
              value: true,
            },
          ],
        })
        .then(function () {
          return;
        })
        .catch(function (e) {
          log.error("Error mostrando el diálogo:", e);
        });
      return false;
    }
    return true;
  }

  function fieldChanged(context) {
    let customform = record.getValue({
      fieldId: "customform",
    });
    if (customform == 80 && subsidiary == 2) {
        try {
        const fieldId = context.fieldId;
        if ( typeMode == "create" || typeMode == 'edit'){
          let rec = context.currentRecord;
          let fieldCompania = rec.getField({ fieldId: 'custentity_ht_ec_compania_seguro' });
          if ( fieldId == "category"){
            let category = record.getValue({ fieldId: 'category' });
            if (category == '8' ||  category == '10' ){
              fieldCompania.isDisabled = false;
            }else{
              fieldCompania.isDisabled = true;
              rec.setValue({
                fieldId: 'custentity_ht_ec_compania_seguro',
                value: '',
                ignoreFieldChange: true
              });
            }
          }
        }
        if (typeMode == "create") {
          // !!!!
          let tipo_documento = record.getValue({
            fieldId: "custentity_ec_document_type",
          });
          let ispersona = record.getValue({
            fieldId: "isperson",
          });

          if (fieldId === "custentity_ec_document_type") {
            if (tipo_documento == 2) {
              record.setValue({
                fieldId: "isperson",
                value: "T",
              });
              btnBuscarCliente.style.display = "block";
            } else {
              btnBuscarCliente.style.display = "none";
              control_campos(false);
            }
            if (tipo_documento == 1) {
              record.setValue({
                fieldId: "isperson",
                value: "F",
              });
            }
          }

          if (fieldId === "isperson") {
            if (ispersona == "F") {
              btnBuscarCliente.style.display = "none";
              control_campos(false);
            } else {
              record.setValue({
                fieldId: "companyname",
                value: "",
              });
            }

            if (ispersona == "T" && tipo_documento == 2) {
              btnBuscarCliente.style.display = "block";
            }
          }
          // !!!!

          if (fieldId === "custentity_ht_cl_primernombre") {
            limpiarTexto(
              "custentity_ht_cl_primernombre",
              record.getValue({
                fieldId: "custentity_ht_cl_primernombre",
              })
            );
          }

          if (fieldId === "custentity_ht_cl_segundonombre") {
            limpiarTexto(
              "custentity_ht_cl_segundonombre",
              record.getValue({
                fieldId: "custentity_ht_cl_segundonombre",
              })
            );
          }
          if (fieldId === "custentity_ht_cl_apellidopaterno") {
            limpiarTexto(
              "custentity_ht_cl_apellidopaterno",
              record.getValue({
                fieldId: "custentity_ht_cl_apellidopaterno",
              })
            );
          }
          if (fieldId === "custentity_ht_cl_apellidomaterno") {
            limpiarTexto(
              "custentity_ht_cl_apellidomaterno",
              record.getValue({
                fieldId: "custentity_ht_cl_apellidomaterno",
              })
            );
          }

          if (fieldId === "phone") {
            // let phone = record.getValue({ fieldId: "phone" });
            // let cleanedPhone = phone ? phone.replace(/\D/g, '') : ''; // Elimina todo lo que no sea número
            
            // // Validar longitud (debe tener 10 dígitos)
            // if (cleanedPhone.length !== 10) {
            //     alert("El teléfono debe contener 10 dígitos numéricos."); // Mensaje de error
            //     record.setValue({ fieldId: "phone", value: "" }); // Opcional: Limpiar el campo
            //     return false; // Detener el proceso si no es válido
            // }
        
            // // Si pasa la validación, asignar el valor limpio
            // log.debug("Teléfono válido", cleanedPhone);
            // record.setValue({ fieldId: "phone", value: cleanedPhone });
        }
        }
      } catch (error) {}
    }
    
    //MLNY 09-2025 - NO SE DEBE PERMITIR QUE SELECCIONE UNA CATEGORIA QUE NO CORRESPONDE A ECUADOR
     let currentRecord = context.currentRecord;
     if ( typeMode == "create" || typeMode == 'edit'){
          let subsidiaryId = currentRecord.getValue({ fieldId: 'subsidiary' });        
          if (context.fieldId == 'category' && _constant.Constants.ECUADOR_SUBSIDIARY == subsidiaryId )  { 
              let categoryId = currentRecord.getValue({ fieldId: 'category' });             
 
              // Validación
              if (categoryId) {
                   let restringidas =  _constant.Constants.CATEGORIA_NO_PERMITIDA[subsidiaryId] || [];                  
                   if (restringidas.indexOf(parseInt(categoryId)) !== -1) {
                       let categoria = currentRecord.getText({ fieldId: 'category' });             
                       dialog.alert({ title: 'Alerta', message: 'Categoria [' + categoria + '] no permitida para subsidiaria.' });                                                 
                       currentRecord.setValue({ fieldId: 'category', value: '' });
                   }
              }
          }
      }
  }

  function limpiarTexto(fieldId, texto) {
    if (typeof texto !== "string") {
      throw new Error("El valor proporcionado no es una cadena de texto.");
    }

    // Elimina espacios en blanco al inicio y al final
    texto = texto.trim();

    // Elimina caracteres no alfabéticos (excepto Ñ, ñ y espacios entre palabras)
    texto = texto.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, "");

    // Reemplaza múltiples espacios entre palabras por un solo espacio
    texto = texto.replace(/\s+/g, " ");

    //texto = texto.split(" ")[0];

    if (texto) {
      texto = texto.toUpperCase();
    }

    record.setValue({
      fieldId,
      value: texto,
    });

    return texto;
  }

  const validarBusqueda = () => {
    try {
      let tipo_documento_id = record.getValue({
        fieldId: "custentity_ec_document_type",
      });
      let tipo_documento_text = record.getText({
        fieldId: "custentity_ec_document_type",
      });
      let numero_identificacion = record.getValue({
        fieldId: "vatregnumber",
      });

      let tipo_persona = record.getValue({
        fieldId: "isperson",
      });

      if (tipo_persona === "F") {
        dialog
          .create({
            title: "Campos Inválido",
            message: "Seleccione tipo de persona: Individual",
            buttons: [
              {
                label: "Aceptar",
                value: true,
              },
            ],
          })
          .then(function () {
            return;
          })
          .catch(function (e) {
            log.error("Error mostrando el diálogo:", e);
          });
        return;
      }

      if (!tipo_documento_id) {
        dialog
          .create({
            title: "Campos Obligatorios",
            message: "Seleccione un tipo de documento",
            buttons: [
              {
                label: "Aceptar",
                value: true,
              },
            ],
          })
          .then(function () {
            return;
          })
          .catch(function (e) {
            log.error("Error mostrando el diálogo:", e);
          });
        return;
      }

      if (!numero_identificacion) {
        dialog
          .create({
            title: "Campos Obligatorios",
            message: "Ingrese el N° de identificación",
            buttons: [
              {
                label: "Confirmar",
                value: true,
              },
            ],
          })
          .then(function (result) {
            return;
          })
          .catch(function (e) {
            log.error("Error mostrando el diálogo:", e);
          });
        return;
      }

      if (/^\d+$/.test(numero_identificacion)) {
        // Es válido, solo contiene dígitos
      } else {
        dialog
          .create({
            title: "Información",
            message: `Por favor, verifica que el número de documento "${tipo_documento_text}" sea correcto`,
            buttons: [
              {
                label: "Confirmar",
                value: true,
              },
            ],
          })
          .then(function () {
            return;
          })
          .catch(function (e) {
            log.error("Error mostrando el diálogo:", e);
          });
        return;
      }

      // TODO: 2 es Cedula en SANDBOX
      // EC - Document Type || customrecord_ec_document_type
      if (tipo_documento_id === "2" && numero_identificacion.length === 10) {
        // * *-*-*-*-*-*-*-*-*-*- PETICIÓN A LA API MÁS DATOS *-*-*-*-*-*-*-*-*-*-
        let datos = realizarConsulta(numero_identificacion);
        // * *-*-*-*-*-*-*-*-*-*- PETICIÓN A LA API MÁS DATOS *-*-*-*-*-*-*-*-*-*-
        if (datos) {
          // *-*-*-*-*-*-*-*-*-*- RELLENAR EL FORMULARIO *-*-*-*-*-*-*-*-*-*-
          control_campos(datos);
          // *-*-*-*-*-*-*-*-*-*- RELLENAR EL FORMULARIO *-*-*-*-*-*-*-*-*-*-
        } else {
          dialog
            .create({
              title: "Información",
              message: `No se encontro resultados para el documento: ${tipo_documento_text} ${numero_identificacion}`,
              buttons: [
                {
                  label: "Confirmar",
                  value: true,
                },
              ],
            })
            .then(function () {
              return;
            })
            .catch(function (e) {
              log.error("Error mostrando el diálogo:", e);
            });
          return;
        }
      } else {
        dialog
          .create({
            title: "Información",
            message: `Por favor, verifica que el número de documento "${tipo_documento_text}" sea correcto`,
            buttons: [
              {
                label: "Confirmar",
                value: true,
              },
            ],
          })
          .then(function () {
            return;
          })
          .catch(function (e) {
            log.error("Error mostrando el diálogo:", e);
          });
        return;
      }

      return;
    } catch (error) {
      console.log("Error:" + error);
    }
  };

  function control_campos(datos) {
    if (datos) {
      let nombres = datos.nombrecompleto.split(" ");
      record.setValue({
        fieldId: "custentity_ht_cl_apellidopaterno",
        value: nombres[0],
      });
      record.setValue({
        fieldId: "custentity_ht_cl_apellidomaterno",
        value: nombres[1],
      });
      record.setValue({
        fieldId: "custentity_ht_cl_primernombre",
        value: nombres[2],
      });
      record.setValue({
        fieldId: "custentity_ht_cl_segundonombre",
        value: nombres[3].length > 0 ? nombres[3] : "",
      });

      record.setValue({
        fieldId: "email",
        value: datos.correo1,
      });

      record.setValue({
        fieldId: "phone",
        value: datos.telefono1,
      });
    } else {
      record.setValue({
        fieldId: "vatregnumber",
        value: "",
      });
      record.setValue({
        fieldId: "custentity_ht_cl_primernombre",
        value: "",
      });
      record.setValue({
        fieldId: "custentity_ht_cl_segundonombre",
        value: "",
      });

      record.setValue({
        fieldId: "custentity_ht_cl_apellidopaterno",
        value: "",
      });

      record.setValue({
        fieldId: "custentity_ht_cl_apellidomaterno",
        value: "",
      });

      record.setValue({
        fieldId: "email",
        value: "",
      });

      record.setValue({
        fieldId: "phone",
        value: "",
      });
    }
  }

  function realizarConsulta(value) {
    url = `https://seeks.site/Conciudadano.Service/services/restservice/buscarInformacionPorIdentificacion?usuario=carsegws1&token=9465e743-8941-4193-b853-2bed34fa5eb0&identificacion=${value}`;

    const result = https.get({
      url,
      headers: {
        Accept: "application/json",
      },
    });

    let resultado = JSON.parse(result.body);

    return resultado.respuesta;
  }

  return {
    pageInit,
    fieldChanged,
    saveRecord,
    buscarCliente: validarBusqueda,
  };
});
