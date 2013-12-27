document.expimp = (function() {
  return {
    get: function(cb) {
      console.log('getting everything from module sockethub');
      remoteStorage.sockethub.getEverything().then(function(shEverything) {
        console.log('getting everything from module inbox');
        return remoteStorage.inbox.getEverything().then(function(ibEverything) {
          console.log('getting everything from module email');
          return remoteStorage.email.getEverything().then(function(emEverything) {
            console.log('getting everything from module contacts');
            return remoteStorage.contacts.getEverything().then(function(ctEverything) {
              console.log('getting everything from module money');
              return remoteStorage.money.getEverything().then(function(moEverything) {
                cb({
                  sockethub: shEverything,
                  inbox: ibEverything,
                  email: emEverything,
                  contacts: ctEverything,
                  money: moEverything
                });
              });
            });
          });
        });
      }, function(err) {
        cb(err);
      });
    },
    set: function(obj) {
      console.log('setting sh');
      remoteStorage.sockethub.setEverything(obj.sockethub);
      console.log('setting ib');
      remoteStorage.inbox.setEverything(obj.inbox);
      console.log('setting em');
      remoteStorage.email.setEverything(obj.email);
      console.log('setting ct');
      remoteStorage.contacts.setEverything(obj.contacts);
      console.log('setting mo');
      remoteStorage.money.setEverything(obj.money);
    }
  };
})();