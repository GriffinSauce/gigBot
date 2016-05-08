var moment = require('moment');

module.exports = {
    'whitespaceToBr': function(string) {
        return string && string.replace ? string.replace(/\n/g, '<br/>') : string;
    },
    'newlineFix': function(string) {
        return string && string.replace ? string.replace(/\n/g, '&#10;') : string;
    },
    'dateFormat': function(string, format) {
        var parsed = moment(string);
        return parsed.isValid() ? parsed.format(format) : string;
    },
    'dateToISO': function(m) {
        return m && m.toISOString ? m.toISOString() : m;
    }
};
