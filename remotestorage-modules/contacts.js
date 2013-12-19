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
          throw new Error('name clash!');
        } else {
          details.id=genUuid();
          contacts.set(name.toLowerCase(), details);
          if(details.me) {
            myName.set(name);
          }
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