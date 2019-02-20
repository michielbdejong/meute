  ////////////
 // Basics //
////////////
const ns = {
  dct: $rdf.Namespace('http://purl.org/dc/terms/'),
  foaf: $rdf.Namespace('http://xmlns.com/foaf/0.1/'),
  ldp: $rdf.Namespace('http://www.w3.org/ns/ldp#'),
  mee: $rdf.Namespace('http://www.w3.org/ns/pim/meeting#'),
  dc: $rdf.Namespace('http://purl.org/dc/elements/1.1/'),
  rdf: $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  sioc: $rdf.Namespace('http://rdfs.org/sioc/ns#'),
  wf: $rdf.Namespace('http://www.w3.org/2005/01/wf/flow#'),
};
const store = $rdf.graph();
const fetcher = new $rdf.Fetcher(store);
const updater = new $rdf.UpdateManager(store);
window.store = store; // for live debugging

  /////////
 // Vue //
/////////
const app = new Vue({
  el: '#app',
  data: {
    chats: [],
    newChatUrl: '',
    webId: '',
  }
});

  ///////////
 // WebId //
///////////
solid.auth.trackSession(session => {
  if (!session) {
    document.getElementById('login-state').innerHTML = 'Not logged in.';
  } else {
    app.webId = session.webId;
    document.getElementById('login-state').innerHTML = `Logged in as ${session.webId}.`;
  }
})
function logout() {
  solid.auth.logout();
}
async function login() {
  let session = await solid.auth.currentSession();
  let popupUri = 'https://solid.community/common/popup.html';
  if (!session)
    session = await solid.auth.popupLogin({ popupUri });
  alert(`Logged in as ${session.webId}`);
}

  //////////////////////////////////
 // Create new chat conversation //
//////////////////////////////////

// See https://github.com/solid/solid-panes/blob/master/chat/chatPane.js#L53-L81
function startConversation (chatUrl, me) {
  var conversation = store.sym(chatUrl + '#this');
  var messageStore = conversation.doc();
  store.add(conversation, ns.rdf('type'), ns.mee('Chat'), messageStore)
  store.add(conversation, ns.dc('title'), 'Chat', messageStore)
  store.add(conversation, ns.dc('created'), new Date(), messageStore)
  store.add(conversation, ns.dc('author'), me, messageStore)
  const sts = store.statementsMatching(undefined, undefined, undefined, messageStore);
  updater.put(messageStore, sts, 'text/turtle', (uri, ok, message) => {
    if (ok) {
      console.log('Created', chatUrl);
    } else {
      console.error(`FAILED to create new chat at ${uri} : ${message}`);
    }
  });
}


function newChatConversation(index) {
  return startConversation(app.newChatUrl, app.webId);
}

  ///////////////////////
 // Send chat message //
///////////////////////
// from https://github.com/solid/solid-ui/blob/master/src/messageArea.js#L77-L112:
function sendMessage (chatUrl, text, me) {
  var sts = [];
  var now = new Date();
  var timestamp = '' + now.getTime();
  var dateStamp = $rdf.term(now);
  var conversation = store.sym(chatUrl + '#this');
  // http://www.w3schools.com/jsref/jsref_obj_date.asp
  var message = store.sym(chatUrl + '#' + 'Msg' + timestamp);
  var messageStore = conversation.doc();
  sts.push(new $rdf.Statement(conversation, ns.wf('message'), message, messageStore));
  sts.push(new $rdf.Statement(message, ns.sioc('content'), store.literal(text), messageStore))
  sts.push(new $rdf.Statement(message, ns.dct('created'), dateStamp, messageStore))
  sts.push(new $rdf.Statement(message, ns.foaf('maker'), me, messageStore))

  var sendComplete = function (uri, success, body) {
    if (!success) {
      console.log('Error writing message: ' + body);
    } else {
      console.log('Succcess writing message');
    }
  }
  updater.update([], sts, sendComplete)
}

function newChatMsg(index) {
  return sendMessage(app.chats[index].url, app.chats[index].newMsg, app.webId);
}

  ////////////////////
 // Fetch chat log //
////////////////////
async function refreshChatList(chatsIndexUrl) {
  // Load the person's hosted chats into the store
  await fetcher.load(chatsIndexUrl);
  const chatsList = store.match(null, ns.ldp("contains")).map(e => e.object.value + 'index.ttl').map(displayChat);
}
async function displayChat(chatUrl) {
  await fetcher.load(chatUrl);
  const chatObj  = {
    url: chatUrl,
    messages: [],
    newMsg: ''
  };
  const messageObjects = store.match(null, ns.sioc('content'), null, $rdf.sym(chatUrl).doc());
  messageObjects.map(obj => {
    const sub = obj.subject;
    const maker = store.match(sub, $rdf.Namespace('http://xmlns.com/foaf/0.1/')('maker'));
    console.log(obj.object.value, 'made by', maker[0].object.value, store.match(maker[0].object.value));
    chatObj.messages.push({
      maker: maker[0].object.value,
      text: obj.object.value
    });
  });
  app.chats.push(chatObj);
}
