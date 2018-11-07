var CompleteBooking = function (session) {

  var buildReservation = function (player) {
    return {
      "ReservationId": 0,
      "ReservationType": 0,
      "FullName": player.name,
      "Transport": "2",
      "Caddy": "false",
      "Rentals": "",
      "MemberId": player.id
    }
  }

  var buildRequest = function (players) {
    const member = players[0];

    const obj = {
      "Mode": "Booking",
      "BookingId": 0,
      "OwnerId": member.id,
      "Reservations": [],
      "Holes": 18,
      "StartingHole": "1",
      "wait": false,
      "Allowed": null,
      "enabled": true,
      "startTime": null,
      "endTime": null,
      "Notes": ""
    }

    // add the players for this reservation
    for (var i = 0; i < players.length; i++) {
      obj.Reservations.push(buildReservation(players[i]));
    }

    console.log("completeBooking request: " + JSON.stringify(obj));

    return obj;
  }

  this.do = function (slot, players) {
    console.log("CompleteBooking.do");

    return new Promise(function (resolve, reject) {

      let url = "api/v1/teetimes/CommitBooking/0";
      console.log("complete booking url: " + url);

      const data = buildRequest(players);

      session.postJson(url, data)
        .then(function (json) {

          if (!json || !json.data) {
            reject("Error calling CommitBooking");
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

module.exports = CompleteBooking;