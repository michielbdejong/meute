RemoteStorage.defineModule('inbox', function(privateClient, publicClient) {
  var activity, last, timestamp, activityHandlers = [];

  function addToConversation(conversationName, id) {
    var previousId = last.get(conversationName),
      previousActivity;
    if (previousId && previousId.last) {
      previousActivity = activity.get(previousId.last);
      //console.log(previousId.last, previousActivity);
      if (previousActivity) {
        previousActivity.next = id;
        //console.log('storing previous', previousId.last, previousActivity);
        activity.set(previousId.last, previousActivity);
      }
    }
    //console.log('storing last', conversationName, id);
    last.set(conversationName, {last: id});
    if(typeof(previousId) === 'object') {
      return previousId.last;
    }
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
        obj.conversationName = window.asrender.determineConversationName(obj);
        obj.previous = addToConversation(obj.conversationName, id);
        activity.set(id, obj);
        for(i=0; i<activityHandlers.length; i++) {
          activityHandlers[i](id, obj);
        }
      },
      addToConversation: addToConversation,
      getConversationNames: function() {
        return last.getKeys();
      },
      regenerateConversations: function() {
        var thisConversationName, objs = remoteStorage.inbox.getActivitySince();
        for(id in objs) {
          console.log(id, objs[id].conversationName);
          thisConversationName = window.asrender.determineConversationName(remoteStorage.inbox.getActivity(id));
          objs[id].previous = remoteStorage.inbox.addToConversation(thisConversationName, id);
          objs[id].conversationName = thisConversationName;
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
            if(typeof(obj.previous) === 'object') {
              obj.previous = obj.previous.last;
              activity.set(thisId, obj);
            }
            thisId = obj.previous;
            if (!thisId) {
              return ret;
            }
          }
          return ret;
        } else {
          keys = activity.getKeys();
          for (i=keys.length-first-1; i >= 0 && i > keys.length-first-num-1; i--) {
            ret[keys[i]] = activity.get(keys[i]);
            if (typeof(ret[keys[i]].conversationName) === 'undefined') {
              ret[keys[i]].conversationName = window.asrender.determineConversationName(ret[keys[i]]);
              activity.set(keys[i], ret[keys[i]]);
            }
          }
          return ret;
        }
      },
      getActivity: function(key) {
        return activity.get(key);
      },
      getEverything: function() { var promise = promising(); promise.fulfill({
        last: last.getEverything(),
        activity: activity.getEverything()
      }); return promise; },
      setEverything: function(obj) {
        last.setEverything(obj.last);
        activity.setEverything(obj.activity);      
      }
    }
  };
});
remoteStorage.inbox._init();