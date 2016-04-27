/*
 *  Service that handles all messaging for the app
 *  Sends messageService, autoresponds to keywords and triggers other methods/services on keywords
 *
 */

// Modules
var _ = require('lodash');
var needle = require('needle');
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
var triggers = {};
var users = {};

// Initialise message service and bind listeners
module.exports.init = function(cb) {

    // Start RTM session
    needle.get("https://slack.com/api/rtm.start?token="+config.token, function(err, response){
        if(err || !response.body.ok) {
            console.error('Some kinda error', response.body);
            return console.error(err);
        }
        var team = response.body;
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
module.exports.listenFor = function(trigger, description, callback) {
    triggers[trigger] = {
        description: description,
        callback: callback
    };
};

/* Send a message
 * Minimum input:
 * {
 *     "text": String
 * }
 */
module.exports.send = send;
function send(data, useHook) {
    _.extend(data, {
        "type": "message",
        token: config.token,
        as_user: true
    });

    // Redirect all coms to dev channel for development
    if(config.env === 'local') {
        data.text = '*[local]* '+data.text;
        data.channel = devChannel.id;
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

    // Only handle devChannel on local
    if(config.env === 'local' && message.channel !== devChannel.id) {
        return;
    }
    // Ignore devchannel on prod
    if(config.env === 'prod' && message.channel === devChannel.id) {
        return;
    }

    if(message.type === 'message' && config.logMessages.in) {
        console.log("Received:", message);
    }else{
        console.log("Received message from "+_.find(users, {id:message.user}).name);
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
