'use strict';

var Config = require('../lib/config.js');
var Session = require('../lib/web/session.js');
var Login = require('../lib/actions/login.js');
var TeeTimeSearch = require('../lib/actions/teetimesearch.js');
var TeeTimeReserve = require('../lib/actions/teetimereserve.js');

module.exports = function (TeeTime) {

  const site = Config.sitename;

  TeeTime.remoteMethod(
    'search', {
      http: {
        path: '/search',
        verb: 'post',
      },

      description: 'Search for available tee times',

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
          arg: 'time',
          type: 'string',
          required: true,
          description: 'Time to search (hh:mm a)'
        },
        {
          arg: 'date',
          type: 'string',
          required: true,
          description: 'Date to search (MM/dd/yyyy)'
        },
        {
          arg: 'courses',
          type: 'array',
          required: true,
          description: 'Ordered array of course preferences'
        }
      ],

      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );


  TeeTime.remoteMethod(
    'reserve', {
      http: {
        path: '/reserve',
        verb: 'post',
      },

      description: 'Book a tee time',

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
          arg: 'time',
          type: 'string',
          required: true,
          description: 'Time to search (hh:mm a)'
        },
        {
          arg: 'date',
          type: 'string',
          required: true,
          description: 'Date to search (MM/dd/yyyy)'
        },
        {
          arg: 'courses',
          type: 'array',
          required: true,
          description: 'Ordered array of course preferences'
        },
        {
          arg: 'players',
          type: 'array',
          required: true,
          description: 'List of additional playing partners (max 3)'
        }
      ],

      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }
  );

  TeeTime.search = function (username, password, time, date, courses, cb) {

    console.log("teetime.search");

    const session = new Session(site);
    const login = new Login(session);

    login.do(username, password)
      .then(function (result) {

        if (result) {
          const teeTimeSearch = new TeeTimeSearch(session);

          return teeTimeSearch.do(time, date, courses);
        } else {
          return (null);
        }

      })
      .then(function (result) {
        // results of tee time search

        if (result) {
          const slots = result.toArray();          
          console.log("result: " + JSON.stringify(slots));

          cb(null, slots);
        } else {
          cb("Login failed!  Check username and password.");
        }

      }, function (err) {
        cb(err);
      });
  };

  TeeTime.reserve = function (username, password, time, date, courses, players, cb) {

    console.log("teetime.reserve");

    const session = new Session(site);
    const login = new Login(session);

    login.do(username, password)
      .then(function (result) {

        if (result) {
          if (courses.length>3) {
            console.log("Warning: max of three players allowed on a tee time");
          }

          const teeTimeReserve = new TeeTimeReserve(session);

          return teeTimeReserve.do(time, date, courses, players);
        } else {
          return Promise.reject("Login failed! Check username and password.");
        }

      })
      .then(function (result) {
        // results of tee time booking

        if (result) {
          console.log("result: " + JSON.stringify(result));

          cb(null, result);
        } else {
          cb("Reservation failed!");
        }

      }, function (err) {
        cb(err);
      });
  };
};