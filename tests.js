var tests = {
  'add  / get contacts': function() {
    var list, obj;
    remoteStorage.contacts.add('test contact', { a: 'b'});
    list = remoteStorage.contacts.getNames();
    if(list.length != 1) {
      return false;
    }
    if(list[0] != 'test contact') {
      return false;
    }
    obj = remoteStorage.contacts.get('test contact');
    if(obj.a != 'b') {
      return false;
    }
    remoteStorage.contacts.remove('test contact');
    list = remoteStorage.contacts.getNames();
    if(list.length != 0) {
      return false;
    }
    return true;
  },
  'store message': function() {
    var list, obj, i;
    document.messaging.storeMessage({
      actor: {
        address: 'sen@de.r'
      },
      platform: 'email',
      object: {
        messageId: 'some-message-id',
      }
    });

    //check contacts:
    list = remoteStorage.contacts.getNames();
    if(list.length != 1) {
      console.log('failure 36', list);
      return false;
    }
    obj = remoteStorage.contacts.get('sen@de.r');
    if(obj.address != 'sen@de.r') {
      console.log('failure 40', obj);
      return false;
    }
    remoteStorage.contacts.remove('sen@de.r');

    //check inbox:
    map = remoteStorage.inbox.getActivitySince();
    if(Object.getOwnPropertyNames(map).length != 1) {
      console.log('failure 51', map);
      return false;
    }
    i = Object.getOwnPropertyNames(map)[0];
    if(!map[i].actor || map[i].actor.address != 'sen@de.r') {
      console.log('failure 56', map);
      return false;
    }
    return true;
  }
};

function runTests() {
  var i, successes = [], failures = [];
  for(i in tests) {
    if(tests[i]()) {
      successes.push(i);
    } else {
      failures.push(i);
    }
  }
  console.log('finished tests', successes, failures);  
}