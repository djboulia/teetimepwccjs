/**
 * This provides the API and session management for logging into the
 * tee time system and booking tee times
 */

var Session = require('../web/session.js');
var Login = require('../actions/login.js');
var TeeTimeReserve = require('../actions/teetimereserve.js');
var TeeTimeSearch = require('../actions/teetimesearch.js');
var CompleteBooking = require('../actions/completebooking.js');
var LockManager = require('../actions/lockmanager.js');
var TimeSlots = require('./timeslots');


const API_MEMBER_BASE = 'api/v1/roster';
const API_MEMBER_LOGIN = 'login.aspx';
const API_MEMBER_INFO = API_MEMBER_BASE + '/getcurrentMember';
const API_MEMBER_SEARCH = API_MEMBER_BASE + '/GetList/244';

const API_TEETIME_BASE = 'api/v1/teetimes';
const API_TEETIME_SEARCH = API_TEETIME_BASE + '/GetAvailableTeeTimes/';
const API_TEETIME_LOCK = API_TEETIME_BASE + '/ProceedBooking';
const API_TEETIME_UNLOCK = API_TEETIME_BASE + '/CancelBookingAttempt';
const API_TEETIME_COMMIT = API_TEETIME_BASE + "/CommitBooking/0";


var TeeTimeSession = function (site) {
  // base session to handle web layer
  const session = new Session(site);

  const memberData = {
    username: null,
    name: null,
    id: null
  };

  this.login = function (username, password) {

    const login = new Login(API_MEMBER_LOGIN, session);
    const memberInfoPromise = this.memberInfo;

    return new Promise(function (resolve, reject) {
      login.promise(username, password)
        .then(function (result) {

            // logged in successfully, now get and cache member info
            // this avoids having to make additional calls later
            memberInfoPromise()
              .then(function (info) {
                  memberData.username = username;
                  memberData.name = info.name;
                  memberData.id = info.id;

                  console.log("Logged in with member data: " + JSON.stringify(memberData));

                  resolve(result);
                },
                function (err) {
                  reject(err);
                });

          },
          function (err) {
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
    const teeTimeSearch = new TeeTimeSearch(API_TEETIME_SEARCH, session);

    return teeTimeSearch.promise(timeString, dateString, courses);
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

  this.reserveByTimeSlot = function (timeslots, otherPlayers) {
    console.log("reserveByTimeSlot");

    // two helper functions for reserving the tee time
    const lockManager = new LockManager(API_TEETIME_LOCK, API_TEETIME_UNLOCK, session);
    const completeBooking = new CompleteBooking(API_TEETIME_COMMIT, session);

    return new Promise(function (resolve, reject) {

      const slots = new TimeSlots();
      const players = ["Available", "Available", "Available", "Available"];

      for (let i=0; i<timeslots.length; i++) {
        const slot = timeslots[i];

        if (!slots.add(slot.date, slot.id, slot.course, players)) {
          console.log("error adding time slot " + JSON.stringify(item));
          reject(err);
          return;
        }
      }

      const teeTimeReserve = new TeeTimeReserve(lockManager, completeBooking);

      const foursome = teeTimeReserve.buildFoursome(memberData, otherPlayers);

      teeTimeReserve.reserveTimeSlot(slots, foursome)
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
    });
  };

};

module.exports = TeeTimeSession;