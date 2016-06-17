/*globals require, module */

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var schema = new Schema(
{
    users: [{
        _id: false,
        requiredForGigs: {
            type: Boolean,
            default: true
        },

        // slack properties
        id: {
            type: String
        },
        team_id: {
            type: String
        },
        name: {
            type: String
        },
        deleted: {
            type: Boolean
        },
        color: {
            type: String
        },
        real_name: {
            type: String
        },
        tz: {
            type: String
        },
        tz_label: {
            type: String
        },
        tz_offset: {
            type: Number
        },
        profile: {
            type: Schema.Types.Mixed
        }
        // /slack properties
    }],
    links: [{
        _id: false,
        title: {
            type: String
        },
        url: {
            type: String
        }
    }],
    slackToken: {
        type: String
    }
});

module.exports = mongoose.model('Settings', schema);
