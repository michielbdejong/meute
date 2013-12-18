RemoteStorage.defineModule('contacts', function(privateClient, publicClient) {
  var contacts = {}, myName, exports;
  
  function genUuid() {
    return Math.random()+'-'+(new Date().getTime().toString())+Math.random();
  }
  exports = {
    add: function(name, details) {
      if(contacts[name.toLowerCase()]) {
        throw new Error('name clash!');
      } else {
        details.id=genUuid();
        contacts[name.toLowerCase()]=details;
        if(details.me) {
          myName = name;
        }
      }
    },
    getMyName: function() {
      return myName;
    },
    get: function(name) {
      return contacts[name];
    },
    getNames: function() {
      return Object.getOwnPropertyNames(contacts);
    }
  };
  return { exports: exports };
});