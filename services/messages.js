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
var config = require('../config.json');

var data = require('../services/data');

// Vars
var connection;
var messageIndex = 0;
var connectionLive = false;
var callback;
var gigbot;

// Initialise message service and bind listeners
module.exports.init = function(cb) {
    callback = cb;

    // Start RTM session
    needle.get("https://slack.com/api/rtm.start?token="+config.token, function(err, response){
        if(!response.body.ok) { return console.error('Some kinda error', response.body.errors); }
        var team = response.body;
        gigbot = team.self;
        //console.log(team);

        // Set up websocket client
        var client = new WebSocketClient();

        client.on('connectFailed', function(error) {
            connectionLive = false;
            console.log('Connect Error: ' + error.toString());
        });

        client.on('connect', function(conn) {
            connection = conn;
            connectionLive = true;
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

function send(data) {
    if(!connection || !connectionLive) { return console.log('No connection, message not sent', data); }
    data.id = ++messageIndex;
    console.log('Sending message', JSON.stringify(data));
    connection.sendUTF(JSON.stringify(data));
}

// Handle incoming messages
// TODO: Split messages and other events
function handleMessage(message) {
    message = JSON.parse(message.utf8Data);
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
    if(message.type === 'message' && (message.text.indexOf(gigbot.name) !== -1 || message.text.indexOf('<@'+gigbot.id+'>') !== -1)) {
        _.each(triggers, function(callback, trigger){
            if(message.text.indexOf(trigger) !== -1) {
                callback(message);
            }
        });
    }
}

var triggers = {};
function listenFor(trigger, callback) {
    triggers[trigger] = callback;
}

// Reply to any message containing "reply"
listenFor('reply', function(message){
    send({
        "type": "message",
        "channel": message.channel,
        "text": "Sure, hi!"
    });
});

// Reply to any message containing "list gigs"
listenFor('list gigs', function(message){
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
        send({
            "type": "message",
            "channel": message.channel,
            "text": text,
            "attachments": JSON.stringify(gigs)
        });
    });
});
