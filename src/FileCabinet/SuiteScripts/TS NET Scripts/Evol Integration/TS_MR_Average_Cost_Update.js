/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(["N/search", "N/https", "N/cache"], (search, https, cache) => {

    const AUTHORIZATION_CACHE_NAME = "AUTHORIZATION_CACHE_NAME";
    const AUTHORIZATION_KEY = "authorization";
    const UPDATE_PRODUCT_AVERAGE_COST_SALESFORCE_SERVICE = "3";

    const getInputData = (context) => {
        try {
            //cleanCache();
            return getItemSearch();
        } catch (error) {
            log.error("ERROR [GetInputData] function", error);
        }
    }

    const map = (context) => {
        try {
            let key = context.key;
            let result = JSON.parse(context.value);
            log.error("result", result);
            let authorization = getAuthorizationFromCache();
            let response = updateProductAverageCost(authorization, result);
            log.error("response", response);
        } catch (error) {
            log.error("ERROR [Map] function", error);
        }
    }

    const getAuthorization = () => {
        let authenticationValues = getAuthenticationRecord();
        //log.error("authenticationValues", authenticationValues);
        if (!authenticationValues) return "";
        let headers = authenticationValues.headers;
        let url = authenticationValues.url;
        let body = authenticationValues.body;
        let response = https.post({
            headers,
            url,
            body
        });
        return response.body;
    }

    const getAuthenticationRecord = () => {
        let authenticationResult = search.create({
            type: "customrecord_ts_autenticacion_salesforce",
            filters: [
                ["isinactive", "is", "F"],
                "AND",
                ["name", "is", "UPDATE_PRODUCT_AVERAGE_COST_AUTHORIZATION"]
            ],
            columns: [
                "custrecord_ts_autentic_sf_url",
                "custrecord_ts_autentic_sf_headers",
                "custrecord_ts_autentic_sf_client_id",
                "custrecord_ts_autentic_sf_client_secret",
                "custrecord_ts_autentic_sf_username",
                "custrecord_ts_autentic_sf_password",
                "custrecord_ts_autentic_sf_grant_type"
            ]
        }).run().getRange(0, 1);

        if (authenticationResult.length) {
            return {
                url: authenticationResult[0].getValue("custrecord_ts_autentic_sf_url"),
                headers: JSON.parse(authenticationResult[0].getValue("custrecord_ts_autentic_sf_headers")),
                body: {
                    client_id: authenticationResult[0].getValue("custrecord_ts_autentic_sf_client_id"),
                    client_secret: authenticationResult[0].getValue("custrecord_ts_autentic_sf_client_secret"),
                    username: authenticationResult[0].getValue("custrecord_ts_autentic_sf_username"),
                    password: authenticationResult[0].getValue("custrecord_ts_autentic_sf_password"),
                    grant_type: authenticationResult[0].getValue("custrecord_ts_autentic_sf_grant_type")
                }
            }
        }
    }

    const getAuthorizationFromCache = () => {
        const authorizationCache = cache.getCache({
            name: AUTHORIZATION_CACHE_NAME
        });
        const authorizationJson = authorizationCache.get({
            key: AUTHORIZATION_KEY,
            loader: getAuthorization,
            ttl: 6000
        });
        return JSON.parse(authorizationJson);
    }

    const getSalesForceServiceById = (salesForceServiceId) => {
        let servicesValues = search.lookupFields({
            type: "customrecord_ts_servicios_salesforce",
            id: salesForceServiceId,
            columns: ["custrecord_ts_servicios_sf_url", "custrecord_ts_servicios_sf_metodo", "custrecord_ts_servicios_sf_headers"]
        });

        return {
            headers: JSON.parse(servicesValues.custrecord_ts_servicios_sf_headers),
            method: servicesValues.custrecord_ts_servicios_sf_metodo,
            url: servicesValues.custrecord_ts_servicios_sf_url
        };
    }

    const updateProductAverageCost = (authorization, values) => {
        try {
            let updateProductAverageCost = getSalesForceServiceById(UPDATE_PRODUCT_AVERAGE_COST_SALESFORCE_SERVICE);
            //log.error("getProductById", updateProductAverageCost);
            let headers = updateProductAverageCost.headers;
            headers.Authorization = `${authorization.token_type} ${authorization.access_token}`;
            let url = updateProductAverageCost.url;
            let method = updateProductAverageCost.method
            let body = JSON.stringify(getBodyRequest(values));
            //log.error("body", body);
            let response = https.request({
                method,
                headers,
                url,
                body
            });
            return JSON.parse(response.body);
        } catch (error) {
            log.error("updateProductAverageCost", error);
        }
    }

    const getItemSearch = () => {
        let itemsResult = [];
        let newSearch = search.create({
            type: "inventoryitem",
            filters: [
                ["externalid", "noneof", "@NONE@"],
                "AND",
                ["isinactive", "is", "F"]
            ],
            columns: [
                search.createColumn({ name: "externalid", label: "ID externo" }),
                search.createColumn({ name: "averagecost", label: "Costo promedio" }),
            ]
        });

        let pagedData = newSearch.runPaged({ pageSize: 1000 });
        pagedData.pageRanges.forEach(function (pageRange) {
            let page = pagedData.fetch({
                index: pageRange.index
            });
            page.data.forEach(function (result) {
                let externalId = result.getValue("externalid");
                let averageCost = Number(result.getValue("averagecost")) || 0;
                itemsResult.push({
                    externalId,
                    averageCost
                });
            });
        });
        log.error("itemsResult.length", itemsResult.length);
        return itemsResult;
    }

    const getBodyRequest = (values) => {
        let body = {
            productList: [{
                productId: values.externalId,
                averageCost: values.averageCost
            }]
        };
        return body;
    }

    return {
        getInputData,
        map
    }
})