/*
 *  Service that handles all messaging for the app
 *  Sends messages, autoresponds to keywords and triggers other methods/services on keywords
 *
 */

// Modules
var needle = require('needle');
var _ = require('lodash');
var WebSocketClient = require('websocket').client;

// Config
var config = require('../loadConfig');

var data = require('../services/data');

// Vars
var connection;
var messageIndex = 0;
var connectionLive = false;
var gigbot;
var devChannel;

// Initialise message service and bind listeners
module.exports.init = function(cb) {

    // Start RTM session
    needle.get("https://slack.com/api/rtm.start?token="+config.token, function(err, response){
        if(!response.body.ok) { return console.error('Some kinda error', response.body.errors); }
        var team = response.body;
        gigbot = team.self;
        devChannel = _.find(team.channels, {name: 'gigbot-dev'});
        //console.log(devChannel);

        // Set up websocket client
        var client = new WebSocketClient();

        client.on('connectFailed', function(error) {
            connectionLive = false;
            console.log('Connect Error: ' + error.toString());
        });

        client.on('connect', function(conn) {
            connection = conn;
            connectionLive = true;
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

// Send a message, takes standard Slack message data
module.exports.send = send;

// Allow for triggers to be added
var triggers = {};
module.exports.listenFor = function(trigger, callback) {
    triggers[trigger] = callback;
};

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

// Handle incoming messages
// TODO: Split messages and other events
function handleMessage(message) {
    message = JSON.parse(message.utf8Data);

    // Only handle devChannel on local
    if(config.env === 'local' && message.channel !== devChannel.id) {
        return;
    }

    console.log("Received:", message);

    // Here we should define which messages trigger which response

    // Slack says hello on connection start, run callback
    if(message.type === 'hello') {
        console.log('Initialized message service');
        connectionLive = true;
        callback();
        callback = null;
        return;
    }

    // Listen for triggers and call callback when found
    if(message.type === 'message' && message.text && (message.text.indexOf(gigbot.name) !== -1 || message.text.indexOf('<@'+gigbot.id+'>') !== -1)) {
        var messageHandled = false;
        _.each(triggers, function(callback, trigger){
            if(message.text.indexOf(trigger) !== -1) {
                messageHandled = true;
                callback(message);
            }
        });

        // TODO: Reply to unknown commands
        if(!messageHandled) {
            send({
                "channel": message.channel,
                "text": "Sorry I didn't understand, did you mean one of these?",
                "attachments": JSON.stringify([{
                    "color": "#36a64f",
                    "fields": getTriggersAsAttachments(),
                    "mrkdwn_in": ["text", "fields"]
                }])
            }, true);
        }
    }
}

function getTriggersAsAttachments() {
    return _.map(_.keys(triggers), function(trigger){
        return {
            title: trigger,
            //value: gig.locatie,
            short: true
        };
    });
}
