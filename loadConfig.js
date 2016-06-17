var config = require('./config.json');

config.env = process.env.NODE_ENV;
config.env = config.env === 'production' ? 'prod' : config.env;
if(!config.env) {
    console.log('No env, defaulting to local');
    config.env = 'local';
}

console.log('Running with config: ', config);

module.exports = config;
