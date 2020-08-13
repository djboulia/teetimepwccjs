var async = require('async');

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


var TeeTimeReserve = function (lockManager, completeBooking) {

  var attemptBookingPromise = function (slot, players, booking) {

    return new Promise(function (resolve, reject) {
      console.log("reservePromise: attempting to book " + slot.toString());

      lockManager.lock(slot)
        .then(function (lockedSlot) {

            console.log("reservePromise: held time slot " + lockedSlot.toString());

            if (!booking.isEmpty()) {
              // since we go after the tee times concurrently, another 
              // worker could have made a booking ahead of us.  If so,
              // we stop trying to book and just return
              console.log("reserverPromise: tee time booked by another worker, releasing time slot " + lockedSlot.toString())
              resolve(booking);
            } else {
              completeBooking.promise(lockedSlot, players)
                .then(function (result) {

                  console.log("successfully completed booking");

                  booking.put(result);

                  resolve(booking);

                }, function (err) {
                  // special case... if we get an error due to a time interval
                  // but the booking is complete, then another worker likely
                  // completed the booking before us.  just let this case pass.
                  if (!booking.isEmpty() &&
                    String(err).startsWith("A daily time interval restriction")) {

                    console.log("reservePromise: another worker got the tee time, returning");
                    resolve(booking);

                  } else {
                    // if we can't complete the booking, we likely have 
                    // some error with the tee time.  possibilities such
                    // as the person already booked a tee time within
                    // 4 hours of this tee time, or an invalid member name
                    // if this happens, we don't keep trying
                    reject(err);
                  }
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

  this.buildFoursome = function (member, otherPlayers) {
    const foursome = [];

    // member we're logged in as is always first of the foursome
    foursome.push(member);

    // add the rest of the players
    for (var i = 0; i < Math.min(otherPlayers.length, 3); i++) {
      foursome.push(otherPlayers[i]);
    }

    return foursome;
  };

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

    }, 6); // # of concurrent workers


    const slots = timeSlots.toArray();

    for (var i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (slot.isEmpty()) {
        console.log("adding slot " + i);

        q.push(slot, function (err) {
          if (err) {
            return console.log('error for slot ' + slot.toString());
          }
          console.log('slot ' +  slot.toString() + ' completed!');
        });
      }
    }

    const promise = new Promise(function (resolve, reject) {
      q.drain( ()  => {
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