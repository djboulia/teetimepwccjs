
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
      console.log("reservePromise: attempting to book " + JSON.stringify(slot));
  
      lockManager.lock(slot)
        .then(function (result) {
  
          console.log("reservePromise: held time slot " + JSON.stringify(slot));
  
          completeBooking.promise(slot, players)
            .then(function (result) {
  
              console.log("successfully completed booking");
  
              booking.put(result);
  
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
   * create a chain of promises to try all of the available
   * tee times in order.  when we're successful, the remaining 
   * promises will return immediately 
   * 
   * @param {Object} timeSlots 
   * @param {Array} foursome 
   */
  this.reserveTimeSlot = function (timeSlots, foursome) {

    let chain = Promise.resolve();
    const booking = new Booking();

    const slots = timeSlots.toArray();

    for (var i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (slot.isEmpty()) {
        chain = chain.then(function () {
          return reservePromise(slot, foursome, booking)
        });
      }
    }

    return chain;
  }

};

module.exports = TeeTimeReserve;