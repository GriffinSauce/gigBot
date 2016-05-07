var moment = require('moment');

module.exports = {
    'whitespaceToBr': function(string) {
        return string && string.replace ? string.replace(/\n/g, '<br/>') : string;
    },
    'dateFormat': function(string, format) {
        var parsed = moment(string);
        return parsed.isValid() ? parsed.format(format) : string;
    }
};