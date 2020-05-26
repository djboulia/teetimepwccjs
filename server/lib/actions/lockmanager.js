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
                resolve(json.data);
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
              const err = json.data.message;

              if (err === "The Tee Time you have selected is currently locked by another user.<br/>") {
                console.log("reservePromise: lock attempt failed for " + JSON.stringify(slot));
              } else {
                // catch other errors and log them
                console.log("reservePromise: error for " + JSON.stringify(slot));
                console.log(err);
              }
              // something went wrong, send back the message
              reject(err);
            }
          },
          function (err) {
            reject(err);
          });

    });
  }

};

module.exports = LockManager;