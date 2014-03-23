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
    });
    emit('status', { sockethub: 'awaiting config' });
  }


  //twitter
  function sendTwitterCreds() {
    remoteStorage['twitter-credentials'].getCreds().then(function(a) {
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
    remoteStorage['facebook-credentials'].getCreds().then(function(a) {
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
      if (platform === 'twitter') {
        remoteStorage['twitter-credentials'].setCreds(cred1, cred2, cred3, cred4, cred5);
      } else if (platform === 'facebook') {
        remoteStorage['facebook-credentials'].setCreds(cred1, cred2);
      } else {
        console.log('remoteStorage.social.addAccount', platform, cred1, cred2, cred3, cred4, cred5);
      }
    },
    removeAccount: function(platform, cred1, cred2, cred3, cred4, cred5) {
      console.log('remoteStorage.social.removeAccount', platform, cred1, cred2, cred3, cred4, cred5);
    },
    send: function(platform, param1, param2, param3, param4) {
      if (platform === 'twitter') {
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
    }
  };
})();