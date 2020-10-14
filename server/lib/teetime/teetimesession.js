/**
 * This provides the API and session management for logging into the
 * tee time system and booking tee times
 */

var Header = require('../web/header.js');
var Session = require('../web/session.js');
var ClubLogin = require('../actions/clublogin.js');
var TeeSheetLogin = require('../actions/teesheetlogin.js');
var TeeTimeReserve = require('../actions/teetimereserve.js');
var TeeTimeSearch = require('../actions/teetimesearch.js');
var TimeSlots = require('./timeslots');


const API_CLUB_BASE = 'api/v1/roster';
const API_CLUB_LOGIN = 'login.aspx';
const API_CLUB_TEETIMES = 'ForeTeesSSO.aspx';
const API_CLUB_MEMBER_INFO = API_CLUB_BASE + '/getcurrentMember';

const API_TEETIME_BASE = "v5";
const API_TEETIME_LOGIN = API_TEETIME_BASE + "/servlet/Login";
const API_TEETIME_PWCC_BASE = API_TEETIME_BASE + "/prestonwoodccnc_golf_m56";
const API_TEETIME_SEARCH = API_TEETIME_PWCC_BASE + '/Member_sheet';
const API_TEETIME_MEMBER_SEARCH = API_TEETIME_PWCC_BASE + '/data_loader';
const API_TEETIME_RESERVE = API_TEETIME_PWCC_BASE + '/Member_slot';


var TeeTimeSession = function (clubSite, teetimeSite) {
  // Preston dumped their original software provider for tee time bookings, but kept 
  // them for running the main web site.  As a result, we now have to manage two sessions: 
  //  1) to handle login to the main country club website
  //  2) to handle the tee time booking site
  const sessionPWCC = new Session(clubSite);

  // the tee time site seems to trigger off the User-Agent being set to a valid browser
  // type.  we set it to Firefox here.
  const sessionTeeTime = new Session(teetimeSite);
  sessionTeeTime.addHeader(Header.UserAgent.FIREFOX);

  const memberData = {
    username: null,
    name: null,
    id: null
  };


  var memberInfoPWCC = function () {
    console.log("memberInfo");

    return new Promise(function (resolve, reject) {
      const path = API_CLUB_MEMBER_INFO;

      sessionPWCC.get(path)
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

    const clubLogin = new ClubLogin(API_CLUB_LOGIN, sessionPWCC);
    const teesheetLogin = new TeeSheetLogin(API_TEETIME_LOGIN, sessionTeeTime);

    const memberInfoPromise = memberInfoPWCC;

    return new Promise(function (resolve, reject) {
      clubLogin.promise(username, password)
        .then(function (result) {

            // logged in successfully, now get and cache member info
            // this avoids having to make additional calls later
            memberInfoPromise()
              .then(function (info) {
                  memberData.username = username;
                  memberData.name = info.name;
                  memberData.id = info.id;

                  console.log("Logged in to club site with member data: " + JSON.stringify(memberData));

                  // now log in to the tee time site
                  teesheetLogin.promise(API_CLUB_TEETIMES, sessionPWCC, memberData.name)
                    .then(function (teeSheetInfo) {

                      if (teeSheetInfo) {
                        memberData.teeSheetInfo = teeSheetInfo;
                        console.log("Logged in to tee time site with member data: " + JSON.stringify(memberData));
                        resolve(result);
                      } else {
                        reject(err);
                      }
                    });
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
      resolve(memberData);
    });
  };

  this.memberSearch = function (lastname) {
    console.log("MemberSearch.do");

    return new Promise(function (resolve, reject) {
      const path = API_TEETIME_MEMBER_SEARCH + "?name_search=" + lastname + "&limit=100&arr=&_=" + Date.now();

      sessionTeeTime.get(path)
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
    const teeTimeSearch = new TeeTimeSearch(API_TEETIME_SEARCH, sessionTeeTime);

    return teeTimeSearch.promise(timeString, dateString, courses);
  };

  this.reserve = function (timeString, dateString, courses, otherPlayers) {
    console.log("reserve");

    const memberInfoPromise = this.memberInfo();
    const searchPromise = this.search(timeString, dateString, courses);

    return new Promise(function (resolve, reject) {

      let foursome = [];
      const teeTimeReserve = new TeeTimeReserve(API_TEETIME_RESERVE, sessionTeeTime);

      memberInfoPromise
        .then(function (member) {

          console.log("Found member data: " + JSON.stringify(member));

          foursome = buildFoursome(member, otherPlayers);

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

      const teeTimeReserve = new TeeTimeReserve(API_TEETIME_RESERVE, sessionTeeTime);
      const foursome = buildFoursome(memberData, otherPlayers);

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