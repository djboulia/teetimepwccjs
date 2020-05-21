/**
 * This provides the API and session management for logging into the
 * tee time system and booking tee times
 */

var Session = require('../web/session.js');
var Login = require('../actions/login.js');
var TimeSlots = require('./timeslots');
var TeeTimeReserve = require('../actions/teetimereserve.js');
var TeeTimeSearch = require('../actions/teetimesearch.js');
var CompleteBooking = require('../actions/completebooking.js');
var LockManager = require('../actions/lockmanager.js');


const API_BASE = 'api/v1/teetimes';
const API_LOGIN = 'login.aspx';
const API_MEMBER_INFO = 'api/v1/roster/getcurrentMember';
const API_MEMBER_SEARCH = 'api/v1/roster/GetList/244';
const API_TEETIME_SEARCH = API_BASE + '/GetAvailableTeeTimes/';
const API_TEETIME_LOCK = API_BASE + '/ProceedBooking';
const API_TEETIME_UNLOCK = API_BASE + '/CancelBookingAttempt';
const API_TEETIME_COMMIT = API_BASE + "/CommitBooking/0";


var TeeTimeSession = function (site) {
  // base session to handle web layer
  const session = new Session(site);

  this.login = function (username, password) {
    const login = new Login(session);
    const path = API_LOGIN;

    console.log("login username: " + username + " password: " + password);

    return new Promise(function (resolve, reject) {

      login.getPage(path)
        .then(function (parameters) {
          return login.submitPage(path, parameters, username, password)
        })
        .then(function (result) {
          resolve(result);
        }, function (err) {
          reject(err);
        });

    });

  };

  this.memberInfo = function () {
    console.log("memberInfo");

    return new Promise(function (resolve, reject) {
      const path = API_MEMBER_INFO;

      session.get(path)
        .then(function (body) {

          var json = JSON.parse(body);

          // holds the results of current member info
          var info = {
            name: json.fullName.trim(),
            id: json.memberId
          };

          resolve(info);
        }, function (err) {
          reject(err);
        });
    });

  };

  this.memberSearch = function (lastname) {
    console.log("MemberSearch.do");

    return new Promise(function (resolve, reject) {
      const path = API_MEMBER_SEARCH;

      session.get(path)
        .then(function (body) {

          var json = JSON.parse(body);
          var rosterList = json.rosterList;

          if (rosterList) {
            var results = [];

            for (var i = 0; i < rosterList.length; i++) {
              var member = rosterList[i];

              if (member.lastName.toLowerCase() == lastname.toLowerCase()) {
                var record = {
                  name: member.firstName + " " + member.lastName,
                  id: member.memberId
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

    console.log("search");

    return new Promise(function (resolve, reject) {

      const teeTimeSearch = new TeeTimeSearch(API_TEETIME_SEARCH);
      const date = teeTimeSearch.createTime(dateString, timeString);

      if (date != null) {
        const path = teeTimeSearch.getPath(date);

        session.get(path)
          .then(function (body) {
              // build a list of time slots from this data              
              let slots = new TimeSlots();

              const json = JSON.parse(body);
              const teeSheet = json.data.teeSheet;

              for (var i = 0; i < teeSheet.length; i++) {
                const item = teeSheet[i];
                const key = item.teeSheetBank.teeSheetKey;

                const teeTime = teeTimeSearch.create24HourTime(dateString, item.teeTime);
                if (teeTime == null) {
                  const err = "Could not create tee time from " + dateString + " " + item.teeTime;
                  console.log(err);
                  reject(err);
                  return;
                }
                const players = teeTimeSearch.createPlayerData(item.players);

                if (!slots.add(teeTime, item.teeSheetTimeId, key.course, players)) {
                  console.log("error adding time slot " + JSON.stringify(item));
                }
              }

              slots = slots.filter(date, courses);

              resolve(slots);
            },
            function (err) {
              reject(err);
            });
      } else {
        reject("Invalid date string.  Should be MM/DD/YYYY format.");
      }

    });

  };

  this.reserve = function (timeString, dateString, courses, otherPlayers) {
    console.log("reserve");

    const memberInfoPromise = this.memberInfo();
    const searchPromise = this.search(timeString, dateString, courses);

    // two helper functions for reserving the tee time
    const lockManager = new LockManager(API_TEETIME_LOCK, API_TEETIME_UNLOCK, session);
    const completeBooking = new CompleteBooking(API_TEETIME_COMMIT, session);

    return new Promise(function (resolve, reject) {

      let foursome = [];
      const teeTimeReserve = new TeeTimeReserve(lockManager, completeBooking);

      memberInfoPromise
        .then(function (member) {

          console.log("Found member data: " + JSON.stringify(member));

          foursome = teeTimeReserve.buildFoursome(member, otherPlayers);

          // look up available tee times
          return searchPromise;
        })
        .then(function (timeSlots) {
          return teeTimeReserve.reserveTimeSlot(timeSlots, foursome);
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

};

module.exports = TeeTimeSession;