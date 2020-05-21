'use strict';

var Config = require('../lib/config.js');
var TeeTimeSession = require('../lib/teetime/teetimesession.js');

module.exports = function (Member) {

  const site = Config.sitename;
  const sessionManager = Config.sessionManager;

  Member.remoteMethod(
    'login', {
      http: {
        path: '/login',
        verb: 'post',
      },
      description: 'Validate PWCC member credentials',

      accepts: [{
          arg: 'username',
          type: 'string',
          required: true,
          description: 'username for PWCC site'
        },
        {
          arg: 'password',
          type: 'string',
          required: true,
          description: 'Password for PWCC site'
        }
      ],

      returns: {
        arg: 'token',
        type: 'object',
        root: true
      }
    }
  );

  Member.remoteMethod(
    'logout', {
      description: 'Logout of this session with access token.',
      accepts: [{
        arg: 'ctx',
        type: 'string',
        http: sessionManager.getTokenFromContext,
        description: 'Do not supply this argument, it is automatically extracted ' +
          'from request headers.',
      }],
      http: {
        verb: 'all'
      },
    }
  );

  Member.remoteMethod(
    'info', {
      http: {
        path: '/info',
        verb: 'post',
      },
      description: 'Get current member info',

      accepts: [{
        arg: 'ctx',
        type: 'string',
        http: sessionManager.getTokenFromContext,
        description: 'Do not supply this argument, it is automatically extracted ' +
          'from request headers.',
      }],

      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );

  Member.remoteMethod(
    'search', {
      http: {
        path: '/search',
        verb: 'post',
      },
      description: 'Search for members by last name',

      accepts: [{
          arg: 'lastname',
          type: 'string',
          required: true,
          description: 'Member last name to search for'
        },
        {
          arg: 'ctx',
          type: 'string',
          http: sessionManager.getTokenFromContext,
          description: 'Do not supply this argument, it is automatically extracted ' +
            'from request headers.',
        }
      ],

      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );

  Member.login = function (username, password, cb) {

    console.log("member.login");

    sessionManager.create(username, function (token) {
      var session = new TeeTimeSession(site);

      session.login(username, password)
        .then(function (result) {

          if (result) {
            // store this session and return the token
            // for future calls
            sessionManager.put(token, session);
            // console.log("result: " + result);

            cb(null, sessionManager.toObject(token));
          } else {
            cb(new Error("Login failed!"));
          }

        }, function (err) {
          cb(new Error(err));
        })
    });


  };

  Member.logout = function (tokenId, cb) {
    console.log("member.logout: token = " + tokenId);

    // forgetting this token will effectively log us out 
    if (tokenId && sessionManager.delete(tokenId)) {
      cb(null, { result: true });
    } else {
      cb(new Error("Not logged in!"));
    }
  };


  Member.info = function (tokenId, cb) {
    console.log("member.info: token = " + tokenId);

    if (sessionManager.isValid(tokenId)) {
      const session = sessionManager.get(tokenId);

      session.memberInfo()
        .then(function (result) {
          if (result) {
            cb(null, result);
          } else {
            cb(new Error("member.info failed!"));
          }
        }, function (err) {
          cb(new Error(err));
        });
    } else {
      cb(new Error("Not logged in!"));
    }

  };

  Member.search = function (lastname, tokenId, cb) {
    console.log("member.search: token = " + tokenId);

    if (sessionManager.isValid(tokenId)) {
      const session = sessionManager.get(tokenId);

      session.memberSearch(lastname)
        .then(function (result) {
          if (result) {
            console.log("result: " + JSON.stringify(result));

            cb(null, result);
          } else {
            cb(new Error("member.search failed!"));
          }
        }, function (err) {
          cb(new Error(err));
        });
    } else {
      cb(new Error("Not logged in!"));
    }
  };
};