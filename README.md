meute: JS lib for social unhosted web apps
======

To use, adapt the index.html page. It shows which files to include,
and includes a short example of how to use the `meute`
object to enter an irc channel, say something, and leave. Here is a
reference documentation of all the functions the library exposes in
the v0.7.* API:

* `meute.debugState()`: returns all internal state, namely:
  *  config: all configs (currently sockethub, irc and email are supported),
  *  configDone: which configs have been sent to sockethub successfully,
  *  outbox: commands that have been queued up until they can be sent,
  *  registeredActor: the name and id used for sending email and appearingn on irc,
  *  roomJoins: which irc rooms you have joined (or are in the process of joining),
  *  sockethubClient: the sockethub-client instance,
  *  sockethubRegistered: whether sockethub register command has been sent successfully,
  *  topic: irc room topics,
  *  attendance: irc room members

* `meute.addAccount(platform, server, x[, y, z])`, where:
  * string `platform` is 'sockethub', 'irc', or 'email'
  * string `server` is a WebSocket URL for sockethub, an irc server for irc, or an imap/stmp server for email,
  * string `x` is the secret for sockethub, the nick for irc, or the email address and imap username for email,
  * string `y` is the display name for email,
  * string `z` is the imap password for email,
  Sets the sockethub, irc, or email credentials.

* `meute.join(platform, rooms)`, where platform is 'irc' and rooms is a string or array of string room names:
  join one or more irc rooms. Example: `meute.join('irc', ['#meute', '#remotestorage']);`

* `meute.leave(platform, rooms)`, where platform is 'irc' and rooms is a string or array of string room names:
  leave one or more irc rooms. Example: `meute.leave('irc', ['#remotestorage']);`

* `meute.send(platform, target, text)` where platform is 'irc', string target is an irc nick or room name,
  * string text is the text to send:
  Sends message `text` to the irc user or the irc room `target`.

* `meute.on(event, handler)` where event is 'message' or 'debug' and handler is a function:
  Will cause handler to be called with a string argument when a debug message is available in the case of 'debug',
  or with an ActivityStreams object representing an irc message or an incoming email message in the case of 'message'

Some new proxies for remotestorage.js functionality:

* `meute.private(moduleName)` - wrapper for `remoteStorage.scope('/'+moduleName+'/')`.
* `meute.public(moduleName)` - wrapper for `remoteStorage.scope('/public/'+moduleName+'/')`.
* `meute.displayWidget()` - wrapper for `remoteStorage.displayWidget()`
* `meute.wire()` - returns `remoteStorage.remote`.

* `meute.addAccount('remotestorage', userAddress)` - set rs.js userAddress.
* `meute.addAccount('remotestorage', userAddress, token)` - same, but also sets token
* `meute.addAccount(backend, apiKey)` - set rs.js backend and apiKey.
* `meute.addAccount(backend, apiKey, token)` - same, but also sets token

Email functionality (experimental):

* `meute.email.sendEmail(recipient, subject, text, inReplyTo, preview)`, where:
  * recipient is either a string email address or an object containing one 'to' and one 'cc' field, both being single
    email addresses,
  * string subject is the email subject,
  * string text is the email body text,
  * string inReplyTo is the messageId of an email to which this email is a reply,
  * boolean preview will prevent the email from actually being sent if true,
  Will sent an email with the properties specified.

* `meute.email.fetchEmailsFromTo(from, to, includeBody)` with:
  * integer `from` the first IMAP id,
  * integer `to` the last IMAP id,
  * boolean `includeBody` set to true if you want the email bodies; false if you want just the headers,
  Fetches emails over IMAP; they will come in as 'message' events (see `meute.on`). *NB: this function is
  currently broken, use `meute.email.fetch` instead!*

* `meute.email.fetch1(arr)` with `arr` an array of integers:
  Fetch the bodies of the messages with the specified IMAP ids. Useful if you retrieved all the headers first of
  all your new email, and want to retrieve the bodies of only a few of them. *NB: this function is
  currently broken, use `meute.email.fetch` instead!*

* `fireInitial()`: load emails from disk into memory. This may take several minutes if you have more than 10,000 emails.

* `meute.email.findEmailsFrom(address)` with string `address` an email address, will return all email messages with
  that from address that have currently been loaded into memory. Make sure to call `fireInitial` first and wait for
  it to complete.

* `meute.email.findGaps(fetch)`, with `fetch` either undefined or an integer: See which email IMAP id's are in memory,
  and where there are gaps. If you specify an integer `fix` value, then the first `fix` emails of the first gap will
  be fetched. When there are no gaps (e.g. there is a solid range of IMAP id's from 0 to 12345), then it will try to
  fetch up to `fix` newer emails (with higher IMAP id's). Make sure to call `fireInitial` first and wait for it to
  complete. *NB: the `fix` parameter is currently broken, use `meute.email.fetch` instead!*

* `meute.email.fetch(pageNo, pageSize, includeBody)` where:
  * integer `pageNo` is the number of the page block to fetch,
  * integer `pageSize` is the page block size,
  * boolean `includeBody` causes bodies as well as headers to be fetched if set to true,
  Will retrieve the latest `pageSize` emails if `pageNo` is 0, the `pageSize` ones before that if `pageNo` is 1, etcetera.

* `remoteStorage.contacts.find(searchString)` where string `searchString` is a substring of the name or address of the contact:
  Returns an object full of addressbook entries that match the search (filled automatically from incoming email messages).

# Butler

* to use the butler service server-side, run `meute.getButlerConfig();` in the browser console while connected to your remoteStorage-account
