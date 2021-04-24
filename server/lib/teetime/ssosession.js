/**
 * This abstracts the single sign on details of the messed up two 
 * site system the club adopted in 2019
 */
var SessionPool = require('./sessionpool.js');
var TeeTimeReserve = require('../actions/teetimereserve.js');
var TeeTimeSearch = require('../actions/teetimesearch.js');

const API_TEETIME_BASE = "v5";
const API_TEETIME_PWCC_BASE = API_TEETIME_BASE + "/prestonwoodccnc_golf_m56";
const API_TEETIME_SEARCH = API_TEETIME_PWCC_BASE + '/Member_sheet';
const API_TEETIME_MEMBER_SEARCH = API_TEETIME_PWCC_BASE + '/data_loader';
const API_TEETIME_RESERVE = API_TEETIME_PWCC_BASE + '/Member_slot';

var SSOSession = function (clubSite, teetimeSite) {
    const sessionPool = new SessionPool(clubSite, teetimeSite, 8);

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

        const path = API_TEETIME_MEMBER_SEARCH + "?name_search=" + lastname + "&limit=100&arr=&_=" + Date.now();
        const sessionTeeTime = sessionPool.getTeeTimeSession();

        return sessionTeeTime.get(path);
    };

    this.search = function (timeString, dateString, courses) {
        const sessionTeeTime = sessionPool.getTeeTimeSession();
        const teeTimeSearch = new TeeTimeSearch(API_TEETIME_SEARCH, sessionTeeTime);
        return teeTimeSearch.promise(timeString, dateString, courses);
    };

    this.reserveTimeSlot = function (timeSlots, foursome) {
        const teeTimeReserve = new TeeTimeReserve(API_TEETIME_RESERVE, sessionPool);
        return teeTimeReserve.reserveTimeSlot(timeSlots, foursome);
    };

};

module.exports = SSOSession;