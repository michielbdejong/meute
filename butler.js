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

require('./upstream/remotestorage-modules/messages.js');
remoteStorage.access.claim('messages', 'rw');

function beginApp() {
  console.log('setting up meute event handlers');
  meute.on('message', function(msg) {
    console.log('meute message', msg);
  });

  meute.on('debug', function(msg) {
    console.log('meute debug', msg);
  });

  setTimeout(function() {
    console.log('connecting to sockethub:');
    meute.addAccount('sockethub', 'ws://localhost:10550/', '1234567890');
  }, 1000);

  setTimeout(function() {
    console.log('connecting to irc:');
    meute.addAccount('irc', 'irc.freenode.net', 'meute-butler');
  }, 3000);

  setTimeout(function() {
    console.log('joining #meute:');
    meute.join('irc', '#meute');
  }, 13000);
  setTimeout(function() {
    console.log('saying hi:');
    meute.send('irc', '#meute', 'The butler did it!');
  }, 23000);
  setTimeout(function() {
    console.log('leaving room:');
    meute.leave('irc', '#meute');
  }, 25000);
}
