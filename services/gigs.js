
// Modules
var _ = require('lodash');
var async = require('async');
var moment = require('moment');

// Schemas
var Gig = require('../schemas/gig.js');
var Settings = require('../schemas/settings.js');

// Services
var messageService = require('../services/messages');

module.exports.getAll = function(done) {
    async.series({
        settings: function(cb) {
            Settings.findOne(cb);
        },
        gigs: function(cb) {
            Gig.find().sort({date:-1}).exec(cb);
        },
        activeRequests: function(cb) {
            Gig.find({'request.active': true}, cb);
        }
    },function(err, results){

        // Add any to-be-asked users that weren't active at creation
        var usersToAsk = _.filter(global.gigbot.settings.users, {
            requiredForGigs: true
        });
        var defaultAvailability = _.map(usersToAsk, function(user){
            return { user: user.name, available: 'unknown' };
        });
        results.gigs = _.map(results.gigs, function(gig){
            gig = gig.toObject();
            gig.availability = _.map(defaultAvailability, function(status){
                return _.find(gig.availability, {user:status.user}) || status;
            });
            return gig;
        });

        // Default values for "create new" modal
        results.gig =  {
            availability: defaultAvailability
        };

        done(null, results);
    });
};

module.exports.search = function(query, done){
    async.waterfall([
        function(cb){
            Gig.find({
                $text: { $search: query }
            },{
                score: { $meta: "textScore" }
            }).sort({ score : { $meta : 'textScore' } }).exec(cb);
        },
        function(results, cb){
            if(results && results.length >= 1) {
                return cb(null, results);
            }
            var queryRegex = new RegExp(query, 'i');
            Gig.find({
                $or: [
                    {'venue.name': queryRegex},
                    {'venue.address': queryRegex},
                    {'comments': queryRegex}
                ]
            }, cb);
        }
    ], done);
}

module.exports.askForAvailability = function(gigId, done){
    async.series([

        // Check for ongoing requests to prevent race condition
        function preventConfusion(cb) {
            Gig.find({'request.active': true}, function(err, gigs){
                if(gigs.length !== 0) {
                    return cb('alreadyRunningRequest');
                }
                cb(err);
            });
        },

        // Start the request
        function startRequest(cb) {
            Gig.findOne({_id:gigId}, function(err, gig){
                if(err) {
                    return cb(err);
                }
                if(!gig) {
                    return cb('gigNotFound');
                }

                // Only ask users that are required, reset availability
                gig.availability = [];
                var usersToAsk = _.filter(global.gigbot.settings.users, {
                    requiredForGigs: true
                });
                _.each(usersToAsk, function(user){
                    gig.availability.push({
                        user: user.name,
                        availability: 'unknown'
                    });
                    messageService.askForAvailability(user.name, gig);
                });

                // Register started request
                gig.request = {
                    started: moment(),
                    active: true
                };
                gig.save(cb);
            });
        }
    ], done);
};

module.exports.stopAsking = function(gigId, done){
    Gig.findOne({_id:gigId}, function(err, gig){
        if(err) {
            return done(err);
        }
        if(!gig) {
            return done('gigNotFound');
        }

        // Tell users
        _.each(gig.availability, function(status){
            if(status.available === 'unknown') {
                messageService.sendNeverMind(status.user, gig);
            }
        });

        // Stop request
        gig.request.active = false;
        gig.save(done);
    });
};
