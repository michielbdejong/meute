RemoteStorage.defineModule('twitter-credentials', function(privClient, pubClient) {
  function setCreds(nick, a, b, c, d) {
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
    return privClient.storeFile('application/json', 'twitter-creds', JSON.stringify(credentialObject));
  }
  function getCreds() {
    return privClient.getFile('twitter-creds');
  }
  return {
    exports: {
      setCreds: setCreds,
      getCreds: getCreds
  };
});