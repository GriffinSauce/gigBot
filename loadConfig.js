var _ = require('lodash');
var config = require('./config.json');
var secrets = {};

// Try local file for secrets, if none was found catch error and try the environment variables
try {
    secrets = require('./secrets.json');
}
catch (e) {
    console.log(e);
    secrets = {
        token: process.env.TOKEN,
        google: {
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY
        }
    };
}
_.merge(config, secrets);

console.log(config);

// Whoop, got config, GOGOGO!
module.exports = config;

// TODO: Find a less ridiculous solution for this
