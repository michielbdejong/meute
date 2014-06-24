# 0.6.0

* remove `meute.setMasterPassword`
* switch to rs.js head build, which has the encryption widget
* fix a few www/Twitter-related issues

# 0.5.4

* switch commit cache back on
* fix automatic storing of irc contacts
* a few small fixes

# 0.5.3

* start fetching emails when possible
* store messages to the messages module
* store contacts to the contacts module

# 0.5.2

* add /post.html
* several small bugfixes

# 0.5.1

* add support for sockethub version e1a4b680
* add/fix Facebook and Twitter
* several small bugfixes

# 0.5.0

* Use current master of remotestorage.js
* Use current ahead branch of the remoteStorage modules
* Fix and document IndieWeb code (meute.www)

# 0.4.3

* support fromSeqNo, toSeqNo in latest sockethub API
* Disable local events (10x performance increase)
* Document remoteStorage.contacts.search
* Fix meute.email.fetch

# 0.4.2

* display the widget in the main page
* warn about the sockethub version in the main page

# 0.4.1

* Trying to get all email functionality from v0.1.0 restored
* Added reload() function for debugging without refreshing the page
* make fireInitial more intelligent about remoteStorage being ready or not

# 0.4.0

* Documented the entire API
* Keep track of irc room members and topics
* Make connectFurther function more robust
* Allow changing and removing the master password

# 0.3.3

* add meute.email
* add meute.www
* fix irc attendance tracking

# 0.3.2

* add meute.on('debug', ... and meute.on('message', ...
* update to commit-cache branch of remotestorage.js
* implement leaving irc rooms
* keep track of irc room attendance

# 0.3.1

* [#9] fix set->join->send sequence to be more patient

# 0.3.0

* simplify the API (breaking change)

# 0.2.4

* resends platform configs and room joins after a sockethub reconnect
* [#6] queues send and join commands until the platform is ready (but does not rejoin rooms after page refresh)
* [#4] stores configs to remoteStorage and reloads+resends them on page refresh

# 0.2.3

* uses new functional modules in remoteStorage modules
* uses experimental commit-cache in remotestorage.js

# 0.2.2

* fixes compat with sockethub version f9f50ee1

# 0.2.1

* many bugfixes in many places
* compat with sockethub version f9f50ee1

# 0.2.0

* first version of the meute.setMasterPassword function
* first version of the meute.addAccount function
* first version of the meute.send function

# 0.1.0

* a loose and eclectic collection of scripts, very unorganized and not suitable for reuse in other apps
