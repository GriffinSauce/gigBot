
// Modules
var mongoose = require('mongoose');
var express = require('express');
var async = require('async');
var exphbs  = require('express-handlebars');
var session = require('express-session');
var flash = require('connect-flash');
var MongoStore = require('connect-mongo/es5')(session);
var bodyParser = require('body-parser');
var _ = require('lodash');
var moment = require('moment');
moment.locale('nl_NL');


// Lib
var handlebarsHelpers = require('./lib/handlebarsHelpers');
var passport = require('./lib/passport');
var log = require('./lib/logging');

// Services
var messageService = require('./services/messages');
var settingsService = require('./services/settings');
var gigsService = require('./services/gigs');

// Schemas
var Gig = require('./schemas/gig.js');
var Settings = require('./schemas/settings.js');

// Bouncer setup
var bouncer = require('express-bouncer')(500, 1000 * 60 * 20);
//bouncer.whitelist.push('127.0.0.1');
bouncer.blocked = function (req, res, next, remaining) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Log and slack
    log.info('*****************************');
    log.info('Blocked request to ' + req.url + ' from: ' + ip);
    log.info('req.body: ', req.body);
    log.info('*****************************');

    res.send(429, 'Too many requests have been made, please wait ' + (remaining / 1000) + ' seconds');
};

// UI for ... settings? status? Whatever, we'll figure it out
var app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main', helpers : handlebarsHelpers }));
app.set('view engine', 'handlebars');

// Static
app.use(express.static('public'));

// Middlewarez
app.use(flash());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret:'secret',
    saveUninitialized: true,
    resave: true,
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    },
    function(err){
        if(err) {
            return log.error(err);
        }
        log.info('connect-mongodb setup ok');
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('express-request-response-logger')(log.info));

// Auth routes
app.get('/login', function (req, res) {
    res.render('login');
});
app.post('/login', bouncer.block, passport.authenticate('local', {
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
        log.verbose('Not authenticated, redirecting to login');
        req.session.redirect_to = req.url;
        res.redirect('/login');
    } else {
        next();
    }
});

app.get('/', function (req, res) {
    res.redirect('/gigs');
});

// Settings
app.get('/settings', function (req, res) {
    async.parallel({
        gigs: function(cb) {
            Gig.find(cb);
        },
        settings: function(cb) {
            Settings.findOne(cb);
        }
    }, function(err, results){
        res.render('settings', {
            page: 'settings',
            message: req.flash('settingsMessage'),
            settings: results.settings,
            gigs: results.gigs,
            triggers: messageService.triggers,
            global: global.gigbot
        });
    });
});
app.post('/settings', function (req, res) {
    settingsService.updateSettings(req.body, function(err){
        res.redirect('/settings');
    });
});
app.post('/settings/healthcheck', function (req, res) {
    var status = messageService.sendHealthcheck();
    if(status) {
        req.flash('settingsMessage', 'Sent healthcheck message to slack');
    } else {
        req.flash('settingsMessage', 'FAILED to send healthcheck message');
    }
    res.redirect('/settings');
});

// Gigs admin
app.get('/gigs', function (req, res) {
    gigsService.getAll(function(err, results){
        res.render('gigs', _.extend({
            page: 'gigs'
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
    var usersToAsk = _.filter(global.gigbot.settings.users, {
        requiredForGigs: true
    });
    data.availability = _.map(usersToAsk, function(user){
        return {
            user: user.name,
            available: req.body['availability.'+user.name]
        };
    });
    var gig = new Gig(data);
    gig.save(function(err){
        if(err) {
            log.error(err);
        }
        res.redirect('/gigs');
    });
});
app.post('/gigs/:id', function (req, res) {
    Gig.findOne({_id:req.params.id}, function(err, gig){
        if(err) {
            log.error('Error updating gig '+req.params.id, err);
            return res.sendStatus(500);
        }
        if(!gig) {
            log.error('Can\t find gig to be updated '+req.params.id);
            return res.sendStatus(404);
        }

        // Crudest update ever
        var date = moment(req.body.date, 'D MMM YYYY');
        var sameDate = date.isSame(gig.date, 'year') && date.isSame(gig.date, 'month') && date.isSame(gig.date, 'day');
        gig.date = date;
        gig.times = req.body.times;
        gig.venue.name = req.body.venue_name;
        gig.venue.address = req.body.venue_address;
        gig.confirmed = req.body.confirmed;
        gig.backline = req.body.backline;
        gig.comments = req.body.comments;

        var usersToAsk = _.filter(global.gigbot.settings.users, {
            requiredForGigs: true
        });
        var availabilityUpdated = false;
        var updatedAvailability = _.map(usersToAsk, function(user){
            if(req.body['availability.'+user.name]) {
                availabilityUpdated = true;
            }
            return {
                user: user.name,
                available: req.body['availability.'+user.name]
            };
        });
        if(availabilityUpdated) {
            gig.availability = updatedAvailability;
        }

        // Date changed? Unset request completion
        if(!sameDate) {
            gig.request.completed = null;
        }

        log.info('Saving updated gig '+req.params.id);
        log.info(gig.toObject());
        gig.save(function(err){
            if(err) {
                log.error('Error updating gig '+req.params.id, err);
                return res.sendStatus(500);
            }

            // Redirect
            res.redirect('/gigs');
        });
    });
});
app.delete('/gigs/:id', function (req, res) {
    Gig.findOneAndRemove({_id:req.params.id}, function(err, gig){
        log.info('Deleted gig id '+gig._id+' - '+_.get(gig,'venue.name'));
        res.sendStatus(200);
    });
});

// Request availability
app.post('/gigs/:id/request', function (req, res) {
    gigsService.askForAvailability(req.params.id, function(err){
        if(err) {
            return res.status(500).json({
                error: err
            });
        }
        res.sendStatus(200);
    });
});

// Cancel ongoing request
app.delete('/gigs/:id/request/cancel', function (req, res) {
    gigsService.stopAsking(req.params.id, function(err){
        if(err) {
            return res.status(500).json({
                error: err
            });
        }
        res.sendStatus(200);
    });
});

module.exports.init = function(done) {
    var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
    var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
    app.listen(server_port, server_ip_address, function () {
        log.verbose( "Listening on " + server_ip_address + ", server_port " + server_port );
        return done();
    });
};
