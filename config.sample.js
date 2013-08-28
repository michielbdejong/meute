var config = {
  sockethub: 'wss://localhost:4273/sock/websocket',
  token: '...'
};
var contacts = [
  'smtp:michiel@unhosted.org',
  'irc:#unhosted',
  'twitter:@michielbdejong'
];
var history = {
  'smtp:michiel@unhosted.org': [
    {
      actor: 'me',
      timestamp: 1377621234199,
      text: 'yo dawg'
    }
  ],
  'twitter:@michielbdejong': [
    {
      actor: 'me',
      timestamp: 1377621230199,
      text: '@noone_notmany testing out Meute'
    }
  ]
}; 
