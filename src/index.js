var AWS = require('aws-sdk');

const upperCase = (s) => {
    let a =  s.replace(/([-_][a-z])/ig, ($1) => {
        return   $1.toUpperCase()
            .replace('-', '')
            .replace('_', '')
    });
    return a.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase()
};

module.exports = (app, configMgr, logger) => {v

    var config = configMgr.getConfig();
    var s3Region = config['alerts.s3.region'] || 'us-east-1';
    var s3Bucket = config['alerts.s3.bucket'];

    var Authorizer = require('./lib/authorizer')(config, logger);
    var BackendApi = require('./lib/backend')(config, logger);

    var s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        httpOptions: {
            timeout: 30000
        },
        region: s3Region,
        bucket: s3Bucket
    });

    var getOpts = (req, res, next) => {
        var options = {};

        Object.keys(req.query).forEach(param => options[param] = req.query[param]);
        Object.keys(req.params).forEach(param => options[param] = req.params[param]);

        req.opts = options;

        logger.debug('Request options: %s', JSON.stringify(req.opts));

        next();
    };

    var saveAlerts = (req, res, key, value) => {
        if (!!s3) {
            logger.debug('saving key [%s] and value [%s] to S3', key, JSON.stringify(value));

            s3.upload({
                ACL: 'private',
                Bucket: s3Bucket,
                Key: key + '.json',
                Body: JSON.stringify(value),
                ContentType: 'application/json'
            }, (err, data) => {
                if (err) {
                    logger.error('Error while saving alerts (%s) to S3: %s', key, err);

                    res.status(400).send({
                        message: 'Error while saving alerts ['+key+']'
                    });
                }
                else {
                    BackendApi.saveActivity('support-api', req.user.id, ' updated alerts in ' + upperCase(req.opts.env) + ' successfully [' + JSON.stringify(value) + ']');

                    logger.debug('Alerts [%s] uploaded successfully: %s', key, JSON.stringify(data));

                    res.send({
                        status: 'OK',
                        body: 'Alerts SAVE successful ['+key+']'
                    });
                }
            });
        }
        else {
            logger.error('s3 storage unreachable');
            res.status(400).send('Storage unreachable');
        }
    };

    var getAlerts = (req, res, key) => {
        if (!!s3) {
            logger.debug('getting key [%s] from S3', key);

            s3.getObject({
                Bucket: s3Bucket,
                Key: key + '.json'
            }, (err, data) => {
                if(!err && data) {
                    res.send(JSON.parse(data.Body));
                }
                else {
                    logger.warn('Warning: Could not get alerts (%s) from S3: %s', key, err.toString());

                    res.send({
                        status: 'OK',
                        body: {}
                    });
                }
            });
        }
        else {
            logger.error('s3 storage unreachable');
            res.status(400).send('Storage unreachable');
        }
    };

    app.post('/api/v1/alert', Authorizer.authorize, getOpts, (req, res) => {
        var o = req.opts;
        var key = ['alerts-', o.env].join('');

        saveAlerts(req, res, key, req.body);
    });

    app.get('/api/v1/alert', getOpts, (req, res) => {
        var o = req.opts;
        var key = ['alerts-', o.env].join('');

        getAlerts(req, res, key);
    });

    logger.info('Alerts service Activated');
};