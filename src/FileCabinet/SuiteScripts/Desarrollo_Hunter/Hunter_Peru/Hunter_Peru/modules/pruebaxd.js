/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/query', 'N/log'], function (query, log) {


    function _post(context) {

        log.debug('context', context);

        var sql = `
            select * from customer
            FETCH FIRST 2 ROWS ONLY
        `

        var resultSet = query.runSuiteQL({ query: sql });
        var results = resultSet.asMappedResults();

        return results;

    }

    return {
        post: _post
    }
});
