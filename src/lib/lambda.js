'use strict';

var AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

var lambda = new AWS.Lambda();

module.exports = (config, logger) => {
    var request = (options) =>
        new Promise((resolve2, reject2) => {
            var _invoke = () =>
                new Promise((resolve, reject) => {
                    // var payloadBody = {
                    //     method: options.method || 'GET',
                    //     url: options.url,
                    //     headers: options.headers || {},
                    //     query: options.query || {},
                    //     body: options.body || {},
                    //     rejectUnauthorized: false
                    // };

                    logger.debug('options.lambdaFunction: %s', options.lambdaFunction);

                    var reqParams = {
                        FunctionName: options.lambdaFunction, //config['support.lambda.function'],
                        Payload: JSON.stringify(options.payload), //JSON.stringify(payloadBody)
                    };

                    logger.debug('Calling backend API with params: %s', JSON.stringify(reqParams));

                    lambda.invoke(reqParams, (error, data) => {
                        logger.debug('LambdaProxy error returned: %s', error);
                        logger.debug('LambdaProxy data returned: %o', JSON.stringify(data).substring(0, 100));

                        if (error || data.StatusCode !== 200) {
                            logger.error('Lambda proxy error: %s', error);
                            return reject('Labmda proxy error');
                        }

                        var respPayload = !!data.Payload && JSON.parse(data.Payload);

                        if (!!respPayload) {
                            if (!!respPayload.error || (!!respPayload.status && respPayload.status !== 200)) {
                                logger.error('respPayload: %s', respPayload);
                                logger.error('Lambda proxy Payload error: %s', respPayload.error);
                                return reject('Labmda proxy Payload error');
                            }

                            var respData = respPayload.body || respPayload.resp || {};
                            logger.debug('Backend API response: %s', JSON.stringify(respData).substring(0, 100));

                            // Lambda callback gives error as null, and error message in body.
                            if (respData.status === 'error' || (!!respData.statusCode && respData.statusCode !== 200)) {
                                return reject(respData || 'Lambda proxy Response error');
                            }

                            resolve(respData);
                        }
                        else {
                            return resolve(respPayload);
                        }
                    });
                });

            _invoke()
                .then(data => resolve2(data))
                .catch(error => reject2(error));
        });

    return {
        request: request
    };
};