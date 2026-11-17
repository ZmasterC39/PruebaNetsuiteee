/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

define(['N/log','N/record','N/search','SuiteScripts/IntegracionesHunter/UtilsGeneral/HU_EC_CONSTANTES','N/query', 'SuiteScripts/IntegracionesHunter/Plantillas/Controllers/coberturaController'], function(log, record, search, _const, query, coberturaController){


   // CONVENIO MAREAUTO
   function _Get_ObtieneItemsConvenio(){
       try{
 
          let Resultado = [];
          //let condicion = ' and rel.custrecord_ht_pp_parametrizacionid = ' + '29012' ; //arma la condicion
           
          let ConsultaQuery = query.runSuiteQL({
           query: ` SELECT  DISTINCT i.id idns, i.itemid Codigo, i.displayname as descripcion, 
                     NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                           FROM	customrecord_ht_pp_main_param_prod rel, 
                                 CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param,
                                 CUSTOMRECORD_HT_CR_PP_VALORES val
                           where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                           and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                 and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                           and		rel.isinactive = 'F' 
                           and		param.isinactive = 'F'
                           and		param.custrecord_ht_pp_code = 'TTR'),'') transaccion,
                     NVL((	SELECT	top 1 concat(concat(nvl(val.custrecord_ht_pp_codigo,''), ' | '), nvl(val.custrecord_ht_pp_descripcion,'')) codigo 
                           FROM	customrecord_ht_pp_main_param_prod rel, 
                                 CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU param, 
                                 CUSTOMRECORD_HT_CR_PP_VALORES val
                           where	i.id = rel.custrecord_ht_pp_parametrizacionid 
                           and		rel.custrecord_ht_pp_parametrizacion_rela = param.id
                                 and     rel.custrecord_ht_pp_parametrizacion_valor = val.id
                           and		rel.isinactive = 'F' 
                           and		param.isinactive = 'F'
                           and		param.custrecord_ht_pp_code = 'FAM'),'') grupoproducto
                  FROM	item i 
                  where	i.isinactive = 'F' 
                  and		i.itemtype in ('Assembly','Service','InvtPart')
                  and		i.id is not null 
                  and		i.id <> 0 
                  AND		LENGTH(i.itemid)<= 6
                  AND exists( select	top 1 1 
                           from	customrecord_ht_pp_main_param_prod r,
                                 CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU p,
                                       CUSTOMRECORD_HT_CR_PP_VALORES val 
                           where	r.custrecord_ht_pp_parametrizacionid = i.id 
                           and		r.custrecord_ht_pp_parametrizacion_rela = p.id 
                           and		p.custrecord_ht_pp_code = 'FAM'
                                       AND val.custrecord_ht_pp_codigo in('BM','MH','TM') 
                           and 	r.custrecord_ht_pp_parametrizacion_valor = val.id
                        )
                  AND exists( select	top 1 1 
                           from	customrecord_ht_pp_main_param_prod r,
                                 CUSTOMRECORD_HT_CR_PARAMETRIZACION_PRODU p,
                                       CUSTOMRECORD_HT_CR_PP_VALORES val 
                           where	r.custrecord_ht_pp_parametrizacionid = i.id 
                           and		r.custrecord_ht_pp_parametrizacion_rela = p.id 
                           and		p.custrecord_ht_pp_code = 'ADP'
                                 AND val.custrecord_ht_pp_codigo in('001','002') 
                           and 	  r.custrecord_ht_pp_parametrizacion_valor = val.id
                  ) `,
         });

         let ResProd = ConsultaQuery.asMappedResults();
 
         if (ResProd.length > 0 ){
             ResProd.forEach(function(record) {
                Resultado.push({

                  IdProducto: record.idns,
                  Producto: record.codigo,
                  Descripcion: record.descripcion,
                  Transaccion: record.transaccion,
                  Grupo: record.grupoproducto
                  
                });
             });
         } else{
             Resultado.push({
                Item: 0
             });
         }
 
         return Resultado;
 
       } catch (error) {
          log.error('error', error);
          return 'id:400, No se encontraron resultados. Error controlado. (ObtieneProductoPiv)';
       }
    }


   return {
       get: _Get_ObtieneItemsConvenio

   }
});