var _ = require("lodash");
var data = require('./services/data');

// Services
var messages = require('./services/messages');

data.init(function(){
    console.log('Data service online');
});

messages.init(function(){
    // callback, messages is (probably) online!
    console.log('Message service online');
});
