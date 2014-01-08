(function() {
  function renderContact(contact) {
    if(typeof(contact) === 'object') {
      if (contact.address && contact.name) {
        return '"'+contact.name+'" &lt;'+contact.address+'&gt;';
      }
      return contact.address;
    }
    return JSON.stringify(contact);
  }
  function renderActor(actor, platform) {
    var i, list = [];
    if(Array.isArray(actor)) {
      for(i=0; i<actor.length; i++) {
        list.push(renderActor(actor[i], platform));
      }
      return list.join(', ');
    }
    return (platform ? platform : '')
      + ': ' + renderContact(actor);
  }
  function renderObject(obj) {
    if(obj.objectType == 'attendance') {
      return '<b>Members:</b> '+obj.members.join(', ');
    } else if(obj.objectType == 'topic') {
      return '<b>Topic:</b> '+obj.topic;
    } else if(obj.subject) {
      return '<b>'+obj.subject+'</b>';
    } else if(obj.text) {
      return obj.text;
    }
    return JSON.stringify(obj);
  }
  function renderVerb(verb) {
    return verb;
  }
  
  function renderTarget(target, platform) {
    if(typeof(target) === 'object') {
      if (target.to && target.cc) {
        return '<b>to:</b>'+renderActor(target.to, platform)
          + ', <b>cc:</b>'+renderActor(target.c, platform);
      } else if(target.to) {
        return renderActor(target.to, platform);
      }
    }
    return renderActor(target, platform);
  }  
  function toTableRow(obj) {
    return '<tr onmousedown="console.log(JSON.stringify(items['+obj.id+']), items['+obj.id+']);" ><td>'+renderActor(obj.actor, obj.platform)
      +'</td><td>'+renderVerb(obj.verb)
      +'</td><td>'+renderObject(obj.object)
      +'</td><td>'+renderTarget(obj.target, obj.platform)      
      +'</td></tr>';
  }

  window.asrender = {
    toTableRow: toTableRow
  };
})();