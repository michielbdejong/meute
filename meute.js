meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {}, outbox = {}, sockethubRegistered;

  function debugState() {
    console.log('meute internal state', masterPwd, sockethubClient, config, configDone, outbox, sockethubRegistered);
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
          });
          configDone[i] = true;
          flushOutbox(i);
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
          addAccount(which, config, false);
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
  function addAccount(which, thisConfig, save) {
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
  function join(platform, actor, channels) {
    toOutbox(platform, {
      platform: 'irc',
      verb: 'join',
      actor: actor,
      target: channels,
      object: {},
    });
  }
  function send(obj) {
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