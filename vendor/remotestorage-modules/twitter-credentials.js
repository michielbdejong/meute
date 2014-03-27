RemoteStorage.defineModule('twitter-credentials', function(privClient, pubClient) {
  function setCreds(pwd, nick, a, b, c, d) {
    var credentialObject = {};
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
    return privClient.storeFile('application/json', 'twitter-creds', 
        jscl.encrypt(pwd, JSON.stringify(credentialObject)));
  }
  function getCreds(pwd) {
    return privClient.getFile('twitter-creds').then(function(a) {
      a.data = sjcl.decrypt(pwd, a.data);
      return a;
    });
  }
  return {
    exports: {
      setCreds: setCreds,
      getCreds: getCreds
    }
  };
});