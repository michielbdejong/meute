RemoteStorage.defineModule('inbox', function(privateClient, publicClient) {
  var activity, last, timestamp, activityHandlers = [];

  function addToConversation(conversationName, id) {
    var previousId = last.get(conversationName),
      previousActivity;
    if (previousId) {
      previousActivity = activity.get(previousId);
      previousActivity.next = id;
      console.log('storing previous', previousId, previousActivity);
      activity.set(previousId, previousActivity);
    }
    console.log('storing last', conversationName, id);
    last.set(conversationName, {last: id});
    return previousId;
  }

  return {
    exports: {
      _init: function() {
        privateClient.cache('');
        activity = new SyncedMap('activity', privateClient);
        last = new SyncedMap('last', privateClient);
        timestamp = new Date().getTime();
      },
      onActivity: function(cb) {
        activityHandlers.push(cb);
      },
      logActivity: function(obj) {
        var i, id, currTime = new Date().getTime();
        if(currTime > timestamp) {
          timestamp = currTime;
        } else {
          //use minimal increments until wall time catches up:
          timestamp++;
        }
        id = timestamp.toString();
        var conversationName = window.asrender.determineConversationName(obj);
        obj.previous = addToConversation(conversationName, id);
        activity.set(id, obj);
        for(i=0; i<activityHandlers.length; i++) {
          activityHandlers[i](id, obj);
        }
      },
      addToConversation: addToConversation,
      getConversations: function() {
        return last;
      },
      getActivitySince: function() {
        var i, ret = {}, keys = activity.getKeys();
        for(i=0;i<keys.length; i++) {
          ret[keys[i]] = activity.get(keys[i]);
        }
        return ret;
      },
      getActivityInterval: function(first, num) {
        var i, ret = {}, keys = activity.getKeys();
        for(i=keys.length-first-1; i >= 0 && i > keys.length-first-num-1; i--) {
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