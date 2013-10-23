(function () {
  var moduleName = 'email';

  RemoteStorage.defineModule(moduleName, function(privateClient, publicClient) {
    privateClient.cache('messages/');
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
var PrefixTree=function(baseClient){var maxLeaves=5,minDepth=1;function keyToBase(key,depth){return key.slice(0,depth).split("").join("/")+"/"}function keyToItemName(key,depth){return"_"+key.slice(depth)}function keyToPath(key,depth){return keyToBase(key,depth)+keyToItemName(key,depth)}function tryDepth(key,depth,checkMaxLeaves){var thisDir=keyToBase(key,depth);return baseClient.getListing(thisDir).then(function(listing){var itemsMap={},i,numDocuments;if(typeof listing=="object"){if(Array.isArray(listing)){for(i=0;i<listing.length;i++){itemsMap[listing[i]]=true}}else{itemsMap=listing}}console.log(thisDir,typeof itemsMap,itemsMap);if(itemsMap[key[depth]+"/"]){console.log("go deeper",key[depth]);return tryDepth(key,depth+1,checkMaxLeaves)}if(checkMaxLeaves){numDocuments=0;for(i in itemsMap){if(i.substr(-1)!="/"){numDocuments++}}if(numDocuments>=maxLeaves){console.log("no room",numDocuments);return depth+1}else{console.log("still room",numDocuments)}}return depth})}return{setMaxLeaves:function(val){maxLeaves=val},getFile:function(key){return tryDepth(key,minDepth,false).then(function(depth){return baseClient.getFile(keyToPath(key,depth))},function(err){console.log("getFile error",key,err.message)})},storeFile:function(mimeType,key,body){return tryDepth(key,minDepth,true).then(function(depth){return baseClient.storeFile(mimeType,keyToPath(key,depth),body)},function(err){console.log("storeFile error",mimeType,key,body,err.message)})},getObject:function(key){return tryDepth(key,minDepth,false).then(function(depth){return baseClient.getObject(keyToPath(key,depth))},function(err){console.log("getObject error",key,err.message)})},storeObject:function(typeAlias,key,obj){return tryDepth(key,minDepth,true).then(function(depth){return baseClient.storeObject(typeAlias,keyToPath(key,depth),obj)},function(err){console.log("storeObject error",typeAlias,key,obj,err.message)})}}};
