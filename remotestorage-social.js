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
      });
    });
    emit('status', { sockethub: 'awaiting config' });
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
      console.log('remoteStorage.social.addAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    removeAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      console.log('remoteStorage.social.removeAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    send: function(platform, param1, param2, param3, param4) {
      console.log('remoteStorage.social.send', platform, param1, param2, param3, param4);
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
      console.log('remoteStorage.social.reply', text, url);
    },
    retweet: function(url) {
      console.log('remoteStorage.social.retweet', url);
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
    }
  };
})();