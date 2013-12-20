august
======

small example app with sockethub, remoteStorage, and useraddress.

uses sockethub-0.1.5 and remotestorage.js version 0.9.0

To use alpha.html:

- sync is disabled because of https://github.com/remotestorage/remotestorage.js/issues/545. sync manually if you know you have changes to push out.
- call `displayInbox()` manually from the console to see your recent incoming messages.
- because of https://github.com/michielbdejong/meute/issues/1 you need to run `document.fetchEmails(1, 10, false);` first, though
- by default, the app does not connect to irc. call `joinRooms('michiel-meute', ['#meute']);` manually and then `ircMsg('#meute', 'hi');`
- (commands for sending email)
- to see your tabs, use `remoteStorage.money.getTabNames()`, `remoteStorage.money.getTabTable(name)`, and `remoteStorage.money.findCycles(markCellCb)`
- because of https://github.com/michielbdejong/meute/issues/1 you need to include `opentabs-data.js` first, though
- to send an email, call `sendEmail(recipients, subject, text, inReplyTo, preview);`