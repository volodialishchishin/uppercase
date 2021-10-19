'use strict';

module.exports = (config, logger) => {

    var LambdaProxy = require('./lambda')(config, logger);

    var saveActivity = (app, user, activity) => {
        LambdaProxy.request({
            lambdaFunction: config['activity-stream.lambda.driver'],
            qualifier: config['activity-stream.lambda.driver.version'],
            payload: {
                app: app,
                env: config.env,
                user: user,
                activity: activity
            }
        })
            .then(() => logger.debug('Activity saved succesfully'))
            .catch(err => logger.warn('Error saving Activity [%s]', err));
    }

    return {
        saveActivity
    };
};