// initialize remoteStorage
var RemoteStorage = require('remotestoragejs');
var remoteStorage = new RemoteStorage({
    logging: true  // optinally enable debug logs (defaults to false)
});
global.remoteStorage = remoteStorage;

require('./upstream/promising');
global.WebSocketClient = require('websocket').client;
require('./upstream/sockethub-client');
require('./meute');

remoteStorage.on('ready', beginApp);

// configure remote
var userAddress = require('./butler-config').userAddress;
var token = require('./butler-config').token;
    
RemoteStorage.Discover(userAddress, function (storageURL, storageAPI) {
    console.log('- configuring remote', userAddress, storageURL, storageAPI);
    remoteStorage.remote.configure(userAddress, storageURL, storageAPI, token);
});

remoteStorage.on('connected', function() {
  console.log('- connected to remote (syncing will take place)');
});

remoteStorage.on('not-connected', function() {
  console.log('- not connected to remote (changes are local-only)');
});

// initialize modules
require('./upstream/remotestorage-modules/utils/credentialsstore.js');

require('./upstream/remotestorage-modules/sockethub-credentials.js');
remoteStorage.access.claim('sockethub-credentials', 'rw');

require('./upstream/remotestorage-modules/irc-credentials.js');
remoteStorage.access.claim('irc-credentials', 'rw');

require('./upstream/remotestorage-modules/twitter-credentials.js');
remoteStorage.access.claim('twitter', 'rw');

require('./upstream/remotestorage-modules/facebook-credentials.js');
remoteStorage.access.claim('facebook', 'rw');

require('./upstream/remotestorage-modules/email-credentials.js');
remoteStorage.access.claim('email', 'rw');

require('./upstream/remotestorage-modules/messages.js');
remoteStorage.access.claim('messages', 'rw');

function beginApp() {
  console.log('remoteStorage connected; bootstrapping meute');
  // if all configurations are available, this will connect to sockethub,
  // join some irc channels, and start logging to remoteStorage.messages:
  meute.bootstrap();
}
