document.messaging = (function() {
  var imapMsgRcvd = function() {};
  
  function storeContactsFromEmailObject(obj) {
    remoteStorage.contacts.addFromList(obj.actor);
    if(obj.target) {
      remoteStorage.contacts.addFromList(obj.target.to);
      remoteStorage.contacts.addFromList(obj.target.cc);
    }
  }
  document.extractContacts = function(account, box) {
    remoteStorage.email.getImapBoxIndex(account, box).then(
      function(inbox) {
        var a;
        for(a in inbox) {
          remoteStorage.email.getMessage(inbox[a].messageId).then(
            storeContactsFromEmailObject,
            (function(id) {
              return function(err) {
                console.log('error while getting message', err, id);
              };
            })(inbox[a].messageId)
          );
        }
      },
      function(err) {
        console.log('error getting imap box index', err);
      }
    );
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
    if(preview) {
      console.log(JSON.stringify(msg));
    } else {
      console.log('sending');
      send(msg);
    }
  }
  console.log('in messaging.js, getting sh config');
  var send = function() { console.log('not ready'); };
  remoteStorage.sockethub.getConfig().then(function(config) {
  console.log('in messaging.js, got sh config');
    if(!config) {
      config = {
        host: 'michielbdejong.com',
        path: '/sockethub',
        port: 10550,
        tls: true,
        secret: "1234567890"
      };
      remoteStorage.sockethub.writeConfig(config);
    }
    console.log(config, 'trying to set up sockethubClient!');
    try {
      document.sockethubClient = SockethubClient.connect({
        host: config.host,
        path: config.path,
        port: config.port,
        ssl: config.tls,
        tls: config.tls,
        register: {
          secret: config.secret
        }
      });
      function setEmailConfig(config) {
        document.sockethubClient.set('email', config).then(function(success) {
          console.log('success', success);
          if(document.onSockethubReady) {
            document.onSockethubReady();
          }
          send = function(msg) {
            document.sockethubClient.sendObject(msg);
          };
        }, function(failure) {
          console.log('failure', failure);
        });
      }
      document.setEmailPassword = function(pwd) {
        var config = {
          credentials: {
            'anything@michielbdejong.com': {
              actor: {
                address: 'anything@michielbdejong.com',
                name: 'Michiel de Jong'
              },
              smtp: {
                host: 'mail.gandi.net',
                username: 'anything@michielbdejong.com', 
                password: pwd,
                tls: false,
                port: 25
              },
              imap: {
                host: 'mail.gandi.net',
                username: 'anything@michielbdejong.com', 
                password: pwd,
                tls: false,
                port: 143
              }
            }
          }
        };
        remoteStorage.email.writeConfig(config).then(function(success) {
          console.log('success', success);
          if(success) {
            setEmailConfig(config);
          } else {
            console.log('setting email config failed');
          }
        });
      
      };
      document.sockethubClient.on('registered', function() {
        console.log('registered!');
        try {
         remoteStorage.email.getConfig().then(function(config) {
            if(typeof(config) === 'object' && config['@context']) {
              delete config['@context'];
            }
            console.log(config);
            if(config) {
              setEmailConfig(config);
            } else {
              console.log('please call document.setEmailPassword(\'hunter2\');!');
            }
          });
        } catch(e) {
          console.log(e.message);
        }
      });
      document.fetchEmailsFromTo = function (from, to, includeBody) {
        document.sockethubClient.sendObject({
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
      };
      document.fetch1 = function(arr) {
        var i;
        for(i=0; i<arr.length; i++) {
          document.fetchEmailsFromTo(arr[i], arr[i], true);
        }
      };
      document.fetch2 = function(arr) {
        var i;
        for(i=0; i<arr.length; i++) {
          document.messaging.getMessage(arr[i]);
        }
      };
      
      document.sockethubClient.on('message', storeMessage);
    } catch(e) {
      console.log(e.message);
    }
  }, function(err) {
    console.log('getConfig error', err.message);
  });

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
    
  function fetchNextMessages(n) {
    var timer = setTimeout("window.location = '';", 120000);
    rcvd = 0;
    if (!n) {
      n = 100;
    }
    imapMsgRcvd = function() {
      rcvd++;
      if(rcvd === n) {
        console.log('rcvd', rcvd);
        clearTimeout(timer);
        if(document.stop) { return; } //maybe this can help avoid getting so many AbortErrors on page refresh
        setTimeout('document.messaging.fetchNextMessages('+n+');', 500);//give it half a second to keep other tabs responsive (and maybe allow IndexedDB to complete updates?)
      }
    }
    var i, a = remoteStorage.inbox.getActivitySince(),
      have = {};
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo) {
        have[a[i].object.imapSeqNo] = true; 
      }
    }
    for(i=2; true; i++) {
      if (!have[i]) {
       console.log(i, Math.floor(i / n));
       document.fetchEmails(Math.floor(i / n), n, false);
       break;
      }
    }
  }
  //setInterval("fetchNextMessages(100);", 60000);
  
  return {
    getAccounts: function() {},//-> [{...}]
    setAccount: function() {},//(i, {...})
    onMessage: function() {},//(function(activity))
    findGaps: findGaps,
    getSubjects: getSubjects,
    findEmailsFrom: findEmailsFrom,
    getMessage: getMessage,
    fetchNextMessages: fetchNextMessages,
    getFeedTable: function(pageNum) {
      window.items = remoteStorage.inbox.getActivityInterval(100*pageNum, 100),
        str = '<table border="1">';
      for(var i in items) {
        items[i].id = i;
        str += asrender.toTableRow(items[i]);
      }
      return str + '</table>'; 
    },
    getConversationsTable: function() {
      return '<table><tr><td>'+remoteStorage.inbox.getConversationNames().join('</td><td>')+'</td></tr></table>';
    },
    storeMessage: storeMessage,
    sendEmail: sendEmail
  };

})();

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
    function d(promise) {
      promise.then(function(a) {
        console.log('success', a);
        document.dResult = a;
      }, function(a) {
        console.log('failure', a);
        document.dResult = a;
      });
    }
    remoteStorage._log = true;
    remoteStorage.displayWidget();
    remoteStorage.access.claim('www', 'rw');
    remoteStorage.access.claim('facebook-credentials', 'rw');
    remoteStorage.access.claim('twitter-credentials', 'rw');
    remoteStorage.stopSync();
    document.sockethubClient = SockethubClient.connect({
      host: 'michielbdejong.com',
      path: '/sockethub',
      port: 10550,
      ssl: true,
      tls: true,
      register: {
        secret: '1234567890'
      }
    });

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
    var backup = [
      {
        date: "2014-03-01T09:53:53.811Z",
        type: "note",
        text: "post zero!"
      },
      {
        date: "2014-03-01T10:53:53.811Z",
        type: "note",
        text: "I'm in the process of setting up POSSE. Let's see if I can syndicate this post into a tweet."
      },
      {
        date: "2014-03-01T11:53:53.811Z",
        type: "note",
        text: "testing POSSE posting with http://meute.5apps.com  + reSite"
      },
      {
        date: "2014-03-01T12:53:53.811Z",
        type: "note",
        text: "three movies in the imdb top 10 http://www.imdb.com/chart/top which i haven't seen yet; time to borrow them from a peer!"
      },
      {
        date: "2014-03-01T13:53:53.811Z",
        type: "note",
        text: "the Quattro Formaggi pizza i just had was more like nachos & cheese, but tasty nonetheless"
      },
      {
        date: "2014-03-02T09:53:17.226Z",
        type: "note",
        text: "fascinating interview with @leashless - from open source, to world hunger, to bitcoin, to genocides, to lady gaga in space https://www.youtube.com/watch?v=9rys_saLiDA"
      },
      {
        date: "2014-03-04T04:13:59.012Z",
        type: "note",
        text: "just got #indieweb private messaging working using just a https textarea (ref http://www.sandeep.io/178)"
      },
     {
       "text":"It's fun to indiewebify.me! just added a discoverable /feed.rss to my site",
       "date":"2014-03-04T05:26:10.868Z",
       "saferText":"It's fun to indiewebify.me! just added a discoverable /feed.rss to my site",
       "type":"note"
     },
     {
       "text":"\"if you can't curl it, it's not on the web.\" http://indiewebcamp.com/IndieMark#Level_1",
       "date":"2014-03-04T07:01:35.042Z",
       "saferText":"\"if you can't curl it, it's not on the web.\" http://indiewebcamp.com/IndieMark#Level_1",
       "type":"note"
     },
     {
       "text":"I think I reached an IndieMark score of 1.5 (level 1 completed, cherry-picked from level 2) #indieweb",
       "date":"2014-03-04T07:17:09.351Z",
       "saferText":"I think I reached an IndieMark score of 1.5 (level 1 completed, cherry-picked from level 2) #indieweb",
       "type":"note"
     },
     {
       "text":"experimenting with parenthetical permashortlink citation","date":"2014-03-04T08:39:56.245Z","saferText":"experimenting with parenthetical permashortlink citation","type":"note"},{"text":"Testing out minimalistic variation on (ttk.me t4Pc2) style POSSE backlink","date":"2014-03-04T08:47:05.168Z","saferText":"Testing out minimalistic variation on (ttk.me t4Pc2) style POSSE backlink","type":"note"
     },{
       "text":"maybe try what that looks like with parenthesis around it - is the POSSE original of this tweet easily discoverable?","date":"2014-03-04T08:50:00.190Z","saferText":"maybe try what that looks like with parenthesis around it - is the POSSE original of this tweet easily discoverable?","type":"note"
     },{
       "text":"Joern Drever about why he works for ownCloud: http://www.butonic.de/2013/12/17/why-i-work-on-owncloud/","date":"2014-03-07T03:57:01.793Z","saferText":"Joern Drever about why he works for ownCloud: http://www.butonic.de/2013/12/17/why-i-work-on-owncloud/","type":"note"
     },{
       "date":"2011-07-01T00:00:00.000Z","type":"article","text":"Software freedom on the web https://michielbdejong.com/blog/1.html","saferText":"Software freedom on the web https://michielbdejong.com/blog/1.html","blogPostId":1
     },{
       "date":"2011-08-01T00:00:00.000Z","type":"article","text":"Why browsers should offer login https://michielbdejong.com/blog/2.html","blogPostId":2,"saferText":"Why browsers should offer login https://michielbdejong.com/blog/2.html"
     },{
       "date":"2012-02-01T00:00:00.000Z","type":"article","text":"On the origin of computational complexity https://michielbdejong.com/blog/3.html","blogPostId":3,"saferText":"On the origin of computational complexity https://michielbdejong.com/blog/3.html"
     },{
       "date":"2012-08-01T00:00:00.000Z","type":"article","text":"The countries and Crime https://michielbdejong.com/blog/4.html","blogPostId":4,"saferText":"The countries and Crime https://michielbdejong.com/blog/4.html"
     },{
       "date":"2013-02-01T00:00:00.000Z","type":"article","text":"Reboot to virtual prosperity https://michielbdejong.com/blog/5.html","blogPostId":5,"saferText":"Reboot to virtual prosperity https://michielbdejong.com/blog/5.html"
     },{
       "date":"2013-12-01T00:00:00.000Z","type":"article","text":"Wifi 4 Change https://michielbdejong.com/blog/6.html","blogPostId":6,"saferText":"Wifi 4 Change https://michielbdejong.com/blog/6.html"
     },{
       "date":"2013-07-01T00:00:00.000Z","type":"article","text":"Four simple tips for web page providers https://michielbdejong.com/blog/7.html","blogPostId":7,"saferText":"Four simple tips for web page providers https://michielbdejong.com/blog/7.html"
     }
    ];
    
    //...
    setTimeout(function() {
      sendFacebookCreds();
      sendTwitterCreds();
      if (window.location.search.length) {
        var parts, str, prefix = '?reblog=';
        if (window.location.search.substring(0, prefix.length) === prefix) {
          parts = window.location.search.substring(prefix.length).split('&title=');
          str = '"'+decodeURIComponent(parts[1])+'" '+decodeURIComponent(parts[0]);
          console.log('will autoreblog in 10 secs', str);
          setTimeout(function() {
            publish(str, true, undefined, decodeURIComponent(parts[1]));
            console.log('autoreblogged. will close window in 10 secs');
            setTimeout(function() {
              window.close();
            }, 10000);
          }, 10000);
        }
      }
    }, 5000);

    document.sockethubClient.on('message', function(msg) {document.msg=msg;});
    getTemplate('homepage.html');
    getTemplate('blogpost.html');
    loadPosts();
remoteStorage.social = {
  send: function(