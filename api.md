remoteStorage.social.setSockethub('wss://michielbdejong.com:10550');
remoteStorage.social.addAccount('irc', 'irc.freenode.net', 'michielbdejong');
remoteStorage.social.addAccount('email', 'mail.gandi.net', 'mail.gandi.net', 'anything@michielbdejong.com', '*****');
remoteStorage.social.addAccount('twitter', 'michielbdejong', '*****', '*****', '*****', '*****');
remoteStorage.social.addAccount('facebook', 'michielbdejong', '*****');
remoteStorage.social.addAccount('www', 'https://michielbdejong.com/', 'templates/blue/', '/live/');

remoteStorage.social.on('status', function(obj));
remoteStorage.social.removeAccount('www', 'https://michielbdejong.com/', 'templates/homepage.html');

remoteStorage.social.send('irc', '#remotestorage', 'hi');
remoteStorage.social.send('twitter', 'hi');
remoteStorage.social.send('facebook', 'hi');
remoteStorage.social.send('www', '/contact.html', '<!DOCTYPE ...');
remoteStorage.social.send('email', 'michiel@unhosted.org', 'subject', 'body', 'in-reply-to');
remoteStorage.social.send('email', {to: ['michiel@unhosted.org']}, 'subject', 'body', 'in-reply-to');

remoteStorage.social.on('message', function(msg));
remoteStorage.social.markRead(0, 19070, true);
remoteStorage.social.scroll(19040, 19140);

remoteStorage.social.publish('hi', true);
remoteStorage.social.reply('true that', 'https://twitter.com/someone/status/434523423242342');
remoteStorage.social.retweet('https://twitter.com/someone/status/434523423242342');
remoteStorage.social.favorite('https://twitter.com/someone/status/434523423242342');
remoteStorage.social.blog('title', '<p>.....');

remoteStorage.social.addContact('Michiel de Jong', 'email:michiel@unhosted.org');
remoteStorage.social.addContact('Michiel de Jong', 'irc:michielbdejong');
remoteStorage.social.addContact('Michiel de Jong', 'twitter:michielbdejong');
remoteStorage.social.addContact('Michiel de Jong', 'facebook:michielbdejong');
remoteStorage.social.addContact('Michiel de Jong', 'https://michielbdejong.com/');
remoteStorage.social.findContact('mic', function(obj));

modules:
* sockethub
* twitter-credentials
* facebook-credentials
* email
* inbox
* contacts
* feeds
* articles

bootstrap:
* remoteStorage loading, claiming access, modules filling up memory
* get sockethub and platforms config
* connect to sockethub
* set credentials
* join irc rooms
* check for mail



ways to make tosdr export faster, first phase:

- allow to disable fireInitial and add load function to SyncedMap and SyncedVar
- make it use dirty flags and then storeFiles



the push version is useless if not stored immediately, you would get race conditions
300000ms puts lead to race conditions anyway
that pleas for a common in-memory cache
also, a common in-memory cache is easier to work with, *if* the developer understands that it exists.
sync access to it may make this clear, and also avoid surprises when empty cache results are returned without going to remote.

is there a way to avoid race conditions with two in-memory caches?

maybe have a local cache, a push cache, etcetera.

caching control methods:
readFromDisk loads local values for a subtree into memory
flushToDisk saves any unsaved changes and unloads