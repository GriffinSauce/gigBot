var winston = require('winston');
var Logger = require('le_node');
var config = require('../loadConfig');

var logger = new (winston.Logger)({
    transports: [
        new winston.transports.Console({
            level: 'verbose',
            prettyPrint: true,
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

if(config.env === 'prod') {
    logger.add(winston.transports.Logentries, {
        token: config.logEntries.token
    });
}

module.exports = logger;
