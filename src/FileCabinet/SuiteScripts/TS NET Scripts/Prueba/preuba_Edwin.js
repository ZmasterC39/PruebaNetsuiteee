/**
 *@NApiVersion 2.1
*@NScriptType ScheduledScript
*/
define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/log', 'N/file', 'N/task', "N/config"], (search, record, email, runtime, log, file, task, config) => {


    const execute = async (context) => {

        try {
            var customrecord_ht_pp_main_item_relacionadoSearchObj = search.create({
                type: "customrecord_ht_pp_main_item_relacionado",
                filters:
                    [
                        ["custrecord_ht_pp_parametrizacionir", "anyof", 28401]
                    ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_ht_pp_descripcionit", label: "Descripción" }),
                        search.createColumn({ name: "internalid", sort: search.Sort.DESC, label: "ID" })
                    ]
            });
            let searchResultCount = customrecord_ht_pp_main_item_relacionadoSearchObj.run().getRange(0, 1000);
            let relatedItemsArr = [];
            if (searchResultCount.length != 0) {
                for (let index = 0; index < searchResultCount.length; index++) {
                    relatedItemsArr.push(searchResultCount[index].getValue({ name: 'custrecord_ht_pp_descripcionit' }));
                }
            }
            log.error('relatedItemsArr',relatedItemsArr);
        } catch (error) {
            log.error('error',error)
        }
        
    }

    return {
        execute: execute
    }
});