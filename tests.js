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
    console.log('finished tests', successes, failures);
  }
}