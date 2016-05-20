var _ = require('lodash');

var Gig = require('./schemas/gig.js');

var trigger = /navigate\sto\s(.*)/i;

// What triggers the script
module.exports.trigger = trigger;

// Middleware to find any required context
module.exports.determineContext = function(message, context, next) {
    var subject = message.match(trigger);

    // Assume context is already there
    if(subject === 'it') {
        return next(null, message, context);
    }

    // Find gig by query, add to context and continue
    return Gig.find({
        $text: { $search: subject }
    }, function(err, gig){
        context.gig = gig;
        next(err, message, context);
    });
};

// Handle message in context and respond
module.exports.handler = function(message, context, respond){

    // Missing context
    if(!context.gig) {
        return respond({
            text: 'Which gig are you talking about?',
            expectsFeedback: true // Means this handler will be called again when the user responds
        });
    }

    // Respond with smart reply
    return respond({
        text: 'Just go to '+_.get(context, 'gig.venue.address')
    });
};

