meute.email = (function() {
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
      meute.toOutbox(msg.platform, msg);
    }
  }
  function fetchEmailsFromTo(from, to, includeBody) {
    console.log('meute.email.fetchEmailsFromTo is broken, use meute.email.fetch instead!');
    return;
    meute.toOutbox('email', {
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
    });
  }
  function fetch(pageNo, pageSize, includeBody) {
    meute.toOutbox('email', {
      platform: 'email',
      verb: 'fetch',
      actor: {
        address: 'anything@michielbdejong.com'
      },
      object: {
        pageNo: pageNo,
        pageSize: pageSize,
        includeBody: includeBody
      }
    });
  }
  function fetch1(arr) {
    console.log('meute.email.fetch1 is broken, use meute.email.fetch instead!');
    return;
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
    if (fix) {
      console.log('meute.email.findGaps(fix) is broken, use meute.email.fetch instead!');
      return;
    }
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
            fetchEmailsFromTo(gapStart, gapStart + fix);
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
      fetchEmailsFromTo(max, max + fix);
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
  function getMessage(imapSeqNo) {
    var i, a = remoteStorage.inbox.getActivitySince();
    for (i in a) {
      if (a[i].object && a[i].object.imapSeqNo === imapSeqNo) {
        return getFullMessage(a[i]);
      }
    }
  }

  function storeContactsFromEmailObject(obj) {
    remoteStorage.contacts.addFromList(obj.actor);
    if(obj.target) {
      remoteStorage.contacts.addFromList(obj.target.to);
      remoteStorage.contacts.addFromList(obj.target.cc);
    }
  }

  function storeMessage(msg) {
    remoteStorage.inbox.logActivity(msg);
    if(typeof(msg)=='object' && msg.platform=='email' && msg.object && typeof(msg.object.messageId) === 'string') {
      key = msg.object.messageId.split('?').join('??').split('/').join('?');
      //console.log('storing message', key, msg);
      remoteStorage.email.storeMessage(key, msg, meute.debugState().registeredActor.email.address);
      storeContactsFromEmailObject(msg);
    }
  }

  return {
    sendEmail: sendEmail,
    fetchEmailsFromTo: fetchEmailsFromTo,
    fetch: fetch,
    fetch1: fetch1,
    //fetch2: fetch2,
    findEmailsFrom: findEmailsFrom,
    findGaps: findGaps,
    //getSubjects: getSubjects,
    storeMessage: storeMessage
  };
})();