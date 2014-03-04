var nick

function setTwitterCreds(setNick, a, b, c, d) {
  var credentialObject = {};
  nick = setNick;
  credentialObject[nick] = {
    actor: {
      address: nick,
      name: nick
    },
    consumer_key: a,
    consumer_secret: b,
    access_token: c,
    access_token_secret: d
  };
  remoteStorage.scope('/twitter-credentials/').storeFile('application/json', 'twitter-creds', JSON.stringify(credentialObject));
}
function sendTwitterCreds() {
  remoteStorage.scope('/twitter-credentials/').getFile('twitter-creds').then(function(a) {
    console.log('twitter-creds', a);
    for (i in JSON.parse(a.data)) {
      nick =i;
      console.log('your Twitter nick is '+nick);
    }
    document.sockethubClient.set('twitter', {
     credentials: JSON.parse(a.data)
    }).then(function (obj) {
      // successful set credentials
      console.log('set twitter credentials!');
    });
  });
}
function tweet(str) {
  d(document.sockethubClient.sendObject({
    platform: 'twitter',
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