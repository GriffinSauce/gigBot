console.log('Starting gigBot');

// Globals
var config = require('./loadConfig');
global.gigbot = {
    settings: {}
};
global.gigbot.ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

// Modules
var _ = require("lodash");
var async = require("async");
var fs = require('fs');

// Server and services
var server = require('./server');
var messageService = require('./services/messages');
var dataService = require('./services/data');

// Schemas
var Settings = require('./schemas/settings.js');

// Libs
var slack = require('./lib/slack');

async.waterfall([
    function(cb){
        dataService.init(cb);
    },
    function(cb){
        messageService.init(function(err, slackUsers){
            slackUsers = _.reject(slackUsers, { id:'USLACKBOT' });
            slackUsers = _.reject(slackUsers, { name:'gigbot' });
            slackUsers = _.map(slackUsers, _.partialRight(_.omit, 'presence', 'is_admin', 'is_owner', 'is_primary_owner', 'is_restricted', 'is_ultra_restricted', 'is_bot'));
            cb(null, slackUsers);
        });
    },
    function(slackUsers, cb){
        Settings.findOne({}, function(err, settings){
            if(settings.users && !_.isEmpty(settings.users)) {
                global.gigbot.settings = settings.toObject();
                return cb();
            }
            settings.users = slackUsers;
            settings.save(function(err){
                global.gigbot.settings = settings.toObject();
                cb(err);
            });
        });
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

        // Return navigation links
        messageService.listenFor('navigate to', 'Find a gig (just like "find") and show a Google Maps link', function(message){
            var query = message.text.split('navigate to ')[1];
            dataService.search(query, function(err, results){
                if(results.length === 0) {
                    return messageService.send({
                        "channel": message.channel,
                        "text": 'Sorry, didn\'t find anything :('
                    }, true);
                }
                results = _.map(results, slack.renderGigToMapsLink);
                results = results.join('\n\n---\n');
                messageService.send({
                    "channel": message.channel,
                    "text": 'Drive safe!\n\n'+results
                }, true);
            });
        });

        cb();
    },
    function(cb) {
        // Write file for gulp to watch
        //fs.writeFileSync('.rebooted', 'rebooted');
        cb();
    }
]);
