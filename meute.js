meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {}, sockethubRegistered;

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
            console.log('registered!');
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
        }
      }
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
      try {
        addAccount(which, config, false);
      } catch(e) {
        console.log('error adding account', which, config, e);
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
  function join(platform, actor, channels) {
    sockethubClient.sendObject({
      platform: 'irc',
      verb: 'join',
      actor: actor,
      target: channels,
      object: {},
    });
  }
  function send(obj) {
    sockethubClient.sendObject(obj);
  }
  
  return {
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    join: join,
    send: send
  };
})();