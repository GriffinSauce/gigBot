var mongoose = require('mongoose');
var express = require('express');
var async = require('async');
var exphbs  = require('express-handlebars');
var session = require('express-session');
var MongoStore = require('connect-mongo/es5')(session);
var bodyParser = require('body-parser');
var _ = require('lodash');
var moment = require('moment');
moment.locale('nl_NL');

// Lib
var handlebarsHelpers = require('./lib/handlebarsHelpers');
var passport = require('./lib/passport');

// Services
var dataService = require('./services/data');
var messageService = require('./services/messages');

// Schemas
var Gig = require('./schemas/gig.js');
var Settings = require('./schemas/settings.js');

// UI for ... settings? status? Whatever, we'll figure it out
var app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main', helpers : handlebarsHelpers }));
app.set('view engine', 'handlebars');

// Static
app.use(express.static('public'));

// Middlewarez
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret:'secret',
    saveUninitialized: true,
    resave: true,
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    },
    function(err){
        console.log(err || 'connect-mongodb setup ok');
    })
}));
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.get('/login', function (req, res) {
    res.render('login');
});
app.post('/login', passport.authenticate('local', {
    successRedirect: '/gigs',
    failureRedirect: '/login',
    failureFlash: true
}));
app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

// All routes below are authenticated
app.use(function(req, res, next) {
    if(req.user === undefined) {
        console.log('Not authenticated, redirecting to login');
        req.session.redirect_to = req.url;
        res.redirect('/login');
    } else {
        next();
    }
});

app.get('/', function (req, res) {
    res.redirect('/gigs');
});

// Status
app.get('/status', function (req, res) {
    dataService.getGigs(function(err, gigs){
        res.render('status', {
            page: 'status',
            gigs: gigs,
            triggers: messageService.triggers
        });
    });
});

// Settings
app.get('/settings', function (req, res) {
    Settings.findOne({}, function(err, settings){
        res.render('settings', {
            page: 'settings',
            settings: settings
        });
    });
});
app.post('/settings', function (req, res) {
    console.log(req.body);
    var input = req.body;
    Settings.findOne({}, function(err, settings){
        var updatedSettings = settings;
        if(!settings) {
            updatedSettings = new Settings();
        }

        // Rewrite links input
        var links = [];
        input.link_title = typeof input.link_title === 'string' ? [input.link_title] : input.link_title;
        input.link_url = typeof input.link_url === 'string' ? [input.link_url] : input.link_url;
        for(var i=0; i<input.link_title.length; i++) {
            if(input.link_title[i] || input.link_url[i]) {
                links.push({
                    title: input.link_title[i],
                    url: input.link_url[i]
                });
            }
        }

        // Save props
        updatedSettings.links = links;
        updatedSettings.save(function(err){
            res.redirect('/settings');
        });
    });
});

// Gigs admin
app.get('/gigs', function (req, res) {
    async.series({
        settings: function(cb) {
            Settings.findOne({}, cb);
        },
        gigs: function(cb) {
            Gig.find({}, cb);
        }
    },function(err, results){
        res.render('gigs', _.extend({
            page: 'gigs',
        }, results));
    });
});
app.post('/gigs', function (req, res) {
    var date = moment(req.body.date, 'D MMM YYYY');
    var data = {
        date: date,
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
app.post('/gigs/:id', function (req, res) {
    Gig.findOne({_id:req.params.id}, function(err, gig){
        if(err) {
            return res.sendStatus(500);
        }
        if(!gig) {
            return res.sendStatus(404);
        }

        // Crudest update ever
        var date = moment(req.body.date, 'D MMM YYYY');
        gig.date = date;
        gig.times = req.body.times;
        gig.venue.name = req.body.venue_name;
        gig.venue.address = req.body.venue_address;
        gig.confirmed = req.body.confirmed;
        gig.backline = req.body.backline;
        gig.comments = req.body.comments;
        gig.save(function(err){
            if(err) {
               return res.sendStatus(500);
            }

            // Redirect
            res.redirect('/gigs');
        });
    });
});
app.delete('/gigs/:id', function (req, res) {
    Gig.findOneAndRemove({_id:req.params.id}, function(err, gig){
        console.log('Deleted gig id '+gig._id+' - '+_.get(gig,'venue.name'));
        res.sendStatus(200);
    });
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
app.listen(server_port, server_ip_address, function () {
    console.log( "Listening on " + server_ip_address + ", server_port " + server_port );
});
