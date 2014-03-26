RemoteStorage.defineModule('facebook-credentials', function(privClient, pubClient) {

  function setCreds(pWd, nick, a) {
    var credentialObject = {};
    credentialObject[nick] = {
      access_token: a
    };
    privClient.storeFile('application/json', 'facebook-creds', 
        sjcl.encrypt(pwd, JSON.stringify(credentialObject)));
  }
  function getCreds(pwd) {
    return privClient.getFile('facebook-creds').then(function(a) {
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