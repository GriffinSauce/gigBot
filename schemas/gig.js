/*globals require, module */

var mongoose = require('mongoose');
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
        _id:false,
        user: { type: String },
        available: {
            type: String,
            default: 'unknown',
            enum: ['unknown', 'no', 'yes']
        }
    }]
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

module.exports = mongoose.model('Gig', schema);

function cleanBreaks(string) {
    return string && string.replace ? string.replace(/(\r\n)/gm, '\n') : string;
}
function stripEndWhitespace(string) {
    return string && string.replace ? string.replace(/\s$/, '') : string;
}
