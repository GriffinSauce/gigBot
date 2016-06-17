/*globals require, module */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var schema = new Schema(
{
    id: {
        type: Schema.Types.ObjectId
    },
    started: {
        type: Date
    },
    completed: {
        type: Date
    },
    active: {
        type: Boolean
    },
    responses: [{
        _id: false,
        user: {
            type: String
        },
        date: {
            type: Date
        },
        available: {
            type: String,
            default: 'unknown',
            enum: ['unknown', 'no', 'yes']
        }
    }],
    gig: {
        id: {
            type: Schema.Types.ObjectId
        }
    }
});

module.exports = mongoose.model('Gig', schema);
