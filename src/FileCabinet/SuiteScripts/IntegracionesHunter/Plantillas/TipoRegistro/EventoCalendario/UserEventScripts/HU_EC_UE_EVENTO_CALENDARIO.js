/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/runtime'],
    
    (runtime) => {

        const beforeSubmit = (context) => {
          
          try {
            const subsidiary = runtime.getCurrentUser().subsidiary;
            if (subsidiary != 2) {
                return 
            }
            
            const rec = context.newRecord;
               rec.setValue({
                 fieldId: 'accesslevel',
                 value: 'PUBLIC'
               });            
          } catch (error) {
              log.debug("Err", error )
          }

        };
      
        const beforeLoad = (scriptContext) => {
            try{
                if (scriptContext.type === 'view') {

                    var custScript = "customscript_hu_ec_st_evento_calendario";
                    var custDeploy = "customdeploy_hu_ec_st_evento_calendario";
    
                    const form = scriptContext.form;
                    let objRecord = scriptContext.newRecord;
                    var id = objRecord.id;
                    var type = objRecord.type;
                    var transaction = objRecord.getValue({fieldId: 'transaction'}) ?? '';

                    if(transaction){
                        form.addButton({                            
                            id: "custpage_print_ot_custom_button",
                            label: "Imprimir OT",
                            functionName: `customButtonFunction('${type}','${id}','${custScript}','${custDeploy}')`
                        });
                        form.clientScriptModulePath = 'SuiteScripts/IntegracionesHunter/Plantillas/ClientScripts/HU_EC_CS_STANDARD_PDF.js'
                    }
                }          
            }catch(error){
                log.error('Error', error);
            }              
        }
        return {beforeLoad, beforeSubmit}
    }
    
)
