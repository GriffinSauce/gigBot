/*globals require, module */

var mongoose = require('../lib/mongoose');
var moment = require('moment');
var Schema = mongoose.Schema;
var schema = new Schema(
{
    id: {
        type: Schema.Types.ObjectId
    },
    date: {
        type: Date
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
    backline: {
        type: String
    },
    comments: {
        type: String
    },
    confirmed: {
        type: Boolean
    },
    availability: [{
        _id: false,
        user: {
            type: String
        },
        available: {
            type: String,
            default: 'unknown',
            enum: ['unknown', 'no', 'yes']
        }
    }],
    request: {
        started: {
            type: Date
        },
        completed: {
            type: Date
        },
        active: {
            type: Boolean
        }
    }
});

schema.pre('save', function(next) {

    this.date = moment(this.date).startOf('day');

    // Rewrite break/newline+whitespace to single \n character
    if(this.venue && this.venue.address) {
        this.venue.address = cleanBreaks(this.venue.address);
        this.venue.address = stripEndWhitespace(this.venue.address);
    }
    if(this.times) {
        this.times = cleanBreaks(this.times);
        this.times = stripEndWhitespace(this.times);
    }
    if(this.backline) {
        this.backline = cleanBreaks(this.backline);
        this.backline = stripEndWhitespace(this.backline);
    }
    if(this.comments) {
        this.comments = cleanBreaks(this.comments);
        this.comments = stripEndWhitespace(this.comments);
    }
    next();
});

schema.index({
    'venue.name': 'text',
    'venue.address': 'text',
    'times': 'text',
    'backline': 'text',
    'comments': 'text',
    "$**": "text"
});

function cleanBreaks(string) {
    return string && string.replace ? string.replace(/(\r\n)/gm, '\n') : string;
}
function stripEndWhitespace(string) {
    return string && string.replace ? string.replace(/\s$/, '') : string;
}

module.exports = mongoose.model('Gig', schema);
