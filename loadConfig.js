var _ = require('lodash');
var config = require('./config.json');
var secrets = require('./secrets.json');
_.merge(config, secrets);

console.log('Running with config: ', config);

module.exports = config;
