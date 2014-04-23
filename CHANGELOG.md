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