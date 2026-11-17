/**
 * @NApiVersion 2.1
 */

define(['../Libraries/NetSuiteUtilities', '../Models/modelBien', '../Models/modelGeneral', '../Models/modelCliente', 'N/record', 'N/https', 'N/log'], function (NetSuiteUtilities, modelBien, modelGeneral, modelCliente, record, https, log) {

    function actualizaBienPlataforma(clienteIdInterno, idinternobien) {

        var respuestaServicio

        function getIdentificaPlataforma(idInternoCliente) {

            log.debug('getIdentificaPlataforma-idInternoCliente', idInternoCliente);

            var searchResults = modelGeneral.getIdentificaPlataforma(idInternoCliente);
            log.debug('controllerBien-searchResults', searchResults);

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

        log.debug('controllerBien-getIdentificaPlataformaResult', getIdentificaPlataformaResult);

        var dataBienResult = modelBien.dataBien(idinternobien);

        log.debug('controllerBien-dataBienResult', dataBienResult);

        //traer info cliente

        var dataClienteResult = modelCliente.dataCliente(clienteIdInterno);

        var resultAmi
        var resultPx

        //evaluar los 3 casos
        //caso solo AMI - armar JSON
        if (getIdentificaPlataformaResult.AMI == "SI" && getIdentificaPlataformaResult.PX == "NO") {
            var amiObject = {

                "numeroorden": "0",
                "idusuario": "OPERAD",
                "plataforma": "AMI",
                "cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "username": dataBienResult[0].username,
                "amicliente": dataBienResult[0].amicliente,
                "codvehiculo": "BN" + String(dataBienResult[0].codvehiculo).padStart(10, '0'),
                "vehiculoid": dataBienResult[0].codvehiculo,
                "amivehiculo": dataBienResult[0].amivehiculo,
                "descripcionvehiculo": 'PLC. ' + dataBienResult[0].placa + ' MOT. ' + dataBienResult[0].motor + ' CHA. ' + dataBienResult[0].chasis,
                "tipovehiculo": dataBienResult[0].tipovehiculo,
                "tipo": dataBienResult[0].tipo,
                "placa": dataBienResult[0].placa,
                "idmarca": String(dataBienResult[0].idmarca).padStart(3, '0'),
                "marca": dataBienResult[0].marca,
                "idmodelo": String(dataBienResult[0].idmodelo).padStart(3, '0'),
                "modelo": dataBienResult[0].modelo,
                "chasis": dataBienResult[0].chasis,
                "motor": dataBienResult[0].motor,
                "color": dataBienResult[0].color || '000',
                "anio": dataBienResult[0].anio || '0000',
                "idconcesionario": dataBienResult[0].idconcesionario,
                "concesionariodesc": dataBienResult[0].concesionariodesc,
                "concesionariodire": dataBienResult[0].concesionariodire,
                "idfinanciera": dataBienResult[0].idfinanciera,
                "financieradesc": dataBienResult[0].financieradesc,
                "financieradire": dataBienResult[0].financieradire,
                "idaseguradora": dataBienResult[0].idaseguradora,
                "aseguradoradesc": dataBienResult[0].aseguradoradesc,
                "aseguradoradire": dataBienResult[0].aseguradoradire,
            };

            //enviar a AMI
            log.debug('controllerBien-amiObject', amiObject);
            var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaBien(amiObject);
            log.debug('controllerCliente-resultadoEnvio-amiObject', resultadoEnvio);

            resultAmi = resultadoEnvio;

        }

        //caso solo PX - armar JSON
        if (getIdentificaPlataformaResult.AMI == "NO" && getIdentificaPlataformaResult.PX == "SI") {
            var pxObject = {
                "numeroorden": "0",
                "idusuario": "OPERAD",
                "plataforma": "PX",
                "cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "username": dataBienResult[0].username,
                "amicliente": "",
                "codvehiculo": "BN" + String(dataBienResult[0].codvehiculo).padStart(10, '0'),
                "vehiculoid": dataBienResult[0].codvehiculo,
                "amivehiculo": "",
                "descripcionvehiculo": 'PLC. ' + dataBienResult[0].placa + ' MOT. ' + dataBienResult[0].motor + ' CHA. ' + dataBienResult[0].chasis,
                "tipovehiculo": dataBienResult[0].tipovehiculo,
                "tipo": dataBienResult[0].tipo,
                "placa": dataBienResult[0].placa,
                "idmarca": String(dataBienResult[0].idmarca).padStart(3, '0'),
                "marca": dataBienResult[0].marca,
                "idmodelo": String(dataBienResult[0].idmodelo).padStart(3, '0'),
                "modelo": dataBienResult[0].modelo,
                "chasis": dataBienResult[0].chasis,
                "motor": dataBienResult[0].motor,
                "color": dataBienResult[0].color || '000',
                "anio": dataBienResult[0].anio || '0000',
                "idconcesionario": dataBienResult[0].idconcesionario,
                "concesionariodesc": dataBienResult[0].concesionariodesc,
                "concesionariodire": dataBienResult[0].concesionariodire,
                "idfinanciera": dataBienResult[0].idfinanciera,
                "financieradesc": dataBienResult[0].financieradesc,
                "financieradire": dataBienResult[0].financieradire,
                "idaseguradora": dataBienResult[0].idaseguradora,
                "aseguradoradesc": dataBienResult[0].aseguradoradesc,
                "aseguradoradire": dataBienResult[0].aseguradoradire,
            };

            //enviar a PX
            log.debug('controllerBien-pxObject', pxObject);
            var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaBien(pxObject);
            log.debug('controllerBien-resultadoEnvio-pxObject', resultadoEnvio);

            resultPx = resultadoEnvio;

        }

        //caso ambos - armar JSON
        if (getIdentificaPlataformaResult.AMI == "SI" && getIdentificaPlataformaResult.PX == "SI") {
            //objeto px
            var pxObject = {
                "numeroorden": "0",
                "idusuario": "OPERAD",
                "plataforma": "PX",
                "cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "username": dataBienResult[0].username,
                "amicliente": "",
                "codvehiculo": "BN" + String(dataBienResult[0].codvehiculo).padStart(10, '0'),
                "vehiculoid": dataBienResult[0].codvehiculo,
                "amivehiculo": "",
                "descripcionvehiculo": 'PLC. ' + dataBienResult[0].placa + ' MOT. ' + dataBienResult[0].motor + ' CHA. ' + dataBienResult[0].chasis,
                "tipovehiculo": dataBienResult[0].tipovehiculo,
                "tipo": dataBienResult[0].tipo,
                "placa": dataBienResult[0].placa,
                "idmarca": String(dataBienResult[0].idmarca).padStart(3, '0'),
                "marca": dataBienResult[0].marca,
                "idmodelo": String(dataBienResult[0].idmodelo).padStart(3, '0'),
                "modelo": dataBienResult[0].modelo,
                "chasis": dataBienResult[0].chasis,
                "motor": dataBienResult[0].motor,
                "color": dataBienResult[0].color || '000',
                "anio": dataBienResult[0].anio || '0000',
                "idconcesionario": dataBienResult[0].idconcesionario,
                "concesionariodesc": dataBienResult[0].concesionariodesc,
                "concesionariodire": dataBienResult[0].concesionariodire,
                "idfinanciera": dataBienResult[0].idfinanciera,
                "financieradesc": dataBienResult[0].financieradesc,
                "financieradire": dataBienResult[0].financieradire,
                "idaseguradora": dataBienResult[0].idaseguradora,
                "aseguradoradesc": dataBienResult[0].aseguradoradesc,
                "aseguradoradire": dataBienResult[0].aseguradoradire,
            };

            //objeto ami
            var amiObject = {
                "numeroorden": "0",
                "idusuario": "OPERAD",
                "plataforma": "AMI",
                "cliente": dataClienteResult[0].id_cliente.split('-').slice(2).join('-'),
                "username": dataBienResult[0].username,
                "amicliente": dataBienResult[0].amicliente,
                "codvehiculo": "BN" + String(dataBienResult[0].codvehiculo).padStart(10, '0'),
                "vehiculoid": dataBienResult[0].codvehiculo,
                "amivehiculo": dataBienResult[0].amivehiculo,
                "descripcionvehiculo": 'PLC. ' + dataBienResult[0].placa + ' MOT. ' + dataBienResult[0].motor + ' CHA. ' + dataBienResult[0].chasis,
                "tipovehiculo": dataBienResult[0].tipovehiculo,
                "tipo": dataBienResult[0].tipo,
                "placa": dataBienResult[0].placa,
                "idmarca": String(dataBienResult[0].idmarca).padStart(3, '0'),
                "marca": dataBienResult[0].marca,
                "idmodelo": String(dataBienResult[0].idmodelo).padStart(3, '0'),
                "modelo": dataBienResult[0].modelo,
                "chasis": dataBienResult[0].chasis,
                "motor": dataBienResult[0].motor,
                "color": dataBienResult[0].color || '000',
                "anio": dataBienResult[0].anio || '0000',
                "idconcesionario": dataBienResult[0].idconcesionario,
                "concesionariodesc": dataBienResult[0].concesionariodesc,
                "concesionariodire": dataBienResult[0].concesionariodire,
                "idfinanciera": dataBienResult[0].idfinanciera,
                "financieradesc": dataBienResult[0].financieradesc,
                "financieradire": dataBienResult[0].financieradire,
                "idaseguradora": dataBienResult[0].idaseguradora,
                "aseguradoradesc": dataBienResult[0].aseguradoradesc,
                "aseguradoradire": dataBienResult[0].aseguradoradire,
            };

            log.debug('controllerBien-tipos', 'AMI y PX');

            //enviar a AMI
            log.debug('controllerBien-amiObject', amiObject);
            var resultadoEnvioAMI = NetSuiteUtilities.impulsoPlataformaBien(amiObject);
            log.debug('controllerBien-resultadoEnvioAmi', resultadoEnvioAMI);

            resultAmi = resultadoEnvioAMI;

            //enviar a PX
            log.debug('controllerBien-pxObject', pxObject);
            var resultadoEnvioPX = NetSuiteUtilities.impulsoPlataformaBien(pxObject);
            log.debug('controllerBien-resultadoEnvioPX', resultadoEnvioPX);
            resultPx = resultadoEnvioPX;

        }

        //juntar resultados
        respuestaServicio = {
            "ami": resultAmi,
            "px": resultPx
        }

        log.debug('controllerBien-resultado', respuestaServicio);

        return respuestaServicio;

    }

    return {
        actualizaBienPlataforma
    };
});