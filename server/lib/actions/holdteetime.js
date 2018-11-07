var HoldTeeTime = function (session) {

  this.do = function (slot) {
    console.log("HoldTeeTime.do");

    return new Promise(function (resolve, reject) {

      let url = "api/v1/teetimes/ProceedBooking/" + slot.id;
      console.log("hold tee time url: " + url);

      session.get(url)
        .then(function (body) {

          const json = JSON.parse(body);

          if (!json || !json.data) {
            reject("Error calling ProceedBooking");
          } else if (json.data && json.data.players) {
            // got the lock, return the result
            resolve(json.data);
          } else {
            // something went wrong, send back the message
            reject(json.data.message);
          }
        }, function (err) {
          reject(err);
        });
    });

  };

};

module.exports = HoldTeeTime;