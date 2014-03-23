remoteStorage.social = (function() {
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
    remoteStorage.sockethub.getConfig().then(function(config) {
      if (config) {
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
      }
    });
  }

  //...  
  bootstrap();

  return {
    setSockethub: function(url) {
      console.log('remoteStorage.social.setSockethub', url);
    },
    addAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      console.log('remoteStorage.social.addAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    removeAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      console.log('remoteStorage.social.removeAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    status: function() {
      console.log('remoteStorage.social.status');
    },
    send: function(platform, param1, param2, param3, param4) {
      console.log('remoteStorage.social.send', platform, param1, param2, param3, param4);
    },
    on: function(event, cb) {
      console.log('remoteStorage.social.on', event, cb);
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