/**
 * This abstracts the single sign on details of the messed up two 
 * site system the club adopted in 2019
 */
var SessionPool = require('./sessionpool.js');
var TeeTimeReserve = require('../actions/teetimereserve.js');

var SSOSession = function (clubSite, teetimeSite) {
    const LOGIN_SESSIONS = 3;
    const sessionPool = new SessionPool(clubSite, teetimeSite, LOGIN_SESSIONS);

    /**
     * Login to the main web site, then handle subsequent login to the tee time booking
     * site.
     * 
     * @param {String} username username for the PWCC site
     * @param {String} password password for the PWCC site
     */
    this.login = function (username, password) {
        return sessionPool.login(username, password);
    };

    this.memberInfo = function () {
        return sessionPool.memberInfo();
    };

    this.memberSearch = function (lastname) {
        console.log("MemberSearch.do");

        const session = sessionPool.getFTSession();
        return session.memberSearch(lastname);
    };

    this.search = function (timeString, dateString, courses) {
        const session = sessionPool.getFTSession();
        return session.search(timeString, dateString, courses);
    };

    this.currentTime = function () {
        const session = sessionPool.getFTSession();
        return session.currentTime();
    };

    this.reserveTimeSlot = function (timeSlots, foursome) {
        const teeTimeReserve = new TeeTimeReserve(sessionPool);
        return teeTimeReserve.reserveTimeSlot(timeSlots, foursome);
    };

};

module.exports = SSOSession;