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
            } else if (msg.verb === 'observe' && msg.object.objectType === 'attendance') {
              setAttendance(msg);
            } else {
              //storeMessage(msg);
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
        && attendance[msg.platform] && attendance[msg.platform][msg.target[0].address]) {
      delete attendance[msg.platform][msg.target[0].address][msg.actor.address];
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
      //getTemplate('homepage.html');
      //getTemplate('blogpost.html');
      //loadPosts();
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
  function addAccount(platform, server, id, name, pwd) {
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
    } else if (platform === 'email') {
      obj = {
        actor: {
          address: id,
          name: name
        },
        smtp: {
          username: id,
          objectType: 'credentials',
          host: server,
          password: pwd,
          tls: false,
          port: 25
        },
        imap: {
          username: id,
          objectType: 'credentials',
          host: server,
          password: pwd,
          tls: false,
          port: 143
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

  function on(eventName, eventHandler) {
    if (!handlers[eventName]) {
      handlers[eventName] = [];
    }
    handlers[eventName].push(eventHandler);
  }

  return {
    debugState: debugState,
    getSockethubClient: function() { return sockethubClient; },
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    join: join,
    leave: leave,
    send: send,
    toOutbox: toOutbox,
    on: on
  };
})();