RemoteStorage.defineModule('contacts', function(privateClient, publicClient) {
  privateClient.cache('');
  var myName = new SyncedVar('myname', privateClient), contacts = new SyncedMap('contacts', privateClient);

  function genUuid() {
    return Math.random()+'-'+(new Date().getTime().toString())+Math.random();
  }
  function SyncedVar(name, baseClient) {
    var data;
    baseClient.on('change', function(e) {
      e.key = e.relativePath.substring('contacts/'.length);
      console.log('change', e);
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
    var data = {}, prefixTree = PrefixTree(baseClient.scope(name+'/'));
    //prefixTree.cache('');
    prefixTree.on('change', function(e) {
      console.log('change', e);
      if(e.key.substring(0, name.length+1) == name + '/') {
        data[e.key.substring(name.length+1)] = e.newValue;
      }
    });
    return {
      get: function(key) {
        return data[key];
      },
      set: function(key, val) {
        prefixTree.storeObject('SyncedMapKey', key, val);
        data[key]=val;
      },
      getKeys: function() {
        return Object.getOwnPropertyNames(data);
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