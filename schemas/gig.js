/*globals require, module */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema(
{
    id: {
        type: Schema.Types.ObjectId
    },
    date: {
        type: String
    },
    venue: {
        name: {
            type: String
        },
        address: {
            type: String
        }
    },
    times: {
        type: String
    },
    confirmed: {
        type: Boolean
    },
    backline: {
        type: String
    },
    comments: {
        type: String
    }
});

module.exports = mongoose.model('Gig', schema);