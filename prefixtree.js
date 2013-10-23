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
    // _ prefix avoids name clash with dir name
    // and serves as the item name if no chars are left
    return '_'+key.slice(depth);
  }
  function keyToPath(key, depth) {
    return keyToBase(key, depth)+keyToItemName(key, depth);
  }
  function tryDepth(key, depth, checkMaxLeaves) {
    var thisDir = keyToBase(key, depth);
    return baseClient.getListing(thisDir).then(function(listing) {
      var itemsMap={}, i, numDocuments;
      if(typeof(listing)=='object') {
        if(Array.isArray(listing)) {
          for(i=0; i<listing.length; i++) {
            itemsMap[listing[i]]=true;
          }
        } else {
          itemsMap = listing;
        }
      }
      console.log(thisDir, typeof(itemsMap), itemsMap);
      if(itemsMap[key[depth]+'/']) {//go deeper
        console.log('go deeper', key[depth]);
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
          console.log('no room', numDocuments);
          return depth+1;
        } else {
          console.log('still room', numDocuments);
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
