// initialize remoteStorage
global.WebFinger = require('webfinger.js');
var RemoteStorage = require('remotestoragejs');
var remoteStorage = new RemoteStorage({
    logging: true  // optinally enable debug logs (defaults to false)
});
global.remoteStorage = remoteStorage;

require('./upstream/promising');
global.WebSocket = require('websocket').client;
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

// initialize module
require('../modules/src/feeds.js');
remoteStorage.access.claim('feeds', 'rw');

remoteStorage.feeds.rssAtom.on('change', function (event) {
    console.log('- received change event: ', event);
});

function beginApp() {
  meute.addAccount('sockethub', 'ws://localhost:10550/', '1234567890');
  meute.addAccount('irc', 'irc.freenode.net', 'meute-butler');
  meute.join('irc', '#meute');
  meute.send('irc', '#meute', 'The butler did it!');
  meute.leave('irc', '#meute');
    // create a feed record
    remoteStorage.feeds.rssAtom.create({
        url: 'testurl',
        title: 'this is a test'
    })
    .then(function (feed) {
        console.log('- feed created ', feed);
        // retrieve all feeds
        remoteStorage.feeds.rssAtom.getAll()
        .then(function (feeds) {
            console.log('- all feeds', feeds);
        }, function (error) {
            console.log('*** error fetching all feeds', error);
        });
    });
}
