remoteStorage.social = (function() {
  var eventHandlers = {};
  
  function emit(eventName, eventObj) {
    if (eventHandlers[eventName]) {
      for (var i=0; i<eventHandlers[eventName].length; i++) {
        eventHandlers[eventName][i](eventObj);
      }
    }
  }

  function bootstrap() {
    if (!remoteStorage) {
      console.log('please include remotestorage.js first');
      return;
    }
    if (!SockethubClient) {
      console.log('please include sockethub-client.js first');
      return;
    }
    if (!remoteStorage.sockethub) {
      console.log('please include remotestorage.js first');
      return;
    }
    remoteStorage.access.claim('sockethub', 'rw');
    remoteStorage.sockethub.onFirstConfig(function(config) {
      console.log('first config', JSON.stringify(config));
      emit('status', { sockethub: 'connecting' });
      remoteStorage.social._shClient = SockethubClient.connect({
        host: config.host,
        path: config.path,
        port: config.port,
        ssl: config.tls,
        tls: config.tls,
        register: {
          secret: config.secret
        }
      })
      setTimeout(function() {
        sendTwitterCreds();
        sendFacebookCreds();
      }, 1000);
      remoteStorage.social._shClient.on('message', function(msg) {
        emit('message', msg);
      });
      remoteStorage.social._shClient.on('registered', function() {
        console.log('registered!');
        remoteStorage.social._shClient.registered = true;
        for (i in remoteStorage.social._accountsToAdd) {
          remoteStorage.social.addAccount.apply(null, remoteStorage.social._accountsToAdd[i]);
        }
        remoteStorage.social._accountsToAdd = [];
        try {
         return;
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

    });
    emit('status', { sockethub: 'awaiting config' });
  }

  //email
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
      if (typeof(recipient) === 'object') {
        msg.target = [];
        for (i in recipient) {
          msg.target.push({
            field: i,
            address: recipient[i],
            name: recipient[i]
          });
        }
        console.log('msg', msg);
      }
      if(preview) {
        console.log(JSON.stringify(msg));
      } else {
        console.log('sending');
        send(msg);
      }
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
    };
    document.fetch1 = function(arr) {
      var i;
      for(i=0; i<arr.length; i++) {
        document.fetchEmailsFromTo(arr[i], arr[i], true);
      }
    };
    document.fetch2 = function(arr) {
      var i;
      for(i=0; i<arr.length; i++) {
        document.messaging.getMessage(arr[i]);
      }
    };
    

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
        
    return {
      findGaps: findGaps,
      getSubjects: getSubjects,
      findEmailsFrom: findEmailsFrom,
      getMessage: getMessage,
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
  
  //irc
  var ircNick;
  function joinRooms(server, nick, channels) {
    ircNick = nick;
    // set our credentials for the sockethub platform
    // (does not activate the IRC session, just stores the data)
    var credentialObject = {};
    credentialObject[nick] = {
      nick: nick,
      server: server,
      password: '',
      channels: channels,
      actor: {
        address: nick,
        name: nick
      }
    };
    console.log(credentialObject);
    remoteStorage.social._shClient.set('irc', {
     credentials: credentialObject
    }).then(function (obj) {
      // successful set credentials
      console.log('set irc credentials!');
      return remoteStorage.social._shClient.sendObject({
        verb: 'update',
        platform: 'irc',
        actor: {
          address: nick,
          name: nick
        },
        target: []
      });
    }).then(function (obj2) {
      console.log('irc connected to ', channels);
      var channelAddresses = [], i;
      for(i=0; i<channels.length; i++) {
        channelAddresses.push({address: channels[i]});
      }
      console.log('channelAddresses', channelAddresses);
      return remoteStorage.social._shClient.sendObject({
        verb: 'observe',
        platform: 'irc',
        actor: {
          address: nick,
          name: nick
        },
        target: channelAddresses,
        object: {
          objectType: 'attendance'
        }
      });
    }, function (err) {
      console.log('Sockethub Error: ' + err);
    });
  }
    
  function ircMsg(channel, message) {
    if (!message) {
      return false;
    }
    var obj = {
      verb: 'send',
      platform: 'irc',
      actor: { address: ircNick, name: ircNick },
      target: [{
        address: channel
      }],
      object: {
        text: message
      }
    };

    console.log('sendMessage called: ', obj);
    remoteStorage.social._shClient.sendObject(obj).then(function (obj2) {
      console.log('message sent', obj, obj2);
      if(document.ircIncoming) {
        document.ircIncoming(obj);
      }
    }, function (err) {
      console.log('error sending message', err);
    });
  }

  function changeNick(nick) {
    var self = this;
    if (!nick) {
      return false;
    }
    var obj = {
      verb: 'update',
      platform: 'irc',
      actor: { name: ircNick, address: ircNick},
      target: [{
        address: nick
      }],
      object: {
        objectType: 'address'
      }
    };

    remoteStorage.social._shClient.sendObject(obj).then(function (obj2) {
      console.log('changeNick success', obj);
      if(document.ircIncoming) {
        document.ircIncoming(obj2);
      }
    }, function (err) {
      console.log('changeNick return as error: ', err);
    });
  }

  function getAttendants(channel) {
    var self = this;
    if (!channel) {
      return false;
    }
    var obj = {
      verb: 'observe',
      platform: 'irc',
      actor: { name: ircNick, address: ircNick},
      target: [{
        address: channel
      }],
      object: {
        objectType: 'attendance'
      }
    };

    remoteStorage.social._shClient.sendObject(obj).then(function (obj2) {
      console.log('getAttendants success', obj);
      if(document.ircIncoming) {
        document.ircIncoming(obj2);
      }
    }, function (err) {
      console.log('getAttendants return as error: ', err);
    });
  }

  //twitter
  function sendTwitterCreds() {
    remoteStorage['twitter-credentials'].getCreds(remoteStorage.social._masterPwd).then(function(a) {
      console.log('twitter-creds', a);
      if(typeof(a.data) === 'string') {
        a.data = JSON.parse(a.data);
      }
      for (i in a.data) {
        nick =i;
        console.log('your Twitter nick is '+nick);
      }
      remoteStorage.social._shClient.set('twitter', {
       credentials: a.data
      }).then(function (obj) {
        // successful set credentials
        console.log('set twitter credentials!');
      });
    });
  }
  function tweet(str, inReplyTo, cb) {
    console.log('tweet', str, inReplyTo);
    d(remoteStorage.social._shClient.sendObject({
      platform: 'twitter',
      actor: {
        address: nick,
        name: nick
      },
      verb: 'post',
      object: {
        text: str,
        in_reply_to_status_id_str: inReplyTo
      },
      target: []
    }).then(function(obj) {
      console.log(JSON.stringify(obj.object));
      cb(obj.object.id_str);
      return obj;
    }));
  }
  function retweet(id, cb) {
    d(remoteStorage.social._shClient.sendObject({
      platform: 'twitter',
      actor: {
        address: nick,
        name: nick
      },
      verb: 'post',
      object: {
        retweet: id,
        text: 'this text is only here to get past the sockethub schema and should not get tweeted!'
      },
      target: []
    }).then(function(obj) {
      console.log(JSON.stringify(obj.object));
      cb(obj.object);
      return obj;
    }));
  }

  //facebook
  function sendFacebookCreds() {
    remoteStorage['facebook-credentials'].getCreds(remoteStorage.social._masterPwd).then(function(a) {
      console.log('facebook-creds', a);
      if(typeof(a.data) === 'string') {
        a.data = JSON.parse(a.data);
      }
      for (i in a.data) {
        nick =i;
        console.log('your Facebook nick is '+nick);
      }
      remoteStorage.social._shClient.set('facebook', {
       credentials: a.data
      }).then(function (obj) {
        // successful set credentials
        console.log('set facebook credentials!');
      });
    });
  }
  function fbpost(str) {
    d(remoteStorage.social._shClient.sendObject({
      platform: 'facebook',
      actor: {
        address: nick,
        name: nick
      },
      verb: 'post',
      object: {
        text: str
      },
      target: []
    }));
  }
  function fblike(likeUrl) {
    d(remoteStorage.social._shClient.sendObject({
      platform: 'facebook',
      actor: {
        address: nick,
        name: nick
      },
      verb: 'post',
      object: {
        text: likeUrl,
        url: likeUrl
      },
      target: []
    }));
  }


  //...  
  setTimeout(bootstrap, 0);

  return {
    setSockethub: function(url, secret) {
      var config = { secret: secret }, parts1, parts2;
      if (url.substring(0, 'wss://'.length) ===  'wss://') {
        config.tls = true;
        parts1 = url.substring('wss://'.length).split('/');
      } else if (url.substring(0, 'ws://'.length) ===  'ws://') {
        config.tls = false;
        parts1 = url.substring('ws://'.length).split('/');
      } else {
        return 'please start the url with ws:// or wss://';
      }
      config.path = parts1[1];
      parts2 = parts1[0].split(':');
      config.host = parts2[0];
      config.port = parts2[1];
      remoteStorage.sockethub.writeConfig('default', config);
    },
    addAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      if (!remoteStorage.social._shClient || !remoteStorage.social._shClient.registered) {
        if (!remoteStorage.social._accountsToAdd) {
          remoteStorage.social._accountsToAdd = [];
        }
        remoteStorage.social._accountsToAdd.push(arguments);
      } else {
        if (platform === 'twitter') {
          remoteStorage['twitter-credentials'].setCreds(remoteStorage.social._masterPwd, cred1, cred2, cred3, cred4, cred5);
        } else if (platform === 'facebook') {
          remoteStorage['facebook-credentials'].setCreds(remoteStorage.social._masterPwd, cred1, cred2);
        } else if (platform === 'irc') {
          joinRooms(cred1, cred2, cred3);
        } else {
          console.log('remoteStorage.social.addAccount', platform, cred1, cred2, cred3, cred4, cred5);
        }
      }
    },
    removeAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      console.log('remoteStorage.social.removeAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    send: function(platform, param1, param2, param3, param4) {
      if (platform === 'irc') {
        ircMsg(param1, param2);
      } else if (platform === 'twitter') {
        tweet(param1);
      } else if (platform === 'facebook') {
        fbpost(param1);
      } else {
        console.log('remoteStorage.social.send', platform, param1, param2, param3, param4);
      }
    },
    on: function(event, cb) {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(cb);
    },
    markRead: function(from, to, val) {
      console.log('remoteStorage.social.markRead', from, to, val);
    },
    scroll: function(from, to) {
      console.log('remoteStorage.social.scroll', from, to);
    },
    publish: function(text, syndicate) {
      console.log('remoteStorage.social.publish', text, syndicate);
    },
    reply: function(text, url) {
      if (platform === 'twitter') {
        tweet(text, url);
      } else {
        console.log('remoteStorage.social.reply', text, url);
      }
    },
    retweet: function(url) {
      var parts = url.split('/');
      retweet(parts[parts.length-1]);
      //console.log('remoteStorage.social.retweet', url);
    },
    favorite: function(url) {
      console.log('remoteStorage.social.favorite', url);
    },
    blog: function(title, html) {
      console.log('remoteStorage.social.blog', title, html);
    },
    addContact: function(name, address) {
      console.log('remoteStorage.social.addContact', name, address);
    },
    findContact: function(prefix, cb) {
      console.log('remoteStorage.social.findContact', prefix, cb);
    },
    setMasterPassword: function(pwd) {
      remoteStorage.social._masterPwd = pwd;
    }
  };
})();