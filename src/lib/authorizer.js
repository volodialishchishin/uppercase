module.exports = (config, logger) => {

    var authorize = (req, res, next) => {
        logger.debug('req.headers: %s', JSON.stringify(req.headers));

        var user = {
            id: req.headers['X-Support-Api-User-Id'.toLowerCase()]
        };

        if (!!user.id) {
            req.user = user;
            next();
        }
        else {
            logger.error('Unauthorized! Missing user info');
            res.sendStatus(403);
        }
    };

    return {
        authorize
    };
};