var fs = require('fs');
var express = require('express');
var exphbs  = require('express-handlebars');
var bodyParser = require('body-parser');

// Lib
var handlebarsHelpers = require('./lib/handlebarsHelpers');

// Services
var dataService = require('./services/data');
var messageService = require('./services/messages');

// Schemas
var Gig = require('./schemas/gig.js');

// UI for ... settings? status? Whatever, we'll figure it out
var app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main', helpers : handlebarsHelpers }));
app.set('view engine', 'handlebars');
app.use(bodyParser.urlencoded());

// Static
app.use(express.static('public'));

app.get('/', function (req, res) {
    dataService.getGigs(function(err, gigs){
        res.render('home', {
            gigs: gigs,
            triggers: messageService.triggers
        });
    });
});

app.get('/gigs', function (req, res) {
    Gig.find({}, function(err, gigs){
        res.render('gigs', {
            gigs: gigs
        });
    });
});
app.post('/gigs', function (req, res) {
    var data = {
        date: req.body.date,
        times: req.body.times,
        venue: {
            name: req.body.venue_name,
            address: req.body.venue_address
        },
        confirmed: req.body.confirmed,
        backline: req.body.backline,
        comments: req.body.comments
    };
    var gig = new Gig(data);
    gig.save(function(err){
        if(err) {
            console.log(err);
        }
        res.redirect('/gigs');
    });
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
app.listen(server_port, server_ip_address, function () {
    console.log( "Listening on " + server_ip_address + ", server_port " + server_port );
});

// Write file for gulp to watch
fs.writeFileSync('.rebooted', 'rebooted');
