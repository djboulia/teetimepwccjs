// keep app config in loopback's config.json file
var app = require('../server');
var TokenManager = require('../lib/auth/tokenmanager.js');

var Config = {
   // the name of the web site which hosts the tee time system
  // it is critical that the site name is precise, e.g. 
  // prestonwood.com, not www.prestonwood.com, which will 
  // fail in interesting ways
  sitename: app.get('appconfig').sitename,
  
  tokenManager: new TokenManager(60 * 60) // 1 hour ttl
};

module.exports = Config;