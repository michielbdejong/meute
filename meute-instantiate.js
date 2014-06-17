//for debugging:
var messageLogs = [],
  debugLogs = [];

function d(p) {
  p.then(
    function(a) { console.log('success', a, JSON.stringify(a)); },
    function(a) { console.log('fail', a, JSON.stringify(a)); });
}
RemoteStorage._log = true;
RemoteStorage.reset = function() {
  indexedDB.deleteDatabase('remotestorage');
  localStorage.clear();
}
function evalScript(path) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path+'?refresh='+new Date().getTime(), true);
  xhr.onload = function() {
    eval(xhr.responseText);
    console.log('reloaded '+path);
  };
  xhr.send();
}
function reload() {
  evalScript('meute.js');
  setTimeout(function() {
    evalScript('meute-email.js');
    evalScript('meute-www.js');
  }, 1000);
  setTimeout(function() {
    meute.on('message', function(obj) { messageLogs.push(obj); console.log('meute message', obj); });
    meute.on('debug', function(obj) { debugLogs.push(obj); console.log('meute debug', obj); });
    meute.bootstrap();
  }, 2000);
}

function calcPage(oldest, newest, perPage) {
  var page = Math.floor((newest-oldest)/perPage)+1;
  return 'meute.email.fetch('+page+', '+perPage+') will get you ids '+(newest-(page*perPage))+' to '+(newest-((page-1)*perPage+1));
}
function benchmark(num, interval) {
  var setter, i=0, startTime = new Date().getTime();
  if (interval) {
    setter = setInterval(function() {
      remoteStorage.scope('/test/').storeFile('text/plain', 'test'+i, 'a');
      i++;
      if (i === num) {
        console.log('finished setting', (new Date().getTime() - startTime)/1000);
        clearInterval(setter);
      }
    }, interval);
  } else {
    for (i=0; i<num; i++) {
      remoteStorage.scope('/test/').storeFile('text/plain', 'test'+i, 'a');
    }
    console.log('finished setting', (new Date().getTime() - startTime)/1000);
  }

  setTimeout(function() {
    var timer = setInterval(function() {
      if (remoteStorage.local.putsRunning === 0
          && (remoteStorage.local.commitQueued === undefined || Object.keys(remoteStorage.local.commitQueued).length === 0)) {
        console.log('finished storing', (new Date().getTime() - startTime)/1000);
        clearInterval(timer);
//          } else {
//            console.log(remoteStorage.local.putsRunning + ' <- ' + Object.keys(remoteStorage.local.commitQueued).length);
      }
    }, 100);
  }, 1000);
}

//instantiate:
remoteStorage = new RemoteStorage();
remoteStorage.displayWidget();
var remoteStorageReady = false;
remoteStorage.on('ready', function() {
  console.log('ready firererered!');
  remoteStorageReady = true;
});
RemoteStorage.enableChangeEvents = {
  local: false,
  window: false,
  remote: true,
  conflict: true
};
remoteStorage.setSyncInterval(1000000);
['contacts', 'documents', 'email', 'facebook', 'irc', 'messages', 'pgp', 'pictures', 'sockethub', 'twitter', 'www']
    .forEach(function(moduleName) {
  remoteStorage.access.claim(moduleName, 'rw');
});
remoteStorage.scope('/public/www/').cache('', 'ALL');
function fireInitial() {
  var i=0;
  RemoteStorage.enableChangeEvents.local = true;
  remoteStorage.scope('/').on('change', function() {
    i++;
    if(i%1000===0) {
      console.log('change events... '+i);
    }
  });
  if (remoteStorageReady) {
    console.log('Calling fireInitial...');
    remoteStorage.fireInitial();
  } else {
    console.log('fireInitial will be called from the remoteStorage ready event...');
  }
}
meute.on('message', function(obj) { messageLogs.push(obj); console.log('meute message', obj); });
meute.on('debug', function(obj) { debugLogs.push(obj); console.log('meute debug', obj); });
meute.bootstrap();

meute.www.getTemplate('homepage.html');
meute.www.loadPosts();
