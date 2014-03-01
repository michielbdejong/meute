var nick

function setFacebookCreds(setNick, a, b) {
  var credentialObject = {};
  nick = setNick;
  credentialObject[nick] = {
    access_token: b
  };
  document.sockethubClient.set('facebook', {
   credentials: credentialObject
  }).then(function (obj) {
    // successful set credentials
    console.log('set facebook credentials!');
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