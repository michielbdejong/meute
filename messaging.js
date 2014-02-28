document.messaging = (function() {
  var imapMsgRcvd = function() {};
  
  function storeContactsFromEmailObject(obj) {
    remoteStorage.contacts.addFromList(obj.actor);
    if(obj.target) {
      remoteStorage.contacts.addFromList(obj.target.to);
      remoteStorage.contacts.addFromList(obj.target.cc);
    }
  }
  document.extractContacts = function(account, box) {
    remoteStorage.email.getImapBoxIndex(account, box).then(
      function(inbox) {
        var a;
        for(a in inbox) {
          remoteStorage.email.getMessage(inbox[a].messageId).then(
            storeContactsFromEmailObject,
            (function(id) {
              return function(err) {
                console.log('error while getting message', err, id);
              };
            })(inbox[a].messageId)
          );
        }
      },
      function(err) {
        console.log('error getting imap box index', err);
      }
    );
  }
  function storeMessage(msg) {
    console.log('msg', msg, JSON.stringify(msg));
    if (msg.platform === 'irc' && document.ircIncoming) {
      document.ircIncoming(msg);
    }
    remoteStorage.inbox.logActivity(msg);
    if(typeof(msg)=='object' && msg.platform=='email' && msg.object && typeof(msg.object.imapSeqNo === 'number')) {
      imapMsgRcvd();
    }
    if(typeof(msg)=='object' && msg.platform=='email' && msg.object && typeof(msg.object.messageId) === 'string') {
      key = msg.object.messageId.split('?').join('??').split('/').join('?');
      //console.log('storing message', key, msg);
      remoteStorage.email.storeMessage(key, msg);
      storeContactsFromEmailObject(msg);
    }
  }
  function sendEmail(recipient, subject, text, inReplyTo, preview) {
    var msg = {
      platform: 'email',
      actor: {
        name: 'Michiel B. de Jong',
        address: 'anything@michielbdejong.com'
      },
      target: [{
        field: 'to',
        address: recipient,
        name: recipient
      }],
      object: {
        inReplyTo: inReplyTo,
        subject: subject,
        text: text
      },
      verb: 'send'
    };
    if(preview) {
      console.log(JSON.stringify(msg));
    } else {
      console.log('sending');
      send(msg);
    }
  }
  console.log('in messaging.js, getting sh config');
  var send = function() { console.log('not ready'); };
  remoteStorage.sockethub.getConfig().then(function(config) {
  console.log('in messaging.js, got sh config');
    if(!config) {
      config = {
        host: 'michielbdejong.com',
        path: '/sockethub',
        port: 10550,
        tls: true,
        secret: "1234567890"
      };
      remoteStorage.sockethub.writeConfig(config);
    }
    console.log(config, 'trying to set up sockethubClient!');
    try {
      document.sockethubClient = SockethubClient.connect({
        host: config.host,
        path: config.path,
        port: config.port,
        ssl: config.tls,
        tls: config.tls,
        register: {
          secret: config.secret
        }
      });
      function setEmailConfig(config) {
        document.sockethubClient.set('email', config).then(function(success) {
          console.log('success', success);
          if(document.onSockethubReady) {
            document.onSockethubReady();
          }
          send = function(msg) {
            document.sockethubClient.sendObject(msg);
          };
        }, function(failure) {
          console.log('failure', failure);
        });
      }
      document.setEmailPassword = function(pwd) {
        var config = {
          credentials: {
            'anything@michielbdejong.com': {
              actor: {
                address: 'anything@michielbdejong.com',
                name: 'Michiel de Jong'
              },
              smtp: {
                host: 'mail.gandi.net',
                username: 'anything@michielbdejong.com', 
                password: pwd,
                tls: false,
                port: 25
              },
              imap: {
                host: 'mail.gandi.net',
                username: 'anything@michielbdejong.com', 
                password: pwd,
                tls: false,
                port: 143
              }
            }
          }
        };
        remoteStorage.email.writeConfig(config).then(function(success) {
          console.log('success', success);
          if(success) {
            setEmailConfig(config);
          } else {
            console.log('setting email config failed');
          }
        });
      
      };
      document.sockethubClient.on('registered', function() {
        console.log('registered!');
        try {
         remoteStorage.email.getConfig().then(function(config) {
            if(typeof(config) === 'object' && config['@context']) {
              delete config['@context'];
            }
            console.log(config);
            if(config) {
              setEmailConfig(config);
            } else {
              console.log('please call document.setEmailPassword(\'hunter2\');!');
            }
          });
        } catch(e) {
          console.log(e.message);
        }
      });
      document.fetchEmailsFromTo = function (from, to, includeBody) {
        document.sockethubClient.sendObject({
          platform: 'email',
          verb: 'fetch',
          actor: {
            address: 'anything@michielbdejong.com'
          },
          object: {
            from: from,
            to: to,
            includeBody: includeBody
          }
        }).then(function(success) {
          console.log('success', success);
        }, function(failure) {
          console.log('failure', failure);
        });
      }
      
      document.sockethubClient.on('message', storeMessage);
    } catch(e) {
      console.log(e.message);
    }
  }, function(err) {
    console.log('getConfig error', err.message);
  });

  function findGaps(fix) {  
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {}
      max = 0,
      min = 99999999999999999,
      gapStart = false;
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo) {
        have[a[i].object.imapSeqNo] = true; 
        if (a[i].object.imapSeqNo > max) {
          max = a[i].object.imapSeqNo;
        }
        if (a[i].object.imapSeqNo < min) {
          min = a[i].object.imapSeqNo;
        }
      }
    }
    for(i=min; i<max; i++) {
      if (have[i]) {
        if (gapStart) {
          console.log('gap', gapStart, i-1);
          if (fix) {
            document.fetchEmailsFromTo(gapStart, gapStart + fix);
            fix = 0;
          }
          gapStart = false;
        }
      } else {
        if (!gapStart) {
          gapStart = i;
        }
      }
    }
    if (fix) {
      document.fetchEmailsFromTo(max, max + fix);
    }
    console.log('min,max', min, max);
  }
  function getSubjects(min) {
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {}
      max = 0;
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo && (!min || a[i].object.imapSeqNo > min)) {
        have[a[i].object.imapSeqNo] = a[i].object.subject; 
        if (a[i].object.imapSeqNo > max) {
          max = a[i].object.imapSeqNo;
        }
      }
    }
    return have;
  }
  function findEmailsFrom(address) {
    var i, a = remoteStorage.inbox.getActivitySince(),
      matches = {},
      num = 0;
    for (i in a) {
      if (a[i].actor && Array.isArray(a[i].actor) && a[i].actor[0] && a[i].actor[0].address && a[i].actor[0].address === address) {
        if (a[i].object && a[i].object.imapSeqNo) {
          matches[a[i].object.imapSeqNo] = a[i];
        } else {
          matches[num++] = a[i];
        }
      }
    }
    return matches;
  }
  function getFullMessage(msg) {
    if (msg.object.text || msg.object.html) {
      console.log('getFullMessage - 1');
      return msg;
    } else if (msg.object.messageId) {
      console.log('getFullMessage - 2');
      return remoteStorage.email.getMessage(msg.object.messageId).then(function(success) {
        console.log('success', success);
      }, function(failure) {
        console.log('failure', failure);
      });
    } else {
      console.log('getFullMessage - 3');
      console.log('retrieving full body', a[i]);
      document.sockethubClient.sendObject({
        platform: 'email',
        verb: 'fetch',
        actor: {
          address: 'anything@michielbdejong.com'
        },
        object: {
          from: imapSeqNo,
          to: imapSeqNo,
          includeBody: true
        }
      }).then(function(success) {
        console.log('success', success);
        document.result = success;
      }, function(failure) {
        console.log('failure', failure);
      });
      return;
    }
  }
  function getMessage(imapSeqNo) {
    var i, a = remoteStorage.inbox.getActivitySince();
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo === imapSeqNo) {
        return getFullMessage(a[i]);
      }
    }
  }
    
  function fetchNextMessages(n) {
    var timer = setTimeout("window.location = '';", 120000);
    rcvd = 0;
    if (!n) {
      n = 100;
    }
    imapMsgRcvd = function() {
      rcvd++;
      if(rcvd === n) {
        console.log('rcvd', rcvd);
        clearTimeout(timer);
        if(document.stop) { return; } //maybe this can help avoid getting so many AbortErrors on page refresh
        setTimeout('document.messaging.fetchNextMessages('+n+');', 500);//give it half a second to keep other tabs responsive (and maybe allow IndexedDB to complete updates?)
      }
    }
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {};
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo) {
        have[a[i].object.imapSeqNo] = true; 
      }
    }
    for(i=2; true; i++) {
      if (!have[i]) {
       console.log(i, Math.floor(i / n));
       document.fetchEmails(Math.floor(i / n), n, false);
       break;
      }
    }
  }
  //setInterval("fetchNextMessages(100);", 60000);
  
  return {
    getAccounts: function() {},//-> [{...}]
    setAccount: function() {},//(i, {...})
    onMessage: function() {},//(function(activity))
    findGaps: findGaps,
    getSubjects: getSubjects,
    findEmailsFrom: findEmailsFrom,
    getMessage: getMessage,
    fetchNextMessages: fetchNextMessages,
    getFeedTable: function(pageNum) {
      window.items = remoteStorage.inbox.getActivityInterval(100*pageNum, 100),
        str = '<table border="1">';
      for(var i in items) {
        items[i].id = i;
        str += asrender.toTableRow(items[i]);
      }
      return str + '</table>'; 
    },
    getConversationsTable: function() {
      return '<table><tr><td>'+remoteStorage.inbox.getConversationNames().join('</td><td>')+'</td></tr></table>';
    },
    storeMessage: storeMessage,
    sendEmail: sendEmail
  };

})();