    function renderContact(contact) {
      return contact.name;
    }
    function renderPost(obj) {
      return obj.subject;
    }

    var contactSearch = [], currConv=0;
    function displayConv(conv) {
      document.getElementById('convHead').innerHTML=conv.group;
      var str = ''
      for(var i=0; i<conv.messages.length; i++) {
        str += '<li>'+conv.messages[i].actor[0].name+': ['+conv.messages[i].object.subject+'] - '+conv.messages[i].object.text+'</li>';
      }
      document.getElementById('convHead').innerHTML=conv.group;
      document.getElementById('convList').innerHTML=str;
    }
    function setConv(i) {
      currConv = i;
      remoteStorage.inbox.getLastGrouped(10, function(conversations) {
        console.log(conversations);
        var str = '<tr><td>group</td><td>actor</td><td>subject</td></tr>';
        for(var i=0; i<conversations.length;i++) {
          if(currConv==i) {
            str += '<tr style="background-color:blue"><td>'+conversations[i].group.substring(0,50)+'</td><td>'
              +conversations[i].messages[0].actor[0].name.substring(0,50)
              +'</td><td>'+conversations[i].messages[0].object.subject.substring(0,50)+'</td></tr>';
            displayConv(conversations[i]);
          } else {
            str += '<tr onclick="setConv('+i+');"><td>'+conversations[i].group.substring(0,50)
              +'</td><td>'+conversations[i].messages[0].actor[0].name.substring(0,50)
              +'</td><td>'+conversations[i].messages[0].object.subject.substring(0,50)+'</td></tr>';
          }
        }
        document.getElementById('history').innerHTML = str;
      });
    }
    //..
    remoteStorage.access.claim('inbox', 'rw');
    setConv(0);
    remoteStorage.contacts.getList().then(function(contacts) {
      for(var i in contacts) {
        try {
          obj = JSON.parse(contacts[i]);
          contactSearch.push(obj);
        } catch(e) {
        }
      }     
    });
    function search(prefix) {
      for(var i=0; i<contactSearch.length; i++) {
        if(contactSearch[i].name.substring(0, prefix.length)==prefix) {
          return contactSearch[i];
        }
      }
    }