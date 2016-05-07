/*
 *  Service that handles all messaging for the app
 *  Sends messageService, autoresponds to keywords and triggers other methods/services on keywords
 *
 */

// Modules
var _ = require('lodash');
var needle = require('needle');
var async = require('async');
var WebSocketClient = require('websocket').client;

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
var requests = [];

// Initialise message service and bind listeners
module.exports.init = function(cb) {

    // Start RTM session
    needle.get("https://slack.com/api/rtm.start?token="+config.token, function(err, response){
        if(err || !response.body.ok) {
            console.error('Some kinda error', _.get(response,'body'));
            return console.error(err);
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
            cb();
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
    if(!gig.dateIsValid){
        return console.error('Couldn\'t start avalability convo with'+userName+', invalid date');
    }
    async.series([
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
        },
        function(){
            console.log('Started convo with', userName);
            var channel = _.find(imChannels, {user:user.id});
            requests.push({
                user: user.id,
                gig: gig,
                channel: channel.id,
                answer: 'unknown'
            });
            console.log('ongoing requests', requests);
            send({
                im: true,
                channel: channel.id,
                text: 'Hey, are you available for a gig on '+gig.datum.format('D MMMM YYYY')+'?'
            });
        }
    ]);
};

function handleIm(message){
    console.log('Handling IM');
    var request = _.find(requests, {user: message.user, answer: 'unknown'});
    if(!request){
        return send({
            im: true,
            channel: message.channel,
            text: 'Sorry, I don\'t know what you\'re talking about...'
        });
    }
    var answer = parseAnswer(message.text);
    if(answer === 'unclear') {
        return send({
            im: true,
            channel: message.channel,
            text: 'Didn\'t get that, please answer with a "yes" or "no"'
        });
    }
    request.answer = answer;
    return send({
        im: true,
        channel: message.channel,
        text: 'Ok, I think you said *'+answer+'*, thanks!'
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
