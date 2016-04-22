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
