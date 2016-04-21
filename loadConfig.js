var _ = require('lodash');
var config = require('./config.json');
var secrets = require('./secrets.json');
_.merge(config, secrets);

config.env = process.env.NPM_CONFIG_PRODUCTION === true ? 'prod' : 'local';

console.log('Running with config: ', config);

module.exports = config;
