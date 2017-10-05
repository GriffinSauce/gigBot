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

if(config.env === 'prod' && process.env.LOGENTRIES_KEY) {
    logger.add(winston.transports.Logentries, {
        token: process.env.LOGENTRIES_KEY,
        levels: {
            'debug': 4,
            'info': 3,
            'notice': 2,
            'warn': 1,
            'error': 0
        }
    });
}

module.exports = logger;
