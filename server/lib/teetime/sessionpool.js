/**
 * Manage a pool of logged in session objects
 */

var Session = require('../web/session.js');
var SessionFT = require('./ftsession');
var TeeSheetLogin = require('../actions/teesheetlogin.js');
var TeeSheetMain = require('../actions/teesheetmain.js');

const API_TEETIME_LOGIN = "members-login";
const API_TEETIME_MAIN = "golf/tee-times-43.html";

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
        return session.sessionClub;
    };

    this.getFTSession = function () {
        const session = sessions[0];
        return session.sessionFT;
    };

    this.getFTSessions = function () {

        const teeTimeSessions = [];

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            teeTimeSessions.push(session.sessionFT);
        }

        return teeTimeSessions;
    }

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
     * Added a delay parameter to space out multiple logins
     * 
     * @param {Object} sessionObj holds the session structure for logging in
     * @param {String} username username for the PWCC site
     * @param {String} password password for the PWCC site
     * @param {Number} delay number of seconds to wait until login
     */
    this.singleLogin = function (sessionObj, username, password, delay) {
        console.log('singleLogin');

        const sessionClub = sessionObj.sessionClub;

        const teesheetLogin = new TeeSheetLogin(sessionClub);
        const teesheetMain = new TeeSheetMain(sessionClub);

        return new Promise(function (resolve, reject) {

            const loginFunc = function () {
                // log in to the prestonwood site.  
                // first we login with our credentials, then visit
                // the main golf page which gives us keuys to login to the 
                // foretees site.
                teesheetLogin.promise(API_TEETIME_LOGIN, username, password)
                    .then((teeSheetInfo) => {

                        if (teeSheetInfo) {
                            memberData.username = teeSheetInfo.username;
                            memberData.name = teeSheetInfo.name;
                            console.log("Logged in to tee time site with member data: " + JSON.stringify(memberData));

                            teesheetMain.promise(API_TEETIME_MAIN)
                                .then((ftKeys) => {
                                    console.log("ftKeys: ", ftKeys);

                                    memberData.id = ftKeys.ftUserID;

                                    // login to the foretees site
                                    const sessionFT = new SessionFT(teetimeSite);
                                    sessionFT.login(ftKeys)
                                        .then((result) => {
                                            sessionObj.sessionFT = sessionFT;
                                            resolve(memberData);
                                        })
                                        .catch((e) => {
                                            console.log('foretees login failed ', e);
                                            reject(e);
                                        })
                                })
                                .catch((e) => {
                                    console.log('error loading teesheetMain ', e);
                                    reject(e);
                                })
                        } else {
                            reject('Coulnt find teeSheetInfo');
                        }
                    })
                    .catch((e) => {
                        console.log('error loading teesheetLogin ', e);
                        reject(e);
                    });
            }

            // space out our logins so we don't overwhelm the back end server
            setTimeout(loginFunc, delay * 1000);
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
                const sessionClub = new Session(clubSite);
                const sessionObj = { sessionClub: sessionClub, sessionFT: null };

                pendingSessions.push(sessionObj);

                promises.push(self.singleLogin(sessionObj, username, password, i));
            }

            Promise.allSettled(promises)
                .then((results) => {

                    for (let i = 0; i < results.length; i++) {
                        const result = results[i];
                        if (result.status === 'fulfilled') {
                            sessions.push(pendingSessions[i]);
                        } else {
                            console.log('failed login: ', result);
                        }
                    }

                    if (sessions.length > 0) {
                        resolve(results[0].value);
                    } else {
                        reject('Login failed');
                    }
                })
        });
    };
};

module.exports = SessionPool;