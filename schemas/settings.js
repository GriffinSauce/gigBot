/*globals require, module */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var schema = new Schema(
{
    links: [
        {
            title: {
                type: String
            },
            url: {
                type: String
            }
        }
    ]
});

module.exports = mongoose.model('Settings', schema);
