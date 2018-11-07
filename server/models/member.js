'use strict';

var Config = require('../lib/config.js');
var Session = require('../lib/web/session.js');
var Login = require('../lib/actions/login.js');
var MemberInfo = require('../lib/actions/memberinfo.js');
var MemberSearch = require('../lib/actions/membersearch.js');

module.exports = function (Member) {

  var site = Config.sitename;

  Member.remoteMethod(
    'validLogin', {
      http: {
        path: '/validLogin',
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
        arg: 'result',
        type: 'boolean',
        root: false
      }
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
      description: 'Search for mmebers by last name',

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
        },
        {
          arg: 'lastname',
          type: 'string',
          required: true,
          description: 'Member last name to search for'
        }
      ],

      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );

  Member.validLogin = function (username, password, cb) {

    console.log("member.validLogin");

    var session = new Session(site);
    var login = new Login(session);

    login.do(username, password)
      .then(function (result) {

        // console.log("result: " + result);

        cb(null, result);
      }, function (err) {
        cb(err);
      })
  };

  Member.info = function (username, password, cb) {

    console.log("member.info");

    var session = new Session(site);
    var login = new Login(session);

    login.do(username, password)
      .then(function (result) {

        if (result) {
          var memberInfo = new MemberInfo(session);

          return memberInfo.do();
        } else {
          return (null);
        }

      })
      .then(function (result) {
        // memberInfo result

        if (result) {
          cb(null, result);
        } else {
          cb("Login failed!  Check username and password.");
        }

      }, function (err) {
        cb(err);
      });
  };

  Member.search = function (username, password, lastname, cb) {

    console.log("member.search");

    var session = new Session(site);
    var login = new Login(session);

    login.do(username, password)
      .then(function (result) {

        if (result) {
          var memberSearch = new MemberSearch(session);

          return memberSearch.do(lastname);
        } else {
          return (null);
        }

      })
      .then(function (result) {
        // holds the results of current member search

        if (result) {
          console.log("result: " + JSON.stringify(result));

          cb(null, result);
        } else {
          cb("Login failed!  Check username and password.");
        }

      }, function (err) {
        cb(err);
      });
  };
};