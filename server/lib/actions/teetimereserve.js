var cheerio = require('cheerio');
var HoldQueue = require('../holdqueue.js');
var Header = require('../web/header.js');
var FormData = require('../web/formdata');
const TimeSlot = require('../teetime/timeslot.js');

var Booking = function () {

  this.data = undefined;

  this.isEmpty = function () {
    return this.data === undefined;
  }

  this.put = function (result) {
    this.data = result;
  }

  this.get = function () {
    return this.data;
  }

};

var isAlternateNotification = function( notifications ) {
  console.log('notifications ', notifications);

  if (notifications && Array.isArray(notifications) && notifications.length > 0) {
    const msg = notifications[0];
    if (msg.includes('Would you like an alternate time?')) {
      return true;
    }
  }

  return false;
}

/**
 * this is where we attempt to hold the time slot.  there are a 
 * few possible outcomes:
 *  1. we get the lock 
 *  2. we can't get the lock, but are given an alternative
 *  3. we can't get the lock, probably due to someone else getting it
 */
var initiateReservation = function (path, session, slot) {
  return new Promise(function (resolve, reject) {
    // load up our form data.  Most of this comes 
    // from the tee sheet
    const json = slot.json;
    const formdata = new FormData();

    formdata.add("lstate", json.lstate);
    formdata.add("newreq", json.newreq);
    formdata.add("displayOpt", json.displayOpt);
    formdata.add("ttdata", json.ttdata);
    formdata.add("date", json.date);
    formdata.add("index", json.index);
    formdata.add("course", json.course);
    formdata.add("returnCourse", json.returnCourse);
    formdata.add("jump", json.jump);
    formdata.add("wasP1", json.wasP1);
    formdata.add("wasP2", json.wasP2);
    formdata.add("wasP3", json.wasP3);
    formdata.add("wasP4", json.wasP4);
    formdata.add("wasP5", json.wasP5);
    formdata.add("p5", json.p5);
    formdata.add("time:0", json['time:0']);
    formdata.add("day", json.day);
    formdata.add("contimes", json.contimes);

    session.post(path, formdata.toObject())
      .then(function (body) {

        // pick out the values we need for the next step
        const $ = cheerio.load(body);
        const table = $('div .slot_container');
        const data = table.data();
        const result = (data) ? data.ftjson : undefined;

        if (result && result.callback_map) {
          const callback_map = result.callback_map;
          console.log("initiateReservation: callback_map " + JSON.stringify(callback_map));

          const page_start_notifications = result.page_start_notifications;
          console.log("initiateReservation: page_start_notifications: " + JSON.stringify(page_start_notifications));

          if (!callback_map['time:0']) {
            console.log("initiateReservation: no tee time found in response, added " + json['time:0']);
            callback_map['time:0'] = json.time;
            reject("initiateReservation: rejecting alternate tee time");
          } else {
            console.log("initiateReservation: found tee time in response: " + callback_map['time:0']);
            resolve(callback_map);
          }
        } else {
          reject("invalid json: " + JSON.stringify(json));
        }
      }, function (err) {
        reject(err);
      });
  });
};

/**
 * attempt to lock the tee time. if we're successful, put it on a queue
 * which will be processed later
 * 
 * @param {String} path 
 * @param {Array} sessions 
 * @param {Object} session 
 * @param {TimeSlot} slot 
 * @param {HoldQueue} holdQueue 
 */
var holdReservation = function (path, sessions, session, slot, holdQueue) {
  initiateReservation(path, session, slot)
    .then(function (result) {
      // put this on our hold queue to be processed
      holdQueue.add(session, result, slot)
    },
      function (err) {
        // if we can't hold the time slot, it's likely because we're 
        // competing with someone else for locking it, or the tee
        // sheet isn't open yet.  
        console.log('holdReservation: error holding time, return session to pool');

        // put this session back in the worker pool
        sessions.push(session);
      })
}

/**
 * initiateReservation will return the data for the callback method
 * we hand those parameters back to the callback via a web form
 */
var callbackReservation = function (path, session, players, json) {
  return new Promise(function (resolve, reject) {

    // load up the form data from the json fields
    const formdata = new FormData();

    for (var key in json) {
      if (json.hasOwnProperty(key)) {
        formdata.add(key, json[key]);
      }
    }

    session.post(path, formdata.toObject(), Header.XmlHttpRequest)
      .then(function (body) {

        // process the results and form into an object for
        // the next call
        const result = JSON.parse(body);

        if (result && result.id_list && result.id_hash) {
          const id_list = result.id_list;
          const id_hash = result.id_hash;

          console.log("id_list: " + JSON.stringify(id_list));
          console.log("id_hash: " + JSON.stringify(id_hash));

          const obj = {};

          obj['teecurr_id1'] = id_list[0];
          obj.id_hash = id_hash;
          obj.hide = "0";
          obj.notes = "";

          for (let i = 1; i <= 5; i++) {
            if (i > players.length) {
              obj["player" + i] = "";
              obj["user" + i] = "";
              obj["p9" + i] = "0";
              obj["p" + i + "cw"] = "";
              obj["guest_id" + i] = "0";
            } else {
              const player = players[i - 1];

              obj["player" + i] = player.name;
              obj["user" + i] = player.username;
              obj["p9" + i] = "0";
              // [djb 3/19/2021] use CRT instead of PV for those with no private vehicle
              obj["p" + i + "cw"] = "CRT";
              obj["guest_id" + i] = "0";
            }
          }

          obj.submitForm = "submit";
          obj.slot_submit_action = "update";
          obj.json_mode = "true";

          console.log("returning obj : " + JSON.stringify(obj));

          resolve(obj);
        } else {
          reject("callbackReservation: Invalid json");
        }

      }, function (err) {
        reject(err);
      });
  })
};

var commitReservation = function (path, session, json) {
  return new Promise(function (resolve, reject) {

    // load up the form data from the json fields
    const formdata = new FormData();

    for (var key in json) {
      if (json.hasOwnProperty(key)) {
        formdata.add(key, json[key]);
      }
    }

    session.post(path, formdata.toObject(), Header.XmlHttpRequest)
      .then(function (body) {
        console.log("result " + body);
        const result = JSON.parse(body);
        if (result && result.successful) {
          resolve(result);
        } else {
          console.log("commitReservation: didn't get a positive confirmation");
          reject(result);
        }

      }, function (err) {
        reject(err);
      });
  })
};

var doCancel = function (path, session, players, json) {
  callbackReservation(path, session, players, json)
    .then(function (result) {
      // cancelReservation(path, session, result);
    });
}

var TeeTimeReserve = function (path, sessionPool) {

  // after we successfully lock a tee time, it goes on the 
  // hold queue for processing by the commit dispatcher
  const holdQueue = new HoldQueue();

  /**
   * Use a set of worker sessions to try to hold as many
   * available time slots as possible.  When we have times
   * held, process them one by one until we book a time.
   * 
   * @param {TimeSlots} timeSlots the range of tee times we will try
   * @param {Array} foursome the players to book in this tee time
   */
  this.reserveTimeSlot = function (timeSlots, foursome) {
    console.log("reserveTimeSlot");

    return new Promise(function (resolve, reject) {
      // the session pool holds the logged in instances we can 
      // use as workers
      const sessions = sessionPool.getTeeTimeSessions();
      const numberOfWorkers = sessions.length;

      // hold our booking results
      const booking = new Booking();

      const slots = timeSlots.toArray();

      console.log("slots:");
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];

        console.log('slot ' + i + ': ' + slot.toString());
      }

      // this dispatches workers in parallel to hold time slots
      // if a time slot is held, it's added to the holdqueue
      const holdTimesDispatcher = setInterval(() => {
        if (slots.length === 0) {
          clearInterval(holdTimesDispatcher);
        }

        // kick off available workers to hold times
        // each held time added to the queue
        while (sessions.length > 0 && slots.length > 0) {
          const slot = slots.shift();
          console.log('attempting to hold reservation ', slot);

          if (slot.isEmpty()) {
            const session = sessions.shift();

            holdReservation(path, sessions, session, slot, holdQueue);
          } else {
            console.log('slot not empty, skipping');
          }

        }

      }, 5);

      // this checks the queue of held time slots and tries to book them
      // one by one. if we were to just immediately book all of the held
      // tee times, we would end up booking a bunch of times in a row
      //
      // if a hold fails, the worker is made available again
      //
      // if it succeeds, we book the time and end out attempts.
      let commitInProgress = false;

      const commitTimesDispatcher = setInterval(() => {
        if (!commitInProgress && !holdQueue.isEmpty()) {
          commitInProgress = true;

          const nextItem = holdQueue.remove();
          const session = nextItem.session;
          const result = nextItem.json;

          const details = {
            time: result['time:0'],
            date: result['date'],
            course: result['course']
          };

          console.log('processing hold queue item ', details);

          callbackReservation(path, session, foursome, result)
            .then(function (result) {
              commitReservation(path, session, result)
                .then(function (result) {
                  // success!
                  clearInterval(holdTimesDispatcher);
                  clearInterval(commitTimesDispatcher);

                  booking.put(details);

                  // release any held tee times we didn't use
                  while (!holdQueue.isEmpty()) {
                    const nextItem = holdQueue.remove();
                    const session = nextItem.session;
                    const result = nextItem.json;

                    doCancel(path, session, foursome, result);
                  }

                  resolve(booking);
                }, function (err) {
                  // error, put this worker back on the queue
                  sessions.push(session);
                  commitInProgress = false;
                });
            }, function (err) {
              // error, put this worker back on the queue
              sessions.push(session);
              commitInProgress = false;
            });

        }

        // if all workers are idle, we have nothing left to process and nothing in the queue, call it a day
        if (!commitInProgress && slots.length === 0 && holdQueue.isEmpty() && sessions.length === numberOfWorkers) {
          clearInterval(commitTimesDispatcher);
          console.log('CommitTimes ending: no tee times found.');
          reject('No available tee times were found at the specified time.')
        }

      }, 20000);
    });

  };

};

module.exports = TeeTimeReserve;