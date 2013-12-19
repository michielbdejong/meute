RemoteStorage.defineModule('contacts', function(privateClient, publicClient) {
  privateClient.cache('');
  var myName = new SyncedVar('myname', privateclient), contacts = new SyncedMap('contacts', privateclient);
  function SyncedVar(name, baseClient) {
    var data;
    baseClient.on('change', function(e) {
      if(e.key==name) {
        data = e.newValue;
      }
    });
    return {
      get: function() {
        return data;
      },
      set: function(val) {
        baseClient.storeObject('SyncedVar', name, val);
        data=val;
      }
    };
  }
  function SyncedMap(name, baseClient) {
    var data = {};
    privateClient.cache(name+'/');
    baseClient.on('change', function(e) {
      if(e.key.substring(0, name.length+1) == name + '/') {
        data[e.key.substring(name.length+1)] = e.newValue;
      }
    });
    return {
      get: function(key) {
        return data[key];
      },
      set: function(key, val) {
        baseClient.storeObject('SyncedMapKey', name + '/' + key, val);
        data[key]=val;
      },
      getKeys: function() {
        return Object.getOwnProperties(data);
      }
    };
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