(function () {
  var moduleName = 'email';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    var PrefixTree = function(baseClient) {
      var maxLeaves=5, minDepth=1;
      //for key=='abcdefgh',
      // depth -> base + itemName:
      // 0 -> + abcdefgh
      // 1 -> a/ + bcdefgh
      // 2 -> a/b/ + cdefgh
      // 3 -> a/b/c/ + defgh
      // etc...
      function keyToBase(key, depth) {
        return key.slice(0, depth).split('').join('/')+'/';
      }
      function keyToItemName(key, depth) {
        return key.slice(depth);
      }
      function keyToPath(key, depth) {
        return keyToBase(key, depth)+keyToItemName(key, depth);
      }
      function tryDepth(key, depth, checkMaxLeaves) {
        var thisDir = keyToBase(key, depth);
        return baseClient.getListing(thisDir).then(function(listing) {
          var itemsMap={};
          if(typeof(listing)=='object') {
            if(Array.isArray(listing)) {
              for(var i=0; i<listing.length; i++) {
                itemsMap[listing[i]]=true;
              }
            } else {
              itemsMap = listing;
            }
          }
          console.log(thisDir, typeof(itemsMap), itemsMap);
          if(itemsMap[key[depth]+'/']) {//go deeper
            return tryDepth(key, depth+1);
          }
          if(checkMaxLeaves) {
            var numDocuments = 0;
            for(var i in itemsMap) {
              if(i.substr(-1) != '/') {
                numDocuments++;
              }
            }
            if(numDocuments >= maxLeaves) {//start new subtree for this char
              return depth+1;
            }
          }//this depth is OK
          return depth;
        });
      }
      return {
        setMaxLeaves: function(val) {
          maxLeaves=val;
        },
        getFile: function(key) {
          return tryDepth(key, minDepth, false).then(function(depth) {
            return baseClient.getFile(keyToPath(key, depth));
          }, function(err) {
            console.log('getFile error', key, err.message);
          });
        },
        storeFile: function(mimeType, key, body) {
          return tryDepth(key, minDepth, true).then(function(depth) {
            return baseClient.storeFile(mimeType, keyToPath(key, depth), body);
          }, function(err) {
            console.log('storeFile error', mimeType, key, body, err.message);
          });
        },
        getObject: function(key) {
          return tryDepth(key, minDepth, false).then(function(depth) {
            return baseClient.getObject(keyToPath(key, depth));
          }, function(err) {
            console.log('getObject error', key, err.message);
          });
        },
        storeObject: function(typeAlias, key, obj) {
          return tryDepth(key, minDepth, true).then(function(depth) {
            return baseClient.storeObject(typeAlias, keyToPath(key, depth), obj);
          }, function(err) {
            console.log('storeObject error', typeAlias, key, obj, err.message);
          });
        }
      };
    };

    var messages = PrefixTree(privateClient.scope('messages/'));
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
        storeMessage: function(msgId, obj) {
          return messages.storeObject('message', msgId, obj);
        }
      }
    };
  });
})();