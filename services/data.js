var config = require('../loadConfig');

var _ = require("lodash");
var async = require("async");
var memoize = require("memoizee");
var moment = require("moment-timezone");
var GoogleSpreadsheet = require("google-spreadsheet");
var fulltextsearchlight = require('full-text-search-light');
var search = new fulltextsearchlight();

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet(config.spreadsheetKey);
var creds = config.google;
var sheet;

module.exports.init = function(cb) {
    async.series([
        function setAuth(step) {
            doc.useServiceAccountAuth(creds, step);
        },
        function getInfoAndWorksheets(step) {
            doc.getInfo(function(err, info) {
                if(err) {
                    console.log(err);
                    return step(err);
                }
                console.log('Loaded doc: '+info.title+' by '+info.author.email);
                sheet = info.worksheets[0];
                step();
            });
        }
    ], cb);
};

module.exports.getGigs = memoize(getGigs, {async: true, maxAge: 1000*60*5 }); // Cache for max 5 minutes
function getGigs(cb) {
    // google provides some query options
    if(!sheet) {
        console.log('Error getting gigs, sheet not loaded');
        cb(new Error('noSheet'), []);
    }
    sheet.getRows({
        offset: 1,
        limit: 20
    }, function( err, rows ){
        if(err) {
            return cb(err);
        }

        // Erase existing search data
        search.drop();

        // Process sheet data
        var gigs = _.map(rows, function (row) {
            row = _.omit(row, '_xml', '_links', 'id', 'app:edited');
            var parsedDate = moment(row.datum, 'DD-MM-YYYY', true).tz("Europe/Amsterdam").locale('nl_NL');
            row.dateIsValid = parsedDate.isValid();
            row.datum = parsedDate.isValid() ? parsedDate : row.datum;

            // Save for searching
            search.add(row, function (key, val) {
                return !_.includes(['datum', 'save', 'del'], key);
            });

            return row;
        });

        console.log('Succesfully got %s gigs', gigs.length);
        cb(err, gigs);
    });
}

module.exports.getNextGig = function(cb){
    var fromDate = moment().tz("Europe/Amsterdam");
    getGigs(function(err, gigs){

        // Filter out gigs in the past or without date
        gigs = _.filter(gigs, function(gig){
            if(gig.dateIsValid){
                return gig.datum.isAfter(fromDate);
            } else {
                return false;
            }
        });
        gigs = _.sortBy(gigs, function(gig){
            return gig.datum.valueOf();
        });
        cb(err, _.first(gigs));
    });
};

module.exports.search = function(q, cb){
    console.log('Searching for "'+q+'"');
    // Make sure index is built
    getGigs(function(err, gigs){
        cb(err, search.search(q));
    });
};
