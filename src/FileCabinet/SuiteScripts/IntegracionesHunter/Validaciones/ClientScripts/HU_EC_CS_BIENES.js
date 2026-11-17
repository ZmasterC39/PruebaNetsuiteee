/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 *
 * @author Mauro F Ramos
 * @date Created at: 19/02/2025 - Last modified: 19/02/2025
 * @description
 *
 * @version 1.0
 * @notes -
 *  - Abre el formulario "Caso" y carga datos para un llenado automático.
 */
define(['N/log', 'N/currentRecord', 'N/https', 'N/ui/dialog', 'N/runtime'], (log, currentRecord, https, dialog, runtime) => {
    
    const record = currentRecord.get();

    function pageInit(context) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.get('cp') === 'T';
        if (isCopy) {
            return; // Salir del script si es copia
        }
        let customform = context.currentRecord.getValue({fieldId: 'customform' });
        let currentRecord = context.currentRecord;
        let customform2 =  currentRecord.getValue({fieldId: 'customform' });
        let custrecord_ht_bien_tipobien =  currentRecord.getValue({fieldId: 'custrecord_ht_bien_tipobien' });
        let custrecord_ht_bien_tipoterrestre =  currentRecord.getValue({fieldId: 'custrecord_ht_bien_tipoterrestre' });
        if( context.mode == 'create' && customform == '112'){
          let btnBuscarBien = document.querySelector("#custpage_buscar_bien") || false;
          if( !btnBuscarBien ){ return; }
          btnBuscarBien.style.display = "NONE";
        }
      } catch (error) {
        log.error("ERROR pageInit.stack", error.stack);
      }
    }

    function crearCaso(accion, bienId, bienPropietario) {
        log.debug("accion , bienid, bienPropietario", `${accion} - ${typeof accion} | ${bienId} ${typeof bienId} | ${bienPropietario } - ${typeof bienPropietario}` );
        let url = ""
        // cf = 82 (Formulario de rastreo)
        // accion = 0 (Crear Caso) | 1 (Crear Caso Robo)
        if( window.location.hostname.includes("7451241-sb1.app.netsuite.com") ){
            url = `https://7451241-sb1.app.netsuite.com/app/crm/support/supportcase.nl?cf=82&record.custevent_ht_caso_vehiculo=${bienId}&record.company=${bienPropietario}&accion=${accion}`;
        }else{
            url = `https://7451241.app.netsuite.com/app/crm/support/supportcase.nl?cf=82&record.custevent_ht_caso_vehiculo=${bienId}&record.company=${bienPropietario}&accion=${accion}`;
        }
        window.location.href = url;
    }

    function buscarBien() {
        log.debug("Buscar bien", )
        let {subsidiary, role, id} = runtime.getCurrentUser();
        if(subsidiary != 2){
          return
        }
        try {
            let customform = record.getValue({
                fieldId: "customform",
            });
            let bien_tipobien = record.getValue({
                fieldId: "custrecord_ht_bien_tipobien",
            });
            let bien_tipoterrestre = record.getValue({
                fieldId: "custrecord_ht_bien_tipoterrestre",
            });

            let bien_motor = record.getValue({
                fieldId: "custrecord_ht_bien_motor",
            });

            let bien_chasis = record.getValue({
                fieldId: "custrecord_ht_bien_chasis",
            });


            if( customform != 112) {
                alert("El tipo de formulario debe ser HT Bienes Terrestre")
                return;
            }

            if( bien_tipobien != 1 ){
                alert("El tipo de bien debe ser Vehículo Terrestre");
                return;
            }

            if( bien_tipoterrestre != 1 && bien_tipoterrestre != 30 ){
                alert("El tipo de vehículo debe ser Vehiculo o Moto");
                return;
            }

            if( bien_motor.trim() === "" && bien_chasis.trim() === "" ) {
                alert("Inserte valor en motor o chasis");
                return;
            }

            let resultado = realizarConsulta(bien_motor, bien_chasis);

            let texto = '';

            if (resultado && resultado.placavehiculos) {
                texto = resultado.placavehiculos;
            } else {
                texto = false;
                dialog
                    .create({
                    title: "Información",
                    message: "No se encontraron resultados",
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
                return
            }


            // Usar expresiones regulares para extraer valores
            const placaMatch = texto.match(/Placa:\s*(\S+)/);
            const anioMatch = texto.match(/Año:\s*(\d{4})/);
            const chasisMatch = texto.match(/Chasis:\s*([A-Z0-9]+)/);
            const motorMatch = texto.match(/Motor:\s*([A-Z0-9]+)/);

            // Asignar a variables (con verificación de null por seguridad)
            const placa = placaMatch ? placaMatch[1] : false;
            const anio = anioMatch ? anioMatch[1] : false;
            const chasis = chasisMatch ? chasisMatch[1] : false;
            const motor = motorMatch ? motorMatch[1] : false;

            if( placa ){
                const placaFormateada = placa.replace(/^([A-Za-z]+)(\d+)([A-Za-z]*)$/, '$1-$2$3');
                record.setValue({
                    fieldId: "custrecord_ht_bien_placa",
                    value: placaFormateada,
                });
            }

            if( anio ){
                record.setValue({
                    fieldId: "custrecord_ht_bien_ano",
                    value: anio,
                });
            }

            if( chasis ){
                record.setValue({
                    fieldId: "custrecord_ht_bien_chasis",
                    value: chasis,
                });
            }

            if( motor ){
                record.setValue({
                    fieldId: "custrecord_ht_bien_motor",
                    value: motor,
                });
            }

        } catch (error) {
            log.error("Error buscarBien", error);
        }

    }

    function realizarConsulta(motor, chasis) {
        let {subsidiary, role, id} = runtime.getCurrentUser();
        if(subsidiary != 2){
          return
        }

      try {
        let value = motor ? motor : chasis;
        url = `https://seeks.site/Conciudadano.Service/services/restservice/buscarInformacionPorMotorChasis?usuario=carsegws1&token=9465e743-8941-4193-b853-2bed34fa5eb0&numero=${value}`;

        const result = https.get({
        url,
        headers: {
            Accept: "application/json",
        },
        });

        let resultado = JSON.parse(result.body);

        return resultado.respuesta;
      } catch (error) {
        log.error("ERROR realizarConsulta", error);
        log.error("ERROR realizarConsulta.stack", error.stack);
        
      }

    }

    function fieldChanged(context) {
        let {subsidiary, role, id} = runtime.getCurrentUser();
          if(subsidiary != 2){
            return
          }

      const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.get('cp') === 'T';
        if (isCopy) {
            return; // Salir del script si es copia
        }
        try {
            const fieldId = context.fieldId;
            let customform = record.getValue({
                fieldId: "customform",
            });
            let tipobien = record.getValue({
                fieldId: "custrecord_ht_bien_tipobien",
            });
            let tipoterrestre = record.getValue({
                fieldId: "custrecord_ht_bien_tipoterrestre",
            });


            // if(fieldId == 'customform' || fieldId == 'custrecord_ht_bien_tipobien' || fieldId == 'custrecord_ht_bien_tipoterrestre'){
            if((fieldId == 'custrecord_ht_bien_tipobien' || fieldId == 'custrecord_ht_bien_tipoterrestre') && customform == '112'){
                let btnBuscarBien = document.querySelector("#custpage_buscar_bien") || false;
                if( !btnBuscarBien ) { return }
                if( customform == '112' && tipobien == '1' && (tipoterrestre == '1' || tipoterrestre == '30' )){
                    btnBuscarBien.style.display = "block";
                }else{
                  if(customform == '112'){
                    btnBuscarBien.style.display = "NONE";
                  }
                }
            }

           let {  currentRecord } = context;
          if( customform == '264' ){
                if(  tipobien == '8' && (tipoterrestre == '51'  )){
                    currentRecord.getField({ fieldId: 'custrecordcustrecord_ht_edad_mascota' }).isDisplay = true;
                    currentRecord.getField({ fieldId: 'custrecordcustrecord_lt_tipo_mascota' }).isDisplay = true;
                } else {
                    currentRecord.getField({ fieldId: 'custrecordcustrecord_ht_edad_mascota' }).isDisplay = false;
                    currentRecord.getField({ fieldId: 'custrecordcustrecord_lt_tipo_mascota' }).isDisplay = false;
                    currentRecord.setValue({ fieldId: 'custrecordcustrecord_ht_edad_mascota', value: '', ignoreFieldChange: true });
                    currentRecord.setValue({ fieldId: 'custrecordcustrecord_lt_tipo_mascota', value: '', ignoreFieldChange: true });
                }
            }

          // if (fieldId === 'custrecord_ht_bien_telefono_emergencia') {
          //       var telefono = record.getValue({
          //       fieldId: 'custrecord_ht_bien_telefono_emergencia'
          //       });
          //       telefono = telefono.trim();
          //       let flagtelefono = true;
          //       if( telefono.length == 9 || telefono.length == 10 ){
          //           if (!/^[0-9]+$/.test(telefono.trim())){
          //               alert('El número de teléfono debe tener solo dígitos');
          //               flagtelefono = false;
          //           }
          //       }else{
          //           alert("El número de teléfono debe tener 9 o 10 dígitos");
          //           flagtelefono = false;
          //       }

          //       if( !flagtelefono ){
          //           record.setValue({
          //               fieldId: 'custrecord_ht_bien_telefono_emergencia',
          //               value: '',
          //               ignoreFieldChange: true
          //           });
          //       }
          //   }
          if (fieldId === 'custrecord_ht_bien_telefono_emergencia') {
               var rawValue = record.getValue({
                   fieldId: 'custrecord_ht_bien_telefono_emergencia'
               });
              
               if (!rawValue || rawValue.trim() === '') return;
              
               var partes = rawValue.split(',');
              
               if (partes.length > 3) {
                   alert('Solo se permiten hasta 3 números de teléfono separados por coma.');
                   record.setValue({ fieldId: 'custrecord_ht_bien_telefono_emergencia', value: '', ignoreFieldChange: true });
                   return;
               }
              
               var numeros = ['          ', '          ', '          ']; // 3 slots de 10 espacios
               var valido = true;
              
               for (var i = 0; i < partes.length; i++) {
                   var num = partes[i].trim();
              
                   if (num === '') {
                       // Slot vacío, se mantiene con espacios
                       continue;
                   }
              
               if (!/^[0-9]{10}$/.test(num)) {
                   const mensajes = [
                       'El primer número no tiene los 10 dígitos numéricos.',
                       'El segundo número no tiene los 10 dígitos numéricos.',
                       'El tercer número no tiene los 10 dígitos numéricos.'
                   ];
                   alert(mensajes[i]);
                   valido = false;
                   break;
               }
              
                   numeros[i] = num;
               }
              
               // El primer número es obligatorio
               if (valido && numeros[0].trim() === '') {
                   alert('Debe ingresar al menos el primer número de teléfono de emergencia.');
                   valido = false;
               }
              
               // Si el tercero tiene valor pero el segundo no, inválido
               if (valido && numeros[1].trim() === '' && numeros[2].trim() !== '') {
                   alert('No puede registrar el tercer número sin antes registrar el segundo.');
                   valido = false;
               }
              
               if (!valido) {
                   record.setValue({ fieldId: 'custrecord_ht_bien_telefono_emergencia', value: '', ignoreFieldChange: true });
                   return;
               }
              
               var valorFormateado = numeros[0] + ',' + numeros[1] + ',' + numeros[2];
              
               record.setValue({
                   fieldId: 'custrecord_ht_bien_telefono_emergencia',
                   value: valorFormateado,
                   ignoreFieldChange: true
               });
          }
        } catch (error) {
          const fieldId = context.fieldId;
            log.error("ERROR fieldId", fieldId);
            log.error("ERROR fieldChanged", error)
        }
    }

    return { pageInit, fieldChanged, crearCaso, buscarBien };
});