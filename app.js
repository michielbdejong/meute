    var userAddress = new WebSocket('wss://3pp.io:12380/q/websocket'), suggestions={};
    userAddress.onmessage=function(msg) {
      try {
        msg = JSON.parse(msg.data);
      } catch(e) {
        console.log('unparseable msg from userAddress', msg);
        return;
      }
      if(msg.textFields && msg.tools) {
        for(var i in msg.tools) {
          if(i.substring(0, 'mailto:'.length)=='mailto:') {
            suggestions[i.substring('mailto:'.length)]= {
              address: i.substring('mailto:'.length),
              name: msg.textFields.fullName,
              avatar: (msg.images?msg.images.avatar:'')
            };
            showSuggestions();
            break;
          }
        }
      }
    };
    function filterContacts(str) {
      var l, match, matchThis, theseTerms,
        matchTerms = str.trim().toLowerCase().split(' ');
      trs = document.getElementsByClassName('contactrow');
      for(var i=0; i<trs.length; i++) {
        match = true;
        for(var j=0; j<matchTerms.length; j++) {
          l=matchTerms[j].length;
          if(l>0) {
            matchThis=false;
            theseTerms = trs[i].getAttribute('data-search').split(' ');
            //console.log('matching '+matchTerms[j]+' against '+theseTerms.join(','));
            for(var k=0; k<theseTerms.length; k++) {
              if(theseTerms[k].substring(0, l).toLowerCase()==matchTerms[j]) {
                matchThis = true;
                break;
              }
            }
            if(!matchThis) {
              //console.log('no!');
              match = false;
              break;
            }
          }
        }
        if(match) {
          trs[i].style.display='block';
        } else {
          trs[i].style.display='none';
        }
      }
      if(userAddress && userAddress.readyState==WebSocket.OPEN) {
        suggestions={};
        userAddress.send(str);
      }
    }
    function showBoxes(screen) {
      var allBoxes = document.getElementsByClassName('box');
      for(var i=0; i<allBoxes.length; i++) {
        allBoxes[i].style.display=
            (allBoxes[i].classList.contains(screen)?'block':'none');
      }
    }
    function escape(str) {
      return (typeof(str)=='string'?str.replace(/['"<]/g, ''):'*');
    }
    function showContacts(contacts, table) {
      if(!contacts) {
        contacts=[];
        for(var i in contactsInMem) {
          contacts.push(contactsInMem[i]);
        }
      }
      if(!table) {
        table='contactsTable';
      }
      console.log(contacts); var str='';
      for(var i=0; i<contacts.length; i++) {
        str+='<tr class="contactrow" data-search="'
            +escape(contacts[i].name)+'" onmousedown="doAddRecipient(\''
            +escape(contacts[i].address)+'\', \''
            +escape(contacts[i].name)+'\', \''
            +escape(contacts[i].avatar)+'\'); '
            +'showBoxes(\'composescreen\');"><td><img src="'
            +escape(contacts[i].avatar)+'" /></td><td>'
            +escape(contacts[i].name)+'</td></tr>';
      }
      document.getElementById(table).innerHTML=str;
    }
    function doAddRecipient(address, name, avatar) {
      inReplyTo = undefined;
      recipients[recipientAddingTo].push({
        address: address,
        name: name,
        avatar: avatar
      });
      showContacts(recipients[recipientAddingTo], recipientAddingTo+'Table');
    }
    function showSuggestions() {
      var contacts=[];
      for(var i in suggestions) {
        contacts.push(suggestions[i]);
      }
      showContacts(contacts, 'suggestionsTable');
    }
    function showMessages() {
      var timestamps=[], str='', msg;
      for(i in messagesInMem) {
        timestamps.push(i);
      }
      timestamps.sort();
      parlays = {};
      for(var i=timestamps.length-1; i>=0; i--) {
        msg = messagesInMem[timestamps[i]];
        if(!parlays[msg.parlay]) {
          parlays[msg.parlay]=[];
          str+='<tr onmousedown="selectMessage(\''
              +escape(timestamps[i])+'\'); showBoxes(\'readscreen\');" ><td>'
              +escape(msg.parlay)+'</td><td><img src="'
              +escape(msg.avatar)+'" /> '
              +escape(msg.name)+'</td><td>'
              +escape(msg.text.substring(0, 50))+'</td></tr>';
        }
        parlays[msg.parlay].push(msg);
      }
      document.getElementById('messagesTable').innerHTML=str;
    }
    function selectMessage(id) {
      document.getElementById('readp').innerHTML = (messagesInMem[id]?
          messagesInMem[id].text.replace(/\n/g, '<br>')
          :'(cannot display message text)');
      showContacts([messagesInMem[id]], 'fromTable');
      showContacts([messagesInMem[id]], 'toTable');
      inReplyTo=id;
      recipients = {to: [messagesInMem[id].actor[0].address], cc: [], bcc: []};
    }
    function addRecipient(recipientType) {
      recipientAddingTo = recipientType;
      showBoxes('addscreen');
    }
    function loadMockData() {
       contactsInMem = [
        { name: 'MC Solaar', avatar: 'mock/avatar6.png' },
        { name: 'Michiel de Jong', avatar: 'mock/avatar1.png' },
        { name: 'Michiel Leenaars', avatar: 'mock/avatar5.png' },
        { name: 'Dalai Lama', avatar: 'mock/avatar2.png' },
        { name: 'Krafty Kuts', avatar: 'mock/avatar4.png' },
        { name: 'A Skillz', avatar: 'mock/avatar3.png' }
      ];
      showContacts();
      showContacts([
        { name: 'MC Solaar', avatar: 'mock/avatar6.png' },
      ], 'fromTable');
      showContacts([
        { name: 'A Skillz', avatar: 'mock/avatar3.png' }
      ], 'toTable');
      messagesInMem = {
        0: { name: 'Dalai Lama', avatar: 'mock/avatar2.png', parlay: 'Announcing Meute v0.1', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal'},
        1: { name: 'Michiel de Jong', avatar: 'mock/avatar1.png', parlay: 'Announcing Meute v0.1', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal'},
        2: { name: 'Krafty Kuts', avatar: 'mock/avatar4.png', parlay: 'The funky technician is back', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal' }
      };
      showMessages();
    }
    function sendMsg(preview) {
      var text = document.getElementById('compose').value,
        enterPos = text.indexOf('\n'),
        msg;
      msg = {
        target: {
          email: recipients
        },
        object: {
          inReplyTo: inReplyTo,
          subject: text.substring(0, enterPos),
          text: text.substring(enterPos+1)
        },
        verb: 'send'
      };
      if(preview) {
        console.log(JSON.stringify(msg));
      } else {
        send(msg);
      }
    }

    //...
    showBoxes('mainscreen');
    remoteStorage.contacts = {
      add: function(list) {
        if(Array.isArray(list)) {
          for(var i=0; i<list.length; i++) {
            contactsInMem[list[i].address] = list[i];
          }
        }
      }
    };
    function displayLast(num) {
      var i=0;
      remoteStorage.inbox.getLast(num, function(msg) {
        remoteStorage.contacts.add(msg.actor);
        if(typeof(msg.target)=='object' && !Array.isArray(msg.target)) {
          remoteStorage.contacts.add(msg.target.to);
          remoteStorage.contacts.add(msg.target.cc);
          remoteStorage.contacts.add(msg.target.bcc);
        }
        messagesInMem[(msg.object?msg.object.messageId:msg.timestamp)] = {
          name: (msg.actor?msg.actor[0].name:''),
          parlay: (msg.object ? msg.object.subject:JSON.stringify(msg)),
          text: (msg.object  && msg.object.text ? msg.object.text : '')
        };
        i++;
        if(i>=num) {
          showMessages();
          showContacts();
        }
      });
    }
    var messagesInMem={}, contactsInMem={}, inReplyTo, recipients={
      to:[], cc:[], bcc:[]
    }, recipientAddingTo='to';
    remoteStorage.displayWidget();
    remoteStorage.access.claim('inbox', 'r');
    remoteStorage.access.claim('email', 'rw');
    remoteStorage.access.claim('sockethub', 'r');
    //displayLast(50);
    var sock, send = function() { console.log('not ready'); };
    remoteStorage.sockethub.getConfig().then(function(config) {
      console.log(config);
      try {
        var sockethubClient = SockethubClient.connect({
          host: config.host,
          path: config.path,
          port: config.port,
          ssl: config.tls,
          tls: config.tls,
          register: {
            secret: config.secret
          }
        });
        sockethubClient.on('registered', function() {
          console.log('registered!');
          try {
            //var config = {
            //  credentials: {
            //    'user@example.com': {
            //      actor: {
            //        address: 'user@example.com',
            //        name: 'Example User'
            //      },
            //      smtp: {
            //        host: 'mail.gandi.net',
            //        username: 'user@example.com', 
            //        password: '...',
            //        tls: true,
            //        port: 465
            //      }
            //    }
            //  }
            //};
            //remoteStorage.email.writeConfig(config).then(function() {
            remoteStorage.email.getConfig(config).then(function(config) {
              delete config['@context'];
              console.log(config);
              sockethubClient.set('email', config, function(success) {
                console.log('success', success);
              }, function(failure) {
                console.log('failure', failure);
              });
            });
          } catch(e) {
            console.log(e.message);
          }
        });
      } catch(e) {
        console.log(e.message);
      }
      return;
      sock = new WebSocket(url.data);
      sock.onmessage=function(msg) { console.log('sock msg', msg.data); };
      sock.onopen=function(msg) { console.log('sock open', msg); };
      sock.onclose=function(msg) { console.log('sock closed', msg); };
      sock.onerror=function(msg) { console.log('sock error', msg); };
      remoteStorage.sockethub.getToken().then(function(token) {
        send = function(obj) { 
          obj.token = token.data.trim();
          sock.send(JSON.stringify(obj));
          console.log('sock sent', obj);
        };
      });
    }, function(err) {
      console.log(err);
    });
