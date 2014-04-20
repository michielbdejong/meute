RemoteStorage.defineModule('email', function(privClient, pubClient) {
  if(!CredentialsStore) {
    throw new Error('please include utils/credentialsstore.js');
  }
  var credentialsStore = CredentialsStore('email', privClient);

  return {
    exports: {
      setConfig: credentialsStore.setConfig,
      getConfig: credentialsStore.getConfig
    }
  };
});