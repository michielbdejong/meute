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
    if(typeof(a.data) === 'string') {
      a.data = JSON.parse(a.data);
    }
    for (i in a.data) {
      nick =i;
      console.log('your Facebook nick is '+nick);
    }
    document.sockethubClient.set('facebook', {
     credentials: a.data
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
function fblike(likeUrl) {
  d(document.sockethubClient.sendObject({
    platform: 'facebook',
    actor: {
      address: nick,
      name: nick
    },
    verb: 'post',
    object: {
      text: likeUrl,
      url: likeUrl
    },
    target: []
  }));
}