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

// global.gigbot.config
var slack = require('../lib/slack');
var log = require('../lib/logging');

// Vars
var token;
var messageIndex = 0;
var connectionLive = false;
var gigbot;
var devChannel;
var team = {};
var users = {};
var triggers = module.exports.triggers = {};
var imChannels = [];
var reconnectDelay = 0;
var reconnectRetries = 0;

// Initialise message service and bind listeners
module.exports.init = function(done) {
    token = _.get(global, 'gigbot.settings.slackToken');
    connectToSlackSocket(done);
};

// Auth with slack and get an RTM websocket url
function connectToSlackSocket(done) {
    needle.get("https://slack.com/api/rtm.start?token="+token, function(err, response){
        if(err || !response.body.ok) {
            log.error('Starting RTM session failed', _.get(response,'body'));
            log.error(err);
            if(done) {
                done(err);
            }
            return;
        }

        // Save stuff to use all over the place
        team = response.body;
        gigbot = team.self;
        devChannel = _.find(team.channels, {name: 'gigbot-dev'});
        imChannels = team.ims;
        users = team.users;

        // Set up websocket client
        var client = new WebSocketClient();

        client.on('connectFailed', function(error) {
            connectionLive = false;
            log.error('Connect Error: ' + error.toString());
            reconnect();
        });

        client.on('connect', function(connection) {
            bindWebsocketEvents(connection);
            send({
                text: "Bot online",
                channel: devChannel.id
            });

            // Whoo
            connectionLive = true;
            reconnectDelay = 0;
            reconnectRetries = 0;
            if(done) {
                done();
            }
        });

        // Try to connect
        client.connect(response.body.url);
    });
}

// Listen to events on the socket connection
function bindWebsocketEvents(connection) {
    connection.on('message', handleMessage);
    connection.on('error', function(error) {
        connectionLive = false;
        log.error("Connection Error: " + error.toString());
        reconnect();
    });
    connection.on('close', function() {
        connectionLive = false;
        log.error('echo-protocol Connection Closed');
        reconnect();
    });
}

// Try to reconnect to the RTM API.
function reconnect() {
    if(connectionLive) {
        log.info('I\'m sorry Dave, I\'m afraid I can\'t do that. The connection is live, not reconnecting');
        return;
    }
    log.info('Reconnecting to slack RTM', {
        reconnectDelay: reconnectDelay,
        reconnectRetries: reconnectRetries,
    });
    send({
        channel: devChannel.id,
        text: 'Slack connection broke, reconnecting... (attempt '+ (reconnectRetries+1) +')'
    });

    // Give up after  5 times
    if(reconnectDelay >= 5) {
        log.error('Reconnect failed');
        send({
            channel: devChannel.id,
            text: ':skull: Warning! Gigbot failed to connect to Slack, not listening to messages. :skull:',
        });
        return;
    }

    // Start with 500ms delay, extend with each retry
    reconnectDelay = reconnectDelay ? reconnectDelay * 3 : 500;
    reconnectRetries += 1;
    setTimeout(connectToSlackSocket, reconnectDelay);
}

module.exports.isConnectionLive = function() {
    return connectionLive;
}

module.exports.getUsers = function() {
    return users;
}

// Allow for triggers to be added
module.exports.listenFor = listenFor;
function listenFor(trigger, aliasses, description, callback) {
    aliasses = aliasses || [];
    aliasses.push(trigger);
    var regexString = aliasses.join('|').replace(' ','\\s');
    triggers[trigger] = {
        description: description,
        aliasses: aliasses,
        regex: new RegExp(regexString, 'i'),
        callback: callback
    };
    log.verbose('Registered', triggers[trigger].regex);
}

/* Send a message
 * Minimum input:
 * {
 *     "text": String
 * }
 */
module.exports.send = send;
function send(data) {
    _.extend(data, {
        type: "message",
        token: token,
        as_user: true
    });

    // Redirect all coms to dev channel for development
    if(global.gigbot.config.env === 'local') {
        data.text = '*[local]* '+data.text;
        if(!data.im) {
            data.channel = devChannel.id;
        }
    }

    if(global.gigbot.config.logMessages.out) {
        log.verbose("Sending:", data);
    }

    needle.post('https://slack.com/api/chat.postMessage', data, function(err, response){
        if(err || !_.get(response, 'body.ok')) {
            log.error('Error posting message', {
                message: data,
                err: err,
                body: _.get(response,'body')
            });
        }
        log.info('Message posted', data);
    });
    return;
}

// Handle incoming messageService
function handleMessage(message) {
    message = JSON.parse(message.utf8Data);
    if(message.type !== 'message') {
        return;
    }

    // Log incoming msgs
    if(message.type === 'message' && global.gigbot.config.logMessages.in) {
        log.verbose("Received:", message);
    }else{
        log.verbose("Received message from "+_.get(_.find(users, {id:message.user}),'name'));
    }

    // Handle ims and skip the rest
    var isIm = _.find(imChannels, function(imChannel){
        return imChannel.id === message.channel;
    });
    if(message.type === 'message' && message.user !== gigbot.id && isIm) {
        return handleIm(message);
    }

    // Only handle devChannel on local
    if(global.gigbot.config.env === 'local' && message.channel !== devChannel.id) {
        return;
    }
    // Ignore devchannel on prod
    if(global.gigbot.config.env === 'prod' && message.channel === devChannel.id) {
        return;
    }

    // Slack says hello on connection start, run callback
    if(message.type === 'hello') {
        log.verbose('Initialized message service');
        return;
    }

    // Listen for triggers and call callback when found
    var toGigbot = message.text && message.text.match(new RegExp('<@'+gigbot.id+'>', 'i'));
    if(message.type === 'message' && toGigbot) {
        var messageHandled = false;
        _.each(triggers, function(trigger, triggerText){
            if(message.text.match(trigger.regex)) {
                log.verbose('Message matched', trigger.regex);
                messageHandled = true;
                trigger.callback(message);
            }
        });
        if(!messageHandled) {
            log.warn('Message not handled')
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
        return log.error('Couldn\'t start avalability convo with'+userName);
    }
    async.series([
        function(){
            log.info('Started convo with', userName);
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
    log.info('Handling IM', message);
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

        // Everyone answered? Done!
        if(!_.find(gig.availability, { available:'unknown' })){
            gig.request.active = false;
            gig.request.completed = moment();
            log.info('Request done!', gig.toObject());
        }

        gig.save(function(){
            send({
                channel: _.get(_.find(team.channels, {name: 'gigs'}), 'id'),
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

var positiveReactions = ['yes', 'ja', 'joe', 'yep', 'yup'];
var negativeReactions = ['no', 'nee'];
var positiveReactionsRegexString = new RegExp(positiveReactions.join('|'), "gmi");
var negativeReactionsRegexString = new RegExp(negativeReactions.join('|'), "gmi");

function parseAnswer(text){
    var isPositive = text.match(positiveReactionsRegexString);
    var isNegative = text.match(negativeReactionsRegexString);;
    if((!isPositive && !isNegative) || (isPositive && isNegative)){
        return 'unclear';
    }
    if(isNegative){
        return 'no';
    }
    return 'yes';
}

module.exports.sendHealthcheck = function() {
    if(!connectionLive) {
        return false;
    }
    send({
        channel: devChannel.id,
        text: 'HEALTHCHECK! Healthy as a horse! :horse:',
    }, true);
    return true;
};
