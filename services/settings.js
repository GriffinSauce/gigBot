
var _ = require('lodash');
var Settings = require('../schemas/settings.js');
var log = require('../lib/logging');

module.exports.updateSettings = function(postData, done) {
    log.info('Updating settings with input: ', postData);

    // Rewrite links input
    var input = postData;
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

    // Find and update
    Settings.findOne({}, function(err, settings){
        var updatedSettings = settings;
        if(!settings) {
            updatedSettings = new Settings();
        }

        // Update props
        updatedSettings.links = links;
        updatedSettings.users = _.map(updatedSettings.users, function(user){
            user.requiredForGigs = input['requiredForGigs_'+user.name]==='true';
            return user;
        });
        updatedSettings.slackToken = postData.slackToken;

        // Save to db and global
        global.gigbot.settings = updatedSettings.toObject();
        updatedSettings.save(done);
    });
};
