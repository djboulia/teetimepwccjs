'use strict';

var Config = require('../lib/config.js');

module.exports = function (TeeTime) {

  const accessManager = Config.accessManager;

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
          http: accessManager.getTokenFromContext,
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
    'currentTime', {
      http: {
        path: '/currentTime',
        verb: 'get',
      },

      description: 'Get current tee time server time.',

      accepts: [
        {
          arg: 'ctx',
          type: 'string',
          http: accessManager.getTokenFromContext,
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
          http: accessManager.getTokenFromContext,
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
    'reserveByTimeSlot', {
      http: {
        path: '/reserveByTimeSlot',
        verb: 'post',
      },

      description: 'Try to book one of the time slots provided',

      accepts: [{
          arg: 'timeslots',
          type: 'array',
          required: true,
          description: 'Time slots to reserve'
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
          http: accessManager.getTokenFromContext,
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

    if (accessManager.isValid(tokenId)) {
      const session = accessManager.get(tokenId);

      session.search(time, date, courses)
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

  TeeTime.currentTime = function (tokenId, cb) {

    console.log("teetime.currentTime tokenId = " + tokenId);

    if (accessManager.isValid(tokenId)) {
      const session = accessManager.get(tokenId);

      session.currentTime()
        .then(function (result) {
          if (result) {
            console.log("result ms: " , result.ms);

            cb(null, result);
          } else {
            cb(new Error("teetime.currentTime failed!"));
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

    if (accessManager.isValid(tokenId)) {
      const session = accessManager.get(tokenId);

      session.reserve(time, date, courses, players)
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

  TeeTime.reserveByTimeSlot = function (timeslots, players, tokenId, cb) {

    console.log("teetime.reserveByTimeSlot tokenId = " + tokenId);

    if (accessManager.isValid(tokenId)) {
      const session = accessManager.get(tokenId);

      session.reserveByTimeSlot(timeslots, players)
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