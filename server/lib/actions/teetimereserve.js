var TeeTimeSearch = require('./teetimesearch.js');
var HoldTeeTime = require('./holdteetime.js');
var MemberInfo = require('./memberinfo.js');
var CompleteBooking = require('./completebooking.js');

var attemptBookingPromise = function (session, slot, players, booking) {

  return new Promise(function (resolve, reject) {
    console.log("reservePromise: attempting to book " + JSON.stringify(slot));

    const holdTeeTime = new HoldTeeTime(session);

    holdTeeTime.do(slot)
      .then(function (result) {

        console.log("reservePromise: held time slot " + JSON.stringify(slot));

        const completeBooking = new CompleteBooking(session);

        completeBooking.do(slot, players)
          .then(function (result) {

            console.log("successfully completed booking");

            booking.complete = true;
            booking.data = result;

            resolve(booking);

          }, function (err) {
            // if we can't complete the booking, we likely have 
            // some error with the tee time.  possibilities such
            // as the person already booked a tee time within
            // 4 hours of this tee time, or an invalid member name
            // if this happens, we don't keep trying
            reject(err);
          })

      }, function (err) {
        if (err === "The Tee Time you have selected is currently locked by another user.<br/>") {
          // if we can't hold the time slot, it's likely because we're 
          // competing with someone else for locking it, or the tee
          // sheet isn't open yet.  We keep trying other possible time slots
          // until we get one that we can lock down
          console.log("reservePromise: lock attempt failed for " + JSON.stringify(slot));
          resolve(booking);
        } else {
          // catch other errors and log them, but don't let future lock attempts happen
          console.log("reservePromise: error for " + JSON.stringify(slot));
          console.log(err);
          resolve(booking);
        }
      })
  })
}

var reservePromise = function (session, slot, players, booking) {
  // create a promise for this reservation attempt
  // we wait until the attempt completes before resolving the promise
  return new Promise(function (resolve, reject) {
    console.log("reservePromise: booking.complete " + booking.complete);

    if (!booking.complete) {

      const reservation = attemptBookingPromise(session, slot, players, booking);

      reservation
        .then(function (result) {
          console.log("reservePromise: returned for slot " + JSON.stringify(slot));
          resolve(booking);
        }, function (err) {
          console.log("reservePromise: failed with error " + err);
          reject(err);
        });

    } else {
      // just resolve immediately, someone prior already booked a time
      console.log("reservePromise: booking complete, not trying " + JSON.stringify(slot));
      resolve(booking);
    }

  });
}

var buildFoursome = function(member, otherPlayers) {
    const foursome = [];

    // member we're logged in as is always first of the foursome
    foursome.push(member);

    // add the rest of the players
    for (var i=0; i<Math.min(otherPlayers.length,3); i++) {
      foursome.push(otherPlayers[i]);
    }

    return foursome;
}

/**
 * create a chain of promises to try all of the available
 * tee times in order.  when we're successful, the remaining 
 * promises will return immediately 
 * 
 * @param {*} session 
 * @param {*} timeSlots 
 * @param {*} foursome 
 */
var reserveTimeSlot = function(session, timeSlots, foursome) {

  let chain = Promise.resolve();
  let booking = {
    complete: false
  };

  const slots = timeSlots.toArray();

  for (var i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (slot.isEmpty()) {
      chain = chain.then(function() {return reservePromise(session, slot, foursome, booking)});
    }
  }

  return chain;
}

var TeeTimeReserve = function (session) {

  this.do = function (timeString, dateString, courses, otherPlayers) {
    console.log("TeeTimeReserve.do");

    return new Promise(function (resolve, reject) {

      let foursome = [];

      const memberInfo = new MemberInfo(session);
      memberInfo.do()
        .then(function (member) {

          console.log("Found member data: " + JSON.stringify(member));

          foursome = buildFoursome(member, otherPlayers);

          // look up available tee times
          const teeTimeSearch = new TeeTimeSearch(session);
          return teeTimeSearch.do(timeString, dateString, courses);
        })
        .then(function (timeSlots) {

          const reservation = reserveTimeSlot(session, timeSlots, foursome);

          reservation.then(function (result) {
            console.log("chain complete!: " + JSON.stringify(result));

            if (result && result.data && result.complete === true) {
              resolve(result.data); 
            } else {
              reject(result);
            }
          }, function (err) {
            reject(err);
          });

        }, function (err) {
          reject(err);
        });

    });

  };

};

module.exports = TeeTimeReserve;