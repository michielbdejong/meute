// initialize remoteStorage
global.WebFinger = require('webfinger.js');
global.md5 = require('md5');
var RemoteStorage = require('remotestoragejs');
var remoteStorage = new RemoteStorage({
    logging: true  // optinally enable debug logs (defaults to false)
});
global.remoteStorage = remoteStorage;

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

remoteStorage.feeds.on('change', function (event) {
    console.log('- received change event: ', event);
});

function beginApp() {
  // retrieve all feeds
  remoteStorage.feeds.getAll()
  .then(function (feeds) {
      console.log('- all feeds', feeds);
  }, function (error) {
      console.log('*** error fetching all feeds', error);
  });
}
