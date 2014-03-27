meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {};

  function connectFurther() {
    if (config.sockethub) {
      if (configDone.sockethub) {
        for (i in config) {
          if (!configDone[i]) {
            sockethubClient.set(i, config[i]);
            configDone[i] = true;
          }
        }
      } else {
        sockethubClient = SockethubClient.connect(config.sockethub);
        sockethubClient.on('registered', function() {
          configDone.sockethub = true;
          connectFurther();
        });
      }
    } else {
      //nothing to do without a sockethub config
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
      remoteStorage.on('ready', function() {
        for (i in modulesToTry) {
          loadAccount(i);
        }
      });
    }
  }
  function loadAccount(which) {
    remoteStorage[which].getConfig(masterPwd).then(function(config) {
      addAccount(which, config);
    });
  }
   
  function setMasterPassword(pwd) {
    masterPwd = pwd;
    bootstrap();
  }
  function addAccount(which, thisConfig) {
    config[which] = thisConfig;
    connectFurther();
    if (remoteStorage[which] && remoteStorage[which].setConfig) {
      remoteStorage[which].setConfig(masterPwd, thisConfig);
    }
  }
  function send(obj) {
    sockethubClient.send(obj);
  }
  
  return {
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    send: send
  };
})();