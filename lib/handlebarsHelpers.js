var moment = require('moment');

module.exports = {
    'whitespaceToBr': function(string) {
        return string && string.replace ? string.replace(/\n/g, '<br/>') : string;
    },
    'whitespaceToNewline': function(string) {
        return string && string.replace ? string.replace(/(\s*\r\n\s*|\s*\n\s*|\s*\r\s*)/gm, '\n') : string;
    },
    'dateFormat': function(string, format) {
        var parsed = moment(string);
        return parsed.isValid() ? parsed.format(format) : string;
    }
};
