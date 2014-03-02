var nick

function setFacebookCreds(setNick, a, b) {
  var credentialObject = {};
  nick = setNick;
  credentialObject[nick] = {
    access_token: b
  };
  remoteStorage.scope('/facebook-credentials/').storeFile('application/json', 'facebook-creds', JSON.stringify(credentialObject));
}
function sendFacebookCreds() {
  remoteStorage.scope('/facebook-credentials/').getFile('facebook-creds').then(function(a) {
    console.log('facebook-creds', a);
    document.sockethubClient.set('facebook', {
     credentials: JSON.parse(a.data)
    }).then(function (obj) {
      // successful set credentials
      console.log('set facebook credentials!');
    });
  });
}
function fbpost(str) {
  d(document.sockethubClient.sendObject({
    platform: 'facebook',
    actor: {
      address: nick,
      name: nick
    },
    verb: 'post',
    object: {
      text: str
    },
    target: []
  }));
}