var _ = require("lodash");
var async = require("async");
var data = require('./services/data');

// Services
var messages = require('./services/messages');

async.series([
    function(cb){
        data.init(cb);
    },
    function(cb){
        // Build cache #yolo
        data.getGigs(function(){});

        // Initialize message hooks
        messages.init(function(){
            // callback, messages is (probably) online!
            console.log('Message service online');

            // Reply to any message containing "reply"
            messages.listenFor('reply', function(message){
                messages.send({
                    "channel": message.channel,
                    "text": "Sure, hi!"
                });
            });

            // Reply to any message containing "list gigs"
            messages.listenFor('list gigs', function(message){
                data.getGigs(function(gigs){
                    var text = "*All gigs:*\n";
                    gigs = _.map(gigs, renderGigToSlackAttachment);
                    messages.send({
                        "channel": message.channel,
                        "text": text,
                        "attachments": JSON.stringify(gigs)
                    }, true);
                });
            });

            // Reply to any message containing "next gig"
            messages.listenFor('next gig', function(message){
                data.getNextGig(function(gig){
                    var text = "*Next upcoming gig:*\n";
                    gig = renderGigToSlackAttachment(gig);
                    messages.send({
                        "channel": message.channel,
                        "text": text,
                        "attachments": JSON.stringify([gig])
                    }, true);
                });
            });
        });
    }
]);

function renderGigToSlackAttachment(gig) {
    return {
        "color": "#36a64f",
        "text": gig.datum+'\n',
        "fields": [
            {
                title: 'locatie',
                value: gig.locatie,
                short: true
            },
            {
                title: 'Tijden',
                value: gig.tijden,
                short: true
            }
        ],
        "mrkdwn_in": ["text", "fields"]
    };
}
