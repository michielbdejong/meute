  ////////////
 // Basics //
////////////
const ns = {
  acl: $rdf.Namespace('http://www.w3.org/ns/auth/acl#'),
  dct: $rdf.Namespace('http://purl.org/dc/terms/'),
  foaf: $rdf.Namespace('http://xmlns.com/foaf/0.1/'),
  ldp: $rdf.Namespace('http://www.w3.org/ns/ldp#'),
  mee: $rdf.Namespace('http://www.w3.org/ns/pim/meeting#'),
  dc: $rdf.Namespace('http://purl.org/dc/elements/1.1/'),
  rdf: $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  schema: $rdf.Namespace('http://schema.org/'),
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
    contacts: [
      { nick: 'kjetil', webId: 'https://solid.kjernsmo.net/profile/card#me' },
      { nick: 'megoth-community', webId: 'https://megoth.solid.community/profile/card#me' },
      { nick: 'megoth-inrupt', webId: 'https://megoth.inrupt.net/profile/card#me' },
      { nick: 'me', webId: 'https://michielbdejong.inrupt.net/profile/card#me' },
    ],
    chats: [],
    myEmail:  '<mailto:michiel@unhosted.org>',
    podBase:  'https://michielbdejong.inrupt.net',
    newContactNick: 'asdf',
    otherWebId: 'http://example.com/#someone',
    webId: '',
  }
});
function getChatFolderUrl () {
  return app.podBase + '/chats/';
}

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

  /////////////////////
 // Receive invites //
/////////////////////

async function fetchInvites() {
  const myInboxUrl = await getInboxUrl(app.webId);
  console.log('checking inbox', myInboxUrl);
  await fetcher.load(store.sym(myInboxUrl).doc());
  const notifsList = await store.match(store.sym(myInboxUrl), ns.ldp("contains")).map(e => e.object.value);
  await Promise.all(notifsList.map(notifUrl => fetcher.load(store.sym(notifUrl).doc()).catch(e => console.error(e))));
  const invitesList = await store.match(null, null, ns.schema('InviteAction')).map(e => e.subject.value);
  await Promise.all(invitesList.map(inviteUrl => fetcher.load(store.sym(inviteUrl).doc()).catch(e => console.error(e))));
  let invitedChats = [];
  const invitesReceived = store.match(null, ns.schema('recipient'), store.sym(app.webId)).map(st  => st.subject.value);
  invitesReceived.map(x => store.match(store.sym(x), ns.schema('event'))).map(sts => sts.map(st => invitedChats.push(st.object.value)));
  console.log({ invitedChats });
  invitedChats.map(x => store.sym(x).doc().value).map(displayChat)
}

  //////////////////////////////////
 // Create new chat conversation //
//////////////////////////////////

// in the /chats folder on the user's pod, this app will create one folder per
// conversation, and that folder will contain an index.ttl as follows:
// ----------------------------------------------------
// @prefix : <#>.
// @prefix mee: <http://www.w3.org/ns/pim/meeting#>.
// @prefix terms: <http://purl.org/dc/terms/>.
// @prefix XML: <http://www.w3.org/2001/XMLSchema#>.
// @prefix n: <http://rdfs.org/sioc/ns#>.
// @prefix n0: <http://xmlns.com/foaf/0.1/>.
// @prefix c: </profile/card#>.
// @prefix n1: <http://purl.org/dc/elements/1.1/>.
// @prefix flow: <http://www.w3.org/2005/01/wf/flow#>.
// 
// :Msg1550498309871
//     terms:created "2019-02-18T13:58:29Z"^^XML:dateTime;
//     n:content "Hi Kjetil";
//     n0:maker c:me.
// :this
//     a mee:Chat;
//     n1:author c:me;
//     n1:created "2019-02-18T13:55:33Z"^^XML:dateTime;
//     n1:title "Chat";
//     flow:message :Msg1550498309871.
// ----------------------------------------------------
//
// and .acl document as follows:
// ----------------------------------------------------
// @prefix : <#>.
// @prefix n0: <http://www.w3.org/ns/auth/acl#>.
// @prefix kje: <./>.
// @prefix c: <https://solid.kjernsmo.net/profile/card#>.
// @prefix c0: </profile/card#>.
// 
// :AppendRead
//     a n0:Authorization;
//     n0:accessTo kje:;
//     n0:agent c:me;
//     n0:defaultForNew kje:;
//     n0:mode n0:Append, n0:Read.
// :ControlReadWrite
//     a n0:Authorization;
//     n0:accessTo kje:;
//     n0:agent c0:me, <mailto:michiel@unhosted.org>;
//     n0:defaultForNew kje:;
//     n0:mode n0:Control, n0:Read, n0:Write.
// ----------------------------------------------------
function createAclFile(folderUrl, me, myEmail, otherWebId) {
  var aclUrl = folderUrl + '.acl';
  var aclMe = store.sym(aclUrl + '#ControlReadWrite');
  var aclOther = store.sym(aclUrl + '#AppendRead');
  var aclDoc =  aclMe.doc();
  var thisFolder = $rdf.Namespace(folderUrl)('');
  updater.put(aclDoc, [
    new $rdf.Statement(aclMe, ns.rdf('type'), ns.acl('Authorization'), aclDoc),
    new $rdf.Statement(aclMe, ns.acl('accessTo'), thisFolder, aclDoc),
    new $rdf.Statement(aclMe, ns.acl('agent'), me, aclDoc),
    new $rdf.Statement(aclMe, ns.acl('agent'), myEmail, aclDoc),
    new $rdf.Statement(aclMe, ns.acl('defaultForNew'), thisFolder, aclDoc),
    new $rdf.Statement(aclMe, ns.acl('mode'), ns.acl('Control'), aclDoc),
    new $rdf.Statement(aclMe, ns.acl('mode'), ns.acl('Read'), aclDoc),
    new $rdf.Statement(aclMe, ns.acl('mode'), ns.acl('Write'), aclDoc),
    new $rdf.Statement(aclOther, ns.rdf('type'), ns.acl('Authorization'), aclDoc),
    new $rdf.Statement(aclOther, ns.acl('accessTo'), thisFolder, aclDoc),
    new $rdf.Statement(aclOther, ns.acl('agent'), otherWebId, aclDoc),
    new $rdf.Statement(aclOther, ns.acl('defaultForNew'), thisFolder, aclDoc),
    new $rdf.Statement(aclOther, ns.acl('mode'), ns.acl('Append'), aclDoc),
    new $rdf.Statement(aclOther, ns.acl('mode'), ns.acl('Read'), aclDoc),
  ], 'text/turtle', (uri, ok, message) => {
    if (ok) {
      console.log('Created ACL file', uri);
    } else {
      console.error(`FAILED to create new chat ACL file at ${uri} : ${message}`);
    }
  });
}

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
      console.log('Created', uri);
    } else {
      console.error(`FAILED to create new chat at ${uri} : ${message}`);
    }
  });
}

function newContact() {
  app.contacts.push({
    nick: app.newContactNick,
    webId: app.otherWebId,
  });
}

async function getInboxUrl(webId) {
  await fetcher.load(store.sym(webId).doc());
  const st = store.match(store.sym(webId), ns.ldp('inbox'));
  // console.log(st);
  if (st.length) {
    return st[0].object.value;
  }
}

async function sendInvite(webId, chatUrl) {
  const chatUrn = store.sym(chatUrl + '#this');
  const inboxUrl = await getInboxUrl(webId);
  // add invite details in chat doc:
  const inviteUrl = `${chatUrl}#invite-${encodeURIComponent(webId)}`;
  console.log({ chatUrn, webId, chatUrl, inboxUrl, inviteUrl });
  const messageStore = store.sym(chatUrl).doc();
  console.log(new $rdf.Statement(store.sym(inviteUrl), ns.rdf('type'), ns.schema('InviteAction'), messageStore));
  await new Promise((resolve, reject) => {
    updater.update([], [
      new $rdf.Statement(store.sym(inviteUrl), ns.rdf('type'), ns.schema('InviteAction'), messageStore),
      new $rdf.Statement(store.sym(inviteUrl), ns.schema('event'), chatUrn, messageStore),
      new $rdf.Statement(store.sym(inviteUrl), ns.schema('agent'), store.sym(app.webId), messageStore),
      new $rdf.Statement(store.sym(inviteUrl), ns.schema('recipient'), store.sym(webId), messageStore),
    ], (uri, success, body) => {
      if (!success) {
        console.log('Error creating invite: ' + body);
        reject(new Error(body));
      } else {
        console.log('Invite created');
        resolve();
      }
    });
  });

  // post a notif to it:
  fetch(inboxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/turtle',
    },
    body: `<${inviteUrl}> a <${ns.schema('InviteAction').value}>.`
  }).then(res => {
    console.log(res.text());
  });
}

function startChat(index) {
  console.log('startChat', index);
  const otherWebId = app.contacts[index].webId;
  const chatFolderUrl = getChatFolderUrl() + `${app.contacts[index].nick}/`;
  // createAclFile(chatFolderUrl, app.webId, app.myEmail, otherWebId);

  const chatUrl = chatFolderUrl + 'index.ttl';
  // startConversation(chatUrl, app.webId, app.myEmail, otherWebId);
  sendInvite(otherWebId, chatUrl);
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
async function refreshChatList() {
  app.chats = [];
  console.log('fetching invites');
  await fetchInvites();
  console.log('fetching me-hosted chats');
  // Load the person's hosted chats into the store
  const chatsIndexUrl = getChatFolderUrl(); 
  await fetcher.load(chatsIndexUrl);
  const chatsList = store.match(store.sym(chatsIndexUrl), ns.ldp("contains")).map(e => e.object.value + 'index.ttl').map(displayChat);
}
async function displayChat(chatUrl) {
  await fetcher.load(chatUrl);
  const chatObj  = {
    url: chatUrl,
    messages: [],
    newMsg: ''
  };
  const messageObjects = store.match(null, ns.sioc('content'), null, store.sym(chatUrl).doc());
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

// ...
setTimeout(refreshChatList, 100);
