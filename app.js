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
        messageService.listenFor('reply', 'Just say something, anything', function(message){
            messageService.send({
                "channel": message.channel,
                "text": _.sample(['Hi!', 'Yo', 'What\'s up?', 'Whazaaaaah', 'Hey', 'Sup?'])
            });
        });

        // Reply to any message containing "list gigs"
        messageService.listenFor('list gigs', 'List all gigs', function(message){
            dataService.getGigs(function(err, gigs){
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
        messageService.listenFor('next gig', 'Show the first upcoming gig', function(message){
            dataService.getNextGig(function(err, gig){
                var text = "*Next upcoming gig:*\n";
                gig = slack.renderGigToSlackAttachment(gig);
                messageService.send({
                    "channel": message.channel,
                    "text": text,
                    "attachments": JSON.stringify([gig])
                }, true);
            });
        });

        // Reply to any message containing "next gig"
        messageService.listenFor('find', 'Find a gig, use "find delft" to find any gigs containing the text "delft"', function(message){
            var query = message.text.split('find ')[1];
            dataService.search(query, function(err, results){
                if(results.length === 0) {
                    return messageService.send({
                        "channel": message.channel,
                        "text": 'Sorry, didn\'t find anything :('
                    }, true);
                }
                results = _.map(results, slack.renderGigToSlackAttachment);
                messageService.send({
                    "channel": message.channel,
                    "text": results.length > 1 ? 'Found these' : 'Found this',
                    "attachments": JSON.stringify(results)
                }, true);
            });
        });
    }
]);
