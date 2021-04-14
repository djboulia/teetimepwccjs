// keep app config in loopback's config.json file
var app = require('../server');
var AccessManager = require('../lib/auth/accessmanager.js');

var Config = {
   // the name of the web site which hosts the tee time system
  // it is critical that the site name is precise, e.g. 
  // prestonwood.com, not www.prestonwood.com, which will 
  // fail in interesting ways
  clubsitename: app.get('appconfig').clubsitename,
  teetimesitename: app.get('appconfig').teetimesitename,
  
  accessManager: new AccessManager(60 * 60) // 1 hour ttl
};

module.exports = Config;