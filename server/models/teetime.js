'use strict';

var Config = require('../lib/config.js');
var Session = require('../lib/web/session.js');
var Login = require('../lib/actions/login.js');
var TeeTimeSearch = require('../lib/actions/teetimesearch.js');
var TeeTimeReserve = require('../lib/actions/teetimereserve.js');

module.exports = function (TeeTime) {

  const sessionManager = Config.sessionManager;

  TeeTime.remoteMethod(
    'search', {
      http: {
        path: '/search',
        verb: 'post',
      },

      description: 'Search for available tee times',

      accepts: [{
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


  TeeTime.remoteMethod(
    'reserve', {
      http: {
        path: '/reserve',
        verb: 'post',
      },

      description: 'Book a tee time',

      accepts: [{
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

  TeeTime.search = function (time, date, courses, tokenId, cb) {

    console.log("teetime.search tokenId = " + tokenId);

    if (sessionManager.isValid(tokenId)) {
      const session = sessionManager.get(tokenId);
      const teeTimeSearch = new TeeTimeSearch(session);

      teeTimeSearch.do(time, date, courses)
        .then(function (result) {
          if (result) {
            const slots = result.toArray();
            console.log("result: " + JSON.stringify(slots));

            cb(null, slots);
          } else {
            cb(new Error("teetime.search failed!"));
          }
        }, function (err) {
          cb(new Error(err));
        });
    } else {
      cb(new Error("Not logged in!"));
    }

  };

  TeeTime.reserve = function (time, date, courses, players, tokenId, cb) {

    console.log("teetime.reserve tokenId = " + tokenId);

    if (sessionManager.isValid(tokenId)) {
      const session = sessionManager.get(tokenId);
      const teeTimeReserve = new TeeTimeReserve(session);

      teeTimeReserve.do(time, date, courses, players)
        .then(function (result) {
          if (result) {
            console.log("result: " + JSON.stringify(result));

            cb(null, result);
          } else {
            cb(new Error("Reservation failed!"));
          }
        }, function (err) {
          cb(new Error(err));
        });
    } else {
      cb(new Error("Not logged in!"));
    }
  };
};