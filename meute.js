meute = (function() {
  var masterPwd, sockethubClient, config = {}, configDone = {}, outbox = {},
    sockethubRegistered, roomJoins = {}, registeredActor = {}, handlers = {},
    attendance = {};

  function emit(eventName, obj) {
    if (Array.isArray(handlers[eventName])) {
      for (var i=0; i<handlers[eventName].length; i++) {
        handlers[eventName][i](obj);
      }
    }
  }

  function debug(obj) {
    emit('debug', obj);
  }

  function debugState() {
    debug(['meute internal state',
        masterPwd, sockethubClient, config, configDone, outbox,
        sockethubRegistered, roomJoins, registeredActor, attendance]);
  }
  function connectFurther() {
    if (!config.sockethub) {
      //nothing to do without a sockethub config
      return;
    }
    for (i in config) {
      if (!configDone[i]) {
        if (i === 'sockethub') {
          sockethubClient = SockethubClient.connect(config.sockethub);
          sockethubClient.on('registered', function() {
            sockethubRegistered = true;
            debug('registered! resending all platform configs');
            for (i in configDone) {
              if (i !== 'sockethub') {
                delete configDone[i];
              }
            }
            connectFurther();
          });
          sockethubClient.on('message', function(msg) {
            if (msg.verb === 'join' || msg.verb === 'leave') {
              updateAttendance(msg);
            } else {
              storeMessage(msg);
              emit('message', msg);
            }
          });
          configDone[i] = true;
        } else if (sockethubRegistered) {        
          debug('setting!', i);
          sockethubClient.sendObject({
            platform: 'dispatcher',
            target: [{ platform: i }],
            verb: 'set',
            object: config[i].object,
            actor: config[i].actor
          }).then(function() {
            configDone[i] = true;
            return joinRooms(i);
          }).then(function() {
            flushOutbox(i);
          });
        }
      }
    }
  }
  function updateAttendance(msg) {
    if (msg.verb === 'join' && msg.platform && msg.actor && msg.target) {
      if (!attendance[msg.platform]) {
        attendance[msg.platform] = {};
      }
      if (!attendance[msg.platform][msg.target]) {
        attendance[msg.platform][msg.target] = {};
      }
      attendance[msg.platform][msg.target][msg.actor] = true;
    } else if (msg.verb === 'leave' && msg.platform && msg.actor && msg.target
        && attendance[msg.platform] && attendance[msg.platform][msg.target]) {
      delete attendance[msg.platform][msg.target][msg.actor];
    }
  }
  function flushOutbox(which) {
    debug('flushing outbox', which, outbox);
    if (configDone[which] && configDone['sockethub'] && Array.isArray(outbox[which])) {
      for (var i=0; i<outbox[which].length; i++) {
        sockethubClient.sendObject(outbox[which][i]);
      }
      delete outbox[which];
    }
  }
  function joinRooms(platform) {
    var promise = promising(), channels = [];
    if (!roomJoins[platform]) {
      return;
    }
    for (i in roomJoins[platform]) {
      channels.push(i);
      debug('joining rooms', platform, channels);
    }
    return meute.join(platform, channels);
  }
  function bootstrap() {
    var modulesToTry = {
      sockethub: true,
      irc: true,
      twitter: true,
      facebook: true,
      email: true
    };
    if (remoteStorage) {
      for (i in modulesToTry) {
        loadAccount(i);
      }
      getTemplate('homepage.html');
      getTemplate('blogpost.html');
      loadPosts();
    }
  }
  function loadAccount(which) {
    remoteStorage[which].getConfig(masterPwd).then(function(res) {
      var config = res.data;
      if (typeof(config) === 'object') {
        try {
          doAddAccount(which, config, false);
        } catch(e) {
          debug('error adding account', which, config, e);
        }
      }
    }, function() {
      debug('no config found for '+which);
    });
  }
   
  function setMasterPassword(pwd) {
    masterPwd = pwd;
    bootstrap();
  }
  function addAccount(platform, server, id) {
    var parts, parts2, obj;
    if (platform === 'sockethub') {
      parts = server.split('/');
      parts2 = parts[2].split(':');
      obj = {
        host: parts2[0],
        ssl: (parts[0] === 'wss:'),
        tls: (parts[0] === 'wss:'),
        port: (parts2.length === 2 ? parts2[1] : undefined),
        path: parts[3],
        register: { secret: id }
      };
    } else if (platform === 'irc') {
      obj = {
        actor: {
          address: id,
          name: id
        },
        object: {
          nick: id,
          objectType: 'credentials',
          server: server,
          password: '',
        }
      };
    }
    doAddAccount(platform, obj);
  }
  function doAddAccount(which, thisConfig, save) {
    if (thisConfig.actor) {
      registeredActor[which] = thisConfig.actor;
    }
    config[which] = thisConfig;
    connectFurther();
    if (save !== false && remoteStorage[which] && remoteStorage[which].setConfig) {
      remoteStorage[which].setConfig(masterPwd, thisConfig);
    }
  }
  function toOutbox(platform, obj) {
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      sockethubClient.sendObject(obj);
    } else {
      debug('queueing', JSON.stringify(obj));
      if (!Array.isArray(outbox[platform])) {
        outbox[platform] = [];
      }
      outbox[platform].push(obj);
    }
  }
  function join(platform, channels, leave) {
    var obj = {
      platform: platform,
      verb: (leave ? 'leave' : 'join'),
      object: {},
    };
    if (typeof(channels) === 'string') {
      channels = [channels];
    }
    if (typeof(roomJoins[platform]) != 'object') {
      roomJoins[platform] = {};
    }

    obj.target = [];
    for (var i=0; i<channels.length; i++) {
      obj.target.push({
        address: channels[i]
      });
      if (leave) {
        delete roomJoins[platform][channels[i]];
      } else {
        roomJoins[platform][channels[i]] = true;
      }
    }
    obj.actor = registeredActor[platform];

    //only sending this if the platform is online now, otherwise
    //the rooms will be joined once the platform is configured
    //and joinRooms is called for it:
    if (configDone[platform] && configDone['sockethub']) {
      debug('sending directly', JSON.stringify(obj));
      return sockethubClient.sendObject(obj);
    }

    //roomJoins will also be called again after each sockethub reconnect
  }
  function leave(platform, channels) {
    join(platform, channels, true);
  }
  function send(platform, target, text) {
    var obj = {
      platform: platform,
      verb: 'send',
      actor: registeredActor[platform],
      target: [{
        address: target
      }],
      object: {
        text: text
      }
    };
    toOutbox(obj.platform, obj);
  }

    /***************/
   /*    EMAIL    */
  /***************/

  function sendEmail(recipient, subject, text, inReplyTo, preview) {
    var msg = {
      platform: 'email',
      actor: {
        name: 'Michiel B. de Jong',
        address: 'anything@michielbdejong.com'
      },
      target: [{
        field: 'to',
        address: recipient,
        name: recipient
      }],
      object: {
        inReplyTo: inReplyTo,
        subject: subject,
        text: text
      },
      verb: 'send'
    };
    if (typeof(recipient) === 'object') {
      msg.target = [];
      for (i in recipient) {
        msg.target.push({
          field: i,
          address: recipient[i],
          name: recipient[i]
        });
      }
      console.log('msg', msg);
    }
    if (preview) {
      console.log(JSON.stringify(msg));
    } else {
      console.log('sending');
      toOutbox(msg.platform, msg);
    }
  }
  function fetchEmailsFromTo(from, to, includeBody) {
    toOutbox('email', {
      platform: 'email',
      verb: 'fetch',
      actor: {
        address: 'anything@michielbdejong.com'
      },
      object: {
        from: from,
        to: to,
        includeBody: includeBody
      }
    }).then(function(success) {
      console.log('success', success);
    }, function(failure) {
      console.log('failure', failure);
    });
  }
  function fetch1(arr) {
    var i;
    for(i=0; i<arr.length; i++) {
      fetchEmailsFromTo(arr[i], arr[i], true);
    }
  }
  function fetch2(arr) {
    var i;
    for(i=0; i<arr.length; i++) {
      getMessage(arr[i]);
    }
  }
  function getFullMessage(msg) {
    if (msg.object.text || msg.object.html) {
      console.log('getFullMessage - 1');
      return msg;
    } else if (msg.object.messageId) {
      console.log('getFullMessage - 2');
      return remoteStorage.email.getMessage(msg.object.messageId).then(function(success) {
        console.log('success', success);
      }, function(failure) {
        console.log('failure', failure);
      });
    } else {
      console.log('getFullMessage - 3');
      console.log('retrieving full body', a[i]);
      document.sockethubClient.sendObject({
        platform: 'email',
        verb: 'fetch',
        actor: {
          address: 'anything@michielbdejong.com'
        },
        object: {
          from: imapSeqNo,
          to: imapSeqNo,
          includeBody: true
        }
      }).then(function(success) {
        console.log('success', success);
        document.result = success;
      }, function(failure) {
        console.log('failure', failure);
      });
      return;
    }
  }
  function getMessage(imapSeqNo) {
    var i, a = remoteStorage.inbox.getActivitySince();
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo === imapSeqNo) {
        return getFullMessage(a[i]);
      }
    }
  }
  function findEmailsFrom(address) {
    var i, a = remoteStorage.inbox.getActivitySince(),
      matches = {},
      num = 0;
    for (i in a) {
      if (a[i].actor && Array.isArray(a[i].actor) && a[i].actor[0] && a[i].actor[0].address && a[i].actor[0].address === address) {
        if (a[i].object && a[i].object.imapSeqNo) {
          matches[a[i].object.imapSeqNo] = a[i];
        } else {
          matches[num++] = a[i];
        }
      }
    }
    return matches;
  }
  function findGaps(fix) {  
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {}
      max = 0,
      min = 99999999999999999,
      gapStart = false;
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo) {
        have[a[i].object.imapSeqNo] = true; 
        if (a[i].object.imapSeqNo > max) {
          max = a[i].object.imapSeqNo;
        }
        if (a[i].object.imapSeqNo < min) {
          min = a[i].object.imapSeqNo;
        }
      }
    }
    for(i=min; i<max; i++) {
      if (have[i]) {
        if (gapStart) {
          console.log('gap', gapStart, i-1);
          if (fix) {
            document.fetchEmailsFromTo(gapStart, gapStart + fix);
            fix = 0;
          }
          gapStart = false;
        }
      } else {
        if (!gapStart) {
          gapStart = i;
        }
      }
    }
    if (fix) {
      document.fetchEmailsFromTo(max, max + fix);
    }
    console.log('min,max', min, max);
  }
  function getSubjects(min) {
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {}
      max = 0;
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo && (!min || a[i].object.imapSeqNo > min)) {
        have[a[i].object.imapSeqNo] = a[i].object.subject; 
        if (a[i].object.imapSeqNo > max) {
          max = a[i].object.imapSeqNo;
        }
      }
    }
    return have;
  }
  function storeMessage(msg) {
    console.log('msg', msg, JSON.stringify(msg));
    if (msg.platform === 'irc' && document.ircIncoming) {
      document.ircIncoming(msg);
    }
    remoteStorage.inbox.logActivity(msg);
    if(typeof(msg)=='object' && msg.platform=='email' && msg.object && typeof(msg.object.imapSeqNo === 'number')) {
      imapMsgRcvd();
    }
    if(typeof(msg)=='object' && msg.platform=='email' && msg.object && typeof(msg.object.messageId) === 'string') {
      key = msg.object.messageId.split('?').join('??').split('/').join('?');
      //console.log('storing message', key, msg);
      remoteStorage.email.storeMessage(key, msg);
      storeContactsFromEmailObject(msg);
    }
  }

    /*************/
   /*    WWW    */
  /*************/
  var templates = {}, posts = [];
  function getTemplate(name) {
    getResource('template/'+name, function(txt) {
      templates[name] = txt;
      console.log('loaded template', name);
    });
  }
  function getResource(name, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', name);
    xhr.onload = function() {
      if (xhr.status == 200) {
        cb(xhr.responseText);
      }
    };
    xhr.send();
  }
  function getHighestId() {
    return posts.length-1;
  }
  function generateHomePage() {
    var str = templates['homepage.html'], i, feedStr = '<?xml version="1.0" encoding="utf-8"?>\n'
      + '<rss version="2.0">\n'
      + '  <channel>\n'
      + '    <title>Michiel B. de Jong</title>\n'
      + '    <link>https://michielbdejong.com/</link>\n'
      + '    <description>Michiel\'s POSSE feed</description>\n';
    for (i=posts.length-1; i>=0; i--) {
      if (posts[i].type === 'note' || posts[i].type === 'h-rsvp') {
        str += '<article id="'+i+'" class="h-entry"><span style="float:right">'
          + hEntryDate(posts[i].date)+', <a href="/live/'+i+'">michielbdejong.com/live/'+i+'</a>'
          + twitterActions(posts[i].tweetId, i)
          + '</span><h1 class="e-content">'
          + aggregateMedia(posts[i].text)
          + hEntryMarkup(posts[i], false)
          + '</h1></article>\n';
        posts[i].saferText = posts[i].text.split('&').join('&amp;').split('<').join('&gt;');
        feedStr += '    <item>\n'
          + '      <title>'+posts[i].saferText+'</title>\n'
          + '      <link>https://michielbdejong/live/'+i+'</link>\n'
          + '      <guid>https://michielbdejong/live/'+i+'</guid>\n'
          + '      <pubDate>'+posts[i].date.toString()+'</pubDate>\n'
          + '      <description>'+posts[i].saferText+'</description>\n'
          + '    </item>\n';
      } else if(posts[i].type === 'article') {
        str += '<article id="'+i+'" class="h-entry"><span style="float:right">'
          + hEntryDate(posts[i].date)+', <a href="/blog/'+posts[i].blogPostId+'.html">michielbdejong.com/blog/'+posts[i].blogPostId+'.html</a></span><h1 class="e-content">'
          + posts[i].text
          + hEntryMarkup(posts[i], false)
          + '</h1></article>\n';
        posts[i].saferText = posts[i].text.split('&').join('&amp;').split('<').join('&gt;');
        feedStr += '    <item>\n'
          + '      <title>'+posts[i].saferText+'</title>\n'
          + '      <link>https://michielbdejong/blog/'+posts[i].blogPostId+'.html</link>\n'
          + '      <guid>https://michielbdejong/blog/'+posts[i].blogPostId+'.html</guid>\n'
          + '      <pubDate>'+posts[i].date.toString()+'</pubDate>\n'
          + '      <description>'+posts[i].saferText+'</description>\n'
          + '    </item>\n';
       }
    }
    return {
      home: str+'</body><!-- generated by https://meute.5apps.com/ --></html>',
      feed: feedStr + '  </channel>\n</rss>\n'
    };
  }
  function twoPos(a) {
    if (a>9) {
      return a;
    } else {
      return '0'+a;
    }
  }
  function hEntryDate(a) {
    a = new Date(a);
    return a.getUTCFullYear()+'-'+twoPos(a.getUTCMonth()+1)+'-'+twoPos(a.getUTCDate())
      +' '+twoPos(a.getUTCHours())+':'+twoPos(a.getUTCMinutes())+':'+twoPos(a.getUTCSeconds());
  }
  function hEntryMarkup(obj, showDetails) {
    return '<span '+(showDetails?'':'style="display:none"')+'><time class="dt-published" datetime="'+hEntryDate(obj.date)+'">'
      + hEntryDate(obj.date)
      + '</time>'
      + '<p>By <a rel="author" class="p-author h-card" href="https://michielbdejong.com/">'
      + '<img class="u-photo" src="/img/60px.jpg" style="border-radius:4em" />'
      + 'Michiel B. de Jong</a> '
      + (obj.rsvp ? '<p class="p-rsvp" value="'+obj.rsvp+'"><!-- rsvp: '+obj.rsvp+' --></p>' : '')
      + (obj.tweetId ? ' <a href="https://twitter.com/michielbdejong/status/'+obj.tweetId+'" class="u-syndication" rel="syndication">view on Twitter</a>' : '')
      + (typeof(obj.inReplyTo) === 'string' ? ' <a href="'+obj.inReplyTo+'" class="u-in-reply-to" rel="in-reply-to"><!--parent--></a>' : '')
      + (typeof(obj.inReplyTo) === 'object' ?
          '<p style="background-color:grey;color:white">in reply to <a href="'+obj.inReplyTo.url+'" class="u-in-reply-to" rel="in-reply-to">'+obj.inReplyTo.name+'</a>'+ (obj.inReplyTo.author ? 'by <img src="'+obj.inReplyTo.author.logo+'" style="width:128px" /> <a href="'+obj.inReplyTo.author.url+'">'+obj.inReplyTo.author.name+'</a>' : '') : '')
      + '</span>';
  }
  function twitterActions(tweetId, id) {
    if (tweetId) {
      return ' <action do="props" with="https://michielbdejong.com/live/'+id+'">'
         + '<a href="https://twitter.com/intent/favorite?tweet_id='+tweetId+'">Favorite</a></action>'
         + ' <action do="repost" with="https://michielbdejong.com/live/'+id+'">'
         + ' <a href="https://twitter.com/intent/retweet?tweet_id='+tweetId+'">Retweet</a></action>'
         + ' <action do="reply" with="https://michielbdejong.com/live/'+id+'">'
         + ' <a href="https://twitter.com/intent/tweet?in_reply_to='+tweetId+'">Reply</a></action>'
         + ' <a href="https://twitter.com/michielbdejong/status/'+tweetId+'" rel="syndication">view on Twitter</a>';
    } else {
      return '';
    }
  }

  function aggregateMedia(str) {
    var i, words = str.split(' '), http = 'http://', https = 'https://', handle = '@', base;
    for (i=0; i<words.length; i++) {
      if (['"', '.', ',', ':', '!'].indexOf(words[i][words[i].length-1]) === -1) {
        base = words[i];
        rest = '';
      } else {
        base = words[i].substring(0, words[i].length-1);
        rest = words[i].substring(words[i].length-1);
      }
      if(words[i].substring(0, http.length) === http || words[i].substring(0, https.length) === https) {
        words[i] = '<a href="'+base+'">'+base+'</a>'+rest;
      } else if(words[i].substring(0, handle.length) === handle) {
        words[i] = '<a href="https://twitter.com/'+base.substring(1)+'">'+base+'</a>'+rest;
      }
    }
    return words.join(' ');
  }
  function createLivePost(postObj) {
    var str1 = '<!DOCTYPE html><html><head><title>',
        str2 = '</title>\n<link rel="webmention" href="https://michielbdejong.com:7678/webmention/live/'+postObj.id+'" />\n'
          + '<link rel="author" href="https://michielbdejong.com/" />\n<meta charset="utf-8">\n'
          + '<style>\nbody { background-color: #A3DDDF }\nheader { width: 40em; margin: 5em auto; color: #903030; font-size: 20px }\n'
          + 'article { width: 40em; margin: 5em auto; padding: 3em; border-radius: 1em; background-color: white }\n'
          + 'footer { width: 40em; margin: 5em auto; color: white }\n</style></head><body><nav><a href="1">first</a> '
          + (postObj.id === 0 ? '' : '<a href="'+(postObj.id-1)+'">previous</a> ')
          + (postObj.id === posts.length-1 ? '' : '<a href="'+(postObj.id+1)+'">next</a> ')
          + '</nav><header class="h-entry"><h1 class="e-content">',
        str3 = '</h1>'+hEntryMarkup(postObj, true)
          + '<p>This message on my profile feed: <a href="https://michielbdejong.com/#'+postObj.id+'">https://michielbdejong.com/#'+postObj.id+'</a>'
          + twitterActions(postObj.tweetId, postObj.id)
          + (typeof(postObj.inReplyTo) === 'object' ? ' <a href="'+postObj.inReplyTo.url+'">parent</a>' : '')
          + (typeof(postObj.inReplyTo) === 'string' ? ' <a href="'+postObj.inReplyTo+'">parent</a>' : '')
          + '</p></header></body><!-- generated by https://meute.5apps.com/ --></html>';
    return str1+postObj.text+str2+aggregateMedia(postObj.text)+str3;
  }
  function publishNote(id) {
    remoteStorage.scope('/public/www/').storeFile('text/html', 'michielbdejong.com/live/'+id, createLivePost(posts[id]));
  }
  function publishBlogPost(id, title) {
    getResource('blog/'+id+'.html', function(txt) {
      console.log('fetched', txt);
      var str = '<!DOCTYPE html><html><head><title>'+title+templates['blogpost.html']+'\n'+title+'</h1></header><article>'+txt+'\n</article></body><!-- generated by https://meute.5apps.com/ --></html>';
      remoteStorage.scope('/public/www/').storeFile('text/html', 'michielbdejong.com/blog/'+id+'.html', str);
    });
  }  
  function extractTwitterId(url) {
    var urlParts = (url ? url.split('/') : []);
    console.log('extracting twitter id', urlParts);
    if (urlParts.length === 6 && urlParts[0] === 'https:' && urlParts[1] === '' && urlParts[2] === 'twitter.com' && urlParts[4] === 'status') {
      //str = 'RT '+urlParts[3]+': '+....;
      return urlParts[5];
    }
  }
  function publish(str, syndicate, tweetId, likeUrl, inReplyTo) {
    var id, backlink, page, tweetStr, postObj;
    id = getHighestId() + 1;//not threadsafe at all!    
    if (posts.length === 0) {
      return 'refusing to publish zero posts! try comparing `posts` to `backup` in the console';
    }
    if (syndicate) {
      console.log('publish syndicate');
      sendFacebookCreds();
      sendTwitterCreds();
      //backlink = ' (perma: /live/'+id+')';
      backlink = ' /live/'+id;
      backlink = ' (/live/'+id+')';
      //backlink = ' (michielbdejong.com /live/'+id+')';
      
      //if (likeUrl) {
      //  fblike(likeUrl);
      //} else {
        fbpost(str+backlink);
      //}
      if ((str+backlink).length > 140) {
        tweetStr = str.substring(0, 105)+'...';//change this value to 104 after i publish post #999
      } else {
        tweetStr = str;
      }
      
      retweeting = extractTwitterId(likeUrl);
      if (retweeting) {
        console.log('retweeting', retweeting);
        retweet(retweeting, function(obj) {
          publish(obj.text, false, retweeting);//link to original tweet, not to my retweet which would be obj.id_str
        });
      } else {
        tweetReply = extractTwitterId(inReplyTo);
        console.log('tweeting', inReplyTo, tweetReply);
        tweet(tweetStr+backlink, tweetReply, function(tweetId) {
          publish(str, false, tweetId, likeUrl, inReplyTo);
        });
      }
    } else {
      if (str) {
        postObj = {
          text: str,
          date: new Date().toISOString(),
          type: 'note',
          tweetId: tweetId,
          id: id,
          likeUrl: likeUrl,
          inReplyTo: inReplyTo
        };
        posts.push(postObj);
        if (posts.length != id+1) {
          console.log('new note is not the last post - race condition?');
          return;
        }
        publishNote(id);
      }
      page = generateHomePage();
      remoteStorage.scope('/public/www/').storeFile('text/html', 'michielbdejong.com/index.html', page.home);
      remoteStorage.scope('/public/www/').storeFile('text/html', 'michielbdejong.com/feed.rss', page.feed);
      savePosts();
      if (inReplyTo) {
        webmention('https://michielbdejong.com/live/'+id, inReplyTo);
      }
    }
  }
  function savePosts() {
    remoteStorage.scope('/public/www/').storeFile('application/json', 'michielbdejong.com/posts.json', JSON.stringify(posts));
  }
  function loadPosts() {
    remoteStorage.scope('/public/www/').getFile('michielbdejong.com/posts.json', 0).then(function(a) {
      posts = JSON.parse(a.data);
    }, function(err) {
      console.log('err', err); 
    });
  }
  function doSomething(what) {
    return document.sockethubClient.sendObject({
      platform: 'experimental',
      verb: 'post',
      actor: { address: 'a', name: ''},
      object: { text: '', what: what },
      target: []
    });
  }
  function webmention(source, target) {
    console.log('sending out webmention', source, target);
    doSomething({
      action: 'webmention',
      source: source,
      target: target
    });
  }
  
  function extractEvent() {
    if (!document.msg || document.msg.platform !== 'experimental') {
      console.log('retrieve the event first, e.g. doSomething({action:\'microformats\','
         + ' url:\'http://werd.io/2014/homebrew-website-club-meeting-1\',options:{baseUrl:\'http://werd.io/2014/\'}});');
      return;
    }
    for (i=0; i<document.msg.data.items.length; i++) {
      if (document.msg.data.items[i].type[0] === 'h-event') {
        return document.msg.data.items[i];
      }
    }
  }
  function publishComplex(obj) {
    obj.id = posts.length;
    obj.date = new Date().toISOString();
    obj.url = 'https://michielbdejong.com/live/'+obj.id;
    posts.push(obj);
    publishNote(obj.id);
    publish();
    if (obj.inReplyTo) {
      console.log('webmention in 10... 9... 8...', obj.url, obj.inReplyTo.url);
      setTimeout(function() {
        //webmention(obj.url, obj.inReplyTo.url);
      }, 10000);//give it time to push the changes out to the live site first
    }
  }
  function rsvp(going, syndicate) {
    var event = extractEvent();
    if (!event) {
      console.log('no event');
      return;
    }
    publishComplex({
      inReplyTo: {
        type: 'h-event',
        name: event.properties.name[0],
        url: event.properties.url[event.properties.url.length-1],
        author: (event.properties.author ? {
          name: event.properties.author[0].properties.name[0],
          logo: event.properties.author[0].properties.logo[0],
          photo: event.properties.author[0].properties.photo[0],
          url: event.properties.author[0].properties.url[0]
        } : undefined)
      },
      type: 'h-rsvp',
      rsvp: going,
      text: 'I RSVPed "'+going+'" for '+event.properties.url[event.properties.url.length-1],
      syndicate: syndicate
    });
  }

  function on(eventName, eventHandler) {
    if (!handlers[eventName]) {
      handlers[eventName] = [];
    }
    handlers[eventName].push(eventHandler);
  }

  return {
    debugState: debugState,
    setMasterPassword: setMasterPassword,
    addAccount: addAccount,
    join: join,
    leave: leave,
    send: send,
    sendEmail: sendEmail,
    fetchEmailsFromTo: fetchEmailsFromTo,
    fetch1: fetch1,
    fetch2: fetch2,
    findEmailsFrom: findEmailsFrom,
    findGaps: findGaps,
    getSubjects: getSubjects,
    on: on
  };
})();