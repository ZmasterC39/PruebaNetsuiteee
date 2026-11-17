/**
 * @NApiVersion 2.1
 */
define([
    'N/https',
    './HU_EC_CONSTANTES'
], 
(https, _const) => {

    const loginGetToken = () => {        
        try {

            let dataToSend = {
                "usuarioAPI": _const.Constants.USER_API,
                "passAPI": _const.Constants.PASS_API
            };
    
            let headers = {
                'Content-Type': 'application/json',
            };
    
            let options = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(dataToSend)
            };

            let response = https.post({
                url: _const.URLS.HUNTER_API_NETSUITE + '/Login',
                body: options.body,
                headers: options.headers
            });

            if (response.code === 200) {
                let responseBody = JSON.parse(response.body);
                return responseBody.token;
            } else {
                log.error('HTTP Error', `Status Code: ${response.code}, Response Body: ${response.body}`);
                return ""
            }
        } catch (error) {
            log.error('Exception', `Error while sending request: ${error.message}`);
            return ""
        }
    }

    return {
        loginGetToken
    }
})