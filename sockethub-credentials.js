RemoteStorage.defineModule(function(privClient) {
  return {
    exports: {
      getUrl: function() {
        return privClient.getFile('url.txt');
      },
      getToken: function() {
        return privClient.getFile('token.txt');
      }
    }
  };
});
