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
//        document.sockethubClient.set(['irc', {
//         credentials: credentialObject
        document.sockethubClient.sendObject({
          object: {
           credentials: credentialObject
          },
          verb: 'set',
          target: [{platform: 'irc'}],
          platform: 'dispatcher'
        }).then(function () {
          // successful set credentials
          console.log('set irc credentials!');
          return document.sockethubClient.sendObject({
            verb: 'update',
            platform: 'irc',
            actor: {
              address: nick,
              name: nick
            },
            target: []
          });
        }).then(function () {
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
    document.sockethubClient.sendObject(obj).then(function () {
      console.log('message sent');
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

    document.sockethubClient.sendObject(obj).then(function () {
      console.log('changeNick success', obj);
    }, function (err) {
      console.log('changeNick return as error: ', err);
    });
}