
// Globals
var config = require('./loadConfig');
global.gigbot = {
    settings: {},
    config: config,
    ipaddress: process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1"
};

// Modules
var _ = require("lodash");
var async = require("async");
var fs = require('fs');
var mongoose = require('mongoose');

// Server and services
var server = require('./server');
var messageService = require('./services/messages');
var gigsService = require('./services/gigs');

// Schemas
var Settings = require('./schemas/settings.js');
var Gig = require('./schemas/gig.js');

// Libs
var slack = require('./lib/slack');
var log = require('./lib/logging');

log.verbose('Starting gigBot');
async.waterfall([
    function connectDb(cb) {
        if(global.gigbot.config.env == 'local')
        {
            mongoose.connect('mongodb://' + global.gigbot.ipaddress + '/gigbot');
        } else
        {
            mongoose.connect(process.env.MONGODB_URL + 'gigbot', { db: { nativeParser: true } });
        }

        var db = mongoose.connection;
        db.on('error', function(err) {
            log.error('connection error', err);
            cb(err);
        });
        db.once('open', function callback() {
            log.verbose('Connected to the database');
            cb();
        });
    },
    function getSettings(cb){
        Settings.findOne({}, function(err, settings){
            global.gigbot.settings = settings.toObject();
            return cb(err);
        });
    },
    function initializeMessages(cb){
        messageService.init(function(err){
            var slackUsers = messageService.getUsers();
            slackUsers = _.reject(slackUsers, { id:'USLACKBOT' });
            slackUsers = _.reject(slackUsers, { name:'gigbot' });
            slackUsers = _.map(slackUsers, _.partialRight(_.omit, 'presence', 'is_admin', 'is_owner', 'is_primary_owner', 'is_restricted', 'is_ultra_restricted', 'is_bot'));
            cb(err, slackUsers);
        });
    },
    function updateUsers(slackUsers, cb){
        Settings.findOne({}, function(err, settings){
            settings = settings || new Settings();
            if(!settings.users || _.isEmpty(settings.users)) {
                settings.users = slackUsers;
            }
            settings.save(function(err){
                global.gigbot.settings = settings.toObject();
                cb(err);
            });
        });
    },
    registerTriggers,
    server.init
], function(err) {
    if(err) {
        log.error('Startup error, dying', err);
        return process.exit(1);
    }
    log.info('App started');

    // Write file for gulp to watch
    fs.writeFileSync('.rebooted', 'rebooted');
});

function registerTriggers(cb){

    // Reply to any message containing "reply"
    messageService.listenFor('reply', ['reageer'], 'Just say something, anything', function(message){
        messageService.send({
            "channel": message.channel,
            "text": _.sample(['Hi!', 'Yo', 'What\'s up?', 'Whazaaaaah', 'Hey', 'Sup?'])
        });
    });

    // Reply to any message containing "list gigs"
    messageService.listenFor('list gigs', ['future gigs', 'lijst', 'opkomende optredens'], 'List future gigs', function(message){
        Gig.find({date: {$gte: new Date()}}).sort({date:-1}).exec(function(err, gigs){
            var text = "*Alle toekomstige gigs:*\n";
            gigs = _.map(gigs, slack.renderGigToSlackAttachment);
            messageService.send({
                "channel": message.channel,
                "text": text,
                "attachments": JSON.stringify(gigs)
            }, true);
        });
    });

    // Reply to any message containing "list gigs"
    messageService.listenFor('all gigs', ['alle optredens', 'alle gigs'], 'List all gigs', function(message){
        Gig.find().sort({date:-1}).exec(function(err, gigs){
            var text = "*Alle gigs:*\n";
            gigs = _.map(gigs, slack.renderGigToSlackAttachment);
            messageService.send({
                "channel": message.channel,
                "text": text,
                "attachments": JSON.stringify(gigs)
            }, true);
        });
    });


    // Reply to any message containing "next gig"
    messageService.listenFor('next gig', ['volgende gig', 'volgend optreden'], 'Show the first upcoming gig', function(message){
        Gig.find({date: {$gte: new Date()}}).sort({date: 1}).exec(function(err, gigs){
            var nextGig = _.first(gigs);
            var text = "*Volgende gig:*\n";
            nextGig = slack.renderGigToSlackAttachment(nextGig);
            messageService.send({
                "channel": message.channel,
                "text": text,
                "attachments": JSON.stringify([nextGig])
            }, true);
        });
    });

    // Reply to any message containing "next gig"
    messageService.listenFor('find', [], 'Find a gig, use "find delft" to find any gigs containing the text "delft"', function(message){
        var query = message.text.split('find ')[1];
        gigsService.search(query, function(err, results){
            if(!results || results.length === 0) {
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
    messageService.listenFor('navigate to', [], 'Find a gig (just like "find") and show a Google Maps link', function(message){
        var query = message.text.split('navigate to ')[1];
        gigsService.search(query, function(err, results){
            if(!results || results.length === 0) {
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
}
