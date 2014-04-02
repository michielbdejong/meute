meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {}, outbox = {},
    sockethubRegistered, roomJoins = {}, registeredActor = {};

  function debugState() {
    console.log('meute internal state',
        masterPwd, sockethubClient, config, configDone, outbox,
        sockethubRegistered, roomJoins, registeredActor);
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
            console.log('registered! resending all platform configs');
            for (i in configDone) {
              if (i !== 'sockethub') {
                delete configDone[i];
              }
            }
            connectFurther();
          });
          configDone[i] = true;
        } else if (sockethubRegistered) {        
          console.log('setting!', i);
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
 
  function flushOutbox(which) {
    console.log('flushing outbox', which, outbox);
    if (configDone[which] && configDone['sockethub'] && Array.isArray(outbox[which])) {
      for (var i=0; i<outbox[which].length; i++) {
        sockethubClient.sendObject(outbox[which][i]);
      }
      delete outbox[which];
    }
  }
  function joinRooms(platform) {
    var promise = promising(), pending = 0;
    if (!roomJoins[platform]) {
      return;
    }
    for (var i=0; i<roomJoins[platform].length; i++) {
      pending++;
      console.log('joining rooms', roomJoins[platform][i]);
      sockethubClient.sendObject(roomJoins[platform][i]).then(function() {
        pending--;
        if (pending === 0) {
          promise.fulfill();
        }
      });
    }
    if (pending === 0) {
      console.log('last room join done');
      promise.fulfill();
    }
    return promise;
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
          console.log('error adding account', which, config, e);
        }
      }
    }, function() {
      console.log('no config found for '+which);
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
      console.log('sending directly', JSON.stringify(obj));
      sockethubClient.sendObject(obj);
    } else {
      console.log('queueing', JSON.stringify(obj));
      if (!Array.isArray(outbox[platform])) {
        outbox[platform] = [];
      }
      outbox[platform].push(obj);
    }
  }
  function join(platform, channels) {
    var obj = {
      platform: platform,
      verb: 'join',
      object: {},
    };
    if (typeof(channels) === 'string') {
      channels = [channels];
    }
    obj.target = [];
    for (var i=0; i<channels.length; i++) {
      obj.target.push({
        address: channels[i]
      });
    }
    obj.actor = registeredActor[platform];
    if (!Array.isArray(roomJoins[platform])) {
      roomJoins[platform] = [];
    }
    roomJoins[platform].push(obj);

    //only sending this if the platform is online now, otherwise
    //the rooms will be joined once the platform is configured
    //and joinRooms is called for it:
    if (configDone[platform] && configDone['sockethub']) {
      console.log('sending directly', JSON.stringify(obj));
      sockethubClient.sendObject(obj);
    }
    
    //roomJoins will also be called again after each sockethub reconnect
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
  
  return {
    debugState: debugState,
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    join: join,
    send: send
  };
})();