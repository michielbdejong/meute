RemoteStorage.defineModule('inbox', function(privateClient, publicClient) {
  var activity, timestamp;

  return {
    exports: {
      _init: function() {
        privateClient.cache('');
        activity = new SyncedMap('activity', privateClient);
        timestamp = new Date().getTime();
      },
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
      },
      getEverything: function() { var promise = promising(); promise.fulfill(); return promise; },
      setEverything: function() { }
    }
  };
});
remoteStorage.inbox._init();