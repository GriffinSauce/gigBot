var async = require("async");
var GoogleSpreadsheet = require("google-spreadsheet");

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('1Bu6OWRZDerfXgdPfhuJFZydIY6oTE1MXywePgveHOek');
var creds = require('../google-generated-creds.json');
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

module.exports.getGigs = function(cb) {
    // google provides some query options
    if(!sheet) {
        console.log('Error getting gigs, sheet not loaded');
        cb([]);
    }
    sheet.getRows({
        offset: 1,
        limit: 20
    }, function( err, rows ){
        cb(rows);
    });
};
