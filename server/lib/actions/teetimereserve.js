var HoldQueue = require('../holdqueue.js');
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

/**
 * attempt to lock the tee time. if we're successful, put it on a queue
 * which will be processed later
 * 
 * @param {Array} sessions 
 * @param {Object} session 
 * @param {TimeSlot} slot 
 * @param {HoldQueue} holdQueue 
 */
var holdReservation = function (sessions, session, slot, holdQueue) {
  const json = slot.json;

  session.initiateReservation(json)
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

var TeeTimeReserve = function (sessionPool) {

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
      const sessions = sessionPool.getFTSessions();
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

            holdReservation(sessions, session, slot, holdQueue);
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
      // if it succeeds, we book the time and end our attempts.
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

          session.commitReservation(foursome, result)
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

                // fire and forget canceling this reservation
                session.cancelReservation(foursome, result);
              }

              resolve(booking);
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