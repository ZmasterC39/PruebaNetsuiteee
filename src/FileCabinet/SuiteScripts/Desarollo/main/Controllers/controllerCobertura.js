/**
 * @NApiVersion 2.1
 */

define(['../Libraries/NetSuiteUtilities', '../Models/modelCobertura', '../Models/modelGeneral', 'N/record', 'N/https', 'N/log'], function (NetSuiteUtilities, modelCobertura, modelGeneral, record, https, log) {


    function actualizaEstadoPlataforma(idcobertura, idusuario) {

        try {

            var respuestaServicio

            //obtener data de cobertura
            var dataCobertura = modelCobertura.dataCobertura(idcobertura);
            log.debug('dataCobertura', dataCobertura);
            var serieDispositivo = dataCobertura.serieDispositivo;
            log.debug('marcadispositivo', serieDispositivo);

            var getDataDispositivoResult = modelGeneral.getDataDispositivo(serieDispositivo);
            log.debug('getDataDispositivoResult', getDataDispositivoResult);

            //validar a que plataforma debe apuntar
            function validaPlataforma() {
                var plataforma = '';

                var getCoberturaByIdResult = modelGeneral.getCoberturaById(idcobertura);

                log.debug('getCoberturaByIdResult', getCoberturaByIdResult);
                var descripcionproducto = getCoberturaByIdResult.descripcionproducto;

                //validar si incluye la palabra AMI
                if (descripcionproducto.includes('AMI')) {
                    plataforma = 'AMI';
                } else {
                    plataforma = 'PX';
                }

                return plataforma;

            }

            var plataforma = validaPlataforma();

            log.debug('plataforma', plataforma);

            log.debug('test.familiaProdructo', dataCobertura.familiaProdructo)

            var resultAmi
            var resultPx

            //validar si es AMI y armar JSON
            if (plataforma == 'AMI') {
                //armar JSON AMI
                var amiObject = {
                    "numeroorden": "0",
                    "plataforma": "AMI",
                    "codVehiculo": dataCobertura.codVehiculo,
                    "idVehiculo": dataCobertura.idVehiculo,
                    "placaVehiculo": dataCobertura.placaVehiculo,
                    "idMarcaVehiculo": dataCobertura.idMarcaVehiculo,
                    "marcaVehiculo": dataCobertura.marcaVehiculo,
                    "idModeloVehiculo": dataCobertura.idModeloVehiculo,
                    "modeloVehiculo": dataCobertura.modeloVehiculo,
                    "chasisVehiculo": dataCobertura.chasisVehiculo,
                    "motorVehiculo": dataCobertura.motorVehiculo,
                    "colorVehiculo": dataCobertura.colorVehiculo,
                    "anioVehiculo": dataCobertura.aniovehiculo,
                    "tipoVehiculo": dataCobertura.tipoVehiculo,
                    "idfamiliaProdructo": modelGeneral.getFamiliaProducto(dataCobertura.familiaProdructo).codigofamilia || "",
                    "familiaProdructo": modelGeneral.getFamiliaProducto(dataCobertura.familiaProdructo).descripcionfamilia || "",
                    "idmarcaDispositivo": getDataDispositivoResult.idmarcadispositivo || "",
                    "marcaDispositivo": getDataDispositivoResult.marcadispositivo || "",
                    "idmodeloDispositivo": getDataDispositivoResult.idmodelodispositivo || "",
                    "modeloDispositivo": getDataDispositivoResult.modelodispositivo || "",
                    "serieDispositivo": dataCobertura.serieDispositivo || "",
                    "vidDispositivo": dataCobertura.vidDispositivo || "",
                    "imeiDispositivo": dataCobertura.imeiDispositivo || "",
                    "direccionMacSim": getDataDispositivoResult.direccionMacSim || "",
                    "serieSim": getDataDispositivoResult.serieSim || "",
                    "numeroCelularSim": dataCobertura.numeroCelularSim || "",
                    "operadoraSim": dataCobertura.operadoraSim || "",
                    "estadoFamiliaProducto": { 1: "ACT", 2: "INA", 3: "PDA", 4: "SDI" }[dataCobertura.estadoCobertura],
                    "nemonicoUsuario": "OPERAD"
                }

                log.debug('amiObject', amiObject);

                //llamar servicio AMI
                var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaEstado(amiObject);
                log.debug('resultadoEnvio-amiObject', resultadoEnvio);
                resultAmi = resultadoEnvio;


            } else if (plataforma == 'PX') {

                var pxObject = {
                    "numeroorden": "0",
                    "plataforma": "PX",
                    "codVehiculo": dataCobertura.codVehiculo,
                    "idVehiculo": dataCobertura.idVehiculo,
                    "placaVehiculo": dataCobertura.placaVehiculo,
                    "idMarcaVehiculo": dataCobertura.idMarcaVehiculo,
                    "marcaVehiculo": dataCobertura.marcaVehiculo,
                    "idModeloVehiculo": dataCobertura.idModeloVehiculo,
                    "modeloVehiculo": dataCobertura.modeloVehiculo,
                    "chasisVehiculo": dataCobertura.chasisVehiculo,
                    "motorVehiculo": dataCobertura.motorVehiculo,
                    "colorVehiculo": dataCobertura.colorVehiculo,
                    "anioVehiculo": dataCobertura.aniovehiculo,
                    "tipoVehiculo": dataCobertura.tipoVehiculo,
                    "idfamiliaProdructo": modelGeneral.getFamiliaProducto(dataCobertura.familiaProdructo).codigofamilia || "",
                    "familiaProdructo": modelGeneral.getFamiliaProducto(dataCobertura.familiaProdructo).descripcionfamilia || "",
                    "idmarcaDispositivo": getDataDispositivoResult.idmarcadispositivo || "",
                    "marcaDispositivo": getDataDispositivoResult.marcadispositivo || "",
                    "idmodeloDispositivo": getDataDispositivoResult.idmodelodispositivo || "",
                    "modeloDispositivo": getDataDispositivoResult.modelodispositivo || "",
                    "serieDispositivo": dataCobertura.serieDispositivo || "",
                    "vidDispositivo": dataCobertura.vidDispositivo || "",
                    "imeiDispositivo": dataCobertura.imeiDispositivo || "",
                    "direccionMacSim": getDataDispositivoResult.direccionMacSim || "",
                    "serieSim": getDataDispositivoResult.serieSim || "",
                    "numeroCelularSim": dataCobertura.numeroCelularSim || "",
                    "operadoraSim": dataCobertura.operadoraSim || "",
                    "estadoFamiliaProducto": { 1: "ACT", 2: "INA", 3: "PDA", 4: "SDI" }[dataCobertura.estadoCobertura],
                    "nemonicoUsuario": "OPERAD"
                }

                log.debug('pxObject', pxObject);

                //llamar servicio PX
                var resultadoEnvio = NetSuiteUtilities.impulsoPlataformaEstado(pxObject);
                log.debug('resultadoEnvio-pxObject', resultadoEnvio);
                resultPx = resultadoEnvio;

            }

            //juntar resultados
            respuestaServicio = {
                "ami": resultAmi,
                "px": resultPx
            }

            log.debug('controllerCobertura-resultado', respuestaServicio);

            return respuestaServicio;

        } catch (error) {
            log.error('Error en controllerCobertura', error);
        }

    }


    return {
        actualizaEstadoPlataforma
        // Otros métodos
    };

});