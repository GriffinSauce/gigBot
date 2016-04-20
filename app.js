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
                    "type": "message",
                    "channel": message.channel,
                    "text": "Sure, hi!"
                });
            });

            // Reply to any message containing "list gigs"
            messages.listenFor('list gigs', function(message){
                data.getGigs(function(gigs){
                    var text = "*All gigs:*\n";
                    gigs = _.map(gigs, function(row){
                        return {
                            "color": "#36a64f",
                            "text": row.datum+'\n',
                            "fields": [
                                {
                                    title: 'locatie',
                                    value: row.locatie,
                                    short: true
                                },
                                {
                                    title: 'Tijden',
                                    value: row.tijden,
                                    short: true
                                }
                            ],
                            "mrkdwn_in": ["text", "fields"]
                        };
                    });
                    messages.send({
                        "type": "message",
                        "channel": message.channel,
                        "text": text,
                        "attachments": JSON.stringify(gigs),
                        "as_user": true
                    }, true);
                });
            });
        });
    }
]);

