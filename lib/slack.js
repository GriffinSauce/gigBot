var _ = require("lodash");

module.exports.renderGigToSlackAttachment = function(gig) {
    return {
        "color": "#36a64f",
        "text": gig.datum+'\n',
        "fields": [
            {
                title: 'locatie',
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

module.exports.keysToAttachments = function(arr) {
    return _.map(_.keys(arr), function(string){
        return {
            title: string,
            short: true
        };
    });
}
