var _ = require('lodash');
var config = require('./config.json');
var secrets = require('./secrets.json');
_.merge(config, secrets);

config.env = process.env.NODE_ENV;
if(!config.env) {
    console.log('No env, defaulting to local');
    config.env = 'local';
}

console.log('Running with config: ', config);

module.exports = config;
