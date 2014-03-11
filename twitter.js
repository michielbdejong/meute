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
    if(typeof(a.data) === 'string') {
      a.data = JSON.parse(a.data);
    }
    for (i in a.data) {
      nick =i;
      console.log('your Twitter nick is '+nick);
    }
    document.sockethubClient.set('twitter', {
     credentials: a.data
    }).then(function (obj) {
      // successful set credentials
      console.log('set twitter credentials!');
    });
  });
}
function tweet(str, inReplyTo, cb) {
  console.log('tweet', str, inReplyTo);
  d(document.sockethubClient.sendObject({
    platform: 'twitter',
    actor: {
      address: nick,
      name: nick
    },
    verb: 'post',
    object: {
      text: str,
      in_reply_to_status_id_str: inReplyTo
    },
    target: []
  }).then(function(obj) {
    console.log(JSON.stringify(obj.object));
    cb(obj.object.id_str);
    return obj;
  }));
}
function retweet(id, cb) {
  d(document.sockethubClient.sendObject({
    platform: 'twitter',
    actor: {
      address: nick,
      name: nick
    },
    verb: 'post',
    object: {
      retweet: id,
      text: 'this text is only here to get past the sockethub schema and should not get tweeted!'
    },
    target: []
  }).then(function(obj) {
    console.log(JSON.stringify(obj.object));
    cb(obj.object);
    return obj;
  }));
}