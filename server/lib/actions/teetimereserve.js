var async = require('async');
var cheerio = require('cheerio');
var Header = require('../web/header.js');
var FormData = require('../web/formdata');

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
          } else {
            console.log("initiateReservation: found tee time in response: " + callback_map['time:0']);
          }
          resolve(callback_map);
        } else {
          reject("invalid json: " + JSON.stringify(json));
        }
      }, function (err) {
        reject(err);
      });
  });
};

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


var TeeTimeReserve = function (path, session) {

  var attemptBookingPromise = function (slot, players, booking) {

    return new Promise(function (resolve, reject) {
      console.log("attemptBookingPromise: attempting to book " + slot.toString());

      initiateReservation(path, session, slot)
        .then(function (result) {
            if (!booking.isEmpty()) {
              // since we go after the tee times concurrently, another 
              // worker could have made a booking ahead of us.  If so,
              // we stop trying to book and just return
              console.log("attemptBookingPromise: tee time booked by another worker, releasing time slot " + slot.toString());
              resolve(booking);
            } else {
              const details = {
                time: result['time:0'],
                date: result['date'],
                course: result['course']
              };

              callbackReservation(path, session, players, result)
                .then(function (result) {
                  if (!booking.isEmpty()) {
                    // since we go after the tee times concurrently, another 
                    // worker could have made a booking ahead of us.  If so,
                    // we stop trying to book and just return
                    console.log("attemptBookingPromise: tee time booked by another worker, releasing time slot " + slot.toString());
                    resolve(booking);
                  } else {
                    commitReservation(path, session, result)
                      .then(function (result) {
                        booking.put(details);
                        resolve(booking);
                      }, function(err) {
                        resolve(booking);
                      });
                  }

                }, function(err) {
                  resolve(booking);
                });
            }

          },
          function (err) {
            // if we can't hold the time slot, it's likely because we're 
            // competing with someone else for locking it, or the tee
            // sheet isn't open yet.  We keep trying other possible time slots
            // until we get one that we can lock down
            resolve(booking);
          })
    })
  }

  var reservePromise = function (slot, players, booking) {
    // create a promise for this reservation attempt
    // we wait until the attempt completes before resolving the promise
    return new Promise(function (resolve, reject) {
      console.log("reservePromise: booking.isEmpty " + booking.isEmpty());

      if (booking.isEmpty()) {

        const reservation = attemptBookingPromise(slot, players, booking);

        reservation
          .then(function (result) {
            console.log("reservePromise: returned for slot " + slot.toString());
            resolve(booking);
          }, function (err) {
            console.log("reservePromise: failed with error " + err);
            reject(err);
          });

      } else {
        // just resolve immediately, someone prior already booked a time
        console.log("reservePromise: booking complete, not trying " + slot.toString());
        resolve(booking);
      }

    });
  }

  /**
   * create a queue of promises to try all of the available
   * tee times.  when we're successful, the remaining 
   * promises will return immediately 
   * 
   * @param {Object} timeSlots 
   * @param {Array} foursome 
   */
  this.reserveTimeSlot = function (timeSlots, foursome) {
    console.log("reserveTimeSlot");

    const booking = new Booking();
    let errMsg = undefined;

    const q = async.queue(function (slot, callback) {

      reservePromise(slot, foursome, booking)
        .then((booking) => {
          callback();
        }, (err) => {
          errMsg = err;
          callback(err);
        });

    }, 1); // # of concurrent workers


    const slots = timeSlots.toArray();

    for (var i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (slot.isEmpty()) {
        console.log("adding slot " + i);

        q.push(slot, function (err) {
          if (err) {
            return console.log('error for slot ' + slot.toString());
          }
          console.log('slot ' + slot.toString() + ' completed!');
        });
      }
    }

    const promise = new Promise(function (resolve, reject) {
      q.drain(() => {
        console.log("q.drain");

        if (!booking.isEmpty()) {
          resolve(booking);
        } else {
          reject(errMsg);
        }
      });
    });

    console.log("queue length " + q.length());

    return (q.length() > 0) ? promise : Promise.resolve(booking);
  };

};

module.exports = TeeTimeReserve;