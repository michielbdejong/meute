RemoteStorage.defineModule('contacts', function(privateClient, publicClient) {
  var exports, myName;
  privateClient.cache('');
  function genUuid() {
    return Math.random()+'-'+(new Date().getTime().toString())+Math.random();
  }
  function getContact(name) {
    return privateClient.getObject('name/'+name);
  }
  function setContact(name, details) {
    return privateClient.storeObject('contact', 'name/'+name, details);
  }
  function setMyName(name) {
    myName = name;
    return privateClient.storeObject('myName', 'me', name);
  }
  function getMyName(name) {
    return privateClient.getObject('me');
  }
  function getMyNameSync(name) {
    return myName;
  }
  exports = {
    add: function(name, details) {
      console.log('adding contact', name, details);
      getContact(name.toLowerCase()).then(
        function(obj) {
          if(!obj) {
            details.id=genUuid();
            setContact(name.toLowerCase(), details);
            if(details.me) {
              setMyName(name);
            }
          }
        },
        function(err) {
          console.log('error retrieving contact', name.toLowerCase());
        }
      );
    },
    getMyName: getMyName,
    get: getContact,
    getNames: function() {
      return privateClient.getListing('name/');
    },
    addFromList: function(list) {
      var i, name;
      if(!Array.isArray(list)) {
        return;
      }
      for(i=0; i<list.length; i++) {
        this.add((list[i].name ? list[i].name : list[i].address), list[i]);
      }
    }
  };
  return { exports: exports };
});