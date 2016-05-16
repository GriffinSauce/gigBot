/*
 *  Service that handles all messaging for the app
 *  Sends messageService, autoresponds to keywords and triggers other methods/services on keywords
 *
 */

// Modules
var _ = require('lodash');
var needle = require('needle');
var moment = require('moment');
var async = require('async');
var WebSocketClient = require('websocket').client;

// Schemas
var Gig = require('../schemas/gig.js');

// Config
var config = require('../loadConfig');
var slack = require('../lib/slack');

// Vars
var connection;
var messageIndex = 0;
var connectionLive = false;
var gigbot;
var devChannel;
var team = {};
var users = {};
var triggers = module.exports.triggers = {};
var imChannels = [];

// Initialise message service and bind listeners
module.exports.init = function(done) {
    async.series([
        function startRTMSession(cb){
            needle.get("https://slack.com/api/rtm.start?token="+config.token, function(err, response){
                if(err || !response.body.ok) {
                    console.error('Starting RTM session failed', _.get(response,'body'));
                    console.error(err);
                    return cb(err);
                }
                team = response.body;
                gigbot = team.self;
                devChannel = _.find(team.channels, {name: 'gigbot-dev'});
                users = team.users;

                // Set up websocket client
                var client = new WebSocketClient();

                client.on('connectFailed', function(error) {
                    connectionLive = false;
                    console.log('Connect Error: ' + error.toString());
                });

                client.on('connect', function(conn) {
                    connection = conn;
                    connectionLive = true;
                    send({
                        text: "Bot online",
                        channel: devChannel.id
                    });
                    cb(null, team.users);
                    conn.on('error', function(error) {
                        connectionLive = false;
                        console.log("Connection Error: " + error.toString());
                    });
                    conn.on('close', function() {
                        connectionLive = false;
                        console.log('echo-protocol Connection Closed');
                    });
                    conn.on('message', handleMessage);
                });

                // Try to connect
                client.connect(response.body.url);
            });
        },
        function getImChannels(cb){
            if(!_.isEmpty(imChannels)){
                cb();
            }
            needle.get("https://slack.com/api/im.list?token="+config.token, function(err, response){
                if(response.body.ok){
                    imChannels = response.body.ims;
                }
                cb();
            });
        }
    ], function(err, results){
        done(err, results && results[0]);
    });
};

// Allow for triggers to be added
module.exports.listenFor = listenFor;
function listenFor(trigger, description, callback) {
    triggers[trigger] = {
        description: description,
        callback: callback
    };
}

/* Send a message
 * Minimum input:
 * {
 *     "text": String
 * }
 */
module.exports.send = send;
function send(data, useHook) {
    _.extend(data, {
        type: "message",
        token: config.token,
        as_user: true
    });

    // Redirect all coms to dev channel for development
    if(config.env === 'local') {
        data.text = '*[local]* '+data.text;
        if(!data.im) {
            data.channel = devChannel.id;
        }
    }

    if(config.logMessages.out) {
        console.log("Sending:", data);
    }

    needle.post('https://slack.com/api/chat.postMessage', data, function(err, response){
        if(err || !_.get(response, 'body.ok')) {
            console.log('Error posting message', {
                message: data,
                err: err,
                body: _.get(response,'body')
            });
        }
        console.log('Message posted');
    });
    return;
}

// Handle incoming messageService
function handleMessage(message) {
    message = JSON.parse(message.utf8Data);
    if(message.type === 'message' && config.logMessages.in) {
        console.log("Received:", message);
    }else{
        console.log("Received message from "+_.get(_.find(users, {id:message.user}),'name'));
    }

    // Handle ims and skip the rest
    var isIm = _.find(imChannels, function(imChannel){
        return imChannel.id === message.channel;
    });
    if(message.type === 'message' && message.user !== gigbot.id && isIm) {
        return handleIm(message);
    }

    // Only handle devChannel on local
    if(config.env === 'local' && message.channel !== devChannel.id) {
        return;
    }
    // Ignore devchannel on prod
    if(config.env === 'prod' && message.channel === devChannel.id) {
        return;
    }

    // Slack says hello on connection start, run callback
    if(message.type === 'hello') {
        console.log('Initialized message service');
        connectionLive = true;
        return;
    }

    // Listen for triggers and call callback when found
    var toGigbot = message.text && (message.text.indexOf(gigbot.name) !== -1 || message.text.indexOf('<@'+gigbot.id+'>') !== -1);
    if(message.type === 'message' && toGigbot) {
        var messageHandled = false;
        _.each(triggers, function(trigger, triggerText){
            if(message.text.indexOf(triggerText) !== -1) {
                messageHandled = true;
                trigger.callback(message);
            }
        });
        if(!messageHandled) {
            send({
                "channel": message.channel,
                "text": "Sorry I didn't understand, did you mean one of these?",
                "attachments": JSON.stringify([{
                    "color": "#36a64f",
                    "fields": slack.keysToAttachments(triggers),
                    "mrkdwn_in": ["text", "fields"]
                }])
            }, true);
        }
    }
}

module.exports.askForAvailability = function(userName, gig){
    var user = _.find(users, {name: userName});
    if(!user) {
        return console.error('Couldn\'t start avalability convo with'+userName);
    }
    async.series([
        function(){
            console.log('Started convo with', userName);
            var channel = _.find(imChannels, {user:user.id});
            send({
                im: true,
                channel: channel.id,
                text: 'Hey, ben je beschikbaar voor een gig op *'+moment(gig.date).format('D MMMM YYYY')+'*?'+' ('+gig.venue.name+')'
            });
        }
    ]);
};

module.exports.sendNeverMind = function(userName, gig){
    var user = _.find(users, {name: userName});
    if(!user) {
        return;
    }
    async.series([
        function(){
            var channel = _.find(imChannels, {user:user.id});
            send({
                im: true,
                channel: channel.id,
                text: 'Hey, weet je nog wat ik vroeg over *'+moment(gig.date).format('D MMMM YYYY')+'*? Laat maar zitten! :sweat_smile:'
            });
        }
    ]);
};

function handleIm(message){
    console.log('Handling IM', message);
    var user = _.find(global.gigbot.settings.users, {
        id: message.user
    });

    var q = {
        'request.active': true,
        'availability': {
            $elemMatch: {
                user: user.name,
                available: 'unknown'
            }
        }
    };
    Gig.find(q, function(err, gigs){
        if(gigs.length === 0){
            return send({
                im: true,
                channel: message.channel,
                text: 'Sorry, ik weet niet waar je het over hebt...'
            });
        }
        if(gigs.length > 1){
            return send({
                im: true,
                channel: message.channel,
                text: 'Sorry, ik ben in de war, vertel het aan Joris!'
            });
        }
        var answer = parseAnswer(message.text);
        if(answer === 'unclear') {
            return send({
                im: true,
                channel: message.channel,
                text: 'Ik snap het niet, geef alsjeblieft antwoord met "ja" of "nee"'
            });
        }
        var gig = gigs[0];
        var localeAnswer = answer === 'yes' ? 'ja' : 'nee';
        var updateText = 'Update over *'+gig.venue.name+'* op '+moment(gig.date).format('D MMMM YYYY');
        gig.availability = _.map(gig.availability, function(status){
            if(status.user === user.name) {
                status.available = answer;
            }
            var icon;
            switch(status.available) {
                case 'yes': icon = ':white_check_mark:';
                break;
                case 'no': icon = ':x:';
                break;
                default: icon = ':grey_question:';
                break;
            }
            updateText += '\n'+icon+' '+status.user;
            return status;
        });
        gig.save(function(){
            send({
                channel: _.find(team.channels, {name: 'gigs'}),
                text: updateText
            });
            return send({
                im: true,
                channel: message.channel,
                text: 'Ok, ik denk dat je *'+localeAnswer+'* zei, thanks!'
            });
        });
    });
}

function parseAnswer(text){
    var positiveReactions = ['yes', 'ja'];
    var negativeReactions = ['no', 'nee'];
    var isPositive = false;
    var isNegative = false;
    _.map(positiveReactions, function(string){
        if(text.indexOf(string) !== -1) {
            isPositive = true;
        }
    });
    _.map(negativeReactions, function(string){
        if(text.indexOf(string) !== -1) {
            isNegative = true;
        }
    });
    if((!isPositive && !isNegative) || (isPositive && isNegative)){
        return 'unclear';
    }
    if(isNegative){
        return 'no';
    }
    return 'yes';
}
