(function () {
  var moduleName = 'email';
  
  function mergeObjects(existing, adding) {
    var i;
    if((typeof(adding) != 'object') || (typeof(existing) != 'object')) {
      return existing;
    }
    if(Array.isArray(existing)) {
      if(Array.isArray(adding)) {
        for(i=0; i<adding.length; i++) {
          if(existing.indexOf(adding[i]) == -1) {
            existing.push(adding[i]);
          }
        }
        return existing;
      } else {
        return Array.concat(existing, [adding]);
      }
    }
    if(Array.isArray(adding)) {
      return existing;
    }
    for(i in adding) {
      if(typeof(adding[i]=='object') && typeof(existing[i])) {
        existing[i]=mergeObjects(existing[i], adding[i]);
      }
      if(!existing[i]) {
        existing[i] = adding[i];
      }
    }
    return existing;
  }

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    privateClient.cache('');
    var messages = PrefixTree(privateClient.scope('messages/'));
    function getAll(prefix, cb) {
      console.log('getAll', prefix);
      var objects=[], pending = 0;
      function oneDone() {
        pending--;
        console.log('still pending for', prefix, pending);
        if(pending===0) {
          console.log('objects for prefix', prefix, objects);
          cb(objects);
        }
      }
      messages.getKeysAndDirs(prefix).then(
        function(keysAndDirs) {
          var i;
          for(i=0; i<keysAndDirs.keys.length; i++) {
            messages.getFile(keysAndDirs.keys[i]).then(
              function(f) {
                console.log('got file', prefix+keysAndDirs.keys[i], f.data);
                objects.push(f.data);
              },
              function(err) {
                console.log('error in file', prefix+keysAndDirs.keys[i], err);
              }
            );
          }
          for(i=0; i<keysAndDirs.dirs.length; i++) {
            pending++;
            console.log('now  pending for', prefix, pending);
            getAll(prefix+keysAndDirs.dirs[i], function(subdirObjects) {
              console.log('subdirObjects', prefix, subdirObjects);
              objects = objects.concat(subdirObjects);
              oneDone();
            });
          }
        },
        function(err) {
          console.log('error in subdir', prefix);
          cb([]);
        }
      );
    }
    return {
      exports: {
        getConfig: function () {
          return privateClient.getObject('config.json');
        },
        writeConfig: function (data) {
          return privateClient.storeObject('config', 'config.json', data);
        },
        getMessage: function(msgId) {
          return messages.getObject(msgId);
        },
        getMessageIds: function(prefix) {
          return messages.getKeysAndDirs(prefix);
        },
        storeMessage: function(msgId, obj) {
          var existing = messages.getObject(msgId) || {},
            merge = mergeObjects(existing, obj);
          console.log('merged', existing, obj, merge);
          return messages.storeObject('message', msgId, merge).then(function() {
            return privateClient.getObject('imap/anything@michielbdejong.com/INBOX/');
          }).then(function(list) {
            if(!list) {
              list = {};
            }
            list[obj.object.imapSeqno] = msgId;
            console.log('storing list', list);
            return privateClient.storeObject('imapSeqno-to-messageId', 'imap/anything@michielbdejong.com/INBOX/', list);
          });
        },
        getAll: getAll,
        priv: privateClient
      }
    };
  });
})();
var PrefixTree=function(baseClient){var maxLeaves=5,minDepth=1;function keyToBase(key,depth){return key.slice(0,depth).split("").join("/")+"/"}function keyToItemName(key,depth){return"_"+key.slice(depth)}function keyToPath(key,depth){return keyToBase(key,depth)+keyToItemName(key,depth)}function tryDepth(key,depth,checkMaxLeaves){var thisDir=keyToBase(key,depth);return baseClient.getListing(thisDir).then(function(listing){var itemsMap={},i,numDocuments;if(typeof listing=="object"){if(Array.isArray(listing)){for(i=0;i<listing.length;i++){itemsMap[listing[i]]=true}}else{itemsMap=listing}}console.log(thisDir,typeof itemsMap,itemsMap);if(itemsMap[key[depth]+"/"]){console.log("go deeper",key[depth]);return tryDepth(key,depth+1,checkMaxLeaves)}if(checkMaxLeaves){numDocuments=0;for(i in itemsMap){if(i.substr(-1)!="/"){numDocuments++}}if(numDocuments>=maxLeaves){console.log("no room",numDocuments);return depth+1}else{console.log("still room",numDocuments)}}return depth})}return{setMaxLeaves:function(val){maxLeaves=val},getFile:function(key){return tryDepth(key,minDepth,false).then(function(depth){return baseClient.getFile(keyToPath(key,depth))},function(err){console.log("getFile error",key,err.message)})},storeFile:function(mimeType,key,body){return tryDepth(key,minDepth,true).then(function(depth){return baseClient.storeFile(mimeType,keyToPath(key,depth),body)},function(err){console.log("storeFile error",mimeType,key,body,err.message)})},getObject:function(key){return tryDepth(key,minDepth,false).then(function(depth){return baseClient.getObject(keyToPath(key,depth))},function(err){console.log("getObject error",key,err.message)})},storeObject:function(typeAlias,key,obj){return tryDepth(key,minDepth,true).then(function(depth){return baseClient.storeObject(typeAlias,keyToPath(key,depth),obj)},function(err){console.log("storeObject error",typeAlias,key,obj,err.message)})}}};
