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
              (function(j) {
                return function(f) {
                  console.log('got file', prefix+keysAndDirs.keys[j], f.data);
                  objects.push(f.data);
                };
              })(i),
              (function(j) {
                return function(err) {
                  console.log('error in file', prefix+keysAndDirs.keys[j], err);
                };
              })(i)
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
        _init: function() {
          privateClient.cache('');
        },
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
          return messages.getKeysAndDirs(prefix || '');
        },
        getImapBoxIndex: function(account, box) {
          return remoteStorage.email.priv.getAll('imap/'+account+'/'+box+'/');
        },
        getNextMissingSequence: function(account, box) {
          return remoteStorage.email.priv.getAll('imap/'+account+'/'+box+'/').then(
            function(map) {
              var i, highest=0, start;
              for(i in map) {
                if(parseInt(i)>highest) {
                  highest = i;
                }
                console.log('highest? ', i, highest);
              }
              for(i=highest;i>=0;i--) {
                if(map[i] || i===0) {
                  if(start) {
                    return 'highest:'+highest+', start:'+start+', end:'+(parseInt(i)+1)
                      +', suggestion: document.fetchEmails('+(1+Math.floor((highest-start)/10))+', '+10+', false);';
                  }
                } else {
                  if(!start) {
                    start = parseInt(i);
                  }
                }
              }
              return 'up to date! highest:'+highest+', start:'+start+', end:'+(parseInt(i)+1)+', map:'+JSON.stringify(map);
            }
          );
        },
        storeMessage: function(msgId, obj) {
          var existing = messages.getObject(msgId) || {},
            merge = JSON.parse(JSON.stringify(mergeObjects(existing, obj)));//to avoid DataCloneError
          console.log('merged', existing, obj, merge);
          return messages.storeObject('message', msgId, merge).then(function() {
            return privateClient.storeObject('imapSeqno-to-messageId', 'imap/anything@michielbdejong.com/INBOX/'+obj.object.imapSeqNo, {
              account: 'anything@michielbdejong.com',
              box: 'INBOX',
              seqNo: obj.object.imapSeqNo,
              messageId: msgId
            });
          });
        },
        getAll: getAll,
        priv: privateClient,
        getEverything: function() { var promise = promising(); promise.fulfill(); return promise; },
        setEverything: function() { }
        
      }
    };
  });
})();
remoteStorage.email._init();