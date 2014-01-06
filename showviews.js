function displayList(elt, title, list) {
  var i, str = '<h2>'+title+'</h2><ul>';
  for (i=0; i<list.length; i++) {
    str += '<li>'+list[i]+'</li>';
  }
  document.getElementById(elt).innerHTML = str+'</ul>';
}
window.displayLists = function() {
  displayList('contacts-view', 'Contacts', remoteStorage.contacts.getNames());
  displayList('inbox-view', 'Inbox', remoteStorage.inbox.getActivitySince());
  displayList('money-view', 'Money', remoteStorage.money.getTabNames());
}