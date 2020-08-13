const TimeSlot = require("../teetime/timeslot");

/**
 * This module manages the locking and unlocking of a tee time for
 * the web site. 
 * 
 * @param {String} lockPath base path of lock url on tee time site
 * @param {String} unlockPath base path of unlock url on tee time site
 * @param {Object} session active session for this tee time
 */
var LockManager = function (lockPath, unlockPath, session) {

  var printLockData = function (data) {
    console.log(
      'locked date: ' + data.date +
      ', time: ' + data.time +
      ', course: ' + data.course +
      ', players: ' + JSON.stringify(data.players));
  };

  /**
   * We double check that no one has come in and booked part of this
   * tee time.  Do that by verifying all player slots are still available.
   * 
   * @param {Object} data structure holding tee time data
   */
  var stillAvailable = function (data) {
    const players = data.players;

    if (players.length != 4) {
      console.log("LockTeeTime error: unexpected player data!");
      return false;
    }

    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (player.playerLabel.toLowerCase() != "available") {
        return false;
      }
    }

    return true;
  };

  /**
   * unlock a previously locked tee time
   */
  this.unlock = function () {
    console.log("Unlock tee time");

    return new Promise(function (resolve, reject) {
      session.get(unlockPath)
        .then(function (body) {
          resolve(body);
        }, function (err) {
          reject(err);
        });
    });
  };

  var lockedDifferentTeeTime = function (msg) {
    if (!msg) return false;

    return msg.includes("is no longer available. We have locked the following time:");
  };

  var lockedByAnotherUser = function (msg) {
    return (msg === "The Tee Time you have selected is currently locked by another user.<br/>");
  };

  /**
   * attempts to lock the given tee time slot
   * if promise is successful, returns the timeslot that was locked
   * 
   * @param {Object} slot TimeSlot object that specifies the tee time we want to lock
   * @returns {Object} TimeSlot object of the locked tee time
   */
  this.lock = function (slot) {
    let lockPathWithId = lockPath + '/' + slot.id;
    console.log("path: " + lockPathWithId);

    const unlock = this.unlock;

    return new Promise(function (resolve, reject) {

      session.get(lockPathWithId)
        .then(function (body) {

            const json = JSON.parse(body);

            if (!json || !json.data) {
              reject("Error calling lockTeeTime");
            } else if (json.data && json.data.players) {
              printLockData(json.data);

              if (stillAvailable(json.data)) {
                // got the lock, return the result
                resolve(slot);
              } else {

                const msg = "Lock failed: obtained a partially filled tee time."

                // we obtained a lock to a partially open tee time... give it back
                unlock().then(function () {
                  reject(msg);
                }, function (err) {
                  reject(msg);
                });
              }
            } else {
              const msg = json.data.message;

              if (lockedDifferentTeeTime(msg)) {
                // [8/12/2020 djb] when there is heavy contention for tee times, the tee time 
                //                 system can return a message saying that the current tee time
                //                 is booked, but here's a different one.  handle that here.
                const id = json.data.suggestedTeeTimeIDs;

                if (id) {
                  const newSlot = slot.clone();
                  newSlot.id = id;

                  console.log("lockManager: locked different time slot " + newSlot.toString());
                  resolve(newSlot);
                  return;   
                } else {
                  console.log("lockManager: invalid suggestedTeeTimeIDs " + JSON.stringify(json.data));
                }

              } else if (lockedByAnotherUser(msg)) {
                console.log("lockManager: lock attempt failed for " + slot.toString());
              } else {
                // catch other errors and log them
                console.log("lockManager: error for " + slot.toString());
                console.log(JSON.stringify(json));
              }

              // something went wrong, send back the message
              reject(msg);
            }
          },
          function (err) {
            reject(err);
          });

    });
  }

};

module.exports = LockManager;