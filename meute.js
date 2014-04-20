meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {}, outbox = {},
    sockethubRegistered, roomJoins = {}, registeredActor = {}, handlers = {},
    attendance = {};

  function emit(eventName, obj) {
    if (Array.isArray(handlers[eventName])) {
      for (var i=0; i<handlers[eventName].length; i++) {
        handlers[eventName][i](obj);
      }
    }
  }

  function debug(obj) {
    emit('debug', obj);
  }

  function debugState() {
    debug(['meute internal state',
        masterPwd, sockethubClient, config, configDone, outbox,
        sockethubRegistered, roomJoins, registeredActor, attendance]);
  }
  function connectFurther() {
    if (!config.sockethub) {
      //nothing to do without a sockethub config
      return;
    }
    for (i in config) {
      if (!configDone[i]) {
        if (i === 'sockethub') {
          sockethubClient = SockethubClient.connect(config.sockethub);
          sockethubClient.on('registered', function() {
            sockethubRegistered = true;
            debug('registered! resending all platform configs');
            for (i in configDone) {
              if (i !== 'sockethub') {
                delete configDone[i];
              }
            }
            connectFurther();
          });
          sockethubClient.on('message', function(msg) {
            if (msg.verb === 'join' || msg.verb === 'leave') {
              updateAttendance(msg);
            } else {
              storeMessage(msg);
              emit('message', msg);
            }
          });
          configDone[i] = true;
        } else if (sockethubRegistered) {        
          debug('setting!', i);
          sockethubClient.sendObject({
            platform: 'dispatcher',
            target: [{ platform: i }],
            verb: 'set',
            object: config[i].object,
            actor: config[i].actor
          }).then(function() {
            configDone[i] = true;
            return joinRooms(i);
          }).then(function() {
            flushOutbox(i);
          });
        }
      }
    }
  }
  function updateAttendance(msg) {
    if (msg.verb === 'join' && msg.platform && msg.actor && msg.target) {
      if (!attendance[msg.platform]) {
        attendance[msg.platform] = {};
      }
      if (!attendance[msg.platform][msg.target]) {
        attendance[msg.platform][msg.target] = {};
      }
      attendance[msg.platform][msg.target][msg.actor] = true;
    } else if (msg.verb === 'leave' && msg.platform && msg.actor && msg.target
        && attendance[msg.platform] && attendance[msg.platform][msg.target]) {
      delete attendance[msg.platform][msg.target][msg.actor];
    }
  }
  function flushOutbox(which) {
    debug('flushing outbox', which, outbox);
    if (configDone[which] && configDone['sockethub'] && Array.isArray(outbox[which])) {
      for (var i=0; i<outbox[which].length; i++) {
        sockethubClient.sendObject(outbox[which][i]);
      }
      delete outbox[which];
    }
  }
  function joinRooms(platform) {
    var promise = promising(), channels = [];
    if (!roomJoins[platform]) {
      return;
    }
    for (i in roomJoins[platform]) {
      channels.push(i);
      debug('joining rooms', platform, channels);
    }
    return meute.join(platform, channels);
  }
  function bootstrap() {
    var modulesToTry = {
      sockethub: true,
      irc: true,
      twitter: true,
      facebook: true,
      email: true
    };
    if (remoteStorage) {
      for (i in modulesToTry) {
        loadAccount(i);
      }
    }
  }
  function loadAccount(which) {
    remoteStorage[which].getConfig(masterPwd).then(function(res) {
      var config = res.data;
      if (typeof(config) === 'object') {
        try {
          doAddAccount(which, config, false);
        } catch(e) {
          debug('error adding account', which, config, e);
        }
      }
    }, function() {
      debug('no config found for '+which);
    });
  }
   
  function setMasterPassword(pwd) {
    masterPwd = pwd;
    bootstrap();
  }
  function addAccount(platform, server, id) {
    var parts, parts2, obj;
    if (platform === 'sockethub') {
      parts = server.split('/');
      parts2 = parts[2].split(':');
      obj = {
        host: parts2[0],
        ssl: (parts[0] === 'wss:'),
        tls: (parts[0] === 'wss:'),
        port: (parts2.length === 2 ? parts2[1] : undefined),
        path: parts[3],
        register: { secret: id }
      };
    } else if (platform === 'irc') {
      obj = {
        actor: {
          address: id,
          name: id
        },
        object: {
          nick: id,
          objectType: 'credentials',
          server: server,
          password: '',
        }
      };
    }
    doAddAccount(platform, obj);
  }
  function doAddAccount(which, thisConfig, save) {
    if (thisConfig.actor) {
      registeredActor[which] = thisConfig.actor;
    }
    config[which] = thisConfig;
    connectFurther();
    if (save !== false && remoteStorage[which] && remoteStorage[which].setConfig) {
      remoteStorage[which].setConfig(masterPwd, thisConfig);
    }
  }
  function toOutbox(platform, obj) {
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      sockethubClient.sendObject(obj);
    } else {
      debug('queueing', JSON.stringify(obj));
      if (!Array.isArray(outbox[platform])) {
        outbox[platform] = [];
      }
      outbox[platform].push(obj);
    }
  }
  function join(platform, channels, leave) {
    var obj = {
      platform: platform,
      verb: (leave ? 'leave' : 'join'),
      object: {},
    };
    if (typeof(channels) === 'string') {
      channels = [channels];
    }
    if (typeof(roomJoins[platform]) != 'object') {
      roomJoins[platform] = {};
    }

    obj.target = [];
    for (var i=0; i<channels.length; i++) {
      obj.target.push({
        address: channels[i]
      });
      if (leave) {
        delete roomJoins[platform][channels[i]];
      } else {
        roomJoins[platform][channels[i]] = true;
      }
    }
    obj.actor = registeredActor[platform];

    //only sending this if the platform is online now, otherwise
    //the rooms will be joined once the platform is configured
    //and joinRooms is called for it:
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      return sockethubClient.sendObject(obj);
    }

    //roomJoins will also be called again after each sockethub reconnect
  }
  function leave(platform, channels) {
    join(platform, channels, true);
  }
  function send(platform, target, text) {
    var obj = {
      platform: platform,
      verb: 'send',
      actor: registeredActor[platform],
      target: [{
        address: target
      }],
      object: {
        text: text
      }
    };
    toOutbox(obj.platform, obj);
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
    if (preview) {
      console.log(JSON.stringify(msg));
    } else {
      console.log('sending');
      toOutbox(msg.platform, msg);
    }
  }
  function fetchEmailsFromTo(from, to, includeBody) {
    toOutbox('email', {
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
  function fetch1(arr) {
    var i;
    for(i=0; i<arr.length; i++) {
      fetchEmailsFromTo(arr[i], arr[i], true);
    }
  }
  function fetch2(arr) {
    var i;
    for(i=0; i<arr.length; i++) {
      getMessage(arr[i]);
    }
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

  function on(eventName, eventHandler) {
    if (!handlers[eventName]) {
      handlers[eventName] = [];
    }
    handlers[eventName].push(eventHandler);
  }

  return {
    debugState: debugState,
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    join: join,
    leave: leave,
    send: send,
    sendEmail: sendEmail,
    fetchEmailsFromTo: fetchEmailsFromTo,
    fetch1: fetch1,
    fetch2: fetch2,
    findEmailsFrom: findEmailsFrom,
    findGaps: findGaps,
    getSubjects: getSubjects,
    on: on
  };
})();