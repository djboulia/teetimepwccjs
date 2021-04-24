/**
 * Manage a pool of logged in session objects
 */

var Header = require('../web/header.js');
var Session = require('../web/session.js');
var ClubLogin = require('../actions/clublogin.js');
var TeeSheetLogin = require('../actions/teesheetlogin.js');

const API_CLUB_BASE = 'api/v1/roster';
const API_CLUB_LOGIN = 'login.aspx';
const API_CLUB_TEETIMES = 'ForeTeesSSO.aspx';
const API_CLUB_MEMBER_INFO = API_CLUB_BASE + '/getcurrentMember';

const API_TEETIME_BASE = "v5";
const API_TEETIME_LOGIN = API_TEETIME_BASE + "/servlet/Login";

/**
 * Create a pool of logged in instances and manage the login details for the
 * golf club site and booking site.
 * 
 * @param {String} clubSite PWCC site for initial login and member info
 * @param {String} teetimeSite ForeTees site where bookings are actually made
 * @param {Integer} size of the pool (number of workers)
 */
var SessionPool = function (clubSite, teetimeSite, size) {
    const sessions = [];

    const memberData = {
        username: null,
        name: null,
        id: null
    };

    this.getClubSession = function () {
        const session = sessions[0];
        return session.sessionPWCC;
    };

    this.getTeeTimeSession = function () {
        const session = sessions[0];
        return session.sessionTeeTime;
    };

    this.getTeeTimeSessions = function () {

        const teeTimeSessions = [];

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            teeTimeSessions.push(session.sessionTeeTime);
        }

        return teeTimeSessions;
    }

    var memberInfoPWCC = function (path, sessionPWCC) {
        console.log("memberInfoPWCC");

        return new Promise(function (resolve, reject) {
            console.log('in memberInfoPWCC');

            sessionPWCC.get(path)
                .then(function (body) {

                    var json = JSON.parse(body);
                    const fullName = json.fullName;
                    const memberId = json.memberId;

                    if (!fullName || !memberId) {
                        console.log('memberInfo returned: ' + JSON.stringify(json));
                        reject('invalid member info ' + json.message);
                        return;
                    }

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

    this.memberInfo = function () {
        console.log("memberInfo");

        return new Promise(function (resolve, reject) {
            resolve(memberData);
        });
    };

    /**
     * Login to the main web site, then handle subsequent login to the tee time booking
     * site.
     * 
     * @param {String} username username for the PWCC site
     * @param {String} password password for the PWCC site
     */
    this.singleLogin = function (sessionPWCC, sessionTeeTime, username, password) {
        console.log('singleLogin');

        const clubLogin = new ClubLogin(API_CLUB_LOGIN, sessionPWCC);
        const teesheetLogin = new TeeSheetLogin(API_TEETIME_LOGIN, sessionTeeTime);

        const path = API_CLUB_MEMBER_INFO;
        const memberInfoPromise = memberInfoPWCC;

        return new Promise(function (resolve, reject) {
            clubLogin.promise(username, password)
                .then(function (result) {

                    console.log('clubLogin result ', result);

                    // logged in successfully, now get and cache member info
                    // this avoids having to make additional calls later
                    memberInfoPromise(path, sessionPWCC)
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

                })
                .catch((e) => {
                    reject(e);
                })
        });
    };

    /**
     * under the covers we login multiple times to have separate sessions.  This allows
     * us to go after multiple tee times when trying to reserve spots.
     * 
     * @param {String} username 
     * @param {String} password 
     * @returns 
     */
    this.login = function (username, password) {
        const self = this;

        return new Promise(function (resolve, reject) {
            const promises = [];
            const pendingSessions = [];

            for (let i = 0; i < size; i++) {
                // Preston dumped their original software provider for tee time bookings, but kept 
                // them for running the main web site.  As a result, we now have to manage two sessions: 
                //  1) to handle login to the main country club website
                //  2) to handle the tee time booking site
                const sessionPWCC = new Session(clubSite);

                // the tee time site seems to trigger off the User-Agent being set to a valid browser
                // type.  we set it to Firefox here.
                const sessionTeeTime = new Session(teetimeSite);
                sessionTeeTime.addHeader(Header.UserAgent.FIREFOX);

                pendingSessions.push({ sessionPWCC: sessionPWCC, sessionTeeTime: sessionTeeTime });

                promises.push(self.singleLogin(sessionPWCC, sessionTeeTime, username, password));
            }

            Promise.allSettled(promises)
                .then((results) => {

                    for (let i=0; i<results.length; i++) {
                        const result = results[i];
                        if (result.status === 'fulfilled') {
                            sessions.push(pendingSessions[i]);
                        } else {
                            console.log('failed login: ', result);
                        }
                    }

                    if (sessions.length >0) {
                        resolve(results[0].value);
                    } else {
                        reject('Login failed');
                    }
                })
        });
    };
};

module.exports = SessionPool;