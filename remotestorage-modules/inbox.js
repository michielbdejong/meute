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
        activity.set(timestamp.toString(), obj);
      },
      getActivitySince: function() {
        var i, ret = {}, keys = activity.getKeys();
        for(i=0;i<keys.length; i++) {
          ret[keys[i]] = activity.get(keys[i]);
        }
        return ret;
      },
      getActivity: function(key) {
        return activity.get(key);
      }
    }
  };
});