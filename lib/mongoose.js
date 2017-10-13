var mongoose = require('mongoose');
var log = require('../lib/logging');
var config = require('../loadConfig');
mongoose.Promise = global.Promise;

if(config.env == 'local') {
    mongoose.connect('mongodb://127.0.0.1/gigbot');
} else if (config.env == 'test') {
    mongoose.connect('mongodb://127.0.0.1/gigbot_test');
}else {
    mongoose.connect(process.env.MONGODB_URL + 'gigbot', { db: { nativeParser: true } });
}

var db = mongoose.connection;
db.on('error', function (err) {
    log.error('connection error', err);
    throw err;
});
db.once('open', function () {
    log.verbose('Connected to the database');
});

module.exports = mongoose;
