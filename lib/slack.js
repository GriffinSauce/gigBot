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
    var date = gig.dateIsValid ? gig.datum.format('D MMMM YYYY') : gig.datum; // Format only if valid moment obj
    var venue = gig.locatie;
    var drivingLink = gig.adres ? 'http://maps.google.com/?directionsmode=driving&saddr=&daddr='+gig.adres.replace(/\s/g, '+') : '';
    var ovLink = gig.adres ? 'http://maps.google.com/?directionsmode=transit&saddr=&daddr='+gig.adres.replace(/\s/g, '+') : '';
    links = '<'+drivingLink+'|Navigate by car> | <'+ovLink+'|Navigate by OV>';
    return '*'+venue+'* - _'+date+'_\n\n'+links+'\n'+gig.adres+'\n\n'+gig.tijden;
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
