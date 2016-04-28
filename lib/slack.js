var _ = require("lodash");
var moment = require("moment");

module.exports.renderGigToSlackAttachment = function(gig) {
    var date = gig.dateIsValid ? gig.datum.format('D MMMM YYYY') : gig.datum; // Format only if valid moment obj
    var status = gig.bevestigd === 'JA' ? '' : ' - _[wacht op bevestiging]_'
    return {
        "color": gig.bevestigd === 'JA' ? '#28F19F' : '#FF4C38',
        "text": date + status + '\n\n',
        "fields": [
            {
                title: 'Locatie',
                value: gig.locatie,
                short: true
            },
            {
                title: 'Tijden',
                value: gig.tijden,
                short: true
            }
        ],
        "mrkdwn_in": ["text", "fields"]
    };
};

module.exports.renderGigToMapsLink = function(gig) {
    gig.datum = gig.dateIsValid ? gig.datum.format('D MMMM YYYY') : gig.datum; // Format only if valid moment obj
    var adres = gig.adres.replace(/\s/g, '+');
    var gLink = 'http://maps.google.com/?daddr='+adres;
    var aLink = 'http://maps.apple.com/?daddr='+adres;
    var gLinks = ':trolleybus: *OV*: <'+gLink+'&dirflg=r|Google Maps> | <'+aLink+'&dirflg=r|Apple Maps>';
    var aLinks = ':red_car: *Car*: <'+gLink+'&dirflg=d|Google Maps> | <'+aLink+'&dirflg=d|Apple Maps>';
    return '*'+gig.locatie+'* - _'+gig.datum+'_\n\n'+gLinks+'\n\n'+aLinks+'\n\n'+gig.adres+'\n\n'+gig.tijden;
};

module.exports.keysToAttachments = function(arr) {
    return _.map(arr, function(value, key){
        return {
            title: key,
            value: value.description,
            short: true
        };
    });
};
