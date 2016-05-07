
// Create secrets json from environment vars
var fs = require('fs');
var dir = process.env.WERCKER_ROOT;
var secrets = {
    token: process.env.token,
    google: {
        private_key_id: process.env.google_private_key_id,
        private_key: process.env.google_private_key
    }
};

console.log('Listen closely, for I vill say zis only vonce');

secrets.google.private_key = secrets.google.private_key.replace(/\\\\n/g, '\n');

fs.writeFileSync(dir+'/secrets.json', JSON.stringify(secrets));

console.log('Shh, secrets were written');
