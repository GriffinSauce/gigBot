var config;

// Try local file, if none was found (-> node throws an error) try the environment variables
try {
    config = require('./config');
}
catch (e) {
    console.log('No config found, trying ENV vars');
    config = process.env.CONFIG;
}
if(!config) {
    throw(new Error('No config was found in files or environment'));
}

// Whoop, got config, GOGOGO!
module.exports = config;
