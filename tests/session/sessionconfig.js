var SessionPool = require('../../server/lib/teetime/sessionpool');

var SessionConfig = function() {

    const session = new SessionPool("www.prestonwood.com", "ftapp.prestonwood.com", 1);

    var args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('please supply userid and password to this script');
        process.exit(0);
    }

    this.getUserName = function() {
        return args[0];
    }

    this.getPassword = function() {
        return args[1];
    }

    this.getSession = function() {
        return session;
    }
}

module.exports = SessionConfig;
