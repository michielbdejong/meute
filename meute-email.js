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
    //console.log('meute.email.fetchEmailsFromTo is broken, use meute.email.fetch instead!');
    //return;
    meute.toOutbox('email', {
      platform: 'email',
      verb: 'fetch',
      actor: {
        address: 'anything@michielbdejong.com'
      },
      object: {
        from: from,
        to: to,
        fromSeqNo: from,
        toSeqNo: to,
        includeBody: includeBody
      }
    });
  }
  function fetch(page, perPage, includeBody) {
    meute.toOutbox('email', {
      platform: 'email',
      verb: 'fetch',
      actor: {
        address: 'anything@michielbdejong.com'
      },
      object: {
        page: page,
        perPage: perPage,
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
          fromSeqNo: imapSeqNo,
          toSeqNo: imapSeqNo,
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

  return {
    sendEmail: sendEmail,
    fetchEmailsFromTo: fetchEmailsFromTo,
    fetch: fetch,
    fetch1: fetch1
  };
})();
