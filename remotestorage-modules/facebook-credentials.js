RemoteStorage.defineModule('facebook-credentials', function(privClient, pubClient) {

  function setCreds(nick, a) {
    var credentialObject = {};
    credentialObject[nick] = {
      access_token: a
    };
    privClient.storeFile('application/json', 'facebook-creds', JSON.stringify(credentialObject));
  }
  function getCreds() {
    return privClient.getFile('facebook-creds');
  }
  return {
    exports: {
      setCreds: setCreds,
      getCreds: getCreds
  };
});