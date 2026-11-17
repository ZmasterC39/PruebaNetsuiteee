/**
 * @NApiVersion 2.1
 */

define(['../Libraries/NetSuiteUtilities', '../Models/modelCliente', '../Models/modelGeneral', 'N/record', 'N/https', 'N/log'], function (NetSuiteUtilities, modelCliente, modelGeneral, record, https, log) {

    function actualizaClientePlataforma(clienteIdInterno) {

        var respuestaServicio

        function getIdentificaPlataforma(idInternoCliente) {

            log.debug('getIdentificaPlataforma-idInternoCliente', idInternoCliente);

            var searchResults = modelGeneral.getIdentificaPlataforma(idInternoCliente);
            log.debug('controllerCliente-searchResults', searchResults);

            function evaluarResultado(datos) {
                // Valor predeterminado

                let tieneAMI = false;
                let tienePX = false;

                // Iterar sobre cada elemento del array JSON
                for (let i = 0; i < datos.length; i++) {
                    const descripcion = datos[i].descripcionproducto.toLowerCase();
                    const coberturaEstado = parseInt(datos[i].coberturaestado);

                    // Verificar si el producto es de tipo AMI
                    if (descripcion.includes("ami")) {
                        tieneAMI = true;
                    } else {
                        // Si no es AMI, entonces es PX
                        tienePX = true;
                    }
                }

                // Construir el resultado final
                const resultado = {
                    AMI: tieneAMI ? "SI" : "NO",
                    PX: tienePX ? "SI" : "NO"
                };

                return resultado;

            }

            const resultado = evaluarResultado(searchResults);

            return resultado;

        }

        var getIdentificaPlataformaResult = getIdentificaPlataforma(clienteIdInterno);

        log.debug('controllerCliente-getIdentificaPlataformaResult', getIdentificaPlataformaResult);

        var dataClienteResult = modelCliente.dataCliente(clienteIdInterno);

        log.debug('controllerCliente-dataClienteResult', dataClienteResult);

        var resultAmi
        var resultPx

        //evaluar los 3 casos
        //caso solo AMI - armar JSON
        if (getIdentificaPlataformaResult.AMI == "SI" && getIdentificaPlataformaResult.PX == "NO") {
            var amiObject = {
                "numeroorden": "0",
                "id_cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "primer_nombre": dataClienteResult[0].es_persona ? dataClienteResult[0].primer_nombre : dataClienteResult[0].nombre_empresa || "",
                "segundo_nombre": dataClienteResult[0].segundo_nombre || "",
                "apellido_paterno": dataClienteResult[0].apellido_paterno || "",
                "apellido_materno": dataClienteResult[0].apellido_materno || "",
                "direccion": dataClienteResult[0].direccion.replace(/\n/g, ' '),
                //filtrar el resultado y traer el valor del telefono convencional con codigo 10 
                "telefono_convencional": (dataClienteResult.find(item => item.tipo_telefono === '10') || {}).telefono.replace("+593", "") || "",
                //filtrar el resultado y traer el valor del telefono convencional con codigo 1
                "telefono_celular": (dataClienteResult.find(item => item.tipo_telefono == '1') || {}).telefono.replace("+593", "0") || "",
                "email": dataClienteResult[0].email,
                "id_usuario": "OPERAD",
                "plataforma": "AMI",
                "email_ami": (dataClienteResult.find(function (item) { return item.tipo_correo == '2' }) || {}).email || "",
                "ami_tipodocumento": dataClienteResult[0].ami_tipodocumento,
                "amicliente": dataClienteResult[0].amicliente,
                "ami_company": "0991259546001",
                "ami_support": "soporteami@carsegsa.com",
                "ami_telefono": "0985454544",
                "ami_celular": "046004640"
            }
            
            //enviar a AMI
            log.debug('controllerCliente-amiObject', amiObject);
            var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaCliente(amiObject);
            log.debug('controllerCliente-resultadoEnvio', resultadoEnvio);

            resultAmi = resultadoEnvio;
            
        }

        //caso solo PX - armar JSON
        if (getIdentificaPlataformaResult.AMI == "NO" && getIdentificaPlataformaResult.PX == "SI") {
            var pxObject = {
                "numeroorden": "0",
                "id_cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "primer_nombre": dataClienteResult[0].es_persona ? dataClienteResult[0].primer_nombre : dataClienteResult[0].nombre_empresa || "",
                "segundo_nombre": dataClienteResult[0].segundo_nombre || "",
                "apellido_paterno": dataClienteResult[0].apellido_paterno || "",
                "apellido_materno": dataClienteResult[0].apellido_materno || "",
                "direccion": dataClienteResult[0].direccion.replace(/\n/g, ' '),
                //filtrar el resultado y traer el valor del telefono convencional con codigo 10 
                "telefono_convencional": (dataClienteResult.find(item => item.tipo_telefono === '10') || {}).telefono.replace("+593", "") || "",
                //filtrar el resultado y traer el valor del telefono convencional con codigo 1
                "telefono_celular": (dataClienteResult.find(item => item.tipo_telefono == '1') || {}).telefono.replace("+593", "0") || "",
                "email": dataClienteResult[0].email,
                "id_usuario": "OPERAD",
                "plataforma": "PX",
                "email_ami": "",
                "ami_tipodocumento": "",
                "amicliente": "",
                "ami_company": "0991259546001",
                "ami_support": "soporteami@carsegsa.com",
                "ami_telefono": "0985454544",
                "ami_celular": "046004640"
            }

            //enviar a PX
            log.debug('controllerCliente-pxObject', pxObject);
            var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaCliente(pxObject);
            log.debug('controllerCliente-resultadoEnvio', resultadoEnvio);

            resultPx = resultadoEnvio;

        }

        //caso ambos - armar JSON
        if (getIdentificaPlataformaResult.AMI == "SI" && getIdentificaPlataformaResult.PX == "SI") {
            //objeto px
            var pxObject = {
                "numeroorden": "0",
                "id_cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "primer_nombre": dataClienteResult[0].es_persona ? dataClienteResult[0].primer_nombre : dataClienteResult[0].nombre_empresa || "",
                "segundo_nombre": dataClienteResult[0].segundo_nombre || "",
                "apellido_paterno": dataClienteResult[0].apellido_paterno || "",
                "apellido_materno": dataClienteResult[0].apellido_materno || "",
                "direccion": dataClienteResult[0].direccion.replace(/\n/g, ' '),
                //filtrar el resultado y traer el valor del telefono convencional con codigo 10 
                "telefono_convencional": (dataClienteResult.find(item => item.tipo_telefono === '10') || {}).telefono.replace("+593", "") || "",
                //filtrar el resultado y traer el valor del telefono convencional con codigo 1
                "telefono_celular": (dataClienteResult.find(item => item.tipo_telefono == '1') || {}).telefono.replace("+593", "0") || "",
                "email": dataClienteResult[0].email,
                "id_usuario": "OPERAD",
                "plataforma": "PX",
                "email_ami": "",
                "ami_tipodocumento": "",
                "amicliente": "",
                "ami_company": "0991259546001",
                "ami_support": "soporteami@carsegsa.com",
                "ami_telefono": "0985454544",
                "ami_celular": "046004640"
            }

            //objeto ami
            var amiObject = {
                "numeroorden": "0",
                "id_cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "primer_nombre": dataClienteResult[0].es_persona ? dataClienteResult[0].primer_nombre : dataClienteResult[0].nombre_empresa || "",
                "segundo_nombre": dataClienteResult[0].segundo_nombre || "",
                "apellido_paterno": dataClienteResult[0].apellido_paterno || "",
                "apellido_materno": dataClienteResult[0].apellido_materno || "",
                "direccion": dataClienteResult[0].direccion.replace(/\n/g, ' '),
                //filtrar el resultado y traer el valor del telefono convencional con codigo 10 
                "telefono_convencional": (dataClienteResult.find(item => item.tipo_telefono === '10') || {}).telefono.replace("+593", "") || "",
                //filtrar el resultado y traer el valor del telefono convencional con codigo 1
                "telefono_celular": (dataClienteResult.find(item => item.tipo_telefono == '1') || {}).telefono.replace("+593", "0") || "",
                "email": dataClienteResult[0].email,
                "id_usuario": "OPERAD",
                "plataforma": "AMI",
                "email_ami": (dataClienteResult.find(function (item) { return item.tipo_correo == '2' }) || {}).email || "",
                "ami_tipodocumento": dataClienteResult[0].ami_tipodocumento,
                "amicliente": dataClienteResult[0].amicliente,
                "ami_company": "0991259546001",
                "ami_support": "soporteami@carsegsa.com",
                "ami_telefono": "0985454544",
                "ami_celular": "046004640"
            }

            //enviar a PX
            log.debug('controllerCliente-pxObject', pxObject);
            var resultadoEnvioPX = NetSuiteUtilities.impulsoPlataformaCliente(pxObject);
            log.debug('controllerCliente-resultadoEnvioPX', resultadoEnvioPX);
            resultPx = resultadoEnvioPX;

            //enviar a AMI
            log.debug('controllerCliente-amiObject', amiObject);
            var resultadoEnvioAMI = NetSuiteUtilities.impulsoPlataformaCliente(amiObject);
            log.debug('controllerCliente-resultadoEnvioAMI', resultadoEnvioAMI);
            resultAmi = resultadoEnvioAMI;

        }

        //juntar resultados
        respuestaServicio = {
            "ami": resultAmi,
            "px": resultPx
        }

        log.debug('controllerCliente-resultado', respuestaServicio);

        return respuestaServicio;
    }

    return {
        actualizaClientePlataforma
    };
});