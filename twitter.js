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
  document.sockethubClient.set('twitter', {
   credentials: credentialObject
  }).then(function (obj) {
    // successful set credentials
    console.log('set twitter credentials!');
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