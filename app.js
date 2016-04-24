console.log('Starting gigBot');

var config = require('./loadConfig');
var server = require('./server');

var _ = require("lodash");
var async = require("async");

// Services
var messageService = require('./services/messages');
var dataService = require('./services/data');

// Libs
var slack = require('./lib/slack');

async.series([
    function(cb){
        dataService.init(cb);
    },
    function(cb){
        messageService.init(cb);
    },
    function(cb){
        // Reply to any message containing "reply"
        messageService.listenFor('reply', function(message){
            messageService.send({
                "channel": message.channel,
                "text": "Sure, hi!"
            });
        });

        // Reply to any message containing "list gigs"
        messageService.listenFor('list gigs', function(message){
            dataService.getGigs(function(gigs){
                var text = "*All gigs:*\n";
                gigs = _.map(gigs, slack.renderGigToSlackAttachment);
                messageService.send({
                    "channel": message.channel,
                    "text": text,
                    "attachments": JSON.stringify(gigs)
                }, true);
            });
        });

        // Reply to any message containing "next gig"
        messageService.listenFor('next gig', function(message){
            dataService.getNextGig(function(gig){
                var text = "*Next upcoming gig:*\n";
                gig = slack.renderGigToSlackAttachment(gig);
                messageService.send({
                    "channel": message.channel,
                    "text": text,
                    "attachments": JSON.stringify([gig])
                }, true);
            });
        });
    }
]);
