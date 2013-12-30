var PrefixTree = function(baseClient) {
  console.log('creating PrefixTree with base', baseClient.base);
  var maxLeaves=5, minDepth=1;
  //for key=='abcdefgh',
  // depth -> base + itemName:
  // 0 -> + _abcdefgh
  // 1 -> a/ + _bcdefgh
  // 2 -> a/b/ + _cdefgh
  // 3 -> a/b/c/ + _defgh
  // etc...
  function keyToBase(key, depth) {
    return key.slice(0, depth).split('').join('/')+'/';
  }
  function keyToItemName(key, depth) {
    // _ prefix avoids name clash with dir name
    // and serves as the item name if no chars are left
    return '_'+key.slice(depth);
  }
  function pathToKey(path) {
    var parts = path.split('/');
    if(parts[parts.length-1][0] != '_') {
      throw new Error('cannot parse path '+path+' to key');
    }
    parts[parts.length-1] = parts[parts.length-1].substring(1);
    return parts.join('');
  }
  function keyToPath(key, depth) {
    return keyToBase(key, depth)+keyToItemName(key, depth);
  }
  function getKeysAndDirs(path) {
    return baseClient.getListing(path).then(function(listing) {
      var itemsMap={}, i, keys = [], dirs = [];
      if(typeof(listing)=='object') {
        if(Array.isArray(listing)) {
          for(i=0; i<listing.length; i++) {
            itemsMap[listing[i]]=true;
          }
        } else {
          itemsMap = listing;
        }
      }
      for(i in itemsMap) {
        if(i.substr(-1)=='/') {
          dirs.push(path+i);
        } else {
          keys.push(pathToKey(path+i));
        }
      }
      return { keys: keys, dirs: dirs };
    });
  }
  
  function tryDepth(key, depth, checkMaxLeaves) {
    var thisDir = keyToBase(key, depth);
    return baseClient.getListing(thisDir).then(function(itemsMap) {
      var numDocuments;
      if(itemsMap[key[depth]+'/']) {//go deeper
        return tryDepth(key, depth+1, checkMaxLeaves);
      }
      if(checkMaxLeaves) {
        numDocuments = 0;
        for(i in itemsMap) {
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
  function storeObject(typeAlias, key, obj) {
    return tryDepth(key, minDepth, true).then(function(depth) {
      return baseClient.storeObject(typeAlias, keyToPath(key, depth), obj);
    }, function(err) {
      console.log('storeObject error', typeAlias, key, obj, err.message);
    });
  }
  
  console.log('returning PrefixTree with base', baseClient.base);
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
    storeObject: storeObject,
    storeObjects: function(typeAlias, map) {
      for(key in map) {
        storeObject(typeAlias, key, map[key]);
      }
    },
    on: function(event, cb) {
      if(event==='change') {
        baseClient.on('change', function(e) {
          e.key = pathToKey(e.relativePath);
          console.log('prefixTree added key to event', e.key, e.relativePath); 
          cb(e);
        });
      } else {
        baseClient.on(event, cb);
      }
    },
    getKeysAndDirs: getKeysAndDirs
  };
};

  function SyncedVar(name, baseClient) {
    var data;
    baseClient.on('change', function(e) {
      e.key = e.relativePath.substring('contacts/'.length);
      if(e.key==name) {
        data = e.newValue;
        delete data['@context'];
      }
    });
    return {
      get: function() {
        if(typeof(data) === 'object') {
          delete data['@context'];
        }
        return data;
      },
      set: function(val) {
        baseClient.storeObject('SyncedVar', name, val);
        data=val;
      }
    };
  }
  
  function SyncedMap(name, baseClient) {
    console.log('SyncedMap '+name+' building its prefixTree');
    var data = {}, prefixTree = PrefixTree(baseClient.scope(name+'/'));
    //prefixTree.cache('');
    console.log('SyncedMap '+name+' setting its prefixTree', prefixTree, '.on(\'change\', ... for baseClient with base', baseClient.base);
    prefixTree.on('change', function(e) {
      if(e.origin != 'window') {
        console.log('prefixTree event coming in to SyncedMap '+name, e);
        data[e.key] = e.newValue;
        delete data[e.key]['@context'];
      }
    });
    return {
      get: function(key) {
        if(typeof(data[key]) === 'object') {
          delete data[key]['@context'];
        }
        return data[key];
      },
      set: function(key, val) {
        prefixTree.storeObject('SyncedMapKey', key, val);
        data[key]=val;
      },
      getKeys: function() {
        return Object.getOwnPropertyNames(data);
      },
      getEverything: function() {
        return data;
      },
      setEverything: function(setData) {
        data = setData;
        prefixTree.storeObjects('SyncedMapKey', data);
      }
    };
  }