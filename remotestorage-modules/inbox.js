RemoteStorage.defineModule('inbox', function(privateClient, publicClient) {
  var activity, last, timestamp, activityHandlers = [];

  function addToConversation(conversationName, id) {
    var previousId = last.get(conversationName),
      previousActivity;
    if (previousId && previousId.last) {
      previousActivity = activity.get(previousId.last);
      console.log(previousId.last, previousActivity);
      if (previousActivity) {
        previousActivity.next = id;
        console.log('storing previous', previousId.last, previousActivity);
        activity.set(previousId.last, previousActivity);
      }
    }
    console.log('storing last', conversationName, id);
    last.set(conversationName, {last: id});
    return previousId.last;
  }
  
  function genNewId() {
    var currTime = new Date().getTime();
    if (currTime > timestamp) {
      timestamp = currTime;
    } else {
      //use minimal increments until wall time catches up:
      timestamp++;
    }
    return timestamp.toString();
  }
  function getId(obj) {
    var currTime, existingObj, id;
    if (obj.timestamp) {
      id = obj.timestamp.toString();
      existingObj = activity.get(id);
      if (existingObj) {
        for (field in existingObj) {
          if (obj[field] && obj[field] != existingObj[field]) {
            return genNewId();
          }
        }
        for (field in obj) {
          if (existingObj[field] && obj[field] != existingObj[field]) {
            return genNewId();
          }
        }
      }
      return id;
    }
    return genNewId();
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
        var i, id = getId(obj);
        var conversationName = window.asrender.determineConversationName(obj);
        obj.previous = addToConversation(conversationName, id);
        activity.set(id, obj);
        for(i=0; i<activityHandlers.length; i++) {
          activityHandlers[i](id, obj);
        }
      },
      addToConversation: addToConversation,
      regenerateConversations: function() {
        var thisConversationName, objs = remoteStorage.inbox.getActivitySince();
        for(id in objs) {
          thisConversationName = window.asrender.determineConversationName(remoteStorage.inbox.getActivity(id));
          objs[id].previous = remoteStorage.inbox.addToConversation(thisConversationName, id);
          activity.set(id, objs[id]);
        }
      },
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
      getActivityInterval: function(first, num, conversationName) {
        var i, thisId, ret = {}, obj, keys;
        if (conversationName) {
          thisId = last.get(conversationName);
          if(thisId) {
            thisId = thisId.last;
          }
          for (i=0; i<=first+num; i++) {
            obj = activity.get(thisId);
            console.log('adding', thisId, obj);
            if (i >= first) {
              ret[thisId] = obj;
            }
            thisId = obj.previous;
            if (!thisId) {
              return ret;
            }
          }
          return ret;
        } else {
          keys = activity.getKeys();
          for(i=keys.length-first-1; i >= 0 && i > keys.length-first-num-1; i--) {
            ret[keys[i]] = activity.get(keys[i]);
          }
          return ret;
        }
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