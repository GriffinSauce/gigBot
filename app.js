console.log('Starting gigBot');

var config = require('./loadConfig');

var express = require('express');
var _ = require("lodash");
var async = require("async");
var exphbs  = require('express-handlebars');
var data = require('./services/data');

// Services
var messages = require('./services/messages');

// Libs
var slack = require('./lib/slack');

async.series([
    function(cb){
        data.init(cb);
    },
    function(cb){
        // Build cache #yolo
        data.getGigs(function(){});

        // Initialize message hooks
        messages.init(function(){
            // callback, messages is (probably) online!
            console.log('Message service online');

            if(config.env === 'local') {
                messages.send({
                    "text": "Bot online"
                });
            }

            // Reply to any message containing "reply"
            messages.listenFor('reply', function(message){
                messages.send({
                    "channel": message.channel,
                    "text": "Sure, hi!"
                });
            });

            // Reply to any message containing "list gigs"
            messages.listenFor('list gigs', function(message){
                data.getGigs(function(gigs){
                    var text = "*All gigs:*\n";
                    gigs = _.map(gigs, slack.renderGigToSlackAttachment);
                    messages.send({
                        "channel": message.channel,
                        "text": text,
                        "attachments": JSON.stringify(gigs)
                    }, true);
                });
            });

            // Reply to any message containing "next gig"
            messages.listenFor('next gig', function(message){
                data.getNextGig(function(gig){
                    var text = "*Next upcoming gig:*\n";
                    gig = slack.renderGigToSlackAttachment(gig);
                    messages.send({
                        "channel": message.channel,
                        "text": text,
                        "attachments": JSON.stringify([gig])
                    }, true);
                });
            });
        });
    }
]);

// UI for ... settings? status? Whatever, we'll figure it out
var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    res.render('home');
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
server.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + port )
});
