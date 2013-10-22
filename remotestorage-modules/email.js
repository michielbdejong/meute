(function () {
  var moduleName = 'email';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    return {
      exports: {
        getConfig: function () {
          return privateClient.getObject('config.json');
        },
        writeConfig: function (data) {
          return privateClient.storeObject('config', 'config.json', data);
        }
      }
    };
  });
})();
