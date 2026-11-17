/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
/**
 * AUTOR: Mauro F Ramos
 * FECHA: 13/01/2025
 * DESCRIPCION: Lógica impulsada por el botón creado en: HT_EC_UE_BUSCAR_CLIENTE
 */

define(["N/https", "N/currentRecord", "N/ui/dialog"], (
  https,
  currentRecord,
  dialog
) => {
  const pageInit = (context) => {};

  const validarBusqueda = (scriptContext) => {
    try {
      let numero_documento = document
        .querySelector("#vatregnumber")
        .value.trim();
      let tipo_documento = document
        .querySelector("#inpt_custentity_ec_document_type8")
        .value.trim();

      let tipo_consulta = "";
      let value = "";
      // VALIDAR: SELECCIÓN TIPO DE DOCUMENTO
      if (!tipo_documento) {
        dialog
          .create({
            title: "Campos Obligatorios",
            message: "Seleccione un tipo de documento",
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
      } else {
        tipo_consulta = tipo_documento.toLowerCase();
      }
      // VALIDAR: NO ESTE VACÍO EL INPUT
      if (!numero_documento) {
        dialog
          .create({
            title: "Campos Obligatorios",
            message: `Ingrese el numero de ${tipo_documento}`,
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
      } else {
        value = numero_documento;
      }

      // VALIDAR: Solo puede hacer uso del botón cuando se ha seleccionado
      // CÉDULA o RUC
      if (["cedula"].includes(tipo_consulta)) {
      } else {
        dialog
          .create({
            title: "Información",
            message: `tipo de consulta no se permite en: ${tipo_consulta}, solo Cédula o RUC`,
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

      if (tipo_consulta === "cedula") {
        if (value.length != 10) {
          dialog
            .create({
              title: "Información",
              message: `Documento "${tipo_documento}" tiene una longitud de ${value.length} caracteres, pero debería ser exactamente de 10 caracteres.`,
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
      }

      if (tipo_consulta === "ruc") {
        if (value.length != 13) {
          dialog
            .create({
              title: "Información",
              message: `Documento "${tipo_documento}" tiene una longitud de ${value.length} caracteres, pero debería ser exactamente de 13 caracteres.`,
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
      }

      let datos = realizarConsulta(tipo_consulta, value);

      if (datos) {
        llenar_campos(datos);
      } else {
        dialog
          .create({
            title: "Información",
            message: `No se encontro resultados para el documento: ${tipo_documento} ${value}`,
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
    } catch (error) {
      console.log("Error:" + error);
    }
  };

  function llenar_campos(datos) {
    let nombre = document.querySelector("#firstname");
    let apellido_paterno = document.querySelector(
      "#custentity_ht_cl_apellidopaterno"
    );
    let apellido_materno = document.querySelector(
      "#custentity_ht_cl_apellidomaterno"
    );

    let primer_nombre = document.querySelector(
      "#custentity_ht_cl_primernombre"
    );

    let segundo_nombre = document.querySelector(
      "#custentity_ht_cl_segundonombre"
    );

    let email = document.querySelector("#email");
    let telefono = document.querySelector("#phone");
    let direccion = document.querySelector("#addr1");
    let ciudad = document.querySelector("#city");
    let provincia = document.querySelector("#state");
    let pais = document.querySelector("#country");

    let nombres = datos.nombrecompleto.split(" ");
    apellido_paterno.value = nombres[0];
    apellido_materno.value = nombres[1];
    primer_nombre.value = nombres[2];
    segundo_nombre.value = nombres[3].length > 0 ? nombres[3] : "";
    email.value = datos.correo1;
    telefono.value = datos.telefono1;
  }

  function realizarConsulta(tipo, value) {
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

  // gsq5981
  const validarBusquedaPlaca = (scriptContext) => {
    try {
      let placa = document
        .querySelector("#custrecord_ht_bien_placa")
        .value.trim();

      if (!placa) {
        alert("Ingrese la placa");
        return;
      }
      if (placa === "S/P" || placa === "s/p") {
        alert("Placa no válida");
        return;
      }

      placa = placa.replace(/[-/]/g, "").toUpperCase();
      if (placa.length >= 6 && placa.length <= 7) {
      } else {
        alert(
          "Placa no válida" + placa.length + "Deberías tener 6 o 7 caracteres"
        );
        return;
      }

      let anio = document.querySelector("#custrecord_ht_bien_ano");
      let color = document.querySelector(
        "#custrecord_ht_bien_colorcarseg_display"
      );
      let marca = document.querySelector("#custrecord_ht_bien_marca");
      let modelo = document.querySelector("#custrecord_ht_bien_modelo");

      let vehiculo = realizarConsultaPlaca(placa);

      if (vehiculo.length === 0) {
        alert("No se encontraron resultados");
        return;
      } else {
      }

      // let vehiculo = {
      //   Marca: "CHEVROLET",
      //   Color: "rojo",
      //   Año: "2019",
      //   Modelo: "AVEO ACT 1.6 4P 4X2 TM GASOLINA",
      // };

      // marca.value = vehiculo.Marca || "PEUGEOT";
      color.value = vehiculo.Color;
      anio.value = vehiculo.Año;
      // modelo.value =
      //   vehiculo.Modelo || "3008N ACT 20H BA6 AC 2.0 5P 4X2 TA DIESEL";
    } catch (error) {
      console.log("Error:" + error);
    }
  };

  function realizarConsultaPlaca(value) {
    let token = "CNfAxhEoW0vBkQOFQIy1FhfNt2jur9kKW2DmwHnD";
    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    let options = {
      method: "GET",
      url: `https://webservices.ec/api/placas/${value}`,
      headers: headers,
    };

    let response = https.get(options);

    let respuesta = JSON.parse(response.body);

    return respuesta.data;
  }

  return {
    pageInit,
    buscarCliente: validarBusqueda,
    buscarPlaca: validarBusquedaPlaca,
  };
});
