var _ = require("lodash");
var moment = require("moment");

module.exports.renderGigToSlackAttachment = function(gig) {
    var date = moment(gig.date).format('D MMMM YYYY');
    var status = gig.confirmed ? '' : ' - _[wacht op bevestiging]_';
    return {
        "color": gig.confirmed ? '#28F19F' : '#FF4C38',
        "text": date + status + '\n\n',
        "fields": [
            {
                title: 'Locatie',
                value: gig.venue.name,
                short: true
            },
            {
                title: 'Tijden',
                value: gig.times,
                short: true
            }
        ],
        "mrkdwn_in": ["text", "fields"]
    };
};

module.exports.renderGigToMapsLink = function(gig) {
    var date = moment(gig.date).format('D MMMM YYYY');
    var address = _.get(gig, 'venue.address', '').replace(/\s/g, '+');
    if(address.length === 0) {
        return 'Geen address bekend...';
    }
    var gLink = 'http://maps.google.com/?daddr='+address;
    var aLink = 'http://maps.apple.com/?daddr='+address;
    var gLinks = ':trolleybus: *OV*: <'+gLink+'&dirflg=r|Google Maps> | <'+aLink+'&dirflg=r|Apple Maps>';
    var aLinks = ':red_car: *Car*: <'+gLink+'&dirflg=d|Google Maps> | <'+aLink+'&dirflg=d|Apple Maps>';
    return '*'+_.get(gig, 'venue.name', '')+'* - _'+date+'_\n\n'+gLinks+'\n\n'+aLinks+'\n\n'+_.get(gig, 'venue.address')+'\n\n'+gig.times;
};

module.exports.keysToAttachments = function(arr) {
    return _.map(arr, function(value, key){
        return {
            title: key,
            value: value.description + '\n_Alias: ' + value.aliasses.join(',') + '_',
            short: true
        };
    });
};
