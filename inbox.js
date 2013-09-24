    RemoteStorage.defineModule('inbox', function(privClient, pubClient) {
      function asyncTreeTrav(numLeft, stack, cb) {
        var curr = stack.pop();
        console.log('asyncTreeTrav', numLeft, stack, curr);
        privClient.cache(curr, true);
        privClient.getListing(curr).then(function(list) {
          list.sort(function(a, b) {
            return parseInt(a)-parseInt(b);
          });
          for(var i=0; i<list.length; i++) {
            if(list[i].substr(-1)=='/') {
              privClient.cache(curr+list[i], false);//don't cache subdirs unless we descend into them
              stack.push(curr+list[i]);
            } else {
              numLeft--;
              privClient.cache(curr+list[i], true);
              privClient.getFile(curr+list[i]).then(function(obj) {
                var msg;
                try {
                  msg = JSON.parse(obj.data);
                } catch(e) {
                  msg = e;
                }
                cb(msg);
              });
            }
          }
          if(numLeft>0) {
            asyncTreeTrav(numLeft, stack, cb);
          }
        });
      }
      function extractParticipants(obj) {
        var ret = [];
        console.log('extractParticipants', obj);
        if(typeof(obj)=='string') {
          console.log('string - returning', [obj]);
          return [obj];
        } else if(Array.isArray(obj)) {
          for(var i=0; i<obj.length; i++) {
            ret.push(extractParticipants(obj[i]));
          }
          console.log('array - returning', ret);
          return ret;
        } else if(typeof(obj)=='object' && typeof(obj.address)=='string') {
          console.log('object - returning', obj.address);
          remoteStorage.contacts.add(obj.address, obj);
          return [obj.address];
        } else if((typeof(obj)=='object') && ((typeof(obj.to)=='object') || (typeof(obj.cc)=='object') || (typeof(obj.bcc)=='object'))) {
          ret = extractParticipants(obj.to).concat(extractParticipants(obj.cc)).concat(extractParticipants(obj.bcc));
          console.log('to/cc/bcc - returning', ret);
          return ret;
        } else {
          console.log('returning nothing');
          return [];
        }
      }
      function determineGroup(obj) {
        var memberships = {
          'unhosted@googlegroups.com': {'anything@michielbdejong.com':true, 'nick@silverbucket.net':true}
        };
        var all = [];
        if(typeof(obj.actor) != 'undefined') {
          all = all.concat(extractParticipants(obj.actor));
        }
        if(typeof(obj.target) != 'undefined') {
          all = all.concat(extractParticipants(obj.target));
        }
        console.log('all', all);
        var groups = [];
        for(var i=0; i<all.length; i++) {
          if(memberships[all[i]]) {
            groups.push(all[i]);
          }
        }
        var filtered=[], alreadyInGroup;
        for(var i=0; i<all.length; i++) {
          alreadyInGroup=false;
          for(var j=0; j<groups.length; j++) {
            if(memberships[groups[j]][all[i]]) {
              alreadyInGroup=true;
              break;
            }
          }
          if(!alreadyInGroup) {
            filtered.push(all[i]);
          }
        }
        return filtered
          .sort()
          .join(',');
      }
      return {
        exports: {
          getLast: function(num, cb) {
            asyncTreeTrav(num, [''], cb);
          },
          getLastGrouped: function(num, cb) {
            var groups = [], numDone = 0;
            asyncTreeTrav(num, [''], function(obj) {
              try {
                var group = determineGroup(obj);
                console.log('group of ', obj, ' is ', group);
                for(var i=0; i<groups.length; i++) {
                  if(groups[i].group==group) {
                    groups[i].messages.push(obj);
                    numDone++;
                    if(numDone==num) {
                      cb(groups);
                    }
                    return;
                  }
                }//group is new:
                groups.push({
                  group: group,
                  messages: [obj]
                });
                numDone++;
                if(numDone==num) {
                  cb(groups);
                }
              } catch(e) {
                console.log('yo', e.message);
              }
            });
          },
          getPrivClient: function() { return privClient; }
        }
      }
    });
