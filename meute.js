meute = (function() {
  var masterPwd, sockethubClient, config = {}, configuring = {}, configDone = {}, outbox = {},
    sockethubRegistered, roomJoins = {}, registeredActor = {}, handlers = {},
    attendance = {}, topic = {};

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
    return {
      masterPwd: masterPwd,
      sockethubClient: sockethubClient,
      config: config,
      configDone: configDone,
      outbox: outbox,
      sockethubRegistered: sockethubRegistered,
      roomJoins: roomJoins,
      registeredActor: registeredActor,
      attendance: attendance,
      topic: topic
    };
  }
  function connectFurther() {
    debug('connectFurther called');
    if (!config.sockethub) {
      //nothing to do without a sockethub config
      return;
    }
    if (!configDone.sockethub && !configuring.sockethub) {
      debug('configuring sockethub', config.sockethub);
      sockethubClient = SockethubClient.connect(config.sockethub);
      sockethubClient.on('registered', function() {
        sockethubRegistered = true;
        debug('registered! resending all platform configs');
        configuring = {};
        configDone = { sockethub: true };
        connectFurther();
      });
      sockethubClient.on('message', function(msg) {
        if (msg.verb === 'join' || msg.verb === 'leave') {
          updateAttendance(msg);
        } else if (msg.verb === 'observe' && msg.object.objectType === 'attendance') {
          setAttendance(msg);
        } else if (msg.verb === 'update' && msg.object.objectType === 'topic') {
          updateTopic(msg);
        } else {
          emit('message', msg);
        }
      });
      configuring.sockethub = true;
    } else if (sockethubRegistered) {
      for (var i in config) {
        if (i !== 'sockethub' && config[i].actor && config[i].object) {
          sendConfig(i);
        }
      }
    }
  }
  function sendConfig(platform) {
    configuring[platform] = true;
    sockethubClient.sendObject({
      platform: 'dispatcher',
      target: [{ platform: platform }],
      verb: 'set',
      object: config[platform].object,
      actor: config[platform].actor
    }).then(function() {
      delete configuring[platform];
      configDone[platform] = true;
      return joinRooms(platform);
    }).then(function() {
      flushOutbox(platform);
    });
  }
  function setAttendance(msg) {
    if (msg.verb === 'observe' && msg.platform && msg.object && msg.target && msg.target[0] && msg.target[0].address) {
      if (!attendance[msg.platform]) {
        attendance[msg.platform] = {};
      }
      attendance[msg.platform][msg.target[0]] = {};
      for(var i=0; i<msg.object.members.length; i++) {
        attendance[msg.platform][msg.target[0].address][msg.object.members[i]] = true;
      }
    }
  }
  function updateTopic(msg) {
    if (msg.verb === 'update' && msg.platform && msg.object && msg.object.topic && msg.target && msg.target[0] && msg.target[0].address) {
      if (!topic[msg.platform]) {
        topic[msg.platform] = {};
      }
      topic[msg.platform][msg.target[0].address] = msg.object.topic;
    }
  }
  function updateAttendance(msg) {
    if (msg.verb === 'join' && msg.platform && msg.actor && msg.actor.address
        && msg.target && msg.target[0] && msg.target[0].address) {
      if (!attendance[msg.platform]) {
        attendance[msg.platform] = {};
      }
      if (!attendance[msg.platform][msg.target[0].address]) {
        attendance[msg.platform][msg.target[0].address] = {};
      }
      attendance[msg.platform][msg.target[0].address][msg.actor.address] = true;
    } else if (msg.verb === 'leave' && msg.platform && msg.actor && msg.actor.address && msg.target
         && msg.target[0] && msg.target[0].address && attendance[msg.platform]
         && attendance[msg.platform][msg.target[0].address]) {
      delete attendance[msg.platform][msg.target[0].address][msg.actor.address];
    }
  }
  function sendOutboxItem(platform, obj, promise) {
    if (!obj.actor) {
      obj.actor = registeredActor[platform];
    }
    sockethubClient.sendObject(obj).then(function(res) {
      debug('sendOutboxItem success', res);
      if (promise) {
        promise.fulfill(res);
      }
    }, function(err) {
      debug('sendOutboxItem failure', err);
      if (promise) {
        promise.reject(err);
      }
    });
  }
  function flushOutbox(which) {
    debug('flushing outbox', which, outbox);
    if (configDone[which] && configDone['sockethub'] && Array.isArray(outbox[which])) {
      for (var i=0; i<outbox[which].length; i++) {
        sendOutboxItem(which, outbox[which][i].object, outbox[which][i].promise);
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
  function storeContact(contact) {
    if (remoteStorage.contacts) {
      remoteStorage.contacts.add({
        fn: contact.name,
        hasEmail: 'mailto:' + contact.address
      });
    }
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
      for (var i in modulesToTry) {
        if (!configDone[i]) {
          loadAccount(i);
        }
      }
      //getTemplate('homepage.html');
      //getTemplate('blogpost.html');
      //loadPosts();
    }
    if (remoteStorage.messages && registeredActor['email']) {
      remoteStorage.messages.account('mailto:'+registeredActor['email'].address).then(function(account) {
        on('message', function(msg) {
          account.store(msg);
          console.log('msg stored');
          if (Array.isArray(msg.actor)) {
            msg.actor.forEach(storeContact);
          }
          if (Array.isArray(msg.target.to)) {
            msg.target.to.forEach(storeContact);
          }
          if (Array.isArray(msg.target.cc)) {
            msg.target.cc.forEach(storeContact);
          }
          if (Array.isArray(msg.target.bcc)) {
            msg.target.bcc.forEach(storeContact);
          }
        });
        setInterval(function() {
          if (configDone['email'] && meute.email) {
            meute.email.fetch(0, 10);
            console.log('fetching and storing newest 10 emails');
          }
        }, 1000*60*10);
        console.log('will poll and store email for '+registeredActor['email'].address+' every 10 minutes');
      }, function(err) {
        console.log('failure calling remoteStorage.messages.account', err);
      });
    }
  }
  function loadAccount(which) {
    remoteStorage[which].getConfig(masterPwd).then(function(config) {
      console.log('config for', which, masterPwd, config);
      if (typeof(config) === 'object') {
        try {
          doAddAccount(which, config, false);
          console.log('added account', which);
        } catch(e) {
          debug('error adding account "'+which+'": '+e.message);
        }
      } else {
        debug('no config exists for '+which);
      }
    }, function(err) {
      debug('no config found for '+which+': '+err);
    });
  }
   
  function setMasterPassword(pwd) {
    //save loaded configs with the new pwd:
    for (var i in config) {
      console.log('changing master password for', i);
      remoteStorage[i].setConfig(pwd, config[i]);
    }
    masterPwd = pwd;
    bootstrap();
  }
  function addAccount(platform, server, id, pwd, name) {
    var parts, parts2, obj;
    if (platform === 'sockethub') {
      parts = server.split('/');
      parts2 = parts[2].split(':');
      obj = {
        host: parts2[0],
        ssl: (parts[0] === 'wss:'),
        tls: (parts[0] === 'wss:'),
        port: (parts2.length === 2 ? parseInt(parts2[1]) : undefined),
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
    } else if (platform === 'email') {
      obj = {
        actor: {
          address: id,
          name: name
        },
        object: {
          objectType: 'credentials',
          smtp: {
            username: id,
            host: server,
            password: pwd,
            tls: false,
            port: 25
          },
          imap: {
            username: id,
            host: server,
            password: pwd,
            tls: false,
            port: 143
          }
        }
      };
    } else if (platform === 'facebook') {
      obj = {
        actor: {
          address: 'me',
          name: 'me'
        },
        object: {
          objectType: 'credentials',
          access_token: server
        }
      };
    } else if (platform === 'twitter') {
      obj = {
        actor: {
          address: 'you',
          name: 'you'
        },
        object: {
          objectType: 'credentials',
          consumer_key: server, //aka API key
          consumer_secret: id, //aka API secret
          access_token: pwd,
          access_token_secret: name
        }
      };
    }
    doAddAccount(platform, obj);
  }
  function doAddAccount(which, thisConfig, save) {
    debug('doAddAccount("'+which+'", '+JSON.stringify(thisConfig)+')');
    if (thisConfig.actor) {
      registeredActor[which] = thisConfig.actor;
    }
    config[which] = thisConfig;
    connectFurther();
    if (save !== false && remoteStorage[which] && remoteStorage[which].setConfig) {
      remoteStorage[which].setConfig(masterPwd, thisConfig);
    }
  }
  function toOutbox(platform, obj, promise) {
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      sendOutboxItem(platform, obj, promise);
    } else {
      debug('queueing', JSON.stringify(obj));
      if (!Array.isArray(outbox[platform])) {
        outbox[platform] = [];
      }
      outbox[platform].push({
        object: obj,
        promise: promise
      });
    }
  }
  function join(platform, channels, leave) {
    var obj = {
      platform: platform,
      verb: (leave ? 'leave' : 'join'),
      object: {
        text: ''//required in leave verb schema
      },
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

    //only sending this if the platform is online now, otherwise
    //the rooms will be joined once the platform is configured
    //and joinRooms is called for it:
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      return sendOutboxItem(platform, obj);
    }

    //roomJoins will also be called again after each sockethub reconnect
  }
  function leave(platform, channels) {
    join(platform, channels, true);
  }
  function send(platform, target, text) {
    var promise = promising(),
      obj = {
        platform: platform,
        verb: 'send',
        target: [{
          address: target
        }],
        object: {
          text: text
        }
      };
    toOutbox(obj.platform, obj, promise);
    return promise;
  }
  function post(platform, target, text, inReplyTo) {
    var promise = promising(),
      obj = {
        platform: platform,
        verb: 'post',
        target: [{
          address: target
        }],
        object: {
          text: text
        }
      };
    if (inReplyTo) {
      obj.object.in_reply_to_status_id_str = inReplyTo;
    }
    toOutbox(obj.platform, obj, promise);
    return promise;
  }
  function retweet(platform, id) {
    var promise = promising(),
      obj = {
        platform: 'twitter',
        verb: 'post',
        object: {
          retweet: id,
          text: 'this text is only here to get past the sockethub schema and should not get tweeted!'
        },
        target: []
      };
    if (inReplyTo) {
      obj.object.in_reply_to_status_id_str = inReplyTo;
    }
    toOutbox(obj.platform, obj, promise);
    return promise;
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
    post: post,
    retweet: retweet,
    toOutbox: toOutbox,
    bootstrap: bootstrap,
    on: on
  };
})(); 
