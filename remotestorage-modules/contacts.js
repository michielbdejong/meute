RemoteStorage.defineModule('contacts', function(privateClient, publicClient) {
  privateClient.cache('');
  var myName = new SyncedVar('myname', privateClient), contacts = new SyncedMap('contacts', privateClient);

  function genUuid() {
    return Math.random()+'-'+(new Date().getTime().toString())+Math.random();
  }
  return {
    exports: {
      add: function(name, details) {
        if(contacts.get(name.toLowerCase())) {
          //throw new Error('name clash!');
        } else {
          details.id=genUuid();
          contacts.set(name.toLowerCase(), details);
          if(details.me) {
            myName.set(name);
          }
        }
      },
      addFromList: function(list) {
        if(!Array.isArray(list)) {
          return;
        }
        var i;
        for(i=0; i<list.length; i++) {
          this.add(list[i].name || list[i].address, list[i]);
        }
      },
      getMyName: function() {
        return myName.get();
      },
      get: function(name) {
        return contacts.get(name);
      },
      getNames: function() {
        return contacts.getKeys();
      }
    }
  };
});