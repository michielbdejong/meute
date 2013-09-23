    var userAddress = new WebSocket('wss://michielbdejong.com:12380/q/websocket'), suggestions={};
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
            +escape(contacts[i].name)+'" onmousedown="setTo(\''
            +escape(contacts[i].address)+'\', \''
            +escape(contacts[i].name)+'\', \''
            +escape(contacts[i].avatar)+'\'); '
            +'showBoxes(\'composescreen\');"><td><img src="'
            +escape(contacts[i].avatar)+'" /></td><td>'
            +escape(contacts[i].name)+'</td></tr>';
      }
      document.getElementById(table).innerHTML=str;
    }
    function setTo(address, name, avatar) {
      inReplyTo = undefined;
      toAddress = address;
      showContacts([{
        address: address,
        name: name,
        avatar: avatar
      }], 'toTable');
    }
    function showSuggestions() {
      var contacts=[];
      for(var i in suggestions) {
        contacts.push(suggestions[i]);
      }
      showContacts(contacts, 'suggestionsTable');
    }
    function showMessages() {
      var str='';
      for(i in messagesInMem) {
        str+='<tr onmousedown="selectMessage(\''
            +escape(i)+'\'); showBoxes(\'readscreen\');" ><td><img src="'
            +escape(messagesInMem[i].avatar)+'" /> '
            +escape(messagesInMem[i].name)+'</td><td>'
            +escape(messagesInMem[i].subject)+'</td></tr>';
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
      toAddress = messagesInMem[id].actor[0].address;
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
        0: { name: 'Dalai Lama', avatar: 'mock/avatar2.png', subject: 'Re: Announcing Meute v0.1', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal'},
        1: { name: 'Michiel de Jong', avatar: 'mock/avatar1.png', subject: 'Announcing Meute v0.1', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal'},
        2: { name: 'Krafty Kuts', avatar: 'mock/avatar4.png', subject: 'Re: The funky technician is back', text: 'Il existe un domaine dans lequel je n\'ai pas d\'egal' }
      };
      showMessages();
    }
    function sendMsg() {
      var text = document.getElementById('compose').value,
        enterPos = text.indexOf('\n');
      console.log({
        target: 'email:'+toAddress,
        object: {
          inReplyTo: inReplyTo,
          subject: text.substring(0, enterPos),
          text: text.substring(enterPos+1)
        },
        verb: 'send'
      });
    }

    //...
    showBoxes('mainscreen');
