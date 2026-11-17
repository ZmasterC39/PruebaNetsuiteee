/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
 define(['N/log','N/record','N/search','N/query','./UtilsGeneral/HU_EC_CONSTANTES'], function(log, record, search, query, _const) {
    const LONGITUD_PAGINA = 300;
    const PaisConsulta = 'EC';
    let OrigenConsulta = 'WEB'; //PARA CONTROLAR LA RESPUESTA, SI ES WEB DB DEVOLVER VACIO, SI ES SQL DB RETORNAR TABLA
    var GlobalSubsidiaria = _const.Constants.SUBSIDIARIA_EC;
       
    function _get(context){
        try{
                let CodigoTabla = context.codigotabla;
                let ResultadoConsulta = [];

                switch (CodigoTabla) {
                    case "FAC_FIN":
                        let IdFacturaNS = "";
                        let ReferenciaFactura = "";
                        let Fechafac = "";
                        let Pagina = 1;

                        if (typeof context.idfacturans != 'undefined') {
                            if (context.idfacturans.length != 0) {
                                IdFacturaNS = context.idfacturans;
                            }
                        }
                    
                        if (typeof context.referenciafactura != 'undefined') {
                             if (context.referenciafactura.length != 0) {
                                     ReferenciaFactura = context.referenciafactura;
                             }
                        }

                        if (typeof context.fechafactura != 'undefined') {
                             if (context.fechafactura.length != 0) {
                                     Fechafac = context.fechafactura;
                             }
                        }

                        if (typeof context.pagina != 'undefined') {
                             if (context.pagina.length != 0) {
                                     Pagina = context.pagina;
                             }
                        }
                    
                        ResultadoConsulta = ConsultaFacturas(IdFacturaNS, ReferenciaFactura, Fechafac, Pagina);
                        break;

                    default: 
                        return 'id:400, opcion no valida';
                }
        
                return ResultadoConsulta;
        }catch (error) {
            return 'id:400, No se encontraron resultados.';
        }    
    }

   function ConsultaFacturas(idFactura, RefFactura, FechaFactura, Indice){
        try{

            let filtroFactura = "";
            let filtroReferencia = "";
            let filtroFechaFactura = "";

            let pagina = Indice;
            let tamanioPagina = LONGITUD_PAGINA;

            let desde = ((pagina - 1) * tamanioPagina) + 1;
            let hasta = pagina * tamanioPagina;           

            if (idFactura) {
                filtroFactura = `AND FREL.CUSTRECORD_NRO_FACTURA = ${idFactura}`;
            }

            if (RefFactura) {
                filtroReferencia = `AND FAC.TRANID = '${RefFactura}'`;
            }

            if (!idFactura && !RefFactura)
            {
                if (FechaFactura) {
                    FechaFactura = FechaFactura.replace(/-/g, '/');
                    filtroFechaFactura = `AND TRUNC(FAC.CREATEDDATE) = '${FechaFactura}'`;
                } else {
                    filtroFechaFactura = `AND 	TRUNC(FAC.CREATEDDATE) = TRUNC(CURRENT_TIMESTAMP)`;
                }
            }          
            
            let FacturasQuery = query.runSuiteQL({
                query: `SELECT  *
                        FROM    (    
                                SELECT  ROW_NUMBER() OVER (ORDER BY ID_FAC) AS SECUENCIA, --SE APLICA A ESTA NIVEL PARA Q LA SECUENCIA NO SE CORTE
                                        COUNT(*) OVER() AS MAXREGISTROSRS,
                                        T.*
                                FROM    (    SELECT 	SUM(FIN.TOTAL) OVER(PARTITION BY FREL.CUSTRECORD_NRO_FACTURA) AS TOTAL_SUMA_FIN,
                                                    FREL.CUSTRECORD_NRO_FACTURA_INTERNA ID_FIN, 
                                                    FREL.CUSTRECORD_NRO_FACTURA ID_FAC, 
                                                    FREL.CUSTRECORD_ORDEN_SERVICIO ID_OS, 
                                                    FREL.CREATED FECHA_REL, 
                                                    FIN.TRANID FIN, 
                                                    FIN.TOTAL TOTAL_FIN,
                                                    FIN.EMAIL EMAIL_FIN, 
                                                    FAC.TRANID FAC_COD, 
                                                    FAC.CUSTBODY_HT_OS_CORREOCLIENTE EMAIL_FAC, 
                                                    FAC.CREATEDDATE FECHA_FAC,
                                                    FAC.duedate FECHA_VENCIMIENTO,
                                                    (   SELECT  ABS(SUM(TL.NETAMOUNT))
                                                        FROM    TRANSACTIONLINE TL
                                                        WHERE   TL.TRANSACTION = FAC.ID
                                                        AND     TL.MAINLINE = 'F'
                                                        AND     TL.TAXLINE = 'F'
                                                    ) SUBTOTAL,                         
                                                    OS.TRANID OS_COD, 
                                                    OS.CREATEDDATE FECHA_OS, 
                                                    OS.CUSTBODY_HT_SO_BIEN VEHICULO, 
                                                    (   SELECT 	MAR.NAME
                                                        FROM 	customrecord_ht_bien_marca MAR
                                                        WHERE	MAR.ID = VH.custrecord_ht_bien_marca    ) MARCA,
                                                    (   SELECT 	MDA.NAME
                                                        FROM 	customrecord_ht_bn_modelo MDA
                                                        WHERE	MDA.ID = VH.custrecord_ht_bien_modelo   ) MODELO,
                                                    VH.CUSTRECORD_HT_BIEN_CHASIS CHASIS, 
                                                    VH.CUSTRECORD_HT_BIEN_MOTOR MOTOR, 
                                                    VH.CUSTRECORD_HT_BIEN_PLACA PLACA, 
                                                    OS.TYPE TIPO_OS, 
                                                    FAC.ENTITY ID_CLIENTE_NS, 
                                                    CLI.VATREGNUMBER IDENTIFICACION, 
                                                    NVL(CLI.FULLNAME,'') IDENTIFICACION_NOMBRE, 
                                                    NVL(CLI.CUSTENTITY_HT_CL_PRIMERNOMBRE, '') PRIMERNOMBRE, 
                                                    NVL(CLI.CUSTENTITY_HT_CL_APELLIDOPATERNO, '') APELLIDOPATERNO, 
                                                    NVL(CLI.CUSTENTITY_HT_CL_APELLIDOMATERNO, '') APELLIDOMATERNO, 
                                                    CLI.ALTNAME NOMBRE_COMPLETO,
                                                    CLI.COMPANYNAME NOMBRE_EMPRESA,
                                                    (
                                                        select 	FPA.NAME
                                                        from 	customrecord_ht_termino_pago_rel FPA 
                                                        where 	FPA.custrecord_ht_termino_pago_termino = FAC.TERMS
                                                    ) FORMA_PAGO,                                    
                                                    ${pagina} as pagina
                                            FROM 	CUSTOMRECORD_HT_FACT_INTERNAS_ASOCIADAS FREL,
                                                    TRANSACTION FIN,
                                                    TRANSACTION FAC,
                                                    TRANSACTION OS,
                                                    CUSTOMRECORD_HT_RECORD_BIENES  VH,
                                                    CUSTOMER CLI
                                            WHERE	FIN.ID = FREL.CUSTRECORD_NRO_FACTURA_INTERNA
                                            AND 	FAC.ID = FREL.CUSTRECORD_NRO_FACTURA
                                            AND 	OS.ID = FREL.CUSTRECORD_ORDEN_SERVICIO
                                            AND 	OS.CUSTBODY_HT_SO_BIEN = VH.ID
                                            AND 	FAC.ENTITY = CLI.ID
                                            ${filtroFechaFactura}
                                            ${filtroFactura}
                                            ${filtroReferencia}
                                            AND 	OS.TYPE = 'SalesOrd'
                                            --AND 	FIN.TYPE = 'CuTrSale'
                                            --AND 	FAC.TYPE = 'CustInvc'
                                            AND 	EXISTS	(	SELECT 	TOP 1 1
                                                                FROM 	TRANSACTIONLINE DET 
                                                                WHERE 	DET.TRANSACTION = FREL.CUSTRECORD_ORDEN_SERVICIO
                                                                AND 	DET.SUBSIDIARY = ${GlobalSubsidiaria}	)
                                    ) T
                                     WHERE   ABS(T.TOTAL_SUMA_FIN - T.SUBTOTAL) < 0.01   -- el filtro se aplica AQUÍ
                        ) FF
                        WHERE   FF.SECUENCIA BETWEEN ${desde} AND ${hasta}
                        ORDER BY FF.ID_FAC`                 });

            let Resultado = FacturasQuery.asMappedResults();

            //valido si existe alguna coma lo reemplace por *
            Resultado.forEach(registro => {
                Object.keys(registro).forEach(campo => {
                    if (registro[campo] === null || registro[campo] === undefined) {
                        registro[campo] = '';
                    } else if (typeof registro[campo] === 'string') {
                        registro[campo] = registro[campo].replace(/,/g, '*');
                    }
                });
            });

            if (Resultado.length === 0) {
                Resultado.push({
                    SECUENCIA: '',
                    MAXREGISTROSRS: '',
                    TOTAL_SUMA_FIN: '',
                    ID_FIN: '',
                    ID_FAC: '',
                    ID_OS: '',
                    FECHA_REL: '',
                    FIN: '',
                    TOTAL_FIN: '',
                    EMAIL_FIN: '',
                    FAC_COD: '',
                    EMAIL_FAC: '',
                    FECHA_FAC: '',
                    FECHA_VENCIMIENTO: '',
                    SUBTOTAL: '',
                    OS_COD: '',
                    FECHA_OS: '',
                    VEHICULO: '',
                    MARCA: '',
                    MODELO: '',
                    CHASIS: '',
                    MOTOR: '',
                    PLACA: '',
                    TIPO_OS: '',
                    ID_CLIENTE_NS: '',
                    IDENTIFICACION: '',
                    IDENTIFICACION_NOMBRE: '',
                    PRIMERNOMBRE: '',
                    APELLIDOPATERNO: '',
                    APELLIDOMATERNO: '',
                    NOMBRE_COMPLETO: '',
                    NOMBRE_EMPRESA: '',
                    FORMA_PAGO: '',
                    pagina: ''
                    // registros: ''
                });
            }
           
            return Resultado;       

        } catch (error) {
            return 'id:400, No se encontraron resultados. (ConsultaFacturas)';
        } 

    }

   function _post(context) {
  
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