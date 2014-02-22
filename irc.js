var ircNick;
function joinRooms(nick, channels) {
  ircNick = nick;
        // set our credentials for the sockethub platform
        // (does not activate the IRC session, just stores the data)
        var credentialObject = {};
        credentialObject[nick] = {
          nick: nick,
          server: 'irc.freenode.net',
          password: '',
          channels: channels,
          actor: {
            address: nick,
            name: nick
          }
        };
        document.sockethubClient.set('irc', {
         credentials: credentialObject
        }).then(function (obj) {
          // successful set credentials
          console.log('set irc credentials!');
          if(document.ircIncoming) {
            document.ircIncoming(obj);
          }
          return document.sockethubClient.sendObject({
            verb: 'update',
            platform: 'irc',
            actor: {
              address: nick,
              name: nick
            },
            target: []
          });
        }).then(function (obj2) {
          if(document.ircIncoming) {
            document.ircIncoming(obj);
          }
          console.log('irc connected to ', channels);
          var channelAddresses = [], i;
          for(i=0; i<channels.length; i++) {
            channelAddresses.push({address: channels[i]});
          }
          console.log('channelAddresses', channelAddresses);
          return document.sockethubClient.sendObject({
            verb: 'observe',
            platform: 'irc',
            actor: {
              address: nick,
              name: nick
            },
            target: channelAddresses,
            object: {
              objectType: 'attendance'
            }
          });
        }, function (err) {
          console.log('Sockethub Error: ' + err);
        });
      }
      
function ircMsg(channel, message) {
    if (!message) {
      return false;
    }
    var obj = {
      verb: 'send',
      platform: 'irc',
      actor: { address: ircNick, name: ircNick },
      target: [{
        address: channel
      }],
      object: {
        text: message
      }
    };

    console.log('sendMessage called: ', obj);
    document.sockethubClient.sendObject(obj).then(function (obj2) {
      console.log('message sent', obj, obj2);
      if(document.ircIncoming) {
        document.ircIncoming(obj);
      }
    }, function (err) {
      console.log('error sending message', err);
    });
}

function changeNick(nick) {
    var self = this;
    if (!nick) {
      return false;
    }
    var obj = {
      verb: 'update',
      platform: 'irc',
      actor: { name: ircNick, address: ircNick},
      target: [{
        address: nick
      }],
      object: {
        objectType: 'address'
      }
    };

    document.sockethubClient.sendObject(obj).then(function (obj2) {
      console.log('changeNick success', obj);
      if(document.ircIncoming) {
        document.ircIncoming(obj2);
      }
    }, function (err) {
      console.log('changeNick return as error: ', err);
    });
}

function getAttendants(channel) {
    var self = this;
    if (!channel) {
      return false;
    }
    var obj = {
      verb: 'observe',
      platform: 'irc',
      actor: { name: ircNick, address: ircNick},
      target: [{
        address: channel
      }],
      object: {
        objectType: 'attendance'
      }
    };

    document.sockethubClient.sendObject(obj).then(function (obj2) {
      console.log('getAttendants success', obj);
      if(document.ircIncoming) {
        document.ircIncoming(obj2);
      }
    }, function (err) {
      console.log('getAttendants return as error: ', err);
    });
}