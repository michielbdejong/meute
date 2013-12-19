RemoteStorage.defineModule('inbox', function(privateClient, publicClient) {
  privateClient.cache('');
  var activity = new SyncedMap('activity', privateClient), timestamp = new Date().getTime();

  return {
    exports: {
      logActivity: function(obj) {
        timestamp++;
        var currTime = new Date().getTime();
        if(currTime > timestamp) {
          timestamp = currTime;
        }
        activity.set(timestamp, obj);
      },
      getActivitySince: function() {
        return activity.getKeys();
      }
    }
  };
});