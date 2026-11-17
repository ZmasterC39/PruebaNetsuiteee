/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 define(["N/search", "N/currentRecord", "N/ui/message", "N/url"], (
  search,
  currentRecord,
  message,
  url
) => { 
  let typeMode = "";

  const pageInit = (context) => { 
    typeMode = context.mode; //!Importante, no borrar.
  };

  const fieldChanged = (context) => {
   // return
    try {
    console.log("entra");
    //const objRecord = currentRecord.get();
    var objRecord = context.currentRecord;
    console.log("objRecord", objRecord);
    console.log("typeMode", typeMode);

    if (typeMode == "create" || typeMode == "copy" || typeMode == "edit") {
      var entity = objRecord.getText("entity");
      var entityCode = objRecord.getValue("entity");
      var subsidiary = objRecord.getValue("subsidiary");
      var BanksList = objRecord.getValue({fieldId:'custpage_entity_banks_list'});
      var fieldId = context.fieldId;
      var fieldIdCode =objRecord.getValue({fieldId: fieldId})
      
      console.log("entity", entity);
      console.log("entityCode", entityCode);
      console.log("subsidiary", subsidiary);
      console.log("BanksList", BanksList);
      console.log("fieldId", fieldId);
      console.log("fieldIdCode", fieldIdCode);
      if (subsidiary == 3)
      {
        
          console.log("Ingreso"); 
          objRecord.setValue({
            fieldId: "custbody_11187_pref_entity_bank",
            value: fieldIdCode,
            ignoreFieldChange: true,
          });
          
      }
    }

      } catch (e) {
                log.error({ title: 'fieldChanged', details: e });
            }
    
  };

  return {
    pageInit: pageInit,
    // saveRecord: saveRecord,
    fieldChanged: fieldChanged,
    //sublistChanged: sublistChanged
  };
});
