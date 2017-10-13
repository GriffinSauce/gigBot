/*globals require, module */

var mongoose = require('../lib/mongoose');
var Schema = mongoose.Schema;
var schema = new Schema(
{
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User', schema);
