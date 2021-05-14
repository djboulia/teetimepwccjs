/**
 * This provides the API and session management for logging into the
 * tee time system and booking tee times
 */

var SSOSession = require('./ssosession.js');
var TimeSlots = require('./timeslots');

var TeeTimeSession = function (clubSite, teetimeSite) {
  // Preston dumped their original software provider for tee time bookings, but kept 
  // them for running the main web site.  As a result, we now have to manage two sessions: 
  //  1) to handle login to the main country club website
  //  2) to handle the tee time booking site
  const session = new SSOSession(clubSite, teetimeSite);

  var buildFoursome = function (member, otherPlayers) {
    const foursome = [];

    // member we're logged in as is always first of the foursome
    const memberObject = {
      name: member.name,
      username: member.teeSheetInfo.user_name
    };

    foursome.push(memberObject);

    if (otherPlayers.length > 3) {
      console.log("Warning! " + otherPlayers.length + " players found.  Maximum is 3." +
        JSON.stringify(otherPlayers));
    }

    // add the rest of the players
    for (var i = 0; i < Math.min(otherPlayers.length, 3); i++) {
      foursome.push(otherPlayers[i]);
    }

    return foursome;
  };

  /**
   * Login to the main web site, then handle subsequent login to the tee time booking
   * site.
   * 
   * @param {String} username username for the PWCC site
   * @param {String} password password for the PWCC site
   */
  this.login = function (username, password) {
    return session.login(username, password);
  };

  this.memberInfo = function () {
    return session.memberInfo();
  };

  this.memberSearch = function (lastname) {
    console.log("MemberSearch.do");

    return new Promise(function (resolve, reject) {

      session.memberSearch(lastname)
        .then(function (body) {

          var json = JSON.parse(body);
          var rosterList = json.results;

          if (rosterList) {
            var results = [];

            for (var i = 0; i < rosterList.length; i++) {
              var member = rosterList[i];

              if (member.last.toLowerCase() == lastname.toLowerCase()) {
                var record = {
                  name: member.first + " " + member.last,
                  id: member.id,
                  username: member.username,
                  ghin: member.ghin
                }

                results.push(record);
              }
            }

            resolve(results);
          } else {
            reject("Invalid roster list!");
          }

        }, function (err) {
          reject(err);
        });
    });

  };

  this.search = function (timeString, dateString, courses) {
    return session.search(timeString, dateString, courses);
  };

  this.currentTime = function () {
    return session.currentTime();
  };


  this.reserve = function (timeString, dateString, courses, otherPlayers) {
    console.log("reserve");

    const memberInfoPromise = this.memberInfo();
    const searchPromise = this.search(timeString, dateString, courses);

    return new Promise(function (resolve, reject) {

      let foursome = [];

      memberInfoPromise
        .then(function (member) {

          console.log("Found member data: " + JSON.stringify(member));

          foursome = buildFoursome(member, otherPlayers);

          // look up available tee times
          return searchPromise;
        })
        .then(function (timeSlots) {
          return session.reserveTimeSlot(timeSlots, foursome);
        })
        .then(function (booking) {
          console.log("reservation returned: " + JSON.stringify(booking));

          if (booking && !booking.isEmpty()) {
            resolve(booking.get());
          } else {
            reject(booking);
          }
        }, function (err) {
          reject(err);
        });

    });
  };

  this.reserveByTimeSlot = function (timeslots, otherPlayers) {
    console.log("reserveByTimeSlot");

    const memberInfoPromise = this.memberInfo();

    // two helper functions for reserving the tee time
    return new Promise(function (resolve, reject) {

      const slots = new TimeSlots();
      const players = ["Available", "Available", "Available", "Available"];

      for (let i = 0; i < timeslots.length; i++) {
        const slot = timeslots[i];

        if (!slots.add(slot.date, slot.json, slot.course, players)) {
          console.log("error adding time slot " + JSON.stringify(item));
          reject(err);
          return;
        }
      }

      memberInfoPromise
        .then((memberData) => {
          const foursome = buildFoursome(memberData, otherPlayers);

          session.reserveTimeSlot(slots, foursome)
            .then(function (booking) {
              console.log("reservation returned: " + JSON.stringify(booking));

              if (booking && !booking.isEmpty()) {
                resolve(booking.get());
              } else {
                reject(booking);
              }
            },
              function (err) {
                reject(err);
              });
        })
        .catch((err) => {
          reject(err);
        })
    });
  };

};

module.exports = TeeTimeSession;